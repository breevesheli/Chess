from __future__ import annotations

import argparse
import json
from datetime import datetime
from functools import partial
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import time
from typing import Any, Dict, List, Tuple
from urllib.parse import urlparse

try:  # pragma: no cover - Windows only
    import winsound
except ImportError:  # pragma: no cover
    winsound = None

from chess_engine import (
    Piece,
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
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
}

DIFFICULTY_PROFILES = {
    "easy": {"depth": 1, "temperature": 480.0},
    "medium": {"depth": 2, "temperature": 220.0},
    "hard": {"depth": 3, "temperature": 95.0},
}

VALID_DIFFICULTIES = set(DIFFICULTY_PROFILES.keys()) | {"auto"}


def _auto_profile_for_rating(rating: int) -> Dict[str, Any]:
    """Map a player's ELO-ish rating to a difficulty profile.

    Below 1000 plays like easy, 1000-1400 like medium, 1400-1700 splits
    the difference between medium and hard, and 1700+ plays full hard.
    """
    rating = int(rating)
    if rating < 1000:
        return {"depth": 1, "temperature": 460.0}
    if rating < 1200:
        return {"depth": 2, "temperature": 320.0}
    if rating < 1400:
        return {"depth": 2, "temperature": 220.0}
    if rating < 1600:
        return {"depth": 2, "temperature": 150.0}
    if rating < 1800:
        return {"depth": 3, "temperature": 120.0}
    return {"depth": 3, "temperature": 80.0}


def _load_opening_book_overlay(data_dir: Path) -> Dict[Tuple[str, Tuple[str, ...]], List[str]]:
    """Read opening_book.json (if present) and merge into the hardcoded book."""
    path = data_dir / "opening_book.json"
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    overlay: Dict[Tuple[str, Tuple[str, ...]], List[str]] = {}
    for item in payload.get("entries", []):
        color = str(item.get("color", ""))
        san_history = tuple(str(s) for s in item.get("san_history", []))
        moves = [str(m) for m in item.get("moves", []) if m]
        if color in (WHITE, BLACK) and moves:
            overlay[(color, san_history)] = moves
    return overlay

PIECE_ORDER = ["queen", "rook", "bishop", "knight", "pawn"]
STARTING_PIECES = {
    "king": 1,
    "queen": 1,
    "rook": 2,
    "bishop": 2,
    "knight": 2,
    "pawn": 8,
}

OPENING_BOOK = {
    (WHITE, ()): ["e2e4", "d2d4", "c2c4", "g1f3"],
    (BLACK, ("e4",)): ["c7c5", "e7e5", "c7c6"],
    (BLACK, ("d4",)): ["d7d5", "g8f6", "e7e6"],
    (WHITE, ("e4", "e5")): ["g1f3", "f1c4"],
    (WHITE, ("d4", "d5")): ["c2c4", "g1f3"],
}

SOUND_ALIASES = {
    "move": "SystemAsterisk",
    "capture": "SystemExclamation",
    "check": "SystemHand",
    "game-over": "SystemQuestion",
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


def format_clock_seconds(total_seconds: float) -> str:
    seconds = max(0, int(round(total_seconds)))
    minutes, seconds = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    if hours:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    return f"{minutes}:{seconds:02d}"


class ChessService:
    def __init__(self, project_dir: Path, data_dir: Path | None = None):
        self.project_dir = project_dir
        self.data_dir = data_dir or project_dir
        self.records_dir = self.data_dir / "game_records"
        self.records_dir.mkdir(parents=True, exist_ok=True)
        self.autosave_path = self.data_dir / "current_game_autosave.json"
        self.stats_path = self.data_dir / "player_stats.json"
        self.learning_memory = LearningMemory(self.data_dir / "bot_learning.json")
        self.ai = ChessAI(self.learning_memory)
        self.lock = threading.RLock()
        self.stats = self._load_stats()
        self.opening_book_overlay = _load_opening_book_overlay(self.data_dir)
        self.reset_preview()

    def reload_opening_book_overlay(self) -> None:
        self.opening_book_overlay = _load_opening_book_overlay(self.data_dir)

    def reset_preview(self) -> None:
        self.state = GameState.initial()
        self.player_color = WHITE
        self.bot_mode = "legal"
        self.difficulty = "medium"
        self.illegal_personality = "standard"
        self.theme = "classic"
        self.piece_set = "classic"
        self.auto_flip = True
        self.muted = False
        self.time_mode = "unlimited"
        self.custom_minutes = 10
        self.custom_increment = 0
        self.game_active = False
        self.current_game: dict[str, Any] | None = None
        self.last_ai_summary: dict[str, Any] | None = None
        self.notice: str | None = None
        self.snapshots: list[GameState] = [self.state.clone()]
        self.clock_state: dict[str, float] | None = None
        self.turn_started_at: float | None = None
        self.resume_available = self.autosave_path.exists()

    def get_state(self) -> dict[str, Any]:
        with self.lock:
            return self._state_payload()

    def start_game(
        self,
        player_color: str,
        bot_mode: str,
        difficulty: str = "medium",
        illegal_personality: str = "standard",
        theme: str = "classic",
        piece_set: str = "classic",
        auto_flip: bool = True,
        muted: bool = False,
        time_mode: str = "unlimited",
        custom_minutes: int = 10,
        custom_increment: int = 0,
    ) -> dict[str, Any]:
        with self.lock:
            if player_color not in (WHITE, BLACK):
                raise ValueError("Player color must be white or black.")
            if bot_mode not in ("legal", "illegal"):
                raise ValueError("Bot mode must be legal or illegal.")
            if difficulty not in VALID_DIFFICULTIES:
                raise ValueError("Difficulty must be easy, medium, hard, or auto.")
            if illegal_personality not in ("standard", "chaotic", "greedy", "sneaky"):
                raise ValueError("Invalid Illegal Bot personality.")
            if time_mode not in ("unlimited", "bullet", "blitz", "rapid", "custom"):
                raise ValueError("Invalid time mode.")

            started_at = datetime.now()
            self.player_color = player_color
            self.bot_mode = bot_mode
            self.difficulty = difficulty
            self.illegal_personality = illegal_personality
            self.theme = str(theme or "classic").lower()
            self.piece_set = str(piece_set or "classic").lower()
            self.auto_flip = bool(auto_flip)
            self.muted = bool(muted)
            self.time_mode = time_mode
            self.custom_minutes = max(1, int(custom_minutes))
            self.custom_increment = max(0, int(custom_increment))
            self.state = GameState.initial()
            self.game_active = True
            self.last_ai_summary = None
            self.notice = None
            self.snapshots = [self.state.clone()]
            self.clock_state = self._build_clock_state()
            self.turn_started_at = time.time() if self.clock_state else None
            self.current_game = {
                "id": started_at.strftime("%Y%m%d_%H%M%S"),
                "started_at": started_at.isoformat(timespec="seconds"),
                "player_color": self.player_color,
                "bot_color": opposite(self.player_color),
                "bot_mode": self.bot_mode,
                "difficulty": self.difficulty,
                "illegal_personality": self.illegal_personality,
                "theme": self.theme,
                "piece_set": self.piece_set,
                "time_mode": self.time_mode,
                "custom_minutes": self.custom_minutes,
                "custom_increment": self.custom_increment,
                "moves": [],
                "ai_learning_samples": [],
                "ai_decisions": [],
            }
            self._persist_autosave()
            return self._state_payload()

    def update_preferences(
        self,
        theme: str | None = None,
        piece_set: str | None = None,
        auto_flip: bool | None = None,
        muted: bool | None = None,
    ) -> dict[str, Any]:
        with self.lock:
            if theme is not None:
                self.theme = str(theme or "classic").lower()
            if piece_set is not None:
                self.piece_set = str(piece_set or "classic").lower()
            if auto_flip is not None:
                self.auto_flip = bool(auto_flip)
            if muted is not None:
                self.muted = bool(muted)
            self._persist_autosave()
            return self._state_payload()

    def restart_game(self) -> dict[str, Any]:
        return self.start_game(
            self.player_color,
            self.bot_mode,
            difficulty=self.difficulty,
            illegal_personality=self.illegal_personality,
            theme=self.theme,
            piece_set=self.piece_set,
            auto_flip=self.auto_flip,
            muted=self.muted,
            time_mode=self.time_mode,
            custom_minutes=self.custom_minutes,
            custom_increment=self.custom_increment,
        )

    def resume_game(self) -> dict[str, Any]:
        with self.lock:
            if not self.autosave_path.exists():
                raise ValueError("No autosaved game is available.")
            payload = json.loads(self.autosave_path.read_text(encoding="utf-8"))
            settings = payload.get("settings", {})
            self.player_color = str(settings.get("player_color", WHITE))
            self.bot_mode = str(settings.get("bot_mode", "legal"))
            self.difficulty = str(settings.get("difficulty", "medium"))
            self.illegal_personality = str(settings.get("illegal_personality", "standard"))
            self.theme = str(settings.get("theme", "classic"))
            self.piece_set = str(settings.get("piece_set", "classic"))
            self.auto_flip = bool(settings.get("auto_flip", True))
            self.muted = bool(settings.get("muted", False))
            self.time_mode = str(settings.get("time_mode", "unlimited"))
            self.custom_minutes = int(settings.get("custom_minutes", 10))
            self.custom_increment = int(settings.get("custom_increment", 0))
            self.current_game = payload.get("current_game")
            self.last_ai_summary = payload.get("last_ai_summary")
            self.notice = "Autosaved game resumed."
            self.state = GameState.initial()
            self.snapshots = [self.state.clone()]
            if self.current_game:
                for entry in self.current_game.get("moves", []):
                    moves = (
                        self.state.generate_illegal_bot_moves(self.state.turn)
                        if entry.get("actor") == "AI" and self.bot_mode == "illegal"
                        else self.state.generate_legal_moves(self.state.turn)
                    )
                    move = next(candidate for candidate in moves if candidate.uci() == entry["uci"])
                    self.state.play_move(move)
                    self.snapshots.append(self.state.clone())
            self.clock_state = payload.get("clock")
            self.turn_started_at = time.time() if self.clock_state else None
            self.game_active = True
            self.resume_available = True
            return self._state_payload()

    def play_human_move(self, from_square: str, to_square: str, promotion: str | None = None) -> dict[str, Any]:
        with self.lock:
            if not self.game_active:
                raise ValueError("Start a game first.")
            if self.state.result != "*":
                raise ValueError("The game is already finished.")
            if self.state.turn != self.player_color:
                raise ValueError("It is not the player's turn.")

            self._sync_clock()
            selected = self._find_move(self.state.generate_legal_moves(self.player_color), from_square, to_square, promotion)
            played = self.state.play_move(selected)
            self.snapshots.append(self.state.clone())
            self._record_move(played, actor="Human")
            self._apply_post_move_clock(played.piece.color)
            self._play_sound_for_move(played)
            if self.state.result != "*":
                self._finish_game()
            else:
                self._persist_autosave()
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

            self._sync_clock()
            book_move = self._opening_book_move(bot_color)
            if book_move is not None:
                played = self.state.play_move(book_move)
                self.snapshots.append(self.state.clone())
                self._record_move(played, actor="AI", search_depth=0)
                self.last_ai_summary = {
                    "move": played.san,
                    "uci": played.uci(),
                    "estimated_win_probability": 1.0,
                    "search_depth": 0,
                    "top_choices": [{"uci": played.uci(), "probability": 1.0, "score": 0.0}],
                    "mode": self.bot_mode,
                    "difficulty": self.difficulty,
                    "personality": self.illegal_personality,
                    "source": "opening-book",
                }
                assert self.current_game is not None
                self.current_game["ai_decisions"].append(self.last_ai_summary)
                self._apply_post_move_clock(bot_color)
                self._play_sound_for_move(played)
                if self.state.result != "*":
                    self._finish_game()
                else:
                    self._persist_autosave()
                return self._state_payload()

            profile = self._resolve_difficulty_profile().copy()
            if self.bot_mode == "illegal":
                if self.illegal_personality == "chaotic":
                    profile["depth"] = max(1, profile["depth"] - 1)
                    profile["temperature"] *= 1.9
                elif self.illegal_personality == "greedy":
                    profile["temperature"] *= 0.9
                elif self.illegal_personality == "sneaky":
                    profile["temperature"] *= 1.2

            decision = self.ai.choose_move(
                self.state.clone(),
                bot_color,
                self.bot_mode,
                depth_override=profile["depth"],
                temperature=profile["temperature"],
            )
            if decision is None:
                self.state.refresh_outcome()
                self._finish_game()
                return self._state_payload()

            chosen = self._choose_ai_candidate(decision)
            played = self.state.play_move(chosen.move)
            self.snapshots.append(self.state.clone())
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
                "difficulty": self.difficulty,
                "personality": self.illegal_personality,
                "source": "search",
            }
            self.current_game["ai_decisions"].append(self.last_ai_summary)
            self._apply_post_move_clock(bot_color)
            self._play_sound_for_move(played)
            if self.state.result != "*":
                self._finish_game()
            else:
                self._persist_autosave()
            return self._state_payload()

    def undo_last_turn(self) -> dict[str, Any]:
        with self.lock:
            if not self.game_active:
                raise ValueError("Start a game first.")
            if len(self.snapshots) <= 1:
                raise ValueError("There is nothing to undo.")

            bot_color = opposite(self.player_color)
            plies_to_remove = 1 if self.state.turn == bot_color else min(2, len(self.snapshots) - 1)
            for _ in range(plies_to_remove):
                self.snapshots.pop()
                if self.current_game and self.current_game["moves"]:
                    removed = self.current_game["moves"].pop()
                    if removed.get("actor") == "AI":
                        if self.current_game["ai_learning_samples"]:
                            self.current_game["ai_learning_samples"].pop()
                        if self.current_game["ai_decisions"]:
                            self.current_game["ai_decisions"].pop()
            self.state = self.snapshots[-1].clone()
            self.last_ai_summary = self.current_game["ai_decisions"][-1] if self.current_game and self.current_game["ai_decisions"] else None
            self.notice = "Last turn undone."
            if self.clock_state:
                initial = self.clock_state["initial"]
                self.clock_state = self._build_clock_state()
                if self.clock_state is not None:
                    self.clock_state["initial"] = initial
            self._persist_autosave()
            return self._state_payload()

    def resign_game(self) -> dict[str, Any]:
        with self.lock:
            if not self.game_active or self.state.result != "*":
                raise ValueError("There is no active game to resign.")
            winner = opposite(self.player_color)
            self.state.result = "1-0" if winner == WHITE else "0-1"
            self.state.winner = winner
            self.state.outcome_reason = "resignation"
            self.notice = "You resigned."
            self._finish_game()
            return self._state_payload()

    def offer_draw(self) -> dict[str, Any]:
        with self.lock:
            if not self.game_active or self.state.result != "*":
                raise ValueError("There is no active game to draw.")
            if len(self.state.move_stack) < 8:
                self.notice = "Draw offer declined."
                return self._state_payload()

            bot_color = opposite(self.player_color)
            evaluation = self.ai.evaluate_position(self.state.clone(), bot_color)
            if evaluation <= -150 or (abs(evaluation) <= 120 and len(self.state.move_stack) >= 16):
                self.state.result = "1/2-1/2"
                self.state.winner = None
                self.state.outcome_reason = "draw agreed"
                self.notice = "Draw agreed."
                self._finish_game()
            else:
                self.notice = "Draw offer declined."
                self._persist_autosave()
            return self._state_payload()

    def get_hint(self) -> dict[str, Any]:
        with self.lock:
            if not self.game_active or self.state.result != "*":
                raise ValueError("Start a game first.")
            if self.state.turn != self.player_color:
                raise ValueError("Hints are only available on your turn.")
            decision = self.ai.choose_move(
                self.state.clone(),
                self.player_color,
                "legal",
                depth_override=DIFFICULTY_PROFILES["hard"]["depth"],
                temperature=DIFFICULTY_PROFILES["hard"]["temperature"],
            )
            if decision is None:
                raise ValueError("No hint is available in this position.")
            move = decision.chosen.move
            return {
                "hint": {
                    "from": square_name(move.from_row, move.from_col),
                    "to": square_name(move.to_row, move.to_col),
                    "uci": move.uci(),
                    "san": move.san or move.uci(),
                    "probability": round(decision.chosen.probability, 4),
                }
            }

    def load_record(self, file_name: str) -> dict[str, Any]:
        with self.lock:
            target = self.records_dir / Path(file_name).name
            if target.suffix.lower() != ".json":
                target = target.with_suffix(".json")
            if not target.exists():
                raise ValueError("Saved game not found.")
            record = json.loads(target.read_text(encoding="utf-8"))
            return {"replay": self._build_replay_package(record, target.name)}

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

    def _resolve_difficulty_profile(self) -> Dict[str, Any]:
        if self.difficulty == "auto":
            rating = int(self.stats.get("rating", 1200))
            return _auto_profile_for_rating(rating)
        return DIFFICULTY_PROFILES[self.difficulty]

    def _opening_book_move(self, bot_color: str) -> Move | None:
        if self.bot_mode != "legal" or len(self.state.move_stack) >= 12:
            return None
        key = (bot_color, tuple(self.state.san_history))
        choices = self.opening_book_overlay.get(key) or OPENING_BOOK.get(key, [])
        if not choices:
            return None
        legal_moves = self.state.generate_legal_moves(bot_color)
        for uci in choices:
            for move in legal_moves:
                if move.uci() == uci:
                    return move
        return None

    def _choose_ai_candidate(self, decision: Any) -> Any:
        if self.bot_mode != "illegal" or self.illegal_personality == "standard":
            return decision.chosen
        best = decision.chosen
        best_score = -10_000_000.0
        for candidate in decision.candidates[: min(8, len(decision.candidates))]:
            score = candidate.total_score
            if self.illegal_personality == "chaotic":
                chaos = sum((index + 1) * ord(char) for index, char in enumerate(candidate.move.uci())) % 21
                score += (160.0 if candidate.move.is_illegal else 0.0) + ((chaos - 10) * 18.0)
            elif self.illegal_personality == "greedy":
                if candidate.move.captured or candidate.move.en_passant:
                    score += 260.0
                if candidate.move.promotion:
                    score += 140.0
                if candidate.move.is_illegal:
                    score += 80.0
            elif self.illegal_personality == "sneaky":
                if candidate.move.is_illegal:
                    score += 180.0
                if candidate.move.note:
                    score += 120.0
                if not candidate.move.captured:
                    score += 70.0
            if score > best_score:
                best = candidate
                best_score = score
        return best

    def _build_clock_state(self) -> dict[str, float] | None:
        if self.time_mode == "unlimited":
            return None
        if self.time_mode == "bullet":
            initial = 60.0
        elif self.time_mode == "blitz":
            initial = 300.0
        elif self.time_mode == "rapid":
            initial = 600.0
        else:
            initial = float(self.custom_minutes * 60)
        return {
            WHITE: initial,
            BLACK: initial,
            "initial": initial,
            "increment": float(self.custom_increment),
        }

    def _sync_clock(self) -> None:
        if not self.clock_state or not self.game_active or self.state.result != "*" or self.turn_started_at is None:
            return
        now = time.time()
        elapsed = max(0.0, now - self.turn_started_at)
        self.clock_state[self.state.turn] = max(0.0, self.clock_state[self.state.turn] - elapsed)
        self.turn_started_at = now
        if self.clock_state[self.state.turn] <= 0:
            winner = opposite(self.state.turn)
            self.state.result = "1-0" if winner == WHITE else "0-1"
            self.state.winner = winner
            self.state.outcome_reason = "time forfeit"
            self.notice = f"{self.state.turn.title()} flagged on time."
            self._finish_game()

    def _apply_post_move_clock(self, color: str) -> None:
        if not self.clock_state:
            return
        self.clock_state[color] += self.clock_state["increment"]
        self.turn_started_at = time.time()

    def _persist_autosave(self) -> None:
        if not self.game_active or self.current_game is None or self.state.result != "*":
            if self.autosave_path.exists():
                self.autosave_path.unlink()
            self.resume_available = False
            return
        payload = {
            "settings": {
                "player_color": self.player_color,
                "bot_mode": self.bot_mode,
                "difficulty": self.difficulty,
                "illegal_personality": self.illegal_personality,
                "theme": self.theme,
                "piece_set": self.piece_set,
                "auto_flip": self.auto_flip,
                "muted": self.muted,
                "time_mode": self.time_mode,
                "custom_minutes": self.custom_minutes,
                "custom_increment": self.custom_increment,
            },
            "current_game": self.current_game,
            "last_ai_summary": self.last_ai_summary,
            "clock": self.clock_state,
        }
        self.autosave_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        self.resume_available = True

    def _load_stats(self) -> dict[str, Any]:
        if not self.stats_path.exists():
            return {"games": 0, "wins": 0, "losses": 0, "draws": 0, "rating": 1200}
        try:
            return json.loads(self.stats_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {"games": 0, "wins": 0, "losses": 0, "draws": 0, "rating": 1200}

    def _update_stats(self) -> None:
        self.stats["games"] = int(self.stats.get("games", 0)) + 1
        rating = int(self.stats.get("rating", 1200))
        bot_rating = {"easy": 900, "medium": 1200, "hard": 1550}[self.difficulty] + (60 if self.bot_mode == "illegal" else 0)
        expected = 1.0 / (1.0 + 10 ** ((bot_rating - rating) / 400.0))
        if self.state.result == "1/2-1/2":
            self.stats["draws"] = int(self.stats.get("draws", 0)) + 1
            score = 0.5
        elif self.state.winner == self.player_color:
            self.stats["wins"] = int(self.stats.get("wins", 0)) + 1
            score = 1.0
        else:
            self.stats["losses"] = int(self.stats.get("losses", 0)) + 1
            score = 0.0
        self.stats["rating"] = round(rating + (24 * (score - expected)))
        self.stats_path.write_text(json.dumps(self.stats, indent=2), encoding="utf-8")

    def _play_sound_for_move(self, move: Move) -> None:
        if self.muted or winsound is None:
            return
        alias = SOUND_ALIASES["move"]
        if self.state.result != "*":
            alias = SOUND_ALIASES["game-over"]
        elif self.state.is_in_check(opposite(move.piece.color)):
            alias = SOUND_ALIASES["check"]
        elif move.captured or move.en_passant:
            alias = SOUND_ALIASES["capture"]
        try:  # pragma: no cover - sound playback depends on Windows host config
            winsound.PlaySound(alias, winsound.SND_ALIAS | winsound.SND_ASYNC | winsound.SND_NODEFAULT)
        except RuntimeError:
            return

    def _build_replay_package(self, record: dict[str, Any], file_name: str) -> dict[str, Any]:
        state = GameState.initial()
        snapshots = [
            {
                "ply": 0,
                "board": self._board_payload_for_state(state),
                "captured": self._captured_payload_for_state(state),
                "moveHistory": [],
                "lastMove": None,
                "checkColor": None,
            }
        ]
        for entry in record.get("moves", []):
            moves = (
                state.generate_illegal_bot_moves(state.turn)
                if entry.get("actor") == "AI" and record.get("bot_mode") == "illegal"
                else state.generate_legal_moves(state.turn)
            )
            move = next(candidate for candidate in moves if candidate.uci() == entry["uci"])
            played = state.play_move(move)
            check_color = None
            if state.is_in_check(WHITE):
                check_color = WHITE
            elif state.is_in_check(BLACK):
                check_color = BLACK
            snapshots.append(
                {
                    "ply": len(state.move_stack),
                    "board": self._board_payload_for_state(state),
                    "captured": self._captured_payload_for_state(state),
                    "moveHistory": state.san_history.copy(),
                    "lastMove": {
                        "from": square_name(played.from_row, played.from_col),
                        "to": square_name(played.to_row, played.to_col),
                        "san": played.san,
                        "illegal": played.is_illegal,
                    },
                    "checkColor": check_color,
                }
            )
        return {
            "file": file_name,
            "title": f"{record.get('player_color', 'white').title()} vs {record.get('bot_mode', 'legal').title()} Bot",
            "result": record.get("result", "*"),
            "outcomeReason": record.get("outcome_reason", ""),
            "pgn": record.get("pgn", ""),
            "analysis": record.get("analysis", {}),
            "snapshots": snapshots,
        }

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
        self._update_stats()
        if self.autosave_path.exists():
            self.autosave_path.unlink()
        self.resume_available = False

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
            "Difficulty": self.difficulty,
            "PlayerColor": str(player_color),
            "OutcomeReason": self.state.outcome_reason or "",
            "TimeMode": self.time_mode,
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
            "analysis": self._build_analysis(),
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

    def _build_analysis(self) -> dict[str, Any]:
        if self.current_game is None:
            return {"bestMoves": [], "blunders": [], "missedTactics": []}

        trial = GameState.initial()
        best_moves: list[dict[str, Any]] = []
        blunders: list[dict[str, Any]] = []
        missed_tactics: list[dict[str, Any]] = []

        for entry in self.current_game["moves"]:
            candidate_moves = (
                trial.generate_illegal_bot_moves(trial.turn)
                if entry.get("actor") == "AI" and self.bot_mode == "illegal"
                else trial.generate_legal_moves(trial.turn)
            )
            if not candidate_moves:
                break

            scores: dict[str, float] = {}
            chosen_move = None
            for candidate in candidate_moves[:24]:
                child = trial.clone()
                played = child.play_move(candidate.clone())
                scores[played.uci()] = self.ai.evaluate_position(child, trial.turn)
                if played.uci() == entry["uci"]:
                    chosen_move = played

            if not scores:
                break

            chosen_score = scores.get(entry["uci"], min(scores.values()))
            best_score = max(scores.values())
            gap = best_score - chosen_score
            label = f"{entry['ply']}. {entry['san']}"
            if gap <= 30:
                best_moves.append({"move": label, "gap": round(gap, 1)})
            elif gap >= 220:
                blunders.append({"move": label, "gap": round(gap, 1)})
            elif gap >= 120:
                missed_tactics.append({"move": label, "gap": round(gap, 1)})

            if chosen_move is None:
                chosen_move = next(move for move in candidate_moves if move.uci() == entry["uci"])
            trial.play_move(chosen_move)

        return {
            "bestMoves": best_moves[:5],
            "blunders": blunders[:5],
            "missedTactics": missed_tactics[:5],
        }

    def _board_payload_for_state(self, game_state: GameState) -> list[list[dict[str, Any] | None]]:
        board_rows: list[list[dict[str, Any] | None]] = []
        for row in range(8):
            row_items: list[dict[str, Any] | None] = []
            for col in range(8):
                piece = game_state.piece_at(row, col)
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

    def _board_payload(self) -> list[list[dict[str, Any] | None]]:
        return self._board_payload_for_state(self.state)

    def _captured_payload_for_state(self, game_state: GameState) -> dict[str, list[dict[str, Any]]]:
        counts = {
            WHITE: {kind: 0 for kind in STARTING_PIECES},
            BLACK: {kind: 0 for kind in STARTING_PIECES},
        }
        for row in range(8):
            for col in range(8):
                piece = game_state.piece_at(row, col)
                if piece is None:
                    continue
                counts[piece.color][piece.kind] += 1

        def missing(color: str) -> list[dict[str, Any]]:
            items: list[dict[str, Any]] = []
            for kind in PIECE_ORDER:
                for _ in range(max(0, STARTING_PIECES[kind] - counts[color][kind])):
                    items.append({"color": color, "kind": kind, "glyph": Piece(color, kind).glyph})
            return items

        return {
            "byWhite": missing(BLACK),
            "byBlack": missing(WHITE),
        }

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

    def _saved_games_payload(self) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for path in sorted(self.records_dir.glob("*.json"), key=lambda item: item.stat().st_mtime, reverse=True)[:12]:
            try:
                record = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            items.append(
                {
                    "file": path.name,
                    "title": f"{record.get('player_color', 'white').title()} vs {record.get('bot_mode', 'legal').title()} Bot",
                    "result": record.get("result", "*"),
                    "finishedAt": record.get("finished_at", ""),
                    "difficulty": record.get("difficulty", "medium"),
                }
            )
        return items

    def _state_payload(self) -> dict[str, Any]:
        self._sync_clock()
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
        clock = None
        if self.clock_state:
            clock = {
                "enabled": True,
                "mode": self.time_mode,
                "white": round(self.clock_state[WHITE], 1),
                "black": round(self.clock_state[BLACK], 1),
                "whiteText": format_clock_seconds(self.clock_state[WHITE]),
                "blackText": format_clock_seconds(self.clock_state[BLACK]),
                "activeColor": self.state.turn if self.game_active and self.state.result == "*" else "",
            }
        banner = None
        if self.state.result != "*":
            banner = {"kind": "result", "text": f"{result_text(self.state.result)} {str(self.state.outcome_reason or '').title()}."}
        elif check_color:
            banner = {"kind": "check", "text": f"Check on {check_color.title()}."}
        elif self.notice:
            banner = {"kind": "info", "text": self.notice}
        return {
            "gameActive": self.game_active,
            "playerColor": self.player_color,
            "botColor": bot_color,
            "botMode": self.bot_mode,
            "difficulty": self.difficulty,
            "illegalPersonality": self.illegal_personality,
            "theme": self.theme,
            "pieceSet": self.piece_set,
            "autoFlip": self.auto_flip,
            "muted": self.muted,
            "timeMode": self.time_mode,
            "customMinutes": self.custom_minutes,
            "customIncrement": self.custom_increment,
            "turn": self.state.turn,
            "board": self._board_payload(),
            "captured": self._captured_payload_for_state(self.state),
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
            "savedGameList": self._saved_games_payload(),
            "learnedLegalGames": self.learning_memory.games_played.get("legal", 0),
            "learnedIllegalGames": self.learning_memory.games_played.get("illegal", 0),
            "lastAiSummary": self.last_ai_summary,
            "banner": banner,
            "clock": clock,
            "stats": self.stats,
            "resumeAvailable": self.resume_available,
            "analysis": self._build_analysis() if self.state.result != "*" and self.current_game else None,
        }


class ChessRequestHandler(BaseHTTPRequestHandler):
    server_version = "ChessPopup/2.0"

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/state":
            self._send_json(self.server.service.get_state())
            return
        if parsed.path in ("/", "/app.html"):
            self._serve_static("chess_popup.html")
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
                    difficulty=str(body.get("difficulty", "medium")).lower(),
                    illegal_personality=str(body.get("illegalPersonality", "standard")).lower(),
                    theme=str(body.get("theme", "classic")).lower(),
                    piece_set=str(body.get("pieceSet", "classic")).lower(),
                    auto_flip=bool(body.get("autoFlip", True)),
                    muted=bool(body.get("muted", False)),
                    time_mode=str(body.get("timeMode", "unlimited")).lower(),
                    custom_minutes=int(body.get("customMinutes", 10)),
                    custom_increment=int(body.get("customIncrement", 0)),
                )
                self._send_json(payload)
                return
            if parsed.path == "/api/resume":
                self._send_json(self.server.service.resume_game())
                return
            if parsed.path == "/api/preferences":
                payload = self.server.service.update_preferences(
                    theme=body.get("theme"),
                    piece_set=body.get("pieceSet"),
                    auto_flip=body.get("autoFlip"),
                    muted=body.get("muted"),
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
            if parsed.path == "/api/undo":
                self._send_json(self.server.service.undo_last_turn())
                return
            if parsed.path == "/api/restart":
                self._send_json(self.server.service.restart_game())
                return
            if parsed.path == "/api/resign":
                self._send_json(self.server.service.resign_game())
                return
            if parsed.path == "/api/draw":
                self._send_json(self.server.service.offer_draw())
                return
            if parsed.path == "/api/hint":
                self._send_json(self.server.service.get_hint())
                return
            if parsed.path == "/api/load-record":
                self._send_json(self.server.service.load_record(str(body.get("file", ""))))
                return
        except ValueError as error:
            self._send_json({"error": str(error)}, status=HTTPStatus.BAD_REQUEST)
            return
        except StopIteration as error:
            self._send_json({"error": f"Server error: {error}"}, status=HTTPStatus.INTERNAL_SERVER_ERROR)
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
    parser.add_argument("--data-dir", default="", help="Optional writable directory for autosaves, stats, and game records.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    project_dir = Path(__file__).resolve().parent
    data_dir = Path(args.data_dir).expanduser().resolve() if args.data_dir else None
    service = ChessService(project_dir, data_dir=data_dir)
    handler_factory = partial(ChessRequestHandler)
    server = ChessHttpServer((args.host, args.port), handler_factory, project_dir, service)
    try:
        actual_port = server.server_address[1]
        print(f"Chess Popup server listening on http://{args.host}:{actual_port}", flush=True)
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
