<script setup lang="ts">
import { ref, onMounted, watch, inject, computed, nextTick } from 'vue';
import { useRoute, useRouter, type RouteParamsRaw } from 'vue-router';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useDocumentosStore } from '@/stores/documentos';
import { useFormDataStore } from '@/stores/formDataStore';
import GreenButton from '@/components/GreenButton.vue';
import SliderButton from '@/components/SliderButton.vue';
import ModalCargaDocumentoExterno from '@/components/ModalCargaDocumentoExterno.vue';
import ModalUpdateDocumentoExterno from '@/components/ModalUpdateDocumentoExterno.vue';
import GrupoDocumentos from '@/components/GrupoDocumentos.vue';
import SlidingButtonPanel from '@/components/SlidingButtonPanel.vue';
import DeletionButtonPanel from '@/components/DeletionButtonPanel.vue';
import { calcularEdad, calcularAntiguedad } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import { obtenerRutaDocumento, obtenerNombreArchivo, obtenerFechaDocumento } from '@/helpers/rutas';
import ModalSuscripcion from '@/components/suscripciones/ModalSuscripcion.vue';
import ModalCuestionarios from '@/components/ModalCuestionarios.vue';
import ModalSeguimientoProgramadoCardiometabolico from '@/components/ModalSeguimientoProgramadoCardiometabolico.vue';
import { useUserStore } from '@/stores/user';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useUserPermissions } from '@/composables/useUserPermissions';
import { usePermissionRestrictions } from '@/composables/usePermissionRestrictions';
import { useResultadosClinicosStore } from '@/stores/resultadosClinicos';
import ResultadosClinicosPanel from '@/components/ResultadosClinicosPanel.vue';
import ResultadosClinicosSubsection from '@/components/ResultadosClinicosSubsection.vue';
import type { EliminacionRequest } from '@/composables/useEliminacion';

const toast: any = inject('toast');
const requestEliminacion = inject<(request: EliminacionRequest) => void>('requestEliminacion');

const route = useRoute();
const router = useRouter();
const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const documentos = useDocumentosStore();
const formData = useFormDataStore();
const userStore = useUserStore();
const proveedorSaludStore = useProveedorSaludStore();
const resultadosClinicos = useResultadosClinicosStore();
const { canCreateDocument, getRestrictionMessage } = useUserPermissions();
const { executeIfCanManageDocumentosExternos } = usePermissionRestrictions();

const showDocumentoExternoModal = ref(false);
const showDocumentoExternoUpdateModal = ref(false);
const showSubscriptionModal = ref(false);
const showCuestionariosModal = ref(false);
const showSeguimientoProgramadoModal = ref(false);
const showResultadosClinicosPanel = ref(false);
const selectedRoutes = ref<string[]>([]);
const isDeletionMode = ref(false);
const periodoDePruebaFinalizado = ref<boolean | null>(null);
const estadoSuscripcion = ref<string | null>(null);
const finDeSuscripcion = ref<Date | null>(null);
const historiasDelMes = ref<number | null>(null);

onMounted(async () => {
  const idProveedorSalud = userStore.user?.idProveedorSalud;
  if (idProveedorSalud) {
    await proveedorSaludStore.loadProveedorSalud(idProveedorSalud);

    periodoDePruebaFinalizado.value = proveedorSaludStore.proveedorSalud?.periodoDePruebaFinalizado ?? null;
    estadoSuscripcion.value = proveedorSaludStore.proveedorSalud?.estadoSuscripcion ?? null;
    finDeSuscripcion.value = proveedorSaludStore.proveedorSalud?.finDeSuscripcion ? new Date(proveedorSaludStore.proveedorSalud.finDeSuscripcion) : null;
    historiasDelMes.value = await proveedorSaludStore.getHistoriasClinicasDelMes();
  } else {
    console.error("No se encontró idProveedorSalud en el usuario.");
  }
});

const toggleDocumentoExternoModal = () => {
  executeIfCanManageDocumentosExternos(() => {
    if (!proveedorSaludStore.proveedorSalud) return;

    if (periodoDePruebaFinalizado.value) {
      if (!estadoSuscripcion.value || estadoSuscripcion.value === 'inactive') {
        showSubscriptionModal.value = true;
        return;
      }

      if (estadoSuscripcion.value === 'cancelled' && finDeSuscripcion.value && new Date() > finDeSuscripcion.value) {
        showSubscriptionModal.value = true;
        return;
      }
    }

    showDocumentoExternoModal.value = !showDocumentoExternoModal.value;
  }, 'gestionar documentos externos');
};

const toggleDocumentoExternoUpdateModal = () => {
  executeIfCanManageDocumentosExternos(() => {
    if (!proveedorSaludStore.proveedorSalud) return;

    if (periodoDePruebaFinalizado.value) {
      if (!estadoSuscripcion.value || estadoSuscripcion.value === 'inactive') {
        showSubscriptionModal.value = true;
        return;
      }

      if (estadoSuscripcion.value === 'cancelled' && finDeSuscripcion.value && new Date() > finDeSuscripcion.value) {
        showSubscriptionModal.value = true;
        return;
      }
    }

    showDocumentoExternoUpdateModal.value = !showDocumentoExternoUpdateModal.value;
  }, 'gestionar documentos externos');
};

const toggleCuestionariosModal = () => {
  if (!proveedorSaludStore.proveedorSalud) return;

  if (periodoDePruebaFinalizado.value) {
    if (!estadoSuscripcion.value || estadoSuscripcion.value === 'inactive') {
      showSubscriptionModal.value = true;
      return;
    }

    if (estadoSuscripcion.value === 'cancelled' && finDeSuscripcion.value && new Date() > finDeSuscripcion.value) {
      showSubscriptionModal.value = true;
      return;
    }
  }

  showCuestionariosModal.value = !showCuestionariosModal.value;
};

const openSeguimientoProgramadoModal = () => {
  showSeguimientoProgramadoModal.value = true;
};

const solicitarEliminacionDocumento = (
  documentId: string,
  documentName: string,
  documentType: string,
) => {
  requestEliminacion?.({
    entidad: 'documentoExpediente',
    identificacion: documentName,
    onConfirm: async () => {
      try {
        await documentos.deleteDocumentById(
          documentType,
          trabajadores.currentTrabajadorId!,
          documentId,
        );
        toast.open({ message: 'Documento eliminado exitosamente.' });
        await Promise.all([
          documentos.fetchAllDocuments(trabajadores.currentTrabajadorId!),
          resultadosClinicos.fetchResultadosAgrupados(trabajadores.currentTrabajadorId!),
        ]);
      } catch (error) {
        console.log('Error al eliminar el documento:', error);
        toast.open({
          message: 'Error al eliminar, por favor intente nuevamente.',
          type: 'error',
        });
        throw error;
      }
    },
  });
};

const documentTypeLabels = {
  aptitud: "Aptitud al Puesto",
  historiaClinica: "Historia Clínica",
  exploracionFisica: "Exploración Física",
  examenVista: "Examen de la Vista",
  audiometria: "Audiometría",
  antidoping: "Antidoping",
  certificado: "Certificado",
  documentoExterno: "Documento Externo",
  notaMedica: "Nota Médica",
  historiaOtologica: "Historia Otologica",
  previoEspirometria: "Previo Espirometria",
};

const fetchData = async () => {
  const empresaId = String(route.params.idEmpresa);
  const centroTrabajoId = String(route.params.idCentroTrabajo);
  const trabajadorId = String(route.params.idTrabajador);

  try {
    await Promise.all([
      documentos.fetchAllDocuments(trabajadorId),
      resultadosClinicos.fetchResultadosAgrupados(trabajadorId),
      empresas.fetchEmpresaById(empresaId),
      centrosTrabajo.fetchCentroTrabajoById(empresaId, centroTrabajoId),
      trabajadores.fetchTrabajadorById(empresaId, centroTrabajoId, trabajadorId)
    ]);

    empresas.currentEmpresaId = empresaId;
    centrosTrabajo.currentCentroTrabajoId = centroTrabajoId;
    trabajadores.currentTrabajadorId = trabajadorId;

    formData.resetFormData();
  } catch (error) {
    console.error("Error al cargar datos:", error);
  } 
};

onMounted(fetchData);

watch(
  () => route.params,
  () => {
    fetchData();
  }
);

const documentosPorAnio = computed(() => documentos.documentsByYear);
// Crear una copia superficial para forzar reactividad cuando se añaden nuevas claves (años)
const resultadosPorAnio = computed(() => ({ ...resultadosClinicos.resultsByYear }));
const yearsWithRecords = computed(() => {
  const años = new Set<string>();
  if (documentosPorAnio.value) {
    Object.keys(documentosPorAnio.value).forEach((year) => años.add(year));
  }
  if (resultadosPorAnio.value) {
    Object.keys(resultadosPorAnio.value).forEach((year) => años.add(year));
  }
  return Array.from(años).sort((a, b) => Number(b) - Number(a));
});

// Función para verificar si hay resultados para un año específico
const tieneResultadosParaAnio = (year: string) => {
  const resultados = resultadosPorAnio.value?.[year];
  return resultados && Array.isArray(resultados) && resultados.length > 0;
};

const navigateTo = (routeName: string, params: Record<string, unknown>) => {
  if (!proveedorSaludStore.proveedorSalud) return;

  if (periodoDePruebaFinalizado.value) {
    if (!estadoSuscripcion.value || estadoSuscripcion.value === 'inactive') {
      showSubscriptionModal.value = true;
      return;
    }

    if (
      estadoSuscripcion.value === 'cancelled' &&
      finDeSuscripcion.value &&
      new Date() > finDeSuscripcion.value
    ) {
      showSubscriptionModal.value = true;
      return;
    }
  }

  if (
    routeName === 'crear-documento' &&
    params.tipoDocumento === 'historiaClinica' &&
    historiasDelMes.value != null &&
    historiasDelMes.value >= proveedorSaludStore.proveedorSalud?.maxHistoriasPermitidasAlMes
  ) {
    showSubscriptionModal.value = true;
    return;
  }

  if (routeName === 'crear-documento' && !canCreateDocument(params.tipoDocumento as string)) {
    toast.open({
      message: getRestrictionMessage(params.tipoDocumento as string),
      type: 'error',
    });
    return;
  }

  const routeParams: RouteParamsRaw =
    routeName === 'crear-documento'
      ? {
          idEmpresa: String(params.idEmpresa ?? empresas.currentEmpresaId ?? ''),
          idCentroTrabajo: String(
            params.idCentroTrabajo ??
              centrosTrabajo.currentCentroTrabajoId ??
              route.params.idCentroTrabajo ??
              '',
          ),
          idTrabajador: String(params.idTrabajador ?? trabajadores.currentTrabajadorId ?? ''),
          tipoDocumento: String(params.tipoDocumento ?? ''),
          ...(params.idDocumento != null
            ? { idDocumento: String(params.idDocumento) }
            : {}),
        }
      : (params as RouteParamsRaw);

  router.push({ name: routeName, params: routeParams });
  if (routeName === 'crear-documento') {
    documentos.setCurrentTypeOfDocument(params.tipoDocumento as string);
    documentos.currentDocument = null;
  }
};

const toggleRouteSelection = (route: string, isSelected: boolean) => {
    if (isSelected) {
        if (!selectedRoutes.value.includes(route)) {
            selectedRoutes.value.push(route);
        }
    } else {
        selectedRoutes.value = selectedRoutes.value.filter(r => r !== route);
    }
};

const toggleDeletionMode = () => {
    isDeletionMode.value = !isDeletionMode.value;
    // Ya no limpiamos la selección al cambiar de modo
    // Los checkboxes mantienen su estado
};

const handleEditResultado = (resultado: any) => {
  // Abrir el drawer y prellenar con el resultado
  resultadosClinicos.setCurrent(resultado);
  showResultadosClinicosPanel.value = true;
};

const handleCloseResultadosPanel = async () => {
  showResultadosClinicosPanel.value = false;
  // Refrescar resultados agrupados al cerrar el drawer
  if (trabajadores.currentTrabajadorId) {
    await resultadosClinicos.fetchResultadosAgrupados(trabajadores.currentTrabajadorId);
    // Forzar múltiples ciclos de actualización
    await nextTick();
    await nextTick();
  }
};

const handleDeleteSelected = async () => {
    if (selectedRoutes.value.length === 0) return;
        
    try {
        toast.open({ 
            message: `Eliminando ${selectedRoutes.value.length} documento${selectedRoutes.value.length !== 1 ? 's' : ''}...`, 
            type: "info" 
        });
        
        // Mapear rutas a documentos para eliminación
        const documentosAEliminar: Array<{id: string, tipo: string}> = [];
        
        // Recorrer todos los documentos por año para encontrar los que coinciden con las rutas seleccionadas
        Object.values(documentos.documentsByYear).forEach(yearData => {
            // Constancias de Aptitud
            yearData.constanciasAptitud?.forEach(constanciaAptitud => {
                const rutaBase = obtenerRutaDocumento(constanciaAptitud, 'Constancia Aptitud');
                const fecha = obtenerFechaDocumento(constanciaAptitud) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(constanciaAptitud, 'Constancia Aptitud', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: constanciaAptitud._id, tipo: 'constanciaAptitud' });
                }
            });

            // Aptitudes
            yearData.aptitudes?.forEach(aptitud => {
                const rutaBase = obtenerRutaDocumento(aptitud, 'Aptitud');
                const fecha = obtenerFechaDocumento(aptitud) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(aptitud, 'Aptitud', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: aptitud._id, tipo: 'aptitud' });
                }
            });
            
            // Historias Clínicas
            yearData.historiasClinicas?.forEach(historiaClinica => {
                const rutaBase = obtenerRutaDocumento(historiaClinica, 'Historia Clinica');
                const fecha = obtenerFechaDocumento(historiaClinica) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(historiaClinica, 'Historia Clinica', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: historiaClinica._id, tipo: 'historiaClinica' });
                }
            });
            
            // Exploraciones Físicas
            yearData.exploracionesFisicas?.forEach(exploracionFisica => {
                const rutaBase = obtenerRutaDocumento(exploracionFisica, 'Exploracion Fisica');
                const fecha = obtenerFechaDocumento(exploracionFisica) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(exploracionFisica, 'Exploracion Fisica', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: exploracionFisica._id, tipo: 'exploracionFisica' });
                }
            });
            
            // Exámenes de Vista
            yearData.examenesVista?.forEach(examenVista => {
                const rutaBase = obtenerRutaDocumento(examenVista, 'Examen Vista');
                const fecha = obtenerFechaDocumento(examenVista) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(examenVista, 'Examen Vista', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: examenVista._id, tipo: 'examenVista' });
                }
            });

            // Audiometrías
            yearData.audiometrias?.forEach(audiometria => {
                const rutaBase = obtenerRutaDocumento(audiometria, 'Audiometria');
                const fecha = obtenerFechaDocumento(audiometria) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(audiometria, 'Audiometria', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: audiometria._id, tipo: 'audiometria' });
                }
            });

            // Antidopings
            yearData.antidopings?.forEach(antidoping => {
                const rutaBase = obtenerRutaDocumento(antidoping, 'Antidoping');
                const fecha = obtenerFechaDocumento(antidoping) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(antidoping, 'Antidoping', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: antidoping._id, tipo: 'antidoping' });
                }
            });
            
            // Certificados
            yearData.certificados?.forEach(certificado => {
                const rutaBase = obtenerRutaDocumento(certificado, 'Certificado');
                const fecha = obtenerFechaDocumento(certificado) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(certificado, 'Certificado', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: certificado._id, tipo: 'certificado' });
                }
            });

            // Certificados Expedito
            yearData.certificadosExpedito?.forEach(certificado => {
                const rutaBase = obtenerRutaDocumento(certificado, 'Certificado Expedito');
                const fecha = obtenerFechaDocumento(certificado) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(certificado, 'Certificado Expedito', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: certificado._id, tipo: 'certificadoExpedito' });
                }
            });
            
            // Documentos Externos
            yearData.documentosExternos?.forEach(documentoExterno => {
                const rutaBase = obtenerRutaDocumento(documentoExterno, 'Documento Externo');
                const fecha = obtenerFechaDocumento(documentoExterno) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(documentoExterno, 'Documento Externo', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: documentoExterno._id, tipo: 'documentoExterno' });
                }
            });
            
            // Notas Médicas
            yearData.notasMedicas?.forEach(notaMedica => {
                const rutaBase = obtenerRutaDocumento(notaMedica, 'Nota Medica');
                const fecha = obtenerFechaDocumento(notaMedica) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(notaMedica, 'Nota Medica', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: notaMedica._id, tipo: 'notaMedica' });
                }
            });

            // Recetas Médicas
            yearData.recetas?.forEach(receta => {
                const rutaBase = obtenerRutaDocumento(receta, 'Receta');
                const fecha = obtenerFechaDocumento(receta) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(receta, 'Receta', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: receta._id, tipo: 'receta' });
                }
            });

            // Control Prenatal
            yearData.controlPrenatal?.forEach(controlPrenatal => {
                const rutaBase = obtenerRutaDocumento(controlPrenatal, 'Control Prenatal');
                const fecha = obtenerFechaDocumento(controlPrenatal) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(controlPrenatal, 'Control Prenatal', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: controlPrenatal._id, tipo: 'controlPrenatal' });
                }
            });

            // Historia Otologica
            yearData.historiaOtologica?.forEach(historiaOtologica => {
                const rutaBase = obtenerRutaDocumento(historiaOtologica, 'Historia Otologica');
                const fecha = obtenerFechaDocumento(historiaOtologica) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(historiaOtologica, 'Historia Otologica', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: historiaOtologica._id, tipo: 'historiaOtologica' });
                }
            });

            // Previo Espirometria
            yearData.previoEspirometria?.forEach(previoEspirometria => {
                const rutaBase = obtenerRutaDocumento(previoEspirometria, 'Previo Espirometria');
                const fecha = obtenerFechaDocumento(previoEspirometria) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(previoEspirometria, 'Previo Espirometria', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: previoEspirometria._id, tipo: 'previoEspirometria' });
                }
            });

            // Entrevista Psicológica
            yearData.entrevistasPsicologicas?.forEach(entrevistaPsicologica => {
                const rutaBase = obtenerRutaDocumento(entrevistaPsicologica, 'Entrevista Psicologica');
                const fecha = obtenerFechaDocumento(entrevistaPsicologica) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(entrevistaPsicologica, 'Entrevista Psicologica', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: entrevistaPsicologica._id, tipo: 'entrevistaPsicologica' });
                }
            });

            // Trastornos Estado Animo
            yearData.trastornosEstadoAnimo?.forEach(trastornosEstadoAnimo => {
                const rutaBase = obtenerRutaDocumento(trastornosEstadoAnimo, 'Trastornos Estado Animo');
                const fecha = obtenerFechaDocumento(trastornosEstadoAnimo) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(trastornosEstadoAnimo, 'Trastornos Estado Animo', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: trastornosEstadoAnimo._id, tipo: 'trastornosEstadoAnimo' });
                }
            });

            // Cuestionario Prodromal Breve
            yearData.cuestionarioProdromalBreve?.forEach(cuestionarioProdromalBreve => {
                const rutaBase = obtenerRutaDocumento(cuestionarioProdromalBreve, 'Cuestionario Prodromal Breve');
                const fecha = obtenerFechaDocumento(cuestionarioProdromalBreve) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(cuestionarioProdromalBreve, 'Cuestionario Prodromal Breve', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: cuestionarioProdromalBreve._id, tipo: 'cuestionarioProdromalBreve' });
                }
            });

            // Trastorno Limite Personalidad
            yearData.trastornoLimitePersonalidad?.forEach(trastornoLimitePersonalidad => {
                const rutaBase = obtenerRutaDocumento(trastornoLimitePersonalidad, 'Trastorno Limite Personalidad');
                const fecha = obtenerFechaDocumento(trastornoLimitePersonalidad) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(trastornoLimitePersonalidad, 'Trastorno Limite Personalidad', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: trastornoLimitePersonalidad._id, tipo: 'trastornoLimitePersonalidad' });
                }
            });

            // Evento Seguimiento Cardiometabolico
            yearData.eventoSeguimientoCardiometabolico?.forEach(eventoSeguimientoCardiometabolico => {
                const rutaBase = obtenerRutaDocumento(eventoSeguimientoCardiometabolico, 'Evento Seguimiento Cardiometabolico');
                const fecha = obtenerFechaDocumento(eventoSeguimientoCardiometabolico) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(eventoSeguimientoCardiometabolico, 'Evento Seguimiento Cardiometabolico', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({ id: eventoSeguimientoCardiometabolico._id, tipo: 'eventoSeguimientoCardiometabolico' });
                }
            });

            // Informe Longitudinal Cardiometabolico
            yearData.informeLongitudinalCardiometabolico?.forEach(informeLongitudinalCardiometabolico => {
                const rutaBase = obtenerRutaDocumento(informeLongitudinalCardiometabolico, 'Informe Longitudinal Cardiometabolico');
                const fecha = obtenerFechaDocumento(informeLongitudinalCardiometabolico) || 'SinFecha';
                const nombreArchivo = obtenerNombreArchivo(informeLongitudinalCardiometabolico, 'Informe Longitudinal Cardiometabolico', fecha);
                const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                if (informeLongitudinalCardiometabolico._id && selectedRoutes.value.includes(ruta)) {
                    documentosAEliminar.push({
                        id: informeLongitudinalCardiometabolico._id,
                        tipo: 'informeLongitudinalCardiometabolico',
                    });
                }
            });
        });
                
        // Eliminar documentos uno por uno
        const eliminacionesExitosas: Array<{id: string, tipo: string}> = [];
        const eliminacionesFallidas: Array<{id: string, tipo: string}> = [];
        
        for (const documento of documentosAEliminar) {
            try {
                await documentos.deleteDocumentById(
                    documento.tipo,
                    trabajadores.currentTrabajadorId!,
                    documento.id
                );
                eliminacionesExitosas.push(documento);
            } catch (error) {
                console.error(`❌ Error al eliminar documento ${documento.id}:`, error);
                eliminacionesFallidas.push(documento);
            }
        }
        
        // Mostrar resultados
        if (eliminacionesExitosas.length > 0) {
            toast.open({ 
                message: `${eliminacionesExitosas.length} documento${eliminacionesExitosas.length !== 1 ? 's' : ''} eliminado${eliminacionesExitosas.length !== 1 ? 's' : ''} exitosamente.`, 
                type: "success" 
            });
        }
        
        if (eliminacionesFallidas.length > 0) {
            toast.open({ 
                message: `${eliminacionesFallidas.length} documento${eliminacionesFallidas.length !== 1 ? 's' : ''} no se pudieron eliminar.`, 
                type: "error" 
            });
        }
        
        // Limpiar selección después de eliminar
        selectedRoutes.value = [];
        isDeletionMode.value = false;
        
        // Recargar documentos y resultados
        await Promise.all([
          documentos.fetchAllDocuments(trabajadores.currentTrabajadorId!),
          resultadosClinicos.fetchResultadosAgrupados(trabajadores.currentTrabajadorId!)
        ]);
        
    } catch (error) {
        console.error('Error al eliminar documentos:', error);
        toast.open({ 
            message: "Error al eliminar los documentos. Por favor, inténtalo de nuevo.", 
            type: "error" 
        });
    }
};

const logotipoPendiente = computed(() => {
  const proveedor = proveedorSaludStore.proveedorSalud;
  return !proveedor?.logotipoEmpresa?.data;
});

// Computed para el total de documentos creados (sin documentos externos)
const totalDocumentosCreados = computed(() => {
  if (!documentos.documentsByYear) return 0;
  return Object.values(documentos.documentsByYear).reduce((total, yearData) => {
    return total + (
      (yearData.constanciasAptitud?.length || 0) +
      (yearData.aptitudes?.length || 0) +
      (yearData.historiasClinicas?.length || 0) +
      (yearData.exploracionesFisicas?.length || 0) +
      (yearData.examenesVista?.length || 0) +
      (yearData.audiometrias?.length || 0) +
      (yearData.antidopings?.length || 0) +
      (yearData.certificados?.length || 0) +
      (yearData.certificadosExpedito?.length || 0) +
      (yearData.notasMedicas?.length || 0) +
      (yearData.controlPrenatal?.length || 0) +
      (yearData.historiaOtologica?.length || 0) +
      (yearData.previoEspirometria?.length || 0) +
      (yearData.entrevistasPsicologicas?.length || 0) +
      (yearData.trastornosEstadoAnimo?.length || 0) +
      (yearData.cuestionarioProdromalBreve?.length || 0) +
      (yearData.trastornoLimitePersonalidad?.length || 0) +
      (yearData.eventoSeguimientoCardiometabolico?.length || 0) + 
      (yearData.informeLongitudinalCardiometabolico?.length || 0)
    );
  }, 0);
});

// Computed para el total de documentos externos
const totalDocumentosExternos = computed(() => {
  if (!documentos.documentsByYear) return 0;
  return Object.values(documentos.documentsByYear).reduce((total, yearData) => {
    return total + (yearData.documentosExternos?.length || 0);
  }, 0);
});

// Computed para el año más reciente con documentos
const añoMasReciente = computed(() => {
  const añosDocumentos = Object.keys(documentos.documentsByYear || {}).map(Number);
  const añosResultados = Object.keys(resultadosClinicos.resultsByYear || {}).map(Number);
  const todosLosAños = [...new Set([...añosDocumentos, ...añosResultados])];
  
  if (todosLosAños.length === 0) return null;
  return Math.max(...todosLosAños);
});

</script>

<template>
  <Transition appear mode="out-in" name="slide-up">
    <div>
      <!-- Modales -->
      <Transition appear name="fade">
        <ModalSuscripcion v-if="showSubscriptionModal" 
          @closeModal="showSubscriptionModal = false"/>
      </Transition>

      <Transition appear name="fade">
        <ModalCargaDocumentoExterno v-if="showDocumentoExternoModal"
          @closeDocumentoExternoModal="toggleDocumentoExternoModal" @updateData="fetchData" />
      </Transition>

      <Transition appear name="fade">
        <ModalUpdateDocumentoExterno v-if="showDocumentoExternoUpdateModal"
          @closeModalUpdate="toggleDocumentoExternoUpdateModal" 
          @updateData="fetchData"
          @abrirResultados="showResultadosClinicosPanel = true"
        />
      </Transition>

      <Transition appear name="fade">
        <ModalCuestionarios
          v-if="showCuestionariosModal"
          @closeModal="toggleCuestionariosModal"
          @openSeguimientoProgramado="openSeguimientoProgramadoModal"
        />
      </Transition>

      <ModalSeguimientoProgramadoCardiometabolico
        :visible="showSeguimientoProgramadoModal && !!trabajadores.currentTrabajadorId"
        :trabajador-id="trabajadores.currentTrabajadorId ?? null"
        @close="showSeguimientoProgramadoModal = false"
      />

      <ResultadosClinicosPanel 
        v-if="showResultadosClinicosPanel && trabajadores.currentTrabajadorId" 
        :isOpen="showResultadosClinicosPanel"
        :trabajadorId="trabajadores.currentTrabajadorId"
        @close="handleCloseResultadosPanel"
      />

        <!-- Header principal con información del trabajador -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden mb-4">
          <div class="p-6">
            <Transition appear mode="out-in" name="slide-up">
              <div v-if="trabajadores.currentTrabajador" class="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                
                <!-- Información del trabajador -->
                <div class="flex items-center gap-4 sm:mb-4 lg:mb-0">
                  <!-- Logo de la empresa o placeholder -->
                  <div class="flex-shrink-0">
                    <img
                      v-if="empresas.currentEmpresa?.logotipoEmpresa?.data"
                      :src="'/uploads/logos/' + empresas.currentEmpresa.logotipoEmpresa.data + '?t=' + empresas.currentEmpresa.updatedAt"
                      :alt="'Logo de ' + empresas.currentEmpresa?.nombreComercial"
                      class="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-lg shadow-lg"
                    />
                    <div v-else class="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                      <i class="fas fa-building text-white text-xl sm:text-2xl"></i>
                    </div>
                  </div>
                  
                    <!-- Datos del trabajador -->
                    <div class="flex-1 min-w-0">
                      <h1 class="text-xl sm:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <i class="fas fa-user text-emerald-600 text-md sm:text-lg lg:text-xl xl:text-2xl"></i>
                        {{ formatNombreCompleto(trabajadores.currentTrabajador) }}
                      </h1>
                      <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                        <div v-if="trabajadores.currentTrabajador?.sexo" class="flex items-center gap-2 group relative">
                          <i v-if="trabajadores.currentTrabajador?.sexo === 'Masculino'" class="fas fa-mars text-sky-600 text-sm sm:text-md lg:text-lg xl:text-xl"></i>
                          <i v-else class="fas fa-venus text-rose-600 text-sm sm:text-md lg:text-lg xl:text-xl"></i>
                           <span class="text-item text-sm sm:text-base text-gray-600">
                             <span class="block lg:hidden">{{ trabajadores.currentTrabajador.sexo }}</span>
                             <span class="hidden lg:block 2xl:hidden">{{ trabajadores.currentTrabajador.sexo === 'Masculino' ? 'M' : 'F' }}</span>
                             <span class="hidden 2xl:block">{{ trabajadores.currentTrabajador.sexo }}</span>
                           </span>
                        </div>
                        <div class="flex sm:hidden md:flex items-center gap-2 group relative">
                          <i class="fas fa-birthday-cake text-emerald-500 text-sm"></i>
                          <span class="text-item text-sm sm:text-base text-gray-600">
                            {{ calcularEdad(trabajadores.currentTrabajador?.fechaNacimiento) }} años
                          </span>
                          <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            Edad
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                          </div>
                        </div>
                        <div class="flex items-center gap-2 group relative">
                          <i class="fas fa-briefcase text-blue-500 text-sm"></i>
                          <span class="text-item text-sm sm:text-base text-gray-600">
                            {{ trabajadores.currentTrabajador?.puesto }}
                          </span>
                          <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            Puesto
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                          </div>
                        </div>
                        <div class="flex sm:hidden md:flex lg:hidden xl:flex items-center gap-2 group relative">
                          <i class="fas fa-clock text-cyan-500 text-sm"></i>
                          <span class="text-sm sm:text-base text-gray-600">
                            {{ calcularAntiguedad(trabajadores.currentTrabajador?.fechaIngreso) }}
                          </span>
                          <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            Antigüedad
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                          </div>
                        </div>
                        <div v-if="trabajadores.currentTrabajador?.numeroEmpleado" class="flex items-center gap-2 group relative">
                          <i class="fas fa-id-badge text-purple-500 text-sm"></i>
                          <span class="text-sm sm:text-base text-gray-600">
                            No. {{ trabajadores.currentTrabajador.numeroEmpleado }}
                          </span>
                          <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            Número de empleado
                          </div>
                        </div>
                      </div>
                    </div>
                </div>
                
                <!-- Estadísticas rápidas -->
                <div class="hidden sm:flex sm:flex-row gap-3">
                  <div class="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-center sm:w-1/3 md:w-1/3 lg:w-1/2 xl:w-1/3">
                    <div class="text-2xl font-bold text-emerald-600">{{ totalDocumentosCreados }}</div>
                    <div class="text-xs text-emerald-700 font-medium">
                      {{ totalDocumentosCreados === 1 ? 'Documento Creado' : 'Documentos Creados' }}
                    </div>
                  </div>
                  <div class="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-center sm:w-1/3 md:w-1/3 lg:w-1/2 xl:w-1/3">
                    <div class="text-2xl font-bold text-purple-600">{{ totalDocumentosExternos }}</div>
                    <div class="text-xs text-purple-700 font-medium">
                      {{ totalDocumentosExternos === 1 ? 'Documento Externo' : 'Documentos Externos' }}
                    </div>
                  </div>
                  <div class="hidden sm:block lg:hidden xl:block bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-center sm:w-1/3 md:w-1/3 lg:w-1/2 xl:w-1/3">
                    <div class="text-2xl font-bold text-orange-600">
                      {{ añoMasReciente || 'N/A' }}
                    </div>
                    <div class="text-xs text-orange-700 font-medium">Año Más Reciente</div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Aviso de logotipo pendiente -->
        <Transition appear name="slide-down">
          <div v-if="logotipoPendiente" class="mb-1 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <div class="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <i class="fas fa-exclamation-triangle text-amber-600 text-sm"></i>
            </div>
            <div class="flex-1">
              <p class="text-sm text-amber-800">
                <span class="font-semibold">Aviso:</span> Puedes crear informes, pero como no has subido un logotipo, se utilizará el logotipo de Ramazzini. 
                <router-link :to="{ name: 'perfil-proveedor' }" class="font-semibold underline hover:text-amber-900 transition-colors">
                  Sube tu logotipo aquí
                </router-link> 
                 para mejor presentación.
              </p>
            </div>
          </div>
        </Transition>

        <!-- Panel de creación de documentos -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 mb-4">
          <!-- Header del panel -->
          <div class="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 px-6 py-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <i class="fas fa-plus text-white text-sm"></i>
                </div>
                <div>
                  <h2 class="text-lg font-medium text-white">Crear Nuevo Documento</h2>
                  <p class="text-emerald-100 text-sm">Selecciona el tipo de documento a crear</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Botones de documentos -->
          <div class="p-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8 gap-3">
              
              <!-- Historia Clínica -->
              <button @click="navigateTo('crear-documento', {
                idEmpresa: empresas.currentEmpresaId,
                idTrabajador: trabajadores.currentTrabajadorId,
                tipoDocumento: 'historiaClinica'
              })" class="group relative bg-gradient-to-br from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 border-teal-200 hover:border-teal-400 border-2 rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
                <div class="text-center">
                  <div class="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-teal-600 transition-colors">
                    <i class="fas fa-notes-medical text-white text-lg"></i>
                  </div>
                  <h3 class="font-semibold text-gray-900 text-sm mb-1">Historia Clínica</h3>
                  <p class="text-item text-xs text-gray-600">Entrevista médica</p>
                </div>
              </button>

              <!-- Exploración Física -->
              <button @click="navigateTo('crear-documento', {
                idEmpresa: empresas.currentEmpresaId,
                idTrabajador: trabajadores.currentTrabajadorId,
                tipoDocumento: 'exploracionFisica'
              })" class="group relative bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 border-indigo-200 hover:border-indigo-400 border-2 rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
                <div class="text-center">
                  <div class="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-indigo-600 transition-colors">
                    <i class="fa-solid fa-person text-white text-xl"></i>
                  </div>
                  <h3 class="font-semibold text-gray-900 text-sm mb-1">Exploración Física</h3>
                  <p class="text-item text-xs text-gray-600">Aparatos y sistemas</p>
                </div>
              </button>

              <!-- Examen de la Vista -->
              <button @click="navigateTo('crear-documento', {
                idEmpresa: empresas.currentEmpresaId,
                idTrabajador: trabajadores.currentTrabajadorId,
                tipoDocumento: 'examenVista'
              })" class="group relative bg-gradient-to-br from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 border-yellow-200 hover:border-yellow-400 border-2 rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
                <div class="text-center">
                  <div class="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-yellow-600 transition-colors">
                    <i class="fas fa-eye text-white text-lg"></i>
                  </div>
                  <h3 class="font-semibold text-gray-900 text-sm mb-1">Examen Vista</h3>
                  <p class="text-item text-xs text-gray-600">Agudeza visual y colores</p>
                </div>
              </button>

              <!-- Audiometría -->
              <button @click="navigateTo('crear-documento', {
                idEmpresa: empresas.currentEmpresaId,
                idTrabajador: trabajadores.currentTrabajadorId,
                tipoDocumento: 'audiometria'
              })" class="group relative bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-purple-200 hover:border-purple-400 border-2 rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
                <div class="text-center">
                  <div class="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-600 transition-colors">
                    <i class="fas fa-volume-up text-white text-lg"></i>
                  </div>
                  <h3 class="font-semibold text-gray-900 text-sm mb-1">Audiometría</h3>
                  <p class="text-item text-xs text-gray-600">Audición</p>
                </div>
              </button>

              <!-- Aptitud -->
              <button @click="navigateTo('crear-documento', {
                idEmpresa: empresas.currentEmpresaId,
                idTrabajador: trabajadores.currentTrabajadorId,
                tipoDocumento: 'aptitud'
              })" class="group relative bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-green-200 hover:border-green-400 border-2 rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
                <div class="text-center">
                  <div class="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-green-600 transition-colors">
                    <i class="fas fa-user-check text-white text-lg"></i>
                  </div>
                  <h3 class="font-semibold text-gray-900 text-sm mb-1">Aptitud</h3>
                  <p class="text-item text-xs text-gray-600">Evaluación laboral</p>
                </div>
              </button>

              <!-- Certificado -->
              <button @click="navigateTo('crear-documento', {
                idEmpresa: empresas.currentEmpresaId,
                idTrabajador: trabajadores.currentTrabajadorId,
                tipoDocumento: 'certificado'
              })" class="group relative bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-blue-200 hover:border-blue-400 border-2 rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
                <div class="text-center">
                  <div class="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-600 transition-colors">
                    <i class="fas fa-certificate text-white text-lg"></i>
                  </div>
                  <h3 class="font-semibold text-gray-900 text-sm mb-1">Certificado</h3>
                  <p class="text-item text-xs text-gray-600">Certificación médica</p>
                </div>
              </button>

              <!-- Antidoping -->
              <button @click="navigateTo('crear-documento', {
                idEmpresa: empresas.currentEmpresaId,
                idTrabajador: trabajadores.currentTrabajadorId,
                tipoDocumento: 'antidoping'
              })" class="group relative bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 border-red-200 hover:border-red-400 border-2 rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
                <div class="text-center">
                  <div class="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-red-600 transition-colors">
                    <i class="fas fa-flask text-white text-lg"></i>
                  </div>
                  <h3 class="font-semibold text-gray-900 text-sm mb-1">Antidoping</h3>
                  <p class="text-item text-xs text-gray-600">Prueba de sustancias</p>
                </div>
              </button>

              <!-- Nota Médica -->
              <button @click="navigateTo('crear-documento', {
                idEmpresa: empresas.currentEmpresaId,
                idTrabajador: trabajadores.currentTrabajadorId,
                tipoDocumento: 'notaMedica'
              })" class="group relative bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border-orange-200 hover:border-orange-400 border-2 rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
                <div class="text-center">
                  <div class="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-orange-600 transition-colors">
                    <i class="fas fa-stethoscope text-white text-lg"></i>
                  </div>
                  <h3 class="font-semibold text-gray-900 text-sm mb-1">Nota Médica</h3>
                  <p class="text-item text-xs text-gray-600">Consultas</p>
                </div>
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row justify-center items-center gap-4 mt-6">
              <!-- Documento Externo -->
              <div class="flex justify-center">
                <SliderButton 
                  class="w-full max-w-md" 
                  @click="toggleDocumentoExternoModal"
                  @closeModal="toggleDocumentoExternoModal" 
                >
                  <span class="sm:hidden">Doc. Ext.</span>
                  <span class="hidden sm:inline">Documento Externo</span>
                </SliderButton>
              </div>
  
              <!-- Botón para Cuestionarios de Vigilancia Médica -->
              <div class="flex justify-center">
                <button
                  @click="toggleCuestionariosModal"
                  class="relative w-[232px] h-[50px] rounded-lg cursor-pointer flex items-center border-2 border-emerald-600 bg-white overflow-hidden transition-all duration-200 hover:bg-emerald-50 hover:shadow-lg"
                >
                  <i class="fas fa-file-alt text-emerald-600 text-lg ml-4"></i>
                  <span class="flex-1 text-center text-emerald-600 text-lg ml-3">Otros<span class="hidden sm:inline"> Documentos</span></span>
                  <i class="fas fa-arrow-right text-emerald-600 text-sm mr-4 transition-transform duration-200 hover:translate-x-1"></i>
                </button>
              </div>
  
              <!-- Botón para Registrar Resultados Clínicos -->
              <div class="sm:col-span-2 lg:col-span-1 flex justify-center">
                <button
                  @click="showResultadosClinicosPanel = true"
                  class="relative w-[232px] h-[50px] rounded-lg cursor-pointer flex items-center border-2 border-blue-600 bg-white overflow-hidden transition-all duration-200 hover:bg-blue-50 hover:shadow-lg"
                >
                  <i class="fas fa-clipboard-check text-blue-600 text-lg ml-4"></i>
                  <span class="flex-1 text-center text-blue-600 text-lg ml-3">Resultados</span>
                  <i class="fas fa-arrow-right text-blue-600 text-sm mr-4 transition-transform duration-200 hover:translate-x-1"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Contenido principal de documentos -->
        <div>
          <Transition appear mode="out-in" name="slide-up">
            <div v-if="documentos.loading && !yearsWithRecords.length" class="text-center py-20">
              <div class="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4 animate-pulse">
                <i class="fas fa-spinner fa-spin text-2xl text-emerald-600"></i>
              </div>
              <h2 class="text-xl font-semibold text-gray-700 mb-2">Cargando documentos...</h2>
              <p class="text-gray-500">Obteniendo el historial médico del trabajador</p>
            </div>
            
            <div v-else>
              <!-- <div v-if="resultadosClinicos.loadingGrouped" class="text-center py-4">
                <div class="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full mb-4 animate-pulse">
                  <i class="fas fa-spinner fa-spin text-xl text-emerald-600"></i>
                </div>
                <p class="text-gray-500">Actualizando resultados clínicos...</p>
              </div> -->

              <div v-if="yearsWithRecords.length" class="space-y-6">
                <div
                  v-for="year in yearsWithRecords"
                  :key="`year-${year}-${resultadosPorAnio[year]?.length || 0}`"
                  class="space-y-4"
                >
                  <GrupoDocumentos
                    :documents="documentosPorAnio[year] || {}"
                    :year="String(year)"
                    :trabajador="trabajadores.currentTrabajador || {}"
                    @eliminarDocumento="solicitarEliminacionDocumento"
                    @abrirModalUpdate="toggleDocumentoExternoUpdateModal"
                    @openSubscriptionModal="showSubscriptionModal = true"
                    :toggleRouteSelection="toggleRouteSelection"
                    :selectedRoutes="selectedRoutes"
                    :isDeletionMode="isDeletionMode"
                    :toggleDeletionMode="toggleDeletionMode"
                    :onDeleteSelected="handleDeleteSelected"
                  >
                    <template #extraSection v-if="resultadosPorAnio[year]?.length > 0">
                      <ResultadosClinicosSubsection
                        :results="resultadosPorAnio[year] || []"
                        @edit="handleEditResultado"
                      />
                    </template>
                  </GrupoDocumentos>
                </div>
              </div>

              <div v-else class="text-center py-8">
                <div class="inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full mb-6">
                  <i class="fas fa-folder-open text-6xl text-gray-400"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">
                  Expediente médico vacío
                </h2>
                <p class="text-gray-600 mb-8 max-w-2xl mx-auto">
                  Este trabajador aún no tiene documentos médicos registrados. 
                  Comienza creando una historia clínica para establecer el expediente médico.
                </p>
                
                <!-- Sugerencias de documentos -->
                <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8 max-w-4xl mx-auto">
                  <h3 class="text-lg font-semibold text-gray-800 mb-6 text-center">
                    ¿Por dónde empezar?
                  </h3>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    <div class="text-center p-6 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200">
                      <div class="w-16 h-16 bg-teal-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-notes-medical text-white text-xl"></i>
                      </div>
                      <h4 class="font-semibold text-gray-900 mb-2">Historia Clínica</h4>
                      <p class="text-sm text-gray-600 mb-4">
                        Base fundamental del expediente médico
                      </p>
                      <button @click="navigateTo('crear-documento', {
                        idEmpresa: empresas.currentEmpresaId,
                        idTrabajador: trabajadores.currentTrabajadorId,
                        tipoDocumento: 'historiaClinica'
                      })" class="w-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors">
                        Crear Historia Clínica
                      </button>
                    </div>
                    
                    <div class="text-center p-6 rounded-xl bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
                      <div class="w-16 h-16 bg-red-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-flask text-white text-xl"></i>
                      </div>
                      <h4 class="font-semibold text-gray-900 mb-2">Antidoping</h4>
                      <p class="text-sm text-gray-600 mb-4">
                        Examen para detección de consumo de sustancias
                      </p>
                      <button @click="navigateTo('crear-documento', {
                        idEmpresa: empresas.currentEmpresaId,
                        idTrabajador: trabajadores.currentTrabajadorId,
                        tipoDocumento: 'antidoping'
                      })" class="w-full bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors">
                        Crear Antidoping
                      </button>
                    </div>
                    
                    <div class="text-center p-6 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200">
                      <div class="w-16 h-16 bg-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-stethoscope text-white text-xl"></i>
                      </div>
                      <h4 class="font-semibold text-gray-900 mb-2">Nota Médica</h4>
                      <p class="text-sm text-gray-600 mb-4">
                        Consultas y evaluaciones médicas
                      </p>
                      <button @click="navigateTo('crear-documento', {
                        idEmpresa: empresas.currentEmpresaId,
                        idTrabajador: trabajadores.currentTrabajadorId,
                        tipoDocumento: 'notaMedica'
                      })" class="w-full bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors">
                        Crear Nota Médica
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Panel de botones deslizante -->
        <div class="relative flex justify-center md:justify-start">
          <SlidingButtonPanel v-if="!isDeletionMode" :selectedRoutes="selectedRoutes" />
          <DeletionButtonPanel 
            v-if="isDeletionMode" 
            :selectedRoutes="selectedRoutes" 
            :isDeletionMode="isDeletionMode"
            @deleteSelected="handleDeleteSelected"
          />
        </div>


    </div>
  </Transition>
</template>

<style scoped>
/* Animaciones para las transiciones */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s ease-out;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-enter-to {
  opacity: 1;
  transform: translateY(0);
}

.slide-up-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease-out;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-down-enter-to {
  opacity: 1;
  transform: translateY(0);
}

/* Animación personalizada para el icono de carga */
@keyframes gentle-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

.animate-pulse {
  animation: gentle-pulse 2s ease-in-out infinite;
}

/* Efectos de hover para las tarjetas */
.transform {
  transition: all 0.3s ease;
}

.transform:hover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

/* Responsive design mejorado */
@media (max-width: 640px) {
  .max-w-7xl {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

/* Mejoras para los botones */
button:active {
  transform: scale(0.98);
}

/* Efectos de gradiente mejorados */
.bg-gradient-to-br {
  background-size: 200% 200%;
  animation: gradient-shift 3s ease infinite;
}

@keyframes gradient-shift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>
