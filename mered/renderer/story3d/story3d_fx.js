/**
 * story3d_fx.js — animated effects: fire, embers, smoke, stars, motes, mist.
 *
 * The 2D scenes' signature ambience (ember particles, drifting stars, dust
 * motes, mist — BG_RENDERERS L19094–19170) recreated in 3D. Every builder
 * returns a group with `userData.animators = [fn(t, dt)]`; stages collect
 * them with one traverse. Particle counts follow the 2D caps (~30/scene).
 * Per-instance materials/geometries are left unmarked so disposeGroup frees
 * them; the underlying sprite textures are shared.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(null, null);
  else { root.Story3D.FX = factory(root.THREE, root.Story3D); }
})(typeof self !== 'undefined' ? self : this, function (THREE, NS) {
  'use strict';
  if (!THREE) return {};

  const T = () => NS.Textures;

  function _flameLayer(core, edge, w, h, y) {
    // Two crossed planes so the tongue reads from every angle.
    const tex = T().flameSprite(core, edge);
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const geo = new THREE.PlaneGeometry(w, h);
    const g = new THREE.Group();
    for (let i = 0; i < 2; i++) {
      const p = new THREE.Mesh(geo, mat);
      p.rotation.y = i * Math.PI / 2;
      p.position.y = y + h / 2;
      p.castShadow = false;
      g.add(p);
    }
    return g;
  }

  /**
   * Layered fire: hot core, orange mid, red outer tongues + glow sprite +
   * rising embers + optional smoke and flickering light.
   * opts: { scale, embers, smoke, light, intensity, range }
   */
  function fire(opts) {
    opts = opts || {};
    const s = opts.scale ?? 1;
    const g = new THREE.Group();
    const animators = [];

    const layers = [
      _flameLayer('#fff6cc', '#ffc040', 0.22 * s, 0.5 * s, 0.02),
      _flameLayer('#ffd060', '#ff6a18', 0.34 * s, 0.72 * s, 0.0),
      _flameLayer('#ff8030', '#b02808', 0.46 * s, 0.9 * s, -0.02),
    ];
    layers.forEach((l, i) => {
      g.add(l);
      const phase = Math.random() * Math.PI * 2;
      const speed = 7 + i * 2.3;
      animators.push((t) => {
        const f = 0.86 + 0.14 * Math.sin(t * speed + phase) * Math.sin(t * (speed * 0.53) + phase * 2);
        l.scale.set(0.9 + 0.2 * f, f, 0.9 + 0.2 * f);
        l.rotation.y = (i % 2 ? -1 : 1) * t * (0.6 + i * 0.25);
      });
    });

    // Glow
    const glowMat = new THREE.SpriteMaterial({
      map: T().glowSprite('#ff9a40'), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.85,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(1.5 * s);
    glow.position.y = 0.3 * s;
    g.add(glow);
    animators.push((t) => {
      const f = 0.8 + 0.2 * Math.sin(t * 8.7) * Math.sin(t * 3.9);
      glow.scale.setScalar(1.5 * s * f);
      glowMat.opacity = 0.65 + 0.25 * f;
    });

    // Embers — the 2D _bgSpawnEmber behaviour: up-drift, wiggle, respawn.
    const emberCount = opts.embers ?? Math.round(10 * s);
    if (emberCount > 0) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(emberCount * 3);
      const col = new Float32Array(emberCount * 3);
      const parts = [];
      for (let i = 0; i < emberCount; i++) {
        parts.push({
          x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: Math.random(), max: 1.2 + Math.random(),
        });
      }
      const respawn = (p) => {
        p.x = (Math.random() - 0.5) * 0.24 * s;
        p.z = (Math.random() - 0.5) * 0.24 * s;
        p.y = 0.1 * s;
        p.vx = (Math.random() - 0.5) * 0.12;
        p.vz = (Math.random() - 0.5) * 0.12;
        p.vy = (0.35 + Math.random() * 0.5) * s;
        p.life = 0;
        p.max = 1.0 + Math.random() * 1.2;
      };
      parts.forEach(respawn);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({
        map: T().glowSprite('#ff8a30', 64), size: 0.055 * s, vertexColors: true,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      pts.frustumCulled = false;
      g.add(pts);
      animators.push((t, dt) => {
        for (let i = 0; i < emberCount; i++) {
          const p = parts[i];
          p.life += dt;
          if (p.life >= p.max) respawn(p);
          p.x += (p.vx + Math.sin(t * 3 + i) * 0.04) * dt;
          p.z += (p.vz + Math.cos(t * 2.6 + i * 1.7) * 0.04) * dt;
          p.y += p.vy * dt;
          const k = 1 - p.life / p.max; // hot → dark
          pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
          col[i * 3] = k; col[i * 3 + 1] = k * 0.45; col[i * 3 + 2] = k * 0.1;
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;
      });
    }

    // Smoke puffs
    if (opts.smoke) {
      for (let i = 0; i < 3; i++) {
        const sm = new THREE.SpriteMaterial({
          map: T().smokeSprite(), transparent: true, depthWrite: false, opacity: 0,
        });
        const sp = new THREE.Sprite(sm);
        g.add(sp);
        const offset = i / 3;
        animators.push((t) => {
          const k = ((t * 0.22) + offset) % 1;
          sp.position.set(Math.sin(t * 0.7 + i * 2) * 0.15 * s, (0.6 + k * 1.7) * s, Math.cos(t * 0.5 + i) * 0.1 * s);
          sp.scale.setScalar((0.5 + k * 1.1) * s);
          sm.opacity = 0.16 * Math.sin(k * Math.PI);
        });
      }
    }

    // Light
    if (opts.light) {
      const light = new THREE.PointLight(0xff8c3a, opts.intensity ?? 1.4, opts.range ?? 11, 2);
      light.position.y = 0.5 * s;
      g.add(light);
      const base = opts.intensity ?? 1.4;
      animators.push((t) => {
        light.intensity = base * (0.86 + 0.1 * Math.sin(t * 9.3) + 0.06 * Math.sin(t * 23.7));
      });
    }

    g.userData.animators = animators;
    return g;
  }

  /** Small steady candle flame (war room, archive). */
  function candle(opts) {
    opts = opts || {};
    return fire({ scale: opts.scale ?? 0.3, embers: 0, smoke: false, light: opts.light, intensity: opts.intensity ?? 0.7, range: opts.range ?? 7 });
  }

  /** Star dome with slow drift + twinkle (2D: 40 stars, gentle vx). */
  function stars(opts) {
    opts = opts || {};
    const count = opts.count ?? 80;
    const radius = opts.radius ?? 40;
    const g = new THREE.Group();
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const az = Math.random() * Math.PI * 2;
      const el = 0.12 + Math.random() * 1.3; // keep off the horizon
      pos[i * 3] = Math.cos(az) * Math.cos(el) * radius;
      pos[i * 3 + 1] = Math.sin(el) * radius * 0.6 + 4;
      pos[i * 3 + 2] = Math.sin(az) * Math.cos(el) * radius;
      const b = 0.35 + Math.random() * 0.65;
      col[i * 3] = b; col[i * 3 + 1] = b; col[i * 3 + 2] = b * (0.85 + Math.random() * 0.15);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      map: T().glowSprite('#ffffff', 32), size: 0.5, vertexColors: true,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    g.add(pts);
    if (opts.moon) {
      const moon = new THREE.Sprite(new THREE.SpriteMaterial({
        map: T().glowSprite('#e8ecf4'), transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.9,
      }));
      moon.scale.setScalar(6);
      moon.position.set(-radius * 0.4, radius * 0.42, -radius * 0.55);
      g.add(moon);
    }
    g.userData.animators = [(t) => {
      g.rotation.y = t * 0.004;                       // 2D star drift
      mat.opacity = 0.85 + 0.15 * Math.sin(t * 1.7);  // gentle group twinkle
    }];
    return g;
  }

  /** Dust motes drifting in a box volume (throne rooms — 2D _bgMotes). */
  function motes(opts) {
    opts = opts || {};
    const count = opts.count ?? 16;
    const w = opts.w ?? 10, h = opts.h ?? 5, d = opts.d ?? 8;
    const g = new THREE.Group();
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seeds = [];
    for (let i = 0; i < count; i++) {
      seeds.push({ x: (Math.random() - 0.5) * w, y: Math.random() * h + 0.5, z: (Math.random() - 0.5) * d, ph: Math.random() * 9 });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      map: T().glowSprite('#fff4d8', 32), size: 0.05, transparent: true, opacity: 0.5,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    pts.frustumCulled = false;
    g.add(pts);
    g.userData.animators = [(t) => {
      for (let i = 0; i < count; i++) {
        const s = seeds[i];
        pos[i * 3] = s.x + Math.sin(t * 0.21 + s.ph) * 0.6;
        pos[i * 3 + 1] = s.y + Math.sin(t * 0.13 + s.ph * 2) * 0.4;
        pos[i * 3 + 2] = s.z + Math.cos(t * 0.17 + s.ph) * 0.6;
      }
      geo.attributes.position.needsUpdate = true;
    }];
    return g;
  }

  /** Ground mist: wide soft sprites drifting sideways (2D _bgMist). */
  function mist(opts) {
    opts = opts || {};
    const count = opts.count ?? 4;
    const w = opts.w ?? 16;
    const g = new THREE.Group();
    const sprites = [];
    for (let i = 0; i < count; i++) {
      const m = new THREE.SpriteMaterial({
        map: T().smokeSprite(), transparent: true, depthWrite: false,
        opacity: 0.1, color: new THREE.Color(opts.color || '#aab4be'),
      });
      const sp = new THREE.Sprite(m);
      sp.scale.set(6 + i * 2, 2.2, 1);
      sp.position.set((Math.random() - 0.5) * w, 0.8, (Math.random() - 0.5) * (opts.d ?? 8));
      g.add(sp);
      sprites.push({ sp, m, speed: 0.25 + Math.random() * 0.2 });
    }
    g.userData.animators = [(t, dt) => {
      sprites.forEach(({ sp, m, speed }, i) => {
        sp.position.x += speed * dt;                  // 2D mist drifts right
        if (sp.position.x > w / 2 + 4) sp.position.x = -w / 2 - 4;
        m.opacity = 0.08 + 0.04 * Math.sin(t * 0.5 + i * 2);
      });
    }];
    return g;
  }

  /** Faint volumetric light shaft (window light in interiors). */
  function lightShaft(opts) {
    opts = opts || {};
    const h = opts.h ?? 5, r = opts.r ?? 1.3;
    const geo = new THREE.ConeGeometry(r, h, 12, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(opts.color || '#fff2c8'), transparent: true,
      opacity: opts.opacity ?? 0.06, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const cone = new THREE.Mesh(geo, mat);
    cone.castShadow = false;
    const g = new THREE.Group();
    cone.position.y = -h / 2;
    g.add(cone);
    g.userData.animators = [(t) => { mat.opacity = (opts.opacity ?? 0.06) * (0.85 + 0.15 * Math.sin(t * 0.9)); }];
    return g;
  }

  return { fire, candle, stars, motes, mist, lightShaft };
});
