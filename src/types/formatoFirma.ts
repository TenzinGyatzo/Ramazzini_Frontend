/**
 * Texto de los formatos que firma el trabajador, tal como lo entrega el backend
 * (backend/src/modules/formatos-firmados/constants/formatos-firma-texto.constants.ts).
 */

export type TipoFormatoFirma = 'DECLARACION_VERACIDAD' | 'CONSENTIMIENTO_ANTIDOPING';

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
  bloques: BloqueFormatoFirma[];
}
