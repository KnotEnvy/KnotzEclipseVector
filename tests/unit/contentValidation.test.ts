import { describe, expect, it } from 'vitest';
import { createContentRegistry } from '@/data/registry';
import { validateContentRegistry } from '@/data/validation';

describe('content validation', () => {
  it('accepts the starter content registry', () => {
    const result = validateContentRegistry(createContentRegistry());

    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('rejects broken weapon references', () => {
    const content = createContentRegistry();
    const ship = content.ships.get('veilrunner_proto');
    if (!ship) {
      throw new Error('Missing starter ship');
    }

    ship.slots.hardpoints = ['missing_weapon'];
    const result = validateContentRegistry(content);

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes('Unknown weapon'))).toBe(true);
  });
});
