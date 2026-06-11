/**
 * story3d_materials.js — shared MeshStandardMaterial library.
 *
 * One material instance per (kind, color, options) — cached and marked shared
 * so they survive scene disposal and are reused across every environment.
 * Texture sets come from Story3D.Textures. Palette anchors are taken from the
 * 2D game: CSS vars (--board-light #F0D9B5, --board-dark #B58863, accent
 * #ffcc00) and the BG_RENDERERS scene painters.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(null, null);
  else { root.Story3D.Materials = factory(root.THREE, root.Story3D); }
})(typeof self !== 'undefined' ? self : this, function (THREE, NS) {
  'use strict';
  if (!THREE) return {};

  const T = () => NS.Textures;
  const _cache = new Map();

  const BUMP = { stone: 0.22, plaster: 0.08, wood: 0.1, fabric: 0.05, metal: 0.04, ground: 0.18, checker: 0.05 };

  function _mark(m) { m.userData.story3dShared = true; return m; }

  /** Textured standard material. kind ∈ stone|plaster|wood|fabric|metal|ground */
  function get(kind, hex, opts) {
    opts = opts || {};
    const key = `${kind}|${hex}|${opts.seed || 0}|${opts.repeat || 1}|${opts.metalness || 0}|${opts.emissive || ''}|${opts.emissiveIntensity ?? ''}|${opts.bumpScale ?? ''}`;
    if (_cache.has(key)) return _cache.get(key);
    const texSet = T()[kind](hex, opts.seed);
    const mat = new THREE.MeshStandardMaterial({
      map: texSet.map,
      bumpMap: texSet.bumpMap,
      bumpScale: opts.bumpScale ?? BUMP[kind] ?? 0.1,
      roughnessMap: texSet.roughnessMap,
      roughness: 1,
      metalness: opts.metalness ?? (kind === 'metal' ? 0.65 : 0),
    });
    if (opts.repeat && opts.repeat !== 1) {
      // Clone textures so repeat doesn't leak into other users of the cache.
      mat.map = texSet.map.clone(); mat.map.needsUpdate = true;
      mat.bumpMap = texSet.bumpMap.clone(); mat.bumpMap.needsUpdate = true;
      mat.roughnessMap = texSet.roughnessMap.clone(); mat.roughnessMap.needsUpdate = true;
      [mat.map, mat.bumpMap, mat.roughnessMap].forEach(t => {
        t.repeat.set(opts.repeat, opts.repeat);
        t.userData.story3dShared = true;
      });
    }
    if (opts.emissive) {
      mat.emissive = new THREE.Color(opts.emissive);
      mat.emissiveIntensity = opts.emissiveIntensity ?? 0.5;
    }
    return _cache.set(key, _mark(mat)).get(key);
  }

  /** Flat (untextured) standard material. */
  function flat(hex, opts) {
    opts = opts || {};
    const key = `flat|${hex}|${opts.roughness ?? 0.85}|${opts.metalness ?? 0}|${opts.emissive || ''}|${opts.emissiveIntensity ?? ''}`;
    if (_cache.has(key)) return _cache.get(key);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hex),
      roughness: opts.roughness ?? 0.85,
      metalness: opts.metalness ?? 0,
    });
    if (opts.emissive) {
      mat.emissive = new THREE.Color(opts.emissive);
      mat.emissiveIntensity = opts.emissiveIntensity ?? 0.6;
    }
    return _cache.set(key, _mark(mat)).get(key);
  }

  /** Pure glow material (markers, highlights, window light). */
  function glow(hex, intensity) {
    const key = `glow|${hex}|${intensity ?? 1}`;
    if (_cache.has(key)) return _cache.get(key);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex) });
    if (intensity !== undefined && intensity !== 1) mat.color.multiplyScalar(intensity);
    return _cache.set(key, _mark(mat)).get(key);
  }

  /** Chessboard top: 8x8 checker in the classic board palette. */
  function boardTop() {
    const key = 'boardTop';
    if (_cache.has(key)) return _cache.get(key);
    const texSet = T().checker('#F0D9B5', '#B58863', 71, 512, 8);
    const mat = new THREE.MeshStandardMaterial({
      map: texSet.map, bumpMap: texSet.bumpMap, bumpScale: BUMP.checker,
      roughnessMap: texSet.roughnessMap, roughness: 1, metalness: 0,
    });
    return _cache.set(key, _mark(mat)).get(key);
  }

  // Frequently shared anchors (from the 2D game's palette).
  const PALETTE = {
    accent: '#ffcc00',
    bannerGold: '#e4c058',
    bannerGreen: '#68a048',
    torchFlame: '#e8642a',
    torchGlow: '#ffd670',
    boardLight: '#F0D9B5',
    boardDark: '#B58863',
    ivory: '#e6dcc0',     // player/white — CS_SILHOUETTES.player color
    charcoal: '#26262c',  // black side
  };

  return { get, flat, glow, boardTop, PALETTE, _cacheSize: () => _cache.size };
});
