# Mered: 3D Story Mode Build Spec

You are working in the Mered repo (Electron chess game, formerly Chess Popup). Your task: build a fully playable **3D version of Story Mode**, reusing as much of the existing 2D game's logic and content as possible, while leaving the existing 2D game fully intact and runnable.

Work autonomously through this entire spec. Only stop to ask me something if it is genuinely blocking: a destructive choice, a real scope fork, or information only I have. Otherwise make a reasonable call, record it in `story3d/DECISIONS.md`, and keep going. Do not end a turn on a promise of future work; either finish the step or ask the blocking question.

## Phase 0: Reconnaissance (before writing any code)

1. Read the existing codebase end to end and map out:
   - The chess rules engine: move generation, validation, check/checkmate/stalemate, castling, promotion, en passant, and the bot/AI opponent logic and difficulty handling.
   - The Story Mode flow: chapter structure and sequencing, dialogue/script data and where it lives, scene triggers, win/lose branching, how the two endings are reached, and how each ending grants its unique skin.
   - Save/progress system, settings, audio hooks, and cheat-code handling.
   - Every visual asset and scene definition Story Mode uses: backgrounds, building layouts, sprites, color palette, fonts, and UI chrome.
2. Produce a written inventory listing which modules can be imported as-is, which need a thin adapter, and which must be rebuilt for 3D. **Reuse is the strong default.** Rebuilding anything that already exists requires a stated reason in the inventory.
3. Extract a style guide from the existing game: exact palette hex values, typography, and the layout and silhouette of every building or location that appears in Story Mode scenes. The 3D world must read as the same places, just with depth.

## Architecture and placement

- Build the 3D mode in a **new folder** (suggest `src/story3d/` or top-level `story3d/`; follow whichever convention the repo already uses). If 3D mode genuinely needs its own window or entry process, still keep it in this repo inside that new folder.
- **Never duplicate game logic.** The chess engine, story script/data, bot AI, save system, and cheat-code handler must be imported from their existing locations. If current module boundaries make that awkward, refactor them into cleanly importable shared modules with adapters, without changing 2D behavior.
- The 2D game must build and run exactly as before. Expose 3D Story Mode as a new entry point (a menu item or a launch flag) and re-verify the 2D game at the end.

## Tech stack

- Three.js running in the Electron renderer (it is Chromium, so standard WebGL works). Add it as a pinned dependency in `package.json`; no CDN loads in a shipped Steam build.
- No paid or downloaded asset packs. All geometry is procedural or built in code; all textures are procedurally generated (canvas noise, gradients, patterns) and used as color, bump, and roughness maps.
- Target 60fps on mid-range hardware. Use shadow maps judiciously, share geometries and materials, and dispose of GPU resources when switching chapters.

## Scope

Story Mode only:

- Five chapters set in the kingdom of Aurveld; the player's arc from Prince to King; Saoirse's reveal as the true killer; Aldric the Undying as the antagonist; both endings reachable, each granting its unique skin exactly as the 2D version does.
- Use the existing story script **verbatim**. Do not rewrite dialogue, rename characters, or restructure chapters.
- Out of scope: Split Board multiplayer, the chest/coin cosmetic store, and anything Story Mode does not touch. Cheat codes that affect Story Mode should keep working through the same existing handler.

## Visual spec (decently detailed, stylized, not photoreal)

- **Environments:** one 3D scene per chapter that faithfully recreates the existing 2D backgrounds and building layouts. Same buildings in the same positions with the same silhouettes and palette, extruded into believable 3D with rooflines, doors, windows, and props (banners, lanterns, market stalls, crates, torches) where the 2D art implies them.
- **Board presentation:** the board sits on a medieval table or stone plinth within each scene, so every match feels located in Aurveld rather than floating in space.
- **Pieces:** stylized mid-poly procedural meshes. Lathe profiles for pawns and bishops, a modeled knight head, a crenellated rook, crowned king and queen. Clearly distinct per side, with the two ending skins implemented as material/mesh variants of the same set.
- **Lighting:** one key directional light with soft shadows plus hemisphere/ambient fill, with per-chapter mood (time of day, warm interior light, storm or ember tones for the late Aldric chapters, matching whatever the existing 2D art suggests). Subtle fog for depth.
- **Materials:** procedural stone, plaster, wood, fabric, and metal with bump and roughness variation so nothing reads as flat untextured plastic.
- **Animation:** eased piece glides, capture animations (the struck piece topples or dissolves), visible check and checkmate emphasis, and a camera that orbits and zooms during play and performs framed cinematic moves for dialogue beats and chapter transitions.
- **Dialogue and UI:** keep the existing 2D dialogue boxes, fonts, and menu styling as an HTML/CSS overlay on top of the canvas, so it still feels like Mered.
- **Camera** I want the camera to be to follow behind the character

## Quality bar

- **Tests:** unit tests for any adapter layer between the engine and the 3D view, plus an integration smoke test that boots the app, loads each of the five chapter scenes, and plays a short scripted sequence of legal moves through the real engine. The existing test suite must also stay green; if the repo has no test runner yet, set one up.
- **Verification:** before reporting anything as done, verify it against an actual run or test output from this session. If something fails, report it plainly with the output. Never report unverified work as complete.
- **Docs:** a `README.md` inside the new folder covering the architecture, the reuse map (what came from the 2D game and from where), how to launch 3D Story Mode, and how a sixth chapter would be added later. Keep `DECISIONS.md` updated as you go.

## Process

1. Complete Phase 0 and present the inventory plus implementation plan for approval (we will start in plan mode).
2. Build **Chapter 1 end to end first** (scene, board, pieces, dialogue, win/lose branch) as the vertical slice that proves the architecture.
3. Then the remaining chapters, then the endings and skins, then polish and performance, then tests and docs.

## Definition of done

`npm start` (or this repo's equivalent) reaches a menu where 3D Story Mode is selectable. All five chapters are playable start to finish. Both endings are reachable and grant their skins. The 2D game is untouched and still works. Tests are green. `README.md` and `DECISIONS.md` are written. Nothing on this spec is deferred or stubbed.
