/**
 * story3d_textures.js — procedural canvas textures (no downloaded assets).
 *
 * Every texture is generated from seeded value-noise on an offscreen canvas
 * and returned as { map, bumpMap, roughnessMap } CanvasTextures. Results are
 * cached by (kind, color, seed, size) and marked shared so scene disposal
 * never frees them. The noise math is pure and exported for unit tests.
 * Color maps are tagged sRGB so lighting math stays linear-correct.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(null);
  else { root.Story3D.Textures = factory(root.THREE); }
})(typeof self !== 'undefined' ? self : this, function (THREE) {
  'use strict';

  // ── Pure math (unit-tested) ──────────────────────────────────────────
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function _hash2(seed, xi, yi) {
    let h = seed ^ Math.imul(xi, 374761393) ^ Math.imul(yi, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // Tileable value noise over a `period`-sized lattice (so texture repeat
  // wraps seamlessly). Returns values in [0,1].
  function valueNoise(seed, x, y, period) {
    const p = period || 256;
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
    const w = (i) => ((i % p) + p) % p;
    const a = _hash2(seed, w(xi), w(yi));
    const b = _hash2(seed, w(xi + 1), w(yi));
    const c = _hash2(seed, w(xi), w(yi + 1));
    const d = _hash2(seed, w(xi + 1), w(yi + 1));
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }

  function fbm(seed, x, y, octaves, period) {
    let sum = 0, amp = 0.5, freq = 1, norm = 0;
    for (let o = 0; o < (octaves || 4); o++) {
      sum += amp * valueNoise(seed + o * 1013, x * freq, y * freq, (period || 256) * freq);
      norm += amp; amp *= 0.5; freq *= 2;
    }
    return sum / norm;
  }

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const v = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  const PURE = { mulberry32, valueNoise, fbm, hexToRgb, clamp01 };
  if (!THREE) return PURE; // Node: math only

  // ── Canvas plumbing ──────────────────────────────────────────────────
  const _cache = new Map();

  function _makeCanvas(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
  }

  function _toTexture(canvas, srgb) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    if (srgb) tex.encoding = THREE.sRGBEncoding;
    tex.userData.story3dShared = true;
    return tex;
  }

  /**
   * Generate a texture set from a per-pixel field.
   * field(nx, ny) → { v: 0..1 height/shade, tint?: [r,g,b] override }
   * Color = base rgb shaded by v around `contrast`.
   */
  function _generate(key, size, baseHex, contrast, roughBase, roughSpan, field) {
    if (_cache.has(key)) return _cache.get(key);
    const [br, bg, bb] = hexToRgb(baseHex);
    const colorC = _makeCanvas(size), bumpC = _makeCanvas(size), roughC = _makeCanvas(size);
    const ci = colorC.getContext('2d').createImageData(size, size);
    const bi = bumpC.getContext('2d').createImageData(size, size);
    const ri = roughC.getContext('2d').createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const f = field(x / size, y / size);
        const v = clamp01(f.v);
        const shade = 1 - contrast + contrast * v;
        const t = f.tint;
        ci.data[i]     = Math.min(255, (t ? t[0] : br) * shade);
        ci.data[i + 1] = Math.min(255, (t ? t[1] : bg) * shade);
        ci.data[i + 2] = Math.min(255, (t ? t[2] : bb) * shade);
        ci.data[i + 3] = 255;
        const bv = Math.round(v * 255);
        bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = bv; bi.data[i + 3] = 255;
        const rv = Math.round(clamp01(roughBase + roughSpan * (1 - v)) * 255);
        ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = rv; ri.data[i + 3] = 255;
      }
    }
    colorC.getContext('2d').putImageData(ci, 0, 0);
    bumpC.getContext('2d').putImageData(bi, 0, 0);
    roughC.getContext('2d').putImageData(ri, 0, 0);
    const set = {
      map: _toTexture(colorC, true),
      bumpMap: _toTexture(bumpC, false),
      roughnessMap: _toTexture(roughC, false),
    };
    _cache.set(key, set);
    return set;
  }

  // ── Generators ───────────────────────────────────────────────────────
  // Each returns { map, bumpMap, roughnessMap }, cached.

  function stone(baseHex, seed, size) {
    size = size || 256; seed = seed || 7;
    return _generate(`stone|${baseHex}|${seed}|${size}`, size, baseHex, 0.55, 0.75, 0.2, (nx, ny) => {
      const block = fbm(seed, nx * 6, ny * 6, 4, 6);
      // mortar lines between rough courses
      const course = Math.abs(Math.sin(ny * Math.PI * 8 + valueNoise(seed + 5, nx * 3, ny * 3, 3) * 1.2));
      const mortar = course < 0.12 ? 0.45 : 1;
      const cracks = fbm(seed + 99, nx * 18, ny * 18, 3, 18) > 0.62 ? 0.85 : 1;
      return { v: (0.45 + 0.55 * block) * mortar * cracks };
    });
  }

  function plaster(baseHex, seed, size) {
    size = size || 256; seed = seed || 11;
    return _generate(`plaster|${baseHex}|${seed}|${size}`, size, baseHex, 0.25, 0.85, 0.1, (nx, ny) => {
      const mottle = fbm(seed, nx * 3, ny * 3, 4, 3);
      const stain = fbm(seed + 31, nx * 1.5, ny * 4, 2, 4) > 0.66 ? 0.88 : 1;
      return { v: (0.6 + 0.4 * mottle) * stain };
    });
  }

  function wood(baseHex, seed, size) {
    size = size || 256; seed = seed || 23;
    return _generate(`wood|${baseHex}|${seed}|${size}`, size, baseHex, 0.5, 0.6, 0.25, (nx, ny) => {
      // grain: stretched noise + plank seams across x
      const grain = fbm(seed, nx * 30, ny * 3, 4, 30);
      const ring = Math.abs(Math.sin((ny * 4 + grain * 2.2) * Math.PI));
      const plank = (nx * 4) % 1 < 0.03 ? 0.55 : 1;
      return { v: (0.5 + 0.35 * ring + 0.15 * grain) * plank };
    });
  }

  function fabric(baseHex, seed, size) {
    size = size || 128; seed = seed || 41;
    // Soft cloth: broad mottle + a faint weft line. (The old sin(x)·sin(y)
    // "weave" read as a hard checkerboard on characters at close range.)
    return _generate(`fabric|${baseHex}|${seed}|${size}`, size, baseHex, 0.16, 0.9, 0.08, (nx, ny) => {
      const wear = fbm(seed, nx * 3, ny * 3, 4, 3);
      const fold = fbm(seed + 13, nx * 1.5, ny * 1.5, 2, 2);
      const thread = Math.sin(ny * Math.PI * 96) * 0.03;
      return { v: 0.62 + 0.22 * wear + 0.13 * fold + thread };
    });
  }

  function metal(baseHex, seed, size) {
    size = size || 128; seed = seed || 53;
    return _generate(`metal|${baseHex}|${seed}|${size}`, size, baseHex, 0.35, 0.3, 0.25, (nx, ny) => {
      const streak = fbm(seed, nx * 40, ny * 2, 3, 40);     // brushed anisotropy
      const dent = fbm(seed + 17, nx * 8, ny * 8, 3, 8) > 0.72 ? 0.8 : 1;
      return { v: (0.6 + 0.4 * streak) * dent };
    });
  }

  function ground(baseHex, seed, size) {
    size = size || 256; seed = seed || 67;
    return _generate(`ground|${baseHex}|${seed}|${size}`, size, baseHex, 0.5, 0.95, 0.05, (nx, ny) => {
      const soil = fbm(seed, nx * 8, ny * 8, 4, 8);
      const patch = fbm(seed + 7, nx * 2.5, ny * 2.5, 3, 3);
      return { v: 0.4 + 0.4 * soil + 0.2 * patch };
    });
  }

  // Checkered marble/slate — used for the chessboard top and palace floors.
  function checker(lightHex, darkHex, seed, size, cells) {
    size = size || 512; seed = seed || 71; cells = cells || 8;
    const key = `checker|${lightHex}|${darkHex}|${seed}|${size}|${cells}`;
    const L = hexToRgb(lightHex), D = hexToRgb(darkHex);
    return _generate(key, size, lightHex, 0.18, 0.45, 0.15, (nx, ny) => {
      const cx = Math.floor(nx * cells), cy = Math.floor(ny * cells);
      const dark = (cx + cy) % 2 === 1;
      const vein = fbm(seed + (dark ? 3 : 0), nx * 10, ny * 10, 4, 10);
      const marble = 0.75 + 0.25 * Math.abs(Math.sin((nx + vein * 0.6) * Math.PI * 7));
      return { v: marble, tint: dark ? D : L };
    });
  }

  // ── Sprite / decal textures (single canvases, not map sets) ─────────
  const _spriteCache = new Map();

  /** Soft radial glow sprite — for fire glow, lantern halos, ember points. */
  function glowSprite(hex, size) {
    size = size || 128;
    const key = `glow|${hex}|${size}`;
    if (_spriteCache.has(key)) return _spriteCache.get(key);
    const c = _makeCanvas(size);
    const ctx = c.getContext('2d');
    const [r, g, b] = hexToRgb(hex);
    const grad = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
    grad.addColorStop(0.35, `rgba(${r},${g},${b},0.55)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.userData.story3dShared = true;
    return _spriteCache.set(key, tex).get(key);
  }

  /** Soft smoke puff sprite (grey, very diffuse). */
  function smokeSprite(size) {
    size = size || 128;
    const key = `smoke|${size}`;
    if (_spriteCache.has(key)) return _spriteCache.get(key);
    const c = _makeCanvas(size);
    const ctx = c.getContext('2d');
    for (let i = 0; i < 5; i++) {
      const x = size * (0.3 + Math.abs(valueNoise(31, i * 1.7, 0, 8)) * 0.4);
      const y = size * (0.3 + Math.abs(valueNoise(37, 0, i * 1.7, 8)) * 0.4);
      const r = size * (0.18 + i * 0.05);
      const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
      grad.addColorStop(0, 'rgba(150,145,140,0.25)');
      grad.addColorStop(1, 'rgba(150,145,140,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.userData.story3dShared = true;
    return _spriteCache.set(key, tex).get(key);
  }

  /** Vertical flame tongue with hot core → tinted edge falloff. */
  function flameSprite(coreHex, edgeHex, size) {
    size = size || 128;
    const key = `flame|${coreHex}|${edgeHex}|${size}`;
    if (_spriteCache.has(key)) return _spriteCache.get(key);
    const c = _makeCanvas(size);
    const ctx = c.getContext('2d');
    const [cr, cg, cb] = hexToRgb(coreHex);
    const [er, eg, eb] = hexToRgb(edgeHex);
    // teardrop: wide at the bottom third, tapering to the tip
    for (let y = 0; y < size; y++) {
      const t = y / size;                       // 0 top (tip) → 1 bottom
      const w = Math.sin(Math.min(1, (1 - t) * 1.25) * Math.PI * 0.5) * (0.16 + 0.34 * t);
      const cx = size / 2 + Math.sin(t * 6) * size * 0.02;
      const grad = ctx.createLinearGradient(cx - w * size, y, cx + w * size, y);
      const core = `rgba(${cr},${cg},${cb},${0.9 * (1 - t * 0.25)})`;
      const edge = `rgba(${er},${eg},${eb},0)`;
      grad.addColorStop(0, edge);
      grad.addColorStop(0.5, core);
      grad.addColorStop(1, edge);
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, size, 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.userData.story3dShared = true;
    return _spriteCache.set(key, tex).get(key);
  }

  /** Leaded stained-glass mosaic (lit-from-behind look). */
  function stainedGlassSprite(seed, w, h) {
    w = w || 96; h = h || 256;
    const key = `sglass|${seed}|${w}|${h}`;
    if (_spriteCache.has(key)) return _spriteCache.get(key);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    // sombre cathedral palette — deep blues and violets with rare gold
    const jewel = ['#222e52', '#2a2050', '#1c3246', '#322048', '#1e3a30', '#243056', '#5a4416'];
    const rng = mulberry32(seed || 3);
    const cols = 4, rows = 10;
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        ctx.fillStyle = jewel[Math.floor(rng() * jewel.length)];
        ctx.fillRect(col * w / cols, r * h / rows, w / cols, h / rows);
        // faint backlight in each pane
        const g = ctx.createRadialGradient(
          (col + 0.5) * w / cols, (r + 0.5) * h / rows, 1,
          (col + 0.5) * w / cols, (r + 0.5) * h / rows, w / cols * 0.7);
        g.addColorStop(0, 'rgba(220,228,255,0.18)');
        g.addColorStop(1, 'rgba(220,228,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(col * w / cols, r * h / rows, w / cols, h / rows);
      }
    }
    // lead lines
    ctx.strokeStyle = '#16120c';
    ctx.lineWidth = 3;
    for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * h / rows); ctx.lineTo(w, r * h / rows); ctx.stroke(); }
    for (let col = 0; col <= cols; col++) { ctx.beginPath(); ctx.moveTo(col * w / cols, 0); ctx.lineTo(col * w / cols, h); ctx.stroke(); }
    // arched top: darken the corners
    ctx.fillStyle = '#16120c';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w * 0.3, 0); ctx.quadraticCurveTo(0, h * 0.02, 0, h * 0.14); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(w * 0.7, 0); ctx.quadraticCurveTo(w, h * 0.02, w, h * 0.14); ctx.closePath(); ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.userData.story3dShared = true;
    return _spriteCache.set(key, tex).get(key);
  }

  /** Banner cloth with hem bands and a woven crest diamond. */
  function bannerSprite(hex, seed) {
    const w = 96, h = 256;
    const key = `banner|${hex}|${seed || 0}`;
    if (_spriteCache.has(key)) return _spriteCache.get(key);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const [r, g, b] = hexToRgb(hex);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, w, h);
    // weave shading
    for (let y = 0; y < h; y += 2) {
      ctx.fillStyle = `rgba(0,0,0,${0.06 + 0.05 * valueNoise(seed || 13, 0, y * 0.13, 32)})`;
      ctx.fillRect(0, y, w, 1);
    }
    const dark = `rgba(${Math.round(r * 0.45)},${Math.round(g * 0.45)},${Math.round(b * 0.45)},1)`;
    const light = `rgba(${Math.min(255, Math.round(r * 1.5 + 40))},${Math.min(255, Math.round(g * 1.5 + 40))},${Math.min(255, Math.round(b * 1.4 + 30))},1)`;
    // hem bands top + bottom
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, w, 10); ctx.fillRect(0, h - 12, w, 12);
    ctx.fillStyle = light;
    ctx.fillRect(0, 12, w, 4); ctx.fillRect(0, h - 16, w, 3);
    // crest diamond + border
    ctx.save();
    ctx.translate(w / 2, h * 0.42);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = light;
    ctx.fillRect(-19, -19, 38, 38);
    ctx.fillStyle = dark;
    ctx.fillRect(-13, -13, 26, 26);
    ctx.restore();
    // edge wear
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = 0; y < h; y += 5) {
      if (valueNoise(seed || 13, 1, y, 64) > 0.6) { ctx.fillRect(0, y, 2, 4); ctx.fillRect(w - 2, y + 2, 2, 4); }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.userData.story3dShared = true;
    return _spriteCache.set(key, tex).get(key);
  }

  /** Quest/NPC marker sprite: '?', '!', '✓' glyphs or a 'bubble' chat icon,
   *  drawn with a dark outline so they read against any scene. */
  function markerSprite(kind, color) {
    const size = 128;
    const key = `marker|${kind}|${color}`;
    if (_spriteCache.has(key)) return _spriteCache.get(key);
    const c = _makeCanvas(size);
    const ctx = c.getContext('2d');
    if (kind === 'bubble') {
      // rounded chat bubble with three dots
      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(10,8,4,0.9)';
      ctx.lineWidth = 7;
      const r = 16;
      ctx.beginPath();
      ctx.moveTo(24 + r, 22);
      ctx.lineTo(104 - r, 22); ctx.quadraticCurveTo(104, 22, 104, 22 + r);
      ctx.lineTo(104, 74 - r); ctx.quadraticCurveTo(104, 74, 104 - r, 74);
      ctx.lineTo(64, 74); ctx.lineTo(46, 100); ctx.lineTo(50, 74);
      ctx.lineTo(24 + r, 74); ctx.quadraticCurveTo(24, 74, 24, 74 - r);
      ctx.lineTo(24, 22 + r); ctx.quadraticCurveTo(24, 22, 24 + r, 22);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(10,8,4,0.85)';
      [44, 64, 84].forEach(x => { ctx.beginPath(); ctx.arc(x, 48, 5.5, 0, Math.PI * 2); ctx.fill(); });
    } else {
      ctx.font = '900 96px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 12;
      ctx.strokeStyle = 'rgba(10,8,4,0.9)';
      ctx.strokeText(kind, size / 2, size / 2 + 4);
      ctx.fillStyle = color;
      ctx.fillText(kind, size / 2, size / 2 + 4);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.userData.story3dShared = true;
    return _spriteCache.set(key, tex).get(key);
  }

  return Object.assign({}, PURE, {
    stone, plaster, wood, fabric, metal, ground, checker,
    glowSprite, smokeSprite, flameSprite, stainedGlassSprite, bannerSprite,
    markerSprite,
    _cacheSize: () => _cache.size,
  });
});
