import type { ContentRegistry } from './registry';
import type {
  ConsequenceBundle,
  DialogueNodeDefinition,
  DialogueTrigger,
  FactionReputationState,
  MissionDefinition,
  ObjectiveDefinition,
  PlayerShipDefinition,
  SectorState,
  StatusEffectDefinition,
  WeaponDefinition,
} from '@/types/contracts';

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
    validateShipDefinition(ship, content, issues);
  }

  for (const weapon of content.weapons.values()) {
    validateWeaponDefinition(weapon, content, issues);
  }

  for (const effect of content.statusEffects.values()) {
    validateStatusEffectDefinition(effect, issues);
  }

  for (const [factionKey, faction] of Object.entries(content.factions)) {
    validateFactionState(factionKey, faction, issues);
  }

  for (const [sectorKey, sector] of Object.entries(content.sectors)) {
    validateSectorState(sectorKey, sector, content, issues);
  }

  for (const mission of content.missions.values()) {
    validateMissionDefinition(mission, content, issues);
  }

  for (const dialogueNode of content.dialogueNodes.values()) {
    validateDialogueNodeDefinition(dialogueNode, content, issues);
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

function validateDialogueNodeDefinition(
  node: DialogueNodeDefinition,
  content: Pick<ContentRegistry, 'missions'>,
  issues: ContentValidationIssue[],
): void {
  const path = `dialogueNodes.${node.id}`;
  assertStableId(node.id, `${path}.id`, issues);
  assertSemver(node.version, `${path}.version`, issues);
  assertStableId(node.missionId, `${path}.missionId`, issues);
  assertStableId(node.speakerId, `${path}.speakerId`, issues);
  assertNonEmptyString(node.speakerName, `${path}.speakerName`, issues);
  assertNonEmptyString(node.text, `${path}.text`, issues);
  assertFiniteNumber(node.priority, `${path}.priority`, issues);

  const mission = content.missions.get(node.missionId);
  if (!mission) {
    issues.push({
      path: `${path}.missionId`,
      message: `Unknown mission reference: ${node.missionId}`,
    });
  }

  validateDialogueTrigger(node.trigger, mission, `${path}.trigger`, issues);
}

function validateDialogueTrigger(
  trigger: DialogueTrigger,
  mission: MissionDefinition | undefined,
  path: string,
  issues: ContentValidationIssue[],
): void {
  const supportedEvents = new Set([
    'mission.loaded',
    'combat.entity_destroyed',
    'mission.objective_updated',
    'mission.choice_presented',
    'mission.choice_committed',
    'mission.resolved',
  ]);

  if (!supportedEvents.has(trigger.eventType)) {
    issues.push({
      path: `${path}.eventType`,
      message: `Unsupported dialogue trigger event: ${trigger.eventType}`,
    });
  }

  if ('objectiveId' in trigger && trigger.objectiveId) {
    assertStableId(trigger.objectiveId, `${path}.objectiveId`, issues);
    if (mission && !mission.objectives.some((objective) => objective.id === trigger.objectiveId)) {
      issues.push({
        path: `${path}.objectiveId`,
        message: `Unknown objective reference: ${trigger.objectiveId}`,
      });
    }
  }

  if ('choiceId' in trigger && trigger.choiceId) {
    assertStableId(trigger.choiceId, `${path}.choiceId`, issues);
    const choiceExists = mission?.objectives.some(
      (objective) => objective.kind === 'choice_gate' && objective.choiceId === trigger.choiceId,
    );
    if (mission && !choiceExists) {
      issues.push({
        path: `${path}.choiceId`,
        message: `Unknown choice reference: ${trigger.choiceId}`,
      });
    }
  }

  if ('entityId' in trigger && trigger.entityId) {
    assertStableId(trigger.entityId, `${path}.entityId`, issues);
  }

  if ('selectedOption' in trigger && trigger.selectedOption) {
    assertStableId(trigger.selectedOption, `${path}.selectedOption`, issues);
  }
}

function validateShipDefinition(
  ship: PlayerShipDefinition,
  content: Pick<ContentRegistry, 'weapons'>,
  issues: ContentValidationIssue[],
): void {
  const path = `ships.${ship.id}`;
  assertStableId(ship.id, `${path}.id`, issues);
  assertSemver(ship.version, `${path}.version`, issues);
  assertNonEmptyString(ship.displayName, `${path}.displayName`, issues);

  if (ship.slots.hardpoints.length === 0) {
    issues.push({
      path: `${path}.slots.hardpoints`,
      message: 'Ships must define at least one weapon hardpoint.',
    });
  }

  for (const weaponId of ship.slots.hardpoints) {
    if (!content.weapons.has(weaponId)) {
      issues.push({
        path: `${path}.slots.hardpoints`,
        message: `Unknown weapon reference: ${weaponId}`,
      });
    }
  }

  assertPositiveNumber(ship.stats.maxHull, `${path}.stats.maxHull`, issues);
  assertPositiveNumber(ship.stats.maxShield, `${path}.stats.maxShield`, issues);
  assertPositiveNumber(ship.stats.maxEnergy, `${path}.stats.maxEnergy`, issues);
  assertPositiveNumber(ship.stats.maxHeat, `${path}.stats.maxHeat`, issues);
  assertPositiveNumber(ship.stats.moveSpeed, `${path}.stats.moveSpeed`, issues);
  assertPositiveNumber(ship.stats.turnRate, `${path}.stats.turnRate`, issues);
}

function validateWeaponDefinition(
  weapon: WeaponDefinition,
  content: Pick<ContentRegistry, 'statusEffects'>,
  issues: ContentValidationIssue[],
): void {
  const path = `weapons.${weapon.id}`;
  assertStableId(weapon.id, `${path}.id`, issues);
  assertSemver(weapon.version, `${path}.version`, issues);
  assertNonEmptyString(weapon.displayName, `${path}.displayName`, issues);
  assertNonNegativeNumber(weapon.energyCost, `${path}.energyCost`, issues);
  assertNonNegativeNumber(weapon.heatGain, `${path}.heatGain`, issues);
  assertPositiveNumber(weapon.cooldownMs, `${path}.cooldownMs`, issues);
  assertPositiveNumber(weapon.projectileSpeed, `${path}.projectileSpeed`, issues);
  assertPositiveNumber(weapon.projectileLifetimeMs, `${path}.projectileLifetimeMs`, issues);
  assertPositiveNumber(weapon.damageProfile.amount, `${path}.damageProfile.amount`, issues);
  assertProbability(weapon.damageProfile.critChance, `${path}.damageProfile.critChance`, issues);

  if (weapon.statusEffectId && !content.statusEffects.has(weapon.statusEffectId)) {
    issues.push({
      path: `${path}.statusEffectId`,
      message: `Unknown status effect reference: ${weapon.statusEffectId}`,
    });
  }

  if (weapon.statusEffectChance !== undefined) {
    assertProbability(weapon.statusEffectChance, `${path}.statusEffectChance`, issues);

    if (!weapon.statusEffectId) {
      issues.push({
        path: `${path}.statusEffectChance`,
        message: 'Status effect chance requires a status effect id.',
      });
    }
  }
}

function validateStatusEffectDefinition(
  effect: StatusEffectDefinition,
  issues: ContentValidationIssue[],
): void {
  const path = `statusEffects.${effect.id}`;
  assertStableId(effect.id, `${path}.id`, issues);
  assertSemver(effect.version, `${path}.version`, issues);
  assertNonEmptyString(effect.displayName, `${path}.displayName`, issues);
  assertPositiveNumber(effect.durationMs, `${path}.durationMs`, issues);
  assertPositiveInteger(effect.maxStacks, `${path}.maxStacks`, issues);

  if (effect.tickRateMs !== undefined) {
    assertPositiveNumber(effect.tickRateMs, `${path}.tickRateMs`, issues);

    if (effect.tickRateMs > effect.durationMs) {
      issues.push({
        path: `${path}.tickRateMs`,
        message: 'Status effect tick rate cannot exceed duration.',
      });
    }
  }
}

function validateFactionState(
  factionKey: string,
  faction: FactionReputationState,
  issues: ContentValidationIssue[],
): void {
  const path = `factions.${factionKey}`;
  assertStableId(factionKey, `${path}.key`, issues);
  assertStableId(faction.factionId, `${path}.factionId`, issues);
  assertMatchingKey(factionKey, faction.factionId, `${path}.factionId`, issues);
  assertFiniteNumber(faction.reputation, `${path}.reputation`, issues);
  assertFiniteNumber(faction.trust, `${path}.trust`, issues);
}

function validateSectorState(
  sectorKey: string,
  sector: SectorState,
  content: Pick<ContentRegistry, 'factions'>,
  issues: ContentValidationIssue[],
): void {
  const path = `sectors.${sectorKey}`;
  assertStableId(sectorKey, `${path}.key`, issues);
  assertStableId(sector.sectorId, `${path}.sectorId`, issues);
  assertMatchingKey(sectorKey, sector.sectorId, `${path}.sectorId`, issues);

  if (sector.control !== 'contested' && !content.factions[sector.control]) {
    issues.push({
      path: `${path}.control`,
      message: `Unknown faction control reference: ${sector.control}`,
    });
  }

  assertFiniteNumber(sector.security, `${path}.security`, issues);
  assertFiniteNumber(sector.civilianStability, `${path}.civilianStability`, issues);
  assertFiniteNumber(sector.anomalyIntensity, `${path}.anomalyIntensity`, issues);
  assertFiniteNumber(sector.marketVolatility, `${path}.marketVolatility`, issues);
  assertFiniteNumber(sector.infrastructureDamage, `${path}.infrastructureDamage`, issues);
  assertFiniteNumber(sector.localSentiment, `${path}.localSentiment`, issues);
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

  for (const [index, encounter] of mission.encounterSequence.entries()) {
    assertStableId(encounter.id, `missions.${mission.id}.encounterSequence.${index}.id`, issues);
    assertStableId(
      encounter.archetypeId,
      `missions.${mission.id}.encounterSequence.${index}.archetypeId`,
      issues,
    );
    assertFiniteNumber(
      encounter.at.x,
      `missions.${mission.id}.encounterSequence.${index}.at.x`,
      issues,
    );
    assertFiniteNumber(
      encounter.at.y,
      `missions.${mission.id}.encounterSequence.${index}.at.y`,
      issues,
    );
  }

  assertNonNegativeNumber(
    mission.rewards.salvage,
    `missions.${mission.id}.rewards.salvage`,
    issues,
  );

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

  for (const [factionId, delta] of Object.entries(bundle.faction?.repDelta ?? {})) {
    assertFiniteNumber(delta, `${path}.faction.repDelta.${factionId}`, issues);
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

  if (bundle.sector) {
    for (const [key, delta] of Object.entries(bundle.sector.delta)) {
      assertFiniteNumber(delta, `${path}.sector.delta.${key}`, issues);
    }
    assertNonEmptyString(bundle.sector.reason, `${path}.sector.reason`, issues);
  }

  if (bundle.inventory?.salvage !== undefined) {
    assertNonNegativeNumber(bundle.inventory.salvage, `${path}.inventory.salvage`, issues);
  }

  if (bundle.inventory) {
    assertStableId(bundle.inventory.idempotencyKey, `${path}.inventory.idempotencyKey`, issues);
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

function assertMatchingKey(
  key: string,
  id: string,
  path: string,
  issues: ContentValidationIssue[],
): void {
  if (key !== id) {
    issues.push({
      path,
      message: `Registry key must match object id. Expected ${key}, received ${id}.`,
    });
  }
}

function assertNonEmptyString(value: string, path: string, issues: ContentValidationIssue[]): void {
  if (value.trim().length === 0) {
    issues.push({
      path,
      message: 'Value must not be empty.',
    });
  }
}

function assertFiniteNumber(value: number, path: string, issues: ContentValidationIssue[]): void {
  if (!Number.isFinite(value)) {
    issues.push({
      path,
      message: 'Value must be a finite number.',
    });
  }
}

function assertPositiveNumber(value: number, path: string, issues: ContentValidationIssue[]): void {
  assertFiniteNumber(value, path, issues);

  if (value <= 0) {
    issues.push({
      path,
      message: 'Value must be positive.',
    });
  }
}

function assertNonNegativeNumber(
  value: number,
  path: string,
  issues: ContentValidationIssue[],
): void {
  assertFiniteNumber(value, path, issues);

  if (value < 0) {
    issues.push({
      path,
      message: 'Value must not be negative.',
    });
  }
}

function assertPositiveInteger(
  value: number,
  path: string,
  issues: ContentValidationIssue[],
): void {
  assertPositiveNumber(value, path, issues);

  if (!Number.isInteger(value)) {
    issues.push({
      path,
      message: 'Value must be an integer.',
    });
  }
}

function assertProbability(value: number, path: string, issues: ContentValidationIssue[]): void {
  assertFiniteNumber(value, path, issues);

  if (value < 0 || value > 1) {
    issues.push({
      path,
      message: 'Value must be between 0 and 1.',
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
