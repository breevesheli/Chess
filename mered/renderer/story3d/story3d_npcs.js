/**
 * story3d_npcs.js — hub NPCs: one per chapter fight, plus boss and merchant.
 *
 * Availability mirrors the live world-map flow (Adapter mirrors of the
 * WM_LOCATIONS hotspot reqs): main fights unlock sequentially, the boss
 * unlocks when the main fights are cleared, sidequests are open while
 * present, and Old Pip is a pure cutscene NPC. Interacting calls the real
 * launchStoryFight / launchStoryBoss; the merchant opens the 3D armor shop.
 *
 * Overhead markers (billboarded sprites):
 *   yellow ?  story fights        blue ?  side quests
 *   red !     bosses              bubble  talk-only NPCs + the merchant
 *   green ✓   cleared             grey    locked (dimmed)
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(null, null);
  else { root.Story3D.NPCs = factory(root.THREE, root.Story3D); }
})(typeof self !== 'undefined' ? self : this, function (THREE, NS) {
  'use strict';
  if (!THREE) return {};

  const A = () => NS.Adapter;
  const F = () => NS.Figures;
  const M = () => NS.Materials;
  const T = () => NS.Textures;

  // fight-id / name → figure id (cast table in story3d_figures / CS_SILHOUETTES)
  const FIGURE_BY_FIGHT = {
    'ch1-f0': 'cavan',
    'ch1-f1': 'nobleman',      // Lord Caeven — old court, not a soldier
    'ch1-f2': 'noblewoman',    // Lady Mourne — she never blinks
    'ch1-f3': 'councilor',     // the Council of Three's spokesman
    'ch1-boss': 'aldwyn',
    'ch2-f2': 'drave',         // Lord Drave, the profiteer
    'ch2-boss': 'brenna',
    'ch2-sq-archivist': 'archivist',
    'ch2-npc-pip': 'civilian',
    'ch3-boss': 'halvane',
    'ch3-sq-soldier': 'oldSoldier',
    'ch3-sq-family': 'civilian',
    'ch4-boss': 'aldric',
    'ch5-boss': 'saoirse',
  };
  const FIGURE_BY_TYPE = { rival: 'guard', enemy: 'guard', sidequest: 'civilian', npc: 'civilian', brother: 'cavan' };

  const state = { npcs: [], group: null, chapter: null, nearest: null };

  function _figureIdFor(fight) {
    return FIGURE_BY_FIGHT[fight.id] || FIGURE_BY_TYPE[fight.type] || 'npc';
  }

  /** Billboarded overhead marker. kind ∈ '?', '!', '✓', 'bubble'. */
  function _marker(kind, color, dim) {
    const mat = new THREE.SpriteMaterial({
      map: T().markerSprite(kind, color),
      transparent: true, depthWrite: false, opacity: dim ? 0.45 : 1,
    });
    const m = new THREE.Sprite(mat);
    m.scale.setScalar(0.52);
    m.position.y = 2.15;
    m.userData.animators = [(t) => { m.position.y = 2.15 + 0.07 * Math.sin(t * 2.1); }];
    return m;
  }

  function _progress() { return (typeof storyProgress !== 'undefined') ? storyProgress : window.storyProgress; }

  /** Spawn NPCs for the chapter into env. Returns the group. */
  function populate(env, chapter) {
    clear();
    state.chapter = chapter;
    state.group = new THREE.Group();
    const slots = env.npcSlots || [];
    let slot = 0;
    const takeSlot = () => slots[slot++] || { x: (slot * 2) - 6, z: -4, facing: 0 };
    const buildOpts = { chapterId: chapter.id };

    (chapter.fights || []).forEach(fight => {
      const s = takeSlot();
      const fig = F().buildById(_figureIdFor(fight), buildOpts);
      fig.position.set(s.x, 0, s.z);
      fig.rotation.y = s.facing;
      fig.userData.heading = s.facing;
      state.group.add(fig);
      state.npcs.push({ kind: 'fight', fight, figure: fig, marker: null });
    });

    // Boss — at the dedicated (second-to-last) slot when provided.
    if (chapter.boss) {
      const s = slots.length >= 2 ? slots[slots.length - 2] : takeSlot();
      const fig = F().buildById(_figureIdFor(chapter.boss), buildOpts);
      fig.position.set(s.x, 0, s.z);
      fig.rotation.y = s.facing;
      fig.userData.heading = s.facing;
      state.group.add(fig);
      state.npcs.push({ kind: 'boss', fight: chapter.boss, figure: fig, marker: null });
    }

    // Merchant — runs the chapter's armor shop (Story3D.Inventory.openShop).
    if (slots.length >= 1) {
      const s = slots[slots.length - 1];
      const fig = F().buildById('merchant');
      fig.position.set(s.x, 0, s.z);
      fig.rotation.y = s.facing;
      state.group.add(fig);
      state.npcs.push({ kind: 'merchant', fight: null, figure: fig, marker: null });
    }

    env.group.add(state.group);
    refresh();
    return state.group;
  }

  /** Re-evaluate availability/markers from live storyProgress — mirrors the
   *  world-map hotspot reqs (sequential mains, boss on mains only). */
  function refresh() {
    const prog = _progress();
    if (!prog || !state.chapter) return;
    state.npcs.forEach(n => {
      if (n.marker) { n.figure.remove(n.marker); n.marker = null; }
      if (n.kind === 'fight') {
        n.cleared = A().fightCleared(n.fight, prog);
        n.locked = !A().fightAvailable(state.chapter, n.fight, prog);
        if (n.fight.type === 'npc') n.marker = _marker('bubble', '#e8e4da');
        else if (n.cleared) n.marker = _marker('✓', '#5ad06a');
        else if (n.locked) n.marker = _marker('?', '#8a8a90', true);
        else if (n.fight.type === 'sidequest') n.marker = _marker('?', '#4aa0ff');
        else n.marker = _marker('?', '#ffd234');
      } else if (n.kind === 'boss') {
        n.locked = A().bossLockedLive(state.chapter, prog);
        n.cleared = A().bossCleared(state.chapter, prog);
        if (n.cleared) n.marker = _marker('✓', '#5ad06a');
        else if (n.locked) n.marker = _marker('!', '#8a8a90', true);
        else n.marker = _marker('!', '#ff4a32');
      } else {
        n.locked = false; n.cleared = false;
        n.marker = _marker('bubble', '#ffd9a0');
      }
      n.figure.add(n.marker);
    });
  }

  function clear() {
    if (state.group) NS.disposeGroup(state.group);
    state.group = null;
    state.npcs = [];
    state.nearest = null;
    state.chapter = null;
  }

  /** Nearest interactable to (x, z) within range; updates HUD prompt. */
  function updateNearest(x, z) {
    let best = null, bestD = 2.1;
    state.npcs.forEach(n => {
      const d = Math.hypot(n.figure.position.x - x, n.figure.position.z - z);
      if (d < bestD) { best = n; bestD = d; }
    });
    state.nearest = best;
    return best;
  }

  function promptFor(n) {
    if (!n) return null;
    if (n.kind === 'merchant') return 'E — BROWSE the armory';
    if (n.kind === 'boss') {
      if (n.locked) return `${n.fight.name} — LOCKED · defeat this chapter's fights first`;
      return `E — ${n.cleared ? 'REMATCH' : 'FACE'} ${n.fight.name}`;
    }
    if (n.fight.type === 'npc') return `E — TALK · ${n.fight.name}`;
    if (n.locked) return `${n.fight.name} — not yet`;
    return `E — ${n.cleared ? 'REPLAY' : n.fight.type === 'sidequest' ? 'HELP' : 'FIGHT'} ${n.fight.name}`;
  }

  /** Trigger the nearest NPC (the 'interact' bus event lands here). */
  function interact() {
    const n = state.nearest;
    const ch = state.chapter;
    if (!n || !ch || n.locked) return false;
    if (n.kind === 'merchant') {
      NS.Inventory?.openShop(ch.id);
      return true;
    }
    if (n.kind === 'boss') {
      window.launchStoryBoss?.(ch.id);
      return true;
    }
    // Old Pip is a pure cutscene NPC in the live flow (_wmHandleHotspotClick,
    // chess_ui.html L46826) — never a chess match, never marked cleared.
    if (n.fight.id === 'ch2-npc-pip') {
      window.runCutscene?.('ch2.npc_old_pip', () => window.openStoryMode?.());
      return true;
    }
    window.launchStoryFight?.(ch.id, n.fight.id);
    return true;
  }

  return { populate, refresh, clear, updateNearest, promptFor, interact, _state: state };
});
