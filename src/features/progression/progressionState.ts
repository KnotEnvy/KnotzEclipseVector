import type { EventBus } from '@/core/eventBus';
import type { MissionId, PlayerProgressionState } from '@/types/contracts';

export const FIELD_CAPACITOR_UNLOCK = 'field_capacitor_mk1';
export const FIELD_CAPACITOR_COST = 120;
export const FIELD_CAPACITOR_SHIELD_BONUS = 24;
export const FIELD_CAPACITOR_HULL_BONUS = 8;
export const RESONANCE_INJECTOR_UNLOCK = 'resonance_injector_mk1';
export const RESONANCE_INJECTOR_BLUEPRINT = 'resonance_injector_blueprint';
export const RESONANCE_INJECTOR_COST = 180;
export const RESONANCE_INJECTOR_DAMAGE_BONUS = 6;

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

export function canPurchaseResonanceInjector(player: PlayerProgressionState): boolean {
  return (
    player.unlocks.includes(RESONANCE_INJECTOR_BLUEPRINT) &&
    !player.unlocks.includes(RESONANCE_INJECTOR_UNLOCK) &&
    player.salvage >= RESONANCE_INJECTOR_COST
  );
}

export function purchaseResonanceInjector(player: PlayerProgressionState): boolean {
  if (!canPurchaseResonanceInjector(player)) {
    return false;
  }

  player.salvage -= RESONANCE_INJECTOR_COST;
  player.unlocks.push(RESONANCE_INJECTOR_UNLOCK);
  return true;
}

export function canPurchaseAnyUpgrade(player: PlayerProgressionState): boolean {
  return canPurchaseFieldCapacitor(player) || canPurchaseResonanceInjector(player);
}

export function purchaseNextAvailableUpgrade(player: PlayerProgressionState): boolean {
  if (canPurchaseFieldCapacitor(player)) {
    return purchaseFieldCapacitor(player);
  }

  return purchaseResonanceInjector(player);
}
