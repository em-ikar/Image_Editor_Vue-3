import { describe, expect, it } from 'vitest';
import { applyColorOps } from '@/render/colorOps';
import type { ColorOp } from '@/types/operations';

function run(pixel: [number, number, number, number], ...ops: ColorOp[]): number[] {
  const data = new Uint8ClampedArray(pixel);
  applyColorOps(data, ops);
  return Array.from(data);
}

describe('applyColorOps', () => {
  it('returns the input unchanged for neutral values', () => {
    const neutral: ColorOp[] = [
      { type: 'brightness', value: 1 },
      { type: 'contrast', value: 1 },
      { type: 'saturation', value: 1 },
      { type: 'filter', name: 'grayscale', amount: 0 },
      { type: 'filter', name: 'sepia', amount: 0 },
    ];
    // Every channel value, in every position, survives the float round trip.
    const data = new Uint8ClampedArray(256 * 4);
    for (let v = 0; v < 256; v++) data.set([v, 255 - v, (v * 7) % 256, 200], v * 4);
    const expected = Uint8ClampedArray.from(data);

    applyColorOps(data, neutral);

    expect(data).toEqual(expected);
  });

  it('scales channels for brightness', () => {
    expect(run([100, 50, 200, 255], { type: 'brightness', value: 0.5 })).toEqual([50, 25, 100, 255]);
    expect(run([100, 50, 200, 255], { type: 'brightness', value: 0 })).toEqual([0, 0, 0, 255]);
  });

  it('pivots around mid-grey for contrast', () => {
    // 0.2 -> (0.2 - 0.5) * 2 + 0.5 = -0.1 -> clamped to 0; 0.6 -> 0.7
    expect(run([51, 153, 128, 255], { type: 'contrast', value: 2 })).toEqual([0, 179, 129, 255]);
    // contrast 0 collapses everything to mid-grey (0.5 * 255 = 127.5 -> 128)
    expect(run([10, 200, 90, 255], { type: 'contrast', value: 0 })).toEqual([128, 128, 128, 255]);
  });

  it('moves channels away from luminance for saturation', () => {
    expect(run([255, 0, 0, 255], { type: 'saturation', value: 0 })).toEqual([54, 54, 54, 255]); // L = 0.2126
    // Grey has no chroma, so any saturation leaves it alone.
    expect(run([120, 120, 120, 255], { type: 'saturation', value: 2 })).toEqual([120, 120, 120, 255]);
    // L = 0.2126, r = 0.2126 + (1 - 0.2126) * 2 -> clamped to 1; g, b -> negative -> 0
    expect(run([255, 0, 0, 255], { type: 'saturation', value: 2 })).toEqual([255, 0, 0, 255]);
  });

  it('blends towards luminance for grayscale', () => {
    expect(run([255, 0, 0, 255], { type: 'filter', name: 'grayscale', amount: 1 })).toEqual([54, 54, 54, 255]);
    // Half way: 255 + (54.2 - 255) * 0.5 = 154.6 -> 155; 0 + 54.2 * 0.5 = 27.1 -> 27
    expect(run([255, 0, 0, 255], { type: 'filter', name: 'grayscale', amount: 0.5 })).toEqual([155, 27, 27, 255]);
  });

  it('applies the sepia matrix and clamps', () => {
    // White: r_s = 1.351 -> 1, g_s = 1.203 -> 1, b_s = 0.937 -> 239
    expect(run([255, 255, 255, 255], { type: 'filter', name: 'sepia', amount: 1 })).toEqual([255, 255, 239, 255]);
    // Black stays black.
    expect(run([0, 0, 0, 255], { type: 'filter', name: 'sepia', amount: 1 })).toEqual([0, 0, 0, 255]);
  });

  it('clamps after each op, so order matters', () => {
    const bright: ColorOp = { type: 'brightness', value: 2 };
    const dim: ColorOp = { type: 'brightness', value: 0.5 };
    // 200 * 2 -> clamped to 255 -> * 0.5 = 127.5 -> 128 (not 200)
    expect(run([200, 200, 200, 255], bright, dim)).toEqual([128, 128, 128, 255]);
    expect(run([200, 200, 200, 255], dim, bright)).toEqual([200, 200, 200, 255]);
  });

  it('never touches the alpha channel', () => {
    expect(run([10, 20, 30, 77], { type: 'brightness', value: 2 }, { type: 'filter', name: 'sepia', amount: 1 })[3]).toBe(77);
  });
});
