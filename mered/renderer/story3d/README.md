# Story3D — 3D Story Mode

A fully playable 3D presentation of Mered's five-chapter Story Mode: walkable
chapter hubs (third-person character, WASD), matches on a chessboard placed
inside each scene (top-down camera tilted toward the player), and the story's
cutscenes performed by 3D figures on the same sets — all running on the
**unchanged** 2D game's engine, story data, saves, and cheat handler.

## Launching

```bash
npm install     # pulls the pinned three@0.149.0
npm start       # main menu → the "STORY — 3D" card
```

Verification: `npm test` (unit tests), `npm run smoke` (2D harness must stay
green), `npm run smoke3d` (boots the app, loads every chapter hub, plays a
scripted match through the real engine, exercises a cutscene, the ending
choice, and the skin grant — set `SMOKE3D_SHOTS=<dir>` to capture screenshots
of each stage).

## Architecture

The game is a single-page monolith (`renderer/chess_ui.html`) whose own
extension convention is "phase patching" — later script blocks wrap earlier
global functions. Story3D is the final phase: 17 plain script-tag modules
(no bundler; `contextIsolation` keeps `require()` out of the renderer) plus
pinned `three@0.149.0` (the last release with a script-tag UMD build; ESM
over `file://` fails CORS in packaged builds where `webSecurity` is on).

```
renderer/story3d/
├── story3d_core.js          namespace, WebGL renderer + canvas (z 240), rAF
│                            loop, event bus, tweens, dispose registry
├── story3d_adapter.js       PURE logic (unit-tested): gating mirrors, move
│                            analysis, square↔world math, cutscene step
│                            normalizer, ending-skin resolver
├── story3d_textures.js      seeded-noise canvas textures (stone/plaster/
│                            wood/fabric/metal/ground/checker) — color+bump+
│                            roughness, cached, sRGB-correct; sprite textures
│                            (glow/smoke/flame/stained glass/banner crests)
├── story3d_content.js       3D-mode content data: faction palettes, the
│                            armor catalog + shop stock + quest rewards,
│                            companion farewell scenes, ending mood table
├── story3d_materials.js     shared material library + 2D palette anchors
├── story3d_fx.js            animated effects: layered fire + ember particles
│                            + smoke, star domes, dust motes, ground mist,
│                            volumetric light shafts
├── story3d_props.js         torch/banner/arch/window/throne/table/tent/
│                            buildings (half-timbered)/columns/rugs/scatter…
├── story3d_pieces.js        lathe pawn/bishop/queen/king, crenellated rook,
│                            extruded knight; dying-sun / the-eternal king
│                            variants
├── story3d_figures.js       articulated character figures driven by the 2D
│                            CS_SILHOUETTES cast table (limbs, robes, hoods,
│                            armor, crowns, capes; walk/idle animation)
├── story3d_environments.js  one 3D set per story background, transcribed
│                            from the BG_RENDERERS painters; hub variants
│                            for the five chapters
├── story3d_camrig.js        hub follow-cam / match top-down-tilted camera
│                            with orbit+zoom / cinematic framings
├── story3d_character.js     WASD controller, circle-vs-AABB collision
├── story3d_npcs.js          hub NPCs per chapter fight + boss + merchant,
│                            live world-map gating, interact prompts
├── story3d_hub.js           walkable hub orchestration + travel signpost
├── story3d_board.js         3D match presenter (board mirror, raycast input
│                            → executeMove, capture topple, check/mate
│                            emphasis)
├── story3d_cutscene.js      STORY_CUTSCENES interpreter on the 3D stage
├── story3d_hud.js           interact prompt, location label, clock mirror,
│                            travel panel + scoped CSS overrides
├── story3d_inventory.js     Tab inventory/equipment menu, hub armor shops,
│                            quest-reward grants (state on storyProgress.gear3d)
└── story3d_patch.js         the ONLY module that wraps existing globals
```

## Reuse map (what comes from the 2D game)

| Reused as-is (live globals) | Where it lives in chess_ui.html |
|---|---|
| Chess rules: `getLegalMoves`, `executeMove`, `applyUciMove`, `boardPosition`… | ~L4960–5560 |
| Bot: `ChessEngine.getBestMove` → Stockfish IPC | L2851 / main.js |
| Story data: `STORY_CHAPTERS`, `STORY_CUTSCENES`, `STORY_FIGHT_BG` | L17567, L20343, L47975 |
| Flow: `launchStoryFight/Boss`, `startStoryGame`, result patch, endings | L48497–48840 |
| Saves (`storyProgress`, `debouncedSave`, GameStore), cheat console | L17680+, L47280+ |
| Dialogue/menus/result/ending/merchant overlays (HTML, above the canvas) | various |
| Cast table `CS_SILHOUETTES`, palette anchors, scene layouts | L20253, L19228–20097 |

The patch layer (`story3d_patch.js`) wraps `enterMode`, `openStoryMode`,
`openWorldMap`, `runCutscene`, `startStoryGame`, `executeMove`,
`applyUciMove`, `handleUndoMove`, `showResultModal`, `openMainMenu` — every
wrap is a strict pass-through when the 3D flag is off, so the 2D game is
byte-identical in behavior. The only edit to the monolith is the additive
`<script>` block before `</body>`.

Non-obvious calls are recorded in [DECISIONS.md](DECISIONS.md).

## Adding a sixth chapter later

1. Add the chapter to `STORY_CHAPTERS` and its fights to `STORY_FIGHT_BG`
   (2D data — the 3D mode reads both live).
2. Add cutscenes to `STORY_CUTSCENES`; any new `place` ids need a row in
   `CS_SILHOUETTES` (the figure builder reads it at runtime).
3. Build one environment in `story3d_environments.js` (BUILDERS['<bg-id>'])
   following any existing builder, and map the chapter in `CHAPTER_HUBS`
   (+ npcSlots for its hub variant).
4. That's it — gating, NPCs, travel, matches, and endings derive from the
   data. Add a gating unit test in `tests/unit/` for the new chapter.
