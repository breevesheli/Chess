/**
 * story3d_content.js — 3D-mode content data: factions, the armor catalog,
 * shop stock, quest rewards, the companion-farewell cutscenes, and the
 * ending mood table.
 *
 * Pure data + a couple of pure helpers (Node-requireable for tests). The
 * farewell cutscenes are NEW scenes the user asked for — they extend the
 * story after the ending choice and are registered additively into
 * STORY_CUTSCENES at patch-install time (existing scenes are never touched;
 * see DECISIONS.md D12).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else { root.Story3D.Content = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── Factions ──────────────────────────────────────────────────────────
  // Palette per kingdom/company so allegiance reads at a glance.
  const FACTIONS = {
    aurveld:  { name: 'Aurveld',            main: '#2c4a28', trim: '#e4c058', banner: '#e4c058', banner2: '#68a048' },
    valdris:  { name: 'Valdris',            main: '#26364e', trim: '#aabdd4', banner: '#3a5a8a', banner2: '#8aa0bc' },
    ashfield: { name: 'Ashfield Companies', main: '#4a2c20', trim: '#c86a32', banner: '#8a3a22', banner2: '#3a2c24' },
    pale:     { name: 'The Pale Court',     main: '#3a4048', trim: '#c8ccd4', banner: '#6a7280', banner2: '#aab0bc' },
  };

  // Faction of every named figure, and the generic-soldier faction per chapter.
  const FIGURE_FACTIONS = {
    player: 'aurveld', cavan: 'aurveld', seraphine: 'aurveld', aldwyn: 'aurveld',
    idris: 'aurveld', cael: 'aurveld', maren: 'aurveld', theron: 'aurveld',
    brennar: 'aurveld', seld: 'aurveld', erevan: 'aurveld',
    brenna: 'ashfield', drave: 'ashfield',
    halvane: 'valdris', aldric: 'pale', archivist: 'valdris',
  };
  const CHAPTER_ENEMY_FACTION = { ch1: 'aurveld', ch2: 'ashfield', ch3: 'valdris', ch4: 'pale', ch5: null };

  // Character accents on top of the faction palette, so the named cast all
  // read differently even when kinds repeat.
  const FIGURE_ACCENTS = {
    seraphine: { trim: '#d8b34a', sash: '#3a7a72' },     // the Strategist — gold + teal
    erevan:    { trim: '#b03a2a', sash: '#5a1c1c' },     // the Aggressor — blood reds
    idris:     { plume: '#3a6ab0', trim: '#9ab0d0' },    // the Calculator — cold blue
    cael:      { plume: '#4a8a3a', trim: '#9ac088' },    // the Opportunist — green
    maren:     { trim: '#e8e4da', sash: '#8a8478' },     // the Eliminator — pale ash
    theron:    { trim: '#8a6a3a', sash: '#5a4426' },     // the Protector — oak browns
    brennar:   { trim: '#6a6a72' },                      // the Anchor — plain iron
    seld:      { trim: '#a86a28', sash: '#2c2018' },     // the Breaker — scorched brass
    brenna:    { sash: '#b03a2a', trim: '#c86a32' },     // mercenary captain
    halvane:   { cape: '#2c4a7a', trim: '#aabdd4' },     // Valdris commander
    aldwyn:    { trim: '#c8a040', sash: '#2c4a28' },     // thirty years of service
    cavan:     { cape: '#4a443c' },
    archivist: { trim: '#8a7248' },
  };

  // ── Armor catalog ─────────────────────────────────────────────────────
  // slot: head | body | cape   → drawn on the player figure
  // slot: piece                → blanket cosmetic for all pieces of `piece`
  // style drives the mesh; colors drive materials.
  const ARMOR = {
    // Aurveld (ch1 shop)
    'aurveld-helm':   { name: 'Aurveld Guard Helm',  slot: 'head', style: 'helm',   price: 250, faction: 'aurveld', colors: { main: '#5a5f68', trim: '#e4c058' }, desc: 'Standard issue of the palace watch.' },
    'aurveld-plate':  { name: 'Aurveld Guard Plate', slot: 'body', style: 'plate',  price: 420, faction: 'aurveld', colors: { main: '#5a5f68', trim: '#e4c058', tabard: '#2c4a28' }, desc: 'Green tabard, gold thread.' },
    'aurveld-cape':   { name: 'Aurveld War Cape',    slot: 'cape', style: 'cape',   price: 180, faction: 'aurveld', colors: { main: '#2c4a28', trim: '#e4c058' }, desc: 'The old colours of the Iron King.' },
    // Ashfield (ch2 shop)
    'ashfield-hood':  { name: 'Rover\'s Hood',       slot: 'head', style: 'hood',   price: 200, faction: 'ashfield', colors: { main: '#3a2c24', trim: '#c86a32' }, desc: 'Smells faintly of smoke. Always.' },
    'ashfield-jerkin':{ name: 'Mercenary Jerkin',    slot: 'body', style: 'jerkin', price: 360, faction: 'ashfield', colors: { main: '#4a2c20', trim: '#c86a32', tabard: '#8a3a22' }, desc: 'Boiled leather. Pays for itself.' },
    'ashfield-cloak': { name: 'Ashwalker Cloak',     slot: 'cape', style: 'cape',   price: 160, faction: 'ashfield', colors: { main: '#3a2c24', trim: '#8a3a22' }, desc: 'Grey at the hem from the fields.' },
    // Valdris (ch3 shop)
    'valdris-helm':   { name: 'Valdris Crested Helm',slot: 'head', style: 'helm',   price: 320, faction: 'valdris', colors: { main: '#4a5a74', trim: '#aabdd4' }, desc: 'Taken patterns, river steel.' },
    'valdris-plate':  { name: 'River Guard Plate',   slot: 'body', style: 'plate',  price: 520, faction: 'valdris', colors: { main: '#4a5a74', trim: '#aabdd4', tabard: '#26364e' }, desc: 'Held the crossing for a century.' },
    'valdris-cloak':  { name: 'Valdris Officer Cloak',slot: 'cape', style: 'cape',  price: 220, faction: 'valdris', colors: { main: '#26364e', trim: '#aabdd4' }, desc: 'Blue as the border river.' },
    // Pale Court (ch4 shop)
    'pale-helm':      { name: 'Pale Court Helm',     slot: 'head', style: 'helm',   price: 420, faction: 'pale', colors: { main: '#8a909c', trim: '#c8ccd4' }, desc: 'Cold to the touch, always.' },
    'pale-plate':     { name: 'Pale Court Plate',    slot: 'body', style: 'plate',  price: 640, faction: 'pale', colors: { main: '#6a7280', trim: '#c8ccd4', tabard: '#3a4048' }, desc: 'Worn by men who never blinked.' },
    'pale-cape':      { name: 'Throne-Room Mantle',  slot: 'cape', style: 'cape',   price: 300, faction: 'pale', colors: { main: '#3a4048', trim: '#c8ccd4' }, desc: 'The borrowed king\'s borrowed cloth.' },
    // Clearing (ch5 shop — a quiet trader at the edge of camp)
    'ember-hood':     { name: 'Emberwatch Hood',     slot: 'head', style: 'hood',   price: 380, faction: 'ashfield', colors: { main: '#2c1c14', trim: '#ff6a20' }, desc: 'For long nights by small fires.' },
    'ember-robe':     { name: 'Emberwatch Robe',     slot: 'body', style: 'robe',   price: 540, faction: 'ashfield', colors: { main: '#2c1c14', trim: '#ff6a20', tabard: '#4a2c20' }, desc: 'Warm. Quiet. Patient.' },
    'dusk-cloak':     { name: 'Cloak of the Last Dusk', slot: 'cape', style: 'cape', price: 320, faction: 'pale', colors: { main: '#16203a', trim: '#7a90c0' }, desc: 'The clearing keeps its secrets.' },
    // Wanderer set (spread across the road shops)
    'wanderer-hood':  { name: 'Wanderer\'s Hood',    slot: 'head', style: 'hood',   price: 240, faction: 'aurveld', colors: { main: '#3e4434', trim: '#8a8458' }, desc: 'It has seen more roads than you have.' },
    'wanderer-jerkin':{ name: 'Wanderer\'s Jerkin',  slot: 'body', style: 'jerkin', price: 380, faction: 'aurveld', colors: { main: '#4a4a38', trim: '#8a8458', tabard: '#3e4434' }, desc: 'Patched in four kingdoms.' },
    'wanderer-cloak': { name: 'Wanderer\'s Cloak',   slot: 'cape', style: 'cape',   price: 200, faction: 'aurveld', colors: { main: '#3e4434', trim: '#6a6448' }, desc: 'Smells of rain and distance.' },
    // Royal regalia (the helm is sold dearly; the rest is earned)
    'royal-helm':     { name: 'Royal Guard Helm',    slot: 'head', style: 'helm',   price: 800, faction: 'aurveld', colors: { main: '#6a6253', trim: '#c8a040' }, desc: 'The quartermaster parts with it reluctantly.' },
    // Quest rewards (not sold)
    'fenwick-cloak':  { name: 'Fenwick Homespun',    slot: 'cape', style: 'cape',   price: 0, faction: 'aurveld', colors: { main: '#6a5840', trim: '#8a7858' }, desc: 'Half a tithe, freely given.', questOnly: true },
    'royal-cape':     { name: 'Royal War Cape',      slot: 'cape', style: 'cape',   price: 0, faction: 'aurveld', colors: { main: '#5a1c1c', trim: '#c8a040' }, desc: 'Worn once, in a clearing, at the end.', questOnly: true },
    'royal-plate':    { name: 'Royal Guard Plate',   slot: 'body', style: 'plate',  price: 0, faction: 'aurveld', colors: { main: '#6a6253', trim: '#c8a040', tabard: '#5a1c1c' }, desc: 'Aldwyn\'s own pattern. Earned, not bought.', questOnly: true },
    'deserter-hood':  { name: 'Deserter\'s Hood',    slot: 'head', style: 'hood',   price: 0, faction: 'ashfield', colors: { main: '#2c2c28', trim: '#5a5a52' }, desc: 'He never asked for it back.', questOnly: true },
    'veteran-cape':   { name: 'Old Soldier\'s Cape', slot: 'cape', style: 'cape',   price: 0, faction: 'valdris', colors: { main: '#4a4038', trim: '#8a8478' }, desc: 'Three kings\' worth of weather.', questOnly: true },
    // Piece armor — a blanket cosmetic for every piece of that kind
    'iron-vanguard':  { name: 'Iron Vanguard',       slot: 'piece', piece: 'pawn',   price: 0, colors: { trim: '#7a8290' }, desc: 'Banded iron for the front rank.', questOnly: true },
    'gilded-cavalry': { name: 'Gilded Cavalry',      slot: 'piece', piece: 'knight', price: 450, colors: { trim: '#d8b34a' }, desc: 'Gold barding for the horses.' },
    'sentinel-walls': { name: 'Sentinel Walls',      slot: 'piece', piece: 'rook',   price: 0, colors: { trim: '#6a8ab0' }, desc: 'River-steel for the towers.', questOnly: true },
    'sable-clergy':   { name: 'Sable Clergy',        slot: 'piece', piece: 'bishop', price: 420, colors: { trim: '#7a5aa0' }, desc: 'Dark vestments for the diagonal men.' },
    'queens-grace':   { name: 'Queen\'s Grace',      slot: 'piece', piece: 'queen',  price: 600, colors: { trim: '#c8d4e4' }, desc: 'Silver filigree for the strategist.' },
    'kings-aegis':    { name: 'King\'s Aegis',       slot: 'piece', piece: 'king',   price: 0, colors: { trim: '#c8a040' }, desc: 'The crown\'s own plate.', questOnly: true },
  };

  // What each chapter's hub shop carries.
  const SHOP_STOCK = {
    ch1: ['aurveld-helm', 'aurveld-plate', 'aurveld-cape', 'royal-helm', 'gilded-cavalry'],
    ch2: ['ashfield-hood', 'ashfield-jerkin', 'ashfield-cloak', 'wanderer-hood', 'sable-clergy'],
    ch3: ['valdris-helm', 'valdris-plate', 'valdris-cloak', 'wanderer-jerkin', 'queens-grace'],
    ch4: ['pale-helm', 'pale-plate', 'pale-cape'],
    ch5: ['ember-hood', 'ember-robe', 'dusk-cloak', 'wanderer-cloak'],
  };
  const SHOP_KEEPERS = {
    ch1: 'The palace quartermaster', ch2: 'A camp sutler', ch3: 'A Valdris outfitter',
    ch4: 'A looter with standards', ch5: 'A quiet trader',
  };

  // Armor granted by quests/fights (on first win/clear).
  const QUEST_REWARDS = {
    'ch1-sq1': 'fenwick-cloak',
    'ch1-boss': 'royal-plate',
    'ch2-sq-deserter': 'deserter-hood',
    'ch2-boss': 'iron-vanguard',
    'ch3-sq-soldier': 'veteran-cape',
    'ch3-boss': 'sentinel-walls',
    'ch4-boss': 'kings-aegis',
    'ch5-boss': 'royal-cape',
  };

  // ── Companion farewells (new scenes; play after the ending epilogue) ──
  // Written to match the script's register: short lines, no melodrama.
  const FAREWELL_CUTSCENES = {
    // SPARE — mercy costs you the hawks.
    'ch5.farewell_seraphine_spare': {
      bg: 'palace_antechamber', chapter: 'ch5', story3d: true,
      steps: [
        { place: 'player', x: 0.36, y: 0.7 },
        { place: 'seraphine', x: 0.6, y: 0.68 },
        { say: { speaker: 'SERAPHINE', text: 'Valdris will plant again. Their levies will grow back faster than their wheat.' } },
        { say: { speaker: 'SERAPHINE', text: 'I was promised a king. I will not stay to advise a kind man.' } },
        { move: { id: 'seraphine', x: 0.9, y: 0.68, ms: 2200 } },
        { fade: { id: 'seraphine', to: 0, ms: 600 } },
        { say: { speaker: '—', text: 'No letter. No betrayal. A chair that is empty.' } },
      ],
    },
    'ch5.farewell_seld_spare': {
      bg: 'army_camp_night', chapter: 'ch5', story3d: true,
      steps: [
        { place: 'player', x: 0.4, y: 0.74 },
        { place: 'seld', x: 0.58, y: 0.76 },
        { say: { speaker: 'SELD', text: 'You marched me across two kingdoms and stopped at the last door.' } },
        { say: { speaker: 'SELD', text: 'Somewhere there is a war that finishes. I mean to find it.' } },
        { drop: { id: 'seld' } },
        { move: { id: 'seld', x: 0.94, y: 0.78, ms: 1800 } },
        { fade: { id: 'seld', to: 0, ms: 500 } },
      ],
    },
    'ch5.farewell_theron_spare': {
      bg: 'palace_great_hall', chapter: 'ch5', story3d: true,
      steps: [
        { place: 'player', x: 0.42, y: 0.72 },
        { place: 'theron', x: 0.58, y: 0.72 },
        { say: { speaker: 'THERON', text: 'Your father would have done it. You know that.' } },
        { say: { speaker: 'THERON', text: 'I protected the prince. It would be an honour to protect the king.' } },
        { say: { speaker: '—', text: 'He kneels. He has never knelt before. Not once.' } },
      ],
    },
    // KILL — the throne is safer, the room is colder.
    'ch5.farewell_theron_kill': {
      bg: 'palace_great_hall', chapter: 'ch5', story3d: true,
      steps: [
        { place: 'player', x: 0.42, y: 0.72 },
        { place: 'theron', x: 0.58, y: 0.72 },
        { say: { speaker: 'THERON', text: 'He came to the clearing alone. He could have run.' } },
        { say: { speaker: 'THERON', text: 'I protected the prince. I do not know the king.' } },
        { move: { id: 'theron', x: 0.92, y: 0.72, ms: 2400 } },
        { fade: { id: 'theron', to: 0, ms: 600 } },
      ],
    },
    'ch5.farewell_idris_kill': {
      bg: 'palace_antechamber', chapter: 'ch5', story3d: true,
      steps: [
        { place: 'player', x: 0.38, y: 0.7 },
        { place: 'idris', x: 0.6, y: 0.7 },
        { say: { speaker: 'IDRIS', text: 'I ran the numbers on the way home. The kingdom gains. It always gains.' } },
        { say: { speaker: 'IDRIS', text: 'I keep arriving at one figure I cannot make balance. Goodnight, your grace.' } },
        { shift: { id: 'idris', dx: 0.04 } },
        { fade: { id: 'idris', to: 0, ms: 900 } },
      ],
    },
    'ch5.farewell_seraphine_kill': {
      bg: 'palace_great_hall', chapter: 'ch5', story3d: true,
      steps: [
        { place: 'player', x: 0.44, y: 0.72 },
        { place: 'seraphine', x: 0.56, y: 0.72 },
        { say: { speaker: 'SERAPHINE', text: 'Valdris falls. The wealth flows home. You did what had to be done.' } },
        { say: { speaker: '—', text: 'She stands at your right hand. She does not ask what happened in the clearing.' } },
        { say: { speaker: '—', text: 'She never will. The silence is its own ending.' } },
      ],
    },
  };
  const FAREWELL_ORDER = {
    kill_saoirse: ['ch5.farewell_theron_kill', 'ch5.farewell_idris_kill', 'ch5.farewell_seraphine_kill'],
    spare_saoirse: ['ch5.farewell_seraphine_spare', 'ch5.farewell_seld_spare', 'ch5.farewell_theron_spare'],
  };

  // ── Ending presentation moods (consumed by the cutscene presenter) ───
  const ENDING_MOODS = {
    'ch5.ending_kill': {
      // the fire dies with him: blood-red rim light, fog closing in,
      // Saoirse's "drop" is a full collapse
      light: { color: 0xff3022, intensity: 0.55 },
      fogTo: '#16070a', skyTo: '#0c0406', fadeFogMs: 9000,
      collapse: true, pushIn: true,
    },
    'ch5.ending_spare': {
      // dawn breaks over the clearing as he rides east
      light: { color: 0xffb46a, intensity: 0.4 },
      fogTo: '#5a4a44', skyTo: '#4a3a40', fadeFogMs: 12000,
      collapse: false, pushIn: false, dawn: true,
    },
  };

  // ── Set bonuses ───────────────────────────────────────────────────────
  // A full set = head+body+cape sharing an id prefix. Each story win in a
  // full set pays out in the existing consumable economy.
  const SET_BONUSES = {
    aurveld:  { name: 'Aurveld Guard',   grants: { hints: 1 },                       label: '+1 hint' },
    ashfield: { name: 'Ashfield Rover',  grants: { takebacks: 1 },                   label: '+1 takeback' },
    valdris:  { name: 'River Guard',     grants: { timeExtensions: 1 },              label: '+1 time extension' },
    pale:     { name: 'Pale Court',      grants: { hints: 1, takebacks: 1 },         label: '+1 hint, +1 takeback' },
    wanderer: { name: 'Wanderer',        grants: { hints: 1, timeExtensions: 1 },    label: '+1 hint, +1 time extension' },
    royal:    { name: 'Royal Regalia',   grants: { hints: 1, takebacks: 1, timeExtensions: 1 }, label: '+1 of everything' },
  };
  function setPrefixOf(itemId) { return itemId ? itemId.split('-')[0] : null; }
  function fullSetPrefix(equipped) {
    if (!equipped || !equipped.head || !equipped.body || !equipped.cape) return null;
    const p = setPrefixOf(equipped.head);
    return (p && SET_BONUSES[p] && setPrefixOf(equipped.body) === p && setPrefixOf(equipped.cape) === p) ? p : null;
  }

  // ── Companions in the hubs ────────────────────────────────────────────
  // The party walks with you. Leavers vanish after the ending that loses
  // them (matching the farewell scenes); Saoirse rides along until ch5.
  const COMPANIONS = ['saoirse', 'seraphine', 'theron', 'idris', 'cael', 'maren', 'brennar', 'seld'];
  const COMPANION_ROSTER_NAME = {
    seraphine: 'Seraphine', theron: 'Theron', idris: 'Idris', cael: 'Cael',
    maren: 'Maren', brennar: 'Brennar', seld: 'Seld', saoirse: 'Saoirse',
  };
  const LEAVERS = { kill_saoirse: ['theron', 'idris', 'saoirse'], spare_saoirse: ['seraphine', 'seld', 'saoirse'] };
  const COMPANION_LINES = {
    saoirse:   { high: ['Long road. Good company, though.', 'When this is over, remind me to teach you the eastern opening.'], low: ['We should keep moving.', 'Another camp. Another board.'] },
    seraphine: { high: ['The court whispers your name kindly tonight. Enjoy it while it lasts.', 'Valdris counts its levies. So do I.'], low: ['A king should look more certain than you do.', 'We are losing time.'] },
    theron:    { high: ['I sleep better guarding you than I ever did your father.', 'The villages speak well of you. That matters.'], low: ['I saw what the march cost them. Did you?', 'My shield is yours. My silence is not.'] },
    idris:     { high: ['The numbers favour us. For once.', 'I recounted the supply lines twice. We are fine.'], low: ['The arithmetic of this war is getting expensive.', 'Ask me later. I am counting.'] },
    cael:      { high: ['Every gate opens if you knock with the right coin.', 'Stick with me when the looting starts.'], low: ['No opportunities in this mud.', 'Wake me when something is worth taking.'] },
    maren:     { high: ['Clean work at the last fight. Very clean.', 'Point me at a problem, my king.'], low: ['Too much waiting. Blades rust.', 'Hm.'] },
    brennar:   { high: ['The line held because you held. Remember that.', 'Solid ground tonight. Good.'], low: ['The men are tired. So am I.', 'We hold. As always.'] },
    seld:      { high: ['Give the word and I break their wall.', 'Tonight smells like a good fight.'], low: ['All this talk. No breaking.', 'Wars end. Pity.'] },
  };

  // ── Side activities ───────────────────────────────────────────────────
  // Tavern riddle wagers (50c a round, paid through spendStoryCoins;
  // winnings pay out in consumables), a drill post, hidden lore pages.
  const RIDDLES = [
    { q: 'I never move, yet every battle bends around me. Lose me and the war is over. What am I?', a: ['The king', 'The queen', 'The castle'], correct: 0 },
    { q: 'I am strongest standing beside my twin, weakest standing alone, and I only ever walk sideways past no one. What am I?', a: ['The knight', 'The rook pair', 'The bishop'], correct: 1 },
    { q: 'I leap over friend and foe alike, and the closer the quarters, the deadlier I am. What am I?', a: ['The queen', 'The pawn', 'The knight'], correct: 2 },
    { q: 'I touch only half the world, and my brother touches the other half. Together we see everything. What are we?', a: ['The bishops', 'The rooks', 'The knights'], correct: 0 },
    { q: 'The fewer of my brothers remain, the stronger each of us stands. March me far enough and I become anything. What am I?', a: ['The pawn', 'The knight', 'The king'], correct: 0 },
    { q: 'Two armies meet and no blood is spilled, yet a king still dies every time. Where are you?', a: ['A siege', 'A chessboard', 'A truce'], correct: 1 },
  ];
  const LORE_PAGES = {
    ch1: [
      { id: 'page-iron-ledger', title: 'A page from the Iron Ledger', body: 'Tithes from Fenwick, the Reach, and the river villages — every winter entered in the same iron hand. The final column is headed simply: OWED.' },
      { id: 'page-coronation', title: 'Order of Coronation (draft)', body: 'The crown passes at the moment of death, not the moment of ceremony. The ceremony, a steward has noted in the margin, is for everyone else.' },
    ],
    ch2: [
      { id: 'page-ashfield-census', title: 'Ashfield census, eleven years old', body: 'Forty-one farms. A note pinned later reads: nineteen remain. The ink of the note is newer than the grief.' },
      { id: 'page-mercenary-rates', title: 'Company rates, posted', body: 'Escort: 30 a day. Siege: 90. Questions: not taken. The bottom line, underlined twice: we do not fight winters.' },
    ],
    ch3: [
      { id: 'page-river-toll', title: 'River toll registry', body: 'A century of crossings in one book. The last entry is unfinished — a name, half-written, the pen dragged off the page.' },
      { id: 'page-halvane-letter', title: 'An unsent letter, E. Halvane', body: '"…and if Aurveld comes, I will hold the crossing as I always have. Tell mother the orchard should be pruned in my absence. It will not be long." It was long.' },
    ],
    ch4: [
      { id: 'page-pale-inventory', title: 'Inventory of the borrowed throne', body: 'One hall, taken. One crown, borrowed. One kingdom, on loan. Beneath, in Aldric\'s hand: everything is borrowed if you hold it long enough.' },
      { id: 'page-kitchen-rota', title: 'Kitchen rota, the night in question', body: 'Every servant accounted for, every hour initialed. One line is circled so hard the page has torn. Whoever circled it never spoke.' },
    ],
    ch5: [
      { id: 'page-eastern-road', title: 'Map fragment: the eastern road', body: 'Beyond the clearing the cartographer simply wrote: farther. Someone has added, in small letters: far enough.' },
      { id: 'page-two-chairs', title: 'A camp inventory', body: 'One fire. Two logs for sitting. One board, travel-worn, the white king mended with wire. Some inventories are confessions.' },
    ],
  };
  // Hub placement data (positions sized to each chapter hub's footprint).
  const HUB_SPOTS = {
    ch1: { companions: [[-11, 5], [11, 4], [-10, -2], [10.5, -3], [-6.5, 9]], patron: [9, 9.5], dummy: [-9, 9.5], pages: [[-12.5, 10.5], [12.5, -8.5]] },
    ch2: { companions: [[-11, 6], [11.5, 5], [-12, -4], [12, -5], [-7, 9]], patron: [7.5, 9.5], dummy: [-10, 8.5], pages: [[-13.5, 11], [13, -9]] },
    ch3: { companions: [[-11, 6], [11.5, 5.5], [-12, -6], [12, -6.5], [-8, 10]], patron: [8, 10], dummy: [-10.5, 9.5], pages: [[-13.5, 10.5], [13, -9.5]] },
    ch4: { companions: [[-9, 6], [9.5, 5.5], [-9.5, -3], [9.5, -3.5], [-6, 8.5]], patron: [7, 8.5], dummy: [-8, 8.5], pages: [[-11, 9.5], [10.5, -8]] },
    ch5: { companions: [[-9, 6], [9.5, 5], [-9.5, -4], [9.5, -4.5], [-6, 8.5]], patron: [6.5, 8.5], dummy: [-8.5, 8], pages: [[-11, 9.5], [10.5, -8.5]] },
  };

  /** Companions present in a hub, given live progress. */
  function companionsFor(chapterId, progress) {
    let list = COMPANIONS.slice();
    if (chapterId === 'ch5') list = list.filter(id => id !== 'saoirse'); // he waits in the clearing
    if (progress && progress.outcome && LEAVERS[progress.outcome]) {
      const gone = LEAVERS[progress.outcome];
      list = list.filter(id => !gone.includes(id));
    }
    return list;
  }
  function companionLine(id, progress) {
    const lines = COMPANION_LINES[id];
    if (!lines) return null;
    const name = COMPANION_ROSTER_NAME[id];
    const rel = progress && progress.roster && progress.roster[name] ? progress.roster[name].relationship : 50;
    const pool = rel >= 55 ? lines.high : lines.low;
    return { speaker: name.toUpperCase(), text: pool[Math.floor(Math.random() * pool.length)] };
  }

  // ── Pure helpers ──────────────────────────────────────────────────────
  function factionOf(figureId, chapterId) {
    return FIGURE_FACTIONS[figureId] || (chapterId ? CHAPTER_ENEMY_FACTION[chapterId] : null) || null;
  }
  function shopStock(chapterId) {
    return (SHOP_STOCK[chapterId] || []).map(id => Object.assign({ id }, ARMOR[id]));
  }
  function questReward(fightId) { return QUEST_REWARDS[fightId] || null; }
  function farewellIds(outcome) { return FAREWELL_ORDER[outcome] || []; }
  function endingMood(csId) { return ENDING_MOODS[csId] || null; }

  return {
    FACTIONS, FIGURE_FACTIONS, CHAPTER_ENEMY_FACTION, FIGURE_ACCENTS,
    ARMOR, SHOP_STOCK, SHOP_KEEPERS, QUEST_REWARDS,
    FAREWELL_CUTSCENES, FAREWELL_ORDER, ENDING_MOODS,
    SET_BONUSES, COMPANIONS, COMPANION_LINES, LEAVERS, RIDDLES, LORE_PAGES, HUB_SPOTS,
    factionOf, shopStock, questReward, farewellIds, endingMood,
    setPrefixOf, fullSetPrefix, companionsFor, companionLine,
  };
});
