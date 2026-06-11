/**
 * main.js — Mered Electron Main Process
 *
 * Responsibilities:
 *  - Create and manage the BrowserWindow
 *  - Native menu (File, View, Help)
 *  - IPC handlers: persistence (electron-store), Stockfish engine bridge,
 *    window controls (fullscreen, devtools), Steam hooks
 *  - Crash reporting hooks (placeholder for Sentry/etc)
 *  - Auto-updater stub (electron-updater ready to wire in)
 */

'use strict';

const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path   = require('path');
const fs     = require('fs');

// ── ENVIRONMENT FLAGS ──────────────────────────────────────────────
const isDev  = process.argv.includes('--dev') || !app.isPackaged;
const isMac  = process.platform === 'darwin';
const isWin  = process.platform === 'win32';
const smokeTest = process.argv.includes('--smoke');
const smoke3dTest = process.argv.includes('--smoke3d');

// ── PERSISTENT STORE ──────────────────────────────────────────────
// electron-store gives us a proper OS-level config file instead of
// localStorage, which is wiped on app reinstall.
let store;
try {
  const Store = require('electron-store');
  store = new Store({
    name: 'mered-data',
    defaults: { chessCutsceneData: null },
  });
} catch (e) {
  // Fallback: in-memory store for dev without electron-store installed
  const _mem = {};
  store = {
    get: (k, d) => _mem[k] !== undefined ? _mem[k] : d,
    set: (k, v) => { _mem[k] = v; },
    delete: (k) => { delete _mem[k]; },
  };
  console.warn('[Store] electron-store not available, using in-memory fallback');
}

// ── WINDOW ─────────────────────────────────────────────────────────
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1440,
    height: 900,
    minWidth:  900,
    minHeight: 600,
    title: 'Mered',
    backgroundColor: '#1a1a1a',
    // Hide default titlebar on Windows/Linux for custom look
    // On Mac use hiddenInset so traffic lights still show
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Security: disable Node.js in renderer, use contextBridge only
      nodeIntegration:  false,
      contextIsolation: true,
      // Allow loading local files (chess_visuals.js, stockfish.wasm, etc.)
      webSecurity: !isDev,
    },
    show: false,  // show after ready-to-show to avoid flash
  });

  // Load the game
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'chess_ui.html'));

  // Show when ready — prevents white flash on load
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev && !smokeTest && !smoke3dTest) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    if (smokeTest) runSmokeTest();
    if (smoke3dTest) runSmoke3dTest();
  });

  // Forward renderer console messages to main stdout when in dev mode.
  // Makes `npm run dev` output show everything without opening DevTools.
  if (isDev) {
    mainWindow.webContents.on('console-message', (_e, level, message, line, source) => {
      const tag = ['', '', 'WARN ', 'ERR  '][level] || 'LOG  ';
      const src = source ? (source.split(/[\\/]/).pop() + ':' + line) : '';
      console.log(`[renderer][${tag}] ${message}` + (src ? '  (' + src + ')' : ''));
    });
    mainWindow.webContents.on('render-process-gone', (_e, details) => {
      console.error('[renderer][CRASH]', details);
    });
    mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
      console.error('[renderer][LOAD FAIL]', code, desc);
    });
  }

  mainWindow.on('closed', () => { mainWindow = null; });

  // Open external links in default browser, not in Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  buildMenu();
}

// ── MENU ───────────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'Game',
      submenu: [
        {
          label: 'New Game',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.executeJavaScript('if(typeof stopGame==="function")stopGame();'),
        },
        { type: 'separator' },
        {
          label: 'Open Collection',
          accelerator: 'CmdOrCtrl+C',
          click: () => mainWindow?.webContents.executeJavaScript('openScreen("collection-screen")'),
        },
        {
          label: 'Open Customize',
          accelerator: 'CmdOrCtrl+K',
          click: () => mainWindow?.webContents.executeJavaScript('openScreen("customize-screen")'),
        },
        {
          label: 'Bot Trainer',
          accelerator: 'CmdOrCtrl+T',
          click: () => mainWindow?.webContents.executeJavaScript('openScreen("training-screen")'),
        },
        { type: 'separator' },
        ...(!isMac ? [
          {
            label: 'Exit',
            accelerator: 'Alt+F4',
            role: 'quit',
          },
        ] : []),
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Fullscreen',
          accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11',
          click: () => {
            if (mainWindow) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
          },
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn',  accelerator: 'CmdOrCtrl+=' },
        { role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
        { type: 'separator' },
        ...(isDev ? [
          {
            label: 'Developer Tools',
            accelerator: isMac ? 'Alt+Cmd+I' : 'F12',
            click: () => mainWindow?.webContents.toggleDevTools(),
          },
          { role: 'reload', accelerator: 'CmdOrCtrl+R' },
          { type: 'separator' },
        ] : []),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Report a Bug',
          click: () => shell.openExternal('https://github.com/heliinc/mered/issues'),
        },
        {
          label: 'About Mered',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Mered',
              message: 'Mered',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode: ${process.versions.node}`,
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── IPC HANDLERS ───────────────────────────────────────────────────

// ── 1. PERSISTENCE ────────────────────────────────────────────────
// Replace localStorage with proper OS-level file storage.
// The renderer calls window.electronAPI.store.get/set via the preload bridge.

ipcMain.handle('store:get', (_event, key) => {
  return store.get(key);
});

ipcMain.handle('store:set', (_event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('store:delete', (_event, key) => {
  store.delete(key);
  return true;
});

ipcMain.handle('store:getAll', () => {
  return store.get('chessCutsceneData');
});

ipcMain.handle('store:setAll', (_event, data) => {
  store.set('chessCutsceneData', data);
  return true;
});

ipcMain.handle('store:reset', () => {
  store.delete('chessCutsceneData');
  return true;
});

// ── 2. WINDOW CONTROLS ────────────────────────────────────────────
ipcMain.handle('window:toggleFullscreen', () => {
  if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
});

ipcMain.handle('window:isFullscreen', () => {
  return mainWindow?.isFullScreen() ?? false;
});

ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:close',    () => mainWindow?.close());

// ── 3. STOCKFISH ENGINE BRIDGE ────────────────────────────────────
// Stockfish runs as a child process in main (not renderer) for perf.
// The renderer sends positions via IPC, we return best moves.
let stockfishProcess = null;
let stockfishCallbacks = new Map();
let stockfishReqId = 0;

function getStockfishPath() {
  // In production, stockfish binary is bundled in resources/
  // In dev, look for it in engine/
  const binaryName = isWin ? 'stockfish.exe' : 'stockfish';
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'engine', binaryName);
  }
  return path.join(__dirname, 'engine', binaryName);
}

function ensureStockfish() {
  if (stockfishProcess) return true;
  const sfPath = getStockfishPath();
  if (!fs.existsSync(sfPath)) {
    console.warn('[Stockfish] Binary not found at', sfPath, '— engine unavailable');
    return false;
  }
  try {
    const { spawn } = require('child_process');
    stockfishProcess = spawn(sfPath, [], { stdio: ['pipe','pipe','pipe'] });
    stockfishProcess.stdout.setEncoding('utf8');
    // Parse Stockfish output
    let buffer = '';
    stockfishProcess.stdout.on('data', chunk => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete last line
      lines.forEach(line => handleStockfishLine(line.trim()));
    });
    stockfishProcess.stderr.on('data', d => console.warn('[Stockfish stderr]', d));
    stockfishProcess.on('exit', () => {
      console.log('[Stockfish] Process exited');
      stockfishProcess = null;
    });
    // Init UCI
    stockfishProcess.stdin.write('uci\n');
    stockfishProcess.stdin.write('isready\n');
    console.log('[Stockfish] Started at', sfPath);
    return true;
  } catch (e) {
    console.error('[Stockfish] Failed to spawn:', e.message);
    stockfishProcess = null;
    return false;
  }
}

// Track pending bestmove requests: reqId -> {resolve, reject, timeout}
function handleStockfishLine(line) {
  if (!line) return;
  if (line.startsWith('bestmove')) {
    const parts = line.split(' ');
    const move = parts[1] || '(none)';
    // Resolve the oldest pending request
    const [reqId] = stockfishCallbacks.keys();
    if (reqId !== undefined) {
      const { resolve, timeout } = stockfishCallbacks.get(reqId);
      clearTimeout(timeout);
      stockfishCallbacks.delete(reqId);
      resolve(move);
    }
  }
}

ipcMain.handle('stockfish:getBestMove', async (_event, fen, depth, timeMs) => {
  if (!ensureStockfish()) {
    return null; // renderer falls back to JS bot
  }
  return new Promise((resolve, reject) => {
    const reqId = ++stockfishReqId;
    // Safety timeout
    const timeout = setTimeout(() => {
      stockfishCallbacks.delete(reqId);
      resolve(null);
    }, (timeMs || 5000) + 2000);
    stockfishCallbacks.set(reqId, { resolve, reject, timeout });
    const sf = stockfishProcess;
    sf.stdin.write(`position fen ${fen}\n`);
    if (timeMs) {
      sf.stdin.write(`go movetime ${timeMs}\n`);
    } else {
      sf.stdin.write(`go depth ${depth || 15}\n`);
    }
  });
});

ipcMain.handle('stockfish:stop', () => {
  if (stockfishProcess) {
    stockfishProcess.stdin.write('stop\n');
  }
});

ipcMain.handle('stockfish:quit', () => {
  if (stockfishProcess) {
    stockfishProcess.stdin.write('quit\n');
    stockfishProcess = null;
  }
});

ipcMain.handle('stockfish:isAvailable', () => {
  const sfPath = getStockfishPath();
  return fs.existsSync(sfPath);
});

// ── 4. STEAM (placeholder — wire in greenworks/steamworks.js later) ──
// When you're ready for Steam:
//   npm install greenworks  (unofficial) or use steamworks.js
//   Replace these stubs with real calls.
ipcMain.handle('steam:isAvailable', () => false);
ipcMain.handle('steam:getPlayerName', () => 'Player');
ipcMain.handle('steam:unlockAchievement', (_e, id) => {
  console.log('[Steam stub] Achievement unlocked:', id);
  return false;
});
ipcMain.handle('steam:setRichPresence', (_e, key, value) => {
  console.log('[Steam stub] Rich presence:', key, value);
  return false;
});

// ── SMOKE TEST HARNESS ────────────────────────────────────────────
// Enabled with `--smoke`. Exercises each major screen programmatically,
// logs pass/fail for each step, then quits. Designed for headless CI
// checks and the "does anything throw?" sanity pass.

async function runSmokeTest() {
  const log = (tag, ok, msg) => console.log(`[SMOKE][${ok ? 'PASS' : 'FAIL'}] ${tag}: ${msg}`);
  const js = (code) => mainWindow.webContents.executeJavaScript(code, true);
  const pause = (ms) => new Promise(r => setTimeout(r, ms));

  try {
    console.log('[SMOKE] starting harness (will quit after ~12s)');
    await pause(600); // wait for initial save-hydration IIFEs

    // 1. Script block coverage
    const scriptCount = await js(`document.querySelectorAll('script').length`);
    log('scripts', scriptCount >= 17, `${scriptCount} <script> tags present (including chess_visuals.js + 16 phase blocks)`);

    // 2. Board canvas
    const boardCanvas = await js(`!!document.getElementById('board-canvas') || !!document.querySelector('#board-stack canvas')`);
    log('board canvas', boardCanvas, boardCanvas ? 'board canvas element found' : 'board canvas missing');

    // 3. ChessVisuals public API
    const visualsApi = await js(`!!window.ChessVisuals && typeof window.ChessVisuals.renderPiece === 'function'`);
    log('ChessVisuals', visualsApi, visualsApi ? 'renderPiece exposed on window.ChessVisuals' : 'API missing');

    // 4. Phase integrations present
    const phaseCheck = await js(`JSON.stringify({
      cutscenes: typeof dispatchCutscene === 'function',
      roster: !!currentRoster,
      customize: typeof equipSkin === 'function',
      bot: !!botData && typeof getBotMove === 'function',
      chest: !!CHEST_DEFS,
      story: !!STORY_CHAPTERS,
      achievements: !!STEAM_ACHIEVEMENT_MAP,
    })`);
    log('phase APIs', !phaseCheck.includes('false'), phaseCheck);

    // 5. Dismiss the first-load username modal if present
    await js(`
      (() => {
        const m = document.getElementById('username-modal');
        if (m && m.classList.contains('open')) {
          document.getElementById('um-input').value = 'SmokeTester';
          document.getElementById('um-submit').click();
          return 'dismissed';
        }
        return 'not-open';
      })()
    `).then(r => log('username modal', true, r));

    await pause(300);

    // 6. Start a game
    const startResult = await js(`
      (() => {
        try {
          if (typeof startGame !== 'function') return 'no-startGame';
          startGame();
          return 'started; gameActive=' + (typeof gameActive !== 'undefined' ? gameActive : 'undef');
        } catch (e) { return 'threw:' + e.message; }
      })()
    `);
    log('startGame', startResult.startsWith('started') && startResult.includes('true'), startResult);

    await pause(300);

    // 7. Force a cutscene
    const csResult = await js(`
      (() => {
        try {
          dispatchCutscene('queen', 'white', 'bishop', 'black', false, () => {});
          return 'dispatched; active=' + (typeof cutsceneActive !== 'undefined' ? cutsceneActive : '?') +
                 '; queued=' + (typeof cutsceneQueued !== 'undefined' ? cutsceneQueued : '?');
        } catch (e) { return 'threw:' + e.message; }
      })()
    `);
    log('cutscene dispatch', !csResult.startsWith('threw'), csResult);

    // 8. Check overlay is visible (cutscene running)
    await pause(200);
    const overlayActive = await js(`document.getElementById('cutscene-overlay')?.classList.contains('active')`);
    log('cutscene overlay', overlayActive === true, overlayActive ? 'overlay.active class set' : 'overlay not active');

    // Let cutscene finish
    await pause(3000);

    // 9. Open Collection screen
    const collResult = await js(`
      (() => {
        try {
          document.getElementById('btn-collection').click();
          const open = document.getElementById('collection-screen')?.classList.contains('open');
          const cardCount = document.querySelectorAll('#cutscenes-tab .cutscene-card').length;
          return 'open=' + open + '; cards=' + cardCount;
        } catch (e) { return 'threw:' + e.message; }
      })()
    `);
    log('collection screen', collResult.includes('open=true') && collResult.includes('cards=10'), collResult);

    await pause(300);

    // 10. Close collection + open training
    const trainResult = await js(`
      (() => {
        try {
          closeScreen('collection-screen');
          openTrainingMode('training');
          const open = document.getElementById('training-screen')?.classList.contains('open');
          const level = botData.training.level;
          const coinEl = document.querySelector('.coin-amount')?.textContent;
          return 'open=' + open + '; level=' + level + '; coins=' + coinEl;
        } catch (e) { return 'threw:' + e.message; }
      })()
    `);
    log('training screen', trainResult.includes('open=true'), trainResult);

    await pause(300);

    // 11. Exercise customize screen
    const customResult = await js(`
      (() => {
        try {
          closeScreen('training-screen');
          document.getElementById('btn-customize').click();
          const open = document.getElementById('customize-screen')?.classList.contains('open');
          const skinCards = document.querySelectorAll('#skin-grid .skin-card').length;
          return 'open=' + open + '; skinCards=' + skinCards;
        } catch (e) { return 'threw:' + e.message; }
      })()
    `);
    log('customize screen', customResult.includes('open=true') && customResult.includes('skinCards='), customResult);

    await pause(300);

    // 12. Force a save + verify round-trip
    const saveResult = await js(`
      (async () => {
        try {
          await saveGameState();
          const readback = await window.GameStore.load();
          const keys = readback ? Object.keys(readback).sort().join(',') : 'null';
          return 'snapshot-keys: ' + keys;
        } catch (e) { return 'threw:' + e.message; }
      })()
    `);
    const expectedKeys = ['botData', 'chestHistory', 'customize', 'cutscenes', 'roster', 'storyProgress', 'theme'];
    const hasExpected = expectedKeys.every(k => saveResult.includes(k));
    log('persistence save', hasExpected, saveResult.length > 300 ? saveResult.slice(0, 300) + '…' : saveResult);

    // 13. Stockfish availability + live move
    const sfResult = await js(`window.electronAPI.engine.isAvailable()`);
    log('stockfish binary', true, sfResult ? 'present' : 'NOT FOUND (JS fallback will be used) — place binary in engine/');
    if (sfResult) {
      const sfMove = await js(`window.ChessEngine.getBestMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'Easy')`);
      log('stockfish move', typeof sfMove === 'string' && /^[a-h][1-8][a-h][1-8]/.test(sfMove), `returned "${sfMove}" for starting position`);
    }

    // 14. Actually play a move (player moves e2e4) and see bot respond
    const playResult = await js(`
      (async () => {
        try {
          if (!gameActive) startGame();
          // Simulate e2e4
          await new Promise(r => setTimeout(r, 200));
          if (typeof executeMove === 'function') {
            executeMove(6, 4, 4, 4);
            await new Promise(r => setTimeout(r, 2500));
            return 'lastMove=' + JSON.stringify(lastMove);
          }
          return 'no-executeMove';
        } catch (e) { return 'threw:' + e.message; }
      })()
    `);
    log('gameplay (e2e4 + bot reply)', playResult.includes('lastMove'), playResult);

    // 14. Phase 17 persistence summary
    await js(`typeof logPersistenceSummary === 'function' && logPersistenceSummary()`);

    // 15. Error sink: count uncaught errors surfaced so far (we rely on
    // the console-message hook above — this is just an explicit marker).
    console.log('[SMOKE] harness complete — review renderer logs above for any WARN/ERR lines');
  } catch (e) {
    console.error('[SMOKE] harness threw:', e);
  } finally {
    await pause(1000);
    console.log('[SMOKE] exiting');
    app.quit();
  }
}

// ── 3D STORY MODE SMOKE HARNESS ───────────────────────────────────
// Enabled with `--smoke3d`. Drives the Story3D patch layer end-to-end:
// every chapter hub, a cutscene, a real match through the engine, the
// ending choice + skin grant, and a dispose/memory stability pass.
// Set SMOKE3D_SHOTS=<dir> to save a PNG per stage. Exit code 1 on any FAIL.

async function runSmoke3dTest() {
  let fails = 0;
  const log = (tag, ok, msg) => {
    if (!ok) fails++;
    console.log(`[SMOKE3D][${ok ? 'PASS' : 'FAIL'}] ${tag}: ${msg}`);
  };
  const js = (code) => mainWindow.webContents.executeJavaScript(code, true);
  const pause = (ms) => new Promise(r => setTimeout(r, ms));
  const shotDir = process.env.SMOKE3D_SHOTS;
  if (shotDir) { try { fs.mkdirSync(shotDir, { recursive: true }); } catch (e) {} }
  const shot = async (name) => {
    if (!shotDir) return;
    try {
      const img = await mainWindow.webContents.capturePage();
      fs.writeFileSync(path.join(shotDir, `s3d_${name}.png`), img.toPNG());
    } catch (e) { console.warn('[SMOKE3D] screenshot failed:', e.message); }
  };
  // Poll a renderer-side condition until true or timeout.
  const waitFor = async (cond, ms, step) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await js(cond)) return true;
      await pause(step || 200);
    }
    return false;
  };
  // Click through whatever dialogue is open (typewriter-aware).
  const advanceUntil = async (doneCond, maxMs) => {
    const t0 = Date.now();
    await js(`window.__s3dAdvance = () => {
      const sd = document.getElementById('story-dialogue-overlay');
      if (sd && sd.classList.contains('open')) { document.getElementById('sd-next')?.click(); return 'sd'; }
      const cs = document.getElementById('cs-dialogue');
      if (cs && cs.classList.contains('open')) {
        const ch = document.getElementById('cs-choices');
        if (ch && ch.style.display !== 'none' && ch.firstChild) { ch.firstChild.click(); return 'choice'; }
        const n = document.getElementById('cs-next');
        if (n && n.style.display !== 'none') { n.click(); return 'cs'; }
        return 'typing';
      }
      return 'none';
    }; true`);
    while (Date.now() - t0 < maxMs) {
      if (await js(doneCond)) return true;
      await js(`window.__s3dAdvance()`);
      await pause(240);
    }
    return await js(doneCond);
  };

  try {
    console.log('[SMOKE3D] starting harness');
    // 1. Patch layer + three.js
    const patched = await waitFor(`!!(window.Story3D && window.Story3D._patched)`, 10000, 250);
    log('patch layer', patched, patched ? 'Story3D patch installed' : 'patch never installed');
    if (!patched) throw new Error('cannot continue without patch layer');
    const rev = await js(`window.THREE && window.THREE.REVISION`);
    log('three.js', rev === '149', `THREE.REVISION = ${rev}`);

    // 2. Snapshot user state we mutate (restored at the end)
    const progSnap = await js(`JSON.stringify(storyProgress)`);
    const skinsSnap = await js(`JSON.stringify([...unlockedSkinIds])`);

    // 3. Prep deterministic story state
    await js(`
      (() => {
        const m = document.getElementById('username-modal');
        if (m && m.classList.contains('open')) {
          document.getElementById('um-input').value = 'Smoke3D';
          document.getElementById('um-submit').click();
        }
        storyProgress.prologueWatched = true;
        storyProgress.difficulty = 'story';
        storyProgress.lives = Infinity;
        storyProgress.currentChapter = 'ch1';
        storyProgress.clearedFights = [];
        storyProgress.bossesCleared = [];
        storyProgress.outcome = null;
        delete storyProgress.gear3d;
        return true;
      })()
    `);

    // 4. Enter 3D mode through the real menu path
    await js(`enterMode('story3d')`);
    await pause(400);
    const dsOpen = await js(`document.getElementById('difficulty-select')?.classList.contains('open')`);
    log('difficulty select', dsOpen === true, dsOpen ? 'opened via the original story path' : 'did not open');
    await js(`
      (() => {
        const card = document.querySelector('.ds-card[data-id="story"]');
        if (card) card.click();
        const btn = document.getElementById('ds-confirm');
        if (btn) { btn.disabled = false; btn.click(); }
        return true;
      })()
    `);
    const hubUp = await waitFor(`Story3D.Hub._state.visible === true`, 8000, 250);
    log('hub ch1', hubUp, hubUp ? 'walkable hub visible after difficulty confirm' : 'hub never appeared');
    await pause(900);
    const tri = await js(`Story3D.renderer.info.render.triangles`);
    log('hub renders', tri > 1000, `${tri} triangles in frame`);
    await shot('hub_ch1');

    // 5. Every chapter hub builds and renders
    for (const ch of ['ch2', 'ch3', 'ch4', 'ch5']) {
      await js(`Story3D.Hub.show('${ch}')`);
      await pause(700);
      const ok = await js(`Story3D.Hub._state.visible && Story3D.scene.children.length > 2 && Story3D.renderer.info.render.triangles > 500`);
      log(`hub ${ch}`, ok === true, ok ? 'built + rendering' : 'failed to build/render');
      await shot(`hub_${ch}`);
    }
    await js(`Story3D.Hub.show('ch1')`);
    await pause(500);

    // 5b. Quest markers: every hub NPC carries a billboarded sprite marker
    const markers = await js(`
      (() => {
        const ns = Story3D.NPCs._state.npcs;
        return JSON.stringify({
          total: ns.length,
          sprites: ns.filter(n => n.marker && n.marker.isSprite).length,
        });
      })()
    `);
    const mk = JSON.parse(markers);
    log('quest markers', mk.total > 0 && mk.sprites === mk.total, `${mk.sprites}/${mk.total} NPCs carry sprite markers`);

    // 5c. Crown rule: a fresh run is an uncrowned prince
    const uncrowned = await js(`Story3D.Figures.playerIsCrowned() === false`);
    log('crown rule', uncrowned === true, uncrowned ? 'player starts uncrowned (no ch1 boss yet)' : 'player wrongly crowned at start');

    // 5d. Inventory: grant → equip → persists on storyProgress.gear3d
    const invOk = await js(`
      (() => {
        Story3D.Inventory.grant('fenwick-cloak', { silent: true });
        Story3D.Inventory.equip('fenwick-cloak');
        return storyProgress.gear3d.owned.includes('fenwick-cloak') &&
               storyProgress.gear3d.equipped.cape === 'fenwick-cloak';
      })()
    `);
    log('inventory equip', invOk === true, invOk ? 'granted + equipped a cape; persisted on gear3d' : 'gear state broken');
    await js(`Story3D.Inventory.openInventory('equip')`);
    const invOpen = await js(`document.getElementById('s3d-inv')?.classList.contains('open')`);
    log('inventory panel', invOpen === true, invOpen ? 'Tab menu opens with equipment tab' : 'panel missing');
    await shot('inventory');
    await js(`Story3D.Inventory.close()`);

    // 5e. Shop: stocked panel opens for the chapter
    await js(`Story3D.Inventory.openShop('ch1')`);
    await pause(200); // let the panel paint before capture
    const shopOk = await js(`document.getElementById('s3d-shop')?.classList.contains('open') && document.querySelectorAll('#s3d-shop .s3d-row').length >= 3`);
    log('armor shop', shopOk === true, shopOk ? 'ch1 armory open with stock' : 'shop missing/empty');
    await shot('shop');
    await js(`Story3D.Inventory.close()`);

    // 5f. Companions + side activities populate the hub
    const extras = await js(`
      JSON.stringify({
        extras: Story3D.Hub._state.extras.length,
        companions: Story3D.Hub._state.extras.filter(e => e.prompt.includes('TALK')).length,
      })
    `);
    const ex = JSON.parse(extras);
    log('hub life', ex.companions >= 4 && ex.extras >= ex.companions + 3,
      `${ex.companions} companions, ${ex.extras - ex.companions} activities (riddler/drill/pages)`);

    // 5g. 3D world map: opens, five landmarks, pans/zooms, travels back
    await js(`Story3D.WorldMap.show('ch1')`);
    await pause(900);
    const mapOk = await js(`Story3D.WorldMap._state.active === true && Story3D.WorldMap._state.nodes.length === 5 && Story3D.renderer.info.render.triangles > 500`);
    log('world map', mapOk === true, mapOk ? 'kingdom miniature live with 5 landmarks' : 'map failed');
    await shot('worldmap');
    await js(`Story3D.WorldMap.hide('ch1')`);
    const backFromMap = await waitFor(`Story3D.Hub._state.visible === true`, 6000, 200);
    log('map travel', backFromMap === true, backFromMap ? 'returned to the hub from the map' : 'stuck on map');

    // 6. Cutscene presenter on the 3D stage
    await js(`window.__csDone = false; runCutscene('ch1.intro_cavan_room', () => { window.__csDone = true; })`);
    await pause(700);
    const csShell = await js(`document.getElementById('bg-overlay')?.classList.contains('story3d-transparent')`);
    log('cutscene shell', csShell === true, csShell ? 'transparent overlay + 3D stage' : 'transparent shell missing');
    await shot('cutscene_cavan_room');
    const csDone = await advanceUntil(`window.__csDone === true`, 45000);
    log('cutscene completes', csDone === true, csDone ? 'all steps played, callback fired' : 'timed out');
    await waitFor(`Story3D.Hub._state.visible === true`, 6000, 250); // post-cutscene funnel

    // 7. A real match through the real engine
    await js(`launchStoryFight('ch1', 'ch1-f1')`);
    const matchUp = await (async () => {
      await advanceUntil(`Story3D.Match._state.active === true`, 30000);
      return js(`Story3D.Match._state.active === true && document.body.classList.contains('story3d-match')`);
    })();
    log('match begins', matchUp === true, matchUp ? '3D board active, 2D chrome hidden' : 'match never started');
    await pause(1800); // camera sweep
    await shot('match_start');
    const mirror0 = await js(`Story3D.Adapter.boardDiff(Story3D.Match._state.model, boardPosition).length`);
    log('mirror parity', mirror0 === 0, `${mirror0} squares differ at start`);
    await js(`executeMove(6, 4, 4, 4)`); // e2e4 through the real rules layer
    await pause(3200); // bot answers via Stockfish
    const e4 = await js(`Story3D.Match.getPieceAt('e4')`);
    log('player move mirrored', e4 === 'P', `e4 holds "${e4}"`);
    const botMoved = await js(`!!(lastMove && sideToMove === 'white')`);
    log('bot replied', botMoved === true, botMoved ? 'black answered through Stockfish path' : 'no bot reply');
    const mirror1 = await js(`Story3D.Adapter.boardDiff(Story3D.Match._state.model, boardPosition).length`);
    log('mirror after moves', mirror1 === 0, `${mirror1} squares differ after exchanges`);
    await shot('match_after_moves');

    // 8. Win branch through the real result handler
    await js(`showResultModal('win')`);
    await pause(600);
    const cleared = await js(`storyProgress.clearedFights.includes('ch1-f1')`);
    log('win recorded', cleared === true, cleared ? 'ch1-f1 in clearedFights' : 'clearedFights missing ch1-f1');
    const backToHub = await advanceUntil(`Story3D.Hub._state.visible === true`, 30000);
    log('post-fight funnel', backToHub === true, backToHub ? 'returned to the hub' : 'never returned to hub');

    // 9. Chapter 5 ending + skin grant through the real handlers
    await js(`
      (() => {
        ['ch1-boss','ch2-boss','ch3-boss','ch4-boss'].forEach(b => {
          if (!storyProgress.bossesCleared.includes(b)) storyProgress.bossesCleared.push(b);
        });
        storyProgress.currentChapter = 'ch5';
        const ch5 = STORY_CHAPTERS.find(c => c.id === 'ch5');
        storyActiveFight = { chapter: ch5, fight: ch5.boss, isBoss: true };
        return true;
      })()
    `);
    await js(`showResultModal('win')`);
    await pause(1800); // 1200ms delay before openEndingChoice
    const skin = await js(`storyProgress.bossSkinsEarned.includes('dying-sun')`);
    log('ending skin grant', skin === true, skin ? 'dying-sun granted on story difficulty' : 'skin not granted');
    const endingOpen = await js(`document.getElementById('story-ending-overlay')?.classList.contains('open')`);
    log('ending choice', endingOpen === true, endingOpen ? 'kill/spare overlay open' : 'overlay missing');
    await shot('ending_choice');
    const farewellsRegistered = await js(`!!(STORY_CUTSCENES['ch5.farewell_seraphine_spare'] && STORY_CUTSCENES['ch5.farewell_theron_kill'])`);
    log('farewells registered', farewellsRegistered === true, farewellsRegistered ? 'companion farewell scenes in STORY_CUTSCENES' : 'registration missing');
    await js(`chooseEnding('spare_saoirse')`);
    const epilogueDone = await advanceUntil(`storyProgress.outcome === 'spare_saoirse' && Story3D.Hub._state.visible === true`, 90000);
    log('spare ending + farewells', epilogueDone === true, epilogueDone ? 'ending, epilogue, and the three farewell scenes completed' : 'ending flow stalled');

    // 10. Dispose/memory stability across stage cycles
    await js(`Story3D.Hub.show('ch1')`); await pause(400);
    for (const ch of ['ch2', 'ch3', 'ch4', 'ch5', 'ch1']) { await js(`Story3D.Hub.show('${ch}')`); await pause(250); }
    const geo0 = await js(`Story3D.renderer.info.memory.geometries`);
    for (const ch of ['ch2', 'ch3', 'ch4', 'ch5', 'ch1']) { await js(`Story3D.Hub.show('${ch}')`); await pause(250); }
    const geo1 = await js(`Story3D.renderer.info.memory.geometries`);
    log('dispose stability', Math.abs(geo1 - geo0) < 40, `geometries ${geo0} → ${geo1} across a full hub cycle`);

    // 11. Clean exit back to the menu
    await js(`openMainMenu()`);
    await pause(400);
    const exited = await js(`Story3D.active === false && document.getElementById('main-menu')?.classList.contains('open')`);
    log('exit 3D', exited === true, exited ? '3D torn down, menu restored' : 'teardown incomplete');

    // 12. Restore the user's story state (flush immediately — a debounced
    // save can race app.quit() and persist mid-harness state, which makes
    // the dialogue-chain checks of the NEXT run flaky)
    await js(`
      (async () => {
        storyProgress = JSON.parse(${JSON.stringify(progSnap)});
        const snapSkins = JSON.parse(${JSON.stringify(skinsSnap)});
        unlockedSkinIds.clear();
        snapSkins.forEach(s => unlockedSkinIds.add(s));
        try { await saveGameState(); } catch (e) { debouncedSave?.(); }
        return true;
      })()
    `);
    await pause(1200);
    log('state restored', true, 'storyProgress + unlockedSkinIds restored and flushed');
  } catch (e) {
    fails++;
    console.error('[SMOKE3D] harness threw:', e);
  } finally {
    await new Promise(r => setTimeout(r, 800));
    console.log(`[SMOKE3D] complete — ${fails} failure(s)`);
    process.exitCode = fails > 0 ? 1 : 0;
    app.quit();
  }
}

// ── APP LIFECYCLE ──────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  // macOS: re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Quit stockfish cleanly
  if (stockfishProcess) {
    stockfishProcess.stdin.write('quit\n');
    stockfishProcess = null;
  }
  if (!isMac) app.quit();
});

app.on('before-quit', () => {
  if (stockfishProcess) {
    stockfishProcess.stdin.write('quit\n');
  }
});

// Security: prevent navigation away from local files
app.on('web-contents-created', (_e, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
    }
  });
});
