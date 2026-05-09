import { describe, expect, it } from 'vitest';
import { EventBus } from '@/core/eventBus';
import { starterMission } from '@/data/missions';
import { createNewGameState } from '@/game/createGameState';
import { MissionRuntime } from '@/features/mission/missionRuntime';
import { applyConsequenceBundle } from '@/features/narrative/narrativeState';

describe('mission consequence flow', () => {
  it('resolves the starter mission and applies visible persistent state changes', () => {
    const bus = new EventBus();
    const gameState = createNewGameState();
    const mission = new MissionRuntime(starterMission, bus, { seed: 123 });

    bus.subscribe('combat.entity_destroyed', (event) => mission.handleEvent(event));
    bus.subscribe('mission.resolved', (event) => {
      applyConsequenceBundle(gameState, event.payload.missionId, event.payload.consequence, bus);
    });

    mission.start();
    bus.publish('combat.entity_destroyed', {
      entityId: 'enemy_fracture_drone_01',
      entityType: 'enemy',
      killerId: 'player',
      factionId: 'fracture',
      position: { x: 960, y: 360 },
    });
    mission.tick(1000 / 60);

    const activeChoice = mission.snapshot().activeChoice;
    expect(activeChoice?.choiceId).toBe('corridor_breach_recovery_doctrine');

    mission.dispatchCommand({
      type: 'mission.choice.select',
      choiceId: 'corridor_breach_recovery_doctrine',
      optionId: 'stabilize_civilian_lanes',
      source: 'test',
    });

    expect(mission.snapshot().phase).toBe('resolved');
    expect(gameState.campaign.completedMissions).toContain('corridor_breach_01');
    expect(gameState.story.flags['story.act1.fracture_drone_destroyed']).toBe(true);
    expect(gameState.story.flags['story.act1.prioritized_civilian_stability']).toBe(true);
    expect(gameState.world.factions.freeports.reputation).toBe(10);
    expect(gameState.world.sectors.freeport_lattice.civilianStability).toBe(3);
    expect(gameState.player.salvage).toBe(80);
  });
});
