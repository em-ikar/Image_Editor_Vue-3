function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the image for export.'));
    img.src = url;
  });
}

const EXPORTABLE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

/** Renders the working image with the same CSS filter used for the live preview. */
export async function renderToBlob(url: string, cssFilter: string, sourceType?: string): Promise<Blob> {
  const img = await loadImage(url);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser.');

  ctx.filter = cssFilter || 'none';
  ctx.drawImage(img, 0, 0);

  const type = sourceType && EXPORTABLE_TYPES.has(sourceType) ? sourceType : 'image/png';
  const quality = type === 'image/png' ? undefined : 0.92;

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Export failed.'))), type, quality);
  });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function editedFileName(originalName: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(originalName);
  const ext = match?.[1] ?? 'png';
  const base = originalName.replace(/\.[^.]+$/, '');
  return `${base}-edited.${ext}`;
}
