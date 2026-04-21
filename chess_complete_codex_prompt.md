# Chess — Complete Codex Prompt (UI Overhaul + Cutscene System + New Features)

> **Paste this line first, at the very top, before anything else:**
> *"Build this as a single self-contained HTML file with inline CSS and JavaScript. No build tools, no npm, no external dependencies except Google Fonts and optionally GSAP from cdnjs. Everything runs by opening the file in a browser."*

---

# PART 1 — COMPLETE UI OVERHAUL

## Overview

Rebuild the entire chess UI from scratch. The current UI has a scrollable sidebar with too many controls crammed in, ugly layout, broken captured pieces display, and low-quality piece rendering. The goal is a clean, modern, premium-feeling chess interface. No scrollbars on the outer page. Everything fits on screen. Every control has a clear home.

---

## LAYOUT STRUCTURE

```
[ LEFT PANEL ]  [ BOARD + CLOCKS ]  [ RIGHT PANEL ]
```

- The **board** is always centered and dominant. Takes as much vertical space as possible while keeping everything visible without scrolling.
- **Left panel** (~220px): player info, captured pieces, opening name display, emoji reactions, daily challenge widget.
- **Right panel** (~260px): all game controls, game record, AI notes, collection/stats buttons.
- Page background uses the active **appearance theme** including its animated background layer.
- **No outer scrollbars.** Only specific internal regions (game record, session log) get a styled thin internal scrollbar.

---

## TOP BAR

Slim bar spanning full width (~48px tall):
- **Left**: `"♟ CHESS"` in `Cinzel` font, gold `#ffcc00`, subtle glow.
- **Center**: Game mode label — e.g. `"vs Bot — Hard"` | `"2 Player"` | `"Waiting..."` — small gray text. Below it in smaller text: **live opening name** (e.g. `"Ruy López — Berlin Defense"`) that updates as moves are played. Fades in when a known opening is detected.
- **Right**: `"👤 [username]"` with gear icon for rename. Icon buttons: 🏆 Collection, 📊 Stats. In two-player mode, a small `"P2 Turn"` badge when it is Player 2's turn.

---

## LEFT PANEL

### Top Player Info (opponent / top of board)
- Circular avatar (initials, hashed color) — 36px. Username beside it.
- Clock below — large bold monospace `MM:SS`. Red pulse when below 30s.
- Captured pieces row: small piece icons (20px) grouped by type, material advantage `+N`. **Top row = pieces captured BY the bottom player.** Do not reverse this.

### Bottom Player Info (local player / bottom of board)
- Same layout mirrored below the board.
- **Bottom row = pieces captured BY the top player.**

### Opening Name Display
- A slim pill-shaped label below the bottom player's captured pieces row.
- Shows ECO code and full opening name in real time (e.g. `"B20 — Sicilian Defense"`).
- Uses a bundled ECO opening book JSON lookup table — include at minimum the 50 most common openings.
- Fades in when an opening is detected, updates as the line deepens, fades to `"Custom Position"` when the line deviates.

### Emoji Reactions (Two-Player Mode Only)
- Row of 5 emoji buttons per player, outside their side of the board.
- Buttons: 👏 😤 🤔 😂 🔥
- On click: emoji animates large (64px) above the relevant player's side — floats upward and fades out over 1.2 seconds with a bounce-in on appearance.
- 3-second cooldown per player between reactions — button grays out during cooldown.
- Bot mode: only bottom player reactions shown.

### Daily Challenge Widget
- Compact card at bottom of left panel.
- Shows: badge (20px radius), challenge text, live progress bar, fraction `"2 / 3"`.
- On completion: border glows gold, checkmark appears.

---

## BOARD AREA

### Board Canvas
- HTML5 Canvas, centered, always square.
- Coordinate labels (a–h, 1–8) along edges in theme secondary color.
- Last move highlight on both squares.
- Selected piece highlight (bright accent ring).
- Legal move dots — solid dot for empty squares, ring outline for capture squares.
- Check highlight — King's square flashes red.
- Cursed piece glow — orange/red animated ring for pieces with 3+ cutscene triggers this game.
- **Pre-move squares** — purple tint `rgba(160,80,255,0.35)` on queued source and `rgba(160,80,255,0.2)` on destination.
- **Square annotation dots and arrows** — right-click painted overlays (see Square Highlighting below).

### Piece Hover Animation
When hovering a piece the current player can legally move:
- Piece renders 4px higher (subtle lift effect).
- Drop shadow increases from `rgba(0,0,0,0.3) 0 2px 4px` to `rgba(0,0,0,0.5) 0 8px 16px`.
- Instant on hover-in, eases out over 150ms on hover-out.
- Tracked via `hoveredSquare` — offset applied in `renderPiece` for that square only.
- Opponent pieces and pieces with no legal moves do NOT lift.

### Drag and Drop
- Click-to-move AND drag-to-move both work simultaneously.
- On mousedown/touchstart on a legal piece:
  - Piece "picks up" — renders under cursor at 1.15x scale with increased shadow.
  - Origin square shows ghost outline at 30% opacity.
  - Legal move dots appear on valid destinations.
- Dragged piece renders on a separate overlay canvas above the board — never clips under other pieces.
- On mouseup/touchend over a legal square: execute the move. Over illegal square or off-board: snap back to origin with elastic animation.
- On touch: use touch events, prevent page scroll while dragging.

### Square Highlighting (Right-Click Annotations)
Visual analysis tools — sit on top of the board, do not affect gameplay.

**Colored dots (right-click a square):**
- Right-click only → green `rgba(0,200,80,0.7)`
- Shift + right-click → yellow `rgba(255,200,0,0.7)`
- Ctrl + right-click → red `rgba(220,50,50,0.7)`
- Alt + right-click → blue `rgba(50,150,255,0.7)`
- Right-clicking an already-annotated square with same modifier removes the dot.

**Arrows (right-click drag):**
- Same modifier → color mapping as dots.
- Thick line with filled triangular arrowhead from source to destination.
- Arrow width ~18% of square size.
- Renders on top of dots and pieces.
- Dragging from a source with an existing arrow to same destination removes it.

**Clearing:** any left-click (move or select) clears all annotations instantly. A small eraser icon appears in the board's bottom-right corner when annotations are present.

**Render layer**: annotations on a separate transparent canvas above board canvas, below drag canvas. Three board-area canvas layers: board, annotations, drag.

### Piece Trails
When any piece completes a move (including bot moves):
- 4–6 ghost silhouettes of the piece at decreasing opacity (40% → 5%) and scale (100% → 60%) spaced along the move path.
- Fades out over 400ms via rAF.
- Trail color matches piece color — ivory for white, dark for black.

**Unlockable trail styles via achievements:**
- **Default** — plain ghost silhouettes (always available)
- **Flame** — orange/red particle wisps (unlock: trigger 10 cutscenes total)
- **Ice** — blue/white crystalline fragments (unlock: reach Blue badge tier on any cutscene)
- **Gold** — golden sparkle dots (unlock: reach Gold badge tier on any cutscene)
- **Royal** — purple/violet glowing orbs (unlock: witness all 5 Unique cutscenes)
- **Shadow** — pure black smoke wisps (unlock: trigger Regicide 10 times)

Active trail selected in Appearance section. Locked trails show as grayed padlocked swatches with unlock condition on hover.

### Custom Board Borders
Ornate decorative border renders around the outside of the board canvas, styled per active theme. Separate Canvas 2D element.

**Per-theme borders:**
- **Classic**: warm oak wood grain — horizontal/vertical grain lines in `#8B5E3C` tones, knot details at corners
- **Midnight**: thin dark metal frame with small rivets at four corners
- **Forest**: carved stone with vine/leaf motifs at corners, mossy green tones
- **Crimson**: dark wrought iron with flame scroll work at corners
- **Ice**: frosted glass — white crystalline edges with ice spike corner accents
- **Gold**: ornate gilded frame with decorative flourish patterns in `#C8A020` tones
- **Neon**: circuit board lines — thin traces, via holes at corners, glowing in theme accent color
- **Obsidian**: carved dark stone with faint runic markings along edges

**Unlockable border styles via achievements:**
- **Dragon**: red and gold dragon scales on all four sides (unlock: Boss Capture 5 times)
- **Marble**: white and gray veined marble inlay (unlock: Completionist achievement)
- **Void**: deep space starfield with slow-moving star particles (unlock: Meteor Strike 25 times)

Border is separate from theme — theme sets default but player can override in Appearance section once unlocked.

---

## ANIMATED BACKGROUNDS

Each theme has a **static background color** AND an **animated background layer** — a full-page Canvas at `z-index: -1` running its own completely independent rAF loop that never touches `needsRedraw` or `cutsceneActive`.

Animated backgrounds are subtle and atmospheric — they must not distract from the board.

**Per-theme animations:**
- **Classic**: slow drifting dust motes — tiny cream/gold particles float gently upward at ~15% opacity. Warm candlelit feel.
- **Midnight**: slow parallax star field — tiny white dots drift slowly rightward. Shooting star streaks every 8–15 seconds.
- **Forest**: animated fog wisps — soft white cloud shapes drift left to right at bottom of screen. Occasional leaf silhouette drifts down from top.
- **Crimson**: ember particles — tiny orange/red glowing dots float upward from the bottom edge, fading as they rise. Like standing near a dying fire.
- **Ice**: slow-falling snowflakes — small white dots of varying sizes drift downward with gentle horizontal sway, low opacity.
- **Gold**: golden particle shimmer — tiny bright gold specks twinkle in and out of visibility at random positions. Like sunlight through dust.
- **Neon**: grid pulse — faint grid of lines pulses with accent color in a slow wave traveling top-left to bottom-right, repeating every 4 seconds.
- **Obsidian**: slow aurora — two or three soft blobs of purple/blue/violet color drift very slowly across the background, blending. Like northern lights at ~10% opacity.

**Implementation rules:**
- Animated bg runs its own rAF loop — completely isolated from game loop and cutscene loop.
- Animated bg continues running behind the cutscene overlay when cutscenes are active.
- **Background Animation toggle** in Appearance section (default: on). Saved to localStorage.
- Auto-disables on `navigator.hardwareConcurrency < 4` with static fallback.

**Surface texture overlay:**
Full-page CSS overlay at `z-index: 0`, `pointer-events: none`, `opacity: 0.04–0.07`:
- Classic: fine linen `repeating-linear-gradient`
- Midnight: faint carbon fiber diagonal pattern
- Forest: subtle stone/concrete grain
- Crimson: rough leather texture approximation
- Ice: no texture (slight blur on bg only)
- Gold: fine silk diagonal weave
- Neon: no texture (clean)
- Obsidian: basalt stone grain

---

## RIGHT PANEL

Collapsible sections with chevron toggles. Default: all expanded except Game Record and AI Notes.

### Pre-Game Setup Section
Visible before Play. Disappears cleanly when game starts — no layout shift.
- **Bot Mode**: segmented buttons — Easy / Medium / Hard / Impossible.
- **Play As**: White King / Black King icon buttons.
- **Clock**: styled dropdown — No Clock / 1 min / 3 min / 5 min / 10 min / Custom.
- **Play Button**: full-width, gold gradient `#ffcc00 → #ff9900`, `Cinzel` font, gentle pulse.

### In-Game Controls Section
Replaces pre-game after Play.
- 2×N grid of pill-shaped icon buttons: ↩ Undo, 🔄 Restart, 💡 Hint, 🤝 Draw, 🏳 Resign, ▶ Resume.
- Destructive actions red-tint on hover, require confirmation dialog.

### Appearance Section
- **Theme swatches**: horizontal scrolling, 40×40px each, gold border on active, tiny 2×2 board preview.
- **Piece Style**: Classic / Neo / Minimal / Wood.
- **Trail Style**: swatches for each unlocked trail. Locked = padlock + unlock condition on hover.
- **Board Border**: swatches for each unlocked border. Default matches theme.
- **Background Animation toggle**: on/off pill.

### Utility Controls Section
- 🔊/🔇 Mute | 🎬 Animations (cutscene on/off) | ⚡ Action Captures

### Export Section
- Copy PGN (clipboard + `"Copied!"` toast) | Save Game | Load Game

### Game Record Section
- Collapsible. Two-column move list, alternating row shading, current move highlighted. Max height ~200px internal scroll.
- In **Analysis Mode**: colored icon beside each move (🟢 Best / 🟡 Good / 🟠 Inaccuracy / 🔴 Mistake / 💀 Blunder). Clicking a move jumps board to that position.

### AI Notes Section
- Collapsible. Best move for White, best move for Black, horizontal evaluation bar.

### Status Display
- Always visible at panel bottom. Green (your turn) / Yellow (bot thinking) / Red (check/checkmate).

---

## APPEARANCE THEMES

| Theme | Light Square | Dark Square | Page BG | Panel BG | Accent |
|---|---|---|---|---|---|
| **Classic** | `#F0D9B5` | `#B58863` | `#2b2b2b` | `#1e1e1e` | `#ffcc00` |
| **Midnight** | `#8ca2ad` | `#2d4a6b` | `#0d1117` | `#161b22` | `#58a6ff` |
| **Forest** | `#c8d8a8` | `#4a7c59` | `#1a2a1a` | `#162016` | `#7bc67e` |
| **Crimson** | `#e8c8b8` | `#8b3a3a` | `#1a0a0a` | `#180808` | `#ff4444` |
| **Ice** | `#dce8f0` | `#6090b0` | `#0a1520` | `#0d1a26` | `#a0d4f0` |
| **Gold** | `#f5e6c8` | `#9a7a3a` | `#1a1500` | `#181200` | `#ffd700` |
| **Neon** | `#1a1a2e` | `#0f0f1a` | `#000000` | `#0a0a0f` | `#00ffcc` |
| **Obsidian** | `#3a3a4a` | `#1a1a28` | `#050508` | `#0a0a10` | `#aa88ff` |

CSS custom properties: `--board-light`, `--board-dark`, `--bg-page`, `--bg-panel`, `--accent`, `--text-primary`, `--text-secondary`, `--border-color`. Entire UI shifts on theme change. All preferences saved to localStorage.

---

## PIECE RENDERING — QUALITY REQUIREMENTS

Rebuild all piece rendering from scratch using Canvas 2D bezier paths.

**General:**
- Recognizable at 40px–90px. Clean bezier curves. No jagged edges.
- White: ivory `#F5F0E8`, dark outline `#333333`, 1.5px stroke, inner shadow.
- Black: dark `#1C1C1C`, light outline `#CCCCCC`, 1.5px stroke, inner highlight.
- Subtle drop shadow on all pieces.

**Piece specs:**
- **Pawn**: round head, trapezoidal neck, wide flat base.
- **Knight**: THIS IS THE MOST CRITICAL FIX. Proper Staunton horse head silhouette in profile (facing right) using smooth bezier curves for muzzle, forehead, ear, neck, and mane ridge. Mane is a smooth clean ridge — not spiky. Base is a flat pedestal. Must be immediately recognizable as a horse head.
- **Bishop**: tall oval, sharp clean mitre point at top, collar ring, thin neck, wide base.
- **Rook**: straight tower, three even rectangular battlements, wide base with step.
- **Queen**: five-point crown (center tallest), round ball on center point, curved body, wide base.
- **King**: cross on top (vertical + shorter horizontal), round collar, wider than Queen, base with step.

**Style variants:**
- **Classic**: Staunton-inspired, standard proportions.
- **Neo**: same silhouettes, thinner strokes, angular details, subtle vertical gradient.
- **Minimal**: flat, no gradients, no shadows, thin outlines only.
- **Wood**: Classic silhouettes, warm `#C8A87A` White, dark walnut `#3D2010` Black, Canvas wood-grain pattern.

---

## PRE-MOVE SYSTEM

Players can queue a move during the opponent's/bot's turn:
- Click or drag a piece before opponent's move resolves → stored as pre-move.
- Source square: purple tint `rgba(160,80,255,0.35)`. Destination: `rgba(160,80,255,0.2)`.
- When opponent's move completes: pre-move executes instantly if still legal. If illegal (piece captured, would cause check): silently cancelled.
- Right-click anywhere cancels queued pre-move.
- `"Pre-move queued"` label in status bar while pending.

---

## PROMOTION UI

When pawn reaches back rank — do NOT auto-promote:
- Pause the game.
- Show floating popup card above/below the promotion square (depending on orientation).
- Four large piece icons (Queen, Rook, Bishop, Knight) in promoting player's color, each in a ~64px rounded square button.
- Hover: button lifts with accent glow.
- Click executes promotion, closes popup.
- Scale-in animation 0.15s. ESC defaults to Queen.
- `z-index: 1000`.

---

## ANALYSIS MODE

Triggered via `"Review"` on Game Result screen or `"Analyse"` button in right panel.

- Replays full game move by move from position 0.
- AI evaluator classifies each move: Best 🟢 / Good 🟡 / Inaccuracy 🟠 / Mistake 🔴 / Blunder 💀 (based on centipawn loss thresholds).
- Classifications appear beside moves in Game Record.
- Evaluation bar updates live as you step through moves.

**Navigation:** ← → buttons below board. Click move in Game Record to jump. Scrubber bar below board for dragging to any position.

**Visual:** `"ANALYSIS MODE"` banner below board in accent color. Blunder squares flash red when stepped to. Best move arrow overlay shows engine recommendation in green.

**Accuracy Score:**
- Formula: `100 - (average centipawn loss / 10)`, clamped 0–100.
- Grade: 90–100 green `#00cc44` / 70–89 yellow `#ffcc00` / 50–69 orange `#ff8800` / below 50 red `#ff3333`.
- Display: large number + grade + label (e.g. `"87 — Great"`, `"54 — Inaccurate"`).
- Both players shown side by side on Game Result screen.

---

## GAME RESULT SCREEN

After checkmate, resign, or draw — result modal slides in from top:
- Large result text in `Cinzel`: `"WHITE WINS"` / `"BLACK WINS"` / `"DRAW"`.
- Result reason: `"by Checkmate"` / `"by Resignation"` / `"by Agreement"` / `"on Time"`.
- Total moves and game duration.
- Both players' **accuracy scores** side by side with color grades.
- Four buttons: **Rematch** (swap colors, restart), **New Game** (pre-game setup), **Review** (Analysis Mode), **Copy PGN**.
- **Confetti** on win: paper squares in winner's color fall from top for 2 seconds. No confetti on draw.
- Slide-down + fade-in animation. Background dims to `rgba(0,0,0,0.7)`. `z-index: 2000`.

---

## TOUCH CONTROLS OPTIMIZATION

On touch devices (`'ontouchstart' in window`):
- **Enlarged tap targets**: piece tap area expanded 8px on all sides beyond visual square.
- **Radial move menu**: tapping a piece fans out up to 8 destination circles positioned in the direction of each legal move. Each circle (36px, accent bg, white coordinate text) executes the move when tapped. More than 8 legal moves → show closest 8 + `"more"` option falling back to standard dots. Radial expands from center in 0.2s.
- Drag and drop works via touch events. Page scroll prevented while dragging.
- **Long-press (500ms)** on a square → small color picker popup near the square for annotation color selection. Tap another square to draw arrow, tap same square to place dot.

---

## MODALS & DIALOGS

- **First load**: username creation — logo, welcome, input (3–20 chars, alphanumeric+underscores), `"Start Playing"`.
- **Confirmation** (Resign, Restart): centered dark card, Confirm (red) + Cancel (gray), scale+fade. Never use browser `confirm()`.
- **Saved games**: cards with date/moves/players/result, Load + Delete, empty state with piece illustration.
- **Rename**: input pre-filled with current username, Save + Cancel.

---

## RESPONSIVE BEHAVIOR

- Below 1100px: left panel collapses to hamburger-toggled drawer.
- Below 800px: both panels collapse to drawers, board takes full width.
- Board always square and centered. Mobile uses radial menu and touch controls.

---

# PART 2 — CUTSCENE SYSTEM

*(Integrated fully into Part 1 UI. Cutscene overlay at `z-index: 9999`.)*

---

## TRIGGER RULES

- Non-pawn captured OR pawn captures non-pawn → cutscene.
- Pawn captures pawn → NO cutscene.
- **Boss Capture**: Queen captures King → force Unique cutscene, CHECKMATE title card (pulsing gold bar, 👑 center, no percent).
- Animations toggle off → no cutscenes.
- Action Captures toggle off → instant captures, no cutscenes.

---

## PIECE RENDERING IN CUTSCENES

Reuse `renderPiece()` from Part 1. All cutscene characters show correct piece type, color, and active style.

---

## RARITY SYSTEM

- Common 50% → `#00cc44` green
- Rare 28% → `#4488ff` blue
- Epic 15% → `#ffcc00` yellow
- Unique 7% → `#ff3333` red

---

## CUTSCENE INTRO SEQUENCE

**Step 1 — Rarity Flash (0.4s):** rarity color bursts from screen center, peaks ~60% opacity, fades to black. Cursed piece involved → double intensity.

**Step 2 — Letterbox Slide (0.3s):** two black bars (12% screen height each) slide in from top and bottom, stay for full cutscene. Title card lives inside bottom bar.

---

## FIRST TIME BONUS

First trigger (0→1): 0.5x playback speed via `playbackRate`. `"NEW!"` starburst in rarity color behind cutscene name. Post-`onComplete()` toast with badge at 24px.

---

## CUTSCENE STREAKS

| Streak | Name | Icon | Color |
|---|---|---|---|
| 3 | On Fire | Three flames | `#ff6600` |
| 5 | Rampage | Skull + crossed swords | `#cc0000` |
| 10 | Unstoppable | Lightning in circle | `#aa00ff` |
| 20 | Legendary | Crown + stars | `#ffcc00` |

Milestone → streak toast from top-left after `onComplete()`. Active badge in far-right of title bar. Resets on new game.

---

## DAILY CHALLENGE SYSTEM

One cutscene per day (PRNG seeded by date). X triggers required (1 Unique → 5 Common). Reward: permanent Daily Gold animated border `#ffd700`. `"DAILY COMPLETE"` toast from top-center. Progress widget in left panel.

---

## ACCOUNT & USERNAME SYSTEM

Created on first load. Displayed in top bar. Profile at top of Collection Screen (avatar, username, total captures, rarest ever).

---

## LEADERBOARD (LOCAL MULTIPLAYER)

Two players tracked separately. Rivalry bar splits at center. `"[Player] is dominating!"` or `"Tied!"`. Game Summary modal at game end. P2 turn indicator in top bar.

---

## CUTSCENE TITLE CARD

Inside bottom letterbox bar, fades in 0.3s:
- Far left: badge radius 24px, 8px padding
- Left of center: cutscene name in `Cinzel`, rarity color
- Center: rarity icon ● ◆ ★ ✦ 👑
- Right of center: rarity label + percent
- Far right: active streak badge radius 20px (if milestone active)
- Unique: gold/red particle burst on fade-in
- Checkmate: pulsing gold bar
- First Time: `"NEW!"` starburst

---

## BADGE SYSTEM

`renderBadge(ctx, cutsceneId, triggerCount, x, y, radius)` — clean at radius 20, 24, 50, 64, 100.

| Count | Tier | Border | Fill |
|---|---|---|---|
| 0 | Locked | `#555555` | `#222222` |
| 1–9 | Gray | `#aaaaaa` | `#333333` |
| 10–24 | Green | `#00cc44` | `#003311` |
| 25–49 | Blue | `#4488ff` | `#001133` |
| 50–99 | Purple | `#aa44ff` | `#220033` |
| 100+ | Gold | `#ffcc00` | `#332200` |

Locked = padlock icon. Daily Gold override = animated `#ffd700` pulse border.

**Badge designs:**
- The Execution: broadsword pointing down with X crossing blade
- Drive-By: low-rider silhouette with motion lines and muzzle flash
- Sniper Shot: circular crosshair with diamond center
- Meteor Strike: three meteors streaking diagonally
- Lightning Duel: zigzag bolt with opposing arrows flanking
- The Joust: two lances crossing X with shield at overlap
- The Inquisition: gothic arch window with starburst inside
- Demolition: wrecking ball on short chain from upper corner
- Assassination: rose with dagger blade behind stem
- Regicide: crown with jagged vertical crack through center

---

## THE 6 CUTSCENES

**1. COMMON — "The Execution"** (~2.5s, green)
Stone platform. Defending piece kneels in its color+type. Attacking piece walks in from left — executioner hood, identifiable by color/shape/chest badge. Broadsword slow motion. White flash. Defender shatters into colored fragments. Attacker bows. Fade to black.

**2. RARE — "Drive-By"** (~2s, blue)
City street. Defending piece on sidewalk in its color. Car in attacker's color with attacker's icon on door. Tommy gun. Sparks in attacker's color. Defender explodes. Tire screech fades.

**3. RARE — "Sniper Shot"** (~3s, blue)
Black screen. Crosshair locks onto defending piece in its color. Scope badge shows attacker's icon. Tension pause. Gunshot. Colored fragments. Shell casing in attacker's color bounces.

**4. EPIC — "Meteor Strike"** (~3.5s, yellow)
Board zooms to space. Meteor in attacker's color+icon screams in. Defending piece looks up in horror in full color. Impact shockwave. Debris in defender's color. Camera zooms back.

**5. EPIC — "Lightning Duel"** (~3s, yellow)
Stormy arena. Attacker and defender face off in full color. Lightning bolt in attacker's color crashes center. Defender launches back, bounces off wall, crumbles in their color. Attacker stands victorious.

**6. UNIQUE — Per defending piece (7% / forced Boss Capture):**
- **Knight → "The Joust"**: Attacker's color+icon on left shield, defending Knight's on right. Lances splinter. Knight ragdolls into colored fragments. Attacker victory lap. Herald trumpet. Banner drops.
- **Bishop → "The Inquisition"**: Gothic cathedral. Gregorian chant. Defending Bishop in their color. Inquisitors in attacker's color+icon surround. Lightning through stained glass shaped like attacker's icon. Bishop obliterates. Candle blows out.
- **Rook → "Demolition"**: Defending Rook as castle tower in defender's color. Wrecking ball in attacker's color+icon. Tower collapses in defender's color dust. Workers cheer.
- **Queen → "Assassination"**: Defending Queen waltzes in full color. Tuxedo in attacker's color+icon as lapel pin. Rose → blade. Queen explodes. Crown rolls.
- **King → "Regicide"**: Defending King in full color. Mob in attacker's color+icon floods in. King raises scepter. Overwhelmed. Fade to black. Crown hits floor and rolls to silence.

---

## COLLECTION SCREEN

`z-index: 9998`, via 🏆 top bar. Dark `#111111` with vignette. `"CUTSCENE COLLECTION"` Cinzel gold. Close X top-right.

**Four tabs**: Cutscenes | Achievements | Streaks | Trophy Room

**Top strip**: unlocked count | total captures | rarest ever | daily progress

**Sort**: Name A–Z / Rarity / Trigger Count / Badge Tier
**Filter pills**: All | Unlocked | Locked | Common | Rare | Epic | Unique

**Cutscene cards (3-column):**
- Badge 50px radius, 360° rotate on hover. Name in rarity color (`"???"` if locked).
- Rarity + percent, trigger count, tier label, progress bar (MAX at Gold).
- Daily Gold pulse border if earned.
- Hover preview: 160×90px looping canvas preview after 0.5s hover.
- Card: `rgba(255,255,255,0.04)` bg, rarity border (50% dim if locked). Hover: glow.
- Stagger fade-in L→R, 60ms per card.

**Achievements tab**: earned = full color + date, unearned = dark + hint. Same stagger.
**Streaks tab**: best ever, current game, 4 streak badge cards, session timeline bar.
**Trophy Room**: `"TROPHY ROOM"` Cinzel gold, 5×2 grid radius 64px, wood-panel bg. Click → modal (100px, count, progress, date, Preview button).

---

## STATS SCREEN

`z-index: 9998`, via 📊 top bar.
- Piece Kill Counter table (🗡️ most deadly, 💀 most captured)
- Cutscene Frequency bar chart (Canvas, rarity colors)
- Rarity Breakdown donut chart (Canvas)
- Session History: scrollable log of last 50 triggers

---

## CURSED PIECE MECHANIC

- 3 triggers: orange glow `rgba(255,100,0,0.4)`, slow pulse, `"🔥 CURSED"` label above piece
- 5 triggers: red-orange `rgba(255,40,0,0.6)`, faster pulse
- 7+ triggers: crimson `rgba(200,0,0,0.8)`, erratic pulse + sparks, rarity flash doubles intensity
- Resets on new game

---

## ACHIEVEMENT SYSTEM

| ID | Name | Description | Icon |
|---|---|---|---|
| `first_blood` | First Blood | Trigger first cutscene | ⚔️ |
| `collector` | Collector | Unlock all 10 cutscenes | 📦 |
| `rare_hunter` | Rare Hunter | 10 Rare cutscenes | ◆ |
| `epic_taste` | Epic Taste | 5 Epic cutscenes | ★ |
| `unique_witness` | Unique Witness | All 5 Unique cutscenes | ✦ |
| `centurion` | Centurion | Any single cutscene 100 times | 🏆 |
| `jouster` | Jouster | The Joust 25 times | 🐴 |
| `regicide` | Regicide | Regicide 25 times | 👑 |
| `gold_collector` | Gold Collector | Gold tier on any badge | 🥇 |
| `completionist` | Completionist | Gold tier on all badges | 💎 |
| `on_fire` | On Fire | 3-cutscene streak in one game | 🔥 |
| `legendary_game` | Legendary Game | 20-cutscene streak in one game | 🌟 |
| `boss_slayer` | Boss Slayer | Boss Capture cutscene | 👑 |
| `cursed_wielder` | Cursed Wielder | Piece reaches 7+ triggers | 😈 |
| `daily_devotee` | Daily Devotee | Complete 7 daily challenges | 📅 |
| `trail_flame` | Pyro | Trigger 10 cutscenes total → unlocks Flame trail | 🔥 |
| `trail_ice` | Frostbite | Blue badge tier on any cutscene → unlocks Ice trail | ❄️ |
| `trail_gold` | Gilded | Gold badge tier on any cutscene → unlocks Gold trail | ✨ |
| `trail_royal` | Royal | All 5 Unique cutscenes → unlocks Royal trail | 👑 |
| `trail_shadow` | Shadow | Regicide 10 times → unlocks Shadow trail | 🖤 |
| `border_dragon` | Dragon Born | Boss Capture 5 times → unlocks Dragon border | 🐉 |
| `border_marble` | Marble Hall | Completionist → unlocks Marble border | 🏛️ |
| `border_void` | Into the Void | Meteor Strike 25 times → unlocks Void border | 🌌 |

Mid-cutscene achievements queue and show after `onComplete()`. Toast top-right, auto-dismiss 3s.

---

## PERSISTENCE (localStorage)

Key: `"chessCutsceneData"`

```json
{
  "username": "player1",
  "theme": "Classic",
  "pieceStyle": "Classic",
  "trailStyle": "Default",
  "borderStyle": "theme-default",
  "bgAnimationEnabled": true,
  "triggerCounts": {
    "execution": 0, "driveby": 0, "sniper": 0, "meteor": 0,
    "lightning": 0, "joust": 0, "inquisition": 0,
    "demolition": 0, "assassination": 0, "regicide": 0
  },
  "firstTimeSeen": {
    "execution": false, "driveby": false, "sniper": false, "meteor": false,
    "lightning": false, "joust": false, "inquisition": false,
    "demolition": false, "assassination": false, "regicide": false
  },
  "achievements": {
    "first_blood": { "earned": false, "date": null }
  },
  "dailyChallenge": {
    "date": "2024-01-15", "cutsceneId": "sniper",
    "target": 3, "progress": 1,
    "completed": false, "dailyGoldEarned": false
  },
  "unlockedTrails": ["Default"],
  "unlockedBorders": [],
  "totalCaptures": 0,
  "rarestEver": null,
  "bestStreak": 0,
  "streakBadgesEarned": [],
  "pieceKillCounts": {
    "pawn": 0, "knight": 0, "bishop": 0,
    "rook": 0, "queen": 0, "king": 0
  },
  "players": {
    "player1": { "totalCaptures": 0, "rarestEver": null, "triggerCounts": {} },
    "player2": { "totalCaptures": 0, "rarestEver": null, "triggerCounts": {} }
  },
  "savedGames": [],
  "sessionLog": []
}
```

Load on page init. Save after every cutscene, achievement, daily update, theme change, move, and game save.

---

## FLICKER & SCREEN FLASH FIX

Build flicker-free from the start. Implement every item below.

**1. Dirty Flag**: `needsRedraw` boolean. Only clear+redraw when true. Set true on: piece move, selection change, highlight change, clock tick, cutscene complete. Never unconditionally redraw every rAF tick.

**2. Never Resize Canvas Inside Render Loop**: `canvas.width` / `canvas.height` set once on init and only again on `window resize`.

**3. Pause Main Loop During Cutscenes**: `cutsceneActive = true` stops main rAF. Cutscene has its own rAF loop. `onCutsceneComplete()` restarts game loop.

**4. No CSS Animations on Canvas or Ancestors**: Animations/transitions ONLY on overlay, toast, badge, modal elements. Never on canvas, its wrapper, or any ancestor element.

**5. dispatchCutscene Guard**: `cutsceneQueued` flag blocks re-entry. Capture event listeners added exactly once.

**6. Canvas Layer Isolation**: board canvas, annotations canvas, drag canvas, cutscene overlay canvas — never draw to multiple layers on the same rAF tick. Animated bg is a fifth independent canvas with its own loop.

**7. No setInterval Touching Canvas**: clock updates inside rAF loop using `performance.now()` delta only.

**Required architecture:**
```javascript
let needsRedraw = false;
let cutsceneActive = false;
let cutsceneQueued = false;

function gameLoop(timestamp) {
  if (!cutsceneActive) {
    if (needsRedraw) {
      clearCanvas();
      drawBoard();
      drawPieces();
      drawHighlights();
      drawAnnotations();
      drawCursedGlows();
      drawTrails();
      needsRedraw = false;
    }
    requestAnimationFrame(gameLoop);
  }
  // cutsceneActive = true: cutscene manages its own rAF.
  // onCutsceneComplete() restarts gameLoop.
}

function onCutsceneComplete() {
  cutsceneActive = false;
  cutsceneQueued = false;
  needsRedraw = true;
  requestAnimationFrame(gameLoop);
}
```

**Debug Mode**: `DEBUG_FLICKER = false` at top of file. When true: logs every `clearRect` with timestamp + stack snippet, shows live redraws/sec counter on board canvas corner, logs every `dispatchCutscene` with guard result.

---

## FULL IMPLEMENTATION REQUIREMENTS

### Canvas Layers (stacking order)
1. Animated background canvas — `z-index: -1`, fully independent rAF loop
2. Board canvas — squares, pieces, highlights, cursed glows, trails
3. Annotations canvas — right-click dots and arrows, `pointer-events: none` for non-right-click
4. Drag overlay canvas — dragged piece only, transparent when not dragging
5. HTML UI layer — panels, top bar, status
6. Modals — `z-index: 1000`
7. Game Result screen — `z-index: 2000`
8. Collection / Stats screens — `z-index: 9998`
9. Cutscene overlay canvas — `z-index: 9999`
10. Toasts — `z-index: 10000`

### Core Render Functions
- `applyTheme(themeName)` — CSS variables, bg animation swap
- `renderBoard(ctx)` — squares, coords, highlights, check flash, premove tint
- `renderPiece(ctx, pieceType, color, x, y, scale, style, hovered, dragging)`
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

### Cutscene Functions
- `renderBadge(ctx, cutsceneId, triggerCount, x, y, radius)`
- `renderTitleCard(ctx, name, rarityLabel, rarityPercent, rarityColor, rarityIcon, cutsceneId, triggerCount, streakBadge, isCheckmate, isFirstTime)`
- `playIntroSequence(rarityColor, isCursed, onComplete)`
- `dispatchCutscene(attackerType, attackerColor, defenderType, defenderColor, isCheckmate, onComplete)`
- `renderCutscenePreview(ctx, cutsceneId, x, y, width, height, loopTime)`

### UI & State Functions
- `showPromotionUI(square, color, onSelect)`
- `showGameResultScreen(result, reason, moves, duration, accuracyWhite, accuracyBlack)`
- `enterAnalysisMode(gameHistory)` / `exitAnalysisMode()`
- `calculateAccuracy(moveHistory)` → `{ white: number, black: number }`
- `queuePremove(from, to)` / `clearPremove()` / `executePremoveIfLegal()`
- `openCollectionScreen()` / `closeCollectionScreen()`
- `openStatsScreen()` / `closeStatsScreen()`
- `checkAchievements()` — includes trail + border unlock checks
- `showAchievementToast(achievement)` — top-right
- `showStreakToast(milestone)` — top-left
- `showDailyCompleteToast()` — top-center
- `showConfirmDialog(title, message, onConfirm)`
- `saveGame()` / `loadGame(slot)` / `openSavedGamesModal()`
- `switchPlayer(playerNumber)`
- `updateDailyChallenge(cutsceneId)`

### Fonts & Dependencies
- `Cinzel` + `Inter` (or `Roboto`) from Google Fonts at top of file
- GSAP from cdnjs acceptable
- Single `.html` file, no npm, no build tools

### Code Quality
- CSS custom properties for all theme values
- `DEBUG_FLICKER` and `DEBUG_MODE` flags at top of file (both default `false`)
- Every cutscene function commented with animation stages and piece render injection points
- Theme system commented with instructions for adding new themes
- Top-of-file block comment with chess.js hook instructions

---

## STAGING TIPS FOR CODEX

If context runs out, continue in this order:

1. *"Build the full 3-column layout: top bar with opening name, left panel (player info, clocks, captured pieces in correct orientation, opening pill, emoji reactions, daily widget), centered board, right panel with all collapsible sections. Classic theme only, no game logic yet."*
2. *"Now add all 8 appearance themes with CSS variable system, theme swatches, animated background canvases for each theme, and surface texture overlays."*
3. *"Now add all piece rendering — 6 pieces in 4 styles. Knight MUST be a proper Staunton horse head in profile using bezier curves. Add piece hover lift, piece trails system with 6 styles (Default + 5 unlockable), and board borders for all 8 themes plus 3 unlockable borders."*
4. *"Now add chess game logic — move generation, legal moves, check detection, AI bot at all difficulty levels, clocks, correct captured pieces, premove system, promotion UI, drag and drop, right-click square annotations."*
5. *"Now add Analysis Mode with move classification, accuracy scores, game record colored icons, and the Game Result screen with confetti and Rematch/Review buttons."*
6. *"Now implement the full flicker fix — dirty flag, cutsceneActive guard, 5-layer canvas stack, no canvas resize in loop, no CSS animations on ancestors, debug mode flag."*
7. *"Now add the full cutscene system — all 6 cutscenes with attacker/defender piece rendering, rarity roll, intro flash, letterbox bars, title card with badges, streak system."*
8. *"Now add the Collection Screen with all four tabs, sort/filter, hover previews, and the Stats Screen."*
9. *"Now add Account system, Leaderboard rivalry, Daily Challenge, Cursed Piece mechanic, touch optimizations, emoji reactions, and opening book ECO detection."*
10. *"Now add all 23 achievements including trail and border unlocks, full localStorage persistence, and the demo test harness with Reset All Data button."*
