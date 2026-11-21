// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, Transition } from 'vue';
import { useAnchoElemento } from '@/composables/useAnchoElemento';

afterEach(() => vi.restoreAllMocks());

describe('useAnchoElemento', () => {
  it('mide el elemento aunque aparezca después dentro de una transición', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 900 } as DOMRect);
    const listo = ref(false);
    let ancho = ref(0);
    const Vista = defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null);
        ancho = useAnchoElemento(el);
        return () =>
          h(Transition, { appear: true, mode: 'out-in' }, () => (listo.value ? h('div', { ref: el }) : null));
      },
    });
    mount(Vista, { attachTo: document.body });
    expect(ancho.value).toBe(0);
    listo.value = true;
    await nextTick();
    await nextTick();
    expect(ancho.value).toBe(900);
  });
});
