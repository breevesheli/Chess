/**
 * story3d_figures.js — stylized 3D character figures (gear + faction pass).
 *
 * Cast comes from the 2D CS_SILHOUETTES table (chess_ui.html L20253–20274);
 * Story3D.Content layers faction palettes (Aurveld gold/green, Valdris blue,
 * Ashfield rust, the Pale Court bone) and per-character accents on top so
 * every named character reads uniquely. Figures are articulated (joint-pivot
 * walk/idle animation) and can wear player gear: helm/hood (head), plate/
 * jerkin/robe (body), cape — driven by the armor catalog's style + colors.
 * The player wears no crown until he is actually king (DECISIONS.md D13).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(null, null);
  else { root.Story3D.Figures = factory(root.THREE, root.Story3D); }
})(typeof self !== 'undefined' ? self : this, function (THREE, NS) {
  'use strict';
  if (!THREE) return {};

  const M = () => NS.Materials;
  const P = () => NS.Props;
  const C = () => NS.Content;
  const _wp = THREE ? new THREE.Vector3() : null; // scratch for look-at math

  // Hub-only roles the 2D table doesn't know.
  const EXTRA_DEFS = {
    guard:      { kind: 'rook',   color: '#4a5058', scale: 1.0 },
    merchant:   { kind: 'human',  color: '#6a4a28', scale: 1.0 },
    npc:        { kind: 'human',  color: '#3a3a3a', scale: 1.0 },
    noblewoman: { kind: 'queen',  color: '#5a4a5e', scale: 1.0 },  // court ladies (Lady Mourne)
    nobleman:   { kind: 'bishop', color: '#4a4452', scale: 1.0 },  // court lords (Lord Caeven)
    councilor:  { kind: 'bishop', color: '#3e4630', scale: 1.0 },  // the Council of Three
    // The childhood prologue cast
    father:        { kind: 'king',  color: '#4a4640', scale: 1.12 }, // the Iron King
    teacher:       { kind: 'bishop', color: '#5a4a36', scale: 1.0 }, // Master Edwin, tutor to both boys
    young_player:  { kind: 'human', color: '#cfc6ac', scale: 0.62 },
    young_saoirse: { kind: 'human', color: '#b07a44', scale: 0.62 },
  };
  // Character-specific extras keyed by figure id (accents come from Content).
  const ID_FLAIR = {
    aldric:  { glowEyes: '#7ac8ff', scar: 'right' },          // the Undying — old wound under dead eyes
    saoirse: { hood: true, hairColor: '#83441c', freckles: true },
    player:  { cape: '#6a1c1c', hair: 'short', hairColor: '#2c2014' },
    seraphine: { hair: 'long', hairColor: '#161210', mole: true },
    teacher: { beard: true, beardColor: '#b0a890', aged: true }, // Master Edwin, grey-bearded
    father:  { beard: true, hairColor: '#3a342c', scar: 'left', aged: true }, // the Iron King fought his wars
    cavan:   { brokenNose: true },                             // the duelist brother
    drave:   { scar: 'mouth' },
    guard:   { kettle: true },                                 // ambient soldiers wear the simple kettle-helm
    councilor: { courtHair: true },                            // court officials wear hair, not a monk's hood
    nobleman:  { courtHair: true },
    young_player:  { hair: 'short', hairColor: '#2c2014' },
    young_saoirse: { hair: 'long',  hairColor: '#83441c', freckles: true },
  };

  function defFor(id) {
    const table = (typeof CS_SILHOUETTES !== 'undefined') ? CS_SILHOUETTES
      : (typeof window !== 'undefined' && window.CS_SILHOUETTES) || {};
    return table[id] || EXTRA_DEFS[id] || EXTRA_DEFS.npc;
  }

  function _shade(hex, k) {
    const c = new THREE.Color(hex);
    if (k > 0) c.lerp(new THREE.Color('#fff6e0'), k);
    else c.lerp(new THREE.Color('#0a0806'), -k);
    return '#' + c.getHexString();
  }

  /**
   * Build a figure from { kind, color, scale }.
   * opts: { scale, flair {glowEyes,hood,cape,trim,plume,sash}, faction (id),
   *         gear {head,body,cape: catalog items}, crowned }
   */
  function build(def, opts) {
    opts = opts || {};
    const kind = def.kind || 'human';
    const color = def.color || '#3a3a3a';
    const scale = (def.scale || 1) * (opts.scale || 1);
    const flair = Object.assign({}, opts.flair);
    const faction = opts.faction && C() ? C().FACTIONS[opts.faction] : null;
    const gearSet = opts.gear || {};
    const armored = kind === 'rook' || kind === 'knight';
    const robed = !armored;

    const g = new THREE.Group();
    // Deterministic per-character looks: named cast pins skin/hair via flair,
    // everyone else hashes their id so crowds vary but stay stable.
    const idHash = String(opts.id || color).split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const SKIN_TONES = ['#e8c49a', '#dcb088', '#cb9a6f', '#b08054', '#8f6240', '#6e4a30'];
    const skinHex = flair.skin || SKIN_TONES[idHash % SKIN_TONES.length];
    const cloth = M().get('fabric', color, { seed: 47 });
    const clothDark = M().get('fabric', _shade(color, -0.35), { seed: 49 });
    const trim = M().get('fabric', flair.trim || (faction ? faction.trim : _shade(color, 0.35)), { seed: 51 });
    const steel = M().get('metal', '#5a5f68', { metalness: 0.45 });
    const steelDark = M().get('metal', '#3c4048', { metalness: 0.4 });
    const gold = M().get('metal', '#c8a040', { metalness: 0.7 });
    const skin = M().flat(skinHex, { roughness: 0.65 });
    const leather = M().get('fabric', '#4a3522', { seed: 53 });
    const tabardMat = faction ? M().get('fabric', faction.main, { seed: 55 }) : cloth;

    const BOX = P().BOX(), CYL = P().CYL(), TCYL = P().TCYL(), SPHERE = P().SPHERE(), CONE = P().CONE();
    const CONE4 = P().geo('helm-pyramid', () => new THREE.ConeGeometry(0.5, 1, 4)); // 4-sided sugarloaf spire
    const add = (parent, geoObj, mat, sx, sy, sz, x, y, z, noShadow) => {
      const m = new THREE.Mesh(geoObj, mat);
      m.scale.set(sx, sy, sz);
      m.position.set(x, y, z);
      if (!noShadow) { m.castShadow = true; m.receiveShadow = true; }
      parent.add(m);
      return m;
    };

    // ── Legs (hip pivots so they can swing) ─────────────────────────────
    const hipY = 0.92;
    const legL = new THREE.Group(); legL.position.set(-0.11, hipY, 0);
    const legR = new THREE.Group(); legR.position.set(0.11, hipY, 0);
    const legMat = armored ? steelDark : clothDark;
    [legL, legR].forEach(leg => {
      add(leg, TCYL, legMat, 0.16, 0.78, 0.16, 0, -0.39, 0);
      add(leg, BOX, leather, 0.14, 0.085, 0.21, 0, -0.85, 0.03);           // boot
      if (armored) add(leg, BOX, steel, 0.155, 0.15, 0.16, 0, -0.62, 0.02); // greave
      g.add(leg);
    });

    // ── Robe / tunic over the legs ──────────────────────────────────────
    let robeSway = null;
    if (robed) {
      const robeGeo = P().geo('fig-robe', () => {
        const pts = [
          [0.001, 0], [0.34, 0], [0.36, 0.04], [0.30, 0.25], [0.25, 0.5],
          [0.22, 0.7], [0.2, 0.9], [0.22, 1.0], [0.001, 1.0],
        ].map(p => new THREE.Vector2(p[0], p[1]));
        return new THREE.LatheGeometry(pts, 16);
      });
      const robeMat = gearSet.body && gearSet.body.style === 'robe'
        ? M().get('fabric', gearSet.body.colors.main, { seed: 121 }) : cloth;
      // pivot at the waist so a walk sways the hem, not the collar
      robeSway = new THREE.Group();
      robeSway.position.y = 0.9;
      g.add(robeSway);
      add(robeSway, robeGeo, robeMat, 1, 1.05, 1, 0, -0.9, 0);
      const hem = add(robeSway, P().geo('fig-hem', () => new THREE.TorusGeometry(0.345, 0.025, 6, 18)),
        gearSet.body && gearSet.body.style === 'robe' ? M().get('fabric', gearSet.body.colors.trim, { seed: 123 }) : trim,
        1, 1, 1, 0, -0.85, 0, true);
      hem.rotation.x = Math.PI / 2;
    } else {
      add(g, P().geo('fig-tabard', () => {
        const pts = [[0.001, 0], [0.3, 0], [0.26, 0.3], [0.22, 0.45], [0.001, 0.45]].map(p => new THREE.Vector2(p[0], p[1]));
        return new THREE.LatheGeometry(pts, 12);
      }), tabardMat, 1, 1, 1, 0, 0.58, 0);
    }

    // ── Torso pivot ─────────────────────────────────────────────────────
    const torso = new THREE.Group();
    torso.position.y = hipY + 0.06;
    g.add(torso);
    // Body gear overrides the chest read
    const bodyGear = gearSet.body || null;
    let chestMat = armored ? steel : cloth;
    if (bodyGear) {
      if (bodyGear.style === 'plate') chestMat = M().get('metal', bodyGear.colors.main, { metalness: 0.5 });
      else if (bodyGear.style === 'jerkin') chestMat = M().get('fabric', bodyGear.colors.main, { seed: 125 });
      else if (bodyGear.style === 'robe') chestMat = M().get('fabric', bodyGear.colors.main, { seed: 121 });
    }
    // Tapered, faceted trunk — broad at the shoulders, narrow at the waist
    // (7-sided cylinders flattened front-to-back read as a tailored chest
    // instead of a ball).
    const TRUNK = P().geo('fig-trunk', () => new THREE.CylinderGeometry(0.5, 0.33, 1, 7));
    const chest = add(torso, TRUNK, chestMat, 0.56, 0.52, 0.4, 0, 0.27, 0);
    chest.rotation.y = Math.PI / 7; // flat facet faces forward
    const waist = add(torso, P().geo('fig-waist', () => new THREE.CylinderGeometry(0.34, 0.4, 1, 7)), chestMat, 0.52, 0.14, 0.4, 0, -0.04, 0);
    waist.rotation.y = Math.PI / 7;
    // belt — a thin band hugging the waist (a flat cylinder wall, flattened
    // front-to-back to follow the body). Snug, no hula-hoop, no clipping.
    const beltR = robed ? 0.235 : 0.205;
    add(torso, P().geo(`fig-belt2|${beltR}`, () => new THREE.CylinderGeometry(beltR, beltR, 0.1, 18, 1, true)), leather, 1, 1, 0.74, 0, 0.0, 0);
    add(torso, BOX, kind === 'king' || kind === 'queen' ? gold : steelDark, 0.085, 0.075, 0.04, 0, 0.0, beltR * 0.74 + 0.015, true); // buckle
    if (bodyGear && (bodyGear.style === 'plate' || bodyGear.style === 'jerkin')) {
      // gear tabard + trim line in the set's colours
      add(torso, BOX, M().get('fabric', bodyGear.colors.tabard || bodyGear.colors.main, { seed: 127 }), 0.3, 0.5, 0.02, 0, 0.18, 0.19, true);
      add(torso, BOX, M().get('fabric', bodyGear.colors.trim, { seed: 129 }), 0.3, 0.06, 0.022, 0, 0.42, 0.19, true);
      add(torso, BOX, M().get('metal', bodyGear.colors.trim, { metalness: 0.7 }), 0.48, 0.05, 0.34, 0, 0.5, 0, true); // collar plate
    } else if (armored) {
      // faction tabard front — allegiance at a glance
      add(torso, BOX, tabardMat, 0.3, 0.5, 0.02, 0, 0.18, 0.19, true);
      add(torso, BOX, trim, 0.3, 0.06, 0.022, 0, 0.42, 0.19, true);
    }
    if (flair.sash) {
      // diagonal sash across the chest — quick character read
      const sash = add(torso, BOX, M().get('fabric', flair.sash, { seed: 131 }), 0.1, 0.62, 0.03, 0, 0.22, 0.185, true);
      sash.rotation.z = 0.65;
    }
    if (kind === 'king' || kind === 'crackedKing') {
      add(torso, P().geo('fig-collar', () => new THREE.TorusGeometry(0.24, 0.06, 8, 16)), M().get('fabric', kind === 'king' ? '#e8e0d0' : '#9a9288', { seed: 61 }), 1, 1, 1, 0, 0.5, 0).rotation.x = Math.PI / 2 - 0.18;
    }
    if (kind === 'queen') {
      add(torso, P().geo('fig-necklace', () => new THREE.TorusGeometry(0.16, 0.018, 6, 14)), gold, 1, 1, 1, 0, 0.46, 0.06, true).rotation.x = Math.PI / 2 - 0.5;
    }

    // ── Arms (shoulder pivots) ──────────────────────────────────────────
    // Angled pauldron caps instead of ball shoulders; slimmer two-segment
    // arms with a visible elbow break.
    const PAULDRON = P().geo('fig-pauldron', () => new THREE.CylinderGeometry(0.22, 0.5, 1, 7));
    const mkArm = (side) => {
      const sh = new THREE.Group();
      sh.position.set(side * 0.28, 0.46, 0);
      torso.add(sh);
      const armMat = armored ? steelDark : cloth;
      const cap = add(sh, PAULDRON, bodyGear && bodyGear.style === 'plate' ? chestMat : (armored ? steel : cloth), 0.25, 0.12, 0.22, side * 0.01, 0.055, 0);
      cap.rotation.z = side * 0.22; // sloped off the shoulder line, snug
      add(sh, TCYL, armMat, 0.095, 0.34, 0.095, side * 0.02, -0.16, 0);
      const elbow = new THREE.Group();
      elbow.position.set(side * 0.03, -0.35, 0);
      sh.add(elbow);
      add(elbow, SPHERE, armMat, 0.1, 0.09, 0.1, 0, 0.0, 0.01);          // elbow joint
      add(elbow, TCYL, armMat, 0.08, 0.3, 0.08, 0, -0.15, 0.02);
      // hand: palm, three relaxed fingers, opposed thumb
      const hand = new THREE.Group();
      hand.position.set(0, -0.31, 0.04);
      elbow.add(hand);
      add(hand, BOX, skin, 0.066, 0.07, 0.034, 0, 0, 0.004);             // palm
      [-1, 0, 1].forEach(fx => {
        const f = add(hand, BOX, skin, 0.017, 0.052, 0.02, fx * 0.021, -0.052, 0.006);
        f.rotation.x = 0.22;                                             // relaxed curl
      });
      const thumb = add(hand, BOX, skin, 0.016, 0.038, 0.018, side * 0.038, -0.012, 0.012);
      thumb.rotation.z = side * 0.55;
      return { sh, elbow, hand };
    };
    const armL = mkArm(-1);
    const armR = mkArm(1);

    // ── Head ────────────────────────────────────────────────────────────
    // One solid block — no separate skull/jaw pieces. Features sit on the
    // front face. Fully-helmed figures skip it (the helmet IS the head).
    const headG = new THREE.Group();
    headG.position.y = 0.64;
    torso.add(headG);
    add(headG, CYL, skin, 0.085, 0.14, 0.085, 0, 0.0, 0);                // neck
    const fullHelm = kind === 'knight' || kind === 'rook' || (gearSet.head && gearSet.head.style === 'helm');
    if (!fullHelm) add(headG, BOX, skin, 0.24, 0.3, 0.26, 0, 0.165, 0);
    if (flair.glowEyes) {
      [-1, 1].forEach(sx => add(headG, SPHERE,
        M().flat(flair.glowEyes, { roughness: 0.2, emissive: flair.glowEyes, emissiveIntensity: 2.2 }),
        0.035, 0.028, 0.02, sx * 0.06, 0.2, 0.133, true));
    }

    // ── Face ────────────────────────────────────────────────────────────
    const HAIR_COLORS = ['#2c2014', '#1c1410', '#4a3018', '#6a4a22', '#3a3430', '#8a8478'];
    const hairColor = flair.hairColor || HAIR_COLORS[idHash % HAIR_COLORS.length];
    const hairStyle = flair.hair || ['short', 'long', 'ponytail', 'wavy', 'bun', 'short', 'bald'][idHash % 7];
    const hairMat = M().get('fabric', hairColor, { seed: 141 });
    const eyeGroups = [];
    if (!fullHelm) {
      [-1, 1].forEach(sx => add(headG, SPHERE, skin, 0.045, 0.06, 0.03, sx * 0.13, 0.165, 0)); // ears
      const nose = add(headG, BOX, skin, 0.034, 0.07, 0.044, 0, 0.16, 0.135);                  // nose
      if (flair.brokenNose) { nose.rotation.z = 0.18; nose.position.x = 0.008; }
      add(headG, BOX, M().flat('#43251d', { roughness: 0.9 }), 0.064, 0.011, 0.013, 0, 0.09, 0.133, true); // mouth
      add(headG, BOX, M().flat(_shade(skinHex, -0.18), { roughness: 0.8 }), 0.055, 0.013, 0.012, 0, 0.075, 0.132, true); // lower lip
      // Distinct features — the cast pins these via flair so key faces are
      // recognisable at a glance (an old wound, a duelist's nose, a mark).
      if (flair.scar) {
        const scarMat = M().flat(_shade(skinHex, -0.32), { roughness: 1 });
        if (flair.scar === 'mouth') {
          const s = add(headG, BOX, scarMat, 0.014, 0.09, 0.012, 0.038, 0.085, 0.134, true);
          s.rotation.z = 0.18; // crosses the lips
        } else {
          const sx = flair.scar === 'left' ? -1 : 1;
          // two offset segments read as one old wound crossing the eye
          const s1 = add(headG, BOX, scarMat, 0.016, 0.1, 0.012, sx * 0.078, 0.245, 0.134, true);
          s1.rotation.z = sx * 0.3;
          const s2 = add(headG, BOX, scarMat, 0.014, 0.07, 0.012, sx * 0.05, 0.14, 0.134, true);
          s2.rotation.z = sx * 0.28;
        }
      }
      if (flair.mole) add(headG, BOX, M().flat('#4a2e20', { roughness: 1 }), 0.015, 0.015, 0.01, 0.085, 0.12, 0.132, true);
      if (flair.freckles) {
        const fr = M().flat(_shade(skinHex, -0.16), { roughness: 1 });
        [[-0.05, 0.15], [0.05, 0.15], [-0.078, 0.165], [0.078, 0.165], [-0.028, 0.132], [0.028, 0.132]]
          .forEach(([fx, fy]) => add(headG, BOX, fr, 0.011, 0.011, 0.01, fx, fy, 0.132, true));
      }
      if (flair.aged) {
        const lineMat = M().flat(_shade(skinHex, -0.2), { roughness: 1 });
        [-1, 1].forEach(sx => add(headG, BOX, lineMat, 0.05, 0.01, 0.011, sx * 0.062, 0.168, 0.131, true)); // under-eye
        add(headG, BOX, lineMat, 0.12, 0.01, 0.011, 0, 0.292, 0.131, true);                                 // brow crease
      }
      if (!flair.glowEyes) {
        [-1, 1].forEach(sx => {
          const eye = new THREE.Group();
          eye.position.set(sx * 0.062, 0.21, 0.131);
          headG.add(eye);
          add(eye, SPHERE, M().flat('#e8e2d4', { roughness: 0.35 }), 0.056, 0.04, 0.026, 0, 0, 0, true);
          add(eye, SPHERE, M().flat(flair.eyeColor || '#2e2418', { roughness: 0.25 }), 0.026, 0.026, 0.014, 0, 0, 0.019, true);
          eyeGroups.push(eye);
          const brow = add(headG, BOX, hairMat, 0.065, 0.016, 0.02, sx * 0.062, 0.262, 0.133, true);
          brow.rotation.z = sx * -0.12;
        });
      }
      if (flair.beard) {
        const beardMat = M().get('fabric', flair.beardColor || hairColor, { seed: 143 });
        add(headG, BOX, beardMat, 0.16, 0.12, 0.06, 0, 0.035, 0.105);
        add(headG, BOX, beardMat, 0.085, 0.022, 0.02, 0, 0.115, 0.137, true); // moustache
      }
    }
    /** BOXES ONLY — a thin hair shell hugging the squarish head (top, sides,
     *  back, fringe) so no scalp shows. No spheres/cylinders/cones anywhere.
     *  Head block ≈ 0.24w × 0.30h × 0.26d, top ≈ 0.315. */
    const addHair = (style) => {
      if (style === 'bald') {
        add(headG, BOX, hairMat, 0.25, 0.04, 0.27, 0, 0.31, -0.01, true);  // thin stubble
        return;
      }
      add(headG, BOX, hairMat, 0.27, 0.09, 0.30, 0, 0.315, -0.005);        // top cap
      add(headG, BOX, hairMat, 0.27, 0.28, 0.05, 0, 0.18, -0.15);          // back of the head
      [-1, 1].forEach(sx => add(headG, BOX, hairMat, 0.045, 0.28, 0.29, sx * 0.135, 0.18, -0.005)); // sides over the ears
      add(headG, BOX, hairMat, 0.26, 0.07, 0.04, 0, 0.29, 0.135);          // fringe at the hairline
      if (style === 'long' || style === 'wavy') {
        add(headG, BOX, hairMat, 0.29, 0.36, 0.06, 0, 0.0, -0.155);        // length down the back
        [-1, 1].forEach(sx => add(headG, BOX, hairMat, 0.05, 0.34, 0.17, sx * 0.14, 0.02, -0.02)); // framing the jaw
      } else if (style === 'bun') {
        add(headG, BOX, hairMat, 0.14, 0.14, 0.14, 0, 0.4, -0.13);         // box bun
      } else if (style === 'ponytail') {
        const tail = add(headG, BOX, hairMat, 0.1, 0.42, 0.1, 0, 0.12, -0.22); // box tail
        tail.rotation.x = 0.3;
      } else if (style === 'topknot') {
        add(headG, BOX, hairMat, 0.085, 0.15, 0.085, 0, 0.42, -0.02);      // box topknot
      }
    };

    // ── Headgear: gear first, then kind defaults ────────────────────────
    const headGear = gearSet.head || null;
    // A real draped hood: a rounded crown rising to a soft peak, fabric
    // framing a face opening, and a shadowed interior. (Bishops add a shoulder
    // mantle in their branch.) opts.mantle adds the shoulder drape inline.
    const addHood = (mat, opts2) => {
      opts2 = opts2 || {};
      const darkIn = M().flat('#0b0907', { roughness: 1 });
      // rounded fabric crown hugging the head, face open at the front
      add(headG, SPHERE, mat, 0.31, 0.32, 0.30, 0, 0.20, -0.03);            // crown (back/top)
      [-1, 1].forEach(sx => add(headG, SPHERE, mat, 0.10, 0.28, 0.23, sx * 0.155, 0.14, 0.04)); // sides framing the face
      add(headG, SPHERE, mat, 0.26, 0.10, 0.15, 0, 0.30, 0.085);            // brim over the forehead
      add(headG, SPHERE, darkIn, 0.18, 0.23, 0.11, 0, 0.15, -0.01, true);   // shadowed interior
      // the hood narrows out of the crown into a short drooping cone (one flow):
      // wide where it meets the crown back, tapering to a point, half-length.
      const tail = new THREE.Mesh(_taperedTube('hood-cone1',
        [[0, 0.33, -0.10], [0, 0.31, -0.21], [0.01, 0.21, -0.27], [0.01, 0.07, -0.28], [0, -0.06, -0.26]],
        [0.18, 0.15, 0.10, 0.05, 0.012]), mat);
      tail.castShadow = true; tail.receiveShadow = true;
      headG.add(tail);
      if (opts2.mantle) addMantle(mat);
    };
    // A shoulder mantle that flares from the neck over the shoulders/upper chest.
    const addMantle = (mat) => {
      const geo = P().geo('hood-mantle2', () => {
        const pts = [[0.12, 0.44], [0.27, 0.27], [0.36, 0.1], [0.37, 0.04], [0.33, 0.0]].map(p => new THREE.Vector2(p[0], p[1]));
        return new THREE.LatheGeometry(pts, 18);
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(0, 0.46, 0);
      m.castShadow = true; m.receiveShadow = true;
      torso.add(m);
    };
    const addCrown = (crownMat, points, broken) => {
      // square band (matches the boxy head/hair) sitting just outside it at the
      // hairline, so it rings the hair instead of clipping the square corners
      const by = 0.31, R = 0.17;
      add(headG, BOX, crownMat, 2 * R + 0.03, 0.06, 0.045, 0, by, R, true);   // front bar
      add(headG, BOX, crownMat, 2 * R + 0.03, 0.06, 0.045, 0, by, -R, true);  // back bar
      add(headG, BOX, crownMat, 0.045, 0.06, 2 * R + 0.03, R, by, 0, true);   // right bar
      add(headG, BOX, crownMat, 0.045, 0.06, 2 * R + 0.03, -R, by, 0, true);  // left bar
      for (let i = 0; i < points; i++) {
        const a = (i / points) * Math.PI * 2, cx = Math.cos(a), cz = Math.sin(a);
        const m = Math.max(Math.abs(cx), Math.abs(cz));               // project onto the square
        const sp = add(headG, CONE, crownMat, 0.05, 0.12, 0.05, (cx / m) * R, by + 0.09, (cz / m) * R);
        if (broken && i === 1) { sp.rotation.z = 1.1; sp.position.y = by + 0.05; }
      }
    };
    if (headGear) {
      if (headGear.style === 'helm') {
        const hm = M().get('metal', headGear.colors.main, { metalness: 0.55 });
        add(headG, SPHERE, hm, 0.29, 0.31, 0.29, 0, 0.18, 0);
        add(headG, BOX, M().flat('#0c0c10', { roughness: 0.6 }), 0.26, 0.045, 0.06, 0, 0.18, 0.24, true);
        add(headG, BOX, M().get('metal', headGear.colors.trim, { metalness: 0.7 }), 0.06, 0.2, 0.34, 0, 0.4, -0.02); // crest
      } else { // hood
        addHood(M().get('fabric', headGear.colors.main, { seed: 133 }));
        const hb = add(headG, P().geo('fig-hoodband3', () => new THREE.TorusGeometry(0.17, 0.018, 6, 14)), M().get('fabric', headGear.colors.trim, { seed: 135 }), 1, 1, 1, 0, -0.04, 0.02, true);
        hb.rotation.x = Math.PI / 2 - 0.25;
      }
    } else if (kind === 'king' || kind === 'crackedKing') {
      // The player only earns the crown once the court accepts him (D13);
      // every other royal figure wears theirs from the start.
      if (opts.crowned !== false) {
        const crownMat = kind === 'king' ? gold : M().get('metal', '#6a6258', { metalness: 0.5 });
        addCrown(crownMat, kind === 'crackedKing' ? 4 : 5, kind === 'crackedKing');
        if (kind === 'king') add(headG, SPHERE, M().flat('#a02030', { roughness: 0.25, emissive: '#601018', emissiveIntensity: 0.4 }), 0.035, 0.035, 0.035, 0, 0.335, 0.165, true);
        addHair('short'); // hair under the band
      } else {
        // uncrowned prince: bare hair, no regalia
        addHair(hairStyle);
      }
    } else if (kind === 'queen') {
      addHair('long');
      // square coronet ring around the box hair
      const R = 0.17;
      add(headG, BOX, gold, 2 * R + 0.02, 0.045, 0.035, 0, 0.31, R, true);
      add(headG, BOX, gold, 2 * R + 0.02, 0.045, 0.035, 0, 0.31, -R, true);
      add(headG, BOX, gold, 0.035, 0.045, 2 * R + 0.02, R, 0.31, 0, true);
      add(headG, BOX, gold, 0.035, 0.045, 2 * R + 0.02, -R, 0.31, 0, true);
      add(headG, BOX, gold, 0.05, 0.06, 0.05, 0, 0.37, R, true); // front jewel mount
    } else if (kind === 'knight') {
      // A real great helm / bascinet (see _buildHelm). Faction picks the crest:
      //   • plume  — sugarloaf helm, cross face slit, full horsehair mane
      //   • visor  — open-faced helm with the visor plate lifted, a crest comb
      //   • mix    — lifted visor AND a mane
      const plumeC = flair.plume || '#8a2c2c';
      const fId = typeof opts.faction === 'string' ? opts.faction : null;
      const helmStyle = flair.helm ||
        (fId === 'valdris' ? 'visor' : fId === 'pale' ? 'visor' : fId === 'ashfield' ? 'mix' : 'plume');
      const hasVisor = helmStyle === 'visor' || helmStyle === 'mix';
      const hasMane = helmStyle === 'plume' || helmStyle === 'mix';
      // a scaled sub-group keeps the helm proportional to the head
      const helmG = new THREE.Group(); helmG.scale.setScalar(0.78); helmG.position.y = 0.05; headG.add(helmG);
      const hAdd = (g, m, sx, sy, sz, x, y, z, ns) => add(helmG, g, m, sx, sy, sz, x, y, z, ns);
      // light bumpScale → just a whisper of brushed texture, not a dented mess
      const hSteel = M().get('metal', '#474d56', { bumpScale: 0.006 }), hDark = M().flat('#09090b', { roughness: 0.92 });
      _buildHelm(hAdd, { BOX, CYL, CONE4, SPHERE }, { steel: hSteel, dark: hDark, brass: M().get('metal', '#b0892e', { bumpScale: 0.006 }) },
        { top: 'point', cross: !hasVisor, open: hasVisor });
      if (hasVisor) {
        // hinged visor plate lifted up off the open face
        const visor = add(helmG, BOX, M().get('metal', '#3a3f47', { bumpScale: 0.006 }), 0.34, 0.2, 0.07, 0, 0.44, 0.13);
        visor.rotation.x = -0.95;
        [-0.08, 0.08].forEach(x => add(helmG, BOX, hDark, 0.02, 0.06, 0.02, x, 0.49, 0.17, true)); // breaths in the plate
        add(helmG, BOX, hSteel, 0.05, 0.04, 0.18, 0, 0.36, 0.06, true);     // pivot bar
      }
      if (hasMane) {
        const pmat = M().get('fabric', plumeC, { seed: 63 });
        add(helmG, SPHERE, M().get('metal', '#caa84c', { metalness: 0.5, bumpScale: 0.006 }), 0.06, 0.06, 0.06, 0, 0.54, 0, true); // socket
        for (let i = 0; i < 6; i++) {
          const seg = add(helmG, BOX, pmat, 0.09, 0.18 - i * 0.013, 0.12, 0, 0.52 - i * 0.055, -0.06 - i * 0.1);
          seg.rotation.x = 0.5 + i * 0.1;
        }
      } else {
        const crest = add(helmG, BOX, M().get('fabric', plumeC, { seed: 63 }), 0.04, 0.2, 0.42, 0, 0.56, -0.02);
        crest.rotation.x = 0.05;
      }
    } else if (kind === 'rook') {
      const helmG = new THREE.Group(); helmG.scale.setScalar(0.78); helmG.position.y = 0.05; headG.add(helmG);
      const hAdd = (g, m, sx, sy, sz, x, y, z, ns) => add(helmG, g, m, sx, sy, sz, x, y, z, ns);
      const hDark = M().flat('#09090b', { roughness: 0.92 });
      if (flair.kettle) {
        // ambient guard: a plain sergeant's great helm (eye slits + breaths)
        _buildHelm(hAdd, { BOX, CYL, CONE4, SPHERE }, { steel: M().get('metal', '#4d535b', { bumpScale: 0.006 }), dark: hDark },
          { holes: true });
      } else {
        // the rook proper: a great helm crowned with a crenellated battlement —
        // the chess castle, built from the reference (breath-hole face + crown)
        _buildHelm(hAdd, { BOX, CYL, CONE4, SPHERE }, { steel: M().get('metal', '#474d56', { bumpScale: 0.006 }), dark: hDark },
          { holes: true, crown: true });
      }
    } else if ((kind === 'bishop' || flair.hood) && !flair.courtHair) {
      // A conical hood that flows into a drooping tail — no mitre. The pectoral
      // cross (added with the crozier) carries the religious read.
      addHood(clothDark);
    } else {
      // court officials (councilor, lords) and everyone else wear hair
      addHair(hairStyle);
    }
    let heldStaff = false;
    if (kind === 'bishop') {
      // Grip pose: upper arm forward, forearm raised, hand closed around the
      // shaft — the staff plants ahead of the figure instead of floating
      // along the arm. The animator leaves this arm alone (heldStaff).
      heldStaff = true;
      armR.sh.rotation.x = -0.3;
      armR.sh.rotation.z = -0.06;
      armR.elbow.rotation.x = -0.55;
      const staff = new THREE.Group();
      staff.position.set(0, -0.31, 0.055);  // exactly the hand
      staff.rotation.x = 0.78;              // counter the arm bend; slight forward plant
      armR.elbow.add(staff);
      add(staff, TCYL, M().get('wood', '#4a3522'), 0.05, 2.0, 0.05, 0, 0.06, 0);
      add(staff, P().geo('fig-staff-ring', () => new THREE.TorusGeometry(0.09, 0.02, 6, 14)), gold, 1, 1, 1, 0, 1.12, 0, true);
      add(staff, SPHERE, M().flat('#48b0a0', { roughness: 0.2, emissive: '#2a8a78', emissiveIntensity: 1.2 }), 0.05, 0.05, 0.05, 0, 1.12, 0, true);
      // fingers close around the shaft
      armR.hand.position.set(0, -0.31, 0.05);
      armR.hand.rotation.x = -1.2;
      if (!flair.hood && !flair.courtHair) {
        // a pectoral cross on the chest (religious bishops only)
        add(torso, BOX, gold, 0.03, 0.13, 0.02, 0, 0.12, 0.205, true);
        add(torso, BOX, gold, 0.08, 0.03, 0.02, 0, 0.155, 0.205, true);
      }
    }
    if (kind === 'knight') {
      const sword = new THREE.Group();
      sword.position.set(-0.26, -0.05, 0.06);
      sword.rotation.z = 0.35;
      torso.add(sword);
      add(sword, BOX, leather, 0.06, 0.62, 0.09, 0, -0.3, 0);
      add(sword, BOX, steelDark, 0.2, 0.04, 0.05, 0, 0.02, 0, true);
      add(sword, SPHERE, gold, 0.04, 0.04, 0.04, 0, 0.1, 0, true);
    }
    let guardSword = null;
    if (kind === 'rook') {
      // Guards carry a longsword. At rest it's planted point-down in front,
      // both hands resting on the pommel; on the march it rides sheathed at
      // the hip. The animator swaps the two and poses the arms.
      const planted = new THREE.Group();
      planted.position.set(0, 0, 0.34);
      g.add(planted);
      const blade = M().get('metal', '#a8b0ba', { metalness: 0.65 });    // bright so it reads
      const tip = add(planted, CONE, blade, 0.04, 0.1, 0.016, 0, 0.1, 0);
      tip.rotation.x = Math.PI;                                          // point down
      add(planted, BOX, blade, 0.04, 0.62, 0.014, 0, 0.46, 0);           // blade
      add(planted, BOX, steelDark, 0.2, 0.026, 0.034, 0, 0.78, 0);       // crossguard
      add(planted, CYL, leather, 0.026, 0.13, 0.026, 0, 0.86, 0);        // grip
      add(planted, SPHERE, gold, 0.042, 0.038, 0.042, 0, 0.94, 0, true); // pommel
      const sheathed = new THREE.Group();
      sheathed.position.set(-0.24, 0.86, 0.02);
      sheathed.rotation.z = 0.38;
      g.add(sheathed);
      add(sheathed, BOX, M().get('fabric', '#5d4426', { seed: 145 }), 0.05, 0.66, 0.026, 0, -0.28, 0); // scabbard
      add(sheathed, BOX, M().get('metal', '#a8b0ba', { metalness: 0.65 }), 0.056, 0.05, 0.03, 0, -0.04, 0); // throat fitting
      add(sheathed, BOX, steelDark, 0.2, 0.026, 0.034, 0, 0.02, 0);
      add(sheathed, CYL, leather, 0.026, 0.13, 0.026, 0, 0.1, 0);
      add(sheathed, SPHERE, gold, 0.042, 0.038, 0.042, 0, 0.18, 0, true);
      sheathed.visible = false;
      guardSword = { planted, sheathed };
    }

    // ── Cape (gear > flair > kind default) ──────────────────────────────
    let capeSegs = null;
    const capeGear = gearSet.cape || null;
    const capeColor = capeGear ? capeGear.colors.main
      : flair.cape || (kind === 'king' ? '#6a1c1c' : kind === 'crackedKing' ? '#4a443c' : null);
    if (capeColor) {
      const capeMat = M().get('fabric', capeColor, { seed: 69 });
      capeSegs = [];
      let parent = torso, py = 0.45;
      for (let i = 0; i < 3; i++) {
        const pivot = new THREE.Group();
        pivot.position.set(0, py, i === 0 ? -0.2 : 0);
        parent.add(pivot);
        add(pivot, BOX, capeMat, 0.52 - i * 0.04, 0.5, 0.035, 0, -0.25, 0);
        capeSegs.push(pivot);
        parent = pivot; py = -0.5;
      }
      if (capeGear) {
        // trim stripe at the hem in the set's accent colour
        add(capeSegs[2], BOX, M().get('fabric', capeGear.colors.trim, { seed: 139 }), 0.46, 0.06, 0.04, 0, -0.48, 0, true);
      }
    }

    // ── Animation ───────────────────────────────────────────────────────
    const state = { walking: false, phase: Math.random() * Math.PI * 2, headYaw: 0, lookTarget: null, lookExpire: null };
    g.userData.setWalking = (w) => { state.walking = !!w; };
    /** Turn body + head toward a world position (set when talked to). */
    g.userData.lookAt = (pos) => {
      state.lookTarget = pos ? { x: pos.x, z: pos.z } : null;
      state.lookExpire = null;
    };
    g.userData.groundY = 0;
    g.userData.animators = [(t, dt) => {
      const ph = state.phase;
      // Blink — a quick lid squash every few seconds, offset per figure
      if (eyeGroups.length) {
        const k = ((t + ph) % 3.4) < 0.13 ? 0.15 : 1;
        if (eyeGroups[0].scale.y !== k) eyeGroups.forEach(e => { e.scale.y = k; });
      }
      // Face whoever spoke to us: the body swings most of the way around,
      // the head finishes the look. Expires on its own after a few seconds.
      let lookYaw = null;
      if (state.lookTarget) {
        if (state.lookExpire === null) state.lookExpire = t + 8;
        if (t > state.lookExpire) { state.lookTarget = null; }
        else {
          g.getWorldPosition(_wp);
          let diff = Math.atan2(state.lookTarget.x - _wp.x, state.lookTarget.z - _wp.z) - g.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          g.rotation.y += diff * Math.min(1, dt * 5);
          lookYaw = Math.max(-0.5, Math.min(0.5, diff));
        }
      }
      if (state.walking) {
        const sw = Math.sin(t * 7.5 + ph);
        // robes reach the ground — a full stride pokes boots through the
        // cloth, so robed figures take short steps and the hem sways instead
        const amp = robed ? 0.16 : 0.5;
        if (!state.mounted) { legL.rotation.x = sw * amp; legR.rotation.x = -sw * amp; }
        if (robeSway) robeSway.rotation.x = 0.05 + 0.045 * sw;
        if (guardSword) { guardSword.planted.visible = false; guardSword.sheathed.visible = true; }
        armL.sh.rotation.x = -sw * 0.45;
        armL.sh.rotation.z = 0.07;
        armL.elbow.rotation.x = -0.25;
        if (!heldStaff) {
          armR.sh.rotation.x = sw * 0.45;
          armR.sh.rotation.z = -0.07;
          armR.elbow.rotation.x = -0.25;
        }
        torso.rotation.x = 0.08;
        torso.rotation.y = sw * 0.05;
        torso.rotation.z = 0;
        g.position.y = g.userData.groundY + Math.abs(Math.cos(t * 7.5 + ph)) * 0.045;
        if (capeSegs) capeSegs.forEach((s, i) => { s.rotation.x = 0.28 + 0.1 * Math.sin(t * 7.5 + ph - i * 0.6); });
      } else {
        const br = Math.sin(t * 1.7 + ph);
        if (!state.mounted) legL.rotation.x = legR.rotation.x = 0;
        if (robeSway) robeSway.rotation.x += (0 - robeSway.rotation.x) * Math.min(1, dt * 4);
        if (guardSword) {
          // at-ease stance: blade to the ground, both hands on the pommel
          guardSword.planted.visible = true;
          guardSword.sheathed.visible = false;
          armL.sh.rotation.x = armR.sh.rotation.x = -0.62;
          armL.sh.rotation.z = 0.34;
          armR.sh.rotation.z = -0.34;
          armL.elbow.rotation.x = armR.elbow.rotation.x = -0.1;
        } else {
          armL.sh.rotation.x = 0;
          armL.sh.rotation.z = 0.07 + br * 0.015;
          armL.elbow.rotation.x = -0.12;
          if (!heldStaff) {
            armR.sh.rotation.x = 0;
            armR.sh.rotation.z = -0.07 - br * 0.015;
            armR.elbow.rotation.x = -0.12;
          }
        }
        torso.rotation.x = 0.015 * br;
        torso.rotation.y = 0.025 * Math.sin(t * 0.23 + ph);   // slow weight shift
        torso.rotation.z = 0.012 * Math.sin(t * 0.31 + ph * 1.7);
        chest.scale.y = 0.52 * (1 + 0.018 * br);
        g.position.y = g.userData.groundY;
        // glances held for a beat instead of a metronome sweep
        const seg = Math.floor((t + ph * 3) / 3.2);
        const target = lookYaw !== null ? lookYaw : 0.38 * Math.sin(seg * 12.9898);
        state.headYaw += (target - state.headYaw) * Math.min(1, dt * 3.5);
        headG.rotation.y = state.headYaw;
        headG.rotation.x = lookYaw !== null ? -0.06 : 0.03 * Math.sin(t * 0.7 + ph);
        if (capeSegs) capeSegs.forEach((s, i) => { s.rotation.x = 0.12 + 0.035 * Math.sin(t * 1.3 + ph - i * 0.7); });
      }
    }];

    g.scale.setScalar(scale * 0.98);
    g.userData.figureKind = kind;

    // ── Mounted (chess knight) ──────────────────────────────────────────
    if (opts.mounted && kind === 'knight') {
      const mount = new THREE.Group();
      const horse = buildHorse({ color: '#43301f', cloth: faction ? faction.main : null });
      mount.add(horse);
      // seat the rider: hips to the saddle, thighs draped down the horse's sides
      g.position.y = 0.18;
      g.scale.setScalar(scale * 0.9);
      g.userData.groundY = 0.18;
      legL.rotation.x = -1.4; legL.rotation.z = 0.32;
      legR.rotation.x = -1.4; legR.rotation.z = -0.32;
      state.mounted = true;
      mount.add(g);
      const figWalk = g.userData.setWalking;
      mount.userData.setWalking = (w) => { figWalk(w); horse.userData.setWalking(w); };
      mount.userData.lookAt = g.userData.lookAt;
      mount.userData.figureKind = kind;
      mount.userData.groundY = 0;
      return mount; // traverse() at the call sites collects both animator sets
    }
    return g;
  }

  /** A low-poly warhorse: barrel body, jointed legs, arched neck, maned head,
   *  optional faction caparison. Animates a walk/idle gait; the rider is
   *  seated on top by build()'s mounted path. */
  /** Builds a medieval helm onto a head group — a squarish, gently tapered
   *  steel head with the face detail (brow, nasal bar, eye slits, breaths,
   *  cross, crown) worked into the front so it reads as a real helmet.
   *  add: (geo, mat, sx,sy,sz, x,y,z, noShadow) bound to the head group.
   *  geo: { BOX, CYL, CONE, CONE4, SPHERE }   mats: { steel, dark, brass }
   *  opts: { top:'point'|'flat', cross, holes, crown, open } */
  function _buildHelm(add, geo, mats, opts) {
    opts = opts || {};
    const { BOX, CYL, CONE4, SPHERE } = geo;
    const s = mats.steel, sd = mats.dark, br = mats.brass || s;
    // squarish head, tapered: wide brow → narrower jaw, with a rounded skull
    add(BOX, s, 0.42, 0.30, 0.38, 0, 0.30, 0);            // crown / brow
    add(SPHERE, s, 0.42, 0.22, 0.40, 0, 0.40, -0.01, true); // rounded skull cap (kills the cube top)
    add(BOX, s, 0.38, 0.20, 0.36, 0, 0.07, 0.01);        // mid face
    add(BOX, s, 0.30, 0.16, 0.30, 0, -0.10, 0.0);        // jaw
    add(BOX, s, 0.22, 0.14, 0.24, 0, -0.22, -0.01, true);// gorget over the neck
    const fz = 0.195;                                     // front-face plane
    // top finial
    if (opts.top === 'point') { const p = add(CONE4, s, 0.40, 0.34, 0.40, 0, 0.55, -0.01); p.rotation.y = Math.PI / 4; } // sugarloaf spire
    else if (!opts.crown) add(BOX, s, 0.40, 0.06, 0.36, 0, 0.49, -0.01, true); // flat cap
    // brow ridge across the front
    add(BOX, s, 0.40, 0.055, 0.05, 0, 0.37, fz, true);
    if (opts.open) {
      add(BOX, sd, 0.30, 0.17, 0.05, 0, 0.20, fz, true);             // open visor face (dark)
    } else {
      add(BOX, sd, 0.12, 0.05, 0.05, -0.10, 0.285, fz, true);        // left eye slit
      add(BOX, sd, 0.12, 0.05, 0.05, 0.10, 0.285, fz, true);         // right eye slit
      add(BOX, br, 0.055, 0.42, 0.06, 0, 0.14, fz + 0.005, true);    // raised nasal bar (full height)
      if (opts.cross) add(BOX, br, 0.20, 0.055, 0.06, 0, 0.17, fz + 0.005, true); // cross-bar (with the nasal → a cross)
      if (opts.holes) for (let r = 0; r < 3; r++) [-1, 1].forEach(k =>  // breath holes flanking the bar
        add(BOX, sd, 0.026, 0.03, 0.05, k * 0.12, 0.04 - r * 0.055, fz, true));
    }
    // crenellated crown band around a square parapet (the rook's castle)
    if (opts.crown) {
      add(BOX, s, 0.46, 0.08, 0.42, 0, 0.41, -0.01, true);           // band
      const mw = 0.07;
      [-0.15, 0, 0.15].forEach(x => {
        add(BOX, s, mw, 0.11, mw, x, 0.49, 0.18, true);
        add(BOX, s, mw, 0.11, mw, x, 0.49, -0.20, true);
      });
      [-0.12, 0.12].forEach(z => {
        add(BOX, s, mw, 0.11, mw, 0.21, 0.49, z - 0.01, true);
        add(BOX, s, mw, 0.11, mw, -0.21, 0.49, z - 0.01, true);
      });
    }
  }

  /** A tube that follows a curve while its radius tapers along radii[] — used
   *  for the hood's conical drooping tail so it flows wide out of the hood and
   *  narrows to a point. Cached by key (all hoods share the shape). */
  function _taperedTube(key, pts, radii, radial) {
    return P().geo(key, () => {
      const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])));
      const seg = 26, rs = radial || 8;
      const frames = curve.computeFrenetFrames(seg, false);
      const pos = [], idx = [];
      for (let i = 0; i <= seg; i++) {
        const t = i / seg, c = curve.getPointAt(t);
        const f = t * (radii.length - 1), lo = Math.floor(f), hi = Math.min(radii.length - 1, lo + 1);
        const r = radii[lo] + (radii[hi] - radii[lo]) * (f - lo);
        const N = frames.normals[i], B = frames.binormals[i];
        for (let j = 0; j <= rs; j++) {
          const a = (j / rs) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
          pos.push(c.x + r * (ca * N.x + sa * B.x), c.y + r * (ca * N.y + sa * B.y), c.z + r * (ca * N.z + sa * B.z));
        }
      }
      for (let i = 0; i < seg; i++) for (let j = 0; j < rs; j++) {
        const a = i * (rs + 1) + j, b = a + rs + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx); g.computeVertexNormals();
      g.userData.story3dShared = true;
      return g;
    });
  }

  function buildHorse(opts) {
    opts = opts || {};
    const coat = M().get('fabric', opts.color || '#43301f', { seed: 150 });
    const dark = M().get('fabric', _shade(opts.color || '#43301f', -0.4), { seed: 151 });
    const hoofM = M().flat('#161009', { roughness: 0.85 });
    const BOX = P().BOX(), CYL = P().CYL(), TCYL = P().TCYL(), SPHERE = P().SPHERE(), CONE = P().CONE();
    const g = new THREE.Group();
    const put = (parent, geo, mat, sx, sy, sz, x, y, z, ns) => {
      const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z);
      if (!ns) { m.castShadow = true; m.receiveShadow = true; } parent.add(m); return m;
    };
    const back = 0.92; // height of the horse's back (saddle line)
    put(g, SPHERE, coat, 0.52, 0.5, 1.0, 0, back, 0);            // barrel
    put(g, SPHERE, coat, 0.46, 0.48, 0.5, 0, back - 0.02, 0.46); // chest
    put(g, SPHERE, coat, 0.5, 0.52, 0.52, 0, back + 0.02, -0.46);// haunch
    const legs = [];
    [[0.23, 0.5], [-0.23, 0.5], [0.25, -0.5], [-0.25, -0.5]].forEach(([x, z]) => {
      const leg = new THREE.Group(); leg.position.set(x, back - 0.08, z); g.add(leg);
      put(leg, TCYL, coat, 0.14, 0.5, 0.14, 0, -0.24, 0);
      put(leg, CYL, dark, 0.08, 0.42, 0.08, 0, -0.6, 0);
      put(leg, BOX, hoofM, 0.15, 0.1, 0.17, 0, -0.83, 0.01);
      legs.push(leg);
    });
    // neck — leans UP and FORWARD (+z) from the chest to the head; thick enough
    // to read as a neck and long enough to close the gap to the head
    const neck = put(g, TCYL, coat, 0.31, 0.84, 0.37, 0, back + 0.30, 0.62);
    neck.rotation.x = 0.68;
    put(g, SPHERE, coat, 0.34, 0.3, 0.4, 0, back + 0.06, 0.5); // throat — blends neck into the chest
    const head = new THREE.Group(); head.position.set(0, back + 0.62, 0.92); g.add(head);
    put(head, BOX, coat, 0.2, 0.22, 0.4, 0, 0, 0.04);
    put(head, BOX, coat, 0.15, 0.15, 0.26, 0, -0.05, 0.27);
    put(head, BOX, dark, 0.16, 0.05, 0.12, 0, -0.1, 0.39, true);
    [-1, 1].forEach(sx => { const ear = put(head, CONE, coat, 0.05, 0.13, 0.05, sx * 0.07, 0.15, -0.06); ear.rotation.x = -0.2; });
    [-1, 1].forEach(sx => put(head, SPHERE, M().flat('#0e0a06', { roughness: 0.3 }), 0.04, 0.05, 0.03, sx * 0.1, 0.04, 0.18, true));
    for (let i = 0; i < 7; i++) put(g, BOX, dark, 0.05, 0.17, 0.09, 0, back + 0.16 + i * 0.085, 0.44 + i * 0.058).rotation.x = 0.68; // mane along the neck crest
    const tail = put(g, TCYL, dark, 0.09, 0.62, 0.09, 0, back - 0.06, -0.62); tail.rotation.x = 0.5;
    if (opts.cloth) {
      const cl = put(g, BOX, M().get('fabric', opts.cloth, { seed: 152 }), 0.74, 0.07, 0.74, 0, back + 0.27, 0);
      put(g, BOX, M().get('fabric', opts.cloth, { seed: 152 }), 0.76, 0.34, 0.04, 0, back - 0.05, 0.4, true); // peytral drape
    }
    const st = { walking: false };
    g.userData.setWalking = (w) => { st.walking = !!w; };
    g.userData.animators = [(t) => {
      const sw = st.walking ? Math.sin(t * 7) : Math.sin(t * 1.1) * 0.12;
      legs[0].rotation.x = sw * 0.4; legs[3].rotation.x = sw * 0.4;
      legs[1].rotation.x = -sw * 0.4; legs[2].rotation.x = -sw * 0.4;
      head.rotation.x = 0.05 * Math.sin(t * 1.1);
      tail.rotation.z = 0.1 * Math.sin(t * 2.2);
    }];
    return g;
  }

  /** Is the player king yet? Crowned once the court accepts him (ch1 boss). */
  function playerIsCrowned() {
    const prog = (typeof storyProgress !== 'undefined') ? storyProgress : window.storyProgress;
    return !!(prog && prog.bossesCleared && prog.bossesCleared.includes('ch1-boss'));
  }

  /** Build by cutscene/cast id; layers Content faction + accents, the
   *  player's equipped gear, and the crown rule on top of CS_SILHOUETTES. */
  function buildById(id, opts) {
    opts = opts || {};
    const def = defFor(id);
    const accents = (C() && C().FIGURE_ACCENTS && C().FIGURE_ACCENTS[id]) || {};
    const flair = Object.assign({}, ID_FLAIR[id], accents, opts.flair);
    const faction = opts.faction !== undefined ? opts.faction : (C() ? C().factionOf(id, opts.chapterId) : null);
    let gearSet = opts.gear;
    let crowned = opts.crowned;
    if (id === 'player') {
      if (gearSet === undefined && NS.Inventory) gearSet = NS.Inventory.equippedGear();
      if (crowned === undefined) crowned = playerIsCrowned();
    }
    const g = build(def, Object.assign({}, opts, { id, flair, faction, gear: gearSet, crowned }));
    g.userData.figureId = id;
    return g;
  }

  return { build, buildById, buildHorse, defFor, EXTRA_DEFS, ID_FLAIR, playerIsCrowned };
});
