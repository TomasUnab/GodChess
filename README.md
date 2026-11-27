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

- **Análisis**: árbol de jugadas con variantes, comentarios y valoraciones (NAG), navegación con teclado (←/→, Inicio/Fin, F para girar, espacio juega la mejor línea), importación y exportación PGN/FEN, nombre de apertura (base Lichess CC0), Stockfish 17.1 con 1–5 líneas (MultiPV) y barra de evaluación. Probabilidades de ganar, empatar y perder (W/D/L). Editor de posición y lectura de posiciones desde capturas de tableros digitales. Enlaces compartibles: `#pgn=<PGN codificado>` o `#fen=<FEN>`.
- **Informe de partida**: análisis completo con Stockfish (profundidad 10/14/18), precisión por jugador con las fórmulas de Lichess, imprecisiones, errores y errores graves marcados en la notación, la mejor línea del motor añadida como variante y gráfica de evaluación navegable.
- **Partidas**: importación directa desde Lichess o Chess.com por usuario (descarga, analiza con Stockfish las que no traigan evaluación y entrena a tu doble con un solo botón; la conexión solo se hace al pulsarlo), base local en IndexedDB y «Tus estadísticas» (mapa de calor de tus errores, errores por fase, primera pieza que pierdes, cuándo rendirse y nivel estimado por partida; analiza en lote las partidas pendientes); importa archivos PGN con muchas partidas (arrastrar y soltar), búsqueda, filtros y orden por columnas. Las partidas contra el motor y por invitación se guardan solas.
- **Repertorio**: guarda líneas desde el análisis (con blancas o negras) y practícalas con repetición espaciada; «Mi árbol» resume tus partidas por posición (qué juegas y cómo puntúa); «Maestros» es un explorador con millones de partidas de jugadores 2400+ que cubre todas las aperturas con nombre y permite saltar a cualquiera; explorador de 3.865 aperturas.
- **Entrenar**: camino por fases, lecciones de piezas, diagnóstico de seis posiciones, puzzles con escaneo CCT obligatorio y su partida de origen, contrarreloj, drill de visión, biblioteca de mates y «Mis errores» (tus fallos como puzzles), «Adivina la jugada» con puntuación de Stockfish y diario de errores con los intentos reales.
- **Jugar**: partida lenta contra un bot que empieza en su nivel mínimo (≈250) y se adapta a tus resultados (bajo 1320 imita a un jugador más débil eligiendo entre las candidatas de Stockfish con imprecisión y errores; al entrar por primera vez, Inicio te pide jugar esa partida), **contra tu doble** (un rival entrenado con tus partidas: repite tus aperturas y, fuera de ellas, elige entre las candidatas de Stockfish según tu perfil de errores por fase; es un modelo estadístico, no una red neuronal) y partidas P2P por invitación (`npm run server` arranca el PeerServer local).

## Diseño

Dirección visual «Panel de salidas»: GodChess se lee como el panel de una sala de torneo. Las cifras importantes (evaluación, precisión, contadores, relojes) van en celdas de paleta que giran al cambiar; el ámbar marca lo activo y los errores «?», el rojo los errores graves «??». Edición oscura por defecto y edición de día; tableros Acero, Diagrama, Madera y Verde. Tipografía Archivo autoalojada. Detalles en `DESIGN.md`.

## Impeccable

Se instaló con `npx skills add pbakaus/impeccable`. Se aplicó el flujo `init → layout → typeset → colorize → animate → critique → polish`. La auditoría del detector terminó con `impeccable detect --json` → `[]`. Verificación: `npm run build` y `npm test` pasan (32 tests).

## Publicar en GitHub Pages

1. Sube el repositorio a GitHub (rama `main`).
2. En el repositorio: **Settings → Pages → Source: GitHub Actions**.
3. Cada `push` a `main` ejecuta `.github/workflows/pages.yml`: instala, pasa los tests, construye y publica en `https://<usuario>.github.io/<repositorio>/`.

Todo funciona como archivos estáticos: rutas relativas (`base: './'`), Stockfish en WebAssembly y datos en `public/data/`. Pages no permite cabeceras COOP/COEP, así que `public/coi-serviceworker.js` las añade desde el navegador y Stockfish corre multihilo (la primera visita recarga la página una vez). «Invitar a alguien» no funciona en Pages: necesita el PeerServer local (`npm run server`).

## Asistente

El botón **Asistente** de la cabecera responde preguntas sobre la partida abierta y tus estadísticas («¿qué táctica encontraste?», «¿cuáles fueron mis mejores jugadas?», «¿cómo evito esos errores?»). Siempre funciona: responde con el informe de Stockfish, la autopsia, tus estadísticas y una guía de consejos por tipo de error. Si el navegador tiene WebGPU (Chrome, Edge), puede activar una IA local (Qwen2.5 1.5B con WebLLM, descarga única de ~1 GB desde Hugging Face) que redacta esas mismas respuestas con más naturalidad; nada sale del navegador.

## Motor y multi-thread

Stockfish 17.1 corre siempre en un Web Worker. Con aislamiento de origen cruzado (`Cross-Origin-Opener-Policy: same-origin` y `Cross-Origin-Embedder-Policy: require-corp`, que `npm run dev` y `npm run preview` ya envían) usa la versión multihilo con hasta 4 hilos, unas 4 veces más rápida; sin esas cabeceras vuelve sola a la versión de un hilo de `public/engine/`. La versión multihilo (~79 MB) no está en git: `npm run engine:copy` (se ejecuta solo antes de `dev`, `build` y `preview`) la copia desde `node_modules/stockfish` a `public/engine/mt/`. Si sirves la app con otro servidor, añade esas dos cabeceras.

## Privacidad

No hay backend de cuentas ni telemetría. Progreso y ajustes irán a localStorage; datos de entrenamiento a IndexedDB. Solo las conexiones que el usuario inicie podrán salir del dispositivo.

## Datasets locales

- Aperturas: `lichess-org/chess-openings` (CC0) vendorizadas en `public/data/openings/` (commit `48a8c0e733facfdc9a3723fe882e51ec28014074`).
- Puzzles con partida de origen: `mcognetta/lichess-combined-puzzle-game-db` (CC0), muestra de 50.000 puzzles. `npm run puzzles:origins` genera `public/data/puzzles/index.json` (8.790 puzzles repartidos por rating y tema) y `origins.json` (jugadas hasta el puzzle y continuación, jugadores, ratings, ritmo y fecha).
- Explorador de maestros: Lichess Elite Database (database.nikonoel.fr, partidas de Lichess de jugadores 2400+). Descarga los meses que quieras a `data/raw/lichess_elite_AAAA-MM.zip` y ejecuta `npm run masters:build`: extrae cada mes en paralelo (con caché en `data/raw/partials/`), suma todos y reparte el resultado en 64 archivos en `public/data/masters/shards/`, que la app carga por posición. Cubre todas las aperturas con nombre de `chess-openings` hasta su última jugada, aunque los maestros las jueguen poco; el resto de posiciones necesita 5 o más partidas.
- Las descargas originales van a `data/raw/` (fuera de git). ChessTempo no se copia: no ofrece descarga masiva autorizada.
