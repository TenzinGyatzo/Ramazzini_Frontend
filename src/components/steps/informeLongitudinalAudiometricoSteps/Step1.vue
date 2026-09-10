<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue';
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
  MAX_AUDIOMETRIAS_SUBSECUENTES_ILA,
  VERSION_CRITERIO_ILA,
  aplicarBorradoresInterpretacionPorOidoIla,
  derivarCamposInformeLongitudinalAudiometrico,
  esAudiometriaAnulada,
  esFechaMaximaDelRango,
  esPosteriorABasal,
  idAudiometriaMasRecientePosteriorABasal,
  otraSubsecuenteComparteFechaIla,
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
const scrollRoot = ref(null);
const seccionSubsecuentes = ref(null);

function scrollASubsecuentes() {
  const container = scrollRoot.value;
  const target = seccionSubsecuentes.value;
  if (!container || !target) return;
  const offset = target.getBoundingClientRect().top - container.getBoundingClientRect().top;
  container.scrollTo({
    top: container.scrollTop + offset,
    behavior: 'smooth',
  });
}

function onSeleccionarBasal() {
  nextTick(() => scrollASubsecuentes());
}

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
    fechaInforme: fechaInforme.value,
  });
  fd.antecedenteExposicionRuido = exposicion;
  const prevBorradores = {
    derecho: fd.borradorInterpretacionOidoDerecho,
    izquierdo: fd.borradorInterpretacionOidoIzquierdo,
  };
  const prevInterpretaciones = {
    derecho: fd.interpretacionOidoDerecho,
    izquierdo: fd.interpretacionOidoIzquierdo,
  };
  Object.assign(fd, derivarCamposInformeLongitudinalAudiometrico({
    basalFuente,
    subsecuentesFuente: subFuentes,
    exposicion,
  }));
  aplicarBorradoresInterpretacionPorOidoIla(fd, prevBorradores, prevInterpretaciones);
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

function filtrarIdsSubsecuentesValidas(ids) {
  const enRango = audiometriasEnRango.value;
  const idsRango = new Set(enRango.map((e) => mongoIdStr(e._id)));
  const basal = enRango.find((e) => mongoIdStr(e._id) === mongoIdStr(idBasal.value));
  const fechaBasal = basal?.fechaAudiometria;
  return ids.filter((id) => {
    const sid = mongoIdStr(id);
    if (!idsRango.has(sid) || sid === mongoIdStr(idBasal.value)) return false;
    const estudio = enRango.find((e) => mongoIdStr(e._id) === sid);
    return esPosteriorABasal(estudio?.fechaAudiometria, fechaBasal);
  });
}

function mismaListaIds(a, b) {
  if (a.length !== b.length) return false;
  return a.every((id, i) => mongoIdStr(id) === mongoIdStr(b[i]));
}

watch(
  [periodoInicio, periodoFin, audiometriasEnRango, idBasal, idsSubsecuentes],
  (curr, prev) => {
    const enRango = audiometriasEnRango.value;
    const ids = new Set(enRango.map((e) => mongoIdStr(e._id)));
    if (idBasal.value && !ids.has(mongoIdStr(idBasal.value))) idBasal.value = '';
    const filtrados = filtrarIdsSubsecuentesValidas(idsSubsecuentes.value);
    let next = filtrados;
    const basalId = mongoIdStr(idBasal.value);
    const cambioBasalOPeriodo = !prev
      || curr[0] !== prev[0]
      || curr[1] !== prev[1]
      || curr[2] !== prev[2]
      || curr[3] !== prev[3];
    if (filtrados.length === 0 && basalId && cambioBasalOPeriodo) {
      const basal = enRango.find((e) => mongoIdStr(e._id) === basalId);
      const autoId = idAudiometriaMasRecientePosteriorABasal(
        enRango,
        basal?.fechaAudiometria,
        basalId,
      );
      if (autoId) next = [autoId];
    }
    if (!mismaListaIds(next, idsSubsecuentes.value)) {
      idsSubsecuentes.value = next;
    }
  },
);

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

const cupoSubsecuentesLleno = computed(
  () => idsSubsecuentes.value.length >= MAX_AUDIOMETRIAS_SUBSECUENTES_ILA,
);

const fechaBasalSeleccionada = computed(() => {
  const basal = audiometriasEnRango.value.find((a) => mongoIdStr(a._id) === mongoIdStr(idBasal.value));
  return basal?.fechaAudiometria;
});

function basalDeshabilitada(a) {
  if (esBasalSeleccionada(a)) return false;
  return esFechaMaximaDelRango(a.fechaAudiometria, audiometriasEnRango.value);
}

function esSubsecuenteSeleccionada(id) {
  const sid = mongoIdStr(id);
  return idsSubsecuentes.value.some((x) => mongoIdStr(x) === sid);
}

function subsecuentesSeleccionadas() {
  return audiometriasEnRango.value.filter((a) => esSubsecuenteSeleccionada(a._id));
}

function subsecuenteDeshabilitada(a) {
  const sid = mongoIdStr(a._id);
  if (sid === mongoIdStr(idBasal.value)) return true;
  if (!esPosteriorABasal(a.fechaAudiometria, fechaBasalSeleccionada.value)) return true;
  if (esSubsecuenteSeleccionada(sid)) return false;
  if (otraSubsecuenteComparteFechaIla(a.fechaAudiometria, sid, subsecuentesSeleccionadas())) {
    return true;
  }
  return cupoSubsecuentesLleno.value;
}

function toggleSubsecuente(id, checked) {
  const sid = mongoIdStr(id);
  if (!sid || sid === mongoIdStr(idBasal.value)) return;
  const estudio = audiometriasEnRango.value.find((e) => mongoIdStr(e._id) === sid);
  if (checked && !esPosteriorABasal(estudio?.fechaAudiometria, fechaBasalSeleccionada.value)) return;
  if (
    checked &&
    otraSubsecuenteComparteFechaIla(estudio?.fechaAudiometria, sid, subsecuentesSeleccionadas())
  ) {
    return;
  }
  const next = new Set(idsSubsecuentes.value.map(mongoIdStr));
  if (checked) {
    if (next.size >= MAX_AUDIOMETRIAS_SUBSECUENTES_ILA && !next.has(sid)) return;
    next.add(sid);
  } else {
    next.delete(sid);
  }
  idsSubsecuentes.value = [...next];
}

function esBasalSeleccionada(a) {
  return mongoIdStr(a._id) === mongoIdStr(idBasal.value);
}

function etiquetaRolSubsecuente(a) {
  const sid = mongoIdStr(a._id);
  if (esBasalSeleccionada(a)) return 'basal';
  if (!esSubsecuenteSeleccionada(sid)) return '';
  const seleccionadas = audiometriasEnRango.value
    .filter((x) => esSubsecuenteSeleccionada(x._id))
    .sort((x, y) =>
      String(toYyyyMmDd(x.fechaAudiometria) || '').localeCompare(String(toYyyyMmDd(y.fechaAudiometria) || '')),
    );
  if (!seleccionadas.length) return '';
  const masRecienteId = mongoIdStr(seleccionadas[seleccionadas.length - 1]._id);
  return sid === masRecienteId ? 'más reciente' : 'intermedia';
}

function claseTarjetaBasal(a) {
  const selected = esBasalSeleccionada(a);
  if (basalDeshabilitada(a)) {
    return 'relative flex items-center py-1 px-2 pr-5 rounded-md border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed';
  }
  return [
    'relative flex items-center py-1 px-2 pr-5 rounded-md border cursor-pointer transition-colors duration-150',
    selected
      ? 'border-emerald-600 bg-emerald-50'
      : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50',
  ];
}

function claseTarjetaSubsecuente(a) {
  const disabled = subsecuenteDeshabilitada(a);
  const selected = esSubsecuenteSeleccionada(a._id);
  if (esBasalSeleccionada(a) || (disabled && !selected)) {
    return 'relative flex items-center py-1 px-2 pr-5 rounded-md border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed';
  }
  if (selected) {
    return 'relative flex items-center py-1 px-2 pr-5 rounded-md border border-emerald-600 bg-emerald-50 cursor-pointer transition-colors duration-150';
  }
  return 'relative flex items-center py-1 px-2 pr-5 rounded-md border border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 cursor-pointer transition-colors duration-150';
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
  <div class="ila-section-step flex flex-col min-h-0 w-full">
    <h1 class="text-2xl font-bold mb-0.5 text-gray-900 shrink-0">Informe longitudinal de seguimiento audiométrico</h1>
    <p class="text-sm text-gray-600 mb-3 shrink-0">Paso 1: periodo, basal y audiometrías incluidas</p>

    <div
      ref="scrollRoot"
      class="ila-section-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden max-h-[min(50vh,440px)] sm:max-h-[min(52vh,470px)] xl:max-h-[min(56vh,500px)] pr-0.5 space-y-3 border border-gray-100 rounded-lg bg-gray-50/40 p-2 sm:p-3"
    >
      <div class="space-y-1 min-w-0">
        <h2 class="text-base font-medium text-gray-800">Fecha del informe</h2>
        <FormKit
          type="date"
          name="fechaInformeLongitudinalAudiometrico"
          :max="fechaDocumentoMax"
          v-model="fechaInforme"
          outer-class="mb-0 w-[11rem] min-w-0"
          input-class="text-sm !py-1.5 !px-2"
        />
      </div>

      <div class="space-y-1 min-w-0">
        <h2 class="text-base font-medium text-gray-800">Periodo analizado</h2>
        <div class="grid grid-cols-2 gap-2 min-w-0">
          <FormKit
            type="date"
            name="periodoInicio"
            label="Inicio"
            :max="fechaDocumentoMax"
            v-model="periodoInicio"
            outer-class="mb-0 min-w-0 w-full"
            label-class="mb-0.5 text-xs"
            input-class="text-xs !py-1 !px-1.5"
          />
          <FormKit
            type="date"
            name="periodoFin"
            label="Fin"
            :max="fechaDocumentoMax"
            v-model="periodoFin"
            outer-class="mb-0 min-w-0 w-full"
            label-class="mb-0.5 text-xs"
            input-class="text-xs !py-1 !px-1.5"
          />
        </div>
      </div>
      <p class="text-xs text-gray-500">{{ AYUDA_RANGO }}</p>

      <div class="border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 class="text-base font-semibold text-gray-800">Audiometría basal</h3>
        <ul v-if="audiometriasEnRango.length" class="space-y-1">
          <li v-for="a in audiometriasEnRango" :key="mongoIdStr(a._id)">
            <label :class="claseTarjetaBasal(a)">
              <input
                type="radio"
                class="sr-only"
                name="idAudiometriaBasal"
                :value="mongoIdStr(a._id)"
                :disabled="basalDeshabilitada(a)"
                v-model="idBasal"
                @change="onSeleccionarBasal"
              />
              <span class="min-w-0 flex-1 text-xs leading-tight">
                <span
                  class="font-medium transition-colors duration-150"
                  :class="esBasalSeleccionada(a) ? 'text-emerald-700' : (basalDeshabilitada(a) ? 'text-gray-400' : 'text-gray-800')"
                >
                  {{ toYyyyMmDd(a.fechaAudiometria) || '—' }}
                </span>
                <span :class="esBasalSeleccionada(a) ? 'text-emerald-700/80' : (basalDeshabilitada(a) ? 'text-gray-400' : 'text-gray-500')">
                  · {{ a.metodoAudiometria || 'sin método' }}
                </span>
                <span v-if="esBasalSeleccionada(a)" class="font-medium text-emerald-700"> (basal)</span>
              </span>
              <div
                v-if="esBasalSeleccionada(a)"
                class="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-600 rounded-full flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-2 w-2 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
            </label>
          </li>
        </ul>
        <p v-else class="text-sm text-gray-500">No hay audiometrías en el periodo seleccionado.</p>
      </div>

      <div ref="seccionSubsecuentes" class="border border-gray-200 rounded-lg p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-base font-semibold text-gray-800">Audiometrías subsecuentes</h3>
          <div class="flex items-center gap-2">
            <span
              class="text-xs tabular-nums"
              :class="idsSubsecuentes.length > MAX_AUDIOMETRIAS_SUBSECUENTES_ILA ? 'text-red-600' : 'text-gray-500'"
            >
              {{ idsSubsecuentes.length }} / {{ MAX_AUDIOMETRIAS_SUBSECUENTES_ILA }} seleccionadas
            </span>
            <button type="button" class="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200" @click="idsSubsecuentes = []">
              Limpiar
            </button>
          </div>
        </div>
        <p class="text-xs text-gray-500">Máximo {{ MAX_AUDIOMETRIAS_SUBSECUENTES_ILA }} audiometrías subsecuentes además de la basal. No se pueden incluir dos con la misma fecha.</p>
        <ul v-if="audiometriasEnRango.length" class="space-y-1">
          <li v-for="a in audiometriasEnRango" :key="'sub-' + mongoIdStr(a._id)">
            <label :class="claseTarjetaSubsecuente(a)">
              <input
                type="checkbox"
                class="sr-only"
                :disabled="subsecuenteDeshabilitada(a)"
                :checked="esSubsecuenteSeleccionada(a._id)"
                @change="toggleSubsecuente(a._id, $event.target.checked)"
              />
              <span class="min-w-0 flex-1 text-xs leading-tight">
                <span
                  class="font-medium transition-colors duration-150"
                  :class="esSubsecuenteSeleccionada(a._id) ? 'text-emerald-700' : (subsecuenteDeshabilitada(a) ? 'text-gray-400' : 'text-gray-800')"
                >
                  {{ toYyyyMmDd(a.fechaAudiometria) || '—' }}
                </span>
                <span
                  :class="esSubsecuenteSeleccionada(a._id) ? 'text-emerald-700/80' : (subsecuenteDeshabilitada(a) ? 'text-gray-400' : 'text-gray-500')"
                >
                  · {{ a.metodoAudiometria || 'sin método' }}
                </span>
                <span v-if="etiquetaRolSubsecuente(a)" class="font-medium" :class="esSubsecuenteSeleccionada(a._id) ? 'text-emerald-700' : 'text-gray-400'">
                  ({{ etiquetaRolSubsecuente(a) }})
                </span>
              </span>
              <div
                v-if="esSubsecuenteSeleccionada(a._id)"
                class="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-600 rounded-full flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-2 w-2 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
            </label>
          </li>
        </ul>
        <p v-else class="text-sm text-gray-500">No hay audiometrías en el periodo.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.formkit-outer),
:deep(.formkit-wrapper),
:deep(.formkit-inner) {
  margin-bottom: 0;
  max-width: 100%;
  min-width: 0;
}
:deep(.formkit-label) {
  margin-bottom: 0.125rem;
}
:deep(input[type='date']) {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  font-size: 0.75rem;
  line-height: 1.25;
}
:deep(input[type='date']::-webkit-calendar-picker-indicator) {
  width: 0.85rem;
  height: 0.85rem;
  padding: 0;
  margin-left: 0.125rem;
  cursor: pointer;
}
.ila-section-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgb(148 163 184 / 0.65) transparent;
}
.ila-section-scroll::-webkit-scrollbar {
  width: 3px;
}
.ila-section-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.ila-section-scroll::-webkit-scrollbar-thumb {
  background-color: rgb(148 163 184 / 0.65);
  border-radius: 9999px;
}
</style>
