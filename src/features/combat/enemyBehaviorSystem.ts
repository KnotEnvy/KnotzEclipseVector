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

    updateEnemyMovement(enemy, player, deltaMs, state.elapsedMs);
    updateEnemyWeapon(state, enemy, player, deltaMs);
  }
}

function updateEnemyMovement(
  enemy: CombatEntity,
  player: CombatEntity,
  deltaMs: number,
  elapsedMs: number,
): void {
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
  const strafeSign =
    behavior.pattern === 'strafe' ? Math.sin(elapsedMs / 520 + enemy.id.length) : 0;
  const tangent = {
    x: -direction.y,
    y: direction.x,
  };

  enemy.velocity = {
    x:
      direction.x * behavior.moveSpeed * moveSign +
      tangent.x * behavior.moveSpeed * 0.72 * strafeSign,
    y:
      direction.y * behavior.moveSpeed * moveSign +
      tangent.y * behavior.moveSpeed * 0.72 * strafeSign,
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

  enemy.weaponCooldownMs = behavior.fireCooldownMs;
  const volleyCount = Math.max(1, behavior.volleyCount ?? 1);
  const spreadRadians = ((behavior.volleySpreadDegrees ?? 0) * Math.PI) / 180;
  const baseAngle = Math.atan2(aim.y, aim.x);

  for (let index = 0; index < volleyCount; index += 1) {
    const offset = volleyCount === 1 ? 0 : index / (volleyCount - 1) - 0.5;
    const angle = baseAngle + spreadRadians * offset;
    const shotAim = {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };
    const projectileId = `projectile_${state.nextProjectileIndex}`;
    state.nextProjectileIndex += 1;

    state.registry.add({
      id: projectileId,
      type: 'projectile',
      factionId: enemy.factionId,
      transform: {
        position: {
          x: enemy.transform.position.x + shotAim.x * (enemy.radius + 8),
          y: enemy.transform.position.y + shotAim.y * (enemy.radius + 8),
        },
        rotation: angle,
      },
      velocity: {
        x: shotAim.x * behavior.projectileSpeed,
        y: shotAim.y * behavior.projectileSpeed,
      },
      radius: behavior.volleyCount && behavior.volleyCount > 1 ? 4 : 5,
      active: true,
      tags: ['projectile', 'enemy_fire'],
      projectile: {
        sourceId: enemy.id,
        weaponId: 'enemy_fire',
        damage: behavior.projectileDamage,
        damageType: behavior.projectileDamageType,
        statusEffectId: behavior.statusEffectId,
        statusEffectChance: behavior.statusEffectChance ?? 0,
        lifetimeMs: behavior.projectileLifetimeMs,
      },
    });
  }
}
