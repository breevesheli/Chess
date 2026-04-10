from __future__ import annotations

import argparse
import json
import threading
from datetime import datetime
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from chess_engine import (
    AiCandidate,
    AiDecision,
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


def parse_square(name: str) -> tuple[int, int]:
    text = name.strip().lower()
    if len(text) != 2 or text[0] not in FILES or text[1] not in "12345678":
        raise ValueError(f"Invalid square: {name}")
    col = FILES.index(text[0])
    row = 8 - int(text[1])
    return row, col


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
            self._record_move(played, actor="AI", ai_candidate=chosen, ai_decision=decision)
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
