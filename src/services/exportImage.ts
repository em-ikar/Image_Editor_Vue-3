import { render, type RenderSource } from '@/render/render';
import type { EditDocument, Op } from '@/types/operations';

/** Renders the source at full resolution through the shared `render()` and encodes it as PNG. */
export function renderToPngBlob(source: RenderSource, ops: readonly Op[]): Promise<Blob> {
  const canvas = document.createElement('canvas');
  render(source, ops, canvas);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Export failed.'))), 'image/png');
  });
}

export function editDocumentToBlob(doc: EditDocument): Blob {
  return new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  // Revoke later: some browsers start reading the URL asynchronously.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function baseName(originalName: string): string {
  return originalName.replace(/\.[^.]+$/, '');
}

export function editedFileName(originalName: string): string {
  return `${baseName(originalName)}-edited.png`;
}

export function editedOpsFileName(originalName: string): string {
  return `${baseName(originalName)}-edited.ops.json`;
}
