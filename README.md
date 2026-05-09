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

The current playable slice boots a PixiJS playfield with a DOM HUD, a fixed-step simulation loop, typed events, player movement, basic firing, one enemy placeholder, hit resolution, a destroy objective, a branchable mission choice, one mission outcome, and persistent consequences applied through the save shell.

The starter `pulse_lance_mk1` also applies the first status-effect path, `ionized`, so future combat work has a tested extension point for authored status definitions.

Content validation now runs through a dedicated CLI and includes schema mirrors for the shipped mission, ship, weapon, status effect, faction, sector, and save-root contracts, plus runtime checks for high-risk cross-references and tuning values.

Controls: `WASD` or arrow keys to move, mouse to aim, left mouse or space to fire, and `1` / `2` to choose a recovery doctrine when prompted.

## Handoff

Start with `DOCS/DEVELOPMENT-HANDOFF.md` before continuing implementation.
