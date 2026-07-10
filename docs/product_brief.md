# Product Brief - Cotilleo Island

## Core fantasy
Create custom residents who **seem to live independently** on an island, then return
each day to discover the absurd scenes, friendships, and conflicts that have emerged.
Light, emergent, personalized entertainment.

## Product problem (non-technical)
> Can we make the player feel daily curiosity about simple but expressive residents?

| Question | Answer |
|---|---|
| What does it solve? | Light, emergent, personalized entertainment. |
| What signal enters? | Residents, personality, needs, relationships, objects, history. |
| What noise exists? | Repetition, unfunny dialogue. |
| What does the system decide? | Which scene occurs, with whom, where, why, and with what consequence. |
| What output does it produce? | A short, funny, playable, persistent scene. |

## Core loop
```
Open island -> see pending events -> enter scene -> a resident asks for something
-> player decides (food, advice, gift, introduction...) -> consequences
-> happiness/relationship/hunger/tension/level/inventory change -> unlocks
-> return later for new scenes
```
V1 must measure whether this loop engages players **before** investing in advanced AI.

## User and tone
Personal/casual game, light humor, and absurd situations. It allows adult nods (+18)
through unlikely events without affecting the V1 architecture.

## V1 scope (summary)
Includes: resident creation, simple island + houses, needs, objects/gifts,
relationships (friendship, tension, **romance and marriage/cohabitation**), rule-based
events, template dialogue, levels/unlocks, local saves. Out of scope: **babies**,
multiplayer, social network, advanced face editor, free-form conversational AI,
backend, voices, open world, 100 residents, public shop.

> Romance/marriage enters V1 as a source of "drama"; babies are postponed until the
> core loop is validated.

## Distinct identity (avoid Nintendo IP)
Original name (Cotilleo Island), modular avatars with a distinct style (not Miis),
original UI/icons/sounds, original scenes and tone. Simplicity first.

## First milestone success metric
A resident gets hungry, asks for food, reacts, and saves the result - and that
micro-scene **is funny**.
