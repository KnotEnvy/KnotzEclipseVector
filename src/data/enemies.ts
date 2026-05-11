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
    behavior: {
      moveSpeed: 68,
      preferredRange: 520,
      fireRange: 620,
      fireCooldownMs: 1200,
      projectileSpeed: 410,
      projectileLifetimeMs: 1800,
      projectileDamage: 8,
      projectileDamageType: 'energy',
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
    behavior: {
      moveSpeed: 96,
      preferredRange: 440,
      fireRange: 560,
      fireCooldownMs: 950,
      projectileSpeed: 470,
      projectileLifetimeMs: 1500,
      projectileDamage: 6,
      projectileDamageType: 'kinetic',
    },
    tags: ['enemy', 'fracture', 'scout', 'contract'],
  },
];
