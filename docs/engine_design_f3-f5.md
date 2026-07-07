# Diseño del motor — F3 (Event Engine) · F4 (Relationships) · F5 (Isla/progreso)

> **Estado**: diseño aprobado como base de construcción. F3 se construye a continuación;
> F4/F5 se construirán después SOBRE este diseño (no se implementan aún).
> **Autoría**: diseñado por Fable 5 (sesión interactiva); el código lo construirán
> Sonnet/Codex por subfases. Ver ADR 0005 para las decisiones y alternativas descartadas.

Las tres fases se diseñan juntas para que el modelo de datos sea coherente desde el
principio y las migraciones de `SaveState` sean pocas, pequeñas y previsibles.

---

## 0. La regla que ordena todo el modelo de datos

**Derivado si no tiene memoria; persistido si una transición depende de la historia.**

- Si un valor es recalculable siempre desde los insumos actuales (sliders, needs,
  relación), es una **proyección pura**: no se guarda, no se edita, no se migra.
  Ejemplos: tags/categoría/expresión (ADR 0004), `chemistry` (F4), escenas activas (F3),
  textos de escena.
- Si un valor depende de *lo que pasó* (no solo de lo que hay), es **estado real** y se
  persiste. Ejemplos: `sceneLog` (cooldowns), `stats` (contadores), `Relationship.status`
  (ser pareja es un hito, no un umbral que fluctúa), monedas/desbloqueos (F5).

Esta regla generaliza el ADR 0004 y decide cada campo de las tres fases.

## 1. Modelo de datos unificado (plan de schema v4 → v5 → v6)

### v4 — F3 (Event Engine)
```ts
interface SaveState {                       // v3 actual +
  sceneLog: SceneLogEntry[];                // cap 20, FIFO — cooldowns entre sesiones
  stats: { scenesResolved: number };        // contador de por vida
}

interface SceneLogEntry {
  sceneType: SceneType;
  participants: ResidentId[];               // [0] = protagonista (F3 usa solo 1)
  atMs: number;
}
```
- `sceneLog` es inevitable: los cooldowns deben sobrevivir al cierre de la app (si no,
  reabrir = spam de la misma escena). Cap 20 mantiene `SaveState` en O(residentes).
- `stats.scenesResolved` cuesta una línea y F5 lo usará para desbloqueos; añadirlo en v4
  compra histórico real desde F3 (un contador no se puede reconstruir después).
- La **escena activa NO se persiste**: se recalcula al abrir (evita estado rancio y una
  migración entera).

### v5 — F4 (Relationships)
```ts
interface SaveState {                       // v4 +
  relationships: Relationship[];            // array plano, clave normalizada a<b
}

interface Relationship {
  a: ResidentId;                            // invariante: a < b (orden lexicográfico)
  b: ResidentId;
  friendship: number;                       // 0-100
  tension: number;                          // 0-100
  romance: number;                          // 0-100
  status: RelationshipStatus;               // persistido: tiene memoria (hitos)
  lastInteractionAtMs: number | null;       // para decaimiento relacional
}

type RelationshipStatus =
  | "strangers" | "acquaintances" | "friends" | "besties"
  | "fighting" | "dating" | "partners";     // partners cubre convivencia/matrimonio
```
- **Sin `trust`** (el borrador viejo lo tenía): a esta escala es colineal con
  `friendship`; cada campo persistido es deuda. Si algún día hace falta, migración añade.
- **Sin `last_interaction` como texto libre**: el log de escenas ya cuenta la historia;
  el timestamp basta para el decaimiento.
- `status` **se persiste** (regla §0): pasar a `dating`/`partners` es una transición por
  evento (escena resuelta), con histéresis — no se deshace porque `romance` fluctúe 59↔60.
- Máx ~66 pares con 12 residentes → array plano, nada de estructura de grafo.

### v6 — F5 (Isla/progreso)
```ts
interface SaveState {                       // v5 +
  wallet: { coins: number };
  unlockedZoneIds: ZoneId[];
  pantry: { itemId: string; qty: number }[]; // despensa global del jugador
}
```
- Migración v6 siembra `coins: 50` y una despensa inicial para no romper el flujo de
  comida de F2 (que era "gratis") — a partir de F5 la comida se compra.
- Opcional tardío (F5.x, no comprometido): `Resident.specialItemIds: string[]` (guitarra
  → escenas propias). Si entra, es parte de v6 o un v7 trivial.

### Qué NUNCA se persiste (proyecciones puras)
tags/categoría/expresión de personalidad · `chemistry(a, b, rel)` · candidatos y escenas
activas · textos de escena · zonas desbloqueables *calculables* (la condición se evalúa;
solo el hecho consumado `unlockedZoneIds` se guarda, porque desbloquear es un hito).

---

## 2. F3 — Event Engine (a construir ahora)

### 2.1 Contrato central: `SceneIntent` (efímero, NO persistido)
```ts
type SceneType = "hungry" | "tired" | "bored" | "lonely" | "quirk";  // F4/F5 amplían la unión

interface SceneIntent {
  sceneType: SceneType;
  participants: ResidentId[];     // F3: siempre 1. Convención: [0]=protagonista, [1]=contraparte (F4)
  cause:
    | { kind: "need"; need: keyof Needs; value: number }
    | { kind: "quirk"; quirkId: string };
  urgency: number;                // 0-100 normalizada
  createdAtMs: number;
}
```
Diferencias deliberadas con la spec aspiracional vieja: **sin `tone`** (se deriva en
render con `personalityToTags`, ADR 0004), **sin `result_options`** (la acción del
jugador ES la resolución), **sin `location`/`suggested_item`** (no aportan en F3).
`participants` es array **desde F3** aunque solo lleve 1: el `sceneLog` persistido ya
nace con la forma que F4 necesita (evita migrar el log y refactorizar el motor).

### 2.2 Detección (`src/events/detectors.ts` — lista fija de funciones puras)
| sceneType | condición base | urgency |
|---|---|---|
| `hungry` | `hunger ≥ 70` (reusa `HUNGER_REQUEST_THRESHOLD`) | `hunger` |
| `tired` | `energy ≤ 30` | `100 - energy` |
| `bored` | `boredom ≥ 65` | `boredom` |
| `lonely` | `social_need ≥ 65` | `social_need` |
| `quirk` | `weirdness ≥ 60` y `rng() < weirdness/200` | 45 fija |

Modulación por personalidad — **exactamente dos reglas** (resistir añadir más):
- `patience ≤ 30` → umbrales de necesidad se relajan 10 (se queja antes; para `tired`
  significa `energy ≤ 40`).
- `sociability ≥ 70` → umbral de `lonely` se relaja 10 adicionales.
- Tope total de relajación: 20. `mood` **no dispara escenas**: colorea los textos.

Aleatoriedad: mulberry32 inyectado (`src/events/rng.ts`), seed = `hash(residentId) ^
dayBucket(nowMs)` → determinista dentro del día, testeable con seed fija. `Math.random`
prohibido en core.

Quirks: catálogo fijo de **4** en `src/data/quirks.ts` (`habla_con_plantas`,
`canta_en_la_ducha`, `colecciona_piedras`, `baila_solo`). No es un "sistema de quirks".

### 2.3 Cooldowns y antirrepetición (`src/events/cooldowns.ts`)
Filtro **duro** antes de puntuar (no penalización blanda): si el `sceneLog` tiene una
entrada del mismo `sceneType` con el mismo protagonista dentro de la ventana, el
candidato se descarta.

| sceneType | cooldown |
|---|---|
| hungry | 30 min |
| tired | 45 min |
| bored / lonely | 60 min |
| quirk | 120 min |

**Única excepción** (documentada): `hunger ≥ 90` (`HUNGER_URGENT_THRESHOLD`) ignora el
cooldown. El hambre urgente nunca se queda muda.

### 2.4 Puntuación y selección (`src/events/select.ts`)
```
score = urgency × peso     // hungry 1.0 · tired 0.8 · lonely 0.7 · bored 0.6 · quirk: score fijo 35
```
- `quirk` con 35 queda por debajo de cualquier necesidad recién cruzada (bored@65×0.6≈39):
  es la escena de "todo va bien", solo gana cuando no hay problemas.
- Selección: **1 escena por residente** (la de mayor score), **máx 3 globales** (hoy con
  1 residente = 1 burbuja). Sin colas ni prioridades adicionales.
- Desempate: orden fijo de la lista de tipos (determinismo).

### 2.5 Resolución (`src/events/resolve.ts` — puro) y efectos
| escena | acción del jugador | efecto |
|---|---|---|
| hungry | flujo de comida F2 (elige comida) | el de la comida (`applyFoodEffect`) + `foodReactionFor` |
| tired | "Dejar descansar" | energy +30, mood +5 |
| bored | "Jugar un rato" | boredom −40, energy −10, mood +8 |
| lonely | "Charlar" | social_need −35, mood +8 |
| quirk | "Observar" | mood +4 (puro flavor) |

Resolver = efecto sobre needs + append a `sceneLog` + `stats.scenesResolved++` + **una
sola escritura** de `SaveState` (atómica: o todo o nada). En F5 la resolución además
devolverá recompensa (cambio de firma, no de datos — ver §6).

### 2.6 Textos (`src/dialogue/scene-texts.ts`, patrón `food-reactions.ts`)
`sceneTextFor(intent, resident): string` — pura. Por tipo: 1 frase default + variantes
por la **primera tag de `personalityToTags` que tenga variante** + variante opcional si
`mood ≤ 30`. Los 4 quirks llevan frase propia. Total ≈ 18-20 frases escritas a mano.
**Total por construcción**: cualquier combinación cae a default; nunca texto vacío.
(Cuando haya que escalar volumen de frases: tarea Haiku, no ahora.)

### 2.7 Pipeline (integración en `SaveSystem`, sin tocar UI hasta F3.4)
```
abrir isla / tras acción:
  applyNeedsDecay (F2, existente)
  → detectCandidates(residente, nowMs, rng)        // por residente
  → filtrar por cooldown (sceneLog)
  → score + selección (1/residente, máx 3)
  → UI pinta burbuja; jugador resuelve → resolveScene → persistir (1 escritura)
```
`SaveSystem` gana dos métodos: `computeActiveScenes(nowMs, seed?)` (no persiste) y
`resolveScene(intent, action, nowMs)` (persiste). La UI (F3.4) sustituye la burbuja
ad-hoc de hambre de F2.4 por la burbuja genérica de escena; el flujo de comida existente
pasa a ser la resolución de `hungry`.

---

## 3. F4 — Relationships (diseño cerrado, construcción después)

### 3.1 Estructura
`relationships: Relationship[]` (§1, v5), clave normalizada `a < b`, helper
`getRelationship(state, x, y)` que normaliza el par. Relación inexistente ≡ `strangers`
con valores 0 (no se crean 66 filas vacías; solo se persiste lo que ha pasado — regla §0).

### 3.2 Máquina de estados de `status` (transiciones SOLO por escena resuelta)
```
strangers → acquaintances → friends → besties
                 ↓ (argument)  ↕ (argument/reconcile)
              fighting ────────┘
friends|besties → dating → partners        (confess / propose)
dating|partners → fighting                 (argument grave; no borra romance)
```
Cada transición ocurre al **resolver** una escena social (evento con guardas), nunca por
cruce pasivo de umbral. Guardas ejemplo: `confess` requiere `friendship ≥ 50 ∧
chemistry ≥ 60 ∧ status ∈ {friends, besties}`. Los valores numéricos
(`friendship/tension/romance`) sí evolucionan por deltas al resolver; `status` solo por
transición explícita.

### 3.3 `chemistry` — proyección pura (NO persistida)
```ts
chemistry(a: Personality, b: Personality, rel: Relationship): number  // 0-100, determinista, sin RNG
```
Contrato fijado ahora; fórmula exacta se calibra en F4 (ingredientes: media de
`romanticism`, compatibilidad de rasgos — p.ej. `weirdness` cercana, `sociability`
compatible —, menos `tension`). Insumo de los detectores `flirt`/`confess`.

### 3.4 Nuevos `sceneType` sociales (amplían la unión, el motor NO cambia)
`meet` (2 residentes sin relación coinciden) · `chat` (amigos, social_need alta) ·
`argument` (tension ≥ 60, o roce weirdness/patience) · `reconcile` (fighting + kindness
alta) · `flirt` (chemistry ≥ 60) · `confess` / `propose` (hitos con guardas).
Cada uno es un detector puro más en la lista + efectos sobre `Relationship` y needs de
**ambos** participantes. Cooldown por `sceneType` + **conjunto** de participants (la
clave que `participants[]` de F3 ya soporta). El pipeline detect→cooldown→score→select
de F3 se reusa tal cual; solo crece la lista de detectores y los pesos.

### 3.5 Decaimiento relacional
Al abrir la isla (junto a `applyNeedsDecay`, mismo patrón): `friendship` −1/día sin
interacción a partir del 3er día; `tension` −2/día (los enfados se enfrían solos). Puro,
con clamps, un solo write. `applyNeedsDecay` evoluciona a `applyWorldDecay` en F4.

---

## 4. F5 — Isla/progreso (diseño cerrado, construcción después)

### 4.1 Zonas y desbloqueos
Catálogo fijo `src/data/zones.ts` (como `foods.json`): `residential` (siempre),
`food_shop` (≥1 residente), `clothes_shop` (≥3), `plaza` (≥5), `workshop` (≥8).
Condiciones **se evalúan** al abrir; al cumplirse por primera vez se apunta el hito en
`unlockedZoneIds` (persistido) y se genera una escena `zone_opening` (celebración,
protagonista = residente más antiguo). Condiciones pueden usar `stats.scenesResolved`
(v4 ya lo guarda) además de nº de residentes.

### 4.2 Economía mínima (cerrar el loop: cuidar → ganar → comprar → cuidar mejor)
- **Ganar**: resolver escena → +5 coins (+10 si era urgente). Única fuente en F5.
- **Gastar**: tienda de comida (la comida deja de ser gratis: `pantry` con cantidades) y
  regalos/decoración básica. Única salida.
- Sin inflación que gestionar, sin mercado, sin trabajos. `resolveScene` pasa a devolver
  `{ state, text, reward }` (cambio de firma compilable, no migración de datos).

### 4.3 Qué NO es F5
No hay mapa navegable real (las zonas son pantallas/paneles), no hay economía dinámica,
no hay stock rotatorio obligatorio (opcional F5.x con seed diaria), no hay crafting en
el taller (el taller es un desbloqueo estético hasta que se diseñe algo concreto).

---

## 5. Invariantes del motor (F3+F4+F5 — no se rompen nunca)

1. Core puro: nada bajo `src/{core,residents,events,relationships,dialogue,save}/`
   importa Phaser/DOM/storage ni usa `Math.random()`/`Date.now()` internos (reloj y RNG
   siempre inyectados).
2. Persistido = solo estado con memoria (§0). Derivado = recalculable siempre; jamás se
   guarda ni se edita.
3. Determinismo total: `(SaveState, nowMs, seed)` → misma salida, siempre.
4. El motor **propone**; solo las resoluciones del jugador y los decaimientos **aplican**
   estado. (En V2, la IA propondrá aún más lejos del estado: texto sobre `SceneIntent`.)
5. Resolver una escena = **una** escritura atómica de `SaveState`.
6. Migraciones incrementales, nunca saltan versión, nunca pierden residentes; si
   `schemaVersion` guardada > actual, **no degradar** (guard nuevo en F3.2).
7. `SaveState` crece O(residentes + relaciones), nunca O(historia): todo log lleva cap.
8. Cooldowns solo se saltan por la excepción documentada (hambre urgente).
9. Todo render de texto es total (fallback default; nunca vacío).
10. Timestamps guardados en el futuro (reloj del dispositivo cambiado) se clampean a
    `now` al leer.

## 6. Plan de evolución honesto (qué cambia de verdad entre fases)

| Pieza | F3 | F4 | F5 |
|---|---|---|---|
| `SceneIntent` / unión `SceneType` | nace | crece la unión (código, no datos) | crece la unión |
| `sceneLog` | nace (v4) con `participants[]` | **sin migrar** (la forma ya sirve); si los recuerdos piden `outcome`, v5 lo añade opcional a entradas nuevas | sin cambios |
| Motor detect→cooldown→score→select | nace | solo se añaden detectores/pesos | ídem + `zone_opening` |
| `resolveScene` | `{state, text}` | + efectos sobre 2 participantes | firma crece a `{state, text, reward}` |
| `applyNeedsDecay` | se reusa (F2) | evoluciona a `applyWorldDecay` (needs + relaciones) | sin cambios |
| `SaveState` | v4: +sceneLog, +stats | v5: +relationships | v6: +wallet, +unlockedZoneIds, +pantry |

Compromisos explícitos: cero reescritura del motor en F4/F5; las únicas migraciones son
añadir campos con default vacío; el único cambio de firma anunciado es el de
`resolveScene` en F5.

## 7. Qué NO construir todavía (anti scope-creep, por fase)

- **F3**: relaciones o escenas de 2 · motor de reglas data-driven · máquina de estados de
  escena / `result_options` · persistir la escena activa · timers/ticks en background ·
  más de 4 quirks · pesos configurables · sistema de templating genérico.
- **F4**: `trust` como eje · historia textual por relación · triángulos amorosos con
  lógica propia (emergen solos de chemistry+status, no se codifican) · celos como sistema.
- **F5**: mapa navegable · economía dinámica/mercado · crafting · stock rotatorio ·
  monetización · compartir online.
- **Siempre (hasta F6+)**: IA en runtime, backend, cuentas, bebés.

## 8. Subfases de construcción de F3 (para Sonnet/Codex; una rama ya creada: `develop/f3-event-engine`)

| Subfase | Contenido | Criterio de aceptación | Constructor sugerido |
|---|---|---|---|
| **F3.1** | `src/events/{types,rng,detectors,cooldowns,select}.ts` — todo puro, sin tocar save/UI | ~15 tests: umbrales, modulaciones, urgencias, cooldown duro + excepción urgente, determinismo con seed fija, desempates | Sonnet (razonamiento medio) |
| **F3.2** | `SaveState` v4 (`sceneLog`+`stats`) + migración v3→v4 + guard no-downgrade + clamp de timestamps futuros + `computeActiveScenes`/`resolveScene` en `SaveSystem` | tests de migración con guardado v3 real, reloj hacia atrás, resolución = 1 escritura, log cap 20 | Sonnet (tras F3.1) |
| **F3.3** | `src/data/quirks.ts` + `src/dialogue/scene-texts.ts` (~20 frases) + efectos de resolución | tests: variante por tag, variante lowMood, fallback total (toda combinación produce texto), efectos con clamp | Codex o Sonnet (paralelizable con F3.2: módulos disjuntos) |
| **F3.4** | UI: burbuja genérica (sustituye la de hambre de F2.4), panel de escena con acción, `main.ts` cablea pipeline | manual en preview: abrir con hambre alta → burbuja → resolver → reaparece solo tras cooldown; quirk aparece con needs bajas; suite completa + build verdes | Sonnet |

Regla de reparto: F3.1 y F3.3 pueden ir en paralelo (archivos disjuntos); F3.2 depende
de F3.1; F3.4 cierra e integra. Cada subfase = commit propio con trazabilidad de modelo
(ver AGENTS.md). Tag `V1.F3` al cerrar F3.4 con todo verde.

## 9. Referencias
- ADR 0005 (decisiones y alternativas descartadas de este diseño) · ADR 0004
  (personalidad derivada) · `scene_intent_spec.md` (contrato `SceneIntent` V1 real) ·
  `data_model.md` (persistencia y versiones).
