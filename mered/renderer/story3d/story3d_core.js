/**
 * story3d_core.js — Story3D namespace, renderer, loop, event bus, dispose registry.
 *
 * Loaded first of the story3d modules (after three.min.js). Creates the
 * fullscreen WebGL canvas (z-index 240 — above main-menu/world-map, below every
 * HTML overlay the game uses for dialogue/menus/results) and owns the single
 * requestAnimationFrame loop. Nothing here touches game state; lifecycle is
 * driven by story3d_patch.js.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(null);
  else { root.Story3D = factory(root.THREE); }
})(typeof self !== 'undefined' ? self : this, function (THREE) {
  'use strict';

  // ── Tiny event bus ────────────────────────────────────────────────────
  const _listeners = {};
  const bus = {
    on(evt, fn) { (_listeners[evt] = _listeners[evt] || []).push(fn); return fn; },
    off(evt, fn) {
      const a = _listeners[evt]; if (!a) return;
      const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1);
    },
    emit(evt, payload) {
      (_listeners[evt] || []).slice().forEach(fn => {
        try { fn(payload); } catch (e) { console.warn('[Story3D bus]', evt, e); }
      });
    },
  };

  // Surface async failures: cutscene/tween steps run inside promise chains,
  // and an unhandled rejection there stalls the flow with no console output
  // (Electron's console-message hook never sees rejections). Log both so the
  // smoke harness and the cheat console can show the real error.
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (e) => {
      const r = e.reason;
      console.error('[Story3D] unhandled rejection:', (r && r.stack) || r);
    });
    window.addEventListener('error', (e) => {
      console.error('[Story3D] uncaught:', e.message, e.filename + ':' + e.lineno);
    });
  }

  const NS = {
    version: 1,
    active: false,          // true while 3D story mode owns the screen
    // Player-tunable settings (persisted in localStorage via the HUD panel)
    settings: {
      sensitivity: (typeof localStorage !== 'undefined' && parseFloat(localStorage.getItem('s3d-sensitivity'))) || 1,
    },
    bus,
    renderer: null,
    scene: null,
    canvas: null,
    clock: null,
    // mode: 'hub' | 'match' | 'cutscene' | null — informational, set by owners
    mode: null,
    debug: {},
  };

  if (!THREE) return NS; // Node (unit tests) — only the namespace shell is needed.

  // ── Renderer / canvas ────────────────────────────────────────────────
  const _tickers = new Set();
  let _rafId = 0;
  let _resizeBound = false;

  function init() {
    if (NS.renderer) return NS;
    const canvas = document.createElement('canvas');
    canvas.id = 'story3d-canvas';
    canvas.style.cssText =
      'position:fixed;inset:0;z-index:240;display:none;pointer-events:none;';
    document.body.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    NS.renderer = renderer;
    NS.canvas = canvas;
    NS.scene = new THREE.Scene();
    NS.clock = new THREE.Clock(false);

    if (!_resizeBound) {
      _resizeBound = true;
      window.addEventListener('resize', () => {
        if (!NS.renderer) return;
        NS.renderer.setSize(window.innerWidth, window.innerHeight);
        bus.emit('resize', { w: window.innerWidth, h: window.innerHeight });
      });
    }
    return NS;
  }

  // Per-frame callbacks: fn(dt, elapsed). Returns an unsubscribe function.
  function onTick(fn) { _tickers.add(fn); return () => _tickers.delete(fn); }

  let _camera = null;
  function setCamera(cam) { _camera = cam; }
  function getCamera() { return _camera; }

  function _frame() {
    if (!NS.active) { _rafId = 0; return; }
    _rafId = requestAnimationFrame(_frame);
    const dt = Math.min(NS.clock.getDelta(), 0.1);
    const t = NS.clock.getElapsedTime();
    _tickers.forEach(fn => { try { fn(dt, t); } catch (e) { console.warn('[Story3D tick]', e); } });
    if (_camera) NS.renderer.render(NS.scene, _camera);
  }

  function start() {
    init();
    // Always reapply canvas state — callers (the menu scene in particular)
    // temporarily lower the z-index or disable the pointer, and start() is
    // the reset point even when the loop is already running.
    NS.canvas.style.display = 'block';
    NS.canvas.style.pointerEvents = 'auto';
    NS.canvas.style.zIndex = '240';
    document.body.classList.add('story3d-active');
    if (NS.active) return;
    NS.active = true;
    NS.clock.start();
    if (!_rafId) _rafId = requestAnimationFrame(_frame);
    bus.emit('start');
  }

  function stop() {
    if (!NS.active) return;
    NS.active = false;
    NS.mode = null;
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = 0; }
    NS.clock.stop();
    NS.canvas.style.display = 'none';
    NS.canvas.style.pointerEvents = 'none';
    document.body.classList.remove('story3d-active', 'story3d-match');
    bus.emit('stop');
  }

  // ── Dispose registry ─────────────────────────────────────────────────
  // Shared resources (geometries/materials/textures built once and reused
  // across scenes) are marked `userData.story3dShared = true` and survive
  // scene teardown. Everything else in a disposed group is freed.
  function markShared(res) {
    if (!res) return res;
    if (!res.userData) res.userData = {};
    res.userData.story3dShared = true;
    return res;
  }

  function _disposeMaterial(mat) {
    if (!mat || (mat.userData && mat.userData.story3dShared)) return;
    ['map', 'bumpMap', 'roughnessMap', 'normalMap', 'emissiveMap', 'alphaMap'].forEach(k => {
      const tex = mat[k];
      if (tex && !(tex.userData && tex.userData.story3dShared)) tex.dispose();
    });
    mat.dispose();
  }

  function disposeGroup(group) {
    if (!group) return;
    group.traverse(obj => {
      if (obj.geometry && !(obj.geometry.userData && obj.geometry.userData.story3dShared)) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(_disposeMaterial);
        else _disposeMaterial(obj.material);
      }
    });
    if (group.parent) group.parent.remove(group);
  }

  // Convenience: empty the root scene (between hub/match/cutscene stages).
  function clearScene() {
    if (!NS.scene) return;
    [...NS.scene.children].forEach(child => disposeGroup(child));
    NS.scene.fog = null;
    NS.scene.background = null;
    // environment (IBL) is cached + reassigned by applyAtmosphere, never freed
  }

  // ── Image-based lighting ──────────────────────────────────────────────
  // A prefiltered environment map gives metal real reflections and a soft,
  // grounded ambient term — the single biggest lift in perceived quality.
  // Built procedurally from each scene's own sky + ground colours (cached per
  // palette) so dark scenes stay moody and bright halls glow. PMREMGenerator
  // is core three.js, so this needs no add-ons and works on the UMD build.
  let _pmrem = null;
  const _envCache = new Map();
  function _envMap(skyColor, groundColor) {
    if (!NS.renderer || !skyColor || typeof document === 'undefined') return null;
    const grd = groundColor || skyColor;
    const key = skyColor.getHexString() + '|' + grd.getHexString();
    if (_envCache.has(key)) return _envCache.get(key);
    if (!_pmrem) { _pmrem = new THREE.PMREMGenerator(NS.renderer); _pmrem.compileEquirectangularShader(); }
    // vertical sky-dome gradient: bright zenith → sky → horizon haze → ground
    const cv = document.createElement('canvas'); cv.width = 8; cv.height = 256;
    const g = cv.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    const hex = (c) => '#' + c.getHexString();
    grad.addColorStop(0.0, hex(skyColor.clone().lerp(new THREE.Color('#ffffff'), 0.4)));
    grad.addColorStop(0.44, hex(skyColor));
    grad.addColorStop(0.52, hex(skyColor.clone().lerp(grd, 0.55)));
    grad.addColorStop(1.0, hex(grd.clone().lerp(new THREE.Color('#000000'), 0.15)));
    g.fillStyle = grad; g.fillRect(0, 0, 8, 256);
    const tex = new THREE.CanvasTexture(cv);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const env = _pmrem.fromEquirectangular(tex).texture;
    tex.dispose();
    env.userData.story3dShared = true;
    _envCache.set(key, env);
    return env;
  }

  // Apply a built environment's sky, fog, and IBL to the live scene in one call.
  function applyAtmosphere(env) {
    if (!NS.scene || !env) return;
    NS.scene.fog = env.fog || null;
    NS.scene.background = env.sky || null;
    NS.scene.environment = _envMap(env.sky, env.envGround) || NS.scene.environment;
  }

  // Eased tween helper used by camera/board/cutscene animation.
  // tween(ms, onUpdate(k), onDone) — k eased 0..1 (smoothstep).
  const _tweens = [];
  function tween(ms, onUpdate, onDone) {
    const tw = { t: 0, ms: Math.max(1, ms || 1), onUpdate, onDone, dead: false };
    _tweens.push(tw);
    return tw;
  }
  onTick(dt => {
    for (let i = _tweens.length - 1; i >= 0; i--) {
      const tw = _tweens[i];
      if (tw.dead) { _tweens.splice(i, 1); continue; }
      tw.t += dt * 1000;
      const r = Math.min(1, tw.t / tw.ms);
      const k = r * r * (3 - 2 * r); // smoothstep
      try { tw.onUpdate && tw.onUpdate(k); } catch (e) { console.warn('[Story3D tween]', e); }
      if (r >= 1) {
        _tweens.splice(i, 1);
        try { tw.onDone && tw.onDone(); } catch (e) { console.warn('[Story3D tween]', e); }
      }
    }
  });

  Object.assign(NS, {
    init, start, stop, onTick, setCamera, getCamera,
    markShared, disposeGroup, clearScene, applyAtmosphere, tween,
  });
  return NS;
});
