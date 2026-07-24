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
const ojoIzquierdoCercanaSinCorreccion = ref(20);
const ojoDerechoCercanaSinCorreccion = ref(20);
const sinCorreccionCercanaInterpretacion = ref('Visión normal');
const requiereLentesParaLectura = ref('No');

function getCiegaOI(doc) {
  return doc?.ojoIzquierdoCegueraTotal ?? doc?.ojoIzquierdoLejanaCegueraTotal ?? doc?.ojoIzquierdoCercanaCegueraTotal ?? false;
}
function getCiegaOD(doc) {
  return doc?.ojoDerechoCegueraTotal ?? doc?.ojoDerechoLejanaCegueraTotal ?? doc?.ojoDerechoCercanaCegueraTotal ?? false;
}

onMounted(() => {
  if (documentos.currentDocument) {
    const doc = documentos.currentDocument;
    ojoIzquierdoCegueraTotal.value = getCiegaOI(doc);
    ojoDerechoCegueraTotal.value = getCiegaOD(doc);
    sinCorreccionNoEvaluablePorLentesContacto.value = doc.sinCorreccionNoEvaluablePorLentesContacto ?? false;
  } else {
    ojoIzquierdoCegueraTotal.value = formDataExamenVista.ojoIzquierdoCegueraTotal ?? false;
    ojoDerechoCegueraTotal.value = formDataExamenVista.ojoDerechoCegueraTotal ?? false;
    sinCorreccionNoEvaluablePorLentesContacto.value = formDataExamenVista.sinCorreccionNoEvaluablePorLentesContacto ?? false;
  }
  const noEvaluable = sinCorreccionNoEvaluablePorLentesContacto.value;
  ojoIzquierdoCercanaSinCorreccion.value = (ojoIzquierdoCegueraTotal.value || noEvaluable)
    ? null
    : (documentos.currentDocument?.ojoIzquierdoCercanaSinCorreccion ?? formDataExamenVista.ojoIzquierdoCercanaSinCorreccion ?? 20);
  ojoDerechoCercanaSinCorreccion.value = (ojoDerechoCegueraTotal.value || noEvaluable)
    ? null
    : (documentos.currentDocument?.ojoDerechoCercanaSinCorreccion ?? formDataExamenVista.ojoDerechoCercanaSinCorreccion ?? 20);
  sinCorreccionCercanaInterpretacion.value = documentos.currentDocument?.sinCorreccionCercanaInterpretacion ?? formDataExamenVista.sinCorreccionCercanaInterpretacion ?? 'Visión normal';
  requiereLentesParaLectura.value = documentos.currentDocument?.requiereLentesParaLectura ?? formDataExamenVista.requiereLentesParaLectura ?? 'No';
  formDataStore.setExamenVistaCeguera(ojoIzquierdoCegueraTotal.value, ojoDerechoCegueraTotal.value);
  formDataExamenVista.sinCorreccionNoEvaluablePorLentesContacto = noEvaluable;
  formDataExamenVista.ojoIzquierdoCercanaSinCorreccion = (ojoIzquierdoCegueraTotal.value || noEvaluable) ? null : ojoIzquierdoCercanaSinCorreccion.value;
  formDataExamenVista.ojoDerechoCercanaSinCorreccion = (ojoDerechoCegueraTotal.value || noEvaluable) ? null : ojoDerechoCercanaSinCorreccion.value;
  interpretarAgudezaVisualCercana();
});

onUnmounted(() => {
  const noEvaluable = sinCorreccionNoEvaluablePorLentesContacto.value;
  formDataExamenVista.sinCorreccionNoEvaluablePorLentesContacto = noEvaluable;
  formDataExamenVista.ojoIzquierdoCercanaSinCorreccion = (ojoIzquierdoCegueraTotal.value || noEvaluable) ? null : ojoIzquierdoCercanaSinCorreccion.value;
  formDataExamenVista.ojoDerechoCercanaSinCorreccion = (ojoDerechoCegueraTotal.value || noEvaluable) ? null : ojoDerechoCercanaSinCorreccion.value;
  formDataStore.setExamenVistaCeguera(ojoIzquierdoCegueraTotal.value, ojoDerechoCegueraTotal.value);
  formDataExamenVista.sinCorreccionCercanaInterpretacion = sinCorreccionCercanaInterpretacion.value;
  formDataExamenVista.requiereLentesParaLectura = requiereLentesParaLectura.value;
});

watch([ojoIzquierdoCegueraTotal, ojoDerechoCegueraTotal], () => {
  formDataStore.setExamenVistaCeguera(ojoIzquierdoCegueraTotal.value, ojoDerechoCegueraTotal.value);
  if (ojoIzquierdoCegueraTotal.value) {
    ojoIzquierdoCercanaSinCorreccion.value = null;
    formDataExamenVista.ojoIzquierdoCercanaSinCorreccion = null;
  }
  if (ojoDerechoCegueraTotal.value) {
    ojoDerechoCercanaSinCorreccion.value = null;
    formDataExamenVista.ojoDerechoCercanaSinCorreccion = null;
  }
  interpretarAgudezaVisualCercana();
}, { immediate: true });

// Si se marcó en Step2 mientras este step está montado (poco común), o al entrar ya viene en store
watch(
  () => formDataExamenVista.sinCorreccionNoEvaluablePorLentesContacto,
  (noEvaluable) => {
    const valor = !!noEvaluable;
    sinCorreccionNoEvaluablePorLentesContacto.value = valor;
    if (valor) {
      ojoIzquierdoCegueraTotal.value = false;
      ojoDerechoCegueraTotal.value = false;
      formDataStore.setExamenVistaCeguera(false, false);
      ojoIzquierdoCercanaSinCorreccion.value = null;
      ojoDerechoCercanaSinCorreccion.value = null;
      formDataExamenVista.ojoIzquierdoCercanaSinCorreccion = null;
      formDataExamenVista.ojoDerechoCercanaSinCorreccion = null;
    } else if (!ojoIzquierdoCegueraTotal.value && !ojoDerechoCegueraTotal.value) {
      ojoIzquierdoCercanaSinCorreccion.value = formDataExamenVista.ojoIzquierdoCercanaSinCorreccion ?? 20;
      ojoDerechoCercanaSinCorreccion.value = formDataExamenVista.ojoDerechoCercanaSinCorreccion ?? 20;
      formDataExamenVista.ojoIzquierdoCercanaSinCorreccion = ojoIzquierdoCercanaSinCorreccion.value;
      formDataExamenVista.ojoDerechoCercanaSinCorreccion = ojoDerechoCercanaSinCorreccion.value;
    }
    interpretarAgudezaVisualCercana();
  }
);

watch([ojoIzquierdoCercanaSinCorreccion, ojoDerechoCercanaSinCorreccion], () => {
  if (!ojoIzquierdoCegueraTotal.value && !sinCorreccionNoEvaluablePorLentesContacto.value) {
    formDataExamenVista.ojoIzquierdoCercanaSinCorreccion = ojoIzquierdoCercanaSinCorreccion.value;
  }
  if (!ojoDerechoCegueraTotal.value && !sinCorreccionNoEvaluablePorLentesContacto.value) {
    formDataExamenVista.ojoDerechoCercanaSinCorreccion = ojoDerechoCercanaSinCorreccion.value;
  }
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
  return "Valor fuera de rango";
}

function interpretarAgudezaVisualCercana() {
  const ciegaOI = ojoIzquierdoCegueraTotal.value;
  const ciegaOD = ojoDerechoCegueraTotal.value;

  if (ciegaOI && ciegaOD) {
    sinCorreccionCercanaInterpretacion.value = "Ceguera total";
  } else if (sinCorreccionNoEvaluablePorLentesContacto.value) {
    sinCorreccionCercanaInterpretacion.value = INTERPRETACION_LENTES_CONTACTO;
  } else if (ciegaOI) {
    const interpOD = obtenerInterpretacion(ojoDerechoCercanaSinCorreccion.value);
    sinCorreccionCercanaInterpretacion.value = interpOD ? `OD: ${interpOD}` : "OD: NA";
  } else if (ciegaOD) {
    const interpOI = obtenerInterpretacion(ojoIzquierdoCercanaSinCorreccion.value);
    sinCorreccionCercanaInterpretacion.value = interpOI ? `OI: ${interpOI}` : "OI: NA";
  } else {
    const interpOI = obtenerInterpretacion(ojoIzquierdoCercanaSinCorreccion.value);
    const interpOD = obtenerInterpretacion(ojoDerechoCercanaSinCorreccion.value);
    const valOI = ojoIzquierdoCercanaSinCorreccion.value != null ? Number(ojoIzquierdoCercanaSinCorreccion.value) : 0;
    const valOD = ojoDerechoCercanaSinCorreccion.value != null ? Number(ojoDerechoCercanaSinCorreccion.value) : 0;
    sinCorreccionCercanaInterpretacion.value = valOI > valOD ? (interpOI ?? 'Valor fuera de rango') : (interpOD ?? 'Valor fuera de rango');
  }

  formDataExamenVista.sinCorreccionCercanaInterpretacion = sinCorreccionCercanaInterpretacion.value;
  requiereLentesLectura();
}

function requiereLentesLectura() {
  if (sinCorreccionNoEvaluablePorLentesContacto.value) {
    requiereLentesParaLectura.value = "No";
    formDataExamenVista.requiereLentesParaLectura = requiereLentesParaLectura.value;
    return;
  }
  const valOI = ojoIzquierdoCegueraTotal.value ? null : (ojoIzquierdoCercanaSinCorreccion.value != null ? Number(ojoIzquierdoCercanaSinCorreccion.value) : null);
  const valOD = ojoDerechoCegueraTotal.value ? null : (ojoDerechoCercanaSinCorreccion.value != null ? Number(ojoDerechoCercanaSinCorreccion.value) : null);
  const ojosConValor = [valOI, valOD].filter(v => v != null);
  if (ojosConValor.length === 0) {
    requiereLentesParaLectura.value = "No";
  } else if (ojosConValor.every(v => v <= 20)) {
    requiereLentesParaLectura.value = "No";
  } else {
    requiereLentesParaLectura.value = "Si";
  }
  formDataExamenVista.requiereLentesParaLectura = requiereLentesParaLectura.value;
}

function toggleCegueraOjoIzquierdo() {
  if (sinCorreccionNoEvaluablePorLentesContacto.value) return;
  ojoIzquierdoCegueraTotal.value = !ojoIzquierdoCegueraTotal.value;
  ojoIzquierdoCercanaSinCorreccion.value = null;
}

function toggleCegueraOjoDerecho() {
  if (sinCorreccionNoEvaluablePorLentesContacto.value) return;
  ojoDerechoCegueraTotal.value = !ojoDerechoCegueraTotal.value;
  ojoDerechoCercanaSinCorreccion.value = null;
}

const inputDeshabilitadoOI = computed(() => ojoIzquierdoCegueraTotal.value || sinCorreccionNoEvaluablePorLentesContacto.value);
const inputDeshabilitadoOD = computed(() => ojoDerechoCegueraTotal.value || sinCorreccionNoEvaluablePorLentesContacto.value);

const mensajeErrorOjoIzquierdo = computed(() => {
  if (inputDeshabilitadoOI.value) return '';
  const v = ojoIzquierdoCercanaSinCorreccion.value;
  if (v == null || v === '') return 'Debe capturar el valor';
  const n = Number(v);
  if (n < 5) return 'Debe ser mínimo 5';
  if (n > 400) return 'Debe ser máximo 400';
  return '';
});

const mensajeErrorOjoDerecho = computed(() => {
  if (inputDeshabilitadoOD.value) return '';
  const v = ojoDerechoCercanaSinCorreccion.value;
  if (v == null || v === '') return 'Debe capturar el valor';
  const n = Number(v);
  if (n < 5) return 'Debe ser mínimo 5';
  if (n > 400) return 'Debe ser máximo 400';
  return '';
});

const interpretacionParaMostrar = computed(() => {
  const v = sinCorreccionCercanaInterpretacion.value || '';
  return v.includes(' OD: ') ? v.replace(' OD: ', '\nOD: ') : v;
});

const colorInterpretacion = computed(() => {
  let interpretacion = sinCorreccionCercanaInterpretacion.value || '';
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
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">AGUDEZA VISUAL <br>SIN CORRECCIÓN</h1>
    <h3 class="text-lg font-medium mb-2 text-gray-700">CERCANA (CARTA JAEGER)</h3>

    <p
      v-if="sinCorreccionNoEvaluablePorLentesContacto"
      class="mb-6 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
    >
      Marcado en lejana: lentes de contacto — AV cercana sin corrección registrada como NA.
    </p>

    <!-- Ojo Izquierdo -->
    <div class="mb-6">
      <label for="ojoIzquierdoCercanaSinCorreccion" class="block text-lg font-normal text-gray-800 mb-3">Ojo Izquierdo</label>
      <div class="flex flex-wrap items-center gap-4 mt-1 mb-4">
        <div class="flex space-x-4">
          <div class="flex flex-col space-y-1">
            <input type="number" class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 bg-gray-100 cursor-default" value="20" step="5" min="5" max="400" readonly title="Medida base. No editable." />
          </div>
          <p class="text-3xl">/</p>
          <div class="flex flex-col space-y-1">
            <input
              type="number"
              class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              v-model="ojoIzquierdoCercanaSinCorreccion"
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
      <label for="ojoDerechoCercanaSinCorreccion" class="block text-lg font-normal text-gray-800 mb-3">Ojo Derecho</label>
      <div class="flex flex-wrap items-center gap-4 mt-1 mb-4">
        <div class="flex space-x-4">
          <div class="flex flex-col space-y-1">
            <input type="number" class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 bg-gray-100 cursor-default" value="20" step="5" min="5" max="400" readonly title="Medida base. No editable." />
          </div>
          <p class="text-3xl">/</p>
          <div class="flex flex-col space-y-1">
            <input
              type="number"
              class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              v-model="ojoDerechoCercanaSinCorreccion"
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
        :title="sinCorreccionCercanaInterpretacion"
      >
        <span class="break-words whitespace-pre-line">{{ interpretacionParaMostrar }}</span>
      </div>
    </div>
  </div>
</template>
