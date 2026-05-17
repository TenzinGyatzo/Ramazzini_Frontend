<script setup>
import { computed, ref, onMounted, nextTick, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useStepsStore } from '@/stores/steps';
import {
  calcularEdad,
  calcularAntiguedad,
  convertirFechaISOaDDMMYYYY,
  formatDateDDMMYYYY,
} from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import { exportarGraficaAltaResolucion } from '@/helpers/exportChartImage';
import {
  buildEvolucionGlucemicaSeries,
  boundsEjeGlucosa,
  boundsEjeHbA1c,
  MSJ_GRAFICA_GLUCEMIA_INSUFICIENTE,
} from '@/helpers/graficaEvolucionGlucemica';
import {
  buildEvolucionPresionArterialSeries,
  boundsEjePresionArterialMmHg,
  MSJ_GRAFICA_PRESION_ARTERIAL_INSUFICIENTE,
} from '@/helpers/graficaEvolucionPresionArterial';
import {
  buildEvolucionPesoImcSeries,
  boundsEjeImc,
  boundsEjePesoKg,
  MSJ_GRAFICA_PESO_IMC_INSUFICIENTE,
} from '@/helpers/graficaEvolucionPesoImc';
import {
  buildEvolucionPerfilLipidicoSeries,
  boundsEjePerfilLipidicoMgDl,
  MSJ_GRAFICA_PERFIL_LIPIDICO_INSUFICIENTE,
} from '@/helpers/graficaEvolucionPerfilLipidico';
import GraficaEvolucionGlucemica from '@/components/graficas/GraficaEvolucionGlucemica.vue';
import GraficaEvolucionPresionArterial from '@/components/graficas/GraficaEvolucionPresionArterial.vue';
import GraficaEvolucionPesoImc from '@/components/graficas/GraficaEvolucionPesoImc.vue';
import GraficaEvolucionPerfilLipidico from '@/components/graficas/GraficaEvolucionPerfilLipidico.vue';
import TimelineSeguimientoInformeILC from '@/components/timeline/TimelineSeguimientoInformeILC.vue';
import {
  buildTimelineSeguimientoItems,
  MSJ_TIMELINE_SEGUIMIENTO_VACIA,
} from '@/helpers/timelineSeguimientoInformeLongitudinal';
import { useHtmlDarkMode } from '@/composables/useHtmlDarkMode';
import {
  agruparCeldasTratamientoEnFilas,
  buildCeldasTratamientoPeriodo,
  eventosCmDesdeDocumentsByYear,
  hayEvidenciaClinicaSoporteVisible,
  hayEvidenciaTratamientoPeriodo,
  refrescarEventosConcentradosEnInforme,
} from '@/helpers/informeLongitudinalTratamiento';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const documentos = useDocumentosStore();
const { documentsByYear } = storeToRefs(documentos);
const steps = useStepsStore();
const isHtmlDark = useHtmlDarkMode();

/**
 * Contraste grid del eje vs líneas de referencia punteadas (misma base slate-400).
 * Grid más claro y referencias algo más oscuras para que no se confundan al coincidir.
 */
const ILC_CHART_GRID_LIGHT = 'rgba(0, 0, 0, 0.08)';
const ILC_CHART_GRID_DARK = 'rgba(148, 163, 184, 0.22)';
const ILC_CHART_REF_SLATE_STRONG = 'rgba(148, 163, 184, 0.8)';
const ILC_CHART_REF_SLATE_SOFT = 'rgba(148, 163, 184, 0.68)';

function ilcChartGridColor() {
  return isHtmlDark.value ? ILC_CHART_GRID_DARK : ILC_CHART_GRID_LIGHT;
}

const fm = computed(() => formData.formDataInformeLongitudinalCardiometabolico);

function aplicarRefrescoEventosConcentradosDesdeExpediente() {
  const fd = formData.formDataInformeLongitudinalCardiometabolico;
  if (!fd?.eventosIncluidos?.length) return;
  const eventos = eventosCmDesdeDocumentsByYear(
    documentsByYear.value,
    trabajadores.currentTrabajadorId,
  );
  refrescarEventosConcentradosEnInforme(fd, eventos);
}

watch(
  [documentsByYear, () => fm.value?.eventosIncluidos],
  () => aplicarRefrescoEventosConcentradosDesdeExpediente(),
  { deep: true },
);

const refGraficaEvolucionGlucemica = ref(null);
const refGraficaEvolucionPresionArterial = ref(null);
const refGraficaEvolucionPesoImc = ref(null);
const refGraficaEvolucionPerfilLipidico = ref(null);

/** Paleta semáforo: misma lógica que `informeLongitudinalCardiometabolicoSteps/Step2.vue`. */
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
  const t = tonoRiesgoLongitudinal(fm.value?.nivelRiesgoLongitudinal);
  const a = AURA[t];
  return {
    box: `rounded-lg border-2 ${a.ring} ${a.bg} px-4 py-3 shadow-sm min-w-0`,
    label: `text-xs font-medium uppercase tracking-wide ${a.lab}`,
    valor: `text-3xl sm:text-4xl font-bold ${a.val} mt-1`,
  };
});

const estiloCajaTrayectoria = computed(() => {
  const t = tonoTrayectoriaLongitudinal(fm.value?.tendenciaLongitudinal);
  const a = AURA[t];
  return {
    box: `rounded-lg border-2 ${a.ring} ${a.bg} px-4 py-3 shadow-sm min-w-0`,
    label: `text-xs font-medium uppercase tracking-wide ${a.lab}`,
    valor: `text-2xl sm:text-3xl font-semibold ${a.val} mt-1`,
  };
});

const estiloCajaAsistencia = computed(() => {
  const t = tonoPorcentajeAsistencia(fm.value?.porcentajeAsistencia);
  const a = AURA[t];
  return {
    box: `rounded-lg border-2 ${a.ring} ${a.bg} px-4 py-3 shadow-sm min-w-0`,
    label: `text-xs font-medium uppercase tracking-wide ${a.lab}`,
    valor: `text-xl sm:text-2xl font-semibold ${a.val} mt-1 tabular-nums`,
  };
});

const estiloCajaSeguimiento = computed(() => {
  const t = tonoConsistenciaSeguimiento(fm.value?.consistenciaSeguimiento);
  const a = AURA[t];
  return {
    box: `rounded-lg border-2 ${a.ring} ${a.bg} px-4 py-3 shadow-sm min-w-0`,
    label: `text-xs font-medium uppercase tracking-wide ${a.lab}`,
    valor: `text-xl sm:text-2xl font-semibold ${a.val} mt-1`,
  };
});

function goToStep(stepNumber) {
  steps.goToStep(stepNumber);
}

function texto(v) {
  if (v == null || v === '') return '—';
  return String(v);
}

const fechaInformeFmt = computed(() =>
  formatDateDDMMYYYY(fm.value?.fechaInformeLongitudinalCardiometabolico),
);

const periodoFmt = computed(() => {
  const a = fm.value?.periodoInicio ? formatDateDDMMYYYY(fm.value.periodoInicio) : '—';
  const b = fm.value?.periodoFin ? formatDateDDMMYYYY(fm.value.periodoFin) : '—';
  return `${a} – ${b}`;
});

const riesgoLongitudinalLegible = computed(() => {
  const v = fm.value?.nivelRiesgoLongitudinal;
  if (v == null || String(v).trim() === '') return '—';
  return String(v);
});

const trayectoriaLongitudinalLegible = computed(() => {
  const v = fm.value?.tendenciaLongitudinal;
  if (v == null || String(v).trim() === '') return '—';
  return String(v);
});

const consistenciaSeguimientoLegible = computed(() => {
  const v = fm.value?.consistenciaSeguimiento;
  if (v == null || String(v).trim() === '') return '—';
  return String(v);
});

const hayBorradorAutomatico = computed(
  () => !!(fm.value?.recomendacionesSugeridas || fm.value?.limitacionesSugeridas),
);

const mostrarEvidenciaClinicaSoporte = computed(() =>
  hayEvidenciaClinicaSoporteVisible(fm.value?.eventosConcentrados, fm.value?.contextoTerapeutico),
);

const contextoTerapeuticoVista = computed(() =>
  (fm.value?.contextoTerapeutico ?? []).filter((s) => String(s).trim()),
);

const mostrarContextoTerapeutico = computed(() => contextoTerapeuticoVista.value.length > 0);

const mostrarTratamientoPeriodo = computed(() =>
  hayEvidenciaTratamientoPeriodo(fm.value?.eventosConcentrados),
);

const celdasTratamientoPeriodoVista = computed(() =>
  buildCeldasTratamientoPeriodo(fm.value?.eventosConcentrados),
);

const filasTratamientoPeriodoVista = computed(() => {
  const celdas = celdasTratamientoPeriodoVista.value;
  if (celdas.length <= 1) return [];
  return agruparCeldasTratamientoEnFilas(celdas);
});

/** Una tarjeta = fila única a ancho completo; varias = rejilla 2 columnas por fila. */
const gruposTratamientoPeriodoVista = computed(() => {
  const celdas = celdasTratamientoPeriodoVista.value;
  if (!celdas.length) return [];
  if (celdas.length === 1) return [{ esFila: false, celdas }];
  return filasTratamientoPeriodoVista.value.map((fila) => ({ esFila: true, celdas: fila }));
});

/** Previsualización alineada con Step2: números con máx. 2 decimales sin forzar .00 */
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

/** Solo tramo + Δ (presentación tabla evolución); sin concatenar tendencia aquí. */
function detalleNumericoIndicador(o) {
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
  return `${tramo}${delta}`;
}

const porcentajeAsistenciaLegible = computed(() => {
  const p = fm.value?.porcentajeAsistencia;
  if (p == null || p === '') return '—';
  const n = Number(p);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n)} %`;
});

const filasEvolucionVista = computed(() => {
  const r = fm.value?.resumenIndicadores;
  if (!r || typeof r !== 'object') return [];
  const rows = [];
  const push = (label, o) => {
    if (!formatoIndicador(o)) return;
    rows.push({
      label,
      tendencia: o?.tendencia ? String(o.tendencia) : '—',
      detalle: detalleNumericoIndicador(o) || '—',
    });
  };
  push('TA sistólica (mmHg)', r.tensionArterialSistolica);
  push('TA diastólica (mmHg)', r.tensionArterialDiastolica);
  push('Peso (kg)', r.peso);
  push('IMC', r.indiceMasaCorporal);
  push('Glucosa (mg/dL)', r.glucosaMgDl);
  push('HbA1c (%)', r.hba1cPorcentaje);
  return rows;
});

const otrasGraficasIncluidasVista = computed(() => {
  const list = fm.value?.graficasIncluidas ?? [];
  return list.filter(
    (g) =>
      g !== 'Glucosa / HbA1c' &&
      g !== 'Tensión arterial' &&
      g !== 'Peso / IMC' &&
      g !== 'Lípidos',
  );
});

const resumenCondicionesBloques = computed(() => {
  const rc = fm.value?.resumenCondiciones;
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

const timelineSeguimientoItems = computed(() =>
  buildTimelineSeguimientoItems(fm.value?.eventosConcentrados, fm.value?.seguimientosProgramadosConcentrados),
);

/** Fuerza remontaje de Chart.js cuando llegan o cambian eventos concentrados (evita estado vacío tras carrera de carga). */
const graficasEventosKey = computed(() => {
  const ev = fm.value?.eventosConcentrados;
  if (!Array.isArray(ev) || !ev.length) return '0';
  return ev
    .map((e) => `${e?.fechaControl ?? ''}|${e?.idEventoOriginal ?? ''}`)
    .join(';');
});

const evolucionGlucemicaSeries = computed(() =>
  buildEvolucionGlucemicaSeries(fm.value?.eventosConcentrados),
);

const evolucionGlucemicaSuficiente = computed(() => evolucionGlucemicaSeries.value.sufficientData);

const evolucionGlucemicaChartData = computed(() => {
  const s = evolucionGlucemicaSeries.value;
  if (!s.sufficientData) {
    return { labels: [], datasets: [] };
  }
  const { labels, glucosa, hba1c } = s;
  const len = labels.length;
  const fill = (v) => Array(len).fill(v);
  return {
    labels,
    datasets: [
      {
        label: 'Glucosa',
        data: [...glucosa],
        yAxisID: 'y',
        spanGaps: false,
        tension: 0.25,
        borderColor: 'rgba(234, 88, 12, 0.95)',
        backgroundColor: 'rgba(254, 215, 170, 0.12)',
        pointBackgroundColor: '#ea580c',
        pointBorderColor: '#9a3412',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
      {
        label: 'HbA1c',
        data: [...hba1c],
        yAxisID: 'y1',
        spanGaps: false,
        tension: 0.25,
        borderColor: 'rgba(99, 102, 241, 0.95)',
        backgroundColor: 'rgba(199, 210, 254, 0.1)',
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#3730a3',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
      {
        label: 'Ref. 100 mg/dL',
        data: fill(100),
        yAxisID: 'y',
        borderColor: ILC_CHART_REF_SLATE_STRONG,
        borderDash: [5, 5],
        borderWidth: 1,
        pointRadius: 0,
        pointStyle: 'line',
        fill: false,
        tension: 0,
      },
      {
        label: 'Ref. 126 mg/dL',
        data: fill(126),
        yAxisID: 'y',
        borderColor: ILC_CHART_REF_SLATE_SOFT,
        borderDash: [3, 4],
        borderWidth: 1,
        pointRadius: 0,
        pointStyle: 'line',
        fill: false,
        tension: 0,
      },
      {
        label: 'Ref. 5.7 %',
        data: fill(5.7),
        yAxisID: 'y1',
        borderColor: ILC_CHART_REF_SLATE_STRONG,
        borderDash: [5, 5],
        borderWidth: 1,
        pointRadius: 0,
        pointStyle: 'line',
        fill: false,
        tension: 0,
      },
      {
        label: 'Ref. 6.5 %',
        data: fill(6.5),
        yAxisID: 'y1',
        borderColor: ILC_CHART_REF_SLATE_SOFT,
        borderDash: [3, 4],
        borderWidth: 1,
        pointRadius: 0,
        pointStyle: 'line',
        fill: false,
        tension: 0,
      },
    ],
  };
});

const evolucionGlucemicaChartOptions = computed(() => {
  const s = evolucionGlucemicaSeries.value;
  const gBounds = boundsEjeGlucosa(s.glucosa);
  const hBounds = boundsEjeHbA1c(s.hba1c);
  const tickColor = isHtmlDark.value ? '#e2e8f0' : '#374151';
  const gridColor = ilcChartGridColor();

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: tickColor,
          usePointStyle: true,
          padding: 8,
          pointStyleWidth: 12,
          font: { size: 11, weight: '500' },
        },
      },
      tooltip: {
        enabled: true,
        filter: (tooltipItem) => tooltipItem.datasetIndex < 2,
        backgroundColor: isHtmlDark.value ? 'rgba(15, 23, 42, 0.95)' : 'rgba(0, 0, 0, 0.75)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: isHtmlDark.value ? '#64748b' : '#374151',
        borderWidth: 1,
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed.y;
            if (v == null || !Number.isFinite(v)) return `${ctx.dataset.label ?? ''}: —`;
            const isHb = ctx.dataset.label === 'HbA1c';
            return `${ctx.dataset.label ?? ''}: ${isHb ? v.toFixed(1) : Math.round(v)}${isHb ? ' %' : ' mg/dL'}`;
          },
        },
      },
      datalabels: { display: false },
    },
    scales: {
      x: {
        title: {
          display: false,
          text: 'Fecha de control',
          font: { size: 11, weight: '600' },
          color: tickColor,
        },
        grid: { display: true, color: gridColor, lineWidth: 1 },
        border: { display: true, color: isHtmlDark.value ? '#94a3b8' : '#64748b', width: 1 },
        ticks: {
          color: tickColor,
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        type: 'linear',
        position: 'left',
        min: gBounds.min,
        max: gBounds.max,
        title: {
          display: true,
          text: 'Glucosa (mg/dL)',
          font: { size: 11, weight: '600' },
          color: tickColor,
        },
        grid: { display: true, color: gridColor, lineWidth: 1 },
        border: { display: true, color: isHtmlDark.value ? '#94a3b8' : '#64748b', width: 1 },
        ticks: {
          color: tickColor,
          font: { size: 10 },
          callback: (value) => `${Math.round(Number(value))}`,
        },
      },
      y1: {
        type: 'linear',
        position: 'right',
        min: hBounds.min,
        max: hBounds.max,
        title: {
          display: true,
          text: 'HbA1c (%)',
          font: { size: 11, weight: '600' },
          color: tickColor,
        },
        grid: { display: false, drawOnChartArea: false },
        border: { display: true, color: isHtmlDark.value ? '#94a3b8' : '#64748b', width: 1 },
        ticks: {
          color: tickColor,
          font: { size: 10 },
          callback: (value) => Number(value).toFixed(1),
        },
      },
    },
    elements: {
      line: { borderWidth: 2 },
      point: { borderWidth: 2 },
    },
  };
});

const evolucionPresionArterialSeries = computed(() =>
  buildEvolucionPresionArterialSeries(fm.value?.eventosConcentrados),
);

const evolucionPresionArterialSuficiente = computed(
  () => evolucionPresionArterialSeries.value.sufficientData,
);

const evolucionPresionArterialChartData = computed(() => {
  const s = evolucionPresionArterialSeries.value;
  if (!s.sufficientData) {
    return { labels: [], datasets: [] };
  }
  const { labels, sistolica, diastolica } = s;
  const len = labels.length;
  const fill = (v) => Array(len).fill(v);
  return {
    labels,
    datasets: [
      {
        label: 'Sistólica',
        data: [...sistolica],
        spanGaps: false,
        tension: 0.25,
        borderColor: 'rgba(220, 38, 38, 0.92)',
        backgroundColor: 'rgba(254, 202, 202, 0.12)',
        pointBackgroundColor: '#dc2626',
        pointBorderColor: '#991b1b',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
      {
        label: 'Diastólica',
        data: [...diastolica],
        spanGaps: false,
        tension: 0.25,
        borderColor: 'rgba(79, 70, 229, 0.92)',
        backgroundColor: 'rgba(199, 210, 254, 0.1)',
        pointBackgroundColor: '#4f46e5',
        pointBorderColor: '#312e81',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
      {
        label: 'Ref. 140 mmHg',
        data: fill(140),
        borderColor: ILC_CHART_REF_SLATE_STRONG,
        borderDash: [5, 5],
        borderWidth: 1,
        pointRadius: 0,
        pointStyle: 'line',
        fill: false,
        tension: 0,
      },
      {
        label: 'Ref. 90 mmHg',
        data: fill(90),
        borderColor: ILC_CHART_REF_SLATE_SOFT,
        borderDash: [3, 4],
        borderWidth: 1,
        pointRadius: 0,
        pointStyle: 'line',
        fill: false,
        tension: 0,
      },
    ],
  };
});

const evolucionPresionArterialChartOptions = computed(() => {
  const s = evolucionPresionArterialSeries.value;
  const yBounds = boundsEjePresionArterialMmHg(s.sistolica, s.diastolica);
  const tickColor = isHtmlDark.value ? '#e2e8f0' : '#374151';
  const gridColor = ilcChartGridColor();

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: tickColor,
          usePointStyle: true,
          padding: 8,
          pointStyleWidth: 12,
          font: { size: 11, weight: '500' },
        },
      },
      tooltip: {
        enabled: true,
        filter: (tooltipItem) => tooltipItem.datasetIndex < 2,
        backgroundColor: isHtmlDark.value ? 'rgba(15, 23, 42, 0.95)' : 'rgba(0, 0, 0, 0.75)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: isHtmlDark.value ? '#64748b' : '#374151',
        borderWidth: 1,
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed.y;
            if (v == null || !Number.isFinite(v)) return `${ctx.dataset.label ?? ''}: —`;
            return `${ctx.dataset.label ?? ''}: ${Math.round(v)} mmHg`;
          },
        },
      },
      datalabels: { display: false },
    },
    scales: {
      x: {
        title: {
          display: false,
          text: 'Fecha de control',
          font: { size: 11, weight: '600' },
          color: tickColor,
        },
        grid: { display: true, color: gridColor, lineWidth: 1 },
        border: { display: true, color: isHtmlDark.value ? '#94a3b8' : '#64748b', width: 1 },
        ticks: {
          color: tickColor,
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        type: 'linear',
        position: 'left',
        min: yBounds.min,
        max: yBounds.max,
        title: {
          display: true,
          text: 'Presión (mmHg)',
          font: { size: 11, weight: '600' },
          color: tickColor,
        },
        grid: { display: true, color: gridColor, lineWidth: 1 },
        border: { display: true, color: isHtmlDark.value ? '#94a3b8' : '#64748b', width: 1 },
        ticks: {
          color: tickColor,
          font: { size: 10 },
          callback: (value) => `${Math.round(Number(value))}`,
        },
      },
    },
    elements: {
      line: { borderWidth: 2 },
      point: { borderWidth: 2 },
    },
  };
});

const evolucionPesoImcSeries = computed(() =>
  buildEvolucionPesoImcSeries(fm.value?.eventosConcentrados),
);

const evolucionPesoImcSuficiente = computed(() => evolucionPesoImcSeries.value.sufficientData);

const evolucionPesoImcChartData = computed(() => {
  const s = evolucionPesoImcSeries.value;
  if (!s.sufficientData) {
    return { labels: [], datasets: [] };
  }
  const { labels, peso, imc } = s;
  const len = labels.length;
  const fill = (v) => Array(len).fill(v);
  return {
    labels,
    datasets: [
      {
        label: 'Peso',
        data: [...peso],
        yAxisID: 'y',
        spanGaps: false,
        tension: 0.25,
        borderColor: 'rgba(13, 148, 136, 0.88)',
        backgroundColor: 'rgba(153, 246, 228, 0.14)',
        pointBackgroundColor: '#0d9488',
        pointBorderColor: '#115e59',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
      {
        label: 'IMC',
        data: [...imc],
        yAxisID: 'y1',
        spanGaps: false,
        tension: 0.25,
        borderColor: 'rgba(124, 58, 237, 0.82)',
        backgroundColor: 'rgba(237, 233, 254, 0.12)',
        pointBackgroundColor: '#7c3aed',
        pointBorderColor: '#5b21b6',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
      {
        label: 'Ref. IMC 30 (Ob. I)',
        data: fill(30),
        yAxisID: 'y1',
        borderColor: ILC_CHART_REF_SLATE_STRONG,
        borderDash: [5, 5],
        borderWidth: 1,
        pointRadius: 0,
        pointStyle: 'line',
        fill: false,
        tension: 0,
      },
      {
        label: 'Ref. IMC 35 (Ob. II)',
        data: fill(35),
        yAxisID: 'y1',
        borderColor: ILC_CHART_REF_SLATE_SOFT,
        borderDash: [3, 4],
        borderWidth: 1,
        pointRadius: 0,
        pointStyle: 'line',
        fill: false,
        tension: 0,
      },
      {
        label: 'Ref. IMC 40 (Ob. III)',
        data: fill(40),
        yAxisID: 'y1',
        borderColor: ILC_CHART_REF_SLATE_STRONG,
        borderDash: [5, 5],
        borderWidth: 1,
        pointRadius: 0,
        pointStyle: 'line',
        fill: false,
        tension: 0,
      },
    ],
  };
});

const evolucionPesoImcChartOptions = computed(() => {
  const s = evolucionPesoImcSeries.value;
  const pBounds = boundsEjePesoKg(s.peso);
  const iBounds = boundsEjeImc(s.imc);
  const tickColor = isHtmlDark.value ? '#e2e8f0' : '#374151';
  const gridColor = ilcChartGridColor();

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: tickColor,
          usePointStyle: true,
          padding: 8,
          pointStyleWidth: 12,
          font: { size: 11, weight: '500' },
        },
      },
      tooltip: {
        enabled: true,
        filter: (tooltipItem) => tooltipItem.datasetIndex < 2,
        backgroundColor: isHtmlDark.value ? 'rgba(15, 23, 42, 0.95)' : 'rgba(0, 0, 0, 0.75)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: isHtmlDark.value ? '#64748b' : '#374151',
        borderWidth: 1,
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed.y;
            if (v == null || !Number.isFinite(v)) return `${ctx.dataset.label ?? ''}: —`;
            const isPeso = ctx.dataset.label === 'Peso';
            return `${ctx.dataset.label ?? ''}: ${Number(v).toFixed(1)}${isPeso ? ' kg' : ''}`;
          },
        },
      },
      datalabels: { display: false },
    },
    scales: {
      x: {
        title: {
          display: false,
          text: 'Fecha de control',
          font: { size: 11, weight: '600' },
          color: tickColor,
        },
        grid: { display: true, color: gridColor, lineWidth: 1 },
        border: { display: true, color: isHtmlDark.value ? '#94a3b8' : '#64748b', width: 1 },
        ticks: {
          color: tickColor,
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        type: 'linear',
        position: 'left',
        min: pBounds.min,
        max: pBounds.max,
        title: {
          display: true,
          text: 'Peso (kg)',
          font: { size: 11, weight: '600' },
          color: tickColor,
        },
        grid: { display: true, color: gridColor, lineWidth: 1 },
        border: { display: true, color: isHtmlDark.value ? '#94a3b8' : '#64748b', width: 1 },
        ticks: {
          color: tickColor,
          font: { size: 10 },
          callback: (value) => Number(value).toFixed(1),
        },
      },
      y1: {
        type: 'linear',
        position: 'right',
        min: iBounds.min,
        max: iBounds.max,
        title: {
          display: true,
          text: 'IMC',
          font: { size: 11, weight: '600' },
          color: tickColor,
        },
        grid: { display: false, drawOnChartArea: false },
        border: { display: true, color: isHtmlDark.value ? '#94a3b8' : '#64748b', width: 1 },
        ticks: {
          color: tickColor,
          font: { size: 10 },
          callback: (value) => Number(value).toFixed(1),
        },
      },
    },
    elements: {
      line: { borderWidth: 2 },
      point: { borderWidth: 2 },
    },
  };
});

const evolucionPerfilLipidicoSeries = computed(() =>
  buildEvolucionPerfilLipidicoSeries(fm.value?.eventosConcentrados),
);

const evolucionPerfilLipidicoSuficiente = computed(
  () => evolucionPerfilLipidicoSeries.value.sufficientData,
);

const evolucionPerfilLipidicoChartData = computed(() => {
  const s = evolucionPerfilLipidicoSeries.value;
  if (!s.sufficientData) {
    return { labels: [], datasets: [] };
  }
  const { labels, colesterolTotal, ldl, hdl, trigliceridos } = s;
  return {
    labels,
    datasets: [
      {
        label: 'Colesterol total',
        data: [...colesterolTotal],
        spanGaps: false,
        tension: 0.25,
        borderColor: 'rgba(71, 85, 105, 0.88)',
        backgroundColor: 'rgba(226, 232, 240, 0.12)',
        pointBackgroundColor: '#475569',
        pointBorderColor: '#334155',
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 1.75,
      },
      {
        label: 'LDL',
        data: [...ldl],
        spanGaps: false,
        tension: 0.25,
        borderColor: 'rgba(185, 80, 80, 0.88)',
        backgroundColor: 'rgba(254, 226, 226, 0.1)',
        pointBackgroundColor: '#b45353',
        pointBorderColor: '#7f1d1d',
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 1.75,
      },
      {
        label: 'HDL',
        data: [...hdl],
        spanGaps: false,
        tension: 0.25,
        borderColor: 'rgba(21, 128, 106, 0.88)',
        backgroundColor: 'rgba(167, 243, 208, 0.1)',
        pointBackgroundColor: '#158076',
        pointBorderColor: '#134e4a',
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 1.75,
      },
      {
        label: 'Triglicéridos',
        data: [...trigliceridos],
        spanGaps: false,
        tension: 0.25,
        borderColor: 'rgba(194, 120, 50, 0.88)',
        backgroundColor: 'rgba(254, 243, 199, 0.12)',
        pointBackgroundColor: '#b45309',
        pointBorderColor: '#7c2d12',
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 1.75,
      },
    ],
  };
});

const evolucionPerfilLipidicoChartOptions = computed(() => {
  const s = evolucionPerfilLipidicoSeries.value;
  const yBounds = boundsEjePerfilLipidicoMgDl(
    s.colesterolTotal,
    s.ldl,
    s.hdl,
    s.trigliceridos,
  );
  const tickColor = isHtmlDark.value ? '#e2e8f0' : '#374151';
  const gridColor = ilcChartGridColor();

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: tickColor,
          usePointStyle: true,
          padding: 6,
          pointStyleWidth: 10,
          font: { size: 10, weight: '500' },
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: isHtmlDark.value ? 'rgba(15, 23, 42, 0.95)' : 'rgba(0, 0, 0, 0.75)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: isHtmlDark.value ? '#64748b' : '#374151',
        borderWidth: 1,
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed.y;
            if (v == null || !Number.isFinite(v)) return `${ctx.dataset.label ?? ''}: —`;
            return `${ctx.dataset.label ?? ''}: ${Math.round(v)} mg/dL`;
          },
        },
      },
      datalabels: { display: false },
    },
    scales: {
      x: {
        title: {
          display: false,
          text: 'Fecha de control',
          font: { size: 11, weight: '600' },
          color: tickColor,
        },
        grid: { display: true, color: gridColor, lineWidth: 1 },
        border: { display: true, color: isHtmlDark.value ? '#94a3b8' : '#64748b', width: 1 },
        ticks: {
          color: tickColor,
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        type: 'linear',
        position: 'left',
        min: yBounds.min,
        max: yBounds.max,
        title: {
          display: true,
          text: 'mg/dL',
          font: { size: 11, weight: '600' },
          color: tickColor,
        },
        grid: { display: true, color: gridColor, lineWidth: 1 },
        border: { display: true, color: isHtmlDark.value ? '#94a3b8' : '#64748b', width: 1 },
        ticks: {
          color: tickColor,
          font: { size: 10 },
          maxTicksLimit: 7,
          callback: (value) => `${Math.round(Number(value))}`,
        },
      },
    },
    elements: {
      line: { borderWidth: 1.75 },
      point: { borderWidth: 1.5, radius: 3 },
    },
  };
});

async function generarYGuardarGraficaGlucemia() {
  await nextTick();
  if (!evolucionGlucemicaSuficiente.value) {
    formData.formDataInformeLongitudinalCardiometabolico.graficaEvolucionGlucemica = '';
    return;
  }
  if (!refGraficaEvolucionGlucemica.value) return;
  try {
    const chartConfig = {
      type: 'line',
      data: evolucionGlucemicaChartData.value,
      options: evolucionGlucemicaChartOptions.value,
    };
    const graficaBase64 = exportarGraficaAltaResolucion(chartConfig, 900, 320);
    formData.formDataInformeLongitudinalCardiometabolico.graficaEvolucionGlucemica = graficaBase64;
  } catch (error) {
    console.error('Error al generar gráfica evolución glucémica:', error);
  }
}

async function generarYGuardarGraficaPresionArterial() {
  await nextTick();
  if (!evolucionPresionArterialSuficiente.value) {
    formData.formDataInformeLongitudinalCardiometabolico.graficaEvolucionPresionArterial = '';
    return;
  }
  if (!refGraficaEvolucionPresionArterial.value) return;
  try {
    const chartConfig = {
      type: 'line',
      data: evolucionPresionArterialChartData.value,
      options: evolucionPresionArterialChartOptions.value,
    };
    const graficaBase64 = exportarGraficaAltaResolucion(chartConfig, 900, 320);
    formData.formDataInformeLongitudinalCardiometabolico.graficaEvolucionPresionArterial = graficaBase64;
  } catch (error) {
    console.error('Error al generar gráfica evolución presión arterial:', error);
  }
}

async function generarYGuardarGraficaPesoImc() {
  await nextTick();
  if (!evolucionPesoImcSuficiente.value) {
    formData.formDataInformeLongitudinalCardiometabolico.graficaEvolucionPesoImc = '';
    return;
  }
  if (!refGraficaEvolucionPesoImc.value) return;
  try {
    const chartConfig = {
      type: 'line',
      data: evolucionPesoImcChartData.value,
      options: evolucionPesoImcChartOptions.value,
    };
    const graficaBase64 = exportarGraficaAltaResolucion(chartConfig, 900, 320);
    formData.formDataInformeLongitudinalCardiometabolico.graficaEvolucionPesoImc = graficaBase64;
  } catch (error) {
    console.error('Error al generar gráfica evolución peso e IMC:', error);
  }
}

async function generarYGuardarGraficaPerfilLipidico() {
  await nextTick();
  if (!evolucionPerfilLipidicoSuficiente.value) {
    formData.formDataInformeLongitudinalCardiometabolico.graficaEvolucionPerfilLipidico = '';
    return;
  }
  if (!refGraficaEvolucionPerfilLipidico.value) return;
  try {
    const chartConfig = {
      type: 'line',
      data: evolucionPerfilLipidicoChartData.value,
      options: evolucionPerfilLipidicoChartOptions.value,
    };
    const graficaBase64 = exportarGraficaAltaResolucion(chartConfig, 900, 320);
    formData.formDataInformeLongitudinalCardiometabolico.graficaEvolucionPerfilLipidico = graficaBase64;
  } catch (error) {
    console.error('Error al generar gráfica evolución perfil lipídico:', error);
  }
}

async function programarRegeneracionGraficasIlc() {
  await nextTick();
  requestAnimationFrame(() => {
    generarYGuardarGraficaGlucemia();
    generarYGuardarGraficaPresionArterial();
    generarYGuardarGraficaPesoImc();
    generarYGuardarGraficaPerfilLipidico();
  });
}

onMounted(() => {
  aplicarRefrescoEventosConcentradosDesdeExpediente();
  programarRegeneracionGraficasIlc();
});

watch([graficasEventosKey, isHtmlDark], () => {
  programarRegeneracionGraficasIlc();
});

defineExpose({
  refGraficaEvolucionGlucemica,
  refGraficaEvolucionPresionArterial,
  refGraficaEvolucionPesoImc,
  refGraficaEvolucionPerfilLipidico,
  evolucionGlucemicaChartData,
  evolucionGlucemicaChartOptions,
  evolucionPresionArterialChartData,
  evolucionPresionArterialChartOptions,
  evolucionPesoImcChartData,
  evolucionPesoImcChartOptions,
  evolucionPerfilLipidicoChartData,
  evolucionPerfilLipidicoChartOptions,
});
</script>

<template>
  <div
    class="visualizador-historia-otologica flex flex-wrap justify-start gap-4 border-shadow w-full text-left rounded-lg p-4 sm:p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto"
  >
    <!-- Encabezado -->
    <div class="w-full space-y-1.5 border-b border-slate-200 pb-3">
      <p class="text-center text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">
        {{ empresas.currentEmpresa.nombreComercial }}
      </p>
      <p class="text-center text-sm sm:text-base font-medium text-slate-600">
        Informe longitudinal cardiometabólico
      </p>
      <div
        class="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-600 cursor-pointer"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md px-2 py-1': steps.currentStep === 1 }"
        @click="goToStep(1)"
      >
        <span>
          Fecha del informe:
          <span class="font-medium text-slate-800">{{ fechaInformeFmt }}</span>
        </span>
        <span class="hidden sm:inline text-slate-300">|</span>
        <span>
          Periodo evaluado:
          <span class="font-medium text-slate-800">{{ periodoFmt }}</span>
        </span>
      </div>
    </div>

    <!-- Datos trabajador -->
    <!-- Trabajador -->
    <div class="w-full">
      <table class="table-auto w-full border-collapse border border-gray-200">
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              NOMBRE
            </td>
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ formatNombreCompleto(trabajadores.currentTrabajador) }}
            </td>
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              NACIMIENTO
            </td>
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ convertirFechaISOaDDMMYYYY(trabajadores.currentTrabajador?.fechaNacimiento) }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ESCOLARIDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador?.escolaridad ?? '' }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              EDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{
                trabajadores.currentTrabajador?.fechaNacimiento
                  ? calcularEdad(trabajadores.currentTrabajador.fechaNacimiento)
                  : ''
              }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              PUESTO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador?.puesto ?? '' }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              SEXO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador?.sexo ?? '' }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ANTIGUEDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ calcularAntiguedad(trabajadores.currentTrabajador?.fechaIngreso ?? '') }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              TELÉFONO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador?.telefono ?? '' }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ESTADO CIVIL
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador?.estadoCivil ?? '' }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              NUM. EMPLEADO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador?.numeroEmpleado || 'No asignado' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="w-full space-y-4 pt-1.5 text-sm sm:text-base">
      <!-- Interpretación clínica (paso 2) -->
      <div
        class="w-full cursor-pointer rounded-lg ring-1 ring-slate-200/70 bg-white p-3 sm:p-4 space-y-4"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 2 }"
        @click="goToStep(2)"
      >
        <div class="grid w-full grid-cols-1 md:grid-cols-2 gap-3">
          <div :class="estiloCajaRiesgo.box">
            <p :class="estiloCajaRiesgo.label">Riesgo longitudinal</p>
            <p :class="estiloCajaRiesgo.valor">{{ riesgoLongitudinalLegible }}</p>
          </div>
          <div :class="estiloCajaTrayectoria.box">
            <p :class="estiloCajaTrayectoria.label">Trayectoria del periodo</p>
            <p :class="estiloCajaTrayectoria.valor">{{ trayectoriaLongitudinalLegible }}</p>
          </div>
        </div>

        <section v-if="fm.interpretacionRiesgoLongitudinal" class="w-full">
          <h4 class="text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1">
            Interpretación del riesgo
          </h4>
          <p
            class="text-xs sm:text-sm whitespace-pre-wrap text-slate-800 leading-snug rounded-md border border-slate-200/80 bg-slate-50/40 px-3 py-2"
          >
            {{ fm.interpretacionRiesgoLongitudinal }}
          </p>
        </section>

        <section v-if="filasEvolucionVista.length">
          <h4 class="text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-1.5">
            Evolución principal / tendencia en indicadores
          </h4>
          <div class="rounded-md overflow-hidden border border-slate-200 divide-y divide-slate-200 text-xs">
            <div
              class="grid grid-cols-12 gap-1.5 px-2 py-1.5 bg-slate-100 font-semibold text-slate-600 uppercase tracking-wide"
            >
              <div class="col-span-4 sm:col-span-3">Indicador</div>
              <div class="col-span-4 sm:col-span-3">Tendencia</div>
              <div class="col-span-4 sm:col-span-6">Valor inicial → Valor final (Diferencia absoluta)</div>
            </div>
            <div
              v-for="(row, i) in filasEvolucionVista"
              :key="i"
              class="grid grid-cols-12 gap-1.5 px-2 py-2 odd:bg-white even:bg-slate-50/40"
            >
              <div class="col-span-4 sm:col-span-3 font-semibold text-slate-900 leading-snug">
                {{ row.label }}
              </div>
              <div class="col-span-4 sm:col-span-3 text-slate-800">{{ row.tendencia }}</div>
              <div class="col-span-4 sm:col-span-6 text-slate-500 tabular-nums leading-snug">
                {{ row.detalle }}
              </div>
            </div>
          </div>
        </section>

        <section class="w-full">
          <h4 class="text-[11px] font-semibold text-slate-600 mb-0.5 leading-tight">
            EVOLUCIÓN GLUCÉMICA
          </h4>
          <p class="text-[11px] text-slate-500 mb-2 mt-0.5 leading-tight">
            Glucosa y HbA1c durante el periodo evaluado
          </p>
          <p v-if="!evolucionGlucemicaSuficiente" class="text-xs text-slate-500 italic py-0.5">
            {{ MSJ_GRAFICA_GLUCEMIA_INSUFICIENTE }}
          </p>
          <div
            v-else
            :key="`glucemia-${graficasEventosKey}`"
            class="w-full max-w-full rounded-md border border-slate-200 bg-white p-2 min-h-[220px]"
          >
            <GraficaEvolucionGlucemica
              ref="refGraficaEvolucionGlucemica"
              :data="evolucionGlucemicaChartData"
              :options="evolucionGlucemicaChartOptions"
            />
          </div>
        </section>

        <section class="w-full">
          <h4 class="text-[11px] font-semibold text-slate-600 mb-0.5 leading-tight">EVOLUCIÓN DE PRESIÓN ARTERIAL</h4>
          <p class="text-[11px] text-slate-500 mb-2 mt-0.5 leading-tight">
            Presión sistólica y diastólica durante el periodo evaluado
          </p>
          <p v-if="!evolucionPresionArterialSuficiente" class="text-xs text-slate-500 italic py-0.5">
            {{ MSJ_GRAFICA_PRESION_ARTERIAL_INSUFICIENTE }}
          </p>
          <div
            v-else
            :key="`presion-${graficasEventosKey}`"
            class="w-full max-w-full rounded-md border border-slate-200 bg-white p-2 min-h-[220px]"
          >
            <GraficaEvolucionPresionArterial
              ref="refGraficaEvolucionPresionArterial"
              :data="evolucionPresionArterialChartData"
              :options="evolucionPresionArterialChartOptions"
            />
          </div>
        </section>

        <section class="w-full">
          <h4 class="text-[11px] font-semibold text-slate-600 mb-0.5 leading-tight">EVOLUCIÓN DE PESO E IMC</h4>
          <p class="text-[11px] text-slate-500 mb-2 mt-0.5 leading-tight">
            Cambios de peso corporal e índice de masa corporal durante el periodo evaluado
          </p>
          <p v-if="!evolucionPesoImcSuficiente" class="text-xs text-slate-500 italic py-0.5">
            {{ MSJ_GRAFICA_PESO_IMC_INSUFICIENTE }}
          </p>
          <div
            v-else
            :key="`peso-imc-${graficasEventosKey}`"
            class="w-full max-w-full rounded-md border border-slate-200 bg-white p-2 min-h-[220px]"
          >
            <GraficaEvolucionPesoImc
              ref="refGraficaEvolucionPesoImc"
              :data="evolucionPesoImcChartData"
              :options="evolucionPesoImcChartOptions"
            />
          </div>
        </section>

        <section class="w-full">
          <h4 class="text-[11px] font-semibold text-slate-600 mb-0.5 leading-tight">EVOLUCIÓN DEL PERFIL LIPÍDICO</h4>
          <p class="text-[11px] text-slate-500 mb-2 mt-0.5 leading-tight">
            Colesterol total, LDL, HDL y triglicéridos durante el periodo evaluado
          </p>
          <p v-if="!evolucionPerfilLipidicoSuficiente" class="text-xs text-slate-500 italic py-0.5">
            {{ MSJ_GRAFICA_PERFIL_LIPIDICO_INSUFICIENTE }}
          </p>
          <div
            v-else
            :key="`lipidos-${graficasEventosKey}`"
            class="w-full max-w-full rounded-md border border-slate-200 bg-white p-2 min-h-[220px]"
          >
            <GraficaEvolucionPerfilLipidico
              ref="refGraficaEvolucionPerfilLipidico"
              :data="evolucionPerfilLipidicoChartData"
              :options="evolucionPerfilLipidicoChartOptions"
            />
          </div>
        </section>

        <section v-if="fm.conclusionClinica && String(fm.conclusionClinica).trim()">
          <h4 class="text-[11px] font-semibold text-slate-900 mb-1">CONCLUSIÓN CLÍNICA</h4>
          <p
            class="text-xs sm:text-sm whitespace-pre-wrap text-slate-800 leading-snug rounded-md border border-slate-200 bg-white px-3 py-2 max-w-3xl"
          >
            {{ fm.conclusionClinica }}
          </p>
        </section>

        <section v-if="fm.resumenLongitudinal && String(fm.resumenLongitudinal).trim()">
          <h4 class="text-[11px] font-semibold text-slate-700 mb-1 leading-tight">RESUMEN LONGITUDINAL</h4>
          <p
            class="text-xs sm:text-sm whitespace-pre-wrap text-slate-800 leading-snug rounded-md border border-slate-100 bg-slate-50/50 px-3 py-2 max-w-3xl"
          >
            {{ fm.resumenLongitudinal }}
          </p>
        </section>

        <section v-if="resumenCondicionesBloques.length" class="space-y-2">
          <h4 class="text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-0.5 leading-tight">
            ESTADO POR CONDICIÓN
          </h4>
          <div class="grid gap-2 sm:grid-cols-2">
            <article
              v-for="(b, i) in resumenCondicionesBloques"
              :key="i"
              class="rounded-md border border-slate-100 bg-slate-50/30 p-2.5 text-left"
            >
              <h5 class="text-xs font-semibold text-slate-900 mb-1">{{ b.titulo }}</h5>
              <p class="text-xs text-slate-700 leading-snug">{{ b.texto }}</p>
            </article>
          </div>
        </section>

        <section class="w-full rounded-md border border-slate-200/80 bg-slate-50/30 px-3 py-2.5">
          <h4 class="text-[11px] font-semibold text-slate-700 mb-0.5 leading-tight">CONTINUIDAD DEL SEGUIMIENTO</h4>
          <p class="text-[11px] text-slate-500 mb-2 mt-0.5 leading-tight">
            Hitos operativos y controles clínicos en el periodo (orden cronológico)
          </p>
          <TimelineSeguimientoInformeILC
            :items="timelineSeguimientoItems"
            :mensaje-vacio="MSJ_TIMELINE_SEGUIMIENTO_VACIA"
          />
        </section>

        <div
          class="w-full rounded-md bg-slate-50/90 text-slate-600 text-xs px-3 py-2.5 border border-slate-100 hover:border-slate-200/80 transition-colors"
        >
          <h3 class="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Seguimiento operativo</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
            <div :class="estiloCajaAsistencia.box">
              <p :class="estiloCajaAsistencia.label">% de asistencia</p>
              <p :class="estiloCajaAsistencia.valor">{{ porcentajeAsistenciaLegible }}</p>
            </div>
            <div :class="estiloCajaSeguimiento.box">
              <p :class="estiloCajaSeguimiento.label">Consistencia del seguimiento</p>
              <p :class="estiloCajaSeguimiento.valor">{{ consistenciaSeguimientoLegible }}</p>
            </div>
          </div>
          <dl class="space-y-1.5 text-xs">
            <div class="flex flex-wrap gap-x-2 gap-y-0.5">
              <dt class="text-slate-500 shrink-0">Eventos / inasistencias / cancelaciones</dt>
              <dd class="font-medium tabular-nums text-slate-700">
                {{ texto(fm.numeroSeguimientosRealizados ?? fm.numeroEventosIncluidos) }} /
                {{ texto(fm.numeroInasistencias) }} /
                {{ texto(fm.numeroCancelaciones) }}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Evidencia clínica de soporte -->
      <div
        v-if="mostrarEvidenciaClinicaSoporte"
        class="w-full cursor-pointer rounded-lg bg-slate-50/60 text-slate-600 px-3 py-2.5 ring-1 ring-slate-200/60 space-y-3"
        :class="{
          'outline outline-2 outline-offset-2 outline-yellow-500':
            steps.currentStep === 1 || steps.currentStep === 2,
        }"
        @click="goToStep(steps.currentStep === 2 ? 2 : 1)"
      >
        <div class="space-y-1">
          <h3 class="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-0 leading-tight">
            Contexto terapéutico
          </h3>
          <ul
            v-if="mostrarContextoTerapeutico"
            class="list-disc list-inside text-xs text-slate-600 leading-snug space-y-0.5 -mt-0.5"
            @click.stop="goToStep(2)"
          >
            <li v-for="(linea, i) in contextoTerapeuticoVista" :key="`ctx-${i}`">{{ linea }}</li>
          </ul>
        </div>

        <div v-if="mostrarTratamientoPeriodo" class="space-y-1.5">
          <h4 class="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-0 leading-tight">
            Tratamiento registrado durante el periodo
          </h4>
          <div
            v-for="(grupo, gi) in gruposTratamientoPeriodoVista"
            :key="`trat-grupo-${gi}`"
            :class="
              grupo.esFila
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-1.5'
                : 'w-full'
            "
            @click.stop="goToStep(1)"
          >
            <div
              v-for="(celda, ci) in grupo.celdas"
              :key="`trat-${celda.fechaInicio}-${celda.fechaFin}-${ci}`"
              class="min-w-0 rounded border border-slate-200/80 bg-white/60 px-2.5 py-2.5"
            >
              <p class="text-[11px] font-semibold text-slate-700 leading-tight mb-0.5">
                {{ celda.fechaLabel }}
              </p>
              <p
                v-for="(med, mi) in celda.medicamentos"
                :key="`med-${gi}-${ci}-${mi}`"
                class="text-[11px] text-slate-600 leading-snug break-words"
              >
                · {{ med }}
              </p>
              <p
                v-if="celda.medicamentosOmitidos > 0"
                class="text-[10px] text-slate-500 italic leading-snug break-words"
              >
                +{{ celda.medicamentosOmitidos }} más (lista larga en origen)
              </p>
            </div>
          </div>
        </div>

        <div
          v-if="(fm.eventosConcentrados || []).length"
          class="overflow-x-auto pt-1 border-t border-slate-200/70"
          @click.stop="goToStep(1)"
        >
          <h3 class="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Evidencia clínica de soporte
          </h3>
          <table class="w-full table-fixed text-[11px] border-collapse rounded border border-slate-200/70">
            <colgroup>
              <col v-for="n in 6" :key="`conc-col-${n}`" style="width: 16.666%" />
            </colgroup>
            <thead>
              <tr class="bg-slate-100/70">
                <th class="border-b border-slate-200 px-1.5 py-1 text-left font-medium text-slate-600 break-words">Fecha</th>
                <th class="border-b border-slate-200 px-1.5 py-1 text-left font-medium text-slate-600 break-words">TA (mmHg)</th>
                <th class="border-b border-slate-200 px-1.5 py-1 text-left font-medium text-slate-600 break-words">IMC</th>
                <th class="border-b border-slate-200 px-1.5 py-1 text-left font-medium text-slate-600 break-words">C. cintura (cm)</th>
                <th class="border-b border-slate-200 px-1.5 py-1 text-left font-medium text-slate-600 break-words">Glucosa (mg/dL)</th>
                <th class="border-b border-slate-200 px-1.5 py-1 text-left font-medium text-slate-600 break-words">HbA1c (%)</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in fm.eventosConcentrados || []"
                :key="idx"
                class="odd:bg-white even:bg-slate-50/70"
              >
                <td class="border-b border-slate-100 px-1.5 py-1 break-words">
                  {{ row.fechaControl ? formatDateDDMMYYYY(row.fechaControl) : texto(row.idEventoOriginal) }}
                </td>
                <td class="border-b border-slate-100 px-1.5 py-1 break-words">
                  {{
                    row.signosVitales?.tensionArterialSistolica != null &&
                    row.signosVitales?.tensionArterialDiastolica != null
                      ? `${row.signosVitales.tensionArterialSistolica}/${row.signosVitales.tensionArterialDiastolica}`
                      : '—'
                  }}
                </td>
                <td class="border-b border-slate-100 px-1.5 py-1 break-words">
                  {{ row.somatometria?.indiceMasaCorporal != null ? row.somatometria.indiceMasaCorporal : '—' }}
                </td>
                <td class="border-b border-slate-100 px-1.5 py-1 break-words">
                  {{
                    row.somatometria?.circunferenciaCintura != null
                      ? row.somatometria.circunferenciaCintura
                      : '—'
                  }}
                </td>
                <td class="border-b border-slate-100 px-1.5 py-1 break-words">
                  {{ row.laboratorio?.glucosaMgDl != null ? row.laboratorio.glucosaMgDl : '—' }}
                </td>
                <td class="border-b border-slate-100 px-1.5 py-1 break-words">
                  {{ row.laboratorio?.hba1cPorcentaje != null ? row.laboratorio.hba1cPorcentaje : '—' }}
                </td>
              </tr>
            </tbody>
          </table>

          <p class="mt-4 mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 leading-tight">
            Perfil lipídico 
          </p>
          <table class="min-w-full text-[11px] border-collapse rounded border border-slate-200/70">
            <thead>
              <tr class="bg-slate-100/70">
                <th class="border-b border-slate-200 px-1.5 py-1 text-left font-medium text-slate-600">Fecha</th>
                <th class="border-b border-slate-200 px-1.5 py-1 text-left font-medium text-slate-600">CT</th>
                <th class="border-b border-slate-200 px-1.5 py-1 text-left font-medium text-slate-600">LDL</th>
                <th class="border-b border-slate-200 px-1.5 py-1 text-left font-medium text-slate-600">HDL</th>
                <th class="border-b border-slate-200 px-1.5 py-1 text-left font-medium text-slate-600">TG</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in fm.eventosConcentrados || []"
                :key="`lip-${idx}`"
                class="odd:bg-white even:bg-slate-50/70"
              >
                <td class="border-b border-slate-100 px-1.5 py-1">
                  {{ row.fechaControl ? formatDateDDMMYYYY(row.fechaControl) : texto(row.idEventoOriginal) }}
                </td>
                <td class="border-b border-slate-100 px-1.5 py-1">
                  {{
                    row.laboratorio?.colesterolTotalMgDl != null ? row.laboratorio.colesterolTotalMgDl : '—'
                  }}
                </td>
                <td class="border-b border-slate-100 px-1.5 py-1">
                  {{ row.laboratorio?.ldlMgDl != null ? row.laboratorio.ldlMgDl : '—' }}
                </td>
                <td class="border-b border-slate-100 px-1.5 py-1">
                  {{ row.laboratorio?.hdlMgDl != null ? row.laboratorio.hdlMgDl : '—' }}
                </td>
                <td class="border-b border-slate-100 px-1.5 py-1">
                  {{
                    row.laboratorio?.trigliceridosMgDl != null ? row.laboratorio.trigliceridosMgDl : '—'
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
