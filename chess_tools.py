"""CLI tools for Chess Popup: opening book builder, puzzle extractor,
headless AI-vs-AI matches, and analysis HTML export.

Usage:
    python chess_tools.py build-opening-book [--min-count 2] [--max-ply 12]
    python chess_tools.py extract-puzzles [--min-probability 0.55] [--min-ply 8]
    python chess_tools.py headless [--games 10] [--mode legal]
    python chess_tools.py export-analysis <game_record_json>
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

from chess_engine import (
    BLACK,
    WHITE,
    ChessAI,
    GameState,
    LearningMemory,
    Move,
    UNICODE_PIECES,
)


BASE_DIR = Path(__file__).resolve().parent
RECORDS_DIR = BASE_DIR / "game_records"
OPENING_BOOK_FILE = BASE_DIR / "opening_book.json"
PUZZLES_FILE = BASE_DIR / "puzzles.json"
HEADLESS_LOG_FILE = BASE_DIR / "headless_match_log.jsonl"
ANALYSIS_DIR = BASE_DIR / "analysis_exports"


def _load_game_records() -> List[Dict[str, Any]]:
    if not RECORDS_DIR.exists():
        return []
    records: List[Dict[str, Any]] = []
    for path in sorted(RECORDS_DIR.glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if isinstance(data, dict) and isinstance(data.get("moves"), list):
            data["_path"] = str(path)
            records.append(data)
    return records


def _move_for_uci(state: GameState, color: str, uci: str) -> Move | None:
    for move in state.generate_legal_moves(color):
        if move.uci() == uci:
            return move
    return None


def _replay_state(moves: List[Dict[str, Any]]) -> GameState | None:
    """Replay a recorded move list against a fresh initial state. Returns None on failure."""
    state = GameState.initial()
    for entry in moves:
        uci = str(entry.get("uci", ""))
        color = str(entry.get("color", ""))
        if not uci or color not in (WHITE, BLACK):
            return None
        move = _move_for_uci(state, color, uci)
        if move is None:
            return None
        state.play_move(move)
        state.record_position()
    return state


# ---------------------------------------------------------------------------
# Opening book builder
# ---------------------------------------------------------------------------


def build_opening_book(min_count: int = 2, max_ply: int = 12) -> Dict[str, Any]:
    """Scan game_records for AI moves in the opening and aggregate them.

    Only counts moves from games the AI won or drew. Builds a dict keyed by
    ``(color, san_history_before_move)`` with lists of UCI moves sorted by
    frequency, keeping moves that appear at least ``min_count`` times.
    """
    records = _load_game_records()
    counters: Dict[Tuple[str, Tuple[str, ...]], Counter] = {}
    games_scanned = 0

    for record in records:
        winner = str(record.get("winner", "")).lower()
        # Skip games the AI lost — we only learn from wins + draws.
        player_color = str(record.get("player_color", "white")).lower()
        bot_color = WHITE if player_color == BLACK else BLACK
        if winner == player_color:
            continue
        games_scanned += 1

        # Replay the game one move at a time, tracking SAN history before each AI move.
        state = GameState.initial()
        for entry in record["moves"]:
            ply = int(entry.get("ply", 0))
            color = str(entry.get("color", ""))
            uci = str(entry.get("uci", ""))
            actor = str(entry.get("actor", ""))
            if ply > max_ply:
                break
            move = _move_for_uci(state, color, uci)
            if move is None:
                break
            if actor == "AI" and color == bot_color and not move.is_illegal:
                key = (color, tuple(state.san_history))
                counter = counters.setdefault(key, Counter())
                counter[uci] += 1
            state.play_move(move)
            state.record_position()

    # Filter by min_count and serialize to list-of-pairs for JSON.
    pairs: List[Dict[str, Any]] = []
    for (color, san_history), counter in counters.items():
        kept = [uci for uci, count in counter.most_common() if count >= min_count]
        if not kept:
            continue
        pairs.append(
            {
                "color": color,
                "san_history": list(san_history),
                "moves": kept,
            }
        )

    payload = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "games_scanned": games_scanned,
        "min_count": min_count,
        "max_ply": max_ply,
        "entries": pairs,
    }
    OPENING_BOOK_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


def load_opening_book_overlay() -> Dict[Tuple[str, Tuple[str, ...]], List[str]]:
    """Reload the JSON overlay into the in-memory dict format used by the server."""
    if not OPENING_BOOK_FILE.exists():
        return {}
    try:
        payload = json.loads(OPENING_BOOK_FILE.read_text(encoding="utf-8"))
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


# ---------------------------------------------------------------------------
# Puzzle extractor
# ---------------------------------------------------------------------------


def extract_puzzles(min_probability: float = 0.55, min_ply: int = 8) -> Dict[str, Any]:
    """Scan game_records for AI decisions where one candidate dominated.

    A "puzzle" is a position where the AI's top move had probability at
    least ``min_probability`` (meaning the search found a clear best).
    Puzzles must occur after ``min_ply`` plies to avoid trivial opening book.
    """
    records = _load_game_records()
    puzzles: List[Dict[str, Any]] = []

    for record in records:
        moves = record["moves"]
        state = GameState.initial()
        for entry in moves:
            ply = int(entry.get("ply", 0))
            color = str(entry.get("color", ""))
            uci = str(entry.get("uci", ""))
            actor = str(entry.get("actor", ""))
            move = _move_for_uci(state, color, uci)
            if move is None:
                break

            prob = float(entry.get("estimated_win_probability", 0.0) or 0.0)
            if (
                actor == "AI"
                and ply >= min_ply
                and prob >= min_probability
                and not move.is_illegal
            ):
                puzzles.append(
                    {
                        "source_game": record.get("id", ""),
                        "ply": ply,
                        "to_move": color,
                        "san_history": list(state.san_history),
                        "expected_uci": uci,
                        "expected_san": entry.get("san", ""),
                        "probability": prob,
                        "search_depth": entry.get("search_depth"),
                    }
                )

            state.play_move(move)
            state.record_position()

    payload = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "min_probability": min_probability,
        "min_ply": min_ply,
        "count": len(puzzles),
        "puzzles": puzzles,
    }
    PUZZLES_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


# ---------------------------------------------------------------------------
# Headless AI-vs-AI runner
# ---------------------------------------------------------------------------


def headless_match(
    games: int = 10,
    mode: str = "legal",
    temperature: float = 220.0,
    depth: int = 2,
    update_learning: bool = True,
) -> Dict[str, Any]:
    """Play ``games`` AI-vs-AI matches, updating learning memory per game."""
    memory = LearningMemory(BASE_DIR / "bot_learning.json")
    ai = ChessAI(memory)
    results = {"white": 0, "black": 0, "draw": 0}

    with HEADLESS_LOG_FILE.open("a", encoding="utf-8") as log:
        for game_index in range(1, games + 1):
            state = GameState.initial()
            white_samples: List[List[str]] = []
            black_samples: List[List[str]] = []
            move_count = 0
            while state.result == "*":
                decision = ai.choose_move(
                    state.clone(),
                    state.turn,
                    mode,
                    depth_override=depth,
                    temperature=temperature,
                )
                if decision is None:
                    state.refresh_outcome()
                    break
                chosen = decision.chosen
                if state.turn == WHITE:
                    white_samples.append(chosen.features)
                else:
                    black_samples.append(chosen.features)
                state.play_move(chosen.move)
                state.record_position()
                state.refresh_outcome()
                move_count += 1
                if move_count >= 200:
                    # Safety cap so a stuck engine can't run forever.
                    state.result = "1/2-1/2"
                    state.winner = None
                    state.outcome_reason = "move limit"
                    break

            winner = (state.winner or "").lower()
            if winner == WHITE:
                results["white"] += 1
                white_outcome, black_outcome = 1, -1
            elif winner == BLACK:
                results["black"] += 1
                white_outcome, black_outcome = -1, 1
            else:
                results["draw"] += 1
                white_outcome = black_outcome = 0

            if update_learning:
                memory.update(mode, white_samples, white_outcome)
                memory.update(mode, black_samples, black_outcome)

            log.write(
                json.dumps(
                    {
                        "ts": datetime.now().isoformat(timespec="seconds"),
                        "game": game_index,
                        "mode": mode,
                        "result": state.result,
                        "winner": state.winner,
                        "moves": move_count,
                        "outcome_reason": state.outcome_reason,
                    }
                )
                + "\n"
            )
            print(
                f"Game {game_index}/{games}: {state.result} "
                f"({state.winner or 'draw'}) in {move_count} moves",
                flush=True,
            )

    summary = {
        "games": games,
        "mode": mode,
        "results": results,
        "white_win_rate": results["white"] / max(1, games),
        "black_win_rate": results["black"] / max(1, games),
        "draw_rate": results["draw"] / max(1, games),
    }
    print(json.dumps(summary, indent=2), flush=True)
    return summary


# ---------------------------------------------------------------------------
# Analysis HTML export
# ---------------------------------------------------------------------------


_SVG_LIGHT = "#f0d9b5"
_SVG_DARK = "#b58863"


def _svg_board(state: GameState, size: int = 280) -> str:
    cell = size // 8
    svg: List[str] = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">'
    ]
    for row in range(8):
        for col in range(8):
            x = col * cell
            y = row * cell
            fill = _SVG_LIGHT if (row + col) % 2 == 0 else _SVG_DARK
            svg.append(f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" fill="{fill}"/>')
            piece = state.board[row][col]
            if piece is not None:
                glyph = UNICODE_PIECES.get((piece.color, piece.kind), "")
                color_attr = "#ffffff" if piece.color == WHITE else "#101010"
                stroke_attr = "#101010" if piece.color == WHITE else "#ffffff"
                svg.append(
                    f'<text x="{x + cell / 2}" y="{y + cell * 0.72}" '
                    f'font-size="{cell * 0.85}" text-anchor="middle" '
                    f'fill="{color_attr}" stroke="{stroke_attr}" stroke-width="1.2">{glyph}</text>'
                )
    svg.append("</svg>")
    return "".join(svg)


def export_analysis(game_record_path: Path) -> Path:
    """Generate a standalone HTML analysis report for a saved game."""
    record = json.loads(game_record_path.read_text(encoding="utf-8"))
    moves = record["moves"]
    analysis = record.get("analysis") or {}

    # Replay the game and snapshot every 4 plies for diagrams.
    state = GameState.initial()
    snapshots: List[Tuple[int, GameState]] = [(0, state.clone())]
    for entry in moves:
        uci = str(entry.get("uci", ""))
        color = str(entry.get("color", ""))
        move = _move_for_uci(state, color, uci)
        if move is None:
            break
        state.play_move(move)
        state.record_position()
        if int(entry.get("ply", 0)) % 4 == 0:
            snapshots.append((int(entry.get("ply", 0)), state.clone()))
    snapshots.append((len(moves), state.clone()))

    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = ANALYSIS_DIR / f"{game_record_path.stem}_analysis.html"

    def _section(title: str, items: List[Dict[str, Any]]) -> str:
        if not items:
            return f"<h3>{title}</h3><p><em>None.</em></p>"
        rows = "".join(
            f"<li>{item.get('move', '?')} &mdash; {item.get('note', '')}</li>"
            for item in items
        )
        return f"<h3>{title}</h3><ul>{rows}</ul>"

    diagrams = "".join(
        f'<div class="diagram"><div class="ply-label">After ply {ply}</div>{_svg_board(snap)}</div>'
        for ply, snap in snapshots
    )

    pgn_text = record.get("pgn", "").replace("<", "&lt;").replace(">", "&gt;")
    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Chess Popup analysis &mdash; {record.get('id', '')}</title>
<style>
 body {{ font-family: Segoe UI, Arial, sans-serif; margin: 30px; color: #222; }}
 h1 {{ margin-bottom: 4px; }}
 .meta {{ color: #666; margin-bottom: 20px; }}
 .diagrams {{ display: flex; flex-wrap: wrap; gap: 16px; }}
 .diagram {{ border: 1px solid #ddd; padding: 8px; border-radius: 6px; background: #fafafa; }}
 .ply-label {{ font-size: 12px; color: #555; margin-bottom: 4px; text-align: center; }}
 pre {{ background: #f4f4f4; padding: 12px; border-radius: 4px; white-space: pre-wrap; }}
 ul {{ margin-top: 4px; }}
 @media print {{ body {{ margin: 15mm; }} }}
</style>
</head>
<body>
<h1>Chess Popup &mdash; Game {record.get('id', '')}</h1>
<div class="meta">
Result: <strong>{record.get('result', '?')}</strong>
&middot; Winner: <strong>{record.get('winner') or 'draw'}</strong>
&middot; Bot mode: <strong>{record.get('bot_mode', '?')}</strong>
&middot; Difficulty: <strong>{record.get('difficulty', '?')}</strong>
&middot; Outcome: <strong>{record.get('outcome_reason', '?')}</strong>
</div>

<h2>Position diagrams</h2>
<div class="diagrams">{diagrams}</div>

<h2>Analysis</h2>
{_section("Best moves", analysis.get("bestMoves", []))}
{_section("Blunders", analysis.get("blunders", []))}
{_section("Missed tactics", analysis.get("missedTactics", []))}

<h2>PGN</h2>
<pre>{pgn_text}</pre>
</body>
</html>
"""
    out_path.write_text(html, encoding="utf-8")
    return out_path


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description="Chess Popup CLI tools.")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_book = sub.add_parser("build-opening-book", help="Build opening_book.json from game_records.")
    p_book.add_argument("--min-count", type=int, default=2)
    p_book.add_argument("--max-ply", type=int, default=12)

    p_puz = sub.add_parser("extract-puzzles", help="Extract puzzles from game_records.")
    p_puz.add_argument("--min-probability", type=float, default=0.55)
    p_puz.add_argument("--min-ply", type=int, default=8)

    p_head = sub.add_parser("headless", help="Run AI-vs-AI games for overnight training.")
    p_head.add_argument("--games", type=int, default=10)
    p_head.add_argument("--mode", choices=["legal", "illegal"], default="legal")
    p_head.add_argument("--temperature", type=float, default=220.0)
    p_head.add_argument("--depth", type=int, default=2)
    p_head.add_argument("--no-learning", action="store_true")

    p_exp = sub.add_parser("export-analysis", help="Export a saved game to HTML analysis.")
    p_exp.add_argument("game_record", help="Path to a game_records/*.json file.")

    args = parser.parse_args()
    if args.cmd == "build-opening-book":
        payload = build_opening_book(args.min_count, args.max_ply)
        print(
            f"Opening book built: {len(payload['entries'])} positions from "
            f"{payload['games_scanned']} winning games -> {OPENING_BOOK_FILE}"
        )
        return 0
    if args.cmd == "extract-puzzles":
        payload = extract_puzzles(args.min_probability, args.min_ply)
        print(f"Extracted {payload['count']} puzzles -> {PUZZLES_FILE}")
        return 0
    if args.cmd == "headless":
        headless_match(
            games=args.games,
            mode=args.mode,
            temperature=args.temperature,
            depth=args.depth,
            update_learning=not args.no_learning,
        )
        return 0
    if args.cmd == "export-analysis":
        path = export_analysis(Path(args.game_record))
        print(f"Analysis exported -> {path}")
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
