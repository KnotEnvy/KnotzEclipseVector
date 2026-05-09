import type { WeaponDefinition } from '@/types/contracts';

export const starterWeapons: WeaponDefinition[] = [
  {
    id: 'pulse_lance_mk1',
    version: '1.0.0',
    displayName: 'Pulse Lance Mk I',
    fireMode: 'single',
    energyCost: 2,
    heatGain: 4,
    cooldownMs: 180,
    projectileSpeed: 760,
    projectileLifetimeMs: 1100,
    damageProfile: {
      amount: 22,
      type: 'energy',
      critChance: 0,
    },
    tags: ['primary', 'prototype', 'readable'],
    effectKey: 'pulse_lance_trail',
  },
];
