export type FilterId = 'none' | 'grayscale' | 'sepia';

export interface Adjustments {
  brightness: number; // -100..100, 0 = unchanged
  contrast: number; // -100..100, 0 = unchanged
  saturation: number; // -100..100, 0 = unchanged
}

export const ADJUSTMENT_RANGE = { min: -100, max: 100, step: 1 } as const;

export const DEFAULT_ADJUSTMENTS: Readonly<Adjustments> = Object.freeze({
  brightness: 0,
  contrast: 0,
  saturation: 0,
});

export const FILTERS: ReadonlyArray<{ id: FilterId; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'grayscale', label: 'Greyscale' },
  { id: 'sepia', label: 'Sepia' },
];

const FILTER_CSS: Record<FilterId, string> = {
  none: '',
  grayscale: 'grayscale(100%)',
  sepia: 'sepia(100%)',
};

function factor(value: number): number {
  return 1 + value / 100;
}

/** Single source of truth for preview (style.filter) AND export (ctx.filter). */
export function buildCssFilter(a: Adjustments, filter: FilterId): string {
  const parts = [
    `brightness(${factor(a.brightness)})`,
    `contrast(${factor(a.contrast)})`,
    `saturate(${factor(a.saturation)})`,
    FILTER_CSS[filter],
  ].filter(Boolean);
  return parts.join(' ');
}

export function isDefault(a: Adjustments, filter: FilterId): boolean {
  return (
    a.brightness === DEFAULT_ADJUSTMENTS.brightness &&
    a.contrast === DEFAULT_ADJUSTMENTS.contrast &&
    a.saturation === DEFAULT_ADJUSTMENTS.saturation &&
    filter === 'none'
  );
}

export function formatAdjustment(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}
