import type { ColorOp } from '@/types/operations';

// Pure pixel math on RGBA bytes (no DOM). Channels are normalized to 0..1,
// clamped after each op and converted back with Math.round. Alpha is untouched.

const BRIGHTNESS = 0;
const CONTRAST = 1;
const SATURATION = 2;
const GRAYSCALE = 3;
const SEPIA = 4;

/** Ops flattened to numbers so the per-pixel loop never touches objects (10x faster). */
function compile(ops: readonly ColorOp[]): { kinds: Uint8Array; params: Float64Array } {
  const kinds = new Uint8Array(ops.length);
  const params = new Float64Array(ops.length);
  ops.forEach((op, i) => {
    switch (op.type) {
      case 'brightness':
        kinds[i] = BRIGHTNESS;
        params[i] = op.value;
        break;
      case 'contrast':
        kinds[i] = CONTRAST;
        params[i] = op.value;
        break;
      case 'saturation':
        kinds[i] = SATURATION;
        params[i] = op.value;
        break;
      case 'filter':
        kinds[i] = op.name === 'grayscale' ? GRAYSCALE : SEPIA;
        params[i] = op.amount;
        break;
    }
  });
  return { kinds, params };
}

/** Applies the colour ops, in array order, to `data` (RGBA bytes) in place. */
export function applyColorOps(data: Uint8ClampedArray, ops: readonly ColorOp[]): void {
  if (ops.length === 0) return;
  const { kinds, params } = compile(ops);
  const count = kinds.length;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i]! / 255;
    let g = data[i + 1]! / 255;
    let b = data[i + 2]! / 255;

    for (let k = 0; k < count; k++) {
      const p = params[k]!;
      switch (kinds[k]) {
        case BRIGHTNESS:
          r *= p;
          g *= p;
          b *= p;
          break;
        case CONTRAST:
          r = (r - 0.5) * p + 0.5;
          g = (g - 0.5) * p + 0.5;
          b = (b - 0.5) * p + 0.5;
          break;
        case SATURATION: {
          const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          r = l + (r - l) * p;
          g = l + (g - l) * p;
          b = l + (b - l) * p;
          break;
        }
        case GRAYSCALE: {
          const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          r += (l - r) * p;
          g += (l - g) * p;
          b += (l - b) * p;
          break;
        }
        case SEPIA: {
          const sr = 0.393 * r + 0.769 * g + 0.189 * b;
          const sg = 0.349 * r + 0.686 * g + 0.168 * b;
          const sb = 0.272 * r + 0.534 * g + 0.131 * b;
          r += (sr - r) * p;
          g += (sg - g) * p;
          b += (sb - b) * p;
          break;
        }
      }
      // Clamp after every op.
      r = r < 0 ? 0 : r > 1 ? 1 : r;
      g = g < 0 ? 0 : g > 1 ? 1 : g;
      b = b < 0 ? 0 : b > 1 ? 1 : b;
    }

    data[i] = Math.round(r * 255);
    data[i + 1] = Math.round(g * 255);
    data[i + 2] = Math.round(b * 255);
  }
}
