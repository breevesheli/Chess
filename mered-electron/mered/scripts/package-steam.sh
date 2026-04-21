#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Chess Popup — Steam Package Script
#
# Builds the app and stages it for SteamPipe upload.
# Run: bash scripts/package-steam.sh [win|mac|linux]
#
# Prerequisites:
#   - Steamworks SDK installed (see STEAM_SETUP.md)
#   - steamcmd in PATH or at ~/Steam/steamcmd
#   - STEAM_USERNAME env var set
#   - Real App ID in steam_appid.txt
# ─────────────────────────────────────────────────────────────────

set -e
cd "$(dirname "$0")/.."

PLATFORM=${1:-"win"}
APP_ID=$(cat steam_appid.txt | tr -d '[:space:]')
VERSION=$(node -e "console.log(require('./package.json').version)")
STEAMCMD=${STEAMCMD_PATH:-"steamcmd"}

echo ""
echo "♟  Chess Popup — Steam Package"
echo "   Version: $VERSION"
echo "   App ID:  $APP_ID"
echo "   Platform: $PLATFORM"
echo "─────────────────────────────────────────────────────────────"

# ── 1. Build icons ────────────────────────────────────────────────
echo ""
echo "Building icons..."
node scripts/build-icons.js || echo "⚠  Icon build failed — using existing icons"

# ── 2. Build Electron app ─────────────────────────────────────────
echo ""
echo "Building Electron app..."
case $PLATFORM in
  win)   npm run dist:win   ;;
  mac)   npm run dist:mac   ;;
  linux) npm run dist:linux ;;
  all)   npm run dist       ;;
  *)
    echo "Unknown platform: $PLATFORM"
    echo "Usage: $0 [win|mac|linux|all]"
    exit 1
    ;;
esac

# ── 3. Create SteamPipe depot ─────────────────────────────────────
DEPOT_DIR="steam-depot"
mkdir -p "$DEPOT_DIR/content"

case $PLATFORM in
  win)
    # electron-builder outputs to dist/win-unpacked/
    if [ -d "dist/win-unpacked" ]; then
      cp -r dist/win-unpacked/. "$DEPOT_DIR/content/"
      echo "✓ Copied Windows build to $DEPOT_DIR/content/"
    else
      echo "✗ Windows build not found at dist/win-unpacked"
      exit 1
    fi
    ;;
  mac)
    if [ -d "dist/mac" ]; then
      cp -r dist/mac/. "$DEPOT_DIR/content/"
      echo "✓ Copied macOS build to $DEPOT_DIR/content/"
    fi
    ;;
  linux)
    if [ -f dist/*.AppImage ]; then
      cp dist/*.AppImage "$DEPOT_DIR/content/"
      echo "✓ Copied Linux AppImage to $DEPOT_DIR/content/"
    fi
    ;;
esac

# ── 4. Write VDF build scripts ────────────────────────────────────
cat > "$DEPOT_DIR/app_build.vdf" << VDF
"AppBuild"
{
  "AppID"       "$APP_ID"
  "Desc"        "Chess Popup v$VERSION"
  "BuildOutput" "output/"
  "Depots"
  {
    "$(($APP_ID + 1))"    "depot_build.vdf"
  }
}
VDF

cat > "$DEPOT_DIR/depot_build.vdf" << VDF
"DepotBuild"
{
  "DepotID"     "$(($APP_ID + 1))"
  "ContentRoot" "content/"
  "FileMapping"
  {
    "LocalPath"  "*"
    "DepotPath"  "."
    "recursive"  "1"
  }
}
VDF

echo ""
echo "✓ SteamPipe VDF files written to $DEPOT_DIR/"
echo ""

# ── 5. Upload to Steam (optional) ────────────────────────────────
if [ "${UPLOAD:-0}" = "1" ]; then
  echo "Uploading to Steam..."
  if [ -z "$STEAM_USERNAME" ]; then
    echo "✗ STEAM_USERNAME not set"
    exit 1
  fi
  "$STEAMCMD" +login "$STEAM_USERNAME" \
    +run_app_build "$DEPOT_DIR/app_build.vdf" \
    +quit
  echo "✓ Uploaded to Steam"
else
  echo "To upload to Steam, run:"
  echo "  UPLOAD=1 STEAM_USERNAME=yourname bash scripts/package-steam.sh $PLATFORM"
  echo ""
  echo "Or manually:"
  echo "  steamcmd +login <username> +run_app_build $DEPOT_DIR/app_build.vdf +quit"
fi

echo ""
echo "─────────────────────────────────────────────────────────────"
echo "✓ Done. Steam depot staged at $DEPOT_DIR/"
