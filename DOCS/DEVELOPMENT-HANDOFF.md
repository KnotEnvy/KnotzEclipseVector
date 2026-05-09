# Eclipse Vector Development Handoff

Last updated: 2026-05-09

## Purpose

This document is the recurring handoff record for major implementation updates to **Eclipse Vector: Fracture of the Veil**. Update it at the end of each significant build pass so the next engineering, content, VFX, QA, or coordination team can understand the current state without reconstructing context from chat history.

Use this document together with:

- `DOCS/Eclipse_Vector_GDD_v1.docx`
- `DOCS/Eclipse_Vector_AI_Agent_Implementation_Pack_v1.docx`
- `DOCS/Eclipse_Vector_Technical_Architecture_Spec_v1.docx`
- `DOCS/00_Eclipse_Vector_Handoff_Index_and_Reading_Order_v1.docx`
- `DOCS/01_Eclipse_Vector_Interface_Contract_Spec_v1.docx`
- `DOCS/02_Eclipse_Vector_Data_Schema_Dictionary_v1.docx`
- `DOCS/03_Eclipse_Vector_Mission_and_Narrative_Authoring_Guide_v1.docx`
- `DOCS/04_Eclipse_Vector_Art_VFX_UI_Audio_Pipeline_Guide_v1.docx`
- `DOCS/05_Eclipse_Vector_QA_Automation_and_Test_Strategy_v1.docx`
- `DOCS/06_Eclipse_Vector_Production_Backlog_and_Agent_Work_Packets_v1.docx`
- `DOCS/implementation-startup-brief.md`
- `DOCS/repository-assessment.md`

## Current Build State

The project is now a browser-runnable TypeScript game foundation using Vite and PixiJS. It is intentionally small, but it proves the core architectural direction:

- Browser-first Vite app shell.
- Strict TypeScript contracts for IDs, mission definitions, faction state, sector state, player ship definitions, weapons, status effects, save data, and domain events.
- Fixed-step simulation loop independent from Pixi rendering.
- Typed event bus for cross-system communication.
- Headless combat simulation with player movement, basic firing, projectile collision, shield and hull damage, and entity destruction.
- Declarative mission runtime with a destroy objective and a branchable choice-gate objective.
- Narrative consequence application through a structured consequence bundle.
- Faction, sector, progression, and save state changes applied through service boundaries.
- LocalStorage-backed versioned save shell.
- DOM HUD layered over a Pixi playfield.
- Starter content registry with boot-time validation.
- Dedicated content validation CLI exposed through `npm run validate:content`.
- Content validation now compiles the authored JSON Schema mirrors with Ajv 8 and validates starter missions, ships, weapons, status effects, factions, sectors, and the current initial save shell against those schemas.
- Event contract fixtures for high-value gameplay and narrative events.
- Save migration harness with a v0 legacy fixture and current-root hydration tests.
- First authored combat status path: `pulse_lance_mk1` applies `ionized`, which emits `combat.status_applied` and ticks shield pressure over time.
- One event-driven placeholder VFX response for enemy destruction.
- Machine-readable JSON schema mirrors now exist for missions, player ships, weapons, status effects, faction state, sector state, and save roots.
- Runtime content validation now covers ship tuning, weapon tuning, status effect timing/stacking basics, faction and sector registry identity, sector control references, encounter coordinates, reward values, and consequence deltas.
- The content validation CLI reports registry counts and exits nonzero on schema, shape, or cross-reference drift.

## Playable Slice

Current mission: `corridor_breach_01`

The player controls the `veilrunner_proto` ship in the `freeport_lattice` sector. The player destroys one fracture drone, then chooses a recovery doctrine:

- `1`: stabilize civilian lanes, increasing Freeports reputation and civilian stability.
- `2`: scan the anomaly wake, shifting reputation differently and granting anomaly intel.

Controls:

- Move: `WASD` or arrow keys
- Aim: mouse
- Fire: left mouse or `Space`
- Choice selection: `1` or `2` when the mission choice appears

## Architecture Rules Already Enforced

- Combat simulation does not depend on DOM or Pixi APIs.
- Rendering observes snapshots and domain events; it does not mutate gameplay truth.
- Mission choices dispatch typed commands into `MissionRuntime`.
- Mission outcomes are applied through `applyConsequenceBundle`, not hardcoded into UI or rendering.
- Save data is versioned at the root with `saveVersion: 1`.
- Legacy save hydration is routed through `hydrateSaveGameRoot`; future save-shape changes should add migration fixtures before changing runtime saves.
- Starter content is cloned into registries before use so tests and runtime mutations do not poison shared source data.
- Content validation catches common drift such as invalid IDs, invalid semver, missing weapon/status references, invalid numeric tuning, malformed objectives, broken registry keys, and unknown sector/faction references.
- Weapon status references are validated against authored status definitions.
- Authored JSON schemas are compiled with the draft 2020-12 Ajv path and applied to starter content objects during content validation.

## Important Files

- `src/types/contracts.ts`: canonical gameplay, mission, save, and event contracts.
- `src/core/eventBus.ts`: typed event envelope and pub/sub.
- `src/core/gameLoop.ts`: fixed-step update loop.
- `src/features/combat/combatSimulation.ts`: current headless combat implementation.
- `src/features/mission/missionRuntime.ts`: mission objective sequencing, choice commands, and outcome generation.
- `src/features/narrative/narrativeState.ts`: consequence application into persistent game state.
- `src/features/save/saveService.ts`: save adapter contract, localStorage implementation, and save hydration/migration entry point.
- `src/data/missions.ts`: current starter mission content.
- `src/data/validation.ts`: starter content validator.
- `src/tools/contentValidationReport.ts`: shared content validation report builder for tests and CLI output.
- `src/tools/jsonSchemaValidator.ts`: Ajv-backed JSON Schema validation wrapper for content/schema drift checks.
- `src/tools/contentValidationCli.ts` and `scripts/validate-content.mjs`: dedicated content validation command path.
- `schemas/*.schema.json`: machine-readable mirrors for mission, ship, weapon, status effect, faction, sector, and save root contracts.
- `fixtures/events/*.json`: event contract fixtures.
- `fixtures/saves/save-v0-legacy.json`: first save migration fixture.
- `tests/unit/*.test.ts` and `tests/integration/*.test.ts`: current quality coverage.

## Quality Gates

Run these before handing off a major update:

```bash
npm run typecheck
npm run lint
npm run format
npm run validate:content
npm test
npm run build
```

Current known gate result from the latest implementation pass:

- `npm run typecheck`: passing
- `npm run lint`: passing
- `npm run format`: passing
- `npm run validate:content`: passing
- `npm test`: passing, 7 files and 15 tests
- `npm run build`: passing

Build caveat: Vite currently warns that the main JS chunk is just over 500 kB after minification. The latest observed build reported about 511.99 kB. This is mostly expected from PixiJS at this early stage, but renderer/app code-splitting should be addressed before content and presentation scale up.

## Known Risks And Caveats

- IndexedDB is not implemented yet. The current save adapter uses localStorage behind a replaceable storage interface.
- Save migration discipline has started, but there is only one legacy fixture. Any persistent shape change needs a new before/after fixture pair.
- Content schemas cover the existing runtime contracts, but there is no dialogue node contract or schema yet.
- Some schema sections are still intentionally permissive, especially consequence bundles, encounter details, and nested save-world faction/sector maps. The Ajv pass now validates the schemas as written, but schema coverage should tighten before larger content packs land.
- Combat is still in one implementation file. It should be split into movement, weapons, projectiles, damage, lifecycle, and status systems before adding more mechanics.
- Status effects are functional but minimal. `ionized` currently demonstrates application, event emission, duration, and shield pressure; it is not yet a full general-purpose buff/debuff engine.
- VFX is intentionally placeholder-level. The renderer has an event-driven explosion ring, not the final pooled particle/VFX architecture.
- No Playwright browser smoke test exists yet.
- No debug overlay exists yet for events, simulation stats, save state, or content validation reports.
- The Git workspace may require `safe.directory` handling in this environment because Git previously reported an ownership warning.
- `npm install` reported 6 moderate dependency audit findings. Do not run breaking audit fixes casually; evaluate dependency upgrades deliberately.

## Current Next 10 Tasks

1. Add a dialogue node contract and schema once the first authored dialogue surface is ready.
2. Tighten the remaining permissive schema sections for consequence bundles, encounter sequence entries, and nested save-world faction/sector maps.
3. Implement an IndexedDB save adapter while preserving the current save service contract and migration entry point.
4. Split `combatSimulation.ts` into movement, weapon, projectile, damage, lifecycle, and status modules with focused tests.
5. Expand status effects into a general system with stacking policy tests, expiry events, and UI-facing status summaries.
6. Add Playwright boot smoke coverage for load, combat completion, choice selection, and save persistence.
7. Add a debug overlay for event history, content validation, FPS/frame timing, and save state.
8. Add a real asset manifest structure for VFX, UI, and audio keys.
9. Expand mission runtime objective support for survive, timer, escort, and fail-forward branches.
10. Code-split the Pixi renderer or app shell to remove the current bundle-size warning before heavier content lands.

## Handoff Update Protocol

At the end of each major update:

1. Update `Last updated`.
2. Add or revise the current build state.
3. Note the exact playable slice and controls.
4. List any architecture decisions or boundaries that changed.
5. Record quality gate results and caveats.
6. Keep the next task list current and ordered by implementation priority.
7. Do not remove old caveats unless the issue has been verified fixed.

## Recommended Starting Path For The Next Team

1. Read this handoff first.
2. Read `DOCS/implementation-startup-brief.md` for the initial implementation rationale.
3. Read `DOCS/repository-assessment.md` for the repo baseline.
4. Read the Technical Architecture Spec and Interface Contract Spec before touching runtime boundaries.
5. Run the quality gates.
6. Pick one bounded packet from the next task list and update this handoff when done.
