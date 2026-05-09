import type { EventBus } from '@/core/eventBus';
import type { MissionId, PlayerProgressionState } from '@/types/contracts';

export function grantMissionRewards(
  player: PlayerProgressionState,
  input: {
    missionId: MissionId;
    salvage: number;
    unlocks: string[];
  },
  eventBus?: EventBus,
): void {
  player.salvage += input.salvage;

  for (const unlock of input.unlocks) {
    if (!player.unlocks.includes(unlock)) {
      player.unlocks.push(unlock);
    }
  }

  eventBus?.publish('inventory.reward_granted', {
    salvage: input.salvage,
    unlocks: input.unlocks,
    sourceMissionId: input.missionId,
  });
}
