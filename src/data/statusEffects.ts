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
];
