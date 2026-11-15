/**
 * Códigos de formato (punto 34, docs/codigos-de-formato-especificacion.md): el código y una
 * línea adicional que el proveedor declara en su sistema de gestión («FCPE-022» / «Revisión: 01»)
 * y que salen en el encabezado de los PDF.
 *
 * Los documentos guardan su copia al crearse (lo hace el backend). Los formatos para firma se
 * arman en el navegador al imprimir, así que usan el código vigente de su tipo.
 * Debe coincidir con backend/src/modules/modulos-funciones/codigos-formato.ts y con
 * backend/src/modules/informes/helpers/codigo-formato-informe.helper.ts (aspecto en el PDF).
 */
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { nombreTipoDocumento } from '@/helpers/documentosExpediente';
import type { TipoFormatoFirma } from '@/types/formatoFirma';

export const CODIGO_FORMATO_MAX = 30;
export const LINEA_ADICIONAL_MAX = 40;

export interface CodigoFormato {
  codigo: string;
  lineaAdicional?: string;
}

export type CodigosFormato = Record<string, CodigoFormato>;

/** Documentos con PDF, en el orden del expediente (todos menos el documento externo). */
export const DOCUMENTOS_CON_CODIGO_FORMATO = [
  'notaAclaratoria',
  'constanciaAptitud',
  'aptitud',
  'historiaClinica',
  'exploracionFisica',
  'examenVista',
  'historiaOtologica',
  'audiometria',
  'informeLongitudinalAudiometrico',
  'antidoping',
  'certificado',
  'previoEspirometria',
  'notaMedica',
  'notaEnfermeria',
  'controlPrenatal',
  'certificadoExpedito',
  'receta',
  'entrevistaPsicologica',
  'trastornosEstadoAnimo',
  'cuestionarioProdromalBreve',
  'trastornoLimitePersonalidad',
  'cuestionarioNordico',
  'evaluacionSuenoVigilia',
  'eventoSeguimientoCardiometabolico',
  'informeLongitudinalCardiometabolico',
] as const;

/** Formatos para firma que se imprimen, con el nombre que usa su modal. */
export const FORMATOS_FIRMA_CON_CODIGO: { tipo: TipoFormatoFirma; nombre: string }[] = [
  { tipo: 'CONSENTIMIENTO_EVALUACION_MEDICA', nombre: 'Consentimiento para evaluación médica laboral' },
  { tipo: 'DECLARACION_VERACIDAD', nombre: 'Declaración de veracidad' },
  { tipo: 'CONSENTIMIENTO_ANTIDOPING', nombre: 'Consentimiento para prueba de detección de sustancias' },
];

export function nombreTipoConCodigo(tipo: string): string {
  return FORMATOS_FIRMA_CON_CODIGO.find((f) => f.tipo === tipo)?.nombre ?? nombreTipoDocumento(tipo);
}

/** Igual que el backend: sin espacios al inicio ni al final, y uno solo entre palabras. */
export const limpiarTextoCodigo = (valor: unknown): string =>
  typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';

/** Lo que se manda a guardar: solo los tipos con código. */
export function codigosParaGuardar(filas: Record<string, { codigo?: string; lineaAdicional?: string }>): CodigosFormato {
  const resultado: CodigosFormato = {};
  for (const [tipo, fila] of Object.entries(filas)) {
    const codigo = limpiarTextoCodigo(fila?.codigo);
    if (!codigo) continue;
    const lineaAdicional = limpiarTextoCodigo(fila?.lineaAdicional);
    resultado[tipo] = lineaAdicional ? { codigo, lineaAdicional } : { codigo };
  }
  return resultado;
}

/** El código vigente de un tipo, o null si la función está apagada o el tipo no tiene código. */
export function codigoFormatoVigente(
  proveedor: { codigosFormatoHabilitado?: boolean; codigosFormato?: CodigosFormato | null } | null | undefined,
  tipo: string,
): CodigoFormato | null {
  if (!proveedor?.codigosFormatoHabilitado) return null;
  const c = proveedor.codigosFormato?.[tipo];
  const codigo = limpiarTextoCodigo(c?.codigo);
  if (!codigo) return null;
  const lineaAdicional = limpiarTextoCodigo(c?.lineaAdicional);
  return lineaAdicional ? { codigo, lineaAdicional } : { codigo };
}

/** Mismo aspecto que en los PDF del backend: 8 pt, gris, arriba a la derecha a 50 pt del borde. */
const MARGEN_DERECHO = 50;
const POSICION_Y = 12;

export function bloqueCodigoFormato(codigoFormato: CodigoFormato | null | undefined): Content | null {
  const codigo = limpiarTextoCodigo(codigoFormato?.codigo);
  if (!codigo) return null;
  const lineaAdicional = limpiarTextoCodigo(codigoFormato?.lineaAdicional);
  // pdfmake ignora el margen de un bloque en posición absoluta: va en cada línea
  const linea = (text: string) => ({ text, margin: [0, 0, MARGEN_DERECHO, 0] });
  return {
    absolutePosition: { x: 0, y: POSICION_Y },
    stack: [linea(codigo), ...(lineaAdicional ? [linea(lineaAdicional)] : [])],
    fontSize: 8,
    color: '#6C757D',
    alignment: 'right',
    lineHeight: 0.8,
  } as Content;
}

/** El encabezado fijo con el código encima; sin código, el mismo encabezado. */
export function encabezadoConCodigoFormato(
  header: TDocumentDefinitions['header'],
  codigoFormato: CodigoFormato | null | undefined,
): TDocumentDefinitions['header'] {
  const bloque = bloqueCodigoFormato(codigoFormato);
  if (!bloque) return header;
  if (typeof header === 'function') {
    return (pagina, total, tamano) => {
      const base = header(pagina, total, tamano);
      const propio = bloqueCodigoFormato(codigoFormato) as Content;
      return base ? [propio, base] : [propio];
    };
  }
  return header ? [bloque, header] : [bloque];
}
