import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useDocumentosStore } from '@/stores/documentos';

const externo = (id: string, fecha: string) => ({ _id: id, nombreDocumento: id, fechaDocumento: fecha, extension: '.pdf' });

describe('agregarDocumentos (documentos recién subidos, sin recargar el expediente)', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('los agrega en su año y en orden por fecha, sin repetir', () => {
    const documentos = useDocumentosStore();
    documentos.documentsByYear = { 2026: { documentosExternos: [externo('a', '2026-03-10T12:00:00.000Z')] } } as any;

    const ok = documentos.agregarDocumentos('documentosExternos', [
      externo('b', '2026-01-05T12:00:00.000Z'),
      externo('a', '2026-03-10T12:00:00.000Z'),
      externo('c', '2025-07-01T12:00:00.000Z'),
    ]);

    expect(ok).toBe(true);
    expect((documentos.documentsByYear as any)[2026].documentosExternos.map((d: any) => d._id)).toEqual(['b', 'a']);
    expect((documentos.documentsByYear as any)[2025].documentosExternos.map((d: any) => d._id)).toEqual(['c']);
  });

  it('si alguno no trae id o fecha, no agrega nada y pide recargar', () => {
    const documentos = useDocumentosStore();
    documentos.documentsByYear = {} as any;
    const ok = documentos.agregarDocumentos('documentosExternos', [externo('a', '2026-03-10T12:00:00.000Z'), { _id: 'x' }]);
    expect(ok).toBe(false);
    expect(documentos.documentsByYear).toEqual({});
  });
});

describe('quitarDocumento (al eliminar, sin esperar la recarga)', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('lo quita de su año y tipo, y quita el año si se queda vacío', () => {
    const documentos = useDocumentosStore();
    documentos.documentsByYear = {
      2026: { documentosExternos: [externo('a', '2026-03-10T12:00:00.000Z')], notasMedicas: [{ _id: 'n1' }] },
      2025: { documentosExternos: [externo('b', '2025-03-10T12:00:00.000Z')] },
    } as any;

    documentos.quitarDocumento('a');
    documentos.quitarDocumento('b');
    documentos.quitarDocumento('no-existe');

    expect(documentos.documentsByYear).toEqual({ 2026: { documentosExternos: [], notasMedicas: [{ _id: 'n1' }] } });
  });
});
