@echo off
setlocal
cd /d "%~dp0"
if exist ".\dist\ChessPopup\ChessPopup.exe" (
  start "" ".\dist\ChessPopup\ChessPopup.exe"
) else (
  python ".\chess_popup_app.py"
)
