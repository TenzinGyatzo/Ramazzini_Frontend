import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/lib/attachAuthToken', () => ({ authRequestConfig: () => ({}) }));
vi.mock('@/api/DocumentosAPI', () => ({
  default: { getDocumentById: vi.fn(), updateDocument: vi.fn() },
}));

import axios from 'axios';
import { generarInformePdf } from '@/composables/useGenerarInformePdf';
import { usePdfGenerationStore } from '@/stores/pdfGeneration';

const opciones = {
  tipo: 'notaMedica',
  empresaId: 'e1',
  trabajadorId: 't1',
  documentoId: 'd1',
  userId: 'u1',
};

describe('generarInformePdf', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(axios.get).mockReset();
  });

  it('pide el PDF de inmediato y, al responder el servidor, lo marca listo', async () => {
    const store = usePdfGenerationStore();
    let responder: () => void = () => undefined;
    vi.mocked(axios.get).mockImplementation(
      () => new Promise((resolver) => (responder = () => resolver({ data: {} }))),
    );

    const trabajo = generarInformePdf(opciones);
    // Sin petición previa para marcar «generando»: la del PDF sale de inmediato
    await Promise.resolve();
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(vi.mocked(axios.get).mock.calls[0][0]).toContain('/informes/notaMedica/e1/t1/d1/u1');
    expect(store.isLocalGenerating('d1')).toBe(true);

    responder();
    await trabajo;
    expect(store.isLocalGenerating('d1')).toBe(false);
    expect(store.isLocalReady('d1')).toBe(true);
  });

  it('si falla, deja de mostrarlo «generando» sin marcarlo listo', async () => {
    const store = usePdfGenerationStore();
    vi.mocked(axios.get).mockRejectedValue(new Error('500'));

    await expect(generarInformePdf(opciones)).rejects.toThrow('500');
    expect(store.isLocalGenerating('d1')).toBe(false);
    expect(store.isLocalReady('d1')).toBe(false);
  });
});
