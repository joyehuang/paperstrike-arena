import test from 'node:test';
import assert from 'node:assert/strict';
import { tsImport } from 'tsx/esm/api';
const { BattleRoom } = await tsImport('../server/room.ts', import.meta.url);
const { idleInput } = await tsImport('../app/game/pvp-protocol.ts', import.meta.url);

test('confirmed damage broadcasts before the next movement tick and is not repeated', () => {
  const room = new BattleRoom();
  let receive, tick;
  const sent = [];
  room.onMessage = (_type, handler) => {
    receive = handler;
  };
  room.setFixedTimestep = (handler) => {
    tick = handler;
  };
  room.broadcast = (type, snapshot) =>
    sent.push({ type, snapshot: structuredClone(snapshot) });
  room.onCreate({ device: 'desktop' });
  try {
    const battle = room.battle;
    battle.join('a', 'A');
    battle.join('b', 'B');
    for (const player of battle.players.values()) player.ready = true;
    battle.start('a');
    const shooter = battle.players.get('a'),
      target = battle.players.get('b');
    shooter.motion.x = target.motion.x = 0;
    shooter.motion.z = 10;
    target.motion.z = 5;
    shooter.weapon = 2;
    shooter.input = { ...idleInput(), aim: true };
    target.immune = 0;
    receive({ sessionId: 'a' }, 'fire', null);
    assert.equal(
      sent.length,
      1,
      'damage is delivered without advancing the room timer',
    );
    assert.ok(sent[0].snapshot.players.find((p) => p.id === 'b').health < 100);
    assert.ok(sent[0].snapshot.events.some((e) => e.kind === 'hit'));
    receive({ sessionId: 'a' }, 'fire', null);
    assert.equal(
      sent.length,
      1,
      'cooldown rejects repeated shots without extra broadcasts',
    );
    tick({ dt: 1 / 30 });
    tick({ dt: 1 / 30 });
    assert.equal(sent.length, 2);
    assert.equal(
      sent[1].snapshot.events.length,
      0,
      'periodic update does not replay the hit',
    );
    shooter.cooldown = 0;
    target.health = 100;
    target.motion.z = -5;
    receive({ sessionId: 'a' }, 'fire', null);
    assert.equal(
      sent.length,
      2,
      'shots blocked by cover keep the normal movement cadence',
    );
  } finally {
    room.onDispose();
    room.clock.clear();
  }
});
