// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import { plugin, defaultConfig, FormKit } from '@formkit/vue';
import { createInput } from '@formkit/vue';
import CampoFecha from './CampoFecha.vue';
import FormKitFecha from './FormKitFecha.vue';

afterEach(() => {
  document.body.innerHTML = '';
});

const montar = (props: Record<string, unknown> = {}) =>
  mount(CampoFecha, { props: { modelValue: '', ...props }, attachTo: document.body });

const escribir = async (input: HTMLInputElement, valor: string) => {
  input.value = valor;
  input.dispatchEvent(new Event('input'));
  await nextTick();
};

describe('CampoFecha: DD/MM/AAAA sin depender del navegador', () => {
  it('muestra el valor AAAA-MM-DD como DD/MM/AAAA', () => {
    const w = montar({ modelValue: '2026-11-05' });
    expect((w.find('input').element as HTMLInputElement).value).toBe('05/11/2026');
  });

  it('al teclear, las diagonales se ponen solas y la fecha se entrega solo completa', async () => {
    const w = montar();
    const input = w.find('input').element as HTMLInputElement;
    await escribir(input, '0511');
    expect(input.value).toBe('05/11');
    expect(w.emitted('update:modelValue')).toBeUndefined();
    await escribir(input, '05/112026');
    expect(input.value).toBe('05/11/2026');
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['2026-11-05']);
    expect(w.emitted('change')?.at(-1)).toEqual(['2026-11-05']);
  });

  it('a medias o imposible: se marca y al salir se entrega vacía (el texto se queda)', async () => {
    const w = montar({ modelValue: '2026-11-05' });
    const input = w.find('input').element as HTMLInputElement;
    await escribir(input, '31/02/2026');
    expect(input.getAttribute('data-fecha-incompleta')).toBe('true');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    // Mientras escribe no se manda vacío (los filtros no recargan a cada tecla)
    expect(w.emitted('update:modelValue')).toBeUndefined();
    input.dispatchEvent(new Event('blur'));
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['']);
    await w.setProps({ modelValue: '' });
    expect(input.value).toBe('31/02/2026');
  });

  it('borrar todo y salir entrega vacío', async () => {
    const w = montar({ modelValue: '2026-11-05' });
    const input = w.find('input').element as HTMLInputElement;
    await escribir(input, '');
    input.dispatchEvent(new Event('blur'));
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['']);
  });

  it('lo que cambia desde fuera se refleja (p. ej. el formulario que actualiza la fecha)', async () => {
    const w = montar({ modelValue: '2026-11-05' });
    await w.setProps({ modelValue: '1990-05-01' });
    expect((w.find('input').element as HTMLInputElement).value).toBe('01/05/1990');
    await w.setProps({ modelValue: '' });
    expect((w.find('input').element as HTMLInputElement).value).toBe('');
  });

  it('fuera de min/max: se entrega igual que antes y se marca', async () => {
    const w = montar({ min: '2026-01-01', max: '2026-12-31' });
    const input = w.find('input').element as HTMLInputElement;
    await escribir(input, '05/11/2027');
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['2027-11-05']);
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('calendario: se abre con el botón o Alt + ↓, en español, y no deja elegir fuera de rango', async () => {
    const w = montar({ modelValue: '2026-11-05', min: '2026-11-03', max: '2026-11-20' });
    await w.find('input').trigger('keydown', { key: 'ArrowDown', altKey: true });
    expect(w.find('[data-calendario-fecha]').exists()).toBe(true);
    expect(w.find('[data-mes]').text()).toContain('noviembre');
    expect(w.find('[data-dia="2"]').attributes('disabled')).toBeDefined();
    expect(w.find('[data-dia="21"]').attributes('disabled')).toBeDefined();
    await w.find('[data-dia="10"]').trigger('click');
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['2026-11-10']);
    expect(w.find('[data-calendario-fecha]').exists()).toBe(false);
    expect((w.find('input').element as HTMLInputElement).value).toBe('10/11/2026');
  });

  it('el botón del calendario no recibe Tab; desactivado no hay botón', () => {
    expect(montar().find('button').attributes('tabindex')).toBe('-1');
    expect(montar({ disabled: true }).find('button').exists()).toBe(false);
  });
});

describe('FormKit type="date" usa CampoFecha', () => {
  const montarFormKit = (inicial: string) => {
    const valor = ref(inicial);
    const w = mount(
      defineComponent({
        components: { FormKit },
        setup: () => ({ valor }),
        template: `<FormKit type="date" name="fechaNacimiento" label="Fecha de nacimiento"
          min="1926-01-01" max="2009-12-31" v-model="valor" />`,
      }),
      {
        attachTo: document.body,
        global: {
          plugins: [[plugin, defaultConfig({ inputs: { date: createInput(FormKitFecha) } })]],
        },
      },
    );
    return { w, valor };
  };

  it('conserva etiqueta, muestra DD/MM/AAAA y entrega AAAA-MM-DD', async () => {
    const { w, valor } = montarFormKit('1990-05-01');
    await nextTick();
    expect(w.text()).toContain('Fecha de nacimiento');
    const input = w.find('input[data-fecha]').element as HTMLInputElement;
    expect(input.value).toBe('01/05/1990');
    expect(input.getAttribute('type')).toBe('text');
    await escribir(input, '15/08/1985');
    await new Promise((r) => setTimeout(r, 50));
    expect(valor.value).toBe('1985-08-15');
  });
});
