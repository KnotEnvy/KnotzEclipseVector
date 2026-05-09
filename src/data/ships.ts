import type { PlayerShipDefinition } from '@/types/contracts';

export const starterShips: PlayerShipDefinition[] = [
  {
    id: 'veilrunner_proto',
    version: '1.0.0',
    class: 'prototype',
    displayName: 'Veilrunner Prototype',
    slots: {
      hull: 'prototype_frame_light',
      engine: 'vector_drift_engine',
      reactor: 'veil_sync_reactor',
      shieldCore: 'phase_screen_mk1',
      hardpoints: ['pulse_lance_mk1'],
      utilities: [],
      aiCore: 'synthetic_advisor_seed',
    },
    stats: {
      maxHull: 120,
      maxShield: 80,
      maxEnergy: 100,
      maxHeat: 100,
      moveSpeed: 360,
      turnRate: 12,
    },
    tags: ['player', 'prototype', 'mvp'],
  },
];
