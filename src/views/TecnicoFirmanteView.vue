<script setup>
import { ref, inject, watch, computed, provide } from 'vue';
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
import { convertirFechaISOaYYYYMMDD, calcularEdadPrecisa } from '@/helpers/dates';
import { extractApiErrorMessage } from '@/helpers/apiErrors';
import {
  isPaisNacimientoNoEspecificado,
  PAIS_NACIMIENTO_NO_ESPECIFICADO_FIRMANTE_MESSAGE,
} from '@/helpers/paisNacimiento';
import { FIRMANTE_EDAD_MINIMA, FIRMANTE_EDAD_MAXIMA } from '../../formkit.config';
import { formatearTituloYNombreFirmante } from '@/helpers/nombres';
import { useFirmanteIdentificationReadOnly } from '@/composables/useFirmanteIdentificationReadOnly';

const tecnicoFirmante = useTecnicoFirmanteStore();
const proveedorSaludStore = useProveedorSaludStore();
const userStore = useUserStore();
const router = useRouter();
const {
  curpRequired,
  showCurpField,
  isSIRES,
  paisNacimientoRequired,
  entidadNacimientoRequired,
  showEntidadNacimiento,
  sexoRequired,
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

useResidenciaGeoCoherence(nom024ResidenciaFields);

const firmaPreview = ref(null);
const firmaArchivo = ref(null);
const isDragOver = ref(false);

const formularioTecnicoFirmante = ref({
  nombre: "",
  curp: "",
  primerApellido: "",
  segundoApellido: "",
  sexo: "",
  tituloProfesional: "",
  numeroCedulaProfesional: "",
  nombreCredencialAdicional: "",
  numeroCredencialAdicional: "",
  paisNacimiento: "",
  entidadNacimiento: "",
  fechaNacimiento: "",
});

useEntidadPaisNacimientoCoherence(formularioTecnicoFirmante);

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const fechaNacimientoMax = computed(() => {
  const limite = new Date();
  limite.setFullYear(limite.getFullYear() - FIRMANTE_EDAD_MINIMA);
  return formatDateInputValue(limite);
});

const fechaNacimientoMin = computed(() => {
  const limite = new Date();
  limite.setFullYear(limite.getFullYear() - FIRMANTE_EDAD_MAXIMA);
  return formatDateInputValue(limite);
});

watch(
  () => tecnicoFirmante.tecnicoFirmante,
  (firmante) => {
    if (firmante?._id) {
      Object.assign(formularioTecnicoFirmante.value, {
        nombre: firmante.nombre || "",
        curp: firmante.curp || "",
        sexo: firmante.sexo || "",
        tituloProfesional: firmante.tituloProfesional || "",
        numeroCedulaProfesional: firmante.numeroCedulaProfesional || "",
        nombreCredencialAdicional: firmante.nombreCredencialAdicional || "",
        numeroCredencialAdicional: firmante.numeroCredencialAdicional || "",
        paisNacimiento: firmante.paisNacimiento ?? "",
        entidadNacimiento: firmante.entidadNacimiento || "",
        fechaNacimiento: firmante.fechaNacimiento
          ? convertirFechaISOaYYYYMMDD(firmante.fechaNacimiento)
          : "",
        primerApellido: firmante.primerApellido || "",
        segundoApellido: firmante.segundoApellido || "",
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
      initializeResidenciaGeoFields(nom024ResidenciaFields);
    }
  },
  { immediate: true },
);

const formSubmitAttempted = ref(false);
provide('formSubmitAttempted', formSubmitAttempted);

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
  nombreCompleto: formatearTituloYNombreFirmante(formularioTecnicoFirmante.value),
  tituloProfesional: formularioTecnicoFirmante.value.tituloProfesional || "",
  numeroCedulaProfesional: formularioTecnicoFirmante.value.numeroCedulaProfesional || "",
  nombreCredencialAdicional: formularioTecnicoFirmante.value.nombreCredencialAdicional || "",
  numeroCredencialAdicional: formularioTecnicoFirmante.value.numeroCredencialAdicional || "",
  sexo: formularioTecnicoFirmante.value.sexo || "",
}));

const toast = inject('toast');

const handleFileChange = (event) => {
  const file = event?.target?.files?.[0];
  if (file && file instanceof File) {
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.open({ message: validation.message, type: 'error' });
      return;
    }
    firmaArchivo.value = file;
    const reader = new FileReader();
    reader.onload = (e) => { firmaPreview.value = e.target.result; };
    reader.readAsDataURL(file);
  } else {
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
  const files = Array.from(event.dataTransfer.files);
  if (files.length > 0) {
    const file = files[0];
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.open({ message: validation.message, type: 'error' });
      return;
    }
    firmaArchivo.value = file;
    const reader = new FileReader();
    reader.onload = (e) => { firmaPreview.value = e.target.result; };
    reader.readAsDataURL(file);
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

  if (isPaisNacimientoNoEspecificado(formularioTecnicoFirmante.value.paisNacimiento)) {
    toast.open({ type: "error", message: PAIS_NACIMIENTO_NO_ESPECIFICADO_FIRMANTE_MESSAGE });
    return;
  }

  if (curpRequired.value && (!data.curp || data.curp.trim() === '')) {
    toast.open({
      type: "error",
      message: "El CURP es obligatorio para firmantes en régimen SIRES_NOM024",
    });
    return;
  }

  const sexo = data.sexo || formularioTecnicoFirmante.value.sexo;
  if (sexoRequired.value && !sexo) {
    toast.open({
      type: "error",
      message: "El sexo es obligatorio para firmantes en régimen SIRES_NOM024",
    });
    return;
  }

  const entidadNacimiento = formularioTecnicoFirmante.value.entidadNacimiento;
  if (entidadNacimientoRequired.value && !entidadNacimiento) {
    toast.open({
      type: "error",
      message: "La entidad de nacimiento es obligatoria para firmantes en régimen SIRES_NOM024",
    });
    return;
  }

  if (geoFieldsRequired.value) {
    if (!nom024ResidenciaFields.value.paisResidencia && nom024ResidenciaFields.value.paisResidencia !== 0) {
      toast.open({ type: "error", message: "El país de residencia es obligatorio para firmantes en régimen SIRES_NOM024" });
      return;
    }
    if (!nom024ResidenciaFields.value.entidadResidencia) {
      toast.open({ type: "error", message: "La entidad de residencia es obligatoria para firmantes en régimen SIRES_NOM024" });
      return;
    }
    if (!nom024ResidenciaFields.value.municipioResidencia) {
      toast.open({ type: "error", message: "El municipio de residencia es obligatorio para firmantes en régimen SIRES_NOM024" });
      return;
    }
    if (!nom024ResidenciaFields.value.localidadResidencia) {
      toast.open({ type: "error", message: "La localidad de residencia es obligatoria para firmantes en régimen SIRES_NOM024" });
      return;
    }
  }

  const fechaNacimiento = data.fechaNacimiento || formularioTecnicoFirmante.value.fechaNacimiento;
  if (!fechaNacimiento) {
    toast.open({ type: "error", message: "La fecha de nacimiento es obligatoria" });
    return;
  }

  const edad = calcularEdadPrecisa(fechaNacimiento);
  if (edad < FIRMANTE_EDAD_MINIMA) {
    toast.open({ type: "error", message: "El técnico firmante debe tener al menos 18 años cumplidos" });
    return;
  }
  if (edad > FIRMANTE_EDAD_MAXIMA) {
    toast.open({ type: "error", message: "El técnico firmante no puede tener más de 90 años cumplidos" });
    return;
  }

  const formData = new FormData();

  const baseData = {
    ...data,
    nombre: formularioTecnicoFirmante.value.nombre,
    primerApellido: formularioTecnicoFirmante.value.primerApellido,
    segundoApellido: formularioTecnicoFirmante.value.segundoApellido,
    curp: formularioTecnicoFirmante.value.curp,
    fechaNacimiento,
    paisNacimiento: formularioTecnicoFirmante.value.paisNacimiento,
    entidadNacimiento: formularioTecnicoFirmante.value.entidadNacimiento,
    entidadResidencia: nom024ResidenciaFields.value.entidadResidencia,
    paisResidencia: nom024ResidenciaFields.value.paisResidencia,
    municipioResidencia: nom024ResidenciaFields.value.municipioResidencia,
    localidadResidencia: nom024ResidenciaFields.value.localidadResidencia,
    sexo: sexo || formularioTecnicoFirmante.value.sexo,
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
    <div class="relative bg-white text-gray-800 w-full max-w-5xl p-5 sm:p-8 lg:p-10 mt-2 sm:mt-4 rounded-lg shadow-lg mx-auto max-h-none overflow-visible lg:max-h-[82vh] lg:overflow-y-auto">
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

            <div v-if="showCurpField" class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                  <span class="text-base text-gray-700">
                    CURP (Clave Única de Registro de Población)
                    <span v-if="curpRequired" class="text-red-500">*</span>
                  </span>
                </template>
              </FormKit>

              <p class="flex items-center -mt-5 md:mt-0">
                <span class="text-xs text-gray-600 mt-0 md:mt-3 mb-5 md:mb-0">
                  <i class="fas fa-info-circle mr-1"></i>
                  CURP de 18 caracteres (ej. PERJ920315HDFRDN05)
                  <br v-if="isSIRES">
                  <span v-if="isSIRES" class="text-amber-700 font-medium">Obligatorio para régimen SIRES_NOM024</span>
                </span>
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <FormKit
                type="text"
                label="Título Profesional"
                name="tituloProfesional"
                placeholder="Tec., Lic., Ing., etc."
                v-model="formularioTecnicoFirmante.tituloProfesional"
              />
              <FormKit
                type="text"
                label="Nombre(s)"
                name="nombre"
                placeholder="Ej. Juan"
                validation="required"
                :disabled="isCurpConformationReadOnly"
                :validation-messages="{ required: 'Este campo es obligatorio' }"
                v-model="formularioTecnicoFirmante.nombre"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <FormKit
                type="text"
                label="Primer Apellido"
                name="primerApellido"
                placeholder="Ej. Pérez"
                validation="required"
                :disabled="isCurpConformationReadOnly"
                :validation-messages="{ required: 'Este campo es obligatorio' }"
                v-model="formularioTecnicoFirmante.primerApellido"
              />
              <FormKit
                type="text"
                label="Segundo Apellido"
                name="segundoApellido"
                placeholder="Ej. Galeana"
                :disabled="isCurpConformationReadOnly"
                v-model="formularioTecnicoFirmante.segundoApellido"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <FormKit
                type="select"
                label="Sexo"
                name="sexo"
                placeholder='Selecciona "Masculino" o "Femenino"'
                :options="['Masculino', 'Femenino']"
                :disabled="isCurpConformationReadOnly"
                :validation="sexoRequired ? 'required' : ''"
                :validation-messages="{ required: 'Este campo es obligatorio' }"
                v-model="formularioTecnicoFirmante.sexo"
              >
                <template #label="{ label }">
                  <span>{{ label }} <span v-if="sexoRequired" class="text-red-500">*</span></span>
                </template>
              </FormKit>

              <FormKit
                type="date"
                name="fechaNacimiento"
                :disabled="isCurpConformationReadOnly"
                validation="required|fechaNacimientoFirmanteValidation"
                :validation-messages="{
                  required: 'La fecha de nacimiento es obligatoria',
                  fechaNacimientoFirmanteValidation: 'La fecha debe corresponder a una edad entre 18 y 90 años cumplidos',
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
                exclude-no-especificado
              />
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
                  />
                  <PaisNacimientoAutocomplete
                    v-model="formularioTecnicoFirmante.paisNacimiento"
                    label="País de nacimiento"
                    placeholder="Buscar por nombre de país..."
                    :required="paisNacimientoRequired"
                    exclude-no-especificado
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
                >
                  <template #pais>
                    <PaisNacimientoAutocomplete
                      v-model="nom024ResidenciaFields.paisResidencia"
                      label="País de residencia"
                      placeholder="Buscar por nombre de país..."
                      :required="geoFieldsRequired"
                    />
                  </template>
                </ResidenciaGeoAutocomplete>
              </div>
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mt-4 mb-2">Firma (Asegura que sea .png sin fondo, cuadrada, de al menos 500 x 500px)</label>
              <div
                class="border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-all duration-200 cursor-pointer"
                :class="[
                  isDragOver
                    ? 'border-emerald-500 bg-emerald-50 scale-105'
                    : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'
                ]"
                @dragenter="handleDragEnter"
                @dragleave="handleDragLeave"
                @dragover="handleDragOver"
                @drop="handleDrop"
                @click="$refs.firmaInput.click()"
              >
                <input
                  ref="firmaInput"
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  @change="handleFileChange"
                  class="hidden"
                />
                <div class="text-gray-600">
                  <p class="text-lg font-medium transition-colors duration-200" :class="isDragOver ? 'text-emerald-700' : ''">
                    {{ isDragOver ? '¡Suelta la firma aquí!' : 'Arrastra la firma aquí o haz clic para seleccionar' }}
                  </p>
                  <p class="text-sm text-gray-500 mt-2">PNG, JPG, JPEG (máximo 1MB)</p>
                </div>
              </div>
            </div>

            <div class="flex flex-col xl:flex-row justify-center items-stretch xl:items-center gap-6 mt-4">
              <div v-if="piePaginaFirmante.nombre" class="w-full xl:w-1/2 flex flex-col items-center xl:items-start">
                <p class="font-medium text-lg text-gray-700 text-center xl:text-left">Pie de Página del Técnico Firmante:</p>
                <div class="w-full max-w-md mt-4 p-4 border rounded-lg bg-gray-50 text-center xl:text-left">
                  <p class="text-sm text-gray-800 space-y-1">
                    <span class="font-medium" v-if="piePaginaFirmante.nombre">{{ piePaginaFirmante.nombreCompleto }}</span><br v-if="piePaginaFirmante.nombre">
                    <span v-if="piePaginaFirmante.numeroCedulaProfesional" class="font-light">
                      {{ proveedorSaludStore.proveedorSalud.pais === 'MX' ? 'Cédula Profesional No.' : 'Registro Profesional No.' }} {{ piePaginaFirmante.numeroCedulaProfesional }}
                    </span><br v-if="piePaginaFirmante.numeroCedulaProfesional">
                    <span v-if="piePaginaFirmante.nombreCredencialAdicional" class="font-light block truncate overflow-hidden text-ellipsis whitespace-nowrap max-w-[390px]">
                      {{ piePaginaFirmante.nombreCredencialAdicional }} No. {{ piePaginaFirmante.numeroCredencialAdicional }}
                    </span>
                    <span v-if="piePaginaFirmante.sexo" class="font-light">Responsable de evaluación</span>
                  </p>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row justify-center items-center gap-4">
                <div v-if="tecnicoFirmante.tecnicoFirmante?.firma?.data" class="w-full sm:w-1/2 flex flex-col items-center">
                  <p class="font-medium text-lg text-gray-700">Firma actual:</p>
                  <img :src="firmaSrc" :alt="'Firma de ' + piePaginaFirmante.nombreCompleto" class="w-40 h-40 sm:w-48 sm:h-48 object-contain mt-2 border-2 border-gray-300 rounded-lg"/>
                </div>
                <Transition appear name="fade-slow">
                  <div v-if="firmaPreview" class="w-full sm:w-1/2 flex flex-col items-center">
                    <p class="font-medium text-lg text-gray-700">Firma Nueva:</p>
                    <img :src="firmaPreview" alt="Vista previa de la firma" class="w-40 h-40 sm:w-48 sm:h-48 object-contain mt-2 border-2 border-gray-300 rounded-lg" />
                  </div>
                </Transition>
              </div>
            </div>

            <hr class="my-3">
            <div class="flex flex-col sm:flex-row justify-between items-center gap-2">
              <RouterLink :to="{ name: 'inicio' }" class="nav-action-link block text-center text-lg w-full sm:w-1/2 rounded-lg bg-white font-medium text-gray-800 shadow-sm ring-2 ring-inset ring-gray-300 hover:bg-gray-100 p-3 transition-transform duration-300 transform hover:scale-105 hover:shadow-lg mb-1">Volver</RouterLink>
              <div class="w-full sm:w-1/2 pr-2">
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
</template>

<style scoped>
.fade-slow-enter-from,
.fade-slow-leave-to { opacity: 0; }
.fade-slow-enter-active,
.fade-slow-leave-active { transition: all 500ms ease-out; }
.fade-slow-leave-active { transition-delay: 250ms; }
</style>
