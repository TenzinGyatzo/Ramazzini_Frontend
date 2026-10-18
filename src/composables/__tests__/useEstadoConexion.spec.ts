import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { esErrorSinRespuesta, useEstadoConexion } from '../useEstadoConexion';

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
