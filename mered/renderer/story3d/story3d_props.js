/**
 * story3d_props.js — reusable procedural prop builders (detail pass).
 *
 * Every builder returns a THREE.Group with the ground at y=0. Animated props
 * attach `group.userData.animators = [fn(t, dt)]` (collected by the active
 * stage). Fire/glow comes from Story3D.FX; real PointLights only when
 * `opts.light` is set — environments budget those. Unit geometries are
 * cached and shared; scaling happens per instance.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(null, null);
  else { root.Story3D.Props = factory(root.THREE, root.Story3D); }
})(typeof self !== 'undefined' ? self : this, function (THREE, NS) {
  'use strict';
  if (!THREE) return {};

  const M = () => NS.Materials;
  const FX = () => NS.FX;
  const T = () => NS.Textures;
  const _geo = new Map();
  function geo(key, make) {
    if (!_geo.has(key)) {
      const g = make();
      g.userData.story3dShared = true;
      _geo.set(key, g);
    }
    return _geo.get(key);
  }

  const BOX = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1));
  const CYL = () => geo('cyl', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 12));
  const TCYL = () => geo('tcyl', () => new THREE.CylinderGeometry(0.38, 0.5, 1, 10)); // tapered
  const CONE = () => geo('cone', () => new THREE.ConeGeometry(0.5, 1, 10));
  const SPHERE = () => geo('sphere', () => new THREE.SphereGeometry(0.5, 14, 12));
  const PLANE = () => geo('plane', () => new THREE.PlaneGeometry(1, 1, 1, 1));

  function mesh(g, mat, sx, sy, sz, x, y, z, opts) {
    const m = new THREE.Mesh(g, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    if (!opts || opts.shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
    return m;
  }
  function addAnim(g, fns) {
    g.userData.animators = (g.userData.animators || []).concat(fns);
  }

  // ── Fire-bearing props ───────────────────────────────────────────────
  /** Wall torch: iron sconce ring + handle + layered FX fire. */
  function torch(opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const iron = M().get('metal', '#33333a');
    const wood = M().get('wood', '#4a3522');
    g.add(mesh(CYL(), wood, 0.045, 0.46, 0.045, 0, 0.23, 0));
    const ring = mesh(geo('torch-ring', () => new THREE.TorusGeometry(0.07, 0.016, 6, 14)), iron, 1, 1, 1, 0, 0.42, 0, { shadow: false });
    g.add(ring);
    g.add(mesh(geo('torch-cup', () => new THREE.CylinderGeometry(0.075, 0.045, 0.1, 10)), iron, 1, 1, 1, 0, 0.49, 0));
    // coals
    g.add(mesh(SPHERE(), M().flat('#2a1408', { roughness: 1, emissive: '#993300', emissiveIntensity: 0.6 }), 0.1, 0.06, 0.1, 0, 0.545, 0, { shadow: false }));
    const fire = FX().fire({ scale: 0.34, embers: 4, smoke: false, light: opts.light, intensity: opts.intensity ?? 1.15, range: opts.range ?? 9 });
    fire.position.y = 0.52;
    g.add(fire);
    addAnim(g, fire.userData.animators);
    return g;
  }

  /** Camp fire: stone ring, charred crossed logs, full layered fire. */
  function campfire(opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const stone = M().get('stone', '#5a544c');
    const wood = M().get('wood', '#2c2014');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const st = mesh(geo('rock', () => new THREE.DodecahedronGeometry(0.5, 0)), stone,
        0.14 + (i % 3) * 0.025, 0.1, 0.14, Math.cos(a) * 0.45, 0.05, Math.sin(a) * 0.45);
      st.rotation.set(i, i * 1.7, 0);
      g.add(st);
    }
    [-0.5, 0.45, 1.6, 2.4].forEach((rot, i) => {
      const log = mesh(geo('log', () => new THREE.CylinderGeometry(0.05, 0.065, 1, 8)), wood, 1, 0.62, 1, 0, 0.09 + i * 0.025, 0);
      log.rotation.z = Math.PI / 2 - 0.18;
      log.rotation.y = rot;
      g.add(log);
    });
    // ember bed
    g.add(mesh(SPHERE(), M().flat('#3a1606', { roughness: 1, emissive: '#b34508', emissiveIntensity: 0.8 }), 0.3, 0.08, 0.3, 0, 0.07, 0, { shadow: false }));
    const fire = FX().fire({
      scale: (opts.scale ?? 1) * 1.25, embers: opts.embers ?? 12, smoke: opts.smoke !== false,
      light: opts.light !== false, intensity: opts.intensity ?? 1.7, range: opts.range ?? 13,
    });
    fire.position.y = 0.12;
    g.add(fire);
    addAnim(g, fire.userData.animators);
    if (opts.scale) g.scale.setScalar(opts.scale);
    return g;
  }

  /** Standing candle (war-room / archive tables). */
  function candle(opts) {
    opts = opts || {};
    const g = new THREE.Group();
    g.add(mesh(geo('candle-stick', () => new THREE.CylinderGeometry(0.022, 0.03, 0.16, 8)), M().flat('#d8cdb2', { roughness: 0.5 }), 1, 1, 1, 0, 0.08, 0));
    g.add(mesh(geo('candle-dish', () => new THREE.CylinderGeometry(0.06, 0.07, 0.02, 10)), M().get('metal', '#7a6a3a'), 1, 1, 1, 0, 0.01, 0));
    const fl = FX().candle({ light: opts.light, intensity: opts.intensity ?? 0.7, range: opts.range ?? 6 });
    fl.position.y = 0.17;
    g.add(fl);
    addAnim(g, fl.userData.animators);
    return g;
  }

  // ── Architecture ─────────────────────────────────────────────────────
  /** Hanging banner: woven crest cloth, rod finials, layered sway. */
  function banner(opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const w = opts.w || 0.85, h = opts.h || 2.6;
    const tex = T().bannerSprite(opts.color || M().PALETTE.bannerGold, opts.seed);
    const clothMat = new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.92, metalness: 0, side: THREE.DoubleSide,
    });
    const iron = M().get('metal', '#3a3a40');
    const rod = mesh(CYL(), M().get('wood', '#4a3522'), 0.035, w + 0.34, 0.035, 0, 0, 0);
    rod.rotation.z = Math.PI / 2;
    g.add(rod);
    [-1, 1].forEach(side => g.add(mesh(SPHERE(), iron, 0.05, 0.05, 0.05, side * (w / 2 + 0.17), 0, 0, { shadow: false })));
    // cloth: 3 hinged segments so the sway has follow-through
    const segs = [];
    const segH = h / 3;
    let parent = g, py = -0.02;
    for (let i = 0; i < 3; i++) {
      const pivot = new THREE.Group();
      pivot.position.y = py;
      parent.add(pivot);
      const c = new THREE.Mesh(geo(`banner-seg|${w}|${segH}`, () => new THREE.PlaneGeometry(w, segH)), clothMat);
      c.position.y = -segH / 2;
      c.receiveShadow = true;
      pivot.add(c);
      segs.push(pivot);
      parent = pivot; py = -segH;
    }
    // pointed tail
    const tail = new THREE.Mesh(geo(`banner-tail|${w}`, () => {
      const s = new THREE.Shape();
      s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 4, -0.22); s.lineTo(0, -0.1); s.lineTo(-w / 4, -0.22); s.closePath();
      return new THREE.ShapeGeometry(s);
    }), clothMat);
    tail.position.y = -segH;
    segs[2].add(tail);
    const phase = Math.random() * Math.PI * 2;
    addAnim(g, [(t) => {
      // 4-second sway like the 2D banners, with per-segment lag
      segs.forEach((sgm, i) => { sgm.rotation.x = 0.055 * Math.sin(t * 1.55 + phase - i * 0.55); });
    }]);
    return g;
  }

  /** Stone archway (extruded arch silhouette). */
  function arch(opts) {
    opts = opts || {};
    const w = opts.w || 2.4, h = opts.h || 3.4, d = opts.depth || 0.5;
    const key = `arch|${w}|${h}|${d}`;
    const archGeo = geo(key, () => {
      const shape = new THREE.Shape();
      const t = 0.35;
      shape.moveTo(-w / 2, 0); shape.lineTo(-w / 2, h * 0.6);
      shape.quadraticCurveTo(-w / 2, h, 0, h);
      shape.quadraticCurveTo(w / 2, h, w / 2, h * 0.6);
      shape.lineTo(w / 2, 0); shape.lineTo(w / 2 - t, 0);
      shape.lineTo(w / 2 - t, h * 0.55);
      shape.quadraticCurveTo(w / 2 - t, h - t, 0, h - t);
      shape.quadraticCurveTo(-w / 2 + t, h - t, -w / 2 + t, h * 0.55);
      shape.lineTo(-w / 2 + t, 0); shape.closePath();
      const eg = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
      eg.translate(0, 0, -d / 2);
      return eg;
    });
    const m = new THREE.Mesh(archGeo, M().get('stone', opts.color || '#3a3026'));
    m.castShadow = true; m.receiveShadow = true;
    const g = new THREE.Group(); g.add(m);
    // keystone
    g.add(mesh(BOX(), M().get('stone', '#463c30'), 0.34, 0.26, d + 0.06, 0, h - 0.1, 0));
    return g;
  }

  /** Stained-glass window: stone frame + glowing leaded mosaic + sill. */
  function stainedWindow(opts) {
    opts = opts || {};
    const w = opts.w || 0.9, h = opts.h || 2.6;
    const g = new THREE.Group();
    const stone = M().get('stone', '#2e261e');
    g.add(mesh(BOX(), stone, w + 0.3, h + 0.3, 0.2, 0, h / 2, 0));
    g.add(mesh(BOX(), stone, w + 0.5, 0.14, 0.3, 0, -0.04, 0.03)); // sill
    const tex = T().stainedGlassSprite(opts.seed ?? 3);
    const paneMat = new THREE.MeshBasicMaterial({ map: tex });
    paneMat.userData.story3dShared = true;
    const pane = mesh(geo(`sg-pane|${w}|${h}`, () => new THREE.PlaneGeometry(w, h)), paneMat, 1, 1, 1, 0, h / 2, 0.11, { shadow: false });
    pane.castShadow = false;
    g.add(pane);
    if (opts.shaft) {
      const shaft = FX().lightShaft({ h: opts.shaftH ?? 5.5, r: w * 1.6, color: '#e8e0ff', opacity: 0.045 });
      shaft.position.set(0, h * 0.75, 0.4);
      shaft.rotation.x = -0.5;
      g.add(shaft);
      addAnim(g, shaft.userData.animators);
    }
    return g;
  }

  /** Ornate throne: dais steps, arched back, finials, velvet, gold trim. */
  function throne(opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const body = M().get('wood', opts.color || '#241a10');
    const gold = M().get('metal', '#c8a040', { metalness: 0.85 });
    const velvet = M().get('fabric', opts.velvet || '#5a1c1c');
    // dais
    g.add(mesh(BOX(), M().get('stone', '#3a342a'), 2.6, 0.18, 2.2, 0, 0.09, 0.2));
    g.add(mesh(BOX(), M().get('stone', '#443c30'), 2.0, 0.18, 1.7, 0, 0.27, 0.1));
    const base = 0.36;
    g.add(mesh(BOX(), body, 1.15, 0.16, 0.95, 0, base + 0.5, 0));                 // seat
    g.add(mesh(BOX(), velvet, 0.95, 0.07, 0.75, 0, base + 0.6, 0.03));            // cushion
    // arched back
    const backGeo = geo('throne-back', () => {
      const s = new THREE.Shape();
      s.moveTo(-0.58, 0); s.lineTo(-0.58, 1.7);
      s.quadraticCurveTo(0, 2.35, 0.58, 1.7);
      s.lineTo(0.58, 0); s.closePath();
      const eg = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: false });
      eg.translate(0, 0, -0.08);
      return eg;
    });
    const back = new THREE.Mesh(backGeo, body);
    back.position.set(0, base + 0.55, -0.4);
    back.castShadow = true; back.receiveShadow = true;
    g.add(back);
    g.add(mesh(BOX(), velvet, 0.8, 1.15, 0.05, 0, base + 1.25, -0.3));            // velvet inset
    // gold crest at the back arch + trim
    g.add(mesh(SPHERE(), gold, 0.12, 0.12, 0.12, 0, base + 2.85, -0.4, { shadow: false }));
    g.add(mesh(BOX(), gold, 1.2, 0.06, 0.06, 0, base + 2.2, -0.36, { shadow: false }));
    [-0.62, 0.62].forEach(x => {
      g.add(mesh(BOX(), body, 0.16, 0.6, 0.85, x, base + 0.75, 0.02));            // arm panels
      g.add(mesh(BOX(), gold, 0.18, 0.06, 0.9, x, base + 1.07, 0.02, { shadow: false }));
      g.add(mesh(geo('throne-post', () => new THREE.CylinderGeometry(0.06, 0.08, 1, 8)), body, 1, 1.4, 1, x, base + 0.7, 0.42));
      g.add(mesh(SPHERE(), gold, 0.1, 0.1, 0.1, x, base + 1.46, 0.42, { shadow: false })); // finials
    });
    return g;
  }

  /** Fluted column with base + capital (great hall / throne room). */
  function column(opts) {
    opts = opts || {};
    const h = opts.h || 7;
    const g = new THREE.Group();
    const stone = M().get('stone', opts.color || '#443a2e');
    g.add(mesh(BOX(), stone, 1.15, 0.3, 1.15, 0, 0.15, 0));
    g.add(mesh(geo('col-shaft', () => new THREE.CylinderGeometry(0.42, 0.5, 1, 14)), stone, 1, h - 0.95, 1, 0, (h - 0.95) / 2 + 0.3, 0));
    const cap = mesh(geo('col-cap', () => new THREE.TorusGeometry(0.46, 0.1, 8, 16)), stone, 1, 1, 1, 0, h - 0.55, 0);
    cap.rotation.x = Math.PI / 2;
    g.add(cap);
    g.add(mesh(BOX(), stone, 1.2, 0.28, 1.2, 0, h - 0.26, 0));
    return g;
  }

  /** Bordered rug/carpet (plane decals). */
  function rug(opts) {
    opts = opts || {};
    const w = opts.w || 2.4, d = opts.d || 5;
    const g = new THREE.Group();
    const border = mesh(PLANE(), M().get('fabric', opts.border || '#3a1212', { seed: 57 }), w, d, 1, 0, 0.012, 0, { shadow: false });
    border.rotation.x = -Math.PI / 2;
    border.receiveShadow = true;
    g.add(border);
    const inner = mesh(PLANE(), M().get('fabric', opts.color || '#5a1c1c', { seed: 59 }), w - 0.36, d - 0.36, 1, 0, 0.02, 0, { shadow: false });
    inner.rotation.x = -Math.PI / 2;
    inner.receiveShadow = true;
    g.add(inner);
    return g;
  }

  /** Chess table (opts.style 'wood') or stone plinth (opts.style 'stone'). */
  function boardTable(opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const topSize = opts.topSize || 2.6, topY = opts.topY ?? 0.92;
    if (opts.style === 'stone') {
      const stone = M().get('stone', opts.color || '#4a443c');
      g.add(mesh(geo('plinth-core', () => new THREE.CylinderGeometry(0.42, 0.52, 1, 10)), stone, topSize * 0.7, topY, topSize * 0.7, 0, topY / 2, 0));
      g.add(mesh(BOX(), stone, topSize * 0.95, 0.14, topSize * 0.95, 0, 0.07, 0));
      g.add(mesh(BOX(), stone, topSize + 0.2, 0.12, topSize + 0.2, 0, topY + 0.06, 0));
      // carved rim shadow line
      g.add(mesh(BOX(), M().flat('#2c2620', { roughness: 1 }), topSize + 0.24, 0.025, topSize + 0.24, 0, topY + 0.002, 0, { shadow: false }));
    } else {
      const wood = M().get('wood', opts.color || '#4a3018');
      g.add(mesh(BOX(), wood, topSize + 0.25, 0.14, topSize + 0.25, 0, topY + 0.07, 0));
      const inset = topSize / 2 - 0.18;
      [[-inset, -inset], [inset, -inset], [-inset, inset], [inset, inset]].forEach(([x, z]) => {
        g.add(mesh(geo('table-leg', () => new THREE.CylinderGeometry(0.07, 0.1, 1, 8)), wood, 1, topY, 1, x, topY / 2, z));
      });
      g.add(mesh(BOX(), wood, topSize * 0.8, 0.09, 0.14, 0, topY * 0.35, 0));
      g.add(mesh(BOX(), wood, 0.14, 0.09, topSize * 0.8, 0, topY * 0.35, 0));
    }
    g.userData.topY = topY + (opts.style === 'stone' ? 0.12 : 0.14);
    return g;
  }

  /** Simple chair facing +z, slight wear. */
  function chair(opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const wood = M().get('wood', opts.color || '#3c2a16');
    g.add(mesh(BOX(), wood, 0.55, 0.07, 0.55, 0, 0.5, 0));
    g.add(mesh(BOX(), wood, 0.55, 0.8, 0.07, 0, 0.93, -0.24));
    g.add(mesh(BOX(), wood, 0.45, 0.1, 0.05, 0, 1.18, -0.24)); // top rail
    [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].forEach(([x, z]) => {
      g.add(mesh(BOX(), wood, 0.06, 0.5, 0.06, x, 0.25, z));
    });
    if (opts.cushion !== false) g.add(mesh(BOX(), M().get('fabric', '#4a2c1c'), 0.46, 0.05, 0.46, 0, 0.56, 0));
    return g;
  }

  // ── Set dressing ─────────────────────────────────────────────────────
  function crate(opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const s = opts.size || 0.6;
    const wood = M().get('wood', '#543a20');
    g.add(mesh(BOX(), wood, s, s, s, 0, s / 2, 0));
    const trim = M().get('wood', '#3a2812', { seed: 29 });
    [[0, s - 0.02], [0, 0.02]].forEach(([_, y]) => {
      g.add(mesh(BOX(), trim, s + 0.03, 0.05, s + 0.03, 0, y, 0, { shadow: false }));
    });
    g.add(mesh(BOX(), trim, 0.05, s, s + 0.03, 0, s / 2, 0, { shadow: false }));
    return g;
  }

  function barrel(opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const h = opts.h || 0.8;
    const body = mesh(geo('barrel', () => new THREE.CylinderGeometry(0.32, 0.27, 1, 14)), M().get('wood', '#4a3018'), 1, h, 1, 0, h / 2, 0);
    g.add(body);
    const iron = M().get('metal', '#2e2e34');
    [0.22, 0.5, 0.78].forEach(f => {
      const ring = mesh(geo('barrelRing', () => new THREE.TorusGeometry(0.315, 0.02, 6, 18)), iron, 1, 1, 1, 0, h * f, 0, { shadow: false });
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
    });
    return g;
  }

  /** A-frame canvas tent: cloth, ridge pole, guy ropes + stakes, warm door glow. */
  function tent(opts) {
    opts = opts || {};
    const w = opts.w || 2.2, d = opts.d || 2.6, h = opts.h || 1.6;
    const g = new THREE.Group();
    const cloth = M().get('fabric', opts.color || '#5a4c38', { seed: 19 });
    const prism = geo(`tent|${w}|${d}|${h}`, () => {
      const shape = new THREE.Shape();
      shape.moveTo(-w / 2, 0); shape.lineTo(0, h); shape.lineTo(w / 2, 0); shape.closePath();
      const eg = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
      eg.translate(0, 0, -d / 2);
      return eg;
    });
    const body = new THREE.Mesh(prism, cloth);
    body.castShadow = true; body.receiveShadow = true;
    g.add(body);
    const wood = M().get('wood', '#3a2a18');
    g.add(mesh(CYL(), wood, 0.05, h + 0.3, 0.05, 0, (h + 0.3) / 2, d / 2 - 0.06));
    g.add(mesh(CYL(), wood, 0.05, h + 0.3, 0.05, 0, (h + 0.3) / 2, -d / 2 + 0.06));
    const ridge = mesh(CYL(), wood, 0.04, d + 0.5, 0.04, 0, h + 0.02, 0);
    ridge.rotation.x = Math.PI / 2;
    g.add(ridge);
    // door flap shadow + warm interior glow
    g.add(mesh(geo('tent-door', () => new THREE.PlaneGeometry(0.5, 0.8)), M().flat('#14100a', { roughness: 1 }), 1, 1, 1, 0, 0.4, d / 2 + 0.012, { shadow: false }));
    if (opts.glow) {
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({
        map: T().glowSprite('#ff9c50'), transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.4,
      }));
      gl.scale.setScalar(0.8);
      gl.position.set(0, 0.45, d / 2 + 0.05);
      g.add(gl);
    }
    // guy ropes + stakes
    const rope = M().flat('#7a6c52', { roughness: 1 });
    [[-1, 0], [1, 0]].forEach(([sx]) => {
      const r = mesh(CYL(), rope, 0.012, 1.1, 0.012, sx * (w / 2 + 0.35), 0.45, 0);
      r.rotation.z = sx * 1.05;
      g.add(r);
      g.add(mesh(BOX(), wood, 0.05, 0.18, 0.05, sx * (w / 2 + 0.7), 0.07, 0));
    });
    return g;
  }

  /** Market stall: counter, posts, striped sloped canopy, goods. */
  function stall(opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const wood = M().get('wood', '#5a4226');
    const cloth = M().get('fabric', opts.color || '#8a4a3a', { seed: 23 });
    g.add(mesh(BOX(), wood, 1.8, 0.9, 0.7, 0, 0.45, 0));
    g.add(mesh(BOX(), M().get('wood', '#6a5232'), 1.9, 0.06, 0.8, 0, 0.93, 0));
    [[-0.85, -0.3], [0.85, -0.3], [-0.85, 0.3], [0.85, 0.3]].forEach(([x, z]) => {
      g.add(mesh(BOX(), wood, 0.08, 2, 0.08, x, 1, z));
    });
    const canopy = mesh(BOX(), cloth, 2.1, 0.05, 1.15, 0, 2.05, 0);
    canopy.rotation.x = -0.18;
    g.add(canopy);
    // goods: sacks + produce
    g.add(mesh(SPHERE(), M().get('fabric', '#8a7a58'), 0.24, 0.2, 0.24, -0.5, 1.05, 0));
    g.add(mesh(SPHERE(), M().get('fabric', '#7a6848'), 0.2, 0.17, 0.2, -0.18, 1.04, 0.12));
    for (let i = 0; i < 5; i++) {
      g.add(mesh(SPHERE(), M().flat(i % 2 ? '#9a4a28' : '#7a8a30', { roughness: 0.7 }), 0.07, 0.07, 0.07, 0.3 + (i % 3) * 0.14, 0.99, -0.12 + Math.floor(i / 3) * 0.16, { shadow: false }));
    }
    return g;
  }

  /** Tree: tapered trunk, root flare, layered two-tone canopy. */
  function tree(opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const h = opts.h || 3.2;
    const bark = M().get('wood', '#3c2c1a', { seed: 71 });
    g.add(mesh(TCYL(), bark, 0.34, h * 0.5, 0.34, 0, h * 0.25, 0));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const root = mesh(TCYL(), bark, 0.12, 0.22, 0.12, Math.cos(a) * 0.16, 0.1, Math.sin(a) * 0.16);
      root.rotation.z = Math.cos(a) * 0.5;
      root.rotation.x = -Math.sin(a) * 0.5;
      g.add(root);
    }
    const leafA = M().get('fabric', opts.color || '#3a5a30', { seed: 91 });
    const leafB = M().get('fabric', opts.color2 || '#2c4824', { seed: 93 });
    const blobs = [
      [0, h * 0.62, 0, h * 0.56, leafA],
      [h * 0.16, h * 0.74, h * 0.06, h * 0.42, leafB],
      [-h * 0.14, h * 0.7, -h * 0.05, h * 0.4, leafB],
      [0.02, h * 0.86, 0.04, h * 0.34, leafA],
    ];
    blobs.forEach(([x, y, z, s, m]) => {
      const b = mesh(SPHERE(), m, s, s * 0.82, s, x, y, z);
      b.rotation.y = x * 7;
      g.add(b);
    });
    return g;
  }

  /** Dead/burnt tree (ashfields silhouettes). */
  function deadTree(opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const h = opts.h || 2.8;
    const charred = M().flat('#181210', { roughness: 1 });
    const trunk = mesh(TCYL(), charred, 0.22, h, 0.22, 0, h / 2, 0);
    trunk.rotation.z = (Math.random() - 0.5) * 0.1;
    g.add(trunk);
    for (let b = 0; b < 4; b++) {
      const br = mesh(TCYL(), charred, 0.07, h * 0.35, 0.07, 0.12 * (b % 2 ? 1 : -1), h * (0.5 + b * 0.12), 0);
      br.rotation.z = (b % 2 ? -1 : 1) * (0.9 + b * 0.12);
      br.rotation.y = b * 1.3;
      g.add(br);
    }
    return g;
  }

  function rock(opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const s = opts.size || 0.5;
    const m = mesh(geo('rock', () => new THREE.DodecahedronGeometry(0.5, 0)), M().get('stone', opts.color || '#56524a'), s, s * 0.7, s, 0, s * 0.3, 0);
    m.rotation.set(Math.random() * 0.6, Math.random() * Math.PI, 0);
    g.add(m);
    return g;
  }

  /** Standing lantern post: scrollwork bracket, glass cage, glow sprite. */
  function lanternPost(opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const iron = M().get('metal', '#2c2c32');
    g.add(mesh(TCYL(), iron, 0.13, 2.5, 0.13, 0, 1.25, 0));
    g.add(mesh(BOX(), iron, 0.5, 0.045, 0.045, 0.18, 2.42, 0));
    const cage = new THREE.Group();
    cage.position.set(0.38, 2.3, 0);
    cage.add(mesh(BOX(), iron, 0.22, 0.03, 0.22, 0, 0.14, 0));
    cage.add(mesh(BOX(), iron, 0.22, 0.03, 0.22, 0, -0.14, 0));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      cage.add(mesh(BOX(), iron, 0.02, 0.28, 0.02, sx * 0.09, 0, sz * 0.09, { shadow: false }));
    });
    const glass = mesh(BOX(), M().flat('#ffd690', { roughness: 0.4, emissive: '#ffbe66', emissiveIntensity: 1.2 }), 0.13, 0.18, 0.13, 0, 0, 0, { shadow: false });
    cage.add(glass);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({
      map: T().glowSprite('#ffce86'), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.55,
    }));
    gl.scale.setScalar(0.7);
    cage.add(gl);
    g.add(cage);
    if (opts.light) {
      const light = new THREE.PointLight(0xffc070, 0.85, 8, 2);
      light.position.set(0.38, 2.3, 0);
      g.add(light);
    }
    addAnim(g, [(t) => { gl.material.opacity = 0.45 + 0.12 * Math.sin(t * 5.2); }]);
    return g;
  }

  /** Faction flag: tall pole, cross-arm, hanging crest banner. The faction
   *  palettes (Story3D.Content.FACTIONS) make allegiance readable at range. */
  function flag(opts) {
    opts = opts || {};
    const h = opts.h || 3.6;
    const g = new THREE.Group();
    const wood = M().get('wood', '#3c2e1c');
    g.add(mesh(TCYL(), wood, 0.11, h, 0.11, 0, h / 2, 0));
    g.add(mesh(SPHERE(), M().get('metal', opts.trim || '#c8a040', { metalness: 0.7 }), 0.09, 0.09, 0.09, 0, h + 0.04, 0, { shadow: false }));
    const arm = mesh(BOX(), wood, 0.06, 0.06, 0.7, 0, h - 0.18, 0.3);
    g.add(arm);
    const cloth = banner({ color: opts.color || '#e4c058', seed: opts.seed, w: 0.55, h: 1.5 });
    cloth.position.set(0, h - 0.22, 0.55);
    cloth.rotation.y = Math.PI / 2;
    g.add(cloth);
    addAnim(g, cloth.userData.animators || []);
    return g;
  }

  /** Low wooden fence segment along x. */
  function fence(opts) {
    opts = opts || {};
    const len = opts.len || 2.4;
    const g = new THREE.Group();
    const wood = M().get('wood', '#4c3a24');
    const posts = Math.max(2, Math.round(len / 1.2) + 1);
    for (let i = 0; i < posts; i++) {
      g.add(mesh(BOX(), wood, 0.09, 0.9, 0.09, -len / 2 + (len * i) / (posts - 1), 0.45, 0));
    }
    const r1 = mesh(BOX(), wood, len, 0.06, 0.045, 0, 0.7, 0);
    r1.rotation.z = 0.012;
    g.add(r1);
    g.add(mesh(BOX(), wood, len, 0.06, 0.045, 0, 0.38, 0));
    return g;
  }

  /** Half-timbered building: plaster walls, dark beams, shutters, pitched
   * roof with ridge, optional chimney + glowing windows. */
  function building(opts) {
    opts = opts || {};
    const w = opts.w || 4, d = opts.d || 4, h = opts.h || 3;
    const g = new THREE.Group();
    const wall = opts.wallMat || M().get('plaster', opts.wallColor || '#6a5a44');
    const beam = M().get('wood', '#2e2014', { seed: 27 });
    g.add(mesh(BOX(), wall, w, h, d, 0, h / 2, 0));
    // stone foundation
    g.add(mesh(BOX(), M().get('stone', '#46403a'), w + 0.12, 0.5, d + 0.12, 0, 0.25, 0));
    // half-timber framing on front + back faces
    [d / 2 + 0.025, -d / 2 - 0.025].forEach(z => {
      g.add(mesh(BOX(), beam, w + 0.05, 0.12, 0.06, 0, h - 0.08, z, { shadow: false }));
      g.add(mesh(BOX(), beam, w + 0.05, 0.12, 0.06, 0, h * 0.52, z, { shadow: false }));
      const uprights = Math.max(2, Math.round(w / 1.4));
      for (let i = 0; i <= uprights; i++) {
        g.add(mesh(BOX(), beam, 0.1, h - 0.5, 0.06, -w / 2 + (w * i) / uprights, (h + 0.5) / 2 - 0.25 + 0.25, z, { shadow: false }));
      }
      const diag = mesh(BOX(), beam, 0.09, h * 0.5, 0.055, -w * 0.32, h * 0.72, z, { shadow: false });
      diag.rotation.z = 0.7;
      g.add(diag);
    });
    // pitched roof + ridge + eaves
    const roofGeo = geo(`roof|${w}|${d}`, () => {
      const shape = new THREE.Shape();
      shape.moveTo(-w / 2 - 0.35, 0); shape.lineTo(0, Math.min(w, 4) * 0.46); shape.lineTo(w / 2 + 0.35, 0); shape.closePath();
      const eg = new THREE.ExtrudeGeometry(shape, { depth: d + 0.6, bevelEnabled: false });
      eg.translate(0, 0, -(d + 0.6) / 2);
      return eg;
    });
    const roofM = new THREE.Mesh(roofGeo, M().get('wood', opts.roofColor || '#33261a', { seed: 31 }));
    roofM.position.y = h;
    roofM.castShadow = true; roofM.receiveShadow = true;
    g.add(roofM);
    const ridge = mesh(CYL(), beam, 0.09, d + 0.7, 0.09, 0, h + Math.min(w, 4) * 0.46, 0);
    ridge.rotation.x = Math.PI / 2;
    g.add(ridge);
    if (opts.chimney) {
      g.add(mesh(BOX(), M().get('stone', '#4a423a'), 0.55, 1.4, 0.55, w * 0.28, h + 0.9, -d * 0.15));
      g.add(mesh(BOX(), M().get('stone', '#3a342e'), 0.68, 0.16, 0.68, w * 0.28, h + 1.62, -d * 0.15));
    }
    if (opts.doorSide !== null) {
      const doorG = new THREE.Group();
      doorG.add(mesh(BOX(), M().get('wood', '#241a10'), 0.92, 1.78, 0.1, 0, 0.89, 0));
      doorG.add(mesh(BOX(), beam, 1.1, 0.14, 0.12, 0, 1.84, 0)); // lintel
      doorG.add(mesh(SPHERE(), M().get('metal', '#8a7a40'), 0.045, 0.045, 0.045, 0.3, 0.95, 0.06, { shadow: false }));
      const side = opts.doorSide || 's';
      if (side === 's') doorG.position.z = d / 2 + 0.05;
      if (side === 'n') { doorG.position.z = -d / 2 - 0.05; doorG.rotation.y = Math.PI; }
      if (side === 'e') { doorG.position.x = w / 2 + 0.05; doorG.rotation.y = Math.PI / 2; }
      if (side === 'w') { doorG.position.x = -w / 2 - 0.05; doorG.rotation.y = -Math.PI / 2; }
      g.add(doorG);
    }
    const winCount = opts.windows ?? 2;
    const shutter = M().get('wood', '#3a4a2a', { seed: 35 });
    for (let i = 0; i < winCount; i++) {
      const x = (i - (winCount - 1) / 2) * (w / Math.max(winCount, 1)) * 0.62;
      const winG = new THREE.Group();
      winG.position.set(x, h * 0.62, d / 2 + 0.04);
      winG.add(mesh(BOX(), beam, 0.6, 0.78, 0.05, 0, 0, 0, { shadow: false }));
      const pane = mesh(PLANE(),
        opts.glowWindows
          ? M().flat('#ffcf7a', { roughness: 0.5, emissive: '#ff9c3c', emissiveIntensity: 1.1 })
          : M().flat('#141a24', { roughness: 0.3 }),
        0.48, 0.66, 1, 0, 0, 0.035, { shadow: false });
      pane.castShadow = false;
      winG.add(pane);
      winG.add(mesh(BOX(), beam, 0.04, 0.66, 0.02, 0, 0, 0.045, { shadow: false }));
      winG.add(mesh(BOX(), beam, 0.48, 0.04, 0.02, 0, 0.08, 0.045, { shadow: false }));
      [-1, 1].forEach(sx => winG.add(mesh(BOX(), shutter, 0.16, 0.7, 0.03, sx * 0.4, 0, 0.01, { shadow: false })));
      if (opts.glowWindows) {
        const gl = new THREE.Sprite(new THREE.SpriteMaterial({
          map: T().glowSprite('#ffb866'), transparent: true, depthWrite: false,
          blending: THREE.AdditiveBlending, opacity: 0.4,
        }));
        gl.scale.setScalar(0.9);
        gl.position.z = 0.1;
        winG.add(gl);
      }
      g.add(winG);
    }
    return g;
  }

  /** Windmill: stone tower, pitched cap, four cloth sails that turn. */
  function windmill(opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const h = opts.h || 5;
    g.add(mesh(geo('mill-tower', () => new THREE.CylinderGeometry(0.9, 1.25, 1, 10)), M().get('stone', '#6a6052'), 1, h, 1, 0, h / 2, 0));
    g.add(mesh(CONE(), M().get('wood', '#33261a'), 2.4, 1.2, 2.4, 0, h + 0.55, 0));
    const hubG = new THREE.Group();
    hubG.position.set(0, h - 0.4, 1.05);
    g.add(hubG);
    hubG.add(mesh(CYL(), M().get('wood', '#3a2a18'), 0.14, 0.5, 0.14, 0, 0, -0.2));
    const sailCloth = M().get('fabric', '#d8cdb6', { seed: 143 });
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.z = (i / 4) * Math.PI * 2;
      const sail = mesh(BOX(), sailCloth, 0.55, 2.4, 0.04, 0, 1.45, 0);
      const spar = mesh(BOX(), M().get('wood', '#3a2a18'), 0.08, 2.8, 0.08, 0, 1.4, -0.04);
      arm.add(sail, spar);
      hubG.add(arm);
    }
    addAnim(g, [(t) => { hubG.rotation.z = t * 0.45; }]);
    return g;
  }

  /** Scatter pebbles + grass tufts inside a rect, keeping a clear centre. */
  function scatter(opts) {
    opts = opts || {};
    const g = new THREE.Group();
    const count = opts.count ?? 26;
    const w = opts.w ?? 16, d = opts.d ?? 12, clear = opts.clear ?? 2.5;
    const pebble = geo('pebble', () => new THREE.DodecahedronGeometry(0.5, 0));
    const tuftGeo = geo('tuft', () => new THREE.ConeGeometry(0.5, 1, 5));
    const stoneM = M().get('stone', opts.stoneColor || '#54504a');
    const grassA = M().flat(opts.grassColor || '#3e5230', { roughness: 1 });
    const grassB = M().flat(opts.grassColor2 || '#2e4024', { roughness: 1 });
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * w;
      const z = (Math.random() - 0.5) * d;
      if (Math.hypot(x, z) < clear) continue;
      if (opts.grass !== false && i % 3 !== 0) {
        const s = 0.06 + Math.random() * 0.08;
        const tuft = new THREE.Group();
        for (let b = 0; b < 3; b++) {
          const blade = mesh(tuftGeo, b % 2 ? grassA : grassB, s, s * (2.4 + Math.random()), s, (Math.random() - 0.5) * 0.1, 0.08, (Math.random() - 0.5) * 0.1, { shadow: false });
          blade.rotation.z = (Math.random() - 0.5) * 0.5;
          tuft.add(blade);
        }
        tuft.position.set(x, 0, z);
        g.add(tuft);
      } else {
        const s = 0.07 + Math.random() * 0.12;
        const p = mesh(pebble, stoneM, s, s * 0.7, s, x, s * 0.3, z, { shadow: false });
        p.rotation.y = Math.random() * Math.PI;
        g.add(p);
      }
    }
    return g;
  }

  return {
    geo, mesh, BOX, CYL, TCYL, CONE, SPHERE, PLANE,
    torch, campfire, candle, banner, arch, stainedWindow, throne, column, rug,
    boardTable, chair, crate, barrel, tent, stall, tree, deadTree, rock,
    lanternPost, flag, fence, building, scatter, windmill,
  };
});
