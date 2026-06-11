/**
 * story3d_patch.js — the ONLY story3d module that touches existing globals.
 *
 * Installs outermost wraps over the monolith's flow functions, using the
 * repo's own phase-patch convention. Every wrap is a strict pass-through when
 * 3D mode is off. Wraps install on window `load` + a settle delay so they
 * land AFTER the monolith's own runtime wraps (wireWorldMapAfterFight L47247,
 * wireFightBackground L48000, Steam wraps L49058+).
 *
 * Wrap table:
 *   enterMode        — adds the 'story3d' mode (menu card injected here)
 *   openStoryMode    — 3D: route to the walkable hub (post-fight funnel)
 *   openWorldMap     — 3D: route to the hub (post-prologue/difficulty funnel)
 *   runCutscene      — 3D: present STORY_CUTSCENES on the 3D stage
 *   startStoryGame   — orig first (rules/clocks/ribbon), then 3D match view
 *   executeMove      — always-on: emit a move event for the 3D mirror
 *   applyUciMove     — always-on: emit a move event for the 3D mirror
 *   handleUndoMove   — always-on: emit resync (takeback consumable)
 *   showResultModal  — orig first (story branching), then 3D mate emphasis
 *   openMainMenu     — tear 3D down, then orig
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  const NS = window.Story3D;
  if (!NS) { console.warn('[Story3D] core missing; patch not installed'); return; }

  let STORY3D = false;            // master flag: 3D story mode owns presentation
  Object.defineProperty(NS, 'flagOn', { get: () => STORY3D });

  function _on() {
    if (STORY3D) return;
    STORY3D = true;
    NS.start();
  }
  function _off() {
    if (!STORY3D) { NS.stop(); return; }
    STORY3D = false;
    NS.Hub.hide();
    NS.Match.end();
    NS.Cutscene.stop();
    NS.clearScene();
    NS.HUD.hideAll();
    NS.stop();
  }
  NS.enter3d = _on;
  NS.exit3d = _off;

  function _progress() { return (typeof storyProgress !== 'undefined') ? storyProgress : window.storyProgress; }

  // ── Wrap installation ────────────────────────────────────────────────
  function wrap(name, makeWrapped) {
    const orig = window[name];
    if (typeof orig !== 'function') { console.warn('[Story3D] cannot wrap missing global', name); return false; }
    const wrapped = makeWrapped(orig);
    Object.defineProperty(wrapped, 'name', { value: name + 'Story3D' });
    window[name] = wrapped;
    return true;
  }

  function installWraps() {
    // Mode entry — new 'story3d' mode rides the original 'story' path
    // (closeMainMenu + difficulty select), with the flag set first.
    wrap('enterMode', orig => function (mode) {
      if (mode === 'story3d') { _on(); return orig.call(this, 'story'); }
      if (STORY3D) _off();   // switching to 2D story / trainer / multiplayer
      return orig.apply(this, arguments);
    });

    // Post-fight + chapter-screen funnel. After an ending, the companion
    // farewell scenes (Content.FAREWELL_CUTSCENES) play one by one before
    // the hub returns — each leaver gets their own scene and dialogue.
    let farewellQueue = [];
    const toHub = () => {
      if (farewellQueue.length) {
        const next = farewellQueue.shift();
        NS.Cutscene.run(next, () => toHub());
        return;
      }
      NS.Inventory?.gear(); // ensure gear state exists before the hub reads it
      NS.Hub.show(_progress()?.currentChapter || 'ch1');
      NS.Inventory?.grantEarned?.();
    };
    wrap('openStoryMode', orig => function () {
      if (STORY3D) { toHub(); return; }
      return orig.apply(this, arguments);
    });

    // Post-prologue / difficulty-confirm funnel (the live 2D flow goes
    // difficulty → openWorldMap, see chess_ui.html L21238–21242).
    wrap('openWorldMap', orig => function () {
      if (STORY3D) { toHub(); return; }
      return orig.apply(this, arguments);
    });

    // Cutscenes on the 3D stage. The two ending scenes queue their
    // outcome's farewell chain.
    wrap('runCutscene', orig => function (id, onDone) {
      if (STORY3D) {
        if (id === 'ch5.ending_kill') farewellQueue = NS.Content.farewellIds('kill_saoirse').slice();
        else if (id === 'ch5.ending_spare') farewellQueue = NS.Content.farewellIds('spare_saoirse').slice();
        NS.Cutscene.run(id, onDone);
        return;
      }
      return orig.apply(this, arguments);
    });

    // Story match start: original does ALL the game-state work (difficulty
    // button, startGame, ribbon, noClock, consumables); we add the 3D view.
    wrap('startStoryGame', orig => function () {
      const r = orig.apply(this, arguments);
      if (STORY3D) {
        const fight = (typeof storyActiveFight !== 'undefined') ? storyActiveFight : window.storyActiveFight;
        NS.Match.begin(fight);
      }
      return r;
    });

    // Always-on move event emitters (zero behavior change; the 3D mirror
    // listens only while a match is active).
    wrap('executeMove', orig => function (fr, fc, tr, tc, flag) {
      let mv = null;
      try {
        mv = NS.Adapter.analyzeExecuteMove(
          (typeof boardPosition !== 'undefined') ? boardPosition : window.boardPosition,
          (typeof enPassantTarget !== 'undefined') ? enPassantTarget : window.enPassantTarget,
          fr, fc, tr, tc, flag
        );
      } catch (e) { /* mirror resyncs if analysis failed */ }
      const r = orig.apply(this, arguments);
      if (mv && mv.ok) NS.bus.emit('move', mv);
      return r;
    });

    wrap('applyUciMove', orig => function (uci) {
      let mv = null;
      try {
        mv = NS.Adapter.analyzeUciMove(
          (typeof boardPosition !== 'undefined') ? boardPosition : window.boardPosition,
          (typeof enPassantTarget !== 'undefined') ? enPassantTarget : window.enPassantTarget,
          uci
        );
      } catch (e) { /* mirror resyncs if analysis failed */ }
      const r = orig.apply(this, arguments);
      if (r && mv && mv.ok) NS.bus.emit('move', mv);
      return r;
    });

    // Takebacks (story consumable) — resync the mirror afterwards.
    wrap('handleUndoMove', orig => function () {
      const r = orig.apply(this, arguments);
      NS.bus.emit('resync');
      return r;
    });

    // Result: the original runs the whole story branch (skins, lives,
    // endings, outro scheduling); we add the 3D end emphasis and pay out
    // any full-set bonus in the existing consumable economy.
    wrap('showResultModal', orig => function (outcome) {
      const wasStoryFight = !!((typeof storyActiveFight !== 'undefined') ? storyActiveFight : window.storyActiveFight);
      const r = orig.apply(this, arguments);
      if (STORY3D && (outcome === 'win' || outcome === 'lose')) {
        try { NS.Match.onGameEnd(outcome); } catch (e) { console.warn('[Story3D]', e); }
        if (outcome === 'win' && wasStoryFight) {
          try {
            const g = NS.Inventory.gear();
            const prefix = g && NS.Content.fullSetPrefix(g.equipped);
            const bonus = prefix && NS.Content.SET_BONUSES[prefix];
            if (bonus) {
              const prog = _progress();
              if (!prog.consumables) prog.consumables = { hints: 0, takebacks: 0, timeExtensions: 0 };
              Object.entries(bonus.grants).forEach(([k, v]) => { prog.consumables[k] = (prog.consumables[k] || 0) + v; });
              window.ChessVisuals?.showToast?.(`${bonus.name} set bonus — ${bonus.label}`, 'right', 3600, '#c8a84b', '[M]');
            }
          } catch (e) { console.warn('[Story3D set bonus]', e); }
        }
        setTimeout(() => NS.Hub.refresh(), 50);
      }
      return r;
    });

    // Back to the main menu always exits 3D presentation.
    wrap('openMainMenu', orig => function () {
      if (STORY3D) _off();
      else NS.stop();
      return orig.apply(this, arguments);
    });
  }

  // ── Bus wiring ───────────────────────────────────────────────────────
  NS.bus.on('move', mv => { try { NS.Match.animateMove(mv); } catch (e) { console.warn('[Story3D move]', e); } });
  NS.bus.on('resync', () => { try { NS.Match.resyncFromBoard(); } catch (e) {} });

  // ── Main-menu card ───────────────────────────────────────────────────
  function injectMenuCard() {
    const cards = document.getElementById('mm-cards');
    if (!cards || document.querySelector('.mm-card[data-mode="story3d"]')) return;
    const card = document.createElement('div');
    card.className = 'mm-card primary';
    card.dataset.mode = 'story3d';
    card.innerHTML = `
      <div class="mm-card-icon">&#9819;</div>
      <div class="mm-card-title">STORY &mdash; 3D</div>
      <div class="mm-card-sub">Walk the Kingdom of Aurveld</div>
    `;
    card.onclick = () => window.enterMode('story3d');
    const storyCard = cards.querySelector('.mm-card[data-mode="story"]');
    if (storyCard && storyCard.nextSibling) cards.insertBefore(card, storyCard.nextSibling);
    else cards.appendChild(card);
  }

  // ── Install after the monolith's own runtime wraps have settled ─────
  function install() {
    let tries = 0;
    const ready = () =>
      typeof window.enterMode === 'function' &&
      typeof window.openStoryMode === 'function' &&
      typeof window.openWorldMap === 'function' &&
      typeof window.startStoryGame === 'function' &&
      typeof window.executeMove === 'function' &&
      typeof window.showResultModal === 'function' &&
      document.getElementById('mm-cards');
    const tryInstall = () => {
      if (!ready()) {
        if (++tries > 50) { console.warn('[Story3D] gave up installing wraps'); return; }
        setTimeout(tryInstall, 200);
        return;
      }
      installWraps();
      injectMenuCard();
      // Register the (additive) companion-farewell scenes so both the 3D
      // presenter and the 2D silhouette player can run them (D12).
      try {
        const reg = window.STORY_CUTSCENES;
        if (reg && NS.Content) {
          Object.entries(NS.Content.FAREWELL_CUTSCENES).forEach(([id, cs]) => {
            if (!reg[id]) reg[id] = cs;
          });
        }
      } catch (e) { console.warn('[Story3D] farewell registration failed', e); }
      window.Story3D._patched = true;
      console.log('[Story3D] patch layer installed');
    };
    tryInstall();
  }

  if (document.readyState === 'complete') setTimeout(install, 350);
  else window.addEventListener('load', () => setTimeout(install, 350));
})();
