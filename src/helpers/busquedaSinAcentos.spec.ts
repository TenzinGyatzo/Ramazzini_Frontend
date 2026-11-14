import { describe, expect, it } from 'vitest';
import { coincideBusqueda, normalizarParaBuscar } from './busquedaSinAcentos';

describe('búsqueda sin acentos', () => {
  it('quita acentos y mayúsculas', () => {
    expect(normalizarParaBuscar('LEÓN DE LOS ALDAMA')).toBe('leon de los aldama');
  });

  it('las opciones especiales se encuentran con o sin acentos, por código o descripción', () => {
    const opcion = { code: '00', description: 'NO ESPECIFICADO / SE IGNORÓ' };
    expect(coincideBusqueda(opcion, 'ignoro')).toBe(true);
    expect(coincideBusqueda(opcion, 'IGNORÓ')).toBe(true);
    expect(coincideBusqueda(opcion, '00')).toBe(true);
    expect(coincideBusqueda(opcion, 'leon')).toBe(false);
  });
});
