import { describe, expect, it } from 'vitest';
import { EventBus } from '@/core/eventBus';

describe('EventBus', () => {
  it('publishes typed events with a shared envelope and history', () => {
    const bus = new EventBus();
    bus.setClock(42);

    const received: string[] = [];
    bus.subscribe('combat.damage_applied', (event) => {
      received.push(`${event.payload.targetId}:${event.payload.amount}:${event.timestampMs}`);
    });

    bus.publish('combat.damage_applied', {
      targetId: 'enemy_1',
      sourceId: 'player',
      amount: 22,
      damageType: 'energy',
      shielded: true,
      crit: false,
      remainingHull: 80,
      remainingShield: 8,
    });

    expect(received).toEqual(['enemy_1:22:42']);
    expect(bus.getHistory()).toHaveLength(1);
  });
});
