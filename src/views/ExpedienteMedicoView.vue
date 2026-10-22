<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, inject, computed, nextTick } from 'vue';
import { useRoute, useRouter, type RouteParamsRaw } from 'vue-router';
import { useTituloPagina } from '@/composables/useTituloPagina';
import { inicialesTrabajador } from '@/helpers/tituloPagina';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useDocumentosStore } from '@/stores/documentos';
import { useFormDataStore } from '@/stores/formDataStore';
import GreenButton from '@/components/GreenButton.vue';
import ModalCargaDocumentoExterno from '@/components/ModalCargaDocumentoExterno.vue';
import ModalUpdateDocumentoExterno from '@/components/ModalUpdateDocumentoExterno.vue';
import GrupoDocumentos from '@/components/GrupoDocumentos.vue';
import LazyMountWhenVisible from '@/components/LazyMountWhenVisible.vue';
import SlidingButtonPanel from '@/components/SlidingButtonPanel.vue';
import DeletionButtonPanel from '@/components/DeletionButtonPanel.vue';
import { calcularEdad, calcularAntiguedad } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import { clasificarSeleccionParaEliminar, TIPOS_DOCUMENTO_EXPEDIENTE } from '@/helpers/documentosExpediente';
import {
  anioTieneTipos,
  cantidadDeTipos,
  guardarFiltroDeSesion,
  leerFiltroDeSesion,
  tiposAConsulta,
  tiposConConteo,
  tiposDeLaConsulta,
} from '@/helpers/filtroExpediente';
import { montarTodosLosAnios, reiniciarNavegacionVisor } from '@/helpers/navegacionVisor';
import { procesarConLimite } from '@/helpers/procesarConLimite';
import {
  anotarPosicionExpediente,
  resaltarDocumento,
  tomarRetornoExpediente,
} from '@/helpers/retornoExpediente';
import ModalSuscripcion from '@/components/suscripciones/ModalSuscripcion.vue';
import ModalCuestionarios from '@/components/ModalCuestionarios.vue';
import ModalFinalizarDocumento from '@/components/modals/ModalFinalizarDocumento.vue';
import ModalAnularDocumento from '@/components/modals/ModalAnularDocumento.vue';
import ModalDatosProfesionales from '@/components/modals/ModalDatosProfesionales.vue';
import TreatmentConsentModal from '@/components/TreatmentConsentModal.vue';
import ModalInasistenciasCardiometabolicas from '@/components/ModalInasistenciasCardiometabolicas.vue';
import ModalOrdenDocumentos from '@/components/ModalOrdenDocumentos.vue';
import ModalRiesgos from '@/components/ModalRiesgos.vue';
import ModalIncapacidades from '@/components/incapacidades/ModalIncapacidades.vue';
import IncapacidadesAPI from '@/api/IncapacidadesAPI';
import {
  INCAPACIDADES_SOLO_ADMINISTRADOR,
  type CasoConIncapacidades,
} from '@/helpers/incapacidades';
import ModalTrabajadores from '@/components/ModalTrabajadores.vue';
import { useUserPermissions } from '@/composables/useUserPermissions';
import ModalFormatosParaFirma from '@/components/ModalFormatosParaFirma.vue';
import FormatosFirmadosAPI from '@/api/FormatosFirmadosAPI';
import ModalEliminacion from '@/components/ModalEliminacion.vue';
import { useEliminacion } from '@/composables/useEliminacion';
import { useUserStore } from '@/stores/user';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useIncapacidadesStore } from '@/stores/incapacidades';
import { verificarLimiteHistoriasDelMes } from '@/helpers/limiteHistoriasDelMes';
import { usePermissionRestrictions } from '@/composables/usePermissionRestrictions';
import { useRolePermissions } from '@/composables/useRolePermissions';
import { useProfessionalDataValidation } from '@/composables/useProfessionalDataValidation';
import { useNavigateWithTreatmentConsent } from '@/composables/useNavigateWithTreatmentConsent';
import { useResultadosClinicosStore } from '@/stores/resultadosClinicos';
import ResultadosClinicosPanel from '@/components/ResultadosClinicosPanel.vue';
import ResultadosClinicosSubsection from '@/components/ResultadosClinicosSubsection.vue';
import ExpedienteHeaderSkeleton from '@/components/skeletons/ExpedienteHeaderSkeleton.vue';
import { invalidateExpedienteConteosCache } from '@/helpers/expedienteResumenTrabajador';
import { useBorradoresNotaMedica } from '@/composables/useBorradoresNotaMedica';

const toast: any = inject('toast');
const {
  isOpen: eliminacionOpen,
  isConfirming: eliminacionConfirming,
  nivel: eliminacionNivel,
  tipoRegistro: eliminacionTipoRegistro,
  identificacion: eliminacionIdentificacion,
  textoConfirmacionEsperado: eliminacionTextoConfirmacion,
  detalleContexto: eliminacionDetalleContexto,
  mensajePersonalizado: eliminacionMensajePersonalizado,
  auditResourceType: eliminacionAuditResourceType,
  auditResourceId: eliminacionAuditResourceId,
  requestEliminacion: requestEliminacionLocal,
  confirmarEliminacion,
  cancelarEliminacion,
} = useEliminacion();

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
const { fetchBorradoresPendientes, invalidateBorradoresNotaMedicaCache } =
  useBorradoresNotaMedica();

const {
  canCreateDocument,
  canAnularEliminarDocumentos,
  getRestrictionMessage,
  executeIfCanManageDocumentosExternos,
  executeIfCanManageTrabajadores,
} = usePermissionRestrictions();

// La nota aclaratoria ya la revisó su fila contra el documento que aclara (aquí no se conoce)
const puedeGestionarTipo = (documentType: string) =>
  documentType === 'notaAclaratoria' || canCreateDocument(documentType);
const { canManageTrabajadores, canAccessRiesgosTrabajo } = useUserPermissions();
// Los resultados clínicos se otorgan con los estudios (antes, con los documentos de evaluación)
const {
  canManageResultadosClinicos,
  canConfigurarOrdenDocumentos,
} = useRolePermissions();
const { validationResult, loadFirmanteData, ensureProfessionalDataReady } = useProfessionalDataValidation();
const {
  navigateWithTreatmentConsent,
  showModal: showConsentModal,
  modalTrabajadorId,
  modalTrabajadorNombre,
  handleConsentRegistered,
  handleConsentCancel,
} = useNavigateWithTreatmentConsent();

const showDocumentoExternoModal = ref(false);
const showDocumentoExternoUpdateModal = ref(false);
const showFormatosFirmaModal = ref(false);
const showRiesgosModal = ref(false);

// Editar los datos del trabajador sin salir de su expediente
const showTrabajadorModal = ref(false);

const contextoTrabajador = () => ({
  empresaId: String(route.params.idEmpresa ?? empresas.currentEmpresaId ?? ''),
  centroId: String(route.params.idCentroTrabajo ?? ''),
  trabajadorId: String(route.params.idTrabajador ?? trabajadores.currentTrabajadorId ?? ''),
});

const abrirEdicionTrabajador = () => {
  executeIfCanManageTrabajadores(async () => {
    const { empresaId, centroId } = contextoTrabajador();
    if (!empresaId || !centroId || !trabajadores.currentTrabajador?._id) return;
    // El modal guarda con el centro seleccionado: asegurar que sea el de este trabajador
    if (String(centrosTrabajo.currentCentroTrabajoId ?? '') !== centroId) {
      await centrosTrabajo.fetchCentroTrabajoById(empresaId, centroId);
    }
    showTrabajadorModal.value = true;
  }, 'editar trabajadores');
};

const cerrarEdicionTrabajador = () => {
  showTrabajadorModal.value = false;
  // Que el encabezado muestre los datos recién guardados
  const { empresaId, centroId, trabajadorId } = contextoTrabajador();
  if (empresaId && centroId && trabajadorId) {
    void trabajadores
      .fetchTrabajadorById(empresaId, centroId, trabajadorId)
      .catch((error) => console.error('Error al recargar el trabajador:', error));
  }
};
const showSubscriptionModal = ref(false);
const showFinalizeModal = ref(false);
const isFinalizing = ref(false);
const showAnularModal = ref(false);
const showCuestionariosModal = ref(false);
const showProfessionalDataModal = ref(false);
const showInasistenciasModal = ref(false);
const showOrdenDocumentosModal = ref(false);
const showResultadosClinicosPanel = ref(false);
const selectedDocumentId = ref<string | null>(null);
const selectedDocumentName = ref<string>('');
const selectedDocumentType = ref<string | null>(null);
/** Si el documento a anular es el PDF de un formato firmado en pantalla, su formato. */
const selectedFormatoFirmadoId = ref<string | null>(null);

type SelectedClinicalDocument = {
  documentId: string;
  documentType: string;
  filePath: string;
};

const selectedDocuments = ref<SelectedClinicalDocument[]>([]);
/** Rutas derivadas (compatibilidad con paneles de eliminación). */
const selectedRoutes = computed(() =>
  selectedDocuments.value.map((d) => d.filePath),
);

const toggleDocumentSelection = (
  doc: SelectedClinicalDocument,
  isSelected: boolean,
) => {
  if (isSelected) {
    if (
      !selectedDocuments.value.some(
        (d) => d.documentId === doc.documentId && d.filePath === doc.filePath,
      )
    ) {
      selectedDocuments.value.push(doc);
    }
  } else {
    selectedDocuments.value = selectedDocuments.value.filter(
      (d) =>
        !(d.documentId === doc.documentId && d.filePath === doc.filePath),
    );
  }
};

const isDeletionMode = ref(false);
const historiasDelMes = ref<number | null>(null);
const lastFetchedTrabajadorId = ref('');

onMounted(async () => {
  const idProveedorSalud = userStore.user?.idProveedorSalud;
  if (idProveedorSalud) {
    await proveedorSaludStore.loadProveedorSalud(idProveedorSalud);

    historiasDelMes.value = await proveedorSaludStore.getHistoriasClinicasDelMes();
  } else {
    console.error("No se encontró idProveedorSalud en el usuario.");
  }
  
  // Cargar datos del firmante para validación
  await loadFirmanteData();

  if (userStore.user?._id && proveedorSaludStore.isSIRES) {
    await fetchBorradoresPendientes({ userId: userStore.user._id });
  }
});

const toggleDocumentoExternoModal = () => {
  executeIfCanManageDocumentosExternos(() => {
    if (!proveedorSaludStore.proveedorSalud) return;

    // Acceso comercial (prueba, suscripción, contrato con Ramazzini o restricción): una sola regla
    if (proveedorSaludStore.bloqueoComercial) {
      showSubscriptionModal.value = true;
      return;
    }

    showDocumentoExternoModal.value = !showDocumentoExternoModal.value;
  }, 'gestionar documentos externos');
};

const toggleFormatosFirmaModal = () => {
  showFormatosFirmaModal.value = !showFormatosFirmaModal.value;
};

const toggleDocumentoExternoUpdateModal = () => {
  executeIfCanManageDocumentosExternos(() => {
    if (!proveedorSaludStore.proveedorSalud) return;

    // Acceso comercial (prueba, suscripción, contrato con Ramazzini o restricción): una sola regla
    if (proveedorSaludStore.bloqueoComercial) {
      showSubscriptionModal.value = true;
      return;
    }

    showDocumentoExternoUpdateModal.value = !showDocumentoExternoUpdateModal.value;
  }, 'gestionar documentos externos');
};

const toggleCuestionariosModal = () => {
  if (!proveedorSaludStore.proveedorSalud) return;

  // Acceso comercial (prueba, suscripción, contrato con Ramazzini o restricción): una sola regla
  if (proveedorSaludStore.bloqueoComercial) {
    showSubscriptionModal.value = true;
    return;
  }

  showCuestionariosModal.value = !showCuestionariosModal.value;
};

const openInasistenciasModal = () => {
  showInasistenciasModal.value = true;
};

const solicitarEliminacionDocumento = (
  documentId: string,
  documentName: string,
  documentType: string,
  idFormatoPrueba: string | null = null,
) => {
  requestEliminacionLocal({
    entidad: 'documentoExpediente',
    identificacion: documentName,
    onConfirm: async () => {
      try {
        if (idFormatoPrueba) {
          // Firma de prueba: se elimina con su registro por la ruta de formatos firmados
          await FormatosFirmadosAPI.eliminarPrueba(trabajadores.currentTrabajadorId!, idFormatoPrueba);
        } else {
          await documentos.deleteDocumentById(
            documentType,
            trabajadores.currentTrabajadorId!,
            documentId,
          );
        }
        toast.open({ message: 'Documento eliminado exitosamente.' });
        await Promise.all([
          documentos.fetchAllDocuments(trabajadores.currentTrabajadorId!),
          resultadosClinicos.fetchResultadosAgrupados(trabajadores.currentTrabajadorId!),
        ]);
        invalidateExpedienteConteosForCurrentTrabajador();
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

const toggleFinalizeModal = (
  documentId: string | null = null,
  documentName: string = 'Sin nombre',
  documentType: string | null = null
) => {
  // Cerrar modal
  if (showFinalizeModal.value) {
    if (isFinalizing.value) return;
    showFinalizeModal.value = false;
    selectedDocumentId.value = null;
    selectedDocumentName.value = '';
    selectedDocumentType.value = null;
    return;
  }

  if (documentType && !puedeGestionarTipo(documentType)) {
    toast.open({
      message: getRestrictionMessage(documentType),
      type: 'error',
      position: 'top-right',
    });
    return;
  }

  showFinalizeModal.value = true;
  selectedDocumentId.value = documentId;
  selectedDocumentName.value = documentName;
  selectedDocumentType.value = documentType;
};

const toggleAnularModal = (
  documentId: string | null = null,
  documentName: string = 'Sin nombre',
  documentType: string | null = null,
  idFormatoFirmado: string | null = null
) => {
  if (showAnularModal.value) {
    showAnularModal.value = false;
    selectedDocumentId.value = null;
    selectedDocumentName.value = '';
    selectedDocumentType.value = null;
    selectedFormatoFirmadoId.value = null;
    return;
  }

  if (documentType && !puedeGestionarTipo(documentType)) {
    toast.open({
      message: getRestrictionMessage(documentType),
      type: 'error',
      position: 'top-right',
    });
    return;
  }

  if (!canAnularEliminarDocumentos.value) {
    toast.open({
      message: 'No tienes permiso para anular ni eliminar documentos.',
      type: 'error',
      position: 'top-right',
    });
    return;
  }

  showAnularModal.value = true;
  selectedDocumentId.value = documentId;
  selectedDocumentName.value = documentName;
  selectedDocumentType.value = documentType;
  selectedFormatoFirmadoId.value = idFormatoFirmado;
};

const handleAnularDocument = async (razonAnulacion: string) => {
  if (!selectedDocumentId.value || !selectedDocumentType.value || !razonAnulacion) return;

  try {
    // Un formato firmado en pantalla se anula junto con su PDF por su propia ruta
    if (selectedFormatoFirmadoId.value) {
      await FormatosFirmadosAPI.anular(
        trabajadores.currentTrabajadorId!,
        selectedFormatoFirmadoId.value,
        razonAnulacion
      );
    } else {
      await documentos.deleteDocumentById(
        selectedDocumentType.value,
        trabajadores.currentTrabajadorId!,
        selectedDocumentId.value,
        razonAnulacion
      );
    }

    toast.open({ message: "Documento anulado exitosamente." });

    toggleAnularModal();
    await documentos.fetchAllDocuments(trabajadores.currentTrabajadorId!);
    invalidateExpedienteConteosForCurrentTrabajador();
  } catch (error: any) {
    console.error("Error al anular el documento:", error);
    const message = error.response?.data?.message || "Error al anular el documento, por favor intente nuevamente.";
    toast.open({ message, type: "error" });
  }
};

const handleFinalizeDocument = async () => {
  if (isFinalizing.value) return;
  if (!selectedDocumentId.value || !selectedDocumentType.value) return;

  isFinalizing.value = true;
  try {
    await documentos.finalizarDocumento(
      selectedDocumentType.value,
      trabajadores.currentTrabajadorId!,
      selectedDocumentId.value
    );

    toast.open({ message: "Documento finalizado exitosamente." });

    showFinalizeModal.value = false;
    await documentos.fetchAllDocuments(trabajadores.currentTrabajadorId!);
    invalidateExpedienteConteosForCurrentTrabajador();

    if (selectedDocumentType.value === 'notaMedica' && proveedorSaludStore.isSIRES) {
      invalidateBorradoresNotaMedicaCache();
      if (userStore.user?._id) {
        await fetchBorradoresPendientes({
          userId: userStore.user._id,
          force: true,
        });
      }
    }
  } catch (error: any) {
    console.error("Error al finalizar el documento:", error);
    const message = error.response?.data?.message || "Error al finalizar el documento, por favor intente nuevamente.";
    toast.open({ message, type: "error" });
  } finally {
    isFinalizing.value = false;
  }
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
  eventoSeguimientoCardiometabolico: "Evento de Seguimiento Cardiometabólico",
  informeLongitudinalCardiometabolico: "Informe Longitudinal Cardiometabólico",
  informeLongitudinalAudiometrico: "Informe longitudinal de seguimiento audiométrico",
};

let vistaDesmontada = false;

const fetchData = async (force = false) => {
  const trabajadorId = String(route.params.idTrabajador ?? '');
  if (!trabajadorId) return;
  if (!force && trabajadorId === lastFetchedTrabajadorId.value) return;

  try {
    await documentos.fetchAllDocuments(trabajadorId);
    resultadosClinicos.fetchResultadosAgrupados(trabajadorId).catch((error) => {
      console.error('Error al cargar resultados clínicos:', error);
    });

    lastFetchedTrabajadorId.value = trabajadorId;
    // Si el usuario ya abrió un documento mientras cargaba la lista, no vaciar su formulario.
    if (!vistaDesmontada) formData.resetFormData();
  } catch (error) {
    console.error("Error al cargar datos:", error);
  }
};

/** Documentos externos recién subidos: se agregan a la lista sin recargar el expediente. */
function agregarDocumentosExternosSubidos(creados: any[]) {
  if (!documentos.agregarDocumentos('documentosExternos', creados)) fetchData(true);
}

function invalidateExpedienteConteosForCurrentTrabajador() {
  const id =
    trabajadores.currentTrabajadorId ??
    (route.params.idTrabajador ? String(route.params.idTrabajador) : '');
  if (id) invalidateExpedienteConteosCache(id);
}

const reducirMovimiento = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Espera (unos cuadros, hasta ~1.5 s) a que algo esté en pantalla. */
async function esperarA<T>(buscar: () => T | null | undefined, intentos = 30): Promise<T | null> {
  for (let i = 0; i < intentos; i += 1) {
    await nextTick();
    const encontrado = buscar();
    if (encontrado) return encontrado;
    await new Promise((resolver) => setTimeout(resolver, 50));
  }
  return null;
}

/** Espera a que termine el desplazamiento suave (o a lo más ~0.9 s si el navegador no avisa). */
function terminarDesplazamiento(): Promise<void> {
  return new Promise((resolver) => {
    let listo = false;
    const terminar = () => {
      if (listo) return;
      listo = true;
      window.removeEventListener('scrollend', terminar);
      resolver();
    };
    window.addEventListener('scrollend', terminar, { once: true });
    setTimeout(terminar, 900);
  });
}

/** Lleva la vista a un documento (montando los años si hace falta) y lo ilumina. */
async function irAlDocumentoGuardado(documentId: string): Promise<boolean> {
  const selector = `[data-documento="${CSS.escape(documentId)}"]`;
  if (!document.querySelector(selector)) montarTodosLosAnios.value = true;
  const fila = await esperarA(() => document.querySelector<HTMLElement>(selector));
  if (!fila) return false;
  const caja = fila.getBoundingClientRect();
  const yaSeVe = caja.top >= 0 && caja.bottom <= window.innerHeight;
  if (!yaSeVe) {
    const suave = !reducirMovimiento();
    fila.scrollIntoView({ block: 'center', behavior: suave ? 'smooth' : 'auto' });
    // Se ilumina al terminar de bajar, para que no se gaste mientras la pantalla se mueve
    if (suave) await terminarDesplazamiento();
  }
  resaltarDocumento(documentId);
  return true;
}

/**
 * Al volver al expediente del mismo trabajador (helpers/retornoExpediente.ts): si se guardó un
 * documento, se va a él; si no, se regresa a la posición anterior y se marca el que se abrió.
 */
async function aplicarRetorno(trabajadorId: string) {
  const retorno = tomarRetornoExpediente(trabajadorId);
  if (!retorno) return;
  if (retorno.documentoGuardado && (await irAlDocumentoGuardado(retorno.documentoGuardado))) return;
  if (retorno.scrollY) {
    const y = retorno.scrollY;
    await esperarA(() => document.documentElement.scrollHeight >= y + window.innerHeight || null);
    window.scrollTo({ top: y, behavior: 'auto' });
  }
  if (retorno.documentoAbierto) resaltarDocumento(retorno.documentoAbierto);
}

onMounted(async () => {
  await fetchData();
  const trabajadorId = String(route.params.idTrabajador ?? '');
  if (trabajadorId && !vistaDesmontada) aplicarRetorno(trabajadorId);
});

onBeforeUnmount(() => {
  // La dirección ya es la de la pantalla siguiente: se usa el trabajador que se tenía cargado
  anotarPosicionExpediente(lastFetchedTrabajadorId.value, window.scrollY);
  vistaDesmontada = true;
  invalidateExpedienteConteosForCurrentTrabajador();
  reiniciarNavegacionVisor();
});

// Por valor: cambiar solo la consulta (p. ej. el filtro por tipo) no debe recargar el expediente
watch(
  () => [route.params.idEmpresa, route.params.idCentroTrabajo, route.params.idTrabajador].join('/'),
  () => {
    reiniciarNavegacionVisor();
    fetchData();
    loadFirmanteData();
  }
);

// Solo lo del trabajador de la dirección: al cambiar de expediente no se muestran, ni por un
// momento, los documentos o resultados del anterior mientras llegan los nuevos
const idTrabajadorEnRuta = computed(() => String(route.params.idTrabajador ?? ''));
const documentosSonDelTrabajador = computed(
  () => documentos.documentosDeTrabajadorId === idTrabajadorEnRuta.value,
);
const documentosPorAnio = computed(() => (documentosSonDelTrabajador.value ? documentos.documentsByYear : {}));
const resultadosPorAnio = computed(() =>
  resultadosClinicos.resultadosDeTrabajadorId === idTrabajadorEnRuta.value ? resultadosClinicos.resultsByYear : {},
);
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

// ---- Filtro por tipo de documento (en la dirección: ?tipos=audiometria,historiaOtologica)
const TODOS_LOS_TIPOS = TIPOS_DOCUMENTO_EXPEDIENTE.map((t) => t.tipo);
const tiposDelExpediente = computed(() => tiposConConteo(documentosPorAnio.value as any));
const tiposFiltrados = computed(() =>
  tiposDeLaConsulta(route.query.tipos, tiposDelExpediente.value.map((t) => t.tipo)),
);
const hayFiltroDeTipos = computed(() => tiposFiltrados.value.length > 0);
const totalDocumentosExpediente = computed(() =>
  tiposDelExpediente.value.reduce((total, t) => total + t.cantidad, 0),
);
const totalDocumentosFiltrados = computed(() =>
  cantidadDeTipos(tiposDelExpediente.value, tiposFiltrados.value),
);
const aniosVisibles = computed(() =>
  hayFiltroDeTipos.value
    ? yearsWithRecords.value.filter((year) => anioTieneTipos((documentosPorAnio.value as any)?.[year], tiposFiltrados.value))
    : yearsWithRecords.value,
);

function aplicarFiltroDeTipos(tipos: string[]) {
  guardarFiltroDeSesion(String(route.params.idTrabajador ?? ''), tipos);
  router.replace({ query: { ...route.query, tipos: tiposAConsulta(tipos) } });
}
function alternarTipo(tipo: string) {
  const actuales = tiposFiltrados.value;
  aplicarFiltroDeTipos(actuales.includes(tipo) ? actuales.filter((t) => t !== tipo) : [...actuales, tipo]);
}
const verTodosLosTipos = () => aplicarFiltroDeTipos([]);

// Lista desplegable del filtro: solo si hay más de un tipo; se cierra con Esc o al hacer clic fuera
const puedeFiltrarTipos = computed(() => tiposDelExpediente.value.length > 1);
const tiposActivos = computed(() => tiposDelExpediente.value.filter((t) => tiposFiltrados.value.includes(t.tipo)));
const menuTiposAbierto = ref(false);
const filtroTiposRef = ref<HTMLElement | null>(null);
const cerrarMenuTipos = (evento: Event) => {
  if (!menuTiposAbierto.value) return;
  if (evento instanceof KeyboardEvent) {
    if (evento.key === 'Escape') menuTiposAbierto.value = false;
    return;
  }
  if (!filtroTiposRef.value?.contains(evento.target as Node)) menuTiposAbierto.value = false;
};
onMounted(() => {
  document.addEventListener('pointerdown', cerrarMenuTipos);
  document.addEventListener('keydown', cerrarMenuTipos);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', cerrarMenuTipos);
  document.removeEventListener('keydown', cerrarMenuTipos);
});

// Al volver de capturar un documento (sin parámetros) se recupera el filtro de este trabajador
watch(
  () => route.params.idTrabajador,
  (idTrabajador) => {
    if (route.query.tipos !== undefined) return;
    const guardado = leerFiltroDeSesion(String(idTrabajador ?? ''));
    const tipos = tiposDeLaConsulta(guardado, TODOS_LOS_TIPOS);
    if (tipos.length) router.replace({ query: { ...route.query, tipos: tiposAConsulta(tipos) } });
  },
  { immediate: true },
);

// Lo seleccionado que el filtro oculta deja de estar seleccionado (no se combina ni se elimina a ciegas)
watch(tiposFiltrados, (tipos) => {
  if (!tipos.length) return;
  selectedDocuments.value = selectedDocuments.value.filter((d) => tipos.includes(d.documentType));
});

// Función para verificar si hay resultados para un año específico
const tieneResultadosParaAnio = (year: string) => {
  const resultados = resultadosPorAnio.value?.[year];
  return resultados && Array.isArray(resultados) && resultados.length > 0;
};

const navigateTo = async (routeName: string, params: Record<string, unknown>) => {
  if (!proveedorSaludStore.proveedorSalud) return;

  // Acceso comercial (prueba, suscripción, contrato con Ramazzini o restricción): una sola regla
  if (proveedorSaludStore.bloqueoComercial) {
    showSubscriptionModal.value = true;
    return;
  }

  if (routeName === 'crear-documento' && params.tipoDocumento === 'historiaClinica') {
    // Conteo al momento, no el de cuando se abrió el expediente
    const { conteo, alcanzado } = await verificarLimiteHistoriasDelMes({
      idProveedor: proveedorSaludStore.proveedorSalud?._id,
      limite: proveedorSaludStore.limiteHistoriasEfectivo,
      conteoAnterior: historiasDelMes.value,
    });
    historiasDelMes.value = conteo;
    if (alcanzado) {
      showSubscriptionModal.value = true;
      return;
    }
  }

  if (routeName === 'crear-documento' && !canCreateDocument(params.tipoDocumento as string)) {
    toast.open({
      message: getRestrictionMessage(params.tipoDocumento as string),
      type: 'error',
    });
    return;
  }

  // Validar datos profesionales antes de crear cualquier documento
  if (routeName === 'crear-documento') {
    const professionalValidation = await ensureProfessionalDataReady();
    if (!professionalValidation.isValid) {
      showProfessionalDataModal.value = true;
      return;
    }
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

  // Si es crear-documento, usar navegación con consentimiento preventivo
  if (routeName === 'crear-documento' && trabajadores.currentTrabajadorId && trabajadores.currentTrabajador) {
    await navigateWithTreatmentConsent({
      trabajadorId: trabajadores.currentTrabajadorId,
      trabajadorNombre: formatNombreCompleto(trabajadores.currentTrabajador),
      to: {
        name: routeName,
        params: routeParams,
      },
    });
    documentos.setCurrentTypeOfDocument(params.tipoDocumento as string);
    documentos.currentDocument = null;
  } else {
    router.push({ name: routeName, params: routeParams });
    if (routeName === 'crear-documento') {
      documentos.setCurrentTypeOfDocument(params.tipoDocumento as string);
      documentos.currentDocument = null;
    }
  }
};

const documentImmutabilityEnabled = computed(() => proveedorSaludStore.documentImmutabilityEnabled);
const controlPrenatalEnabled = computed(() => proveedorSaludStore.controlPrenatalEnabled);

const clasificarSeleccion = () =>
    clasificarSeleccionParaEliminar(documentos.documentsByYear, selectedDocuments.value, {
        controlPrenatalEnabled: controlPrenatalEnabled.value,
        documentImmutabilityEnabled: documentImmutabilityEnabled.value,
    });

const toggleDeletionMode = () => {
    isDeletionMode.value = !isDeletionMode.value;
    // Al activar modo eliminación, quitar de la selección los documentos inmutables
    if (isDeletionMode.value && documentImmutabilityEnabled.value) {
        const { inmutables } = clasificarSeleccion();
        if (inmutables.length > 0) {
            selectedDocuments.value = selectedDocuments.value.filter(
              (d) => !inmutables.some(
                (i) => i.documentId === d.documentId && i.documentType === d.documentType,
              ),
            );
        }
    }
};

const abrirResultadosClinicosPanel = () => {
  if (!canManageResultadosClinicos.value) return;
  showResultadosClinicosPanel.value = true;
};

const handleEditResultado = (resultado: any) => {
  if (!canManageResultadosClinicos.value) return;
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

/** Documentos que se eliminan a la vez. */
const ELIMINACIONES_SIMULTANEAS = 3;
/** Por documento: 'eliminando' mientras se borra, 'error' si no se pudo (sigue en la lista). */
const estadoEliminacion = ref<Record<string, 'eliminando' | 'error'>>({});
/** Avance del borrado en curso, para el panel de eliminación; null si no hay uno. */
const progresoEliminacion = ref<{ hechos: number; total: number } | null>(null);

watch(isDeletionMode, (activo) => {
    if (!activo && !progresoEliminacion.value) estadoEliminacion.value = {};
});

/**
 * Elimina lo seleccionado de 3 en 3. Cada documento sale de la lista en cuanto se borra; los que
 * fallan se quedan marcados y seleccionados para reintentar. La recarga del expediente es solo
 * una confirmación en segundo plano.
 */
const handleDeleteSelected = async () => {
    if (selectedDocuments.value.length === 0 || progresoEliminacion.value) return;
    const trabajadorId = trabajadores.currentTrabajadorId!;

    try {
        // Localizar cada documento seleccionado por tipo e id (excluyendo FINALIZADO/ANULADO)
        const { eliminables, inmutables, noLocalizados } = clasificarSeleccion();
        const documentosAEliminar: Array<{id: string, tipo: string}> =
            eliminables.map((d) => ({ id: d.documentId, tipo: d.documentType }));

        const excluidosPorInmutables = inmutables.length + noLocalizados.length;
        if (excluidosPorInmutables > 0) {
            toast.open({
                message: `${excluidosPorInmutables} documento${excluidosPorInmutables !== 1 ? 's' : ''} no se pueden eliminar por estar finalizados o anulados.`,
                type: "warning"
            });
        }

        if (documentosAEliminar.length === 0) return;

        const eliminacionesExitosas: Array<{id: string, tipo: string}> = [];
        const eliminacionesFallidas: Array<{id: string, tipo: string}> = [];
        progresoEliminacion.value = { hechos: 0, total: documentosAEliminar.length };
        estadoEliminacion.value = Object.fromEntries(documentosAEliminar.map((d) => [d.id, 'eliminando' as const]));

        await procesarConLimite(documentosAEliminar, ELIMINACIONES_SIMULTANEAS, async (documento) => {
            try {
                await documentos.deleteDocumentById(documento.tipo, trabajadorId, documento.id);
                eliminacionesExitosas.push(documento);
                // Sale de la lista y de la selección en cuanto se borra
                delete estadoEliminacion.value[documento.id];
                documentos.quitarDocumento(documento.id);
                selectedDocuments.value = selectedDocuments.value.filter((d) => d.documentId !== documento.id);
            } catch (error) {
                console.error(`❌ Error al eliminar documento ${documento.id}:`, error);
                eliminacionesFallidas.push(documento);
                estadoEliminacion.value[documento.id] = 'error';
            } finally {
                if (progresoEliminacion.value) progresoEliminacion.value.hechos += 1;
            }
        });
        
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
        
        // Si todo salió bien se cierra el modo eliminación; si no, quedan los que fallaron para reintentar
        if (eliminacionesFallidas.length === 0) {
            selectedDocuments.value = [];
            isDeletionMode.value = false;
        }

        // La lista ya está al día; la recarga solo confirma (y actualiza resultados clínicos)
        if (eliminacionesExitosas.length > 0) {
            Promise.all([
              documentos.fetchAllDocuments(trabajadorId),
              resultadosClinicos.fetchResultadosAgrupados(trabajadorId)
            ])
              .then(() => invalidateExpedienteConteosForCurrentTrabajador())
              .catch((error) => console.error('Error al recargar tras eliminar:', error));
        }

    } catch (error) {
        console.error('Error al eliminar documentos:', error);
        toast.open({ 
            message: "Error al eliminar los documentos. Por favor, inténtalo de nuevo.", 
            type: "error" 
        });
    } finally {
        progresoEliminacion.value = null;
        if (!isDeletionMode.value) estadoEliminacion.value = {};
    }
};

const expedienteHeaderLoading = computed(() => {
  const idTrabajador = String(route.params.idTrabajador ?? '');
  if (!idTrabajador) return false;

  if (trabajadores.loadingOnSidebar) return true;

  const trabajadorId = String(trabajadores.currentTrabajadorId ?? '');
  const trabajador = trabajadores.currentTrabajador;

  return !trabajador || trabajadorId !== idTrabajador;
});

// Pestaña: «P.G.J. · Expediente». Solo iniciales (el título queda en el historial del navegador)
useTituloPagina(() => [
  expedienteHeaderLoading.value ? null : inicialesTrabajador(trabajadores.currentTrabajador),
  'Expediente',
]);

const logotipoPendiente = computed(() => proveedorSaludStore.logotipoPendiente);

// Computed para el total de documentos creados (sin documentos externos)
const totalDocumentosCreados = computed(() => {
  if (!documentosPorAnio.value) return 0;
  return Object.values(documentosPorAnio.value).reduce((total, yearData) => {
    return total + (
      (yearData.notasAclaratorias?.length || 0) +
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
      (controlPrenatalEnabled.value ? (yearData.controlPrenatal?.length || 0) : 0) +
      (yearData.historiaOtologica?.length || 0) +
      (yearData.previoEspirometria?.length || 0) +
      (yearData.entrevistasPsicologicas?.length || 0) +
      (yearData.trastornosEstadoAnimo?.length || 0) +
      (yearData.cuestionarioProdromalBreve?.length || 0) +
      (yearData.trastornoLimitePersonalidad?.length || 0) +
      (yearData.cuestionarioNordico?.length || 0) +
      (yearData.evaluacionSuenoVigilia?.length || 0) +
      (yearData.eventoSeguimientoCardiometabolico?.length || 0) + 
      (yearData.informeLongitudinalCardiometabolico?.length || 0) +
      (yearData.informeLongitudinalAudiometrico?.length || 0)
    );
  }, 0);
});

// Computed para el total de documentos externos
const totalDocumentosExternos = computed(() => {
  if (!documentosPorAnio.value) return 0;
  return Object.values(documentosPorAnio.value).reduce((total, yearData) => {
    return total + (yearData.documentosExternos?.length || 0);
  }, 0);
});

// Datos del trabajador en una sola línea del encabezado
const datosTrabajador = computed(() => {
  const t = trabajadores.currentTrabajador;
  if (!t) return [];
  const antiguedad = calcularAntiguedad(t.fechaIngreso);
  return [
    t.sexo ? { titulo: 'Sexo', texto: t.sexo, icono: t.sexo === 'Masculino' ? 'fas fa-mars text-sky-600' : t.sexo === 'Femenino' ? 'fas fa-venus text-rose-600' : 'fas fa-venus-mars text-violet-600' } : null,
    t.fechaNacimiento ? { titulo: 'Edad', texto: `${calcularEdad(t.fechaNacimiento)} años`, icono: 'fas fa-birthday-cake text-emerald-500' } : null,
    t.puesto ? { titulo: 'Puesto', texto: t.puesto, icono: 'fas fa-briefcase text-blue-500' } : null,
    antiguedad && antiguedad !== '-' ? { titulo: 'Antigüedad', texto: `${antiguedad} de antigüedad`, icono: 'fas fa-clock text-cyan-500' } : null,
    t.numeroEmpleado ? { titulo: 'Número de empleado', texto: `No. ${t.numeroEmpleado}`, icono: 'fas fa-id-badge text-purple-500' } : null,
  ].filter((dato): dato is { titulo: string; texto: string; icono: string } => dato !== null);
});

// Documentos que se crean directo desde el expediente (el resto está en "Más documentos")
const tiposDocumentoCrear = [
  { tipo: 'historiaClinica', nombre: 'Historia Clínica', descripcion: 'Entrevista médica', icono: 'fas fa-notes-medical' },
  { tipo: 'exploracionFisica', nombre: 'Exploración Física', descripcion: 'Aparatos y sistemas', icono: 'fa-solid fa-person' },
  { tipo: 'examenVista', nombre: 'Examen Vista', descripcion: 'Agudeza visual y colores', icono: 'fas fa-eye' },
  { tipo: 'audiometria', nombre: 'Audiometría', descripcion: 'Audición', icono: 'fas fa-volume-up' },
  { tipo: 'aptitud', nombre: 'Aptitud', descripcion: 'Evaluación laboral', icono: 'fas fa-user-check' },
  { tipo: 'certificado', nombre: 'Certificado', descripcion: 'Certificación médica', icono: 'fas fa-certificate' },
  { tipo: 'antidoping', nombre: 'Antidoping', descripcion: 'Prueba de sustancias', icono: 'fas fa-flask' },
  { tipo: 'notaMedica', nombre: 'Nota Médica', descripcion: 'Consultas', icono: 'fas fa-stethoscope' },
];

// Contadores de la fila "Registrar": dicen qué hay capturado sin abrir cada ventana
// Incapacidades: módulo encendido, empresa elegida (incluye México) y el permiso de riesgos de trabajo
const incapacidadesStore = useIncapacidadesStore();
const incapacidadesDisponibles = computed(
  () =>
    incapacidadesStore.gestionaEnEmpresa(route.params.idEmpresa ?? empresas.currentEmpresaId) &&
    canAccessRiesgosTrabajo.value &&
    (!INCAPACIDADES_SOLO_ADMINISTRADOR || userStore.user?.role === 'Administrador'),
);
const showIncapacidadesModal = ref(false);
const casosDeIncapacidad = ref<CasoConIncapacidades[]>([]);
const incapacitadoHoy = computed(() => casosDeIncapacidad.value.some((c) => c.incapacitadoHoy));

watch(
  [() => trabajadores.currentTrabajadorId, incapacidadesDisponibles],
  async ([idTrabajador, disponibles]) => {
    casosDeIncapacidad.value = [];
    if (!idTrabajador || !disponibles) return;
    try {
      const { data } = await IncapacidadesAPI.getCasos(String(idTrabajador));
      // Si mientras tanto se cambió de trabajador, este resultado ya no aplica
      if (String(trabajadores.currentTrabajadorId) === String(idTrabajador)) {
        casosDeIncapacidad.value = data;
      }
    } catch {
      // El contador es informativo: sin él, el botón sigue abriendo la ventana
    }
  },
  { immediate: true },
);

const totalAgentesRiesgo = computed(
  () => trabajadores.currentTrabajador?.agentesRiesgoActuales?.length ?? 0,
);

const totalResultadosClinicos = computed(() =>
  Object.values(resultadosPorAnio.value || {}).reduce(
    (total, resultados) => total + (Array.isArray(resultados) ? resultados.length : 0),
    0,
  ),
);

const crearDocumento = (tipoDocumento: string) =>
  navigateTo('crear-documento', {
    idEmpresa: empresas.currentEmpresaId,
    idTrabajador: trabajadores.currentTrabajadorId,
    tipoDocumento,
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

      <Transition
        appear
        name="modal-work"
        :duration="{ enter: 230, leave: 150 }"
      >
        <ModalCargaDocumentoExterno v-if="showDocumentoExternoModal"
          @closeDocumentoExternoModal="toggleDocumentoExternoModal" @updateData="() => fetchData(true)"
          @documentosSubidos="agregarDocumentosExternosSubidos" />
      </Transition>

      <Transition
        appear
        name="modal-work"
        :duration="{ enter: 230, leave: 150 }"
      >
        <ModalRiesgos v-if="showRiesgosModal" @closeModal="showRiesgosModal = false" />
      </Transition>

      <Transition
        appear
        name="modal-work"
        :duration="{ enter: 230, leave: 150 }"
      >
        <ModalIncapacidades
          v-if="showIncapacidadesModal"
          @closeModal="showIncapacidadesModal = false"
          @cambio="casosDeIncapacidad = $event"
          @documentos="() => fetchData(true)"
        />
      </Transition>

      <Transition
        appear
        name="modal-work"
        :duration="{ enter: 230, leave: 150 }"
      >
        <ModalTrabajadores
          v-if="showTrabajadorModal"
          @closeModal="cerrarEdicionTrabajador"
          @openSubscriptionModal="showSubscriptionModal = true"
        />
      </Transition>

      <Transition
        appear
        name="modal-work"
        :duration="{ enter: 230, leave: 150 }"
      >
        <ModalFormatosParaFirma
          v-if="showFormatosFirmaModal"
          :trabajador="trabajadores.currentTrabajador ?? null"
          @closeModal="toggleFormatosFirmaModal"
          @firmado="(doc) => agregarDocumentosExternosSubidos([doc])"
        />
      </Transition>

      <Transition
        appear
        name="modal-work"
        :duration="{ enter: 230, leave: 150 }"
      >
        <ModalUpdateDocumentoExterno v-if="showDocumentoExternoUpdateModal"
          @closeModalUpdate="toggleDocumentoExternoUpdateModal" 
          @updateData="() => fetchData(true)"
          @abrirResultados="abrirResultadosClinicosPanel"
        />
      </Transition>

      <Transition appear name="fade">
        <ModalFinalizarDocumento v-if="showFinalizeModal && selectedDocumentId && selectedDocumentType" 
          :documentId="selectedDocumentId"
          :documentType="selectedDocumentType"
          :trabajadorId="trabajadores.currentTrabajadorId!"
          :documentLabel="selectedDocumentName"
          :confirming="isFinalizing"
          @closeModal="toggleFinalizeModal" 
          @confirmFinalize="handleFinalizeDocument" 
        />
      </Transition>

      <Transition appear name="fade">
        <ModalAnularDocumento v-if="showAnularModal && selectedDocumentId && selectedDocumentType"
          :documentId="selectedDocumentId"
          :documentType="selectedDocumentType"
          :trabajadorId="trabajadores.currentTrabajadorId!"
          :documentLabel="selectedDocumentName"
          @closeModal="toggleAnularModal"
          @confirmAnular="handleAnularDocument"
        />
      </Transition>

      <Transition
        appear
        name="modal-work"
        :duration="{ enter: 230, leave: 150 }"
      >
        <ModalCuestionarios
          v-if="showCuestionariosModal"
          @closeModal="toggleCuestionariosModal"
          @openInasistencias="openInasistenciasModal"
        />
      </Transition>

      <ModalInasistenciasCardiometabolicas
        :visible="showInasistenciasModal && !!trabajadores.currentTrabajadorId"
        :trabajador-id="trabajadores.currentTrabajadorId ?? null"
        @close="showInasistenciasModal = false"
      />

      <ModalOrdenDocumentos
        :visible="showOrdenDocumentosModal"
        @close="showOrdenDocumentosModal = false"
      />

      <Transition appear name="fade">
        <ModalDatosProfesionales 
          v-if="showProfessionalDataModal" 
          :missingFields="validationResult.missingFields"
          :routeName="validationResult.routeName"
          :firmanteTypeLabel="validationResult.firmanteTypeLabel"
          @closeModal="showProfessionalDataModal = false"
          @navigateToConfig="showProfessionalDataModal = false"
        />
      </Transition>

      <Transition appear name="fade">
        <TreatmentConsentModal
          v-if="showConsentModal"
          :trabajadorId="modalTrabajadorId"
          :trabajadorNombre="modalTrabajadorNombre"
          :open="showConsentModal"
          @registered="handleConsentRegistered"
          @cancel="handleConsentCancel"
        />
      </Transition>

      <Teleport to="body">
        <Transition
          appear
          name="modal-work"
          :duration="{ enter: 230, leave: 150 }"
        >
          <ModalEliminacion
            v-if="eliminacionOpen"
            disable-transition
            :is-visible="eliminacionOpen"
            :nivel="eliminacionNivel"
            :tipo-registro="eliminacionTipoRegistro"
            :identificacion="eliminacionIdentificacion"
            :texto-confirmacion-esperado="eliminacionTextoConfirmacion"
            :detalle-contexto="eliminacionDetalleContexto"
            :mensaje-personalizado="eliminacionMensajePersonalizado"
            :audit-resource-type="eliminacionAuditResourceType"
            :audit-resource-id="eliminacionAuditResourceId"
            :is-confirming="eliminacionConfirming"
            @confirm="confirmarEliminacion"
            @cancel="cancelarEliminacion"
          />
        </Transition>
      </Teleport>

      <ResultadosClinicosPanel 
        v-if="trabajadores.currentTrabajadorId" 
        :isOpen="showResultadosClinicosPanel"
        :trabajadorId="trabajadores.currentTrabajadorId"
        @close="handleCloseResultadosPanel"
      />

        <!-- Header principal con información del trabajador -->
        <div class="expediente-trabajador-header mb-3 rounded-xl border border-gray-200 bg-white">
          <div class="expediente-trabajador-header__body px-4 py-3 sm:px-5">
            <ExpedienteHeaderSkeleton v-if="expedienteHeaderLoading" />
            <div
              v-else-if="trabajadores.currentTrabajador"
              class="flex min-w-0 items-center gap-3 sm:gap-4"
            >
              <!-- Logo de la empresa o placeholder -->
              <img
                v-if="empresas.currentEmpresa?.logotipoEmpresa?.data"
                :src="'/uploads/logos/' + empresas.currentEmpresa.logotipoEmpresa.data + '?t=' + empresas.currentEmpresa.updatedAt"
                :alt="'Logo de ' + empresas.currentEmpresa?.nombreComercial"
                class="expediente-trabajador-logo h-12 w-12 shrink-0 rounded-lg object-contain"
              />
              <div v-else class="expediente-trabajador-logo flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                <i class="fas fa-building text-lg text-emerald-600"></i>
              </div>

              <!-- Datos del trabajador -->
              <div class="min-w-0 flex-1">
                <div class="flex min-w-0 items-center gap-2">
                  <h1 class="expediente-trabajador-name min-w-0 truncate text-lg font-semibold text-gray-900 sm:text-xl">
                    {{ formatNombreCompleto(trabajadores.currentTrabajador) }}
                  </h1>
                  <button
                    type="button"
                    class="btn-editar-entidad inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 transition-colors duration-150"
                    :class="canManageTrabajadores
                      ? 'hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700'
                      : 'cursor-not-allowed opacity-50'"
                    :disabled="!canManageTrabajadores"
                    :title="canManageTrabajadores ? 'Editar datos del trabajador' : 'No tienes permisos para editar trabajadores'"
                    :aria-label="'Editar datos del trabajador'"
                    @click="abrirEdicionTrabajador"
                  >
                    <i class="fas fa-pen text-[10px]" aria-hidden="true"></i>
                    <span class="hidden sm:inline">Editar</span>
                  </button>
                </div>
                <p class="expediente-trabajador-meta mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-gray-600">
                  <span
                    v-for="dato in datosTrabajador"
                    :key="dato.titulo"
                    :title="dato.titulo"
                    class="inline-flex items-center gap-1.5"
                  >
                    <i :class="dato.icono" class="text-xs" aria-hidden="true"></i>
                    {{ dato.texto }}
                  </span>
                </p>
              </div>

              <!-- Conteo de documentos -->
              <p class="hidden shrink-0 text-sm text-gray-500 md:block">
                {{ totalDocumentosCreados }} {{ totalDocumentosCreados === 1 ? 'documento' : 'documentos' }}
                <span class="text-gray-300" aria-hidden="true">·</span>
                {{ totalDocumentosExternos }} {{ totalDocumentosExternos === 1 ? 'externo' : 'externos' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Aviso de logotipo pendiente -->
        <Transition appear name="slide-down">
          <div v-if="logotipoPendiente" class="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
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

        <!-- Panel de acciones: crear documentos (lo frecuente) y registrar datos del trabajador -->
        <div class="expediente-docs-panel mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3 sm:px-5">
          <div class="expediente-docs-row">
            <span class="expediente-docs-label">Crear</span>
            <div class="expediente-docs-row__botones">
              <button
                v-for="tipo in tiposDocumentoCrear"
                :key="tipo.tipo"
                type="button"
                :title="tipo.descripcion"
                class="expediente-crear-btn"
                @click="crearDocumento(tipo.tipo)"
              >
                <i :class="tipo.icono" aria-hidden="true"></i>
                {{ tipo.nombre }}
              </button>
              <button
                type="button"
                class="expediente-crear-btn expediente-crear-btn--mas"
                title="Cuestionarios, receta, constancias y el resto de los documentos que se pueden crear"
                @click="toggleCuestionariosModal"
              >
                <i class="fas fa-file-alt" aria-hidden="true"></i>
                Más documentos
                <i class="fas fa-chevron-down expediente-crear-btn__flecha" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          <div class="expediente-docs-row expediente-docs-row--registrar">
            <span class="expediente-docs-label">Registrar</span>
            <div class="expediente-docs-row__botones">
              <button
                type="button"
                class="expediente-secondary-btn"
                title="Subir un documento elaborado fuera de Ramazzini"
                @click="toggleDocumentoExternoModal"
              >
                <i class="fa-solid fa-arrow-up-from-bracket" aria-hidden="true"></i>
                Documentos externos
                <span
                  class="expediente-contador"
                  :class="{ 'expediente-contador--vacio': totalDocumentosExternos === 0 }"
                  :title="totalDocumentosExternos === 1 ? '1 documento externo en el expediente' : totalDocumentosExternos + ' documentos externos en el expediente'"
                >{{ totalDocumentosExternos }}</span>
              </button>
              <button
                type="button"
                class="expediente-secondary-btn"
                title="Registrar a qué agentes de riesgo se expone el trabajador"
                @click="showRiesgosModal = true"
              >
                <i class="fa-solid fa-exclamation-triangle" aria-hidden="true"></i>
                Agentes de riesgo
                <span
                  class="expediente-contador"
                  :class="{ 'expediente-contador--vacio': totalAgentesRiesgo === 0 }"
                  :title="totalAgentesRiesgo === 1 ? '1 agente registrado' : totalAgentesRiesgo + ' agentes registrados'"
                >{{ totalAgentesRiesgo }}</span>
              </button>
              <button
                v-if="incapacidadesDisponibles"
                type="button"
                class="expediente-secondary-btn"
                :title="incapacitadoHoy
                  ? 'El trabajador está incapacitado hoy'
                  : 'Registrar certificados del IMSS y descansos otorgados por la empresa'"
                @click="showIncapacidadesModal = true"
              >
                <i class="fas fa-bed" aria-hidden="true"></i>
                Incapacidades
                <span
                  class="expediente-contador"
                  :class="{
                    'expediente-contador--vacio': casosDeIncapacidad.length === 0,
                    'expediente-contador--alerta': incapacitadoHoy,
                  }"
                  :title="casosDeIncapacidad.length === 1 ? '1 caso registrado' : casosDeIncapacidad.length + ' casos registrados'"
                >{{ casosDeIncapacidad.length }}</span>
              </button>
              <button
                v-if="canManageResultadosClinicos"
                type="button"
                class="expediente-secondary-btn"
                title="Registrar resultados de estudios: espirometría, EKG, rayos X, laboratorio y otros"
                @click="abrirResultadosClinicosPanel"
              >
                <i class="fas fa-clipboard-check" aria-hidden="true"></i>
                Resultados clínicos
                <span
                  class="expediente-contador"
                  :class="{ 'expediente-contador--vacio': totalResultadosClinicos === 0 }"
                  :title="totalResultadosClinicos === 1 ? '1 resultado registrado' : totalResultadosClinicos + ' resultados registrados'"
                >{{ totalResultadosClinicos }}</span>
              </button>

              <!-- Formatos que firma el trabajador: en papel o en pantalla. A la derecha -->
              <div class="expediente-formatos">
                <button
                  type="button"
                  class="expediente-accion-link"
                  title="Consentimiento, declaración de veracidad y consentimiento antidoping: descárgalos para firmar a mano o pide la firma en pantalla"
                  @click="toggleFormatosFirmaModal"
                >
                  <i class="fa-solid fa-signature" aria-hidden="true"></i>
                  Formatos para firma
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Contenido principal de documentos -->
        <div>
          <Transition appear mode="out-in" name="expediente-swap">
            <div
              v-if="documentos.loading && (!documentosSonDelTrabajador || !yearsWithRecords.length)"
              key="docs-loading"
              class="text-center py-20"
            >
              <div class="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4 animate-pulse">
                <i class="fas fa-spinner fa-spin text-2xl text-emerald-600"></i>
              </div>
              <h2 class="text-xl font-semibold text-gray-700 mb-2">Cargando documentos...</h2>
              <p class="text-gray-500">Obteniendo el historial médico del trabajador</p>
            </div>

            <div v-else key="docs-content">
              <Transition appear mode="out-in" name="slide-up">
                <div>
                  <!-- Una sola línea: filtro por tipo (botón con lista) y orden de los documentos -->
                  <div
                    v-if="yearsWithRecords.length && (puedeFiltrarTipos || canConfigurarOrdenDocumentos)"
                    class="expediente-filtro-tipos mb-1 flex flex-wrap items-center justify-end gap-x-3 gap-y-1"
                  >
                    <Transition name="resumen-filtro">
                    <div v-if="hayFiltroDeTipos" class="mr-auto flex flex-wrap items-center gap-1.5 text-xs text-gray-500" role="status">
                      <span>Mostrando {{ totalDocumentosFiltrados }} de {{ totalDocumentosExpediente }}:</span>
                      <TransitionGroup name="tipo-elegido">
                      <button
                        v-for="tipo in tiposActivos"
                        :key="tipo.tipo"
                        type="button"
                        class="expediente-filtro-tipos__elegido"
                        :title="`Quitar ${tipo.nombre} del filtro`"
                        @click="alternarTipo(tipo.tipo)"
                      >
                        {{ tipo.nombre }} <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                      </button>
                      </TransitionGroup>
                      <button type="button" class="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800" @click="verTodosLosTipos">Ver todos</button>
                    </div>
                    </Transition>

                    <!-- Los dos botones juntos, a la derecha (en móvil comparten renglón) -->
                    <div class="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-1 whitespace-nowrap">
                    <div v-if="puedeFiltrarTipos" ref="filtroTiposRef" class="relative">
                      <button
                        type="button"
                        class="expediente-accion-link"
                        :aria-expanded="menuTiposAbierto"
                        aria-haspopup="true"
                        title="Mostrar solo algunos tipos de documento"
                        @click="menuTiposAbierto = !menuTiposAbierto"
                      >
                        <i class="fa-solid fa-filter" aria-hidden="true"></i>
                        Filtrar<span class="hidden sm:inline"> por tipo</span><span v-if="hayFiltroDeTipos"> ({{ tiposFiltrados.length }})</span>
                        <i class="expediente-filtro-tipos__flecha fa-solid fa-chevron-down text-[10px]" :class="{ 'expediente-filtro-tipos__flecha--abierta': menuTiposAbierto }" aria-hidden="true"></i>
                      </button>
                      <!-- En celular: fondo atenuado detrás del panel; tocarlo cierra la lista -->
                      <Transition name="fondo-tipos">
                        <div
                          v-if="menuTiposAbierto"
                          class="fixed inset-0 z-40 bg-black/30 sm:hidden"
                          aria-hidden="true"
                          @click="menuTiposAbierto = false"
                        ></div>
                      </Transition>
                      <!-- En celular es un panel fijo abajo, a lo ancho; desde sm, una lista bajo el botón -->
                      <Transition name="lista-tipos">
                      <div
                        v-if="menuTiposAbierto"
                        class="expediente-filtro-tipos__lista fixed inset-x-3 bottom-3 z-50 max-h-[60vh] overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl sm:absolute sm:inset-auto sm:right-0 sm:z-30 sm:mt-1 sm:w-64 sm:max-h-80 sm:rounded-lg sm:shadow-lg"
                        role="group"
                        aria-label="Mostrar solo estos tipos de documento"
                      >
                        <div class="flex items-center justify-between border-b border-gray-200 px-4 py-2 sm:hidden">
                          <span class="text-sm font-semibold text-gray-800">Filtrar por tipo</span>
                          <button
                            type="button"
                            class="rounded-md px-2 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                            @click="menuTiposAbierto = false"
                          >
                            Listo
                          </button>
                        </div>
                        <label
                          v-for="tipo in tiposDelExpediente"
                          :key="tipo.tipo"
                          class="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 sm:px-3 sm:py-1.5"
                        >
                          <input
                            type="checkbox"
                            class="h-4 w-4 accent-emerald-600"
                            :checked="tiposFiltrados.includes(tipo.tipo)"
                            @change="alternarTipo(tipo.tipo)"
                          />
                          <span class="flex-1 truncate">{{ tipo.nombre }}</span>
                          <span class="text-xs text-gray-500">{{ tipo.cantidad }}</span>
                        </label>
                      </div>
                      </Transition>
                    </div>

                    <button
                      v-if="canConfigurarOrdenDocumentos"
                      type="button"
                      class="expediente-accion-link"
                      title="Elegir en qué orden aparecen los tipos de documento en todos los expedientes"
                      @click="showOrdenDocumentosModal = true"
                    >
                      <i class="fa-solid fa-arrow-down-short-wide" aria-hidden="true"></i>
                      Orden<span class="hidden sm:inline"> de los documentos</span>
                    </button>
                    </div>
                  </div>
                  <!-- Al filtrar, los años que sobran se desvanecen y los demás se deslizan a su lugar -->
                  <TransitionGroup v-if="yearsWithRecords.length" tag="div" name="anio-filtro" class="relative space-y-6">
                <div
                  v-for="(year, yearIndex) in aniosVisibles"
                  :key="`year-${year}-${resultadosPorAnio[year]?.length || 0}`"
                  class="space-y-4"
                >
                  <LazyMountWhenVisible :eager="yearIndex === 0 || montarTodosLosAnios">
                  <GrupoDocumentos
                    :documents="documentosPorAnio[year] || {}"
                    :year="String(year)"
                    :trabajador="trabajadores.currentTrabajador || {}"
                    @eliminarDocumento="solicitarEliminacionDocumento"
                    @abrirModalAnular="toggleAnularModal"
                    @abrirModalFinalizar="toggleFinalizeModal"
                    @abrirModalUpdate="toggleDocumentoExternoUpdateModal"
                    @openSubscriptionModal="showSubscriptionModal = true"
                    :toggleRouteSelection="toggleDocumentSelection"
                    :selectedRoutes="selectedRoutes"
                    :selectedDocuments="selectedDocuments"
                    :isDeletionMode="isDeletionMode"
                    :toggleDeletionMode="toggleDeletionMode"
                    :onDeleteSelected="handleDeleteSelected"
                    :tiposVisibles="tiposFiltrados"
                    :estadoEliminacion="estadoEliminacion"
                  >
                    <template #extraSection v-if="resultadosPorAnio[year]?.length > 0 && !hayFiltroDeTipos">
                      <ResultadosClinicosSubsection
                        :results="resultadosPorAnio[year] || []"
                        :canManage="canManageResultadosClinicos"
                        @edit="handleEditResultado"
                      />
                    </template>
                  </GrupoDocumentos>
                  </LazyMountWhenVisible>
                </div>
              </TransitionGroup>

              <div v-else class="expediente-empty text-center py-8">
                <div class="expediente-empty__hero inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full mb-6">
                  <i class="fas fa-folder-open text-6xl text-gray-400"></i>
                </div>
                <h2 class="expediente-empty__title text-2xl font-bold text-gray-900 mb-4">
                  Expediente médico vacío
                </h2>
                <p class="expediente-empty__lead text-gray-600 mb-8 max-w-2xl mx-auto">
                  Este trabajador aún no tiene documentos médicos registrados. 
                  Comienza creando una historia clínica para establecer el expediente médico.
                </p>
                
                <!-- Sugerencias de documentos -->
                <div class="expediente-empty__suggestions bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8 max-w-4xl mx-auto">
                  <h3 class="expediente-empty__suggestions-title text-lg font-semibold text-gray-800 mb-6 text-center">
                    ¿Por dónde empezar?
                  </h3>
                  <div class="expediente-empty__grid grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    <div class="expediente-empty__card text-center p-6 rounded-xl bg-teal-50 border border-teal-200">
                      <div class="expediente-empty__icon w-16 h-16 bg-teal-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-notes-medical text-white text-xl"></i>
                      </div>
                      <h4 class="font-semibold text-gray-900 mb-2">Historia Clínica</h4>
                      <p class="expediente-empty__card-text text-sm text-gray-600 mb-4">
                        Base fundamental del expediente médico
                      </p>
                      <button @click="navigateTo('crear-documento', {
                        idEmpresa: empresas.currentEmpresaId,
                        idTrabajador: trabajadores.currentTrabajadorId,
                        tipoDocumento: 'historiaClinica'
                      })" class="expediente-empty__cta w-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors">
                        Crear Historia Clínica
                      </button>
                    </div>
                    
                    <div class="expediente-empty__card text-center p-6 rounded-xl bg-red-50 border border-red-200">
                      <div class="expediente-empty__icon w-16 h-16 bg-red-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-flask text-white text-xl"></i>
                      </div>
                      <h4 class="font-semibold text-gray-900 mb-2">Antidoping</h4>
                      <p class="expediente-empty__card-text text-sm text-gray-600 mb-4">
                        Examen para detección de consumo de sustancias
                      </p>
                      <button @click="navigateTo('crear-documento', {
                        idEmpresa: empresas.currentEmpresaId,
                        idTrabajador: trabajadores.currentTrabajadorId,
                        tipoDocumento: 'antidoping'
                      })" class="expediente-empty__cta w-full bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors">
                        Crear Antidoping
                      </button>
                    </div>
                    
                    <div class="expediente-empty__card text-center p-6 rounded-xl bg-pink-50 border border-pink-200">
                      <div class="expediente-empty__icon w-16 h-16 bg-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-stethoscope text-white text-xl"></i>
                      </div>
                      <h4 class="font-semibold text-gray-900 mb-2">Nota Médica</h4>
                      <p class="expediente-empty__card-text text-sm text-gray-600 mb-4">
                        Consultas y evaluaciones médicas
                      </p>
                      <button @click="navigateTo('crear-documento', {
                        idEmpresa: empresas.currentEmpresaId,
                        idTrabajador: trabajadores.currentTrabajadorId,
                        tipoDocumento: 'notaMedica'
                      })" class="expediente-empty__cta w-full bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors">
                        Crear Nota Médica
                      </button>
                    </div>
                  </div>
                </div>
              </div>
                </div>
              </Transition>
            </div>
          </Transition>
        </div>

        <!-- Panel de botones deslizante -->
        <div class="relative flex justify-center md:justify-start">
          <SlidingButtonPanel v-if="!isDeletionMode" :selectedDocuments="selectedDocuments" />
          <DeletionButtonPanel 
            v-if="isDeletionMode" 
            :selectedRoutes="selectedRoutes" 
            :isDeletionMode="isDeletionMode"
            :progreso="progresoEliminacion"
            @deleteSelected="handleDeleteSelected"
          />
        </div>


    </div>
  </Transition>
</template>

<style scoped>
/* Transiciones del filtro por tipo: cortas para que se sientan fluidas sin hacer esperar */
.lista-tipos-enter-active { transition: opacity 120ms ease-out, transform 120ms ease-out; }
.lista-tipos-leave-active { transition: opacity 90ms ease-in, transform 90ms ease-in; }
.lista-tipos-enter-from,
.lista-tipos-leave-to { opacity: 0; transform: translateY(-4px); }
/* En celular el panel sube desde abajo */
@media (max-width: 639px) {
  .lista-tipos-enter-from,
  .lista-tipos-leave-to { transform: translateY(8px); }
}
.fondo-tipos-enter-active { transition: opacity 120ms ease-out; }
.fondo-tipos-leave-active { transition: opacity 90ms ease-in; }
.fondo-tipos-enter-from,
.fondo-tipos-leave-to { opacity: 0; }

.expediente-filtro-tipos__flecha { transition: transform 150ms ease-out; }
.expediente-filtro-tipos__flecha--abierta { transform: rotate(180deg); }

.tipo-elegido-enter-active,
.tipo-elegido-leave-active { transition: opacity 120ms ease-out, transform 120ms ease-out; }
.tipo-elegido-enter-from,
.tipo-elegido-leave-to { opacity: 0; transform: scale(0.85); }
.tipo-elegido-move { transition: transform 150ms ease-out; }

.resumen-filtro-enter-active,
.resumen-filtro-leave-active { transition: opacity 120ms ease-out; }
.resumen-filtro-enter-from,
.resumen-filtro-leave-to { opacity: 0; }

.anio-filtro-enter-active,
.anio-filtro-leave-active { transition: opacity 140ms ease-out; }
.anio-filtro-enter-from,
.anio-filtro-leave-to { opacity: 0; }
.anio-filtro-leave-active { position: absolute; left: 0; right: 0; }
.anio-filtro-move { transition: transform 160ms ease-out; }

@media (prefers-reduced-motion: reduce) {
  .lista-tipos-enter-active, .lista-tipos-leave-active,
  .fondo-tipos-enter-active, .fondo-tipos-leave-active,
  .expediente-filtro-tipos__flecha,
  .tipo-elegido-enter-active, .tipo-elegido-leave-active, .tipo-elegido-move,
  .resumen-filtro-enter-active, .resumen-filtro-leave-active,
  .anio-filtro-enter-active, .anio-filtro-leave-active, .anio-filtro-move { transition: none; }
}
/* Filtro por tipo: tipos elegidos como pastillas pequeñas con × para quitarlos */
.expediente-filtro-tipos__elegido {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid #a7f3d0;
  background-color: #ecfdf5;
  color: #047857;
  border-radius: 9999px;
  padding: 0 0.5rem;
  font-size: 0.75rem;
  line-height: 1.25rem;
  font-weight: 500;
  transition: transform 0.15s ease;
}
.expediente-filtro-tipos__elegido:hover {
  transform: scale(1.05);
}
.expediente-filtro-tipos__elegido:focus-visible {
  outline: 2px solid #10b981;
  outline-offset: 2px;
}
/* Animaciones para las transiciones */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Transición rápida: pantalla de carga ↔ contenido de documentos */
.expediente-swap-leave-active {
  transition: opacity 0.1s ease;
}

.expediente-swap-leave-to {
  opacity: 0;
}

.expediente-swap-enter-active {
  transition: opacity 0.1s ease;
}

.expediente-swap-enter-from {
  opacity: 0;
}

/* Misma velocidad que LayOut.vue / EmpresasView / CentrosTrabajoView */
.slide-up-enter-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-leave-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-30px);
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

/* Panel de acciones: dos filas con su etiqueta; los botones se alinean en columna */
.expediente-docs-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.expediente-docs-row--registrar {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
}

.expediente-docs-label {
  flex-shrink: 0;
  width: 4.5rem;
  padding-top: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
}

.expediente-docs-row__botones {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

/* Crear: lo que se hace todo el día, con el peso visual */
.expediente-crear-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #34d399;
  border-radius: 0.5rem;
  background-color: #ffffff;
  color: #1f2937;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.expediente-crear-btn i {
  width: 1rem;
  color: #059669;
  text-align: center;
}

.expediente-crear-btn:hover {
  border-color: #059669;
  background-color: #ecfdf5;
  color: #065f46;
}

/* Abre el menú con el resto de los documentos, no un formulario */
.expediente-crear-btn--mas {
  border-style: dashed;
}

.expediente-crear-btn .expediente-crear-btn__flecha {
  width: auto;
  font-size: 0.625rem;
}

/* Registrar: ocasional, más discreto */
.expediente-secondary-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background-color: #ffffff;
  color: #4b5563;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.expediente-secondary-btn i {
  color: #9ca3af;
  transition: color 0.15s ease;
}

.expediente-secondary-btn:hover {
  border-color: #6ee7b7;
  background-color: #ecfdf5;
  color: #047857;
}

.expediente-secondary-btn:hover i {
  color: #059669;
}

.expediente-contador {
  min-width: 1.25rem;
  padding: 0 0.375rem;
  border-radius: 9999px;
  background-color: #d1fae5;
  color: #065f46;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.25rem;
  text-align: center;
}

.expediente-contador--vacio {
  background-color: #f3f4f6;
  color: #6b7280;
}

/* Incapacitado hoy */
.expediente-contador--alerta {
  background-color: #fee2e2;
  color: #991b1b;
}

/* Descarga de un formato: enlace, no botón de registro */
.expediente-accion-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  padding: 0.5rem 0.25rem;
  color: #4b5563;
  font-size: 0.875rem;
  font-weight: 500;
  transition: color 0.15s ease;
}

.expediente-accion-link i {
  color: #9ca3af;
  transition: color 0.15s ease;
}

.expediente-accion-link:hover {
  color: #047857;
  text-decoration: underline;
}

.expediente-accion-link:hover i {
  color: #059669;
}

/* Formatos para firma: un solo bloque a la derecha; si no caben en un renglón, uno sobre otro */
.expediente-formatos {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  column-gap: 1rem;
  margin-left: auto;
}

.expediente-formatos .expediente-accion-link {
  margin-left: 0;
  /* Mismo ancho: apilados, los íconos y textos quedan alineados */
  min-width: 13rem;
}

@media (max-width: 479px) {
  .expediente-trabajador-header__body {
    padding: 0.75rem;
  }

  .expediente-trabajador-logo {
    width: 2.5rem;
    height: 2.5rem;
  }

  .expediente-trabajador-name {
    font-size: 1.05rem;
    line-height: 1.25;
    white-space: normal;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow-wrap: anywhere;
  }

  .expediente-trabajador-meta {
    font-size: 0.75rem;
    line-height: 1.35;
  }

  .expediente-docs-panel {
    padding: 0.75rem;
  }

  .expediente-docs-row {
    flex-direction: column;
    gap: 0.25rem;
  }

  .expediente-docs-label {
    width: auto;
    padding-top: 0;
  }

  .expediente-formatos {
    margin-left: 0;
    justify-content: flex-start;
  }

  .expediente-crear-btn,
  .expediente-secondary-btn {
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
  }

  .expediente-empty {
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
  }

  .expediente-empty__hero {
    width: 3.5rem;
    height: 3.5rem;
    margin-bottom: 0.75rem;
  }

  .expediente-empty__hero i {
    font-size: 1.75rem;
  }

  .expediente-empty__title {
    margin-bottom: 0.5rem;
    font-size: 1.15rem;
    line-height: 1.3;
  }

  .expediente-empty__lead {
    margin-bottom: 1rem;
    padding-inline: 0.25rem;
    font-size: 0.8rem;
    line-height: 1.4;
  }

  .expediente-empty__suggestions {
    padding: 0.75rem 0.65rem;
    margin-bottom: 0.75rem;
  }

  .expediente-empty__suggestions-title {
    margin-bottom: 0.75rem;
    font-size: 1rem;
  }

  .expediente-empty__grid {
    gap: 0.65rem;
  }

  .expediente-empty__card {
    padding: 0.75rem 0.7rem;
  }

  .expediente-empty__icon {
    width: 2.75rem;
    height: 2.75rem;
    margin-bottom: 0.5rem;
  }

  .expediente-empty__icon i {
    font-size: 1rem;
  }

  .expediente-empty__card-text {
    margin-bottom: 0.65rem;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .expediente-empty__cta {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    line-height: 1.3;
  }
}

/* Mejoras para los botones */
button:active {
  transform: scale(0.98);
}
</style>
