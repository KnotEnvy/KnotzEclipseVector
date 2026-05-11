import { describe, expect, it } from 'vitest';
import { EntityRegistry } from '@/core/entityRegistry';
import { EventBus } from '@/core/eventBus';
import { createContentRegistry } from '@/data/registry';
import type { CombatEntity, CombatState } from '@/features/combat/combatTypes';
import { cleanupInactiveProjectiles } from '@/features/combat/lifecycleSystem';
import { tickStatusEffects } from '@/features/combat/statusSystem';
import { createPlayerEntity, spawnMissionEncounters } from '@/features/combat/spawnSystem';
import { tryFirePrimaryWeapon } from '@/features/combat/weaponSystem';

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
    expect(secondScout?.transform.position).toEqual({ x: 1030, y: 470 });
    expect(registry.activeValues()).toHaveLength(2);
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
});
