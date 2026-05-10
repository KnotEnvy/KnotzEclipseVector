import { describe, expect, it } from 'vitest';
import { EventBus } from '@/core/eventBus';
import { ashwakeWakeMission, latticeRescueContractMission, starterMission } from '@/data/missions';
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
    expect(gameState.campaign.availableMissions).toContain('ashwake_wake_02');
    expect(gameState.world.factions.freeports.reputation).toBe(10);
    expect(gameState.world.sectors.freeport_lattice.civilianStability).toBe(3);
    expect(gameState.player.salvage).toBe(80);
  });

  it('resolves the second story mission and mutates the second sector', () => {
    const bus = new EventBus();
    const gameState = createNewGameState();
    gameState.campaign.availableMissions.push('ashwake_wake_02');
    const mission = new MissionRuntime(ashwakeWakeMission, bus, { seed: 456 });

    bus.subscribe('combat.entity_destroyed', (event) => mission.handleEvent(event));
    bus.subscribe('mission.resolved', (event) => {
      applyConsequenceBundle(gameState, event.payload.missionId, event.payload.consequence, bus);
    });

    mission.start();
    bus.publish('combat.entity_destroyed', {
      entityId: 'enemy_fracture_relay_escort_01',
      entityType: 'enemy',
      killerId: 'player',
      factionId: 'fracture',
      position: { x: 980, y: 300 },
    });

    mission.dispatchCommand({
      type: 'mission.choice.select',
      choiceId: 'ashwake_wake_telemetry_route',
      optionId: 'share_with_ashwake',
      source: 'test',
    });

    expect(mission.snapshot().phase).toBe('resolved');
    expect(gameState.campaign.completedMissions).toContain('ashwake_wake_02');
    expect(gameState.story.flags['story.act1.ashwake_relay_destroyed']).toBe(true);
    expect(gameState.story.flags['story.act1.shared_relay_telemetry_with_ashwake']).toBe(true);
    expect(gameState.world.factions.ashwake.reputation).toBe(9);
    expect(gameState.world.sectors.ashwake_cleft.anomalyIntensity).toBe(2);
    expect(gameState.player.salvage).toBe(95);
    expect(gameState.campaign.availableMissions).toContain('lattice_rescue_contract_03');
  });

  it('resolves the rescue contract prototype with multi-spawn and survive objectives', () => {
    const bus = new EventBus();
    const gameState = createNewGameState();
    gameState.campaign.availableMissions.push('lattice_rescue_contract_03');
    const mission = new MissionRuntime(latticeRescueContractMission, bus, { seed: 789 });

    bus.subscribe('combat.entity_destroyed', (event) => mission.handleEvent(event));
    bus.subscribe('mission.resolved', (event) => {
      applyConsequenceBundle(gameState, event.payload.missionId, event.payload.consequence, bus);
    });

    mission.start();
    bus.publish('combat.entity_destroyed', {
      entityId: 'enemy_fracture_scout_01',
      entityType: 'enemy',
      killerId: 'player',
      factionId: 'fracture',
      position: { x: 900, y: 260 },
    });
    bus.publish('combat.entity_destroyed', {
      entityId: 'enemy_fracture_scout_02',
      entityType: 'enemy',
      killerId: 'player',
      factionId: 'fracture',
      position: { x: 1030, y: 470 },
    });

    expect(mission.snapshot().objectives[0]?.state).toBe('completed');
    expect(mission.snapshot().objectives[1]?.state).toBe('active');

    mission.tick(4500);
    expect(mission.snapshot().activeChoice?.choiceId).toBe('lattice_rescue_contract_priority');

    mission.dispatchCommand({
      type: 'mission.choice.select',
      choiceId: 'lattice_rescue_contract_priority',
      optionId: 'prioritize_convoy_routing',
      source: 'test',
    });

    expect(mission.snapshot().phase).toBe('resolved');
    expect(gameState.campaign.completedMissions).toContain('lattice_rescue_contract_03');
    expect(gameState.story.flags['story.act1.rescue_contract_template_proven']).toBe(true);
    expect(gameState.story.flags['story.act1.prioritized_convoy_routing']).toBe(true);
    expect(gameState.story.counters['contracts.rescue_templates_completed']).toBe(1);
    expect(gameState.world.factions.freeports.reputation).toBe(8);
    expect(gameState.world.sectors.freeport_lattice.security).toBe(1);
    expect(gameState.world.sectors.freeport_lattice.civilianStability).toBe(2);
    expect(gameState.player.salvage).toBe(70);
  });

  it('backfills campaign unlocks without replaying rewards for an already completed mission', () => {
    const bus = new EventBus();
    const gameState = createNewGameState();
    gameState.campaign.completedMissions.push('corridor_breach_01');
    const startingSalvage = gameState.player.salvage;
    const startingFreeportReputation = gameState.world.factions.freeports.reputation;
    const consequence = starterMission.consequences[0]?.apply;

    expect(consequence).toBeDefined();
    if (!consequence) {
      throw new Error('Starter mission full-success consequence is required for this test.');
    }

    applyConsequenceBundle(gameState, 'corridor_breach_01', consequence, bus);

    expect(gameState.campaign.availableMissions).toContain('ashwake_wake_02');
    expect(gameState.campaign.completedMissions).toEqual(['corridor_breach_01']);
    expect(gameState.player.salvage).toBe(startingSalvage);
    expect(gameState.world.factions.freeports.reputation).toBe(startingFreeportReputation);
  });
});
