# Chess — Master Spec (Complete Build Document)

> **Send this to Codex first, before pasting anything:**
> *"Read all files in the Mered folder. Read chess_master_spec.md as the complete build document. Read chess_ui_mockup.html as the visual reference — match its layout, colors, component structure, and dark aesthetic. Do not touch any Python files. Only overhaul mered.html, mered.css, and mered.js. Preserve all existing backend API calls. Before writing any code, audit what the existing frontend has and what still needs to be built, then ask me to confirm before generating. Work through the spec in the staging order at the bottom of this file. Mark completed items in todo.md as each phase finishes."*

> **Design philosophy**: Every screen, interaction, and animation should feel premium and earned. The bar is: if this were a AAA game's UI, would it fit? Nothing placeholder. Nothing cheap. Everything has weight and visual feedback.

> **Division of responsibility**: All design decisions (colors, spacing, typography, animation timing, layout, visual hierarchy) are defined in this document. Codex implements the logic. Codex does not make design decisions — it follows what is written here.

---

# GLOBAL DESIGN SYSTEM

## Typography
```
Headings, titles, logo, badges, cutscene text: 'Cinzel', serif (Google Fonts)
Body text, labels, buttons, stats: 'Inter', sans-serif (Google Fonts)
Monospace (clocks, move notation): system monospace stack
Load both from Google Fonts at top of file. Fallbacks: Georgia / sans-serif.
```

## Color Tokens (CSS Custom Properties)
```css
:root {
  --board-light: #F0D9B5;
  --board-dark:  #B58863;
  --bg-page:     #2b2b2b;
  --bg-panel:    #1e1e1e;
  --bg-surface:  #161616;
  --bg-card:     #1e1e1e;
  --accent:      #ffcc00;
  --text-primary:   #e0e0e0;
  --text-secondary: #888888;
  --text-muted:     #555555;
  --border-dim:  #2a2a2a;
  --border-mid:  #444444;
  --border-bright: #666666;
}
```
Every theme overrides these. Every UI element uses these variables — never hardcoded colors in component code.

## Rarity Color System
```
Common:   #aaaaaa  bg: #222222
Rare:     #4488ff  bg: #001133
Epic:     #ffcc00  bg: #1a1000
Unique:   #ff3333  bg: #1a0000
Mythic I: animated #aa44ff → #ffcc00 → #ffffff  bg: #0d0020
Mythic II: animated #ff00aa → #ffcc00 → #00ffff → #aa44ff  bg: #000000
```

## Animation Timings
```
Micro-interactions (hover, toggle): 150ms ease
Panel transitions: 200ms ease
Modal appear: scale(0.95→1.0) + fade, 200ms ease-out
Toast slide: 250ms ease-out
Cutscene intro: 400ms rarity flash + 300ms letterbox
Level-up burst: 800ms
```

## Z-Index Stack (complete, global)
```
z-index: -1     Animated background canvas
z-index: 0      Board canvas stack (board / annotations / drag overlay)
z-index: 100    UI panels, top bar
z-index: 1000   Modals (confirm, saved games, rename, promotion)
z-index: 2000   Game Result screen
z-index: 9990   Training Mode / Genesis Mode screens
z-index: 9991   Hall of Fame screen
z-index: 9992   Leaderboard screens (Elo + AI Level)
z-index: 9993   Chest Shop overlay
z-index: 9994   Customize Screen
z-index: 9995   Stats Screen
z-index: 9996   Collection Screen
z-index: 9997   Cutscene overlay canvas
z-index: 9998   Chest Opening animation
z-index: 10000  Toasts
z-index: 10001  Avatar skin picker / Showcase picker modals
```

---

# PART 1 — LAYOUT & TOP BAR

## Three-Column Layout
```
┌──────────────────────────────────────────────────────┐
│                      TOP BAR                         │
├──────────────┬───────────────────────┬───────────────┤
│              │                       │               │
│  LEFT PANEL  │   BOARD + CLOCKS      │  RIGHT PANEL  │
│   ~220px     │   (flexible center)   │    ~260px     │
│              │                       │               │
└──────────────┴───────────────────────┴───────────────┘
```
- Board always centered and dominant.
- No outer page scrollbars. Only internal regions scroll (game record, session log, leaderboard lists).
- Responsive: panels collapse to hamburger drawers below 1100px. Board-only below 800px.

## Top Bar Design
```
Height: 48px
Background: #111111
Border-bottom: 1px solid #222222
Padding: 0 16px
Display: flex, align-items: center
```

**Left group**:
```
♟ CHESS  — font: 20px Cinzel, color: #ffcc00
           text-shadow: 0 0 12px rgba(255,204,0,0.4)
```

**Center group** (flex: 1, text-align: center):
```
Game mode label: 12px Inter #888888
Opening name:    10px Inter #555555, margin-top: 2px
Fades in smoothly (opacity 0→1, 300ms) when opening detected.
Updates as the line deepens.
Fades to "Custom Position" in #333 when off-book.
```

**Right group** (flex row, gap: 8px, align-items: center):
```
Username: "👤 [name]" — 12px Inter #888
Gear icon ⚙: 14px, color #555, cursor pointer, hover color #888
─── separator: 1px solid #2a2a2a, height 16px ───
Icon buttons (each 32×32px, border-radius 6px, border 1px solid #2a2a2a,
  background transparent, hover background #1e1e1e, hover border #444):
  🏆  Collection
  📊  Stats
  🎨  Customize
  🏅  Leaderboards  (new — opens leaderboard hub)
  [TEST] (debug only, hidden when DEBUG_MODE = false)
```

**Two-player mode addition**: small pill badge `"P2 Turn"` appears between center and right group:
```
Background: rgba(68,136,255,0.15)
Border: 1px solid #4488ff
Border-radius: 10px
Padding: 2px 10px
Font: 10px Cinzel #4488ff
```

---

# PART 2 — LEFT PANEL

## Overall Design
```
Width: 220px
Background: #161616
Border-right: 1px solid #222222
Padding: 10px
Display: flex, flex-direction: column, gap: 8px
Overflow: hidden (no outer scroll)
```

## Player Cards (top and bottom)
```
Card: background #1e1e1e, border 1px solid #2a2a2a, border-radius 8px, padding 8px
```

**Top card** (opponent, above board):
- Avatar circle: 32px, border-radius 50%, background from username hash `hsl(hash%360,55%,28%)`, 11px Cinzel initials in `#cccccc`, border `1px solid #333`
- Username: 12px Inter `#cccccc`, font-weight 500, beside avatar
- Elo rating: 10px Inter `#555555` beside username (e.g. `1420`)
- Clock: 20px monospace `#e0e0e0`, font-weight 600, below avatar row. Format `MM:SS`. When ≤30s: color `#ff3333`, animation `pulse 1s infinite`
- Captured pieces: 18px piece icons in a flex-wrap row, grouped by type. Material advantage `+N` in 10px Inter `#888`

**Bottom card** (local player, below board):
- Same layout mirrored. Clock is the active one when it is the player's turn.
- Elo rating displayed here too.
- **ELO CHANGE INDICATOR**: after a game ends, show `+12` in `#00cc44` or `-8` in `#ff3333` beside the Elo value, fading in with a slide-up animation and auto-dismissing after 3 seconds.

**Captured pieces orientation**: top row = pieces captured BY the bottom player. Bottom row = pieces captured BY the top player. Never reversed.

## Opening Name Pill
```
Background: #1a1a1a
Border: 1px solid #2a2a2a
Border-radius: 20px
Padding: 4px 12px
Font: 10px Cinzel
Color: #888 for ECO code, #aaa for opening name
Layout: "[ECO] — [Name]" centered
```

## Emoji Reactions (Two-Player Mode)
```
Row of 5 buttons per player side, outside their board edge
Button: 28×28px, background #1e1e1e, border 1px solid #2a2a2a, border-radius 6px
  font-size: 14px, cursor pointer
  Hover: border-color #444
  Active (cooldown): opacity 0.4, cursor default
Buttons: 👏 😤 🤔 😂 🔥
On click: emoji renders at 64px, centered above that player's side of board,
  floats up 40px and fades over 1.2s.
  Animation: translateY(0 → -40px), opacity(1 → 0), ease-out.
  Bounce-in on spawn: scale(0 → 1.2 → 1.0) in first 200ms.
3-second cooldown per player.
```

## Daily Challenge Widget
```
Card: background #1a1400, border 1px solid #332800, border-radius 8px, padding 10px
Position: margin-top auto (pushed to bottom of left panel)

Layout top to bottom:
  Row: badge (20px radius canvas) | "⚡ DAILY" in 9px Cinzel #ffcc00
  Challenge text: 10px Inter #888, line-height 1.4
  Progress bar: background #2a2000, height 5px, border-radius 3px
    Fill: #ffcc00, width = (progress/target * 100)%
    Transition: width 300ms ease
  Progress fraction: "2 / 3" in 10px Cinzel #666, text-align right

Completed state:
  Border: 1px solid #ffcc00
  Checkmark: ✓ in #ffcc00, 16px, appears with scale(0→1) 200ms
  Challenge text: line-through, color #555
```

---

# PART 3 — BOARD AREA

## Canvas Layer Stack (bottom to top)
```
1. Board canvas      — squares, pieces, highlights, cursed glows, trails
2. Annotations canvas — right-click dots and arrows (pointer-events: none for non-right-click)
3. Drag overlay canvas — dragged piece only, transparent when not dragging
All three: position absolute, top 0, left 0, width/height = board size
```

## Board Rendering
- Squares alternate `--board-light` and `--board-dark`
- Coordinate labels: `a–h` along bottom, `1–8` along left side. Font: 10px Inter, color: blend of light/dark square color at 60% opacity
- Last move: both squares tinted `rgba(--accent, 0.25)` via `globalAlpha`
- Selected square: bright accent ring `2px solid var(--accent)` drawn just inside square edge
- Legal move dots: `rgba(0,0,0,0.18)` filled circle (diameter = 28% of square) for empty squares; `rgba(0,0,0,0.15)` ring (stroke 3px) for capture squares
- Check: King's square fills with `rgba(220,30,30,0.35)`, pulses (opacity 0.35↔0.55) at 0.8s interval using `needsRedraw`
- Pre-move source: `rgba(160,80,255,0.35)` fill. Pre-move destination: `rgba(160,80,255,0.2)` fill.

## Piece Hover Animation
```
On hover over a legally movable piece:
  Y offset: -4px (piece renders 4px higher than its square center)
  Shadow: changes from rgba(0,0,0,0.3) 0 2px 4px
                    to rgba(0,0,0,0.5) 0 8px 16px
  Transition: instant on enter, ease-out 150ms on exit
Track via hoveredSquare. Apply in renderPiece when drawing that square.
Opponent pieces and pieces with no legal moves: no hover effect.
```

## Drag and Drop
```
On mousedown/touchstart on legal piece:
  - Remove piece from board canvas
  - Begin rendering piece on drag overlay canvas at cursor position, scale 1.15x
  - Origin square: render ghost silhouette at 30% opacity on board canvas
  - Show legal move dots
On mousemove/touchmove:
  - Update drag overlay canvas position to cursor
On mouseup/touchend:
  - Legal square: execute move, clear drag overlay, remove ghost
  - Illegal/off-board: elastic snap-back animation
    (piece flies back to origin: cubic-bezier overshoot, 250ms)
Touch: use touch events. preventDefault on touchmove to stop page scroll.
```

## Square Annotations (Right-Click)
```
Dot colors by modifier:
  Right-click alone:    rgba(0,200,80,0.7)   green
  Shift+right-click:    rgba(255,200,0,0.7)  yellow
  Ctrl+right-click:     rgba(220,50,50,0.7)  red
  Alt+right-click:      rgba(50,150,255,0.7) blue

Dot render: filled circle, diameter = 28% of square, centered on square.
Arrow render: thick line (width = 18% of square size) from source center to
  destination center, with filled triangular arrowhead (base = 24% of square,
  pointing toward destination).
Right-click same annotation: removes it.
Left-click anywhere: clears all annotations, needsRedraw = true.
Eraser icon: 16px, absolute bottom-right of board wrapper, visible only when
  annotations exist. On click: clears all annotations.
Render on annotations canvas (separate from board).
```

## Piece Trails
```
On move completion (any piece, including bot):
  Spawn 5 ghost silhouettes at positions interpolated along the move path.
  Each ghost: decreasing opacity (38%, 28%, 18%, 10%, 4%) and scale (95%, 85%, 75%, 65%, 55%)
  Fade entire trail to 0 over 400ms via rAF.
  Trail color: ivory #F5F0E8 for white pieces, charcoal #1C1C1C for black pieces.

Trail styles (active style selectable in Appearance section):
  Default — plain ghost silhouettes (always available)
  Flame   — orange/red teardrop particles drifting along path
  Ice     — blue/white crystalline shard shapes along path
  Gold    — bright gold sparkle circles along path
  Royal   — purple/violet glowing orbs along path
  Shadow  — pure near-black smoke wisp shapes along path

Unlock conditions:
  Flame:  trigger 10 cutscenes total
  Ice:    reach Blue badge tier on any cutscene
  Gold:   reach Gold badge tier on any cutscene
  Royal:  witness all 5 Unique cutscenes
  Shadow: trigger Regicide 10 times

Locked trail swatches in Appearance section:
  Grayscale preview, padlock icon overlay, unlock condition shown on hover in tooltip.
```

## Board Borders
```
A separate Canvas 2D element renders just outside the board square boundary.
Per-theme default borders:
  Classic:  oak wood grain — horizontal grain lines #8B5E3C tones, knot accents at corners
  Midnight: thin dark metal frame with small circular rivets at four corners
  Forest:   carved stone with vine/leaf relief motifs at corners, mossy #4a7c59 tones
  Crimson:  wrought iron with flame scroll work at all four corners
  Ice:      frosted glass look — white crystalline edges with ice spike corner accents
  Gold:     ornate gilded frame, decorative scroll flourishes, #C8A020 tones
  Neon:     PCB circuit board — thin trace lines, via holes at corners, glowing in --accent
  Obsidian: dark carved stone with faint runic symbol markings along all edges

Unlockable borders (earned via achievements):
  Dragon:   red and gold dragon scale tiles wrapping all four sides
  Marble:   white and gray veined marble inlay
  Void:     deep space starfield with slowly drifting star particles
```

---

# PART 4 — RIGHT PANEL

## Overall Design
```
Width: 260px
Background: #161616
Border-left: 1px solid #222222
Display: flex, flex-direction: column
Overflow: hidden (no outer scroll)
```

## Collapsible Section Pattern
```
.section-header:
  Display: flex, justify-content: space-between, align-items: center
  Padding: 8px 12px
  Cursor: pointer
  User-select: none
  Hover: background #1e1e1e

.section-title:
  Font: 10px Cinzel, color: #666, letter-spacing: 0.8px, text-transform: uppercase

.section-chevron:
  Font: 10px, color: #444, transition: transform 200ms ease
  .open: transform rotate(180deg)

.section-body:
  Padding: 8px 12px
  .collapsed: display none
```

## Pre-Game Section (visible before Play, hidden after)
```
Bot Mode segmented group:
  Container: background #111, border 1px solid #2a2a2a, border-radius 6px, overflow hidden
  Buttons: flex: 1, padding 5px, font 10px Inter #555, text-align center, cursor pointer
  Active button: background #2a2a2a, color #ffcc00

Play As:
  Two 48px square buttons side by side (♔ White / ♚ Black)
  Active: border 2px solid #ffcc00, background #1a1400

Clock selector:
  Full-width styled select — background #111, border 1px solid #2a2a2a,
  border-radius 6px, color #888, font 11px Inter, padding 5px 8px

Play Button:
  Full-width, height 44px, border-radius 8px
  Background: linear-gradient(135deg, #ffcc00, #ff9900)
  Font: 14px Cinzel, color #000, font-weight 600, letter-spacing 1px
  Hover: opacity 0.9
  Animation: subtle scale pulse (scale 1.0→1.02→1.0 on 2s loop) while waiting
```

## In-Game Controls Section (replaces pre-game after Play)
```
2×3 grid of pill buttons:
  Each: background #1e1e1e, border 1px solid #2a2a2a, border-radius 8px
  Padding: 7px 4px, text-align center, cursor pointer
  Hover: border-color #444, background #252525
  Danger (Resign, Restart): hover border-color #aa3333, background #1a0808

  Icon: 14px emoji/symbol, display block, margin-bottom 2px
  Label: 10px Inter #666

  Buttons: ↩ Undo / 🔄 Restart / 💡 Hint / 🤝 Draw / 🏳 Resign / ▶ Resume
```

## Appearance Section
```
Theme swatches row:
  Horizontal flex, gap 6px, flex-wrap wrap
  Each swatch: 36×36px, border-radius 6px, cursor pointer, overflow hidden
    Contains 2×2 grid of colored squares showing board colors
    Border: 2px solid transparent
    Active: border-color #ffcc00, box-shadow 0 0 6px rgba(255,204,0,0.3)
    Hover: border-color #444

Piece Style selector:
  4 pills in a row: Classic / Neo / Minimal / Wood
  .style-pill: flex 1, padding 4px, border 1px solid #2a2a2a, border-radius 5px
    font 10px Inter #555, text-align center, cursor pointer
  .active: border-color #ffcc00, color #ffcc00, background #1a1400

Trail Style swatches:
  Same swatch style as themes but smaller (30×30px)
  Locked: grayscale, padlock overlay, tooltip on hover showing unlock condition

Board Border swatches:
  Same pattern, shows border texture preview

Background Animation toggle:
  Pill toggle switch (on/off), saves to localStorage
```

## Utility Controls Section
```
Three toggle rows:
  Each row: flex between label and toggle pill
  Label: 11px Inter #666
  Toggle pill: 28×15px, border-radius 8px
    Off: background #333, knob at left
    On: background var(--accent), knob at right
    Knob: 11×11px circle, background #fff, absolute, transition left 200ms

Toggles: 🔊/🔇 Mute | 🎬 Animations | ⚡ Action Captures
All three save state to localStorage.
```

## Export Section
```
Three buttons stacked:
  Each: background #1e1e1e, border 1px solid #2a2a2a, border-radius 6px
  Font: 11px Inter #888, padding 6px 8px, text-align left, cursor pointer
  Hover: border-color #444, color #ccc

📋 Copy PGN — copies to clipboard, shows "Copied!" toast
💾 Save Game — saves to localStorage
📂 Load Game — opens saved games modal
```

## Game Record Section
```
Default: collapsed
Expanded: scrollable move list, max-height 200px
  Internal scrollbar: 3px wide, thumb #333, track transparent

Move list rows:
  Two columns (White | Black), alternating row background #1e1e1e / transparent
  Move number: 10px Inter #444, fixed width
  Move text: 11px Inter #ccc, padding 1px 4px, border-radius 3px
  Current move: background #2a1a00, color #ffcc00
  Click to jump: cursor pointer, hover background #252525

Analysis Mode additions:
  Colored classification icon left of each move:
    🟢 Best / 🟡 Good / 🟠 Inaccuracy / 🔴 Mistake / 💀 Blunder
  Icons are 10px, inline-block
```

## AI Notes Section
```
Default: collapsed
Contents:
  Eval bar: 8px tall, border-radius 4px
    Background: #333
    White fill (left): #f0d9b5 — width proportional to white advantage
    Black fill (right): #1a1a1a — remainder
    Transition: width 400ms ease

  Best move rows:
    "⬜ White  Nf3 → e5" / "⬛ Black  d5 → d4"
    Font: 11px Inter, color #888 for label, #aaa for move (monospace)
```

## Status Bar
```
Always visible at bottom of right panel.
Padding: 8px 12px
Background: #111
Border-top: 1px solid #222

Status dot + text:
  Dot: 6px circle, inline-block, margin-right 6px
  Text: 11px Inter, font-weight 500

States:
  Your Turn:        dot #00cc44, text #00cc44 "● Your Turn"
  Bot Thinking:     dot #ffcc00 (pulse), text #ffcc00 "● Bot Thinking..."
  Check:            dot #ff3333, text #ff3333 "● Check!"
  Checkmate/End:    dot #ff3333, text #ccc "[Result]"
  Analysis Mode:    dot var(--accent), text var(--accent) "◆ Analysis Mode"
```

---

# PART 5 — APPEARANCE THEMES

## Theme Definitions
All 8 themes with their CSS variable overrides:

```javascript
const THEMES = {
  Classic:  { light:'#F0D9B5', dark:'#B58863', page:'#2b2b2b', panel:'#1e1e1e', accent:'#ffcc00' },
  Midnight: { light:'#8ca2ad', dark:'#2d4a6b', page:'#0d1117', panel:'#161b22', accent:'#58a6ff' },
  Forest:   { light:'#c8d8a8', dark:'#4a7c59', page:'#1a2a1a', panel:'#162016', accent:'#7bc67e' },
  Crimson:  { light:'#e8c8b8', dark:'#8b3a3a', page:'#1a0a0a', panel:'#180808', accent:'#ff4444' },
  Ice:      { light:'#dce8f0', dark:'#6090b0', page:'#0a1520', panel:'#0d1a26', accent:'#a0d4f0' },
  Gold:     { light:'#f5e6c8', dark:'#9a7a3a', page:'#1a1500', panel:'#181200', accent:'#ffd700' },
  Neon:     { light:'#1a1a2e', dark:'#0f0f1a', page:'#000000', panel:'#0a0a0f', accent:'#00ffcc' },
  Obsidian: { light:'#3a3a4a', dark:'#1a1a28', page:'#050508', panel:'#0a0a10', accent:'#aa88ff' },
}
```

Theme change: updates all CSS variables simultaneously. Affects panels, buttons, modals, toasts, overlays, board. Saved to localStorage.

## Animated Backgrounds
Each theme: an independent full-page Canvas at `z-index: -1` with its own rAF loop. Never touches game loop variables. Continues playing behind cutscene overlays.

```
Classic:  Slow dust motes — tiny cream/gold circles float upward, ~15% opacity, varying sizes 1–3px
Midnight: Star field — 200+ tiny white dots at varying opacities drift slowly right.
          Shooting star: bright streak diagonally across screen every 8–15s, 200ms duration.
Forest:   Fog wisps — 3–4 large soft white semi-transparent ellipses drift left to right.
          Leaf: simple rotated quad path in rgba(60,120,40,0.3) drifts down from top every 6s.
Crimson:  Embers — 20 small circles in #ff6600→#ff8800, spawn at bottom, float upward,
          fade as they rise, slight random drift.
Ice:      Snowflakes — 40 dots of varying sizes (1–4px, rgba(255,255,255,N)) drift downward
          with gentle ±0.5px/frame horizontal sway, wrapping at bottom.
Gold:     Shimmer — 60 tiny 1px dots in #ffd700, each pulses opacity 0→0.6→0 independently
          on random 2–5s cycles, static position.
Neon:     Grid pulse — faint grid of lines in rgba(--accent,0.06), a brightness wave travels
          top-left → bottom-right every 4s using a diagonal gradient sweep.
Obsidian: Aurora — 2–3 large soft blobs (radial gradients in #aa44ff, #4488ff, #8844ff)
          drift very slowly, blending together, ~10% max opacity.
```

**Background Animation toggle**: on/off in Appearance section, default on, saved to localStorage.
**Auto-disable**: if `navigator.hardwareConcurrency < 4`, default to off with static fallback.

## Surface Texture Overlays
Full-page CSS overlay, `z-index: 0`, `pointer-events: none`:
```
Classic:  opacity 0.05, fine linen — repeating-linear-gradient(
            rgba(255,255,255,0.04) 1px, transparent 1px) 0 0/4px 4px
Midnight: opacity 0.04, carbon diagonal — repeating-linear-gradient(
            45deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px,
            transparent 0, transparent 50%) 0 0/4px 4px
Forest:   opacity 0.05, stone — repeating-linear-gradient(
            rgba(0,0,0,0.04) 1px, transparent 1px,
            transparent 3px, rgba(0,0,0,0.02) 4px) 0 0/8px 8px
Crimson:  opacity 0.04, leather crosshatch — two repeating-linear-gradients
          at 45° and -45°, rgba(0,0,0,0.03) lines
Ice:      no texture, filter: blur(0px) (clean)
Gold:     opacity 0.05, silk diagonal — repeating-linear-gradient(
            -45deg, rgba(255,220,100,0.04) 0, transparent 1px) 0 0/4px 4px
Neon:     no texture
Obsidian: opacity 0.05, basalt — repeating-conic-gradient(
            rgba(255,255,255,0.02) 0deg 90deg, transparent 90deg 180deg) 0 0/6px 6px
```

---

# PART 6 — PIECE RENDERING

## General Rules
```
All pieces: clean Canvas 2D bezier curves. No jagged edges. No Unicode. No SVG sprites.
Recognizable at 40px–90px square sizes.
White pieces: fill #F5F0E8, stroke #333333, stroke-width 1.5px, subtle inner shadow
Black pieces: fill #1C1C1C, stroke #CCCCCC, stroke-width 1.5px, subtle inner highlight
Subtle drop shadow: rgba(0,0,0,0.35) 0 2px 6px beneath each piece.
```

## Piece Silhouette Specs

**Pawn**: round circular head (radius = 28% of square), trapezoidal neck (wider at base), wide flat base with slight inward taper at bottom.

**Knight** *(HIGHEST PRIORITY — must look like a horse head)*:
Staunton horse head silhouette in right-facing profile. Use smooth bezier curves:
- Muzzle: gentle forward curve from nose to mouth, slight underbite
- Forehead: smooth curve from muzzle up and back over the skull
- Ear: short triangular point at the top of the head
- Neck: wide graceful curve sweeping back and down from the jaw to the base
- Mane: a single smooth ridge along the back of the neck (not spiky)
- Base: flat rectangular pedestal
The Knight must be immediately, unambiguously recognizable as a horse head at all sizes.

**Bishop**: tall piece. Head is an elongated oval with a sharp clean mitre point at the apex (not rounded — a true sharp point). Collar ring ~40% up the piece. Thin neck between collar and head. Wide stable base with step profile.

**Rook**: straight-sided tower. Top has three even rectangular battlements (notches cut from the top edge). Body is straight. Wide base with a step profile.

**Queen**: five-point crown at top (center point tallest, flanking points slightly shorter, outer points shorter still). Small round ball atop the center point. Elegant curved body tapering inward toward the waist then flaring to a wide base.

**King**: cross at top — a vertical bar with a shorter horizontal bar crossing it ~25% from the top. A round decorative ring below the cross. Slightly wider body than the Queen. Wide base with step.

## Style Variants
```
Classic: Staunton-inspired. Standard proportions as described above.
Neo:     Same silhouettes. Strokes 0.5px thinner. Sharper angular details at
         joints (collar, base step). Subtle vertical gradient fill:
         White: #F8F4EC top → #E8E0D0 bottom
         Black: #222228 top → #111118 bottom
Minimal: Flat. No gradients. No drop shadow. Stroke 1px. Fill is solid.
         White: #E8E0D0. Black: #2a2a2a.
Wood:    Classic silhouettes. White pieces: fill #C8A87A with diagonal wood
         grain pattern (fine lines at 30% opacity). Black pieces: fill #3D2010
         with darker grain lines.
```

---

# PART 7 — GAME LOGIC & SPECIAL INTERACTIONS

## Pre-Move System
```
Queue move during opponent/bot turn by clicking or dragging a piece.
Source square: rgba(160,80,255,0.35) fill overlay
Destination:   rgba(160,80,255,0.20) fill overlay
On opponent move resolve:
  If pre-move still legal: execute immediately
  If illegal (piece captured, move causes check): silently cancel, clear overlays
Right-click anywhere: cancel pre-move
Status bar: "Pre-move queued" while pending
```

## Promotion UI
```
Pause game on pawn reaching back rank.
Floating popup card appears above (or below for black) the promotion square.
Card: 200px wide, background #161616, border 1px solid #2a2a2a, border-radius 10px,
  padding 8px, box-shadow 0 4px 16px rgba(0,0,0,0.6)
Four piece buttons (Queen, Rook, Bishop, Knight) in a 2×2 grid:
  Each: 80×80px canvas rendering the piece in promoting player's color + current skin
  Border: 1px solid #2a2a2a, border-radius 6px
  Hover: border-color var(--accent), scale(1.05) 150ms ease
Click to promote. Scale-in appear animation (scale 0.8→1.0, opacity 0→1, 150ms ease-out).
ESC: defaults to Queen and closes.
z-index: 1000
```

## Analysis Mode
```
Enter via: "Review" on Game Result screen, or "Analyse" button in right panel
Exit via: "Exit Analysis" button below board

In analysis mode:
  Board shows position at current review move (not live game)
  Navigation: ← → arrow buttons below board (40px tall, full board width, split 50/50)
  Scrubber bar: thin progress bar below nav buttons, draggable, shows current move position
  "ANALYSIS MODE" banner: 32px tall strip below board
    background rgba(--accent, 0.06), border-top 1px solid rgba(--accent, 0.15)
    text: "◆ ANALYSIS MODE" in 11px Cinzel var(--accent), centered

Move classification (AI evaluates each move):
  Best:        🟢  centipawn loss: 0–10
  Good:        🟡  centipawn loss: 10–50
  Inaccuracy:  🟠  centipawn loss: 50–100
  Mistake:     🔴  centipawn loss: 100–200
  Blunder:     💀  centipawn loss: 200+
Icons appear beside each move in Game Record.
Blunder moves: stepping to that move flashes the square red (rgba(220,30,30,0.4), 600ms fade).
Best move arrow: green arrow overlay on board showing engine recommendation.

Accuracy score:
  Formula: 100 - (average centipawn loss / 10), clamped 0–100
  90–100: #00cc44  "Excellent"
  70–89:  #ffcc00  "Great"
  50–69:  #ff8800  "Inaccurate"
  0–49:   #ff3333  "Struggling"
  Both players' scores shown side by side on Game Result screen.
```

## Game Result Screen
```
After checkmate, resign, draw — modal slides in from top.
z-index: 2000
Backdrop: rgba(0,0,0,0.75) covering full viewport

Modal: 440px wide, background #161616, border 1px solid #2a2a2a, border-radius 16px
  Padding: 32px
  Box-shadow: 0 16px 48px rgba(0,0,0,0.6)
  Animation: translateY(-40px→0) + opacity(0→1), 250ms ease-out

Result text: 28px Cinzel, centered
  White Wins: color #F5F0E8
  Black Wins: color #555555
  Draw: color #888888

Reason: 13px Inter #666, centered, margin-top 4px
Stats row: total moves | game duration, 11px Inter #555, centered

Accuracy row: both players side by side
  Each: large number (32px Cinzel in grade color) + grade label (11px Inter #666)
  + player name (11px Inter #888)
  Divider: 1px solid #222 between them

Confetti: on win only — 40 paper square confetti pieces in winner's color
  (ivory for White win, #333 for Black win) fall from top, spread across viewport,
  duration 2s, then stop. CSS animation: translateY + slight rotation + opacity fade.

Buttons (stacked, gap 8px):
  Rematch:  gold gradient, 13px Cinzel #000
  New Game: #1e1e1e bg, #ffcc00 border+text
  Review:   #1e1e1e bg, #888 border+text
  Copy PGN: #1e1e1e bg, #555 border+text (smallest, 11px)
```

## Touch Controls
```
Detect: 'ontouchstart' in window
Piece tap targets: hit area expanded 8px on all sides
Radial move menu on tap:
  Up to 8 destination circles fan out from piece center
  Each circle: 36px diameter, background var(--accent), color #000, 10px Cinzel
    shows destination coordinate (e.g. "e4")
    positioned in the direction of the destination square from piece
  Expand animation: scale(0→1) + opacity(0→1), 200ms ease-out from piece center
  8+ legal moves: show 8 closest + one "more" circle that falls back to dot display
  Tapping a circle: executes the move
Drag: touch events, touchstart/touchmove/touchend, preventDefault on touchmove
Long-press (500ms) on a square: opens annotation color picker popup near the square
  Popup: 4 color circles (green/yellow/red/blue), 24px each, row layout
  Tap a color, then tap destination square to draw arrow
  Or tap same square again to place dot
```

## ELO Rating System
```
ELO is tracked locally in localStorage per username.
Starting ELO for a new player: 1200

ELO calculation after each game (standard formula):
  K-factor: 32 for ELO below 1400, 24 for 1400–1800, 16 for above 1800
  Expected score: 1 / (1 + 10^((opponentElo - playerElo)/400))
  New ELO: oldElo + K * (actualScore - expectedScore)
    actualScore: 1 for win, 0.5 for draw, 0 for loss

Bot ELO:
  Easy:      800
  Medium:    1100
  Hard:      1400
  Impossible: 1700
  Training bot: scales with bot level. Level 1 = 600, Level 10 = 1000, Level 20 = 1300, Level 30 = 1600
  Genesis bot: same scale as training bot but +100 bonus (pure learning premium)

ELO change display:
  After game ends, animate +N or -N beside player ELO on left panel
  +N: color #00cc44, slides up 12px and fades over 3s
  -N: color #ff3333, slides down 12px and fades over 3s

ELO is saved to localStorage under player username.
ELO history: last 50 ELO changes stored for the leaderboard graph.
```

---

# PART 8 — LEADERBOARD SYSTEM

Two separate leaderboard screens, both accessible via the 🏅 icon in the top bar which opens a **Leaderboard Hub** modal first.

## Leaderboard Hub Modal
```
Size: 360×220px, centered, background #161616, border 1px solid #2a2a2a, border-radius 16px
Title: "LEADERBOARDS" in 16px Cinzel #ffcc00, centered, padding-top 20px

Two large cards side by side, each ~150px wide:

ELO Card:
  Background: linear-gradient(135deg, #1a1400, #0e0c00)
  Border: 1px solid #ffcc00
  Border-radius: 12px
  Padding: 16px
  Icon: ♛ at 28px, color #ffcc00, centered
  Title: "ELO RATING" in 12px Cinzel #ffcc00, centered
  Subtitle: "Regular Chess" in 10px Inter #666, centered
  Button: "View Rankings" full-width gold gradient 11px Cinzel #000, margin-top 8px

AI Level Card:
  Background: linear-gradient(135deg, #001a10, #000e08)
  Border: 1px solid #00cc44
  Border-radius: 12px
  Padding: 16px
  Icon: 🤖 at 28px, centered
  Title: "AI TRAINER" in 12px Cinzel #00cc44, centered
  Subtitle: "Bot Level Rankings" in 10px Inter #666, centered
  Button: "View Rankings" full-width, background #00cc44, color #000, 11px Cinzel

Close (X): top-right corner
```

## ELO Leaderboard Screen

```
Fullscreen overlay, z-index: 9992
Background: #0c0a00 — very dark warm black
Border: none (fullscreen)
```

**Header strip**:
```
Height: 64px
Background: linear-gradient(90deg, #1a1400, #0e0c00)
Border-bottom: 1px solid #2a1a00
Padding: 0 24px
Display: flex, align-items: center, justify-content: space-between

Left:  "♛ ELO RANKINGS" in 18px Cinzel #ffcc00
       "Regular Chess" in 11px Inter #666, below
Right: "👤 Your Rank: #4" in 12px Cinzel #ffcc00
       Close X button, 20px, color #555
```

**Your Stats Card** (pinned just below header, always visible):
```
Margin: 16px 20px 0
Background: #1a1400
Border: 1px solid #332800
Border-radius: 12px
Padding: 16px 20px
Display: flex, align-items: center, gap: 20px

Left: avatar circle (40px, same design as profile), username 14px Cinzel #ffcc00 below
Middle:
  Your ELO: 32px Cinzel #ffcc00, centered
  "YOUR RATING" label: 9px Cinzel #666, centered
  ELO change from last game: +12 in #00cc44 or -8 in #ff3333, 11px, beside main ELO
Right:
  W/D/L pills (same design as bot profile card)
  "Rank #N" in 12px Cinzel #ffcc00
```

**ELO History Graph**:
```
Canvas element, height: 100px, width: 100% - 40px margins
Background: transparent
Plot last 50 ELO values as a line chart:
  Line: 1.5px solid #ffcc00
  Area beneath line: linear gradient rgba(255,204,0,0.12) → rgba(255,204,0,0)
  Data point dots: 3px circles in #ffcc00 at each value
  On hover: vertical crosshair line #333, tooltip showing ELO value and date
  Y-axis: min/max auto-calculated from data ±50 buffer, 3 labels at left in 9px Inter #444
  X-axis: no labels (too crowded), just the line
  No border, no box — chart floats cleanly in the card
```

**Leaderboard Table**:
```
Scrollable region, takes remaining height below graph
Padding: 0 20px 20px

Column headers (sticky):
  Rank | Player | ELO | W | D | L | Trend
  11px Inter #555, uppercase, letter-spacing 0.5px
  Border-bottom: 1px solid #2a2a2a, padding-bottom 8px

Each row:
  Height: 52px
  Border-bottom: 1px solid rgba(255,255,255,0.03)
  Hover: background rgba(255,204,0,0.03)

  Rank column (48px):
    1st: gold crown 👑 icon + "1" in 13px Cinzel #ffcc00
    2nd: "2" in 13px Cinzel #aaa (silver tones)
    3rd: "3" in 13px Cinzel #cc8844 (bronze tones)
    4+:  "#N" in 12px Inter #555

  Player column (flex: 1):
    Avatar circle 28px + username 12px Cinzel #ccc beside it
    If this is the current user: subtle left border 2px solid #ffcc00,
      row background rgba(255,204,0,0.04)

  ELO column (72px): 14px Cinzel #ffcc00, text-align right

  W / D / L columns (each 32px): 11px Inter, text-align center
    W: #00cc44, D: #888, L: #ff3333

  Trend column (40px):
    Last 5 games shown as 5 tiny dots in a row (5×5px):
      Win: #00cc44, Draw: #555, Loss: #ff3333
    If player has fewer than 5 games: show available dots
```

**Ranking sources**: since this is local-only, the leaderboard shows:
- Current user (always present)
- All named profiles stored in localStorage from any username created on this device
- Preset "ghost" opponent entries to make the leaderboard feel populated even on first use:
  Ghost entries: 8 hardcoded entries with realistic names and ELO values (850–1680 range),
  labeled with a small 🤖 ghost icon beside their names so the player knows they are not real players.
  Ghost entries are not interactive. They exist purely for visual richness.
- Real entries always rendered above ghost entries at the same rank if ELO warrants it.

**Filter/Sort bar** (between graph and table):
```
Flex row, gap 8px, padding 8px 20px
Pills:
  All | Humans Only | This Week | This Month
  Active pill: background rgba(255,204,0,0.15), border-color #ffcc00, text #ffcc00
  Inactive: same pill style as elsewhere
"This Week" and "This Month" filter by lastPlayedDate within that window.
```

---

## AI Level Leaderboard Screen

```
Fullscreen overlay, z-index: 9992
Background: #000c08 — very dark cool green-black
```

**Header strip**:
```
Height: 64px
Background: linear-gradient(90deg, #001a10, #000e08)
Border-bottom: 1px solid #002010
Padding: 0 24px
Display: flex, align-items: center, justify-content: space-between

Left:  "🤖 AI TRAINER RANKINGS" in 18px Cinzel #00cc44
       "Bot Level Leaderboard" in 11px Inter #555, below
Right: "Your Bot: Level [N]" in 12px Cinzel #00cc44
       Close X button
```

**Tabs below header** (Training vs Genesis):
```
Two pills: [ Training Mode ] [ Genesis Mode ]
Training active: background rgba(255,204,0,0.15), border #ffcc00, text #ffcc00
Genesis active:  background rgba(0,170,204,0.15), border #00aacc, text #00aacc
Inactive: standard dim pill
Tab content switches between Training and Genesis bot rankings.
```

**Your Bot Card** (pinned, changes per tab):
```
Training tab card: gold accent (#ffcc00)
Genesis tab card:  teal accent (#00aacc)

Margin: 16px 20px 0
Background: #0e1a0c (training) or #080e12 (genesis)
Border: 1px solid [accent at 50%]
Border-radius: 12px
Padding: 16px 20px
Display: flex, align-items: center, gap: 20px

Left: avatar skin circle (40px — renders bot's avatar skin, falls back to initials)
      Bot name 13px Cinzel [accent color]
      "Level [N]" badge below name
Middle:
  Level number: 48px Cinzel [accent], centered — the big number
  "BOT LEVEL" label: 9px Cinzel #555, centered
  XP bar below: full width, 4px tall, fill [accent color], shows progress to next level
Right:
  W/D/L pills
  "Rank #N" in 12px Cinzel [accent]
```

**Level History Graph**:
```
Same design as ELO graph but:
  Line color: #ffcc00 (Training) or #00aacc (Genesis)
  Area fill: matching color at 12% opacity → 0
  Plots bot level over time (Y) vs games played (X)
  Shows the growth curve of the bot — starts low and climbs
  Tooltip: "Level [N] after [G] games"
```

**AI Level Table**:
```
Same structure as ELO table but columns:
  Rank | Bot Name | Owner | Level | Games | Win% | Mode

Bot Name: 12px Cinzel #ccc (or [accent] for user's bot)
Owner: 10px Inter #555 (username who owns this bot)
Level: 14px Cinzel [accent for top 3, #ccc for rest]
Games: 11px Inter #666
Win%:  11px Inter, colored: >60% #00cc44, 40-60% #888, <40% #ff3333
Mode pill: "Training" #ffcc00 or "Genesis" #00aacc — tiny 8px pill

Rank 1–3: same crown/medal treatment as ELO table.
User's bot row: same highlighted treatment (subtle left border + bg tint).

Ghost entries for richness:
  8 hardcoded bot entries with creative names ("NeuralNight", "EchoBot", "Tabula"),
  varying levels (8–28), labeled with 🤖 ghost icon.
  Ghost entries mixed throughout the list by rank.

Sort options above table:
  Sort by: Level (default) | Games Played | Win Rate
  Pills, same style as ELO filter bar.
```

---

# PART 9 — CUTSCENE SYSTEM

## Trigger Rules
- Non-pawn captured OR pawn captures non-pawn → cutscene
- Pawn captures pawn → NO cutscene
- **Boss Capture**: Queen captures King → bypass rarity roll, force Unique, show CHECKMATE title card
- Animations toggle off → no cutscenes. Action Captures toggle off → instant captures.

## Rarity System
```
Common: 50% → #00cc44 green    ● icon
Rare:   28% → #4488ff blue     ◆ icon
Epic:   15% → #ffcc00 yellow   ★ icon
Unique:  7% → #ff3333 red      ✦ icon
```

## Intro Sequence
```
Step 1 — Rarity Flash (0.4s):
  Black fullscreen. Rarity color bursts radially from screen center.
  Peaks at 60% opacity, fades to black.
  Cursed piece involved: double peak opacity, add second flash at 0.2s.

Step 2 — Letterbox Slide (0.3s):
  Two black bars (height = 12% of viewport height each) slide in simultaneously
  from top and bottom. Settle and stay for entire cutscene duration.
  Title card lives inside the bottom bar.
  Bars disappear only after onComplete() fires.
```

## First Time Bonus
```
0.5× playback speed via playbackRate multiplier on all timers.
Title card: "NEW!" starburst in rarity color behind cutscene name.
  Starburst: 12-point star shape expanding from 0 to radius 40px, opacity 1→0, 500ms.
  "NEW!" text: 10px Cinzel #fff inside the starburst.
After onComplete(): toast from top-right:
  "First time seeing [Name]! Badge unlocked."
  Badge rendered at 24px radius inside the toast.
```

## Cutscene Streaks
```
Per-game counter increments every time any cutscene fires.

Milestone 3  → "On Fire"      three flame shapes     #ff6600
Milestone 5  → "Rampage"      skull + crossed swords  #cc0000
Milestone 10 → "Unstoppable"  lightning in circle     #aa00ff
Milestone 20 → "Legendary"    crown + radiating stars #ffcc00

On milestone: streak toast from top-left after onComplete().
  Toast: streak badge icon + name + "[N] Cutscenes This Game!"
Active streak badge: bottom-right of title bar, radius 20px.
Resets to 0 on new game.
```

## Daily Challenge System
```
One cutscene per day, PRNG seeded by current date string (same for all players).
Required triggers: Unique=1, Epic=2, Rare=3, Common=5

Reward: targeted badge gets permanent Daily Gold animated border
  Border: #ffd700, pulses opacity 0.6→1.0→0.6 on 2s loop
  Persists forever on that badge in collection screen

"DAILY COMPLETE" toast from top-center:
  Gold burst: 20 gold particle circles fan outward from toast center, 400ms
  Text: "Daily Challenge Complete! ✦"

Progress widget in left panel: badge (20px) + text + bar + fraction.
Widget border turns gold + ✓ on completion.
```

## Cutscene Title Card
```
Inside bottom letterbox bar. Fades in at 0.3s after scene start. Persists until onComplete().
Background: rgba(0,0,0,0.65) strip, full letterbox bar width

Layout (left to right):
  [8px padding]
  [badge radius 24px]
  [12px gap]
  [cutscene name: 14px Cinzel, rarity color, font-weight 500]
  [flex: 1 spacer]
  [rarity icon: 14px, rarity color]
  [flex: 1 spacer]
  [rarity label + percent: 11px Cinzel, rarity color]
  [12px gap]
  [streak badge radius 20px if milestone active]
  [8px padding]

Special states:
  Unique: gold/red particle burst behind the text on fade-in
    20 particles, 3px circles, fan outward 30px, fade 400ms
  Checkmate: bar pulses rgba(80,60,0,0.8) ↔ rgba(0,0,0,0.65) on 0.8s loop
    Rarity label replaced with "CHECKMATE" in #ffcc00
    Center icon replaced with 👑
  First Time: "NEW!" starburst renders behind cutscene name text
```

## Badge System
```
renderBadge(ctx, cutsceneId, triggerCount, x, y, radius)
Must look clean at radius 20 (streak corner), 24 (title bar), 50 (collection card), 64 (trophy room), 100 (modal).

Tier by trigger count:
  0       Locked  border #555555  fill #222222  (padlock icon centered)
  1–9     Gray    border #aaaaaa  fill #333333
  10–24   Green   border #00cc44  fill #003311
  25–49   Blue    border #4488ff  fill #001133
  50–99   Purple  border #aa44ff  fill #220033
  100+    Gold    border #ffcc00  fill #332200

Daily Gold override: animated #ffd700 pulse border replaces normal border.

Badge designs (all drawn with Canvas 2D paths):
  The Execution:   Broadsword pointing downward, X crossing the blade
  Drive-By:        Low-rider silhouette, motion lines, muzzle flash at window
  Sniper Shot:     Circular crosshair reticle, diamond at center intersection
  Meteor Strike:   Three meteors of varying sizes streaking diagonally
  Lightning Duel:  Zigzag bolt, two opposing arrows flanking it
  The Joust:       Two lances crossing X, small shield at their overlap point
  The Inquisition: Gothic arch window outline, starburst inside
  Demolition:      Wrecking ball on short curved chain from upper corner
  Assassination:   Rose silhouette, dagger blade emerging diagonally behind stem
  Regicide:        Crown silhouette, jagged crack running vertically through center
```

## The 10 Cutscenes

**COMMON — "The Execution"** (~2.5s)
Stone platform. Defending piece kneels center in its color and type. Attacking piece walks in from left wearing executioner hood — identifiable by its color, shape, and a small piece-icon chest badge. It raises a broadsword in slow motion. Screen flashes white. Defender shatters into colored fragments matching its piece color. Attacker bows. Fade to black. Title: green.

**RARE — "Drive-By"** (~2s)
City street backdrop. Defending piece on sidewalk in its color. A low-rider car in the attacker's color screeches in from left — attacker's piece icon visible on the car door. Oversized tommy gun emerges. Bullet sparks in attacker's color hit the defender. Defender explodes into colored fragments. Tire screech fades. Title: blue.

**RARE — "Sniper Shot"** (~3s)
Black screen. Sniper scope crosshair drifts slowly and settles on the defending piece standing in a spotlight, rendered in its color. A badge near the scope shows the attacker's piece icon and color. Long tension pause. Gunshot crack. Defender explodes into colored fragments. Shell casing in attacker's color bounces and rings. Fade to black. Title: blue.

**EPIC — "Meteor Strike"** (~3.5s)
Board zooms out to space. A meteor textured with the attacker's piece icon and color screams in from upper right. Defending piece stands below in full color, looks up in horror (googly eyes). Impact — shockwave ring — debris in defender's color flies outward. Crater smokes. Camera slowly zooms back down to board. Title: yellow.

**EPIC — "Lightning Duel"** (~3s)
Dark stormy arena. Attacker and defender face off on opposite sides in full color. They charge toward each other. A massive lightning bolt crashes down at center — bolt crackles in attacker's color. Defender launches backward off screen, bounces off arena wall, crumbles into fragments in their color. Attacker stands victorious, electricity arcing. Thunder boom. Title: yellow.

**UNIQUE — "The Joust"** (Knight, 7%)
Medieval tournament field. Two knights on horseback charge at each other. Left rider colored/shaped like the attacker — attacker's piece icon on shield. Right rider is the defending Knight — their color and Knight silhouette on shield and armor. Lances splinter on contact. Defending Knight ragdolls off horse in a full arc, shatters into colored fragments in the mud. Attacker rides a victory lap. Herald blows a trumpet. Heraldic banner drops bearing the attacker's icon. Title: red.

**UNIQUE — "The Inquisition"** (Bishop, 7%)
Gothic cathedral interior. Gregorian chant plays. Defending Bishop stands center in their color (pale if white, dark if black). Inquisitors in the attacker's color — bearing the attacker's piece icon on their robes — surround the Bishop from all sides. A dramatic finger points. Lightning strikes through a stained glass window shaped like the attacker's piece icon. Bishop obliterates in a holy smite. Colored fragments rain down. A single candle blows out. Title: red.

**UNIQUE — "Demolition"** (Rook, 7%)
Construction site. Defending Rook rendered as a literal castle tower in the defender's color (white stone or dark stone). A wrecking ball painted with the attacker's color and piece icon swings in slow motion from off-screen right. Slow-motion impact. Cracks form across the defender's stone. Tower collapses in a dust cloud of the defender's color. A hard hat in the attacker's color bounces off the rubble. Construction workers in the attacker's color scheme cheer. Title: red.

**UNIQUE — "Assassination"** (Queen, 7%)
Elegant ballroom. Defending Queen waltzes alone in full color — ivory gown and crown if white, dark gown and crown if black. A figure in a tuxedo matching the attacker's color enters, bows, presents a rose. The rose conceals a blade. A quick dramatic slash. The defending Queen explodes into crown and chess fragments in her color. A chandelier sways. Her crown rolls across the marble floor and stops. Title: red.

**UNIQUE — "Regicide"** (King, 7%)
Throne room. Defending King sits on a throne in full regal color — ivory robes if white, dark robes if black. The doors burst open. A mob floods in — every member wears badges, hats, and flags bearing the attacker's piece icon in the attacker's color. The King stands defiantly, raising a scepter. The mob overwhelms him. Screen shakes. Fade to black. The King's crown hits the stone floor in his color and rolls slowly to silence. Title: red.

**CHECKMATE (Boss Capture — Queen takes King)**
Forces the Unique cutscene for the King (Regicide). Title card shows CHECKMATE variant: no rarity percent shown, center icon is 👑, "CHECKMATE" text in pulsing gold replaces rarity label. Title bar background pulses gold.

---

# PART 10 — COLLECTION & STATS SCREENS

## Collection Screen
```
Fullscreen overlay, z-index: 9996
Opened via 🏆 in top bar
Background: #111111, vignette: radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.6) 100%)
Title: "CUTSCENE COLLECTION" — 20px Cinzel #ffcc00, centered, padding-top 24px
Close X: top-right, 20px, color #555, hover #aaa

Tabs: Cutscenes | Achievements | Streaks | Trophy Room
  Tab strip: flex row, centered, gap 8px, margin: 16px 0
  Tab pill: same pill style as global tab pattern

Summary strip (below tabs):
  4 stats in a row: unlocked count | total captures | rarest ever | daily progress
  Each: 11px Inter #666 label, 13px Cinzel #aaa value, separated by 1px #222 dividers
  Padding: 10px 24px, border-bottom 1px solid #1a1a1a

Sort & Filter (below summary):
  Sort dropdown: standard styled dropdown, 11px Inter, options: Name A–Z / Rarity / Trigger Count / Badge Tier
  Filter pills: All | Unlocked | Locked | Common | Rare | Epic | Unique
    Active filter: rarity color background (dim) + rarity color text + rarity color border
  Both controls in a flex row, gap 12px, padding 8px 24px
  Filter/sort applies instantly with smooth layout re-flow (300ms)
```

**Cutscene cards (3-column grid)**:
```
Card: background rgba(255,255,255,0.03), border 1px solid rgba(255,255,255,0.06),
  border-radius 12px, padding 16px, text-align center
  On hover: border-color [rarity color at 60%], box-shadow 0 0 16px [rarity color at 15%]
  Locked card: entire card at 50% opacity, hover: 60% opacity

Contents:
  Badge canvas: radius 50px, centered, rotates 360° on hover (animation 1s linear)
  Name: 12px Cinzel, rarity color. Locked: "???" in #333
  Rarity + percent: 10px Cinzel, rarity color, below name
  "Triggered: 14×": 10px Inter #555
  Tier label: "◆ Blue Tier" in 10px Cinzel, tier color
  Progress bar: full width, 4px, background #1a1a1a, fill in tier color. "MAX" text at Gold.
  Daily Gold badge: gold pulsing border on badge canvas if earned
  Hover preview: after 0.5s hover, 160×90px canvas fades in below badge showing
    1-second looping preview of cutscene's key moment. Fades out when hover ends.

Stagger fade-in on open: left→right, 60ms delay per card, opacity 0→1 + translateY(8px→0)
```

**Achievements tab**: earned = rarity color card + earned date + icon. Unearned = dim + description hint as "How to earn" text. Same stagger animation.

**Streaks tab**: best ever streak (large number display) | current game streak | 4 milestone badge cards | session timeline bar (horizontal bar showing cutscene count per game in current session).

**Trophy Room tab**:
```
Title: "TROPHY ROOM" 18px Cinzel #ffcc00, centered
Background texture: repeating-linear-gradient(90deg, rgba(80,50,20,0.04) 1px,
  transparent 1px, transparent 40px) + same 0deg — simulates dark wood paneling

5×2 grid of badges at radius 64px, centered, gap 20px
Below each: cutscene name (11px Cinzel, rarity color) + tier label (10px tier color)
Locked: dark padlocked circle

Click any badge → modal:
  Badge at radius 100px, centered in modal
  Trigger count: 20px Cinzel #ffcc00, "Triggered N times"
  Tier progress bar: full width, 6px tall
  Earned date or "Not yet unlocked"
  "Preview Cutscene" button: triggers cutscene preview loop in a 280×160px canvas within modal
```

## Stats Screen
```
Fullscreen overlay, z-index: 9995, opened via 📊 in top bar
Background: #0e0e0e
Title: "STATISTICS" 20px Cinzel #ffcc00, centered, padding-top 24px

Sections (stacked, internal scroll):

1. Piece Kill Counter
   8-column table (piece types as rows, attacker/defender split):
   Each piece row: piece icon (20px) | piece name (11px Cinzel #888) | as-attacker count | as-defender count
   Header: "Attacker" | "Defender" in 10px Inter #555
   Most deadly piece: 🗡️ icon beside it, row background rgba(0,204,68,0.05)
   Most captured: 💀 icon, row background rgba(255,51,51,0.05)

2. Cutscene Frequency Bar Chart
   Canvas-rendered horizontal bars, one per cutscene
   Each bar: cutscene name (10px Inter #888) left-aligned, bar fills right proportional to trigger count
   Bar color: rarity color of that cutscene
   Trigger count number at bar end (10px Cinzel rarity color)

3. Rarity Breakdown Donut Chart
   Canvas-rendered donut, 140px diameter, 20px ring width
   Segments: Common (green) / Rare (blue) / Epic (yellow) / Unique (red)
   Legend: rarity name + percentage, 10px Inter, beside chart
   Center text: "Total" label + total trigger count

4. Session History
   Scrollable log, max-height 240px, styled thin scrollbar
   Each entry: timestamp | attacker piece+color icon | "→" | defender piece+color icon |
     cutscene name (11px Cinzel rarity color) | rarity badge icon | flags (✦ NEW, 🔥 STREAK)
   Alternating row backgrounds rgba(255,255,255,0.015) / transparent
```

---

# PART 11 — ACCOUNT, DAILY CHALLENGE, CURSED PIECES

## Account & Username System
```
First load modal (if no username in localStorage):
  Centered card: 360px wide, background #161616, border #2a2a2a, border-radius 16px, padding 32px
  Logo: "♟ CHESS" 28px Cinzel #ffcc00, centered
  Welcome: "Welcome to Mered" 14px Inter #888, centered
  Username input: full-width, standard styled input, placeholder "Choose a username"
    Validation: 3–20 chars, alphanumeric + underscores only
    Error state: border-color #ff3333, error message below in 10px Inter #ff3333
  "Start Playing" button: gold gradient, 13px Cinzel #000, full-width
  Backdrop: rgba(0,0,0,0.8) fullscreen

Username in top bar: "👤 [username]"
Gear icon beside it: opens rename modal (same design, pre-filled)
```

## Leaderboard (Local Multiplayer Rivalry)
```
Two players on same device, tracked separately by username in localStorage.

Rivalry bar (visible during multiplayer games, shown in status bar area):
  Horizontal split bar, full panel width
  Left half: Player 1 fill in #4488ff, proportional to trigger count
  Right half: Player 2 fill in #ff6600
  Center pivot line: 1px solid #333
  Labels: "P1" left, "P2" right, in 9px Cinzel, respective color

"[Player] is dominating!" or "Tied!" below bar, 10px Inter #666

Game Summary modal at game end:
  Both players' stats: cutscenes triggered this game, rarest triggered, streak badges earned
  Winner (most triggers): highlighted with gold border
  Losers or ties: standard styling

P2 turn indicator: "P2 Turn" badge in top bar (design in TOP BAR section)
```

## Cursed Piece Mechanic
```
Track per-game cutscene trigger count per individual piece (identified by starting square ID).

3 triggers:
  Glow ring: rgba(255,100,0,0.4) around piece, radius = square/2 + 4px
  Pulse: opacity 0.4→0.6→0.4, 1.5s sine loop
  Label: "🔥 CURSED" in 9px Inter #ff6600, above the piece, centered

5 triggers:
  Glow: rgba(255,40,0,0.6), pulse faster (1s loop)
  Label persists

7+ triggers:
  Glow: rgba(200,0,0,0.8), erratic pulse (random interval 0.3–0.8s)
  Spark particles: 3–4 tiny circles (2px, #ff4400) spawn randomly on piece edges every 0.5s,
    drift outward 8px and fade over 0.4s
  Rarity flash doubles in intensity (double peak opacity) when this piece is involved in a capture

Cursed state resets to 0 on new game.
```

---

# PART 12 — SKIN & COSMETICS SYSTEM

## Overview
All cosmetics (piece skins, board skins) are shared across regular chess, Training Mode, and Genesis Mode. Unlocked in any mode, usable everywhere. Skins have locked/unlocked state in localStorage.

## Economy Rules (confirmed, do not deviate)

**Cosmetics are NEVER purchasable with real money.** Real money only applies to gameplay microtransactions in the bot modes (Training Mode and Genesis Mode). Multiplayer chess has zero microtransactions of any kind.

**Gameplay microtransactions (bot modes only):** hints, takebacks, analysis tools, time extensions, Training Accelerator. These are consumables that help you play better — not cosmetics.

**Free skins (available from game start, no unlock required):**
- Piece skins: ~half of Common (4 of 8), ~quarter of Rare (1-2 of 6), 1 Epic
- Board skins: ~half of Common board themes, 1 Rare board theme
- Default Classic board + Classic piece style always free

**Chest unlock system:**
- Defeat bots → earn coins → spend coins to open chests → chests drop skins (rarity weighted)
- Better bots drop better chests and more coins
- All remaining skins (Rare through Mythic II) are earned exclusively through chest drops
- No duplicate problem yet defined — add shard/XP fallback when implementing

**Multiplayer board skin system (confirmed design):**
- Each player has their own board skin for their half of the board
- Rows 1-4 (black's side): black player's board skin
- Rows 5-8 (white's side): white player's board skin
- A subtle dashed seam separates the two halves
- **Split Board toggle**: players can toggle this on/off. When off, a single unified board skin is used (white player's skin). Piece skins are always per-player regardless of split mode.
- This is a confirmed UX decision the user likes.

## Customize Screen
```
Opened via 🎨 in top bar
Fullscreen overlay, z-index: 9994
Background: #0e0e0e

Header:
  "🎨 CUSTOMIZE" in 18px Cinzel #ffcc00, left-aligned, padding 20px 24px 0
  Close X: top-right

Tabs: Pieces | Board | Favorites
  Same pill tab style as collection screen
```

**Pieces Tab Layout**:
```
Two-column layout:
  Left column: 220px — piece selector grid + W/B toggle
  Right column: flex 1 — zoom preview panel (top) + skin grid (bottom, scrollable)
  Divider: 1px solid #222, vertical
```

**Left column — Piece Selector**:
```
W / B slot toggle above grid:
  Two segments: [ W ] [ B ], total width 80px
  Active: accent color bg, dark text. Inactive: #1e1e1e bg, #555 text
  Margin-bottom: 12px

2×3 grid of piece cards (Pawn Knight Bishop / Rook Queen King):
  Card: 80×90px, background #1e1e1e, border 1px solid #2a2a2a, border-radius 10px
  Content: 48×48px skin preview canvas centered + piece name 10px Cinzel #666 below
  Default: dim border. Hovered: border #444, translateY(-2px). Selected: border 2px solid var(--accent),
    box-shadow 0 0 12px rgba(255,204,0,0.2)
  Transition: all 150ms ease

  Random Favorites die button (per card):
    Position: absolute bottom-right, 4px from edges
    Size: 18×18px, background transparent, border none
    Icon: 🎲 at 12px
    Inactive: color #333. Active: color #ffcc00, background rgba(255,204,0,0.1), border-radius 3px
    When active: die icon pulses opacity 1.0→0.6→1.0 on 2s loop
    When active: piece card preview cycles through favorited skins:
      Crossfade between skins over 400ms, interval 1.5s
```

**Right column — Zoom Preview Panel**:
```
Panel: background #1a1a1a, border 1px solid #2a2a2a, border-radius 12px, height 220px
  Display: flex, align-items center, justify-content center

Inside: Canvas 240×240px (scaled to fit panel)
  Renders a 3×3 board section using active board skin
  Center square: highlighted with selection tint (rgba(--accent, 0.25))
  Center piece: selected piece rendered at ~2.5× normal scale with active skin
  8 surrounding squares: standard board squares in active board skin

When piece card is clicked:
  150ms fade-out → piece swap → 150ms fade-in on zoom canvas

When Random Favorites active:
  Zoom canvas cycles skins in sync with piece card (same 1.5s/400ms rhythm)

Skin name label below canvas:
  12px Cinzel var(--accent), "[Skin Name] — Equipped" or "— Preview"
  Text-align center, margin-top 8px

Transition when switching pieces: 150ms opacity fade
```

**Right column — Skin Grid**:
```
Below zoom panel
Grid: 3 columns, gap 8px, overflow-y auto, max-height calc(100vh - 400px)
Scrollbar: 3px, #333 thumb, transparent track
Padding-right: 4px (space for scrollbar)

Rarity section dividers between groups:
  Height 24px, flex row centered, gap 8px
  Left line: flex 1, height 1px, background [rarity color at 30%]
  Center label: [rarity name] in 10px Cinzel [rarity color]
  Right line: same

Skin cards:
  Background #1e1e1e, border 1px solid #2a2a2a, border-radius 8px, padding 10px 8px
  Display flex column, align-items center, gap 6px, cursor pointer
  Transition: all 150ms ease

  Preview canvas: 52×52px. Locked: grayscale + 40% opacity.
  Skin name: 10px Inter #ccc (unlocked) / #444 (locked). 2 lines max, ellipsis.
  Rarity badge:
    Font: 9px Cinzel. Padding: 2px 6px. Border-radius: 10px.
    Common: bg #222 text #aaa
    Rare:   bg #001133 text #4488ff
    Epic:   bg #1a1000 text #ffcc00
    Unique: bg #1a0000 text #ff3333
    Mythic I: bg #0d0020 text animated (3s cycle #aa44ff→#ffcc00→#fff)
    Mythic II: bg #000 text animated (2s cycle #ff00aa→#ffcc00→#00ffff→#aa44ff)

  States:
    Hovered (unlocked): border #444, translateY(-2px)
    Hovered (locked): border #333, shows tooltip "Unlock in Training/Genesis Mode"
    Active (equipped): border 2px solid var(--accent), checkmark ✓ in top-right of preview
    Lock overlay: rgba(0,0,0,0.6) over preview, 🔒 18px centered, "Training" or "Genesis" 8px below
    Heart button: absolute top-right, 14px ♡/♥. Inactive: #333. Favorited: #ff3333, bounce anim.
```

**Board Tab**:
```
Left column: 4×4 mini board live preview (180×180px canvas)
  Light squares use White player's board skin
  Dark squares use Black player's board skin
  Updates live as skins are clicked
  W/B toggle above preview to switch which slot is being edited
  Label below: "White: [name]  |  Black: [name]" 10px Inter #555

Right column: same skin grid as Pieces tab but for board skins.
```

**Favorites Tab**:
```
Title: "FAVORITES" 14px Cinzel #ffcc00, padding 20px 24px 0

Shuffle All button (top-right):
  Background: linear-gradient(135deg, var(--accent), #ff9900)
  Color: #000, font: 12px Cinzel, padding: 6px 14px, border-radius: 8px
  Label: "🎲 Shuffle All"
  On click: equips a random favorite for every piece with favorites, 150ms flash each

6 piece sections + 1 board section, each collapsible:
  Header: "[Piece Name] — [N] favorites" in 11px Cinzel #888 + chevron
  Content: horizontal scrolling row of favorite skin cards (64×80px each, same card design)
  Empty: "No favorites yet — heart a skin to add it here" in 10px Inter #444

Empty state (no favorites at all):
  Chess piece silhouette SVG centered, "No favorites yet" 14px Cinzel #555,
  "Heart a skin to add it here" 12px Inter #444
```

## Skin Rendering System

**Canvas layers for skins**:
- Static skins: rendered as part of the board canvas pass (no separate loop)
- Animated skins: each has its own independent rAF loop. Max 3 animated piece skins active simultaneously on board. Lower-rarity ones fall back to their base color if over limit.
- All skin animation loops pause when `cutsceneActive = true`
- Mythic board skins (Living Cosmos, Eternal Flame): single unified canvas pass for whole board. Disable piece skin animations while active.
- Avatar skin in bot profile card: its own rAF loop targeting the avatar canvas. Pauses when any overlay is open.

**Performance warning toast**:
```
Triggers when: Mythic board skin + 2+ animated piece skins equipped simultaneously
Text: "⚠ High performance skin combination — some animations reduced"
Background: rgba(255,136,0,0.15), border 1px solid #ff8800
Duration: 5 seconds
```

---

# PART 13 — PIECE SKINS

## Skin Library — Complete (44 skins across 6 rarities)

### Free From Start (no unlock required)
```
Piece skins free at launch:
  Common (free):  Default, Crimson Red, Ocean Blue, Forest Green, Sunburst Orange  (4 of 8)
  Rare   (free):  Frosted Glass                                                     (1 of 6)
  Epic   (free):  Neon Pulse                                                        (1 of 6)
All others require chest drops from the bot trainer.
```

### Rarity Summary
```
Common   (8):  Default, Crimson Red, Ocean Blue, Forest Green, Sunburst Orange,
               Violet Purple, Arctic Teal, Dusty Rose, Charcoal
               [Note: Default + 4 color skins are free; remaining 3 are chest-only]

Rare     (6):  Frosted Glass, Brushed Steel, Warm Marble, Obsidian Stone,
               Bone Ivory, Onyx
               [Frosted Glass is free; remaining 5 are chest-only]

Epic     (6):  Static Shock, Molten Core, Neon Pulse, Prism Shift,
               Void Drift, Deep Current
               [Neon Pulse is free; remaining 5 are chest-only]

Unique  (12):  Per-piece skins — 2 per piece (Pawn, Knight, Bishop, Rook, Queen, King)
               Last Bloom, Dying Star (Pawn)
               Singularity, Between Worlds (Knight)
               The Revelation, Permafrost (Bishop)
               Thunderwall, Fallen Citadel (Rook)
               The Pale Court, The Deep (Queen)
               Ascension, The Long Winter (King)
               [All chest-only]

Mythic I (6):  One per piece — iridescent, otherworldly
               First Light (Pawn), The Haunting (Knight), Spectrum (Bishop),
               Undying (Rook), Borealis (Queen), The Dying Sun (King)
               [All chest-only, very rare drop]

Mythic II(6):  Rarest possible — one per piece
               The Origin (Pawn), Riftwalker (Knight), The Rapture (Bishop),
               Last Bastion (Rook), The Cosmos (Queen), The Eternal (King)
               [All chest-only, extremely rare — The Eternal is rarest at 0.05%]
```

### Rarity Colors (UI display)
```
Common:   #aaaaaa
Rare:     #4488ff
Epic:     #ffcc00
Unique:   #ff3333
Mythic I: #cc44ff  (animated in UI)
Mythic II:#ff44aa  (animated in UI)
```

---

## Common Piece Skins (solid flat fills)
Render as solid Canvas 2D path fills. No gradient, no texture. Same bezier silhouette as Classic piece style, different fill color.

Colors: Crimson Red `#cc2222` | Ocean Blue `#2255cc` | Forest Green `#228833` | Sunburst Orange `#dd7700` | Violet Purple `#7722cc` | Arctic Teal `#117788` | Dusty Rose `#cc6688` | Charcoal `#444444`

## Rare Piece Skins (static material effects)
- **Frosted Glass**: base fill `rgba(200,220,255,0.5)` over white. Fine horizontal refraction lines at 20% opacity spaced 3px. 1px bright white outer stroke. 0.5px dark blue inner shadow stroke.
- **Brushed Steel**: linear gradient `#888→#ccc→#999` vertical. Fine horizontal grain lines 5% opacity spaced 2px. Slight specular highlight at top.
- **Obsidian Stone**: fill `#111118`. Faint purple crystalline facet lines radiating from center at 15% opacity. 0.5px `#6633aa` outer edge stroke.
- **Warm Marble**: fill `#f0e8d8`. Curved gray/gold vein lines as bezier paths at 30% opacity.
- **Bone Ivory**: fill `#e8dfc0`. Subtle cross-hatch at 8% opacity. Warm brown 0.5px stroke.
- **Onyx**: fill `#0a0a0a`. Matte black. 0.5px `#222` stroke only. No internal detail.

## Epic Piece Skins (animated — independent rAF loops)
All clip strictly to piece silhouette boundary. Pause when `cutsceneActive = true`.

- **Static Shock**: dark electric blue `#001133` base. Branching lightning segments spark randomly across piece (recursive random branching). Each bolt: 60ms, then fade. 3–5 simultaneous. Color `#88ccff→#ffffff`.
- **Molten Core**: dark gray `#1a1a1a` base. 3–4 lava crack paths pulse orange/red glow (`#ff6600→#ffcc00`). Cracks wiggle ±2px on 2s sine. Glow radius 4px. Background pulses `#1a1a1a→#2a1000`.
- **Deep Current**: deep navy `#001133` base. 2–3 slow swirling water current paths (sin/cos motion). Particles: 2px circles `rgba(100,180,255,0.6)` following curved paths, fading. Occasional 2px bubble floats upward.
- **Neon Pulse**: `#0a0a0a` base. Piece outline as glowing neon stroke cycling through hue 360° over 6s using `hsl(hue,100%,60%)`. Stroke 2px. Inner glow same color at 30% opacity via multiple strokes.
- **Void Drift**: `#080010` base. 30–40 tiny 1px star particles drift in random directions within clip, wrap at edges. Occasional shooting star streaks in 200ms.
- **Prism Shift**: rotating gradient cycling through `hsl(hue,60%,70%)` where hue increments 0.5°/frame. Entire piece surface shifts color. Outer stroke 1px complementary color.

## Unique Piece Skins (2 per piece — dramatic, may bleed slightly outside boundary for particles/glow)

### Pawn
- **Last Bloom** *(id: last-bloom)*: The pawn carries the weight of something beautiful and temporary. Fill pale pink `#f4c0cc` with gradient to white at top. Spawn pink petal particles (small 4-point path shapes) from base continuously. Float upward at slight random angle, rotate slowly, fade over 1.5s. 3–5 active. Gentle sine drift sideways. The piece looks like a pawn walking through falling cherry blossoms — poetic and melancholy.
- **Dying Star** *(id: dying-star)*: The pawn glows from within like a coal on the edge of extinction. Fill coal gray `#1a1008`, warm orange inner glow `rgba(255,100,0,0.2)` pulsing 2s. Spawn tiny ember sparks (1–2px circles `#ff8800→#ffcc00`) from top. Float upward slowly, fade 1s. 5–8 active. Occasional flare spawning 3–4 simultaneously. The pawn burns brightest right before it goes out.

### Knight
- **Singularity** *(id: singularity)*: The Knight has passed through the event horizon of a black hole and come back changed. Pure black `#000000` silhouette. Faint blue/white distortion ring (0.5px `rgba(100,200,255,0.5)`) pulses outward from edge every 3s. Inside: 20–30 tiny white star particles spiral slowly inward toward center, disappear, respawn randomly. Light cannot escape it.
- **Between Worlds** *(id: between-worlds)*: The Knight exists in two places simultaneously — a quantum superposition, never fully committed to either reality. Fill `rgba(180,180,200,0.65)`. Opacity pulses 40%→90% on 3s sine. Second ghost silhouette 3px offset (right+down) at `rgba(255,255,255,0.15)`, static. The Knight is never fully here.

### Bishop
- **The Revelation** *(id: the-revelation)*: The Bishop has seen something no mortal should witness and now radiates divine light from every edge. Fill warm gold `#c8a020`. From mitre tip: 8 rotating beam lines (length 20px beyond tip, width 1.5px, `rgba(255,220,80,0.6)`). Rotate clockwise, 1 full revolution/8s. Soft radial glow at tip pulses gently. Wherever this Bishop stands, it is the brightest thing on the board.
- **Permafrost** *(id: permafrost)*: The Bishop has been frozen for ten thousand years and is only now beginning to crack. Fill deep ice blue `#0a2a4a`, faint cyan inner glow. 2–3 crack paths travel across piece: each crack starts as thin line extending over 1s then fades 0.5s. Color `#00ccff` at 80%. Short (10–20px) jagged bezier segments. Crystalline shimmer pulse every 4s (brief bright overlay fades in 200ms, out 400ms).

### Rook
- **The Thunderwall** *(id: thunderwall)*: A fortress that generates its own weather. Fill dark electric gray `#0a0a1a`. Battlements glow electric blue `rgba(80,160,255,0.3)`. Lightning arcs between random battlements every 2–4s. Thin branching path, 60ms flash, color `#88ccff`. Between strikes: faint static texture (fine noise dots 5% opacity) shifts slowly. The storm never stops.
- **Fallen Citadel** *(id: fallen-citadel)*: A castle slowly being reclaimed by time. Fill aged stone `#3a3530`. Continuously spawn debris particles (2–3px irregular shapes `#5a5550→#2a2520`) from random piece edges. Each falls with gravity, rotates, fades over 0.8s. 4–6 active. Piece has slow base-to-top color oscillation (slightly lighter→darker, 6s loop). Entropy made visible.

### Queen
- **The Pale Court** *(id: pale-court)*: The Queen rules over a kingdom of ghosts and cold light. Fill near-white `#f8f8ff`, faint blue core gradient at base. Flame particles rise from crown and base: elongated teardrop paths `rgba(255,255,255,0.8)` at base grading to `rgba(180,200,255,0.3)` at tip. 6–8 flames active. Rise 12–20px above piece, sway sine, fade as they rise. Piece has luminous glow 4px beyond boundary `rgba(220,230,255,0.15)`. Ethereal and utterly silent.
- **The Deep** *(id: the-deep)*: The Queen descended into the ocean trench and was transformed by what lives there. Fill deep ocean black `#000810`. Every 2s: bioluminescent pulse travels up piece — thin bright line `#00ffaa` at 60% opacity traces outline from bottom to top over 0.8s then fades. 3–4 particle dots `rgba(0,255,150,0.4)` trail the line. Between pulses: faint deep blue ambient glow. She carries the darkness with her.

### King
- **Ascension** *(id: ascension)*: The King has transcended mortality entirely. Fill brilliant gold `#ffd700`, near-white `#fffff0` core at center. Crown crackles: thin bolt arcs between crown points every 0.5–1s, color `#ffee44`. Main aura: 12–16 flame licks extend outward in all directions, each an elongated teardrop in `#ffaa00→#ff6600` gradient, 10–18px long, swaying on independent sine waves at slightly different frequencies. Gold spark particles (1–2px circles `#ffcc00`) rise from all edges continuously. Piece boundary glows 6px wide gold radial at 50% opacity. The most powerful thing on the board, visually and narratively.
- **The Long Winter** *(id: long-winter)*: The King who outlasted every war by becoming as cold and patient as ice itself. Fill regal deep blue `#0a1a3a`. 6 thin arc segments orbit piece perimeter at different radii (12/16/20px beyond edge), different speeds (slow CW, slightly faster CCW). Arc color `rgba(100,180,255,0.4)`. Frost crystallization: every 3s, branching fine lines `rgba(180,220,255,0.5)` grow outward from one edge over 1.5s, melt back over 1.5s. Slow aurora shimmer `#004488→#88ccff` on 4s loop. Endless. Patient. Cold.

## Mythic I Piece Skins (one per piece — iridescent pulse, rarer than Unique)

- **Pawn — First Light** *(id: first-light)*: The pawn at the dawn of everything, before the universe decided what it was. Deep space `#080018` base. 25–30 star dots twinkle independently (random 1–3s opacity cycles). Color shifts navy→violet→teal on 6s loop. Comet particle streaks diagonally every 4–6s (3px dot, 15px fading trail, 200ms). The very first light, still traveling.
- **Knight — The Haunting** *(id: the-haunting)*: A Knight that refuses to accept it is gone, flickering between where it was and where it is. Dark charcoal `#111114` base. Silhouette edge warps: subtle sin-wave distortion ±1.5px on 2s loop. 3–4 offset ghost silhouettes at different offsets (2–5px) and opacities (5–15%), cycling out of phase. It leaves echoes everywhere it goes.
- **Bishop — Spectrum** *(id: spectrum)*: The Bishop that has fractured white light into every color simultaneously and wears them all at once. Pure white `#ffffff` base. Rotating rainbow gradient sweeps piece surface (hue increments 1°/frame). Soft glow radiates onto board square: `rgba(hue-color, 0.1)` circle beneath piece, radius = square size, color follows hue rotation. The Bishop changes the color of everything around it.
- **Rook — Undying** *(id: undying)*: A fortress that has been destroyed and rebuilt so many times it is now rebuilding itself eternally. Warm sandstone `#3a3020` base. Perpetual slow construction: second Rook outline drawn above piece at varying offsets, completing over 3s, holding 1s, resetting. Construction lines `rgba(255,220,120,0.4)`. Dust particles `rgba(200,180,140,0.3)` drift from battlements between cycles. It will never fall permanently.
- **Queen — Borealis** *(id: borealis)*: The Queen crowned with the northern lights, ruling a kingdom at the edge of the world where the sky is always on fire. Deep indigo `#080020` base. Aurora wave bands drift upward: horizontal sine-wave colored bands in deep greens/purples/teals at 20% opacity, different speeds per band. Crown emits soft light upward: `rgba(100,255,200,0.08)` cone 15px above crown, 30px wide at base. She wears the sky like a cloak.
- **King — The Dying Sun** *(id: dying-sun)*: A King in the final moments of his reign, expanding outward as he fades — the most light he has ever given, right at the end. Brilliant white-gold `#fff8e8` base. Every 4s: ring expands outward from piece center, starting at piece boundary, expanding to full square boundary in 0.8s. Ring: `rgba(255,240,180,0.8)→0` as it expands. Ring width: 4px→0.5px. Board square briefly brightens during pulse. Constant warm golden glow 6px beyond piece boundary. The brightest moment is always the last.

## Mythic II Piece Skins (rarest possible — King and Queen are rarest of all)

- **Pawn — The Origin** *(id: the-origin)*: The pawn that contains the entire universe within it — the single point before the big bang. Pure white singularity `#ffffff` core with strong glow. 8 primary particle beams expand outward at equal angles, very slowly (3s to reach square edge). Particles fade as they travel. New particles spawn at center continuously. Everything came from this.
- **Knight — Riftwalker** *(id: riftwalker)*: The Knight that has torn a hole through reality and uses it to move. Dark `#0a0008` base. Silhouette flickers abruptly between two positions 2–3px apart at 8fps (abrupt digital stutter). Behind each position: brief ghost in gold `rgba(255,200,0,0.3)` and deep red `rgba(200,0,50,0.3)`. Chromatic aberration — the Knight exists in two dimensions simultaneously and neither completely.
- **Bishop — The Rapture** *(id: the-rapture)*: The Bishop who was taken upward and is now somewhere between here and heaven, slowly ascending. Pure luminous white `#ffffff`. Piece levitates: 2px up + 2px down, 3s sine wave. Feather-particle wisps (elongated teardrops `rgba(255,255,255,0.5)`) drift upward from all edges continuously, fade rising 20px. Column of soft white light extends from mitre tip upward 30px beyond board square (`rgba(255,255,255,0.06)` rectangle, 8px wide). It is always leaving.
- **Rook — The Last Bastion** *(id: last-bastion)*: The only fortress left standing after everything else has burned. Absolute black `#000000`. Deep red subsurface lava glow: `rgba(200,30,0,0.15)` radial gradient pulses 10%→25% opacity on 2s cycle. Heat distortion at piece edges: thin translucent shimmer lines (1px `rgba(255,80,0,0.1)`) drift slowly upward from lower edges. Every 5–8s: brief surface crack flashes (deep red line, 100ms, single bezier arc). Still standing. Still burning.
- **Queen — The Cosmos** *(id: the-cosmos)*: The Queen who consumed an entire galaxy and now carries it within her. Living galaxy within silhouette: 40–50 star dots at varying opacities. 2–3 nebula cloud blobs (large radial gradients `rgba(100,50,200,0.15)` and `rgba(50,100,200,0.15)`) rotate slowly around piece center. Bright central star at geometric center. Border slowly cycles Mythic II colors. Crown: 5 thin spectrum-colored rays (15% opacity, 20px long) fan upward like a prism. She contains worlds.
- **King — The Eternal** *(id: the-eternal, absolute rarest — 0.05% per Genesis Chest)*: The King who predates the board, the game, and the concept of kings — who simply *is*. Fill brilliant gold-white `#fffaf0`. Within silhouette: miniature solar system — bright central sun (8px radial gradient `#ffee88`), 3–4 planet circles (4–6px) orbiting at different radii and speeds, each leaving a faint orbital trail. Crown blazes: from each crown point, a 6px bright gold beam radiates 12px outward constantly. Every 8–12s: shockwave pulse fires across the ENTIRE BOARD CANVAS — ring expands from King across all 64 squares, `rgba(255,220,100,0.4)→0` over 1.5s. All other pieces shimmer briefly as the shockwave passes. Constant warm gravitational glow 8px beyond piece boundary. When this piece is on the board, the board belongs to it.

---

# PART 14 — BOARD SKINS

## Board Skin Library — Complete (28 themes across 6 rarities)

### Free From Start
```
Classic Oak  (Common) — always free, the default board
Walnut Wood  (Rare)   — one free Rare board skin
```

### Rarity Summary
```
Common  (5):  Classic Oak, Midnight Steel, Walnut Wood*, Desert Sands, Ash & Bone
              [Classic Oak always free; Walnut Wood is the free Rare; rest are chest-only]
              *Walnut Wood listed in Rare below — the free Rare slot

Rare    (5):  Walnut Wood (FREE), Marble Palace, Stone Dungeon, Royal Velvet, Gilded Throne,
              Sakura Garden
              [Walnut Wood free; others chest-only]

Epic    (6):  Ember Grid, Bioluminescent, Toxic, Deep Ocean, Arctic Ice, Void
              [All chest-only]

Unique  (5):  Lava Field, Storm Grid, Northern Lights, Blood Moon, Cursed Ruins
              [All chest-only]

Mythic I(4):  Neon Circuit, Prism Storm, Solar Flare, The Abyss
              [All chest-only, very rare]

Mythic II(3): The Cosmos, The Rift, Singularity
              [All chest-only, extremely rare]
```

### Full Theme Definitions (sq skin + border + base colors)
```
ID                  Name              Rarity   Sq Skin          Border    Light      Dark
─────────────────────────────────────────────────────────────────────────────────────────
classic-oak         Classic Oak       Common   default          Classic   #F0D9B5    #B58863
midnight-steel      Midnight Steel    Common   default          Midnight  #3a3d4a    #1a1d28
desert-sands        Desert Sands      Common   desert           Classic   #d4aa66    #3a1a08
ash-bone            Ash & Bone        Common   ash-bone         Midnight  #d8d0c0    #2a2a2a
walnut-wood         Walnut Wood       Rare*    walnut-wood      Classic   #8a5830    #2a1808
marble-palace       Marble Palace     Rare     marble           Marble    #e8e0d4    #3a3430
stone-dungeon       Stone Dungeon     Rare     stone-dungeon    Stone     #6a6560    #1e1c1a
royal-velvet        Royal Velvet      Rare     royal-velvet     Royal     #8a2040    #3a0818
gilded-throne       Gilded Throne     Rare     gilded           Gilded    #c8a020    #1a1400
sakura-garden       Sakura Garden     Rare     sakura           Sakura    #f4d8e0    #2a0e18
ember-grid          Ember Grid        Epic     ember-grid       Stone     #c8a060    #1a0800
bioluminescent      Bioluminescent    Epic     bioluminescent   Midnight  #0a1420    #000810
toxic-waste         Toxic             Epic     toxic            Midnight  #1a2a0a    #040800
deep-ocean          Deep Ocean        Epic     deep-ocean       Midnight  #0a2840    #000a18
arctic-ice          Arctic Ice        Epic     arctic           Classic   #deeef8    #06121e
void-matter         Void              Epic     void-matter      Void      #0e0e18    #040408
lava-field          Lava Field        Unique   lava-flow        Stone     #dd5500    #0a0500
storm-grid          Storm Grid        Unique   storm-grid       Neon      #0a0e18    #04060c
northern-lights     Northern Lights   Unique   northern-lights  Midnight  #060e18    #020608
blood-moon          Blood Moon        Unique   blood-moon       Royal     #4a0808    #180202
cursed-ruins        Cursed Ruins      Unique   cursed-ruins     Stone     #1a1e14    #0a0c08
neon-circuit        Neon Circuit      Mythic I neon-pulse-board Neon      #0e0820    #060412
prism-storm         Prism Storm       Mythic I prism-storm      Neon      #100818    #080412
solar-flare         Solar Flare       Mythic I solar-flare      Classic   #ff8800    #200800
the-abyss           The Abyss         Mythic I the-abyss        Void      #04020c    #020106
the-cosmos-board    The Cosmos        Mythic II the-cosmos-board Void     #04040e    #010106
the-rift-board      The Rift          Mythic II the-rift-board  Void      #080410    #020106
singularity-board   Singularity       Mythic II singularity-board Midnight #030308  #010103

*Walnut Wood is classified as Rare but is the one free Rare board skin.
```

### Animated Square Skin Descriptions
```
walnut-wood:      Horizontal wood grain lines, static texture
marble:           Bezier vein lines, deterministic per square, static
stone-dungeon:    Block coursing lines, static
royal-velvet:     Diagonal fabric sheen gradient, static
gilded:           Gold shimmer gradient (light), filigree lines (dark), static
sakura:           Falling petal animation — slow drift downward on some squares
ember-grid:       Dark squares pulse deep orange radial glow
bioluminescent:   All squares pulse green radial glow with staggered phase
toxic:            Radioactive green radial glow pulse per square
deep-ocean:       Slow ripple waves + bioluminescent sparkles, whole-board effect
arctic:           Ice crack animation on dark squares, frost shimmer on light
void-matter:      Shifting purple-dark energy radial, slow per-square phase
lava-flow:        Moving lava channels with flowing bright veins
storm-grid:       Lightning bolt fires on staggered squares, electric grid
northern-lights:  Aurora bands drift downward across whole board (3 color bands)
blood-moon:       Slow tidal crimson pulse — whole board breathes
cursed-ruins:     Eldritch green cracks + mist rising, per-square deterministic
neon-pulse-board: Full hue-cycling rainbow wave across board
prism-storm:      Violent spectrum fracturing with bright fracture lines
solar-flare:      Star surface convection cells + plasma arcs
the-abyss:        Spiraling void with glowing eye at each square center
the-cosmos-board: Living galaxy — nebula drift + star field + galactic core band
the-rift-board:   Dimensional rift sweeps across entire board revealing void
singularity-board: Stars trail toward board center, black hole at center squares
```

### Border Style Definitions
```
Classic:  Oak wood grain — horizontal grain lines, knot accents at corners
Midnight: Dark metal frame with small circular rivets at four corners
Neon:     PCB circuit board — thin trace lines, via holes at corners, glowing cyan
Royal:    Deep burgundy with gold trim, fleur ornaments at corners
Marble:   Carved white marble with gold inlay edge
Void:     Near-black with purple energy seeping through edges
Sakura:   Pale cherry wood with petal motifs at corners
Gilded:   Black with heavy gold shimmer gradient
Stone:    Dark stone with mortar lines, faint warm inner edge
```

## Dual Board Skin System (confirmed design)
Each player has their own board skin. In multiplayer:
- **Rows 1-4** (black's side): black player's board skin renders on those squares
- **Rows 5-8** (white's side): white player's board skin renders on those squares
- A subtle dashed seam line separates the two halves at the midpoint
- **Split Board toggle** (in-game UI): when OFF, entire board uses white player's skin
- Piece skins are always per-player regardless of split mode
- Customize Screen Board tab shows live 4×4 mini preview of current W+B combo

---

# PART 15 — TRAINING MODE

## Overview
Training Mode: player builds their own AI bot from scratch. Bot starts with zero chess knowledge, plays completely random legal moves, learns exclusively from games played against it. No external engine. Pure frontend ML system in localStorage.

## Training Mode Screen Design
```
Fullscreen overlay, z-index: 9990
Background: #0c0c0c
Gold accent #ffcc00 throughout
```

## Bot Profile Card
```
Card: centered, max-width 520px
Background: #161616, border 1px solid #2a2a2a, border-radius 16px, padding 28px
Box-shadow: 0 8px 32px rgba(0,0,0,0.4)
```

**Avatar (top, centered)**:
```
Outer circle: 88px diameter, border-radius 50%, border 3px solid #ffcc00
Background: #0a0a0a, overflow hidden, box-shadow 0 0 16px rgba(255,204,0,0.3)
Inside: 88×88px Canvas rendering the piece skin set as avatar skin, centered and scaled to fill
  (piece rendered at ~60px scale, centered in 88px canvas)
If no avatar skin set: initials fallback (hsl(nameHash%360,60%,30%) bg, 28px Cinzel #ffcc00)
Animated skins play live inside the avatar circle via their own rAF loop
Pause avatar animation when any overlay is open

Pencil icon ✏️ (avatar skin selector):
  20×20px, position absolute bottom-right of avatar
  Background #1e1e1e, border 1px solid #333, border-radius 50%, cursor pointer
  On click: opens Avatar Skin Picker modal (z-index 10001)
    Modal: 320×420px, centered, background #161616, border #2a2a2a, border-radius 12px
    Title: "Set Avatar Skin" 13px Cinzel #ffcc00
    Scrollable grid of all unlocked skins as 40×40px previews
    Locked skins: grayscale, padlock overlay
    Click to set. "Clear" button at bottom resets to initials.
```

**Bot name** (editable, click to rename):
```
20px Cinzel #ffcc00, text-align center, cursor pointer
Shows ✏️ icon beside name on hover
Margin-top 12px
```

**Level Badge**:
```
Background linear-gradient(135deg, #2a1a00, #1a1000)
Border 1px solid #ffaa00, border-radius 20px, padding 4px 16px
14px Cinzel #ffcc00, inline-block, margin 8px auto
```

**XP Progress Bar**:
```
Background #1a1a1a, border-radius 6px, height 8px, width 100%
Fill: linear-gradient(90deg, #ffaa00, #ffcc00)
Fill-width: animated to current progress% on load (0→value, 600ms ease-out)
Below: "8 / 12 wins to Level 13" in 11px Inter #666
```

**Stat Bars** (4 rows):
```
Each row: label left 11px Inter #888 | bar center | value right 11px Cinzel #ffcc00
Bar: background #1a1a1a, fill linear-gradient(90deg, #ffcc00, #ff9900), height 4px, border-radius 2px
Labels: Memory / Pattern Confidence / Lookahead / Consistency
Animate fill (0→value, 600ms ease-out) on card render

Decay indicator (when decay is active):
  ↓ in #ff8800 beside value, 9px
  Tooltip on hover: "Reduced [X]% due to inactivity"
```

**Record Row**:
```
3 pills side by side: W-[N] (green) | D-[N] (gray) | L-[N] (red)
Each pill: 11px Cinzel, padding 4px 12px, border-radius 12px
W: bg #003311 text #00cc44 | D: bg #1a1a1a text #888 | L: bg #1a0000 text #ff3333
```

**Coin Display**:
```
🪙 icon 16px | count 18px Cinzel #ffcc00 | "Training Coins" 11px Inter #666
Flex row centered, gap 8px
```

**Collected Skin Counter Row**:
```
Flex row centered, gap 10px, margin 8px 0

Each rarity pill:
  Background: rarity dark bg color
  Border: 1px solid [rarity color at 35%]
  Border-radius: 12px, padding 3px 10px, font 10px Cinzel

Format: "[icon] [collected]/[total]"
Example: "● 6/48" (Common gray) | "◆ 3/36" (Rare blue) | "★ 1/24" (Epic yellow)
         "✦ 0/12" (Unique red) | "✦✦ 0/6" (Mythic I shimmer) | "✦✦ 0/6" (Mythic II intense shimmer)

Mythic pills show their full animated shimmer text even at 10px.
Clicking any pill opens Customize Screen pre-filtered to that rarity.
```

**Achievement Showcase** (3 slots):
```
Section header: "SHOWCASE" 10px Cinzel #555, left-aligned
3 slots in a flex row, gap 8px

Each slot: 100px wide, 80px tall, background #1e1e1e, border-radius 10px, padding 10px 8px
  Display flex column, align-items center, gap 4px

Filled slot:
  Achievement icon: 24px, centered
  Achievement name: 9px Cinzel [rarity color], centered, max 2 lines
  Rarity dot: 4px circle [rarity color] at bottom
  Border: 1px solid [rarity color at 40%]
  Box-shadow: 0 0 8px [rarity color at 12%]
  Hover: border brightens, scale(1.03) 150ms

Empty slot:
  Faint + icon #333 at 20px centered
  "Pin achievement" 9px Inter #444 centered
  Border: 1px dashed #2a2a2a

On pin animation: scale(0.8→1.0) 200ms ease-out + particle burst (8 circles, rarity color, 150ms)
```

**Equipped Opening Lines** (collapsible):
```
Header: "Opening Lines" 11px Cinzel #888 + count badge (same as section header pattern)
Content: horizontal pill row
  Each pill: 10px Cinzel [rarity color] text, 1px solid [rarity color at 30%] border, border-radius 10px, padding 3px 10px
  Small rarity dot before line name
Empty: "No lines equipped — open a chest" 11px #444
```

**Decay Warning Strip** (visible only when bot is in 7+ day inactive period):
```
Background rgba(255,136,0,0.06), border-top + border-bottom 1px solid rgba(255,136,0,0.15)
Padding 5px 12px, margin 4px 0
Font 10px Inter #ff8800
Content: "😴 Resting — [N] days since last game. Patterns slowly fading."
```

**Action Buttons** (stacked, gap 8px, margin-top 16px):
```
PLAY:          full-width, gold gradient, #000 text, 14px Cinzel, padding 12px, border-radius 8px
CHEST SHOP:    full-width, #1e1e1e bg, 1px solid #ffcc00, #ffcc00 text, same sizing
HALL OF FAME:  full-width, #1e1e1e bg, 1px solid #888, #888 text, same sizing
```

## Bot ML Architecture
```javascript
// Position frequency table (stored in localStorage)
learnedPositions = {
  "positionHash": {
    "moveUCI": { wins: 12, losses: 3, draws: 2, total: 17 }
  }
}
// Position hash: simplified FEN (piece positions only, no castling/en passant)

// Level-based parameters:
Level 1:  noise 90%, memory 25 games,  lookahead 1 ply, confidence 5+ occurrences
Level 5:  noise 60%, memory 75 games,  lookahead 1 ply, confidence 4+
Level 10: noise 20%, memory 200 games, lookahead 2 ply, confidence 3+
Level 15: noise 10%, memory 500 games, lookahead 3 ply, confidence 2+
Level 20: noise 5%,  memory 1000 games, lookahead 3 ply, confidence 1+
Level 30+: noise 1%, memory unlimited*, lookahead 3 ply, confidence 1+
*without Infinite Memory Expansion purchase

// Move selection (getBotMove):
1. Roll noise dice. If roll < noiseRate: return randomLegalMove()
2. Hash current board state → positionKey
3. Look up positionKey in learnedPositions
4. If no data: return randomLegalMove()
5. Filter moves with occurrences >= confidenceThreshold
6. If none qualify: return randomLegalMove()
7. If lookahead > 1: simulate each qualifying move, check resulting position's
   best response in learnedPositions. Score = winRate + (lookaheadScore × 0.3)
8. Return move with highest score. Ties: random among tied moves.

// Training update (trainBotOnGame after each game):
for each move in moveHistory:
  hash = hashPosition(positionBeforeMove)
  update learnedPositions[hash][moveUCI] counts
  if accelerator active: count contributions double
if gameHistory.length > memoryDepth:
  replayAndDecrementOldestGame()
gameHistory.push(completedGame)
uniquePositionsLearned = Object.keys(learnedPositions).length
save to localStorage
```

## Level Up Thresholds & Coin Rewards
```
Level 1→2: 3 wins | 2→3: 5 | 3→5: 8/level | 5→10: 12/level | 10→20: 20/level | 20+: 35/level

Coins per win:
  Level 1–5: 10 | 6–10: 25 | 11–20: 50 | 21–30: 100 | 31+: 200

Bonus multipliers (stack multiplicatively):
  Win under 30 moves: ×1.5
  Perfect Game (no pieces lost): ×2.0
  Win streak 3+: ×1.1 per win in streak, max ×1.5
  First win of the day: +25 flat coins (added after multipliers)
```

## Level Up Animation
```
1. XP bar fills to 100%, outer glow pulses 3× (2px gold glow, 200ms per pulse)
2. Level badge: scale(1.0→1.3, 200ms) then back (100ms)
3. Particle burst from badge: 20–30 gold circles, radiate 40–80px outward, fade 0.8s
4. Toast: "Level Up! Now Level [N]" with ✦ icon in gold, slides from top
5. Stat bars reanimate to new values (0→value, 600ms ease-out)
```

## Opening Line Activation Levels
```
Common lines:  activate Level 1  (immediately)
Rare lines:    activate Level 5
Epic lines:    activate Level 10
Unique lines:  activate Level 15
Mythic lines:  activate Level 20
```

---

# PART 16 — HALL OF FAME

```
Fullscreen overlay, z-index: 9991
Training Mode: background #0a0808 (warm dark)
Genesis Mode:  background #080a0c (cool dark)
Title: "HALL OF FAME" 22px Cinzel #ffcc00, centered, padding-top 24px
Subtitle: "[Bot Name]'s Greatest Moments" 12px Inter #555, centered

Close X: top-right
```

## Milestone Plaques (horizontal scroll row)
```
Row: horizontal scroll, padding 16px 24px, gap 12px

Each plaque card: 160×220px
Training bg: #1a1410 | Genesis bg: #0e1418
Border: 1px solid [milestone accent color]
Border-radius: 12px, padding 16px 12px
Display flex column, align-items center, gap 8px
Box-shadow: 0 4px 16px rgba(0,0,0,0.5)

Earned plaque:
  Icon: 32px, centered
  Name: 12px Cinzel [accent color]
  Value: 16px Cinzel #ffcc00 (Training) / #00aacc (Genesis) — the key stat/date
  Date: "Achieved [date]" 10px Inter #444

Unearned plaque:
  All content dimmed to 30% opacity
  Lock icon overlay center
  Border: 1px solid #2a2a2a (no accent color)
  Name still readable as a hint
```

**10 Milestones**:
```
First Victory:    ⚔️  #ffcc00  Date of first win
Perfect Game:     💎  #00aaff  Date first achieved
Highest Streak:   🔥  #ff6600  Best win streak number
Highest Level:    👑  #ffcc00  Current max level reached
Rarest Opening:   📖  #ff3333  Name of rarest line unlocked
Most Learned:     🧠  #aa44ff  Total unique positions learned count
Veteran:          🎖️  #888888  Total games played count
Coin Master:      🪙  #ffaa00  Total coins earned lifetime
Perfect Streak:   ⭐  #ffffff  Longest no-loss streak
Untouchable:      🛡️  #00cc44  Most consecutive Perfect Games
```

## Timeline Feed (below plaques)
```
Scrollable, max-height 40% of screen, padding 0 24px 24px
Thin styled scrollbar (3px, #333 thumb)

Each entry:
  Layout flex row, gap 12px, padding 6px 0
  Left:   date 10px Inter #444, fixed width 80px, text-align right
  Center: vertical connecting line #2a2a2a with 6px circle dot in entry accent color at junction
  Right:  event text 11px Inter #777 + value 11px Cinzel [accent color]

Event types:
  Level Up:   🏆 gold #ffcc00
  Win:        ⚔️ green #00cc44
  Opening Unlocked: 📖 [line rarity color]
  Loss:       💀 red #ff3333 (subtle — small and dim)
  Memory Milestone: 🧠 purple #aa44ff ("Learned 500 positions")
  Streak:     🔥 orange #ff6600
  Perfect Game: 💎 blue #00aaff
  Decay Event: 😴 gray #555555

Empty state:
  King silhouette SVG centered, "No history yet" 14px Cinzel #444,
  "Play your first game to begin" 12px Inter #333
```

---

# PART 17 — BOT AGING SYSTEM

```
On every page load: calculate days since lastPlayedDate for each bot.
Decay begins after 7 days of inactivity.

Decay schedule:
  7–13 days:  multiply all learnedPositions win/total counts by 0.95
  14–20 days: apply 0.90 factor
  21–27 days: apply 0.82 factor
  28+ days:   apply 0.70 factor (floor — no further decay)

Floor: no position's total drops below 1.
Decay never affects: opening lines, tactical/endgame packs, bot level, memory depth cap.

Recovery: playing any game resets lastPlayedDate. Lost data does not auto-recover.

Player communication:

Decay toast (bottom-center, distinct from other toasts):
  Background #1a1008, border 1px solid #ff8800, border-radius 8px, padding 10px 16px
  Icon 😴 14px | text "[Bot Name] has been resting [N] days and forgotten some patterns."
  Sub: "Play a game to rebuild its memory." | font 11px Inter #ff8800
  Duration: 6 seconds. Position: bottom-center above status bar.

Profile card decay strip:
  rgba(255,136,0,0.06) bg, border-top+bottom 1px solid rgba(255,136,0,0.15)
  "😴 Resting — [N] days since last game. Patterns slowly fading."

Stat bar decay indicators:
  ↓ in #ff8800 beside Memory and Consistency values
  Tooltip: "Reduced [X]% due to inactivity"

Hall of Fame timeline: decay events logged as gray entries.
```

---

# PART 18 — ACHIEVEMENT SHOWCASE SYSTEM

## Training Mode Achievements
```
| ID                  | Name             | Description                                      | Icon | Color     |
|---------------------|------------------|--------------------------------------------------|------|-----------|
| first_training_win  | First Blood      | Win first game against trained bot               | ⚔️   | #aaaaaa   |
| perfect_trainer     | Perfect Trainer  | Win without losing any pieces                    | 💎   | #4488ff   |
| level_10            | Rising Force     | Reach Level 10                                   | 🌟   | #4488ff   |
| level_20            | Veteran Coach    | Reach Level 20                                   | 👑   | #ffcc00   |
| level_30            | Grand Master     | Reach Level 30                                   | 🏆   | #ffcc00   |
| streak_5            | On a Roll        | Win 5 in a row                                   | 🔥   | #aaaaaa   |
| streak_10           | Dominant         | Win 10 in a row                                  | 💪   | #4488ff   |
| streak_20           | Untouchable      | Win 20 in a row                                  | 🛡️   | #ffcc00   |
| mythic_opening      | Theorist         | Unlock a Mythic opening line                     | 📖   | #ff3333   |
| all_openings        | Librarian        | Own at least one line of every rarity            | 📚   | #ff3333   |
| 1000_positions      | Pattern Master   | Bot learns 1000+ unique positions                | 🧠   | #ffcc00   |
| no_decay_30         | Dedicated        | Play at least once every 7 days for 30 days      | 🎯   | #ff3333   |
| genesis_level_20    | Born from Nothing| Reach Level 20 in Genesis Mode                   | 🧬   | #ff3333   |
| genesis_mythic_skin | The Rarest       | Unlock any Mythic II skin from Genesis Chest     | 💀   | Mythic I  |
| sovereign           | Sovereign        | Unlock King Mythic II — Sovereign of Everything  | 👑   | Mythic II |
```

## Showcase Pin Logic
```
3 slots on bot profile card.
Any earned achievement can be pinned. Unearned achievements blocked.
Currently pinned badge shows in slot with rarity border + glow.

Picker modal (opens when empty slot clicked):
  400×500px, centered, background #161616, border #2a2a2a, border-radius 12px
  Title: "PIN AN ACHIEVEMENT" 14px Cinzel #ffcc00, centered
  3-column grid of all achievements:
    Earned: full color icon + 10px Cinzel name
    Unearned: grayscale + lock icon — not selectable
    Currently pinned: shows pin icon ◆ in corner
  Click earned achievement: pins to selected slot, closes modal

On pin:
  Slot scales scale(0.8→1.0) 200ms ease-out
  Particle burst: 8 circles in achievement rarity color, radiate 20px, 150ms

On unpin:
  Confirm modal: "Remove [name] from showcase?" Confirm (red) | Cancel (gray)
```

---

# PART 19 — GENESIS MODE

## Overview & Branding
```
Mode name: GENESIS
Accent: #00aacc deep teal with soft pulse
Bot referred to as: "your Genesis AI"
Currency: Genesis Coins — teal with DNA helix or atom symbol
Game banner: "GENESIS MODE — Learning from you alone"
  12px Cinzel #00aacc, strip bg rgba(0,170,204,0.08), border-bottom rgba(0,170,204,0.2)

Genesis Mode restrictions:
  No opening lines can be equipped or purchased
  No Tactical or Endgame packs
  Memory cap scales with level only (no purchasable expansions)
  Only purchasable item: Training Accelerator
  Bot learns ONLY from games played against it by human players
```

## Genesis Bot Profile Card
Same structure as Training Mode card with these changes:
```
Accent color: #00aacc throughout (borders, badges, labels)
Avatar circle border: 3px solid #00aacc
"GENESIS AI" in 10px Cinzel #00aacc above bot name
Stat labels: Raw Memory / Pattern Recall / Depth / Purity
Coin icon: teal, "Genesis Coins" label in teal
CHEST SHOP button: bg #1e1e1e, border + text #00aacc
```

## Genesis Coin Rewards
```
Level 1–5:   15 Genesis Coins per win
Level 6–10:  35 Genesis Coins per win
Level 11–20: 70 Genesis Coins per win
Level 21+:   150 Genesis Coins per win
Same bonus structure as Training Mode.
```

## Genesis Chest
```
Cost: 300 Genesis Coins
Contents: cosmetics only (piece skins + board skins)
Rarity rates:
  Common:           50%
  Rare:             30%
  Epic:             14%
  Unique:           5%
  Mythic I:         0.8%
  Mythic II (non-King/Queen): 0.2% (split across 4 pieces, ~0.05% each)
  Mythic II King:   0.05%
  Mythic II Queen:  0.05%
```

---

# PART 20 — CHEST SHOP & OPENING ANIMATION

## Chest Shop Screen
```
Fullscreen overlay, z-index: 9993
Background: #0a0a0a
Title: "CHEST SHOP" 20px Cinzel #ffcc00, centered, padding-top 24px

Three chest cards centered side by side, gap 20px:

Card design: 200px wide, background #161616, border 1px solid #2a2a2a,
  border-radius 16px, padding 20px, text-align center
  Cursor pointer, transition: transform 150ms ease, box-shadow 150ms ease
  Hover: translateY(-4px), box-shadow 0 12px 32px rgba(0,0,0,0.5)

Card contents:
  Chest icon: 32px Canvas-drawn/SVG chest in card's accent color
  Name: 14px Cinzel [accent color]
  Contents: 11px Inter #666, 2–3 lines description
  Cost pill: coin icon + amount, 12px Cinzel, bg [coin color at 10%]
  "OPEN" button: full-width, [accent] gradient bg, 12px Cinzel #000

Opening Chest:  accent #00aaff
Training Chest: accent #ffcc00
Genesis Chest:  accent #00aacc

Insufficient coins state:
  Card dims to 50% opacity
  "OPEN" button disabled: bg #1e1e1e, text #333, cursor default
  Cost pill shows deficit: "Need 150 more" in #ff3333
```

## Chest Opening Animation
```
z-index: 9998 (above everything except toasts)

Sequence:

1. Pre-open (0.5s):
   Chest icon shakes: @keyframes shake { 0%,100% translateX(0); 25% translateX(-3px); 75% translateX(3px) }
   Glow in chest accent pulses outward from icon.

2. Burst (0.3s):
   Chest lid rotates open (or scales open).
   20–30 particles in rarity color fan outward: 3px circles, travel 40–80px, fade 0.3s.

3. Reel Spin (1.5s):
   Horizontal carousel of item cards slides rapidly left to right.
   Each card in reel: 120×80px, bg #1e1e1e, border [rarity color], item name + badge
   Center highlight bracket: two vertical lines in chest accent color, fixed position
   Reel starts fast, decelerates ease-out, reel slides to final position
   Final slow-down has a satisfying mechanical "tick" at each card pass
   Last 3 cards: tick interval slows to 200ms, 300ms, stopped

4. Lock (0.2s):
   Winning card scales 1.0→1.05×. Border brightens.

5. Result reveal:
   Reel fades out (200ms). Result card expands from center:
     scale(0.5→1.0) + opacity(0→1), 300ms ease-out
   Card: 320×280px, bg #161616, border 2px solid [rarity color]
     border-radius 16px, box-shadow 0 0 40px [rarity color at 25%]
   Contents:
     Item preview (skin render at 80px or training item icon)
     Name: 18px Cinzel [rarity color]
     Rarity badge (large version)
     Description: 12px Inter #888, 3–4 lines
     "NEW!" starburst if first unlock (same as cutscene first-time starburst)
     "COLLECT" button: [rarity color] gradient, 12px Cinzel #000, full-width

6. Mythic reveal (replaces steps 3–5 for Mythic rolls):
   Screen dims to rgba(0,0,0,0.95).
   Slow radial light in rarity color expands from center over 1 second.
   Item card appears already full-size: opacity 0→1 over 0.8s.
   Border glows intensely.
   For Mythic II King: the Sovereign of Everything shockwave fires once across
     the full screen before the card appears — as if the King announces its own arrival.
```

## Chest Contents

### Opening Chest (200 Training Coins)
Rarity: Common 60% / Rare 25% / Epic 10% / Unique 4% / Mythic 1%
```
Common  (Level 1): King's Pawn (1.e4), Queen's Pawn (1.d4), English (1.c4),
                   Reti (1.Nf3), Bird's (1.f4), Van't Kruijs (1.e3)
Rare    (Level 5): Sicilian Defense, French Defense, Caro-Kann, London System,
                   King's Indian Attack, Scandinavian Defense
Epic   (Level 10): Ruy Lopez, Queen's Gambit, King's Indian Defense, Nimzo-Indian, Pirc Defense
Unique (Level 15): Sicilian Najdorf, Catalan Opening, Grünfeld Defense, Dutch Defense, Alekhine's Defense
Mythic (Level 20): Sicilian Dragon (full line), King's Gambit (deep aggressive), Marshall Attack
```

### Training Chest (500 Training Coins)
Rarity: Common 55% / Rare 28% / Epic 12% / Unique 4% / Mythic 1%
```
Common: Small Memory Expansion (+25 games), Basic Tactical Pack (forks/pins)
Rare:   Medium Memory Expansion (+75), Endgame Tutor Rook Endings,
        Endgame Tutor King+Pawn, Tactical Pack Discovered Attacks
Epic:   Large Memory Expansion (+200), Endgame Tutor Queen Endings,
        Tactical Combinations Pack, Training Accelerator (2× learning 20 games),
        Opening Library King's Pawn Fundamentals
Unique: Massive Memory Expansion (+500), Grand Endgame Library, Grand Tactical Library,
        Opening Library Hypermodern Pack, Opening Eraser, Evaluation Upgrade (+1 lookahead, max 3 stacks)
Mythic: Infinite Memory Expansion (removes cap), Elite Repertoire Pack (3 Unique + 1 Mythic line),
        Master Tactical Library, Double Evaluation Upgrade
```

---

# PART 21 — PERSISTENCE SCHEMA

Single localStorage key: `"chessCutsceneData"`

```json
{
  "username": "player1",
  "theme": "Classic",
  "pieceStyle": "Classic",
  "trailStyle": "Default",
  "borderStyle": "theme-default",
  "bgAnimationEnabled": true,

  "elo": {
    "player1": {
      "rating": 1200,
      "history": [],
      "record": { "wins": 0, "losses": 0, "draws": 0 },
      "gamesPlayed": 0
    }
  },

  "cutscenes": {
    "triggerCounts": { "execution":0,"driveby":0,"sniper":0,"meteor":0,"lightning":0,"joust":0,"inquisition":0,"demolition":0,"assassination":0,"regicide":0 },
    "firstTimeSeen": { "execution":false,"driveby":false,"sniper":false,"meteor":false,"lightning":false,"joust":false,"inquisition":false,"demolition":false,"assassination":false,"regicide":false },
    "achievements": { "first_blood":{"earned":false,"date":null} },
    "dailyChallenge": { "date":null,"cutsceneId":null,"target":0,"progress":0,"completed":false,"dailyGoldEarned":false },
    "totalCaptures": 0,
    "rarestEver": null,
    "bestStreak": 0,
    "streakBadgesEarned": [],
    "pieceKillCounts": { "pawn":0,"knight":0,"bishop":0,"rook":0,"queen":0,"king":0 },
    "sessionLog": []
  },

  "multiplayer": {
    "players": {
      "player1": { "totalCaptures":0,"rarestEver":null,"triggerCounts":{} },
      "player2": { "totalCaptures":0,"rarestEver":null,"triggerCounts":{} }
    }
  },

  "cosmetics": {
    "unlockedSkins": { "pawn":["default"],"knight":["default"],"bishop":["default"],"rook":["default"],"queen":["default"],"king":["default"] },
    "unlockedBoardSkins": ["default"],
    "equippedSkins": {
      "white": { "pawn":"default","knight":"default","bishop":"default","rook":"default","queen":"default","king":"default" },
      "black": { "pawn":"default","knight":"default","bishop":"default","rook":"default","queen":"default","king":"default" }
    },
    "equippedBoardSkins": { "white":"default","black":"default" },
    "favoritedSkins": { "pawn":[],"knight":[],"bishop":[],"rook":[],"queen":[],"king":[] },
    "favoritedBoardSkins": [],
    "randomFavoritesEnabled": { "pawn":false,"knight":false,"bishop":false,"rook":false,"queen":false,"king":false },
    "currentRandomFavorite": { "pawn":null,"knight":null,"bishop":null,"rook":null,"queen":null,"king":null }
  },

  "trainingMode": {
    "botName": "My Bot",
    "avatarSkinId": null,
    "botLevel": 1,
    "winsToNextLevel": 3,
    "currentWins": 0,
    "totalGamesPlayed": 0,
    "lifetimeWins": 0,
    "lifetimeCoinsEarned": 0,
    "record": { "wins":0,"losses":0,"draws":0 },
    "trainingCoins": 0,
    "learnedPositions": {},
    "uniquePositionsLearned": 0,
    "gameHistory": [],
    "equippedOpeningLines": [],
    "unlockedItems": [],
    "evaluationUpgradeStacks": 0,
    "memoryExpansionBonus": 0,
    "acceleratorGamesRemaining": 0,
    "dailyFirstWinClaimed": false,
    "dailyFirstWinDate": null,
    "currentStreak": 0,
    "highestStreak": 0,
    "perfectGamesCount": 0,
    "consecutivePerfectGames": 0,
    "highestConsecutivePerfectGames": 0,
    "lastPlayedDate": null,
    "totalDecayApplied": 0.0,
    "decayWarningShownDate": null,
    "consecutiveDaysPlayed": 0,
    "lastDayPlayedForStreak": null,
    "hallOfFameMilestones": { "firstVictoryDate":null,"firstPerfectGameDate":null,"highestLevel":1,"rarestOpeningUnlocked":null },
    "hallOfFameTimeline": [],
    "pinnedShowcase": [null, null, null],
    "trainingAchievements": {}
  },

  "genesisMode": {
    "avatarSkinId": null,
    "botLevel": 1,
    "winsToNextLevel": 3,
    "currentWins": 0,
    "totalGamesPlayed": 0,
    "lifetimeWins": 0,
    "lifetimeCoinsEarned": 0,
    "record": { "wins":0,"losses":0,"draws":0 },
    "genesisCoins": 0,
    "learnedPositions": {},
    "uniquePositionsLearned": 0,
    "gameHistory": [],
    "acceleratorGamesRemaining": 0,
    "dailyFirstWinClaimed": false,
    "dailyFirstWinDate": null,
    "currentStreak": 0,
    "highestStreak": 0,
    "perfectGamesCount": 0,
    "consecutivePerfectGames": 0,
    "highestConsecutivePerfectGames": 0,
    "lastPlayedDate": null,
    "totalDecayApplied": 0.0,
    "decayWarningShownDate": null,
    "consecutiveDaysPlayed": 0,
    "lastDayPlayedForStreak": null,
    "hallOfFameMilestones": { "firstVictoryDate":null,"firstPerfectGameDate":null,"highestLevel":1,"rarestSkinUnlocked":null },
    "hallOfFameTimeline": [],
    "pinnedShowcase": [null, null, null],
    "genesisAchievements": {}
  },

  "savedGames": [],
  "chestHistory": []
}
```

Load on page init. Save after: every game, cutscene, achievement, daily update, theme/style change, chest open, ELO update.

---

# PART 22 — FLICKER FIX

Build flicker-free from the start. Every item below is mandatory.

**1. Dirty Flag**: `needsRedraw` boolean. Only clear+redraw when true. Set true on: piece move, selection change, highlight change, clock tick, cutscene complete. Never unconditionally redraw.

**2. Canvas Resize**: `canvas.width/height` set only on init and `window resize`. Never inside the render loop.

**3. Cutscene Guard**: `cutsceneActive = true` stops the main rAF loop. Cutscene manages its own rAF. `onCutsceneComplete()` restarts game loop.

**4. No CSS Animations on Canvas Ancestors**: animations/transitions only on overlay, toast, badge, and modal elements. Never on canvas, its wrapper, or any ancestor.

**5. Re-entry Guard**: `cutsceneQueued` flag blocks re-entry. Capture listeners added exactly once (`{ once: true }` or removed before firing).

**6. Layer Isolation**: board canvas, annotations canvas, drag canvas never share a rAF tick. Animated background is a separate independent canvas with its own loop. Skin animation loops are additional independent loops.

**7. No setInterval on Canvas**: clock updates inside rAF loop via `performance.now()` delta only.

```javascript
let needsRedraw = false;
let cutsceneActive = false;
let cutsceneQueued = false;

function gameLoop(timestamp) {
  if (!cutsceneActive) {
    if (needsRedraw) {
      clearCanvas();
      drawBoard();
      drawPieces();       // with active skins
      drawHighlights();
      drawAnnotations();
      drawCursedGlows();
      drawTrails();
      needsRedraw = false;
    }
    requestAnimationFrame(gameLoop);
  }
}

function onCutsceneComplete() {
  cutsceneActive = false;
  cutsceneQueued = false;
  needsRedraw = true;
  requestAnimationFrame(gameLoop);
}
```

**Debug flags at top of file** (both default `false`):
```javascript
const DEBUG_FLICKER = false;  // logs clearRect calls, shows redraws/sec counter
const DEBUG_MODE = false;     // shows [TEST] button in top bar
const DEBUG_SKINS = false;    // logs skin rAF ticks and render calls
```

---

# PART 23 — FULL FUNCTION LIST

### Core Render
- `applyTheme(themeName)`
- `renderBoard(ctx)` — squares, coords, highlights, check flash, premove tint
- `renderPiece(ctx, pieceType, color, x, y, scale, style, hovered, dragging)`
- `renderSkin(ctx, pieceType, color, x, y, scale, skinId, animState)` — extends renderPiece
- `createSkinAnimLoop(skinId, ctx, pieceType, color, x, y, scale)` → returns stop()
- `renderBoardSquareSkin(ctx, col, row, isLight, skinId, playerSide, animState)`
- `createBoardAnimLoop(skinId, boardCtx)`
- `renderSkinPreview(canvas, pieceType, skinId, size)` — for skin grid cards
- `renderZoomPreview(canvas, pieceType, skinId, boardSkinId)` — 3×3 board zoom
- `renderAvatarSkin(canvas, skinId, botName)` — clipped to circle
- `renderCapturedPieces(container, capturedList)` — correct orientation
- `renderClock(element, seconds, isLow)`
- `renderTrail(ctx, piece, fromSquare, toSquare, trailStyle)`
- `renderBoardBorder(ctx, borderStyle, theme)`
- `renderAnnotations(ctx, dots, arrows)`
- `renderPremove(ctx, fromSquare, toSquare)`
- `renderRadialMenu(ctx, square, legalMoves)` — touch only
- `renderCursedGlow(ctx, x, y, triggerCount)`
- `startBackgroundAnimation(themeName)` / `stopBackgroundAnimation()`
- `detectOpening(moveHistory)` → `{ eco, name } | null`
- `showEmojiReaction(playerSide, emoji)`

### Cutscenes
- `renderBadge(ctx, cutsceneId, triggerCount, x, y, radius)`
- `renderTitleCard(ctx, name, rarityLabel, rarityPercent, rarityColor, rarityIcon, cutsceneId, triggerCount, streakBadge, isCheckmate, isFirstTime)`
- `playIntroSequence(rarityColor, isCursed, onComplete)`
- `dispatchCutscene(attackerType, attackerColor, defenderType, defenderColor, isCheckmate, onComplete)`
- `renderCutscenePreview(ctx, cutsceneId, x, y, width, height, loopTime)`

### Game Screens
- `showPromotionUI(square, color, onSelect)`
- `showGameResultScreen(result, reason, moves, duration, accuracyWhite, accuracyBlack)`
- `enterAnalysisMode(gameHistory)` / `exitAnalysisMode()`
- `calculateAccuracy(moveHistory)` → `{ white, black }`
- `queuePremove(from, to)` / `clearPremove()` / `executePremoveIfLegal()`
- `updateElo(playerUsername, opponentElo, result)` → new rating
- `getEloForBotLevel(level)` → elo number

### Leaderboard
- `openLeaderboardHub()` — shows hub modal with ELO + AI Level cards
- `openEloLeaderboard()` / `closeEloLeaderboard()`
- `openAILeaderboard()` / `closeAILeaderboard()`
- `renderEloTable(filter)` — renders table rows for ELO screen
- `renderAILevelTable(mode, sort)` — renders table rows for AI screen
- `renderEloGraph(canvas, eloHistory)` — line chart on ELO screen
- `renderLevelGraph(canvas, levelHistory)` — growth curve on AI screen
- `getLeaderboardEntries(mode)` → array of real + ghost entries, sorted

### Collection & Stats
- `openCollectionScreen()` / `closeCollectionScreen()`
- `openStatsScreen()` / `closeStatsScreen()`

### Customize
- `openCustomizeScreen()` / `closeCustomizeScreen()`
- `selectPieceForCustomize(pieceType)` — triggers zoom preview
- `equipSkin(pieceType, playerColor, skinId)`
- `toggleFavorite(pieceType, skinId)`
- `toggleRandomFavorites(pieceType)`
- `rollRandomFavorite(pieceType, playerColor)` → skinId
- `startFavoriteCycleAnimation(pieceType, canvasEl)`
- `renderSkinCounters(containerId, mode)` — rarity pills
- `openAvatarSkinPicker()` / `setAvatarSkin(skinId)`

### Training Mode
- `openTrainingMode()` / `openGenesisMode()`
- `renderBotProfileCard(mode)`
- `getBotMove(boardState, legalMoves, botData)` → moveUCI
- `hashPosition(boardState)` → string
- `trainBotOnGame(moveHistory, result, botData)`
- `levelUpBot(mode)` — triggers level-up animation
- `calculateCoinReward(mode, botLevel, winConditions)` → coins
- `checkBotDecay(mode)` — on page load
- `applyDecayToPositions(learnedPositions, factor)`
- `resetDecayTimer(mode)` — on game played
- `openHallOfFame(mode)` / `closeHallOfFame()`
- `renderHallOfFamePlaques(mode)`
- `renderHallOfFameTimeline(mode)`
- `logHallOfFameEvent(mode, eventType, value)`
- `checkAndUpdateMilestones(mode)`
- `pinAchievement(achievementId, slotIndex, mode)`
- `unpinAchievement(slotIndex, mode)`
- `openShowcasePicker(slotIndex, mode)`
- `renderShowcaseSlot(slotIndex, achievementId)`
- `checkTrainingAchievements(mode)`

### Chest System
- `openChestShop()` / `closeChestShop()`
- `openChest(chestType)` — deducts coins, rolls, animates, unlocks
- `rollChestResult(chestType)` → itemId + rarity
- `unlockItem(itemId, isNew)` — saves, toasts, checks achievements
- `playChestOpenAnimation(chestType, resultItem, onComplete)`

### State & Notifications
- `checkAchievements()` — cutscene + training achievements
- `showAchievementToast(achievement)` — top-right
- `showStreakToast(milestone)` — top-left
- `showDailyCompleteToast()` — top-center
- `showDecayToast(botName, daysInactive)` — bottom-center
- `showConfirmDialog(title, message, onConfirm)`
- `saveGame()` / `loadGame(slot)` / `openSavedGamesModal()`
- `switchPlayer(playerNumber)`
- `updateDailyChallenge(cutsceneId)`

---

# STAGING ORDER FOR CODEX

Work through phases in this order. After each phase: run the verification checks from todo.md before proceeding. Never start a new phase until the previous one passes all checks.

1. *"Build the full 3-column layout matching chess_ui_mockup.html: top bar (logo, opening name, username, icon buttons including 🏅 Leaderboards), left panel (player info with ELO display, clocks, captured pieces in correct orientation, opening pill, emoji reactions, daily widget), centered board, right panel with all collapsible sections. Classic theme only, no game logic yet."*

2. *"Now add all 8 appearance themes with CSS variable system, theme swatches, the 8 independent animated background canvases, and surface texture overlays."*

3. *"Now add all piece rendering — 6 pieces in 4 styles. Knight MUST be a proper Staunton horse head in profile using bezier curves. Add piece hover lift, piece trails with 6 styles, board borders for all 8 themes plus 3 unlockable borders."*

4. *"Now add chess game logic — move generation, legal moves, check detection, AI bot at all difficulty levels, clocks, correct captured pieces orientation, premove system, promotion UI, drag and drop, right-click square annotations, ELO calculation and display."*

5. *"Now add Analysis Mode with move classification, accuracy scores, game record colored icons, and the Game Result screen with confetti, ELO change display, and Rematch/Review buttons."*

6. *"Now implement the full flicker fix — dirty flag, cutsceneActive guard, layer isolation, no canvas resize in loop, no CSS animations on ancestors, all three debug flags."*

7. *"Now add the full cutscene system — all 10 cutscenes with attacker/defender piece rendering, rarity roll, intro flash, letterbox bars, title card with badges, streak system, first-time bonus, daily challenge system."*

8. *"Now add the Collection Screen (4 tabs: Cutscenes, Achievements, Streaks, Trophy Room), the Stats Screen, Account system, Local Multiplayer Leaderboard rivalry, Cursed Piece mechanic, touch controls, emoji reactions, and opening book ECO detection."*

9. *"Now add the ELO Leaderboard screen and the AI Level Leaderboard screen. Both are accessible via the Leaderboard Hub modal opened from the 🏅 icon in the top bar. ELO screen: header, your stats card with ELO history graph, filter/sort bar, full leaderboard table with rank/player/ELO/W/D/L/trend columns, ghost entries for richness. AI Level screen: header, Training/Genesis tabs, your bot card with level history graph, sort bar, full bot level table."*

10. *"Now add the Customize Screen (Pieces tab with zoom preview + skin grid, Board tab with 4×4 live preview, Favorites tab with Shuffle All), all Common and Rare piece skins, all Common and Rare board skins."*

11. *"Now add all Epic animated piece skins (6 types) and Epic board skins (4 types) with independent rAF loops."*

12. *"Now add all 12 Unique piece skins (2 per piece) and all Unique + Mythic I board skins. King Unique is Super Saiyan — most dramatic animated piece in the game."*

13. *"Now add all 12 Mythic piece skins (6 Mythic I + 6 Mythic II) and Mythic II board skins (Living Cosmos unified canvas pass, Eternal Flame unified fire). King Mythic II (Sovereign of Everything) — solar system within silhouette, board-wide shockwave every 8–12s."*

14. *"Now build Training Mode — bot profile card with full design (avatar skin circle with live render, level badge, XP bar, stat bars, coin display, skin counter pills, achievement showcase, decay strip, all buttons). Frontend ML system: hashPosition, getBotMove, trainBotOnGame, levelUpBot with animation, coin reward calculation."*

15. *"Now build the bot aging system, Hall of Fame screen (milestone plaques + timeline feed), Achievement Showcase pin/unpin system, and all Training/Genesis Mode achievements. Build Genesis Mode with teal branding and its own Hall of Fame."*

16. *"Now build the Chest Shop screen and chest opening animation (full reel spin, Mythic dramatic reveal, King Mythic II special announce). All three chest types with full rarity tables and item lists."*

17. *"Now wire everything together — ELO updates after every game, leaderboard tables refresh, skins unlocked from chests appear in Customize immediately, skin counters update, avatar skin renders live in bot profile, Random Favorites rolls at game start, all decay checks on page load, all achievements check after every relevant action, full localStorage persistence under the complete schema."*

18. *"Now add all 23 cutscene achievements, all 15 training achievements, all trail and border unlock achievements, and the demo test harness (DEBUG_MODE panel with all dropdowns, Force toggles, Reset All Data button)."*

---

# APPENDIX A — CODEX INSTRUCTIONS

## Starting Message (paste this as your first message to Codex)

> *"Read all files in the Mered folder. Read chess_master_spec.md as the complete build document. Read chess_ui_mockup.html as the visual reference — match its layout, colors, component structure, and dark aesthetic exactly. Do not touch any Python files. Only overhaul mered.html, mered.css, and mered.js. Preserve all existing backend API calls. Before writing any code, audit what the existing frontend has and what still needs to be built, then ask me to confirm before generating. Work through the spec in the staging order at the bottom of this file. Mark completed items in todo.md as each phase finishes."*

> **Design philosophy**: Every screen, interaction, and animation should feel premium and earned. The bar is: if this were a AAA game's UI, would it fit? Nothing placeholder. Nothing cheap. Everything has weight and visual feedback.

> **Division of responsibility**: All design decisions (colors, spacing, typography, animation timing, layout, visual hierarchy) are defined in this document. Codex implements the logic. Codex does not make design decisions — it follows what is written here.

---

## Between Each Phase — Verification Template

After each phase completes, send this before confirming the next phase:

> *"Good. Before moving to Phase [N+1], self-check Phase [N]: [paste checks from checklist below]. Fix anything that fails before proceeding. If all checks pass, move to Phase [N+1]."*

---

## Known Bugs to Fix (current version)

- [ ] Captured pieces display reversed — fix so top = by bottom player, bottom = by top player
- [ ] Knight piece looks malformed — rebuild with proper bezier curve Staunton horse head
- [ ] Continuous screen flickering/flashing — implement full Phase 6 flicker fix
- [ ] Sidebar scrollbar ugly and cramped — resolved by full Phase 1–5 UI overhaul

---

# APPENDIX B — PHASE CHECKLISTS

## PHASE 1 — LAYOUT & UI STRUCTURE

**Verification checks:**
1. Confirm outer page has zero scrollbars — no overflow: auto or scroll on html, body, or main layout wrapper
2. Confirm top bar has logo left, game mode + opening name center, username + Collection + Stats icons right
3. Confirm left panel has slots for: top player card, top captured pieces, bottom captured pieces, bottom player card, opening pill, emoji reactions, and daily challenge widget
4. Confirm right panel has collapsible sections for: pre-game setup, in-game controls, appearance, utility controls, export, game record, AI notes, and status bar
5. Confirm all existing backend API calls (/api/state, /api/move, /api/ai-move, etc.) are still intact and unchanged

**Checklist:**
- [ ] Replace current scrollable sidebar with 3-column layout: Left Panel | Board | Right Panel
- [ ] Top bar (~48px): logo left, game mode + live opening name center, username + icon buttons right
- [ ] `"P2 Turn"` badge in top bar during two-player mode
- [ ] No outer page scrollbars — only internal scrollable regions where needed
- [ ] Responsive: panels collapse to hamburger drawers below 1100px, board-only below 800px
- [ ] Visual reference: match chess_ui_mockup.html for layout, colors, spacing, and component structure

---

## PHASE 2 — LEFT PANEL

**Verification checks:**
1. Confirm top player info shows avatar, username, clock (red pulse <30s), and captured pieces
2. Confirm top captured pieces = pieces captured BY the bottom player (not reversed)
3. Confirm bottom captured pieces = pieces captured BY the top player (not reversed)
4. Confirm material advantage +N shown next to captured pieces
5. Confirm opening pill shows ECO code + name and updates live as moves are made
6. Confirm emoji reaction buttons are present and animate on click with 3s cooldown
7. Confirm daily challenge widget shows badge, text, progress bar, and fraction

**Checklist:**
- [ ] Top player info: avatar circle (initials, hashed color, 36px), username, clock (large monospace, red pulse <30s)
- [ ] Top captured pieces row = pieces captured **by the bottom player** (fix current reversed orientation)
- [ ] Bottom player info: same layout mirrored below the board
- [ ] Bottom captured pieces row = pieces captured **by the top player**
- [ ] Material advantage `+N` shown next to captured pieces
- [ ] Opening Name Display: slim pill label, ECO code + full name (e.g. `"B20 — Sicilian Defense"`), bundled JSON opening book with 50+ openings, fades to `"Custom Position"` when off-book
- [ ] Emoji Reactions (two-player mode only): 5 buttons per player (👏 😤 🤔 😂 🔥), large float-up animation on click, 3s cooldown, hidden in bot mode
- [ ] Daily Challenge Widget: badge (20px), challenge text, live progress bar, fraction, gold border + checkmark on completion

---

## PHASE 3 — BOARD AREA

**Verification checks:**
1. Confirm canvas layer stack is correct bottom to top: board canvas, annotations canvas, drag overlay canvas
2. Confirm needsRedraw dirty flag is in place and clearRect is never called unconditionally every rAF tick
3. Confirm canvas.width and canvas.height are never set inside the render loop
4. Confirm no CSS animations or transitions on canvas elements or their parent wrappers
5. Confirm piece hover lift works — legally movable pieces lift 4px with increased shadow, opponent pieces do not
6. Confirm drag and drop works — piece picks up at 1.15x scale on drag overlay, origin shows 30% ghost, illegal drop snaps back
7. Confirm right-click annotations work — green/yellow/red/blue dots with modifiers, colored arrows on drag, left-click clears all
8. Confirm Knight is now a proper Staunton horse head silhouette in profile using smooth bezier curves
9. Confirm all 6 piece trail styles are present — Default plus Flame/Ice/Gold/Royal/Shadow with locked styles showing padlock
10. Confirm all existing backend API calls remain intact and unchanged

**Checklist:**

### Core Board
- [ ] Coordinate labels (a–h, 1–8) along edges in theme secondary color
- [ ] Last move highlight on both squares
- [ ] Selected piece highlight (bright accent ring)
- [ ] Legal move dots — solid for empty, ring outline for capture squares
- [ ] Check highlight — King's square flashes red
- [ ] Pre-move squares — source purple `rgba(160,80,255,0.35)`, destination `rgba(160,80,255,0.2)`
- [ ] Cursed piece glow rendering on board

### Piece Hover Animation
- [ ] Hovering a legally movable piece lifts it 4px higher
- [ ] Shadow increases from `rgba(0,0,0,0.3) 0 2px 4px` → `rgba(0,0,0,0.5) 0 8px 16px`
- [ ] Instant hover-in, 150ms ease hover-out
- [ ] Opponent pieces and pieces with no legal moves do NOT lift

### Drag and Drop
- [ ] Click-to-move AND drag-to-move work simultaneously
- [ ] On drag: piece at 1.15x scale on overlay canvas, origin shows 30% ghost, legal move dots appear
- [ ] Drop on legal square → execute move. Drop elsewhere → elastic snap-back animation
- [ ] Touch drag: touch events, prevent page scroll while dragging

### Square Highlighting (Right-Click Annotations)
- [ ] Right-click only → green dot `rgba(0,200,80,0.7)`
- [ ] Shift + right-click → yellow dot `rgba(255,200,0,0.7)`
- [ ] Ctrl + right-click → red dot `rgba(220,50,50,0.7)`
- [ ] Alt + right-click → blue dot `rgba(50,150,255,0.7)`
- [ ] Right-click drag → colored arrow from source to destination
- [ ] Arrow: thick line with filled triangular arrowhead, width ~18% of square size
- [ ] Right-click same annotation removes it
- [ ] Any left-click clears all annotations instantly
- [ ] Eraser icon in bottom-right corner of board when annotations present
- [ ] Annotations on separate transparent canvas above board, below drag canvas
- [ ] Touch long-press (500ms) → color picker popup for annotation

### Canvas Layer Stack
- [ ] Layer 1: Board canvas (squares, pieces, highlights, cursed glows, trails)
- [ ] Layer 2: Annotations canvas (dots, arrows)
- [ ] Layer 3: Drag overlay canvas (dragged piece only)

### Piece Trails
- [ ] On any completed move: 4–6 ghost silhouettes along path, 40%→5% opacity, fade over 400ms
- [ ] Default trail: always available
- [ ] Flame trail: orange/red wisps — unlock: trigger 10 cutscenes total
- [ ] Ice trail: blue/white fragments — unlock: reach Blue badge tier on any cutscene
- [ ] Gold trail: golden sparkle dots — unlock: reach Gold badge tier on any cutscene
- [ ] Royal trail: purple/violet orbs — unlock: witness all 5 Unique cutscenes
- [ ] Shadow trail: black smoke wisps — unlock: trigger Regicide 10 times
- [ ] Locked trails show padlocked swatches with unlock condition on hover

### Custom Board Borders
- [ ] Separate Canvas 2D element outside the board
- [ ] Classic: oak wood grain, `#8B5E3C` tones, knot details at corners
- [ ] Midnight: dark metal frame with rivets at four corners
- [ ] Forest: carved stone with vine/leaf motifs, mossy green
- [ ] Crimson: wrought iron with flame scroll work at corners
- [ ] Ice: frosted glass, crystalline edges, ice spike corner accents
- [ ] Gold: gilded frame with flourish patterns, `#C8A020` tones
- [ ] Neon: circuit board traces, via holes at corners, glowing in accent color
- [ ] Obsidian: carved dark stone with faint runic markings
- [ ] Dragon border (unlockable): red/gold dragon scales — unlock: Boss Capture 5 times
- [ ] Marble border (unlockable): white/gray veined marble — unlock: Completionist achievement
- [ ] Void border (unlockable): deep space starfield with slow-moving particles — unlock: Meteor Strike 25 times

---

## PHASE 4 — ANIMATED BACKGROUNDS

**Verification checks:**
1. Confirm animated background is on its own independent canvas at z-index: -1 with its own rAF loop completely separate from the game loop
2. Confirm each of the 8 themes has a genuinely distinct animation (not same system recolored)
3. Confirm background animation auto-disables when navigator.hardwareConcurrency < 4
4. Confirm Background Animation toggle works and saves to localStorage
5. Confirm surface texture overlays are applied at pointer-events: none, opacity 0.04–0.07
6. Confirm animated background continues running behind cutscene overlay when cutscene is active

**Checklist:**
- [ ] Classic: slow drifting dust motes, cream/gold, ~15% opacity, float upward
- [ ] Midnight: parallax star field, slow rightward drift, shooting star every 8–15s
- [ ] Forest: animated fog wisps drifting left to right, occasional leaf drifting down
- [ ] Crimson: ember particles (orange/red dots) floating upward from bottom edge
- [ ] Ice: slow-falling snowflakes of varying sizes with gentle horizontal sway
- [ ] Gold: tiny gold specks twinkling in and out at random positions
- [ ] Neon: faint grid pulse, accent color wave traveling top-left to bottom-right every 4s
- [ ] Obsidian: slow aurora blobs (purple/blue/violet) drifting across bg at ~10% opacity
- [ ] Background Animation toggle in Appearance section (default on), saved to localStorage
- [ ] Auto-disable on `navigator.hardwareConcurrency < 4` with static color fallback
- [ ] Animated bg continues running behind cutscene overlay

### Surface Texture Overlays
- [ ] Classic: fine linen `repeating-linear-gradient`
- [ ] Midnight: faint carbon fiber diagonal pattern
- [ ] Forest: subtle stone/concrete grain
- [ ] Crimson: rough leather texture approximation
- [ ] Ice: no texture, slight blur on bg only
- [ ] Gold: fine silk diagonal weave
- [ ] Neon: no texture
- [ ] Obsidian: basalt stone grain

---

## PHASE 5 — RIGHT PANEL

**Verification checks:**
1. Confirm pre-game section disappears cleanly when Play is pressed with no layout shift
2. Confirm in-game controls replace pre-game section after Play
3. Confirm all toggles save their state to localStorage
4. Confirm game record scrolls internally and never causes outer page scroll
5. Confirm status bar is always visible at panel bottom regardless of section collapse state

**Checklist:**
- [ ] Pre-game section (before Play): Bot Mode segmented buttons, Play As, Clock dropdown, Play button (gold gradient, Cinzel, gentle pulse)
- [ ] Pre-game section disappears cleanly when Play pressed — no layout shift
- [ ] In-game controls (replaces pre-game): Undo / Restart / Hint / Draw / Resign / Resume — pill buttons, 2×N grid, destructive = red tint on hover + confirmation dialog
- [ ] Appearance section: theme swatches (40×40px, gold border on active, 2×2 board preview), Piece Style selector, Trail Style swatches, Board Border swatches, Background Animation toggle
- [ ] Utility controls: Mute, Animations, Action Captures toggles
- [ ] Export section: Copy PGN, Save Game, Load Game
- [ ] Game Record (collapsed by default): two-column move list, alternating row shading, current move highlighted, max height ~200px internal scroll. Analysis Mode: colored icons per move (🟢🟡🟠🔴💀), click to jump
- [ ] AI Notes (collapsed by default): best move White, best move Black, evaluation bar
- [ ] Status bar at panel bottom: always visible, green/yellow/red color coding

---

## PHASE 6 — APPEARANCE THEMES (8 total)

**Verification checks:**
1. Confirm all 8 themes are defined with correct CSS variable values
2. Confirm switching themes updates ALL CSS variables and affects panels, buttons, modals, toasts, and overlays — not just board squares
3. Confirm theme saved to localStorage and applied on page load
4. Confirm no CSS animations or transitions on canvas or any ancestor element

**Checklist:**
- [ ] CSS custom property system: `--board-light`, `--board-dark`, `--bg-page`, `--bg-panel`, `--accent`, `--text-primary`, `--text-secondary`, `--border-color`
- [ ] Classic, Midnight, Forest, Crimson, Ice, Gold, Neon, Obsidian (all values defined in prompt)
- [ ] Entire UI shifts on theme change (panels, modals, buttons, overlays, toasts)
- [ ] Theme saved to localStorage and applied on page load
- [ ] Theme system commented with instructions for adding new themes

---

## PHASE 7 — PIECE RENDERING (full rebuild)

**Verification checks:**
1. Confirm Knight is a proper Staunton horse head in profile using smooth bezier curves — not Unicode, not SVG sprite, not a blob
2. Confirm all 6 pieces are recognizable at 40px–90px board square sizes
3. Confirm all 4 style variants work — Classic, Neo, Minimal, Wood
4. Confirm white and black pieces are visually distinct with correct colors and outlines
5. Confirm pieces have subtle drop shadow

**Checklist:**
- [ ] All 6 pieces rebuilt with clean Canvas 2D bezier curves — no jagged edges
- [ ] Knight fix (HIGHEST PRIORITY): proper Staunton horse head in profile, smooth bezier curves for muzzle/forehead/ear/neck/mane. Must be immediately recognizable.
- [ ] Pawn: round head, trapezoidal neck, wide flat base
- [ ] Bishop: tall oval, sharp clean mitre point, collar ring, thin neck, wide base
- [ ] Rook: straight tower, three even rectangular battlements, wide base with step
- [ ] Queen: five-point crown (center tallest), round ball on center, curved body, wide base
- [ ] King: cross on top (vertical + shorter horizontal), round collar, wider than Queen, base with step
- [ ] White: ivory `#F5F0E8`, dark outline `#333333`, 1.5px stroke, inner shadow
- [ ] Black: dark `#1C1C1C`, light outline `#CCCCCC`, 1.5px stroke, inner highlight
- [ ] Subtle drop shadow on all pieces
- [ ] Classic, Neo, Minimal, Wood style variants all working
- [ ] `renderPiece(ctx, pieceType, color, x, y, scale, style, hovered, dragging)` — hover lift offset and drag scale applied here

---

## PHASE 8 — GAME LOGIC & INTERACTION

**Verification checks:**
1. Confirm move generation and legal move highlighting work correctly
2. Confirm check, checkmate, stalemate, and draw are all detected
3. Confirm all four bot difficulty levels work
4. Confirm clocks count down and timeout is detected
5. Confirm captured pieces show in correct orientation (top = by bottom player, bottom = by top player)
6. Confirm pre-move system works — purple tint on queued squares, executes when legal, silently cancels when illegal
7. Confirm promotion UI shows popup with four piece options, not auto-promoting
8. Confirm opening detection works and updates the opening pill in real time

**Checklist:**
- [ ] Move generation and legal move highlighting
- [ ] Check, checkmate, stalemate, draw detection
- [ ] AI bot at all four difficulty levels (Easy/Medium/Hard/Impossible)
- [ ] Chess clocks — all presets, countdown, timeout detection
- [ ] Captured pieces tracked with correct orientation
- [ ] Pre-move system: queue move during opponent's turn, purple tint, execute if legal, silently cancel if illegal, right-click cancels, status label
- [ ] Promotion UI: floating popup, four large piece icons in promoting player's color, scale-in 0.15s, click to promote, ESC defaults to Queen
- [ ] En passant, castling, all special moves supported
- [ ] Opening detection: ECO lookup against bundled frontend JSON opening book, updates opening pill and top bar

---

## PHASE 9 — ANALYSIS MODE & GAME RESULT

**Verification checks:**
1. Confirm Analysis Mode can be entered from the Game Result screen and from the right panel
2. Confirm every move is classified (Best/Good/Inaccuracy/Mistake/Blunder) with correct colored icons in Game Record
3. Confirm accuracy score is calculated for both players and shown on the result screen
4. Confirm confetti fires on win but not on draw
5. Confirm Rematch button swaps colors and restarts immediately

**Checklist:**

### Analysis Mode
- [ ] Triggered via "Review" on result screen or "Analyse" button in right panel
- [ ] Replays full game move by move from position 0
- [ ] AI classifies each move: Best 🟢 / Good 🟡 / Inaccuracy 🟠 / Mistake 🔴 / Blunder 💀
- [ ] Classification icons beside each move in Game Record
- [ ] Evaluation bar updates live as moves are stepped through
- [ ] ← → buttons below board. Click move in Game Record to jump. Scrubber bar below board.
- [ ] "ANALYSIS MODE" banner below board in accent color
- [ ] Blunder squares flash red when stepped to
- [ ] Best move arrow overlay in green showing engine recommendation

### Accuracy Score
- [ ] 90–100 → green `#00cc44` → "Excellent"
- [ ] 70–89 → yellow `#ffcc00` → "Great"
- [ ] 50–69 → orange `#ff8800` → "Inaccurate"
- [ ] Below 50 → red `#ff3333` → "Struggling"
- [ ] Both players shown side by side on result screen

### Game Result Screen
- [ ] Modal slides in from top. `z-index: 2000`
- [ ] Large result text in Cinzel: "WHITE WINS" / "BLACK WINS" / "DRAW"
- [ ] Result reason (by Checkmate / by Resignation / by Agreement / on Time)
- [ ] Total moves and game duration
- [ ] Both players' accuracy scores side by side with color grades
- [ ] Four buttons: Rematch (swap colors), New Game, Review, Copy PGN
- [ ] Confetti on win — paper squares in winner's color for 2 seconds. No confetti on draw.
- [ ] Slide-down + fade-in, bg dims to `rgba(0,0,0,0.7)`

---

## PHASE 10 — FLICKER FIX

**Verification checks:**
1. Confirm needsRedraw dirty flag is implemented and clearRect is never called unconditionally
2. Confirm canvas dimensions are never set inside the render loop
3. Confirm cutsceneActive boolean pauses the main rAF loop while a cutscene plays
4. Confirm cutsceneQueued guard prevents dispatchCutscene being called multiple times
5. Confirm zero CSS animations or transitions on canvas elements or any ancestor element
6. Confirm animated background canvas has its own independent rAF loop and never shares a tick with the game loop
7. Confirm no setInterval touches the canvas — clock updates inside rAF loop only
8. Confirm DEBUG_FLICKER flag exists at top of file (default false)

**Checklist:**
- [ ] `needsRedraw` dirty flag — only clear+redraw when true
- [ ] `canvas.width` / `canvas.height` never set inside render loop
- [ ] `cutsceneActive` boolean — pauses main rAF loop during cutscenes
- [ ] `cutsceneQueued` guard — blocks re-entry into dispatchCutscene
- [ ] Zero CSS animations/transitions on canvas or any ancestor element
- [ ] Animated background is a fully independent canvas with its own loop
- [ ] No setInterval touching canvas — clock updates inside rAF via performance.now() delta
- [ ] Exact gameLoop + onCutsceneComplete architecture from prompt implemented
- [ ] `DEBUG_FLICKER = false` flag at top of file

---

## PHASE 11 — CUTSCENE SYSTEM

**Verification checks:**
1. Confirm cutscenes only fire when non-pawn captured or pawn captures non-pawn. Pawn-on-pawn = no cutscene.
2. Confirm Boss Capture (Queen captures King) forces Unique cutscene with CHECKMATE title card
3. Confirm rarity flash and letterbox bars play before every cutscene
4. Confirm first-time trigger plays at 0.5x speed with NEW! starburst
5. Confirm streak counter increments and toast fires at milestones 3/5/10/20
6. Confirm all 10 cutscenes are implemented with correct attacker/defender piece rendering
7. Confirm title card shows badge, name, rarity icon, percent, and streak badge correctly
8. Confirm all 10 badge designs render cleanly at radius 20, 24, 50, 64, 100

**Checklist:**

### Dispatch & Triggers
- [ ] Only fires when non-pawn captured OR pawn captures non-pawn
- [ ] Boss Capture: Queen captures King → force Unique, CHECKMATE title card
- [ ] Animations toggle off → no cutscenes. Action Captures toggle off → no cutscenes.
- [ ] Cutscene pieces match active piece style

### Rarity: Common 50% / Rare 28% / Epic 15% / Unique 7%

### Intro Sequence
- [ ] Rarity Flash (0.4s): color bursts from center, peaks ~60% opacity. Cursed piece → double intensity.
- [ ] Letterbox Slide (0.3s): two black bars slide in from top and bottom, stay for full duration

### First Time Bonus
- [ ] First trigger (0→1): 0.5x playback via playbackRate multiplier
- [ ] "NEW!" starburst in rarity color behind cutscene name
- [ ] Post-onComplete() first-time toast with badge at 24px

### Cutscene Streaks
- [ ] Milestone 3 → "On Fire" (`#ff6600`)
- [ ] Milestone 5 → "Rampage" (`#cc0000`)
- [ ] Milestone 10 → "Unstoppable" (`#aa00ff`)
- [ ] Milestone 20 → "Legendary" (`#ffcc00`)
- [ ] Streak toast from top-left after onComplete(). Active badge in title bar far-right. Resets on new game.

### The 10 Cutscenes (6 scene types, 5 Uniques)
- [ ] The Execution (Common)
- [ ] Drive-By (Rare)
- [ ] Sniper Shot (Rare)
- [ ] Meteor Strike (Epic)
- [ ] Lightning Duel (Epic)
- [ ] The Joust (Unique — Knight)
- [ ] The Inquisition (Unique — Bishop)
- [ ] Demolition (Unique — Rook)
- [ ] Assassination (Unique — Queen)
- [ ] Regicide (Unique — King)

### Title Card
- [ ] Far left: badge radius 24px, 8px padding
- [ ] Left of center: cutscene name Cinzel, rarity color
- [ ] Center: rarity icon ● ◆ ★ ✦ 👑
- [ ] Right of center: rarity label + percent
- [ ] Far right: active streak badge radius 20px
- [ ] Unique: gold/red particle burst on fade-in
- [ ] Checkmate: pulsing gold bar, no percent shown
- [ ] First Time: "NEW!" starburst

### Badge System
- [ ] renderBadge() clean at radius 20, 24, 50, 64, 100
- [ ] All 6 tiers: Locked / Gray / Green / Blue / Purple / Gold
- [ ] Daily Gold override: animated `#ffd700` pulse border
- [ ] All 10 badge designs implemented

---

## PHASE 12 — COLLECTION & STATS SCREENS

**Verification checks:**
1. Confirm Collection Screen opens via trophy icon in top bar and closes via X
2. Confirm all four tabs work: Cutscenes, Achievements, Streaks, Trophy Room
3. Confirm sort and filter work instantly with smooth re-layout animation
4. Confirm hover preview shows after 0.5s hover and fades out on hover-end
5. Confirm locked cutscene cards show "???" for name and padlock on badge
6. Confirm Stats Screen opens via bar chart icon and shows all four sections

**Checklist:**

### Collection Screen
- [ ] Fullscreen overlay z-index: 9998, via 🏆 top bar
- [ ] Four tabs: Cutscenes | Achievements | Streaks | Trophy Room
- [ ] Top summary strip: unlocked count, total captures, rarest ever, daily progress
- [ ] Sort: Name A–Z / Rarity / Trigger Count / Badge Tier
- [ ] Filter pills: All | Unlocked | Locked | Common | Rare | Epic | Unique
- [ ] Cutscene cards (3-column): badge 50px (360° rotate on hover), name in rarity color, rarity+percent, trigger count, tier label, progress bar, Daily Gold pulse border
- [ ] Hover preview: 160×90px looping canvas preview after 0.5s hover
- [ ] Stagger fade-in L→R, 60ms per card
- [ ] Achievements tab: earned = full color + date, unearned = dark + hint
- [ ] Streaks tab: best ever, current game, 4 streak badge cards, timeline bar
- [ ] Trophy Room: 5×2 grid radius 64px, wood-panel bg, click → modal (100px, Preview button)

### Stats Screen
- [ ] Piece Kill Counter table (🗡️ most deadly, 💀 most captured)
- [ ] Cutscene Frequency bar chart (Canvas, rarity colors)
- [ ] Rarity Breakdown donut chart (Canvas)
- [ ] Session History: scrollable log of last 50 triggers

---

## PHASE 13 — ACCOUNTS, LEADERBOARD, DAILY CHALLENGE

**Verification checks:**
1. Confirm username creation modal appears on first load
2. Confirm username displays in top bar with gear icon for rename
3. Confirm rivalry bar updates live during two-player games
4. Confirm daily challenge progress persists through page reloads
5. Confirm Daily Gold badge recolor persists permanently once earned

**Checklist:**

### Account & Username
- [ ] Username creation on first load (3–20 chars, alphanumeric + underscores)
- [ ] Displayed in top bar as `"👤 [username]"` with gear icon for rename
- [ ] Profile at top of Collection Screen: avatar, username, total captures, rarest ever

### Leaderboard (Local Multiplayer)
- [ ] Two players tracked separately in localStorage by username
- [ ] Rivalry bar: horizontal split proportional to trigger counts
- [ ] `"[Player] is dominating!"` or `"Tied!"` label updates live
- [ ] Game Summary modal at game end
- [ ] P2 turn indicator in top bar

### Daily Challenge
- [ ] One challenge per day, PRNG seeded by current date
- [ ] X triggers required: Unique=1, Epic=2, Rare=3, Common=5
- [ ] Reward: permanent Daily Gold animated border `#ffd700` on targeted badge
- [ ] "DAILY COMPLETE" toast from top-center with gold burst
- [ ] Progress widget in left panel updates live
- [ ] Daily progress persists through page reloads

---

## PHASE 14 — CURSED PIECE & ACHIEVEMENTS

**Verification checks:**
1. Confirm cursed piece glow appears on board at 3/5/7 trigger thresholds
2. Confirm "🔥 CURSED" label appears above piece on board at 3 triggers
3. Confirm rarity flash doubles intensity when a cursed piece is involved
4. Confirm cursed state resets on new game
5. Confirm all 23 achievements check correctly and toast fires on unlock
6. Confirm trail and border unlocks happen when their conditions are met

**Checklist:**

### Cursed Piece
- [ ] 3 triggers: orange glow `rgba(255,100,0,0.4)`, slow pulse, "🔥 CURSED" label above piece
- [ ] 5 triggers: red-orange `rgba(255,40,0,0.6)`, faster pulse
- [ ] 7+ triggers: crimson `rgba(200,0,0,0.8)`, erratic pulse + sparks, rarity flash doubles
- [ ] Resets on new game

### Achievements (23 total)
- [ ] First Blood, Collector, Rare Hunter, Epic Taste, Unique Witness
- [ ] Centurion, Jouster, Regicide, Gold Collector, Completionist
- [ ] On Fire, Legendary Game, Boss Slayer, Cursed Wielder, Daily Devotee
- [ ] Pyro (Flame trail unlock), Frostbite (Ice trail unlock), Gilded (Gold trail unlock)
- [ ] Royal (Royal trail unlock), Shadow (Shadow trail unlock)
- [ ] Dragon Born (Dragon border unlock), Marble Hall (Marble border unlock), Into the Void (Void border unlock)
- [ ] Mid-cutscene achievements queue and show after onComplete(). Toast top-right, auto-dismiss 3s.

---

## PHASE 15 — TOUCH CONTROLS OPTIMIZATION

**Verification checks:**
1. Confirm touch device is detected via `'ontouchstart' in window`
2. Confirm piece tap targets are enlarged 8px on all sides
3. Confirm radial move menu fans out with up to 8 destination circles
4. Confirm drag and drop works via touch events with page scroll prevented
5. Confirm long-press (500ms) triggers annotation color picker

**Checklist:**
- [ ] Detect touch via `'ontouchstart' in window`
- [ ] Enlarged tap targets: 8px padding on all sides via hit-test
- [ ] Radial move menu: up to 8 destination circles (36px, accent bg, white coord text), expand-from-center 0.2s
- [ ] 8+ legal moves → show 8 closest + "more" falling back to standard dots
- [ ] Drag via touch events, prevent page scroll while dragging
- [ ] Long-press (500ms) → annotation color picker popup

---

## PHASE 16 — PERSISTENCE & DEMO HARNESS

**Verification checks:**
1. Confirm all data saves under key "chessCutsceneData" in localStorage
2. Confirm data loads correctly on page init and survives page refresh
3. Confirm Reset All Data button clears localStorage and reloads page
4. Confirm DEBUG_MODE flag hides test harness in production (false by default)

**Checklist:**

### localStorage
- [ ] All data under key `"chessCutsceneData"` — full schema including theme, pieceStyle, trailStyle, borderStyle, bgAnimationEnabled, triggerCounts, firstTimeSeen, achievements, dailyChallenge, unlockedTrails, unlockedBorders, all player data, savedGames, sessionLog
- [ ] Load on page init
- [ ] Save after: every cutscene, achievement, daily update, theme change, move, game save

### Demo Test Harness
- [ ] `DEBUG_MODE = false` at top of file — harness only visible when true
- [ ] Attacker piece type + color dropdowns
- [ ] Defender piece type + color dropdowns
- [ ] Force Rarity dropdown (Random / Common / Rare / Epic / Unique)
- [ ] Force Checkmate toggle
- [ ] Force First Time toggle
- [ ] "Trigger Capture" button
- [ ] Live log of last 10 dispatches
- [ ] "Reset All Data" button — clears localStorage, reloads page

---

---

# APPENDIX C — VISUAL REFERENCE FILES

The following files are part of this project and should be read by Codex before building:

| File | Purpose |
|---|---|
| `chess_master_spec.md` | This document — complete build spec and source of truth |
| `chess_ui_mockup.html` | Visual reference for target UI — match layout, colors, components exactly |
| `chess_visuals.js` | Complete visual rendering module — piece rendering, skin system, board skins, animations |
| `chess_pieces_viewer.html` | Interactive viewer for all 44 piece skins across 6 rarity tiers |
| `chess_skin_gallery.html` | Gallery showing all skins grouped by rarity with animated previews |
| `chess_board_skins.html` | Gallery showing all 28 board themes with animated boards |
| `chess_multiplayer_preview.html` | Multiplayer split-board preview with 12 curated matchups |

---

# PART 24 — STORY MODE

## Overview
A fully narrative single-player campaign. 5 chapters, medieval setting, fully animated cutscenes between every fight. Separate save slot from the main game profile — story progress never touches bot trainer data. Chess pieces represent army units on a battlefield. Every capture cutscene is a real combat event in the story world.

## The World
- **Kingdom:** Aurveld — prosperous, beloved by its people, built on generations of raids nobody talks about
- **Enemy Kingdom:** Valdris — sounds ancient and powerful, is really one man's ego built into stone
- **Player:** The Prince of Aurveld (name customizable at start, male only)
- **Best Friend:** Saoirse — means "rebellion" in Irish, from a walled village outside Aurveld, true killer of the king
- **Enemy King:** Aldric the Undying — falsely claims credit for the murder as a power grab
- **The Iron King:** Edran — the player's father, beloved by Aurveld, built wealth through raids and conquest
- **Captain of the Guard:** Aldwyn Voss — Chapter 1 boss, 30-year veteran
- **Mercenary Queen:** Brenna of the Ashfields — Chapter 2 boss, fights for coin
- **Enemy General:** Edric Halvane — Chapter 3 boss, honorable, drops the key hint
- **Final Boss:** Saoirse — Chapter 5, hardest fight in the game

## Difficulty Modes
```
Story Mode  — Easy bots, infinite lives. For the narrative experience.
Standard    — Medium bots, 5 lives per section. Lose all → restart section.
Veteran     — Hard bots, 3 lives for entire run. Lose all → restart chapter.
Ironclad    — One life. Full restart on death. No consumables purchasable.
              Reward: Special darkened Ironclad variants of all boss skins.
```

## Fight Types
```
Rival fights  — No clock pressure. Mid-game hint available. Conversational tone.
                Used for friendly/testing fights within Aurveld court.
Enemy fights  — Tight clock. No mercy mechanics. Hostile opponents.
                Used for mercenaries, border lords, Valdris soldiers.
Boss fights   — Best of 3. Unique opening style. Signature difficulty.
                Mid-game taunts for Aldric (Chapter 4) — story text appears between moves.
```

## Economy in Story Mode
- Coins earned from wins and section replays
- Coins buy: Hint, Takeback, Time Extension, Extra Life (not in Ironclad)
- Sections fully replayable for coins after completion
- Boss skins earned once, kept forever, not re-locked on replay

## Completion Badges (displayed on profile)
```
Story Mode clear  → Bronze Shield — simple, engraved
Standard clear    → Green Shield  — polished, laurel trim
Veteran clear     → Gold Shield   — ornate, battle-scarred
Ironclad clear    → Red Shield    — animated, glowing ember edges, pulsing
```

## Boss Skins (Story Mode Exclusive)
Each boss drops a unique piece skin set on defeat. Ironclad variants unlocked by beating the full game on Ironclad.

```
Chapter 1 — Aldwyn Voss
  Normal:   Iron grey, deep blue trim. Scarred and functional.
  Ironclad: The Iron Oath — blackened armor, bloodred joints, glowing eye slots.

Chapter 2 — Brenna of the Ashfields
  Normal:   Bronze and deep crimson. Battle-worn, beautiful.
  Ironclad: The Ashen Queen — ash grey matte, near-black crimson edges.

Chapter 3 — Edric Halvane
  Normal:   Silver and black. Severe and elegant.
  Ironclad: The Black General — all black, iridescent oil-on-water edges.

Chapter 4 — Aldric the Undying
  Normal:   Deep purple and worn gold. Regal and heavy.
  Ironclad: The Hollow King — void where the purple was, tarnished green-black gold.

Chapter 5 — Saoirse
  Normal:   Fractured Aurveld gold and green, cracked down the middle.
  Ironclad: The Shattered — barely holding together, raw iron underneath, gold gone.
             Same skin regardless of which ending chosen on Ironclad.
```

## Endings & Achievements
```
KILL SAOIRSE → "For a King, For my Father"
  You become your father. Take Valdris, spread the wealth, people celebrate.
  Final image: you on the throne looking exactly like Edran.
  Skin: The Iron Succession — father's crown, gold but cold, cracked at base.
  Achievement: For a King, For my Father

SPARE SAOIRSE → "For my Friend"  
  Exile Saoirse. Take throne. Quietly dismantle what your father built.
  Final image: anonymous letter — "The Ashfields are planting again."
  Skin: The Merciful Crown — gold, whole, warm, laurel at base.
  Achievement: For my Friend

BEAT FULL GAME (either ending) → Achievement: Regicide
BEAT ON IRONCLAD → Achievement: Ironclad (animated red badge, permanent profile display)
```

## Character Roster & Loyalty System

Player-side non-pawn pieces are named characters. Pawns are always collective — "The Levied" — they go home regardless of ending. Opposition pieces have no named roster (generic types).

### Starting Roster (pre-ending, default)

```
Queen:    Seraphine  — trusted commander, unspoken relationship with the player,
                       admired Edran and believed in what he built
Bishops:  Maren      — female, coldly brilliant, follows orders, no loyalty
                       beyond function (queenside, c-file)
          Theron     — male, warm but unpredictable, leaves after the war
                       regardless of ending (kingside, f-file)
Knights:  Idris      — disciplined, methodical (queenside, b-file)
          Cael       — instinctive, risk-taker, stays no matter what
                       (kingside, g-file)
Rooks:    Brennar    — stays both endings (queenside, a-file)
          Seld       — female, from the Ashfields region, leaves if you spare
                       Saoirse (kingside, h-file)
Pawns:    The Levied — collective name, never individual
```

File-to-character mapping is fixed at game start from the current roster:
a-file rook → queenside rook, b-file knight → queenside knight, c-file bishop
→ queenside bishop, d-file queen, f-file bishop → kingside bishop, g-file
knight → kingside knight, h-file rook → kingside rook. Same mapping for both
colors on their home rank. Identity travels with the piece as it moves and is
read at capture time for the cutscene title card.

### Loyalty After KILL SAOIRSE ("For a King, For my Father")

```
Seraphine  stays.   She never asks what happened. You never tell her.
                    The silence is its own ending.
Maren      stays.
Theron     leaves.  The war he came to fight is over.
Idris      stays.
Cael       stays.
Brennar    stays.
Seld       stays.
The Levied go home.
```

Post-ending roster: queen=Seraphine, bishops=[Maren, null], knights=[Idris,
Cael], rooks=[Brennar, Seld]. The kingside bishop slot has no named character
— cutscene title cards render it as "Bishop" with no name.

### Loyalty After SPARE SAOIRSE ("For my Friend")

```
Seraphine  leaves.  She loved Edran and can't follow the king you're becoming.
                    No betrayal, just gone.
Erevan     arrives. Younger, rose through the ranks during your campaign,
                    believes in what you're building. Takes the queen role.
Maren      stays.
Theron     leaves.  (same as KILL — unrelated to the choice)
Idris      leaves.  Doesn't recognize the crown you're building.
Cael       stays.
Brennar    stays.
Seld       leaves.  Needs distance from the system you're quietly dismantling.
The Levied go home.
```

Post-ending roster: queen=Erevan, bishops=[Maren, null], knights=[null, Cael],
rooks=[Brennar, null]. Unnamed slots render as their piece type in cutscene
title cards.

### Persistence

Store in GameStore under `roster`:
```
roster: {
  outcome: null | 'kill_saoirse' | 'spare_saoirse',
  queen: 'Seraphine' | 'Erevan',
  bishops: { queenside: 'Maren', kingside: 'Theron' | null },
  knights: { queenside: 'Idris' | null, kingside: 'Cael' },
  rooks:   { queenside: 'Brennar', kingside: 'Seld' | null },
  pawns: 'The Levied',
}
```

A game-local identity grid (8×8, parallel to the board) tracks which character
occupies which square. Reset at game start from `currentRoster`, swapped on
every move, read at capture to populate the cutscene title card.

### Cutscene Title Card Integration

When a cutscene fires, render a subtitle line under the cutscene name:
`[attacker display] → [defender display]`. Display resolves as `identity ||
piece-type-capitalized`. Pawns always display "The Levied". Font: 10px Cinzel,
60% opacity of rarity color.

## New Game+
Available after any clear. Saoirse's dialogue is identical with one word changed per chapter. Invisible on first playthrough. Obvious on second. Full rewatch value.

## Chapter Structure Summary
```
Chapter 1 — The Iron King is Dead
  Brother fight: Cavan (personal, no clock, relationship choice pre and post)
  3 rival fights (Lord Caeven, Lady Mourne, Council of Three)
  Optional side quest: The Fenwick Villages (available before boss)
  Boss: Aldwyn Voss
  Theme: Prove you're ready. The kingdom tests you.

Chapter 2 — The March  
  3 enemy fights (Ashfield Rovers, Lord Drave, Ironclad Company)
  Boss: Brenna of the Ashfields
  Theme: Momentum. Moral complexity starts appearing.

Chapter 3 — Into Valdris
  3 enemy fights (Vanguard of Valdris, River Guard, Twin Commanders)
  Boss: Edric Halvane
  Theme: Doubt. Halvane reveals the alibi. Everything shifts.

Chapter 4 — Aldric the Undying
  Boss only (throne room confrontation)
  Special: Mid-game story taunts between moves
  Theme: The truth. Aldric didn't do it.

Chapter 5 — Saoirse
  Boss only (clearing outside camp, just the two of you)
  Theme: The reckoning. The choice.
```

## Presentation
- Fully animated cutscenes between every fight
- Pre and post fight dialogue per opponent
- Portrait art with spoken/text dialogue between scenes
- Rival fights: conversational, no clock, hint available mid-game
- Enemy fights: hostile, tight clock, no mercy
- Aldric boss fight: unique mid-game taunts appear as text overlays between moves

## Foreshadowing (Saoirse — subtle, not obvious)
Seeds planted so replay reveals what first playthrough missed:
- Ch1: "He was a great king to his people." (his people specifically)
- Ch1: Goes quiet longer than normal at one point, changes subject
- Ch2: "Some of this looks like home when I was young." (his village was raided)
- Ch3: After Halvane alibi reveal — "He's trying to get in your head." (true but deflection)
- Ch4: Aldric says "Ask your friend where he was that night." mid-game taunt
None are obvious on first playthrough. All land immediately on second.

## Save System
- Separate save slot from main game profile
- Story progress: current chapter, current section, lives remaining, difficulty
- Coins earned in story mode go to main profile coin pool
- Boss skins unlocked to main profile cosmetics collection immediately on earn
- Story save can be reset independently without touching main profile

---

# PARTY RELATIONSHIP SYSTEM

Each named party member has a 0-100 relationship meter stored under
`storyProgress.roster[characterId].relationship`. The tier of that meter
drives ability availability, the depth of information given, and — at
rock bottom — the occasional automatic play.

## Starting values
| Character | Role | Start |
|---|---|---|
| Seraphine | Queen | 72 |
| Idris | Knight | 65 |
| Cael | Knight | 58 |
| Maren | Bishop | 55 |
| Theron | Bishop | 48 |
| Brennar | Rook | 60 |
| Seld | Rook | 30 |
| The Levied | Pawns | 25 |
| Erevan | Queen (SPARE ending only) | 60 on join |

## Tiers
| Tier | Range | Behavior |
|---|---|---|
| High | 75-100 | Ability fires proactively after your move; full reasoning given; one bonus hint per turn |
| Neutral | 50-74 | Ability available on request; standard one-line output |
| Low | 25-49 | Ability available once per fight (long cooldown); less information; framing can turn cold |
| Rock bottom | 0-24 | Ask disabled. Once per fight the character may auto-play their own suggestion (legal, not always what you would pick) |

No one ever leaves the party because of relationship; the ending-driven
roster changes (Theron/Idris/Seld leaving after KILL/SPARE) are separate.

## Ability directory
All suggestions are drawn from `getLegalMoves` — every move is chess-legitimate.

- **Seraphine — The Strategist**: best move by combined heuristic of
  captures, centre control, and risk. Proactive at High, ask at Low.
- **Erevan — The Aggressor**: best attacking move — capture or threat on
  the enemy king. At Low stops mentioning the risk, just "take it."
- **Idris — The Calculator**: minimises expected material loss — escapes
  attacked pieces, prefers safe destinations.
- **Cael — The Opportunist**: highest upside capture, even when recaptured.
  At Low stops explaining the downside.
- **Maren — The Eliminator**: best capture where the victim value exceeds
  the cost if recaptured (or where the square is undefended).
- **Theron — The Protector**: identifies your most valuable attacked piece
  and proposes a defending move. At Low frames it as criticism.
- **Brennar — The Anchor**: once per fight, rook move to an open file or
  the 7th/2nd rank.
- **Seld — The Breaker**: enemy square with highest attackers-minus-
  defenders imbalance, then the shortest move toward it. At High explains
  the long-term structural plan. At Low just names the square.
- **The Levied**: no individual ability. When party morale is above 65, a
  simple pawn push hint becomes available. At rock-bottom morale the
  option disappears entirely.

## Morale
`partyMorale()` = mean of every currently active member's relationship.
Used by the Levied gate, by future merchant pricing, and by chapter-end
flavor text.

## Cooldowns + auto-move
- `resetPartyAbilityState()` runs at fight start.
- Low-tier hints mark their character as on cooldown for the rest of the
  fight the first time they fire.
- Brennar's Anchor is once per fight by construction.
- Rock-bottom auto-move has ~35% chance per polled turn, at most once per
  fight per character.

## Cavan
Not in party. Tracked under `storyProgress.cavanRelationship`, starts at
50. Shifts from Chapter 1 dialogue. His thread is not resolved in Part 1.

### Cavan character data

- **Name**: Cavan. Means *hollow*. The player's older/twin brother.
- Not a villain. He believes he would make the better king and he is not
  entirely wrong. The story must hold that uncertainty.
- After losing the Chapter 1 opening fight, he leaves — no betrayal, no
  anger, no oath. The thread stays open for a later chapter.
- **Silhouette**: king shape, slightly darker ivory than the player, with
  a hairline crack rendered as a thin dark line down the vertical centre.

### Cavan fight (Chapter 1 slot 0)

- No clock. Both sides show `--:--`. No time pressure ever.
- Pre-fight dialogue offers three lines that each shift
  `cavanRelationship`: +8 (warm), 0 (neutral), -10 (cold invoking Father).
- Post-fight: Cavan leaves. Player chooses how to send him off, each
  choice shifts the hidden meter: silence -4, "door is always open" +12,
  "you should have beaten me" +6.
- The meter does not appear in any UI. It is read later.

---

# MERCHANT SYSTEM

Between chapters a full-screen overlay appears after the boss win outro
and before the next chapter unlocks in the select screen. Inventory is
seeded per transition — it is the same every run. State persists under
`storyProgress.merchantHistory[merchantId] = { visited, purchased: [] }`.

## Categories

- **Consumables** — Hint token (50c), Takeback token (75c), Time extension (40c)
- **Information** — Lore fragments, 100-200c each
- **Relationship gifts** — Named gift that bumps a specific character's meter by +10 (150c each)
- **Backup pieces** — Alternate named party member slotted into a role (300-500c)

## Currency

Coins are shared with `botData.training.coins`. Story wins award a flat
sum per fight type: brother 40c, rival 60c, enemy 80c, sidequest 120c,
boss 200c.

## Merchants

| After chapter | Merchant | Flavor |
|---|---|---|
| 1 | The Road Peddler | Valdris-born caravaneer; honest about it |
| 2 | The Ashfield Quartermaster | Former Aurveld supply officer, unpaid for a year |
| 3 | The Archivist | Sells names. Does not barter. |
| 4 | The Last Stall | One table. A few things worth owning. |

Chapter 5 is immediately followed by the Saoirse fight — no merchant.

## Persistence

- Purchased ids are tracked so re-opens don't re-sell the same item.
- Consumables accumulate under `storyProgress.consumables`.
- Lore ids accumulate under `storyProgress.loreUnlocked`.
- Backup-piece choices write into `currentRoster` and seed the purchased
  name into `storyProgress.roster` with a neutral 50 relationship.

---

# PROLOGUE

A skippable five-scene canvas cinematic that plays once, the first time
the player launches Chapter 1 fight 0 (Cavan). Watched flag is stored at
`storyProgress.prologueWatched`.

## Skip

- `SKIP »` button fixed top-right on the overlay.
- Any `keydown` anywhere on the page while the prologue is running also
  skips. Single click on the button triggers the same handler.
- Skip jumps directly to Chapter 1 (post-prologue path).

## Scene 1 — THE PALACE AT NIGHT

Dark gradient sky, slow star drift (80 points), palace silhouette centre
with amber windows that flicker on a sine, crescent moon upper right,
warm orange city-light clusters along the lower edge.

Canvas text (not dialogue box), fading in on timing:

- `Aurveld. The kingdom built on gold land and older debts.`
- `For thirty years the Iron King ruled. His people loved him. His enemies feared him. Both for the same reason.`
- `He did not die in battle. He did not die of age.`
- `He died in his own bed. In his own castle. In the kingdom he built.`

## Scene 2 — THE LONG CORRIDOR

Forced-perspective stone corridor, four torch sconces creating overlapping
amber light pools with darkness between. Floor reflection via horizontal
ellipse under each torch. Door rectangle at far right.

No text. Abstract amber-brown human silhouette enters from the left,
walks slowly rightward through the pools, pushes through the door, gone.
Holds ~2 s on the empty corridor before the scene advances.

## Scene 3 — THE KING'S CHAMBER

Dying fire lower left with 14-particle ember system, large bed shape on
the right, heavy curtained narrow window. Iron King silhouette (king
shape, dark gold) still on the bed.

Amber-brown figure enters from the left, crosses the room. At t ≈ 5 s
the fire **goes out** — overlay full black for 1 s — then returns at
ember intensity. The figure lingers at the door, then is gone. King
silhouette never moves.

Text fade-in (canvas text):

- `No one saw who entered.`
- `No one saw who left.`
- `In the morning, they found the Iron King dead.`
- `And the door to his chamber open.`

## Scene 4 — THE THRONE AT DAWN

Pale blue-grey dawn gradient. Five diagonal light bars across stone
floor. 24 dust motes drift with the light. Empty throne far right with a
faint gold accent.

Three silhouettes facing away from the viewer: queen (warm gold), rook
(iron grey), king (ivory, slightly smaller). Four-second hold.

- `Three people stood in that room and looked at the empty throne.`
- `Each of them was thinking something different.`
- `Only one of them knew what had really happened.`

## Scene 5 — THE ACCUSATION

War room with map-covered long table, four candle corners with flicker
radials, narrow night-sky window. Silhouettes around the table. Aldric
enters as a dark teal-grey king shape at the far end. Messenger
(abstract) between them.

- Canvas text: `Three days after the Iron King's death, a message arrived from Valdris.`
- Dialogue box: `King Aldric of Valdris claims responsibility for the death of the Iron King Edran of Aurveld. He challenges the new king to answer it.`
- At the "agitation" beat the rook and queen silhouettes oscillate on a
  short sine shake.
- Later canvas text (dialogue clears first):
  - `The court demanded war.`
  - `The army demanded blood.`
  - `And the new king — not yet crowned, not yet ready — had to decide.`
  - `This is where your story begins.`

## Title card

Fade to black, "MERED" in Cinzel gold 64 px with letter-spacing 12, hold
~2.2 s, fade out, hand control to Chapter 1 flow.

---

# LOCATION BACKGROUND SYSTEM

Every story cutscene has a rendered canvas background. No plain black
fills. The system is a registry of 19 named renderers keyed by location
id, each taking `(ctx, w, h, t)`.

## Renderer ids

| id | Location |
|---|---|
| `palace_great_hall`        | Aurveld Palace — Great Hall |
| `palace_long_corridor`     | Aurveld Palace — Long Corridor |
| `palace_antechamber`       | Aurveld Palace — Antechamber |
| `palace_training_yard`     | Aurveld Palace — Training Yard |
| `palace_wall_top`          | Aurveld Palace — Castle Wall Top |
| `road_aurveld_farmland`    | The Road — Aurveld Farmland |
| `ashfields_open_road`      | The Ashfields — Open Road |
| `army_camp_night`          | Army Camp — Night |
| `camp_interior_tent`       | Camp — Interior Tent |
| `army_camp_perimeter`      | Army Camp — Perimeter Walk |
| `valdris_border_day`       | Valdris Border — Daytime |
| `valdris_border_town`      | Valdris Border Town |
| `valdris_war_room`         | Valdris War Room |
| `valdris_throne_room`      | Valdris Throne Room |
| `clearing_ch5`             | The Clearing — Chapter 5 |
| `farmhouse_cellar`         | Farmhouse Cellar |
| `archivist_room`           | Archivist's Room |
| `tavern_exterior`          | Tavern Exterior |
| `abandoned_farmhouse`      | Abandoned Farmhouse |

## API

- `openBackground(id, onReady)` — show overlay, seed particles, start loop.
- `setBackground(id)` — swap renderer without fade.
- `crossFadeToBackground(id, onReady)` — 300ms fade-to-black, swap, fade in.
- `closeBackground()` — stop loop, hide overlay.
- `showLoreParchment(title, body)` — slide-in `#f5e6c8` parchment from the right, click to dismiss.

## Animation rules (shared)

- **Fire/torch**: radial gradient + 7-14 ember particles, upward drift, orange -> transparent, respawn at source.
- **Stars**: 40 dots, vx ≈ 0.01-0.02 px/frame, wrap at canvas edge.
- **Banners**: sine sway 3 px amplitude, 4 s period, per-banner phase offset.
- **Ambient flicker**: torch radius varies ±8% on a 2.3 s sine, per-torch offset.
- **Mist/smoke**: 6 blobs, rightward drift 0.3 px/frame, wrap at edge.
- **Sentries**: slow linear translation looped via sine (0.0012 rad/frame).
- **Cap**: ≤30 particles total, enforced in `_bgTotalParticles()` + `_bgCapAllows()`.

## Layer order (per renderer)

1. Sky / ceiling gradient
2. Architecture / landscape silhouettes
3. Light sources (radial gradients) with flicker
4. Foreground elements (props, tables, beds)
5. Character silhouettes (drawn by cutscene layer, not renderer)
6. Dialogue / lore overlays (HTML, above canvas)

## Transitions

Always `crossFadeToBackground` between scenes — never a hard cut.

---

# CUTSCENE PRODUCTION SPEC

Cutscenes are data in the `CUTSCENES` registry. Each record carries:

```text
{
  bg: '<background id>',
  chapter: 'ch1'..'ch5',
  beforeFight?: '<fight id>',     // pre-fight hook
  afterFight?:  '<fight id>',     // post-fight hook
  sideQuest?:   '<sidequest id>', // side-quest hook
  endingBranch?: 'kill_saoirse' | 'spare_saoirse',
  steps: [ ... ]
}
```

## Step commands

| Command | Arguments | Effect |
|---|---|---|
| `place`   | id, x, y | spawn silhouette at normalised coords |
| `move`    | id, x, y, ms | smoothly translate silhouette |
| `shift`   | id, dx, dy | 2-5% emotional-beat offset (300 ms) |
| `drop`    | id | 10% yielding slump (200 ms) |
| `fade`    | id, to, ms | fade silhouette opacity |
| `swapbg`  | bg id | cross-fade background (300 ms) |
| `say`     | {speaker, text} | typewriter 20 ms/char; NEXT appears when complete |
| `choose`  | [{text, effect}] | full-width buttons 500 ms after last line |
| `lore`    | {id, title, body} | slide-in parchment; id recorded in `storyProgress.loreUnlocked` |

## Silhouette palette

| Character | Piece shape | Colour |
|---|---|---|
| Player      | king            | #e6dcc0 ivory |
| Cavan       | cracked king    | #b8a890 darker ivory + central hairline |
| Saoirse     | bishop          | #c88848 warm amber |
| Seraphine   | queen           | #c8a050 warm gold |
| Aldwyn      | rook            | #60606a iron grey |
| Idris       | knight          | #485058 dark steel |
| Cael        | knight          | #6c7480 lighter steel |
| Maren       | bishop          | #d4d4d0 cold white |
| Theron      | bishop          | #6c4a2c warm brown |
| Brennar     | rook            | #383838 dark granite |
| Seld        | rook            | #886a48 weathered bronze |
| Aldric      | king            | #2a3846 dark teal-grey |
| Halvane     | king            | #384850 cold blue-grey |
| Brenna      | queen           | #8a4a3a red-brown |
| Drave       | bishop          | #5a4838 muddy brown |
| Archivist   | bishop          | #8a7248 aged gold |
| Old Soldier | rook            | #5a4838 weathered |
| Civilian / Messenger | abstract human | dark |

## Registered cutscenes

- **Chapter 1** — `ch1.intro_cavan_room`, `ch1.after_cavan`, `ch1.after_caeven`, `ch1.after_mourne`, `ch1.saoirse_intro` (**Seed 1**), `ch1.sq_fenwick`, `ch1.before_aldwyn`
- **Chapter 2** — `ch2.opening` (**Seed 2**), `ch2.sq_deserter`, `ch2.drave_records` (**Seed 3**), `ch2.sq_archivist` (Saoirse's father story, unnamed), `ch2.camp_night_brenna` (**Seed 4**), `ch2.before_brenna`
- **Chapter 3** — `ch3.before_vanguard`, `ch3.sq_valdris_family`, `ch3.sq_old_soldier`, `ch3.camp_before_halvane` (**Seed 5**), `ch3.after_halvane`
- **Chapter 4** — `ch4.before_aldric`, `ch4.after_aldric`
- **Chapter 5** — `ch5.before_saoirse`, `ch5.ending_kill`, `ch5.ending_spare`

## Saoirse foreshadowing seeds (verbatim)

- **Seed 1** (`ch1.saoirse_intro`): `"My mother talked about Aurveld's court a lot. History. Politics. She found it fascinating."`
- **Seed 2** (`ch2.opening`): `"Some of this looks like home when I was young."`
- **Seed 3** (`ch2.drave_records`): player notes the routes go back thirty years. Saoirse: `"Before that."` Then a deflection: `"Another day."` when asked about his mother's village.
- **Seed 4** (`ch2.camp_night_brenna`): `"Be careful what you say to her after. She'll tell you things if you let her. People like that say important things if you're listening."`
- **Seed 5** (`ch3.camp_before_halvane`): `"Everything that was taken. I'd give it back."` Said quietly, not hypothetically.

Do not add clarifying dialogue around any seed. On replay, the picture
resolves; on first play, they are strange but forgettable.

## Archivist side quest — authorial intent

In `ch2.sq_archivist` the archivist describes a man caught with papers
at the border, hanged, whose wife fled east with an infant son, who
herself died years later. This is Saoirse's father. The archivist does
not name him. The player should not be told to connect the dots. Any
paid "tell me his name" branch must fail — she tells you she will not
sell it after offering the story for free.

## Integration

- `launchStoryFight` plays the pre-fight cutscene (if any) before the
  intro dialogue, or routes side-quest fights entirely through their
  cutscene (no board), with a side-quest coin reward on completion.
- `showResultModal` story patch runs the post-fight cutscene (if any)
  *before* the merchant interstitial, keeping the flow: fight -> outro -> post-fight cutscene -> merchant -> story select.
- `chooseEnding` plays `ch5.ending_kill` or `ch5.ending_spare` before
  the epilogue dialogue and the achievement toasts.


