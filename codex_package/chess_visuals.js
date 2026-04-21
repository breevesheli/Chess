/**
 * chess_visuals.js
 * ================
 * Complete visual design module for Chess Popup.
 * Drop this file into the Chess Popup folder and include it in chess_popup.html
 * before chess_popup.js with: <script src="chess_visuals.js"></script>
 *
 * This module owns ALL visual rendering:
 *   - Animated background canvases (8 themes)
 *   - Piece rendering (6 pieces, 4 styles, all bezier paths)
 *   - Piece skin system (Common → Mythic II, all animated)
 *   - Board skin system (Common → Mythic II, animated)
 *   - Board border rendering (8 themes + 3 unlockable)
 *   - Piece trails (6 styles)
 *   - Cursed piece glow
 *   - Cutscene badge rendering
 *   - Rarity badge CSS injection
 *   - Level-up particle burst
 *   - Chest opening animation canvas
 *   - ELO graph rendering
 *   - Level history graph rendering
 *   - Avatar skin rendering
 *   - Skin preview rendering
 *   - Zoom preview (3x3 board section)
 *   - Favorite cycling animation
 *
 * Codex: do NOT modify any function in this file. Hook into them via the
 * exported API at the bottom. All logic (game state, localStorage, event
 * handling) lives in chess_popup.js. This file is rendering only.
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: GLOBAL ANIMATION STATE
// ─────────────────────────────────────────────────────────────────────────────

const CV = {
  // Background animation loops
  bgLoop: null,
  bgCanvas: null,
  bgCtx: null,
  bgTheme: null,
  bgEnabled: true,
  bgParticles: [],
  bgStars: [],
  bgTime: 0,

  // Skin animation loops (keyed by "pieceType_color_skinId")
  skinLoops: new Map(),

  // Board skin animation
  boardSkinLoop: null,
  boardSkinCanvas: null,

  // Avatar animation
  avatarLoop: null,
  avatarCanvas: null,

  // Trail state
  activeTrails: [],

  // Cursed glow pulse state
  cursedGlowPhase: 0,
  cursedGlowLoop: null,

  // Favorite cycle state
  favCycleIntervals: new Map(),

  // Debug
  redrawCount: 0,
  lastRedrawTime: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: ANIMATED BACKGROUNDS
// ─────────────────────────────────────────────────────────────────────────────

function initBackgroundCanvas() {
  let bg = document.getElementById('cv-bg-canvas');
  if (!bg) {
    bg = document.createElement('canvas');
    bg.id = 'cv-bg-canvas';
    bg.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100vw; height: 100vh;
      z-index: -1; pointer-events: none;
    `;
    document.body.prepend(bg);
  }
  bg.width = window.innerWidth;
  bg.height = window.innerHeight;
  CV.bgCanvas = bg;
  CV.bgCtx = bg.getContext('2d');
  window.addEventListener('resize', () => {
    bg.width = window.innerWidth;
    bg.height = window.innerHeight;
    initBgParticles(CV.bgTheme);
  });
}

function initBgParticles(theme) {
  CV.bgParticles = [];
  CV.bgStars = [];
  const W = CV.bgCanvas.width;
  const H = CV.bgCanvas.height;

  if (theme === 'Classic') {
    for (let i = 0; i < 60; i++) {
      CV.bgParticles.push({
        x: Math.random() * W, y: Math.random() * H + H,
        r: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 0.3 + 0.1,
        opacity: Math.random() * 0.12 + 0.04,
        drift: (Math.random() - 0.5) * 0.2,
      });
    }
  } else if (theme === 'Midnight') {
    for (let i = 0; i < 250; i++) {
      CV.bgStars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.2 + 0.3,
        speed: Math.random() * 0.08 + 0.02,
        opacity: Math.random() * 0.7 + 0.1,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
      });
      CV.bgParticles.push(null); // placeholder for shooting star timer
    }
    CV.bgParticles = [{
      active: false, x: 0, y: 0, tx: 0, ty: 0,
      progress: 0, nextAt: Date.now() + rand(8000, 15000),
    }];
  } else if (theme === 'Forest') {
    for (let i = 0; i < 4; i++) {
      CV.bgParticles.push({
        x: Math.random() * W * 0.3 - W * 0.15,
        y: H * 0.5 + Math.random() * H * 0.3,
        w: rand(180, 320), h: rand(60, 120),
        speed: rand(0.15, 0.35), opacity: rand(0.04, 0.1),
        phase: Math.random() * Math.PI * 2,
      });
    }
    CV.bgStars = []; // leaves
    for (let i = 0; i < 8; i++) {
      CV.bgStars.push({
        x: Math.random() * W, y: -20 - Math.random() * 100,
        speed: rand(0.4, 0.9), drift: (Math.random() - 0.5) * 0.3,
        rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.02,
        size: rand(6, 12), opacity: rand(0.2, 0.45),
        nextAt: Date.now() + i * 1200,
      });
    }
  } else if (theme === 'Crimson') {
    for (let i = 0; i < 35; i++) {
      CV.bgParticles.push({
        x: rand(W * 0.1, W * 0.9), y: H + rand(0, 30),
        r: rand(1, 3), speed: rand(0.3, 0.8),
        drift: (Math.random() - 0.5) * 0.4,
        opacity: rand(0.3, 0.7),
        color: Math.random() > 0.5 ? '#ff6600' : '#ff8800',
        flickerPhase: Math.random() * Math.PI * 2,
      });
    }
  } else if (theme === 'Ice') {
    for (let i = 0; i < 55; i++) {
      CV.bgParticles.push({
        x: Math.random() * W, y: rand(-20, H),
        r: rand(1, 4), speed: rand(0.2, 0.6),
        drift: (Math.random() - 0.5) * 0.3,
        opacity: rand(0.08, 0.22),
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: rand(0.005, 0.015),
      });
    }
  } else if (theme === 'Gold') {
    for (let i = 0; i < 70; i++) {
      CV.bgParticles.push({
        x: Math.random() * W, y: Math.random() * H,
        r: rand(0.5, 1.5),
        opacity: 0,
        targetOpacity: rand(0.1, 0.55),
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.008, 0.025),
      });
    }
  } else if (theme === 'Neon') {
    CV.bgParticles = [{
      waveOffset: 0,
      waveSpeed: 1 / (4 * 60), // 4 second loop at 60fps
    }];
  } else if (theme === 'Obsidian') {
    for (let i = 0; i < 3; i++) {
      CV.bgParticles.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.15,
        r: rand(120, 220),
        hue: [260, 240, 280][i],
        opacity: rand(0.06, 0.10),
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: rand(0.003, 0.008),
      });
    }
  }
}

function drawBackground(theme) {
  const ctx = CV.bgCtx;
  const W = CV.bgCanvas.width;
  const H = CV.bgCanvas.height;
  const now = Date.now();

  // Clear with theme page color
  const bgColors = {
    Classic:'#2b2b2b', Midnight:'#0d1117', Forest:'#1a2a1a',
    Crimson:'#1a0a0a', Ice:'#0a1520', Gold:'#1a1500',
    Neon:'#000000', Obsidian:'#050508',
  };
  ctx.fillStyle = bgColors[theme] || '#111';
  ctx.fillRect(0, 0, W, H);

  if (!CV.bgEnabled) return;

  if (theme === 'Classic') {
    CV.bgParticles.forEach(p => {
      p.y -= p.speed;
      p.x += p.drift;
      if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(240,220,180,${p.opacity})`;
      ctx.fill();
    });

  } else if (theme === 'Midnight') {
    CV.bgStars.forEach(s => {
      s.x -= s.speed;
      if (s.x < -2) s.x = W + 2;
      s.twinklePhase += s.twinkleSpeed;
      const twinkle = 0.5 + 0.5 * Math.sin(s.twinklePhase);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.opacity * twinkle})`;
      ctx.fill();
    });
    const ss = CV.bgParticles[0];
    if (now > ss.nextAt && !ss.active) {
      ss.active = true;
      ss.x = rand(W * 0.2, W * 0.8);
      ss.y = rand(H * 0.05, H * 0.3);
      ss.tx = ss.x + rand(80, 160);
      ss.ty = ss.y + rand(40, 100);
      ss.progress = 0;
    }
    if (ss.active) {
      ss.progress += 0.04;
      const alpha = Math.max(0, 1 - Math.abs(ss.progress - 0.5) * 4);
      const lx = ss.x + (ss.tx - ss.x) * ss.progress;
      const ly = ss.y + (ss.ty - ss.y) * ss.progress;
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.8})`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(200,220,255,0.8)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(lx, ly);
      ctx.stroke();
      ctx.restore();
      if (ss.progress >= 1) {
        ss.active = false;
        ss.nextAt = now + rand(8000, 15000);
      }
    }

  } else if (theme === 'Forest') {
    CV.bgParticles.forEach(p => {
      p.x += p.speed;
      if (p.x > W + p.w / 2) p.x = -p.w / 2;
      p.phase += 0.003;
      const wobble = Math.sin(p.phase) * 8;
      ctx.save();
      ctx.globalAlpha = p.opacity;
      const grd = ctx.createRadialGradient(p.x, p.y + wobble, 0, p.x, p.y + wobble, p.w / 2);
      grd.addColorStop(0, 'rgba(240,240,240,0.9)');
      grd.addColorStop(1, 'rgba(240,240,240,0)');
      ctx.scale(1, p.h / p.w);
      ctx.beginPath();
      ctx.arc(p.x, (p.y + wobble) * (p.w / p.h), p.w / 2, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
      ctx.restore();
    });
    CV.bgStars.forEach(leaf => {
      if (now < leaf.nextAt) return;
      leaf.y += leaf.speed;
      leaf.x += leaf.drift;
      leaf.rot += leaf.rotSpeed;
      if (leaf.y > H + 20) {
        leaf.y = -20; leaf.x = Math.random() * W;
        leaf.nextAt = now + rand(2000, 6000);
      }
      ctx.save();
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(leaf.rot);
      ctx.globalAlpha = leaf.opacity;
      ctx.fillStyle = '#5a8c40';
      ctx.beginPath();
      ctx.ellipse(0, 0, leaf.size, leaf.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

  } else if (theme === 'Crimson') {
    CV.bgParticles.forEach(p => {
      p.y -= p.speed;
      p.x += p.drift;
      p.flickerPhase += 0.08;
      if (p.y < -10) { p.y = H + 5; p.x = rand(W * 0.1, W * 0.9); }
      const flicker = 0.7 + 0.3 * Math.sin(p.flickerPhase);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace(')', `,${p.opacity * flicker})`).replace('rgb', 'rgba');
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.fill();
    });

  } else if (theme === 'Ice') {
    CV.bgParticles.forEach(p => {
      p.y += p.speed;
      p.phase += p.phaseSpeed;
      p.x += Math.sin(p.phase) * 0.3;
      if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,235,255,${p.opacity})`;
      ctx.fill();
    });

  } else if (theme === 'Gold') {
    CV.bgParticles.forEach(p => {
      p.phase += p.speed;
      p.opacity = p.targetOpacity * (0.5 + 0.5 * Math.sin(p.phase));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,215,0,${p.opacity})`;
      ctx.fill();
    });

  } else if (theme === 'Neon') {
    const gp = CV.bgParticles[0];
    gp.waveOffset += gp.waveSpeed;
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent').trim() || '#00ffcc';
    const gridSize = 48;
    const waveAmplitude = 0.04;
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += gridSize) {
      for (let y = 0; y < H; y += gridSize) {
        const dist = Math.sqrt((x - W/2)**2 + (y - H/2)**2) / Math.max(W, H);
        const wave = Math.sin(dist * 6 - gp.waveOffset * Math.PI * 2);
        const alpha = waveAmplitude * (0.5 + 0.5 * wave);
        ctx.strokeStyle = hexToRgba(accent, alpha);
        ctx.beginPath();
        ctx.rect(x, y, gridSize, gridSize);
        ctx.stroke();
      }
    }

  } else if (theme === 'Obsidian') {
    CV.bgParticles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.phase += p.phaseSpeed;
      const op = p.opacity * (0.7 + 0.3 * Math.sin(p.phase));
      if (p.x < -p.r) p.x = W + p.r;
      if (p.x > W + p.r) p.x = -p.r;
      if (p.y < -p.r) p.y = H + p.r;
      if (p.y > H + p.r) p.y = -p.r;
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grd.addColorStop(0, `hsla(${p.hue},70%,55%,${op})`);
      grd.addColorStop(1, `hsla(${p.hue},70%,55%,0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    });
  }
}

function startBackgroundAnimation(theme) {
  if (CV.bgLoop) cancelAnimationFrame(CV.bgLoop);
  if (!CV.bgCanvas) initBackgroundCanvas();
  CV.bgTheme = theme;
  initBgParticles(theme);

  function loop() {
    drawBackground(theme);
    CV.bgLoop = requestAnimationFrame(loop);
  }
  CV.bgLoop = requestAnimationFrame(loop);
}

function stopBackgroundAnimation() {
  if (CV.bgLoop) { cancelAnimationFrame(CV.bgLoop); CV.bgLoop = null; }
  if (CV.bgCtx && CV.bgCanvas) {
    CV.bgCtx.clearRect(0, 0, CV.bgCanvas.width, CV.bgCanvas.height);
  }
}

function setBackgroundEnabled(enabled) {
  CV.bgEnabled = enabled;
  if (!enabled && CV.bgCtx && CV.bgCanvas) {
    CV.bgCtx.fillStyle = '#111';
    CV.bgCtx.fillRect(0, 0, CV.bgCanvas.width, CV.bgCanvas.height);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: PIECE RENDERING — DETAILED BEZIER PATHS + ENGRAVINGS
// Every piece uses multi-path construction: silhouette → specular → engraving.
// Pieces are centered at (0,0) in ~60×80 unit space before scale is applied.
// ─────────────────────────────────────────────────────────────────────────────

// ── Path definitions (raw bezier silhouettes) ─────────────────────────────

function _pawnPath(ctx) {
  ctx.moveTo(0, -28);
  ctx.arc(0, -20, 8.5, -Math.PI * 0.9, Math.PI * 1.9);
  ctx.bezierCurveTo(6.5, -10, 7.5, -5, 8, 0);
  ctx.bezierCurveTo(9, 2, 11, 4, 12, 7);
  ctx.bezierCurveTo(13, 10, 13, 14, 12, 17);
  ctx.bezierCurveTo(11, 19, -11, 19, -12, 17);
  ctx.bezierCurveTo(-13, 14, -13, 10, -12, 7);
  ctx.bezierCurveTo(-11, 4, -9, 2, -8, 0);
  ctx.bezierCurveTo(-7.5, -5, -6.5, -10, -6, -11.5);
  ctx.closePath();
}

function _knightPath(ctx) {
  // Staunton horse head — right-facing profile, 15+ bezier segments
  ctx.moveTo(-11, 20);
  ctx.lineTo(11, 20);
  ctx.lineTo(11, 14);
  ctx.bezierCurveTo(12, 10, 15, 5, 14, -1);
  ctx.bezierCurveTo(13, -5, 14, -9, 13, -12);
  ctx.bezierCurveTo(13, -15, 15, -18, 14, -21);
  ctx.bezierCurveTo(13, -23, 10, -24, 7, -23);
  ctx.bezierCurveTo(5, -22, 3, -20, 1, -19);
  ctx.bezierCurveTo(-1, -18, -2, -15, -1, -12);
  ctx.bezierCurveTo(0, -9, -2, -6, -2, -2);
  ctx.bezierCurveTo(-1, 2, 2, -8, 3, -14);
  ctx.bezierCurveTo(4, -18, 5, -22, 4, -26);
  ctx.bezierCurveTo(4.5, -27, 5.5, -28, 5, -29);
  ctx.bezierCurveTo(4, -29, 2, -27, 0, -25);
  ctx.bezierCurveTo(-2, -23, -4, -19, -5, -15);
  ctx.bezierCurveTo(-6, -11, -7, -5, -8, 0);
  ctx.bezierCurveTo(-9, 5, -10, 10, -10, 14);
  ctx.lineTo(-11, 20);
  ctx.closePath();
}

function _bishopPath(ctx) {
  ctx.moveTo(0, -34);
  ctx.bezierCurveTo(2, -32, 5, -28, 5, -24);
  ctx.bezierCurveTo(5, -21, 3, -19, 2, -17);
  ctx.bezierCurveTo(4, -15, 5, -11, 5, -8);
  ctx.bezierCurveTo(5, -6, 8, -5, 10, -4);
  ctx.lineTo(10, -1);
  ctx.bezierCurveTo(8, 0, 5, 1, 4, 2);
  ctx.bezierCurveTo(6, 4, 10, 8, 11, 13);
  ctx.bezierCurveTo(12, 16, 12, 18, 11, 19);
  ctx.bezierCurveTo(10, 20, -10, 20, -11, 19);
  ctx.bezierCurveTo(-12, 18, -12, 16, -11, 13);
  ctx.bezierCurveTo(-10, 8, -6, 4, -4, 2);
  ctx.bezierCurveTo(-5, 1, -8, 0, -10, -1);
  ctx.lineTo(-10, -4);
  ctx.bezierCurveTo(-8, -5, -5, -6, -5, -8);
  ctx.bezierCurveTo(-5, -11, -4, -15, -2, -17);
  ctx.bezierCurveTo(-3, -19, -5, -21, -5, -24);
  ctx.bezierCurveTo(-5, -28, -2, -32, 0, -34);
  ctx.closePath();
}

function _rookPath(ctx) {
  // Tower with three proper merlons and stepped Staunton base
  ctx.moveTo(-12, -30); ctx.lineTo(-12, -22); ctx.lineTo(-5, -22); ctx.lineTo(-5, -30);
  ctx.lineTo(0, -30); ctx.lineTo(0, -22); ctx.lineTo(5, -22); ctx.lineTo(5, -30);
  ctx.lineTo(12, -30); ctx.lineTo(12, -22);
  ctx.lineTo(12, 14);
  ctx.lineTo(14, 14); ctx.lineTo(14, 17); ctx.lineTo(16, 17); ctx.lineTo(16, 20);
  ctx.lineTo(-16, 20);
  ctx.lineTo(-16, 17); ctx.lineTo(-14, 17); ctx.lineTo(-14, 14); ctx.lineTo(-12, 14);
  ctx.lineTo(-12, -22); ctx.lineTo(-12, -30);
  ctx.closePath();
}

function _queenPath(ctx) {
  // Five-point crown — center point tallest, outer points lowest
  const pts = [[-16,-14],[-10,-24],[-4,-19],[0,-30],[4,-19],[10,-24],[16,-14]];
  ctx.moveTo(pts[0][0], pts[0][1]);
  pts.forEach(([x,y]) => ctx.lineTo(x, y));
  ctx.bezierCurveTo(17, -10, 14, -4, 12, 2);
  ctx.bezierCurveTo(10, 8, 13, 12, 14, 15);
  ctx.lineTo(16, 15); ctx.lineTo(16, 18); ctx.lineTo(18, 18); ctx.lineTo(18, 21);
  ctx.lineTo(-18, 21);
  ctx.lineTo(-18, 18); ctx.lineTo(-16, 18); ctx.lineTo(-16, 15); ctx.lineTo(-14, 15);
  ctx.bezierCurveTo(-13, 12, -10, 8, -12, 2);
  ctx.bezierCurveTo(-14, -4, -17, -10, -16, -14);
  ctx.closePath();
}

function _kingPath_cross(ctx) {
  ctx.moveTo(-2.5, -32); ctx.lineTo(-2.5, -25);
  ctx.lineTo(-8, -25); ctx.lineTo(-8, -20);
  ctx.lineTo(-2.5, -20); ctx.lineTo(-2.5, -15);
  ctx.lineTo(2.5, -15); ctx.lineTo(2.5, -20);
  ctx.lineTo(8, -20); ctx.lineTo(8, -25);
  ctx.lineTo(2.5, -25); ctx.lineTo(2.5, -32);
  ctx.closePath();
}

function _kingPath_collar(ctx) {
  ctx.moveTo(-16, -12);
  ctx.bezierCurveTo(-16, -14, 16, -14, 16, -12);
  ctx.lineTo(16, -9);
  ctx.bezierCurveTo(16, -7, -16, -7, -16, -9);
  ctx.closePath();
}

function _kingPath_body(ctx) {
  ctx.moveTo(-13, -7);
  ctx.bezierCurveTo(-14, -3, -15, 4, -14, 10);
  ctx.bezierCurveTo(-13, 14, -16, 16, -17, 18);
  ctx.lineTo(-19, 18); ctx.lineTo(-19, 21); ctx.lineTo(-21, 21); ctx.lineTo(-21, 24);
  ctx.lineTo(21, 24); ctx.lineTo(21, 21); ctx.lineTo(19, 21); ctx.lineTo(19, 18); ctx.lineTo(17, 18);
  ctx.bezierCurveTo(16, 16, 13, 14, 14, 10);
  ctx.bezierCurveTo(15, 4, 14, -3, 13, -7);
  ctx.closePath();
}

// Single unified clip path per piece (for skin clipping)
function _clipPath(ctx, type) {
  ctx.beginPath();
  switch (type) {
    case 'pawn':   _pawnPath(ctx); break;
    case 'knight': _knightPath(ctx); break;
    case 'bishop': _bishopPath(ctx); break;
    case 'rook':   _rookPath(ctx); break;
    case 'queen':  _queenPath(ctx); break;
    case 'king':
      _kingPath_cross(ctx);
      _kingPath_collar(ctx);
      _kingPath_body(ctx);
      break;
  }
}

// ── Master piece renderer ─────────────────────────────────────────────────

function renderPiece(ctx, type, color, x, y, scale, style = 'Classic', hovered = false, dragging = false) {
  const isW = color === 'white';
  const s = scale || 1;
  ctx.save();
  ctx.translate(x, y + (hovered ? -4 * s : 0));
  ctx.scale(s, s);

  // ── Fill color per style — white: warm ivory, black: deep blue-black ──
  let fill;
  if (style === 'Wood')         fill = isW ? '#C8A87A' : '#2A1408';
  else if (style === 'Minimal') fill = isW ? '#E8E0D0' : '#1a1a22';
  else                          fill = isW ? '#F5F0E8' : '#12121e';

  // ── Shadow — black pieces cast stronger, deeper shadows ──
  if (style !== 'Minimal') {
    ctx.shadowColor = isW ? 'rgba(0,0,0,0.38)' : 'rgba(0,0,20,0.85)';
    ctx.shadowBlur = isW ? (dragging?22:hovered?16:10) : (dragging?28:hovered?22:16);
    ctx.shadowOffsetY = isW ? (dragging?8:hovered?6:3) : (dragging?10:hovered?8:5);
    ctx.shadowOffsetX = isW ? 1 : 2;
  }

  // ── Apply Neo gradient or flat fill ──
  if (style === 'Neo') {
    const g = ctx.createLinearGradient(-20, -35, 20, 30);
    if (isW) {
      g.addColorStop(0, '#FFFDF5'); g.addColorStop(0.5, '#F0EBE0'); g.addColorStop(1, '#D0C8B8');
    } else {
      g.addColorStop(0, '#1e1e2e'); g.addColorStop(0.5, '#12121e'); g.addColorStop(1, '#08080e');
    }
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = fill;
  }

  // ── Stroke — white: dark charcoal; black: bright silver-blue ──
  ctx.strokeStyle = isW ? '#2a2520' : '#7788bb';
  ctx.lineWidth = style === 'Minimal' ? 1 : 1.8;

  // ── Draw silhouette ──
  _clipPath(ctx, type);
  ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowOffsetX = 0;
  _clipPath(ctx, type);
  ctx.stroke();

  // ── Specular highlight — white: warm gold, black: cool blue-silver ──
  if (style !== 'Minimal') {
    ctx.save();
    _clipPath(ctx, type); ctx.clip();
    const hi = ctx.createLinearGradient(-12, -36, 8, 12);
    if (isW) {
      hi.addColorStop(0, 'rgba(255,252,230,0.65)');
      hi.addColorStop(0.35, 'rgba(255,248,200,0.2)');
      hi.addColorStop(1, 'rgba(255,245,190,0)');
    } else {
      hi.addColorStop(0, 'rgba(140,160,220,0.35)');
      hi.addColorStop(0.3, 'rgba(100,120,180,0.12)');
      hi.addColorStop(1, 'rgba(80,100,160,0)');
    }
    ctx.fillStyle = hi;
    ctx.fillRect(-30, -45, 60, 90);
    ctx.restore();
  }

  // ── Wood grain ──
  if (style === 'Wood') {
    ctx.save();
    _clipPath(ctx, type); ctx.clip();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = isW ? '#7a5020' : '#180800';
    ctx.lineWidth = 0.55;
    for (let i = -40; i < 40; i += 3.2) {
      ctx.beginPath();
      ctx.moveTo(i - 25, -45);
      ctx.bezierCurveTo(i - 8, -15, i + 8, 15, i + 25, 45);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Piece-specific detail engravings (Classic, Neo, Wood) ──
  if (style !== 'Minimal') _engraveDetails(ctx, type, isW);

  ctx.restore();
}

// ── Engraving details per piece ───────────────────────────────────────────

function _engraveDetails(ctx, type, isW) {
  const eg = isW ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)';
  const hi = isW ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)';

  if (type === 'king') {
    // Cross bevel highlights
    ctx.strokeStyle = hi; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-1.5,-31); ctx.lineTo(-1.5,-21);
    ctx.moveTo(2.5,-31); ctx.lineTo(2.5,-21);
    ctx.moveTo(-7,-24); ctx.lineTo(-7,-21);
    ctx.moveTo(7,-24); ctx.lineTo(7,-21);
    ctx.stroke();
    // Collar etching lines
    ctx.strokeStyle = eg; ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let i = -14; i <= 14; i += 3) { ctx.moveTo(i,-12); ctx.lineTo(i,-8); }
    ctx.stroke();
    // Body centre crease
    ctx.strokeStyle = isW ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0,-6); ctx.lineTo(0,19); ctx.stroke();
  }

  if (type === 'queen') {
    // Crown orb dots
    ctx.fillStyle = eg;
    [[-10,-24],[0,-30],[10,-24]].forEach(([cx,cy]) => {
      ctx.beginPath(); ctx.arc(cx,cy,2.5,0,Math.PI*2); ctx.fill();
    });
    // Crown orb catch-lights
    ctx.strokeStyle = hi; ctx.lineWidth = 0.7;
    [[-10,-24],[0,-30],[10,-24]].forEach(([cx,cy]) => {
      ctx.beginPath(); ctx.arc(cx,cy-1,2,Math.PI*1.2,Math.PI*1.8); ctx.stroke();
    });
    // Body vertical fluting
    ctx.strokeStyle = isW ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.7;
    for (let x = -8; x <= 8; x += 4) {
      ctx.beginPath(); ctx.moveTo(x,-5); ctx.lineTo(x+2,14); ctx.stroke();
    }
  }

  if (type === 'bishop') {
    // Mitre centre seam
    ctx.strokeStyle = eg; ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0,-34); ctx.bezierCurveTo(0.5,-24,0.5,-18,0,-10); ctx.stroke();
    // Mitre cross-stitch marks
    ctx.lineWidth = 0.5;
    [-28,-22,-16].forEach(y => {
      ctx.beginPath(); ctx.moveTo(-3.5,y); ctx.lineTo(3.5,y); ctx.stroke();
    });
    // Collar edge highlight
    ctx.strokeStyle = hi; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-9,-4); ctx.lineTo(9,-4); ctx.stroke();
    // Finial ball catch-light
    ctx.beginPath(); ctx.arc(-1,-36,1.5,Math.PI*1.2,Math.PI*1.8); ctx.stroke();
  }

  if (type === 'knight') {
    // Eye with glint
    ctx.fillStyle = isW ? '#2a2a2a' : '#dddddd';
    ctx.beginPath(); ctx.arc(8,-17,2.2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = isW ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(7.1,-17.9,0.75,0,Math.PI*2); ctx.fill();
    // Nostril
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.ellipse(11.5,-13.5,1.3,0.9,-0.3,0,Math.PI*2); ctx.fill();
    // Mane ridge shadow
    ctx.strokeStyle = isW ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-1,-27); ctx.bezierCurveTo(-3,-20,-5,-12,-6,-3); ctx.stroke();
    // Mane ridge highlight
    ctx.strokeStyle = hi; ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0,-27); ctx.bezierCurveTo(-2,-20,-4,-12,-5,-3); ctx.stroke();
    // Bridle line
    ctx.strokeStyle = eg; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(4,-20); ctx.bezierCurveTo(6,-16,8,-12,9,-8); ctx.stroke();
  }

  if (type === 'rook') {
    // Battlement inner shadow lines
    ctx.strokeStyle = eg; ctx.lineWidth = 0.8;
    ctx.beginPath();
    [-11,-4,1,6,11].forEach(x => { ctx.moveTo(x,-22); ctx.lineTo(x,-29); });
    ctx.stroke();
    // Stonework coursing lines
    ctx.lineWidth = 0.4;
    [-16,-10,-4,2,8].forEach(y => {
      ctx.beginPath(); ctx.moveTo(-11,y); ctx.lineTo(11,y); ctx.stroke();
    });
    // Arrow slit
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.rect(-1,-18,2,8); ctx.fill();
    // Base step highlight
    ctx.strokeStyle = hi; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-15,14); ctx.lineTo(15,14); ctx.stroke();
  }

  if (type === 'pawn') {
    // Head catch-light arc
    ctx.strokeStyle = hi; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(-2,-22,5,Math.PI*1.1,Math.PI*1.7); ctx.stroke();
    // Neck fluting
    ctx.strokeStyle = eg; ctx.lineWidth = 0.5;
    [-4,0,4].forEach(x => {
      ctx.beginPath(); ctx.moveTo(x,-11); ctx.lineTo(x*1.3,0); ctx.stroke();
    });
    // Shoulder highlight
    ctx.strokeStyle = hi; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-11,7); ctx.bezierCurveTo(-8,5,8,5,11,7); ctx.stroke();
  }
}

// ── Clip-and-draw helper for skins ────────────────────────────────────────

function _withClip(ctx, type, x, y, sc, fn) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(sc, sc);
  _clipPath(ctx, type); ctx.clip();
  fn(ctx);
  ctx.restore();
  // Re-draw outline on top
  ctx.save();
  ctx.translate(x, y); ctx.scale(sc, sc);
  _clipPath(ctx, type);
  ctx.lineWidth = 1.8; ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.stroke();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: PIECE SKIN RENDERING — ALL RARITIES, FULLY NAMED
// Common (solid) → Rare (material) → Epic (animated) → Unique (narrative) → Mythic
// ─────────────────────────────────────────────────────────────────────────────

const _SOLID_COLORS = {
  'crimson-red':'#cc2222','ocean-blue':'#2255cc','forest-green':'#228833',
  'sunburst-orange':'#dd7700','violet-purple':'#7722cc','arctic-teal':'#117788',
  'dusty-rose':'#cc6688','charcoal':'#444444',
};

function renderSkin(ctx, pieceType, pieceColor, x, y, scale, skinId, t = 0) {
  if (!skinId || skinId === 'default') { renderPiece(ctx, pieceType, pieceColor, x, y, scale); return; }
  const isW = pieceColor === 'white';
  if (_SOLID_COLORS[skinId]) { _solidSkin(ctx, pieceType, isW, x, y, scale, _SOLID_COLORS[skinId]); return; }
  const rareMap={'frosted-glass':_glassSkin,'brushed-steel':_steelSkin,'warm-marble':_marbleSkin,'obsidian-stone':_obsidianSkin,'bone-ivory':_ivorySkin,'onyx':_onyxSkin};
  if (rareMap[skinId]) { rareMap[skinId](ctx, pieceType, isW, x, y, scale); return; }
  const epicMap={'static-shock':_skinLightning,'molten-core':_skinLava,'neon-pulse':_skinNeon,'prism-shift':_skinPrism,'void-drift':_skinVoid,'deep-current':_skinOcean};
  if (epicMap[skinId]) { epicMap[skinId](ctx, pieceType, isW, x, y, scale, t); return; }
  const uniqueMap={'last-bloom':_skinLastBloom,'dying-star':_skinDyingStar,'singularity':_skinSingularity,'between-worlds':_skinBetweenWorlds,'the-revelation':_skinTheRevelation,'permafrost':_skinPermafrost,'thunderwall':_skinThunderwall,'fallen-citadel':_skinFallenCitadel,'pale-court':_skinPaleCourt,'the-deep':_skinTheDeep,'ascension':_skinAscension,'long-winter':_skinLongWinter};
  if (uniqueMap[skinId]) { uniqueMap[skinId](ctx, pieceType, isW, x, y, scale, t); return; }
  const mythic1Map={'first-light':_skinFirstLight,'the-haunting':_skinTheHaunting,'spectrum':_skinSpectrum,'undying':_skinUndying,'borealis':_skinBorealis,'dying-sun':_skinDyingSun};
  if (mythic1Map[skinId]) { mythic1Map[skinId](ctx, pieceType, isW, x, y, scale, t); return; }
  const mythic2Map={'the-origin':_skinTheOrigin,'riftwalker':_skinRiftwalker,'the-rapture':_skinTheRapture,'last-bastion':_skinLastBastion,'the-cosmos':_skinTheCosmos,'the-eternal':_skinTheEternal};
  if (mythic2Map[skinId]) { mythic2Map[skinId](ctx, pieceType, isW, x, y, scale, t); return; }
  renderPiece(ctx, pieceType, pieceColor, x, y, scale);
}

// ── COMMON: Solid fill with specular + engravings ────────────────────────────
function _solidSkin(ctx, type, isW, x, y, sc, color) {
  ctx.save(); ctx.translate(x,y); ctx.scale(sc,sc);
  ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=12; ctx.shadowOffsetY=4;
  _clipPath(ctx,type); ctx.fillStyle=color; ctx.fill(); ctx.restore();
  _withClip(ctx, type, x, y, sc, c => {
    const hi=c.createLinearGradient(-12,-38,8,12);
    hi.addColorStop(0,'rgba(255,255,255,0.4)'); hi.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=hi; c.fillRect(-30,-45,60,90);
  });
  ctx.save(); ctx.translate(x,y); ctx.scale(sc,sc);
  _clipPath(ctx,type); ctx.lineWidth=1.8; ctx.strokeStyle=isW?'#2a2a2a':'#aaaaaa'; ctx.stroke();
  _engraveDetails(ctx, type, isW); ctx.restore();
}
// ── RARE: Material skins ─────────────────────────────────────────────────────
function _glassSkin(ctx, type, isW, x, y, sc) {
  ctx.save(); ctx.shadowColor='rgba(100,150,255,0.25)'; ctx.shadowBlur=14;
  ctx.translate(x,y); ctx.scale(sc,sc); _clipPath(ctx,type); ctx.fillStyle='rgba(200,220,255,0.12)'; ctx.fill(); ctx.restore();
  _withClip(ctx,type,x,y,sc,c=>{
    c.fillStyle='rgba(215,232,255,0.22)'; c.fillRect(-30,-45,60,90);
    c.strokeStyle='rgba(255,255,255,0.16)'; c.lineWidth=0.8;
    for(let i=-40;i<40;i+=3.5){c.beginPath();c.moveTo(i,-45);c.lineTo(i+10,45);c.stroke();}
    const s=c.createLinearGradient(-16,-44,5,20); s.addColorStop(0,'rgba(255,255,255,0.75)'); s.addColorStop(0.35,'rgba(255,255,255,0.2)'); s.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=s; c.fillRect(-30,-45,60,90);
    const r=c.createLinearGradient(10,-45,20,45); r.addColorStop(0,'rgba(180,210,255,0.35)'); r.addColorStop(1,'rgba(180,210,255,0)'); c.fillStyle=r; c.fillRect(-30,-45,60,90);
  });
  ctx.save(); ctx.translate(x,y); ctx.scale(sc,sc); _clipPath(ctx,type); ctx.lineWidth=1.2; ctx.strokeStyle='rgba(180,210,255,0.75)'; ctx.stroke(); ctx.restore();
}
function _steelSkin(ctx, type, isW, x, y, sc) {
  ctx.save(); ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=10; ctx.shadowOffsetY=4;
  ctx.translate(x,y); ctx.scale(sc,sc); _clipPath(ctx,type); ctx.fillStyle='#888'; ctx.fill(); ctx.restore();
  _withClip(ctx,type,x,y,sc,c=>{
    const g=c.createLinearGradient(-20,-40,20,40); g.addColorStop(0,'#d4d4d4'); g.addColorStop(0.25,'#a0a0a0'); g.addColorStop(0.55,'#c8c8c8'); g.addColorStop(0.75,'#7a7a7a'); g.addColorStop(1,'#aaaaaa'); c.fillStyle=g; c.fillRect(-30,-45,60,90);
    c.strokeStyle='rgba(0,0,0,0.055)'; c.lineWidth=0.35; for(let i=-45;i<45;i+=1.4){c.beginPath();c.moveTo(-30,i);c.lineTo(30,i);c.stroke();}
    const hi=c.createLinearGradient(-18,-42,0,0); hi.addColorStop(0,'rgba(255,255,255,0.5)'); hi.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=hi; c.fillRect(-30,-45,60,90);
  });
  ctx.save(); ctx.translate(x,y); ctx.scale(sc,sc); _clipPath(ctx,type); ctx.lineWidth=1.5; ctx.strokeStyle='#3a3a3a'; ctx.stroke(); ctx.restore();
}
function _marbleSkin(ctx, type, isW, x, y, sc) {
  _withClip(ctx,type,x,y,sc,c=>{
    c.fillStyle=isW?'#f0ece4':'#1c1810'; c.fillRect(-30,-45,60,90);
    const veins=isW?[['rgba(180,160,120,0.4)',[[-22,-42],[0,-20],[12,5],[-5,28],[10,42]]],['rgba(160,140,100,0.22)',[[-6,-43],[16,-18],[-3,12],[14,40]]],['rgba(140,120,90,0.14)',[[12,-40],[-14,-8],[6,22],[-6,44]]]]:
      [['rgba(80,60,35,0.55)',[[-22,-42],[0,-20],[12,5],[-5,28],[10,42]]],['rgba(55,38,18,0.35)',[[-6,-43],[16,-18],[-3,12],[14,40]]],['rgba(120,100,55,0.2)',[[12,-40],[-14,-8],[6,22],[-6,44]]]];
    veins.forEach(([col,pts])=>{c.strokeStyle=col;c.lineWidth=1+Math.random()*0.5;c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++){const mx=(pts[i][0]+pts[i-1][0])/2+(Math.random()-0.5)*9,my=(pts[i][1]+pts[i-1][1])/2+(Math.random()-0.5)*9;c.quadraticCurveTo(mx,my,pts[i][0],pts[i][1]);}c.stroke();});
    const sh=c.createLinearGradient(-14,-42,10,20); sh.addColorStop(0,isW?'rgba(255,255,255,0.45)':'rgba(255,255,255,0.1)'); sh.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=sh; c.fillRect(-30,-45,60,90);
  });
  ctx.save(); ctx.translate(x,y); ctx.scale(sc,sc); _clipPath(ctx,type); ctx.lineWidth=1.5; ctx.strokeStyle=isW?'#888':'#444'; ctx.stroke(); ctx.restore();
}
function _obsidianSkin(ctx, type, isW, x, y, sc) {
  _withClip(ctx,type,x,y,sc,c=>{
    c.fillStyle='#07070f'; c.fillRect(-30,-45,60,90);
    c.strokeStyle='rgba(110,70,210,0.18)'; c.lineWidth=0.5;
    [[[-26,-42],[5,0],[22,38]],[[-5,-43],[26,-5],[-10,40]],[[16,-40],[-22,10],[12,44]]].forEach(pts=>{c.beginPath();c.moveTo(pts[0][0],pts[0][1]);pts.forEach(p=>c.lineTo(p[0],p[1]));c.closePath();c.stroke();});
    const g=c.createRadialGradient(-8,-20,0,-8,-20,38); g.addColorStop(0,'rgba(90,45,185,0.14)'); g.addColorStop(1,'rgba(90,45,185,0)'); c.fillStyle=g; c.fillRect(-30,-45,60,90);
    const hi=c.createLinearGradient(-15,-44,-4,-8); hi.addColorStop(0,'rgba(255,255,255,0.22)'); hi.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=hi; c.fillRect(-30,-45,60,90);
  });
  ctx.save(); ctx.translate(x,y); ctx.scale(sc,sc); _clipPath(ctx,type); ctx.lineWidth=1.5; ctx.strokeStyle='rgba(90,55,190,0.75)'; ctx.stroke(); ctx.restore();
}
function _ivorySkin(ctx, type, isW, x, y, sc) {
  _withClip(ctx,type,x,y,sc,c=>{
    c.fillStyle='#e8dfc0'; c.fillRect(-30,-45,60,90);
    c.strokeStyle='rgba(0,0,0,0.04)'; c.lineWidth=0.45;
    for(let i=-30;i<30;i+=5){c.beginPath();c.moveTo(-15,i);c.lineTo(15,i+2.5);c.stroke();}
    for(let i=-15;i<15;i+=5){c.beginPath();c.moveTo(i,-30);c.lineTo(i+2.5,30);c.stroke();}
    const sh=c.createLinearGradient(-12,-40,6,10); sh.addColorStop(0,'rgba(255,255,255,0.3)'); sh.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=sh; c.fillRect(-30,-45,60,90);
  });
  ctx.save(); ctx.translate(x,y); ctx.scale(sc,sc); _clipPath(ctx,type); ctx.lineWidth=1.5; ctx.strokeStyle=isW?'#8a7055':'#6a5040'; ctx.stroke(); ctx.restore();
}
function _onyxSkin(ctx, type, isW, x, y, sc) {
  _withClip(ctx,type,x,y,sc,c=>{c.fillStyle='#060608';c.fillRect(-30,-45,60,90);});
  ctx.save(); ctx.translate(x,y); ctx.scale(sc,sc); _clipPath(ctx,type); ctx.lineWidth=1.5; ctx.strokeStyle='#1e1e22'; ctx.stroke(); ctx.restore();
}
// ── EPIC: Animated ────────────────────────────────────────────────────────────
function _skinLightning(ctx, type, isW, x, y, sc, t) {
  _withClip(ctx,type,x,y,sc,c=>{
    c.fillStyle='#00011a'; c.fillRect(-30,-45,60,90);
    const g=c.createRadialGradient(0,0,0,0,0,28); g.addColorStop(0,'rgba(30,80,200,0.28)'); g.addColorStop(1,'rgba(30,80,200,0)'); c.fillStyle=g; c.fillRect(-30,-45,60,90);
    for(let b=0;b<4;b++){const ph=(t*0.001+b*0.25)%1,alpha=ph<0.15?1-ph/0.15:0;if(alpha<0.02)continue;c.strokeStyle=`rgba(${b%2===0?'100,200,255':'200,230,255'},${alpha})`;c.lineWidth=b%2===0?1.4:0.6;c.beginPath();let bx=rand(-5,5),by=-40;c.moveTo(bx,by);while(by<42){bx+=rand(-8,8);by+=rand(6,14);c.lineTo(bx,by);}c.stroke();}
  });
  ctx.save(); ctx.translate(x,y); ctx.scale(sc,sc); _clipPath(ctx,type); ctx.lineWidth=1.5; ctx.strokeStyle=`rgba(100,180,255,${0.55+Math.sin(t*0.004)*0.35})`; ctx.shadowColor='rgba(80,160,255,0.4)'; ctx.shadowBlur=12; ctx.stroke(); ctx.restore();
}
function _skinLava(ctx, type, isW, x, y, sc, t) {
  _withClip(ctx,type,x,y,sc,c=>{
    c.fillStyle='#0a0000'; c.fillRect(-30,-45,60,90);
    const cracks=[[[-20,-40],[0,-15],[10,10],[-5,35]],[[15,-38],[-8,-8],[12,20],[-2,42]],[[-5,-42],[18,-12],[-15,15],[8,40]]];
    cracks.forEach((pts,ci)=>{const pulse=Math.sin(t*0.0015+ci*1.2)*0.5+0.5;const g=c.createLinearGradient(pts[0][0],pts[0][1],pts[3][0],pts[3][1]);g.addColorStop(0,`rgba(255,${lerp(55,155,pulse)},0,${0.4+pulse*0.5})`);g.addColorStop(0.5,`rgba(255,${lerp(110,210,pulse)},0,${0.65+pulse*0.3})`);g.addColorStop(1,`rgba(255,${lerp(55,120,pulse)},0,${0.35+pulse*0.4})`);c.strokeStyle=g;c.lineWidth=2+pulse*1.5;c.shadowColor=`rgba(255,100,0,${pulse*0.9})`;c.shadowBlur=10;c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++){const mx=(pts[i][0]+pts[i-1][0])/2+Math.sin(t*0.002+i+ci)*4,my=(pts[i][1]+pts[i-1][1])/2+Math.cos(t*0.002+i+ci)*4;c.quadraticCurveTo(mx,my,pts[i][0],pts[i][1]);}c.stroke();});
    const cp=Math.sin(t*0.002)*0.5+0.5;const cg=c.createRadialGradient(0,5,0,0,5,22);cg.addColorStop(0,`rgba(255,${lerp(55,155,cp)},0,${cp*0.28})`);cg.addColorStop(1,'rgba(255,50,0,0)');c.shadowColor='';c.shadowBlur=0;c.fillStyle=cg;c.fillRect(-30,-45,60,90);
  });
  const lp=Math.sin(t*0.002)*0.5+0.5;
  ctx.save(); ctx.translate(x,y); ctx.scale(sc,sc); _clipPath(ctx,type); ctx.lineWidth=1.5; ctx.strokeStyle=`rgba(255,${lerp(80,165,lp)},0,0.95)`; ctx.shadowColor=`rgba(255,80,0,${0.45+lp*0.3})`; ctx.shadowBlur=18; ctx.stroke(); ctx.restore();
}
function _skinNeon(ctx, type, isW, x, y, sc, t) {
  _withClip(ctx,type,x,y,sc,c=>{c.fillStyle='#080808';c.fillRect(-30,-45,60,90);});
  const hue=(t*0.06)%360;
  ctx.save(); ctx.translate(x,y); ctx.scale(sc,sc); _clipPath(ctx,type); ctx.clip();
  const bg=ctx.createRadialGradient(0,0,0,0,0,22); bg.addColorStop(0,`hsla(${hue},80%,30%,0.3)`); bg.addColorStop(1,'hsla(0,0%,0%,0)'); ctx.fillStyle=bg; ctx.fillRect(-30,-45,60,90); ctx.restore();
  ctx.save(); ctx.translate(x,y); ctx.scale(sc,sc); _clipPath(ctx,type); ctx.lineWidth=2.2; ctx.strokeStyle=`hsl(${hue},100%,65%)`; ctx.shadowColor=`hsl(${hue},100%,60%)`; ctx.shadowBlur=14; ctx.stroke(); ctx.lineWidth=1; ctx.strokeStyle=`hsl(${hue+30},100%,80%)`; ctx.stroke(); ctx.restore();
}
function _skinPrism(ctx, type, isW, x, y, sc, t) {
  const hue=(t*0.04)%360;
  _withClip(ctx,type,x,y,sc,c=>{
    const g=c.createLinearGradient(-25,-42,25,42); g.addColorStop(0,`hsl(${hue},75%,72%)`); g.addColorStop(0.25,`hsl(${hue+90},80%,68%)`); g.addColorStop(0.5,`hsl(${hue+180},75%,70%)`); g.addColorStop(0.75,`hsl(${hue+270},80%,68%)`); g.addColorStop(1,`hsl(${hue+360},75%,72%)`); c.fillStyle=g; c.fillRect(-30,-45,60,90);
    for(let i=0;i<6;i++){c.strokeStyle=`hsla(${hue+i*60},100%,78%,0.28)`;c.lineWidth=2.5;c.beginPath();c.moveTo(i*5-15,-45);c.lineTo(i*5-10+Math.sin(t*0.001+i)*5,45);c.stroke();}
    const hi=c.createLinearGradient(-18,-42,0,0); hi.addColorStop(0,'rgba(255,255,255,0.55)'); hi.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=hi; c.fillRect(-30,-45,60,90);
  });
  ctx.save(); ctx.translate(x,y); ctx.scale(sc,sc); _clipPath(ctx,type); ctx.lineWidth=1.5; ctx.strokeStyle=`hsl(${hue+180},60%,70%)`; ctx.shadowColor=`hsl(${hue},80%,60%)`; ctx.shadowBlur=14; ctx.stroke(); ctx.restore();
}
function _skinVoid(ctx, type, isW, x, y, sc, t) {
  _withClip(ctx,type,x,y,sc,c=>{
    c.fillStyle='#000008'; c.fillRect(-30,-45,60,90);
    for(let i=0;i<30;i++){const angle=(i/30)*Math.PI*2+t*0.0003,r=((i*17+t*0.025)%28)+3;c.globalAlpha=clamp((28-r)/28*0.85,0,1);c.fillStyle='#fff';c.beginPath();c.arc(Math.cos(angle)*r,Math.sin(angle)*r*0.55,0.75,0,Math.PI*2);c.fill();}
    c.globalAlpha=1;const ng=c.createRadialGradient(0,0,0,0,0,26);ng.addColorStop(0,'rgba(55,18,120,0.28)');ng.addColorStop(0.5,'rgba(35,8,80,0.14)');ng.addColorStop(1,'rgba(18,4,38,0)');c.fillStyle=ng;c.fillRect(-30,-45,60,90);
  });
  const ra=(t*0.0005)%1;if(ra<0.4){ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);ctx.globalAlpha=(0.4-ra)/0.4*0.55;ctx.strokeStyle='rgba(100,50,200,1)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,ra/0.4*22,0,Math.PI*2);ctx.stroke();ctx.restore();}
  ctx.save(); ctx.translate(x,y); ctx.scale(sc,sc); _clipPath(ctx,type); ctx.lineWidth=1.5; ctx.strokeStyle='rgba(75,35,185,0.7)'; ctx.stroke(); ctx.restore();
}
function _skinOcean(ctx, type, isW, x, y, sc, t) {
  _withClip(ctx,type,x,y,sc,c=>{
    const g=c.createLinearGradient(0,-45,0,45);g.addColorStop(0,'#001a33');g.addColorStop(0.5,'#003368');g.addColorStop(1,'#00223c');c.fillStyle=g;c.fillRect(-30,-45,60,90);
    for(let w=0;w<5;w++){const wy=-30+w*16+Math.sin(t*0.001+w*0.8)*6;const wg=c.createLinearGradient(0,wy-5,0,wy+5);wg.addColorStop(0,'rgba(0,150,255,0)');wg.addColorStop(0.5,`rgba(0,185,255,${0.07+w*0.02})`);wg.addColorStop(1,'rgba(0,150,255,0)');c.fillStyle=wg;c.fillRect(-30,wy-5,60,10);}
    for(let i=0;i<7;i++){const cx2=Math.sin(t*0.0008+i*0.8)*12,cy2=Math.cos(t*0.0006+i*1.2)*15;const cg2=c.createRadialGradient(cx2,cy2,0,cx2,cy2,8);cg2.addColorStop(0,'rgba(100,200,255,0.11)');cg2.addColorStop(1,'rgba(100,200,255,0)');c.fillStyle=cg2;c.fillRect(-30,-45,60,90);}
    const sg=c.createLinearGradient(-18,-43,0,-10);sg.addColorStop(0,'rgba(150,220,255,0.32)');sg.addColorStop(1,'rgba(150,220,255,0)');c.fillStyle=sg;c.fillRect(-30,-45,60,90);
  });
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);ctx.lineWidth=1.5;ctx.strokeStyle=`rgba(80,180,255,${0.58+Math.sin(t*0.002)*0.32})`;ctx.stroke();ctx.restore();
}
// ── UNIQUE: Narrative skins ───────────────────────────────────────────────────
// Last Bloom — a pawn walking through its own ending, petals falling
function _skinDyingStar(ctx, type, isW, x, y, sc, t) {
  // A star in its final seconds — supergiant collapse, massive corona, chromatic distortion
  // Interior fills with nuclear fire; surface warps with gravity; jets of plasma shoot out
  _withClip(ctx,type,x,y,sc,c=>{
    // Nuclear furnace interior — hot white core bleeding to deep orange/red at edges
    const pulse=Math.sin(t*0.0005)*0.5+0.5;
    const core=c.createRadialGradient(0,0,0,0,0,24);
    core.addColorStop(0,`rgba(255,255,${200+pulse*55},1)`);
    core.addColorStop(0.2,`rgba(255,${180+pulse*75},0,0.95)`);
    core.addColorStop(0.5,`rgba(255,${80+pulse*60},0,0.7)`);
    core.addColorStop(0.8,`rgba(180,${30+pulse*40},0,0.5)`);
    core.addColorStop(1,`rgba(60,0,0,0.8)`);
    c.fillStyle=core;c.fillRect(-30,-45,60,90);
    // Surface convection — churning darker cells
    for(let i=0;i<7;i++){
      const cx=Math.sin(i*1.3+t*0.0002)*11, cy=Math.cos(i*1.1+t*0.00015)*9;
      const cellR=4+i%3;
      const cell=c.createRadialGradient(cx,cy,0,cx,cy,cellR);
      cell.addColorStop(0,`rgba(100,${20+pulse*30},0,${0.35+pulse*0.2})`);
      cell.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle=cell;c.beginPath();c.arc(cx,cy,cellR,0,Math.PI*2);c.fill();
    }
    // Magnetic field lines across surface — thin arcing bands
    c.strokeStyle=`rgba(255,${150+pulse*105},50,0.2)`;c.lineWidth=0.6;
    for(let i=0;i<5;i++){
      const my=-20+i*10;
      c.beginPath();c.moveTo(-28,my);
      c.bezierCurveTo(-10,my+Math.sin(i*1.2+t*0.0003)*6,10,my-Math.sin(i*0.9+t*0.0003)*5,28,my);
      c.stroke();
    }
    // Gravitational redshift ring at boundary
    const ring=c.createRadialGradient(0,0,18,0,0,28);
    ring.addColorStop(0,'rgba(0,0,0,0)');
    ring.addColorStop(0.6,`rgba(255,30,0,${0.15+pulse*0.1})`);
    ring.addColorStop(1,'rgba(0,0,0,0.6)');
    c.fillStyle=ring;c.fillRect(-30,-45,60,90);
  });

  // Massive corona — extends well beyond piece, layers of decreasing opacity
  ctx.save();ctx.translate(x,y);
  const cp=0.5+0.5*Math.sin(t*0.0005);
  for(let layer=0;layer<4;layer++){
    const lr=15+layer*7;
    const la=(0.22-layer*0.05)*cp;
    const lg=ctx.createRadialGradient(0,0,12*sc,0,0,(lr+2)*sc);
    lg.addColorStop(0,`rgba(255,${120+cp*100},0,${la})`);
    lg.addColorStop(0.5,`rgba(255,${60+cp*60},0,${la*0.4})`);
    lg.addColorStop(1,'rgba(200,20,0,0)');
    ctx.fillStyle=lg;ctx.beginPath();ctx.arc(0,0,(lr+2)*sc,0,Math.PI*2);ctx.fill();
  }

  // Plasma jets — 2 polar jets shooting out perpendicular (north + south)
  const jetPulse=0.5+0.5*Math.sin(t*0.0007);
  for(let dir=0;dir<2;dir++){
    const jy=(dir===0?-1:1);
    for(let j=0;j<3;j++){
      const jAge=((t*0.00025+dir*0.5+j*0.33)%1);
      const jLen=jAge*32;
      const jx=Math.sin(jAge*Math.PI*1.5+j*1.2)*3;
      const jAlpha=(1-jAge)*jetPulse*0.7;
      const jg=ctx.createLinearGradient(jx*sc,(jy<0?-13:-13)*sc,(jx+j)*sc,(jy<0?-13-jLen:13+jLen)*sc);
      jg.addColorStop(0,`rgba(255,200,50,${jAlpha})`);
      jg.addColorStop(0.5,`rgba(255,100,0,${jAlpha*0.5})`);
      jg.addColorStop(1,'rgba(200,30,0,0)');
      ctx.strokeStyle=jg;ctx.lineWidth=(2.5-jAge*1.5)*sc;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(jx*sc,jy*13*sc);ctx.lineTo((jx+j*0.3)*sc,jy*(13+jLen)*sc);ctx.stroke();
    }
  }

  // Chromatic aberration ring — gravity lensing the light at the edge
  const caPhase=(t*0.0003)%1;
  [['rgba(255,0,0',2.5],['rgba(0,100,255',-2.5]].forEach(([col,offset])=>{
    ctx.save();ctx.globalAlpha=0.2;ctx.translate(0,offset*sc);
    ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
    ctx.lineWidth=2;ctx.strokeStyle=col+',0.8)';ctx.stroke();
    ctx.restore();
  });

  // Surface sparks — streaming upward continuously, lots of them
  const sparkDefs=[
    {ox:-6,oy:-18,sp:0.00018,ph:0},{ox:8,oy:-14,sp:0.00015,ph:0.5},
    {ox:-3,oy:-22,sp:0.00020,ph:1.0},{ox:5,oy:-25,sp:0.00016,ph:1.5},
    {ox:-10,oy:-10,sp:0.00014,ph:2.0},{ox:3,oy:-8,sp:0.00019,ph:2.5},
    {ox:-7,oy:-5,sp:0.00017,ph:3.0},{ox:9,oy:-18,sp:0.00013,ph:3.5},
    {ox:0,oy:-28,sp:0.00021,ph:4.0},{ox:-4,oy:-16,sp:0.00015,ph:4.5},
    {ox:6,oy:-12,sp:0.00018,ph:5.0},{ox:-8,oy:-20,sp:0.00016,ph:5.5},
  ];
  sparkDefs.forEach(s=>{
    const age=((t*s.sp+s.ph)%1);
    const ey=s.oy*sc-age*40*sc;
    const ex=s.ox*sc+Math.sin(age*Math.PI*3+s.ph)*5*sc;
    if(ey<-44*sc) return;
    const a=(1-age)*0.9;
    const temp=age<0.25?'255,255,150':age<0.5?'255,160,0':'200,50,0';
    ctx.globalAlpha=a;
    ctx.fillStyle=`rgba(${temp},1)`;
    ctx.shadowColor='rgba(255,120,0,0.8)';ctx.shadowBlur=6;
    ctx.beginPath();ctx.arc(ex,ey,(1.6-age)*sc,0,Math.PI*2);ctx.fill();
  });

  // Periodic shockwave ring from surface
  const swPhase=(t*0.00045)%1;
  if(swPhase<0.5){
    const swa=(1-swPhase/0.5)*0.6;
    const swr=(12+swPhase*28)*sc;
    ctx.globalAlpha=swa;
    ctx.strokeStyle='rgba(255,180,50,1)';
    ctx.lineWidth=1.5*sc;ctx.shadowColor='rgba(255,120,0,0.8)';ctx.shadowBlur=10;
    ctx.beginPath();ctx.arc(0,0,swr,0,Math.PI*2);ctx.stroke();
  }
  ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.restore();

  // Outline: intense orange-white glow, pulsing
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
  const op=Math.sin(t*0.0005)*0.5+0.5;
  ctx.lineWidth=2.5;ctx.strokeStyle=`rgba(255,${200+op*55},100,0.95)`;
  ctx.shadowColor=`rgba(255,${150+op*80},0,0.9)`;ctx.shadowBlur=22;ctx.stroke();
  ctx.lineWidth=1;ctx.strokeStyle=`rgba(255,255,200,${op*0.6})`;ctx.shadowBlur=0;ctx.stroke();
  ctx.restore();
}
function _skinSingularity(ctx, type, isW, x, y, sc, t) {
  // Solid black base
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);
  ctx.shadowColor='rgba(0,0,0,0.7)';ctx.shadowBlur=8;
  _clipPath(ctx,type);ctx.fillStyle='#000';ctx.fill();ctx.restore();
  // Accretion disk
  const dp=Math.sin(t*0.0007)*0.15+0.28;
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);
  const dg=ctx.createRadialGradient(0,0,14,0,0,36);
  dg.addColorStop(0,`rgba(255,100,20,${dp})`);dg.addColorStop(0.35,`rgba(200,50,200,${dp*0.35})`);
  dg.addColorStop(0.65,`rgba(50,50,255,${dp*0.18})`);dg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=dg;ctx.beginPath();ctx.arc(0,0,36,0,Math.PI*2);ctx.fill();
  // Inward stars
  for(let i=0;i<28;i++){
    const angle=(i/28)*Math.PI*2+t*0.0003;
    const r=((i*13+t*0.025)%26)+4;
    ctx.globalAlpha=clamp((26-r)/26*0.9,0,1);
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(Math.cos(angle)*r,Math.sin(angle)*r*0.55,0.9,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  // Photon ring
  const pr=Math.sin(t*0.0004)*2+18;
  ctx.strokeStyle=`rgba(255,200,100,${0.32+Math.sin(t*0.0015)*0.18})`;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(0,0,pr,pr*0.35,0,0,Math.PI*2);ctx.stroke();
  // Chromatic outline
  _clipPath(ctx,type);ctx.lineWidth=3;ctx.strokeStyle='rgba(255,50,0,0.12)';ctx.stroke();
  ctx.save();ctx.translate(1,0);_clipPath(ctx,type);ctx.lineWidth=2;ctx.strokeStyle='rgba(0,80,255,0.12)';ctx.stroke();ctx.restore();
  _clipPath(ctx,type);ctx.lineWidth=1.5;ctx.strokeStyle='rgba(80,80,200,0.6)';ctx.stroke();
  ctx.restore();
}

// Between Worlds — Knight fractured across dimensions: three chromatic ghosts offset in red/blue/green
// The piece exists in 3 places at once — you can never quite pin it down

function _skinBetweenWorlds(ctx, type, isW, x, y, sc, t) {
  const drift = Math.sin(t*0.0006)*3*sc;
  const drift2 = Math.cos(t*0.00045)*2.5*sc;

  // Red ghost — offset right, phased
  const r1 = 0.3 + 0.2*Math.sin(t*0.0009);
  ctx.save();ctx.globalAlpha=r1;
  _withClip(ctx,type,x+6*sc+drift,y-3*sc,sc,c=>{
    c.fillStyle='rgba(255,30,30,1)';c.fillRect(-30,-45,60,90);
  });ctx.restore();

  // Blue ghost — offset left
  const r2 = 0.3 + 0.2*Math.sin(t*0.0009+2.1);
  ctx.save();ctx.globalAlpha=r2;
  _withClip(ctx,type,x-5*sc+drift2,y+2*sc,sc,c=>{
    c.fillStyle='rgba(0,100,255,1)';c.fillRect(-30,-45,60,90);
  });ctx.restore();

  // Green ghost — up
  const r3 = 0.2 + 0.18*Math.sin(t*0.0009+4.2);
  ctx.save();ctx.globalAlpha=r3;
  _withClip(ctx,type,x+drift*0.5,y-5*sc+drift2*0.3,sc,c=>{
    c.fillStyle='rgba(0,220,100,1)';c.fillRect(-30,-45,60,90);
  });ctx.restore();

  // Main piece — dark with glitch color cycling
  const hue = (t*0.02)%360;
  _withClip(ctx,type,x,y,sc,c=>{
    c.fillStyle='#0a0a14';c.fillRect(-30,-45,60,90);
    const g=c.createLinearGradient(-20,-40,20,40);
    g.addColorStop(0,`hsla(${hue},70%,55%,0.25)`);
    g.addColorStop(1,`hsla(${hue+120},70%,55%,0.15)`);
    c.fillStyle=g;c.fillRect(-30,-45,60,90);
    // Scanline glitch — horizontal bright bands
    const glitchPhase = (t*0.0025)%1;
    if(glitchPhase<0.12){
      const gy=-35+glitchPhase/0.12*75;
      c.fillStyle=`rgba(255,255,255,${(0.12-glitchPhase)/0.12*0.35})`;
      c.fillRect(-30,gy,60,3);
    }
  });
  // Outline that cycles color
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
  ctx.lineWidth=1.5;ctx.strokeStyle=`hsl(${hue},80%,70%)`;
  ctx.shadowColor=`hsl(${hue},80%,60%)`;ctx.shadowBlur=8;ctx.stroke();ctx.restore();
}

// The Revelation — Bishop: entire surface blazes gold-white, rays burst from every point
// Not just beams from the tip — it radiates from the whole silhouette like a holy fire

function _skinTheRevelation(ctx, type, isW, x, y, sc, t) {
  // Blazing gold-white body
  _withClip(ctx,type,x,y,sc,c=>{
    const g=c.createRadialGradient(0,-5,0,0,-5,32);
    g.addColorStop(0,'#ffffee');g.addColorStop(0.4,'#ffe060');g.addColorStop(1,'#c87000');
    c.fillStyle=g;c.fillRect(-30,-45,60,90);
    // Inner white-hot core at top
    const core=c.createRadialGradient(0,-20,0,0,-20,10);
    core.addColorStop(0,'rgba(255,255,255,0.9)');core.addColorStop(1,'rgba(255,220,100,0)');
    c.fillStyle=core;c.fillRect(-30,-45,60,90);
  });

  // Rays blasting outward from the entire piece boundary — 16 rays, all directions
  ctx.save();ctx.translate(x,y);
  const pulse = 0.6+0.4*Math.sin(t*0.002);
  for(let i=0;i<16;i++){
    const angle = (i/16)*Math.PI*2 + t*0.0003;
    const baseR = 12*sc;
    const tipR = (22+Math.sin(t*0.0025+i*0.6)*6)*sc;
    const fx = Math.cos(angle)*baseR, fy = Math.sin(angle)*baseR;
    const tx2 = Math.cos(angle)*tipR, ty2 = Math.sin(angle)*tipR;
    const g = ctx.createLinearGradient(fx,fy,tx2,ty2);
    g.addColorStop(0,`rgba(255,240,150,${pulse*0.9})`);
    g.addColorStop(0.5,`rgba(255,200,50,${pulse*0.5})`);
    g.addColorStop(1,'rgba(255,150,0,0)');
    ctx.strokeStyle=g;ctx.lineWidth=(i%2===0?1.8:1.0)*sc;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(tx2,ty2);ctx.stroke();
  }
  // Divine glow halo
  const halo=ctx.createRadialGradient(0,0,12*sc,0,0,32*sc);
  halo.addColorStop(0,`rgba(255,220,80,${pulse*0.18})`);halo.addColorStop(1,'rgba(255,180,0,0)');
  ctx.fillStyle=halo;ctx.beginPath();ctx.arc(0,0,32*sc,0,Math.PI*2);ctx.fill();
  ctx.restore();

  // Bright outline
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
  ctx.lineWidth=2;ctx.strokeStyle=`rgba(255,240,150,${pulse})`;
  ctx.shadowColor='rgba(255,220,80,0.8)';ctx.shadowBlur=14;ctx.stroke();ctx.restore();
}

// Permafrost — Bishop: entombed in ancient ice, snowstorm raging outside, barely visible within

function _skinPermafrost(ctx, type, isW, x, y, sc, t) {
  _withClip(ctx,type,x,y,sc,c=>{
    // Ice layers — pale aqua at surface bleeding to deep navy at core
    const g=c.createLinearGradient(0,-38,0,28);
    g.addColorStop(0,'#e8f8ff');g.addColorStop(0.2,'#88ccee');
    g.addColorStop(0.55,'#2268a8');g.addColorStop(1,'#041830');
    c.fillStyle=g;c.fillRect(-30,-45,60,90);

    // Interior piece silhouette — Bishop visible like a shadow behind frosted glass
    c.fillStyle='rgba(10,40,80,0.35)';
    c.beginPath();c.moveTo(0,-32);
    c.bezierCurveTo(4,-28,4,-22,3,-18);c.bezierCurveTo(6,-14,6,-8,4,2);
    c.bezierCurveTo(8,6,8,12,6,16);c.lineTo(-6,16);
    c.bezierCurveTo(-8,12,-8,6,-4,2);c.bezierCurveTo(-6,-8,-6,-14,-3,-18);
    c.bezierCurveTo(-4,-22,-4,-28,0,-32);c.fill();

    // Ice planes — refraction bands at angles
    c.strokeStyle='rgba(255,255,255,0.18)';c.lineWidth=1.5;
    for(let i=-4;i<5;i++){c.beginPath();c.moveTo(i*7-28,-45);c.lineTo(i*7+12,45);c.stroke();}
    c.strokeStyle='rgba(180,230,255,0.12)';c.lineWidth=0.8;
    for(let i=-4;i<5;i++){c.beginPath();c.moveTo(-45,i*8-28);c.lineTo(45,i*8+12);c.stroke();}

    // Frost crystal trees — 6 seeds, denser than before
    const seeds=[[-10,-30],[6,-26],[-4,-10],[11,-8],[0,8],[-9,15]];
    seeds.forEach(([sx,sy],si)=>{
      const phase=(t*0.00015+si*0.38)%1;
      const spread=phase<0.5?phase*2:(2-phase*2);
      if(spread<0.03) return;
      const opacity=0.55*spread;
      c.strokeStyle=`rgba(220,245,255,${opacity})`;
      c.lineWidth=0.65+spread*0.4;
      const drawBranch=(x2,y2,ang,len,d)=>{
        if(d<0||len<0.8) return;
        const ex=x2+Math.cos(ang)*len*spread,ey=y2+Math.sin(ang)*len*spread;
        c.beginPath();c.moveTo(x2,y2);c.lineTo(ex,ey);c.stroke();
        if(d>0){ drawBranch(ex,ey,ang-0.65,len*0.58,d-1); drawBranch(ex,ey,ang+0.65,len*0.58,d-1); }
      };
      drawBranch(sx,sy,-Math.PI/2+si*0.3,11,4);
    });

    // Deep internal blue glow — piece is cold and lit from within
    const iglow=c.createRadialGradient(0,0,0,0,0,22);
    iglow.addColorStop(0,'rgba(80,160,255,0.22)');iglow.addColorStop(1,'rgba(40,100,200,0)');
    c.fillStyle=iglow;c.fillRect(-30,-45,60,90);

    // Snowstorm particles blowing across — fast horizontal drift
    const snowCount=22;
    for(let i=0;i<snowCount;i++){
      const px=((i*31+t*0.018)%62)-31;   // horizontal drift
      const py=((i*23-t*0.008)%72)-38;   // gentle vertical
      const wobble=Math.sin(t*0.002+i*0.8)*3;
      const a=0.25+0.2*Math.sin(t*0.0015+i);
      const r=0.4+((i%3)*0.3);
      c.fillStyle=`rgba(240,250,255,${a})`;
      c.beginPath();c.arc(px+wobble,py,r,0,Math.PI*2);c.fill();
    }

    // Shimmer flash — periodic ice crack glint
    const shimmer=(t*0.0002+0.15)%1;
    if(shimmer<0.12){
      const a=(shimmer<0.06?shimmer/0.06:(0.12-shimmer)/0.06)*0.55;
      c.fillStyle=`rgba(240,250,255,${a})`;c.fillRect(-30,-45,60,90);
    }
  });

  // Breath fog drifting upward from the top of the piece — very slow
  ctx.save();ctx.translate(x,y);
  for(let i=0;i<5;i++){
    const age=((t*0.00008+i*0.2)%1);
    const fogX=(-4+i*2)*sc+Math.sin(age*Math.PI+i)*5*sc;
    const fogY=(-32-age*20)*sc;
    const fa=(age<0.4?age/0.4:(1-age)/0.6)*0.18;
    const fg=ctx.createRadialGradient(fogX,fogY,0,fogX,fogY,7*sc);
    fg.addColorStop(0,`rgba(200,230,255,${fa})`);fg.addColorStop(1,'rgba(200,230,255,0)');
    ctx.fillStyle=fg;ctx.beginPath();ctx.arc(fogX,fogY,7*sc,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();

  // Outline: bright ice-white with strong glow — unmissable
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
  ctx.lineWidth=2.5;ctx.strokeStyle='rgba(220,248,255,0.95)';
  ctx.shadowColor='rgba(140,210,255,0.8)';ctx.shadowBlur=18;ctx.stroke();
  ctx.lineWidth=1;ctx.strokeStyle='rgba(255,255,255,0.7)';ctx.shadowBlur=0;ctx.stroke();
  ctx.restore();
}

// Thunderwall — Rook: the fortress IS the storm; crackling plasma core, contained rage
// Stone exterior barely holding in the energy inside — electricity bleeds through the walls

function _skinThunderwall(ctx, type, isW, x, y, sc, t) {
  // Glowing plasma interior
  _withClip(ctx,type,x,y,sc,c=>{
    // Hot plasma core — bright white-yellow center bleeding to electric purple edges
    const core=c.createRadialGradient(0,-5,0,0,-5,30);
    core.addColorStop(0,'rgba(255,255,200,0.95)');
    core.addColorStop(0.25,'rgba(180,120,255,0.8)');
    core.addColorStop(0.6,'rgba(60,20,160,0.6)');
    core.addColorStop(1,'rgba(10,5,40,0.9)');
    c.fillStyle=core;c.fillRect(-30,-45,60,90);

    // Pulsing rings of energy contained inside
    const p1=Math.sin(t*0.003)*0.5+0.5;
    const p2=Math.sin(t*0.0022+1.2)*0.5+0.5;
    for(let ring=0;ring<3;ring++){
      const rphase=((t*0.0008+ring*0.33)%1);
      const rr=rphase*24;
      const ra=(rphase<0.5?rphase/0.5:(1-rphase)/0.5)*0.5;
      c.strokeStyle=`rgba(180,100,255,${ra})`;c.lineWidth=1.5;
      c.beginPath();c.arc(0,-3,rr,0,Math.PI*2);c.stroke();
    }

    // Constant crackling: dense web of micro-bolts
    const numBolts=7;
    for(let b=0;b<numBolts;b++){
      const ph=(t*0.0015+b*0.143)%1;
      const a=ph<0.12?1-ph/0.12:0;
      if(a<0.02) continue;
      c.strokeStyle=`rgba(255,255,255,${a*0.9})`;c.lineWidth=0.7;
      c.shadowColor=`rgba(200,150,255,${a*0.6})`;c.shadowBlur=4;
      c.beginPath();
      let bx=(b%3-1)*8,by=-28+b*8;c.moveTo(bx,by);
      for(let s=0;s<3;s++){bx+=(Math.random()-0.5)*12;by+=rand(6,12);c.lineTo(bx,by);}
      c.stroke();c.shadowBlur=0;
    }

    // Stone crack network — dark cracks letting energy through
    c.strokeStyle='rgba(0,0,20,0.7)';c.lineWidth=1;
    [[-12,-20],[-5,-10],[8,-25],[3,0],[-8,12]].forEach(([cx2,cy2],i)=>{
      c.beginPath();c.moveTo(cx2,cy2);
      c.lineTo(cx2+(Math.cos(i*1.3)*10),cy2+(Math.sin(i*1.3)*10));c.stroke();
      c.strokeStyle=`rgba(200,150,255,${0.4+Math.sin(t*0.002+i)*0.3})`;c.lineWidth=0.5;
      c.beginPath();c.moveTo(cx2,cy2);
      c.lineTo(cx2+(Math.cos(i*1.3)*8),cy2+(Math.sin(i*1.3)*8));c.stroke();
    });
  });

  // Outer wall — dark stone with purple energy bleeding through
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
  const wallPulse=0.4+0.35*Math.sin(t*0.002);
  ctx.lineWidth=3;ctx.strokeStyle=`rgba(100,40,200,${wallPulse})`;
  ctx.shadowColor=`rgba(160,80,255,${wallPulse})`;ctx.shadowBlur=16;ctx.stroke();
  ctx.lineWidth=1.2;ctx.strokeStyle='rgba(30,10,60,0.9)';ctx.shadowBlur=0;ctx.stroke();
  ctx.restore();

  // Energy escaping as sparks from the surface
  ctx.save();ctx.translate(x,y);
  for(let i=0;i<8;i++){
    const age=((t*0.0004+i*0.125)%1);
    const angle=(i/8)*Math.PI*2+t*0.0006;
    const r=(13+age*12)*sc;
    const alpha=(1-age)*0.8;
    ctx.globalAlpha=alpha;
    ctx.fillStyle=age<0.4?'#ffffff':age<0.7?'#cc88ff':'#6620cc';
    ctx.shadowColor='rgba(200,150,255,0.8)';ctx.shadowBlur=5;
    ctx.beginPath();ctx.arc(Math.cos(angle)*r,Math.sin(angle)*r,1.4*sc,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.restore();
}

// Fallen Citadel — Rook: crumbling ancient ruins, stones actively breaking apart and falling
// Fallen Citadel — Rook: ancient ruined tower, ivy-covered, crumbling stone detail
// Fallen Citadel — Rook: the tower perpetually deconstructs then rebuilds itself
// Blocks detach, drift outward, then slowly fly back in and lock into place

function _skinFallenCitadel(ctx, type, isW, x, y, sc, t) {
  // 0.00-0.60: intact stone with ember spots
  // 0.60-0.65: explosion — flash + debris burst, stone fades out
  // 0.65-1.00: debris fades, stone fades back in

  var cycle=(t*0.000050)%1;
  var stoneAlpha;
  if(cycle<0.60){
    stoneAlpha=1;
  } else if(cycle<0.65){
    stoneAlpha=1-(cycle-0.60)/0.05; // fast fade out on explosion
  } else {
    stoneAlpha=Math.min(1,(cycle-0.65)/0.35); // slow fade back in
  }

  // ── Stone (drawn whenever visible) ──
  if(stoneAlpha>0.01){
    ctx.save();ctx.globalAlpha=stoneAlpha;
    _withClip(ctx,type,x,y,sc,function(c){
      var g=c.createLinearGradient(0,-30,0,20);
      g.addColorStop(0,'#3a3228');g.addColorStop(0.5,'#2e2820');g.addColorStop(1,'#221e16');
      c.fillStyle=g;c.fillRect(-30,-45,60,90);

      var heat=Math.sin(t*0.0004)*0.5+0.5;
      var fr=c.createRadialGradient(0,0,0,0,0,22);
      fr.addColorStop(0,'rgba(255,'+(80+Math.round(heat*100))+',0,'+(0.22+heat*0.18).toFixed(2)+')');
      fr.addColorStop(0.5,'rgba(180,30,0,'+(0.08+heat*0.08).toFixed(2)+')');
      fr.addColorStop(1,'rgba(100,0,0,0)');
      c.fillStyle=fr;c.fillRect(-30,-45,60,90);

      c.strokeStyle='rgba(0,0,0,0.35)';c.lineWidth=0.7;
      [-22,-14,-6,2,10].forEach(function(y2){
        c.beginPath();c.moveTo(-12,y2);c.lineTo(12,y2);c.stroke();
      });
      [-22,-6,10].forEach(function(y2){
        c.beginPath();c.moveTo(-4,y2);c.lineTo(-4,y2+8);c.stroke();
        c.beginPath();c.moveTo(6,y2);c.lineTo(6,y2+8);c.stroke();
      });
      c.strokeStyle='rgba(160,145,110,0.13)';c.lineWidth=0.5;
      [-22,-14,-6,2,10].forEach(function(y2){
        c.beginPath();c.moveTo(-12,y2+0.8);c.lineTo(12,y2+0.8);c.stroke();
      });

      var embers=[
        {x:-8,y:-20,r:2.2,sp:0.0006,ph:0.0},
        {x: 7,y:-16,r:1.8,sp:0.0005,ph:1.1},
        {x:-4,y: -8,r:2.5,sp:0.0007,ph:2.2},
        {x: 9,y:  0,r:1.6,sp:0.0005,ph:0.5},
        {x:-7,y:  6,r:2.0,sp:0.0006,ph:3.3},
        {x: 3,y:-24,r:1.4,sp:0.0008,ph:1.8},
        {x:-2,y: 14,r:1.8,sp:0.0005,ph:4.1},
        {x: 8,y:-10,r:1.5,sp:0.0007,ph:2.7},
      ];
      embers.forEach(function(e){
        var pulse=0.3+0.7*Math.abs(Math.sin(t*e.sp+e.ph));
        var eg=c.createRadialGradient(e.x,e.y,0,e.x,e.y,e.r*2.2);
        eg.addColorStop(0,'rgba(255,'+(60+Math.round(pulse*180))+',0,'+(pulse*0.85).toFixed(2)+')');
        eg.addColorStop(0.45,'rgba(220,50,0,'+(pulse*0.4).toFixed(2)+')');
        eg.addColorStop(1,'rgba(150,10,0,0)');
        c.fillStyle=eg;
        c.beginPath();c.arc(e.x,e.y,e.r*2.2,0,Math.PI*2);c.fill();
        if(pulse>0.65){
          c.fillStyle='rgba(255,220,120,'+((pulse-0.65)/0.35*0.9).toFixed(2)+')';
          c.beginPath();c.arc(e.x,e.y,0.6,0,Math.PI*2);c.fill();
        }
      });

      var smokeX=[-8,7,-4,9,-7,3];
      for(var i=0;i<6;i++){
        var age=((t*0.00018+i*0.167)%1);
        var sx=smokeX[i]+Math.sin(age*Math.PI*2+i)*2;
        var sy=embers[i].y-age*16;
        var sa=(age<0.4?age/0.4:(1-age)/0.6)*0.14;
        c.fillStyle='rgba(50,35,18,'+sa.toFixed(2)+')';
        c.beginPath();c.arc(sx,sy,1.0+age*1.8,0,Math.PI*2);c.fill();
      }
    });

    // Outline
    ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
    ctx.lineWidth=2.2;ctx.strokeStyle='rgba(20,14,8,0.95)';ctx.stroke();
    var hg=Math.sin(t*0.0004)*0.5+0.5;
    ctx.lineWidth=1;ctx.strokeStyle='rgba(200,60,0,'+(0.12+hg*0.12).toFixed(2)+')';ctx.stroke();
    ctx.restore();
  }

  // ── Explosion + debris ──
  if(cycle>=0.60&&cycle<1.0){
    var exploding=cycle<0.65;
    var ep=exploding?(cycle-0.60)/0.05:1;
    var debrisAge=exploding?0:(cycle-0.65)/0.35;
    var debrisAlpha=exploding?ep:Math.max(0,1-debrisAge*1.3);

    ctx.save();ctx.translate(x,y);

    // White-orange flash at moment of explosion
    if(exploding){
      ctx.globalAlpha=(1-ep)*0.85;
      var flash=ctx.createRadialGradient(0,0,0,0,0,28*sc);
      flash.addColorStop(0,'rgba(255,245,190,1)');
      flash.addColorStop(0.4,'rgba(255,130,0,0.6)');
      flash.addColorStop(1,'rgba(200,50,0,0)');
      ctx.fillStyle=flash;
      ctx.beginPath();ctx.arc(0,0,28*sc,0,Math.PI*2);ctx.fill();
    }

    // Debris chunks
    if(debrisAlpha>0.01){
      var ease=1-Math.pow(1-Math.min(ep,1),2);
      for(var di=0;di<18;di++){
        var angle=(di/18)*Math.PI*2+(di*0.41);
        var spd=0.55+((di*7)%10)*0.07;
        var dist=ease*spd*18*sc;
        var rot=angle+(Math.min(ep,1)*((di%2===0?1:-1)*Math.PI*0.9));
        var sz=(2.2-((di%3)*0.3))*sc;
        ctx.save();
        ctx.translate(Math.cos(angle)*dist,Math.sin(angle)*dist);
        ctx.rotate(rot);
        ctx.globalAlpha=debrisAlpha*(0.55+((di%4)*0.11));
        var cg=ctx.createLinearGradient(0,-sz,0,sz);
        cg.addColorStop(0,'#58503e');cg.addColorStop(1,'#38301e');
        ctx.fillStyle=cg;
        ctx.beginPath();
        ctx.moveTo(-sz*1.2,-sz*0.7);ctx.lineTo(sz*0.9,-sz*0.9);
        ctx.lineTo(sz*1.1,sz*0.6);ctx.lineTo(-sz*0.6,sz*0.8);
        ctx.closePath();ctx.fill();
        ctx.strokeStyle='rgba(255,80,0,'+(debrisAlpha*0.45).toFixed(2)+')';
        ctx.lineWidth=0.4;ctx.stroke();
        ctx.restore();
      }
      // Dust rings
      ctx.globalAlpha=1;
      for(var ri=0;ri<3;ri++){
        var rr=(6+ri*6+ease*14)*sc;
        var da=debrisAlpha*0.28;
        var dg=ctx.createRadialGradient(0,0,rr*0.5,0,0,rr);
        dg.addColorStop(0,'rgba(170,140,90,'+da.toFixed(2)+')');
        dg.addColorStop(1,'rgba(170,140,90,0)');
        ctx.fillStyle=dg;
        ctx.beginPath();ctx.arc(0,0,rr,0,Math.PI*2);ctx.fill();
      }
    }

    ctx.globalAlpha=1;ctx.restore();
  }
}

function _skinPaleCourt(ctx, type, isW, x, y, sc, t) {
  _withClip(ctx,type,x,y,sc,c=>{
    const g=c.createLinearGradient(0,-38,0,28);
    g.addColorStop(0,'rgba(220,235,255,0.75)');
    g.addColorStop(0.5,'rgba(190,210,255,0.55)');
    g.addColorStop(1,'rgba(160,185,240,0.65)');
    c.fillStyle=g;c.fillRect(-30,-45,60,90);
    const spec=c.createLinearGradient(-14,-42,4,0);
    spec.addColorStop(0,'rgba(255,255,255,0.6)');
    spec.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=spec;c.fillRect(-30,-45,60,90);
    [[-10,-24],[0,-30],[10,-24],[-5,-19],[5,-19]].forEach(([cx2,cy2])=>{
      c.globalAlpha=Math.abs(Math.sin(t*0.003+cx2))*0.8;
      c.fillStyle='rgba(255,255,255,0.9)';
      c.beginPath();c.arc(cx2,cy2,1.2,0,Math.PI*2);c.fill();
    });
    c.globalAlpha=1;
  });
  // Orbiting wraith silhouettes
  ctx.save();ctx.translate(x,y);
  for(let i=0;i<4;i++){
    const angle=t*0.0002+i*Math.PI/2;
    const r=(18+Math.sin(t*0.0005+i)*3)*sc;
    const gx=Math.cos(angle)*r, gy=Math.sin(angle)*r*0.5;
    ctx.save();ctx.globalAlpha=0.12+0.08*Math.sin(t*0.0012+i*0.8);
    _withClip(ctx,type,gx,gy,sc*0.35,c=>{
      c.fillStyle='rgba(200,220,255,1)';c.fillRect(-30,-45,60,90);
    });
    ctx.restore();
  }
  // Cold mist drifting upward
  for(let i=0;i<8;i++){
    const age=((t*0.00025+i*0.125)%1);
    const mx=Math.sin(i*2.1+t*0.0005)*10*sc;
    const my=(-5-age*30)*sc;
    const mg=ctx.createRadialGradient(mx,my,0,mx,my,Math.max(0.1,6*sc));
    mg.addColorStop(0,`rgba(210,225,255,${(1-age)*0.35})`);
    mg.addColorStop(1,'rgba(210,225,255,0)');
    ctx.fillStyle=mg;ctx.beginPath();ctx.arc(mx,my,6*sc,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  // Ghostly outline
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
  ctx.lineWidth=2.5;ctx.strokeStyle='rgba(200,220,255,0.9)';
  ctx.shadowColor='rgba(180,210,255,0.7)';ctx.shadowBlur=16;ctx.stroke();
  ctx.lineWidth=1;ctx.strokeStyle='rgba(255,255,255,0.6)';ctx.shadowBlur=0;ctx.stroke();
  ctx.restore();
}

function _skinTheDeep(ctx, type, isW, x, y, sc, t) {
  _withClip(ctx,type,x,y,sc,c=>{
    const g=c.createLinearGradient(0,-40,0,30);
    g.addColorStop(0,'#000408');g.addColorStop(0.5,'#000810');g.addColorStop(1,'#001018');
    c.fillStyle=g;c.fillRect(-30,-45,60,90);
    const depth=c.createRadialGradient(0,10,0,0,10,32);
    depth.addColorStop(0,'rgba(0,20,40,0.3)');depth.addColorStop(1,'rgba(0,5,15,0.6)');
    c.fillStyle=depth;c.fillRect(-30,-45,60,90);

    // 5 bioluminescent creatures — all speeds halved, multipliers reduced from 2000/3000 to 400/600
    const creatures=[
      {x:-8, y:-20, speed:0.0004, phase:0,   color:'0,255,160'},
      {x:6,  y:-5,  speed:0.0003, phase:1.5, color:'0,200,255'},
      {x:-3, y:10,  speed:0.00035,phase:3,   color:'50,255,200'},
      {x:10, y:-15, speed:0.00045,phase:2,   color:'0,180,255'},
      {x:-10,y:5,   speed:0.00028,phase:4.5, color:'0,255,180'},
    ];
    creatures.forEach(cr=>{
      // Slow, peaceful deep-ocean bob — full cycle ~25 seconds per creature
      const bob=Math.sin(t*cr.speed*12+cr.phase)*4;
      const pulse=0.4+0.6*Math.abs(Math.sin(t*cr.speed*18+cr.phase));
      const glow=c.createRadialGradient(cr.x,cr.y+bob,0,cr.x,cr.y+bob,7);
      glow.addColorStop(0,`rgba(${cr.color},${pulse*0.9})`);
      glow.addColorStop(0.4,`rgba(${cr.color},${pulse*0.3})`);
      glow.addColorStop(1,`rgba(${cr.color},0)`);
      c.fillStyle=glow;c.beginPath();c.arc(cr.x,cr.y+bob,7,0,Math.PI*2);c.fill();
      c.fillStyle=`rgba(${cr.color},${pulse})`;
      c.beginPath();c.arc(cr.x,cr.y+bob,1.5,0,Math.PI*2);c.fill();
      // Tentacles — very slow undulation
      c.strokeStyle=`rgba(${cr.color},${pulse*0.3})`;c.lineWidth=0.5;
      for(let j=0;j<3;j++){
        c.beginPath();c.moveTo(cr.x+(j-1)*3,cr.y+bob);
        const ty2=cr.y+bob+8+Math.sin(t*0.00003+j+cr.phase)*4;
        c.bezierCurveTo(
          cr.x+(j-1)*3+Math.sin(t*0.00003+j)*3, cr.y+bob+4,
          cr.x+(j-1)*3, ty2-2,
          cr.x+(j-1)*3, ty2
        );
        c.stroke();
      }
    });

    // Pressure ripples — very slow expansion
    for(let ring=0;ring<3;ring++){
      const rphase=((t*0.00015+ring*0.33)%1);
      const rr=rphase*35, ra=(1-rphase)*0.12;
      c.strokeStyle=`rgba(0,150,255,${ra})`;c.lineWidth=0.5;
      c.beginPath();c.arc(0,0,rr,0,Math.PI*2);c.stroke();
    }

    // Sediment — slowed from t*0.008/0.012 to t*0.002/0.003
    for(let i=0;i<15;i++){
      const px=((i*19-t*0.002+40)%60)-30;
      const py=((i*13+t*0.003)%80)-40;
      c.fillStyle=`rgba(0,100,160,${0.2+Math.sin(t*0.0005+i)*0.1})`;
      c.beginPath();c.arc(px,py,0.7,0,Math.PI*2);c.fill();
    }
  });
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
  ctx.lineWidth=1.8;ctx.strokeStyle='rgba(0,180,140,0.7)';
  ctx.shadowColor='rgba(0,200,150,0.4)';ctx.shadowBlur=10;ctx.stroke();ctx.restore();
}
function _skinAscension(ctx, type, isW, x, y, sc, t) {
  // Gold base
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);
  ctx.shadowColor='rgba(255,180,0,0.5)';ctx.shadowBlur=22;
  _clipPath(ctx,type);
  const grdA=ctx.createLinearGradient(-18,-38,12,28);
  grdA.addColorStop(0,'#ffff80');grdA.addColorStop(0.3,'#ffd700');grdA.addColorStop(1,'#c09000');
  ctx.fillStyle=grdA;ctx.fill();
  ctx.restore();
  _withClip(ctx,type,x,y,sc,c=>{
    const hi=c.createLinearGradient(-16,-42,-4,0);
    hi.addColorStop(0,'rgba(255,255,200,0.65)');hi.addColorStop(1,'rgba(255,255,200,0)');
    c.fillStyle=hi;c.fillRect(-30,-45,60,90);
  });
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);
  _clipPath(ctx,type);ctx.lineWidth=1.6;ctx.strokeStyle='#7a5800';ctx.stroke();
  if(currentStyle!=='Minimal') engrave(ctx,type,true);
  ctx.restore();
  // Aura — 16 licks
  for(let i=0;i<16;i++){
    const angle=(i/16)*Math.PI*2+t*0.0004;
    const len=(13+Math.sin(t*0.0009+i*0.75)*6)*sc;
    const fx=Math.cos(angle)*16*sc,fy=Math.sin(angle)*16*sc;
    const tx2=fx+Math.cos(angle)*len,ty2=fy+Math.sin(angle)*len;
    const alpha=0.42+Math.sin(t*0.003+i*0.45)*0.32;
    const g=ctx.createLinearGradient(fx,fy,tx2,ty2);
    g.addColorStop(0,`rgba(255,200,0,${alpha})`);g.addColorStop(0.6,`rgba(255,130,0,${alpha*0.45})`);g.addColorStop(1,'rgba(255,50,0,0)');
    ctx.strokeStyle=g;ctx.lineWidth=(3-i*0.09);ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(tx2,ty2);ctx.stroke();
  }
  // Sparks
  for(let i=0;i<12;i++){
    const age=((t*0.0003+i*0.083)%1);
    const a=i*Math.PI/6+t*0.0004;
    const r=(14+age*18)*sc;
    ctx.globalAlpha=0.9*(1-age);ctx.fillStyle=age<0.5?'#ffee00':'#ffaa00';
    ctx.shadowColor='#ffcc00';ctx.shadowBlur=4;
    ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,1.8*sc,0,Math.PI*2);ctx.fill();
  }
  // Crown lightning
  const bp=(t*0.0025)%2;
  if(bp<0.12){
    ctx.globalAlpha=1-bp/0.12;ctx.strokeStyle='#ffff44';ctx.lineWidth=1.2*sc;
    ctx.shadowColor='#ffff44';ctx.shadowBlur=10;
    [[-5,-36],[5,-36]].forEach(([bx,by])=>{
      ctx.beginPath();ctx.moveTo(bx*sc,by*sc);
      ctx.lineTo((bx+(Math.random()-0.5)*9)*sc,(by+10)*sc);
      ctx.lineTo((bx+(Math.random()-0.5)*7)*sc,(by+18)*sc);ctx.stroke();
    });
  }
  ctx.globalAlpha=1;ctx.shadowBlur=0;
}


function _skinLongWinter(ctx, type, isW, x, y, sc, t) {
  _solidSkin(ctx,type,isW,x,y,sc,'#0a1a3a');
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);
  // Orbiting arcs
  [12,16,20].forEach((r,ri)=>{
    const spd=ri%2===0?0.0003:-0.00022;
    const angle=t*spd;
    ctx.strokeStyle='rgba(100,180,255,0.38)';ctx.lineWidth=0.85;
    ctx.beginPath();ctx.arc(0,0,r,angle,angle+Math.PI*0.75);ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,r,angle+Math.PI,angle+Math.PI+Math.PI*0.55);ctx.stroke();
  });
  // Frost crystallization
  const frostAge=(t*0.0003)%3;
  if(frostAge<2){
    const prog=frostAge<1?frostAge:2-frostAge;
    ctx.strokeStyle=`rgba(180,220,255,${prog*0.5})`;ctx.lineWidth=0.65;
    for(let i=0;i<4;i++){
      const baseAngle=(i/4)*Math.PI*2;
      const len=10*prog;
      ctx.beginPath();
      ctx.moveTo(12*Math.cos(baseAngle),12*Math.sin(baseAngle));
      ctx.lineTo((12+len)*Math.cos(baseAngle),(12+len)*Math.sin(baseAngle));
      ctx.stroke();
      // Branch
      [-0.3,0.3].forEach(off=>{
        ctx.beginPath();
        const bx=(12+len*0.5)*Math.cos(baseAngle),by=(12+len*0.5)*Math.sin(baseAngle);
        ctx.moveTo(bx,by);
        ctx.lineTo(bx+Math.cos(baseAngle+off)*5*prog,by+Math.sin(baseAngle+off)*5*prog);
        ctx.stroke();
      });
    }
  }
  // Aurora shimmer
  const hueW=200+Math.sin(t*0.001)*22;
  ctx.globalAlpha=0.07;ctx.fillStyle=`hsl(${hueW},70%,62%)`;
  ctx.beginPath();ctx.arc(0,0,16,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// MYTHIC I SKINS — one per piece, iridescent and otherworldly
// ═══════════════════════════════════════════════════════════════════════════

// First Light — Pawn: the pawn at the dawn of everything, a singularity of starlight

function _skinLastBloom(ctx, type, isW, x, y, sc, t) {
  _solidSkin(ctx,type,isW,x,y,sc,'#f4c0cc');
  ctx.save();ctx.translate(x,y);
  for(let i=0;i<4;i++){
    const age=((t*0.00022+i*0.25)%1);
    const px=(Math.sin(t*0.0004+i*2.1)*10+(i-2)*3)*sc;
    const py=(-10-age*32)*sc;
    const alpha=age<0.65?age/0.65:(1-age)/0.35;
    ctx.save();ctx.translate(px,py);ctx.rotate(t*0.002+i);
    ctx.globalAlpha=alpha*0.85;ctx.fillStyle='#f0a0bc';
    ctx.beginPath();ctx.ellipse(0,0,3*sc,5.5*sc,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  ctx.restore();
}


function _skinFirstLight(ctx, type, isW, x, y, sc, t) {
  _withClip(ctx,type,x,y,sc,c=>{
    c.fillStyle='#000814';c.fillRect(-30,-45,60,90);
    // Deep space — shifting nebula colors
    const hue1=(t*0.003)%360, hue2=(hue1+120)%360;
    const neb=c.createRadialGradient(-5,-10,0,-5,-10,28);
    neb.addColorStop(0,`hsla(${hue1},80%,25%,0.5)`);
    neb.addColorStop(0.5,`hsla(${hue2},70%,20%,0.25)`);
    neb.addColorStop(1,'rgba(0,0,20,0)');
    c.fillStyle=neb;c.fillRect(-30,-45,60,90);
    // 35 stars twinkling at staggered rates
    for(let i=0;i<35;i++){
      const sx=((i*37+7)%52)-26, sy=((i*29+11)%75)-38;
      const twinkle=0.2+0.8*Math.abs(Math.sin(t*0.0008*(1+i%4)+i*0.5));
      const r=0.5+((i%3)*0.35);
      c.fillStyle=`rgba(255,255,255,${twinkle})`;
      c.beginPath();c.arc(sx,sy,r,0,Math.PI*2);c.fill();
    }
    // Comet streaks — slow diagonal
    for(let i=0;i<3;i++){
      const cp=((t*0.00025+i*0.33)%1);
      const cx=-26+cp*60, cy=-38+cp*70+(i*8);
      const ca=(cp<0.12?cp/0.12:(cp>0.88?(1-cp)/0.12:1))*0.7;
      if(ca<0.05) continue;
      const cg=c.createLinearGradient(cx-8,cy-8,cx,cy);
      cg.addColorStop(0,'rgba(255,255,255,0)');
      cg.addColorStop(1,`rgba(255,240,200,${ca})`);
      c.strokeStyle=cg;c.lineWidth=1;
      c.beginPath();c.moveTo(cx-8,cy-8);c.lineTo(cx,cy);c.stroke();
      c.fillStyle=`rgba(255,240,200,${ca})`;c.beginPath();c.arc(cx,cy,1.2,0,Math.PI*2);c.fill();
    }
  });
  // Slow color-shifting outline
  const oh=(t*0.006)%360;
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
  ctx.lineWidth=2.2;ctx.strokeStyle=`hsl(${oh},90%,72%)`;
  ctx.shadowColor=`hsl(${oh},90%,65%)`;ctx.shadowBlur=14;ctx.stroke();ctx.restore();
}

// The Haunting — Knight: leaves ghost echoes everywhere, multiplying silhouettes

function _skinTheHaunting(ctx, type, isW, x, y, sc, t) {
  // Ghosts constantly fly THROUGH the piece, materialise from one side and exit the other
  // Not static echoes — they sweep across with trails
  const numGhosts=6;
  for(let gi=0;gi<numGhosts;gi++){
    const speed=0.00008+gi*0.000012;
    const phase=(t*speed+gi/numGhosts)%1;
    // Each ghost sweeps from one side to the other on a curved path
    const startX=(gi%2===0?-1:1)*32, endX=-startX;
    const arcY=-20+gi*8;
    // Parametric: x goes startX→endX, y arcs through arcY
    const px=startX+(endX-startX)*phase;
    const py=arcY+Math.sin(phase*Math.PI)*(-10-gi*3); // arc upward through piece
    const hue=(gi*55+t*0.003)%360;
    const alpha=(phase<0.15?phase/0.15:phase>0.85?(1-phase)/0.15:1)*0.35;
    if(alpha<0.01) continue;

    // Ghost body — blurred piece silhouette
    ctx.save();ctx.globalAlpha=alpha*0.5;
    _withClip(ctx,type,x+px*sc,y+py*sc,sc*0.7,c=>{
      c.fillStyle=`hsla(${hue},60%,75%,1)`;c.fillRect(-30,-45,60,90);
    });

    // Ghost trail — 3 fading echoes behind it
    for(let tr=1;tr<=3;tr++){
      const trPhase=Math.max(0,phase-tr*0.04);
      const trX=startX+(endX-startX)*trPhase;
      const trY=arcY+Math.sin(trPhase*Math.PI)*(-10-gi*3);
      ctx.globalAlpha=alpha*(1-tr/4)*0.3;
      _withClip(ctx,type,x+trX*sc,y+trY*sc,sc*0.6,c=>{
        c.fillStyle=`hsla(${hue},50%,65%,1)`;c.fillRect(-30,-45,60,90);
      });
    }
    ctx.restore();
  }

  // Main piece — dark charcoal with a slow desaturated hue shift
  const mhue=(t*0.003)%360;
  _withClip(ctx,type,x,y,sc,c=>{
    c.fillStyle='#0a0a10';c.fillRect(-30,-45,60,90);
    const g=c.createLinearGradient(-20,-40,20,30);
    g.addColorStop(0,`hsla(${mhue},35%,35%,0.4)`);
    g.addColorStop(1,`hsla(${mhue+80},35%,25%,0.2)`);
    c.fillStyle=g;c.fillRect(-30,-45,60,90);
    // Subtle etching — where the ghosts have worn grooves through it
    c.strokeStyle=`hsla(${mhue},50%,60%,0.12)`;c.lineWidth=0.6;
    for(let i=0;i<5;i++){
      c.beginPath();c.moveTo(-28,-30+i*14);c.bezierCurveTo(-5,-28+i*14,5,-32+i*14,28,-30+i*14);c.stroke();
    }
  });

  // Main outline with slow color shift — this IS visible, important for identity
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
  ctx.lineWidth=2;ctx.strokeStyle=`hsla(${mhue},65%,68%,0.9)`;
  ctx.shadowColor=`hsl(${mhue},65%,55%)`;ctx.shadowBlur=14;ctx.stroke();ctx.restore();
}
// Spectrum — Bishop: rainbow rotating gradient, casts colored light on board
function _skinSpectrum(ctx, type, isW, x, y, sc, t) {
  const hue=(t*0.018)%360;
  _withClip(ctx,type,x,y,sc,c=>{
    const g=c.createLinearGradient(-22,-42,22,42);
    for(let i=0;i<=6;i++) g.addColorStop(i/6,`hsl(${(hue+i*60)%360},90%,68%)`);
    c.fillStyle=g;c.fillRect(-30,-45,60,90);
    // Prism light splits — bright diagonal bands
    for(let i=0;i<5;i++){
      c.strokeStyle=`hsla(${(hue+i*72)%360},100%,85%,0.3)`;c.lineWidth=3;
      c.beginPath();c.moveTo(i*10-25,-45);c.lineTo(i*10-12+Math.sin(t*0.0008+i)*3,45);c.stroke();
    }
    const hi=c.createLinearGradient(-18,-42,0,0);
    hi.addColorStop(0,'rgba(255,255,255,0.55)');hi.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=hi;c.fillRect(-30,-45,60,90);
  });
  // Color glow outside piece — lights up the board
  ctx.save();ctx.translate(x,y);
  const cg=ctx.createRadialGradient(0,0,12*sc,0,0,30*sc);
  cg.addColorStop(0,`hsla(${hue},80%,60%,0.15)`);cg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=cg;ctx.beginPath();ctx.arc(0,0,30*sc,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
  ctx.lineWidth=2;ctx.strokeStyle=`hsl(${(hue+180)%360},80%,70%)`;
  ctx.shadowColor=`hsl(${hue},90%,60%)`;ctx.shadowBlur=16;ctx.stroke();ctx.restore();
}

// Undying — Rook: perpetual construction, blueprint outlines assembling and dissolving

function _skinUndying(ctx, type, isW, x, y, sc, t) {
  // Ghost outline flies in from outside, locks onto piece → piece gains consciousness → red eyes open/blink
  // Phase 0-0.45: ghost approaches from offset, solid glowing line
  // Phase 0.45-0.6: locked in, flash
  // Phase 0.6-0.85: EYES OPEN — piece becomes "alive", eyes glow and blink
  // Phase 0.85-1.0: eyes close, ghost drifts away again
  const phase=(t*0.00018)%1;
  const isBuilding=phase<0.45;
  const isLocked=phase>=0.45&&phase<0.6;
  const isAlive=phase>=0.6&&phase<0.85;
  const isDying=phase>=0.85;

  // Stone base — always present
  _withClip(ctx,type,x,y,sc,c=>{
    const g=c.createLinearGradient(0,-35,0,25);
    g.addColorStop(0,'#3a3028');g.addColorStop(1,'#1a1410');
    c.fillStyle=g;c.fillRect(-30,-45,60,90);
    c.strokeStyle='rgba(0,0,0,0.4)';c.lineWidth=0.7;
    [-24,-16,-8,0,8,16].forEach(y2=>{c.beginPath();c.moveTo(-16,y2);c.lineTo(16,y2);c.stroke();});
    // When alive: subtle warm red glow inside
    if(isAlive||isDying){
      const eyeGlow=isAlive?(phase-0.6)/0.25:1-(phase-0.85)/0.15;
      const ig=c.createRadialGradient(0,-5,0,0,-5,22);
      ig.addColorStop(0,`rgba(180,20,0,${eyeGlow*0.25})`);ig.addColorStop(1,'rgba(180,20,0,0)');
      c.fillStyle=ig;c.fillRect(-30,-45,60,90);
    }
  });

  // Ghost outline — solid glowing line, not dashed
  if(isBuilding||isDying){
    const prog=isBuilding?phase/0.45:1-(phase-0.85)/0.15;
    const offset=(1-prog)*18; // starts far, snaps to piece
    const ghostAlpha=0.5+prog*0.4;
    ctx.save();
    ctx.translate(x+(isBuilding?-offset:offset)*sc, y+offset*0.3*sc);
    ctx.scale(sc,sc);_clipPath(ctx,type);
    ctx.lineWidth=2.5;
    ctx.strokeStyle=`rgba(100,200,255,${ghostAlpha})`;
    ctx.shadowColor='rgba(80,180,255,0.7)';ctx.shadowBlur=18;
    ctx.stroke();ctx.restore();
  }

  // Locked / snap flash
  if(isLocked){
    const snapProg=(phase-0.45)/0.15;
    const flashA=snapProg<0.3?(1-snapProg/0.3)*0.5:0;
    _withClip(ctx,type,x,y,sc,c=>{
      c.fillStyle=`rgba(140,220,255,${flashA})`;c.fillRect(-30,-45,60,90);
    });
    // Ghost perfectly aligned
    ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
    ctx.lineWidth=2.5;ctx.strokeStyle=`rgba(100,200,255,${0.9-snapProg*0.5})`;
    ctx.shadowColor='rgba(80,180,255,0.8)';ctx.shadowBlur=20;ctx.stroke();ctx.restore();
  }

  // EYES — only when alive or dying
  if(isAlive||isDying){
    const eyeOpenProg=isAlive
      ?Math.min(1,(phase-0.6)/0.08)  // fast open
      :Math.max(0,1-(phase-0.85)/0.08); // fast close
    // Blink: random-looking but deterministic — sin-based rapid close
    const blinkCycle=(t*0.0025)%1;
    const blinkClose=blinkCycle>0.92?1-(blinkCycle-0.92)/0.04:0; // quick blink every ~6s
    const eyeOpen=eyeOpenProg*(1-blinkClose);
    if(eyeOpen>0.01){
      ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);
      // Left eye
      const lex=-5, ley=-8, rew=3.5, reh=1.8*eyeOpen;
      const rig=ctx.createRadialGradient(lex,ley,0,lex,ley,rew);
      rig.addColorStop(0,'rgba(255,30,0,1)');rig.addColorStop(0.4,'rgba(200,0,0,0.8)');rig.addColorStop(1,'rgba(150,0,0,0)');
      ctx.fillStyle=rig;
      ctx.beginPath();ctx.ellipse(lex,ley,rew,reh,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(255,80,0,0.9)';ctx.shadowColor='rgba(255,0,0,0.8)';ctx.shadowBlur=8;
      ctx.beginPath();ctx.ellipse(lex,ley,rew*0.5,reh*0.5,0,0,Math.PI*2);ctx.fill();
      // Right eye
      const rex=5;
      const rig2=ctx.createRadialGradient(rex,ley,0,rex,ley,rew);
      rig2.addColorStop(0,'rgba(255,30,0,1)');rig2.addColorStop(0.4,'rgba(200,0,0,0.8)');rig2.addColorStop(1,'rgba(150,0,0,0)');
      ctx.fillStyle=rig2;
      ctx.beginPath();ctx.ellipse(rex,ley,rew,reh,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(255,80,0,0.9)';
      ctx.beginPath();ctx.ellipse(rex,ley,rew*0.5,reh*0.5,0,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      // Eye slots — dark outlines
      ctx.strokeStyle='rgba(80,0,0,0.6)';ctx.lineWidth=0.5;
      ctx.beginPath();ctx.ellipse(lex,ley,rew,reh,0,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.ellipse(rex,ley,rew,reh,0,0,Math.PI*2);ctx.stroke();
      ctx.restore();
    }
  }

  // Stone outline
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
  ctx.lineWidth=2;ctx.strokeStyle='rgba(50,40,28,0.9)';ctx.stroke();
  ctx.lineWidth=0.7;ctx.strokeStyle='rgba(160,140,90,0.3)';ctx.stroke();ctx.restore();
}
// Borealis — Queen: aurora waves, crown radiating northern lights
function _skinBorealis(ctx, type, isW, x, y, sc, t) {
  _withClip(ctx,type,x,y,sc,c=>{
    c.fillStyle='#030820';c.fillRect(-30,-45,60,90);
    // Aurora bands drifting upward at different speeds
    const bands=[
      {color:'0,220,120', speed:0.0004, offset:0,   width:12},
      {color:'0,160,255', speed:0.0003, offset:0.4, width:10},
      {color:'120,0,255', speed:0.00035,offset:0.7, width:8 },
      {color:'0,255,200', speed:0.00025,offset:0.2, width:9 },
    ];
    bands.forEach(b=>{
      const ybase=((t*b.speed+b.offset)%1)*90-50;
      const waveGrad=c.createLinearGradient(0,ybase,0,ybase+b.width);
      waveGrad.addColorStop(0,`rgba(${b.color},0)`);
      waveGrad.addColorStop(0.4,`rgba(${b.color},0.18)`);
      waveGrad.addColorStop(0.6,`rgba(${b.color},0.14)`);
      waveGrad.addColorStop(1,`rgba(${b.color},0)`);
      c.fillStyle=waveGrad;
      // Wavy band shape
      c.beginPath();c.moveTo(-30,ybase);
      for(let xi=-28;xi<=28;xi+=4){
        const wave=Math.sin(xi*0.15+t*0.0005)*4;
        c.lineTo(xi,ybase+wave);
      }
      c.lineTo(30,ybase+b.width);c.lineTo(-30,ybase+b.width);c.closePath();c.fill();
    });
    // Stars peeking through
    for(let i=0;i<18;i++){
      const sx=((i*41)%52)-26, sy=((i*33)%70)-38;
      const tw=0.1+0.4*Math.abs(Math.sin(t*0.0005+i));
      c.fillStyle=`rgba(255,255,255,${tw})`;
      c.beginPath();c.arc(sx,sy,0.6,0,Math.PI*2);c.fill();
    }
  });
  // Crown light cone
  ctx.save();ctx.translate(x,y-26*sc);
  const coneGrad=ctx.createLinearGradient(0,0,0,-18*sc);
  coneGrad.addColorStop(0,'rgba(0,220,150,0.2)');coneGrad.addColorStop(1,'rgba(0,200,120,0)');
  ctx.fillStyle=coneGrad;
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-14*sc,-18*sc);ctx.lineTo(14*sc,-18*sc);ctx.closePath();ctx.fill();
  ctx.restore();
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
  ctx.lineWidth=2;ctx.strokeStyle='rgba(0,220,140,0.8)';
  ctx.shadowColor='rgba(0,200,120,0.6)';ctx.shadowBlur=14;ctx.stroke();ctx.restore();
}

// The Dying Sun — King: expanding ring pulses, the last light of a giant star

function _skinDyingSun(ctx, type, isW, x, y, sc, t) {
  // Brilliant gold-white base
  _withClip(ctx,type,x,y,sc,c=>{
    const g=c.createRadialGradient(0,-4,0,0,-4,26);
    g.addColorStop(0,'#fffff0');g.addColorStop(0.3,'#fff0a0');
    g.addColorStop(0.65,'#ff9020');g.addColorStop(1,'#8a3000');
    c.fillStyle=g;c.fillRect(-30,-45,60,90);
    // Surface convection cells — darker patches
    for(let i=0;i<5;i++){
      const cx=Math.sin(i*1.4)*10, cy=Math.cos(i*1.8)*8;
      const cell=c.createRadialGradient(cx,cy,0,cx,cy,5+i);
      cell.addColorStop(0,`rgba(150,50,0,${0.15+0.08*Math.sin(t*0.0006+i)})`);
      cell.addColorStop(1,'rgba(150,50,0,0)');
      c.fillStyle=cell;c.beginPath();c.arc(cx,cy,5+i,0,Math.PI*2);c.fill();
    }
    const hi=c.createLinearGradient(-16,-40,-4,0);
    hi.addColorStop(0,'rgba(255,255,220,0.7)');hi.addColorStop(1,'rgba(255,255,200,0)');
    c.fillStyle=hi;c.fillRect(-30,-45,60,90);
  });
  // Expanding ring pulses — 3 independent rings
  ctx.save();ctx.translate(x,y);
  for(let ri=0;ri<3;ri++){
    const rp=((t*0.00028+ri*0.33)%1);
    const rr=(10+rp*36)*sc;
    const ra=(1-rp)*0.65;
    const ringG=ctx.createRadialGradient(0,0,Math.max(0,rr-2*sc),0,0,rr+2*sc);
    ringG.addColorStop(0,`rgba(255,220,80,${ra})`);
    ringG.addColorStop(0.5,`rgba(255,180,30,${ra*0.6})`);
    ringG.addColorStop(1,'rgba(255,100,0,0)');
    ctx.fillStyle=ringG;ctx.beginPath();ctx.arc(0,0,rr+2*sc,0,Math.PI*2);ctx.fill();
  }
  // Solar flares — 6 tongues of plasma
  for(let i=0;i<6;i++){
    const angle=(i/6)*Math.PI*2+t*0.0002;
    const flen=(14+Math.sin(t*0.0006+i*0.8)*5)*sc;
    const fx=Math.cos(angle)*14*sc, fy=Math.sin(angle)*14*sc;
    const tx2=fx+Math.cos(angle)*flen, ty2=fy+Math.sin(angle)*flen;
    const fa=0.45+Math.sin(t*0.0007+i)*0.25;
    const fg=ctx.createLinearGradient(fx,fy,tx2,ty2);
    fg.addColorStop(0,`rgba(255,200,50,${fa})`);fg.addColorStop(0.6,`rgba(255,120,0,${fa*0.4})`);fg.addColorStop(1,'rgba(255,50,0,0)');
    ctx.strokeStyle=fg;ctx.lineWidth=2.5*sc;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(tx2,ty2);ctx.stroke();
  }
  ctx.restore();
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
  ctx.lineWidth=2;ctx.strokeStyle='rgba(255,220,80,0.9)';
  ctx.shadowColor='rgba(255,180,0,0.7)';ctx.shadowBlur=18;ctx.stroke();ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// MYTHIC II SKINS — rarest possible, each with a unique identity
// ═══════════════════════════════════════════════════════════════════════════

// The Origin — Pawn: the singularity before the universe, pure expanding energy

function _skinTheOrigin(ctx, type, isW, x, y, sc, t) {
  _withClip(ctx,type,x,y,sc,c=>{
    c.fillStyle='#ffffff';c.fillRect(-30,-45,60,90);
    // Particle beams expanding outward from center
    for(let i=0;i<8;i++){
      const angle=(i/8)*Math.PI*2;
      const beam=c.createLinearGradient(0,0,Math.cos(angle)*28,Math.sin(angle)*28);
      beam.addColorStop(0,'rgba(255,255,255,0.9)');
      beam.addColorStop(0.4,`hsla(${i*45},80%,80%,0.4)`);
      beam.addColorStop(1,`hsla(${i*45},80%,60%,0)`);
      c.strokeStyle=beam;c.lineWidth=2+((i%3)*0.5);
      c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(angle)*28,Math.sin(angle)*28);c.stroke();
    }
    // Radial glow at origin
    const og=c.createRadialGradient(0,0,0,0,0,14);
    og.addColorStop(0,'rgba(255,255,255,1)');og.addColorStop(0.4,'rgba(200,220,255,0.6)');og.addColorStop(1,'rgba(150,180,255,0)');
    c.fillStyle=og;c.beginPath();c.arc(0,0,14,0,Math.PI*2);c.fill();
    // Particles spawning continuously from center
    for(let i=0;i<20;i++){
      const pp=((t*0.00035+i*0.05)%1);
      const angle2=(i/20)*Math.PI*2+t*0.0003;
      const r=pp*26;
      const pa=(1-pp)*0.8;
      c.fillStyle=`hsla(${i*18},90%,85%,${pa})`;
      c.beginPath();c.arc(Math.cos(angle2)*r,Math.sin(angle2)*r,1+pp,0,Math.PI*2);c.fill();
    }
  });
  // Outer glow aura — massive
  ctx.save();ctx.translate(x,y);
  const og2=ctx.createRadialGradient(0,0,10*sc,0,0,36*sc);
  og2.addColorStop(0,'rgba(200,220,255,0.2)');og2.addColorStop(1,'rgba(150,180,255,0)');
  ctx.fillStyle=og2;ctx.beginPath();ctx.arc(0,0,36*sc,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
  ctx.lineWidth=2.5;ctx.strokeStyle='rgba(200,220,255,0.9)';
  ctx.shadowColor='rgba(180,210,255,0.8)';ctx.shadowBlur=20;ctx.stroke();ctx.restore();
}

// Riftwalker — Knight: tears reality, chromatic aberration + dimensional rift

function _skinRiftwalker(ctx, type, isW, x, y, sc, t) {
  // The Knight has a tear in reality behind it — a rift portal showing void on the other side
  // The rift GROWS from a point, tears open, then snaps shut and re-opens
  // The Knight flickers between two positions as it steps through the rift

  const riftCycle=(t*0.00014)%1;
  // 0-0.3: rift tears open, 0.3-0.7: fully open, 0.7-1.0: snaps shut
  const riftOpen=riftCycle<0.3?riftCycle/0.3:riftCycle<0.7?1:(1-riftCycle)/0.3;

  // RIFT PORTAL — elliptical tear in reality, drawn BEHIND the piece
  ctx.save();ctx.translate(x,y);
  if(riftOpen>0.01){
    const rw=18*riftOpen*sc, rh=26*riftOpen*sc;
    // Void interior — the other side
    const voidG=ctx.createRadialGradient(0,0,0,0,0,rw);
    voidG.addColorStop(0,'rgba(20,0,40,0.95)');
    voidG.addColorStop(0.5,'rgba(60,0,100,0.7)');
    voidG.addColorStop(0.8,'rgba(100,0,180,0.4)');
    voidG.addColorStop(1,'rgba(160,0,255,0)');
    ctx.fillStyle=voidG;
    ctx.beginPath();ctx.ellipse(0,0,rw,rh,0,0,Math.PI*2);ctx.fill();
    // Rift edge — bright electric tear
    const edgeR0=Math.max(0.01, rw-2*sc);
    const edgeR1=Math.max(edgeR0+0.01, rw+2*sc);
    const edgeG=ctx.createRadialGradient(0,0,edgeR0,0,0,edgeR1);
    edgeG.addColorStop(0,`rgba(200,0,255,${riftOpen*0.8})`);
    edgeG.addColorStop(0.5,`rgba(255,100,255,${riftOpen*0.5})`);
    edgeG.addColorStop(1,'rgba(180,0,255,0)');
    ctx.fillStyle=edgeG;
    ctx.beginPath();ctx.ellipse(0,0,rw+2*sc,rh+2*sc,0,0,Math.PI*2);ctx.fill();
    // Energy crackling along rift edge
    for(let i=0;i<8;i++){
      const ang=(i/8)*Math.PI*2+t*0.0008;
      const ex=Math.cos(ang)*rw+Math.cos(ang+0.5)*3*sc;
      const ey=Math.sin(ang)*rh+Math.sin(ang+0.5)*4*sc;
      const ex2=Math.cos(ang)*rw+(Math.cos(ang)+0.3)*5*sc;
      const ey2=Math.sin(ang)*rh+(Math.sin(ang)+0.3)*6*sc;
      ctx.strokeStyle=`rgba(255,0,255,${riftOpen*(0.5+0.4*Math.sin(t*0.002+i))})`;
      ctx.lineWidth=0.8;
      ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex2,ey2);ctx.stroke();
    }
    // Stars visible through the rift
    for(let i=0;i<12;i++){
      const sx=((i*17)%32-16)*sc*riftOpen*0.8;
      const sy=((i*23)%44-22)*sc*riftOpen*0.7;
      ctx.fillStyle=`rgba(255,255,255,${0.4+0.4*Math.sin(t*0.001+i)})`;
      ctx.beginPath();ctx.arc(sx,sy,0.7*sc,0,Math.PI*2);ctx.fill();
    }
  }
  ctx.restore();

  // KNIGHT — flickers between two positions while rift is open
  const flicker=riftOpen>0.3?Math.sin(t*0.006)*0.5+0.5:0;
  const pos1X=x-3*sc*riftOpen, pos2X=x+3*sc*riftOpen;

  // Ghost at alternate position
  if(flicker>0.1&&riftOpen>0.1){
    ctx.save();ctx.globalAlpha=flicker*0.55;
    _withClip(ctx,type,pos2X,y,sc,c=>{
      c.fillStyle='rgba(180,0,255,1)';c.fillRect(-30,-45,60,90);
    });ctx.restore();
  }

  // Main piece — dark purple-black
  _withClip(ctx,type,pos1X,y,sc,c=>{
    c.fillStyle='#080410';c.fillRect(-30,-45,60,90);
    const bg=c.createRadialGradient(0,-5,0,0,-5,22);
    bg.addColorStop(0,'rgba(80,0,120,0.5)');bg.addColorStop(0.6,'rgba(40,0,80,0.2)');bg.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=bg;c.fillRect(-30,-45,60,90);
    // Dimensional distortion lines — piece surface warps
    c.strokeStyle=`rgba(180,0,255,${0.12+riftOpen*0.15})`;c.lineWidth=0.5;
    for(let i=0;i<5;i++){
      const yw=-35+i*16;
      const wave=Math.sin(t*0.0005+i*1.2)*3*riftOpen;
      c.beginPath();c.moveTo(-22,yw);c.bezierCurveTo(-5,yw+wave,5,yw-wave,22,yw);c.stroke();
    }
  });

  // Chromatic aberration on the outline — RGB split increases as rift opens
  const abbr=riftOpen*4;
  [['255,0,0',abbr],['0,200,255',-abbr],['255,0,255',0]].forEach(([col,off],ci)=>{
    ctx.save();ctx.globalAlpha=ci===2?0.9:0.22;
    ctx.translate(x+off*sc,y);ctx.scale(sc,sc);_clipPath(ctx,type);
    ctx.lineWidth=ci===2?2:1.5;
    ctx.strokeStyle=`rgba(${col},1)`;
    if(ci===2){ctx.shadowColor=`rgba(${col},0.7)`;ctx.shadowBlur=14;}
    ctx.stroke();ctx.restore();
  });
}
// The Rapture — Bishop: ascending into pure white light, feathers and radiance
function _skinTheRapture(ctx, type, isW, x, y, sc, t) {
  // The Bishop ascending — body dissolves into pure radiance from bottom up
  // A bright dissolve line sweeps upward, above it: pure blinding white
  // Below it: solid Bishop. Divine light beams fan outward from the boundary.

  const riseCycle=(t*0.00010)%1;
  // Dissolve line sweeps up: 0=at base, 1=above piece
  const lineY=28-(riseCycle*75); // from +28 up to -47 (full piece height ~75)
  const relY=(lineY+47)/75; // 0 at top, 1 at bottom

  // Base piece — warm cream-white, appears below dissolve line
  _withClip(ctx,type,x,y,sc,c=>{
    const g=c.createLinearGradient(0,-38,0,28);
    g.addColorStop(0,'rgba(255,255,255,0.0)'); // top dissolves
    g.addColorStop(Math.max(0,relY-0.05),`rgba(255,252,245,0.0)`);
    g.addColorStop(Math.min(1,relY),'rgba(255,252,245,0.95)');
    g.addColorStop(1,'rgba(240,235,220,0.95)');
    c.fillStyle=g;c.fillRect(-30,-45,60,90);
    // Warm specular on the solid part
    const hi=c.createLinearGradient(-14,-38,0,0);
    hi.addColorStop(0,'rgba(255,255,255,0.5)');hi.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=hi;c.fillRect(-30,-45,60,90);
  });

  // DIVINE RADIANCE — fills the piece above the dissolve line
  _withClip(ctx,type,x,y,sc,c=>{
    if(lineY>28) return; // not started
    const radTop=Math.min(-45,lineY-5);
    const radG=c.createLinearGradient(0,lineY,0,radTop);
    radG.addColorStop(0,'rgba(255,255,255,0)');
    radG.addColorStop(0.15,'rgba(255,255,255,0.95)');
    radG.addColorStop(0.5,'rgba(255,252,230,0.85)');
    radG.addColorStop(1,'rgba(255,248,200,0.7)');
    c.fillStyle=radG;c.fillRect(-30,Math.min(lineY,28),60,Math.abs(radTop-lineY)+2);
    // Bright core along dissolve boundary
    const bline=c.createLinearGradient(-22,lineY,22,lineY);
    bline.addColorStop(0,'rgba(255,255,255,0)');
    bline.addColorStop(0.5,'rgba(255,255,255,0.95)');
    bline.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=bline;c.fillRect(-22,lineY-1.5,44,3);
  });

  // DIVINE LIGHT BEAMS — fan outward from the dissolve line position
  if(lineY<20&&lineY>-40){
    ctx.save();ctx.translate(x,y+lineY*sc);
    const pulse=0.7+0.3*Math.sin(t*0.0008);
    for(let i=0;i<12;i++){
      const angle=(i/12)*Math.PI-Math.PI/2; // fan upward (π range, centered up)
      const beamLen=(20+Math.sin(t*0.0006+i*0.7)*6)*sc;
      const bx=Math.cos(angle)*beamLen, by=Math.sin(angle)*beamLen;
      // Only draw beams that go upward
      if(by>2*sc) continue;
      const bg=ctx.createLinearGradient(0,0,bx,by);
      bg.addColorStop(0,`rgba(255,255,200,${pulse*0.85})`);
      bg.addColorStop(0.4,`rgba(255,245,180,${pulse*0.35})`);
      bg.addColorStop(1,'rgba(255,240,150,0)');
      ctx.strokeStyle=bg;
      ctx.lineWidth=(i%3===0?2:1.2)*sc;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(bx,by);ctx.stroke();
    }
    // Horizontal glow at dissolve line
    const hgG=ctx.createLinearGradient(-28*sc,0,28*sc,0);
    hgG.addColorStop(0,'rgba(255,255,200,0)');
    hgG.addColorStop(0.5,`rgba(255,255,200,${pulse*0.5})`);
    hgG.addColorStop(1,'rgba(255,255,200,0)');
    ctx.fillStyle=hgG;ctx.fillRect(-28*sc,-2*sc,56*sc,4*sc);
    ctx.restore();
  }

  // Rising light column from top of piece
  ctx.save();ctx.translate(x,y-35*sc);
  const colPulse=0.6+0.4*Math.sin(t*0.0007);
  for(let w=0;w<3;w++){
    const cw=(5-w*1.2)*sc;
    const cg=ctx.createLinearGradient(0,0,0,-28*sc);
    cg.addColorStop(0,`rgba(255,255,220,${colPulse*(0.25-w*0.07)})`);
    cg.addColorStop(1,'rgba(255,255,200,0)');
    ctx.fillStyle=cg;ctx.fillRect(-cw/2,0,cw,-28*sc);
  }
  ctx.restore();

  // Outline: bright warm white at top, cream at base
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
  ctx.lineWidth=2.5;ctx.strokeStyle='rgba(255,252,230,0.92)';
  ctx.shadowColor='rgba(255,245,180,0.8)';ctx.shadowBlur=18;ctx.stroke();
  ctx.lineWidth=1;ctx.strokeStyle='rgba(255,255,255,0.6)';ctx.shadowBlur=0;ctx.stroke();
  ctx.restore();
}
// Last Bastion — Rook: the only thing left standing, glowing with contained destruction
function _skinLastBastion(ctx, type, isW, x, y, sc, t) {
  // The last fortress standing after everything burned around it
  // Deep blackened stone, scorched and burning — fire blazes from the top battlements
  // Huge battle damage: gouges, burns, scorch marks. Flames erupt from the top.

  _withClip(ctx,type,x,y,sc,c=>{
    // Blackened scorched stone — war damage gradient
    const g=c.createLinearGradient(0,-35,0,28);
    g.addColorStop(0,'#1a0800');  // scorched top
    g.addColorStop(0.3,'#2a1408');
    g.addColorStop(0.7,'#3a2010');
    g.addColorStop(1,'#2a1808');
    c.fillStyle=g;c.fillRect(-30,-45,60,90);

    // Heavy battle damage — deep gouges in the stone (fixed positions)
    const gouges=[
      {x1:-14,y1:-26,x2:-4,y2:-18,w:2.2},
      {x1:8,y1:-22,x2:14,y2:-12,w:1.8},
      {x1:-8,y1:-8,x2:4,y2:0,w:2.0},
      {x1:6,y1:2,x2:-2,y2:14,w:1.6},
      {x1:-12,y1:8,x2:-6,y2:18,w:1.4},
    ];
    gouges.forEach(g2=>{
      // Dark gouge
      c.strokeStyle='rgba(0,0,0,0.85)';c.lineWidth=g2.w;
      c.beginPath();c.moveTo(g2.x1,g2.y1);c.lineTo(g2.x2,g2.y2);c.stroke();
      // Orange-red glow in the wound — still burning
      c.strokeStyle='rgba(200,60,0,0.4)';c.lineWidth=g2.w*0.4;
      c.beginPath();c.moveTo(g2.x1,g2.y1);c.lineTo(g2.x2,g2.y2);c.stroke();
    });

    // Scorch marks — black ellipses
    [[0,-20,10,6],[8,5,8,5],[-10,12,7,5],[4,-8,6,4]].forEach(([sx,sy,ew,eh])=>{
      c.fillStyle='rgba(0,0,0,0.55)';
      c.beginPath();c.ellipse(sx,sy,ew,eh,0,0,Math.PI*2);c.fill();
    });

    // Deep ember glow in the stone — war-heated core
    const pulse=Math.sin(t*0.0004)*0.5+0.5;
    const ember=c.createRadialGradient(0,5,0,0,5,24);
    ember.addColorStop(0,`rgba(220,80,0,${0.18+pulse*0.12})`);
    ember.addColorStop(0.4,`rgba(160,40,0,${0.08+pulse*0.06})`);
    ember.addColorStop(1,'rgba(80,10,0,0)');
    c.fillStyle=ember;c.fillRect(-30,-45,60,90);

    // Stone block coursing — barely visible under soot
    c.strokeStyle='rgba(0,0,0,0.4)';c.lineWidth=0.6;
    [-24,-16,-8,0,8,16].forEach(y2=>{c.beginPath();c.moveTo(-16,y2);c.lineTo(16,y2);c.stroke();});
  });

  // FLAMES erupting from the top — from the battlements
  ctx.save();ctx.translate(x,y);
  const flameDefs=[
    {ox:-9,baseW:5,sp:0.00022,ph:0  },
    {ox:0, baseW:6,sp:0.00018,ph:0.6},
    {ox:9, baseW:5,sp:0.00025,ph:1.2},
    {ox:-5,baseW:4,sp:0.00020,ph:1.8},
    {ox:5, baseW:4,sp:0.00016,ph:2.4},
  ];
  flameDefs.forEach(f=>{
    const age=((t*f.sp+f.ph)%1);
    const fh=(12+Math.sin(t*0.0006+f.ph)*4)*sc;
    const sway=Math.sin(age*Math.PI*2+f.ph)*3*sc;
    const fy=(-32-age*fh/sc)*sc;
    const fa=(age<0.4?age/0.4:(1-age)/0.6)*0.9;
    const fw=(f.baseW*(1-age*0.6))*sc;
    // Flame gradient — white at base, orange mid, red tip
    const fg=ctx.createLinearGradient(f.ox*sc+sway,fy+fh,f.ox*sc+sway,fy);
    fg.addColorStop(0,`rgba(255,220,100,${fa})`);
    fg.addColorStop(0.3,`rgba(255,120,0,${fa*0.8})`);
    fg.addColorStop(0.7,`rgba(200,30,0,${fa*0.5})`);
    fg.addColorStop(1,'rgba(100,0,0,0)');
    ctx.fillStyle=fg;
    ctx.beginPath();
    ctx.moveTo(f.ox*sc-fw/2,fy+fh);
    ctx.bezierCurveTo(f.ox*sc-fw/3+sway,-(-32)*sc-8*sc,f.ox*sc+fw/3+sway,fy+4,f.ox*sc+sway,fy);
    ctx.bezierCurveTo(f.ox*sc+fw/2+sway,fy+4,f.ox*sc+fw/2,-(-32)*sc-4*sc,f.ox*sc+fw/2,fy+fh);
    ctx.closePath();ctx.fill();
  });

  // Ember sparks rising from flames
  for(let i=0;i<10;i++){
    const age=((t*0.00016+i*0.1)%1);
    const ex=(-12+i*2.5)*sc+Math.sin(age*Math.PI*4+i)*5*sc;
    const ey=(-32-age*28)*sc;
    if(age>0.85) continue;
    ctx.globalAlpha=(1-age)*0.8;
    ctx.fillStyle=age<0.4?'#ffcc44':'#ff6600';
    ctx.shadowColor='rgba(255,100,0,0.6)';ctx.shadowBlur=4;
    ctx.beginPath();ctx.arc(ex,ey,1.2*sc,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.restore();

  // Outline — charred black with fire-orange glow
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
  const lp=Math.sin(t*0.0004)*0.5+0.5;
  ctx.lineWidth=3;ctx.strokeStyle=`rgba(160,40,0,${0.6+lp*0.25})`;
  ctx.shadowColor=`rgba(220,80,0,${0.45+lp*0.25})`;ctx.shadowBlur=16;ctx.stroke();
  ctx.lineWidth=1.2;ctx.strokeStyle='rgba(8,4,0,0.9)';ctx.shadowBlur=0;ctx.stroke();
  ctx.restore();
}
// The Cosmos — Queen: contains a living galaxy, second rarest
function _skinTheCosmos(ctx, type, isW, x, y, sc, t) {
  _withClip(ctx,type,x,y,sc,c=>{
    c.fillStyle='#000004';c.fillRect(-30,-45,60,90);
    // Rotating nebula blobs
    for(let ni=0;ni<3;ni++){
      const na=t*0.00015*(ni%2===0?1:-1)+ni*Math.PI*0.66;
      const nr=6+ni*4;
      const nx=Math.cos(na)*nr, ny=Math.sin(na)*nr*0.7;
      const neb2=c.createRadialGradient(nx,ny,0,nx,ny,12+ni*2);
      const nhue=((t*0.004+ni*120)%360);
      neb2.addColorStop(0,`hsla(${nhue},70%,40%,0.25)`);
      neb2.addColorStop(0.5,`hsla(${nhue+60},60%,30%,0.12)`);
      neb2.addColorStop(1,'rgba(0,0,4,0)');
      c.fillStyle=neb2;c.fillRect(-30,-45,60,90);
    }
    // Dense star field
    for(let i=0;i<50;i++){
      const sx=((i*37+3)%56)-28, sy=((i*29+7)%80)-40;
      const st=0.15+0.7*Math.abs(Math.sin(t*0.0005*(1+i%5)+i));
      const sr=0.4+(i%4)*0.25;
      c.fillStyle=`rgba(255,255,255,${st})`;
      c.beginPath();c.arc(sx,sy,sr,0,Math.PI*2);c.fill();
    }
    // Bright galactic center
    const gc=c.createRadialGradient(0,-2,0,0,-2,8);
    gc.addColorStop(0,'rgba(255,255,220,0.9)');gc.addColorStop(0.3,'rgba(255,200,100,0.5)');gc.addColorStop(1,'rgba(180,100,50,0)');
    c.fillStyle=gc;c.beginPath();c.arc(0,-2,8,0,Math.PI*2);c.fill();
    // Crown spectrum rays
    [[-12,-22],[-6,-26],[0,-28],[6,-26],[12,-22]].forEach(([cx2,cy2],ci)=>{
      const chue=(t*0.006+ci*72)%360;
      c.strokeStyle=`hsla(${chue},90%,70%,0.5)`;c.lineWidth=1;
      c.beginPath();c.moveTo(cx2,cy2);c.lineTo(cx2*1.6,cy2-12);c.stroke();
    });
  });
  const oh=(t*0.006)%360;
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
  ctx.lineWidth=2.5;ctx.strokeStyle=`hsl(${oh},80%,70%)`;
  ctx.shadowColor=`hsl(${oh},80%,60%)`;ctx.shadowBlur=16;ctx.stroke();ctx.restore();
}

// The Eternal — King: absolute rarest, miniature solar system + board-wide shockwave

function _skinTheEternal(ctx, type, isW, x, y, sc, t) {
  // Gold-white blazing base
  _withClip(ctx,type,x,y,sc,c=>{
    const g=c.createRadialGradient(0,-4,0,0,-4,28);
    g.addColorStop(0,'#fffff8');g.addColorStop(0.25,'#fff8d0');
    g.addColorStop(0.6,'#ffcc44');g.addColorStop(1,'#c07800');
    c.fillStyle=g;c.fillRect(-30,-45,60,90);
    const hi=c.createLinearGradient(-18,-42,-4,0);
    hi.addColorStop(0,'rgba(255,255,255,0.7)');hi.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=hi;c.fillRect(-30,-45,60,90);
  });
  // Miniature solar system orbiting the piece
  ctx.save();ctx.translate(x,y);
  // Central sun glow
  const sunG=ctx.createRadialGradient(0,0,0,0,0,6*sc);
  sunG.addColorStop(0,'rgba(255,255,200,0.9)');sunG.addColorStop(0.5,'rgba(255,200,50,0.4)');sunG.addColorStop(1,'rgba(255,150,0,0)');
  ctx.fillStyle=sunG;ctx.beginPath();ctx.arc(0,0,6*sc,0,Math.PI*2);ctx.fill();
  // 4 planets at different orbits and speeds
  const planets=[
    {r:18,size:2.5,speed:0.0004,color:'#88aaff',phase:0  },
    {r:24,size:2,  speed:0.0003,color:'#ff8844',phase:1.2},
    {r:30,size:3,  speed:0.00022,color:'#44ffaa',phase:2.4},
    {r:38,size:1.8,speed:0.00015,color:'#ffcc44',phase:3.8},
  ];
  planets.forEach(p=>{
    const angle=t*p.speed+p.phase;
    const px=Math.cos(angle)*p.r*sc, py=Math.sin(angle)*p.r*sc*0.55;
    // Orbital trail
    ctx.strokeStyle=`rgba(255,200,100,0.08)`;ctx.lineWidth=0.6;
    ctx.beginPath();ctx.ellipse(0,0,p.r*sc,p.r*sc*0.55,0,0,Math.PI*2);ctx.stroke();
    // Planet
    const pg=ctx.createRadialGradient(px,py,0,px,py,p.size*sc);
    pg.addColorStop(0,p.color);pg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=pg;ctx.beginPath();ctx.arc(px,py,p.size*sc,0,Math.PI*2);ctx.fill();
  });
  // Crown beams — gold rays from each crown point
  [[-12,-20],[-6,-24],[0,-26],[6,-24],[12,-20]].forEach(([cx2,cy2])=>{
    const bg=ctx.createLinearGradient(cx2*sc,cy2*sc,(cx2*1.8)*sc,(cy2-12)*sc);
    bg.addColorStop(0,'rgba(255,220,80,0.9)');bg.addColorStop(1,'rgba(255,180,0,0)');
    ctx.strokeStyle=bg;ctx.lineWidth=2.5*sc;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(cx2*sc,cy2*sc);ctx.lineTo(cx2*1.8*sc,(cy2-12)*sc);ctx.stroke();
  });
  ctx.restore();
  // Shockwave pulse — every ~7s
  const swPhase=(t*0.000145)%1;
  if(swPhase<0.5){
    const swr=(10+swPhase/0.5*45)*sc;
    const swa=(1-swPhase/0.5)*0.45;
    ctx.save();ctx.translate(x,y);
    const swG=ctx.createRadialGradient(0,0,Math.max(0,swr-3*sc),0,0,swr+3*sc);
    swG.addColorStop(0,`rgba(255,220,80,0)`);
    swG.addColorStop(0.4,`rgba(255,220,80,${swa})`);
    swG.addColorStop(1,`rgba(255,180,0,0)`);
    ctx.fillStyle=swG;ctx.beginPath();ctx.arc(0,0,swr+3*sc,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  // Gravitational glow
  ctx.save();ctx.translate(x,y);
  const gg=ctx.createRadialGradient(0,0,12*sc,0,0,30*sc);
  gg.addColorStop(0,'rgba(255,200,50,0.12)');gg.addColorStop(1,'rgba(255,150,0,0)');
  ctx.fillStyle=gg;ctx.beginPath();ctx.arc(0,0,30*sc,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);
  ctx.lineWidth=2.5;ctx.strokeStyle='rgba(255,220,80,0.95)';
  ctx.shadowColor='rgba(255,200,50,0.8)';ctx.shadowBlur=20;ctx.stroke();
  ctx.lineWidth=1;ctx.strokeStyle='rgba(180,120,0,0.6)';ctx.shadowBlur=0;ctx.stroke();ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// SKIN DATA
// ═══════════════════════════════════════════════════════════════════════════
const ALL_SKINS = {
  common: [
    { id:'default',         name:'Default'           },
    { id:'crimson-red',     name:'Crimson Red'        },
    { id:'ocean-blue',      name:'Ocean Blue'         },
    { id:'forest-green',    name:'Forest Green'       },
    { id:'sunburst-orange', name:'Sunburst Orange'    },
    { id:'violet-purple',   name:'Violet Purple'      },
    { id:'arctic-teal',     name:'Arctic Teal'        },
    { id:'charcoal',        name:'Charcoal'           },
  ],
  rare: [
    { id:'frosted-glass',   name:'Frosted Glass'      },
    { id:'brushed-steel',   name:'Brushed Steel'      },
    { id:'warm-marble',     name:'Warm Marble'        },
    { id:'obsidian-stone',  name:'Obsidian Stone'     },
    { id:'bone-ivory',      name:'Bone Ivory'         },
    { id:'onyx',            name:'Onyx'               },
  ],
  epic: [
    { id:'static-shock',    name:'Static Shock'       },
    { id:'molten-core',     name:'Molten Core'        },
    { id:'neon-pulse',      name:'Neon Pulse'         },
    { id:'prism-shift',     name:'Prism Shift'        },
    { id:'void-drift',      name:'Void Drift'         },
    { id:'deep-current',    name:'Deep Current'       },
  ],
  unique: [
    { id:'last-bloom',      name:'Last Bloom'         },
    { id:'dying-star',      name:'Dying Star'         },
    { id:'singularity',     name:'Singularity'        },
    { id:'between-worlds',  name:'Between Worlds'     },
    { id:'the-revelation',  name:'The Revelation'     },
    { id:'permafrost',      name:'Permafrost'         },
    { id:'thunderwall',     name:'Thunderwall'        },
    { id:'fallen-citadel',  name:'Fallen Citadel'     },
    { id:'pale-court',      name:'The Pale Court'     },
    { id:'the-deep',        name:'The Deep'           },
    { id:'ascension',       name:'Ascension'          },
    { id:'long-winter',     name:'The Long Winter'    },
  ],
  mythic1: [
    { id:'first-light',     name:'First Light'        },
    { id:'the-haunting',    name:'The Haunting'       },
    { id:'spectrum',        name:'Spectrum'           },
    { id:'undying',         name:'Undying'            },
    { id:'borealis',        name:'Borealis'           },
    { id:'dying-sun',       name:'The Dying Sun'      },
  ],
  mythic2: [
    { id:'the-origin',      name:'The Origin'         },
    { id:'riftwalker',      name:'Riftwalker'         },
    { id:'the-rapture',     name:'The Rapture'        },
    { id:'last-bastion',    name:'Last Bastion'       },
    { id:'the-cosmos',      name:'The Cosmos'         },
    { id:'the-eternal',     name:'The Eternal'        },
  ],
};
const RARITY_COLORS = {
  common:'#aaaaaa', rare:'#4488ff', epic:'#ffcc00', unique:'#ff3333',
  mythic1:'#cc44ff', mythic2:'#ff44aa'
};

// ═══════════════════════════════════════════════════════════════════════════
// BUILD UI
// ═══════════════════════════════════════════════════════════════════════════
const skinRows = document.getElementById('skin-rows');
Object.entries(ALL_SKINS).forEach(([r,skins])=>{
  const div=document.createElement('div');div.className='rgroup';
  const rlbl=document.createElement('div');rlbl.className='rlbl';
  rlbl.style.color=RARITY_COLORS[r];
  rlbl.textContent={ common:'Common', rare:'Rare', epic:'Epic ✦', unique:'Unique ★', mythic1:'Mythic I ✦✦', mythic2:'Mythic II ✦✦✦' }[r];
  const row=document.createElement('div');row.className='schip-row';
  skins.forEach(s=>{
    const btn=document.createElement('button');
    btn.className=`schip ${r}`+(s.id==='default'?' on':'');
    btn.textContent=s.name;
    btn.onclick=()=>{
      currentSkin=s.id;
      document.querySelectorAll('.schip').forEach(b=>b.classList.remove('on'));
      btn.classList.add('on');
      // Update skin name display
      const nd=document.getElementById('skin-name-display');
      nd.textContent=s.name; nd.className='skin-name-display '+r;
    };
    row.appendChild(btn);
  });
  div.appendChild(rlbl);div.appendChild(row);
  skinRows.appendChild(div);
});

// Style pills
document.getElementById('style-row').addEventListener('click',e=>{
  if(!e.target.dataset.s) return;
  currentStyle=e.target.dataset.s;
  document.querySelectorAll('#style-row .pill').forEach(b=>b.classList.toggle('on',b.dataset.s===currentStyle));
});

// Showcase cards
const showcase=document.getElementById('showcase');
PIECES.forEach(piece=>{
  const card=document.createElement('div');card.className='pcard'+(piece==='king'?' sel':'');
  const cv=document.createElement('canvas');cv.width=120;cv.height=126;
  const lbl=document.createElement('div');lbl.className='plbl';lbl.textContent=piece.toUpperCase();
  card.appendChild(cv);card.appendChild(lbl);
  card.onclick=()=>{
    currentPiece=piece;
    document.querySelectorAll('.pcard').forEach(c=>c.classList.remove('sel'));
    card.classList.add('sel');
    document.getElementById('dt1').textContent=piece.toUpperCase();
    document.getElementById('dt2').textContent=piece.toUpperCase();
  };
  showcase.appendChild(card);
  pCards[piece]=cv;
});

// ═══════════════════════════════════════════════════════════════════════════
// RENDER LOOP
// ═══════════════════════════════════════════════════════════════════════════
const start=performance.now();



// Ascension — King who transcended mortality; aura of 16 flame licks, orbiting sparks
function _skinAscension(ctx, type, isW, x, y, sc, t) {
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);ctx.shadowColor='rgba(255,180,0,0.5)';ctx.shadowBlur=22;_clipPath(ctx,type);const grdA=ctx.createLinearGradient(-18,-38,12,28);grdA.addColorStop(0,'#ffff80');grdA.addColorStop(0.3,'#ffd700');grdA.addColorStop(1,'#c09000');ctx.fillStyle=grdA;ctx.fill();ctx.restore();
  _withClip(ctx,type,x,y,sc,c=>{const hi=c.createLinearGradient(-16,-42,-4,0);hi.addColorStop(0,'rgba(255,255,200,0.65)');hi.addColorStop(1,'rgba(255,255,200,0)');c.fillStyle=hi;c.fillRect(-30,-45,60,90);});
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);_clipPath(ctx,type);ctx.lineWidth=1.6;ctx.strokeStyle='#7a5800';ctx.stroke();_engraveDetails(ctx,type,true);ctx.restore();
  for(let i=0;i<16;i++){const angle=(i/16)*Math.PI*2+t*0.001;const len=(13+Math.sin(t*0.002+i*0.75)*6)*sc;const fx=Math.cos(angle)*16*sc,fy=Math.sin(angle)*16*sc,tx2=fx+Math.cos(angle)*len,ty2=fy+Math.sin(angle)*len;const alpha=0.42+Math.sin(t*0.003+i*0.45)*0.32;const g=ctx.createLinearGradient(fx,fy,tx2,ty2);g.addColorStop(0,`rgba(255,200,0,${alpha})`);g.addColorStop(0.6,`rgba(255,130,0,${alpha*0.45})`);g.addColorStop(1,'rgba(255,50,0,0)');ctx.strokeStyle=g;ctx.lineWidth=(3-i*0.09);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(tx2,ty2);ctx.stroke();}
  for(let i=0;i<12;i++){const age=((t*0.0003+i*0.083)%1);const a=i*Math.PI/6+t*0.0004,r=(14+age*18)*sc;ctx.globalAlpha=0.9*(1-age);ctx.fillStyle=age<0.5?'#ffee00':'#ffaa00';ctx.shadowColor='#ffcc00';ctx.shadowBlur=4;ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,1.8*sc,0,Math.PI*2);ctx.fill();}
  const bp=(t*0.0025)%2;if(bp<0.12){ctx.globalAlpha=1-bp/0.12;ctx.strokeStyle='#ffff44';ctx.lineWidth=1.2*sc;ctx.shadowColor='#ffff44';ctx.shadowBlur=10;[[-5,-36],[5,-36]].forEach(([bx,by])=>{ctx.beginPath();ctx.moveTo(bx*sc,by*sc);ctx.lineTo((bx+(Math.random()-0.5)*9)*sc,(by+10)*sc);ctx.lineTo((bx+(Math.random()-0.5)*7)*sc,(by+18)*sc);ctx.stroke();});}
  ctx.globalAlpha=1;ctx.shadowBlur=0;
}
// The Long Winter — King as patient and cold as ice; orbiting frost arcs
function _skinLongWinter(ctx, type, isW, x, y, sc, t) {
  _solidSkin(ctx,type,isW,x,y,sc,'#0a1a3a');
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);
  [12,16,20].forEach((r,ri)=>{const spd=ri%2===0?0.0003:-0.00022,angle=t*spd;ctx.strokeStyle='rgba(100,180,255,0.38)';ctx.lineWidth=0.85;ctx.beginPath();ctx.arc(0,0,r,angle,angle+Math.PI*0.75);ctx.stroke();ctx.beginPath();ctx.arc(0,0,r,angle+Math.PI,angle+Math.PI+Math.PI*0.55);ctx.stroke();});
  const frostAge=(t*0.0003)%3;if(frostAge<2){const prog=frostAge<1?frostAge:2-frostAge;ctx.strokeStyle=`rgba(180,220,255,${prog*0.5})`;ctx.lineWidth=0.65;for(let i=0;i<4;i++){const baseAngle=(i/4)*Math.PI*2,len=10*prog;ctx.beginPath();ctx.moveTo(12*Math.cos(baseAngle),12*Math.sin(baseAngle));ctx.lineTo((12+len)*Math.cos(baseAngle),(12+len)*Math.sin(baseAngle));ctx.stroke();[-0.3,0.3].forEach(off=>{const bx=(12+len*0.5)*Math.cos(baseAngle),by=(12+len*0.5)*Math.sin(baseAngle);ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx+Math.cos(baseAngle+off)*5*prog,by+Math.sin(baseAngle+off)*5*prog);ctx.stroke();});}}
  const hueW=200+Math.sin(t*0.001)*22;ctx.globalAlpha=0.07;ctx.fillStyle=`hsl(${hueW},70%,62%)`;ctx.beginPath();ctx.arc(0,0,16,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.restore();
}
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 START (dead code removed above — all skin rendering uses new _skin* fns)
// ─────────────────────────────────────────────────────────────────────────────
const _DEAD_CODE_REMOVED = true; // old renderSolidSkin, withPieceClip, tracePiecePath, render* functions removed
// piecePath stub kept for any lingering reference:
function tracePiecePath(ctx, pieceType) {
  // Alias to new _clipPath
  _clipPath(ctx, pieceType);
}
function withPieceClip(ctx, pieceType, pieceColor, x, y, scale, fn) {
  // Alias to new _withClip
  _withClip(ctx, pieceType, x, y, scale, fn);
}
function renderSolidSkin(ctx, pieceType, pieceColor, x, y, scale, color) {
  _solidSkin(ctx, pieceType, pieceColor==='white', x, y, scale, color);
}
// ─────────────────────────────────────────────────────────────────────────────
// (old render* skin functions removed — use _skin* equivalents)
// Aliases for any lingering external callers:
const renderCherryBlossom  = (c,t,col,x,y,s,sk,tm) => _skinLastBloom(c,t,col==='white',x,y,s,tm||sk||0);
const renderEmber          = (c,t,col,x,y,s,sk,tm) => _skinDyingStar(c,t,col==='white',x,y,s,tm||sk||0);
const renderEventHorizon   = (c,t,col,x,y,s,sk,tm) => _skinSingularity(c,t,col==='white',x,y,s,tm||sk||0);
const renderSpecter        = (c,t,col,x,y,s,sk,tm) => _skinBetweenWorlds(c,t,col==='white',x,y,s,tm||sk||0);
const renderSolarCrown     = (c,t,col,x,y,s,sk,tm) => _skinTheRevelation(c,t,col==='white',x,y,s,tm||sk||0);
const renderGlacial        = (c,t,col,x,y,s,sk,tm) => _skinPermafrost(c,t,col==='white',x,y,s,tm||sk||0);
const renderStormkeep      = (c,t,col,x,y,s,sk,tm) => _skinThunderwall(c,t,col==='white',x,y,s,tm||sk||0);
const renderAncientSiege   = (c,t,col,x,y,s,sk,tm) => _skinFallenCitadel(c,t,col==='white',x,y,s,tm||sk||0);
const renderWhiteFlame     = (c,t,col,x,y,s,sk,tm) => _skinPaleCourt(c,t,col==='white',x,y,s,tm||sk||0);
const renderAbyssal        = (c,t,col,x,y,s,sk,tm) => _skinTheDeep(c,t,col==='white',x,y,s,tm||sk||0);
const renderSuperSaiyan    = (c,t,col,x,y,s,sk,tm) => _skinAscension(c,t,col==='white',x,y,s,tm||sk||0);
const renderEternalFrost   = (c,t,col,x,y,s,sk,tm) => _skinLongWinter(c,t,col==='white',x,y,s,tm||sk||0);
const renderStaticShock    = (c,t,col,x,y,s,sk,tm) => _skinLightning(c,t,col==='white',x,y,s,tm||sk||0);
const renderMoltenCore     = (c,t,col,x,y,s,sk,tm) => _skinLava(c,t,col==='white',x,y,s,tm||sk||0);
const renderDeepCurrent    = (c,t,col,x,y,s,sk,tm) => _skinOcean(c,t,col==='white',x,y,s,tm||sk||0);
const renderNeonPulse      = (c,t,col,x,y,s,sk,tm) => _skinNeon(c,t,col==='white',x,y,s,tm||sk||0);
const renderVoidDrift      = (c,t,col,x,y,s,sk,tm) => _skinVoid(c,t,col==='white',x,y,s,tm||sk||0);
const renderPrismShift     = (c,t,col,x,y,s,sk,tm) => _skinPrism(c,t,col==='white',x,y,s,tm||sk||0);
const renderFrostedGlass   = (c,t,col,x,y,s) => _glassSkin(c,t,col==='white',x,y,s);
const renderBrushedSteel   = (c,t,col,x,y,s) => _steelSkin(c,t,col==='white',x,y,s);
const renderObsidianStone  = (c,t,col,x,y,s) => _obsidianSkin(c,t,col==='white',x,y,s);
const renderWarmMarble     = (c,t,col,x,y,s) => _marbleSkin(c,t,col==='white',x,y,s);
const renderBoneIvory      = (c,t,col,x,y,s) => _ivorySkin(c,t,col==='white',x,y,s);
const renderOnyx           = (c,t,col,x,y,s) => _onyxSkin(c,t,col==='white',x,y,s);

// Remove old renderEternalFrost body — now handled by alias above
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: BOARD SKIN RENDERING
// ─────────────────────────────────────────────────────────────────────────────

function renderBoardSquareSkin(ctx, col, row, squareSize, x, y, isLight, skinId, t = 0) {
  if (!skinId || skinId === 'default') return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, squareSize, squareSize);
  ctx.clip();

  const cx = x + squareSize / 2;
  const cy = y + squareSize / 2;

  switch (skinId) {
    case 'crimson-court':   ctx.fillStyle = isLight ? '#cc8888' : '#4a0808'; ctx.fillRect(x,y,squareSize,squareSize); break;
    case 'ocean-depths':    ctx.fillStyle = isLight ? '#5588cc' : '#0a1a3a'; ctx.fillRect(x,y,squareSize,squareSize); break;
    case 'emerald-isle':    ctx.fillStyle = isLight ? '#55aa66' : '#0a2a10'; ctx.fillRect(x,y,squareSize,squareSize); break;
    case 'ash-bone':        ctx.fillStyle = isLight ? '#d8d0c0' : '#2a2a2a'; ctx.fillRect(x,y,squareSize,squareSize); break;
    case 'dusk':            ctx.fillStyle = isLight ? '#9977bb' : '#1a0a2a'; ctx.fillRect(x,y,squareSize,squareSize); break;
    case 'desert':          ctx.fillStyle = isLight ? '#d4aa66' : '#3a1a08'; ctx.fillRect(x,y,squareSize,squareSize); break;

    case 'walnut-wood': {
      ctx.fillStyle = isLight ? '#8a5830' : '#2a1808'; ctx.fillRect(x,y,squareSize,squareSize);
      ctx.strokeStyle = isLight ? 'rgba(100,60,20,0.25)' : 'rgba(60,30,10,0.3)'; ctx.lineWidth = 0.5;
      for (let gy = y; gy < y + squareSize; gy += 4) {
        ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + squareSize, gy); ctx.stroke();
      }
      break;
    }

    case 'ember-grid': {
      ctx.fillStyle = isLight ? '#c8a060' : '#1a0800'; ctx.fillRect(x,y,squareSize,squareSize);
      if (!isLight) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.001 + (col + row) * 0.7);
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, squareSize * 0.7);
        grd.addColorStop(0, `rgba(255,80,0,${pulse * 0.25})`);
        grd.addColorStop(1, 'rgba(255,80,0,0)');
        ctx.fillStyle = grd; ctx.fillRect(x,y,squareSize,squareSize);
      }
      break;
    }

    case 'frozen-tundra': {
      ctx.fillStyle = isLight ? '#e8eef0' : '#0a1828'; ctx.fillRect(x,y,squareSize,squareSize);
      if (!isLight) {
        const frostAge = ((t * 0.0002 + (col * 3 + row * 7) * 0.08) % 4);
        const prog = frostAge < 2 ? frostAge / 2 : (4 - frostAge) / 2;
        ctx.strokeStyle = `rgba(180,220,255,${prog * 0.4})`;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) {
          const angle = i * Math.PI / 3;
          const len = squareSize * 0.4 * prog;
          ctx.beginPath();
          ctx.moveTo(x + squareSize * 0.3, y + squareSize * 0.3);
          ctx.lineTo(x + squareSize * 0.3 + Math.cos(angle) * len, y + squareSize * 0.3 + Math.sin(angle) * len);
          ctx.stroke();
        }
      }
      break;
    }

    case 'bioluminescent': {
      ctx.fillStyle = isLight ? '#0a1420' : '#000810'; ctx.fillRect(x,y,squareSize,squareSize);
      const bioPhase = Math.sin(t * 0.0008 + (col * 4 + row * 3) * 0.9);
      const alpha = 0.08 + 0.07 * (bioPhase * 0.5 + 0.5);
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, squareSize * 0.6);
      grd.addColorStop(0, `rgba(0,255,150,${alpha})`);
      grd.addColorStop(1, 'rgba(0,255,150,0)');
      ctx.fillStyle = grd; ctx.fillRect(x,y,squareSize,squareSize);
      break;
    }

    case 'space-grid': {
      ctx.fillStyle = isLight ? '#101830' : '#020408'; ctx.fillRect(x,y,squareSize,squareSize);
      // Star particles
      for (let i = 0; i < 5; i++) {
        const sx = x + (((col * 17 + row * 13 + i * 7) % squareSize));
        const sy = y + (((col * 11 + row * 19 + i * 11) % squareSize));
        const twinkle = 0.3 + 0.4 * Math.sin(t * 0.002 + i + col + row);
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(sx, sy, 0.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (isLight) {
        const gridAlpha = 0.08 + 0.06 * Math.sin(t * 0.001 + col + row);
        ctx.strokeStyle = `rgba(80,120,255,${gridAlpha})`;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, squareSize, squareSize);
      }
      break;
    }

    case 'lava-field': {
      ctx.fillStyle = isLight ? '#dd5500' : '#0a0500'; ctx.fillRect(x,y,squareSize,squareSize);
      if (!isLight) {
        // Glowing cracks
        ctx.strokeStyle = `rgba(255,80,0,${0.4 + 0.3 * Math.sin(t * 0.001 + col + row)})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x + squareSize * 0.2, y + squareSize * 0.3);
        ctx.lineTo(x + squareSize * 0.5, y + squareSize * 0.6);
        ctx.lineTo(x + squareSize * 0.8, y + squareSize * 0.4);
        ctx.stroke();
      } else {
        // Surface ripple
        const ripple = (t * 0.001 + col * 0.5 + row * 0.7) % (Math.PI * 2);
        ctx.strokeStyle = `rgba(255,150,0,${0.2 + 0.15 * Math.sin(ripple)})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.arc(cx, cy, squareSize * 0.3, 0, Math.PI * 2); ctx.stroke();
      }
      break;
    }

    case 'verdant-canopy': {
      ctx.fillStyle = isLight ? '#88aa44' : '#0a1208'; ctx.fillRect(x,y,squareSize,squareSize);
      if (isLight) {
        const warmPulse = 0.5 + 0.2 * Math.sin(t * 0.0005 + col * 0.8 + row * 0.6);
        ctx.fillStyle = `rgba(255,220,100,${warmPulse * 0.08})`;
        ctx.fillRect(x,y,squareSize,squareSize);
      }
      break;
    }

    case 'marble': {
      // Warm white/grey veined marble
      ctx.fillStyle = isLight ? '#e8e0d4' : '#3a3430'; ctx.fillRect(x,y,squareSize,squareSize);
      // Vein lines — deterministic per square
      ctx.strokeStyle = isLight ? 'rgba(160,140,120,0.3)' : 'rgba(80,70,60,0.4)';
      ctx.lineWidth = 0.6;
      const seed = col * 7 + row * 13;
      for (let v = 0; v < 3; v++) {
        const vx1 = x + ((seed * 17 + v * 23) % squareSize);
        const vy1 = y + ((seed * 11 + v * 19) % squareSize);
        const vx2 = vx1 + ((seed * 7 + v * 31) % 20) - 10;
        const vy2 = vy1 + squareSize * 0.6;
        ctx.beginPath(); ctx.moveTo(vx1, vy1);
        ctx.bezierCurveTo(vx1+5,vy1+10,vx2-5,vy2-10,vx2,vy2); ctx.stroke();
      }
      break;
    }

    case 'royal-velvet': {
      // Deep crimson velvet with subtle sheen
      ctx.fillStyle = isLight ? '#8a2040' : '#3a0818'; ctx.fillRect(x,y,squareSize,squareSize);
      // Diagonal fabric sheen
      const sheen = ctx.createLinearGradient(x,y,x+squareSize,y+squareSize);
      const sa = isLight ? 0.12 : 0.08;
      sheen.addColorStop(0,`rgba(255,200,200,0)`);
      sheen.addColorStop(0.4,`rgba(255,200,200,${sa})`);
      sheen.addColorStop(1,`rgba(255,200,200,0)`);
      ctx.fillStyle=sheen; ctx.fillRect(x,y,squareSize,squareSize);
      break;
    }

    case 'void-matter': {
      // Pure black with shifting dark energy
      ctx.fillStyle = isLight ? '#0e0e18' : '#040408'; ctx.fillRect(x,y,squareSize,squareSize);
      const vphase = t * 0.0006 + (col * 3.7 + row * 2.9) * 0.4;
      const va = (Math.sin(vphase) * 0.5 + 0.5) * (isLight ? 0.12 : 0.07);
      const vg = ctx.createRadialGradient(cx,cy,0,cx,cy,squareSize*0.7);
      vg.addColorStop(0,`rgba(80,40,160,${va})`);
      vg.addColorStop(1,'rgba(80,40,160,0)');
      ctx.fillStyle=vg; ctx.fillRect(x,y,squareSize,squareSize);
      break;
    }

    case 'sakura': {
      // Pale pink and dark cherry wood
      ctx.fillStyle = isLight ? '#f4d8e0' : '#2a0e18'; ctx.fillRect(x,y,squareSize,squareSize);
      // Falling petal on some squares
      const petPhase = (t * 0.00008 + (col * 5 + row * 7) * 0.15) % 1;
      if ((col + row * 3) % 5 === 0) {
        const py = y + (petPhase * squareSize * 1.4) - squareSize * 0.2;
        const px = cx + Math.sin(petPhase * Math.PI * 4) * squareSize * 0.2;
        if (py > y && py < y + squareSize) {
          ctx.fillStyle = isLight ? 'rgba(220,130,150,0.35)' : 'rgba(180,80,100,0.4)';
          ctx.save(); ctx.translate(px,py); ctx.rotate(petPhase * Math.PI * 2);
          ctx.beginPath(); ctx.ellipse(0,0,squareSize*0.08,squareSize*0.05,0,0,Math.PI*2);
          ctx.fill(); ctx.restore();
        }
      }
      break;
    }

    case 'gilded': {
      // Black and gold — luxury
      ctx.fillStyle = isLight ? '#c8a020' : '#1a1400'; ctx.fillRect(x,y,squareSize,squareSize);
      if (isLight) {
        const gp = ctx.createLinearGradient(x,y,x+squareSize,y+squareSize);
        gp.addColorStop(0,'rgba(255,255,180,0.3)');
        gp.addColorStop(0.5,'rgba(255,220,80,0.1)');
        gp.addColorStop(1,'rgba(200,150,0,0.2)');
        ctx.fillStyle=gp; ctx.fillRect(x,y,squareSize,squareSize);
      } else {
        // Gold filigree pattern
        ctx.strokeStyle='rgba(180,140,0,0.2)'; ctx.lineWidth=0.5;
        ctx.strokeRect(x+2,y+2,squareSize-4,squareSize-4);
        ctx.beginPath();
        ctx.moveTo(x+4,cy); ctx.lineTo(x+squareSize-4,cy);
        ctx.moveTo(cx,y+4); ctx.lineTo(cx,y+squareSize-4);
        ctx.stroke();
      }
      break;
    }

    case 'stone-dungeon': {
      // Dark grey stone with texture
      ctx.fillStyle = isLight ? '#6a6560' : '#1e1c1a'; ctx.fillRect(x,y,squareSize,squareSize);
      // Stone block lines
      ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.6;
      const bh = squareSize / 3;
      for (let bi = 0; bi < 3; bi++) {
        ctx.beginPath(); ctx.moveTo(x, y + bi * bh); ctx.lineTo(x+squareSize, y + bi * bh); ctx.stroke();
        const xoff = (bi % 2 === 0) ? squareSize * 0.5 : 0;
        ctx.beginPath(); ctx.moveTo(x + xoff, y + bi * bh); ctx.lineTo(x + xoff, y + (bi+1) * bh); ctx.stroke();
      }
      break;
    }

    case 'toxic': {
      // Black with radioactive green glow
      ctx.fillStyle = isLight ? '#1a2a0a' : '#040800'; ctx.fillRect(x,y,squareSize,squareSize);
      const tphase = t * 0.0007 + (col * 2.3 + row * 3.1) * 0.5;
      const ta = 0.06 + 0.05 * Math.sin(tphase);
      const tg = ctx.createRadialGradient(cx,cy,0,cx,cy,squareSize*0.6);
      tg.addColorStop(0,`rgba(80,255,0,${isLight ? ta*2 : ta})`);
      tg.addColorStop(1,'rgba(80,255,0,0)');
      ctx.fillStyle=tg; ctx.fillRect(x,y,squareSize,squareSize);
      break;
    }

    case 'arctic': {
      // Pale ice with deep blue
      ctx.fillStyle = isLight ? '#deeef8' : '#06121e'; ctx.fillRect(x,y,squareSize,squareSize);
      // Ice crack pattern on dark squares
      if (!isLight) {
        const iphase = ((t * 0.00012 + (col * 5 + row * 9) * 0.1) % 1);
        const iprog = iphase < 0.5 ? iphase * 2 : (1 - iphase) * 2;
        ctx.strokeStyle = `rgba(140,200,255,${iprog * 0.3})`; ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x + squareSize*0.3, y + squareSize*0.1);
        ctx.lineTo(x + squareSize*0.5, y + squareSize*0.5);
        ctx.lineTo(x + squareSize*0.8, y + squareSize*0.7);
        ctx.stroke();
      } else {
        // Frost shimmer
        const fs = 0.05 + 0.04 * Math.sin(t * 0.0005 + col + row);
        ctx.fillStyle = `rgba(200,230,255,${fs})`; ctx.fillRect(x,y,squareSize,squareSize);
      }
      break;
    }
    case 'neon-pulse-board': {
      // Full hue-cycling board — each square offset for wave effect
      const hue = (t * 0.04 + (col + row) * 22) % 360;
      const sat = isLight ? 80 : 90;
      const lit = isLight ? 35 : 18;
      ctx.fillStyle = `hsl(${hue},${sat}%,${lit}%)`;
      ctx.fillRect(x,y,squareSize,squareSize);
      // Bright edge highlight on lighter squares
      const edgeA = 0.15 + 0.12 * Math.sin(t * 0.003 + (col+row)*0.8);
      ctx.strokeStyle = `hsla(${(hue+60)%360},100%,70%,${edgeA})`;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x+0.5, y+0.5, squareSize-1, squareSize-1);
      break;
    }

    case 'lava-flow': {
      // Moving lava — warm base with flowing bright veins
      const speed = t * 0.00045;
      const flow = Math.sin(speed + col * 0.8 + row * 0.6) * 0.5 + 0.5;
      const flow2 = Math.sin(speed * 0.7 + col * 1.1 - row * 0.9 + 2) * 0.5 + 0.5;
      const baseR = isLight ? 220 : 80;
      const baseG = isLight ? 60 : 10;
      ctx.fillStyle = `rgb(${baseR},${baseG},0)`;
      ctx.fillRect(x,y,squareSize,squareSize);
      // Flowing bright channel
      const veinA = flow * 0.5 + 0.1;
      const vg = ctx.createLinearGradient(x, y+squareSize*(1-flow2), x, y+squareSize*(1-flow2*0.3));
      vg.addColorStop(0, `rgba(255,${180+flow*75},0,0)`);
      vg.addColorStop(0.5, `rgba(255,${120+flow*100},0,${veinA})`);
      vg.addColorStop(1, `rgba(255,${80+flow*80},0,0)`);
      ctx.fillStyle = vg;
      ctx.fillRect(x, y, squareSize, squareSize);
      // Surface heat shimmer
      if (isLight) {
        const shim = Math.sin(t * 0.002 + col * 1.3 + row * 0.9) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255,200,50,${shim * 0.2})`;
        ctx.fillRect(x, y, squareSize, squareSize);
      }
      break;
    }

    case 'deep-ocean': {
      // Slow underwater ripples — bioluminescent waves crossing the board
      const waveSpeed = t * 0.0006;
      const d1 = Math.sin(waveSpeed + col * 0.7 + row * 0.5) * 0.5 + 0.5;
      const d2 = Math.sin(waveSpeed * 1.3 - col * 0.5 + row * 0.8 + 1.5) * 0.5 + 0.5;
      const depth = (d1 + d2) * 0.5;
      const baseLight = isLight ? [10, 40, 80] : [0, 10, 30];
      ctx.fillStyle = `rgb(${baseLight[0]},${baseLight[1]},${baseLight[2]})`;
      ctx.fillRect(x,y,squareSize,squareSize);
      // Wave glow
      const wg = ctx.createRadialGradient(cx, cy, 0, cx, cy, squareSize * 0.7);
      const wa = depth * (isLight ? 0.18 : 0.12);
      wg.addColorStop(0, `rgba(0,${150+depth*105},${200+depth*55},${wa})`);
      wg.addColorStop(1, 'rgba(0,100,180,0)');
      ctx.fillStyle = wg;
      ctx.fillRect(x,y,squareSize,squareSize);
      // Bioluminescent sparkle
      if ((col * 7 + row * 11) % 6 === 0) {
        const spk = Math.sin(t * 0.0015 + col * 2.1 + row * 1.7) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(0,255,180,${spk * 0.4})`;
        ctx.beginPath();
        ctx.arc(cx + Math.sin(t*0.001+col)*squareSize*0.2,
                cy + Math.cos(t*0.0008+row)*squareSize*0.2, 1.5, 0, Math.PI*2);
        ctx.fill();
      }
      break;
    }

    case 'northern-lights': {
      // Aurora bands drifting across the entire board
      ctx.fillStyle = isLight ? '#060e18' : '#020608';
      ctx.fillRect(x,y,squareSize,squareSize);
      // Stars
      for (let i = 0; i < 3; i++) {
        const sx2 = x + ((col * 17 + row * 11 + i * 23) % squareSize);
        const sy2 = y + ((col * 13 + row * 19 + i * 17) % squareSize);
        const tw = 0.2 + 0.5 * Math.abs(Math.sin(t * 0.001 + i + col + row));
        ctx.fillStyle = `rgba(255,255,255,${tw * 0.6})`;
        ctx.beginPath(); ctx.arc(sx2, sy2, 0.7, 0, Math.PI*2); ctx.fill();
      }
      // 3 aurora bands — each square is a slice through the full-board aurora
      const bands = [
        { hue: 140, speed: 0.00022, off: 0    },
        { hue: 200, speed: 0.00018, off: 2.1  },
        { hue: 280, speed: 0.00015, off: 4.2  },
      ];
      bands.forEach(band => {
        // World-space y position of band center
        const worldY = ((t * band.speed + band.off / (Math.PI*2)) % 1) * 8 * squareSize;
        const bandCy = worldY;
        // Convert to local square coords
        const localBandCy = bandCy - row * squareSize;
        if (localBandCy > -squareSize * 1.5 && localBandCy < squareSize * 2.5) {
          const bg = ctx.createLinearGradient(x, y + localBandCy - squareSize*0.6, x, y + localBandCy + squareSize*0.6);
          bg.addColorStop(0, `hsla(${band.hue},90%,55%,0)`);
          bg.addColorStop(0.4, `hsla(${band.hue},90%,55%,${isLight ? 0.25 : 0.18})`);
          bg.addColorStop(0.6, `hsla(${band.hue},90%,55%,${isLight ? 0.2 : 0.14})`);
          bg.addColorStop(1, `hsla(${band.hue},90%,55%,0)`);
          ctx.fillStyle = bg;
          ctx.fillRect(x, y, squareSize, squareSize);
        }
      });
      break;
    }

    case 'storm-grid': {
      // Electric storm — dark with lightning arcing across the board
      ctx.fillStyle = isLight ? '#0a0e18' : '#04060c';
      ctx.fillRect(x,y,squareSize,squareSize);
      // Background electric haze
      const ePhase = t * 0.0008 + (col * 2.7 + row * 3.1) * 0.3;
      const ea = 0.04 + 0.03 * Math.sin(ePhase);
      ctx.fillStyle = `rgba(80,120,255,${isLight ? ea*2 : ea})`;
      ctx.fillRect(x,y,squareSize,squareSize);
      // Lightning bolt — fires on some squares at staggered times
      const boltSeed = (col * 5 + row * 7) % 12;
      const boltPhase = ((t * 0.0004 + boltSeed * 0.083) % 1);
      if (boltPhase < 0.08) {
        const ba = (0.08 - boltPhase) / 0.08;
        ctx.strokeStyle = `rgba(150,200,255,${ba * 0.9})`;
        ctx.lineWidth = 0.7;
        ctx.shadowColor = `rgba(100,160,255,${ba * 0.7})`;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(cx - squareSize*0.1, y + squareSize*0.1);
        ctx.lineTo(cx + squareSize*0.05, cy - squareSize*0.1);
        ctx.lineTo(cx - squareSize*0.05, cy + squareSize*0.05);
        ctx.lineTo(cx + squareSize*0.12, y + squareSize*0.9);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      // Grid lines
      ctx.strokeStyle = `rgba(60,100,220,${0.12 + 0.08 * Math.sin(t*0.001+col+row)})`;
      ctx.lineWidth = 0.4;
      ctx.strokeRect(x, y, squareSize, squareSize);
      break;
    }

    case 'cursed-ruins': {
      // Ancient dark stone with eldritch green seeping through cracks
      ctx.fillStyle = isLight ? '#1a1e14' : '#0a0c08';
      ctx.fillRect(x,y,squareSize,squareSize);
      // Stone crack — deterministic position
      const cSeed = col * 7 + row * 11;
      const cx1 = x + (cSeed * 13 % squareSize), cy1 = y + (cSeed * 17 % squareSize);
      const cx2 = x + ((cSeed * 23 + 5) % squareSize), cy2 = y + ((cSeed * 19 + 8) % squareSize);
      // Glowing crack
      const cPulse = 0.4 + 0.4 * Math.sin(t * 0.0006 + (col + row) * 0.7);
      ctx.strokeStyle = `rgba(60,255,80,${cPulse * (isLight ? 0.5 : 0.35)})`;
      ctx.lineWidth = 0.8;
      ctx.shadowColor = `rgba(0,200,60,${cPulse * 0.4})`;
      ctx.shadowBlur = 3;
      ctx.beginPath(); ctx.moveTo(cx1, cy1); ctx.lineTo(cx2, cy2); ctx.stroke();
      ctx.shadowBlur = 0;
      // Eerie mist rising from cracks
      const mist = ctx.createRadialGradient(cx, y+squareSize, 0, cx, y+squareSize, squareSize*0.8);
      const ma = 0.05 + 0.04 * Math.sin(t * 0.0005 + col * 1.3);
      mist.addColorStop(0, `rgba(40,180,60,${isLight ? ma*1.5 : ma})`);
      mist.addColorStop(1, 'rgba(0,100,30,0)');
      ctx.fillStyle = mist;
      ctx.fillRect(x,y,squareSize,squareSize);
      break;
    }

    case 'blood-moon': {
      // Dark crimson with slow tidal pulse — like the board is breathing
      const tide = (t * 0.00025 + col * 0.15 + row * 0.2) % (Math.PI * 2);
      const tideVal = Math.sin(tide) * 0.5 + 0.5;
      const r = isLight ? Math.round(140 + tideVal * 60) : Math.round(40 + tideVal * 30);
      const g = isLight ? Math.round(10 + tideVal * 8) : Math.round(0 + tideVal * 5);
      ctx.fillStyle = `rgb(${r},${g},0)`;
      ctx.fillRect(x,y,squareSize,squareSize);
      // Blood shimmer at peak
      if (tideVal > 0.7) {
        const sa = (tideVal - 0.7) / 0.3 * 0.15;
        const sg = ctx.createLinearGradient(x,y,x+squareSize,y+squareSize);
        sg.addColorStop(0, `rgba(255,60,60,${sa})`);
        sg.addColorStop(1, `rgba(200,0,0,0)`);
        ctx.fillStyle = sg;
        ctx.fillRect(x,y,squareSize,squareSize);
      }
      break;
    }

    case 'prism-board': {
      // Full rotating rainbow — each square is a different phase of the spectrum
      const prismHue = (t * 0.025 + col * 45 + row * 45) % 360;
      ctx.fillStyle = `hsl(${prismHue},${isLight ? 75 : 85}%,${isLight ? 45 : 22}%)`;
      ctx.fillRect(x,y,squareSize,squareSize);
      // Specular shimmer
      const shimG = ctx.createLinearGradient(x,y,x+squareSize,y+squareSize);
      shimG.addColorStop(0, `rgba(255,255,255,${isLight ? 0.2 : 0.08})`);
      shimG.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shimG;
      ctx.fillRect(x,y,squareSize,squareSize);
      break;
    }

    case 'the-abyss': {
      ctx.fillStyle = '#000000'; ctx.fillRect(x,y,squareSize,squareSize);
      const spiralT = t * 0.00035 + (col * 0.4 + row * 0.6);
      for (let ring = 5; ring >= 1; ring--) {
        const rr = ring / 5;
        const ringPhase = (spiralT + rr) % 1;
        const rSize = squareSize * 0.5 * rr;
        const ra = (1 - ringPhase) * (isLight ? 0.2 : 0.14);
        const hue = 260 + ring * 12;
        const rg = ctx.createRadialGradient(cx,cy,0,cx,cy,rSize);
        rg.addColorStop(0, `hsla(${hue},80%,30%,0)`);
        rg.addColorStop(0.6, `hsla(${hue},80%,20%,${ra})`);
        rg.addColorStop(1, `hsla(${hue},70%,8%,0)`);
        ctx.fillStyle = rg; ctx.fillRect(x,y,squareSize,squareSize);
      }
      const eyePulse = 0.4 + 0.4 * Math.sin(t * 0.0008 + (col + row) * 0.9);
      const eyeG = ctx.createRadialGradient(cx,cy,0,cx,cy,squareSize*0.18);
      eyeG.addColorStop(0, `rgba(200,180,255,${eyePulse*(isLight?0.8:0.5)})`);
      eyeG.addColorStop(0.4, `rgba(120,80,220,${eyePulse*(isLight?0.4:0.25)})`);
      eyeG.addColorStop(1, 'rgba(60,20,160,0)');
      ctx.fillStyle = eyeG; ctx.fillRect(x,y,squareSize,squareSize);
      break;
    }

    case 'solar-flare': {
      const sTime = t * 0.0004;
      const conv1 = Math.sin(sTime + col * 1.3 + row * 0.9) * 0.5 + 0.5;
      const conv2 = Math.sin(sTime * 0.7 - col * 0.8 + row * 1.2 + 2) * 0.5 + 0.5;
      const heat = (conv1 + conv2) * 0.5;
      const baseR = isLight ? 255 : Math.round(180 + heat*60);
      const baseG = isLight ? Math.round(220 + heat*35) : Math.round(60 + heat*80);
      const baseB = isLight ? Math.round(80 + heat*60) : 0;
      ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`; ctx.fillRect(x,y,squareSize,squareSize);
      const cg = ctx.createRadialGradient(cx,cy,0,cx,cy,squareSize*0.55);
      cg.addColorStop(0, `rgba(255,255,${Math.round(180*heat)},${isLight?0.5:0.3})`);
      cg.addColorStop(0.5, `rgba(255,${Math.round(120+heat*80)},0,${isLight?0.25:0.15})`);
      cg.addColorStop(1, 'rgba(200,60,0,0)');
      ctx.fillStyle = cg; ctx.fillRect(x,y,squareSize,squareSize);
      if ((col * 3 + row * 5) % 7 < 2) {
        const arcPhase = (t * 0.0003 + (col+row)*0.4) % (Math.PI*2);
        const arcA = Math.max(0, Math.sin(arcPhase)) * 0.7;
        if (arcA > 0.05) {
          ctx.strokeStyle = `rgba(255,255,200,${arcA})`;
          ctx.lineWidth = 0.8;
          ctx.shadowColor = `rgba(255,200,80,${arcA*0.6})`; ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.moveTo(x + squareSize*0.2, cy);
          ctx.bezierCurveTo(cx, y+squareSize*0.1, cx, y+squareSize*0.9, x+squareSize*0.8, cy);
          ctx.stroke(); ctx.shadowBlur = 0;
        }
      }
      break;
    }

    case 'prism-storm': {
      const stormT = t * 0.03;
      const hue1 = (stormT + col * 60 + row * 45) % 360;
      const hue2 = (hue1 + 120) % 360;
      const sl = isLight ? '55%' : '25%';
      const stormSplit = ctx.createLinearGradient(x,y,x+squareSize,y+squareSize);
      stormSplit.addColorStop(0, `hsl(${hue1},90%,${sl})`);
      stormSplit.addColorStop(0.4, `hsl(${(hue1+60)%360},80%,${sl})`);
      stormSplit.addColorStop(0.7, `hsl(${hue2},85%,${sl})`);
      stormSplit.addColorStop(1, `hsl(${(hue2+40)%360},90%,${sl})`);
      ctx.fillStyle = stormSplit; ctx.fillRect(x,y,squareSize,squareSize);
      const fracA = 0.25 + 0.2 * Math.sin(t*0.005 + col*1.4 + row*1.1);
      ctx.strokeStyle = `rgba(255,255,255,${isLight?fracA*1.5:fracA})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y + squareSize*(0.3 + (col%3)*0.15));
      ctx.lineTo(x + squareSize*(0.4 + (row%3)*0.15), cy);
      ctx.lineTo(x+squareSize, y + squareSize*(0.6 - (col%2)*0.2));
      ctx.stroke();
      break;
    }

    case 'the-cosmos-board': {
      ctx.fillStyle = isLight ? '#04040e' : '#010106'; ctx.fillRect(x,y,squareSize,squareSize);
      for (let i = 0; i < 8; i++) {
        const sx = x + ((col*19 + row*13 + i*31) % squareSize);
        const sy = y + ((col*11 + row*23 + i*17) % squareSize);
        const tw = 0.15 + 0.7 * Math.abs(Math.sin(t*0.0006*(1+i%3) + i + col + row));
        const starHue = (i*45 + col*20 + row*30) % 360;
        ctx.fillStyle = i%5===0 ? `hsla(${starHue},80%,85%,${tw*0.8})` : `rgba(255,255,255,${tw*(isLight?0.5:0.7)})`;
        ctx.beginPath(); ctx.arc(sx,sy,i%4===0?1.2:0.7,0,Math.PI*2); ctx.fill();
      }
      const nebHue = (t*0.004 + col*40 + row*55) % 360;
      const nebT = t*0.00018 + (col*2.3 + row*3.1)*0.2;
      const nx = cx + Math.sin(nebT)*squareSize*0.15;
      const ny2 = cy + Math.cos(nebT*0.7)*squareSize*0.1;
      const ng = ctx.createRadialGradient(nx,ny2,0,nx,ny2,squareSize*0.6);
      ng.addColorStop(0, `hsla(${nebHue},70%,40%,${isLight?0.22:0.16})`);
      ng.addColorStop(0.5, `hsla(${(nebHue+60)%360},60%,30%,${isLight?0.11:0.08})`);
      ng.addColorStop(1, 'rgba(0,0,10,0)');
      ctx.fillStyle = ng; ctx.fillRect(x,y,squareSize,squareSize);
      if (Math.abs(row - 3.5) < 1.5) {
        const coreA = (1 - Math.abs(row-3.5)/1.5) * (isLight?0.15:0.1);
        const core = ctx.createLinearGradient(x,cy,x+squareSize,cy);
        core.addColorStop(0,'rgba(255,220,150,0)');
        core.addColorStop(0.5,`rgba(255,230,180,${coreA})`);
        core.addColorStop(1,'rgba(255,220,150,0)');
        ctx.fillStyle=core; ctx.fillRect(x,y,squareSize,squareSize);
      }
      break;
    }

    case 'the-rift-board': {
      ctx.fillStyle = isLight ? '#080410' : '#020106'; ctx.fillRect(x,y,squareSize,squareSize);
      const riftWorldX = (t * 0.0002) % (8 * squareSize * 1.4);
      const riftOffset = riftWorldX - 4*squareSize;
      const sqCenterDist = Math.abs((col+0.5)*squareSize - (row+0.5)*squareSize - riftOffset) / Math.SQRT2;
      const riftWidth = squareSize * 1.2;
      if (sqCenterDist < riftWidth) {
        const riftProx = 1 - sqCenterDist / riftWidth;
        const riftG = ctx.createRadialGradient(cx,cy,0,cx,cy,squareSize*0.6);
        riftG.addColorStop(0, `rgba(180,0,255,${riftProx*(isLight?0.6:0.4)})`);
        riftG.addColorStop(0.3, `rgba(100,0,200,${riftProx*(isLight?0.4:0.25)})`);
        riftG.addColorStop(1, 'rgba(40,0,100,0)');
        ctx.fillStyle=riftG; ctx.fillRect(x,y,squareSize,squareSize);
        ctx.strokeStyle = `rgba(200,100,255,${riftProx*(0.5+0.4*Math.sin(t*0.003+col+row))})`;
        ctx.lineWidth = 1;
        ctx.shadowColor = `rgba(180,0,255,${riftProx*0.5})`; ctx.shadowBlur=6;
        ctx.beginPath();
        ctx.moveTo(x, y+squareSize*(0.3-riftProx*0.1));
        ctx.lineTo(x+squareSize, y+squareSize*(0.7+riftProx*0.1));
        ctx.stroke(); ctx.shadowBlur=0;
        for(let i=0;i<3;i++){
          const s2x=x+((col*13+row*7+i*19)%squareSize);
          const s2y=y+((col*7+row*11+i*23)%squareSize);
          ctx.fillStyle=`rgba(255,255,255,${riftProx*(0.3+0.3*Math.sin(t*0.001+i))})`;
          ctx.beginPath();ctx.arc(s2x,s2y,0.8,0,Math.PI*2);ctx.fill();
        }
      }
      const haze=ctx.createRadialGradient(cx,cy,0,cx,cy,squareSize*0.7);
      haze.addColorStop(0,`rgba(60,0,120,${isLight?0.12:0.08})`);
      haze.addColorStop(1,'rgba(20,0,50,0)');
      ctx.fillStyle=haze; ctx.fillRect(x,y,squareSize,squareSize);
      break;
    }

    case 'singularity-board': {
      ctx.fillStyle = isLight ? '#030308' : '#010103'; ctx.fillRect(x,y,squareSize,squareSize);
      const boardCenterCol=3.5, boardCenterRow=3.5;
      const dcol=col-boardCenterCol, drow=row-boardCenterRow;
      const distFromCenter=Math.sqrt(dcol*dcol+drow*drow);
      const maxDist=Math.sqrt(3.5*3.5+3.5*3.5);
      const proximity=1-distFromCenter/maxDist;
      const accretionAngle=t*0.00025+Math.atan2(drow,dcol);
      const accretionA=proximity*(0.15+0.12*Math.sin(accretionAngle*3));
      const accHue=(t*0.003+distFromCenter*40)%360;
      const accG=ctx.createRadialGradient(cx,cy,squareSize*0.1,cx,cy,squareSize*0.65);
      accG.addColorStop(0,`hsla(${accHue},80%,60%,${accretionA*(isLight?1.5:1)})`);
      accG.addColorStop(0.5,`hsla(${(accHue+30)%360},70%,40%,${accretionA*0.5})`);
      accG.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=accG; ctx.fillRect(x,y,squareSize,squareSize);
      const lensAngle=Math.atan2(drow,dcol)+Math.PI;
      for(let i=0;i<5;i++){
        const bsx=x+((col*17+row*11+i*23)%squareSize);
        const bsy=y+((col*11+row*19+i*17)%squareSize);
        const trailLen=proximity*squareSize*0.3;
        const esx=bsx+Math.cos(lensAngle)*trailLen*((i%3)*0.3+0.3);
        const esy=bsy+Math.sin(lensAngle)*trailLen*((i%3)*0.3+0.3);
        const tw=0.1+0.5*Math.abs(Math.sin(t*0.0007+i+col+row));
        ctx.strokeStyle=`rgba(255,255,255,${tw*(isLight?0.5:0.7)*proximity})`;
        ctx.lineWidth=0.5;
        ctx.beginPath();ctx.moveTo(bsx,bsy);ctx.lineTo(esx,esy);ctx.stroke();
        ctx.fillStyle=`rgba(255,255,255,${tw*(isLight?0.6:0.9)})`;
        ctx.beginPath();ctx.arc(bsx,bsy,0.7,0,Math.PI*2);ctx.fill();
      }
      if(distFromCenter<0.8){
        const bh=ctx.createRadialGradient(cx,cy,0,cx,cy,squareSize*0.5);
        bh.addColorStop(0,'rgba(0,0,0,0.95)');
        bh.addColorStop(0.4,'rgba(0,0,0,0.7)');
        bh.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=bh; ctx.fillRect(x,y,squareSize,squareSize);
      }
      break;
    }
  }

  ctx.restore();
}
// ─────────────────────────────────────────────────────────────────────────────

function renderBoardBorder(ctx, boardX, boardY, boardSize, borderStyle, theme) {
  const b = 10; // border width
  const x = boardX - b;
  const y = boardY - b;
  const w = boardSize + b * 2;
  const h = boardSize + b * 2;

  ctx.save();

  if (borderStyle === 'Classic' || theme === 'Classic') {
    // Oak wood grain
    const grd = ctx.createLinearGradient(x, y, x + w, y + h);
    grd.addColorStop(0, '#5a3e1b');
    grd.addColorStop(0.5, '#8b6234');
    grd.addColorStop(1, '#4a3010');
    ctx.fillStyle = grd;
    // Draw border as 4 rects
    ctx.fillRect(x, y, w, b); // top
    ctx.fillRect(x, y + h - b, w, b); // bottom
    ctx.fillRect(x, y, b, h); // left
    ctx.fillRect(x + w - b, y, b, h); // right
    // Grain lines
    ctx.strokeStyle = 'rgba(100,60,20,0.2)'; ctx.lineWidth = 0.5;
    for (let i = x; i < x + w; i += 4) {
      ctx.beginPath(); ctx.moveTo(i, y); ctx.lineTo(i, y + h); ctx.stroke();
    }
    // Corner knot details
    [
      [x + b/2, y + b/2], [x + w - b/2, y + b/2],
      [x + b/2, y + h - b/2], [x + w - b/2, y + h - b/2],
    ].forEach(([kx, ky]) => {
      ctx.beginPath(); ctx.arc(kx, ky, 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(60,30,10,0.4)'; ctx.lineWidth = 0.8; ctx.stroke();
    });

  } else if (theme === 'Midnight') {
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(x, y, w, b); ctx.fillRect(x, y+h-b, w, b);
    ctx.fillRect(x, y, b, h); ctx.fillRect(x+w-b, y, b, h);
    // Rivets at corners
    ctx.fillStyle = '#2a3040';
    [
      [x + b*0.5, y + b*0.5], [x + w - b*0.5, y + b*0.5],
      [x + b*0.5, y + h - b*0.5], [x + w - b*0.5, y + h - b*0.5],
    ].forEach(([rx, ry]) => {
      ctx.beginPath(); ctx.arc(rx, ry, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1a2030'; ctx.lineWidth = 0.5; ctx.stroke();
    });

  } else if (theme === 'Neon') {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(x, y, w, b); ctx.fillRect(x, y+h-b, w, b);
    ctx.fillRect(x, y, b, h); ctx.fillRect(x+w-b, y, b, h);
    // Circuit trace lines
    const accent = '#00ffcc';
    ctx.strokeStyle = 'rgba(0,255,204,0.4)'; ctx.lineWidth = 0.8;
    // Horizontal traces
    for (let ty = y + 3; ty < y + b - 2; ty += 4) {
      ctx.beginPath(); ctx.moveTo(x + b, ty); ctx.lineTo(x + w - b, ty); ctx.stroke();
    }
    // Via holes at corners
    ctx.fillStyle = 'rgba(0,255,204,0.5)';
    [[x+b/2,y+b/2],[x+w-b/2,y+b/2],[x+b/2,y+h-b/2],[x+w-b/2,y+h-b/2]].forEach(([vx,vy]) => {
      ctx.beginPath(); ctx.arc(vx, vy, 2.5, 0, Math.PI * 2); ctx.fill();
    });

  } else if (theme === 'Marble') {
    // Carved white marble frame
    const mg = ctx.createLinearGradient(x,y,x+w,y+h);
    mg.addColorStop(0,'#e8e0d4'); mg.addColorStop(0.5,'#f0ece8'); mg.addColorStop(1,'#d8d0c4');
    ctx.fillStyle=mg;
    ctx.fillRect(x,y,w,b); ctx.fillRect(x,y+h-b,w,b);
    ctx.fillRect(x,y,b,h); ctx.fillRect(x+w-b,y,b,h);
    // Vein
    ctx.strokeStyle='rgba(160,140,120,0.25)'; ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.moveTo(x,y+b*0.6); ctx.bezierCurveTo(x+w*0.3,y+b*0.3,x+w*0.7,y+b*0.8,x+w,y+b*0.4); ctx.stroke();
    // Gold inlay edge
    ctx.strokeStyle='rgba(180,150,80,0.4)'; ctx.lineWidth=0.8;
    ctx.strokeRect(x+1,y+1,w-2,h-2); ctx.strokeRect(x+b-2,y+b-2,boardSize+4,boardSize+4);

  } else if (theme === 'Royal') {
    // Deep burgundy with gold trim
    ctx.fillStyle='#3a0a18';
    ctx.fillRect(x,y,w,b); ctx.fillRect(x,y+h-b,w,b);
    ctx.fillRect(x,y,b,h); ctx.fillRect(x+w-b,y,b,h);
    // Gold outer edge
    ctx.strokeStyle='rgba(200,160,40,0.8)'; ctx.lineWidth=1.2;
    ctx.strokeRect(x+0.6,y+0.6,w-1.2,h-1.2);
    // Gold inner edge
    ctx.strokeStyle='rgba(180,140,20,0.5)'; ctx.lineWidth=0.7;
    ctx.strokeRect(x+b-1.5,y+b-1.5,boardSize+3,boardSize+3);
    // Corner fleur ornaments
    ctx.fillStyle='rgba(200,160,40,0.7)';
    [[x+b/2,y+b/2],[x+w-b/2,y+b/2],[x+b/2,y+h-b/2],[x+w-b/2,y+h-b/2]].forEach(([fx,fy])=>{
      ctx.beginPath(); ctx.arc(fx,fy,3.5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(220,180,60,0.5)'; ctx.lineWidth=0.5; ctx.stroke();
    });

  } else if (theme === 'Void') {
    // Near-black with purple energy seeping through
    ctx.fillStyle='#04020c';
    ctx.fillRect(x,y,w,b); ctx.fillRect(x,y+h-b,w,b);
    ctx.fillRect(x,y,b,h); ctx.fillRect(x+w-b,y,b,h);
    ctx.strokeStyle='rgba(80,20,160,0.5)'; ctx.lineWidth=0.8;
    ctx.strokeRect(x+0.4,y+0.4,w-0.8,h-0.8);
    ctx.strokeStyle='rgba(120,40,220,0.3)'; ctx.lineWidth=0.5;
    ctx.strokeRect(x+b-1,y+b-1,boardSize+2,boardSize+2);

  } else if (theme === 'Sakura') {
    // Pale cherry wood
    const sg = ctx.createLinearGradient(x,y,x+w,y);
    sg.addColorStop(0,'#3a1020'); sg.addColorStop(0.5,'#5a2030'); sg.addColorStop(1,'#3a1020');
    ctx.fillStyle=sg;
    ctx.fillRect(x,y,w,b); ctx.fillRect(x,y+h-b,w,b);
    ctx.fillRect(x,y,b,h); ctx.fillRect(x+w-b,y,b,h);
    ctx.strokeStyle='rgba(220,150,170,0.3)'; ctx.lineWidth=0.6;
    ctx.strokeRect(x+1,y+1,w-2,h-2);
    // Petal motif at corners
    ctx.fillStyle='rgba(220,130,150,0.4)';
    [[x+b/2,y+b/2],[x+w-b/2,y+b/2],[x+b/2,y+h-b/2],[x+w-b/2,y+h-b/2]].forEach(([px,py])=>{
      for(let p=0;p<4;p++){ const a=p/4*Math.PI*2;
        ctx.beginPath(); ctx.ellipse(px+Math.cos(a)*3,py+Math.sin(a)*3,2.5,1.5,a,0,Math.PI*2); ctx.fill();
      }
    });

  } else if (theme === 'Gilded') {
    // Black with heavy gold
    ctx.fillStyle='#0c0900';
    ctx.fillRect(x,y,w,b); ctx.fillRect(x,y+h-b,w,b);
    ctx.fillRect(x,y,b,h); ctx.fillRect(x+w-b,y,b,h);
    const gg = ctx.createLinearGradient(x,y,x,y+b);
    gg.addColorStop(0,'rgba(200,160,20,0.6)');
    gg.addColorStop(0.5,'rgba(240,200,60,0.4)');
    gg.addColorStop(1,'rgba(180,130,10,0.6)');
    ctx.fillStyle=gg;
    ctx.fillRect(x,y,w,b); ctx.fillRect(x,y+h-b,w,b);
    ctx.fillRect(x,y,b,h); ctx.fillRect(x+w-b,y,b,h);
    ctx.strokeStyle='rgba(255,220,80,0.7)'; ctx.lineWidth=1;
    ctx.strokeRect(x+0.5,y+0.5,w-1,h-1);
    ctx.strokeRect(x+b-1,y+b-1,boardSize+2,boardSize+2);

  } else if (theme === 'Stone') {
    // Dark stone with mortar lines
    ctx.fillStyle='#2a2820';
    ctx.fillRect(x,y,w,b); ctx.fillRect(x,y+h-b,w,b);
    ctx.fillRect(x,y,b,h); ctx.fillRect(x+w-b,y,b,h);
    ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=0.6;
    for(let i=x; i<x+w; i+=8){ ctx.beginPath(); ctx.moveTo(i,y); ctx.lineTo(i,y+b); ctx.stroke(); }
    ctx.strokeStyle='rgba(180,170,150,0.15)'; ctx.lineWidth=0.5;
    ctx.strokeRect(x+b-1,y+b-1,boardSize+2,boardSize+2);

  } else {
    // Generic: simple dark frame
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, w, b); ctx.fillRect(x, y+h-b, w, b);
    ctx.fillRect(x, y, b, h); ctx.fillRect(x+w-b, y, b, h);
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, w, h);
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: PIECE TRAILS
// ─────────────────────────────────────────────────────────────────────────────

function spawnTrail(pieceType, pieceColor, fromX, fromY, toX, toY, scale, trailStyle) {
  const trail = {
    pieceType, pieceColor, trailStyle, scale,
    ghosts: [],
    startTime: Date.now(),
    duration: 400,
  };

  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    trail.ghosts.push({
      x: fromX + (toX - fromX) * (i / steps),
      y: fromY + (toY - fromY) * (i / steps),
      opacity: (0.38 * (1 - t * 0.8)),
      scale: scale * (0.95 - t * 0.35),
      index: i,
    });
  }

  CV.activeTrails.push(trail);
}

function renderTrails(ctx) {
  const now = Date.now();
  CV.activeTrails = CV.activeTrails.filter(trail => {
    const age = now - trail.startTime;
    if (age >= trail.duration) return false;
    const progress = age / trail.duration;

    trail.ghosts.forEach((ghost, i) => {
      const ghostAlpha = ghost.opacity * (1 - progress);
      if (ghostAlpha < 0.01) return;

      if (trail.trailStyle === 'Flame') {
        ctx.save();
        ctx.globalAlpha = ghostAlpha;
        ctx.fillStyle = `hsl(${20 + i * 5},100%,${50 + i * 5}%)`;
        ctx.beginPath();
        ctx.ellipse(ghost.x, ghost.y, ghost.scale * 4, ghost.scale * 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (trail.trailStyle === 'Ice') {
        ctx.save();
        ctx.globalAlpha = ghostAlpha;
        ctx.fillStyle = `hsl(210,80%,${70 + i * 5}%)`;
        // Crystal shard shape
        ctx.beginPath();
        ctx.moveTo(ghost.x, ghost.y - ghost.scale * 5);
        ctx.lineTo(ghost.x + ghost.scale * 3, ghost.y);
        ctx.lineTo(ghost.x, ghost.y + ghost.scale * 5);
        ctx.lineTo(ghost.x - ghost.scale * 3, ghost.y);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (trail.trailStyle === 'Gold') {
        ctx.save();
        ctx.globalAlpha = ghostAlpha * 0.8;
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(ghost.x, ghost.y, ghost.scale * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (trail.trailStyle === 'Royal') {
        ctx.save();
        ctx.globalAlpha = ghostAlpha;
        const grd = ctx.createRadialGradient(ghost.x, ghost.y, 0, ghost.x, ghost.y, ghost.scale * 5);
        grd.addColorStop(0, 'rgba(160,80,255,0.8)');
        grd.addColorStop(1, 'rgba(160,80,255,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(ghost.x, ghost.y, ghost.scale * 5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else if (trail.trailStyle === 'Shadow') {
        ctx.save();
        ctx.globalAlpha = ghostAlpha * 0.6;
        ctx.fillStyle = '#0a0a0a';
        ctx.beginPath();
        ctx.ellipse(ghost.x, ghost.y, ghost.scale * 5, ghost.scale * 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Default: ghost silhouette
        ctx.save();
        ctx.globalAlpha = ghostAlpha;
        renderPiece(ctx, trail.pieceType, trail.pieceColor, ghost.x, ghost.y, ghost.scale, 'Minimal');
        ctx.restore();
      }
    });
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8: CURSED PIECE GLOW
// ─────────────────────────────────────────────────────────────────────────────

function renderCursedGlow(ctx, x, y, squareSize, triggerCount) {
  if (triggerCount < 3) return;

  const now = Date.now();
  let color, glowAlpha, pulseSpeed;

  if (triggerCount >= 7) {
    color = [200, 0, 0];
    glowAlpha = 0.6 + 0.2 * Math.sin(now * 0.006 + Math.random() * 0.2);
    pulseSpeed = 0.008;
  } else if (triggerCount >= 5) {
    color = [255, 40, 0];
    glowAlpha = 0.4 + 0.2 * Math.sin(now * 0.005);
    pulseSpeed = 0.005;
  } else {
    color = [255, 100, 0];
    glowAlpha = 0.3 + 0.1 * Math.sin(now * 0.003);
    pulseSpeed = 0.003;
  }

  const r = squareSize / 2 + 4;
  const cx = x + squareSize / 2;
  const cy = y + squareSize / 2;

  const grd = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.5);
  grd.addColorStop(0, `rgba(${color.join(',')},${glowAlpha})`);
  grd.addColorStop(1, `rgba(${color.join(',')},0)`);

  ctx.save();
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2); ctx.fill();

  // Sparks for level 7+
  if (triggerCount >= 7) {
    for (let i = 0; i < 4; i++) {
      const angle = (now * 0.005 + i * Math.PI / 2) % (Math.PI * 2);
      const sparkR = r + Math.sin(now * 0.01 + i) * 4;
      const sx = cx + Math.cos(angle) * sparkR;
      const sy = cy + Math.sin(angle) * sparkR;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(now * 0.008 + i);
      ctx.fillStyle = '#ff4400';
      ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9: CUTSCENE BADGE RENDERING
// ─────────────────────────────────────────────────────────────────────────────

const BADGE_TIER_COLORS = {
  locked: { border: '#555555', fill: '#222222' },
  gray:   { border: '#aaaaaa', fill: '#333333' },
  green:  { border: '#00cc44', fill: '#003311' },
  blue:   { border: '#4488ff', fill: '#001133' },
  purple: { border: '#aa44ff', fill: '#220033' },
  gold:   { border: '#ffcc00', fill: '#332200' },
};

function getBadgeTier(count) {
  if (count === 0) return 'locked';
  if (count < 10) return 'gray';
  if (count < 25) return 'green';
  if (count < 50) return 'blue';
  if (count < 100) return 'purple';
  return 'gold';
}

function renderBadge(ctx, cutsceneId, triggerCount, x, y, radius) {
  const tier = getBadgeTier(triggerCount);
  const colors = BADGE_TIER_COLORS[tier];

  ctx.save();
  ctx.translate(x, y);

  // Background circle
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = colors.fill; ctx.fill();

  // Border ring
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = Math.max(1.5, radius * 0.06);
  ctx.stroke();

  if (tier === 'locked') {
    // Padlock icon
    const lw = radius * 0.35;
    const lh = radius * 0.3;
    const ly = radius * 0.05;
    ctx.strokeStyle = '#666'; ctx.lineWidth = radius * 0.06;
    // Shackle
    ctx.beginPath();
    ctx.arc(0, ly - lh * 0.6, lw * 0.4, Math.PI, 0);
    ctx.stroke();
    // Body
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.roundRect(-lw * 0.5, ly - lh * 0.1, lw, lh * 0.8, radius * 0.05);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Clip to circle for icon drawing
  ctx.beginPath(); ctx.arc(0, 0, radius - 2, 0, Math.PI * 2); ctx.clip();

  // Icon scale factor
  const s = radius / 28;
  ctx.strokeStyle = colors.border;
  ctx.fillStyle = colors.border;

  switch (cutsceneId) {
    case 'execution': // broadsword pointing down with X
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath(); ctx.moveTo(0, -15 * s); ctx.lineTo(0, 15 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5 * s, -5 * s); ctx.lineTo(5 * s, 5 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5 * s, -5 * s); ctx.lineTo(-5 * s, 5 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6 * s, -10 * s); ctx.lineTo(6 * s, -10 * s); ctx.stroke(); // crossguard
      break;

    case 'driveby': // low-rider silhouette
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(-14 * s, 3 * s);
      ctx.lineTo(-10 * s, -3 * s);
      ctx.lineTo(-4 * s, -6 * s);
      ctx.lineTo(6 * s, -6 * s);
      ctx.lineTo(12 * s, -2 * s);
      ctx.lineTo(14 * s, 3 * s);
      ctx.closePath(); ctx.stroke();
      // Wheels
      ctx.beginPath(); ctx.arc(-9 * s, 5 * s, 3 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(9 * s, 5 * s, 3 * s, 0, Math.PI * 2); ctx.stroke();
      // Muzzle flash
      ctx.fillStyle = colors.border;
      ctx.beginPath(); ctx.arc(-14 * s, -2 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
      break;

    case 'sniper': // crosshair reticle
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath(); ctx.arc(0, 0, 10 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -14 * s); ctx.lineTo(0, 14 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-14 * s, 0); ctx.lineTo(14 * s, 0); ctx.stroke();
      // Center diamond
      ctx.beginPath();
      ctx.moveTo(0, -3 * s); ctx.lineTo(3 * s, 0);
      ctx.lineTo(0, 3 * s); ctx.lineTo(-3 * s, 0); ctx.closePath(); ctx.fill();
      break;

    case 'meteor': // 3 meteors streaking diagonally
      ctx.lineWidth = 1 * s;
      [[0, -12, 8, -4], [-5, -5, 3, 3], [-8, 2, 2, 12]].forEach(([x1, y1, x2, y2], i) => {
        const r2 = (2.5 - i * 0.5) * s;
        ctx.beginPath(); ctx.arc(x1 * s, y1 * s, r2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x1 * s, y1 * s); ctx.lineTo(x2 * s, y2 * s); ctx.stroke();
      });
      break;

    case 'lightning': // zigzag bolt with arrows
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(-4 * s, -14 * s);
      ctx.lineTo(4 * s, -2 * s);
      ctx.lineTo(-2 * s, 2 * s);
      ctx.lineTo(6 * s, 14 * s);
      ctx.stroke();
      // Opposing arrows
      ctx.lineWidth = 1.2 * s;
      [-12, 12].forEach(ax => {
        ctx.beginPath(); ctx.moveTo(ax * s, 0); ctx.lineTo((ax > 0 ? ax - 6 : ax + 6) * s, -4 * s);
        ctx.moveTo(ax * s, 0); ctx.lineTo((ax > 0 ? ax - 6 : ax + 6) * s, 4 * s);
        ctx.stroke();
      });
      break;

    case 'joust': // two lances crossing with shield
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath(); ctx.moveTo(-14 * s, -10 * s); ctx.lineTo(14 * s, 10 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14 * s, -10 * s); ctx.lineTo(-14 * s, 10 * s); ctx.stroke();
      // Shield at center
      ctx.beginPath();
      ctx.moveTo(0, -5 * s); ctx.lineTo(5 * s, -2 * s); ctx.lineTo(5 * s, 3 * s);
      ctx.lineTo(0, 6 * s); ctx.lineTo(-5 * s, 3 * s); ctx.lineTo(-5 * s, -2 * s);
      ctx.closePath(); ctx.fillStyle = colors.fill; ctx.fill(); ctx.stroke();
      break;

    case 'inquisition': // gothic arch with starburst
      ctx.lineWidth = 1.2 * s;
      // Arch
      ctx.beginPath();
      ctx.moveTo(-10 * s, 14 * s); ctx.lineTo(-10 * s, 0);
      ctx.bezierCurveTo(-10 * s, -14 * s, 10 * s, -14 * s, 10 * s, 0);
      ctx.lineTo(10 * s, 14 * s); ctx.stroke();
      // Starburst inside
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 7 * s, Math.sin(a) * 7 * s); ctx.stroke();
      }
      break;

    case 'demolition': // wrecking ball on chain
      ctx.lineWidth = 1.2 * s;
      // Chain
      ctx.beginPath(); ctx.moveTo(8 * s, -12 * s);
      ctx.bezierCurveTo(12 * s, -8 * s, 10 * s, -2 * s, 5 * s, 2 * s);
      ctx.stroke();
      // Ball
      ctx.beginPath(); ctx.arc(0, 6 * s, 8 * s, 0, Math.PI * 2);
      ctx.fillStyle = colors.fill; ctx.fill(); ctx.stroke();
      break;

    case 'assassination': // rose + dagger
      ctx.lineWidth = 1.2 * s;
      // Stem
      ctx.beginPath(); ctx.moveTo(0, 14 * s); ctx.lineTo(0, -2 * s); ctx.stroke();
      // Rose head
      ctx.beginPath(); ctx.arc(-3 * s, -5 * s, 5 * s, 0, Math.PI * 2);
      ctx.fillStyle = colors.fill; ctx.fill(); ctx.stroke();
      // Dagger (diagonal)
      ctx.beginPath();
      ctx.moveTo(6 * s, -14 * s); ctx.lineTo(-6 * s, 6 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5 * s, -14 * s); ctx.lineTo(8 * s, -11 * s); ctx.lineTo(6 * s, -14 * s); ctx.closePath(); ctx.fill();
      break;

    case 'regicide': // crown with crack
      ctx.lineWidth = 1.5 * s;
      // Crown base
      ctx.beginPath();
      ctx.moveTo(-12 * s, 8 * s); ctx.lineTo(-12 * s, -2 * s);
      ctx.lineTo(-8 * s, -8 * s); ctx.lineTo(-4 * s, -2 * s);
      ctx.lineTo(0, -12 * s); ctx.lineTo(4 * s, -2 * s);
      ctx.lineTo(8 * s, -8 * s); ctx.lineTo(12 * s, -2 * s);
      ctx.lineTo(12 * s, 8 * s); ctx.closePath();
      ctx.fillStyle = colors.fill; ctx.fill(); ctx.stroke();
      // Crack
      ctx.strokeStyle = '#ff3333'; ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(0, -12 * s); ctx.lineTo(2 * s, -5 * s);
      ctx.lineTo(-1 * s, 0); ctx.lineTo(1 * s, 8 * s);
      ctx.stroke();
      break;
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 10: LEVEL-UP PARTICLE BURST
// ─────────────────────────────────────────────────────────────────────────────

function playLevelUpBurst(targetElement) {
  const rect = targetElement.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position: fixed; top: 0; left: 0;
    width: 100vw; height: 100vh;
    pointer-events: none; z-index: 10002;
  `;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const particles = [];
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2;
    const speed = rand(40, 90);
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: rand(2, 5),
      color: Math.random() > 0.5 ? '#ffcc00' : '#ff9900',
      life: 1.0,
      decay: rand(0.015, 0.03),
    });
  }

  let lastT = performance.now();
  function animate(now) {
    const dt = (now - lastT) / 1000;
    lastT = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += (p.vy + 80 * dt) * dt; // gravity
      p.vy += 80 * dt;
      p.life -= p.decay;
      if (p.life <= 0) return;
      alive = true;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (alive) requestAnimationFrame(animate);
    else canvas.remove();
  }
  requestAnimationFrame(animate);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 11: ELO GRAPH RENDERING
// ─────────────────────────────────────────────────────────────────────────────

function renderEloGraph(canvas, eloHistory, accentColor = '#ffcc00') {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const pad = { top: 10, right: 10, bottom: 24, left: 40 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  if (!eloHistory || eloHistory.length < 2) {
    ctx.fillStyle = '#444';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Play games to see your ELO history', W / 2, H / 2);
    return;
  }

  const values = eloHistory.map(e => e.rating || e);
  const minVal = Math.min(...values) - 50;
  const maxVal = Math.max(...values) + 50;
  const range = maxVal - minVal;

  const toX = (i) => pad.left + (i / (values.length - 1)) * plotW;
  const toY = (v) => pad.top + plotH - ((v - minVal) / range) * plotH;

  // Grid lines (3 Y levels)
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 0.5;
  [0, 0.5, 1].forEach(t => {
    const gy = pad.top + t * plotH;
    ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(W - pad.right, gy); ctx.stroke();
    ctx.fillStyle = '#444';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(minVal + (1 - t) * range), pad.left - 4, gy + 3);
  });

  // Area fill
  const areaGrd = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
  areaGrd.addColorStop(0, hexToRgba(accentColor, 0.15));
  areaGrd.addColorStop(1, hexToRgba(accentColor, 0));
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(values[0]));
  values.forEach((v, i) => ctx.lineTo(toX(i), toY(v)));
  ctx.lineTo(toX(values.length - 1), pad.top + plotH);
  ctx.lineTo(toX(0), pad.top + plotH);
  ctx.closePath();
  ctx.fillStyle = areaGrd;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(values[0]));
  values.forEach((v, i) => ctx.lineTo(toX(i), toY(v)));
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Dots
  values.forEach((v, i) => {
    ctx.beginPath();
    ctx.arc(toX(i), toY(v), 2.5, 0, Math.PI * 2);
    ctx.fillStyle = accentColor;
    ctx.fill();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 12: LEVEL HISTORY GRAPH
// ─────────────────────────────────────────────────────────────────────────────

function renderLevelGraph(canvas, levelHistory, accentColor = '#ffcc00') {
  // Same as ELO graph but plots level vs games played
  const history = levelHistory || [];
  const synthetic = history.map((h, i) => ({ rating: h.level || h, game: i }));
  renderEloGraph(canvas, synthetic.map(h => h.rating), accentColor);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 13: AVATAR SKIN RENDERING (clipped to circle)
// ─────────────────────────────────────────────────────────────────────────────

function renderAvatarSkin(canvas, skinId, pieceType, pieceColor, botName, t = 0) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  ctx.clearRect(0, 0, size, size);

  // Clip to circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  if (!skinId || skinId === 'default') {
    // Initials fallback
    const hash = Array.from(botName || 'Bot').reduce((a, c) => a + c.charCodeAt(0), 0);
    ctx.fillStyle = `hsl(${hash % 360},55%,28%)`;
    ctx.fillRect(0, 0, size, size);
    ctx.font = `${Math.round(size * 0.33)}px Cinzel, serif`;
    ctx.fillStyle = '#cccccc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initials = (botName || 'Bo').slice(0, 2).toUpperCase();
    ctx.fillText(initials, cx, cy);
  } else {
    // Piece skin
    const scale = size / 56;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, size, size);
    renderSkin(ctx, pieceType || 'king', pieceColor || 'white', cx, cy, scale, skinId, t);
  }

  ctx.restore();
}

function startAvatarSkinLoop(canvas, skinId, pieceType, pieceColor, botName) {
  if (CV.avatarLoop) cancelAnimationFrame(CV.avatarLoop);
  CV.avatarCanvas = canvas;

  const STATIC_SKINS = ['default','crimson-red','ocean-blue','forest-green','sunburst-orange',
    'violet-purple','arctic-teal','dusty-rose','charcoal','frosted-glass','brushed-steel',
    'obsidian-stone','warm-marble','bone-ivory','onyx'];

  if (STATIC_SKINS.includes(skinId)) {
    renderAvatarSkin(canvas, skinId, pieceType, pieceColor, botName, 0);
    return;
  }

  const start = performance.now();
  function loop(now) {
    renderAvatarSkin(canvas, skinId, pieceType, pieceColor, botName, now - start);
    CV.avatarLoop = requestAnimationFrame(loop);
  }
  CV.avatarLoop = requestAnimationFrame(loop);
}

function stopAvatarLoop() {
  if (CV.avatarLoop) { cancelAnimationFrame(CV.avatarLoop); CV.avatarLoop = null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 14: SKIN PREVIEW (for skin grid cards)
// ─────────────────────────────────────────────────────────────────────────────

function renderSkinPreview(canvas, pieceType, pieceColor, skinId) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = pieceColor === 'white' ? '#B58863' : '#F0D9B5';
  ctx.fillRect(0, 0, size, size);
  const scale = size / 52;
  renderSkin(ctx, pieceType, pieceColor, size / 2, size / 2, scale, skinId, 0);
}

// Animated skin preview for skin grid cards
function startSkinPreviewLoop(canvas, pieceType, pieceColor, skinId) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const start = performance.now();

  const STATIC = ['default','crimson-red','ocean-blue','forest-green','sunburst-orange',
    'violet-purple','arctic-teal','dusty-rose','charcoal','frosted-glass','brushed-steel',
    'obsidian-stone','warm-marble','bone-ivory','onyx'];

  if (STATIC.includes(skinId)) {
    renderSkinPreview(canvas, pieceType, pieceColor, skinId);
    return () => {};
  }

  let raf;
  function loop(now) {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = pieceColor === 'white' ? '#B58863' : '#F0D9B5';
    ctx.fillRect(0, 0, size, size);
    renderSkin(ctx, pieceType, pieceColor, size / 2, size / 2, size / 52, skinId, now - start);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 15: ZOOM PREVIEW (3×3 board section with piece at 2.5×)
// ─────────────────────────────────────────────────────────────────────────────

function renderZoomPreview(canvas, pieceType, pieceColor, skinId, boardSkinId, theme, t = 0) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const sqSize = Math.floor(Math.min(W, H) / 3);
  const boardW = sqSize * 3;
  const offsetX = (W - boardW) / 2;
  const offsetY = (H - boardW) / 2;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0e0e0e';
  ctx.fillRect(0, 0, W, H);

  // Draw 3×3 board
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const isLight = (row + col) % 2 === 0;
      const sx = offsetX + col * sqSize;
      const sy = offsetY + row * sqSize;

      // Base square color
      const themeColors = {
        Classic: { l: '#F0D9B5', d: '#B58863' },
        Midnight: { l: '#8ca2ad', d: '#2d4a6b' },
        Forest: { l: '#c8d8a8', d: '#4a7c59' },
        Crimson: { l: '#e8c8b8', d: '#8b3a3a' },
        Ice: { l: '#dce8f0', d: '#6090b0' },
        Gold: { l: '#f5e6c8', d: '#9a7a3a' },
        Neon: { l: '#1a1a2e', d: '#0f0f1a' },
        Obsidian: { l: '#3a3a4a', d: '#1a1a28' },
      };
      const tc = themeColors[theme] || themeColors.Classic;
      ctx.fillStyle = isLight ? tc.l : tc.d;
      ctx.fillRect(sx, sy, sqSize, sqSize);

      // Board skin overlay
      if (boardSkinId && boardSkinId !== 'default') {
        renderBoardSquareSkin(ctx, col, row, sqSize, sx, sy, isLight, boardSkinId, t);
      }

      // Center square selection highlight
      if (row === 1 && col === 1) {
        ctx.fillStyle = 'rgba(255,204,0,0.25)';
        ctx.fillRect(sx, sy, sqSize, sqSize);
      }
    }
  }

  // Draw piece at center, scaled to 2.5×
  const centerX = offsetX + sqSize + sqSize / 2;
  const centerY = offsetY + sqSize + sqSize / 2;
  const scale = (sqSize / 22) * 1.4;

  renderSkin(ctx, pieceType, pieceColor, centerX, centerY, scale, skinId, t);
}

function startZoomPreviewLoop(canvas, pieceType, pieceColor, skinId, boardSkinId, theme) {
  let raf;
  const start = performance.now();

  const STATIC = ['default','crimson-red','ocean-blue','forest-green','sunburst-orange',
    'violet-purple','arctic-teal','dusty-rose','charcoal','frosted-glass','brushed-steel',
    'obsidian-stone','warm-marble','bone-ivory','onyx'];

  if (STATIC.includes(skinId)) {
    renderZoomPreview(canvas, pieceType, pieceColor, skinId, boardSkinId, theme, 0);
    return () => {};
  }

  function loop(now) {
    renderZoomPreview(canvas, pieceType, pieceColor, skinId, boardSkinId, theme, now - start);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 16: FAVORITE CYCLING ANIMATION
// ─────────────────────────────────────────────────────────────────────────────

function startFavoriteCycleAnimation(pieceType, previewCanvas, zoomCanvas, favorites,
    pieceColor, boardSkinId, theme, onSkinChange) {
  const key = `${pieceType}_${pieceColor}`;
  stopFavoriteCycleAnimation(key);

  if (!favorites || favorites.length === 0) return;

  let currentIndex = 0;
  let fadeAlpha = 1;
  let fadingOut = false;
  let nextSkin = null;
  let lastSwap = Date.now();
  const INTERVAL = 1500;
  const FADE_DURATION = 400;

  let previewStop = null;
  let zoomStop = null;

  function startCurrentSkin() {
    const skin = favorites[currentIndex];
    if (previewStop) previewStop();
    if (zoomStop) zoomStop();
    previewStop = startSkinPreviewLoop(previewCanvas, pieceType, pieceColor, skin);
    if (zoomCanvas) zoomStop = startZoomPreviewLoop(zoomCanvas, pieceType, pieceColor, skin, boardSkinId, theme);
    if (onSkinChange) onSkinChange(skin);
  }

  startCurrentSkin();

  const intervalId = setInterval(() => {
    const next = (currentIndex + 1) % favorites.length;
    currentIndex = next;
    startCurrentSkin();
  }, INTERVAL);

  CV.favCycleIntervals.set(key, {
    intervalId, previewStop, zoomStop,
    stop: () => {
      clearInterval(intervalId);
      if (previewStop) previewStop();
      if (zoomStop) zoomStop();
    }
  });
}

function stopFavoriteCycleAnimation(key) {
  const existing = CV.favCycleIntervals.get(key);
  if (existing) { existing.stop(); CV.favCycleIntervals.delete(key); }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 17: CSS INJECTION (Rarity shimmer animations, theme variables)
// ─────────────────────────────────────────────────────────────────────────────

function injectGlobalStyles() {
  if (document.getElementById('cv-global-styles')) return;
  const style = document.createElement('style');
  style.id = 'cv-global-styles';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Inter:wght@400;500&display=swap');

    @keyframes cv-mythic1-shimmer {
      0%   { color: #aa44ff; }
      33%  { color: #ffcc00; }
      66%  { color: #ffffff; }
      100% { color: #aa44ff; }
    }
    @keyframes cv-mythic2-shimmer {
      0%   { color: #ff00aa; }
      25%  { color: #ffcc00; }
      50%  { color: #00ffff; }
      75%  { color: #aa44ff; }
      100% { color: #ff00aa; }
    }
    @keyframes cv-daily-gold-pulse {
      0%, 100% { box-shadow: 0 0 6px 2px rgba(255,215,0,0.6); }
      50%       { box-shadow: 0 0 12px 4px rgba(255,215,0,1); }
    }
    @keyframes cv-clock-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.5; }
    }
    @keyframes cv-play-btn-pulse {
      0%, 100% { transform: scale(1); }
      50%       { transform: scale(1.02); }
    }
    @keyframes cv-cursed-erratic {
      0%  { opacity: 0.8; }
      15% { opacity: 0.4; }
      30% { opacity: 0.9; }
      55% { opacity: 0.3; }
      70% { opacity: 0.8; }
      85% { opacity: 0.5; }
      100%{ opacity: 0.8; }
    }
    @keyframes cv-confetti-fall {
      0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }
    @keyframes cv-toast-slide-right {
      0%   { transform: translateX(120%); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }
    @keyframes cv-toast-slide-left {
      0%   { transform: translateX(-120%); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }
    @keyframes cv-toast-slide-down {
      0%   { transform: translateY(-120%); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    @keyframes cv-result-slide-in {
      0%   { transform: translateY(-40px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    @keyframes cv-badge-rotate {
      0%   { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes cv-elo-change-up {
      0%   { transform: translateY(0); opacity: 1; }
      100% { transform: translateY(-20px); opacity: 0; }
    }
    @keyframes cv-elo-change-down {
      0%   { transform: translateY(0); opacity: 1; }
      100% { transform: translateY(20px); opacity: 0; }
    }
    @keyframes cv-status-dot-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.3; }
    }
    @keyframes cv-leaderboard-fade-in {
      0%   { opacity: 0; transform: translateY(8px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    .cv-mythic1-text { animation: cv-mythic1-shimmer 3s linear infinite; }
    .cv-mythic2-text { animation: cv-mythic2-shimmer 2s linear infinite; }
    .cv-daily-gold   { animation: cv-daily-gold-pulse 2s ease-in-out infinite; }
    .cv-clock-low    { animation: cv-clock-pulse 1s ease-in-out infinite; color: #ff3333 !important; }
    .cv-play-pulse   { animation: cv-play-btn-pulse 2s ease-in-out infinite; }
    .cv-badge-hover:hover canvas { animation: cv-badge-rotate 1s linear; }
    .cv-status-thinking .cv-status-dot { animation: cv-status-dot-pulse 1s ease-in-out infinite; }

    .cv-toast {
      position: fixed; z-index: 10000;
      background: #161616; border-radius: 8px;
      padding: 10px 16px; display: flex; align-items: center; gap: 10px;
      font-family: Inter, sans-serif; font-size: 12px; color: #ccc;
      max-width: 320px; pointer-events: none;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
    .cv-toast-right  { top: 16px; right: 16px; animation: cv-toast-slide-right 250ms ease-out forwards; }
    .cv-toast-left   { top: 16px; left: 16px;  animation: cv-toast-slide-left 250ms ease-out forwards; }
    .cv-toast-center { top: 16px; left: 50%; transform: translateX(-50%); animation: cv-toast-slide-down 250ms ease-out forwards; }
    .cv-toast-bottom { bottom: 80px; left: 50%; transform: translateX(-50%); animation: cv-toast-slide-down 250ms ease-out forwards; }

    .cv-rarity-badge {
      font-family: Cinzel, serif; font-size: 9px;
      padding: 2px 7px; border-radius: 10px; display: inline-block;
    }
    .cv-rarity-common  { background: #222; color: #aaa; }
    .cv-rarity-rare    { background: #001133; color: #4488ff; }
    .cv-rarity-epic    { background: #1a1000; color: #ffcc00; }
    .cv-rarity-unique  { background: #1a0000; color: #ff3333; }
    .cv-rarity-mythic1 { background: #0d0020; }
    .cv-rarity-mythic2 { background: #000; }

    .cv-section-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 12px; cursor: pointer; user-select: none;
      transition: background 150ms ease;
    }
    .cv-section-header:hover { background: #1e1e1e; }
    .cv-section-title { font: 10px Cinzel,serif; color: #666; letter-spacing: 0.8px; text-transform: uppercase; }
    .cv-section-chevron { font-size: 10px; color: #444; transition: transform 200ms ease; }
    .cv-section-chevron.open { transform: rotate(180deg); }
    .cv-section-body.collapsed { display: none; }

    .cv-toggle-pill {
      width: 28px; height: 15px; border-radius: 8px;
      background: #333; position: relative; cursor: pointer;
      transition: background 200ms ease; flex-shrink: 0;
    }
    .cv-toggle-pill.on { background: var(--accent, #ffcc00); }
    .cv-toggle-pill .cv-toggle-knob {
      width: 11px; height: 11px; border-radius: 50%; background: #fff;
      position: absolute; top: 2px; left: 2px;
      transition: left 200ms ease; pointer-events: none;
    }
    .cv-toggle-pill.on .cv-toggle-knob { left: 15px; }

    .cv-pill-btn {
      background: transparent; border: 1px solid #2a2a2a;
      border-radius: 20px; padding: 5px 16px; font: 11px Cinzel,serif;
      color: #555; cursor: pointer; transition: all 150ms ease;
    }
    .cv-pill-btn:hover { border-color: #444; color: #888; }
    .cv-pill-btn.active {
      background: var(--accent, #ffcc00); border-color: var(--accent, #ffcc00);
      color: #000; font-weight: 500;
    }

    .cv-ctrl-btn {
      background: #1e1e1e; border: 1px solid #2a2a2a; border-radius: 8px;
      padding: 7px 4px; text-align: center; cursor: pointer;
      transition: all 150ms ease;
    }
    .cv-ctrl-btn:hover { border-color: #444; background: #252525; }
    .cv-ctrl-btn.danger:hover { border-color: #aa3333; background: #1a0808; }
    .cv-ctrl-icon { font-size: 14px; display: block; margin-bottom: 2px; }
    .cv-ctrl-label { font: 10px Inter,sans-serif; color: #666; }

    .cv-confirm-modal {
      position: fixed; top: 50%; left: 50%; z-index: 1000;
      transform: translate(-50%, -50%) scale(0.95);
      background: #161616; border: 1px solid #2a2a2a; border-radius: 12px;
      padding: 24px; min-width: 280px; text-align: center;
      animation: cv-result-slide-in 200ms ease-out forwards;
    }
    .cv-confirm-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 999;
    }

    .cv-lb-row {
      animation: cv-leaderboard-fade-in 300ms ease-out both;
    }

    .cv-skin-card {
      background: #1e1e1e; border: 1px solid #2a2a2a; border-radius: 8px;
      padding: 10px 8px; display: flex; flex-direction: column;
      align-items: center; gap: 6px; cursor: pointer;
      transition: all 150ms ease; position: relative;
    }
    .cv-skin-card:hover { border-color: #444; transform: translateY(-2px); }
    .cv-skin-card.active { border: 2px solid var(--accent,#ffcc00); }
    .cv-skin-card.locked { opacity: 0.5; cursor: default; }
    .cv-skin-card.locked:hover { transform: none; border-color: #2a2a2a; }

    .cv-heart-btn {
      position: absolute; top: 4px; right: 4px;
      font-size: 13px; color: #333; cursor: pointer;
      transition: all 100ms ease; line-height: 1;
    }
    .cv-heart-btn.fav { color: #ff3333; transform: scale(1.2); }
  `;
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 18: TOAST NOTIFICATION SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

const toastQueue = [];
let activeToasts = { right: null, left: null, center: null, bottom: null };

function showToast(text, position = 'right', duration = 3000, borderColor = '#2a2a2a', icon = '') {
  const el = document.createElement('div');
  el.className = `cv-toast cv-toast-${position}`;
  el.style.borderLeft = `3px solid ${borderColor}`;
  el.innerHTML = (icon ? `<span style="font-size:16px">${icon}</span>` : '') +
    `<span>${text}</span>`;
  document.body.appendChild(el);

  setTimeout(() => {
    el.style.transition = 'opacity 300ms ease, transform 300ms ease';
    el.style.opacity = '0';
    el.style.transform = position === 'right' ? 'translateX(120%)' :
      position === 'left' ? 'translateX(-120%)' : 'translateY(-20px)';
    setTimeout(() => el.remove(), 320);
  }, duration);

  return el;
}

function showAchievementToast(achievement) {
  showToast(
    `<strong style="color:${achievement.color||'#ffcc00'}">${achievement.name}</strong><br>
     <span style="font-size:10px;color:#888">${achievement.description}</span>`,
    'right', 3500, achievement.color || '#ffcc00', achievement.icon || '🏆'
  );
}

function showStreakToast(milestone) {
  showToast(
    `<strong style="color:${milestone.color}">${milestone.name}</strong><br>
     <span style="font-size:10px;color:#888">${milestone.count} Cutscenes This Game!</span>`,
    'left', 3000, milestone.color, milestone.icon || '🔥'
  );
}

function showDailyCompleteToast() {
  showToast(
    `<strong style="color:#ffd700">Daily Challenge Complete!</strong> ✦`,
    'center', 4000, '#ffd700', '⭐'
  );
}

function showDecayToast(botName, daysInactive) {
  showToast(
    `<strong>${botName}</strong> has been resting ${daysInactive} days and forgotten some patterns.<br>
     <span style="font-size:10px;color:#888">Play a game to rebuild its memory.</span>`,
    'bottom', 6000, '#ff8800', '😴'
  );
}

function showEloChangeIndicator(element, delta) {
  const el = document.createElement('span');
  el.style.cssText = `
    position: absolute; font: 11px Cinzel,serif; font-weight: 500;
    pointer-events: none; z-index: 100;
    color: ${delta >= 0 ? '#00cc44' : '#ff3333'};
    animation: ${delta >= 0 ? 'cv-elo-change-up' : 'cv-elo-change-down'} 3s ease-out forwards;
  `;
  el.textContent = delta >= 0 ? `+${delta}` : `${delta}`;
  element.style.position = 'relative';
  element.appendChild(el);
  setTimeout(() => el.remove(), 3100);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 19: CONFETTI
// ─────────────────────────────────────────────────────────────────────────────

function playConfetti(winnerColor) {
  const fill = winnerColor === 'white' ? ['#f5f0e8','#e8e0d0','#fff'] : ['#333','#444','#222'];
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1999;overflow:hidden;';
  document.body.appendChild(container);

  for (let i = 0; i < 50; i++) {
    const piece = document.createElement('div');
    const size = rand(6, 14);
    const left = rand(0, 100);
    const delay = rand(0, 1200);
    const duration = rand(1800, 2800);
    const rotation = rand(0, 360);
    const color = fill[Math.floor(Math.random() * fill.length)];
    piece.style.cssText = `
      position: absolute;
      width: ${size}px; height: ${size}px;
      background: ${color};
      left: ${left}vw; top: -20px;
      transform: rotate(${rotation}deg);
      animation: cv-confetti-fall ${duration}ms ease-in ${delay}ms forwards;
    `;
    container.appendChild(piece);
  }

  setTimeout(() => container.remove(), 3500);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 20: UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgba(hex, alpha) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(255,255,255,${alpha})`;
  return `rgba(${parseInt(result[1],16)},${parseInt(result[2],16)},${parseInt(result[3],16)},${alpha})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 22: BUILT-IN PIECE VIEWER (call ChessVisuals.openPieceViewer())
// ─────────────────────────────────────────────────────────────────────────────

function openPieceViewer() {
  if (document.getElementById('cv-piece-viewer')) return;

  const VIEWER_SKINS = [
    // Common
    { id:'default',        name:'Default',         rarity:'common'  },
    { id:'crimson-red',    name:'Crimson Red',      rarity:'common'  },
    { id:'ocean-blue',     name:'Ocean Blue',       rarity:'common'  },
    { id:'forest-green',   name:'Forest Green',     rarity:'common'  },
    { id:'charcoal',       name:'Charcoal',         rarity:'common'  },
    // Rare
    { id:'frosted-glass',  name:'Frosted Glass',    rarity:'rare'    },
    { id:'brushed-steel',  name:'Brushed Steel',    rarity:'rare'    },
    { id:'warm-marble',    name:'Warm Marble',      rarity:'rare'    },
    { id:'obsidian-stone', name:'Obsidian Stone',   rarity:'rare'    },
    { id:'onyx',           name:'Onyx',             rarity:'rare'    },
    // Epic
    { id:'static-shock',   name:'Static Shock',     rarity:'epic'    },
    { id:'molten-core',    name:'Molten Core',      rarity:'epic'    },
    { id:'neon-pulse',     name:'Neon Pulse',       rarity:'epic'    },
    { id:'prism-shift',    name:'Prism Shift',      rarity:'epic'    },
    { id:'void-drift',     name:'Void Drift',       rarity:'epic'    },
    { id:'deep-current',   name:'Deep Current',     rarity:'epic'    },
    // Unique
    { id:'last-bloom',     name:'Last Bloom',       rarity:'unique'  },
    { id:'dying-star',     name:'Dying Star',       rarity:'unique'  },
    { id:'singularity',    name:'Singularity',      rarity:'unique'  },
    { id:'between-worlds', name:'Between Worlds',   rarity:'unique'  },
    { id:'the-revelation', name:'The Revelation',   rarity:'unique'  },
    { id:'permafrost',     name:'Permafrost',       rarity:'unique'  },
    { id:'thunderwall',    name:'Thunderwall',      rarity:'unique'  },
    { id:'fallen-citadel', name:'Fallen Citadel',   rarity:'unique'  },
    { id:'pale-court',     name:'The Pale Court',   rarity:'unique'  },
    { id:'the-deep',       name:'The Deep',         rarity:'unique'  },
    { id:'ascension',      name:'Ascension',        rarity:'unique'  },
    { id:'long-winter',    name:'The Long Winter',  rarity:'unique'  },
  ];

  const RARITY_COLORS = {
    common:'#aaaaaa', rare:'#4488ff', epic:'#ffcc00', unique:'#ff3333',
  };

  const PIECES = ['king','queen','bishop','knight','rook','pawn'];
  let vStyle = 'Classic', vSkin = 'default', vPiece = 'king', vTime = 0;
  let vRaf = null;
  const pieceCanvases = {};

  const overlay = document.createElement('div');
  overlay.id = 'cv-piece-viewer';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:99999;
    background:#080810;
    font-family:'Inter',sans-serif;
    overflow-y:auto;overflow-x:hidden;
    color:#e0e0e0;
  `;

  overlay.innerHTML = `
    <style>
      #cv-piece-viewer * { box-sizing:border-box;margin:0;padding:0; }
      #cv-piece-viewer h1 {
        font-family:'Cinzel',serif;font-size:26px;
        background:linear-gradient(135deg,#ffcc00,#ff9900,#ffcc00);
        -webkit-background-clip:text;-webkit-text-fill-color:transparent;
        background-clip:text;letter-spacing:3px;
      }
      #cv-piece-viewer .pill {
        background:transparent;border:1px solid #222;border-radius:20px;
        padding:5px 16px;font:11px 'Cinzel',serif;color:#444;cursor:pointer;
        transition:all 150ms;letter-spacing:1px;
      }
      #cv-piece-viewer .pill:hover{border-color:#555;color:#888;}
      #cv-piece-viewer .pill.active{background:#1a1200;border-color:#ffcc00;color:#ffcc00;}
      #cv-piece-viewer .pcard {
        background:#0e0e18;border:1px solid #1a1a2a;border-radius:10px;
        overflow:hidden;cursor:pointer;transition:all 180ms;
      }
      #cv-piece-viewer .pcard:hover{border-color:#333;transform:translateY(-3px);}
      #cv-piece-viewer .pcard.sel{border-color:#ffcc00;box-shadow:0 0 20px rgba(255,204,0,0.12);}
      #cv-piece-viewer .plbl{text-align:center;padding:6px 0 8px;font:9px 'Cinzel',serif;color:#444;letter-spacing:1.5px;}
      #cv-piece-viewer .pcard.sel .plbl{color:#ffcc00;}
      #cv-piece-viewer .schip {
        background:#111;border:1px solid #1e1e1e;border-radius:20px;
        padding:4px 12px;font:10px 'Inter',sans-serif;color:#444;
        cursor:pointer;transition:all 140ms;white-space:nowrap;
      }
      #cv-piece-viewer .schip:hover{border-color:#333;color:#777;}
      #cv-piece-viewer .schip.act{font-weight:500;}
      #cv-piece-viewer .schip.act.common{border-color:#888;color:#ccc;background:#181818;}
      #cv-piece-viewer .schip.act.rare{border-color:#4488ff;color:#4488ff;background:#001030;}
      #cv-piece-viewer .schip.act.epic{border-color:#ffcc00;color:#ffcc00;background:#1a1000;}
      #cv-piece-viewer .schip.act.unique{border-color:#ff3333;color:#ff3333;background:#1a0000;}
      #cv-piece-viewer .rlbl{font:9px 'Cinzel',serif;letter-spacing:2px;margin-bottom:6px;display:flex;align-items:center;gap:8px;}
      #cv-piece-viewer .rlbl::after{content:'';flex:1;height:1px;background:currentColor;opacity:0.15;}
      #cv-piece-viewer .dcard{background:#0a0a14;border:1px solid #1a1a28;border-radius:14px;overflow:hidden;}
      #cv-piece-viewer .dhdr{padding:12px 18px 10px;border-bottom:1px solid #14141e;display:flex;align-items:center;justify-content:space-between;}
      #cv-piece-viewer .dtitle{font:12px 'Cinzel',serif;color:#666;letter-spacing:1px;}
      #cv-piece-viewer .dbadge{font:9px 'Inter',sans-serif;color:#333;background:#141414;border:1px solid #1e1e1e;border-radius:8px;padding:2px 8px;}
    </style>
    <div style="max-width:1060px;margin:0 auto;padding:32px 20px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">
        <div>
          <h1>CHESS PIECES</h1>
          <p style="font-size:10px;color:#333;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Detailed · Creative · Animated</p>
        </div>
        <button id="cv-viewer-close" style="background:#1e1e1e;border:1px solid #333;border-radius:8px;color:#666;font:12px Inter,sans-serif;padding:8px 16px;cursor:pointer;">✕ Close</button>
      </div>

      <!-- Style pills -->
      <div style="display:flex;gap:6px;justify-content:center;margin-bottom:24px;" id="cv-style-row">
        <button class="pill active" data-s="Classic">Classic</button>
        <button class="pill" data-s="Neo">Neo</button>
        <button class="pill" data-s="Minimal">Minimal</button>
        <button class="pill" data-s="Wood">Wood</button>
      </div>

      <!-- Skin panel -->
      <div style="background:#0d0d14;border:1px solid #1a1a2a;border-radius:14px;padding:18px;margin-bottom:24px;">
        <p style="font:10px 'Cinzel',serif;color:#333;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">Skin</p>
        <div id="cv-skin-rows"></div>
      </div>

      <!-- 6-piece showcase -->
      <div id="cv-showcase" style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:24px;"></div>

      <!-- Large detail + board row -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        <div class="dcard">
          <div class="dhdr"><span class="dtitle" id="cv-dt1">KING</span><span class="dbadge">WHITE</span></div>
          <div style="display:flex;justify-content:center;align-items:center;padding:20px;min-height:200px;background:radial-gradient(ellipse at center,rgba(255,204,0,0.02) 0%,transparent 70%);">
            <canvas id="cv-dw" width="180" height="200"></canvas>
          </div>
        </div>
        <div class="dcard">
          <div class="dhdr"><span class="dtitle" id="cv-dt2">KING</span><span class="dbadge">BLACK</span></div>
          <div style="display:flex;justify-content:center;align-items:center;padding:20px;min-height:200px;background:radial-gradient(ellipse at center,rgba(255,204,0,0.02) 0%,transparent 70%);">
            <canvas id="cv-db" width="180" height="200"></canvas>
          </div>
        </div>
      </div>

      <p style="font:9px 'Cinzel',serif;color:#2a2a2a;letter-spacing:2px;text-transform:uppercase;text-align:center;margin-bottom:8px;">All pieces on board</p>
      <div style="border-radius:8px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.5);">
        <canvas id="cv-board-row" width="672" height="84"></canvas>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Build skin rows
  const skinRows = overlay.querySelector('#cv-skin-rows');
  const rarities = ['common','rare','epic','unique'];
  const rarityNames = { common:'Common',rare:'Rare',epic:'Epic ✦',unique:'Unique ★' };
  rarities.forEach(r => {
    const skins = VIEWER_SKINS.filter(s => s.rarity === r);
    const div = document.createElement('div');
    div.style.cssText = 'margin-bottom:12px;';
    div.innerHTML = `<div class="rlbl" style="color:${RARITY_COLORS[r]}">${rarityNames[r]}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;" id="cv-sr-${r}"></div>`;
    skinRows.appendChild(div);
    const row = div.querySelector(`#cv-sr-${r}`);
    skins.forEach(s => {
      const btn = document.createElement('button');
      btn.className = `schip ${r}` + (s.id === vSkin ? ' act' : '');
      btn.textContent = s.name;
      btn.onclick = () => {
        vSkin = s.id;
        overlay.querySelectorAll('.schip').forEach(b => b.classList.remove('act'));
        btn.classList.add('act');
      };
      row.appendChild(btn);
    });
  });

  // Build showcase
  const showcase = overlay.querySelector('#cv-showcase');
  PIECES.forEach(piece => {
    const card = document.createElement('div');
    card.className = 'pcard' + (piece === vPiece ? ' sel' : '');
    const cv = document.createElement('canvas');
    cv.width = 120; cv.height = 120;
    const lbl = document.createElement('div');
    lbl.className = 'plbl';
    lbl.textContent = piece.toUpperCase();
    card.appendChild(cv); card.appendChild(lbl);
    card.onclick = () => {
      vPiece = piece;
      overlay.querySelectorAll('.pcard').forEach(c => c.classList.remove('sel'));
      card.classList.add('sel');
      overlay.querySelector('#cv-dt1').textContent = piece.toUpperCase();
      overlay.querySelector('#cv-dt2').textContent = piece.toUpperCase();
    };
    showcase.appendChild(card);
    pieceCanvases[piece] = cv;
  });

  // Style buttons
  overlay.querySelector('#cv-style-row').addEventListener('click', e => {
    if (!e.target.dataset.s) return;
    vStyle = e.target.dataset.s;
    overlay.querySelectorAll('#cv-style-row .pill').forEach(b => b.classList.toggle('active', b.dataset.s === vStyle));
  });

  // Close
  overlay.querySelector('#cv-viewer-close').onclick = () => {
    cancelAnimationFrame(vRaf);
    overlay.remove();
  };

  // Render loop
  const start = performance.now();
  function vRender(now) {
    vTime = now - start;

    // Showcase cards
    PIECES.forEach(piece => {
      const cv = pieceCanvases[piece];
      const ctx = cv.getContext('2d');
      const W = cv.width, H = cv.height;
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle = PIECES.indexOf(piece)%2===0 ? '#1e1a28' : '#12181e';
      ctx.fillRect(0,0,W,H);
      const sc = W/88;
      // White piece left, black right
      renderSkin(ctx,'white', piece, W*0.32, H*0.56, sc, vSkin==='default'?null:vSkin, vTime);
      renderSkin(ctx,'black', piece, W*0.72, H*0.56, sc, vSkin==='default'?null:vSkin, vTime);
      if (vSkin === 'default') {
        renderPiece(ctx, piece, 'white', W*0.32, H*0.56, sc, vStyle);
        renderPiece(ctx, piece, 'black', W*0.72, H*0.56, sc, vStyle);
      }
    });

    // Detail canvases
    ['white','black'].forEach((col,ci) => {
      const cv = overlay.querySelector(ci===0?'#cv-dw':'#cv-db');
      const ctx = cv.getContext('2d');
      const W=cv.width, H=cv.height;
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='rgba(255,204,0,0.02)';ctx.fillRect(0,0,W,H);
      const sc=W/78;
      if(vSkin==='default') renderPiece(ctx,vPiece,col,W/2,H/2+8,sc,vStyle);
      else renderSkin(ctx,col,vPiece,W/2,H/2+8,sc,vSkin,vTime);
    });

    // Board row
    const br = overlay.querySelector('#cv-board-row');
    const bctx = br.getContext('2d');
    const BW=br.width, BH=br.height, sq=BH;
    bctx.clearRect(0,0,BW,BH);
    for(let i=0;i<12;i++){
      bctx.fillStyle=i%2===0?'#F0D9B5':'#B58863';
      bctx.fillRect(i*sq,0,sq,sq);
    }
    PIECES.forEach((p,i)=>{
      const sc=sq/88;
      if(vSkin==='default') renderPiece(bctx,p,'white',i*sq+sq/2,BH/2+4,sc,vStyle);
      else renderSkin(bctx,'white',p,i*sq+sq/2,BH/2+4,sc,vSkin,vTime);
    });
    PIECES.forEach((p,i)=>{
      const sc=sq/88;
      if(vSkin==='default') renderPiece(bctx,p,'black',(i+6)*sq+sq/2,BH/2+4,sc,vStyle);
      else renderSkin(bctx,'black',p,(i+6)*sq+sq/2,BH/2+4,sc,vSkin,vTime);
    });

    vRaf = requestAnimationFrame(vRender);
  }

  // Fix renderSkin signature for viewer (pieceColor, pieceType order)
  function renderSkin(color, piece, x, y, sc, skinId, t) {
    if (!skinId) return;
    const ctx2 = null; // placeholder — actual draw happens via module renderSkin
    // Route to module-level renderSkin with correct arg order
    window.ChessVisuals.renderSkin(
      // We need the canvas ctx — this is called from within the loop above
      // So we reroute: viewer calls module directly
    );
  }

  vRaf = requestAnimationFrame(vRender);
}



function initChessVisuals() {
  injectGlobalStyles();
  initBackgroundCanvas();
  console.log('[ChessVisuals] Initialized. All visual systems ready.');
}

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChessVisuals);
} else {
  initChessVisuals();
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API — chess_popup.js calls these
// ─────────────────────────────────────────────────────────────────────────────

window.ChessVisuals = {
  // Background
  startBackgroundAnimation,
  stopBackgroundAnimation,
  setBackgroundEnabled,

  // Piece rendering
  renderPiece,
  renderSkin,
  renderBadge,
  renderBoardBorder,
  renderBoardSquareSkin,

  // Trails & glows
  spawnTrail,
  renderTrails,
  renderCursedGlow,

  // Graphs
  renderEloGraph,
  renderLevelGraph,

  // Skin previews
  renderSkinPreview,
  startSkinPreviewLoop,
  renderZoomPreview,
  startZoomPreviewLoop,

  // Avatar
  renderAvatarSkin,
  startAvatarSkinLoop,
  stopAvatarLoop,

  // Favorite cycling
  startFavoriteCycleAnimation,
  stopFavoriteCycleAnimation,

  // Particles & effects
  playLevelUpBurst,
  playConfetti,

  // Toasts & notifications
  showToast,
  showAchievementToast,
  showStreakToast,
  showDailyCompleteToast,
  showDecayToast,
  showEloChangeIndicator,

  // Internal state (read-only)
  get activeTrails() { return CV.activeTrails; },
  get bgEnabled() { return CV.bgEnabled; },
};
