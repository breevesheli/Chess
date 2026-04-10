import unittest

from chess_engine import BLACK, WHITE, GameState, Move, Piece


class ChessEngineTests(unittest.TestCase):
    def test_initial_position_has_20_legal_white_moves(self) -> None:
        state = GameState.initial()
        self.assertEqual(len(state.generate_legal_moves(WHITE)), 20)
        self.assertEqual(state.piece_at(7, 0), Piece(WHITE, "rook"))
        self.assertEqual(state.piece_at(0, 4), Piece(BLACK, "king"))

    def test_basic_san_notation_for_e4(self) -> None:
        state = GameState.initial()
        move = next(move for move in state.generate_legal_moves(WHITE) if move.uci() == "e2e4")
        played = state.play_move(move)
        self.assertEqual(played.san, "e4")

    def test_en_passant_is_generated_and_recorded(self) -> None:
        state = GameState.initial()
        for uci in ("e2e4", "a7a6", "e4e5", "d7d5"):
            color = state.turn
            move = next(candidate for candidate in state.generate_legal_moves(color) if candidate.uci() == uci)
            state.play_move(move)
        en_passant = next(move for move in state.generate_legal_moves(WHITE) if move.en_passant)
        played = state.play_move(en_passant)
        self.assertEqual(played.san, "exd6")

    def test_castling_is_available_in_clear_position(self) -> None:
        state = GameState.empty()
        state.board = [[None for _ in range(8)] for _ in range(8)]
        state.set_piece(7, 4, Piece(WHITE, "king"))
        state.set_piece(7, 7, Piece(WHITE, "rook"))
        state.set_piece(7, 0, Piece(WHITE, "rook"))
        state.set_piece(0, 4, Piece(BLACK, "king"))
        state.turn = WHITE
        moves = state.generate_legal_moves(WHITE)
        self.assertIn("e1g1", {move.uci() for move in moves})
        self.assertIn("e1c1", {move.uci() for move in moves})

    def test_illegal_bot_can_phase_bishop_through_blocker(self) -> None:
        state = GameState.empty()
        state.board = [[None for _ in range(8)] for _ in range(8)]
        state.set_piece(7, 4, Piece(WHITE, "king"))
        state.set_piece(0, 4, Piece(BLACK, "king"))
        state.set_piece(7, 2, Piece(WHITE, "bishop"))
        state.set_piece(6, 3, Piece(WHITE, "pawn"))
        moves = state.generate_illegal_bot_moves(WHITE)
        illegal_uci = {move.uci() for move in moves if move.is_illegal}
        self.assertIn("c1h6", illegal_uci)


if __name__ == "__main__":
    unittest.main()
