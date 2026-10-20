import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { AxiosError } from 'axios';
import { consultarArchivoClinico, headClinicalFile } from '../clinicalFiles';

vi.mock('../attachAuthToken', () => ({ authRequestConfig: () => ({}) }));

const errorConEstado = (status?: number) =>
  new AxiosError(
    'fallo',
    status ? String(status) : 'ERR_NETWORK',
    undefined,
    undefined,
    status ? ({ status, headers: {}, data: null } as any) : undefined,
  );

describe('consultarArchivoClinico', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('disponible cuando el archivo existe con el tipo pedido', async () => {
    vi.spyOn(axios, 'head').mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'application/pdf' },
    });
    await expect(
      consultarArchivoClinico('a/b.pdf', { contentType: 'application/pdf' }),
    ).resolves.toBe('disponible');
  });

  it('ausente cuando el servidor responde 404', async () => {
    vi.spyOn(axios, 'head').mockRejectedValue(errorConEstado(404));
    await expect(consultarArchivoClinico('a/b.pdf')).resolves.toBe('ausente');
  });

  it('ausente cuando el archivo no es del tipo pedido', async () => {
    vi.spyOn(axios, 'head').mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'text/html' },
    });
    await expect(
      consultarArchivoClinico('a/b.pdf', { contentType: 'application/pdf' }),
    ).resolves.toBe('ausente');
  });

  it.each([
    ['sin conexión', errorConEstado()],
    ['sesión vencida', errorConEstado(401)],
    ['sin permiso', errorConEstado(403)],
    ['error del servidor', errorConEstado(500)],
  ])('sin-verificar ante %s', async (_caso, error) => {
    vi.spyOn(axios, 'head').mockRejectedValue(error);
    await expect(consultarArchivoClinico('a/b.pdf')).resolves.toBe('sin-verificar');
  });

  it('headClinicalFile solo es verdadero si está disponible', async () => {
    vi.spyOn(axios, 'head').mockRejectedValue(errorConEstado(404));
    await expect(headClinicalFile('a/b.pdf')).resolves.toBe(false);
  });
});
