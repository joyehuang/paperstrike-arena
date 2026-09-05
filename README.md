# Paperstrike · 纸上战场

Excalidraw-inspired browser FPS, built with React, Three.js and Vinext. All arena geometry, outlines, characters, weapons and audio are generated locally. No external image or sound service is required.

## Play

Click **进入战场** to lock the mouse. Fight five AI opponents for three minutes. Death triggers a three-second respawn with replenished ammunition. Esc and loss of window focus pause the match.

- WASD: move; mouse: look; left mouse: shoot; hold right mouse: aim.
- 1–4 / wheel: switch pistol, shotgun, sniper and rifle; R: reload.
- Space: jump; Shift + W: sprint; hold C or Ctrl: crouch.
- Minimap: blue player and direction, orange opponents. All opponents are visible.

The pistol is semiautomatic, the shotgun fires eight pellets, the sniper has a 4× scope, and the rifle is automatic. Cover blocks movement and bullets. Opponents use a navigation distance field to route around cover and only shoot with line of sight. Intended for a desktop browser with WebGL and pointer lock; touch aiming and multiplayer networking are outside this version.

## Develop

`npm install`, then `npm run dev`.

`npm run build` produces the Cloudflare Worker and client assets. `npx tsc --noEmit` checks types. `node --test tests/*.test.mjs` runs the movement, navigation and ray intersection checks (Node 24).

## Implementation

- `app/page.tsx`: Chinese game UI, HUD, inventory, help and settings.
- `app/game/arena.ts`: renderer, gameplay state, input, opponents and synthetic audio.
- `app/game/rules.ts`: weapon tuning, map layout, collision and pathfinding.
- `app/game/webmcp.ts`: optional browser agent tools for match state and weapon selection.

Validation includes TypeScript, the production build and isolated gameplay-rule tests. No interactive browser QA was performed. Optional WebMCP integration is feature-detected; a supported live WebMCP context was not available for validation.
