import { describe, expect, it } from 'vitest';
import {
  anioTieneTipos,
  cantidadDeTipos,
  tiposAConsulta,
  tiposConConteo,
  tiposDeLaConsulta,
} from './filtroExpediente';

const expediente = {
  '2026': { audiometrias: [{}, {}], notasMedicas: [{}], historiaOtologica: [] },
  '2025': { audiometrias: [{}], documentosExternos: [{}, {}, {}] },
};

describe('filtroExpediente', () => {
  it('cuenta los tipos de todos los años, en el orden por defecto y sin tipos vacíos', () => {
    const tipos = tiposConConteo(expediente);
    expect(tipos.map((t) => [t.tipo, t.cantidad])).toEqual([
      ['audiometria', 3],
      ['documentoExterno', 3],
      ['notaMedica', 1],
    ]);
    expect(tipos.every((t) => t.nombre.length > 0)).toBe(true);
  });

  it('lee de la dirección solo tipos existentes que el expediente tiene', () => {
    const disponibles = ['audiometria', 'notaMedica'];
    expect(tiposDeLaConsulta('audiometria,historiaClinica,inventado', disponibles)).toEqual(['audiometria']);
    expect(tiposDeLaConsulta(['notaMedica,audiometria'], disponibles)).toEqual(['audiometria', 'notaMedica']);
    expect(tiposDeLaConsulta(undefined, disponibles)).toEqual([]);
    expect(tiposDeLaConsulta('', disponibles)).toEqual([]);
  });

  it('escribe la dirección y sin tipos no deja parámetro', () => {
    expect(tiposAConsulta(['audiometria', 'notaMedica'])).toBe('audiometria,notaMedica');
    expect(tiposAConsulta([])).toBeUndefined();
  });

  it('sabe qué años tienen documentos de los tipos elegidos', () => {
    expect(anioTieneTipos(expediente['2026'], ['notaMedica'])).toBe(true);
    expect(anioTieneTipos(expediente['2025'], ['notaMedica'])).toBe(false);
    expect(anioTieneTipos(expediente['2026'], ['historiaOtologica'])).toBe(false);
    expect(anioTieneTipos(undefined, ['audiometria'])).toBe(false);
  });

  it('suma cuántos documentos se ven con el filtro', () => {
    const tipos = tiposConConteo(expediente);
    expect(cantidadDeTipos(tipos, ['audiometria', 'notaMedica'])).toBe(4);
  });
});
