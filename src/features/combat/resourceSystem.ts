import { clamp } from '@/utils/math';
import type { CombatEntity } from './combatTypes';

export function updateCooldownAndResources(entity: CombatEntity, deltaMs: number): void {
  entity.weaponCooldownMs = Math.max(0, (entity.weaponCooldownMs ?? 0) - deltaMs);

  if (!entity.resources) {
    return;
  }

  entity.resources.energy = clamp(
    entity.resources.energy + (18 * deltaMs) / 1000,
    0,
    entity.resources.maxEnergy,
  );
  entity.resources.heat = clamp(
    entity.resources.heat - (16 * deltaMs) / 1000,
    0,
    entity.resources.maxHeat,
  );
}
