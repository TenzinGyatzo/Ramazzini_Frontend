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

describe('ponerDocumentoGuardado (el documento recién guardado, ya en la lista al volver)', () => {
  beforeEach(() => setActivePinia(createPinia()));

  const nota = (id: string, fecha: string, extra: object = {}) => ({ _id: id, fechaNotaMedica: fecha, ...extra });

  it('un documento nuevo entra en su año con la clave del expediente', () => {
    const documentos = useDocumentosStore();
    documentos.documentosDeTrabajadorId = 't1' as any;
    documentos.documentsByYear = { 2026: { notasMedicas: [nota('n1', '2026-02-01T12:00:00.000Z')] } } as any;

    const ok = documentos.ponerDocumentoGuardado('notaMedica', 't1', nota('n2', '2026-03-01T12:00:00.000Z'));

    expect(ok).toBe(true);
    expect((documentos.documentsByYear as any)[2026].notasMedicas.map((d: any) => d._id)).toEqual(['n1', 'n2']);
  });

  it('un documento editado reemplaza al anterior, también si cambió de año', () => {
    const documentos = useDocumentosStore();
    documentos.documentosDeTrabajadorId = 't1' as any;
    documentos.documentsByYear = {
      2025: { notasMedicas: [nota('n1', '2025-12-30T12:00:00.000Z', { motivo: 'viejo' })] },
    } as any;

    documentos.ponerDocumentoGuardado('notaMedica', 't1', nota('n1', '2026-01-02T12:00:00.000Z', { motivo: 'nuevo' }));

    expect((documentos.documentsByYear as any)[2025]).toBeUndefined();
    expect((documentos.documentsByYear as any)[2026].notasMedicas).toEqual([
      nota('n1', '2026-01-02T12:00:00.000Z', { motivo: 'nuevo' }),
    ]);
  });

  it('no toca la lista de otro trabajador ni tipos desconocidos', () => {
    const documentos = useDocumentosStore();
    documentos.documentosDeTrabajadorId = 't1' as any;
    documentos.documentsByYear = {} as any;

    expect(documentos.ponerDocumentoGuardado('notaMedica', 't2', nota('n1', '2026-01-02T12:00:00.000Z'))).toBe(false);
    expect(documentos.ponerDocumentoGuardado('desconocido', 't1', { _id: 'x' })).toBe(false);
    expect(documentos.documentsByYear).toEqual({});
  });
});
