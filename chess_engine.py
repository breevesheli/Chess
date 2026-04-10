from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import json
import math
from typing import Dict, List, Optional, Tuple


WHITE = "white"
BLACK = "black"
FILES = "abcdefgh"
BOARD_SIZE = 8

PIECE_TO_SAN = {
    "king": "K",
    "queen": "Q",
    "rook": "R",
    "bishop": "B",
    "knight": "N",
    "pawn": "",
}

PIECE_TO_FEN = {
    "king": "K",
    "queen": "Q",
    "rook": "R",
    "bishop": "B",
    "knight": "N",
    "pawn": "P",
}

UNICODE_PIECES = {
    (WHITE, "king"): "\u2654",
    (WHITE, "queen"): "\u2655",
    (WHITE, "rook"): "\u2656",
    (WHITE, "bishop"): "\u2657",
    (WHITE, "knight"): "\u2658",
    (WHITE, "pawn"): "\u2659",
    (BLACK, "king"): "\u265A",
    (BLACK, "queen"): "\u265B",
    (BLACK, "rook"): "\u265C",
    (BLACK, "bishop"): "\u265D",
    (BLACK, "knight"): "\u265E",
    (BLACK, "pawn"): "\u265F",
}

MATERIAL_VALUES = {
    "pawn": 100,
    "knight": 320,
    "bishop": 330,
    "rook": 500,
    "queen": 900,
    "king": 20000,
}

PIECE_SQUARE_TABLES = {
    "pawn": [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [5, 5, 10, 25, 25, 10, 5, 5],
        [0, 0, 0, 20, 20, 0, 0, 0],
        [5, -5, -10, 0, 0, -10, -5, 5],
        [5, 10, 10, -20, -20, 10, 10, 5],
        [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    "knight": [
        [-50, -40, -30, -30, -30, -30, -40, -50],
        [-40, -20, 0, 5, 5, 0, -20, -40],
        [-30, 5, 10, 15, 15, 10, 5, -30],
        [-30, 0, 15, 20, 20, 15, 0, -30],
        [-30, 5, 15, 20, 20, 15, 5, -30],
        [-30, 0, 10, 15, 15, 10, 0, -30],
        [-40, -20, 0, 0, 0, 0, -20, -40],
        [-50, -40, -30, -30, -30, -30, -40, -50],
    ],
    "bishop": [
        [-20, -10, -10, -10, -10, -10, -10, -20],
        [-10, 5, 0, 0, 0, 0, 5, -10],
        [-10, 10, 10, 10, 10, 10, 10, -10],
        [-10, 0, 10, 10, 10, 10, 0, -10],
        [-10, 5, 5, 10, 10, 5, 5, -10],
        [-10, 0, 5, 10, 10, 5, 0, -10],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-20, -10, -10, -10, -10, -10, -10, -20],
    ],
    "rook": [
        [0, 0, 0, 5, 5, 0, 0, 0],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [-5, 0, 0, 0, 0, 0, 0, -5],
        [5, 10, 10, 10, 10, 10, 10, 5],
        [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    "queen": [
        [-20, -10, -10, -5, -5, -10, -10, -20],
        [-10, 0, 0, 0, 0, 0, 0, -10],
        [-10, 0, 5, 5, 5, 5, 0, -10],
        [-5, 0, 5, 5, 5, 5, 0, -5],
        [0, 0, 5, 5, 5, 5, 0, -5],
        [-10, 5, 5, 5, 5, 5, 0, -10],
        [-10, 0, 5, 0, 0, 0, 0, -10],
        [-20, -10, -10, -5, -5, -10, -10, -20],
    ],
    "king": [
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-30, -40, -40, -50, -50, -40, -40, -30],
        [-20, -30, -30, -40, -40, -30, -30, -20],
        [-10, -20, -20, -20, -20, -20, -20, -10],
        [20, 20, 0, 0, 0, 0, 20, 20],
        [20, 30, 10, 0, 0, 10, 30, 20],
    ],
}

SLIDER_DIRECTIONS = {
    "bishop": [(-1, -1), (-1, 1), (1, -1), (1, 1)],
    "rook": [(-1, 0), (1, 0), (0, -1), (0, 1)],
    "queen": [(-1, -1), (-1, 1), (1, -1), (1, 1), (-1, 0), (1, 0), (0, -1), (0, 1)],
}

KNIGHT_OFFSETS = [
    (-2, -1),
    (-2, 1),
    (-1, -2),
    (-1, 2),
    (1, -2),
    (1, 2),
    (2, -1),
    (2, 1),
]

KING_OFFSETS = [
    (-1, -1),
    (-1, 0),
    (-1, 1),
    (0, -1),
    (0, 1),
    (1, -1),
    (1, 0),
    (1, 1),
]


def opposite(color: str) -> str:
    return BLACK if color == WHITE else WHITE


def in_bounds(row: int, col: int) -> bool:
    return 0 <= row < BOARD_SIZE and 0 <= col < BOARD_SIZE


def square_name(row: int, col: int) -> str:
    return f"{FILES[col]}{BOARD_SIZE - row}"


def pgn_result_for_winner(winner: Optional[str]) -> str:
    if winner == WHITE:
        return "1-0"
    if winner == BLACK:
        return "0-1"
    return "1/2-1/2"


def format_move_pairs(moves: List[str], result: str = "*") -> str:
    lines: List[str] = []
    for index in range(0, len(moves), 2):
        white_move = moves[index]
        black_move = moves[index + 1] if index + 1 < len(moves) else ""
        move_number = (index // 2) + 1
        chunk = f"{move_number}. {white_move}"
        if black_move:
            chunk += f" {black_move}"
        lines.append(chunk)
    body = " ".join(lines).strip()
    if result and result != "*":
        return f"{body} {result}".strip()
    return body


@dataclass(frozen=True)
class Piece:
    color: str
    kind: str

    @property
    def glyph(self) -> str:
        return UNICODE_PIECES[(self.color, self.kind)]


@dataclass
class Move:
    from_row: int
    from_col: int
    to_row: int
    to_col: int
    piece: Piece
    captured: Optional[Piece] = None
    promotion: Optional[str] = None
    castle: Optional[str] = None
    en_passant: bool = False
    is_illegal: bool = False
    note: str = ""
    san: str = ""

    def clone(self) -> "Move":
        return Move(
            from_row=self.from_row,
            from_col=self.from_col,
            to_row=self.to_row,
            to_col=self.to_col,
            piece=self.piece,
            captured=self.captured,
            promotion=self.promotion,
            castle=self.castle,
            en_passant=self.en_passant,
            is_illegal=self.is_illegal,
            note=self.note,
            san=self.san,
        )

    def action_key(self) -> Tuple[int, int, int, int, Optional[str], Optional[str], bool]:
        return (
            self.from_row,
            self.from_col,
            self.to_row,
            self.to_col,
            self.promotion,
            self.castle,
            self.en_passant,
        )

    def uci(self) -> str:
        promo = ""
        if self.promotion:
            promo = PIECE_TO_FEN[self.promotion].lower()
        return f"{square_name(self.from_row, self.from_col)}{square_name(self.to_row, self.to_col)}{promo}"


@dataclass
class AiCandidate:
    move: Move
    probability: float
    total_score: float
    raw_score: float
    learned_bias: float
    features: List[str]


@dataclass
class AiDecision:
    chosen: AiCandidate
    candidates: List[AiCandidate]
    depth: int


@dataclass
class GameState:
    board: List[List[Optional[Piece]]] = field(default_factory=lambda: [[None for _ in range(BOARD_SIZE)] for _ in range(BOARD_SIZE)])
    turn: str = WHITE
    castling_rights: Dict[str, Dict[str, bool]] = field(
        default_factory=lambda: {
            WHITE: {"king": True, "queen": True},
            BLACK: {"king": True, "queen": True},
        }
    )
    en_passant_target: Optional[Tuple[int, int]] = None
    halfmove_clock: int = 0
    fullmove_number: int = 1
    move_stack: List[Move] = field(default_factory=list)
    san_history: List[str] = field(default_factory=list)
    position_counts: Dict[str, int] = field(default_factory=dict)
    result: str = "*"
    winner: Optional[str] = None
    outcome_reason: Optional[str] = None
    last_move: Optional[Move] = None

    @classmethod
    def initial(cls) -> "GameState":
        state = cls()
        state.setup_standard_board()
        return state

    @classmethod
    def empty(cls) -> "GameState":
        return cls()

    def setup_standard_board(self) -> None:
        self.board = [[None for _ in range(BOARD_SIZE)] for _ in range(BOARD_SIZE)]
        back_rank = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"]
        for col, kind in enumerate(back_rank):
            self.board[0][col] = Piece(BLACK, kind)
            self.board[7][col] = Piece(WHITE, kind)
        for col in range(BOARD_SIZE):
            self.board[1][col] = Piece(BLACK, "pawn")
            self.board[6][col] = Piece(WHITE, "pawn")
        self.turn = WHITE
        self.castling_rights = {
            WHITE: {"king": True, "queen": True},
            BLACK: {"king": True, "queen": True},
        }
        self.en_passant_target = None
        self.halfmove_clock = 0
        self.fullmove_number = 1
        self.move_stack = []
        self.san_history = []
        self.position_counts = {}
        self.result = "*"
        self.winner = None
        self.outcome_reason = None
        self.last_move = None
        self.record_position()

    def clone(self) -> "GameState":
        return GameState(
            board=[row.copy() for row in self.board],
            turn=self.turn,
            castling_rights={
                WHITE: self.castling_rights[WHITE].copy(),
                BLACK: self.castling_rights[BLACK].copy(),
            },
            en_passant_target=self.en_passant_target,
            halfmove_clock=self.halfmove_clock,
            fullmove_number=self.fullmove_number,
            move_stack=[move.clone() for move in self.move_stack],
            san_history=self.san_history.copy(),
            position_counts=self.position_counts.copy(),
            result=self.result,
            winner=self.winner,
            outcome_reason=self.outcome_reason,
            last_move=self.last_move.clone() if self.last_move else None,
        )

    def piece_at(self, row: int, col: int) -> Optional[Piece]:
        return self.board[row][col]

    def set_piece(self, row: int, col: int, piece: Optional[Piece]) -> None:
        self.board[row][col] = piece

    def board_key(self) -> str:
        chunks: List[str] = []
        for row in self.board:
            empty_count = 0
            row_tokens: List[str] = []
            for piece in row:
                if piece is None:
                    empty_count += 1
                    continue
                if empty_count:
                    row_tokens.append(str(empty_count))
                    empty_count = 0
                fen_letter = PIECE_TO_FEN[piece.kind]
                row_tokens.append(fen_letter if piece.color == WHITE else fen_letter.lower())
            if empty_count:
                row_tokens.append(str(empty_count))
            chunks.append("".join(row_tokens) or "8")
        return "/".join(chunks)

    def position_key(self) -> str:
        castling = []
        if self.castling_rights[WHITE]["king"]:
            castling.append("K")
        if self.castling_rights[WHITE]["queen"]:
            castling.append("Q")
        if self.castling_rights[BLACK]["king"]:
            castling.append("k")
        if self.castling_rights[BLACK]["queen"]:
            castling.append("q")
        castling_text = "".join(castling) or "-"
        en_passant = "-"
        if self.en_passant_target:
            en_passant = square_name(*self.en_passant_target)
        turn_token = "w" if self.turn == WHITE else "b"
        return f"{self.board_key()} {turn_token} {castling_text} {en_passant}"

    def record_position(self) -> None:
        key = self.position_key()
        self.position_counts[key] = self.position_counts.get(key, 0) + 1

    def king_position(self, color: str) -> Optional[Tuple[int, int]]:
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                piece = self.board[row][col]
                if piece and piece.color == color and piece.kind == "king":
                    return row, col
        return None

    def is_square_attacked(self, row: int, col: int, by_color: str) -> bool:
        pawn_direction = -1 if by_color == WHITE else 1
        pawn_row = row - pawn_direction
        for pawn_col in (col - 1, col + 1):
            if in_bounds(pawn_row, pawn_col):
                piece = self.board[pawn_row][pawn_col]
                if piece and piece.color == by_color and piece.kind == "pawn":
                    return True

        for delta_row, delta_col in KNIGHT_OFFSETS:
            check_row = row + delta_row
            check_col = col + delta_col
            if not in_bounds(check_row, check_col):
                continue
            piece = self.board[check_row][check_col]
            if piece and piece.color == by_color and piece.kind == "knight":
                return True

        for delta_row, delta_col in KING_OFFSETS:
            check_row = row + delta_row
            check_col = col + delta_col
            if not in_bounds(check_row, check_col):
                continue
            piece = self.board[check_row][check_col]
            if piece and piece.color == by_color and piece.kind == "king":
                return True

        for kind, directions in SLIDER_DIRECTIONS.items():
            for delta_row, delta_col in directions:
                check_row = row + delta_row
                check_col = col + delta_col
                while in_bounds(check_row, check_col):
                    piece = self.board[check_row][check_col]
                    if piece is None:
                        check_row += delta_row
                        check_col += delta_col
                        continue
                    if piece.color != by_color:
                        break
                    if piece.kind == kind or piece.kind == "queen":
                        return True
                    break
        return False

    def is_in_check(self, color: str) -> bool:
        king_square = self.king_position(color)
        if king_square is None:
            return False
        return self.is_square_attacked(king_square[0], king_square[1], opposite(color))

    def can_castle(self, color: str, side: str) -> bool:
        if not self.castling_rights[color][side]:
            return False
        row = 7 if color == WHITE else 0
        king = self.board[row][4]
        if king is None or king.kind != "king" or king.color != color:
            return False
        if side == "king":
            rook_col = 7
            between = [5, 6]
            safe = [4, 5, 6]
        else:
            rook_col = 0
            between = [1, 2, 3]
            safe = [4, 3, 2]
        rook = self.board[row][rook_col]
        if rook is None or rook.kind != "rook" or rook.color != color:
            return False
        for col in between:
            if self.board[row][col] is not None:
                return False
        for col in safe:
            if self.is_square_attacked(row, col, opposite(color)):
                return False
        return True

    def generate_pseudo_legal_moves(self, color: str) -> List[Move]:
        moves: List[Move] = []
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                piece = self.board[row][col]
                if piece is None or piece.color != color:
                    continue
                if piece.kind == "pawn":
                    direction = -1 if color == WHITE else 1
                    start_row = 6 if color == WHITE else 1
                    promotion_row = 0 if color == WHITE else 7
                    one_step_row = row + direction
                    if in_bounds(one_step_row, col) and self.board[one_step_row][col] is None:
                        if one_step_row == promotion_row:
                            for promotion in ("queen", "rook", "bishop", "knight"):
                                moves.append(Move(row, col, one_step_row, col, piece, promotion=promotion))
                        else:
                            moves.append(Move(row, col, one_step_row, col, piece))
                        two_step_row = row + (2 * direction)
                        if row == start_row and self.board[two_step_row][col] is None:
                            moves.append(Move(row, col, two_step_row, col, piece))
                    for capture_col in (col - 1, col + 1):
                        capture_row = row + direction
                        if not in_bounds(capture_row, capture_col):
                            continue
                        target = self.board[capture_row][capture_col]
                        if target and target.color != color and target.kind != "king":
                            if capture_row == promotion_row:
                                for promotion in ("queen", "rook", "bishop", "knight"):
                                    moves.append(Move(row, col, capture_row, capture_col, piece, captured=target, promotion=promotion))
                            else:
                                moves.append(Move(row, col, capture_row, capture_col, piece, captured=target))
                        if self.en_passant_target == (capture_row, capture_col):
                            adjacent = self.board[row][capture_col]
                            if adjacent and adjacent.color != color and adjacent.kind == "pawn":
                                moves.append(
                                    Move(
                                        row,
                                        col,
                                        capture_row,
                                        capture_col,
                                        piece,
                                        captured=adjacent,
                                        en_passant=True,
                                    )
                                )
                elif piece.kind == "knight":
                    for delta_row, delta_col in KNIGHT_OFFSETS:
                        target_row = row + delta_row
                        target_col = col + delta_col
                        if not in_bounds(target_row, target_col):
                            continue
                        target = self.board[target_row][target_col]
                        if target and (target.color == color or target.kind == "king"):
                            continue
                        moves.append(Move(row, col, target_row, target_col, piece, captured=target))
                elif piece.kind in SLIDER_DIRECTIONS:
                    for delta_row, delta_col in SLIDER_DIRECTIONS[piece.kind]:
                        target_row = row + delta_row
                        target_col = col + delta_col
                        while in_bounds(target_row, target_col):
                            target = self.board[target_row][target_col]
                            if target is None:
                                moves.append(Move(row, col, target_row, target_col, piece))
                            else:
                                if target.color != color and target.kind != "king":
                                    moves.append(Move(row, col, target_row, target_col, piece, captured=target))
                                break
                            target_row += delta_row
                            target_col += delta_col
                elif piece.kind == "king":
                    for delta_row, delta_col in KING_OFFSETS:
                        target_row = row + delta_row
                        target_col = col + delta_col
                        if not in_bounds(target_row, target_col):
                            continue
                        target = self.board[target_row][target_col]
                        if target and (target.color == color or target.kind == "king"):
                            continue
                        moves.append(Move(row, col, target_row, target_col, piece, captured=target))
                    if self.can_castle(color, "king"):
                        moves.append(Move(row, col, row, 6, piece, castle="king"))
                    if self.can_castle(color, "queen"):
                        moves.append(Move(row, col, row, 2, piece, castle="queen"))
        return moves

    def generate_legal_moves(self, color: str) -> List[Move]:
        legal_moves: List[Move] = []
        for move in self.generate_pseudo_legal_moves(color):
            trial = self.clone()
            trial.apply_move(move.clone())
            if not trial.is_in_check(color):
                legal_moves.append(move)
        return legal_moves

    def _generate_slider_phase_moves(
        self,
        color: str,
        seen: set[Tuple[int, int, int, int, Optional[str], Optional[str], bool]],
    ) -> List[Move]:
        extras: List[Move] = []
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                piece = self.board[row][col]
                if piece is None or piece.color != color or piece.kind not in ("bishop", "rook", "queen"):
                    continue
                for delta_row, delta_col in SLIDER_DIRECTIONS[piece.kind]:
                    target_row = row + delta_row
                    target_col = col + delta_col
                    while in_bounds(target_row, target_col):
                        target = self.board[target_row][target_col]
                        if target and target.color == color:
                            target_row += delta_row
                            target_col += delta_col
                            continue
                        if target and target.kind == "king":
                            break
                        move = Move(
                            row,
                            col,
                            target_row,
                            target_col,
                            piece,
                            captured=target,
                            is_illegal=True,
                            note="slides through blockers",
                        )
                        key = move.action_key()
                        if key not in seen:
                            seen.add(key)
                            extras.append(move)
                        target_row += delta_row
                        target_col += delta_col
        return extras

    def _generate_rebel_pawn_moves(
        self,
        color: str,
        seen: set[Tuple[int, int, int, int, Optional[str], Optional[str], bool]],
    ) -> List[Move]:
        extras: List[Move] = []
        backward = 1 if color == WHITE else -1
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                piece = self.board[row][col]
                if piece is None or piece.color != color or piece.kind != "pawn":
                    continue
                for delta_row, delta_col, note in (
                    (0, -1, "shifts sideways"),
                    (0, 1, "shifts sideways"),
                    (backward, 0, "steps backward"),
                ):
                    target_row = row + delta_row
                    target_col = col + delta_col
                    if not in_bounds(target_row, target_col):
                        continue
                    target = self.board[target_row][target_col]
                    if target and (target.color == color or target.kind == "king"):
                        continue
                    move = Move(
                        row,
                        col,
                        target_row,
                        target_col,
                        piece,
                        captured=target,
                        is_illegal=True,
                        note=note,
                    )
                    key = move.action_key()
                    if key not in seen:
                        seen.add(key)
                        extras.append(move)
        return extras

    def generate_illegal_bot_moves(self, color: str) -> List[Move]:
        legal = self.generate_legal_moves(color)
        seen = {move.action_key() for move in legal}
        combined = [move.clone() for move in legal]
        for move in self.generate_pseudo_legal_moves(color):
            key = move.action_key()
            if key in seen:
                continue
            move.is_illegal = True
            if not move.note:
                move.note = "ignores king safety"
            seen.add(key)
            combined.append(move)
        combined.extend(self._generate_slider_phase_moves(color, seen))
        combined.extend(self._generate_rebel_pawn_moves(color, seen))
        return combined

    def apply_move(self, move: Move) -> None:
        piece = self.board[move.from_row][move.from_col]
        if piece is None:
            raise ValueError("No piece found on the starting square.")
        if piece.color != move.piece.color or piece.kind != move.piece.kind:
            raise ValueError("The selected move no longer matches the board state.")

        target = self.board[move.to_row][move.to_col]
        self.board[move.from_row][move.from_col] = None

        if move.en_passant:
            capture_row = move.to_row + (1 if piece.color == WHITE else -1)
            target = self.board[capture_row][move.to_col]
            self.board[capture_row][move.to_col] = None

        move.captured = target

        if move.castle == "king":
            rook = self.board[move.from_row][7]
            self.board[move.from_row][7] = None
            self.board[move.from_row][5] = rook
        elif move.castle == "queen":
            rook = self.board[move.from_row][0]
            self.board[move.from_row][0] = None
            self.board[move.from_row][3] = rook

        placed_piece = Piece(piece.color, move.promotion) if move.promotion else piece
        self.board[move.to_row][move.to_col] = placed_piece

        if piece.kind == "king":
            self.castling_rights[piece.color]["king"] = False
            self.castling_rights[piece.color]["queen"] = False
        elif piece.kind == "rook":
            if piece.color == WHITE and move.from_row == 7 and move.from_col == 0:
                self.castling_rights[WHITE]["queen"] = False
            if piece.color == WHITE and move.from_row == 7 and move.from_col == 7:
                self.castling_rights[WHITE]["king"] = False
            if piece.color == BLACK and move.from_row == 0 and move.from_col == 0:
                self.castling_rights[BLACK]["queen"] = False
            if piece.color == BLACK and move.from_row == 0 and move.from_col == 7:
                self.castling_rights[BLACK]["king"] = False

        if move.captured and move.captured.kind == "rook":
            if move.to_row == 7 and move.to_col == 0:
                self.castling_rights[WHITE]["queen"] = False
            if move.to_row == 7 and move.to_col == 7:
                self.castling_rights[WHITE]["king"] = False
            if move.to_row == 0 and move.to_col == 0:
                self.castling_rights[BLACK]["queen"] = False
            if move.to_row == 0 and move.to_col == 7:
                self.castling_rights[BLACK]["king"] = False

        self.en_passant_target = None
        if piece.kind == "pawn" and abs(move.to_row - move.from_row) == 2:
            self.en_passant_target = ((move.from_row + move.to_row) // 2, move.from_col)

        if piece.kind == "pawn" or move.captured is not None:
            self.halfmove_clock = 0
        else:
            self.halfmove_clock += 1

        if piece.color == BLACK:
            self.fullmove_number += 1

        self.turn = opposite(piece.color)
        self.last_move = move

    def play_move(self, move: Move) -> Move:
        state_before = self.clone()
        played_move = move.clone()
        self.apply_move(played_move)
        self.record_position()
        self.refresh_outcome()
        played_move.san = state_before.san_for_move(played_move, self)
        self.move_stack.append(played_move)
        self.san_history.append(played_move.san)
        return played_move

    def san_for_move(self, move: Move, state_after: "GameState") -> str:
        if move.castle == "king":
            san = "O-O"
        elif move.castle == "queen":
            san = "O-O-O"
        else:
            capture = move.captured is not None or move.en_passant
            destination = square_name(move.to_row, move.to_col)
            if move.piece.kind == "pawn":
                prefix = FILES[move.from_col] if capture else ""
            else:
                prefix = PIECE_TO_SAN[move.piece.kind] + self.disambiguation_text(move)
            san = prefix
            if capture:
                san += "x"
            san += destination
            if move.promotion:
                san += f"={PIECE_TO_SAN[move.promotion]}"
        if state_after.is_in_check(state_after.turn):
            if not state_after.generate_legal_moves(state_after.turn):
                san += "#"
            else:
                san += "+"
        if move.is_illegal:
            san += " [illegal]"
        return san

    def disambiguation_text(self, move: Move) -> str:
        if move.piece.kind == "pawn":
            return ""
        contenders = []
        for candidate in self.generate_legal_moves(move.piece.color):
            if candidate.action_key() == move.action_key():
                continue
            if candidate.piece.kind != move.piece.kind:
                continue
            if candidate.to_row == move.to_row and candidate.to_col == move.to_col:
                contenders.append(candidate)
        if not contenders:
            return ""
        same_file = any(candidate.from_col == move.from_col for candidate in contenders)
        same_rank = any(candidate.from_row == move.from_row for candidate in contenders)
        file_text = FILES[move.from_col]
        rank_text = str(BOARD_SIZE - move.from_row)
        if same_file and same_rank:
            return file_text + rank_text
        if same_file:
            return rank_text
        return file_text

    def has_insufficient_material(self) -> bool:
        minor_pieces: List[Tuple[Piece, int, int]] = []
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                piece = self.board[row][col]
                if piece is None or piece.kind == "king":
                    continue
                if piece.kind in ("pawn", "rook", "queen"):
                    return False
                minor_pieces.append((piece, row, col))
        if not minor_pieces:
            return True
        if len(minor_pieces) == 1 and minor_pieces[0][0].kind in ("bishop", "knight"):
            return True
        if len(minor_pieces) == 2 and all(piece.kind == "bishop" for piece, _, _ in minor_pieces):
            first_color = (minor_pieces[0][1] + minor_pieces[0][2]) % 2
            second_color = (minor_pieces[1][1] + minor_pieces[1][2]) % 2
            return first_color == second_color
        return False

    def refresh_outcome(self) -> None:
        legal_moves = self.generate_legal_moves(self.turn)
        if not legal_moves:
            if self.is_in_check(self.turn):
                self.winner = opposite(self.turn)
                self.result = pgn_result_for_winner(self.winner)
                self.outcome_reason = "checkmate"
            else:
                self.winner = None
                self.result = "1/2-1/2"
                self.outcome_reason = "stalemate"
            return
        if self.halfmove_clock >= 100:
            self.winner = None
            self.result = "1/2-1/2"
            self.outcome_reason = "fifty-move rule"
            return
        if self.position_counts.get(self.position_key(), 0) >= 3:
            self.winner = None
            self.result = "1/2-1/2"
            self.outcome_reason = "threefold repetition"
            return
        if self.has_insufficient_material():
            self.winner = None
            self.result = "1/2-1/2"
            self.outcome_reason = "insufficient material"
            return
        self.winner = None
        self.result = "*"
        self.outcome_reason = None

    def material_balance(self, perspective: str) -> int:
        total = 0
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                piece = self.board[row][col]
                if piece is None:
                    continue
                value = MATERIAL_VALUES[piece.kind]
                total += value if piece.color == perspective else -value
        return total

    def remaining_pieces(self) -> int:
        return sum(1 for row in self.board for piece in row if piece is not None)


class LearningMemory:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.weights: Dict[str, Dict[str, float]] = {"legal": {}, "illegal": {}}
        self.games_played: Dict[str, int] = {"legal": 0, "illegal": 0}
        self.load()

    def load(self) -> None:
        if not self.path.exists():
            return
        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return
        weights = payload.get("weights", {})
        for mode in ("legal", "illegal"):
            raw_mode = weights.get(mode, {})
            if isinstance(raw_mode, dict):
                self.weights[mode] = {str(key): float(value) for key, value in raw_mode.items()}
        games_played = payload.get("games_played", {})
        for mode in ("legal", "illegal"):
            try:
                self.games_played[mode] = int(games_played.get(mode, 0))
            except (TypeError, ValueError):
                self.games_played[mode] = 0

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "weights": self.weights,
            "games_played": self.games_played,
        }
        self.path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")

    def bias_for(self, mode: str, features: List[str]) -> float:
        table = self.weights.get(mode, {})
        return sum(table.get(feature, 0.0) for feature in features)

    def update(self, mode: str, feature_sets: List[List[str]], outcome: int) -> None:
        if mode not in self.weights:
            return
        table = self.weights[mode]
        feature_count = max(1, len(feature_sets))
        for index, features in enumerate(feature_sets):
            if not features:
                continue
            position_weight = 1.0 + (index / feature_count)
            base_adjustment = (10.0 * outcome) / len(features)
            for feature in features:
                current = table.get(feature, 0.0)
                updated = current + (base_adjustment * position_weight)
                table[feature] = max(-120.0, min(120.0, updated))
        self.games_played[mode] = self.games_played.get(mode, 0) + 1
        self.save()


class ChessAI:
    def __init__(self, learning_memory: LearningMemory):
        self.learning_memory = learning_memory

    def choose_move(self, state: GameState, color: str, mode: str) -> Optional[AiDecision]:
        moves = self._candidate_moves(state, color, color, mode)
        if not moves:
            return None
        depth = 3 if len(moves) <= 12 or state.remaining_pieces() <= 10 else 2
        scored: List[Tuple[Move, float, float, float, List[str]]] = []
        ordered_moves = self._order_moves(state, moves, color)
        for move in ordered_moves:
            child = state.clone()
            child.apply_move(move.clone())
            child.record_position()
            child.refresh_outcome()
            raw_score = self._search(child, depth - 1, -10_000_000, 10_000_000, color, mode)
            features = self._extract_features(state, move, child, mode)
            learned_bias = self.learning_memory.bias_for(mode, features)
            total_score = raw_score + learned_bias
            scored.append((move.clone(), total_score, raw_score, learned_bias, features))
        probabilities = self._softmax([score for _, score, _, _, _ in scored], temperature=220.0)
        candidates = [
            AiCandidate(
                move=move,
                probability=probability,
                total_score=total_score,
                raw_score=raw_score,
                learned_bias=learned_bias,
                features=features,
            )
            for probability, (move, total_score, raw_score, learned_bias, features) in zip(probabilities, scored)
        ]
        candidates.sort(key=lambda candidate: (candidate.probability, candidate.total_score, candidate.move.uci()), reverse=True)
        return AiDecision(chosen=candidates[0], candidates=candidates, depth=depth)

    def _softmax(self, scores: List[float], temperature: float) -> List[float]:
        if not scores:
            return []
        adjusted = [score / max(1.0, temperature) for score in scores]
        peak = max(adjusted)
        weights = [math.exp(value - peak) for value in adjusted]
        total = sum(weights)
        if total <= 0:
            return [1.0 / len(scores) for _ in scores]
        return [weight / total for weight in weights]

    def _candidate_moves(self, state: GameState, current_color: str, bot_color: str, mode: str) -> List[Move]:
        if current_color == bot_color and mode == "illegal":
            return state.generate_illegal_bot_moves(current_color)
        return state.generate_legal_moves(current_color)

    def _search(
        self,
        state: GameState,
        depth: int,
        alpha: float,
        beta: float,
        bot_color: str,
        mode: str,
    ) -> float:
        if state.result != "*":
            return self._terminal_score(state, bot_color, depth)
        if depth <= 0:
            return self.evaluate_position(state, bot_color)

        moves = self._candidate_moves(state, state.turn, bot_color, mode)
        if not moves:
            trial = state.clone()
            trial.refresh_outcome()
            return self._terminal_score(trial, bot_color, depth)

        ordered = self._order_moves(state, moves, bot_color)
        if depth >= 2 and len(ordered) > 18:
            ordered = ordered[:18]

        if state.turn == bot_color:
            best = -10_000_000.0
            for move in ordered:
                child = state.clone()
                child.apply_move(move.clone())
                child.record_position()
                child.refresh_outcome()
                best = max(best, self._search(child, depth - 1, alpha, beta, bot_color, mode))
                alpha = max(alpha, best)
                if alpha >= beta:
                    break
            return best

        best = 10_000_000.0
        for move in ordered:
            child = state.clone()
            child.apply_move(move.clone())
            child.record_position()
            child.refresh_outcome()
            best = min(best, self._search(child, depth - 1, alpha, beta, bot_color, mode))
            beta = min(beta, best)
            if alpha >= beta:
                break
        return best

    def _terminal_score(self, state: GameState, bot_color: str, depth: int) -> float:
        if state.result == "1/2-1/2":
            return 0.0
        if state.winner == bot_color:
            return 100_000.0 + depth
        if state.winner == opposite(bot_color):
            return -100_000.0 - depth
        return 0.0

    def _order_moves(self, state: GameState, moves: List[Move], perspective: str) -> List[Move]:
        def move_rank(move: Move) -> Tuple[int, int, int]:
            capture_score = 0
            if move.captured:
                capture_score = MATERIAL_VALUES[move.captured.kind] - MATERIAL_VALUES[move.piece.kind]
            promotion_score = MATERIAL_VALUES.get(move.promotion, 0) if move.promotion else 0
            center_bonus = 20 if (move.to_row, move.to_col) in {(3, 3), (3, 4), (4, 3), (4, 4)} else 0
            illegal_bonus = 5 if move.is_illegal else 0
            return (
                capture_score + promotion_score + center_bonus + illegal_bonus,
                promotion_score,
                -move.from_row if perspective == WHITE else move.from_row,
            )

        return sorted(moves, key=move_rank, reverse=True)

    def evaluate_position(self, state: GameState, perspective: str) -> float:
        score = 0.0
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                piece = state.board[row][col]
                if piece is None:
                    continue
                direction = 1 if piece.color == perspective else -1
                table = PIECE_SQUARE_TABLES[piece.kind]
                lookup_row = row if piece.color == WHITE else 7 - row
                score += direction * (MATERIAL_VALUES[piece.kind] + table[lookup_row][col])
                if (row, col) in {(3, 3), (3, 4), (4, 3), (4, 4)}:
                    score += direction * 18
        score += 4.0 * (len(state.generate_pseudo_legal_moves(perspective)) - len(state.generate_pseudo_legal_moves(opposite(perspective))))
        if state.is_in_check(opposite(perspective)):
            score += 35.0
        if state.is_in_check(perspective):
            score -= 35.0
        if state.castling_rights[perspective]["king"] or state.castling_rights[perspective]["queen"]:
            score += 10.0
        if state.castling_rights[opposite(perspective)]["king"] or state.castling_rights[opposite(perspective)]["queen"]:
            score -= 10.0
        return score

    def _extract_features(self, state: GameState, move: Move, child: GameState, mode: str) -> List[str]:
        features = [
            f"mode:{mode}",
            f"piece:{move.piece.kind}",
            f"to:{square_name(move.to_row, move.to_col)}",
            f"file:{FILES[move.to_col]}",
            f"rank:{BOARD_SIZE - move.to_row}",
            f"ply:{min(len(state.san_history) + 1, 12)}",
            f"phase:{self._phase_name(state)}",
            f"vector:{move.piece.kind}:{move.to_row - move.from_row}:{move.to_col - move.from_col}",
        ]
        if move.captured:
            features.append("capture")
            features.append(f"capture:{move.captured.kind}")
        if move.castle:
            features.append(f"castle:{move.castle}")
        if move.promotion:
            features.append(f"promotion:{move.promotion}")
        if move.is_illegal:
            features.append("illegal")
            features.append(f"illegal_note:{move.note or 'generic'}")
        if move.piece.kind in ("knight", "bishop") and move.from_row in (0, 7):
            features.append("develops_minor")
        if move.piece.kind == "pawn" and abs(move.to_row - move.from_row) == 2:
            features.append("pawn_two_step")
        if (move.to_row, move.to_col) in {(3, 3), (3, 4), (4, 3), (4, 4)}:
            features.append("center")
        material_edge = state.material_balance(move.piece.color)
        if material_edge > 150:
            features.append("material:ahead")
        elif material_edge < -150:
            features.append("material:behind")
        else:
            features.append("material:level")
        if child.is_in_check(child.turn):
            features.append("check")
        return features

    def _phase_name(self, state: GameState) -> str:
        pieces_left = state.remaining_pieces()
        if pieces_left > 22:
            return "opening"
        if pieces_left > 10:
            return "middlegame"
        return "endgame"
