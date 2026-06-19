/** Metadatos de visualización para el resumen de fusión (alineado con ModalConfirmacionEliminacion). */
export interface FusionDocumentoDisplay {
  modelName: string;
  labelSingular: string;
  labelPlural: string;
  icon: string;
  iconClass: string;
  section: 'expediente' | 'vinculado';
}

export const FUSION_DOCUMENTO_DISPLAY: FusionDocumentoDisplay[] = [
  { modelName: 'NotaAclaratoria', labelSingular: 'Nota Aclaratoria', labelPlural: 'Notas Aclaratorias', icon: 'fas fa-exclamation-triangle', iconClass: 'text-orange-600', section: 'expediente' },
  { modelName: 'ConstanciaAptitud', labelSingular: 'Constancia de Aptitud', labelPlural: 'Constancias de Aptitud', icon: 'fas fa-user-check', iconClass: 'text-green-600', section: 'expediente' },
  { modelName: 'AptitudPuesto', labelSingular: 'Aptitud', labelPlural: 'Aptitudes', icon: 'fas fa-user-check', iconClass: 'text-green-600', section: 'expediente' },
  { modelName: 'HistoriaClinica', labelSingular: 'Historia Clínica', labelPlural: 'Historias Clínicas', icon: 'fas fa-notes-medical', iconClass: 'text-teal-600', section: 'expediente' },
  { modelName: 'ExploracionFisica', labelSingular: 'Exploración Física', labelPlural: 'Exploraciones Físicas', icon: 'fas fa-person', iconClass: 'text-indigo-600', section: 'expediente' },
  { modelName: 'ExamenVista', labelSingular: 'Examen Vista', labelPlural: 'Exámenes Vista', icon: 'fas fa-eye', iconClass: 'text-yellow-600', section: 'expediente' },
  { modelName: 'HistoriaOtologica', labelSingular: 'Historia Otológica', labelPlural: 'Historias Otológicas', icon: 'fas fa-ear-deaf', iconClass: 'text-purple-600', section: 'expediente' },
  { modelName: 'Audiometria', labelSingular: 'Audiometría', labelPlural: 'Audiometrías', icon: 'fas fa-volume-up', iconClass: 'text-purple-600', section: 'expediente' },
  { modelName: 'Antidoping', labelSingular: 'Antidoping', labelPlural: 'Antidopings', icon: 'fas fa-flask', iconClass: 'text-red-600', section: 'expediente' },
  { modelName: 'Certificado', labelSingular: 'Certificado', labelPlural: 'Certificados', icon: 'fas fa-certificate', iconClass: 'text-blue-600', section: 'expediente' },
  { modelName: 'CertificadoExpedito', labelSingular: 'Certificado Expedito', labelPlural: 'Certificados Expedito', icon: 'fas fa-certificate', iconClass: 'text-indigo-600', section: 'expediente' },
  { modelName: 'Receta', labelSingular: 'Receta Médica', labelPlural: 'Recetas Médicas', icon: 'fas fa-prescription-bottle-medical', iconClass: 'text-rose-600', section: 'expediente' },
  { modelName: 'NotaMedica', labelSingular: 'Nota Médica', labelPlural: 'Notas Médicas', icon: 'fas fa-stethoscope', iconClass: 'text-pink-600', section: 'expediente' },
  { modelName: 'PrevioEspirometria', labelSingular: 'Previo Espirometría', labelPlural: 'Previos Espirometría', icon: 'fas fa-lungs', iconClass: 'text-sky-600', section: 'expediente' },
  { modelName: 'ControlPrenatal', labelSingular: 'Control Prenatal', labelPlural: 'Controles Prenatales', icon: 'fas fa-baby', iconClass: 'text-pink-600', section: 'expediente' },
  { modelName: 'EntrevistaPsicologica', labelSingular: 'Entrevista Psicológica', labelPlural: 'Entrevistas Psicológicas', icon: 'fa-regular fa-comments', iconClass: 'text-slate-600', section: 'expediente' },
  { modelName: 'TrastornosEstadoAnimo', labelSingular: 'Trastorno Estado Ánimo', labelPlural: 'Trastornos Estado Ánimo', icon: 'fas fa-wave-square', iconClass: 'text-purple-600', section: 'expediente' },
  { modelName: 'CuestionarioProdromalBreve', labelSingular: 'Cuestionario Prodromal Breve', labelPlural: 'Cuestionarios Prodromal Breve', icon: 'fas fa-brain', iconClass: 'text-purple-600', section: 'expediente' },
  { modelName: 'TrastornoLimitePersonalidad', labelSingular: 'Trastorno Límite Personalidad', labelPlural: 'Trastornos Límite Personalidad', icon: 'fas fa-heart-crack', iconClass: 'text-purple-600', section: 'expediente' },
  { modelName: 'EventoSeguimientoCardiometabolico', labelSingular: 'Evento Seguimiento Cardiometabólico', labelPlural: 'Eventos Seguimiento Cardiometabólico', icon: 'fas fa-heartbeat', iconClass: 'text-purple-600', section: 'expediente' },
  { modelName: 'InformeLongitudinalCardiometabolico', labelSingular: 'Informe Longitudinal Cardiometabólico', labelPlural: 'Informes Longitudinales Cardiometabólico', icon: 'fas fa-file-alt', iconClass: 'text-purple-600', section: 'expediente' },
  { modelName: 'DocumentoExterno', labelSingular: 'Documento Externo', labelPlural: 'Documentos Externos', icon: 'fas fa-file-alt', iconClass: 'text-purple-600', section: 'expediente' },
  { modelName: 'ConsentimientoDiario', labelSingular: 'Consentimiento diario', labelPlural: 'Consentimientos diarios', icon: 'fas fa-file-signature', iconClass: 'text-gray-600', section: 'vinculado' },
  { modelName: 'Deteccion', labelSingular: 'Detección', labelPlural: 'Detecciones', icon: 'fas fa-search', iconClass: 'text-cyan-600', section: 'vinculado' },
  { modelName: 'SeguimientoProgramadoCardiometabolico', labelSingular: 'Seguimiento programado cardiometabólico', labelPlural: 'Seguimientos programados cardiometabólicos', icon: 'fas fa-calendar-check', iconClass: 'text-purple-600', section: 'vinculado' },
];

/** Tipos con sección dedicada en el resumen (no van al bloque genérico de vinculados). */
export const FUSION_VINCULADOS_DEDICADOS = new Set(['ResultadoClinico', 'RiesgoTrabajo']);

export const TIPO_ESTUDIO_LABELS: Record<string, string> = {
  ESPIROMETRIA: 'Espirometría',
  EKG: 'EKG',
  TIPO_SANGRE: 'Tipo de sangre',
  RAYOS_X: 'Rayos X',
  ANALISIS_LABORATORIO: 'Análisis de laboratorio',
};

export const RESULTADO_GLOBAL_LABELS: Record<string, string> = {
  NORMAL: 'Normal',
  ANORMAL: 'Anormal',
  NO_CONCLUYENTE: 'No concluyente',
};

export function formatCountLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

export function lineasDocumentosExpediente(conteos: Record<string, number> | undefined) {
  if (!conteos) return [];
  return FUSION_DOCUMENTO_DISPLAY
    .filter((d) => d.section === 'expediente')
    .map((d) => ({ ...d, count: conteos[d.modelName] ?? 0 }))
    .filter((d) => d.count > 0);
}

export function lineasOtrosVinculados(conteos: Record<string, number> | undefined) {
  if (!conteos) return [];
  return FUSION_DOCUMENTO_DISPLAY
    .filter((d) => d.section === 'vinculado')
    .map((d) => ({ ...d, count: conteos[d.modelName] ?? 0 }))
    .filter((d) => d.count > 0);
}
