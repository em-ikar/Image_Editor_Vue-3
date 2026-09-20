export type FilterName = 'grayscale' | 'sepia';

/** Crop rectangle in the ORIGINAL image's natural pixels (integers). */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CropOp = { type: 'crop' } & CropRect;

export type ColorOp =
  | { type: 'brightness'; value: number } // 1 = neutral
  | { type: 'contrast'; value: number } // 1 = neutral
  | { type: 'saturation'; value: number } // 1 = neutral
  | { type: 'filter'; name: FilterName; amount: number }; // amount 0..1

export type Op = CropOp | ColorOp;

export interface EditSource {
  name: string;
  width: number;
  height: number;
  sha256: string;
}

export interface EditDocument {
  version: 1;
  source: EditSource;
  operations: Op[];
}
