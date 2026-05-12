<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import {
  clasificarColesterolTotal,
  clasificarGlucosa,
  clasificarHbA1c,
  clasificarHDL,
  clasificarLDL,
  clasificarTrigliceridos,
} from '@/helpers/cardiometabolico/laboratorioCategorias';

const { formDataEventoSeguimientoCardiometabolico } = useFormDataStore();
const documentos = useDocumentosStore();

/** Mismas clases base que otros pasos del ESC (p. ej. Step4 signos vitales). */
const inputClass =
  'w-full p-3 text-center border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200';

const transitionAttrs = {
  enterActiveClass: 'transition-all duration-200 ease-out',
  enterFromClass: 'opacity-0 transform -translate-y-1',
  enterToClass: 'opacity-100 transform translate-y-0',
  leaveActiveClass: 'transition-all duration-150 ease-in',
  leaveFromClass: 'opacity-100 transform translate-y-0',
  leaveToClass: 'opacity-0 transform -translate-y-1',
};

function lab() {
  const fd = formDataEventoSeguimientoCardiometabolico;
  if (!fd.laboratorio) fd.laboratorio = {};
  return fd.laboratorio;
}

const glucosaMgDl = ref('');
const hba1cPorcentaje = ref('');
const colesterolTotalMgDl = ref('');
const ldlMgDl = ref('');
const hdlMgDl = ref('');
const trigliceridosMgDl = ref('');

function toNum(val) {
  if (val === '' || val == null || Number.isNaN(Number(val))) return undefined;
  return Number(val);
}

function pushLaboratorio() {
  const L = lab();
  const g = toNum(glucosaMgDl.value);
  L.glucosaMgDl = g;
  if (g === undefined) delete L.categoriaGlucosa;
  else L.categoriaGlucosa = clasificarGlucosa(g);

  const hb = toNum(hba1cPorcentaje.value);
  L.hba1cPorcentaje = hb;
  if (hb === undefined) delete L.categoriaHbA1c;
  else L.categoriaHbA1c = clasificarHbA1c(hb);

  const ct = toNum(colesterolTotalMgDl.value);
  L.colesterolTotalMgDl = ct;
  if (ct === undefined) delete L.categoriaColesterolTotal;
  else L.categoriaColesterolTotal = clasificarColesterolTotal(ct);

  const ldl = toNum(ldlMgDl.value);
  L.ldlMgDl = ldl;
  if (ldl === undefined) delete L.categoriaLDL;
  else L.categoriaLDL = clasificarLDL(ldl);

  const hdl = toNum(hdlMgDl.value);
  L.hdlMgDl = hdl;
  if (hdl === undefined) delete L.categoriaHDL;
  else L.categoriaHDL = clasificarHDL(hdl);

  const tg = toNum(trigliceridosMgDl.value);
  L.trigliceridosMgDl = tg;
  if (tg === undefined) delete L.categoriaTrigliceridos;
  else L.categoriaTrigliceridos = clasificarTrigliceridos(tg);
}

function strOrEmpty(v) {
  return v != null ? String(v) : '';
}

/** Mensaje fuera de rango; campo vacío = sin mensaje (opcional). */
function mensajeRangoNumerico(raw, min, max) {
  if (raw === '' || raw == null) return '';
  const n = Number(raw);
  if (Number.isNaN(n)) return 'Introduce un número válido';
  if (n < min) return `Debe ser mínimo ${min}`;
  if (n > max) return `Debe ser máximo ${max}`;
  return '';
}

const mensajeGlucosa = computed(() => mensajeRangoNumerico(glucosaMgDl.value, 25, 800));
const mensajeHbA1c = computed(() => mensajeRangoNumerico(hba1cPorcentaje.value, 3, 22));
const mensajeColTotal = computed(() => mensajeRangoNumerico(colesterolTotalMgDl.value, 40, 800));
const mensajeLdl = computed(() => mensajeRangoNumerico(ldlMgDl.value, 10, 600));
const mensajeHdl = computed(() => mensajeRangoNumerico(hdlMgDl.value, 5, 150));
const mensajeTrig = computed(() => mensajeRangoNumerico(trigliceridosMgDl.value, 15, 8000));

const badgeClase =
  'mt-2 inline-block text-xs text-gray-600 bg-gray-100 rounded px-2 py-0.5 border border-gray-200';

const badgeGlucosa = computed(() => {
  if (mensajeGlucosa.value || glucosaMgDl.value === '') return undefined;
  return clasificarGlucosa(toNum(glucosaMgDl.value));
});
const badgeHbA1c = computed(() => {
  if (mensajeHbA1c.value || hba1cPorcentaje.value === '') return undefined;
  return clasificarHbA1c(toNum(hba1cPorcentaje.value));
});
const badgeColTotal = computed(() => {
  if (mensajeColTotal.value || colesterolTotalMgDl.value === '') return undefined;
  return clasificarColesterolTotal(toNum(colesterolTotalMgDl.value));
});
const badgeLdl = computed(() => {
  if (mensajeLdl.value || ldlMgDl.value === '') return undefined;
  return clasificarLDL(toNum(ldlMgDl.value));
});
const badgeHdl = computed(() => {
  if (mensajeHdl.value || hdlMgDl.value === '') return undefined;
  return clasificarHDL(toNum(hdlMgDl.value));
});
const badgeTrig = computed(() => {
  if (mensajeTrig.value || trigliceridosMgDl.value === '') return undefined;
  return clasificarTrigliceridos(toNum(trigliceridosMgDl.value));
});

function hydrate(v) {
  if (!v) return;
  glucosaMgDl.value = strOrEmpty(v.glucosaMgDl);
  hba1cPorcentaje.value = strOrEmpty(v.hba1cPorcentaje);
  colesterolTotalMgDl.value = strOrEmpty(v.colesterolTotalMgDl);
  ldlMgDl.value = strOrEmpty(v.ldlMgDl);
  hdlMgDl.value = strOrEmpty(v.hdlMgDl);
  trigliceridosMgDl.value = strOrEmpty(v.trigliceridosMgDl);
}

const CLAVES_LAB_ENTRADA = [
  'glucosaMgDl',
  'hba1cPorcentaje',
  'colesterolTotalMgDl',
  'ldlMgDl',
  'hdlMgDl',
  'trigliceridosMgDl',
];

function laboratorioTieneValoresDeEntrada(L) {
  if (!L || typeof L !== 'object') return false;
  return CLAVES_LAB_ENTRADA.some((k) => L[k] != null && L[k] !== '');
}

onMounted(() => {
  lab();
  const docL = documentos.currentDocument?.laboratorio;
  const fdL = lab();
  if (laboratorioTieneValoresDeEntrada(fdL)) hydrate(fdL);
  else if (laboratorioTieneValoresDeEntrada(docL)) hydrate(docL);
  else if (fdL && Object.keys(fdL).some((k) => fdL[k] != null)) hydrate(fdL);
  pushLaboratorio();
});

onUnmounted(() => {
  pushLaboratorio();
});

watch(
  [glucosaMgDl, hba1cPorcentaje, colesterolTotalMgDl, ldlMgDl, hdlMgDl, trigliceridosMgDl],
  () => pushLaboratorio(),
);
</script>

<template>
  <div>
    <!-- Jerarquía visual alineada con otros pasos del ESC -->
    <h1 class="text-2xl font-bold mb-4 text-gray-900">LABORATORIO</h1>
    <p class="text-sm text-gray-600 mb-2">
      Todos los valores son opcionales. Rangos sirven solo para detectar errores evidentes de captura (no sustituyen criterios clínicos).
    </p>
    <p class="text-xs text-gray-500 mb-6">
      Las categorías mostradas son interpretación orientativa y no constituyen un diagnóstico automático.
    </p>

    <div class="grid grid-cols-2 gap-4 mb-6">
      <div>
        <label for="escLabGlucosa" class="block text-sm font-medium text-gray-700 mb-2">Glucosa (mg/dL)</label>
        <input
          id="escLabGlucosa"
          v-model="glucosaMgDl"
          type="number"
          inputmode="decimal"
          step="any"
          :class="inputClass"
          placeholder="25-800"
        />
        <transition v-bind="transitionAttrs">
          <p v-if="mensajeGlucosa" class="text-red-600 text-sm mt-2 font-medium">⚠️ {{ mensajeGlucosa }}</p>
        </transition>
        <span v-if="badgeGlucosa" :class="badgeClase">{{ badgeGlucosa }}</span>
      </div>
      <div>
        <label for="escLabHbA1c" class="block text-sm font-medium text-gray-700 mb-2">HbA1c (%)</label>
        <input
          id="escLabHbA1c"
          v-model="hba1cPorcentaje"
          type="number"
          inputmode="decimal"
          step="0.1"
          :class="inputClass"
          placeholder="3-22"
        />
        <transition v-bind="transitionAttrs">
          <p v-if="mensajeHbA1c" class="text-red-600 text-sm mt-2 font-medium">⚠️ {{ mensajeHbA1c }}</p>
        </transition>
        <span v-if="badgeHbA1c" :class="badgeClase">{{ badgeHbA1c }}</span>
      </div>
      <div>
        <label for="escLabColesterolTotal" class="block text-sm font-medium text-gray-700 mb-2">
          Colesterol total (mg/dL)
        </label>
        <input
          id="escLabColesterolTotal"
          v-model="colesterolTotalMgDl"
          type="number"
          inputmode="decimal"
          step="any"
          :class="inputClass"
          placeholder="40-800"
        />
        <transition v-bind="transitionAttrs">
          <p v-if="mensajeColTotal" class="text-red-600 text-sm mt-2 font-medium">
            ⚠️ {{ mensajeColTotal }}
          </p>
        </transition>
        <span v-if="badgeColTotal" :class="badgeClase">{{ badgeColTotal }}</span>
      </div>
      <div>
        <label for="escLabLdl" class="block text-sm font-medium text-gray-700 mb-2">LDL (mg/dL)</label>
        <input
          id="escLabLdl"
          v-model="ldlMgDl"
          type="number"
          inputmode="decimal"
          step="any"
          :class="inputClass"
          placeholder="10-600"
        />
        <transition v-bind="transitionAttrs">
          <p v-if="mensajeLdl" class="text-red-600 text-sm mt-2 font-medium">⚠️ {{ mensajeLdl }}</p>
        </transition>
        <span v-if="badgeLdl" :class="badgeClase">{{ badgeLdl }}</span>
      </div>
      <div>
        <label for="escLabHdl" class="block text-sm font-medium text-gray-700 mb-2">HDL (mg/dL)</label>
        <input
          id="escLabHdl"
          v-model="hdlMgDl"
          type="number"
          inputmode="decimal"
          step="any"
          :class="inputClass"
          placeholder="5-150"
        />
        <transition v-bind="transitionAttrs">
          <p v-if="mensajeHdl" class="text-red-600 text-sm mt-2 font-medium">⚠️ {{ mensajeHdl }}</p>
        </transition>
        <span v-if="badgeHdl" :class="badgeClase">{{ badgeHdl }}</span>
      </div>
      <div>
        <label for="escLabTrigliceridos" class="block text-sm font-medium text-gray-700 mb-2">
          Triglicéridos (mg/dL)
        </label>
        <input
          id="escLabTrigliceridos"
          v-model="trigliceridosMgDl"
          type="number"
          inputmode="decimal"
          step="any"
          :class="inputClass"
          placeholder="15-8000"
        />
        <transition v-bind="transitionAttrs">
          <p v-if="mensajeTrig" class="text-red-600 text-sm mt-2 font-medium">⚠️ {{ mensajeTrig }}</p>
        </transition>
        <span v-if="badgeTrig" :class="badgeClase">{{ badgeTrig }}</span>
      </div>
    </div>
  </div>
</template>
