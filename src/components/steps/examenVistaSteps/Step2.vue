<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const INTERPRETACION_LENTES_CONTACTO = 'No evaluable (lentes de contacto)';

const formDataStore = useFormDataStore();
const formDataExamenVista = formDataStore.formDataExamenVista;
const documentos = useDocumentosStore();

const ojoIzquierdoCegueraTotal = ref(formDataStore.formDataExamenVista.ojoIzquierdoCegueraTotal ?? false);
const ojoDerechoCegueraTotal = ref(formDataStore.formDataExamenVista.ojoDerechoCegueraTotal ?? false);
const sinCorreccionNoEvaluablePorLentesContacto = ref(false);
const ojoIzquierdoLejanaSinCorreccion = ref(20);
const ojoDerechoLejanaSinCorreccion = ref(20);
const sinCorreccionLejanaInterpretacion = ref('Visión normal');
const requiereLentesUsoGeneral = ref('No');

function getCiegaOI(doc) {
  return doc?.ojoIzquierdoCegueraTotal ?? doc?.ojoIzquierdoLejanaCegueraTotal ?? doc?.ojoIzquierdoCercanaCegueraTotal ?? false;
}
function getCiegaOD(doc) {
  return doc?.ojoDerechoCegueraTotal ?? doc?.ojoDerechoLejanaCegueraTotal ?? doc?.ojoDerechoCercanaCegueraTotal ?? false;
}

function aplicarNoEvaluableLentesContacto() {
  if (!ojoIzquierdoCegueraTotal.value) {
    ojoIzquierdoLejanaSinCorreccion.value = null;
    formDataExamenVista.ojoIzquierdoLejanaSinCorreccion = null;
  }
  if (!ojoDerechoCegueraTotal.value) {
    ojoDerechoLejanaSinCorreccion.value = null;
    formDataExamenVista.ojoDerechoLejanaSinCorreccion = null;
  }
  // Sincronizar también cercana: clínicamente no se puede medir sin corrección
  if (!ojoIzquierdoCegueraTotal.value) {
    formDataExamenVista.ojoIzquierdoCercanaSinCorreccion = null;
  }
  if (!ojoDerechoCegueraTotal.value) {
    formDataExamenVista.ojoDerechoCercanaSinCorreccion = null;
  }
  formDataExamenVista.sinCorreccionCercanaInterpretacion = INTERPRETACION_LENTES_CONTACTO;
  formDataExamenVista.requiereLentesParaLectura = 'No';
}

onMounted(() => {
  if (documentos.currentDocument) {
    const doc = documentos.currentDocument;
    ojoIzquierdoCegueraTotal.value = getCiegaOI(doc);
    ojoDerechoCegueraTotal.value = getCiegaOD(doc);
    sinCorreccionNoEvaluablePorLentesContacto.value = doc.sinCorreccionNoEvaluablePorLentesContacto ?? false;
    ojoIzquierdoLejanaSinCorreccion.value = (ojoIzquierdoCegueraTotal.value || sinCorreccionNoEvaluablePorLentesContacto.value)
      ? null
      : (doc.ojoIzquierdoLejanaSinCorreccion ?? 20);
    ojoDerechoLejanaSinCorreccion.value = (ojoDerechoCegueraTotal.value || sinCorreccionNoEvaluablePorLentesContacto.value)
      ? null
      : (doc.ojoDerechoLejanaSinCorreccion ?? 20);
    sinCorreccionLejanaInterpretacion.value = doc.sinCorreccionLejanaInterpretacion ?? 'Visión normal';
    requiereLentesUsoGeneral.value = doc.requiereLentesUsoGeneral ?? 'No';
  } else {
    ojoIzquierdoCegueraTotal.value = formDataExamenVista.ojoIzquierdoCegueraTotal ?? false;
    ojoDerechoCegueraTotal.value = formDataExamenVista.ojoDerechoCegueraTotal ?? false;
    sinCorreccionNoEvaluablePorLentesContacto.value = formDataExamenVista.sinCorreccionNoEvaluablePorLentesContacto ?? false;
    ojoIzquierdoLejanaSinCorreccion.value = (ojoIzquierdoCegueraTotal.value || sinCorreccionNoEvaluablePorLentesContacto.value)
      ? null
      : (formDataExamenVista.ojoIzquierdoLejanaSinCorreccion ?? 20);
    ojoDerechoLejanaSinCorreccion.value = (ojoDerechoCegueraTotal.value || sinCorreccionNoEvaluablePorLentesContacto.value)
      ? null
      : (formDataExamenVista.ojoDerechoLejanaSinCorreccion ?? 20);
    sinCorreccionLejanaInterpretacion.value = formDataExamenVista.sinCorreccionLejanaInterpretacion ?? 'Visión normal';
    requiereLentesUsoGeneral.value = formDataExamenVista.requiereLentesUsoGeneral ?? 'No';
  }
  formDataStore.setExamenVistaCeguera(ojoIzquierdoCegueraTotal.value, ojoDerechoCegueraTotal.value);
  formDataExamenVista.sinCorreccionNoEvaluablePorLentesContacto = sinCorreccionNoEvaluablePorLentesContacto.value;
  formDataExamenVista.ojoIzquierdoLejanaSinCorreccion = (ojoIzquierdoCegueraTotal.value || sinCorreccionNoEvaluablePorLentesContacto.value)
    ? null
    : ojoIzquierdoLejanaSinCorreccion.value;
  formDataExamenVista.ojoDerechoLejanaSinCorreccion = (ojoDerechoCegueraTotal.value || sinCorreccionNoEvaluablePorLentesContacto.value)
    ? null
    : ojoDerechoLejanaSinCorreccion.value;
  if (sinCorreccionNoEvaluablePorLentesContacto.value) {
    aplicarNoEvaluableLentesContacto();
  }
  interpretarAgudezaVisualLejana();
});

onUnmounted(() => {
  const noEvaluable = sinCorreccionNoEvaluablePorLentesContacto.value;
  formDataExamenVista.sinCorreccionNoEvaluablePorLentesContacto = noEvaluable;
  formDataExamenVista.ojoIzquierdoLejanaSinCorreccion = (ojoIzquierdoCegueraTotal.value || noEvaluable)
    ? null
    : ojoIzquierdoLejanaSinCorreccion.value;
  formDataExamenVista.ojoDerechoLejanaSinCorreccion = (ojoDerechoCegueraTotal.value || noEvaluable)
    ? null
    : ojoDerechoLejanaSinCorreccion.value;
  formDataStore.setExamenVistaCeguera(ojoIzquierdoCegueraTotal.value, ojoDerechoCegueraTotal.value);
  formDataExamenVista.sinCorreccionLejanaInterpretacion = sinCorreccionLejanaInterpretacion.value;
  formDataExamenVista.requiereLentesUsoGeneral = requiereLentesUsoGeneral.value;
  if (noEvaluable) {
    aplicarNoEvaluableLentesContacto();
  }
});

watch([ojoIzquierdoCegueraTotal, ojoDerechoCegueraTotal], () => {
  formDataStore.setExamenVistaCeguera(ojoIzquierdoCegueraTotal.value, ojoDerechoCegueraTotal.value);
  if (ojoIzquierdoCegueraTotal.value) {
    ojoIzquierdoLejanaSinCorreccion.value = null;
    formDataExamenVista.ojoIzquierdoLejanaSinCorreccion = null;
  }
  if (ojoDerechoCegueraTotal.value) {
    ojoDerechoLejanaSinCorreccion.value = null;
    formDataExamenVista.ojoDerechoLejanaSinCorreccion = null;
  }
  interpretarAgudezaVisualLejana();
}, { immediate: true });

watch(sinCorreccionNoEvaluablePorLentesContacto, (noEvaluable) => {
  formDataExamenVista.sinCorreccionNoEvaluablePorLentesContacto = noEvaluable;
  if (noEvaluable) {
    // Excluyente con ceguera total
    ojoIzquierdoCegueraTotal.value = false;
    ojoDerechoCegueraTotal.value = false;
    formDataStore.setExamenVistaCeguera(false, false);
    aplicarNoEvaluableLentesContacto();
  } else {
    ojoIzquierdoLejanaSinCorreccion.value = 20;
    ojoDerechoLejanaSinCorreccion.value = 20;
    formDataExamenVista.ojoIzquierdoLejanaSinCorreccion = 20;
    formDataExamenVista.ojoDerechoLejanaSinCorreccion = 20;
    // Restaurar cercana a default para forzar recaptura coherente
    formDataExamenVista.ojoIzquierdoCercanaSinCorreccion = 20;
    formDataExamenVista.ojoDerechoCercanaSinCorreccion = 20;
    formDataExamenVista.sinCorreccionCercanaInterpretacion = 'Visión normal';
    formDataExamenVista.requiereLentesParaLectura = 'No';
  }
  interpretarAgudezaVisualLejana();
});

watch([ojoIzquierdoLejanaSinCorreccion, ojoDerechoLejanaSinCorreccion], () => {
  if (!ojoIzquierdoCegueraTotal.value && !sinCorreccionNoEvaluablePorLentesContacto.value) {
    formDataExamenVista.ojoIzquierdoLejanaSinCorreccion = ojoIzquierdoLejanaSinCorreccion.value;
  }
  if (!ojoDerechoCegueraTotal.value && !sinCorreccionNoEvaluablePorLentesContacto.value) {
    formDataExamenVista.ojoDerechoLejanaSinCorreccion = ojoDerechoLejanaSinCorreccion.value;
  }
  interpretarAgudezaVisualLejana();
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
  return "Valor fuera de rango";
}

function interpretarAgudezaVisualLejana() {
  const ciegaOI = ojoIzquierdoCegueraTotal.value;
  const ciegaOD = ojoDerechoCegueraTotal.value;

  if (ciegaOI && ciegaOD) {
    sinCorreccionLejanaInterpretacion.value = "Ceguera total";
  } else if (sinCorreccionNoEvaluablePorLentesContacto.value) {
    sinCorreccionLejanaInterpretacion.value = INTERPRETACION_LENTES_CONTACTO;
  } else if (ciegaOI) {
    const interpOD = obtenerInterpretacion(ojoDerechoLejanaSinCorreccion.value);
    sinCorreccionLejanaInterpretacion.value = interpOD ? `OD: ${interpOD}` : "OD: NA";
  } else if (ciegaOD) {
    const interpOI = obtenerInterpretacion(ojoIzquierdoLejanaSinCorreccion.value);
    sinCorreccionLejanaInterpretacion.value = interpOI ? `OI: ${interpOI}` : "OI: NA";
  } else {
    const interpOI = obtenerInterpretacion(ojoIzquierdoLejanaSinCorreccion.value);
    const interpOD = obtenerInterpretacion(ojoDerechoLejanaSinCorreccion.value);
    const valOI = ojoIzquierdoLejanaSinCorreccion.value != null ? Number(ojoIzquierdoLejanaSinCorreccion.value) : 0;
    const valOD = ojoDerechoLejanaSinCorreccion.value != null ? Number(ojoDerechoLejanaSinCorreccion.value) : 0;
    sinCorreccionLejanaInterpretacion.value = valOI > valOD ? (interpOI ?? 'Valor fuera de rango') : (interpOD ?? 'Valor fuera de rango');
  }

  formDataExamenVista.sinCorreccionLejanaInterpretacion = sinCorreccionLejanaInterpretacion.value;
  requiereLentes();
}

function requiereLentes() {
  if (sinCorreccionNoEvaluablePorLentesContacto.value) {
    // Ya usa corrección óptica (lentes de contacto); no inventar a partir de Snellen
    requiereLentesUsoGeneral.value = "Si";
    formDataExamenVista.requiereLentesUsoGeneral = requiereLentesUsoGeneral.value;
    return;
  }
  const valOI = ojoIzquierdoCegueraTotal.value ? null : (ojoIzquierdoLejanaSinCorreccion.value != null ? Number(ojoIzquierdoLejanaSinCorreccion.value) : null);
  const valOD = ojoDerechoCegueraTotal.value ? null : (ojoDerechoLejanaSinCorreccion.value != null ? Number(ojoDerechoLejanaSinCorreccion.value) : null);
  const ojosConValor = [valOI, valOD].filter(v => v != null);
  if (ojosConValor.length === 0) {
    requiereLentesUsoGeneral.value = "No";
  } else if (ojosConValor.every(v => v <= 25)) {
    requiereLentesUsoGeneral.value = "No";
  } else {
    requiereLentesUsoGeneral.value = "Si";
  }
  formDataExamenVista.requiereLentesUsoGeneral = requiereLentesUsoGeneral.value;
}

function toggleCegueraOjoIzquierdo() {
  if (sinCorreccionNoEvaluablePorLentesContacto.value) return;
  ojoIzquierdoCegueraTotal.value = !ojoIzquierdoCegueraTotal.value;
  ojoIzquierdoLejanaSinCorreccion.value = null;
}

function toggleCegueraOjoDerecho() {
  if (sinCorreccionNoEvaluablePorLentesContacto.value) return;
  ojoDerechoCegueraTotal.value = !ojoDerechoCegueraTotal.value;
  ojoDerechoLejanaSinCorreccion.value = null;
}

function toggleLentesContacto() {
  sinCorreccionNoEvaluablePorLentesContacto.value = !sinCorreccionNoEvaluablePorLentesContacto.value;
}

const inputDeshabilitadoOI = computed(() => ojoIzquierdoCegueraTotal.value || sinCorreccionNoEvaluablePorLentesContacto.value);
const inputDeshabilitadoOD = computed(() => ojoDerechoCegueraTotal.value || sinCorreccionNoEvaluablePorLentesContacto.value);

const mensajeErrorOjoIzquierdo = computed(() => {
  if (inputDeshabilitadoOI.value) return '';
  const v = ojoIzquierdoLejanaSinCorreccion.value;
  if (v == null || v === '') return 'Debe capturar el valor';
  const n = Number(v);
  if (n < 5) return 'Debe ser mínimo 5';
  if (n > 400) return 'Debe ser máximo 400';
  return '';
});

const mensajeErrorOjoDerecho = computed(() => {
  if (inputDeshabilitadoOD.value) return '';
  const v = ojoDerechoLejanaSinCorreccion.value;
  if (v == null || v === '') return 'Debe capturar el valor';
  const n = Number(v);
  if (n < 5) return 'Debe ser mínimo 5';
  if (n > 400) return 'Debe ser máximo 400';
  return '';
});

const interpretacionParaMostrar = computed(() => {
  const v = sinCorreccionLejanaInterpretacion.value || '';
  return v.includes(' OD: ') ? v.replace(' OD: ', '\nOD: ') : v;
});

const colorInterpretacion = computed(() => {
  let interpretacion = sinCorreccionLejanaInterpretacion.value || '';
  if (interpretacion.startsWith('OI: ')) interpretacion = interpretacion.slice(4);
  else if (interpretacion.startsWith('OD: ')) interpretacion = interpretacion.slice(4);
  if (interpretacion === 'Ceguera total') return 'bg-red-100 text-red-900';
  if (interpretacion === INTERPRETACION_LENTES_CONTACTO) return 'bg-slate-100 text-slate-800';
  if (interpretacion === 'Visión excepcional' || interpretacion === 'Visión normal') return 'bg-emerald-50 text-emerald-800';
  if (interpretacion === 'Visión ligeramente reducida') return 'bg-yellow-50 text-yellow-800';
  if (interpretacion === 'Visión moderadamente reducida' || interpretacion === 'Visión significativamente reducida') return 'bg-orange-50 text-orange-800';
  if (interpretacion === 'Visión muy reducida') return 'bg-red-100 text-red-900';
  return 'bg-gray-50 text-gray-800';
});

const iconoInterpretacion = 'M15 12a3 3 0 11-6 0 3 3 0 016 0z';
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">AGUDEZA VISUAL <br>SIN CORRECCIÓN</h1>
    <h3 class="text-lg font-medium mb-2 text-gray-700">LEJANA (CARTA SCHNELLEN)</h3>

    <label
      class="mb-6 inline-flex max-w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 cursor-pointer select-none transition-colors hover:border-gray-300 hover:bg-gray-100 has-[:checked]:border-slate-300 has-[:checked]:bg-slate-50"
      title="Si el paciente asiste con lentes de contacto y no es posible retirarlos, la AV sin corrección no es evaluable."
    >
      <input
        type="checkbox"
        class="h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        :checked="sinCorreccionNoEvaluablePorLentesContacto"
        @change="toggleLentesContacto"
      />
      <span class="min-w-0 leading-snug">
        <span class="text-sm font-medium text-gray-800">Lentes de contacto</span>
        <span class="text-sm text-gray-500"> — no evaluable sin corrección · NA en ambos ojos</span>
      </span>
    </label>

    <!-- Ojo Izquierdo -->
    <div class="mb-6">
      <label for="ojoIzquierdoLejanaSinCorreccion" class="block text-lg font-normal text-gray-800 mb-3">
        Ojo Izquierdo
      </label>
      <div class="flex flex-wrap items-center gap-4 mt-1 mb-4">
        <div class="flex space-x-4">
          <div class="flex flex-col space-y-1">
            <input
              type="number"
              class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 bg-gray-100 cursor-default"
              value="20" step="5" min="5" max="400" readonly title="Medida base. No editable."
            />
          </div>
          <p class="text-3xl">/</p>
          <div class="flex flex-col space-y-1">
            <input
              type="number"
              class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              v-model="ojoIzquierdoLejanaSinCorreccion"
              step="5" min="5" max="400"
              :placeholder="sinCorreccionNoEvaluablePorLentesContacto ? 'NA' : ''"
              :disabled="inputDeshabilitadoOI"
            />
          </div>
        </div>
        <label
          class="flex items-center gap-2"
          :class="sinCorreccionNoEvaluablePorLentesContacto ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'"
          :title="sinCorreccionNoEvaluablePorLentesContacto ? 'No disponible con lentes de contacto' : undefined"
        >
          <input
            type="checkbox"
            class="rounded border-gray-300"
            :checked="ojoIzquierdoCegueraTotal"
            :disabled="sinCorreccionNoEvaluablePorLentesContacto"
            @change="toggleCegueraOjoIzquierdo"
          />
          <span class="text-sm font-medium text-gray-700">Ceguera total</span>
        </label>
      </div>
      <transition enter-active-class="transition-all duration-200" leave-active-class="transition-all duration-150">
        <p v-if="mensajeErrorOjoIzquierdo" class="text-red-600 text-sm mt-2 font-medium">⚠️ {{ mensajeErrorOjoIzquierdo }}</p>
      </transition>
    </div>

    <!-- Ojo Derecho -->
    <div class="mb-6">
      <label for="ojoDerechoLejanaSinCorreccion" class="block text-lg font-normal text-gray-800 mb-3">
        Ojo Derecho
      </label>
      <div class="flex flex-wrap items-center gap-4 mt-1 mb-4">
        <div class="flex space-x-4">
          <div class="flex flex-col space-y-1">
            <input
              type="number"
              class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 bg-gray-100 cursor-default"
              value="20" step="5" min="5" max="400" readonly title="Medida base. No editable."
            />
          </div>
          <p class="text-3xl">/</p>
          <div class="flex flex-col space-y-1">
            <input
              type="number"
              class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              v-model="ojoDerechoLejanaSinCorreccion"
              step="5" min="5" max="400"
              :placeholder="sinCorreccionNoEvaluablePorLentesContacto ? 'NA' : ''"
              :disabled="inputDeshabilitadoOD"
            />
          </div>
        </div>
        <label
          class="flex items-center gap-2"
          :class="sinCorreccionNoEvaluablePorLentesContacto ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'"
          :title="sinCorreccionNoEvaluablePorLentesContacto ? 'No disponible con lentes de contacto' : undefined"
        >
          <input
            type="checkbox"
            class="rounded border-gray-300"
            :checked="ojoDerechoCegueraTotal"
            :disabled="sinCorreccionNoEvaluablePorLentesContacto"
            @change="toggleCegueraOjoDerecho"
          />
          <span class="text-sm font-medium text-gray-700">Ceguera total</span>
        </label>
      </div>
      <transition enter-active-class="transition-all duration-200" leave-active-class="transition-all duration-150">
        <p v-if="mensajeErrorOjoDerecho" class="text-red-600 text-sm mt-2 font-medium">⚠️ {{ mensajeErrorOjoDerecho }}</p>
      </transition>
    </div>

    <!-- Interpretación -->
    <div class="mb-4">
      <label class="block text-lg font-normal text-gray-800 mb-3">Interpretación</label>
      <div
        :class="[
          'w-full p-3 text-center border-2 border-gray-200 rounded-lg cursor-not-allowed font-semibold min-h-[3rem] flex items-center justify-center',
          colorInterpretacion
        ]"
        :title="sinCorreccionLejanaInterpretacion"
      >
        <span class="break-words whitespace-pre-line">{{ interpretacionParaMostrar }}</span>
      </div>
    </div>
  </div>
</template>
