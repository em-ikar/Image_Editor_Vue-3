export type AspectId = 'free' | 'original' | 'square' | '4:3' | '16:9' | 'a4';

export interface AspectOption {
  id: AspectId;
  label: string;
  ratio: number | null; // null = free, or depends on the loaded image ('original')
}

export const ASPECT_RATIOS: ReadonlyArray<AspectOption> = [
  { id: 'free', label: 'Free', ratio: null },
  { id: 'original', label: 'Original', ratio: null },
  { id: 'square', label: '1:1', ratio: 1 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: 'a4', label: 'A4', ratio: 210 / 297 },
];

/** Resolves an aspect id to a numeric ratio for `<cropper-selection aspect-ratio>` (NaN = free). */
export function resolveAspectRatio(id: AspectId, originalRatio: number): number {
  if (id === 'free') return Number.NaN;
  if (id === 'original') return originalRatio;
  return ASPECT_RATIOS.find((option) => option.id === id)?.ratio ?? Number.NaN;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** A readable ratio label for the loaded image, e.g. "3:2", used for the "Original" chip. */
export function formatRatioLabel(width: number, height: number): string {
  const divisor = gcd(width, height) || 1;
  const w = width / divisor;
  const h = height / divisor;
  if (w <= 32 && h <= 32) return `${w}:${h}`;
  return `${(width / height).toFixed(2)}:1`;
}
