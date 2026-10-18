import { describe, it, expect } from 'vitest';
import {
  REGLAS_SUBGRUPOS_AUTOMATICOS,
  TIPOS_DOCUMENTO_EXPEDIENTE,
  anioTieneOrdenManual,
  documentosDe,
  documentosDelAnioEnOrden,
  estructuraDelAnio,
  ordenarComoEnExpediente,
  posicionesEnExpediente,
  resolverOrdenTipos,
  type DocumentoDelExpediente,
  type ElementoDelAnio,
} from './documentosExpediente';
import {
  colocarDocumentoEn,
  colocarSubgrupoEn,
  copiarParaOrganizar,
  crearSubgrupo,
  huellaDe,
  moverASubgrupo,
  moverDocumento,
  moverSubgrupo,
  organizacionDe,
  puedeMoverDocumento,
  quitarSubgrupo,
  renombrarSubgrupo,
} from './organizarExpediente';

const ORDEN_POR_DEFECTO = TIPOS_DOCUMENTO_EXPEDIENTE.map((d) => d.tipo);
const ref = (documentType: string, documentId: string, subgrupoId?: string) =>
  subgrupoId ? { documentType, documentId, subgrupoId } : { documentType, documentId };

/** Resume la estructura: 'id' para un documento suelto y 'Nombre[a,b]' para un subgrupo. */
const resumen = (elementos: readonly ElementoDelAnio[]) =>
  elementos.map((e) =>
    e.clase === 'documento' ? e.item.documento._id : `${e.nombre}[${e.documentos.map((d) => d.documento._id).join(',')}]`,
  );

const anio = () => ({
  aptitudes: [{ _id: 'ap' }],
  antidopings: [{ _id: 'ad' }],
  notasMedicas: [{ _id: 'n1' }, { _id: 'n2' }],
  documentosExternos: [{ _id: 'ex' }],
});
const ANTI = [{ id: 'sg', nombre: 'Antidoping' }];
const conAnti = [
  ref('aptitud', 'ap'),
  ref('antidoping', 'ad', 'sg'),
  ref('documentoExterno', 'ex', 'sg'),
  ref('notaMedica', 'n1'),
  ref('notaMedica', 'n2'),
];

describe('estructura de un año con subgrupos', () => {
  const estructura = (
    ordenManual: ReturnType<typeof ref>[],
    subgrupos = ANTI,
    documentos: Record<string, any> = anio(),
  ) => estructuraDelAnio(documentos, ORDEN_POR_DEFECTO, { ordenManual, subgrupos });

  it('sin organización guardada el año va por tipo, con los subgrupos automáticos que apliquen', () => {
    expect(resumen(estructuraDelAnio(anio(), ORDEN_POR_DEFECTO))).toEqual(['ap', 'ad', 'ex', 'Notas médicas[n1,n2]']);
  });

  it('el subgrupo ocupa el lugar de su primer documento y reúne a los suyos', () => {
    expect(resumen(estructura(conAnti))).toEqual(['ap', 'Antidoping[ad,ex]', 'n1', 'n2']);
  });

  it('reúne los documentos de un subgrupo aunque el orden guardado los traiga separados', () => {
    const separados = [
      ref('antidoping', 'ad', 'sg'),
      ref('aptitud', 'ap'),
      ref('documentoExterno', 'ex', 'sg'),
      ref('notaMedica', 'n1'),
      ref('notaMedica', 'n2'),
    ];
    expect(resumen(estructura(separados))).toEqual(['Antidoping[ad,ex]', 'ap', 'n1', 'n2']);
  });

  it('un documento que apunta a un subgrupo inexistente queda suelto', () => {
    expect(resumen(estructura(conAnti, []))).toEqual(['ap', 'ad', 'ex', 'n1', 'n2']);
  });

  it('un subgrupo cuyos documentos ya no existen se conserva vacío', () => {
    const sinLosSuyos = { aptitudes: [{ _id: 'ap' }], notasMedicas: [{ _id: 'n1' }] };
    expect(resumen(estructura(conAnti, ANTI, sinLosSuyos))).toEqual(['ap', 'n1', 'Antidoping[]']);
  });

  it('un subgrupo vacío vuelve al lugar con que se guardó', () => {
    const subgrupos = [
      { id: 'sg', nombre: 'Antidoping' },
      { id: 'v1', nombre: 'Por subir', posicion: 0 },
      { id: 'v2', nombre: 'Laboratorios', posicion: 3 },
      { id: 'v3', nombre: 'Muy lejos', posicion: 99 },
    ];
    expect(resumen(estructura(conAnti, subgrupos))).toEqual([
      'Por subir[]',
      'ap',
      'Antidoping[ad,ex]',
      'Laboratorios[]',
      'n1',
      'n2',
      'Muy lejos[]',
    ]);
  });

  it('un año con solo subgrupos vacíos guardados conserva el orden por tipo y no recibe automáticos', () => {
    const soloVacio = [{ id: 'v1', nombre: 'Por subir', posicion: 0 }];
    expect(resumen(estructuraDelAnio(anio(), ORDEN_POR_DEFECTO, { ordenManual: [], subgrupos: soloVacio }))).toEqual([
      'Por subir[]',
      'ap',
      'ad',
      'ex',
      'n1',
      'n2',
    ]);
  });

  it('un documento nuevo entra al subgrupo donde están todos los de su tipo', () => {
    const notas = [{ id: 'sg-n', nombre: 'Notas médicas' }];
    const guardado = [
      ref('aptitud', 'ap'),
      ref('notaMedica', 'n1', 'sg-n'),
      ref('antidoping', 'ad'),
      ref('documentoExterno', 'ex'),
    ];
    // n2 se creó después de guardar
    expect(resumen(estructura(guardado, notas))).toEqual(['ap', 'Notas médicas[n1,n2]', 'ad', 'ex']);
  });

  it('el primero de su tipo queda suelto tras el subgrupo donde está su tipo anterior', () => {
    const guardado = [
      ref('notaMedica', 'n1'),
      ref('aptitud', 'ap', 'sg'),
      ref('antidoping', 'ad', 'sg'),
      ref('notaMedica', 'n2'),
    ];
    // ex es nuevo; su tipo anterior (antidoping) está en el subgrupo
    expect(resumen(estructura(guardado))).toEqual(['n1', 'Antidoping[ap,ad]', 'ex', 'n2']);
  });

  it('el primero de su tipo queda suelto antes del subgrupo donde está su tipo siguiente', () => {
    const guardado = [
      ref('notaMedica', 'n1'),
      ref('antidoping', 'ad', 'sg'),
      ref('documentoExterno', 'ex', 'sg'),
      ref('notaMedica', 'n2'),
    ];
    // ap es nuevo y no hay tipo anterior en el año
    expect(resumen(estructura(guardado))).toEqual(['n1', 'ap', 'Antidoping[ad,ex]', 'n2']);
  });

  it('un documento nuevo queda suelto tras el subgrupo si los de su tipo están repartidos', () => {
    const documentos = { ...anio(), documentosExternos: [{ _id: 'ex' }, { _id: 'ex2' }, { _id: 'ex3' }] };
    const guardado = [
      ref('documentoExterno', 'ex'),
      ref('aptitud', 'ap'),
      ref('antidoping', 'ad', 'sg'),
      ref('documentoExterno', 'ex2', 'sg'),
      ref('notaMedica', 'n1'),
      ref('notaMedica', 'n2'),
    ];
    // ex3 es nuevo: hay externos dentro y fuera del subgrupo
    expect(resumen(estructura(guardado, ANTI, documentos))).toEqual([
      'ex',
      'ap',
      'Antidoping[ad,ex2]',
      'ex3',
      'n1',
      'n2',
    ]);
  });

  it('el PDF combinado sigue el orden con subgrupos, sin nada más', () => {
    const expediente = { '2025': anio() };
    const orden = [ref('notaMedica', 'n2'), ...conAnti.filter((r) => r.documentId !== 'n2')];
    const organizacion = { '2025': { orden, subgrupos: ANTI } };
    const posiciones = posicionesEnExpediente(expediente, ORDEN_POR_DEFECTO, {}, organizacion);
    const seleccion = ['ap', 'ad', 'ex', 'n1', 'n2'].map((documentId) => ({ documentId }));
    expect(ordenarComoEnExpediente(seleccion, posiciones).map((d) => d.documentId)).toEqual([
      'n2',
      'ap',
      'ad',
      'ex',
      'n1',
    ]);
    expect(
      documentosDelAnioEnOrden(anio(), ORDEN_POR_DEFECTO, { ordenManual: orden, subgrupos: ANTI }).map(
        (d) => d.documento._id,
      ),
    ).toEqual(['n2', 'ap', 'ad', 'ex', 'n1']);
  });
});

describe('modo organizar: operaciones', () => {
  const base = () => estructuraDelAnio(anio(), ORDEN_POR_DEFECTO, { ordenManual: conAnti, subgrupos: ANTI });
  const doc = (elementos: readonly ElementoDelAnio[], id: string): DocumentoDelExpediente =>
    documentosDe(elementos).find((d) => d.documento._id === id)!;

  it('no altera la estructura que recibe', () => {
    const original = base();
    const antes = resumen(original);
    moverDocumento(original, doc(original, 'ap'), 1);
    moverASubgrupo(original, doc(original, 'n1'), 'sg');
    quitarSubgrupo(original, 'sg');
    expect(resumen(original)).toEqual(antes);
  });

  it('bajar un documento suelto junto a un subgrupo lo mete al inicio; subirlo, al final', () => {
    const e = base();
    expect(resumen(moverDocumento(e, doc(e, 'ap'), 1))).toEqual(['Antidoping[ap,ad,ex]', 'n1', 'n2']);
    expect(resumen(moverDocumento(e, doc(e, 'n1'), -1))).toEqual(['ap', 'Antidoping[ad,ex,n1]', 'n2']);
  });

  it('dentro del subgrupo se mueve entre los suyos y al pasar el borde sale', () => {
    const e = base();
    expect(resumen(moverDocumento(e, doc(e, 'ad'), 1))).toEqual(['ap', 'Antidoping[ex,ad]', 'n1', 'n2']);
    expect(resumen(moverDocumento(e, doc(e, 'ad'), -1))).toEqual(['ap', 'ad', 'Antidoping[ex]', 'n1', 'n2']);
    expect(resumen(moverDocumento(e, doc(e, 'ex'), 1))).toEqual(['ap', 'Antidoping[ad]', 'ex', 'n1', 'n2']);
  });

  it('entre documentos sueltos intercambia lugares y se topa en los extremos del año', () => {
    const e = base();
    expect(resumen(moverDocumento(e, doc(e, 'n1'), 1))).toEqual(['ap', 'Antidoping[ad,ex]', 'n2', 'n1']);
    expect(puedeMoverDocumento(e, doc(e, 'ap'), -1)).toBe(false);
    expect(puedeMoverDocumento(e, doc(e, 'n2'), 1)).toBe(false);
    expect(puedeMoverDocumento(e, doc(e, 'ad'), -1)).toBe(true);
    expect(resumen(moverDocumento(e, doc(e, 'ap'), -1))).toEqual(resumen(e));
  });

  it('el selector pasa un documento al final de un subgrupo o lo deja suelto junto a él', () => {
    const e = base();
    expect(resumen(moverASubgrupo(e, doc(e, 'n2'), 'sg'))).toEqual(['ap', 'Antidoping[ad,ex,n2]', 'n1']);
    expect(resumen(moverASubgrupo(e, doc(e, 'ad'), null))).toEqual(['ap', 'Antidoping[ex]', 'ad', 'n1', 'n2']);
    expect(resumen(moverASubgrupo(e, doc(e, 'ap'), null))).toEqual(resumen(e));
    expect(resumen(moverASubgrupo(e, doc(e, 'ap'), 'no-existe'))).toEqual(resumen(e));
  });

  it('soltar un documento lo deja en el contenedor y la posición donde cayó', () => {
    const e = base();
    // Entre los elementos del año
    expect(resumen(colocarDocumentoEn(e, doc(e, 'n2'), null, 0))).toEqual(['n2', 'ap', 'Antidoping[ad,ex]', 'n1']);
    expect(resumen(colocarDocumentoEn(e, doc(e, 'ap'), null, 2))).toEqual(['Antidoping[ad,ex]', 'n1', 'ap', 'n2']);
    // Dentro de un subgrupo
    expect(resumen(colocarDocumentoEn(e, doc(e, 'n1'), 'sg', 1))).toEqual(['ap', 'Antidoping[ad,n1,ex]', 'n2']);
    expect(resumen(colocarDocumentoEn(e, doc(e, 'ex'), 'sg', 0))).toEqual(['ap', 'Antidoping[ex,ad]', 'n1', 'n2']);
    // De un subgrupo hacia afuera
    expect(resumen(colocarDocumentoEn(e, doc(e, 'ex'), null, 3))).toEqual(['ap', 'Antidoping[ad]', 'n1', 'ex', 'n2']);
  });

  it('soltar fuera de rango lo deja en el extremo, y en un subgrupo inexistente no cambia nada', () => {
    const e = base();
    expect(resumen(colocarDocumentoEn(e, doc(e, 'ap'), null, 99))).toEqual(['Antidoping[ad,ex]', 'n1', 'n2', 'ap']);
    expect(resumen(colocarDocumentoEn(e, doc(e, 'ap'), 'sg', 99))).toEqual(['Antidoping[ad,ex,ap]', 'n1', 'n2']);
    expect(resumen(colocarDocumentoEn(e, doc(e, 'ap'), 'no-existe', 0))).toEqual(resumen(e));
  });

  it('crea, renombra, mueve y quita subgrupos', () => {
    const e = base();
    const conNuevo = crearSubgrupo(e, 'sg2');
    expect(resumen(conNuevo)[0]).toBe('Nuevo subgrupo[]');
    expect(resumen(renombrarSubgrupo(conNuevo, 'sg2', 'Auditivo'))[0]).toBe('Auditivo[]');
    const largo = renombrarSubgrupo(e, 'sg', 'x'.repeat(80)).find((el) => el.clase === 'subgrupo') as { nombre: string };
    expect(largo.nombre).toHaveLength(60);

    expect(resumen(moverSubgrupo(e, 'sg', 1))).toEqual(['ap', 'n1', 'Antidoping[ad,ex]', 'n2']);
    expect(resumen(moverSubgrupo(e, 'sg', -1))).toEqual(['Antidoping[ad,ex]', 'ap', 'n1', 'n2']);
    expect(resumen(moverSubgrupo(moverSubgrupo(e, 'sg', -1), 'sg', -1))).toEqual(['Antidoping[ad,ex]', 'ap', 'n1', 'n2']);
    expect(resumen(colocarSubgrupoEn(e, 'sg', 3))).toEqual(['ap', 'n1', 'n2', 'Antidoping[ad,ex]']);

    expect(resumen(quitarSubgrupo(e, 'sg'))).toEqual(['ap', 'ad', 'ex', 'n1', 'n2']);
  });

  it('lo que se guarda: orden completo con el subgrupo de cada documento', () => {
    expect(organizacionDe(base())).toEqual({ orden: conAnti, subgrupos: [{ ...ANTI[0], posicion: 1 }] });
  });

  it('guarda también los subgrupos vacíos, con su lugar, y da nombre a los que no lo tienen', () => {
    const e = renombrarSubgrupo(crearSubgrupo(base(), 'vacio'), 'sg', '   ');
    expect(organizacionDe(e).subgrupos).toEqual([
      { id: 'vacio', nombre: 'Nuevo subgrupo', posicion: 0 },
      { id: 'sg', nombre: 'Nuevo subgrupo', posicion: 2 },
    ]);
    expect(huellaDe(crearSubgrupo(base(), 'vacio'))).not.toBe(huellaDe(base()));
  });

  it('un subgrupo vacío guardado se vuelve a leer en el mismo lugar', () => {
    const e = moverSubgrupo(moverSubgrupo(crearSubgrupo(base(), 'vacio', 'Por subir'), 'vacio', 1), 'vacio', 1);
    expect(resumen(e)).toEqual(['ap', 'Antidoping[ad,ex]', 'Por subir[]', 'n1', 'n2']);
    const { orden, subgrupos } = organizacionDe(e);
    expect(resumen(estructuraDelAnio(anio(), ORDEN_POR_DEFECTO, { ordenManual: orden, subgrupos }))).toEqual(resumen(e));
  });

  it('guardar y volver a leer da la misma estructura', () => {
    const inicial = base();
    const e = moverASubgrupo(moverSubgrupo(inicial, 'sg', 1), doc(inicial, 'n2'), 'sg');
    const { orden, subgrupos } = organizacionDe(e);
    const releida = estructuraDelAnio(anio(), ORDEN_POR_DEFECTO, { ordenManual: orden, subgrupos });
    expect(resumen(releida)).toEqual(resumen(e));
  });
});

describe('subgrupos automáticos', () => {
  const docs = (tipo: string, cantidad: number) =>
    Array.from({ length: cantidad }, (_, i) => ({ _id: `${tipo}-${i + 1}` }));
  const automaticos = (documentos: Record<string, any>, opciones = {}) =>
    estructuraDelAnio(documentos, ORDEN_POR_DEFECTO, opciones).filter((e) => e.clase === 'subgrupo');

  it('las reglas son las acordadas y cada tipo pertenece a una sola', () => {
    expect(REGLAS_SUBGRUPOS_AUTOMATICOS.map((r) => r.nombre)).toEqual([
      'Notas médicas',
      'Seguimiento cardiometabólico',
      'Auditivo',
      'Salud mental',
    ]);
    const tipos = REGLAS_SUBGRUPOS_AUTOMATICOS.flatMap((r) => r.tipos);
    expect(new Set(tipos).size).toBe(tipos.length);
    tipos.forEach((tipo) => expect(ORDEN_POR_DEFECTO).toContain(tipo));
  });

  it('notas médicas: con una sola no hay subgrupo; con dos, sí', () => {
    expect(automaticos({ notasMedicas: docs('nm', 1) })).toHaveLength(0);
    expect(resumen(estructuraDelAnio({ aptitudes: docs('ap', 1), notasMedicas: docs('nm', 2) }, ORDEN_POR_DEFECTO))).toEqual([
      'ap-1',
      'Notas médicas[nm-1,nm-2]',
    ]);
  });

  it('seguimiento cardiometabólico: dos eventos, y el informe longitudinal los acompaña', () => {
    expect(
      automaticos({ eventoSeguimientoCardiometabolico: docs('ev', 1), informeLongitudinalCardiometabolico: docs('il', 1) }),
    ).toHaveLength(0);
    expect(
      resumen(
        estructuraDelAnio(
          { eventoSeguimientoCardiometabolico: docs('ev', 2), informeLongitudinalCardiometabolico: docs('il', 1) },
          ORDEN_POR_DEFECTO,
        ),
      ),
    ).toEqual(['Seguimiento cardiometabólico[ev-1,ev-2,il-1]']);
  });

  it('auditivo: historia otológica y audiometría juntas, con el informe audiométrico si existe', () => {
    expect(automaticos({ audiometrias: docs('au', 3) })).toHaveLength(0);
    expect(automaticos({ historiaOtologica: docs('ho', 1) })).toHaveLength(0);
    expect(
      resumen(
        estructuraDelAnio(
          {
            aptitudes: docs('ap', 1),
            historiaOtologica: docs('ho', 1),
            audiometrias: docs('au', 1),
            informeLongitudinalAudiometrico: docs('ia', 1),
            antidopings: docs('ad', 1),
          },
          ORDEN_POR_DEFECTO,
        ),
      ),
    ).toEqual(['ap-1', 'Auditivo[ho-1,au-1,ia-1]', 'ad-1']);
  });

  it('salud mental: dos o más entre la entrevista psicológica y los tres cuestionarios', () => {
    expect(automaticos({ entrevistasPsicologicas: docs('ep', 1) })).toHaveLength(0);
    expect(automaticos({ cuestionarioNordico: docs('cn', 2), evaluacionSuenoVigilia: docs('sv', 2) })).toHaveLength(0);
    expect(resumen(estructuraDelAnio({ trastornosEstadoAnimo: docs('mdq', 2) }, ORDEN_POR_DEFECTO))).toEqual([
      'Salud mental[mdq-1,mdq-2]',
    ]);
    expect(
      resumen(
        estructuraDelAnio(
          {
            recetas: docs('re', 1),
            entrevistasPsicologicas: docs('ep', 1),
            cuestionarioProdromalBreve: docs('pb', 1),
            trastornoLimitePersonalidad: docs('tlp', 1),
            cuestionarioNordico: docs('cn', 1),
          },
          ORDEN_POR_DEFECTO,
        ),
      ),
    ).toEqual(['re-1', 'Salud mental[ep-1,pb-1,tlp-1]', 'cn-1']);
  });

  it('se señalan como automáticos y dejan de serlo al copiarse para organizar', () => {
    const elementos = estructuraDelAnio({ notasMedicas: docs('nm', 2) }, ORDEN_POR_DEFECTO);
    expect((elementos[0] as any).automatico).toBe(true);
    expect((copiarParaOrganizar(elementos)[0] as any).automatico).toBe(false);
  });

  it('reúnen sus documentos aunque el orden del proveedor separe sus tipos', () => {
    const orden = resolverOrdenTipos(['historiaOtologica', 'aptitud', 'audiometria']);
    const documentos = { historiaOtologica: docs('ho', 1), aptitudes: docs('ap', 1), audiometrias: docs('au', 1) };
    expect(resumen(estructuraDelAnio(documentos, orden))).toEqual(['Auditivo[ho-1,au-1]', 'ap-1']);
  });

  it('no se aplican en un año organizado a mano', () => {
    const documentos = { notasMedicas: docs('nm', 3) };
    const ordenManual = [ref('notaMedica', 'nm-2'), ref('notaMedica', 'nm-1'), ref('notaMedica', 'nm-3')];
    expect(automaticos(documentos, { ordenManual })).toHaveLength(0);
    expect(anioTieneOrdenManual(documentos, ORDEN_POR_DEFECTO, { ordenManual })).toBe(true);
    expect(anioTieneOrdenManual(documentos, ORDEN_POR_DEFECTO, {})).toBe(false);
  });

  it('un año con subgrupos guardados cuenta como organizado aunque su orden ya no aplique', () => {
    const subgrupos = [{ id: 'v', nombre: 'Por subir', posicion: 0 }];
    expect(anioTieneOrdenManual({ notasMedicas: docs('nm', 2) }, ORDEN_POR_DEFECTO, { ordenManual: [], subgrupos })).toBe(true);
  });
});
