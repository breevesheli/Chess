/**
 * story3d_adapter.js — pure logic between the 2D game state and the 3D view.
 *
 * Everything in this file is side-effect free and takes its inputs as
 * arguments (no reads of window/globals), so it runs both in the renderer and
 * under `node --test`. Mirrored rules cite their source lines in
 * chess_ui.html; they are mirrored verbatim, quirks included (see
 * DECISIONS.md D4).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else { root.Story3D = root.Story3D || {}; root.Story3D.Adapter = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── Piece helpers ─────────────────────────────────────────────────────
  const PIECE_TYPE = {
    k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn',
  };
  function pieceType(p) { return p ? PIECE_TYPE[p.toLowerCase()] || null : null; }
  function pieceColor(p) {
    if (!p) return null;
    return p === p.toUpperCase() ? 'white' : 'black';
  }

  // ── Story gating (mirror of chess_ui.html) ───────────────────────────
  // computeChapterUnlock, L48293–48300.
  function chapterUnlockIndex(chapters, progress) {
    let idx = 0;
    for (let i = 0; i < chapters.length - 1; i++) {
      if (progress.bossesCleared.includes(chapters[i].boss.id)) idx = i + 1;
    }
    return Math.max(idx, chapters.findIndex(c => c.id === progress.currentChapter));
  }

  // renderStoryChapterDetail boss lock, L48327–48329 (the LEGACY chapter
  // list — unreachable post-prologue but kept as a tested reference).
  // Note: `fights.every` includes optional sidequests and hidden NPC fights.
  function bossLocked(chapter, progress) {
    const fights = chapter.fights || [];
    const priorClear = fights.every(f => progress.clearedFights.includes(f.id));
    return fights.length > 0 && !priorClear;
  }

  function fightCleared(fight, progress) {
    return progress.clearedFights.includes(fight.id);
  }
  function bossCleared(chapter, progress) {
    return progress.bossesCleared.includes(chapter.boss.id);
  }

  // ── Live (world-map) gating mirrors — WM_LOCATIONS hotspot reqs,
  // chess_ui.html L21480–21679. The post-prologue 2D flow runs on these:
  // main fights unlock sequentially, the boss needs the main fights only
  // (sidequests and hidden NPC entries do NOT gate it), sidequests are open
  // while uncleared. See DECISIONS.md D4.
  function mainFights(chapter) {
    return (chapter.fights || []).filter(f => f.type === 'rival' || f.type === 'enemy');
  }
  function fightAvailable(chapter, fight, progress) {
    if (fight.type === 'rival' || fight.type === 'enemy') {
      const seq = mainFights(chapter);
      const i = seq.findIndex(f => f.id === fight.id);
      if (i <= 0) return true;
      return fightCleared(seq[i - 1], progress);
    }
    return true; // brother / sidequest / npc — approachable whenever present
  }
  function bossLockedLive(chapter, progress) {
    const seq = mainFights(chapter);
    return seq.length > 0 && !seq.every(f => fightCleared(f, progress));
  }

  // ── Move analysis ─────────────────────────────────────────────────────
  // Both analyzers run on the board snapshot taken BEFORE the original
  // function mutates it, and reproduce that function's own special-case
  // detection so the 3D mirror animates exactly what the rules layer did.

  // Mirror of executeMove's effect, chess_ui.html L5456–5474.
  function analyzeExecuteMove(board, enPassantTarget, fr, fc, tr, tc, flag) {
    const piece = board[fr] && board[fr][fc];
    if (!piece) return { ok: false };
    let captured = board[tr][tc] || null;
    let capturedAt = captured ? { r: tr, c: tc } : null;
    if (flag === 'ep') {
      captured = board[fr][tc] || null;
      capturedAt = captured ? { r: fr, c: tc } : null;
    }
    let rookMove = null;
    if (flag === 'castle' || (pieceType(piece) === 'king' && Math.abs(tc - fc) === 2)) {
      rookMove = tc > fc
        ? { fr, fc: 7, tr: fr, tc: tc - 1 }
        : { fr, fc: 0, tr: fr, tc: tc + 1 };
    }
    let promoPiece = null;
    if (flag === 'promo' && pieceType(piece) === 'pawn') {
      promoPiece = pieceColor(piece) === 'white' ? 'Q' : 'q'; // UI auto-queens (L5468)
    }
    return { ok: true, fr, fc, tr, tc, flag: flag || null, piece, captured, capturedAt, rookMove, promoPiece, mover: pieceColor(piece) };
  }

  // Mirror of applyUciMove's detection, chess_ui.html L5515–5546.
  function analyzeUciMove(board, enPassantTarget, uci) {
    if (!uci || uci === '(none)') return { ok: false };
    const files = 'abcdefgh';
    const fc = files.indexOf(uci[0]), fr = 8 - parseInt(uci[1], 10);
    const tc = files.indexOf(uci[2]), tr = 8 - parseInt(uci[3], 10);
    if (fc < 0 || fr < 0 || tc < 0 || tr < 0 || fr > 7 || tr > 7) return { ok: false };
    const piece = board[fr] && board[fr][fc];
    if (!piece) return { ok: false };
    let captured = board[tr][tc] || null;
    let capturedAt = captured ? { r: tr, c: tc } : null;
    let flag = null;
    if (pieceType(piece) === 'pawn' && fc !== tc && !captured &&
        enPassantTarget && enPassantTarget[0] === tr && enPassantTarget[1] === tc) {
      flag = 'ep';
      captured = board[fr][tc] || null;
      capturedAt = captured ? { r: fr, c: tc } : null;
    }
    let rookMove = null;
    if (pieceType(piece) === 'king' && Math.abs(tc - fc) === 2) {
      flag = 'castle';
      rookMove = tc > fc
        ? { fr, fc: 7, tr: fr, tc: tc - 1 }
        : { fr, fc: 0, tr: fr, tc: tc + 1 };
    }
    let promoPiece = null;
    if (uci[4] && piece.toLowerCase() === 'p') {
      const promoMap = { q: 'q', r: 'r', b: 'b', n: 'n' };
      const ch = promoMap[uci[4]] || 'q';
      promoPiece = pieceColor(piece) === 'white' ? ch.toUpperCase() : ch;
      flag = 'promo';
    }
    return { ok: true, fr, fc, tr, tc, flag, piece, captured, capturedAt, rookMove, promoPiece, mover: pieceColor(piece) };
  }

  function coordsToUci(fr, fc, tr, tc) {
    const files = 'abcdefgh', ranks = '87654321';
    return files[fc] + ranks[fr] + files[tc] + ranks[tr];
  }

  // List the differences between two 8x8 board snapshots — used for the
  // authoritative resync check after animations / takebacks.
  function boardDiff(a, b) {
    const out = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const pa = (a[r] && a[r][c]) || null;
      const pb = (b[r] && b[r][c]) || null;
      if (pa !== pb) out.push({ r, c, from: pa, to: pb });
    }
    return out;
  }

  // ── Board ⇄ world mapping ────────────────────────────────────────────
  // Board-local coordinates: origin at board centre, +x toward file h,
  // +z toward white's side (row 7). Row 0 (black back rank) sits at -z.
  function squareToWorld(r, c, squareSize) {
    const s = squareSize || 1;
    return { x: (c - 3.5) * s, y: 0, z: (r - 3.5) * s };
  }
  function worldToSquare(x, z, squareSize) {
    const s = squareSize || 1;
    const c = Math.round(x / s + 3.5);
    const r = Math.round(z / s + 3.5);
    if (r < 0 || r > 7 || c < 0 || c > 7) return null;
    return { r, c };
  }

  // ── Cutscene step normalisation ──────────────────────────────────────
  // Source grammar + timings: _csProcessStep, chess_ui.html L20630–20714.
  // `place` is flat ({place:'id', x, y}); everything else nests its payload.
  function normalizeStep(step) {
    if (!step || typeof step !== 'object') return { type: 'noop', waitMs: 0 };
    if (step.place) return { type: 'place', id: step.place, x: step.x, y: step.y, waitMs: 0 };
    if (step.move) {
      return { type: 'move', id: step.move.id, x: step.move.x, y: step.move.y, waitMs: step.move.ms || 600 };
    }
    if (step.shift) {
      return { type: 'shift', id: step.shift.id, dx: step.shift.dx || 0, dy: step.shift.dy || 0, waitMs: 320 };
    }
    if (step.drop) return { type: 'drop', id: step.drop.id, waitMs: 220 };
    if (step.fade) {
      return { type: 'fade', id: step.fade.id, to: step.fade.to ?? 0, waitMs: step.fade.ms || 400 };
    }
    if (step.swapbg) return { type: 'swapbg', bg: step.swapbg, waitMs: 100 };
    if (step.lore) return { type: 'lore', lore: step.lore, waitMs: 400 };
    if (step.choose) return { type: 'choose', choices: step.choose, waitMs: 0 };
    if (step.say) return { type: 'say', speaker: step.say.speaker || '', text: step.say.text || '', waitMs: 0 };
    return { type: 'noop', waitMs: 0 };
  }

  // Map normalised cutscene coords (x right 0..1, y down 0..1 — 2D screen
  // space) onto an environment's stage rectangle. The stage faces its camera
  // anchor, so larger y (lower on the 2D screen) comes toward the camera.
  // stage = { center:[x,y,z], right:[ux,uy,uz], forward:[ux,uy,uz], width, depth }
  function stageToWorld(x, y, stage) {
    const lx = (x - 0.5) * stage.width;
    const lz = (y - 0.65) * stage.depth; // 2D scenes anchor actors ~y 0.65–0.75
    return {
      x: stage.center[0] + stage.right[0] * lx + stage.forward[0] * lz,
      y: stage.center[1] + stage.right[1] * lx + stage.forward[1] * lz,
      z: stage.center[2] + stage.right[2] * lx + stage.forward[2] * lz,
    };
  }

  // ── Skins ─────────────────────────────────────────────────────────────
  // equippedSkins shape (chess_ui.html L4862): { white: {king:'skin-id',...},
  // black: {...} }. Only the two story-ending skins get 3D variants (D8).
  const ENDING_SKINS = ['dying-sun', 'the-eternal'];
  function kingSkinVariant(equippedSkins, color) {
    const id = equippedSkins && equippedSkins[color] && equippedSkins[color].king;
    return ENDING_SKINS.includes(id) ? id : null;
  }

  return {
    pieceType, pieceColor,
    chapterUnlockIndex, bossLocked, fightCleared, bossCleared,
    mainFights, fightAvailable, bossLockedLive,
    analyzeExecuteMove, analyzeUciMove, coordsToUci, boardDiff,
    squareToWorld, worldToSquare,
    normalizeStep, stageToWorld,
    kingSkinVariant, ENDING_SKINS,
  };
});
