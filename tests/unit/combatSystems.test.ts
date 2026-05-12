import { describe, expect, it } from 'vitest';
import { EntityRegistry } from '@/core/entityRegistry';
import { EventBus } from '@/core/eventBus';
import { createContentRegistry } from '@/data/registry';
import type { CombatEntity, CombatState } from '@/features/combat/combatTypes';
import { snapshotCombat } from '@/features/combat/combatSimulation';
import { updateEnemyBehaviors } from '@/features/combat/enemyBehaviorSystem';
import { cleanupInactiveProjectiles, clearProjectiles } from '@/features/combat/lifecycleSystem';
import { resolveProjectileHits } from '@/features/combat/projectileSystem';
import { applyStatusEffect, tickStatusEffects } from '@/features/combat/statusSystem';
import { createPlayerEntity, spawnMissionEncounters } from '@/features/combat/spawnSystem';
import { tryFirePrimaryWeapon } from '@/features/combat/weaponSystem';
import { FIELD_CAPACITOR_UNLOCK } from '@/features/progression/progressionState';
import type { StatusEffectDefinition } from '@/types/contracts';

describe('combat systems', () => {
  it('spawns authored mission encounters from enemy archetypes', () => {
    const content = createContentRegistry();
    const mission = content.missions.get('lattice_rescue_contract_03');
    const registry = new EntityRegistry<CombatEntity>();
    if (!mission) {
      throw new Error('Missing rescue contract mission');
    }

    spawnMissionEncounters(registry, content, mission);

    const firstScout = registry.get('enemy_fracture_scout_01');
    const secondScout = registry.get('enemy_fracture_scout_02');
    const scoutArchetype = content.enemyArchetypes.get('fracture_scout');

    expect(firstScout?.resources?.hull).toBe(scoutArchetype?.stats.hull);
    expect(firstScout?.enemyBehavior?.moveSpeed).toBe(scoutArchetype?.behavior.moveSpeed);
    expect(secondScout?.transform.position).toEqual({ x: 1030, y: 470 });
    expect(registry.activeValues()).toHaveLength(2);
  });

  it('applies progression upgrades when spawning the player ship', () => {
    const content = createContentRegistry();
    const ship = content.ships.get('veilrunner_proto');
    if (!ship) {
      throw new Error('Missing starter ship');
    }

    const player = createPlayerEntity(ship, {
      shipId: 'veilrunner_proto',
      loadout: {
        primaryWeaponId: 'pulse_lance_mk1',
      },
      salvage: 0,
      unlocks: [FIELD_CAPACITOR_UNLOCK],
    });

    expect(player.resources?.maxShield).toBe(ship.stats.maxShield + 24);
    expect(player.resources?.maxHull).toBe(ship.stats.maxHull + 8);
  });

  it('fires primary weapons through a projectile entity and resource costs', () => {
    const content = createContentRegistry();
    const ship = content.ships.get('veilrunner_proto');
    const weapon = content.weapons.get('pulse_lance_mk1');
    if (!ship || !weapon) {
      throw new Error('Missing starter ship or weapon');
    }

    const player = createPlayerEntity(ship);
    const state: CombatState = {
      registry: new EntityRegistry<CombatEntity>(),
      playerId: player.id,
      elapsedMs: 0,
      nextProjectileIndex: 0,
    };
    state.registry.add(player);

    tryFirePrimaryWeapon(
      state,
      player,
      {
        move: { x: 0, y: 0 },
        aim: { x: 0, y: 0 },
        firePrimary: true,
      },
      weapon,
    );

    const projectile = state.registry.get('projectile_0');
    expect(projectile?.projectile?.weaponId).toBe('pulse_lance_mk1');
    expect(projectile?.velocity.x).toBe(weapon.projectileSpeed);
    expect(player.resources?.energy).toBe(ship.stats.maxEnergy - weapon.energyCost);
    expect(player.resources?.heat).toBe(weapon.heatGain);
    expect(player.weaponCooldownMs).toBe(weapon.cooldownMs);
  });

  it('ticks ionized status shield pressure and removes inactive projectiles', () => {
    const content = createContentRegistry();
    const bus = new EventBus();
    const damageSources: string[] = [];
    bus.subscribe('combat.damage_applied', (event) => {
      damageSources.push(event.payload.sourceId);
    });

    const target: CombatEntity = {
      id: 'enemy_test_target',
      type: 'enemy',
      factionId: 'fractureborn',
      transform: { position: { x: 100, y: 100 }, rotation: 0 },
      velocity: { x: 0, y: 0 },
      radius: 16,
      active: true,
      tags: ['enemy'],
      resources: {
        hull: 10,
        maxHull: 10,
        shield: 4,
        maxShield: 4,
        energy: 0,
        maxEnergy: 0,
        heat: 0,
        maxHeat: 10,
      },
      statuses: [
        {
          statusId: 'ionized',
          stacks: 1,
          remainingMs: 600,
          durationMs: 2500,
          tickAccumulatorMs: 0,
        },
      ],
    };
    const expiredProjectile: CombatEntity = {
      id: 'projectile_expired',
      type: 'projectile',
      factionId: 'player',
      transform: { position: { x: 120, y: 100 }, rotation: 0 },
      velocity: { x: 0, y: 0 },
      radius: 6,
      active: false,
      tags: ['projectile'],
    };
    const state: CombatState = {
      registry: new EntityRegistry<CombatEntity>(),
      playerId: 'player',
      elapsedMs: 0,
      nextProjectileIndex: 0,
    };
    state.registry.add(target);
    state.registry.add(expiredProjectile);

    tickStatusEffects(state, content, bus, 500);
    cleanupInactiveProjectiles(state);

    expect(target.resources?.shield).toBe(3);
    expect(damageSources).toContain('status_ionized');
    expect(target.statuses).toHaveLength(1);
    expect(state.registry.get('projectile_expired')).toBeUndefined();
  });

  it('clears transient projectiles when mission UI owns the stage', () => {
    const projectile: CombatEntity = {
      id: 'projectile_visible',
      type: 'projectile',
      factionId: 'player',
      transform: { position: { x: 300, y: 300 }, rotation: 0 },
      velocity: { x: 10, y: 0 },
      radius: 6,
      active: true,
      tags: ['projectile'],
    };
    const enemy = createTargetEntity();
    const state: CombatState = {
      registry: new EntityRegistry<CombatEntity>(),
      playerId: 'player',
      elapsedMs: 0,
      nextProjectileIndex: 0,
    };
    state.registry.add(projectile);
    state.registry.add(enemy);

    clearProjectiles(state);

    expect(state.registry.get('projectile_visible')).toBeUndefined();
    expect(state.registry.get('enemy_test_target')).toBe(enemy);
  });

  it('moves enemies toward pressure range and fires damageable projectiles at the player', () => {
    const content = createContentRegistry();
    const ship = content.ships.get('veilrunner_proto');
    if (!ship) {
      throw new Error('Missing starter ship');
    }

    const player = createPlayerEntity(ship);
    const enemy = createTargetEntity();
    enemy.factionId = 'fracture';
    enemy.transform.position = { x: 900, y: player.transform.position.y };
    enemy.enemyBehavior = {
      moveSpeed: 100,
      preferredRange: 300,
      fireRange: 700,
      fireCooldownMs: 500,
      projectileSpeed: 300,
      projectileLifetimeMs: 1200,
      projectileDamage: 7,
      projectileDamageType: 'energy',
    };
    enemy.weaponCooldownMs = 0;
    const state: CombatState = {
      registry: new EntityRegistry<CombatEntity>(),
      playerId: player.id,
      elapsedMs: 0,
      nextProjectileIndex: 0,
    };
    state.registry.add(player);
    state.registry.add(enemy);

    updateEnemyBehaviors(state, 1000);

    expect(enemy.transform.position.x).toBeLessThan(900);
    expect(state.registry.get('projectile_0')?.projectile?.sourceId).toBe(enemy.id);

    enemy.transform.position = {
      x: player.transform.position.x + 24,
      y: player.transform.position.y,
    };
    enemy.weaponCooldownMs = 0;
    updateEnemyBehaviors(state, 16);
    resolveProjectileHits(state, content, new EventBus());

    expect(player.resources?.shield).toBe(
      ship.stats.maxShield - enemy.enemyBehavior.projectileDamage,
    );
  });

  it('applies status stacking policies without renderer dependencies', () => {
    const refresh = statusDefinition('refresh_test', 'refresh');
    const stackDuration = statusDefinition('duration_test', 'stack-duration');
    const stackIntensity = statusDefinition('intensity_test', 'stack-intensity');
    const unique = statusDefinition('unique_test', 'unique');
    const target = createTargetEntity();

    applyStatusEffect(target, refresh, { statusId: refresh.id, sourceId: 'player' });
    target.statuses![0].remainingMs = 400;
    applyStatusEffect(target, refresh, { statusId: refresh.id, sourceId: 'player' });

    applyStatusEffect(target, stackDuration, { statusId: stackDuration.id, sourceId: 'player' });
    applyStatusEffect(target, stackDuration, { statusId: stackDuration.id, sourceId: 'player' });

    applyStatusEffect(target, stackIntensity, { statusId: stackIntensity.id, sourceId: 'player' });
    applyStatusEffect(target, stackIntensity, { statusId: stackIntensity.id, sourceId: 'player' });
    applyStatusEffect(target, stackIntensity, { statusId: stackIntensity.id, sourceId: 'player' });

    applyStatusEffect(target, unique, { statusId: unique.id, sourceId: 'player' });
    target.statuses!.find((status) => status.statusId === unique.id)!.remainingMs = 600;
    applyStatusEffect(target, unique, { statusId: unique.id, sourceId: 'player' });

    const refreshStatus = target.statuses?.find((status) => status.statusId === refresh.id);
    const durationStatus = target.statuses?.find((status) => status.statusId === stackDuration.id);
    const intensityStatus = target.statuses?.find(
      (status) => status.statusId === stackIntensity.id,
    );
    const uniqueStatus = target.statuses?.find((status) => status.statusId === unique.id);

    expect(refreshStatus?.stacks).toBe(1);
    expect(refreshStatus?.remainingMs).toBe(refresh.durationMs);
    expect(durationStatus?.remainingMs).toBe(stackDuration.durationMs * 2);
    expect(durationStatus?.durationMs).toBe(stackDuration.durationMs * stackDuration.maxStacks);
    expect(intensityStatus?.stacks).toBe(stackIntensity.maxStacks);
    expect(intensityStatus?.remainingMs).toBe(stackIntensity.durationMs);
    expect(uniqueStatus?.stacks).toBe(1);
    expect(uniqueStatus?.remainingMs).toBe(600);
  });

  it('emits status expiry events and exposes UI-facing status summaries', () => {
    const content = createContentRegistry();
    const bus = new EventBus();
    const expired: string[] = [];
    bus.subscribe('combat.status_expired', (event) => {
      expired.push(`${event.payload.targetId}:${event.payload.statusId}:${event.payload.sourceId}`);
    });

    const target = createTargetEntity();
    target.statuses = [
      {
        statusId: 'ionized',
        sourceId: 'player',
        stacks: 1,
        remainingMs: 700,
        durationMs: 2500,
        tickAccumulatorMs: 0,
      },
    ];
    const state: CombatState = {
      registry: new EntityRegistry<CombatEntity>(),
      playerId: 'player',
      elapsedMs: 0,
      nextProjectileIndex: 0,
    };
    state.registry.add(target);

    const beforeExpiry = snapshotCombat(state, content);
    tickStatusEffects(state, content, bus, 700);

    expect(beforeExpiry[0].statuses?.[0]).toMatchObject({
      statusId: 'ionized',
      displayName: 'Ionized',
      visualKey: 'status_ionized',
      stacks: 1,
      maxStacks: 1,
      remainingMs: 700,
      durationMs: 2500,
    });
    expect(beforeExpiry[0].statuses?.[0].tags).toContain('control');
    expect(expired).toContain('enemy_test_target:ionized:player');
    expect(target.statuses).toEqual([]);
  });

  it('ticks veil scar hull pressure and can destroy its target', () => {
    const content = createContentRegistry();
    const bus = new EventBus();
    const destroyed: string[] = [];
    bus.subscribe('combat.entity_destroyed', (event) => {
      destroyed.push(`${event.payload.entityType}:${event.payload.entityId}`);
    });

    const target = createTargetEntity();
    target.resources!.hull = 2;
    target.statuses = [
      {
        statusId: 'veil_scar',
        sourceId: 'enemy_lancer',
        stacks: 1,
        remainingMs: 1000,
        durationMs: 3600,
        tickAccumulatorMs: 0,
      },
    ];
    const state: CombatState = {
      registry: new EntityRegistry<CombatEntity>(),
      playerId: 'player',
      elapsedMs: 0,
      nextProjectileIndex: 0,
    };
    state.registry.add(target);

    tickStatusEffects(state, content, bus, 900);

    expect(target.resources?.hull).toBe(0);
    expect(target.active).toBe(false);
    expect(destroyed).toContain('enemy:enemy_test_target');
  });
});

function createTargetEntity(): CombatEntity {
  return {
    id: 'enemy_test_target',
    type: 'enemy',
    factionId: 'fractureborn',
    transform: { position: { x: 100, y: 100 }, rotation: 0 },
    velocity: { x: 0, y: 0 },
    radius: 16,
    active: true,
    tags: ['enemy'],
    resources: {
      hull: 10,
      maxHull: 10,
      shield: 4,
      maxShield: 4,
      energy: 0,
      maxEnergy: 0,
      heat: 0,
      maxHeat: 10,
    },
    statuses: [],
  };
}

function statusDefinition(
  id: string,
  stacking: StatusEffectDefinition['stacking'],
): StatusEffectDefinition {
  return {
    id,
    version: '1.0.0',
    displayName: id,
    stacking,
    durationMs: 1000,
    maxStacks: 3,
    visualKey: id,
    tags: ['test'],
  };
}
