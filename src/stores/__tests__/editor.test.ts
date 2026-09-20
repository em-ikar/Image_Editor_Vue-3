import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useEditorStore } from '@/stores/editor';
import { serializeEdits } from '@/services/editDocument';
import type { EditDocument } from '@/types/operations';

const sha = 'a'.repeat(64);

function fileOf(doc: unknown, name = 'photo-edited.ops.json'): File {
  return new File([typeof doc === 'string' ? doc : JSON.stringify(doc)], name, { type: 'application/json' });
}

function loadImage(store: ReturnType<typeof useEditorStore>, sha256 = sha) {
  store.original = { name: 'photo.jpg', type: 'image/jpeg', url: 'blob:test', width: 4000, height: 3000, sha256 };
}

const doc: EditDocument = {
  version: 1,
  source: { name: 'photo.jpg', width: 4000, height: 3000, sha256: sha },
  operations: [
    { type: 'crop', x: 420, y: 180, width: 2400, height: 1600 },
    { type: 'brightness', value: 1.15 },
    { type: 'contrast', value: 0.7 },
    { type: 'saturation', value: 1.4 },
    { type: 'filter', name: 'grayscale', amount: 1 },
  ],
};

describe('editor store: importing operations', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('round-trips: applying a matching document and serializing gives the same document', async () => {
    const store = useEditorStore();
    loadImage(store);
    await store.loadOperationsFile(fileOf(doc));
    expect(store.importErrors).toEqual([]);
    expect(store.importPlan?.sourceMatches).toBe(true);

    store.applyOperations();

    expect(store.ops).toEqual(doc.operations);
    expect(store.adjustments).toEqual({ brightness: 15, contrast: -30, saturation: 40 });
    expect(store.filter).toBe('grayscale');
    expect(store.crop).toEqual({ x: 420, y: 180, width: 2400, height: 1600 });
    expect(
      serializeEdits({
        source: { name: 'photo.jpg', width: 4000, height: 3000, sha256: sha },
        adjustments: store.adjustments,
        filter: store.filter,
        crop: store.crop,
      }),
    ).toEqual(doc);
    expect(store.importResult).toEqual({ warnings: [] });
  });

  it('replaces the current edits instead of stacking them', async () => {
    const store = useEditorStore();
    loadImage(store);
    store.setAdjustment('brightness', 60);
    store.setAdjustment('saturation', -20);
    store.setFilter('sepia');

    await store.loadOperationsFile(fileOf({ ...doc, operations: [{ type: 'contrast', value: 1.5 }] }));
    store.applyOperations();

    expect(store.adjustments).toEqual({ brightness: 0, contrast: 50, saturation: 0 });
    expect(store.filter).toBe('none');
    expect(store.crop).toBeNull();
  });

  it('keeps the loaded document when another image is loaded and recomputes the match', async () => {
    const store = useEditorStore();
    loadImage(store);
    await store.loadOperationsFile(fileOf(doc));
    expect(store.importPlan?.sourceMatches).toBe(true);

    store.dispose();
    expect(store.importedDoc).toEqual(doc);
    expect(store.importPlan).toBeNull();

    loadImage(store, 'b'.repeat(64));
    expect(store.importPlan?.sourceMatches).toBe(false);
  });

  it('can load a document before any image and clears it on request', async () => {
    const store = useEditorStore();
    await store.loadOperationsFile(fileOf(doc));
    expect(store.hasImage).toBe(false);
    expect(store.importedDoc).toEqual(doc);
    expect(store.importPlan).toBeNull();

    store.applyOperations(); // no image: nothing happens
    expect(store.importResult).toBeNull();

    store.clearOperations();
    expect(store.importedDoc).toBeNull();
    expect(store.importedFileName).toBeNull();
  });

  it('keeps every validation error and drops the previously loaded document', async () => {
    const store = useEditorStore();
    await store.loadOperationsFile(fileOf(doc));
    await store.loadOperationsFile(fileOf({ version: 2, source: null, operations: [{ type: 'blur' }] }, 'bad.json'));

    expect(store.importedDoc).toBeNull();
    expect(store.importedFileName).toBe('bad.json');
    expect(store.importErrors.length).toBeGreaterThanOrEqual(3);

    await store.loadOperationsFile(fileOf('{ nope', 'broken.json'));
    expect(store.importErrors).toEqual([expect.stringMatching(/not valid JSON/)]);
  });

  it('stays on the Operations tab when resetting, but leaves crop mode', () => {
    const store = useEditorStore();
    store.setMode('operations');
    store.resetAll();
    expect(store.mode).toBe('operations');

    store.setMode('crop');
    store.resetAll();
    expect(store.mode).toBe('adjust');
  });
});
