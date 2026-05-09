import { buildContentValidationReport } from './contentValidationReport';

export async function runContentValidationCli(argv = process.argv.slice(2)): Promise<number> {
  const json = argv.includes('--json');
  const report = buildContentValidationReport();

  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return report.ok ? 0 : 1;
  }

  if (report.ok) {
    console.log('Content validation passed.');
    console.log(
      [
        `missions=${report.summary.missions}`,
        `ships=${report.summary.ships}`,
        `weapons=${report.summary.weapons}`,
        `statusEffects=${report.summary.statusEffects}`,
        `enemyArchetypes=${report.summary.enemyArchetypes}`,
        `dialogueNodes=${report.summary.dialogueNodes}`,
        `factions=${report.summary.factions}`,
        `sectors=${report.summary.sectors}`,
        `schemas=${report.summary.schemas}`,
      ].join(' '),
    );
    return 0;
  }

  console.error(`Content validation failed with ${report.issues.length} issue(s):`);
  for (const issue of report.issues) {
    console.error(`- ${issue.path}: ${issue.message}`);
  }

  return 1;
}
