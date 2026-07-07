# CODEMAP — Cotilleo Island

Mapa de módulos previstos. Se rellena a medida que se implementan (Fase 0: solo scaffold).

## Módulos (arquitectura objetivo)
| Módulo | Carpeta | Responsabilidad | Estado |
|---|---|---|---|
| **Core** | `src/core/` | Estado del juego, tick de simulación, tipos base | pendiente |
| **Residents** | `src/residents/` | Personalidad, necesidades, inventario, nivel | pendiente |
| **Relationships** | `src/relationships/` | Amistad, confianza, tensión, romance, historial resumido | pendiente |
| **Events** | `src/events/` | Detecta eventos, puntúa, evita repetición, genera `SceneIntent` | pendiente |
| **Dialogue** | `src/dialogue/` | V1: plantillas (`TemplateDialogueGenerator`); V2: IA (`DialogueGenerator`) | pendiente |
| **AI** (opcional) | `src/ai/` | DialogueEnhancer, DailyNarrator, MemorySummarizer, CatchphraseGenerator, EventSuggestor validado | pendiente |
| **Save** | `src/save/` | Persistencia local (IndexedDB / localForage), export/import | pendiente |
| **UI** | `src/ui/` | Escenas Phaser, pantallas, render de residentes/isla | pendiente |
| **Data** | `src/data/` | `residents_mock.json`, `items.json`, `events.json`, `dialogue_templates.json` | pendiente |

## Flujo de datos
```
Reglas → SceneIntent → (IA opcional) → texto validado → escena
EventSuggestor propone → EventEngine valida → GameState aplica
```

## Estructura de carpetas
```
index.html
package.json · tsconfig.json · vite.config.ts
public/            manifest.webmanifest · iconos PWA
src/
  main.ts          bootstrap del juego (Phaser)
  core/ residents/ relationships/ events/ dialogue/ ai/ save/ ui/ data/
tests/             Vitest (lógica pura)
```

## Regla de acoplamiento
La **lógica de simulación no depende de Phaser**. Phaser vive solo en `src/ui/` y
`src/main.ts`. Así el core es testeable y portable (y la IA reemplazable por plantillas).
