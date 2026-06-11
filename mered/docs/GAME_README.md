# MERED

> A chess game that actually feels like a game.
> Three modes. One kingdom. Every move is a choice.

---

## Table of Contents

1. [What Mered Is](#what-mered-is)
2. [Running the Game](#running-the-game)
3. [The Main Menu](#the-main-menu)
4. [Chess Rules](#chess-rules)
5. [Story Mode](#story-mode)
    - [Prologue](#prologue)
    - [Difficulty](#difficulty)
    - [The Open World Map](#the-open-world-map)
    - [Chapters and Fights](#chapters-and-fights)
    - [Characters](#characters)
    - [The Party Relationship System](#the-party-relationship-system)
    - [Merchants](#merchants)
    - [Cutscenes and Dialogue](#cutscenes-and-dialogue)
    - [Endings](#endings)
6. [Bot Trainer](#bot-trainer)
7. [Multiplayer](#multiplayer)
8. [Cosmetics](#cosmetics)
9. [Collection and Stats](#collection-and-stats)
10. [Leaderboards](#leaderboards)
11. [The Scene System](#the-scene-system)
12. [Controls and Input](#controls-and-input)
13. [Saving and Loading](#saving-and-loading)
14. [Glossary](#glossary)

---

## What Mered Is

Mered is a chess game set inside a narrative world. You can play plain
chess against a learning bot, challenge a friend locally, or step into
the story of a new king named by his dying father and watch the
kingdom test him.

The chess is real chess — proper legal-move filtering, check and
checkmate, castling, en passant, promotion, threefold repetition, the
fifty-move rule, insufficient-material draws. The kings cannot be
captured. The board ends when the rules say it ends.

The world around the chess is where the game lives. Every location is
a rendered scene — a great hall with swaying banners and torches, a
palace corridor with forced-perspective stone walls, an army camp at
night with a central fire and patrolling sentries, a parchment world
map with ink-drawn regions lit by candles in a war room. The story
plays out across 5 chapters, 19 named locations, and a growing party
of characters whose loyalty you earn or lose move by move.

The aesthetic is deliberately deliberate. Silhouettes over portraits.
Cinzel serif over sans-serif. Candlelight and fire over flat fills.
Nothing on screen is decoration without reason.

---

## Running the Game

The game ships as an Electron application.

```bash
npm install
npm start
```

The main window opens full-screen to the Main Menu. You can enter any
mode from there, and a persistent back-arrow returns you to the menu
from inside gameplay.

---

## The Main Menu

The start screen is a room. The background canvas renders the Aurveld
Great Hall: vaulted arches, gold and green banners swaying on a
four-second sine cycle, tall night windows with drifting stars, twin
torch sconces with ember particle systems, a diamond tile floor, and
a throne center-back. A soft vignette darkens the screen edges. A
radial gold glow emanates from the throne in a slow four-second
heartbeat.

The MERED title sits in the upper third in 72px Cinzel gold with a
faint outer glow. Below it, a thin decorative line with a small
crown glyph centered, and then "KINGDOM OF AURVELD" in 16px Cinzel
at 70% opacity and 4px letter-spacing.

Three mode cards float below the title, visually inside the hall
rather than laid over it:

- **STORY** — largest, dominant; subtitle *"The Kingdom of Aurveld awaits"*. Crossed-swords icon.
- **BOT TRAINER** — secondary; subtitle *"Train. Learn. Improve."* Knight-silhouette icon.
- **MULTIPLAYER** — secondary; subtitle *"Challenge a friend."* Paired-pawn icon.

Cards hover-raise by 4px with a gold border brightening on hover. A
persistent top-right nav bar exposes four views that work from any
mode: **Collection**, **Stats**, **Skins**, **Leaderboard**. Your
cosmetics are global — equipping a skin in any mode equips it
everywhere.

Bottom-left shows a small pill with your username and ELO. Bottom-right
shows the version number in muted text.

---

## Chess Rules

Mered enforces standard tournament chess rules. There is no "pseudo-
legal" move generation exposed to the player — if the engine returns a
move, it is fully legal.

- **Legal moves only.** A move that leaves your own king in check is
  filtered out before it reaches the board. Pins, discovered checks,
  and blocking moves are all respected.
- **Check.** When a king is in check, its square pulses red and the
  status bar shows **CHECK**. The only legal moves in that position
  are moves that resolve the check (move the king, block the attacker,
  or capture the attacker).
- **Checkmate.** When the side to move has no legal moves and is in
  check, the game ends immediately and a result modal declares the
  winner.
- **Stalemate.** No legal moves and not in check — draw, declared
  by the result modal.
- **Castling.** Both sides. Kingside and queenside. Only legal when:
  - the king has not moved,
  - the relevant rook has not moved,
  - the squares between are empty,
  - the king is not in check,
  - the king does not pass through or land on an attacked square.
- **En passant.** Tracked via an `enPassantTarget` square, updated
  on every pawn double-advance and cleared after the next move.
  The captured pawn is removed from its own square, not the destination.
- **Promotion.** A pawn reaching its eighth rank promotes. Current
  UI auto-promotes to queen; alternate promotions can be forced via
  UCI move strings from the engine side.
- **Threefold repetition.** The position key (board + side to move +
  castling rights + en passant target) is hashed on every move; reaching
  three counts triggers a draw.
- **Fifty-move rule.** A halfmove clock counts plies since the last
  pawn move or capture. At 100 plies the game is drawn.
- **Insufficient material.** King vs. king, king vs. king+bishop,
  king vs. king+knight, and same-colored-bishops endgame are all
  automatic draws.
- **Kings cannot be captured.** If a move would somehow generate a
  king capture, it was never legal and is never played.

The FEN exported for the engine includes real castling rights, the
en passant target square, and the halfmove clock — the engine sees
the true position, not a simplified snapshot.

---

## Story Mode

Story mode is a five-chapter narrative campaign. You play the newly
crowned heir of Aurveld, whose father, the Iron King, was
mysteriously killed in his own chamber. A message from Valdris
claims responsibility. The court wants war. Your friend Saoirse
stands at your side. You have a brother named Cavan who does not.

The story is moved forward by chess fights — but the chess is not
the point. The point is who you are by the end of it.

### Prologue

On your first story run, a five-scene cinematic plays before Chapter 1
begins. A **SKIP** button is pinned top-right and any keypress or
click anywhere on screen also skips. The prologue plays once; after
that, entering story mode takes you straight to the world map.

The five scenes:

1. **The Palace at Night.** Aurveld's palace silhouette rises over
   a city of warm orange lights. Stars drift across a deep blue-black
   sky. A crescent moon hangs in the upper right. Text fades in over
   the scene establishing the kingdom and the Iron King's death.
2. **The Long Corridor.** Forced-perspective palace corridor at
   night, torch sconces casting amber pools on a dark floor.
   An abstract amber-brown human silhouette walks slowly from left
   to right, pushes through a door at the end, and is gone. No
   dialogue.
3. **The King's Chamber.** A dying fire lower-left, a curtained
   window, a bed to the right with the Iron King's silhouette still
   in it. The amber-brown figure enters, crosses the room, the
   fire goes out, a full second of black, and the fire returns at
   ember level. The figure is at the door now. It turns its head
   once, then is gone. Text fades in — *"No one saw who entered.
   No one saw who left."*
4. **The Throne at Dawn.** Pale blue-grey dawn light streams through
   high windows in diagonal bars. Dust motes drift upward in the
   light. Three silhouettes — a gold queen, an iron-grey rook, a
   smaller ivory king — stand with their backs to the viewer,
   looking at the empty throne. *"Each of them was thinking
   something different. Only one of them knew what had really
   happened."*
5. **The Accusation.** A war room. A long table with maps. Candles
   at the corners. A messenger at the far end. A new king in dark
   teal-grey — **Aldric of Valdris** — claims responsibility. The
   court demands war. The army demands blood. *"This is where your
   story begins."*

The prologue ends with the word **MERED** in Cinzel gold on black,
held for two seconds, before fading into Chapter 1.

### Difficulty

Before the prologue plays, a **Choose Your Path** screen offers four
difficulty tablets mounted on the palace wall by torchlight. The
Ironclad tablet burns red.

| Difficulty | Lives | Description |
|---|---|---|
| **Story** | Infinite | *The kingdom needs a king, not a martyr. Experience the full story without the threat of losing progress. Every choice matters. No fight will end your journey.* |
| **Standard** | 5 | *A king earns his crown. Five chances across the entire campaign. Lose them all and the chapter resets.* |
| **Veteran** | 3 | *Aurveld was not built by the cautious. Three lives for the full campaign. Death is expensive.* |
| **Ironclad** | 1 | *One king. One campaign. No second chances. Death ends the run entirely. Bosses drop darkened skin variants found nowhere else.* |

Ironclad also forbids consumables from merchants.

### The Open World Map

Instead of a linear chapter list, Story Mode uses a two-level open
world map.

The world map is a parchment canvas — aged cream-yellow with paper-
grain noise and a darker edge vignette. Regions are bordered in
jittered ink lines. A candlelit war-room table frames the bottom of
the screen, with four amber candle glows at the map corners. A
compass rose sits bottom-right. A map legend sits bottom-left.
Mountains are stacked triangles, forests are dark green-brown tree
clusters, the Aurveld river is a pale blue-grey double line.

Six regions appear on the world map:

- **Aurveld Heartland** — the kingdom's centre.
- **The Western Reach** — wild forest and the coast.
- **The Northern Reaches** — mountain passes and the last town.
- **The Ashfields** — flat emptied land south of Aurveld.
- **Valdris** — the rival kingdom, deep south.
- **The Clearing** — a single node that does not appear on the map
  until Chapter 5. You will find it when the story brings you to it.

Clicking a region traces the road from your current location, lights
it amber, walks an ivory pawn marker along the path (the pawn
carries a soft pulsing glow), and then zooms into the region map
over 600ms. A breadcrumb at the top-left reads `World > [Region]`.
Clicking the breadcrumb returns you to the world map.

Each region map shows its settlements as illustrated nodes (never
plain dots): walled cities, fortresses with corner towers, mills
with spoked wheels, arch bridges, lighthouses, tent camps, towns
with cemeteries. When a settlement has an active main quest, a
pulsing gold `!` marker sits in the upper-right of the illustration.
Active side quests show a pulsing blue `?`.

Clicking a settlement opens its interior picker — a screen listing
the rooms and buildings inside. Clicking any interior fades into
the scene-rendered interior background where NPCs, shops, and
fight triggers live.

### Chapters and Fights

Each chapter has a theme, a set of fights, at least one optional
side quest, and a boss. All fights, including boss fights, are
played on the chess board with an appropriate scene background
(throne room, training yard, border road, Valdris war room, the
Clearing) running behind the board.

#### Chapter 1 — The Iron King is Dead

*Theme: Prove you're ready. The kingdom tests you.*

The first chapter opens on **Cavan**, your brother. The fight takes
place in a private antechamber of the palace and carries no clock
pressure at all — both clocks read `--:--`. Before the game starts
you have a three-way dialogue choice. After the game, regardless of
who wins, Cavan leaves; you choose how to send him off.

Cavan's silhouette in every cutscene he appears in is a king shape
with a hairline crack rendered as a thin dark line down the vertical
center. His name means *hollow*. He is not a villain. He believes
he would have been the better king, and the game does not tell you
he is wrong.

After Cavan, the court tests you:

- **Lord Caeven** — a court rival. *"The old court will test you first."*
- **Lady Mourne** — watches you for your father's failings.
- **The Council of Three** — three chairs, three faces, three quiet
  judgments.
- **The Fenwick Villages** *(optional side quest)* — three villages
  on the northern border have not paid their winter tithe. You can
  ride out yourself or send a collector. Your father would have
  sent a collector. Choices here affect multiple relationship
  meters.
- **Aldwyn Voss** *(boss)* — thirty years under your father's
  banner. He owes you nothing. Beat him and the boss skin
  **Permafrost** (or Ironclad-only **Ascension**) is added to
  your cosmetics collection.

#### Chapter 2 — The March

*Theme: Momentum. Moral complexity starts appearing.*

Your column rides south. The land thins, then empties.

- **Ashfield Rovers** — raiders, or refugees with blades. You find
  out which.
- **Old Pip** *(NPC)* — an old man sleeping outside the Ashford
  Tavern. Optional. No reward. No consequence. Some NPCs are just
  there because the world is real.
- **The Deserter** *(optional side quest)* — a soldier who left
  his post to see his daughter. Execute him, send him home with
  wages, or let him go quietly. Every choice shifts at least two
  relationship meters.
- **Lord Drave** — sold bread to Valdris when it suited him, now
  sells steel. He dies holding his ledger.
- **The Archivist** *(optional side quest)* — a woman who trades
  in names. Pay attention to what she tells you for free.
- **Ironclad Company** — mercenaries. They calculate, they don't
  surrender.
- **Brenna of the Ashfields** *(boss)* — fights for coin. Yours
  is not enough tonight. Drops **Thunderwall** (or **Long Winter**).

#### Chapter 3 — Into Valdris

*Theme: Doubt. Everything you thought you knew shifts.*

You cross the border.

- **Vanguard of Valdris** — the border defenders.
- **The Valdris Family** *(optional side quest)* — a mother and
  three children in a cellar.
- **River Guard** — a century-old garrison at a river crossing.
- **The Old Soldier** *(optional side quest)* — on the steps of a
  Valdris tavern, drinking, watching the sun set. He fought your
  father.
- **Twin Commanders** — identical strategies, mirror images on
  the field.
- **Edric Halvane** *(boss)* — an honorable man. He will not die
  quietly. Before he falls he tells you where Aldric was on the
  night the Iron King died. This is the moment that breaks the
  war open. Drops **The Deep** (or **The Revelation**).

#### Chapter 4 — Aldric the Undying

*Theme: The truth. Aldric didn't do it.*

A single boss fight in a borrowed throne room. Aldric taunts you
mid-game; his lines appear as text overlays between your moves.
He laughs as he dies. What he tells you with his last breath will
matter in Chapter 5. Drops **Pale Court** (or **The Cosmos**).

#### Chapter 5 — Saoirse

*Theme: The reckoning. The choice.*

The Clearing node appears on the world map. It was not there before.

A single fight in the dark, around a small personal campfire
under the clearest star field in the game. Saoirse came alone. He
could have run. He did not.

The result screen does not end Chapter 5. The **Ending Choice
overlay** opens. Two options:

- **KILL** — *For a King, For my Father.*
- **SPARE** — *For my Friend.*

Drops **Dying Sun** (or **The Eternal**).

### Characters

- **You** — the new king. King silhouette in ivory.
- **Cavan** — your brother. King silhouette, slightly darker ivory,
  with a hairline crack down the center. Not in your party.
- **Saoirse** — your closest friend. Bishop-adjacent silhouette in
  warm amber. His thread runs the whole game. Watch his lines
  carefully.
- **Seraphine** — your queen. Gold queen silhouette. Starts at 72.
- **Idris** — queenside knight. Dark steel. Starts at 65.
- **Cael** — kingside knight. Lighter steel. Starts at 58.
- **Maren** — queenside bishop. Cold white. Starts at 55.
- **Theron** — kingside bishop. Warm brown. Starts at 48.
- **Brennar** — queenside rook. Dark granite. Starts at 60.
- **Seld** — kingside rook. Weathered bronze. Starts at 30.
- **The Levied** — your pawns. No individual identity. Start at 25.
- **Aldwyn Voss** — Chapter 1 boss. Iron-grey rook.
- **Brenna of the Ashfields** — Chapter 2 boss. Red-brown queen.
- **Edric Halvane** — Chapter 3 boss. Cold blue-grey king.
- **Aldric** — Chapter 4 boss. Dark teal-grey king.
- **Erevan** — a queen who joins you in the SPARE ending at
  relationship 60.

### The Party Relationship System

Every named party member has a 0–100 relationship meter stored with
your save. The meter drives four tiers, and the tier controls how
each character behaves during a fight.

| Tier | Range | Behavior |
|---|---|---|
| **High** | 75–100 | Ability fires proactively after your move; full reasoning given; a bonus hint per turn. |
| **Neutral** | 50–74 | Ability available on request; one line of output per fight. |
| **Low** | 25–49 | Ability available once per fight on a long cooldown; less information; framing turns cold. |
| **Rock bottom** | 0–24 | Ask is disabled. Once per fight the character may auto-play their own suggestion. The move is always legal. It is not always what you would choose. |

The **party panel** pins to the top-right during story fights. Each
row shows the member's name, a relationship bar colored by tier, and
an **Ask** button. The footer shows **Morale** — the mean of every
active member's relationship. Morale gates the Levied hint.

#### Abilities

Every ability draws its candidate move from the fully-filtered legal
move list, so every suggestion is always a legal chess move.

- **Seraphine — The Strategist.** Best move by combined heuristic
  (capture value × 10 + centre control − risk). At High, fires
  proactively after every one of your moves with a one-line reason.
  At Low, just the coordinates.
- **Erevan — The Aggressor.** *(SPARE ending only.)* Best attacking
  move — captures first, then threats on the enemy king. At Low
  she stops mentioning the risk and just says "take it."
- **Idris — The Calculator.** Minimises expected material loss.
  Prefers moves that escape attack and land on safe squares.
- **Cael — The Opportunist.** Highest victim value, regardless of
  recapture. At Low drops the downside note.
- **Maren — The Eliminator.** Best capture where victim value
  exceeds the cost of the attacker if recaptured, or the destination
  is undefended.
- **Theron — The Protector.** Identifies your most valuable attacked
  piece and suggests either moving it to safety or capturing its
  attacker. At Low, frames it as criticism.
- **Brennar — The Anchor.** Once per fight: a rook move onto an
  open file or the 7th/2nd rank.
- **Seld — The Breaker.** The enemy square with the largest
  attackers-minus-defenders imbalance. At High explains the
  structural plan. At Low just names the square.
- **The Levied.** No individual ability. When party morale is above
  65, a simple pawn-push hint becomes available. At rock-bottom
  morale the option disappears entirely.

Cooldowns reset at the start of every fight. A rock-bottom auto-move
fires at most once per fight per character.

No one ever leaves the party because of relationship. The
ending-driven changes (Theron and Idris and Seld potentially leaving
after the Chapter 5 choice) are a separate system. Relationship
only controls availability, depth, and occasionally the character
playing a move for you.

### Merchants

Between chapters — after you beat a boss — a full-screen overlay
opens before the world map returns. Four merchants across the
campaign, each with a seeded inventory. No randomness. Every run
shows the same items, so your purchasing plan matters.

| After chapter | Merchant | Flavor |
|---|---|---|
| 1 | **The Road Peddler** | Valdris-born caravaneer. Honest about it. |
| 2 | **The Ashfield Quartermaster** | Former Aurveld supply officer, unpaid for a year. |
| 3 | **The Archivist** | Sells names. Does not barter. |
| 4 | **The Last Stall** | One table. A few things worth owning. |

Each merchant carries:

- **Consumables** — Hint token (50c), Takeback token (75c), Time extension (40c).
- **Information** — Lore fragments, 100–200c each. These unlock
  entries you can read from the Collection screen.
- **Relationship gifts** — Named items that bump a specific
  character's meter by +10 (150c each). The last merchant carries
  one gift for Cavan at 200c — it bumps his hidden meter.
- **Backup pieces** — Alternate named party members that slot into
  a role for the rest of the run (300–500c). Lira replaces a
  bishop, Gareth replaces a knight, Marcus replaces a rook.

Coins are shared with your bot-trainer wallet. Story wins award a
flat sum per fight type — brother 40, rival 60, enemy 80, sidequest
120, boss 200.

Chapter 5 has no merchant — the Saoirse fight comes straight
after the world map reopens.

### Cutscenes and Dialogue

Cutscenes are data-driven. Each one has a background location,
silhouette positions, dialogue lines, optional choices with
relationship effects, and optional lore-fragment unlocks.

- **Typewriter effect** — text types at 20ms per character.
- **NEXT** — appears after the whole line has rendered.
- **Choices** — full-width buttons appearing 500ms after the
  final line.
- **Lore fragments** — slide in from the right as a parchment
  overlay (cream background, dark text). Click to dismiss.

Silhouettes move naturally in the scene:

- **Walking scenes** — silhouettes translate slowly across the canvas in a loop.
- **Emotional beats** — the silhouette shifts 2–5% over 300ms.
- **Yielding posture** — the silhouette drops 10% in height over 200ms and holds.
- **Disappearing** — fade to 0 opacity over 400ms.

There are 22 registered cutscenes across the five chapters covering
every pre-fight, post-fight, camp, travel, side-quest, and ending
moment. Dialogue choices that affect relationships (like the Fenwick
choice, the Deserter choice, or the Valdris Family choice) are
explicit — the effect on each meter is applied immediately.

### Endings

The Chapter 5 result opens the Ending Choice overlay. Either choice
plays a unique final cutscene, then an epilogue, then an
achievement toast:

- **KILL** — *For a King, For my Father.* Valdris falls. Wealth flows
  home. Aurveld celebrates. Seraphine stays at your right hand; she
  never asks what happened in the Clearing, and you never tell her.
- **SPARE** — *For my Friend.* Saoirse rides east at dawn. The throne
  is yours. You quietly dismantle what your father built. Seraphine
  is gone before the week is out.

Either ending earns the Regicide achievement for completing the
story.

---

## Bot Trainer

Bot Trainer is a live-learning chess opponent that gets stronger as
it plays you. The trainer screen sits inside an army-camp-at-night
scene: a central bright campfire with twenty-particle upward drift,
rising smoke trailing upper-right, four tent silhouettes at varying
depths, two patrolling sentry shadows, a star field through cloud
gaps.

The profile card feels like a field report on a camp table:

- Warm orange radial glow flickering on the card's left edge from
  the fire (2.3-second sine, ±15% opacity).
- Gold L-bracket corner elements at each corner of the card suggesting
  a military document frame.
- Named bot, avatar, level badge, XP bar.
- Four learned-trait stat bars: **Memory**, **Confidence**,
  **Lookahead**, **Consistency**. On a fresh save these all start
  at 0% and only fill from actual gameplay.
- Win / Loss / Draw pills in distinct styles.
- A large prominent coin display with a gold coin icon and your
  training-coin balance.
- Showcase slots for achievement badges.
- Level-up animations and toast rewards.

### Genesis Mode

A tab inside the trainer unlocks after conditions are met. Genesis
Mode is the trainer re-framed as something older and stranger — a
bot that has been learning in the dark while you slept.

The scene shifts to an army-camp-perimeter background — deeper dark,
fewer tents visible, smaller dying fire, more stars through clearer
sky. A teal wash at 20% opacity overlays the scene. Every gold
accent turns teal (#00aacc). The GENESIS AI label carries a faint
teal text-shadow glow.

Genesis has its own coin wallet, its own chest, and its own skin
drops. Its back button returns to the Bot Trainer screen, not the
main menu.

### Chests

The trainer has a chest shop. Three chest types (opening, trophy,
genesis), each costs coins of the matching type. Opening a chest
plays a full animation — pre-open shake, burst, reel spin, lock,
reveal — and the reveal card shows the item, its rarity tier, and
its description. Duplicates are automatically refunded at 10% of
the chest cost.

### Hall of Fame

Accessible from the trainer. Records your highest-ever achievements:
First Victory, Perfect Game, Highest Streak, Highest Level, Rarest
Opening, Most Learned, Veteran, Coin Master, Untouchable. Each has
its own icon, color, and unlock condition.

---

## Multiplayer

Local two-player mode. Two humans share one machine. The background
is the Aurveld Great Hall. No clock by default — use the clock
dropdown to choose 1, 5, 10, or 30 minute controls or infinite.

Emoji reactions are available to either player via the small reaction
rows next to the player cards: `+1`, `:(`, `?`, `:D`, `*`.

---

## Cosmetics

Cosmetics are global. What you equip in any mode is what you see in
every mode. The **Customize** screen is an armory-wall scene: a
dark stone base with horizontal mortar lines every 40px, crossed
swords at 25% opacity on the left wall, a shield at 25% opacity on
the right wall, an armor chest at 20% opacity center-back, and
torch radials burning warm on the upper-left and upper-right corners.
A thin dark-wood display-table edge underlines the preview panel
at the center.

Four tabs sit at the top of the Customize screen:

- **Pieces** — per-piece skin selector. Switch between white and
  black loadouts with the W/B toggle. Select a piece type on the
  left, pick a skin on the right. Each skin card has a small star
  in its corner to toggle favorite.
- **Board** — board-skin selector.
- **Favorites** — every favorited piece grouped by type, plus
  favorited boards. Each group has a *Random each game* toggle,
  and a *Shuffle All* button at the top shuffles every group at
  once.
- **Trails** and **Borders** — on the main board customization
  panel, under the rest of the UI.

### Rarity Tiers

Skins come in six rarities with their own colors:

- **Common** — eight solid colors (crimson red, ocean blue, forest
  green, sunburst orange, violet purple, arctic teal, dusty rose,
  charcoal). Unlocked by default except for the default ivory/navy.
- **Rare** — material surfaces: frosted glass, brushed steel, warm
  marble, obsidian stone, bone ivory, onyx.
- **Epic** — animated: static shock, molten core, neon pulse,
  prism shift, void drift, deep current.
- **Unique** — narrative skins: last bloom, dying star, singularity,
  between worlds, the revelation, permafrost, thunderwall, fallen
  citadel, pale court, the deep, ascension, long winter.
- **Mythic I** — first light, the haunting, spectrum, undying,
  borealis, dying sun.
- **Mythic II** — the origin, riftwalker, the rapture, last bastion,
  the cosmos, the eternal. The king Mythic II **The Eternal**
  unlocks the **Sovereign** title and plays a full-board gold
  shockwave animation on every subsequent game you win.

### Board Skins

Board skins range from walnut wood (a free second option) through
rare materials, epic animated boards, and unique / mythic variants.
The board skin affects every square's rendering plus some ambient
effects (starfield, ember fields, rain).

### Trails and Borders

Unlocked through cutscene achievements:

- **Flame Trail** — 10 total cutscenes triggered.
- **Ice Trail** — reaching Blue badge tier on any cutscene.
- **Gold Trail** — reaching Gold badge tier on any cutscene.
- **Royal Trail** — seeing all five Unique cutscenes.
- **Shadow Trail** — triggering Regicide 10 times.
- **Gold Border** — Gold badge tier.
- **Neon Border** — 10 cutscenes.
- **Void Border** — Regicide 10 times.
- **Dragon Border** — boss capture five times.
- **Marble Border** — all cutscenes unlocked.

---

## Collection and Stats

The Collection screen is a trophy hall. The palace great hall renders
behind the content at 30% opacity — throne barely visible at the
back, torches dimly glowing through the overlay. Four tabs switch
the background texture beneath them:

- **Cutscenes** — gallery wall. Each card is a framed display
  with the cutscene badge in the upper portion, a thin rarity-
  colored stripe at the top like a ribbon, the cutscene name
  clearly below the badge, the rarity label and trigger count
  below the name. Locked cards show `???` greyed at 50% opacity
  with a lock icon centered inside the badge area only. Clicking
  a card opens a trophy modal with full detail and the highest
  tier progress.
- **Achievements** — parchment-style board. Each achievement shows
  as a sealed writ or proclamation with a large badge, name, and
  description. Twelve general + phase-specific unlocks.
- **Streaks** — battle tally board. Dark wood panel with the streak
  chart drawn in lighter chalk-style colors. Axes labeled,
  milestone markers at 3, 5, 10, and 20.
- **Trophy Room** — wood-grain walls (`#1e1408` with lighter grain
  lines every 6px). Badges mount on dark wood plaques with gold
  borders and name plates below.

The Stats screen shows lifetime totals: games played, wins, losses,
draws, capture breakdown per piece type, longest streak, and
time-in-game metrics.

---

## Leaderboards

The Leaderboard is Aurveld's champions' board. Stone panel
background. Table rows alternate between two slightly different
dark tones. The top three rows carry distinct tints:

- **1st** — subtle gold glow.
- **2nd** — silver.
- **3rd** — bronze.

Your own row, if you appear, has a subtle gold background tint.
Column headers are Cinzel; row data is Inter. A decorative trophy
shape sits above the leaderboard title.

---

## The Scene System

Every screen has an animated scene background canvas. No flat dark
backgrounds anywhere in the game.

Nineteen location renderers exist and are used directly during
story cutscenes and story fights, and indirectly behind the mode
screens:

| id | Location |
|---|---|
| `palace_great_hall` | Aurveld Palace — Great Hall |
| `palace_long_corridor` | Aurveld Palace — Long Corridor |
| `palace_antechamber` | Aurveld Palace — Antechamber |
| `palace_training_yard` | Aurveld Palace — Training Yard |
| `palace_wall_top` | Aurveld Palace — Castle Wall Top |
| `road_aurveld_farmland` | The Road — Aurveld Farmland |
| `ashfields_open_road` | The Ashfields — Open Road |
| `army_camp_night` | Army Camp — Night |
| `camp_interior_tent` | Camp — Interior Tent |
| `army_camp_perimeter` | Army Camp — Perimeter Walk |
| `valdris_border_day` | Valdris Border — Daytime |
| `valdris_border_town` | Valdris Border Town |
| `valdris_war_room` | Valdris War Room |
| `valdris_throne_room` | Valdris Throne Room |
| `clearing_ch5` | The Clearing — Chapter 5 |
| `farmhouse_cellar` | Farmhouse Cellar |
| `archivist_room` | Archivist's Room |
| `tavern_exterior` | Tavern Exterior |
| `abandoned_farmhouse` | Abandoned Farmhouse |

Each location carries its own palette, light sources, and animated
elements. Shared animation rules:

- **Fire / torch** — radial gradient plus 7–14 ember particles,
  upward drift, orange → transparent, respawn at source.
- **Stars** — 40 dots, ~0.01–0.02 px/frame horizontal drift, wrap at
  edge.
- **Banners** — sine sway, amplitude 3px, 4-second cycle, per-banner
  phase offset.
- **Ambient flicker** — torch radii vary ±8% on a 2.3-second sine.
- **Mist / smoke** — rightward drift 0.3 px/frame, wrap at edge.
- **Sentries** — slow sine-driven linear patrol loops at canvas
  edges.
- **Particle cap** — no scene exceeds 30 simultaneous particles.

Transitions between scenes always fade through black at 300ms —
never a hard cut.

Story fights set the appropriate scene background automatically:

- Cavan fight → palace antechamber.
- Court rivals (Caeven / Mourne / Council) → palace great hall.
- Aldwyn → palace training yard.
- Chapter 2 fights → army camp night.
- Brenna → ashfields open road.
- Chapter 3 fights → Valdris border daytime.
- Halvane → Valdris war room.
- Aldric → Valdris throne room.
- Saoirse → the Clearing.

In the trainer the board sits over the army camp. In multiplayer and
regular bot mode the board sits over the great hall.

---

## Controls and Input

- **Click a piece** to select. Only pieces of the side to move can be
  selected.
- **Click a highlighted square** to play that move. Highlights show
  every legal destination and carry a dot overlay.
- **Right-click and drag** to draw colored arrow annotations on the
  board. Right-click a square to drop a colored dot.
- **Shift + right-click** changes the annotation color to yellow.
- **Escape** closes the current drawer, dialog, or annotation palette.
- **Tilde / backtick** — reserved for developer tools.
- **F11** — fullscreen toggle.
- **Back arrow** (top-left inside any mode) returns to the main menu.

Mouse and touch are both supported on the board. On touch devices,
long-press arms the annotation palette; drag between squares after
arming draws an arrow annotation.

---

## Saving and Loading

Mered persists every piece of your state through a single unified
save snapshot:

- Bot profile — level, XP, stats, openings, memory.
- Coin balances — training and genesis.
- Equipped skins and board skin (global across modes).
- Favorite skins and boards (per piece type).
- Unlocked cosmetics and unlocked lore fragments.
- Cutscene state — which cutscenes you have triggered and at what
  streak tiers.
- Story progress — current chapter, cleared fights, bosses cleared,
  boss skins earned, lives remaining, difficulty, ending outcome.
- The full party roster — every character's relationship meter and
  any backup pieces you purchased.
- Merchant history — visits and per-merchant purchased item lists.
- The consumables, lore, and roster side of the story state.

Saves happen automatically on any material change. The save file
lives in your platform's standard Electron user-data directory.
You can reset the story save from the Story overlay without
touching your main profile, and you can reset the entire profile
from the debug panel (confirmation required).

---

## Glossary

- **ELO** — the player rating displayed beside every name.
- **FEN** — the standard chess position notation used to hand
  positions to Stockfish. Mered exports real castling rights,
  en passant, and halfmove clock.
- **UCI** — the move notation the engine returns (e.g. `e2e4`,
  `g8f6`, `e7e8q` for promotion).
- **Halfmove clock** — plies since the last pawn move or capture;
  drives the fifty-move rule.
- **Party morale** — mean of every active party member's relationship
  meter. Gates the Levied ability.
- **Tier** — High / Neutral / Low / Rock bottom bands on a
  relationship meter.
- **Rock-bottom auto-move** — when a character's meter sits under
  25 and they have not already moved this fight, they may play
  their own suggestion once per fight. The move is always legal.
  It is not always what you would choose.
- **Morale-gated pawn push** — the Levied ability. Only available
  when party morale is above 65.
- **Backup piece** — a named alternate party member purchased from
  a merchant. Slots into a specific role (bishop, knight, or rook)
  for the rest of the run.
- **Cracked king** — Cavan's silhouette. A king shape in slightly
  darker ivory with a thin dark line down the vertical center.
- **Seed line** — a Saoirse line planted early in the story that
  only makes sense on a second playthrough.

---

## Credits

Built by Heli Inc. Mered is a personal project. The chess engine
bridge is Stockfish; the rest — gameplay, UI, scene rendering,
story, silhouettes, cutscenes, and all atmospheric effects — is
custom code.

The Mered title, logo, characters, and narrative are original.
