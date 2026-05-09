import { describe, expect, it } from 'vitest';
import { EventBus } from '@/core/eventBus';
import { createContentRegistry } from '@/data/registry';
import { createCombatState, tickCombat } from '@/features/combat/combatSimulation';

describe('combat simulation', () => {
  it('resolves projectile hits and emits destruction without renderer access', () => {
    const content = createContentRegistry();
    const ship = content.ships.get('veilrunner_proto');
    if (!ship) {
      throw new Error('Missing starter ship');
    }

    const bus = new EventBus();
    const destroyed: string[] = [];
    const statuses: string[] = [];
    bus.subscribe('combat.entity_destroyed', (event) => {
      destroyed.push(event.payload.entityId);
    });
    bus.subscribe('combat.status_applied', (event) => {
      statuses.push(`${event.payload.targetId}:${event.payload.statusId}`);
    });

    const state = createCombatState(content, ship);

    for (let frame = 0; frame < 220; frame += 1) {
      tickCombat(
        state,
        {
          move: { x: 0, y: 0 },
          aim: { x: 1, y: 0 },
          firePrimary: true,
        },
        content,
        bus,
        1000 / 60,
      );
    }

    expect(destroyed).toContain('enemy_fracture_drone_01');
    expect(statuses).toContain('enemy_fracture_drone_01:ionized');
    expect(state.registry.get('enemy_fracture_drone_01')?.active).toBe(false);
  });
});
