// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { vValorDePartida } from './valorDePartida';
import { valorDePartida } from '@/helpers/valorDePartida';

const Campo = defineComponent({
  directives: { valorDePartida: vValorDePartida },
  setup() {
    const peso = ref<number | string | null>(null);
    return { peso };
  },
  template: `<input type="number" min="30" max="400" step="0.1" v-model="peso" v-valor-de-partida="80" />`,
});

describe('v-valor-de-partida', () => {
  it('con el campo vacío, la primera flecha del teclado pone el valor de partida', async () => {
    const wrapper = mount(Campo, { attachTo: document.body });
    const input = wrapper.find('input');
    await input.trigger('focus');
    await input.trigger('keydown', { key: 'ArrowUp' });
    expect((input.element as HTMLInputElement).value).toBe('80');
    expect(wrapper.vm.peso).toBe(80);
    wrapper.unmount();
  });

  it('las flechitas del campo vacío dan el valor de partida, no el mínimo', async () => {
    const wrapper = mount(Campo, { attachTo: document.body });
    const el = wrapper.find('input').element as HTMLInputElement;
    el.dispatchEvent(new Event('focus'));
    // Lo que hace el navegador: pone el mínimo y avisa con un evento input sin tecleo
    el.value = '30';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    expect(el.value).toBe('80');
    expect(wrapper.vm.peso).toBe(80);
    wrapper.unmount();
  });

  it('un valor que no viene de las flechitas no se toca', async () => {
    const wrapper = mount(Campo, { attachTo: document.body });
    const el = wrapper.find('input').element as HTMLInputElement;
    el.dispatchEvent(new Event('focus'));
    el.value = '81';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    expect(el.value).toBe('81');
    wrapper.unmount();
  });

  it('con valor, las flechas funcionan normal; lo tecleado no se toca', async () => {
    const wrapper = mount(Campo, { attachTo: document.body });
    const el = wrapper.find('input').element as HTMLInputElement;
    el.dispatchEvent(new Event('focus'));
    el.value = '7';
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '7' }));
    expect(el.value).toBe('7');
    // Ya con valor, una flecha no se intercepta
    const evento = new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true });
    el.value = '72';
    el.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(false);
    wrapper.unmount();
  });

  it('mientras nadie lo toca, el campo sigue vacío', () => {
    const wrapper = mount(Campo, { attachTo: document.body });
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('');
    expect(wrapper.vm.peso).toBeNull();
    wrapper.unmount();
  });
});

describe('valorDePartida', () => {
  it('peso, altura y cintura según el sexo; el resto igual para todos', () => {
    expect(valorDePartida('peso', 'Masculino')).toBe(80);
    expect(valorDePartida('peso', 'Femenino')).toBe(68);
    expect(valorDePartida('altura', 'Femenino')).toBe(1.6);
    expect(valorDePartida('circunferenciaCintura', undefined)).toBe(90);
    expect(valorDePartida('saturacionOxigeno', 'Femenino')).toBe(98);
  });
});
