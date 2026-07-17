/**
 * story3d_menu.js — the main menu as a living 3D scene.
 *
 * Replaces the menu's flat 2D canvas backdrop: the great hall rendered live
 * behind the existing menu cards/logo (which stay HTML), with the board set
 * for a game, the uncrowned prince waiting at the table, and a slow orbiting
 * camera. While the menu owns the screen the 3D canvas drops BELOW the menu
 * DOM (z 170 < menu 180) and ignores the pointer so the cards stay clickable.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(null, null);
  else { root.Story3D.Menu = factory(root.THREE, root.Story3D); }
})(typeof self !== 'undefined' ? self : this, function (THREE, NS) {
  'use strict';
  if (!THREE) return {};

  const state = { active: false, untick: null, animators: [], theta: 0 };

  function show() {
    if (state.active) return;
    NS.init();
    NS.Hub?.hide();
    NS.Match?.end();
    NS.Cutscene?.stop();
    NS.clearScene();
    NS.mode = 'menu';

    const env = NS.Environments.build('palace_great_hall');
    NS.scene.add(env.group);
    NS.applyAtmosphere(env);
    state.animators = env.animators.slice();

    // The board waits mid-hall, pieces set, one seat taken.
    const table = NS.Props.boardTable({ style: 'stone', topSize: 2.6 });
    table.position.set(0, 0, 1.5);
    NS.scene.add(table);
    const topY = table.userData.topY;
    const top = new THREE.Mesh(
      NS.Props.geo('boardtop', () => new THREE.PlaneGeometry(2.08, 2.08)),
      NS.Materials.boardTop()
    );
    top.rotation.x = -Math.PI / 2;
    top.position.set(0, topY + 0.01, 1.5);
    top.receiveShadow = true;
    NS.scene.add(top);
    // a scattering of pieces, mid-game
    [['K', 7, 4], ['Q', 5, 3], ['P', 4, 4], ['N', 5, 5], ['k', 0, 4], ['r', 2, 2], ['p', 3, 4], ['b', 1, 5]].forEach(([l, r, c]) => {
      const w = NS.Adapter.squareToWorld(r, c, 0.26);
      const p = NS.Pieces.build(NS.Adapter.pieceType(l), NS.Adapter.pieceColor(l));
      p.scale.setScalar(0.39);
      p.position.set(w.x, topY + 0.01, 1.5 + w.z);
      NS.scene.add(p);
    });
    // The prince, considering the board (crown rule applies on real saves).
    const prince = NS.Figures.buildById('player', { scale: 1 / (NS.Figures.defFor('player').scale || 1) });
    prince.position.set(0.9, 0, 3.4);
    prince.rotation.y = Math.PI + 0.5;
    NS.scene.add(prince);
    prince.traverse(o => { if (o.userData.animators) state.animators.push(...o.userData.animators); });

    // Low cinematic dolly: glide through the column line at shoulder
    // height so pillars, torches, and banners sweep past in parallax —
    // unmistakably a living set, not a painting.
    state.theta = 0;
    state.untick = NS.onTick((dt, t) => {
      state.animators.forEach(fn => fn(t, dt));
      state.theta += dt * 0.13;
      const r = 6.4 + 0.9 * Math.sin(t * 0.11);
      const cam = NS.CameraRig.init();
      cam.position.set(
        Math.sin(state.theta) * r,
        2.0 + 0.35 * Math.sin(t * 0.17),
        0.8 + Math.cos(state.theta) * r
      );
      cam.lookAt(0.6 * Math.sin(t * 0.05), 1.35, -2.5); // toward the throne
    });

    // Canvas under the menu DOM, pointer to the cards.
    NS.start();
    NS.canvas.style.zIndex = '170';
    NS.canvas.style.pointerEvents = 'none';
    document.body.classList.add('story3d-menu');
    state.active = true;
  }

  function hide() {
    if (!state.active) return;
    state.active = false;
    if (state.untick) { state.untick(); state.untick = null; }
    state.animators = [];
    document.body.classList.remove('story3d-menu');
    NS.canvas.style.zIndex = '240';
    NS.clearScene();
    NS.mode = null;
    // Whoever takes over (hub/match/2D mode) decides whether NS stays active.
  }

  return { show, hide, _state: state };
});
