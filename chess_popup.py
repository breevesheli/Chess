from __future__ import annotations

from datetime import datetime
from pathlib import Path
import json
import queue
import threading
import tkinter as tk
from tkinter import messagebox

from chess_engine import (
    AiCandidate,
    ChessAI,
    GameState,
    LearningMemory,
    Move,
    Piece,
    WHITE,
    BLACK,
    FILES,
    UNICODE_PIECES,
    format_move_pairs,
    opposite,
    square_name,
)


BOARD_MARGIN = 28
SQUARE_SIZE = 72
BOARD_PIXELS = BOARD_MARGIN * 2 + SQUARE_SIZE * 8

DARK_SQUARE = "#202020"
LIGHT_SQUARE = "#f2f2f2"
SELECTED_SQUARE = "#3f6fa3"
LAST_MOVE_DARK = "#826b2b"
LAST_MOVE_LIGHT = "#ccb56b"
CHECK_SQUARE = "#9b2f2f"
BOARD_FRAME = "#0f1a22"
APP_BG = "#13232f"
PANEL_BG = "#173344"
CARD_BG = "#21485d"
TEXT_MAIN = "#edf4f7"
TEXT_SUB = "#b7cbd6"
BUTTON_BG = "#d98f2b"
BUTTON_FG = "#101820"
CAPTURE_RING = "#de4b4b"
MOVE_DOT = "#48b36f"


class ChessPopupApp:
    def __init__(self) -> None:
        self.project_dir = Path(__file__).resolve().parent
        self.records_dir = self.project_dir / "game_records"
        self.records_dir.mkdir(parents=True, exist_ok=True)
        self.learning_path = self.project_dir / "bot_learning.json"

        self.learning_memory = LearningMemory(self.learning_path)
        self.ai = ChessAI(self.learning_memory)

        self.root = tk.Tk()
        self.root.title("Chess Popup")
        self.root.configure(bg=APP_BG)
        self.root.resizable(False, False)

        icon_path = self.project_dir / "chess_popup.ico"
        if icon_path.exists():
            try:
                self.root.iconbitmap(default=str(icon_path))
            except tk.TclError:
                pass

        self.bot_mode_var = tk.StringVar(value="legal")
        self.player_color_var = tk.StringVar(value=WHITE)
        self.status_var = tk.StringVar(value="Choose your settings and press Play.")
        self.thought_var = tk.StringVar(value="The board opens in standard chess setup.")
        self.records_var = tk.StringVar(value="")

        self.state = GameState.initial()
        self.game_active = False
        self.selected_square: tuple[int, int] | None = None
        self.selected_moves: dict[tuple[int, int], list[Move]] = {}
        self.ai_queue: queue.Queue[dict[str, object]] = queue.Queue()
        self.ai_token = 0
        self.ai_thinking = False
        self.current_game: dict[str, object] | None = None

        self._build_ui()
        self._refresh_records_label()
        self._draw_board()
        self._update_move_history()
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    @property
    def player_color(self) -> str:
        return self.player_color_var.get()

    @property
    def bot_color(self) -> str:
        return opposite(self.player_color)

    def _build_ui(self) -> None:
        container = tk.Frame(self.root, bg=APP_BG)
        container.pack(padx=18, pady=18)

        board_shell = tk.Frame(container, bg=BOARD_FRAME, padx=10, pady=10)
        board_shell.grid(row=0, column=0, sticky="n")

        self.board_canvas = tk.Canvas(
            board_shell,
            width=BOARD_PIXELS,
            height=BOARD_PIXELS,
            bg=BOARD_FRAME,
            bd=0,
            highlightthickness=0,
        )
        self.board_canvas.pack()
        self.board_canvas.bind("<Button-1>", self._on_board_click)

        panel = tk.Frame(container, bg=PANEL_BG, width=330, padx=16, pady=16)
        panel.grid(row=0, column=1, padx=(18, 0), sticky="ns")
        panel.grid_propagate(False)

        title = tk.Label(
            panel,
            text="Chess Popup",
            bg=PANEL_BG,
            fg=TEXT_MAIN,
            font=("Bahnschrift SemiBold", 20),
            anchor="w",
        )
        title.pack(fill="x")

        subtitle = tk.Label(
            panel,
            text="A1 is the dark square at the bottom-left.",
            bg=PANEL_BG,
            fg=TEXT_SUB,
            font=("Georgia", 10),
            justify="left",
            anchor="w",
        )
        subtitle.pack(fill="x", pady=(4, 12))

        mode_card = tk.Frame(panel, bg=CARD_BG, padx=12, pady=12)
        mode_card.pack(fill="x")

        tk.Label(
            mode_card,
            text="Bot Mode",
            bg=CARD_BG,
            fg=TEXT_MAIN,
            font=("Bahnschrift SemiBold", 13),
            anchor="w",
        ).pack(fill="x")

        for text, value in (
            ("Legal Bot", "legal"),
            ("Illegal Bot", "illegal"),
        ):
            tk.Radiobutton(
                mode_card,
                text=text,
                value=value,
                variable=self.bot_mode_var,
                bg=CARD_BG,
                fg=TEXT_MAIN,
                activebackground=CARD_BG,
                activeforeground=TEXT_MAIN,
                selectcolor=PANEL_BG,
                font=("Georgia", 11),
                anchor="w",
                highlightthickness=0,
            ).pack(fill="x", pady=3)

        self.play_button = tk.Button(
            panel,
            text="Play",
            command=self._start_game,
            bg=BUTTON_BG,
            fg=BUTTON_FG,
            activebackground="#e2a44a",
            activeforeground=BUTTON_FG,
            relief="flat",
            bd=0,
            padx=14,
            pady=12,
            font=("Bahnschrift SemiBold", 18),
        )
        self.play_button.pack(fill="x", pady=14)

        color_card = tk.Frame(panel, bg=CARD_BG, padx=12, pady=12)
        color_card.pack(fill="x")

        tk.Label(
            color_card,
            text="Play As",
            bg=CARD_BG,
            fg=TEXT_MAIN,
            font=("Bahnschrift SemiBold", 13),
            anchor="w",
        ).pack(fill="x")

        for text, value in (
            ("White Pieces", WHITE),
            ("Black Pieces", BLACK),
        ):
            tk.Radiobutton(
                color_card,
                text=text,
                value=value,
                variable=self.player_color_var,
                bg=CARD_BG,
                fg=TEXT_MAIN,
                activebackground=CARD_BG,
                activeforeground=TEXT_MAIN,
                selectcolor=PANEL_BG,
                font=("Georgia", 11),
                anchor="w",
                highlightthickness=0,
            ).pack(fill="x", pady=3)

        status_card = tk.Frame(panel, bg=CARD_BG, padx=12, pady=12)
        status_card.pack(fill="x", pady=(14, 12))

        tk.Label(
            status_card,
            text="Status",
            bg=CARD_BG,
            fg=TEXT_MAIN,
            font=("Bahnschrift SemiBold", 13),
            anchor="w",
        ).pack(fill="x")

        tk.Label(
            status_card,
            textvariable=self.status_var,
            bg=CARD_BG,
            fg=TEXT_MAIN,
            font=("Georgia", 11),
            justify="left",
            wraplength=278,
            anchor="w",
        ).pack(fill="x", pady=(8, 6))

        tk.Label(
            status_card,
            textvariable=self.thought_var,
            bg=CARD_BG,
            fg=TEXT_SUB,
            font=("Georgia", 10),
            justify="left",
            wraplength=278,
            anchor="w",
        ).pack(fill="x")

        tk.Label(
            panel,
            textvariable=self.records_var,
            bg=PANEL_BG,
            fg=TEXT_SUB,
            font=("Georgia", 10),
            anchor="w",
        ).pack(fill="x", pady=(0, 10))

        history_card = tk.Frame(panel, bg=CARD_BG, padx=12, pady=12)
        history_card.pack(fill="both", expand=True)

        tk.Label(
            history_card,
            text="Game Record",
            bg=CARD_BG,
            fg=TEXT_MAIN,
            font=("Bahnschrift SemiBold", 13),
            anchor="w",
        ).pack(fill="x")

        history_frame = tk.Frame(history_card, bg=CARD_BG)
        history_frame.pack(fill="both", expand=True, pady=(8, 0))

        scrollbar = tk.Scrollbar(history_frame)
        scrollbar.pack(side="right", fill="y")

        self.history_text = tk.Text(
            history_frame,
            width=32,
            height=20,
            bg="#10232f",
            fg=TEXT_MAIN,
            insertbackground=TEXT_MAIN,
            relief="flat",
            bd=0,
            font=("Consolas", 10),
            yscrollcommand=scrollbar.set,
            state="disabled",
            wrap="word",
        )
        self.history_text.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self.history_text.yview)

    def _refresh_records_label(self) -> None:
        game_count = len(list(self.records_dir.glob("*.json")))
        learned_legal = self.learning_memory.games_played.get("legal", 0)
        learned_illegal = self.learning_memory.games_played.get("illegal", 0)
        self.records_var.set(
            f"Saved games: {game_count}   Learned legal games: {learned_legal}   Learned illegal games: {learned_illegal}"
        )

    def _start_game(self) -> None:
        self.ai_token += 1
        self.ai_thinking = False
        self.selected_square = None
        self.selected_moves = {}
        self.state = GameState.initial()
        self.game_active = True

        started_at = datetime.now()
        self.current_game = {
            "id": started_at.strftime("%Y%m%d_%H%M%S"),
            "started_at": started_at.isoformat(timespec="seconds"),
            "player_color": self.player_color,
            "bot_color": self.bot_color,
            "bot_mode": self.bot_mode_var.get(),
            "moves": [],
            "ai_learning_samples": [],
            "ai_decisions": [],
        }

        if self.player_color == WHITE:
            self.status_var.set("Your move as White.")
        else:
            self.status_var.set("You are Black. The bot opens as White.")

        if self.bot_mode_var.get() == "legal":
            self.thought_var.set("Legal Bot will only choose rule-valid chess moves.")
        else:
            self.thought_var.set("Illegal Bot may bend movement rules without using king-capture glitches.")

        self._draw_board()
        self._update_move_history()

        if self.player_color == BLACK:
            self.root.after(250, self._schedule_ai_turn)

    def _current_player_moves(self) -> List[Move]:
        return self.state.generate_legal_moves(self.player_color)

    def _on_board_click(self, event: tk.Event) -> None:
        square = self._event_to_square(event)
        if square is None:
            return
        if not self.game_active or self.ai_thinking or self.state.result != "*" or self.state.turn != self.player_color:
            return

        row, col = square
        piece = self.state.piece_at(row, col)

        if self.selected_square and square in self.selected_moves:
            chosen_move = self._choose_move_for_destination(square)
            if chosen_move is not None:
                self._commit_move(chosen_move, actor="Human")
            return

        if piece and piece.color == self.player_color:
            self.selected_square = square
            self.selected_moves = self._moves_from_square(square)
        else:
            self.selected_square = None
            self.selected_moves = {}
        self._draw_board()

    def _moves_from_square(self, square: tuple[int, int]) -> dict[tuple[int, int], list[Move]]:
        row, col = square
        destinations: dict[tuple[int, int], list[Move]] = {}
        for move in self._current_player_moves():
            if move.from_row == row and move.from_col == col:
                destinations.setdefault((move.to_row, move.to_col), []).append(move)
        return destinations

    def _choose_move_for_destination(self, square: tuple[int, int]) -> Move | None:
        options = self.selected_moves.get(square, [])
        if not options:
            return None
        if len(options) == 1:
            return options[0]
        return self._show_promotion_dialog(options)

    def _show_promotion_dialog(self, options: list[Move]) -> Move | None:
        choice: dict[str, Move | None] = {"move": None}
        dialog = tk.Toplevel(self.root)
        dialog.title("Choose Promotion")
        dialog.configure(bg=PANEL_BG)
        dialog.resizable(False, False)
        dialog.transient(self.root)
        dialog.grab_set()

        tk.Label(
            dialog,
            text="Promote your pawn to:",
            bg=PANEL_BG,
            fg=TEXT_MAIN,
            font=("Bahnschrift SemiBold", 14),
            padx=18,
            pady=14,
        ).pack(fill="x")

        for promotion in ("queen", "rook", "bishop", "knight"):
            move = next((option for option in options if option.promotion == promotion), None)
            if move is None:
                continue
            tk.Button(
                dialog,
                text=f"{UNICODE_PIECES[(self.player_color, promotion)]}   {promotion.title()}",
                command=lambda selected=move: self._finish_promotion_pick(dialog, choice, selected),
                bg=BUTTON_BG,
                fg=BUTTON_FG,
                activebackground="#e2a44a",
                activeforeground=BUTTON_FG,
                relief="flat",
                bd=0,
                font=("Georgia", 13),
                padx=12,
                pady=8,
            ).pack(fill="x", padx=18, pady=6)

        dialog.wait_window()
        return choice["move"]

    def _finish_promotion_pick(self, dialog: tk.Toplevel, choice: dict[str, Move | None], move: Move) -> None:
        choice["move"] = move
        dialog.destroy()

    def _schedule_ai_turn(self) -> None:
        if not self.game_active or self.state.result != "*" or self.state.turn != self.bot_color:
            return
        self.ai_thinking = True
        token = self.ai_token
        snapshot = self.state.clone()
        bot_color = self.bot_color
        bot_mode = self.bot_mode_var.get()
        self.status_var.set(f"{bot_mode.title()} Bot is calculating for {bot_color.title()}...")
        worker = threading.Thread(
            target=self._run_ai_worker,
            args=(token, snapshot, bot_color, bot_mode),
            daemon=True,
        )
        worker.start()
        self.root.after(120, self._poll_ai_queue)

    def _run_ai_worker(self, token: int, snapshot: GameState, color: str, mode: str) -> None:
        try:
            decision = self.ai.choose_move(snapshot, color, mode)
            self.ai_queue.put({"token": token, "decision": decision, "mode": mode})
        except Exception as error:  # pragma: no cover - surfaced to UI
            self.ai_queue.put({"token": token, "error": str(error)})

    def _poll_ai_queue(self) -> None:
        try:
            payload = self.ai_queue.get_nowait()
        except queue.Empty:
            if self.ai_thinking:
                self.root.after(120, self._poll_ai_queue)
            return

        if payload.get("token") != self.ai_token:
            if self.ai_thinking:
                self.root.after(120, self._poll_ai_queue)
            return

        self.ai_thinking = False
        if "error" in payload:
            self.status_var.set("The AI hit an error and the game was paused.")
            self.thought_var.set(str(payload["error"]))
            return

        decision = payload.get("decision")
        if decision is None:
            self.state.refresh_outcome()
            self._finish_game()
            return

        assert isinstance(decision, object)
        self._commit_ai_decision(payload["mode"], decision)

    def _commit_ai_decision(self, mode: object, decision: object) -> None:
        if not hasattr(decision, "chosen"):
            self.status_var.set("The AI did not return a valid move.")
            return

        ai_decision = decision
        chosen = ai_decision.chosen
        played_move = self._commit_move(chosen.move, actor="AI", ai_candidate=chosen, ai_decision=ai_decision)
        if played_move is None:
            return

        top_choices = []
        for candidate in ai_decision.candidates[:3]:
            top_choices.append(
                {
                    "uci": candidate.move.uci(),
                    "probability": round(candidate.probability, 4),
                    "score": round(candidate.total_score, 2),
                }
            )

        assert self.current_game is not None
        self.current_game["ai_learning_samples"].append(chosen.features)
        self.current_game["ai_decisions"].append(
            {
                "move": played_move.san,
                "uci": played_move.uci(),
                "mode": str(mode),
                "estimated_win_probability": round(chosen.probability, 4),
                "search_depth": ai_decision.depth,
                "top_choices": top_choices,
            }
        )

        if self.state.result == "*":
            self.status_var.set(f"Your move as {self.player_color.title()}.")
            self.thought_var.set(
                f"{str(mode).title()} Bot played {played_move.san} with an estimated {chosen.probability * 100:.1f}% win chance."
            )

    def _commit_move(
        self,
        move: Move,
        actor: str,
        ai_candidate: AiCandidate | None = None,
        ai_decision: object | None = None,
    ) -> Move | None:
        try:
            played_move = self.state.play_move(move)
        except ValueError as error:
            self.status_var.set("That move could not be applied.")
            self.thought_var.set(str(error))
            self.selected_square = None
            self.selected_moves = {}
            self._draw_board()
            return None

        self.selected_square = None
        self.selected_moves = {}
        self._record_move(played_move, actor, ai_candidate, ai_decision)
        self._draw_board()
        self._update_move_history()

        if self.state.result != "*":
            self._finish_game()
            return played_move

        if actor == "Human":
            self.status_var.set(f"{self.bot_mode_var.get().title()} Bot is thinking...")
            self.thought_var.set(f"You played {played_move.san}.")
            self.root.after(220, self._schedule_ai_turn)
        return played_move

    def _record_move(
        self,
        played_move: Move,
        actor: str,
        ai_candidate: AiCandidate | None,
        ai_decision: object | None,
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
            if ai_decision is not None and hasattr(ai_decision, "depth"):
                entry["search_depth"] = ai_decision.depth
        self.current_game["moves"].append(entry)

    def _finish_game(self) -> None:
        self.game_active = False
        self.ai_thinking = False
        result_line = self._result_text()
        self.status_var.set(result_line)
        self.thought_var.set(f"Game saved in algebraic notation. Reason: {self.state.outcome_reason}.")
        self._save_game_record()
        messagebox.showinfo("Chess Popup", result_line)

    def _result_text(self) -> str:
        if self.state.result == "1-0":
            return "White wins."
        if self.state.result == "0-1":
            return "Black wins."
        return "Draw."

    def _save_game_record(self) -> None:
        if self.current_game is None:
            return

        finished_at = datetime.now()
        player_color = self.current_game["player_color"]
        bot_color = self.current_game["bot_color"]
        white_name = "You" if player_color == WHITE else f"{self.bot_mode_var.get().title()} Bot"
        black_name = "You" if player_color == BLACK else f"{self.bot_mode_var.get().title()} Bot"

        headers = {
            "Event": "Chess Popup",
            "Site": "Local Desktop",
            "Date": finished_at.strftime("%Y.%m.%d"),
            "White": white_name,
            "Black": black_name,
            "Result": self.state.result,
            "BotMode": self.bot_mode_var.get(),
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
        }

        stem = f"{self.current_game['id']}_{self.bot_mode_var.get()}_{self.player_color_var.get()}"
        json_path = self.records_dir / f"{stem}.json"
        pgn_path = self.records_dir / f"{stem}.pgn"
        json_path.write_text(json.dumps(record, indent=2), encoding="utf-8")
        pgn_path.write_text(pgn_text, encoding="utf-8")

        ai_samples = self.current_game.get("ai_learning_samples", [])
        bot_outcome = 0
        if self.state.result == "1/2-1/2":
            bot_outcome = 0
        elif self.state.winner == bot_color:
            bot_outcome = 1
        else:
            bot_outcome = -1
        self.learning_memory.update(self.bot_mode_var.get(), list(ai_samples), bot_outcome)
        self._refresh_records_label()

    def _update_move_history(self) -> None:
        lines = []
        for index in range(0, len(self.state.san_history), 2):
            white_move = self.state.san_history[index]
            black_move = self.state.san_history[index + 1] if index + 1 < len(self.state.san_history) else ""
            move_number = (index // 2) + 1
            lines.append(f"{move_number:>2}. {white_move:<18} {black_move}".rstrip())
        text = "\n".join(lines) if lines else "No moves yet."
        self.history_text.configure(state="normal")
        self.history_text.delete("1.0", "end")
        self.history_text.insert("1.0", text)
        self.history_text.configure(state="disabled")

    def _event_to_square(self, event: tk.Event) -> tuple[int, int] | None:
        board_x = event.x - BOARD_MARGIN
        board_y = event.y - BOARD_MARGIN
        if board_x < 0 or board_y < 0:
            return None
        col = board_x // SQUARE_SIZE
        row = board_y // SQUARE_SIZE
        if not (0 <= row < 8 and 0 <= col < 8):
            return None
        return int(row), int(col)

    def _square_bounds(self, row: int, col: int) -> tuple[int, int, int, int]:
        x0 = BOARD_MARGIN + (col * SQUARE_SIZE)
        y0 = BOARD_MARGIN + (row * SQUARE_SIZE)
        return x0, y0, x0 + SQUARE_SIZE, y0 + SQUARE_SIZE

    def _square_center(self, row: int, col: int) -> tuple[int, int]:
        x0, y0, x1, y1 = self._square_bounds(row, col)
        return (x0 + x1) // 2, (y0 + y1) // 2

    def _draw_board(self) -> None:
        self.board_canvas.delete("all")
        self.board_canvas.create_rectangle(0, 0, BOARD_PIXELS, BOARD_PIXELS, fill=BOARD_FRAME, outline=BOARD_FRAME)

        last_move_squares = set()
        if self.state.last_move is not None:
            last_move_squares = {
                (self.state.last_move.from_row, self.state.last_move.from_col),
                (self.state.last_move.to_row, self.state.last_move.to_col),
            }

        checked_king = None
        if self.state.is_in_check(self.state.turn):
            checked_king = self.state.king_position(self.state.turn)

        for row in range(8):
            for col in range(8):
                dark = (row + col) % 2 == 1
                fill = DARK_SQUARE if dark else LIGHT_SQUARE
                if (row, col) in last_move_squares:
                    fill = LAST_MOVE_DARK if dark else LAST_MOVE_LIGHT
                if self.selected_square == (row, col):
                    fill = SELECTED_SQUARE
                if checked_king == (row, col):
                    fill = CHECK_SQUARE
                x0, y0, x1, y1 = self._square_bounds(row, col)
                self.board_canvas.create_rectangle(x0, y0, x1, y1, fill=fill, outline="")

        for destination, options in self.selected_moves.items():
            row, col = destination
            center_x, center_y = self._square_center(row, col)
            is_capture = any(move.captured or move.en_passant for move in options)
            if is_capture:
                self.board_canvas.create_oval(
                    center_x - 23,
                    center_y - 23,
                    center_x + 23,
                    center_y + 23,
                    outline=CAPTURE_RING,
                    width=4,
                )
            else:
                self.board_canvas.create_oval(
                    center_x - 10,
                    center_y - 10,
                    center_x + 10,
                    center_y + 10,
                    fill=MOVE_DOT,
                    outline=MOVE_DOT,
                )

        for index, file_letter in enumerate(FILES):
            x = BOARD_MARGIN + (index * SQUARE_SIZE) + (SQUARE_SIZE // 2)
            y = BOARD_MARGIN + (8 * SQUARE_SIZE) + 16
            self.board_canvas.create_text(x, y, text=file_letter, fill=TEXT_SUB, font=("Consolas", 11))

        for rank_offset in range(8):
            rank_number = 8 - rank_offset
            x = BOARD_MARGIN - 14
            y = BOARD_MARGIN + (rank_offset * SQUARE_SIZE) + (SQUARE_SIZE // 2)
            self.board_canvas.create_text(x, y, text=str(rank_number), fill=TEXT_SUB, font=("Consolas", 11))

        for row in range(8):
            for col in range(8):
                piece = self.state.piece_at(row, col)
                if piece is None:
                    continue
                center_x, center_y = self._square_center(row, col)
                if piece.color == WHITE:
                    shadow_color = "#111111"
                    main_color = "#f7f4eb"
                else:
                    shadow_color = "#f0e1c2"
                    main_color = "#0e1820"
                self.board_canvas.create_text(
                    center_x + 2,
                    center_y + 2,
                    text=piece.glyph,
                    fill=shadow_color,
                    font=("Segoe UI Symbol", 44),
                )
                self.board_canvas.create_text(
                    center_x,
                    center_y,
                    text=piece.glyph,
                    fill=main_color,
                    font=("Segoe UI Symbol", 44),
                )

        self.board_canvas.create_rectangle(
            BOARD_MARGIN,
            BOARD_MARGIN,
            BOARD_MARGIN + (8 * SQUARE_SIZE),
            BOARD_MARGIN + (8 * SQUARE_SIZE),
            outline="#d9d4c8",
            width=2,
        )

    def _on_close(self) -> None:
        self.ai_token += 1
        self.root.destroy()

    def run(self) -> None:
        self.root.mainloop()


def main() -> None:
    app = ChessPopupApp()
    app.run()


if __name__ == "__main__":
    main()
