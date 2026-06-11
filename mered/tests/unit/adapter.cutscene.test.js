'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const A = require('../../renderer/story3d/story3d_adapter.js');

test('normalizeStep: flat place form ({place:"id", x, y}) — the real data shape', () => {
  const s = A.normalizeStep({ place: 'cavan', x: 0.72, y: 0.68 });
  assert.deepEqual(s, { type: 'place', id: 'cavan', x: 0.72, y: 0.68, waitMs: 0 });
});

test('normalizeStep: move defaults to 600 ms like _csProcessStep (L20650)', () => {
  assert.equal(A.normalizeStep({ move: { id: 'cavan', x: 0.9, y: 0.7 } }).waitMs, 600);
  assert.equal(A.normalizeStep({ move: { id: 'cavan', x: 0.9, y: 0.7, ms: 2000 } }).waitMs, 2000);
});

test('normalizeStep: fade defaults (to 0, 400 ms — L20667)', () => {
  const s = A.normalizeStep({ fade: { id: 'saoirse' } });
  assert.equal(s.to, 0);
  assert.equal(s.waitMs, 400);
  assert.equal(A.normalizeStep({ fade: { id: 'x', to: 0.5, ms: 1200 } }).to, 0.5);
});

test('normalizeStep: shift carries dx AND dy with the 2D 320 ms wait (L20652)', () => {
  const s = A.normalizeStep({ shift: { id: 'saoirse', dx: -0.02, dy: 0.01 } });
  assert.deepEqual(s, { type: 'shift', id: 'saoirse', dx: -0.02, dy: 0.01, waitMs: 320 });
  assert.equal(A.normalizeStep({ shift: { id: 'p' } }).dx, 0);
});

test('normalizeStep: swapbg / drop / lore timings mirror the 2D player', () => {
  assert.deepEqual(A.normalizeStep({ swapbg: 'palace_great_hall' }), { type: 'swapbg', bg: 'palace_great_hall', waitMs: 100 });
  assert.equal(A.normalizeStep({ drop: { id: 'aldric' } }).waitMs, 220);
  assert.equal(A.normalizeStep({ lore: { id: 'x', title: 't', body: 'b' } }).waitMs, 400);
});

test('normalizeStep: say and choose pass payloads through', () => {
  const say = A.normalizeStep({ say: { speaker: 'SAOIRSE', text: 'Play me for it.' } });
  assert.equal(say.type, 'say');
  assert.equal(say.speaker, 'SAOIRSE');
  const effects = [{ text: 'a', effect: () => {} }];
  assert.equal(A.normalizeStep({ choose: effects }).choices, effects);
});

test('normalizeStep: unknown/empty steps become harmless noops', () => {
  assert.equal(A.normalizeStep({}).type, 'noop');
  assert.equal(A.normalizeStep(null).type, 'noop');
});
