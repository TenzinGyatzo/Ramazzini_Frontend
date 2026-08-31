<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { endOfMonth, format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { buildClinicalDirectoryPath } from '@/helpers/clinicalPath';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useSiresDocumentDateMax } from '@/composables/useSiresDocumentDateMax';
import {
  CRITERIO_COMPARACION_ILA,
  VERSION_CRITERIO_ILA,
  derivarCamposInformeLongitudinalAudiometrico,
  esAudiometriaAnulada,
  snapshotExposicionRuidoIla,
} from '@/helpers/informeLongitudinalAudiometrico';

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const formDataStore = useFormDataStore();
const { formDataInformeLongitudinalAudiometrico } = storeToRefs(formDataStore);
const documentos = useDocumentosStore();
const { fechaDocumentoMax } = useSiresDocumentDateMax();
const route = useRoute();
const { documentsByYear } = storeToRefs(documentos);

const today = format(new Date(), 'yyyy-MM-dd');
const AYUDA_RANGO = 'Seleccione la audiometría basal y las subsecuentes incluidas en el periodo.';

function toYyyyMmDd(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim();
  const s = formatDateYYYYMMDD(v);
  return s || null;
}

function mongoIdStr(x) {
  if (x == null || x === '') return '';
  if (typeof x === 'object' && x._id != null) return String(x._id);
  return String(x);
}

function idsArrayFromForm(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(mongoIdStr).filter(Boolean))];
}

function periodoSugeridoDesdeAudiometrias(lista) {
  const fechas = lista.map((e) => toYyyyMmDd(e?.fechaAudiometria)).filter(Boolean).sort();
  if (!fechas.length) return null;
  const inicio = fechas[0];
  const max = fechas[fechas.length - 1];
  const parts = max.split('-').map(Number);
  const y = parts[0];
  const mo = parts[1];
  if (!y || !mo) return { inicio, fin: max };
  const fin = format(endOfMonth(new Date(y, mo - 1, 15, 12, 0, 0, 0)), 'yyyy-MM-dd');
  return { inicio, fin };
}

const audiometriasDesdeStore = computed(() => {
  const out = [];
  const byYear = documentsByYear.value || {};
  for (const yearData of Object.values(byYear)) {
    const arr = yearData?.audiometrias;
    if (Array.isArray(arr)) out.push(...arr);
  }
  const tid = trabajadores.currentTrabajadorId;
  return out
    .filter((e) => {
      if (!e) return false;
      if (esAudiometriaAnulada(e)) return false;
      if (!tid || !e.idTrabajador) return true;
      return mongoIdStr(e.idTrabajador) === mongoIdStr(tid);
    })
    .sort((a, b) => String(toYyyyMmDd(a.fechaAudiometria) || '').localeCompare(String(toYyyyMmDd(b.fechaAudiometria) || '')));
});

const historiasOtologicasDesdeStore = computed(() => {
  const out = [];
  const byYear = documentsByYear.value || {};
  for (const yearData of Object.values(byYear)) {
    const arr = yearData?.historiaOtologica;
    if (Array.isArray(arr)) out.push(...arr);
  }
  return out;
});

const periodoInicio = ref(toYyyyMmDd(formDataInformeLongitudinalAudiometrico.value.periodoInicio) || today);
const periodoFin = ref(toYyyyMmDd(formDataInformeLongitudinalAudiometrico.value.periodoFin) || today);
const fechaInforme = ref(
  toYyyyMmDd(formDataInformeLongitudinalAudiometrico.value.fechaInformeLongitudinalAudiometrico) || today,
);
const idBasal = ref(mongoIdStr(formDataInformeLongitudinalAudiometrico.value.idAudiometriaBasal));
const idsSubsecuentes = ref(idsArrayFromForm(formDataInformeLongitudinalAudiometrico.value.audiometriasSubsecuentesIncluidas));
const periodoPorDefectoAplicado = ref(false);

function fechaEnPeriodo(fechaCampo, inicio, fin) {
  const f = toYyyyMmDd(fechaCampo);
  const a = toYyyyMmDd(inicio);
  const b = toYyyyMmDd(fin);
  if (!f || !a || !b) return true;
  return f >= a && f <= b;
}

const audiometriasEnRango = computed(() =>
  audiometriasDesdeStore.value.filter((e) =>
    fechaEnPeriodo(e.fechaAudiometria, periodoInicio.value, periodoFin.value),
  ),
);

function sincronizarPayloadInforme() {
  const fd = formDataInformeLongitudinalAudiometrico.value;
  fd.fechaInformeLongitudinalAudiometrico = fechaInforme.value;
  fd.periodoInicio = periodoInicio.value;
  fd.periodoFin = periodoFin.value;
  fd.criterioComparacion = CRITERIO_COMPARACION_ILA;
  fd.versionCriterio = VERSION_CRITERIO_ILA;
  fd.idTrabajador = trabajadores.currentTrabajadorId;

  const basalId = mongoIdStr(idBasal.value);
  const subIds = idsSubsecuentes.value.map(mongoIdStr).filter((id) => id && id !== basalId);
  fd.idAudiometriaBasal = basalId || undefined;
  fd.audiometriasSubsecuentesIncluidas = subIds;

  const basalFuente = audiometriasDesdeStore.value.find((a) => mongoIdStr(a._id) === basalId) || null;
  const subFuentes = audiometriasDesdeStore.value.filter((a) => subIds.includes(mongoIdStr(a._id)));
  const exposicion = snapshotExposicionRuidoIla({
    historias: historiasOtologicasDesdeStore.value,
    agentesRiesgoActuales: trabajadores.currentTrabajador?.agentesRiesgoActuales || [],
    textoLibre: fd.antecedenteExposicionRuido?.textoLibre,
  });
  fd.antecedenteExposicionRuido = exposicion;
  Object.assign(fd, derivarCamposInformeLongitudinalAudiometrico({
    basalFuente,
    subsecuentesFuente: subFuentes,
    exposicion,
  }));
}

watch(
  () => audiometriasDesdeStore.value,
  (lista) => {
    if (String(route.params.idDocumento || '')) return;
    if (periodoPorDefectoAplicado.value) return;
    const sug = periodoSugeridoDesdeAudiometrias(lista);
    if (!sug) return;
    periodoInicio.value = sug.inicio;
    periodoFin.value = sug.fin;
    periodoPorDefectoAplicado.value = true;
  },
  { deep: true, immediate: true },
);

watch([periodoInicio, periodoFin, audiometriasEnRango], () => {
  const ids = new Set(audiometriasEnRango.value.map((e) => mongoIdStr(e._id)));
  if (idBasal.value && !ids.has(mongoIdStr(idBasal.value))) idBasal.value = '';
  idsSubsecuentes.value = idsSubsecuentes.value.filter((id) => ids.has(mongoIdStr(id)) && mongoIdStr(id) !== mongoIdStr(idBasal.value));
});

watch(
  () => documentos.currentDocument,
  (doc) => {
    if (!doc) return;
    if (String(documentos.currentTypeOfDocument || '') !== 'informeLongitudinalAudiometrico') return;
    idBasal.value = mongoIdStr(doc.idAudiometriaBasal);
    idsSubsecuentes.value = idsArrayFromForm(doc.audiometriasSubsecuentesIncluidas);
  },
  { immediate: true },
);

watch(
  [fechaInforme, periodoInicio, periodoFin, idBasal, idsSubsecuentes, audiometriasDesdeStore],
  () => sincronizarPayloadInforme(),
  { deep: true },
);

function toggleSubsecuente(id, checked) {
  const sid = mongoIdStr(id);
  if (!sid || sid === mongoIdStr(idBasal.value)) return;
  const next = new Set(idsSubsecuentes.value.map(mongoIdStr));
  if (checked) next.add(sid);
  else next.delete(sid);
  idsSubsecuentes.value = [...next];
}

function seleccionarTodasSubsecuentes() {
  idsSubsecuentes.value = audiometriasEnRango.value
    .map((e) => mongoIdStr(e._id))
    .filter((id) => id && id !== mongoIdStr(idBasal.value));
}

onMounted(() => {
  const fd = formDataInformeLongitudinalAudiometrico.value;
  const fi = toYyyyMmDd(fd.fechaInformeLongitudinalAudiometrico);
  const pi = toYyyyMmDd(fd.periodoInicio);
  const pf = toYyyyMmDd(fd.periodoFin);
  if (fi) fechaInforme.value = fi;
  if (pi) periodoInicio.value = pi;
  if (pf) periodoFin.value = pf;
  if (!idBasal.value && mongoIdStr(fd.idAudiometriaBasal)) idBasal.value = mongoIdStr(fd.idAudiometriaBasal);
  if (!idsSubsecuentes.value.length) idsSubsecuentes.value = idsArrayFromForm(fd.audiometriasSubsecuentesIncluidas);

  fd.idTrabajador = trabajadores.currentTrabajadorId;
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  fd.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
  sincronizarPayloadInforme();
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Informe longitudinal de seguimiento audiométrico</h1>
    <p class="text-sm text-gray-600 mb-6">Paso 1: periodo, basal y audiometrías incluidas</p>

    <div class="mt-4 space-y-4">
      <h2 class="text-lg font-medium text-gray-800">Fecha del informe</h2>
      <FormKit type="date" name="fechaInformeLongitudinalAudiometrico" :max="fechaDocumentoMax" v-model="fechaInforme" />

      <h2 class="text-lg font-medium text-gray-800 pt-2">Periodo analizado</h2>
      <div class="flex flex-col sm:flex-row gap-4">
        <FormKit type="date" name="periodoInicio" label="Inicio" :max="fechaDocumentoMax" v-model="periodoInicio" />
        <FormKit type="date" name="periodoFin" label="Fin" :max="fechaDocumentoMax" v-model="periodoFin" />
      </div>
      <p class="text-xs text-gray-500">{{ AYUDA_RANGO }}</p>

      <div class="border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 class="text-base font-semibold text-gray-800">Audiometría basal</h3>
        <ul v-if="audiometriasEnRango.length" class="space-y-2 max-h-48 overflow-y-auto">
          <li v-for="a in audiometriasEnRango" :key="mongoIdStr(a._id)" class="text-xs border-b border-gray-100 pb-2">
            <label class="flex items-start gap-2 cursor-pointer">
              <input type="radio" class="mt-1 shrink-0" name="idAudiometriaBasal" :value="mongoIdStr(a._id)" v-model="idBasal" />
              <span>
                <span class="font-medium">{{ toYyyyMmDd(a.fechaAudiometria) || '—' }}</span>
                <span class="text-gray-600"> · {{ a.metodoAudiometria || 'sin método' }}</span>
              </span>
            </label>
          </li>
        </ul>
        <p v-else class="text-sm text-gray-500">No hay audiometrías en el periodo seleccionado.</p>
      </div>

      <div class="border border-gray-200 rounded-lg p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-base font-semibold text-gray-800">Audiometrías subsecuentes</h3>
          <div class="flex gap-2">
            <button type="button" class="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200" @click="seleccionarTodasSubsecuentes">
              Seleccionar todas en rango
            </button>
            <button type="button" class="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200" @click="idsSubsecuentes = []">
              Limpiar
            </button>
          </div>
        </div>
        <ul v-if="audiometriasEnRango.length" class="space-y-2 max-h-56 overflow-y-auto">
          <li v-for="a in audiometriasEnRango" :key="'sub-' + mongoIdStr(a._id)" class="text-xs border-b border-gray-100 pb-2">
            <label class="flex items-start gap-2" :class="mongoIdStr(a._id) === mongoIdStr(idBasal) ? 'text-gray-400' : 'cursor-pointer'">
              <input
                type="checkbox"
                class="mt-1 shrink-0"
                :disabled="mongoIdStr(a._id) === mongoIdStr(idBasal)"
                :checked="idsSubsecuentes.some((x) => mongoIdStr(x) === mongoIdStr(a._id))"
                @change="toggleSubsecuente(a._id, $event.target.checked)"
              />
              <span>
                <span class="font-medium">{{ toYyyyMmDd(a.fechaAudiometria) || '—' }}</span>
                <span class="text-gray-600"> · {{ a.metodoAudiometria || 'sin método' }}</span>
                <span v-if="mongoIdStr(a._id) === mongoIdStr(idBasal)" class="text-gray-400"> (basal)</span>
              </span>
            </label>
          </li>
        </ul>
        <p v-else class="text-sm text-gray-500">No hay audiometrías en el periodo.</p>
      </div>
    </div>
  </div>
</template>
