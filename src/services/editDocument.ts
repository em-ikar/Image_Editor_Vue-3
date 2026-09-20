import type { Adjustments, FilterId } from '@/services/imageFilters';
import { ADJUSTMENT_RANGE, DEFAULT_ADJUSTMENTS, FILTERS } from '@/services/imageFilters';
import type { CropRect, EditDocument, EditSource, Op } from '@/types/operations';

/** What the editor keeps: UI-scale adjustments (-100..100), a filter id and an optional crop. */
export interface EditState {
  adjustments: Adjustments;
  filter: FilterId;
  crop: CropRect | null;
}

export function isFullCrop(crop: CropRect, size: { width: number; height: number }): boolean {
  return crop.x === 0 && crop.y === 0 && crop.width === size.width && crop.height === size.height;
}

// The ONE place that converts between the UI scale and the operation model:
// slider value v (-100..100, 0 = unchanged)  <->  factor 1 + v / 100 (1 = neutral).
// Computed as (100 + v) / 100 so the result is the closest double to the decimal.
const toFactor = (ui: number): number => (100 + ui) / 100;
const toUi = (factor: number): number => Math.round(factor * 100 - 100);

/** The factor range the sliders can produce (0..2). */
export const FACTOR_RANGE = { min: toFactor(ADJUSTMENT_RANGE.min), max: toFactor(ADJUSTMENT_RANGE.max) } as const;

/** Snaps a factor to the slider step (0.01), i.e. to what the editor can actually hold. */
export const quantizeFactor = (factor: number): number => toFactor(toUi(factor));

/**
 * Builds the operation list in canonical pipeline order:
 * crop → brightness → contrast → saturation → filter. Neutral ops are omitted.
 */
export function stateToOps(state: EditState, size: { width: number; height: number }): Op[] {
  const ops: Op[] = [];
  const { adjustments, filter, crop } = state;

  if (crop && !isFullCrop(crop, size)) ops.push({ type: 'crop', ...crop });
  if (adjustments.brightness !== 0) ops.push({ type: 'brightness', value: toFactor(adjustments.brightness) });
  if (adjustments.contrast !== 0) ops.push({ type: 'contrast', value: toFactor(adjustments.contrast) });
  if (adjustments.saturation !== 0) ops.push({ type: 'saturation', value: toFactor(adjustments.saturation) });
  if (filter !== 'none') ops.push({ type: 'filter', name: filter, amount: 1 });

  return ops;
}

/** Inverse of `stateToOps`, for replaying a document later. */
export function opsToState(ops: readonly Op[]): EditState {
  const state: EditState = { adjustments: { ...DEFAULT_ADJUSTMENTS }, filter: 'none', crop: null };

  for (const op of ops) {
    switch (op.type) {
      case 'crop':
        state.crop = { x: op.x, y: op.y, width: op.width, height: op.height };
        break;
      case 'brightness':
      case 'contrast':
      case 'saturation':
        state.adjustments[op.type] = toUi(op.value);
        break;
      case 'filter':
        if (op.amount > 0) state.filter = op.name;
        break;
    }
  }

  return state;
}

export function serializeEdits(state: EditState & { source: EditSource }): EditDocument {
  const { source, ...edits } = state;
  return { version: 1, source: { ...source }, operations: stateToOps(edits, source) };
}

const OP_LABELS = { brightness: 'Brightness', contrast: 'Contrast', saturation: 'Saturation' } as const;

/** Human-readable one-liner for an operation, e.g. "Crop 2400 × 1600 at 420, 180". */
export function formatOp(op: Op): string {
  switch (op.type) {
    case 'crop':
      return `Crop ${op.width} × ${op.height} at ${op.x}, ${op.y}`;
    case 'filter': {
      const label = FILTERS.find((item) => item.id === op.name)?.label ?? op.name;
      return `${label} ${Math.round(op.amount * 100)}%`;
    }
    default:
      return `${OP_LABELS[op.type]} ${op.value}`;
  }
}
