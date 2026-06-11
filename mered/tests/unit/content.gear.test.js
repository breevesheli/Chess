'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const C = require('../../renderer/story3d/story3d_content.js');
const A = require('../../renderer/story3d/story3d_adapter.js');

test('armor catalog: every item has a slot, name, price, and colors', () => {
  Object.entries(C.ARMOR).forEach(([id, it]) => {
    assert.ok(it.name, `${id} has a name`);
    assert.ok(['head', 'body', 'cape', 'piece'].includes(it.slot), `${id} valid slot`);
    assert.ok(Number.isFinite(it.price), `${id} has a price`);
    assert.ok(it.colors && (it.colors.main || it.colors.trim), `${id} has colors`);
    if (it.slot === 'piece') assert.ok(['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'].includes(it.piece), `${id} valid piece`);
    else assert.ok(['helm', 'hood', 'plate', 'jerkin', 'robe', 'cape'].includes(it.style), `${id} valid style`);
  });
});

test('shop stock only references catalog items, never quest-only ones', () => {
  Object.entries(C.SHOP_STOCK).forEach(([ch, ids]) => {
    ids.forEach(id => {
      assert.ok(C.ARMOR[id], `${ch} stocks known item ${id}`);
      assert.ok(!C.ARMOR[id].questOnly, `${ch} does not sell quest reward ${id}`);
    });
  });
});

test('every chapter hub has a shop with stock', () => {
  ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'].forEach(ch => {
    assert.ok(C.shopStock(ch).length >= 3, `${ch} shop carries gear`);
    assert.ok(C.SHOP_KEEPERS[ch], `${ch} has a shopkeeper`);
  });
});

test('quest rewards reference real fight ids and catalog items', () => {
  const knownFights = [
    'ch1-f0', 'ch1-f1', 'ch1-f2', 'ch1-f3', 'ch1-sq1', 'ch1-boss',
    'ch2-f1', 'ch2-npc-pip', 'ch2-sq-deserter', 'ch2-f2', 'ch2-sq-archivist', 'ch2-f3', 'ch2-boss',
    'ch3-f1', 'ch3-sq-family', 'ch3-f2', 'ch3-sq-soldier', 'ch3-f3', 'ch3-boss',
    'ch4-boss', 'ch5-boss',
  ];
  Object.entries(C.QUEST_REWARDS).forEach(([fightId, armorId]) => {
    assert.ok(knownFights.includes(fightId), `${fightId} is a real fight`);
    assert.ok(C.ARMOR[armorId], `${fightId} rewards known item ${armorId}`);
  });
});

test('factions: every accent/figure faction exists; chapter enemies mapped', () => {
  Object.values(C.FIGURE_FACTIONS).forEach(f => assert.ok(C.FACTIONS[f], `faction ${f} defined`));
  ['ch1', 'ch2', 'ch3', 'ch4'].forEach(ch => assert.ok(C.FACTIONS[C.CHAPTER_ENEMY_FACTION[ch]], `${ch} enemy faction`));
  assert.equal(C.factionOf('halvane'), 'valdris');
  assert.equal(C.factionOf('guard', 'ch3'), 'valdris');
  assert.equal(C.factionOf('guard', 'ch2'), 'ashfield');
});

test('farewells: both endings have ordered, well-formed scenes', () => {
  ['kill_saoirse', 'spare_saoirse'].forEach(outcome => {
    const ids = C.farewellIds(outcome);
    assert.ok(ids.length >= 3, `${outcome} has at least 3 farewell scenes`);
    ids.forEach(id => {
      const cs = C.FAREWELL_CUTSCENES[id];
      assert.ok(cs, `${id} exists`);
      assert.ok(cs.bg, `${id} has a backdrop`);
      assert.ok(cs.steps.length >= 3, `${id} has real content`);
      // every step must normalize cleanly through the 2D grammar
      cs.steps.forEach(s => assert.notEqual(A.normalizeStep(s).type, 'noop', `${id} step valid`));
      assert.ok(cs.steps.some(s => s.say), `${id} has dialogue`);
    });
  });
});

test('farewell casts differ per ending (each leaver owns a scene)', () => {
  const kill = C.farewellIds('kill_saoirse').join();
  const spare = C.farewellIds('spare_saoirse').join();
  assert.notEqual(kill, spare);
  assert.ok(spare.includes('seraphine'), 'Seraphine leaves when Saoirse is spared (epilogue canon)');
  assert.ok(kill.includes('theron'), 'the Protector cannot stay after the clearing');
});

test('set bonuses: every bonus set is completable (head+body+cape exist)', () => {
  Object.keys(C.SET_BONUSES).forEach(prefix => {
    ['head', 'body', 'cape'].forEach(slot => {
      const found = Object.entries(C.ARMOR).some(([id, it]) => id.startsWith(prefix + '-') && it.slot === slot);
      assert.ok(found, `${prefix} set has a ${slot} piece`);
    });
    assert.ok(Object.keys(C.SET_BONUSES[prefix].grants).length, `${prefix} grants something`);
  });
});

test('fullSetPrefix detects complete sets and rejects mixes', () => {
  assert.equal(C.fullSetPrefix({ head: 'valdris-helm', body: 'valdris-plate', cape: 'valdris-cloak' }), 'valdris');
  assert.equal(C.fullSetPrefix({ head: 'royal-helm', body: 'royal-plate', cape: 'royal-cape' }), 'royal');
  assert.equal(C.fullSetPrefix({ head: 'valdris-helm', body: 'aurveld-plate', cape: 'valdris-cloak' }), null);
  assert.equal(C.fullSetPrefix({ head: 'valdris-helm', body: null, cape: 'valdris-cloak' }), null);
});

test('companions: lines for everyone; leavers match the farewells', () => {
  C.COMPANIONS.forEach(id => assert.ok(C.COMPANION_LINES[id], `${id} has lines`));
  const spare = C.companionsFor('ch1', { outcome: 'spare_saoirse' });
  assert.ok(!spare.includes('seraphine') && !spare.includes('seld'), 'spare leavers gone');
  const kill = C.companionsFor('ch1', { outcome: 'kill_saoirse' });
  assert.ok(!kill.includes('theron') && !kill.includes('idris'), 'kill leavers gone');
  assert.ok(!C.companionsFor('ch5', {}).includes('saoirse'), 'Saoirse waits in the clearing in ch5');
  assert.ok(C.companionsFor('ch2', {}).includes('saoirse'), 'Saoirse rides along before the reveal');
  const line = C.companionLine('theron', { roster: { Theron: { relationship: 80 } } });
  assert.ok(line && line.speaker === 'THERON' && line.text.length > 5);
});

test('side activities: riddles well-formed, lore pages and spots per chapter', () => {
  C.RIDDLES.forEach((r, i) => {
    assert.ok(r.q.length > 10 && r.a.length === 3, `riddle ${i} shaped`);
    assert.ok(r.correct >= 0 && r.correct < 3, `riddle ${i} answer index`);
  });
  ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'].forEach(ch => {
    assert.ok(C.LORE_PAGES[ch].length >= 2, `${ch} has lore pages`);
    const s = C.HUB_SPOTS[ch];
    assert.ok(s.companions.length >= 4 && s.patron && s.dummy && s.pages.length >= 2, `${ch} hub spots complete`);
  });
  const ids = Object.values(C.LORE_PAGES).flat().map(p => p.id);
  assert.equal(new Set(ids).size, ids.length, 'page ids unique');
});

test('ending moods: both endings stage uniquely', () => {
  const kill = C.endingMood('ch5.ending_kill');
  const spare = C.endingMood('ch5.ending_spare');
  assert.ok(kill && spare);
  assert.equal(kill.collapse, true);
  assert.equal(spare.collapse, false);
  assert.ok(spare.dawn, 'spare ends at dawn');
  assert.notEqual(kill.fogTo, spare.fogTo);
  assert.equal(C.endingMood('ch1.intro_cavan_room'), null, 'ordinary scenes unaffected');
});
