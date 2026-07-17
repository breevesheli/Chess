/**
 * story3d_hud.js — HTML layer over the 3D canvas + scoped CSS overrides.
 *
 * Everything dialogue/menu shaped stays the game's existing HTML (spec
 * requirement); this module only adds the few 3D-specific bits — interact
 * prompt, location label, controls hint, match clock mirror, chapter-travel
 * panel — and the body.story3d-* CSS that lets existing overlays read
 * correctly above the canvas (z 240).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(null, null);
  else { root.Story3D.HUD = factory(root.THREE, root.Story3D); }
})(typeof self !== 'undefined' ? self : this, function (THREE, NS) {
  'use strict';
  if (!THREE && typeof document === 'undefined') return {};

  const A = () => NS.Adapter;
  let _built = false;
  let _clockTimer = 0;

  const CSS = `
    /* ── Story3D scoped overrides ─────────────────────────────────── */
    body.story3d-active #story-ribbon { z-index: 400; }
    body.story3d-active #story-consumable-bar { z-index: 400; position: relative; }
    /* Fight intro/outro dialogue: keep the 3D scene visible behind it */
    body.story3d-active #story-dialogue-overlay { background: rgba(4,6,10,0.45); }
    /* Cutscene shell: transparent over the 3D stage, 2D painters hidden */
    #bg-overlay.story3d-transparent { background: transparent; }
    #bg-overlay.story3d-transparent #bg-scene-canvas,
    #bg-overlay.story3d-transparent #bg-silhouette-layer { display: none; }
    /* Hide the 2D game chrome while a 3D match is on screen */
    body.story3d-match #main, body.story3d-match #topbar { visibility: hidden; }
    /* 3D main menu: the menu DOM floats over the live scene (canvas z 170) */
    body.story3d-menu #main-menu { background: radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(4,3,2,0.6) 100%); }
    body.story3d-menu #mm-scene, body.story3d-menu #mm-rays { display: none; }
    body.story3d-menu #mm-vignette { background: radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%); }
    body.story3d-menu .mm-card { background: rgba(16,13,9,0.82); backdrop-filter: blur(2px); }
    /* Difficulty select: dark-gold over the live hall instead of the
       painted wall scene (its #ds-scene canvas is hidden in 3D) */
    body.story3d-menu #difficulty-select { background: radial-gradient(ellipse at center, rgba(8,6,4,0.45) 30%, rgba(4,3,2,0.85) 100%) !important; }
    body.story3d-menu #ds-scene, body.story3d-menu #ds-vignette { display: none !important; }
    body.story3d-menu #ds-title { color: #e8d8a8 !important; font-family: Cinzel, serif !important; letter-spacing: 6px; text-shadow: 0 2px 18px rgba(0,0,0,0.9), 0 0 30px rgba(200,168,75,0.3); }
    body.story3d-menu #ds-sub { color: #8a8270 !important; letter-spacing: 2px; }
    body.story3d-menu .ds-card { background: rgba(22,19,13,0.92) !important; border: 1px solid #3a3424 !important; color: #e0d6b8 !important; border-radius: 8px !important; box-shadow: 0 6px 24px rgba(0,0,0,0.5); }
    body.story3d-menu .ds-card h3 { color: #c8a84b !important; font-family: Cinzel, serif !important; }
    body.story3d-menu .ds-card .lives { color: #ffd24a !important; }
    body.story3d-menu .ds-card .desc { color: #8a8270 !important; }
    body.story3d-menu .ds-card.active { border-color: #ffcc00 !important; box-shadow: 0 0 24px rgba(255,204,0,0.25) !important; }
    body.story3d-menu .ds-card.ironclad.active { border-color: #ff5a3c !important; }
    body.story3d-menu #ds-confirm { background: #2a2316 !important; color: #e8d8a8 !important; border: 1px solid #c8a84b !important; font-family: Cinzel, serif !important; letter-spacing: 2px; }

    /* ── HUD elements ─────────────────────────────────────────────── */
    #s3d-location { position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
      font: 14px 'Cinzel', serif; letter-spacing: 3px; color: #e8d8a8;
      background: rgba(12,10,6,0.55); border: 1px solid rgba(200,168,75,0.3);
      padding: 7px 18px; border-radius: 3px; z-index: 245; pointer-events: none; display: none; }
    #s3d-prompt { position: fixed; bottom: 11%; left: 50%; transform: translateX(-50%);
      font: 14px Inter, sans-serif; color: #f0e8d0; background: rgba(14,12,8,0.82);
      border: 1px solid #c8a84b; padding: 9px 20px; border-radius: 4px;
      z-index: 245; pointer-events: none; display: none; letter-spacing: 0.5px; }
    #s3d-hint { position: fixed; bottom: 18px; left: 18px; font: 12px Inter, sans-serif;
      color: #9a9282; background: rgba(10,10,8,0.6); padding: 8px 12px; border-radius: 4px;
      z-index: 245; pointer-events: none; display: none; line-height: 1.6;
      transition: opacity 1.2s; }
    #s3d-clocks { position: fixed; top: 16px; right: 18px; display: none; z-index: 245;
      font: 14px 'Cinzel', serif; color: #e0d6b8; background: rgba(12,10,6,0.6);
      border: 1px solid rgba(200,168,75,0.25); border-radius: 4px; padding: 8px 14px;
      pointer-events: none; text-align: right; }
    #s3d-clocks .lives { color: #ff7a6a; font-family: Inter, sans-serif; font-size: 12px; }

    /* Travel panel — matches the game's dark-gold dialog styling */
    #s3d-travel { position: fixed; inset: 0; z-index: 850; display: none;
      background: rgba(4,4,6,0.72); align-items: center; justify-content: center; }
    #s3d-travel.open { display: flex; }
    #s3d-travel .panel { background: #16130d; border: 1px solid #3a3424; border-radius: 8px;
      min-width: 460px; max-width: 560px; padding: 26px 30px; color: #e0d6b8; }
    #s3d-travel h3 { margin: 0 0 4px; font: 22px 'Cinzel', serif; color: #c8a84b; letter-spacing: 2px; }
    #s3d-travel .sub { color: #8a8270; font: 12px Inter, sans-serif; margin-bottom: 14px; }
    #s3d-travel .ch { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
      background: #1d1812; border: 1px solid #3a3424; color: #e0d6b8; border-radius: 5px;
      padding: 10px 14px; margin-bottom: 8px; cursor: pointer; font: 14px 'Cinzel', serif; }
    #s3d-travel .ch:hover:not(.locked) { border-color: #c8a84b; background: #262017; }
    #s3d-travel .ch.locked { opacity: 0.35; cursor: not-allowed; }
    #s3d-travel .ch.active { border-color: #ffcc00; }
    #s3d-travel .ch small { font: 11px Inter, sans-serif; color: #8a8270; margin-left: auto; }
    #s3d-travel .dline { display: flex; gap: 8px; margin: 14px 0 6px; }
    #s3d-travel .dbtn { flex: 1; background: #1d1812; border: 1px solid #3a3424; color: #b0a890;
      border-radius: 4px; padding: 7px 4px; cursor: pointer; font: 12px Inter, sans-serif; }
    #s3d-travel .dbtn.active { border-color: #ffcc00; color: #ffe9a0; }
    #s3d-travel .dbtn.ironclad.active { border-color: #ff5a3c; color: #ffb0a0; }
    #s3d-travel .close { margin-top: 12px; width: 100%; background: #2a2316; color: #e8d8a8;
      border: 1px solid #c8a84b55; border-radius: 4px; padding: 9px; cursor: pointer;
      font: 13px 'Cinzel', serif; letter-spacing: 2px; }
  `;

  function _build() {
    if (_built) return;
    _built = true;
    const style = document.createElement('style');
    style.id = 's3d-style';
    style.textContent = CSS;
    document.head.appendChild(style);
    const make = (id, html) => {
      const el = document.createElement('div');
      el.id = id;
      if (html) el.innerHTML = html;
      document.body.appendChild(el);
      return el;
    };
    make('s3d-location');
    make('s3d-prompt');
    make('s3d-hint', 'WASD / arrows — walk &nbsp;·&nbsp; E — interact &nbsp;·&nbsp; drag — look &nbsp;·&nbsp; wheel — zoom');
    make('s3d-clocks', '<div id="s3d-clock-line">--:-- · --:--</div><div class="lives" id="s3d-lives"></div>');
    const travel = make('s3d-travel', '<div class="panel"><h3>TRAVEL</h3><div class="sub">Kingdom of Aurveld — choose your road</div><div id="s3d-travel-list"></div><div class="sub" style="margin-top:10px">Difficulty</div><div class="dline" id="s3d-travel-diff"></div><button class="close" id="s3d-travel-close">RETURN</button></div>');
    travel.addEventListener('click', e => { if (e.target === travel) closeTravelPanel(); });
    travel.querySelector('#s3d-travel-close').onclick = closeTravelPanel;
  }

  // ── Simple elements ──────────────────────────────────────────────────
  function setLocation(text) {
    _build();
    const el = document.getElementById('s3d-location');
    el.textContent = text || '';
    el.style.display = text ? 'block' : 'none';
  }
  function showPrompt(text) {
    _build();
    const el = document.getElementById('s3d-prompt');
    el.textContent = text;
    el.style.display = 'block';
  }
  function hidePrompt() {
    const el = document.getElementById('s3d-prompt');
    if (el) el.style.display = 'none';
  }
  let _hintTimer = 0;
  function showControlsHint() {
    _build();
    const el = document.getElementById('s3d-hint');
    el.style.display = 'block';
    el.style.opacity = '1';
    clearTimeout(_hintTimer);
    _hintTimer = setTimeout(() => { el.style.opacity = '0'; }, 7000);
  }
  function hideAll() {
    ['s3d-location', 's3d-prompt', 's3d-hint', 's3d-clocks', 's3d-mapdiff', 's3d-title'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    closeTravelPanel();
    clearInterval(_clockTimer);
  }

  // ── Map difficulty strip (docked while the world map is open) ────────
  function showMapDifficulty() {
    _build();
    let el = document.getElementById('s3d-mapdiff');
    if (!el) {
      el = document.createElement('div');
      el.id = 's3d-mapdiff';
      el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:245;display:flex;gap:8px;background:rgba(14,12,8,0.8);border:1px solid #3a3424;border-radius:6px;padding:8px 10px;';
      document.body.appendChild(el);
    }
    const prog = _progress();
    el.innerHTML = '';
    _difficulties().forEach(d => {
      const b = document.createElement('button');
      b.className = 'dbtn' + (d.id === prog.difficulty ? ' active' : '') + (d.id === 'ironclad' ? ' ironclad' : '');
      b.style.cssText = 'min-width:84px;background:#1d1812;border:1px solid #3a3424;color:#b0a890;border-radius:4px;padding:7px 8px;cursor:pointer;font:12px Inter,sans-serif;';
      if (d.id === prog.difficulty) { b.style.borderColor = '#ffcc00'; b.style.color = '#ffe9a0'; }
      b.textContent = d.label;
      b.title = d.desc;
      b.onclick = () => {
        prog.difficulty = d.id;
        prog.lives = d.lives;
        _save();
        showMapDifficulty();
      };
      el.appendChild(b);
    });
    el.style.display = 'flex';
  }
  function hideMapDifficulty() {
    const el = document.getElementById('s3d-mapdiff');
    if (el) el.style.display = 'none';
  }

  // ── Cinematic title card (boss entrances) ────────────────────────────
  let _titleTimer = 0;
  function showTitleCard(text, sub) {
    _build();
    let el = document.getElementById('s3d-title');
    if (!el) {
      el = document.createElement('div');
      el.id = 's3d-title';
      el.style.cssText = 'position:fixed;top:34%;left:0;right:0;text-align:center;z-index:246;pointer-events:none;opacity:0;transition:opacity 900ms;';
      el.innerHTML = '<div id="s3d-title-main" style="font:600 46px Cinzel,serif;color:#e8d8a8;letter-spacing:10px;text-shadow:0 2px 18px rgba(0,0,0,0.9),0 0 40px rgba(200,168,75,0.35);"></div>' +
        '<div id="s3d-title-sub" style="font:13px Inter,sans-serif;color:#8a8270;letter-spacing:5px;margin-top:8px;"></div>';
      document.body.appendChild(el);
    }
    document.getElementById('s3d-title-main').textContent = text;
    document.getElementById('s3d-title-sub').textContent = sub || '';
    el.style.display = 'block';
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    clearTimeout(_titleTimer);
    _titleTimer = setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => { el.style.display = 'none'; }, 1000);
    }, 2600);
  }

  // ── Match HUD: mirror the hidden 2D clocks + lives ───────────────────
  function showMatchHud() {
    _build();
    const el = document.getElementById('s3d-clocks');
    el.style.display = 'block';
    clearInterval(_clockTimer);
    _clockTimer = setInterval(() => {
      const p = document.getElementById('player-clock')?.textContent || '--:--';
      const o = document.getElementById('opp-clock')?.textContent || '--:--';
      document.getElementById('s3d-clock-line').textContent = `${o}  ·  YOU ${p}`;
      const prog = (typeof storyProgress !== 'undefined') ? storyProgress : window.storyProgress;
      const lives = prog?.lives;
      document.getElementById('s3d-lives').textContent =
        lives === Infinity || lives == null ? '' : '♥'.repeat(Math.max(0, lives));
    }, 500);
  }
  function hideMatchHud() {
    const el = document.getElementById('s3d-clocks');
    if (el) el.style.display = 'none';
    clearInterval(_clockTimer);
  }

  // ── Travel panel ─────────────────────────────────────────────────────
  function _chapters() { return (typeof STORY_CHAPTERS !== 'undefined') ? STORY_CHAPTERS : window.STORY_CHAPTERS; }
  function _difficulties() { return (typeof STORY_DIFFICULTIES !== 'undefined') ? STORY_DIFFICULTIES : window.STORY_DIFFICULTIES; }
  function _progress() { return (typeof storyProgress !== 'undefined') ? storyProgress : window.storyProgress; }
  function _save() { (typeof debouncedSave === 'function' ? debouncedSave : window.debouncedSave)?.(); }

  function openTravelPanel(currentChapterId) {
    _build();
    const chapters = _chapters();
    const prog = _progress();
    const unlockedUpTo = A().chapterUnlockIndex(chapters, prog);
    const list = document.getElementById('s3d-travel-list');
    list.innerHTML = '';
    chapters.forEach((ch, i) => {
      const locked = i > unlockedUpTo;
      const btn = document.createElement('button');
      btn.className = 'ch' + (locked ? ' locked' : '') + (ch.id === currentChapterId ? ' active' : '');
      btn.innerHTML = `<span>CH ${ch.num} — ${ch.title}</span><small>${locked ? 'LOCKED' : (A().bossCleared(ch, prog) ? 'CLEARED' : '')}</small>`;
      if (!locked) btn.onclick = () => { closeTravelPanel(); NS.Hub.travelTo(ch.id); };
      list.appendChild(btn);
    });
    // Difficulty — mirrors buildStoryDifficultyBar's onclick (L48256–48262)
    const dline = document.getElementById('s3d-travel-diff');
    dline.innerHTML = '';
    _difficulties().forEach(d => {
      const b = document.createElement('button');
      b.className = 'dbtn' + (d.id === prog.difficulty ? ' active' : '') + (d.id === 'ironclad' ? ' ironclad' : '');
      b.textContent = d.label;
      b.title = d.desc;
      b.onclick = () => {
        prog.difficulty = d.id;
        prog.lives = d.lives;
        _save();
        openTravelPanel(currentChapterId);
      };
      dline.appendChild(b);
    });
    document.getElementById('s3d-travel').classList.add('open');
  }
  function closeTravelPanel() {
    document.getElementById('s3d-travel')?.classList.remove('open');
  }

  // ── Settings (gear button, look sensitivity) ─────────────────────────
  function _ensureSettingsDom() {
    if (document.getElementById('s3d-gear')) return;
    const css = document.createElement('style');
    css.textContent = `
      #s3d-gear { position: fixed; top: 14px; left: 14px; z-index: 247; display: none;
        width: 34px; height: 34px; border-radius: 6px; cursor: pointer; font-size: 17px;
        background: rgba(14,12,8,0.75); border: 1px solid #3a3424; color: #c8a84b; }
      #s3d-gear:hover { border-color: #c8a84b; }
      body.story3d-active #s3d-gear, body.story3d-menu #s3d-gear { display: block; }
      body.s3d-photo #s3d-gear { display: none !important; }
      #s3d-settings { position: fixed; inset: 0; z-index: 880; display: none;
        background: rgba(4,4,6,0.72); align-items: center; justify-content: center; }
      #s3d-settings.open { display: flex; }
      #s3d-settings .panel { background: #16130d; border: 1px solid #3a3424; border-radius: 8px;
        width: 420px; padding: 24px 28px; color: #e0d6b8; }
      #s3d-settings h3 { margin: 0 0 14px; font: 22px 'Cinzel', serif; color: #c8a84b; letter-spacing: 2px; }
      #s3d-settings label { font: 13px Inter, sans-serif; color: #b0a890; display: block; margin-bottom: 6px; }
      #s3d-settings input[type=range] { width: 100%; accent-color: #c8a84b; }
      #s3d-settings .val { float: right; color: #ffd24a; }
      #s3d-settings .close { margin-top: 16px; width: 100%; background: #2a2316; color: #e8d8a8;
        border: 1px solid #c8a84b55; border-radius: 4px; padding: 9px; cursor: pointer;
        font: 13px 'Cinzel', serif; letter-spacing: 2px; }
    `;
    document.head.appendChild(css);
    const gear = document.createElement('button');
    gear.id = 's3d-gear';
    gear.title = 'Settings';
    gear.innerHTML = '&#9881;';
    gear.onclick = openSettings;
    document.body.appendChild(gear);
    const panel = document.createElement('div');
    panel.id = 's3d-settings';
    panel.innerHTML = `<div class="panel">
      <h3>SETTINGS</h3>
      <label>Turn speed <span class="val" id="s3d-sens-val"></span></label>
      <input type="range" id="s3d-sens" min="20" max="200" step="10">
      <button class="close" id="s3d-settings-close">DONE</button>
    </div>`;
    panel.addEventListener('click', e => { if (e.target === panel) closeSettings(); });
    document.body.appendChild(panel);
    panel.querySelector('#s3d-settings-close').onclick = closeSettings;
    const slider = panel.querySelector('#s3d-sens');
    slider.oninput = () => {
      const v = parseInt(slider.value, 10) / 100;
      NS.settings.sensitivity = v;
      try { localStorage.setItem('s3d-sensitivity', String(v)); } catch (e) {}
      document.getElementById('s3d-sens-val').textContent = v.toFixed(1) + 'x';
    };
  }
  function openSettings() {
    _build();
    _ensureSettingsDom();
    const v = NS.settings.sensitivity || 1;
    const slider = document.getElementById('s3d-sens');
    slider.value = String(Math.round(v * 100));
    document.getElementById('s3d-sens-val').textContent = v.toFixed(1) + 'x';
    document.getElementById('s3d-settings').classList.add('open');
  }
  function closeSettings() {
    document.getElementById('s3d-settings')?.classList.remove('open');
  }
  if (typeof window !== 'undefined') {
    // Build the stylesheet + settings gear up front — the menu and the
    // difficulty screen need the scoped overrides before any HUD call.
    window.addEventListener('load', () => setTimeout(() => { _build(); _ensureSettingsDom(); }, 400));
  }

  // ── Photo mode: P hides every HUD layer for a clean screenshot ───────
  (function bindPhotoMode() {
    if (typeof window === 'undefined') return;
    let photoCss = false;
    window.addEventListener('keydown', e => {
      if (e.code !== 'KeyP' || !NS.active || NS.Character.overlayOpen()) return;
      if (!photoCss) {
        photoCss = true;
        const s = document.createElement('style');
        s.textContent = 'body.s3d-photo #s3d-location, body.s3d-photo #s3d-prompt, body.s3d-photo #s3d-hint, body.s3d-photo #s3d-clocks, body.s3d-photo #s3d-mapdiff, body.s3d-photo #story-ribbon { display: none !important; }';
        document.head.appendChild(s);
      }
      document.body.classList.toggle('s3d-photo');
    });
  })();

  return {
    setLocation, showPrompt, hidePrompt, showControlsHint, hideAll,
    showMatchHud, hideMatchHud, openTravelPanel, closeTravelPanel,
    showMapDifficulty, hideMapDifficulty, showTitleCard,
    openSettings, closeSettings,
  };
});
