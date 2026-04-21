#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Chess Popup — Dev Setup Script
# Run once after cloning: bash scripts/setup.sh
# ─────────────────────────────────────────────────────────────────

set -e
cd "$(dirname "$0")/.."

echo ""
echo "♟  Chess Popup — Dev Setup"
echo "─────────────────────────────────────────────────────────────"
echo ""

# 1. Check Node version
NODE_VER=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo $NODE_VER | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "✗ Node.js 18+ required (found $NODE_VER)"
  echo "  Install via: https://nodejs.org"
  exit 1
fi
echo "✓ Node.js $NODE_VER"

# 2. Install dependencies
echo ""
echo "Installing npm dependencies..."
npm install
echo "✓ Dependencies installed"

# 3. Check for Stockfish binary
echo ""
echo "Checking Stockfish engine..."
SF_PATH=""
if [ -f "engine/stockfish" ]; then
  SF_PATH="engine/stockfish"
  chmod +x engine/stockfish
  echo "✓ Stockfish binary found: engine/stockfish"
elif [ -f "engine/stockfish.exe" ]; then
  SF_PATH="engine/stockfish.exe"
  echo "✓ Stockfish binary found: engine/stockfish.exe"
else
  echo "⚠  Stockfish binary not found in engine/"
  echo ""
  echo "   The game will use the built-in JS bot until Stockfish is added."
  echo "   To add native Stockfish:"
  echo "   1. Download from: https://stockfishchess.org/download/"
  echo "   2. Place the binary at:  engine/stockfish   (Mac/Linux)"
  echo "                        or: engine/stockfish.exe  (Windows)"
  echo "   3. Run: chmod +x engine/stockfish  (Mac/Linux only)"
  echo ""
fi

# 4. Print next steps
echo ""
echo "─────────────────────────────────────────────────────────────"
echo "✓ Setup complete!"
echo ""
echo "Next steps:"
echo "  npm start          — Launch the game in development mode"
echo "  npm run dist:win   — Build Windows installer (.exe)"
echo "  npm run dist:mac   — Build macOS disk image (.dmg)"
echo "  npm run dist:linux — Build Linux AppImage"
echo ""
echo "Steam:"
echo "  See STEAM_SETUP.md for Steamworks SDK integration guide"
echo ""
