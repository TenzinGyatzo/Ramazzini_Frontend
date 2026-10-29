import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { format } from 'date-fns';
import { useUserStore } from '@/stores/user';
import { useFirmaEnPantallaStore } from '@/stores/firmaEnPantalla';

const { getConfiguracion, firmadosPorFecha, descargarFormatoParaFirmaPdf } = vi.hoisted(() => ({
  getConfiguracion: vi.fn(),
  firmadosPorFecha: vi.fn(),
  descargarFormatoParaFirmaPdf: vi.fn(),
}));
vi.mock('@/api/FormatosFirmadosAPI', () => ({ default: { getConfiguracion, firmadosPorFecha } }));
vi.mock('@/helpers/formatoParaFirmaPdf', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/helpers/formatoParaFirmaPdf')>()),
  descargarFormatoParaFirmaPdf,
}));

import ModalFormatosParaFirma from './ModalFormatosParaFirma.vue';

// La vista de firma tiene sus propias pruebas: aquí solo importa cuándo se abre y qué devuelve
const FirmaEnPantallaFalsa = defineComponent({
  name: 'FirmaEnPantalla',
  props: ['tipoFormato', 'trabajadorId', 'trabajador', 'fecha'],
  emits: ['cancelar', 'firmado'],
  setup: () => () => h('div', { class: 'firma-falsa' }),
});

const trabajador = { _id: 't1', nombre: 'JUAN', primerApellido: 'PÉREZ', segundoApellido: 'LÓPEZ' };
const toast = { open: vi.fn() };
const hoy = format(new Date(), 'yyyy-MM-dd');

function montar() {
  return mount(ModalFormatosParaFirma, {
    props: { trabajador },
    global: { provide: { toast }, stubs: { FirmaEnPantalla: FirmaEnPantallaFalsa } },
  });
}

const fila = (w: ReturnType<typeof montar>, tipo: string) => w.find(`[data-formato="${tipo}"]`);
const boton = (w: ReturnType<typeof montar>, tipo: string, texto: string) =>
  fila(w, tipo).findAll('button').find((b) => b.text().includes(texto));

describe('ModalFormatosParaFirma', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    getConfiguracion.mockResolvedValue({ data: { firmaEnPantallaHabilitada: true } });
    firmadosPorFecha.mockResolvedValue({ data: [] });
    descargarFormatoParaFirmaPdf.mockResolvedValue(undefined);
  });

  it('muestra los tres formatos en orden, con los dos caminos', async () => {
    const w = montar();
    await flushPromises();
    expect(w.findAll('[data-formato]').map((f) => f.attributes('data-formato'))).toEqual([
      'CONSENTIMIENTO_EVALUACION_MEDICA',
      'DECLARACION_VERACIDAD',
      'CONSENTIMIENTO_ANTIDOPING',
    ]);
    expect(w.find('.modal-formatos-firma__metodos').text()).toContain('En papel');
    expect(w.find('.modal-formatos-firma__metodos').text()).toContain('En pantalla');
    expect(fila(w, 'CONSENTIMIENTO_ANTIDOPING').text()).toContain('Antes de la toma de muestra');
    expect(firmadosPorFecha).toHaveBeenCalledWith('t1', hoy);
  });

  it('con la configuración ya cargada (al iniciar sesión) abre sin esqueleto ni consulta', async () => {
    useFirmaEnPantallaStore().aplicar({ firmaEnPantallaHabilitada: true });
    const w = montar();
    expect(w.find('[data-esqueleto]').exists()).toBe(false);
    expect(w.findAll('[data-formato]')).toHaveLength(3);
    expect(w.find('.modal-formatos-firma__metodos').text()).toContain('En pantalla');
    await flushPromises();
    expect(getConfiguracion).not.toHaveBeenCalled();
  });

  it('si se abre antes de que llegue la configuración: nombres y esqueleto solo en los botones', async () => {
    getConfiguracion.mockReturnValue(new Promise(() => {}));
    const w = montar();
    await flushPromises();
    const esqueleto = w.find('ul[data-esqueleto]');
    expect(esqueleto.attributes('aria-busy')).toBe('true');
    expect(esqueleto.findAll('li.modal-formatos-firma__fila').map((li) => li.find('p').text())).toEqual([
      'Consentimiento para evaluación médica laboral',
      'Declaración de veracidad',
      'Consentimiento para prueba de detección de sustancias',
    ]);
    expect(w.findAll('.modal-formatos-firma__boton')).toHaveLength(0);
    // Sin barras sobre texto fijo: la tarjeta «En pantalla» aparece solo cuando se sabe que está encendida
    expect(w.find('.modal-formatos-firma__metodos').text()).not.toContain('En pantalla');
  });

  it('todos los formatos se pueden usar: ya tienen su texto', async () => {
    const w = montar();
    await flushPromises();
    expect(w.text()).not.toContain('Texto en preparación');
    expect(w.findAll('.modal-formatos-firma__boton').every((b) => b.attributes('disabled') === undefined)).toBe(true);
  });

  it('con la firma en pantalla apagada queda solo el papel, como antes', async () => {
    getConfiguracion.mockResolvedValue({ data: { firmaEnPantallaHabilitada: false } });
    const w = montar();
    await flushPromises();
    expect(w.find('.modal-formatos-firma__metodos').text()).not.toContain('En pantalla');
    expect(w.find('.modal-formatos-firma__boton-pantalla').exists()).toBe(false);
    expect(firmadosPorFecha).not.toHaveBeenCalled();
  });

  it('descarga el formato elegido con la fecha común', async () => {
    const w = montar();
    await flushPromises();
    await w.find('#fecha-formatos-firma').setValue('2026-10-20');
    await boton(w, 'DECLARACION_VERACIDAD', 'Descargar')!.trigger('click');
    await flushPromises();
    expect(descargarFormatoParaFirmaPdf).toHaveBeenCalledWith(
      'DECLARACION_VERACIDAD',
      expect.objectContaining({ trabajador, fecha: '2026-10-20' }),
    );
    expect(firmadosPorFecha).toHaveBeenLastCalledWith('t1', '2026-10-20');
  });

  it('marca lo que ya se firmó en pantalla con esa fecha (en borrador o finalizado)', async () => {
    firmadosPorFecha.mockResolvedValue({
      data: [{ tipoFormato: 'DECLARACION_VERACIDAD', firmadoEn: '2026-10-22T15:00:00Z' }],
    });
    const w = montar();
    await flushPromises();
    expect(fila(w, 'DECLARACION_VERACIDAD').text()).toContain('Firmado en pantalla hoy');
    expect(fila(w, 'CONSENTIMIENTO_ANTIDOPING').text()).not.toContain('Firmado en pantalla');
    // Se puede volver a firmar si hace falta
    expect(boton(w, 'DECLARACION_VERACIDAD', 'Firmar en pantalla')!.attributes('disabled')).toBeUndefined();
  });

  it('firmar abre la vista con el formato y la fecha; al terminar se queda abierto y lo marca', async () => {
    useUserStore().user = { _id: 'u1', role: 'Principal' } as any;
    const w = montar();
    await flushPromises();
    await boton(w, 'CONSENTIMIENTO_ANTIDOPING', 'Firmar en pantalla')!.trigger('click');

    const vista = w.findComponent(FirmaEnPantallaFalsa);
    expect(vista.props()).toMatchObject({
      tipoFormato: 'CONSENTIMIENTO_ANTIDOPING',
      trabajadorId: 't1',
      fecha: hoy,
    });

    firmadosPorFecha.mockResolvedValue({
      data: [{ tipoFormato: 'CONSENTIMIENTO_ANTIDOPING', firmadoEn: '2026-10-22T15:00:00Z' }],
    });
    const documentoExterno = { _id: 'd1', fechaDocumento: `${hoy}T00:00:00.000Z` };
    vista.vm.$emit('firmado', { _id: 'f1', documentoExterno });
    await flushPromises();

    expect(w.emitted('firmado')).toEqual([[documentoExterno]]);
    expect(w.emitted('closeModal')).toBeUndefined();
    expect(w.findComponent(FirmaEnPantallaFalsa).exists()).toBe(false);
    expect(fila(w, 'CONSENTIMIENTO_ANTIDOPING').text()).toContain('Firmado en pantalla hoy');
  });

  it('si no se puede consultar la configuración, queda solo el papel', async () => {
    getConfiguracion.mockRejectedValue(new Error('sin red'));
    const w = montar();
    await flushPromises();
    expect(w.findAll('[data-formato]')).toHaveLength(3);
    expect(w.find('.modal-formatos-firma__boton-pantalla').exists()).toBe(false);
  });
});
