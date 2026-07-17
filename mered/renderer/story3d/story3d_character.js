/**
 * story3d_character.js — third-person character controller for the hubs.
 *
 * WASD / arrow keys, camera-relative movement, circle-vs-AABB collision
 * against the environment's collider list, clamped to its walkable bounds.
 * Input is ignored whenever 3D mode is off, the rig isn't in hub mode, or
 * any HTML overlay is open (dialogue, menus, cheat console, result modal…) —
 * those layers keep full keyboard ownership.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(null, null);
  else { root.Story3D.Character = factory(root.THREE, root.Story3D); }
})(typeof self !== 'undefined' ? self : this, function (THREE, NS) {
  'use strict';
  if (!THREE) return {};

  const SPEED = 4.2;          // m/s
  const RADIUS = 0.38;        // collision circle

  const state = {
    figure: null,
    env: null,
    keys: {},
    enabled: false,
  };

  // Overlays that own the keyboard while open. (Cheat console included so
  // typed cheat commands never move the character.)
  const OVERLAY_SELECTORS = [
    '#main-menu.open', '#story-overlay.open', '#story-dialogue-overlay.open',
    '#bg-overlay.open', '#merchant-overlay.open', '#story-ending-overlay.open',
    '#difficulty-select.open', '#cheat-console.open', '#result-modal.open',
    '#world-map-overlay.open', '#collection-screen.open', '#stats-screen.open',
    '#customize-screen.open', '#training-screen.open', '#chest-shop-screen.open',
    '#leaderboard-hub.open', '#lore-reader-overlay.open', '#prologue-overlay.open',
    '#s3d-travel.open', '#s3d-inv.open', '#s3d-shop.open', '#s3d-settings.open',
  ];
  function overlayOpen() {
    return !!document.querySelector(OVERLAY_SELECTORS.join(', '));
  }

  let _bound = false;
  function _bind() {
    if (_bound) return;
    _bound = true;
    window.addEventListener('keydown', e => {
      if (!state.enabled || !NS.active || overlayOpen()) return;
      state.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') {
        NS.bus.emit('interact');
      }
    });
    window.addEventListener('keyup', e => { state.keys[e.code] = false; });
    window.addEventListener('blur', () => { state.keys = {}; });
    NS.onTick(_update);
  }

  function attach(figure, env) {
    _bind();
    state.figure = figure;
    state.env = env;
    state.enabled = true;
    figure.userData.heading = figure.rotation.y;
  }

  function detach() {
    state.enabled = false;
    state.figure = null;
    state.env = null;
    state.keys = {};
  }

  function _axis() {
    const k = state.keys;
    let x = 0, z = 0;
    if (k.KeyW || k.ArrowUp) z -= 1;
    if (k.KeyS || k.ArrowDown) z += 1;
    if (k.KeyA || k.ArrowLeft) x -= 1;
    if (k.KeyD || k.ArrowRight) x += 1;
    return { x, z };
  }

  function _collide(px, pz) {
    const env = state.env;
    // Bounds clamp
    px = Math.min(env.bounds.maxX, Math.max(env.bounds.minX, px));
    pz = Math.min(env.bounds.maxZ, Math.max(env.bounds.minZ, pz));
    // AABB push-out (two passes handles corners well enough at hub speeds)
    for (let pass = 0; pass < 2; pass++) {
      for (const b of env.colliders) {
        const dx = px - b.x, dz = pz - b.z;
        const ox = b.hw + RADIUS - Math.abs(dx);
        const oz = b.hd + RADIUS - Math.abs(dz);
        if (ox > 0 && oz > 0) {
          if (ox < oz) px += (dx >= 0 ? ox : -ox);
          else pz += (dz >= 0 ? oz : -oz);
        }
      }
    }
    return { x: px, z: pz };
  }

  function _update(dt) {
    if (!state.enabled || !state.figure || !NS.active) return;
    if (NS.CameraRig.mode !== 'hub') { state.figure.userData.setWalking?.(false); return; }
    if (overlayOpen()) { state.figure.userData.setWalking?.(false); return; }
    const a = _axis();
    const fig = state.figure;
    if (!a.x && !a.z) {
      fig.userData.setWalking?.(false);
      return;
    }
    // Camera-relative direction
    const cam = NS.CameraRig.camera;
    const fwd = new THREE.Vector3();
    cam.getWorldDirection(fwd);
    fwd.y = 0; fwd.normalize();
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x).negate();
    const dir = new THREE.Vector3()
      .addScaledVector(fwd, -a.z)
      .addScaledVector(right, a.x);
    if (dir.lengthSq() < 1e-6) return;
    dir.normalize();
    const nx = fig.position.x + dir.x * SPEED * dt;
    const nz = fig.position.z + dir.z * SPEED * dt;
    const solved = _collide(nx, nz);
    fig.position.x = solved.x;
    fig.position.z = solved.z;
    // Face movement direction (shortest-arc lerp)
    const targetH = Math.atan2(dir.x, dir.z);
    let cur = fig.userData.heading ?? fig.rotation.y;
    let diff = targetH - cur;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const sens = Math.max(0.2, (NS.settings && NS.settings.sensitivity) || 1);
    cur += diff * Math.min(1, dt * 6 * sens); // turn speed — settings gear
    fig.userData.heading = cur;
    fig.rotation.y = cur;
    fig.userData.setWalking?.(true);
    NS.bus.emit('playerMoved', { x: solved.x, z: solved.z });
  }

  return { attach, detach, overlayOpen, RADIUS, _state: state };
});
