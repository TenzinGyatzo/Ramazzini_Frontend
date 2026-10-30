import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import FiltroMultiple from './FiltroMultiple.vue';

const opciones = [
  { valor: 'a', texto: 'Soldador' },
  { valor: 'b', texto: 'Chofer' },
  { valor: 'c', texto: 'Pintor' },
];

const montar = (modelValue: string[] = []) =>
  mount(FiltroMultiple, {
    props: { etiqueta: 'Puesto', opciones, modelValue },
    attachTo: document.body,
  });
const boton = (w: ReturnType<typeof montar>) => w.find('[data-test="filtro-multiple-boton"]');
const casillas = (w: ReturnType<typeof montar>) => w.findAll('[data-test="filtro-multiple-opcion"]');
const emitido = (w: ReturnType<typeof montar>) => w.emitted('update:modelValue') ?? [];

describe('FiltroMultiple', () => {
  it('resume lo elegido en el botón', async () => {
    const w = montar();
    expect(boton(w).text()).toBe('Todos');
    await w.setProps({ modelValue: ['b'] });
    expect(boton(w).text()).toBe('Chofer');
    await w.setProps({ modelValue: ['a', 'b'] });
    expect(boton(w).text()).toBe('2 opciones');
    w.unmount();
  });

  it('lo marcado se aplica una sola vez, al cerrar', async () => {
    const w = montar();
    await boton(w).trigger('click');
    await casillas(w)[0].trigger('change');
    await casillas(w)[2].trigger('change');
    expect(emitido(w)).toHaveLength(0);
    await boton(w).trigger('click');
    expect(emitido(w)).toEqual([[['a', 'c']]]);
    w.unmount();
  });

  it('cerrar sin cambios no recarga', async () => {
    const w = montar(['a']);
    await boton(w).trigger('click');
    await boton(w).trigger('click');
    expect(emitido(w)).toHaveLength(0);
    w.unmount();
  });

  it('«Solo esta» deja una opción, aplica y cierra', async () => {
    const w = montar(['a', 'b']);
    await boton(w).trigger('click');
    await w.findAll('[data-test="filtro-multiple-solo"]')[2].trigger('click');
    expect(emitido(w)).toEqual([[['c']]]);
    expect(w.find('.filtro-multiple__panel').exists()).toBe(false);
    w.unmount();
  });

  it('la primera fila quita la selección y cierra', async () => {
    const w = montar(['a', 'b']);
    await boton(w).trigger('click');
    await w.find('[data-test="filtro-multiple-todas"]').trigger('click');
    expect(emitido(w)).toEqual([[[]]]);
    expect(w.find('.filtro-multiple__panel').exists()).toBe(false);
    w.unmount();
  });

  it('al cerrar aplica lo pendiente; con Esc regresa al botón', async () => {
    const w = montar();
    await boton(w).trigger('click');
    await casillas(w)[1].trigger('change');
    await w.find('.filtro-multiple__panel').trigger('keydown', { key: 'Escape' });
    expect(emitido(w)).toEqual([[['b']]]);
    expect(w.find('.filtro-multiple__panel').exists()).toBe(false);
    expect(document.activeElement).toBe(boton(w).element);
    w.unmount();
  });

  it('con muchas opciones ofrece buscador, sin distinguir acentos', async () => {
    const muchas = Array.from({ length: 8 }, (_, i) => ({ valor: `v${i}`, texto: `Operación ${i}` }));
    const w = mount(FiltroMultiple, {
      props: { etiqueta: 'Puesto', opciones: muchas, modelValue: [] },
      attachTo: document.body,
    });
    await w.find('[data-test="filtro-multiple-boton"]').trigger('click');
    const buscador = w.find('[data-test="filtro-multiple-buscador"]');
    expect(document.activeElement).toBe(buscador.element);
    await buscador.setValue('OPERACION 3');
    expect(w.findAll('[data-test="filtro-multiple-opcion"]')).toHaveLength(1);
    await buscador.setValue('nada');
    expect(w.text()).toContain('Sin opciones');
    w.unmount();
  });

  it('una lista corta no lleva buscador', async () => {
    const w = montar();
    await boton(w).trigger('click');
    expect(w.find('[data-test="filtro-multiple-buscador"]').exists()).toBe(false);
    w.unmount();
  });

  it('al hacer clic fuera aplica y cierra, y «Quitar filtros» desde afuera se refleja', async () => {
    const w = montar(['a']);
    await boton(w).trigger('click');
    await casillas(w)[1].trigger('change');
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await w.vm.$nextTick();
    expect(w.find('.filtro-multiple__panel').exists()).toBe(false);
    expect(emitido(w)).toEqual([[['a', 'b']]]);
    await w.setProps({ modelValue: [] });
    expect(boton(w).text()).toBe('Todos');
    w.unmount();
  });
});
