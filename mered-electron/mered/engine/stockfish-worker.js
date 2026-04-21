/**
 * engine/stockfish-worker.js
 *
 * This file handles Stockfish integration for Chess Popup.
 *
 * TWO MODES:
 *
 * 1. NATIVE BINARY (preferred, production)
 *    - Download Stockfish binary from https://stockfishchess.org/download/
 *    - Place stockfish.exe (Windows) or stockfish (Mac/Linux) in this folder
 *    - main.js spawns it as a child process via IPC
 *    - The renderer calls window.electronAPI.engine.getBestMove(fen, depth)
 *
 * 2. WASM FALLBACK (works without binary, slightly slower)
 *    - npm install stockfish  (the npm package ships stockfish.wasm)
 *    - Use the StockfishWasm class below in the renderer
 *    - No binary needed, works cross-platform automatically
 *
 * HOW TO USE IN THE RENDERER (chess_ui.html):
 *
 *   // Check if native engine is available
 *   const nativeAvailable = await window.electronAPI.engine.isAvailable();
 *
 *   if (nativeAvailable) {
 *     // Native Stockfish (faster, better at depth 20+)
 *     const move = await window.electronAPI.engine.getBestMove(fen, 15);
 *     // move is a UCI string like "e2e4" or "g1f3"
 *   } else {
 *     // WASM fallback
 *     const sf = new StockfishWasm();
 *     await sf.ready();
 *     const move = await sf.getBestMove(fen, 12);
 *   }
 *
 * UCI MOVE FORMAT:
 *   "e2e4"   = pawn from e2 to e4
 *   "g1f3"   = knight from g1 to f3
 *   "e7e8q"  = pawn promotes to queen on e8
 *
 * DIFFICULTY MAPPING (suggested):
 *   Easy:       depth 3,  movetime 100ms
 *   Medium:     depth 8,  movetime 500ms
 *   Hard:       depth 15, movetime 1500ms
 *   Impossible: depth 20, movetime 3000ms
 *
 * BOT TRAINER:
 *   Don't use Stockfish for the training bot — that defeats the ML system.
 *   The training bot uses its own JS logic in chess_ui.html (getBotMove function).
 *   Stockfish is only for the regular chess bot opponent modes.
 */

'use strict';

/**
 * WASM Stockfish wrapper — use this in the renderer as a fallback.
 * Requires: npm install stockfish
 * Then in renderer: <script src="../node_modules/stockfish/stockfish.js"></script>
 */
class StockfishWasm {
  constructor() {
    this.sf = null;
    this._ready = false;
    this._pendingResolve = null;
    this._buffer = '';
  }

  async ready() {
    if (this._ready) return;
    return new Promise((resolve, reject) => {
      try {
        // Stockfish npm package exposes a global Stockfish() factory
        if (typeof Stockfish === 'undefined') {
          reject(new Error('Stockfish WASM not loaded — add stockfish.js script tag'));
          return;
        }
        Stockfish().then(sf => {
          this.sf = sf;
          sf.addMessageListener(line => this._onLine(line));
          sf.postMessage('uci');
          sf.postMessage('isready');
          // Wait for readyok
          const checkReady = setInterval(() => {
            if (this._ready) { clearInterval(checkReady); resolve(); }
          }, 50);
          setTimeout(() => { clearInterval(checkReady); reject(new Error('Stockfish timeout')); }, 5000);
        });
      } catch(e) {
        reject(e);
      }
    });
  }

  _onLine(line) {
    if (line === 'readyok') this._ready = true;
    if (line.startsWith('bestmove') && this._pendingResolve) {
      const move = line.split(' ')[1];
      const resolve = this._pendingResolve;
      this._pendingResolve = null;
      resolve(move === '(none)' ? null : move);
    }
  }

  getBestMove(fen, depth = 12, timeMs = null) {
    if (!this._ready) throw new Error('Stockfish not ready');
    return new Promise((resolve, reject) => {
      this._pendingResolve = resolve;
      const timeout = setTimeout(() => {
        this._pendingResolve = null;
        resolve(null);
      }, (timeMs || 10000) + 2000);
      this.sf.postMessage(`position fen ${fen}`);
      if (timeMs) {
        this.sf.postMessage(`go movetime ${timeMs}`);
      } else {
        this.sf.postMessage(`go depth ${depth}`);
      }
    });
  }

  stop()  { this.sf?.postMessage('stop'); }
  quit()  { this.sf?.postMessage('quit'); this.sf = null; this._ready = false; }
}

// Export for use in renderer (CommonJS won't work in browser,
// but this file serves as docs + the class definition can be copied in)
if (typeof module !== 'undefined') {
  module.exports = { StockfishWasm };
}
