import { GAME_CONFIG } from '@/config/gameConfig';
import type { CombatEntity, CombatState } from './combatTypes';
import { clamp, distanceSquared, normalize } from '@/utils/math';

export function updateEnemyBehaviors(state: CombatState, deltaMs: number): void {
  const player = state.registry.get(state.playerId);
  if (!player?.active) {
    return;
  }

  for (const enemy of state.registry.activeValues()) {
    if (enemy.type !== 'enemy' || !enemy.enemyBehavior) {
      continue;
    }

    updateEnemyMovement(enemy, player, deltaMs);
    updateEnemyWeapon(state, enemy, player, deltaMs);
  }
}

function updateEnemyMovement(enemy: CombatEntity, player: CombatEntity, deltaMs: number): void {
  const behavior = enemy.enemyBehavior;
  if (!behavior) {
    return;
  }

  const toPlayer = {
    x: player.transform.position.x - enemy.transform.position.x,
    y: player.transform.position.y - enemy.transform.position.y,
  };
  const distance = Math.sqrt(distanceSquared(player.transform.position, enemy.transform.position));
  const direction = normalize(toPlayer);
  const rangeBuffer = 40;
  const seconds = deltaMs / 1000;
  const moveSign =
    distance > behavior.preferredRange + rangeBuffer
      ? 1
      : distance < behavior.preferredRange - rangeBuffer
        ? -1
        : 0;

  enemy.velocity = {
    x: direction.x * behavior.moveSpeed * moveSign,
    y: direction.y * behavior.moveSpeed * moveSign,
  };
  enemy.transform.position.x = clamp(
    enemy.transform.position.x + enemy.velocity.x * seconds,
    32,
    GAME_CONFIG.world.width - 32,
  );
  enemy.transform.position.y = clamp(
    enemy.transform.position.y + enemy.velocity.y * seconds,
    32,
    GAME_CONFIG.world.height - 32,
  );

  if (direction.x !== 0 || direction.y !== 0) {
    enemy.transform.rotation = Math.atan2(direction.y, direction.x);
  }
}

function updateEnemyWeapon(
  state: CombatState,
  enemy: CombatEntity,
  player: CombatEntity,
  deltaMs: number,
): void {
  const behavior = enemy.enemyBehavior;
  if (!behavior) {
    return;
  }

  enemy.weaponCooldownMs = Math.max(0, (enemy.weaponCooldownMs ?? 0) - deltaMs);
  if (enemy.weaponCooldownMs > 0) {
    return;
  }

  const distanceToPlayerSquared = distanceSquared(
    player.transform.position,
    enemy.transform.position,
  );
  if (distanceToPlayerSquared > behavior.fireRange ** 2) {
    return;
  }

  const aim = normalize({
    x: player.transform.position.x - enemy.transform.position.x,
    y: player.transform.position.y - enemy.transform.position.y,
  });
  if (aim.x === 0 && aim.y === 0) {
    return;
  }

  const projectileId = `projectile_${state.nextProjectileIndex}`;
  state.nextProjectileIndex += 1;
  enemy.weaponCooldownMs = behavior.fireCooldownMs;

  state.registry.add({
    id: projectileId,
    type: 'projectile',
    factionId: enemy.factionId,
    transform: {
      position: {
        x: enemy.transform.position.x + aim.x * (enemy.radius + 8),
        y: enemy.transform.position.y + aim.y * (enemy.radius + 8),
      },
      rotation: Math.atan2(aim.y, aim.x),
    },
    velocity: {
      x: aim.x * behavior.projectileSpeed,
      y: aim.y * behavior.projectileSpeed,
    },
    radius: 5,
    active: true,
    tags: ['projectile', 'enemy_fire'],
    projectile: {
      sourceId: enemy.id,
      weaponId: 'enemy_fire',
      damage: behavior.projectileDamage,
      damageType: behavior.projectileDamageType,
      statusEffectChance: 0,
      lifetimeMs: behavior.projectileLifetimeMs,
    },
  });
}
