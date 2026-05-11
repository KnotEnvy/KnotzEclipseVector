import type { EventBus } from '@/core/eventBus';
import type { ContentRegistry } from '@/data/registry';
import type { StatusEffectDefinition } from '@/types/contracts';
import { clamp } from '@/utils/math';
import type { ActiveStatusEffect, CombatEntity, CombatState } from './combatTypes';

export function applyProjectileStatusEffect(
  target: CombatEntity,
  projectile: CombatEntity,
  content: ContentRegistry,
  eventBus: EventBus,
): void {
  if (!projectile.projectile?.statusEffectId || projectile.projectile.statusEffectChance <= 0) {
    return;
  }

  const definition = content.statusEffects.get(projectile.projectile.statusEffectId);
  if (!definition) {
    return;
  }

  const status = target.statuses?.find(
    (activeStatus) => activeStatus.statusId === projectile.projectile?.statusEffectId,
  );
  if (status) {
    refreshStatusEffect(status, definition);
  } else {
    target.statuses = target.statuses ?? [];
    target.statuses.push({
      statusId: projectile.projectile.statusEffectId,
      stacks: 1,
      remainingMs: definition.durationMs,
      tickAccumulatorMs: 0,
    });
  }

  eventBus.publish(
    'combat.status_applied',
    {
      targetId: target.id,
      statusId: projectile.projectile.statusEffectId,
      stacks: 1,
      durationMs: definition.durationMs,
      sourceId: projectile.projectile.sourceId,
    },
    {
      actorId: projectile.projectile.sourceId,
    },
  );
}

export function refreshStatusEffect(
  status: ActiveStatusEffect,
  definition: StatusEffectDefinition,
): void {
  if (definition.stacking === 'stack-intensity') {
    status.stacks = Math.min(definition.maxStacks, status.stacks + 1);
    status.remainingMs = Math.max(status.remainingMs, definition.durationMs);
    return;
  }

  if (definition.stacking === 'stack-duration') {
    status.remainingMs = Math.min(
      status.remainingMs + definition.durationMs,
      definition.durationMs * definition.maxStacks,
    );
    return;
  }

  status.stacks = Math.max(status.stacks, 1);
  status.remainingMs = Math.max(status.remainingMs, definition.durationMs);
}

export function tickStatusEffects(
  state: CombatState,
  content: ContentRegistry,
  eventBus: EventBus,
  deltaMs: number,
): void {
  for (const entity of state.registry.activeValues()) {
    if (!entity.statuses || entity.statuses.length === 0) {
      continue;
    }

    for (const status of entity.statuses) {
      const definition = content.statusEffects.get(status.statusId);
      status.remainingMs -= deltaMs;
      if (definition) {
        tickStatusEffect(entity, status, definition, eventBus, deltaMs);
      }
    }

    entity.statuses = entity.statuses.filter((status) => status.remainingMs > 0);
  }
}

function tickStatusEffect(
  entity: CombatEntity,
  status: ActiveStatusEffect,
  definition: StatusEffectDefinition,
  eventBus: EventBus,
  deltaMs: number,
): void {
  if (!entity.resources || definition.id !== 'ionized' || !definition.tickRateMs) {
    return;
  }

  status.tickAccumulatorMs += deltaMs;
  while (status.tickAccumulatorMs >= definition.tickRateMs && status.remainingMs > 0) {
    status.tickAccumulatorMs -= definition.tickRateMs;
    const beforeShield = entity.resources.shield;
    entity.resources.shield = clamp(
      entity.resources.shield - 1 * status.stacks,
      0,
      entity.resources.maxShield,
    );

    if (beforeShield !== entity.resources.shield) {
      eventBus.publish('combat.damage_applied', {
        targetId: entity.id,
        sourceId: 'status_ionized',
        amount: beforeShield - entity.resources.shield,
        damageType: 'ion',
        shielded: true,
        crit: false,
        remainingHull: entity.resources.hull,
        remainingShield: entity.resources.shield,
      });
    }
  }
}
