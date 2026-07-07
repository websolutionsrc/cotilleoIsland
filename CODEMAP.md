# CODEMAP — Cotilleo Island

Mapa de módulos previstos. Se rellena a medida que se implementan (Fase 0: sin código).

## Módulos (arquitectura objetivo)
| Módulo | Responsabilidad | Estado |
|---|---|---|
| **Island Manager** | Edificios, desbloqueos, progreso de la isla | pendiente |
| **Resident System** | Personalidad, necesidades, inventario, nivel del residente | pendiente |
| **Relationship Graph** | Amistad, confianza, tensión, historial resumido entre residentes | pendiente |
| **Event Engine** | Detecta eventos posibles, puntúa, evita repetición, genera `SceneIntent` | pendiente |
| **Dialogue System** | V1: plantillas; V2/MVP: generación por IA controlada (`IDialogueGenerator`) | pendiente |
| **AI Layer** (opcional) | DialogueEnhancer, DailyNarrator, MemorySummarizer, CatchphraseGenerator, EventSuggestor validado | pendiente |
| **Reward System** | Monedas, nivel, desbloqueos | pendiente |
| **Save System** | Estado local, logs resumidos, backups/export | pendiente |

## Flujo de datos
```
Reglas → SceneIntent → (IA opcional) → texto validado → escena
IEventSuggestor propone → EventEngine valida → GameState aplica
```

## Estructura de carpetas prevista (Unity)
```
UnityProject/Assets/Scripts/{Core, Residents, Relationships, Events, Dialogue, AI, Save, UI}
UnityProject/Assets/{ScriptableObjects, Prefabs, Scenes, Tests}
UnityProject/Assets/Data/{residents_mock.json, items.json, events.json, dialogue_templates.json}
```
