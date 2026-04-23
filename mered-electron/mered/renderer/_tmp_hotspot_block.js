const INTERIOR_HOTSPOT_SILHOUETTE = {
  yard_trainer:    { kind: 'knight', color: '#4c5668' },
  aldwyn_hint:     { kind: 'rook',   color: '#5a5e66' },
  guard_wall:      { kind: 'rook',   color: '#3a3e46' },
  junior_clerk:    { kind: 'bishop', color: '#8a7248' },
  physician:       { kind: 'bishop', color: '#b6b2a8' },
  barracks_1:      { kind: 'rook',   color: '#5c4a3a' },
  barracks_2:      { kind: 'rook',   color: '#4a3a2a' },
  barracks_3:      { kind: 'rook',   color: '#625240' },
  fortune_teller:  { kind: 'queen',  color: '#8a3a5a' },
  market_merchant: { kind: 'bishop', color: '#8a6a3a' },
  civilian_1:      { kind: 'human',  color: '#4a3a2a' },
  civilian_2:      { kind: 'human',  color: '#5a4838' },
  saoirse_hint:    { kind: 'bishop', color: '#c88848' },
  'ch1-f0':        { kind: 'crackedKing', color: '#b8a890' },
  'ch1-boss':      { kind: 'rook',        color: '#60606a' },
  'ch1-f1':        { kind: 'king',        color: '#8a6a44' },
  'ch1-f2':        { kind: 'queen',       color: '#a06848' },
  'ch1-f3':        { kind: 'knight',      color: '#5a5a4a' },
  'ch2-boss':      { kind: 'queen',       color: '#8a4a3a' },
  'ch3-boss':      { kind: 'king',        color: '#384850' },
  'ch4-boss':      { kind: 'king',        color: '#2a3846' },
  'ch5-boss':      { kind: 'bishop',      color: '#c88848' },
};

function _wmPickSilhouetteForSpot(spot) {
  if (spot.type === 'npc' && spot.npc && INTERIOR_HOTSPOT_SILHOUETTE[spot.npc]) {
    return INTERIOR_HOTSPOT_SILHOUETTE[spot.npc];
  }
  if (spot.fightId && INTERIOR_HOTSPOT_SILHOUETTE[spot.fightId]) {
    return INTERIOR_HOTSPOT_SILHOUETTE[spot.fightId];
  }
  if (spot.type === 'fightMain') return { kind: 'rook', color: '#606870' };
  if (spot.type === 'sideQuest') return { kind: 'bishop', color: '#4a6a80' };
  if (spot.type === 'merchant' || spot.type === 'shop') return { kind: 'bishop', color: '#8a6a3a' };
  return { kind: 'human', color: '#4a3a2a' };
}

function _wmDrawSpotSilhouette(el, kind, color) {
  const c = document.createElement('canvas');
  c.width = 120; c.height = 140;
  c.style.width = '120px'; c.style.height = '140px';
  c.style.display = 'block';
  c.style.pointerEvents = 'none';
  const cx = c.getContext('2d');
  if (!cx) return c;
  cx.save(); cx.translate(60, 100);
  const s = 1.8;
  try {
    if (kind === 'king')             _plKingSilhouette(cx, 0, 0, s, color);
    else if (kind === 'queen')       _plQueenSilhouette(cx, 0, 0, s, color);
    else if (kind === 'rook')        _plRookSilhouette(cx, 0, 0, s, color);
    else if (kind === 'knight')      _plKnightSil(cx, 0, 0, s, color);
    else if (kind === 'bishop')      _plBishopSil(cx, 0, 0, s, color);
    else if (kind === 'human')       _plHumanSilhouette(cx, 0, 0, s, color);
    else if (kind === 'crackedKing') _plCrackedKingSilhouette(cx, 0, 0, s, color);
    else                             _plHumanSilhouette(cx, 0, 0, s, color);
  } catch (e) {}
  cx.restore();
  el.appendChild(c);
  return c;
}

function _wmBuildInteriorHotspots(intId) {
  const int = WORLD_INTERIORS[intId]; if (!int) return;
  const hs = _wmHotspotsNode();
  hs.innerHTML = '';
  const { w, h } = _wmSize();
  _renderPerfNoteSceneRebuild('world-map:hotspots-interior', { intId });
  const rawHotspots = (int.hotspots ? int.hotspots() : []).filter(hs => !hs.req || hs.req());
  for (const spot of rawHotspots) {
    const sil = _wmPickSilhouetteForSpot(spot);
    const el = _wmMakeHotspot(spot.x, spot.y, w, h, spot.name, () => _wmHandleHotspotClick(spot), 120);
    el.style.background = 'transparent';
    el.style.border = 'none';
    el.style.padding = '0';
    el.style.pointerEvents = 'auto';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'flex-end';
    el.style.height = '200px';
    el.style.width = '140px';
    el.style.marginLeft = '-70px';
    el.style.marginTop = '-170px';
    const prompt = document.createElement('div');
    const isQuest = spot.type === 'fightMain' || spot.type === 'sideQuest';
    const isMerc = spot.type === 'shop' || spot.type === 'merchant';
    prompt.textContent = isQuest ? (spot.type === 'fightMain' ? '!' : '?') : (isMerc ? 'M' : '...');
    if (isQuest) {
      const dot = spot.type === 'fightMain' ? '#ffcc00' : '#4488ff';
      const glow = spot.type === 'fightMain' ? 'rgba(255,204,0,0.85)' : 'rgba(68,136,255,0.85)';
      prompt.style.cssText = 'background:' + dot + ';color:#000;font:bold 16px "Cinzel",serif;min-width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px ' + glow + ';border:1px solid #3a2810;animation:wmih-pulse 1.4s ease-in-out infinite;margin-bottom:4px;';
    } else {
      prompt.style.cssText = 'background:rgba(20,12,6,0.92);color:#f0e4c8;font:bold 14px "Cinzel",serif;padding:4px 12px;border:1px solid rgba(200,168,75,0.6);border-radius:14px;letter-spacing:2px;box-shadow:0 2px 8px rgba(0,0,0,0.55);animation:wmih-bob 2.8s ease-in-out infinite;margin-bottom:4px;';
    }
    el.appendChild(prompt);
    _wmDrawSpotSilhouette(el, sil.kind, sil.color);
    const cap = document.createElement('div');
    cap.textContent = spot.name || '';
    cap.style.cssText = 'font:11px "Cinzel",serif;color:#f0e4c8;letter-spacing:1px;margin-top:2px;text-shadow:0 1px 3px rgba(0,0,0,0.9);white-space:nowrap;';
    el.appendChild(cap);
  }
}