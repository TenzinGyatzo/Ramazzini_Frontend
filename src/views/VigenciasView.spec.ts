import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { ConteosVigencia, EmpresaVigencias, ResumenVigencias } from '@/api/VigenciasAptitudAPI';

const { getResumen, pausar, reanudar, getPendientes, descargarFilasExcel } = vi.hoisted(() => ({
  getResumen: vi.fn(),
  pausar: vi.fn(),
  reanudar: vi.fn(),
  getPendientes: vi.fn(),
  descargarFilasExcel: vi.fn(),
}));
vi.mock('@/api/VigenciasAptitudAPI', () => ({ default: { getResumen, pausar, reanudar, getPendientes } }));
vi.mock('@/helpers/exportarExcel', () => ({ descargarFilasExcel }));

import VigenciasView from './VigenciasView.vue';

const conteos = (parcial: Partial<ConteosVigencia> = {}): ConteosVigencia => {
  const base = {
    vigentes: 0,
    porVencer: 0,
    vencidasRecientes: 0,
    vencidasAntiguas: 0,
    sinAptitud: 0,
    vencen30: 0,
    vencen60: 0,
    vencen90: 0,
    ...parcial,
  };
  return {
    ...base,
    activos: base.vigentes + base.porVencer + base.vencidasRecientes + base.vencidasAntiguas + base.sinAptitud,
  };
};

const empresa = (
  idEmpresa: string,
  parcial: Partial<ConteosVigencia>,
  extra: Partial<EmpresaVigencias> = {},
): EmpresaVigencias => ({
  idEmpresa,
  nombreEmpresa: `Empresa ${idEmpresa}`,
  seguimiento: 'EN_SEGUIMIENTO',
  reactivadoEn: null,
  ultimaAptitud: null,
  conteos: conteos(parcial),
  centros: [{ idCentro: `c-${idEmpresa}`, nombreCentro: 'Planta', conteos: conteos(parcial) }],
  ...extra,
});

const resumenBase = (parcial: Partial<ResumenVigencias> = {}): ResumenVigencias => ({
  generadoEn: '2026-10-24T12:00:00.000Z',
  totales: conteos({ vigentes: 10, porVencer: 3, vencidasRecientes: 2, sinAptitud: 5 }),
  conteosSecundarios: { sinActividad: 1, pausadas: 1, sinTrabajadoresActivos: 2 },
  puedePausar: true,
  puedeExportar: true,
  empresas: [
    empresa('alDia', { vigentes: 10 }),
    empresa('urgente', { porVencer: 3, vencidasRecientes: 2 }, { seguimiento: 'REACTIVADA' }),
    empresa('vieja', { vencidasAntiguas: 4 }, { seguimiento: 'SIN_ACTIVIDAD' }),
    empresa(
      'pausada',
      { vencidasAntiguas: 2 },
      {
        seguimiento: 'PAUSADA',
        pausa: { desde: '2026-09-01T00:00:00.000Z', motivo: 'CAMBIO_PROVEEDOR', motivoOtro: null, nota: null, pausadoPor: 'Dra. Ruiz' },
      },
    ),
  ],
  ...parcial,
});

const toast = { open: vi.fn() };

const montar = () =>
  mount(VigenciasView, {
    attachTo: document.body,
    global: {
      provide: { toast },
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a :data-to="JSON.stringify(to)"><slot /></a>',
        },
        Teleport: true,
      },
    },
  });

const filas = (w: ReturnType<typeof montar>) =>
  w.findAll('[data-test="fila-empresa"]').map((f) => f.text().split('\n')[0].trim());

describe('VigenciasView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getResumen.mockResolvedValue({ data: resumenBase() });
    pausar.mockResolvedValue({ data: {} });
    reanudar.mockResolvedValue({ data: {} });
  });

  it('muestra los totales de las empresas en seguimiento y el resto aparte', async () => {
    const w = montar();
    await flushPromises();
    expect(w.find('[data-test="total-activos"]').text()).toBe('20');
    expect(w.find('[data-test="total-al-dia"]').text()).toBe('65%');
    expect(w.find('[data-test="conteos-secundarios"]').text()).toContain(
      '1 empresa sin actividad reciente · 1 pausada · 2 sin trabajadores activos',
    );
    w.unmount();
  });

  it('por defecto solo lista empresas con pendientes, la más urgente primero', async () => {
    const w = montar();
    await flushPromises();
    const principal = w.findAll('section')[0];
    expect(principal.findAll('[data-test="fila-empresa"]')).toHaveLength(1);
    expect(principal.text()).toContain('Empresa urgente');
    expect(principal.find('[data-test="etiqueta-reactivada"]').exists()).toBe(true);
    expect(w.find('[data-test="al-dia-ocultas"]').text()).toContain('1 empresa al día oculta');

    await w.find('[data-test="solo-pendientes"]').setValue(false);
    expect(principal.findAll('[data-test="fila-empresa"]')).toHaveLength(2);
    w.unmount();
  });

  it('sin actividad reciente va colapsada y las pausadas solo con su filtro', async () => {
    const w = montar();
    await flushPromises();
    const sinActividad = w.find('[data-test="seccion-sin-actividad"]');
    expect(sinActividad.text()).toContain('Sin actividad reciente (1)');
    expect(sinActividad.find('[data-test="fila-empresa"]').exists()).toBe(false);
    await sinActividad.find('button').trigger('click');
    expect(sinActividad.find('[data-test="fila-empresa"]').exists()).toBe(true);

    expect(w.find('[data-test="seccion-pausadas"]').exists()).toBe(false);
    await w.find('[data-test="ver-pausadas"]').setValue(true);
    const pausadas = w.find('[data-test="seccion-pausadas"]');
    expect(pausadas.text()).toContain('Cambió de proveedor · por Dra. Ruiz');
    expect(pausadas.find('[data-test="reanudar"]').exists()).toBe(true);
    w.unmount();
  });

  it('los números de un centro llevan a la tabla de trabajadores filtrada', async () => {
    const w = montar();
    await flushPromises();
    await w.find('[data-test="fila-empresa"]').trigger('click');
    const enlace = w.find('[data-test="centro-vencidasRecientes"]');
    expect(JSON.parse(enlace.attributes('data-to')!)).toEqual({
      name: 'trabajadores',
      params: { idEmpresa: 'urgente', idCentroTrabajo: 'c-urgente' },
      query: { vigencia: 'Vencido' },
    });
    // Los ceros no son enlace
    expect(w.find('[data-test="centro-sinAptitud"]').exists()).toBe(false);
    w.unmount();
  });

  it('pausar pide motivo, guarda y vuelve a cargar', async () => {
    const w = montar();
    await flushPromises();
    await w.find('[data-test="pausar"]').trigger('click');
    const confirmar = w.find('[data-test="confirmar"]');
    expect(confirmar.attributes('disabled')).toBeDefined();

    await w.find('[data-test="motivo-OTRO"]').setValue(true);
    expect(confirmar.attributes('disabled')).toBeDefined();
    await w.find('[data-test="motivo-otro"]').setValue('  Cerró la planta ');
    await w.find('[data-test="nota"]').setValue('Avisó RH');
    await confirmar.trigger('click');
    await flushPromises();

    expect(pausar).toHaveBeenCalledWith('urgente', { motivo: 'OTRO', motivoOtro: 'Cerró la planta', nota: 'Avisó RH' });
    expect(getResumen).toHaveBeenCalledTimes(2);
    expect(w.find('[data-test="modal-seguimiento"]').exists()).toBe(false);
    w.unmount();
  });

  it('exporta los pendientes de una empresa', async () => {
    getPendientes.mockResolvedValue({
      data: [
        {
          idTrabajador: 't1',
          nombreCentro: 'Planta',
          nombre: 'Ana',
          primerApellido: 'López',
          segundoApellido: '',
          numeroEmpleado: '1',
          puesto: 'Operadora',
          fechaUltimaAptitud: null,
          fechaVencimiento: null,
          estado: null,
          diasRestantes: null,
        },
      ],
    });
    const w = montar();
    await flushPromises();
    await w.find('[data-test="exportar"]').trigger('click');
    await flushPromises();
    expect(getPendientes).toHaveBeenCalledWith('urgente');
    expect(descargarFilasExcel).toHaveBeenCalledWith(
      [expect.objectContaining({ 'Nombre completo': 'López Ana', Estado: 'Sin aptitud' })],
      expect.stringMatching(/^Pendientes de aptitud - Empresa urgente - \d{4}-\d{2}-\d{2}\.xlsx$/),
      'Pendientes',
    );
    w.unmount();
  });

  it('sin permisos no hay botones de pausar ni exportar', async () => {
    getResumen.mockResolvedValue({ data: resumenBase({ puedePausar: false, puedeExportar: false }) });
    const w = montar();
    await flushPromises();
    expect(w.find('[data-test="pausar"]').exists()).toBe(false);
    expect(w.find('[data-test="exportar"]').exists()).toBe(false);
    w.unmount();
  });

  it('si no carga, ofrece reintentar', async () => {
    getResumen.mockRejectedValueOnce(new Error('red'));
    const w = montar();
    await flushPromises();
    expect(w.text()).toContain('Reintentar');
    expect(filas(w)).toEqual([]);
    w.unmount();
  });
});
