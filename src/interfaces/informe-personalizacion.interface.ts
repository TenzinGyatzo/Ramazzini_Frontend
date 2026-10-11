export interface RecomendacionItem {
  hallazgo: string;
  medidaPreventiva: string;
}

/** Informes del tablero con conclusiones y recomendaciones propias. */
export type TipoDeInformePersonalizable =
  | 'completo'
  | 'resumen'
  | 'cardiometabolico'
  | 'auditivo'
  | 'musculoesqueletico';

export interface InformePersonalizacion {
  _id?: string;
  idEmpresa: string;
  idCentroTrabajo?: string;
  /** Ausente en registros anteriores a los tipos: informe completo. */
  tipoInforme?: TipoDeInformePersonalizable;
  conclusiones?: string;
  formatoRecomendaciones: 'texto' | 'tabla';
  recomendacionesTexto?: string;
  recomendacionesTabla?: RecomendacionItem[];
  createdBy: string;
  updatedBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInformePersonalizacionDto {
  idEmpresa: string;
  idCentroTrabajo?: string;
  conclusiones?: string;
  formatoRecomendaciones?: 'texto' | 'tabla';
  recomendacionesTexto?: string;
  recomendacionesTabla?: RecomendacionItem[];
  createdBy: string;
  updatedBy: string;
}

export interface UpdateInformePersonalizacionDto {
  conclusiones?: string;
  formatoRecomendaciones?: 'texto' | 'tabla';
  recomendacionesTexto?: string;
  recomendacionesTabla?: RecomendacionItem[];
  updatedBy: string;
}
