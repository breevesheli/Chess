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

## Stockfish Binary (Not Included)

The Stockfish chess engine is **not** checked into this repository.
The binary is several megabytes and is better downloaded directly
from the upstream project, which publishes signed builds for every
platform.

### Windows

1. Go to the latest Stockfish release page:
   [github.com/official-stockfish/Stockfish/releases/latest](https://github.com/official-stockfish/Stockfish/releases/latest).
2. Download **`stockfish-windows-x86-64-avx2.zip`** from the
   assets list.
   - If your CPU does not support AVX2, grab the
     `stockfish-windows-x86-64-modern.zip` or plain
     `stockfish-windows-x86-64.zip` build instead. They all work.
3. Extract the zip. Inside you will find a file named something
   like `stockfish-windows-x86-64-avx2.exe`.
4. **Rename it to `stockfish.exe`** exactly.
5. Place the renamed `stockfish.exe` inside this project's
   `engine/` folder so the path is:

   ```text
   mered-electron/mered/engine/stockfish.exe
   ```

6. Restart the app with `npm start`. The engine is auto-detected
   on launch — no config changes needed.

### macOS / Linux

1. Same releases page:
   [github.com/official-stockfish/Stockfish/releases/latest](https://github.com/official-stockfish/Stockfish/releases/latest).
2. Download the `stockfish-macos-*` or `stockfish-ubuntu-*`
   archive for your platform.
3. Extract and rename the binary to `stockfish` (no extension).
4. Place it at `engine/stockfish`.
5. Make it executable:

   ```bash
   chmod +x engine/stockfish
   ```

6. `npm start` — auto-detected.

### Without Stockfish

If `engine/stockfish.exe` (Windows) or `engine/stockfish` (macOS /
Linux) is missing, the app falls back to its built-in JavaScript
bot. The fallback is weaker than Stockfish and is only intended for
dev sessions where you do not want to download the binary.

### Why it is not in the repo

- The binary is 5–15 MB per platform; multiplied across three
  platforms it is a lot of Git LFS.
- Stockfish releases frequently; pinning a checked-in copy would
  drift fast.
- Upstream is a trusted, signed source and easy to verify.

The `.gitignore` at the root of this folder explicitly excludes
`engine/stockfish.exe`, `engine/stockfish`, and anything matching
`engine/*.exe` or `engine/*.bin` — so you can drop the binary in
without worrying about accidentally committing it.

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
