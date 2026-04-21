# Mered

> Bot trainer, cosmetic skins, cinematic captures. A chess game that actually feels like a game.

## Quick Start

```bash
# One-time setup
bash scripts/setup.sh

# Run in dev mode
npm start
```

## Project Structure

```
mered/
├── main.js              — Electron main process
├── preload.js           — Secure IPC bridge (contextBridge)
├── package.json         — App config + build settings
│
├── renderer/
│   ├── chess_ui.html    — The full game UI
│   └── chess_visuals.js — Piece/board/skin rendering module
│
├── engine/
│   ├── stockfish-worker.js  — Stockfish integration guide + WASM fallback
│   ├── stockfish            — (you add this) Native binary for Mac/Linux
│   └── stockfish.exe        — (you add this) Native binary for Windows
│
├── assets/
│   ├── icon.png         — App icon (1024×1024 recommended)
│   ├── icon.ico         — Windows icon
│   └── icon.icns        — macOS icon
│
├── scripts/
│   └── setup.sh         — Dev environment setup
│
├── STEAM_SETUP.md       — Steam integration step-by-step
└── README.md            — This file
```

## Adding Stockfish

1. Download from https://stockfishchess.org/download/
2. Place binary at `engine/stockfish` (Mac/Linux) or `engine/stockfish.exe` (Windows)
3. Mac/Linux: `chmod +x engine/stockfish`
4. Restart with `npm start` — the engine is auto-detected

Without Stockfish, the game uses the built-in JS bot.

## Building for Distribution

```bash
npm run dist:win    # Windows (.exe installer)
npm run dist:mac    # macOS (.dmg)
npm run dist:linux  # Linux (.AppImage)
```

Output goes to `dist/`.

## Steam

See `STEAM_SETUP.md` for the full guide.

## Architecture Notes

**Main process** (`main.js`)
- Owns the BrowserWindow
- Handles persistence via electron-store (proper OS file, not localStorage)
- Runs Stockfish as a child process (fast, no WASM overhead)
- All Steam SDK calls go through here (never in renderer)

**Preload** (`preload.js`)
- contextBridge only — renderer never gets Node/ipcRenderer access
- Exposes: `window.electronAPI.store`, `.engine`, `.window`, `.steam`, `.app`

**Renderer** (`renderer/chess_ui.html`)
- Full game — UI, board, skins, screens, progression
- Talks to main via `window.electronAPI.*`
- Falls back gracefully when APIs aren't available (browser/dev mode)

## Persistence

Data is saved to the OS-appropriate config directory:
- Windows: `%APPDATA%/mered/mered-data.json`
- macOS:   `~/Library/Application Support/mered/mered-data.json`
- Linux:   `~/.config/mered/mered-data.json`

This survives app reinstalls and can be backed up by Steam Cloud.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Cmd/Ctrl+N` | New game |
| `Cmd/Ctrl+K` | Open Customize |
| `Cmd/Ctrl+T` | Bot Trainer |
| `F11` / `Ctrl+Cmd+F` | Toggle fullscreen |
| `F12` | DevTools (dev mode only) |
