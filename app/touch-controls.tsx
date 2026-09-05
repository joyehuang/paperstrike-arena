'use client';
import { useRef, type PointerEvent } from 'react';
import type { Arena, Snapshot } from './game/arena';
import { joystickInput } from './game/touch-input';

export function TouchControls({
  arena,
  game,
}: {
  arena: Arena;
  game: Snapshot;
}) {
  const move = useRef<number | null>(null);
  const look = useRef<{ id: number; x: number; y: number } | null>(null);
  const fire = useRef<{ id: number; x: number; y: number } | null>(null);
  const knob = useRef<HTMLSpanElement>(null);
  const updateMove = (e: PointerEvent<HTMLButtonElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - box.left - box.width / 2,
      dy = e.clientY - box.top - box.height / 2;
    const input = joystickInput(dx, dy);
    arena.touchMove(input.forward, input.right);
    const scale = Math.min(1, 48 / (Math.hypot(dx, dy) || 1));
    if (knob.current)
      knob.current.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
  };
  const endMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (move.current !== e.pointerId) return;
    move.current = null;
    arena.touchMove(0, 0);
    if (knob.current) knob.current.style.transform = '';
  };
  const endFire = (e: PointerEvent<HTMLButtonElement>) => {
    if (fire.current?.id !== e.pointerId) return;
    fire.current = null;
    arena.touchAction('fire', false);
  };
  return (
    <div className="touch-controls">
      <button
        className="touch-look"
        aria-label="右侧滑动瞄准"
        onPointerDown={(e) => {
          if (look.current) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          const p = look.current;
          if (p?.id !== e.pointerId) return;
          arena.touchLook(e.clientX - p.x, e.clientY - p.y);
          p.x = e.clientX;
          p.y = e.clientY;
        }}
        onLostPointerCapture={(e) => {
          if (look.current?.id === e.pointerId) look.current = null;
        }}
        onPointerUp={(e) => {
          if (look.current?.id === e.pointerId) look.current = null;
        }}
        onPointerCancel={(e) => {
          if (look.current?.id === e.pointerId) look.current = null;
        }}
      />
      <button
        className="touch-stick"
        aria-label="移动摇杆，向前推到底冲刺"
        onPointerDown={(e) => {
          if (move.current !== null) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          move.current = e.pointerId;
          updateMove(e);
        }}
        onPointerMove={(e) => {
          if (move.current === e.pointerId) updateMove(e);
        }}
        onPointerUp={endMove}
        onPointerCancel={endMove}
        onLostPointerCapture={endMove}
      >
        <span ref={knob} />
        <small>移动 · 推满冲刺</small>
      </button>
      <button
        className="touch-fire"
        aria-label="开火，可拖动瞄准"
        onPointerDown={(e) => {
          if (fire.current) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          fire.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          arena.touchAction('fire');
        }}
        onPointerMove={(e) => {
          const p = fire.current;
          if (p?.id !== e.pointerId) return;
          arena.touchLook(e.clientX - p.x, e.clientY - p.y);
          p.x = e.clientX;
          p.y = e.clientY;
        }}
        onPointerUp={endFire}
        onPointerCancel={endFire}
        onLostPointerCapture={endFire}
      >
        开火
      </button>
      <div className="touch-actions">
        <button
          aria-pressed={game.aiming}
          onClick={() => arena.touchAction('aim')}
        >
          开镜
        </button>
        <button onClick={() => arena.reload()}>换弹</button>
        <button onClick={() => arena.touchAction('jump')}>跳跃</button>
        <button
          aria-pressed={game.crouching}
          onClick={() => arena.touchAction('crouch')}
        >
          蹲下
        </button>
      </div>
      <button className="touch-pause" onClick={() => arena.pause()}>
        暂停
      </button>
      <button
        className="touch-switch"
        onClick={() => arena.selectWeapon((game.weapon + 1) % 4)}
      >
        换枪 · {['手枪', '霰弹', '狙击', '步枪'][game.weapon]}
      </button>
    </div>
  );
}
