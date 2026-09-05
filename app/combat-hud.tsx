'use client';
import { Heart, Shield } from 'lucide-react';
import type { Snapshot } from './game/arena';
import { WEAPONS } from './game/rules';
import { LEVELS } from './game/levels';

export function CombatVitals({
  game,
  reload,
}: {
  game: Snapshot;
  reload: () => void;
}) {
  const weapon = WEAPONS[game.weapon],
    level = LEVELS[game.level];
  return (
    <div className="bottom-hud">
      <div className="health-hud">
        <Heart size={22} strokeWidth={1.8} />
        <div>
          <span className="health-number">
            {Math.ceil(game.health)} <small>/ 100</small>
          </span>
          <div className="health-track">
            <b className="health-trail" style={{ width: game.health + '%' }} />
            <span style={{ width: game.health + '%' }} />
          </div>
        </div>
        <span className="health-caption">
          {game.armor > 0 ? (
            <>
              <Shield size={14} />
              {Math.ceil(game.armor)} 护甲
            </>
          ) : game.health <= 30 ? (
            '寻找急救包'
          ) : (
            '生命值'
          )}
        </span>
      </div>
      <div className="location-label">
        <span className="handwritten">{level.english}</span>
        <small>
          {level.name} / ARENA 0{game.level + 1}
        </small>
      </div>
      <div className="ammo-hud">
        <span className="ammo-icon">▰ ▰ ▰</span>
        <div>
          <span className="ammo-number">
            {game.reloading ? '···' : String(game.ammo).padStart(2, '0')}
            <small> / {game.reserve}</small>
          </span>
          <small>
            {game.reloading
              ? game.reloadLabel
              : `${weapon.name} · ${weapon.mode}`}
          </small>
        </div>
        <button onClick={reload} className="reload-key" title="换弹">
          R
        </button>
      </div>
    </div>
  );
}
export function CombatReticle({ game }: { game: Snapshot }) {
  return (
    <>
      <div
        className={`crosshair ${game.hit ? 'confirmed' : ''} ${game.hit && game.lastHit?.killed ? 'kill-confirmed' : ''} ${game.aiming ? 'ads' : ''}`}
      >
        <i />
        <i />
        <i />
        <i />
        <b />
      </div>
      {game.weapon === 2 && game.aiming && (
        <div className="scope-mask">
          <div className="scope-reticle">
            <i />
            <b />
            <span>× 4.0</span>
          </div>
        </div>
      )}
    </>
  );
}
