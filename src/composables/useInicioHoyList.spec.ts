import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '@/stores/user';
import {
  CACHE_TTL_MS,
  inicioResumenState,
  invalidateInicioResumenCache,
} from '@/composables/inicioResumenCache';
import { INICIO_HOY_PAGE_SIZE, useInicioHoyList } from './useInicioHoyList';

const getHoyTrabajadores = vi.fn();
const getHoyDocumentos = vi.fn();
const getHoyCentros = vi.fn();

vi.mock('@/api/InicioAPI', () => ({
  default: {
    getHoyTrabajadores: (...args: unknown[]) => getHoyTrabajadores(...args),
    getHoyDocumentos: (...args: unknown[]) => getHoyDocumentos(...args),
    getHoyCentros: (...args: unknown[]) => getHoyCentros(...args),
  },
}));

function workerItem(index: number) {
  return {
    idEmpresa: 'e1',
    idCentroTrabajo: 'c1',
    idTrabajador: `t${index}`,
    nombreTrabajador: `Trabajador ${index}`,
    nombreComercial: 'Empresa Demo',
    nombreCentro: 'Planta Norte',
    etiquetaTipo: 'Historia clínica',
    ultimaActividad: '2026-08-28T16:00:00.000Z',
  };
}

function seedResumen(
  overrides: Record<string, unknown> = {},
) {
  inicioResumenState.resumen.value = {
    hasActivity: true,
    activityScope: 'user',
    regimen: 'SIRES_NOM024',
    dateKey: '2026-08-28',
    hoy: { trabajadoresUnicos: 1, documentosCreados: 1 },
    clientesRecientes: [],
    expedientesRecientes: [],
    atencion: [],
    pendientes: [],
    consejo: null,
    ...overrides,
  } as any;
}

function mountComposable() {
  const Comp = defineComponent({
    setup() {
      return useInicioHoyList();
    },
    template: '<div />',
  });
  return mount(Comp);
}

describe('useInicioHoyList', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    invalidateInicioResumenCache();
    getHoyTrabajadores.mockReset();
    getHoyDocumentos.mockReset();
    getHoyCentros.mockReset();
    const userStore = useUserStore();
    userStore.user = {
      _id: 'u1',
      username: 'edgar',
      email: 'e@test.com',
      role: 'Médico',
      idProveedorSalud: 'p1',
    } as any;
    seedResumen();
  });

  it('pide el listado una vez y pagina en local sin nuevo GET', async () => {
    const items = Array.from({ length: 16 }, (_, i) => workerItem(i + 1));
    getHoyTrabajadores.mockResolvedValue({
      data: { items, total: 16, truncated: false },
    });

    const wrapper = mountComposable();
    const vm = wrapper.vm as any;
    await vm.open('trabajadores');
    await flushPromises();

    expect(getHoyTrabajadores).toHaveBeenCalledTimes(1);
    expect(vm.pageTrabajadores).toHaveLength(INICIO_HOY_PAGE_SIZE);
    expect(vm.rangeLabel).toBe('Mostrando 1–15 de 16');

    vm.nextPage();
    expect(getHoyTrabajadores).toHaveBeenCalledTimes(1);
    expect(vm.page).toBe(2);
    expect(vm.pageTrabajadores).toHaveLength(1);
    expect(vm.rangeLabel).toBe('Mostrando 16–16 de 16');

    await vm.open('trabajadores');
    await flushPromises();
    expect(getHoyTrabajadores).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('vuelve a pedir tras expirar el TTL o cambiar dateKey/proveedor', async () => {
    vi.useFakeTimers();
    getHoyTrabajadores.mockResolvedValue({
      data: { items: [workerItem(1)], total: 1, truncated: false },
    });

    const wrapper = mountComposable();
    const vm = wrapper.vm as any;
    await vm.open('trabajadores');
    await flushPromises();
    expect(getHoyTrabajadores).toHaveBeenCalledTimes(1);

    await vm.open('trabajadores');
    await flushPromises();
    expect(getHoyTrabajadores).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(CACHE_TTL_MS);
    await vm.open('trabajadores');
    await flushPromises();
    expect(getHoyTrabajadores).toHaveBeenCalledTimes(2);

    seedResumen({ dateKey: '2026-08-29' });
    await vm.open('trabajadores');
    await flushPromises();
    expect(getHoyTrabajadores).toHaveBeenCalledTimes(3);

    seedResumen({ dateKey: '2026-08-29' });
    useUserStore().user = {
      ...useUserStore().user,
      idProveedorSalud: 'p2',
    } as any;
    await vm.open('trabajadores');
    await flushPromises();
    expect(getHoyTrabajadores).toHaveBeenCalledTimes(4);

    wrapper.unmount();
    vi.useRealTimers();
  });

  it('expone error y permite reintentar', async () => {
    getHoyTrabajadores
      .mockRejectedValueOnce({ message: 'red caída' })
      .mockResolvedValueOnce({
        data: { items: [workerItem(1)], total: 1, truncated: false },
      });

    const wrapper = mountComposable();
    const vm = wrapper.vm as any;
    await vm.open('trabajadores');
    await flushPromises();
    expect(vm.error).toBe('red caída');
    expect(vm.loading).toBe(false);

    await vm.open('trabajadores');
    await flushPromises();
    expect(vm.error).toBeNull();
    expect(vm.pageTrabajadores).toHaveLength(1);
    wrapper.unmount();
  });

  it('no llama centros desde el composable de documentos', async () => {
    getHoyDocumentos.mockResolvedValue({
      data: { items: [], total: 0, truncated: false },
    });
    const wrapper = mountComposable();
    await (wrapper.vm as any).open('documentos');
    await flushPromises();
    expect(getHoyDocumentos).toHaveBeenCalledTimes(1);
    expect(getHoyCentros).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('invalida el listado al limpiar el caché de resumen (logout)', async () => {
    getHoyTrabajadores.mockResolvedValue({
      data: { items: [workerItem(1)], total: 1, truncated: false },
    });
    const wrapper = mountComposable();
    const vm = wrapper.vm as any;
    await vm.open('trabajadores');
    await flushPromises();
    expect(getHoyTrabajadores).toHaveBeenCalledTimes(1);

    invalidateInicioResumenCache();
    seedResumen();
    await vm.open('trabajadores');
    await flushPromises();
    expect(getHoyTrabajadores).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });
});
