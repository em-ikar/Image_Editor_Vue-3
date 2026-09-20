import { applyColorOps } from '@/render/colorOps';
import type { ColorOp, CropRect, Op } from '@/types/operations';

export type RenderSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

/** Longest side of the downscaled copy the live preview renders from. */
export const PREVIEW_MAX_SIDE = 2048;

function sourceSize(source: RenderSource): { width: number; height: number } {
  return source instanceof HTMLImageElement
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : { width: source.width, height: source.height };
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is not supported in this browser.');
  return ctx;
}

/**
 * The single render function used by the live preview and by export:
 * crop (if any) → one pass of colour ops in array order. Never touches `source`.
 */
export function render(source: RenderSource, ops: readonly Op[], target: HTMLCanvasElement): void {
  const size = sourceSize(source);
  let crop: CropRect = { x: 0, y: 0, ...size };
  const colorOps: ColorOp[] = [];
  for (const op of ops) {
    if (op.type === 'crop') crop = { x: op.x, y: op.y, width: op.width, height: op.height };
    else colorOps.push(op);
  }

  // Assigning width/height clears the canvas, so only do it when the size changes.
  if (target.width !== crop.width) target.width = crop.width;
  if (target.height !== crop.height) target.height = crop.height;

  const ctx = context2d(target);
  ctx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  if (colorOps.length === 0) return;

  const pixels = ctx.getImageData(0, 0, crop.width, crop.height);
  applyColorOps(pixels.data, colorOps);
  ctx.putImageData(pixels, 0, 0);
}

/**
 * Crops (optionally) and downscales the original once, so the live preview
 * doesn't run per-pixel math on a full-resolution image on every slider tick.
 */
export function makePreviewBase(
  original: HTMLImageElement,
  crop: CropRect | null = null,
  maxSide = PREVIEW_MAX_SIDE,
): HTMLCanvasElement {
  const size = sourceSize(original);
  const area = crop ?? { x: 0, y: 0, ...size };
  const scale = Math.min(1, maxSide / Math.max(area.width, area.height));

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(area.width * scale));
  canvas.height = Math.max(1, Math.round(area.height * scale));

  const ctx = context2d(canvas);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(original, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}
