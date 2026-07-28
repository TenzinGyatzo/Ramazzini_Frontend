<script setup>
import { watch, ref, onMounted, onUnmounted, computed, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import CIE10Autocomplete from '@/components/selectors/CIE10Autocomplete.vue';
import { validateCIE10Duplicates } from '@/helpers/cie10';
import {
  validateDiagnostico2Sis,
  fetchMedicoEnfermeraFirmantes,
  tieneComorbilidadDiagRegistrada,
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

// Pregunta inicial: ¿Registrar una comorbilidad? (0=No por defecto, 1=Sí)
const registrarComorbilidad = ref(0);
// NOM-024 GIIS-B015: Campos para segundo diagnóstico
const primeraVezDiagnostico2 = ref(null); // number | null (0=No, 1=Si)
const codigoCIEDiagnostico2 = ref(
  formDataNotaMedica.codigoCIEDiagnostico2 ||
  documentos.currentDocument?.codigoCIEDiagnostico2 ||
  ''
);
const confirmacionDiagnostica2 = ref(false);
const diagnosticoTexto = ref(
  formDataNotaMedica.diagnosticoTexto ||
  documentos.currentDocument?.diagnosticoTexto ||
  documentos.currentDocument?.diagnostico ||
  ''
);

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

const { muestraConfirmacion: muestraConfirmacionDiagnostica2 } = useConfirmacionDiagnostica({
  slot: 2,
  codigo: codigoCIEDiagnostico2,
  edadTrabajador,
  medicoFirmante: medicoFirmanteRef,
  enfermeraFirmante: enfermeraFirmanteRef,
  primeraVezDiagnostico: primeraVezDiagnostico2,
});

const limpiarComorbilidad2EnStore = () => {
  delete formDataNotaMedica.primeraVezDiagnostico2;
  formDataNotaMedica.codigoCIEDiagnostico2 = '';
  delete formDataNotaMedica.confirmacionDiagnostica2;
  delete formDataNotaMedica.diagnosticoTexto;
};

onMounted(async () => {
  await loadFirmantes();
  if (formDataNotaMedica.primeraVezDiagnostico2 === -1) {
    delete formDataNotaMedica.primeraVezDiagnostico2;
  }
  const doc = documentos.currentDocument || formDataNotaMedica;
  const tieneComorbilidad = tieneComorbilidadDiagRegistrada(
    doc?.primeraVezDiagnostico2,
    doc?.codigoCIEDiagnostico2,
  );
  if (tieneComorbilidad) {
    registrarComorbilidad.value = 1;
  }
  if (documentos.currentDocument) {
    const d = documentos.currentDocument;
    const pv = d.primeraVezDiagnostico2;
    primeraVezDiagnostico2.value = pv === 0 || pv === 1 ? pv : null;
    confirmacionDiagnostica2.value = d.confirmacionDiagnostica2 ?? false;
  }
  if (formDataNotaMedica.primeraVezDiagnostico2 !== undefined && formDataNotaMedica.primeraVezDiagnostico2 !== null) {
    const pv = formDataNotaMedica.primeraVezDiagnostico2;
    primeraVezDiagnostico2.value = pv === 0 || pv === 1 ? pv : null;
  }
  if (formDataNotaMedica.confirmacionDiagnostica2 !== undefined) {
    confirmacionDiagnostica2.value = formDataNotaMedica.confirmacionDiagnostica2;
  }
  if (codigoCIEDiagnostico2.value && !formDataNotaMedica.codigoCIEDiagnostico2) {
    formDataNotaMedica.codigoCIEDiagnostico2 = codigoCIEDiagnostico2.value;
  }
  if (diagnosticoTexto.value && !formDataNotaMedica.diagnosticoTexto) {
    formDataNotaMedica.diagnosticoTexto = diagnosticoTexto.value;
  }
  scheduleValidateDiag2Sis();
});

onUnmounted(() => {
  if (diag2SisDebounceTimer) clearTimeout(diag2SisDebounceTimer);
  if (registrarComorbilidad.value === 0) {
    limpiarComorbilidad2EnStore();
  } else {
    if (showSiresUI.value) {
      const pv = primeraVezDiagnostico2.value;
      formDataNotaMedica.primeraVezDiagnostico2 = pv ?? undefined;
    } else {
      delete formDataNotaMedica.primeraVezDiagnostico2;
    }
    formDataNotaMedica.codigoCIEDiagnostico2 = codigoCIEDiagnostico2.value || '';
    if (muestraConfirmacionDiagnostica2.value) {
      formDataNotaMedica.confirmacionDiagnostica2 = confirmacionDiagnostica2.value;
    } else {
      formDataNotaMedica.confirmacionDiagnostica2 = undefined;
    }
    formDataNotaMedica.diagnosticoTexto = diagnosticoTexto.value || '';
  }
});

watch(registrarComorbilidad, (val) => {
  if (val === 0) {
    primeraVezDiagnostico2.value = null;
    codigoCIEDiagnostico2.value = '';
    confirmacionDiagnostica2.value = false;
    diagnosticoTexto.value = '';
    limpiarComorbilidad2EnStore();
  }
  scheduleValidateDiag2Sis();
});


watch(codigoCIEDiagnostico2, (newValue) => {
  formDataNotaMedica.codigoCIEDiagnostico2 = newValue || '';
  scheduleValidateDiag2Sis();
});

watch(confirmacionDiagnostica2, (newValue) => {
  if (muestraConfirmacionDiagnostica2.value) {
    formDataNotaMedica.confirmacionDiagnostica2 = newValue;
  } else {
    formDataNotaMedica.confirmacionDiagnostica2 = undefined;
  }
});

watch(muestraConfirmacionDiagnostica2, (newValue) => {
  if (!newValue) {
    confirmacionDiagnostica2.value = false;
    formDataNotaMedica.confirmacionDiagnostica2 = undefined;
  } else if (confirmacionDiagnostica2.value !== undefined && confirmacionDiagnostica2.value !== null) {
    formDataNotaMedica.confirmacionDiagnostica2 = confirmacionDiagnostica2.value;
  }
});

watch(primeraVezDiagnostico2, (newValue) => {
  formDataNotaMedica.primeraVezDiagnostico2 = newValue ?? undefined;
  if (newValue === 0 && !muestraConfirmacionDiagnostica2.value) {
    confirmacionDiagnostica2.value = false;
    formDataNotaMedica.confirmacionDiagnostica2 = undefined;
  }
  scheduleValidateDiag2Sis();
});

watch(diagnosticoTexto, (newValue) => {
  formDataNotaMedica.diagnosticoTexto = newValue || '';
});

// Validación de duplicidades CIE-10 para diagnóstico 2
const cie10Validation = computed(() => {
  return validateCIE10Duplicates({
    codigoCIE10Principal: formDataNotaMedica.codigoCIE10Principal,
    codigosCIE10Complementarios: formDataNotaMedica.codigosCIE10Complementarios,
    codigoCIEDiagnostico2: codigoCIEDiagnostico2.value,
    codigoCIEDiagnostico3: null // En Step7 no validamos diagnóstico 3
  });
});

const diagnostico2EqualsPrincipalError = computed(() => {
  return cie10Validation.value.issues.find(
    issue => issue.type === 'diagnostico2_equals_principal'
  )?.message || null;
});

const diagnostico2EqualsComplementaryError = computed(() => {
  return cie10Validation.value.issues.find(
    issue => issue.type === 'diagnostico2_equals_complementary'
  )?.message || null;
});

const diagnostico2SisError = ref('');
let diag2SisDebounceTimer = null;

const loadFirmantes = async () => {
  const userId = userStore.user?._id;
  if (!userId) return;
  const { medicoFirmante, enfermeraFirmante } = await fetchMedicoEnfermeraFirmantes(userId);
  medicoFirmanteRef.value = medicoFirmante;
  enfermeraFirmanteRef.value = enfermeraFirmante;
};

const validateDiag2Sis = async () => {
  diagnostico2SisError.value = '';
  if (registrarComorbilidad.value === 0) return;

  const trabajador = trabajadores.currentTrabajador;
  if (!trabajador) return;

  const pv = primeraVezDiagnostico2.value;
  if (showSiresUI.value) {
    formDataNotaMedica.primeraVezDiagnostico2 = pv ?? undefined;
  }

  try {
    const result = await validateDiagnostico2Sis({
      formData: {
        ...formDataNotaMedica,
        codigoCIEDiagnostico2: codigoCIEDiagnostico2.value,
        primeraVezDiagnostico2: pv ?? formDataNotaMedica.primeraVezDiagnostico2,
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
      diagnostico2SisError.value = result.messageInline;
    }
  } catch (error) {
    console.error('Error validando diagnóstico 2 DIAGNOSTICO_SIS:', error);
  }
};

const scheduleValidateDiag2Sis = () => {
  if (diag2SisDebounceTimer) clearTimeout(diag2SisDebounceTimer);
  diag2SisDebounceTimer = setTimeout(() => {
    validateDiag2Sis();
  }, 350);
};

watch(fechaNotaMedica, scheduleValidateDiag2Sis);
watch(() => formDataNotaMedica.codigoCIE10Principal, scheduleValidateDiag2Sis);
watch(() => trabajadores.currentTrabajador?.sexo, scheduleValidateDiag2Sis);
watch(() => trabajadores.currentTrabajador?.fechaNacimiento, scheduleValidateDiag2Sis);
watch(() => userStore.user?._id, () => {
  loadFirmantes().then(() => scheduleValidateDiag2Sis());
});

</script>

<template>
  <div class="nota-medica-dark-inputs" :class="variant === 'compact' ? 'space-y-2.5' : 'space-y-2'">
    <h2
      v-if="variant !== 'compact'"
      class="text-2xl font-bold text-gray-900"
    >
      DIAGNÓSTICO SECUNDARIO
    </h2>
    <p
      v-else
      class="text-sm font-bold text-gray-900 leading-tight"
    >
      Diagnóstico secundario
    </p>

    <!-- 0. Pregunta inicial: ¿Registrar una comorbilidad? (No por defecto) -->
    <div>
      <h3
        :class="variant === 'compact'
          ? 'text-xs text-gray-500 mb-1.5 leading-snug'
          : 'text-base font-medium text-gray-700 mb-2'"
      >
        ¿Registrar una comorbilidad?
      </h3>
      <div class="grid grid-cols-2 gap-3 mb-1">
        <label
          :class="[
            'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            registrarComorbilidad === 0
              ? 'border-emerald-600 bg-emerald-50 shadow-md dark:bg-emerald-950/50 dark:border-emerald-500'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30'
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
              ? 'border-emerald-600 bg-emerald-50 shadow-md dark:bg-emerald-950/50 dark:border-emerald-500'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30'
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
      <!-- Primera vez diagnóstico 2 (SIRES_NOM024) -->
      <div v-if="showSiresUI">
        <h3
          :class="variant === 'compact'
            ? 'text-xs font-medium text-gray-600 mb-1.5'
            : 'text-base font-medium text-gray-700 mb-2'"
        >
          Primera vez diagnóstico 2 <span class="text-red-500">*</span>
        </h3>
        <div class="grid grid-cols-2 gap-3 mb-1">
          <label
            :class="[
              'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
              primeraVezDiagnostico2 === 0
                ? 'border-emerald-600 bg-emerald-50 shadow-md dark:bg-emerald-950/50 dark:border-emerald-500'
                : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30'
            ]"
          >
            <input type="radio" :value="0" v-model="primeraVezDiagnostico2" class="sr-only" />
            <span :class="['text-sm transition-colors duration-200', primeraVezDiagnostico2 === 0 ? 'text-emerald-700 font-semibold' : 'text-gray-700']">
              No
            </span>
            <div v-if="primeraVezDiagnostico2 === 0" class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
          </label>
          <label
            :class="[
              'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
              primeraVezDiagnostico2 === 1
                ? 'border-emerald-600 bg-emerald-50 shadow-md dark:bg-emerald-950/50 dark:border-emerald-500'
                : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30'
            ]"
          >
            <input type="radio" :value="1" v-model="primeraVezDiagnostico2" class="sr-only" />
            <span :class="['text-sm transition-colors duration-200', primeraVezDiagnostico2 === 1 ? 'text-emerald-700 font-semibold' : 'text-gray-700']">
              Sí
            </span>
            <div v-if="primeraVezDiagnostico2 === 1" class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
          </label>
        </div>
      </div>

      <!-- 2. Código CIE-10 Diagnóstico 2 (obligatorio cuando comorbilidad=Sí, independiente de primeraVez) -->
      <div>
        <CIE10Autocomplete
          v-model="codigoCIEDiagnostico2"
          label="Código CIE-10 Diagnóstico 2"
          :required="true"
          :trabajadorId="trabajadores.currentTrabajadorId"
          :fechaConsulta="fechaNotaMedica"
          :dense="variant === 'compact'"
          placeholder="Buscar segundo diagnóstico..."
        />
        <p
          :class="variant === 'compact'
            ? 'mt-1 text-xs text-gray-500'
            : 'mt-1 text-xs text-gray-600'"
        >
          Padecimiento distinto al diagnóstico principal que también está presente.
        </p>
        <Transition name="fade">
          <div v-if="diagnostico2SisError" class="mt-2">
            <div class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 shadow-sm">
              <i class="fas fa-exclamation-triangle mt-0.5"></i>
              <span class="flex-1 font-medium">{{ diagnostico2SisError }}</span>
            </div>
          </div>
        </Transition>
        <div v-if="diagnostico2EqualsPrincipalError || diagnostico2EqualsComplementaryError" class="mt-2 space-y-2">
          <Transition name="fade">
            <div v-if="diagnostico2EqualsPrincipalError" class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 shadow-sm">
              <i class="fas fa-exclamation-triangle mt-0.5"></i>
              <span class="flex-1 font-medium">{{ diagnostico2EqualsPrincipalError }}</span>
            </div>
          </Transition>
          <Transition name="fade">
            <div v-if="diagnostico2EqualsComplementaryError" class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 shadow-sm">
              <i class="fas fa-exclamation-triangle mt-0.5"></i>
              <span class="flex-1 font-medium">{{ diagnostico2EqualsComplementaryError }}</span>
            </div>
          </Transition>
        </div>
      </div>

      <!-- 3. Confirmación diagnóstica 2 (Fe de Erratas: solo cuando aplica) -->
      <div v-if="muestraConfirmacionDiagnostica2" class="space-y-2 border border-amber-200 rounded-xl p-4 bg-amber-50/30">
      <div class="flex items-center gap-2">
        <input
          type="checkbox"
          id="confirmacionDiagnostica2"
          v-model="confirmacionDiagnostica2"
          class="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
        />
        <label for="confirmacionDiagnostica2" class="text-sm font-medium text-gray-700">
          Confirmación Diagnóstica 2 <span class="text-red-500">*</span>
        </label>
      </div>
      <p class="text-xs text-amber-700">
        <i class="fas fa-exclamation-triangle"></i>
        Requerida para diagnósticos crónicos (Diabetes, HTA) o Cáncer en menores de 18 años
      </p>
      </div>

      <!-- 4. Descripción complementaria -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Descripción complementaria
        </label>
        <input
          class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          v-model="diagnosticoTexto"
          placeholder="Descripción del diagnóstico..."
          data-skip-validation
        />
        <p class="mt-1 text-xs text-gray-500">
          Puede complementar el diagnóstico codificado con texto libre adicional
        </p>
      </div>
    </div>
  </div>
</template>
