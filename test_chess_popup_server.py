import shutil
import unittest
import uuid
from pathlib import Path
from types import SimpleNamespace
import json

from chess_popup_server import ChessService


PROJECT_DIR = Path(__file__).resolve().parent


class ChessServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.test_dir = PROJECT_DIR / ("_service_test_" + uuid.uuid4().hex)
        self.test_dir.mkdir(parents=True, exist_ok=True)

    def tearDown(self) -> None:
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_start_game_returns_expected_state(self) -> None:
        service = ChessService(self.test_dir)
        payload = service.start_game("white", "illegal")
        self.assertTrue(payload["gameActive"])
        self.assertEqual(payload["playerColor"], "white")
        self.assertEqual(payload["botMode"], "illegal")
        self.assertEqual(len(payload["availableMoves"]), 20)
        self.assertTrue(payload["animatePieces"])
        self.assertTrue(payload["cinematicCaptures"])
        self.assertIn("positionInsights", payload)
        self.assertEqual(payload["positionInsights"]["white"]["mode"], "legal")
        self.assertEqual(payload["positionInsights"]["black"]["mode"], "illegal")
        self.assertGreater(len(payload["positionInsights"]["white"]["choices"]), 0)
        self.assertGreater(len(payload["positionInsights"]["black"]["choices"]), 0)

    def test_separate_data_directory_is_used_for_runtime_files(self) -> None:
        assets_dir = PROJECT_DIR
        data_dir = self.test_dir / "runtime"
        service = ChessService(assets_dir, data_dir=data_dir)
        service.start_game("white", "legal")
        self.assertEqual(service.autosave_path, data_dir / "current_game_autosave.json")
        self.assertTrue((data_dir / "game_records").exists())
        self.assertTrue((data_dir / "current_game_autosave.json").exists())

    def test_preferences_persist_across_restart(self) -> None:
        service = ChessService(self.test_dir)
        payload = service.update_preferences(
            theme="nebula",
            piece_set="bird",
            auto_flip=False,
            muted=True,
            animate_pieces=False,
            cinematic_captures=False,
        )
        self.assertEqual(payload["theme"], "nebula")
        self.assertEqual(payload["pieceSet"], "bird")
        self.assertFalse(payload["animatePieces"])
        self.assertFalse(payload["cinematicCaptures"])

        reloaded = ChessService(self.test_dir)
        state = reloaded.get_state()
        self.assertEqual(state["theme"], "nebula")
        self.assertEqual(state["pieceSet"], "bird")
        self.assertFalse(state["autoFlip"])
        self.assertTrue(state["muted"])
        self.assertFalse(state["animatePieces"])
        self.assertFalse(state["cinematicCaptures"])
        self.assertTrue((self.test_dir / "ui_preferences.json").exists())

    def test_home_screen_preferences_do_not_delete_autosave(self) -> None:
        service = ChessService(self.test_dir)
        service.start_game("white", "legal", theme="forest", piece_set="classic")
        self.assertTrue((self.test_dir / "current_game_autosave.json").exists())

        reopened = ChessService(self.test_dir)
        preview = reopened.update_preferences(theme="nebula", piece_set="bird")
        self.assertEqual(preview["theme"], "nebula")
        self.assertEqual(preview["pieceSet"], "bird")
        self.assertTrue((self.test_dir / "current_game_autosave.json").exists())

        resumed = reopened.resume_game()
        self.assertEqual(resumed["theme"], "nebula")
        self.assertEqual(resumed["pieceSet"], "bird")
        self.assertTrue(resumed["gameActive"])

    def test_human_then_ai_move_updates_history(self) -> None:
        service = ChessService(self.test_dir)
        service.start_game("white", "legal")
        after_human = service.play_human_move("e2", "e4")
        self.assertEqual(after_human["moveHistory"], ["e4"])
        after_ai = service.play_ai_move()
        self.assertEqual(len(after_ai["moveHistory"]), 2)
        self.assertIsNotNone(after_ai["lastAiSummary"])
        hint = service.get_hint()
        self.assertIn("hint", hint)

    def test_undo_and_resume_restore_active_game(self) -> None:
        service = ChessService(self.test_dir)
        service.start_game("black", "legal", difficulty="easy", time_mode="bullet")
        after_ai = service.play_ai_move()
        self.assertEqual(len(after_ai["moveHistory"]), 1)

        undone = service.undo_last_turn()
        self.assertEqual(undone["moveHistory"], [])
        self.assertTrue(undone["resumeAvailable"])

        resumed = service.resume_game()
        self.assertEqual(resumed["playerColor"], "black")
        self.assertEqual(resumed["difficulty"], "easy")
        self.assertEqual(resumed["timeMode"], "bullet")

    def test_finished_game_writes_records_and_updates_learning(self) -> None:
        service = ChessService(self.test_dir)
        service.start_game("white", "legal")

        script = (
            ("f2f3", "Human", None),
            ("e7e5", "AI", SimpleNamespace(probability=0.61, total_score=112.0)),
            ("g2g4", "Human", None),
            ("d8h4", "AI", SimpleNamespace(probability=0.84, total_score=980.0)),
        )

        for uci, actor, ai_candidate in script:
            move = next(candidate for candidate in service.state.generate_legal_moves(service.state.turn) if candidate.uci() == uci)
            played = service.state.play_move(move)
            service._record_move(played, actor=actor, ai_candidate=ai_candidate, search_depth=2 if ai_candidate else None)
            if ai_candidate is not None:
                service.current_game["ai_learning_samples"].append(["mode:legal", "piece:queen", "checkmate-pattern"])

        self.assertEqual(service.state.result, "0-1")
        self.assertEqual(service.state.san_history[-1], "Qh4#")
        service._finish_game()

        json_files = list((self.test_dir / "game_records").glob("*.json"))
        pgn_files = list((self.test_dir / "game_records").glob("*.pgn"))
        self.assertEqual(len(json_files), 1)
        self.assertEqual(len(pgn_files), 1)

        record = json.loads(json_files[0].read_text(encoding="utf-8"))
        self.assertEqual(record["result"], "0-1")
        self.assertIn("Qh4#", record["san_moves"])
        self.assertIn("1. f3 e5 2. g4 Qh4# 0-1", pgn_files[0].read_text(encoding="utf-8"))

        learning_path = self.test_dir / "bot_learning.json"
        self.assertTrue(learning_path.exists())

        reloaded = ChessService(self.test_dir)
        bias = reloaded.learning_memory.bias_for("legal", ["mode:legal", "piece:queen", "checkmate-pattern"])
        self.assertGreater(bias, 0.0)

        live_state = service.get_state()
        self.assertEqual(live_state["positionInsights"], {})
        self.assertIsNone(live_state["analysis"])

        computed_analysis = service.get_analysis()["analysis"]
        self.assertIsNotNone(computed_analysis)
        self.assertIn("bestMoves", computed_analysis)

        listing = reloaded.get_state()["savedGameList"]
        self.assertEqual(len(listing), 1)
        replay = reloaded.load_record(listing[0]["file"])
        self.assertGreaterEqual(len(replay["replay"]["snapshots"]), 2)
        self.assertIn("bestMoves", replay["replay"]["analysis"])


if __name__ == "__main__":
    unittest.main()
