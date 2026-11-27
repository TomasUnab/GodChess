---
name: GodChess
description: Analizador y entrenador de ajedrez local, leído como el panel de salidas de una sala de torneo.
colors:
  quality-brilliant: "#26c2a3"
  quality-good: "#8fbf6a"
  quality-book: "#a88865"
  quality-inaccuracy: "#e6c34a"
  steel-ground: "#16181b"
  steel-ground-raised: "#1f2226"
  steel-well: "#0f1113"
  letter-white: "#f2f2f2"
  letter-white-hover: "#ffffff"
  steel-light: "#c4c6ca"
  steel-muted: "#a7aaaf"
  steel-rule: "#4a4e55"
  steel-rule-soft: "#2c3035"
  steel-frame: "#2a2d31"
  delay-amber: "#ffb000"
  delay-amber-hover: "#ffc233"
  flap-black: "#0b0b0d"
  cancel-red: "#ff4d5a"
  signal-green: "#3ccf6e"
  graph-white: "#d9dadc"
  wdl-draw: "#5b5e63"
  day-ground: "#e4e5e3"
  day-ground-raised: "#d6d8d7"
  day-well: "#f4f5f4"
  day-ink-hover: "#000000"
  day-ink-secondary: "#33363a"
  day-ink-muted: "#565a60"
  day-rule-soft: "#b9bcc0"
  day-cancel-red: "#b00020"
  day-signal-green: "#1d7a43"
  day-delay-amber: "#8a5d00"
  board-steel-light: "#e6e7e9"
  board-steel-dark: "#7d838b"
  board-diagram-light: "#f7f6f1"
  board-diagram-hatch: "#5a574f"
  board-diagram-hatch-ground: "#c9c5b9"
  board-ground: "#f4f3ef"
  board-coord-ink: "#2b2a27"
  board-ink: "#161616"
  board-diagram-lastmove: "#1f6f5c"
  board-check-red: "#c8102e"
  board-wood-light: "#f0d9b5"
  board-wood-dark: "#b58863"
  board-green-light: "#eeeed2"
  board-green-dark: "#769656"
  board-classic-lastmove: "#cdd26a"
  board-classic-selected: "#14551e"
typography:
  flap-figure:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.12
    fontVariation: "'wdth' 62"
  display-hero:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "clamp(52px, 5.4vw, 80px)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 62"
  display:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "52px"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 62"
  display-md:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 62"
  display-sm:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 900
    lineHeight: 0.95
    fontVariation: "'wdth' 62"
  figure:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1.05
    fontVariation: "'wdth' 75"
  figure-sm:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.05
    fontVariation: "'wdth' 75"
  title:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.1em"
    fontVariation: "'wdth' 62"
  section:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.12em"
    fontVariation: "'wdth' 62"
  lede:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.5
  movetext:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "16.5px"
    fontWeight: 450
    lineHeight: 1.8
    fontFeature: "'tnum'"
  body:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'tnum'"
  small:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.45
  tab:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 600
    letterSpacing: "0.1em"
    fontVariation: "'wdth' 75"
  caption:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 700
    letterSpacing: "0.07em"
  mono:
    fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace"
    fontSize: "13.5px"
    fontWeight: 400
rounded:
  none: "0px"
  flap: "2px"
  flap-tray: "3px"
  dot: "50%"
spacing:
  gutter: "24px"
  gutter-narrow: "16px"
  column: "22px"
  panel: "28px"
  masthead: "64px"
components:
  button-primary:
    backgroundColor: "{colors.delay-amber}"
    textColor: "{colors.flap-black}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.delay-amber-hover}"
    textColor: "{colors.flap-black}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.letter-white}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "38px"
  button-secondary-hover:
    backgroundColor: "{colors.steel-ground-raised}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.letter-white}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "38px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.letter-white}"
    typography: "{typography.small}"
    rounded: "{rounded.none}"
    padding: "0 9px"
    height: "32px"
  chip-on:
    backgroundColor: "{colors.letter-white}"
    textColor: "{colors.steel-ground}"
  input:
    backgroundColor: "{colors.steel-well}"
    textColor: "{colors.letter-white}"
    rounded: "{rounded.none}"
    padding: "8px 10px"
    height: "40px"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.steel-muted}"
    typography: "{typography.tab}"
    padding: "0 14px"
  tab-active:
    backgroundColor: "{colors.steel-ground}"
    textColor: "{colors.delay-amber}"
  flap-cell:
    backgroundColor: "{colors.flap-black}"
    textColor: "{colors.letter-white}"
    rounded: "{rounded.flap}"
    padding: ".05em .09em .02em"
  move-current:
    backgroundColor: "{colors.letter-white}"
    textColor: "{colors.steel-ground}"
    rounded: "{rounded.none}"
    padding: "1px 3px"
  toast:
    backgroundColor: "{colors.letter-white}"
    textColor: "{colors.steel-ground}"
    typography: "{typography.small}"
    padding: "12px 16px"
---

# Design System: GodChess

## Overview

**Creative North Star: "Panel de salidas"**

GodChess se lee como el panel de salidas de una sala de torneo. Todo número que importa (evaluación, precisión, recuentos, relojes) está compuesto en celdas de paleta partida que giran cuando el valor cambia; el resto de la interfaz es un bastidor de acero oscuro, plano y reticulado que sostiene esas cifras. El ámbar de retraso marca lo que ocurre ahora, el rojo de cancelación marca el error grave, el verde de señal marca lo correcto.

La densidad es de instrumento: columnas separadas por filetes, encabezados en versalitas condensadas con tracking amplio, texto de lectura en Archivo de ancho normal. No hay tarjetas flotantes ni sombras de elevación: la profundidad sale del marco (bordes de acero, pozos más oscuros, escalones de tono). La edición nocturna es la predeterminada; la edición diurna cambia el suelo a acero claro y conserva negros la cabecera y las paletas.

El mundo sustituye por completo a la anterior «Columna de ajedrez» de papel prensa y rechaza el clon carbón cálido de Lichess.

**Key Characteristics:**
- Cifras en paletas partidas negras con hendidura central, que giran una vez al cambiar.
- Suelo de acero oscuro con marco visible; columnas divididas por filetes.
- Ámbar para «ahora»: pestaña activa, acción principal, selección en el tablero de acero.
- Gravedad por glifo: ?? rojo, ? ámbar, ?! solo glifo.
- Archivo Variable: versalitas condensadas (wdth 62–75) para titulares y etiquetas, ancho normal para leer.
- Esquinas rectas en todo salvo las celdas de paleta (2px).

## Colors

Bastidor de acero casi neutro con tres señales saturadas de panel de aeropuerto: ámbar, rojo y verde.

### Primary
- **Ámbar de retraso** (delay-amber): la única voz de «ahora». Pestaña activa (texto y subrayado interior de 3px), fondo del botón principal, borde y texto del reloj que corre, subrayado de la subnavegación activa, contador de la pestaña activa, foco en la edición nocturna, y casilla de última jugada/selección en el tablero de acero (al 50% y 70%). Repasado al pasar el ratón con delay-amber-hover.

### Secondary
- **Rojo de cancelación** (cancel-red; diurno day-cancel-red): jugadas ?? y todo lo que es error grave: texto de la jugada, fondo de la jugada actual si es ??, cifras de errores graves, marcas del gráfico, mensajes de error, veredicto fallido, cursor de los campos de texto.
- **Ámbar de error** (delay-amber en la paleta, day-delay-amber como texto diurno): jugadas ? (token `--warn`).
- **Verde de señal** (signal-green; diurno day-signal-green): estados correctos, jugadas fuertes, cursor del gráfico de evaluación, veredicto acertado.

### Neutral
- **Suelo de acero** (steel-ground), **suelo elevado** (steel-ground-raised, hover de filas y botones) y **pozo** (steel-well, fondo de campos).
- **Blanco de letrero** (letter-white): tinta principal nocturna, cifra de las paletas, celda de la jugada actual. letter-white-hover para el hover de tinta.
- **Acero claro** (steel-light) para texto secundario y **acero apagado** (steel-muted) para terciario, metadatos y pestañas en reposo.
- **Filete** (steel-rule) y **filete suave** (steel-rule-soft) para divisiones; **marco** (steel-frame) para el borde de 3px del tablero y la barra de evaluación, y como filete en la edición diurna.
- **Negro de paleta** (flap-black): celdas de paleta, cabecera, texto sobre ámbar, perfil exterior del tablero, mitad negra de la barra de evaluación; es también la tinta de la edición diurna.
- **Blanco de gráfico** (graph-white) y **tablas** (wdl-draw) para el gráfico de evaluación y la barra victoria/tablas/derrota.
- **Edición diurna**: day-ground, day-ground-raised, day-well, day-ink-secondary, day-ink-muted, day-rule-soft, day-ink-hover; la tinta es flap-black y el foco también.

### Tableros
Cuatro temas, elegidos en la cabecera; Acero es el predeterminado.
- **Acero**: board-steel-light / board-steel-dark; última jugada y selección en ámbar (delay-amber al 50% y 70%).
- **Diagrama**: casillas claras board-diagram-light y oscuras rayadas a 45° con board-diagram-hatch sobre board-diagram-hatch-ground; fondo board-ground; última jugada, selección y hover de destino en verde azulado board-diagram-lastmove (al 42%, 58% y 32%).
- **Madera**: board-wood-light / board-wood-dark. **Verde**: board-green-light / board-green-dark. Ambos con última jugada board-classic-lastmove (62%) y selección board-classic-selected (50%).
- Comunes a todos: coordenadas en board-coord-ink; puntos de destino y etiqueta inferior de la barra de evaluación en board-ink (42% / 38%); jaque en degradado radial de board-check-red; anillos de Rayos X en board-check-red (colgada, sólido; débil, discontinuo) y board-diagram-lastmove (objetivo, discontinuo); etiqueta superior de la barra en board-ground.

### Superposiciones (excepciones documentadas)
Valores con alfa derivados de la paleta, no colores nuevos: hendidura de la paleta en flap-black/negro al 90% con brillo blanco al 6%; filo interior de la celda en blanco al 7%; hover del gráfico en board-diagram-lastmove al 18%; transparencias del tablero ya citadas arriba.

### Named Rules
**The Amber Is Now Rule.** El ámbar significa «ahora» o «atención»: la pestaña activa, la acción principal, el reloj que corre, la selección en el tablero de acero y las jugadas ?. Nunca decora; si no hay estado presente, no hay ámbar.

**The Severity By Glyph Rule.** La gravedad sigue al glifo de anotación: ?? en rojo de cancelación, ? en ámbar, ?! solo con su glifo y sin color. Ninguna otra señal se pinta de rojo o ámbar.

**The Black Flaps Rule.** Las paletas y la cabecera son negras en ambas ediciones, así que sus tonos (rojo, ámbar, verde, apagado) se fijan en los valores nocturnos aunque el suelo sea diurno.

## Typography

**Display Font:** Archivo Variable condensado (wdth 62%, con fallback Archivo, system-ui)
**Body Font:** Archivo Variable a ancho normal (wdth 100%)
**Label/Mono Font:** Archivo condensado para etiquetas; ui-monospace solo para FEN, PGN y código

**Character:** Una sola familia variable que hace de rótulo de andén en versalitas comprimidas y de texto de lectura tranquilo a ancho completo. Cifras tabulares en todo el cuerpo.

### Hierarchy
- **Display hero** (700, clamp(52px, 5.4vw, 80px), 1.02, wdth 62, mayúsculas, 0.06em): titular de Inicio.
- **Display** (700, 52px, 1.02, wdth 62, mayúsculas, 0.06em): encabezado de página. Baja a 40px en móvil.
- **Display md** (700, 44px): cabecera de partida y título de panel lateral; 40px bajo 1360px, 34px en móvil.
- **Display sm** (900, 40px, 0.95, wdth 62, mayúsculas): títulos de editor, importación y práctica.
- **Figure** (800, 34px, 1.05, wdth 75): cifras de precisión, estadísticas y agenda (en paletas).
- **Figure sm** (800, 28px, wdth 75): estado vacío, enunciado de ejercicio; también el tamaño del rótulo GODCHESS en paletas (20px en móvil).
- **Title** (700, 22px, wdth 62, mayúsculas, 0.1em): fases del recorrido; 22px también para veredictos y paletas de reloj.
- **Section** (700, 20px, wdth 62, mayúsculas, 0.12em): títulos de sección y pie del tablero; 20px para la puntuación de cada línea de motor.
- **Lede** (400, 18px en Inicio, 16.5px en páginas; 70ch máx.).
- **Movetext** (450/760 la línea principal, 16.5px, 1.8): notación de la partida; variantes a 15px.
- **Body** (400, 15px, 1.5): texto general, tablas, botones.
- **Small** (13.5px): metadatos, controles secundarios, pestañas (600, wdth 75, mayúsculas, 0.1em).
- **Caption** (12.5px): notas, leyendas; en mayúsculas con 0.08–0.12em para la fecha y la etiqueta del reloj.
- **Label** (700, 11.5px, mayúsculas, 0.07em): cabeceras de tabla, etiquetas de estadística, etiquetas de causa, insignias, coordenadas.

### Named Rules
**The Condensed Caps Rule.** Titulares, etiquetas y pestañas van condensados, en mayúsculas y con tracking amplio (0.06–0.12em). El texto que se lee (lede, notación, comentarios, consejos) va a ancho normal y en caja baja. No se mezclan dentro del mismo bloque.

**The Figures Flip Rule.** Solo las cifras que cambian (evaluación de líneas, precisión, errores graves, recuentos de agenda, relojes, estadísticas) y el rótulo GODCHESS van en paletas. Las frases nunca.

## Layout

Bastidor de cabecera fija de 64px (136px en móvil, con las pestañas en una rejilla de tres columnas) sobre un área principal con margen lateral de 24px (16px bajo 900px) y ancho máximo de 1320px. El análisis es una rejilla de cuatro columnas: barra de evaluación de 28px, tablero (hasta 760px, limitado por la altura de la ventana), columna de notación y columna de motor (290–370px), separadas por filetes verticales y con 22px de relleno. Bajo 1240px el motor pasa debajo; bajo 900px todo se apila.

Las vistas de trabajo (Entrenar, Jugar, práctica) usan tablero más panel lateral con 28px de separación y filete. Inicio es una portada de dos tercios más una columna «Hoy». Los separadores son filetes de 1px (suaves dentro de listas) y de 2px bajo cabeceras de página y de sección. Puntos de corte: 1600, 1360, 1240 y 900px.

## Elevation & Depth

Sistema plano. No hay sombras de elevación: la profundidad la dan el marco de acero de 3px del tablero con perfil negro de 1px, el pozo más oscuro de los campos y los escalones de tono del suelo. Las únicas sombras son interiores y funcionales.

### Shadow Vocabulary
- **Subrayado de pestaña** (`box-shadow: inset 0 -3px 0 var(--accent)`): pestaña activa de la cabecera.
- **Filo de paleta** (`box-shadow: inset 0 0 0 1px rgb(255 255 255 / .07)`): borde interior de cada celda.
- **Brillo de hendidura** (`box-shadow: 0 1px 0 rgb(255 255 255 / .06)`): bajo la línea central de la celda.
- **Halo de marca** (`box-shadow: 0 0 0 2px var(--paper)`): separa las marcas de error del gráfico de evaluación.

### Named Rules
**The Frame Not Float Rule.** Nada flota. Un panel se distingue por su filete o su marco, no por una sombra proyectada.

## Shapes

Geometría rectangular de panel. Botones, campos, chips, pestañas, tablero y avisos tienen esquinas rectas (0px). Las únicas curvas del mundo son las celdas de paleta (2px), que imitan la tarjeta física del indicador, y los puntos de gravedad de la leyenda y del gráfico (círculo, 50%). Los estados se sellan con un borde de 1–2px del color del estado (veredicto, aviso de error, reloj activo), no desaparecen.

**The Two Pixel Rule.** 2px de radio en las celdas de paleta y 3px en la bandeja de acero (#2a2d31) que las agrupa. Cualquier otra superficie va recta; el círculo queda reservado a los puntos de gravedad. Las cifras del motor van a 24px.

## Components

### Buttons
- **Shape:** rectos (0px), 42px de alto el principal y 38px los demás.
- **Primary:** fondo ámbar, texto negro de paleta, borde ámbar, 650, 15px, tracking 0.04em; hover a delay-amber-hover. Es la acción de «ahora» y hay una por zona.
- **Secondary:** transparente con borde de tinta de 1px; hover al suelo elevado.
- **Ghost:** sin borde visible; hover muestra el filete suave.
- **Icon:** 36px cuadrado, borde que aparece en hover; la variante peligrosa vira a rojo.
- **Focus:** contorno de 2px en el color de foco con 2px de separación (dentro de la cabecera, letter-white a -4px).
- **Transiciones:** fondo, borde y color a .15s ease-out. Deshabilitado al 45% de opacidad.

### Chips
- **Style:** 32px de alto, borde de filete suave, 700, 13.5px. Seleccionado: fondo de tinta, texto del suelo. Usados para las NAG de anotación.

### Inputs / Fields
- **Style:** pozo (steel-well) con borde de 1px en tinta terciaria, rectos, 40px.
- **Focus:** contorno de 2px de foco sin separación y borde a tinta. Cursor de texto en rojo de cancelación.
- **Selects:** misma caja; en la cabecera, fondo negro de paleta y borde apagado.

### Navigation
- **Pestañas de cabecera:** condensadas, 600, 13.5px, mayúsculas, 0.1em, apagadas en reposo y blancas en hover. La activa toma el suelo de la página, texto ámbar y subrayado interior ámbar de 3px; su insignia pasa a ámbar.
- **Subnavegación:** filete inferior; la activa en tinta con subrayado ámbar de 3px.
- **Segmentos:** grupo enmarcado en tinta; el activo se invierte a fondo de tinta.

### Notation
- **Jugada actual:** celda iluminada en blanco de letrero con texto del suelo (en la edición diurna, tinta negra). Si es ?? la celda es roja; si es ?, ámbar.
- **Gravedad:** ?? texto rojo, ? texto ámbar, ?! solo el glifo; jugadas fuertes en verde.

### Board frame
- Marco de acero de 3px y perfil negro de 1px, sin radio. Selector de tema en la cabecera: Acero (predeterminado), Diagrama, Madera, Verde. Barra de evaluación de 28px con el mismo marco; su relleno se anima en altura a .35s cubic-bezier(.2, .8, .2, 1).

### Split-flap figure (signature)
Cada carácter es su propia celda negra de paleta con radio de 2px, cifra blanca condensada (wdth 62, 700) y una hendidura de 1px a media altura. Los espacios son huecos sin celda. Al cambiar un carácter, solo esa celda se remonta y gira una vez (`flap-turn`, .26s cubic-bezier(.3, .7, .25, 1): de rotateX(-88deg) con brillo 1.8 a reposo). Tonos: rojo (errores graves), ámbar, verde, apagado (puntuaciones negativas), todos fijos en valores nocturnos. Aparece en el rótulo GODCHESS, las líneas del motor, la precisión, la agenda de Inicio, las estadísticas y los relojes.

### Toast
Bloque recto de tinta con texto del suelo, 600, 13.5px, centrado abajo; entra con opacidad y 12px de desplazamiento a .2s.

### Motion
Controles a .15s ease-out, barras a .35s, aviso a .2s, paleta a .26s, esqueleto de carga en barrido de 1.4s. Con `prefers-reduced-motion: reduce` todas las transiciones y animaciones se anulan.

## Do's and Don'ts

### Do:
- **Do** componer en paletas toda cifra que cambie y dejar que solo el carácter cambiado gire (.26s).
- **Do** reservar el ámbar para lo que ocurre ahora: pestaña activa, acción principal, reloj que corre, selección en el tablero de acero, jugadas ?.
- **Do** colorear la gravedad por glifo: ?? rojo, ? ámbar, ?! solo glifo.
- **Do** usar versalitas condensadas con tracking 0.06–0.12em para titulares y etiquetas, y Archivo a ancho normal para leer.
- **Do** separar zonas con filetes de 1px y 2px y enmarcar el tablero con acero de 3px.
- **Do** mantener las paletas y la cabecera negras en la edición diurna.
- **Do** anular toda animación con prefers-reduced-motion.

### Don't:
- **Don't** redondear nada salvo las celdas de paleta (2px) y los puntos de gravedad.
- **Don't** usar sombras proyectadas para separar paneles.
- **Don't** usar ámbar o rojo como decoración o para señales que no sean «ahora» o gravedad.
- **Don't** poner frases o párrafos en paletas.
- **Don't** volver al papel prensa de «Columna de ajedrez» ni al carbón cálido tipo Lichess.

**Calidad de jugada.** En Estadísticas, cada categoría lleva su color de dato (solo como muestra junto a un glifo y una cifra, nunca como fondo de texto): brillante #26c2a3, mejor #3ccf6e, excelente y buena #8fbf6a, teoría #a88865, imprecisión #e6c34a, error #ffb000, error grave #ff4d5a.
