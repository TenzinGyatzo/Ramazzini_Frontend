import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePdfGenerationStore } from '@/stores/pdfGeneration';

describe('pdfGeneration (estado local del PDF)', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('al responder el servidor: deja de estar «generando» y queda listo', () => {
    const store = usePdfGenerationStore();
    store.markLocalGenerating('d1');
    store.markLocalReady('d1');
    expect(store.isLocalGenerating('d1')).toBe(false);
    expect(store.isLocalReady('d1')).toBe(true);
  });

  it('volver a generarlo borra el «listo» anterior; el expediente lo olvida al mostrarlo', () => {
    const store = usePdfGenerationStore();
    store.markLocalReady('d1');
    store.markLocalGenerating('d1');
    expect(store.isLocalReady('d1')).toBe(false);

    store.markLocalReady('d1');
    store.forgetLocalReady('d1');
    expect(store.isLocalReady('d1')).toBe(false);
  });
});
