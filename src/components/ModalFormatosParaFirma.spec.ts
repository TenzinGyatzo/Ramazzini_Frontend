import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { format } from 'date-fns';
import { useUserStore } from '@/stores/user';

const { listarFormatos, getConfiguracion, firmadosPorFecha, descargarFormatoParaFirmaPdf } = vi.hoisted(() => ({
  listarFormatos: vi.fn(),
  getConfiguracion: vi.fn(),
  firmadosPorFecha: vi.fn(),
  descargarFormatoParaFirmaPdf: vi.fn(),
}));
vi.mock('@/api/FormatosFirmadosAPI', () => ({ default: { listarFormatos, getConfiguracion, firmadosPorFecha } }));
vi.mock('@/helpers/formatoParaFirmaPdf', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/helpers/formatoParaFirmaPdf')>()),
  descargarFormatoParaFirmaPdf,
}));

import ModalFormatosParaFirma from './ModalFormatosParaFirma.vue';

// La vista de firma tiene sus propias pruebas: aquí solo importa cuándo se abre y qué devuelve
const FirmaEnPantallaFalsa = defineComponent({
  name: 'FirmaEnPantalla',
  props: ['tipoFormato', 'trabajadorId', 'trabajador', 'fecha', 'permitirPrueba'],
  emits: ['cancelar', 'firmado'],
  setup: () => () => h('div', { class: 'firma-falsa' }),
});

const LISTA = [
  { tipoFormato: 'CONSENTIMIENTO_EVALUACION_MEDICA', version: 'v0', titulo: 'C', disponible: false },
  { tipoFormato: 'DECLARACION_VERACIDAD', version: 'v1', titulo: 'D', disponible: true },
  { tipoFormato: 'CONSENTIMIENTO_ANTIDOPING', version: 'v1', titulo: 'A', disponible: true },
];
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
    listarFormatos.mockResolvedValue({ data: LISTA });
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

  it('el formato sin texto definitivo aparece en preparación y no se puede usar', async () => {
    const w = montar();
    await flushPromises();
    expect(fila(w, 'CONSENTIMIENTO_EVALUACION_MEDICA').text()).toContain('Texto en preparación');
    expect(boton(w, 'CONSENTIMIENTO_EVALUACION_MEDICA', 'Descargar')!.attributes('disabled')).toBeDefined();
    expect(boton(w, 'CONSENTIMIENTO_EVALUACION_MEDICA', 'Firmar en pantalla')!.attributes('disabled')).toBeDefined();
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

  it('marca lo que ya se firmó en pantalla con esa fecha, y distingue la prueba', async () => {
    firmadosPorFecha.mockResolvedValue({
      data: [
        { tipoFormato: 'DECLARACION_VERACIDAD', firmadoEn: '2026-10-22T15:00:00Z', prueba: false },
        { tipoFormato: 'CONSENTIMIENTO_ANTIDOPING', firmadoEn: '2026-10-22T15:05:00Z', prueba: true },
      ],
    });
    const w = montar();
    await flushPromises();
    expect(fila(w, 'DECLARACION_VERACIDAD').text()).toContain('Firmado en pantalla hoy');
    expect(fila(w, 'CONSENTIMIENTO_ANTIDOPING').text()).toContain('Firma de prueba con esta fecha');
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
      permitirPrueba: true,
    });

    firmadosPorFecha.mockResolvedValue({
      data: [{ tipoFormato: 'CONSENTIMIENTO_ANTIDOPING', firmadoEn: '2026-10-22T15:00:00Z', prueba: false }],
    });
    const documentoExterno = { _id: 'd1', fechaDocumento: `${hoy}T00:00:00.000Z` };
    vista.vm.$emit('firmado', { _id: 'f1', documentoExterno });
    await flushPromises();

    expect(w.emitted('firmado')).toEqual([[documentoExterno]]);
    expect(w.emitted('closeModal')).toBeUndefined();
    expect(w.findComponent(FirmaEnPantallaFalsa).exists()).toBe(false);
    expect(fila(w, 'CONSENTIMIENTO_ANTIDOPING').text()).toContain('Firmado en pantalla hoy');
  });

  it('solo al Principal le ofrece la firma de prueba', async () => {
    useUserStore().user = { _id: 'u1', role: 'Médico' } as any;
    const w = montar();
    await flushPromises();
    await boton(w, 'DECLARACION_VERACIDAD', 'Firmar en pantalla')!.trigger('click');
    expect(w.findComponent(FirmaEnPantallaFalsa).props('permitirPrueba')).toBe(false);
  });

  it('si no carga la lista, lo dice y permite reintentar', async () => {
    listarFormatos.mockRejectedValueOnce(new Error('sin red'));
    const w = montar();
    await flushPromises();
    const reintentar = w.findAll('button').find((b) => b.text() === 'Reintentar')!;
    expect(reintentar.exists()).toBe(true);
    await reintentar.trigger('click');
    await flushPromises();
    expect(w.findAll('[data-formato]')).toHaveLength(3);
  });
});
