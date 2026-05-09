import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createContentRegistry } from '@/data/registry';
import { validateContentRegistry, type ContentValidationIssue } from '@/data/validation';

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
  const schemaIssues = validateSchemaFiles(rootDir);
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

function validateSchemaFiles(rootDir: string): ContentValidationIssue[] {
  const issues: ContentValidationIssue[] = [];

  for (const schemaFile of SCHEMA_FILES) {
    const schemaPath = join(rootDir, 'schemas', schemaFile);

    try {
      const parsed = JSON.parse(readFileSync(schemaPath, 'utf8')) as { $id?: unknown };
      if (typeof parsed.$id !== 'string' || !parsed.$id.includes(schemaFile)) {
        issues.push({
          path: `schemas.${schemaFile}.$id`,
          message: 'Schema $id must include the schema file name.',
        });
      }
    } catch (error) {
      issues.push({
        path: `schemas.${schemaFile}`,
        message: `Schema must be valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return issues;
}
