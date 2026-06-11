/**
 * story3d_pieces.js — procedural mid-poly chess pieces.
 *
 * Lathe profiles for pawn/bishop/queen/king, a crenellated rook, and an
 * extruded knight head, per the visual spec. Profiles are pure point arrays
 * (exported for unit tests); geometries are built once and shared. The two
 * story-ending skins — 'dying-sun' and 'the-eternal', both king-only in the
 * 2D game — are implemented as king material/mesh variants (DECISIONS.md D8).
 *
 * Pieces are built with total height 1.0 for a king; callers scale by square
 * size. Origin at the base centre, +y up.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(null, null);
  else { root.Story3D.Pieces = factory(root.THREE, root.Story3D); }
})(typeof self !== 'undefined' ? self : this, function (THREE, NS) {
  'use strict';

  // ── Pure profiles (x = radius, y = height), king height = 1.0 ───────
  function baseProfile(r) {
    return [[0.001, 0], [r, 0], [r, 0.03], [r * 0.92, 0.06], [r * 0.7, 0.1], [r * 0.55, 0.14]];
  }
  function pawnProfile() {
    return baseProfile(0.30).concat([
      [0.2, 0.18], [0.13, 0.26], [0.11, 0.34], [0.16, 0.38], [0.11, 0.42],
      [0.16, 0.47], [0.2, 0.53], [0.17, 0.6], [0.09, 0.65], [0.001, 0.67],
    ]);
  }
  function bishopProfile() {
    return baseProfile(0.30).concat([
      [0.18, 0.2], [0.12, 0.3], [0.1, 0.42], [0.17, 0.47], [0.12, 0.52],
      [0.17, 0.6], [0.15, 0.7], [0.08, 0.79], [0.1, 0.82], [0.05, 0.86], [0.001, 0.88],
    ]);
  }
  function queenProfile() {
    return baseProfile(0.33).concat([
      [0.2, 0.2], [0.13, 0.32], [0.1, 0.48], [0.18, 0.54], [0.12, 0.6],
      [0.16, 0.72], [0.2, 0.8], [0.13, 0.84], [0.17, 0.88], [0.07, 0.93], [0.001, 0.94],
    ]);
  }
  function kingProfile() {
    return baseProfile(0.34).concat([
      [0.21, 0.2], [0.14, 0.34], [0.11, 0.5], [0.19, 0.56], [0.13, 0.62],
      [0.17, 0.76], [0.21, 0.84], [0.14, 0.88], [0.18, 0.92], [0.08, 0.97], [0.001, 0.97],
    ]);
  }
  function rookProfile() {
    return baseProfile(0.32).concat([
      [0.21, 0.2], [0.17, 0.3], [0.16, 0.52], [0.24, 0.56], [0.24, 0.72], [0.001, 0.72],
    ]);
  }
  // Simplified knight head outline (side view, facing +x), unit height ~0.88.
  function knightOutline() {
    return [
      [-0.16, 0], [-0.2, 0.06], [-0.2, 0.14], [-0.16, 0.18],
      [-0.13, 0.3], [-0.16, 0.42], [-0.14, 0.52], [-0.06, 0.6],
      [0.02, 0.66], [0.1, 0.7], [0.16, 0.7], [0.22, 0.62],
      [0.2, 0.56], [0.1, 0.52], [0.06, 0.46], [0.08, 0.4],
      [0.12, 0.38], [0.12, 0.32], [0.06, 0.3], [0.05, 0.18],
      [0.1, 0.12], [0.14, 0.06], [0.12, 0],
    ];
  }

  const PURE = { pawnProfile, bishopProfile, queenProfile, kingProfile, rookProfile, knightOutline };
  if (!THREE) return PURE;

  // ── Geometry construction (cached, shared) ───────────────────────────
  const M = () => NS.Materials;
  const _geo = new Map();
  function _lathe(key, pts, segments) {
    if (_geo.has(key)) return _geo.get(key);
    const v = pts.map(p => new THREE.Vector2(p[0], p[1]));
    const g = new THREE.LatheGeometry(v, segments || 32);
    g.computeVertexNormals();
    g.userData.story3dShared = true;
    _geo.set(key, g);
    return g;
  }
  function _shared(key, make) {
    if (!_geo.has(key)) {
      const g = make();
      g.userData.story3dShared = true;
      _geo.set(key, g);
    }
    return _geo.get(key);
  }

  function _materialFor(color, variant) {
    const P = M().PALETTE;
    if (variant === 'dying-sun') {
      // charred ember king: near-black body, heat bleeding through the cracks
      return M().get('stone', '#1c0a04', { seed: 41, bumpScale: 0.05, emissive: '#b03206', emissiveIntensity: 0.28 });
    }
    if (variant === 'the-eternal') {
      // void king: cold star-metal with a faint inner light
      return M().get('metal', '#0a0a12', { metalness: 0.7, emissive: '#3a52a8', emissiveIntensity: 0.3 });
    }
    return color === 'white'
      ? M().get('stone', P.ivory, { seed: 5, bumpScale: 0.02 })
      : M().get('stone', P.charcoal, { seed: 9, bumpScale: 0.02 });
  }

  function _addMesh(group, geoObj, mat, opts) {
    const m = new THREE.Mesh(geoObj, mat);
    m.castShadow = true; m.receiveShadow = true;
    if (opts) {
      if (opts.s) m.scale.setScalar(opts.s);
      if (opts.sv) m.scale.set(opts.sv[0], opts.sv[1], opts.sv[2]);
      if (opts.p) m.position.set(opts.p[0], opts.p[1], opts.p[2]);
      if (opts.r) m.rotation.set(opts.r[0], opts.r[1], opts.r[2]);
    }
    group.add(m);
    return m;
  }

  function _buildPawn(mat) {
    const g = new THREE.Group();
    _addMesh(g, _lathe('pc-pawn', pawnProfile()), mat);
    return g;
  }
  function _buildBishop(mat) {
    const g = new THREE.Group();
    _addMesh(g, _lathe('pc-bishop', bishopProfile()), mat);
    // mitre cut: thin contrasting slash across the head
    _addMesh(g, _shared('pc-bishop-cut', () => new THREE.BoxGeometry(0.02, 0.12, 0.18)),
      M().flat('#888078', { roughness: 0.6 }), { p: [0.04, 0.78, 0], r: [0, 0, -0.5] });
    return g;
  }
  function _buildQueen(mat) {
    const g = new THREE.Group();
    _addMesh(g, _lathe('pc-queen', queenProfile()), mat);
    // coronet spikes
    const spike = _shared('pc-spike', () => new THREE.ConeGeometry(0.025, 0.07, 6));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      _addMesh(g, spike, mat, { p: [Math.cos(a) * 0.15, 0.9, Math.sin(a) * 0.15] });
    }
    _addMesh(g, _shared('pc-orb', () => new THREE.SphereGeometry(0.045, 10, 8)), mat, { p: [0, 0.97, 0] });
    return g;
  }
  function _buildKing(mat, variant) {
    const g = new THREE.Group();
    _addMesh(g, _lathe('pc-king', kingProfile()), mat);
    // crown band + cross
    const band = _shared('pc-king-band', () => new THREE.TorusGeometry(0.16, 0.022, 8, 20));
    _addMesh(g, band, mat, { p: [0, 0.9, 0], r: [Math.PI / 2, 0, 0] });
    _addMesh(g, _shared('pc-cross-v', () => new THREE.BoxGeometry(0.035, 0.16, 0.035)), mat, { p: [0, 1.05, 0] });
    _addMesh(g, _shared('pc-cross-h', () => new THREE.BoxGeometry(0.11, 0.035, 0.035)), mat, { p: [0, 1.07, 0] });
    if (variant === 'dying-sun') {
      // ember sun-disc halo behind the crown
      const disc = _addMesh(g, _shared('pc-sundisc', () => new THREE.TorusGeometry(0.2, 0.009, 8, 28)),
        M().glow('#ff6a20', 0.65), { p: [0, 1.02, 0] });
      disc.castShadow = false;
      g.userData.animators = [(t) => { disc.rotation.y = t * 0.8; disc.rotation.x = 0.3 * Math.sin(t * 0.7); }];
    }
    if (variant === 'the-eternal') {
      // slow-orbiting cold stars around the crown
      const starGeo = _shared('pc-star', () => new THREE.SphereGeometry(0.018, 6, 5));
      const stars = [];
      for (let i = 0; i < 5; i++) {
        const s = _addMesh(g, starGeo, M().glow('#bcd0ff', 1), { p: [0, 0.95, 0] });
        s.castShadow = false;
        stars.push(s);
      }
      g.userData.animators = [(t) => {
        stars.forEach((s, i) => {
          const a = t * 0.9 + (i / stars.length) * Math.PI * 2;
          s.position.set(Math.cos(a) * 0.22, 0.95 + 0.06 * Math.sin(a * 1.7 + i), Math.sin(a) * 0.22);
        });
      }];
    }
    return g;
  }
  function _buildRook(mat) {
    const g = new THREE.Group();
    _addMesh(g, _lathe('pc-rook', rookProfile()), mat);
    // crenellations: 5 teeth on the rim
    const tooth = _shared('pc-tooth', () => new THREE.BoxGeometry(0.09, 0.1, 0.09));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      _addMesh(g, tooth, mat, { p: [Math.cos(a) * 0.185, 0.77, Math.sin(a) * 0.185], r: [0, -a, 0] });
    }
    return g;
  }
  function _buildKnight(mat) {
    const g = new THREE.Group();
    const head = _shared('pc-knight-head', () => {
      const shape = new THREE.Shape();
      const pts = knightOutline();
      shape.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
      shape.closePath();
      const eg = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
      eg.translate(0, 0, -0.08);
      return eg;
    });
    _addMesh(g, _lathe('pc-knight-base', baseProfile(0.31).concat([[0.17, 0.2], [0.15, 0.24], [0.001, 0.24]])), mat);
    _addMesh(g, head, mat, { p: [0, 0.2, 0] });
    // mane ridge + ears
    _addMesh(g, _shared('pc-knight-ear', () => new THREE.ConeGeometry(0.035, 0.09, 6)), mat, { p: [-0.02, 0.88, 0.05], r: [0.15, 0, -0.2] });
    _addMesh(g, _shared('pc-knight-ear2', () => new THREE.ConeGeometry(0.035, 0.09, 6)), mat, { p: [-0.02, 0.88, -0.05], r: [-0.15, 0, -0.2] });
    return g;
  }

  /**
   * Build a piece. type ∈ pawn|knight|bishop|rook|queen|king,
   * color ∈ white|black, opts: { variant (king only), facing (radians) }.
   * Returns a Group: height 1.0 = king; userData { pieceType, color }.
   */
  function build(type, color, opts) {
    opts = opts || {};
    const variant = type === 'king' ? opts.variant || null : null;
    const mat = _materialFor(color, variant);
    let g;
    switch (type) {
      case 'pawn': g = _buildPawn(mat); break;
      case 'bishop': g = _buildBishop(mat); break;
      case 'queen': g = _buildQueen(mat); break;
      case 'king': g = _buildKing(mat, variant); break;
      case 'rook': g = _buildRook(mat); break;
      case 'knight': g = _buildKnight(mat); break;
      default: g = _buildPawn(mat);
    }
    if (type === 'knight') g.rotation.y = opts.facing ?? (color === 'white' ? -Math.PI / 2 : Math.PI / 2);
    // Piece armor (blanket cosmetic per piece kind): metal bands in the
    // set's accent colour — a base ring plus a collar sized per profile.
    if (opts.armor && opts.armor.colors && opts.armor.colors.trim) {
      const am = M().get('metal', opts.armor.colors.trim, { metalness: 0.78 });
      const COLLAR = {
        pawn: [0.13, 0.4], knight: [0.18, 0.22], bishop: [0.12, 0.5],
        rook: [0.18, 0.54], queen: [0.13, 0.58], king: [0.14, 0.6],
      }[type] || [0.13, 0.4];
      const band = _addMesh(g, _shared('pc-armor-band', () => new THREE.TorusGeometry(0.27, 0.02, 6, 24)), am, { p: [0, 0.075, 0], r: [Math.PI / 2, 0, 0] });
      band.castShadow = false;
      const collar = _addMesh(g, _shared(`pc-armor-collar|${COLLAR[0]}`, () => new THREE.TorusGeometry(COLLAR[0], 0.016, 6, 20)), am, { p: [0, COLLAR[1], 0], r: [Math.PI / 2, 0, 0] });
      collar.castShadow = false;
    }
    g.userData.pieceType = type;
    g.userData.color = color;
    return g;
  }

  return Object.assign({}, PURE, { build });
});
