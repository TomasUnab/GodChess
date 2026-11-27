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

## Roadmap por etapas

1. Núcleo de producto: dashboard, CCT, tablero local y persistencia de estado. **Entregado.**
2. Motor: Stockfish 17 single-thread, cliente tipado, cola/timeout/stop/quit y fuerza adaptada al rating. **Base entregada; falta incorporar el binario WASM.**
3. Entrenamiento: IndexedDB, diagnóstico de seis ejercicios, drills de visión, mates por motivo y perfil de errores. **Diagnóstico, perfil, foco, CCT validado e IndexedDB entregados; faltan los catálogos completos.**
4. Juego social: salas Node + ws y P2P PeerJS para invitar partidas o lecciones sin cuentas. **Servidor de salas base entregado; falta la UI de invitación P2P.**
5. Hardening: Vitest, sincronización resiliente, accesibilidad y auditoría final. **Build, tests y detector Impeccable pasan.**

## Impeccable

Se instaló con `npx skills add pbakaus/impeccable`. Se aplicó el flujo `init → layout → typeset → colorize → animate → critique → polish`. La auditoría del detector terminó con `impeccable detect --json` → `[]`. Verificación ejecutada: `npm install`, `npm run build` y `npm test` pasan; 1 archivo de tests y 2 tests correctos.

## Motor y multi-thread

Stockfish WASM single-thread se colocará en `public/engine/stockfish.js` y su WASM asociado. El modo multi-thread se activará opcionalmente sirviendo `coi-serviceworker.js` con aislamiento cross-origin; el modo por defecto sigue siendo single-thread para funcionar sin configuración adicional.

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
