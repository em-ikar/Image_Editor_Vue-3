import { describe, expect, it } from 'vitest';
import { opsToState, serializeEdits, stateToOps, type EditState } from '@/services/editDocument';
import { DEFAULT_ADJUSTMENTS } from '@/services/imageFilters';
import type { EditSource } from '@/types/operations';

const source: EditSource = { name: 'photo.jpg', width: 4000, height: 3000, sha256: 'abc123' };

function state(overrides: Partial<EditState> = {}): EditState {
  return { adjustments: { ...DEFAULT_ADJUSTMENTS }, filter: 'none', crop: null, ...overrides };
}

describe('serializeEdits', () => {
  it('omits neutral operations', () => {
    expect(serializeEdits({ ...state(), source }).operations).toEqual([]);
    expect(
      serializeEdits({ ...state({ crop: { x: 0, y: 0, width: 4000, height: 3000 } }), source }).operations,
    ).toEqual([]);
  });

  it('writes operations in canonical order regardless of edit order', () => {
    const doc = serializeEdits({
      ...state({
        adjustments: { brightness: 10, contrast: -20, saturation: 50 },
        filter: 'sepia',
        crop: { x: 100, y: 50, width: 800, height: 600 },
      }),
      source,
    });

    expect(doc.operations.map((op) => op.type)).toEqual([
      'crop',
      'brightness',
      'contrast',
      'saturation',
      'filter',
    ]);
  });

  it('converts the UI scale to the model and keeps crop in natural pixels', () => {
    const doc = serializeEdits({
      ...state({
        adjustments: { brightness: 57, contrast: -100, saturation: 0 },
        filter: 'grayscale',
        crop: { x: 100, y: 50, width: 800, height: 600 },
      }),
      source,
    });

    expect(doc).toEqual({
      version: 1,
      source,
      operations: [
        { type: 'crop', x: 100, y: 50, width: 800, height: 600 },
        { type: 'brightness', value: 1.57 },
        { type: 'contrast', value: 0 },
        { type: 'filter', name: 'grayscale', amount: 1 },
      ],
    });
  });

  it('round-trips through JSON', () => {
    const doc = serializeEdits({
      ...state({ adjustments: { brightness: 33, contrast: 7, saturation: -41 }, filter: 'sepia' }),
      source,
    });

    expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
  });
});

describe('opsToState', () => {
  it('is the inverse of stateToOps', () => {
    const original = state({
      adjustments: { brightness: 57, contrast: -100, saturation: 12 },
      filter: 'grayscale',
      crop: { x: 100, y: 50, width: 800, height: 600 },
    });

    expect(opsToState(stateToOps(original, source))).toEqual(original);
    expect(opsToState([])).toEqual(state());
  });
});
