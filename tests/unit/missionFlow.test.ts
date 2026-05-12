import { describe, expect, it } from 'vitest';
import {
  MISSION_AUTO_CONTINUE_DELAY_MS,
  shouldHoldCombatForMission,
  updateMissionContinuation,
} from '@/app/missionFlow';

describe('mission flow', () => {
  it('auto-launches the next mission after the resolved-state delay', () => {
    const firstTick = updateMissionContinuation({
      state: { resolvedElapsedMs: 0 },
      missionPhase: 'resolved',
      deltaMs: MISSION_AUTO_CONTINUE_DELAY_MS - 1,
      requestedContinue: false,
      hasNextMission: true,
    });

    expect(firstTick.shouldLaunchNext).toBe(false);
    expect(firstTick.autoLaunchRemainingMs).toBe(1);

    const secondTick = updateMissionContinuation({
      state: firstTick.state,
      missionPhase: 'resolved',
      deltaMs: 1,
      requestedContinue: false,
      hasNextMission: true,
    });

    expect(secondTick.shouldLaunchNext).toBe(true);
    expect(secondTick.autoLaunchRemainingMs).toBe(0);
  });

  it('launches immediately when the player requests continue after resolution', () => {
    const decision = updateMissionContinuation({
      state: { resolvedElapsedMs: 0 },
      missionPhase: 'resolved',
      deltaMs: 16,
      requestedContinue: true,
      hasNextMission: true,
    });

    expect(decision.shouldLaunchNext).toBe(true);
  });

  it('does not consume transition state before a mission is resolved or when no next mission exists', () => {
    expect(
      updateMissionContinuation({
        state: { resolvedElapsedMs: 1200 },
        missionPhase: 'active',
        deltaMs: 16,
        requestedContinue: true,
        hasNextMission: true,
      }),
    ).toEqual({
      state: { resolvedElapsedMs: 0 },
      shouldLaunchNext: false,
    });

    expect(
      updateMissionContinuation({
        state: { resolvedElapsedMs: 1200 },
        missionPhase: 'resolved',
        deltaMs: MISSION_AUTO_CONTINUE_DELAY_MS,
        requestedContinue: true,
        hasNextMission: false,
      }),
    ).toEqual({
      state: { resolvedElapsedMs: 0 },
      shouldLaunchNext: false,
    });
  });

  it('holds combat while choice or resolved UI owns the stage', () => {
    expect(shouldHoldCombatForMission({ phase: 'active' })).toBe(false);
    expect(
      shouldHoldCombatForMission({
        phase: 'active',
        activeChoice: {
          objectiveId: 'choose_recovery_doctrine',
          choiceId: 'corridor_breach_recovery_doctrine',
          prompt: 'Choose recovery doctrine',
          options: [],
        },
      }),
    ).toBe(true);
    expect(shouldHoldCombatForMission({ phase: 'resolved' })).toBe(true);
    expect(shouldHoldCombatForMission({ phase: 'failed' })).toBe(true);
  });
});
