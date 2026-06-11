/**
 * story3d_inventory.js — gear state, the Tab inventory/equipment menu, the
 * hub armor shops, and quest-reward grants.
 *
 * Gear lives in `storyProgress.gear3d` so the existing unified save persists
 * it with everything else (extra keys on storyProgress round-trip through
 * GameStore untouched). Purchases spend the existing story-coin wallet via
 * the real `spendStoryCoins`/`currentStoryCoins` globals.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(null, null);
  else { root.Story3D.Inventory = factory(root.THREE, root.Story3D); }
})(typeof self !== 'undefined' ? self : this, function (THREE, NS) {
  'use strict';
  if (typeof document === 'undefined') return {};

  const C = () => NS.Content;
  function _progress() { return (typeof storyProgress !== 'undefined') ? storyProgress : window.storyProgress; }
  function _save() { (typeof debouncedSave === 'function' ? debouncedSave : window.debouncedSave)?.(); }
  function _coins() { try { return (typeof currentStoryCoins === 'function' ? currentStoryCoins : window.currentStoryCoins)(); } catch (e) { return 0; } }
  function _spend(n) { try { return (typeof spendStoryCoins === 'function' ? spendStoryCoins : window.spendStoryCoins)(n); } catch (e) { return false; } }
  function _toast(msg, color) {
    try { window.ChessVisuals?.showToast?.(msg, 'right', 3200, color || '#ffcc00', '[M]'); } catch (e) {}
  }

  /** Ensure storyProgress.gear3d exists and return it. */
  function gear() {
    const prog = _progress();
    if (!prog) return null;
    if (!prog.gear3d) {
      prog.gear3d = {
        owned: [],
        equipped: { head: null, body: null, cape: null, pieces: { pawn: null, knight: null, bishop: null, rook: null, queen: null, king: null } },
      };
    }
    if (!prog.gear3d.equipped.pieces) prog.gear3d.equipped.pieces = { pawn: null, knight: null, bishop: null, rook: null, queen: null, king: null };
    return prog.gear3d;
  }

  function owns(id) { const g = gear(); return !!g && g.owned.includes(id); }

  /** Grant an armor item (quest reward / purchase). Returns true if new. */
  function grant(id, opts) {
    const g = gear();
    const item = C().ARMOR[id];
    if (!g || !item || g.owned.includes(id)) return false;
    g.owned.push(id);
    _save();
    if (!opts || !opts.silent) _toast(`Armor acquired — ${item.name}`, '#c8a84b');
    return true;
  }

  /** Sweep quest rewards: anything cleared in storyProgress whose reward
   *  isn't owned yet gets granted (idempotent — covers sidequests that never
   *  pass through the result modal, and is retroactive for old saves). */
  function grantEarned() {
    const prog = _progress();
    if (!prog) return 0;
    let n = 0;
    Object.entries(C().QUEST_REWARDS).forEach(([fightId, armorId]) => {
      const done = (prog.clearedFights || []).includes(fightId) || (prog.bossesCleared || []).includes(fightId);
      if (done && grant(armorId)) n++;
    });
    return n;
  }

  /** Equip/unequip; applies to the player figure and piece sets live. */
  function equip(id) {
    const g = gear();
    const item = C().ARMOR[id];
    if (!g || !item || !g.owned.includes(id)) return false;
    if (item.slot === 'piece') g.equipped.pieces[item.piece] = id;
    else g.equipped[item.slot] = id;
    _save();
    NS.Hub.refreshPlayer?.();
    NS.Match.resyncPieceArmor?.();
    return true;
  }
  function unequip(slot, piece) {
    const g = gear();
    if (!g) return;
    if (slot === 'piece') g.equipped.pieces[piece] = null;
    else g.equipped[slot] = null;
    _save();
    NS.Hub.refreshPlayer?.();
    NS.Match.resyncPieceArmor?.();
  }

  /** The player figure's current visual gear (item objects by slot). */
  function equippedGear() {
    const g = gear();
    if (!g) return {};
    const A = C().ARMOR;
    return {
      head: g.equipped.head ? A[g.equipped.head] : null,
      body: g.equipped.body ? A[g.equipped.body] : null,
      cape: g.equipped.cape ? A[g.equipped.cape] : null,
    };
  }
  function pieceArmorFor(pieceType) {
    const g = gear();
    const id = g && g.equipped.pieces[pieceType];
    return id ? Object.assign({ id }, C().ARMOR[id]) : null;
  }

  // ── UI (inventory + shop share the dark-gold panel styling) ──────────
  let _built = false;
  const CSS = `
    #s3d-inv, #s3d-shop { position: fixed; inset: 0; z-index: 860; display: none;
      background: rgba(4,4,6,0.72); align-items: center; justify-content: center; }
    #s3d-inv.open, #s3d-shop.open { display: flex; }
    .s3d-panel { background: #16130d; border: 1px solid #3a3424; border-radius: 8px;
      width: 620px; max-height: 82vh; overflow-y: auto; padding: 24px 28px; color: #e0d6b8; }
    .s3d-panel h3 { margin: 0 0 2px; font: 22px 'Cinzel', serif; color: #c8a84b; letter-spacing: 2px; }
    .s3d-panel .sub { color: #8a8270; font: 12px Inter, sans-serif; margin-bottom: 12px; }
    .s3d-tabs { display: flex; gap: 8px; margin-bottom: 14px; }
    .s3d-tabs button { flex: 1; background: #1d1812; border: 1px solid #3a3424; color: #b0a890;
      border-radius: 4px; padding: 8px; cursor: pointer; font: 13px 'Cinzel', serif; letter-spacing: 1px; }
    .s3d-tabs button.active { border-color: #ffcc00; color: #ffe9a0; }
    .s3d-row { display: flex; align-items: center; gap: 12px; background: #1d1812;
      border: 1px solid #3a3424; border-radius: 5px; padding: 10px 14px; margin-bottom: 8px; }
    .s3d-row .sw { width: 26px; height: 26px; border-radius: 4px; border: 1px solid #00000088; flex: none; }
    .s3d-row .nm { font: 14px 'Cinzel', serif; color: #e8dcb8; }
    .s3d-row .ds { font: 11px Inter, sans-serif; color: #8a8270; }
    .s3d-row .tag { font: 10px Inter, sans-serif; color: #6a7a8c; letter-spacing: 1px; }
    .s3d-row .grow { flex: 1; min-width: 0; }
    .s3d-row button { background: #2a2316; color: #e8d8a8; border: 1px solid #c8a84b55;
      border-radius: 4px; padding: 6px 12px; cursor: pointer; font: 12px Inter, sans-serif; white-space: nowrap; }
    .s3d-row button:disabled { opacity: 0.35; cursor: not-allowed; }
    .s3d-row button.eq { border-color: #ffcc00; color: #ffe9a0; }
    .s3d-slot-h { font: 12px 'Cinzel', serif; color: #8a8270; letter-spacing: 2px; margin: 12px 0 6px; }
    .s3d-close { margin-top: 12px; width: 100%; background: #2a2316; color: #e8d8a8;
      border: 1px solid #c8a84b55; border-radius: 4px; padding: 9px; cursor: pointer;
      font: 13px 'Cinzel', serif; letter-spacing: 2px; }
    .s3d-coins { float: right; font: 13px Inter, sans-serif; color: #ffd24a; }
  `;
  function _build() {
    if (_built) return;
    _built = true;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    ['s3d-inv', 's3d-shop'].forEach(id => {
      const el = document.createElement('div');
      el.id = id;
      el.innerHTML = `<div class="s3d-panel" id="${id}-panel"></div>`;
      el.addEventListener('click', e => { if (e.target === el) close(); });
      document.body.appendChild(el);
    });
    // Tab toggles the inventory whenever 3D mode owns the screen.
    window.addEventListener('keydown', e => {
      if (e.code !== 'Tab' || !NS.active) return;
      const invOpen = document.getElementById('s3d-inv').classList.contains('open');
      if (!invOpen && NS.Character.overlayOpen()) return; // other overlays own the keys
      e.preventDefault();
      if (invOpen) close(); else openInventory();
    }, true);
  }

  let _tab = 'items';
  function openInventory(tab) {
    _build();
    if (tab) _tab = tab;
    close('s3d-shop');
    const g = gear();
    if (!g) return;
    const A = C().ARMOR;
    const panel = document.getElementById('s3d-inv-panel');
    let html = `<span class="s3d-coins">${_coins()} c</span><h3>SATCHEL</h3><div class="sub">Tab — close · everything here persists with your save</div>
      <div class="s3d-tabs">
        <button id="s3d-t-items" class="${_tab === 'items' ? 'active' : ''}">ITEMS</button>
        <button id="s3d-t-equip" class="${_tab === 'equip' ? 'active' : ''}">EQUIPMENT</button>
      </div>`;
    if (_tab === 'items') {
      const prog = _progress();
      const cons = prog.consumables || { hints: 0, takebacks: 0, timeExtensions: 0 };
      html += `<div class="s3d-slot-h">CONSUMABLES</div>`;
      [['Hints', cons.hints], ['Takebacks', cons.takebacks], ['Time extensions', cons.timeExtensions]].forEach(([n, v]) => {
        html += `<div class="s3d-row"><div class="grow"><div class="nm">${n}</div><div class="ds">Usable during story matches from the match bar.</div></div><div class="tag">×${v || 0}</div></div>`;
      });
      html += `<div class="s3d-slot-h">ARMORY — ${g.owned.length} piece${g.owned.length === 1 ? '' : 's'}</div>`;
      if (!g.owned.length) html += `<div class="s3d-row"><div class="grow ds">Nothing yet. Shops stand in every town, and some quests pay in steel.</div></div>`;
      g.owned.forEach(id => {
        const it = A[id];
        if (!it) return;
        html += `<div class="s3d-row"><div class="sw" style="background:${(it.colors.trim || it.colors.main)}"></div>
          <div class="grow"><div class="nm">${it.name}</div><div class="ds">${it.desc}</div></div>
          <div class="tag">${it.slot === 'piece' ? it.piece.toUpperCase() + ' SET' : it.slot.toUpperCase()}</div></div>`;
      });
    } else {
      const mk = (label, slot, current, items, pieceType) => {
        let s = `<div class="s3d-slot-h">${label}${current ? '' : ' — empty'}</div>`;
        items.forEach(id => {
          const it = A[id];
          const isEq = current === id;
          s += `<div class="s3d-row"><div class="sw" style="background:${(it.colors.trim || it.colors.main)}"></div>
            <div class="grow"><div class="nm">${it.name}</div><div class="ds">${it.desc}</div></div>
            <button class="${isEq ? 'eq' : ''}" data-act="${isEq ? 'unequip' : 'equip'}" data-id="${id}" data-slot="${slot}" data-piece="${pieceType || ''}">${isEq ? 'UNEQUIP' : 'EQUIP'}</button></div>`;
        });
        if (!items.length) s += `<div class="s3d-row"><div class="grow ds">Nothing for this slot yet.</div></div>`;
        return s;
      };
      const bySlot = (slot) => g.owned.filter(id => A[id] && A[id].slot === slot);
      html += mk('HEAD', 'head', g.equipped.head, bySlot('head'));
      html += mk('BODY', 'body', g.equipped.body, bySlot('body'));
      html += mk('CAPE', 'cape', g.equipped.cape, bySlot('cape'));
      ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'].forEach(pt => {
        const items = g.owned.filter(id => A[id] && A[id].slot === 'piece' && A[id].piece === pt);
        if (items.length || g.equipped.pieces[pt]) html += mk(`${pt.toUpperCase()} ARMOR (all ${pt}s)`, 'piece', g.equipped.pieces[pt], items, pt);
      });
    }
    html += `<button class="s3d-close" id="s3d-inv-close">CLOSE</button>`;
    panel.innerHTML = html;
    panel.querySelector('#s3d-t-items').onclick = () => openInventory('items');
    panel.querySelector('#s3d-t-equip').onclick = () => openInventory('equip');
    panel.querySelector('#s3d-inv-close').onclick = () => close();
    panel.querySelectorAll('button[data-act]').forEach(btn => {
      btn.onclick = () => {
        if (btn.dataset.act === 'equip') equip(btn.dataset.id);
        else unequip(btn.dataset.slot === 'piece' ? 'piece' : btn.dataset.slot, btn.dataset.piece || undefined);
        openInventory('equip');
      };
    });
    document.getElementById('s3d-inv').classList.add('open');
  }

  function openShop(chapterId) {
    _build();
    close('s3d-inv');
    const stock = C().shopStock(chapterId);
    const panel = document.getElementById('s3d-shop-panel');
    let html = `<span class="s3d-coins">${_coins()} c</span><h3>ARMORY</h3><div class="sub">${C().SHOP_KEEPERS[chapterId] || 'A trader'} — coin for steel</div>`;
    stock.forEach(it => {
      const owned = owns(it.id);
      const afford = _coins() >= it.price;
      html += `<div class="s3d-row"><div class="sw" style="background:${(it.colors.trim || it.colors.main)}"></div>
        <div class="grow"><div class="nm">${it.name}</div><div class="ds">${it.desc}</div>
        <div class="tag">${it.slot === 'piece' ? it.piece.toUpperCase() + ' SET' : it.slot.toUpperCase()}</div></div>
        ${owned ? '<div class="tag">OWNED</div>' : `<button data-buy="${it.id}" ${afford ? '' : 'disabled'}>${it.price} c</button>`}</div>`;
    });
    html += `<button class="s3d-close" id="s3d-shop-close">LEAVE</button>`;
    panel.innerHTML = html;
    panel.querySelector('#s3d-shop-close').onclick = () => close();
    panel.querySelectorAll('button[data-buy]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.buy;
        const item = C().ARMOR[id];
        if (owns(id) || !item) return;
        if (_spend(item.price)) {
          grant(id, { silent: true });
          _toast(`Purchased — ${item.name}`, '#c8a84b');
          openShop(chapterId);
        } else {
          _toast('Not enough coin', '#ff7a6a');
        }
      };
    });
    document.getElementById('s3d-shop').classList.add('open');
  }

  function close(which) {
    (which ? [which] : ['s3d-inv', 's3d-shop']).forEach(id => document.getElementById(id)?.classList.remove('open'));
  }
  function isOpen() {
    return !!document.querySelector('#s3d-inv.open, #s3d-shop.open');
  }

  return {
    gear, owns, grant, grantEarned, equip, unequip, equippedGear, pieceArmorFor,
    openInventory, openShop, close, isOpen,
  };
});
