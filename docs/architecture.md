# Arquitectura — Cotilleo Island

## Principio rector
```
Core Simulation → decide el estado del juego (V1, determinista, por reglas)
AI Layer        → mejora cómo se expresa ese estado (V2, opcional, reemplazable)
```
El motor decide el estado; la IA embellece/resume/sugiere; la IA no manda sobre el núcleo.

## Módulos
```
Game App (iPad)
├─ Island Manager      edificios · desbloqueos · progreso
├─ Resident System     personalidad · necesidades · inventario · nivel
├─ Relationship Graph  amistad · confianza · tensión · historial resumido
├─ Event Engine        detecta eventos · puntúa · evita repetición · genera SceneIntent
├─ Dialogue System     V1: plantillas · V2/MVP: generación IA controlada
├─ AI Layer (opcional) DialogueEnhancer · DailyNarrator · MemorySummarizer
│                      CatchphraseGenerator · EventSuggestor (validado)
├─ Reward System       monedas · nivel · desbloqueos
└─ Save System         estado local · logs resumidos · backups/export
```

## Event Engine (por reglas)
Cada tick de simulación (o al entrar en pantalla):
```
revisar residentes → detectar necesidades y relaciones relevantes
→ crear eventos candidatos → puntuar → filtrar repetidos
→ elegir 1-3 eventos activos → generar SceneIntent
```
Scoring simple:
```
score = necesidad*peso + rareza_controlada + novedad + relevancia_relacional
      - penalización_por_repetición
```
Reglas ejemplo: `hunger > 70` → "pide comida"; `social_need > 60 y pocos amigos` →
"quiere conocer a alguien"; `friendship > 70 y tension < 20` → "quiere pasar tiempo";
`tension > 60` → "discusión".

## Interfaces (IA detrás de contratos)
```csharp
public interface IDialogueGenerator { DialogueResult GenerateDialogue(DialogueContext context); }
public interface IMemorySummarizer  { MemorySummary Summarize(GameEvent gameEvent); }
public interface IEventSuggestor     { IReadOnlyList<SceneIntent> Suggest(WorldSnapshot snapshot); }
```
- V1: `TemplateDialogueGenerator` (plantillas).
- V2/MVP: `AIDialogueGenerator` con `IAIClient` + `IDialogueValidator` + fallback a plantilla.
- Regla: `IEventSuggestor` **propone** → `EventEngine` **valida** → `GameState` **aplica**.

## Persistencia
Guardado **local**. JSON al principio; SQLite cuando el volumen lo pida. Export/import
manual. Sin backend en V1.

## Módulos y tests
Sistemas puros y testeables (Resident, Relationship, EventScorer). Datos de ejemplo por
sistema. Ver [`data_model.md`](data_model.md) y [`scene_intent_spec.md`](scene_intent_spec.md).
