import { describe, expect, it } from 'vitest';
import {
  esTiempoAgotadoDeImportacion,
  mensajeDeErrorDeImportacion,
} from '@/composables/useImportacionTrabajadores';

describe('mensajeDeErrorDeImportacion', () => {
  it('sin respuesta del servidor menciona la conexión y el archivo abierto en Excel', () => {
    const sinRespuesta = { isAxiosError: true, code: 'ERR_NETWORK', request: {} };
    expect(mensajeDeErrorDeImportacion(sinRespuesta)).toMatch(/conexión.*abierto en Excel/);
  });

  it('si el servidor explica el problema, se muestra su mensaje', () => {
    const conMensaje = { isAxiosError: true, response: { status: 400, data: { message: 'Faltan columnas obligatorias' } } };
    expect(mensajeDeErrorDeImportacion(conMensaje)).toBe('Faltan columnas obligatorias');
  });

  it('un error genérico del servidor conserva el mensaje general', () => {
    const generico = { isAxiosError: true, response: { status: 500, data: { message: 'Internal server error' } } };
    expect(mensajeDeErrorDeImportacion(generico)).toMatch(/^Error inesperado/);
  });
});

describe('esTiempoAgotadoDeImportacion', () => {
  it('el 504 de nginx en una carga larga es tiempo agotado, no error', () => {
    const gateway = { isAxiosError: true, response: { status: 504, data: '<html>504 Gateway Time-out</html>' } };
    expect(esTiempoAgotadoDeImportacion(gateway, 61_000)).toBe(true);
  });

  it('sin respuesta tras esperar mucho es tiempo agotado; al instante es el envío del archivo', () => {
    const sinRespuesta = { isAxiosError: true, code: 'ERR_NETWORK', request: {} };
    expect(esTiempoAgotadoDeImportacion(sinRespuesta, 90_000)).toBe(true);
    expect(esTiempoAgotadoDeImportacion(sinRespuesta, 300)).toBe(false);
  });

  it('un error con explicación del servidor no es tiempo agotado', () => {
    const conMensaje = { isAxiosError: true, response: { status: 400, data: { message: 'Faltan columnas' } } };
    expect(esTiempoAgotadoDeImportacion(conMensaje, 90_000)).toBe(false);
  });
});
