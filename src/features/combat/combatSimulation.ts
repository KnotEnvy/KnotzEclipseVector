import { EntityRegistry, type RuntimeEntity } from '@/core/entityRegistry';
import type { EventBus } from '@/core/eventBus';
import { GAME_CONFIG } from '@/config/gameConfig';
import type { ContentRegistry } from '@/data/registry';
import type {
  EntityId,
  EntitySnapshot,
  EntityType,
  PlayerShipDefinition,
  Vector2,
  WeaponDefinition,
} from '@/types/contracts';
import { clamp, distanceSquared, normalize } from '@/utils/math';

export type PlayerCommandState = {
  move: Vector2;
  aim: Vector2;
  firePrimary: boolean;
};

type CombatResources = {
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  energy: number;
  maxEnergy: number;
  heat: number;
  maxHeat: number;
};

type ProjectileState = {
  sourceId: EntityId;
  weaponId: string;
  damage: number;
  damageType: WeaponDefinition['damageProfile']['type'];
  lifetimeMs: number;
};

export type CombatEntity = RuntimeEntity & {
  resources?: CombatResources;
  projectile?: ProjectileState;
  weaponCooldownMs?: number;
};

export type CombatState = {
  registry: EntityRegistry<CombatEntity>;
  playerId: EntityId;
  elapsedMs: number;
  nextProjectileIndex: number;
};

export function createCombatState(
  content: ContentRegistry,
  playerShip: PlayerShipDefinition,
): CombatState {
  const registry = new EntityRegistry<CombatEntity>();

  registry.add({
    id: 'player',
    type: 'player',
    factionId: 'player',
    transform: {
      position: { x: 240, y: GAME_CONFIG.world.height / 2 },
      rotation: 0,
    },
    velocity: { x: 0, y: 0 },
    radius: 20,
    active: true,
    tags: ['player', 'ship'],
    resources: {
      hull: playerShip.stats.maxHull,
      maxHull: playerShip.stats.maxHull,
      shield: playerShip.stats.maxShield,
      maxShield: playerShip.stats.maxShield,
      energy: playerShip.stats.maxEnergy,
      maxEnergy: playerShip.stats.maxEnergy,
      heat: 0,
      maxHeat: playerShip.stats.maxHeat,
    },
    weaponCooldownMs: 0,
  });

  registry.add({
    id: 'enemy_fracture_drone_01',
    type: 'enemy',
    factionId: 'fracture',
    transform: {
      position: { x: 960, y: GAME_CONFIG.world.height / 2 },
      rotation: Math.PI,
    },
    velocity: { x: 0, y: 0 },
    radius: 26,
    active: true,
    tags: ['enemy', 'fracture_drone'],
    resources: {
      hull: 80,
      maxHull: 80,
      shield: 30,
      maxShield: 30,
      energy: 0,
      maxEnergy: 0,
      heat: 0,
      maxHeat: 100,
    },
  });

  if (!content.weapons.has(playerShip.slots.hardpoints[0])) {
    throw new Error(`Missing starter weapon ${playerShip.slots.hardpoints[0]}`);
  }

  return {
    registry,
    playerId: 'player',
    elapsedMs: 0,
    nextProjectileIndex: 0,
  };
}

export function tickCombat(
  state: CombatState,
  command: PlayerCommandState,
  content: ContentRegistry,
  eventBus: EventBus,
  deltaMs: number,
): void {
  state.elapsedMs += deltaMs;
  eventBus.setClock(state.elapsedMs);

  const player = state.registry.get(state.playerId);
  const ship = content.ships.get('veilrunner_proto');
  const weapon = content.weapons.get('pulse_lance_mk1');

  if (!player?.active || !ship || !weapon) {
    return;
  }

  updatePlayer(player, command, ship, deltaMs);
  updateCooldownAndResources(player, deltaMs);

  if (command.firePrimary) {
    tryFirePrimary(state, player, command, weapon);
  }

  for (const entity of state.registry.activeValues()) {
    if (entity.type === 'projectile') {
      updateProjectile(entity, deltaMs);
    }
  }

  resolveProjectileHits(state, eventBus);
  cleanupInactiveProjectiles(state);
}

export function snapshotCombat(state: CombatState): EntitySnapshot[] {
  return state.registry.activeValues().map((entity) => ({
    id: entity.id,
    type: entity.type,
    factionId: entity.factionId,
    transform: entity.transform,
    radius: entity.radius,
    hull: entity.resources?.hull,
    maxHull: entity.resources?.maxHull,
    shield: entity.resources?.shield,
    maxShield: entity.resources?.maxShield,
  }));
}

function updatePlayer(
  player: CombatEntity,
  command: PlayerCommandState,
  ship: PlayerShipDefinition,
  deltaMs: number,
): void {
  const move = normalize(command.move);
  const seconds = deltaMs / 1000;

  player.velocity = {
    x: move.x * ship.stats.moveSpeed,
    y: move.y * ship.stats.moveSpeed,
  };
  player.transform.position.x = clamp(
    player.transform.position.x + player.velocity.x * seconds,
    32,
    GAME_CONFIG.world.width - 32,
  );
  player.transform.position.y = clamp(
    player.transform.position.y + player.velocity.y * seconds,
    32,
    GAME_CONFIG.world.height - 32,
  );

  const aim = normalize(command.aim);
  if (aim.x !== 0 || aim.y !== 0) {
    player.transform.rotation = Math.atan2(aim.y, aim.x);
  }
}

function updateCooldownAndResources(entity: CombatEntity, deltaMs: number): void {
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

function tryFirePrimary(
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
      damage: weapon.damageProfile.amount,
      damageType: weapon.damageProfile.type,
      lifetimeMs: weapon.projectileLifetimeMs,
    },
  });
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

function resolveProjectileHits(state: CombatState, eventBus: EventBus): void {
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

    applyDamage(target, projectile, eventBus);
    projectile.active = false;
  }
}

function applyDamage(target: CombatEntity, projectile: CombatEntity, eventBus: EventBus): void {
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

function cleanupInactiveProjectiles(state: CombatState): void {
  for (const entity of state.registry.values()) {
    if (entity.type === 'projectile' && !entity.active) {
      state.registry.remove(entity.id);
    }
  }
}
