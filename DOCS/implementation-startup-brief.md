# Implementation Startup Brief

## MVP Understanding

The MVP is not the full campaign. It is the smallest production-grade proof that Eclipse Vector can be a browser-native, original, consequence-driven space shooter. The documented MVP is one ship, two sectors, two factions, six to eight story missions, three contract templates, one boss, save/load, and visible consequences. This first pass implements only the foundation needed to grow toward that MVP: a stable browser runtime, typed contracts, deterministic-enough simulation, mission resolution, persistent consequence state, and a thin playable scene.

## Proposed Technical Stack

- Vite, strict TypeScript, and ES modules for the browser app shell.
- PixiJS/WebGL2 for the playfield renderer, with simulation state kept outside rendering.
- DOM/CSS HUD for readable mission, resource, and consequence UI.
- Vitest for pure logic and integration tests.
- ESLint and Prettier for quality gates.
- Versioned localStorage save adapter now, with the save service shaped so IndexedDB can become the primary adapter later.

## Core Runtime Modules To Build First

- `src/core`: fixed-step loop, event bus, entity registry, timing, math helpers, RNG hooks.
- `src/types`: canonical domain contracts, save schema root, event payloads.
- `src/features/combat`: headless combat simulation, hit resolution, projectile lifecycle.
- `src/features/mission`: declarative objective runtime and mission resolution.
- `src/features/narrative`: consequence application, flags, committed choices.
- `src/features/factions`: reputation clamping and faction state mutation.
- `src/features/save`: versioned save root, serializers, storage adapter.
- `src/rendering`: Pixi renderer observing snapshots and events.
- `src/app`: bootstrap, scene shell, input normalization, runtime orchestration.
- `src/data`: typed starter content stubs that future content agents can replace with validated JSON registries.

## Major Risks And Avoidance

- Architecture drift: keep mutable state behind owning services and use typed event contracts between domains.
- Renderer coupling: rendering observes combat snapshots only; it never owns combat truth or mission state.
- Save corruption: every persisted root carries `saveVersion`, and adapters validate minimum shape before hydration.
- Content sprawl: starter data contains one mission, one ship, one weapon, one sector, and two factions only.
- Illusory consequence: the sample mission applies visible faction reputation, sector stability, narrative flag, and reward changes.
- Browser performance debt: the renderer uses simple display objects and leaves VFX behind quality-tier extension points.

## Tracked Ambiguities

- The docs recommend both `src/gameplay` and a target structure using `src/game` plus `src/features/*`. This pass uses the requested `src/features/*` layout while keeping gameplay modules independent and service-owned.
- Event naming varies between dot-separated names such as `entity.destroyed` and namespaced names such as `combat.damage_applied`. This pass uses namespaced domain event strings and centralizes them in TypeScript contracts.
- Persistence calls for IndexedDB primary and localStorage fallback. This pass ships the localStorage adapter first because the first milestone needs a stable shell, not a storage abstraction rewrite.
- PixiJS versus Phaser/Pixi appears as a recommendation range in the GDD; the Technical Architecture Spec is more specific, so this pass uses PixiJS.

## First Development Milestone

1. Scaffold Vite, strict TypeScript, linting, formatting, Vitest, and the documented folder boundaries.
2. Define canonical IDs, game state, mission, faction, sector, ship, weapon, status, save, and event contracts.
3. Build a fixed-step game loop with normalized input and a typed event bus.
4. Implement headless combat entities, projectiles, damage, shield/hull updates, and destruction events.
5. Implement a mission runtime that completes one destroy objective and emits one resolution.
6. Apply one consequence bundle to saveable narrative, faction, sector, and progression state.
7. Render a placeholder playable scene in browser with a DOM HUD.
8. Add focused unit and integration tests for pure systems.
