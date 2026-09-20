import { FACTOR_RANGE } from '@/services/editDocument';
import type { EditDocument, EditSource, Op } from '@/types/operations';

export type ParseResult = { ok: true; doc: EditDocument } | { ok: false; errors: string[] };

// Canonical pipeline order, defined by version 1 of the format.
const OP_ORDER = ['crop', 'brightness', 'contrast', 'saturation', 'filter'] as const;
type OpType = (typeof OP_ORDER)[number];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isOpType = (value: unknown): value is OpType => OP_ORDER.some((type) => type === value);

/** Reads a finite number field; reports and returns null otherwise. */
function readNumber(rec: Record<string, unknown>, key: string, path: string, errors: string[]): number | null {
  const value = rec[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  errors.push(`${path}.${key} must be a finite number.`);
  return null;
}

function readInteger(
  rec: Record<string, unknown>,
  key: string,
  path: string,
  errors: string[],
  min: number,
): number | null {
  const value = readNumber(rec, key, path, errors);
  if (value === null) return null;
  if (!Number.isInteger(value)) {
    errors.push(`${path}.${key} must be an integer (natural pixels), got ${value}.`);
    return null;
  }
  if (value < min) {
    errors.push(`${path}.${key} must be ${min === 0 ? '0 or greater' : `at least ${min}`}, got ${value}.`);
    return null;
  }
  return value;
}

function parseSource(raw: unknown, errors: string[]): EditSource | null {
  if (!isRecord(raw)) {
    errors.push('source is missing or not an object.');
    return null;
  }
  const before = errors.length;
  const { name, sha256 } = raw;
  if (typeof name !== 'string' || name.trim() === '') errors.push('source.name must be a non-empty string.');
  if (typeof sha256 !== 'string' || !/^[0-9a-fA-F]{64}$/.test(sha256)) {
    errors.push('source.sha256 must be a 64-character hex SHA-256.');
  }
  const width = readInteger(raw, 'width', 'source', errors, 1);
  const height = readInteger(raw, 'height', 'source', errors, 1);
  if (errors.length > before || typeof name !== 'string' || typeof sha256 !== 'string') return null;
  if (width === null || height === null) return null;
  return { name, width, height, sha256 };
}

function parseFactor(rec: Record<string, unknown>, path: string, errors: string[]): number | null {
  const value = readNumber(rec, 'value', path, errors);
  if (value === null) return null;
  if (value < FACTOR_RANGE.min || value > FACTOR_RANGE.max) {
    errors.push(`${path}.value must be between ${FACTOR_RANGE.min} and ${FACTOR_RANGE.max} (the slider range), got ${value}.`);
    return null;
  }
  return value;
}

function parseOp(type: OpType, rec: Record<string, unknown>, path: string, errors: string[]): Op | null {
  switch (type) {
    case 'crop': {
      const x = readInteger(rec, 'x', path, errors, 0);
      const y = readInteger(rec, 'y', path, errors, 0);
      const width = readInteger(rec, 'width', path, errors, 1);
      const height = readInteger(rec, 'height', path, errors, 1);
      return x === null || y === null || width === null || height === null
        ? null
        : { type, x, y, width, height };
    }
    case 'brightness':
    case 'contrast':
    case 'saturation': {
      const value = parseFactor(rec, path, errors);
      return value === null ? null : { type, value };
    }
    case 'filter': {
      const { name } = rec;
      const amount = readNumber(rec, 'amount', path, errors);
      if (name !== 'grayscale' && name !== 'sepia') {
        errors.push(`${path}.name must be "grayscale" or "sepia".`);
        return null;
      }
      if (amount === null) return null;
      if (amount !== 0 && amount !== 1) {
        errors.push(`${path}.amount must be 0 or 1 (only full-strength filters are supported), got ${amount}.`);
        return null;
      }
      return { type, name, amount };
    }
  }
}

/** Validates untrusted, already-parsed JSON. Collects every error before rejecting. */
export function parseEditDocument(input: unknown): ParseResult {
  if (!isRecord(input)) return { ok: false, errors: ['The file must contain a JSON object.'] };

  const errors: string[] = [];
  if (input.version !== 1) errors.push(`version must be 1, got ${JSON.stringify(input.version) ?? 'nothing'}.`);
  const source = parseSource(input.source, errors);

  const operations: Op[] = [];
  const raw = input.operations;
  if (!Array.isArray(raw)) {
    errors.push('operations must be an array.');
  } else {
    const seen = new Set<OpType>();
    let highestRank = -1;
    raw.forEach((item: unknown, index) => {
      const path = `operations[${index}]`;
      if (!isRecord(item)) {
        errors.push(`${path} must be an object.`);
        return;
      }
      if (!isOpType(item.type)) {
        errors.push(`${path}.type is unknown: ${JSON.stringify(item.type) ?? 'missing'}. Expected one of ${OP_ORDER.join(', ')}.`);
        return;
      }
      const type = item.type;
      const rank = OP_ORDER.indexOf(type);
      if (seen.has(type)) {
        errors.push(`${path}: "${type}" appears more than once; each operation may appear at most once.`);
      } else if (rank < highestRank) {
        errors.push(
          `${path}: "${type}" is out of order. Version 1 of the format requires ${OP_ORDER.join(' → ')}.`,
        );
      }
      seen.add(type);
      highestRank = Math.max(highestRank, rank);

      const op = parseOp(type, item, path, errors);
      if (op) operations.push(op);
    });
  }

  if (errors.length > 0 || !source) return { ok: false, errors };
  return { ok: true, doc: { version: 1, source, operations } };
}

/** Parses the raw text of an `.ops.json` file. */
export function parseEditDocumentText(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    return { ok: false, errors: [`The file is not valid JSON (${reason}).`] };
  }
  return parseEditDocument(data);
}
