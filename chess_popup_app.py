from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys
import threading
from urllib import request

from PySide6.QtCore import Qt, QUrl
from PySide6.QtGui import QIcon
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QApplication, QMainWindow, QMessageBox

from chess_popup_server import ChessHttpServer, ChessRequestHandler, ChessService


APP_TITLE = "Chess Popup"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 0
DEFAULT_WIDTH = 1540
DEFAULT_HEIGHT = 980
MIN_WIDTH = 1180
MIN_HEIGHT = 820


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the Chess Popup desktop app.")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--data-dir", default="", help="Optional writable directory for autosaves, stats, and game records.")
    parser.add_argument("--smoke-test", action="store_true", help="Start the local service, verify it responds, and exit.")
    return parser.parse_args()


def resource_dir() -> Path:
    if getattr(sys, "frozen", False):
        bundle_root = getattr(sys, "_MEIPASS", "")
        if bundle_root:
            return Path(bundle_root)
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def default_data_dir() -> Path:
    override = os.environ.get("CHESS_POPUP_DATA_DIR", "").strip()
    if override:
        return Path(override).expanduser().resolve()
    if getattr(sys, "frozen", False):
        local_app_data = os.environ.get("LOCALAPPDATA", "").strip()
        if local_app_data:
            return Path(local_app_data).resolve() / "ChessPopup"
        return (Path.home() / "AppData" / "Local" / "ChessPopup").resolve()
    return resource_dir()


class LocalServerHost:
    def __init__(self, project_dir: Path, data_dir: Path, host: str, port: int) -> None:
        self.project_dir = project_dir
        self.data_dir = data_dir
        self.host = host
        self.port = port
        self.server: ChessHttpServer | None = None
        self.thread: threading.Thread | None = None

    def start(self) -> None:
        if self.server is not None:
            return
        self.data_dir.mkdir(parents=True, exist_ok=True)
        service = ChessService(self.project_dir, data_dir=self.data_dir)
        self.server = ChessHttpServer((self.host, self.port), ChessRequestHandler, self.project_dir, service)
        self.thread = threading.Thread(
            target=self.server.serve_forever,
            name="ChessPopupServer",
            daemon=True,
        )
        self.thread.start()

    def stop(self) -> None:
        if self.server is None:
            return
        self.server.shutdown()
        self.server.server_close()
        if self.thread is not None:
            self.thread.join(timeout=5)
        self.server = None
        self.thread = None

    @property
    def base_url(self) -> str:
        if self.server is None:
            raise RuntimeError("Local server has not been started.")
        actual_host, actual_port = self.server.server_address
        return f"http://{actual_host}:{actual_port}"

    def __enter__(self) -> LocalServerHost:
        self.start()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.stop()


class ChessPopupWindow(QMainWindow):
    def __init__(self, server_host: LocalServerHost, icon_path: Path) -> None:
        super().__init__()
        self.server_host = server_host
        self.setWindowTitle(APP_TITLE)
        self.resize(DEFAULT_WIDTH, DEFAULT_HEIGHT)
        self.setMinimumSize(MIN_WIDTH, MIN_HEIGHT)
        if icon_path.exists():
            self.setWindowIcon(QIcon(str(icon_path)))

        self.web_view = QWebEngineView(self)
        self.web_view.loadFinished.connect(self._handle_load_finished)
        self.setCentralWidget(self.web_view)
        self.web_view.setUrl(QUrl(f"{self.server_host.base_url}/app.html"))

    def _handle_load_finished(self, ok: bool) -> None:
        if ok:
            return
        QMessageBox.critical(
            self,
            APP_TITLE,
            "The Chess Popup interface could not be loaded from the local app service.",
        )
        self.close()

    def closeEvent(self, event) -> None:
        self.server_host.stop()
        super().closeEvent(event)


def run_smoke_test(project_dir: Path, data_dir: Path, host: str, port: int) -> int:
    with LocalServerHost(project_dir, data_dir, host, port) as server_host:
        with request.urlopen(f"{server_host.base_url}/api/state", timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
        if "board" not in payload or "availableMoves" not in payload:
            raise RuntimeError("Smoke test failed because the state payload was incomplete.")
        print(f"Smoke test passed: {server_host.base_url}", flush=True)
    return 0


def run_desktop(project_dir: Path, data_dir: Path, host: str, port: int) -> int:
    QApplication.setAttribute(Qt.ApplicationAttribute.AA_ShareOpenGLContexts)
    app = QApplication(sys.argv)
    app.setApplicationName(APP_TITLE)

    icon_path = project_dir / "chess_popup.ico"
    if icon_path.exists():
        app.setWindowIcon(QIcon(str(icon_path)))

    server_host = LocalServerHost(project_dir, data_dir, host, port)
    try:
        server_host.start()
    except Exception as error:
        QMessageBox.critical(
            None,
            APP_TITLE,
            f"Chess Popup could not start its local game service.\n\n{error}",
        )
        return 1

    window = ChessPopupWindow(server_host, icon_path)
    window.show()
    return app.exec()


def main() -> int:
    args = parse_args()
    project_dir = resource_dir()
    data_dir = Path(args.data_dir).expanduser().resolve() if args.data_dir else default_data_dir()
    if args.smoke_test:
        return run_smoke_test(project_dir, data_dir, args.host, args.port)
    return run_desktop(project_dir, data_dir, args.host, args.port)


if __name__ == "__main__":
    raise SystemExit(main())
