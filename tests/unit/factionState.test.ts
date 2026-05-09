import { describe, expect, it } from 'vitest';
import { applyFactionReputationDelta } from '@/features/factions/factionState';
import type { FactionReputationState } from '@/types/contracts';

describe('applyFactionReputationDelta', () => {
  it('clamps reputation and derives disposition', () => {
    const factions: Record<string, FactionReputationState> = {
      freeports: {
        factionId: 'freeports',
        reputation: 96,
        trust: 0,
        disposition: 'neutral',
        embargoed: false,
        activePacts: [],
      },
    };

    applyFactionReputationDelta(factions, { freeports: 20 }, 'test');

    expect(factions.freeports.reputation).toBe(100);
    expect(factions.freeports.disposition).toBe('ally');
  });
});
