import { afterEach, describe, expect, it, vi } from 'vitest';

import DocumentosAPI from '@/api/DocumentosAPI';

import {

  buildExactExpedienteSummaryHtml,

  buildLoadingExpedienteSummaryHtml,

  clearExpedienteConteosCacheForTests,

  EXPEDIENTE_CONTEOS_CACHE_TTL_MS,

  fetchExpedienteConteosCached,

  formatNombreTrabajador,

  getExpedienteResumenBadgeTotal,

  invalidateExpedienteConteosCache,

  peekExpedienteConteosCache,

} from './expedienteResumenTrabajador';



vi.mock('@/api/DocumentosAPI', () => ({

  default: {

    getDocumentosConteos: vi.fn(),

  },

}));



const mockedApi = vi.mocked(DocumentosAPI);



afterEach(() => {

  vi.clearAllMocks();

  clearExpedienteConteosCacheForTests();

});



describe('expedienteResumenTrabajador', () => {

  it('muestra spinner y texto de carga', () => {

    const html = buildLoadingExpedienteSummaryHtml();



    expect(html).toContain('fa-spinner');

    expect(html).toContain('Cargando...');

    expect(html).not.toContain('Vista previa');

  });



  it('construye resumen exacto con documentos y resultados clínicos', () => {

    const html = buildExactExpedienteSummaryHtml({

      conteos: { HistoriaClinica: 2, AptitudPuesto: 1 },

      total: 3,

      resultadosClinicosConteos: { ESPIROMETRIA: 1, EKG: 2 },

      totalResultadosClinicos: 3,

      vinculadosConteos: {},

      totalVinculados: 0,

      fechaUltimaActividad: null,

    });



    expect(html).toContain('Documentos (3)');

    expect(html).toContain('2 Historias Clínicas');

    expect(html).toContain('Resultados clínicos (3)');

    expect(html).toContain('fa-lungs');

    expect(html).toContain('fa-heartbeat');

    expect(html).toContain('1 Espirometría');

    expect(html).toContain('2 EKG');

  });



  it('incluye nombre del trabajador, última actividad y vinculados', () => {

    const html = buildExactExpedienteSummaryHtml(

      {

        conteos: { HistoriaClinica: 1 },

        total: 1,

        resultadosClinicosConteos: {},

        totalResultadosClinicos: 0,

        vinculadosConteos: { Consentimiento: 1, Deteccion: 2 },

        totalVinculados: 3,

        fechaUltimaActividad: '2025-07-01T12:00:00.000Z',

      },

      { nombreTrabajador: 'Juan Pérez García' },

    );



    expect(html).toContain('Expediente — Juan Pérez García');

    expect(html).toContain('Última actividad:');

    expect(html).toContain('Otros registros vinculados (3)');

    expect(html).toContain('Consentimiento');

    expect(html).toContain('Detecciones');

  });



  it('muestra mensaje en estado vacío sin enlace', () => {
    const html = buildExactExpedienteSummaryHtml(
      {
        conteos: {},
        total: 0,
        resultadosClinicosConteos: {},
        totalResultadosClinicos: 0,
        vinculadosConteos: {},
        totalVinculados: 0,
        fechaUltimaActividad: null,
      },
      { nombreTrabajador: 'María López' },
    );

    expect(html).toContain('Sin documentos ni resultados clínicos registrados');
    expect(html).not.toContain('Ir al expediente');
    expect(html).not.toContain('<a ');
  });



  it('formatea nombre del trabajador desde fila', () => {

    const nombre = formatNombreTrabajador({

      nombre: 'Ana',

      primerApellido: 'Ruiz',

      segundoApellido: 'Torres',

    });



    expect(nombre).toContain('Ana');

    expect(nombre).toContain('Ruiz');

  });



  it('calcula total del badge solo con documentos', () => {
    expect(
      getExpedienteResumenBadgeTotal({
        conteos: {},
        total: 4,
        resultadosClinicosConteos: {},
        totalResultadosClinicos: 2,
        vinculadosConteos: {},
        totalVinculados: 1,
        fechaUltimaActividad: null,
      }),
    ).toBe(4);
  });



  it('deduplica solicitudes simultáneas y usa caché', async () => {

    mockedApi.getDocumentosConteos.mockResolvedValue({

      data: {

        conteos: { HistoriaClinica: 1 },

        total: 1,

        resultadosClinicosConteos: {},

        totalResultadosClinicos: 0,

        vinculadosConteos: {},

        totalVinculados: 0,

        fechaUltimaActividad: null,

      },

    } as never);



    const [first, second] = await Promise.all([

      fetchExpedienteConteosCached('worker-1'),

      fetchExpedienteConteosCached('worker-1'),

    ]);



    expect(first.total).toBe(1);

    expect(second).toEqual(first);

    expect(mockedApi.getDocumentosConteos).toHaveBeenCalledTimes(1);



    await fetchExpedienteConteosCached('worker-1');

    expect(mockedApi.getDocumentosConteos).toHaveBeenCalledTimes(1);

  });



  it('invalida caché y vuelve a solicitar conteos', async () => {

    mockedApi.getDocumentosConteos.mockResolvedValue({

      data: {

        conteos: { HistoriaClinica: 1 },

        total: 1,

        resultadosClinicosConteos: {},

        totalResultadosClinicos: 0,

        vinculadosConteos: {},

        totalVinculados: 0,

        fechaUltimaActividad: null,

      },

    } as never);



    await fetchExpedienteConteosCached('worker-3');

    expect(peekExpedienteConteosCache('worker-3')).not.toBeNull();



    invalidateExpedienteConteosCache('worker-3');

    expect(peekExpedienteConteosCache('worker-3')).toBeNull();



    await fetchExpedienteConteosCached('worker-3');

    expect(mockedApi.getDocumentosConteos).toHaveBeenCalledTimes(2);

  });



  it('vuelve a solicitar conteos cuando expira el TTL', async () => {

    vi.useFakeTimers();



    mockedApi.getDocumentosConteos.mockResolvedValue({

      data: {

        conteos: { HistoriaClinica: 1 },

        total: 1,

        resultadosClinicosConteos: {},

        totalResultadosClinicos: 0,

        vinculadosConteos: {},

        totalVinculados: 0,

        fechaUltimaActividad: null,

      },

    } as never);



    await fetchExpedienteConteosCached('worker-2');

    vi.advanceTimersByTime(EXPEDIENTE_CONTEOS_CACHE_TTL_MS + 1);

    await fetchExpedienteConteosCached('worker-2');



    expect(mockedApi.getDocumentosConteos).toHaveBeenCalledTimes(2);



    vi.useRealTimers();

  });

});

