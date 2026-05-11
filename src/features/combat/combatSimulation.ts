import { EntityRegistry } from '@/core/entityRegistry';
import type { EventBus } from '@/core/eventBus';
import type { ContentRegistry } from '@/data/registry';
import type {
  EntitySnapshot,
  MissionDefinition,
  PlayerShipDefinition,
  StatusEffectDefinition,
} from '@/types/contracts';
import type {
  ActiveStatusEffect,
  CombatEntity,
  CombatState,
  PlayerCommandState,
} from './combatTypes';
import { updateEnemyBehaviors } from './enemyBehaviorSystem';
import { cleanupInactiveProjectiles, clearProjectiles } from './lifecycleSystem';
import { updatePlayerMovement } from './movementSystem';
import { resolveProjectileHits, updateProjectiles } from './projectileSystem';
import { updateCooldownAndResources } from './resourceSystem';
import { createPlayerEntity, spawnMissionEncounters } from './spawnSystem';
import { tickStatusEffects } from './statusSystem';
import { tryFirePrimaryWeapon } from './weaponSystem';

export type { CombatEntity, CombatState, PlayerCommandState } from './combatTypes';

export function createCombatState(
  content: ContentRegistry,
  playerShip: PlayerShipDefinition,
  mission: MissionDefinition,
): CombatState {
  const registry = new EntityRegistry<CombatEntity>();
  registry.add(createPlayerEntity(playerShip));
  spawnMissionEncounters(registry, content, mission);

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

  updatePlayerMovement(player, command, ship, deltaMs);
  updateCooldownAndResources(player, deltaMs);
  tickStatusEffects(state, content, eventBus, deltaMs);

  if (command.firePrimary) {
    tryFirePrimaryWeapon(state, player, command, weapon);
  }

  updateEnemyBehaviors(state, deltaMs);
  updateProjectiles(state, deltaMs);
  resolveProjectileHits(state, content, eventBus);
  cleanupInactiveProjectiles(state);
}

export function clearCombatProjectiles(state: CombatState): void {
  clearProjectiles(state);
}

export function snapshotCombat(
  state: CombatState,
  content?: Pick<ContentRegistry, 'statusEffects'>,
): EntitySnapshot[] {
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
    statuses: entity.statuses?.map((status) => {
      const definition = content?.statusEffects.get(status.statusId);
      return toStatusSnapshot(status, definition);
    }),
  }));
}

function toStatusSnapshot(
  status: ActiveStatusEffect,
  definition: StatusEffectDefinition | undefined,
): NonNullable<EntitySnapshot['statuses']>[number] {
  return {
    statusId: status.statusId,
    displayName: definition?.displayName ?? status.statusId,
    visualKey: definition?.visualKey ?? status.statusId,
    stacks: status.stacks,
    maxStacks: definition?.maxStacks ?? status.stacks,
    remainingMs: status.remainingMs,
    durationMs: status.durationMs || definition?.durationMs || status.remainingMs,
    tags: definition?.tags ?? [],
  };
}
