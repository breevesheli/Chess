(function () {
  var state = null;
  var selectedSquare = null;
  var aiPending = false;
  var promotionContext = null;

  var PROMOTION_ORDER = ["queen", "rook", "bishop", "knight"];
  var PROMOTION_LABELS = {
    queen: "Queen",
    rook: "Rook",
    bishop: "Bishop",
    knight: "Knight"
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

  function buildMoveMap() {
    var map = {};
    if (!state || !state.availableMoves) {
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

  function findCheckedKingSquare() {
    if (!state || !state.checkColor || !state.board) {
      return null;
    }
    var row;
    var col;
    var piece;
    for (row = 0; row < 8; row += 1) {
      for (col = 0; col < 8; col += 1) {
        piece = state.board[row][col];
        if (piece && piece.color === state.checkColor && piece.kind === "king") {
          return piece.square;
        }
      }
    }
    return null;
  }

  function squareClasses(squareName, piece) {
    var fileIndex = squareName.charCodeAt(0) - 97;
    var rank = parseInt(squareName.charAt(1), 10);
    var row = 8 - rank;
    var classes = ["square"];
    var isDark = ((row + fileIndex) % 2) === 1;
    var checkedKingSquare = findCheckedKingSquare();
    classes.push(isDark ? "dark" : "light");

    if (state && state.lastMove && (state.lastMove.from === squareName || state.lastMove.to === squareName)) {
      classes.push(isDark ? "last-dark" : "last-light");
    }
    if (selectedSquare === squareName) {
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
    var row;
    var col;
    var piece;
    var squareName;
    var targets;
    var indicatorHtml;

    for (row = 0; row < 8; row += 1) {
      for (col = 0; col < 8; col += 1) {
        piece = state.board[row][col];
        squareName = String.fromCharCode(97 + col) + String(8 - row);
        targets = targetMap[squareName] || [];
        indicatorHtml = "";
        if (targets.length > 0) {
          if (targets[0].capture) {
            indicatorHtml = '<div class="indicator-ring"></div>';
          } else {
            indicatorHtml = '<div class="indicator-dot"></div>';
          }
        }

        boardHtml.push('<div class="' + squareClasses(squareName, piece) + '" data-square="' + squareName + '">');
        boardHtml.push(indicatorHtml);
        if (piece) {
          boardHtml.push('<div class="piece ' + piece.color + '">' + piece.glyph + "</div>");
        }
        boardHtml.push("</div>");
      }
    }

    byId("board").innerHTML = boardHtml.join("");
  }

  function renderHistory() {
    var text = "No moves yet.";
    var lines = [];
    var index;
    var whiteMove;
    var blackMove;
    if (state.moveHistory && state.moveHistory.length > 0) {
      for (index = 0; index < state.moveHistory.length; index += 2) {
        whiteMove = state.moveHistory[index];
        blackMove = index + 1 < state.moveHistory.length ? state.moveHistory[index + 1] : "";
        lines.push((Math.floor(index / 2) + 1) + ". " + whiteMove + (blackMove ? "   " + blackMove : ""));
      }
      text = lines.join("\r\n");
    }
    byId("move-history").innerText = text;
  }

  function renderInsights() {
    var insight = "Top move probabilities will appear here after the bot moves.";
    var summary;
    var lines;
    var index;
    if (state.lastAiSummary) {
      summary = state.lastAiSummary;
      lines = [];
      lines.push(capitalize(summary.mode) + " Bot played " + summary.move + ".");
      lines.push("Estimated win chance: " + (summary.estimated_win_probability * 100).toFixed(1) + "%");
      lines.push("Search depth: " + summary.search_depth);
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
      insight = lines.join("\r\n");
    }
    byId("ai-insight").innerText = insight;
  }

  function renderStatus() {
    var statusText = "Choose your settings and press Play.";
    var thoughtText = "The board opens in standard chess setup.";

    if (state.gameActive) {
      if (state.result !== "*") {
        statusText = state.resultText;
        thoughtText = "Game saved in algebraic notation. Reason: " + state.outcomeReason + ".";
      } else if (aiPending || state.aiToMove) {
        statusText = capitalize(state.botMode) + " Bot is calculating for " + capitalize(state.botColor) + "...";
        thoughtText = state.lastAiSummary
          ? capitalize(state.botMode) +
            " Bot last played " +
            state.lastAiSummary.move +
            " with an estimated " +
            (state.lastAiSummary.estimated_win_probability * 100).toFixed(1) +
            "% win chance."
          : "The bot is evaluating move probabilities from the current position.";
      } else {
        statusText = "Your move as " + capitalize(state.playerColor) + ".";
        if (state.botMode === "legal") {
          thoughtText = "Legal Bot only plays moves that obey standard chess rules.";
        } else {
          thoughtText = "Illegal Bot may bend movement rules without using king-capture glitches.";
        }
      }
    }

    byId("status-text").innerText = statusText;
    byId("thought-text").innerText = thoughtText;
  }

  function renderRecordSummary() {
    byId("record-summary").innerText =
      "Saved games: " +
      state.savedGames +
      "   Learned legal games: " +
      state.learnedLegalGames +
      "   Learned illegal games: " +
      state.learnedIllegalGames;
  }

  function renderAll() {
    renderBoard();
    renderHistory();
    renderInsights();
    renderStatus();
    renderRecordSummary();
  }

  function refreshState(callback) {
    request("GET", "/api/state", null, function (error, payload) {
      if (error) {
        byId("status-text").innerText = error;
        byId("thought-text").innerText = "Check that the local Chess Popup server is running.";
        return;
      }
      state = payload;
      renderAll();
      if (callback) {
        callback();
      }
      if (state.aiToMove && !aiPending) {
        window.setTimeout(triggerAiMove, 300);
      }
    });
  }

  function startGame() {
    selectedSquare = null;
    aiPending = false;
    request(
      "POST",
      "/api/start",
      {
        playerColor: getSelectedValue("player-color"),
        botMode: getSelectedValue("bot-mode")
      },
      function (error, payload) {
        if (error) {
          alert(error);
          return;
        }
        state = payload;
        renderAll();
        if (state.aiToMove) {
          window.setTimeout(triggerAiMove, 300);
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
        if (state.aiToMove) {
          window.setTimeout(triggerAiMove, 300);
        }
      }
    );
  }

  function triggerAiMove() {
    if (aiPending || !state || !state.aiToMove) {
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
    });
  }

  function squareClicked(squareName) {
    var moveMap = buildMoveMap();
    var targetMap = buildTargetMap();
    var moves;

    if (!state || !state.playerToMove || aiPending || state.result !== "*") {
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

  function init() {
    byId("play-button").onclick = startGame;
    byId("board").onclick = boardClickHandler;
    byId("promotion-buttons").onclick = promotionClickHandler;
    byId("promotion-cancel").onclick = hidePromotionModal;
    refreshState();
  }

  if (document.readyState === "complete") {
    init();
  } else {
    window.onload = init;
  }
})();
