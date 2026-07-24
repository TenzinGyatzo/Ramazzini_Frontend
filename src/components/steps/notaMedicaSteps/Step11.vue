<script setup>
import { watch, ref, onMounted, onUnmounted, computed, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import CIE10Autocomplete from '@/components/selectors/CIE10Autocomplete.vue';
import { validateCIE10Duplicates } from '@/helpers/cie10';
import {
  validateDiagnostico3Sis,
  fetchMedicoEnfermeraFirmantes,
  tieneComorbilidadDiagRegistrada,
  isPrimeraVezComorbilidadActiva,
} from '@/helpers/notaMedicaDiagnosticosSis';
import { useConfirmacionDiagnostica } from '@/composables/useConfirmacionDiagnostica';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useUserStore } from '@/stores/user';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const { formDataNotaMedica } = useFormDataStore();
const documentos = useDocumentosStore();
const trabajadores = useTrabajadoresStore();
const userStore = useUserStore();
const proveedorSaludStore = useProveedorSaludStore();
const showSiresUI = computed(() => proveedorSaludStore.showSiresUI);
const esMujer = computed(() => trabajadores.currentTrabajador?.sexo === 'Femenino');

// Helper para extraer código CIE-10 del formato "CODE - DESCRIPTION"
const extractCode = (value) => {
  if (!value) return '';
  if (!value.includes(' - ')) return value;
  return value.split(' - ')[0].trim();
};

// Pregunta inicial: ¿Registrar una tercera comorbilidad? (0=No por defecto, 1=Sí)
const registrarComorbilidad = ref(0);
// NOM-024 GIIS-B015: Campos para tercer diagnóstico
const primeraVezDiagnostico3 = ref(null); // number | null (0=No, 1=Si)
const codigoCIEDiagnostico3 = ref(
  formDataNotaMedica.codigoCIEDiagnostico3 ||
  documentos.currentDocument?.codigoCIEDiagnostico3 ||
  ''
);
const confirmacionDiagnostica3 = ref(false);

// Computed: fechaNotaMedica para calcular edad
const fechaNotaMedica = computed(() => {
  const fecha = formDataNotaMedica.fechaNotaMedica || documentos.currentDocument?.fechaNotaMedica;
  if (fecha) {
    try {
      return new Date(fecha);
    } catch {
      return new Date();
    }
  }
  return new Date();
});

// Computed: Edad del trabajador en años
const edadTrabajador = computed(() => {
  const trabajador = trabajadores.currentTrabajador;
  if (!trabajador?.fechaNacimiento) return null;
  try {
    const fn = new Date(trabajador.fechaNacimiento);
    const fc = fechaNotaMedica.value;
    if (isNaN(fn.getTime()) || isNaN(fc.getTime())) return null;
    let edad = fc.getFullYear() - fn.getFullYear();
    const m = fc.getMonth() - fn.getMonth();
    if (m < 0 || (m === 0 && fc.getDate() < fn.getDate())) edad--;
    return edad;
  } catch {
    return null;
  }
});

const medicoFirmanteRef = ref(null);
const enfermeraFirmanteRef = ref(null);

const { muestraConfirmacion: muestraConfirmacionDiagnostica3 } = useConfirmacionDiagnostica({
  slot: 3,
  codigo: codigoCIEDiagnostico3,
  edadTrabajador,
  medicoFirmante: medicoFirmanteRef,
  enfermeraFirmante: enfermeraFirmanteRef,
  primeraVezDiagnostico: primeraVezDiagnostico3,
});

const limpiarComorbilidad3EnStore = () => {
  delete formDataNotaMedica.primeraVezDiagnostico3;
  formDataNotaMedica.codigoCIEDiagnostico3 = '';
  delete formDataNotaMedica.confirmacionDiagnostica3;
};

onMounted(async () => {
  await loadFirmantes();
  if (formDataNotaMedica.primeraVezDiagnostico3 === -1) {
    delete formDataNotaMedica.primeraVezDiagnostico3;
  }
  const doc = documentos.currentDocument || formDataNotaMedica;
  const tieneComorbilidad = tieneComorbilidadDiagRegistrada(
    doc?.primeraVezDiagnostico3,
    doc?.codigoCIEDiagnostico3,
  );
  if (tieneComorbilidad) {
    registrarComorbilidad.value = 1;
  }
  if (documentos.currentDocument) {
    const d = documentos.currentDocument;
    const pv = d.primeraVezDiagnostico3;
    primeraVezDiagnostico3.value = pv === 0 || pv === 1 ? pv : null;
    confirmacionDiagnostica3.value = d.confirmacionDiagnostica3 ?? false;
  }
  if (formDataNotaMedica.primeraVezDiagnostico3 !== undefined && formDataNotaMedica.primeraVezDiagnostico3 !== null) {
    const pv = formDataNotaMedica.primeraVezDiagnostico3;
    primeraVezDiagnostico3.value = pv === 0 || pv === 1 ? pv : null;
  }
  if (formDataNotaMedica.confirmacionDiagnostica3 !== undefined) {
    confirmacionDiagnostica3.value = formDataNotaMedica.confirmacionDiagnostica3;
  }
  if (codigoCIEDiagnostico3.value && !formDataNotaMedica.codigoCIEDiagnostico3) {
    formDataNotaMedica.codigoCIEDiagnostico3 = codigoCIEDiagnostico3.value;
  }
  scheduleValidateDiag3Sis();
});

onUnmounted(() => {
  if (diag3SisDebounceTimer) clearTimeout(diag3SisDebounceTimer);
  if (registrarComorbilidad.value === 0) {
    limpiarComorbilidad3EnStore();
  } else {
    if (showSiresUI.value) {
      const pv = primeraVezDiagnostico3.value;
      formDataNotaMedica.primeraVezDiagnostico3 = pv ?? undefined;
    } else {
      delete formDataNotaMedica.primeraVezDiagnostico3;
    }
    formDataNotaMedica.codigoCIEDiagnostico3 = codigoCIEDiagnostico3.value || '';
    if (muestraConfirmacionDiagnostica3.value) {
      formDataNotaMedica.confirmacionDiagnostica3 = confirmacionDiagnostica3.value;
    } else {
      formDataNotaMedica.confirmacionDiagnostica3 = undefined;
    }
  }
});

watch(registrarComorbilidad, (val) => {
  if (val === 0) {
    primeraVezDiagnostico3.value = null;
    codigoCIEDiagnostico3.value = '';
    confirmacionDiagnostica3.value = false;
    limpiarComorbilidad3EnStore();
  }
  scheduleValidateDiag3Sis();
});

watch(codigoCIEDiagnostico3, (newValue) => {
  formDataNotaMedica.codigoCIEDiagnostico3 = newValue || '';
  scheduleValidateDiag3Sis();
});

watch(confirmacionDiagnostica3, (newValue) => {
  if (muestraConfirmacionDiagnostica3.value) {
    formDataNotaMedica.confirmacionDiagnostica3 = newValue;
  } else {
    formDataNotaMedica.confirmacionDiagnostica3 = undefined;
  }
});

watch(muestraConfirmacionDiagnostica3, (newValue) => {
  if (!newValue) {
    confirmacionDiagnostica3.value = false;
    formDataNotaMedica.confirmacionDiagnostica3 = undefined;
  } else if (confirmacionDiagnostica3.value !== undefined && confirmacionDiagnostica3.value !== null) {
    formDataNotaMedica.confirmacionDiagnostica3 = confirmacionDiagnostica3.value;
  }
});

watch(primeraVezDiagnostico3, (newValue) => {
  formDataNotaMedica.primeraVezDiagnostico3 = newValue ?? undefined;
  if (newValue === 0 && !muestraConfirmacionDiagnostica3.value) {
    confirmacionDiagnostica3.value = false;
    formDataNotaMedica.confirmacionDiagnostica3 = undefined;
  }
  scheduleValidateDiag3Sis();
});

// Validación de duplicidades CIE-10 para diagnóstico 3
const cie10Validation = computed(() => {
  return validateCIE10Duplicates({
    codigoCIE10Principal: formDataNotaMedica.codigoCIE10Principal,
    codigosCIE10Complementarios: formDataNotaMedica.codigosCIE10Complementarios,
    codigoCIEDiagnostico2: formDataNotaMedica.codigoCIEDiagnostico2,
    codigoCIEDiagnostico3: codigoCIEDiagnostico3.value
  });
});

const diagnostico3EqualsPrincipalError = computed(() => {
  return cie10Validation.value.issues.find(
    issue => issue.type === 'diagnostico3_equals_principal'
  )?.message || null;
});

const diagnostico3EqualsComplementaryError = computed(() => {
  return cie10Validation.value.issues.find(
    issue => issue.type === 'diagnostico3_equals_complementary'
  )?.message || null;
});

const diagnostico3EqualsDiagnostico2Error = computed(() => {
  return cie10Validation.value.issues.find(
    issue => issue.type === 'diagnostico3_equals_diagnostico2'
  )?.message || null;
});

const diagnostico3SisError = ref('');
let diag3SisDebounceTimer = null;

const loadFirmantes = async () => {
  const userId = userStore.user?._id;
  if (!userId) return;
  const { medicoFirmante, enfermeraFirmante } = await fetchMedicoEnfermeraFirmantes(userId);
  medicoFirmanteRef.value = medicoFirmante;
  enfermeraFirmanteRef.value = enfermeraFirmante;
};

const validateDiag3Sis = async () => {
  diagnostico3SisError.value = '';
  if (registrarComorbilidad.value === 0) return;

  const diag2Registrado = showSiresUI.value
    ? isPrimeraVezComorbilidadActiva(formDataNotaMedica.primeraVezDiagnostico2)
    : tieneComorbilidadDiagRegistrada(
        formDataNotaMedica.primeraVezDiagnostico2,
        formDataNotaMedica.codigoCIEDiagnostico2,
      );
  if (!diag2Registrado) {
    diagnostico3SisError.value =
      'Debe registrar primero el diagnóstico 2 (comorbilidad) antes del diagnóstico 3.';
    return;
  }

  const trabajador = trabajadores.currentTrabajador;
  if (!trabajador) return;

  const pv = primeraVezDiagnostico3.value;
  if (showSiresUI.value) {
    formDataNotaMedica.primeraVezDiagnostico3 = pv ?? undefined;
  }

  try {
    const result = await validateDiagnostico3Sis({
      formData: {
        ...formDataNotaMedica,
        codigoCIEDiagnostico3: codigoCIEDiagnostico3.value,
        primeraVezDiagnostico3: pv ?? formDataNotaMedica.primeraVezDiagnostico3,
      },
      trabajadorSexo: trabajador.sexo || '',
      trabajadorFechaNacimiento: trabajador.fechaNacimiento
        ? new Date(trabajador.fechaNacimiento)
        : fechaNotaMedica.value,
      fechaNotaMedica: fechaNotaMedica.value,
      medicoFirmante: medicoFirmanteRef.value,
      enfermeraFirmante: enfermeraFirmanteRef.value,
      showSiresUI: showSiresUI.value,
      esMujer: esMujer.value,
    });
    if (!result.ok && result.messageInline) {
      diagnostico3SisError.value = result.messageInline;
    }
  } catch (error) {
    console.error('Error validando diagnóstico 3 DIAGNOSTICO_SIS:', error);
  }
};

const scheduleValidateDiag3Sis = () => {
  if (diag3SisDebounceTimer) clearTimeout(diag3SisDebounceTimer);
  diag3SisDebounceTimer = setTimeout(() => {
    validateDiag3Sis();
  }, 350);
};

watch(fechaNotaMedica, scheduleValidateDiag3Sis);
watch(() => formDataNotaMedica.codigoCIE10Principal, scheduleValidateDiag3Sis);
watch(() => formDataNotaMedica.primeraVezDiagnostico2, scheduleValidateDiag3Sis);
watch(() => formDataNotaMedica.codigoCIEDiagnostico2, scheduleValidateDiag3Sis);
watch(() => trabajadores.currentTrabajador?.sexo, scheduleValidateDiag3Sis);
watch(() => trabajadores.currentTrabajador?.fechaNacimiento, scheduleValidateDiag3Sis);
watch(() => userStore.user?._id, () => {
  loadFirmantes().then(() => scheduleValidateDiag3Sis());
});
</script>

<template>
  <div :class="variant === 'compact' ? 'space-y-2.5' : 'space-y-2'">
    <h2
      v-if="variant !== 'compact'"
      class="text-2xl font-bold text-gray-900"
    >
      DIAGNÓSTICO 3
    </h2>
    <p
      v-else
      class="text-sm font-bold text-gray-900 leading-tight"
    >
      Diagnóstico 3
    </p>

    <!-- 0. Pregunta inicial: ¿Registrar una tercera comorbilidad? (No por defecto) -->
    <div>
      <h3
        :class="variant === 'compact'
          ? 'text-xs text-gray-500 mb-1.5 leading-snug'
          : 'text-base font-medium text-gray-700 mb-2'"
      >
        ¿Registrar una tercera comorbilidad?
      </h3>
      <div class="grid grid-cols-2 gap-3 mb-1">
        <label
          :class="[
            'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            registrarComorbilidad === 0
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
          ]"
        >
          <input type="radio" :value="0" v-model="registrarComorbilidad" class="sr-only" />
          <span :class="['text-sm transition-colors duration-200', registrarComorbilidad === 0 ? 'text-emerald-700 font-semibold' : 'text-gray-700']">
            No
          </span>
          <div v-if="registrarComorbilidad === 0" class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>
        <label
          :class="[
            'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            registrarComorbilidad === 1
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
          ]"
        >
          <input type="radio" :value="1" v-model="registrarComorbilidad" class="sr-only" />
          <span :class="['text-sm transition-colors duration-200', registrarComorbilidad === 1 ? 'text-emerald-700 font-semibold' : 'text-gray-700']">
            Sí
          </span>
          <div v-if="registrarComorbilidad === 1" class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>
      </div>
    </div>

    <!-- Bloques visibles solo cuando registrarComorbilidad === Sí -->
    <div v-if="registrarComorbilidad === 1" class="space-y-6">
      <!-- Primera vez diagnóstico 3 (SIRES_NOM024) -->
      <div v-if="showSiresUI">
        <h3
          :class="variant === 'compact'
            ? 'text-xs font-medium text-gray-600 mb-1.5'
            : 'text-base font-medium text-gray-700 mb-2'"
        >
          Primera vez diagnóstico 3 <span class="text-red-500">*</span>
        </h3>
        <div class="grid grid-cols-2 gap-3 mb-1">
          <label
            :class="[
              'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
              primeraVezDiagnostico3 === 0
                ? 'border-emerald-600 bg-emerald-50 shadow-md'
                : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
            ]"
          >
            <input type="radio" :value="0" v-model="primeraVezDiagnostico3" class="sr-only" />
            <span :class="['text-sm transition-colors duration-200', primeraVezDiagnostico3 === 0 ? 'text-emerald-700 font-semibold' : 'text-gray-700']">
              No
            </span>
            <div v-if="primeraVezDiagnostico3 === 0" class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
          </label>
          <label
            :class="[
              'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
              primeraVezDiagnostico3 === 1
                ? 'border-emerald-600 bg-emerald-50 shadow-md'
                : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
            ]"
          >
            <input type="radio" :value="1" v-model="primeraVezDiagnostico3" class="sr-only" />
            <span :class="['text-sm transition-colors duration-200', primeraVezDiagnostico3 === 1 ? 'text-emerald-700 font-semibold' : 'text-gray-700']">
              Sí
            </span>
            <div v-if="primeraVezDiagnostico3 === 1" class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
          </label>
        </div>
      </div>

      <!-- 2. Código CIE-10 Diagnóstico 3 (obligatorio cuando comorbilidad=Sí) -->
      <div>
        <CIE10Autocomplete
          v-model="codigoCIEDiagnostico3"
          label="Código CIE-10 Diagnóstico 3"
          :required="true"
          :trabajadorId="trabajadores.currentTrabajadorId"
          :fechaConsulta="fechaNotaMedica"
          :dense="variant === 'compact'"
          placeholder="Buscar tercer diagnóstico..."
        />
        <p
          :class="variant === 'compact'
            ? 'mt-1 text-xs text-gray-500'
            : 'mt-1 text-xs text-gray-600'"
        >
          Padecimiento distinto al diagnóstico principal y al diagnóstico 2 que también está presente.
        </p>
        <Transition name="fade">
          <div v-if="diagnostico3SisError" class="mt-2">
            <div class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 shadow-sm">
              <i class="fas fa-exclamation-triangle mt-0.5"></i>
              <span class="flex-1 font-medium">{{ diagnostico3SisError }}</span>
            </div>
          </div>
        </Transition>
        <div v-if="diagnostico3EqualsPrincipalError || diagnostico3EqualsComplementaryError || diagnostico3EqualsDiagnostico2Error" class="mt-2 space-y-2">
          <Transition name="fade">
            <div v-if="diagnostico3EqualsPrincipalError" class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 shadow-sm">
              <i class="fas fa-exclamation-triangle mt-0.5"></i>
              <span class="flex-1 font-medium">{{ diagnostico3EqualsPrincipalError }}</span>
            </div>
          </Transition>
          <Transition name="fade">
            <div v-if="diagnostico3EqualsComplementaryError" class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 shadow-sm">
              <i class="fas fa-exclamation-triangle mt-0.5"></i>
              <span class="flex-1 font-medium">{{ diagnostico3EqualsComplementaryError }}</span>
            </div>
          </Transition>
          <Transition name="fade">
            <div v-if="diagnostico3EqualsDiagnostico2Error" class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 shadow-sm">
              <i class="fas fa-exclamation-triangle mt-0.5"></i>
              <span class="flex-1 font-medium">{{ diagnostico3EqualsDiagnostico2Error }}</span>
            </div>
          </Transition>
        </div>
      </div>

      <!-- 3. Confirmación diagnóstica 3 (Fe de Erratas: solo cuando aplica) -->
      <div v-if="muestraConfirmacionDiagnostica3" class="space-y-2 border border-amber-200 rounded-xl p-4 bg-amber-50/30">
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="confirmacionDiagnostica3"
            v-model="confirmacionDiagnostica3"
            class="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
          />
          <label for="confirmacionDiagnostica3" class="text-sm font-medium text-gray-700">
            Confirmación Diagnóstica 3 <span class="text-red-500">*</span>
          </label>
        </div>
        <p class="text-xs text-amber-700">
          <i class="fas fa-exclamation-triangle"></i>
          Requerida para diagnósticos crónicos (Diabetes, HTA) o Cáncer en menores de 18 años
        </p>
      </div>
    </div>
  </div>
</template>
