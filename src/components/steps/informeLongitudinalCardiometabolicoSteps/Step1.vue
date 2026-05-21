<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { endOfMonth, format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import SeguimientoProgramadoCardiometabolicoAPI from '@/api/SeguimientoProgramadoCardiometabolicoAPI';
import { derivarMetricasSeguimientoYEventos } from '@/helpers/informeLongitudinalOperativo';
import { snapshotEventoConcentradoIlc } from '@/helpers/informeLongitudinalTratamiento';

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const formDataStore = useFormDataStore();
const { formDataInformeLongitudinalCardiometabolico } = storeToRefs(formDataStore);
const documentos = useDocumentosStore();
const route = useRoute();
/** Ref reactivo del store: asegura que los eventos CM aparezcan al terminar `fetchAllDocuments`. */
const { documentsByYear } = storeToRefs(documentos);

const today = format(new Date(), 'yyyy-MM-dd');

/** Fechas de eventos clínicos CM vs fechas programadas operativas (seguimientos). */
const AYUDA_RANGO =
  'Seguimientos realizados y programados en el periodo seleccionado.';

function toYyyyMmDd(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim();
  const s = formatDateYYYYMMDD(v);
  return s || null;
}

/** ObjectId desde API (string u objeto) → string estable para comparar y enviar. */
function mongoIdStr(x) {
  if (x == null || x === '') return '';
  if (typeof x === 'object' && x._id != null) return String(x._id);
  return String(x);
}

function idsArrayFromForm(arr) {
  if (!Array.isArray(arr)) return [];
  const out = arr.map(mongoIdStr).filter(Boolean);
  return [...new Set(out)];
}

/**
 * Periodo sugerido: inicio = fecha del evento más antiguo; fin = último día del mes del evento más reciente.
 */
function periodoSugeridoDesdeEventos(eventos) {
  const fechas = eventos
    .map((e) => toYyyyMmDd(e?.fechaEventoSeguimientoCardiometabolico))
    .filter(Boolean)
    .sort();
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

/**
 * Todos los eventos CM del trabajador (aplanado desde `documentsByYear` por año).
 */
const eventosDesdeStore = computed(() => {
  const out = [];
  const byYear = documentsByYear.value || {};
  for (const yearData of Object.values(byYear)) {
    const arr = yearData?.eventoSeguimientoCardiometabolico;
    if (Array.isArray(arr)) out.push(...arr);
  }
  const tid = trabajadores.currentTrabajadorId;
  return out.filter((e) => {
    if (!e) return false;
    if (!tid || !e.idTrabajador) return true;
    return mongoIdStr(e.idTrabajador) === mongoIdStr(tid);
  });
});

const periodoInicio = ref(toYyyyMmDd(formDataInformeLongitudinalCardiometabolico.value.periodoInicio) || today);
const periodoFin = ref(toYyyyMmDd(formDataInformeLongitudinalCardiometabolico.value.periodoFin) || today);
const fechaInformeLongitudinalCardiometabolico = ref(
  toYyyyMmDd(formDataInformeLongitudinalCardiometabolico.value.fechaInformeLongitudinalCardiometabolico) || today,
);

const seguimientosProgramados = ref([]);
const loadingSeg = ref(false);

const idsEventosSeleccionados = ref(idsArrayFromForm(formDataInformeLongitudinalCardiometabolico.value.eventosIncluidos));
const idsSeguimientosSeleccionados = ref(
  idsArrayFromForm(formDataInformeLongitudinalCardiometabolico.value.seguimientosProgramadosIncluidos),
);

/** Solo borrador nuevo: periodo por defecto desde eventos; en edición lo fija el documento / formData. */
const periodoPorDefectoEventosAplicado = ref(false);

function fechaEnPeriodo(fechaCampo, inicio, fin) {
  const f = toYyyyMmDd(fechaCampo);
  const a = toYyyyMmDd(inicio);
  const b = toYyyyMmDd(fin);
  if (!f || !a || !b) return true;
  return f >= a && f <= b;
}

const eventosEnRango = computed(() =>
  eventosDesdeStore.value.filter((e) =>
    fechaEnPeriodo(e.fechaEventoSeguimientoCardiometabolico, periodoInicio.value, periodoFin.value),
  ),
);

const seguimientosEnRango = computed(() =>
  seguimientosProgramados.value.filter((s) =>
    fechaEnPeriodo(s.fechaProgramada, periodoInicio.value, periodoFin.value),
  ),
);

function snapshotEvento(ev) {
  return snapshotEventoConcentradoIlc(ev);
}

function snapshotSeguimiento(s) {
  return {
    idSeguimientoProgramadoOriginal: s._id,
    fechaProgramada: toYyyyMmDd(s.fechaProgramada) || undefined,
    fechaReprogramada: s.fechaReprogramada ? toYyyyMmDd(s.fechaReprogramada) : undefined,
    esResultadoDeReprogramacion: !!(s.idSeguimientoReprogramado || s.fechaReprogramada || s.esResultadoDeReprogramacion),
    estado: s.estado,
    motivo: s.motivo,
    observaciones: s.observaciones,
    idEventoClinico: s.idEventoClinico,
  };
}

function sincronizarPayloadInforme() {
  const fd = formDataInformeLongitudinalCardiometabolico.value;
  fd.fechaInformeLongitudinalCardiometabolico = fechaInformeLongitudinalCardiometabolico.value;
  fd.periodoInicio = periodoInicio.value;
  fd.periodoFin = periodoFin.value;

  if (!idsEventosSeleccionados.value.length && idsArrayFromForm(fd.eventosIncluidos).length) {
    idsEventosSeleccionados.value = idsArrayFromForm(fd.eventosIncluidos);
  }

  const selEv = new Set(idsEventosSeleccionados.value.map(mongoIdStr));
  const eventosSel = eventosDesdeStore.value.filter((e) => selEv.has(mongoIdStr(e._id)));
  fd.eventosIncluidos = eventosSel.map((e) => e._id);
  fd.numeroEventosIncluidos = eventosSel.length;

  const concentradoPersistido =
    Array.isArray(fd.eventosConcentrados) &&
    fd.eventosConcentrados.length > 0 &&
    idsArrayFromForm(fd.eventosIncluidos).length > 0;

  if (eventosSel.length > 0) {
    fd.eventosConcentrados = eventosSel.map(snapshotEvento);
  } else if (!concentradoPersistido) {
    fd.eventosConcentrados = [];
  }

  const selSg = new Set(idsSeguimientosSeleccionados.value.map(mongoIdStr));
  let segSel = seguimientosProgramados.value.filter((s) => selSg.has(mongoIdStr(s._id)));
  const knownSg = new Set(segSel.map((s) => mongoIdStr(s._id)));
  const conc = fd.seguimientosProgramadosConcentrados;
  if (Array.isArray(conc)) {
    for (const row of conc) {
      const oid = mongoIdStr(row.idSeguimientoProgramadoOriginal);
      if (oid && selSg.has(oid) && !knownSg.has(oid)) {
        segSel.push({
          _id: row.idSeguimientoProgramadoOriginal,
          fechaProgramada: row.fechaProgramada,
          fechaReprogramada: row.fechaReprogramada,
          estado: row.estado,
          motivo: row.motivo,
          observaciones: row.observaciones,
          idEventoClinico: row.idEventoClinico,
          esResultadoDeReprogramacion: row.esResultadoDeReprogramacion,
          idSeguimientoReprogramado: undefined,
        });
        knownSg.add(oid);
      }
    }
  }
  fd.seguimientosProgramadosIncluidos = segSel.map((s) => s._id);
  fd.seguimientosProgramadosConcentrados = segSel.map(snapshotSeguimiento);

  const met = derivarMetricasSeguimientoYEventos(fd.seguimientosProgramadosConcentrados, fd.eventosConcentrados);
  fd.numeroSeguimientosProgramados = met.numeroSeguimientosProgramados;
  fd.numeroSeguimientosRealizados = met.numeroSeguimientosRealizados;
  fd.numeroInasistencias = met.numeroInasistencias;
  fd.numeroCancelaciones = met.numeroCancelaciones;
  fd.numeroReprogramaciones = met.numeroReprogramaciones;
  fd.porcentajeAsistencia = met.porcentajeAsistencia;
  fd.numeroEventosValidos = met.numeroEventosValidos;
}

watch(
  [
    fechaInformeLongitudinalCardiometabolico,
    periodoInicio,
    periodoFin,
    idsEventosSeleccionados,
    idsSeguimientosSeleccionados,
  ],
  () => sincronizarPayloadInforme(),
  { deep: true },
);

/** Al cargar el expediente CM, actualizar tratamiento/cambios en el concentrado (no el snapshot viejo del ILC). */
watch(
  () => eventosDesdeStore.value,
  () => {
    if (
      idsEventosSeleccionados.value.length ||
      idsArrayFromForm(formDataInformeLongitudinalCardiometabolico.value.eventosIncluidos).length
    ) {
      sincronizarPayloadInforme();
    }
  },
  { deep: true },
);

/**
 * Hidratar fechas desde el formulario cuando llega el documento por API
 * (`fetchDocumentById` suele terminar después de `fetchAllDocuments` y del primer render).
 */
watch(
  () => formDataInformeLongitudinalCardiometabolico.value,
  (fd) => {
    if (!fd || typeof fd !== 'object') return;
    const piOk = toYyyyMmDd(fd.periodoInicio);
    const pfOk = toYyyyMmDd(fd.periodoFin);
    const fiOk = toYyyyMmDd(fd.fechaInformeLongitudinalCardiometabolico);
    if (piOk) periodoInicio.value = piOk;
    if (pfOk) periodoFin.value = pfOk;
    if (fiOk) fechaInformeLongitudinalCardiometabolico.value = fiOk;
  },
  { deep: true },
);

/** En informe nuevo: una vez que hay eventos CM, periodo = del más antiguo al fin de mes del más reciente. */
watch(
  () => eventosDesdeStore.value,
  (eventos) => {
    if (String(route.params.idDocumento || '')) return;
    if (periodoPorDefectoEventosAplicado.value) return;
    const sug = periodoSugeridoDesdeEventos(eventos);
    if (!sug) return;
    periodoInicio.value = sug.inicio;
    periodoFin.value = sug.fin;
    periodoPorDefectoEventosAplicado.value = true;
  },
  { deep: true, immediate: true },
);

watch([periodoInicio, periodoFin, eventosEnRango, seguimientosEnRango], () => {
  const idsEv = new Set(eventosEnRango.value.map((e) => mongoIdStr(e._id)));
  const idsSg = new Set(seguimientosEnRango.value.map((s) => mongoIdStr(s._id)));
  idsEventosSeleccionados.value = idsEventosSeleccionados.value.filter((id) => idsEv.has(mongoIdStr(id)));
  idsSeguimientosSeleccionados.value = idsSeguimientosSeleccionados.value.filter((id) => idsSg.has(mongoIdStr(id)));
});

/**
 * Hidratar selección solo desde el documento que devuelve el GET.
 * No observar `formData.eventosIncluidos`: `sincronizarPayloadInforme` lo actualiza en cada cambio
 * y un watch ahí sobrescribía la selección y rompía checkboxes / botones.
 */
watch(
  () => documentos.currentDocument,
  (doc) => {
    if (!doc) return;
    if (String(documentos.currentTypeOfDocument || '') !== 'informeLongitudinalCardiometabolico') return;
    idsEventosSeleccionados.value = idsArrayFromForm(doc.eventosIncluidos);
    idsSeguimientosSeleccionados.value = idsArrayFromForm(doc.seguimientosProgramadosIncluidos);
  },
  { immediate: true },
);

function setIdEnConjunto(refIds, id, checked) {
  const sid = mongoIdStr(id);
  if (!sid) return;
  const next = new Set(refIds.value.map((x) => mongoIdStr(x)));
  if (checked) next.add(sid);
  else next.delete(sid);
  refIds.value = [...next];
}

function toggleEvento(id, checked) {
  setIdEnConjunto(idsEventosSeleccionados, id, checked);
}

function toggleSeguimiento(id, checked) {
  setIdEnConjunto(idsSeguimientosSeleccionados, id, checked);
}

function seleccionarTodosEventosRango() {
  idsEventosSeleccionados.value = eventosEnRango.value.map((e) => mongoIdStr(e._id)).filter(Boolean);
}

function limpiarSeleccionEventos() {
  idsEventosSeleccionados.value = [];
}

function seleccionarTodosSeguimientosRango() {
  idsSeguimientosSeleccionados.value = seguimientosEnRango.value.map((s) => mongoIdStr(s._id)).filter(Boolean);
}

function limpiarSeleccionSeguimientos() {
  idsSeguimientosSeleccionados.value = [];
}

onMounted(async () => {
  const fd = formDataInformeLongitudinalCardiometabolico.value;
  if (!idsEventosSeleccionados.value.length && idsArrayFromForm(fd.eventosIncluidos).length) {
    idsEventosSeleccionados.value = idsArrayFromForm(fd.eventosIncluidos);
  }
  if (!idsSeguimientosSeleccionados.value.length && idsArrayFromForm(fd.seguimientosProgramadosIncluidos).length) {
    idsSeguimientosSeleccionados.value = idsArrayFromForm(fd.seguimientosProgramadosIncluidos);
  }

  const d = documentos.currentDocument;
  if (d) {
    const fi = toYyyyMmDd(d.fechaInformeLongitudinalCardiometabolico);
    const pi = toYyyyMmDd(d.periodoInicio);
    const pf = toYyyyMmDd(d.periodoFin);
    if (fi) fechaInformeLongitudinalCardiometabolico.value = fi;
    if (pi) periodoInicio.value = pi;
    if (pf) periodoFin.value = pf;
  }

  formDataInformeLongitudinalCardiometabolico.value.idTrabajador = trabajadores.currentTrabajadorId;

  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataInformeLongitudinalCardiometabolico.value.rutaPDF = `expedientes-medicos/${empresa}/${centroTrabajo}/${trabajadorNombre}_${trabajadorId}`;

  loadingSeg.value = true;
  try {
    const tid = trabajadores.currentTrabajadorId;
    if (tid) {
      const { data } = await SeguimientoProgramadoCardiometabolicoAPI.list(tid);
      seguimientosProgramados.value = Array.isArray(data) ? data : [];
    } else {
      seguimientosProgramados.value = [];
    }
  } catch (e) {
    console.error('No se pudieron cargar seguimientos programados CM', e);
    seguimientosProgramados.value = [];
  } finally {
    loadingSeg.value = false;
  }

  sincronizarPayloadInforme();
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Informe longitudinal cardiometabólico</h1>
    <p class="text-sm text-gray-600 mb-6">Paso 1: periodo y fuentes</p>

    <div class="mt-4 space-y-4">
      <h2 class="text-lg font-medium text-gray-800">Fecha del informe</h2>
      <FormKit
        type="date"
        name="fechaInformeLongitudinalCardiometabolico"
        v-model="fechaInformeLongitudinalCardiometabolico"
      />

      <h2 class="text-lg font-medium text-gray-800 pt-2">Periodo del informe</h2>
      <div class="flex flex-col sm:flex-row gap-4">
        <FormKit type="date" name="periodoInicio" label="Inicio" v-model="periodoInicio" />
        <FormKit type="date" name="periodoFin" label="Fin" v-model="periodoFin" />
      </div>

      <p class="text-xs text-gray-500">{{ AYUDA_RANGO }}</p>

      <div class="border border-gray-200 rounded-lg p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-base font-semibold text-gray-800">Seguimientos realizados</h3>
          <div class="flex gap-2">
            <button
              type="button"
              class="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
              @click="seleccionarTodosEventosRango"
            >
              Seleccionar todos en rango
            </button>
            <button
              type="button"
              class="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
              @click="limpiarSeleccionEventos"
            >
              Limpiar
            </button>
          </div>
        </div>
        <ul v-if="eventosEnRango.length" class="space-y-2 max-h-56 overflow-y-auto">
          <li
            v-for="ev in eventosEnRango"
            :key="mongoIdStr(ev._id)"
            class="text-sm border-b border-gray-100 pb-2"
          >
            <label class="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                class="mt-1 shrink-0"
                :checked="idsEventosSeleccionados.some((x) => mongoIdStr(x) === mongoIdStr(ev._id))"
                @change="toggleEvento(ev._id, $event.target.checked)"
              />
              <span class="flex-1">
                <span class="font-medium">{{ toYyyyMmDd(ev.fechaEventoSeguimientoCardiometabolico) || '—' }}</span>
                <span v-if="String(ev.motivoSeguimiento || '').trim()" class="text-gray-600">
                  — {{ String(ev.motivoSeguimiento).trim() }}
                </span>
              </span>
            </label>
          </li>
        </ul>
        <p v-else class="text-sm text-gray-500">No hay eventos CM en el periodo seleccionado.</p>
      </div>

      <div class="border border-gray-200 rounded-lg p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-base font-semibold text-gray-800">Seguimientos programados</h3>
          <div class="flex gap-2">
            <button
              type="button"
              class="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
              @click="seleccionarTodosSeguimientosRango"
            >
              Seleccionar todos en rango
            </button>
            <button
              type="button"
              class="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
              @click="limpiarSeleccionSeguimientos"
            >
              Limpiar
            </button>
          </div>
        </div>
        <p v-if="loadingSeg" class="text-sm text-gray-500">Cargando citas programadas…</p>
        <ul v-else-if="seguimientosEnRango.length" class="space-y-2 max-h-56 overflow-y-auto">
          <li
            v-for="s in seguimientosEnRango"
            :key="mongoIdStr(s._id)"
            class="text-xs border-b border-gray-100 pb-2"
          >
            <label class="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                class="mt-1 shrink-0"
                :checked="idsSeguimientosSeleccionados.some((x) => mongoIdStr(x) === mongoIdStr(s._id))"
                @change="toggleSeguimiento(s._id, $event.target.checked)"
              />
              <span class="flex-1">
                <span class="font-medium">{{ toYyyyMmDd(s.fechaProgramada) || '—' }}</span>
                <span v-if="String(s.motivo || '').trim() || s.estado" class="text-gray-600">
                  <template v-if="String(s.motivo || '').trim()"> — {{ String(s.motivo).trim() }}</template>
                  <template v-if="s.estado"> · {{ s.estado }}</template>
                </span>
              </span>
            </label>
          </li>
        </ul>
        <p v-else class="text-sm text-gray-500">No hay seguimientos programados en el periodo.</p>
      </div>
    </div>
  </div>
</template>
