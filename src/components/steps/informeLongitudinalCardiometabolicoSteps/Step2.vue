<script setup>
import { computed, onMounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { aplicarIteracionDosAlFormulario } from '@/helpers/informeLongitudinalOperativo';

const store = useFormDataStore();

const fm = computed(() => store.formDataInformeLongitudinalCardiometabolico);

/** Paleta semáforo: mismo patrón visual (borde 2, fondo suave, tipografía); solo cambian los tonos. */
const AURA = {
  ok: {
    ring: 'border-emerald-200',
    bg: 'bg-emerald-50/80',
    lab: 'text-emerald-900/80',
    val: 'text-emerald-950',
  },
  warn: {
    ring: 'border-amber-200',
    bg: 'bg-amber-50/80',
    lab: 'text-amber-900/80',
    val: 'text-amber-950',
  },
  bad: {
    ring: 'border-red-200',
    bg: 'bg-red-50/80',
    lab: 'text-red-900/80',
    val: 'text-red-950',
  },
  neutral: {
    ring: 'border-slate-200',
    bg: 'bg-slate-50/90',
    lab: 'text-slate-700',
    val: 'text-slate-900',
  },
};

function tonoRiesgoLongitudinal(nivel) {
  const s = nivel == null ? '' : String(nivel).trim();
  if (!s) return 'neutral';
  if (s === 'Muy Bajo' || s === 'Bajo') return 'ok';
  if (s === 'Moderado') return 'warn';
  if (s === 'Alto' || s === 'Crítico') return 'bad';
  return 'neutral';
}

function tonoTrayectoriaLongitudinal(t) {
  const s = t == null ? '' : String(t).trim();
  if (!s) return 'neutral';
  if (s === 'Favorable' || s === 'Estable') return 'ok';
  if (s === 'Mixta') return 'warn';
  if (s === 'Desfavorable') return 'bad';
  return 'neutral';
}

function tonoPorcentajeAsistencia(p) {
  if (p == null || p === '') return 'neutral';
  const n = Number(p);
  if (!Number.isFinite(n)) return 'neutral';
  if (n >= 70) return 'ok';
  if (n >= 50) return 'warn';
  return 'bad';
}

function tonoConsistenciaSeguimiento(c) {
  const s = c == null ? '' : String(c).trim();
  if (!s) return 'neutral';
  if (s === 'Adecuado') return 'ok';
  if (s === 'Irregular') return 'warn';
  if (s === 'Insuficiente') return 'bad';
  return 'neutral';
}

const estiloCajaRiesgo = computed(() => {
  const t = tonoRiesgoLongitudinal(fm.value.nivelRiesgoLongitudinal);
  const a = AURA[t];
  return {
    box: `rounded-lg border-2 ${a.ring} ${a.bg} px-4 py-3 shadow-sm`,
    label: `text-xs font-medium uppercase tracking-wide ${a.lab}`,
    valor: `text-3xl sm:text-4xl font-bold ${a.val} mt-1`,
  };
});

const estiloCajaTrayectoria = computed(() => {
  const t = tonoTrayectoriaLongitudinal(fm.value.tendenciaLongitudinal);
  const a = AURA[t];
  return {
    box: `rounded-lg border-2 ${a.ring} ${a.bg} px-4 py-3 shadow-sm`,
    label: `text-xs font-medium uppercase tracking-wide ${a.lab}`,
    valor: `text-2xl sm:text-3xl font-semibold ${a.val} mt-1`,
  };
});

const estiloCajaAsistencia = computed(() => {
  const t = tonoPorcentajeAsistencia(fm.value.porcentajeAsistencia);
  const a = AURA[t];
  return {
    box: `rounded-lg border-2 ${a.ring} ${a.bg} px-4 py-3 shadow-sm min-w-0`,
    label: `text-xs font-medium uppercase tracking-wide ${a.lab}`,
    valor: `text-xl sm:text-2xl font-semibold ${a.val} mt-1 tabular-nums`,
  };
});

const estiloCajaSeguimiento = computed(() => {
  const t = tonoConsistenciaSeguimiento(fm.value.consistenciaSeguimiento);
  const a = AURA[t];
  return {
    box: `rounded-lg border-2 ${a.ring} ${a.bg} px-4 py-3 shadow-sm min-w-0`,
    label: `text-xs font-medium uppercase tracking-wide ${a.lab}`,
    valor: `text-xl sm:text-2xl font-semibold ${a.val} mt-1`,
  };
});

const riesgoLongitudinalLegible = computed(() => {
  const v = fm.value.nivelRiesgoLongitudinal;
  if (v == null || String(v).trim() === '') return '—';
  return String(v);
});

const trayectoriaLongitudinalLegible = computed(() => {
  const v = fm.value.tendenciaLongitudinal;
  if (v == null || String(v).trim() === '') return '—';
  return String(v);
});

const consistenciaSeguimientoLegible = computed(() => {
  const v = fm.value.consistenciaSeguimiento;
  if (v == null || String(v).trim() === '') return '—';
  return String(v);
});

/** % operativo del formulario (misma fuente que consistencia automática). */
const porcentajeAsistenciaLegible = computed(() => {
  const p = fm.value.porcentajeAsistencia;
  if (p == null || p === '') return '—';
  const n = Number(p);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n)} %`;
});

/** Números en resumen: máximo 2 decimales (redondeo); sin forzar .00 en enteros. */
function fmtIndicadorNum(val) {
  if (val == null || val === '') return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return String(val);
  return String(Number.parseFloat(n.toFixed(2)));
}

function formatoIndicador(o) {
  if (!o || typeof o !== 'object') return '';
  const vi = o.valorInicial;
  const vf = o.valorFinal;
  if (vi == null && vf == null) return '';
  const sVi = fmtIndicadorNum(vi);
  const sVf = fmtIndicadorNum(vf);
  const tramo =
    sVi != null && sVf != null ? `${sVi} → ${sVf}` : sVi != null ? `${sVi}` : `${sVf}`;
  const delta =
    o.cambioAbsoluto != null && vi != null && vf != null
      ? ` (Δ ${fmtIndicadorNum(o.cambioAbsoluto)})`
      : '';
  const tend = o.tendencia ? ` · ${o.tendencia}` : ' · —';
  return `${tramo}${delta}${tend}`;
}

/** Evolución principal: TA (sist + diast), peso, IMC, glucosa, HbA1c — sin lípidos. */
const resumenIndicadoresResumen = computed(() => {
  const r = fm.value.resumenIndicadores;
  if (!r || typeof r !== 'object') return [];
  const lines = [];
  const push = (label, o) => {
    const t = formatoIndicador(o);
    if (!t) return;
    lines.push({ label, texto: t });
  };
  push('TA sistólica (mmHg)', r.tensionArterialSistolica);
  push('TA diastólica (mmHg)', r.tensionArterialDiastolica);
  push('Peso (kg)', r.peso);
  push('IMC', r.indiceMasaCorporal);
  push('Glucosa (mg/dL)', r.glucosaMgDl);
  push('HbA1c (%)', r.hba1cPorcentaje);
  return lines;
});

const resumenCondicionesBloques = computed(() => {
  const rc = fm.value.resumenCondiciones;
  if (!rc || typeof rc !== 'object') return [];
  const out = [];
  const push = (titulo, bloque) => {
    if (!bloque || typeof bloque !== 'object') return;
    const parts = [];
    if (bloque.presente != null) parts.push(`Presente: ${bloque.presente ? 'Sí' : 'No'}`);
    if (bloque.estadoActual) parts.push(`Estado: ${bloque.estadoActual}`);
    if (bloque.gradoActual) parts.push(`Grado: ${bloque.gradoActual}`);
    if (bloque.tendencia) parts.push(`Tendencia: ${bloque.tendencia}`);
    if (bloque.interpretacionAutomatica) parts.push(bloque.interpretacionAutomatica);
    if (bloque.observaciones) parts.push(bloque.observaciones);
    if (parts.length) out.push({ titulo, texto: parts.join(' · ') });
  };
  push('Hipertensión', rc.hipertension);
  push('Diabetes', rc.diabetes);
  push('Dislipidemia', rc.dislipidemia);
  push('Obesidad', rc.obesidad);
  return out;
});

function aplicarAutomatizacionMontajeStep2() {
  aplicarIteracionDosAlFormulario(store.formDataInformeLongitudinalCardiometabolico, {
    sobrescribirInterpretacionAutomatizada: true,
    prellenarGraficasSiVacio: false,
    recalcDatosFaltantes: true,
  });
}

onMounted(() => {
  if (fm.value.consistenciaSeguimiento === '') fm.value.consistenciaSeguimiento = undefined;
  if (fm.value.nivelRiesgoLongitudinal === '') fm.value.nivelRiesgoLongitudinal = undefined;
  if (fm.value.tendenciaLongitudinal === '') fm.value.tendenciaLongitudinal = undefined;
  aplicarAutomatizacionMontajeStep2();
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Riesgo y trayectoria</h1>

    <div class="space-y-10">
      <!-- Tres subsecciones: riesgo | trayectoria | consistencia (más aire entre bloques, más compacto dentro) -->
      <section class="max-w-4xl flex flex-col gap-6">
        <!-- 1. Riesgo + interpretación -->
        <div class="space-y-2">
          <h2 class="text-lg font-semibold text-gray-900 border-b border-gray-200 p-1"></h2>
          <div :class="estiloCajaRiesgo.box">
            <p :class="estiloCajaRiesgo.label">Riesgo longitudinal</p>
            <p :class="estiloCajaRiesgo.valor">{{ riesgoLongitudinalLegible }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-700 mb-0.5">Interpretación del riesgo</p>
            <p class="text-sm text-gray-800 whitespace-pre-wrap border border-gray-200 rounded-md p-3 bg-gray-50/80 min-h-[5rem]">
              {{ fm.interpretacionRiesgoLongitudinal || '—' }}
            </p>
          </div>
        </div>

        <!-- 2. Trayectoria + tendencia en indicadores -->
        <div v-if="resumenIndicadoresResumen.length" class="space-y-2">
          <h2 class="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-1"></h2>
          <div :class="estiloCajaTrayectoria.box">
            <p :class="estiloCajaTrayectoria.label">Trayectoria del periodo</p>
            <p :class="estiloCajaTrayectoria.valor">{{ trayectoriaLongitudinalLegible }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm font-medium text-gray-700">Tendencia en los indicadores</p>
            <ul class="text-sm space-y-2 border border-gray-200 rounded-md p-3 bg-slate-50">
              <li v-for="(row, i) in resumenIndicadoresResumen" :key="i">
                <span class="font-medium text-gray-800">{{ row.label }}: </span>
                <span class="text-gray-700">{{ row.texto }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- 3. Seguimiento / asistencia + criterio colapsado -->
        <div class="space-y-2">
          <h2 class="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-1"></h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div :class="estiloCajaAsistencia.box">
              <p :class="estiloCajaAsistencia.label">% de asistencia</p>
              <p :class="estiloCajaAsistencia.valor">{{ porcentajeAsistenciaLegible }}</p>
            </div>
            <div :class="estiloCajaSeguimiento.box">
              <p :class="estiloCajaSeguimiento.label">Seguimiento</p>
              <p :class="estiloCajaSeguimiento.valor">{{ consistenciaSeguimientoLegible }}</p>
            </div>
          </div>
          <details class="rounded-lg border border-gray-200 bg-gray-50/90 text-xs text-gray-600">
            <summary class="cursor-pointer select-none px-3 py-2 font-medium text-gray-600 hover:bg-gray-100/80 rounded-lg">
              Criterio de consistencia del seguimiento
            </summary>
            <ul class="px-3 pb-3 pt-1 space-y-1 border-t border-gray-200/80">
              <li><span class="text-green-700">Adecuado:</span> ≥ 70 %</li>
              <li><span class="text-amber-700">Irregular:</span> 50–69 %</li>
              <li><span class="text-red-700">Insuficiente:</span> &lt; 50 %</li>
              <li><span class="text-gray-700">No valorable:</span> sin eventos</li>
            </ul>
          </details>
        </div>
      </section>

      <!-- Estado por condición -->
      <section v-if="resumenCondicionesBloques.length" class="space-y-2">
        <h2 class="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-1">Estado por condición</h2>
        <ul class="text-sm space-y-2 max-w-4xl">
          <li v-for="(b, i) in resumenCondicionesBloques" :key="i" class="border border-gray-100 rounded p-2 bg-white">
            <span class="font-medium text-gray-800">{{ b.titulo }}:</span>
            {{ b.texto }}
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
