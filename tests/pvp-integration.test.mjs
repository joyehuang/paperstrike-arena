import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { Client } from '@colyseus/sdk';

test(
  'real WebSockets isolate devices, enforce private room joins and run a ready match',
  { timeout: 20000 },
  async () => {
    const socket = createServer();
    await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
    const port = socket.address().port;
    await new Promise((resolve) => socket.close(resolve));
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', 'server/index.ts'],
      {
        env: { ...process.env, PORT: String(port) },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    const rooms = [];
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('server boot timeout')),
          7000,
        );
        child.on('error', reject);
        child.stdout.on('data', (data) => {
          if (data.toString().includes('listening on')) {
            clearTimeout(timer);
            resolve();
          }
        });
        child.on('exit', (code) => {
          clearTimeout(timer);
          if (code) reject(new Error('server exited ' + code));
        });
      });
      const url = `http://localhost:${port}`;
      assert.equal((await fetch(url + '/health')).status, 200);
      const desktop = new Client(url, {
          headers: { 'User-Agent': 'Mozilla Windows NT 10.0' },
        }),
        mobile = new Client(url, {
          headers: { 'User-Agent': 'Mozilla Android Mobile' },
        });
      const snapshots = new Map();
      const remember = (r) => {
        rooms.push(r);
        r.reconnection.enabled = false;
        r.onMessage('snapshot', (s) => snapshots.set(r.roomId, s));
        return r;
      };
      const a = remember(
        await desktop.joinOrCreate('battle', { device: 'desktop', name: 'A' }),
      );
      const b = remember(
        await desktop.joinOrCreate('battle', { device: 'desktop', name: 'B' }),
      );
      assert.equal(a.roomId, b.roomId);
      assert.match(a.roomId, /^[1-9]\d{5}$/);
      const m = remember(
        await mobile.joinOrCreate('battle', { device: 'mobile', name: 'M' }),
      );
      assert.notEqual(m.roomId, a.roomId);
      await assert.rejects(() =>
        mobile.joinById(a.roomId, { device: 'mobile' }),
      );
      await assert.rejects(() =>
        desktop.joinById(m.roomId, { device: 'mobile' }),
      );
      const wait = (r, predicate) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            stop();
            reject(new Error('state timeout'));
          }, 3000);
          const stop = r.onMessage('snapshot', (s) => {
            if (predicate(s)) {
              clearTimeout(timer);
              stop();
              resolve(s);
            }
          });
          r.send('sync');
        });
      a.send('ready', true);
      b.send('ready', true);
      await wait(
        a,
        (s) => s.players.length === 2 && s.players.every((p) => p.ready),
      );
      a.send('start');
      await wait(a, (s) => s.phase === 'playing');
      a.send('input', {
        forward: 1,
        right: 0,
        yaw: 0,
        pitch: 0,
        aim: false,
        crouch: false,
        sprint: false,
        jump: false,
      });
      await wait(
        a,
        (s) => s.players.find((p) => p.id === a.sessionId).motion.vz < 0,
      );
      a.reconnection.minUptime = 0;
      a.reconnection.enabled = true;
      const reconnected = new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('reconnect timeout')),
          5000,
        );
        a.onReconnect.once(() => {
          clearTimeout(timer);
          resolve();
        });
      });
      a.connection.close(4010, 'simulate network interruption');
      await reconnected;
      await wait(
        a,
        (s) => s.players.find((p) => p.id === a.sessionId)?.connected === true,
      );
      a.reconnection.enabled = false;
      const privateRoom = remember(
        await desktop.create('battle', {
          device: 'desktop',
          private: true,
          name: 'Private',
        }),
      );
      const quick = remember(
        await desktop.joinOrCreate('battle', {
          device: 'desktop',
          name: 'Quick',
        }),
      );
      assert.notEqual(privateRoom.roomId, quick.roomId);
      const friend = remember(
        await desktop.joinById(privateRoom.roomId, {
          device: 'desktop',
          name: 'Friend using six digits',
        }),
      );
      assert.equal(friend.roomId, privateRoom.roomId);
      const parallelRooms = await Promise.all(
        Array.from({ length: 12 }, () =>
          desktop
            .create('battle', { device: 'desktop', private: true })
            .then(remember),
        ),
      );
      const codes = [a, m, privateRoom, quick, ...parallelRooms].map(
        (r) => r.roomId,
      );
      codes.forEach((code) => assert.match(code, /^[1-9]\d{5}$/));
      assert.equal(new Set(codes).size, codes.length);
    } finally {
      await Promise.allSettled(rooms.map((r) => r.leave()));
      child.kill();
    }
  },
);
