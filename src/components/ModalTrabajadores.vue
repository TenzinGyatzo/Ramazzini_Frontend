<script setup>
import { inject, ref, shallowRef, watch, computed, provide, nextTick, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { recordarTrabajadorNuevo, recordarUltimoTrabajador } from '@/helpers/estadoTablaTrabajadores';
import ModalBajaTrabajador from '@/components/ModalBajaTrabajador.vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { convertirFechaISOaYYYYMMDD, calcularEdad, calcularAntiguedad, isBirthDateInRegistrationRange, getRegistrationBirthDateInputBounds, buildRegistrationAgeRangeMessage } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import { etiquetaCriterioDuplicado } from '@/helpers/criterioDuplicado';
import { extractApiErrorMessage, extractCurpA1Issues, isCurpA1ApiError } from '@/helpers/apiErrors';
import TrabajadoresAPI from '@/api/TrabajadoresAPI';
import api from '@/lib/axios';
import EmpresasSelector from './EmpresasSelector.vue';
import EstadoAutocomplete from './selectors/EstadoAutocomplete.vue';
import PaisNacimientoAutocomplete from './selectors/PaisNacimientoAutocomplete.vue';
import ResidenciaGeoAutocomplete from './selectors/ResidenciaGeoAutocomplete.vue';
import { useNom024Fields } from '@/composables/useNom024Fields';
import { useEntidadPaisNacimientoCoherence } from '@/composables/useEntidadPaisNacimientoCoherence';
import { useResidenciaGeoCoherence, initializeResidenciaGeoFields } from '@/composables/useEntidadPaisResidenciaCoherence';
import { isGenericCurp } from '@/helpers/isGenericCurp';
import { requiresGenericCurpForEntidadNacimiento } from '@/helpers/giisResidenciaGeo';
import {
  getWorkerImmutablePayloadFields,
} from '@/helpers/workerPaisNacimientoImmutability';
import { normalizeProveedorPaisCode } from '@/helpers/proveedorPais';
import {
  normalizeWorkerPersonName,
  resolveWorkerPersonNameRegime,
} from '@/helpers/normalizeWorkerPersonName';
import ModalFusionTrabajadores from '@/components/ModalFusionTrabajadores.vue';
import { useRolePermissions } from '@/composables/useRolePermissions';
import { useDirtySnapshot } from '@/composables/useDirtySnapshot';
import { useModalDirtyGuard } from '@/composables/useModalDirtyGuard';
import ModalDiscardConfirmDialog from '@/components/ModalDiscardConfirmDialog.vue';
import ModalCurpInconvenientWordConfirm from '@/components/ModalCurpInconvenientWordConfirm.vue';
import { useCurpInconvenientWordSubmitGuard } from '@/composables/useCurpInconvenientWordSubmitGuard';
import CurpInlineFeedback from '@/components/CurpInlineFeedback.vue';
import CurpRelatedFieldMessages from '@/components/CurpRelatedFieldMessages.vue';
import {
  ANCLA_CAMPO_TRABAJADOR,
  ETIQUETAS_CAMPOS_TRABAJADOR,
  recolectarCamposInvalidos,
} from '@/helpers/camposInvalidosTrabajador';
import FechaNacimientoRegistroFeedback from '@/components/FechaNacimientoRegistroFeedback.vue';
import { useCurpLiveValidation } from '@/composables/useCurpLiveValidation';
import { useCurpInputUppercase } from '@/composables/useCurpInputUppercase';
import {
  TRABAJADOR_SEXO_CURP_OPTIONS,
  parseSexoCurpValue,
} from '@/helpers/trabajadorSexoCurp';
import {
  PERSON_NAME_MAX_LENGTH,
  PERSON_NAME_VALIDATION_MESSAGE,
  PERSON_NAME_CHARACTERS_VALIDATION_MESSAGE,
  PERSON_NAME_CHARACTERS_SIN_REGIMEN_VALIDATION_MESSAGE,
  TRABAJADOR_EDAD_MINIMA,
  TRABAJADOR_EDAD_MAXIMA,
} from '../../formkit.config';

const personNameValidationMessages = {
  required: 'Este campo es obligatorio',
  personNameValidation: PERSON_NAME_VALIDATION_MESSAGE,
  personNameOptionalValidation: PERSON_NAME_VALIDATION_MESSAGE,
  personNameCharactersValidation: PERSON_NAME_CHARACTERS_VALIDATION_MESSAGE,
  personNameOptionalCharactersValidation: PERSON_NAME_CHARACTERS_VALIDATION_MESSAGE,
  personNameCharactersSinRegimenValidation: PERSON_NAME_CHARACTERS_SIN_REGIMEN_VALIDATION_MESSAGE,
  personNameOptionalCharactersSinRegimenValidation: PERSON_NAME_CHARACTERS_SIN_REGIMEN_VALIDATION_MESSAGE,
};

const posibleDuplicadoRegistro = ref(null);
const showFusionModal = ref(false);
const nuevoTrabajadorId = ref('');

// Método para formatear la dirección (igual que en CentroTrabajoItem.vue)
const formatDireccion = (centro) => {
    const parts = [];
    if (centro.direccionCentro) parts.push(centro.direccionCentro);
    if (centro.codigoPostal) parts.push(centro.codigoPostal);
    if (centro.municipio) parts.push(centro.municipio);
    if (centro.estado) parts.push(centro.estado);
    return parts.join(', ');
};

const toast = inject('toast');

const fechaNacimientoBounds = computed(() =>
  getRegistrationBirthDateInputBounds(
    TRABAJADOR_EDAD_MINIMA,
    TRABAJADOR_EDAD_MAXIMA,
  ),
);

const fechaNacimientoMax = computed(() => fechaNacimientoBounds.value.max);
const fechaNacimientoMin = computed(() => fechaNacimientoBounds.value.min);

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const proveedorSaludStore = useProveedorSaludStore();
const { ensureUserLoaded } = useCurrentUser();
const { geoFieldsRequired, workerCurpRequired, workerIdentificationImmutable, isSIRES, isSinRegimen, isMxProveedor, mxWorkerCurpValidationRules } = useNom024Fields();

const personNameRegime = computed(() =>
  resolveWorkerPersonNameRegime(isSIRES.value, isSinRegimen.value),
);

const requiredPersonNameValidation = computed(() =>
  isSinRegimen.value
    ? 'required|personNameValidation|personNameCharactersSinRegimenValidation'
    : 'required|personNameValidation|personNameCharactersValidation',
);

const optionalPersonNameValidation = computed(() =>
  isSinRegimen.value
    ? 'personNameOptionalValidation|personNameOptionalCharactersSinRegimenValidation'
    : 'personNameOptionalValidation|personNameOptionalCharactersValidation',
);

const isEditingTrabajador = computed(() => !!trabajadores.currentTrabajador?._id);

const hasGenericCurpStored = computed(() =>
  isGenericCurp(trabajadores.currentTrabajador?.curp),
);

/** La edición abre con los datos de la tabla; esto es mientras llega lo que la tabla no trae. */
const verificandoDetalle = ref(false);

// Mientras se verifica, la identificación se trata como bloqueada: nadie alcanza a cambiar
// un dato que debía estar protegido
const hasFinalizedClinicalDocument = computed(() =>
  verificandoDetalle.value || Boolean(trabajadores.currentTrabajador?.tieneDocumentoClinicoFinalizado),
);

const isWorkerIdentificationReadOnly = computed(() =>
  isSIRES.value &&
  isEditingTrabajador.value &&
  workerIdentificationImmutable.value,
);

const isIdentificationLocked = computed(
  () =>
    isWorkerIdentificationReadOnly.value &&
    (!hasGenericCurpStored.value || hasFinalizedClinicalDocument.value),
);

const isCurpConformationReadOnly = computed(
  () => isIdentificationLocked.value,
);

const isSexoBiologicoReadOnly = computed(
  () =>
    isWorkerIdentificationReadOnly.value && hasFinalizedClinicalDocument.value,
);

const isPaisNacimientoReadOnly = computed(
  () => isIdentificationLocked.value,
);

const AVISO_IDENTIFICACION = {
  verificando: 'Verificando qué datos de identificación se pueden modificar…',
  finalizado: 'Los datos de identificación y el sexo biológico no pueden modificarse porque el trabajador ya tiene un documento clínico finalizado.',
  curpGenerica: 'Complete la CURP real y los datos de nacimiento; después quedarán bloqueados.',
  registro: 'Los datos de identificación no pueden modificarse tras el registro. El sexo biológico sigue siendo editable hasta que exista un documento clínico finalizado.',
};

const identificationSectionNotice = computed(() => {
  if (!isWorkerIdentificationReadOnly.value) return '';
  // Aún no se sabe cuál aviso va: la caja ya ocupa su lugar y dice qué está pasando
  if (verificandoDetalle.value) return AVISO_IDENTIFICACION.verificando;
  if (hasFinalizedClinicalDocument.value) return AVISO_IDENTIFICACION.finalizado;
  if (hasGenericCurpStored.value) return AVISO_IDENTIFICACION.curpGenerica;
  return AVISO_IDENTIFICACION.registro;
});

/**
 * Los avisos que pueden quedar al terminar de verificar. Van invisibles y encimados en la caja:
 * así mide lo que el más largo en cualquier ancho y el formulario no se mueve al cambiar el texto.
 */
const avisosPosiblesIdentificacion = computed(() => [
  AVISO_IDENTIFICACION.verificando,
  AVISO_IDENTIFICACION.finalizado,
  hasGenericCurpStored.value ? AVISO_IDENTIFICACION.curpGenerica : AVISO_IDENTIFICACION.registro,
]);

function omitImmutableIdentificationFields(payload) {
  if (!isWorkerIdentificationReadOnly.value) {
    return payload;
  }

  const omitSet = new Set(
    getWorkerImmutablePayloadFields(trabajadores.currentTrabajador ?? {}, {
      hasFinalizedClinicalDocument: hasFinalizedClinicalDocument.value,
    }),
  );

  const result = { ...payload };
  for (const field of omitSet) {
    delete result[field];
  }
  return result;
}

const emit = defineEmits(['closeModal', 'openSubscriptionModal', 'registrarOtro'])

/**
 * Tras registrar a un trabajador, el modal ofrece el siguiente paso (abrir su expediente o
 * registrar otro) en lugar de cerrarse; la tabla lo pondrá a la vista y lo resaltará.
 */
const router = useRouter();
const registrado = ref(null);
const panelEl = ref(null);
const botonAbrirExpedienteEl = ref(null);

/** Al volver a la tabla, el nuevo se pone a la vista y se resalta (al recargarse la lista). */
const mostrarEnLaTabla = (trabajadorId) => {
  if (!trabajadorId) return;
  recordarTrabajadorNuevo(centrosTrabajo.currentCentroTrabajoId, String(trabajadorId));
  recordarUltimoTrabajador(centrosTrabajo.currentCentroTrabajoId, String(trabajadorId));
  // Una sola actualización, sin «Cargando…»: la tabla se queda y recibe al nuevo
  trabajadores.fetchTrabajadoresConHistoria(empresas.currentEmpresaId, centrosTrabajo.currentCentroTrabajoId, {
    enSegundoPlano: true,
  });
};

/** Datos clave para confirmar de un vistazo la captura (mismos íconos que el encabezado del expediente). */
const datosParaConfirmar = (trabajador) => {
  const datos = [];
  const numeroEmpleado = String(trabajador.numeroEmpleado ?? '').trim();
  if (numeroEmpleado && numeroEmpleado !== '-') {
    datos.push({ titulo: 'Número de empleado', texto: `No. ${numeroEmpleado}`, icono: 'fas fa-id-badge text-purple-500' });
  }
  if (trabajador.puesto) datos.push({ titulo: 'Puesto', texto: trabajador.puesto, icono: 'fas fa-briefcase text-blue-500' });
  const edad = trabajador.fechaNacimiento ? calcularEdad(trabajador.fechaNacimiento) : null;
  if (Number.isFinite(edad)) {
    datos.push({ titulo: 'Edad', texto: `${edad} ${edad === 1 ? 'año' : 'años'}`, icono: 'fas fa-birthday-cake text-emerald-500' });
  }
  return datos;
};

const mostrarRegistrado = async (trabajador) => {
  registrado.value = {
    id: String(trabajador._id),
    nombre: formatNombreCompleto(trabajador),
    titulo: String(trabajador.sexo ?? '').toLowerCase().startsWith('fem')
      ? 'Trabajadora registrada'
      : 'Trabajador registrado',
    datos: datosParaConfirmar(trabajador),
  };
  await nextTick();
  if (panelEl.value) panelEl.value.scrollTop = 0;
  botonAbrirExpedienteEl.value?.focus();
};

const abrirExpedienteRegistrado = () => {
  const id = registrado.value?.id;
  const idEmpresa = empresas.currentEmpresaId;
  const idCentroTrabajo = centrosTrabajo.currentCentroTrabajoId;
  if (!id || !idEmpresa || !idCentroTrabajo) {
    forceClose();
    return;
  }
  // Al regresar del expediente, su fila se resalta como con cualquier trabajador abierto
  recordarUltimoTrabajador(idCentroTrabajo, id);
  registrado.value = null;
  forceClose();
  router.push({ name: 'expediente-medico', params: { idEmpresa, idCentroTrabajo, idTrabajador: id } });
};

const registrarOtro = () => {
  mostrarEnLaTabla(registrado.value?.id);
  registrado.value = null;
  emit('registrarOtro');
};


const nivelesEscolaridadBase = [
  "Primaria", "Secundaria", "Preparatoria",
  "Licenciatura", "Maestría", "Doctorado",
  "Nula",
];

const nivelesEscolaridad = computed(() => {
  if (paisProveedor.value === "GT") {
    return nivelesEscolaridadBase.map((nivel) =>
      nivel === "Preparatoria" ? "Diversificado" : nivel
    );
  }

  return nivelesEscolaridadBase;
});

const escolaridadDefaultValue = computed(() => {
  const actual = trabajadores.currentTrabajador?.escolaridad || "";
  if (paisProveedor.value === "GT" && actual === "Preparatoria") {
    return "Diversificado";
  }
  return actual;
});

const estadosCiviles = [
  "Soltero/a", "Casado/a", "Unión libre",
  "Separado/a", "Divorciado/a", "Viudo/a",
];

// Escolaridad y estado civil son opcionales: opción vacía para poder dejarlos sin dato o borrarlos
const opcionSinEspecificar = { label: "-Sin especificar-", value: "" };
const opcionesEscolaridad = computed(() => [opcionSinEspecificar, ...nivelesEscolaridad.value]);
const opcionesEstadoCivil = [opcionSinEspecificar, ...estadosCiviles];

// Variables reactivas para el modal de transferencia
const mostrarModalTransferencia = ref(false);
const mostrarModalBaja = ref(false);
const confirmandoBaja = ref(false);
const empresasDisponibles = ref([]);
const empresaSeleccionada = ref(null);
const centrosDisponibles = ref([]);
const centroSeleccionado = ref(null);
const transferenciaEnProceso = ref(false);
const isSubmitting = ref(false);
const loadingEmpresas = ref(false);
// Cache simple para resultados de empresas por contexto
const cacheEmpresas = new Map();
// Buscador de empresas con debounce
const empresaSearch = ref('');
const empresaSearchDebounced = ref('');
let empresaSearchTimer = null;
// Paginación simple en cliente
const empresaPage = ref(1);
const EMPRESAS_PAGE_SIZE = 25;

watch(empresaSearch, (val) => {
  if (empresaSearchTimer) clearTimeout(empresaSearchTimer);
  empresaSearchTimer = setTimeout(() => {
    empresaSearchDebounced.value = (val || '').trim();
  }, 300);
});

// Highlight helper
const highlightMatch = (text, term) => {
  if (!text) return '';
  if (!term) return text;
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${esc})`, 'ig');
  return text.replace(re, '<mark>$1</mark>');
};

// Filtro y pseudo-virtualización
const filteredEmpresas = computed(() => {
  const term = empresaSearchDebounced.value.toLowerCase();
  let list = empresasDisponibles.value || [];
  if (term) {
    list = list.filter((e) => {
      const nombre = (e.nombreComercial || '').toLowerCase();
      const razon = (e.razonSocial || '').toLowerCase();
      const rfc = (e.RFC || e.rfc || '').toLowerCase();
      return nombre.includes(term) || razon.includes(term) || rfc.includes(term);
    });
  }
  return list;
});

const visibleEmpresas = computed(() => {
  // Paginar ya no es necesario: devolver lista completa filtrada
  return filteredEmpresas.value;
});

watch([empresaSearchDebounced, () => empresasDisponibles.value], () => {
  empresaPage.value = 1;
});

const renderEmpresaNombre = (e) => ({
  nombre: highlightMatch(e.nombreComercial || '', empresaSearchDebounced.value),
  razon: highlightMatch(e.razonSocial || '', empresaSearchDebounced.value),
  rfc: highlightMatch(e.RFC || e.rfc || '', empresaSearchDebounced.value)
});

const getEmpresaIniciales = (e) => {
  const base = (e.nombreComercial || e.razonSocial || '').trim();
  if (!base) return '?';
  const parts = base.split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('');
};

const paisProveedor = computed(() =>
  normalizeProveedorPaisCode(proveedorSaludStore.proveedorSalud?.pais),
);

const identificadorPersonalLabel = computed(() => {
  switch (paisProveedor.value) {
    case 'PA':
      return 'Cédula de Identidad';
    case 'GT':
      return 'DPI';
    case 'MX':
      return 'CURP';
    default:
      return 'No. Identificación Personal';
  }
});

const identificadorPersonalPlaceholder = computed(() => {
  switch (paisProveedor.value) {
    case 'PA':
      return 'Ejemplo: E-8-123-456';
    case 'GT':
      return 'Ejemplo: 1234567890123';
    case 'MX':
      return 'Ejemplo: ROAJ850102HNLRRN08';
    default:
      return 'Ejemplo: 01234567-8';
  }
});

const mxCurpValidationMessages = {
  required: 'Este campo es obligatorio',
};

// Validación condicional para campos NOM-024: requeridos solo para SIRES_NOM024
const nom024FieldValidation = computed(() => {
  return geoFieldsRequired.value ? 'required' : 'optional';
});

const nom024NacimientoFields = ref({
  entidadNacimiento: trabajadores.currentTrabajador?.entidadNacimiento || '',
  paisNacimiento: trabajadores.currentTrabajador?.paisNacimiento ?? '',
});

const requiresGenericCurp = computed(() =>
  requiresGenericCurpForEntidadNacimiento(
    nom024NacimientoFields.value.entidadNacimiento,
  ),
);

const isCurpFieldReadOnly = computed(
  () => isIdentificationLocked.value || requiresGenericCurp.value,
);

useEntidadPaisNacimientoCoherence(nom024NacimientoFields, 'trabajador');

const nom024ResidenciaFields = ref({
  entidadResidencia: trabajadores.currentTrabajador?.entidadResidencia || '',
  municipioResidencia: trabajadores.currentTrabajador?.municipioResidencia || '',
  localidadResidencia: trabajadores.currentTrabajador?.localidadResidencia || '',
  paisResidencia: trabajadores.currentTrabajador?.paisResidencia ?? '',
});

useResidenciaGeoCoherence(nom024ResidenciaFields, 'trabajador');

// Ref para el valor del CURP (para poder actualizarlo programáticamente)
const curpValue = ref(trabajadores.currentTrabajador?.curp || '');

useCurpInputUppercase(curpValue);

// Watch para sincronizar curpValue con el trabajador actual
watch(() => trabajadores.currentTrabajador?.curp, (newCurp) => {
  curpValue.value = newCurp || '';
}, { immediate: true });

const formData = ref({});
const fechaNacimientoRegistro = computed(
  () =>
    formData.value?.fechaNacimiento
    || convertirFechaISOaYYYYMMDD(trabajadores.currentTrabajador?.fechaNacimiento)
    || '',
);
const primerApellidoField = ref('');
const segundoApellidoField = ref('');
const nombreField = ref('');

const curpDemographics = computed(() => ({
  fechaNacimiento: formData.value?.fechaNacimiento
    || convertirFechaISOaYYYYMMDD(trabajadores.currentTrabajador?.fechaNacimiento)
    || null,
  sexo: formData.value?.sexo || trabajadores.currentTrabajador?.sexo || null,
  sexoCURP: parseSexoCurpValue(
    formData.value?.sexoCURP ?? trabajadores.currentTrabajador?.sexoCURP,
  ),
  useSexoCurpForValidation: isSIRES.value,
  entidadNacimiento: nom024NacimientoFields.value.entidadNacimiento || null,
  nombre: nombreField.value || null,
  primerApellido: primerApellidoField.value || null,
  segundoApellido: segundoApellidoField.value || null,
}));

const curpLiveOptions = computed(() => ({
  allowGenericCurp: true,
  requireGenericCurp: requiresGenericCurp.value,
  // Vacío lo maneja FormKit (required); no mostrar "CURP no puede estar vacía" inline.
  required: false,
}));

const {
  issues: curpIssues,
  invalidPositions: curpInvalidPositions,
  warningPositions: curpWarningPositions,
  validPositions: curpValidPositions,
  relatedFieldErrors: curpRelatedFieldErrors,
  relatedFieldMessages: curpRelatedFieldMessages,
  hasBlockingErrors: curpHasBlockingErrors,
  curpPrefixSuggestion,
  applySuggestedPrefix,
  setServerIssues,
  clearServerIssues,
} = useCurpLiveValidation({
  curp: curpValue,
  demographics: curpDemographics,
  options: curpLiveOptions,
});

const {
  showModal: showCurpInconvenientConfirm,
  detectedWord: curpInconvenientWord,
  confirmOrProceed: confirmCurpInconvenientWordIfNeeded,
  onConfirm: confirmCurpInconvenientWord,
  onCancel: cancelCurpInconvenientWord,
} = useCurpInconvenientWordSubmitGuard();

watch(curpValue, () => {
  clearServerIssues();
});

const applyCurpSuggestion = () => {
  if (isCurpFieldReadOnly.value) return;
  const next = applySuggestedPrefix();
  if (next != null) {
    curpValue.value = next;
  }
};

const syncWorkerPersonNameFields = () => {
  const worker = trabajadores.currentTrabajador;
  const regime = personNameRegime.value;

  primerApellidoField.value = normalizeWorkerPersonName(worker?.primerApellido, regime);
  const hasPrimer = String(primerApellidoField.value || '').trim() !== '';
  // Sin primer apellido no puede haber segundo (evita estado inválido al hidratar).
  segundoApellidoField.value = hasPrimer
    ? normalizeWorkerPersonName(worker?.segundoApellido, regime)
    : '';
  nombreField.value = normalizeWorkerPersonName(worker?.nombre, regime);
};

watch(
  [() => trabajadores.currentTrabajador, personNameRegime],
  syncWorkerPersonNameFields,
  { immediate: true },
);

const hasPrimerApellido = computed(
  () => String(primerApellidoField.value || '').trim() !== '',
);

const isSegundoApellidoDisabled = computed(
  () => isCurpConformationReadOnly.value || !hasPrimerApellido.value,
);

const normalizePersonNameField = (field) => {
  const refMap = {
    primerApellido: primerApellidoField,
    segundoApellido: segundoApellidoField,
    nombre: nombreField,
  };

  const target = refMap[field];
  if (!target) return;

  target.value = normalizeWorkerPersonName(target.value, personNameRegime.value);

  if (field === 'primerApellido' && String(target.value || '').trim() === '') {
    segundoApellidoField.value = '';
  }
};

const clearSegundoApellidoIfNoPrimer = () => {
  if (String(primerApellidoField.value || '').trim() !== '') return;
  if (String(segundoApellidoField.value || '').trim() === '') return;
  segundoApellidoField.value = '';
};

const buildFormState = () => ({
  ...formData.value,
  primerApellido: primerApellidoField.value,
  segundoApellido: segundoApellidoField.value,
  nombre: nombreField.value,
  curp: curpValue.value,
  nacimiento: { ...nom024NacimientoFields.value },
  residencia: { ...nom024ResidenciaFields.value },
});

const { isDirty: formularioModificado, markClean: marcarFormularioLimpio } = useDirtySnapshot(buildFormState, {
  resetTrigger: () => !trabajadores.loadingModal,
});
// Ya registrado, no hay nada que descartar al cerrar
const isDirty = computed(() => !registrado.value && formularioModificado.value);

const closeModal = () => {
  if (registrado.value) {
    mostrarEnLaTabla(registrado.value.id);
    registrado.value = null;
  }
  posibleDuplicadoRegistro.value = null;
  showFusionModal.value = false;
  emit('closeModal');
};

const {
  showDiscardConfirm,
  dismissPulse,
  requestDismiss,
  forceClose,
  continueEditing,
  confirmDiscard,
} = useModalDirtyGuard({
  isDirty,
  onClose: closeModal,
  enabled: () =>
    !showFusionModal.value &&
    !mostrarModalTransferencia.value &&
    !mostrarModalBaja.value &&
    !trabajadores.loadingModal,
});

// Baja del trabajador desde su edición: misma explicación y confirmación que en la tabla
const puedeDarseDeBaja = computed(
  () => !!trabajadores.currentTrabajador?._id && trabajadores.currentTrabajador?.estadoLaboral === 'Activo',
);

const confirmarBaja = async () => {
  if (confirmandoBaja.value) return;
  const empresaId = empresas.currentEmpresaId;
  const centroId = centrosTrabajo.currentCentroTrabajoId;
  const trabajadorId = trabajadores.currentTrabajador?._id;
  if (!empresaId || !centroId || !trabajadorId) return;

  confirmandoBaja.value = true;
  try {
    await trabajadores.updateTrabajador(
      empresaId, centroId, trabajadorId, { estadoLaboral: 'Inactivo' }, { enSegundoPlano: true },
    );
    toast.open({ message: 'Baja de trabajador registrada' });
    mostrarModalBaja.value = false;
    // La baja cierra la edición: lo que no se había guardado del formulario se descarta
    forceClose();
    trabajadores.fetchTrabajadoresConHistoria(empresaId, centroId, { enSegundoPlano: true });
  } catch (error) {
    console.error('Error al registrar la baja', error);
    toast.open({ message: 'Error al actualizar el estado laboral', type: 'error' });
  } finally {
    confirmandoBaja.value = false;
  }
};

const GENERIC_CURP = 'XXXX999999XXXXXX99';

// Función para insertar CURP genérico (para paciente desconocido o extranjero)
const insertGenericCURP = () => {
  curpValue.value = GENERIC_CURP;
};

watch(
  requiresGenericCurp,
  (required) => {
    if (!required) return;
    // No pisar CURP real inmutable de identificación
    if (isIdentificationLocked.value) return;
    if (curpValue.value !== GENERIC_CURP) {
      curpValue.value = GENERIC_CURP;
    }
  },
  { immediate: true },
);

// Watch para sincronizar valores cuando cambia el trabajador actual
watch(() => trabajadores.currentTrabajador, (trabajador) => {
  nom024NacimientoFields.value.entidadNacimiento = trabajador?.entidadNacimiento || '';
  nom024NacimientoFields.value.paisNacimiento = trabajador?.paisNacimiento ?? '';
  nom024ResidenciaFields.value.entidadResidencia = trabajador?.entidadResidencia || '';
  nom024ResidenciaFields.value.municipioResidencia = trabajador?.municipioResidencia || '';
  nom024ResidenciaFields.value.localidadResidencia = trabajador?.localidadResidencia || '';
  nom024ResidenciaFields.value.paisResidencia = trabajador?.paisResidencia ?? '';
  initializeResidenciaGeoFields(nom024ResidenciaFields, 'init', 'trabajador');
}, { immediate: true });

// Variables para contar trabajadores por centro
const trabajadoresPorCentro = ref({});
const loadingTrabajadores = ref(false);
const centrosYaContados = new Set();
let observer = null;

const ensureObserver = () => {
  if (observer) return observer;
  observer = new IntersectionObserver((entries) => {
    entries.forEach(async (entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const centroId = el && el.__centroId;
        if (!centroId || centrosYaContados.has(centroId)) {
          observer.unobserve(entry.target);
          return;
        }
        centrosYaContados.add(centroId);
        observer.unobserve(entry.target);
        const centro = centrosDisponibles.value.find(c => c._id === centroId);
        if (centro) {
          const numero = await obtenerNumeroTrabajadores(centro);
          trabajadoresPorCentro.value = { ...trabajadoresPorCentro.value, [centroId]: numero };
        }
      }
    });
  }, { root: null, threshold: 0.1 });
  return observer;
};

const registerCentroObserver = (el, centro) => {
  if (!el || !centro?._id) return;
  el.__centroId = centro._id;
  ensureObserver().observe(el);
};

// Función para obtener el número de trabajadores de un centro sin afectar el estado global
const obtenerNumeroTrabajadores = async (centro) => {
  if (!centro?._id) return 0;
  
  try {
    // Usar empresa real del centro (puede ser distinta a la actual)
    const empresaIdDelCentro = typeof centro.idEmpresa === 'object' ? centro.idEmpresa._id : centro.idEmpresa;
    const { data } = await TrabajadoresAPI.getTrabajadores(
      empresaIdDelCentro,
      centro._id
    );
    
    if (Array.isArray(data)) {
      return data.length;
    } else {
      return 0;
    }
  } catch (error) {
    console.error('Error al obtener trabajadores del centro:', error);
    return 0;
  }
};

// Función para cargar el número de trabajadores para todos los centros
const cargarTrabajadoresPorCentro = async () => {
  if (!centrosDisponibles.value.length) return;
  
  loadingTrabajadores.value = true;
  try {
    const conteos = await Promise.all(
      centrosDisponibles.value.map(async (centro) => {
        const numero = await obtenerNumeroTrabajadores(centro);
        return { centroId: centro._id, numero };
      })
    );
    
    // Convertir a objeto para fácil acceso
    trabajadoresPorCentro.value = conteos.reduce((acc, { centroId, numero }) => {
      acc[centroId] = numero;
      return acc;
    }, {});
  } catch (error) {
    console.error('Error al cargar trabajadores por centro:', error);
  } finally {
    loadingTrabajadores.value = false;
  }
};

// Función para manejar el envío del formulario
// Ref para rastrear si el formulario ha intentado enviarse (para activar validaciones visuales)
const formSubmitAttempted = ref(false);

// Proveer el estado de validación a los componentes hijos
provide('formSubmitAttempted', formSubmitAttempted);

// Resumen de campos con error: aparece al intentar guardar y se actualiza mientras se corrigen
// (el estado de validez de cada campo de FormKit es reactivo)
const formNode = shallowRef(null);
const formRootEl = ref(null);

/** Campos de la edición, con el valor que les da el formulario a partir del trabajador. */
const CAMPOS_EDICION = [
  'primerApellido', 'segundoApellido', 'nombre', 'curp', 'sexo', 'sexoCURP', 'fechaNacimiento',
  'escolaridad', 'estadoCivil', 'puesto', 'fechaIngreso', 'numeroEmpleado', 'nss', 'telefono',
  'contactoEmergenciaNombre', 'contactoEmergenciaTelefono', 'entidadNacimiento', 'paisNacimiento',
  'entidadResidencia', 'municipioResidencia', 'localidadResidencia', 'paisResidencia',
];

const valorEnFormulario = (trabajador, campo) => {
  const valor = trabajador?.[campo];
  if (campo === 'fechaNacimiento' || campo === 'fechaIngreso') return convertirFechaISOaYYYYMMDD(valor) || '';
  if (campo === 'primerApellido' || campo === 'segundoApellido' || campo === 'nombre') {
    return normalizeWorkerPersonName(valor, personNameRegime.value);
  }
  if (campo === 'escolaridad' && paisProveedor.value === 'GT' && valor === 'Preparatoria') return 'Diversificado';
  return String(valor ?? '');
};

/**
 * Completa en segundo plano lo que la tabla no trae (si tiene documentos finalizados, sus
 * riesgos). Si el servidor tiene datos más recientes que la tabla, se ponen solo en los campos
 * que el usuario no ha tocado: lo que ya escribió no se pierde.
 */
async function completarDetalle() {
  const mostrado = trabajadores.currentTrabajador;
  const empresaId = empresas.currentEmpresaId;
  const centroId = centrosTrabajo.currentCentroTrabajoId;
  // Desde el expediente el trabajador ya viene completo
  if (!mostrado?._id || 'tieneDocumentoClinicoFinalizado' in mostrado || !empresaId || !centroId) return;

  verificandoDetalle.value = true;
  try {
    const detalle = await trabajadores.obtenerTrabajadorDetalle(empresaId, centroId, mostrado._id);
    // Se cerró o se abrió otro trabajador mientras llegaba
    if (trabajadores.currentTrabajador !== mostrado || !detalle) return;

    const estabaLimpio = !formularioModificado.value;
    const enPantalla = formNode.value?.value ?? {};
    const actualizar = [];
    const conservar = new Set();
    for (const campo of CAMPOS_EDICION) {
      const antes = valorEnFormulario(mostrado, campo);
      const ahora = valorEnFormulario(detalle, campo);
      if (antes === ahora) continue;
      if (String(enPantalla[campo] ?? '') === antes) actualizar.push([campo, ahora]);
      else conservar.add(campo);
    }

    // Sin reemplazar el objeto: así no se vuelven a sincronizar los campos desde cero
    for (const [clave, valor] of Object.entries(detalle)) {
      if (!conservar.has(clave)) mostrado[clave] = valor;
    }
    for (const [campo, valor] of actualizar) {
      formNode.value?.at(campo)?.input(valor);
    }
    if (estabaLimpio) {
      await formNode.value?.settled;
      await nextTick();
      marcarFormularioLimpio();
    }
  } catch (error) {
    // Sin detalle se edita con los datos de la tabla; el servidor vuelve a validar al guardar
    console.error('Error al completar el trabajador:', error);
  } finally {
    verificandoDetalle.value = false;
  }
}

onMounted(completarDetalle);
const resumenErroresActivo = ref(false);

const etiquetasCampos = computed(() => ({
  ...ETIQUETAS_CAMPOS_TRABAJADOR,
  curp: identificadorPersonalLabel.value,
}));

const camposConError = computed(() =>
  resumenErroresActivo.value
    ? recolectarCamposInvalidos(formNode.value, etiquetasCampos.value)
    : []
);

const esCampoVacioEditable = (el) =>
  !el.disabled && el.type !== 'hidden' && !String(el.value ?? '').trim();

/** Lleva al campo (o al bloque geográfico que lo captura) y pone el cursor ahí. */
const irACampo = (name) => {
  const raiz = formRootEl.value;
  if (!raiz) return;
  const ancla = ANCLA_CAMPO_TRABAJADOR[name];
  let destino = null;
  let foco = null;
  if (ancla) {
    destino = raiz.querySelector(`[data-campo="${ancla}"]`);
    const entradas = destino ? [...destino.querySelectorAll('input, select, textarea')] : [];
    foco = entradas.find(esCampoVacioEditable) || entradas.find((el) => !el.disabled) || null;
  } else {
    foco = raiz.querySelector(`[name="${name}"]:not([type="hidden"])`);
    destino = foco?.closest('.formkit-outer') || foco;
  }
  if (!destino) return;
  destino.scrollIntoView({ behavior: 'smooth', block: 'center' });
  foco?.focus({ preventScroll: true });
};

// Handler para cuando el formulario tiene errores de validación
const onFormSubmitInvalid = () => {
  // Los avisos de los selectores geográficos se quedan hasta que el campo se llene
  formSubmitAttempted.value = true;
  resumenErroresActivo.value = true;
  const primero = camposConError.value[0];
  if (primero) irACampo(primero.name);
};

const handleSubmit = async (data) => {
  if (isSubmitting.value || verificandoDetalle.value) return;
  isSubmitting.value = true;

  try {
  formSubmitAttempted.value = false; // Resetear cuando el submit es exitoso
  resumenErroresActivo.value = false;
  if (!proveedorSaludStore.proveedorSalud) return;

  if (isMxProveedor.value && curpHasBlockingErrors.value) {
    formSubmitAttempted.value = true;
    irACampo('curp');
    toast.open({
      message: 'Revisa la CURP: hay errores que debes corregir antes de guardar.',
      type: 'error',
    });
    return;
  }

  if (isMxProveedor.value) {
    const confirmed = await confirmCurpInconvenientWordIfNeeded(curpValue.value);
    if (!confirmed) {
      return;
    }
  }

  // Obtener el ID del usuario actual
  const currentUserId = await ensureUserLoaded();
  
  if (!currentUserId) {
    toast.open({ message: 'No se pudo identificar al usuario. Por favor, inicie sesión nuevamente.', type: 'error' });
    return;
  }

  // Acceso comercial (prueba, suscripción, contrato con Ramazzini o restricción): una sola regla
  if (proveedorSaludStore.bloqueoComercial) {
    emit('openSubscriptionModal');
    return;
  }

  // Validar rango de edad permitido para registro: 18-100 años (duración exacta)
  if (data.fechaNacimiento) {
    const edadValida = isBirthDateInRegistrationRange(
      data.fechaNacimiento,
      new Date(),
      TRABAJADOR_EDAD_MINIMA,
      TRABAJADOR_EDAD_MAXIMA,
    );
    if (!edadValida) {
      toast.open({
        message: buildRegistrationAgeRangeMessage(
          TRABAJADOR_EDAD_MINIMA,
          TRABAJADOR_EDAD_MAXIMA,
          data.fechaNacimiento,
        ),
        type: 'error'
      });
      return;
    }
  }

  clearSegundoApellidoIfNoPrimer();
  const primerApellidoNorm = normalizeWorkerPersonName(
    data.primerApellido || primerApellidoField.value,
    personNameRegime.value,
  );
  const segundoApellidoNorm = primerApellidoNorm
    ? normalizeWorkerPersonName(
        data.segundoApellido || segundoApellidoField.value,
        personNameRegime.value,
      )
    : '';

  const trabajadorData = {
    primerApellido: primerApellidoNorm,
    segundoApellido: segundoApellidoNorm,
    nombre: normalizeWorkerPersonName(
      data.nombre || nombreField.value,
      personNameRegime.value,
    ),
    fechaNacimiento:
      data.fechaNacimiento
      || convertirFechaISOaYYYYMMDD(trabajadores.currentTrabajador?.fechaNacimiento),
    sexo: data.sexo || trabajadores.currentTrabajador?.sexo,
    ...(isSIRES.value && data.sexoCURP != null && data.sexoCURP !== ''
      ? { sexoCURP: parseSexoCurpValue(data.sexoCURP) }
      : {}),
    escolaridad: data.escolaridad,
    puesto: data.puesto,
    telefono: data.telefono,
    contactoEmergenciaNombre: data.contactoEmergenciaNombre,
    contactoEmergenciaTelefono: data.contactoEmergenciaTelefono,
    estadoCivil: data.estadoCivil,
    numeroEmpleado: data.numeroEmpleado,
    nss: data.nss,
    // NOM-024 Fields (usar valores reactivos si no están en data)
    entidadNacimiento: data.entidadNacimiento || nom024NacimientoFields.value.entidadNacimiento,
    paisNacimiento: data.paisNacimiento || nom024NacimientoFields.value.paisNacimiento,
    entidadResidencia: data.entidadResidencia || nom024ResidenciaFields.value.entidadResidencia,
    paisResidencia: data.paisResidencia || nom024ResidenciaFields.value.paisResidencia,
    municipioResidencia: data.municipioResidencia || nom024ResidenciaFields.value.municipioResidencia,
    localidadResidencia: data.localidadResidencia || nom024ResidenciaFields.value.localidadResidencia,
    idCentroTrabajo: data.idCentroTrabajo,
    createdBy: currentUserId,
    updatedBy: currentUserId
  };

  const curpCapturada = String(curpValue.value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  const isEditingTrabajador = !!trabajadores.currentTrabajador?._id;

  if (!isMxProveedor.value && isEditingTrabajador && !isCurpFieldReadOnly.value) {
    // curpValue (v-model) es la fuente de verdad; data.curp de FormKit puede conservar valor previo
    trabajadorData.curp = curpCapturada || '';
  } else if (curpCapturada) {
    trabajadorData.curp = curpCapturada;
  }

  // Solo agregar fechaIngreso si tiene un valor válido
  if (data.fechaIngreso && data.fechaIngreso !== '') {
    trabajadorData.fechaIngreso = data.fechaIngreso;
  }

  // Agregar estadoLaboral solo si es un nuevo registro
  if (!trabajadores.currentTrabajador?._id) {
    trabajadorData.estadoLaboral = "Activo";
  }

  const payloadToSend = trabajadores.currentTrabajador?._id
    ? omitImmutableIdentificationFields(trabajadorData)
    : trabajadorData;

  try {
    if (trabajadores.currentTrabajador?._id) {
      // Actualizar Trabajador
      // Sin «Cargando…» en la tabla: el botón ya dice «Guardando…»
      await trabajadores.updateTrabajador(
        empresas.currentEmpresaId,
        centrosTrabajo.currentCentroTrabajoId,
        trabajadores.currentTrabajador._id,
        payloadToSend,
        { enSegundoPlano: true },
      );
      toast.open({ message: 'Trabajador actualizado', type: 'success' });
    } else {
      const response = await trabajadores.createTrabajador(
        empresas.currentEmpresaId,
        centrosTrabajo.currentCentroTrabajoId,
        trabajadorData,
      );
      if (response?.posibleDuplicado) {
        if (response.data?._id) {
          recordarTrabajadorNuevo(centrosTrabajo.currentCentroTrabajoId, String(response.data._id));
          recordarUltimoTrabajador(centrosTrabajo.currentCentroTrabajoId, String(response.data._id));
        }
        posibleDuplicadoRegistro.value = response.posibleDuplicado;
        nuevoTrabajadorId.value = response.data?._id;
        toast.open({
          message: `Trabajador registrado. Posible duplicado detectado (${etiquetaCriterioDuplicado(response.posibleDuplicado.criterio, identificadorPersonalLabel.value)}). La alerta quedará pendiente hasta fusionar.`,
          type: 'warning',
        });
        trabajadores.fetchTrabajadoresConHistoria(
          empresas.currentEmpresaId,
          centrosTrabajo.currentCentroTrabajoId,
          { enSegundoPlano: true },
        );
        return;
      }
      if (response?.data?._id) {
        await mostrarRegistrado(response.data);
        return;
      }
      toast.open({ message: 'Trabajador registrado exitosamente', type: 'success' });
    }
    forceClose();
    trabajadores.fetchTrabajadoresConHistoria(empresas.currentEmpresaId, centrosTrabajo.currentCentroTrabajoId, {
      enSegundoPlano: true,
    });
  } catch (error) {
    console.error('Error al crear o actualizar al trabajador:', error);

    if (isCurpA1ApiError(error)) {
      setServerIssues(extractCurpA1Issues(error));
      toast.open({
        message: 'Revisa la CURP: no coincide con los datos capturados.',
        type: 'error',
      });
      return;
    }

    toast.open({
      message: extractApiErrorMessage(
        error,
        'Hubo un error al crear o actualizar al trabajador, por favor intente nuevamente.',
      ),
      type: 'error',
    });
  }
  } finally {
    isSubmitting.value = false;
  }
};

function posponerRevisionDuplicado() {
  toast.open({
    message: 'Podrás revisarlo desde el listado de trabajadores.',
    type: 'info',
  });
  forceClose();
}

const { canEliminarFusionarTrabajadores } = useRolePermissions();

function abrirFusionDesdeAlta() {
  showFusionModal.value = true;
}

// No era la misma persona: el aviso de posible duplicado ya no aplica
function onDuplicadoDescartado() {
  posibleDuplicadoRegistro.value = null;
  showFusionModal.value = false;
}

function onFusionCompletada() {
  posibleDuplicadoRegistro.value = null;
  showFusionModal.value = false;
  forceClose();
}

// Función para transferir trabajador a otro centro de trabajo (render inmediato + carga en bg)
const transferirTrabajador = async () => {
  // Mostrar modal inmediatamente
  mostrarModalTransferencia.value = true;

  // Resetear estados antes de cargar
  empresasDisponibles.value = [];
  empresaSeleccionada.value = null;
  centroSeleccionado.value = null;
  centrosDisponibles.value = [];

  // Cargar empresas en segundo plano
  loadingEmpresas.value = true;
  try {
    const cacheKey = `${empresas.currentEmpresaId}|${centrosTrabajo.currentCentroTrabajoId}|${proveedorSaludStore.proveedorSalud?._id}`;
    if (cacheEmpresas.has(cacheKey)) {
      empresasDisponibles.value = cacheEmpresas.get(cacheKey);
      return;
    }
    const { data } = await TrabajadoresAPI.getCentrosDisponiblesTransferencia(
      empresas.currentEmpresaId,
      centrosTrabajo.currentCentroTrabajoId,
      centrosTrabajo.currentCentroTrabajoId,
      proveedorSaludStore.proveedorSalud?._id
    );

    empresasDisponibles.value = data.empresas || [];
    cacheEmpresas.set(cacheKey, empresasDisponibles.value);

    if (!empresasDisponibles.value.length) {
      toast.open({
        message: 'No hay otros centros de trabajo disponibles para transferir',
        type: 'warning'
      });
    }
  } catch (error) {
    console.error('Error al cargar centros de trabajo:', error);
    toast.open({
      message: 'Error al cargar los centros de trabajo disponibles',
      type: 'error'
    });
  } finally {
    loadingEmpresas.value = false;
  }
};

// Función para cuando se selecciona una empresa
const onEmpresaSeleccionada = async () => {
  if (!empresaSeleccionada.value) {
    centrosDisponibles.value = [];
    centroSeleccionado.value = null;
    return;
  }

  // Obtener centros de la empresa seleccionada
  const empresaEncontrada = empresasDisponibles.value.find(
    emp => emp._id === empresaSeleccionada.value
  );

  if (empresaEncontrada && empresaEncontrada.centros) {
    centrosDisponibles.value = empresaEncontrada.centros;
    
    // Cargar el número de trabajadores para cada centro
    await cargarTrabajadoresPorCentro();
  } else {
    centrosDisponibles.value = [];
  }

  centroSeleccionado.value = null;
};

// Función para confirmar la transferencia
const confirmarTransferencia = async () => {
  if (!centroSeleccionado.value || !empresaSeleccionada.value) {
    toast.open({ 
      message: 'Por favor seleccione una empresa y un centro de trabajo', 
      type: 'warning' 
    });
    return;
  }

  try {
    transferenciaEnProceso.value = true;
    
    const response = await trabajadores.transferirTrabajador(
      empresas.currentEmpresaId,
      centrosTrabajo.currentCentroTrabajoId,
      trabajadores.currentTrabajador._id,
      centroSeleccionado.value._id || centroSeleccionado.value,
      empresaSeleccionada.value,
    );

    const empresaNombre = empresasDisponibles.value.find(e => e._id === empresaSeleccionada.value)?.nombreComercial || 'la empresa seleccionada';
    const centroNombre = centroSeleccionado.value.nombreCentro || centroSeleccionado.value;

    if (response?.posibleDuplicado) {
      toast.open({
        message: `Trabajador transferido a ${empresaNombre} (${centroNombre}). Posible duplicado detectado (${etiquetaCriterioDuplicado(response.posibleDuplicado.criterio, identificadorPersonalLabel.value)}).`,
        type: 'warning',
      });
    } else {
      toast.open({ 
        message: `Trabajador transferido exitosamente a ${empresaNombre} (${centroNombre})`, 
        type: 'success' 
      });
    }

    // Cerrar modales y actualizar la lista
    forceCloseTransfer();
    forceClose();
    trabajadores.fetchTrabajadoresConHistoria(empresas.currentEmpresaId, centrosTrabajo.currentCentroTrabajoId);
  } catch (error) {
    console.error('Error al transferir trabajador:', error);
    
    let errorMessage = 'Error al transferir el trabajador';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    toast.open({ message: errorMessage, type: 'error' });
  } finally {
    transferenciaEnProceso.value = false;
  }
};

// Función para cancelar la transferencia
const closeTransferModal = () => {
  mostrarModalTransferencia.value = false;
  empresaSeleccionada.value = null;
  centroSeleccionado.value = null;
  centrosDisponibles.value = [];
  empresaSearch.value = '';
  empresaSearchDebounced.value = '';
};

const isTransferDirty = computed(() =>
  Boolean(empresaSeleccionada.value || centroSeleccionado.value),
);

const {
  showDiscardConfirm: showTransferDiscardConfirm,
  dismissPulse: transferDismissPulse,
  requestDismiss: requestTransferDismiss,
  forceClose: forceCloseTransfer,
  continueEditing: continueTransferEditing,
  confirmDiscard: confirmTransferDiscard,
} = useModalDirtyGuard({
  isDirty: isTransferDirty,
  onClose: closeTransferModal,
  enabled: () =>
    mostrarModalTransferencia.value && !transferenciaEnProceso.value,
});
</script>

<template>
  <div>
  <div class="modal modal-trabajadores fixed top-0 left-0 z-40 p-4 sm:p-8 h-screen w-full flex items-center justify-center">
    <!-- Fondo oscuro transparente -->
    <div
      class="modal-work-overlay absolute top-0 left-0 w-full h-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm"
      :class="{ 'modal-backdrop-pulse': dismissPulse }"
      @click="requestDismiss"
    >
    </div>
    <!-- Modal centrado con desplazamiento interno -->
    <div
      ref="panelEl"
      class="modal-work-panel modal-inner relative bg-white text-gray-900 w-full sm:w-[92%] md:w-4/5 lg:w-3/4 xl:w-2/3 2xl:max-w-5xl 2xl:w-4/5 p-6 sm:p-8 md:p-10 rounded-lg shadow-md shadow-slate-900 max-h-[90vh] overflow-y-auto"
      :class="{ 'modal-dismiss-pulse': dismissPulse }"
      style="overflow-x: visible;">
        <!-- Botón para cerrar el modal -->
        <div
          class="modal-close absolute h-16 w-16 flex justify-center items-center top-0 right-0 text-5xl text-gray-400 hover:text-gray-500 cursor-pointer"
          @click="requestDismiss">
          &times;
        </div>

        <div v-if="trabajadores.loadingModal">
          <h1 class="text-3xl text-center">Cargando trabajador...</h1>
        </div>
        <!-- Registrado: siguiente paso -->
        <div v-else-if="registrado" class="registro-exitoso py-6 sm:py-10 text-center" role="status">
          <div class="registro-exitoso__icono mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <i class="fa-solid fa-check text-3xl" aria-hidden="true"></i>
          </div>
          <h1 class="text-2xl sm:text-3xl font-semibold">{{ registrado.titulo }}</h1>
          <p class="registro-exitoso__nombre mt-2 text-lg text-gray-700">{{ registrado.nombre }}</p>
          <p
            v-if="registrado.datos.length"
            class="registro-exitoso__datos mt-1.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-600"
          >
            <span
              v-for="dato in registrado.datos"
              :key="dato.titulo"
              :title="dato.titulo"
              class="inline-flex items-center gap-1.5"
            >
              <i :class="dato.icono" class="text-xs" aria-hidden="true"></i>
              <span class="sr-only">{{ dato.titulo }}:</span>
              {{ dato.texto }}
            </span>
          </p>
          <p class="mt-5 text-sm text-gray-500">¿Qué sigue?</p>
          <div class="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              ref="botonAbrirExpedienteEl"
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              @click="abrirExpedienteRegistrado"
            >
              <i class="fa-solid fa-folder-open" aria-hidden="true"></i>
              Abrir expediente
            </button>
            <button
              type="button"
              class="registro-exitoso__otro inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300 px-5 py-3 text-base font-medium text-emerald-700 transition-colors hover:border-emerald-400 hover:bg-emerald-50"
              @click="registrarOtro"
            >
              <i class="fa-solid fa-user-plus" aria-hidden="true"></i>
              Registrar otro
            </button>
          </div>
          <button
            type="button"
            class="mt-5 text-sm text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
            @click="forceClose"
          >
            Volver a la lista de trabajadores
          </button>
        </div>
        <!-- Contenido del modal -->
        <div v-else>
          <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2">
            <h1 class="text-2xl sm:text-3xl text-center sm:text-left w-full sm:w-auto">
              {{ trabajadores.currentTrabajador._id ? 'Editar Trabajador' : 'Registrar Trabajador' }}
            </h1>
            <!-- Baja y transferencia: solo al editar un trabajador existente -->
            <div
              v-if="trabajadores.currentTrabajador._id"
              class="mr-8 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
            >
              <button
                v-if="puedeDarseDeBaja"
                type="button"
                class="modal-trabajadores__btn-baja inline-flex w-full items-center justify-center gap-2 rounded-md border border-orange-300 px-3 py-2 text-xs text-orange-600 transition-colors duration-200 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 sm:w-auto sm:py-1 sm:text-sm md:text-base"
                title="Dar de baja: archiva al trabajador sin eliminar su expediente"
                @click="mostrarModalBaja = true"
              >
                <i class="fa-solid fa-person-arrow-down-to-line text-sm"></i>
                <span>Dar de baja</span>
              </button>
              <button
                type="button"
                class="inline-flex w-full items-center justify-center gap-2 sm:w-auto text-xs sm:text-sm md:text-base px-3 py-2 sm:py-1 text-emerald-600 hover:text-emerald-700 border border-emerald-300 hover:border-emerald-400 rounded-md transition-colors duration-200 hover:bg-emerald-50"
                @click="transferirTrabajador"
                title="Transferir a otro centro de trabajo">
                <i class="fa-solid fa-right-left text-sm"></i>
                <span>Transferir<span class="inline sm:hidden"> a otro centro de trabajo</span></span>
              </button>
            </div>
          </div>
          <p
            v-if="identificationSectionNotice"
            class="grid text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 mb-3"
            :role="verificandoDetalle ? 'status' : undefined"
            data-testid="aviso-identificacion"
          >
            <span
              v-for="aviso in avisosPosiblesIdentificacion"
              :key="aviso"
              class="col-start-1 row-start-1 invisible"
              aria-hidden="true"
            ><i class="fa-solid fa-spinner mr-1"></i>{{ aviso }}</span>
            <span class="col-start-1 row-start-1">
              <i
                v-if="verificandoDetalle"
                class="fa-solid fa-spinner fa-spin mr-1"
                aria-hidden="true"
                data-testid="verificando-identificacion"
              ></i>{{ identificationSectionNotice }}
            </span>
          </p>
          <div
            v-if="posibleDuplicadoRegistro"
            class="mb-4 p-4 rounded-lg border border-amber-300 bg-amber-50 text-sm text-amber-900 dark:border-amber-600/70 dark:bg-amber-950/45 dark:text-amber-100"
          >
            <p class="font-medium text-amber-900 dark:text-amber-100">
              Posible duplicado detectado
              ({{ etiquetaCriterioDuplicado(posibleDuplicadoRegistro.criterio, identificadorPersonalLabel) }})
            </p>
            <p class="mt-1 text-amber-900/90 dark:text-amber-100/90">
              Coincide con:
              {{ formatNombreCompleto(posibleDuplicadoRegistro.trabajador) }}
              — Folio {{ posibleDuplicadoRegistro.trabajador?.folio || 'N/D' }}
            </p>
            <div class="flex flex-wrap gap-2 mt-3">
              <button
                v-if="canEliminarFusionarTrabajadores"
                type="button"
                class="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                @click="abrirFusionDesdeAlta"
              >
                Fusionar ahora
              </button>
              <button
                type="button"
                class="px-3 py-1.5 rounded-md border border-gray-300 text-xs text-amber-900 hover:bg-white dark:border-slate-500 dark:bg-slate-800/70 dark:text-amber-100 dark:hover:bg-slate-700 dark:hover:border-slate-400"
                @click="posponerRevisionDuplicado"
              >
                Revisar más tarde
              </button>
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-1 mb-3">Los campos con <span class="text-red-500 font-medium">*</span> son obligatorios</p>
          <hr class="mt-2 mb-3">

          <div ref="formRootEl">
          <FormKit type="form" :actions="false" :incomplete-message="false"
            @node="formNode = $event"
            @submit="handleSubmit" @submit-invalid="onFormSubmitInvalid" @input="formData = $event">
            <section>
              <h3 class="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1 mb-3">Identificación</h3>
              <div class="lg:grid gap-3 lg:grid-cols-2">
              <div>
                <!-- México: validación RENAPO según régimen -->
                <FormKit
                  v-if="isMxProveedor"
                  type="text"
                  :label="identificadorPersonalLabel"
                  name="curp"
                  :placeholder="identificadorPersonalPlaceholder"
                  :validation="mxWorkerCurpValidationRules"
                  :validation-messages="mxCurpValidationMessages"
                  maxlength="18"
                  :disabled="isCurpFieldReadOnly"
                  v-model="curpValue"
                >
                  <template #label>
                    <span class="flex w-full items-baseline justify-between gap-2">
                      <span class="font-medium text-lg text-gray-700">
                        {{ identificadorPersonalLabel }}<span v-if="workerCurpRequired" class="text-red-500">*</span>
                      </span>
                      <button
                        v-if="!isCurpFieldReadOnly && !requiresGenericCurp"
                        type="button"
                        @click.stop.prevent="insertGenericCURP"
                        class="shrink-0 text-xs font-normal text-gray-400 hover:text-gray-600 focus:outline-none transition-colors duration-200"
                        title="Usar CURP genérica para paciente desconocido o extranjero (XXXX999999XXXXXX99)"
                      >
                        <i class="fas fa-info-circle mr-1"></i>
                        Usar CURP genérica
                      </button>
                      <span
                        v-else-if="requiresGenericCurp"
                        class="shrink-0 text-xs font-normal text-gray-500"
                        title="Con entidad NO ESPECIFICADO o SE IGNORA solo aplica la CURP genérica"
                      >
                        CURP genérica obligatoria
                      </span>
                    </span>
                  </template>
                </FormKit>
                <p
                  v-if="isMxProveedor && requiresGenericCurp"
                  class="text-xs text-gray-500 mt-1 mb-2"
                >
                  Para «NO ESPECIFICADO» o «SE IGNORA», debe usarse XXXX999999XXXXXX99.
                </p>
                <CurpInlineFeedback
                  v-if="isMxProveedor"
                  :curp="curpValue"
                  :invalid-positions="curpInvalidPositions"
                  :warning-positions="curpWarningPositions"
                  :valid-positions="curpValidPositions"
                  :issues="curpIssues"
                  :suggestion="requiresGenericCurp ? null : curpPrefixSuggestion"
                  :can-apply-suggestion="!isCurpFieldReadOnly && !requiresGenericCurp"
                  @apply-suggestion="applyCurpSuggestion"
                />
                <!-- LATAM: identificador local (DPI, cédula, etc.) sin validación de formato -->
                <FormKit
                  v-else
                  type="text"
                  :label="identificadorPersonalLabel"
                  name="curp"
                  :placeholder="identificadorPersonalPlaceholder"
                  maxlength="30"
                  :disabled="isCurpFieldReadOnly"
                  v-model="curpValue"
                >
                  <template #label>
                    <span class="font-medium text-lg text-gray-700">
                      {{ identificadorPersonalLabel }}
                    </span>
                  </template>
                </FormKit>
              </div>
              <!-- Folio NOM-024: solo lectura, a la derecha de CURP cuando ya existe -->
              <div>
                <template v-if="trabajadores.currentTrabajador?.folio">
                  <label class="block font-medium text-lg text-gray-700 mb-1">
                    Folio (Identificador en la UM)
                  </label>
                  <div
                    class="w-full h-15 p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-mono text-sm flex items-center"
                  >
                    {{ trabajadores.currentTrabajador.folio }}
                  </div>
                  <p class="text-xs text-gray-500 mt-1">
                    Identificador único dentro de tu organización. Se asigna automáticamente al registrar y no cambia.
                  </p>
                </template>
              </div>
              <div>
                <FormKit type="text" label="Primer Apellido" name="primerApellido" placeholder="Apellido paterno"
                    :validation="optionalPersonNameValidation"
                    :validation-messages="personNameValidationMessages"
                    :maxlength="PERSON_NAME_MAX_LENGTH"
                    :disabled="isCurpConformationReadOnly"
                    v-model="primerApellidoField"
                    @blur="normalizePersonNameField('primerApellido')" />
                <CurpRelatedFieldMessages
                  v-if="isMxProveedor"
                  :messages="curpRelatedFieldMessages.primerApellido"

                />
              </div>
              <div>
                <FormKit type="text" label="Segundo Apellido" name="segundoApellido" placeholder="Apellido materno"
                    :validation="optionalPersonNameValidation"
                    :validation-messages="personNameValidationMessages"
                    :maxlength="PERSON_NAME_MAX_LENGTH"
                    :disabled="isSegundoApellidoDisabled"
                    v-model="segundoApellidoField"
                    @blur="normalizePersonNameField('segundoApellido')" />
                <p
                  v-if="!hasPrimerApellido && !isCurpConformationReadOnly"
                  class="text-xs text-gray-500 mt-1"
                >
                  Capture primero el primer apellido para habilitar el segundo.
                </p>
                <CurpRelatedFieldMessages
                  v-if="isMxProveedor"
                  :messages="curpRelatedFieldMessages.segundoApellido"

                />
              </div>
              <div>
                <FormKit type="text" name="nombre" placeholder="Nombres del trabajador"
                    :validation="requiredPersonNameValidation"
                    :validation-messages="personNameValidationMessages"
                    :maxlength="PERSON_NAME_MAX_LENGTH"
                    :disabled="isCurpConformationReadOnly"
                    v-model="nombreField"
                    @blur="normalizePersonNameField('nombre')">
                  <template #label>
                    <span class="font-medium text-lg text-gray-700">Nombre(s)<span class="text-red-500">*</span></span>
                  </template>
                </FormKit>
                <CurpRelatedFieldMessages
                  v-if="isMxProveedor"
                  :messages="curpRelatedFieldMessages.nombre"

                />
              </div>
              <div v-if="isSIRES" class="grid gap-3 grid-cols-2">
                <div>
                  <FormKit type="select" name="sexo" placeholder="-Selecciona-"
                    :options="['Masculino', 'Femenino', 'Intersexual']" validation="required"
                    :validation-messages="{ required: 'Este campo es obligatorio' }"
                    :disabled="isSexoBiologicoReadOnly"
                    :value="trabajadores.currentTrabajador?.sexo || ''">
                    <template #label>
                      <span class="font-medium text-lg text-gray-700">
                        Sexo Biológico<span class="text-red-500">*</span>
                      </span>
                    </template>
                  </FormKit>
                </div>
                <div>
                  <FormKit type="select" name="sexoCURP" placeholder="-Selecciona-"
                    :options="TRABAJADOR_SEXO_CURP_OPTIONS"
                    validation="required"
                    :validation-messages="{ required: 'Este campo es obligatorio' }"
                    :disabled="isCurpConformationReadOnly"
                    :value="trabajadores.currentTrabajador?.sexoCURP ?? ''">
                    <template #label>
                      <span class="font-medium text-lg text-gray-700">Sexo CURP<span class="text-red-500">*</span></span>
                    </template>
                  </FormKit>
                  <CurpRelatedFieldMessages
                    v-if="isMxProveedor"
                    :messages="curpRelatedFieldMessages.sexoCURP"
  
                  />
                </div>
              </div>
              <div v-else>
                <FormKit type="select" name="sexo" placeholder="-Seleccione un sexo-"
                  :options="['Masculino', 'Femenino', 'Intersexual']" validation="required"
                  :validation-messages="{ required: 'Este campo es obligatorio' }"
                  :disabled="isCurpConformationReadOnly"
                  :value="trabajadores.currentTrabajador?.sexo || ''">
                  <template #label>
                    <span class="font-medium text-lg text-gray-700">Sexo<span class="text-red-500">*</span></span>
                  </template>
                </FormKit>
                <CurpRelatedFieldMessages
                  v-if="isMxProveedor"
                  :messages="curpRelatedFieldMessages.sexo"

                />
              </div>
              <div>
                <FormKit type="date" name="fechaNacimiento"
                  validation="required"
                  :validation-messages="{ required: 'Este campo es obligatorio' }"
                  :min="fechaNacimientoMin"
                  :max="fechaNacimientoMax"
                  :disabled="isCurpConformationReadOnly"
                  :value="convertirFechaISOaYYYYMMDD(trabajadores.currentTrabajador?.fechaNacimiento) || ''">
                  <template #label>
                    <span class="font-medium text-lg text-gray-700">Fecha de Nacimiento<span class="text-red-500">*</span></span>
                  </template>
                </FormKit>
                <FechaNacimientoRegistroFeedback
                  :min-years="TRABAJADOR_EDAD_MINIMA"
                  :max-years="TRABAJADOR_EDAD_MAXIMA"
                  :fecha-nacimiento="fechaNacimientoRegistro"
                />
                <CurpRelatedFieldMessages
                  v-if="isMxProveedor"
                  :messages="curpRelatedFieldMessages.fechaNacimiento"

                />
              </div>
              </div>
            </section>

            <section>
              <h3 class="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1 mb-3 mt-5">Datos personales</h3>
              <div class="lg:grid gap-3 lg:grid-cols-2">
                <FormKit type="select" name="escolaridad" :options="opcionesEscolaridad"
                  :value="escolaridadDefaultValue">
                  <template #label>
                    <span class="font-medium text-lg text-gray-700">Escolaridad</span>
                  </template>
                </FormKit>
                <FormKit type="select" name="estadoCivil" :options="opcionesEstadoCivil"
                  :value="trabajadores.currentTrabajador?.estadoCivil || ''">
                  <template #label>
                    <span class="font-medium text-lg text-gray-700">Estado Civil</span>
                  </template>
                </FormKit>
              </div>
            </section>

            <section>
              <h3 class="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1 mb-3 mt-5">Datos laborales</h3>
              <div class="lg:grid gap-3 lg:grid-cols-2">
                <FormKit type="text" name="puesto" placeholder="Puesto al que aspira o desempeña" validation="required"
                  :validation-messages="{ required: 'Este campo es obligatorio' }"
                  :value="trabajadores.currentTrabajador?.puesto || ''">
                  <template #label>
                    <span class="font-medium text-lg text-gray-700">Puesto<span class="text-red-500">*</span></span>
                  </template>
                </FormKit>
                <FormKit type="date" name="fechaIngreso" 
                  :value="convertirFechaISOaYYYYMMDD(trabajadores.currentTrabajador?.fechaIngreso) || ''">
                  <template #label>
                    <span class="font-medium text-lg text-gray-700">Fecha de Ingreso</span>
                  </template>
                </FormKit>
                <FormKit type="text" label="Número de Empleado" name="numeroEmpleado" placeholder="Sólo números"
                  validation="optional|matches:/^[0-9]*$/"
                  :validation-messages="{
                    matches: 'El número de empleado debe estar vacío o contener solo números entre 1 y 7 dígitos'
                  }"
                  maxlength="7" :value="trabajadores.currentTrabajador?.numeroEmpleado || ''" />
                <FormKit type="text" label="NSS" name="nss" placeholder="Número de Seguro Social"
                  validation="optional|nssValidation"
                  :validation-messages="{
                    nssValidation: 'Debe tener 4-30 caracteres alfanuméricos'
                  }"
                  maxlength="30" :value="trabajadores.currentTrabajador?.nss || ''" />
              </div>
            </section>

            <section>
              <h3 class="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1 mb-3 mt-5">Contacto</h3>
              <div class="lg:grid gap-3 lg:grid-cols-2">
                <FormKit type="text" label="Teléfono" name="telefono" placeholder="Número de teléfono"
                  validation="optional|phoneValidation" 
                  :validation-messages="{ phoneValidation: 'El número de teléfono debe tener entre 4 y 15 dígitos' }"
                  :value="trabajadores.currentTrabajador?.telefono || ''" />
                <div class="hidden lg:block"></div>
                <FormKit type="text" label="Nombre contacto de emergencia" name="contactoEmergenciaNombre"
                  placeholder="Ej: María López García"
                  :value="trabajadores.currentTrabajador?.contactoEmergenciaNombre || ''" />
                <FormKit type="text" label="Teléfono contacto de emergencia" name="contactoEmergenciaTelefono"
                  placeholder="Número de teléfono"
                  validation="optional|phoneValidation"
                  :validation-messages="{ phoneValidation: 'El número de teléfono debe tener entre 4 y 15 dígitos' }"
                  :value="trabajadores.currentTrabajador?.contactoEmergenciaTelefono || ''" />
              </div>
            </section>

            <!-- NOM-024: nacimiento y residencia (solo SIRES_NOM024) -->
            <section v-if="isSIRES">
                <!-- Campos de Nacimiento -->
                <div>
                  <h3 class="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1 mb-3 mt-5">Nacimiento</h3>
                  <div class="grid gap-3 sm:grid-cols-2">
                    <div data-campo="entidadNacimiento">
                      <EstadoAutocomplete
                        v-model="nom024NacimientoFields.entidadNacimiento"
                        label="Entidad de Nacimiento"
                        placeholder="Buscar por nombre del estado"
                        :required="geoFieldsRequired"
                        :disabled="isCurpConformationReadOnly"
                        geo-context="trabajador"
                        :pais-nacimiento="nom024NacimientoFields.paisNacimiento"
                      />
                      <CurpRelatedFieldMessages
                        :messages="curpRelatedFieldMessages.entidadNacimiento"
                      />
                    </div>
                    
                    <div data-campo="paisNacimiento">
                      <PaisNacimientoAutocomplete
                        v-model="nom024NacimientoFields.paisNacimiento"
                        label="País de nacimiento"
                        placeholder="Buscar por nombre de país..."
                        :required="geoFieldsRequired"
                        :disabled="isPaisNacimientoReadOnly"
                        geo-context="trabajador"
                      />
                    </div>
                  </div>
                </div>

                <!-- Campos de Residencia -->
                <div data-campo="residencia">
                  <h3 class="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1 mb-3 mt-5">Residencia</h3>
                  <ResidenciaGeoAutocomplete
                    :estadoResidencia="nom024ResidenciaFields.entidadResidencia"
                    :municipioResidencia="nom024ResidenciaFields.municipioResidencia"
                    :localidadResidencia="nom024ResidenciaFields.localidadResidencia"
                    :pais-residencia="nom024ResidenciaFields.paisResidencia"
                    @update:estadoResidencia="nom024ResidenciaFields.entidadResidencia = $event"
                    @update:municipioResidencia="nom024ResidenciaFields.municipioResidencia = $event"
                    @update:localidadResidencia="nom024ResidenciaFields.localidadResidencia = $event"
                    :required="geoFieldsRequired"
                    geo-context="trabajador"
                  >
                    <template #pais>
                      <PaisNacimientoAutocomplete
                        v-model="nom024ResidenciaFields.paisResidencia"
                        label="País de residencia"
                        placeholder="Buscar por nombre de país..."
                        :required="geoFieldsRequired"
                        geo-context="trabajador"
                      />
                    </template>
                  </ResidenciaGeoAutocomplete>
                </div>
            </section>

            <!-- Campos ocultos para NOM-024 (para que FormKit los capture en el submit) -->
            <!-- Solo validar si es SIRES_NOM024, pero siempre enviar valores para compatibilidad -->
            <FormKit 
              type="hidden" 
              name="entidadNacimiento" 
              v-model="nom024NacimientoFields.entidadNacimiento"
              :validation="nom024FieldValidation"
              :validation-messages="{ required: 'Este campo es obligatorio' }"
            />
            <FormKit 
              type="hidden" 
              name="paisNacimiento" 
              v-model="nom024NacimientoFields.paisNacimiento"
              :validation="nom024FieldValidation"
              :validation-messages="{ required: 'Este campo es obligatorio' }"
            />
            <FormKit 
              type="hidden" 
              name="entidadResidencia" 
              v-model="nom024ResidenciaFields.entidadResidencia"
              :validation="nom024FieldValidation"
              :validation-messages="{ required: 'Este campo es obligatorio' }"
            />
            <FormKit 
              type="hidden" 
              name="paisResidencia" 
              v-model="nom024ResidenciaFields.paisResidencia"
              :validation="nom024FieldValidation"
              :validation-messages="{ required: 'Este campo es obligatorio' }"
            />
            <FormKit 
              type="hidden" 
              name="municipioResidencia" 
              v-model="nom024ResidenciaFields.municipioResidencia"
              :validation="nom024FieldValidation"
              :validation-messages="{ required: 'Este campo es obligatorio' }"
            />
            <FormKit 
              type="hidden" 
              name="localidadResidencia" 
              v-model="nom024ResidenciaFields.localidadResidencia"
              :validation="nom024FieldValidation"
              :validation-messages="{ required: 'Este campo es obligatorio' }"
            />

            <!-- Campos ocultos y botón de enviar -->
            <FormKit type="hidden" name="idCentroTrabajo" :value="centrosTrabajo.currentCentroTrabajoId" />

            <hr class="my-3">
            <div
              v-if="camposConError.length"
              role="alert"
              class="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <p class="font-medium">
                Revisa {{ camposConError.length === 1 ? 'el campo marcado' : 'los campos marcados' }} en rojo:
              </p>
              <p class="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                <button
                  v-for="campo in camposConError"
                  :key="campo.name"
                  type="button"
                  class="text-red-700 underline underline-offset-2 hover:text-red-800"
                  @click="irACampo(campo.name)"
                >
                  {{ campo.etiqueta }}
                </button>
              </p>
            </div>
            <FormKit type="submit" :disabled="isSubmitting || verificandoDetalle">
              <span v-if="isSubmitting">Guardando...</span>
              <span v-else>{{ trabajadores.currentTrabajador._id ? 'Actualizar Trabajador' : 'Guardar Trabajador'
                }}</span>
            </FormKit>
          </FormKit>
          </div>
        </div>

        <button
          v-if="!registrado"
          class="text-xl mt-2 w-full rounded-lg bg-white font-semibold text-gray-800 shadow-sm ring-2 ring-inset ring-gray-300 hover:bg-gray-100 p-3 transition-transform duration-300 transform hover:scale-105 hover:shadow-lg flex-1"
          @click="requestDismiss">
          Cerrar
        </button>
      </div>

    <ModalDiscardConfirmDialog
      :open="showDiscardConfirm"
      @continue-editing="continueEditing"
      @discard="confirmDiscard"
    />

    <ModalCurpInconvenientWordConfirm
      :open="showCurpInconvenientConfirm"
      :word="curpInconvenientWord"
      @confirm="confirmCurpInconvenientWord"
      @close="cancelCurpInconvenientWord"
    />

    <!-- Modal de transferencia -->
    <Transition
      appear
      name="modal-work"
      :duration="{ enter: 230, leave: 150 }"
    >
      <div
        v-if="mostrarModalTransferencia"
        class="modal modal-transferencia fixed inset-0 z-50 p-4 grid place-items-center"
      >
        <div
          class="modal-work-overlay absolute inset-0 bg-emerald-900 bg-opacity-50 backdrop-blur-sm"
          :class="{ 'modal-backdrop-pulse': transferDismissPulse }"
          @click="requestTransferDismiss"
        />
        <div
          class="modal-work-panel modal-inner relative bg-white text-gray-900 w-full sm:w-[82%] md:w-[70%] lg:w-2/3 xl:w-[60%] 2xl:max-w-4xl 2xl:w-4/5 p-6 sm:p-8 md:p-10 rounded-lg shadow-md shadow-slate-900 max-h-[85vh] overflow-y-auto"
          :class="{ 'modal-dismiss-pulse': transferDismissPulse }"
          @click.stop
        >
          <!-- Header del modal -->
          <div class="flex justify-between items-start mb-3">
            <div>
              <h2 class="text-3xl font-semibold text-gray-900 leading-tight">Transferir Trabajador</h2>
              <p class="mt-1 text-sm text-gray-500">Selecciona una empresa destino y luego un centro de trabajo.</p>
            </div>
            <button
              @click="requestTransferDismiss"
              class="text-gray-400 hover:text-gray-600 text-2xl"
              :disabled="transferenciaEnProceso">
              &times;
            </button>
          </div>

          <!-- Sección: Resumen del trabajador -->
          <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-6">
            
            <!-- Información principal -->
            <div class="mb-3 flex gap-3">
              <p class="text-xl font-semibold text-emerald-700">
                {{ formatNombreCompleto(trabajadores.currentTrabajador) }}
                <!-- Número de empleado -->
              </p>
              <div v-if="trabajadores.currentTrabajador?.numeroEmpleado" class="flex items-center gap-2 text-sm">
                <i class="fas fa-id-badge text-purple-500"></i>
                <span class="text-emerald-700">No. {{ trabajadores.currentTrabajador.numeroEmpleado }}</span>
              </div>
            </div>
            
            <!-- Información detallada -->
            <div class="flex flex-wrap gap-3 text-sm">
              <!-- Sexo -->
              <div v-if="trabajadores.currentTrabajador?.sexo" class="flex items-center gap-2">
                <i v-if="trabajadores.currentTrabajador?.sexo === 'Masculino'" class="fas fa-mars text-sky-600"></i>
                <i v-else-if="trabajadores.currentTrabajador?.sexo === 'Femenino'" class="fas fa-venus text-rose-600"></i>
                <span v-else class="text-violet-600 text-base leading-none" aria-hidden="true">⚥</span>
                <span class="text-emerald-700">{{ trabajadores.currentTrabajador.sexo }}</span>
              </div>
              
              <!-- Edad -->
              <div v-if="trabajadores.currentTrabajador?.fechaNacimiento" class="flex items-center gap-2">
                <i class="fas fa-birthday-cake text-emerald-500"></i>
                <span class="text-emerald-700">{{ calcularEdad(trabajadores.currentTrabajador.fechaNacimiento) }} años</span>
              </div>
              
              <!-- Puesto -->
              <div v-if="trabajadores.currentTrabajador?.puesto" class="flex items-center gap-2">
                <i class="fas fa-briefcase text-blue-500"></i>
                <span class="text-emerald-700">{{ trabajadores.currentTrabajador.puesto }}</span>
              </div>
              
              <!-- Antigüedad -->
              <div v-if="trabajadores.currentTrabajador?.fechaIngreso" class="flex items-center gap-2">
                <i class="fas fa-clock text-cyan-500"></i>
                <span class="text-emerald-700">{{ calcularAntiguedad(trabajadores.currentTrabajador.fechaIngreso) }}</span>
              </div>

              <!-- Ubicación actual de expediente (compacto, en línea, sin aumentar altura) -->
              <div class="flex items-center gap-2 text-sm">
                <span class="text-xs font-semibold text-gray-600">Ubicación actual de expediente:</span>
                <span class="inline-flex items-center gap-1 text-emerald-700 leading-none">
                  <i class="fas fa-building text-emerald-500"></i>
                  {{ empresas.currentEmpresa?.nombreComercial }}
                </span>
                <span class="text-gray-300">•</span>
                <span class="inline-flex items-center gap-1 text-sky-700 leading-none">
                  <i class="fas fa-map-marker-alt text-sky-500"></i>
                  {{ centrosTrabajo.currentCentroTrabajo?.nombreCentro }}
                </span>
              </div>
              
            </div>
          </div>

          <!-- Separador visual -->
          <div class="border-t border-gray-200 my-3"></div>

          <!-- Sección: Empresa destino -->
          <h3 class="text-lg font-medium text-gray-800 mb-1">Empresa destino</h3>
          <div class="mb-6">
              <div class="relative">
                <input
                  v-model="empresaSearch"
                  type="text"
                  class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  :disabled="transferenciaEnProceso || loadingEmpresas"
                  placeholder="Busca por nombre, razón social o RFC" />
                <span class="absolute inset-y-0 right-2 flex items-center text-gray-400">
                  <i class="fas fa-search"></i>
                </span>
              </div>
              <EmpresasSelector
                :loading="loadingEmpresas"
                :empresas="empresasDisponibles"
                :visibleEmpresas="visibleEmpresas"
                :filteredCount="filteredEmpresas.length"
                :selectedId="empresaSeleccionada"
                @select="(empresa) => { empresaSeleccionada = empresa._id; onEmpresaSeleccionada(); }"
              />
               <div v-if="empresaSeleccionada" class="mt-2">
                 <div class="flex items-center gap-3 p-2 rounded-lg border-2 border-emerald-300 bg-emerald-50">
                  <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center text-white font-bold">
                    {{ getEmpresaIniciales(empresasDisponibles.find(e => e._id === empresaSeleccionada) || {}) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-emerald-800 font-semibold truncate">{{ (empresasDisponibles.find(e => e._id === empresaSeleccionada)?.nombreComercial) || 'Empresa seleccionada' }}</span>
                      <span class="text-[10px] uppercase tracking-wide font-semibold text-emerald-700 bg-emerald-100 border border-emerald-300 rounded px-2 py-0.5">Seleccionada</span>
                    </div>
                    <div class="text-xs text-emerald-700 truncate">{{ (empresasDisponibles.find(e => e._id === empresaSeleccionada)?.razonSocial) || '' }}</div>
                  </div>
                </div>
              </div>
          </div>

          <!-- Sección: Centro destino -->
          <div v-if="empresaSeleccionada" class="mb-6">
            <h3 class="text-lg font-medium text-gray-800 mb-1">Centro de trabajo destino</h3>
              <div v-if="centrosDisponibles.length === 0 && !loadingEmpresas" class="text-sm text-gray-500 italic">
                No hay centros disponibles para esta empresa
              </div>
               <div v-else class="space-y-2 max-h-60 overflow-y-auto p-2">
                <template v-if="loadingEmpresas">
                  <div v-for="n in 3" :key="n" class="group">
                    <div class="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden">
                      <div class="w-full text-left p-3">
                        <div class="flex items-start gap-3 animate-pulse">
                          <div class="w-10 h-10 bg-gray-200 rounded-xl"></div>
                          <div class="flex-1">
                            <div class="h-4 w-1/2 bg-gray-200 rounded mb-2"></div>
                            <div class="h-3 w-1/3 bg-gray-100 rounded mb-3"></div>
                            <div class="h-3 w-24 bg-gray-200 rounded"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
                <div v-else v-for="centro in centrosDisponibles" :key="centro._id" class="group" :ref="(el) => registerCentroObserver(el, centro)">
                  <div class="bg-white rounded-2xl shadow-sm border-2 border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
                       :class="[
                         (centroSeleccionado?._id === centro._id || (typeof centroSeleccionado === 'string' && centroSeleccionado === centro._id))
                           ? 'bg-emerald-50 border-emerald-500 shadow-lg ring-2 ring-emerald-300'
                           : ''
                       ]">
                    <!-- Contenido principal -->
                    <button type="button"
                        class="w-full text-left p-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        :class="(centroSeleccionado?._id === centro._id || (typeof centroSeleccionado === 'string' && centroSeleccionado === centro._id)) ? 'bg-emerald-50' : 'hover:bg-gray-100'"
                        @click="centroSeleccionado = centro"
                        :disabled="transferenciaEnProceso">
                        
                        <!-- Header con icono y título -->
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-sm">
                                    <i class="fas fa-building text-white text-lg"></i>
                                </div>
                                <div>
                                    <h3 class="text-xl font-bold text-gray-900 mb-0.5">{{ centro.nombreCentro }}</h3>
                                    <p class="text-sm text-gray-500 mb-0.5">
                                      {{ empresasDisponibles.find(e => e._id === empresaSeleccionada)?.nombreComercial || '' }}
                                    </p>
                                    <div class="flex items-center gap-2">
                                        <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                        <span v-if="loadingTrabajadores" class="text-sm text-gray-400">
                                            <i class="fas fa-spinner fa-spin mr-1"></i>
                                            Contando...
                                        </span>
                                        <span v-else class="text-sm text-gray-600">
                                            {{ trabajadoresPorCentro[centro._id] || 0 }} {{ (trabajadoresPorCentro[centro._id] || 0) === 1 ? 'trabajador' : 'trabajadores' }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Indicador de selección -->
                            <div v-if="centroSeleccionado?._id === centro._id || (typeof centroSeleccionado === 'string' && centroSeleccionado === centro._id)" 
                                 class="opacity-100 transition-opacity duration-300 ml-2">
                                <i class="fas fa-check text-emerald-500 text-lg"></i>
                            </div>
                        </div>

                        <!-- Información de ubicación -->
                        <div class="space-y-1.5">
                            <div class="flex items-start gap-2">
                                <div class="w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center mt-0.5">
                                    <i class="fas fa-map-marker-alt text-gray-400 text-xs"></i>
                                </div>
                                <div class="flex-1">
                                    <p v-if="formatDireccion(centro)" class="text-gray-700 leading-relaxed text-sm">
                                        {{ formatDireccion(centro) }}
                                    </p>
                                    <p v-else class="text-gray-400 italic text-sm">
                                        Dirección no registrada
                                    </p>
                                </div>
                            </div>
                        </div>
                    </button>
                  </div>
                </div>
              </div>
          </div>

          <!-- Botones de acción -->
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              @click="requestTransferDismiss"
              class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
              :disabled="transferenciaEnProceso">
              Cancelar
            </button>
            <button
              @click="confirmarTransferencia"
              class="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!centroSeleccionado || !empresaSeleccionada || transferenciaEnProceso">
              <span v-if="transferenciaEnProceso" class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Transferiendo...
              </span>
              <span v-else>
                Transferir
              </span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <ModalDiscardConfirmDialog
      :open="showTransferDiscardConfirm"
      @continue-editing="continueTransferEditing"
      @discard="confirmTransferDiscard"
    />
  </div>

  <Transition
    appear
    name="modal-work"
    :duration="{ enter: 230, leave: 150 }"
  >
    <ModalFusionTrabajadores
      v-if="showFusionModal && posibleDuplicadoRegistro && nuevoTrabajadorId"
      :trabajador-a-id="nuevoTrabajadorId"
      :trabajador-b-id="posibleDuplicadoRegistro.trabajadorId"
      :posible-duplicado="posibleDuplicadoRegistro"
      @close="showFusionModal = false"
      @fused="onFusionCompletada"
      @descartado="onDuplicadoDescartado"
    />
  </Transition>
    <Transition
      appear
      name="modal-work"
      :duration="{ enter: 230, leave: 150 }"
    >
      <ModalBajaTrabajador
        v-if="mostrarModalBaja"
        :nombre-trabajador="formatNombreCompleto(trabajadores.currentTrabajador)"
        :confirmando="confirmandoBaja"
        @confirmar="confirmarBaja"
        @cancelar="mostrarModalBaja = false"
      />
    </Transition>
  </div>
</template>


<style scoped>
.fade-slow-enter-from,
.fade-slow-leave-to {
  opacity: 0;
}

.fade-slow-enter-active,
.fade-slow-leave-active {
  transition: all 500ms ease-out;
}

.fade-slow-leave-active {
  transition-delay: 250ms;
}
</style>