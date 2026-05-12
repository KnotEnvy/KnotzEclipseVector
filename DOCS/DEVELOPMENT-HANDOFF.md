# Eclipse Vector Development Handoff

Last updated: 2026-05-12

## Purpose

This document is the recurring handoff record for major implementation updates to **Eclipse Vector: Fracture of the Veil**. Update it at the end of each significant build pass so the next engineering, content, VFX, QA, or coordination team can understand the current state without reconstructing context from chat history.

## Alpha Direction

The next team should focus on finishing and tuning the playable alpha, not expanding tooling for its own sake. The game now has four missions, basic mission continuation, player fire, enemy fire, player failure/retry, fail-forward fallout, status effects, a simple salvage upgrade, mission board selection, reset-slot affordance, saves, and HUD feedback. The immediate product goal is to playtest that loop, tighten feel and clarity, then add the next bounded content/mechanics slice.

For the next build passes:

- Prioritize mechanics, content, feedback, and player-facing flow.
- Add tests only when they protect fragile gameplay, save continuity, mission progression, or a bug that has already broken play.
- Keep existing quality gates green, but do not build new test frameworks, debug tools, schemas, reports, or infrastructure unless they directly unblock alpha gameplay.
- Prefer visible improvements: better enemy patterns, clearer rewards, stronger combat feedback, more authored mission variety, upgrade decisions, failure clarity, and a less prototype-like mission selection/continue experience.
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
- Enemies now participate in combat through authored archetype behavior: drones/scouts move toward pressure range, lancers strafe, enemies rotate toward the player, fire projectiles, and damage the player's shield/hull through the same projectile and damage systems as player fire.
- Declarative mission runtime with destroy, survive, and branchable choice-gate objectives.
- Enemy archetype registry and data-driven mission encounter spawning. Starter missions now use the fracture drone, fracture scout, and fracture lancer archetypes with authored movement pattern, volley, range, projectile, and status-effect tuning.
- Narrative consequence application through a structured consequence bundle.
- Campaign mission unlock consequences now append follow-up missions into `availableMissions`; save hydration derives follow-up unlocks from completed starter mission consequences instead of relying on one-off mission IDs.
- Faction, sector, progression, and save state changes applied through service boundaries.
- IndexedDB-backed versioned save shell with automatic localStorage fallback and one-time migration of existing localStorage saves into IndexedDB when a slot is first loaded.
- DOM HUD layered over a Pixi playfield.
- Lightweight post-mission continuation flow: after a mission resolves, the HUD shows the next unlocked mission, sector, reward summary, and `Enter` or `N` launches it without reloading the page.
- Player death now resolves the mission into a visible failed state with fail-forward sector/faction/story fallout, no completed-mission credit, and `R` retry from the same runtime path.
- A compact mission board can be toggled with `M` so unlocked/completed missions can be selected from the HUD without leaving the playfield.
- A reset-slot confirmation prompt is available through `Delete`, then `Y`, so playtesters can recover from confusing completed local saves without manually clearing browser storage.
- Basic post-mission progression exists through a salvage spend: the `Field Capacitor` upgrade costs 120 salvage, installs from the HUD with `U`, and improves the next ship spawn with +24 shield and +8 hull.
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
- Second authored combat status path: `fracture_lancer` projectiles can apply `veil_scar`, which stacks intensity, ticks direct hull pressure, can destroy its target, and has a distinct HUD/rendering marker.
- Combat simulation has been split behind a stable `combatSimulation.ts` facade into focused spawn, movement, resource, weapon, enemy behavior, projectile, damage, status, and lifecycle systems.
- Event-driven visual feedback now covers enemy destruction rings, impact flashes, player/enemy damage flashes, enemy projectile coloring, low-shield HUD warning, and distinct `ionized`/`veil_scar` status markers.
- Machine-readable JSON schema mirrors now exist for missions, dialogue nodes, enemy archetypes, player ships, weapons, status effects, faction state, sector state, and save roots.
- Runtime content validation now covers ship tuning, weapon tuning, enemy archetype tuning, status effect timing/stacking basics, faction and sector registry identity, sector control references, encounter enemy references, encounter coordinates, mission unlock references, reward values, and consequence deltas.
- The content validation CLI reports registry counts and exits nonzero on schema, shape, or cross-reference drift.
- A third playable mission, `lattice_rescue_contract_03`, proves a first contract-template style loop with two authored enemy spawns, a survive objective, a final choice, rewards, sector/faction changes, and authored comms.
- A fourth playable mission, `veil_lancer_intercept_04`, introduces the fracture lancer, strafe movement, volley fire, `veil_scar` pressure, a destroy/survive/choice objective chain, new rewards, and authored comms.
- The HUD mission panel now shows the current mission title, briefing, objective titles, sector, reward value, completed mission count, and richer next-mission reward details.
- The HUD now also exposes failure/retry, low-shield warning, mission board, reset prompt, salvage total, and Field Capacitor upgrade state.

## Playable Slice

Current starting mission: `corridor_breach_01`

The player controls the `veilrunner_proto` ship in the `freeport_lattice` sector. The player destroys one fracture drone, then chooses a recovery doctrine:

- `1`: stabilize civilian lanes, increasing Freeports reputation and civilian stability.
- `2`: scan the anomaly wake, shifting reputation differently and granting anomaly intel.

Completing `corridor_breach_01` unlocks `ashwake_wake_02` in the `ashwake_cleft` sector. The second mission reuses the fracture drone archetype through mission encounter data and asks the player to route recovered telemetry toward Ashwake research or Freeport civilian routing.

Completing `ashwake_wake_02` unlocks `lattice_rescue_contract_03` back in the `freeport_lattice` sector. The third mission is the first contract-template prototype: destroy two fracture scouts, hold the rescue lane through a short survive objective, then choose between convoy routing and salvage beacon recovery.

Completing `lattice_rescue_contract_03` unlocks `veil_lancer_intercept_04` in the `ashwake_cleft` sector. The fourth mission introduces the fracture lancer archetype: it strafes, fires spread volleys, can apply `veil_scar`, and asks the player to clear a three-enemy screen, survive the scar echo, then choose between stabilizing damaged ships or capturing pursuit telemetry.

If the player ship is destroyed during an active mission, the mission enters a failed state, applies fail-forward fallout, and keeps the mission available for retry. Press `R` to relaunch the current mission.

After enough salvage is earned, the player can install the Field Capacitor from the HUD for 120 salvage. The upgrade applies to the next player spawn and adds +24 shield and +8 hull.

Controls:

- Move: `WASD` or arrow keys
- Aim: mouse
- Fire: left mouse or `Space`
- Choice selection: `1` or `2` when the mission choice appears
- Continue to next unlocked mission after resolution: `Enter` or `N`
- Retry failed mission: `R`
- Toggle mission board: `M`
- Select visible mission board entry: number keys `1` through `5`
- Install Field Capacitor when available: `U`
- Reset slot prompt: `Delete`, then `Y` to confirm

## Architecture Rules Already Enforced

- Combat simulation does not depend on DOM or Pixi APIs.
- Rendering observes snapshots and domain events; it does not mutate gameplay truth.
- `src/features/combat/combatSimulation.ts` is now the orchestration facade; new combat mechanics should land in the focused system modules instead of rebuilding the monolithic simulation file.
- Mission choices dispatch typed commands into `MissionRuntime`.
- Mission outcomes are applied through `applyConsequenceBundle`, not hardcoded into UI or rendering.
- Player destruction is routed through `MissionRuntime.fail('fail_forward')`; fail-forward consequences apply fallout but do not mark the mission completed.
- `applyConsequenceBundle` can apply consequences without completion credit through its `markCompleted` option. Use that path for failure/fallout outcomes.
- Save data is versioned at the root with `saveVersion: 1`.
- Legacy save hydration is routed through `hydrateSaveGameRoot`; future save-shape changes should add migration fixtures before changing runtime saves.
- Save hydration backfills newly authored starter sectors/factions and derives follow-up campaign unlocks from completed starter mission consequences.
- Starter content is cloned into registries before use so tests and runtime mutations do not poison shared source data.
- Content validation catches common drift such as invalid IDs, invalid semver, missing weapon/status references, invalid numeric tuning, malformed objectives, destroy-objective/enemy-spawn mismatch, choice resulting-flag mismatch, broken registry keys, and unknown sector/faction references.
- Weapon status references are validated against authored status definitions.
- Mission encounter enemy references are validated against authored enemy archetypes, and combat spawn uses encounter data rather than hardcoded enemy construction.
- Bootstrap selects the first available campaign mission that has not already been completed.
- Mission selection logic lives in `src/app/missionSelection.ts`; app bootstrap uses it for initial mission selection, HUD summaries, and post-mission continuation, and the selector can derive follow-up mission availability from completed mission consequences when an already-loaded save has stale `availableMissions`.
- Mission board summaries also come from `src/app/missionSelection.ts`; do not duplicate mission availability or completed-state logic in the HUD.
- Replay continuation logic uses the current mission's authored full-success unlock chain when all missions are already marked complete, preserving playability for local/default-slot completed saves without silently wiping progress.
- Authored JSON schemas are compiled with the draft 2020-12 Ajv path and applied to starter content objects during content validation.
- Dialogue is event-driven through `DialogueDirector`; authored lines listen to domain events and the HUD only renders the current dialogue snapshot.
- Enemy movement/fire variation is authored on `EnemyArchetypeDefinition.behavior`; current patterns are `pressure` and `strafe`, with optional volley and status-effect fields.
- Player upgrade effects are applied at spawn through progression unlocks, not by mutating the base ship definition.

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
- `src/features/progression/progressionState.ts`: reward granting plus Field Capacitor purchase constants and purchase guard.
- `src/features/audio/audioDirector.ts`: lightweight Web Audio event cues for damage, destruction, and mission resolution.
- `src/features/dialogue/dialogueDirector.ts`: event-driven mission comms runtime.
- `src/features/mission/missionRuntime.ts`: mission objective sequencing, choice commands, and outcome generation.
- `src/features/narrative/narrativeState.ts`: consequence application into persistent game state.
- `src/features/save/saveService.ts`: save adapter contract, IndexedDB and localStorage implementations, browser adapter factory, and save hydration/migration entry point.
- `src/app/bootstrap.ts`: runtime wiring for save load/create, mission launch, failure/retry, mission board, reset slot, upgrade purchase, consequence application, loop update, and HUD render input.
- `src/app/input.ts`: keyboard/mouse input, choices, continue, retry, mission-board selection, upgrade, and reset confirmation queues.
- `src/app/hud.ts`: DOM HUD rendering for ship state, objectives, choices, resolved/failed states, mission board, reset prompt, upgrade prompt, comms, world state, and event feed.
- `src/app/missionSelection.ts`: next unlocked mission selection, replay continuation selection, and mission panel summary helpers for boot, HUD, and post-mission continuation.
- `src/app/missionFlow.ts`: resolved-state continuation timing and combat-hold rules for choice/resolution UI states.
- `src/rendering/PixiRenderer.ts`: Pixi rendering for the playfield, entity silhouettes, projectile colors, status markers, destruction rings, and hit flashes.
- `src/styles.css`: HUD layout, warning, mission board, modal, status, and panel styling.
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
- `npm test`: passing, 12 files and 46 tests
- `npm run build`: passing

Latest `npm run validate:content` summary: `missions=4 ships=1 weapons=1 statusEffects=2 enemyArchetypes=3 dialogueNodes=16 factions=2 sectors=2 schemas=9`.

Build caveat: Vite currently warns that the main JS chunk is over 500 kB after minification. The latest observed build reported about 553.98 kB. This is mostly expected from PixiJS plus the growing runtime at this early stage, but renderer/app code-splitting should be addressed before content and presentation scale up.

Testing guidance for alpha: use the current unit/content/build gates as a guardrail. Do not expand the test/tooling surface unless a player-facing feature needs that protection to avoid regressions.

## Known Risks And Caveats

- IndexedDB is now the browser default, but the game still needs real-browser smoke coverage for first-run save creation, existing localStorage migration, private-browsing failure modes, and quota errors.
- Save migration discipline has started, but there is only one legacy fixture. Any persistent shape change needs a new before/after fixture pair.
- Dialogue nodes now exist, but this is a lightweight comms surface, not a full branching dialogue graph or localization-ready conversation system.
- Some schema sections are still intentionally permissive, especially consequence bundles, encounter variants, and nested save-world faction/sector maps. The Ajv pass now validates the schemas as written, and runtime validation now catches more mission-authoring drift, but schema coverage should tighten before larger content packs land.
- Combat now has focused system modules, pressure and strafe enemy patterns, player failure, and retry, but hazards, richer enemy families, tuned encounter pacing, and deeper lifecycle rules still need dedicated systems before combat becomes production-complete.
- Status effects now have a general stacking/expiry path plus two gameplay tick handlers: `ionized` shield pressure and `veil_scar` hull pressure. Additional effects should add focused tick handlers and HUD/rendering affordances as their mechanics become real.
- VFX/audio are still early. The renderer has event-driven destruction rings, impact flashes, damage flashes, projectile coloring, and status markers, and the audio director has lightweight event tones, but this is not the final pooled VFX/audio architecture.
- No Playwright/Puppeteer browser smoke test exists yet, and the repo currently has neither Playwright nor Puppeteer installed. Current unit/integration coverage protects mission continuation, failure, Mission 4, status ticking, and completed-save replay continuation, but a real browser smoke should still verify the four-mission playthrough, player death/retry, mission board selection, Field Capacitor purchase, reset prompt, dialogue display, IndexedDB persistence, and stale localStorage migration.
- Manual smoke note from the latest pass: the active Vite server responded with HTTP 200 at `http://127.0.0.1:5173`. Microsoft Edge could dump the local DOM in headless mode, but direct screenshot and remote-debugging capture did not emit a usable screenshot in this environment. Treat real browser playtest as the next validation step.
- No debug overlay exists yet for events, simulation stats, save state, or content validation reports.
- The Git workspace may require `safe.directory` handling in this environment because Git previously reported an ownership warning.
- `npm install` reported 6 moderate dependency audit findings. Do not run breaking audit fixes casually; evaluate dependency upgrades deliberately.

These risks are real, but most are not the next alpha blockers. The highest alpha blockers are now playtest feedback, combat balance/readability, mission-flow clarity, upgrade economy tuning, and any browser persistence or retry bugs found during the first full manual pass.

## Current Next 10 Tasks

1. Run a full manual browser playtest from a fresh/reset slot through all four missions, including at least one intentional player death and retry.
2. Tune combat balance from playtest: enemy damage, lancer volley spread, Field Capacitor cost/impact, mission-4 difficulty, and low-shield readability.
3. Fix any reported progression bugs before adding more content, especially completion credit, fail-forward fallout, retry, mission board selection, and reset behavior.
4. Add Mission 5 only after the four-mission loop feels understandable; use it to introduce one new objective shape or enemy pressure pattern, not a new framework.
5. Improve mission-board presentation with clearer reward, sector, completed, current, and failure/retry context once playtest confirms the current keyboard flow.
6. Add one more player-facing upgrade or repair choice that competes with Field Capacitor for salvage and changes how the next run feels.
7. Strengthen VFX/audio only where players need readability: player hurt cue, enemy hit confirmation, mission completion, failure, and upgrade install.
8. Add a real browser smoke path if the team chooses to install Playwright/Puppeteer; cover boot, reset, Mission 1 choice, continuation, failure/retry, mission board, and IndexedDB persistence.
9. Add save migration fixtures immediately if the upgrade/progression save shape changes beyond current `unlocks` and `salvage` fields.
10. Refresh this handoff again after playtest fixes, with exact bugs found, player-facing changes made, and the next prioritized alpha slice.

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
2. Run the game locally and play through the first four missions from a fresh slot or reset save state.
3. Intentionally fail at least one mission, retry it, open the mission board, and install Field Capacitor when enough salvage is available.
4. Read `DOCS/implementation-startup-brief.md`, Technical Architecture Spec, and Interface Contract Spec only as needed before touching runtime boundaries.
5. Keep existing gates green after the gameplay change.
6. Update this handoff with what changed for players, what remains rough, and the next gameplay priority.
