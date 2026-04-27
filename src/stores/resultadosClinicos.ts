import { defineStore } from "pinia";
import { ref } from "vue";
import ResultadosClinicosAPI from "@/api/ResultadosClinicosAPI";
import { useDocumentosStore } from "./documentos";

export interface ResultadoClinico {
  _id?: string;
  idTrabajador: string;
  tipoEstudio:
    | 'ESPIROMETRIA'
    | 'EKG'
    | 'TIPO_SANGRE'
    | 'RAYOS_X'
    | 'ANALISIS_LABORATORIO';
  fechaEstudio: string | Date;
  anioEstudio?: number;
  resultadoGlobal?: 'NORMAL' | 'ANORMAL' | 'NO_CONCLUYENTE';
  hallazgoEspecifico?: string;
  relevanciaClinica?: 'LEVE' | 'MODERADA' | 'ALTA';
  recomendacion?: string;
  tipoAlteracionEspirometria?: 'ANORMAL_OBSTRUCTIVO' | 'ANORMAL_RESTRICTIVO_SOSPECHADO' | 'ANORMAL_MIXTO';
  tipoAlteracionEKG?: 'ANORMAL_ARRITMIA' | 'ANORMAL_TRASTORNO_CONDUCCION' | 'ANORMAL_ISQUEMIA_INFARTO' | 'ANORMAL_REPOLARIZACION' | 'ANORMAL_HIPERTROFIA_CRECIMIENTO_CAVIDADES' | 'ANORMAL_QT_ALTERADO';
  tipoSangre?: 'A_POS' | 'A_NEG' | 'B_POS' | 'B_NEG' | 'AB_POS' | 'AB_NEG' | 'O_POS' | 'O_NEG';
  tipoAlteracionRayosX?: string[];
  tipoAlteracionAnalisisLaboratorio?: string[];
  idDocumentoExterno?: string;
  documentoExterno?: {
    _id: string;
    nombreDocumento: string;
    fechaDocumento: string;
    extension: string;
    rutaDocumento?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export type ResultsByYear = {
  [year: string]: ResultadoClinico[];
};

export const useResultadosClinicosStore = defineStore("resultadosClinicos", () => {
  const loading = ref(false);
  const loadingGrouped = ref(false);
  const items = ref<ResultadoClinico[]>([]);
  const resultsByYear = ref<ResultsByYear>({});
  const current = ref<ResultadoClinico | null>(null);
  const drawerOpen = ref(false);

  // Enums para usar en formularios
  const tipoEstudioOptions = [
    { value: 'ESPIROMETRIA', label: 'Espirometría' },
    { value: 'EKG', label: 'EKG' },
    { value: 'RAYOS_X', label: 'Rayos X' },
    { value: 'TIPO_SANGRE', label: 'Tipo de Sangre' },
    { value: 'ANALISIS_LABORATORIO', label: 'Análisis de laboratorio' },
  ];

  const resultadoGlobalOptions = [
    { value: 'NORMAL', label: 'Normal' },
    { value: 'ANORMAL', label: 'Anormal' },
    { value: 'NO_CONCLUYENTE', label: 'No Concluyente' },
  ];

  const relevanciaClinicaOptions = [
    { value: 'LEVE', label: 'Leve' },
    { value: 'MODERADA', label: 'Moderada' },
    { value: 'ALTA', label: 'Alta' },
  ];

  const tipoAlteracionEspirometriaOptions = [
    { value: 'ANORMAL_OBSTRUCTIVO', label: 'Anormal Obstructivo' },
    { value: 'ANORMAL_RESTRICTIVO_SOSPECHADO', label: 'Anormal Restrictivo Sospechado' },
    { value: 'ANORMAL_MIXTO', label: 'Anormal Mixto' },
  ];

  const tipoAlteracionEKGOptions = [
    { value: 'ANORMAL_ARRITMIA', label: 'Anormal Arritmia' },
    { value: 'ANORMAL_TRASTORNO_CONDUCCION', label: 'Anormal Trastorno de Conducción' },
    { value: 'ANORMAL_ISQUEMIA_INFARTO', label: 'Anormal Isquemia/Infarto' },
    { value: 'ANORMAL_REPOLARIZACION', label: 'Anormal Repolarización' },
    { value: 'ANORMAL_HIPERTROFIA_CRECIMIENTO_CAVIDADES', label: 'Anormal Hipertrofia/Crecimiento de Cavidades' },
    { value: 'ANORMAL_QT_ALTERADO', label: 'Anormal QT Alterado' },
  ];

  const tipoAlteracionRayosXOptions = [
    { value: 'ALTERACION_PARENQUIMATOSA', label: 'Alteración parenquimatosa' },
    { value: 'ALTERACION_PLEURAL', label: 'Alteración pleural' },
    { value: 'ALTERACION_CARDIOMEDIASTINICA', label: 'Alteración cardiomediastínica' },
    { value: 'NODULO_O_MASA', label: 'Nódulo o masa' },
    { value: 'SECUELA_CRONICA', label: 'Secuela crónica' },
    { value: 'ALTERACION_OSEA', label: 'Alteración ósea' },
    { value: 'ALTERACION_ARTICULAR', label: 'Alteración articular' },
    { value: 'ALTERACION_ALINEACION', label: 'Alteración de alineación' },
    { value: 'CAMBIO_DEGENERATIVO', label: 'Cambio degenerativo' },
    { value: 'FRACTURA_O_TRAUMA', label: 'Fractura o trauma' },
    { value: 'OTRA_ALTERACION', label: 'Otra alteración' },
  ];

  const tipoAlteracionAnalisisLaboratorioOptions = [
    { value: 'ALTERACION_HEMATOLOGICA', label: 'Alteración hematológica' },
    { value: 'ALTERACION_METABOLICA', label: 'Alteración metabólica' },
    { value: 'ALTERACION_RENAL', label: 'Alteración renal' },
    { value: 'ALTERACION_HEPATICA', label: 'Alteración hepática' },
    {
      value: 'ALTERACION_INFECCIOSA_O_INFLAMATORIA',
      label: 'Alteración infecciosa o inflamatoria',
    },
    { value: 'ALTERACION_URINARIA', label: 'Alteración urinaria' },
    { value: 'OTRA_ALTERACION', label: 'Otra alteración' },
  ];

  const tipoSangreOptions = [
    { value: 'A_POS', label: 'A+' },
    { value: 'A_NEG', label: 'A-' },
    { value: 'B_POS', label: 'B+' },
    { value: 'B_NEG', label: 'B-' },
    { value: 'AB_POS', label: 'AB+' },
    { value: 'AB_NEG', label: 'AB-' },
    { value: 'O_POS', label: 'O+' },
    { value: 'O_NEG', label: 'O-' },
  ];

  async function fetchByTrabajador(trabajadorId: string, params?: { tipo?: string }) {
    try {
      loading.value = true;
      const response = await ResultadosClinicosAPI.getByTrabajador(trabajadorId, params);
      items.value = response.data || [];
    } catch (error) {
      console.error('Error al obtener resultados clínicos:', error);
      items.value = [];
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function createResultado(payload: ResultadoClinico) {
    try {
      loading.value = true;
      const response = await ResultadosClinicosAPI.createResultado(payload);
      // Agregar el nuevo resultado a la lista
      if (response.data) {
        items.value.unshift(response.data);
      }
      return response.data;
    } catch (error) {
      console.error('Error al crear resultado clínico:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function updateResultado(id: string, payload: Partial<ResultadoClinico>) {
    try {
      loading.value = true;
      const response = await ResultadosClinicosAPI.updateResultado(id, payload);
      // Actualizar el resultado en la lista
      const index = items.value.findIndex(item => item._id === id);
      if (index !== -1 && response.data) {
        items.value[index] = response.data;
      }
      return response.data;
    } catch (error) {
      console.error('Error al actualizar resultado clínico:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function deleteResultado(id: string) {
    try {
      loading.value = true;
      await ResultadosClinicosAPI.deleteResultado(id);
      // Remover el resultado de la lista
      items.value = items.value.filter(item => item._id !== id);
    } catch (error) {
      console.error('Error al eliminar resultado clínico:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  function setCurrent(resultado: ResultadoClinico | null) {
    current.value = resultado;
  }

  function setDrawerOpen(open: boolean) {
    drawerOpen.value = open;
    if (!open) {
      current.value = null;
    }
  }

  async function fetchResultadosAgrupados(trabajadorId: string) {
    try {
      loadingGrouped.value = true;
      const response = await ResultadosClinicosAPI.getByTrabajadorGrouped(trabajadorId);
      // El backend devuelve Record<number, ResultadoClinico[]>
      // Convertir las claves numéricas a strings para consistencia con el frontend
      const grouped: ResultsByYear = {};
      if (response.data) {
        Object.keys(response.data).forEach(year => {
          // Asegurar que la clave sea string
          grouped[String(year)] = response.data[year] || [];
        });
      }
      resultsByYear.value = grouped;
    } catch (error) {
      console.error('Error al obtener resultados clínicos agrupados:', error);
      resultsByYear.value = {};
      throw error;
    } finally {
      loadingGrouped.value = false;
    }
  }

  // Funciones utilitarias para UI
  function getTipoLabel(tipo?: string): string {
    const option = tipoEstudioOptions.find(opt => opt.value === tipo);
    return option?.label || tipo || '';
  }

  function getResultadoLabel(resultado?: string): string {
    const option = resultadoGlobalOptions.find(opt => opt.value === resultado);
    return option?.label || resultado || '';
  }

  function getResultadoColor(resultado?: string): string {
    if (resultado === 'NORMAL') return 'text-green-600 font-semibold';
    if (resultado === 'ANORMAL') return 'text-red-600 font-semibold';
    if (resultado === 'NO_CONCLUYENTE') return 'text-yellow-600 font-semibold';
    return 'text-gray-600';
  }

  async function vincularDocumento(resultadoId: string, documentoId: string) {
    try {
      loading.value = true;
      const response = await ResultadosClinicosAPI.vincularDocumento(resultadoId, documentoId);
      
      // Actualizar en items si existe
      const index = items.value.findIndex(item => item._id === resultadoId);
      if (index !== -1 && response.data) {
        items.value[index] = response.data;
      }
      
      // Actualizar current si es el actual
      if (current.value?._id === resultadoId && response.data) {
        current.value = response.data;
      }

      // IMPORTANTE: Actualizar el store de documentos para que el cambio de notasDocumento sea inmediato
      const documentosStore = useDocumentosStore();
      if (response.data.idDocumentoExterno) {
        const docActualizado = response.data.idDocumentoExterno;
        const year = new Date(docActualizado.fechaDocumento).getFullYear();
        
        const yearDocs = documentosStore.documentsByYear[year];
        if (yearDocs?.documentosExternos) {
          const docIndex = yearDocs.documentosExternos.findIndex(
            d => d._id === docActualizado._id
          );
          if (docIndex !== -1) {
            // Actualizar solo los campos necesarios o el objeto completo
            yearDocs.documentosExternos[docIndex] = {
              ...yearDocs.documentosExternos[docIndex],
              ...docActualizado,
              idResultadoClinico: resultadoId // Asegurar que tenga la vinculación
            };
          }
        }

        // También actualizar currentDocument si es el mismo
        if (documentosStore.currentDocument?._id === docActualizado._id) {
          documentosStore.currentDocument = {
            ...documentosStore.currentDocument,
            ...docActualizado,
            idResultadoClinico: resultadoId
          };
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Error al vincular documento:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function fetchResultadoById(resultadoId: string) {
    try {
      const response = await ResultadosClinicosAPI.getResultadoById(resultadoId);
      return response.data;
    } catch (error) {
      console.error('Error al obtener resultado clínico por ID:', error);
      throw error;
    }
  }

  async function desvincularDocumento(resultadoId: string) {
    try {
      loading.value = true;
      const response = await ResultadosClinicosAPI.desvincularDocumento(resultadoId);
      
      // Actualizar en items si existe
      const index = items.value.findIndex(item => item._id === resultadoId);
      if (index !== -1 && response.data) {
        items.value[index] = response.data;
      }
      
      // Actualizar current si es el actual
      if (current.value?._id === resultadoId && response.data) {
        current.value = response.data;
      }

      // Actualizar el store de documentos para reflejar la desvinculación
      const documentosStore = useDocumentosStore();
      // Buscar el documento en el store de documentos para limpiar su idResultadoClinico
      Object.values(documentosStore.documentsByYear).forEach(yearData => {
        if (yearData.documentosExternos) {
          const docIndex = yearData.documentosExternos.findIndex(d => d.idResultadoClinico === resultadoId);
          if (docIndex !== -1) {
            yearData.documentosExternos[docIndex] = {
              ...yearData.documentosExternos[docIndex],
              idResultadoClinico: undefined
              // No limpiamos notasDocumento aquí porque el backend no lo hace en desvinculación (según el código actual)
              // Si se desea limpiar las notas al desvincular, habría que hacerlo en el backend también.
            };
          }
        }
      });

      if (documentosStore.currentDocument?.idResultadoClinico === resultadoId) {
        documentosStore.currentDocument = {
          ...documentosStore.currentDocument,
          idResultadoClinico: undefined
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('Error al desvincular documento:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    items.value = [];
    resultsByYear.value = {};
    current.value = null;
    drawerOpen.value = false;
  }

  return {
    loading,
    loadingGrouped,
    items,
    resultsByYear,
    current,
    drawerOpen,
    tipoEstudioOptions,
    resultadoGlobalOptions,
    relevanciaClinicaOptions,
    tipoAlteracionEspirometriaOptions,
    tipoAlteracionEKGOptions,
    tipoAlteracionRayosXOptions,
    tipoAlteracionAnalisisLaboratorioOptions,
    tipoSangreOptions,
    fetchByTrabajador,
    fetchResultadosAgrupados,
    createResultado,
    updateResultado,
    deleteResultado,
    vincularDocumento,
    desvincularDocumento,
    fetchResultadoById,
    setCurrent,
    setDrawerOpen,
    getTipoLabel,
    getResultadoLabel,
    getResultadoColor,
    reset,
  };
});
