import { starterFactions } from '@/data/factions';
import { starterMission } from '@/data/missions';
import { starterSectors } from '@/data/sectors';
import type { GameState } from '@/types/contracts';

export function createNewGameState(): GameState {
  return {
    player: {
      shipId: 'veilrunner_proto',
      loadout: {
        primaryWeaponId: 'pulse_lance_mk1',
      },
      salvage: 0,
      unlocks: [],
    },
    campaign: {
      chapter: 1,
      completedMissions: [],
      availableMissions: [starterMission.id],
    },
    story: {
      flags: {},
      counters: {},
      committedChoices: [],
      endingVectors: {},
    },
    world: {
      sectors: structuredClone(starterSectors),
      factions: structuredClone(starterFactions),
    },
  };
}
