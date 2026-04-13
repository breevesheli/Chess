from __future__ import annotations

import argparse
import json
from datetime import datetime
from functools import partial
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
from typing import Any
from urllib.parse import urlparse

from chess_engine import (
    ChessAI,
    GameState,
    LearningMemory,
    Move,
    WHITE,
    BLACK,
    FILES,
    format_move_pairs,
    opposite,
    square_name,
)


PORT_DEFAULT = 8765

CONTENT_TYPES = {
    ".css": "text/css; charset=utf-8",
    ".hta": "text/html; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
}


def parse_square(name: str) -> tuple[int, int]:
    text = name.strip().lower()
    if len(text) != 2 or text[0] not in FILES or text[1] not in "12345678":
        raise ValueError(f"Invalid square: {name}")
    col = FILES.index(text[0])
    row = 8 - int(text[1])
    return row, col


def result_text(result: str) -> str:
    if result == "1-0":
        return "White wins."
    if result == "0-1":
        return "Black wins."
    if result == "1/2-1/2":
        return "Draw."
    return "Game in progress."


class ChessService:
    def __init__(self, project_dir: Path):
        self.project_dir = project_dir
        self.records_dir = self.project_dir / "game_records"
        self.records_dir.mkdir(parents=True, exist_ok=True)
        self.learning_memory = LearningMemory(self.project_dir / "bot_learning.json")
        self.ai = ChessAI(self.learning_memory)
        self.lock = threading.Lock()
        self.reset_preview()

    def reset_preview(self) -> None:
        self.state = GameState.initial()
        self.player_color = WHITE
        self.bot_mode = "legal"
        self.game_active = False
        self.current_game: dict[str, Any] | None = None
        self.last_ai_summary: dict[str, Any] | None = None

    def start_game(self, player_color: str, bot_mode: str) -> dict[str, Any]:
        with self.lock:
            if player_color not in (WHITE, BLACK):
                raise ValueError("Player color must be white or black.")
            if bot_mode not in ("legal", "illegal"):
                raise ValueError("Bot mode must be legal or illegal.")

            started_at = datetime.now()
            self.player_color = player_color
            self.bot_mode = bot_mode
            self.state = GameState.initial()
            self.game_active = True
            self.last_ai_summary = None
            self.current_game = {
                "id": started_at.strftime("%Y%m%d_%H%M%S"),
                "started_at": started_at.isoformat(timespec="seconds"),
                "player_color": self.player_color,
                "bot_color": opposite(self.player_color),
                "bot_mode": self.bot_mode,
                "moves": [],
                "ai_learning_samples": [],
                "ai_decisions": [],
            }
            return self._state_payload()

    def play_human_move(self, from_square: str, to_square: str, promotion: str | None = None) -> dict[str, Any]:
        with self.lock:
            if not self.game_active:
                raise ValueError("Start a game first.")
            if self.state.result != "*":
                raise ValueError("The game is already finished.")
            if self.state.turn != self.player_color:
                raise ValueError("It is not the player's turn.")

            selected = self._find_move(self.state.generate_legal_moves(self.player_color), from_square, to_square, promotion)
            played = self.state.play_move(selected)
            self._record_move(played, actor="Human")
            if self.state.result != "*":
                self._finish_game()
            return self._state_payload()

    def play_ai_move(self) -> dict[str, Any]:
        with self.lock:
            bot_color = opposite(self.player_color)
            if not self.game_active:
                raise ValueError("Start a game first.")
            if self.state.result != "*":
                raise ValueError("The game is already finished.")
            if self.state.turn != bot_color:
                raise ValueError("It is not the bot's turn.")

            decision = self.ai.choose_move(self.state.clone(), bot_color, self.bot_mode)
            if decision is None:
                self.state.refresh_outcome()
                self._finish_game()
                return self._state_payload()

            chosen = decision.chosen
            played = self.state.play_move(chosen.move)
            self._record_move(played, actor="AI", ai_candidate=chosen, search_depth=decision.depth)
            assert self.current_game is not None
            self.current_game["ai_learning_samples"].append(chosen.features)
            top_choices = [
                {
                    "uci": candidate.move.uci(),
                    "probability": round(candidate.probability, 4),
                    "score": round(candidate.total_score, 2),
                }
                for candidate in decision.candidates[:3]
            ]
            self.last_ai_summary = {
                "move": played.san,
                "uci": played.uci(),
                "estimated_win_probability": round(chosen.probability, 4),
                "search_depth": decision.depth,
                "top_choices": top_choices,
                "mode": self.bot_mode,
            }
            self.current_game["ai_decisions"].append(self.last_ai_summary)
            if self.state.result != "*":
                self._finish_game()
            return self._state_payload()

    def _find_move(
        self,
        moves: list[Move],
        from_square: str,
        to_square: str,
        promotion: str | None,
    ) -> Move:
        from_row, from_col = parse_square(from_square)
        to_row, to_col = parse_square(to_square)
        promotion_text = promotion.lower() if promotion else None
        matching = [
            move
            for move in moves
            if move.from_row == from_row
            and move.from_col == from_col
            and move.to_row == to_row
            and move.to_col == to_col
            and (promotion_text is None or move.promotion == promotion_text)
        ]
        if not matching:
            raise ValueError("That move is not available in the current position.")
        if len(matching) == 1:
            return matching[0]
        if promotion_text is None:
            raise ValueError("Promotion choice required.")
        for move in matching:
            if move.promotion == promotion_text:
                return move
        raise ValueError("Invalid promotion choice.")

    def _record_move(
        self,
        played_move: Move,
        actor: str,
        ai_candidate: Any = None,
        search_depth: int | None = None,
    ) -> None:
        if self.current_game is None:
            return
        entry = {
            "ply": len(self.state.move_stack),
            "actor": actor,
            "color": played_move.piece.color,
            "san": played_move.san,
            "uci": played_move.uci(),
            "illegal": played_move.is_illegal,
            "note": played_move.note,
        }
        if ai_candidate is not None:
            entry["estimated_win_probability"] = round(ai_candidate.probability, 4)
            entry["estimated_total_score"] = round(ai_candidate.total_score, 2)
        if search_depth is not None:
            entry["search_depth"] = search_depth
        self.current_game["moves"].append(entry)

    def _finish_game(self) -> None:
        self.game_active = False
        self._save_game_record()

    def _save_game_record(self) -> None:
        if self.current_game is None:
            return

        finished_at = datetime.now()
        player_color = self.current_game["player_color"]
        bot_color = self.current_game["bot_color"]
        white_name = "You" if player_color == WHITE else f"{self.bot_mode.title()} Bot"
        black_name = "You" if player_color == BLACK else f"{self.bot_mode.title()} Bot"

        headers = {
            "Event": "Chess Popup",
            "Site": "Local Desktop",
            "Date": finished_at.strftime("%Y.%m.%d"),
            "White": white_name,
            "Black": black_name,
            "Result": self.state.result,
            "BotMode": self.bot_mode,
            "PlayerColor": str(player_color),
            "OutcomeReason": self.state.outcome_reason or "",
        }

        pgn_body = format_move_pairs(self.state.san_history, self.state.result)
        pgn_text = "\n".join([f"[{key} \"{value}\"]" for key, value in headers.items()]) + "\n\n" + pgn_body + "\n"

        record = {
            **self.current_game,
            "finished_at": finished_at.isoformat(timespec="seconds"),
            "result": self.state.result,
            "winner": self.state.winner,
            "outcome_reason": self.state.outcome_reason,
            "san_moves": self.state.san_history,
            "pgn": pgn_text,
            "board_key": self.state.board_key(),
            "last_ai_summary": self.last_ai_summary,
        }

        stem = f"{self.current_game['id']}_{self.bot_mode}_{self.player_color}"
        json_path = self.records_dir / f"{stem}.json"
        pgn_path = self.records_dir / f"{stem}.pgn"
        json_path.write_text(json.dumps(record, indent=2), encoding="utf-8")
        pgn_path.write_text(pgn_text, encoding="utf-8")

        ai_samples = list(self.current_game.get("ai_learning_samples", []))
        bot_outcome = 0
        if self.state.result == "1/2-1/2":
            bot_outcome = 0
        elif self.state.winner == bot_color:
            bot_outcome = 1
        else:
            bot_outcome = -1
        self.learning_memory.update(self.bot_mode, ai_samples, bot_outcome)

    def _board_payload(self) -> list[list[dict[str, Any] | None]]:
        board_rows: list[list[dict[str, Any] | None]] = []
        for row in range(8):
            row_items: list[dict[str, Any] | None] = []
            for col in range(8):
                piece = self.state.piece_at(row, col)
                if piece is None:
                    row_items.append(None)
                    continue
                row_items.append(
                    {
                        "color": piece.color,
                        "kind": piece.kind,
                        "glyph": piece.glyph,
                        "square": square_name(row, col),
                    }
                )
            board_rows.append(row_items)
        return board_rows

    def _available_moves_payload(self) -> list[dict[str, Any]]:
        if not self.game_active or self.state.result != "*" or self.state.turn != self.player_color:
            return []
        payload = []
        for move in self.state.generate_legal_moves(self.player_color):
            payload.append(
                {
                    "from": square_name(move.from_row, move.from_col),
                    "to": square_name(move.to_row, move.to_col),
                    "promotion": move.promotion,
                    "capture": bool(move.captured or move.en_passant),
                }
            )
        return payload

    def _state_payload(self) -> dict[str, Any]:
        last_move = None
        if self.state.last_move is not None:
            last_move = {
                "from": square_name(self.state.last_move.from_row, self.state.last_move.from_col),
                "to": square_name(self.state.last_move.to_row, self.state.last_move.to_col),
                "san": self.state.last_move.san,
                "illegal": self.state.last_move.is_illegal,
            }

        check_color = None
        if self.state.is_in_check(WHITE):
            check_color = WHITE
        elif self.state.is_in_check(BLACK):
            check_color = BLACK

        bot_color = opposite(self.player_color)
        return {
            "gameActive": self.game_active,
            "playerColor": self.player_color,
            "botColor": bot_color,
            "botMode": self.bot_mode,
            "turn": self.state.turn,
            "board": self._board_payload(),
            "moveHistory": self.state.san_history,
            "pgn": format_move_pairs(self.state.san_history, self.state.result),
            "result": self.state.result,
            "resultText": result_text(self.state.result),
            "winner": self.state.winner,
            "outcomeReason": self.state.outcome_reason,
            "lastMove": last_move,
            "checkColor": check_color,
            "availableMoves": self._available_moves_payload(),
            "playerToMove": self.game_active and self.state.turn == self.player_color and self.state.result == "*",
            "aiToMove": self.game_active and self.state.turn == bot_color and self.state.result == "*",
            "savedGames": len(list(self.records_dir.glob("*.json"))),
            "learnedLegalGames": self.learning_memory.games_played.get("legal", 0),
            "learnedIllegalGames": self.learning_memory.games_played.get("illegal", 0),
            "lastAiSummary": self.last_ai_summary,
        }


class ChessRequestHandler(BaseHTTPRequestHandler):
    server_version = "ChessPopup/1.0"

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/state":
            self._send_json(self.server.service._state_payload())
            return
        if parsed.path in ("/", "/app.hta"):
            self._serve_static("chess_popup.hta")
            return
        if parsed.path == "/chess_popup.css":
            self._serve_static("chess_popup.css")
            return
        if parsed.path == "/chess_popup.js":
            self._serve_static("chess_popup.js")
            return
        if parsed.path == "/chess_popup.ico":
            self._serve_static("chess_popup.ico")
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Not Found")

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        try:
            body = self._read_json_body()
            if parsed.path == "/api/start":
                payload = self.server.service.start_game(
                    player_color=str(body.get("playerColor", WHITE)).lower(),
                    bot_mode=str(body.get("botMode", "legal")).lower(),
                )
                self._send_json(payload)
                return
            if parsed.path == "/api/move":
                payload = self.server.service.play_human_move(
                    from_square=str(body.get("from", "")),
                    to_square=str(body.get("to", "")),
                    promotion=body.get("promotion"),
                )
                self._send_json(payload)
                return
            if parsed.path == "/api/ai-move":
                payload = self.server.service.play_ai_move()
                self._send_json(payload)
                return
        except ValueError as error:
            self._send_json({"error": str(error)}, status=HTTPStatus.BAD_REQUEST)
            return
        except Exception as error:  # pragma: no cover
            self._send_json({"error": f"Server error: {error}"}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Not Found")

    def _read_json_body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        if not raw:
            return {}
        return json.loads(raw.decode("utf-8"))

    def _serve_static(self, filename: str) -> None:
        path = self.server.project_dir / filename
        if not path.exists() or not path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND, "Not Found")
            return
        data = path.read_bytes()
        content_type = CONTENT_TYPES.get(path.suffix.lower(), "application/octet-stream")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _send_json(self, payload: dict[str, Any], status: HTTPStatus = HTTPStatus.OK) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format: str, *args: Any) -> None:
        return


class ChessHttpServer(ThreadingHTTPServer):
    def __init__(self, address: tuple[str, int], handler_factory: Any, project_dir: Path, service: ChessService):
        super().__init__(address, handler_factory)
        self.project_dir = project_dir
        self.service = service


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the Chess Popup local server.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=PORT_DEFAULT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    project_dir = Path(__file__).resolve().parent
    service = ChessService(project_dir)
    handler_factory = partial(ChessRequestHandler)
    server = ChessHttpServer((args.host, args.port), handler_factory, project_dir, service)
    try:
        print(f"Chess Popup server listening on http://{args.host}:{args.port}", flush=True)
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
