import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import ModalIncapacidades from './ModalIncapacidades.vue';
import IncapacidadesAPI from '@/api/IncapacidadesAPI';

const TRABAJADOR = '65f000000000000000000001';
const puedeGestionar = ref(true);

vi.mock('@/api/IncapacidadesAPI', () => ({
  default: {
    getCasos: vi.fn(),
    registrarIncapacidad: vi.fn().mockResolvedValue({ data: {} }),
    abrirCaso: vi.fn().mockResolvedValue({ data: {} }),
    actualizarCaso: vi.fn().mockResolvedValue({ data: {} }),
    eliminarCaso: vi.fn().mockResolvedValue({ data: {} }),
    eliminarIncapacidad: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('@/stores/trabajadores', () => ({
  useTrabajadoresStore: () => ({
    currentTrabajador: {
      _id: TRABAJADOR,
      nombre: 'Luis',
      primerApellido: 'Pérez',
      puesto: 'Operador',
    },
  }),
}));

vi.mock('@/composables/useUserPermissions', () => ({
  useUserPermissions: () => ({ canAccessRiesgosTrabajo: puedeGestionar }),
}));

const fractura = () => ({
  caso: {
    _id: 'caso1',
    ramo: 'riesgoTrabajo',
    fechaInicio: '2026-03-02T00:00:00.000Z',
    tipoRiesgo: 'accidenteTrabajo',
    naturalezaLesion: 'fractura',
    regionAnatomica: 'manoDedos',
    grupoDiagnostico: 'traumatismos',
    calificacion: 'siDeTrabajo',
    diasAcumulados: 14,
    fechaTerminoUltimaIncapacidad: '2026-03-15T00:00:00.000Z',
  },
  incapacidades: [
    {
      _id: 'inc1',
      idCaso: 'caso1',
      origen: 'imss',
      caracter: 'inicial',
      folio: 'AB123',
      fechaInicio: '2026-03-02T00:00:00.000Z',
      dias: 7,
      fechaTermino: '2026-03-08T00:00:00.000Z',
    },
    {
      _id: 'inc2',
      idCaso: 'caso1',
      origen: 'imss',
      caracter: 'subsecuente',
      folio: 'AB124',
      fechaInicio: '2026-03-09T00:00:00.000Z',
      dias: 7,
      fechaTermino: '2026-03-15T00:00:00.000Z',
    },
  ],
  estado: 'activo',
  dias: { total: 14, subsidiados: 14, sinSubsidio: 0, aCargoEmpresa: 0 },
  incapacitadoHoy: true,
});

const montar = async (casos: unknown[]) => {
  vi.mocked(IncapacidadesAPI.getCasos).mockResolvedValue({ data: casos } as any);
  const toast = { open: vi.fn() };
  const wrapper = mount(ModalIncapacidades, { global: { provide: { toast } } });
  await flushPromises();
  return { wrapper, toast };
};

const boton = (wrapper: any, texto: string) =>
  wrapper.findAll('button').find((b: any) => b.text().includes(texto));

describe('ModalIncapacidades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    puedeGestionar.value = true;
  });

  it('sin casos invita a registrar', async () => {
    const { wrapper } = await montar([]);
    expect(IncapacidadesAPI.getCasos).toHaveBeenCalledWith(TRABAJADOR);
    expect(wrapper.text()).toContain('Sin incapacidades registradas');
    expect(wrapper.text()).toContain('Pérez Luis');
  });

  it('muestra el caso con sus incapacidades, días y estado', async () => {
    const { wrapper } = await montar([fractura()]);
    const texto = wrapper.text();
    expect(texto).toContain('Incapacitado hoy');
    expect(texto).toContain('Riesgo de trabajo');
    expect(texto).toContain('Accidente de trabajo · Fractura · Mano y dedos');
    expect(texto).toContain('Calificado: sí de trabajo');
    expect(texto).toContain('02-03-2026 al 08-03-2026');
    expect(texto).toContain('folio AB124');
    expect(texto).toContain('14 subsidiados por el IMSS');
    expect(wrapper.emitted('cambio')?.[0]?.[0]).toHaveLength(1);
  });

  it('abre el formulario para una incapacidad nueva y para un subsecuente', async () => {
    const { wrapper } = await montar([fractura()]);

    await boton(wrapper, 'Registrar incapacidad').trigger('click');
    expect(wrapper.text()).toContain('¿De qué tipo es?');

    await boton(wrapper, 'Cancelar').trigger('click');
    await boton(wrapper, 'Agregar subsecuente').trigger('click');
    expect(wrapper.text()).toContain('Se agrega al caso de');
    expect(wrapper.text()).toContain('su última incapacidad terminó el 15-03-2026');
    // Propone el día siguiente al fin de la anterior
    expect((wrapper.find('#inc-inicio').element as HTMLInputElement).value).toBe('2026-03-16');
  });

  it('registra un subsecuente en el caso elegido', async () => {
    const { wrapper } = await montar([fractura()]);
    await boton(wrapper, 'Agregar subsecuente').trigger('click');
    await wrapper.find('#inc-folio').setValue('AB125');
    await wrapper.find('#inc-dias').setValue(7);
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(IncapacidadesAPI.registrarIncapacidad).toHaveBeenCalledWith(TRABAJADOR, {
      idCaso: 'caso1',
      incapacidad: {
        origen: 'imss',
        caracter: 'subsecuente',
        folio: 'AB125',
        fechaInicio: '2026-03-16',
        dias: 7,
        fechaExpedicion: undefined,
        conGoceDeSueldo: undefined,
      },
    });
    // Vuelve a la lista y recarga
    expect(IncapacidadesAPI.getCasos).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Accidente de trabajo');
  });

  it('no guarda sin folio ni días, y dice qué falta', async () => {
    const { wrapper } = await montar([fractura()]);
    await boton(wrapper, 'Agregar subsecuente').trigger('click');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(IncapacidadesAPI.registrarIncapacidad).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('El certificado del IMSS lleva folio');
    expect(wrapper.text()).toContain('Indica los días');
  });

  it('eliminar pide confirmación', async () => {
    const { wrapper } = await montar([fractura()]);
    await wrapper.find('button[title="Eliminar incapacidad"]').trigger('click');
    expect(IncapacidadesAPI.eliminarIncapacidad).not.toHaveBeenCalled();

    await boton(wrapper, 'Sí').trigger('click');
    await flushPromises();
    expect(IncapacidadesAPI.eliminarIncapacidad).toHaveBeenCalledWith(TRABAJADOR, 'inc1');
  });

  it('abre el seguimiento del riesgo con sus datos', async () => {
    const { wrapper } = await montar([fractura()]);
    await boton(wrapper, 'Calificación, alta y secuelas').trigger('click');
    expect(wrapper.text()).toContain('Alta y consecuencias');
    expect((wrapper.find('#seg-calificacion').element as HTMLSelectElement).value).toBe('siDeTrabajo');
  });

  it('sin permiso solo consulta: no hay botones para registrar, editar ni eliminar', async () => {
    puedeGestionar.value = false;
    const { wrapper } = await montar([fractura()]);
    expect(boton(wrapper, 'Registrar incapacidad')).toBeUndefined();
    expect(boton(wrapper, 'Agregar subsecuente')).toBeUndefined();
    expect(boton(wrapper, 'Eliminar caso')).toBeUndefined();
    expect(wrapper.find('button[title="Eliminar incapacidad"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('02-03-2026 al 08-03-2026');
  });
});
