import type { EntityRegistry } from '@/core/entityRegistry';
import { GAME_CONFIG } from '@/config/gameConfig';
import type { ContentRegistry } from '@/data/registry';
import {
  FIELD_CAPACITOR_HULL_BONUS,
  FIELD_CAPACITOR_SHIELD_BONUS,
  FIELD_CAPACITOR_UNLOCK,
} from '@/features/progression/progressionState';
import type {
  MissionDefinition,
  PlayerProgressionState,
  PlayerShipDefinition,
} from '@/types/contracts';
import type { CombatEntity } from './combatTypes';

export function createPlayerEntity(
  playerShip: PlayerShipDefinition,
  progression?: PlayerProgressionState,
): CombatEntity {
  const hasFieldCapacitor = progression?.unlocks.includes(FIELD_CAPACITOR_UNLOCK) ?? false;
  const maxHull = playerShip.stats.maxHull + (hasFieldCapacitor ? FIELD_CAPACITOR_HULL_BONUS : 0);
  const maxShield =
    playerShip.stats.maxShield + (hasFieldCapacitor ? FIELD_CAPACITOR_SHIELD_BONUS : 0);

  return {
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
      hull: maxHull,
      maxHull,
      shield: maxShield,
      maxShield,
      energy: playerShip.stats.maxEnergy,
      maxEnergy: playerShip.stats.maxEnergy,
      heat: 0,
      maxHeat: playerShip.stats.maxHeat,
    },
    statuses: [],
    weaponCooldownMs: 0,
  };
}

export function spawnMissionEncounters(
  registry: EntityRegistry<CombatEntity>,
  content: ContentRegistry,
  mission: MissionDefinition,
): void {
  for (const encounter of mission.encounterSequence) {
    if (encounter.kind === 'spawn_enemy') {
      spawnEnemyEncounter(registry, content, encounter);
    }
  }
}

export function spawnEnemyEncounter(
  registry: EntityRegistry<CombatEntity>,
  content: ContentRegistry,
  encounter: MissionDefinition['encounterSequence'][number],
): CombatEntity {
  const archetype = content.enemyArchetypes.get(encounter.archetypeId);
  if (!archetype) {
    throw new Error(`Missing enemy archetype ${encounter.archetypeId}`);
  }

  return registry.add({
    id: `enemy_${encounter.id}`,
    type: 'enemy',
    factionId: archetype.factionId,
    transform: {
      position: { ...encounter.at },
      rotation: Math.PI,
    },
    velocity: { x: 0, y: 0 },
    radius: archetype.radius,
    active: true,
    tags: ['enemy', ...archetype.tags],
    resources: {
      hull: archetype.stats.hull,
      maxHull: archetype.stats.hull,
      shield: archetype.stats.shield,
      maxShield: archetype.stats.shield,
      energy: 0,
      maxEnergy: 0,
      heat: 0,
      maxHeat: archetype.stats.maxHeat,
    },
    statuses: [],
    weaponCooldownMs: archetype.behavior.fireCooldownMs * 0.5,
    enemyBehavior: { ...archetype.behavior },
  });
}
