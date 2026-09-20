import { describe, expect, it } from 'vitest';
import { parseEditDocument, parseEditDocumentText } from '@/services/parseEditDocument';

const sha = 'a'.repeat(64);

function validDoc() {
  return {
    version: 1,
    source: { name: 'photo.jpg', width: 4000, height: 3000, sha256: sha },
    operations: [
      { type: 'crop', x: 420, y: 180, width: 2400, height: 1600 },
      { type: 'brightness', value: 1.15 },
      { type: 'contrast', value: 0.8 },
      { type: 'saturation', value: 1.5 },
      { type: 'filter', name: 'sepia', amount: 1 },
    ],
  };
}

function errorsOf(input: unknown): string[] {
  const result = parseEditDocument(input);
  if (result.ok) throw new Error('expected the document to be rejected');
  return result.errors;
}

describe('parseEditDocument', () => {
  it('accepts a valid document', () => {
    const input = validDoc();
    const result = parseEditDocument(input);
    expect(result).toEqual({ ok: true, doc: input });
  });

  it('accepts an empty operations list', () => {
    expect(parseEditDocument({ ...validDoc(), operations: [] }).ok).toBe(true);
  });

  it('rejects text that is not valid JSON', () => {
    const result = parseEditDocumentText('{ not json');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]).toMatch(/not valid JSON/);
  });

  it('rejects input that is not an object', () => {
    expect(errorsOf([])).toEqual(['The file must contain a JSON object.']);
    expect(errorsOf(null)).toEqual(['The file must contain a JSON object.']);
  });

  it('rejects a version other than 1', () => {
    expect(errorsOf({ ...validDoc(), version: 2 })).toEqual([expect.stringContaining('version must be 1')]);
    expect(errorsOf({ ...validDoc(), version: undefined })[0]).toMatch(/version must be 1/);
  });

  it('rejects a missing or malformed source', () => {
    expect(errorsOf({ ...validDoc(), source: undefined })[0]).toMatch(/source is missing/);
    const bad = { ...validDoc(), source: { name: '', width: 0, height: 1.5, sha256: 'xyz' } };
    const errors = errorsOf(bad);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('source.name'),
        expect.stringContaining('source.sha256'),
        expect.stringContaining('source.width'),
        expect.stringContaining('source.height'),
      ]),
    );
  });

  it('rejects an unknown operation type', () => {
    const doc = { ...validDoc(), operations: [{ type: 'blur', value: 3 }] };
    expect(errorsOf(doc)[0]).toMatch(/operations\[0\]\.type is unknown/);
  });

  it('rejects missing, non-numeric and non-finite fields', () => {
    const doc = {
      ...validDoc(),
      operations: [
        { type: 'brightness' },
        { type: 'contrast', value: '1.2' },
        { type: 'saturation', value: Number.NaN },
      ],
    };
    const errors = errorsOf(doc);
    expect(errors).toHaveLength(3);
    expect(errors[0]).toMatch(/operations\[0\]\.value must be a finite number/);
    expect(errors[1]).toMatch(/operations\[1\]\.value must be a finite number/);
    expect(errors[2]).toMatch(/operations\[2\]\.value must be a finite number/);
    expect(errorsOf({ ...validDoc(), operations: [{ type: 'brightness', value: Infinity }] })).toHaveLength(1);
  });

  it('rejects an operation type that appears more than once', () => {
    const doc = {
      ...validDoc(),
      operations: [
        { type: 'brightness', value: 1.1 },
        { type: 'brightness', value: 1.2 },
      ],
    };
    expect(errorsOf(doc)).toEqual([expect.stringMatching(/"brightness" appears more than once/)]);
    const twoFilters = [
      { type: 'filter', name: 'sepia', amount: 1 },
      { type: 'filter', name: 'grayscale', amount: 1 },
    ];
    expect(errorsOf({ ...validDoc(), operations: twoFilters })[0]).toMatch(/"filter" appears more than once/);
  });

  it('rejects operations that are not in canonical order and says which order v1 requires', () => {
    const doc = {
      ...validDoc(),
      operations: [
        { type: 'contrast', value: 1.2 },
        { type: 'brightness', value: 1.1 },
      ],
    };
    const errors = errorsOf(doc);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/out of order/);
    expect(errors[0]).toMatch(/crop → brightness → contrast → saturation → filter/);
  });

  it('rejects values outside the slider range', () => {
    for (const value of [-0.01, 2.01]) {
      const doc = { ...validDoc(), operations: [{ type: 'brightness', value }] };
      expect(errorsOf(doc)[0]).toMatch(/between 0 and 2/);
    }
    expect(parseEditDocument({ ...validDoc(), operations: [{ type: 'brightness', value: 0 }] }).ok).toBe(true);
    expect(parseEditDocument({ ...validDoc(), operations: [{ type: 'brightness', value: 2 }] }).ok).toBe(true);
  });

  it('rejects filter amounts other than 0 or 1 and unknown filter names', () => {
    const half = { ...validDoc(), operations: [{ type: 'filter', name: 'sepia', amount: 0.5 }] };
    expect(errorsOf(half)[0]).toMatch(/amount must be 0 or 1/);
    const unknown = { ...validDoc(), operations: [{ type: 'filter', name: 'invert', amount: 1 }] };
    expect(errorsOf(unknown)[0]).toMatch(/name must be/);
  });

  it('rejects crops with non-positive size or non-integer / negative coordinates', () => {
    const crop = (patch: object) => ({
      ...validDoc(),
      operations: [{ type: 'crop', x: 0, y: 0, width: 100, height: 100, ...patch }],
    });
    expect(errorsOf(crop({ width: 0 }))[0]).toMatch(/operations\[0\]\.width must be at least 1/);
    expect(errorsOf(crop({ height: -5 }))[0]).toMatch(/operations\[0\]\.height must be at least 1/);
    expect(errorsOf(crop({ x: 1.5 }))[0]).toMatch(/operations\[0\]\.x must be an integer/);
    expect(errorsOf(crop({ y: -1 }))[0]).toMatch(/operations\[0\]\.y must be 0 or greater/);
    expect(errorsOf(crop({ width: 10.5 }))[0]).toMatch(/operations\[0\]\.width must be an integer/);
  });

  it('collects every error instead of stopping at the first', () => {
    const doc = {
      version: 3,
      source: null,
      operations: [
        { type: 'saturation', value: 5 },
        { type: 'crop', x: 0.5, y: 0, width: 0, height: 10 },
        { type: 'nope' },
      ],
    };
    expect(errorsOf(doc).length).toBeGreaterThanOrEqual(5);
  });
});
