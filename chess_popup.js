(function () {
  var state = null;
  var replay = null;
  var replayIndex = 0;
  var selectedSquare = null;
  var aiPending = false;
  var movePending = false;
  var analysisPending = false;
  var pendingBoardAnimation = null;
  var boardAnimationTimer = 0;
  var promotionContext = null;
  var lastHint = null;
  var dismissedResultKey = "";
  var setupDirty = false;
  var clockTimer = null;
  var clockAnchorMs = 0;
  var FRONTEND_DATA_KEY = "chessCutsceneData";
  var THEME_NAMES = ["classic", "midnight", "forest", "crimson", "ice", "gold", "neon", "obsidian"];
  var ROOT_THEME_VARIABLES = [
    "--bg-page",
    "--bg-page-alt",
    "--bg-panel",
    "--bg-panel-strong",
    "--bg-panel-soft",
    "--bg-board-shell",
    "--bg-board-inner",
    "--board-light",
    "--board-dark",
    "--board-border",
    "--accent",
    "--accent-rgb",
    "--accent-soft",
    "--border-color",
    "--panel-border",
    "--text-primary",
    "--text-secondary",
    "--text-muted",
    "--danger",
    "--success",
    "--selection-ring",
    "--last-light",
    "--last-dark",
    "--legal-dot",
    "--legal-ring",
    "--button-start",
    "--button-end",
    "--button-text",
    "--scroll-track",
    "--scroll-thumb",
    "--overlay-backdrop",
    "--panel-overlay"
  ];
  var THEME_ALIASES = {
    classic: "classic",
    midnight: "midnight",
    forest: "forest",
    crimson: "crimson",
    ember: "crimson",
    ice: "ice",
    frost: "ice",
    winter: "ice",
    gold: "gold",
    gilded: "gold",
    neon: "neon",
    terminal: "neon",
    obsidian: "obsidian",
    onyx: "obsidian"
  };
  var backgroundAnimationFrame = 0;
  var backgroundAnimationInitialized = false;
  var backgroundAnimationSignature = "";
  var backgroundAnimationTheme = "classic";
  var backgroundLastFrame = 0;
  var backgroundParticles = [];
  var backgroundMeta = {};
  var backgroundAnimationAutoDisabled =
    typeof navigator !== "undefined" &&
    navigator.hardwareConcurrency &&
    navigator.hardwareConcurrency < 4;
  var boardLayers = null;
  var boardImageCache = {};
  var hoveredSquare = "";
  var activePointerState = null;
  var dragState = null;
  var boardAnnotations = [];
  var annotationGesture = null;
  var moveTrails = [];
  var moveTrailFrame = 0;
  var needsRedraw = true;
  var cutsceneActive = false;
  var cutsceneQueued = false;
  var gameLoopFrame = 0;
  var gameLoopLastFrame = 0;
  var hoverSquareProgress = {};
  var dragSnapback = null;
  var borderCanvasState = { cssWidth: 0, cssHeight: 0, pixelRatio: 1 };
  var touchLongPressTimer = 0;
  var touchAnnotationMode = null;
  var queuedPremove = null;
  var pendingConfirmAction = null;
  var toastNonce = 0;

  var PROMOTION_ORDER = ["queen", "rook", "bishop", "knight"];
  var PROMOTION_LABELS = {
    queen: "Queen",
    rook: "Rook",
    bishop: "Bishop",
    knight: "Knight"
  };
  var PIECE_LETTERS = {
    king: "K",
    queen: "Q",
    rook: "R",
    bishop: "B",
    knight: "N",
    pawn: "P"
  };
  var PIECE_MATERIAL_VALUES = {
    queen: 9,
    rook: 5,
    bishop: 3,
    knight: 3,
    pawn: 1,
    king: 0
  };
  var OPENING_PREVIEWS = [
    { moves: ["e4"], label: "C20 — King's Pawn Game" },
    { moves: ["e4", "e5"], label: "C20 — Open Game" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"], label: "C60 — Ruy Lopez" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"], label: "C50 — Italian Game" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "d4"], label: "C44 — Scotch Game" },
    { moves: ["e4", "e5", "Nf3", "Nf6"], label: "C42 — Petrov Defence" },
    { moves: ["e4", "c5"], label: "B20 — Sicilian Defense" },
    { moves: ["e4", "c5", "Nf3", "Nc6"], label: "B30 — Sicilian Defense" },
    { moves: ["e4", "c5", "Nf3", "d6"], label: "B50 — Sicilian Defense" },
    { moves: ["e4", "e6"], label: "C00 — French Defense" },
    { moves: ["e4", "c6"], label: "B10 — Caro-Kann Defense" },
    { moves: ["e4", "d6"], label: "B07 — Pirc Defense" },
    { moves: ["e4", "d5"], label: "B01 — Scandinavian Defense" },
    { moves: ["d4"], label: "A40 — Queen's Pawn Game" },
    { moves: ["d4", "d5"], label: "D00 — Queen's Pawn Game" },
    { moves: ["d4", "d5", "c4"], label: "D06 — Queen's Gambit" },
    { moves: ["d4", "d5", "c4", "e6"], label: "D30 — Queen's Gambit Declined" },
    { moves: ["d4", "d5", "c4", "c6"], label: "D10 — Slav Defense" },
    { moves: ["d4", "Nf6"], label: "A46 — Indian Defense" },
    { moves: ["d4", "Nf6", "c4"], label: "E00 — Indian Game" },
    { moves: ["d4", "Nf6", "c4", "g6"], label: "E60 — King's Indian Defense" },
    { moves: ["d4", "Nf6", "c4", "e6"], label: "E10 — Indian Game" },
    { moves: ["c4"], label: "A10 — English Opening" },
    { moves: ["Nf3"], label: "A04 — Zukertort Opening" },
    { moves: ["f4"], label: "A02 — Bird Opening" },
    { moves: ["b3"], label: "A01 — Larsen's Opening" },
    { moves: ["g3"], label: "A00 — King's Fianchetto Opening" }
  ];
  var TRAIL_STYLE_OPTIONS = [
    { id: "default", label: "Default", previewClass: "trail-default", caption: "Ghost silhouettes", unlockText: "Always available." },
    { id: "flame", label: "Flame", previewClass: "trail-flame", caption: "Orange ember wisps", unlockText: "Unlock: trigger 10 cutscenes total." },
    { id: "ice", label: "Ice", previewClass: "trail-ice", caption: "Crystal fragments", unlockText: "Unlock: reach Blue badge tier on any cutscene." },
    { id: "gold", label: "Gold", previewClass: "trail-gold", caption: "Sparkle dust", unlockText: "Unlock: reach Gold badge tier on any cutscene." },
    { id: "royal", label: "Royal", previewClass: "trail-royal", caption: "Violet orbs", unlockText: "Unlock: witness all 5 Unique cutscenes." },
    { id: "shadow", label: "Shadow", previewClass: "trail-shadow", caption: "Black smoke wisps", unlockText: "Unlock: trigger Regicide 10 times." }
  ];
  var BORDER_STYLE_OPTIONS = [
    { id: "theme-default", label: "Auto", previewClass: "border-auto", caption: "Match theme border", unlockText: "Always available." },
    { id: "classic", label: "Classic", previewClass: "border-classic", caption: "Oak grain", unlockText: "Always available." },
    { id: "midnight", label: "Midnight", previewClass: "border-midnight", caption: "Dark riveted metal", unlockText: "Always available." },
    { id: "forest", label: "Forest", previewClass: "border-forest", caption: "Carved stone vinework", unlockText: "Always available." },
    { id: "crimson", label: "Crimson", previewClass: "border-crimson", caption: "Iron flamework", unlockText: "Always available." },
    { id: "ice", label: "Ice", previewClass: "border-ice", caption: "Frosted glass", unlockText: "Always available." },
    { id: "gold", label: "Gold", previewClass: "border-gold", caption: "Gilded flourishes", unlockText: "Always available." },
    { id: "neon", label: "Neon", previewClass: "border-neon", caption: "Circuit traces", unlockText: "Always available." },
    { id: "obsidian", label: "Obsidian", previewClass: "border-obsidian", caption: "Runic basalt", unlockText: "Always available." },
    { id: "dragon", label: "Dragon", previewClass: "border-dragon", caption: "Scalework", unlockText: "Unlock: Boss Capture 5 times." },
    { id: "marble", label: "Marble", previewClass: "border-marble", caption: "Veined stone", unlockText: "Unlock: Completionist achievement." },
    { id: "void", label: "Void", previewClass: "border-void", caption: "Starfield", unlockText: "Unlock: Meteor Strike 25 times." }
  ];
  // Inline SVG bodies for each chess piece. The fill / stroke colors are
  // injected per call from `pieceSvg()` so white and black pieces share the
  // same shapes but render with contrasting palettes. The knight SVG below
  // is a simplified tracing of the widely-recognized Colin M.L. Burnett
  // (Wikimedia) Staunton-style knight — a horse head in right-facing
  // profile with mane, ear, eye and nostril detail.
  var PIECE_SVG_SHARED = {
    king:
      '<path d="M22.5 6 L22.5 14 M19 9 L26 9" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M22.5 14 C16 17 14 24 17 30 L28 30 C31 24 29 17 22.5 14 Z"/>' +
      '<path d="M12 30 L33 30 L31 34 L14 34 Z"/>' +
      '<ellipse cx="22.5" cy="37" rx="14" ry="2.5"/>',
    queen:
      '<circle cx="9" cy="9" r="2"/>' +
      '<circle cx="15.75" cy="7" r="2"/>' +
      '<circle cx="22.5" cy="5.5" r="2"/>' +
      '<circle cx="29.25" cy="7" r="2"/>' +
      '<circle cx="36" cy="9" r="2"/>' +
      '<path d="M9 11 L13 22 L15.75 9 L19.5 22 L22.5 8 L25.5 22 L29.25 9 L32 22 L36 11 L34 30 L11 30 Z"/>' +
      '<path d="M11 30 L34 30 L32 34 L13 34 Z"/>' +
      '<ellipse cx="22.5" cy="37" rx="14" ry="2.5"/>',
    rook:
      '<path d="M11 10 L17 10 L17 13 L20 13 L20 10 L25 10 L25 13 L28 13 L28 10 L34 10 L34 16 L31 19 L31 29 L34 32 L34 36 L11 36 L11 32 L14 29 L14 19 L11 16 Z"/>' +
      '<line x1="14" y1="19" x2="31" y2="19" stroke-linecap="round"/>' +
      '<line x1="14" y1="29" x2="31" y2="29" stroke-linecap="round"/>' +
      '<ellipse cx="22.5" cy="38" rx="13" ry="2.5"/>',
    bishop:
      '<circle cx="22.5" cy="7" r="2.2"/>' +
      '<path d="M22.5 9 C28 11 30 19 28 26 C25 30 20 30 17 26 C15 19 17 11 22.5 9 Z"/>' +
      '<line x1="18" y1="16" x2="27" y2="16" stroke-linecap="round" stroke-width="1.4"/>' +
      '<path d="M14 30 L31 30 L29 34 L16 34 Z"/>' +
      '<ellipse cx="22.5" cy="37" rx="13" ry="2.5"/>',
    pawn:
      '<circle cx="22.5" cy="11" r="5.5"/>' +
      '<path d="M17 18 L28 18 L30 30 L15 30 Z"/>' +
      '<ellipse cx="22.5" cy="33" rx="11" ry="2"/>' +
      '<ellipse cx="22.5" cy="37" rx="13" ry="2.5"/>'
  };

  // Special knight variants used by the themed sets below. "worm" keeps the
  // older curved abstract silhouette the user asked to preserve, while
  // "bird" stays as the avian profile.
  var KNIGHT_SVG_BY_SET = {
    worm:
      '<path d="M 27 36 L 32 18 C 33 13 31 9 27 8 L 28 3 L 24 6 ' +
      'C 20 5 16 8 14 12 L 6 17 L 4 22 L 6 25 L 12 24 ' +
      'C 16 25 18 27 20 29 L 22 36 Z"/>' +
      '<circle cx="17" cy="14" r="1.1"/>' +
      '<circle cx="6" cy="22" r="0.7"/>' +
      '<path d="M 30 13 L 33 15 M 31 18 L 34 20 M 31 23 L 34 25" ' +
      'fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="22.5" cy="37" rx="13" ry="2.5"/>',
    bird:
      '<path d="M20 8 C25 7 30 10 31 15 C32 18 32 21 34 24 ' +
      'L34 34 L11 34 L11 30 C12 26 14 24 15 20 C17 15 16 11 20 8 Z"/>' +
      '<path d="M15 16 L18 14 L17 19 Z"/>' +
      '<circle cx="27" cy="16" r="0.9"/>' +
      '<ellipse cx="22.5" cy="37" rx="13" ry="2.5"/>'
  };

  function svgParts(parts) {
    return parts.join("");
  }

  var MODERN_PIECE_SVG_BY_SET = {
    classic: {
      king: PIECE_SVG_SHARED.king,
      queen: PIECE_SVG_SHARED.queen,
      rook: PIECE_SVG_SHARED.rook,
      bishop: PIECE_SVG_SHARED.bishop,
      knight: KNIGHT_SVG_BY_SET.worm,
      pawn: PIECE_SVG_SHARED.pawn
    },
    royal: {
      king: svgParts([
        '<path d="M22.5 4.8 L22.5 12.8 M18.5 8.8 L26.5 8.8" stroke-linecap="round" stroke-linejoin="round"/>',
        '<path d="M15 14 L18 11.5 L20 15.2 L22.5 10.8 L25 15.2 L27 11.5 L30 14 L29 27.5 L16 27.5 Z"/>',
        '<path d="M18 20.5 L27 20.5" stroke-linecap="round"/>',
        '<path d="M13 28 L32 28 L30.5 34 L14.5 34 Z"/>',
        '<ellipse cx="22.5" cy="37" rx="14" ry="2.5"/>'
      ]),
      queen: svgParts([
        '<circle cx="9.5" cy="10" r="1.7"/>',
        '<circle cx="16" cy="7.8" r="1.8"/>',
        '<circle cx="22.5" cy="5.8" r="1.9"/>',
        '<circle cx="29" cy="7.8" r="1.8"/>',
        '<circle cx="35.5" cy="10" r="1.7"/>',
        '<path d="M9.5 12 L12.8 23.5 L16.5 13.2 L20 23.5 L22.5 10.8 L25 23.5 L28.5 13.2 L32.2 23.5 L35.5 12 L33 30 L12 30 Z"/>',
        '<path d="M12 30 L33 30 L31 34 L14 34 Z"/>',
        '<ellipse cx="22.5" cy="37" rx="14" ry="2.5"/>'
      ]),
      rook: svgParts([
        '<path d="M10.5 10.8 L15 10.8 L15 14 L18.2 14 L18.2 10.8 L22.5 10.8 L22.5 14 L26.8 14 L26.8 10.8 L30 10.8 L30 14 L34.5 14 L34.5 18.2 L31.8 20.4 L31.8 30.2 L34.6 32.4 L34.6 35.4 L10.4 35.4 L10.4 32.4 L13.2 30.2 L13.2 20.4 L10.5 18.2 Z"/>',
        '<path d="M13.2 20.4 L31.8 20.4 M13.2 30.2 L31.8 30.2" stroke-linecap="round"/>',
        '<ellipse cx="22.5" cy="37.6" rx="13.2" ry="2.4"/>'
      ]),
      bishop: svgParts([
        '<circle cx="22.5" cy="7.2" r="2"/>',
        '<path d="M22.5 9.5 C27.8 11.8 30.2 18.2 28.7 25.3 C25.9 30.3 19.1 30.3 16.3 25.3 C14.8 18.2 17.2 11.8 22.5 9.5 Z"/>',
        '<path d="M20 14.5 L25.8 22.5" fill="none" stroke-linecap="round"/>',
        '<path d="M14.8 30.2 L30.2 30.2 L28.4 34 L16.6 34 Z"/>',
        '<ellipse cx="22.5" cy="37" rx="13.4" ry="2.4"/>'
      ]),
      knight: KNIGHT_SVG_BY_SET.worm,
      pawn: svgParts([
        '<circle cx="22.5" cy="11.2" r="4.8"/>',
        '<path d="M18 18 L27 18 L29.4 29.5 L15.6 29.5 Z"/>',
        '<path d="M16 31.4 L29 31.4" stroke-linecap="round"/>',
        '<ellipse cx="22.5" cy="37" rx="13" ry="2.4"/>'
      ])
    },
    gothic: {
      king: svgParts([
        '<path d="M22.5 5 L22.5 12.5 M19 8.8 L26 8.8" stroke-linecap="round" stroke-linejoin="round"/>',
        '<path d="M18 12.8 L22.5 9.8 L27 12.8 L29.5 30 L15.5 30 Z"/>',
        '<path d="M17.4 20.8 L27.6 20.8" stroke-linecap="round"/>',
        '<path d="M12.5 30 L32.5 30 L29.5 34.4 L15.5 34.4 Z"/>',
        '<ellipse cx="22.5" cy="37.2" rx="13.6" ry="2.3"/>'
      ]),
      queen: svgParts([
        '<circle cx="12" cy="10.2" r="1.3"/>',
        '<circle cx="22.5" cy="6.2" r="1.5"/>',
        '<circle cx="33" cy="10.2" r="1.3"/>',
        '<path d="M10.5 13 L14.5 9.5 L18 15 L22.5 8 L27 15 L30.5 9.5 L34.5 13 L32 30 L13 30 Z"/>',
        '<path d="M13 30 L32 30 L29.5 34.4 L15.5 34.4 Z"/>',
        '<ellipse cx="22.5" cy="37.1" rx="13.6" ry="2.3"/>'
      ]),
      rook: svgParts([
        '<path d="M12 10.8 L17 10.8 L17 15.2 L20 15.2 L20 10.8 L25 10.8 L25 15.2 L28 15.2 L28 10.8 L33 10.8 L33 18 L30.5 20.2 L30.5 30.2 L33.8 33.4 L33.8 36 L11.2 36 L11.2 33.4 L14.5 30.2 L14.5 20.2 L12 18 Z"/>',
        '<path d="M18 22.5 L27 22.5 M17 30.2 L28 30.2" stroke-linecap="round"/>',
        '<ellipse cx="22.5" cy="37.8" rx="12.8" ry="2.2"/>'
      ]),
      bishop: svgParts([
        '<circle cx="22.5" cy="6.8" r="1.8"/>',
        '<path d="M22.5 9 C27 12 29.5 17.6 28.3 25 C25.7 30.2 19.3 30.2 16.7 25 C15.5 17.6 18 12 22.5 9 Z"/>',
        '<path d="M22.5 11.8 L25 22.5 L20 22.5 Z"/>',
        '<path d="M15 30.2 L30 30.2 L27.8 34.2 L17.2 34.2 Z"/>',
        '<ellipse cx="22.5" cy="37" rx="12.9" ry="2.3"/>'
      ]),
      knight: KNIGHT_SVG_BY_SET.worm,
      pawn: svgParts([
        '<circle cx="22.5" cy="10.8" r="4.5"/>',
        '<path d="M19 17.6 L26 17.6 L27.6 29.6 L17.4 29.6 Z"/>',
        '<path d="M16.2 31 L28.8 31 L26.8 34.4 L18.2 34.4 Z"/>',
        '<ellipse cx="22.5" cy="37" rx="12.4" ry="2.2"/>'
      ])
    },
    fortress: {
      king: svgParts([
        '<path d="M22.5 5.2 L22.5 12.6 M18.6 8.9 L26.4 8.9" stroke-linecap="round" stroke-linejoin="round"/>',
        '<path d="M15.5 14.2 L29.5 14.2 L29.5 23.4 L31.5 23.4 L31.5 31.2 L13.5 31.2 L13.5 23.4 L15.5 23.4 Z"/>',
        '<path d="M11.5 31.2 L33.5 31.2 L33.5 35 L11.5 35 Z"/>',
        '<ellipse cx="22.5" cy="37.5" rx="13.8" ry="2.3"/>'
      ]),
      queen: svgParts([
        '<path d="M10.5 13 L14 8.8 L17.5 13 L20.4 9 L22.5 13 L24.6 9 L27.5 13 L31 8.8 L34.5 13 L32.4 30.4 L12.6 30.4 Z"/>',
        '<path d="M11.8 30.4 L33.2 30.4 L33.2 34.2 L11.8 34.2 Z"/>',
        '<ellipse cx="22.5" cy="37.2" rx="13.6" ry="2.3"/>'
      ]),
      rook: svgParts([
        '<path d="M10.6 10.6 L16 10.6 L16 14.2 L19.3 14.2 L19.3 10.6 L25.7 10.6 L25.7 14.2 L29 14.2 L29 10.6 L34.4 10.6 L34.4 18.2 L31.6 18.2 L31.6 30.6 L34.2 30.6 L34.2 35.4 L10.8 35.4 L10.8 30.6 L13.4 30.6 L13.4 18.2 L10.6 18.2 Z"/>',
        '<path d="M13.4 22.4 L31.6 22.4 M13.4 30.6 L31.6 30.6" stroke-linecap="square"/>',
        '<ellipse cx="22.5" cy="37.6" rx="13.4" ry="2.2"/>'
      ]),
      bishop: svgParts([
        '<path d="M22.5 6.8 L27.6 13.4 L24.8 15.8 L29 24.8 L29 30.8 L16 30.8 L16 24.8 L20.2 15.8 L17.4 13.4 Z"/>',
        '<path d="M15.2 30.8 L29.8 30.8 L29.8 34.6 L15.2 34.6 Z"/>',
        '<ellipse cx="22.5" cy="37.1" rx="12.8" ry="2.2"/>'
      ]),
      knight: KNIGHT_SVG_BY_SET.worm,
      pawn: svgParts([
        '<circle cx="22.5" cy="11" r="4.2"/>',
        '<path d="M18.2 16.8 L26.8 16.8 L28.8 29.8 L16.2 29.8 Z"/>',
        '<path d="M15 29.8 L30 29.8 L30 34.2 L15 34.2 Z"/>',
        '<ellipse cx="22.5" cy="37.1" rx="12.8" ry="2.2"/>'
      ])
    },
    minimal: {
      king: svgParts([
        '<path d="M22.5 5 L22.5 11.5 M19.2 8.2 L25.8 8.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
        '<path d="M18 14.2 C18 12 27 12 27 14.2 L28.6 28.2 C28.9 31 26.2 33 22.5 33 C18.8 33 16.1 31 16.4 28.2 Z"/>',
        '<path d="M14 34.2 L31 34.2" fill="none" stroke-linecap="round"/>',
        '<ellipse cx="22.5" cy="37.1" rx="12.4" ry="2.1"/>'
      ]),
      queen: svgParts([
        '<circle cx="14" cy="9.5" r="1.4"/>',
        '<circle cx="22.5" cy="6.2" r="1.6"/>',
        '<circle cx="31" cy="9.5" r="1.4"/>',
        '<path d="M14 12.2 L17.5 23.2 L22.5 11.2 L27.5 23.2 L31 12.2 L28.5 29.8 L16.5 29.8 Z"/>',
        '<path d="M15 34.2 L30 34.2" fill="none" stroke-linecap="round"/>',
        '<ellipse cx="22.5" cy="37.1" rx="12.4" ry="2.1"/>'
      ]),
      rook: svgParts([
        '<path d="M13 11 L18 11 L18 14.2 L27 14.2 L27 11 L32 11 L32 18 L29.8 18 L29.8 30.5 L32 30.5 L32 34.2 L13 34.2 L13 30.5 L15.2 30.5 L15.2 18 L13 18 Z"/>',
        '<path d="M15.2 22.4 L29.8 22.4" fill="none" stroke-linecap="round"/>',
        '<ellipse cx="22.5" cy="37.1" rx="12.4" ry="2.1"/>'
      ]),
      bishop: svgParts([
        '<circle cx="22.5" cy="8.2" r="1.7"/>',
        '<path d="M22.5 10.2 C26.5 12.8 28.1 18 27.1 24.2 C25.1 29 19.9 29 17.9 24.2 C16.9 18 18.5 12.8 22.5 10.2 Z"/>',
        '<path d="M20.2 15.2 L24.8 21.8" fill="none" stroke-linecap="round"/>',
        '<path d="M16 34.2 L29 34.2" fill="none" stroke-linecap="round"/>',
        '<ellipse cx="22.5" cy="37.1" rx="12.2" ry="2"/>'
      ]),
      knight: KNIGHT_SVG_BY_SET.worm,
      pawn: svgParts([
        '<circle cx="22.5" cy="11.2" r="4.3"/>',
        '<path d="M19.5 17.5 L25.5 17.5 L27.2 29.8 L17.8 29.8 Z"/>',
        '<path d="M16.8 34.2 L28.2 34.2" fill="none" stroke-linecap="round"/>',
        '<ellipse cx="22.5" cy="37" rx="11.8" ry="2"/>'
      ])
    },
    bird: {
      knight: KNIGHT_SVG_BY_SET.bird
    },
    worm: {
      knight: svgParts([
        '<path d="M11.6 35 L14.1 28.7 C15.9 24.1 18.7 20.7 22.5 17.9 C25.7 15.6 28.8 13.3 30.2 10 C31.1 8.1 33.1 6.9 35.3 7.2 C37.9 7.5 39.4 10 39 12.8 C38.5 15.9 36.2 18.5 33.3 20.3 L29.6 22.5 C27 24.1 25.1 26.7 24.1 30.1 L22.9 35 Z"/>',
        '<path d="M28.6 8.8 L30.8 4.9 L33.2 8.6 Z"/>',
        '<path d="M22.4 18 L16.6 13.3 L18.2 9.4 L24 12.4" fill="none" stroke-linecap="round"/>',
        '<circle cx="33.3" cy="11.8" r="1.05"/>',
        '<circle cx="35.1" cy="17.3" r="0.75"/>',
        '<path d="M35 16.4 C33.2 17.2 31.1 17.2 29.4 16.6" fill="none" stroke-linecap="round"/>',
        '<path d="M29.2 24.4 L33 27.4 M27.6 27.9 L32.2 31.7" fill="none" stroke-linecap="round"/>',
        '<ellipse cx="22.5" cy="37.2" rx="13.2" ry="2.5"/>'
      ])
    },
    glass: {}
  };

  var MODERN_PIECE_SET_FALLBACKS = {
    neo: "classic",
    wood: "classic",
    bird: "classic",
    worm: "classic",
    glass: "classic"
  };

  var MODERN_PIECE_STYLE_BY_SET = {
    classic: { whiteFill: "#ead7bd", blackFill: "#402615", whiteStroke: "#9a6b39", blackStroke: "#ffe3bb", strokeWidth: "1.9", strokeLinejoin: "round", strokeLinecap: "round" },
    neo: { whiteFill: "#fff1d3", blackFill: "#23161c", whiteStroke: "#7d4d18", blackStroke: "#efe4f1", strokeWidth: "1.5", strokeLinejoin: "miter", strokeLinecap: "square" },
    royal: { whiteFill: "#fff1d3", blackFill: "#2a1a10", whiteStroke: "#9e6616", blackStroke: "#ffd780", strokeWidth: "1.5", strokeLinejoin: "round", strokeLinecap: "round" },
    gothic: { whiteFill: "#f1edf2", blackFill: "#0c0b12", whiteStroke: "#2f2638", blackStroke: "#d8d2df", strokeWidth: "1.5", strokeLinejoin: "miter", strokeLinecap: "square" },
    wood: { whiteFill: "#d9bd92", blackFill: "#3d2010", whiteStroke: "#7d5328", blackStroke: "#c9a57c", strokeWidth: "1.7", strokeLinejoin: "round", strokeLinecap: "round" },
    fortress: { whiteFill: "#d8d2c8", blackFill: "#40424a", whiteStroke: "#655b50", blackStroke: "#f2eee7", strokeWidth: "1.7", strokeLinejoin: "miter", strokeLinecap: "square" },
    minimal: { whiteFill: "none", blackFill: "rgba(14, 14, 14, 0.92)", whiteStroke: "#f8f8f8", blackStroke: "#e6eef7", strokeWidth: "2.0", strokeLinejoin: "round", strokeLinecap: "round" },
    bird: { whiteFill: "#f7efdf", blackFill: "#223041", whiteStroke: "#8b6030", blackStroke: "#edf6ff", strokeWidth: "1.5", strokeLinejoin: "round", strokeLinecap: "round" },
    worm: { whiteFill: "#f3ecd8", blackFill: "#181818", whiteStroke: "#0b0b0b", blackStroke: "#f3ecd8", strokeWidth: "1.45", strokeLinejoin: "round", strokeLinecap: "round" },
    glass: { whiteFill: "rgba(236, 246, 255, 0.42)", blackFill: "rgba(28, 44, 58, 0.52)", whiteStroke: "#e2f8ff", blackStroke: "#f4fcff", strokeWidth: "1.2", strokeLinejoin: "round", strokeLinecap: "round" }
  };

  function modernPieceBodyForSet(kind, pieceSet) {
    var current = pieceSet || "classic";
    while (current) {
      if (MODERN_PIECE_SVG_BY_SET[current] && MODERN_PIECE_SVG_BY_SET[current][kind]) {
        return MODERN_PIECE_SVG_BY_SET[current][kind];
      }
      current = MODERN_PIECE_SET_FALLBACKS[current] || "";
    }
    return MODERN_PIECE_SVG_BY_SET.classic[kind] || "";
  }

  function modernPieceStyleForSet(pieceSet) {
    return MODERN_PIECE_STYLE_BY_SET[pieceSet] || MODERN_PIECE_STYLE_BY_SET.classic;
  }

  function pieceSvg(kind, color, pieceSet) {
    var body = modernPieceBodyForSet(kind, pieceSet);
    var style = modernPieceStyleForSet(pieceSet);
    var fill = color === "white" ? style.whiteFill : style.blackFill;
    var stroke = color === "white" ? style.whiteStroke : style.blackStroke;
    if (!body) {
      return "";
    }
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" ' +
      'preserveAspectRatio="xMidYMid meet" class="piece-svg" ' +
      'fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + style.strokeWidth + '" ' +
      'stroke-linejoin="' + style.strokeLinejoin + '" stroke-linecap="' + style.strokeLinecap + '">' +
      body +
      "</svg>"
    );
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function closestDataButton(target, attributeName) {
    while (target && target !== document.body) {
      if (target.getAttribute && target.getAttribute(attributeName)) {
        return target;
      }
      target = target.parentNode;
    }
    return null;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeSanToken(text) {
    return String(text || "")
      .replace(/\s*\[illegal\]\s*/g, "")
      .replace(/[+#]/g, "");
  }

  function getStoredUsername() {
    var data = readFrontendData();
    try {
      return data.username || window.localStorage.getItem("chessPopupUsername") || "Player";
    } catch (error) {
      return "Player";
    }
  }

  function setStoredUsername(name) {
    try {
      window.localStorage.setItem("chessPopupUsername", name);
    } catch (error) {
      writeFrontendData({ username: name });
      return;
    }
    writeFrontendData({ username: name });
  }

  function isValidUsername(name) {
    return /^[A-Za-z0-9_]{3,20}$/.test(name);
  }

  function readFrontendData() {
    var raw;
    try {
      raw = window.localStorage.getItem(FRONTEND_DATA_KEY);
      if (!raw) {
        return {};
      }
      raw = JSON.parse(raw);
      return raw && typeof raw === "object" ? raw : {};
    } catch (error) {
      return {};
    }
  }

  function writeFrontendData(patch) {
    var data = readFrontendData();
    var key;
    for (key in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) {
        data[key] = patch[key];
      }
    }
    try {
      window.localStorage.setItem(FRONTEND_DATA_KEY, JSON.stringify(data));
    } catch (error) {
      return;
    }
  }

  function cloneJson(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return null;
    }
  }

  function getStoredDifficultyLabel() {
    var label = String(readFrontendData().difficultyLabel || "").toLowerCase();
    return /^(easy|medium|hard|impossible)$/.test(label) ? label : "";
  }

  function setStoredDifficultyLabel(label) {
    var normalized = String(label || "").toLowerCase();
    if (!/^(easy|medium|hard|impossible)$/.test(normalized)) {
      normalized = "medium";
    }
    writeFrontendData({ difficultyLabel: normalized });
  }

  function normalizeDifficultyChoice(label) {
    var normalized = String(label || "").toLowerCase();
    return /^(easy|medium|hard|impossible)$/.test(normalized) ? normalized : "medium";
  }

  function effectiveDifficultyLabel() {
    var stored = getStoredDifficultyLabel();
    if (stored) {
      return stored;
    }
    if (state && /^(easy|medium|hard)$/i.test(state.difficulty || "")) {
      return String(state.difficulty || "").toLowerCase();
    }
    return "medium";
  }

  function getLocalSavedGames() {
    var items = readFrontendData().savedGamesLocal;
    return Array.isArray(items) ? items : [];
  }

  function setLocalSavedGames(items) {
    writeFrontendData({ savedGamesLocal: Array.isArray(items) ? items : [] });
  }

  function saveOpenSectionsState() {
    var sections = document.querySelectorAll(".panel-section");
    var sectionState = {};
    var index;
    var id;
    for (index = 0; index < sections.length; index += 1) {
      id = sections[index].id;
      if (id) {
        sectionState[id] = !sections[index].classList.contains("collapsed");
      }
    }
    writeFrontendData({ panelSections: sectionState });
  }

  function normalizeThemeName(themeName) {
    var normalized = String(themeName || "classic")
      .toLowerCase()
      .replace(/[^a-z]/g, "");
    normalized = THEME_ALIASES[normalized] || normalized;
    return THEME_NAMES.indexOf(normalized) >= 0 ? normalized : "classic";
  }

  function normalizePieceStyleName(pieceStyle) {
    var normalized = String(pieceStyle || "classic").toLowerCase();
    if (normalized === "royal" || normalized === "gothic" || normalized === "neo") {
      return "neo";
    }
    if (normalized === "fortress" || normalized === "glass" || normalized === "bird" || normalized === "worm" || normalized === "wood") {
      return "wood";
    }
    if (normalized === "letters") {
      return "minimal";
    }
    return normalized === "minimal" ? "minimal" : "classic";
  }

  function getStoredThemePreference() {
    return normalizeThemeName(readFrontendData().theme || "classic");
  }

  function setStoredThemePreference(themeName) {
    writeFrontendData({ theme: normalizeThemeName(themeName) });
  }

  function getStoredPieceStylePreference() {
    return normalizePieceStyleName(readFrontendData().pieceStyle || "classic");
  }

  function setStoredPieceStylePreference(pieceStyle) {
    writeFrontendData({ pieceStyle: normalizePieceStyleName(pieceStyle || "classic") });
  }

  function normalizeOptionId(value, options, fallback) {
    var normalized = String(value || fallback || "").toLowerCase();
    var index;
    for (index = 0; index < options.length; index += 1) {
      if (options[index].id === normalized) {
        return normalized;
      }
    }
    return fallback;
  }

  function getStoredBackgroundAnimationEnabled() {
    var value = readFrontendData().bgAnimationEnabled;
    return typeof value === "boolean" ? value : true;
  }

  function setStoredBackgroundAnimationEnabled(enabled) {
    writeFrontendData({ bgAnimationEnabled: !!enabled });
  }

  function initialsFromName(name) {
    var cleaned = String(name || "")
      .replace(/_/g, " ")
      .trim()
      .split(/\s+/);
    if (!cleaned.length || !cleaned[0]) {
      return "PL";
    }
    if (cleaned.length === 1) {
      return cleaned[0].slice(0, 2).toUpperCase();
    }
    return (cleaned[0].charAt(0) + cleaned[1].charAt(0)).toUpperCase();
  }

  function hashColorFromName(name) {
    var text = String(name || "Player");
    var total = 0;
    var index;
    for (index = 0; index < text.length; index += 1) {
      total = (total + (text.charCodeAt(index) * (index + 3))) % 360;
    }
    return "hsl(" + total + ", 58%, 48%)";
  }

  function randomBetween(minimum, maximum) {
    return minimum + (Math.random() * (maximum - minimum));
  }

  function currentThemeSelection() {
    return normalizeThemeName(
      (byId("theme") && byId("theme").value) ||
      (state && state.theme) ||
      getStoredThemePreference()
    );
  }

  function currentPieceSetSelection() {
    return normalizePieceStyleName(
      (byId("piece-set") && byId("piece-set").value) ||
      (state && state.pieceSet) ||
      getStoredPieceStylePreference() ||
      "classic"
    );
  }

  function getUnlockedTrailStyles() {
    var unlocked = readFrontendData().unlockedTrailStyles;
    return Array.isArray(unlocked) ? unlocked : [];
  }

  function getUnlockedBorderStyles() {
    var unlocked = readFrontendData().unlockedBorderStyles;
    return Array.isArray(unlocked) ? unlocked : [];
  }

  function isTrailStyleUnlocked(styleId) {
    return styleId === "default" || getUnlockedTrailStyles().indexOf(styleId) >= 0;
  }

  function isBorderStyleUnlocked(styleId) {
    return styleId === "theme-default" || THEME_NAMES.indexOf(styleId) >= 0 || getUnlockedBorderStyles().indexOf(styleId) >= 0;
  }

  function getStoredTrailStylePreference() {
    var value = normalizeOptionId(readFrontendData().trailStyle || "default", TRAIL_STYLE_OPTIONS, "default");
    return isTrailStyleUnlocked(value) ? value : "default";
  }

  function setStoredTrailStylePreference(styleId) {
    writeFrontendData({ trailStyle: normalizeOptionId(styleId, TRAIL_STYLE_OPTIONS, "default") });
  }

  function getStoredBorderStylePreference() {
    var value = normalizeOptionId(readFrontendData().borderStyle || "theme-default", BORDER_STYLE_OPTIONS, "theme-default");
    return isBorderStyleUnlocked(value) ? value : "theme-default";
  }

  function setStoredBorderStylePreference(styleId) {
    writeFrontendData({ borderStyle: normalizeOptionId(styleId, BORDER_STYLE_OPTIONS, "theme-default") });
  }

  function effectiveTrailStyle() {
    return getStoredTrailStylePreference();
  }

  function effectiveBorderStyle() {
    var selected = getStoredBorderStylePreference();
    return selected === "theme-default" ? currentThemeSelection() : selected;
  }

  function buildStyleSwatchHtml(option, active, locked, dataAttribute) {
    return (
      '<button type="button" class="style-swatch' +
      (active ? " active" : "") +
      (locked ? " locked" : "") +
      '" data-' + dataAttribute + '="' + option.id + '" aria-pressed="' + (active ? "true" : "false") + '"' +
      (locked ? ' title="' + option.unlockText + '"' : "") +
      ">" +
      '<span class="style-swatch-preview ' + option.previewClass + '"></span>' +
      '<span class="style-swatch-meta">' +
      '<span class="style-swatch-title">' + option.label + (locked ? " &#128274;" : "") + "</span>" +
      '<span class="style-swatch-caption">' + (locked ? option.unlockText : option.caption) + "</span>" +
      "</span>" +
      "</button>"
    );
  }

  function renderTrailSwatches() {
    var container = byId("trail-swatches");
    var active = getStoredTrailStylePreference();
    var html = [];
    var index;
    if (!container) {
      return;
    }
    for (index = 0; index < TRAIL_STYLE_OPTIONS.length; index += 1) {
      html.push(
        buildStyleSwatchHtml(
          TRAIL_STYLE_OPTIONS[index],
          TRAIL_STYLE_OPTIONS[index].id === active,
          !isTrailStyleUnlocked(TRAIL_STYLE_OPTIONS[index].id),
          "trail-style"
        )
      );
    }
    container.innerHTML = html.join("");
  }

  function renderBorderSwatches() {
    var container = byId("border-swatches");
    var active = getStoredBorderStylePreference();
    var html = [];
    var index;
    if (!container) {
      return;
    }
    for (index = 0; index < BORDER_STYLE_OPTIONS.length; index += 1) {
      html.push(
        buildStyleSwatchHtml(
          BORDER_STYLE_OPTIONS[index],
          BORDER_STYLE_OPTIONS[index].id === active,
          !isBorderStyleUnlocked(BORDER_STYLE_OPTIONS[index].id),
          "border-style"
        )
      );
    }
    container.innerHTML = html.join("");
  }

  function renderThemeSwatches(activeTheme) {
    var buttons = document.querySelectorAll(".theme-swatch");
    var index;
    var button;
    for (index = 0; index < buttons.length; index += 1) {
      button = buttons[index];
      if (button.getAttribute("data-theme") === activeTheme) {
        button.classList.add("active");
        button.setAttribute("aria-pressed", "true");
      } else {
        button.classList.remove("active");
        button.setAttribute("aria-pressed", "false");
      }
    }
  }

  function updateBackgroundAnimationButton() {
    var button = byId("background-animation-button");
    var enabled = getStoredBackgroundAnimationEnabled();
    if (!button) {
      return;
    }
    if (backgroundAnimationAutoDisabled) {
      button.disabled = true;
      button.className = "small-button secondary-button is-disabled";
      button.innerText = "Background Auto-Off";
      button.setAttribute("aria-pressed", "false");
      return;
    }
    button.disabled = false;
    button.className = enabled ? "small-button secondary-button active" : "small-button secondary-button";
    button.innerText = enabled ? "Background Animation On" : "Background Animation Off";
    button.setAttribute("aria-pressed", enabled ? "true" : "false");
  }

  function syncRootThemeVariables() {
    var computed = window.getComputedStyle(document.body);
    var rootStyle = document.documentElement.style;
    var index;
    for (index = 0; index < ROOT_THEME_VARIABLES.length; index += 1) {
      rootStyle.setProperty(ROOT_THEME_VARIABLES[index], computed.getPropertyValue(ROOT_THEME_VARIABLES[index]));
    }
  }

  function setBodyThemeClass(themeName, pieceSet) {
    var body = document.body;
    var html = document.documentElement;
    var classes = body.className ? body.className.split(/\s+/) : [];
    var kept = [];
    var index;
    for (index = 0; index < classes.length; index += 1) {
      if (!classes[index] || /^theme-/.test(classes[index]) || classes[index] === "letters-mode") {
        continue;
      }
      kept.push(classes[index]);
    }
    kept.push("theme-" + themeName);
    if (pieceSet === "letters") {
      kept.push("letters-mode");
    }
    body.className = kept.join(" ");
    body.setAttribute("data-theme", themeName);
    html.setAttribute("data-theme", themeName);
    syncRootThemeVariables();
  }

  function ensureBackgroundCanvasSize() {
    var canvas = byId("background-canvas");
    var context;
    var width;
    var height;
    var ratio;
    if (!canvas) {
      return;
    }
    width = window.innerWidth || document.documentElement.clientWidth || 0;
    height = window.innerHeight || document.documentElement.clientHeight || 0;
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (
      canvas.__cssWidth === width &&
      canvas.__cssHeight === height &&
      canvas.__pixelRatio === ratio
    ) {
      return;
    }
    canvas.__cssWidth = width;
    canvas.__cssHeight = height;
    canvas.__pixelRatio = ratio;
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (backgroundAnimationInitialized) {
      seedBackgroundScene(backgroundAnimationTheme);
      drawBackgroundFrame(0, true);
    }
  }

  function seedBackgroundScene(themeName) {
    var width = window.innerWidth || 0;
    var height = window.innerHeight || 0;
    var index;
    backgroundParticles = [];
    backgroundMeta = {
      clock: 0,
      shootingCooldown: randomBetween(8, 15),
      shootingStar: null,
      wavePhase: randomBetween(0, Math.PI * 2)
    };
    switch (themeName) {
    case "classic":
      for (index = 0; index < 40; index += 1) {
        backgroundParticles.push({
          kind: "dust",
          x: randomBetween(0, width),
          y: randomBetween(0, height),
          size: randomBetween(1.2, 4.2),
          speed: randomBetween(8, 24),
          drift: randomBetween(-6, 6),
          alpha: randomBetween(0.04, 0.18)
        });
      }
      break;
    case "midnight":
      for (index = 0; index < 96; index += 1) {
        backgroundParticles.push({
          kind: "star",
          x: randomBetween(0, width),
          y: randomBetween(0, height),
          size: randomBetween(0.5, 2.2),
          speed: randomBetween(4, 18),
          alpha: randomBetween(0.18, 0.82)
        });
      }
      break;
    case "forest":
      for (index = 0; index < 8; index += 1) {
        backgroundParticles.push({
          kind: "fog",
          x: randomBetween(-width * 0.2, width),
          y: randomBetween(height * 0.62, height * 0.95),
          size: randomBetween(width * 0.12, width * 0.28),
          speed: randomBetween(8, 20),
          alpha: randomBetween(0.04, 0.11)
        });
      }
      for (index = 0; index < 16; index += 1) {
        backgroundParticles.push({
          kind: "leaf",
          x: randomBetween(0, width),
          y: randomBetween(-height, height),
          size: randomBetween(7, 15),
          speed: randomBetween(26, 48),
          drift: randomBetween(-18, 18),
          rotation: randomBetween(0, Math.PI * 2),
          spin: randomBetween(-1.2, 1.2),
          alpha: randomBetween(0.12, 0.28)
        });
      }
      break;
    case "crimson":
      for (index = 0; index < 52; index += 1) {
        backgroundParticles.push({
          kind: "ember",
          x: randomBetween(0, width),
          y: randomBetween(height * 0.55, height + 24),
          size: randomBetween(1.6, 4.6),
          speed: randomBetween(24, 68),
          drift: randomBetween(-10, 10),
          alpha: randomBetween(0.10, 0.32)
        });
      }
      break;
    case "ice":
      for (index = 0; index < 72; index += 1) {
        backgroundParticles.push({
          kind: "snow",
          x: randomBetween(0, width),
          y: randomBetween(-height, height),
          size: randomBetween(1.4, 4.8),
          speed: randomBetween(18, 42),
          sway: randomBetween(0.6, 2.2),
          phase: randomBetween(0, Math.PI * 2),
          alpha: randomBetween(0.18, 0.5)
        });
      }
      break;
    case "gold":
      for (index = 0; index < 62; index += 1) {
        backgroundParticles.push({
          kind: "glint",
          x: randomBetween(0, width),
          y: randomBetween(0, height),
          size: randomBetween(1.2, 3.1),
          alpha: randomBetween(0.08, 0.32),
          twinkle: randomBetween(1.2, 3.6),
          phase: randomBetween(0, Math.PI * 2)
        });
      }
      break;
    case "neon":
      backgroundParticles = [];
      break;
    case "obsidian":
      for (index = 0; index < 5; index += 1) {
        backgroundParticles.push({
          kind: "aurora",
          x: randomBetween(width * 0.08, width * 0.92),
          y: randomBetween(height * 0.12, height * 0.64),
          size: randomBetween(width * 0.16, width * 0.30),
          dx: randomBetween(-14, 14),
          dy: randomBetween(-6, 6),
          alpha: randomBetween(0.07, 0.15),
          hue: randomBetween(235, 290)
        });
      }
      for (index = 0; index < 20; index += 1) {
        backgroundParticles.push({
          kind: "star",
          x: randomBetween(0, width),
          y: randomBetween(0, height),
          size: randomBetween(0.7, 1.8),
          speed: randomBetween(2, 10),
          alpha: randomBetween(0.08, 0.24)
        });
      }
      break;
    default:
      break;
    }
  }

  function drawBackgroundFrame(deltaSeconds, staticFrame) {
    var canvas = byId("background-canvas");
    var context = canvas ? canvas.getContext("2d") : null;
    var computed;
    var width;
    var height;
    var index;
    var item;
    var gradient;
    var bandOffset;
    var alpha;
    var pageBg;
    var pageBgAlt;
    var accentRgb;
    var wash;
    if (!canvas || !context) {
      return;
    }
    width = canvas.__cssWidth || window.innerWidth || 0;
    height = canvas.__cssHeight || window.innerHeight || 0;
    backgroundMeta.clock += deltaSeconds;
    context.clearRect(0, 0, width, height);
    computed = window.getComputedStyle(document.body);
    pageBg = computed.getPropertyValue("--bg-page").trim() || "#171411";
    pageBgAlt = computed.getPropertyValue("--bg-page-alt").trim() || pageBg;
    accentRgb = computed.getPropertyValue("--accent-rgb").trim() || "255, 204, 0";
    gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, pageBgAlt);
    gradient.addColorStop(1, pageBg);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    wash = context.createRadialGradient(width * 0.14, height * 0.1, width * 0.04, width * 0.14, height * 0.1, width * 0.5);
    wash.addColorStop(0, "rgba(" + accentRgb + ", 0.12)");
    wash.addColorStop(1, "rgba(" + accentRgb + ", 0)");
    context.fillStyle = wash;
    context.fillRect(0, 0, width, height);

    if (backgroundAnimationTheme === "classic") {
      for (index = 0; index < backgroundParticles.length; index += 1) {
        item = backgroundParticles[index];
        if (!staticFrame) {
          item.y -= item.speed * deltaSeconds;
          item.x += item.drift * deltaSeconds;
          if (item.y < -12) {
            item.y = height + 12;
            item.x = randomBetween(0, width);
          }
          if (item.x < -24) {
            item.x = width + 24;
          } else if (item.x > width + 24) {
            item.x = -24;
          }
        }
        context.fillStyle = "rgba(248, 225, 176, " + item.alpha + ")";
        context.beginPath();
        context.arc(item.x, item.y, item.size, 0, Math.PI * 2);
        context.fill();
      }
      return;
    }

    if (backgroundAnimationTheme === "midnight") {
      for (index = 0; index < backgroundParticles.length; index += 1) {
        item = backgroundParticles[index];
        if (!staticFrame) {
          item.x += item.speed * deltaSeconds;
          if (item.x > width + 8) {
            item.x = -8;
            item.y = randomBetween(0, height);
          }
        }
        context.fillStyle = "rgba(215, 235, 255, " + item.alpha + ")";
        context.beginPath();
        context.arc(item.x, item.y, item.size, 0, Math.PI * 2);
        context.fill();
      }
      if (!staticFrame) {
        backgroundMeta.shootingCooldown -= deltaSeconds;
        if (backgroundMeta.shootingCooldown <= 0 && !backgroundMeta.shootingStar) {
          backgroundMeta.shootingStar = {
            x: randomBetween(width * 0.12, width * 0.78),
            y: randomBetween(0, height * 0.28),
            dx: randomBetween(220, 340),
            dy: randomBetween(120, 200),
            life: 0,
            duration: randomBetween(0.75, 1.15)
          };
          backgroundMeta.shootingCooldown = randomBetween(8, 15);
        }
      }
      if (backgroundMeta.shootingStar) {
        item = backgroundMeta.shootingStar;
        if (!staticFrame) {
          item.life += deltaSeconds;
        }
        alpha = Math.max(0, 1 - (item.life / item.duration));
        gradient = context.createLinearGradient(item.x, item.y, item.x - 90, item.y - 54);
        gradient.addColorStop(0, "rgba(255, 255, 255, " + (0.85 * alpha) + ")");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        context.strokeStyle = gradient;
        context.lineWidth = 2.4;
        context.beginPath();
        context.moveTo(item.x, item.y);
        context.lineTo(item.x - 90, item.y - 54);
        context.stroke();
        if (!staticFrame) {
          item.x += item.dx * deltaSeconds;
          item.y += item.dy * deltaSeconds;
          if (item.life >= item.duration) {
            backgroundMeta.shootingStar = null;
          }
        }
      }
      return;
    }

    if (backgroundAnimationTheme === "forest") {
      for (index = 0; index < backgroundParticles.length; index += 1) {
        item = backgroundParticles[index];
        if (item.kind === "fog") {
          if (!staticFrame) {
            item.x += item.speed * deltaSeconds;
            if (item.x > width + item.size) {
              item.x = -item.size;
              item.y = randomBetween(height * 0.62, height * 0.95);
            }
          }
          gradient = context.createRadialGradient(item.x, item.y, item.size * 0.1, item.x, item.y, item.size);
          gradient.addColorStop(0, "rgba(188, 213, 179, " + item.alpha + ")");
          gradient.addColorStop(1, "rgba(188, 213, 179, 0)");
          context.fillStyle = gradient;
          context.beginPath();
          context.arc(item.x, item.y, item.size, 0, Math.PI * 2);
          context.fill();
        } else {
          if (!staticFrame) {
            item.y += item.speed * deltaSeconds;
            item.x += item.drift * deltaSeconds;
            item.rotation += item.spin * deltaSeconds;
            if (item.y > height + 20) {
              item.y = -20;
              item.x = randomBetween(0, width);
            }
          }
          context.save();
          context.translate(item.x, item.y);
          context.rotate(item.rotation);
          context.fillStyle = "rgba(152, 193, 109, " + item.alpha + ")";
          context.beginPath();
          context.ellipse(0, 0, item.size, item.size * 0.48, 0, 0, Math.PI * 2);
          context.fill();
          context.restore();
        }
      }
      return;
    }

    if (backgroundAnimationTheme === "crimson") {
      for (index = 0; index < backgroundParticles.length; index += 1) {
        item = backgroundParticles[index];
        if (!staticFrame) {
          item.y -= item.speed * deltaSeconds;
          item.x += item.drift * deltaSeconds;
          if (item.y < -12) {
            item.y = height + 14;
            item.x = randomBetween(0, width);
          }
        }
        gradient = context.createRadialGradient(item.x, item.y, 0, item.x, item.y, item.size * 2.8);
        gradient.addColorStop(0, "rgba(255, 213, 148, " + (item.alpha * 1.15) + ")");
        gradient.addColorStop(0.4, "rgba(255, 109, 73, " + item.alpha + ")");
        gradient.addColorStop(1, "rgba(255, 84, 54, 0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(item.x, item.y, item.size * 2.2, 0, Math.PI * 2);
        context.fill();
      }
      return;
    }

    if (backgroundAnimationTheme === "ice") {
      for (index = 0; index < backgroundParticles.length; index += 1) {
        item = backgroundParticles[index];
        if (!staticFrame) {
          item.y += item.speed * deltaSeconds;
          item.x += Math.sin((backgroundMeta.clock * item.sway) + item.phase) * 11 * deltaSeconds;
          if (item.y > height + 10) {
            item.y = -10;
            item.x = randomBetween(0, width);
          }
        }
        context.fillStyle = "rgba(232, 247, 255, " + item.alpha + ")";
        context.beginPath();
        context.arc(item.x, item.y, item.size, 0, Math.PI * 2);
        context.fill();
      }
      return;
    }

    if (backgroundAnimationTheme === "gold") {
      for (index = 0; index < backgroundParticles.length; index += 1) {
        item = backgroundParticles[index];
        alpha = item.alpha + (Math.sin((backgroundMeta.clock * item.twinkle) + item.phase) * 0.16);
        alpha = Math.max(0.05, alpha);
        context.fillStyle = "rgba(255, 220, 116, " + alpha + ")";
        context.beginPath();
        context.arc(item.x, item.y, item.size, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = "rgba(255, 240, 168, " + Math.min(alpha + 0.08, 0.45) + ")";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(item.x - (item.size * 1.8), item.y);
        context.lineTo(item.x + (item.size * 1.8), item.y);
        context.moveTo(item.x, item.y - (item.size * 1.8));
        context.lineTo(item.x, item.y + (item.size * 1.8));
        context.stroke();
      }
      return;
    }

    if (backgroundAnimationTheme === "neon") {
      bandOffset = ((backgroundMeta.wavePhase % 1) * (width + height)) - height;
      if (!staticFrame) {
        backgroundMeta.wavePhase += deltaSeconds * 0.16;
      }
      context.strokeStyle = "rgba(68, 227, 213, 0.08)";
      context.lineWidth = 1;
      for (index = -1; index <= Math.ceil(width / 52); index += 1) {
        context.beginPath();
        context.moveTo(index * 52, 0);
        context.lineTo(index * 52, height);
        context.stroke();
      }
      for (index = -1; index <= Math.ceil(height / 52); index += 1) {
        context.beginPath();
        context.moveTo(0, index * 52);
        context.lineTo(width, index * 52);
        context.stroke();
      }
      gradient = context.createLinearGradient(bandOffset, 0, bandOffset + height, height);
      gradient.addColorStop(0, "rgba(65, 248, 232, 0)");
      gradient.addColorStop(0.42, "rgba(65, 248, 232, 0.02)");
      gradient.addColorStop(0.5, "rgba(65, 248, 232, 0.18)");
      gradient.addColorStop(0.58, "rgba(65, 248, 232, 0.02)");
      gradient.addColorStop(1, "rgba(65, 248, 232, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      return;
    }

    if (backgroundAnimationTheme === "obsidian") {
      for (index = 0; index < backgroundParticles.length; index += 1) {
        item = backgroundParticles[index];
        if (item.kind === "aurora") {
          if (!staticFrame) {
            item.x += item.dx * deltaSeconds;
            item.y += item.dy * deltaSeconds;
            if (item.x < -item.size) {
              item.x = width + item.size;
            } else if (item.x > width + item.size) {
              item.x = -item.size;
            }
          }
          gradient = context.createRadialGradient(item.x, item.y, item.size * 0.12, item.x, item.y, item.size);
          gradient.addColorStop(0, "hsla(" + item.hue + ", 92%, 72%, " + item.alpha + ")");
          gradient.addColorStop(1, "hsla(" + item.hue + ", 92%, 72%, 0)");
          context.fillStyle = gradient;
          context.beginPath();
          context.arc(item.x, item.y, item.size, 0, Math.PI * 2);
          context.fill();
        } else {
          if (!staticFrame) {
            item.x += item.speed * deltaSeconds;
            if (item.x > width + 8) {
              item.x = -8;
            }
          }
          context.fillStyle = "rgba(224, 226, 255, " + item.alpha + ")";
          context.beginPath();
          context.arc(item.x, item.y, item.size, 0, Math.PI * 2);
          context.fill();
        }
      }
    }
  }

  function backgroundAnimationLoop(timestamp) {
    var deltaSeconds = backgroundLastFrame ? Math.min((timestamp - backgroundLastFrame) / 1000, 0.05) : 0.016;
    backgroundLastFrame = timestamp;
    drawBackgroundFrame(deltaSeconds, false);
    backgroundAnimationFrame = window.requestAnimationFrame(backgroundAnimationLoop);
  }

  function stopBackgroundAnimation() {
    if (backgroundAnimationFrame) {
      window.cancelAnimationFrame(backgroundAnimationFrame);
      backgroundAnimationFrame = 0;
    }
    backgroundLastFrame = 0;
  }

  function startBackgroundAnimation(themeName) {
    var enabled = !backgroundAnimationAutoDisabled && getStoredBackgroundAnimationEnabled();
    var normalizedTheme = normalizeThemeName(themeName);
    var nextSignature = normalizedTheme + "|" + (enabled ? "1" : "0");
    ensureBackgroundCanvasSize();
    if (backgroundAnimationInitialized && backgroundAnimationSignature === nextSignature) {
      return;
    }
    stopBackgroundAnimation();
    backgroundAnimationTheme = normalizedTheme;
    backgroundAnimationSignature = nextSignature;
    seedBackgroundScene(normalizedTheme);
    drawBackgroundFrame(0, true);
    if (enabled) {
      backgroundAnimationFrame = window.requestAnimationFrame(backgroundAnimationLoop);
    }
    backgroundAnimationInitialized = true;
  }

  function capitalize(text) {
    if (!text) {
      return "";
    }
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function titleCaseWords(text) {
    if (!text) {
      return "";
    }
    return String(text).replace(/\b[a-z]/g, function (letter) {
      return letter.toUpperCase();
    });
  }

  function request(method, path, payload, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, path, true);
    xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) {
        return;
      }
      var data = null;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch (error) {
        callback("Unable to read server response.", null);
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        callback(null, data);
        return;
      }
      callback(data && data.error ? data.error : "Request failed.", null);
    };
    xhr.send(payload ? JSON.stringify(payload) : "{}");
  }

  function getSelectedValue(name) {
    var items = document.getElementsByName(name);
    var index;
    for (index = 0; index < items.length; index += 1) {
      if (items[index].checked) {
        return items[index].value;
      }
    }
    return "";
  }

  function setSelectedValue(name, value) {
    var items = document.getElementsByName(name);
    var index;
    for (index = 0; index < items.length; index += 1) {
      items[index].checked = items[index].value === value;
    }
  }

  function parseIntegerValue(value, fallback) {
    var parsed = parseInt(value, 10);
    return isNaN(parsed) ? fallback : parsed;
  }

  function setDifficultyChoice(choice) {
    var normalized = normalizeDifficultyChoice(choice);
    if (byId("difficulty")) {
      byId("difficulty").value = normalized;
    }
    setStoredDifficultyLabel(normalized);
    syncDifficultySegments();
  }

  function syncDifficultySegments() {
    var buttons = document.querySelectorAll("[data-difficulty-choice]");
    var current = normalizeDifficultyChoice(byId("difficulty") ? byId("difficulty").value : effectiveDifficultyLabel());
    var index;
    for (index = 0; index < buttons.length; index += 1) {
      if (buttons[index].getAttribute("data-difficulty-choice") === current) {
        buttons[index].classList.add("active");
        buttons[index].setAttribute("aria-pressed", "true");
      } else {
        buttons[index].classList.remove("active");
        buttons[index].setAttribute("aria-pressed", "false");
      }
    }
  }

  function visibleClockPresetFromBackend(timeMode, customMinutes, customIncrement) {
    var minutes = parseIntegerValue(customMinutes, 10);
    var increment = parseIntegerValue(customIncrement, 0);
    if (timeMode === "unlimited") {
      return "unlimited";
    }
    if (timeMode === "bullet") {
      return "clock-1";
    }
    if (timeMode === "blitz") {
      return "clock-5";
    }
    if (timeMode === "rapid") {
      return "clock-10";
    }
    if (timeMode === "custom" && minutes === 3 && increment === 0) {
      return "clock-3";
    }
    if (timeMode === "custom" && minutes === 5 && increment === 0) {
      return "clock-5";
    }
    if (timeMode === "custom" && minutes === 10 && increment === 0) {
      return "clock-10";
    }
    return "custom";
  }

  function resolvedClockSettings(timeModeValue, customMinutes, customIncrement) {
    var timeMode = String(timeModeValue || "unlimited");
    if (timeMode === "clock-1") {
      return { timeMode: "bullet", customMinutes: 1, customIncrement: 0 };
    }
    if (timeMode === "clock-3") {
      return { timeMode: "custom", customMinutes: 3, customIncrement: 0 };
    }
    if (timeMode === "clock-5") {
      return { timeMode: "custom", customMinutes: 5, customIncrement: 0 };
    }
    if (timeMode === "clock-10") {
      return { timeMode: "custom", customMinutes: 10, customIncrement: 0 };
    }
    if (timeMode === "custom") {
      return {
        timeMode: "custom",
        customMinutes: Math.max(1, parseIntegerValue(customMinutes, 10)),
        customIncrement: Math.max(0, parseIntegerValue(customIncrement, 0))
      };
    }
    return { timeMode: "unlimited", customMinutes: 10, customIncrement: 0 };
  }

  function formatClockSeconds(totalSeconds) {
    var seconds = Math.max(0, Math.round(totalSeconds));
    var minutes = Math.floor(seconds / 60);
    var remainingSeconds = seconds % 60;
    var hours;
    if (minutes >= 60) {
      hours = Math.floor(minutes / 60);
      minutes = minutes % 60;
      return hours + ":" + (minutes < 10 ? "0" : "") + minutes + ":" + (remainingSeconds < 10 ? "0" : "") + remainingSeconds;
    }
    return minutes + ":" + (remainingSeconds < 10 ? "0" : "") + remainingSeconds;
  }

  function currentSetupDraft() {
    return {
      playerColor: getSelectedValue("player-color"),
      botMode: getSelectedValue("bot-mode"),
      difficulty: normalizeDifficultyChoice(byId("difficulty").value),
      illegalPersonality: byId("illegal-personality").value,
      theme: normalizeThemeName(byId("theme").value),
      pieceSet: byId("piece-set").value,
      autoFlip: byId("auto-flip").checked,
      animatePieces: byId("animate-pieces").checked,
      cinematicCaptures: byId("cinematic-captures").checked,
      timeMode: byId("time-mode").value,
      customMinutes: byId("custom-minutes").value,
      customIncrement: byId("custom-increment").value
    };
  }

  function currentSetupDraftFromState() {
    var displayedDifficulty = effectiveDifficultyLabel();
    if (!state) {
      return null;
    }
    return {
      playerColor: state.playerColor,
      botMode: state.botMode,
      difficulty:
        state.difficulty === "hard" && displayedDifficulty === "impossible"
          ? "impossible"
          : normalizeDifficultyChoice(state.difficulty),
      illegalPersonality: state.illegalPersonality,
      theme: normalizeThemeName(state.theme),
      pieceSet: normalizePieceStyleName(state.pieceSet),
      autoFlip: state.autoFlip,
      animatePieces: state.animatePieces,
      cinematicCaptures: state.cinematicCaptures,
      timeMode: visibleClockPresetFromBackend(state.timeMode, state.customMinutes, state.customIncrement),
      customMinutes: String(state.customMinutes),
      customIncrement: String(state.customIncrement)
    };
  }

  function applySetupDraft(draft) {
    var themeName;
    if (!draft) {
      return;
    }
    themeName = normalizeThemeName(draft.theme);
    setSelectedValue("bot-mode", draft.botMode);
    setSelectedValue("player-color", draft.playerColor);
    setDifficultyChoice(draft.difficulty);
    byId("illegal-personality").value = draft.illegalPersonality;
    byId("theme").value = themeName;
    byId("piece-set").value = draft.pieceSet;
    byId("time-mode").value = draft.timeMode;
    byId("custom-minutes").value = draft.customMinutes;
    byId("custom-increment").value = draft.customIncrement;
    byId("auto-flip").checked = draft.autoFlip;
    byId("animate-pieces").checked = draft.animatePieces;
    byId("cinematic-captures").checked = draft.cinematicCaptures;
    renderThemeSwatches(themeName);
    updateBackgroundAnimationButton();
    syncDifficultySegments();
    syncConditionalRowVisibility();
  }

  function syncConditionalRowVisibility() {
    var personality = byId("illegal-personality-row");
    if (personality) {
      personality.className =
        getSelectedValue("bot-mode") === "illegal" ? "" : "hidden";
    }
    var clockFields = byId("clock-custom-fields");
    if (clockFields) {
      var timeMode = byId("time-mode") ? byId("time-mode").value : "unlimited";
      clockFields.className =
        timeMode === "custom" ? "split-fields" : "split-fields hidden";
    }
    var captureRow = byId("cinematic-captures-row");
    if (captureRow) {
      captureRow.className = byId("animate-pieces") && byId("animate-pieces").checked ? "check-row" : "check-row hidden";
    }
    syncSetupSectionVisibility();
  }

  function syncSetupSectionVisibility() {
    var showLiveControls = !!(isReplayMode() || (state && (state.gameActive || state.result !== "*")));
    var preGame = byId("pre-game-panel");
    var controls = byId("controls-panel");
    if (preGame) {
      preGame.className = showLiveControls ? "panel-section hidden" : "panel-section";
    }
    if (controls) {
      controls.className = showLiveControls ? "panel-section" : "panel-section hidden";
    }
  }

  function markSetupDirty() {
    setupDirty = true;
    syncConditionalRowVisibility();
  }

  function hydrateAppearanceFromStorage() {
    var storedTheme = getStoredThemePreference();
    var storedPieceStyle = getStoredPieceStylePreference();
    var data = readFrontendData();
    if (byId("theme")) {
      byId("theme").value = storedTheme;
    }
    if (byId("piece-set") && storedPieceStyle) {
      byId("piece-set").value = storedPieceStyle;
    }
    if (byId("animate-pieces") && typeof data.animatePieces === "boolean") {
      byId("animate-pieces").checked = data.animatePieces;
    }
    if (byId("cinematic-captures") && typeof data.cinematicCaptures === "boolean") {
      byId("cinematic-captures").checked = data.cinematicCaptures;
    }
    renderThemeSwatches(storedTheme);
    renderTrailSwatches();
    renderBorderSwatches();
    updateBackgroundAnimationButton();
    setBodyThemeClass(storedTheme, currentPieceSetSelection());
    startBackgroundAnimation(storedTheme);
  }

  function currentDisplay() {
    if (replay && replay.snapshots && replay.snapshots.length > 0) {
      return replay.snapshots[replayIndex];
    }
    return state;
  }

  function isReplayMode() {
    return !!replay;
  }

  function boardFlipped() {
    return !isReplayMode() && state && state.autoFlip && state.playerColor === "black";
  }

  function topBoardColor() {
    return boardFlipped() ? "white" : "black";
  }

  function bottomBoardColor() {
    return boardFlipped() ? "black" : "white";
  }

  function visualSideLabel(color) {
    return capitalize(color) + " Pieces";
  }

  function displayNameForColor(color) {
    if (isReplayMode()) {
      return capitalize(color) + " Side";
    }
    if (!state) {
      return capitalize(color);
    }
    if (state.playerColor === color) {
      return getStoredUsername();
    }
    if (state.botColor === color) {
      return capitalize(state.botMode) + " Bot";
    }
    return capitalize(color);
  }

  function displayRoleForColor(color) {
    if (isReplayMode()) {
      return "Replay board";
    }
    if (!state) {
      return "Board side";
    }
    if (state.playerColor === color) {
      return "Local player";
    }
    if (state.botColor === color) {
      return capitalize(state.botMode) + " opponent";
    }
    return "Board side";
  }

  function setAvatar(elementId, name) {
    var element = byId(elementId);
    if (!element) {
      return;
    }
    element.innerText = initialsFromName(name);
    element.style.backgroundColor = hashColorFromName(name);
  }

  function detectOpeningPreview(moveHistory) {
    var normalized;
    var longest = null;
    var index;
    var moveIndex;
    var item;
    var matches;
    if (!moveHistory || moveHistory.length === 0) {
      return "Awaiting first move";
    }
    normalized = [];
    for (index = 0; index < moveHistory.length; index += 1) {
      normalized.push(normalizeSanToken(moveHistory[index]));
    }
    for (index = 0; index < OPENING_PREVIEWS.length; index += 1) {
      item = OPENING_PREVIEWS[index];
      if (item.moves.length > normalized.length) {
        continue;
      }
      matches = true;
      for (moveIndex = 0; moveIndex < item.moves.length; moveIndex += 1) {
        if (normalized[moveIndex] !== item.moves[moveIndex]) {
          matches = false;
          break;
        }
      }
      if (matches && (!longest || item.moves.length > longest.moves.length)) {
        longest = item;
      }
    }
    return longest ? longest.label : "Custom Position";
  }

  function renderTopBar() {
    var modeLabel = "Waiting...";
    var openingLabel = detectOpeningPreview(currentDisplay() ? currentDisplay().moveHistory : []);
    var difficultyText;
    byId("topbar-username").innerText = getStoredUsername();
    if (isReplayMode()) {
      modeLabel = "Replay — " + replay.result;
    } else if (state && state.result !== "*" && state.gameActive === false) {
      modeLabel = "Game Complete — " + state.resultText;
    } else if (state && state.gameActive) {
      difficultyText = capitalize(effectiveDifficultyLabel());
      modeLabel = "vs Bot — " + difficultyText;
    } else if (state) {
      difficultyText = capitalize(effectiveDifficultyLabel());
      modeLabel = "vs Bot — " + difficultyText;
    }
    byId("topbar-mode-label").innerText = modeLabel;
    byId("topbar-opening-name").innerText = openingLabel;
    byId("p2-turn-badge").className = "top-badge hidden";
  }

  function renderPlayerPanels() {
    var topColor = topBoardColor();
    var bottomColor = bottomBoardColor();
    var topName = displayNameForColor(topColor);
    var bottomName = displayNameForColor(bottomColor);
    byId("top-player-name").innerText = topName;
    byId("top-player-role").innerText = displayRoleForColor(topColor);
    byId("top-player-side").innerText = visualSideLabel(topColor);
    byId("bottom-player-name").innerText = bottomName;
    byId("bottom-player-role").innerText = displayRoleForColor(bottomColor);
    byId("bottom-player-side").innerText = visualSideLabel(bottomColor);
    setAvatar("top-player-avatar", topName);
    setAvatar("bottom-player-avatar", bottomName);
    byId("opening-pill").innerText = detectOpeningPreview(currentDisplay() ? currentDisplay().moveHistory : []);
    byId("top-reactions").className = "reaction-row hidden";
    byId("bottom-reactions").className = "reaction-row";
  }

  function renderDailyWidget() {
    var widget = byId("daily-widget");
    var view = currentDisplay();
    var progress = Math.min(view && view.moveHistory ? view.moveHistory.length : 0, 12);
    var complete = progress >= 12;
    byId("daily-widget-text").innerText = "Reach 12 plies in a live game";
    byId("daily-widget-progress").style.width = ((progress / 12) * 100) + "%";
    byId("daily-widget-fraction").innerText = progress + " / 12";
    byId("daily-widget-badge").innerText = complete ? "✓" : "★";
    widget.className = complete ? "widget-card complete" : "widget-card";
  }

  function squareOrder() {
    var rows = boardFlipped() ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    var cols = boardFlipped() ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    return { rows: rows, cols: cols };
  }

  function updateBoardLabels() {
    var order = squareOrder();
    var rankHtml = [];
    var fileHtml = [];
    var index;
    for (index = 0; index < 8; index += 1) {
      rankHtml.push("<div>" + String(8 - order.rows[index]) + "</div>");
      fileHtml.push("<span>" + String.fromCharCode(97 + order.cols[index]) + "</span>");
    }
    byId("rank-labels").innerHTML = rankHtml.join("");
    byId("file-labels").innerHTML = fileHtml.join("");
  }

  function roundedRectPath(ctx, x, y, width, height, radius) {
    var r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function ensureBoardBorderCanvasSize() {
    var shell = byId("board-shell");
    var canvas = byId("board-border-canvas");
    var rect;
    var ratio;
    var width;
    var height;
    var boardSize;
    var pad;
    var ctx;
    if (!shell || !canvas) {
      return null;
    }
    rect = shell.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    ctx = canvas.getContext("2d");
    if (borderCanvasState.cssWidth !== width || borderCanvasState.cssHeight !== height || borderCanvasState.pixelRatio !== ratio) {
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      borderCanvasState.cssWidth = width;
      borderCanvasState.cssHeight = height;
      borderCanvasState.pixelRatio = ratio;
    }
    boardSize = boardMetrics().size;
    pad = Math.max(10, (width - boardSize) / 2);
    return {
      canvas: canvas,
      context: ctx,
      width: width,
      height: height,
      pad: pad,
      boardSize: boardSize
    };
  }

  function currentBoardBorderCanvas() {
    var shell = byId("board-shell");
    var canvas = byId("board-border-canvas");
    var ctx;
    var width;
    var height;
    var boardSize;
    if (!shell || !canvas) {
      return null;
    }
    ctx = canvas.getContext("2d");
    width = borderCanvasState.cssWidth || Math.max(1, Math.round(shell.getBoundingClientRect().width));
    height = borderCanvasState.cssHeight || Math.max(1, Math.round(shell.getBoundingClientRect().height));
    boardSize = boardMetrics().size;
    return {
      canvas: canvas,
      context: ctx,
      width: width,
      height: height,
      pad: Math.max(10, (width - boardSize) / 2),
      boardSize: boardSize
    };
  }

  function drawBoardBorder() {
    var border = currentBoardBorderCanvas();
    var ctx;
    var width;
    var height;
    var pad;
    var outerInset = 2;
    var innerInset;
    var styleId;
    var gradient;
    var index;
    var x;
    var y;
    var accent = themeValue("--accent", "#ffcc00");
    if (!border) {
      return;
    }
    ctx = border.context;
    width = border.width;
    height = border.height;
    pad = border.pad;
    innerInset = Math.max(6, pad - 4);
    ctx.clearRect(0, 0, width, height);

    styleId = effectiveBorderStyle();
    ctx.save();
    roundedRectPath(ctx, outerInset, outerInset, width - (outerInset * 2), height - (outerInset * 2), 28);
    switch (styleId) {
      case "classic":
        gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#8b5e3c");
        gradient.addColorStop(1, "#5f3a23");
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 224, 177, 0.22)";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.strokeStyle = "rgba(55, 32, 19, 0.38)";
        ctx.lineWidth = 1.2;
        for (index = 0; index < 16; index += 1) {
          y = 12 + (index * ((height - 24) / 15));
          ctx.beginPath();
          ctx.moveTo(10, y + Math.sin(index * 0.8) * 2.5);
          ctx.lineTo(width - 10, y + Math.sin((index * 0.8) + 0.7) * 2.5);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(62, 33, 17, 0.42)";
        ctx.beginPath();
        ctx.arc(pad * 0.78, pad * 0.82, 5.5, 0, Math.PI * 2);
        ctx.arc(width - (pad * 0.78), height - (pad * 0.82), 5.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "midnight":
        gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, "#344255");
        gradient.addColorStop(1, "#121822");
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = "rgba(198, 216, 240, 0.16)";
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.fillStyle = "rgba(214, 228, 246, 0.32)";
        ctx.beginPath();
        ctx.arc(pad * 0.78, pad * 0.78, 4.5, 0, Math.PI * 2);
        ctx.arc(width - (pad * 0.78), pad * 0.78, 4.5, 0, Math.PI * 2);
        ctx.arc(pad * 0.78, height - (pad * 0.78), 4.5, 0, Math.PI * 2);
        ctx.arc(width - (pad * 0.78), height - (pad * 0.78), 4.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "forest":
        gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#61734f");
        gradient.addColorStop(1, "#2f4129");
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = "rgba(203, 225, 182, 0.16)";
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.strokeStyle = "rgba(121, 174, 97, 0.44)";
        ctx.lineWidth = 2;
        x = pad * 0.6;
        y = pad * 1.05;
        ctx.beginPath();
        ctx.moveTo(x, y + 10);
        ctx.quadraticCurveTo(x + 10, y - 6, x + 24, y + 8);
        ctx.moveTo(width - x, y + 10);
        ctx.quadraticCurveTo(width - (x + 10), y - 6, width - (x + 24), y + 8);
        ctx.moveTo(x, height - (y + 10));
        ctx.quadraticCurveTo(x + 10, height - (y - 6), x + 24, height - (y + 8));
        ctx.moveTo(width - x, height - (y + 10));
        ctx.quadraticCurveTo(width - (x + 10), height - (y - 6), width - (x + 24), height - (y + 8));
        ctx.stroke();
        break;
      case "crimson":
        gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#6d2e2b");
        gradient.addColorStop(1, "#1b090d");
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 188, 165, 0.14)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 116, 86, 0.48)";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(pad * 0.7, pad * 1.2);
        ctx.quadraticCurveTo(pad * 1.2, pad * 0.4, pad * 1.8, pad * 1.2);
        ctx.moveTo(width - (pad * 0.7), pad * 1.2);
        ctx.quadraticCurveTo(width - (pad * 1.2), pad * 0.4, width - (pad * 1.8), pad * 1.2);
        ctx.moveTo(pad * 0.7, height - (pad * 1.2));
        ctx.quadraticCurveTo(pad * 1.2, height - (pad * 0.4), pad * 1.8, height - (pad * 1.2));
        ctx.moveTo(width - (pad * 0.7), height - (pad * 1.2));
        ctx.quadraticCurveTo(width - (pad * 1.2), height - (pad * 0.4), width - (pad * 1.8), height - (pad * 1.2));
        ctx.stroke();
        break;
      case "ice":
        gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "rgba(239, 249, 255, 0.96)");
        gradient.addColorStop(1, "rgba(133, 179, 213, 0.86)");
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.58)";
        ctx.lineWidth = 2.6;
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 255, 255, 0.58)";
        ctx.beginPath();
        ctx.moveTo(pad * 0.65, pad * 0.2);
        ctx.lineTo(pad * 1.02, pad * 1.04);
        ctx.lineTo(pad * 1.38, pad * 0.2);
        ctx.moveTo(width - (pad * 0.65), pad * 0.2);
        ctx.lineTo(width - (pad * 1.02), pad * 1.04);
        ctx.lineTo(width - (pad * 1.38), pad * 0.2);
        ctx.moveTo(pad * 0.65, height - (pad * 0.2));
        ctx.lineTo(pad * 1.02, height - (pad * 1.04));
        ctx.lineTo(pad * 1.38, height - (pad * 0.2));
        ctx.moveTo(width - (pad * 0.65), height - (pad * 0.2));
        ctx.lineTo(width - (pad * 1.02), height - (pad * 1.04));
        ctx.lineTo(width - (pad * 1.38), height - (pad * 0.2));
        ctx.stroke();
        break;
      case "gold":
        gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#c8a020");
        gradient.addColorStop(0.5, "#ffdc7a");
        gradient.addColorStop(1, "#8b6111");
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 248, 213, 0.44)";
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.strokeStyle = "rgba(122, 77, 3, 0.28)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(pad * 0.95, pad * 0.95, 8, Math.PI * 0.15, Math.PI * 1.4);
        ctx.arc(width - (pad * 0.95), pad * 0.95, 8, Math.PI * 1.75, Math.PI * 0.6, true);
        ctx.arc(pad * 0.95, height - (pad * 0.95), 8, Math.PI * 1.55, Math.PI * 0.15, true);
        ctx.arc(width - (pad * 0.95), height - (pad * 0.95), 8, Math.PI * 1.2, Math.PI * 2.45);
        ctx.stroke();
        break;
      case "neon":
        gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#0a151e");
        gradient.addColorStop(1, "#0c3037");
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = "rgba(61, 246, 222, 0.44)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(pad * 0.7, pad * 0.9);
        ctx.lineTo(pad * 1.6, pad * 0.9);
        ctx.lineTo(pad * 1.6, pad * 1.5);
        ctx.moveTo(width - (pad * 0.7), pad * 0.9);
        ctx.lineTo(width - (pad * 1.6), pad * 0.9);
        ctx.lineTo(width - (pad * 1.6), pad * 1.5);
        ctx.moveTo(pad * 0.7, height - (pad * 0.9));
        ctx.lineTo(pad * 1.6, height - (pad * 0.9));
        ctx.lineTo(pad * 1.6, height - (pad * 1.5));
        ctx.moveTo(width - (pad * 0.7), height - (pad * 0.9));
        ctx.lineTo(width - (pad * 1.6), height - (pad * 0.9));
        ctx.lineTo(width - (pad * 1.6), height - (pad * 1.5));
        ctx.stroke();
        ctx.fillStyle = "rgba(61, 246, 222, 0.6)";
        ctx.beginPath();
        ctx.arc(pad * 1.75, pad * 1.5, 2.2, 0, Math.PI * 2);
        ctx.arc(width - (pad * 1.75), pad * 1.5, 2.2, 0, Math.PI * 2);
        ctx.arc(pad * 1.75, height - (pad * 1.5), 2.2, 0, Math.PI * 2);
        ctx.arc(width - (pad * 1.75), height - (pad * 1.5), 2.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "dragon":
        gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#b12619");
        gradient.addColorStop(1, "#4d0904");
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 220, 131, 0.32)";
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 204, 93, 0.44)";
        ctx.lineWidth = 1.3;
        for (index = 0; index < 9; index += 1) {
          x = pad + (index * ((width - (pad * 2)) / 8));
          ctx.beginPath();
          ctx.arc(x, pad * 0.92, 7, Math.PI, 0);
          ctx.arc(x, height - (pad * 0.92), 7, 0, Math.PI);
          ctx.stroke();
        }
        break;
      case "marble":
        gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#f7f8fb");
        gradient.addColorStop(1, "#ccd1d8");
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = "rgba(104, 111, 123, 0.24)";
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.strokeStyle = "rgba(124, 130, 142, 0.24)";
        ctx.lineWidth = 1;
        for (index = 0; index < 8; index += 1) {
          ctx.beginPath();
          ctx.moveTo(10 + (index * 12), 12 + (index * 7));
          ctx.lineTo(width - (18 + (index * 6)), height - (20 + (index * 10)));
          ctx.stroke();
        }
        break;
      case "void":
        gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#06070d");
        gradient.addColorStop(1, "#11162d");
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = "rgba(173, 150, 255, 0.28)";
        ctx.lineWidth = 2;
        ctx.stroke();
        for (index = 0; index < 18; index += 1) {
          x = 14 + ((((index * 19) + (performance.now() / 48)) % Math.max(20, width - 28)));
          y = 14 + ((((index * 29) + (performance.now() / 62)) % Math.max(20, height - 28)));
          ctx.fillStyle = index % 3 === 0 ? "rgba(255,255,255,0.76)" : "rgba(180,160,255,0.46)";
          ctx.beginPath();
          ctx.arc(x, y, index % 4 === 0 ? 1.8 : 1, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case "obsidian":
      default:
        gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#2b2933");
        gradient.addColorStop(1, "#0d0d13");
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = "rgba(199, 186, 236, 0.18)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = "rgba(179, 154, 255, 0.26)";
        ctx.lineWidth = 1.4;
        for (index = 0; index < 7; index += 1) {
          x = pad * 0.8 + (index * ((width - (pad * 1.6)) / 6));
          ctx.beginPath();
          ctx.moveTo(x - 4, pad * 0.86);
          ctx.lineTo(x, pad * 0.56);
          ctx.lineTo(x + 4, pad * 0.86);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x - 4, height - (pad * 0.86));
          ctx.lineTo(x, height - (pad * 0.56));
          ctx.lineTo(x + 4, height - (pad * 0.86));
          ctx.stroke();
        }
        break;
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1.4;
    roundedRectPath(ctx, innerInset, innerInset, width - (innerInset * 2), height - (innerInset * 2), 22);
    ctx.stroke();
    ctx.restore();
  }

  function ensureBoardLayers() {
    var board = byId("board");
    var boardCanvas;
    var annotationsCanvas;
    var dragCanvas;
    var eraserButton;
    if (!board) {
      return null;
    }
    if (boardLayers && boardLayers.host === board) {
      return boardLayers;
    }
    board.innerHTML = "";

    boardCanvas = document.createElement("canvas");
    boardCanvas.className = "board-layer-canvas board-base-canvas";
    boardCanvas.setAttribute("aria-hidden", "true");

    annotationsCanvas = document.createElement("canvas");
    annotationsCanvas.className = "board-layer-canvas board-annotations-canvas";
    annotationsCanvas.setAttribute("aria-hidden", "true");

    dragCanvas = document.createElement("canvas");
    dragCanvas.className = "board-layer-canvas board-drag-canvas";
    dragCanvas.setAttribute("aria-hidden", "true");

    eraserButton = document.createElement("button");
    eraserButton.id = "annotation-eraser";
    eraserButton.className = "annotation-eraser hidden";
    eraserButton.type = "button";
    eraserButton.setAttribute("aria-label", "Clear annotations");
    eraserButton.innerHTML = "&#9003;";
    eraserButton.onclick = function () {
      clearBoardAnnotations();
    };

    board.appendChild(boardCanvas);
    board.appendChild(annotationsCanvas);
    board.appendChild(dragCanvas);
    board.appendChild(eraserButton);

    boardLayers = {
      host: board,
      boardCanvas: boardCanvas,
      boardContext: boardCanvas.getContext("2d"),
      annotationsCanvas: annotationsCanvas,
      annotationsContext: annotationsCanvas.getContext("2d"),
      dragCanvas: dragCanvas,
      dragContext: dragCanvas.getContext("2d"),
      eraserButton: eraserButton,
      cssSize: 0,
      pixelRatio: 1
    };
    resizeBoardLayers();
    return boardLayers;
  }

  function resizeBoardLayers() {
    var layers = ensureBoardLayers();
    var board;
    var rect;
    var size;
    var ratio;
    var canvases;
    var contexts;
    var index;
    if (!layers) {
      return;
    }
    board = layers.host;
    rect = board.getBoundingClientRect();
    size = Math.max(0, Math.round(Math.min(rect.width, rect.height)));
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (layers.cssSize === size && layers.pixelRatio === ratio) {
      return;
    }
    layers.cssSize = size;
    layers.pixelRatio = ratio;
    canvases = [layers.boardCanvas, layers.annotationsCanvas, layers.dragCanvas];
    contexts = [layers.boardContext, layers.annotationsContext, layers.dragContext];
    for (index = 0; index < canvases.length; index += 1) {
      canvases[index].width = Math.max(1, Math.round(size * ratio));
      canvases[index].height = Math.max(1, Math.round(size * ratio));
      canvases[index].style.width = size + "px";
      canvases[index].style.height = size + "px";
      contexts[index].setTransform(ratio, 0, 0, ratio, 0, 0);
    }
  }

  function boardMetrics() {
    var layers = ensureBoardLayers();
    var size = layers ? layers.cssSize : 0;
    return {
      size: size,
      squareSize: size / 8
    };
  }

  function squareToDisplayPosition(squareName) {
    var metrics = boardMetrics();
    var order = squareOrder();
    var fileIndex;
    var rankIndex;
    var displayCol;
    var displayRow;
    if (!squareName) {
      return null;
    }
    fileIndex = squareName.charCodeAt(0) - 97;
    rankIndex = 8 - parseInt(squareName.charAt(1), 10);
    displayCol = order.cols.indexOf(fileIndex);
    displayRow = order.rows.indexOf(rankIndex);
    if (displayCol < 0 || displayRow < 0) {
      return null;
    }
    return {
      x: displayCol * metrics.squareSize,
      y: displayRow * metrics.squareSize,
      size: metrics.squareSize
    };
  }

  function squareFromBoardPoint(clientX, clientY) {
    var board = byId("board");
    var rect;
    var metrics = boardMetrics();
    var col;
    var row;
    var order = squareOrder();
    if (!board || metrics.squareSize <= 0) {
      return "";
    }
    rect = board.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return "";
    }
    col = Math.max(0, Math.min(7, Math.floor((clientX - rect.left) / metrics.squareSize)));
    row = Math.max(0, Math.min(7, Math.floor((clientY - rect.top) / metrics.squareSize)));
    return String.fromCharCode(97 + order.cols[col]) + String(8 - order.rows[row]);
  }

  function currentPointerSquare(event) {
    return squareFromBoardPoint(event.clientX, event.clientY);
  }

  function canInteractWithBoard() {
    return !!(
      state &&
      state.playerToMove &&
      !aiPending &&
      !movePending &&
      state.result === "*" &&
      !isReplayMode()
    );
  }

  function pieceImageKey(piece, pieceSet) {
    return pieceSet + ":" + piece.color + ":" + piece.kind;
  }

  function requestPieceImage(piece, pieceSet) {
    var key = pieceImageKey(piece, pieceSet);
    var image = boardImageCache[key];
    if (pieceSet === "letters") {
      return null;
    }
    if (image) {
      return image.complete ? image : null;
    }
    image = new Image();
    image.onload = renderBoard;
    image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(pieceSvg(piece.kind, piece.color, pieceSet));
    boardImageCache[key] = image;
    return null;
  }

  function movableSquareMap() {
    var moveMap = buildMoveMap();
    var movable = {};
    var key;
    for (key in moveMap) {
      if (Object.prototype.hasOwnProperty.call(moveMap, key) && moveMap[key] && moveMap[key].length > 0) {
        movable[key] = true;
      }
    }
    return movable;
  }

  function shouldLiftSquare(squareName) {
    var movable = movableSquareMap();
    return !!(hoveredSquare && hoveredSquare === squareName && movable[squareName] && canInteractWithBoard());
  }

  function hoverProgressForSquare(squareName) {
    return hoverSquareProgress[squareName] || 0;
  }

  function updateHoverAnimationState(deltaMs) {
    var keepAnimating = false;
    var rank;
    var file;
    var squareName;
    var target;
    var current;
    var next;
    for (rank = 1; rank <= 8; rank += 1) {
      for (file = 0; file < 8; file += 1) {
        squareName = String.fromCharCode(97 + file) + String(rank);
        target = shouldLiftSquare(squareName) ? 1 : 0;
        current = hoverSquareProgress[squareName] || 0;
        if (target >= 1) {
          next = 1;
        } else if (current > 0) {
          next = Math.max(0, current - (deltaMs / 150));
        } else {
          next = 0;
        }
        if (next > 0.001) {
          hoverSquareProgress[squareName] = next;
        } else if (hoverSquareProgress[squareName]) {
          delete hoverSquareProgress[squareName];
        }
        if (target === 0 && next > 0.001) {
          keepAnimating = true;
        }
      }
    }
    return keepAnimating;
  }

  function hoverNeedsAnimation() {
    var key;
    for (key in hoverSquareProgress) {
      if (Object.prototype.hasOwnProperty.call(hoverSquareProgress, key)) {
        if ((hoverSquareProgress[key] || 0) < 0.999 || !shouldLiftSquare(key)) {
          return true;
        }
      }
    }
    return false;
  }

  function checkedKingPulseAlpha() {
    return 0.16 + ((((Math.sin(performance.now() / 180) + 1) / 2)) * 0.24);
  }

  function currentCursedSquares(view) {
    var data = readFrontendData();
    var fromState = view && Array.isArray(view.cursedSquares) ? view.cursedSquares : [];
    var fromLocal =
      data.currentGame && Array.isArray(data.currentGame.cursedSquares)
        ? data.currentGame.cursedSquares
        : [];
    return fromState.concat(fromLocal);
  }

  function drawCursedGlows(ctx, view, squareSize) {
    var cursedSquares = currentCursedSquares(view);
    var index;
    var position;
    var pulse;
    if (!cursedSquares || cursedSquares.length === 0) {
      return false;
    }
    pulse = 0.38 + ((((Math.sin(performance.now() / 210) + 1) / 2)) * 0.22);
    ctx.save();
    for (index = 0; index < cursedSquares.length; index += 1) {
      position = squareToDisplayPosition(cursedSquares[index]);
      if (!position) {
        continue;
      }
      ctx.strokeStyle = "rgba(255, 109, 48, " + pulse.toFixed(3) + ")";
      ctx.lineWidth = Math.max(3, squareSize * 0.08);
      ctx.beginPath();
      ctx.arc(position.x + (squareSize / 2), position.y + (squareSize / 2), squareSize * 0.34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 199, 86, " + Math.max(0.12, pulse - 0.12).toFixed(3) + ")";
      ctx.lineWidth = Math.max(2, squareSize * 0.04);
      ctx.beginPath();
      ctx.arc(position.x + (squareSize / 2), position.y + (squareSize / 2), squareSize * 0.24, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    return true;
  }

  function drawQueuedPremove(ctx, squareSize) {
    var fromPosition;
    var toPosition;
    if (!queuedPremove || !queuedPremove.from || !queuedPremove.to) {
      return;
    }
    fromPosition = squareToDisplayPosition(queuedPremove.from);
    toPosition = squareToDisplayPosition(queuedPremove.to);
    ctx.save();
    if (fromPosition) {
      ctx.fillStyle = "rgba(160,80,255,0.35)";
      ctx.fillRect(fromPosition.x, fromPosition.y, squareSize, squareSize);
    }
    if (toPosition) {
      ctx.fillStyle = "rgba(160,80,255,0.2)";
      ctx.fillRect(toPosition.x, toPosition.y, squareSize, squareSize);
    }
    ctx.restore();
  }

  function boardNeedsAnimation() {
    return !!(
      dragSnapback ||
      moveTrails.length > 0 ||
      hoverNeedsAnimation() ||
      findCheckedKingSquare(currentDisplay()) ||
      currentCursedSquares(currentDisplay()).length > 0 ||
      effectiveBorderStyle() === "void"
    );
  }

  function requestBoardRedraw() {
    needsRedraw = true;
    ensureGameLoop();
  }

  function updateBoardAnimationState(timestamp) {
    var deltaMs = gameLoopLastFrame ? Math.min(34, timestamp - gameLoopLastFrame) : 16;
    var changed = false;
    var progress;
    changed = updateHoverAnimationState(deltaMs) || changed;
    stepMoveTrails();
    if (moveTrails.length > 0) {
      changed = true;
    }
    if (dragSnapback) {
      progress = Math.min(1, (timestamp - dragSnapback.startedAt) / dragSnapback.duration);
      if (dragSnapback.progress !== progress) {
        dragSnapback.progress = progress;
        changed = true;
      }
      if (progress >= 1) {
        dragSnapback = null;
        changed = true;
      }
    }
    if (findCheckedKingSquare(currentDisplay()) || currentCursedSquares(currentDisplay()).length > 0 || effectiveBorderStyle() === "void") {
      changed = true;
    }
    return changed;
  }

  function gameLoop(timestamp) {
    var animated = false;
    gameLoopFrame = window.requestAnimationFrame(gameLoop);
    if (cutsceneActive) {
      gameLoopLastFrame = timestamp;
      return;
    }
    animated = updateBoardAnimationState(timestamp);
    gameLoopLastFrame = timestamp;
    if (animated) {
      needsRedraw = true;
    }
    if (needsRedraw) {
      renderBoard();
      needsRedraw = false;
    }
  }

  function ensureGameLoop() {
    if (!gameLoopFrame) {
      gameLoopFrame = window.requestAnimationFrame(gameLoop);
    }
  }

  function onCutsceneComplete() {
    cutsceneActive = false;
    cutsceneQueued = false;
    requestBoardRedraw();
  }

  function clearTouchLongPressTimer() {
    if (touchLongPressTimer) {
      window.clearTimeout(touchLongPressTimer);
      touchLongPressTimer = 0;
    }
  }

  function annotationColorFromEvent(event) {
    if (event.altKey) {
      return "rgba(50,150,255,0.7)";
    }
    if (event.ctrlKey) {
      return "rgba(220,50,50,0.7)";
    }
    if (event.shiftKey) {
      return "rgba(255,200,0,0.7)";
    }
    return "rgba(0,200,80,0.7)";
  }

  function clearBoardAnnotations() {
    boardAnnotations = [];
    annotationGesture = null;
    touchAnnotationMode = null;
    hideTouchAnnotationPicker();
    requestBoardRedraw();
  }

  function hideTouchAnnotationPicker() {
    var picker = byId("touch-annotation-picker");
    if (!picker) {
      return;
    }
    picker.className = "touch-annotation-picker hidden";
    picker.setAttribute("aria-hidden", "true");
  }

  function showTouchAnnotationPicker(clientX, clientY) {
    var picker = byId("touch-annotation-picker");
    var shell = byId("board-shell");
    var shellRect;
    var pickerWidth;
    var pickerHeight;
    var left;
    var top;
    if (!picker || !shell) {
      return;
    }
    shellRect = shell.getBoundingClientRect();
    pickerWidth = 116;
    pickerHeight = 116;
    left = Math.max(4, Math.min(shellRect.width - pickerWidth - 4, clientX - shellRect.left - (pickerWidth / 2)));
    top = Math.max(4, Math.min(shellRect.height - pickerHeight - 4, clientY - shellRect.top - pickerHeight - 12));
    picker.style.left = left + "px";
    picker.style.top = top + "px";
    picker.className = "touch-annotation-picker";
    picker.setAttribute("aria-hidden", "false");
  }

  function annotationEqualsDot(item, squareName, color) {
    return item && item.type === "dot" && item.square === squareName && item.color === color;
  }

  function annotationEqualsArrow(item, fromSquare, toSquare, color) {
    return item && item.type === "arrow" && item.from === fromSquare && item.to === toSquare && item.color === color;
  }

  function toggleDotAnnotation(squareName, color) {
    var index;
    for (index = 0; index < boardAnnotations.length; index += 1) {
      if (annotationEqualsDot(boardAnnotations[index], squareName, color)) {
        boardAnnotations.splice(index, 1);
        return;
      }
    }
    boardAnnotations.push({ type: "dot", square: squareName, color: color });
  }

  function toggleArrowAnnotation(fromSquare, toSquare, color) {
    var index;
    for (index = 0; index < boardAnnotations.length; index += 1) {
      if (annotationEqualsArrow(boardAnnotations[index], fromSquare, toSquare, color)) {
        boardAnnotations.splice(index, 1);
        return;
      }
    }
    boardAnnotations.push({ type: "arrow", from: fromSquare, to: toSquare, color: color });
  }

  function finalizeAnnotationGesture() {
    if (!annotationGesture || !annotationGesture.fromSquare) {
      annotationGesture = null;
      touchAnnotationMode = null;
      hideTouchAnnotationPicker();
      requestBoardRedraw();
      return;
    }
    if (!annotationGesture.toSquare || annotationGesture.toSquare === annotationGesture.fromSquare) {
      toggleDotAnnotation(annotationGesture.fromSquare, annotationGesture.color);
    } else {
      toggleArrowAnnotation(annotationGesture.fromSquare, annotationGesture.toSquare, annotationGesture.color);
    }
    annotationGesture = null;
    touchAnnotationMode = null;
    hideTouchAnnotationPicker();
    requestBoardRedraw();
  }

  function addMoveTrail(animation) {
    if (!animation || !animation.movingPiece || !state || !state.animatePieces) {
      return;
    }
    moveTrails.push({
      from: animation.from,
      to: animation.to,
      piece: animation.movingPiece,
      pieceSet: animation.pieceSet || state.pieceSet || "classic",
      startedAt: performance.now(),
      duration: 400
    });
    requestBoardRedraw();
  }

  function stepMoveTrails() {
    var now = performance.now();
    var remaining = [];
    var index;
    moveTrailFrame = 0;
    for (index = 0; index < moveTrails.length; index += 1) {
      if (now - moveTrails[index].startedAt < moveTrails[index].duration) {
        remaining.push(moveTrails[index]);
      }
    }
    moveTrails = remaining;
  }

  function buildMoveMap() {
    var map = {};
    if (!state || !state.availableMoves || isReplayMode()) {
      return map;
    }
    var index;
    var move;
    for (index = 0; index < state.availableMoves.length; index += 1) {
      move = state.availableMoves[index];
      if (!map[move.from]) {
        map[move.from] = [];
      }
      map[move.from].push(move);
    }
    return map;
  }

  function findCheckedKingSquare(view) {
    if (!view || !view.checkColor || !view.board) {
      return null;
    }
    var row;
    var col;
    var piece;
    for (row = 0; row < 8; row += 1) {
      for (col = 0; col < 8; col += 1) {
        piece = view.board[row][col];
        if (piece && piece.color === view.checkColor && piece.kind === "king") {
          return piece.square;
        }
      }
    }
    return null;
  }

  function squareClasses(squareName, piece, view) {
    var fileIndex = squareName.charCodeAt(0) - 97;
    var rank = parseInt(squareName.charAt(1), 10);
    var row = 8 - rank;
    var classes = ["square"];
    var isDark = ((row + fileIndex) % 2) === 1;
    var checkedKingSquare = findCheckedKingSquare(view);
    classes.push(isDark ? "dark" : "light");

    if (view && view.lastMove && (view.lastMove.from === squareName || view.lastMove.to === squareName)) {
      classes.push(isDark ? "last-dark" : "last-light");
    }
    if (selectedSquare === squareName && !isReplayMode()) {
      classes.push("selected");
    }
    if (checkedKingSquare === squareName) {
      classes.push("check");
    }
    if (piece) {
      classes.push("occupied");
      classes.push(piece.color);
    }
    return classes.join(" ");
  }

  function pieceGlyph(piece, pieceSetOverride) {
    var pieceSet = pieceSetOverride || (state ? state.pieceSet : "classic");
    if (pieceSet === "letters") {
      return piece.color === "white" ? PIECE_LETTERS[piece.kind] : PIECE_LETTERS[piece.kind].toLowerCase();
    }
    return pieceSvg(piece.kind, piece.color, pieceSet);
  }

  function capturedPieceMarkup(piece) {
    var pieceSet = state ? state.pieceSet : "classic";
    var element = document.createElement("span");
    element.className = "captured-piece " + piece.color + " piece-set-" + pieceSet;
    element.appendChild(buildPieceCanvasNode(piece, pieceSet, 28));
    return element;
  }

  function materialValueForPieces(pieces) {
    var total = 0;
    var index;
    for (index = 0; pieces && index < pieces.length; index += 1) {
      total += PIECE_MATERIAL_VALUES[pieces[index].kind] || 0;
    }
    return total;
  }

  function clearElementChildren(element) {
    while (element && element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function renderCapturedStrip(element, pieceNodes, score) {
    var wrapper;
    var scoreNode;
    var index;
    if (!element) {
      return;
    }
    clearElementChildren(element);
    if (pieceNodes && pieceNodes.length > 0) {
      wrapper = document.createElement("span");
      wrapper.className = "captured-pieces";
      for (index = 0; index < pieceNodes.length; index += 1) {
        wrapper.appendChild(pieceNodes[index]);
      }
      element.appendChild(wrapper);
    }
    if (score > 0) {
      scoreNode = document.createElement("span");
      scoreNode.className = "captured-score";
      scoreNode.innerText = "+" + score;
      element.appendChild(scoreNode);
    }
    element.className = "captured-strip" + ((!pieceNodes || pieceNodes.length === 0) && score <= 0 ? " empty" : "");
  }

  function buildTargetMap() {
    var map = {};
    var moveMap = buildMoveMap();
    var moves = moveMap[selectedSquare] || [];
    var index;
    var move;
    for (index = 0; index < moves.length; index += 1) {
      move = moves[index];
      if (!map[move.to]) {
        map[move.to] = [];
      }
      map[move.to].push(move);
    }
    return map;
  }

  function pieceAtSquare(board, squareName) {
    var fileIndex;
    var rank;
    var row;
    if (!board || !squareName || squareName.length !== 2) {
      return null;
    }
    fileIndex = squareName.charCodeAt(0) - 97;
    rank = parseInt(squareName.charAt(1), 10);
    row = 8 - rank;
    if (fileIndex < 0 || fileIndex > 7 || row < 0 || row > 7 || isNaN(rank)) {
      return null;
    }
    return board[row][fileIndex];
  }

  function clearBoardAnimationEffects() {
    var board = byId("board");
    var layer;
    var hiddenPieces;
    var arrivals;
    var index;
    if (boardAnimationTimer) {
      window.clearTimeout(boardAnimationTimer);
      boardAnimationTimer = 0;
    }
    if (!board) {
      return;
    }
    layer = board.querySelector(".board-effects-layer");
    if (layer && layer.parentNode) {
      layer.parentNode.removeChild(layer);
    }
    hiddenPieces = board.querySelectorAll(".board-fx-hidden");
    for (index = 0; index < hiddenPieces.length; index += 1) {
      hiddenPieces[index].classList.remove("board-fx-hidden");
    }
    arrivals = board.querySelectorAll(".board-fx-arrival");
    for (index = 0; index < arrivals.length; index += 1) {
      arrivals[index].classList.remove("board-fx-arrival");
    }
  }

  function buildBoardAnimation(previousState, nextState) {
    var move;
    var movingPiece;
    var capturedSquare;
    var capturedPiece;
    if (
      !previousState ||
      !nextState ||
      !nextState.animatePieces ||
      isReplayMode() ||
      !previousState.gameActive ||
      !previousState.board ||
      !nextState.board ||
      !nextState.lastMove ||
      !previousState.moveHistory ||
      !nextState.moveHistory ||
      nextState.moveHistory.length !== previousState.moveHistory.length + 1
    ) {
      return null;
    }
    move = nextState.lastMove;
    movingPiece = pieceAtSquare(previousState.board, move.from);
    if (!movingPiece) {
      return null;
    }
    capturedSquare = move.capture ? (move.capturedSquare || move.to) : "";
    capturedPiece = capturedSquare ? pieceAtSquare(previousState.board, capturedSquare) : null;
    return {
      from: move.from,
      to: move.to,
      capture: !!move.capture,
      cinematicCapture: !!(move.capture && nextState.cinematicCaptures),
      capturedSquare: capturedSquare,
      movingPiece: movingPiece,
      capturedPiece: capturedPiece,
      pieceSet: nextState.pieceSet || "classic"
    };
  }

  function squareRectWithinBoard(squareName) {
    var position = squareToDisplayPosition(squareName);
    if (!position) {
      return null;
    }
    return {
      left: position.x,
      top: position.y,
      width: position.size,
      height: position.size
    };
  }

  function preparePieceCanvas(canvas, cssWidth, cssHeight) {
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var context = canvas.getContext("2d");
    canvas.width = Math.max(1, Math.round(cssWidth * ratio));
    canvas.height = Math.max(1, Math.round(cssHeight * ratio));
    canvas.style.width = cssWidth + "px";
    canvas.style.height = cssHeight + "px";
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return context;
  }

  function buildPieceCanvasNode(piece, pieceSet, cssSize) {
    var size = Math.max(14, Math.round(cssSize || 28));
    var canvas = document.createElement("canvas");
    var context;
    canvas.className = "piece-canvas";
    context = preparePieceCanvas(canvas, size, size);
    renderPiece(context, piece.kind, piece.color, 0, 0, size / 100, pieceSet, 0, false);
    return canvas;
  }

  function buildAnimatedPieceElement(piece, pieceSet, extraClass, cssSize) {
    var element = document.createElement("div");
    var size = Math.max(24, Math.round(cssSize || 64));
    element.className = "piece board-fx-piece " + piece.color + " piece-set-" + pieceSet + (extraClass ? " " + extraClass : "");
    element.style.width = size + "px";
    element.style.height = size + "px";
    element.appendChild(buildPieceCanvasNode(piece, pieceSet, size));
    return element;
  }

  function playBoardAnimation(animation) {
    var board = byId("board");
    var layer;
    var fromRect;
    var toRect;
    var capturedRect;
    var mover;
    var victim;
    var burst;
    var dx;
    var dy;
    if (!animation || !board) {
      return;
    }
    fromRect = squareRectWithinBoard(animation.from);
    toRect = squareRectWithinBoard(animation.to);
    if (!fromRect || !toRect) {
      return;
    }
    clearBoardAnimationEffects();
    layer = document.createElement("div");
    layer.className = "board-effects-layer";
    board.appendChild(layer);

    mover = buildAnimatedPieceElement(animation.movingPiece, animation.pieceSet, "board-fx-move-piece", fromRect.width);
    mover.style.left = fromRect.left + "px";
    mover.style.top = fromRect.top + "px";
    dx = toRect.left - fromRect.left;
    dy = toRect.top - fromRect.top;
    mover.style.setProperty("--board-fx-dx", dx + "px");
    mover.style.setProperty("--board-fx-dy", dy + "px");
    mover.classList.add("board-fx-move-capture");
    layer.appendChild(mover);

    if (animation.capture && animation.capturedPiece && animation.capturedSquare) {
      capturedRect = squareRectWithinBoard(animation.capturedSquare) || toRect;
      victim = buildAnimatedPieceElement(animation.capturedPiece, animation.pieceSet, "board-fx-captured-piece", capturedRect.width);
      victim.style.left = capturedRect.left + "px";
      victim.style.top = capturedRect.top + "px";
      victim.style.setProperty("--board-fx-spin", animation.movingPiece.color === "white" ? "-14deg" : "14deg");
      layer.appendChild(victim);
    }

    burst = document.createElement("div");
    burst.className = "board-fx-impact board-fx-impact-capture";
    burst.style.left = toRect.left + "px";
    burst.style.top = toRect.top + "px";
    layer.appendChild(burst);

    if (animation.cinematicCapture) {
      var slashA = document.createElement("div");
      var slashB = document.createElement("div");
      slashA.className = "board-fx-slash board-fx-slash-a";
      slashB.className = "board-fx-slash board-fx-slash-b";
      slashA.style.left = toRect.left + "px";
      slashA.style.top = toRect.top + "px";
      slashB.style.left = toRect.left + "px";
      slashB.style.top = toRect.top + "px";
      layer.appendChild(slashA);
      layer.appendChild(slashB);
    }

    boardAnimationTimer = window.setTimeout(function () {
      boardAnimationTimer = 0;
      if (layer.parentNode) {
        layer.parentNode.removeChild(layer);
      }
    }, 430);
  }

  function themeValue(name, fallback) {
    var value = window.getComputedStyle(document.body).getPropertyValue(name).trim();
    return value || fallback;
  }

  function rgbaFromVariable(name, fallbackAlpha, fallbackRgb) {
    var rgb = themeValue(name, fallbackRgb);
    return "rgba(" + rgb + ", " + fallbackAlpha + ")";
  }

  function pieceCanvasProfile(pieceSet, color, size) {
    var style = normalizePieceStyleName(pieceSet || "classic");
    var isWhite = color === "white";
    var profile = {
      style: style,
      fillTop: isWhite ? "#F5F0E8" : "#1C1C1C",
      fillBottom: isWhite ? "#DDD6CB" : "#050505",
      stroke: isWhite ? "#333333" : "#CCCCCC",
      detail: isWhite ? "rgba(44, 36, 28, 0.22)" : "rgba(255, 255, 255, 0.16)",
      highlight: isWhite ? "rgba(255, 255, 255, 0.24)" : "rgba(255, 255, 255, 0.10)",
      shade: isWhite ? "rgba(46, 31, 17, 0.14)" : "rgba(0, 0, 0, 0.28)",
      baseTone: isWhite ? "rgba(43, 32, 21, 0.12)" : "rgba(255, 255, 255, 0.10)",
      lineWidth: 1.5,
      flat: false,
      grain: false,
      shadowAlpha: 0.32,
      lineJoin: "round",
      lineCap: "round"
    };
    if (style === "neo") {
      profile.fillTop = isWhite ? "#FAF4EA" : "#262626";
      profile.fillBottom = isWhite ? "#DED0BC" : "#090909";
      profile.stroke = isWhite ? "#2E2E2E" : "#E3E3E3";
      profile.detail = isWhite ? "rgba(40, 40, 40, 0.20)" : "rgba(255, 255, 255, 0.13)";
      profile.highlight = isWhite ? "rgba(255, 255, 255, 0.26)" : "rgba(255, 255, 255, 0.08)";
      profile.shade = isWhite ? "rgba(30, 30, 30, 0.12)" : "rgba(0, 0, 0, 0.32)";
      profile.baseTone = isWhite ? "rgba(32, 32, 32, 0.11)" : "rgba(255, 255, 255, 0.08)";
      profile.lineWidth = 1.18;
      profile.shadowAlpha = 0.25;
      profile.lineJoin = "miter";
      profile.lineCap = "butt";
    } else if (style === "minimal") {
      profile.fillTop = isWhite ? "#F5F0E8" : "#1C1C1C";
      profile.fillBottom = profile.fillTop;
      profile.stroke = isWhite ? "#333333" : "#CCCCCC";
      profile.detail = isWhite ? "rgba(51, 51, 51, 0.18)" : "rgba(204, 204, 204, 0.18)";
      profile.baseTone = "rgba(0, 0, 0, 0)";
      profile.lineWidth = 1.08;
      profile.flat = true;
      profile.shadowAlpha = 0;
    } else if (style === "wood") {
      profile.fillTop = isWhite ? "#C8A87A" : "#3D2010";
      profile.fillBottom = isWhite ? "#AE8454" : "#241107";
      profile.stroke = isWhite ? "#6A4728" : "#D9B58D";
      profile.detail = isWhite ? "rgba(94, 58, 24, 0.22)" : "rgba(230, 196, 160, 0.16)";
      profile.highlight = isWhite ? "rgba(255, 233, 194, 0.22)" : "rgba(255, 230, 196, 0.08)";
      profile.shade = isWhite ? "rgba(93, 59, 26, 0.18)" : "rgba(0, 0, 0, 0.24)";
      profile.baseTone = isWhite ? "rgba(78, 50, 21, 0.12)" : "rgba(217, 181, 141, 0.10)";
      profile.grain = true;
      profile.shadowAlpha = 0.28;
    }
    profile.size = size;
    return profile;
  }

  function currentPieceFill(ctx, profile) {
    var gradient;
    if (profile.flat) {
      return profile.fillTop;
    }
    gradient = ctx.createLinearGradient(0, 8, 0, 96);
    gradient.addColorStop(0, profile.fillTop);
    gradient.addColorStop(profile.style === "neo" ? 0.44 : 0.36, profile.fillTop);
    gradient.addColorStop(1, profile.fillBottom);
    return gradient;
  }

  function addPieceSurfaceDetails(ctx, profile) {
    var overlay;
    var index;
    if (profile.flat) {
      return;
    }
    overlay = ctx.createLinearGradient(50, 10, 50, 90);
    overlay.addColorStop(0, profile.highlight);
    overlay.addColorStop(0.48, "rgba(255, 255, 255, 0)");
    overlay.addColorStop(1, profile.shade);
    ctx.fillStyle = overlay;
    ctx.fillRect(18, 10, 64, 80);
    if (profile.grain) {
      ctx.strokeStyle = profile.detail;
      ctx.lineWidth = 1.35;
      for (index = 0; index < 4; index += 1) {
        ctx.beginPath();
        ctx.moveTo(24, 28 + (index * 12));
        ctx.bezierCurveTo(35, 20 + (index * 10), 52, 30 + (index * 11), 76, 18 + (index * 12));
        ctx.stroke();
      }
      return;
    }
    if (profile.style === "neo") {
      ctx.strokeStyle = profile.detail;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(43, 20);
      ctx.lineTo(39, 78);
      ctx.moveTo(56, 18);
      ctx.lineTo(61, 76);
      ctx.stroke();
      return;
    }
    ctx.strokeStyle = profile.detail;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(35, 24);
    ctx.bezierCurveTo(46, 18, 58, 18, 67, 24);
    ctx.stroke();
  }

  function finishPieceShape(ctx, profile) {
    ctx.save();
    ctx.fillStyle = currentPieceFill(ctx, profile);
    ctx.fill();
    ctx.clip();
    addPieceSurfaceDetails(ctx, profile);
    ctx.restore();
    ctx.strokeStyle = profile.stroke;
    ctx.lineWidth = profile.lineWidth;
    ctx.stroke();
  }

  function drawPieceBase(ctx, profile) {
    if (profile.flat) {
      return;
    }
    ctx.beginPath();
    ctx.ellipse(50, 88, 18, 4.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = profile.baseTone;
    ctx.fill();
  }

  function drawPawnShape(ctx, profile) {
    ctx.beginPath();
    ctx.arc(50, 24, 10, 0, Math.PI * 2);
    ctx.moveTo(43, 37);
    ctx.lineTo(57, 37);
    ctx.bezierCurveTo(61, 41, 62, 46, 58, 52);
    ctx.bezierCurveTo(63, 58, 66, 67, 67, 78);
    ctx.lineTo(33, 78);
    ctx.bezierCurveTo(34, 67, 37, 58, 42, 52);
    ctx.bezierCurveTo(38, 46, 39, 41, 43, 37);
    ctx.closePath();
    ctx.moveTo(30, 84);
    ctx.lineTo(70, 84);
    ctx.lineTo(67, 78);
    ctx.lineTo(33, 78);
    ctx.closePath();
    finishPieceShape(ctx, profile);
    ctx.beginPath();
    ctx.moveTo(39, 56);
    ctx.lineTo(61, 56);
    ctx.lineWidth = profile.lineWidth * 0.82;
    ctx.strokeStyle = profile.detail;
    ctx.stroke();
  }

  function drawRookShape(ctx, profile) {
    ctx.beginPath();
    ctx.moveTo(30, 84);
    ctx.lineTo(70, 84);
    ctx.lineTo(67, 78);
    ctx.lineTo(64, 78);
    ctx.lineTo(63, 34);
    ctx.lineTo(69, 30);
    ctx.lineTo(69, 18);
    ctx.lineTo(62, 18);
    ctx.lineTo(62, 27);
    ctx.lineTo(54, 27);
    ctx.lineTo(54, 18);
    ctx.lineTo(46, 18);
    ctx.lineTo(46, 27);
    ctx.lineTo(38, 27);
    ctx.lineTo(38, 18);
    ctx.lineTo(31, 18);
    ctx.lineTo(31, 30);
    ctx.lineTo(37, 34);
    ctx.lineTo(36, 78);
    ctx.lineTo(33, 78);
    ctx.closePath();
    finishPieceShape(ctx, profile);
    ctx.beginPath();
    ctx.moveTo(37, 44);
    ctx.lineTo(63, 44);
    ctx.moveTo(37, 58);
    ctx.lineTo(63, 58);
    ctx.moveTo(37, 70);
    ctx.lineTo(63, 70);
    ctx.lineWidth = profile.lineWidth * 0.84;
    ctx.strokeStyle = profile.detail;
    ctx.stroke();
  }

  function drawKnightShape(ctx, profile) {
    ctx.beginPath();
    ctx.moveTo(30, 84);
    ctx.lineTo(70, 84);
    ctx.lineTo(67, 78);
    ctx.lineTo(33, 78);
    ctx.closePath();
    ctx.moveTo(35, 78);
    ctx.bezierCurveTo(34, 68, 34, 59, 37, 51);
    ctx.bezierCurveTo(40, 43, 46, 36, 53, 31);
    ctx.bezierCurveTo(58, 27, 61, 22, 61, 15);
    ctx.bezierCurveTo(58, 14, 55, 16, 53, 21);
    ctx.bezierCurveTo(51, 15, 46, 12, 41, 14);
    ctx.bezierCurveTo(37, 18, 37, 24, 40, 29);
    ctx.bezierCurveTo(45, 34, 49, 39, 52, 45);
    ctx.bezierCurveTo(57, 42, 64, 43, 71, 46);
    ctx.bezierCurveTo(76, 49, 79, 53, 79, 58);
    ctx.bezierCurveTo(75, 61, 70, 63, 64, 64);
    ctx.bezierCurveTo(59, 65, 56, 68, 55, 72);
    ctx.bezierCurveTo(54, 74, 54, 76, 55, 78);
    ctx.closePath();
    finishPieceShape(ctx, profile);
    ctx.beginPath();
    ctx.moveTo(43, 31);
    ctx.bezierCurveTo(39, 39, 38, 49, 39, 59);
    ctx.bezierCurveTo(40, 66, 42, 73, 44, 78);
    ctx.lineWidth = profile.lineWidth * 0.88;
    ctx.strokeStyle = profile.detail;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(54, 47);
    ctx.bezierCurveTo(60, 47, 66, 49, 71, 52);
    ctx.moveTo(55, 60);
    ctx.bezierCurveTo(61, 58, 67, 55, 71, 52);
    ctx.lineWidth = profile.lineWidth * 0.76;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(52, 21);
    ctx.lineTo(55, 12);
    ctx.lineTo(58, 21);
    ctx.closePath();
    ctx.fillStyle = profile.stroke;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(57.5, 38.5, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(69.5, 55, 1.45, 0, Math.PI * 2);
    ctx.fillStyle = profile.detail;
    ctx.fill();
  }

  function drawBishopShape(ctx, profile) {
    ctx.beginPath();
    ctx.moveTo(30, 84);
    ctx.lineTo(70, 84);
    ctx.lineTo(67, 78);
    ctx.lineTo(33, 78);
    ctx.closePath();
    ctx.moveTo(38, 78);
    ctx.bezierCurveTo(38, 63, 40, 55, 44, 48);
    ctx.bezierCurveTo(38, 42, 39, 31, 46, 22);
    ctx.bezierCurveTo(48, 19, 49.5, 17, 50, 15);
    ctx.bezierCurveTo(50.5, 17, 52, 19, 54, 22);
    ctx.bezierCurveTo(61, 31, 62, 42, 56, 48);
    ctx.bezierCurveTo(60, 55, 62, 63, 62, 78);
    ctx.closePath();
    finishPieceShape(ctx, profile);
    ctx.beginPath();
    ctx.ellipse(50, 56, 10.5, 3.8, 0, 0, Math.PI * 2);
    ctx.lineWidth = profile.lineWidth * 0.82;
    ctx.strokeStyle = profile.detail;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(56, 25);
    ctx.lineTo(45, 49);
    ctx.stroke();
  }

  function drawQueenShape(ctx, profile) {
    ctx.beginPath();
    ctx.moveTo(30, 84);
    ctx.lineTo(70, 84);
    ctx.lineTo(67, 78);
    ctx.lineTo(33, 78);
    ctx.closePath();
    ctx.moveTo(34, 78);
    ctx.bezierCurveTo(35, 65, 38, 53, 41, 40);
    ctx.lineTo(59, 40);
    ctx.bezierCurveTo(62, 53, 65, 65, 66, 78);
    ctx.closePath();
    ctx.moveTo(36, 40);
    ctx.lineTo(33, 30);
    ctx.lineTo(40, 33);
    ctx.lineTo(44, 23);
    ctx.lineTo(48, 33);
    ctx.lineTo(50, 17);
    ctx.lineTo(52, 33);
    ctx.lineTo(56, 23);
    ctx.lineTo(60, 33);
    ctx.lineTo(67, 30);
    ctx.lineTo(64, 40);
    ctx.closePath();
    ctx.arc(50, 14, 3.8, 0, Math.PI * 2);
    finishPieceShape(ctx, profile);
    ctx.beginPath();
    ctx.moveTo(39, 48);
    ctx.lineTo(61, 48);
    ctx.moveTo(37, 62);
    ctx.lineTo(63, 62);
    ctx.lineWidth = profile.lineWidth * 0.82;
    ctx.strokeStyle = profile.detail;
    ctx.stroke();
  }

  function drawKingShape(ctx, profile) {
    ctx.beginPath();
    ctx.moveTo(29, 84);
    ctx.lineTo(71, 84);
    ctx.lineTo(68, 78);
    ctx.lineTo(32, 78);
    ctx.closePath();
    ctx.moveTo(36, 78);
    ctx.bezierCurveTo(36, 63, 39, 53, 43, 41);
    ctx.bezierCurveTo(40, 36, 40, 30, 43, 25);
    ctx.bezierCurveTo(46, 21, 50, 20, 50, 20);
    ctx.bezierCurveTo(50, 20, 54, 21, 57, 25);
    ctx.bezierCurveTo(60, 30, 60, 36, 57, 41);
    ctx.bezierCurveTo(61, 53, 64, 63, 64, 78);
    ctx.closePath();
    finishPieceShape(ctx, profile);
    ctx.beginPath();
    ctx.ellipse(50, 39, 10, 3.6, 0, 0, Math.PI * 2);
    ctx.moveTo(40, 50);
    ctx.lineTo(60, 50);
    ctx.lineWidth = profile.lineWidth * 0.82;
    ctx.strokeStyle = profile.detail;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(50, 10);
    ctx.lineTo(50, 27);
    ctx.moveTo(43.5, 17.5);
    ctx.lineTo(56.5, 17.5);
    ctx.lineWidth = profile.lineWidth * 0.96;
    ctx.strokeStyle = profile.stroke;
    ctx.stroke();
  }

  function renderCanvasPieceShape(ctx, pieceType, profile) {
    switch (pieceType) {
      case "pawn":
        drawPawnShape(ctx, profile);
        break;
      case "rook":
        drawRookShape(ctx, profile);
        break;
      case "knight":
        drawKnightShape(ctx, profile);
        break;
      case "bishop":
        drawBishopShape(ctx, profile);
        break;
      case "queen":
        drawQueenShape(ctx, profile);
        break;
      case "king":
      default:
        drawKingShape(ctx, profile);
        break;
    }
  }

  function renderPiece(ctx, pieceType, color, x, y, scale, style, hovered, dragging) {
    var pieceScale = typeof scale === "number" ? scale : 1;
    var drawSize = 100 * pieceScale;
    var liftAmount = typeof hovered === "number" ? hovered : (hovered ? 4 : 0);
    var profile = pieceCanvasProfile(style, color, drawSize);
    if (dragging) {
      liftAmount = 0;
    }
    if (profile.shadowAlpha > 0) {
      drawPieceShadow(ctx, x + (drawSize / 2), y + (drawSize * (dragging ? 0.82 : 0.86)), drawSize, liftAmount, dragging, profile);
    }
    ctx.save();
    ctx.translate(x, y - liftAmount);
    ctx.scale(pieceScale, pieceScale);
    ctx.lineJoin = profile.lineJoin;
    ctx.lineCap = profile.lineCap;
    renderCanvasPieceShape(ctx, pieceType, profile);
    drawPieceBase(ctx, profile);
    ctx.restore();
  }

  function renderCanvasPiece(ctx, piece, pieceSet, drawX, drawY, drawSize) {
    renderPiece(ctx, piece.kind, piece.color, drawX, drawY, drawSize / 100, pieceSet, 0, false);
  }

  function drawPieceShadow(ctx, centerX, baseY, squareSize, liftAmount, draggingPiece, profile) {
    var normalizedLift = typeof liftAmount === "number" ? Math.max(0, Math.min(1, liftAmount / 4)) : (liftAmount ? 1 : 0);
    var baseAlpha = profile && typeof profile.shadowAlpha === "number" ? profile.shadowAlpha : 0.3;
    var alpha;
    var widthScale;
    var heightScale;
    if (baseAlpha <= 0) {
      return;
    }
    alpha = draggingPiece ? Math.min(0.58, baseAlpha + 0.16) : (baseAlpha + (normalizedLift * 0.12));
    widthScale = draggingPiece ? 0.26 : (0.22 + (normalizedLift * 0.03));
    heightScale = draggingPiece ? 0.12 : (0.10 + (normalizedLift * 0.03));
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, " + alpha.toFixed(3) + ")";
    ctx.beginPath();
    ctx.ellipse(centerX, baseY, squareSize * widthScale, squareSize * heightScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPieceAt(ctx, piece, pieceSet, x, y, squareSize, scale, alpha, liftAmount, draggingPiece) {
    var drawSize = squareSize * 0.88 * scale;
    var offset = typeof liftAmount === "number" ? liftAmount : (liftAmount ? 4 : 0);
    var drawX = x + ((squareSize - drawSize) / 2);
    var drawY = y + ((squareSize - drawSize) / 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    renderPiece(ctx, piece.kind, piece.color, drawX, drawY, drawSize / 100, pieceSet, offset, draggingPiece);
    ctx.restore();
  }

  function drawMoveIndicators(ctx, squareName, moves, squareSize, position) {
    var capture = moves[0] && moves[0].capture;
    ctx.save();
    if (capture) {
      ctx.strokeStyle = themeValue("--legal-ring", "rgba(217, 83, 79, 0.92)");
      ctx.lineWidth = Math.max(3, squareSize * 0.08);
      ctx.beginPath();
      ctx.arc(position.x + (squareSize / 2), position.y + (squareSize / 2), squareSize * 0.26, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = themeValue("--legal-dot", "rgba(70, 172, 97, 0.78)");
      ctx.beginPath();
      ctx.arc(position.x + (squareSize / 2), position.y + (squareSize / 2), squareSize * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBoardAnnotations() {
    var layers = ensureBoardLayers();
    var ctx = layers ? layers.annotationsContext : null;
    var metrics = boardMetrics();
    var index;
    var item;
    var fromPosition;
    var toPosition;
    var fromX;
    var fromY;
    var toX;
    var toY;
    var angle;
    var headLength;
    var lineWidth;
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, metrics.size, metrics.size);
    lineWidth = Math.max(6, metrics.squareSize * 0.18);
    headLength = Math.max(14, metrics.squareSize * 0.34);
    for (index = 0; index < boardAnnotations.length; index += 1) {
      item = boardAnnotations[index];
      if (item.type === "dot") {
        fromPosition = squareToDisplayPosition(item.square);
        if (!fromPosition) {
          continue;
        }
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(fromPosition.x + (metrics.squareSize / 2), fromPosition.y + (metrics.squareSize / 2), metrics.squareSize * 0.16, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      fromPosition = squareToDisplayPosition(item.from);
      toPosition = squareToDisplayPosition(item.to);
      if (!fromPosition || !toPosition) {
        continue;
      }
      fromX = fromPosition.x + (metrics.squareSize / 2);
      fromY = fromPosition.y + (metrics.squareSize / 2);
      toX = toPosition.x + (metrics.squareSize / 2);
      toY = toPosition.y + (metrics.squareSize / 2);
      angle = Math.atan2(toY - fromY, toX - fromX);
      ctx.strokeStyle = item.color;
      ctx.fillStyle = item.color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - (headLength * Math.cos(angle - Math.PI / 7)), toY - (headLength * Math.sin(angle - Math.PI / 7)));
      ctx.lineTo(toX - (headLength * Math.cos(angle + Math.PI / 7)), toY - (headLength * Math.sin(angle + Math.PI / 7)));
      ctx.closePath();
      ctx.fill();
    }
    if (annotationGesture && annotationGesture.fromSquare) {
      item = annotationGesture;
      if (!item.toSquare || item.toSquare === item.fromSquare) {
        fromPosition = squareToDisplayPosition(item.fromSquare);
        if (fromPosition) {
          ctx.fillStyle = item.color;
          ctx.beginPath();
          ctx.arc(fromPosition.x + (metrics.squareSize / 2), fromPosition.y + (metrics.squareSize / 2), metrics.squareSize * 0.16, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        fromPosition = squareToDisplayPosition(item.fromSquare);
        toPosition = squareToDisplayPosition(item.toSquare);
        if (fromPosition && toPosition) {
          fromX = fromPosition.x + (metrics.squareSize / 2);
          fromY = fromPosition.y + (metrics.squareSize / 2);
          toX = toPosition.x + (metrics.squareSize / 2);
          toY = toPosition.y + (metrics.squareSize / 2);
          angle = Math.atan2(toY - fromY, toX - fromX);
          ctx.strokeStyle = item.color;
          ctx.fillStyle = item.color;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(toX, toY);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(toX, toY);
          ctx.lineTo(toX - (headLength * Math.cos(angle - Math.PI / 7)), toY - (headLength * Math.sin(angle - Math.PI / 7)));
          ctx.lineTo(toX - (headLength * Math.cos(angle + Math.PI / 7)), toY - (headLength * Math.sin(angle + Math.PI / 7)));
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    layers.eraserButton.className = boardAnnotations.length > 0 ? "annotation-eraser" : "annotation-eraser hidden";
  }

  function drawDragLayer() {
    var layers = ensureBoardLayers();
    var ctx = layers ? layers.dragContext : null;
    var metrics = boardMetrics();
    var boardRect;
    var originPosition;
    var progress;
    var easedProgress;
    var dragX;
    var dragY;
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, metrics.size, metrics.size);
    if (!dragState || !dragState.piece) {
      if (!dragSnapback || !dragSnapback.piece) {
        return;
      }
      originPosition = squareToDisplayPosition(dragSnapback.fromSquare);
      if (!originPosition) {
        return;
      }
      progress = Math.max(0, Math.min(1, dragSnapback.progress || 0));
      easedProgress = progress === 1
        ? 1
        : (Math.pow(2, -10 * progress) * Math.sin(((progress * 10) - 0.75) * ((2 * Math.PI) / 3))) + 1;
      dragX = dragSnapback.startX + ((dragSnapback.targetX - dragSnapback.startX) * easedProgress);
      dragY = dragSnapback.startY + ((dragSnapback.targetY - dragSnapback.startY) * easedProgress);
      drawPieceAt(ctx, dragSnapback.piece, dragSnapback.pieceSet, dragX, dragY, metrics.squareSize * 1.15, 1, 0.96, 4, true);
      return;
    }
    boardRect = layers.host.getBoundingClientRect();
    drawPieceAt(
      ctx,
      dragState.piece,
      dragState.pieceSet,
      (dragState.clientX - boardRect.left) - (metrics.squareSize * 0.575),
      (dragState.clientY - boardRect.top) - (metrics.squareSize * 0.575),
      metrics.squareSize * 1.15,
      1,
      0.98,
      true,
      true
    );
  }

  function drawTrailAccent(ctx, styleId, x, y, squareSize, pieceColor, alpha, step) {
    var cx = x + (squareSize / 2);
    var cy = y + (squareSize / 2);
    ctx.save();
    if (styleId === "flame") {
      ctx.fillStyle = "rgba(255, 173, 79, " + alpha.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(cx - (step * 1.2), cy + 6 - (step * 4), Math.max(2, squareSize * 0.08), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 82, 60, " + Math.max(0.06, alpha - 0.08).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(cx + (step * 0.9), cy - (step * 3), Math.max(1.5, squareSize * 0.06), 0, Math.PI * 2);
      ctx.fill();
    } else if (styleId === "ice") {
      ctx.fillStyle = "rgba(208, 241, 255, " + alpha.toFixed(3) + ")";
      ctx.beginPath();
      ctx.moveTo(cx, cy - (squareSize * 0.11));
      ctx.lineTo(cx + (squareSize * 0.1), cy + (squareSize * 0.04));
      ctx.lineTo(cx - (squareSize * 0.03), cy + (squareSize * 0.12));
      ctx.closePath();
      ctx.fill();
    } else if (styleId === "gold") {
      ctx.fillStyle = "rgba(255, 226, 102, " + alpha.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1.6, squareSize * 0.05), 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy);
      ctx.lineTo(cx + 5, cy);
      ctx.moveTo(cx, cy - 5);
      ctx.lineTo(cx, cy + 5);
      ctx.strokeStyle = "rgba(255, 246, 190, " + Math.max(0.05, alpha - 0.1).toFixed(3) + ")";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else if (styleId === "royal") {
      ctx.fillStyle = "rgba(171, 116, 255, " + alpha.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2.4, squareSize * 0.09), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(234, 194, 255, " + Math.max(0.04, alpha - 0.12).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(cx + (step * 1.4), cy - (step * 1.1), Math.max(1.3, squareSize * 0.04), 0, Math.PI * 2);
      ctx.fill();
    } else if (styleId === "shadow") {
      ctx.fillStyle = "rgba(8, 8, 12, " + alpha.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(3, squareSize * 0.12), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(44, 44, 56, " + Math.max(0.04, alpha - 0.14).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(cx + (step * 1.1), cy - (step * 1.4), Math.max(2, squareSize * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMoveTrails(ctx, squareSize) {
    var now = performance.now();
    var index;
    var item;
    var fromPosition;
    var toPosition;
    var progress;
    var step;
    var trailProgress;
    var x;
    var y;
    var styleId = effectiveTrailStyle();
    var pieceAlpha;
    for (index = 0; index < moveTrails.length; index += 1) {
      item = moveTrails[index];
      fromPosition = squareToDisplayPosition(item.from);
      toPosition = squareToDisplayPosition(item.to);
      if (!fromPosition || !toPosition) {
        continue;
      }
      progress = Math.min(1, (now - item.startedAt) / item.duration);
      for (step = 0; step < 5; step += 1) {
        trailProgress = (step + 1) / 6;
        x = fromPosition.x + ((toPosition.x - fromPosition.x) * trailProgress);
        y = fromPosition.y + ((toPosition.y - fromPosition.y) * trailProgress);
        pieceAlpha = Math.max(0.05, (0.42 - (trailProgress * 0.3)) * (1 - progress));
        drawPieceAt(
          ctx,
          item.piece,
          item.pieceSet,
          x,
          y,
          squareSize,
          1 - (trailProgress * 0.18),
          pieceAlpha,
          false,
          false
        );
        if (styleId !== "default") {
          drawTrailAccent(ctx, styleId, x, y, squareSize, item.piece.color, Math.max(0.06, pieceAlpha), step);
        }
      }
    }
  }

  function renderBoard() {
    var layers = ensureBoardLayers();
    var ctx;
    var metrics;
    var targetMap;
    var order;
    var view;
    var checkedKingSquare;
    var moveMap;
    var rowIndex;
    var colIndex;
    var row;
    var col;
    var piece;
    var squareName;
    var targets;
    var position;
    var squareSize;
    var isDark;
    var pieceSet;
    var ghostAlpha;
    var liftAmount;
    if (!layers) {
      return;
    }
    drawBoardBorder();
    ctx = layers.boardContext;
    metrics = boardMetrics();
    targetMap = buildTargetMap();
    order = squareOrder();
    view = currentDisplay();
    checkedKingSquare = findCheckedKingSquare(view);
    moveMap = buildMoveMap();
    squareSize = metrics.squareSize;
    pieceSet = state ? state.pieceSet : "classic";

    updateBoardLabels();
    ctx.clearRect(0, 0, metrics.size, metrics.size);

    for (rowIndex = 0; rowIndex < 8; rowIndex += 1) {
      row = order.rows[rowIndex];
      for (colIndex = 0; colIndex < 8; colIndex += 1) {
        col = order.cols[colIndex];
        squareName = String.fromCharCode(97 + col) + String(8 - row);
        position = squareToDisplayPosition(squareName);
        isDark = ((row + col) % 2) === 1;
        ctx.fillStyle = isDark ? themeValue("--board-dark", "#b58863") : themeValue("--board-light", "#f0d9b5");
        ctx.fillRect(position.x, position.y, squareSize, squareSize);
        if (view && view.lastMove && (view.lastMove.from === squareName || view.lastMove.to === squareName)) {
          ctx.fillStyle = isDark ? themeValue("--last-dark", "#927237") : themeValue("--last-light", "#dbc67e");
          ctx.fillRect(position.x, position.y, squareSize, squareSize);
        }
        if (selectedSquare === squareName && !isReplayMode()) {
          ctx.strokeStyle = themeValue("--selection-ring", "rgba(88, 146, 229, 0.92)");
          ctx.lineWidth = Math.max(3, squareSize * 0.06);
          ctx.strokeRect(position.x + 2, position.y + 2, squareSize - 4, squareSize - 4);
        }
        if (checkedKingSquare === squareName) {
          ctx.fillStyle = "rgba(217, 83, 79, " + checkedKingPulseAlpha().toFixed(3) + ")";
          ctx.fillRect(position.x, position.y, squareSize, squareSize);
          ctx.strokeStyle = "rgba(217, 83, 79, 0.86)";
          ctx.lineWidth = Math.max(3, squareSize * 0.06);
          ctx.strokeRect(position.x + 2, position.y + 2, squareSize - 4, squareSize - 4);
        }
        targets = targetMap[squareName] || [];
        if (targets.length > 0) {
          drawMoveIndicators(ctx, squareName, targets, squareSize, position);
        }
      }
    }

    drawQueuedPremove(ctx, squareSize);
    drawMoveTrails(ctx, squareSize);

    if (view && view.board) {
      for (rowIndex = 0; rowIndex < 8; rowIndex += 1) {
        row = order.rows[rowIndex];
        for (colIndex = 0; colIndex < 8; colIndex += 1) {
          col = order.cols[colIndex];
          piece = view.board[row][col];
          if (!piece) {
            continue;
          }
          squareName = String.fromCharCode(97 + col) + String(8 - row);
          if ((dragState && dragState.fromSquare === squareName) || (dragSnapback && dragSnapback.fromSquare === squareName)) {
            position = squareToDisplayPosition(squareName);
            ghostAlpha = 0.3;
            drawPieceAt(ctx, piece, pieceSet, position.x, position.y, squareSize, 1, ghostAlpha, false, false);
            continue;
          }
          position = squareToDisplayPosition(squareName);
          liftAmount = hoverProgressForSquare(squareName) * 4;
          drawPieceAt(ctx, piece, pieceSet, position.x, position.y, squareSize, 1, 1, liftAmount, false);
        }
      }
    }

    drawCursedGlows(ctx, view, squareSize);
    drawBoardAnnotations();
    drawDragLayer();
  }

  function renderHistory() {
    var view = currentDisplay();
    var analysis = isReplayMode() ? replay.analysis : (state ? state.analysis : null);
    var rows = [];
    var index;
    var whiteMove;
    var blackMove;
    var historyElement = byId("move-history");
    if (!view.moveHistory || view.moveHistory.length === 0) {
      historyElement.innerHTML = '<div class="empty-text">No moves yet.</div>';
      return;
    }
    for (index = 0; index < view.moveHistory.length; index += 2) {
      whiteMove = view.moveHistory[index];
      blackMove = index + 1 < view.moveHistory.length ? view.moveHistory[index + 1] : "";
      rows.push(
        '<div class="move-row">' +
          '<div class="move-number">' + (Math.floor(index / 2) + 1) + "</div>" +
          renderMoveCell(whiteMove, index, analysis) +
          renderMoveCell(blackMove, index + 1, analysis) +
        "</div>"
      );
    }
    historyElement.innerHTML = '<div class="move-record">' + rows.join("") + "</div>";
  }

  function moveBadgeMarkup(classification) {
    if (!classification) {
      return '<span class="move-badge"></span>';
    }
    return '<span class="move-badge ' + classification.kind + '">' + classification.icon + "</span>";
  }

  function classifyMoveEntry(move, analysis) {
    var moveName = String(move || "");
    var index;
    if (!moveName || !analysis) {
      return null;
    }
    if (analysis.blunders) {
      for (index = 0; index < analysis.blunders.length; index += 1) {
        if (analysis.blunders[index] && analysis.blunders[index].move === moveName) {
          return { kind: "blunder", icon: "&#128128;" };
        }
      }
    }
    if (analysis.missedTactics) {
      for (index = 0; index < analysis.missedTactics.length; index += 1) {
        if (analysis.missedTactics[index] && analysis.missedTactics[index].move === moveName) {
          return { kind: "inaccuracy", icon: "&#x1F7E0;" };
        }
      }
    }
    if (analysis.bestMoves) {
      for (index = 0; index < analysis.bestMoves.length; index += 1) {
        if (analysis.bestMoves[index] && analysis.bestMoves[index].move === moveName) {
          return { kind: "best", icon: "&#x1F7E2;" };
        }
      }
    }
    return { kind: "good", icon: "&#x1F7E1;" };
  }

  function renderMoveCell(move, moveIndex, analysis) {
    var active;
    var classification;
    var canJump;
    if (!move) {
      return '<div class="move-cell"><button type="button" class="move-cell-button is-empty" disabled="disabled"></button></div>';
    }
    active = isReplayMode() ? replayIndex === (moveIndex + 1) : (currentDisplay().moveHistory.length - 1) === moveIndex;
    canJump = isReplayMode() && replay && replay.snapshots && replay.snapshots.length > (moveIndex + 1);
    classification = classifyMoveEntry(move, analysis);
    return (
      '<div class="move-cell">' +
        '<button type="button" class="move-cell-button' + (active ? " is-active" : "") + '"' +
          (canJump ? ' data-replay-index="' + (moveIndex + 1) + '"' : "") + ">" +
          '<span class="move-main">' + escapeHtml(move) + "</span>" +
          moveBadgeMarkup(classification) +
        "</button>" +
      "</div>"
    );
  }

  function bestInsightChoice(group) {
    return group && group.choices && group.choices.length ? group.choices[0] : null;
  }

  function formatInsightChoice(choice) {
    var label = choice && (choice.san || choice.uci) ? (choice.san || choice.uci) : "No line";
    var probability = choice && typeof choice.probability === "number" ? (choice.probability * 100).toFixed(1) + "%" : "0.0%";
    return { label: label, probability: probability };
  }

  function estimatedEvalPercent() {
    var whiteChoice;
    var blackChoice;
    if (state && state.lastAiSummary && typeof state.lastAiSummary.estimated_win_probability === "number") {
      return Math.max(0, Math.min(100, state.lastAiSummary.estimated_win_probability * 100));
    }
    if (state && state.positionInsights) {
      whiteChoice = bestInsightChoice(state.positionInsights.white);
      blackChoice = bestInsightChoice(state.positionInsights.black);
      if (whiteChoice || blackChoice) {
        return Math.max(
          0,
          Math.min(
            100,
            50 +
              (((whiteChoice ? whiteChoice.probability : 0.5) - (blackChoice ? blackChoice.probability : 0.5)) * 40)
          )
        );
      }
    }
    return 50;
  }

  function renderInsights() {
    var whiteChoice = state && state.positionInsights ? bestInsightChoice(state.positionInsights.white) : null;
    var blackChoice = state && state.positionInsights ? bestInsightChoice(state.positionInsights.black) : null;
    var whiteEntry = formatInsightChoice(whiteChoice);
    var blackEntry = formatInsightChoice(blackChoice);
    var evalPercent = estimatedEvalPercent();
    var noteLines = [];
    var summary;
    if (isReplayMode()) {
      byId("ai-insight").innerHTML =
        '<div class="ai-notes-grid">' +
          '<div class="ai-inline-note"><strong>Replay Mode.</strong> Step through moves in Game Record to inspect the saved line.</div>' +
        "</div>";
      return;
    } else if (state.lastAiSummary) {
      summary = state.lastAiSummary;
      noteLines.push(capitalize(summary.mode) + " Bot played " + summary.move + ".");
      noteLines.push("Estimated win chance " + (summary.estimated_win_probability * 100).toFixed(1) + "%.");
      noteLines.push("Search depth " + summary.search_depth + ".");
      if (summary.personality && summary.mode === "illegal") {
        noteLines.push("Personality " + capitalize(summary.personality) + ".");
      }
    }
    if (lastHint) {
      noteLines.push("Last hint " + lastHint.from + " to " + lastHint.to + " (" + (lastHint.probability * 100).toFixed(1) + "%).");
    }
    byId("ai-insight").innerHTML =
      '<div class="ai-notes-grid">' +
        '<div class="ai-note-card">' +
          '<div class="ai-note-label">Best Move For White</div>' +
          '<div class="ai-note-move">' + escapeHtml(whiteEntry.label) + "</div>" +
          '<div class="ai-note-sub">Confidence ' + escapeHtml(whiteEntry.probability) + "</div>" +
        "</div>" +
        '<div class="ai-note-card">' +
          '<div class="ai-note-label">Best Move For Black</div>' +
          '<div class="ai-note-move">' + escapeHtml(blackEntry.label) + "</div>" +
          '<div class="ai-note-sub">Confidence ' + escapeHtml(blackEntry.probability) + "</div>" +
        "</div>" +
        '<div class="ai-note-card eval-shell">' +
          '<div class="ai-note-label">Evaluation</div>' +
          '<div class="eval-label-row"><span>Black</span><span>White ' + evalPercent.toFixed(0) + "%</span></div>" +
          '<div class="eval-bar"><div class="eval-fill" style="width:' + evalPercent.toFixed(2) + '%;"></div><div class="eval-marker"></div></div>' +
        "</div>" +
        '<div class="ai-inline-note">' + escapeHtml(noteLines.length ? noteLines.join(" ") : "Top move probabilities will appear here after the bot moves.") + "</div>" +
      "</div>";
  }

  function renderStatus() {
    var statusText = "Choose your settings and press Play.";
    var thoughtText = "The board opens in standard chess setup.";
    var statusTone = "status-idle";
    if (isReplayMode()) {
      statusText = "Replay mode";
      thoughtText = replay.title + "   " + replay.result + (replay.outcomeReason ? "   " + replay.outcomeReason : "");
    } else if (state && state.gameActive) {
      if (state.result !== "*") {
        statusText = state.resultText;
        thoughtText = "Game saved in algebraic notation. Reason: " + state.outcomeReason + ".";
        statusTone = "status-danger";
      } else if (movePending) {
        statusText = "Submitting your move...";
        thoughtText = "Waiting for the server to confirm the board update.";
        statusTone = "status-thinking";
      } else if (aiPending || state.aiToMove) {
        statusText = capitalize(state.botMode) + " Bot is calculating for " + capitalize(state.botColor) + "...";
        thoughtText = state.lastAiSummary
          ? capitalize(state.botMode) + " Bot last played " + state.lastAiSummary.move + "."
          : "The bot is evaluating move probabilities from the current position.";
        statusTone = "status-thinking";
      } else if (state.checkColor) {
        statusText = titleCaseWords(state.checkColor) + " is in check.";
        thoughtText = "Defend the king or finish the tactic before the bot replies.";
        statusTone = "status-danger";
      } else {
        statusText = "Your move as " + capitalize(state.playerColor) + ".";
        thoughtText =
          state.botMode === "legal"
            ? "Legal Bot only plays moves that obey standard chess rules."
            : "Illegal Bot may bend movement rules without using king-capture glitches.";
        statusTone = "status-good";
      }
    }
    byId("status-panel").className = "panel-section panel-section-status status-bar " + statusTone;
    byId("status-text").innerText = statusText;
    byId("thought-text").innerText = thoughtText;
  }

  function renderBanner() {
    var banner = !isReplayMode() ? state.banner : null;
    var element = byId("banner");
    if (!banner) {
      element.className = "banner hidden";
      element.innerText = "";
      return;
    }
    element.className = "banner banner-" + banner.kind;
    element.innerText = banner.text;
  }

  function currentResultKey() {
    if (!state || state.result === "*") {
      return "";
    }
    return [state.result, state.outcomeReason || "", state.moveHistory ? state.moveHistory.length : 0].join("|");
  }

  function resultTitle() {
    if (!state || state.result === "*") {
      return "Game Over";
    }
    if (state.outcomeReason === "checkmate") {
      return "Checkmate";
    }
    if (state.outcomeReason === "stalemate") {
      return "Stalemate";
    }
    if (state.outcomeReason === "resignation") {
      return "Resignation";
    }
    if (state.outcomeReason === "time forfeit") {
      return "Time Forfeit";
    }
    if (state.result === "1/2-1/2") {
      return "Draw";
    }
    return "Game Over";
  }

  function renderResultModal() {
    var modal = byId("result-modal");
    var key = currentResultKey();
    var subtitle;
    var summary;
    if (!state || isReplayMode() || state.result === "*" || dismissedResultKey === key) {
      modal.className = "modal hidden";
      return;
    }

    subtitle = state.resultText;
    if (state.outcomeReason) {
      subtitle += " " + titleCaseWords(state.outcomeReason) + ".";
    }
    summary = "Moves played: " + (state.moveHistory ? state.moveHistory.length : 0) + ". ";
    if (state.winner) {
      summary += titleCaseWords(state.winner) + " wins. ";
    }
    summary += "Use Play Again to restart with the current settings.";

    byId("result-title").innerText = resultTitle();
    byId("result-subtitle").innerText = subtitle;
    byId("result-summary").innerText = summary;
    modal.className = "modal";
  }

  function hideResultModal() {
    dismissedResultKey = currentResultKey();
    byId("result-modal").className = "modal hidden";
  }

  function renderRecordSummary() {
    var localSaves = getLocalSavedGames();
    byId("record-summary").innerText =
      "Local saves: " +
      localSaves.length +
      "   Server records: " +
      state.savedGames +
      "   Learned legal games: " +
      state.learnedLegalGames +
      "   Learned illegal games: " +
      state.learnedIllegalGames +
      "   Rating: " +
      (state.stats ? state.stats.rating : 1200);
  }

  function renderCaptured() {
    var view = currentDisplay();
    var top = byId("captured-top");
    var bottom = byId("captured-bottom");
    var whiteCapturedValue;
    var blackCapturedValue;
    var advantage;
    var topSide;
    var bottomSide;
    var topScore;
    var bottomScore;
    if (!view || !view.captured) {
      top.innerHTML = "";
      bottom.innerHTML = "";
      top.className = "captured-strip empty";
      bottom.className = "captured-strip empty";
      return;
    }
    var byWhite = [];
    var byBlack = [];
    var index;
    for (index = 0; index < view.captured.byWhite.length; index += 1) {
      byWhite.push(capturedPieceMarkup(view.captured.byWhite[index]));
    }
    for (index = 0; index < view.captured.byBlack.length; index += 1) {
      byBlack.push(capturedPieceMarkup(view.captured.byBlack[index]));
    }
    whiteCapturedValue = materialValueForPieces(view.captured.byWhite);
    blackCapturedValue = materialValueForPieces(view.captured.byBlack);
    advantage = whiteCapturedValue - blackCapturedValue;
    // Dead pieces display next to the side that lost them. If the board is
    // flipped (user is playing Black), top/bottom swap accordingly.
    var topGlyphs = boardFlipped() ? byBlack : byWhite;
    var bottomGlyphs = boardFlipped() ? byWhite : byBlack;
    topSide = boardFlipped() ? "white" : "black";
    bottomSide = boardFlipped() ? "black" : "white";
    topScore = topSide === "white" ? Math.max(0, advantage) : Math.max(0, -advantage);
    bottomScore = bottomSide === "white" ? Math.max(0, advantage) : Math.max(0, -advantage);
    renderCapturedStrip(top, topGlyphs, topScore);
    renderCapturedStrip(bottom, bottomGlyphs, bottomScore);
  }

  function activeClockPayload() {
    var elapsedSeconds;
    var activeColor;
    var clock;
    if (!state || !state.clock) {
      return null;
    }
    clock = {
      white: state.clock.white,
      black: state.clock.black,
      activeColor: state.clock.activeColor || ""
    };
    activeColor = clock.activeColor;
    if (state.gameActive && state.result === "*" && activeColor && clockAnchorMs > 0) {
      elapsedSeconds = Math.max(0, (new Date().getTime() - clockAnchorMs) / 1000);
      clock[activeColor] = Math.max(0, clock[activeColor] - elapsedSeconds);
    }
    clock.whiteText = formatClockSeconds(clock.white);
    clock.blackText = formatClockSeconds(clock.black);
    return clock;
  }

  function restartClockTimer() {
    // The UI used to tick the clock once per second, which caused visible
    // re-renders every tick. State is now refreshed only when the user
    // starts a game or makes a move, so this is intentionally a no-op.
    if (clockTimer) {
      window.clearInterval(clockTimer);
      clockTimer = null;
    }
  }

  function renderClock() {
    var top = byId("top-player-clock");
    var bottom = byId("bottom-player-clock");
    var clock = activeClockPayload();
    var topColor = topBoardColor();
    var bottomColor = bottomBoardColor();
    var topSeconds;
    var bottomSeconds;
    if (!clock) {
      top.innerText = "unlimited";
      bottom.innerText = "unlimited";
      top.className = "player-clock";
      bottom.className = "player-clock";
      return;
    }
    topSeconds = topColor === "white" ? clock.white : clock.black;
    bottomSeconds = bottomColor === "white" ? clock.white : clock.black;
    top.innerText = topColor === "white" ? clock.whiteText : clock.blackText;
    bottom.innerText = bottomColor === "white" ? clock.whiteText : clock.blackText;
    top.className =
      "player-clock" +
      (clock.activeColor === topColor ? " active" : "") +
      (topSeconds <= 30 ? " low-time" : "");
    bottom.className =
      "player-clock" +
      (clock.activeColor === bottomColor ? " active" : "") +
      (bottomSeconds <= 30 ? " low-time" : "");
  }

  function buildLocalSaveCardHtml(item) {
    var meta = [];
    var replayMoves =
      item && item.replay && item.replay.snapshots && item.replay.snapshots.length
        ? item.replay.snapshots[item.replay.snapshots.length - 1].moveHistory
        : null;
    var fallbackMoveCount = replayMoves && replayMoves.length ? replayMoves.length : null;
    if (item.savedAtLabel || item.savedAt) {
      meta.push(escapeHtml(item.savedAtLabel || savedAtLabel(item.savedAt)));
    }
    if (typeof item.moveCount === "number" || fallbackMoveCount !== null) {
      meta.push(escapeHtml((typeof item.moveCount === "number" ? item.moveCount : fallbackMoveCount) + " moves"));
    }
    if (item.players) {
      meta.push(escapeHtml(item.players));
    }
    return (
      '<div class="saved-game-entry">' +
        '<div class="saved-game-head">' +
          '<div>' +
            '<div class="saved-game-title">' + escapeHtml(item.title || "Saved Game") + "</div>" +
            '<div class="saved-game-meta">' +
              escapeHtml(item.result || "In Progress") +
              (meta.length ? "<br>" + meta.join(" • ") : "") +
            "</div>" +
          "</div>" +
          '<div class="saved-source-label">Local</div>' +
        "</div>" +
        '<div class="saved-game-actions">' +
          '<button type="button" class="tiny-button" data-local-save="' + escapeHtml(item.id) + '">Load</button>' +
          '<button type="button" class="tiny-button delete" data-local-delete="' + escapeHtml(item.id) + '">Delete</button>' +
        "</div>" +
      "</div>"
    );
  }

  function renderSavedGames() {
    var html = [];
    var modalHtml = [];
    var localSaves = getLocalSavedGames();
    var modalList = byId("saved-games-modal-list");
    var index;
    var item;
    if (localSaves.length > 0) {
      html.push('<div class="saved-library-title">Local Saves</div>');
      html.push('<div class="saved-games-list">');
      modalHtml.push('<div class="saved-games-list">');
      for (index = 0; index < localSaves.length; index += 1) {
        item = localSaves[index];
        html.push(buildLocalSaveCardHtml(item));
        modalHtml.push(buildLocalSaveCardHtml(item));
      }
      html.push("</div>");
      modalHtml.push("</div>");
    }
    if (state && state.savedGameList && state.savedGameList.length > 0) {
      if (html.length > 0) {
        html.push('<div class="saved-library-title">Bundled Records</div>');
      }
      html.push('<div class="saved-games-list">');
      for (index = 0; index < state.savedGameList.length; index += 1) {
        item = state.savedGameList[index];
        html.push(
          '<div class="saved-game-entry">' +
            '<div class="saved-game-head">' +
              '<div>' +
                '<div class="saved-game-title">' + escapeHtml(item.title) + "</div>" +
                '<div class="saved-game-meta">' + escapeHtml(item.result) + "</div>" +
              "</div>" +
              '<div class="saved-source-label">Record</div>' +
            "</div>" +
            '<div class="saved-game-actions">' +
              '<button type="button" class="tiny-button" data-file="' + escapeHtml(item.file) + '">Load</button>' +
            "</div>" +
          "</div>"
        );
      }
      html.push("</div>");
    }
    if (html.length === 0) {
      byId("saved-games").innerHTML = '<div class="empty-text">No local saves or bundled records yet.</div>';
    } else {
      byId("saved-games").innerHTML = html.join("");
    }
    if (modalList) {
      modalList.innerHTML = modalHtml.length
        ? modalHtml.join("")
        : '<div class="empty-text">No local saves yet. Use Save Game to store one here.</div>';
    }
  }

  function savedAtLabel(dateValue) {
    var date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return "";
    }
    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0") +
      " " +
      String(date.getHours()).padStart(2, "0") +
      ":" +
      String(date.getMinutes()).padStart(2, "0")
    );
  }

  function buildLocalReplayRecord(title) {
    var liveSnapshot;
    var savedAt = new Date().toISOString();
    var view = currentDisplay();
    var players = displayNameForColor("white") + " vs " + displayNameForColor("black");
    var moveCount = view && view.moveHistory ? view.moveHistory.length : 0;
    if (isReplayMode() && replay) {
      return {
        id: "save-" + new Date().getTime(),
        title: title,
        result: replay.result || "Replay",
        savedAt: savedAt,
        savedAtLabel: savedAtLabel(savedAt),
        moveCount: moveCount,
        players: players,
        replay: cloneJson(replay)
      };
    }
    if (!state) {
      return null;
    }
    liveSnapshot = cloneJson(currentDisplay());
    return {
      id: "save-" + new Date().getTime(),
      title: title,
      result: state.resultText || (state.gameActive ? "In Progress" : "Saved Position"),
      savedAt: savedAt,
      savedAtLabel: savedAtLabel(savedAt),
      moveCount: moveCount,
      players: players,
      replay: {
        title: title,
        result: state.resultText || (state.gameActive ? "In Progress" : "Saved Position"),
        outcomeReason: state.outcomeReason || "",
        pgn: state.pgn || "",
        analysis: cloneJson(state.analysis || null),
        snapshots: liveSnapshot ? [liveSnapshot] : []
      }
    };
  }

  function saveGameToLocalStorage() {
    var fallbackTitle;
    var title;
    var saves;
    var record;
    if (!state && !isReplayMode()) {
      showToast("Nothing to save yet.", "warning");
      return;
    }
    fallbackTitle = "Saved Game " + savedAtLabel(new Date().toISOString());
    title = window.prompt("Name this saved game:", fallbackTitle);
    if (title === null) {
      return;
    }
    title = title.replace(/^\s+|\s+$/g, "") || fallbackTitle;
    record = buildLocalReplayRecord(title);
    if (!record) {
      showToast("The current view could not be saved.", "danger");
      return;
    }
    saves = getLocalSavedGames();
    saves.unshift(record);
    setLocalSavedGames(saves.slice(0, 24));
    renderSavedGames();
    openSavedGamesModal();
    showToast("Saved locally.", "success");
  }

  function loadLocalSavedGame(saveId) {
    var saves = getLocalSavedGames();
    var index;
    for (index = 0; index < saves.length; index += 1) {
      if (saves[index].id === saveId && saves[index].replay) {
        replay = cloneJson(saves[index].replay);
        replayIndex = replay && replay.snapshots && replay.snapshots.length ? Math.max(0, replay.snapshots.length - 1) : 0;
        selectedSquare = null;
        movePending = false;
        analysisPending = false;
        pendingBoardAnimation = null;
        lastHint = null;
        renderAll();
        restartClockTimer();
        closeSavedGamesModal();
        showToast("Loaded local save into replay view.", "success");
        return;
      }
    }
    showToast("That local save is no longer available.", "warning");
  }

  function deleteLocalSavedGame(saveId) {
    var saves = getLocalSavedGames();
    var filtered = [];
    var index;
    for (index = 0; index < saves.length; index += 1) {
      if (saves[index].id !== saveId) {
        filtered.push(saves[index]);
      }
    }
    setLocalSavedGames(filtered);
    renderSavedGames();
    showToast("Local save deleted.", "success");
  }

  function openSavedGamesSection() {
    var section = byId("saved-games-card");
    var toggle = section ? section.querySelector(".section-toggle") : null;
    if (!section) {
      return;
    }
    section.classList.remove("collapsed");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "true");
    }
  }

  function closeSavedGamesModal() {
    byId("saved-games-modal").className = "modal hidden";
  }

  function openSavedGamesModal() {
    renderSavedGames();
    byId("saved-games-modal").className = "modal";
  }

  function showToast(message, tone) {
    var stack = byId("toast-stack");
    var toast;
    var removeId;
    if (!stack) {
      return;
    }
    toastNonce += 1;
    toast = document.createElement("div");
    toast.className = "toast toast-" + (tone || "success");
    toast.setAttribute("data-toast-id", String(toastNonce));
    toast.innerText = message;
    stack.appendChild(toast);
    removeId = toast.getAttribute("data-toast-id");
    window.setTimeout(function () {
      var node = stack.querySelector('[data-toast-id="' + removeId + '"]');
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }, 2000);
  }

  function closeConfirmDialog() {
    pendingConfirmAction = null;
    byId("confirm-modal").className = "modal hidden";
  }

  function openConfirmDialog(title, message, buttonLabel, onConfirm) {
    pendingConfirmAction = onConfirm;
    byId("confirm-title").innerText = title;
    byId("confirm-message").innerText = message;
    byId("confirm-submit").innerText = buttonLabel || "Confirm";
    byId("confirm-modal").className = "modal";
  }

  function renderAnalysis() {
    var analysis = isReplayMode() ? replay.analysis : state.analysis;
    var lines = [];
    var index;
    if (!isReplayMode() && analysisPending) {
      byId("analysis-panel").innerText = "Loading post-game analysis...";
      return;
    }
    if (!analysis) {
      byId("analysis-panel").innerText = "Post-game analysis appears here when a game finishes.";
      return;
    }
    lines.push("Best moves:");
    if (analysis.bestMoves && analysis.bestMoves.length > 0) {
      for (index = 0; index < analysis.bestMoves.length; index += 1) {
        lines.push("  " + analysis.bestMoves[index].move);
      }
    } else {
      lines.push("  None recorded.");
    }
    lines.push("");
    lines.push("Blunders:");
    if (analysis.blunders && analysis.blunders.length > 0) {
      for (index = 0; index < analysis.blunders.length; index += 1) {
        lines.push("  " + analysis.blunders[index].move);
      }
    } else {
      lines.push("  None recorded.");
    }
    lines.push("");
    lines.push("Missed tactics:");
    if (analysis.missedTactics && analysis.missedTactics.length > 0) {
      for (index = 0; index < analysis.missedTactics.length; index += 1) {
        lines.push("  " + analysis.missedTactics[index].move);
      }
    } else {
      lines.push("  None recorded.");
    }
    byId("analysis-panel").innerText = lines.join("\r\n");
  }

  // Theme entry point. To add a new theme later:
  // 1. define a matching `body.theme-[name]` block in CSS,
  // 2. add the name to THEME_NAMES / swatch markup,
  // 3. extend `seedBackgroundScene()` + `drawBackgroundFrame()`.
  function applyTheme(themeName) {
    var theme = normalizeThemeName(themeName || currentThemeSelection());
    var pieceSet = currentPieceSetSelection();
    var muteButton = byId("mute-button");
    var animationButton = byId("animation-button");
    var captureButton = byId("capture-animation-button");
    if (byId("theme")) {
      byId("theme").value = theme;
    }
    setStoredThemePreference(theme);
    setStoredPieceStylePreference(pieceSet);
    setBodyThemeClass(theme, pieceSet);
    renderThemeSwatches(theme);
    renderTrailSwatches();
    renderBorderSwatches();
    updateBackgroundAnimationButton();
    startBackgroundAnimation(theme);
    if (muteButton) {
      muteButton.innerText = state && state.muted ? "🔇 Muted" : "🔊 Sound";
      muteButton.className = state && state.muted ? "small-button secondary-button active" : "small-button secondary-button";
    }
    if (animationButton) {
      animationButton.innerText = state && state.animatePieces ? "🎬 Animations On" : "🎬 Animations Off";
      animationButton.className = state && state.animatePieces ? "small-button secondary-button active" : "small-button secondary-button";
    }
    if (captureButton) {
      captureButton.innerText = state && state.cinematicCaptures ? "⚡ Action Captures On" : "⚡ Action Captures Off";
      captureButton.disabled = !!(state && !state.animatePieces);
      captureButton.className =
        state && state.animatePieces
          ? (state.cinematicCaptures ? "small-button secondary-button active" : "small-button secondary-button")
          : "small-button secondary-button is-disabled";
    }
  }

  function renderReplayControls() {
    byId("replay-toolbar").className = isReplayMode() ? "toolbar" : "toolbar hidden";
    byId("live-toolbar").className = isReplayMode() ? "toolbar hidden" : "toolbar";
    byId("resume-button").disabled = !state || !state.resumeAvailable || state.gameActive;
  }

  function renderAll() {
    applyTheme();
    renderTrailSwatches();
    renderBorderSwatches();
    renderTopBar();
    renderPlayerPanels();
    renderReplayControls();
    renderBanner();
    requestBoardRedraw();
    renderHistory();
    renderInsights();
    renderStatus();
    renderRecordSummary();
    renderCaptured();
    renderClock();
    renderSavedGames();
    renderAnalysis();
    renderDailyWidget();
    renderResultModal();
    syncSetupSectionVisibility();
    syncPanelBackdrop();
  }

  function syncControlsFromState() {
    var draft;
    if (!state || setupDirty) {
      return;
    }
    draft = currentSetupDraftFromState();
    applySetupDraft(draft);
  }

  function applyStatePayload(payload, clearSetupDraft) {
    var previousState = state;
    if (payload) {
      payload.theme = normalizeThemeName(payload.theme || currentThemeSelection());
      payload.pieceSet = normalizePieceStyleName(payload.pieceSet || currentPieceSetSelection());
    }
    pendingBoardAnimation = buildBoardAnimation(previousState, payload);
    state = payload;
    dragSnapback = null;
    touchAnnotationMode = null;
    hideTouchAnnotationPicker();
    clockAnchorMs = new Date().getTime();
    if (state) {
      writeFrontendData({
        muted: !!state.muted,
        animatePieces: !!state.animatePieces,
        cinematicCaptures: !!state.cinematicCaptures
      });
    }
    if (!state || state.result === "*") {
      analysisPending = false;
    }
    if (clearSetupDraft) {
      setupDirty = false;
    }
    syncControlsFromState();
    renderAll();
    if (pendingBoardAnimation) {
      addMoveTrail(pendingBoardAnimation);
      playBoardAnimation(pendingBoardAnimation);
      pendingBoardAnimation = null;
    }
    restartClockTimer();
    if (!isReplayMode() && state.aiToMove && !aiPending) {
      window.setTimeout(triggerAiMove, 80);
    }
    if (!isReplayMode() && state.result !== "*" && !state.analysis && !analysisPending) {
      window.setTimeout(requestAnalysis, 40);
    }
  }

  function refreshState(callback) {
    request("GET", "/api/state", null, function (error, payload) {
      if (error) {
        byId("status-text").innerText = error;
        byId("thought-text").innerText = "Check that the local Chess Popup server is running.";
        return;
      }
      applyStatePayload(payload, false);
      if (callback) {
        callback();
      }
    });
  }

  function currentStartPayload() {
    var draft = currentSetupDraft();
    var clock = resolvedClockSettings(draft.timeMode, draft.customMinutes, draft.customIncrement);
    return {
      playerColor: draft.playerColor,
      botMode: draft.botMode,
      difficulty: draft.difficulty === "impossible" ? "hard" : draft.difficulty,
      illegalPersonality: draft.illegalPersonality,
      theme: draft.theme,
      pieceSet: draft.pieceSet,
      autoFlip: draft.autoFlip,
      muted: state ? state.muted : false,
      animatePieces: draft.animatePieces,
      cinematicCaptures: draft.cinematicCaptures,
      timeMode: clock.timeMode,
      customMinutes: clock.customMinutes,
      customIncrement: clock.customIncrement
    };
  }

  function startGame() {
    var draft = currentSetupDraft();
    selectedSquare = null;
    replay = null;
    replayIndex = 0;
    lastHint = null;
    aiPending = false;
    movePending = false;
    analysisPending = false;
    pendingBoardAnimation = null;
    dismissedResultKey = "";
    boardAnnotations = [];
    queuedPremove = null;
    dragSnapback = null;
    touchAnnotationMode = null;
    hideTouchAnnotationPicker();
    setStoredDifficultyLabel(draft.difficulty);
    request("POST", "/api/start", currentStartPayload(), function (error, payload) {
      if (error) {
        alert(error);
        return;
      }
      applyStatePayload(payload, true);
    });
  }

  function resumeGame() {
    request("POST", "/api/resume", {}, function (error, payload) {
      if (error) {
        alert(error);
        return;
      }
      replay = null;
      replayIndex = 0;
      movePending = false;
      analysisPending = false;
      pendingBoardAnimation = null;
      dismissedResultKey = "";
      boardAnnotations = [];
      queuedPremove = null;
      dragSnapback = null;
      touchAnnotationMode = null;
      hideTouchAnnotationPicker();
      applyStatePayload(payload, true);
    });
  }

  function sendPreferences() {
    var themeName = normalizeThemeName(byId("theme").value);
    markSetupDirty();
    syncConditionalRowVisibility();
    byId("theme").value = themeName;
    setStoredThemePreference(themeName);
    setStoredPieceStylePreference(byId("piece-set").value);
    applyTheme(themeName);
    request(
      "POST",
      "/api/preferences",
      {
        theme: themeName,
        pieceSet: byId("piece-set").value,
        autoFlip: byId("auto-flip").checked,
        muted: state ? state.muted : false,
        animatePieces: byId("animate-pieces").checked,
        cinematicCaptures: byId("cinematic-captures").checked
      },
      function (error, payload) {
        if (!error) {
          applyStatePayload(payload, false);
        }
      }
    );
  }

  function sendMove(fromSquare, toSquare, promotion) {
    if (movePending) {
      return;
    }
    selectedSquare = null;
    movePending = true;
    renderStatus();
    request(
      "POST",
      "/api/move",
      {
        from: fromSquare,
        to: toSquare,
        promotion: promotion || null
      },
      function (error, payload) {
        movePending = false;
        if (error) {
          alert(error);
          refreshState();
          return;
        }
        applyStatePayload(payload, false);
      }
    );
  }

  function requestAnalysis() {
    if (analysisPending || !state || isReplayMode() || state.result === "*" || state.analysis) {
      return;
    }
    analysisPending = true;
    renderAnalysis();
    request("POST", "/api/analysis", {}, function (error, payload) {
      analysisPending = false;
      if (error || !state || isReplayMode() || state.result === "*") {
        renderAnalysis();
        return;
      }
      state.analysis = payload && payload.analysis ? payload.analysis : null;
      renderAnalysis();
    });
  }

  function triggerAiMove() {
    if (aiPending || !state || !state.aiToMove || isReplayMode()) {
      return;
    }
    aiPending = true;
    renderStatus();
    request("POST", "/api/ai-move", {}, function (error, payload) {
      aiPending = false;
      if (error) {
        alert(error);
        refreshState();
        return;
      }
      applyStatePayload(payload, false);
    });
  }

  function callGameAction(path) {
    request("POST", path, {}, function (error, payload) {
      if (error) {
        alert(error);
        refreshState();
        return;
      }
      replay = null;
      replayIndex = 0;
      movePending = false;
      analysisPending = false;
      pendingBoardAnimation = null;
      if (path === "/api/restart") {
        dismissedResultKey = "";
      }
      applyStatePayload(payload, path === "/api/restart");
    });
  }

  function requestHint() {
    request("POST", "/api/hint", {}, function (error, payload) {
      if (error) {
        alert(error);
        return;
      }
      lastHint = payload.hint;
      renderInsights();
    });
  }

  function loadRecord(fileName) {
    request("POST", "/api/load-record", { file: fileName }, function (error, payload) {
      if (error) {
        alert(error);
        return;
      }
      analysisPending = false;
      movePending = false;
      pendingBoardAnimation = null;
      replay = payload.replay;
      replayIndex = 0;
      selectedSquare = null;
      renderAll();
      restartClockTimer();
    });
  }

  function stepReplay(delta) {
    if (!isReplayMode()) {
      return;
    }
    replayIndex = Math.max(0, Math.min(replay.snapshots.length - 1, replayIndex + delta));
    renderAll();
  }

  function closeReplay() {
    replay = null;
    replayIndex = 0;
    renderAll();
    restartClockTimer();
    if (state && state.aiToMove && !aiPending) {
      window.setTimeout(triggerAiMove, 80);
    }
  }

  function toggleMute() {
    if (!state) {
      return;
    }
    state.muted = !state.muted;
    writeFrontendData({ muted: !!state.muted });
    request("POST", "/api/preferences", { muted: state.muted }, function (error, payload) {
      if (!error) {
        applyStatePayload(payload, false);
      }
    });
  }

  function toggleAnimations() {
    if (!state) {
      return;
    }
    state.animatePieces = !state.animatePieces;
    writeFrontendData({ animatePieces: !!state.animatePieces });
    if (!state.animatePieces) {
      clearBoardAnimationEffects();
    }
    request("POST", "/api/preferences", { animatePieces: state.animatePieces, cinematicCaptures: state.cinematicCaptures }, function (error, payload) {
      if (!error) {
        applyStatePayload(payload, false);
      }
    });
  }

  function toggleCaptureAnimations() {
    if (!state || !state.animatePieces) {
      return;
    }
    state.cinematicCaptures = !state.cinematicCaptures;
    writeFrontendData({ cinematicCaptures: !!state.cinematicCaptures });
    request("POST", "/api/preferences", { cinematicCaptures: state.cinematicCaptures }, function (error, payload) {
      if (!error) {
        applyStatePayload(payload, false);
      }
    });
  }

  function copyPgn() {
    var text = isReplayMode() ? replay.pgn : state.pgn;
    if (!text) {
      showToast("No PGN is available yet.", "warning");
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          showToast("Copied!", "success");
        },
        function () {
          window.prompt("Copy PGN:", text);
        }
      );
      return;
    }
    if (window.clipboardData && window.clipboardData.setData) {
      window.clipboardData.setData("Text", text);
      showToast("Copied!", "success");
      return;
    }
    window.prompt("Copy PGN:", text);
  }

  function squareClicked(squareName) {
    var moveMap = buildMoveMap();
    var targetMap = buildTargetMap();
    var moves;
    if (!state || !state.playerToMove || aiPending || movePending || state.result !== "*" || isReplayMode()) {
      return;
    }

    if (selectedSquare && targetMap[squareName]) {
      moves = targetMap[squareName];
      if (moves.length === 1) {
        sendMove(moves[0].from, moves[0].to, moves[0].promotion);
        return;
      }
      showPromotionModal(moves);
      return;
    }

    if (moveMap[squareName] && moveMap[squareName].length > 0) {
      selectedSquare = squareName;
    } else {
      selectedSquare = null;
    }
    requestBoardRedraw();
  }

  function updateHoveredSquare(squareName) {
    var nextSquare = squareName || "";
    if (hoveredSquare !== nextSquare) {
      hoveredSquare = nextSquare;
      if (nextSquare && shouldLiftSquare(nextSquare)) {
        hoverSquareProgress[nextSquare] = 1;
      }
      requestBoardRedraw();
    }
  }

  function cancelBoardPointerState() {
    clearTouchLongPressTimer();
    activePointerState = null;
    dragState = null;
    annotationGesture = null;
    drawDragLayer();
  }

  function beginAnnotationGesture(event, squareName, colorOverride, touchMode) {
    if (!squareName) {
      annotationGesture = null;
      return;
    }
    annotationGesture = {
      pointerId: event.pointerId,
      fromSquare: squareName,
      toSquare: squareName,
      color: colorOverride || annotationColorFromEvent(event),
      touchMode: !!touchMode
    };
    requestBoardRedraw();
  }

  function armTouchAnnotationMode(color) {
    touchAnnotationMode = { color: color };
    hideTouchAnnotationPicker();
    setPlaceholderTopbarMessage("Touch annotation armed. Tap or drag on the board to paint it.");
  }

  function beginTouchLongPress(pointerId, clientX, clientY, squareName) {
    clearTouchLongPressTimer();
    touchLongPressTimer = window.setTimeout(function () {
      if (!activePointerState || activePointerState.pointerId !== pointerId || dragState || !squareName) {
        return;
      }
      activePointerState.longPressTriggered = true;
      activePointerState.draggable = false;
      showTouchAnnotationPicker(clientX, clientY);
    }, 500);
  }

  function finalizeDraggedMove(dropSquare) {
    var boardRect;
    var metrics;
    var originPosition;
    var moves;
    if (!dragState) {
      return;
    }
    if (!dropSquare) {
      boardRect = byId("board").getBoundingClientRect();
      metrics = boardMetrics();
      originPosition = squareToDisplayPosition(dragState.fromSquare);
      if (originPosition) {
        dragSnapback = {
          fromSquare: dragState.fromSquare,
          piece: dragState.piece,
          pieceSet: dragState.pieceSet,
          startX: (dragState.clientX - boardRect.left) - (metrics.squareSize * 0.575),
          startY: (dragState.clientY - boardRect.top) - (metrics.squareSize * 0.575),
          targetX: originPosition.x - (metrics.squareSize * 0.075),
          targetY: originPosition.y - (metrics.squareSize * 0.075),
          startedAt: performance.now(),
          duration: 320,
          progress: 0
        };
      }
      dragState = null;
      requestBoardRedraw();
      return;
    }
    selectedSquare = dragState.fromSquare;
    moves = buildTargetMap()[dropSquare] || [];
    if (moves.length === 1) {
      dragState = null;
      sendMove(moves[0].from, moves[0].to, moves[0].promotion);
      return;
    }
    if (moves.length > 1) {
      dragState = null;
      showPromotionModal(moves);
      requestBoardRedraw();
      return;
    }
    boardRect = byId("board").getBoundingClientRect();
    metrics = boardMetrics();
    originPosition = squareToDisplayPosition(dragState.fromSquare);
    if (originPosition) {
      dragSnapback = {
        fromSquare: dragState.fromSquare,
        piece: dragState.piece,
        pieceSet: dragState.pieceSet,
        startX: (dragState.clientX - boardRect.left) - (metrics.squareSize * 0.575),
        startY: (dragState.clientY - boardRect.top) - (metrics.squareSize * 0.575),
        targetX: originPosition.x - (metrics.squareSize * 0.075),
        targetY: originPosition.y - (metrics.squareSize * 0.075),
        startedAt: performance.now(),
        duration: 320,
        progress: 0
      };
    }
    dragState = null;
    requestBoardRedraw();
  }

  function boardPointerDown(event) {
    var squareName = currentPointerSquare(event);
    var moveMap = buildMoveMap();
    var piece;
    var board = byId("board");
    if (board && board.setPointerCapture && event.pointerId !== undefined) {
      try {
        board.setPointerCapture(event.pointerId);
      } catch (error) {
        // Ignore pointer capture failures in older shells.
      }
    }
    if (touchAnnotationMode && event.pointerType === "touch" && event.button === 0) {
      event.preventDefault();
      beginAnnotationGesture(event, squareName, touchAnnotationMode.color, true);
      return;
    }
    if (event.button === 2) {
      event.preventDefault();
      beginAnnotationGesture(event, squareName);
      return;
    }
    if (event.button !== 0) {
      return;
    }
    hideTouchAnnotationPicker();
    clearTouchLongPressTimer();
    dragSnapback = null;
    if (boardAnnotations.length > 0 && !touchAnnotationMode) {
      clearBoardAnnotations();
    }
    updateHoveredSquare(squareName);
    piece = squareName && currentDisplay() ? pieceAtSquare(currentDisplay().board, squareName) : null;
    activePointerState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      square: squareName,
      piece: piece,
      draggable: !!(squareName && moveMap[squareName] && moveMap[squareName].length > 0 && canInteractWithBoard()),
      pointerType: event.pointerType || "mouse",
      longPressTriggered: false
    };
    if (activePointerState.pointerType === "touch" && squareName) {
      beginTouchLongPress(event.pointerId, event.clientX, event.clientY, squareName);
    }
  }

  function boardPointerMove(event) {
    var squareName = currentPointerSquare(event);
    var boardRect;
    var dx;
    var dy;
    if (annotationGesture && annotationGesture.pointerId === event.pointerId) {
      annotationGesture.toSquare = squareName || annotationGesture.fromSquare;
      requestBoardRedraw();
      return;
    }
    updateHoveredSquare(squareName);
    if (!activePointerState || activePointerState.pointerId !== event.pointerId) {
      return;
    }
    dx = event.clientX - activePointerState.startX;
    dy = event.clientY - activePointerState.startY;
    if (Math.sqrt((dx * dx) + (dy * dy)) > 4) {
      clearTouchLongPressTimer();
    }
    if (activePointerState.longPressTriggered) {
      return;
    }
    if (!dragState && activePointerState.draggable) {
      if (Math.sqrt((dx * dx) + (dy * dy)) > 6) {
        selectedSquare = activePointerState.square;
        dragState = {
          fromSquare: activePointerState.square,
          piece: activePointerState.piece,
          pieceSet: state ? state.pieceSet : "classic",
          clientX: event.clientX,
          clientY: event.clientY
        };
        requestBoardRedraw();
      }
    }
    if (dragState) {
      boardRect = byId("board").getBoundingClientRect();
      dragState.clientX = Math.max(boardRect.left, Math.min(boardRect.right, event.clientX));
      dragState.clientY = Math.max(boardRect.top, Math.min(boardRect.bottom, event.clientY));
      drawDragLayer();
    }
  }

  function boardPointerUp(event) {
    var board = byId("board");
    var squareName = currentPointerSquare(event);
    if (board && board.releasePointerCapture && event.pointerId !== undefined) {
      try {
        board.releasePointerCapture(event.pointerId);
      } catch (error) {
        // Ignore pointer capture failures in older shells.
      }
    }
    clearTouchLongPressTimer();
    if (annotationGesture && annotationGesture.pointerId === event.pointerId) {
      annotationGesture.toSquare = squareName || annotationGesture.fromSquare;
      finalizeAnnotationGesture();
      activePointerState = null;
      return;
    }
    if (activePointerState && activePointerState.pointerId === event.pointerId && activePointerState.longPressTriggered) {
      activePointerState = null;
      return;
    }
    if (dragState && activePointerState && activePointerState.pointerId === event.pointerId) {
      finalizeDraggedMove(squareName);
      activePointerState = null;
      return;
    }
    if (activePointerState && activePointerState.pointerId === event.pointerId) {
      if (squareName) {
        squareClicked(squareName);
      }
      activePointerState = null;
    }
  }

  function boardPointerCancel(event) {
    var board = byId("board");
    if (board && board.releasePointerCapture && event.pointerId !== undefined) {
      try {
        board.releasePointerCapture(event.pointerId);
      } catch (error) {
        // Ignore pointer capture failures in older shells.
      }
    }
    cancelBoardPointerState();
    requestBoardRedraw();
  }

  function boardContextMenu(event) {
    event.preventDefault();
  }

  function showPromotionModal(moves) {
    var html = [];
    var index;
    var move;
    promotionContext = moves;
    for (index = 0; index < PROMOTION_ORDER.length; index += 1) {
      move = findPromotionMove(PROMOTION_ORDER[index]);
      if (!move) {
        continue;
      }
      html.push(
        '<button type="button" class="small-button" data-promotion="' +
          move.promotion +
          '">' +
          PROMOTION_LABELS[move.promotion] +
          "</button>"
      );
    }
    byId("promotion-buttons").innerHTML = html.join("");
    byId("promotion-modal").className = "modal";
  }

  function hidePromotionModal() {
    promotionContext = null;
    byId("promotion-modal").className = "modal hidden";
    byId("promotion-buttons").innerHTML = "";
  }

  function findPromotionMove(kind) {
    var index;
    for (index = 0; promotionContext && index < promotionContext.length; index += 1) {
      if (promotionContext[index].promotion === kind) {
        return promotionContext[index];
      }
    }
    return null;
  }

  function boardClickHandler(event) {
    var target = event.target || event.srcElement;
    while (target && !target.getAttribute("data-square")) {
      target = target.parentNode;
    }
    if (!target) {
      return;
    }
    squareClicked(target.getAttribute("data-square"));
  }

  function promotionClickHandler(event) {
    var target = event.target || event.srcElement;
    var promotion;
    var move;
    if (!target || !target.getAttribute("data-promotion")) {
      return;
    }
    promotion = target.getAttribute("data-promotion");
    move = findPromotionMove(promotion);
    if (!move) {
      hidePromotionModal();
      return;
    }
    hidePromotionModal();
    sendMove(move.from, move.to, move.promotion);
  }

  function moveHistoryClickHandler(event) {
    var button = closestDataButton(event.target, "data-replay-index");
    var nextIndex;
    if (!button || !isReplayMode()) {
      return;
    }
    nextIndex = parseIntegerValue(button.getAttribute("data-replay-index"), 0);
    replayIndex = Math.max(0, Math.min(replay.snapshots.length - 1, nextIndex));
    renderAll();
  }

  function savedGameClickHandler(event) {
    var localDelete = closestDataButton(event.target, "data-local-delete");
    var localLoad = closestDataButton(event.target, "data-local-save");
    var target = closestDataButton(event.target, "data-file");
    if (localDelete) {
      openConfirmDialog("Delete Local Save", "Remove this saved game from local storage?", "Delete", function () {
        deleteLocalSavedGame(localDelete.getAttribute("data-local-delete"));
        closeConfirmDialog();
      });
      return;
    }
    if (localLoad) {
      loadLocalSavedGame(localLoad.getAttribute("data-local-save"));
      return;
    }
    if (!target) {
      return;
    }
    loadRecord(target.getAttribute("data-file"));
  }

  function togglePanel(side) {
    if (window.innerWidth > 1100) {
      return;
    }
    if (side === "left") {
      document.body.classList.toggle("left-panel-open");
      document.body.classList.remove("right-panel-open");
    } else {
      document.body.classList.toggle("right-panel-open");
      document.body.classList.remove("left-panel-open");
    }
    syncPanelBackdrop();
  }

  function closePanels() {
    document.body.classList.remove("left-panel-open");
    document.body.classList.remove("right-panel-open");
    syncPanelBackdrop();
  }

  function syncPanelBackdrop() {
    var backdrop = byId("panel-backdrop");
    var mobile = window.innerWidth <= 1100;
    var open = mobile && (document.body.classList.contains("left-panel-open") || document.body.classList.contains("right-panel-open"));
    if (!mobile) {
      document.body.classList.remove("left-panel-open");
      document.body.classList.remove("right-panel-open");
    }
    if (backdrop) {
      backdrop.className = open ? "panel-backdrop" : "panel-backdrop hidden";
    }
  }

  function toggleSection(event) {
    var button = event.currentTarget;
    var targetId = button.getAttribute("data-target");
    var section = button.parentNode;
    var collapsed;
    if (!targetId || !section) {
      return;
    }
    collapsed = !section.classList.contains("collapsed");
    if (collapsed) {
      section.classList.add("collapsed");
      button.setAttribute("aria-expanded", "false");
    } else {
      section.classList.remove("collapsed");
      button.setAttribute("aria-expanded", "true");
    }
    saveOpenSectionsState();
  }

  function initCollapsibleSections() {
    var toggles = document.querySelectorAll(".section-toggle");
    var stored = readFrontendData().panelSections || {};
    var index;
    var section;
    var id;
    for (index = 0; index < toggles.length; index += 1) {
      toggles[index].onclick = toggleSection;
      section = toggles[index].parentNode;
      id = section ? section.id : "";
      if (id && Object.prototype.hasOwnProperty.call(stored, id)) {
        if (stored[id]) {
          section.classList.remove("collapsed");
          toggles[index].setAttribute("aria-expanded", "true");
        } else {
          section.classList.add("collapsed");
          toggles[index].setAttribute("aria-expanded", "false");
        }
      }
    }
  }

  function renameProfile() {
    var proposed = window.prompt("Enter a username (3-20 letters, numbers, or underscores):", getStoredUsername());
    if (proposed === null) {
      return;
    }
    proposed = proposed.replace(/^\s+|\s+$/g, "");
    if (!isValidUsername(proposed)) {
      alert("Usernames must be 3-20 characters using letters, numbers, or underscores.");
      return;
    }
    setStoredUsername(proposed);
    renderTopBar();
    renderPlayerPanels();
  }

  function setPlaceholderTopbarMessage(text) {
    if (state && state.gameActive && state.result === "*") {
      byId("thought-text").innerText = text;
    }
  }

  function trailSwatchClickHandler(event) {
    var button = closestDataButton(event.target, "data-trail-style");
    var styleId;
    var index;
    if (!button) {
      return;
    }
    styleId = button.getAttribute("data-trail-style");
    if (!isTrailStyleUnlocked(styleId)) {
      for (index = 0; index < TRAIL_STYLE_OPTIONS.length; index += 1) {
        if (TRAIL_STYLE_OPTIONS[index].id === styleId) {
          setPlaceholderTopbarMessage(TRAIL_STYLE_OPTIONS[index].unlockText);
          break;
        }
      }
      return;
    }
    setStoredTrailStylePreference(styleId);
    renderTrailSwatches();
    requestBoardRedraw();
  }

  function borderSwatchClickHandler(event) {
    var button = closestDataButton(event.target, "data-border-style");
    var styleId;
    var index;
    if (!button) {
      return;
    }
    styleId = button.getAttribute("data-border-style");
    if (!isBorderStyleUnlocked(styleId)) {
      for (index = 0; index < BORDER_STYLE_OPTIONS.length; index += 1) {
        if (BORDER_STYLE_OPTIONS[index].id === styleId) {
          setPlaceholderTopbarMessage(BORDER_STYLE_OPTIONS[index].unlockText);
          break;
        }
      }
      return;
    }
    setStoredBorderStylePreference(styleId);
    renderBorderSwatches();
    requestBoardRedraw();
  }

  function touchAnnotationPickerClickHandler(event) {
    var button = closestDataButton(event.target, "data-annotation-color");
    if (!button) {
      return;
    }
    armTouchAnnotationMode(button.getAttribute("data-annotation-color"));
  }

  function difficultySegmentClickHandler(event) {
    var button = closestDataButton(event.target, "data-difficulty-choice");
    if (!button) {
      return;
    }
    setDifficultyChoice(button.getAttribute("data-difficulty-choice"));
    markSetupDirty();
  }

  function init() {
    var themeButtons;
    var botModeItems;
    var playerColorItems;
    var index;
    byId("play-button").onclick = startGame;
    byId("resume-button").onclick = resumeGame;
    byId("undo-button").onclick = function () { callGameAction("/api/undo"); };
    byId("restart-button").onclick = function () {
      openConfirmDialog("Restart Game", "Start a fresh game with the current setup?", "Restart", function () {
        dismissedResultKey = "";
        closeConfirmDialog();
        callGameAction("/api/restart");
      });
    };
    byId("hint-button").onclick = requestHint;
    byId("draw-button").onclick = function () {
      openConfirmDialog("Offer Draw", "Send a draw request to the current game state?", "Offer Draw", function () {
        closeConfirmDialog();
        callGameAction("/api/draw");
      });
    };
    byId("resign-button").onclick = function () {
      openConfirmDialog("Resign Game", "This will concede the current game.", "Resign", function () {
        closeConfirmDialog();
        callGameAction("/api/resign");
      });
    };
    byId("copy-pgn-button").onclick = copyPgn;
    byId("save-game-button").onclick = saveGameToLocalStorage;
    byId("load-game-button").onclick = function () {
      openSavedGamesModal();
    };
    byId("replay-copy-pgn-button").onclick = copyPgn;
    byId("animation-button").onclick = toggleAnimations;
    byId("capture-animation-button").onclick = toggleCaptureAnimations;
    byId("mute-button").onclick = toggleMute;
    byId("replay-prev").onclick = function () { stepReplay(-1); };
    byId("replay-next").onclick = function () { stepReplay(1); };
    byId("replay-close").onclick = closeReplay;
    byId("result-play-again").onclick = function () { dismissedResultKey = ""; callGameAction("/api/restart"); };
    byId("result-review").onclick = hideResultModal;
    byId("board").oncontextmenu = boardContextMenu;
    byId("board").onpointerdown = boardPointerDown;
    byId("board").onpointermove = boardPointerMove;
    byId("board").onpointerup = boardPointerUp;
    byId("board").onpointercancel = boardPointerCancel;
    byId("board").onpointerleave = function () {
      if (!activePointerState && !dragState) {
        updateHoveredSquare("");
      }
    };
    byId("promotion-buttons").onclick = promotionClickHandler;
    byId("promotion-cancel").onclick = hidePromotionModal;
    byId("move-history").onclick = moveHistoryClickHandler;
    byId("saved-games").onclick = savedGameClickHandler;
    byId("trail-swatches").onclick = trailSwatchClickHandler;
    byId("border-swatches").onclick = borderSwatchClickHandler;
    byId("difficulty-segments").onclick = difficultySegmentClickHandler;
    byId("touch-annotation-picker").onclick = touchAnnotationPickerClickHandler;
    byId("left-drawer-toggle").onclick = function () { togglePanel("left"); };
    byId("right-drawer-toggle").onclick = function () { togglePanel("right"); };
    byId("panel-backdrop").onclick = closePanels;
    byId("confirm-cancel").onclick = closeConfirmDialog;
    byId("saved-games-modal-close").onclick = closeSavedGamesModal;
    byId("saved-games-modal").onclick = function (event) {
      if (event.target === this) {
        closeSavedGamesModal();
      }
    };
    byId("confirm-modal").onclick = function (event) {
      if (event.target === this) {
        closeConfirmDialog();
      }
    };
    byId("confirm-submit").onclick = function () {
      if (pendingConfirmAction) {
        pendingConfirmAction();
      } else {
        closeConfirmDialog();
      }
    };
    byId("rename-button").onclick = renameProfile;
    byId("collection-button").onclick = function () { setPlaceholderTopbarMessage("Collection arrives in a later phase."); };
    byId("stats-button").onclick = function () { setPlaceholderTopbarMessage("Stats screen arrives in a later phase."); };
    botModeItems = document.getElementsByName("bot-mode");
    for (index = 0; index < botModeItems.length; index += 1) {
      botModeItems[index].onclick = markSetupDirty;
    }
    playerColorItems = document.getElementsByName("player-color");
    for (index = 0; index < playerColorItems.length; index += 1) {
      playerColorItems[index].onclick = markSetupDirty;
    }
    byId("difficulty").onchange = function () {
      setDifficultyChoice(byId("difficulty").value);
      markSetupDirty();
    };
    byId("illegal-personality").onchange = markSetupDirty;
    byId("time-mode").onchange = markSetupDirty;
    byId("custom-minutes").oninput = markSetupDirty;
    byId("custom-increment").oninput = markSetupDirty;
    byId("theme").onchange = sendPreferences;
    byId("piece-set").onchange = sendPreferences;
    byId("auto-flip").onclick = sendPreferences;
    byId("animate-pieces").onclick = sendPreferences;
    byId("cinematic-captures").onclick = sendPreferences;
    byId("background-animation-button").onclick = function () {
      if (backgroundAnimationAutoDisabled) {
        return;
      }
      setStoredBackgroundAnimationEnabled(!getStoredBackgroundAnimationEnabled());
      updateBackgroundAnimationButton();
      startBackgroundAnimation(currentThemeSelection());
    };
    themeButtons = document.querySelectorAll(".theme-swatch");
    for (index = 0; index < themeButtons.length; index += 1) {
      themeButtons[index].onclick = function () {
        byId("theme").value = this.getAttribute("data-theme");
        sendPreferences();
      };
    }
    initCollapsibleSections();
    hydrateAppearanceFromStorage();
    setDifficultyChoice(getStoredDifficultyLabel() || byId("difficulty").value);
    syncConditionalRowVisibility();
    ensureBoardBorderCanvasSize();
    resizeBoardLayers();
    window.onresize = function () {
      syncPanelBackdrop();
      ensureBackgroundCanvasSize();
      ensureBoardBorderCanvasSize();
      resizeBoardLayers();
      requestBoardRedraw();
    };
    refreshState();
    ensureGameLoop();
  }

  if (document.readyState === "complete") {
    init();
  } else {
    window.onload = init;
  }
})();
