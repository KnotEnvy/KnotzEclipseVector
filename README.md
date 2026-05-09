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
npm test
npm run build
```

## Current Slice

The first playable slice boots a PixiJS playfield with a DOM HUD, a fixed-step simulation loop, typed events, player movement, basic firing, one enemy placeholder, hit resolution, one mission objective, one mission outcome, and one persistent consequence applied through the save shell.

Controls: `WASD` or arrow keys to move, mouse to aim, left mouse or space to fire.
