<script setup>
import { ref, inject, watch, computed, provide, onUnmounted } from 'vue';
import { useTecnicoFirmanteStore } from '@/stores/tecnicoFirmante';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useUserStore } from '@/stores/user';
import { useRouter, RouterLink } from 'vue-router';
import { useCurpPolicy } from '@/composables/useCurpPolicy';
import { useNom024Fields } from '@/composables/useNom024Fields';
import { useEntidadPaisNacimientoCoherence } from '@/composables/useEntidadPaisNacimientoCoherence';
import { useResidenciaGeoCoherence, initializeResidenciaGeoFields } from '@/composables/useEntidadPaisResidenciaCoherence';
import PaisNacimientoAutocomplete from '@/components/selectors/PaisNacimientoAutocomplete.vue';
import EstadoAutocomplete from '@/components/selectors/EstadoAutocomplete.vue';
import ResidenciaGeoAutocomplete from '@/components/selectors/ResidenciaGeoAutocomplete.vue';
import { convertirFechaISOaYYYYMMDD, isBirthDateInRegistrationRange, getRegistrationBirthDateInputBounds, buildRegistrationAgeRangeMessage } from '@/helpers/dates';
import { extractApiErrorMessage, extractCurpA1Issues, isCurpA1ApiError } from '@/helpers/apiErrors';
import {
  isPaisProhibidoFirmante,
  PAIS_PROHIBIDO_FIRMANTE_MESSAGE,
} from '@/helpers/paisNacimiento';
import { isMexicoPais } from '@/helpers/geoSelectorRules';
import { FIRMANTE_EDAD_MINIMA, FIRMANTE_EDAD_MAXIMA, PERSON_NAME_MAX_LENGTH, PERSON_NAME_VALIDATION_MESSAGE, PERSON_NAME_CHARACTERS_VALIDATION_MESSAGE, PERSON_NAME_CHARACTERS_SIN_REGIMEN_VALIDATION_MESSAGE } from '../../formkit.config';
import { formatearTituloYNombreFirmante } from '@/helpers/nombres';
import { useFirmanteIdentificationReadOnly } from '@/composables/useFirmanteIdentificationReadOnly';
import { processSignatorySignature } from '@/helpers/processProviderLogo';
import CurpInlineFeedback from '@/components/CurpInlineFeedback.vue';
import CurpRelatedFieldMessages from '@/components/CurpRelatedFieldMessages.vue';
import FechaNacimientoRegistroFeedback from '@/components/FechaNacimientoRegistroFeedback.vue';
import { useCurpLiveValidation } from '@/composables/useCurpLiveValidation';
import { useCurpInconvenientWordSubmitGuard } from '@/composables/useCurpInconvenientWordSubmitGuard';
import ModalCurpInconvenientWordConfirm from '@/components/ModalCurpInconvenientWordConfirm.vue';
import { useCurpFieldUppercase } from '@/composables/useCurpInputUppercase';
import { useFirmantePersonNameNormalization } from '@/composables/useFirmantePersonNameNormalization';
import {
  TRABAJADOR_SEXO_CURP_OPTIONS,
  isTrabajadorSexoCurp,
  parseSexoCurpValue,
  hasFirmanteSexoForPie,
} from '@/helpers/trabajadorSexoCurp';

const tecnicoFirmante = useTecnicoFirmanteStore();
const proveedorSaludStore = useProveedorSaludStore();
const userStore = useUserStore();
const router = useRouter();
const {
  curpRequired,
  showCurpField,
  isSIRES,
  isSinRegimen,
  paisNacimientoRequired,
  entidadNacimientoRequired,
  showEntidadNacimiento,
  sexoRequired,
  sexoCurpRequired,
} = useCurpPolicy();

const { geoFieldsRequired } = useNom024Fields();

const firmanteRecord = computed(() => tecnicoFirmante.tecnicoFirmante);
const {
  isCurpFieldReadOnly,
  isCurpConformationReadOnly,
  identificationSectionNotice,
  preserveImmutableIdentificationFields,
} = useFirmanteIdentificationReadOnly(firmanteRecord);

const nom024ResidenciaFields = ref({
  entidadResidencia: '',
  municipioResidencia: '',
  localidadResidencia: '',
  paisResidencia: '',
});

useResidenciaGeoCoherence(nom024ResidenciaFields, 'firmante');

const firmaPreview = ref(null);
const firmaArchivo = ref(null);
const procesandoFirma = ref(false);
const isDragOver = ref(false);

// URL de objeto de la vista previa, para liberarla al reemplazar o desmontar
let previewObjectUrl = null;

const revokePreviewUrl = () => {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }
};

onUnmounted(revokePreviewUrl);

const formularioTecnicoFirmante = ref({
  nombre: "",
  curp: "",
  primerApellido: "",
  segundoApellido: "",
  sexo: "",
  sexoCURP: "",
  tituloProfesional: "",
  numeroCedulaProfesional: "",
  nombreCredencialAdicional: "",
  numeroCredencialAdicional: "",
  paisNacimiento: "",
  entidadNacimiento: "",
  fechaNacimiento: "",
});

const {
  normalizePersonNameField,
  normalizePersonNamesFromForm,
  normalizePersonNamesFromRecord,
} = useFirmantePersonNameNormalization(
  formularioTecnicoFirmante,
  isSIRES,
  isSinRegimen,
);

useEntidadPaisNacimientoCoherence(formularioTecnicoFirmante, 'firmante');

useCurpFieldUppercase(
  () => formularioTecnicoFirmante.value.curp,
  (value) => {
    formularioTecnicoFirmante.value.curp = value;
  },
);

const curpForValidation = computed(() => formularioTecnicoFirmante.value.curp || '');
const curpDemographics = computed(() => ({
  fechaNacimiento: formularioTecnicoFirmante.value.fechaNacimiento || null,
  sexo: isSIRES.value ? null : formularioTecnicoFirmante.value.sexo || null,
  sexoCURP: parseSexoCurpValue(formularioTecnicoFirmante.value.sexoCURP),
  useSexoCurpForValidation: isSIRES.value,
  entidadNacimiento: formularioTecnicoFirmante.value.entidadNacimiento || null,
  nombre: formularioTecnicoFirmante.value.nombre || null,
  primerApellido: formularioTecnicoFirmante.value.primerApellido || null,
  segundoApellido: formularioTecnicoFirmante.value.segundoApellido || null,
}));
const curpLiveOptions = computed(() => ({
  allowGenericCurp: !isMexicoPais(Number(formularioTecnicoFirmante.value.paisNacimiento)),
  // Vacío lo maneja FormKit (required); no mostrar mensaje inline de CURP vacía.
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
  curp: curpForValidation,
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
watch(curpForValidation, () => clearServerIssues());

const applyCurpSuggestion = () => {
  if (isCurpFieldReadOnly.value) return;
  const next = applySuggestedPrefix();
  if (next != null) {
    formularioTecnicoFirmante.value.curp = next;
  }
};

const insertGenericCURP = () => {
  formularioTecnicoFirmante.value.curp = 'XXXX999999XXXXXX99';
};

const fechaNacimientoBounds = computed(() =>
  getRegistrationBirthDateInputBounds(
    FIRMANTE_EDAD_MINIMA,
    FIRMANTE_EDAD_MAXIMA,
  ),
);

const fechaNacimientoMax = computed(() => fechaNacimientoBounds.value.max);
const fechaNacimientoMin = computed(() => fechaNacimientoBounds.value.min);

watch(
  () => tecnicoFirmante.tecnicoFirmante,
  (firmante) => {
    if (firmante?._id) {
      const normalizedNames = normalizePersonNamesFromRecord(firmante);
      Object.assign(formularioTecnicoFirmante.value, {
        nombre: normalizedNames.nombre || "",
        curp: firmante.curp || "",
        sexo: firmante.sexo || "",
        sexoCURP: firmante.sexoCURP ?? "",
        tituloProfesional: firmante.tituloProfesional || "",
        numeroCedulaProfesional: firmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: firmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: firmante.numeroCredencialAdicional || "",
        paisNacimiento: firmante.paisNacimiento ?? "",
        entidadNacimiento: firmante.entidadNacimiento || "",
        fechaNacimiento: firmante.fechaNacimiento
          ? convertirFechaISOaYYYYMMDD(firmante.fechaNacimiento)
          : "",
        primerApellido: normalizedNames.primerApellido || "",
        segundoApellido: normalizedNames.segundoApellido || "",
      });
      nom024ResidenciaFields.value.entidadResidencia = firmante.entidadResidencia || "";
      nom024ResidenciaFields.value.municipioResidencia = firmante.municipioResidencia || "";
      nom024ResidenciaFields.value.localidadResidencia = firmante.localidadResidencia || "";
      nom024ResidenciaFields.value.paisResidencia = firmante.paisResidencia ?? "";
    } else if (!firmante) {
      nom024ResidenciaFields.value.entidadResidencia = "";
      nom024ResidenciaFields.value.municipioResidencia = "";
      nom024ResidenciaFields.value.localidadResidencia = "";
      nom024ResidenciaFields.value.paisResidencia = "";
    }
    if (firmante?._id) {
      initializeResidenciaGeoFields(nom024ResidenciaFields, 'init', 'firmante');
    }
  },
  { immediate: true },
);

const formSubmitAttempted = ref(false);
provide('formSubmitAttempted', formSubmitAttempted);

const personNameValidationMessages = {
  required: 'Este campo es obligatorio',
  personNameValidation: PERSON_NAME_VALIDATION_MESSAGE,
  personNameOptionalValidation: PERSON_NAME_VALIDATION_MESSAGE,
  personNameCharactersValidation: PERSON_NAME_CHARACTERS_VALIDATION_MESSAGE,
  personNameOptionalCharactersValidation: PERSON_NAME_CHARACTERS_VALIDATION_MESSAGE,
  personNameCharactersSinRegimenValidation: PERSON_NAME_CHARACTERS_SIN_REGIMEN_VALIDATION_MESSAGE,
  personNameOptionalCharactersSinRegimenValidation: PERSON_NAME_CHARACTERS_SIN_REGIMEN_VALIDATION_MESSAGE,
};

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

const onFormSubmitInvalid = () => {
  formSubmitAttempted.value = true;
  setTimeout(() => {
    formSubmitAttempted.value = false;
  }, 5000);
};

const validateFile = (file) => {
  const validExtensions = ['.png', '.jpg', '.jpeg'];
  const maxSizeMB = 1;
  const extension = '.' + file.name.split('.').pop().toLowerCase();
  if (!validExtensions.includes(extension)) {
    return { valid: false, message: 'Solo se permiten archivos: PNG, JPG, JPEG' };
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, message: `El archivo es muy grande. Límite: ${maxSizeMB}MB` };
  }
  return { valid: true };
};

const piePaginaFirmante = computed(() => ({
  nombre: formularioTecnicoFirmante.value.nombre || "",
  primerApellido: formularioTecnicoFirmante.value.primerApellido || "",
  segundoApellido: formularioTecnicoFirmante.value.segundoApellido || "",
  nombreCompleto: formatearTituloYNombreFirmante(
    formularioTecnicoFirmante.value,
    proveedorSaludStore.regimenRegulatorio,
  ),
  tituloProfesional: formularioTecnicoFirmante.value.tituloProfesional || "",
  numeroCedulaProfesional: formularioTecnicoFirmante.value.numeroCedulaProfesional || "",
  nombreCredencialAdicional: formularioTecnicoFirmante.value.nombreCredencialAdicional || "",
  numeroCredencialAdicional: formularioTecnicoFirmante.value.numeroCredencialAdicional || "",
  sexo: formularioTecnicoFirmante.value.sexo || "",
  sexoCURP: parseSexoCurpValue(formularioTecnicoFirmante.value.sexoCURP),
  hasSexoForPie: hasFirmanteSexoForPie({
    sexo: formularioTecnicoFirmante.value.sexo,
    sexoCURP: parseSexoCurpValue(formularioTecnicoFirmante.value.sexoCURP),
  }),
}));

const toast = inject('toast');

// Valida y procesa la firma (fondo, recorte, padding, 500x500 PNG) antes de usarla
const handleSignatureSelection = async (file) => {
  const validation = validateFile(file);
  if (!validation.valid) {
    toast.open({ message: validation.message, type: 'error' });
    return;
  }

  procesandoFirma.value = true;
  try {
    const { file: processed, warnings } = await processSignatorySignature(file);
    firmaArchivo.value = processed;
    revokePreviewUrl();
    previewObjectUrl = URL.createObjectURL(processed);
    firmaPreview.value = previewObjectUrl;
    warnings.forEach((warning) => {
      toast.open({ message: warning, type: 'warning' });
    });
  } catch (error) {
    console.error('Error al procesar la firma:', error);
    toast.open({
      message: 'No se pudo procesar la firma, por favor intenta con otra imagen.',
      type: 'error',
    });
    revokePreviewUrl();
    firmaPreview.value = null;
    firmaArchivo.value = null;
  } finally {
    procesandoFirma.value = false;
  }
};

const handleFileChange = (event) => {
  const file = event?.target?.files?.[0];
  if (file && file instanceof File) {
    handleSignatureSelection(file);
  } else {
    revokePreviewUrl();
    firmaPreview.value = null;
    firmaArchivo.value = null;
  }
};

const handleDragEnter = (event) => { event.preventDefault(); event.stopPropagation(); isDragOver.value = true; };
const handleDragLeave = (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (!event.currentTarget.contains(event.relatedTarget)) {
    isDragOver.value = false;
  }
};
const handleDragOver = (event) => { event.preventDefault(); event.stopPropagation(); };
const handleDrop = (event) => {
  event.preventDefault();
  event.stopPropagation();
  isDragOver.value = false;
  if (procesandoFirma.value) return;
  const files = Array.from(event.dataTransfer.files);
  if (files.length > 0) {
    handleSignatureSelection(files[0]);
  }
};

const handleSubmit = async (data) => {
  formSubmitAttempted.value = false;

  if (paisNacimientoRequired.value) {
    const pais = formularioTecnicoFirmante.value.paisNacimiento;
    if (pais === "" || pais == null) {
      toast.open({ type: "error", message: "El país de nacimiento es obligatorio" });
      return;
    }
  }

  if (isPaisProhibidoFirmante(formularioTecnicoFirmante.value.paisNacimiento)) {
    toast.open({ type: "error", message: PAIS_PROHIBIDO_FIRMANTE_MESSAGE });
    return;
  }

  if (isPaisProhibidoFirmante(nom024ResidenciaFields.value.paisResidencia)) {
    toast.open({ type: "error", message: PAIS_PROHIBIDO_FIRMANTE_MESSAGE });
    return;
  }

  if (curpRequired.value && (!data.curp || data.curp.trim() === '')) {
    toast.open({
      type: "error",
      message: "El CURP es obligatorio para firmantes",
    });
    return;
  }

  if (showCurpField.value && curpHasBlockingErrors.value) {
    toast.open({
      type: 'error',
      message: 'Revisa la CURP: hay errores que debes corregir antes de guardar.',
    });
    return;
  }

  if (showCurpField.value) {
    const confirmed = await confirmCurpInconvenientWordIfNeeded(
      formularioTecnicoFirmante.value.curp,
    );
    if (!confirmed) {
      return;
    }
  }

  const sexo = data.sexo || formularioTecnicoFirmante.value.sexo;
  const sexoCURP = parseSexoCurpValue(
    data.sexoCURP ?? formularioTecnicoFirmante.value.sexoCURP,
  );
  if (sexoCurpRequired.value && !isTrabajadorSexoCurp(sexoCURP)) {
    toast.open({
      type: "error",
      message: "El sexo CURP es obligatorio para firmantes",
    });
    return;
  }

  const entidadNacimiento = formularioTecnicoFirmante.value.entidadNacimiento;
  if (entidadNacimientoRequired.value && !entidadNacimiento) {
    toast.open({
      type: "error",
      message: "La entidad de nacimiento es obligatoria para firmantes",
    });
    return;
  }

  if (geoFieldsRequired.value) {
    if (!nom024ResidenciaFields.value.paisResidencia && nom024ResidenciaFields.value.paisResidencia !== 0) {
      toast.open({ type: "error", message: "El país de residencia es obligatorio para firmantes" });
      return;
    }
    if (!nom024ResidenciaFields.value.entidadResidencia) {
      toast.open({ type: "error", message: "La entidad de residencia es obligatoria para firmantes" });
      return;
    }
    if (!nom024ResidenciaFields.value.municipioResidencia) {
      toast.open({ type: "error", message: "El municipio de residencia es obligatorio para firmantes" });
      return;
    }
    if (!nom024ResidenciaFields.value.localidadResidencia) {
      toast.open({ type: "error", message: "La localidad de residencia es obligatoria para firmantes" });
      return;
    }
  }

  const fechaNacimiento = data.fechaNacimiento || formularioTecnicoFirmante.value.fechaNacimiento;
  if (!fechaNacimiento) {
    toast.open({ type: "error", message: "La fecha de nacimiento es obligatoria" });
    return;
  }

  if (
    !isBirthDateInRegistrationRange(
      fechaNacimiento,
      new Date(),
      FIRMANTE_EDAD_MINIMA,
      FIRMANTE_EDAD_MAXIMA,
    )
  ) {
    toast.open({
      type: "error",
      message: buildRegistrationAgeRangeMessage(
        FIRMANTE_EDAD_MINIMA,
        FIRMANTE_EDAD_MAXIMA,
        fechaNacimiento,
      ),
    });
    return;
  }

  const formData = new FormData();

  const normalizedNames = normalizePersonNamesFromForm();
  const baseData = {
    ...data,
    ...normalizedNames,
    curp: formularioTecnicoFirmante.value.curp,
    fechaNacimiento,
    paisNacimiento: formularioTecnicoFirmante.value.paisNacimiento,
    entidadNacimiento: formularioTecnicoFirmante.value.entidadNacimiento,
    entidadResidencia: nom024ResidenciaFields.value.entidadResidencia,
    paisResidencia: nom024ResidenciaFields.value.paisResidencia,
    municipioResidencia: nom024ResidenciaFields.value.municipioResidencia,
    localidadResidencia: nom024ResidenciaFields.value.localidadResidencia,
    ...(isSIRES.value && isTrabajadorSexoCurp(sexoCURP)
      ? { sexoCURP }
      : {}),
    ...(isSinRegimen.value && sexo ? { sexo } : {}),
  };

  const submitData = preserveImmutableIdentificationFields(
    baseData,
    firmanteRecord.value,
  );

  if (submitData.paisNacimiento === "" || submitData.paisNacimiento == null) delete submitData.paisNacimiento;
  if (!submitData.entidadNacimiento) delete submitData.entidadNacimiento;
  if (!geoFieldsRequired.value) {
    if (!submitData.entidadResidencia) delete submitData.entidadResidencia;
    if (submitData.paisResidencia === "" || submitData.paisResidencia == null) delete submitData.paisResidencia;
    if (!submitData.municipioResidencia) delete submitData.municipioResidencia;
    if (!submitData.localidadResidencia) delete submitData.localidadResidencia;
  }

  Object.entries(submitData).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, value);
    }
  });

  formData.append('idUser', userStore.user?._id);

  if (firmaArchivo.value) {
    formData.append('firma', firmaArchivo.value);
  }

  try {
    let response;
    if (tecnicoFirmante.tecnicoFirmante?._id) {
      response = await tecnicoFirmante.updateTecnicoFirmanteById(tecnicoFirmante.tecnicoFirmante._id, formData);
    } else {
      response = await tecnicoFirmante.createTecnicoFirmante(formData);
    }

    if (!response) {
      return;
    }

    toast.open({
      type: 'success',
      message: 'Datos del técnico firmante guardados correctamente',
    });
  } catch (error) {
    console.error('Error al crear o actualizar el técnico firmante:', error);
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
        'Error al guardar los datos del técnico firmante',
      ),
      type: 'error',
    });
  }
};

const baseURL = import.meta.env.VITE_API_URL || 'https://ramazzini.app';

const firmaSrc = computed(() => {
  return `${baseURL}/assets/signatories/${tecnicoFirmante.tecnicoFirmante?.firma?.data}?t=${Date.now()}`;
});
</script>

<template>
  <Transition appear mode="out-in" name="slide-up">
    <div class="form-green-submit relative bg-white text-gray-800 w-full max-w-5xl p-5 sm:p-8 lg:p-10 mt-2 sm:mt-4 rounded-lg shadow-lg mx-auto max-h-none overflow-visible lg:max-h-[82vh] lg:overflow-y-auto">
      <Transition appear name="fade-slow">
        <div v-if="tecnicoFirmante.loading && !tecnicoFirmante.tecnicoFirmante" class="py-12 text-center text-gray-500">
          <i class="fas fa-spinner fa-spin text-2xl text-emerald-600"></i>
        </div>
        <div v-else>
          <h1 class="text-3xl">Datos del técnico firmante</h1>
          <hr class="mt-2 mb-3">

          <p
            v-if="identificationSectionNotice"
            class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            <i class="fas fa-lock mr-1"></i>
            {{ identificationSectionNotice }}
          </p>

          <FormKit type="form" :actions="false"
            incomplete-message="Por favor, valide que los datos sean correctos*"
            @submit="handleSubmit"
            @submit-invalid="onFormSubmitInvalid">

            <div class="space-y-3">
            <div
              v-if="showCurpField || tecnicoFirmante.tecnicoFirmante?.folio"
              class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
            >
              <div v-if="showCurpField">
                <FormKit
                  type="text"
                  name="curp"
                  placeholder="Ej. PERJ920315HDFRDN05"
                  maxlength="18"
                  :disabled="isCurpFieldReadOnly"
                  :validation="curpRequired ? 'required' : ''"
                  :validation-messages="curpRequired ? { required: 'El CURP es obligatorio' } : {}"
                  v-model="formularioTecnicoFirmante.curp"
                >
                  <template #label>
                    <span class="flex w-full items-baseline justify-between gap-2">
                      <span class="text-base text-gray-700">
                        CURP<span v-if="curpRequired" class="text-red-500">*</span>
                      </span>
                      <button
                        v-if="!isMexicoPais(Number(formularioTecnicoFirmante.paisNacimiento)) && !isCurpFieldReadOnly"
                        type="button"
                        @click.stop.prevent="insertGenericCURP"
                        class="shrink-0 text-xs font-normal text-gray-400 hover:text-gray-600 focus:outline-none transition-colors duration-200"
                        title="Usar CURP genérica para firmante extranjero (XXXX999999XXXXXX99)"
                      >
                        <i class="fas fa-info-circle mr-1"></i>
                        Usar CURP genérica
                      </button>
                    </span>
                  </template>
                </FormKit>
                <CurpInlineFeedback
                  :curp="formularioTecnicoFirmante.curp"
                  :invalid-positions="curpInvalidPositions"
                  :warning-positions="curpWarningPositions"
                  :valid-positions="curpValidPositions"
                  :issues="curpIssues"
                  :suggestion="curpPrefixSuggestion"
                  :can-apply-suggestion="!isCurpFieldReadOnly"
                  @apply-suggestion="applyCurpSuggestion"
                />
              </div>
              <div v-if="tecnicoFirmante.tecnicoFirmante?.folio">
                <label class="block font-medium text-lg text-gray-700 mb-1">
                  Folio (Identificador en la UM)
                </label>
                <div
                  class="w-full h-15 p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-mono text-sm flex items-center"
                >
                  {{ tecnicoFirmante.tecnicoFirmante.folio }}
                </div>
                <p class="text-xs text-gray-500 mt-1">
                  Identificador único de 18 caracteres. Generado automáticamente al registrar.
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <FormKit
                type="text"
                label="Título Profesional"
                name="tituloProfesional"
                placeholder="Tec., Lic., Ing., etc."
                :input-class="isSIRES ? 'uppercase' : undefined"
                v-model="formularioTecnicoFirmante.tituloProfesional"
              />
              <div>
                <FormKit
                  type="text"
                  name="nombre"
                  placeholder="Ej. Juan"
                  :validation="requiredPersonNameValidation"
                  :maxlength="PERSON_NAME_MAX_LENGTH"
                  :disabled="isCurpConformationReadOnly"
                  :validation-messages="personNameValidationMessages"
                  v-model="formularioTecnicoFirmante.nombre"
                  @blur="normalizePersonNameField('nombre')"
                >
                  <template #label>
                    <span class="text-lg font-medium text-gray-700">
                      Nombre(s)<span class="text-red-500">*</span>
                    </span>
                  </template>
                </FormKit>
                <CurpRelatedFieldMessages
                  v-if="showCurpField"
                  :messages="curpRelatedFieldMessages.nombre"

                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <FormKit
                  type="text"
                  name="primerApellido"
                  placeholder="Ej. Pérez"
                  :validation="requiredPersonNameValidation"
                  :maxlength="PERSON_NAME_MAX_LENGTH"
                  :disabled="isCurpConformationReadOnly"
                  :validation-messages="personNameValidationMessages"
                  v-model="formularioTecnicoFirmante.primerApellido"
                  @blur="normalizePersonNameField('primerApellido')"
                >
                  <template #label>
                    <span class="text-lg font-medium text-gray-700">
                      Primer Apellido<span class="text-red-500">*</span>
                    </span>
                  </template>
                </FormKit>
                <CurpRelatedFieldMessages
                  v-if="showCurpField"
                  :messages="curpRelatedFieldMessages.primerApellido"

                />
              </div>
              <div>
                <FormKit
                  type="text"
                  label="Segundo Apellido"
                  name="segundoApellido"
                  placeholder="Ej. Galeana"
                  :validation="optionalPersonNameValidation"
                  :maxlength="PERSON_NAME_MAX_LENGTH"
                  :disabled="isCurpConformationReadOnly"
                  :validation-messages="personNameValidationMessages"
                  v-model="formularioTecnicoFirmante.segundoApellido"
                  @blur="normalizePersonNameField('segundoApellido')"
                />
                <CurpRelatedFieldMessages
                  v-if="showCurpField"
                  :messages="curpRelatedFieldMessages.segundoApellido"

                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div v-if="isSIRES">
                <FormKit
                  type="select"
                  name="sexoCURP"
                  placeholder="-Seleccione sexo CURP-"
                  :options="TRABAJADOR_SEXO_CURP_OPTIONS"
                  :disabled="isCurpConformationReadOnly"
                  :validation="sexoCurpRequired ? 'required' : ''"
                  :validation-messages="{ required: 'Este campo es obligatorio' }"
                  v-model="formularioTecnicoFirmante.sexoCURP"
                >
                  <template #label>
                    <span class="text-lg font-medium text-gray-700">
                      Sexo CURP
                      <span v-if="sexoCurpRequired" class="text-red-500">*</span>
                    </span>
                  </template>
                </FormKit>
                <CurpRelatedFieldMessages
                  v-if="showCurpField"
                  :messages="curpRelatedFieldMessages.sexoCURP"

                />
              </div>
              <div v-else>
                <FormKit
                  type="select"
                  label="Sexo"
                  name="sexo"
                  placeholder='Selecciona "Masculino" o "Femenino"'
                  :options="['Masculino', 'Femenino']"
                  :disabled="isCurpConformationReadOnly"
                  v-model="formularioTecnicoFirmante.sexo"
                >
                  <template #label="{ label }">
                    <span>{{ label }}</span>
                  </template>
                </FormKit>
                <CurpRelatedFieldMessages
                  v-if="showCurpField"
                  :messages="curpRelatedFieldMessages.sexo"

                />
              </div>

              <div>
                <FormKit
                  type="date"
                  name="fechaNacimiento"
                  :disabled="isCurpConformationReadOnly"
                  validation="required"
                  :validation-messages="{
                    required: 'La fecha de nacimiento es obligatoria',
                  }"
                  :min="fechaNacimientoMin"
                  :max="fechaNacimientoMax"
                  v-model="formularioTecnicoFirmante.fechaNacimiento"
                >
                  <template #label>
                    <span class="text-lg font-medium text-gray-700">
                      Fecha de nacimiento
                      <span class="text-red-500">*</span>
                    </span>
                  </template>
                </FormKit>
                <FechaNacimientoRegistroFeedback
                  :min-years="FIRMANTE_EDAD_MINIMA"
                  :max-years="FIRMANTE_EDAD_MAXIMA"
                  :fecha-nacimiento="formularioTecnicoFirmante.fechaNacimiento"
                />
                <CurpRelatedFieldMessages
                  v-if="showCurpField"
                  :messages="curpRelatedFieldMessages.fechaNacimiento"

                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <FormKit
                type="text"
                :label="proveedorSaludStore.proveedorSalud?.pais === 'MX' ? 'Cédula Profesional' : 'Registro Profesional'"
                name="numeroCedulaProfesional"
                placeholder="Ej. 142988, REG-123456, CRM 123456"
                validation="cedulaProfesionalValidation"
                v-model="formularioTecnicoFirmante.numeroCedulaProfesional"
                :validation-messages="{ cedulaProfesionalValidation: 'El registro debe tener entre 3 y 20 caracteres (letras, números, guiones o espacios).' }"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <FormKit
                type="text"
                label="Credencial/Certificación Adicional"
                name="nombreCredencialAdicional"
                placeholder="Ej. Certificado ante el CNMMT"
                v-model="formularioTecnicoFirmante.nombreCredencialAdicional"
              />
              <FormKit
                type="text"
                label="Número de Credencial Adicional"
                name="numeroCredencialAdicional"
                placeholder="Ej. 924"
                v-model="formularioTecnicoFirmante.numeroCredencialAdicional"
              />
            </div>

            <div v-if="!isSIRES" class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <PaisNacimientoAutocomplete
                v-model="formularioTecnicoFirmante.paisNacimiento"
                label="País de nacimiento"
                placeholder="Buscar por nombre de país..."
                :required="paisNacimientoRequired"
                :disabled="isCurpConformationReadOnly"
                geo-context="firmante"
              />
            </div>

            </div>

            <div v-if="showEntidadNacimiento" class="mt-4 mb-2">
              <div class="mb-4">
                <h4 class="text-sm font-semibold text-gray-700 mb-3">Datos de Nacimiento</h4>
                <div class="grid gap-3 sm:grid-cols-2">
                  <EstadoAutocomplete
                    v-model="formularioTecnicoFirmante.entidadNacimiento"
                    label="Entidad de Nacimiento"
                    placeholder="Buscar por nombre del estado"
                    :required="geoFieldsRequired"
                    :disabled="isCurpConformationReadOnly"
                    geo-context="firmante"
                    :pais-nacimiento="formularioTecnicoFirmante.paisNacimiento"
                  />
                  <CurpRelatedFieldMessages
                    :messages="curpRelatedFieldMessages.entidadNacimiento"
                    class="mt-1"
                  />
                  <PaisNacimientoAutocomplete
                    v-model="formularioTecnicoFirmante.paisNacimiento"
                    label="País de nacimiento"
                    placeholder="Buscar por nombre de país..."
                    :required="paisNacimientoRequired"
                    geo-context="firmante"
                  />
                </div>
              </div>

              <div>
                <h4 class="text-sm font-semibold text-gray-700 mb-3">Datos de Residencia</h4>
                <ResidenciaGeoAutocomplete
                  :estadoResidencia="nom024ResidenciaFields.entidadResidencia"
                  :municipioResidencia="nom024ResidenciaFields.municipioResidencia"
                  :localidadResidencia="nom024ResidenciaFields.localidadResidencia"
                  :pais-residencia="nom024ResidenciaFields.paisResidencia"
                  @update:estadoResidencia="nom024ResidenciaFields.entidadResidencia = $event"
                  @update:municipioResidencia="nom024ResidenciaFields.municipioResidencia = $event"
                  @update:localidadResidencia="nom024ResidenciaFields.localidadResidencia = $event"
                  :required="geoFieldsRequired"
                  geo-context="firmante"
                >
                  <template #pais>
                    <PaisNacimientoAutocomplete
                      v-model="nom024ResidenciaFields.paisResidencia"
                      label="País de residencia"
                      placeholder="Buscar por nombre de país..."
                      :required="geoFieldsRequired"
                      geo-context="firmante"
                    />
                  </template>
                </ResidenciaGeoAutocomplete>
              </div>
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mt-4 mb-2">Firma (Se optimizará automáticamente a PNG de 500 x 500px sin fondo claro. Para mejores resultados, usa una firma sobre fondo blanco o un PNG transparente)</label>
              <div
                class="border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-all duration-200"
                :class="[
                  procesandoFirma
                    ? 'border-gray-300 bg-gray-50 cursor-wait opacity-70'
                    : isDragOver
                      ? 'border-emerald-500 bg-emerald-50 scale-105 cursor-pointer'
                      : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50 cursor-pointer'
                ]"
                @dragenter="handleDragEnter"
                @dragleave="handleDragLeave"
                @dragover="handleDragOver"
                @drop="handleDrop"
                @click="!procesandoFirma && $refs.firmaInput.click()"
              >
                <input
                  ref="firmaInput"
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  @change="handleFileChange"
                  class="hidden"
                />
                <div v-if="procesandoFirma" class="text-gray-600 py-4">
                  <i class="fas fa-spinner fa-spin text-3xl text-emerald-600 mb-3"></i>
                  <p class="text-lg font-medium">Optimizando firma...</p>
                </div>
                <div v-else class="text-gray-600">
                  <p class="text-lg font-medium transition-colors duration-200" :class="isDragOver ? 'text-emerald-700' : ''">
                    {{ isDragOver ? '¡Suelta la firma aquí!' : 'Arrastra la firma aquí o haz clic para seleccionar' }}
                  </p>
                  <p class="text-sm text-gray-500 mt-2">PNG, JPG, JPEG (máximo 1MB)</p>
                </div>
              </div>
            </div>

            <div class="flex flex-col lg:flex-row justify-center items-stretch xl:items-center gap-6 mt-4">
              <div v-if="piePaginaFirmante.nombre" class="w-full xl:w-1/2 flex flex-col items-center xl:items-start">
                <p class="font-medium text-lg text-gray-700 text-left">Pie de Página del Técnico Firmante:</p>
                <div class="w-full max-w-md mt-4 p-4 border rounded-lg bg-gray-50 text-left">
                  <p class="text-sm text-gray-800 space-y-1">
                    <span class="font-medium" v-if="piePaginaFirmante.nombre">{{ piePaginaFirmante.nombreCompleto }}</span><br v-if="piePaginaFirmante.nombre">
                    <span v-if="piePaginaFirmante.numeroCedulaProfesional" class="font-light">
                      {{ proveedorSaludStore.proveedorSalud.pais === 'MX' ? 'Cédula Profesional No.' : 'Registro Profesional No.' }} {{ piePaginaFirmante.numeroCedulaProfesional }}
                    </span><br v-if="piePaginaFirmante.numeroCedulaProfesional">
                    <span v-if="piePaginaFirmante.nombreCredencialAdicional" class="font-light block truncate overflow-hidden text-ellipsis whitespace-nowrap max-w-[390px]">
                      {{ piePaginaFirmante.nombreCredencialAdicional }} No. {{ piePaginaFirmante.numeroCredencialAdicional }}
                    </span>
                    <span v-if="piePaginaFirmante.hasSexoForPie" class="font-light">Responsable de evaluación</span>
                  </p>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row justify-center items-center gap-4">
                <div v-if="tecnicoFirmante.tecnicoFirmante?.firma?.data" class="w-full flex flex-col items-center">
                  <p class="font-medium text-lg text-gray-700">Firma actual:</p>
                  <img :src="firmaSrc" :alt="'Firma de ' + piePaginaFirmante.nombreCompleto" class="w-40 h-40 sm:w-48 sm:h-48 object-contain mt-2 border-2 border-gray-300 rounded-lg"/>
                </div>
                <Transition appear name="fade-slow">
                  <div v-if="firmaPreview" class="w-full flex flex-col items-center">
                    <p class="font-medium text-lg text-gray-700">Firma Nueva:</p>
                    <img :src="firmaPreview" alt="Vista previa de la firma" class="w-40 h-40 sm:w-48 sm:h-48 object-contain mt-2 border-2 border-gray-300 rounded-lg" />
                  </div>
                </Transition>
              </div>
            </div>

            <hr class="my-3">
            <div class="form-action-buttons flex flex-col sm:flex-row justify-between gap-2">
              <RouterLink :to="{ name: 'inicio' }" class="nav-action-link flex items-center justify-center text-lg w-full sm:w-1/2 rounded-lg bg-white font-medium text-gray-800 shadow-sm ring-2 ring-inset ring-gray-300 hover:bg-gray-100 p-3 transition-transform duration-300 transform hover:scale-105 hover:shadow-lg">Volver</RouterLink>
              <div class="w-full sm:w-1/2">
                <FormKit type="submit" :disabled="tecnicoFirmante.saving">
                  <span v-if="tecnicoFirmante.saving">Guardando...</span>
                  <span v-else>Actualizar Datos</span>
                </FormKit>
              </div>
            </div>
          </FormKit>
        </div>
      </Transition>
    </div>
  </Transition>

  <ModalCurpInconvenientWordConfirm
    :open="showCurpInconvenientConfirm"
    :word="curpInconvenientWord"
    @confirm="confirmCurpInconvenientWord"
    @close="cancelCurpInconvenientWord"
  />
</template>

<style scoped>
.fade-slow-enter-from,
.fade-slow-leave-to { opacity: 0; }
.fade-slow-enter-active,
.fade-slow-leave-active { transition: all 500ms ease-out; }
.fade-slow-leave-active { transition-delay: 250ms; }
</style>
