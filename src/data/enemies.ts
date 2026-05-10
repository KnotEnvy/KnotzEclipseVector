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
  {
    id: 'fracture_scout',
    version: '1.0.0',
    displayName: 'Fracture Scout',
    factionId: 'fracture',
    radius: 18,
    stats: {
      hull: 45,
      shield: 15,
      maxHeat: 80,
    },
    tags: ['enemy', 'fracture', 'scout', 'contract'],
  },
];
