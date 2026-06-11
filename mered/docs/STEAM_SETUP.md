# Mered — Steam Integration Guide

## Overview

Steam integration requires:
1. A Steamworks developer account ($100 one-time fee)
2. An App ID assigned by Valve
3. The `steamworks.js` or `greenworks` npm package
4. Steamworks SDK installed locally for building

This guide walks through all of it.

---

## Step 1 — Steamworks Account

1. Go to https://partner.steamgames.com
2. Click "Join Steamworks"
3. Pay the $100 app submission fee (refunded once you hit $1,000 in revenue)
4. Fill out your company details (Heli Inc.)
5. Wait for approval (usually 1-3 business days)

---

## Step 2 — Create Your App

1. Log into the Steamworks dashboard
2. Click "Create a new app"
3. Choose "Game"
4. Fill in: **Mered**, description, category (Strategy, Indie)
5. You'll receive an **App ID** (a number like `2847391`) — save this

---

## Step 3 — Install steamworks.js

`steamworks.js` is the recommended modern library. It's a native Node addon
that wraps the Steamworks C++ SDK.

```bash
npm install steamworks.js
```

Download the Steamworks SDK from the partner portal:
1. Go to https://partner.steamgames.com/downloads/list
2. Download `steamworks_sdk.zip`
3. Extract to a folder (e.g. `~/steamworks_sdk`)

---

## Step 4 — Wire Up main.js

Replace the stub handlers in `main.js` with real steamworks.js calls:

```js
// At the top of main.js, after other requires:
let SteamAPI = null;
try {
  const { SteamworksAddon } = require('steamworks.js');
  SteamAPI = SteamworksAddon;
  SteamAPI.init(YOUR_APP_ID);  // Replace with your actual App ID
  console.log('[Steam] Initialized. Player:', SteamAPI.localplayer.getName());
} catch (e) {
  console.warn('[Steam] Not available:', e.message);
}

// Replace the stub IPC handlers:

ipcMain.handle('steam:isAvailable', () => SteamAPI !== null);

ipcMain.handle('steam:getPlayerName', () => {
  return SteamAPI?.localplayer.getName() ?? 'Player';
});

ipcMain.handle('steam:unlockAchievement', (_e, id) => {
  if (!SteamAPI) return false;
  SteamAPI.achievement.activate(id);
  return true;
});

ipcMain.handle('steam:setRichPresence', (_e, key, value) => {
  if (!SteamAPI) return false;
  SteamAPI.localplayer.setRichPresence(key, value);
  return true;
});
```

---

## Step 5 — Steam Achievements

Define achievements in the Steamworks dashboard under:
**App Admin → Stats & Achievements**

Suggested achievement IDs for Mered (match what you define there):

| ID | Name | Description |
|---|---|---|
| `ACH_FIRST_BLOOD` | First Blood | Win your first game |
| `ACH_REGICIDE` | Regicide | Trigger the Regicide cutscene |
| `ACH_MYTHIC_UNLOCK` | Mythic Pull | Unlock a Mythic piece skin |
| `ACH_LEVEL_10` | Rising Force | Reach Bot Level 10 |
| `ACH_LEVEL_30` | Grand Master | Reach Bot Level 30 |
| `ACH_PERFECT_GAME` | Flawless | Win without losing any pieces |
| `ACH_COLLECTION_COMPLETE` | Completionist | Trigger all 10 cutscenes |
| `ACH_STREAK_10` | Dominant | Win 10 games in a row |
| `ACH_DAILY_30` | Dedicated | Complete 30 daily challenges |
| `ACH_BOSS_CAPTURE` | Regicide | Boss capture (Queen takes King) |

To unlock in the renderer:
```js
// In chess_ui.html, after a qualifying event:
if (window.electronAPI) {
  window.electronAPI.steam.unlockAchievement('ACH_FIRST_BLOOD');
}
```

---

## Step 6 — Rich Presence

Set what shows in Steam friends list when someone is playing.

```js
// In the renderer:
window.electronAPI.steam.setRichPresence('status', 'Playing vs Bot Level 7');
window.electronAPI.steam.setRichPresence('status', 'In the Collection Screen');
window.electronAPI.steam.setRichPresence('status', 'Opening a Chest');
```

Define the rich presence keys in the Steamworks dashboard under:
**Technical Tools → Edit Rich Presence**

---

## Step 7 — Cloud Saves

Steam Cloud automatically backs up save files if you configure it.

In the Steamworks dashboard under **Technical Tools → Steam Cloud**:
- Root Overrides: `%AppData%/mered` (Windows) or `~/Library/Application Support/mered` (Mac)
- File patterns: `mered-data.json`

The `electron-store` package already saves to these OS locations by default.

---

## Step 8 — Build for Steam

Before uploading to Steam, build the production package:

```bash
# Windows
npm run dist:win

# Mac
npm run dist:mac

# Linux
npm run dist:linux
```

This creates installers in the `dist/` folder.

---

## Step 9 — Upload to Steam

1. Install the **SteamPipe** command-line tool (in the Steamworks SDK)
2. Create a `depot_build.vdf` file pointing at your `dist/` output
3. Run `steamcmd.exe +run_app_build depot_build.vdf`
4. In the Steamworks dashboard, publish the build to the default branch

Full SteamPipe documentation: https://partner.steamgames.com/doc/sdk/uploading

---

## Step 10 — Store Page

Before going live you need:

| Asset | Size | Notes |
|---|---|---|
| Header Capsule | 460×215px | Main store page image |
| Small Capsule | 231×87px | Browse lists |
| Main Capsule | 616×353px | Featured sections |
| Screenshots | 1280×720px min | At least 5 required |
| Trailer | Any | Strongly recommended |
| Short description | 300 chars max | Used in search results |
| Long description | No limit | Full store page body |

---

## Notes

- Steam requires the game to ship with `steam_appid.txt` in the same directory
  as the executable. This file just contains your App ID (plain text, no newline).
- In dev, add `steam_appid.txt` to the project root with your App ID so
  `steamworks.js` can find it without Steam being open.
- Never hardcode your App ID in the renderer — only in main.js on the secure side.
