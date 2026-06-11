# Story3D — Decision Log

Running log of non-obvious implementation decisions, per the Story3d spec ("make a
reasonable call, record it here, and keep going").

## D1 — three.js 0.149.0, exact pin, UMD via script tag

The renderer has `contextIsolation: true`, no bundler, and `webSecurity` is ON in
packaged builds (main.js L66). ES-module imports over `file://` fail CORS in that
configuration, so the classic script-tag UMD build is the only robust delivery.
three removed the UMD build after r150 (deprecated r150–r159, gone r160+), so we pin
`"three": "0.149.0"` exactly — no caret — and load
`../node_modules/three/build/three.min.js` from `chess_ui.html`. electron-builder
bundles production dependencies automatically, so the file ships inside app.asar.

## D2 — Same-page patch layer, not a separate window

3D Story Mode lives in the same `chess_ui.html` page as a final "phase" (the
monolith's own extension convention — later script blocks wrap earlier globals).
This gives literal reuse of the chess engine, story data, save system, dialogue UI,
and cheat console as the same live globals, with zero duplicated logic. A separate
window would have required extracting thousands of lines from the 49k-line monolith.
The only monolith edit is an additive block of `<script>` tags before `</body>`.

## D3 — Hidden 2D board stays the state of truth (mirror, don't suppress)

During 3D matches the existing 2D board/clock/undo/hint/result machinery keeps
running, just hidden by `body.story3d-match` CSS. The 3D board is a pure mirror:
it reads `boardPosition`, animates from wrapped `executeMove`/`applyUciMove`
events, and only ever mutates state by calling the real `executeMove`. After
takebacks (and after every animation batch) it resyncs from `boardPosition`
authoritatively. Zero risk of rules/persistence drift.

## D4 — Gating mirrors the LIVE world-map rules, with source refs

The 2D game has two gating implementations. The legacy chapter list
(`renderStoryChapterDetail`, L48327–48329) gates the boss on **every** fight,
optional sidequests and the hidden Old Pip entry included — but that screen is
unreachable once `prologueWatched` (the `wireWorldMapAfterFight` wrap, L47247,
redirects to the world map). The world map's hotspot reqs (WM_LOCATIONS,
L21480–21679) are what the live game actually runs: **main fights unlock
sequentially, the boss requires only the main (rival/enemy) fights, sidequests
are open while uncleared, and Old Pip is a pure cutscene NPC** (L46826) that
never enters `clearedFights`. `Story3D.Adapter.fightAvailable`/`bossLockedLive`
mirror the live rules (the legacy mirror `bossLocked` is kept for tests).
Two deliberate deltas from the world map, both matching the legacy screen
instead: cleared fights stay approachable as REPLAY (the world map hides them),
and chapter travel uses `computeChapterUnlock()` + sets
`storyProgress.currentChapter` exactly like the 2D chapter card onclick
(L48283) — the world map has no working chapter advance outside the dev panel.

## D5 — Cutscene `say`/`choose`/`lore` reuse the existing DOM

The 3D cutscene presenter interprets `STORY_CUTSCENES[id].steps` verbatim, but
`say`/`choose` reuse the existing `#cs-dialogue` box (same nodes, fonts, CSS) and
`lore` calls the real `showLoreParchment` plus the same loreUnlocked side-effect
as `_csProcessStep` (chess_ui.html L20676–20682). `#cs-dialogue` lives inside
`#bg-overlay` (z 250), so in 3D mode the overlay opens with a `story3d-transparent`
class: background transparent, scene canvas + silhouette layer hidden, dialogue
visible above the 3D canvas (z 240). The 2D `BG_STATE` loop is never started.

## D6 — Prologue stays the existing 2D cinematic

`runPrologue` is a self-contained full-screen 2D sequence with its own art and skip
handling, gated by `storyProgress.prologueWatched`. Reuse is the strong default, so
it plays unchanged (it covers the 3D canvas while open). The story proper begins in
3D right after.

## D7 — Figures driven by CS_SILHOUETTES

The 2D cutscene silhouette table `CS_SILHOUETTES` (chess_ui.html L20253–20274) is
the authoritative cast list (20 ids → kind/color/scale). The 3D figure builder
consumes that table at runtime so cast, palette, and relative scale stay in lockstep
with the 2D game; only the mesh construction per `kind` is new.

## D8 — Only the two ending skins get bespoke 3D materials

`dying-sun` (ch5 normal) and `the-eternal` (ch5 ironclad) are king-only skins in 2D
(`forPiece: 'king'`). In 3D they are king material/mesh variants selected from the
live `equippedSkins` global. Any other equipped skin falls back to the default 3D
set — those skins remain fully usable in 2D, and their unlock/grant logic is the
untouched original (chess_ui.html L48713–48723).

## D9 — Player is white

Story mode's own code treats the human as white throughout (`executeMove` records
the white half-move, `simulateBotMove` always answers as black, story FENs are
generated with `b` to move for the bot). The 3D match camera therefore sits on
white's side, tilted toward the player per the user's direction.

## D10 — Merchant, ending choice, result modal stay HTML

They are existing overlays above the 3D canvas (merchant z 300, result modal
z 2000, ending overlay z 9993) and work unchanged. The hub adds a merchant NPC only
as set dressing; the real merchant flow is triggered by the existing post-boss code.

## D11 — Hub player normalized to 1.0 scale

CS_SILHOUETTES gives the player scale 1.2 — right for 2D silhouette
composition, but towering next to NPCs under the third-person follow camera.
The hub builds the player figure normalized back to 1.0 world scale; cutscene
placements keep the table's scales verbatim so 2D staging proportions hold.

## D12 — New content is additive, in story3d_content.js, never edits the script

The user asked for content beyond the original 2D script: per-companion
farewell scenes after the ending choice, uniquely staged kill/spare endings,
faction visuals, and an armor economy. All of it lives in
`story3d_content.js`: the farewell scenes use the SAME cutscene grammar as
STORY_CUTSCENES and are registered additively at patch install (existing
entries are never overwritten, and because they speak the 2D grammar the 2D
silhouette player could run them too). The original dialogue, chapters, and
endings remain byte-identical; the ending "uniqueness" is presentation
(lighting arcs, collapse vs. dawn staging) layered on the existing step data.

## D13 — Crowned after Chapter 1's boss; gear lives in storyProgress.gear3d

"No crown until he is actually the king": the script never names a coronation
scene, but Chapter 1 IS the coronation arc (the court tests him; Aldwyn yields
with "Now I serve you", and the ch1 sidequest already calls him "the new
king"). So the player figure is a bare-headed prince until
`bossesCleared` includes `ch1-boss`. Armor/inventory state is stored on
`storyProgress.gear3d` so the existing unified save persists it with no save-
system changes; story coins are spent through the real `spendStoryCoins`.
