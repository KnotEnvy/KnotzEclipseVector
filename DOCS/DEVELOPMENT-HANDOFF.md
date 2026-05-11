# Eclipse Vector Development Handoff

Last updated: 2026-05-11

## Purpose

This document is the recurring handoff record for major implementation updates to **Eclipse Vector: Fracture of the Veil**. Update it at the end of each significant build pass so the next engineering, content, VFX, QA, or coordination team can understand the current state without reconstructing context from chat history.

## Alpha Direction

The next team should focus on finishing a playable alpha, not expanding tooling for its own sake. The game now has three missions, basic mission continuation, player fire, enemy fire, status effects, saves, and HUD feedback. The immediate product goal is to turn that foundation into a game loop players can understand, lose, retry, progress through, and want to keep playing.

For the next build passes:

- Prioritize mechanics, content, feedback, and player-facing flow.
- Add tests only when they protect fragile gameplay, save continuity, mission progression, or a bug that has already broken play.
- Keep existing quality gates green, but do not build new test frameworks, debug tools, schemas, reports, or infrastructure unless they directly unblock alpha gameplay.
- Prefer visible improvements: player death/retry, fail-forward outcomes, more missions, better enemy patterns, clearer rewards, stronger combat feedback, basic progression, and a playable mission selection/continue experience.
- Postpone nonessential tooling and engineering hardening until after the alpha slice is fun and shippable.

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
- Enemies now participate in combat through authored archetype behavior: drones/scouts move toward pressure range, rotate toward the player, fire projectiles, and damage the player's shield/hull through the same projectile and damage systems as player fire.
- Declarative mission runtime with destroy, survive, and branchable choice-gate objectives.
- Enemy archetype registry and data-driven mission encounter spawning. Starter missions now use the fracture drone plus a lighter fracture scout archetype, each with authored movement/range/fire tuning.
- Narrative consequence application through a structured consequence bundle.
- Campaign mission unlock consequences now append follow-up missions into `availableMissions`; save hydration derives follow-up unlocks from completed starter mission consequences instead of relying on one-off mission IDs.
- Faction, sector, progression, and save state changes applied through service boundaries.
- IndexedDB-backed versioned save shell with automatic localStorage fallback and one-time migration of existing localStorage saves into IndexedDB when a slot is first loaded.
- DOM HUD layered over a Pixi playfield.
- Lightweight post-mission continuation flow: after a mission resolves, the HUD shows the next unlocked mission, sector, reward summary, and `Enter` or `N` launches it without reloading the page.
- Mission continuation is now deterministic: combat is held while a choice gate or resolved-state panel owns the stage, early continue input is preserved until resolution, and the next mission auto-launches after a short resolved-state countdown if one is available.
- Mission continuation now handles completed-save replay of the linear starter chain: if the default slot has already completed all authored missions and falls back to replaying `corridor_breach_01`, resolving it still offers `ashwake_wake_02` instead of leaving the player at a permanent "no missions available" panel.
- Transient projectiles are cleared when choice/resolution UI takes over so stale bullets do not appear frozen behind mission panels.
- Starter content registry with boot-time validation.
- Dedicated content validation CLI exposed through `npm run validate:content`.
- Content validation now compiles the authored JSON Schema mirrors with Ajv 8 and validates starter missions, ships, weapons, status effects, factions, sectors, and the current initial save shell against those schemas.
- First authored mission dialogue/comms layer: event-triggered dialogue nodes are defined as content, validated by schema/runtime checks, and surfaced in a DOM HUD comms panel.
- Event contract fixtures for high-value gameplay and narrative events.
- Save migration harness with a v0 legacy fixture and current-root hydration tests.
- Save adapter tests cover IndexedDB save, load, list, delete, and fallback-to-primary migration behavior without requiring a browser test runner.
- Combat status effects now run through a reusable status system with refresh, duration stacking, intensity stacking, unique policy handling, authored chance checks, expiry events, and UI-facing snapshot summaries.
- First authored combat status path: `pulse_lance_mk1` applies `ionized`, which emits `combat.status_applied`, ticks shield pressure over time, emits `combat.status_expired`, and surfaces active status summaries in the HUD/event feed.
- Combat simulation has been split behind a stable `combatSimulation.ts` facade into focused spawn, movement, resource, weapon, enemy behavior, projectile, damage, status, and lifecycle systems.
- One event-driven placeholder VFX response for enemy destruction.
- Machine-readable JSON schema mirrors now exist for missions, dialogue nodes, enemy archetypes, player ships, weapons, status effects, faction state, sector state, and save roots.
- Runtime content validation now covers ship tuning, weapon tuning, enemy archetype tuning, status effect timing/stacking basics, faction and sector registry identity, sector control references, encounter enemy references, encounter coordinates, mission unlock references, reward values, and consequence deltas.
- The content validation CLI reports registry counts and exits nonzero on schema, shape, or cross-reference drift.
- A third playable mission, `lattice_rescue_contract_03`, now proves a first contract-template style loop with two authored enemy spawns, a survive objective, a final choice, rewards, sector/faction changes, and authored comms.
- The HUD mission panel now shows the current mission title, briefing, objective titles, sector, reward value, completed mission count, and richer next-mission reward details.

## Playable Slice

Current starting mission: `corridor_breach_01`

The player controls the `veilrunner_proto` ship in the `freeport_lattice` sector. The player destroys one fracture drone, then chooses a recovery doctrine:

- `1`: stabilize civilian lanes, increasing Freeports reputation and civilian stability.
- `2`: scan the anomaly wake, shifting reputation differently and granting anomaly intel.

Completing `corridor_breach_01` unlocks `ashwake_wake_02` in the `ashwake_cleft` sector. The second mission reuses the fracture drone archetype through mission encounter data and asks the player to route recovered telemetry toward Ashwake research or Freeport civilian routing.

Completing `ashwake_wake_02` unlocks `lattice_rescue_contract_03` back in the `freeport_lattice` sector. The third mission is the first contract-template prototype: destroy two fracture scouts, hold the rescue lane through a short survive objective, then choose between convoy routing and salvage beacon recovery.

Controls:

- Move: `WASD` or arrow keys
- Aim: mouse
- Fire: left mouse or `Space`
- Choice selection: `1` or `2` when the mission choice appears
- Continue to next unlocked mission after resolution: `Enter` or `N`

## Architecture Rules Already Enforced

- Combat simulation does not depend on DOM or Pixi APIs.
- Rendering observes snapshots and domain events; it does not mutate gameplay truth.
- `src/features/combat/combatSimulation.ts` is now the orchestration facade; new combat mechanics should land in the focused system modules instead of rebuilding the monolithic simulation file.
- Mission choices dispatch typed commands into `MissionRuntime`.
- Mission outcomes are applied through `applyConsequenceBundle`, not hardcoded into UI or rendering.
- Save data is versioned at the root with `saveVersion: 1`.
- Legacy save hydration is routed through `hydrateSaveGameRoot`; future save-shape changes should add migration fixtures before changing runtime saves.
- Save hydration backfills newly authored starter sectors/factions and derives follow-up campaign unlocks from completed starter mission consequences.
- Starter content is cloned into registries before use so tests and runtime mutations do not poison shared source data.
- Content validation catches common drift such as invalid IDs, invalid semver, missing weapon/status references, invalid numeric tuning, malformed objectives, destroy-objective/enemy-spawn mismatch, choice resulting-flag mismatch, broken registry keys, and unknown sector/faction references.
- Weapon status references are validated against authored status definitions.
- Mission encounter enemy references are validated against authored enemy archetypes, and combat spawn uses encounter data rather than hardcoded enemy construction.
- Bootstrap selects the first available campaign mission that has not already been completed.
- Mission selection logic lives in `src/app/missionSelection.ts`; app bootstrap uses it for initial mission selection, HUD summaries, and post-mission continuation, and the selector can derive follow-up mission availability from completed mission consequences when an already-loaded save has stale `availableMissions`.
- Replay continuation logic uses the current mission's authored full-success unlock chain when all missions are already marked complete, preserving playability for local/default-slot completed saves without silently wiping progress.
- Authored JSON schemas are compiled with the draft 2020-12 Ajv path and applied to starter content objects during content validation.
- Dialogue is event-driven through `DialogueDirector`; authored lines listen to domain events and the HUD only renders the current dialogue snapshot.

## Important Files

- `src/types/contracts.ts`: canonical gameplay, mission, save, and event contracts.
- `src/core/eventBus.ts`: typed event envelope and pub/sub.
- `src/core/gameLoop.ts`: fixed-step update loop.
- `src/features/combat/combatSimulation.ts`: public headless combat facade for create, tick, and snapshot.
- `src/features/combat/combatTypes.ts`: shared combat entity, resource, projectile, status, command, and state types.
- `src/features/combat/spawnSystem.ts`: player and mission encounter spawning from content archetypes.
- `src/features/combat/movementSystem.ts`: player movement, aim rotation, and world bounds.
- `src/features/combat/resourceSystem.ts`: weapon cooldown and energy/heat recovery.
- `src/features/combat/weaponSystem.ts`: primary weapon fire and projectile creation.
- `src/features/combat/enemyBehaviorSystem.ts`: enemy pressure movement, aim rotation, cooldowns, and projectile fire from authored archetype behavior.
- `src/features/combat/projectileSystem.ts`: projectile movement, bounds expiry, collision lookup, and hit resolution dispatch.
- `src/features/combat/damageSystem.ts`: shield/hull damage and destruction event emission.
- `src/features/combat/statusSystem.ts`: projectile status application, authored chance checks, stacking policies, status ticking, expiry events, and ionized shield pressure.
- `src/features/combat/lifecycleSystem.ts`: cleanup of inactive transient combat entities.
- `src/features/dialogue/dialogueDirector.ts`: event-driven mission comms runtime.
- `src/features/mission/missionRuntime.ts`: mission objective sequencing, choice commands, and outcome generation.
- `src/features/narrative/narrativeState.ts`: consequence application into persistent game state.
- `src/features/save/saveService.ts`: save adapter contract, IndexedDB and localStorage implementations, browser adapter factory, and save hydration/migration entry point.
- `src/app/missionSelection.ts`: next unlocked mission selection, replay continuation selection, and mission panel summary helpers for boot, HUD, and post-mission continuation.
- `src/app/missionFlow.ts`: resolved-state continuation timing and combat-hold rules for choice/resolution UI states.
- `src/data/missions.ts`: current starter mission content.
- `src/data/enemies.ts`: current enemy archetype content used by mission encounter spawning.
- `src/data/dialogues.ts`: current starter mission dialogue/comms content.
- `src/data/validation.ts`: starter content validator.
- `src/tools/contentValidationReport.ts`: shared content validation report builder for tests and CLI output.
- `src/tools/jsonSchemaValidator.ts`: Ajv-backed JSON Schema validation wrapper for content/schema drift checks.
- `src/tools/contentValidationCli.ts` and `scripts/validate-content.mjs`: dedicated content validation command path.
- `schemas/*.schema.json`: machine-readable mirrors for mission, ship, weapon, status effect, faction, sector, and save root contracts.
- `fixtures/events/*.json`: event contract fixtures.
- `fixtures/saves/save-v0-legacy.json`: first save migration fixture.
- `tests/unit/*.test.ts` and `tests/integration/*.test.ts`: current quality coverage.

## Quality Gates

Run these before handing off a major update, but keep the work itself gameplay-led:

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
- `npm test`: passing, 12 files and 41 tests
- `npm run build`: passing

Build caveat: Vite currently warns that the main JS chunk is just over 500 kB after minification. The latest observed build reported about 539.75 kB. This is mostly expected from PixiJS at this early stage, but renderer/app code-splitting should be addressed before content and presentation scale up.

Testing guidance for alpha: use the current unit/content/build gates as a guardrail. Do not expand the test/tooling surface unless a player-facing feature needs that protection to avoid regressions.

## Known Risks And Caveats

- IndexedDB is now the browser default, but the game still needs real-browser smoke coverage for first-run save creation, existing localStorage migration, private-browsing failure modes, and quota errors.
- Save migration discipline has started, but there is only one legacy fixture. Any persistent shape change needs a new before/after fixture pair.
- Dialogue nodes now exist, but this is a lightweight comms surface, not a full branching dialogue graph or localization-ready conversation system.
- Some schema sections are still intentionally permissive, especially consequence bundles, encounter variants, and nested save-world faction/sector maps. The Ajv pass now validates the schemas as written, and runtime validation now catches more mission-authoring drift, but schema coverage should tighten before larger content packs land.
- Combat now has focused system modules and first enemy pressure/fire behavior, but hazards, richer enemy patterns, player death/fail states, and deeper lifecycle rules still need dedicated systems before combat becomes production-complete.
- Status effects now have a general stacking/expiry path, but only `ionized` has a gameplay tick handler. Additional effects should add focused tick handlers and HUD affordances as their mechanics become real.
- VFX is intentionally placeholder-level. The renderer has an event-driven explosion ring, not the final pooled particle/VFX architecture.
- No Playwright/Puppeteer browser smoke test exists yet, and the repo currently has neither Playwright nor Puppeteer installed. Current unit coverage now protects mission continuation timing and completed-save replay continuation, but a real browser smoke should still verify Stage 1 choice, Stage 2 launch, dialogue display, IndexedDB persistence, and stale localStorage migration.
- No debug overlay exists yet for events, simulation stats, save state, or content validation reports.
- The Git workspace may require `safe.directory` handling in this environment because Git previously reported an ownership warning.
- `npm install` reported 6 moderate dependency audit findings. Do not run breaking audit fixes casually; evaluate dependency upgrades deliberately.

These risks are real, but most are not the next alpha blockers. The highest alpha blockers are player death/retry, more playable content, clear progression/rewards, enemy variety, stronger combat feedback, and a less prototype-like mission flow.

## Current Next 10 Tasks

1. Add player death, mission failure, retry, and fail-forward handling now that enemies can damage the player.
2. Add a fourth playable mission that uses the new enemy pressure/fire behavior and introduces a more interesting objective mix.
3. Add basic post-mission progression: salvage spend, a simple repair/upgrade choice, or a loadout improvement that changes the next run.
4. Improve combat feel with player damage feedback, hit flashes, clearer enemy shots, low-shield warning, and stronger destruction/VFX/audio cues.
5. Add at least one new enemy behavior variant or attack pattern so drones and scouts do not feel like identical targets with different stats.
6. Add the next authored status effect with a real gameplay handler so the status system is proven beyond `ionized`.
7. Add a simple mission select/continue screen once more than one mission can be available, with clear rewards and sector context.
8. Add a player-facing new game/reset slot affordance so completed local saves do not confuse playtesters.
9. Expand mission runtime objective support only where needed for authored gameplay, starting with escort, timed interact, or fail-forward branches.
10. Add more authored comms, rewards, and sector/faction consequences to make choices feel visible during play.

## Post-Alpha Or Only If Blocking Gameplay

The following are useful but should not consume alpha time unless they directly unblock a player-facing feature or serious bug:

- Debug overlay for event history, content validation, FPS/frame timing, save state, and active status summaries.
- Broader Playwright/Puppeteer automation and screenshot smoke suites.
- Tightening permissive schemas beyond what current authored content needs.
- More event contract fixtures or test harness work unrelated to current gameplay bugs.
- Renderer/app code-splitting or Pixi chunk isolation unless load time or runtime performance becomes a visible player problem.
- Dependency audit upgrades unless a security issue or install/build failure blocks shipping.
- Large save migration harness expansion unless save shape changes are needed for alpha progression.

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
2. Run the game locally and play through the first three missions from a fresh slot or reset save state.
3. Pick one bounded gameplay packet from the next task list, starting with player death/fail-forward or Mission 4.
4. Read `DOCS/implementation-startup-brief.md`, Technical Architecture Spec, and Interface Contract Spec only as needed before touching runtime boundaries.
5. Keep existing gates green after the gameplay change.
6. Update this handoff with what changed for players, what remains rough, and the next gameplay priority.
