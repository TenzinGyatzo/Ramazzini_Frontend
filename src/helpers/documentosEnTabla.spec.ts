import { describe, expect, it } from 'vitest';
import {
  OPCIONES_ANTIDOPING,
  OPCIONES_NORDICO,
  OPCIONES_SUENO,
  documentosEnTabla,
  siNoEnTabla,
} from './documentosEnTabla';

describe('tabla de trabajadores: columnas de documentos', () => {
  it('sin documentos ni historia, todo queda sin dato', () => {
    expect(documentosEnTabla({})).toEqual({
      tabaquismo: '-',
      alcoholismo: '-',
      antidoping: '-',
      nordico: '-',
      sueno: '-',
    });
    expect(documentosEnTabla(null).sueno).toBe('-');
  });

  it('cada columna usa una de las opciones de su filtro', () => {
    const columnas = documentosEnTabla({
      historiaClinicaResumen: { tabaquismoReferido: 'Si', alcoholismoReferido: 'No' },
      documentosResumen: { antidoping: 'Positivo', nordico: 'rojo', sueno: 'naranja' },
    });
    expect(columnas).toEqual({
      tabaquismo: 'Si',
      alcoholismo: 'No',
      antidoping: 'Positivo',
      nordico: 'Requiere seguimiento',
      sueno: 'Semanal',
    });
    expect(OPCIONES_ANTIDOPING).toContain(columnas.antidoping);
    expect(OPCIONES_NORDICO).toContain(columnas.nordico);
    expect(OPCIONES_SUENO).toContain(columnas.sueno);
  });

  it('un valor desconocido no se muestra como si fuera un resultado', () => {
    const columnas = documentosEnTabla({ documentosResumen: { antidoping: 'Pendiente', nordico: 'azul', sueno: '' } });
    expect([columnas.antidoping, columnas.nordico, columnas.sueno]).toEqual(['-', '-', '-']);
  });

  it('acepta «Sí» con o sin acento y en mayúsculas', () => {
    expect([siNoEnTabla('Si'), siNoEnTabla('SÍ'), siNoEnTabla('no'), siNoEnTabla(null), siNoEnTabla('tal vez')]).toEqual([
      'Si',
      'Si',
      'No',
      '-',
      '-',
    ]);
  });
});
