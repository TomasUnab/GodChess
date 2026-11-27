---
name: GodChess
description: Analizador y entrenador de ajedrez local, compuesto como una columna de ajedrez de periódico.
colors:
  newsprint: "#e6e5e0"
  newsprint-shade: "#dddcd6"
  sheet: "#f4f3ef"
  ink: "#161616"
  ink-hover: "#000000"
  ink-secondary: "#3d3b37"
  ink-tertiary: "#5c5a54"
  rule: "#161616"
  rule-soft: "#b7b4ab"
  spot-red: "#c8102e"
  warn-amber: "#8a5a00"
  good-teal: "#1f6f5c"
  mast: "#161616"
  mast-ink: "#e6e5e0"
  mast-muted: "#a9a79f"
  diagram-hatch: "#97948b"
  diagram-hatch-ground: "#d3d0c7"
  night-newsprint: "#151514"
  night-newsprint-shade: "#1f1f1d"
  night-sheet: "#232321"
  night-ink: "#e6e5e0"
  night-ink-secondary: "#c9c7c0"
  night-ink-tertiary: "#9d9a92"
  night-rule-soft: "#3a3935"
  night-spot-red: "#ff6b6b"
  night-warn-amber: "#e3a84a"
  night-good-teal: "#5cc4a8"
typography:
  display:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "52px"
    fontWeight: 900
    lineHeight: 0.94
    letterSpacing: "0em"
    fontVariation: "'wdth' 62"
  nameplate:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 62"
  headline:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1.05
    fontVariation: "'wdth' 75"
  title:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1.1
    fontVariation: "'wdth' 75"
  body:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'tnum'"
  movetext:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "16.5px"
    fontWeight: 450
    lineHeight: 1.8
    fontFeature: "'tnum'"
  label:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "0.07em"
  display-hero:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "80px"
    fontWeight: 900
    lineHeight: 0.94
    fontVariation: "'wdth' 62"
  display-md:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 900
    lineHeight: 0.94
    fontVariation: "'wdth' 62"
  display-sm:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 900
    lineHeight: 0.95
    fontVariation: "'wdth' 62"
  headline-sm:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.05
    fontVariation: "'wdth' 75"
  figure:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 800
    lineHeight: 1.1
    fontVariation: "'wdth' 75"
  lede:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.45
  meta:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.4
  mono:
    fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: "0px"
spacing:
  hair: "2px"
  xs: "6px"
  sm: "8px"
  md: "14px"
  lg: "22px"
  gutter: "24px"
  column: "28px"
  masthead: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.newsprint}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "38px"
  button-secondary-hover:
    backgroundColor: "{colors.newsprint-shade}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "38px"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    size: "36px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 9px"
    height: "32px"
  chip-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.newsprint}"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "8px 10px"
    height: "40px"
  masthead:
    backgroundColor: "{colors.mast}"
    textColor: "{colors.mast-ink}"
    height: "{spacing.masthead}"
    padding: "0 24px"
  masthead-tab-on:
    backgroundColor: "{colors.newsprint}"
    textColor: "{colors.ink}"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.newsprint}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
  move-current:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.newsprint}"
    rounded: "{rounded.none}"
    padding: "1px 3px"
  move-blunder-current:
    backgroundColor: "{colors.spot-red}"
    textColor: "{colors.newsprint}"
  move-mistake-current:
    backgroundColor: "{colors.warn-amber}"
    textColor: "{colors.newsprint}"
  eval-bar:
    backgroundColor: "{colors.ink}"
    width: "28px"
---

# Design System: GodChess

## Overview

**Creative North Star: "Columna de ajedrez"**

Cada análisis se compone como la columna de ajedrez de un periódico: diagrama impreso, pie de diagrama y partida comentada en ritmo de columna. La página es papel de periódico gris frío, la tinta es casi negra y la estructura la ponen filetes visibles (rules), no paneles. Un solo color de imprenta, el rojo, se reserva para el error; el verde azulado marca lo correcto. Todo lo demás es tinta sobre papel.

La densidad es la de una sección de periódico: columnas separadas por filetes de 1px, cabeceras condensadas en mayúsculas, cifras tabulares, listas y tablas con filetes suaves entre filas. Los campos planos de tinta (la mancheta, el botón primario, la jugada actual, el toast) son los únicos bloques de color sólido; marcan dónde está el lector.

El sistema rechaza el default de la categoría: paneles carbón con acento neón y tarjetas flotantes. No hay sombras, no hay radios, no hay tarjetas. La edición nocturna es el mismo sistema invertido sobre tinta, no un tema distinto.

**Key Characteristics:**
- Papel de periódico frío, tinta casi negra, un rojo de imprenta para errores.
- Filetes visibles (2px tinta para cabeceras, 1px tinta para columnas, 1px suave para filas).
- Archivo con eje de anchura: condensado 62–75% para titulares y cifras, anchura normal para la interfaz.
- Tablero como diagrama impreso: casillas oscuras rayadas, marco de 2px.
- Notación de la partida compuesta como texto de columna, variantes en línea.
- Esquinas rectas, superficies planas, cero sombras de elevación.

## Colors

Tinta sobre papel de periódico, con tres tintas funcionales de severidad y nada decorativo.

### Primary
- **Tinta de columna** (ink, #161616): texto principal, filetes de cabecera y columna, botón primario, chip activo, jugada actual, toast, mancheta. Es a la vez el color de texto y el color de acción; la jerarquía de acción viene de relleno contra contorno, no de un acento.

### Secondary
- **Rojo de imprenta** (spot-red, #c8102e): solo errores graves. Jugada `??`, conteo de errores graves, marcas del gráfico de evaluación, piezas colgadas en Rayos X, jaque, mensajes de error de formulario, el caret de los campos de texto.
- **Ámbar de corrección** (warn-amber, #8a5a00): solo la imprecisión `?`. Jugada, hallazgo y comentario del entrenador marcados como error leve.

### Tertiary
- **Verde azulado de acierto** (good-teal, #1f6f5c): estados correctos y mejores. Jugadas `!` y `!!`, veredicto correcto, cursor del gráfico, última jugada y casilla seleccionada en el tablero, objetivos ganables en Rayos X.

### Neutral
- **Papel de periódico** (newsprint, #e6e5e0): fondo de página.
- **Sombra de papel** (newsprint-shade, #dddcd6): hover de filas, listas, jugadas y botones secundarios; fondo de contadores.
- **Hoja** (sheet, #f4f3ef): interior de campos de texto y casillas claras del diagrama.
- **Tinta segunda** (ink-secondary, #3d3b37): cuerpo de texto secundario, variantes, comentarios, etiquetas de campo.
- **Tinta tercera** (ink-tertiary, #5c5a54): metadatos, cabeceras de tabla, placeholders, borde de campos.
- **Filete suave** (rule-soft, #b7b4ab): separadores entre filas, borde de chips, pista de la barra de progreso.
- **Mancheta** (mast #161616, mast-ink #e6e5e0, mast-muted #a9a79f): la banda superior es un campo plano de tinta con texto de papel; las pestañas inactivas en gris de mancheta.

La edición nocturna (prefers-color-scheme: dark, salvo `[data-theme='light']`, y `[data-theme='dark']` explícito) redefine los mismos tokens: papel #151514, hoja #232321, tinta #e6e5e0, filete suave #3a3935, y versiones más claras de las tintas funcionales (rojo #ff6b6b, ámbar #e3a84a, verde #5cc4a8). La mancheta se invierte a banda clara con texto oscuro.

### Named Rules
**The One Spot Colour Rule.** El rojo existe solo para el error grave. No se usa en botones, enlaces, decoración ni marca. Si algo es rojo, el jugador se equivocó o algo está en peligro.

**The Glyph Decides Rule.** El color de una jugada sigue a su signo: `??` rojo, `?` ámbar, `?!` solo su signo en tinta, `!` y `!!` verde. Nunca se colorea una dudosa como error.

**The Ink Is Action Rule.** No hay color de acento para acciones. La acción primaria es tinta rellena; la secundaria, tinta en contorno.

## Typography

**Display Font:** Archivo Variable, autoalojada con eje de anchura (`@fontsource-variable/archivo/wdth.css`), con Archivo y system-ui de respaldo
**Body Font:** la misma Archivo Variable a anchura normal (100%)
**Label/Mono Font:** ui-monospace (SFMono, Menlo, Consolas) solo para FEN, PGN y códigos

**Character:** Una sola familia grotesca que hace de titular de periódico cuando se condensa y de interfaz legible cuando no. Las cifras son tabulares en todo el documento (`font-variant-numeric: tabular-nums` en `body`).

### Hierarchy
- **Display** (900, anchura 62%, 52px en cabecera de página; 44px en paneles laterales; 44px nombres de jugadores (40px por debajo de 1360px); clamp(52px, 5.4vw, 80px) en el titular de portada; line-height .94, mayúsculas, text-wrap balance): títulos de página, nombres de la partida, mancheta GODCHESS (34px).
- **Headline** (800, anchura 75%, 34px, line-height 1.05): cifras grandes: precisión, estadísticas, agenda, evaluación de líneas del motor (20px).
- **Title** (800, anchura 75%, 20–28px, line-height 1.1): títulos de sección (22px), pie de diagrama en mayúsculas (20px), veredictos (22px), estados vacíos (28px), enunciados de ejercicio (30px).
- **Body** (400, 15px, line-height 1.5, medida 62–70ch): texto de interfaz; lede 16–18px en tinta segunda.
- **Movetext** (450 variantes / 760 línea principal, 16.5px, line-height 1.8): la partida como texto corrido; variantes 15px; comentarios en cursiva.
- **Label** (700, 11.5px, tracking .07em, mayúsculas): cabeceras de tabla, etiquetas de estadística, causa del hallazgo, estado de unidad. Solo etiquetas de datos cortas.

### Named Rules
**The Condensed Means Headline Rule.** La anchura 62% en 900 es solo para titulares y la mancheta; 75% en 800 para cifras y títulos de sección. Los controles y el texto de lectura van siempre a anchura normal.

**The Tabular Figures Rule.** Toda cifra (evaluación, precisión, reloj, número de partida, recuento) usa cifras tabulares, para que las columnas de números alineen como en una tabla impresa.

## Layout

Columnas separadas por filetes, no por huecos ni contenedores. La mancheta es una banda fija de 64px (100px y en dos filas por debajo de 900px). El contenido vive en una página de máximo 1320px con margen de 24px (16px en móvil).

El análisis es una rejilla de cuatro columnas: barra de evaluación de 28px, tablero (`--board`: min(alto disponible − 140px, 44vw, 760px)), columna de notación (mínimo 300px) y columna de motor (290–370px), divididas por filetes de 1px en tinta. Las vistas de trabajo (entrenar, jugar, práctica) usan tablero (`--board-sm`, hasta 600px) más panel lateral con filete izquierdo y 28px de separación. La portada es 2fr / 1fr con filete vertical.

Por debajo de 1240px la columna del motor baja bajo el tablero con un filete de 2px encima; por debajo de 900px todo pasa a una columna, los filetes verticales desaparecen y el tablero ocupa el ancho. El ritmo vertical es pequeño y regular (6, 8, 10, 14, 22px).

## Elevation & Depth

Plano. No hay sombras de elevación en ningún componente. La profundidad la ponen los filetes (2px tinta sobre cabeceras, informes y cierres; 1px tinta entre columnas; 1px suave entre filas) y los campos planos de tinta para el estado activo. Las únicas `box-shadow` del código no son elevación: anillos `inset` sobre casillas del tablero (Rayos X) y un halo de 2px en color papel que separa los puntos de error del gráfico.

### Named Rules
**The Rules Not Shadows Rule.** Si algo necesita separarse, recibe un filete. Nunca una sombra, nunca un fondo de tarjeta.

## Shapes

Esquinas rectas en todo: botones, campos, chips, toast, marco del tablero, barra de evaluación, jugada resaltada (border-radius 0). Los bordes son de 1px para controles y de 2px para el marco del diagrama, la barra de evaluación y los filetes de cabecera. La única forma circular es el punto de dato: leyenda de severidad (8px) y marcas del gráfico de evaluación (9px), que son signos tipográficos, no contenedores.

## Components

### Buttons
Tinta impresa: relleno o contorno, siempre rectos.
- **Shape:** esquinas rectas (0px), 1px de borde.
- **Primary:** tinta rellena con texto papel, 42px de alto, 0 16px, 650 a 14.5px. Hover a negro puro.
- **Secondary:** contorno de tinta, fondo transparente, 38px. Hover con sombra de papel.
- **Ghost:** borde transparente, 38px; hover muestra el filete suave. Variante conmutable (Rayos X) se rellena en tinta cuando está activa.
- **Icon:** 36px cuadrado, borde transparente, hover con borde de tinta; la variante peligro tiñe icono y borde de rojo en hover. Iconos lucide en SVG.
- **Link:** texto subrayado de 1px, offset 3px; hover engrosa a 2px.
- **Focus:** contorno de 2px en tinta, offset 2px (en la mancheta, papel con offset −4px). Transiciones de color 0.15s ease-out.

### Chips
- **Style:** 32px de alto, borde de filete suave, texto 700 a 13,5px. Se usan para los signos de valoración (`!`, `?`, `±`...).
- **State:** activo en tinta rellena con texto papel; hover con borde de tinta.

### Inputs / Fields
- **Style:** fondo hoja, borde de 1px en tinta tercera, 40px, esquinas rectas. Etiqueta encima en 650 a 13px.
- **Focus:** contorno de 2px en tinta sin offset y borde a tinta. El caret es rojo.
- **Error:** bloque con borde y texto rojos; nota de éxito en verde.

### Navigation
- **Mancheta:** banda de tinta con la mancheta condensada GODCHESS, pestañas 600 a 14.5px en gris de mancheta; la pestaña activa se rellena en papel con texto de tinta, como si se recortara la banda. Contadores como placas cuadradas.
- **Subnav:** pestañas en línea sobre un filete de 1px; la activa lleva un subrayado de 3px en tinta.
- **Segmentado:** grupo con contorno de tinta y separadores de filete suave; el segmento activo en tinta rellena.

### Listas y tablas con filete
- **Action list:** filete de tinta arriba, filas separadas por filete suave, icono en tinta segunda, hover con sombra de papel. Las filas divididas llevan un enlace a la derecha.
- **Tablas:** cabecera en label con filete de 2px debajo; filas con filete suave; columnas numéricas alineadas a la derecha; hover de fila con sombra de papel.

### Diagrama impreso (signature)
El tablero Chessground con casillas claras en hoja (#f4f3ef) y casillas oscuras rayadas a 45° desde un SVG en línea (trazo #97948b sobre #d3d0c7), dentro de un marco de 2px de filete. Coordenadas en Archivo 700. Debajo, un pie de diagrama con filete de 2px encima: titular condensado en mayúsculas («Juegan las blancas») y metadatos a la derecha. El diagrama conserva sus valores de día también en la edición nocturna, como un grabado impreso. Bloqueado: gris al 40% y opacidad .72.

### Barra de evaluación
28px de ancho, alto del tablero, marco de 2px; fondo tinta y relleno hoja que crece desde abajo (o desde arriba con el tablero girado) con transición de altura de .35s cubic-bezier(.2, .8, .2, 1). Cifra condensada 800 en el extremo.

### Notación de columna (signature)
La partida es texto corrido: línea principal en 760 tinta, variantes en bloque sangrado 18px a 15px en tinta segunda, comentarios en cursiva. La jugada actual se rellena en tinta (rojo si es `??`, ámbar si es `?`). Hover con sombra de papel.

### Comentario del entrenador y hallazgos
- **Coach:** nota con filete suave arriba, 14.5px; la jugada en negrita toma el color de su severidad.
- **Autopsia:** lista de hallazgos con jugada en 800 (color por severidad), causa en label a la derecha y explicación debajo.

### Rayos X
Anillos `inset` sobre casillas: 4px rojo .92 para piezas colgadas, 3px rojo .5 para débiles, 4px verde .9 para objetivos ganables.

### Toast
Bloque de tinta fijo abajo al centro, texto papel 600 a 14px, sin radio. Entra con opacidad y 12px de desplazamiento en 0.2s.

## Do's and Don'ts

### Do:
- **Do** separar zonas con filetes: 2px tinta bajo cabeceras de página y sobre informes, 1px tinta entre columnas, 1px filete suave entre filas.
- **Do** componer titulares en Archivo 900 a anchura 62% en mayúsculas, y cifras en 800 a anchura 75%.
- **Do** colorear las jugadas según su signo: `??` rojo, `?` ámbar, `?!` sin color, `!`/`!!` verde.
- **Do** usar tinta rellena para el estado activo (pestaña, chip, segmento, jugada actual).
- **Do** mantener el diagrama con casillas oscuras rayadas y marco de 2px en ambas ediciones.
- **Do** desactivar transiciones y animaciones con `prefers-reduced-motion: reduce`.

### Don't:
- **Don't** usar sombras de elevación, esquinas redondeadas ni tarjetas con fondo propio.
- **Don't** usar el rojo para nada que no sea error grave o peligro.
- **Don't** introducir un color de acento para botones o enlaces; la acción es tinta.
- **Don't** usar la anchura condensada en controles ni en texto de lectura.
- **Don't** volver a los paneles carbón con acento neón.
