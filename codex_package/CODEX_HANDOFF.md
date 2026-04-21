# Mered — Codex Handoff Document
## Read this first. Then read every file listed below before writing any code.

---

## What This Project Is

A chess desktop game built for Steam via Electron. The game has:
- A bot training system where players build and train an AI opponent
- A cosmetic skin system (44 piece skins, 28 board skins, 6 rarity tiers Common→Mythic II)
- A cutscene system that fires on captures (10 cutscenes, rarity-weighted)
- A story mode (5 chapters, medieval narrative, fully animated cutscenes)
- Multiplayer with split-board skin system
- Full economy: bots→coins→chests→skins
- Steam achievements, cloud saves, Stockfish engine integration

The frontend is HTML/CSS/Canvas 2D. It runs in Electron. All rendering is done via chess_visuals.js.

---

## Files You Are Receiving

### 1. chess_complete_spec.md — THE SOURCE OF TRUTH
Read this entire document before touching any code. It has 24 parts + 3 appendices covering every screen, system, animation, color, font, z-index, and behavior in the game. Part 24 is the story mode. Appendix A has your starting message and phase checklists. Appendix B has per-phase verification checks. Do not make design decisions — follow what is written here.

### 2. chess_visuals.js — DO NOT MODIFY
This is the complete rendering module. It owns ALL visual output:
- Animated background canvases (8 themes)
- Piece rendering (6 pieces, 4 styles, full bezier paths)
- All 44 piece skins (Common through Mythic II, animated)
- All 28 board skins (Common through Mythic II, animated)
- Board border rendering
- Piece trails, cursed glow, badge rendering
- Skin previews, zoom previews, avatar rendering
- ELO graph, level graph
- Toast notifications, achievement toasts
- Level-up burst, confetti, chest animation canvas

Hook into it ONLY via the public API at the bottom of the file (window.ChessVisuals). Never call internal functions directly. Never modify this file.

### 3. chess_ui.html — VISUAL REFERENCE + STARTING POINT
This is a fully interactive UI mockup showing the complete game interface. It is NOT the final game — it's a prototype that demonstrates every screen, layout, and interaction. Use it as:
- The exact visual target for layout, spacing, colors, and component structure
- Working reference code you can adapt (board rendering, theme system, skin grid, etc.)
- A demo of how chess_visuals.js integrates into the UI

It already has:
- Full 3-column layout (left panel, board center, right panel)
- All 8 animated background themes working
- Board rendering with piece skins and board skins
- Drag and drop, right-click annotations, piece trails
- All major screens: Collection, Stats, Customize, Leaderboards, Bot Trainer, Chest Shop, Hall of Fame, Training Screen
- Game result modal with confetti
- Promotion UI
- ELO leaderboard and AI level leaderboard with ghost entries
- Electron API bridge (GameStore, ChessEngine, SteamIntegration)

---

## The Electron Shell

The game runs in Electron. The project structure is:
```
mered/
├── main.js          — Main process (window, Stockfish child process, Steam IPC, persistence)
├── preload.js       — contextBridge (window.electronAPI.store / .engine / .steam / .window)
├── package.json     — App config + electron-builder settings
├── renderer/
│   ├── chess_ui.html     — The game
│   └── chess_visuals.js  — Rendering module
├── engine/
│   └── stockfish          — Native Stockfish binary (player downloads separately)
└── assets/
    └── icon.png           — App icon
```

The renderer has access to:
- `window.GameStore` — async load/save (wraps electron-store or localStorage)
- `window.ChessEngine` — async getBestMove(fen, difficulty) → UCI string or null
- `window.SteamIntegration` — unlockAchievement(id), setStatus(text)
- `window.electronAPI` — direct preload bridge

All of these fall back gracefully if not in Electron (for browser testing).

---

## What Codex Should NOT Do

- Do not modify chess_visuals.js
- Do not make design decisions (colors, fonts, spacing, layout) — follow the spec
- Do not use localStorage directly — use GameStore.load() / GameStore.save()
- Do not call Stockfish directly from the renderer — use ChessEngine.getBestMove()
- Do not add external npm packages to the renderer — it runs as a local HTML file
- Do not use React, Vue, or any framework — plain HTML/CSS/JS only
- Do not break the Electron security model — never enable nodeIntegration in renderer

---

## What Still Needs Building

The UI mockup demonstrates the interface but the following systems need full implementation:

### Core Chess
- Complete move generation (all pieces, en passant, castling, all edge cases)
- Check, checkmate, stalemate, draw detection
- FEN generation for Stockfish
- UCI move parsing and application
- Opening detection (ECO book lookup)
- PGN export

### Bot Trainer
- Full ML system: hashPosition, getBotMove, trainBotOnGame
- Level progression, XP, coin rewards
- Bot decay system (7+ days inactive)
- Chest opening (full rarity roll, item unlock)
- Hall of Fame timeline logging
- Achievement checking

### Story Mode (Part 24 of spec)
- 5 chapters, 3-5 fights each
- Animated cutscene system (portrait art + dialogue)
- Difficulty modes (Story/Standard/Veteran/Ironclad)
- Boss fight mechanics (best of 3, mid-game taunts for Aldric)
- Separate save slot
- Two endings with achievement unlock
- Ironclad boss skin variants

### Polish
- Full persistence via GameStore (currently partial)
- Steam achievement triggers at all key moments
- All cutscene animations (10 cutscenes)
- Cursed piece mechanic
- Piece trail rendering (6 styles)
- Analysis mode with move classification
- Daily challenge system

---

## Starting Message for Codex

Paste this as your first message:

> "Read all files in the Mered folder. Read chess_complete_spec.md as the complete build document — it is the source of truth for every design decision. Read chess_ui.html as the visual reference — match its layout, colors, component structure, and dark aesthetic exactly. Read chess_visuals.js and understand its public API but do not modify it. Do not touch main.js, preload.js, or package.json unless specifically asked.
>
> Before writing any code, audit what chess_ui.html already has and what still needs to be built according to the spec. Then ask me to confirm before generating. Work through the spec in the staging order in Appendix A. Mark completed items as each phase finishes.
>
> Key rules: follow the spec for all design decisions, use GameStore for persistence, use ChessEngine for bot moves, never modify chess_visuals.js, plain HTML/CSS/JS only in the renderer."

---

## Phase Order (from Appendix A of spec)

Work through these in order. Never start a new phase until the previous passes all verification checks.

1. Full 3-column layout + top bar
2. All 8 themes + animated backgrounds + textures
3. Piece rendering (6 pieces, 4 styles) + trails + borders
4. Chess game logic + AI bot + clocks + move system
5. Analysis mode + game result screen
6. Flicker fix (dirty flag, cutscene guard, layer isolation)
7. Full cutscene system (all 10 cutscenes)
8. Collection screen + Stats screen
9. Account system + leaderboards + daily challenge + cursed piece
10. Customize screen + all Common/Rare piece skins
11. Epic animated piece skins
12. Unique piece skins (2 per piece)
13. Mythic piece skins (6 Mythic I + 6 Mythic II)
14. Bot Trainer (profile card + ML system + level up)
15. Bot aging + Hall of Fame + Achievement showcase + Genesis Mode
16. Chest Shop + chest opening animation
17. Wire everything together (full persistence, all triggers, all unlocks)
18. All achievements + debug harness
19. Story Mode (Part 24) — chapter system, cutscenes, boss fights, endings
20. Electron integration — GameStore, ChessEngine, Steam achievements, build config

---

## Key Numbers to Know

- 44 piece skins across 6 rarities
- 28 board themes across 6 rarities  
- 10 cutscenes (Common×1, Rare×2, Epic×2, Unique×5)
- 8 appearance themes (Classic, Midnight, Forest, Crimson, Ice, Gold, Neon, Obsidian)
- 5 story chapters, 5 bosses, 2 endings
- 4 difficulty modes in story (Story/Standard/Veteran/Ironclad)
- Starting ELO: 1200
- Mered App ID: TBD (update steam_appid.txt after Steamworks signup)
