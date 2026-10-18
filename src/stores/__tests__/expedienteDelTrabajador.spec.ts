import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const pendientes: Record<string, Array<(valor: unknown) => void>> = {};
const esperar = (clave: string) =>
  new Promise((resolve) => {
    (pendientes[clave] ??= []).push(resolve);
  });
const responder = (clave: string, valor: unknown) => pendientes[clave]?.shift()?.(valor);

vi.mock('@/api/DocumentosAPI', () => ({
  default: {
    getAllDocuments: (id: string) => esperar(`docs:${id}`),
    getOrganizacion: async () => ({ data: {} }),
  },
}));
vi.mock('@/api/ResultadosClinicosAPI', () => ({
  default: { getByTrabajadorGrouped: (id: string) => esperar(`res:${id}`) },
}));

const { useDocumentosStore } = await import('@/stores/documentos');
const { useResultadosClinicosStore } = await import('@/stores/resultadosClinicos');

const notaDe = (id: string) => ({ _id: id, fechaNotaMedica: '2026-03-10T12:00:00.000Z' });
const pausa = () => new Promise((r) => setTimeout(r, 0));

describe('expediente: documentos y resultados del trabajador correcto', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('al pedir los documentos de otro trabajador, los del anterior desaparecen de inmediato', async () => {
    const documentos = useDocumentosStore();
    const cargaA = documentos.fetchAllDocuments('A');
    responder('docs:A', { data: { notasMedicas: [notaDe('nA')] } });
    await cargaA;
    expect(documentos.documentosDeTrabajadorId).toBe('A');
    expect(Object.keys(documentos.documentsByYear)).toEqual(['2026']);

    const cargaB = documentos.fetchAllDocuments('B');
    expect(documentos.documentsByYear).toEqual({});
    expect(documentos.documentosDeTrabajadorId).toBeNull();

    responder('docs:B', { data: {} });
    await cargaB;
    expect(documentos.documentosDeTrabajadorId).toBe('B');
    expect(documentos.documentsByYear).toEqual({});
  });

  it('recargar al mismo trabajador conserva lo que se ve mientras llega la respuesta', async () => {
    const documentos = useDocumentosStore();
    const carga = documentos.fetchAllDocuments('A');
    responder('docs:A', { data: { notasMedicas: [notaDe('nA')] } });
    await carga;

    const recarga = documentos.fetchAllDocuments('A');
    expect(Object.keys(documentos.documentsByYear)).toEqual(['2026']);
    expect(documentos.documentosDeTrabajadorId).toBe('A');
    responder('docs:A', { data: { notasMedicas: [notaDe('nA')] } });
    await recarga;
  });

  it('una respuesta lenta de resultados de A no reemplaza los de B', async () => {
    const resultados = useResultadosClinicosStore();
    const cargaA = resultados.fetchResultadosAgrupados('A');
    const cargaB = resultados.fetchResultadosAgrupados('B');

    responder('res:B', { data: {} });
    await cargaB;
    expect(resultados.resultadosDeTrabajadorId).toBe('B');

    responder('res:A', { data: { 2026: [{ _id: 'rA', idTrabajador: 'A' }] } });
    await cargaA;
    await pausa();
    expect(resultados.resultadosDeTrabajadorId).toBe('B');
    expect(resultados.resultsByYear).toEqual({});
  });

  it('al pedir los resultados de otro trabajador, los del anterior desaparecen de inmediato', async () => {
    const resultados = useResultadosClinicosStore();
    const cargaA = resultados.fetchResultadosAgrupados('A');
    responder('res:A', { data: { 2026: [{ _id: 'rA', idTrabajador: 'A' }] } });
    await cargaA;
    expect(Object.keys(resultados.resultsByYear)).toEqual(['2026']);

    void resultados.fetchResultadosAgrupados('B');
    expect(resultados.resultsByYear).toEqual({});
    expect(resultados.resultadosDeTrabajadorId).toBeNull();
  });
});
