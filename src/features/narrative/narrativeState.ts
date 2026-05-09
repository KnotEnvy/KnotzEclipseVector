import type { EventBus } from '@/core/eventBus';
import { applyFactionReputationDelta } from '@/features/factions/factionState';
import { grantMissionRewards } from '@/features/progression/progressionState';
import type { ConsequenceBundle, GameState, MissionId, SectorState } from '@/types/contracts';
import { clamp } from '@/utils/math';

export function applyConsequenceBundle(
  gameState: GameState,
  missionId: MissionId,
  consequence: ConsequenceBundle,
  eventBus?: EventBus,
): void {
  if (gameState.campaign.completedMissions.includes(missionId)) {
    return;
  }

  for (const [flag, value] of Object.entries(consequence.narrative?.setFlags ?? {})) {
    gameState.story.flags[flag] = value;
  }

  for (const [counter, delta] of Object.entries(consequence.narrative?.incrementCounters ?? {})) {
    gameState.story.counters[counter] = (gameState.story.counters[counter] ?? 0) + delta;
  }

  if (consequence.faction?.repDelta) {
    applyFactionReputationDelta(
      gameState.world.factions,
      consequence.faction.repDelta,
      `Mission ${missionId} consequence`,
      eventBus,
    );
  }

  if (consequence.sector) {
    const sector = gameState.world.sectors[consequence.sector.sectorId];
    if (sector) {
      const deltas = applySectorDelta(sector, consequence.sector.delta);
      eventBus?.publish('sector.state_changed', {
        sectorId: sector.sectorId,
        deltas,
        reason: consequence.sector.reason,
        previewEffects: ['news_feed', 'mission_board'],
      });
    }
  }

  if (consequence.inventory) {
    grantMissionRewards(
      gameState.player,
      {
        missionId,
        salvage: consequence.inventory.salvage ?? 0,
        unlocks: consequence.inventory.unlocks ?? [],
      },
      eventBus,
    );
  }

  gameState.campaign.completedMissions.push(missionId);
}

function applySectorDelta(
  sector: SectorState,
  delta: Partial<Omit<SectorState, 'sectorId' | 'control'>>,
): Partial<SectorState> {
  const applied: Partial<SectorState> = {};

  for (const [field, change] of Object.entries(delta)) {
    const key = field as keyof Omit<SectorState, 'sectorId' | 'control'>;
    const current = sector[key];
    if (typeof current !== 'number' || typeof change !== 'number') {
      continue;
    }

    const nextValue = clamp(current + change, -10, 10);
    sector[key] = nextValue;
    applied[key] = nextValue;
  }

  return applied;
}
