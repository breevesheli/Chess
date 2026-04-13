# Chess

Windows desktop chess app for playing against an AI opponent.

What is included:
- Full chess rules with castling, en passant, promotion, check/checkmate, draw detection, and algebraic notation
- `Legal Bot` and `Illegal Bot` modes
- Difficulty levels: `Easy`, `Medium`, and `Hard`
- Illegal bot personalities: `Standard`, `Chaotic`, `Greedy`, and `Sneaky`
- Hint, undo, restart, resign, draw offer, replay, and PGN copy controls
- Timed modes: `Unlimited`, `Bullet`, `Blitz`, `Rapid`, and `Custom`
- Captured-piece panel, move indicators, board flipping, themes, alternate piece set, sounds, and mute toggle
- Persistent game records in `game_records` as `.json` and `.pgn`
- Autosave/resume plus player stats and rating tracking
- Learning memory in `bot_learning.json` so the bot can bias toward better moves over time
- Native desktop window powered by `PySide6` and a packaged Windows `.exe`

Main files:
- `chess_engine.py` - rules engine, SAN notation, AI evaluation, and learning memory
- `chess_popup_server.py` - local HTTP service, persistence, replay, stats, and optional gameplay controls
- `chess_popup_app.py` - native desktop window that hosts the local chess UI
- `chess_popup.html` - bundled app shell loaded inside the desktop window
- `chess_popup.js` - board UI, controls, replay flow, and live state rendering
- `chess_popup.css` - board, side-panel, themes, clocks, and animation styling
- `build_chess_popup_exe.ps1` - packages the app into `dist\ChessPopup\ChessPopup.exe`
- `run_chess_popup.ps1` - launches the packaged app or runs the Python desktop host directly
- `install_chess_popup_shortcut.ps1` - builds the packaged app and creates the Desktop shortcut and icon

Run the app:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\run_chess_popup.ps1
```

Build the packaged executable:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\build_chess_popup_exe.ps1
```

Install the Desktop shortcut:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install_chess_popup_shortcut.ps1
```

Run tests:

```powershell
python -m unittest -v test_chess_engine.py test_chess_popup_server.py
```

Notes:
- The desktop app uses a local service bound to `127.0.0.1` on an ephemeral port and loads the bundled UI inside a native Qt window.
- Source runs write saves into the repo folder. The packaged `.exe` writes autosaves, stats, learning data, and `game_records` under `%LOCALAPPDATA%\ChessPopup`.
- Runtime-only files such as `current_game_autosave.json`, `player_stats.json`, and `*.pid` are ignored by git.
- Build output in `build\`, `dist\`, and `*.spec` is ignored by git.
