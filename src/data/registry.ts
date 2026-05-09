import { starterFactions } from './factions';
import { starterDialogueNodes } from './dialogues';
import { starterEnemyArchetypes } from './enemies';
import { starterMissions } from './missions';
import { starterSectors } from './sectors';
import { starterShips } from './ships';
import { starterStatusEffects } from './statusEffects';
import { starterWeapons } from './weapons';

export type ContentRegistry = ReturnType<typeof createContentRegistry>;

export function createContentRegistry() {
  const ships = new Map(starterShips.map((ship) => [ship.id, structuredClone(ship)]));
  const weapons = new Map(starterWeapons.map((weapon) => [weapon.id, structuredClone(weapon)]));
  const statusEffects = new Map(
    starterStatusEffects.map((effect) => [effect.id, structuredClone(effect)]),
  );
  const missions = new Map(
    starterMissions.map((mission) => [mission.id, structuredClone(mission)]),
  );
  const dialogueNodes = new Map(
    starterDialogueNodes.map((node) => [node.id, structuredClone(node)]),
  );
  const enemyArchetypes = new Map(
    starterEnemyArchetypes.map((enemy) => [enemy.id, structuredClone(enemy)]),
  );

  return {
    ships,
    weapons,
    statusEffects,
    missions,
    dialogueNodes,
    enemyArchetypes,
    sectors: structuredClone(starterSectors),
    factions: structuredClone(starterFactions),
  };
}
