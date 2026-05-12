import type { MissionDefinition, SaveGameRoot } from '@/types/contracts';

export type MissionPanelSummary = {
  id: string;
  title: string;
  sectorId: string;
  briefing: string;
  salvage: number;
  unlocks: string[];
  tags: string[];
  objectiveTitles: Record<string, string>;
};

export type MissionBoardSummary = MissionPanelSummary & {
  state: 'current' | 'available' | 'completed';
};

export function selectCurrentMission(
  saveGame: SaveGameRoot,
  missions: ReadonlyMap<string, MissionDefinition>,
): MissionDefinition | undefined {
  const nextMission = selectNextUnlockedMission(saveGame, missions);
  if (nextMission) {
    return nextMission;
  }

  const fallbackMissionId = saveGame.game.campaign.availableMissions[0];
  return fallbackMissionId ? missions.get(fallbackMissionId) : undefined;
}

export function selectNextUnlockedMission(
  saveGame: SaveGameRoot,
  missions: ReadonlyMap<string, MissionDefinition>,
): MissionDefinition | undefined {
  const nextAvailableMissionId = getAvailableMissionIds(saveGame, missions).find(
    (missionId) => !saveGame.game.campaign.completedMissions.includes(missionId),
  );

  return nextAvailableMissionId ? missions.get(nextAvailableMissionId) : undefined;
}

export function selectContinuationMission(
  saveGame: SaveGameRoot,
  missions: ReadonlyMap<string, MissionDefinition>,
  currentMission: MissionDefinition,
): MissionDefinition | undefined {
  const nextUnlockedMission = selectNextUnlockedMission(saveGame, missions);
  if (nextUnlockedMission) {
    return nextUnlockedMission;
  }

  for (const missionId of getMissionUnlocks(currentMission)) {
    const mission = missions.get(missionId);
    if (mission) {
      return mission;
    }
  }

  return undefined;
}

export function getMissionPanelSummary(mission: MissionDefinition): MissionPanelSummary {
  return {
    id: mission.id,
    title: mission.title,
    sectorId: mission.sectorId,
    briefing: mission.briefing,
    salvage: mission.rewards.salvage,
    unlocks: [...mission.rewards.unlocks],
    tags: [...mission.tags],
    objectiveTitles: Object.fromEntries(
      mission.objectives.map((objective) => [objective.id, objective.title]),
    ),
  };
}

export function getNextMissionSummary(
  saveGame: SaveGameRoot,
  missions: ReadonlyMap<string, MissionDefinition>,
): MissionPanelSummary | undefined {
  const nextMission = selectNextUnlockedMission(saveGame, missions);
  return nextMission ? getMissionPanelSummary(nextMission) : undefined;
}

export function getContinuationMissionSummary(
  saveGame: SaveGameRoot,
  missions: ReadonlyMap<string, MissionDefinition>,
  currentMission: MissionDefinition,
): MissionPanelSummary | undefined {
  const nextMission = selectContinuationMission(saveGame, missions, currentMission);
  return nextMission ? getMissionPanelSummary(nextMission) : undefined;
}

export function getMissionBoardSummaries(
  saveGame: SaveGameRoot,
  missions: ReadonlyMap<string, MissionDefinition>,
  currentMission: MissionDefinition,
): MissionBoardSummary[] {
  return getAvailableMissionIds(saveGame, missions)
    .map((missionId) => missions.get(missionId))
    .filter((mission): mission is MissionDefinition => Boolean(mission))
    .map((mission) => {
      const isCurrent = mission.id === currentMission.id;
      const isCompleted = saveGame.game.campaign.completedMissions.includes(mission.id);
      return {
        ...getMissionPanelSummary(mission),
        state: isCurrent ? 'current' : isCompleted ? 'completed' : 'available',
      };
    });
}

function getAvailableMissionIds(
  saveGame: SaveGameRoot,
  missions: ReadonlyMap<string, MissionDefinition>,
): string[] {
  const missionIds = [...saveGame.game.campaign.availableMissions];
  const seenMissionIds = new Set(missionIds);

  const appendMissionId = (missionId: string): void => {
    if (seenMissionIds.has(missionId)) {
      return;
    }

    seenMissionIds.add(missionId);
    missionIds.push(missionId);
  };

  for (const completedMissionId of saveGame.game.campaign.completedMissions) {
    const completedMission = missions.get(completedMissionId);
    for (const consequence of completedMission?.consequences ?? []) {
      if (consequence.when !== 'full_success') {
        continue;
      }

      for (const missionId of consequence.apply.campaign?.unlockMissions ?? []) {
        appendMissionId(missionId);
      }
    }
  }

  return missionIds;
}

function getMissionUnlocks(mission: MissionDefinition): string[] {
  const missionIds: string[] = [];
  const seenMissionIds = new Set<string>();

  for (const consequence of mission.consequences) {
    if (consequence.when !== 'full_success') {
      continue;
    }

    for (const missionId of consequence.apply.campaign?.unlockMissions ?? []) {
      if (seenMissionIds.has(missionId)) {
        continue;
      }

      seenMissionIds.add(missionId);
      missionIds.push(missionId);
    }
  }

  return missionIds;
}
