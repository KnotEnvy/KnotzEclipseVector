import type { EntityRegistry } from '@/core/entityRegistry';
import { GAME_CONFIG } from '@/config/gameConfig';
import type { ContentRegistry } from '@/data/registry';
import type { MissionDefinition, PlayerShipDefinition } from '@/types/contracts';
import type { CombatEntity } from './combatTypes';

export function createPlayerEntity(playerShip: PlayerShipDefinition): CombatEntity {
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
      hull: playerShip.stats.maxHull,
      maxHull: playerShip.stats.maxHull,
      shield: playerShip.stats.maxShield,
      maxShield: playerShip.stats.maxShield,
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
  });
}
