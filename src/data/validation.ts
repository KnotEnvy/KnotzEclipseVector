import type { ContentRegistry } from './registry';
import type { ConsequenceBundle, MissionDefinition, ObjectiveDefinition } from '@/types/contracts';

export type ContentValidationIssue = {
  path: string;
  message: string;
};

export type ContentValidationResult = {
  ok: boolean;
  issues: ContentValidationIssue[];
};

const STABLE_ID_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

export function validateContentRegistry(content: ContentRegistry): ContentValidationResult {
  const issues: ContentValidationIssue[] = [];

  for (const ship of content.ships.values()) {
    assertStableId(ship.id, `ships.${ship.id}.id`, issues);
    assertSemver(ship.version, `ships.${ship.id}.version`, issues);

    for (const weaponId of ship.slots.hardpoints) {
      if (!content.weapons.has(weaponId)) {
        issues.push({
          path: `ships.${ship.id}.slots.hardpoints`,
          message: `Unknown weapon reference: ${weaponId}`,
        });
      }
    }
  }

  for (const weapon of content.weapons.values()) {
    assertStableId(weapon.id, `weapons.${weapon.id}.id`, issues);
    assertSemver(weapon.version, `weapons.${weapon.id}.version`, issues);

    if (weapon.damageProfile.amount <= 0) {
      issues.push({
        path: `weapons.${weapon.id}.damageProfile.amount`,
        message: 'Weapon damage must be positive.',
      });
    }

    if (weapon.statusEffectId && !content.statusEffects.has(weapon.statusEffectId)) {
      issues.push({
        path: `weapons.${weapon.id}.statusEffectId`,
        message: `Unknown status effect reference: ${weapon.statusEffectId}`,
      });
    }

    if (
      weapon.statusEffectChance !== undefined &&
      (weapon.statusEffectChance < 0 || weapon.statusEffectChance > 1)
    ) {
      issues.push({
        path: `weapons.${weapon.id}.statusEffectChance`,
        message: 'Status effect chance must be between 0 and 1.',
      });
    }
  }

  for (const effect of content.statusEffects.values()) {
    assertStableId(effect.id, `statusEffects.${effect.id}.id`, issues);
    assertSemver(effect.version, `statusEffects.${effect.id}.version`, issues);
  }

  for (const mission of content.missions.values()) {
    validateMissionDefinition(mission, content, issues);
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

function validateMissionDefinition(
  mission: MissionDefinition,
  content: ContentRegistry,
  issues: ContentValidationIssue[],
): void {
  assertStableId(mission.id, `missions.${mission.id}.id`, issues);
  assertSemver(mission.version, `missions.${mission.id}.version`, issues);

  if (!content.sectors[mission.sectorId]) {
    issues.push({
      path: `missions.${mission.id}.sectorId`,
      message: `Unknown sector reference: ${mission.sectorId}`,
    });
  }

  const objectiveIds = new Set<string>();
  for (const objective of mission.objectives) {
    validateObjective(mission, objective, objectiveIds, content, issues);
  }

  if (mission.consequences.length === 0) {
    issues.push({
      path: `missions.${mission.id}.consequences`,
      message: 'Mission must declare at least one consequence rule.',
    });
  }

  for (const [index, rule] of mission.consequences.entries()) {
    validateConsequenceBundle(
      rule.apply,
      content,
      `missions.${mission.id}.consequences.${index}.apply`,
      issues,
    );
  }
}

function validateObjective(
  mission: MissionDefinition,
  objective: ObjectiveDefinition,
  objectiveIds: Set<string>,
  content: ContentRegistry,
  issues: ContentValidationIssue[],
): void {
  const path = `missions.${mission.id}.objectives.${objective.id}`;
  assertStableId(objective.id, `${path}.id`, issues);

  if (objectiveIds.has(objective.id)) {
    issues.push({
      path,
      message: `Duplicate objective id: ${objective.id}`,
    });
  }
  objectiveIds.add(objective.id);

  if (objective.kind === 'destroy' && objective.requiredCount < 1) {
    issues.push({
      path: `${path}.requiredCount`,
      message: 'Destroy objectives must require at least one target.',
    });
  }

  if (objective.kind === 'survive' && objective.durationMs <= 0) {
    issues.push({
      path: `${path}.durationMs`,
      message: 'Survive objectives must have positive duration.',
    });
  }

  if (objective.kind === 'choice_gate') {
    assertStableId(objective.choiceId, `${path}.choiceId`, issues);
    if (objective.options.length < 2) {
      issues.push({
        path: `${path}.options`,
        message: 'Choice gates must provide at least two options.',
      });
    }

    const optionIds = new Set<string>();
    for (const option of objective.options) {
      assertStableId(option.id, `${path}.options.${option.id}.id`, issues);
      if (optionIds.has(option.id)) {
        issues.push({
          path: `${path}.options.${option.id}`,
          message: `Duplicate choice option id: ${option.id}`,
        });
      }
      optionIds.add(option.id);
      validateConsequenceBundle(
        option.consequence,
        content,
        `${path}.options.${option.id}.consequence`,
        issues,
      );
    }
  }
}

function validateConsequenceBundle(
  bundle: ConsequenceBundle,
  content: Pick<ContentRegistry, 'factions' | 'sectors'>,
  path: string,
  issues: ContentValidationIssue[],
): void {
  for (const factionId of Object.keys(bundle.faction?.repDelta ?? {})) {
    if (Object.keys(content.factions).length > 0 && !content.factions[factionId]) {
      issues.push({
        path: `${path}.faction.repDelta.${factionId}`,
        message: `Unknown faction reference: ${factionId}`,
      });
    }
  }

  if (
    bundle.sector &&
    Object.keys(content.sectors).length > 0 &&
    !content.sectors[bundle.sector.sectorId]
  ) {
    issues.push({
      path: `${path}.sector.sectorId`,
      message: `Unknown sector reference: ${bundle.sector.sectorId}`,
    });
  }
}

function assertStableId(value: string, path: string, issues: ContentValidationIssue[]): void {
  if (!STABLE_ID_PATTERN.test(value)) {
    issues.push({
      path,
      message: 'IDs must be stable lowercase snake-case strings.',
    });
  }
}

function assertSemver(value: string, path: string, issues: ContentValidationIssue[]): void {
  if (!SEMVER_PATTERN.test(value)) {
    issues.push({
      path,
      message: 'Content versions must use semver.',
    });
  }
}
