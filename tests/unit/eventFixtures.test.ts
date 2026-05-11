import { describe, expect, it } from 'vitest';
import damageFixture from '../../fixtures/events/combat.damage_applied.v1.json';
import statusExpiredFixture from '../../fixtures/events/combat.status_expired.v1.json';
import choiceFixture from '../../fixtures/events/mission.choice_committed.v1.json';
import type { DomainEvent } from '@/types/contracts';

describe('event contract fixtures', () => {
  it('keeps high-value fixture event names and versions aligned', () => {
    const damage = damageFixture as DomainEvent<'combat.damage_applied'>;
    const statusExpired = statusExpiredFixture as DomainEvent<'combat.status_expired'>;
    const choice = choiceFixture as DomainEvent<'mission.choice_committed'>;

    expect(damage.type).toBe('combat.damage_applied');
    expect(damage.version).toBe(1);
    expect(damage.payload.damageType).toBe('energy');

    expect(statusExpired.type).toBe('combat.status_expired');
    expect(statusExpired.version).toBe(1);
    expect(statusExpired.payload.statusId).toBe('ionized');

    expect(choice.type).toBe('mission.choice_committed');
    expect(choice.version).toBe(1);
    expect(choice.payload.choiceId).toBe('corridor_breach_recovery_doctrine');
  });
});
