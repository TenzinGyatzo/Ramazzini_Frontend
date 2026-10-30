import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useDocumentosStore } from '@/stores/documentos';
import {
  inicioResumenState,
  readInicioHoyListCache,
  writeInicioHoyListCache,
} from '@/composables/inicioResumenCache';
import DocumentosAPI from '@/api/DocumentosAPI';

vi.mock('@/api/DocumentosAPI', () => ({
  default: {
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    uploadExternalDocument: vi.fn(),
    deleteDocumentById: vi.fn(),
    finalizarDocumento: vi.fn(),
  },
}));

const api = DocumentosAPI as unknown as Record<string, ReturnType<typeof vi.fn>>;
const resumen = { hasActivity: true } as never;

describe('Inicio tras cambiar un documento', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    for (const fn of Object.values(api)) fn.mockResolvedValue({ data: {} });
    inicioResumenState.resumen.value = resumen;
    inicioResumenState.lastFetchedAt.value = Date.now();
    writeInicioHoyListCache('lista', ['fila']);
  });

  const acciones: [string, (s: ReturnType<typeof useDocumentosStore>) => Promise<unknown>][] = [
    ['crear', (s) => s.createDocument('aptitud', 't1', {})],
    ['editar', (s) => s.updateDocument('aptitud', 't1', 'd1', {})],
    ['subir un documento externo', (s) => s.uploadExternalDocument('t1', new FormData())],
    ['eliminar', (s) => s.deleteDocumentById('aptitud', 't1', 'd1')],
    ['finalizar', (s) => s.finalizarDocumento('aptitud', 't1', 'd1')],
  ];

  it.each(acciones)('al %s se vuelve a pedir, sin quitar lo que se ve', async (_, accion) => {
    await accion(useDocumentosStore());

    expect(inicioResumenState.lastFetchedAt.value).toBeNull();
    expect(inicioResumenState.resumen.value).toEqual(resumen);
    expect(readInicioHoyListCache('lista')).toBeNull();
  });

  it('si el guardado falla, Inicio no cambia', async () => {
    api.createDocument.mockRejectedValue(new Error('sin conexión'));
    const antes = inicioResumenState.lastFetchedAt.value;

    await expect(useDocumentosStore().createDocument('aptitud', 't1', {})).rejects.toThrow();

    expect(inicioResumenState.lastFetchedAt.value).toBe(antes);
  });
});
