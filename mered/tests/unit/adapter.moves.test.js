'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const A = require('../../renderer/story3d/story3d_adapter.js');

// 8x8 helper: place pieces by algebraic-ish [row, col] = letter.
function boardWith(map) {
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  Object.entries(map).forEach(([rc, letter]) => {
    const [r, c] = rc.split(',').map(Number);
    b[r][c] = letter;
  });
  return b;
}

test('analyzeExecuteMove: quiet pawn push', () => {
  const b = boardWith({ '6,4': 'P' });
  const mv = A.analyzeExecuteMove(b, null, 6, 4, 4, 4, null);
  assert.equal(mv.ok, true);
  assert.equal(mv.piece, 'P');
  assert.equal(mv.captured, null);
  assert.equal(mv.rookMove, null);
  assert.equal(mv.mover, 'white');
});

test('analyzeExecuteMove: capture reports the victim and its square', () => {
  const b = boardWith({ '4,3': 'P', '3,4': 'p' });
  const mv = A.analyzeExecuteMove(b, null, 4, 3, 3, 4, null);
  assert.equal(mv.captured, 'p');
  assert.deepEqual(mv.capturedAt, { r: 3, c: 4 });
});

test('analyzeExecuteMove: en passant victim sits beside, not on, the target (L5461 mirror)', () => {
  const b = boardWith({ '3,4': 'P', '3,5': 'p' });
  const mv = A.analyzeExecuteMove(b, [2, 5], 3, 4, 2, 5, 'ep');
  assert.equal(mv.captured, 'p');
  assert.deepEqual(mv.capturedAt, { r: 3, c: 5 });
});

test('analyzeExecuteMove: castling derives the rook glide both directions (L5463 mirror)', () => {
  const kside = A.analyzeExecuteMove(boardWith({ '7,4': 'K', '7,7': 'R' }), null, 7, 4, 7, 6, 'castle');
  assert.deepEqual(kside.rookMove, { fr: 7, fc: 7, tr: 7, tc: 5 });
  const qside = A.analyzeExecuteMove(boardWith({ '7,4': 'K', '7,0': 'R' }), null, 7, 4, 7, 2, null); // flag-less king 2-step also detected
  assert.deepEqual(qside.rookMove, { fr: 7, fc: 0, tr: 7, tc: 3 });
});

test('analyzeExecuteMove: promotion auto-queens per the UI rule (L5468 mirror)', () => {
  const w = A.analyzeExecuteMove(boardWith({ '1,0': 'P' }), null, 1, 0, 0, 0, 'promo');
  assert.equal(w.promoPiece, 'Q');
  const bl = A.analyzeExecuteMove(boardWith({ '6,0': 'p' }), null, 6, 0, 7, 0, 'promo');
  assert.equal(bl.promoPiece, 'q');
});

test('analyzeExecuteMove: empty origin is not ok', () => {
  assert.equal(A.analyzeExecuteMove(boardWith({}), null, 6, 4, 4, 4, null).ok, false);
});

test('analyzeUciMove: parses squares and mover color', () => {
  const mv = A.analyzeUciMove(boardWith({ '1,4': 'p' }), null, 'e7e5');
  assert.equal(mv.ok, true);
  assert.deepEqual([mv.fr, mv.fc, mv.tr, mv.tc], [1, 4, 3, 4]);
  assert.equal(mv.mover, 'black');
});

test('analyzeUciMove: detects en passant from the ep target (L5526 mirror)', () => {
  const b = boardWith({ '4,3': 'p', '4,4': 'P' });
  const mv = A.analyzeUciMove(b, [5, 4], 'd4e3');
  assert.equal(mv.flag, 'ep');
  assert.equal(mv.captured, 'P');
  assert.deepEqual(mv.capturedAt, { r: 4, c: 4 });
});

test('analyzeUciMove: detects castling from the king two-step (L5532 mirror)', () => {
  const mv = A.analyzeUciMove(boardWith({ '0,4': 'k', '0,0': 'r' }), null, 'e8c8');
  assert.equal(mv.flag, 'castle');
  assert.deepEqual(mv.rookMove, { fr: 0, fc: 0, tr: 0, tc: 3 });
});

test('analyzeUciMove: promotion letter maps per color, defaults to queen', () => {
  assert.equal(A.analyzeUciMove(boardWith({ '6,2': 'p' }), null, 'c2c1n').promoPiece, 'n');
  assert.equal(A.analyzeUciMove(boardWith({ '1,2': 'P' }), null, 'c7c8q').promoPiece, 'Q');
  assert.equal(A.analyzeUciMove(boardWith({ '1,2': 'P' }), null, 'c7c8x').promoPiece, 'Q');
});

test('analyzeUciMove: rejects garbage and (none)', () => {
  assert.equal(A.analyzeUciMove(boardWith({}), null, '(none)').ok, false);
  assert.equal(A.analyzeUciMove(boardWith({}), null, 'zz99').ok, false);
});

test('boardDiff: empty for identical boards, lists changed squares otherwise', () => {
  const a = boardWith({ '6,4': 'P' });
  const b = boardWith({ '4,4': 'P' });
  assert.equal(A.boardDiff(a, a).length, 0);
  const d = A.boardDiff(a, b);
  assert.equal(d.length, 2);
  assert.deepEqual(d.find(x => x.r === 6), { r: 6, c: 4, from: 'P', to: null });
  assert.deepEqual(d.find(x => x.r === 4), { r: 4, c: 4, from: null, to: 'P' });
});
