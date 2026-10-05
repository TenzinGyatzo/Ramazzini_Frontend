import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const documentosApi = vi.hoisted(() => ({
  getAptitudInformeVecinos: vi.fn(),
  getHistoriasClinicas: vi.fn(),
  getExploracionesFisicas: vi.fn(),
  getExamenesVista: vi.fn(),
  getAntidopings: vi.fn(),
  getAudiometrias: vi.fn(),
  getEntrevistaPsicologica: vi.fn(),
  getCuestionarioNordico: vi.fn(),
  getEvaluacionSuenoVigilia: vi.fn(),
}));
const resultadosApi = vi.hoisted(() => ({ getByTrabajador: vi.fn() }));

vi.mock('@/api/DocumentosAPI', () => ({ default: documentosApi }));
vi.mock('@/api/ResultadosClinicosAPI', () => ({ default: resultadosApi }));
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {}, params: {} }), useRouter: () => ({ push: vi.fn() }) }));

import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';

/** Promesa que se resuelve a mano, para observar el estado mientras la petición sigue en curso. */
function diferida<T>() {
  let resolver!: (valor: T) => void;
  const promesa = new Promise<T>((r) => (resolver = r));
  return { promesa, resolver };
}

describe('VisualizadorAptitud: carga de documentos', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    Object.values(documentosApi).forEach((fn) => fn.mockReset());
    resultadosApi.getByTrabajador.mockReset();

    (useEmpresasStore() as any).currentEmpresa = { nombreComercial: 'Empresa de prueba' };
    const trabajadores = useTrabajadoresStore() as any;
    trabajadores.currentTrabajadorId = 'trab1';
    trabajadores.currentTrabajador = {
      nombre: 'Ana',
      primerApellido: 'López',
      puesto: 'Operadora',
      sexo: 'Femenino',
      fechaNacimiento: '1992-05-10',
    };
    (useFormDataStore() as any).formDataAptitud.fechaAptitudPuesto = '2026-09-15';
  });

  it('pide todo en dos peticiones simultáneas y llena el resumen al llegar', async () => {
    const vecinos = diferida<{ data: Record<string, unknown[]> }>();
    const resultados = diferida<{ data: unknown[] }>();
    documentosApi.getAptitudInformeVecinos.mockReturnValue(vecinos.promesa);
    resultadosApi.getByTrabajador.mockReturnValue(resultados.promesa);

    const { default: VisualizadorAptitud } = await import('./VisualizadorAptitud.vue');
    const wrapper = mount(VisualizadorAptitud, { global: { stubs: { EstadoDocumentoBadgeAlt: true } } });
    await flushPromises();

    // Las dos salen juntas, sin esperar una a la otra, y no hay una petición por tipo de documento
    expect(documentosApi.getAptitudInformeVecinos).toHaveBeenCalledWith('trab1');
    expect(resultadosApi.getByTrabajador).toHaveBeenCalledWith('trab1');
    expect(documentosApi.getHistoriasClinicas).not.toHaveBeenCalled();
    expect(documentosApi.getAudiometrias).not.toHaveBeenCalled();
    expect(documentosApi.getCuestionarioNordico).not.toHaveBeenCalled();
    expect(wrapper.find('[data-cargando-documentos]').exists()).toBe(true);

    vecinos.resolver({
      data: {
        historiaClinica: [
          { _id: 'h1', fechaHistoriaClinica: '2026-09-01T00:00:00.000Z', resumenHistoriaClinica: 'Sin antecedentes de importancia' },
        ],
        audiometria: [
          {
            _id: 'a1',
            fechaAudiometria: '2026-03-01T00:00:00.000Z',
            diagnosticoAudiometria: 'Audición normal',
            hipoacusiaBilateralCombinada: 0,
          },
        ],
      },
    });
    resultados.resolver({
      data: [
        {
          _id: 'r1',
          tipoEstudio: 'AUDIOMETRIA',
          fechaEstudio: '2026-08-20T00:00:00.000Z',
          resultadoGlobal: 'ANORMAL',
          tipoAlteracionAudiometria: 'HIPOACUSIA_NEUROSENSORIAL',
          gradoHipoacusia: 'MODERADA',
        },
      ],
    });
    await flushPromises();

    expect(wrapper.find('[data-cargando-documentos]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Sin antecedentes de importancia');
    // La externa es posterior a la de Ramazzini: es la que se muestra
    expect(wrapper.find('[data-audiometria-externa]').text()).toContain('Hipoacusia neurosensorial (moderada)');
    expect(wrapper.text()).not.toContain('Audición normal HBC');
  });

  it('si falla una de las dos, la otra se sigue mostrando', async () => {
    documentosApi.getAptitudInformeVecinos.mockRejectedValue(new Error('red'));
    resultadosApi.getByTrabajador.mockResolvedValue({
      data: [{ _id: 'r1', tipoEstudio: 'TIPO_SANGRE', fechaEstudio: '2025-01-10T00:00:00.000Z', tipoSangre: 'O_POS' }],
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { default: VisualizadorAptitud } = await import('./VisualizadorAptitud.vue');
    const wrapper = mount(VisualizadorAptitud, { global: { stubs: { EstadoDocumentoBadgeAlt: true } } });
    await flushPromises();

    expect(wrapper.find('[data-cargando-documentos]').exists()).toBe(false);
    expect(wrapper.text()).toContain('O RH Positivo');
  });
});
