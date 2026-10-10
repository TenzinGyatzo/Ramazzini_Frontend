import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import IncapacidadesInformeView from './IncapacidadesInformeView.vue';
import IncapacidadesAPI from '@/api/IncapacidadesAPI';
import { exportarInformeExcel } from '@/helpers/incapacidadesInforme';

const EMPRESA = '65f0000000000000000000e1';

vi.mock('@/api/IncapacidadesAPI', () => ({
  default: { getInformeEmpresa: vi.fn() },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { idEmpresa: EMPRESA } }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}));

vi.mock('@/stores/empresas', () => ({
  useEmpresasStore: () => ({
    currentEmpresa: { _id: EMPRESA, nombreComercial: 'Aceros del Norte' },
    fetchEmpresaById: vi.fn(),
  }),
}));

vi.mock('@/helpers/incapacidades', async (original) => ({
  ...(await original<typeof import('@/helpers/incapacidades')>()),
  hoyISO: () => '2026-10-09',
}));

vi.mock('@/helpers/incapacidadesInforme', async (original) => ({
  ...(await original<typeof import('@/helpers/incapacidadesInforme')>()),
  exportarInformeExcel: vi.fn(),
}));

const informe = (cambios: Record<string, unknown> = {}) => ({
  periodo: { desde: '2026-01-01T00:00:00.000Z', hasta: '2026-10-09T00:00:00.000Z', dias: 282 },
  trabajadoresActivos: 40,
  totales: {
    casosNuevos: 3,
    casosPorRamo: { enfermedadGeneral: 2, riesgoTrabajo: 1 },
    riesgosPorTipo: { accidenteTrayecto: 1 },
    dias: { total: 25, subsidiados: 16, sinSubsidio: 6, aCargoEmpresa: 3 },
    diasPorRamo: { enfermedadGeneral: 15, riesgoTrabajo: 10 },
    casosConDias: 3,
    trabajadoresConIncapacidad: 2,
    recaidas: 0,
    incapacidadesPermanentes: 0,
    casosConSecuelas: 1,
    defunciones: 0,
  },
  indicadores: { tasaAusentismo: 0.22, indiceFrecuencia: 0.08, indiceGravedad: 0.63, duracionMedia: 8.33 },
  tendencias: {
    porGrupoDiagnostico: [{ clave: 'respiratorio', casos: 2, dias: 15 }],
    porRegionAnatomica: [{ clave: 'espaldaBaja', casos: 1, dias: 10 }],
    porNaturalezaLesion: [{ clave: 'esguince', casos: 1, dias: 10 }],
    porDuracion: [
      { clave: 'sinIncapacidad', casos: 0 },
      { clave: 'de1a3', casos: 1 },
      { clave: 'de4a7', casos: 0 },
      { clave: 'de8a14', casos: 2 },
      { clave: 'de15a30', casos: 0 },
      { clave: 'de31a90', casos: 0 },
      { clave: 'masDe90', casos: 0 },
    ],
    porPuesto: [{ clave: 'Soldador', casos: 3, dias: 25 }],
    porCentro: [
      { clave: 'c1', casos: 2, dias: 20, trabajadoresActivos: 25 },
      { clave: 'c2', casos: 1, dias: 5, trabajadoresActivos: 15 },
    ],
    porMes: [
      { mes: '2026-01', casos: 2, dias: 12 },
      { mes: '2026-02', casos: 1, dias: 13 },
    ],
    porDiaSemana: [0, 2, 0, 0, 0, 1, 0],
    regionPorPuesto: [{ region: 'espaldaBaja', puesto: 'Soldador', casos: 1 }],
  },
  porTrabajador: [
    {
      idTrabajador: 't1',
      casos: 2,
      dias: 20,
      diasPorRamo: { enfermedadGeneral: 10, riesgoTrabajo: 10 },
      ultimaIncapacidad: '2026-02-20T00:00:00.000Z',
    },
  ],
  centros: [
    { _id: 'c1', nombreCentro: 'Planta Norte' },
    { _id: 'c2', nombreCentro: 'Planta Sur' },
  ],
  trabajadores: [
    { _id: 't1', nombre: 'Ana', primerApellido: 'López', puesto: 'Soldador', idCentroTrabajo: 'c1' },
  ],
  conDiagnosticos: true,
  ...cambios,
});

const montar = async () => {
  const wrapper = mount(IncapacidadesInformeView);
  await flushPromises();
  return wrapper;
};

describe('IncapacidadesInformeView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(IncapacidadesAPI.getInformeEmpresa).mockResolvedValue({ data: informe() } as any);
  });

  it('pide el año en curso y muestra totales, indicadores y tendencias', async () => {
    const wrapper = await montar();
    expect(IncapacidadesAPI.getInformeEmpresa).toHaveBeenCalledWith(EMPRESA, {
      desde: '2026-01-01',
      hasta: '2026-10-09',
      centro: undefined,
    });

    expect(wrapper.find('[data-test="periodo"]').text()).toContain('Del 01-01-2026 al 09-10-2026');
    expect(wrapper.find('[data-test="casos-nuevos"]').text()).toBe('3');
    expect(wrapper.find('[data-test="dias-total"]').text()).toBe('25');
    expect(wrapper.find('[data-test="dias-subsidiados"]').text()).toBe('16');
    expect(wrapper.find('[data-test="riesgo-accidenteTrayecto"]').text()).toBe('1');

    const indicadores = wrapper.findAll('[data-test="indicador"]');
    expect(indicadores).toHaveLength(4);
    expect(indicadores[3].text()).toContain('8.33');
    expect(indicadores[3].text()).toContain('Días de incapacidad ÷ casos con días en el periodo');

    expect(wrapper.find('[data-test="por-grupo"]').text()).toContain('Respiratorio');
    expect(wrapper.find('[data-test="por-region"]').text()).toContain('Espalda baja (lumbar)');
    expect(wrapper.find('[data-test="por-centro"]').text()).toContain('Planta Norte');
    expect(wrapper.find('[data-test="por-naturaleza"]').text()).toContain('Esguince');
    expect(wrapper.find('[data-test="casos-con-secuelas"]').text()).toBe('1');
    const duraciones = wrapper.findAll('[data-test="duracion"]');
    expect(duraciones).toHaveLength(7);
    expect(duraciones.map((d) => d.text())).toEqual(['', '1', '', '2', '', '', '']);
    expect(wrapper.findAll('[data-test="mes"]')).toHaveLength(2);
    expect(wrapper.findAll('[data-test="dia-semana"]')[0].text()).toBe('2');
    expect(wrapper.find('[data-test="trabajador"]').text()).toContain('López Ana');
  });

  it('al cambiar de periodo o de centro vuelve a consultar', async () => {
    const wrapper = await montar();

    await wrapper.find('[data-test="filtro-periodo"]').setValue('anioAnterior');
    await flushPromises();
    expect(IncapacidadesAPI.getInformeEmpresa).toHaveBeenLastCalledWith(EMPRESA, {
      desde: '2025-01-01',
      hasta: '2025-12-31',
      centro: undefined,
    });

    await wrapper.find('[data-test="filtro-centro"]').setValue('c2');
    await flushPromises();
    expect(IncapacidadesAPI.getInformeEmpresa).toHaveBeenLastCalledWith(EMPRESA, {
      desde: '2025-01-01',
      hasta: '2025-12-31',
      centro: 'c2',
    });
    // Limitado a un centro, la comparación entre centros no aplica
    expect(wrapper.find('[data-test="por-centro"]').exists()).toBe(false);
    // El selector conserva todos los centros
    expect(wrapper.find('[data-test="filtro-centro"]').findAll('option')).toHaveLength(3);
  });

  it('con otro periodo valida las fechas antes de consultar', async () => {
    const wrapper = await montar();
    await wrapper.find('[data-test="filtro-periodo"]').setValue('personalizado');
    const llamadas = vi.mocked(IncapacidadesAPI.getInformeEmpresa).mock.calls.length;

    await wrapper.find('[data-test="hasta"]').setValue('2025-12-01');
    await flushPromises();
    expect(wrapper.find('[data-test="error-fechas"]').text()).toContain('anterior');
    expect(IncapacidadesAPI.getInformeEmpresa).toHaveBeenCalledTimes(llamadas);

    await wrapper.find('[data-test="desde"]').setValue('2025-11-01');
    await flushPromises();
    expect(IncapacidadesAPI.getInformeEmpresa).toHaveBeenLastCalledWith(EMPRESA, {
      desde: '2025-11-01',
      hasta: '2025-12-01',
      centro: undefined,
    });
  });

  it('sin permiso para ver diagnósticos no muestra de qué se enferman', async () => {
    vi.mocked(IncapacidadesAPI.getInformeEmpresa).mockResolvedValue({
      data: informe({ conDiagnosticos: false }),
    } as any);
    const wrapper = await montar();
    expect(wrapper.find('[data-test="por-grupo"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="por-region"]').exists()).toBe(true);
  });

  it('exporta a Excel con la empresa y el centro elegidos', async () => {
    const wrapper = await montar();
    await wrapper.find('[data-test="exportar"]').trigger('click');
    expect(exportarInformeExcel).toHaveBeenCalledWith(
      expect.objectContaining({ trabajadoresActivos: 40 }),
      { empresa: 'Aceros del Norte', centro: 'Todos' },
    );
  });

  it('un periodo sin incapacidades lo dice y no deja exportar', async () => {
    const vacio = informe();
    vacio.totales.casosNuevos = 0;
    vacio.totales.dias.total = 0;
    vi.mocked(IncapacidadesAPI.getInformeEmpresa).mockResolvedValue({ data: vacio } as any);
    const wrapper = await montar();
    expect(wrapper.text()).toContain('Sin incapacidades en el periodo');
    expect(wrapper.find('[data-test="exportar"]').attributes('disabled')).toBeDefined();
  });
});
