/**
 * story3d_environments.js — one 3D set per story background.
 *
 * Layouts, palettes, and moods are transcribed from the 2D BG_RENDERERS
 * painters (chess_ui.html L19228–19673) — same buildings in the same
 * positions with the same silhouettes, extruded into 3D. The 2D painters use
 * x-fractions of the canvas; here fx 0..1 maps to world X across the set
 * width, with depth (Z) placed to match each scene's read. 1 unit = 1 m.
 *
 * build(bgId, opts) → {
 *   group,            THREE.Group added to the scene by the caller
 *   animators,        [fn(t, dt)] collected from props
 *   colliders,        [{x, z, hw, hd}] AABBs for the character controller
 *   bounds,           { minX, maxX, minZ, maxZ } walkable rect
 *   spawn,            { x, z, facing } player spawn (hub mode)
 *   boardAnchor,      { x, z, rotY } where the match table sits
 *   stage,            cutscene actor rect (Adapter.stageToWorld)
 *   camera,           { hubHeight }
 *   npcSlots,         [{ x, z, facing }] free anchors for hub NPCs
 *   tableStyle,       'wood' | 'stone'
 * }
 * opts.hub widens bounds and adds npcSlots for the walkable chapter hubs.
 * Hub spawns sit well inside the set so the follow camera (≈5.6 m behind)
 * never starts inside a wall.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(null, null);
  else { root.Story3D.Environments = factory(root.THREE, root.Story3D); }
})(typeof self !== 'undefined' ? self : this, function (THREE, NS) {
  'use strict';
  if (!THREE) return {};

  const M = () => NS.Materials;
  const P = () => NS.Props;

  // ── Shared scene plumbing ────────────────────────────────────────────
  function ctx(width, depth) {
    return {
      group: new THREE.Group(),
      colliders: [],
      npcSlots: [],
      width, depth,
      bounds: { minX: -width / 2 + 1, maxX: width / 2 - 1, minZ: -depth / 2 + 1, maxZ: depth / 2 - 1 },
    };
  }
  function fx(c, f) { return (f - 0.5) * c.width; } // 2D x-fraction → world X

  function add(c, obj, x, z, rotY) {
    obj.position.x = x || 0;
    obj.position.z = z || 0;
    if (rotY) obj.rotation.y = rotY;
    c.group.add(obj);
    return obj;
  }
  function collide(c, x, z, hw, hd) { c.colliders.push({ x, z, hw, hd }); }
  function addC(c, obj, x, z, rotY, hw, hd) { add(c, obj, x, z, rotY); collide(c, x, z, hw, hd); return obj; }

  function ground(c, kind, hex, repeat) {
    const g = new THREE.Mesh(
      P().geo(`ground|${c.width}|${c.depth}`, () => new THREE.PlaneGeometry(c.width, c.depth)),
      M().get(kind, hex, { repeat: repeat || 6 })
    );
    g.rotation.x = -Math.PI / 2;
    g.receiveShadow = true;
    c.group.add(g);
    return g;
  }

  /** Sky + fog + hemisphere/key lights. mood: {sky, fog, fogNear, fogFar, hemi:[skyC,groundC,i], sun:{color,i,pos,shadow,shadowSize}} */
  function atmosphere(c, mood) {
    c.sky = new THREE.Color(mood.sky);
    c.fog = new THREE.Fog(new THREE.Color(mood.fog || mood.sky), mood.fogNear ?? 18, mood.fogFar ?? 60);
    const hemi = new THREE.HemisphereLight(mood.hemi[0], mood.hemi[1], mood.hemi[2]);
    c.group.add(hemi);
    if (mood.sun) {
      const sun = new THREE.DirectionalLight(mood.sun.color, mood.sun.i);
      sun.position.set(...(mood.sun.pos || [8, 14, 6]));
      if (mood.sun.shadow !== false) {
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        const s = mood.sun.shadowSize || 22;
        sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
        sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
        sun.shadow.camera.far = 60;
        sun.shadow.bias = -0.0015;
      }
      c.group.add(sun);
      c.group.add(sun.target);
    }
  }

  /** Interior room shell: adds 4 walls + colliders (floor done separately). */
  function room(c, h, wallMat, opts) {
    opts = opts || {};
    const W = c.width, D = c.depth, t = 0.4;
    const mk = (w_, h_, d_, x, y, z) => {
      const m = new THREE.Mesh(P().BOX(), wallMat);
      m.scale.set(w_, h_, d_); m.position.set(x, y, z);
      m.receiveShadow = true; m.castShadow = false;
      c.group.add(m);
    };
    mk(W, h, t, 0, h / 2, -D / 2); collide(c, 0, -D / 2, W / 2, t);
    mk(W, h, t, 0, h / 2, D / 2); collide(c, 0, D / 2, W / 2, t);
    mk(t, h, D, -W / 2, h / 2, 0); collide(c, -W / 2, 0, t, D / 2);
    mk(t, h, D, W / 2, h / 2, 0); collide(c, W / 2, 0, t, D / 2);
    if (opts.ceiling) {
      const ceil = new THREE.Mesh(P().BOX(), opts.ceilingMat || wallMat);
      ceil.scale.set(W, 0.3, D); ceil.position.set(0, h + 0.15, 0);
      c.group.add(ceil);
    }
  }

  function finish(c, extras) {
    const out = Object.assign({
      group: c.group,
      colliders: c.colliders,
      bounds: c.bounds,
      npcSlots: c.npcSlots,
      sky: c.sky, fog: c.fog,
      animators: [],
      spawn: { x: 0, z: c.depth * 0.32, facing: Math.PI },
      boardAnchor: { x: 0, z: 0, rotY: 0 },
      stage: { center: [0, 0, -1], right: [1, 0, 0], forward: [0, 0, 1], width: Math.min(c.width * 0.7, 14), depth: 6 },
      camera: { hubHeight: 3.2 },
      tableStyle: 'wood',
    }, extras || {});
    c.group.traverse(o => {
      if (o.userData && o.userData.animators) out.animators.push(...o.userData.animators);
    });
    return out;
  }

  // ── Scene builders ───────────────────────────────────────────────────
  const BUILDERS = {};

  // Ch1 — private room: cold hearth, two chairs, small board between (L19312).
  BUILDERS.palace_antechamber = function (opts) {
    const c = ctx(14, 12);
    atmosphere(c, { sky: '#241c12', fog: '#241c12', fogNear: 10, fogFar: 30, hemi: ['#6a5638', '#2a2014', 1.05] });
    ground(c, 'wood', '#402e1e', 5);
    room(c, 4.2, M().get('plaster', '#3a2e20'), { ceiling: true, ceilingMat: M().get('wood', '#2a2014') });
    // Pale window on the back wall (w*0.5 in 2D), cold shaft across the room
    add(c, P().stainedWindow({ seed: 9, w: 0.8, h: 1.9, shaft: true, shaftH: 4 }), 0, -5.7).position.y = 1.1;
    // Rug between the two chairs
    add(c, P().rug({ w: 3.4, d: 5.4, color: '#4a3018', border: '#32200e' }), 0, 0);
    // Torches at 0.22 / 0.76
    add(c, P().torch({ light: true }), fx(c, 0.22), -5.6).position.y = 1.4;
    add(c, P().torch({ light: true }), fx(c, 0.76), -5.6).position.y = 1.4;
    // Cold hearth (no fire — "a cold hearth")
    const stone = M().get('stone', '#2a2016');
    const hearthG = new THREE.Group();
    [[-0.8, 0, 0.25, 1.4, 0.25], [0.8, 0, 0.25, 1.4, 0.25], [0, 1.45, 1.85, 0.3, 0.3]].forEach(([x, y, sx, sy, sz]) => {
      const m = new THREE.Mesh(P().BOX(), stone); m.scale.set(sx, sy, sz); m.position.set(x, y + sy / 2, 0);
      m.castShadow = true; m.receiveShadow = true; hearthG.add(m);
    });
    addC(c, hearthG, -5.6, -2, Math.PI / 2, 0.6, 1.2);
    // Cabinet on the right (2D 0.85)
    addC(c, P().building({ w: 1.4, d: 0.6, h: 2.2, wallColor: '#2a1f16', windows: 0, doorSide: null }), fx(c, 0.85), -5.2, 0, 0.8, 0.5);
    // Two chairs + board table in the middle — this IS the Cavan room.
    addC(c, P().boardTable({ topSize: 2.2, topY: 0.85 }), 0, 0, 0, 1.3, 1.3);
    add(c, P().chair(), 0, 2.2, Math.PI);
    add(c, P().chair(), 0, -2.2, 0);
    return finish(c, {
      boardAnchor: { x: 0, z: 0, rotY: 0 },
      spawn: { x: 0, z: 3.4, facing: Math.PI },
      stage: { center: [0, 0, -0.5], right: [1, 0, 0], forward: [0, 0, 1], width: 9, depth: 4.5 },
      camera: { hubHeight: 3 },
    });
  };

  // Ch1 — great hall: arches, stained glass, gold/green banners, diamond
  // floor, torches, central throne with gold glow (L19228). Hub for ch1.
  BUILDERS.palace_great_hall = function (opts) {
    const hub = opts && opts.hub;
    const c = ctx(hub ? 30 : 22, hub ? 26 : 18);
    atmosphere(c, {
      sky: '#2a2018', fog: '#2a2018', fogNear: hub ? 16 : 12, fogFar: hub ? 44 : 34,
      // a royal hall in daylight — bright enough to read every face
      hemi: ['#7a6644', '#2a2014', 1.15],
      sun: { color: '#ffd9a0', i: 0.72, pos: [6, 12, 4], shadowSize: hub ? 20 : 14 },
    });
    // Diamond checker floor (#342a1c / #4a3c2a)
    const floor = new THREE.Mesh(
      P().geo(`ghfloor|${c.width}`, () => new THREE.PlaneGeometry(c.width, c.depth)),
      (() => {
        const t = NS.Textures.checker('#4a3c2a', '#342a1c', 13, 512, 12);
        const m = new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bumpMap, bumpScale: 0.04, roughnessMap: t.roughnessMap });
        m.userData.story3dShared = true;
        return m;
      })()
    );
    floor.rotation.x = -Math.PI / 2; floor.rotation.z = Math.PI / 4; // diamond orientation
    floor.receiveShadow = true;
    c.group.add(floor);
    room(c, 7, M().get('stone', '#3a3026'), {});
    // Arched alcoves along the back wall (4 in 2D)
    for (let i = 0; i < 4; i++) {
      add(c, P().arch({ w: 2.6, h: 4.2, color: '#3a3026' }), fx(c, 0.15 + i * 0.22) + 1.2, -c.depth / 2 + 0.5);
    }
    // 3 stained-glass windows high on the back wall, the centre one
    // throwing a faint shaft across the hall
    for (let i = 0; i < 3; i++) {
      const win = add(c, P().stainedWindow({ seed: 3 + i, shaft: i === 1, shaftH: 7 }), fx(c, 0.22 + i * 0.28), -c.depth / 2 + 0.35);
      win.position.y = 3.4;
    }
    // Banners — gold at 0.12, green at 0.80, hung high
    const b1 = add(c, P().banner({ color: M().PALETTE.bannerGold, h: 3 }), fx(c, 0.12), -c.depth / 2 + 1.2);
    b1.position.y = 6;
    const b2 = add(c, P().banner({ color: M().PALETTE.bannerGreen, h: 3 }), fx(c, 0.80), -c.depth / 2 + 1.2);
    b2.position.y = 6;
    // Column rows framing the hall (fluted, with bases and capitals)
    [-1, 1].forEach(side => {
      for (let i = 0; i < (hub ? 4 : 3); i++) {
        const colX = side * (c.width / 2 - 3), colZ = -c.depth / 2 + 4 + i * 5.5;
        addC(c, P().column({ h: 7, color: '#443a2e' }), colX, colZ, 0, 0.7, 0.7);
      }
    });
    // Torches at 0.18 / 0.82 (the two 2D ember fireplaces) + extras unlit
    [[0.18, true], [0.82, true], [0.35, false], [0.65, false]].forEach(([f, lit]) => {
      const t1 = add(c, P().torch({ light: lit }), fx(c, f), -c.depth / 2 + 0.7);
      t1.position.y = 2.2;
    });
    // Throne centre-back with gold glow
    addC(c, P().throne(), 0, -c.depth / 2 + 2.2, 0, 1.3, 1.1);
    const glowL = new THREE.PointLight(0xffd670, 0.9, 10, 2);
    glowL.position.set(0, 2.6, -c.depth / 2 + 2.6);
    c.group.add(glowL);
    // Long bordered carpet to the throne
    add(c, P().rug({ w: 2.4, d: c.depth * 0.7, color: '#5a1c1c', border: '#3a1212' }), 0, 0);
    // Aurveld colours flank the approach — gold and green, the old banners
    addC(c, P().flag({ color: '#e4c058', trim: '#c8a040', seed: 1 }), -2.6, c.depth / 2 - 4.5, 0.4, 0.25, 0.25);
    addC(c, P().flag({ color: '#68a048', trim: '#c8a040', seed: 2 }), 2.6, c.depth / 2 - 4.5, -0.4, 0.25, 0.25);
    if (hub) {
      // NPC stations along the columns + by the throne dais
      c.npcSlots = [
        { x: -6, z: -6, facing: Math.PI / 3 },
        { x: 6, z: -6, facing: -Math.PI / 3 },
        { x: -8, z: 1, facing: Math.PI / 2 },
        { x: 8, z: 1, facing: -Math.PI / 2 },
        { x: -4, z: 6, facing: 0.4 },
        { x: 4, z: 6, facing: -0.4 },
        { x: 0, z: -7.5, facing: 0 },              // boss — before the throne
        { x: -9.5, z: 8, facing: Math.PI / 4 },    // merchant corner
      ];
    }
    return finish(c, {
      boardAnchor: { x: 0, z: 1.5, rotY: 0 },
      spawn: { x: 0, z: hub ? c.depth / 2 - 7 : c.depth / 2 - 4, facing: Math.PI },
      stage: { center: [0, 0, -2], right: [1, 0, 0], forward: [0, 0, 1], width: 13, depth: 6 },
      tableStyle: 'stone',
      camera: { hubHeight: 3.4 },
    });
  };

  // Ch1 — training yard: day sky, dirt ring, low crenellated wall, post +
  // practice dummy, mist (L19334).
  BUILDERS.palace_training_yard = function () {
    const c = ctx(18, 14);
    atmosphere(c, {
      sky: '#2e3d52', fog: '#7a8488', fogNear: 14, fogFar: 42,
      hemi: ['#aab4c0', '#42301e', 0.75],
      sun: { color: '#e8e4d0', i: 0.8, pos: [10, 16, 8] },
    });
    ground(c, 'ground', '#42301e', 6);
    // Crenellated wall along the back
    const wallM = M().get('stone', '#303028');
    const wall = new THREE.Mesh(P().BOX(), wallM);
    wall.scale.set(c.width, 2.4, 0.6); wall.position.set(0, 1.2, -c.depth / 2);
    wall.castShadow = true; wall.receiveShadow = true;
    c.group.add(wall); collide(c, 0, -c.depth / 2, c.width / 2, 0.5);
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(P().BOX(), wallM);
      m.scale.set(0.55, 0.45, 0.6);
      m.position.set(-c.width / 2 + (c.width * i) / 11, 2.6, -c.depth / 2);
      c.group.add(m);
    }
    // Flag post (2D 0.7) and practice dummy (2D 0.18)
    addC(c, P().lanternPost({}), fx(c, 0.7), -c.depth / 2 + 1.4, 0, 0.3, 0.3);
    const dummyG = new THREE.Group();
    const dm = new THREE.Mesh(P().CYL(), M().get('wood', '#1a1410'));
    dm.scale.set(0.12, 1.6, 0.12); dm.position.y = 0.8; dummyG.add(dm);
    const dh = new THREE.Mesh(P().SPHERE(), M().get('fabric', '#3a3026'));
    dh.scale.set(0.3, 0.3, 0.3); dh.position.y = 1.7; dummyG.add(dh);
    dummyG.traverse(o => { o.castShadow = true; });
    addC(c, dummyG, fx(c, 0.18), -2, 0, 0.4, 0.4);
    // Practice ring fence
    [[-3, 2, 0], [3, 2, 0], [0, 4.6, Math.PI / 2], [0, -0.6, Math.PI / 2]].forEach(([x, z, r]) => {
      addC(c, P().fence({ len: 5.6 }), x, z, r, r ? 0.2 : 2.8, r ? 2.8 : 0.2);
    });
    // Morning mist over the yard (the 2D scene's 6 mist puffs)
    add(c, NS.FX.mist({ w: c.width - 4, d: c.depth - 4, count: 4 }), 0, 0);
    add(c, P().scatter({ w: c.width - 3, d: c.depth - 3, count: 20, clear: 3, grassColor: '#5a5238', grassColor2: '#4a4430' }), 0, 0);
    return finish(c, {
      stage: { center: [0, 0, 1.8], right: [1, 0, 0], forward: [0, 0, 1], width: 10, depth: 5 },
      boardAnchor: { x: 0, z: 2 },
    });
  };

  // Ch1 sidequest — farmland road: overcast, converging road, field plots,
  // treeline, distant farmhouse with chimney smoke (L19367).
  BUILDERS.road_aurveld_farmland = function () {
    const c = ctx(26, 20);
    atmosphere(c, {
      sky: '#a0a8a8', fog: '#a0a8a8', fogNear: 16, fogFar: 48,
      hemi: ['#b8bcb8', '#3a2e20', 0.8],
      sun: { color: '#d8d8cc', i: 0.55, pos: [-8, 14, 6] },
    });
    ground(c, 'ground', '#3a2e20', 7);
    // Dirt road running into the distance
    const road = new THREE.Mesh(P().geo('road', () => new THREE.PlaneGeometry(3.4, 1)), M().get('ground', '#6a5840', { seed: 21 }));
    road.rotation.x = -Math.PI / 2; road.scale.y = c.depth; road.position.y = 0.02;
    road.receiveShadow = true;
    c.group.add(road);
    // Field plot fences on both sides
    for (let i = 0; i < 4; i++) {
      addC(c, P().fence({ len: 4 }), -8 + i * 0.4, -6 + i * 3.4, 0.25, 2, 0.2);
      addC(c, P().fence({ len: 4 }), 8 - i * 0.4, -6 + i * 3.4, -0.25, 2, 0.2);
    }
    // Treeline along the back
    for (let i = 0; i < 6; i++) {
      addC(c, P().tree({ h: 3 + (i % 3) * 0.5, color: '#2c3a24' }), -c.width / 2 + 2 + i * 4.4, -c.depth / 2 + 1.5, 0, 0.4, 0.4);
    }
    // Farmhouse (2D 0.62–0.66) with smoking chimney
    addC(c, P().building({ w: 4, d: 3.2, h: 2.6, wallColor: '#5a4a36', roofColor: '#2a1e18', windows: 1, glowWindows: true, chimney: true }), fx(c, 0.64), -5.5, -0.3, 2.2, 1.8);
    add(c, P().scatter({ w: c.width - 4, d: c.depth - 4, count: 30, clear: 2.5 }), 0, 0);
    return finish(c, {
      stage: { center: [0, 0, 3], right: [1, 0, 0], forward: [0, 0, 1], width: 11, depth: 5 },
      boardAnchor: { x: 0, z: 3.5 },
    });
  };

  // Ch2 — ashfields: grey sky, ash ground, burnt trees, ruined building (L19388).
  BUILDERS.ashfields_open_road = function () {
    const c = ctx(28, 20);
    atmosphere(c, {
      sky: '#888888', fog: '#7e7a74', fogNear: 12, fogFar: 40,
      hemi: ['#9a9a96', '#2e2416', 0.65],
      sun: { color: '#b0a89c', i: 0.4, pos: [4, 12, -6] },
    });
    ground(c, 'ground', '#2e2416', 7);
    const road = new THREE.Mesh(P().geo('road', () => new THREE.PlaneGeometry(3.4, 1)), M().get('ground', '#605040', { seed: 33 }));
    road.rotation.x = -Math.PI / 2; road.scale.y = c.depth; road.position.y = 0.02;
    road.receiveShadow = true;
    c.group.add(road);
    // Burnt trees at the 2D x-fractions, ash haze drifting low
    [0.1, 0.2, 0.33, 0.88, 0.94].forEach((f, i) => {
      addC(c, P().deadTree({ h: 2.6 + (i % 3) * 0.5 }), fx(c, f), -4 - (i % 3) * 2, 0, 0.3, 0.3);
    });
    add(c, NS.FX.mist({ w: c.width - 6, d: c.depth - 6, count: 3, color: '#8a847a' }), 0, 0);
    add(c, P().scatter({ w: c.width - 4, d: c.depth - 4, count: 24, clear: 3, grass: false, stoneColor: '#3a342c' }), 0, 0);
    // Ruined house (2D 0.66+): broken walls, collapsed roof edge
    const ruin = new THREE.Group();
    const rm = M().get('stone', '#26201a');
    [[2.6, 1.8, 0.3, 0, 0.9, -1.2], [0.3, 1.4, 2.4, -1.3, 0.7, 0], [0.3, 0.9, 2.4, 1.3, 0.45, 0], [2.6, 0.25, 0.3, 0, 1.9, -1.2]].forEach(([sx, sy, sz, x, y, z]) => {
      const m = new THREE.Mesh(P().BOX(), rm);
      m.scale.set(sx, sy, sz); m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true;
      ruin.add(m);
    });
    addC(c, ruin, fx(c, 0.7), -3.5, -0.2, 1.6, 1.5);
    return finish(c, {
      stage: { center: [0, 0, 3], right: [1, 0, 0], forward: [0, 0, 1], width: 12, depth: 5 },
      boardAnchor: { x: 0, z: 3 },
      tableStyle: 'stone',
    });
  };

  // Ch2 — army camp at night: tents, big central campfire, crate, star sky.
  // Hub for chapter 2 (L19420).
  BUILDERS.army_camp_night = function (opts) {
    const hub = opts && opts.hub;
    const c = ctx(hub ? 32 : 24, hub ? 28 : 20);
    atmosphere(c, {
      sky: '#10141a', fog: '#10141a', fogNear: hub ? 14 : 10, fogFar: hub ? 40 : 30,
      hemi: ['#3a4a66', '#222820', 0.95],
      sun: { color: '#8ca0c8', i: 0.32, pos: [-6, 18, -8], shadow: false }, // moonlight
    });
    ground(c, 'ground', '#222a20', 8);
    // Star field + moon (the 2D scene draws 40 drifting stars)
    add(c, NS.FX.stars({ count: 90, radius: hub ? 26 : 20, moon: true }), 0, 0);
    // Tents at the 2D fractions 0.22/0.35/0.6/0.74 — two glow from inside
    [[0.22, -4], [0.35, -6.5], [0.6, -6], [0.74, -3.5]].forEach(([f, z], i) => {
      addC(c, P().tent({ w: 2.4 + (i % 2) * 0.5, d: 2.8, h: 1.7, color: '#2a2218', glow: i % 2 === 0 }), fx(c, f), z, (i - 1.5) * 0.3, 1.4, 1.5);
    });
    // Central campfire (the scene's anchor light)
    add(c, P().campfire({ light: true, intensity: 2.8, range: 18, embers: 14 }), 0, 0);
    collide(c, 0, 0, 0.8, 0.8);
    // Log seats around the fire
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const log = new THREE.Mesh(P().CYL(), M().get('wood', '#3a2a1a'));
      log.scale.set(0.18, 1.4, 0.18);
      log.rotation.z = Math.PI / 2; log.rotation.y = a;
      log.position.set(Math.cos(a) * 1.8, 0.18, Math.sin(a) * 1.8);
      log.castShadow = true;
      c.group.add(log);
      collide(c, log.position.x, log.position.z, 0.7, 0.3);
    }
    // The army marches under Aurveld gold — a war flag by the fire
    addC(c, P().flag({ color: '#e4c058', trim: '#c8a040', seed: 3 }), 3.2, -1.5, 0.6, 0.25, 0.25);
    // Supply crates (2D 0.05)
    addC(c, P().crate({ size: 0.7 }), fx(c, 0.06), 2, 0.3, 0.5, 0.5);
    addC(c, P().crate({ size: 0.5 }), fx(c, 0.06) + 0.8, 2.2, 0.8, 0.4, 0.4);
    addC(c, P().barrel({}), fx(c, 0.06) + 0.4, 1, 0, 0.4, 0.4);
    // Perimeter lanterns
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) => {
      add(c, P().lanternPost({ light: i < 2 }), sx * (c.width / 2 - 2.5), sz * (c.depth / 2 - 2.5));
    });
    if (hub) {
      c.npcSlots = [
        { x: -7, z: -2, facing: 1.1 },
        { x: 6.5, z: -3, facing: -1.2 },
        { x: -4, z: 5, facing: 0.5 },
        { x: 5, z: 5, facing: -0.6 },
        { x: -9, z: 2, facing: Math.PI / 2 },
        { x: 9, z: 1, facing: -Math.PI / 2 },
        { x: 0, z: -9, facing: 0 },               // boss — road edge, north
        { x: 10, z: 7, facing: -Math.PI / 3 },    // merchant
      ];
    }
    return finish(c, {
      spawn: { x: 0, z: hub ? c.depth / 2 - 6 : c.depth / 2 - 3.5, facing: Math.PI },
      stage: { center: [0, 0, 2.5], right: [1, 0, 0], forward: [0, 0, 1], width: 12, depth: 5.5 },
      boardAnchor: { x: 2.8, z: 2.2, rotY: 0.3 },
      camera: { hubHeight: 3.2 },
    });
  };

  // Ch2 sidequest — camp perimeter at night: receding torch line, darkness (L19463).
  BUILDERS.army_camp_perimeter = function () {
    const c = ctx(22, 16);
    atmosphere(c, {
      sky: '#050608', fog: '#050608', fogNear: 8, fogFar: 26,
      hemi: ['#2c3850', '#0a0c10', 0.75],
    });
    ground(c, 'ground', '#0c0e0c', 7);
    add(c, NS.FX.stars({ count: 70, radius: 18 }), 0, 0);
    // Torch line receding (2D 0.7→0.9)
    for (let i = 0; i < 5; i++) {
      const t = add(c, P().torch({ light: i < 3, intensity: 0.9 }), fx(c, 0.7 + i * 0.05), -2 - i * 2.2);
      t.position.y = 0.9;
      const post = new THREE.Mesh(P().CYL(), M().get('wood', '#2a2018'));
      post.scale.set(0.07, 1.0, 0.07); post.position.set(t.position.x, 0.5, t.position.z);
      c.group.add(post);
    }
    // Picket fence + stakes
    addC(c, P().fence({ len: 7 }), -4, -3, 0.2, 3.5, 0.3);
    return finish(c, {
      stage: { center: [0, 0, 2], right: [1, 0, 0], forward: [0, 0, 1], width: 10, depth: 5 },
      boardAnchor: { x: 0, z: 2 },
    });
  };

  // Ch3 — Valdris border in daylight: pale sky, green fields, road, border post (L19473).
  BUILDERS.valdris_border_day = function () {
    const c = ctx(26, 20);
    atmosphere(c, {
      sky: '#b0bcc0', fog: '#b0bcc0', fogNear: 16, fogFar: 50,
      hemi: ['#c8d0d4', '#4a5830', 0.85],
      sun: { color: '#f0ead8', i: 0.85, pos: [12, 18, 6] },
    });
    ground(c, 'ground', '#4a5830', 7);
    const road = new THREE.Mesh(P().geo('road', () => new THREE.PlaneGeometry(3.4, 1)), M().get('ground', '#706050', { seed: 39 }));
    road.rotation.x = -Math.PI / 2; road.scale.y = c.depth; road.position.y = 0.02;
    road.receiveShadow = true;
    c.group.add(road);
    // Field plot hedges
    for (let i = 0; i < 4; i++) {
      const hedge = new THREE.Mesh(P().BOX(), M().get('fabric', '#3a4820', { seed: 61 }));
      hedge.scale.set(3.6, 0.5, 0.4); hedge.position.set(-7 + (i % 2) * 14, 0.25, -6 + i * 3);
      hedge.castShadow = true; hedge.receiveShadow = true;
      c.group.add(hedge);
      collide(c, hedge.position.x, hedge.position.z, 1.9, 0.4);
    }
    // Border post + sign (2D 0.85)
    const postG = new THREE.Group();
    const post = new THREE.Mesh(P().BOX(), M().get('wood', '#4a4038'));
    post.scale.set(0.3, 2.6, 0.3); post.position.y = 1.3; post.castShadow = true;
    postG.add(post);
    const sign = new THREE.Mesh(P().BOX(), M().get('wood', '#6a6058'));
    sign.scale.set(1.2, 0.5, 0.08); sign.position.set(0, 1.9, 0.1); sign.castShadow = true;
    postG.add(sign);
    addC(c, postG, fx(c, 0.85), -2, -0.15, 0.5, 0.5);
    // Striped barrier arm across the road
    const arm = new THREE.Mesh(P().BOX(), M().flat('#8a3030', { roughness: 0.8 }));
    arm.scale.set(4, 0.12, 0.12); arm.position.set(1, 1.05, -3.4); arm.castShadow = true;
    c.group.add(arm);
    add(c, P().scatter({ w: c.width - 4, d: c.depth - 4, count: 32, clear: 2.5, grassColor: '#3e5230', grassColor2: '#314424' }), 0, 0);
    return finish(c, {
      stage: { center: [0, 0, 2.5], right: [1, 0, 0], forward: [0, 0, 1], width: 12, depth: 5 },
      boardAnchor: { x: 0, z: 2.5 },
    });
  };

  // Ch3 — border town at sunset: two building rows with lit windows, well,
  // stalls, townsfolk. Hub for chapter 3 (L19490).
  BUILDERS.valdris_border_town = function (opts) {
    const hub = opts && opts.hub;
    const c = ctx(hub ? 32 : 24, hub ? 26 : 18);
    atmosphere(c, {
      sky: '#d8a878', fog: '#c89868', fogNear: hub ? 16 : 12, fogFar: hub ? 44 : 34,
      hemi: ['#e0b080', '#706050', 0.7],
      sun: { color: '#ffb060', i: 0.7, pos: [-14, 8, 4], shadowSize: hub ? 20 : 14 }, // low sunset sun
    });
    ground(c, 'ground', '#706050', 7);
    // Two building rows flanking a central street (2D: 0–0.45 and 0.55–1)
    const rowZ = -c.depth / 2 + 3;
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < (hub ? 3 : 2); i++) {
        const bw = 4.6, x = (side ? 1 : -1) * (c.width / 4 + 1.4) + (i - 1) * (side ? 1 : -1) * 0.4;
        const z = rowZ + i * (bw + 1.6);
        const b = P().building({
          w: bw, d: 4, h: 3 + (i % 2) * 0.7,
          wallColor: '#484038', roofColor: '#2a2018',
          windows: 2, glowWindows: true, doorSide: side ? 'w' : 'e',
          chimney: i % 2 === 0,
        });
        addC(c, b, x, z, (side ? -1 : 1) * 0.04, bw / 2, 2.2);
      }
    }
    // Well at the town centre (2D 0.5/0.82)
    const well = new THREE.Group();
    const wellWall = new THREE.Mesh(P().geo('well', () => new THREE.CylinderGeometry(0.8, 0.85, 0.8, 12)), M().get('stone', '#48382a'));
    wellWall.position.y = 0.4; wellWall.castShadow = true; wellWall.receiveShadow = true;
    well.add(wellWall);
    const wellPost = new THREE.Mesh(P().CYL(), M().get('wood', '#2a2018'));
    wellPost.scale.set(0.07, 1.6, 0.07); wellPost.position.set(0, 1.2, 0);
    well.add(wellPost);
    const wellRoof = new THREE.Mesh(P().CONE(), M().get('wood', '#3a2a1a'));
    wellRoof.scale.set(1.4, 0.6, 1.4); wellRoof.position.y = 2.1; wellRoof.castShadow = true;
    well.add(wellRoof);
    addC(c, well, 0, 2, 0, 1, 1);
    // Market stalls (2D 0.58/0.63)
    addC(c, P().stall({ color: '#8a4a3a' }), fx(c, 0.58) * 0.5, 5.5, 0.3, 1.1, 0.6);
    addC(c, P().stall({ color: '#3a5a4a' }), fx(c, 0.63) * 0.5 + 2.4, 6.2, -0.2, 1.1, 0.6);
    // Lantern posts down the street
    [[-2.5, -2], [2.5, 0], [-2.5, 4]].forEach(([x, z], i) => {
      addC(c, P().lanternPost({ light: i < 2 }), x, z, 0, 0.25, 0.25);
    });
    // Valdris blue flies over its own town
    addC(c, P().flag({ color: '#3a5a8a', trim: '#aabdd4', seed: 4 }), -3.4, -6.5, 0.3, 0.25, 0.25);
    addC(c, P().flag({ color: '#3a5a8a', trim: '#aabdd4', seed: 5 }), 3.6, 1.5, -0.5, 0.25, 0.25);
    if (hub) {
      c.npcSlots = [
        { x: -6.5, z: -4, facing: 1 },
        { x: 7, z: -3, facing: -1.1 },
        { x: -5, z: 4.5, facing: 0.7 },
        { x: 5.5, z: 3, facing: -0.8 },
        { x: -8, z: 8, facing: Math.PI / 3 },
        { x: 3, z: 8.5, facing: -0.3 },
        { x: 0, z: -9.5, facing: 0 },             // boss — far end of the street
        { x: 9.5, z: 7.5, facing: -Math.PI / 3 }, // merchant by the stalls
      ];
    }
    return finish(c, {
      spawn: { x: 0, z: hub ? c.depth / 2 - 6 : c.depth / 2 - 3, facing: Math.PI },
      stage: { center: [0, 0, 3], right: [1, 0, 0], forward: [0, 0, 1], width: 12, depth: 5.5 },
      boardAnchor: { x: 0, z: 3, rotY: 0 },
      camera: { hubHeight: 3.3 },
    });
  };

  // Ch3 boss — war room: candlelit map table, banners, narrow window (L19516).
  BUILDERS.valdris_war_room = function () {
    const c = ctx(16, 13);
    atmosphere(c, {
      sky: '#141820', fog: '#141820', fogNear: 9, fogFar: 26,
      hemi: ['#4a4430', '#241c12', 0.75],
    });
    ground(c, 'wood', '#241c12', 5);
    room(c, 4.6, M().get('stone', '#2a2620'), { ceiling: true, ceilingMat: M().get('wood', '#282420') });
    // Big map table in the centre (2D w 0.22–0.78) — the board sits ON it.
    const table = addC(c, P().boardTable({ topSize: 4.4, topY: 0.95, color: '#3a2a18' }), 0, -1, 0, 2.4, 2.4);
    // Map parchment on the table around the board area
    const map = new THREE.Mesh(P().geo('warmap', () => new THREE.PlaneGeometry(3.6, 2.2)), M().get('plaster', '#8a7048', { seed: 77 }));
    map.rotation.x = -Math.PI / 2; map.position.set(0, table.userData.topY + 0.012, -1);
    c.group.add(map);
    // Candles at the table corners (2D 0.22/0.78 × 0.48/0.72)
    [[-2, -2.4], [2, -2.4], [-2, 0.4], [2, 0.4]].forEach(([x, z], i) => {
      const cd = add(c, P().candle({ light: i < 2, intensity: 0.75, range: 7 }), x, z);
      cd.position.y = table.userData.topY;
    });
    // Narrow window (2D 0.88)
    const win = add(c, P().stainedWindow({ seed: 11, w: 0.5, h: 1.6 }), fx(c, 0.88), -c.depth / 2 + 0.45);
    win.position.y = 1.6;
    // Banner wall left (2D 0.08–0.18 rows)
    for (let i = 0; i < 3; i++) {
      const bn = add(c, P().banner({ color: '#3a4858', h: 1.6, w: 0.7 }), -c.width / 2 + 0.6, -3.5 + i * 2.4);
      bn.position.y = 3.4; bn.rotation.y = Math.PI / 2;
    }
    return finish(c, {
      boardAnchor: { x: 0, z: 0.2, rotY: 0 },
      stage: { center: [0, 0, 2.2], right: [1, 0, 0], forward: [0, 0, 1], width: 9, depth: 4 },
      tableStyle: 'wood',
      spawn: { x: 0, z: 4.2, facing: Math.PI },
    });
  };

  // Ch4 — Valdris throne room: pale cold hall, column rows, elliptical floor
  // inlay, lone throne. Hub stage for chapter 4 (L19536).
  BUILDERS.valdris_throne_room = function (opts) {
    const hub = opts && opts.hub;
    const c = ctx(hub ? 26 : 20, hub ? 24 : 17);
    atmosphere(c, {
      sky: '#262c38', fog: '#2a3040', fogNear: hub ? 14 : 11, fogFar: hub ? 40 : 32,
      hemi: ['#7a8ca6', '#3a404a', 1.05],
      sun: { color: '#aebed8', i: 0.45, pos: [-6, 14, -4], shadowSize: hub ? 18 : 13 }, // pale shafts
    });
    // Pale stone floor with elliptical inlay rings
    ground(c, 'stone', '#3a404a', 6);
    const ring = new THREE.Mesh(P().geo('vt-ring', () => new THREE.RingGeometry(2.2, 2.35, 48)), M().flat('#404858', { roughness: 0.6 }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.02, 1);
    c.group.add(ring);
    const ring2 = new THREE.Mesh(P().geo('vt-ring2', () => new THREE.RingGeometry(3.2, 3.32, 48)), M().flat('#404858', { roughness: 0.6 }));
    ring2.rotation.x = -Math.PI / 2; ring2.position.set(0, 0.02, 1);
    c.group.add(ring2);
    room(c, 8, M().get('stone', '#2a3040'), {});
    // Column rows (2D 0.08 + i*0.14, six columns) + drifting dust motes
    for (let i = 0; i < 6; i++) {
      [-1, 1].forEach(side => {
        addC(c, P().column({ h: 8, color: '#2a3840' }),
          side * (c.width / 2 - 2.6), -c.depth / 2 + 2.5 + i * (c.depth - 5) / 5, 0, 0.8, 0.8);
      });
    }
    add(c, NS.FX.motes({ count: 18, w: c.width - 6, h: 5, d: c.depth - 6 }), 0, 0).position.y = 1;
    // The borrowed throne — centre back, alone, under Pale Court grey
    addC(c, P().throne({ color: '#1a1e26' }), 0, -c.depth / 2 + 2.2, 0, 1.3, 1.1);
    addC(c, P().flag({ color: '#6a7280', trim: '#c8ccd4', seed: 6 }), -3, -c.depth / 2 + 3.2, 0.5, 0.25, 0.25);
    addC(c, P().flag({ color: '#6a7280', trim: '#c8ccd4', seed: 7 }), 3, -c.depth / 2 + 3.2, -0.5, 0.25, 0.25);
    const cold = new THREE.PointLight(0x8aa0c8, 0.7, 12, 2);
    cold.position.set(0, 3.4, -c.depth / 2 + 3);
    c.group.add(cold);
    if (hub) {
      c.npcSlots = [
        { x: 0, z: -7.5, facing: 0 },  // boss — at the throne
        { x: 8, z: 8, facing: -Math.PI / 3 },
      ];
    }
    return finish(c, {
      boardAnchor: { x: 0, z: 1, rotY: 0 },
      spawn: { x: 0, z: hub ? c.depth / 2 - 7 : c.depth / 2 - 4, facing: Math.PI },
      stage: { center: [0, 0, -1], right: [1, 0, 0], forward: [0, 0, 1], width: 12, depth: 6 },
      tableStyle: 'stone',
      camera: { hubHeight: 3.4 },
    });
  };

  // Ch5 — the clearing: black night, star sky, tree walls left/right, one
  // small fire, distant camp lights. Hub stage for chapter 5 (L19553).
  BUILDERS.clearing_ch5 = function (opts) {
    const hub = opts && opts.hub;
    const c = ctx(hub ? 26 : 20, hub ? 24 : 18);
    atmosphere(c, {
      sky: '#060810', fog: '#070a12', fogNear: 9, fogFar: hub ? 30 : 24,
      hemi: ['#26365c', '#10141c', 0.8],
      sun: { color: '#7a90c0', i: 0.28, pos: [-10, 20, -4], shadow: false }, // faint moon
    });
    ground(c, 'ground', '#10140e', 7);
    // The clearest star field in the game (2D: 40 stars over the clearing)
    add(c, NS.FX.stars({ count: 110, radius: hub ? 24 : 19, moon: true }), 0, 0);
    add(c, P().scatter({ w: c.width - 6, d: c.depth - 6, count: 18, clear: 3.5, grassColor: '#1c2818', grassColor2: '#141e10' }), 0, 0);
    // Tree walls on both flanks (2D trunk strips 0.02–0.18 / 0.72–0.88)
    for (let i = 0; i < (hub ? 7 : 5); i++) {
      [-1, 1].forEach(side => {
        const x = side * (c.width / 2 - 1.5 - (i % 3) * 1.6);
        const z = -c.depth / 2 + 2 + i * (c.depth - 4) / (hub ? 6 : 4);
        addC(c, P().tree({ h: 4.5 + (i % 2), color: '#101c12' }), x, z, 0, 0.4, 0.4);
      });
    }
    for (let i = 0; i < 4; i++) {
      addC(c, P().tree({ h: 4 + (i % 2), color: '#0e180f' }), -c.width / 2 + 3 + i * (c.width - 6) / 3, -c.depth / 2 + 1.2, 0, 0.4, 0.4);
    }
    // The small personal campfire
    add(c, P().campfire({ light: true, intensity: 2.2, range: 15, scale: 0.8 }), 0, 0.5);
    collide(c, 0, 0.5, 0.7, 0.7);
    // Two log seats — "just the two of you"
    [[-1.4, 1.6, 0.6], [1.4, 1.6, -0.6]].forEach(([x, z, r]) => {
      const log = new THREE.Mesh(P().CYL(), M().get('wood', '#2a1e14'));
      log.scale.set(0.2, 1.2, 0.2); log.rotation.z = Math.PI / 2; log.rotation.y = r;
      log.position.set(x, 0.2, z); log.castShadow = true;
      c.group.add(log);
      collide(c, x, z, 0.6, 0.3);
    });
    // Distant camp lights through the trees (2D right edge dots)
    for (let i = 0; i < 4; i++) {
      const glow = new THREE.Mesh(P().SPHERE(), M().glow('#e08020', 0.8));
      glow.scale.setScalar(0.1);
      glow.position.set(c.width / 2 - 0.5, 1 + i * 0.1, -3 + i * 1.8);
      c.group.add(glow);
    }
    if (hub) {
      c.npcSlots = [
        { x: 0, z: -2.2, facing: 0 },  // Saoirse, across the fire
        { x: 7, z: 7, facing: -Math.PI / 3 },
      ];
    }
    return finish(c, {
      boardAnchor: { x: 0, z: 2.6, rotY: 0 },
      spawn: { x: 0, z: hub ? c.depth / 2 - 6 : c.depth / 2 - 3, facing: Math.PI },
      stage: { center: [0, 0, -0.4], right: [1, 0, 0], forward: [0, 0, 1], width: 9, depth: 4.5 },
      tableStyle: 'stone',
      camera: { hubHeight: 3 },
    });
  };

  // Ch2 sidequest — archivist's room: bookshelf walls, candle row, long table (L19585).
  BUILDERS.archivist_room = function () {
    const c = ctx(13, 11);
    atmosphere(c, {
      sky: '#332418', fog: '#332418', fogNear: 8, fogFar: 22,
      hemi: ['#8a7050', '#4a3422', 1.0],
    });
    ground(c, 'wood', '#3a2c1c', 4);
    room(c, 3.8, M().get('plaster', '#432e1e'), { ceiling: true, ceilingMat: M().get('wood', '#241a10') });
    // Bookshelves along both side walls
    const shelfM = M().get('wood', '#1a120a');
    const bookColors = ['#5a3a1a', '#3a2810', '#3a1a08'];
    [-1, 1].forEach(side => {
      for (let s = 0; s < 3; s++) {
        const shelf = new THREE.Group();
        const back = new THREE.Mesh(P().BOX(), shelfM);
        back.scale.set(2.6, 3.2, 0.3); back.position.y = 1.6;
        shelf.add(back);
        for (let r = 0; r < 4; r++) {
          for (let b = 0; b < 9; b++) {
            if ((r * 9 + b + s) % 4 === 0) continue;
            const book = new THREE.Mesh(P().BOX(), M().flat(bookColors[(b + r) % 3], { roughness: 0.9 }));
            book.scale.set(0.18, 0.5 + (b % 3) * 0.06, 0.16);
            book.position.set(-1.1 + b * 0.26, 0.6 + r * 0.75, side * -0.12);
            shelf.add(book);
          }
        }
        shelf.traverse(o => { o.castShadow = false; o.receiveShadow = true; });
        addC(c, shelf, side * (c.width / 2 - 0.5), -3 + s * 3, side * Math.PI / 2 * -1, 0.5, 1.4);
      }
    });
    // Long reading table with the candle row (2D 0.35–0.65)
    const rtable = addC(c, P().boardTable({ topSize: 3, topY: 0.9, color: '#2a1a0a' }), 0, -0.5, 0, 1.7, 1.7);
    [-0.9, 0, 0.9].forEach((x, i) => {
      const cd = add(c, P().candle({ light: i === 1, intensity: 0.85, range: 8 }), x, -1.6);
      cd.position.y = rtable.userData.topY;
    });
    add(c, NS.FX.motes({ count: 10, w: c.width - 4, h: 2.6, d: c.depth - 4 }), 0, 0).position.y = 0.8;
    return finish(c, {
      boardAnchor: { x: 0, z: -0.3 },
      stage: { center: [0, 0, 1.6], right: [1, 0, 0], forward: [0, 0, 1], width: 8, depth: 3.6 },
      spawn: { x: 0, z: 3.6, facing: Math.PI },
    });
  };

  // Ch3 sidequest — tavern at sunset: pitched-roof tavern, warm door, sign (L19613).
  BUILDERS.tavern_exterior = function () {
    const c = ctx(22, 16);
    atmosphere(c, {
      sky: '#cc8c42', fog: '#b88050', fogNear: 12, fogFar: 36,
      hemi: ['#e8ab3c', '#867060', 0.7],
      sun: { color: '#ffae50', i: 0.65, pos: [-12, 6, 5] },
    });
    ground(c, 'ground', '#867060', 6);
    // The tavern (2D 0.2–0.75) with a glowing doorway and smoking chimney
    const tav = P().building({ w: 9, d: 6, h: 3.6, wallColor: '#484038', roofColor: '#2a2018', windows: 3, glowWindows: true, doorSide: 's', chimney: true });
    addC(c, tav, -1, -4, 0, 4.6, 3.2);
    add(c, P().scatter({ w: c.width - 4, d: c.depth - 4, count: 22, clear: 3, grassColor: '#6a5e48', grassColor2: '#5a5040' }), 0, 0);
    // Door light spill
    const spill = new THREE.PointLight(0xe0a030, 1.2, 9, 2);
    spill.position.set(-1, 1.4, -0.6);
    c.group.add(spill);
    // Hanging sign (2D 0.57–0.60)
    const signG = new THREE.Group();
    const bracket = new THREE.Mesh(P().BOX(), M().get('metal', '#2a2018'));
    bracket.scale.set(0.8, 0.06, 0.06); bracket.position.set(0.4, 2.6, 0);
    signG.add(bracket);
    const board = new THREE.Mesh(P().BOX(), M().get('wood', '#5a4226'));
    board.scale.set(0.7, 0.5, 0.06); board.position.set(0.7, 2.2, 0);
    board.castShadow = true;
    signG.add(board);
    signG.userData.animators = [(t) => { board.rotation.x = 0.08 * Math.sin(t * 1.3); }];
    add(c, signG, 2.4, -1.05);
    // Step + bench where the old soldier drinks
    addC(c, P().crate({ size: 0.5 }), 1.2, -0.4, 0.4, 0.4, 0.4);
    const bench = new THREE.Mesh(P().BOX(), M().get('wood', '#4a3322'));
    bench.scale.set(1.6, 0.4, 0.5); bench.position.set(2.6, 0.2, -0.5);
    bench.castShadow = true; bench.receiveShadow = true;
    c.group.add(bench); collide(c, 2.6, -0.5, 0.9, 0.35);
    // A barrel and lantern
    addC(c, P().barrel({}), -4.6, -0.4, 0, 0.4, 0.4);
    addC(c, P().lanternPost({ light: true }), 4.6, -2, 0, 0.25, 0.25);
    return finish(c, {
      boardAnchor: { x: 1.2, z: 2.4 },
      stage: { center: [0, 0, 2.4], right: [1, 0, 0], forward: [0, 0, 1], width: 11, depth: 5 },
      spawn: { x: 0, z: 5, facing: Math.PI },
    });
  };

  // Ch3 sidequest — abandoned farmhouse: collapsed roof, broken chimney,
  // overgrown garden (L19637).
  BUILDERS.abandoned_farmhouse = function () {
    const c = ctx(22, 16);
    atmosphere(c, {
      sky: '#888888', fog: '#8a8a86', fogNear: 12, fogFar: 38,
      hemi: ['#9a9a96', '#2e2416', 0.7],
      sun: { color: '#c8c4b8', i: 0.5, pos: [8, 14, 6] },
    });
    ground(c, 'ground', '#2e2416', 6);
    // Farmhouse (2D 0.25–0.75) — roof half-collapsed
    const fh = new THREE.Group();
    const wallM = M().get('plaster', '#3a3228', { seed: 83 });
    const wall = new THREE.Mesh(P().BOX(), wallM);
    wall.scale.set(7, 2.6, 4.6); wall.position.y = 1.3;
    wall.castShadow = true; wall.receiveShadow = true;
    fh.add(wall);
    // Tilted, partially fallen roof slab
    const roof = new THREE.Mesh(P().BOX(), M().get('wood', '#1a1410'));
    roof.scale.set(7.6, 0.2, 3.2); roof.position.set(-0.6, 2.9, -0.8); roof.rotation.z = 0.12; roof.rotation.x = -0.25;
    roof.castShadow = true;
    fh.add(roof);
    // Broken chimney (2D 0.68)
    const chim = new THREE.Mesh(P().BOX(), M().get('stone', '#262420'));
    chim.scale.set(0.7, 1.6, 0.7); chim.position.set(2.6, 3.0, 0.4); chim.rotation.z = -0.08;
    chim.castShadow = true;
    fh.add(chim);
    addC(c, fh, 0, -4, 0, 3.7, 2.5);
    // Overgrown garden rows (2D 0.40–0.55 greens)
    for (let i = 0; i < 6; i++) {
      const bush = new THREE.Mesh(P().SPHERE(), M().get('fabric', '#3a5028', { seed: 95 }));
      bush.scale.set(0.5, 0.35, 0.5);
      bush.position.set(-2.4 + i * 0.9, 0.18, 0.8 + Math.sin(i) * 0.5);
      bush.castShadow = true;
      c.group.add(bush);
    }
    addC(c, P().fence({ len: 5 }), -1, 2.2, 0.1, 2.5, 0.2);
    add(c, P().scatter({ w: c.width - 4, d: c.depth - 4, count: 26, clear: 2.5, grassColor: '#4a6038', grassColor2: '#3a5028' }), 0, 0);
    return finish(c, {
      boardAnchor: { x: 0.5, z: 4 },
      stage: { center: [0, 0, 2.6], right: [1, 0, 0], forward: [0, 0, 1], width: 11, depth: 5 },
      spawn: { x: 0, z: 5.5, facing: Math.PI },
    });
  };

  // ── Hub mapping per chapter ──────────────────────────────────────────
  const CHAPTER_HUBS = {
    ch1: 'palace_great_hall',
    ch2: 'army_camp_night',
    ch3: 'valdris_border_town',
    ch4: 'valdris_throne_room',
    ch5: 'clearing_ch5',
  };

  function build(bgId, opts) {
    const builder = BUILDERS[bgId] || BUILDERS.palace_great_hall;
    if (!BUILDERS[bgId]) console.warn('[Story3D] no environment for bg "' + bgId + '", using palace_great_hall');
    const env = builder(opts || {});
    env.bgId = bgId;
    return env;
  }

  function buildHub(chapterId) {
    const env = build(CHAPTER_HUBS[chapterId] || 'palace_great_hall', { hub: true });
    env.chapterId = chapterId;
    return env;
  }

  return { build, buildHub, BUILDERS, CHAPTER_HUBS };
});
