# GodChess

GodChess is a browser-based chess trainer focused on reducing hanging pieces and serious mistakes. It includes an adaptive dashboard, CCT training, candidate moves, an offline board, metrics, a journal, and invitation games.

## Use the web app

No installation is required to use GodChess. Open the published website in a modern browser and start playing. The app runs entirely in the browser and does not require a desktop application.

## Features

- **Analysis**: move trees, variations, comments, NAG evaluations, keyboard navigation, PGN/FEN import and export, opening names, Stockfish 17.1 with 1–5 MultiPV lines, an evaluation bar, W/D/L probabilities, a position editor, screenshot-based board reading, and shareable PGN/FEN links.
- **Game reports**: Stockfish analysis at depths 10/14/18, Lichess-style accuracy, inaccuracies, mistakes and blunders, best-line variations, and a navigable evaluation graph.
- **Games**: import games from Lichess or Chess.com, analyze games without evaluations, train your chess double, store games in IndexedDB, view statistics, import PGN files by drag and drop, and search, filter, and sort games.
- **Repertoire**: save lines for either color and practice them with spaced repetition. “My Tree” summarizes your games by position, while “Masters” explores millions of games by 2400+ rated players. The opening explorer contains 3,865 openings.
- **Training**: a phase-based learning path, piece lessons, six-position diagnosis, CCT puzzles, time trials, vision drills, a checkmate library, “My Mistakes”, “Guess the Move”, and an error journal.
- **Play**: an adaptive bot starting around 250 rating, your chess double trained from your games, and peer-to-peer invitation games.

## Design

The visual direction is an “airport departure board”: GodChess feels like the board in a tournament room. Important figures use palette cells that flip when they change. Amber indicates active elements and errors ('?'); red indicates blunders ('??'). Dark mode is the default, with a light mode and Steel, Diagram, Wood, and Green board themes. Archivo is bundled locally. See DESIGN.md for details.

## Privacy and accounts

The public landing page is available without an account. Accounts use Supabase with email/password, Google, or GitHub. Once signed in, games, repertoire, progress, preferences, and your chess double can sync to your account. In **Play → Friends**, users can search for players, add them, and challenge them to direct browser-to-browser games.

Training progress and preferences are stored locally, while training data uses IndexedDB. Only connections initiated by the user can leave the device. Row Level Security rules in supabase/schema.sql ensure that each user can only read and modify their own data. Configuration details are in supabase/README.md.

## Assistant

The **Assistant** answers questions about the open game and your statistics using the Stockfish report, game autopsy, statistics, and error-specific advice. On browsers with WebGPU, it can optionally use local AI through WebLLM. The one-time model download is about 1 GB and data stays in the browser.

## Publishing on GitHub Pages

The repository includes .github/workflows/pages.yml. To publish the web app:

1. Push the repository to GitHub on the main branch.
2. Open **Settings → Pages** and choose **GitHub Actions** as the source.
3. Every push to main will test, build, and publish the site at https://<user>.github.io/<repository>/.

The published app consists of static files. It uses relative paths (base: './'), Stockfish WebAssembly, and data in public/data/. Because GitHub Pages does not provide COOP/COEP headers, public/coi-serviceworker.js adds them in the browser; the first visit may reload the page once. Invitations use PeerJS’s public signaling server.

## Optional local development

These commands are **not required to use the published website**. They are only for contributors who want to run or test the project locally:

```bash
npm install
npm run dev
npm run build
npm test
```

Stockfish 17.1 runs in a Web Worker. With cross-origin isolation it uses up to four threads; otherwise it falls back to the single-threaded engine in public/engine/. If you use another server, configure Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp.

## Local datasets

- Openings: lichess-org/chess-openings (CC0), vendored in public/data/openings/.
- Puzzles with source games: mcognetta/lichess-combined-puzzle-game-db (CC0), with a 50,000-puzzle sample.
- Masters explorer: the Lichess Elite Database from database.nikonoel.fr, containing games by 2400+ rated players.

Original downloads belong in data/raw/ and are not committed to Git.
