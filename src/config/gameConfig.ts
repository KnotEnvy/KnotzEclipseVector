export const GAME_CONFIG = {
  world: {
    width: 1280,
    height: 720,
  },
  simulation: {
    fixedDeltaMs: 1000 / 60,
  },
  save: {
    defaultSlotId: 'A',
    buildHash: 'local-dev',
  },
} as const;
