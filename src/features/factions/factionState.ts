import type { EventBus } from '@/core/eventBus';
import type { FactionId, FactionReputationState } from '@/types/contracts';
import { clamp } from '@/utils/math';

const MIN_REPUTATION = -100;
const MAX_REPUTATION = 100;

export function applyFactionReputationDelta(
  factions: Record<FactionId, FactionReputationState>,
  delta: Record<FactionId, number>,
  reason: string,
  eventBus?: EventBus,
): void {
  for (const [factionId, change] of Object.entries(delta)) {
    const state = factions[factionId];
    if (!state) {
      continue;
    }

    const before = state.reputation;
    state.reputation = clamp(before + change, MIN_REPUTATION, MAX_REPUTATION);
    state.disposition =
      state.reputation >= 35 ? 'ally' : state.reputation <= -35 ? 'hostile' : 'neutral';

    eventBus?.publish('faction.rep_changed', {
      factionId,
      before,
      after: state.reputation,
      reason,
    });
  }
}
