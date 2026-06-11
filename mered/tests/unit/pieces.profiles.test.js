'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const P = require('../../renderer/story3d/story3d_pieces.js'); // Node export = pure profiles

const LATHE_PROFILES = {
  pawn: P.pawnProfile(),
  bishop: P.bishopProfile(),
  queen: P.queenProfile(),
  king: P.kingProfile(),
  rook: P.rookProfile(),
};

test('lathe profiles start and end on the axis (closed solids)', () => {
  Object.entries(LATHE_PROFILES).forEach(([name, pts]) => {
    assert.ok(pts[0][0] <= 0.001, `${name} starts at the axis`);
    assert.ok(pts[pts.length - 1][0] <= 0.001, `${name} ends at the axis`);
  });
});

test('lathe profiles have non-negative radii and non-decreasing height', () => {
  Object.entries(LATHE_PROFILES).forEach(([name, pts]) => {
    let prevY = -1;
    pts.forEach(([x, y], i) => {
      assert.ok(x >= 0, `${name}[${i}] radius >= 0`);
      assert.ok(y >= prevY - 1e-9, `${name}[${i}] height non-decreasing`);
      prevY = y;
    });
  });
});

test('piece height ordering: king tallest, pawn shortest', () => {
  const h = (pts) => pts[pts.length - 1][1];
  assert.ok(h(LATHE_PROFILES.king) > h(LATHE_PROFILES.queen));
  assert.ok(h(LATHE_PROFILES.queen) > h(LATHE_PROFILES.bishop));
  assert.ok(h(LATHE_PROFILES.bishop) > h(LATHE_PROFILES.rook));
  assert.ok(h(LATHE_PROFILES.rook) > h(LATHE_PROFILES.pawn));
  assert.ok(Math.abs(h(LATHE_PROFILES.king) - 0.97) < 1e-9, 'king ~1.0 unit before the cross');
});

test('profiles are stable (deterministic geometry inputs)', () => {
  assert.deepEqual(P.pawnProfile(), P.pawnProfile());
  assert.deepEqual(P.kingProfile(), P.kingProfile());
});

test('knight outline is a usable closed polygon', () => {
  const pts = P.knightOutline();
  assert.ok(pts.length >= 12, 'enough points to read as a horse head');
  assert.equal(pts[0][1], 0, 'starts on the base line');
  assert.equal(pts[pts.length - 1][1], 0, 'ends on the base line');
  const maxY = Math.max(...pts.map(p => p[1]));
  assert.ok(maxY > 0.6 && maxY < 1, 'head height in piece scale');
});

test('shared base profile gives every piece a stable footing', () => {
  Object.entries(LATHE_PROFILES).forEach(([name, pts]) => {
    const baseR = pts[1][0];
    assert.ok(baseR >= 0.3 && baseR <= 0.34, `${name} base radius ${baseR}`);
    assert.equal(pts[1][1], 0, `${name} base sits on the board`);
  });
});
