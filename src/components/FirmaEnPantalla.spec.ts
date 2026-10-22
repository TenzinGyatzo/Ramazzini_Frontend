import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import textosV1 from '@/helpers/__fixtures__/textosFormatoFirmaV1.json';

const { getTexto, crear } = vi.hoisted(() => ({ getTexto: vi.fn(), crear: vi.fn() }));
vi.mock('@/api/FormatosFirmadosAPI', () => ({ default: { getTexto, crear } }));

import FirmaEnPantalla from './FirmaEnPantalla.vue';

const firma = {
  imagen: 'data:image/png;base64,AAAA',
  trazo: [[{ x: 1, y: 1, t: 0 }]],
  dispositivo: { pointerType: 'pen', ancho: 600, alto: 220 },
  duracionMs: 900,
};

// El canvas no existe en jsdom: el recuadro se sustituye por uno que ya tiene una firma
const exportar = vi.fn(() => firma);
const limpiar = vi.fn();
const RecuadroFalso = defineComponent({
  name: 'RecuadroFirma',
  props: ['deshabilitado'],
  emits: ['cambio'],
  setup(_props, { expose }) {
    expose({ exportar, limpiar });
    return () => h('div', { class: 'recuadro-falso' });
  },
});

const toast = { open: vi.fn() };

function montar() {
  return mount(FirmaEnPantalla, {
    props: {
      tipoFormato: 'DECLARACION_VERACIDAD',
      trabajadorId: 't1',
      trabajador: { nombre: 'JUAN', primerApellido: 'PÉREZ', segundoApellido: 'LÓPEZ' },
      fecha: '2026-10-21',
    },
    global: { provide: { toast }, stubs: { RecuadroFirma: RecuadroFalso, Teleport: true } },
  });
}

async function firmarConPluma(w: ReturnType<typeof montar>, pointerType = 'pen') {
  w.findComponent(RecuadroFalso).vm.$emit('cambio', { vacia: false, valida: true, pointerType });
  await flushPromises();
}

const botonFirmar = (w: ReturnType<typeof montar>) =>
  w.findAll('button').find((b) => b.text().includes('Aceptar y firmar'))!;

describe('FirmaEnPantalla', () => {
  beforeEach(() => {
    getTexto.mockReset();
    crear.mockReset();
    exportar.mockClear();
    limpiar.mockClear();
    getTexto.mockResolvedValue({ data: textosV1.DECLARACION_VERACIDAD });
  });

  it('muestra el texto vigente con el nombre del trabajador, en negritas donde corresponde', async () => {
    const w = montar();
    await flushPromises();
    expect(getTexto).toHaveBeenCalledWith('DECLARACION_VERACIDAD');
    expect(w.find('h1').text()).toBe('DECLARACIÓN DE VERACIDAD DE INFORMACIÓN MÉDICA');
    const parrafos = w.findAll('.firma-pantalla__bloque');
    expect(parrafos).toHaveLength(9);
    expect(parrafos[0].text()).toMatch(/^Yo, JUAN PÉREZ LÓPEZ, declaro bajo protesta/);
    expect(parrafos[0].find('strong').text()).toBe('JUAN PÉREZ LÓPEZ');
    expect(parrafos[4].classes()).toContain('pl-6');
    expect(w.text()).toContain('Fecha: 21-10-2026');
  });

  it('«Aceptar y firmar» espera a que haya una firma', async () => {
    const w = montar();
    await flushPromises();
    expect(botonFirmar(w).attributes('disabled')).toBeDefined();
    await firmarConPluma(w);
    expect(botonFirmar(w).attributes('disabled')).toBeUndefined();
  });

  it('envía la firma con la versión del texto que se mostró y avisa al terminar', async () => {
    const resultado = { _id: 'f1', documentoExterno: { _id: 'd1' } };
    crear.mockResolvedValue({ data: resultado });
    const w = montar();
    await flushPromises();
    await firmarConPluma(w);
    await botonFirmar(w).trigger('click');
    await flushPromises();

    expect(crear).toHaveBeenCalledWith('t1', {
      tipoFormato: 'DECLARACION_VERACIDAD',
      versionTexto: 'v1',
      fechaFormato: '2026-10-21',
      firma,
    });
    expect(w.emitted('firmado')).toEqual([[resultado]]);
    expect(toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('si el texto cambió mientras lo leía, carga el nuevo y pide firmar otra vez', async () => {
    crear.mockRejectedValue({ response: { status: 409, data: { message: 'El texto del formato cambió.' } } });
    const w = montar();
    await flushPromises();
    getTexto.mockResolvedValueOnce({ data: { ...textosV1.DECLARACION_VERACIDAD, version: 'v2' } });
    await firmarConPluma(w);
    await botonFirmar(w).trigger('click');
    await flushPromises();

    expect(getTexto).toHaveBeenCalledTimes(2);
    expect(limpiar).toHaveBeenCalled();
    expect(w.find('[role="alert"]').text()).toMatch(/se actualizó/);
    expect(w.emitted('firmado')).toBeUndefined();
  });

  it('si falla, muestra el motivo y recuerda que se puede firmar a mano', async () => {
    crear.mockRejectedValue({ response: { status: 403, data: { message: 'La firma en pantalla no está activada para este proveedor' } } });
    const w = montar();
    await flushPromises();
    await firmarConPluma(w);
    await botonFirmar(w).trigger('click');
    await flushPromises();
    const alerta = w.find('[role="alert"]').text();
    expect(alerta).toContain('no está activada');
    expect(alerta).toContain('firmarlo a mano');
  });

  it('avisa si se firma con el mouse', async () => {
    const w = montar();
    await flushPromises();
    await firmarConPluma(w, 'mouse');
    expect(w.find('.firma-pantalla__aviso-mouse').exists()).toBe(true);
  });
});
