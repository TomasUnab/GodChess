# GodChess — visual system

GodChess usa el lenguaje de una herramienta de análisis: fondo carbón, líneas finas, acento lima para acciones y progreso, menta para estados correctos y naranja para riesgo. La jerarquía se construye con tamaño y peso tipográfico; el tablero es la superficie dominante.

Tokens principales: `--bg #101416`, `--panel #171d20`, `--panel2 #1d2528`, `--line #2b363a`, `--muted #91a0a4`, `--accent #d7ff64`, `--accent2 #7edbc5`, `--orange #f3a36a`. Radios mínimos; sin sombras decorativas ni degradados. Sistema responsive a 900px y 560px. Foco visible mediante bordes de control y soporte explícito de `prefers-reduced-motion`.

## Colors

- `--bg`: superficie de trabajo principal; carbón profundo para reducir fatiga en sesiones largas.
- `--panel`: agrupación secundaria; nunca usar como sustituto de una jerarquía de contenido.
- `--panel2`: superficie protagonista del resumen y estado actual.
- `--line`: separación estructural de bajo contraste.
- `--muted`: texto auxiliar y metadatos; no usar para instrucciones críticas.
- `--accent`: acción primaria, progreso y foco activo.
- `--accent2`: estado correcto, conexión local y progreso confirmado.
- `--orange`: riesgo, error o atención requerida.

Los colores funcionales deben mantener el mismo significado en dashboard, puzzle, partida, diario e invitaciones. No añadir colores por componente sin actualizar este contrato.

## Typography

La interfaz usa la pila sans del sistema para funcionar sin red. Los textos de producto usan peso y escala para establecer jerarquía; los valores UCI, rating, tiempos, códigos y etiquetas de datos usan `DM Mono` como intención de medición, con fallback monospace local.

- Display: 42px, tracking aproximado `-0.06em`, solo para el objetivo de la pantalla.
- Heading: 20–29px, peso 600–800.
- Body: 12–13px, line-height 1.6.
- Meta: 9–10px, uppercase y tracking amplio.
- No usar mayúsculas completas para instrucciones largas.

## Components

- `primary`: una acción principal por superficie; lima, alto contraste, mínimo 44px de altura.
- `outline`: acciones secundarias, navegación y conexión; no competir con `primary`.
- `scan-row`: fila de pensamiento CCT; número antes de completar, check lima después.
- `metric`: solo para datos medibles y persistidos; evitar valores decorativos.
- `board-wrap`: marco oscuro que cede protagonismo al tablero; no superponer tarjetas sobre el tablero.
- `journal-row`: una entrada temporal o de error por fila, con fecha y etiqueta semántica.
- `tag`: contexto breve de fase, modo o fuente; nunca usar como titular independiente.
- Estados obligatorios: default, hover, focus-visible, disabled, loading, error y success.

## Accessibility

Los controles interactivos mantienen foco visible con `:focus-visible`, tamaño táctil mínimo de 44px cuando sea posible y etiquetas asociadas a inputs. Los estados de motor, conexión, error y éxito deben tener texto, no depender solo del color. `prefers-reduced-motion` elimina transiciones no esenciales sin ocultar el cambio de estado.

## Impeccable

Flujo aplicado: `init` (PRODUCT.md), `layout`, `typeset`, `colorize`, `animate`, `critique`, `polish`, y auditoría técnica final. La skill fue instalada con `npx skills add pbakaus/impeccable`. Los detectores del hook informaron: `index.html` sin hallazgos deterministas; `src/styles.css` sin hallazgos deterministas.
