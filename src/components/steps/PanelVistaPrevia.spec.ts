// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import PanelVistaPrevia from './PanelVistaPrevia.vue';

let w: VueWrapper | null = null;
afterEach(() => {
  w?.unmount();
  w = null;
  document.body.innerHTML = '';
});

const montar = (abierta: boolean) =>
  mount(PanelVistaPrevia, {
    props: { abierta, titulo: 'Vista previa de la nota médica' },
    slots: { default: '<p id="contenido">Documento</p>' },
    attachTo: document.body,
  });

describe('PanelVistaPrevia (punto 38)', () => {
  it('cerrado no muestra nada; abierto muestra el documento como ventana', async () => {
    w = montar(false);
    expect(document.querySelector('[data-panel-vista-previa]')).toBeNull();
    await w.setProps({ abierta: true });
    await nextTick();
    expect(document.querySelector('#contenido')?.textContent).toBe('Documento');
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
      'Vista previa de la nota médica',
    );
  });

  it('Esc, el botón o tocar fuera piden cerrar', async () => {
    w = montar(true);
    await nextTick();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    (document.querySelector('[data-panel-vista-previa] header button') as HTMLButtonElement).click();
    (document.querySelector('[data-panel-vista-previa] > div') as HTMLElement).click();
    expect(w.emitted('cerrar')).toHaveLength(3);
  });

  it('al cerrar, el cursor vuelve a donde estaba', async () => {
    const campo = document.createElement('input');
    document.body.appendChild(campo);
    campo.focus();
    w = montar(false);
    await w.setProps({ abierta: true });
    await nextTick();
    expect(document.activeElement?.textContent).toContain('Cerrar');
    await w.setProps({ abierta: false });
    expect(document.activeElement).toBe(campo);
  });
});
