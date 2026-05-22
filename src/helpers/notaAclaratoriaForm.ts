import { format } from 'date-fns';

/** Campos de fecha por tipo plural de documento clínico (mismo mapa que Step2). */
export const fechaCamposDocumentoOrigen: Record<string, string> = {
  antidopings: 'fechaAntidoping',
  aptitudes: 'fechaAptitudPuesto',
  audiometrias: 'fechaAudiometria',
  certificados: 'fechaCertificado',
  certificadosExpedito: 'fechaCertificadoExpedito',
  documentosExternos: 'fechaDocumento',
  examenesVista: 'fechaExamenVista',
  exploracionesFisicas: 'fechaExploracionFisica',
  historiasClinicas: 'fechaHistoriaClinica',
  notasMedicas: 'fechaNotaMedica',
  controlPrenatal: 'fechaInicioControlPrenatal',
  historiaOtologica: 'fechaHistoriaOtologica',
  previoEspirometria: 'fechaPrevioEspirometria',
  recetas: 'fechaReceta',
  constanciasAptitud: 'fechaConstanciaAptitud',
  eventoSeguimientoCardiometabolico: 'fechaEventoSeguimientoCardiometabolico',
  informeLongitudinalCardiometabolico: 'fechaInformeLongitudinalCardiometabolico',
};

type FormNotaAclaratoria = Record<string, unknown>;

export interface InicializarNotaAclaratoriaContext {
  form: FormNotaAclaratoria;
  trabajadorId: string;
  rutaPDF: string;
  userId?: string | null;
  documentoOrigenTipo?: string;
  documentoOrigenId?: string;
  documentoOrigen?: Record<string, unknown> | null;
}

/** Copia fecha y nombre del documento origen al formulario de nota aclaratoria. */
export function aplicarMetadatosDocumentoOrigen(
  form: FormNotaAclaratoria,
  tipoPlural: string,
  doc: Record<string, unknown> | null | undefined,
): void {
  if (!tipoPlural || !doc) return;

  if (tipoPlural === 'documentosExternos' && doc.nombreDocumento) {
    form.documentoOrigenNombre = doc.nombreDocumento;
  }

  const campoFecha = fechaCamposDocumentoOrigen[tipoPlural];
  if (campoFecha && doc[campoFecha]) {
    form.documentoOrigenFecha = doc[campoFecha];
  } else if (doc.createdAt) {
    form.documentoOrigenFecha = doc.createdAt;
  }
}

/**
 * Inicializa campos de Step1/Step2 cuando se omite el stepper (p. ej. skipToStep=3).
 * Solo rellena valores faltantes; no sobrescribe datos ya capturados.
 */
export function inicializarNotaAclaratoriaNueva(ctx: InicializarNotaAclaratoriaContext): void {
  const { form, trabajadorId, rutaPDF, userId, documentoOrigenTipo, documentoOrigenId, documentoOrigen } =
    ctx;

  const today = format(new Date(), 'yyyy-MM-dd');

  if (!form.fechaNotaAclaratoria) {
    form.fechaNotaAclaratoria = today;
  }
  if (trabajadorId && !form.idTrabajador) {
    form.idTrabajador = trabajadorId;
  }
  if (rutaPDF && !form.rutaPDF) {
    form.rutaPDF = rutaPDF;
  }
  if (documentoOrigenTipo && !form.documentoOrigenTipo) {
    form.documentoOrigenTipo = documentoOrigenTipo;
  }
  if (documentoOrigenId && !form.documentoOrigenId) {
    form.documentoOrigenId = documentoOrigenId;
  }

  if (documentoOrigenTipo && documentoOrigen) {
    aplicarMetadatosDocumentoOrigen(form, documentoOrigenTipo, documentoOrigen);
  }

  if (userId) {
    if (!form.createdBy) {
      form.createdBy = userId;
    }
    form.updatedBy = userId;
  }
}

/** Construye rutaPDF con la misma convención que Step1. */
export function construirRutaPdfNotaAclaratoria(
  empresa: string,
  centroTrabajo: string,
  trabajadorNombre: string,
  trabajadorId: string,
): string {
  return `expedientes-medicos/${empresa}/${centroTrabajo}/${trabajadorNombre}_${trabajadorId}`;
}
