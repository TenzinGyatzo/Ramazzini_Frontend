import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resume lo elegido en el botón', async () => {
    const w = montar();
    expect(boton(w).text()).toBe('Todos');
    await w.setProps({ modelValue: ['b'] });
    expect(boton(w).text()).toBe('Chofer');
    await w.setProps({ modelValue: ['a', 'b'] });
    expect(boton(w).text()).toBe('2 opciones');
    w.unmount();
  });

  it('marcar varias seguidas avisa una sola vez, al terminar', async () => {
    const w = montar();
    await boton(w).trigger('click');
    await casillas(w)[0].trigger('change');
    vi.advanceTimersByTime(300);
    await casillas(w)[2].trigger('change');
    vi.advanceTimersByTime(300);
    expect(emitido(w)).toHaveLength(0);
    vi.advanceTimersByTime(300);
    expect(emitido(w)).toEqual([[['a', 'c']]]);
    w.unmount();
  });

  it('«Solo esta» deja una opción y avisa de inmediato', async () => {
    const w = montar(['a', 'b']);
    await boton(w).trigger('click');
    await w.findAll('[data-test="filtro-multiple-solo"]')[2].trigger('click');
    expect(emitido(w)).toEqual([[['c']]]);
    w.unmount();
  });

  it('la primera fila quita la selección', async () => {
    const w = montar(['a', 'b']);
    await boton(w).trigger('click');
    await w.find('[data-test="filtro-multiple-todas"]').trigger('click');
    expect(emitido(w)).toEqual([[[]]]);
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

  it('cierra al hacer clic fuera, y «Quitar filtros» desde afuera se refleja', async () => {
    const w = montar(['a']);
    await boton(w).trigger('click');
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await w.vm.$nextTick();
    expect(w.find('.filtro-multiple__panel').exists()).toBe(false);
    await w.setProps({ modelValue: [] });
    expect(boton(w).text()).toBe('Todos');
    w.unmount();
  });
});
