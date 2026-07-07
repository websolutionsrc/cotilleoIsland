# ADR 0004 — Modelo de personalidad: sliders como única fuente de verdad

- **Estado:** aceptada
- **Fecha:** 2026-07-07

## Contexto
Una propuesta comparó el sistema de personalidad de Cotilleo Island (sliders continuos)
con el de Tomodachi Life (16 tipos cerrados agrupados en 4 familias, a partir de 4
sliders). Diagnóstico clave: la documentación ya usaba tags de texto sueltas
(`"traits": ["dramática", "impaciente"]`) en los ejemplos de `SceneIntent`
(`scene_intent_spec.md`) sin ninguna función que las derivara de los sliders numéricos de
`Personality` — dos fuentes de verdad potencialmente divergentes. Además faltaba un rasgo
de amabilidad/temperamento, y `romanticism` mezclaba "propensión individual al romance"
con "afinidad entre dos residentes concretos" en un único slider.

## Decisión
1. **Los 6 sliders de `Personality`** (`energy`, `sociability`, `patience`, `weirdness`,
   `romanticism`, `kindness` — `kindness` ya se había añadido en Fase 1.1) son **la única
   fuente de verdad** sobre la personalidad de un residente. Se guardan en `SaveState` y
   se editan directamente (panel de edición); nada más.
2. **Tags, categoría y expresión son proyecciones puras y deterministas** de esos sliders,
   implementadas en `src/core/personality-derived.ts` (TS puro, sin Phaser):
   - `personalityToTags(p)`: hasta 3 tags por umbrales fijos (alto ≥ 70, bajo ≤ 30),
     ordenadas por distancia a 50, desempate por orden fijo de `PERSONALITY_KEYS`.
   - `personalityCategory(p)`: 1 de 5 familias amplias (`Equilibrada`, `Sociable`,
     `Reservada`, `Cariñosa`, `Excéntrica`), para dar identidad visual rápida (acento de
     color) sin cerrar el sistema a 16 tipos fijos como Tomodachi. Un perfil sin rasgos
     extremos (todos ~50) es `Equilibrada`; en caso contrario gana la familia con mayor
     score comparable 0–200.
   - `personalityExpression(p)`: hint mínimo de pose/idle para el render.
   Ninguna de las tres se persiste ni se edita por separado; se recalculan siempre a
   partir de los sliders guardados.
3. **El romance sigue dividido en dos conceptos distintos**: `romanticism` (individual,
   slider normal de `Personality`, persistido) y `chemistry` **por pareja** (afinidad
   entre dos residentes concretos + estado de la relación), que se implementará en
   **Fase 4** (Relationships) como función pura sobre ambas personalidades + la relación,
   nunca como campo editable ni dato independiente.

## Motivos
- Evita que aparezcan dos fuentes de verdad divergentes (sliders numéricos vs. tags de
  texto escritas a mano por escena), el problema concreto que disparó esta revisión.
- Mantiene los sliders continuos como base (más expresivo y fácil de tunear que 16 tipos
  cerrados), con una capa ligera de categoría encima solo para identidad visual rápida.
- Determinista y testeable: mismos sliders, mismas tags/categoría/expresión, siempre;
  sin estado oculto ni dependencia de Phaser.
- No añade superficie de guardado: cero migraciones nuevas, cero campos editables nuevos.

## Consecuencias
- `src/core/personality-derived.ts` es la única forma permitida de obtener
  tags/categoría/expresión; no se reintroducen tags de texto sueltas en ningún otro sitio
  (plantillas de diálogo Fase 3, UI, etc.).
- `docs/scene_intent_spec.md` (campo `tone`) deberá alimentarse de estas funciones cuando
  la Fase 3 conecte `SceneIntent` a datos reales, no de texto escrito a mano.
- `chemistry` (Fase 4) queda fuera de alcance de esta tarea; documentado como plan en
  `docs/data_model.md` (sección Relationship) y pendiente en `CODEMAP.md`.
- En el momento de esta ADR, `CURRENT_SCHEMA_VERSION` de `SaveState` no cambió (seguía en
  2): esta ADR no añadió ni quitó campos persistidos. F2.3 sube posteriormente el esquema
  a v3 por persistencia de necesidades.
