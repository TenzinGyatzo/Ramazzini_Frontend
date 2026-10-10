import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import IncapacidadesPrimaView from './IncapacidadesPrimaView.vue';
import IncapacidadesAPI from '@/api/IncapacidadesAPI';

const EMPRESA = '65f0000000000000000000e1';

vi.mock('@/api/IncapacidadesAPI', () => ({
  default: { getPrimaEmpresa: vi.fn() },
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

const siniestralidad = (cambios: Record<string, unknown> = {}) => ({
  anio: 2025,
  criterio: 'terminados',
  S: 46,
  I: 0,
  D: 0,
  casos: [
    {
      idCaso: 'caso1',
      idTrabajador: 't1',
      tipoRiesgo: 'accidenteTrabajo',
      fechaInicio: '2025-03-03T00:00:00.000Z',
      fechaTermino: '2025-04-18T00:00:00.000Z',
      dias: 46,
      porcentajeIPP: 0,
      defuncion: false,
      enCalificacion: true,
    },
  ],
  excluidos: { trayecto: 2, enCurso: 1 },
  trabajadoresActivos: 37,
  centros: [
    { _id: 'c1', nombreCentro: 'Planta Norte' },
    { _id: 'c2', nombreCentro: 'Planta Sur' },
  ],
  trabajadores: [{ _id: 't1', nombre: 'Ana', primerApellido: 'López', idCentroTrabajo: 'c1' }],
  ...cambios,
});

const montar = async () => {
  const wrapper = mount(IncapacidadesPrimaView);
  await flushPromises();
  return wrapper;
};

describe('IncapacidadesPrimaView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(IncapacidadesAPI.getPrimaEmpresa).mockResolvedValue({ data: siniestralidad() } as any);
  });

  it('consulta el año anterior, sugiere N y estima la prima con la fórmula a la vista', async () => {
    const wrapper = await montar();
    expect(IncapacidadesAPI.getPrimaEmpresa).toHaveBeenCalledWith(EMPRESA, {
      anio: 2025,
      criterio: 'terminados',
      centro: undefined,
    });
    expect(wrapper.find('[data-test="valor-s"]').text()).toBe('46');
    expect((wrapper.find('[data-test="campo-n"]').element as HTMLInputElement).value).toBe('37');
    expect(wrapper.find('[data-test="prima-aplicable"]').text()).toBe('1.28341 %');
    expect(wrapper.find('[data-test="sustitucion"]').text()).toContain(
      '[(46 ÷ 365) + 28 × (0 + 0)] × (2.3 ÷ 37) + 0.005',
    );
    expect(wrapper.find('[data-test="diferencia"]').exists()).toBe(false);
  });

  it('advierte que es una estimación y cuáles son los supuestos', async () => {
    const aviso = (await montar()).find('[data-test="aviso"]').text();
    expect(aviso).toContain('Estimación para revisar con el contador');
    expect(aviso).toContain('regla sin confirmar');
    expect(aviso).toContain('no varía más de 1 punto porcentual');
  });

  it('dice qué quedó fuera y qué casos no están calificados', async () => {
    const wrapper = await montar();
    const notas = wrapper.find('[data-test="notas"]').text();
    expect(notas).toContain('2 accidentes en trayecto no entran');
    expect(notas).toContain('1 caso sigue en curso y no entra');
    expect(notas).toContain('1 caso aún no está calificado');
    const fila = wrapper.find('[data-test="caso"]').text();
    expect(fila).toContain('López Ana');
    expect(fila).toContain('Sin calificar');
    expect(fila).toContain('18-04-2025');
  });

  it('con la prima anterior aplica el tope de variación y lo marca como supuesto', async () => {
    const wrapper = await montar();
    await wrapper.find('[data-test="campo-anterior"]').setValue('4.65325');
    expect(wrapper.find('[data-test="prima-aplicable"]').text()).toBe('3.65325 %');
    expect(wrapper.find('[data-test="prima-calculada"]').text()).toBe('1.28341 %');
    expect(wrapper.find('[data-test="ajustes"]').text()).toContain('No puede bajar más de 1 punto');
    expect(wrapper.find('[data-test="ajustes"]').text()).toContain('supuesto sin confirmar');
    expect(wrapper.find('[data-test="diferencia"]').text()).toContain('Baja 1 puntos');
  });

  it('recalcula al cambiar N o el factor, sin volver a consultar', async () => {
    const wrapper = await montar();
    await wrapper.find('[data-test="campo-n"]').setValue('74');
    expect(wrapper.find('[data-test="prima-aplicable"]').text()).toBe('0.89171 %');
    await wrapper.find('[data-test="campo-f"]').setValue('2.2');
    expect(wrapper.find('[data-test="prima-aplicable"]').text()).toBe('0.87468 %');
    expect(IncapacidadesAPI.getPrimaEmpresa).toHaveBeenCalledTimes(1);

    await wrapper.find('[data-test="campo-n"]').setValue('');
    expect(wrapper.find('[data-test="sin-resultado"]').exists()).toBe(true);
  });

  it('al cambiar de año o de criterio vuelve a consultar y conserva la N capturada', async () => {
    const wrapper = await montar();
    await wrapper.find('[data-test="campo-n"]').setValue('50');
    await wrapper.find('[data-test="filtro-anio"]').setValue('2024');
    await wrapper.find('[data-test="filtro-criterio"]').setValue('ocurridos');
    await flushPromises();
    expect(IncapacidadesAPI.getPrimaEmpresa).toHaveBeenLastCalledWith(EMPRESA, {
      anio: 2024,
      criterio: 'ocurridos',
      centro: undefined,
    });
    expect((wrapper.find('[data-test="campo-n"]').element as HTMLInputElement).value).toBe('50');
  });
});
