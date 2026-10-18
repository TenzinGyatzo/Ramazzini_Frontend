import { describe, expect, it } from 'vitest';
import { mensajeDeErrorDeImportacion } from '@/composables/useImportacionTrabajadores';

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
