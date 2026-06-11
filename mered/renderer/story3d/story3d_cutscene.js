/**
 * story3d_cutscene.js — plays STORY_CUTSCENES entries on the 3D stage.
 *
 * The step data is interpreted verbatim (grammar + timings mirrored from
 * _csProcessStep, chess_ui.html L20630–20714, via Adapter.normalizeStep).
 * Characters are 3D figures placed on the environment's stage rectangle;
 * say/choose reuse the existing #cs-dialogue DOM inside #bg-overlay, which
 * opens transparent in 3D mode (DECISIONS.md D5). lore calls the real
 * showLoreParchment and replicates the loreUnlocked side-effect.
 * The camera frames each beat from behind the player character.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(null, null);
  else { root.Story3D.Cutscene = factory(root.THREE, root.Story3D); }
})(typeof self !== 'undefined' ? self : this, function (THREE, NS) {
  'use strict';
  if (!THREE) return {};

  const A = () => NS.Adapter;

  const state = {
    running: false,
    cs: null,
    env: null,
    steps: [],
    idx: 0,
    actors: {},        // id → { figure, nx, ny, fadable } (stage coords kept for swapbg)
    onDone: null,
    untick: null,
    animators: [],
    typeTimer: 0,
  };

  function _cutscenes() { return (typeof STORY_CUTSCENES !== 'undefined') ? STORY_CUTSCENES : window.STORY_CUTSCENES; }
  function _progress() { return (typeof storyProgress !== 'undefined') ? storyProgress : window.storyProgress; }

  function run(id, onDone) {
    const cs = _cutscenes()[id];
    if (!cs) { onDone?.(); return; }
    NS.init();
    stop(false);
    NS.Hub.hide?.();
    NS.Match.end?.();
    NS.clearScene();
    NS.mode = 'cutscene';

    state.running = true;
    state.cs = cs;
    state.steps = cs.steps.map(s => A().normalizeStep(s));
    state.idx = 0;
    state.actors = {};
    state.onDone = onDone || null;
    state.animators = [];
    state.mood = (NS.Content && NS.Content.endingMood(id)) || null;

    _setEnv(cs.bg);
    if (state.mood) _applyMood(state.mood);
    _openDialogueShell();
    state.untick = NS.onTick((dt, t) => state.animators.forEach(fn => fn(t, dt)));
    _establishingShot();
    setTimeout(_next, 350);
  }

  /** Ending-specific staging: each ending owns a distinct light/sky arc.
   *  kill — blood-red rim light, the fog closes in, the world goes dark.
   *  spare — dawn rises over the clearing while he rides east. */
  function _applyMood(mood) {
    if (mood.light) {
      const l = new THREE.PointLight(mood.light.color, mood.light.intensity, 26, 2);
      l.position.set(0, 4.5, 2);
      NS.scene.add(l);
    }
    const fogFrom = NS.scene.fog ? NS.scene.fog.color.clone() : null;
    const skyFrom = NS.scene.background ? NS.scene.background.clone() : null;
    const fogTo = new THREE.Color(mood.fogTo);
    const skyTo = new THREE.Color(mood.skyTo);
    const t0 = { v: 0 };
    NS.tween(mood.fadeFogMs || 9000, k => {
      t0.v = k;
      if (NS.scene.fog && fogFrom) NS.scene.fog.color.lerpColors(fogFrom, fogTo, k);
      if (NS.scene.background && skyFrom) NS.scene.background.lerpColors(skyFrom, skyTo, k);
    });
    if (mood.dawn) {
      // the first light over the treeline, swelling slowly
      const sun = new THREE.Sprite(new THREE.SpriteMaterial({
        map: NS.Textures.glowSprite('#ffc070'), transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0,
      }));
      sun.position.set(14, 1.2, -6);
      NS.scene.add(sun);
      state.animators.push((t, dt) => {
        sun.scale.setScalar(7 + 5 * t0.v);
        sun.position.y = 1.2 + 3.2 * t0.v;
        sun.material.opacity = 0.55 * t0.v;
      });
      const dawnLight = new THREE.DirectionalLight(0xffb46a, 0.01);
      dawnLight.position.set(14, 4, -6);
      NS.scene.add(dawnLight);
      state.animators.push(() => { dawnLight.intensity = 0.65 * t0.v; });
    }
  }

  function _setEnv(bgId) {
    if (state.env) { NS.disposeGroup(state.env.group); }
    const env = NS.Environments.build(bgId);
    state.env = env;
    NS.scene.add(env.group);
    NS.scene.fog = env.fog || null;
    NS.scene.background = env.sky || null;
    state.animators = env.animators.slice();
    // Re-place any existing actors onto the new stage (swapbg)
    Object.values(state.actors).forEach(a => {
      const w = A().stageToWorld(a.nx, a.ny, env.stage);
      a.figure.position.set(w.x, 0, w.z);
      NS.scene.add(a.figure);
    });
  }

  // ── Dialogue shell (existing DOM, transparent overlay) ───────────────
  function _openDialogueShell() {
    const overlay = document.getElementById('bg-overlay');
    if (!overlay) return;
    overlay.classList.add('open', 'story3d-transparent');
    overlay.style.opacity = 1;
    const dlg = document.getElementById('cs-dialogue');
    if (dlg) dlg.classList.remove('open');
  }
  function _closeDialogueShell() {
    const overlay = document.getElementById('bg-overlay');
    if (!overlay) return;
    overlay.classList.remove('open', 'story3d-transparent');
    const dlg = document.getElementById('cs-dialogue');
    if (dlg) dlg.classList.remove('open');
    document.getElementById('bg-lore-parchment')?.classList.remove('open');
  }

  // ── Actors ───────────────────────────────────────────────────────────
  function _actor(id) { return state.actors[id] || null; }

  function _placeActor(id, nx, ny) {
    let a = state.actors[id];
    if (!a) {
      const figure = NS.Figures.buildById(id);
      NS.scene.add(figure);
      figure.traverse(o => { if (o.userData.animators) state.animators.push(...o.userData.animators); });
      a = state.actors[id] = { figure, nx, ny };
    }
    a.nx = nx; a.ny = ny;
    const w = A().stageToWorld(nx, ny, state.env.stage);
    a.figure.position.set(w.x, 0, w.z);
    _faceCentre(a);
    return a;
  }

  function _faceCentre(a) {
    // Actors loosely face each other across the stage centre.
    const cx = state.env.stage.center[0];
    const dir = Math.atan2(cx - a.figure.position.x, state.env.stage.center[2] + 2 - a.figure.position.z);
    a.figure.rotation.y = dir;
    a.figure.userData.heading = dir;
  }

  /** Clone materials so this figure can fade without touching shared mats. */
  function _makeFadable(a) {
    if (a.fadable) return;
    a.fadable = true;
    a.figure.traverse(o => {
      if (o.material) {
        const clone = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
        (Array.isArray(clone) ? clone : [clone]).forEach(m => {
          m.transparent = true;
          if (m.userData) m.userData.story3dShared = false; // dispose with group
        });
        o.material = clone;
      }
    });
  }
  function _setOpacity(a, v) {
    a.figure.traverse(o => {
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.opacity = v; });
    });
    a.figure.visible = v > 0.01;
  }

  // ── Camera ───────────────────────────────────────────────────────────
  function _establishingShot() {
    const st = state.env.stage;
    const pos = {
      x: st.center[0] + st.forward[0] * st.depth * 1.9,
      y: 2.4,
      z: st.center[2] + st.forward[2] * st.depth * 1.9,
    };
    NS.CameraRig.jumpTo(pos, { x: st.center[0], y: 1.2, z: st.center[2] });
  }

  /** Frame the beat from behind the player figure ("camera follows behind
   *  the character"); falls back to a gentle group shot. */
  function _frameBeat(ms) {
    const ids = Object.keys(state.actors).filter(id => state.actors[id].figure.visible);
    if (!ids.length) return;
    const player = _actor('player');
    const others = ids.filter(id => id !== 'player').map(id => state.actors[id].figure.position);
    if (player && others.length) {
      const mid = others.reduce((acc, p) => acc.add(p.clone()), new THREE.Vector3()).multiplyScalar(1 / others.length);
      mid.y = 1.35;
      const pp = player.figure.position;
      const back = new THREE.Vector3(pp.x - mid.x, 0, pp.z - mid.z).normalize();
      const pos = {
        x: pp.x + back.x * 2.6 + back.z * 0.9, // behind + slightly over the shoulder
        y: 2.1,
        z: pp.z + back.z * 2.6 - back.x * 0.9,
      };
      NS.CameraRig.flyTo(pos, mid, ms ?? 1100);
    } else {
      const pts = ids.map(id => state.actors[id].figure.position);
      NS.CameraRig.frameActors(pts, { ms: ms ?? 1100 });
    }
  }

  // ── Step machine (timings mirror _csProcessStep) ─────────────────────
  function _next() {
    if (!state.running) return;
    if (state.idx >= state.steps.length) { _end(); return; }
    const step = state.steps[state.idx++];
    const dlg = document.getElementById('cs-dialogue');
    const sp = document.getElementById('cs-speaker');
    const txt = document.getElementById('cs-text');
    const choices = document.getElementById('cs-choices');
    const nextBtn = document.getElementById('cs-next');
    if (choices) { choices.innerHTML = ''; choices.style.display = 'none'; }

    switch (step.type) {
      case 'place': {
        _placeActor(step.id, step.x, step.y);
        _frameBeat(900);
        _next();
        return;
      }
      case 'move': {
        const a = _actor(step.id);
        if (a) {
          a.nx = step.x; a.ny = step.y;
          const to = A().stageToWorld(step.x, step.y, state.env.stage);
          const from = a.figure.position.clone();
          a.figure.userData.setWalking?.(true);
          const dir = Math.atan2(to.x - from.x, to.z - from.z);
          a.figure.rotation.y = dir;
          NS.tween(step.waitMs, k => {
            a.figure.position.x = from.x + (to.x - from.x) * k;
            a.figure.position.z = from.z + (to.z - from.z) * k;
          }, () => a.figure.userData.setWalking?.(false));
        }
        setTimeout(_next, step.waitMs);
        return;
      }
      case 'shift': {
        const a = _actor(step.id);
        if (a) {
          a.nx += step.dx; a.ny += step.dy;
          const to = A().stageToWorld(a.nx, a.ny, state.env.stage);
          const from = a.figure.position.clone();
          NS.tween(280, k => {
            a.figure.position.x = from.x + (to.x - from.x) * k;
            a.figure.position.z = from.z + (to.z - from.z) * k;
          });
        }
        setTimeout(_next, step.waitMs);
        return;
      }
      case 'drop': {
        const a = _actor(step.id);
        if (a) {
          const fig = a.figure;
          if (state.mood && state.mood.collapse) {
            // ending_kill: not a slump — a full collapse to the ground
            NS.tween(900, k => {
              fig.rotation.x = 1.45 * k;
              fig.position.y = -0.12 * k;
              fig.scale.y = fig.scale.x * (1 - 0.08 * k);
            });
            NS.CameraRig.pulse(0.06);
          } else {
            NS.tween(200, k => {
              fig.scale.y = fig.scale.x * (1 - 0.12 * k);
              fig.rotation.x = 0.18 * k;
            });
          }
        }
        setTimeout(_next, step.waitMs + (state.mood && state.mood.collapse ? 700 : 0));
        return;
      }
      case 'fade': {
        const a = _actor(step.id);
        if (a) {
          _makeFadable(a);
          const from = a.figure.visible ? 1 : 0;
          NS.tween(step.waitMs, k => _setOpacity(a, from + (step.to - from) * k));
          // ending_kill: as he fades, the camera closes slowly on the king
          if (state.mood && state.mood.pushIn) {
            const player = _actor('player');
            if (player) {
              const pp = player.figure.position;
              NS.CameraRig.flyTo(
                { x: pp.x + 1.4, y: 1.7, z: pp.z + 2.2 },
                { x: pp.x, y: 1.4, z: pp.z },
                step.waitMs + 1200
              );
            }
          }
        }
        setTimeout(_next, step.waitMs);
        return;
      }
      case 'swapbg': {
        _setEnv(step.bg);
        _establishingShot();
        _frameBeat(700);
        setTimeout(_next, step.waitMs + 320);
        return;
      }
      case 'lore': {
        try {
          window.showLoreParchment?.(step.lore.title, step.lore.body);
          const prog = _progress();
          // Mirror of the unlock side-effect at chess_ui.html L20678–20681.
          if (step.lore.id && prog?.loreUnlocked && !prog.loreUnlocked.includes(step.lore.id)) {
            prog.loreUnlocked.push(step.lore.id);
            (typeof debouncedSave === 'function' ? debouncedSave : window.debouncedSave)?.();
          }
        } catch (e) { console.warn('[Story3D lore]', e); }
        setTimeout(_next, step.waitMs);
        return;
      }
      case 'choose': {
        if (!dlg) { _next(); return; }
        dlg.classList.add('open');
        sp.textContent = '—'; txt.textContent = '';
        nextBtn.style.display = 'none';
        choices.style.display = 'flex';
        step.choices.forEach(c => {
          const b = document.createElement('button');
          b.textContent = c.text;
          b.onclick = () => {
            try { c.effect?.(); } catch (e) { console.warn('[Story3D cs choice]', e); }
            choices.innerHTML = ''; choices.style.display = 'none';
            nextBtn.style.display = '';
            _next();
          };
          choices.appendChild(b);
        });
        return;
      }
      case 'say': {
        if (!dlg) { setTimeout(_next, 800); return; }
        dlg.classList.add('open');
        sp.textContent = step.speaker;
        txt.textContent = '';
        nextBtn.style.display = 'none';
        const full = step.text;
        let i = 0;
        clearTimeout(state.typeTimer);
        const tick = () => {
          if (!state.running) return;
          if (i >= full.length) {
            nextBtn.style.display = '';
            nextBtn.onclick = () => { _next(); };
            return;
          }
          txt.textContent += full[i++];
          state.typeTimer = setTimeout(tick, 20); // 2D typewriter cadence
        };
        tick();
        return;
      }
      default:
        _next();
    }
  }

  function _end() {
    const cb = state.onDone;
    stop(true);
    cb?.();
  }

  /** Stop and clean DOM; the set stays visible as the backdrop until the
   *  next stage clears the scene. */
  function stop(reached) {
    state.running = false;
    clearTimeout(state.typeTimer);
    if (state.untick) { state.untick(); state.untick = null; }
    _closeDialogueShell();
    state.cs = null;
    state.onDone = null;
  }

  return { run, stop, _state: state };
});
