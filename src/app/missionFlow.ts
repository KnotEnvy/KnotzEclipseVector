import type { MissionSnapshot } from '@/types/contracts';

export const MISSION_AUTO_CONTINUE_DELAY_MS = 3200;

export type MissionContinuationState = {
  resolvedElapsedMs: number;
};

export type MissionContinuationDecision = {
  state: MissionContinuationState;
  shouldLaunchNext: boolean;
  autoLaunchRemainingMs?: number;
};

export function updateMissionContinuation(input: {
  state: MissionContinuationState;
  missionPhase: MissionSnapshot['phase'];
  deltaMs: number;
  requestedContinue: boolean;
  hasNextMission: boolean;
}): MissionContinuationDecision {
  if (input.missionPhase !== 'resolved' || !input.hasNextMission) {
    return {
      state: {
        resolvedElapsedMs: 0,
      },
      shouldLaunchNext: false,
    };
  }

  const resolvedElapsedMs = Math.max(0, input.state.resolvedElapsedMs + input.deltaMs);
  const autoLaunchRemainingMs = Math.max(0, MISSION_AUTO_CONTINUE_DELAY_MS - resolvedElapsedMs);

  return {
    state: {
      resolvedElapsedMs,
    },
    shouldLaunchNext: input.requestedContinue || autoLaunchRemainingMs === 0,
    autoLaunchRemainingMs,
  };
}

export function shouldHoldCombatForMission(
  mission: Pick<MissionSnapshot, 'phase' | 'activeChoice'>,
): boolean {
  return (
    mission.phase === 'resolved' || mission.phase === 'failed' || Boolean(mission.activeChoice)
  );
}
