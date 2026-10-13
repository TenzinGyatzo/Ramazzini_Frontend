import { describe, it, expect } from 'vitest';
import {
  TIPOS_DOCUMENTO_EXPEDIENTE,
  anioTieneOrdenManual,
  documentosDelAnioEnOrden,
  nombreTipoDocumento,
  ordenarComoEnExpediente,
  posicionesEnExpediente,
  resolverOrdenTipos,
} from './documentosExpediente';
import { DOCUMENT_TYPE_TO_PERMISSION } from '@/constants/rolePermissionPolicy';

const ORDEN_POR_DEFECTO = TIPOS_DOCUMENTO_EXPEDIENTE.map((d) => d.tipo);

describe('catálogo de documentos del expediente', () => {
  it('no repite tipos ni llaves y todos tienen permiso y nombre visible', () => {
    expect(new Set(ORDEN_POR_DEFECTO).size).toBe(TIPOS_DOCUMENTO_EXPEDIENTE.length);
    expect(new Set(TIPOS_DOCUMENTO_EXPEDIENTE.map((d) => d.clave)).size).toBe(TIPOS_DOCUMENTO_EXPEDIENTE.length);
    ORDEN_POR_DEFECTO.forEach((tipo) => {
      expect(DOCUMENT_TYPE_TO_PERMISSION[tipo], tipo).toBeTruthy();
      expect(nombreTipoDocumento(tipo), tipo).not.toBe(tipo);
    });
  });
});

describe('resolverOrdenTipos', () => {
  it('sin orden guardado devuelve el de siempre', () => {
    expect(resolverOrdenTipos(undefined)).toEqual(ORDEN_POR_DEFECTO);
    expect(resolverOrdenTipos(null)).toEqual(ORDEN_POR_DEFECTO);
    expect(resolverOrdenTipos([])).toEqual(ORDEN_POR_DEFECTO);
  });

  it('respeta un orden guardado completo', () => {
    const invertido = [...ORDEN_POR_DEFECTO].reverse();
    expect(resolverOrdenTipos(invertido)).toEqual(invertido);
  });

  it('ignora tipos desconocidos y repetidos', () => {
    const guardado = ['inventado', ...[...ORDEN_POR_DEFECTO].reverse(), 'aptitud'];
    expect(resolverOrdenTipos(guardado)).toEqual([...ORDEN_POR_DEFECTO].reverse());
  });

  it('un tipo que la lista guardada no trae queda junto a su vecino del orden por defecto', () => {
    // El proveedor guardó su orden antes de que existieran audiometría y la nota aclaratoria
    const guardado = [...ORDEN_POR_DEFECTO]
      .reverse()
      .filter((tipo) => tipo !== 'audiometria' && tipo !== 'notaAclaratoria');
    const orden = resolverOrdenTipos(guardado);

    expect(orden).toHaveLength(ORDEN_POR_DEFECTO.length);
    expect(orden.indexOf('audiometria')).toBe(orden.indexOf('historiaOtologica') + 1);
    // El primero del orden por defecto no tiene vecino anterior: va al inicio
    expect(orden[0]).toBe('notaAclaratoria');
  });
});

describe('documentosDelAnioEnOrden', () => {
  const anio = {
    notasMedicas: [{ _id: 'nm-1' }, { _id: 'nm-2' }],
    aptitudes: [{ _id: 'ap-1' }],
    controlPrenatal: [{ _id: 'cp-1' }],
    documentosExternos: [{ _id: 'ex-1' }],
  };
  const ids = (lista: ReturnType<typeof documentosDelAnioEnOrden>) => lista.map((d) => d.documento._id);

  it('ordena por tipo y conserva el orden de llegada dentro del tipo', () => {
    expect(ids(documentosDelAnioEnOrden(anio, ORDEN_POR_DEFECTO))).toEqual(['ap-1', 'ex-1', 'nm-1', 'nm-2', 'cp-1']);
  });

  it('sigue el orden del proveedor', () => {
    const orden = resolverOrdenTipos(['notaMedica', 'documentoExterno', 'aptitud']);
    const sinPrenatal = ids(documentosDelAnioEnOrden(anio, orden, { controlPrenatalEnabled: false }));
    expect(sinPrenatal).toEqual(['nm-1', 'nm-2', 'ex-1', 'ap-1']);
  });

  it('omite control prenatal cuando el proveedor no lo usa', () => {
    expect(ids(documentosDelAnioEnOrden(anio, ORDEN_POR_DEFECTO, { controlPrenatalEnabled: false }))).not.toContain('cp-1');
  });

  it('tolera un año vacío o sin datos', () => {
    expect(documentosDelAnioEnOrden(undefined, ORDEN_POR_DEFECTO)).toEqual([]);
    expect(documentosDelAnioEnOrden({ aptitudes: null }, ORDEN_POR_DEFECTO)).toEqual([]);
  });
});

describe('orden del PDF combinado', () => {
  const expediente = {
    '2024': { aptitudes: [{ _id: 'ap-2024' }], notasMedicas: [{ _id: 'nm-2024' }] },
    '2025': { aptitudes: [{ _id: 'ap-2025' }], notasMedicas: [{ _id: 'nm-2025-a' }, { _id: 'nm-2025-b' }] },
  };
  const seleccion = (...ids: string[]) => ids.map((documentId) => ({ documentId }));
  const combinado = (ids: string[], orden = ORDEN_POR_DEFECTO) =>
    ordenarComoEnExpediente(seleccion(...ids), posicionesEnExpediente(expediente, orden)).map((d) => d.documentId);

  it('va año por año, del más reciente al más antiguo, sin mezclar años por tipo', () => {
    expect(combinado(['nm-2024', 'ap-2024', 'nm-2025-b', 'ap-2025', 'nm-2025-a'])).toEqual([
      'ap-2025',
      'nm-2025-a',
      'nm-2025-b',
      'ap-2024',
      'nm-2024',
    ]);
  });

  it('no depende del orden en que se marcaron los documentos', () => {
    expect(combinado(['nm-2025-b', 'nm-2025-a'])).toEqual(['nm-2025-a', 'nm-2025-b']);
  });

  it('usa el orden del proveedor', () => {
    const orden = resolverOrdenTipos(['notaMedica', 'aptitud']);
    expect(combinado(['ap-2025', 'nm-2025-a', 'ap-2024', 'nm-2024'], orden)).toEqual([
      'nm-2025-a',
      'ap-2025',
      'nm-2024',
      'ap-2024',
    ]);
  });

  it('lo que no está en el expediente cargado va al final, en el orden recibido', () => {
    expect(combinado(['x-2', 'ap-2024', 'x-1'])).toEqual(['ap-2024', 'x-2', 'x-1']);
  });

  it('no altera la selección original', () => {
    const original = seleccion('nm-2024', 'ap-2025');
    ordenarComoEnExpediente(original, posicionesEnExpediente(expediente, ORDEN_POR_DEFECTO));
    expect(original.map((d) => d.documentId)).toEqual(['nm-2024', 'ap-2025']);
  });
});

describe('orden manual de un año', () => {
  const anio = {
    aptitudes: [{ _id: 'ap-1' }],
    notasMedicas: [{ _id: 'nm-1' }, { _id: 'nm-2' }],
    documentosExternos: [{ _id: 'ex-1' }, { _id: 'ex-2' }],
  };
  const ref = (documentType: string, documentId: string) => ({ documentType, documentId });
  const ids = (ordenManual: ReturnType<typeof ref>[], documentos: Record<string, any> = anio) =>
    documentosDelAnioEnOrden(documentos, ORDEN_POR_DEFECTO, { ordenManual }).map((d) => d.documento._id);

  it('sin orden manual el año sigue el orden por tipo', () => {
    expect(ids([])).toEqual(['ap-1', 'ex-1', 'ex-2', 'nm-1', 'nm-2']);
    expect(anioTieneOrdenManual(anio, ORDEN_POR_DEFECTO, { ordenManual: [] })).toBe(false);
  });

  it('respeta el orden que dejó el usuario, con externos intercalados', () => {
    const manual = [
      ref('documentoExterno', 'ex-2'),
      ref('aptitud', 'ap-1'),
      ref('notaMedica', 'nm-2'),
      ref('documentoExterno', 'ex-1'),
      ref('notaMedica', 'nm-1'),
    ];
    expect(ids(manual)).toEqual(['ex-2', 'ap-1', 'nm-2', 'ex-1', 'nm-1']);
    expect(anioTieneOrdenManual(anio, ORDEN_POR_DEFECTO, { ordenManual: manual })).toBe(true);
  });

  it('un documento creado después queda tras el último de su tipo', () => {
    const manual = [ref('notaMedica', 'nm-1'), ref('documentoExterno', 'ex-1'), ref('aptitud', 'ap-1')];
    // nm-2 y ex-2 no estaban cuando se guardó el orden
    expect(ids(manual)).toEqual(['nm-1', 'nm-2', 'ex-1', 'ex-2', 'ap-1']);
  });

  it('un documento nuevo de un tipo que no estaba en el año va al final', () => {
    const manual = [ref('notaMedica', 'nm-2'), ref('notaMedica', 'nm-1'), ref('documentoExterno', 'ex-2'), ref('documentoExterno', 'ex-1')];
    expect(ids(manual)).toEqual(['nm-2', 'nm-1', 'ex-2', 'ex-1', 'ap-1']);
  });

  it('ignora referencias a documentos eliminados, de otro año o repetidas', () => {
    const manual = [
      ref('notaMedica', 'eliminada'),
      ref('notaMedica', 'nm-2'),
      ref('notaMedica', 'nm-2'),
      ref('aptitud', 'nm-1'),
      ref('notaMedica', 'nm-1'),
      ref('documentoExterno', 'ex-1'),
      ref('documentoExterno', 'ex-2'),
      ref('aptitud', 'ap-1'),
    ];
    expect(ids(manual)).toEqual(['nm-2', 'nm-1', 'ex-1', 'ex-2', 'ap-1']);
  });

  it('si ninguna referencia aplica, el año no cuenta como personalizado', () => {
    const manual = [ref('notaMedica', 'de-otro-anio')];
    expect(ids(manual)).toEqual(['ap-1', 'ex-1', 'ex-2', 'nm-1', 'nm-2']);
    expect(anioTieneOrdenManual(anio, ORDEN_POR_DEFECTO, { ordenManual: manual })).toBe(false);
  });

  it('un año personalizado no cambia cuando el proveedor cambia su orden por defecto', () => {
    const manual = [ref('aptitud', 'ap-1'), ref('notaMedica', 'nm-1'), ref('notaMedica', 'nm-2'), ref('documentoExterno', 'ex-1'), ref('documentoExterno', 'ex-2')];
    const ordenDelProveedor = resolverOrdenTipos(['documentoExterno', 'notaMedica', 'aptitud']);
    const resultado = documentosDelAnioEnOrden(anio, ordenDelProveedor, { ordenManual: manual }).map((d) => d.documento._id);
    expect(resultado).toEqual(['ap-1', 'nm-1', 'nm-2', 'ex-1', 'ex-2']);
  });

  it('el PDF combinado usa el orden manual del año que lo tiene y el orden por tipo en los demás', () => {
    const expediente = {
      '2024': { aptitudes: [{ _id: 'ap-2024' }], notasMedicas: [{ _id: 'nm-2024' }] },
      '2025': { aptitudes: [{ _id: 'ap-2025' }], notasMedicas: [{ _id: 'nm-2025' }] },
    };
    const organizacion = { '2025': { orden: [ref('notaMedica', 'nm-2025'), ref('aptitud', 'ap-2025')] } };
    const posiciones = posicionesEnExpediente(expediente, ORDEN_POR_DEFECTO, {}, organizacion);
    const seleccion = ['ap-2024', 'ap-2025', 'nm-2024', 'nm-2025'].map((documentId) => ({ documentId }));
    expect(ordenarComoEnExpediente(seleccion, posiciones).map((d) => d.documentId)).toEqual([
      'nm-2025',
      'ap-2025',
      'ap-2024',
      'nm-2024',
    ]);
  });
});
