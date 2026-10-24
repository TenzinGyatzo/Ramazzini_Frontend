import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { ConteosVigencia, EmpresaVigencias, ResumenVigencias } from '@/api/VigenciasAptitudAPI';

const { getResumen, getEmpresas, actualizarEmpresas, getPendientes, descargarFilasExcel } = vi.hoisted(() => ({
  getResumen: vi.fn(),
  getEmpresas: vi.fn(),
  actualizarEmpresas: vi.fn(),
  getPendientes: vi.fn(),
  descargarFilasExcel: vi.fn(),
}));
vi.mock('@/api/VigenciasAptitudAPI', () => ({
  default: { getResumen, getEmpresas, actualizarEmpresas, getPendientes },
}));
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

const empresa = (idEmpresa: string, parcial: Partial<ConteosVigencia>): EmpresaVigencias => ({
  idEmpresa,
  nombreEmpresa: `Empresa ${idEmpresa}`,
  ultimaAptitud: null,
  conteos: conteos(parcial),
  centros: [{ idCentro: `c-${idEmpresa}`, nombreCentro: 'Planta', conteos: conteos(parcial) }],
});

const resumenBase = (parcial: Partial<ResumenVigencias> = {}): ResumenVigencias => ({
  generadoEn: '2026-10-24T12:00:00.000Z',
  totales: conteos({ vigentes: 10, porVencer: 3, vencidasRecientes: 2, sinAptitud: 5 }),
  empresasSeleccionadas: 2,
  puedeElegir: true,
  puedeExportar: true,
  empresas: [empresa('alDia', { vigentes: 10 }), empresa('urgente', { porVencer: 3, vencidasRecientes: 2 })],
  ...parcial,
});

const vacio = (parcial: Partial<ResumenVigencias> = {}) =>
  resumenBase({ totales: conteos(), empresasSeleccionadas: 0, empresas: [], ...parcial });

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

describe('VigenciasView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getResumen.mockResolvedValue({ data: resumenBase() });
    getEmpresas.mockResolvedValue({
      data: [
        { idEmpresa: 'a', nombreEmpresa: 'Aceros', seleccionada: true, activos: 12, ultimaAptitud: '2026-09-01T00:00:00.000Z' },
        { idEmpresa: 'b', nombreEmpresa: 'Bodegas', seleccionada: false, activos: 3, ultimaAptitud: null },
      ],
    });
    actualizarEmpresas.mockResolvedValue({ data: [] });
  });

  it('muestra los totales de las empresas en seguimiento', async () => {
    const w = montar();
    await flushPromises();
    expect(w.find('[data-test="total-activos"]').text()).toBe('20');
    expect(w.find('[data-test="total-al-dia"]').text()).toBe('65%');
    expect(w.find('[data-test="elegir-empresas"]').text()).toContain('Elegir empresas (2)');
    w.unmount();
  });

  it('lista todas las empresas elegidas, la más urgente primero', async () => {
    const w = montar();
    await flushPromises();
    const filas = w.findAll('[data-test="fila-empresa"]');
    expect(filas).toHaveLength(2);
    expect(filas[0].text()).toContain('Empresa urgente');
    expect(w.find('[data-test="solo-pendientes"]').exists()).toBe(false);
    await w.find('[data-test="buscar"]').setValue('zzz');
    expect(w.find('[data-test="sin-empresas"]').text()).toBe('Ninguna empresa coincide con la búsqueda.');
    w.unmount();
  });

  it('sin empresas elegidas invita a elegirlas', async () => {
    getResumen.mockResolvedValue({ data: vacio() });
    const w = montar();
    await flushPromises();
    expect(w.find('[data-test="sin-seleccion"]').text()).toContain('Aún no eliges empresas para dar seguimiento');
    expect(w.find('[data-test="elegir-empresas-vacio"]').exists()).toBe(true);
    expect(w.find('[data-test="buscar"]').exists()).toBe(false);
    w.unmount();
  });

  it('quien no puede elegir ve un aviso sin botón', async () => {
    getResumen.mockResolvedValue({ data: vacio({ puedeElegir: false }) });
    const w = montar();
    await flushPromises();
    expect(w.find('[data-test="sin-seleccion"]').text()).toContain('Todavía no hay empresas en seguimiento');
    expect(w.find('[data-test="elegir-empresas-vacio"]').exists()).toBe(false);
    expect(w.find('[data-test="elegir-empresas"]').exists()).toBe(false);
    w.unmount();
  });

  it('elegir empresas: marca, guarda solo los cambios y recarga', async () => {
    const w = montar();
    await flushPromises();
    await w.find('[data-test="elegir-empresas"]').trigger('click');
    await flushPromises();

    const modal = w.find('[data-test="modal-elegir-empresas"]');
    expect(modal.text()).toContain('Última aptitud: 01-09-2026 · 12 trabajadores activos');
    expect(modal.text()).toContain('Sin aptitudes · 3 trabajadores activos');
    expect(w.find('[data-test="contador"]').text()).toBe('1 seleccionada');

    await w.find('[data-test="casilla-b"]').trigger('change');
    expect(w.find('[data-test="contador"]').text()).toBe('2 seleccionadas');
    await w.find('[data-test="guardar"]').trigger('click');
    await flushPromises();

    expect(actualizarEmpresas).toHaveBeenCalledWith([{ idEmpresa: 'b', seleccionada: true }]);
    expect(getResumen).toHaveBeenCalledTimes(2);
    expect(w.find('[data-test="modal-elegir-empresas"]').exists()).toBe(false);
    w.unmount();
  });

  it('elegir empresas: «Desmarcar todas» actúa sobre lo que muestra el buscador', async () => {
    const w = montar();
    await flushPromises();
    await w.find('[data-test="elegir-empresas"]').trigger('click');
    await flushPromises();
    await w.find('[data-test="buscar-empresa"]').setValue('bod');
    expect(w.findAll('[data-test="empresa-para-elegir"]')).toHaveLength(1);
    await w.find('[data-test="marcar-todas"]').trigger('click');
    await w.find('[data-test="buscar-empresa"]').setValue('');
    await w.find('[data-test="desmarcar-todas"]').trigger('click');
    expect(w.find('[data-test="contador"]').text()).toBe('0 seleccionadas');
    w.unmount();
  });

  it('elegir empresas: guardar sin cambios solo cierra', async () => {
    const w = montar();
    await flushPromises();
    await w.find('[data-test="elegir-empresas"]').trigger('click');
    await flushPromises();
    await w.find('[data-test="guardar"]').trigger('click');
    await flushPromises();
    expect(actualizarEmpresas).not.toHaveBeenCalled();
    expect(w.find('[data-test="modal-elegir-empresas"]').exists()).toBe(false);
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

  it('sin permiso de exportar no hay botón de Excel', async () => {
    getResumen.mockResolvedValue({ data: resumenBase({ puedeExportar: false, puedeElegir: false }) });
    const w = montar();
    await flushPromises();
    expect(w.find('[data-test="exportar"]').exists()).toBe(false);
    expect(w.find('[data-test="elegir-empresas"]').exists()).toBe(false);
    w.unmount();
  });

  it('si no carga, ofrece reintentar', async () => {
    getResumen.mockRejectedValueOnce(new Error('red'));
    const w = montar();
    await flushPromises();
    expect(w.text()).toContain('Reintentar');
    w.unmount();
  });
});
