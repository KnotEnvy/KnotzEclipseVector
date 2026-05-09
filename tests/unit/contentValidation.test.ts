import { describe, expect, it } from 'vitest';
import { createContentRegistry } from '@/data/registry';
import { validateContentRegistry } from '@/data/validation';
import {
  buildContentValidationReport,
  getContentSchemaFiles,
  validateAuthoredContentAgainstSchemas,
} from '@/tools/contentValidationReport';

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

  it('rejects broken status effect references from weapons', () => {
    const content = createContentRegistry();
    const weapon = content.weapons.get('pulse_lance_mk1');
    if (!weapon) {
      throw new Error('Missing starter weapon');
    }

    weapon.statusEffectId = 'missing_status';
    const result = validateContentRegistry(content);

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes('Unknown status effect'))).toBe(
      true,
    );
  });

  it('rejects invalid ship and weapon numeric tuning', () => {
    const content = createContentRegistry();
    const ship = content.ships.get('veilrunner_proto');
    const weapon = content.weapons.get('pulse_lance_mk1');
    if (!ship || !weapon) {
      throw new Error('Missing starter combat content');
    }

    ship.stats.moveSpeed = 0;
    weapon.damageProfile.critChance = 2;
    weapon.cooldownMs = -1;

    const result = validateContentRegistry(content);

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.path.endsWith('stats.moveSpeed'))).toBe(true);
    expect(result.issues.some((issue) => issue.path.endsWith('damageProfile.critChance'))).toBe(
      true,
    );
    expect(result.issues.some((issue) => issue.path.endsWith('cooldownMs'))).toBe(true);
  });

  it('rejects broken faction and sector registry references', () => {
    const content = createContentRegistry();

    content.factions.freeports.factionId = 'freeport_typo';
    content.sectors.freeport_lattice.control = 'missing_faction';

    const result = validateContentRegistry(content);

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes('Registry key'))).toBe(true);
    expect(result.issues.some((issue) => issue.message.includes('Unknown faction control'))).toBe(
      true,
    );
  });

  it('rejects broken dialogue mission and trigger references', () => {
    const content = createContentRegistry();
    const node = content.dialogueNodes.get('corridor_breach_doctrine_prompt');
    if (!node) {
      throw new Error('Missing starter dialogue node');
    }

    node.missionId = 'missing_mission';
    node.trigger = {
      eventType: 'mission.choice_presented',
      choiceId: 'missing_choice',
    };

    const result = validateContentRegistry(content);

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes('Unknown mission'))).toBe(true);
  });

  it('keeps authored JSON schemas parseable', () => {
    const report = buildContentValidationReport();

    expect(report.ok).toBe(true);
    expect(report.summary.schemas).toBe(getContentSchemaFiles().length);
  });

  it('validates authored content objects against their schema mirrors', () => {
    const content = createContentRegistry();
    const ship = content.ships.get('veilrunner_proto');
    if (!ship) {
      throw new Error('Missing starter ship');
    }

    const schemaDriftShip = ship as typeof ship & { unsupportedDebugOnlyField?: boolean };
    schemaDriftShip.unsupportedDebugOnlyField = true;

    const issues = validateAuthoredContentAgainstSchemas(content);

    expect(issues.some((issue) => issue.path.endsWith('unsupportedDebugOnlyField'))).toBe(true);
    expect(issues.some((issue) => issue.message.includes('ship-definition.schema.json'))).toBe(
      true,
    );
  });
});
