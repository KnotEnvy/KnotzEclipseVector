import type { SectorState } from '@/types/contracts';

export const starterSectors: Record<string, SectorState> = {
  freeport_lattice: {
    sectorId: 'freeport_lattice',
    control: 'contested',
    security: 0,
    civilianStability: 0,
    anomalyIntensity: 2,
    marketVolatility: 1,
    infrastructureDamage: 1,
    localSentiment: 0,
  },
  ashwake_cleft: {
    sectorId: 'ashwake_cleft',
    control: 'ashwake',
    security: -1,
    civilianStability: -2,
    anomalyIntensity: 4,
    marketVolatility: 2,
    infrastructureDamage: 2,
    localSentiment: -1,
  },
};
