/**
 * Texto de los formatos que firma el trabajador, tal como lo entrega el backend
 * (backend/src/modules/formatos-firmados/constants/formatos-firma-texto.constants.ts).
 */

/** En el orden en que se muestran en el modal. */
export type TipoFormatoFirma =
  | 'CONSENTIMIENTO_EVALUACION_MEDICA'
  | 'DECLARACION_VERACIDAD'
  | 'CONSENTIMIENTO_ANTIDOPING';

export type CampoFormatoFirma = 'nombreTrabajador';

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

/** Resumen de la lista de formatos (`GET /formatos-firmados/textos`). */
export type ResumenFormatoFirma = Pick<TextoFormatoFirma, 'tipoFormato' | 'version' | 'titulo' | 'disponible'>;

/** Formato ya firmado en pantalla para una fecha. */
export interface FormatoFirmadoEnFecha {
  tipoFormato: TipoFormatoFirma;
  firmadoEn: string;
  prueba: boolean;
}
