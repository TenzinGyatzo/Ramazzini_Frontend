import { describe, expect, it } from 'vitest';
import {
  atajoDeSeccion,
  estadoIndiceCaptura,
  seccionIncompletaVecina,
  type ProblemaEnSeccion,
} from '@/helpers/indiceCaptura';

const falta = (seccion: number, campo: string, nombre: string): ProblemaEnSeccion => ({
  seccion,
  paso: seccion,
  campo,
  nombre,
  falta: true,
  mensaje: `Falta: ${nombre}.`,
});
const error = (seccion: number, campo: string, mensaje: string): ProblemaEnSeccion => ({
  seccion,
  paso: seccion,
  campo,
  nombre: campo,
  falta: false,
  mensaje,
});

const NOMBRES = ['Consulta', 'Signos vitales', 'Somatometría', 'Diagnósticos', 'Plan'];

describe('índice de la captura rápida (punto 38)', () => {
  it('cada sección con su estado, a partir de los mismos problemas de guardar', () => {
    const indice = estadoIndiceCaptura(
      NOMBRES,
      [
        falta(1, 'motivoConsulta', 'Motivo de consulta'),
        falta(3, 'talla', 'Talla'),
        falta(3, 'peso', 'Peso'),
        error(4, 'primeraVezDiagnosticoPrincipal', 'Elige primera vez.'),
        falta(4, 'codigoCIE10Principal', 'CIE-10 principal'),
      ],
      new Set([3, 4]),
    );
    expect(indice.secciones.map((s) => s.estado)).toEqual([
      'sinEmpezar',
      'completa',
      'pendiente',
      'error',
      'completa',
    ]);
    expect(indice.secciones[2].detalle).toBe('Falta talla y 1 más');
    expect(indice.secciones[2].problema?.campo).toBe('talla');
    // Con error, se dice el motivo; el clic lleva al primero de la sección
    expect(indice.secciones[3].detalle).toBe('Elige primera vez.');
    expect(indice.secciones[3].problema?.campo).toBe('primeraVezDiagnosticoPrincipal');
    expect(indice.completas).toBe(2);
    expect(indice.total).toBe(5);
  });

  it('las siglas no se pasan a minúsculas', () => {
    const indice = estadoIndiceCaptura(['Diagnósticos'], [falta(1, 'cie', 'CIE-10 principal')], new Set([1]));
    expect(indice.secciones[0].detalle).toBe('Falta CIE-10 principal');
  });

  it('sin problemas, todo completo; los que no tienen sección no se cuentan en ninguna', () => {
    const indice = estadoIndiceCaptura(NOMBRES, [{ ...falta(1, 'x', 'X'), seccion: null }], new Set());
    expect(indice.completas).toBe(5);
  });

  it('Alt + ↓/↑ va a la sección incompleta siguiente o anterior', () => {
    const { secciones } = estadoIndiceCaptura(
      NOMBRES,
      [falta(1, 'a', 'A'), falta(3, 'b', 'B'), falta(5, 'c', 'C')],
      new Set(),
    );
    expect(seccionIncompletaVecina(secciones, 1, 1)?.numero).toBe(3);
    expect(seccionIncompletaVecina(secciones, 3, 1)?.numero).toBe(5);
    expect(seccionIncompletaVecina(secciones, 5, 1)).toBeNull();
    expect(seccionIncompletaVecina(secciones, 4, -1)?.numero).toBe(3);
    expect(seccionIncompletaVecina(secciones, 1, -1)).toBeNull();
    expect(seccionIncompletaVecina(secciones, null, 1)?.numero).toBe(1);
  });

  it('el atajo respeta los select, el texto en Mac y las ventanas abiertas', () => {
    const tecla = (key: string, target: EventTarget | null = null, extra = {}) => ({
      key,
      altKey: true,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      target,
      ...extra,
    });
    expect(atajoDeSeccion(tecla('ArrowDown'), false)).toBe('siguiente');
    expect(atajoDeSeccion(tecla('ArrowUp'), false)).toBe('anterior');
    expect(atajoDeSeccion(tecla('ArrowLeft'), false)).toBeNull();
    expect(atajoDeSeccion(tecla('ArrowDown', null, { altKey: false }), false)).toBeNull();
    expect(atajoDeSeccion(tecla('ArrowDown', document.createElement('select')), false)).toBeNull();
    const texto = document.createElement('input');
    expect(atajoDeSeccion(tecla('ArrowDown', texto), true)).toBeNull();
    expect(atajoDeSeccion(tecla('ArrowDown', texto), false)).toBe('siguiente');
    const ventana = document.createElement('div');
    ventana.setAttribute('role', 'dialog');
    const boton = document.createElement('button');
    ventana.appendChild(boton);
    expect(atajoDeSeccion(tecla('ArrowDown', boton), false)).toBeNull();
  });
});
