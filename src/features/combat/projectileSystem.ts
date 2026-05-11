import type { EventBus } from '@/core/eventBus';
import { GAME_CONFIG } from '@/config/gameConfig';
import type { ContentRegistry } from '@/data/registry';
import { distanceSquared } from '@/utils/math';
import type { CombatEntity, CombatState } from './combatTypes';
import { applyProjectileDamage } from './damageSystem';
import { applyProjectileStatusEffect } from './statusSystem';

export function updateProjectiles(state: CombatState, deltaMs: number): void {
  for (const entity of state.registry.activeValues()) {
    if (entity.type === 'projectile') {
      updateProjectile(entity, deltaMs);
    }
  }
}

export function resolveProjectileHits(
  state: CombatState,
  content: ContentRegistry,
  eventBus: EventBus,
): void {
  const projectiles = state.registry
    .activeValues()
    .filter((entity) => entity.type === 'projectile' && entity.projectile);
  const targets = state.registry
    .activeValues()
    .filter((entity) => entity.type !== 'projectile' && entity.resources);

  for (const projectile of projectiles) {
    if (!projectile.projectile) {
      continue;
    }

    const target = targets.find(
      (candidate) =>
        candidate.factionId !== projectile.factionId &&
        distanceSquared(candidate.transform.position, projectile.transform.position) <=
          (candidate.radius + projectile.radius) ** 2,
    );

    if (!target?.resources) {
      continue;
    }

    applyProjectileDamage(target, projectile, eventBus);
    applyProjectileStatusEffect(target, projectile, content, eventBus);
    projectile.active = false;
  }
}

function updateProjectile(projectile: CombatEntity, deltaMs: number): void {
  if (!projectile.projectile) {
    return;
  }

  const seconds = deltaMs / 1000;
  projectile.transform.position.x += projectile.velocity.x * seconds;
  projectile.transform.position.y += projectile.velocity.y * seconds;
  projectile.projectile.lifetimeMs -= deltaMs;

  const outOfBounds =
    projectile.transform.position.x < -64 ||
    projectile.transform.position.x > GAME_CONFIG.world.width + 64 ||
    projectile.transform.position.y < -64 ||
    projectile.transform.position.y > GAME_CONFIG.world.height + 64;

  if (projectile.projectile.lifetimeMs <= 0 || outOfBounds) {
    projectile.active = false;
  }
}
