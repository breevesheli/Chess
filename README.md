# Mered

This repository contains **Mered** — an Electron chess game set in the Kingdom
of Aurveld, with a five-chapter Story Mode playable in both its original 2D
presentation and a fully 3D presentation (walkable chapter hubs, matches on a
board inside each scene).

Everything lives in [`mered/`](mered/):

| Where | What |
| --- | --- |
| `mered/README.md` | Quick start, dev workflow |
| `mered/docs/` | Game design doc, Steam setup, 3D Story Mode build spec |
| `mered/renderer/` | The game (`chess_ui.html` + `chess_visuals.js`) |
| `mered/renderer/story3d/` | 3D Story Mode (architecture in its README) |
| `mered/engine/` | Stockfish binary (not committed — see .gitignore) |
| `mered/tests/` | Unit tests (`npm test`) |

Run it:

```bash
cd mered
npm install
npm start
```

Verification: `npm test` · `npm run smoke` (2D harness) · `npm run smoke3d`
(3D harness).

> The legacy Python "Chess Popup" prototype that used to live at this level
> was removed once Mered superseded it (recoverable from git history).
