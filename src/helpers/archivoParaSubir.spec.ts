import { describe, expect, it } from 'vitest';
import { ArchivoNoLegibleError, MENSAJE_ARCHIVO_NO_LEGIBLE, leerArchivoParaSubir } from './archivoParaSubir';

describe('leerArchivoParaSubir', () => {
  it('devuelve una copia en memoria con el mismo nombre, tipo y contenido', async () => {
    const original = new File(['hola'], 'trabajadores.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const copia = await leerArchivoParaSubir(original);
    expect(copia).not.toBe(original);
    expect(copia.name).toBe('trabajadores.xlsx');
    expect(copia.type).toBe(original.type);
    const texto = await new Promise<string>((resolve) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result));
      lector.readAsText(copia);
    });
    expect(texto).toBe('hola');
  });

  it('si el archivo no se puede leer (p. ej. abierto en Excel) lo dice con claridad', async () => {
    const bloqueado = new File(['x'], 'trabajadores.xlsx');
    Object.defineProperty(bloqueado, 'arrayBuffer', {
      value: () => Promise.reject(new DOMException('The requested file could not be read', 'NotReadableError')),
    });
    await expect(leerArchivoParaSubir(bloqueado)).rejects.toBeInstanceOf(ArchivoNoLegibleError);
    await expect(leerArchivoParaSubir(bloqueado)).rejects.toThrow(MENSAJE_ARCHIVO_NO_LEGIBLE);
  });
});
