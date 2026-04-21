/**
 * preload.js — Chess Popup Preload Script
 *
 * Runs in renderer context but has access to Node/Electron APIs.
 * Exposes a safe, minimal API to the renderer via contextBridge.
 * The renderer NEVER gets direct access to Node or ipcRenderer.
 *
 * Everything exposed here is intentional and auditable.
 */

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

  // ── PERSISTENCE ─────────────────────────────────────────────────
  // Drop-in replacement for localStorage — data survives reinstalls
  store: {
    get:    (key)        => ipcRenderer.invoke('store:get', key),
    set:    (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key)        => ipcRenderer.invoke('store:delete', key),
    getAll: ()           => ipcRenderer.invoke('store:getAll'),
    setAll: (data)       => ipcRenderer.invoke('store:setAll', data),
    reset:  ()           => ipcRenderer.invoke('store:reset'),
  },

  // ── CHESS ENGINE ─────────────────────────────────────────────────
  // Stockfish bridge — renderer passes FEN, gets back UCI move string
  engine: {
    getBestMove:   (fen, depth, timeMs) => ipcRenderer.invoke('stockfish:getBestMove', fen, depth, timeMs),
    stop:          ()                   => ipcRenderer.invoke('stockfish:stop'),
    quit:          ()                   => ipcRenderer.invoke('stockfish:quit'),
    isAvailable:   ()                   => ipcRenderer.invoke('stockfish:isAvailable'),
  },

  // ── WINDOW CONTROLS ──────────────────────────────────────────────
  window: {
    toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
    isFullscreen:     () => ipcRenderer.invoke('window:isFullscreen'),
    minimize:         () => ipcRenderer.invoke('window:minimize'),
    close:            () => ipcRenderer.invoke('window:close'),
  },

  // ── STEAM ────────────────────────────────────────────────────────
  // Stubs now — wire up greenworks/steamworks.js before shipping
  steam: {
    isAvailable:       ()            => ipcRenderer.invoke('steam:isAvailable'),
    getPlayerName:     ()            => ipcRenderer.invoke('steam:getPlayerName'),
    unlockAchievement: (id)          => ipcRenderer.invoke('steam:unlockAchievement', id),
    setRichPresence:   (key, value)  => ipcRenderer.invoke('steam:setRichPresence', key, value),
  },

  // ── APP INFO ─────────────────────────────────────────────────────
  app: {
    version:  process.env.npm_package_version || '0.1.0',
    isDev:    process.argv.includes('--dev'),
    platform: process.platform,
  },
});
