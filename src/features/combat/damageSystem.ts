import type { EventBus } from '@/core/eventBus';
import type { EntityType } from '@/types/contracts';
import { clamp } from '@/utils/math';
import type { CombatEntity } from './combatTypes';

export function applyProjectileDamage(
  target: CombatEntity,
  projectile: CombatEntity,
  eventBus: EventBus,
): void {
  if (!target.resources || !projectile.projectile) {
    return;
  }

  let remainingDamage = projectile.projectile.damage;
  const shieldBefore = target.resources.shield;
  const shieldDamage = Math.min(target.resources.shield, remainingDamage);
  target.resources.shield -= shieldDamage;
  remainingDamage -= shieldDamage;
  target.resources.hull = clamp(
    target.resources.hull - remainingDamage,
    0,
    target.resources.maxHull,
  );

  eventBus.publish(
    'combat.damage_applied',
    {
      targetId: target.id,
      sourceId: projectile.projectile.sourceId,
      amount: projectile.projectile.damage,
      damageType: projectile.projectile.damageType,
      shielded: shieldBefore > 0,
      crit: false,
      remainingHull: target.resources.hull,
      remainingShield: target.resources.shield,
    },
    {
      actorId: projectile.projectile.sourceId,
    },
  );

  if (target.resources.hull <= 0 && target.active) {
    target.active = false;
    eventBus.publish(
      'combat.entity_destroyed',
      {
        entityId: target.id,
        entityType: target.type as EntityType,
        killerId: projectile.projectile.sourceId,
        factionId: target.factionId,
        position: { ...target.transform.position },
      },
      {
        actorId: projectile.projectile.sourceId,
      },
    );
  }
}
