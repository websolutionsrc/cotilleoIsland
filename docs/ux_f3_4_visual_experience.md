# F3.4 Visual Experience Plan

> Status: visual/UX prep for F3.4.
> Scope: screen hierarchy, resident stage, generic scene UI direction, and V1 tween
> behavior. This document does not change core simulation rules.

## Goal

Move the current screen from "character editor with a debug canvas" to a first playable
island moment:

```text
Mara is visible in a cozy resident space.
The player can read her current state at a glance.
Scene prompts can appear without fighting the edit panel.
Detailed editing remains available, but it no longer owns the screen.
```

## Current Issues

- The DOM panel overlays the Phaser canvas and covers the resident space.
- The island scene shows too much diagnostic text inside the stage.
- The resident sprite is visually approved, but the screen still feels static.
- F3.4 needs room for a generic scene bubble and resolution controls.

## Target Layout

- Use a two-column app shell on desktop/tablet:
  - left: Phaser play surface;
  - right: resident inspector/actions panel.
- On narrow screens, stack the panel below the game.
- The panel must never cover the Phaser scene.
- The game canvas should feel like the primary experience; the panel is support UI.

## Phaser Scene Direction

- Keep the current single-resident house/stage as a temporary V1 room.
- Render Mara as the main focal point.
- Keep scene text minimal:
  - resident name;
  - personality category/tags;
  - compact needs line.
- Detailed numeric sliders stay in the DOM panel.
- Add a soft idle tween to the pilot sprite so the resident is not a sticker.

## F3.4 Scene UI Direction

F3.4 should add the generic scene layer on top of this shell:

- Replace the F2 hunger-only bubble with a generic scene bubble.
- Bubble style follows `docs/art_library.md` section 9:
  white fill, warm brown outline, rounded shape, short tail to the resident.
- Bubble content comes from `SceneIntent` + `sceneTextFor`.
- Hungry scenes reuse the food select/action.
- Other F3 scenes use one clear action button:
  rest, play, chat, observe.
- Resolution triggers a short tween:
  - positive: hop/bounce;
  - tired/rest: slow settle;
  - quirk: playful tilt;
  - negative/failure later: small shake.

## What We Have After This Prep

- A non-overlapping app shell.
- A readable resident stage with Mara visible.
- A first idle tween.
- Documentation that tells F3.4 where the scene bubble and action flow belong.

## What We Still Do Not Have

- Generic F3.4 scene bubble.
- `computeActiveScenes()` wired to UI.
- `resolveScene()` wired to UI.
- Expression swaps or modular paper-doll layers.
- Walking/path movement around the island.
