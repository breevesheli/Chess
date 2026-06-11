'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const T = require('../../renderer/story3d/story3d_textures.js'); // Node export = pure math only

test('mulberry32 is deterministic per seed', () => {
  const a = T.mulberry32(42), b = T.mulberry32(42), c = T.mulberry32(43);
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  const seqC = [c(), c(), c()];
  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, seqC);
  seqA.forEach(v => assert.ok(v >= 0 && v < 1));
});

test('valueNoise stays in [0,1] and is deterministic', () => {
  for (let i = 0; i < 200; i++) {
    const v = T.valueNoise(7, i * 0.37, i * 0.71, 16);
    assert.ok(v >= 0 && v <= 1, `out of range: ${v}`);
  }
  assert.equal(T.valueNoise(7, 3.3, 4.4, 16), T.valueNoise(7, 3.3, 4.4, 16));
});

test('valueNoise tiles over its period (seamless texture repeat)', () => {
  const p = 8;
  for (let i = 0; i < 24; i++) {
    const x = i * 0.41, y = i * 0.23;
    assert.ok(Math.abs(T.valueNoise(11, x, y, p) - T.valueNoise(11, x + p, y, p)) < 1e-9);
    assert.ok(Math.abs(T.valueNoise(11, x, y, p) - T.valueNoise(11, x, y + p, p)) < 1e-9);
  }
});

test('fbm stays in [0,1] and varies with seed', () => {
  let differs = false;
  for (let i = 0; i < 50; i++) {
    const v = T.fbm(5, i * 0.13, i * 0.29, 4, 8);
    assert.ok(v >= 0 && v <= 1);
    if (Math.abs(v - T.fbm(99, i * 0.13, i * 0.29, 4, 8)) > 1e-6) differs = true;
  }
  assert.ok(differs, 'different seeds should produce different fields');
});

test('hexToRgb parses 6- and 3-digit forms', () => {
  assert.deepEqual(T.hexToRgb('#ffcc00'), [255, 204, 0]);
  assert.deepEqual(T.hexToRgb('e6dcc0'), [230, 220, 192]);
  assert.deepEqual(T.hexToRgb('#fff'), [255, 255, 255]);
});

test('clamp01 clamps', () => {
  assert.equal(T.clamp01(-1), 0);
  assert.equal(T.clamp01(0.5), 0.5);
  assert.equal(T.clamp01(7), 1);
});
