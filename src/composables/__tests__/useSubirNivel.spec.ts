import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { useSubirNivel } from '../useSubirNivel';

const { pedirFocoAlLlegar } = vi.hoisted(() => ({ pedirFocoAlLlegar: vi.fn() }));
vi.mock('@/composables/useNavegacionTarjetas', () => ({ pedirFocoAlLlegar }));

const Vacia = { render: () => h('div') };

async function montar(ruta: string) {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'inicio', component: Vacia },
      { path: '/empresas', name: 'empresas', component: Vacia },
      { path: '/empresas/:idEmpresa/centros-trabajo', name: 'centros-trabajo', component: Vacia },
      { path: '/empresas/:idEmpresa/centros-trabajo/:idCentroTrabajo/trabajadores', name: 'trabajadores', component: Vacia },
      {
        path: '/empresas/:idEmpresa/centros-trabajo/:idCentroTrabajo/expediente-medico/:idTrabajador',
        name: 'expediente-medico',
        component: Vacia,
      },
      { path: '/modulos-funciones', name: 'modulos-funciones', component: Vacia },
    ],
  });
  await router.push(ruta);
  await router.isReady();
  const Layout = defineComponent({
    setup() {
      useSubirNivel();
      return () => h('div');
    },
  });
  const w = mount(Layout, { global: { plugins: [router] }, attachTo: document.body });
  return { w, router };
}

const atajo = (opciones: KeyboardEventInit = {}) =>
  (document.activeElement ?? document.body).dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Backspace', altKey: true, bubbles: true, cancelable: true, ...opciones }),
  );

describe('useSubirNivel', () => {
  beforeEach(() => {
    sessionStorage.clear();
    pedirFocoAlLlegar.mockClear();
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('del expediente sube a la tabla y deja marcado al trabajador', async () => {
    const { w, router } = await montar('/empresas/e1/centros-trabajo/c1/expediente-medico/t1');
    atajo();
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('trabajadores');
    expect(router.currentRoute.value.params).toMatchObject({ idEmpresa: 'e1', idCentroTrabajo: 'c1' });
    expect(Object.values({ ...sessionStorage })).toContain('t1');
    w.unmount();
  });

  it('de los trabajadores sube a los centros con el centro enfocado; de centros a empresas', async () => {
    const { w, router } = await montar('/empresas/e1/centros-trabajo/c1/trabajadores');
    atajo();
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('centros-trabajo');
    expect(pedirFocoAlLlegar).toHaveBeenLastCalledWith('c1');
    atajo();
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('empresas');
    expect(pedirFocoAlLlegar).toHaveBeenLastCalledWith('e1');
    atajo();
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('inicio');
    w.unmount();
  });

  it('sin padre, en un campo de texto, con una ventana abierta o sin Alt no hace nada', async () => {
    const { w, router } = await montar('/modulos-funciones');
    atajo();
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('modulos-funciones');
    w.unmount();

    const otro = await montar('/empresas');
    const campo = document.createElement('input');
    document.body.appendChild(campo);
    campo.focus();
    atajo();
    await flushPromises();
    expect(otro.router.currentRoute.value.name).toBe('empresas');

    campo.blur();
    atajo({ altKey: false });
    await flushPromises();
    expect(otro.router.currentRoute.value.name).toBe('empresas');

    const ventana = document.createElement('div');
    ventana.setAttribute('aria-modal', 'true');
    document.body.appendChild(ventana);
    atajo();
    await flushPromises();
    expect(otro.router.currentRoute.value.name).toBe('empresas');
    otro.w.unmount();
  });
});
