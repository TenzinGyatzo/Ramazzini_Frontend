import { describe, expect, it } from 'vitest';
import { clasificarPorEdadYSexo } from './dashboardDataProcessor';
import { OPCIONES_DE_EDAD, expresionDeEdad } from './edadEnTabla';

describe('tabla de trabajadores: filtro de edad', () => {
  it('ofrece los mismos grupos que la gráfica de grupos etarios', () => {
    expect(OPCIONES_DE_EDAD[0]).toBe('16–20');
    expect(OPCIONES_DE_EDAD).toContain('36–40');
    // El grupo que la gráfica asigna a alguien es una de las opciones del filtro
    const haceAnios = (n: number) => new Date(new Date().getFullYear() - n, 0, 1).toISOString();
    const grupos = Object.keys(clasificarPorEdadYSexo([[{ sexo: 'Femenino', fechaNacimiento: haceAnios(38) }]]));
    expect(OPCIONES_DE_EDAD).toContain(grupos[0]);
  });

  it('coincide solo con las edades del grupo, como las muestra la columna', () => {
    const expresion = new RegExp(expresionDeEdad('26–30'));
    expect(['26 años', '28 años', '30 años'].every((texto) => expresion.test(texto))).toBe(true);
    expect(['25 años', '31 años', '126 años', '2 años', '28'].some((texto) => expresion.test(texto))).toBe(false);
  });

  it('un grupo desconocido no filtra', () => {
    expect(expresionDeEdad('')).toBe('');
    expect(expresionDeEdad('de 31 a 40')).toBe('');
  });
});
