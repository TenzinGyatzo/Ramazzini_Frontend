import { defineStore } from "pinia";
import { ref, computed } from "vue";
import DocumentosAPI from "@/api/DocumentosAPI";
import type {
  Antidoping,
  Aptitud,
  Audiometria,
  Certificado,
  CertificadoExpedito,
  DocumentoExterno,
  ExamenVista,
  ExploracionFisica,
  HistoriaClinica,
  NotaMedica,
  NotaAclaratoria,
  ControlPrenatal,
  HistoriaOtologica,
  PrevioEspirometria,
  Receta,
  ConstanciaAptitud,
  EntrevistaPsicologica,
  TrastornosEstadoAnimo,
  CuestionarioProdromalBreve,
  TrastornoLimitePersonalidad,
  EventoSeguimientoCardiometabolico,
  InformeLongitudinalCardiometabolico,
} from "@/interfaces/documentos.inteface";

export type DocumentsByYear = {
  [year: string]: {
    antidopings?: Antidoping[];
    aptitudes?: Aptitud[];
    audiometrias?: Audiometria[];
    certificados?: Certificado[];
    certificadosExpedito?: CertificadoExpedito[];
    documentosExternos?: DocumentoExterno[];
    examenesVista?: ExamenVista[];
    exploracionesFisicas?: ExploracionFisica[];
    historiasClinicas?: HistoriaClinica[];
    notasMedicas?: NotaMedica[];
    notasAclaratorias?: NotaAclaratoria[];
    controlPrenatal?: ControlPrenatal[];
    historiaOtologica?: HistoriaOtologica[];
    previoEspirometria?: PrevioEspirometria[];
    recetas?: Receta[];
    constanciasAptitud?: ConstanciaAptitud[];
    entrevistasPsicologicas?: EntrevistaPsicologica[];
    trastornosEstadoAnimo?: TrastornosEstadoAnimo[];
    cuestionarioProdromalBreve?: CuestionarioProdromalBreve[];
    trastornoLimitePersonalidad?: TrastornoLimitePersonalidad[];
    eventoSeguimientoCardiometabolico?: EventoSeguimientoCardiometabolico[];
    informeLongitudinalCardiometabolico?: InformeLongitudinalCardiometabolico[];
  };
};

export const useDocumentosStore = defineStore("documentos", () => {
  const documentsByYear = ref<DocumentsByYear>({});
  const loading = ref(true);
  const currentTypeOfDocument = ref<string | null>(null);
  const currentDocumentId = ref<string | null>(null);
  const currentDocument = ref<any | null>(null);

  async function fetchDocumentById(documentType: string, trabajadorId: string, documentId: string) {
    try {
      currentDocument.value = null;

      const response = await DocumentosAPI.getDocumentById(documentType, trabajadorId, documentId);
      currentDocument.value = response.data;
    } catch (error) {
      console.error(`Error al obtener el documento ${documentId} de tipo ${documentType}:`, error);
    }
  }

  function mergeTipoEnDocumentsByYear(tipoDocumento: string, documentos: any[]) {
    if (!Array.isArray(documentos) || documentos.length === 0) return;

    documentos.forEach((documento) => {
      const fechaCampo = obtenerCampoFecha(tipoDocumento, documento);
      if (!fechaCampo) return;

      const year = new Date(fechaCampo).getFullYear();

      if (!documentsByYear.value[year]) {
        documentsByYear.value[year] = {};
      }
      if (!documentsByYear.value[year][tipoDocumento]) {
        documentsByYear.value[year][tipoDocumento] = [];
      }
      documentsByYear.value[year][tipoDocumento].push(documento);
    });

    Object.values(documentsByYear.value).forEach((grupoAnio) => {
      const docs = grupoAnio[tipoDocumento];
      if (Array.isArray(docs) && docs.length > 1) {
        grupoAnio[tipoDocumento] = ordenarPorFechaClinicaAsc(tipoDocumento, docs);
      }
    });
  }

  const DOCUMENT_FETCHERS: Array<{
    tipo: string;
    fetch: (trabajadorId: string) => Promise<{ data: unknown }>;
    label: string;
  }> = [
    { tipo: 'antidopings', fetch: DocumentosAPI.getAntidopings, label: 'antidopings' },
    { tipo: 'aptitudes', fetch: DocumentosAPI.getAptitudes, label: 'aptitudes' },
    { tipo: 'audiometrias', fetch: DocumentosAPI.getAudiometrias, label: 'audiometrias' },
    { tipo: 'certificados', fetch: DocumentosAPI.getCertificados, label: 'certificados' },
    { tipo: 'certificadosExpedito', fetch: DocumentosAPI.getCertificadosExpedito, label: 'certificadosExpedito' },
    { tipo: 'documentosExternos', fetch: DocumentosAPI.getDocumentosExternos, label: 'documentosExternos' },
    { tipo: 'examenesVista', fetch: DocumentosAPI.getExamenesVista, label: 'examenesVista' },
    { tipo: 'exploracionesFisicas', fetch: DocumentosAPI.getExploracionesFisicas, label: 'exploracionesFisicas' },
    { tipo: 'historiasClinicas', fetch: DocumentosAPI.getHistoriasClinicas, label: 'historiasClinicas' },
    { tipo: 'notasMedicas', fetch: DocumentosAPI.getNotasMedicas, label: 'notasMedicas' },
    { tipo: 'notasAclaratorias', fetch: DocumentosAPI.getNotasAclaratorias, label: 'notasAclaratorias' },
    { tipo: 'controlPrenatal', fetch: DocumentosAPI.getControlPrenatal, label: 'controlPrenatal' },
    { tipo: 'historiaOtologica', fetch: DocumentosAPI.getHistoriaOtologica, label: 'historiaOtologica' },
    { tipo: 'previoEspirometria', fetch: DocumentosAPI.getPrevioEspirometria, label: 'previoEspirometria' },
    { tipo: 'recetas', fetch: DocumentosAPI.getRecetas, label: 'recetas' },
    { tipo: 'constanciasAptitud', fetch: DocumentosAPI.getConstanciasAptitud, label: 'constanciasAptitud' },
    { tipo: 'entrevistasPsicologicas', fetch: DocumentosAPI.getEntrevistaPsicologica, label: 'entrevistasPsicologicas' },
    { tipo: 'trastornosEstadoAnimo', fetch: DocumentosAPI.getTrastornosEstadoAnimo, label: 'trastornosEstadoAnimo' },
    { tipo: 'cuestionarioProdromalBreve', fetch: DocumentosAPI.getCuestionarioProdromalBreve, label: 'cuestionarioProdromalBreve' },
    { tipo: 'trastornoLimitePersonalidad', fetch: DocumentosAPI.getTrastornoLimitePersonalidad, label: 'trastornoLimitePersonalidad' },
    { tipo: 'eventoSeguimientoCardiometabolico', fetch: DocumentosAPI.getEventoSeguimientoCardiometabolico, label: 'eventoSeguimientoCardiometabolico' },
    { tipo: 'informeLongitudinalCardiometabolico', fetch: DocumentosAPI.getInformeLongitudinalCardiometabolico, label: 'informeLongitudinalCardiometabolico' },
  ];

  async function fetchAllDocuments(trabajadorId: string) {
    try {
      loading.value = true;
      documentsByYear.value = {};

      await Promise.all(
        DOCUMENT_FETCHERS.map(async ({ tipo, fetch, label }) => {
          try {
            const response = await fetch(trabajadorId);
            const data = Array.isArray(response.data) ? response.data : [];
            mergeTipoEnDocumentsByYear(tipo, data);
          } catch (error) {
            console.error(`Error al obtener ${label}`, error);
          }
        }),
      );
    } catch (error) {
      console.error("Error general al obtener documentos", error);
    } finally {
      loading.value = false;
    }
  }

  // Función para obtener el campo de fecha correctamente
  function obtenerCampoFecha(tipoDocumento: string, documento: any): string {
    const fechaCampos = {
      antidopings: "fechaAntidoping",
      aptitudes: "fechaAptitudPuesto",
      audiometrias: "fechaAudiometria",
      certificados: "fechaCertificado",
      certificadosExpedito: "fechaCertificadoExpedito",
      documentosExternos: "fechaDocumento",
      examenesVista: "fechaExamenVista",
      exploracionesFisicas: "fechaExploracionFisica",
      historiasClinicas: "fechaHistoriaClinica",
      notasMedicas: "fechaNotaMedica",
      notasAclaratorias: "fechaNotaAclaratoria",
      controlPrenatal: "fechaInicioControlPrenatal",
      historiaOtologica: "fechaHistoriaOtologica",
      previoEspirometria: "fechaPrevioEspirometria",
      recetas: "fechaReceta",
      constanciasAptitud: "fechaConstanciaAptitud",
      entrevistasPsicologicas: "fechaEntrevistaPsicologica",
      trastornosEstadoAnimo: "fechaTrastornosEstadoAnimo",
      cuestionarioProdromalBreve: "fechaCuestionarioProdromalBreve",
      trastornoLimitePersonalidad: "fechaTrastornoLimitePersonalidad",
      eventoSeguimientoCardiometabolico: "fechaEventoSeguimientoCardiometabolico",
      informeLongitudinalCardiometabolico: "fechaInformeLongitudinalCardiometabolico",
    };

    return documento?.[fechaCampos[tipoDocumento]] || "";
  }

  function ordenarPorFechaClinicaAsc(tipoDocumento: string, documentos: any[]): any[] {
    return [...documentos].sort((a, b) => {
      const fechaA = obtenerCampoFecha(tipoDocumento, a);
      const fechaB = obtenerCampoFecha(tipoDocumento, b);
      return new Date(fechaA).getTime() - new Date(fechaB).getTime();
    });
  }

  function setCurrentTypeOfDocument(type: string) {
    currentTypeOfDocument.value = type;
  }

  function setCurrentDocument(documentType: string, documentId: string) {
    currentTypeOfDocument.value = documentType;
    currentDocumentId.value = documentId;
  }  

  function resetCurrentTypeOfDocument() {
    currentTypeOfDocument.value = "";
    currentDocumentId.value = "";
  }

  /** El controller devuelve `{ message, data: documento }`; devolvemos siempre el documento persistido. */
  function unwrapPersistedDocument(apiBody: unknown): any {
    if (!apiBody || typeof apiBody !== 'object') return apiBody;
    const o = apiBody as Record<string, unknown>;
    const inner = o.data;
    if (inner && typeof inner === 'object' && '_id' in inner) return inner;
    return o;
  }

  async function createDocument(documentType: string, trabajadorId: string, data: any) {
    try {
      loading.value = true;
      const response = await DocumentosAPI.createDocument(documentType, trabajadorId, data);
      return unwrapPersistedDocument(response.data);
    } catch (error) {
      console.error('Error al crear el documento en el store:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function updateDocument(documentType: string, trabajadorId: string, documentId: string, data: any) {
    try {
      loading.value = true;
      const response = await DocumentosAPI.updateDocument(documentType, trabajadorId, documentId, data);
      return unwrapPersistedDocument(response.data);
    } catch (error) {
      console.error('Error al actualizar el documento en el store:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function uploadExternalDocument(trabajadorId: string, formData: FormData) {
    try {
      loading.value = true;
      const response = await DocumentosAPI.uploadExternalDocument(trabajadorId, formData);
      return response.data; // Retorna solo los datos relevantes
    } catch (error) {
      console.error('Error al crear el documento en el store:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }
  
  async function deleteDocumentById(documentType: string, trabajadorId: string, documentId: string, razonAnulacion?: string) {
    try {
      loading.value = true;
      await DocumentosAPI.deleteDocumentById(documentType, trabajadorId, documentId, razonAnulacion);
    } catch (error) {
      console.log(error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function finalizarDocumento(documentType: string, trabajadorId: string, documentId: string) {
    try {
      loading.value = true;
      await DocumentosAPI.finalizarDocumento(documentType, trabajadorId, documentId);
    } catch (error) {
      console.error('Error al finalizar el documento en el store:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  const isFinalized = computed(() => {
    if (!currentDocument.value) return false;
    const estado = currentDocument.value.estado?.toLowerCase();
    return estado === 'finalizado' || estado === 'anulado';
  });

  return {
    loading,
    documentsByYear,
    currentTypeOfDocument,
    currentDocumentId,
    currentDocument,
    isFinalized,
    fetchDocumentById,
    fetchAllDocuments,
    setCurrentDocument,
    setCurrentTypeOfDocument,
    resetCurrentTypeOfDocument,
    createDocument,
    updateDocument,
    uploadExternalDocument,
    deleteDocumentById,
    finalizarDocumento
  };
});
