import { onBeforeUnmount, onMounted, watch, type ShallowRef } from 'vue';
import { storeToRefs } from 'pinia';
import { useEditorStore } from '@/stores/editor';
import { makePreviewBase, render } from '@/render/render';
import type { ColorOp } from '@/types/operations';

/**
 * Draws the live preview onto `canvas` through the shared `render()`.
 * Works on downscaled copies of the original (rebuilt only when the image or
 * crop changes) and coalesces slider ticks into one render per animation frame.
 */
export function usePreviewRender(canvas: Readonly<ShallowRef<HTMLCanvasElement | null>>) {
  const { image, crop, ops, showOriginal } = storeToRefs(useEditorStore());

  let fullBase: HTMLCanvasElement | null = null; // whole image, for "View original"
  let fullBaseFor: HTMLImageElement | null = null;
  let workBase: HTMLCanvasElement | null = null; // crop applied
  let frame = 0;

  function rebuildBases() {
    const img = image.value;
    if (img !== fullBaseFor) {
      fullBase = img ? makePreviewBase(img) : null;
      fullBaseFor = img;
    }
    workBase = !img ? null : crop.value ? makePreviewBase(img, crop.value) : fullBase;
  }

  function draw() {
    frame = 0;
    const target = canvas.value;
    const base = showOriginal.value ? fullBase : workBase;
    if (!target || !base) return;
    // The crop is already baked into the base, so only colour ops remain.
    const colorOps = showOriginal.value ? [] : ops.value.filter((op): op is ColorOp => op.type !== 'crop');
    render(base, colorOps, target);
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  rebuildBases();
  watch([image, crop], () => {
    rebuildBases();
    schedule();
  });
  watch([ops, showOriginal], schedule);

  onMounted(schedule);
  onBeforeUnmount(() => cancelAnimationFrame(frame));
}
