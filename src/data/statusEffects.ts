import type { StatusEffectDefinition } from '@/types/contracts';

export const starterStatusEffects: StatusEffectDefinition[] = [
  {
    id: 'ionized',
    version: '1.0.0',
    displayName: 'Ionized',
    stacking: 'refresh',
    durationMs: 2500,
    tickRateMs: 500,
    maxStacks: 1,
    visualKey: 'status_ionized',
    tags: ['control', 'prototype'],
  },
  {
    id: 'veil_scar',
    version: '1.0.0',
    displayName: 'Veil Scar',
    stacking: 'stack-intensity',
    durationMs: 3600,
    tickRateMs: 900,
    maxStacks: 2,
    visualKey: 'status_veil_scar',
    tags: ['hazard', 'fracture', 'damage_over_time'],
  },
];
