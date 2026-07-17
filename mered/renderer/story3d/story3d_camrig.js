/**
 * story3d_camrig.js — the one PerspectiveCamera and its three modes.
 *
 *  hub       — third-person follow: behind the player character, damped.
 *  match     — top-down view of the board, tilted toward the player's side
 *              (the user's requested match camera), drag-orbit + wheel zoom
 *              clamped around that pose.
 *  cinematic — tweened framings for cutscenes and transitions.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(null, null);
  else { root.Story3D.CameraRig = factory(root.THREE, root.Story3D); }
})(typeof self !== 'undefined' ? self : this, function (THREE, NS) {
  'use strict';
  if (!THREE) return {};

  const state = {
    mode: 'idle',          // idle | hub | match | cinematic
    camera: null,
    // hub
    target: null,          // followed object (player group)
    hubDist: 5.6,
    hubHeight: 3.2,
    hubYaw: 0,             // extra yaw offset (mouse drag)
    // match
    boardCenter: new THREE.Vector3(),
    matchYaw: 0,           // 0 = straight from white's side
    matchPitch: 1.05,      // ~60° down-tilt: top-down, leaning to player side
    matchDist: 4.2,
    // shake / emphasis
    shake: 0,
    look: new THREE.Vector3(),
  };

  let _drag = null;

  function init() {
    if (state.camera) return state.camera;
    state.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    NS.setCamera(state.camera);
    NS.bus.on('resize', ({ w, h }) => {
      state.camera.aspect = w / h;
      state.camera.updateProjectionMatrix();
    });
    NS.onTick(_update);

    // Drag-orbit + wheel zoom — only meaningful in hub/match modes.
    const canvas = NS.canvas || (NS.init(), NS.canvas);
    canvas.addEventListener('mousedown', e => {
      if (!NS.active) return;
      _drag = { x: e.clientX, y: e.clientY, moved: false };
    });
    window.addEventListener('mousemove', e => {
      if (!_drag || !NS.active) return;
      const dx = e.clientX - _drag.x, dy = e.clientY - _drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) _drag.moved = true;
      if (!_drag.moved) return;
      const sens = (NS.settings && NS.settings.sensitivity) || 1;
      if (state.mode === 'match') {
        state.matchYaw = THREE.MathUtils.clamp(state.matchYaw - dx * 0.005 * sens, -1.1, 1.1);
        state.matchPitch = THREE.MathUtils.clamp(state.matchPitch - dy * 0.004 * sens, 0.55, 1.38);
      } else if (state.mode === 'hub') {
        state.hubYaw = THREE.MathUtils.clamp(state.hubYaw - dx * 0.004 * sens, -1.2, 1.2);
      }
      _drag.x = e.clientX; _drag.y = e.clientY;
    });
    window.addEventListener('mouseup', () => { _drag = null; });
    canvas.addEventListener('wheel', e => {
      if (!NS.active) return;
      if (state.mode === 'match') {
        state.matchDist = THREE.MathUtils.clamp(state.matchDist + e.deltaY * 0.004, 2.6, 8);
      } else if (state.mode === 'hub') {
        state.hubDist = THREE.MathUtils.clamp(state.hubDist + e.deltaY * 0.004, 3, 8);
      }
      e.preventDefault();
    }, { passive: false });
    return state.camera;
  }

  /** Did the last mouse press turn into a drag? (Match uses this to ignore clicks.) */
  function consumedDrag() { return !!(_drag && _drag.moved); }

  // ── Mode setters ─────────────────────────────────────────────────────
  function setHub(targetObj, env) {
    init();
    state.mode = 'hub';
    state.target = targetObj;
    state.hubYaw = 0;
    state.hubHeight = (env && env.camera && env.camera.hubHeight) || 3.2;
    state.hubDist = (env && env.camera && env.camera.hubDist) || 5.6;
  }

  /**
   * Match camera: from white's side (player, +z of the board), looking down
   * at the board centre. boardCenter is world-space (table-top height).
   */
  function setMatch(boardCenter, opts) {
    init();
    opts = opts || {};
    state.boardCenter.copy(boardCenter);
    state.matchYaw = 0;
    state.matchPitch = opts.pitch ?? 1.05;
    state.matchPitchHome = state.matchPitch; // drag springs back here
    state.matchDist = opts.dist ?? 4.2;
    if (opts.immediate) { state.mode = 'match'; return; }
    // Sweep in cinematically from a wider shot.
    const from = state.camera.position.clone();
    const fromLook = state.look.clone();
    state.mode = 'cinematic';
    const to = _matchEye();
    const look = state.boardCenter.clone();
    NS.tween(opts.ms ?? 1400, k => {
      state.camera.position.lerpVectors(from, to, k);
      state.look.lerpVectors(fromLook, look, k);
      state.camera.lookAt(state.look);
    }, () => { state.mode = 'match'; });
  }

  function _matchEye() {
    // Spherical around board centre; yaw 0 faces from +z (white side).
    const pitch = state.matchPitch, yaw = state.matchYaw;
    const r = state.matchDist;
    const y = Math.sin(pitch) * r;
    const horiz = Math.cos(pitch) * r;
    return new THREE.Vector3(
      state.boardCenter.x + Math.sin(yaw) * horiz,
      state.boardCenter.y + y,
      state.boardCenter.z + Math.cos(yaw) * horiz
    );
  }

  /** Cinematic framing: fly to pos, look at look. */
  function flyTo(pos, look, ms, onDone) {
    init();
    state.mode = 'cinematic';
    const from = state.camera.position.clone();
    const fromLook = state.look.clone();
    const toPos = new THREE.Vector3(pos.x, pos.y, pos.z);
    const toLook = new THREE.Vector3(look.x, look.y, look.z);
    NS.tween(ms || 1200, k => {
      state.camera.position.lerpVectors(from, toPos, k);
      state.look.lerpVectors(fromLook, toLook, k);
      state.camera.lookAt(state.look);
    }, onDone);
  }

  /** Place instantly (scene setup). */
  function jumpTo(pos, look) {
    init();
    state.mode = 'cinematic';
    state.camera.position.set(pos.x, pos.y, pos.z);
    state.look.set(look.x, look.y, look.z);
    state.camera.lookAt(state.look);
  }

  /** Over-the-shoulder framing of a group of actors on a cutscene stage. */
  function frameActors(points, opts) {
    opts = opts || {};
    if (!points.length) return;
    const mid = points.reduce((a, p) => a.add(new THREE.Vector3(p.x, p.y + 1.2, p.z)), new THREE.Vector3()).multiplyScalar(1 / points.length);
    let spread = 0;
    points.forEach(p => { spread = Math.max(spread, mid.distanceTo(new THREE.Vector3(p.x, p.y + 1.2, p.z))); });
    const dist = Math.max(3.4, spread * 2.4);
    const pos = mid.clone().add(new THREE.Vector3(opts.side ?? 0.8, 0.7, dist));
    (opts.cut ? jumpTo : flyTo)(pos, mid, opts.ms ?? 1600, opts.onDone);
  }

  function pulse(strength) { state.shake = Math.max(state.shake, strength || 0.2); }

  // ── Per-frame ────────────────────────────────────────────────────────
  const _v = new THREE.Vector3();
  function _update(dt) {
    const cam = state.camera;
    if (!cam) return;
    // Released drag offsets drift gently home (~2s), never snapping.
    if (!_drag || !_drag.moved) {
      const k = 1 - Math.pow(0.3, dt);
      state.hubYaw += (0 - state.hubYaw) * k;
      state.matchYaw += (0 - state.matchYaw) * k;
      state.matchPitch += ((state.matchPitchHome ?? state.matchPitch) - state.matchPitch) * k;
    }
    if (state.mode === 'hub' && state.target) {
      const sens = Math.max(0.2, (NS.settings && NS.settings.sensitivity) || 1);
      const heading = state.target.userData.heading ?? state.target.rotation.y;
      const yaw = heading + Math.PI + state.hubYaw; // behind the character
      const tx = state.target.position.x, tz = state.target.position.z;
      _v.set(
        tx + Math.sin(yaw) * state.hubDist,
        state.target.position.y + state.hubHeight,
        tz + Math.cos(yaw) * state.hubDist
      );
      cam.position.lerp(_v, 1 - Math.pow(0.01, dt * sens)); // swing speed scales with turn setting
      state.look.lerp(new THREE.Vector3(tx, state.target.position.y + 1.5, tz), 1 - Math.pow(0.0005, dt));
      cam.lookAt(state.look);
    } else if (state.mode === 'match') {
      const eye = _matchEye();
      cam.position.lerp(eye, 1 - Math.pow(0.002, dt));
      state.look.lerp(state.boardCenter, 1 - Math.pow(0.002, dt));
      cam.lookAt(state.look);
    }
    if (state.shake > 0.002) {
      cam.position.x += (Math.random() - 0.5) * state.shake;
      cam.position.y += (Math.random() - 0.5) * state.shake * 0.6;
      state.shake *= Math.pow(0.0001, dt);
    } else state.shake = 0;
  }

  return {
    init, setHub, setMatch, flyTo, jumpTo, frameActors, pulse, consumedDrag,
    get camera() { return state.camera; },
    get mode() { return state.mode; },
    _state: state,
  };
});
