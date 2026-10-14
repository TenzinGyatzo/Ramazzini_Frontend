import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { useSalidaConCambios } from './useSalidaConCambios';

const hayCambios = ref(false);
let api: ReturnType<typeof useSalidaConCambios>;

const Pantalla = defineComponent({
  setup() {
    api = useSalidaConCambios(hayCambios);
    return () => h('div', 'pantalla');
  },
});

async function montar() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Pantalla },
      { path: '/otra', component: { render: () => h('div', 'otra') } },
    ],
  });
  await router.push('/');
  await router.isReady();
  mount({ render: () => h(RouterView) }, { global: { plugins: [router] } });
  return router;
}

describe('useSalidaConCambios', () => {
  it('sin cambios sale sin preguntar', async () => {
    hayCambios.value = false;
    const router = await montar();
    await router.push('/otra');
    expect(router.currentRoute.value.path).toBe('/otra');
  });

  it('con cambios pregunta; «Seguir editando» se queda', async () => {
    hayCambios.value = true;
    const router = await montar();
    const navegacion = router.push('/otra');
    await flushPromises();
    expect(api.mostrarConfirmacion.value).toBe(true);

    api.responderDescarte(false);
    await navegacion;
    expect(router.currentRoute.value.path).toBe('/');
    expect(api.mostrarConfirmacion.value).toBe(false);
  });

  it('con cambios pregunta; «Descartar» sale', async () => {
    hayCambios.value = true;
    const router = await montar();
    const navegacion = router.push('/otra');
    await flushPromises();

    api.responderDescarte(true);
    await navegacion;
    expect(router.currentRoute.value.path).toBe('/otra');
  });

  it('al cerrar la pestaña con cambios el navegador avisa', async () => {
    hayCambios.value = true;
    await montar();
    const evento = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);
  });
});
