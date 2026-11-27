---
version: 1
slug: "src-main-tsx"
primary_target: "src/main.tsx"
related_targets: ["src/styles.css"]
---

# GodChess app shell — surface brief

Scope: the whole web app (shell + Inicio, Análisis, Partidas, Repertorio, Entrenar, Jugar). Visitor mode: Operate. Desktop/laptop first; must still work at narrow widths.

Audience/job: adult beginners (from ~200 ELO) studying their own games in long evening sessions; analyse a game, find where it was lost, file the lesson, drill it. Constraints: offline at runtime (fonts bundled), Stockfish in a Worker, data local.

History: the first world ("Columna de ajedrez", newsprint) was replaced at the user's request ("cambia el color… usa impeccable, tira el design para yo elegir"); the user picked the split-flap challenger on the decision page.

## Direction contract

THESIS: GodChess reads like a tournament hall's departures board: every figure that matters (evaluation, accuracy, counts, clocks) sits in split-flap cells that turn when the value changes. Refuses both the category's warm-charcoal Lichess clone and the previous newsprint page.

OWN-WORLD: Steel-frame dark ground (#16181b, panels #1d2024, frame #2a2d31), flap black #0b0b0d cells with letter-white #f2f2f2 figures and a hairline split, steel light #a7aaaf secondary text, delay amber #ffb000 for "now/attention" (active tab, primary action, ? mistakes), cancel red for ?? blunders, signal green for correct states. Archivo condensed caps with wide tracking for labels and headings; normal-width Archivo for reading text. A daylight edition keeps the black flaps and masthead on a light steel ground.

STORY: The visitor opens a game and reads the position like a board in the hall: the engine figure flips as Stockfish deepens, blunders show in red like cancelled services, mistakes in amber like delays; the report's accuracies and the home agenda are flap counters.

FIRST VIEWPORT: Black masthead with the GODCHESS nameplate set in flap tiles, condensed tabs with the active one amber-underlined. Analysis: eval bar, steel board, notation column, engine column whose line scores are flap cells; primary action amber.

FORM: Panel de salidas (split-flap concourse), dealt challenger signals-instruments-split-flap-concourse chosen by the user over assigned grounded candidate 7 (tournament demonstration wall board); seed:209ff2ade8814717. Signature move: split-flap figure cells with a flip on change. Raises carried from declined challengers: catalogue numbers on every game; visible frame grid; states stamp rather than vanish.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
