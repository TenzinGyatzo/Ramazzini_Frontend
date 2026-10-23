import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '@/stores/user';
import { useInventarioStore } from '@/stores/inventario';
import { useIncapacidadesStore } from '@/stores/incapacidades';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';

const {
  getEstado,
  actualizarSemaforizacion,
  actualizarConfiguracionFirma,
  updateConfiguracionInventario,
  getConfiguracionInventario,
  getCentros,
  updateCentros,
  actualizarIncapacidades,
  getEmpresasIncapacidades,
  updateEmpresasIncapacidades,
  getIncapacidades,
  actualizarColorInforme,
} = vi.hoisted(() => ({
  getEstado: vi.fn(),
  actualizarSemaforizacion: vi.fn(),
  actualizarConfiguracionFirma: vi.fn(),
  updateConfiguracionInventario: vi.fn(),
  getConfiguracionInventario: vi.fn(),
  getCentros: vi.fn(),
  updateCentros: vi.fn(),
  actualizarIncapacidades: vi.fn(),
  getEmpresasIncapacidades: vi.fn(),
  updateEmpresasIncapacidades: vi.fn(),
  getIncapacidades: vi.fn(),
  actualizarColorInforme: vi.fn(),
}));
vi.mock('@/api/ModulosFuncionesAPI', () => ({
  default: {
    getEstado,
    actualizarSemaforizacion,
    actualizarIncapacidades,
    getEmpresasIncapacidades,
    updateEmpresasIncapacidades,
    getIncapacidades,
    actualizarColorInforme,
  },
}));
vi.mock('@/api/FormatosFirmadosAPI', () => ({ default: { actualizarConfiguracion: actualizarConfiguracionFirma } }));
vi.mock('@/api/InventarioAPI', () => ({
  default: {
    updateConfiguracion: updateConfiguracionInventario,
    getConfiguracion: getConfiguracionInventario,
    getCentros,
    updateCentros,
  },
}));

/** Dos empresas y tres centros; solo Planta lleva inventario. */
const centrosInventario = (plantaActiva = true, oficinasActivas = false) => [
  {
    idEmpresa: 'e1',
    nombreEmpresa: 'Aceros del Norte',
    centros: [
      { idCentroTrabajo: 'c1', nombreCentro: 'Planta Tijuana', inventarioHabilitado: plantaActiva, numeroTrabajadores: 312 },
      { idCentroTrabajo: 'c2', nombreCentro: 'Oficinas', inventarioHabilitado: oficinasActivas, numeroTrabajadores: 48 },
    ],
  },
  {
    idEmpresa: 'e2',
    nombreEmpresa: 'Agrícola del Valle',
    centros: [{ idCentroTrabajo: 'c3', nombreCentro: 'Campo 3', inventarioHabilitado: false, numeroTrabajadores: 1 }],
  },
];

import ModulosFuncionesView from './ModulosFuncionesView.vue';

const ESTADO = {
  firmaEnPantallaHabilitada: true,
  semaforizacionActivada: false,
  inventarioHabilitado: false,
  inventarioControlaAntidoping: false,
  incapacidadesDisponible: false,
  incapacidadesHabilitado: false,
  colorInforme: '#343A40',
};

/** Dos empresas; solo Bimbo gestiona incapacidades. */
const empresasIncapacidades = (acerosActiva = false) => [
  { idEmpresa: 'e1', nombreEmpresa: 'Aceros del Norte', incapacidadesHabilitado: acerosActiva, numeroTrabajadores: 360 },
  { idEmpresa: 'e2', nombreEmpresa: 'Bimbo', incapacidadesHabilitado: true, numeroTrabajadores: 1 },
];
const toast = { open: vi.fn() };

function montar() {
  return mount(ModulosFuncionesView, {
    global: {
      provide: { toast },
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
        ModalOrdenDocumentos: { props: ['visible'], template: '<div data-modal-orden :data-visible="visible"></div>' },
      },
    },
  });
}

const interruptor = (w: ReturnType<typeof montar>, cual: string) => w.find(`[data-interruptor="${cual}"] [role="switch"]`);

describe('ModulosFuncionesView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    useUserStore().user = { _id: 'u1', role: 'Principal' } as any;
    getEstado.mockResolvedValue({ data: { ...ESTADO } });
    getCentros.mockResolvedValue({ data: centrosInventario() });
    getConfiguracionInventario.mockResolvedValue({ data: { inventarioHabilitado: true, centrosConInventario: ['c1'] } });
  });

  it('muestra primero las funciones y después los módulos, con su estado', async () => {
    const w = montar();
    await flushPromises();
    const secciones = w.findAll('h2').map((h) => h.text());
    expect(secciones[0]).toMatch(/^Funciones/);
    expect(secciones[2]).toMatch(/^Módulos/);
    expect(w.findAll('[data-interruptor]').map((t) => t.attributes('data-interruptor'))).toEqual([
      'firma',
      'semaforizacion',
      'inventario',
    ]);
    expect(interruptor(w, 'firma').attributes('aria-checked')).toBe('true');
    expect(interruptor(w, 'semaforizacion').attributes('aria-checked')).toBe('false');
  });

  it('cada interruptor se guarda al instante por su ruta', async () => {
    actualizarSemaforizacion.mockResolvedValue({ data: { ...ESTADO, semaforizacionActivada: true } });
    actualizarConfiguracionFirma.mockResolvedValue({ data: { firmaEnPantallaHabilitada: false } });
    updateConfiguracionInventario.mockResolvedValue({ data: { inventarioHabilitado: true } });
    const w = montar();
    await flushPromises();

    await interruptor(w, 'semaforizacion').trigger('click');
    await flushPromises();
    expect(actualizarSemaforizacion).toHaveBeenCalledWith(true);
    expect(interruptor(w, 'semaforizacion').attributes('aria-checked')).toBe('true');

    await interruptor(w, 'firma').trigger('click');
    await flushPromises();
    expect(actualizarConfiguracionFirma).toHaveBeenCalledWith({ firmaEnPantallaHabilitada: false });

    await interruptor(w, 'inventario').trigger('click');
    await flushPromises();
    expect(updateConfiguracionInventario).toHaveBeenCalledWith({ inventarioHabilitado: true });
    expect(useInventarioStore().habilitado).toBe(true);
    expect(w.find('[data-interruptor="inventario"]').text()).toContain('Catálogo de insumos');
  });

  it('si falla, se queda como estaba y lo avisa', async () => {
    actualizarSemaforizacion.mockRejectedValue({ response: { data: { message: 'Sin permiso' } } });
    const w = montar();
    await flushPromises();
    await interruptor(w, 'semaforizacion').trigger('click');
    await flushPromises();
    expect(interruptor(w, 'semaforizacion').attributes('aria-checked')).toBe('false');
    expect(toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('quien no es Principal la ve, pero no cambia nada', async () => {
    useUserStore().user = { _id: 'u2', role: 'Médico' } as any;
    const w = montar();
    await flushPromises();
    expect(interruptor(w, 'firma').attributes('disabled')).toBeDefined();
    expect(w.text()).toContain('Solo el usuario Principal los cambia');
  });

  describe('inventario por centro de trabajo', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('varios clics salen en una sola petición; si falla, regresan', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      conInventario();
      updateCentros.mockRejectedValue({ response: { data: { message: 'Sin conexión' } } });
      const w = montar();
      await flushPromises();
      await w.findAll('button').find((b) => b.text() === 'Elegir centros')!.trigger('click');
      await w.find('[data-centro="c2"]').trigger('change');
      await w.find('[data-centro="c3"]').trigger('change');
      await w.find('[data-centro="c1"]').trigger('change');
      expect(w.find('[data-interruptor="inventario"]').text()).toContain('En 2 de 3 centros de trabajo');
      vi.advanceTimersByTime(1000);
      await flushPromises();
      expect(updateCentros).toHaveBeenCalledTimes(1);
      expect(updateCentros).toHaveBeenCalledWith([
        { idCentroTrabajo: 'c2', inventarioHabilitado: true },
        { idCentroTrabajo: 'c3', inventarioHabilitado: true },
        { idCentroTrabajo: 'c1', inventarioHabilitado: false },
      ]);
      expect(w.find('[data-interruptor="inventario"]').text()).toContain('En 1 de 3 centros de trabajo');
      expect((w.find('[data-centro="c1"]').element as HTMLInputElement).checked).toBe(true);
      expect(toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });

    it('al salir de la página, lo pendiente se manda en ese momento', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      conInventario();
      updateCentros.mockResolvedValue({ data: centrosInventario(true, true) });
      const w = montar();
      await flushPromises();
      await w.findAll('button').find((b) => b.text() === 'Elegir centros')!.trigger('click');
      await w.find('[data-centro="c2"]').trigger('change');
      w.unmount();
      await flushPromises();
      expect(updateCentros).toHaveBeenCalledWith([{ idCentroTrabajo: 'c2', inventarioHabilitado: true }]);
    });

    const conInventario = () => getEstado.mockResolvedValue({ data: { ...ESTADO, inventarioHabilitado: true } });

    it('dice en cuántos centros está y deja elegirlos con búsqueda', async () => {
      conInventario();
      const w = montar();
      await flushPromises();
      const tarjeta = w.find('[data-interruptor="inventario"]');
      expect(tarjeta.text()).toContain('En 1 de 3 centros de trabajo');

      await tarjeta.findAll('button').find((b) => b.text() === 'Elegir centros')!.trigger('click');
      const filas = () =>
        w.findAll('.modulos-funciones__fila').map((f) => [
          f.find('.modulos-funciones__fila-etiqueta').text(),
          f.find('.modulos-funciones__fila-dato').text(),
        ]);
      expect(filas()).toEqual([
        ['Aceros del Norte · Planta Tijuana', '312 trabajadores'],
        ['Aceros del Norte · Oficinas', '48 trabajadores'],
        ['Agrícola del Valle · Campo 3', '1 trabajador'],
      ]);

      await w.find('.modulos-funciones__buscar').setValue('agricola');
      expect(filas()).toEqual([['Agrícola del Valle · Campo 3', '1 trabajador']]);
    });

    it('marcar un centro se ve al instante y se manda un segundo después, con lo que ve el resto de la app', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      conInventario();
      updateCentros.mockResolvedValue({ data: centrosInventario(true, true) });
      getConfiguracionInventario.mockResolvedValue({ data: { inventarioHabilitado: true, centrosConInventario: ['c1', 'c2'] } });
      const w = montar();
      await flushPromises();
      await w.findAll('button').find((b) => b.text() === 'Elegir centros')!.trigger('click');

      await w.find('[data-centro="c2"]').trigger('change');
      expect(w.find('[data-interruptor="inventario"]').text()).toContain('En 2 de 3 centros de trabajo');
      expect(updateCentros).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      await flushPromises();
      expect(updateCentros).toHaveBeenCalledWith([{ idCentroTrabajo: 'c2', inventarioHabilitado: true }]);
      expect(w.find('[data-interruptor="inventario"]').text()).toContain('En 2 de 3 centros de trabajo');
      expect(useInventarioStore().llevaInventario('c2')).toBe(true);
      expect(useInventarioStore().llevaInventario('c3')).toBe(false);
    });

    it('al encenderlo sin centros elegidos, abre la lista y lo pide', async () => {
      getCentros.mockResolvedValue({ data: centrosInventario(false) });
      updateConfiguracionInventario.mockResolvedValue({ data: { inventarioHabilitado: true, centrosConInventario: [] } });
      const w = montar();
      await flushPromises();
      await interruptor(w, 'inventario').trigger('click');
      await flushPromises();
      expect(w.find('[data-interruptor="inventario"]').text()).toContain('Elige los centros de trabajo');
      expect(w.find('.modulos-funciones__panel').exists()).toBe(true);
    });

    it('el descuento del antidoping se cambia desde la misma tarjeta', async () => {
      conInventario();
      updateConfiguracionInventario.mockResolvedValue({ data: { inventarioHabilitado: true, inventarioControlaAntidoping: true, centrosConInventario: ['c1'] } });
      const w = montar();
      await flushPromises();
      await w.findAll('button').find((b) => b.text() === 'Elegir centros')!.trigger('click');
      await w.find('.modulos-funciones__antidoping input').trigger('change');
      await flushPromises();
      expect(updateConfiguracionInventario).toHaveBeenCalledWith({ inventarioControlaAntidoping: true });
    });

    it('quien no es Principal no consulta la lista de centros', async () => {
      conInventario();
      useUserStore().user = { _id: 'u2', role: 'Médico' } as any;
      const w = montar();
      await flushPromises();
      expect(getCentros).not.toHaveBeenCalled();
      expect(w.find('[data-interruptor="inventario"]').text()).not.toContain('Elegir centros');
    });
  });

  describe('incapacidades por empresa', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    const enMexico = (habilitado = true) =>
      getEstado.mockResolvedValue({
        data: { ...ESTADO, incapacidadesDisponible: true, incapacidadesHabilitado: habilitado },
      });

    it('fuera de México la tarjeta no aparece', async () => {
      const w = montar();
      await flushPromises();
      expect(w.find('[data-interruptor="incapacidades"]').exists()).toBe(false);
    });

    it('dice en cuántas empresas está y deja elegirlas con búsqueda', async () => {
      enMexico();
      getEmpresasIncapacidades.mockResolvedValue({ data: empresasIncapacidades() });
      const w = montar();
      await flushPromises();
      const tarjeta = w.find('[data-interruptor="incapacidades"]');
      expect(tarjeta.text()).toContain('En 1 de 2 empresas');

      await tarjeta.findAll('button').find((b) => b.text() === 'Elegir empresas')!.trigger('click');
      const filas = () =>
        w.findAll('[data-interruptor="incapacidades"] .modulos-funciones__fila').map((f) => [
          f.find('.modulos-funciones__fila-etiqueta').text(),
          f.find('.modulos-funciones__fila-dato').text(),
        ]);
      expect(filas()).toEqual([
        ['Aceros del Norte', '360 trabajadores'],
        ['Bimbo', '1 trabajador'],
      ]);
      await w.find('[data-interruptor="incapacidades"] .modulos-funciones__buscar').setValue('bimbo');
      expect(filas()).toEqual([['Bimbo', '1 trabajador']]);
    });

    it('marcar una empresa se ve al instante y se manda un segundo después, con lo que ve el resto de la app', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      enMexico();
      getEmpresasIncapacidades.mockResolvedValue({ data: empresasIncapacidades() });
      updateEmpresasIncapacidades.mockResolvedValue({ data: empresasIncapacidades(true) });
      getIncapacidades.mockResolvedValue({
        data: { incapacidadesDisponible: true, incapacidadesHabilitado: true, empresasConIncapacidades: ['e1', 'e2'] },
      });
      const w = montar();
      await flushPromises();
      await w.findAll('button').find((b) => b.text() === 'Elegir empresas')!.trigger('click');
      await w.find('[data-empresa="e1"]').trigger('change');
      expect(w.find('[data-interruptor="incapacidades"]').text()).toContain('En 2 de 2 empresas');
      expect(updateEmpresasIncapacidades).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      await flushPromises();
      expect(updateEmpresasIncapacidades).toHaveBeenCalledWith([{ idEmpresa: 'e1', incapacidadesHabilitado: true }]);
      expect(w.find('[data-interruptor="incapacidades"]').text()).toContain('En 2 de 2 empresas');
      expect(useIncapacidadesStore().gestionaEnEmpresa('e1')).toBe(true);
      expect(useIncapacidadesStore().gestionaEnEmpresa('e3')).toBe(false);
    });

    it('al encenderlo sin empresas elegidas, abre la lista y lo pide', async () => {
      enMexico(false);
      actualizarIncapacidades.mockResolvedValue({
        data: { incapacidadesDisponible: true, incapacidadesHabilitado: true, empresasConIncapacidades: [] },
      });
      getEmpresasIncapacidades.mockResolvedValue({
        data: empresasIncapacidades().map((e) => ({ ...e, incapacidadesHabilitado: false })),
      });
      const w = montar();
      await flushPromises();
      await interruptor(w, 'incapacidades').trigger('click');
      await flushPromises();
      expect(actualizarIncapacidades).toHaveBeenCalledWith(true);
      expect(useIncapacidadesStore().habilitado).toBe(true);
      const tarjeta = w.find('[data-interruptor="incapacidades"]');
      expect(tarjeta.text()).toContain('Elige las empresas');
      expect(tarjeta.find('.modulos-funciones__panel').exists()).toBe(true);
    });
  });

  describe('informes y expediente', () => {
    it('va entre las funciones y los módulos', async () => {
      const w = montar();
      await flushPromises();
      expect(w.findAll('h2').map((h) => h.text().split(' ·')[0])).toEqual([
        'Funciones',
        'Informes y expediente',
        'Módulos',
      ]);
    });

    it('el color se guarda al instante, cambia la vista previa y el resto de la sesión', async () => {
      useProveedorSaludStore().proveedorSalud = { _id: 'p1', colorInforme: '#343A40' } as any;
      actualizarColorInforme.mockResolvedValue({ data: { ...ESTADO, colorInforme: '#1E7E34' } });
      const w = montar();
      await flushPromises();
      expect(w.find('[data-nombre-color]').text()).toBe('Gris Oscuro');

      await w.find('[data-color="#1E7E34"]').trigger('click');
      await flushPromises();
      expect(actualizarColorInforme).toHaveBeenCalledWith('#1E7E34');
      expect(w.find('[data-color="#1E7E34"]').attributes('aria-checked')).toBe('true');
      expect(w.find('[data-nombre-color]').text()).toBe('Verde Oscuro');
      expect(w.find('.modulos-funciones__vista-previa-titulo').attributes('style')).toContain('rgb(30, 126, 52)');
      expect((useProveedorSaludStore().proveedorSalud as any).colorInforme).toBe('#1E7E34');
    });

    it('si falla, se queda el color anterior', async () => {
      actualizarColorInforme.mockRejectedValue({ response: { data: { message: 'Sin permiso' } } });
      const w = montar();
      await flushPromises();
      await w.find('[data-color="#1E7E34"]').trigger('click');
      await flushPromises();
      expect(w.find('[data-nombre-color]').text()).toBe('Gris Oscuro');
      expect(toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });

    it('quien no es Principal ve el color, pero no lo cambia', async () => {
      useUserStore().user = { _id: 'u2', role: 'Médico' } as any;
      const w = montar();
      await flushPromises();
      expect(w.find('[data-color="#1E7E34"]').attributes('disabled')).toBeDefined();
    });

    it('resume el orden de los documentos y abre el mismo modal del expediente', async () => {
      useProveedorSaludStore().proveedorSalud = { _id: 'p1' } as any;
      const w = montar();
      await flushPromises();
      const tarjeta = w.find('[data-ajuste="orden"]');
      expect(tarjeta.find('[data-orden-resumen]').text()).toMatch(/^1\. .+ · 2\. .+ · 3\. .+ · y \d+ más$/);
      expect(tarjeta.text()).toContain('Orden de fábrica');

      expect(w.find('[data-modal-orden]').attributes('data-visible')).toBe('false');
      await tarjeta.findAll('button').find((b) => b.text() === 'Cambiar orden')!.trigger('click');
      expect(w.find('[data-modal-orden]').attributes('data-visible')).toBe('true');
    });
  });
});
