# Paperstrike · 纸上战场

Excalidraw-inspired browser FPS, built with React, Three.js and Vinext. All arena geometry, outlines, characters, weapons and audio are generated locally. No external image or sound service is required.

## Play

Click **全屏进入战场** to request fullscreen and raw pointer input. If fullscreen is unavailable, the arena fills the browser viewport. The weapon HUD overlays the canvas. Fight five AI opponents for three minutes. Death triggers a three-second respawn with replenished ammunition. Esc and loss of window focus pause the match; **返回武器台** returns to the window layout.

- WASD: move; mouse: look; left mouse: shoot; hold right mouse: aim.
- 1–4 / wheel: switch pistol, shotgun, sniper and rifle; R: reload.
- Space: jump; Shift + W: sprint; hold C or Ctrl: crouch.
- Minimap: blue player and direction, orange opponents. All opponents are visible.

The pistol is semiautomatic, the shotgun fires eight pellets, the sniper has a 4× scope, and the rifle is automatic. Cover blocks movement and bullets. Opponents use a navigation distance field to route around cover and only shoot with line of sight. Intended for a desktop browser with WebGL and pointer lock; touch aiming and multiplayer networking are outside this version.

The palette uses blue buildings, yellow and green cover, a lavender platform, and warm red enemies. Hits flash the opponent and update their overhead health bar, damage number, remaining-health panel, and hit/kill sound. Incoming hits show a directional marker, HP loss, a red edge flash, and a persistent low-health warning.

Player motion runs at 120 fixed steps per second with interpolated rendering. Mouse rotation is applied directly. Jumping has a short input buffer and coyote time; movement acceleration, crouching, weapon sway and FOV transitions use time-based damping. Sprint widens horizontal FOV by only three degrees. Camera-motion intensity can be adjusted down to zero.

Static geometry and pencil outlines are batched. Particles and bullet trails share fixed GPU pools. The render target starts below 1.9 million pixels, adapts resolution under sustained load, and displays the measured frame rate. React HUD updates are deduplicated. These are structural optimizations; device-specific GPU frame rates have not been browser-benchmarked.

## Develop

`npm install`, then `npm run dev`.

`npm run build` produces the Cloudflare Worker and client assets. `npx tsc --noEmit` checks types. `node --test tests/*.test.mjs` runs the movement, navigation and ray intersection checks (Node 24).

## Implementation

- `app/page.tsx`: Chinese game UI, HUD, inventory, help and settings.
- `app/game/arena.ts`: renderer, gameplay state, input, opponents and synthetic audio.
- `app/game/rules.ts`: weapon tuning, map layout, collision and pathfinding.
- `app/game/rendering.ts`: geometry batching, pooled effects and render-resolution budget.
- `app/game/presentation.ts`: fullscreen and raw-pointer entry with browser fallbacks.
- `app/game/webmcp.ts`: optional browser agent tools for match state and weapon selection.

Validation includes TypeScript, the production build and 26 tests covering assembled scene draw count, shot-to-health feedback, cover, fixed-step movement at 30/60/144 Hz, camera damping, jump buffering, particle limits and fullscreen API fallback. These tests run without a browser and do not measure GPU FPS. No interactive browser QA was performed. Optional WebMCP integration is feature-detected; a supported live WebMCP context was not available for validation.

Implementation references: [MDN pointer lock and fullscreen ordering](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestPointerLock), [Three.js geometry batching](https://threejs.org/manual/en/optimize-lots-of-objects.html).
