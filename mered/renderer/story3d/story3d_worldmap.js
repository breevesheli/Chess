/**
 * story3d_worldmap.js — the kingdom as a living 3D miniature.
 *
 * Replaces the flat travel panel: the whole realm on one table — Aurveld's
 * green south, the burnt Ashfields, blue Valdris beyond the river, the Pale
 * citadel, and the clearing at the world's edge — with roads between the
 * five chapter landmarks. Drag to pan, wheel to zoom, click a banner to
 * travel (locked chapters sit grey under a lock). M toggles it from the hub.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(null, null);
  else { root.Story3D.WorldMap = factory(root.THREE, root.Story3D); }
})(typeof self !== 'undefined' ? self : this, function (THREE, NS) {
  'use strict';
  if (!THREE) return {};

  const M = () => NS.Materials;
  const P = () => NS.Props;
  const A = () => NS.Adapter;
  const C = () => NS.Content;

  // Node layout: south (player start) → north (Valdris), clearing off east.
  const NODES = [
    { ch: 'ch1', name: 'Caer Aurveld',        x: 2.5,  z: 8 },
    { ch: 'ch2', name: 'The Ashfields',       x: -5,   z: 2.5 },
    { ch: 'ch3', name: 'The Border Town',     x: 3,    z: -2.5 },
    { ch: 'ch4', name: 'The Pale Citadel',    x: -2.5, z: -8.5 },
    { ch: 'ch5', name: 'The Clearing',        x: 8.5,  z: -10 },
  ];

  const state = { active: false, group: null, untick: null, animators: [], nodes: [], pan: null, look: new THREE.Vector3(0, 0, 0), dist: 18, returnCh: 'ch1' };

  function _progress() { return (typeof storyProgress !== 'undefined') ? storyProgress : window.storyProgress; }
  function _chapters() { return (typeof STORY_CHAPTERS !== 'undefined') ? STORY_CHAPTERS : window.STORY_CHAPTERS; }

  function _mini(ch, g) {
    const add = (geo, mat, sx, sy, sz, x, y, z) => {
      const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
    };
    const BOX = P().BOX(), CONE = P().CONE(), CYL = P().CYL();
    const stone = M().get('stone', '#5a5246'), wood = M().get('wood', '#4a3522');
    if (ch === 'ch1') {           // the palace: keep + two towers, gold roofs
      add(BOX, stone, 1.1, 0.8, 0.9, 0, 0.4, 0);
      [-0.7, 0.7].forEach(x => { add(CYL, stone, 0.3, 1.2, 0.3, x, 0.6, 0.2); add(CONE, M().get('metal', '#c8a040', { metalness: 0.7 }), 0.36, 0.4, 0.36, x, 1.4, 0.2); });
      add(CONE, M().get('fabric', '#5a1c1c'), 0.7, 0.5, 0.6, 0, 1.05, 0);
    } else if (ch === 'ch2') {    // the camp: tents + a charred tree
      [[-0.4, 0.2], [0.35, -0.1], [0, 0.45]].forEach(([x, z], i) => add(CONE, M().get('fabric', '#3a3226'), 0.4, 0.45, 0.4, x, 0.22, z));
      const t = P().deadTree({ h: 0.9 }); t.scale.setScalar(0.6); t.position.set(0.8, 0, -0.4); g.add(t);
    } else if (ch === 'ch3') {    // the town: huddled houses
      [[-0.4, 0, 0], [0.35, 0.2, 0.3], [0, -0.35, -0.2]].forEach(([x, z, r], i) => {
        add(BOX, M().get('plaster', '#5a5048'), 0.45, 0.4, 0.4, x, 0.2, z).rotation.y = r;
        add(CONE, wood, 0.5, 0.3, 0.45, x, 0.55, z).rotation.y = r + Math.PI / 4;
      });
    } else if (ch === 'ch4') {    // the citadel: tall pale spire + wall
      add(BOX, M().get('stone', '#4a505c'), 1.2, 0.35, 1, 0, 0.17, 0);
      add(CYL, M().get('stone', '#5a6270'), 0.4, 1.5, 0.4, 0, 0.75, 0);
      add(CONE, M().get('metal', '#8a909c', { metalness: 0.5 }), 0.5, 0.55, 0.5, 0, 1.75, 0);
    } else {                      // the clearing: ring of firs + ember light
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const t = P().tree({ h: 1.1, color: '#16281a' }); t.scale.setScalar(0.55);
        t.position.set(Math.cos(a) * 0.65, 0, Math.sin(a) * 0.65); g.add(t);
      }
      const ember = new THREE.PointLight(0xff8c3a, 0.8, 3, 2); ember.position.y = 0.4; g.add(ember);
      state.animators.push((t) => { ember.intensity = 0.65 + 0.25 * Math.sin(t * 7); });
    }
  }

  function _build() {
    const g = new THREE.Group();
    state.animators = [];
    // Realm slab — the kingdom on a war table
    const slab = new THREE.Mesh(P().geo('wm-slab', () => new THREE.BoxGeometry(26, 0.8, 26)), M().get('wood', '#33261a'));
    slab.position.y = -0.45; slab.receiveShadow = true; g.add(slab);
    const land = new THREE.Mesh(P().geo('wm-land', () => new THREE.PlaneGeometry(24, 24)), M().get('ground', '#46583a', { repeat: 5 }));
    land.rotation.x = -Math.PI / 2; land.receiveShadow = true; g.add(land);
    // Region washes: ash centre-west, Valdris blue-grey north
    const wash = (hex, w, d, x, z) => {
      const m = new THREE.Mesh(P().geo(`wm-wash|${w}|${d}`, () => new THREE.PlaneGeometry(w, d)),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), transparent: true, opacity: 0.55, roughness: 1 }));
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.012, z); g.add(m);
    };
    wash('#4a4034', 13, 9, -5, 2.5);    // ashfields
    wash('#3e4a52', 24, 8, 0, -9);      // valdris reach
    // The border river
    const river = new THREE.Mesh(P().geo('wm-river', () => new THREE.PlaneGeometry(24, 1.2)), M().flat('#3a5a7a', { roughness: 0.25, emissive: '#1a3046', emissiveIntensity: 0.3 }));
    river.rotation.x = -Math.PI / 2; river.rotation.z = -0.12; river.position.set(0, 0.02, -5); g.add(river);
    // Northern mountains
    for (let i = 0; i < 7; i++) {
      const mt = new THREE.Mesh(P().CONE(), M().get('stone', '#4a4e58'));
      mt.scale.set(2 + (i % 3), 1.6 + (i % 2) * 0.8, 2);
      mt.position.set(-10.5 + i * 3.4, 0.8, -11.2);
      mt.castShadow = true; g.add(mt);
    }
    // Forest sprinkles
    [[7, 5], [9, 2], [-9.5, 7.5], [6, -6.5], [10.5, -7.5], [-10, -3.5]].forEach(([x, z], i) => {
      const t = P().tree({ h: 1.3 + (i % 2) * 0.4, color: i > 3 ? '#1c2c20' : '#2c4426' });
      t.scale.setScalar(0.7); t.position.set(x, 0, z); g.add(t);
    });
    // Roads between consecutive chapter nodes
    for (let i = 0; i < NODES.length - 1; i++) {
      const a = NODES[i], b = NODES[i + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const road = new THREE.Mesh(P().geo('wm-road', () => new THREE.PlaneGeometry(1, 0.45)), M().get('ground', '#6a5840', { seed: 21 }));
      road.rotation.x = -Math.PI / 2;
      road.scale.x = len;
      road.position.set((a.x + b.x) / 2, 0.018, (a.z + b.z) / 2);
      road.rotation.z = Math.atan2(b.x - a.x, b.z - a.z) - Math.PI / 2;
      g.add(road);
    }
    // Chapter landmarks + flags + hit spheres
    const prog = _progress();
    const unlockedUpTo = A().chapterUnlockIndex(_chapters(), prog);
    state.nodes = [];
    NODES.forEach((n, i) => {
      const node = new THREE.Group();
      node.position.set(n.x, 0, n.z);
      _mini(n.ch, node);
      const locked = i > unlockedUpTo;
      const fac = C().FACTIONS[C().CHAPTER_ENEMY_FACTION[n.ch] || 'aurveld'] || C().FACTIONS.aurveld;
      const fl = P().flag({ color: locked ? '#5a5a5a' : fac.banner, trim: locked ? '#3a3a3a' : fac.trim, seed: 20 + i, h: 2.2 });
      fl.scale.setScalar(0.8); fl.position.set(0.9, 0, 0.6);
      node.add(fl);
      (fl.userData.animators || []).forEach(fn => state.animators.push(fn));
      if (n.ch === prog.currentChapter) {
        const ring = new THREE.Mesh(P().geo('wm-here', () => new THREE.RingGeometry(1.15, 1.3, 32)), M().glow('#ffcc00', 0.9));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.025; node.add(ring);
        state.animators.push((t) => { ring.scale.setScalar(1 + 0.05 * Math.sin(t * 2.4)); });
      }
      // invisible hit sphere for picking
      const hit = new THREE.Mesh(P().SPHERE(), new THREE.MeshBasicMaterial({ visible: false }));
      hit.scale.setScalar(3.2); hit.position.y = 0.8;
      hit.userData.mapNode = { ch: n.ch, name: n.name, locked, index: i };
      node.add(hit);
      state.nodes.push(hit);
      g.add(node);
    });
    // Table lighting — warm key + cool fill, candlelit war-room feel
    const hemi = new THREE.HemisphereLight('#8a8068', '#2a241c', 0.9); g.add(hemi);
    const key = new THREE.DirectionalLight('#ffe2b0', 0.9);
    key.position.set(10, 16, 8); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -16; key.shadow.camera.right = 16;
    key.shadow.camera.top = 16; key.shadow.camera.bottom = -16;
    g.add(key);
    return g;
  }

  function show(returnCh) {
    NS.init();
    state.returnCh = returnCh || _progress().currentChapter || 'ch1';
    NS.Hub.hide();
    NS.clearScene();
    NS.mode = 'worldmap';
    state.group = _build();
    NS.scene.add(state.group);
    NS.scene.fog = new THREE.Fog(new THREE.Color('#14100c'), 28, 60);
    NS.scene.background = new THREE.Color('#14100c');
    state.look.set(0, 0, 0);
    state.dist = 18;
    _applyCamera(true);
    state.untick = NS.onTick((dt, t) => state.animators.forEach(fn => fn(t, dt)));
    state.active = true;
    NS.HUD.setLocation('THE KINGDOM OF AURVELD');
    NS.HUD.showPrompt('drag — pan · wheel — zoom · click a banner — travel · M / Esc — return');
    NS.HUD.showMapDifficulty();
    _bind();
  }

  function _applyCamera(jump) {
    const eye = { x: state.look.x, y: state.dist, z: state.look.z + state.dist * 0.62 };
    const look = { x: state.look.x, y: 0, z: state.look.z };
    if (jump) NS.CameraRig.jumpTo(eye, look);
    else { NS.CameraRig.camera.position.set(eye.x, eye.y, eye.z); NS.CameraRig.camera.lookAt(look.x, look.y, look.z); }
  }

  function hide(travelTo) {
    if (!state.active) return;
    state.active = false;
    if (state.untick) { state.untick(); state.untick = null; }
    if (state.group) { NS.disposeGroup(state.group); state.group = null; }
    state.nodes = [];
    NS.HUD.hidePrompt();
    NS.HUD.hideMapDifficulty();
    NS.Hub.travelTo(travelTo || state.returnCh);
  }

  // ── Input: drag pan, wheel zoom, click travel, M/Esc return ──────────
  let _bound = false;
  const _ray = new THREE.Raycaster();
  const _ndc = new THREE.Vector2();
  function _bind() {
    if (_bound) return;
    _bound = true;
    let drag = null;
    NS.canvas.addEventListener('mousedown', e => { if (state.active) drag = { x: e.clientX, y: e.clientY, moved: false }; });
    window.addEventListener('mousemove', e => {
      if (!state.active || !drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      const k = state.dist * 0.0016;
      state.look.x = THREE.MathUtils.clamp(state.look.x - dx * k, -11, 11);
      state.look.z = THREE.MathUtils.clamp(state.look.z - dy * k, -11, 11);
      drag.x = e.clientX; drag.y = e.clientY;
      _applyCamera(false);
    });
    window.addEventListener('mouseup', () => { drag = null; });
    NS.canvas.addEventListener('wheel', e => {
      if (!state.active) return;
      state.dist = THREE.MathUtils.clamp(state.dist + e.deltaY * 0.015, 7, 26);
      _applyCamera(false);
      e.preventDefault();
    }, { passive: false });
    NS.canvas.addEventListener('click', e => {
      if (!state.active || (drag && drag.moved)) return;
      _ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      _ray.setFromCamera(_ndc, NS.CameraRig.camera);
      const hits = _ray.intersectObjects(state.nodes, false);
      if (!hits.length) return;
      const node = hits[0].object.userData.mapNode;
      if (node.locked) { NS.HUD.showPrompt(`${node.name} — the road is not open yet`); return; }
      hide(node.ch);
    });
    NS.canvas.addEventListener('mousemove', e => {
      if (!state.active) return;
      _ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      _ray.setFromCamera(_ndc, NS.CameraRig.camera);
      const hits = _ray.intersectObjects(state.nodes, false);
      if (hits.length) {
        const node = hits[0].object.userData.mapNode;
        NS.HUD.showPrompt(node.locked ? `${node.name} — LOCKED` : `${node.name} — click to travel`);
      }
    });
    window.addEventListener('keydown', e => {
      if (!NS.active) return;
      if (state.active && (e.code === 'Escape' || e.code === 'KeyM')) { e.preventDefault(); hide(); return; }
      if (!state.active && e.code === 'KeyM' && NS.mode === 'hub' && !NS.Character.overlayOpen() && !NS.Inventory.isOpen()) {
        e.preventDefault();
        show(NS.Hub._state.chapterId);
      }
    });
  }

  return { show, hide, _state: state, NODES };
});
