import type { EventBus } from '@/core/eventBus';
import type { ContentRegistry } from '@/data/registry';
import type { EntityId, StatusEffectDefinition } from '@/types/contracts';
import { clamp } from '@/utils/math';
import type { ActiveStatusEffect, CombatEntity, CombatState } from './combatTypes';

type StatusApplication = {
  statusId: StatusEffectDefinition['id'];
  sourceId: EntityId;
};

export function applyProjectileStatusEffect(
  target: CombatEntity,
  projectile: CombatEntity,
  content: ContentRegistry,
  eventBus: EventBus,
): void {
  if (
    !projectile.projectile?.statusEffectId ||
    !shouldApplyStatusEffect(projectile.projectile.statusEffectChance)
  ) {
    return;
  }

  const definition = content.statusEffects.get(projectile.projectile.statusEffectId);
  if (!definition) {
    return;
  }

  const activeStatus = applyStatusEffect(target, definition, {
    statusId: projectile.projectile.statusEffectId,
    sourceId: projectile.projectile.sourceId,
  });

  eventBus.publish(
    'combat.status_applied',
    {
      targetId: target.id,
      statusId: projectile.projectile.statusEffectId,
      stacks: activeStatus.stacks,
      durationMs: activeStatus.remainingMs,
      sourceId: projectile.projectile.sourceId,
    },
    {
      actorId: projectile.projectile.sourceId,
    },
  );
}

function shouldApplyStatusEffect(chance: number): boolean {
  if (chance <= 0) {
    return false;
  }

  if (chance >= 1) {
    return true;
  }

  return Math.random() < chance;
}

export function applyStatusEffect(
  target: CombatEntity,
  definition: StatusEffectDefinition,
  application: StatusApplication,
): ActiveStatusEffect {
  const status = target.statuses?.find(
    (activeStatus) => activeStatus.statusId === application.statusId,
  );

  if (!status) {
    const activeStatus: ActiveStatusEffect = {
      statusId: application.statusId,
      sourceId: application.sourceId,
      stacks: 1,
      remainingMs: definition.durationMs,
      durationMs: definition.durationMs,
      tickAccumulatorMs: 0,
    };
    target.statuses = target.statuses ?? [];
    target.statuses.push(activeStatus);
    return activeStatus;
  }

  refreshStatusEffect(status, definition, application.sourceId);
  return status;
}

export function refreshStatusEffect(
  status: ActiveStatusEffect,
  definition: StatusEffectDefinition,
  sourceId: EntityId,
): ActiveStatusEffect {
  status.sourceId = sourceId;
  status.durationMs = Math.max(status.durationMs, definition.durationMs);

  if (definition.stacking === 'stack-intensity') {
    status.stacks = Math.min(definition.maxStacks, status.stacks + 1);
    status.remainingMs = Math.max(status.remainingMs, definition.durationMs);
    return status;
  }

  if (definition.stacking === 'stack-duration') {
    status.remainingMs = Math.min(
      status.remainingMs + definition.durationMs,
      definition.durationMs * definition.maxStacks,
    );
    status.durationMs = definition.durationMs * definition.maxStacks;
    return status;
  }

  if (definition.stacking === 'unique') {
    status.stacks = 1;
    status.remainingMs = Math.min(status.remainingMs, definition.durationMs);
    return status;
  }

  status.stacks = Math.max(status.stacks, 1);
  status.remainingMs = Math.max(status.remainingMs, definition.durationMs);
  return status;
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

    const expiredStatuses = entity.statuses.filter((status) => status.remainingMs <= 0);
    for (const status of expiredStatuses) {
      eventBus.publish('combat.status_expired', {
        targetId: entity.id,
        statusId: status.statusId,
        sourceId: status.sourceId,
      });
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
