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
    // ground tone for image-based lighting (the hemi ground colour reads as
    // bounced light from the floor); falls back to a darkened sky
    c.envGround = new THREE.Color(mood.hemi ? mood.hemi[1] : (mood.fog || mood.sky));
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
        sun.shadow.normalBias = 0.025;  // kills shadow-acne on the curved figures
        sun.shadow.radius = 4;          // soft PCF edges, less hard-cut
      }
      c.group.add(sun);
      c.group.add(sun.target);
    }
  }

  /** Interior room shell: adds 4 walls + colliders (floor done separately). */
  function room(c, h, wallMat, opts) {
    opts = opts || {};
    c.indoor = true; // a 4-walled shell — knights go unmounted here (horses outside only)
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

  /** Distant, non-accessible scenery beyond the playable bounds, so no
   *  exterior ever ends in a void: the ground runs to the horizon, with a
   *  ring of haze-dimmed hills and style-specific silhouettes (castle
   *  towers, forest walls, rooftops, ash ridges) tucked just inside the fog. */
  function backdrop(c, opts) {
    opts = opts || {};
    const far = (c.fog ? c.fog.far : 50) * 0.72;
    // the world continues underfoot
    const farGround = new THREE.Mesh(
      P().geo('bd-ground', () => new THREE.PlaneGeometry(220, 220)),
      M().get('ground', opts.ground || '#3a3428', { repeat: 30 })
    );
    farGround.rotation.x = -Math.PI / 2;
    farGround.position.y = -0.06;
    farGround.receiveShadow = true;
    c.group.add(farGround);
    const put = (m, x, z) => { m.position.x = x; m.position.z = z; m.castShadow = false; m.receiveShadow = false; c.group.add(m); };
    // ring of low hills
    const hillMat = M().get('ground', opts.hillColor || '#3a4030', { seed: 151 });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.35;
      const hill = new THREE.Mesh(P().SPHERE(), hillMat);
      const s = far * (0.35 + (i % 3) * 0.12);
      hill.scale.set(s, s * 0.22, s * 0.7);
      hill.rotation.y = a;
      put(hill, Math.cos(a) * far * 1.05, Math.sin(a) * far * 1.05);
      hill.position.y = -s * 0.04;
    }
    const style = opts.style;
    if (style === 'castle') {
      // the rest of Caer Aurveld looming past the wall
      const stone = M().get('stone', '#2c2820', { seed: 153 });
      [[-0.32, 1.15, 7], [-0.12, 1.0, 10], [0.1, 1.1, 8], [0.3, 0.95, 12]].forEach(([fxr, hk, w]) => {
        const tower = new THREE.Mesh(P().CYL(), stone);
        tower.scale.set(2.6, far * 0.28 * hk, 2.6);
        put(tower, fxr * far * 2, -far);
        tower.position.y = far * 0.14 * hk;
        const cap = new THREE.Mesh(P().CONE(), M().get('fabric', '#4a2020', { seed: 155 }));
        cap.scale.set(3.2, 2.6, 3.2);
        put(cap, fxr * far * 2, -far);
        cap.position.y = far * 0.28 * hk + 1.2;
        const keep = new THREE.Mesh(P().BOX(), stone);
        keep.scale.set(w, far * 0.16, 4);
        put(keep, fxr * far * 2 + w * 0.6, -far * 1.04);
        keep.position.y = far * 0.08;
      });
    } else if (style === 'forest') {
      const dark = M().get('fabric', opts.treeColor || '#1e2c1e', { seed: 157 });
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        const tr = new THREE.Mesh(P().CONE(), dark);
        const s = 2.2 + (i % 4) * 0.9;
        tr.scale.set(s, s * 2.4, s);
        put(tr, Math.cos(a) * far * (0.82 + (i % 3) * 0.1), Math.sin(a) * far * (0.82 + (i % 3) * 0.1));
        tr.position.y = s * 1.1;
      }
    } else if (style === 'town') {
      const wallM = M().get('plaster', '#3e382e', { seed: 159 });
      const roofM = M().get('wood', '#241c12', { seed: 161 });
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + 0.2;
        const x = Math.cos(a) * far * 0.95, z = Math.sin(a) * far * 0.95;
        const hN = 2.5 + (i % 3);
        const house = new THREE.Mesh(P().BOX(), wallM);
        house.scale.set(4 + (i % 2) * 2, hN, 4);
        put(house, x, z);
        house.position.y = hN / 2;
        const roof = new THREE.Mesh(P().CONE(), roofM);
        roof.scale.set(3.6, 2, 3.6);
        put(roof, x, z);
        roof.position.y = hN + 0.9;
      }
    } else if (style === 'ashen') {
      const ridge = M().get('stone', '#26221c', { seed: 163 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.5;
        const r = new THREE.Mesh(P().CONE(), ridge);
        const s = far * 0.3;
        r.scale.set(s, s * 0.5, s * 0.5);
        put(r, Math.cos(a) * far * 1.1, Math.sin(a) * far * 1.1);
        r.position.y = s * 0.18;
      }
      // far smoke plumes — something is always burning out there
      [[-0.6, -1], [0.7, -0.9]].forEach(([px, pz]) => {
        const sm = NS.FX.smokeColumn({ opacity: 0.12 });
        sm.position.set(px * far, far * 0.1, pz * far);
        sm.scale.setScalar(4);
        c.group.add(sm);
      });
    }
  }

  function finish(c, extras) {
    const out = Object.assign({
      group: c.group,
      colliders: c.colliders,
      bounds: c.bounds,
      npcSlots: c.npcSlots,
      sky: c.sky, fog: c.fog, envGround: c.envGround, indoor: !!c.indoor,
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
    const c = ctx(hub ? 44 : 22, hub ? 38 : 18); // the hub is a true great hall, not a room
    atmosphere(c, {
      sky: '#2a2018', fog: '#2a2018', fogNear: hub ? 22 : 12, fogFar: hub ? 64 : 34,
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
    // Column rows framing the hall (fluted, with bases and capitals) —
    // the hub gets a double colonnade with side rugs to read as wings
    [-1, 1].forEach(side => {
      const rows = hub ? 6 : 3;
      const gap = hub ? (c.depth - 8) / (rows - 1) : 5.5;
      for (let i = 0; i < rows; i++) {
        const colZ = -c.depth / 2 + 4 + i * gap;
        addC(c, P().column({ h: 7, color: '#443a2e' }), side * (c.width / 2 - 3), colZ, 0, 0.7, 0.7);
        if (hub) addC(c, P().column({ h: 7, color: '#443a2e' }), side * (c.width / 2 - 10), colZ, 0, 0.7, 0.7);
      }
      if (hub) {
        add(c, P().rug({ w: 2, d: c.depth * 0.55, color: '#3e4a42', border: '#2a342c' }), side * (c.width / 2 - 6.5), 0);
        // side-wing dressing: tables, banners, braziers
        addC(c, P().boardTable({ topSize: 1.6, topY: 0.85, color: '#3c2c18' }), side * (c.width / 2 - 6.5), -c.depth / 4, 0, 1, 1);
        addC(c, P().barrel({}), side * (c.width / 2 - 5), c.depth / 4, 0, 0.4, 0.4);
        const wb = add(c, P().banner({ color: side < 0 ? M().PALETTE.bannerGold : M().PALETTE.bannerGreen, h: 2.4, seed: 8 + side }), side * (c.width / 2 - 0.8), 0);
        wb.position.y = 5; wb.rotation.y = side * -Math.PI / 2;
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
      // NPC stations along the colonnade + by the throne dais
      c.npcSlots = [
        { x: -8, z: -9, facing: Math.PI / 3 },
        { x: 8, z: -9, facing: -Math.PI / 3 },
        { x: -11, z: 1, facing: Math.PI / 2 },
        { x: 11, z: 1, facing: -Math.PI / 2 },
        { x: -5, z: 8, facing: 0.4 },
        { x: 5, z: 8, facing: -0.4 },
        { x: 0, z: -12, facing: 0 },               // boss — before the throne
        { x: -14, z: 11, facing: Math.PI / 4 },    // merchant corner
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

  // Ch1 HUB — the palace complex: five rooms off a central corridor, per the
  // floor plan: barracks + library north, chapel + armory south, and the
  // great throne hall filling the east end. Door gaps carry lintels; every
  // room is furnished to read at a glance.
  BUILDERS.palace_complex = function () {
    const c = ctx(80, 48);
    c.indoor = true; // knights stand unmounted (it's mostly a castle)
    atmosphere(c, {
      sky: '#c8b89c', fog: '#cabfa8', fogNear: 26, fogFar: 80, // warm late-day light
      hemi: ['#d0c4a4', '#5a4a32', 1.15],
      sun: { color: '#ffe2b0', i: 0.85, pos: [14, 22, 12], shadow: true, shadowSize: 32 },
    });
    backdrop(c, { ground: '#4a5026', hillColor: '#5a6838', style: 'castle' });
    // grass for the exterior, west of the castle's west wall (x = -17)
    const exGrass = new THREE.Mesh(P().geo('pc-ex-grass', () => new THREE.PlaneGeometry(26, 44)), M().get('ground', '#4a5628', { repeat: 16 }));
    exGrass.rotation.x = -Math.PI / 2; exGrass.position.set(-30, 0.006, 0); exGrass.receiveShadow = true; c.group.add(exGrass);
    ground(c, 'stone', '#3e3428', 9);
    // checkered floor under the throne hall only
    const hallFloor = new THREE.Mesh(
      P().geo('pcfloor', () => new THREE.PlaneGeometry(12, 24)),
      (() => {
        const t = NS.Textures.checker('#4a3c2a', '#342a1c', 13, 512, 10);
        const m = new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bumpMap, bumpScale: 0.04, roughnessMap: t.roughnessMap });
        m.userData.story3dShared = true;
        return m;
      })()
    );
    hallFloor.rotation.x = -Math.PI / 2;
    hallFloor.position.set(11, 0.012, 0);
    hallFloor.receiveShadow = true;
    c.group.add(hallFloor);

    const wallMat = M().get('stone', '#3a3026');
    const seg = (x, z, w, d, h, y) => {
      const m = new THREE.Mesh(P().BOX(), wallMat);
      m.scale.set(w, h || 5, d);
      m.position.set(x, y !== undefined ? y : (h || 5) / 2, z);
      m.receiveShadow = true;
      c.group.add(m);
      if (y === undefined) collide(c, x, z, w / 2, d / 2);
    };
    const wallX = (z, x1, x2, doors) => {
      const pts = [x1, ...(doors || []).flatMap(d => [d - 1, d + 1]), x2];
      for (let i = 0; i < pts.length; i += 2) if (pts[i + 1] - pts[i] > 0.05) seg((pts[i] + pts[i + 1]) / 2, z, pts[i + 1] - pts[i], 0.4);
      (doors || []).forEach(d => seg(d, z, 2, 0.4, 1.6, 4.2)); // lintel over the door
    };
    const wallZ = (x, z1, z2, doors) => {
      const pts = [z1, ...(doors || []).flatMap(d => [d - 1, d + 1]), z2];
      for (let i = 0; i < pts.length; i += 2) if (pts[i + 1] - pts[i] > 0.05) seg(x, (pts[i] + pts[i + 1]) / 2, 0.4, pts[i + 1] - pts[i]);
      (doors || []).forEach(d => seg(x, d, 0.4, 2, 1.6, 4.2));
    };
    // perimeter (the west wall has the main gate out to the courtyard)
    wallX(-12, -17, 17); wallX(12, -17, 17);
    wallZ(-17, -12, 12, [0]); wallZ(17, -12, 12);
    // corridor (z −4…4): doors north into barracks/library, south into chapel/armory
    wallX(-4, -17, 5, [-12, -1]);
    wallX(4, -17, 5, [-12, -1]);
    // throne hall west wall (door from the corridor) + room separators
    wallZ(5, -12, 12, [0]);
    wallZ(-7, -12, -4);
    wallZ(-7, 4, 12);

    // corridor: long runner + torch rows
    add(c, P().rug({ w: 2.4, d: 20, color: '#5a1c1c', border: '#3a1212' }), -6, 0, Math.PI / 2);
    [-15, -10, -5, 0].forEach(x => {
      const t1 = add(c, P().torch({ light: true }), x, -3.55); t1.position.y = 2.2;
      const t2 = add(c, P().torch({ light: x % 10 === 0 }), x, 3.55); t2.position.y = 2.2;
    });

    // throne hall — dais east, colonnade, windows, the court's colours
    addC(c, P().throne(), 15.3, 0, -Math.PI / 2, 1.1, 1.3);
    const glowL = new THREE.PointLight(0xffd670, 0.9, 11, 2);
    glowL.position.set(14.4, 2.6, 0);
    c.group.add(glowL);
    add(c, P().rug({ w: 2.4, d: 9, color: '#5a1c1c', border: '#3a1212' }), 10.5, 0, Math.PI / 2);
    [[8, -7], [8, 7], [14, -7], [14, 7]].forEach(([x, z]) => addC(c, P().column({ h: 7, color: '#443a2e' }), x, z, 0, 0.7, 0.7));
    [-4, 4].forEach(z => {
      const win = add(c, P().stainedWindow({ seed: 4 + z, shaft: z < 0, shaftH: 6 }), 16.6, z, -Math.PI / 2);
      win.position.y = 3.2;
      const b = add(c, P().banner({ color: z < 0 ? M().PALETTE.bannerGold : M().PALETTE.bannerGreen, h: 2.6, seed: 9 + z }), 16.7, z * 2.2);
      b.position.y = 5.4; b.rotation.y = -Math.PI / 2;
    });
    addC(c, P().flag({ color: '#e4c058', trim: '#c8a040', seed: 1 }), 14.5, -3.4, 0.4, 0.25, 0.25);
    addC(c, P().flag({ color: '#68a048', trim: '#c8a040', seed: 2 }), 14.5, 3.4, -0.4, 0.25, 0.25);
    addC(c, P().boardTable({ topSize: 1.6, topY: 0.85, color: '#3c2c18' }), 8.5, -9.5, 0.3, 1, 1);

    // barracks (NW): bunked crates, barrels, a rack against the wall
    addC(c, P().crate({}), -15.5, -10.5, 0.2, 0.5, 0.5);
    addC(c, P().crate({}), -14.3, -10.8, -0.3, 0.5, 0.5);
    addC(c, P().barrel({}), -8.5, -10.8, 0, 0.4, 0.4);
    addC(c, P().fence({ w: 3 }), -11, -11.4, 0, 1.5, 0.3);
    const bt = add(c, P().torch({ light: true }), -12, -11.6); bt.position.y = 2.2;

    // library (N-mid): reading table, candles, the chronicler's banner
    addC(c, P().boardTable({ topSize: 1.8, topY: 0.85, color: '#33261a' }), -1, -8.5, 0.2, 1.1, 1.1);
    add(c, P().candle({}), -1.6, -8.2).position.y = 0.9;
    add(c, P().candle({}), -0.4, -8.8).position.y = 0.9;
    const lb = add(c, P().banner({ color: M().PALETTE.bannerGold, h: 2.2, seed: 12 }), -1, -11.6);
    lb.position.y = 4.6;
    addC(c, P().crate({}), 3.5, -10.5, 0.4, 0.5, 0.5);

    // chapel (SW): aisle rug, candle rows, a west window throwing light
    add(c, P().rug({ w: 1.8, d: 6, color: '#3e4a42', border: '#2a342c' }), -12, 8);
    [[-14.5, 6.2], [-9.5, 6.2], [-14.5, 10], [-9.5, 10]].forEach(([x, z]) => {
      const cd = add(c, P().candle({}), x, z); cd.position.y = 0.0; cd.scale.setScalar(2.2);
    });
    const cw = add(c, P().stainedWindow({ seed: 11, shaft: true, shaftH: 6 }), -16.6, 8, Math.PI / 2);
    cw.position.y = 3.2;

    // armory (S-mid): the royal armory — stall counter, barrels, crates
    addC(c, P().stall({ w: 3 }), -1, 9.8, Math.PI, 1.6, 1 );
    addC(c, P().barrel({}), 3.4, 10.6, 0, 0.4, 0.4);
    addC(c, P().crate({}), 2.3, 10.9, 0.5, 0.5, 0.5);
    addC(c, P().crate({}), -4.8, 10.6, -0.2, 0.5, 0.5);

    // ════ EXTERIOR — walk out the west gate into the courtyard & country ══
    const exWall = (x, z, w, d, h) => {
      const m = new THREE.Mesh(P().BOX(), wallMat);
      m.scale.set(w, h || 4.5, d); m.position.set(x, (h || 4.5) / 2, z);
      m.castShadow = true; m.receiveShadow = true; c.group.add(m);
      collide(c, x, z, w / 2, d / 2);
    };
    // curtain walls enclosing the courtyard, with a west gatehouse (gap z-2..2)
    exWall(-23, -14, 13, 0.6); exWall(-23, 14, 13, 0.6);
    exWall(-29.5, -8.5, 0.6, 11); exWall(-29.5, 8.5, 0.6, 11);
    [[-29.5, -3], [-29.5, 3]].forEach(([x, z]) => {
      const tw = new THREE.Mesh(P().CYL(), wallMat); tw.scale.set(1.3, 7, 1.3); tw.position.set(x, 3.5, z);
      tw.castShadow = true; c.group.add(tw); collide(c, x, z, 0.8, 0.8);
    });

    // courtyard well
    {
      const well = new THREE.Group();
      const w1 = new THREE.Mesh(P().geo('pc-well', () => new THREE.CylinderGeometry(0.8, 0.85, 0.8, 12)), M().get('stone', '#48382a'));
      w1.position.y = 0.4; w1.castShadow = w1.receiveShadow = true; well.add(w1);
      const wp = new THREE.Mesh(P().CYL(), M().get('wood', '#2a2018')); wp.scale.set(0.07, 1.6, 0.07); wp.position.y = 1.2; well.add(wp);
      const wr = new THREE.Mesh(P().CONE(), M().get('wood', '#3a2a1a')); wr.scale.set(1.4, 0.6, 1.4); wr.position.y = 2.1; wr.castShadow = true; well.add(wr);
      addC(c, well, -21, 6, 0, 1, 1);
    }

    // BLACKSMITH (courtyard SW): forge with glowing coals, anvil, smoke
    {
      const forge = new THREE.Mesh(P().BOX(), M().get('stone', '#3a342c'));
      forge.scale.set(1.6, 1.0, 1.2); forge.position.set(-24, 0.5, -6); forge.castShadow = forge.receiveShadow = true;
      c.group.add(forge); collide(c, -24, -6, 0.9, 0.7);
      const coals = new THREE.Mesh(P().BOX(), M().flat('#ff6a1a', { emissive: '#ff5a10', emissiveIntensity: 1.7, roughness: 0.6 }));
      coals.scale.set(0.7, 0.12, 0.5); coals.position.set(-24, 1.05, -6); c.group.add(coals);
      const fl = new THREE.PointLight(0xff7a30, 1.4, 7, 2); fl.position.set(-24, 1.4, -6); c.group.add(fl);
      add(c, NS.FX.smokeColumn({ opacity: 0.16 }), -24, -6.6).position.y = 1.4;
      const anvil = new THREE.Group();
      const ab = new THREE.Mesh(P().BOX(), M().get('metal', '#3a3e44')); ab.scale.set(0.5, 0.18, 0.22); ab.position.y = 0.62; anvil.add(ab);
      const as = new THREE.Mesh(P().BOX(), M().get('metal', '#3a3e44')); as.scale.set(0.16, 0.42, 0.16); as.position.y = 0.36; anvil.add(as);
      anvil.traverse(o => { o.castShadow = true; });
      addC(c, anvil, -22, -4.6, 0, 0.4, 0.3);
      add(c, P().crate({}), -25.6, -4.2); add(c, P().barrel({}), -25.8, -7.4); // walk-over
    }

    // SHOPS (courtyard NW): market stalls + walk-over goods
    addC(c, P().stall({ color: '#8a4a3a' }), -24, 7, 0.2, 1.1, 0.6);
    addC(c, P().stall({ color: '#3a5a4a' }), -21, 9.5, -0.2, 1.1, 0.6);
    for (let i = 0; i < 3; i++) add(c, P().crate({ size: 0.5 }), -26 + i * 0.8, 8.5);

    // guards posted at the inner gate and the outer gatehouse (static, watching)
    const postGuard = (x, z, rotY) => {
      const guard = NS.Figures.buildById('guard', { chapterId: 'ch1' });
      guard.position.set(x, 0, z); guard.rotation.y = rotY; guard.userData.heading = rotY;
      if (guard.userData.setWalking) guard.userData.setWalking(false);
      c.group.add(guard);
    };
    postGuard(-18.6, -2.4, -Math.PI / 2); postGuard(-18.6, 2.4, -Math.PI / 2);
    postGuard(-28.4, -4.6, Math.PI / 2); postGuard(-28.4, 4.6, Math.PI / 2);
    [[-21, 0], [-26, -2.5], [-26, 2.5]].forEach(([x, z]) => add(c, P().lanternPost({ light: true }), x, z));

    // FARMS (beyond the west gatehouse): fenced crop plots, barn, cottage
    for (let p = 0; p < 3; p++) {
      const fz = -7 + p * 7;
      addC(c, P().fence({ len: 6 }), -35, fz - 2.4, 0, 3, 0.2);
      addC(c, P().fence({ len: 6 }), -35, fz + 2.4, 0, 3, 0.2);
      for (let r = 0; r < 5; r++) for (let cc = 0; cc < 3; cc++) { // crop rows — walk-over
        const crop = new THREE.Mesh(P().BOX(), M().get('fabric', cc % 2 ? '#5a7a2a' : '#6a8a32', { seed: 90 + r }));
        crop.scale.set(0.5, 0.4 + (r % 2) * 0.12, 0.3); crop.position.set(-38 + r * 1.3, 0.22, fz - 1.6 + cc * 1.6);
        crop.castShadow = true; c.group.add(crop);
      }
    }
    addC(c, P().building({ w: 5.5, d: 5, h: 4.2, wallColor: '#6a4a30', roofColor: '#3a2418', windows: 1, doorSide: 'e' }), -38, -12, 0, 2.7, 2.5); // barn
    addC(c, P().building({ w: 4, d: 4, h: 3, wallColor: '#7a6a4a', roofColor: '#3a2a1a', windows: 2, glowWindows: true, doorSide: 'e', chimney: true }), -37, 12, 0, 2, 2); // cottage
    add(c, NS.FX.smokeColumn({}), -36, 12).position.y = 4.2;
    for (let i = 0; i < 4; i++) add(c, P().barrel({ h: 0.7 }), -33 + (i % 2) * 1.2, -3 + Math.floor(i / 2) * 1.0); // hay, walk-over

    // farmers + citizens working the country (ambient, idle)
    [['#5a4a3a', -36, -1, 0.6], ['#4a3e50', -34, 5, -0.5], ['#6a5a3a', -39, 9, 0.2], ['#4a4438', -32, -9, 1.2]].forEach(([col, x, z, r]) => {
      const f = NS.Figures.build({ kind: 'human', color: col }, { scale: 0.96 });
      f.position.set(x, 0, z); f.rotation.y = r; f.userData.heading = r;
      c.group.add(f);
    });
    add(c, NS.FX.critters({ style: 'chicken', count: 5, range: 7 }), -34, 2);
    add(c, NS.FX.birds({ count: 4, radius: 13, h: 10 }), -28, 0);

    // NPC stations: posted through the rooms; boss + merchant keep the
    // last two slots (the populate order relies on it). The merchant is now
    // the blacksmith out in the courtyard.
    c.npcSlots = [
      { x: -12, z: -8, facing: 0.6 },           // barracks
      { x: -3.5, z: -8, facing: -0.4 },         // library
      { x: -12, z: 7, facing: -0.6 },           // chapel
      { x: -8.5, z: 0, facing: Math.PI / 2 },   // corridor west
      { x: 2, z: 2.4, facing: -0.5 },           // corridor east
      { x: 8, z: -4.5, facing: -0.4 },          // hall, north wing
      { x: 12.6, z: 0, facing: -Math.PI / 2 },  // boss — before the throne
      { x: -22.5, z: -5, facing: -Math.PI / 2 }, // merchant — the blacksmith
    ];
    return finish(c, {
      boardAnchor: { x: 10, z: 3, rotY: 0 },
      spawn: { x: -11.5, z: 0.4, facing: Math.PI / 2 },
      signpostPos: { x: -15.4, z: 3.2, rotY: -Math.PI / 4 }, // tucked into the SW corner, off the walkway
      stage: { center: [10, 0, -1], right: [1, 0, 0], forward: [0, 0, 1], width: 10, depth: 6 },
      tableStyle: 'stone',
      camera: { hubHeight: 2.9, hubDist: 4.4 },
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
    backdrop(c, { ground: '#3a2a1a', hillColor: '#2c3022', style: 'castle' });
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
    add(c, NS.FX.birds({ count: 3, radius: 7, h: 7 }), 0, 0);
    add(c, NS.FX.critters({ style: 'rabbit', count: 1, range: 4 }), -5, 3);
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
    backdrop(c, { ground: '#383022', hillColor: '#3e4a2c', style: 'forest', treeColor: '#26341f' });
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
    addC(c, P().windmill({ h: 5 }), -c.width / 2 + 4, -c.depth / 2 + 4, 0.5, 1.4, 1.4);
    add(c, NS.FX.water({ w: 1.6, l: c.depth - 2, color: '#3e6e8e' }), c.width / 2 - 4, 0);
    add(c, NS.FX.critters({ style: 'chicken', count: 3, range: 5 }), fx(c, 0.62), -3);
    add(c, NS.FX.birds({ count: 4, radius: 9, h: 9 }), 0, 0);
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
    backdrop(c, { ground: '#2a2014', hillColor: '#2a241c', style: 'ashen' });
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
    add(c, NS.FX.critters({ style: 'crow', count: 3, range: 5 }), fx(c, 0.6), -2);
    add(c, NS.FX.birds({ count: 2, radius: 8, h: 7, color: '#0e0c0a' }), 0, 0);
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
    const c = ctx(hub ? 46 : 24, hub ? 40 : 20);
    atmosphere(c, {
      sky: '#0c1016', fog: '#0a0e14', fogNear: hub ? 16 : 10, fogFar: hub ? 54 : 30,
      hemi: ['#34465f', '#1c2018', hub ? 0.85 : 0.8],  // darker camp; firelight does the work
      sun: { color: '#8ca0c8', i: hub ? 0.34 : 0.3, pos: [-8, 20, -10], shadow: hub, shadowSize: 28 },
    });
    ground(c, 'ground', '#222a20', 9);
    backdrop(c, { ground: '#1e261c', hillColor: '#1c2418', style: 'forest', treeColor: '#141c14' });
    add(c, NS.FX.stars({ count: hub ? 130 : 90, radius: hub ? 38 : 20, moon: true }), 0, 0);

    // central campfire + log seats (shared by both sizes)
    add(c, P().campfire({ light: true, intensity: hub ? 3.2 : 2.8, range: hub ? 20 : 18, embers: 14 }), 0, 0);
    collide(c, 0, 0, 0.7, 0.7);
    for (let i = 0; i < (hub ? 4 : 3); i++) {
      const a = (i / (hub ? 4 : 3)) * Math.PI * 2 + 0.5;
      const log = new THREE.Mesh(P().CYL(), M().get('wood', '#3a2a1a'));
      log.scale.set(0.18, 1.4, 0.18); log.rotation.z = Math.PI / 2; log.rotation.y = a;
      log.position.set(Math.cos(a) * 1.9, 0.18, Math.sin(a) * 1.9); log.castShadow = true;
      c.group.add(log); // walk-over (no collider)
    }
    addC(c, P().flag({ color: '#e4c058', trim: '#c8a040', seed: 3 }), 2.8, -1.6, 0.6, 0.2, 0.2);

    if (!hub) {
      // intimate camp for the fight
      [[0.25, -4], [0.4, -6], [0.62, -6], [0.76, -4]].forEach(([f, z], i) =>
        addC(c, P().tent({ w: 2.4, d: 2.8, h: 1.7, color: '#2a2218', glow: i % 2 === 0 }), fx(c, f), z, (i - 1.5) * 0.3, 1.3, 1.4));
      add(c, P().crate({ size: 0.7 }), fx(c, 0.08), 2); // walk-over
      return finish(c, {
        spawn: { x: 0, z: c.depth / 2 - 3.5, facing: Math.PI },
        stage: { center: [0, 0, 2.5], right: [1, 0, 0], forward: [0, 0, 1], width: 12, depth: 5.5 },
        boardAnchor: { x: 2.8, z: 2.2, rotY: 0.3 }, camera: { hubHeight: 3.2 },
      });
    }

    // ── BIG WAR CAMP ────────────────────────────────────────────────────
    const pathMat = M().get('ground', '#3a3022', { seed: 23 });
    const path = (x, z, w, d, rot) => {
      const p = new THREE.Mesh(P().geo(`c2path|${w}|${d}`, () => new THREE.PlaneGeometry(w, d)), pathMat);
      p.rotation.x = -Math.PI / 2; if (rot) p.rotation.z = rot;
      p.position.set(x, 0.015, z); p.receiveShadow = true; c.group.add(p);
    };
    path(0, 6, 3.4, 28); path(0, -6, 24, 3); path(0, 8, 22, 3);

    // command tent behind the fire + a war banner
    addC(c, P().tent({ w: 4, d: 4.6, h: 2.5, color: '#2e261a', glow: true }), 0, -7, 0, 2, 2.3);

    // tent rows forming the camp (left + right wings), small fires between
    const tentRow = (baseX, dir) => {
      for (let i = 0; i < 4; i++) {
        const z = -8 + i * 4.6;
        addC(c, P().tent({ w: 2.4 + (i % 2) * 0.4, d: 2.8, h: 1.7, color: '#2a2218', glow: i % 2 === 0 }), baseX, z, dir * 0.18, 1.3, 1.4);
        if (i % 2 === 1) add(c, P().campfire({ light: true, intensity: 1.7, range: 9 }), baseX - dir * 2.4, z);
      }
    };
    tentRow(-15, 1); tentRow(-10, 1); tentRow(15, -1); tentRow(10, -1);

    // supply depot (walk-over crates/barrels) + drill posts (walk-over)
    for (let i = 0; i < 7; i++) add(c, P().crate({ size: 0.6 + (i % 2) * 0.1 }), -8 + (i % 4) * 0.9, 10 + Math.floor(i / 4) * 0.9);
    add(c, P().barrel({}), -10, 10.4); add(c, P().barrel({}), -9.3, 11.1);
    [[7, 10], [8.6, 10.5], [7.8, 11.4]].forEach(([x, z]) => {
      const dm = new THREE.Mesh(P().CYL(), M().get('wood', '#1a1410')); dm.scale.set(0.12, 1.6, 0.12); dm.position.set(x, 0.8, z); dm.castShadow = true; c.group.add(dm);
      const dh = new THREE.Mesh(P().SPHERE(), M().get('fabric', '#3a3026')); dh.scale.set(0.28, 0.28, 0.28); dh.position.set(x, 1.7, z); c.group.add(dh);
    });

    // ── MESS AREA (north-west): cook fire, cauldron, long table + benches ──
    add(c, P().campfire({ light: true, intensity: 1.8, range: 9 }), -16, -13);
    {
      const cauldron = new THREE.Mesh(P().geo('c2-cauldron', () => new THREE.CylinderGeometry(0.42, 0.32, 0.5, 12)), M().get('metal', '#26282c'));
      cauldron.position.set(-16, 0.7, -13); cauldron.castShadow = true; c.group.add(cauldron); collide(c, -16, -13, 0.4, 0.4);
      const tripod = new THREE.Mesh(P().CYL(), M().get('wood', '#2a2018')); tripod.scale.set(0.04, 1.4, 0.04); tripod.position.set(-16, 0.7, -13.6); tripod.rotation.x = 0.3; c.group.add(tripod);
      addC(c, P().boardTable({ topSize: 3.2, topY: 0.8, color: '#3a2a18' }), -16, -16.5, Math.PI / 2, 1.8, 0.9);
      [-1.2, 1.2].forEach(dz => { const bench = new THREE.Mesh(P().BOX(), M().get('wood', '#33261a')); bench.scale.set(3, 0.18, 0.4); bench.position.set(-16, 0.32, -16.5 + dz); bench.castShadow = true; c.group.add(bench); });
      for (let i = 0; i < 3; i++) add(c, P().crate({ size: 0.5 }), -13.5 + i * 0.7, -15.5); // walk-over
    }

    // ── INFIRMARY (north-east): glowing tent, cots, a healer's table ──
    addC(c, P().tent({ w: 3.2, d: 3.6, h: 2.0, color: '#3a342a', glow: true }), 16, -14, -0.3, 1.6, 1.8);
    [[-0.9, -12.6], [0.9, -12.4]].forEach(([dx, z]) => {
      const cot = new THREE.Mesh(P().BOX(), M().get('fabric', '#6a6256', { seed: 95 })); cot.scale.set(0.7, 0.18, 1.6); cot.position.set(16 + dx, 0.22, z); cot.castShadow = true; c.group.add(cot);
    });
    add(c, P().candle({ light: true, intensity: 0.6, range: 5 }), 14.4, -12).position.y = 0.8;
    add(c, P().barrel({}), 18, -12.4); add(c, P().barrel({}), 13.6, -13.4); // supplies (walk-over)

    // ── HORSE PADDOCK (south): fenced enclosure, hay, two horses ──
    [[-3, 0], [3, 0], [0, -2.4], [0, 2.4]].forEach(([dx, dz], i) => {
      addC(c, P().fence({ len: 6 }), -16 + dx, 15 + dz, i < 2 ? Math.PI / 2 : 0, i < 2 ? 0.3 : 3, i < 2 ? 3 : 0.3);
    });
    if (NS.Figures.buildHorse) {
      [[-17, 14.6, 0.5], [-15, 15.6, -0.8]].forEach(([x, z, r]) => {
        const h = NS.Figures.buildHorse({ color: '#43301f' }); h.position.set(x, 0, z); h.rotation.y = r; c.group.add(h);
      });
    }
    for (let i = 0; i < 3; i++) add(c, P().barrel({ h: 0.6 }), -18 + i * 0.9, 16.4); // hay (walk-over)

    // perimeter torches (light) ring the camp — walk-over
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const t = add(c, P().torch({ light: i % 2 === 0, intensity: 0.95 }), Math.cos(a) * (c.width / 2 - 3), Math.sin(a) * (c.depth / 2 - 3) * 0.9);
      t.position.y = 0.9;
    }
    add(c, NS.FX.critters({ style: 'crow', count: 2, range: 6 }), -11, 13);
    add(c, NS.FX.critters({ style: 'chicken', count: 3, range: 5 }), -14, 16);

    c.npcSlots = [
      { x: 0, z: -2.6, facing: 0 },
      { x: -12, z: -1, facing: 1 }, { x: 12, z: -2, facing: -1 },
      { x: -6, z: 5, facing: 0.5 }, { x: 6, z: 5, facing: -0.5 },
      { x: 0, z: -12, facing: 0 },               // boss — command end
      { x: 11, z: 10, facing: -Math.PI / 3 },    // merchant — supply
    ];
    return finish(c, {
      spawn: { x: 0, z: c.depth / 2 - 4, facing: Math.PI },
      stage: { center: [0, 0, 2.5], right: [1, 0, 0], forward: [0, 0, 1], width: 12, depth: 5.5 },
      boardAnchor: { x: 2.8, z: 2.2, rotY: 0.3 },
      camera: { hubHeight: 3.4, hubDist: 6 },
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
    backdrop(c, { ground: '#0b0d0b', hillColor: '#101410' });
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
    backdrop(c, { ground: '#46522e', hillColor: '#3c4c2c', style: 'forest', treeColor: '#2c3c24' });
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
    add(c, NS.FX.water({ w: 2.6, l: c.width - 2, color: '#3a6a8a', angle: Math.PI / 2 }), 0, -c.depth / 2 + 3.2);
    add(c, NS.FX.critters({ style: 'rabbit', count: 2, range: 5 }), -6, 3);
    add(c, NS.FX.birds({ count: 3, radius: 8, h: 8 }), 0, 0);
    return finish(c, {
      stage: { center: [0, 0, 2.5], right: [1, 0, 0], forward: [0, 0, 1], width: 12, depth: 5 },
      boardAnchor: { x: 0, z: 2.5 },
    });
  };

  // Ch3 — border town at sunset: two building rows with lit windows, well,
  // stalls, townsfolk. Hub for chapter 3 (L19490).
  BUILDERS.valdris_border_town = function (opts) {
    const hub = opts && opts.hub;
    const c = ctx(hub ? 46 : 24, hub ? 40 : 18);
    atmosphere(c, {
      sky: '#d8a878', fog: '#c89868', fogNear: hub ? 18 : 12, fogFar: hub ? 56 : 34,
      hemi: ['#e0b080', '#706050', 0.78],
      sun: { color: '#ffb060', i: 0.7, pos: [-16, 9, 5], shadow: true, shadowSize: hub ? 26 : 14 },
    });
    ground(c, 'ground', '#6a5a48', 8);
    backdrop(c, { ground: '#5e5444', hillColor: '#4c4838', style: 'town' });
    add(c, NS.FX.birds({ count: hub ? 5 : 3, radius: hub ? 14 : 10, h: 9 }), 0, 0);

    // a well (shared) — town landmark
    const buildWell = (wx, wz) => {
      const well = new THREE.Group();
      const wellWall = new THREE.Mesh(P().geo('well', () => new THREE.CylinderGeometry(0.8, 0.85, 0.8, 12)), M().get('stone', '#48382a'));
      wellWall.position.y = 0.4; wellWall.castShadow = true; wellWall.receiveShadow = true; well.add(wellWall);
      const wp = new THREE.Mesh(P().CYL(), M().get('wood', '#2a2018')); wp.scale.set(0.07, 1.6, 0.07); wp.position.y = 1.2; well.add(wp);
      const wr = new THREE.Mesh(P().CONE(), M().get('wood', '#3a2a1a')); wr.scale.set(1.4, 0.6, 1.4); wr.position.y = 2.1; wr.castShadow = true; well.add(wr);
      addC(c, well, wx, wz, 0, 1, 1);
    };

    if (!hub) {
      // small border street for the fight
      for (let side = 0; side < 2; side++) for (let i = 0; i < 2; i++) {
        addC(c, P().building({ w: 4.6, d: 4, h: 3 + (i % 2) * 0.7, wallColor: '#484038', roofColor: '#2a2018', windows: 2, glowWindows: true, doorSide: side ? 'w' : 'e', chimney: i % 2 === 0 }),
          (side ? 1 : -1) * 7.4, -c.depth / 2 + 3 + i * 6, 0, 2.3, 2.2);
      }
      buildWell(0, 2);
      return finish(c, {
        spawn: { x: 0, z: c.depth / 2 - 3, facing: Math.PI },
        stage: { center: [0, 0, 3], right: [1, 0, 0], forward: [0, 0, 1], width: 12, depth: 5.5 },
        boardAnchor: { x: 0, z: 3, rotY: 0 }, camera: { hubHeight: 3.3 },
      });
    }

    // ── BIG TOWN ────────────────────────────────────────────────────────
    const pathMat = M().get('ground', '#8a7458', { seed: 39 });
    const street = (x, z, w, d) => {
      const p = new THREE.Mesh(P().geo(`c3st|${w}|${d}`, () => new THREE.PlaneGeometry(w, d)), pathMat);
      p.rotation.x = -Math.PI / 2; p.position.set(x, 0.015, z); p.receiveShadow = true; c.group.add(p);
    };
    street(0, 0, 4, 36);    // main street N–S
    street(0, 6, 34, 5);    // market cross-street E–W

    // building rows lining the main street (inner ±6.5, outer ±15)
    const townBuilding = (x, z, w, h, doorSide, chimney) => {
      addC(c, P().building({ w, d: 4.2, h, wallColor: '#4a423a', roofColor: '#2a2018', windows: 2, glowWindows: true, doorSide, chimney }), x, z, 0, w / 2, 2.3);
      if (chimney) add(c, NS.FX.smokeColumn({}), x + w * 0.28, z).position.y = h + 1.6;
    };
    [[-15.5, 'e'], [-7, 'e'], [7, 'w'], [15.5, 'w']].forEach(([bx, door], col) => {
      for (let i = 0; i < 3; i++) {
        if (Math.abs(bx) < 8 && i === 1) continue; // gap onto the market street
        townBuilding(bx, -13 + i * 8, 4.6 + (col % 2) * 1.4, 3 + (i % 2) * 0.9, door, i % 2 === 0);
      }
    });

    // market square (centre): well + stalls + walk-over goods
    buildWell(0, 12);
    [['#8a4a3a', -4, 9], ['#3a5a4a', 4, 9.5], ['#7a6a3a', -3.5, 14], ['#5a4a6a', 4, 14.5]].forEach(([col, x, z]) =>
      addC(c, P().stall({ color: col }), x, z, (x < 0 ? 0.2 : -0.2), 1.1, 0.6));
    for (let i = 0; i < 6; i++) add(c, P().barrel({}), -1.5 + (i % 3) * 1.4, 11 + Math.floor(i / 3) * 1.0);  // walk-over
    for (let i = 0; i < 4; i++) add(c, P().crate({ size: 0.5 }), 1 + (i % 2) * 0.8, 13 + Math.floor(i / 2) * 0.8); // walk-over

    // ── TAVERN (west side): sign, lit windows, outdoor benches + barrels ──
    addC(c, P().building({ w: 6, d: 5, h: 4, wallColor: '#5a4632', roofColor: '#2e2014', windows: 3, glowWindows: true, doorSide: 'e', chimney: true }), -16, 18, 0, 3, 2.6);
    add(c, NS.FX.smokeColumn({}), -14.3, 18).position.y = 4.2;
    { // hanging tavern sign on a post
      const post = new THREE.Mesh(P().CYL(), M().get('wood', '#3a2a1a')); post.scale.set(0.1, 2.6, 0.1); post.position.set(-12.2, 1.3, 16.5); post.castShadow = true; c.group.add(post);
      const sign = new THREE.Mesh(P().BOX(), M().get('wood', '#6a5238')); sign.scale.set(1.1, 0.7, 0.08); sign.position.set(-12.2, 2.1, 16.5); sign.castShadow = true; c.group.add(sign);
      const mug = new THREE.Mesh(P().BOX(), M().get('metal', '#caa84c')); mug.scale.set(0.3, 0.4, 0.05); mug.position.set(-12.2, 2.1, 16.56); c.group.add(mug);
    }
    [[-13.5, 19.5], [-11, 19.5]].forEach(([x, z]) => { const bench = new THREE.Mesh(P().BOX(), M().get('wood', '#43331f')); bench.scale.set(1.8, 0.18, 0.4); bench.position.set(x, 0.32, z); bench.castShadow = true; c.group.add(bench); });
    add(c, P().barrel({}), -12.4, 20.4); add(c, P().barrel({}), -13.2, 20.6); // walk-over

    // ── TOWN BLACKSMITH (east side): forge, anvil, glow ──
    {
      const forge = new THREE.Mesh(P().BOX(), M().get('stone', '#3a342c')); forge.scale.set(1.6, 1.0, 1.2); forge.position.set(14, 0.5, 16); forge.castShadow = forge.receiveShadow = true; c.group.add(forge); collide(c, 14, 16, 0.9, 0.7);
      const coals = new THREE.Mesh(P().BOX(), M().flat('#ff6a1a', { emissive: '#ff5a10', emissiveIntensity: 1.7, roughness: 0.6 })); coals.scale.set(0.7, 0.12, 0.5); coals.position.set(14, 1.05, 16); c.group.add(coals);
      const fl = new THREE.PointLight(0xff7a30, 1.3, 7, 2); fl.position.set(14, 1.4, 16); c.group.add(fl);
      add(c, NS.FX.smokeColumn({ opacity: 0.16 }), 14, 15.4).position.y = 1.4;
      const anvil = new THREE.Group(); const ab = new THREE.Mesh(P().BOX(), M().get('metal', '#3a3e44')); ab.scale.set(0.5, 0.18, 0.22); ab.position.y = 0.62; anvil.add(ab); const as = new THREE.Mesh(P().BOX(), M().get('metal', '#3a3e44')); as.scale.set(0.16, 0.42, 0.16); as.position.y = 0.36; anvil.add(as); anvil.traverse(o => { o.castShadow = true; }); addC(c, anvil, 16, 16.6, 0, 0.4, 0.3);
      add(c, P().crate({}), 12.4, 17); // walk-over
    }

    // ── CHAPEL / SHRINE (far end): a small stone shrine + candles ──
    addC(c, P().building({ w: 4.4, d: 4, h: 4.6, wallColor: '#5a5a5e', roofColor: '#3a3a40', windows: 1, doorSide: 's' }), 0, -16.5, 0, 2.2, 2.2);
    { const cross = new THREE.Mesh(P().BOX(), M().get('stone', '#7a7a80')); cross.scale.set(0.16, 0.9, 0.16); cross.position.set(0, 5.0, -16.5); c.group.add(cross); const arm = new THREE.Mesh(P().BOX(), M().get('stone', '#7a7a80')); arm.scale.set(0.5, 0.16, 0.16); arm.position.set(0, 5.1, -16.5); c.group.add(arm); }
    [[-1, -13.5], [1, -13.5]].forEach(([x, z]) => { const cd = add(c, P().candle({ light: true, intensity: 0.5, range: 4 }), x, z); cd.position.y = 0.0; cd.scale.setScalar(2.0); });

    // lantern posts down the streets (walk-over, lit)
    [[-2.4, -6], [2.4, -1], [-2.4, 4], [2.4, 9], [-8, 6], [8, 6], [-10, 18], [10, 18]].forEach(([x, z], i) => add(c, P().lanternPost({ light: i % 3 !== 2 }), x, z));
    add(c, NS.FX.critters({ style: 'chicken', count: 4, range: 6 }), 3, 8);
    addC(c, P().flag({ color: '#3a5a8a', trim: '#aabdd4', seed: 4 }), -3.6, -7, 0.3, 0.2, 0.2);
    addC(c, P().flag({ color: '#3a5a8a', trim: '#aabdd4', seed: 5 }), 3.8, 2, -0.4, 0.2, 0.2);

    c.npcSlots = [
      { x: -4, z: -3, facing: 0.6 }, { x: 4, z: -4, facing: -0.6 },
      { x: -4, z: 3, facing: 0.5 }, { x: 4, z: 4, facing: -0.5 },
      { x: -8, z: 11, facing: Math.PI / 3 }, { x: -3, z: 16, facing: 0 },
      { x: 0, z: -15, facing: 0 },               // boss — far end of the main street
      { x: 8, z: 13, facing: -Math.PI / 2 },     // merchant — market
    ];
    return finish(c, {
      spawn: { x: 0, z: c.depth / 2 - 4, facing: Math.PI },
      stage: { center: [0, 0, 3], right: [1, 0, 0], forward: [0, 0, 1], width: 12, depth: 5.5 },
      boardAnchor: { x: 0, z: 3, rotY: 0 },
      camera: { hubHeight: 3.5, hubDist: 6 },
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
    const c = ctx(hub ? 40 : 20, hub ? 34 : 17);
    // The Pale Court — a cold, dark hall. Low ambient so the braziers and the
    // shaft over the throne read as pools of light against deep shadow.
    atmosphere(c, {
      sky: '#1c2430', fog: '#161d28', fogNear: hub ? 14 : 10, fogFar: hub ? 50 : 30,
      hemi: ['#546881', '#222a34', hub ? 0.95 : 0.85],  // cold, moody, navigable
      sun: { color: '#9ab0d8', i: 0.4, pos: [-6, 18, -4], shadow: hub, shadowSize: hub ? 24 : 13 },
    });
    ground(c, 'stone', '#3c424c', 7);
    room(c, hub ? 11 : 8, M().get('stone', '#262c36'), {});
    // long carpet up the centre to the throne
    add(c, P().rug({ w: 3, d: c.depth - 4, color: '#2e3850', border: '#1a2030' }), 0, 0, Math.PI / 2);
    // throne on a raised dais at the back
    const dais = new THREE.Mesh(P().BOX(), M().get('stone', '#1a1e26'));
    dais.scale.set(hub ? 8 : 6, 0.4, 4); dais.position.set(0, 0.2, -c.depth / 2 + 3); dais.receiveShadow = true; c.group.add(dais);
    addC(c, P().throne({ color: '#15181f' }), 0, -c.depth / 2 + 3, 0, 1.3, 1.1);
    // a focused cold shaft falls on the empty throne — the seat of the Undying
    const spot = new THREE.SpotLight(0x9ab4e8, hub ? 3.0 : 2.0, 20, 0.5, 0.45, 1.4);
    spot.position.set(0, hub ? 10 : 7.5, -c.depth / 2 + 3);
    spot.target.position.set(0, 0, -c.depth / 2 + 3);
    c.group.add(spot, spot.target);
    const cold = new THREE.PointLight(0x8aa0c8, 0.8, 14, 2); cold.position.set(0, 3, -c.depth / 2 + 4); c.group.add(cold);
    addC(c, P().flag({ color: '#6a7280', trim: '#c8ccd4', seed: 6 }), -3.4, -c.depth / 2 + 4, 0.5, 0.25, 0.25);
    addC(c, P().flag({ color: '#6a7280', trim: '#c8ccd4', seed: 7 }), 3.4, -c.depth / 2 + 4, -0.5, 0.25, 0.25);
    // honor guards flank the dais; two braziers throw cold-warm pools by it
    [-1, 1].forEach(s => {
      const g4 = NS.Figures.buildById('guard', { chapterId: 'ch4' });
      g4.position.set(s * 2.9, 0, -c.depth / 2 + 4.4); g4.rotation.y = 0; g4.userData.heading = 0;
      if (g4.userData.setWalking) g4.userData.setWalking(false);
      c.group.add(g4);
      const br = add(c, P().torch({ light: true, intensity: 1.3 }), s * 4.4, -c.depth / 2 + 4); br.position.y = 1.0;
    });

    if (!hub) {
      for (let i = 0; i < 4; i++) [-1, 1].forEach(s => addC(c, P().column({ h: 8, color: '#2a3840' }), s * (c.width / 2 - 2.2), -c.depth / 2 + 3 + i * 3.5, 0, 0.8, 0.8));
      add(c, NS.FX.motes({ count: 14, w: c.width - 5, h: 5, d: c.depth - 5 }), 0, 0).position.y = 1;
      return finish(c, {
        boardAnchor: { x: 0, z: 1, rotY: 0 }, spawn: { x: 0, z: c.depth / 2 - 4, facing: Math.PI },
        stage: { center: [0, 0, -1], right: [1, 0, 0], forward: [0, 0, 1], width: 12, depth: 6 },
        tableStyle: 'stone', camera: { hubHeight: 3.4 },
      });
    }

    // ── GRAND HALL ──────────────────────────────────────────────────────
    // standing braziers flank the central approach from the entrance to the
    // throne — pools of light to walk by, with dark wings between the columns
    for (let i = 0; i < 6; i++) {
      const bz = -c.depth / 2 + 6 + i * ((c.depth - 9) / 5);
      [-1, 1].forEach(s => {
        const post = new THREE.Mesh(P().geo('c4-brazier', () => new THREE.CylinderGeometry(0.18, 0.26, 1.4, 8)), M().get('metal', '#2a2c30'));
        post.position.set(s * 2.4, 0.7, bz); post.castShadow = true; c.group.add(post);
        const bowl = add(c, P().campfire({ light: true, intensity: 1.5, range: 9, scale: 0.45 }), s * 2.4, bz); bowl.position.y = 1.4;
      });
    }
    [-1, 1].forEach(side => {
      for (let i = 0; i < 6; i++) {
        const z = -c.depth / 2 + 4 + i * ((c.depth - 7) / 5);
        addC(c, P().column({ h: 11, color: '#2a3840' }), side * (c.width / 2 - 3), z, 0, 0.8, 0.8);
        addC(c, P().column({ h: 11, color: '#2a3840' }), side * (c.width / 2 - 9), z, 0, 0.8, 0.8);
      }
      add(c, P().rug({ w: 2, d: c.depth * 0.5, color: '#2e3645', border: '#222833' }), side * (c.width / 2 - 6), 0);
      for (let i = 0; i < 2; i++) { const t = add(c, P().torch({ light: true, intensity: 1.1 }), side * (c.width / 2 - 6), -4 + i * 8); t.position.y = 1.0; } // braziers, walk-over
      const wb = add(c, P().banner({ color: '#6a7280', h: 3, seed: 8 + side }), side * (c.width / 2 - 0.8), 0); wb.position.y = 6.5; wb.rotation.y = side * -Math.PI / 2;
      for (let i = 0; i < 2; i++) { const w = add(c, P().stainedWindow({ seed: 11 + i + side, shaft: i === 0, shaftH: 8 }), side * (c.width / 2 - 0.4), -3 + i * 7); w.position.y = 5; w.rotation.y = side * Math.PI / 2; }
    });
    add(c, NS.FX.motes({ count: 26, w: c.width - 6, h: 6, d: c.depth - 6 }), 0, 0).position.y = 1.5;

    // ── COUNCIL CHAMBER (west wing): round war table, chairs, candles ──
    {
      const table = addC(c, P().boardTable({ topSize: 3.2, topY: 0.9, color: '#2a2e36' }), -14, -6, 0, 1.7, 1.7);
      const mapPlane = new THREE.Mesh(P().geo('c4-map', () => new THREE.PlaneGeometry(2.6, 2.6)), M().get('plaster', '#7a8088', { seed: 78 }));
      mapPlane.rotation.x = -Math.PI / 2; mapPlane.position.set(-14, table.userData.topY + 0.012, -6); c.group.add(mapPlane);
      [[-1.4, 0], [1.4, 0], [0, -1.4], [0, 1.4]].forEach(([dx, dz]) => addC(c, P().chair({ color: '#2e333c' }), -14 + dx, -6 + dz, Math.atan2(dx, dz) + Math.PI, 0.3, 0.3));
      [[-1.2, -7.2], [1.2, -4.8]].forEach(([dx, dz]) => { const cd = add(c, P().candle({ light: true, intensity: 0.6, range: 5 }), -14 + dx, -6 + dz); cd.position.y = table.userData.topY; });
    }

    // ── GALLERY (east wing): weapon racks + war trophies on the wall ──
    {
      for (let i = 0; i < 3; i++) { // banners/trophies
        const b = add(c, P().banner({ color: i % 2 ? '#4a5260' : '#5a4248', h: 2.2, w: 0.8, seed: 20 + i }), c.width / 2 - 0.6, -7 + i * 6); b.position.y = 4.4; b.rotation.y = -Math.PI / 2;
      }
      // weapon rack: a horizontal bar with mounted spears
      const rack = new THREE.Mesh(P().BOX(), M().get('wood', '#2a2620')); rack.scale.set(0.12, 1.4, 3.2); rack.position.set(14.5, 0.7, 4); rack.castShadow = true; c.group.add(rack);
      for (let i = 0; i < 5; i++) { const spear = new THREE.Mesh(P().CYL(), M().get('wood', '#3a2e20')); spear.scale.set(0.04, 2.2, 0.04); spear.position.set(14.6, 1.2, 2.6 + i * 0.7); c.group.add(spear); const tip = new THREE.Mesh(P().CONE(), M().get('metal', '#8a9098')); tip.scale.set(0.1, 0.25, 0.1); tip.position.set(14.6, 2.3, 2.6 + i * 0.7); c.group.add(tip); }
      addC(c, P().crate({}), 13, 7.5); // walk-over
    }

    // ── ANTECHAMBER (the entrance, south): guards + braziers flanking the way ──
    [[-3, 13], [3, 13]].forEach(([x, z]) => { const t = add(c, P().torch({ light: true, intensity: 1.2 }), x, z); t.position.y = 1.0; });
    [[-4.5, 13.5, Math.PI / 2], [4.5, 13.5, -Math.PI / 2]].forEach(([x, z, r]) => {
      const guard = NS.Figures.buildById('guard', { chapterId: 'ch4' });
      guard.position.set(x, 0, z); guard.rotation.y = r; guard.userData.heading = r;
      if (guard.userData.setWalking) guard.userData.setWalking(false);
      c.group.add(guard);
    });

    c.npcSlots = [
      { x: -6, z: 2, facing: Math.PI / 3 }, { x: 6, z: 1, facing: -Math.PI / 3 },
      { x: -6, z: 8, facing: Math.PI / 3 }, { x: 6, z: 8, facing: -Math.PI / 3 },
      { x: -10, z: -4, facing: Math.PI / 2 }, { x: 10, z: -3, facing: -Math.PI / 2 },
      { x: 0, z: -c.depth / 2 + 5.5, facing: 0 }, // boss — before the throne
      { x: 12, z: 11, facing: -Math.PI / 3 },     // merchant
    ];
    return finish(c, {
      boardAnchor: { x: 0, z: 1, rotY: 0 },
      spawn: { x: 0, z: c.depth / 2 - 5, facing: Math.PI },
      stage: { center: [0, 0, -1], right: [1, 0, 0], forward: [0, 0, 1], width: 12, depth: 6 },
      tableStyle: 'stone',
      camera: { hubHeight: 3.6, hubDist: 6 },
    });
  };

  // Ch5 — the clearing: black night, star sky, tree walls left/right, one
  // small fire, distant camp lights. Hub stage for chapter 5 (L19553).
  BUILDERS.clearing_ch5 = function (opts) {
    const hub = opts && opts.hub;
    const c = ctx(hub ? 52 : 20, hub ? 46 : 18);
    // A clearer, more moonlit night — the finale shouldn't be pitch black.
    atmosphere(c, {
      sky: '#10161f', fog: '#121a26', fogNear: hub ? 18 : 9, fogFar: hub ? 58 : 24,
      hemi: ['#3e5276', '#161e2c', hub ? 1.0 : 0.8],  // moodier night; the campfires pool the light
      sun: { color: '#9fb4d8', i: hub ? 0.42 : 0.3, pos: [-14, 26, -8], shadow: hub, shadowSize: 30 },
    });
    ground(c, 'ground', '#1a2014', 10);
    backdrop(c, { ground: '#141a10', hillColor: '#182214', style: 'forest', treeColor: '#10180f' });
    add(c, NS.FX.stars({ count: hub ? 150 : 110, radius: hub ? 42 : 19, moon: true }), 0, 0);
    add(c, NS.FX.fireflies({ count: hub ? 30 : 9, range: Math.min(c.width, c.depth) / 2 - 4 }), 0, 0);

    if (!hub) {
      // Intimate boss clearing (the battle board sits here)
      for (let i = 0; i < 5; i++) [-1, 1].forEach(side => {
        const x = side * (c.width / 2 - 1.5 - (i % 3) * 1.6);
        addC(c, P().tree({ h: 4.5 + (i % 2), color: '#13241a' }), x, -c.depth / 2 + 2 + i * (c.depth - 4) / 4, 0, 0.4, 0.4);
      });
      add(c, P().campfire({ light: true, intensity: 2.6, range: 16, scale: 0.9 }), 0, 0.5);
      collide(c, 0, 0.5, 0.6, 0.6);
      return finish(c, {
        boardAnchor: { x: 0, z: 2.6, rotY: 0 },
        spawn: { x: 0, z: c.depth / 2 - 3, facing: Math.PI },
        stage: { center: [0, 0, -0.4], right: [1, 0, 0], forward: [0, 0, 1], width: 9, depth: 4.5 },
        tableStyle: 'stone', camera: { hubHeight: 3 },
      });
    }

    // ── BIG FOREST HUB ──────────────────────────────────────────────────
    const W = c.width, D = c.depth;
    // dirt paths (lighter ground strips) linking the camps
    const pathMat = M().get('ground', '#33291a', { seed: 73 });
    const path = (x, z, w, d, rot) => {
      const p = new THREE.Mesh(P().geo(`ch5path|${w}|${d}`, () => new THREE.PlaneGeometry(w, d)), pathMat);
      p.rotation.x = -Math.PI / 2; if (rot) p.rotation.z = rot;
      p.position.set(x, 0.015, z); p.receiveShadow = true; c.group.add(p);
    };
    path(0, 7, 3.2, 30);                 // main south→centre
    path(-9, -7, 3, 16, Math.PI / 2.6);  // branch to NW camp
    path(10, -5, 3, 16, -Math.PI / 2.6); // branch to NE camp
    path(0, -16, 3, 12);                 // centre→far camp

    // forest: trees ring the edge densely + scatter inside, leaving the
    // clearings and paths clear. Small collider so they're easy to slip past.
    const onPath = (x, z) =>
      (Math.abs(x) < 2.4 && z > -2) ||                       // main path
      (Math.hypot(x, z) < 6.5) ||                            // central clearing
      (Math.hypot(x + 13, z + 8) < 5) ||                     // NW camp
      (Math.hypot(x - 13, z + 6) < 5) ||                     // NE camp
      (Math.hypot(x, z + 17) < 5) ||                         // far camp
      (Math.hypot(x + 17, z - 12) < 5);                      // pond
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2, r = (W / 2 - 2.5) * (0.78 + (i % 4) * 0.06);
      const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.88;
      if (z > D / 2 - 6 && Math.abs(x) < 4) continue;         // keep the entrance open
      addC(c, P().tree({ h: 4.5 + (i % 3) * 1.3, color: i % 2 ? '#12221a' : '#15281c' }), x, z, 0, 0.34, 0.34);
    }
    for (let i = 0; i < 34; i++) {
      const x = (((i * 73) % 100) / 100 - 0.5) * (W - 8);
      const z = (((i * 149) % 100) / 100 - 0.5) * (D - 8);
      if (onPath(x, z)) continue;
      addC(c, P().tree({ h: 3.6 + (i % 3), color: '#13241a' }), x, z, 0, 0.32, 0.32);
    }

    // central clearing — Saoirse's fire (the story spot), well lit
    add(c, P().campfire({ light: true, intensity: 3.2, range: 18, scale: 1.05 }), 0, 0);
    collide(c, 0, 0, 0.6, 0.6);
    const moonGlow = new THREE.PointLight(0xbcd0ff, 0.5, 24, 2);
    moonGlow.position.set(0, 9, -2); c.group.add(moonGlow);
    // log seats around the fire (walk-over — no colliders)
    [[-1.7, 1.7, 0.6], [1.7, 1.7, -0.6], [0, -1.9, 0]].forEach(([x, z, r]) => {
      const log = new THREE.Mesh(P().CYL(), M().get('wood', '#2a1e14'));
      log.scale.set(0.2, 1.4, 0.2); log.rotation.z = Math.PI / 2; log.rotation.y = r;
      log.position.set(x, 0.2, z); log.castShadow = true; c.group.add(log);
    });

    // camps: campfire (light) + two tents (collide) + walk-over crates/barrels
    const camp = (cx, cz) => {
      add(c, P().campfire({ light: true, intensity: 2.2, range: 12 }), cx, cz);
      collide(c, cx, cz, 0.55, 0.55);
      addC(c, P().tent({}), cx - 2.6, cz - 1.2, 0.3, 1.1, 1.3);
      addC(c, P().tent({}), cx + 2.5, cz + 0.8, -0.4, 1.1, 1.3);
      add(c, P().crate({}), cx + 1.4, cz - 1.9);     // walk-over
      add(c, P().barrel({}), cx - 1.7, cz + 1.7);    // walk-over
    };
    camp(-13, -8);
    camp(13, -6);
    camp(0, -17);

    // lantern posts down the main path — light to walk by (thin, no collider)
    [[-2.6, 13], [2.6, 5], [-2.6, -3], [2.6, -11]].forEach(([x, z]) => add(c, P().lanternPost({ light: true }), x, z));

    // moonlit pond off to the side
    const pondX = -17, pondZ = 12;
    add(c, NS.FX.water({ w: 6.5, l: 7.5, color: '#1e3850', still: true }), pondX, pondZ);
    const rim = new THREE.Mesh(P().geo('pond-rim2', () => new THREE.RingGeometry(3.2, 4.2, 26)), M().get('ground', '#1c1e16', { seed: 71 }));
    rim.rotation.x = -Math.PI / 2; rim.position.set(pondX, 0.02, pondZ); rim.receiveShadow = true; c.group.add(rim);
    collide(c, pondX, pondZ, 3.2, 3.6);
    add(c, NS.FX.critters({ style: 'rabbit', count: 2, range: 5 }), pondX + 4, pondZ - 2);
    add(c, NS.FX.critters({ style: 'crow', count: 2, range: 7 }), 9, -11);

    c.npcSlots = [
      { x: 0, z: -2.6, facing: 0 },      // Saoirse, across the fire
      { x: -11, z: -7, facing: -0.6 },   // NW camp
      { x: 11, z: -5, facing: 0.6 },     // NE camp
      { x: 3, z: 6, facing: Math.PI },
      { x: -4, z: 7, facing: Math.PI },
      { x: 0, z: -15, facing: 0 },       // boss — far camp
      { x: 14, z: -7, facing: -Math.PI / 2 }, // merchant
    ];
    return finish(c, {
      boardAnchor: { x: 0, z: 3, rotY: 0 },
      spawn: { x: 0, z: D / 2 - 4, facing: Math.PI },
      stage: { center: [0, 0, -0.4], right: [1, 0, 0], forward: [0, 0, 1], width: 10, depth: 5 },
      tableStyle: 'stone',
      camera: { hubHeight: 3.3, hubDist: 6 },
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
    backdrop(c, { ground: '#6e5e4c', hillColor: '#544a38', style: 'town' });
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
    backdrop(c, { ground: '#2a2114', hillColor: '#262a1c', style: 'forest', treeColor: '#1c2416' });
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
    ch1: 'palace_complex',
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
