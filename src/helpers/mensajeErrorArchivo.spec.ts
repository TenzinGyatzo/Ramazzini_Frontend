import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { MENSAJE_SIN_CONEXION_ARCHIVO, mensajeErrorArchivo } from './mensajeErrorArchivo';

const config = { headers: new AxiosHeaders() } as any;
const conStatus = (status: number) =>
  new AxiosError('x', 'ERR_BAD_REQUEST', config, {}, {
    status,
    statusText: '',
    headers: {},
    config,
    data: null,
  });

describe('mensajeErrorArchivo', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sin respuesta del servidor avisa que no hay conexión', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK', config);
    expect(mensajeErrorArchivo(error, { accion: 'abrir' })).toBe(MENSAJE_SIN_CONEXION_ARCHIVO);
  });

  it('401 pide volver a iniciar sesión', () => {
    expect(mensajeErrorArchivo(conStatus(401), { accion: 'abrir' })).toContain('sesión expiró');
  });

  it('403 dice que no hay permiso, con la acción y el objeto', () => {
    expect(mensajeErrorArchivo(conStatus(403), { accion: 'descargar', objeto: 'la imagen' })).toBe(
      'No tienes permiso para descargar la imagen.',
    );
  });

  it('404 usa el texto propio o el de por omisión', () => {
    expect(mensajeErrorArchivo(conStatus(404), { accion: 'abrir', objeto: 'el PDF' })).toBe(
      'El PDF ya no está en el servidor.',
    );
    expect(
      mensajeErrorArchivo(conStatus(404), { accion: 'abrir', noEncontrado: 'Vuelve a subirlo.' }),
    ).toBe('Vuelve a subirlo.');
  });

  it('otro error del servidor da un mensaje para reintentar', () => {
    expect(mensajeErrorArchivo(conStatus(500), { accion: 'abrir' })).toBe(
      'No se pudo abrir el documento. Intenta de nuevo.',
    );
  });

  it('un error que no es de red con el navegador sin conexión avisa que no hay conexión', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(mensajeErrorArchivo(new Error('x'), { accion: 'descargar' })).toBe(MENSAJE_SIN_CONEXION_ARCHIVO);
  });

  it('un error que no es de red con conexión da el mensaje genérico', () => {
    vi.stubGlobal('navigator', { onLine: true });
    expect(mensajeErrorArchivo(new Error('x'), { accion: 'descargar', objeto: 'el PDF' })).toBe(
      'No se pudo descargar el PDF. Intenta de nuevo.',
    );
  });
});
