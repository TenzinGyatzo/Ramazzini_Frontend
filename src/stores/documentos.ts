import { defineStore } from "pinia";
import { ref, computed } from "vue";
import DocumentosAPI from "@/api/DocumentosAPI";
import { getToast } from "@/utils/toast";
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
  InformeLongitudinalAudiometrico,
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
    informeLongitudinalAudiometrico?: InformeLongitudinalAudiometrico[];
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

  const DOCUMENT_STORE_KEYS = [
    'antidopings',
    'aptitudes',
    'audiometrias',
    'certificados',
    'certificadosExpedito',
    'documentosExternos',
    'examenesVista',
    'exploracionesFisicas',
    'historiasClinicas',
    'notasMedicas',
    'notasAclaratorias',
    'controlPrenatal',
    'historiaOtologica',
    'previoEspirometria',
    'recetas',
    'constanciasAptitud',
    'entrevistasPsicologicas',
    'trastornosEstadoAnimo',
    'cuestionarioProdromalBreve',
    'trastornoLimitePersonalidad',
    'eventoSeguimientoCardiometabolico',
    'informeLongitudinalCardiometabolico',
    'informeLongitudinalAudiometrico',
  ] as const;

  function isTooManyRequestsError(error: unknown): boolean {
    const status = (error as { response?: { status?: number } })?.response?.status;
    return status === 429;
  }

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchAllDocuments(trabajadorId: string) {
    try {
      loading.value = true;
      documentsByYear.value = {};

      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await DocumentosAPI.getAllDocuments(trabajadorId);
          const payload = response.data as Record<string, unknown>;

          DOCUMENT_STORE_KEYS.forEach((tipo) => {
            const raw = payload[tipo];
            const data = Array.isArray(raw) ? raw : [];
            mergeTipoEnDocumentsByYear(tipo, data);
          });
          return;
        } catch (error) {
          lastError = error;
          if (isTooManyRequestsError(error) && attempt === 0) {
            await sleep(2000);
            continue;
          }
          throw error;
        }
      }

      throw lastError;
    } catch (error) {
      if (isTooManyRequestsError(error)) {
        getToast().open({
          message:
            'Demasiadas peticiones. Espera un momento y vuelve a abrir el expediente.',
          type: 'error',
        });
      }
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
      informeLongitudinalAudiometrico: "fechaInformeLongitudinalAudiometrico",
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
