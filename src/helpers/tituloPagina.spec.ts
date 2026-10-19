import { describe, expect, it } from 'vitest';
import { formarTitulo, inicialesTrabajador, tituloDeRuta } from './tituloPagina';

describe('título de la pestaña', () => {
  it('lo que distingue va primero y «Ramazzini» al final; omite lo vacío', () => {
    expect(formarTitulo(['J.P.G.', 'Expediente'])).toBe('J.P.G. · Expediente — Ramazzini');
    expect(formarTitulo([null, 'Expediente', ''])).toBe('Expediente — Ramazzini');
    expect(formarTitulo([])).toBe('Ramazzini');
  });

  it('las iniciales van apellido, apellido, nombre(s), sin acentos ni partículas', () => {
    expect(inicialesTrabajador({ nombre: 'JUAN', primerApellido: 'PÉREZ', segundoApellido: 'GARCÍA' })).toBe('P.G.J.');
    expect(inicialesTrabajador({ nombre: 'Juan Carlos', primerApellido: 'Pérez' })).toBe('P.J.C.');
    expect(
      inicialesTrabajador({ nombre: 'MARIA DE LOS ANGELES', primerApellido: 'DEL RIO', segundoApellido: 'MANZANO' }),
    ).toBe('R.M.M.A.');
    expect(inicialesTrabajador({ nombre: 'Ángela', primerApellido: 'Núñez' })).toBe('N.A.');
  });

  it('nunca incluye el nombre completo', () => {
    const titulo = formarTitulo([inicialesTrabajador({ nombre: 'JUAN', primerApellido: 'PÉREZ' }), 'Expediente']);
    expect(titulo).not.toMatch(/JUAN|PÉREZ/);
  });

  it('sin trabajador no hay iniciales', () => {
    expect(inicialesTrabajador(null)).toBe('');
    expect(inicialesTrabajador({})).toBe('');
  });

  it('cada sección tiene su título y lo desconocido queda en «Ramazzini»', () => {
    expect(tituloDeRuta('trabajadores')).toBe('Trabajadores — Ramazzini');
    expect(tituloDeRuta('inicio')).toBe('Inicio — Ramazzini');
    expect(tituloDeRuta('no-existe')).toBe('Ramazzini');
    expect(tituloDeRuta(undefined)).toBe('Ramazzini');
  });
});
