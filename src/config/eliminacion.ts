export type NivelEliminacion = 'simple' | 'moderado' | 'robusto';

export type EntidadEliminable =
  | 'empresa'
  | 'centroTrabajo'
  | 'trabajador'
  | 'usuario'
  | 'documentoExpediente'
  | 'documentosMasivos'
  | 'resultadoClinico'
  | 'riesgoTrabajo'
  | 'seguimientoProgramado';

export const NIVEL_POR_ENTIDAD: Record<EntidadEliminable, NivelEliminacion> = {
  empresa: 'robusto',
  centroTrabajo: 'robusto',
  trabajador: 'moderado',
  usuario: 'moderado',
  documentoExpediente: 'simple',
  documentosMasivos: 'simple',
  resultadoClinico: 'simple',
  riesgoTrabajo: 'simple',
  seguimientoProgramado: 'simple',
};

export const ETIQUETAS_ENTIDAD: Record<EntidadEliminable, string> = {
  empresa: 'Empresa',
  centroTrabajo: 'Centro de Trabajo',
  trabajador: 'Trabajador',
  usuario: 'Usuario',
  documentoExpediente: 'Documento',
  documentosMasivos: 'Documentos',
  resultadoClinico: 'Resultado clínico',
  riesgoTrabajo: 'Riesgo de Trabajo',
  seguimientoProgramado: 'Seguimiento programado',
};

export interface ContextoNivelEliminacion {
  /** Eliminación masiva de documentos */
  cantidad?: number;
  /** Centros de trabajo de la empresa */
  cantidadCentros?: number;
  /** Trabajadores del centro de trabajo */
  cantidadTrabajadores?: number;
}

export function resolverNivel(
  entidad: EntidadEliminable,
  contexto?: ContextoNivelEliminacion,
): NivelEliminacion {
  if (entidad === 'documentosMasivos') {
    return (contexto?.cantidad ?? 0) >= 2 ? 'moderado' : 'simple';
  }
  if (entidad === 'empresa') {
    return (contexto?.cantidadCentros ?? 0) > 0 ? 'robusto' : 'simple';
  }
  if (entidad === 'centroTrabajo') {
    return (contexto?.cantidadTrabajadores ?? 0) > 0 ? 'robusto' : 'simple';
  }
  return NIVEL_POR_ENTIDAD[entidad];
}

export function normalizarTextoConfirmacion(texto: string): string {
  return texto.trim();
}

export function textosConfirmacionCoinciden(
  ingresado: string,
  esperado: string,
): boolean {
  return (
    normalizarTextoConfirmacion(ingresado) ===
    normalizarTextoConfirmacion(esperado)
  );
}

export interface DetalleContextoEliminacion {
  fecha?: string;
  resultado?: string;
  tipoSangre?: string;
  tipoEstudioLabel?: string;
}
