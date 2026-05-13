import type { WeaponDefinition } from '@/types/contracts';
import { clamp, normalize } from '@/utils/math';
import {
  RESONANCE_INJECTOR_DAMAGE_BONUS,
  RESONANCE_INJECTOR_UNLOCK,
} from '@/features/progression/progressionState';
import type { CombatEntity, CombatState, PlayerCommandState } from './combatTypes';

export function tryFirePrimaryWeapon(
  state: CombatState,
  player: CombatEntity,
  command: PlayerCommandState,
  weapon: WeaponDefinition,
): void {
  if (!player.resources || (player.weaponCooldownMs ?? 0) > 0) {
    return;
  }

  if (player.resources.energy < weapon.energyCost) {
    return;
  }

  const aim = normalize(command.aim.x === 0 && command.aim.y === 0 ? { x: 1, y: 0 } : command.aim);
  const projectileId = `projectile_${state.nextProjectileIndex}`;
  state.nextProjectileIndex += 1;

  player.resources.energy -= weapon.energyCost;
  player.resources.heat = clamp(
    player.resources.heat + weapon.heatGain,
    0,
    player.resources.maxHeat,
  );
  player.weaponCooldownMs = weapon.cooldownMs;

  state.registry.add({
    id: projectileId,
    type: 'projectile',
    factionId: player.factionId,
    transform: {
      position: {
        x: player.transform.position.x + aim.x * 28,
        y: player.transform.position.y + aim.y * 28,
      },
      rotation: Math.atan2(aim.y, aim.x),
    },
    velocity: {
      x: aim.x * weapon.projectileSpeed,
      y: aim.y * weapon.projectileSpeed,
    },
    radius: 6,
    active: true,
    tags: ['projectile', weapon.id],
    projectile: {
      sourceId: player.id,
      weaponId: weapon.id,
      damage:
        weapon.damageProfile.amount +
        (player.tags.includes(RESONANCE_INJECTOR_UNLOCK) ? RESONANCE_INJECTOR_DAMAGE_BONUS : 0),
      damageType: weapon.damageProfile.type,
      statusEffectId: weapon.statusEffectId,
      statusEffectChance: weapon.statusEffectChance ?? 0,
      lifetimeMs: weapon.projectileLifetimeMs,
    },
  });
}
