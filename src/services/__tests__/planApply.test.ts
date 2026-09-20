import { describe, expect, it } from 'vitest';
import { planApply } from '@/services/planApply';
import type { EditDocument } from '@/types/operations';

const sha = 'a'.repeat(64);
const image = { width: 4000, height: 3000, sha256: sha };

function doc(operations: EditDocument['operations'], sourceSha = sha): EditDocument {
  return { version: 1, source: { name: 'photo.jpg', width: 4000, height: 3000, sha256: sourceSha }, operations };
}

describe('planApply', () => {
  it('applies the operations unchanged when the hash matches', () => {
    const operations: EditDocument['operations'] = [
      { type: 'crop', x: 420, y: 180, width: 2400, height: 1600 },
      { type: 'brightness', value: 1.15 },
      { type: 'filter', name: 'sepia', amount: 1 },
    ];
    expect(planApply(doc(operations), image)).toEqual({ ops: operations, warnings: [], sourceMatches: true });
  });

  it('compares the hash case-insensitively', () => {
    expect(planApply(doc([], sha.toUpperCase()), image).sourceMatches).toBe(true);
  });

  it('reports a mismatch when the hash differs', () => {
    const plan = planApply(doc([{ type: 'brightness', value: 1.2 }], 'b'.repeat(64)), image);
    expect(plan.sourceMatches).toBe(false);
    expect(plan.ops).toEqual([{ type: 'brightness', value: 1.2 }]);
    expect(plan.warnings).toEqual([]);
  });

  it('clamps a crop that is partly outside the image and warns', () => {
    const small = { width: 1000, height: 800, sha256: 'c'.repeat(64) };
    const plan = planApply(doc([{ type: 'crop', x: 800, y: 600, width: 500, height: 500 }]), small);
    expect(plan.sourceMatches).toBe(false);
    expect(plan.ops).toEqual([{ type: 'crop', x: 800, y: 600, width: 200, height: 200 }]);
    expect(plan.warnings).toHaveLength(1);
    expect(plan.warnings[0]).toMatch(/clamped to Crop 200 × 200 at 800, 600/);
  });

  it('drops a crop that does not overlap the image and warns', () => {
    const small = { width: 1000, height: 800, sha256: 'c'.repeat(64) };
    const plan = planApply(
      doc([
        { type: 'crop', x: 2000, y: 2000, width: 500, height: 500 },
        { type: 'brightness', value: 1.3 },
      ]),
      small,
    );
    expect(plan.ops).toEqual([{ type: 'brightness', value: 1.3 }]);
    expect(plan.warnings).toEqual([expect.stringMatching(/does not overlap the loaded image \(1000 × 800\).*dropped/)]);
  });

  it('drops a crop that ends up covering the whole image (neutral) without a warning', () => {
    const plan = planApply(doc([{ type: 'crop', x: 0, y: 0, width: 4000, height: 3000 }]), image);
    expect(plan.ops).toEqual([]);
    expect(plan.warnings).toEqual([]);
  });

  it('drops neutral operations', () => {
    const plan = planApply(
      doc([
        { type: 'brightness', value: 1 },
        { type: 'filter', name: 'sepia', amount: 0 },
      ]),
      image,
    );
    expect(plan.ops).toEqual([]);
  });

  it('rounds values to the slider step and warns', () => {
    const plan = planApply(doc([{ type: 'brightness', value: 1.155 }]), image);
    expect(plan.ops).toEqual([{ type: 'brightness', value: 1.16 }]);
    expect(plan.warnings).toEqual([expect.stringMatching(/Brightness 1\.155 was rounded to 1\.16/)]);
  });
});
