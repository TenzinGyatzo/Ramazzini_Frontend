<script setup>
import { ref, inject, watch, computed, provide, onUnmounted } from 'vue';
import { useEnfermeraFirmanteStore } from '@/stores/enfermeraFirmante';
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
import {
  formatearTituloProfesional,
  formatearTituloYNombreFirmante,
} from '@/helpers/nombres';
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
  resolveEnfermeraPiePaginaText,
  hasFirmanteSexoForPie,
} from '@/helpers/trabajadorSexoCurp';

const enfermeraFirmante = useEnfermeraFirmanteStore();
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

const firmanteRecord = computed(() => enfermeraFirmante.enfermeraFirmante);
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
const isDragOver = ref(false);  // Para el estado de drag and drop

// URL de objeto de la vista previa, para liberarla al reemplazar o desmontar
let previewObjectUrl = null;

const revokePreviewUrl = () => {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }
};

onUnmounted(revokePreviewUrl);

// Objeto reactivo para el formulario del enfermera firmante
const formularioEnfermeraFirmante = ref({
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
  fechaNacimiento: ""
});

const {
  normalizePersonNameField,
  normalizePersonNamesFromForm,
  normalizePersonNamesFromRecord,
} = useFirmantePersonNameNormalization(
  formularioEnfermeraFirmante,
  isSIRES,
  isSinRegimen,
);

useEntidadPaisNacimientoCoherence(formularioEnfermeraFirmante, 'firmante');

useCurpFieldUppercase(
  () => formularioEnfermeraFirmante.value.curp,
  (value) => {
    formularioEnfermeraFirmante.value.curp = value;
  },
);

const curpForValidation = computed(() => formularioEnfermeraFirmante.value.curp || '');
const curpDemographics = computed(() => ({
  fechaNacimiento: formularioEnfermeraFirmante.value.fechaNacimiento || null,
  sexo: isSIRES.value ? null : formularioEnfermeraFirmante.value.sexo || null,
  sexoCURP: parseSexoCurpValue(formularioEnfermeraFirmante.value.sexoCURP),
  useSexoCurpForValidation: isSIRES.value,
  entidadNacimiento: formularioEnfermeraFirmante.value.entidadNacimiento || null,
  nombre: formularioEnfermeraFirmante.value.nombre || null,
  primerApellido: formularioEnfermeraFirmante.value.primerApellido || null,
  segundoApellido: formularioEnfermeraFirmante.value.segundoApellido || null,
}));
const curpLiveOptions = computed(() => ({
  allowGenericCurp: !isMexicoPais(Number(formularioEnfermeraFirmante.value.paisNacimiento)),
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
    formularioEnfermeraFirmante.value.curp = next;
  }
};

const insertGenericCURP = () => {
  formularioEnfermeraFirmante.value.curp = 'XXXX999999XXXXXX99';
};

// Mantener isMX solo para lógica no-regulatoria
const isMX = computed(() => proveedorSaludStore.proveedorSalud?.pais === 'MX');

const fechaNacimientoBounds = computed(() =>
  getRegistrationBirthDateInputBounds(
    FIRMANTE_EDAD_MINIMA,
    FIRMANTE_EDAD_MAXIMA,
  ),
);

const fechaNacimientoMax = computed(() => fechaNacimientoBounds.value.max);
const fechaNacimientoMin = computed(() => fechaNacimientoBounds.value.min);

// Sincronizar formulario y residencia cuando cambia el registro cargado (mismo patrón que ModalTrabajadores)
watch(
  () => enfermeraFirmante.enfermeraFirmante,
  (firmante) => {
    if (firmante?._id) {
      const normalizedNames = normalizePersonNamesFromRecord(firmante);
      Object.assign(formularioEnfermeraFirmante.value, {
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

// Función para validar archivo
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

// Computed Reactivo para el Pie de Página del Enfermera Firmante
const piePaginaFirmante = computed(() => ({
  nombre: formularioEnfermeraFirmante.value.nombre || "",
  primerApellido: formularioEnfermeraFirmante.value.primerApellido || "",
  segundoApellido: formularioEnfermeraFirmante.value.segundoApellido || "",
  nombreCompleto: formatearTituloYNombreFirmante(
    formularioEnfermeraFirmante.value,
    proveedorSaludStore.regimenRegulatorio,
  ),
  tituloProfesional: formularioEnfermeraFirmante.value.tituloProfesional || "",
  numeroCedulaProfesional: formularioEnfermeraFirmante.value.numeroCedulaProfesional || "",
  nombreCredencialAdicional: formularioEnfermeraFirmante.value.nombreCredencialAdicional || "",
  numeroCredencialAdicional: formularioEnfermeraFirmante.value.numeroCredencialAdicional || "",
  sexo: formularioEnfermeraFirmante.value.sexo || "",
  sexoCURP: parseSexoCurpValue(formularioEnfermeraFirmante.value.sexoCURP),
  piePaginaTexto: resolveEnfermeraPiePaginaText({
    sexo: formularioEnfermeraFirmante.value.sexo,
    sexoCURP: parseSexoCurpValue(formularioEnfermeraFirmante.value.sexoCURP),
  }),
  hasSexoForPie: hasFirmanteSexoForPie({
    sexo: formularioEnfermeraFirmante.value.sexo,
    sexoCURP: parseSexoCurpValue(formularioEnfermeraFirmante.value.sexoCURP),
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

// Eventos de drag and drop
const handleDragEnter = (event) => {
  event.preventDefault();
  event.stopPropagation();
  isDragOver.value = true;
};

const handleDragLeave = (event) => {
  event.preventDefault();
  event.stopPropagation();
  // Solo cambiar a false si salimos del área de drop
  if (!event.currentTarget.contains(event.relatedTarget)) {
    isDragOver.value = false;
  }
};

const handleDragOver = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

const handleDrop = (event) => {
  event.preventDefault();
  event.stopPropagation();
  isDragOver.value = false;

  if (procesandoFirma.value) return;

  const files = Array.from(event.dataTransfer.files);
  if (files.length > 0) {
    handleSignatureSelection(files[0]); // Solo tomamos el primer archivo
  }
};

const handleSubmit = async (data) => {
    formSubmitAttempted.value = false;
    if (paisNacimientoRequired.value) {
        const pais = formularioEnfermeraFirmante.value.paisNacimiento;
        if (pais === "" || pais == null) {
            toast.open({
                type: "error",
                message: "El país de nacimiento es obligatorio",
            });
            return;
        }
    }

    if (isPaisProhibidoFirmante(formularioEnfermeraFirmante.value.paisNacimiento)) {
        toast.open({
            type: "error",
            message: PAIS_PROHIBIDO_FIRMANTE_MESSAGE,
        });
        return;
    }

    if (isPaisProhibidoFirmante(nom024ResidenciaFields.value.paisResidencia)) {
        toast.open({
            type: "error",
            message: PAIS_PROHIBIDO_FIRMANTE_MESSAGE,
        });
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
            formularioEnfermeraFirmante.value.curp,
        );
        if (!confirmed) {
            return;
        }
    }

    const sexo = data.sexo || formularioEnfermeraFirmante.value.sexo;
    const sexoCURP = parseSexoCurpValue(
      data.sexoCURP ?? formularioEnfermeraFirmante.value.sexoCURP,
    );
    if (sexoCurpRequired.value && !isTrabajadorSexoCurp(sexoCURP)) {
        toast.open({
            type: "error",
            message: "El sexo CURP es obligatorio para firmantes",
        });
        return;
    }

    const entidadNacimiento = formularioEnfermeraFirmante.value.entidadNacimiento;
    if (entidadNacimientoRequired.value && !entidadNacimiento) {
        toast.open({
            type: "error",
            message: "La entidad de nacimiento es obligatoria para firmantes",
        });
        return;
    }

    if (geoFieldsRequired.value) {
        if (!nom024ResidenciaFields.value.paisResidencia && nom024ResidenciaFields.value.paisResidencia !== 0) {
            toast.open({
                type: "error",
                message: "El país de residencia es obligatorio para firmantes",
            });
            return;
        }
        if (!nom024ResidenciaFields.value.entidadResidencia) {
            toast.open({
                type: "error",
                message: "La entidad de residencia es obligatoria para firmantes",
            });
            return;
        }
        if (!nom024ResidenciaFields.value.municipioResidencia) {
            toast.open({
                type: "error",
                message: "El municipio de residencia es obligatorio para firmantes",
            });
            return;
        }
        if (!nom024ResidenciaFields.value.localidadResidencia) {
            toast.open({
                type: "error",
                message: "La localidad de residencia es obligatoria para firmantes",
            });
            return;
        }
    }

    const fechaNacimiento = data.fechaNacimiento || formularioEnfermeraFirmante.value.fechaNacimiento;
    if (!fechaNacimiento) {
        toast.open({
            type: "error",
            message: "La fecha de nacimiento es obligatoria",
        });
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
      curp: formularioEnfermeraFirmante.value.curp,
      fechaNacimiento,
      paisNacimiento: formularioEnfermeraFirmante.value.paisNacimiento,
      entidadNacimiento: formularioEnfermeraFirmante.value.entidadNacimiento,
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

    // Agregar solo los campos con valores definidos
    Object.entries(submitData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            formData.append(key, value);
        }
    });

    formData.append('idUser', userStore.user?._id);

    if (firmaArchivo.value) {
        formData.append('firma', firmaArchivo.value);
    }

    // Depuramos el contenido de FormData
    // for (let [key, value] of formData.entries()) {
    //     console.log(`${key}:`, value);
    // }

    try {
        let response;
        if (enfermeraFirmante.enfermeraFirmante?._id) {
            response = await enfermeraFirmante.updateEnfermeraFirmanteById(enfermeraFirmante.enfermeraFirmante._id, formData);
        } else {
            response = await enfermeraFirmante.createEnfermeraFirmante(formData);
        }

        if (!response) {
            return;
        }

        toast.open({
            type: 'success',
            message: 'Datos del enfermera firmante guardados correctamente',
        });

    } catch (error) {
        console.error("Error al crear o actualizar el enfermera firmante:", error);
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
                'Error al guardar los datos del enfermera firmante',
            ),
            type: 'error',
        });
    }
};


const volver = () => {
    router.push({ name: 'inicio' });
};

const TITULOS_ENFERMERA = ['Lic. Enfermería.', 'Enf.'];
const titulos = computed(() =>
  TITULOS_ENFERMERA.map((value) => ({
    value,
    label: formatearTituloProfesional(
      value,
      proveedorSaludStore.regimenRegulatorio,
    ),
  })),
);

const baseURL = import.meta.env.VITE_API_URL || 'https://ramazzini.app';

const firmaSrc = computed(() => {
  return `${baseURL}/assets/signatories/${enfermeraFirmante.enfermeraFirmante.firma?.data}?t=${Date.now()}`;
});
</script>

<template>
    <!-- <Transition appear name="fade-slow"> -->
    <Transition appear mode="out-in" name="slide-up">
        <div
            class="form-green-submit relative bg-white text-gray-800 w-full max-w-5xl p-5 sm:p-8 lg:p-10 mt-2 sm:mt-4 rounded-lg shadow-lg mx-auto max-h-none overflow-visible lg:max-h-[82vh] lg:overflow-y-auto">
            <Transition appear name="fade-slow">
                <div v-if="enfermeraFirmante.loading && !enfermeraFirmante.enfermeraFirmante" class="py-12 text-center text-gray-500">
                    <i class="fas fa-spinner fa-spin text-2xl text-emerald-600"></i>
                </div>
                <div v-else>
                    <h1 class="text-3xl">Datos del enfermera firmante</h1>
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
                        <!-- Campo CURP - Visible según política regulatoria -->
                        <div
                            v-if="showCurpField || enfermeraFirmante.enfermeraFirmante?.folio"
                            class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
                        >
                            <div v-if="showCurpField">
                              <FormKit
                                  type="text"
                                  name="curp"
                                  placeholder="Ej. PEGF900215MDFRTN07"
                                  maxlength="18"
                                  :disabled="isCurpFieldReadOnly"
                                  :validation="curpRequired ? 'required' : ''"
                                  :validation-messages="curpRequired ? { required: 'El CURP es obligatorio' } : {}"
                                  v-model="formularioEnfermeraFirmante.curp"
                              >
                                  <template #label>
                                      <span class="flex w-full items-baseline justify-between gap-2">
                                          <span class="text-base text-gray-700">
                                              CURP<span v-if="curpRequired" class="text-red-500">*</span>
                                          </span>
                                          <button
                                              v-if="!isMexicoPais(Number(formularioEnfermeraFirmante.paisNacimiento)) && !isCurpFieldReadOnly"
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
                                  :curp="formularioEnfermeraFirmante.curp"
                                  :invalid-positions="curpInvalidPositions"
                                  :warning-positions="curpWarningPositions"
                                  :valid-positions="curpValidPositions"
                                  :issues="curpIssues"
                                  :suggestion="curpPrefixSuggestion"
                                  :can-apply-suggestion="!isCurpFieldReadOnly"
                                  @apply-suggestion="applyCurpSuggestion"
                              />
                            </div>
                            <div v-if="enfermeraFirmante.enfermeraFirmante?.folio">
                              <label class="block font-medium text-lg text-gray-700 mb-1">
                                Folio (Identificador en la UM)
                              </label>
                              <div
                                class="w-full h-15 p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-mono text-sm flex items-center"
                              >
                                {{ enfermeraFirmante.enfermeraFirmante.folio }}
                              </div>
                              <p class="text-xs text-gray-500 mt-1">
                                Identificador único de 18 caracteres. Generado automáticamente al registrar.
                              </p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <FormKit
                                type="select"
                                label="Título Profesional"
                                name="tituloProfesional"
                                placeholder='Selecciona "Lic. Enfermería." o "Enf."'
                                :options="titulos"
                                v-model="formularioEnfermeraFirmante.tituloProfesional"
                            />

                            <div>
                              <FormKit
                                  type="text"
                                  name="nombre"
                                  placeholder="Ej. Fátima"
                                  :validation="requiredPersonNameValidation"
                                  :maxlength="PERSON_NAME_MAX_LENGTH"
                                  :disabled="isCurpConformationReadOnly"
                                  :validation-messages="personNameValidationMessages"
                                  v-model="formularioEnfermeraFirmante.nombre"
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
                                  v-model="formularioEnfermeraFirmante.primerApellido"
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
                                  v-model="formularioEnfermeraFirmante.segundoApellido"
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
                          <FormKit type="select" name="sexoCURP"
                              placeholder="-Seleccione sexo CURP-"
                              :options="TRABAJADOR_SEXO_CURP_OPTIONS"
                              :disabled="isCurpConformationReadOnly"
                              :validation="sexoCurpRequired ? 'required' : ''"
                              :validation-messages="{ required: 'Este campo es obligatorio' }"
                              v-model="formularioEnfermeraFirmante.sexoCURP">
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
                          <FormKit type="select" label="Sexo" name="sexo"
                              placeholder='Selecciona "Masculino" o "Femenino"' 
                              :options="['Masculino', 'Femenino']"
                              :disabled="isCurpConformationReadOnly"
                              v-model="formularioEnfermeraFirmante.sexo">
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
                                v-model="formularioEnfermeraFirmante.fechaNacimiento"
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
                              :fecha-nacimiento="formularioEnfermeraFirmante.fechaNacimiento"
                            />
                            <CurpRelatedFieldMessages
                              v-if="showCurpField"
                              :messages="curpRelatedFieldMessages.fechaNacimiento"
            
                            />
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <FormKit type="text" :label="proveedorSaludStore.proveedorSalud?.pais === 'MX' ? 'Cédula Profesional' : 'Registro Profesional'" name="numeroCedulaProfesional"
                                placeholder="Ej. 142988, REG-123456, CRM 123456" validation="cedulaProfesionalValidation" v-model="formularioEnfermeraFirmante.numeroCedulaProfesional"
                                :validation-messages="{ cedulaProfesionalValidation: 'El registro debe tener entre 3 y 20 caracteres (letras, números, guiones o espacios).' }" />
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4">

                            <FormKit type="text" label="Credencial/Certificación Adicional" name="nombreCredencialAdicional"
                                placeholder="Ej. Certificado ante el CNMMT"
                                v-model="formularioEnfermeraFirmante.nombreCredencialAdicional" />

                            <FormKit type="text" label="Número de Credencial Adicional" name="numeroCredencialAdicional"
                                placeholder="Ej. 924"
                                v-model="formularioEnfermeraFirmante.numeroCredencialAdicional" />
                        </div>

                        <div v-if="!isSIRES" class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <PaisNacimientoAutocomplete
                                v-model="formularioEnfermeraFirmante.paisNacimiento"
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
                                        v-model="formularioEnfermeraFirmante.entidadNacimiento"
                                        label="Entidad de Nacimiento"
                                        placeholder="Buscar por nombre del estado"
                                        :required="geoFieldsRequired"
                                        :disabled="isCurpConformationReadOnly"
                                        geo-context="firmante"
                                        :pais-nacimiento="formularioEnfermeraFirmante.paisNacimiento"
                                    />
                                    <CurpRelatedFieldMessages
                                      :messages="curpRelatedFieldMessages.entidadNacimiento"
                                      class="mt-1"
                                    />

                                    <PaisNacimientoAutocomplete
                                        v-model="formularioEnfermeraFirmante.paisNacimiento"
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

                        <!-- Área de arrastrar y soltar para la firma -->
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

                            <!-- Estado de procesamiento -->
                            <div v-if="procesandoFirma" class="text-gray-600 py-4">
                              <i class="fas fa-spinner fa-spin text-3xl text-emerald-600 mb-3"></i>
                              <p class="text-lg font-medium">Optimizando firma...</p>
                            </div>

                            <div v-else class="text-gray-600">
                              <!-- Icono dinámico -->
                              <div class="mx-auto h-12 w-12 mb-4 transition-all duration-200" :class="isDragOver ? 'scale-110' : ''">
                                <div v-if="!isDragOver" class="flex items-center justify-center">
                                    <svg class="h-12 w-12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                                        <path fill="#9ca3af" d="M192 192C192 174.3 206.3 160 224 160C241.7 160 256 174.3 256 192L256 199.8C256 227.5 253.6 255.1 248.9 282.3L164.5 307.6C123.9 319.8 96.1 357.2 96.1 399.6L96.1 432L24.1 432C10.8 432 .1 442.7 .1 456C.1 469.3 10.8 480 24.1 480L96.6 480C100.8 516 131.4 544 168.6 544C194.6 544 218.6 530.1 231.5 507.5L245.4 483.2C272.2 436.2 291.9 385.5 303.8 332.7L398.2 304.4L385.7 341.9C382.4 351.7 384.1 362.4 390.1 370.7C396.1 379 405.7 384 416 384L544 384C561.7 384 576 369.7 576 352C576 334.3 561.7 320 544 320L460.4 320L478.4 266.1C482.2 254.8 479.3 242.3 471 233.7C462.7 225.1 450.3 221.9 438.8 225.3L316.4 262.1C318.8 241.4 320 220.7 320 199.8L320 192C320 139 277 96 224 96C171 96 128 139 128 192L128 224C128 241.7 142.3 256 160 256C177.7 256 192 241.7 192 224L192 192zM182.8 369L231.8 354.3C221.4 388.1 207.3 420.7 189.7 451.5L175.8 475.8C174.3 478.4 171.5 480.1 168.4 480.1C163.7 480.1 159.9 476.3 159.9 471.6L159.9 399.7C159.9 385.6 169.2 373.1 182.7 369zM616 480C629.3 480 640 469.3 640 456C640 442.7 629.3 432 616 432L323.1 432C316.6 448.3 309.4 464.3 301.5 480L616 480z"/>
                                    </svg>
                                </div>

                                <div v-else class="flex items-center justify-center">
                                    <svg class="h-12 w-12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">
                                        <path fill="#00bc7d" d="M192 128c0-17.7 14.3-32 32-32s32 14.3 32 32l0 7.8c0 27.7-2.4 55.3-7.1 82.5l-84.4 25.3c-40.6 12.2-68.4 49.6-68.4 92l0 32.4-72 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l72.5 0c4.2 36 34.8 64 72 64 26 0 50-13.9 62.9-36.5l13.9-24.3c26.8-47 46.5-97.7 58.4-150.5l94.4-28.3-12.5 37.5c-3.3 9.8-1.6 20.5 4.4 28.8S405.7 320 416 320l128 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-83.6 0 18-53.9c3.8-11.3 .9-23.8-7.4-32.4s-20.7-11.8-32.2-8.4L316.4 198.1c2.4-20.7 3.6-41.4 3.6-62.3l0-7.8c0-53-43-96-96-96s-96 43-96 96l0 32c0 17.7 14.3 32 32 32s32-14.3 32-32l0-32zm-9.2 177l49-14.7c-10.4 33.8-24.5 66.4-42.1 97.2l-13.9 24.3c-1.5 2.6-4.3 4.3-7.4 4.3-4.7 0-8.5-3.8-8.5-8.5l0-71.9c0-14.1 9.3-26.6 22.8-30.7zM616 416c13.3 0 24-10.7 24-24s-10.7-24-24-24l-292.9 0c-6.5 16.3-13.7 32.3-21.6 48L616 416z"/>
                                    </svg>
                                </div>
                              </div>
                              
                              <!-- Texto dinámico -->
                              <p class="text-lg font-medium transition-colors duration-200" :class="isDragOver ? 'text-emerald-700' : ''">
                                {{ isDragOver ? '¡Suelta la firma aquí!' : 'Arrastra la firma aquí o haz clic para seleccionar' }}
                              </p>
                              <p class="text-sm text-gray-500 mt-2">PNG, JPG, JPEG (máximo 1MB)</p>
                              
                              <!-- Indicador visual cuando se arrastra -->
                              <div v-if="isDragOver" class="mt-3">
                                <div class="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                  </svg>
                                  Listo para soltar
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Mostrar la vista previa del pie de página y firma del médico -->
                        <div class="flex flex-col lg:flex-row justify-center items-stretch xl:items-center gap-6 mt-4">

                            <!-- Pie de Página del Médico Firmante (Izquierda) -->
                            <div v-if="piePaginaFirmante.nombre" class="w-full xl:w-1/2 flex flex-col items-center xl:items-start">
                                <p class="font-medium text-lg text-gray-700 text-left">Pie de Página del Enfermera Firmante:</p>
                                <div class="w-full max-w-md mt-4 p-4 border rounded-lg bg-gray-50 text-left">                  
                                    <p class="text-sm text-gray-800 space-y-1">
                                        <span class="font-medium" v-if="piePaginaFirmante.nombre">
                                            {{ piePaginaFirmante.nombreCompleto }}
                                        </span><br v-if="piePaginaFirmante.nombre">
                                        
                                        <span v-if="piePaginaFirmante.numeroCedulaProfesional" class="font-light">
                                            {{ proveedorSaludStore.proveedorSalud.pais === 'MX' ? 'Cédula Profesional Médico Cirujano No.' : 'Registro Profesional No.' }} {{ piePaginaFirmante.numeroCedulaProfesional }}
                                        </span><br v-if="piePaginaFirmante.numeroCedulaProfesional">
                                                                                
                                        <span v-if="piePaginaFirmante.nombreCredencialAdicional" 
                                            class="font-light block truncate overflow-hidden text-ellipsis whitespace-nowrap max-w-[390px]">
                                            {{ piePaginaFirmante.nombreCredencialAdicional }} No. {{ piePaginaFirmante.numeroCredencialAdicional }}
                                        </span>

                                        <span v-if="piePaginaFirmante.hasSexoForPie" class="font-light">
                                            {{ piePaginaFirmante.piePaginaTexto }}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <!-- Vista previa de las Firmas (Derecha) -->
                            <div class="flex flex-col sm:flex-row justify-center items-center gap-4">
                                <div v-if="enfermeraFirmante.enfermeraFirmante?.firma?.data" class="w-full flex flex-col items-center">
                                    <p class="font-medium text-lg text-gray-700">Firma actual:</p>
                                    <img :src="firmaSrc" :alt="'Firma de ' + piePaginaFirmante.nombreCompleto"
                                        class="w-40 h-40 sm:w-48 sm:h-48 object-contain mt-2 border-2 border-gray-300 rounded-lg"/>
                                </div>

                                <!-- Firma Nueva -->
                                <Transition appear name="fade-slow">
                                    <div v-if="firmaPreview" class="w-full flex flex-col items-center">
                                        <p class="font-medium text-lg text-gray-700">Firma Nueva:</p>
                                        <img :src="firmaPreview" alt="Vista previa de la firma"
                                            class="w-40 h-40 sm:w-48 sm:h-48 object-contain mt-2 border-2 border-gray-300 rounded-lg" />
                                    </div>
                                </Transition>
                            </div>

                        </div>

                        <hr class="my-3">
                        <div class="form-action-buttons flex flex-col sm:flex-row justify-between gap-2">
                            <!-- Botón de Volver -->
                            <RouterLink :to="{ name: 'inicio' }"
                                class="nav-action-link flex items-center justify-center text-lg w-full sm:w-1/2 rounded-lg bg-white font-medium text-gray-800 shadow-sm ring-2 ring-inset ring-gray-300 hover:bg-gray-100 p-3 transition-transform duration-300 transform hover:scale-105 hover:shadow-lg">
                                Volver
                            </RouterLink>
                            <!-- Botón de Actualizar -->
                            <div class="w-full sm:w-1/2">
                                <FormKit type="submit" :disabled="enfermeraFirmante.saving">
                                    <span v-if="enfermeraFirmante.saving">Guardando...</span>
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
