# v1.1 F0 Visual Production Foundation

> Status: IN PROGRESS (`v01.01.F0.0` complete on 2026-07-10)
> Release boundary: `v01.01.F0` is the non-player-facing preproduction phase inside
> the v1.1 release plan; player-facing integration starts at `v01.01.F1`.
> Purpose: build the visual source of truth, pilot assets, production contracts, and
> validation tools required before v1.1 can integrate customizable residents, the
> island, shops, movement, and scene presentation.

## 1. Outcome

v1.1 F0 is complete when the project can produce a new asset without redesigning the
pipeline every time. The generation model remains nondeterministic; the surrounding
system is deterministic:

```text
approved references -> frozen master -> asset contract -> controlled edit
-> alpha/normalization -> automated QA -> Phaser preview -> human approval
-> batch production allowed
```

v1.1 F0 does not ship player-facing features. It hands approved assets and stable contracts
to the v1.1 implementation phases described in `docs/v1_1_plan.md`.

## 2. Responsibility labels

Every v1.1 F0 task must carry one of these labels:

| Label | Meaning |
|---|---|
| `HUMAN-BLOCKING` | Work cannot continue until the user supplies a reference or makes a taste/product decision. |
| `HUMAN-APPROVAL` | Agents can prepare a result, but it cannot become a master or production asset until the user approves it. |
| `CODEX` | Codex/OpenAI line owns tooling, structured asset generation, filesystem integration, automated QA, or technical validation. |
| `CLAUDE` | Claude line owns art direction, coordination, implementation, or creative volume according to the model role. |
| `AUTOMATABLE` | Can run without user input after contracts and masters are frozen. |
| `PARALLEL-AFTER-GATE` | May run in parallel only after the named gate is approved. |

`HUMAN-APPROVAL` is not the same as manual production. Codex may invoke image
generation/editing, remove chroma backgrounds, normalize files, and show previews. The
user is required for taste approval, not for every mechanical step.

## 3. Model and tool ownership

| Owner | Primary v1.1 F0 responsibility |
|---|---|
| Human | Product taste, reference selection, accept/reject masters, approve batches, authorize changes to protected pilot assets. |
| Fable | Art architecture: visual grammar, master definitions, environment/character consistency, final visual review. |
| Opus | Coordination and integration: task boundaries, gates, conflict resolution, hard production decisions. |
| Sonnet | Claude construction: Phaser compositor/preview, editor-facing code, integration tooling and tests. |
| Haiku | Claude volume: names, prompt variants, content descriptions after contracts freeze. |
| GPT-5.6 Sol | System architecture and critical review: asset contracts, pipeline risks, master drift, release gate audit. |
| GPT-5.6 Terra | Codex coordination/construction: manifests, validators, generation orchestration, Phaser/tool integration and validation. |
| GPT-5.6 Luna | Codex volume: structured manifests, prompt records, duplicate detection and repetitive fixtures. |
| Image model | Bitmap generation and constrained edits. Never owns contracts or approval. |

## 4. Human dependency matrix

### Human-blocking decisions

Only these decisions should stop the whole pipeline:

1. Select or replace the official style references.
2. Approve the final character registration master.
3. Approve the island camera/perspective master.
4. Approve the house/building silhouette language.
5. Approve the scene composition language.
6. Approve a material change to `docs/art/pilot/mara_v5.png` or its role.
7. Choose between alternatives when Fable/Sol cannot reduce them without a taste call.

### Human approval without blocking agent preparation

Agents may work ahead and queue these results:

- Two or three character master candidates.
- One island blockout plus visual overlays.
- One house and one shop pilot.
- Contact sheets for hair, garments, props, and icons.
- Runtime screenshots at 96/128/256 px.
- Batch review sheets with technical failures already removed.

### Work agents can continue while waiting for the user

- Write and validate manifests.
- Build the alpha/dimension/fringe validator.
- Build a contact-sheet generator.
- Build the paper-doll compositor with placeholders.
- Build island and scene blockouts with code-native shapes.
- Create prompt records and generation queues.
- Add unit tests for catalogs and migrations.
- Measure anchors and bounding boxes on approved inputs.
- Prepare a single-change revision prompt for a rejected candidate.

Agents must not start mass image generation while a master is awaiting approval.

## 5. v1.1 F0 subphases

## v1.1 F0.0 - Inventory and production map

### Design

- Inventory existing references, pilots, tools, runtime assets, and missing families.
- Classify every asset as generated bitmap, edit-on-template bitmap, code/SVG, or
  Phaser motion.
- Record dependencies and target release phase.

### Construction

- Create the asset manifest schema and status vocabulary:
  `draft -> technically_valid -> runtime_valid -> human_approved -> production`,
  with `rejected` as a terminal provenance state.
- Define stable filenames and versioning rules.

### Validation

- Every planned v1.1 visual has exactly one family, owner, contract, and gate.
- No asset is listed as both persisted state and derived presentation.

### Ownership

- Fable + Sol: design, high reasoning.
- Opus + Terra: synthesis.
- Human: `HUMAN-APPROVAL` of the inventory scope.

### Implementation status - DONE 2026-07-10

- `docs/art/visual_asset_inventory.json` inventories 18 existing assets, eight
  planned production families, current tools, ownership, provenance, runtime use,
  and human gates.
- `docs/art/contracts/visual-asset-inventory.schema.json` defines the versioned
  machine-readable contract.
- `tools/art/validate-inventory.mjs` checks identifiers, ownership/status values,
  file existence, PNG IHDR metadata, and concrete next actions for human gates.
- `mara-v5-cutout-candidate` is `technically_valid` but remains
  `HUMAN-BLOCKING`: runtime use does not grant registration-master approval.
- `npm run art:validate` and `npm run test:art` pass. F0.1 is the next agent-owned
  subphase while the character master decision remains queued for F0.2.

## v1.1 F0.1 - Frozen visual tokens and contracts

### Design

Freeze shared tokens from `docs/art_library.md`:

- proportions, line, light direction, palette, shading, export sizes;
- character canvas, baseline, head/hand/chest anchors and z-order;
- island camera, scale, path width, building footprints and depth bands;
- bubble/icon grammar and scene staging positions;
- safe zones for names, UI, actors, and interaction markers.

### Construction

- Write machine-readable contracts for character, environment, building, icon, and
  scene families.
- Define allowed edit masks and invariants for identity-preserving image edits.

### Validation

- Contracts can reject a wrong canvas, anchor set, slot, z-index, or output state.
- A prompt cannot override a frozen token.

### Ownership

- Fable + Sol: contract architecture.
- Opus + Terra: implementation plan.
- `HUMAN-BLOCKING`: only if a visual token remains a genuine taste choice.

## v1.1 F0.2 - Character production pilot

### Pilot sequence

1. Freeze the neutral adult registration body with true alpha.
2. Measure feet baseline, head center, hand/chest sockets, and figure bounds.
3. Produce one garment through edit-on-template plus mask/cutout.
4. Produce one front/back hairstyle pair.
5. Produce neutral plus one reaction expression.
6. Composite the layers in Phaser with tint controls.
7. Render the same resident at 96, 128, and 256 px.

### Human dependencies

- `HUMAN-BLOCKING`: approve the registration body.
- `HUMAN-APPROVAL`: approve the complete composed pilot.
- Manual cleanup is required only if automated chroma removal/masking fails on complex
  edges such as curls; it is not the default workflow.

### Agent work

- Codex/Terra: generation/edit orchestration, cutout, defringe, measurements,
  manifests, technical QA, contact sheets.
- Fable: style review and targeted correction brief.
- Sonnet/Terra: compositor and runtime preview.
- Opus: gate coordination and integration decision.
- Haiku/Luna: no volume until the pilot gate passes.

### Gate

One body + one garment + one hairstyle + two expressions align without seams, remain
readable at 96 px, recolor correctly, and are approved by the user.

## v1.1 F0.3 - Island and environment pilot

### Pilot sequence

1. Build a code-native gameplay blockout first.
2. Freeze camera, horizon/depth, resident scale, paths, and building footprints.
3. Produce one environment master containing grass, path, one tree, one house, and
  interaction-safe negative space.
4. Separate reusable terrain, vegetation, building, prop, and shadow layers.
5. Test desktop/tablet and narrow responsive composition.

### Human dependencies

- `HUMAN-BLOCKING`: choose/approve the island master perspective and visual density.
- `HUMAN-APPROVAL`: approve the runtime pilot, not an isolated concept image.

### Agent work

- Fable/Sol: environment grammar.
- Terra/Sonnet: blockout and runtime layering.
- Codex: generation, slicing, normalization, manifest and performance checks.
- Haiku/Luna: prop metadata after the master gate.

### Gate

Three visually distinct residents remain readable; houses and interaction markers are
clear; the environment does not cover gameplay or require a single flattened island
image.

## v1.1 F0.4 - Building, house, and shop pilot

### Pilot sequence

- Define a modular building kit: base, roof, door, windows, sign, decoration, shadow.
- Produce one residential house and one food shop from the same perspective contract.
- Define `locked`, `open`, `selected`, and `scene_pending` presentation states.
- Verify that signs and UI labels are separate from generated bitmap text.

### Human dependencies

- `HUMAN-APPROVAL`: house and shop silhouettes.
- No human work is needed for recolors, state overlays, or metadata after approval.

### Gate

One house and one shop can be placed, recolored, selected, locked, and entered without
new one-off rendering code.

## v1.1 F0.5 - Scene language and motion pilot

### Design

Define reusable staging templates instead of generating complete scene illustrations:

- one resident centered;
- two residents facing each other;
- argument, reconciliation, romance, gift, and celebration staging;
- bubble position, icon, expression, entry, reaction, and exit.

### Construction

- Use static composites plus Phaser tweens for idle, walk bob, hop, shake, tilt, settle,
  arrival, and reaction.
- Frame animation remains outside v1.1 F0 unless a tween pilot proves insufficient.

### Human dependencies

- `HUMAN-APPROVAL`: motion feel and scene readability.
- No human approval per tween after the motion grammar is frozen.

### Gate

One solo and one social scene run end-to-end with approved actors, environment,
expression, icon, bubble, motion, and resolution feedback.

## v1.1 F0.6 - Tooling and batch readiness

### Required tools

- `art-validate`: dimensions, PNG/RGBA, transparent corners, bounds, anchors, slots,
  filenames, manifest references, chroma residue, and obvious edge fringe.
- `art-contact-sheet`: family sheets at runtime sizes on light/dark/game backgrounds.
- `avatar-preview`: layer/tint/expression matrix.
- `environment-preview`: camera/scale/building placement proof.
- `prompt-registry`: prompt id, references, edit target, allowed mask, invariants,
  model/tool, output version, and approval state.

### Ownership

- Terra/Sonnet: implementation.
- Opus: integration ownership.
- Luna/Haiku: structured prompt and catalog population after schemas freeze.
- `AUTOMATABLE`: all technical checks.

## v1.1 F0.7 - Freeze and v1.1 handoff

### Final acceptance

- Character, environment, building/shop, and scene/motion pilots are human-approved.
- All production assets have manifests and provenance.
- All technical validation is automated or has an explicit manual checklist.
- Runtime previews demonstrate the real target sizes.
- Batch lanes are safe to parallelize without editing shared masters.
- `npm test` and `npm run build` pass after any tooling/runtime additions.

### Output handed to v1.1

- Frozen masters and contracts.
- Approved pilot assets.
- Production-ready tools.
- Batch task templates.
- Explicit backlog by asset family.

## 6. Parallelism rules

Before v1.1 F0.2 character gate: no asset production parallelism.

After the character gate:

- hair and garment batches may run in parallel against the same frozen body;
- manifests may run alongside image production;
- compositor code and contact-sheet tooling may run alongside approved-asset cleanup;
- no two agents edit the registration body, shared anchor contract, or same runtime file.

After the environment gate:

- vegetation, props, houses, and shops may run in separate asset directories;
- island runtime code has one owner;
- generated concept images never replace the code-native blockout until approved.

## 7. File boundaries

### Allowed during v1.1 F0

- `docs/art/**`
- new `docs/art/contracts/**`
- new `docs/art/prompts/**`
- new `public/art/pilots/**`
- new `src/ui/avatar/**` and isolated visual preview modules
- new `src/data/art/**`
- new `tools/art/**`
- visual/tool tests

### Restricted during v1.1 F0

- `src/events/**`
- `src/relationships/**`
- economy rules
- AI runtime
- mass production before the relevant pilot gate
- destructive replacement of `mara_v5.png`

Any `SaveState` or live-game migration belongs to v1.1 F1, not v1.1 F0.

## 8. Verification commands

Expected project checks after code/tooling subphases:

```text
npm run art:validate
npm run test:art
npm test
npm run build
```

Visual checks are performed through the isolated previews plus contact sheets and the
human approval gates above. v1.1 F0 is not complete based on prompt quality alone.
