// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import IndiceCaptura from './IndiceCaptura.vue';
import { estadoIndiceCaptura } from '@/helpers/indiceCaptura';

const indice = estadoIndiceCaptura(
  ['Consulta', 'Somatometría', 'Plan'],
  [{ seccion: 2, paso: 2, campo: 'talla', nombre: 'Talla', falta: true, mensaje: 'Falta: Talla.' }],
  new Set([2]),
);

describe('IndiceCaptura (punto 38)', () => {
  it('lateral: resumen, qué falta y clic a la sección', async () => {
    const w = mount(IndiceCaptura, { props: { indice, actual: 2, variante: 'lateral' } });
    expect(w.text()).toContain('2 de 3 completas');
    expect(w.text()).toContain('Falta talla');
    expect(w.find('[data-indice-seccion="2"]').attributes('aria-current')).toBe('location');
    await w.find('[data-indice-seccion="2"]').trigger('click');
    expect(w.emitted('ir')).toEqual([[2]]);
  });

  it('barra: se despliega y se cierra al elegir', async () => {
    const w = mount(IndiceCaptura, { props: { indice, actual: null, variante: 'barra' }, attachTo: document.body });
    expect(w.find('ol').isVisible()).toBe(false);
    await w.find('button[aria-expanded]').trigger('click');
    expect(w.find('ol').isVisible()).toBe(true);
    await w.find('[data-indice-seccion="3"]').trigger('click');
    expect(w.emitted('ir')).toEqual([[3]]);
    expect(w.find('ol').isVisible()).toBe(false);
  });

  it('«sin revisar»: lo dice en el resumen y en la sección', () => {
    const conDefectos = estadoIndiceCaptura(['Motivo del examen', 'Heredofamiliares'], [], new Set([1]), {
      marcarSinRevisar: true,
    });
    const w = mount(IndiceCaptura, { props: { indice: conDefectos, actual: null, variante: 'lateral' } });
    expect(w.text()).toContain('2 de 2 completas · 1 sin revisar');
    expect(w.find('[data-indice-seccion="2"]').attributes('title')).toBe('Tiene las respuestas por defecto y nadie la ha revisado');
    expect(w.find('[data-indice-seccion="2"] .fa-eye').exists()).toBe(true);
  });

  it('obligatorios sin tocar: anillo ámbar; ya trabajada: punto relleno', () => {
    const faltan = [{ seccion: 1, paso: 1, campo: 'fecha', nombre: 'Fecha', falta: true, mensaje: 'Falta: Fecha.' }];
    const sinTocar = mount(IndiceCaptura, {
      props: { indice: estadoIndiceCaptura(['Consulta'], faltan, new Set()), actual: null, variante: 'lateral' },
    });
    expect(sinTocar.find('[data-indice-seccion="1"] i').classes()).toEqual(expect.arrayContaining(['far', 'fa-circle', 'text-amber-500']));
    expect(sinTocar.text()).toContain('Por capturar');
    const tocada = mount(IndiceCaptura, {
      props: { indice: estadoIndiceCaptura(['Consulta'], faltan, new Set([1])), actual: null, variante: 'lateral' },
    });
    expect(tocada.find('[data-indice-seccion="1"] i').classes()).toEqual(expect.arrayContaining(['fas', 'fa-circle', 'text-amber-500']));
  });
});
