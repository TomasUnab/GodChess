---
version: 1
slug: "src-main-tsx"
primary_target: "src/main.tsx"
related_targets: ["src/styles.css"]
---

# GodChess app shell — surface brief

Scope: the whole web app (shell + Inicio, Análisis, Partidas, Repertorio, Entrenar, Jugar). Visitor mode: Operate. Desktop/laptop first; must still work at narrow widths.

Audience/job: adult beginners (from ~200 ELO) studying their own games in long sessions; analyse a game, find where it was lost, file the lesson, drill it. Constraints: offline at runtime (no CDN, fonts bundled), Stockfish in a Worker, data local.

Requested by user: implement En Croissant's analysis board, game report, game database and spaced-repetition repertoire, keep the trainer, and look professional.

## Direction contract

THESIS: Every analysis is set like a newspaper chess column — diagram, caption and annotated game in column rhythm. Refuses the category default of charcoal panels with a neon accent and floating cards.

OWN-WORLD: Cool grey newsprint ground (#e6e5e0), ink #161616 for the masthead band and rules, one spot red (#c8102e) reserved for mistakes/blunders, a teal-green (#1f6f5c) for correct/good states. Archivo with its width axis: condensed 900 caps for headlines and nameplate, normal width for UI; tabular figures everywhere. Visible column rules (1px ink) divide work areas; no rounded cards, no shadows. Board diagram: paper light squares, hatched dark squares like printed diagrams. Night edition: same system inverted on ink.

STORY: The visitor opens a game, sees the position as a printed diagram with its caption ("Juegan las blancas"), reads the game as a column (mainline bold, variations in parentheses, comments in italic), sees blunders in red with the engine's correction, and can save a line to the repertoire or drill it.

FIRST VIEWPORT: Black masthead 64px: condensed nameplate GODCHESS, tabs (Inicio, Análisis, Partidas, Repertorio, Entrenar, Jugar), date/engine status. Below, ruled columns: thin eval bar, board ~600px with caption rule beneath, notation column with kicker "Partida nº 0042", condensed headline of players, byline rule, the moves, accuracy figures and eval graph; right column engine lines (MultiPV 3), opening name and the primary action "Analizar partida completa".

FORM: Columna de ajedrez (newspaper chess column), position 4 on the ordered grounded list; seed:8a27a2a304e62cbc. Signature move: the move tree typeset as column notation with inline parenthesised variations and the printed diagram caption. Raises: flat ink fields own shell regions; catalogue numbers for every game; visible grid rules; signed tabular figures.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
