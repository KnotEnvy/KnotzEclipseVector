import Ajv2020 from 'ajv/dist/2020';
import type { ErrorObject } from 'ajv';
import type { ContentValidationIssue } from '@/data/validation';

export type JsonSchema = Record<string, unknown>;

export function validateJsonSchemaValue(
  schema: JsonSchema,
  value: unknown,
  path: string,
): ContentValidationIssue[] {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
  });
  ajv.addFormat('date-time', {
    type: 'string',
    validate: (candidate: string) => !Number.isNaN(Date.parse(candidate)),
  });

  const validate = ajv.compile(schema);
  if (validate(value)) {
    return [];
  }

  return (validate.errors ?? []).map((error) => mapAjvError(error, path));
}

function mapAjvError(error: ErrorObject, rootPath: string): ContentValidationIssue {
  const params = error.params as Record<string, unknown>;
  const instancePath = extendInstancePathForPropertyErrors(
    error.instancePath,
    error.keyword,
    params,
  );

  return {
    path: pathFromJsonPointer(rootPath, instancePath),
    message: error.message ?? `Schema keyword failed: ${error.keyword}.`,
  };
}

function extendInstancePathForPropertyErrors(
  instancePath: string,
  keyword: string,
  params: Record<string, unknown>,
): string {
  if (keyword === 'required' && typeof params.missingProperty === 'string') {
    return `${instancePath}/${escapePointerSegment(params.missingProperty)}`;
  }

  if (keyword === 'additionalProperties' && typeof params.additionalProperty === 'string') {
    return `${instancePath}/${escapePointerSegment(params.additionalProperty)}`;
  }

  return instancePath;
}

function pathFromJsonPointer(rootPath: string, pointer: string): string {
  if (!pointer) {
    return rootPath;
  }

  const segments = pointer
    .split('/')
    .slice(1)
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'));

  return `${rootPath}.${segments.join('.')}`;
}

function escapePointerSegment(segment: string): string {
  return segment.replaceAll('~', '~0').replaceAll('/', '~1');
}
