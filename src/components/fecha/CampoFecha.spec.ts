// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import { plugin, defaultConfig, FormKit, createInput } from '@formkit/vue';
import CampoFecha from './CampoFecha.vue';
import FormKitFecha from './FormKitFecha.vue';

afterEach(() => {
  document.body.innerHTML = '';
});

const montar = (props: Record<string, unknown> = {}) =>
  mount(CampoFecha, { props: { modelValue: '', ...props }, attachTo: document.body });

/** Lo que manda el navegador al teclear (antes de escribir). */
const tecla = async (input: HTMLInputElement, data: string | null, inputType = 'insertText') => {
  input.dispatchEvent(new InputEvent('beforeinput', { data, inputType, cancelable: true, bubbles: true }));
  await nextTick();
};
const teclear = async (input: HTMLInputElement, texto: string) => {
  for (const c of texto) await tecla(input, c);
};

describe('CampoFecha: DD/MM/AAAA, se teclea como el campo del navegador', () => {
  it('vacío muestra la plantilla dd/mm/aaaa; con valor, DD/MM/AAAA', () => {
    expect((montar().find('input').element as HTMLInputElement).value).toBe('dd/mm/aaaa');
    expect((montar({ modelValue: '2026-11-05' }).find('input').element as HTMLInputElement).value).toBe(
      '05/11/2026',
    );
  });

  it('cada número reemplaza su letra; la fecha se entrega solo completa', async () => {
    const w = montar();
    const input = w.find('input').element as HTMLInputElement;
    input.focus();
    await teclear(input, '1508');
    expect(input.value).toBe('15/08/aaaa');
    expect(w.emitted('update:modelValue')).toBeUndefined();
    await teclear(input, '1985');
    expect(input.value).toBe('15/08/1985');
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['1985-08-15']);
    expect(w.emitted('change')?.at(-1)).toEqual(['1985-08-15']);
  });

  it('borrar regresa la parte a sus letras (no pone ceros) y no lleva el cursor al final', async () => {
    const w = montar({ modelValue: '2026-11-05' });
    const input = w.find('input').element as HTMLInputElement;
    input.focus();
    await w.find('input').trigger('keydown', { key: 'ArrowRight' });
    await tecla(input, null, 'deleteContentBackward');
    expect(input.value).toBe('05/mm/2026');
    // Queda seleccionada la parte borrada (el mes)
    await nextTick();
    expect([input.selectionStart, input.selectionEnd]).toEqual([3, 5]);
  });

  it('a medias al salir: se entrega vacía y se marca; lo escrito se queda', async () => {
    const w = montar({ modelValue: '2026-11-05' });
    const input = w.find('input').element as HTMLInputElement;
    input.focus();
    await w.find('input').trigger('keydown', { key: 'ArrowRight' });
    await tecla(input, null, 'deleteContentBackward');
    // Mientras se escribe no se manda vacío (los filtros no recargan a cada tecla)
    expect(w.emitted('update:modelValue')).toBeUndefined();
    await w.find('input').trigger('blur');
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['']);
    await w.setProps({ modelValue: '' });
    expect(input.value).toBe('05/mm/2026');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('data-fecha-iso')).toBe('');
  });

  it('← → y Tab recorren día, mes y año; ↑/↓ suben o bajan la parte', async () => {
    const w = montar({ modelValue: '2026-11-05' });
    const input = w.find('input').element as HTMLInputElement;
    input.focus();
    await w.find('input').trigger('keydown', { key: 'Tab' });
    await w.find('input').trigger('keydown', { key: 'ArrowUp' });
    expect(input.value).toBe('05/12/2026');
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['2026-12-05']);
    // Tab en el año sale del campo (no se intercepta)
    await w.find('input').trigger('keydown', { key: 'Tab' });
    const salir = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
    input.dispatchEvent(salir);
    expect(salir.defaultPrevented).toBe(false);
  });

  it('lo que cambia desde fuera se refleja', async () => {
    const w = montar({ modelValue: '2026-11-05' });
    await w.setProps({ modelValue: '1990-05-01' });
    expect((w.find('input').element as HTMLInputElement).value).toBe('01/05/1990');
    await w.setProps({ modelValue: '' });
    expect((w.find('input').element as HTMLInputElement).value).toBe('dd/mm/aaaa');
  });

  it('fuera de min/max: se entrega igual que antes y se marca', async () => {
    const w = montar({ min: '2026-01-01', max: '2026-12-31' });
    const input = w.find('input').element as HTMLInputElement;
    input.focus();
    await teclear(input, '05112027');
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['2027-11-05']);
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('calendario: Alt + ↓, en español, sin días fuera de rango', async () => {
    const w = montar({ modelValue: '2026-11-05', min: '2026-11-03', max: '2026-11-20' });
    await w.find('input').trigger('keydown', { key: 'ArrowDown', altKey: true });
    expect(w.find('[data-calendario-fecha]').exists()).toBe(true);
    expect(w.find('[data-mes]').text()).toContain('noviembre');
    expect(w.find('[data-dia="2"]').attributes('disabled')).toBeDefined();
    await w.find('[data-dia="10"]').trigger('click');
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['2026-11-10']);
    expect((w.find('input').element as HTMLInputElement).value).toBe('10/11/2026');
  });

  it('los días fuera de rango no llevan el color de los que se pueden elegir (punto 48: modo oscuro)', async () => {
    const w = montar({ modelValue: '2026-11-05', min: '2026-11-03', max: '2026-11-20' });
    await w.find('input').trigger('keydown', { key: 'ArrowDown', altKey: true });
    expect(w.find('[data-dia="2"]').classes()).toContain('campo-fecha-dia-fuera');
    expect(w.find('[data-dia="2"]').classes()).not.toContain('text-gray-700');
    expect(w.find('[data-dia="10"]').classes()).toContain('text-gray-700');
  });

  it('dentro de una caja que recorta, el calendario se abre sobre la página y sigue funcionando (punto 48)', async () => {
    const caja = document.createElement('div');
    caja.style.overflowY = 'auto';
    document.body.appendChild(caja);
    const w = mount(CampoFecha, { props: { modelValue: '2026-11-05' }, attachTo: caja });
    await w.find('input').trigger('keydown', { key: 'ArrowDown', altKey: true });
    const cal = document.body.querySelector<HTMLElement>(':scope > [data-calendario-fecha]');
    expect(cal).not.toBeNull();
    expect(cal!.className).toContain('fixed');
    expect(caja.querySelector('[data-calendario-fecha]')).toBeNull();
    // Un clic dentro del calendario no lo cierra como «clic fuera»
    cal!.querySelector<HTMLElement>('[data-dia="12"]')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    cal!.querySelector<HTMLElement>('[data-dia="12"]')!.click();
    await nextTick();
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['2026-11-12']);
    expect(document.body.querySelector('[data-calendario-fecha]')).toBeNull();
  });

  it('el botón del calendario no recibe Tab; desactivado no hay botón', () => {
    expect(montar().find('button').attributes('tabindex')).toBe('-1');
    expect(montar({ disabled: true }).find('button').exists()).toBe(false);
  });
});

describe('FormKit type="date" usa CampoFecha', () => {
  it('conserva etiqueta, muestra DD/MM/AAAA y entrega AAAA-MM-DD', async () => {
    const valor = ref('1990-05-01');
    const w = mount(
      defineComponent({
        components: { FormKit },
        setup: () => ({ valor }),
        template: `<FormKit type="date" name="fechaNacimiento" label="Fecha de nacimiento"
          min="1926-01-01" max="2009-12-31" v-model="valor" />`,
      }),
      {
        attachTo: document.body,
        global: { plugins: [[plugin, defaultConfig({ inputs: { date: createInput(FormKitFecha) } })]] },
      },
    );
    await nextTick();
    expect(w.text()).toContain('Fecha de nacimiento');
    const input = w.find('input[data-fecha]').element as HTMLInputElement;
    expect(input.value).toBe('01/05/1990');
    input.focus();
    await teclear(input, '15081985');
    await new Promise((r) => setTimeout(r, 50));
    expect(valor.value).toBe('1985-08-15');
  });
});
