import type { EnemyArchetypeDefinition } from '@/types/contracts';

export const starterEnemyArchetypes: EnemyArchetypeDefinition[] = [
  {
    id: 'fracture_drone',
    version: '1.0.0',
    displayName: 'Fracture Drone',
    factionId: 'fracture',
    radius: 26,
    stats: {
      hull: 80,
      shield: 30,
      maxHeat: 100,
    },
    tags: ['enemy', 'fracture', 'drone', 'mvp'],
  },
];
