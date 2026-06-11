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

  // Hub-only roles the 2D table doesn't know.
  const EXTRA_DEFS = {
    guard:    { kind: 'rook',   color: '#4a5058', scale: 1.0 },
    merchant: { kind: 'human',  color: '#6a4a28', scale: 1.0 },
    npc:      { kind: 'human',  color: '#3a3a3a', scale: 1.0 },
  };
  // Character-specific extras keyed by figure id (accents come from Content).
  const ID_FLAIR = {
    aldric:  { glowEyes: '#7ac8ff' },   // the Undying
    saoirse: { hood: true },
    player:  { cape: '#6a1c1c' },
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
  function _skinTone(hex) {
    const c = new THREE.Color(hex);
    c.lerp(new THREE.Color('#d8b890'), 0.5);
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
    const cloth = M().get('fabric', color, { seed: 47 });
    const clothDark = M().get('fabric', _shade(color, -0.35), { seed: 49 });
    const trim = M().get('fabric', flair.trim || (faction ? faction.trim : _shade(color, 0.35)), { seed: 51 });
    const steel = M().get('metal', '#5a5f68', { metalness: 0.45 });
    const steelDark = M().get('metal', '#3c4048', { metalness: 0.4 });
    const gold = M().get('metal', '#c8a040', { metalness: 0.7 });
    const skin = M().flat(_skinTone(color), { roughness: 0.65 });
    const leather = M().get('fabric', '#4a3522', { seed: 53 });
    const tabardMat = faction ? M().get('fabric', faction.main, { seed: 55 }) : cloth;

    const BOX = P().BOX(), CYL = P().CYL(), TCYL = P().TCYL(), SPHERE = P().SPHERE(), CONE = P().CONE();
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
      add(leg, BOX, leather, 0.15, 0.09, 0.26, 0, -0.85, 0.05);            // boot
      if (armored) add(leg, BOX, steel, 0.17, 0.16, 0.18, 0, -0.62, 0.02); // greave
      g.add(leg);
    });

    // ── Robe / tunic over the legs ──────────────────────────────────────
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
      add(g, robeGeo, robeMat, 1, 1.05, 1, 0, 0.0, 0);
      const hem = add(g, P().geo('fig-hem', () => new THREE.TorusGeometry(0.345, 0.025, 6, 18)),
        gearSet.body && gearSet.body.style === 'robe' ? M().get('fabric', gearSet.body.colors.trim, { seed: 123 }) : trim,
        1, 1, 1, 0, 0.05, 0, true);
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
    const chest = add(torso, SPHERE, chestMat, 0.46, 0.55, 0.36, 0, 0.22, 0);
    add(torso, SPHERE, chestMat, 0.4, 0.34, 0.32, 0, 0.42, 0); // upper chest
    add(torso, BOX, leather, 0.42, 0.09, 0.32, 0, -0.02, 0);   // belt
    add(torso, BOX, kind === 'king' || kind === 'queen' ? gold : steelDark, 0.09, 0.07, 0.05, 0, -0.02, 0.165, true);
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
    const mkArm = (side) => {
      const sh = new THREE.Group();
      sh.position.set(side * 0.27, 0.45, 0);
      torso.add(sh);
      const armMat = armored ? steelDark : cloth;
      add(sh, SPHERE, bodyGear && bodyGear.style === 'plate' ? chestMat : (armored ? steel : cloth), 0.16, 0.15, 0.16, 0, 0.01, 0);
      add(sh, TCYL, armMat, 0.1, 0.34, 0.1, side * 0.02, -0.18, 0);
      const elbow = new THREE.Group();
      elbow.position.set(side * 0.03, -0.36, 0);
      sh.add(elbow);
      add(elbow, TCYL, armMat, 0.085, 0.3, 0.085, 0, -0.14, 0.02);
      add(elbow, SPHERE, skin, 0.085, 0.085, 0.085, 0, -0.3, 0.04);
      return { sh, elbow };
    };
    const armL = mkArm(-1);
    const armR = mkArm(1);

    // ── Head ────────────────────────────────────────────────────────────
    const headG = new THREE.Group();
    headG.position.y = 0.62;
    torso.add(headG);
    add(headG, CYL, skin, 0.09, 0.1, 0.09, 0, 0.02, 0);
    add(headG, SPHERE, skin, 0.26, 0.29, 0.27, 0, 0.18, 0);
    add(headG, SPHERE, skin, 0.2, 0.16, 0.2, 0, 0.08, 0.03);
    if (flair.glowEyes) {
      [-1, 1].forEach(sx => add(headG, SPHERE,
        M().flat(flair.glowEyes, { roughness: 0.2, emissive: flair.glowEyes, emissiveIntensity: 2.2 }),
        0.035, 0.028, 0.02, sx * 0.06, 0.19, 0.125, true));
    }

    // ── Headgear: gear first, then kind defaults ────────────────────────
    const headGear = gearSet.head || null;
    const addHood = (mat) => {
      const hoodGeo = P().geo('fig-hood', () => {
        const pts = [
          [0.2, -0.05], [0.3, 0.05], [0.32, 0.2], [0.26, 0.36], [0.12, 0.44], [0.001, 0.45],
        ].map(p => new THREE.Vector2(p[0], p[1]));
        return new THREE.LatheGeometry(pts, 14, Math.PI * 0.6, Math.PI * 1.8);
      });
      const hood = new THREE.Mesh(hoodGeo, mat);
      hood.position.set(0, 0.06, -0.02);
      hood.rotation.y = Math.PI * 0.1;
      hood.castShadow = true;
      headG.add(hood);
      add(headG, SPHERE, M().flat('#0e0a08', { roughness: 1 }), 0.2, 0.22, 0.1, 0, 0.18, 0.08, true);
    };
    const addCrown = (crownMat, points, broken) => {
      const band = add(headG, P().geo('fig-crown', () => new THREE.TorusGeometry(0.135, 0.028, 6, 16)), crownMat, 1, 1, 1, 0, 0.33, 0);
      band.rotation.x = Math.PI / 2;
      for (let i = 0; i < points; i++) {
        const a = (i / points) * Math.PI * 2;
        const sp = add(headG, CONE, crownMat, 0.05, 0.11, 0.05, Math.cos(a) * 0.125, 0.41, Math.sin(a) * 0.125);
        if (broken && i === 1) { sp.rotation.z = 1.1; sp.position.y = 0.37; }
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
        const hb = add(headG, P().geo('fig-hoodband', () => new THREE.TorusGeometry(0.2, 0.018, 6, 14)), M().get('fabric', headGear.colors.trim, { seed: 135 }), 1, 1, 1, 0, 0.02, 0.05, true);
        hb.rotation.x = Math.PI / 2 - 0.3;
      }
    } else if (kind === 'king' || kind === 'crackedKing') {
      // The player only earns the crown once the court accepts him (D13);
      // every other royal figure wears theirs from the start.
      if (opts.crowned !== false) {
        const crownMat = kind === 'king' ? gold : M().get('metal', '#6a6258', { metalness: 0.5 });
        addCrown(crownMat, kind === 'crackedKing' ? 4 : 5, kind === 'crackedKing');
        if (kind === 'king') add(headG, SPHERE, M().flat('#a02030', { roughness: 0.25, emissive: '#601018', emissiveIntensity: 0.4 }), 0.035, 0.035, 0.035, 0, 0.345, 0.13, true);
      } else {
        // uncrowned prince: bare dark hair, no regalia
        add(headG, SPHERE, M().get('fabric', '#2c2014', { seed: 137 }), 0.265, 0.2, 0.255, 0, 0.27, -0.02);
      }
    } else if (kind === 'queen') {
      const band = add(headG, P().geo('fig-coronet', () => new THREE.TorusGeometry(0.115, 0.02, 6, 14)), gold, 1, 1, 1, 0, 0.33, 0);
      band.rotation.x = Math.PI / 2;
      add(headG, SPHERE, gold, 0.04, 0.05, 0.04, 0, 0.39, 0, true);
      add(headG, SPHERE, clothDark, 0.27, 0.3, 0.24, 0, 0.13, -0.06);
    } else if (kind === 'knight') {
      add(headG, SPHERE, steel, 0.29, 0.31, 0.29, 0, 0.18, 0);
      add(headG, BOX, M().flat('#0c0c10', { roughness: 0.6 }), 0.26, 0.045, 0.06, 0, 0.18, 0.24, true);
      add(headG, BOX, steel, 0.3, 0.05, 0.2, 0, 0.07, 0.12);
      const plume = add(headG, CONE, M().get('fabric', flair.plume || '#8a2c2c', { seed: 63 }), 0.07, 0.36, 0.07, 0, 0.46, -0.07);
      plume.rotation.x = -0.5;
    } else if (kind === 'rook') {
      add(headG, CYL, steel, 0.3, 0.3, 0.3, 0, 0.18, 0);
      add(headG, BOX, M().flat('#0c0c10', { roughness: 0.6 }), 0.22, 0.04, 0.05, 0, 0.2, 0.15, true);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        add(headG, BOX, steel, 0.09, 0.08, 0.09, Math.cos(a) * 0.11, 0.36, Math.sin(a) * 0.11);
      }
    } else if (kind === 'bishop' || flair.hood) {
      addHood(clothDark);
    } else {
      add(headG, P().geo('fig-cowl', () => new THREE.TorusGeometry(0.14, 0.06, 8, 14)), clothDark, 1, 1, 1, 0, 0.0, 0).rotation.x = Math.PI / 2 - 0.2;
      add(headG, SPHERE, M().get('fabric', '#3a2c1c', { seed: 67 }), 0.26, 0.18, 0.25, 0, 0.27, -0.03);
    }
    if (kind === 'bishop') {
      const staff = new THREE.Group();
      staff.position.set(0.06, -0.32, 0.05);
      armR.elbow.add(staff);
      add(staff, TCYL, M().get('wood', '#4a3522'), 0.05, 1.7, 0.05, 0, 0.45, 0);
      add(staff, P().geo('fig-staff-ring', () => new THREE.TorusGeometry(0.09, 0.02, 6, 14)), gold, 1, 1, 1, 0, 1.32, 0, true);
      add(staff, SPHERE, M().flat('#48b0a0', { roughness: 0.2, emissive: '#2a8a78', emissiveIntensity: 1.2 }), 0.05, 0.05, 0.05, 0, 1.32, 0, true);
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
    const state = { walking: false, phase: Math.random() * Math.PI * 2 };
    g.userData.setWalking = (w) => { state.walking = !!w; };
    g.userData.groundY = 0;
    g.userData.animators = [(t, dt) => {
      const ph = state.phase;
      if (state.walking) {
        const sw = Math.sin(t * 7.5 + ph);
        legL.rotation.x = sw * 0.5;
        legR.rotation.x = -sw * 0.5;
        armL.sh.rotation.x = -sw * 0.45;
        armR.sh.rotation.x = sw * 0.45;
        armL.elbow.rotation.x = -0.25;
        armR.elbow.rotation.x = -0.25;
        torso.rotation.x = 0.08;
        torso.rotation.y = sw * 0.05;
        g.position.y = g.userData.groundY + Math.abs(Math.cos(t * 7.5 + ph)) * 0.045;
        if (capeSegs) capeSegs.forEach((s, i) => { s.rotation.x = 0.28 + 0.1 * Math.sin(t * 7.5 + ph - i * 0.6); });
      } else {
        const br = Math.sin(t * 1.7 + ph);
        legL.rotation.x = legR.rotation.x = 0;
        armL.sh.rotation.x = armR.sh.rotation.x = 0;
        armL.sh.rotation.z = 0.07 + br * 0.015;
        armR.sh.rotation.z = -0.07 - br * 0.015;
        armL.elbow.rotation.x = armR.elbow.rotation.x = -0.12;
        torso.rotation.x = 0.015 * br;
        torso.rotation.y = 0;
        chest.scale.y = 0.55 * (1 + 0.018 * br);
        g.position.y = g.userData.groundY;
        headG.rotation.y = 0.14 * Math.sin(t * 0.5 + ph * 2);
        if (capeSegs) capeSegs.forEach((s, i) => { s.rotation.x = 0.12 + 0.035 * Math.sin(t * 1.3 + ph - i * 0.7); });
      }
    }];

    g.scale.setScalar(scale * 0.98);
    g.userData.figureKind = kind;
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
    const g = build(def, Object.assign({}, opts, { flair, faction, gear: gearSet, crowned }));
    g.userData.figureId = id;
    return g;
  }

  return { build, buildById, defFor, EXTRA_DEFS, ID_FLAIR, playerIsCrowned };
});
