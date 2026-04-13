# Chess

Windows desktop chess app for playing against an AI opponent.

What is included:
- Full chess engine with legal move generation, castling, en passant, promotion, check/checkmate, draw detection, and algebraic notation
- `Legal Bot` and `Illegal Bot` modes
- Persistent game records in `game_records` as `.json` and `.pgn`
- Learning memory in `bot_learning.json` so the bot can bias toward better moves over time
- Local HTA desktop-style app window launched by PowerShell/VBScript on Windows

Main files:
- `chess_engine.py` - core chess rules, SAN notation, AI evaluation, and learning memory
- `chess_popup_server.py` - local HTTP service that drives the board UI and persistence
- `chess_popup.hta` - popup desktop app shell
- `chess_popup.js` - board UI, move indicators, controls, and AI turn flow
- `chess_popup.css` - chess board and side-panel styling
- `run_chess_popup.ps1` - starts the local server and opens the HTA app
- `install_chess_popup_shortcut.ps1` - creates the Desktop shortcut and icon

Run the app:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\run_chess_popup.ps1
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
- The app uses `mshta.exe` for the popup window and a local server at `http://127.0.0.1:8765`.
- Saved games are written to `game_records`.
- If the server is already running, the launcher reuses it instead of starting a duplicate.
