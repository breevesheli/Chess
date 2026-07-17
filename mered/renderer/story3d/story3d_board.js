/**
 * story3d_board.js — the 3D match presenter.
 *
 * The hidden 2D board remains the state of truth (DECISIONS.md D3): this
 * module reads `boardPosition`, animates from the move events emitted by the
 * always-on executeMove/applyUciMove wraps, and mutates state only by calling
 * the real `executeMove`. Input: raycast click → getLegalMoves → highlight →
 * executeMove. Capture topple-and-dissolve, knight arcs, castling rook
 * glides, check pulse, and checkmate emphasis live here.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(null, null);
  else { root.Story3D.Match = factory(root.THREE, root.Story3D); }
})(typeof self !== 'undefined' ? self : this, function (THREE, NS) {
  'use strict';
  if (!THREE) return {};

  const A = () => NS.Adapter;
  const SQ_TABLE = 0.26;           // tabletop square size (m)
  let sq = SQ_TABLE;               // current square size (battles enlarge it)
let pieceScale = SQ_TABLE * 1.5; // current piece scale

  const state = {
    active: false,
    env: null,
    boardGroup: null,
    boardTop: null,
    topY: 0,                       // local Y of the board surface
    pieces: [],                    // 8x8 of piece groups (mirror)
    model: [],                     // 8x8 of piece letters (mirror snapshot)
    highlights: null,
    selected: null,                // {r, c}
    legal: [],                     // [[r, c, flag]]
    animators: [],
    untick: null,
    animating: 0,
    checkLight: null,
  };

  // Live globals from the monolith (top-level let/const are global lexical
  // bindings — visible to later scripts as bare identifiers, not on window).
  /* eslint-disable no-undef */
  const board = () => (typeof boardPosition !== 'undefined' ? boardPosition : window.boardPosition);
  const _gameActive = () => (typeof gameActive !== 'undefined' ? gameActive : window.gameActive);
  const _gameEnded = () => (typeof gameEndedByRules !== 'undefined' ? gameEndedByRules : window.gameEndedByRules);
  const _sideToMove = () => (typeof sideToMove !== 'undefined' ? sideToMove : window.sideToMove);
  const _storyFight = () => (typeof storyActiveFight !== 'undefined' ? storyActiveFight : window.storyActiveFight);
  const _fightBgMap = () => (typeof STORY_FIGHT_BG !== 'undefined' ? STORY_FIGHT_BG : window.STORY_FIGHT_BG) || {};
  const _equipped = () => (typeof equippedSkins !== 'undefined' ? equippedSkins : window.equippedSkins) || {};
  const _inCheck = () => (typeof inCheckFlag !== 'undefined' ? inCheckFlag : window.inCheckFlag);
  /* eslint-enable no-undef */
  const myTurn = () =>
    !!_gameActive() && !_gameEnded() && _sideToMove() === 'white' && !!_storyFight();

  // ── Lifecycle ────────────────────────────────────────────────────────
  function begin(fight) {
    NS.init();
    end();
    NS.Hub.hide?.();
    NS.clearScene();
    NS.mode = 'match';
    document.body.classList.add('story3d-match');

    const bgMap = _fightBgMap();
    const bgId = (fight && bgMap[fight.fight?.id]) || 'palace_great_hall';
    const env = NS.Environments.build(bgId);
    state.env = env;
    NS.scene.add(env.group);
    NS.applyAtmosphere(env);
    state.animators = env.animators.slice();

    // Boss fights are BATTLES: a life-size board on open ground, your war
    // party standing as the white pieces, the boss's army as black, the
    // boss himself the enemy king. Ordinary fights keep the tabletop.
    state.battle = !!(fight && fight.isBoss);
    state.chapterId = fight?.chapter?.id || 'ch1';
    state.bossId = state.battle ? _opponentFigureId(fight) : null;
    const envMin = Math.min(
      (env.bounds.maxX - env.bounds.minX), (env.bounds.maxZ - env.bounds.minZ));
    sq = state.battle ? (envMin > 16 ? 1.1 : 0.85) : SQ_TABLE;
    pieceScale = state.battle ? sq * 0.88 : sq * 1.5;

    const bg = new THREE.Group();
    let topY;
    if (state.battle) {
      bg.position.set(0, 0, 0); // the field itself
      topY = -0.069;            // board surface flush with the ground
      const top = new THREE.Mesh(
        NS.Props.geo(`boardtop|${sq}`, () => new THREE.PlaneGeometry(sq * 8, sq * 8)),
        NS.Materials.boardTop()
      );
      top.rotation.x = -Math.PI / 2;
      top.position.y = topY + 0.071;
      top.receiveShadow = true;
      bg.add(top);
      state.boardTop = top;
    } else {
      bg.position.set(env.boardAnchor.x, 0, env.boardAnchor.z);
      bg.rotation.y = env.boardAnchor.rotY || 0;
      const table = NS.Props.boardTable({ style: env.tableStyle, topSize: sq * 8 + 0.5 });
      bg.add(table);
      topY = table.userData.topY;
      const slab = new THREE.Mesh(NS.Props.BOX(), NS.Materials.get('wood', '#2e2014'));
      slab.scale.set(sq * 8 + 0.18, 0.07, sq * 8 + 0.18);
      slab.position.y = topY + 0.035;
      slab.castShadow = true; slab.receiveShadow = true;
      bg.add(slab);
      const top = new THREE.Mesh(
        NS.Props.geo(`boardtop|${sq}`, () => new THREE.PlaneGeometry(sq * 8, sq * 8)),
        NS.Materials.boardTop()
      );
      top.rotation.x = -Math.PI / 2;
      top.position.y = topY + 0.071;
      top.receiveShadow = true;
      bg.add(top);
      state.boardTop = top;
    }
    state.topY = topY + 0.071;
    state.boardGroup = bg;
    NS.scene.add(bg);

    let opp = null;
    if (!state.battle) {
      // The opponent stands across the board (no chairs — they'd be unsat).
      opp = NS.Figures.buildById(_opponentFigureId(fight));
      opp.position.set(env.boardAnchor.x, 0, env.boardAnchor.z - sq * 8 - 0.45);
      opp.rotation.y = 0; opp.userData.heading = 0;
      NS.scene.add(opp);
      opp.traverse(o => { if (o.userData.animators) state.animators.push(...o.userData.animators); });
    }

    state.highlights = new THREE.Group();
    state.highlights.position.y = state.topY + 0.004;
    bg.add(state.highlights);

    rebuildFromBoard();
    state.untick = NS.onTick(_tick);
    state.active = true;

    const center = new THREE.Vector3(bg.position.x, state.topY, bg.position.z);
    const matchOpts = state.battle ? { ms: 1600, dist: sq * 8 * 1.15, pitch: 0.95 } : { ms: 1500 };
    if (state.battle) {
      // Battle entrance: sweep low across the enemy ranks to the boss-king,
      // hold under the title card, then rise to the war view.
      const kw = A().squareToWorld(0, 4, sq); // black king's square (e8)
      NS.CameraRig.jumpTo(
        { x: kw.x - sq * 5, y: 2.2, z: kw.z - sq * 6 },
        { x: kw.x, y: 1.4, z: kw.z }
      );
      NS.HUD.showTitleCard(fight.fight.name.toUpperCase(), `CHAPTER ${fight.chapter?.num || ''}`.trim());
      NS.CameraRig.flyTo(
        { x: kw.x + sq * 1.2, y: 1.9, z: kw.z + sq * 2.6 },
        { x: kw.x, y: 1.5, z: kw.z },
        2600,
        () => setTimeout(() => NS.CameraRig.setMatch(center, matchOpts), 800)
      );
    } else if (fight && fight.isBoss && opp) {
      const ox = opp.position.x, oz = opp.position.z;
      NS.CameraRig.jumpTo({ x: ox - 6, y: 5.5, z: oz - 7 }, { x: ox, y: 1.4, z: oz });
      NS.HUD.showTitleCard(fight.fight.name.toUpperCase(), `CHAPTER ${fight.chapter?.num || ''}`.trim());
      NS.CameraRig.flyTo({ x: ox + 0.6, y: 1.8, z: oz + 2.4 }, { x: ox, y: 1.45, z: oz }, 2400,
        () => setTimeout(() => NS.CameraRig.setMatch(center, matchOpts), 700));
    } else {
      NS.CameraRig.setMatch(center, matchOpts);
    }
    NS.HUD.setLocation('');
    NS.HUD.showMatchHud();
    _bindInput();
    NS.bus.emit('matchBegan', { bgId });
  }

  function _opponentFigureId(fight) {
    const f = fight && fight.fight;
    if (!f) return 'guard';
    const table = {
      'ch1-f0': 'cavan', 'ch1-boss': 'aldwyn', 'ch2-boss': 'brenna',
      'ch3-boss': 'halvane', 'ch4-boss': 'aldric', 'ch5-boss': 'saoirse',
    };
    return table[f.id] || (f.type === 'rival' ? 'guard' : f.type === 'brother' ? 'cavan' : 'guard');
  }

  function end() {
    if (!state.active && !state.boardGroup) return;
    if (state.untick) { state.untick(); state.untick = null; }
    state.active = false;
    state.boardGroup = null;
    state.boardTop = null;
    state.pieces = [];
    state.model = [];
    state.selected = null;
    state.legal = [];
    state.animators = [];
    state.battle = false;
    sq = SQ_TABLE;
    pieceScale = SQ_TABLE * 1.5;
    document.body.classList.remove('story3d-match');
    NS.HUD.hideMatchHud();
    // Scene content is cleared by whoever shows the next stage.
  }

  // ── Mirror construction / resync ─────────────────────────────────────
  const _ordinals = {};
  function _placePiece(letter, r, c) {
    const type = A().pieceType(letter);
    const color = A().pieceColor(letter);
    let p;
    if (state.battle) {
      // People as pieces: the war party in white, the boss's army in black.
      const ord = _ordinals[letter] = (_ordinals[letter] || 0);
      _ordinals[letter]++;
      const who = NS.Content.battleFigureFor(letter, state.chapterId, ord, state.bossId);
      // Knights ride into battle on horseback — but only outdoors. Indoor
      // boards (throne room, halls) keep them free-standing on foot.
      const mounted = type === 'knight' && state.env && !state.env.indoor;
      p = who.id
        ? NS.Figures.buildById(who.id, { chapterId: state.chapterId, mounted })
        : NS.Figures.build(who.def, { faction: who.faction, chapterId: state.chapterId, mounted });
      p.scale.multiplyScalar(pieceScale);
      p.rotation.y = color === 'white' ? Math.PI : 0; // armies face each other
      p.userData.heading = p.rotation.y;
    } else {
      const variant = type === 'king' ? A().kingSkinVariant(_equipped(), color) : null;
      // Piece armor: the player's blanket cosmetics dress the white army only.
      const armor = color === 'white' && NS.Inventory ? NS.Inventory.pieceArmorFor(type) : null;
      p = NS.Pieces.build(type, color, { variant, armor });
      p.scale.setScalar(pieceScale);
    }
    const w = A().squareToWorld(r, c, sq);
    p.position.set(w.x, state.topY, w.z);
    p.userData.groundY = state.topY;
    state.boardGroup.add(p);
    if (p.userData.animators) state.animators.push(...p.userData.animators);
    return p;
  }

  function rebuildFromBoard() {
    const b = board();
    if (!b || !state.boardGroup) return;
    // Clear existing
    Object.keys(_ordinals).forEach(k => delete _ordinals[k]);
    state.pieces.flat?.().forEach(p => p && NS.disposeGroup(p));
    state.pieces = Array.from({ length: 8 }, () => Array(8).fill(null));
    state.model = Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => b[r][c] || null));
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      if (b[r][c]) state.pieces[r][c] = _placePiece(b[r][c], r, c);
    }
    _clearHighlights();
  }

  function resyncFromBoard() {
    const b = board();
    if (!b || !state.active) return;
    const diff = A().boardDiff(state.model, b);
    if (!diff.length) return;
    diff.forEach(({ r, c, to }) => {
      if (state.pieces[r][c]) { NS.disposeGroup(state.pieces[r][c]); state.pieces[r][c] = null; }
      state.model[r][c] = to;
      if (to) state.pieces[r][c] = _placePiece(to, r, c);
    });
  }

  // ── Move animation ───────────────────────────────────────────────────
  function animateMove(mv) {
    if (!state.active || !mv || !mv.ok) return;
    state.animating++;
    _clearHighlights();
    const dur = 450;
    const fromW = A().squareToWorld(mv.fr, mv.fc, sq);
    const toW = A().squareToWorld(mv.tr, mv.tc, sq);
    const piece = state.pieces[mv.fr][mv.fc];
    // Capture first: topple + dissolve
    if (mv.captured && mv.capturedAt) {
      const victim = state.pieces[mv.capturedAt.r][mv.capturedAt.c];
      state.pieces[mv.capturedAt.r][mv.capturedAt.c] = null;
      state.model[mv.capturedAt.r][mv.capturedAt.c] = null;
      if (victim) _topple(victim, mv.mover === 'white' ? 1 : -1);
    }
    // Book-keep model now (animation is cosmetic; boardPosition already moved)
    state.model[mv.fr][mv.fc] = null;
    state.model[mv.tr][mv.tc] = mv.promoPiece || mv.piece;
    state.pieces[mv.fr][mv.fc] = null;
    state.pieces[mv.tr][mv.tc] = piece;
    if (piece) {
      const isKnight = A().pieceType(mv.piece) === 'knight';
      piece.userData.setWalking?.(true);
      NS.tween(dur, k => {
        piece.position.x = fromW.x + (toW.x - fromW.x) * k;
        piece.position.z = fromW.z + (toW.z - fromW.z) * k;
        if (!state.battle) piece.position.y = state.topY + (isKnight ? Math.sin(k * Math.PI) * 0.22 : Math.sin(k * Math.PI) * 0.04);
      }, () => {
        piece.userData.setWalking?.(false);
        piece.position.set(toW.x, state.topY, toW.z);
        // Promotion: swap mesh for the promoted piece
        if (mv.promoPiece) {
          NS.disposeGroup(piece);
          state.pieces[mv.tr][mv.tc] = _placePiece(mv.promoPiece, mv.tr, mv.tc);
        }
        _afterMove(mv);
      });
    } else {
      // Mirror desynced — rebuild authoritatively.
      resyncFromBoard();
      _afterMove(mv);
    }
    // Castling: the rook glides alongside
    if (mv.rookMove) {
      const rk = state.pieces[mv.rookMove.fr][mv.rookMove.fc];
      const rFrom = A().squareToWorld(mv.rookMove.fr, mv.rookMove.fc, sq);
      const rTo = A().squareToWorld(mv.rookMove.tr, mv.rookMove.tc, sq);
      state.pieces[mv.rookMove.fr][mv.rookMove.fc] = null;
      state.pieces[mv.rookMove.tr][mv.rookMove.tc] = rk;
      state.model[mv.rookMove.fr][mv.rookMove.fc] = null;
      state.model[mv.rookMove.tr][mv.rookMove.tc] = mv.mover === 'white' ? 'R' : 'r';
      if (rk) NS.tween(dur + 80, k => {
        rk.position.x = rFrom.x + (rTo.x - rFrom.x) * k;
        rk.position.z = rFrom.z + (rTo.z - rFrom.z) * k;
      });
    }
  }

  function _topple(victim, dir) {
    const axis = (Math.random() - 0.5) * 0.8;
    const s0 = victim.scale.x;
    NS.tween(420, k => {
      victim.rotation.z = dir * k * (Math.PI / 2 - 0.12);
      victim.rotation.x = axis * k;
      victim.position.y = state.topY + Math.sin(Math.min(k * 1.4, 1) * Math.PI) * 0.05;
    }, () => {
      // dissolve: sink + scale out
      NS.tween(500, k => {
        victim.position.y = state.topY - k * 0.22;
        victim.scale.setScalar(s0 * (1 - k * 0.85));
      }, () => NS.disposeGroup(victim));
    });
  }

  function _afterMove(mv) {
    state.animating = Math.max(0, state.animating - 1);
    resyncFromBoard();       // authoritative correction after every batch
    _updateCheckPulse();
  }

  function _updateCheckPulse() {
    const inCheck = _inCheck();
    if (state.checkLight) { NS.scene.remove(state.checkLight); state.checkLight = null; }
    if (!inCheck || !state.active) return;
    // Side to move is the checked side (rules layer keeps this current).
    const checkedColor = _sideToMove();
    const letter = checkedColor === 'white' ? 'K' : 'k';
    const b = board();
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      if (b[r][c] === letter) {
        const w = A().squareToWorld(r, c, sq);
        const l = new THREE.PointLight(0xff2a18, 1.6, 2.6, 2);
        const wp = new THREE.Vector3(w.x, state.topY + 0.6, w.z);
        state.boardGroup.localToWorld(wp);
        l.position.copy(wp);
        NS.scene.add(l);
        state.checkLight = l;
        NS.CameraRig.pulse(0.05);
        return;
      }
    }
  }

  /** Game over (called after the real showResultModal ran). */
  function onGameEnd(outcome) {
    if (!state.active) return;
    const loserLetter = outcome === 'win' ? 'k' : 'K';
    const b = board();
    outer:
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      if (b[r][c] === loserLetter && state.pieces[r][c]) {
        const king = state.pieces[r][c];
        state.pieces[r][c] = null;
        _topple(king, outcome === 'win' ? -1 : 1);
        break outer;
      }
    }
    NS.CameraRig.pulse(0.12);
  }

  // ── Input ────────────────────────────────────────────────────────────
  const _ray = new THREE.Raycaster();
  const _ndc = new THREE.Vector2();
  let _inputBound = false;

  function _bindInput() {
    if (_inputBound) return;
    _inputBound = true;
    NS.canvas.addEventListener('click', e => {
      if (!state.active || !NS.active) return;
      if (NS.CameraRig.consumedDrag()) return;
      if (NS.Character.overlayOpen()) return;
      if (!myTurn() || state.animating > 0) return;
      const sq = _squareAt(e.clientX, e.clientY);
      if (!sq) { _select(null); return; }
      // Clicking a legal target executes through the real engine path.
      if (state.selected) {
        const hit = state.legal.find(m => m[0] === sq.r && m[1] === sq.c);
        if (hit) {
          const { r, c } = state.selected;
          _select(null);
          try { window.executeMove(r, c, sq.r, sq.c, hit[2]); }
          catch (err) { console.warn('[Story3D] executeMove failed', err); resyncFromBoard(); }
          return;
        }
      }
      const b = board();
      const letter = b && b[sq.r][sq.c];
      if (letter && A().pieceColor(letter) === 'white') _select(sq);
      else _select(null);
    });
  }

  function _squareAt(cx, cy) {
    if (!state.boardTop) return null;
    _ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    _ray.setFromCamera(_ndc, NS.CameraRig.camera);
    const hits = _ray.intersectObject(state.boardTop, false);
    if (!hits.length) return null;
    const local = state.boardGroup.worldToLocal(hits[0].point.clone());
    return A().worldToSquare(local.x, local.z, sq);
  }

  function _select(sq) {
    state.selected = sq;
    state.legal = [];
    _clearHighlights();
    if (!sq) return;
    try { state.legal = window.getLegalMoves(sq.r, sq.c) || []; }
    catch (e) { state.legal = []; }
    _showHighlights(sq, state.legal);
  }

  function _clearHighlights() {
    if (state.highlights) [...state.highlights.children].forEach(h => state.highlights.remove(h));
  }

  function _showHighlights(sel, legal) {
    const ringG = NS.Props.geo(`hl-ring|${sq}`, () => new THREE.RingGeometry(sq * 0.34, sq * 0.46, 24));
    const dotG = NS.Props.geo(`hl-dot|${sq}`, () => new THREE.CircleGeometry(sq * 0.16, 18));
    const selM = NS.Materials.glow('#ffcc00', 1);
    const dotM = NS.Materials.glow('#ffe680', 0.85);
    const capM = NS.Materials.glow('#ff7040', 0.95);
    const place = (geo, mat, r, c) => {
      const m = new THREE.Mesh(geo, mat);
      const w = A().squareToWorld(r, c, sq);
      m.rotation.x = -Math.PI / 2;
      m.position.set(w.x, 0, w.z);
      m.castShadow = false;
      state.highlights.add(m);
    };
    place(ringG, selM, sel.r, sel.c);
    const b = board();
    legal.forEach(([r, c, flag]) => {
      const isCapture = (b && b[r][c]) || flag === 'ep';
      place(isCapture ? ringG : dotG, isCapture ? capM : dotM, r, c);
    });
  }

  function _tick(dt, t) {
    state.animators.forEach(fn => fn(t, dt));
    if (state.checkLight) state.checkLight.intensity = 1.2 + 0.6 * Math.sin(t * 7);
  }

  /** Test/debug helper: returns the mirrored piece letter at a square. */
  function getPieceAt(uciSquare) {
    const files = 'abcdefgh', ranks = '87654321';
    const c = files.indexOf(uciSquare[0]), r = ranks.indexOf(uciSquare[1]);
    if (r < 0 || c < 0) return null;
    return state.model[r] ? state.model[r][c] : null;
  }

  /** Re-dress the board after a piece-armor equip change mid-match. */
  function resyncPieceArmor() {
    if (state.active && state.animating === 0) rebuildFromBoard();
  }

  return {
    begin, end, rebuildFromBoard, resyncFromBoard, onGameEnd, getPieceAt,
    resyncPieceArmor,
    animateMove,
    SQ_TABLE, _state: state,
  };
});
