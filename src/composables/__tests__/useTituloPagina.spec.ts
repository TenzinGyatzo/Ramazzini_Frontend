import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter, RouterView, useRoute } from 'vue-router';
import { useTituloPagina } from '@/composables/useTituloPagina';
import { inicialesTrabajador, tituloDeRuta } from '@/helpers/tituloPagina';

const nombres = reactive<Record<string, { nombre: string; primerApellido: string }>>({
  a: { nombre: 'JUAN', primerApellido: 'PÉREZ' },
  b: { nombre: 'ANA', primerApellido: 'LÓPEZ' },
});

const Expediente = defineComponent({
  setup() {
    const route = useRoute();
    useTituloPagina(() => [inicialesTrabajador(nombres[String(route.params.id)]), 'Expediente']);
    return () => h('div');
  },
});

describe('useTituloPagina', () => {
  it('el título de la vista gana al de la sección y sigue al trabajador de la dirección', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'inicio', component: { render: () => h('div') } },
        { path: '/exp/:id', name: 'expediente-medico', component: Expediente },
      ],
    });
    // Igual que el router de la app: título de la sección en cada navegación
    router.afterEach((to) => {
      document.title = tituloDeRuta(to.name);
    });
    const wrapper = mount({ render: () => h(RouterView) }, { global: { plugins: [router] } });

    await router.push('/');
    await flushPromises();
    expect(document.title).toBe('Inicio — Ramazzini');

    await router.push('/exp/a');
    await flushPromises();
    await nextTick();
    expect(document.title).toBe('P.J. · Expediente — Ramazzini');

    // Misma vista, otro trabajador
    await router.push('/exp/b');
    await flushPromises();
    await nextTick();
    expect(document.title).toBe('L.A. · Expediente — Ramazzini');

    await router.push('/');
    await flushPromises();
    await nextTick();
    expect(document.title).toBe('Inicio — Ramazzini');
    wrapper.unmount();
  });
});
