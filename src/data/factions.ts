import type { FactionReputationState } from '@/types/contracts';

export const starterFactions: Record<string, FactionReputationState> = {
  freeports: {
    factionId: 'freeports',
    reputation: 0,
    trust: 0,
    disposition: 'neutral',
    embargoed: false,
    activePacts: [],
  },
  ashwake: {
    factionId: 'ashwake',
    reputation: 0,
    trust: 0,
    disposition: 'neutral',
    embargoed: false,
    activePacts: [],
  },
};
