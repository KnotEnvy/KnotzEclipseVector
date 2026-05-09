import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createContentRegistry } from '@/data/registry';
import type { ContentRegistry } from '@/data/registry';
import { validateContentRegistry, type ContentValidationIssue } from '@/data/validation';
import { createInitialSave } from '@/features/save/saveService';
import { validateJsonSchemaValue, type JsonSchema } from '@/tools/jsonSchemaValidator';

const SCHEMA_FILES = [
  'mission-definition.schema.json',
  'ship-definition.schema.json',
  'weapon-definition.schema.json',
  'status-effect-definition.schema.json',
  'faction-state.schema.json',
  'sector-state.schema.json',
  'save-game-root.schema.json',
] as const;

export type ContentValidationReport = {
  ok: boolean;
  summary: {
    missions: number;
    ships: number;
    weapons: number;
    statusEffects: number;
    factions: number;
    sectors: number;
    schemas: number;
  };
  issues: ContentValidationIssue[];
};

export function buildContentValidationReport(rootDir = process.cwd()): ContentValidationReport {
  const content = createContentRegistry();
  const registryResult = validateContentRegistry(content);
  const schemaIssues = validateAuthoredContentAgainstSchemas(content, rootDir);
  const issues = [...registryResult.issues, ...schemaIssues];

  return {
    ok: issues.length === 0,
    summary: {
      missions: content.missions.size,
      ships: content.ships.size,
      weapons: content.weapons.size,
      statusEffects: content.statusEffects.size,
      factions: Object.keys(content.factions).length,
      sectors: Object.keys(content.sectors).length,
      schemas: SCHEMA_FILES.length,
    },
    issues,
  };
}

export function getContentSchemaFiles(): readonly string[] {
  return SCHEMA_FILES;
}

export function validateAuthoredContentAgainstSchemas(
  content: ContentRegistry,
  rootDir = process.cwd(),
): ContentValidationIssue[] {
  const issues: ContentValidationIssue[] = [];
  const schemas = new Map<string, JsonSchema>();

  for (const schemaFile of SCHEMA_FILES) {
    const schema = loadSchemaFile(rootDir, schemaFile, issues);
    if (schema) {
      schemas.set(schemaFile, schema);
    }
  }

  for (const mission of content.missions.values()) {
    validateAgainstLoadedSchema(
      schemas,
      'mission-definition.schema.json',
      mission,
      `missions.${mission.id}`,
      issues,
    );
  }

  for (const ship of content.ships.values()) {
    validateAgainstLoadedSchema(
      schemas,
      'ship-definition.schema.json',
      ship,
      `ships.${ship.id}`,
      issues,
    );
  }

  for (const weapon of content.weapons.values()) {
    validateAgainstLoadedSchema(
      schemas,
      'weapon-definition.schema.json',
      weapon,
      `weapons.${weapon.id}`,
      issues,
    );
  }

  for (const effect of content.statusEffects.values()) {
    validateAgainstLoadedSchema(
      schemas,
      'status-effect-definition.schema.json',
      effect,
      `statusEffects.${effect.id}`,
      issues,
    );
  }

  for (const [factionId, faction] of Object.entries(content.factions)) {
    validateAgainstLoadedSchema(
      schemas,
      'faction-state.schema.json',
      faction,
      `factions.${factionId}`,
      issues,
    );
  }

  for (const [sectorId, sector] of Object.entries(content.sectors)) {
    validateAgainstLoadedSchema(
      schemas,
      'sector-state.schema.json',
      sector,
      `sectors.${sectorId}`,
      issues,
    );
  }

  validateAgainstLoadedSchema(
    schemas,
    'save-game-root.schema.json',
    createInitialSave('schema_validation'),
    'saves.initial',
    issues,
  );

  return issues;
}

function loadSchemaFile(
  rootDir: string,
  schemaFile: (typeof SCHEMA_FILES)[number],
  issues: ContentValidationIssue[],
): JsonSchema | null {
  const schemaPath = join(rootDir, 'schemas', schemaFile);

  try {
    const parsed = JSON.parse(readFileSync(schemaPath, 'utf8')) as JsonSchema;
    if (typeof parsed.$id !== 'string' || !parsed.$id.includes(schemaFile)) {
      issues.push({
        path: `schemas.${schemaFile}.$id`,
        message: 'Schema $id must include the schema file name.',
      });
    }
    return parsed;
  } catch (error) {
    issues.push({
      path: `schemas.${schemaFile}`,
      message: `Schema must be valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    });
    return null;
  }
}

function validateAgainstLoadedSchema(
  schemas: ReadonlyMap<string, JsonSchema>,
  schemaFile: (typeof SCHEMA_FILES)[number],
  value: unknown,
  path: string,
  issues: ContentValidationIssue[],
): void {
  const schema = schemas.get(schemaFile);
  if (!schema) {
    return;
  }

  try {
    for (const issue of validateJsonSchemaValue(schema, value, path)) {
      issues.push({
        path: `${issue.path}`,
        message: `[${schemaFile}] ${issue.message}`,
      });
    }
  } catch (error) {
    issues.push({
      path,
      message: `[${schemaFile}] Schema validation failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
}
