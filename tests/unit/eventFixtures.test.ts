import { describe, expect, it } from 'vitest';
import damageFixture from '../../fixtures/events/combat.damage_applied.v1.json';
import choiceFixture from '../../fixtures/events/mission.choice_committed.v1.json';
import type { DomainEvent } from '@/types/contracts';

describe('event contract fixtures', () => {
  it('keeps high-value fixture event names and versions aligned', () => {
    const damage = damageFixture as DomainEvent<'combat.damage_applied'>;
    const choice = choiceFixture as DomainEvent<'mission.choice_committed'>;

    expect(damage.type).toBe('combat.damage_applied');
    expect(damage.version).toBe(1);
    expect(damage.payload.damageType).toBe('energy');

    expect(choice.type).toBe('mission.choice_committed');
    expect(choice.version).toBe(1);
    expect(choice.payload.choiceId).toBe('corridor_breach_recovery_doctrine');
  });
});
