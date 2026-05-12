import type { EventBus } from '@/core/eventBus';
import type { MissionId, PlayerProgressionState } from '@/types/contracts';

export const FIELD_CAPACITOR_UNLOCK = 'field_capacitor_mk1';
export const FIELD_CAPACITOR_COST = 120;
export const FIELD_CAPACITOR_SHIELD_BONUS = 24;
export const FIELD_CAPACITOR_HULL_BONUS = 8;

export function grantMissionRewards(
  player: PlayerProgressionState,
  input: {
    missionId: MissionId;
    salvage: number;
    unlocks: string[];
  },
  eventBus?: EventBus,
): void {
  player.salvage += input.salvage;

  for (const unlock of input.unlocks) {
    if (!player.unlocks.includes(unlock)) {
      player.unlocks.push(unlock);
    }
  }

  eventBus?.publish('inventory.reward_granted', {
    salvage: input.salvage,
    unlocks: input.unlocks,
    sourceMissionId: input.missionId,
  });
}

export function canPurchaseFieldCapacitor(player: PlayerProgressionState): boolean {
  return !player.unlocks.includes(FIELD_CAPACITOR_UNLOCK) && player.salvage >= FIELD_CAPACITOR_COST;
}

export function purchaseFieldCapacitor(player: PlayerProgressionState): boolean {
  if (!canPurchaseFieldCapacitor(player)) {
    return false;
  }

  player.salvage -= FIELD_CAPACITOR_COST;
  player.unlocks.push(FIELD_CAPACITOR_UNLOCK);
  return true;
}
