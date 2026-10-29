import { DOCUMENT_DISPLAY_NAMES } from '@/constants/rolePermissionPolicy';

export interface TipoDocumentoExpediente {
  /** Llave del tipo dentro de cada año en `documentsByYear`. */
  clave: string;
  /** Tipo de dominio; también es la propiedad con la que DocumentoItem recibe el documento. */
  tipo: string;
  /** Nombre con el que se arma la ruta del archivo. */
  etiquetaRuta: string;
  /** Campo con la fecha clínica del documento. */
  campoFecha: string;
  /** El nombre del archivo depende de otros documentos del expediente. */
  rutaConStore?: boolean;
}

/**
 * Tipos de documento del expediente, en el orden por defecto.
 * Debe coincidir con el backend (proveedores-salud/orden-documentos-expediente.ts).
 */
export const TIPOS_DOCUMENTO_EXPEDIENTE: readonly TipoDocumentoExpediente[] = [
  { clave: 'notasAclaratorias', tipo: 'notaAclaratoria', etiquetaRuta: 'Nota Aclaratoria', campoFecha: 'fechaNotaAclaratoria', rutaConStore: true },
  { clave: 'constanciasAptitud', tipo: 'constanciaAptitud', etiquetaRuta: 'Constancia de Aptitud', campoFecha: 'fechaConstanciaAptitud' },
  { clave: 'aptitudes', tipo: 'aptitud', etiquetaRuta: 'Aptitud', campoFecha: 'fechaAptitudPuesto' },
  { clave: 'historiasClinicas', tipo: 'historiaClinica', etiquetaRuta: 'Historia Clinica', campoFecha: 'fechaHistoriaClinica' },
  { clave: 'exploracionesFisicas', tipo: 'exploracionFisica', etiquetaRuta: 'Exploracion Fisica', campoFecha: 'fechaExploracionFisica' },
  { clave: 'examenesVista', tipo: 'examenVista', etiquetaRuta: 'Examen Vista', campoFecha: 'fechaExamenVista' },
  { clave: 'historiaOtologica', tipo: 'historiaOtologica', etiquetaRuta: 'Historia Otologica', campoFecha: 'fechaHistoriaOtologica' },
  { clave: 'audiometrias', tipo: 'audiometria', etiquetaRuta: 'Audiometria', campoFecha: 'fechaAudiometria' },
  { clave: 'informeLongitudinalAudiometrico', tipo: 'informeLongitudinalAudiometrico', etiquetaRuta: 'Informe Longitudinal Audiometrico', campoFecha: 'fechaInformeLongitudinalAudiometrico' },
  { clave: 'antidopings', tipo: 'antidoping', etiquetaRuta: 'Antidoping', campoFecha: 'fechaAntidoping' },
  { clave: 'certificados', tipo: 'certificado', etiquetaRuta: 'Certificado', campoFecha: 'fechaCertificado' },
  { clave: 'previoEspirometria', tipo: 'previoEspirometria', etiquetaRuta: 'Previo Espirometria', campoFecha: 'fechaPrevioEspirometria' },
  { clave: 'documentosExternos', tipo: 'documentoExterno', etiquetaRuta: 'Documento Externo', campoFecha: 'fechaDocumento' },
  { clave: 'notasMedicas', tipo: 'notaMedica', etiquetaRuta: 'Nota Medica', campoFecha: 'fechaNotaMedica' },
  { clave: 'controlPrenatal', tipo: 'controlPrenatal', etiquetaRuta: 'Control Prenatal', campoFecha: 'fechaInicioControlPrenatal' },
  { clave: 'certificadosExpedito', tipo: 'certificadoExpedito', etiquetaRuta: 'Certificado Expedito', campoFecha: 'fechaCertificadoExpedito' },
  { clave: 'recetas', tipo: 'receta', etiquetaRuta: 'Receta', campoFecha: 'fechaReceta' },
  { clave: 'entrevistasPsicologicas', tipo: 'entrevistaPsicologica', etiquetaRuta: 'Entrevista Psicologica', campoFecha: 'fechaEntrevistaPsicologica' },
  { clave: 'trastornosEstadoAnimo', tipo: 'trastornosEstadoAnimo', etiquetaRuta: 'Trastornos Estado Animo', campoFecha: 'fechaTrastornosEstadoAnimo' },
  { clave: 'cuestionarioProdromalBreve', tipo: 'cuestionarioProdromalBreve', etiquetaRuta: 'Cuestionario Prodromal Breve', campoFecha: 'fechaCuestionarioProdromalBreve' },
  { clave: 'trastornoLimitePersonalidad', tipo: 'trastornoLimitePersonalidad', etiquetaRuta: 'Trastorno Limite Personalidad', campoFecha: 'fechaTrastornoLimitePersonalidad' },
  { clave: 'cuestionarioNordico', tipo: 'cuestionarioNordico', etiquetaRuta: 'Cuestionario Nordico', campoFecha: 'fechaCuestionarioNordico' },
  { clave: 'evaluacionSuenoVigilia', tipo: 'evaluacionSuenoVigilia', etiquetaRuta: 'Evaluacion Sueno Vigilia', campoFecha: 'fechaEvaluacionSuenoVigilia' },
  { clave: 'eventoSeguimientoCardiometabolico', tipo: 'eventoSeguimientoCardiometabolico', etiquetaRuta: 'Evento Seguimiento Cardiometabolico', campoFecha: 'fechaEventoSeguimientoCardiometabolico' },
  { clave: 'informeLongitudinalCardiometabolico', tipo: 'informeLongitudinalCardiometabolico', etiquetaRuta: 'Informe Longitudinal Cardiometabólico', campoFecha: 'fechaInformeLongitudinalCardiometabolico' },
];

const ORDEN_POR_DEFECTO = TIPOS_DOCUMENTO_EXPEDIENTE.map((definicion) => definicion.tipo);
const DEFINICION_POR_TIPO = new Map(TIPOS_DOCUMENTO_EXPEDIENTE.map((definicion) => [definicion.tipo, definicion]));

/** Referencia a un documento dentro del orden manual de un año. */
export interface ReferenciaDocumento {
  documentType: string;
  documentId: string;
  /** Subgrupo del año al que pertenece; ausente si va suelto. */
  subgrupoId?: string;
}

/** Subgrupo («carpeta») que el usuario creó dentro de un año. */
export interface SubgrupoGuardado {
  id: string;
  nombre: string;
  /** Lugar entre los elementos del año; sitúa a los subgrupos que aún no tienen documentos. */
  posicion?: number;
}

/** Organización que el usuario guardó para un año del expediente. */
export interface OrganizacionDelAnio {
  orden: ReferenciaDocumento[];
  subgrupos?: SubgrupoGuardado[];
}

export type OrganizacionPorAnio = Record<string, OrganizacionDelAnio | undefined>;

export interface OpcionesOrdenExpediente {
  /** Control prenatal solo existe para algunos proveedores. */
  controlPrenatalEnabled?: boolean;
  /** Orden manual del año; sin él se usa el orden por tipo. */
  ordenManual?: readonly ReferenciaDocumento[] | null;
  /** Subgrupos del año, también los que aún no tienen documentos. */
  subgrupos?: readonly SubgrupoGuardado[] | null;
}

export interface DocumentoDelExpediente {
  definicion: TipoDocumentoExpediente;
  documento: Record<string, any>;
}

/** Lo que el año muestra de arriba abajo: documentos sueltos y subgrupos con sus documentos. */
export interface DocumentoSuelto {
  clase: 'documento';
  item: DocumentoDelExpediente;
}

export interface SubgrupoDelAnio {
  clase: 'subgrupo';
  id: string;
  nombre: string;
  documentos: DocumentoDelExpediente[];
  /** Lo formó una regla, no una persona; deja de serlo en cuanto el año se organiza a mano. */
  automatico?: boolean;
}

export type ElementoDelAnio = DocumentoSuelto | SubgrupoDelAnio;

export const nombreTipoDocumento = (tipo: string): string => DOCUMENT_DISPLAY_NAMES[tipo] ?? tipo;

/** Nombres que en una frase se dicen más corto que en el expediente. */
const NOMBRE_CORTO_EN_FRASE: Record<string, string> = {
  aptitud: 'aptitud',
};

/**
 * Nombre del tipo dentro de una frase («¿Eliminar historia clínica?»): las palabras en
 * mayúscula inicial pasan a minúsculas y las siglas se conservan («(MDQ)»).
 */
export const nombreTipoDocumentoEnFrase = (tipo: string): string =>
  NOMBRE_CORTO_EN_FRASE[tipo] ??
  nombreTipoDocumento(tipo)
    .split(' ')
    .map((palabra) => (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñü]+$/.test(palabra) ? palabra.toLowerCase() : palabra))
    .join(' ');

/**
 * Orden completo de tipos a partir de lo que guardó el proveedor.
 * Lo desconocido o repetido se ignora, y un tipo que la lista guardada no trae
 * (por ejemplo uno agregado después) se coloca tras su vecino del orden por defecto.
 */
export function resolverOrdenTipos(ordenGuardado?: readonly string[] | null): string[] {
  const orden: string[] = [];
  (ordenGuardado ?? []).forEach((tipo) => {
    if (DEFINICION_POR_TIPO.has(tipo) && !orden.includes(tipo)) orden.push(tipo);
  });
  if (orden.length === 0) return [...ORDEN_POR_DEFECTO];

  ORDEN_POR_DEFECTO.forEach((tipo, indice) => {
    if (orden.includes(tipo)) return;
    const anterior = ORDEN_POR_DEFECTO[indice - 1];
    orden.splice(anterior ? orden.indexOf(anterior) + 1 : 0, 0, tipo);
  });
  return orden;
}

const claveDocumento = (tipo: string, id: unknown) => `${tipo}:${String(id)}`;

export const referenciaDe = ({ definicion, documento }: DocumentoDelExpediente): ReferenciaDocumento => ({
  documentType: definicion.tipo,
  documentId: String(documento._id),
});

interface DocumentoColocado {
  item: DocumentoDelExpediente;
  subgrupoId?: string;
}

/**
 * Aplica el orden manual sobre el orden por tipo. Las referencias a documentos que ya no
 * están en el año se ignoran. Un documento que el orden manual no conoce (creado después):
 *  - entra al subgrupo donde están todos los de su tipo, si es el caso;
 *  - si no, queda suelto tras el último de su tipo (o tras el subgrupo que lo contiene);
 *  - si es el primero de su tipo en el año, se acomoda según el orden de tipos: suelto tras
 *    el último del tipo anterior más cercano que haya en el año o, si no hay, antes del primero
 *    del tipo siguiente más cercano (fuera del subgrupo en que esté ese vecino);
 *  - y va al final solo si el año no tiene nada con qué compararlo.
 * Devuelve `null` cuando el orden manual no aplica a ningún documento del año.
 */
function aplicarOrdenManual(
  porTipo: DocumentoDelExpediente[],
  ordenManual: readonly ReferenciaDocumento[],
  subgruposValidos: ReadonlySet<string>,
): DocumentoColocado[] | null {
  const disponibles = new Map(
    porTipo.map((item) => [claveDocumento(item.definicion.tipo, item.documento._id), item]),
  );
  const colocados = new Set<string>();
  const resultado: DocumentoColocado[] = [];

  ordenManual.forEach((referencia) => {
    const clave = claveDocumento(referencia.documentType, referencia.documentId);
    const item = disponibles.get(clave);
    if (!item || colocados.has(clave)) return;
    colocados.add(clave);
    const subgrupoId =
      referencia.subgrupoId && subgruposValidos.has(referencia.subgrupoId) ? referencia.subgrupoId : undefined;
    resultado.push({ item, subgrupoId });
  });
  if (resultado.length === 0) return null;

  // Orden de los tipos del año (porTipo ya viene en el orden de tipos del proveedor)
  const tiposDelAnio = [...new Set(porTipo.map((item) => item.definicion.tipo))];
  const indicesDelTipo = (tipo: string) =>
    resultado.flatMap((colocado, indice) => (colocado.item.definicion.tipo === tipo ? [indice] : []));
  const extremoDelSubgrupo = (subgrupoId: string, ultimo: boolean) => {
    const indices = resultado.flatMap((colocado, indice) => (colocado.subgrupoId === subgrupoId ? [indice] : []));
    return ultimo ? indices[indices.length - 1] : indices[0];
  };

  /** Lugar para el primero de su tipo: junto a su vecino más cercano en el orden de tipos. */
  const lugarPorOrdenDeTipos = (tipo: string): number => {
    const posicion = tiposDelAnio.indexOf(tipo);
    for (let i = posicion - 1; i >= 0; i -= 1) {
      const delAnterior = indicesDelTipo(tiposDelAnio[i]);
      if (delAnterior.length === 0) continue;
      const ultimo = delAnterior[delAnterior.length - 1];
      const subgrupoId = resultado[ultimo].subgrupoId;
      return (subgrupoId ? extremoDelSubgrupo(subgrupoId, true) : ultimo) + 1;
    }
    for (let i = posicion + 1; i < tiposDelAnio.length; i += 1) {
      const delSiguiente = indicesDelTipo(tiposDelAnio[i]);
      if (delSiguiente.length === 0) continue;
      const subgrupoId = resultado[delSiguiente[0]].subgrupoId;
      return subgrupoId ? extremoDelSubgrupo(subgrupoId, false) : delSiguiente[0];
    }
    return resultado.length;
  };

  porTipo.forEach((item) => {
    if (colocados.has(claveDocumento(item.definicion.tipo, item.documento._id))) return;

    const delTipo = indicesDelTipo(item.definicion.tipo);
    if (delTipo.length === 0) {
      resultado.splice(lugarPorOrdenDeTipos(item.definicion.tipo), 0, { item });
      return;
    }

    const ultimo = delTipo[delTipo.length - 1];
    const subgrupoDelUltimo = resultado[ultimo].subgrupoId;
    if (!subgrupoDelUltimo) {
      resultado.splice(ultimo + 1, 0, { item });
      return;
    }
    const todosEnElMismo = delTipo.every((indice) => resultado[indice].subgrupoId === subgrupoDelUltimo);
    if (todosEnElMismo) {
      resultado.splice(ultimo + 1, 0, { item, subgrupoId: subgrupoDelUltimo });
      return;
    }
    let finDelSubgrupo = ultimo;
    resultado.forEach((colocado, indice) => {
      if (colocado.subgrupoId === subgrupoDelUltimo) finDelSubgrupo = indice;
    });
    resultado.splice(finDelSubgrupo + 1, 0, { item });
  });
  return resultado;
}

const subgruposUtiles = (subgrupos?: readonly SubgrupoGuardado[] | null) =>
  new Map((subgrupos ?? []).filter((s) => s?.id && typeof s.nombre === 'string').map((s) => [s.id, s]));

/**
 * Subgrupos que se forman solos en un año que nadie ha organizado. Cada regla reúne los
 * documentos de sus tipos cuando se cumple su condición.
 */
export interface ReglaSubgrupoAutomatico {
  id: string;
  nombre: string;
  tipos: readonly string[];
  aplica: (cuantos: (tipo: string) => number) => boolean;
}

const TIPOS_SALUD_MENTAL = [
  'entrevistaPsicologica',
  'trastornosEstadoAnimo',
  'cuestionarioProdromalBreve',
  'trastornoLimitePersonalidad',
] as const;

export const REGLAS_SUBGRUPOS_AUTOMATICOS: readonly ReglaSubgrupoAutomatico[] = [
  {
    id: 'auto-notas-medicas',
    nombre: 'Notas médicas',
    tipos: ['notaMedica'],
    aplica: (cuantos) => cuantos('notaMedica') >= 2,
  },
  {
    id: 'auto-seguimiento-cardiometabolico',
    nombre: 'Seguimiento cardiometabólico',
    tipos: ['eventoSeguimientoCardiometabolico', 'informeLongitudinalCardiometabolico'],
    aplica: (cuantos) => cuantos('eventoSeguimientoCardiometabolico') >= 2,
  },
  {
    id: 'auto-auditivo',
    nombre: 'Auditivo',
    tipos: ['historiaOtologica', 'audiometria', 'informeLongitudinalAudiometrico'],
    aplica: (cuantos) => cuantos('historiaOtologica') >= 1 && cuantos('audiometria') >= 1,
  },
  {
    id: 'auto-salud-mental',
    nombre: 'Salud mental',
    tipos: TIPOS_SALUD_MENTAL,
    aplica: (cuantos) => TIPOS_SALUD_MENTAL.reduce((total, tipo) => total + cuantos(tipo), 0) >= 2,
  },
];

/** Orden por tipo con los subgrupos automáticos que apliquen; cada uno en el lugar de su primer documento. */
function conSubgruposAutomaticos(porTipo: DocumentoDelExpediente[]): ElementoDelAnio[] {
  const conteo = new Map<string, number>();
  porTipo.forEach(({ definicion }) => conteo.set(definicion.tipo, (conteo.get(definicion.tipo) ?? 0) + 1));
  const reglaDelTipo = new Map<string, ReglaSubgrupoAutomatico>();
  REGLAS_SUBGRUPOS_AUTOMATICOS.forEach((regla) => {
    if (!regla.aplica((tipo) => conteo.get(tipo) ?? 0)) return;
    regla.tipos.forEach((tipo) => reglaDelTipo.set(tipo, regla));
  });

  const elementos: ElementoDelAnio[] = [];
  const abiertos = new Map<string, SubgrupoDelAnio>();
  porTipo.forEach((item) => {
    const regla = reglaDelTipo.get(item.definicion.tipo);
    if (!regla) {
      elementos.push({ clase: 'documento', item });
      return;
    }
    let subgrupo = abiertos.get(regla.id);
    if (!subgrupo) {
      subgrupo = { clase: 'subgrupo', id: regla.id, nombre: regla.nombre, documentos: [], automatico: true };
      abiertos.set(regla.id, subgrupo);
      elementos.push(subgrupo);
    }
    subgrupo.documentos.push(item);
  });
  return elementos;
}

/**
 * Estructura de un año: documentos sueltos y subgrupos, de arriba abajo.
 *  - Año sin organizar: por tipo y, dentro del tipo, como llegan (por fecha), con los
 *    subgrupos automáticos que apliquen.
 *  - Año organizado a mano: el orden y los subgrupos que dejó el usuario, sin automáticos.
 *    Un subgrupo ocupa el lugar de su primer documento; vacío, el lugar con que se guardó.
 */
export function estructuraDelAnio(
  documentosDelAnio: Record<string, any> | null | undefined,
  ordenTipos: readonly string[],
  opciones: OpcionesOrdenExpediente = {},
): ElementoDelAnio[] {
  const porTipo = documentosDelAnioPorTipo(documentosDelAnio, ordenTipos, opciones);
  const subgrupos = subgruposUtiles(opciones.subgrupos);
  const colocados: DocumentoColocado[] | null = opciones.ordenManual?.length
    ? aplicarOrdenManual(porTipo, opciones.ordenManual, new Set(subgrupos.keys()))
    : null;
  if (!colocados && subgrupos.size === 0) return conSubgruposAutomaticos(porTipo);

  const elementos: ElementoDelAnio[] = [];
  const abiertos = new Map<string, SubgrupoDelAnio>();
  (colocados ?? porTipo.map((item) => ({ item }) as DocumentoColocado)).forEach(({ item, subgrupoId }) => {
    if (!subgrupoId) {
      elementos.push({ clase: 'documento', item });
      return;
    }
    let subgrupo = abiertos.get(subgrupoId);
    if (!subgrupo) {
      subgrupo = { clase: 'subgrupo', id: subgrupoId, nombre: subgrupos.get(subgrupoId)!.nombre, documentos: [] };
      abiertos.set(subgrupoId, subgrupo);
      elementos.push(subgrupo);
    }
    subgrupo.documentos.push(item);
  });

  // Subgrupos que aún no tienen documentos: vuelven al lugar que tenían al guardarse
  const SIN_LUGAR = Number.MAX_SAFE_INTEGER;
  [...subgrupos.values()]
    .filter((subgrupo) => !abiertos.has(subgrupo.id))
    .sort((a, b) => (a.posicion ?? SIN_LUGAR) - (b.posicion ?? SIN_LUGAR))
    .forEach(({ id, nombre, posicion }) => {
      const lugar = Math.min(Math.max(posicion ?? elementos.length, 0), elementos.length);
      elementos.splice(lugar, 0, { clase: 'subgrupo', id, nombre, documentos: [] });
    });
  return elementos;
}

/** Documentos de la estructura en una sola lista, en el orden en que se leen. */
export const documentosDe = (elementos: readonly ElementoDelAnio[]): DocumentoDelExpediente[] =>
  elementos.flatMap((elemento) => (elemento.clase === 'documento' ? [elemento.item] : elemento.documentos));

/** Documentos de un año en el orden en que se muestran (y en el que se combinan). */
export function documentosDelAnioEnOrden(
  documentosDelAnio: Record<string, any> | null | undefined,
  ordenTipos: readonly string[],
  opciones: OpcionesOrdenExpediente = {},
): DocumentoDelExpediente[] {
  return documentosDe(estructuraDelAnio(documentosDelAnio, ordenTipos, opciones));
}

/** Un año está organizado a mano si su orden manual aplica a algún documento o tiene subgrupos guardados. */
export function anioTieneOrdenManual(
  documentosDelAnio: Record<string, any> | null | undefined,
  ordenTipos: readonly string[],
  opciones: OpcionesOrdenExpediente = {},
): boolean {
  if (subgruposUtiles(opciones.subgrupos).size > 0) return true;
  if (!opciones.ordenManual?.length) return false;
  const porTipo = documentosDelAnioPorTipo(documentosDelAnio, ordenTipos, opciones);
  return aplicarOrdenManual(porTipo, opciones.ordenManual, new Set()) !== null;
}

function documentosDelAnioPorTipo(
  documentosDelAnio: Record<string, any> | null | undefined,
  ordenTipos: readonly string[],
  opciones: OpcionesOrdenExpediente,
): DocumentoDelExpediente[] {
  const { controlPrenatalEnabled = true } = opciones;
  const resultado: DocumentoDelExpediente[] = [];

  ordenTipos.forEach((tipo) => {
    const definicion = DEFINICION_POR_TIPO.get(tipo);
    if (!definicion) return;
    if (tipo === 'controlPrenatal' && !controlPrenatalEnabled) return;
    const documentos = documentosDelAnio?.[definicion.clave];
    if (!Array.isArray(documentos)) return;
    documentos.forEach((documento) => resultado.push({ definicion, documento }));
  });
  return resultado;
}

/**
 * Posición de cada documento en el expediente tal como se ve en pantalla:
 * año por año, del más reciente al más antiguo. Es el orden del PDF combinado;
 * los subgrupos solo influyen en ese orden.
 */
export function posicionesEnExpediente(
  documentsByYear: Record<string, Record<string, any>> | null | undefined,
  ordenTipos: readonly string[],
  opciones: Omit<OpcionesOrdenExpediente, 'ordenManual' | 'subgrupos'> = {},
  organizacion: OrganizacionPorAnio = {},
): Map<string, number> {
  const posiciones = new Map<string, number>();
  Object.keys(documentsByYear ?? {})
    .sort((a, b) => Number(b) - Number(a))
    .forEach((anio) => {
      const opcionesDelAnio = {
        ...opciones,
        ordenManual: organizacion[anio]?.orden,
        subgrupos: organizacion[anio]?.subgrupos,
      };
      documentosDelAnioEnOrden(documentsByYear![anio], ordenTipos, opcionesDelAnio).forEach(({ documento }) => {
        if (documento?._id && !posiciones.has(documento._id)) {
          posiciones.set(documento._id, posiciones.size);
        }
      });
    });
  return posiciones;
}

/** Con la inmutabilidad activa, un documento finalizado o anulado ya no se puede eliminar. */
export function esDocumentoInmutable(
  documento: { estado?: string } | null | undefined,
  documentImmutabilityEnabled: boolean,
): boolean {
  if (!documentImmutabilityEnabled) return false;
  const estado = documento?.estado?.toLowerCase();
  return estado === 'finalizado' || estado === 'anulado';
}

export interface OpcionesEliminacionMasiva {
  /** Control prenatal solo existe para algunos proveedores. */
  controlPrenatalEnabled?: boolean;
  documentImmutabilityEnabled?: boolean;
}

export interface SeleccionParaEliminar<T> {
  eliminables: T[];
  /** Finalizados o anulados con la inmutabilidad activa. */
  inmutables: T[];
  /** Ya no están en el expediente (o son de un tipo que el proveedor no usa). */
  noLocalizados: T[];
}

/**
 * Separa una selección en lo que se puede eliminar y lo que no. Cada documento se localiza
 * por tipo e id, no por la ruta de su archivo, y cuenta una sola vez aunque esté repetido.
 */
export function clasificarSeleccionParaEliminar<T extends ReferenciaDocumento>(
  documentsByYear: Record<string, Record<string, any>> | null | undefined,
  seleccion: readonly T[],
  opciones: OpcionesEliminacionMasiva = {},
): SeleccionParaEliminar<T> {
  const { controlPrenatalEnabled = true, documentImmutabilityEnabled = false } = opciones;

  const documentos = new Map<string, Record<string, any>>();
  Object.values(documentsByYear ?? {}).forEach((documentosDelAnio) => {
    TIPOS_DOCUMENTO_EXPEDIENTE.forEach(({ clave, tipo }) => {
      if (tipo === 'controlPrenatal' && !controlPrenatalEnabled) return;
      const delTipo = documentosDelAnio?.[clave];
      if (!Array.isArray(delTipo)) return;
      delTipo.forEach((documento) => {
        if (documento?._id) documentos.set(claveDocumento(tipo, documento._id), documento);
      });
    });
  });

  const resultado: SeleccionParaEliminar<T> = { eliminables: [], inmutables: [], noLocalizados: [] };
  const vistos = new Set<string>();
  seleccion.forEach((seleccionado) => {
    const clave = claveDocumento(seleccionado.documentType, seleccionado.documentId);
    if (vistos.has(clave)) return;
    vistos.add(clave);
    const documento = documentos.get(clave);
    if (!documento) resultado.noLocalizados.push(seleccionado);
    else if (esDocumentoInmutable(documento, documentImmutabilityEnabled)) resultado.inmutables.push(seleccionado);
    else resultado.eliminables.push(seleccionado);
  });
  return resultado;
}

/** Ordena una selección de documentos como aparecen en el expediente; lo no localizado va al final. */
export function ordenarComoEnExpediente<T extends { documentId: string }>(
  seleccion: readonly T[],
  posiciones: Map<string, number>,
): T[] {
  const posicion = (doc: T) => posiciones.get(doc.documentId) ?? Number.POSITIVE_INFINITY;
  return [...seleccion].sort((a, b) => {
    const diferencia = posicion(a) - posicion(b);
    return Number.isNaN(diferencia) ? 0 : diferencia;
  });
}
