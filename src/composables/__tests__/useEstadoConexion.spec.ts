import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import {
  esErrorSinRespuesta,
  esFalloDeConexionOServidor,
  useEstadoConexion,
  useVerificacionServidor,
} from '../useEstadoConexion';

describe('esErrorSinRespuesta', () => {
  it('reconoce los errores de axios sin respuesta del servidor', () => {
    expect(esErrorSinRespuesta({ isAxiosError: true, code: 'ERR_NETWORK' })).toBe(true);
    expect(esErrorSinRespuesta({ isAxiosError: true, code: 'ECONNABORTED' })).toBe(true);
    expect(esErrorSinRespuesta({ request: {}, code: 'ETIMEDOUT' })).toBe(true);
    // El código viejo buscaba 'NETWORK_ERROR', que axios no usa
    expect(esErrorSinRespuesta({ code: 'ERR_NETWORK' })).toBe(true);
  });

  it('no confunde un error con respuesta ni un error de programa', () => {
    expect(esErrorSinRespuesta({ isAxiosError: true, response: { status: 400 } })).toBe(false);
    expect(esErrorSinRespuesta(new Error('La respuesta del backend no contiene un ID válido'))).toBe(false);
    expect(esErrorSinRespuesta(null)).toBe(false);
  });
});

describe('useEstadoConexion', () => {
  afterEach(() => vi.useRealTimers());

  it('sigue online/offline y avisa unos segundos cuando la conexión regresa', async () => {
    vi.useFakeTimers();
    let estado!: ReturnType<typeof useEstadoConexion>;
    const Prueba = defineComponent({
      setup() {
        estado = useEstadoConexion();
        return () => h('div');
      },
    });
    const envoltura = mount(Prueba);

    window.dispatchEvent(new Event('offline'));
    await nextTick();
    expect(estado.enLinea.value).toBe(false);

    window.dispatchEvent(new Event('online'));
    await nextTick();
    expect(estado.enLinea.value).toBe(true);
    expect(estado.restablecida.value).toBe(true);

    vi.advanceTimersByTime(5000);
    expect(estado.restablecida.value).toBe(false);
    envoltura.unmount();
  });
});

describe('esFalloDeConexionOServidor', () => {
  it('cubre sin respuesta, puerta de enlace caída y el 500 sin explicación', () => {
    expect(esFalloDeConexionOServidor({ isAxiosError: true, code: 'ERR_NETWORK' })).toBe(true);
    expect(esFalloDeConexionOServidor({ response: { status: 502 } })).toBe(true);
    expect(esFalloDeConexionOServidor({ response: { status: 504, data: {} } })).toBe(true);
    // Lo que respondió el servidor local sin acceso a su base de datos
    expect(esFalloDeConexionOServidor({ response: { status: 500, data: { statusCode: 500, message: 'Internal server error' } } })).toBe(true);
    expect(esFalloDeConexionOServidor({ response: { status: 500 } })).toBe(true);
  });

  it('deja como estaban los errores de datos y los 500 con un mensaje propio', () => {
    expect(esFalloDeConexionOServidor({ response: { status: 400, data: { message: 'Falta la fecha' } } })).toBe(false);
    expect(esFalloDeConexionOServidor({ response: { status: 409 } })).toBe(false);
    expect(esFalloDeConexionOServidor({ response: { status: 500, data: { message: 'Error al crear el receta' } } })).toBe(false);
  });
});

describe('useVerificacionServidor', () => {
  afterEach(() => vi.useRealTimers());

  it('consulta cada 5 s hasta que el servidor responde y entonces se detiene', async () => {
    vi.useFakeTimers();
    let falla = true;
    const consultar = vi.fn(async () => {
      if (falla) throw new Error('sin servidor');
    });
    let estado!: ReturnType<typeof useVerificacionServidor>;
    const envoltura = mount(defineComponent({ setup() { estado = useVerificacionServidor(consultar); return () => h('div'); } }));

    expect(estado.disponible.value).toBeNull();
    estado.iniciar();
    expect(estado.disponible.value).toBe(false);

    await vi.advanceTimersByTimeAsync(5000);
    expect(consultar).toHaveBeenCalledTimes(1);
    expect(estado.disponible.value).toBe(false);

    falla = false;
    await vi.advanceTimersByTimeAsync(5000);
    expect(estado.disponible.value).toBe(true);

    await vi.advanceTimersByTimeAsync(20000);
    expect(consultar).toHaveBeenCalledTimes(2);

    estado.reiniciar();
    expect(estado.disponible.value).toBeNull();
    envoltura.unmount();
  });
});
