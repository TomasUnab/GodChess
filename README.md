# GodChess

Entrenador local de ajedrez orientado a reducir piezas colgadas y errores graves. Esta primera etapa entrega el núcleo de producto navegable: resumen adaptativo, sesión CCT obligatoria, candidata de jugada, tablero offline, métricas, diario e invitación.

## Ejecutar

```bash
npm install
npm run dev
npm run build
npm test
```

La instalación no incluye CDN ni fuentes remotas en runtime. El motor previsto vive en `/public/engine/` y será ejecutado siempre desde un Web Worker.

## Qué incluye

GodChess combina el entrenador para principiantes con un tablero de análisis inspirado en las funciones de En Croissant (implementación propia; En Croissant es solo referencia funcional).

- **Análisis**: árbol de jugadas con variantes, comentarios y valoraciones (NAG), navegación con teclado (←/→, Inicio/Fin, F para girar, espacio juega la mejor línea), importación y exportación PGN/FEN, nombre de apertura (base Lichess CC0), Stockfish 17.1 con 1–5 líneas (MultiPV) y barra de evaluación. Enlaces compartibles: `#pgn=<PGN codificado>` o `#fen=<FEN>`.
- **Informe de partida**: análisis completo con Stockfish (profundidad 10/14/18), precisión por jugador con las fórmulas de Lichess, imprecisiones, errores y errores graves marcados en la notación, la mejor línea del motor añadida como variante y gráfica de evaluación navegable.
- **Partidas**: base local en IndexedDB; importa archivos PGN con muchas partidas (arrastrar y soltar), búsqueda, filtros y orden por columnas. Las partidas contra el motor y por invitación se guardan solas.
- **Repertorio**: guarda líneas desde el análisis (con blancas o negras) y practícalas con repetición espaciada; explorador de 3.865 aperturas.
- **Entrenar**: camino por fases, lecciones de piezas, diagnóstico de seis posiciones, puzzles con escaneo CCT obligatorio, drill de visión, biblioteca de mates y diario de errores con los intentos reales.
- **Jugar**: partida lenta contra Stockfish con fuerza adaptada y partidas P2P por invitación (`npm run server` arranca el PeerServer local).

## Diseño

Dirección visual «Columna de ajedrez»: el análisis se compone como la columna de ajedrez de un diario (diagrama con casillas rayadas, pie «Juegan las blancas», partida en notación de columna). Papel prensa gris, tinta negra, un rojo directo reservado para los errores y una edición nocturna. Tipografía Archivo autoalojada (sin peticiones de red). Detalles en `DESIGN.md`.

## Impeccable

Se instaló con `npx skills add pbakaus/impeccable`. Se aplicó el flujo `init → layout → typeset → colorize → animate → critique → polish`. La auditoría del detector terminó con `impeccable detect --json` → `[]`. Verificación: `npm run build` y `npm test` pasan (32 tests).

## Motor y multi-thread

Stockfish 17.1 WASM single-thread está en `public/engine/` y se ejecuta siempre en un Web Worker. El modo multi-thread se activará opcionalmente sirviendo `coi-serviceworker.js` con aislamiento cross-origin; el modo por defecto sigue siendo single-thread para funcionar sin configuración adicional.

## Privacidad

No hay backend de cuentas ni telemetría. Progreso y ajustes irán a localStorage; datos de entrenamiento a IndexedDB. Solo las conexiones que el usuario inicie podrán salir del dispositivo.

## Datasets locales

Las aperturas de `lichess-org/chess-openings` están vendorizadas en `public/data/openings/` desde el commit `48a8c0e733facfdc9a3723fe882e51ec28014074`. La base de puzzles se descarga desde `https://database.lichess.org/lichess_db_puzzle.csv.zst`; su transferencia actual quedó pendiente porque el servidor entregó rangos inconsistentes y `zstd -t` detectó corrupción. No se integra ningún archivo hasta pasar esa validación. ChessTempo no se copia: su página no ofrece una descarga masiva autorizada visible.
# Nota de licencias

GodChess usa `@lichess-org/chessground` para el tablero interactivo. Chessground
se distribuye bajo GPL-3.0-or-later; cualquier distribución de GodChess que lo
incluya debe respetar esa licencia y conservar sus avisos correspondientes.

GodChess se distribuye bajo GPL-3.0-or-later. Las funciones de repertorio,
análisis local, PGN y repetición espaciada se implementan dentro de GodChess;
En Croissant se usa como referencia funcional, no como código embebido.
