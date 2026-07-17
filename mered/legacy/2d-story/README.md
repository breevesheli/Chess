# Legacy: the 2D Story Mode

The original 2D presentation of Story Mode is **retired from the game's UI**.
Its main-menu card and the topbar Story shortcut are removed at startup by
`renderer/story3d/story3d_patch.js`, so the only way to play the story is the
3D mode.

## Why the code itself is still in chess_ui.html

The 3D Story Mode was deliberately built as a *presentation layer* on top of
the 2D game's logic. Everything below is shared, live, and still required:

| Still used by the 3D mode | Where it lives in chess_ui.html |
| --- | --- |
| Chapter/fight data `STORY_CHAPTERS` | ~L17567 |
| Cutscene scripts `STORY_CUTSCENES` | ~L20343 |
| Fight flow `launchStoryFight` / `launchStoryBoss` / `startStoryGame` | ~L48497 |
| Result branching, lives, skin drops, endings | ~L48696–48840 |
| Save system, coins, consumables, cheat codes | various |

Deleting those blocks would delete the 3D mode's brain along with the 2D
mode's body. What was actually "the 2D story experience" — the chapter-list
overlay, the parchment world map, and the silhouette cutscene player — still
exists as code but is unreachable from the UI.

## How to bring the 2D mode back

One switch: in `renderer/story3d/story3d_patch.js`, set

    const ENABLE_2D_STORY = true;

That restores the 2D STORY menu card and the topbar shortcut. Both modes then
coexist exactly as before this change (they always shared one save).

## Removed entry points (for reference)

- Main menu card: `<div class="mm-card primary" data-mode="story">` →
  `enterMode('story')` → difficulty select → 2D world map.
- Topbar button `#btn-story` (injected by `injectStoryModeButton`, ~L48846).
