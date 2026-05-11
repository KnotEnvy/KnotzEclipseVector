import { EntityRegistry } from '@/core/entityRegistry';
import type { EventBus } from '@/core/eventBus';
import type { ContentRegistry } from '@/data/registry';
import type { EntitySnapshot, MissionDefinition, PlayerShipDefinition } from '@/types/contracts';
import type { CombatEntity, CombatState, PlayerCommandState } from './combatTypes';
import { cleanupInactiveProjectiles } from './lifecycleSystem';
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

  updateProjectiles(state, deltaMs);
  resolveProjectileHits(state, content, eventBus);
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
    statuses: entity.statuses?.map((status) => ({
      statusId: status.statusId,
      stacks: status.stacks,
      remainingMs: status.remainingMs,
    })),
  }));
}
