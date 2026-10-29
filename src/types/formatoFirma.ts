/**
 * Texto de los formatos que firma el trabajador, tal como lo entrega el backend
 * (backend/src/modules/formatos-firmados/constants/formatos-firma-texto.constants.ts).
 */

/** En el orden en que se muestran en el modal. */
export type TipoFormatoFirma =
  | 'CONSENTIMIENTO_EVALUACION_MEDICA'
  | 'DECLARACION_VERACIDAD'
  | 'CONSENTIMIENTO_ANTIDOPING';

/** El nombre del trabajador y la institución responsable (el nombre del proveedor de salud). */
export type CampoFormatoFirma = 'nombreTrabajador' | 'institucionResponsable';

export type FragmentoFormatoFirma =
  | { texto: string; negrita?: boolean; sinCorte?: boolean }
  | { campo: CampoFormatoFirma; negrita?: boolean };

export interface BloqueFormatoFirma {
  tipo: 'parrafo' | 'encabezadoLista' | 'elementoLista';
  fragmentos: FragmentoFormatoFirma[];
}

export interface TextoFormatoFirma {
  tipoFormato: TipoFormatoFirma;
  version: string;
  titulo: string;
  /** false mientras no exista la redacción definitiva: no se descarga ni se firma. */
  disponible: boolean;
  bloques: BloqueFormatoFirma[];
}

/** Formato ya firmado en pantalla para una fecha (en borrador o finalizado, no anulado). */
export interface FormatoFirmadoEnFecha {
  tipoFormato: TipoFormatoFirma;
  firmadoEn: string;
}
