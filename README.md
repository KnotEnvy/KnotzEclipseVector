# Eclipse Vector: Fracture of the Veil

Browser-native TypeScript foundation for the original narrative space shooter described in the project specs.

## Local Startup

```bash
npm install
npm run dev
```

Open the Vite URL printed by the dev server.

## Quality Gates

```bash
npm run typecheck
npm run lint
npm run validate:content
npm test
npm run build
```

## Current Slice

The current playable slice boots a PixiJS playfield with a DOM HUD, a fixed-step simulation loop, typed events, player movement, firing, enemy fire, authored enemy archetypes, five missions, mission continuation, player failure/retry, branchable mission choices, fail-forward consequences, mission-board selection, reset-slot support, salvage upgrades, and persistent consequences applied through the save shell.

The starter `pulse_lance_mk1` applies `ionized`, and fracture lancer projectiles can apply `veil_scar`, so future combat work has reusable extension points for authored status definitions.

Content validation now runs through a dedicated CLI and includes schema mirrors for shipped missions, dialogue nodes, enemy archetypes, ship, weapon, status effect, faction, sector, and save-root contracts, plus runtime checks for high-risk cross-references and tuning values.

Controls: `WASD` or arrow keys to move, mouse to aim, left mouse or space to fire, `1` / `2` to choose when prompted, `Enter` or `N` to continue, `R` to retry, `M` for the mission board, `U` to install available upgrades, and `Delete` then `Y` to reset the slot.

## Handoff

Start with `DOCS/DEVELOPMENT-HANDOFF.md` before continuing implementation.
