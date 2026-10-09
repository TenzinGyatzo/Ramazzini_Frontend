import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import IncapacidadesEmpresaView from './IncapacidadesEmpresaView.vue';
import IncapacidadesAPI from '@/api/IncapacidadesAPI';

const EMPRESA = '65f0000000000000000000e1';
const hidratar = vi.fn();

vi.mock('@/api/IncapacidadesAPI', () => ({
  default: { getPanelEmpresa: vi.fn() },
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

vi.mock('@/stores/trabajadores', () => ({
  useTrabajadoresStore: () => ({ hydrateCurrentTrabajadorFromListado: hidratar }),
}));

vi.mock('@/helpers/incapacidades', async (original) => ({
  ...(await original<typeof import('@/helpers/incapacidades')>()),
  hoyISO: () => '2026-10-09',
}));

const caso = (id: string, idTrabajador: string, campos = {}, resto = {}) => ({
  idTrabajador,
  caso: {
    _id: id,
    ramo: 'enfermedadGeneral',
    grupoDiagnostico: 'respiratorio',
    fechaInicio: '2026-10-05T00:00:00.000Z',
    diasAcumulados: 7,
    fechaTerminoUltimaIncapacidad: '2026-10-11T00:00:00.000Z',
    ...campos,
  },
  incapacidades: [],
  estado: 'activo',
  dias: { total: 7, subsidiados: 4, sinSubsidio: 3, aCargoEmpresa: 0 },
  incapacitadoHoy: false,
  ...resto,
});

const panel = () => ({
  centros: [
    { _id: 'c1', nombreCentro: 'Planta Norte' },
    { _id: 'c2', nombreCentro: 'Planta Sur' },
  ],
  trabajadores: [
    { _id: 't1', nombre: 'Ana', primerApellido: 'López', puesto: 'Soldadora', idCentroTrabajo: 'c1' },
    { _id: 't2', nombre: 'Luis', primerApellido: 'Pérez', puesto: 'Operador', idCentroTrabajo: 'c2' },
  ],
  casos: [
    caso('caso1', 't1', {}, { incapacitadoHoy: true }),
    caso(
      'caso2',
      't2',
      {
        ramo: 'riesgoTrabajo',
        tipoRiesgo: 'accidenteTrabajo',
        fechaInicio: '2026-08-03T00:00:00.000Z',
        fechaTerminoUltimaIncapacidad: '2026-09-11T00:00:00.000Z',
      },
      { dias: { total: 40, subsidiados: 40, sinSubsidio: 0, aCargoEmpresa: 0 } },
    ),
    caso(
      'caso3',
      't2',
      { fechaInicio: '2024-02-05T00:00:00.000Z', fechaTerminoUltimaIncapacidad: '2024-02-07T00:00:00.000Z' },
      { estado: 'terminado', dias: { total: 3, subsidiados: 0, sinSubsidio: 3, aCargoEmpresa: 0 } },
    ),
  ],
  incapacitadosHoy: [
    {
      idTrabajador: 't1',
      idCaso: 'caso1',
      ramo: 'enfermedadGeneral',
      origen: 'imss',
      diasQueLleva: 5,
      fechaTermino: '2026-10-11T00:00:00.000Z',
    },
  ],
  focosRojos: [
    { idTrabajador: 't2', focos: [{ tipo: 'prolongada', detalle: '40 días', idCaso: 'caso2' }] },
  ],
  umbrales: {
    diasProlongada: 30,
    semanasCercaDelLimite: 40,
    casosFrecuentes: 3,
    diasVentana: 365,
    diasSinSeguimiento: 7,
  },
});

const montar = async () => {
  const wrapper = mount(IncapacidadesEmpresaView, {
    global: {
      stubs: {
        Teleport: true,
        ModalIncapacidades: {
          emits: ['closeModal', 'cambio'],
          template:
            '<div data-test="ventana"><button data-test="cambiar" @click="$emit(\'cambio\', [])" /><button data-test="cerrar" @click="$emit(\'closeModal\')" /></div>',
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

describe('IncapacidadesEmpresaView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(IncapacidadesAPI.getPanelEmpresa).mockResolvedValue({ data: panel() } as any);
  });

  it('muestra quién está incapacitado hoy, los focos rojos y los casos del periodo', async () => {
    const wrapper = await montar();
    expect(IncapacidadesAPI.getPanelEmpresa).toHaveBeenCalledWith(EMPRESA);
    expect(wrapper.text()).toContain('Aceros del Norte');

    const hoy = wrapper.findAll('[data-test="incapacitado-hoy"]');
    expect(hoy).toHaveLength(1);
    expect(hoy[0].text()).toContain('López Ana');
    expect(hoy[0].text()).toContain('Lleva 5 días');
    expect(hoy[0].text()).toContain('hasta el 11-10-2026');

    const focos = wrapper.findAll('[data-test="foco-rojo"]');
    expect(focos).toHaveLength(1);
    expect(focos[0].text()).toContain('Pérez Luis');
    expect(focos[0].text()).toContain('Incapacidad prolongada · 40 días');

    // Por defecto, últimos 12 meses: el caso de 2024 queda fuera
    expect(wrapper.findAll('[data-test="caso"]')).toHaveLength(2);
    expect(wrapper.find('[data-test="total-casos"]').text()).toBe('(2)');
  });

  it('filtra por ramo, por periodo y por búsqueda', async () => {
    const wrapper = await montar();

    await wrapper.find('[data-test="filtro-ramo"]').setValue('riesgoTrabajo');
    let filas = wrapper.findAll('[data-test="caso"]');
    expect(filas).toHaveLength(1);
    expect(filas[0].text()).toContain('Accidente de trabajo');

    await wrapper.find('[data-test="filtro-ramo"]').setValue('');
    await wrapper.find('[data-test="filtro-periodo"]').setValue('todo');
    expect(wrapper.findAll('[data-test="caso"]')).toHaveLength(3);

    await wrapper.find('[data-test="buscar"]').setValue('lopez');
    filas = wrapper.findAll('[data-test="caso"]');
    expect(filas).toHaveLength(1);
    expect(filas[0].text()).toContain('López Ana');
  });

  it('el centro de trabajo filtra las tres secciones y el resumen', async () => {
    const wrapper = await montar();
    await wrapper.find('[data-test="filtro-centro"]').setValue('c2');

    expect(wrapper.findAll('[data-test="incapacitado-hoy"]')).toHaveLength(0);
    expect(wrapper.text()).toContain('Nadie está incapacitado hoy.');
    expect(wrapper.findAll('[data-test="foco-rojo"]')).toHaveLength(1);
    expect(wrapper.findAll('[data-test="caso"]')).toHaveLength(1);
    expect(wrapper.find('[data-test="resumen-incapacitados"]').text()).toBe('0');
  });

  it('abre la ventana del trabajador y vuelve a consultar solo si algo cambió', async () => {
    const wrapper = await montar();

    await wrapper.find('[data-test="foco-rojo"]').trigger('click');
    expect(hidratar).toHaveBeenCalledWith(expect.objectContaining({ _id: 't2', nombre: 'Luis' }));
    // El primer aviso es la carga inicial de la ventana: no cuenta como cambio
    await wrapper.find('[data-test="cambiar"]').trigger('click');
    await wrapper.find('[data-test="cerrar"]').trigger('click');
    expect(wrapper.find('[data-test="ventana"]').exists()).toBe(false);
    expect(IncapacidadesAPI.getPanelEmpresa).toHaveBeenCalledTimes(1);

    await wrapper.find('[data-test="incapacitado-hoy"]').trigger('click');
    await wrapper.find('[data-test="cambiar"]').trigger('click');
    await wrapper.find('[data-test="cambiar"]').trigger('click');
    await wrapper.find('[data-test="cerrar"]').trigger('click');
    await flushPromises();
    expect(IncapacidadesAPI.getPanelEmpresa).toHaveBeenCalledTimes(2);
  });

  it('si el servidor rechaza la consulta muestra su mensaje y permite reintentar', async () => {
    vi.mocked(IncapacidadesAPI.getPanelEmpresa).mockRejectedValueOnce({
      response: { data: { message: 'El módulo de incapacidades aún no está disponible' } },
    });
    const wrapper = await montar();
    expect(wrapper.text()).toContain('El módulo de incapacidades aún no está disponible');

    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('[data-test="caso"]')).toHaveLength(2);
  });
});
