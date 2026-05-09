import { describe, expect, it } from 'vitest';
import { createContentRegistry } from '@/data/registry';
import { createInitialSave } from '@/features/save/saveService';
import {
  getNextMissionSummary,
  selectCurrentMission,
  selectNextUnlockedMission,
} from '@/app/missionSelection';

describe('mission selection', () => {
  it('selects the first unlocked mission that has not been completed', () => {
    const content = createContentRegistry();
    const save = createInitialSave('A');
    save.game.campaign.availableMissions.push('ashwake_wake_02');
    save.game.campaign.completedMissions.push('corridor_breach_01');

    expect(selectCurrentMission(save, content.missions)?.id).toBe('ashwake_wake_02');
    expect(getNextMissionSummary(save, content.missions)?.title).toBe('Ashwake Wake');
  });

  it('falls back to the first available mission when every mission is complete', () => {
    const content = createContentRegistry();
    const save = createInitialSave('A');
    save.game.campaign.availableMissions.push('ashwake_wake_02');
    save.game.campaign.completedMissions.push('corridor_breach_01', 'ashwake_wake_02');

    expect(selectNextUnlockedMission(save, content.missions)).toBeUndefined();
    expect(selectCurrentMission(save, content.missions)?.id).toBe('corridor_breach_01');
  });

  it('derives follow-up unlocks from completed mission consequences when campaign availability is stale', () => {
    const content = createContentRegistry();
    const save = createInitialSave('A');
    save.game.campaign.completedMissions.push('corridor_breach_01');

    expect(selectNextUnlockedMission(save, content.missions)?.id).toBe('ashwake_wake_02');
    expect(getNextMissionSummary(save, content.missions)?.title).toBe('Ashwake Wake');
  });
});
