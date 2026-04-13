(function () {
  var state = null;
  var replay = null;
  var replayIndex = 0;
  var selectedSquare = null;
  var aiPending = false;
  var promotionContext = null;
  var lastHint = null;
  var refreshTimer = null;
  var dismissedResultKey = "";

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

  function byId(id) {
    return document.getElementById(id);
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

  function pieceGlyph(piece) {
    var pieceSet = state ? state.pieceSet : "classic";
    if (pieceSet === "letters") {
      return piece.color === "white" ? PIECE_LETTERS[piece.kind] : PIECE_LETTERS[piece.kind].toLowerCase();
    }
    return piece.glyph;
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

  function renderBoard() {
    var boardHtml = [];
    var targetMap = buildTargetMap();
    var order = squareOrder();
    var view = currentDisplay();
    var rowIndex;
    var colIndex;
    var row;
    var col;
    var piece;
    var squareName;
    var targets;
    var indicatorHtml;

    updateBoardLabels();
    for (rowIndex = 0; rowIndex < 8; rowIndex += 1) {
      row = order.rows[rowIndex];
      for (colIndex = 0; colIndex < 8; colIndex += 1) {
        col = order.cols[colIndex];
        piece = view.board[row][col];
        squareName = String.fromCharCode(97 + col) + String(8 - row);
        targets = targetMap[squareName] || [];
        indicatorHtml = "";
        if (targets.length > 0) {
          indicatorHtml = targets[0].capture ? '<div class="indicator-ring"></div>' : '<div class="indicator-dot"></div>';
        }

        boardHtml.push('<div class="' + squareClasses(squareName, piece, view) + '" data-square="' + squareName + '">');
        boardHtml.push(indicatorHtml);
        if (piece) {
          boardHtml.push('<div class="piece ' + piece.color + ' piece-set-' + (state ? state.pieceSet : "classic") + '">' + pieceGlyph(piece) + "</div>");
        }
        boardHtml.push("</div>");
      }
    }
    byId("board").innerHTML = boardHtml.join("");
  }

  function renderHistory() {
    var view = currentDisplay();
    var text = isReplayMode() ? "Replay loaded." : "No moves yet.";
    var lines = [];
    var index;
    var whiteMove;
    var blackMove;
    if (view.moveHistory && view.moveHistory.length > 0) {
      for (index = 0; index < view.moveHistory.length; index += 2) {
        whiteMove = view.moveHistory[index];
        blackMove = index + 1 < view.moveHistory.length ? view.moveHistory[index + 1] : "";
        lines.push((Math.floor(index / 2) + 1) + ". " + whiteMove + (blackMove ? "   " + blackMove : ""));
      }
      text = lines.join("\r\n");
    }
    if (isReplayMode()) {
      text = "Replay " + replay.title + "\r\nStep " + replayIndex + " of " + (replay.snapshots.length - 1) + "\r\n\r\n" + text;
    }
    byId("move-history").innerText = text;
  }

  function renderInsights() {
    var insight = "Top move probabilities will appear here after the bot moves.";
    var summary;
    var lines;
    var index;
    if (isReplayMode()) {
      insight = replay.analysis && (replay.analysis.bestMoves.length || replay.analysis.blunders.length || replay.analysis.missedTactics.length)
        ? "Replay analysis loaded below."
        : "Replay mode is active.";
    } else if (state.lastAiSummary) {
      summary = state.lastAiSummary;
      lines = [];
      lines.push(capitalize(summary.mode) + " Bot played " + summary.move + ".");
      lines.push("Estimated win chance: " + (summary.estimated_win_probability * 100).toFixed(1) + "%");
      lines.push("Search depth: " + summary.search_depth);
      lines.push("Difficulty: " + capitalize(summary.difficulty || state.difficulty));
      if (summary.personality && summary.mode === "illegal") {
        lines.push("Personality: " + capitalize(summary.personality));
      }
      if (summary.top_choices && summary.top_choices.length > 0) {
        lines.push("");
        lines.push("Top choices:");
        for (index = 0; index < summary.top_choices.length; index += 1) {
          lines.push(
            "  " +
              (index + 1) +
              ". " +
              summary.top_choices[index].uci +
              "   " +
              (summary.top_choices[index].probability * 100).toFixed(1) +
              "%"
          );
        }
      }
      if (lastHint) {
        lines.push("");
        lines.push("Last hint: " + lastHint.from + " to " + lastHint.to + " (" + (lastHint.probability * 100).toFixed(1) + "%)");
      }
      insight = lines.join("\r\n");
    } else if (lastHint) {
      insight = "Hint: " + lastHint.from + " to " + lastHint.to + " (" + (lastHint.probability * 100).toFixed(1) + "%)";
    }
    byId("ai-insight").innerText = insight;
  }

  function renderStatus() {
    var statusText = "Choose your settings and press Play.";
    var thoughtText = "The board opens in standard chess setup.";
    if (isReplayMode()) {
      statusText = "Replay mode";
      thoughtText = replay.title + "   " + replay.result + (replay.outcomeReason ? "   " + replay.outcomeReason : "");
    } else if (state.gameActive) {
      if (state.result !== "*") {
        statusText = state.resultText;
        thoughtText = "Game saved in algebraic notation. Reason: " + state.outcomeReason + ".";
      } else if (aiPending || state.aiToMove) {
        statusText = capitalize(state.botMode) + " Bot is calculating for " + capitalize(state.botColor) + "...";
        thoughtText = state.lastAiSummary
          ? capitalize(state.botMode) + " Bot last played " + state.lastAiSummary.move + "."
          : "The bot is evaluating move probabilities from the current position.";
      } else {
        statusText = "Your move as " + capitalize(state.playerColor) + ".";
        thoughtText =
          state.botMode === "legal"
            ? "Legal Bot only plays moves that obey standard chess rules."
            : "Illegal Bot may bend movement rules without using king-capture glitches.";
      }
    }
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
    byId("record-summary").innerText =
      "Saved games: " +
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
    var byWhite = [];
    var byBlack = [];
    var index;
    for (index = 0; index < view.captured.byWhite.length; index += 1) {
      byWhite.push(pieceGlyph(view.captured.byWhite[index]));
    }
    for (index = 0; index < view.captured.byBlack.length; index += 1) {
      byBlack.push(pieceGlyph(view.captured.byBlack[index]));
    }
    byId("captured-white").innerText = byWhite.join(" ") || "None";
    byId("captured-black").innerText = byBlack.join(" ") || "None";
  }

  function renderClock() {
    var white = byId("white-clock");
    var black = byId("black-clock");
    if (!state || !state.clock) {
      white.innerText = "White: unlimited";
      black.innerText = "Black: unlimited";
      white.className = "clock-box";
      black.className = "clock-box";
      return;
    }
    white.innerText = "White  " + state.clock.whiteText;
    black.innerText = "Black  " + state.clock.blackText;
    white.className = "clock-box" + (state.clock.activeColor === "white" ? " active" : "");
    black.className = "clock-box" + (state.clock.activeColor === "black" ? " active" : "");
  }

  function renderSavedGames() {
    var html = [];
    var index;
    var item;
    if (!state || !state.savedGameList || state.savedGameList.length === 0) {
      byId("saved-games").innerHTML = '<div class="empty-text">No saved games yet.</div>';
      return;
    }
    for (index = 0; index < state.savedGameList.length; index += 1) {
      item = state.savedGameList[index];
      html.push(
        '<button type="button" class="saved-game-button" data-file="' +
          item.file +
          '">' +
          item.title +
          "   " +
          item.result +
          "</button>"
      );
    }
    byId("saved-games").innerHTML = html.join("");
  }

  function renderAnalysis() {
    var analysis = isReplayMode() ? replay.analysis : state.analysis;
    var lines = [];
    var index;
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

  function applyTheme() {
    var theme = state ? state.theme : "classic";
    document.body.className = "theme-" + theme + (state && state.pieceSet === "letters" ? " letters-mode" : "");
    byId("mute-button").innerText = state && state.muted ? "Unmute" : "Mute";
  }

  function renderReplayControls() {
    byId("replay-toolbar").className = isReplayMode() ? "toolbar" : "toolbar hidden";
    byId("live-toolbar").className = isReplayMode() ? "toolbar hidden" : "toolbar";
    byId("resume-button").disabled = !state || !state.resumeAvailable || state.gameActive;
  }

  function renderAll() {
    applyTheme();
    renderReplayControls();
    renderBanner();
    renderBoard();
    renderHistory();
    renderInsights();
    renderStatus();
    renderRecordSummary();
    renderCaptured();
    renderClock();
    renderSavedGames();
    renderAnalysis();
    renderResultModal();
  }

  function syncControlsFromState() {
    if (!state) {
      return;
    }
    setSelectedValue("bot-mode", state.botMode);
    setSelectedValue("player-color", state.playerColor);
    byId("difficulty").value = state.difficulty;
    byId("illegal-personality").value = state.illegalPersonality;
    byId("theme").value = state.theme;
    byId("piece-set").value = state.pieceSet;
    byId("time-mode").value = state.timeMode;
    byId("custom-minutes").value = state.customMinutes;
    byId("custom-increment").value = state.customIncrement;
    byId("auto-flip").checked = state.autoFlip;
  }

  function scheduleRefresh() {
    if (refreshTimer) {
      window.clearTimeout(refreshTimer);
    }
    refreshTimer = window.setTimeout(function () {
      if (!state || isReplayMode()) {
        return;
      }
      refreshState();
    }, state && state.gameActive ? 1000 : 3000);
  }

  function refreshState(callback) {
    request("GET", "/api/state", null, function (error, payload) {
      if (error) {
        byId("status-text").innerText = error;
        byId("thought-text").innerText = "Check that the local Chess Popup server is running.";
        return;
      }
      state = payload;
      syncControlsFromState();
      renderAll();
      if (callback) {
        callback();
      }
      if (!isReplayMode() && state.aiToMove && !aiPending) {
        window.setTimeout(triggerAiMove, 300);
      }
      scheduleRefresh();
    });
  }

  function currentStartPayload() {
    return {
      playerColor: getSelectedValue("player-color"),
      botMode: getSelectedValue("bot-mode"),
      difficulty: byId("difficulty").value,
      illegalPersonality: byId("illegal-personality").value,
      theme: byId("theme").value,
      pieceSet: byId("piece-set").value,
      autoFlip: byId("auto-flip").checked,
      muted: state ? state.muted : false,
      timeMode: byId("time-mode").value,
      customMinutes: parseInt(byId("custom-minutes").value || "10", 10),
      customIncrement: parseInt(byId("custom-increment").value || "0", 10)
    };
  }

  function startGame() {
    selectedSquare = null;
    replay = null;
    replayIndex = 0;
    lastHint = null;
    aiPending = false;
    dismissedResultKey = "";
    request("POST", "/api/start", currentStartPayload(), function (error, payload) {
      if (error) {
        alert(error);
        return;
      }
      state = payload;
      syncControlsFromState();
      renderAll();
      scheduleRefresh();
      if (state.aiToMove) {
        window.setTimeout(triggerAiMove, 300);
      }
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
      dismissedResultKey = "";
      state = payload;
      syncControlsFromState();
      renderAll();
      scheduleRefresh();
      if (state.aiToMove) {
        window.setTimeout(triggerAiMove, 300);
      }
    });
  }

  function sendPreferences() {
    request(
      "POST",
      "/api/preferences",
      {
        theme: byId("theme").value,
        pieceSet: byId("piece-set").value,
        autoFlip: byId("auto-flip").checked,
        muted: state ? state.muted : false
      },
      function (error, payload) {
        if (!error) {
          state = payload;
          renderAll();
          scheduleRefresh();
        }
      }
    );
  }

  function sendMove(fromSquare, toSquare, promotion) {
    selectedSquare = null;
    request(
      "POST",
      "/api/move",
      {
        from: fromSquare,
        to: toSquare,
        promotion: promotion || null
      },
      function (error, payload) {
        if (error) {
          alert(error);
          refreshState();
          return;
        }
        state = payload;
        renderAll();
        scheduleRefresh();
        if (state.aiToMove) {
          window.setTimeout(triggerAiMove, 300);
        }
      }
    );
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
      state = payload;
      renderAll();
      scheduleRefresh();
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
      if (path === "/api/restart") {
        dismissedResultKey = "";
      }
      state = payload;
      renderAll();
      scheduleRefresh();
      if (state.aiToMove) {
        window.setTimeout(triggerAiMove, 300);
      }
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
      replay = payload.replay;
      replayIndex = 0;
      selectedSquare = null;
      renderAll();
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
  }

  function toggleMute() {
    if (!state) {
      return;
    }
    state.muted = !state.muted;
    request("POST", "/api/preferences", { muted: state.muted }, function (error, payload) {
      if (!error) {
        state = payload;
        renderAll();
      }
    });
  }

  function copyPgn() {
    var text = isReplayMode() ? replay.pgn : state.pgn;
    if (!text) {
      alert("No PGN is available yet.");
      return;
    }
    if (window.clipboardData && window.clipboardData.setData) {
      window.clipboardData.setData("Text", text);
      alert("PGN copied to clipboard.");
      return;
    }
    window.prompt("Copy PGN:", text);
  }

  function squareClicked(squareName) {
    var moveMap = buildMoveMap();
    var targetMap = buildTargetMap();
    var moves;
    if (!state || !state.playerToMove || aiPending || state.result !== "*" || isReplayMode()) {
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
    renderBoard();
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

  function savedGameClickHandler(event) {
    var target = event.target || event.srcElement;
    if (!target || !target.getAttribute("data-file")) {
      return;
    }
    loadRecord(target.getAttribute("data-file"));
  }

  function init() {
    byId("play-button").onclick = startGame;
    byId("resume-button").onclick = resumeGame;
    byId("undo-button").onclick = function () { callGameAction("/api/undo"); };
    byId("restart-button").onclick = function () { callGameAction("/api/restart"); };
    byId("hint-button").onclick = requestHint;
    byId("draw-button").onclick = function () { callGameAction("/api/draw"); };
    byId("resign-button").onclick = function () { callGameAction("/api/resign"); };
    byId("copy-pgn-button").onclick = copyPgn;
    byId("replay-copy-pgn-button").onclick = copyPgn;
    byId("mute-button").onclick = toggleMute;
    byId("replay-prev").onclick = function () { stepReplay(-1); };
    byId("replay-next").onclick = function () { stepReplay(1); };
    byId("replay-close").onclick = closeReplay;
    byId("result-play-again").onclick = function () { dismissedResultKey = ""; callGameAction("/api/restart"); };
    byId("result-review").onclick = hideResultModal;
    byId("board").onclick = boardClickHandler;
    byId("promotion-buttons").onclick = promotionClickHandler;
    byId("promotion-cancel").onclick = hidePromotionModal;
    byId("saved-games").onclick = savedGameClickHandler;
    byId("theme").onchange = sendPreferences;
    byId("piece-set").onchange = sendPreferences;
    byId("auto-flip").onclick = sendPreferences;
    refreshState();
  }

  if (document.readyState === "complete") {
    init();
  } else {
    window.onload = init;
  }
})();
