import { formatOp, opsToState, quantizeFactor, stateToOps } from '@/services/editDocument';
import type { CropOp, EditDocument, Op } from '@/types/operations';

export interface ImageInfo {
  width: number;
  height: number;
  sha256: string;
}

export interface ApplyPlan {
  /** What the editor will hold after applying: canonical, neutral ops dropped. */
  ops: Op[];
  warnings: string[];
  sourceMatches: boolean;
}

/** Keeps the crop if it fits, clamps it to the image if it overlaps partly, drops it otherwise. */
function fitCrop(crop: CropOp, image: ImageInfo, warnings: string[]): CropOp | null {
  const left = Math.max(0, crop.x);
  const top = Math.max(0, crop.y);
  const right = Math.min(image.width, crop.x + crop.width);
  const bottom = Math.min(image.height, crop.y + crop.height);
  const size = `${image.width} × ${image.height}`;

  if (right <= left || bottom <= top) {
    warnings.push(`${formatOp(crop)} does not overlap the loaded image (${size}), so the crop was dropped.`);
    return null;
  }

  const fitted: CropOp = { type: 'crop', x: left, y: top, width: right - left, height: bottom - top };
  if (fitted.x !== crop.x || fitted.y !== crop.y || fitted.width !== crop.width || fitted.height !== crop.height) {
    warnings.push(`${formatOp(crop)} extends outside the loaded image (${size}); it was clamped to ${formatOp(fitted)}.`);
  }
  return fitted;
}

/** Decides what applying `doc` to `image` would do. Pure: nothing is changed here. */
export function planApply(doc: EditDocument, image: ImageInfo): ApplyPlan {
  const warnings: string[] = [];
  const ops: Op[] = [];

  for (const op of doc.operations) {
    if (op.type === 'crop') {
      const fitted = fitCrop(op, image, warnings);
      if (fitted) ops.push(fitted);
      continue;
    }
    if (op.type !== 'filter') {
      const snapped = quantizeFactor(op.value);
      if (snapped !== op.value) {
        warnings.push(`${formatOp(op)} was rounded to ${snapped} (slider step 0.01).`);
      }
    }
    ops.push(op);
  }

  // Round-trip through the editor's own state so the plan is exactly what it can hold and render.
  return {
    ops: stateToOps(opsToState(ops), image),
    warnings,
    sourceMatches: doc.source.sha256.toLowerCase() === image.sha256.toLowerCase(),
  };
}
