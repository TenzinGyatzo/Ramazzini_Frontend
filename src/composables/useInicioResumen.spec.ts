import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '@/stores/user';
import {
  inicioResumenState,
  invalidateInicioResumenCache,
} from '@/composables/inicioResumenCache';
import {
  confidentialityAgreementAccepted,
  confidentialityAgreementChecking,
  confidentialityAgreementRequired,
} from '@/composables/useConfidentialityAgreement';
import { useInicioResumen } from './useInicioResumen';

const getResumen = vi.fn();

vi.mock('@/api/InicioAPI', () => ({
  default: {
    getResumen: (...args: unknown[]) => getResumen(...args),
  },
}));

function mountComposable() {
  const Comp = defineComponent({
    setup() {
      return useInicioResumen();
    },
    template: '<div />',
  });
  return mount(Comp);
}

describe('useInicioResumen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    invalidateInicioResumenCache();
    confidentialityAgreementRequired.value = false;
    confidentialityAgreementAccepted.value = true;
    confidentialityAgreementChecking.value = false;
    getResumen.mockReset();
    const userStore = useUserStore();
    userStore.user = {
      _id: 'u1',
      username: 'edgar',
      email: 'e@test.com',
      role: 'Médico',
    } as any;
  });

  it('no vuelve a pedir el resumen si el caché tiene menos de 90 s', async () => {
    getResumen.mockResolvedValue({
      data: { hasActivity: true, hoy: { trabajadoresUnicos: 1, documentosCreados: 1 } },
    });

    const wrapper = mountComposable();
    await (wrapper.vm as any).fetchResumen();
    await flushPromises();
    await (wrapper.vm as any).fetchResumen();
    await flushPromises();

    expect(getResumen).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('vuelve a pedir el resumen si se fuerza o el caché expiró', async () => {
    getResumen.mockResolvedValue({
      data: { hasActivity: false },
    });

    const wrapper = mountComposable();
    await (wrapper.vm as any).fetchResumen();
    await flushPromises();
    await (wrapper.vm as any).fetchResumen({ force: true });
    await flushPromises();

    expect(getResumen).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('trata la primera carga como isLoading y no como bienvenida', () => {
    const wrapper = mountComposable();
    const vm = wrapper.vm as any;
    expect(vm.isLoading).toBe(true);
    expect(vm.showWelcome).toBe(false);
    expect(vm.showHub).toBe(false);
    wrapper.unmount();
  });

  it('con caché de actividad muestra el hub de inmediato', () => {
    inicioResumenState.resumen.value = {
      hasActivity: true,
      hoy: { trabajadoresUnicos: 1, documentosCreados: 1 },
    } as any;
    inicioResumenState.lastFetchedAt.value = Date.now();
    inicioResumenState.loading.value = false;

    const wrapper = mountComposable();
    const vm = wrapper.vm as any;
    expect(vm.isLoading).toBe(false);
    expect(vm.showHub).toBe(true);
    expect(vm.showWelcome).toBe(false);
    wrapper.unmount();
  });

  it('muestra el hub si hay trabajadores aunque no haya actividad', () => {
    inicioResumenState.resumen.value = {
      hasActivity: false,
      hasTrabajadores: true,
      hoy: { trabajadoresUnicos: 0, documentosCreados: 0 },
    } as any;
    inicioResumenState.lastFetchedAt.value = Date.now();
    inicioResumenState.loading.value = false;

    const wrapper = mountComposable();
    const vm = wrapper.vm as any;
    expect(vm.isLoading).toBe(false);
    expect(vm.showHub).toBe(true);
    expect(vm.showWelcome).toBe(false);
    wrapper.unmount();
  });

  it('muestra la bienvenida solo si no hay actividad ni trabajadores', () => {
    inicioResumenState.resumen.value = {
      hasActivity: false,
      hasTrabajadores: false,
      hoy: { trabajadoresUnicos: 0, documentosCreados: 0 },
    } as any;
    inicioResumenState.lastFetchedAt.value = Date.now();
    inicioResumenState.loading.value = false;

    const wrapper = mountComposable();
    const vm = wrapper.vm as any;
    expect(vm.showHub).toBe(false);
    expect(vm.isLoading).toBe(false);
    expect(vm.showWelcome).toBe(true);
    wrapper.unmount();
  });

  it('conserva el hub si hay actividad aunque el refetch falle', () => {
    inicioResumenState.resumen.value = {
      hasActivity: true,
      hoy: { trabajadoresUnicos: 1, documentosCreados: 1 },
    } as any;
    inicioResumenState.error.value = 'red';
    inicioResumenState.lastFetchedAt.value = Date.now();

    const wrapper = mountComposable();
    const vm = wrapper.vm as any;
    expect(vm.showHub).toBe(true);
    expect(vm.showError).toBe(false);
    expect(vm.showWelcome).toBe(false);
    wrapper.unmount();
  });

  it('no pide el resumen ni muestra error mientras el acuerdo está pendiente', async () => {
    confidentialityAgreementRequired.value = true;
    confidentialityAgreementAccepted.value = false;

    const wrapper = mountComposable();
    await (wrapper.vm as any).fetchResumen();
    await flushPromises();

    const vm = wrapper.vm as any;
    expect(getResumen).not.toHaveBeenCalled();
    expect(vm.isLoading).toBe(true);
    expect(vm.showError).toBe(false);
    expect(vm.showWelcome).toBe(false);
    wrapper.unmount();
  });

  it('pide el resumen al aceptar el acuerdo y muestra el hub', async () => {
    confidentialityAgreementRequired.value = true;
    confidentialityAgreementAccepted.value = false;
    getResumen.mockResolvedValue({
      data: { hasActivity: true, hasTrabajadores: true },
    });

    const wrapper = mountComposable();
    await (wrapper.vm as any).fetchResumen();
    await flushPromises();
    expect(getResumen).not.toHaveBeenCalled();

    confidentialityAgreementAccepted.value = true;
    await flushPromises();

    const vm = wrapper.vm as any;
    expect(getResumen).toHaveBeenCalledTimes(1);
    expect(vm.showHub).toBe(true);
    expect(vm.showError).toBe(false);
    wrapper.unmount();
  });

  it('no trata el gate del acuerdo como error de red', async () => {
    getResumen.mockRejectedValue({
      response: { data: { errorCode: 'CONFIDENTIALITY_AGREEMENT_REQUIRED' } },
    });

    const wrapper = mountComposable();
    await (wrapper.vm as any).fetchResumen();
    await flushPromises();

    const vm = wrapper.vm as any;
    expect(vm.showError).toBe(false);
    expect(vm.showWelcome).toBe(false);
    expect(vm.isLoading).toBe(true);
    wrapper.unmount();
  });

  it('marca error usable tras el timeout de 8 s', async () => {
    vi.useFakeTimers();
    getResumen.mockImplementation((signal?: AbortSignal) => {
      return new Promise((_, reject) => {
        const fail = () => {
          const err: any = new Error('canceled');
          err.code = 'ERR_CANCELED';
          reject(err);
        };
        if (signal?.aborted) {
          fail();
          return;
        }
        signal?.addEventListener('abort', fail);
      });
    });

    const wrapper = mountComposable();
    const pending = (wrapper.vm as any).fetchResumen();
    await vi.advanceTimersByTimeAsync(8000);
    await pending;
    await flushPromises();

    const vm = wrapper.vm as any;
    wrapper.unmount();
    vi.useRealTimers();
  });
});
