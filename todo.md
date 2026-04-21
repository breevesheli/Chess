# Chess Project — Full To-Do List

Everything decided across this conversation. Work top to bottom. The full Codex prompt is in `chess_complete_codex_prompt.md`. This file is the checklist.

---

## FILES IN THIS PROJECT

| File | Purpose |
|---|---|
| `chess_complete_codex_prompt.md` | Full prompt to paste into Codex |
| `chess_ui_mockup.html` | Visual reference for target UI — Codex should match this layout, colors, and component structure |
| `todo.md` | This file — checklist of everything to build |

---

## CODEX STARTING MESSAGE

Paste this as your first message to Codex:

> *"Read all the existing files in the Chess Popup folder first. Then read chess_complete_codex_prompt.md. This project is a Python + web hybrid — a Python Flask backend (chess_popup_server.py) handles the chess engine and AI, and a web frontend (chess_popup.html, chess_popup.css, chess_popup.js) handles the UI. Do not touch any Python files. Only overhaul the frontend — chess_popup.html, chess_popup.css, and chess_popup.js — to match everything described in the spec. Preserve all existing API calls to the Python backend. The frontend communicates with the backend via HTTP requests — keep all of those endpoints intact. Layer the new UI, cutscene system, themes, animations, and all other features on top of the existing frontend code.*
>
> *There is also a file called chess_ui_mockup.html in the Chess Popup folder. Read it as the visual and structural reference for the target UI — match its layout, color scheme, component structure, spacing, and styling as closely as possible when rebuilding the frontend. This mockup shows the exact 3-column layout, panel organization, theme swatches, player cards, collapsible sections, board area, and overall dark aesthetic that the final UI should match.*
>
> *Before writing any code, audit what the existing frontend already has and what still needs to be built according to the spec. Then ask me to confirm before you start generating.*
>
> *Work through the spec in the staging order listed at the bottom of chess_complete_codex_prompt.md. Complete one phase fully before moving to the next.*
>
> *Output the result as updated chess_popup.html, chess_popup.css, and chess_popup.js files. Mark completed items in todo.md as each phase finishes."*

---

## BETWEEN EACH PHASE — VERIFICATION TEMPLATE

After each phase completes, send this before confirming the next phase. Fill in the phase-specific checks from the list below:

> *"Good. Before moving to Phase [N+1], self-check Phase [N]: [paste checks]. Fix anything that fails before proceeding. If all checks pass, move to Phase [N+1]."*

---

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
- [x] CSS custom property system: `--board-light`, `--board-dark`, `--bg-page`, `--bg-panel`, `--accent`, `--text-primary`, `--text-secondary`, `--border-color`
- [x] Classic, Midnight, Forest, Crimson, Ice, Gold, Neon, Obsidian (all values defined in prompt)
- [x] Entire UI shifts on theme change (panels, modals, buttons, overlays, toasts)
- [x] Theme saved to localStorage and applied on page load
- [x] Theme system commented with instructions for adding new themes

---

## PHASE 7 — PIECE RENDERING (full rebuild)

**Verification checks:**
1. Confirm Knight is a proper Staunton horse head in profile using smooth bezier curves — not Unicode, not SVG sprite, not a blob
2. Confirm all 6 pieces are recognizable at 40px–90px board square sizes
3. Confirm all 4 style variants work — Classic, Neo, Minimal, Wood
4. Confirm white and black pieces are visually distinct with correct colors and outlines
5. Confirm pieces have subtle drop shadow

**Checklist:**
- [x] All 6 pieces rebuilt with clean Canvas 2D bezier curves — no jagged edges
- [x] Knight fix (HIGHEST PRIORITY): proper Staunton horse head in profile, smooth bezier curves for muzzle/forehead/ear/neck/mane. Must be immediately recognizable.
- [x] Pawn: round head, trapezoidal neck, wide flat base
- [x] Bishop: tall oval, sharp clean mitre point, collar ring, thin neck, wide base
- [x] Rook: straight tower, three even rectangular battlements, wide base with step
- [x] Queen: five-point crown (center tallest), round ball on center, curved body, wide base
- [x] King: cross on top (vertical + shorter horizontal), round collar, wider than Queen, base with step
- [x] White: ivory `#F5F0E8`, dark outline `#333333`, 1.5px stroke, inner shadow
- [x] Black: dark `#1C1C1C`, light outline `#CCCCCC`, 1.5px stroke, inner highlight
- [x] Subtle drop shadow on all pieces
- [x] Classic, Neo, Minimal, Wood style variants all working
- [x] `renderPiece(ctx, pieceType, color, x, y, scale, style, hovered, dragging)` — hover lift offset and drag scale applied here

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

## BUGS TO FIX (from current version)

- [ ] Captured pieces display reversed — fix so top = by bottom player, bottom = by top player
- [ ] Knight piece looks malformed — rebuild with proper bezier curve Staunton horse head
- [ ] Continuous screen flickering/flashing — implement full Phase 10 flicker fix
- [ ] Sidebar scrollbar ugly and cramped — resolved by full Phase 1–5 UI overhaul

---

## STAGING ORDER FOR CODEX

Use these as follow-up prompts when context runs out:

1. *"Build the full 3-column layout matching chess_ui_mockup.html: top bar with opening name, left panel (player info, clocks, captured pieces in correct orientation, opening pill, emoji reactions, daily widget), centered board, right panel with all collapsible sections. Classic theme only, no game logic yet."*
2. *"Now add all 8 appearance themes with CSS variable system, theme swatches, animated background canvases for each theme, and surface texture overlays."*
3. *"Now add all piece rendering — 6 pieces in 4 styles. Knight MUST be a proper Staunton horse head in profile using bezier curves. Add piece hover lift, piece trails with 6 styles, and board borders for all 8 themes plus 3 unlockable borders."*
4. *"Now add chess game logic — move generation, legal moves, check detection, AI bot at all difficulty levels, clocks, correct captured pieces orientation, premove system, promotion UI, drag and drop, right-click square annotations."*
5. *"Now add Analysis Mode with move classification, accuracy scores, game record colored icons, and the Game Result screen with confetti and Rematch/Review buttons."*
6. *"Now implement the full flicker fix — dirty flag, cutsceneActive guard, 5-layer canvas stack, no canvas resize in loop, no CSS animations on ancestors, debug mode flag."*
7. *"Now add the full cutscene system — all 10 cutscenes with attacker/defender piece rendering, rarity roll, intro flash, letterbox bars, title card with badges, streak system."*
8. *"Now add the Collection Screen with all four tabs, sort/filter, hover previews, and the Stats Screen."*
9. *"Now add Account system, Leaderboard rivalry, Daily Challenge, Cursed Piece mechanic, touch optimizations, emoji reactions, and opening book ECO detection."*
10. *"Now add all 23 achievements including trail and border unlocks, full localStorage persistence, and the demo test harness with Reset All Data button."*
