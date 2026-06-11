/**
 * story3d_hub.js — the walkable chapter hub.
 *
 * show(chapterId) builds the chapter's environment, drops in the player
 * character and the NPCs, and hands camera + input over to hub mode.
 * Interacting with an NPC routes into the existing launchStoryFight /
 * launchStoryBoss flow; everything that happens after (cutscene, dialogue,
 * match, results) returns here through the wrapped openStoryMode /
 * openWorldMap funnel. A signpost near the spawn opens the chapter-travel
 * panel (HUD), mirroring the 2D chapter list's unlock rules via
 * computeChapterUnlock().
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(null, null);
  else { root.Story3D.Hub = factory(root.THREE, root.Story3D); }
})(typeof self !== 'undefined' ? self : this, function (THREE, NS) {
  'use strict';
  if (!THREE) return {};

  const state = {
    visible: false,
    chapterId: null,
    env: null,
    player: null,
    animators: [],
    untick: null,
    signpost: null,
    nearSignpost: false,
  };

  function _chapters() { return (typeof STORY_CHAPTERS !== 'undefined') ? STORY_CHAPTERS : window.STORY_CHAPTERS; }
  function _progress() { return (typeof storyProgress !== 'undefined') ? storyProgress : window.storyProgress; }

  function show(chapterId) {
    NS.init();
    hide();                    // tear down a previous hub
    NS.Match?.end();           // and any match…
    NS.Cutscene?.stop();       // …or cutscene presentation
    NS.clearScene();
    const chapters = _chapters();
    const chapter = chapters.find(c => c.id === chapterId) || chapters[0];
    state.chapterId = chapter.id;
    NS.mode = 'hub';

    const env = NS.Environments.buildHub(chapter.id);
    state.env = env;
    NS.scene.add(env.group);
    NS.scene.fog = env.fog || null;
    NS.scene.background = env.sky || null;

    // Player character — normalized to 1.0 world scale (the CS table's 1.2
    // is a 2D silhouette size, too imposing for the follow camera).
    const playerDef = NS.Figures.defFor('player');
    const player = NS.Figures.buildById('player', { scale: 1 / (playerDef.scale || 1) });
    player.position.set(env.spawn.x, 0, env.spawn.z);
    player.rotation.y = env.spawn.facing;
    player.userData.heading = env.spawn.facing;
    NS.scene.add(player);
    state.player = player;

    // Travel signpost near the spawn
    const sign = _buildSignpost();
    sign.position.set(env.spawn.x + 2.2, 0, env.spawn.z + 0.4);
    NS.scene.add(sign);
    state.signpost = sign;
    env.colliders.push({ x: sign.position.x, z: sign.position.z, hw: 0.3, hd: 0.3 });

    // NPCs
    NS.NPCs.populate(env, chapter);

    // Companions + side activities (tavern riddler, drill post, lore pages)
    _spawnExtras(env, chapter);

    // Animator pump: env props + player + NPC figures
    state.animators = env.animators.slice();
    player.traverse(o => { if (o.userData.animators) state.animators.push(...o.userData.animators); });
    NS.NPCs._state.group?.traverse(o => { if (o.userData.animators) state.animators.push(...o.userData.animators); });
    state.untick = NS.onTick(_tick);

    NS.Character.attach(player, env);
    NS.CameraRig.setHub(player, env);

    NS.HUD.setLocation(`CHAPTER ${chapter.num} — ${chapter.title}`);
    NS.HUD.showControlsHint();
    state.visible = true;
    NS.bus.emit('hubShown', { chapterId: chapter.id });
  }

  function hide() {
    if (state.untick) { state.untick(); state.untick = null; }
    NS.Character.detach();
    NS.NPCs.clear();
    if (state.env) { NS.disposeGroup(state.env.group); state.env = null; }
    if (state.player) { NS.disposeGroup(state.player); state.player = null; }
    if (state.signpost) { NS.disposeGroup(state.signpost); state.signpost = null; }
    NS.HUD.hidePrompt();
    state.animators = [];
    state.extras = [];
    state.visible = false;
  }

  // ── Companions + side activities ─────────────────────────────────────
  function _bubble(color) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({
      map: NS.Textures.markerSprite('bubble', color || '#e8e4da'),
      transparent: true, depthWrite: false,
    }));
    m.scale.setScalar(0.5);
    m.position.y = 2.1;
    return m;
  }

  function _spawnExtras(env, chapter) {
    state.extras = [];
    const C = NS.Content;
    const prog = _progress();
    const spots = C.HUB_SPOTS[chapter.id] || C.HUB_SPOTS.ch1;
    const hold = new THREE.Group();
    env.group.add(hold);

    // Companions — the party, minus anyone the ending cost you
    const present = C.companionsFor(chapter.id, prog);
    present.slice(0, spots.companions.length).forEach((id, i) => {
      const [x, z] = spots.companions[i];
      const fig = NS.Figures.buildById(id);
      fig.position.set(x, 0, z);
      fig.rotation.y = Math.atan2(-x, -z); // face the centre
      fig.add(_bubble('#bcd0a8'));
      hold.add(fig);
      env.colliders.push({ x, z, hw: 0.35, hd: 0.35 });
      state.extras.push({
        x, z, obj: fig,
        prompt: `E — TALK · ${C.COMPANION_LINES[id] ? id.charAt(0).toUpperCase() + id.slice(1) : id}`,
        action: () => {
          const line = C.companionLine(id, _progress());
          if (line) window.playStoryDialogue?.([line], () => {});
        },
      });
    });

    // Tavern riddler — wagers coin against consumables
    {
      const [x, z] = spots.patron;
      const fig = NS.Figures.buildById('civilian');
      fig.position.set(x, 0, z);
      fig.rotation.y = Math.atan2(-x, -z);
      fig.add(_bubble('#ffd9a0'));
      hold.add(fig);
      env.colliders.push({ x, z, hw: 0.35, hd: 0.35 });
      state.extras.push({ x, z, obj: fig, prompt: 'E — A PATRON wagers 50c on a riddle', action: _riddleWager });
    }

    // Drill post — five solid hits pay a time extension (once per visit)
    {
      const [x, z] = spots.dummy;
      const post = new THREE.Group();
      const trunk = new THREE.Mesh(NS.Props.CYL(), NS.Materials.get('wood', '#1a1410'));
      trunk.scale.set(0.13, 1.7, 0.13); trunk.position.y = 0.85; trunk.castShadow = true;
      post.add(trunk);
      const head = new THREE.Mesh(NS.Props.SPHERE(), NS.Materials.get('fabric', '#3a3026'));
      head.scale.setScalar(0.34); head.position.y = 1.8; head.castShadow = true;
      post.add(head);
      post.position.set(x, 0, z);
      hold.add(post);
      env.colliders.push({ x, z, hw: 0.3, hd: 0.3 });
      let hits = 0, paid = false;
      state.extras.push({
        x, z, obj: post,
        prompt: 'E — DRILL at the practice post',
        action: () => {
          hits++;
          NS.tween(220, k => { post.rotation.x = Math.sin(k * Math.PI) * 0.35; });
          if (hits >= 5 && !paid) {
            paid = true;
            if (!prog.consumables) prog.consumables = { hints: 0, takebacks: 0, timeExtensions: 0 };
            prog.consumables.timeExtensions = (prog.consumables.timeExtensions || 0) + 1;
            (typeof debouncedSave === 'function' ? debouncedSave : window.debouncedSave)?.();
            window.ChessVisuals?.showToast?.('Drill complete — +1 time extension', 'right', 3000, '#c8a84b', '[M]');
          }
        },
      });
    }

    // Hidden lore pages — glowing parchment, collected once, ever
    if (!prog.pagesFound) prog.pagesFound = [];
    (C.LORE_PAGES[chapter.id] || []).forEach((page, i) => {
      if (prog.pagesFound.includes(page.id)) return;
      const [x, z] = spots.pages[i] || spots.pages[0];
      const sheet = new THREE.Mesh(
        NS.Props.geo('hub-page', () => new THREE.PlaneGeometry(0.3, 0.4)),
        NS.Materials.flat('#e8dcc0', { roughness: 0.6, emissive: '#c8a860', emissiveIntensity: 0.7 })
      );
      sheet.position.set(x, 0.5, z);
      hold.add(sheet);
      sheet.userData.animators = [(t) => { sheet.position.y = 0.5 + 0.08 * Math.sin(t * 2.2 + i); sheet.rotation.y = t * 0.9; }];
      const entry = {
        x, z, obj: sheet,
        prompt: 'E — TAKE the loose page',
        action: () => {
          prog.pagesFound.push(page.id);
          (typeof debouncedSave === 'function' ? debouncedSave : window.debouncedSave)?.();
          window.showLoreParchment?.(page.title, page.body);
          const total = Object.values(C.LORE_PAGES).flat().length;
          window.ChessVisuals?.showToast?.(`Page found (${prog.pagesFound.length}/${total})`, 'right', 3000, '#c8a84b', '[M]');
          hold.remove(sheet);
          state.extras = state.extras.filter(e => e !== entry);
        },
      };
      state.extras.push(entry);
    });
  }

  function _riddleWager() {
    const C = NS.Content;
    const prog = _progress();
    const r = C.RIDDLES[Math.floor(Math.random() * C.RIDDLES.length)];
    const spend = (typeof spendStoryCoins === 'function' ? spendStoryCoins : window.spendStoryCoins);
    window.playStoryDialogue?.([
      {
        speaker: 'A PATRON', title: 'A wager',
        text: 'Fifty coin says you cannot answer a board riddle. Winner drinks well — and I pay in favours, not coin.',
        choices: [
          { text: 'Take the wager. (50c)', effect: () => {
            if (!spend || !spend(50)) {
              window.ChessVisuals?.showToast?.('Not enough coin', 'right', 2500, '#ff7a6a');
              return;
            }
            setTimeout(() => {
              window.playStoryDialogue?.([
                {
                  speaker: 'A PATRON', title: 'The riddle',
                  text: r.q,
                  choices: r.a.map((ans, i) => ({
                    text: ans,
                    effect: () => {
                      if (!prog.consumables) prog.consumables = { hints: 0, takebacks: 0, timeExtensions: 0 };
                      if (i === r.correct) {
                        prog.consumables.hints = (prog.consumables.hints || 0) + 1;
                        prog.consumables.takebacks = (prog.consumables.takebacks || 0) + 1;
                        window.ChessVisuals?.showToast?.('Won the wager — +1 hint, +1 takeback', 'right', 3200, '#c8a84b', '[M]');
                      } else {
                        window.ChessVisuals?.showToast?.('The table laughs. The coin is gone.', 'right', 3200, '#ff7a6a');
                      }
                      (typeof debouncedSave === 'function' ? debouncedSave : window.debouncedSave)?.();
                    },
                  })),
                },
              ], () => {});
            }, 150);
          } },
          { text: 'Walk away.', effect: () => {} },
        ],
      },
    ], () => {});
  }

  function refresh() {
    if (!state.visible) return;
    NS.NPCs.refresh();
  }

  /** Rebuild the player figure in place (equip changes, coronation). */
  function refreshPlayer() {
    if (!state.visible || !state.player || !state.env) return;
    const old = state.player;
    const pos = old.position.clone();
    const heading = old.userData.heading ?? old.rotation.y;
    NS.disposeGroup(old);
    const playerDef = NS.Figures.defFor('player');
    const player = NS.Figures.buildById('player', { scale: 1 / (playerDef.scale || 1) });
    player.position.copy(pos);
    player.rotation.y = heading;
    player.userData.heading = heading;
    NS.scene.add(player);
    state.player = player;
    NS.Character.attach(player, state.env);
    NS.CameraRig.setHub(player, state.env);
    // Re-collect animators so the new figure animates and stale ones drop.
    state.animators = state.env.animators.slice();
    player.traverse(o => { if (o.userData.animators) state.animators.push(...o.userData.animators); });
    NS.NPCs._state.group?.traverse(o => { if (o.userData.animators) state.animators.push(...o.userData.animators); });
    if (state.signpost) state.animators.push(...(state.signpost.userData.animators || []));
  }

  function _buildSignpost() {
    const g = new THREE.Group();
    const wood = NS.Materials.get('wood', '#4a3a24');
    const post = new THREE.Mesh(NS.Props.CYL(), wood);
    post.scale.set(0.08, 2.2, 0.08); post.position.y = 1.1; post.castShadow = true;
    g.add(post);
    [1.55, 1.85].forEach((y, i) => {
      const arm = new THREE.Mesh(NS.Props.BOX(), wood);
      arm.scale.set(0.9, 0.18, 0.05);
      arm.position.set(0.3, y, 0);
      arm.rotation.y = i ? -0.4 : 0.3;
      arm.castShadow = true;
      g.add(arm);
    });
    const m = _marker();
    g.add(m);
    g.userData.animators = m.userData.animators;
    g.userData.isSignpost = true;
    return g;
  }
  function _marker() {
    const m = new THREE.Mesh(
      NS.Props.geo('npc-marker', () => new THREE.OctahedronGeometry(0.09, 0)),
      NS.Materials.glow('#c8a84b', 1)
    );
    m.position.y = 2.3;
    m.castShadow = false;
    m.userData.animators = [(t) => { m.rotation.y = t * 1.6; }];
    return m;
  }

  function _tick(dt, t) {
    state.animators.forEach(fn => fn(t, dt));
    if (!state.player || !state.visible) return;
    if (NS.Character.overlayOpen() || NS.Inventory?.isOpen()) { NS.HUD.hidePrompt(); return; }
    const px = state.player.position.x, pz = state.player.position.z;
    const signD = state.signpost ? Math.hypot(state.signpost.position.x - px, state.signpost.position.z - pz) : 99;
    const near = NS.NPCs.updateNearest(px, pz);
    const nearD = near ? Math.hypot(near.figure.position.x - px, near.figure.position.z - pz) : 99;
    // Nearest side-activity / companion
    let extra = null, extraD = 2.0;
    (state.extras || []).forEach(e => {
      const d = Math.hypot(e.x - px, e.z - pz);
      if (d < extraD) { extra = e; extraD = d; }
    });
    state.nearSignpost = false;
    state.nearExtra = null;
    if (signD < 1.8 && signD <= nearD && signD <= extraD) {
      state.nearSignpost = true;
      NS.HUD.showPrompt('E — MAP · travel the kingdom  (M)');
    } else if (extra && extraD <= nearD) {
      state.nearExtra = extra;
      NS.HUD.showPrompt(extra.prompt);
    } else {
      const txt = NS.NPCs.promptFor(near);
      if (txt) NS.HUD.showPrompt(txt); else NS.HUD.hidePrompt();
    }
  }

  // Interactions
  (function bindInteract() {
    if (typeof window === 'undefined') return;
    // Bound once at module load; bus exists because core loads first.
    NS.bus.on('interact', () => {
      if (!state.visible || NS.Character.overlayOpen()) return;
      if (state.nearSignpost) { NS.WorldMap?.show(state.chapterId); return; }
      if (state.nearExtra) { try { state.nearExtra.action(); } catch (e) { console.warn('[Story3D activity]', e); } return; }
      NS.NPCs.interact();
    });
  })();

  /** Travel to another (unlocked) chapter — mirrors the 2D card onclick. */
  function travelTo(chapterId) {
    const prog = _progress();
    prog.currentChapter = chapterId;
    if (typeof debouncedSave === 'function') debouncedSave();
    else window.debouncedSave?.();
    show(chapterId);
  }

  return { show, hide, refresh, refreshPlayer, travelTo, _state: state };
});
