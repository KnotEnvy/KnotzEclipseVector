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
};
