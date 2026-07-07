# Política de uso de IA — Cotilleo Island

La IA **no decide el juego, expresa el juego**.
```
Reglas → SceneIntent → IA opcional → texto validado → escena
```
La V1 funciona sin IA. El MVP con IA solo cubre tareas de bajo riesgo y bajo coste.

## Dónde sí / dónde no
| Tarea | Riesgo | Modelo | Estrategia |
|---|---|---|---|
| Plantillas V1 | Bajo | Ninguno (código local) | 80% de las escenas |
| Narrador diario | Bajo | Pequeño/barato | Batch 1 vez/día |
| Reescritura de diálogo corto | Bajo-medio | Pequeño/medio | JSON, 30–60 palabras |
| Muletillas | Bajo | Pequeño | Generar y cachear |
| Resumen de memoria | Medio | Pequeño | Salida estructurada |
| Sugerencia de eventos | Medio-alto | Medio | Validación estricta |
| Conversación libre | Alto | Evitar en MVP | Solo prototipo controlado |
| Moderación | Alto | Reglas locales + modelo si hace falta | Bloqueo/fallback |

## Jerarquía
1. Reglas/plantillas (80%). 2. Modelo pequeño (frases, muletillas, resúmenes, narrador).
3. Modelo medio (eventos sugeridos, diálogos con matiz). 4. Modelo grande (solo diseño
offline / contenido durante desarrollo / debugging creativo).

## Optimización de tokens
**Nunca enviar** toda la isla, todo el historial, todos los residentes ni
conversaciones completas. **Enviar solo**:
```
scene_type + personajes implicados + relación resumida + tono + límite de salida
```
Ejemplo de prompt (`dialogue_enhance`): `constraints{language, tone, max_words,
audience, output_format:json}` + `scene{type, cause}` + `characters[{name, traits, mood}]`
+ `relationship{friendship, tension, summary}`.

## Validación de salida IA
Salida JSON si afecta al sistema · validar esquema y longitud · no inventar personajes ·
no cambiar estado crítico · fallback a plantilla · rate limit por sesión/día · timeout corto.

## Caché y presupuesto
Clave de caché por `scene_type + traits_a + traits_b + tone + language`. Guardar: texto,
modelo, fecha, coste aprox., resultado de validación, si hubo fallback.

Presupuesto MVP: sin IA = plantillas ilimitadas. Con IA opcional = 3–5 escenas
generadas/día + 1 resumen diario + 3 muletillas por residente al crearlo.

## Privacidad
Personajes pueden basarse en personas reales. Por defecto: sin cuentas, sin backend, sin
subir personajes, todo local, IA cloud desactivada o claramente explicada. Si se usa IA
cloud: enviar solo `SceneIntent` minimizado, opción de anonimizar (`Resident A/B`), modo
solo-local siempre disponible, log de qué se envió, borrar caché a petición.

## Agentes dentro del juego
No usar agentes autónomos en V1/MVP. Un futuro "agente narrador" solo podría proponer
texto/escenas candidatas; no gastar moneda, no borrar residentes, no alterar relaciones
críticas, no comprar ni publicar. Todo estado pasa por validadores.
