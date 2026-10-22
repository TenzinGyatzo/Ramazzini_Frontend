import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const { getConfiguracion } = vi.hoisted(() => ({ getConfiguracion: vi.fn() }));
vi.mock('@/api/FormatosFirmadosAPI', () => ({ default: { getConfiguracion } }));

import ModalFormatoParaFirma from './ModalFormatoParaFirma.vue';

// La vista de firma tiene sus propias pruebas: aquí solo importa cuándo se abre y qué devuelve
const FirmaEnPantallaFalsa = defineComponent({
  name: 'FirmaEnPantalla',
  props: ['tipoFormato', 'trabajadorId', 'trabajador', 'fecha'],
  emits: ['cancelar', 'firmado'],
  setup: () => () => h('div', { class: 'firma-falsa' }),
});

const trabajador = { _id: 't1', nombre: 'JUAN', primerApellido: 'PÉREZ', segundoApellido: 'LÓPEZ' };
const descargar = vi.fn(async () => undefined);
const toast = { open: vi.fn() };

function montar(props: Record<string, unknown> = {}) {
  return mount(ModalFormatoParaFirma, {
    props: {
      trabajador,
      titulo: 'Declaración de Veracidad',
      nombreFormato: 'la declaración',
      etiquetaFecha: 'Fecha de la declaración',
      textoBoton: 'Descargar declaración',
      descargar,
      ...props,
    },
    global: {
      provide: { toast },
      stubs: { FirmaEnPantalla: FirmaEnPantallaFalsa, GreenButton: { template: '<button class="verde" @click="$emit(\'click\')">{{ text }}</button>', props: ['text', 'loading', 'disabled', 'size'], emits: ['click'] } },
    },
  });
}

const botonPantalla = (w: ReturnType<typeof montar>) => w.find('.modal-formato-firma__boton-pantalla');

describe('ModalFormatoParaFirma', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    getConfiguracion.mockReset();
    descargar.mockClear();
  });

  it('con la firma en pantalla apagada se ve como siempre: solo descargar', async () => {
    getConfiguracion.mockResolvedValue({ data: { firmaEnPantallaHabilitada: false } });
    const w = montar({ tipoFormato: 'DECLARACION_VERACIDAD' });
    await flushPromises();
    expect(botonPantalla(w).exists()).toBe(false);
    expect(w.find('.modal-formato-firma__en-pantalla').exists()).toBe(false);
    expect(w.find('.verde').text()).toBe('Descargar declaración');
  });

  it('sin tipo de formato ni siquiera pregunta la configuración', async () => {
    montar();
    await flushPromises();
    expect(getConfiguracion).not.toHaveBeenCalled();
  });

  it('si no se puede leer la configuración, queda solo descargar', async () => {
    getConfiguracion.mockRejectedValue(new Error('sin red'));
    const w = montar({ tipoFormato: 'DECLARACION_VERACIDAD' });
    await flushPromises();
    expect(botonPantalla(w).exists()).toBe(false);
  });

  it('activada: ofrece los dos caminos y descargar sigue funcionando', async () => {
    getConfiguracion.mockResolvedValue({ data: { firmaEnPantallaHabilitada: true } });
    const w = montar({ tipoFormato: 'DECLARACION_VERACIDAD' });
    await flushPromises();
    expect(botonPantalla(w).exists()).toBe(true);

    await w.find('.verde').trigger('click');
    await flushPromises();
    expect(descargar).toHaveBeenCalledTimes(1);
  });

  it('firmar en pantalla abre la vista con el trabajador y la fecha, y devuelve el documento', async () => {
    getConfiguracion.mockResolvedValue({ data: { firmaEnPantallaHabilitada: true } });
    const w = montar({ tipoFormato: 'CONSENTIMIENTO_ANTIDOPING' });
    await flushPromises();
    await botonPantalla(w).trigger('click');

    const vista = w.findComponent(FirmaEnPantallaFalsa);
    expect(vista.props()).toMatchObject({
      tipoFormato: 'CONSENTIMIENTO_ANTIDOPING',
      trabajadorId: 't1',
      trabajador,
    });
    expect(vista.props('fecha')).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const documentoExterno = { _id: 'd1', fechaDocumento: '2026-10-21T00:00:00.000Z' };
    vista.vm.$emit('firmado', { _id: 'f1', documentoExterno });
    expect(w.emitted('firmado')).toEqual([[documentoExterno]]);
    expect(w.emitted('closeModal')).toHaveLength(1);
  });

  it('cancelar la firma regresa al modal', async () => {
    getConfiguracion.mockResolvedValue({ data: { firmaEnPantallaHabilitada: true } });
    const w = montar({ tipoFormato: 'DECLARACION_VERACIDAD' });
    await flushPromises();
    await botonPantalla(w).trigger('click');
    w.findComponent(FirmaEnPantallaFalsa).vm.$emit('cancelar');
    await flushPromises();
    expect(w.findComponent(FirmaEnPantallaFalsa).exists()).toBe(false);
    expect(w.emitted('closeModal')).toBeUndefined();
  });
});
