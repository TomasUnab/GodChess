# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Vite + React 18 + TypeScript, Zustand, chess.js, Chessground, Stockfish 17.1 WASM (Worker), WebLLM opcional, Vitest, PeerJS. Publicado como sitio estático en GitHub Pages; cuentas, perfiles, sincronización y amigos en Supabase.

## Users
Jugadores desde principiantes absolutos (200 ELO) hasta aficionados de club que quieren entender por qué pierden, y los amigos con los que juegan y se retan.

## Product Purpose
Entrenamiento local de ajedrez que diagnostica las causas de las derrotas, prescribe trabajo diario y mide errores graves y piezas colgadas.

## Positioning
El contenido se adapta al perfil de errores real: el usuario no elige el tema; sus fallos deciden el siguiente drill.

## Operating Context
Se entra con cuenta (obligatoria desde 2026-11-27, decisión del propietario): la landing page pública explica el producto y el acceso pide iniciar sesión. El análisis, el motor y el entrenamiento siguen corriendo en el navegador; la cuenta sincroniza partidas, repertorio y progreso, y permite amigos, retos e invitaciones. Sin telemetría ni publicidad.

## Capabilities and Constraints
Incluye diagnóstico inicial de seis ejercicios, plan diario, partidas, escaneo CCT obligatorio, candidata antes de pista, visión, biblioteca de mates, diario de errores, métricas, bloqueos de aperturas y salas P2P. Motor siempre en Worker con Stockfish WASM local.

## Product Principles
- Entrenar la causa de la derrota, no el contenido consumido.
- Hacer visible el pensamiento antes de permitir la jugada.
- Medir errores graves y piezas colgadas.
- Calcular en el dispositivo y guardar en la nube solo lo que el usuario necesita entre dispositivos.
- Explicar los límites de la herramienta.

## Accessibility & Inclusion
Contraste AA, navegación por teclado, foco visible y alternativa sin movimiento para `prefers-reduced-motion`.
