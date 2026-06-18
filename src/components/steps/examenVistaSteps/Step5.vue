<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';

const formDataStore = useFormDataStore();
const formDataExamenVista = formDataStore.formDataExamenVista;
const documentos = useDocumentosStore();
const proveedorSaludStore = useProveedorSaludStore();

const ciegaOI = computed(() => formDataExamenVista.ojoIzquierdoCegueraTotal ?? formDataExamenVista.ojoIzquierdoLejanaCegueraTotal ?? formDataExamenVista.ojoIzquierdoCercanaCegueraTotal ?? false);
const ciegaOD = computed(() => formDataExamenVista.ojoDerechoCegueraTotal ?? formDataExamenVista.ojoDerechoLejanaCegueraTotal ?? formDataExamenVista.ojoDerechoCercanaCegueraTotal ?? false);

const usaLentes = ref(formDataExamenVista.conCorreccionCercanaInterpretacion ? 'Si' : 'No');
const ojoIzquierdoCercanaConCorreccion = ref(
  ciegaOI.value ? undefined : (formDataExamenVista.ojoIzquierdoCercanaConCorreccion ?? 20)
);
const ojoDerechoCercanaConCorreccion = ref(
  ciegaOD.value ? undefined : (formDataExamenVista.ojoDerechoCercanaConCorreccion ?? 20)
);
const conCorreccionCercanaInterpretacion = ref(formDataExamenVista.conCorreccionCercanaInterpretacion ?? 'Visión normal');

const mensajeErrorOjoIzquierdo = computed(() => {
  if (usaLentes.value === 'No' || ciegaOI.value) return '';
  const v = ojoIzquierdoCercanaConCorreccion.value;
  if (v == null || v === '') return 'Debe capturar el valor';
  const n = Number(v);
  if (n < 5) return 'Debe ser mínimo 5';
  if (n > 400) return 'Debe ser máximo 400';
  return '';
});

const mensajeErrorOjoDerecho = computed(() => {
  if (usaLentes.value === 'No' || ciegaOD.value) return '';
  const v = ojoDerechoCercanaConCorreccion.value;
  if (v == null || v === '') return 'Debe capturar el valor';
  const n = Number(v);
  if (n < 5) return 'Debe ser mínimo 5';
  if (n > 400) return 'Debe ser máximo 400';
  return '';
});

const interpretacionParaMostrar = computed(() => {
  const v = conCorreccionCercanaInterpretacion.value || '';
  return v.includes(' OD: ') ? v.replace(' OD: ', '\nOD: ') : v;
});

// Computed property para determinar el color de semaforización de la interpretación
const colorInterpretacion = computed(() => {
  if (usaLentes.value === 'No') return 'bg-gray-50 text-gray-800';
  
  let interpretacion = conCorreccionCercanaInterpretacion.value || '';
  if (interpretacion.startsWith('OI: ')) interpretacion = interpretacion.slice(4);
  else if (interpretacion.startsWith('OD: ')) interpretacion = interpretacion.slice(4);
  
  if (interpretacion === 'Visión excepcional' || interpretacion === 'Visión normal') {
    return 'bg-emerald-50 text-emerald-800';
  } else if (interpretacion === 'Visión ligeramente reducida') {
    return 'bg-yellow-50 text-yellow-800';
  } else if (interpretacion === 'Visión moderadamente reducida' || interpretacion === 'Visión significativamente reducida') {
    return 'bg-orange-50 text-orange-800';
  } else if (interpretacion === 'Visión muy reducida' || interpretacion.startsWith('Ceguera')) {
    return 'bg-red-100 text-red-900';
  }
  return 'bg-gray-50 text-gray-800';
});

onMounted(() => {
  if (documentos.currentDocument?.conCorreccionCercanaInterpretacion) {
    const doc = documentos.currentDocument;
    usaLentes.value = 'Si';
    const ciegaOIDoc = doc.ojoIzquierdoCegueraTotal ?? doc.ojoIzquierdoLejanaCegueraTotal ?? doc.ojoIzquierdoCercanaCegueraTotal ?? false;
    const ciegaODDoc = doc.ojoDerechoCegueraTotal ?? doc.ojoDerechoLejanaCegueraTotal ?? doc.ojoDerechoCercanaCegueraTotal ?? false;
    ojoIzquierdoCercanaConCorreccion.value = ciegaOIDoc ? undefined : (doc.ojoIzquierdoCercanaConCorreccion ?? 20);
    ojoDerechoCercanaConCorreccion.value = ciegaODDoc ? undefined : (doc.ojoDerechoCercanaConCorreccion ?? 20);
    conCorreccionCercanaInterpretacion.value = doc.conCorreccionCercanaInterpretacion ?? 'Visión normal';
  } else {
    usaLentes.value = formDataExamenVista.conCorreccionCercanaInterpretacion ? 'Si' : 'No';
    ojoIzquierdoCercanaConCorreccion.value = ciegaOI.value ? undefined : (formDataExamenVista.ojoIzquierdoCercanaConCorreccion ?? 20);
    ojoDerechoCercanaConCorreccion.value = ciegaOD.value ? undefined : (formDataExamenVista.ojoDerechoCercanaConCorreccion ?? 20);
    conCorreccionCercanaInterpretacion.value = formDataExamenVista.conCorreccionCercanaInterpretacion ?? 'Visión normal';
  }
  // Guatemala: si utilizaAnteojos es Si, pre-cargar usaLentes automáticamente
  const paisProveedor = proveedorSaludStore.proveedorSalud?.pais;
  if (paisProveedor === 'GT' && formDataExamenVista.utilizaAnteojos === 'Si') {
    usaLentes.value = 'Si';
    ojoIzquierdoCercanaConCorreccion.value = ciegaOI.value ? undefined : (formDataExamenVista.ojoIzquierdoCercanaConCorreccion ?? 20);
    ojoDerechoCercanaConCorreccion.value = ciegaOD.value ? undefined : (formDataExamenVista.ojoDerechoCercanaConCorreccion ?? 20);
    conCorreccionCercanaInterpretacion.value = formDataExamenVista.conCorreccionCercanaInterpretacion || 'Visión normal';
    interpretarAgudezaVisualCercana();
  }
});

onUnmounted(() => {
  if (usaLentes.value === 'No') {
    formDataExamenVista.ojoIzquierdoCercanaConCorreccion = undefined;
    formDataExamenVista.ojoDerechoCercanaConCorreccion = undefined;
    formDataExamenVista.conCorreccionCercanaInterpretacion = undefined;
  } else {
    formDataExamenVista.ojoIzquierdoCercanaConCorreccion = ciegaOI.value ? undefined : ojoIzquierdoCercanaConCorreccion.value;
    formDataExamenVista.ojoDerechoCercanaConCorreccion = ciegaOD.value ? undefined : ojoDerechoCercanaConCorreccion.value;
    formDataExamenVista.conCorreccionCercanaInterpretacion = conCorreccionCercanaInterpretacion.value;
  }
});

// Observa el cambio de usaLentes
watch(usaLentes, (newVal) => {
  if (newVal === 'Si') {
    ojoIzquierdoCercanaConCorreccion.value = ciegaOI.value ? undefined : (formDataExamenVista.ojoIzquierdoCercanaConCorreccion ?? 20);
    ojoDerechoCercanaConCorreccion.value = ciegaOD.value ? undefined : (formDataExamenVista.ojoDerechoCercanaConCorreccion ?? 20);
    formDataExamenVista.ojoIzquierdoCercanaConCorreccion = ciegaOI.value ? undefined : ojoIzquierdoCercanaConCorreccion.value;
    formDataExamenVista.ojoDerechoCercanaConCorreccion = ciegaOD.value ? undefined : ojoDerechoCercanaConCorreccion.value;
    conCorreccionCercanaInterpretacion.value = formDataExamenVista.conCorreccionCercanaInterpretacion || 'Visión normal';
    interpretarAgudezaVisualCercana();
  } else {
    // Limpia los valores si no usa lentes
    ojoIzquierdoCercanaConCorreccion.value = undefined;
    ojoDerechoCercanaConCorreccion.value = undefined;
    conCorreccionCercanaInterpretacion.value = undefined;
    formDataExamenVista.ojoIzquierdoCercanaConCorreccion = undefined;
    formDataExamenVista.ojoDerechoCercanaConCorreccion = undefined;
    formDataExamenVista.conCorreccionCercanaInterpretacion = undefined;
  }
});

watch([ojoIzquierdoCercanaConCorreccion, ojoDerechoCercanaConCorreccion], () => {
  formDataExamenVista.ojoIzquierdoCercanaConCorreccion = ciegaOI.value ? undefined : ojoIzquierdoCercanaConCorreccion.value;
  formDataExamenVista.ojoDerechoCercanaConCorreccion = ciegaOD.value ? undefined : ojoDerechoCercanaConCorreccion.value;
  interpretarAgudezaVisualCercana();
});

function obtenerInterpretacion(valor) {
  if (valor == null || valor === '') return null;
  const v = Number(valor);
  if (v >= 5 && v <= 15) return "Visión excepcional";
  if (v >= 16 && v <= 25) return "Visión normal";
  if (v >= 26 && v <= 35) return "Visión ligeramente reducida";
  if (v >= 36 && v <= 45) return "Visión moderadamente reducida";
  if (v >= 46 && v <= 55) return "Visión significativamente reducida";
  if (v >= 56) return "Visión muy reducida";
  return "NA";
}

function interpretarAgudezaVisualCercana() {
  const oiCiega = ciegaOI.value;
  const odCiega = ciegaOD.value;
  if (oiCiega && odCiega) {
    conCorreccionCercanaInterpretacion.value = "Ceguera total";
  } else if (oiCiega) {
    const interpOD = obtenerInterpretacion(ojoDerechoCercanaConCorreccion.value);
    conCorreccionCercanaInterpretacion.value = interpOD ? `OD: ${interpOD}` : "OD: NA";
  } else if (odCiega) {
    const interpOI = obtenerInterpretacion(ojoIzquierdoCercanaConCorreccion.value);
    conCorreccionCercanaInterpretacion.value = interpOI ? `OI: ${interpOI}` : "OI: NA";
  } else {
    const interpOI = obtenerInterpretacion(ojoIzquierdoCercanaConCorreccion.value);
    const interpOD = obtenerInterpretacion(ojoDerechoCercanaConCorreccion.value);
    const valOI = ojoIzquierdoCercanaConCorreccion.value != null ? Number(ojoIzquierdoCercanaConCorreccion.value) : 0;
    const valOD = ojoDerechoCercanaConCorreccion.value != null ? Number(ojoDerechoCercanaConCorreccion.value) : 0;
    conCorreccionCercanaInterpretacion.value = valOI > valOD ? (interpOI ?? 'NA') : (interpOD ?? 'NA');
  }
  formDataExamenVista.conCorreccionCercanaInterpretacion = conCorreccionCercanaInterpretacion.value;
}
</script>

<template>
  <div>
    <!-- Jerarquía Visual Mejorada -->
    <h1 class="text-2xl font-bold mb-4 text-gray-900">AGUDEZA VISUAL <br>CON CORRECCIÓN</h1>
    <h3 class="text-lg font-medium mb-6 text-gray-700">CERCANA (CARTA JAEGER)</h3>

    <!-- Pregunta Inicial con Diseño Mejorado -->
    <div class="mb-8">
      <p class="text-lg font-medium mb-4 text-gray-800">¿La persona usa lentes para leer?</p>
      
      <!-- Diseño de Radio Buttons más Visual tipo Card -->
      <div class="grid grid-cols-2 gap-3">
        <!-- Opción No -->
        <label 
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            usaLentes === 'No' 
              ? 'border-emerald-600 bg-emerald-50 shadow-md' 
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
          ]"
        >
          <input 
            type="radio" 
            value="No" 
            v-model="usaLentes" 
            class="sr-only" 
          />
          <!-- Icono -->
          <div 
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              usaLentes === 'No' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span 
            :class="[
              'text-base font-semibold transition-colors duration-200',
              usaLentes === 'No' ? 'text-emerald-700' : 'text-gray-700'
            ]"
          >
            No
          </span>
          <!-- Indicador de selección -->
          <div 
            v-if="usaLentes === 'No'"
            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>

        <!-- Opción Si -->
        <label 
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            usaLentes === 'Si' 
              ? 'border-emerald-600 bg-emerald-50 shadow-md' 
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
          ]"
        >
          <input 
            type="radio" 
            value="Si" 
            v-model="usaLentes" 
            class="sr-only" 
          />
          <!-- Icono -->
          <div 
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              usaLentes === 'Si' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span 
            :class="[
              'text-base font-semibold transition-colors duration-200',
              usaLentes === 'Si' ? 'text-emerald-700' : 'text-gray-700'
            ]"
          >
            Sí
          </span>
          <!-- Indicador de selección -->
          <div 
            v-if="usaLentes === 'Si'"
            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>
      </div>
    </div>

    <!-- Campos de agudeza visual con transición -->
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 transform -translate-y-2"
      enter-to-class="opacity-100 transform translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 transform translate-y-0"
      leave-to-class="opacity-0 transform -translate-y-2"
    >
      <div v-if="usaLentes === 'Si'">
        <!-- Ojo Izquierdo -->
        <div class="mb-6">
          <label for="ojoIzquierdoCercanaConCorreccion" class="block text-lg font-normal text-gray-800 mb-3">
            Ojo Izquierdo
          </label>
          <div class="flex space-x-4 mt-1 mb-4 items-center" v-if="ciegaOI">
            <span class="px-3 py-2 rounded-lg bg-red-100 text-red-900 font-medium">Ceguera Total</span>
          </div>
          <div class="flex space-x-4 mt-1 mb-4" v-else>
            <div class="flex flex-col space-y-1">
              <input type="number" class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 bg-gray-100 cursor-default" value="20" step="5" min="5" max="400" readonly title="Medida base. No editable." />
            </div>
            <p class="text-3xl">/</p>
            <div class="flex flex-col space-y-1">
              <input type="number" class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" v-model="ojoIzquierdoCercanaConCorreccion" step="5" min="5" max="400" placeholder="" />
            </div>
          </div>
          <transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 transform -translate-y-1"
            enter-to-class="opacity-100 transform translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 transform translate-y-0"
            leave-to-class="opacity-0 transform -translate-y-1"
          >
            <p v-if="mensajeErrorOjoIzquierdo" class="text-red-600 text-sm mt-2 font-medium">
              ⚠️ {{ mensajeErrorOjoIzquierdo }}
            </p>
          </transition>
        </div>

        <!-- Ojo Derecho -->
        <div class="mb-6">
          <label for="ojoDerechoCercanaConCorreccion" class="block text-lg font-normal text-gray-800 mb-3">
            Ojo Derecho
          </label>
          <div class="flex space-x-4 mt-1 mb-4 items-center" v-if="ciegaOD">
            <span class="px-3 py-2 rounded-lg bg-red-100 text-red-900 font-medium">Ceguera Total</span>
          </div>
          <div class="flex space-x-4 mt-1 mb-4" v-else>
            <div class="flex flex-col space-y-1">
              <input type="number" class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 bg-gray-100 cursor-default" value="20" step="5" min="5" max="400" readonly title="Medida base. No editable." />
            </div>
            <p class="text-3xl">/</p>
            <div class="flex flex-col space-y-1">
              <input type="number" class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" v-model="ojoDerechoCercanaConCorreccion" step="5" min="5" max="400" placeholder="" />
            </div>
          </div>
          <transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 transform -translate-y-1"
            enter-to-class="opacity-100 transform translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 transform translate-y-0"
            leave-to-class="opacity-0 transform -translate-y-1"
          >
            <p v-if="mensajeErrorOjoDerecho" class="text-red-600 text-sm mt-2 font-medium">
              ⚠️ {{ mensajeErrorOjoDerecho }}
            </p>
          </transition>
        </div>

        <!-- Interpretación con Semaforización -->
        <div class="mb-4">
          <label class="block text-lg font-normal text-gray-800 mb-3">
            Interpretación
          </label>
          <div
            :class="[
              'w-full p-3 text-center border-2 border-gray-200 rounded-lg cursor-not-allowed font-semibold min-h-[3rem] flex items-center justify-center',
              colorInterpretacion
            ]"
            :title="conCorreccionCercanaInterpretacion"
          >
            <span class="break-words whitespace-pre-line">{{ interpretacionParaMostrar }}</span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
