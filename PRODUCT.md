# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Vite + React 18 + TypeScript, Zustand, Tailwind, react-chessboard, chess.js, framer-motion, Vitest, Node + ws, PeerJS.

## Users
Principiantes absolutos que quieren progresar desde 200 ELO, y sus invitados externos para partidas o lecciones concretas.

## Product Purpose
Entrenamiento local de ajedrez que diagnostica las causas de las derrotas, prescribe trabajo diario y mide errores graves y piezas colgadas.

## Positioning
El contenido se adapta al perfil de errores real: el usuario no elige el tema; sus fallos deciden el siguiente drill.

## Operating Context
Uso local sin cuentas ni telemetría. Las partidas sin red siguen funcionando; las invitaciones usan conexiones iniciadas por el usuario.

## Capabilities and Constraints
Incluye diagnóstico inicial de seis ejercicios, plan diario, partidas, escaneo CCT obligatorio, candidata antes de pista, visión, biblioteca de mates, diario de errores, métricas, bloqueos de aperturas y salas P2P. Motor siempre en Worker con Stockfish WASM local.

## Product Principles
- Entrenar la causa de la derrota, no el contenido consumido.
- Hacer visible el pensamiento antes de permitir la jugada.
- Medir errores graves y piezas colgadas.
- Funcionar localmente y explicar los límites de la herramienta.

## Accessibility & Inclusion
Contraste AA, navegación por teclado, foco visible y alternativa sin movimiento para `prefers-reduced-motion`.
