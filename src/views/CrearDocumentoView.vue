<script setup>
import { ref, computed, onMounted, onUnmounted, watchEffect, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useDocumentosStore } from '@/stores/documentos';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { useUserPermissions } from '@/composables/useUserPermissions';
import { useRegulatoryPolicy } from '@/composables/useRegulatoryPolicy';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { buildClinicalDirectoryPath } from '@/helpers/clinicalPath';
import FormStepper from '@/components/steps/FormStepper.vue';
import VisualizadorAntidoping from '@/components/steps/VisualizadorAntidoping.vue';
import VisualizadorAptitud from '@/components/steps/VisualizadorAptitud.vue';
import VisualizadorAudiometria from '@/components/steps/VisualizadorAudiometria.vue';
import VisualizadorCertificado from '@/components/steps/VisualizadorCertificado.vue';
import VisualizadorCertificadoExpedito from '@/components/steps/VisualizadorCertificadoExpedito.vue';
import VisualizadorExamenVista from '@/components/steps/VisualizadorExamenVista.vue';
import VisualizadorExploracionFisica from '@/components/steps/VisualizadorExploracionFisica.vue';
import VisualizadorHistoriaClinica from '@/components/steps/VisualizadorHistoriaClinica.vue';
import VisualizadorNotaMedica from '@/components/steps/VisualizadorNotaMedica.vue';
import VisualizadorNotaAclaratoria from '@/components/steps/VisualizadorNotaAclaratoria.vue';
import VisualizadorControlPrenatal from '@/components/steps/VisualizadorControlPrenatal.vue';
import VisualizadorHistoriaOtologica from '@/components/steps/VisualizadorHistoriaOtologica.vue';
import VisualizadorPrevioEspirometria from '@/components/steps/VisualizadorPrevioEspirometria.vue';
import VisualizadorReceta from '@/components/steps/VisualizadorReceta.vue';
import VisualizadorConstanciaAptitud from '@/components/steps/VisualizadorConstanciaAptitud.vue';
import VisualizadorEntrevistaPsicologica from '@/components/steps/VisualizadorEntrevistaPsicologica.vue';
import VisualizadorTrastornosEstadoAnimo from '@/components/steps/VisualizadorTrastornosEstadoAnimo.vue';
import VisualizadorCuestionarioProdromalBreve from '@/components/steps/VisualizadorCuestionarioProdromalBreve.vue';
import VisualizadorTrastornoLimitePersonalidad from '@/components/steps/VisualizadorTrastornoLimitePersonalidad.vue';
import VisualizadorEventoSeguimientoCardiometabolico from '@/components/steps/VisualizadorEventoSeguimientoCardiometabolico.vue';
import VisualizadorInformeLongitudinalCardiometabolico from '@/components/steps/VisualizadorInformeLongitudinalCardiometabolico.vue';
import VisualizadorInformeLongitudinalAudiometrico from '@/components/steps/VisualizadorInformeLongitudinalAudiometrico.vue';
import {
  ORIENTACION_SIN_HALLAZGO,
  CONCLUSION_SIN_HALLAZGOS,
} from '@/helpers/conclusionEntrevistaPsicologica';
import {
  construirRutaPdfNotaAclaratoria,
  inicializarNotaAclaratoriaNueva,
} from '@/helpers/notaAclaratoriaForm';
const route = useRoute();
const router = useRouter();
const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const documentos = useDocumentosStore();
const formData = useFormDataStore();
const steps = useStepsStore();
const proveedorSaludStore = useProveedorSaludStore();
const { ensureUserLoaded, getCurrentUserId } = useCurrentUser();
const { canCreateDocument, getRestrictionMessage } = useUserPermissions();
const { documentImmutabilityEnabled, controlPrenatalEnabled } = useRegulatoryPolicy();
const isFinalized = computed(() => documentos.isFinalized);
const disableEdit = computed(() => documentImmutabilityEnabled.value && isFinalized.value);

// Alinear el store con la ruta antes de montar hijos (p. ej. edición desde DocumentoItem sin navigateTo).
// Si no, el v-if puede montar primero el FormStepper de otro tipo y corromper pasos / pantalla «Completado».
const tipoDesdeRuta = route.params.tipoDocumento;
if (tipoDesdeRuta) {
  documentos.setCurrentTypeOfDocument(String(tipoDesdeRuta));
}

/**
 * Gate de los hijos: empresa, centro y trabajador deben estar resueltos antes de montar
 * `FormStepper` y los `Visualizador*`. Sus pasos (Step1) acceden a `currentEmpresa.nombreComercial`,
 * `currentCentroTrabajo.nombreCentro` y `currentTrabajador.nombre` en `onMounted`. Si no están, truenan.
 * Tras recargar, `setup` corre antes de los `fetch*ById` del `onMounted` del padre.
 *
 * ESC: además necesita `fetchAllDocuments` (exploraciones físicas en `documentsByYear`) para Step 2/3;
 * sin eso, al recargar CrearDocumentoView los datos de EF no existían hasta venir del expediente.
 *
 * Informe longitudinal CM: `fetchAllDocuments` para poblar eventos CM en `documentsByYear` (paso 1).
 * En edición, además esperar `fetchDocumentById` antes de montar hijos: si el visualizador
 * arranca con el formulario vacío (tras `resetFormData`) muestra «No hay suficientes datos…»
 * aunque el informe guardado sí tenga `eventosConcentrados`.
 */
const exploracionesEscListas = ref(
  String(route.params.tipoDocumento || '') !== 'eventoSeguimientoCardiometabolico',
);

const informeCmDocumentsListas = ref(
  String(route.params.tipoDocumento || '') !== 'informeLongitudinalCardiometabolico' &&
    String(route.params.tipoDocumento || '') !== 'informeLongitudinalAudiometrico',
);

const informeCmDocumentoHidratado = ref(
  (String(route.params.tipoDocumento || '') !== 'informeLongitudinalCardiometabolico' &&
    String(route.params.tipoDocumento || '') !== 'informeLongitudinalAudiometrico') ||
    !String(route.params.idDocumento || ''),
);

const datosListos = computed(() => {
  if (
    !empresas.currentEmpresa?.nombreComercial ||
    !centrosTrabajo.currentCentroTrabajo?.nombreCentro ||
    !trabajadores.currentTrabajador?.nombre
  ) {
    return false;
  }
  if (documentos.currentTypeOfDocument === 'eventoSeguimientoCardiometabolico') {
    return exploracionesEscListas.value;
  }
  if (
    documentos.currentTypeOfDocument === 'informeLongitudinalCardiometabolico' ||
    documentos.currentTypeOfDocument === 'informeLongitudinalAudiometrico'
  ) {
    return informeCmDocumentsListas.value && informeCmDocumentoHidratado.value;
  }
  return true;
});

const empresaId = ref('');
const centroTrabajoId = ref('');
const trabajadorId = ref('');
const documentoId = ref('');
const tipoDocumento = ref('');

const bootstrapNotaAclaratoriaSiCorresponde = () => {
  const tipo = String(tipoDocumento.value || '');
  if (tipo !== 'notaAclaratoria' || documentoId.value) return;

  const tieneOrigen =
    formData.formDataNotaAclaratoria.documentoOrigenTipo &&
    formData.formDataNotaAclaratoria.documentoOrigenId;
  const saltaPasos = !!route.query.skipToStep;
  if (!tieneOrigen && !saltaPasos) return;

  const empresa = empresas.currentEmpresa?.nombreComercial;
  const centro = centrosTrabajo.currentCentroTrabajo?.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador?.nombre;
  const tid = trabajadores.currentTrabajadorId;
  if (!empresa || !centro || !trabajadorNombre || !tid) return;

  inicializarNotaAclaratoriaNueva({
    form: formData.formDataNotaAclaratoria,
    trabajadorId: tid,
    rutaPDF: construirRutaPdfNotaAclaratoria(empresa, centro, trabajadorNombre, tid),
    userId: getCurrentUserId(),
    documentoOrigenTipo: formData.formDataNotaAclaratoria.documentoOrigenTipo,
    documentoOrigenId: formData.formDataNotaAclaratoria.documentoOrigenId,
  });
};

const inicializarDesdeRuta = () => {
  empresaId.value = String(route.params.idEmpresa);
  centroTrabajoId.value = String(route.params.idCentroTrabajo);
  trabajadorId.value = String(route.params.idTrabajador);
  documentoId.value = route.params.idDocumento;
  tipoDocumento.value = route.params.tipoDocumento;

  if (tipoDocumento.value) {
    documentos.setCurrentTypeOfDocument(String(tipoDocumento.value));
  }

  // Establecer los IDs en los stores
  empresas.currentEmpresaId = empresaId.value;
  centrosTrabajo.currentCentroTrabajoId = centroTrabajoId.value;
  trabajadores.currentTrabajadorId = trabajadorId.value;

  // Llamar las funciones de carga (sin await)
  empresas.fetchEmpresaById(empresaId.value);
  centrosTrabajo.fetchCentroTrabajoById(empresaId.value, centroTrabajoId.value);
  trabajadores.fetchTrabajadorById(empresaId.value, centroTrabajoId.value, trabajadorId.value);

  // Guardar snapshot de nota aclaratoria (FormStepper puede haber inicializado Step1/Step2 antes de navegar)
  const notaAclaratoriaPreexistente =
    String(route.params.tipoDocumento) === 'notaAclaratoria'
      ? { ...formData.formDataNotaAclaratoria }
      : null;

  // IMPORTANTE: Guardar query params ANTES de resetear
  const documentoOrigenTipoTemp = route.query.documentoOrigenTipo;
  const documentoOrigenIdTemp = route.query.documentoOrigenId;

  formData.resetFormData();

  // Detectar si se viene con un documento origen para nota aclaratoria
  if (tipoDocumento.value === 'notaAclaratoria') {
    if (notaAclaratoriaPreexistente?.documentoOrigenTipo && notaAclaratoriaPreexistente?.documentoOrigenId) {
      Object.assign(formData.formDataNotaAclaratoria, notaAclaratoriaPreexistente);
    } else if (documentoOrigenTipoTemp && documentoOrigenIdTemp) {
      formData.formDataNotaAclaratoria.documentoOrigenTipo = String(documentoOrigenTipoTemp);
      formData.formDataNotaAclaratoria.documentoOrigenId = String(documentoOrigenIdTemp);
    }
    bootstrapNotaAclaratoriaSiCorresponde();
  }

  const esInformeAgregador =
    String(tipoDocumento.value || '') === 'informeLongitudinalCardiometabolico' ||
    String(tipoDocumento.value || '') === 'informeLongitudinalAudiometrico';
  const editandoInformeCm = esInformeAgregador && !!String(documentoId.value || '');

  // Cargar documento si existe, o limpiar si es nuevo documento
  if (documentoId.value && tipoDocumento.value) {
    documentos.currentDocument = null;
    if (editandoInformeCm) {
      informeCmDocumentoHidratado.value = false;
    }
    documentos
      .fetchDocumentById(tipoDocumento.value, trabajadores.currentTrabajadorId, documentoId.value)
      .then(() => {
        if (documentos.currentDocument) {
          formData.setFormDataFromDocument(documentos.currentDocument, tipoDocumento.value);
        } else {
          console.error('No se encontraron datos para el documento especificado.');
        }
      })
      .catch((error) => {
        console.error('Error al cargar los datos del documento:', error);
        if (error.response?.status === 403) {
          toast.open({
            message: 'No tienes permiso para editar este documento o ya ha sido finalizado.',
            type: 'error',
          });
          router.back();
        }
      })
      .finally(() => {
        if (editandoInformeCm) {
          informeCmDocumentoHidratado.value = true;
        }
      });
  } else {
    documentos.currentDocument = null;
  }

  // Consultar altura disponible para control prenatal
  if (tipoDocumento.value === 'controlPrenatal') {
    formData.consultarAlturaDisponible(trabajadorId.value)
      .then(({ altura, fuente }) => {
        if (altura) {
          // console.log(`Altura obtenida de ${fuente}: ${altura}m para control prenatal`);
        }
      })
      .catch(error => console.log('No se pudo consultar altura disponible:', error));
  }

  // Verificar permisos de usuario para el tipo de documento
  if (tipoDocumento.value === 'controlPrenatal' && !controlPrenatalEnabled.value) {
    router.push({
      name: 'expediente-medico',
      params: {
        idEmpresa: empresaId.value,
        idCentroTrabajo: centroTrabajoId.value,
        idTrabajador: trabajadorId.value,
      },
    });
    return;
  }

  if (tipoDocumento.value && !canCreateDocument(tipoDocumento.value)) {
    console.warn(`Acceso no autorizado: ${tipoDocumento.value}`);
    router.push({
      name: 'expediente-medico',
      params: {
        idEmpresa: empresaId.value,
        idCentroTrabajo: centroTrabajoId.value,
        idTrabajador: trabajadorId.value,
      },
    });
    return;
  }

  if (
    String(tipoDocumento.value || '') === 'eventoSeguimientoCardiometabolico' &&
    trabajadores.currentTrabajadorId
  ) {
    exploracionesEscListas.value = false;
    documentos.fetchAllDocuments(trabajadores.currentTrabajadorId).finally(() => {
      exploracionesEscListas.value = true;
    });
  }

  if (
    (String(tipoDocumento.value || '') === 'informeLongitudinalCardiometabolico' ||
      String(tipoDocumento.value || '') === 'informeLongitudinalAudiometrico') &&
    trabajadores.currentTrabajadorId
  ) {
    informeCmDocumentsListas.value = false;
    documentos.fetchAllDocuments(trabajadores.currentTrabajadorId).finally(() => {
      informeCmDocumentsListas.value = true;
    });
  }
};

onMounted(() => {
  inicializarDesdeRuta();
});

watch(
  () => [
    route.params.tipoDocumento,
    route.params.idDocumento,
    route.query.documentoOrigenTipo,
    route.query.documentoOrigenId,
    route.query.skipToStep,
  ],
  () => {
    inicializarDesdeRuta();
  },
);

// Verificar cuando los datos se hayan cargado completamente
watchEffect(async () => {
  const tipoActual = String(route.params.tipoDocumento || '');
  const idDocActual = route.params.idDocumento;
  const empresa = empresas.currentEmpresa?.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo?.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador?.nombre;
  const trabajadorIdVal = trabajadores.currentTrabajadorId;

  if (empresa && centroTrabajo && trabajadorNombre && trabajadorIdVal && tipoActual) {
    // Obtener el ID del usuario actual
    const currentUserId = await ensureUserLoaded();
    
    if (!currentUserId) {
      console.error('No se pudo obtener el ID del usuario actual');
      return;
    }

    const rutaBase = `${buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorIdVal)}/`;

    const documentoMap = {
      antidoping: formData.formDataAntidoping,
      aptitud: formData.formDataAptitud,
      audiometria: formData.formDataAudiometria,
      certificado: formData.formDataCertificado,
      certificadoExpedito: formData.formDataCertificadoExpedito,
      'documento Externo': formData.formDataDocumentoExterno,
      examenVista: formData.formDataExamenVista,
      exploracionFisica: formData.formDataExploracionFisica,
      historiaClinica: formData.formDataHistoriaClinica,
      notaMedica: formData.formDataNotaMedica,
      notaAclaratoria: formData.formDataNotaAclaratoria,
      controlPrenatal: formData.formDataControlPrenatal,
      historiaOtologica: formData.formDataHistoriaOtologica,
      previoEspirometria: formData.formDataPrevioEspirometria,
      receta: formData.formDataReceta,
      constanciaAptitud: formData.formDataConstanciaAptitud,
      entrevistaPsicologica: formData.formDataEntrevistaPsicologica,
      trastornosEstadoAnimo: formData.formDataTrastornosEstadoAnimo,
      cuestionarioProdromalBreve: formData.formDataCuestionarioProdromalBreve,
      trastornoLimitePersonalidad: formData.formDataTrastornoLimitePersonalidad,
      eventoSeguimientoCardiometabolico: formData.formDataEventoSeguimientoCardiometabolico,
      informeLongitudinalCardiometabolico: formData.formDataInformeLongitudinalCardiometabolico,
      informeLongitudinalAudiometrico: formData.formDataInformeLongitudinalAudiometrico,
    };

    const documentoForm = documentoMap[tipoActual];

    if (documentoForm) {
      documentoForm.updatedBy = currentUserId;
      documentoForm.rutaPDF = rutaBase;
      if (!idDocActual) {
        documentoForm.createdBy = currentUserId;
      } else {
        // Al editar, conservar createdBy original como ID string (el backend devuelve objeto poblado)
        const existing = documentoForm.createdBy;
        documentoForm.createdBy = typeof existing === 'object' && existing?._id ? existing._id : existing;
      }

      if (tipoActual === 'notaAclaratoria' && !idDocActual && route.query.skipToStep) {
        inicializarNotaAclaratoriaNueva({
          form: documentoForm,
          trabajadorId: trabajadorIdVal,
          rutaPDF: construirRutaPdfNotaAclaratoria(empresa, centroTrabajo, trabajadorNombre, trabajadorIdVal),
          userId: currentUserId,
          documentoOrigenTipo: documentoForm.documentoOrigenTipo,
          documentoOrigenId: documentoForm.documentoOrigenId,
        });
      }
    } else {
      console.error(`Tipo de documento no reconocido: ${tipoActual}`);
    }
  }
});

onUnmounted(() => {
  formData.resetFormData();
});

const goToStep = (stepNumber) => {
  steps.goToStep(stepNumber);
};

// Entrevista Psicologica
const entrevistaPsicologicaSinHallazgos = () => {
  formData.formDataEntrevistaPsicologica.apariencia = 'Adecuada';
  formData.formDataEntrevistaPsicologica.actitudHaciaEvaluador = 'Colaboradora';
  formData.formDataEntrevistaPsicologica.nivelCooperacion = 'Alta';
  formData.formDataEntrevistaPsicologica.contactoVisual = 'Adecuado';
  formData.formDataEntrevistaPsicologica.conductaMotora = 'Normal';
  formData.formDataEntrevistaPsicologica.estadoAnimoPredominante = 'Eutímico (normal)';
  formData.formDataEntrevistaPsicologica.afecto = 'Adecuado';
  formData.formDataEntrevistaPsicologica.intensidadEmocional = 'Normal';
  formData.formDataEntrevistaPsicologica.cursoPensamiento = 'Normal';
  formData.formDataEntrevistaPsicologica.alteracionesPensamiento = 'No';
  formData.formDataEntrevistaPsicologica.descripcionAlteracionesPensamiento = 'Pensamiento lógico y coherente, sin alteraciones evidentes.';
  formData.formDataEntrevistaPsicologica.alteracionesPerceptuales = 'No';
  formData.formDataEntrevistaPsicologica.descripcionAlteracionesPerceptuales = 'Niega alteraciones perceptuales durante la entrevista.';
  formData.formDataEntrevistaPsicologica.orientacion = ORIENTACION_SIN_HALLAZGO;
  formData.formDataEntrevistaPsicologica.atencionConcentracion = 'Adecuada';
  formData.formDataEntrevistaPsicologica.memoria = 'Conservada';
  formData.formDataEntrevistaPsicologica.juicio = 'Conservado';
  formData.formDataEntrevistaPsicologica.concienciaEstado = 'Presente';
  formData.formDataEntrevistaPsicologica.relacionesInterpersonales = 'Adecuadas';
  formData.formDataEntrevistaPsicologica.desempenoLaboralAutorreporte = 'Adecuado';
  formData.formDataEntrevistaPsicologica.manejoEstres = 'Adecuado';
  formData.formDataEntrevistaPsicologica.ideacionSuicida = 'No';
  formData.formDataEntrevistaPsicologica.observacionesIdeacionSuicida = 'Niega ideación suicida actual o reciente.';
  formData.formDataEntrevistaPsicologica.conclusionClinica = CONCLUSION_SIN_HALLAZGOS;
};

/** Rellena sin hallazgos, va al paso 22 y avanza un paso más para mostrar «Completado» en el stepper */
const entrevistaPsicologicaSinHallazgosYCompletado = async () => {
  entrevistaPsicologicaSinHallazgos();
  goToStep(22);
  await nextTick();
  steps.nextStep();
};

// Trastornos Estado de Animo (MDQ)
const todoNegadoTrastornosEstadoAnimoYCompletado = async () => {
  formData.formDataTrastornosEstadoAnimo.p1ExaltadoComportamientoNoHabitualOMetidoProblemas = 'No';
  formData.formDataTrastornosEstadoAnimo.p1IrritableGritosPeleas = 'No';
  formData.formDataTrastornosEstadoAnimo.p1MasSeguridadQueLoHabitual = 'No';
  formData.formDataTrastornosEstadoAnimo.p1DormiaMenosSinNecesitarMasSueno = 'No';
  formData.formDataTrastornosEstadoAnimo.p1HablabaMasOMasRapido = 'No';
  formData.formDataTrastornosEstadoAnimo.p1PensamientosAgolpados = 'No';
  formData.formDataTrastornosEstadoAnimo.p1DistraccionDificultadConcentracion = 'No';
  formData.formDataTrastornosEstadoAnimo.p1MasEnergiaQueLoHabitual = 'No';
  formData.formDataTrastornosEstadoAnimo.p1MasActivoOMasCosasQueLoHabitual = 'No';
  formData.formDataTrastornosEstadoAnimo.p1MasSocialExtrovertido = 'No';
  formData.formDataTrastornosEstadoAnimo.p1MasApetitoSexual = 'No';
  formData.formDataTrastornosEstadoAnimo.p1CosasExageradasRiesgosas = 'No';
  formData.formDataTrastornosEstadoAnimo.p1GastoDineroProblemas = 'No';
  formData.formDataTrastornosEstadoAnimo.p2SituacionesMismoPeriodo = 'No';
  formData.formDataTrastornosEstadoAnimo.p3NivelProblemaCausado = 'Ningún problema';
  formData.formDataTrastornosEstadoAnimo.p4FamiliarDirectoBipolar = 'No';
  formData.formDataTrastornosEstadoAnimo.p5DiagnosticoProfesionalBipolar = 'No';

  goToStep(steps.steps.length);
  await nextTick();
  steps.nextStep();
};

// Cuestionario Prodromal Breve (PQ-B)
const todoNegadoCuestionarioProdromalBreveYCompletado = async () => {
  formData.formDataCuestionarioProdromalBreve.p1 = 'No';
  formData.formDataCuestionarioProdromalBreve.p2 = 'No';
  formData.formDataCuestionarioProdromalBreve.p3 = 'No';
  formData.formDataCuestionarioProdromalBreve.p4 = 'No';
  formData.formDataCuestionarioProdromalBreve.p5 = 'No';
  formData.formDataCuestionarioProdromalBreve.p6 = 'No';
  formData.formDataCuestionarioProdromalBreve.p7 = 'No';
  formData.formDataCuestionarioProdromalBreve.p8 = 'No';
  formData.formDataCuestionarioProdromalBreve.p9 = 'No';
  formData.formDataCuestionarioProdromalBreve.p10 = 'No';
  formData.formDataCuestionarioProdromalBreve.p11 = 'No';
  formData.formDataCuestionarioProdromalBreve.p12 = 'No';
  formData.formDataCuestionarioProdromalBreve.p13 = 'No';
  formData.formDataCuestionarioProdromalBreve.p14 = 'No';
  formData.formDataCuestionarioProdromalBreve.p15 = 'No';
  formData.formDataCuestionarioProdromalBreve.p16 = 'No';
  formData.formDataCuestionarioProdromalBreve.p17 = 'No';
  formData.formDataCuestionarioProdromalBreve.p18 = 'No';
  formData.formDataCuestionarioProdromalBreve.p19 = 'No';
  formData.formDataCuestionarioProdromalBreve.p20 = 'No';
  formData.formDataCuestionarioProdromalBreve.p21 = 'No';

  formData.formDataCuestionarioProdromalBreve.p1GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p2GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p3GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p4GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p5GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p6GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p7GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p8GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p9GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p10GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p11GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p12GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p13GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p14GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p15GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p16GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p17GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p18GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p19GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p20GradoAcuerdoStatement = undefined;
  formData.formDataCuestionarioProdromalBreve.p21GradoAcuerdoStatement = undefined;

  goToStep(steps.steps.length);
  await nextTick();
  steps.nextStep();
};

// Trastorno Limite de Personalidad (MSI-BPD)
const todoNegadoTrastornoLimitePersonalidadYCompletado = async () => {
  formData.formDataTrastornoLimitePersonalidad.relacionesCercanasDiscusionesRupturas = 'No';
  formData.formDataTrastornoLimitePersonalidad.autolesionIntentoSuicidio = 'No';
  formData.formDataTrastornoLimitePersonalidad.impulsividadOtrosDosProblemas = 'No';
  formData.formDataTrastornoLimitePersonalidad.extremadamenteMalHumor = 'No';
  formData.formDataTrastornoLimitePersonalidad.enojadoFrecuenteActuaEnojadoSarcastico = 'No';
  formData.formDataTrastornoLimitePersonalidad.desconfianzaOtrasPersonas = 'No';
  formData.formDataTrastornoLimitePersonalidad.sensacionIrrealidadEntornoIrreal = 'No';
  formData.formDataTrastornoLimitePersonalidad.vacioCronico = 'No';
  formData.formDataTrastornoLimitePersonalidad.faltaIdentidadQuienEs = 'No';
  formData.formDataTrastornoLimitePersonalidad.esfuerzosEvitarAbandono = 'No';

  goToStep(steps.steps.length);
  await nextTick();
  steps.nextStep();
};

</script>

<template>
  <Transition appear mode="out-in" name="slide-up">
    <div>
      <Transition appear mode="out-in" name="slide-up">
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'antidoping'"
          class="max-w-3xl mx-auto flex flex-wrap lg:flex-nowrap gap-3 md:gap-6 justify-center">
          <div class="w-full lg:w-1/2">
            <FormStepper />
          </div>
          <div class="w-full lg:w-1/2">
            <VisualizadorAntidoping />
          </div>
        </div>
      </Transition>

      <Transition appear mode="out-in" name="slide-up">
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'aptitud'"
          class=" flex flex-col xl:flex-row md:flex-wrap lg:flex-nowrap gap-3 md:gap-6">
          <div class="w-full xl:w-1/4">
            <FormStepper />
          </div>
          <div class="w-full xl:w-3/4">
            <VisualizadorAptitud />
          </div>
        </div>
      </Transition>

      <Transition appear mode="out-in" name="slide-up">
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'audiometria'"
          class="flex flex-col xl:flex-row md:flex-wrap lg:flex-nowrap gap-3 md:gap-6">
          <div class="w-full xl:w-1/4">
            <FormStepper />
          </div>
          <div class="w-full xl:w-3/4">
            <VisualizadorAudiometria />
          </div>
        </div>
      </Transition>

      <Transition appear mode="out-in" name="slide-up">
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'certificado'"
          class="max-w-6xl mx-auto flex flex-wrap lg:flex-nowrap gap-3 md:gap-6 justify-center">
          <div class="w-full xl:w-1/3">
            <FormStepper />
          </div>
          <div class="w-full xl:w-2/3">
            <VisualizadorCertificado />
          </div>
        </div>
      </Transition>
      
      <Transition appear mode="out-in" name="slide-up">
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'certificadoExpedito'"
          class="max-w-6xl mx-auto flex flex-wrap lg:flex-nowrap gap-3 md:gap-6 justify-center">
          <div class="w-full xl:w-1/3">
            <FormStepper />
          </div>
          <div class="w-full xl:w-2/3">
            <VisualizadorCertificadoExpedito />
          </div>
        </div>
      </Transition>

      <Transition appear mode="out-in" name="slide-up">  
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'exploracionFisica'"
          class="flex flex-col xl:flex-row md:flex-wrap lg:flex-nowrap gap-3 md:gap-6">
          <div class="w-full xl:w-1/4">
            <FormStepper />
          </div>
          <div class="w-full xl:w-3/4">
            <VisualizadorExploracionFisica />
          </div>
        </div>
      </Transition>

      <Transition appear mode="out-in" name="slide-up">  
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'examenVista'"
          class="flex flex-col xl:flex-row md:flex-wrap lg:flex-nowrap gap-3 md:gap-6">
          <div class="w-full xl:w-1/4">
            <FormStepper />
          </div>
          <div class="w-full xl:w-3/4">
            <VisualizadorExamenVista />
          </div>
        </div>
      </Transition>

      <Transition appear mode="out-in" name="slide-up">
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'historiaClinica'"
          class="flex flex-col xl:flex-row md:flex-wrap lg:flex-nowrap gap-3 md:gap-6">
          <div class="w-full xl:w-1/4">
            <FormStepper />
          </div>
          <div class="w-full xl:w-3/4">
            <VisualizadorHistoriaClinica />
          </div>
        </div>
      </Transition>

      <Transition appear mode="out-in" name="slide-up">  
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'notaMedica'"
          class="max-w-6xl mx-auto flex flex-col xl:flex-row md:flex-wrap lg:flex-nowrap gap-3 md:gap-6">
          <div class="w-full xl:w-1/3">
            <FormStepper />
          </div>
          <div class="w-full xl:w-2/3 max-w-3xl mx-auto">
            <VisualizadorNotaMedica />
          </div>
        </div>
      </Transition> 

      <Transition appear mode="out-in" name="slide-up">  
        <div v-if="documentos.currentTypeOfDocument === 'notaAclaratoria'"
          class="max-w-6xl mx-auto flex flex-col xl:flex-row md:flex-wrap lg:flex-nowrap gap-3 md:gap-6">
          <div class="w-full xl:w-1/3">
            <FormStepper />
          </div>
          <div class="w-full xl:w-2/3 max-w-3xl mx-auto">
            <VisualizadorNotaAclaratoria />
          </div>
        </div>
      </Transition> 

      <Transition appear mode="out-in" name="slide-up">
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'controlPrenatal'"
          class="max-w-6xl mx-auto flex flex-col xl:flex-row md:flex-wrap lg:flex-nowrap gap-3 md:gap-6">
          <div class="w-full xl:w-1/3">
            <FormStepper />
            <div class="text-center mt-4 p-4 md:p-6 bg-white rounded-lg shadow-md border border-gray-100 transition-all duration-300 ease-in-out hover:shadow-lg max-w-md mx-auto">
              <p class="text-xl font-bold text-gray-700 flex items-center justify-center space-x-2">
                <i class="fa-solid fa-calendar-days w-5 h-5"></i>
                <span>Mes de control</span>
              </p>
              <div class="grid grid-cols-6 gap-2 mt-4">
                <button 
                  type="button"
                  @click="() => { goToStep(12); }"
                  class="w-full px-4 py-2 md:px-6 md:py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform active:scale-95 flex items-center justify-center space-x-2"
                  :class="steps.currentStep >= 12 && steps.currentStep < 18 ? 'from-teal-500 to-teal-600' : 'from-sky-500 to-sky-600'"
                  >
                  <span>ENE</span>
                </button>
                <button 
                  type="button"
                  @click="() => { goToStep(18); }"
                  class="w-full px-4 py-2 md:px-6 md:py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform active:scale-95 flex items-center justify-center space-x-2"
                  :class="steps.currentStep >= 18 && steps.currentStep < 24 ? 'from-teal-500 to-teal-600' : 'from-sky-500 to-sky-600'"
                  >
                  <span>FEB</span>
                </button>
                <button 
                  type="button"
                  @click="() => { goToStep(24); }"
                  class="w-full px-4 py-2 md:px-6 md:py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform active:scale-95 flex items-center justify-center space-x-2"
                  :class="steps.currentStep >= 24 && steps.currentStep < 30 ? 'from-teal-500 to-teal-600' : 'from-sky-500 to-sky-600'"
                  >
                  <span>MAR</span>
                </button>
                <button 
                  type="button"
                  @click="() => { goToStep(30); }"
                  class="w-full px-4 py-2 md:px-6 md:py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform active:scale-95 flex items-center justify-center space-x-2"
                  :class="steps.currentStep >= 30 && steps.currentStep < 36 ? 'from-teal-500 to-teal-600' : 'from-sky-500 to-sky-600'"
                  >
                  <span>ABR</span>
                </button>
                <button 
                  type="button"
                  @click="() => { goToStep(36); }"
                  class="w-full px-4 py-2 md:px-6 md:py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform active:scale-95 flex items-center justify-center space-x-2"
                  :class="steps.currentStep >= 36 && steps.currentStep < 42 ? 'from-teal-500 to-teal-600' : 'from-sky-500 to-sky-600'"
                  >
                  <span>MAY</span>
                </button>
                <button 
                  type="button"
                  @click="() => { goToStep(42); }"
                  class="w-full px-4 py-2 md:px-6 md:py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform active:scale-95 flex items-center justify-center space-x-2"
                  :class="steps.currentStep >= 42 && steps.currentStep < 48 ? 'from-teal-500 to-teal-600' : 'from-sky-500 to-sky-600'"
                  >
                  <span>JUN</span>
                </button>
                
                <button 
                  type="button"
                  @click="() => { goToStep(48); }"
                  class="w-full px-4 py-2 md:px-6 md:py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform active:scale-95 flex items-center justify-center space-x-2"
                  :class="steps.currentStep >= 48 && steps.currentStep < 54 ? 'from-teal-500 to-teal-600' : 'from-sky-500 to-sky-600'"
                  >
                  <span>JUL</span>
                </button>
                <button 
                  type="button"
                  @click="() => { goToStep(54); }"
                  class="w-full px-4 py-2 md:px-6 md:py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform active:scale-95 flex items-center justify-center space-x-2"
                  :class="steps.currentStep >= 54 && steps.currentStep < 60 ? 'from-teal-500 to-teal-600' : 'from-sky-500 to-sky-600'"
                  >
                  <span>AGO</span>
                </button>
                <button 
                  type="button"
                  @click="() => { goToStep(60); }"
                  class="w-full px-4 py-2 md:px-6 md:py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform active:scale-95 flex items-center justify-center space-x-2"
                  :class="steps.currentStep >= 60 && steps.currentStep < 66 ? 'from-teal-500 to-teal-600' : 'from-sky-500 to-sky-600'"
                  >
                  <span>SEP</span>
                </button>
                <button 
                  type="button"
                  @click="() => { goToStep(66); }"
                  class="w-full px-4 py-2 md:px-6 md:py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform active:scale-95 flex items-center justify-center space-x-2"
                  :class="steps.currentStep >= 66 && steps.currentStep < 72 ? 'from-teal-500 to-teal-600' : 'from-sky-500 to-sky-600'"
                  >
                  <span>OCT</span>
                </button>
                <button 
                  type="button"
                  @click="() => { goToStep(72); }"
                  class="w-full px-4 py-2 md:px-6 md:py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform active:scale-95 flex items-center justify-center space-x-2"
                  :class="steps.currentStep >= 72 && steps.currentStep < 78 ? 'from-teal-500 to-teal-600' : 'from-sky-500 to-sky-600'"
                  >
                  <span>NOV</span>
                </button>
                <button 
                  type="button"
                  @click="() => { goToStep(78); }"
                  class="w-full px-4 py-2 md:px-6 md:py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform active:scale-95 flex items-center justify-center space-x-2"
                  :class="steps.currentStep >= 78 && steps.currentStep < 84 ? 'from-teal-500 to-teal-600' : 'from-sky-500 to-sky-600'"
                  >
                  <span>DIC</span>
                </button>
              </div>
            </div>
          </div>
          <div class="w-full xl:w-2/3 max-w-3xl mx-auto">
            <VisualizadorControlPrenatal />
          </div>
        </div>
      </Transition>
      
      <Transition appear mode="out-in" name="slide-up">
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'historiaOtologica'"
          class="flex flex-col xl:flex-row md:flex-wrap lg:flex-nowrap gap-3 md:gap-6">
          <div class="w-full xl:w-1/4">
            <FormStepper />
          </div>
          <div class="w-full xl:w-3/4">
            <VisualizadorHistoriaOtologica />
          </div>
        </div>
      </Transition>

      <Transition appear mode="out-in" name="slide-up">
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'previoEspirometria'"
          class="flex flex-col xl:flex-row md:flex-wrap lg:flex-nowrap gap-3 md:gap-6">
          <div class="w-full xl:w-1/4">
            <FormStepper />
          </div>
          <div class="w-full xl:w-3/4">
            <VisualizadorPrevioEspirometria />
          </div>
        </div>
      </Transition>

      <Transition appear mode="out-in" name="slide-up">  
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'receta'"
          class="max-w-6xl mx-auto flex flex-col xl:flex-row md:flex-wrap lg:flex-nowrap gap-3 md:gap-6">
          <div class="w-full xl:w-1/3">
            <FormStepper />
          </div>
          <div class="w-full xl:w-2/3 max-w-3xl mx-auto">
            <VisualizadorReceta />
          </div>
        </div>
      </Transition> 

      <Transition appear mode="out-in" name="slide-up">
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'constanciaAptitud'"
          class="max-w-6xl mx-auto flex flex-col xl:flex-row md:flex-wrap lg:flex-nowrap gap-3 md:gap-6">
          <div class="w-full xl:w-1/3">
            <FormStepper />
          </div>
          <div class="w-full xl:w-2/3 max-w-3xl mx-auto">
            <VisualizadorConstanciaAptitud />
          </div>
        </div>
      </Transition>

      <Transition appear mode="out-in" name="slide-up">
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'entrevistaPsicologica'"
          class="flex flex-col xl:flex-row md:flex-wrap lg:flex-nowrap gap-3 md:gap-6">
          <div class="w-full xl:w-1/4">
            <FormStepper />
            <div class="text-center mt-4 p-4 md:p-6 bg-white rounded-lg shadow-md border border-gray-100 transition-all duration-300 ease-in-out hover:shadow-lg max-w-md mx-auto">
              <p class="text-xl font-bold text-gray-700 flex items-center justify-center space-x-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                <span>Acción Rápida</span>
              </p>
              <button
                type="button"
                @click="entrevistaPsicologicaSinHallazgosYCompletado"
                class="w-full mt-4 px-4 py-2 md:px-6 md:py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform active:scale-95 flex items-center justify-center space-x-2"
              >
                <span>Sin hallazgos en la entrevista</span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="w-full xl:w-3/4">
            <VisualizadorEntrevistaPsicologica />
          </div>
        </div>
      </Transition>

      <Transition appear mode="out-in" name="slide-up">
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'trastornosEstadoAnimo'"
          class="flex flex-col xl:flex-row md:flex-wrap lg:flex-nowrap gap-3 md:gap-6">
          <div class="w-full xl:w-1/4">
            <FormStepper />
            <div class="text-center mt-4 p-4 md:p-6 bg-white rounded-lg shadow-md border border-gray-100 transition-all duration-300 ease-in-out hover:shadow-lg max-w-md mx-auto">
              <p class="text-xl font-bold text-gray-700 flex items-center justify-center space-x-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                <span>Acción Rápida</span>
              </p>
              <button
                type="button"
                @click="todoNegadoTrastornosEstadoAnimoYCompletado"
                class="w-full mt-4 px-4 py-2 md:px-6 md:py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform active:scale-95 flex items-center justify-center space-x-2"
              >
                <span>Todo negado</span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="w-full xl:w-3/4">
            <VisualizadorTrastornosEstadoAnimo />
          </div>
        </div>
      </Transition>

      <Transition appear mode="out-in" name="slide-up">
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'cuestionarioProdromalBreve'"
          class="flex flex-col xl:flex-row md:flex-wrap lg:flex-nowrap gap-3 md:gap-6">
          <div class="w-full xl:w-1/4">
            <FormStepper />
            <div class="text-center mt-4 p-4 md:p-6 bg-white rounded-lg shadow-md border border-gray-100 transition-all duration-300 ease-in-out hover:shadow-lg max-w-md mx-auto">
              <p class="text-xl font-bold text-gray-700 flex items-center justify-center space-x-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                <span>Acción Rápida</span>
              </p>
              <button
                type="button"
                @click="todoNegadoCuestionarioProdromalBreveYCompletado"
                class="w-full mt-4 px-4 py-2 md:px-6 md:py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform active:scale-95 flex items-center justify-center space-x-2"
              >
                <span>Todo negado</span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="w-full xl:w-3/4">
            <VisualizadorCuestionarioProdromalBreve />
          </div>
        </div>
      </Transition>

      <Transition appear mode="out-in" name="slide-up">
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'trastornoLimitePersonalidad'"
          class="flex flex-col xl:flex-row md:flex-wrap lg:flex-nowrap gap-3 md:gap-6">
          <div class="w-full xl:w-1/4">
            <FormStepper />
            <div class="text-center mt-4 p-4 md:p-6 bg-white rounded-lg shadow-md border border-gray-100 transition-all duration-300 ease-in-out hover:shadow-lg max-w-md mx-auto">
              <p class="text-xl font-bold text-gray-700 flex items-center justify-center space-x-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                <span>Acción Rápida</span>
              </p>
              <button
                type="button"
                @click="todoNegadoTrastornoLimitePersonalidadYCompletado"
                class="w-full mt-4 px-4 py-2 md:px-6 md:py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform active:scale-95 flex items-center justify-center space-x-2"
              >
                <span>Todo negado</span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="w-full xl:w-3/4">
            <VisualizadorTrastornoLimitePersonalidad />
          </div>
        </div>
      </Transition>

      <Transition appear mode="out-in" name="slide-up">
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'eventoSeguimientoCardiometabolico'"
          class="flex flex-col xl:flex-row md:flex-wrap lg:flex-nowrap gap-3 md:gap-6">
          <div class="w-full xl:w-1/4">
            <FormStepper />
          </div>
          <div class="w-full xl:w-3/4">
            <VisualizadorEventoSeguimientoCardiometabolico />
          </div>
        </div>
      </Transition>

      <Transition appear mode="out-in" name="slide-up">
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'informeLongitudinalCardiometabolico'"
          class="flex flex-col xl:flex-row md:flex-wrap lg:flex-nowrap gap-3 md:gap-6">
          <div class="w-full xl:w-1/4">
            <FormStepper />
          </div>
          <div class="w-full xl:w-3/4">
            <VisualizadorInformeLongitudinalCardiometabolico />
          </div>
        </div>
      </Transition>

      <Transition appear mode="out-in" name="slide-up">
        <div v-if="datosListos && documentos.currentTypeOfDocument === 'informeLongitudinalAudiometrico'"
          class="flex flex-col xl:flex-row md:flex-wrap lg:flex-nowrap gap-3 md:gap-6">
          <div class="w-full xl:w-1/4">
            <FormStepper />
          </div>
          <div class="w-full xl:w-3/4">
            <VisualizadorInformeLongitudinalAudiometrico />
          </div>
        </div>
      </Transition>

    </div>
  </Transition>

</template>