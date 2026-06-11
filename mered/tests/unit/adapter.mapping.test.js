'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const A = require('../../renderer/story3d/story3d_adapter.js');

test('squareToWorld: board is centred, +x = files, +z = white side', () => {
  const s = 0.26;
  const a8 = A.squareToWorld(0, 0, s); // black's corner
  const h1 = A.squareToWorld(7, 7, s); // white's corner
  assert.ok(a8.x < 0 && a8.z < 0);
  assert.ok(h1.x > 0 && h1.z > 0);
  assert.ok(Math.abs(a8.x + h1.x) < 1e-9, 'symmetric about the centre');
  const e1 = A.squareToWorld(7, 4, s);
  assert.ok(e1.z > 0, 'white back rank toward the player (+z)');
});

test('worldToSquare: exact round trip over all 64 squares', () => {
  const s = 0.26;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const w = A.squareToWorld(r, c, s);
    assert.deepEqual(A.worldToSquare(w.x, w.z, s), { r, c });
  }
});

test('worldToSquare: clicks off the board return null', () => {
  assert.equal(A.worldToSquare(99, 0, 0.26), null);
  assert.equal(A.worldToSquare(0, -99, 0.26), null);
});

test('coordsToUci matches the engine notation', () => {
  assert.equal(A.coordsToUci(6, 4, 4, 4), 'e2e4');
  assert.equal(A.coordsToUci(0, 0, 7, 7), 'a8h1');
});

test('pieceType/pieceColor decode FEN letters', () => {
  assert.equal(A.pieceType('K'), 'king');
  assert.equal(A.pieceType('n'), 'knight');
  assert.equal(A.pieceType(null), null);
  assert.equal(A.pieceColor('Q'), 'white');
  assert.equal(A.pieceColor('q'), 'black');
  assert.equal(A.pieceColor(null), null);
});

test('stageToWorld maps 2D cutscene coords onto the stage basis', () => {
  const stage = { center: [0, 0, -1], right: [1, 0, 0], forward: [0, 0, 1], width: 10, depth: 6 };
  const centre = A.stageToWorld(0.5, 0.65, stage);
  assert.ok(Math.abs(centre.x) < 1e-9 && Math.abs(centre.z - (-1)) < 1e-9, '0.5/0.65 is the stage anchor');
  const left = A.stageToWorld(0.0, 0.65, stage);
  assert.ok(left.x < centre.x, 'smaller 2D x → stage left');
  const closer = A.stageToWorld(0.5, 0.85, stage);
  assert.ok(closer.z > centre.z, 'lower on the 2D screen → toward the camera');
});
