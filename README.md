# Paperstrike · 纸上战场

Excalidraw-inspired browser FPS, built with React, Three.js and Vinext. Arena geometry, outlines, characters and weapons are procedural. CC0 music and sampled effects are bundled locally; gameplay does not depend on an external media service.

## Play

Click **全屏进入战场** to request fullscreen and raw pointer input. If fullscreen is unavailable, the arena fills the browser viewport. The weapon HUD overlays the canvas. Each map has a three-minute kill objective. Death triggers a three-second respawn with replenished ammunition. Esc and loss of window focus pause the match; **选择关卡 / 武器** returns to the window layout.

| Map                       | Play style                                      | Opponents | Goal     |
| ------------------------- | ----------------------------------------------- | --------- | -------- |
| 废稿堆场 / The Scrapyard  | Balanced sightlines and flanking routes         | 5         | 12 kills |
| 折纸工厂 / Paperworks     | Close quarters and three connected lanes        | 6         | 16 kills |
| 天台速写 / Skyline Sketch | Open sightlines, low cover and stepped terraces | 7         | 20 kills |

All three maps can be selected at the weapon desk. Reaching the objective offers the next level; timeout offers a retry. Changing a map resets health, armor, ammunition, bots, pickups, timers and navigation. Each map has a fixed roster (5 / 6 / 7); the HUD shows living opponents against that cap. Kills reuse existing bots after 7–10 seconds. Respawns require cover, at least 18 units from the player, 8 from the death location and 5 from another living bot. If no safe point exists, respawning waits and checks again after one second. Returning bots wait 2.5 seconds before firing. Player respawns randomly select among the safest points and retain 2.5 seconds of protection.

- WASD: move; mouse: look; left mouse: shoot; hold right mouse: aim.
- 1–4 / wheel: switch pistol, shotgun, sniper and rifle; R: reload.
- Space: jump; Shift + W: sprint; hold C or Ctrl: crouch.
- Minimap: blue player arrow, orange opponents, green health packs, yellow ammunition and blue armor. Faded supply markers are waiting to respawn.

Each map contains four health packs (+40 HP, capped at 100), three ammunition boxes (two magazines of reserve ammunition per weapon, capped at starting reserve), and one armor pickup (+30, capped at 50). Armor absorbs damage before HP. Walk within 1.15 units to collect a useful item; cover blocks pickup and high jumps cannot collect ground items. Health, ammo and armor respawn after 20, 18 and 25 seconds. Pausing freezes these timers. Unusable pickups remain available.

Reloading uses distinct weapon tilts, a support hand that grips the magazine or action, visible shell insertion and a short seating/settling impulse. Mechanical samples coincide with insertion and bolt contact, and the HUD shows stage and progress. Ammo transfers once at completion; switching weapons cancels the reload. Reload animation leaves the aim camera unchanged.

Each map has its own Vitalezzz electronic score. Music streams only the selected local track; small Kenney effects are decoded once and reused, with a 24-voice limit. Music and effects have independent volume sliders and a shared mute. Pausing stops music playback; restarting gameplay resumes it. Source URLs and CC0 licenses are listed in `public/audio/credits.txt` and linked from settings. Music is normalized to -19 LUFS and encoded at 128 kbps; all audio files were checked with FFmpeg decoding. No subjective listening or browser audio QA is claimed.

The pistol is semiautomatic, the shotgun fires eight pellets, the sniper has a 4× scope, and the rifle is automatic. Cover blocks movement and bullets. Opponents use a navigation distance field to route around cover and only shoot with line of sight. Intended for a desktop browser with WebGL and pointer lock; touch aiming and multiplayer networking are outside this version.

The palette uses blue buildings, yellow and green cover, a lavender platform, and warm red enemies. Hits flash the opponent and update their overhead health bar, damage number, remaining-health panel, and hit/kill sound. Incoming hits show a directional marker, HP loss, a red edge flash, and a persistent low-health warning.

Player motion runs at 120 fixed steps per second with interpolated rendering. Mouse rotation is applied directly. Jumping has a short input buffer and coyote time; movement acceleration, crouching, weapon sway and FOV transitions use time-based damping. Sprint widens horizontal FOV by only three degrees. Camera-motion intensity can be adjusted down to zero.

Static geometry and pencil outlines are batched. Particles and bullet trails share fixed GPU pools. The render target starts below 1.9 million pixels, adapts resolution under sustained load, and displays the measured frame rate. React HUD updates are deduplicated. These are structural optimizations; device-specific GPU frame rates have not been browser-benchmarked.

## Develop

`npm install`, then `npm run dev`.

`npm run build` produces the Cloudflare Worker and client assets. `npx tsc --noEmit` checks types. `node --test tests/*.test.mjs` runs the movement, navigation and ray intersection checks (Node 24).

## Vercel

Production: https://joyehuang.app

Vercel URL: https://paperstrike-arena.vercel.app

Source: https://github.com/joyehuang/paperstrike-arena

Incoming fire displays a bright directional arc and an eight-direction Chinese label for 1.25 seconds. The marker tracks the location of the hit relative to the current camera as the player turns, rather than staying at its initial screen angle.

`vercel.json` uses `npm run build:vercel` to export this same game as static HTML, JavaScript, CSS and local audio in `dist/client`. The build script sets `PAPERSTRIKE_TARGET=vercel`, which selects Vinext's static export and omits Worker-only plugins. No server functions or database are needed for this version.

Run `vercel deploy --prod` from the linked project to build and publish on Vercel. The standard `npm run build` continues to target the original Sites host. Use Vercel's cloud build when the native Windows prerender process fails during shutdown.

## Implementation

- `app/page.tsx`: Chinese game UI, HUD, inventory, help and settings.
- `app/game/arena.ts`: renderer, gameplay state, input, opponents, pickups and weapon animation.
- `app/game/rules.ts`: weapon tuning, map layout, collision and pathfinding.
- `app/game/levels.ts`: three distinct map layouts, goals, spawn points and supply locations.
- `app/game/supplies.ts`: pickup limits, armor absorption and reload poses.
- `app/game/audio.ts`: local streamed music, cached sampled effects and separate mixer gains.
- `app/game/rendering.ts`: geometry batching, pooled effects and render-resolution budget.
- `app/game/presentation.ts`: fullscreen and raw-pointer entry with browser fallbacks.
- `app/game/webmcp.ts`: optional browser agent tools for match state and weapon selection.

Validation includes TypeScript, the production build and 43 tests covering all-map reachability, terrace traversal, pickup limits and respawning, weapon reload completion/cancellation, projected reload-part visibility, level rebuilds, victory conditions, assembled scene draw count, shot-to-health feedback, cover, fixed-step movement at 30/60/144 Hz, camera damping, jump buffering, particle limits and fullscreen API fallback. Each assembled scene, including pickups, opponents and moving weapon parts, stays below 110 draws in the structural check. These tests run without a browser and do not measure GPU FPS. No interactive browser QA was performed. Optional WebMCP integration is feature-detected; a supported live WebMCP context was not available for validation.

Implementation references: [MDN pointer lock and fullscreen ordering](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestPointerLock), [Three.js geometry batching](https://threejs.org/manual/en/optimize-lots-of-objects.html).
