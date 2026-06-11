'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const A = require('../../renderer/story3d/story3d_adapter.js');

// Fixture chapters mirroring the real STORY_CHAPTERS shapes.
const CH1 = {
  id: 'ch1',
  fights: [
    { id: 'ch1-f0', type: 'brother' },
    { id: 'ch1-f1', type: 'rival' },
    { id: 'ch1-f2', type: 'rival' },
    { id: 'ch1-f3', type: 'rival' },
    { id: 'ch1-sq1', type: 'sidequest', optional: true },
  ],
  boss: { id: 'ch1-boss', type: 'boss' },
};
const CH2 = {
  id: 'ch2',
  fights: [
    { id: 'ch2-f1', type: 'enemy' },
    { id: 'ch2-npc-pip', type: 'npc', hidden: true },
    { id: 'ch2-sq-deserter', type: 'sidequest', optional: true },
    { id: 'ch2-f2', type: 'enemy' },
    { id: 'ch2-f3', type: 'enemy' },
  ],
  boss: { id: 'ch2-boss', type: 'boss' },
};
const CH4 = { id: 'ch4', fights: [], boss: { id: 'ch4-boss', type: 'boss', bossOnly: true } };
const CHAPTERS = [CH1, CH2, { id: 'ch3', fights: [], boss: { id: 'ch3-boss' } }, CH4, { id: 'ch5', fights: [], boss: { id: 'ch5-boss' } }];

const prog = (over) => Object.assign({ currentChapter: 'ch1', clearedFights: [], bossesCleared: [] }, over);

test('chapterUnlockIndex: fresh save unlocks only ch1', () => {
  assert.equal(A.chapterUnlockIndex(CHAPTERS, prog()), 0);
});

test('chapterUnlockIndex: boss clears advance the unlock frontier', () => {
  assert.equal(A.chapterUnlockIndex(CHAPTERS, prog({ bossesCleared: ['ch1-boss'] })), 1);
  assert.equal(A.chapterUnlockIndex(CHAPTERS, prog({ bossesCleared: ['ch1-boss', 'ch2-boss'] })), 2);
});

test('chapterUnlockIndex: currentChapter keeps later chapters open (L48299 max)', () => {
  assert.equal(A.chapterUnlockIndex(CHAPTERS, prog({ currentChapter: 'ch3' })), 2);
});

test('legacy bossLocked gates on EVERY fight, sidequests included (L48328 mirror)', () => {
  const p = prog({ clearedFights: ['ch1-f0', 'ch1-f1', 'ch1-f2', 'ch1-f3'] });
  assert.equal(A.bossLocked(CH1, p), true, 'sq1 missing → still locked (the legacy quirk)');
  p.clearedFights.push('ch1-sq1');
  assert.equal(A.bossLocked(CH1, p), false);
});

test('legacy bossLocked: bossOnly chapters are never locked', () => {
  assert.equal(A.bossLocked(CH4, prog()), false);
});

test('live mainFights excludes brother/sidequest/npc entries', () => {
  assert.deepEqual(A.mainFights(CH1).map(f => f.id), ['ch1-f1', 'ch1-f2', 'ch1-f3']);
  assert.deepEqual(A.mainFights(CH2).map(f => f.id), ['ch2-f1', 'ch2-f2', 'ch2-f3']);
});

test('live fightAvailable: main fights unlock sequentially (WM req mirror)', () => {
  const p = prog();
  assert.equal(A.fightAvailable(CH1, CH1.fights[1], p), true, 'f1 open from the start');
  assert.equal(A.fightAvailable(CH1, CH1.fights[2], p), false, 'f2 waits on f1');
  p.clearedFights.push('ch1-f1');
  assert.equal(A.fightAvailable(CH1, CH1.fights[2], p), true);
});

test('live fightAvailable: brother / sidequest / npc always approachable', () => {
  const p = prog();
  assert.equal(A.fightAvailable(CH1, CH1.fights[0], p), true);
  assert.equal(A.fightAvailable(CH1, CH1.fights[4], p), true);
  assert.equal(A.fightAvailable(CH2, CH2.fights[1], p), true);
});

test('live bossLockedLive: main fights only — Old Pip and sidequests do NOT gate', () => {
  const p = prog({ clearedFights: ['ch2-f1', 'ch2-f2', 'ch2-f3'] });
  assert.equal(A.bossLockedLive(CH2, p), false, 'boss open without pip/sidequests');
  assert.equal(A.bossLockedLive(CH2, prog({ clearedFights: ['ch2-f1', 'ch2-f2'] })), true);
  assert.equal(A.bossLockedLive(CH4, prog()), false, 'bossOnly chapter open');
});

test('fightCleared / bossCleared read storyProgress lists', () => {
  const p = prog({ clearedFights: ['ch1-f1'], bossesCleared: ['ch1-boss'] });
  assert.equal(A.fightCleared(CH1.fights[1], p), true);
  assert.equal(A.fightCleared(CH1.fights[2], p), false);
  assert.equal(A.bossCleared(CH1, p), true);
});

test('kingSkinVariant: only the two ending skins map to 3D variants (D8)', () => {
  assert.equal(A.kingSkinVariant({ white: { king: 'dying-sun' } }, 'white'), 'dying-sun');
  assert.equal(A.kingSkinVariant({ black: { king: 'the-eternal' } }, 'black'), 'the-eternal');
  assert.equal(A.kingSkinVariant({ white: { king: 'permafrost' } }, 'white'), null);
  assert.equal(A.kingSkinVariant({}, 'white'), null);
  assert.equal(A.kingSkinVariant(null, 'white'), null);
});
