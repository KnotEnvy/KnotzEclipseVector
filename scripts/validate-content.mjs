import { build } from 'esbuild';

const result = await build({
  entryPoints: ['src/tools/contentValidationCli.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  write: false,
  logLevel: 'silent',
  sourcemap: 'inline',
});

const [output] = result.outputFiles;
if (!output) {
  console.error('Content validation failed before startup: CLI bundle was not emitted.');
  process.exit(1);
}

const source = Buffer.from(output.text).toString('base64');
const moduleUrl = `data:text/javascript;base64,${source}`;
const { runContentValidationCli } = await import(moduleUrl);

const exitCode = await runContentValidationCli(process.argv.slice(2));
process.exit(exitCode);
