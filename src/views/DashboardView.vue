<script setup>
import { ref, reactive, watch, computed, inject, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useUserStore } from '@/stores/user';
import { useMedicoFirmanteStore } from '@/stores/medicoFirmante';
import { useInformePersonalizacionStore } from '@/stores/informePersonalizacion';
import { clasificarPorEdadYSexo, ordenarPorGrupoEtario, contarPorCategoriaIMC, etiquetasEnfermedades, contarEnfermedadesCronicas, etiquetasAntecedentesReferidos, contarAntecedentesReferidos, etiquetasVisionSinCorreccion, calcularRequierenLentes, contarVisionSinCorreccion, calcularVistaCorregida, calcularDaltonismo, etiquetasAptitudPuesto, etiquetasAptitudPuestoTabla, contarPorAptitudPuesto, calcularCircunferenciaCintura, contarConsultasUltimos30Dias, etiquetasAgentesRiesgo, contarAgentesRiesgo, contarPorSexo, categoriasTensionArterialOrdenadas, contarPorCategoriaTensionArterial, calcularProporcionAudiometria, distribuirResultadosHBC, calcularProporcionResultadosClinicos, distribuirResultadosClinicos, distribuirResultadosClinicosPorCategoriasMultiples, mapToCategoriasMultiples, ordenTipoAlteracionEkg, ordenTipoAlteracionEspirometria, ordenTipoAlteracionRayosX, ordenTipoAlteracionAnalisisLaboratorio, etiquetasTipoAlteracionEkg, etiquetasTipoAlteracionEspirometria, etiquetasTipoAlteracionRayosX, etiquetasTipoAlteracionAnalisisLaboratorio, calcularAnilloTamizajeBipolarTEA, calcularAnilloTamizajeProdromalCPB, calcularBarrasFranjasTamizajeTLP, tablaFranjasTamizajeTLP } from '@/helpers/dashboardDataProcessor';
import GraficaBarras from '@/components/graficas/GraficaBarras.vue';
import GraficaAnillo from '@/components/graficas/GraficaAnillo.vue';
import GraficaPastel from '@/components/graficas/GraficaPastel.vue';
import { subDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import DescargarInformeDashboard from '@/components/DescargarInformeDashboard.vue';
import ModalPersonalizarInforme from '@/components/ModalPersonalizarInforme.vue';
import DashboardChartSkeleton from '@/components/skeletons/DashboardChartSkeleton.vue';
import ListaDeConteos from '@/components/graficas/ListaDeConteos.vue';
import InformesAdicionalesDashboard from '@/components/InformesAdicionalesDashboard.vue';
import { armarInforme } from '@/helpers/dashboardInformes';
import { informeTematico } from '@/helpers/dashboardInformesTematicos';
import { consultasPorMes, resumirDiagnosticos } from '@/helpers/dashboardDiagnosticos';
import InventarioAPI from '@/api/InventarioAPI';
import { useInventarioStore } from '@/stores/inventario';
import { cantidadConUnidad } from '@/helpers/inventario';
import {
  alertasDeExistencias,
  hayAlertas,
  periodoDeInventario,
  sumarConsumo,
} from '@/helpers/dashboardInventario';
import { formatearNombreFirmante } from '@/helpers/nombres';
import { SECCIONES_DE_TABLERO, SECCION_COMPARATIVO, cifrasClave, registrosDe } from '@/helpers/dashboardSecciones';
import {
  MODOS_DE_COMPARACION,
  columnasDeCentros,
  comparar,
  compararCentros,
  diagnosticoPrincipal,
  indicadoresDelPeriodo,
  periodoDeReferencia,
  textoDeCambio,
  textoDeValor,
} from '@/helpers/dashboardComparativo';
import {
  RANGOS_DE_ANTIGUEDAD,
  RANGOS_DE_EDAD,
  SEXOS,
  filtrosParaLaTabla,
  filtrosVacios,
  hayFiltros,
  parametrosDeFiltros,
  puestosDisponibles,
  textoDeFiltros,
} from '@/helpers/dashboardFiltros';

const toast = inject('toast');
const router = useRouter()
const route = useRoute();
const empresasStore = useEmpresasStore();
const centrosTrabajoStore = useCentrosTrabajoStore();
const trabajadoresStore = useTrabajadoresStore();
const medicoFirmanteStore = useMedicoFirmanteStore();
const userStore = useUserStore();
const informePersonalizacionStore = useInformePersonalizacionStore();

const nombreMedicoFirmanteDashboard = computed(() => {
  const medico = medicoFirmanteStore.medicoFirmante;
  if (!medico) return undefined;
  return formatearNombreFirmante(medico);
});

const centrosTrabajo = ref([]);
const centroSeleccionado = ref('Todos')
const tablaGruposEtarios = ref([]);
const dashboardData = ref([]);
const dashboardLoading = ref(false);
const chartRenderWave = ref(0);
const fechaInicio = ref(null)
const fechaFin = ref(null)
const periodoPredefinido = ref('')

// Filtros de población: a qué trabajadores se refieren las estadísticas
const filtrosPoblacion = reactive(filtrosVacios());
const hayFiltrosPoblacion = computed(() => hayFiltros(filtrosPoblacion));
const textoFiltrosPoblacion = computed(() => textoDeFiltros(filtrosPoblacion));
const limpiarFiltrosPoblacion = () => Object.assign(filtrosPoblacion, filtrosVacios());

// Funciones para manejar localStorage del centro seleccionado
const CENTRO_SELECCIONADO_KEY = 'centroSeleccionado';

const guardarCentroSeleccionado = (centro) => {
  try {
    localStorage.setItem(CENTRO_SELECCIONADO_KEY, centro);
  } catch (error) {
    console.warn('No se pudo guardar el centro seleccionado en localStorage:', error);
  }
};

const cargarCentroSeleccionado = () => {
  try {
    return localStorage.getItem(CENTRO_SELECCIONADO_KEY) || 'Todos';
  } catch (error) {
    console.warn('No se pudo cargar el centro seleccionado de localStorage:', error);
    return 'Todos';
  }
};

const validarCentroSeleccionado = (centroGuardado, centrosDisponibles) => {
  // Si el centro guardado es 'Todos', siempre es válido
  if (centroGuardado === 'Todos') {
    return 'Todos';
  }
  
  // Verificar si el centro guardado existe en los centros disponibles
  const centroExiste = centrosDisponibles.some(centro => centro.nombreCentro === centroGuardado);
  
  // Si existe, usarlo; si no, usar 'Todos' como fallback
  return centroExiste ? centroGuardado : 'Todos';
};

// Opciones de periodos predefinidos
const opcionesPeriodo = [
  'Hoy',
  'Esta semana', 
  'Este mes',
  'Mes anterior',
  'Últimos 3 meses',
  'Últimos 6 meses',
  'Este año',
  'Año anterior'
]

// Función para calcular fechas según el periodo seleccionado
const calcularFechasPeriodo = (periodo) => {
  const hoy = new Date()
  
  switch (periodo) {
    case 'Hoy':
      return {
        inicio: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()),
        fin: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
      }
    case 'Esta semana':
      const inicioSemana = new Date(hoy)
      inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1) // Lunes
      inicioSemana.setHours(0, 0, 0, 0)
      const finSemana = new Date(inicioSemana)
      finSemana.setDate(inicioSemana.getDate() + 6) // Domingo
      finSemana.setHours(23, 59, 59, 999)
      return { inicio: inicioSemana, fin: finSemana }
    case 'Este mes':
      return {
        inicio: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
        fin: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
      }
    case 'Mes anterior':
      return {
        inicio: new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1),
        fin: new Date(hoy.getFullYear(), hoy.getMonth(), 0)
      }
    case 'Últimos 3 meses':
      const inicio3Meses = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)
      const fin3Meses = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
      return { inicio: inicio3Meses, fin: fin3Meses }
    case 'Últimos 6 meses':
      const inicio6Meses = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1)
      const fin6Meses = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
      return { inicio: inicio6Meses, fin: fin6Meses }
    case 'Este año':
      return {
        inicio: new Date(hoy.getFullYear(), 0, 1),
        fin: new Date(hoy.getFullYear(), 11, 31)
      }
    case 'Año anterior':
      return {
        inicio: new Date(hoy.getFullYear() - 1, 0, 1),
        fin: new Date(hoy.getFullYear() - 1, 11, 31)
      }
    default:
      return { inicio: null, fin: null }
  }
}

// Función para manejar el cambio de periodo predefinido
const manejarCambioPeriodo = (periodo) => {
  if (periodo === '') {
    // Si se selecciona "Seleccionar periodo", limpiar las fechas
    fechaInicio.value = null
    fechaFin.value = null
    return
  }
  
  const fechas = calcularFechasPeriodo(periodo)
  fechaInicio.value = fechas.inicio.toISOString().split('T')[0]
  fechaFin.value = fechas.fin.toISOString().split('T')[0]
}

const vistaGruposEtarios = ref('grafico');
const vistaGruposEtariosKey = computed(() => `vista-${vistaGruposEtarios.value}`);
const vistaIMC = ref('grafico');
const vistaIMCKey = computed(() => `vista-${vistaIMC.value}`);
const vistaEnfermedades = ref('tabla');
const vistaEnfermedadesKey = computed(() => `vista-${vistaEnfermedades.value}`);
const vistaAntecedentes = ref('tabla');
const vistaAntecedentesKey = computed(() => `vista-${vistaAntecedentes.value}`);
const vistaAudiometriaDistribucion = ref('grafico');
const vistaAudiometriaDistribucionKey = computed(() => `vista-${vistaAudiometriaDistribucion.value}`);
const vistaEkgDistribucion = ref('grafico');
const vistaEkgDistribucionKey = computed(() => `vista-${vistaEkgDistribucion.value}`);
const vistaEspirometriaDistribucion = ref('grafico');
const vistaEspirometriaDistribucionKey = computed(() => `vista-${vistaEspirometriaDistribucion.value}`);
const vistaRayosXDistribucion = ref('grafico');
const vistaRayosXDistribucionKey = computed(() => `vista-${vistaRayosXDistribucion.value}`);
const vistaAnalisisLaboratorioDistribucion = ref('grafico');
const vistaAnalisisLaboratorioDistribucionKey = computed(() => `vista-${vistaAnalisisLaboratorioDistribucion.value}`);
const vistaAptitud = ref('grafico');
const vistaAptitudKey = computed(() => `vista-${vistaAptitud.value}`);
const vistaAgentes = ref('grafico');
const vistaAgentesKey = computed(() => `vista-${vistaAgentes.value}`);
const vistaTensionArterial = ref('grafico');
const vistaTensionArterialKey = computed(() => `vista-${vistaTensionArterial.value}`);
const vistaSexo = ref('grafico');
const vistaSexoKey = computed(() => `vista-${vistaSexo.value}`);
const vistaCintura = ref('grafico');
const vistaCinturaKey = computed(() => `vista-${vistaCintura.value}`);
const vistaTamizajeTLP = ref('grafico');
const vistaTamizajeTLPKey = computed(() => `vista-${vistaTamizajeTLP.value}`);

// Refs para cada gráfica
const refIMC = ref();
const refAptitud = ref();
const refLentes = ref();
const refCorregida = ref();
const refDaltonismo = ref();
const refAudiometriaProporcion = ref();
const refAudiometriaDistribucion = ref();
const refEkgProporcion = ref();
const refEkgDistribucion = ref();
const refEspirometriaProporcion = ref();
const refEspirometriaDistribucion = ref();
const refRayosXProporcion = ref();
const refRayosXDistribucion = ref();
const refAnalisisLaboratorioProporcion = ref();
const refAnalisisLaboratorioDistribucion = ref();
const refAgentes = ref();
const refGruposEtarios = ref();
const refCircunferencia = ref();
const refSexo = ref();
const refTensionArterial = ref();

const CHART_WAVE_COUNT = 4;
const CHART_WAVE_DELAY_MS = 80;

function scheduleChartRenderWaves() {
  chartRenderWave.value = 0;
  for (let wave = 1; wave <= CHART_WAVE_COUNT; wave++) {
    setTimeout(() => {
      chartRenderWave.value = wave;
    }, wave * CHART_WAVE_DELAY_MS);
  }
}

function chartWaveVisible(wave) {
  return !dashboardLoading.value && chartRenderWave.value >= wave;
}

let cargarDatosSeq = 0;
let centroDeLaRutaPendiente = true;

const cargarDatos = async (empresaId, inicio, fin) => {
  if (!empresaId) return;

  const seq = ++cargarDatosSeq;
  dashboardLoading.value = true;
  chartRenderWave.value = 0;

  try {
    const user = userStore.user;
    const medicoPromise = user?._id
      ? medicoFirmanteStore.loadMedicoFirmante(user._id)
      : Promise.resolve();

    const [empresa, centros] = await Promise.all([
      empresasStore.fetchEmpresaById(empresaId),
      centrosTrabajoStore.fetchCentrosTrabajo(empresaId),
      medicoPromise,
    ]);

    if (seq !== cargarDatosSeq) return;

    empresasStore.currentEmpresa = empresa;
    centrosTrabajo.value = centros;

    // Desde la tarjeta de un centro se llega con ese centro ya elegido; aplica una sola vez
    const centroDeLaRuta = centroDeLaRutaPendiente
      ? centros.find((c) => String(c._id) === String(route.query.centro))?.nombreCentro
      : undefined;
    centroDeLaRutaPendiente = false;
    if (centroDeLaRuta) guardarCentroSeleccionado(centroDeLaRuta);

    const centroGuardado = centroDeLaRuta ?? cargarCentroSeleccionado();
    centroSeleccionado.value = validarCentroSeleccionado(centroGuardado, centros);

    if (centros.length === 0) {
      dashboardData.value = [];
      await cargarPersonalizaciones();
      return;
    }

    const centroPrioritario =
      centroGuardado !== 'Todos'
        ? centros.find((c) => c.nombreCentro === centroGuardado)
        : null;

    const cargarDashboardCentro = (centro) =>
      trabajadoresStore.fetchDashboardData(
        empresaId,
        centro._id,
        inicio,
        fin,
        parametrosDeFiltros(filtrosPoblacion),
      );

    if (centroPrioritario) {
      const idxPrioritario = centros.findIndex((c) => c._id === centroPrioritario._id);
      const datosPrioritario = await cargarDashboardCentro(centroPrioritario);
      if (seq !== cargarDatosSeq) return;

      const datosPorCentro = new Array(centros.length);
      datosPorCentro[idxPrioritario] = datosPrioritario;
      dashboardData.value = datosPorCentro;
      dashboardLoading.value = false;
      scheduleChartRenderWaves();

      const otrosCentros = centros.filter((c) => c._id !== centroPrioritario._id);
      if (otrosCentros.length > 0) {
        const restantes = await Promise.all(otrosCentros.map(cargarDashboardCentro));
        if (seq !== cargarDatosSeq) return;
        otrosCentros.forEach((centro, i) => {
          const idx = centros.findIndex((c) => c._id === centro._id);
          datosPorCentro[idx] = restantes[i];
        });
        dashboardData.value = [...datosPorCentro];
      }
    } else {
      dashboardData.value = await Promise.all(centros.map(cargarDashboardCentro));
      if (seq !== cargarDatosSeq) return;
      scheduleChartRenderWaves();
    }

    await cargarPersonalizaciones();
  } finally {
    if (seq === cargarDatosSeq) {
      dashboardLoading.value = false;
    }
  }
};

// Función para cargar personalizaciones del informe
const cargarPersonalizaciones = async () => {
  if (!empresasStore.currentEmpresa?._id) return;
  
  try {
    const idCentroTrabajo = centroSeleccionado.value !== 'Todos' 
      ? centrosTrabajo.value.find(c => c.nombreCentro === centroSeleccionado.value)?._id 
      : undefined;
    
    await informePersonalizacionStore.loadPersonalizacionByEmpresaAndCentro(
      empresasStore.currentEmpresa._id,
      idCentroTrabajo
    );
  } catch (error) {
    console.error('Error loading personalizaciones:', error);
  }
};

// Llama la función al montar y si cambia el ID
watch(
  [() => route.params.idEmpresa, fechaInicio, fechaFin, () => JSON.stringify(filtrosPoblacion)],
  ([idEmpresa, inicio, fin]) => {
    if (inicio && fin && new Date(inicio) > new Date(fin)) return;
    cargarDatos(idEmpresa, inicio, fin);
  },
  { immediate: true }
);

// Watcher para guardar el centro seleccionado en localStorage cuando cambie
watch(centroSeleccionado, (nuevoCentro) => {
  guardarCentroSeleccionado(nuevoCentro);
  cargarPersonalizaciones(); // Recargar personalizaciones cuando cambie el centro
});

watch([fechaInicio, fechaFin], ([inicio, fin]) => {
  if (inicio && fin && new Date(inicio) > new Date(fin)) {
    toast.open({
      message: 'La fecha de inicio no puede ser mayor que la fecha final.',
      type: 'error'
    });
  }
});

const rangoInvalido = computed(() => {
  return fechaInicio.value && fechaFin.value && new Date(fechaInicio.value) > new Date(fechaFin.value);
});

const centrosTrabajoOptions = computed(() => [
  'Todos',
  ...centrosTrabajo.value.map((centro) => centro.nombreCentro),
]);

// Computed para contar total de trabajadores
const totalTrabajadores = computed(() => {
  if (!dashboardData.value.length) return 0;

  if (centroSeleccionado.value === 'Todos') {
    return dashboardData.value.reduce((total, centro) => total + (centro.grupoEtario?.[0]?.length || 0), 0);
  }

  const index = centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value);
  return dashboardData.value[index]?.grupoEtario?.[0]?.length || 0;
});

// Computed para tabla y gráfica de distribución por sexo
const tablaSexo = computed(() => {
  if (!dashboardData.value.length) return [];

  const trabajadores = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.grupoEtario[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.grupoEtario[0] || [];

  const { Masculino, Femenino } = contarPorSexo(trabajadores);
  const total = Masculino + Femenino;
  
  return [
    ['Masculino', Masculino, total > 0 ? Math.round((Masculino / total) * 100) : 0],
    ['Femenino', Femenino, total > 0 ? Math.round((Femenino / total) * 100) : 0]
  ];
});

const graficaSexoData = computed(() => {
  if (!dashboardData.value.length) return { labels: [], datasets: [] };

  const trabajadores = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.grupoEtario[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.grupoEtario[0] || [];

  const { Masculino, Femenino } = contarPorSexo(trabajadores);

  return {
    labels: ['Masculino', 'Femenino'],
    datasets: [
      {
        data: [Masculino, Femenino],
        // backgroundColor: ['#4B5563', '#9CA3AF'], // Gris oscuro, Gris claro
        // backgroundColor: ['#0ea5e9', '#d946ef'], // sky-500, fuchsia-500 
        backgroundColor: ['#0ea5e9', '#f43f5e'], // sky-500, rose-500 
        hoverOffset: 8,
      }
    ]
  };
});

// Computed para PDF: objeto con masculino, femenino y porcentaje
const tablaSexoPDF = computed(() => {
  const masculino = graficaSexoData.value.datasets[0]?.data[0] || 0;
  const femenino = graficaSexoData.value.datasets[0]?.data[1] || 0;
  const total = masculino + femenino;
  return {
    masculino,
    femenino,
    porcentaje: total > 0 ? Math.round((masculino / total) * 100) : 0
  };
});

const opcionesGraficaPastelSexo = {
  responsive: true,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: true,
      callbacks: {
        label: (context) => {
          const value = context.raw;
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
          return `${context.label}: ${value} (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      color: '#fff',
      anchor: 'center',
      align: 'center',
      offset: 20,
      font: { weight: 'bold', size: 12 },
      formatter: (value, context) => {
        const total = context.dataset.data.reduce((a, b) => a + b, 0);
        const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
        return value > 0 ? `${value} (${porcentaje}%)` : '';
      }
    }
  }
};

// Opciones específicas para PDF con contorno negro
const opcionesGraficaPastelSexoPDF = {
  responsive: true,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: true,
      callbacks: {
        label: (context) => {
          const value = context.raw;
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
          return `${context.label}: ${value} (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      color: '#fff',
      anchor: 'center',
      align: 'end',
      offset: 20,
      font: { weight: 'bold', size: 12 },
      formatter: (value, context) => {
        const total = context.dataset.data.reduce((a, b) => a + b, 0);
        const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
        return value > 0 ? `${value} (${porcentaje}%)` : '';
      }
    }
  },
  elements: {
    arc: {
      borderWidth: 1,
      borderColor: '#000000'
    }
  }
};

// Computed para tabla y gráfica de tensión arterial
const tablaTensionArterial = computed(() => {
  if (!dashboardData.value.length) return [];

  const data = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.tensionArterial?.[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.tensionArterial?.[0] || [];

  return contarPorCategoriaTensionArterial(data);
});

// Computed para tabla de distribución de audiometría
const tablaAudiometriaDistribucion = computed(() => {
  if (!dashboardData.value.length) return [];

  const datosAudio = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.audiometriaResumen || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.audiometriaResumen || [];

  return distribuirResultadosHBC(datosAudio);
});

const tablaEkgDistribucion = computed(() => {
  if (!dashboardData.value.length) return [];

  const datosEkg = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.ekg?.[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.ekg?.[0] || [];

  const distribucion = distribuirResultadosClinicos(datosEkg, ordenTipoAlteracionEkg);
  const etiquetas = {
    NORMAL: 'Normal',
    ...etiquetasTipoAlteracionEkg
  };

  return distribucion.map(([label, cantidad, porcentaje]) => [
    etiquetas[label] || label,
    cantidad,
    porcentaje
  ]);
});

const tablaEspirometriaDistribucion = computed(() => {
  if (!dashboardData.value.length) return [];

  const datosEspirometria = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.espirometria?.[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.espirometria?.[0] || [];

  const distribucion = distribuirResultadosClinicos(datosEspirometria, ordenTipoAlteracionEspirometria);
  const etiquetas = {
    NORMAL: 'Normal',
    ...etiquetasTipoAlteracionEspirometria
  };

  return distribucion.map(([label, cantidad, porcentaje]) => [
    etiquetas[label] || label,
    cantidad,
    porcentaje
  ]);
});

const tablaRayosXDistribucion = computed(() => {
  if (!dashboardData.value.length) return [];

  const datosRx = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.rayosX?.[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.rayosX?.[0] || [];

  const distribucion = distribuirResultadosClinicosPorCategoriasMultiples(
    mapToCategoriasMultiples(datosRx, 'tipoAlteracionRayosX'),
    ordenTipoAlteracionRayosX
  );
  const etiquetas = {
    NORMAL: 'Normal',
    ...etiquetasTipoAlteracionRayosX
  };

  return distribucion.map(([label, cantidad, porcentaje]) => [
    etiquetas[label] || label,
    cantidad,
    porcentaje
  ]);
});

const tablaAnalisisLaboratorioDistribucion = computed(() => {
  if (!dashboardData.value.length) return [];

  const datosLab = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.analisisLaboratorio?.[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.analisisLaboratorio?.[0] || [];

  const distribucion = distribuirResultadosClinicosPorCategoriasMultiples(
    mapToCategoriasMultiples(datosLab, 'tipoAlteracionAnalisisLaboratorio'),
    ordenTipoAlteracionAnalisisLaboratorio
  );
  const etiquetas = {
    NORMAL: 'Normal',
    ...etiquetasTipoAlteracionAnalisisLaboratorio
  };

  return distribucion.map(([label, cantidad, porcentaje]) => [
    etiquetas[label] || label,
    cantidad,
    porcentaje
  ]);
});

const graficaTensionArterialData = computed(() => {
  const conteo = tablaTensionArterial.value;

  const coloresPorCategoria = {
    'Óptima': '#10B981',           // Verde
    'Normal': '#34D399',           // Verde claro
    'Alta': '#F59E0B',             // Amarillo
    'Hipertensión grado 1': '#F97316', // Naranja
    'Hipertensión grado 2': '#DC2626', // Rojo
    'Hipertensión grado 3': '#7F1D1D'    // Rojo oscuro
  };

  return {
    labels: conteo.map(([categoria]) => categoria),
    datasets: [
      {
        label: 'Trabajadores',
        data: conteo.map(([, cantidad]) => cantidad),
        backgroundColor: conteo.map(([categoria]) => coloresPorCategoria[categoria] || '#6B7280')
      }
    ]
  };
});

const graficaTensionArterialOptions = {
  indexAxis: 'y',
  responsive: true,
  layout: {
    padding: {
      right: 60
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      callbacks: {
        label: (context) => {
          const value = context.raw;
          const total = graficaTensionArterialData.value.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
          const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
          return `Trabajadores: ${value} (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      color: '#374151',
      anchor: 'end',
      align: 'end',
      formatter: (value, context) => {
        const total = graficaTensionArterialData.value.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
        const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
        return `${value} (${porcentaje}%)`;
      },
      font: {
        weight: 'bold',
        size: 12
      },
      clamp: true
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { display: false },
      ticks: {
        stepSize: 1,
        maxTicksLimit: 10,
        color: '#374151',
        font: { size: 12 }
      }
    },
    y: {
      grid: { display: false },
      ticks: {
        color: '#374151',
        font: { size: 12 }
      }
    }
  },
  onHover: (event, elements) => {
    const canvas = event.chart?.canvas;
    if (canvas) {
      canvas.style.cursor = elements.length ? 'pointer' : 'default';
    }
  }
};

// Opciones específicas para PDF con contorno negro
const graficaTensionArterialOptionsPDF = {
  indexAxis: 'y',
  responsive: true,
  layout: {
    padding: {
      right: 60
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      callbacks: {
        label: (context) => {
          const value = context.raw;
          const total = graficaTensionArterialData.value.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
          const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
          return `Trabajadores: ${value} (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      color: '#374151',
      anchor: 'end',
      align: 'end',
      formatter: (value, context) => {
        const total = graficaTensionArterialData.value.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
        const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
        return `${value} (${porcentaje}%)`;
      },
      font: {
        weight: 'bold',
        size: 12
      },
      clamp: true
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { display: false },
      ticks: {
        stepSize: 1,
        maxTicksLimit: 10,
        color: '#374151',
        font: { size: 12 }
      }
    },
    y: {
      grid: { display: false },
      ticks: {
        color: '#374151',
        font: { size: 12 }
      }
    }
  },
  onHover: (event, elements) => {
    const canvas = event.chart?.canvas;
    if (canvas) {
      canvas.style.cursor = elements.length ? 'pointer' : 'default';
    }
  },
  elements: {
    bar: {
      borderWidth: 1,
      borderColor: '#000000'
    }
  }
};

// Computed para tabla y grafica de categorías de IMC
const graficaIMCData = computed(() => {
  if (!dashboardData.value.length) return { labels: [], datasets: [], porcentajes: [] };

  const categorias = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.imc[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.imc[0] || [];

  const conteo = contarPorCategoriaIMC(categorias);
  const total = conteo.reduce((sum, [, cantidad]) => sum + cantidad, 0);

  // const coloresPorCategoria = {
  //   'Bajo peso': '#D1D5DB',          // gray-300
  //   'Normal': '#10B981',            // emerald-500 (verde saludable)
  //   'Sobrepeso': '#9CA3AF',         // gray-400
  //   'Obesidad clase I': '#6B7280',  // gray-500
  //   'Obesidad clase II': '#4B5563', // gray-600
  //   'Obesidad clase III': '#374151' // gray-700 (más oscuro)
  // };

  const coloresPorCategoria = {
    'Bajo peso': '#F59E0B',         // amber-500
    'Normal': '#10B981',            // emerald-500 (verde saludable)
    'Sobrepeso': '#F59E0B',         // amber-500
    'Obesidad clase I': '#F97316',  // orange-500
    'Obesidad clase II': '#DC2626', // red-500
    'Obesidad clase III': '#7F1D1D' // red-700 (más oscuro)
  };

  return {
    labels: conteo.map(([categoria]) => categoria),
    datasets: [
      {
        label: 'Trabajadores',
        data: conteo.map(([, cantidad]) => cantidad),
        backgroundColor: conteo.map(([categoria]) => coloresPorCategoria[categoria] || '#4B5563')
      }
    ],
    porcentajes: conteo.map(([, cantidad]) =>
      total > 0 ? Math.round((cantidad / total) * 100) : 0
    )
  };
});

const graficaIMCOptions = {
  indexAxis: 'y',
  responsive: true,
  layout: {
    padding: {
      right: 60 // ← ¡esto es lo que importa ahora!
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      callbacks: {
        label: (context) => {
          const value = context.raw;
          const total = graficaIMCData.value.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
          const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
          return `Trabajadores: ${value} (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      color: '#374151',
      anchor: 'end',
      align: 'end',
      formatter: (value, context) => {
        const total = graficaIMCData.value.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
        const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
        return `${value} (${porcentaje}%)`;
      },
      font: {
        weight: 'bold',
        size: 12
      },
      clamp: true
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { display: false },
      ticks: {
        stepSize: 1,
        maxTicksLimit: 10,
        color: '#374151',
        font: { size: 12 }
      }
    },
    y: {
      grid: { display: false },
      ticks: {
        callback: (label, index) => {
          if (typeof label === 'string') {
            return label.replace('Obesidad clase ', 'Obesidad ');
          }

          const maybeLabel = graficaIMCData.value.labels?.[index];
          return maybeLabel?.replace('Obesidad clase ', 'Obesidad ') || maybeLabel || '';
        },
        color: '#374151',
        font: { size: 12 }
      }
    }
  },
  onHover: (event, elements) => {
    const canvas = event.chart?.canvas;
    if (canvas) {
      canvas.style.cursor = elements.length ? 'pointer' : 'default';
    }
  }
};

// Opciones específicas para PDF con contorno negro
const graficaIMCOptionsPDF = {
  indexAxis: 'y',
  responsive: true,
  layout: {
    padding: {
      right: 60
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      callbacks: {
        label: (context) => {
          const value = context.raw;
          const total = graficaIMCData.value.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
          const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
          return `Trabajadores: ${value} (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      color: '#374151',
      anchor: 'end',
      align: 'end',
      formatter: (value, context) => {
        const total = graficaIMCData.value.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
        const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
        return `${value} (${porcentaje}%)`;
      },
      font: {
        weight: 'bold',
        size: 12
      },
      clamp: true
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { display: false },
      ticks: {
        stepSize: 1,
        maxTicksLimit: 10,
        color: '#374151',
        font: { size: 12 }
      }
    },
    y: {
      grid: { display: false },
      ticks: {
        callback: (label, index) => {
          if (typeof label === 'string') {
            return label.replace('Obesidad clase ', 'Obesidad ');
          }

          const maybeLabel = graficaIMCData.value.labels?.[index];
          return maybeLabel?.replace('Obesidad clase ', 'Obesidad ') || maybeLabel || '';
        },
        color: '#374151',
        font: { size: 12 }
      }
    }
  },
  onHover: (event, elements) => {
    const canvas = event.chart?.canvas;
    if (canvas) {
      canvas.style.cursor = elements.length ? 'pointer' : 'default';
    }
  },
  elements: {
    bar: {
      borderWidth: 1,
      borderColor: '#000000'
    }
  }
};

const tablaIMC = computed(() => {
  if (!dashboardData.value.length) return [];

  const categorias = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.imc[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.imc[0] || [];

  const conteo = contarPorCategoriaIMC(categorias);
  const total = conteo.reduce((sum, [, cantidad]) => sum + cantidad, 0);

  return conteo.map(([categoria, cantidad]) => {
    const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;
    return [categoria, cantidad, porcentaje];
  });
});

// Computed para tabla y grafica de aptitud al puesto
const tablaAptitud = computed(() => {
  if (!dashboardData.value.length) return [];

  const aptitudes = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.aptitudes[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.aptitudes[0] || [];

  return contarPorAptitudPuesto(aptitudes);
});

const graficaAptitudData = computed(() => {
  const conteo = tablaAptitud.value;

  const colores = {
    'Apto Sin Restricciones': '#10B981',  // Verde
    'Apto Con Precaución': '#F59E0B',     // Amarillo/ámbar
    'Apto Con Restricciones': '#F97316',  // Naranja
    'No Apto': '#DC2626',                 // Rojo
    'Evaluación No Completada': '#9CA3AF' // Gris claro
  };

  return {
    labels: conteo.map(([categoria]) => categoria),
    datasets: [
      {
        label: 'Trabajadores',
        data: conteo.map(([, cantidad]) => cantidad),
        backgroundColor: conteo.map(([categoria]) => colores[categoria] || '#6B7280') // fallback gris
      }
    ]
  };
});

const graficaAptitudOptions = {
  indexAxis: 'y',
  responsive: true,
  layout: {
    padding: {
      right: 60 
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      callbacks: {
        title: (context) => {
          const index = context[0].dataIndex;
          const raw = context[0].label;
          return etiquetasAptitudPuestoTabla[raw] || raw;
        },
        label: (context) => {
          const index = context.dataIndex;
          const [categoria, cantidad, porcentaje] = tablaAptitud.value[index];
          return `Trabajadores: ${cantidad} (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      anchor: 'end',
      align: 'end',
      color: '#374151',
      font: { weight: 'bold', size: 12 },
      formatter: (_valor, context) => {
        const index = context.dataIndex;
        const [_, cantidad, porcentaje] = tablaAptitud.value[index];
        return `${cantidad} (${porcentaje}%)`;
      }
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { display: false },
      ticks: {
        stepSize: 1,
        maxTicksLimit: 10,
        color: '#374151',
        font: { size: 12 }
      }
    },
    y: {
      grid: { display: false },
      ticks: {
        callback: (value) => {
          const etiqueta = graficaAptitudData.value.labels?.[value];
          return etiquetasAptitudPuesto[etiqueta] || etiqueta;
        },
        color: '#374151',
        font: { size: 12 }
      }
    }
  },
  onHover: (event, elements) => {
    const canvas = event.chart?.canvas;
    if (canvas) {
      canvas.style.cursor = elements.length ? 'pointer' : 'default';
    }
  }
};

// Opciones específicas para PDF con contorno negro
const graficaAptitudOptionsPDF = {
  indexAxis: 'y',
  responsive: true,
  layout: {
    padding: {
      right: 60 
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      callbacks: {
        title: (context) => {
          const index = context[0].dataIndex;
          const raw = context[0].label;
          return etiquetasAptitudPuestoTabla[raw] || raw;
        },
        label: (context) => {
          const index = context.dataIndex;
          const [categoria, cantidad, porcentaje] = tablaAptitud.value[index];
          return `Trabajadores: ${cantidad} (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      anchor: 'end',
      align: 'end',
      color: '#374151',
      font: { weight: 'bold', size: 12 },
      formatter: (_valor, context) => {
        const index = context.dataIndex;
        const [_, cantidad, porcentaje] = tablaAptitud.value[index];
        return `${cantidad} (${porcentaje}%)`;
      }
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { display: false },
      ticks: {
        stepSize: 1,
        maxTicksLimit: 10,
        color: '#374151',
        font: { size: 12 }
      }
    },
    y: {
      grid: { display: false },
      ticks: {
        callback: (value) => {
          const etiqueta = graficaAptitudData.value.labels?.[value];
          return etiquetasAptitudPuesto[etiqueta] || etiqueta;
        },
        color: '#374151',
        font: { size: 12 }
      }
    }
  },
  onHover: (event, elements) => {
    const canvas = event.chart?.canvas;
    if (canvas) {
      canvas.style.cursor = elements.length ? 'pointer' : 'default';
    }
  },
  elements: {
    bar: {
      borderWidth: 1,
      borderColor: '#000000'
    }
  }
};

// Opciones para gráfica de distribución de HBC (barras horizontales)
const graficaAudiometriaDistribucionOptionsPDF = {
  indexAxis: 'y',
  responsive: true,
  layout: {
    padding: {
      right: 60 
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      callbacks: {
        title: (context) => {
          const index = context[0].dataIndex;
          const raw = context[0].label;
          return raw;
        },
        label: (context) => {
          if (!context || !context.parsed || context.parsed.x === undefined) {
            return '';
          }
          const index = context.dataIndex;
          const cantidad = context.parsed.x;
          const distribucion = distribuirResultadosHBC(
            centroSeleccionado.value === 'Todos'
              ? dashboardData.value.flatMap((d) => d.audiometriaResumen || [])
              : dashboardData.value[
                  centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
                ]?.audiometriaResumen || []
          );
          const porcentaje = distribucion[index]?.[2] || 0;
          return `Trabajadores: ${cantidad} (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      anchor: 'end',
      align: 'end',
      color: '#374151',
      font: { weight: 'bold', size: 12 },
      formatter: (_valor, context) => {
        if (!context || !context.parsed || context.parsed.x === undefined) {
          return '';
        }
        const cantidad = context.parsed.x;
        const distribucion = distribuirResultadosHBC(
          centroSeleccionado.value === 'Todos'
            ? dashboardData.value.flatMap((d) => d.audiometriaResumen || [])
            : dashboardData.value[
                centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
              ]?.audiometriaResumen || []
        );
        const porcentaje = distribucion[context.dataIndex]?.[2] || 0;
        return `${cantidad} (${porcentaje}%)`;
      }
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { display: false },
      ticks: {
        stepSize: 1,
        maxTicksLimit: 10,
        color: '#374151',
        font: { size: 12 }
      }
    },
    y: {
      grid: { display: false },
      ticks: {
        color: '#374151',
        font: { size: 12 }
      }
    }
  },
  onHover: (event, elements) => {
    const canvas = event.chart?.canvas;
    if (canvas) {
      canvas.style.cursor = elements.length ? 'pointer' : 'default';
    }
  },
  elements: {
    bar: {
      borderWidth: 1,
      borderColor: '#000000'
    }
  }
};

// Opciones para gráfica de distribución de HBC (barras horizontales) - Igual patrón que IMC/Aptitud/Tensión
const graficaAudiometriaDistribucionOptions = {
  indexAxis: 'y',
  responsive: true,
  layout: { padding: { right: 60 } },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      callbacks: {
        title: (context) => context[0].label,
        label: (context) => {
          const index = context.dataIndex;
          const entry = (tablaAudiometriaDistribucion?.value || [])[index];
          if (!entry) return '';
          const [, cantidad, porcentaje] = entry;
          return `Trabajadores: ${cantidad} (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      anchor: 'end',
      align: 'end',
      color: '#374151',
      font: { weight: 'bold', size: 12 },
      clamp: true,
      formatter: (_valor, context) => {
        const index = context.dataIndex;
        const entry = (tablaAudiometriaDistribucion?.value || [])[index];
        if (!entry) return '';
        const [, cantidad, porcentaje] = entry;
        return `${cantidad} (${porcentaje}%)`;
      }
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { display: false },
      ticks: {
        stepSize: 1,
        maxTicksLimit: 10,
        color: '#374151',
        font: { size: 12 }
      }
    },
    y: {
      grid: { display: false },
      categoryPercentage: 1.0,
      barPercentage: 0.7,
      ticks: {
        color: '#374151',
        font: { size: 12 }
      }
    }
  },
  onHover: (event, elements) => {
    const canvas = event.chart?.canvas;
    if (canvas) {
      canvas.style.cursor = elements.length ? 'pointer' : 'default';
    }
  }
};

// Computed para tabla y grafica de enfermedades cronicas
const tablaEnfermedades = computed(() => {
  if (!dashboardData.value.length) return [];

  const data = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.enfermedadesCronicas[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.enfermedadesCronicas[0] || [];

  return contarEnfermedadesCronicas(data);
});

const graficaEnfermedadesData = computed(() => {
  const conteo = tablaEnfermedades.value;

  return {
    labels: conteo.map(([campo]) => etiquetasEnfermedades[campo] || campo),
    datasets: [
      {
        label: 'Casos referidos',
        data: conteo.map(([, cantidad]) => cantidad),
        backgroundColor: '#4B5563'
      }
    ]
  };
});

const graficaEnfermedadesOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true },
    datalabels: {
      color: '#4B5563', // Gris oscuro
      anchor: 'end', // puede ser 'center', 'start', 'end'
      align: 'top', // 'top', 'bottom', 'left', 'right', 'center'
      formatter: value => value > 0 ? value : '',
      font: {
        weight: 'bold',
        size: 12
      },
      clamp: true
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { display: false },
      ticks: {
        callback: (value) => {
          const label = graficaEnfermedadesData.value.labels?.[value];
          if (!label) return '';
          
          const replacements = {
            'diabeticosPP': 'Diabéticos',
            'hipertensivosPP': 'Hipertensivos', 
            'cardiopaticosPP': 'Cardiopáticos',
            'epilepticosPP': 'Epilépticos',
            'respiratorios': 'Respiratorios',
            'alergicos': 'Alérgicos'
          };

          return replacements[label] || label;
        },
        color: '#374151',
        font: {
          size: 12
        }
      }
    },
    y: {
      grid: { display: false }
    }
  }
};

// Computed para tabla y grafica de antecedentes referidos
const tablaAntecedentes = computed(() => {
  if (!dashboardData.value.length) return [];

  const data = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.antecedentes[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.antecedentes[0] || [];

  return contarAntecedentesReferidos(data);
});

const graficaAntecedentesData = computed(() => {
  const conteo = tablaAntecedentes.value;

  return {
    labels: conteo.map(([campo]) => etiquetasAntecedentesReferidos[campo] || campo),
    datasets: [
      {
        label: 'Casos referidos',
        data: conteo.map(([, cantidad]) => cantidad),
        backgroundColor: '#4B5563'
      }
    ]
  };
});

const graficaAntecedentesOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true },
    datalabels: {
      color: '#4B5563', // Gris oscuro
      anchor: 'end', // puede ser 'center', 'start', 'end'
      align: 'top', // 'top', 'bottom', 'left', 'right', 'center'
      formatter: value => value > 0 ? value : '',
      font: {
        weight: 'bold',
        size: 12
      },
      clamp: true
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { display: false },
      ticks: {
        callback: (value) => {
          const label = graficaAntecedentesData.value.labels?.[value];
          return etiquetasAntecedentesReferidos[label] || label;
        },
        color: '#374151',
        font: { size: 12 }
      }
    },
    y: {
      grid: { display: false }
    }
  }
};

// Computed para tabla y grafica de agudeza visual
const graficaRequierenLentesData = computed(() => {
  if (!dashboardData.value.length) return { labels: [], datasets: [] };

  const examenes = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.agudezaVisual[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.agudezaVisual[0] || [];

  const { requieren, noRequieren } = calcularRequierenLentes(examenes);
  const total = requieren + noRequieren;
  const porcentaje = total > 0 ? Math.round((requieren / total) * 100) : 0;

  return {
    requiere: requieren,
    porcentaje,
    chart: {
      labels: ['Requiere lentes', 'No requiere'],
      datasets: [
        {
          data: [requieren, noRequieren],
          // backgroundColor: ['#059669', '#D1D5DB'] // Verde + gris claro
          backgroundColor: ['#4B5563', '#D1D5DB'], // Gris oscuro + gris claro
          hoverOffset: 8,
        }
      ]
    }
  };
});

const opcionesGenericasAnillo = {
  responsive: true,
  cutout: '70%',
  plugins: {
    tooltip: {
      enabled: true,
      callbacks: {
        label: (context) => {
          const value = context.raw;
          return `Casos: ${value}`;
        }
      }
    },
    datalabels: {
      display: false
    },
    legend: {
      display: false
    }
  },
  onHover: (event, elements) => {
    const canvas = event.chart?.canvas;
    if (canvas) {
      canvas.style.cursor = elements.length ? 'pointer' : 'default';
    }
  }
};

// Opciones para PDF con contorno negro
const opcionesGenericasAnilloPDF = {
  responsive: true,
  cutout: '70%',
  plugins: {
    tooltip: {
      enabled: true,
      callbacks: {
        label: (context) => {
          const value = context.raw;
          return `Casos: ${value}`;
        }
      }
    },
    datalabels: {
      display: false
    },
    legend: {
      display: false
    }
  },
  onHover: (event, elements) => {
    const canvas = event.chart?.canvas;
    if (canvas) {
      canvas.style.cursor = elements.length ? 'pointer' : 'default';
    }
  },
  elements: {
    arc: {
      borderWidth: 1,
      borderColor: '#000000'
    }
  }
};

const tablaVisionSinCorreccion = computed(() => {
  if (!dashboardData.value.length) return [];

  const examenes = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.agudezaVisual[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.agudezaVisual[0] || [];

  return contarVisionSinCorreccion(examenes);
});

const graficaVistaCorregidaData = computed(() => {
  if (!dashboardData.value.length) return { labels: [], datasets: [] };

  const examenes = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.agudezaVisual[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.agudezaVisual[0] || [];

  return calcularVistaCorregida(examenes);
});

const graficaDaltonismoData = computed(() => {
  if (!dashboardData.value.length) return { labels: [], datasets: [] };

  const examenes = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.daltonismo[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.daltonismo[0] || [];

  return calcularDaltonismo(examenes);
});

const filasTrastornosEstadoAnimoDashboard = computed(() => {
  if (!dashboardData.value.length) return [];
  return centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.trastornosEstadoAnimo?.[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex((c) => c.nombreCentro === centroSeleccionado.value)
      ]?.trastornosEstadoAnimo?.[0] || [];
});

const graficaTamizajeBipolarTEAData = computed(() =>
  calcularAnilloTamizajeBipolarTEA(filasTrastornosEstadoAnimoDashboard.value)
);

const filasCuestionarioProdromalDashboard = computed(() => {
  if (!dashboardData.value.length) return [];
  return centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.cuestionarioProdromalBreve?.[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex((c) => c.nombreCentro === centroSeleccionado.value)
      ]?.cuestionarioProdromalBreve?.[0] || [];
});

const graficaTamizajeProdromalData = computed(() =>
  calcularAnilloTamizajeProdromalCPB(filasCuestionarioProdromalDashboard.value)
);

const filasTrastornoLimiteDashboard = computed(() => {
  if (!dashboardData.value.length) return [];
  return centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.trastornoLimitePersonalidad?.[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex((c) => c.nombreCentro === centroSeleccionado.value)
      ]?.trastornoLimitePersonalidad?.[0] || [];
});

const graficaFranjasTLPData = computed(() =>
  calcularBarrasFranjasTamizajeTLP(filasTrastornoLimiteDashboard.value)
);

const tablaTamizajeTLP = computed(() =>
  tablaFranjasTamizajeTLP(filasTrastornoLimiteDashboard.value)
);

const graficaFranjasTLPOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true },
    datalabels: {
      color: '#4B5563',
      anchor: 'end',
      align: 'top',
      formatter: (value) => (value > 0 ? value : ''),
      font: { weight: 'bold', size: 12 },
      clamp: true,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: '#374151',
        font: { size: 11 },
        maxRotation: 40,
        minRotation: 0,
      },
    },
    y: {
      beginAtZero: true,
      grid: { display: false },
      ticks: { stepSize: 1, color: '#374151' },
    },
  },
  onHover: (event, elements) => {
    const canvas = event.chart?.canvas;
    if (canvas) {
      canvas.style.cursor = elements.length ? 'pointer' : 'default';
    }
  },
};

// Computed para gráfica de proporción Normal/Anormal de audiometría
const graficaAudiometriaProporcionData = computed(() => {
  if (!dashboardData.value.length) return { conAnormal: 0, porcentaje: 0, chart: { labels: [], datasets: [] } };

  const datosAudio = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.audiometriaResumen || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.audiometriaResumen || [];

  const proporcion = calcularProporcionAudiometria(datosAudio);
  
  const total = proporcion.Normal + proporcion.Anormal;
  const porcentaje = total > 0 ? Math.round((proporcion.Anormal / total) * 100) : 0;

  return {
    conAnormal: proporcion.Anormal,
    porcentaje,
    chart: {
      labels: ['Anormal', 'Normal'],
      datasets: [{
        data: [proporcion.Anormal, proporcion.Normal],
        backgroundColor: ['#f59e0b', '#D1D5DB'], // Amarillo + gris claro
        hoverOffset: 8,
      }]
    }
  };
});

// Computed para gráfica de distribución de rangos de HBC
const graficaAudiometriaDistribucionData = computed(() => {
  if (!dashboardData.value.length) return { labels: [], datasets: [] };

  const datosAudio = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.audiometriaResumen || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.audiometriaResumen || [];

  const distribucion = distribuirResultadosHBC(datosAudio);
  
  return {
    labels: distribucion.map(([label]) => label),
    datasets: [{
      label: 'Cantidad',
      data: distribucion.map(([, cantidad]) => cantidad),
      backgroundColor: [
        '#10b981', // Normal - verde
        '#f59e0b', // Hipoacusia leve - amarillo
        '#f97316', // Hipoacusia moderada - naranja
        '#dc2626', // H. moderada-severa - rojo
        '#991b1b', // Hipoacusia severa - rojo oscuro
        '#7c2d12'  // Hipoacusia profunda - marrón
      ],
      borderWidth: 0
    }]
  };
});

// ===== RESULTADOS CLINICOS EKG =====
const graficaEkgProporcionData = computed(() => {
  if (!dashboardData.value.length) return { conAnormal: 0, porcentaje: 0, chart: { labels: [], datasets: [] } };

  const datosEkg = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.ekg?.[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.ekg?.[0] || [];

  const proporcion = calcularProporcionResultadosClinicos(datosEkg);
  const total = proporcion.NORMAL + proporcion.ANORMAL + proporcion.NO_CONCLUYENTE;
  const porcentaje = total > 0 ? Math.round((proporcion.ANORMAL / total) * 100) : 0;

  return {
    conAnormal: proporcion.ANORMAL,
    porcentaje,
    chart: {
      labels: ['Anormal', 'Normal', 'No concluyente'],
      datasets: [{
        data: [proporcion.ANORMAL, proporcion.NORMAL, proporcion.NO_CONCLUYENTE],
        backgroundColor: ['#f59e0b', '#D1D5DB', '#94a3b8'],
        hoverOffset: 8,
      }]
    }
  };
});

const graficaEkgDistribucionData = computed(() => {
  if (!dashboardData.value.length) return { labels: [], datasets: [] };

  const datosEkg = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.ekg?.[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.ekg?.[0] || [];

  const distribucion = distribuirResultadosClinicos(datosEkg, ordenTipoAlteracionEkg);
  const etiquetas = {
    NORMAL: 'Normal',
    ...etiquetasTipoAlteracionEkg
  };

  return {
    labels: distribucion.map(([label]) => etiquetas[label] || label),
    datasets: [{
      label: 'Cantidad',
      data: distribucion.map(([, cantidad]) => cantidad),
      backgroundColor: [
        '#10b981',
        '#f59e0b',
        '#f97316',
        '#fb7185',
        '#dc2626',
        '#991b1b',
        '#7c2d12'
      ],
      borderWidth: 0
    }]
  };
});

const graficaEkgDistribucionOptions = {
  indexAxis: 'y',
  responsive: true,
  layout: {
    padding: {
      right: 60
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      callbacks: {
        label: (context) => {
          const value = context.raw;
          const total = graficaEkgDistribucionData.value.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
          const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
          return `Trabajadores: ${value} (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      color: '#374151',
      anchor: 'end',
      align: 'end',
      formatter: (value, context) => {
        const total = graficaEkgDistribucionData.value.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
        const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
        return `${value} (${porcentaje}%)`;
      },
      font: {
        weight: 'bold',
        size: 12
      },
      clamp: true
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { display: false },
      ticks: {
        stepSize: 1,
        maxTicksLimit: 10,
        color: '#374151',
        font: { size: 12 }
      }
    },
    y: {
      grid: { display: false },
      ticks: {
        color: '#374151',
        font: { size: 12 }
      }
    }
  }
};

// ===== RESULTADOS CLINICOS ESPIROMETRIA =====
const graficaEspirometriaProporcionData = computed(() => {
  if (!dashboardData.value.length) return { conAnormal: 0, porcentaje: 0, chart: { labels: [], datasets: [] } };

  const datosEspirometria = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.espirometria?.[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.espirometria?.[0] || [];

  const proporcion = calcularProporcionResultadosClinicos(datosEspirometria);
  const total = proporcion.NORMAL + proporcion.ANORMAL + proporcion.NO_CONCLUYENTE;
  const porcentaje = total > 0 ? Math.round((proporcion.ANORMAL / total) * 100) : 0;

  return {
    conAnormal: proporcion.ANORMAL,
    porcentaje,
    chart: {
      labels: ['Anormal', 'Normal', 'No concluyente'],
      datasets: [{
        data: [proporcion.ANORMAL, proporcion.NORMAL, proporcion.NO_CONCLUYENTE],
        backgroundColor: ['#f59e0b', '#D1D5DB', '#94a3b8'],
        hoverOffset: 8,
      }]
    }
  };
});

const graficaEspirometriaDistribucionData = computed(() => {
  if (!dashboardData.value.length) return { labels: [], datasets: [] };

  const datosEspirometria = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.espirometria?.[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.espirometria?.[0] || [];

  const distribucion = distribuirResultadosClinicos(datosEspirometria, ordenTipoAlteracionEspirometria);
  const etiquetas = {
    NORMAL: 'Normal',
    ...etiquetasTipoAlteracionEspirometria
  };

  return {
    labels: distribucion.map(([label]) => etiquetas[label] || label),
    datasets: [{
      label: 'Cantidad',
      data: distribucion.map(([, cantidad]) => cantidad),
      backgroundColor: [
        '#10b981',
        '#f59e0b',
        '#f97316',
        '#dc2626'
      ],
      borderWidth: 0
    }]
  };
});

const graficaEspirometriaDistribucionOptions = {
  indexAxis: 'y',
  responsive: true,
  layout: {
    padding: {
      right: 60
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      callbacks: {
        label: (context) => {
          const value = context.raw;
          const total = graficaEspirometriaDistribucionData.value.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
          const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
          return `Trabajadores: ${value} (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      color: '#374151',
      anchor: 'end',
      align: 'end',
      formatter: (value, context) => {
        const total = graficaEspirometriaDistribucionData.value.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
        const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
        return `${value} (${porcentaje}%)`;
      },
      font: {
        weight: 'bold',
        size: 12
      },
      clamp: true
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { display: false },
      ticks: {
        stepSize: 1,
        maxTicksLimit: 10,
        color: '#374151',
        font: { size: 12 }
      }
    },
    y: {
      grid: { display: false },
      ticks: {
        color: '#374151',
        font: { size: 12 }
      }
    }
  }
};

// ===== RESULTADOS CLINICOS RAYOS X =====
const graficaRayosXProporcionData = computed(() => {
  if (!dashboardData.value.length) return { conAnormal: 0, porcentaje: 0, chart: { labels: [], datasets: [] } };

  const datosRx = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.rayosX?.[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.rayosX?.[0] || [];

  const proporcion = calcularProporcionResultadosClinicos(datosRx);
  const total = proporcion.NORMAL + proporcion.ANORMAL + proporcion.NO_CONCLUYENTE;
  const porcentaje = total > 0 ? Math.round((proporcion.ANORMAL / total) * 100) : 0;

  return {
    conAnormal: proporcion.ANORMAL,
    porcentaje,
    chart: {
      labels: ['Anormal', 'Normal', 'No concluyente'],
      datasets: [{
        data: [proporcion.ANORMAL, proporcion.NORMAL, proporcion.NO_CONCLUYENTE],
        backgroundColor: ['#f59e0b', '#D1D5DB', '#94a3b8'],
        hoverOffset: 8,
      }]
    }
  };
});

const graficaRayosXDistribucionData = computed(() => {
  if (!dashboardData.value.length) return { labels: [], datasets: [] };

  const datosRx = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.rayosX?.[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.rayosX?.[0] || [];

  const distribucion = distribuirResultadosClinicosPorCategoriasMultiples(
    mapToCategoriasMultiples(datosRx, 'tipoAlteracionRayosX'),
    ordenTipoAlteracionRayosX
  );
  const etiquetas = {
    NORMAL: 'Normal',
    ...etiquetasTipoAlteracionRayosX
  };

  return {
    labels: distribucion.map(([label]) => etiquetas[label] || label),
    datasets: [{
      label: 'Cantidad',
      data: distribucion.map(([, cantidad]) => cantidad),
      backgroundColor: [
        '#10b981',
        '#f59e0b',
        '#f97316',
        '#fb7185',
        '#dc2626',
        '#991b1b',
        '#7c2d12',
        '#6366f1',
        '#8b5cf6',
        '#ec4899',
        '#14b8a6',
        '#84cc16'
      ],
      borderWidth: 0
    }]
  };
});

const graficaRayosXDistribucionOptions = {
  indexAxis: 'y',
  responsive: true,
  layout: {
    padding: {
      right: 60
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      callbacks: {
        label: (context) => {
          const value = context.raw;
          const total = graficaRayosXDistribucionData.value.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
          const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
          return `Trabajadores: ${value} (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      color: '#374151',
      anchor: 'end',
      align: 'end',
      formatter: (value, context) => {
        const total = graficaRayosXDistribucionData.value.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
        const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
        return `${value} (${porcentaje}%)`;
      },
      font: {
        weight: 'bold',
        size: 12
      },
      clamp: true
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { display: false },
      ticks: {
        stepSize: 1,
        maxTicksLimit: 10,
        color: '#374151',
        font: { size: 12 }
      }
    },
    y: {
      grid: { display: false },
      ticks: {
        color: '#374151',
        font: { size: 12 }
      }
    }
  }
};

// ===== RESULTADOS CLINICOS ANÁLISIS DE LABORATORIO =====
const graficaAnalisisLaboratorioProporcionData = computed(() => {
  if (!dashboardData.value.length) return { conAnormal: 0, porcentaje: 0, chart: { labels: [], datasets: [] } };

  const datosLab = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.analisisLaboratorio?.[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.analisisLaboratorio?.[0] || [];

  const proporcion = calcularProporcionResultadosClinicos(datosLab);
  const total = proporcion.NORMAL + proporcion.ANORMAL + proporcion.NO_CONCLUYENTE;
  const porcentaje = total > 0 ? Math.round((proporcion.ANORMAL / total) * 100) : 0;

  return {
    conAnormal: proporcion.ANORMAL,
    porcentaje,
    chart: {
      labels: ['Anormal', 'Normal', 'No concluyente'],
      datasets: [{
        data: [proporcion.ANORMAL, proporcion.NORMAL, proporcion.NO_CONCLUYENTE],
        backgroundColor: ['#f59e0b', '#D1D5DB', '#94a3b8'],
        hoverOffset: 8,
      }]
    }
  };
});

const graficaAnalisisLaboratorioDistribucionData = computed(() => {
  if (!dashboardData.value.length) return { labels: [], datasets: [] };

  const datosLab = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.analisisLaboratorio?.[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.analisisLaboratorio?.[0] || [];

  const distribucion = distribuirResultadosClinicosPorCategoriasMultiples(
    mapToCategoriasMultiples(datosLab, 'tipoAlteracionAnalisisLaboratorio'),
    ordenTipoAlteracionAnalisisLaboratorio
  );
  const etiquetas = {
    NORMAL: 'Normal',
    ...etiquetasTipoAlteracionAnalisisLaboratorio
  };

  return {
    labels: distribucion.map(([label]) => etiquetas[label] || label),
    datasets: [{
      label: 'Cantidad',
      data: distribucion.map(([, cantidad]) => cantidad),
      backgroundColor: [
        '#10b981',
        '#f59e0b',
        '#f97316',
        '#fb7185',
        '#dc2626',
        '#991b1b',
        '#7c2d12',
        '#6366f1'
      ],
      borderWidth: 0
    }]
  };
});

const graficaAnalisisLaboratorioDistribucionOptions = {
  indexAxis: 'y',
  responsive: true,
  layout: {
    padding: {
      right: 60
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      callbacks: {
        label: (context) => {
          const value = context.raw;
          const total = graficaAnalisisLaboratorioDistribucionData.value.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
          const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
          return `Trabajadores: ${value} (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      color: '#374151',
      anchor: 'end',
      align: 'end',
      formatter: (value, context) => {
        const total = graficaAnalisisLaboratorioDistribucionData.value.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
        const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
        return `${value} (${porcentaje}%)`;
      },
      font: {
        weight: 'bold',
        size: 12
      },
      clamp: true
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { display: false },
      ticks: {
        stepSize: 1,
        maxTicksLimit: 10,
        color: '#374151',
        font: { size: 12 }
      }
    },
    y: {
      grid: { display: false },
      ticks: {
        color: '#374151',
        font: { size: 12 }
      }
    }
  }
};

// Computed para tabla y grafica de circunferencia de cintura
const graficaCircunferenciaData = computed(() => {
  if (!dashboardData.value.length) return { chart: {}, alto: 0, porcentaje: 0 };

  const datos = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.circunferenciaCintura[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.circunferenciaCintura[0] || [];

  return calcularCircunferenciaCintura(datos);
});

const graficaCircunferenciaOptions = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: {
      top: 0,
      bottom: 0
    }
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      enabled: true,
      callbacks: {
        label: (context) => {
          const value = context.raw;
          const total = graficaCircunferenciaData.value.chart.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
          const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
          return `Casos: ${value} (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      color: '#FFFFFF',
      anchor: 'center',
      align: 'center',
      formatter: (value, context) => {
        if (value === 0) return '';
        const total = graficaCircunferenciaData.value.chart.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
        const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
        return `  ${value}\n(${porcentaje}%)`;
      },
      font: {
        weight: 'bold',
        size: 12
      },
      clamp: true
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { display: false },
      categoryPercentage: 1.0,
      barPercentage: 0.7,
      ticks: {
        color: '#374151',
        font: { size: 12 }
      }
    },
    y: {
      beginAtZero: true,
      grid: { display: false },
      ticks: {
        color: '#374151',
        font: { size: 12 }
      }
    }
  },
  onHover: (event, elements) => {
    const canvas = event.chart?.canvas;
    if (canvas) {
      canvas.style.cursor = elements.length ? 'pointer' : 'default';
    }
  }
};

// Opciones específicas para PDF con textos más grandes
const graficaCircunferenciaOptionsPDF = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: {
      top: 0,
      bottom: 0
    }
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      enabled: true,
      callbacks: {
        label: (context) => {
          const value = context.raw;
          const total = graficaCircunferenciaData.value.chart.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
          const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
          return `Casos: ${value} (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      color: '#FFFFFF',
      anchor: 'center',
      align: 'center',
      formatter: (value, context) => {
        if (value === 0) return '';
        const total = graficaCircunferenciaData.value.chart.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
        const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
        return `  ${value}\n(${porcentaje}%)`;
      },
      font: {
        weight: 'bold',
        size: 24
      },
      clamp: true
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { display: false },
      categoryPercentage: 1.0,
      barPercentage: 0.7,
      ticks: {
        color: '#374151',
        font: { size: 20 }
      }
    },
    y: {
      beginAtZero: true,
      grid: { display: false },
      ticks: {
        color: '#374151',
        font: { size: 24 }
      }
    }
  },
  onHover: (event, elements) => {
    const canvas = event.chart?.canvas;
    if (canvas) {
      canvas.style.cursor = elements.length ? 'pointer' : 'default';
    }
  },
  elements: {
    bar: {
      borderWidth: 1,
      borderColor: '#000000'
    }
  }
};

const hasAnyPositiveChartData = (chartData) =>
  Boolean(
    chartData?.datasets?.some((dataset) =>
      (dataset?.data || []).some((value) => Number(value) > 0)
    )
  );

const mostrarTamizajeBipolar = computed(() => hasAnyPositiveChartData(graficaTamizajeBipolarTEAData.value.chart));
const mostrarTamizajeProdromal = computed(() => hasAnyPositiveChartData(graficaTamizajeProdromalData.value.chart));
const mostrarTamizajeTLP = computed(() => hasAnyPositiveChartData(graficaFranjasTLPData.value));

const mostrarAudiometriaProporcion = computed(() => hasAnyPositiveChartData(graficaAudiometriaProporcionData.value.chart));
const mostrarAudiometriaDistribucion = computed(() => hasAnyPositiveChartData(graficaAudiometriaDistribucionData.value));
const mostrarEspirometriaProporcion = computed(() => hasAnyPositiveChartData(graficaEspirometriaProporcionData.value.chart));
const mostrarEspirometriaDistribucion = computed(() => hasAnyPositiveChartData(graficaEspirometriaDistribucionData.value));
const mostrarEkgProporcion = computed(() => hasAnyPositiveChartData(graficaEkgProporcionData.value.chart));
const mostrarEkgDistribucion = computed(() => hasAnyPositiveChartData(graficaEkgDistribucionData.value));
const mostrarRayosXProporcion = computed(() => hasAnyPositiveChartData(graficaRayosXProporcionData.value.chart));
const mostrarRayosXDistribucion = computed(() => hasAnyPositiveChartData(graficaRayosXDistribucionData.value));
const mostrarAnalisisLaboratorioProporcion = computed(() => hasAnyPositiveChartData(graficaAnalisisLaboratorioProporcionData.value.chart));
const mostrarAnalisisLaboratorioDistribucion = computed(() => hasAnyPositiveChartData(graficaAnalisisLaboratorioDistribucionData.value));

// ---- Secciones del tablero: agrupan las tarjetas y se ocultan cuando no hay datos en el periodo

const gridTarjetas =
  'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 auto-rows-[360px] sm:auto-rows-[400px] md:auto-rows-[430px] lg:auto-rows-[460px]';

/** Índice del centro elegido dentro de los datos; null cuando se ven todos. */
const indiceCentroSeleccionado = computed(() => {
  if (centroSeleccionado.value === 'Todos') return null;
  return centrosTrabajo.value.findIndex((c) => c.nombreCentro === centroSeleccionado.value);
});

const hayRegistros = (...claves) =>
  claves.some(
    (clave) => registrosDe(dashboardData.value, indiceCentroSeleccionado.value, clave).length > 0,
  );

// ---- Diagnósticos de las consultas

const diagnosticosDeConsultas = computed(() =>
  resumirDiagnosticos(registrosDe(dashboardData.value, indiceCentroSeleccionado.value, 'diagnosticos')),
);

const consultasMensuales = computed(() => {
  const meses = consultasPorMes(
    registrosDe(dashboardData.value, indiceCentroSeleccionado.value, 'consultas').map(
      (consulta) => consulta?.fechaNotaMedica,
    ),
  );
  const maximo = Math.max(1, ...meses.map((mes) => mes.cantidad));
  return meses.map((mes) => ({
    ...mes,
    alto: `${mes.cantidad ? Math.max(4, (mes.cantidad / maximo) * 100) : 0}%`,
  }));
});

// ---- Inventario clínico: consumo del periodo y existencias de hoy, de los centros que se ven

const inventarioStore = useInventarioStore();
const inventarioDelTablero = ref({ consumo: [], existencias: [] });
const periodoInventario = computed(() =>
  periodoDeInventario(fechaInicio.value, fechaFin.value, format(new Date(), 'yyyy-MM-dd')),
);
let consultaDeInventario = 0;

const cargarInventario = async () => {
  const esta = ++consultaDeInventario;
  const centros =
    indiceCentroSeleccionado.value === null
      ? centrosTrabajo.value
      : [centrosTrabajo.value[indiceCentroSeleccionado.value]].filter(Boolean);
  if (!inventarioStore.habilitado || !centros.length) {
    inventarioDelTablero.value = { consumo: [], existencias: [] };
    return;
  }
  const { desde, hasta } = periodoInventario.value;
  // Un centro sin acceso o con error no impide ver los demás
  const sinError = (peticion) => peticion.then(({ data }) => data).catch(() => null);
  const [consumo, existencias] = await Promise.all([
    Promise.all(centros.map((c) => sinError(InventarioAPI.getConsumo(c._id, { desde, hasta })))),
    Promise.all(centros.map((c) => sinError(InventarioAPI.getExistencias(c._id)))),
  ]);
  if (esta !== consultaDeInventario) return;
  inventarioDelTablero.value = { consumo, existencias };
};

watch(
  [
    () => inventarioStore.habilitado,
    () => centrosTrabajo.value.map((c) => c._id).join(','),
    indiceCentroSeleccionado,
    fechaInicio,
    fechaFin,
  ],
  () => {
    if (rangoInvalido.value) return;
    cargarInventario();
  },
  { immediate: true },
);

const consumoDeInsumos = computed(() => sumarConsumo(inventarioDelTablero.value.consumo));
const insumosMasConsumidos = computed(() => consumoDeInsumos.value.filter((f) => f.consumo > 0).slice(0, 10));
const insumosConBajas = computed(() =>
  consumoDeInsumos.value.filter((f) => f.bajas > 0).sort((a, b) => b.bajas - a.bajas),
);
const alertasInventario = computed(() => alertasDeExistencias(inventarioDelTablero.value.existencias));

const seccionConDatos = computed(() => ({
  poblacion: true,
  exposicion: true,
  saludMental:
    mostrarTamizajeBipolar.value || mostrarTamizajeProdromal.value || mostrarTamizajeTLP.value,
  saludVisual: hayRegistros('agudezaVisual', 'daltonismo'),
  gabinete:
    mostrarAudiometriaProporcion.value ||
    mostrarAudiometriaDistribucion.value ||
    mostrarEspirometriaProporcion.value ||
    mostrarEspirometriaDistribucion.value ||
    mostrarEkgProporcion.value ||
    mostrarEkgDistribucion.value ||
    mostrarRayosXProporcion.value ||
    mostrarRayosXDistribucion.value ||
    mostrarAnalisisLaboratorioProporcion.value ||
    mostrarAnalisisLaboratorioDistribucion.value,
  aptitud: true,
  diagnosticos: diagnosticosDeConsultas.value.total > 0,
  inventario:
    inventarioStore.habilitado &&
    (consumoDeInsumos.value.length > 0 ||
      alertasInventario.value.conExistencia > 0 ||
      hayAlertas(alertasInventario.value)),
}));

// ---- Comparativo: el periodo elegido contra otro, con el mismo centro y los mismos filtros

const modoComparacion = ref('anterior');
const comparacion = ref(null); // { desde, hasta, datos }
const comparando = ref(false);
const errorComparacion = ref('');
let consultaDeComparacion = 0;

const periodoComparable = computed(() =>
  rangoInvalido.value ? null : periodoDeReferencia(fechaInicio.value, fechaFin.value, modoComparacion.value),
);

// Al cambiar lo que se ve, la comparación anterior ya no corresponde
watch(
  [fechaInicio, fechaFin, modoComparacion, () => JSON.stringify(filtrosPoblacion), () => route.params.idEmpresa],
  () => {
    consultaDeComparacion++;
    comparacion.value = null;
    comparando.value = false;
    errorComparacion.value = '';
  },
);

const compararPeriodos = async () => {
  const referencia = periodoComparable.value;
  if (!referencia || comparando.value) return;
  const esta = ++consultaDeComparacion;
  comparando.value = true;
  errorComparacion.value = '';
  try {
    const datos = await Promise.all(
      centrosTrabajo.value.map((centro) =>
        trabajadoresStore.fetchDashboardData(
          String(route.params.idEmpresa),
          centro._id,
          referencia.desde,
          referencia.hasta,
          parametrosDeFiltros(filtrosPoblacion),
        ),
      ),
    );
    if (esta !== consultaDeComparacion) return;
    comparacion.value = { ...referencia, datos };
  } catch {
    if (esta !== consultaDeComparacion) return;
    errorComparacion.value = 'No se pudo consultar el periodo de comparación.';
  } finally {
    if (esta === consultaDeComparacion) comparando.value = false;
  }
};

const fechaLarga = (iso) => new Date(iso).toLocaleDateString('es-MX', { timeZone: 'UTC' });

const filasComparativas = computed(() =>
  comparacion.value
    ? comparar(
        indicadoresDelPeriodo(dashboardData.value, indiceCentroSeleccionado.value),
        indicadoresDelPeriodo(comparacion.value.datos, indiceCentroSeleccionado.value),
      )
    : [],
);

const diagnosticosComparados = computed(() =>
  comparacion.value
    ? {
        referencia: diagnosticoPrincipal(comparacion.value.datos, indiceCentroSeleccionado.value),
        actual: diagnosticoPrincipal(dashboardData.value, indiceCentroSeleccionado.value),
      }
    : null,
);

/** La misma comparación, como tabla para el resumen ejecutivo y el Excel. */
const tablaComparativa = computed(() =>
  comparacion.value
    ? {
        seccion: 'Comparativo',
        titulo: `Comparación con el periodo del ${fechaLarga(comparacion.value.desde)} al ${fechaLarga(comparacion.value.hasta)}`,
        columnas: ['Indicador', 'Periodo de comparación', 'Periodo actual', 'Cambio'],
        filas: filasComparativas.value.map((fila) => [
          fila.titulo,
          textoDeValor(fila.referencia, fila.unidad),
          textoDeValor(fila.actual, fila.unidad),
          textoDeCambio(fila),
        ]),
      }
    : null,
);

// ---- Comparativo entre centros: los datos de cada centro ya están cargados, no hace consultas

const comparativoDeCentros = computed(() =>
  centrosTrabajo.value.length > 1 && dashboardData.value.length
    ? compararCentros(dashboardData.value, centrosTrabajo.value)
    : null,
);

const tablaPorCentro = computed(() =>
  comparativoDeCentros.value
    ? {
        seccion: 'Por centro',
        titulo: 'Indicadores por centro de trabajo',
        columnas: columnasDeCentros(comparativoDeCentros.value),
        filas: comparativoDeCentros.value.filas.map((fila) => [
          fila.nombre,
          fila.activos,
          ...fila.indicadores.map((indicador) => textoDeValor(indicador.valor, indicador.unidad)),
        ]),
      }
    : null,
);

// ---- Resumen ejecutivo y datos en Excel: se arman con los datos del tablero en ese momento

const fuentesDeInforme = () => ({
      datos: dashboardData.value,
      indiceCentro: indiceCentroSeleccionado.value,
      conFiltros: hayFiltrosPoblacion.value,
      // Salud visual, gabinete y tamizajes ya están calculados para la pantalla
      tablasDePantalla: [
        { seccion: 'Salud visual', titulo: 'Agudeza visual sin corrección', filas: tablaVisionSinCorreccion.value },
        { seccion: 'Gabinete', titulo: 'Audiometría', filas: tablaAudiometriaDistribucion.value },
        { seccion: 'Gabinete', titulo: 'Espirometría', filas: tablaEspirometriaDistribucion.value },
        { seccion: 'Gabinete', titulo: 'Electrocardiograma', filas: tablaEkgDistribucion.value },
        { seccion: 'Gabinete', titulo: 'Rayos X', filas: tablaRayosXDistribucion.value },
        { seccion: 'Gabinete', titulo: 'Análisis de laboratorio', filas: tablaAnalisisLaboratorioDistribucion.value },
        { seccion: 'Salud mental', titulo: 'Tamizaje de trastorno límite de la personalidad', filas: tablaTamizajeTLP.value },
      ],
      insumos: inventarioStore.habilitado
        ? consumoDeInsumos.value.map((fila) => ({
            nombre: fila.insumo.nombre,
            unidad: fila.insumo.unidad,
            consumo: fila.consumo,
            administrado: fila.administrado,
            entregado: fila.entregado,
            bajas: fila.bajas,
          }))
        : [],
});

const contextoDeInforme = () => ({
      empresa: empresasStore.currentEmpresa?.nombreComercial ?? '',
      centro: centroSeleccionado.value,
      periodo: periodoReporte.value,
      segmento: textoFiltrosPoblacion.value,
      comparativo: tablaComparativa.value,
      porCentro: tablaPorCentro.value,
      responsable: nombreMedicoFirmanteDashboard.value ?? '',
      fecha: new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }),
      conclusiones: informePersonalizacionStore.currentPersonalizacion?.conclusiones ?? '',
      recomendaciones:
        informePersonalizacionStore.currentPersonalizacion?.formatoRecomendaciones === 'tabla'
          ? ''
          : (informePersonalizacionStore.currentPersonalizacion?.recomendacionesTexto ?? ''),
      recomendacionesTabla:
        informePersonalizacionStore.currentPersonalizacion?.formatoRecomendaciones === 'tabla'
          ? (informePersonalizacionStore.currentPersonalizacion?.recomendacionesTabla ?? [])
          : [],
});

const armarInformeDelTablero = () => armarInforme(fuentesDeInforme(), contextoDeInforme());
const armarInformeTematico = (tema) => informeTematico(tema, fuentesDeInforme(), contextoDeInforme());

// Con el inventario apagado, su sección no existe: tampoco se anuncia como «sin registros»
const seccionesDelTablero = computed(() =>
  SECCIONES_DE_TABLERO.filter((seccion) => seccion.id !== 'inventario' || inventarioStore.habilitado),
);

const seccionesVisibles = computed(() =>
  seccionesDelTablero.value.filter((seccion) => seccionConDatos.value[seccion.id]),
);
const seccionesSinDatos = computed(() =>
  seccionesDelTablero.value.filter((seccion) => !seccionConDatos.value[seccion.id]),
);

const cifrasDelTablero = computed(() =>
  cifrasClave(dashboardData.value, indiceCentroSeleccionado.value, hayFiltrosPoblacion.value),
);

/** Puestos de los centros que se ven; conserva el elegido aunque ese centro no lo tenga. */
const puestosParaFiltro = computed(() => {
  const puestos = puestosDisponibles(dashboardData.value, indiceCentroSeleccionado.value);
  return filtrosPoblacion.puesto && !puestos.includes(filtrosPoblacion.puesto)
    ? [filtrosPoblacion.puesto, ...puestos]
    : puestos;
});

const irASeccion = (id) => {
  document.getElementById(`tablero-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const GRID_COLS_XL = 4;

const avanzarColumnaGridXl = (col, width) => {
  if (width <= 0) return col;
  if (col + width > GRID_COLS_XL) {
    col = 0;
  }
  col += width;
  if (col >= GRID_COLS_XL) {
    col = 0;
  }
  return col;
};

const evaluarGrupoEstudiosClinicos = (col, mostrarProporcion, mostrarDistribucion) => {
  const columnasGrupo =
    (mostrarProporcion ? 1 : 0) + (mostrarDistribucion ? 2 : 0);

  if (mostrarProporcion) {
    col = avanzarColumnaGridXl(col, 1);
  }
  if (mostrarDistribucion) {
    col = avanzarColumnaGridXl(col, 2);
  }

  const mostrarEspacio = columnasGrupo === 3 && col === 3;
  if (mostrarEspacio) {
    col = 0;
  }

  return { col, mostrarEspacio };
};

const espaciosVaciosGridDashboard = computed(() => {
  // Los estudios de gabinete tienen su propia sección: su cuadrícula empieza en la primera columna
  let col = 0;

  const audiometria = evaluarGrupoEstudiosClinicos(
    col,
    mostrarAudiometriaProporcion.value,
    mostrarAudiometriaDistribucion.value
  );
  col = audiometria.col;

  const espirometria = evaluarGrupoEstudiosClinicos(
    col,
    mostrarEspirometriaProporcion.value,
    mostrarEspirometriaDistribucion.value
  );
  col = espirometria.col;

  const ekg = evaluarGrupoEstudiosClinicos(
    col,
    mostrarEkgProporcion.value,
    mostrarEkgDistribucion.value
  );
  col = ekg.col;

  const rayosX = evaluarGrupoEstudiosClinicos(
    col,
    mostrarRayosXProporcion.value,
    mostrarRayosXDistribucion.value
  );

  return {
    entreAudiometriaYEspirometria: audiometria.mostrarEspacio,
    entreEspirometriaYEkg: espirometria.mostrarEspacio,
    entreEkgYRayosX: ekg.mostrarEspacio,
    entreRayosXYAnalisisLaboratorio: rayosX.mostrarEspacio,
  };
});

// Computed para tabla y grafica de consultas
const totalConsultas = computed(() => {
  if (!dashboardData.value.length) return 0;

  const fechas = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) =>
        (d.consultas?.[0] || []).map(c => c.fechaNotaMedica)
      )
    : (dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.consultas?.[0] || []).map(c => c.fechaNotaMedica);

  return fechas.length; // Cambiado: ahora retorna todas las consultas, no solo las de los últimos 30 días
});

// Computed para rango de periodo
const rangoPeriodo = computed(() => {
  // Si no hay fechas seleccionadas o el rango es inválido, mostrar texto general
  if (!fechaInicio.value || !fechaFin.value || rangoInvalido.value) {
    return 'Total de consultas médicas registradas';
  }
  
  // Si hay un periodo válido activo, mostrar el rango específico
  const inicio = new Date(fechaInicio.value).toLocaleDateString('es-MX', { timeZone: 'UTC' });
  const fin = new Date(fechaFin.value).toLocaleDateString('es-MX', { timeZone: 'UTC' });
  return `Total de consultas en el periodo\n${inicio} - ${fin}`;
})

const periodoReporte = computed(() => {
  if (!fechaInicio.value || !fechaFin.value || rangoInvalido.value) {
    return 'Todos los registros históricos';
  }
  
  const inicio = new Date(fechaInicio.value).toLocaleDateString('es-MX', { timeZone: 'UTC' });
  const fin = new Date(fechaFin.value).toLocaleDateString('es-MX', { timeZone: 'UTC' });
  return `Periodo del ${inicio} al ${fin}`;
});

// Computed para tabla y grafica de exposición a agentes de riesgo
const tablaAgentesRiesgo = computed(() => {
  if (!dashboardData.value.length) return [];

  const trabajadores = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.agentesRiesgo[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.agentesRiesgo[0] || [];

  return contarAgentesRiesgo(trabajadores);
});

const graficaAgentesRiesgoData = computed(() => {
  const conteo = tablaAgentesRiesgo.value;

  return {
    labels: conteo.map(([agente]) => etiquetasAgentesRiesgo[agente] || agente),
    datasets: [
      {
        label: 'Expuestos',
        data: conteo.map(([, cantidad]) => cantidad),
        backgroundColor: '#4B5563' // Gris oscuro
      }
    ]
  };
});

const graficaAgentesRiesgoOptions = {
  indexAxis: 'y',
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      callbacks: {
        title: (context) => {
          const raw = context[0].label;
          return etiquetasAgentesRiesgo[raw] || raw;
        },
        label: (context) => {
          const index = context.dataIndex;
          const [_, cantidad, porcentaje] = tablaAgentesRiesgo.value[index];
          return `Expuestos: ${cantidad} (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      anchor: 'end',
      align: 'end',
      color: '#374151',
      font: { weight: 'bold', size: 12 },
      formatter: (_valor, context) => {
        const index = context.dataIndex;
        const [_, cantidad, porcentaje] = tablaAgentesRiesgo.value[index];
        return `${cantidad} (${porcentaje}%)`;
      }
    }
  },
  layout: {
    padding: {
      right: 60
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { display: false },
      ticks: {
        stepSize: 1,
        maxTicksLimit: 10,
        color: '#374151',
        font: { size: 12 }
      }
    },
    y: {
      grid: { display: false },
      ticks: {
        callback: (label, index) => {
          const maybeLabel = graficaAgentesRiesgoData.value.labels?.[index];
          return maybeLabel || '';
        },
        color: '#374151',
        font: { size: 12 }
      }
    }
  },
  onHover: (event, elements) => {
    const canvas = event.chart?.canvas;
    if (canvas) {
      canvas.style.cursor = elements.length ? 'pointer' : 'default';
    }
  }
};

// Opciones específicas para PDF con contorno negro
const graficaAgentesRiesgoOptionsPDF = {
  indexAxis: 'y',
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      callbacks: {
        title: (context) => {
          const raw = context[0].label;
          return etiquetasAgentesRiesgo[raw] || raw;
        },
        label: (context) => {
          const index = context.dataIndex;
          const [_, cantidad, porcentaje] = tablaAgentesRiesgo.value[index];
          return `Expuestos: ${cantidad} (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      anchor: 'end',
      align: 'end',
      color: '#374151',
      font: { weight: 'bold', size: 12 },
      formatter: (_valor, context) => {
        const index = context.dataIndex;
        const [_, cantidad, porcentaje] = tablaAgentesRiesgo.value[index];
        return `${cantidad} (${porcentaje}%)`;
      }
    }
  },
  layout: {
    padding: {
      right: 60
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { display: false },
      ticks: {
        stepSize: 1,
        maxTicksLimit: 10,
        color: '#374151',
        font: { size: 12 }
      }
    },
    y: {
      grid: { display: false },
      ticks: {
        callback: (label, index) => {
          const maybeLabel = graficaAgentesRiesgoData.value.labels?.[index];
          return maybeLabel || '';
        },
        color: '#374151',
        font: { size: 12 }
      }
    }
  },
  onHover: (event, elements) => {
    const canvas = event.chart?.canvas;
    if (canvas) {
      canvas.style.cursor = elements.length ? 'pointer' : 'default';
    }
  },
  elements: {
    bar: {
      borderWidth: 1,
      borderColor: '#000000'
    }
  }
};

// Computed para tabla y grafica de grupos etarios
const tablaGruposEtariosFiltrada = computed(() => {
  if (!dashboardData.value.length) return [];

  // Si se selecciona "Todos", usar toda la data
  if (centroSeleccionado.value === 'Todos') {
    const conjunto = dashboardData.value.flatMap((d) => d.grupoEtario);
    return ordenarPorGrupoEtario(clasificarPorEdadYSexo(conjunto));
  }

  // Si se selecciona un centro específico
  const index = centrosTrabajo.value.findIndex(
    (centro) => centro.nombreCentro === centroSeleccionado.value
  );

  if (index === -1) return [];

  const grupo = dashboardData.value[index].grupoEtario || [];
  return ordenarPorGrupoEtario(clasificarPorEdadYSexo(grupo));
});

const graficaGruposEtariosData = computed(() => {
  const etiquetas = tablaGruposEtariosFiltrada.value.map(([grupo]) => grupo)
  const hombres = tablaGruposEtariosFiltrada.value.map(([, datos]) => datos.Masculino)
  const mujeres = tablaGruposEtariosFiltrada.value.map(([, datos]) => datos.Femenino)

  return {
    labels: etiquetas,
    datasets: [
      {
        label: 'Hombres',
        data: hombres,
        // backgroundColor: '#4B5563', // Gris oscuro
        backgroundColor: '#0ea5e9', // sky-500
        stack: 'Stack 0'
      },
      {
        label: 'Mujeres',
        data: mujeres,
        // backgroundColor: '#9CA3AF', // Gris medio
        backgroundColor: '#f43f5e', // rose-500
        stack: 'Stack 0'
      }
    ]
  }
})

const graficaGruposEtariosOptions = {
  // indexAxis: 'y', // HORIZONTAL
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true },
    datalabels: {
      color: '#FFFFFF', // blanco
      anchor: 'center', // puede ser 'center', 'start', 'end'
      align: 'center', // 'top', 'bottom', 'left', 'right', 'center'
      formatter: (value) => value > 0 ? value : '',
      font: {
        weight: 'bold',
        size: 12
      },
      clamp: true
    }
  },
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      ticks: {
      color: '#374151',
      font: { size: 12 },
    }
    },
    y: {
      stacked: true,
      grid: { display: false },
      ticks: {
      color: '#374151',
      font: { size: 12 },
    }
    }
  }
}

// Opciones específicas para PDF con contorno negro
const graficaGruposEtariosOptionsPDF = {
  // indexAxis: 'y', // HORIZONTAL
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true },
    datalabels: {
      color: '#FFFFFF', // blanco
      anchor: 'center', // puede ser 'center', 'start', 'end'
      align: 'center', // 'top', 'bottom', 'left', 'right', 'center'
      formatter: (value) => value > 0 ? value : '',
      font: {
        weight: 'bold',
        size: 12
      },
      clamp: true
    }
  },
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      ticks: {
      color: '#374151',
      font: { size: 12 },
    }
    },
    y: {
      stacked: true,
      grid: { display: false },
      ticks: {
      color: '#374151',
      font: { size: 12 },
    }
    }
  },
  elements: {
    bar: {
      borderWidth: 1,
      borderColor: '#000000'
    }
  }
}

// Handlers para ir a la vista de trabajadores con filtros aplicados
function manejarRedireccionFiltroChart(labelOriginal, filtroId, mapaValores = {}) {
  if (centroSeleccionado.value === 'Todos') {
    toast.open({
      message: 'Selecciona un centro de trabajo para ver los trabajadores correspondientes.',
      type: 'info'
    });
    return;
  }

  const valorFiltro = mapaValores[labelOriginal] ?? labelOriginal;
  const empresaId = String(route.params.idEmpresa);
  const centro = centrosTrabajo.value.find(c => c.nombreCentro === centroSeleccionado.value);
  if (!centro) return;

  // La tabla abre con el mismo segmento del tablero, hasta donde sabe filtrar
  const delTablero = filtrosParaLaTabla(filtrosPoblacion);
  if (delTablero.sinEquivalente.length) {
    toast.open({
      message: `La tabla de trabajadores no filtra por ${delTablero.sinEquivalente.join(' ni por ')}: verás también a quienes están fuera de ese rango.`,
      type: 'info',
      duration: 7000,
    });
  }

  router.push({
    name: 'trabajadores',
    params: {
      idEmpresa: empresaId,
      idCentroTrabajo: centro._id
    },
    query: {
      ...delTablero.consulta,
      [filtroId]: valorFiltro
    }
  });
}

function handleClickGraficaIMC(evt, elements) {
  if (!elements.length) return;

  const index = elements[0].index;
  const label = graficaIMCData.value.labels[index]; // ← categoría IMC

  manejarRedireccionFiltroChart(label, 'imc');
}

function handleClickTablaIMC(categoria) {
  if (centroSeleccionado.value === 'Todos') {
    toast.open({
      message: 'Selecciona un centro de trabajo para ver los trabajadores con esa categoría de IMC.',
      type: 'info'
    });
    return;
  }

  manejarRedireccionFiltroChart(categoria, 'imc');
}

function handleClickGraficaAptitud(evt, elements) {
  if (!elements.length) return;

  const index = elements[0].index;
  const label = graficaAptitudData.value.labels[index]; // ← Resultado de aptitud

  manejarRedireccionFiltroChart(label, 'aptitud');
}

function handleClickTablaAptitud(categoria) {
  if (centroSeleccionado.value === 'Todos') {
    toast.open({
      message: 'Selecciona un centro de trabajo para ver los trabajadores con esa aptitud.',
      type: 'info'
    });
    return;
  }

  manejarRedireccionFiltroChart(categoria, 'aptitud');
}

function handleClickGraficaAgentesRiesgo(evt, elements) {
  if (!elements.length) return;

  const index = elements[0].index;
  const label = graficaAgentesRiesgoData.value.labels[index]; // Ej: 'Ruido', 'Químicos', etc.

  manejarRedireccionFiltroChart(label, 'exposicion');
}

function handleClickGraficaRequierenLentes(evt, elements) {
  if (!elements.length) return;
  const index = elements[0].index;
  const label = graficaRequierenLentesData.value.chart.labels[index];
  manejarRedireccionFiltroChart(label, 'lentes');
}

function handleClickGraficaVistaCorregida(evt, elements) {
  if (!elements.length) return;
  const index = elements[0].index;
  const label = graficaVistaCorregidaData.value.chart.labels[index];
  manejarRedireccionFiltroChart(label, 'correccionVisual');
}

function handleClickGraficaDaltonismo(evt, elements) {
  if (!elements.length) return;
  const index = elements[0].index;
  const label = graficaDaltonismoData.value.chart.labels[index];
  manejarRedireccionFiltroChart(label, 'daltonismo', {
    'Daltónicos': 'Daltonismo',
    'Sin daltonismo': 'Normal'
  });
}

function handleClickTablaAgudeza(categoria) {
  if (centroSeleccionado.value === 'Todos') {
    toast.open({
      message: 'Selecciona un centro de trabajo para ver los trabajadores correspondientes.',
      type: 'info'
    });
    return;
  }

  manejarRedireccionFiltroChart(categoria, 'agudeza');
}

function handleClickTablaEnfermedades(condicion) {
  if (centroSeleccionado.value === 'Todos') {
    toast.open({
      message: 'Selecciona un centro de trabajo para ver los trabajadores correspondientes.',
      type: 'info'
    });
    return;
  }

  // Mapeo de campo original al filtro que tienes en la vista de trabajadores
  const campoFiltro = {
    diabeticosPP: 'diabetico',
    hipertensivosPP: 'hipertensivo',
    cardiopaticosPP: 'cardiopatico',
    epilepticosPP: 'epilepsia',
    respiratorios: 'respiratorio',
    alergicos: 'alergia',
  }[condicion];

  if (!campoFiltro) return;

  manejarRedireccionFiltroChart('Si', campoFiltro); // ← Todos son casos positivos ("Si")
}

function handleClickTablaAntecedentes(condicion) {
  if (centroSeleccionado.value === 'Todos') {
    toast.open({
      message: 'Selecciona un centro de trabajo para ver los trabajadores correspondientes.',
      type: 'info'
    });
    return;
  }

  const campoFiltro = {
    lumbalgias: 'lumbalgia',
    accidentes: 'accidente',
    quirurgicos: 'quirurgico',
    otros: 'otro'
  }[condicion];

  if (!campoFiltro) return;

  manejarRedireccionFiltroChart('Si', campoFiltro);
}

function handleClickConsultas() {
  if (totalConsultas.value === 0) return;

  if (centroSeleccionado.value === 'Todos') {
    toast.open({
      message: 'Selecciona un centro de trabajo para ver los trabajadores con consultas médicas recientes.',
      type: 'info'
    });
    return;
  }

  manejarRedireccionFiltroChart('Si', 'consultas');
}

function handleClickGraficaCintura(evt, elements) {
  if (!elements.length) return;
  const index = elements[0].index;
  const label = graficaCircunferenciaData.value.chart.labels[index]; // Ej: 'Bajo Riesgo', 'Alto Riesgo', etc.
  manejarRedireccionFiltroChart(label, 'cintura');
}

function handleClickGraficaSexo(evt, elements) {
  if (!elements.length) return;
  const datasetIndex = elements[0].datasetIndex;
  const label = graficaSexoData.value.chart.datasets[datasetIndex].label; // 'Hombres' o 'Mujeres'
  manejarRedireccionFiltroChart(label, 'sexo', {
    'Hombres': 'Masculino',
    'Mujeres': 'Femenino'
  });
}

function handleClickGraficaTensionArterial(evt, elements) {
  if (!elements.length) return;
  const index = elements[0].index;
  const label = graficaTensionArterialData.value.labels[index];
  manejarRedireccionFiltroChart(label, 'tensionArterial');
}

function handleClickTablaTensionArterial(categoria) {
  if (centroSeleccionado.value === 'Todos') {
    toast.open({
      message: 'Selecciona un centro de trabajo para ver los trabajadores con esa categoría de tensión arterial.',
      type: 'info'
    });
    return;
  }

  manejarRedireccionFiltroChart(categoria, 'tensionArterial');
}

function handleClickTablaSexo(sexo) {
  if (centroSeleccionado.value === 'Todos') {
    toast.open({
      message: 'Selecciona un centro de trabajo para ver los trabajadores por sexo.',
      type: 'info'
    });
    return;
  }

  manejarRedireccionFiltroChart(sexo, 'sexo', {
    'Masculino': 'Masculino',
    'Femenino': 'Femenino'
  });
}

function handleClickTablaCintura(categoria) {
  if (centroSeleccionado.value === 'Todos') {
    toast.open({
      message: 'Selecciona un centro de trabajo para ver los trabajadores con esa categoría de riesgo por cintura.',
      type: 'info'
    });
    return;
  }

  manejarRedireccionFiltroChart(categoria, 'cintura');
}

function handleClickTablaAudiometriaDistribucion(categoria) {
  if (centroSeleccionado.value === 'Todos') {
    toast.open({
      message: 'Selecciona un centro de trabajo para ver los trabajadores con esa categoría de audiometría.',
      type: 'info'
    });
    return;
  }

  // Mapeo directo de categorías de audiometría (ahora usamos categoriaAudiometria)
  const mapaCategoriaAudiometria = {
    'Normal': 'Normal',
    'Hipoacusia leve': 'Hipoacusia leve',
    'Hipoacusia moderada': 'Hipoacusia moderada',
    'H. moderada-severa': 'H. moderada-severa',
    'Hipoacusia severa': 'Hipoacusia severa',
    'Hipoacusia profunda': 'Hipoacusia profunda'
  };

  const valorFiltro = mapaCategoriaAudiometria[categoria];
  if (!valorFiltro) return;

  manejarRedireccionFiltroChart(valorFiltro, 'categoriaAudiometria');
}

function handleClickGraficaAudiometriaDistribucion(evt, elements) {
  if (!elements.length) return;

  const index = elements[0].index;
  const label = graficaAudiometriaDistribucionData.value.labels[index]; // ← categoría de audiometría

  // Mapeo directo de categorías de audiometría (ahora usamos categoriaAudiometria)
  const mapaCategoriaAudiometria = {
    'Normal': 'Normal',
    'Hipoacusia leve': 'Hipoacusia leve',
    'Hipoacusia moderada': 'Hipoacusia moderada',
    'H. moderada-severa': 'H. moderada-severa',
    'Hipoacusia severa': 'Hipoacusia severa',
    'Hipoacusia profunda': 'Hipoacusia profunda'
  };

  const valorFiltro = mapaCategoriaAudiometria[label];
  if (!valorFiltro) return;

  manejarRedireccionFiltroChart(valorFiltro, 'categoriaAudiometria');
}

function handleClickGraficaAudiometriaProporcion(evt, elements) {
  if (!elements.length) return;

  const index = elements[0].index;
  const label = graficaAudiometriaProporcionData.value.chart.labels[index]; // ← Normal o Anormal

  // Mapeo directo de las etiquetas a los valores del filtro
  const mapaAudiometria = {
    'Normal': 'Normal',
    'Anormal': 'Anormal'
  };

  const valorFiltro = mapaAudiometria[label];
  if (!valorFiltro) return;

  manejarRedireccionFiltroChart(valorFiltro, 'audiometria');
}

const obtenerBase64Logo = async (ruta) => {
  const res = await fetch(ruta);
  const blob = await res.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Funciones para el modal de personalización
const abrirModalPersonalizacion = () => {
  mostrarModalPersonalizacion.value = true;
};

const cerrarModalPersonalizacion = () => {
  mostrarModalPersonalizacion.value = false;
};


const logoBase64 = ref();

// Variables para el modal de personalización
const mostrarModalPersonalizacion = ref(false);

watch(
  () => empresasStore.currentEmpresa,
  async (nuevaEmpresa) => {
    if (nuevaEmpresa?.logotipoEmpresa?.data) {
      const rutaLogo = `/uploads/logos/${nuevaEmpresa.logotipoEmpresa.data}`;
      logoBase64.value = await obtenerBase64Logo(rutaLogo);
    }
  },
  { immediate: true }
);

function limpiarFechas() {
  fechaInicio.value = null;
  fechaFin.value = null;
  periodoPredefinido.value = '';
}

const tablaCintura = computed(() => {
  if (!dashboardData.value.length) return [];

  const datos = centroSeleccionado.value === 'Todos'
    ? dashboardData.value.flatMap((d) => d.circunferenciaCintura[0] || [])
    : dashboardData.value[
        centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value)
      ]?.circunferenciaCintura[0] || [];

  const resultado = calcularCircunferenciaCintura(datos);
  const total = resultado.chart.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 0;
  
  return resultado.chart.labels.map((label, index) => {
    const cantidad = resultado.chart.datasets[0].data[index];
    const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;
    return [label, cantidad, porcentaje];
  });
});


</script>

<template>
  <Transition appear mode="out-in" name="slide-up">
    <div>
      <div class="mx-auto">
        <div v-if="!empresasStore.currentEmpresa" class="text-center py-8">
          <p class="text-gray-600 text-lg">Loading empresa data...</p>
        </div>

        <div v-else>
          <!-- Header con logo a la izquierda y datos a la derecha -->
          <div class="flex flex-col xl:flex-row xl:items-start gap-4 xl:gap-6 mb-4">
            <img
              v-if="empresasStore.currentEmpresa.logotipoEmpresa?.data"
              :src="'/uploads/logos/' + empresasStore.currentEmpresa.logotipoEmpresa.data + '?t=' + empresasStore.currentEmpresa.updatedAt"
              :alt="'Logo de ' + empresasStore.currentEmpresa.nombreComercial"
              class="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded mx-auto xl:mx-0"
            />
            <div v-else class="empresa-item-placeholder w-full sm:w-48 h-28 sm:h-32 flex flex-col items-center justify-center bg-gradient-to-r from-gray-200 to-gray-300 text-gray-500 rounded text-center px-4 border-2 border-dashed border-gray-400 mx-auto xl:mx-0">
                <i class="empresa-item-placeholder-icon fas fa-camera text-3xl sm:text-4xl mb-2"></i> <!-- Icono de FontAwesome -->
                <span class="text-xs sm:text-sm text-center">Identifica más rápido a tu cliente agregando un logotipo</span>
            </div>

            <div class="text-center sm:text-left">
                <h1 class="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-800">{{ empresasStore.currentEmpresa.nombreComercial }}</h1>
                <h2 class="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-600 mt-1">{{ empresasStore.currentEmpresa.razonSocial }}</h2>
            </div>

            <div class="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 w-full xl:w-auto xl:ml-auto">
              <!-- Indicador de total de trabajadores -->
              <div class="bg-white border border-gray-200 shadow-md rounded-xl px-4 sm:px-6 py-3 text-center w-full md:w-auto">
                <div class="text-xs text-gray-500 flex items-center justify-center gap-1 sm:gap-2">
                  <i class="fas fa-users text-gray-400"></i>
                  <span class="hidden md:inline">Trabajadores evaluados</span>
                  <span class="md:hidden font-medium">Trabajadores</span>
                </div>
                <div class="text-xl sm:text-2xl font-bold text-emerald-600 leading-tight">{{ totalTrabajadores }}</div>
              </div>
              
              <!-- Selector de centro de trabajo -->
              <div class="w-full md:w-auto">
                <label class="block text-xs md:text-sm font-medium text-gray-700">Centro de trabajo</label>
                <select
                v-model="centroSeleccionado"
                class="border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-2 sm:py-1 rounded-md shadow-sm text-xs md:text-sm font-medium text-gray-700 bg-white transition duration-150 ease-in-out mt-1 w-full"
                >
                  <option v-for="nombre in centrosTrabajoOptions" :key="nombre" :value="nombre">{{ nombre }}</option>
                </select>
              </div>
            </div>
          </div>
        
        <!-- Ajustado a nivel del encabezado -->
        <div class="mb-4 flex flex-col xl:flex-row xl:items-end gap-4 xl:gap-6">
          <div class="flex flex-col sm:flex-row sm:flex-wrap items-stretch gap-3 sm:gap-4 w-full">
            <!-- Botón para personalizar informe -->
            <button
              @click="abrirModalPersonalizacion"
              class="w-full sm:w-auto justify-center gap-2 px-4 py-2 rounded-lg shadow transition duration-300 flex items-center bg-blue-600 hover:bg-blue-700 text-white"
              title="Personalizar secciones del informe"
            >
              <i class="fas fa-edit mr-1"></i>
              Conclusiones y recomendaciones
            </button>
            
            <div class="w-full sm:w-auto">
              <DescargarInformeDashboard
              v-if="dashboardData.length > 0"
              :empresa-id="String(route.params.idEmpresa)"
              :refs-graficas="{
                imc: { ref: refIMC, config: { type: 'bar', data: graficaIMCData, options: graficaIMCOptionsPDF } },
                aptitud: { ref: refAptitud, config: { type: 'bar', data: graficaAptitudData, options: graficaAptitudOptionsPDF } },
                lentes: { ref: refLentes, config: { type: 'doughnut', data: graficaRequierenLentesData.chart, options: opcionesGenericasAnilloPDF } },
                corregida: { ref: refCorregida, config: { type: 'doughnut', data: graficaVistaCorregidaData.chart, options: opcionesGenericasAnilloPDF } },
                daltonismo: { ref: refDaltonismo, config: { type: 'doughnut', data: graficaDaltonismoData.chart, options: opcionesGenericasAnilloPDF } },
                audiometriaProporcion: { ref: refAudiometriaProporcion, config: { type: 'doughnut', data: graficaAudiometriaProporcionData.chart, options: opcionesGenericasAnilloPDF } },
                audiometriaDistribucion: { ref: refAudiometriaDistribucion, config: { type: 'bar', data: graficaAudiometriaDistribucionData, options: graficaAudiometriaDistribucionOptionsPDF } },
                espirometriaProporcion: { ref: refEspirometriaProporcion, config: { type: 'doughnut', data: graficaEspirometriaProporcionData.chart, options: opcionesGenericasAnilloPDF } },
                espirometriaDistribucion: { ref: refEspirometriaDistribucion, config: { type: 'bar', data: graficaEspirometriaDistribucionData, options: graficaEspirometriaDistribucionOptions } },
                ekgProporcion: { ref: refEkgProporcion, config: { type: 'doughnut', data: graficaEkgProporcionData.chart, options: opcionesGenericasAnilloPDF } },
                ekgDistribucion: { ref: refEkgDistribucion, config: { type: 'bar', data: graficaEkgDistribucionData, options: graficaEkgDistribucionOptions } },
                rayosXProporcion: { ref: refRayosXProporcion, config: { type: 'doughnut', data: graficaRayosXProporcionData.chart, options: opcionesGenericasAnilloPDF } },
                rayosXDistribucion: { ref: refRayosXDistribucion, config: { type: 'bar', data: graficaRayosXDistribucionData, options: graficaRayosXDistribucionOptions } },
                analisisLaboratorioProporcion: { ref: refAnalisisLaboratorioProporcion, config: { type: 'doughnut', data: graficaAnalisisLaboratorioProporcionData.chart, options: opcionesGenericasAnilloPDF } },
                analisisLaboratorioDistribucion: { ref: refAnalisisLaboratorioDistribucion, config: { type: 'bar', data: graficaAnalisisLaboratorioDistribucionData, options: graficaAnalisisLaboratorioDistribucionOptions } },
                tamizajeBipolarTEA: { config: { type: 'doughnut', data: graficaTamizajeBipolarTEAData.chart, options: opcionesGenericasAnilloPDF } },
                tamizajeProdromal: { config: { type: 'doughnut', data: graficaTamizajeProdromalData.chart, options: opcionesGenericasAnilloPDF } },
                tamizajeTLP: { config: { type: 'bar', data: graficaFranjasTLPData, options: graficaFranjasTLPOptions } },
                agentes: { ref: refAgentes, config: { type: 'bar', data: graficaAgentesRiesgoData, options: graficaAgentesRiesgoOptionsPDF } },
                grupos: { ref: refGruposEtarios, config: { type: 'bar', data: graficaGruposEtariosData, options: graficaGruposEtariosOptionsPDF } },
                cintura: { ref: refCircunferencia, config: { type: 'bar', data: graficaCircunferenciaData.chart, options: graficaCircunferenciaOptionsPDF } },
                sexo: { ref: refSexo, config: { type: 'pie', data: graficaSexoData, options: opcionesGraficaPastelSexoPDF } },
                tensionArterial: { ref: refTensionArterial, config: { type: 'bar', data: graficaTensionArterialData, options: graficaTensionArterialOptionsPDF } }
              }"
              :nombre-empresa="empresasStore.currentEmpresa?.nombreComercial"
              :razon-social="empresasStore.currentEmpresa?.razonSocial"
              :titulo-medico-firmante="medicoFirmanteStore.medicoFirmante?.tituloProfesional"
              :nombre-medico-firmante="nombreMedicoFirmanteDashboard"
              :logo-base64="logoBase64"
              :periodo="periodoReporte"
              :total-trabajadores="totalTrabajadores"
              :centro-trabajo="centroSeleccionado"
              :segmento="textoFiltrosPoblacion"
              :tablas-datos="{
                imc: tablaIMC,
                aptitud: tablaAptitud,
                enfermedades: tablaEnfermedades,
                antecedentes: tablaAntecedentes,
                agentesRiesgo: tablaAgentesRiesgo,
                vision: tablaVisionSinCorreccion,
                gruposEtarios: tablaGruposEtariosFiltrada,
                lentes: graficaRequierenLentesData,
                vistaCorregida: graficaVistaCorregidaData,
                daltonismo: graficaDaltonismoData,
                audiometriaProporcion: graficaAudiometriaProporcionData,
                audiometriaDistribucion: graficaAudiometriaDistribucionData,
                espirometriaProporcion: graficaEspirometriaProporcionData,
                espirometriaDistribucion: graficaEspirometriaDistribucionData,
                ekgProporcion: graficaEkgProporcionData,
                ekgDistribucion: graficaEkgDistribucionData,
                rayosXProporcion: graficaRayosXProporcionData,
                rayosXDistribucion: graficaRayosXDistribucionData,
                analisisLaboratorioProporcion: graficaAnalisisLaboratorioProporcionData,
                analisisLaboratorioDistribucion: graficaAnalisisLaboratorioDistribucionData,
                tamizajeBipolarTEA: graficaTamizajeBipolarTEAData,
                tamizajeProdromal: graficaTamizajeProdromalData,
                tamizajeTLP: graficaFranjasTLPData,
                cintura: graficaCircunferenciaData,
                sexo: tablaSexoPDF,
                tensionArterial: tablaTensionArterial
              }"
              :conclusiones="informePersonalizacionStore.currentPersonalizacion?.conclusiones"
              :formato-recomendaciones="informePersonalizacionStore.currentPersonalizacion?.formatoRecomendaciones"
              :recomendaciones-texto="informePersonalizacionStore.currentPersonalizacion?.recomendacionesTexto"
              :recomendaciones-tabla="informePersonalizacionStore.currentPersonalizacion?.recomendacionesTabla"
            />
            </div>

            <!-- Otros informes: resumen ejecutivo y datos en Excel -->
            <InformesAdicionalesDashboard
              v-if="dashboardData.length > 0"
              :empresa-id="String(route.params.idEmpresa)"
              :total-trabajadores="totalTrabajadores"
              :armar="armarInformeDelTablero"
              :armar-tema="armarInformeTematico"
            />
          </div>
          
          <!-- Filtro de periodo -->
          <div class="flex flex-col justify-end text-xs w-full xl:w-auto">
            <div class="flex items-center gap-2">
              <label class="block text-xs font-medium text-gray-700 mb-1">Periodo</label>
              <transition name="fade">
                <button 
                  v-if="fechaInicio || fechaFin"
                  @click="limpiarFechas"
                  class="block text-xs font-medium mb-1 text-red-600 hover:text-red-500"
                >
                  &nbsp;
                  <i class="fa-solid fa-calendar-xmark"></i>
                  &nbsp;Limpiar
                </button>
              </transition>
            </div>

            <div class="flex flex-col sm:flex-row sm:items-end sm:justify-end gap-3 sm:gap-2">
              <!-- Select de periodos predefinidos -->
              <div class="flex flex-col w-full sm:w-auto">
                <label class="text-[11px] text-gray-500 mb-0.5">Periodo rápido</label>
                <select
                  v-model="periodoPredefinido"
                  @change="manejarCambioPeriodo(periodoPredefinido)"
                  class="border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-2 sm:py-1 rounded-md shadow-sm text-xs text-gray-700 bg-white transition duration-150 ease-in-out w-full sm:min-w-[140px]"
                >
                  <option value="">Seleccionar periodo</option>
                  <option v-for="opcion in opcionesPeriodo" :key="opcion" :value="opcion">{{ opcion }}</option>
                </select>
              </div>

              <!-- Fecha inicio -->
              <div class="flex flex-col w-full sm:w-auto">
                <label for="fechaInicio" class="text-[11px] text-gray-500 mb-0.5">Inicio</label>
                <input
                  id="fechaInicio"
                  type="date"
                  v-model="fechaInicio"
                  class="border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-2 sm:py-1 rounded-md shadow-sm text-xs text-gray-700 bg-white transition w-full"
                />
              </div>
              <!-- Fecha fin -->
              <div class="flex flex-col w-full sm:w-auto">
                <label for="fechaFin" class="text-[11px] text-gray-500 mb-0.5">Final</label>
                <input
                  id="fechaFin"
                  type="date"
                  v-model="fechaFin"
                  class="border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-2 sm:py-1 rounded-md shadow-sm text-xs text-gray-700 bg-white transition w-full"
                />
              </div>
            </div>

            <!-- Testigo de filtro -->
            <!-- Este div externo SIEMPRE existe y tiene una altura mínima -->
            <div class="min-h-[1.5rem]">
              <!-- Aquí va el elemento que aparece/desaparece -->
              <transition name="fade">
                <div
                  v-if="fechaInicio && fechaFin"
                  class="flex items-center gap-1 mt-2"
                >
                  <!-- Contenido del testigo -->
                  <i
                    :class="[
                      'fas',
                      'text-xs',
                      rangoInvalido ? 'fa-circle-exclamation text-rose-500' : 'fa-filter text-emerald-500'
                    ]"
                  ></i>
                  <span
                    :class="[
                      'text-xs',
                      rangoInvalido ? 'text-rose-600' : 'text-emerald-600'
                    ]"
                  >
                    {{ rangoInvalido
                      ? 'Filtro no aplicado: corrige el orden de las fechas'
                      : `Filtro aplicado: ${new Date(fechaInicio).toLocaleDateString('es-MX', { timeZone: 'UTC' })} - ${new Date(fechaFin).toLocaleDateString('es-MX', { timeZone: 'UTC' })}` }}
                  </span>
                </div>
              </transition>
            </div>

          </div>
        </div>

          <!-- Filtros de población -->
          <div
            class="dashboard-filtros mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3"
            data-test="filtros-poblacion"
          >
            <div class="flex flex-wrap items-end gap-x-3 gap-y-2">
              <p class="mb-1.5 mr-1 flex items-center gap-1.5 text-xs font-medium text-gray-700">
                <i class="fas fa-filter text-emerald-600" aria-hidden="true"></i>
                Trabajadores
              </p>
              <label class="flex flex-col">
                <span class="mb-0.5 text-[11px] text-gray-500">Puesto</span>
                <select v-model="filtrosPoblacion.puesto" class="dashboard-filtros__campo border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-2 sm:py-1 rounded-md shadow-sm text-xs text-gray-700 bg-white max-w-[14rem]" data-test="filtro-puesto">
                  <option value="">Todos</option>
                  <option v-for="puesto in puestosParaFiltro" :key="puesto" :value="puesto">{{ puesto }}</option>
                </select>
              </label>
              <label class="flex flex-col">
                <span class="mb-0.5 text-[11px] text-gray-500">Sexo</span>
                <select v-model="filtrosPoblacion.sexo" class="dashboard-filtros__campo border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-2 sm:py-1 rounded-md shadow-sm text-xs text-gray-700 bg-white" data-test="filtro-sexo">
                  <option value="">Todos</option>
                  <option v-for="sexo in SEXOS" :key="sexo" :value="sexo">{{ sexo }}</option>
                </select>
              </label>
              <label class="flex flex-col">
                <span class="mb-0.5 text-[11px] text-gray-500">Edad</span>
                <select v-model="filtrosPoblacion.edad" class="dashboard-filtros__campo border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-2 sm:py-1 rounded-md shadow-sm text-xs text-gray-700 bg-white" data-test="filtro-edad">
                  <option value="">Todas</option>
                  <option v-for="rango in RANGOS_DE_EDAD" :key="rango.clave" :value="rango.clave">{{ rango.texto }}</option>
                </select>
              </label>
              <label class="flex flex-col">
                <span class="mb-0.5 text-[11px] text-gray-500">Antigüedad</span>
                <select v-model="filtrosPoblacion.antiguedad" class="dashboard-filtros__campo border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-2 sm:py-1 rounded-md shadow-sm text-xs text-gray-700 bg-white" data-test="filtro-antiguedad">
                  <option value="">Todas</option>
                  <option v-for="rango in RANGOS_DE_ANTIGUEDAD" :key="rango.clave" :value="rango.clave">{{ rango.texto }}</option>
                </select>
              </label>
              <label class="flex flex-col">
                <span class="mb-0.5 text-[11px] text-gray-500">Expuestos a</span>
                <select v-model="filtrosPoblacion.agente" class="dashboard-filtros__campo border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-2 sm:py-1 rounded-md shadow-sm text-xs text-gray-700 bg-white" data-test="filtro-agente">
                  <option value="">Cualquier agente</option>
                  <option v-for="(etiqueta, agente) in etiquetasAgentesRiesgo" :key="agente" :value="agente">{{ agente }}</option>
                </select>
              </label>
              <button
                v-if="hayFiltrosPoblacion"
                type="button"
                class="mb-1 text-xs font-medium text-red-600 hover:text-red-500"
                data-test="quitar-filtros"
                @click="limpiarFiltrosPoblacion"
              >
                <i class="fa-solid fa-filter-circle-xmark mr-1" aria-hidden="true"></i>Quitar filtros
              </button>
            </div>
            <p v-if="hayFiltrosPoblacion" class="mt-2 text-xs text-emerald-700" data-test="filtros-aplicados">
              Todo el tablero se refiere a: {{ textoFiltrosPoblacion }}
            </p>
          </div>

          <div
            v-if="dashboardLoading"
            class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 mb-8 auto-rows-[360px] sm:auto-rows-[400px] md:auto-rows-[430px] lg:auto-rows-[460px]"
          >
            <DashboardChartSkeleton v-for="n in 8" :key="'dashboard-skel-' + n" />
          </div>

          <div v-else>
            <!-- Cifras clave -->
            <dl class="dashboard-cifras mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4" data-test="cifras-clave">
              <div
                v-for="cifra in cifrasDelTablero"
                :key="cifra.clave"
                class="dashboard-cifra rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <dt class="text-xs font-medium text-gray-500">{{ cifra.titulo }}</dt>
                <dd class="mt-0.5 text-2xl font-semibold tabular-nums text-gray-900">{{ cifra.valor }}</dd>
                <dd class="min-h-[1rem] text-xs text-gray-500">{{ cifra.detalle }}</dd>
              </div>
            </dl>

            <!-- Índice de secciones -->
            <nav class="dashboard-indice mb-6 flex flex-wrap items-center gap-2" aria-label="Secciones del tablero">
              <button
                v-for="seccion in [SECCION_COMPARATIVO, ...seccionesVisibles]"
                :key="seccion.id"
                type="button"
                class="dashboard-indice__enlace inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 transition-colors duration-150 hover:border-emerald-400 hover:text-emerald-700"
                data-test="indice-seccion"
                @click="irASeccion(seccion.id)"
              >
                <i :class="[seccion.icono, 'text-xs']" aria-hidden="true"></i>
                {{ seccion.titulo }}
              </button>
            </nav>

            <!-- Comparar periodos -->
            <section id="tablero-comparativo" class="dashboard-seccion mb-8 scroll-mt-4" data-test="seccion-comparativo">
              <h2 class="dashboard-seccion__titulo mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
                <i :class="[SECCION_COMPARATIVO.icono, 'text-emerald-600']" aria-hidden="true"></i>
                {{ SECCION_COMPARATIVO.titulo }}
              </h2>
              <div class="dashboard-cifra rounded-lg border border-gray-200 bg-white px-4 py-3">
                <p v-if="!periodoComparable" class="text-sm text-gray-500" data-test="comparativo-sin-periodo">
                  Elige un periodo arriba para compararlo con otro. Sin periodo, el tablero muestra todo el historial y no
                  hay contra qué comparar.
                </p>
                <template v-else>
                  <div class="flex flex-wrap items-end gap-3">
                    <label class="flex flex-col">
                      <span class="mb-0.5 text-[11px] text-gray-500">Comparar el periodo elegido contra</span>
                      <select
                        v-model="modoComparacion"
                        class="dashboard-filtros__campo border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-2 sm:py-1 rounded-md shadow-sm text-xs text-gray-700 bg-white"
                        data-test="modo-comparacion"
                      >
                        <option v-for="modo in MODOS_DE_COMPARACION" :key="modo.valor" :value="modo.valor">{{ modo.texto }}</option>
                      </select>
                    </label>
                    <p class="mb-1 text-xs text-gray-500" data-test="periodo-referencia">
                      Del {{ fechaLarga(periodoComparable.desde) }} al {{ fechaLarga(periodoComparable.hasta) }}
                    </p>
                    <button
                      type="button"
                      class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      :disabled="comparando || dashboardLoading"
                      data-test="comparar"
                      @click="compararPeriodos"
                    >
                      <i :class="comparando ? 'fas fa-spinner fa-spin' : 'fas fa-code-compare'" class="text-xs"></i>
                      {{ comparando ? 'Comparando...' : comparacion ? 'Volver a comparar' : 'Comparar' }}
                    </button>
                  </div>
                  <p v-if="errorComparacion" class="mt-2 text-sm text-red-600">{{ errorComparacion }}</p>

                  <div v-if="comparacion" class="mt-3 overflow-x-auto">
                    <table class="w-full min-w-[36rem] text-left text-sm" data-test="tabla-comparativa">
                      <thead>
                        <tr class="border-b border-gray-200 text-xs text-gray-500">
                          <th scope="col" class="py-1.5 pr-3 font-medium">Indicador</th>
                          <th scope="col" class="px-3 py-1.5 text-right font-medium">
                            {{ fechaLarga(comparacion.desde) }} – {{ fechaLarga(comparacion.hasta) }}
                          </th>
                          <th scope="col" class="px-3 py-1.5 text-right font-medium">Periodo actual</th>
                          <th scope="col" class="py-1.5 pl-3 text-right font-medium">Cambio</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-100">
                        <tr v-for="fila in filasComparativas" :key="fila.clave" data-test="fila-comparativa">
                          <td class="lista-conteos__etiqueta py-1.5 pr-3 text-gray-800">{{ fila.titulo }}</td>
                          <td class="px-3 py-1.5 text-right tabular-nums text-gray-600">{{ textoDeValor(fila.referencia, fila.unidad) }}</td>
                          <td class="lista-conteos__cantidad px-3 py-1.5 text-right font-semibold tabular-nums text-gray-900">
                            {{ textoDeValor(fila.actual, fila.unidad) }}
                          </td>
                          <td
                            class="whitespace-nowrap py-1.5 pl-3 text-right font-medium tabular-nums"
                            :class="{
                              'text-red-600': fila.lectura === 'desfavorable',
                              'text-emerald-600': fila.lectura === 'favorable',
                              'text-gray-600': fila.lectura === 'neutra',
                            }"
                          >
                            <i
                              v-if="fila.sentido === 'sube' || fila.sentido === 'baja'"
                              :class="fila.sentido === 'sube' ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"
                              class="mr-1 text-[10px]"
                              aria-hidden="true"
                            ></i>
                            {{ textoDeCambio(fila) }}
                          </td>
                        </tr>
                        <tr v-if="diagnosticosComparados && (diagnosticosComparados.referencia || diagnosticosComparados.actual)">
                          <td class="lista-conteos__etiqueta py-1.5 pr-3 text-gray-800">Diagnóstico más frecuente</td>
                          <td class="px-3 py-1.5 text-right text-xs text-gray-600">{{ diagnosticosComparados.referencia || '—' }}</td>
                          <td class="px-3 py-1.5 text-right text-xs text-gray-800">{{ diagnosticosComparados.actual || '—' }}</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                    <p class="mt-2 text-xs text-gray-500">
                      Los porcentajes se calculan sobre los trabajadores evaluados en cada periodo; «pp» son puntos
                      porcentuales. La plantilla es la actual en ambos periodos. El cambio se marca en rojo o verde solo
                      donde subir o bajar tiene una lectura clara.
                    </p>
                  </div>
                </template>
              </div>

              <!-- Entre centros de trabajo -->
              <div
                v-if="comparativoDeCentros"
                class="dashboard-cifra mt-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
                data-test="comparativo-centros"
              >
                <h3 class="dashboard-seccion__titulo text-sm font-semibold text-gray-800">Entre centros de trabajo</h3>
                <div class="mt-2 overflow-x-auto">
                  <table class="w-full min-w-[52rem] text-left text-sm">
                    <thead>
                      <tr class="border-b border-gray-200 text-xs text-gray-500">
                        <th
                          v-for="(columna, i) in columnasDeCentros(comparativoDeCentros)"
                          :key="columna"
                          scope="col"
                          class="py-1.5 font-medium"
                          :class="i ? 'px-2 text-right' : 'pr-3'"
                        >
                          {{ columna }}
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                      <tr
                        v-for="fila in comparativoDeCentros.filas"
                        :key="fila.id"
                        :class="{ 'font-semibold': fila.nombre === centroSeleccionado }"
                        data-test="fila-centro"
                      >
                        <td class="lista-conteos__etiqueta py-1.5 pr-3 text-gray-800">{{ fila.nombre }}</td>
                        <td class="px-2 py-1.5 text-right tabular-nums text-gray-600">{{ fila.activos }}</td>
                        <td
                          v-for="indicador in fila.indicadores"
                          :key="indicador.clave"
                          class="px-2 py-1.5 text-right tabular-nums"
                          :class="comparativoDeCentros.menosFavorable[indicador.clave] === fila.id ? 'text-red-600 font-semibold' : 'text-gray-700'"
                          :title="indicador.base !== undefined ? `Sobre ${indicador.base} evaluados` : ''"
                        >
                          {{ textoDeValor(indicador.valor, indicador.unidad) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p class="mt-2 text-xs text-gray-500">
                  Con el periodo y los filtros elegidos, sin importar el centro seleccionado arriba. En rojo, el centro
                  con el valor menos favorable de cada indicador; con pocos evaluados, una diferencia grande puede no
                  significar nada (pasa el cursor para ver sobre cuántos se calculó).
                </p>
              </div>
            </section>

            <section
              v-show="seccionConDatos.poblacion"
              id="tablero-poblacion"
              class="dashboard-seccion mb-8 scroll-mt-4"
              data-test="seccion-poblacion"
            >
              <h2 class="dashboard-seccion__titulo mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
                <i :class="[SECCIONES_DE_TABLERO[0].icono, 'text-emerald-600']" aria-hidden="true"></i>
                {{ SECCIONES_DE_TABLERO[0].titulo }}
              </h2>
              <div :class="gridTarjetas">

            <!-- Distribución por Sexo -->
            <div v-if="chartWaveVisible(1)" class="bg-gray-50 p-4 sm:p-6 rounded-lg shadow flex flex-col">
              <!-- Header con tooltip -->
              <div class="flex items-start justify-between border-b border-gray-200 pb-2 mb-4 gap-2">
                <h3 class="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                  Distribución sexos
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span
                      class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-60 sm:w-64 text-xs sm:text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                    >
                      Proporción de trabajadores según su sexo <span class="font-semibold text-rose-600">masculino o femenino</span>, con el objetivo de analizar la distribución y características de la población evaluada.
                    </span>
                  </span>
                </h3>
                <div class="flex gap-2">
                  <button
                    @click="vistaSexo = 'grafico'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaSexo === 'grafico'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Gráfico
                  </button>
                  <button
                    @click="vistaSexo = 'tabla'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaSexo === 'tabla'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Tabla
                  </button>
                </div>
              </div>

              <!-- Gráfica -->
              <div class="flex-1">
                <Transition name="fade" mode="out-in">
                  <template v-if="vistaSexo === 'grafico'">
                    <GraficaPastel
                      v-if="graficaSexoData.labels?.length"
                      ref="refSexo"
                      :key="vistaSexoKey"
                      :data="graficaSexoData"
                      :options="opcionesGraficaPastelSexo"
                    />
                  </template>

                  <template v-else>
                    <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                      <thead class="bg-gray-100 text-gray-700">
                        <tr>
                          <th class="py-2 px-4 text-left text-base sm:text-lg lg:text-xl">Sexo</th>
                          <th class="py-2 px-4 text-center text-base sm:text-lg lg:text-xl">Trabajadores</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="[sexo, cantidad, porcentaje] in tablaSexo"
                          :key="sexo"
                          class="border-t hover:bg-gray-200 transition cursor-pointer"
                          @click="handleClickTablaSexo(sexo)"
                        >
                          <td class="py-1 px-4 font-medium text-gray-700 text-base sm:text-lg lg:text-xl">{{ sexo }}</td>
                          <td class="py-1 px-4 text-center text-base sm:text-lg lg:text-xl">
                            <span
                              :class="[
                                sexo === 'Masculino' ? 'text-blue-700' : (sexo === 'Femenino' ? 'text-pink-700' : 'text-gray-700')
                              ]"
                            >
                              {{ cantidad }}
                            </span>
                            <span class="text-sm text-gray-500"> ({{ porcentaje }}%)</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </template>
                </Transition>
              </div>
            </div>

            <!-- Grupos Etarios: 2 columnas -->
            <div v-if="chartWaveVisible(1)" class="bg-gray-50 p-4 sm:p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-2 xl:col-span-2">
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4 gap-2">
                <h3 class="text-base sm:text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Distribución por Grupos Etarios
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span
                      class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-xs sm:text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                    >
                      Muestra la cantidad de trabajadores activos agrupados por rangos de edad y sexo, permitiendo identificar la <span class="font-semibold text-emerald-600">composición demográfica</span> de la plantilla laboral.
                    </span>
                  </span>
                </h3>
                <div class="flex gap-2">
                  <button
                    @click="vistaGruposEtarios = 'grafico'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaGruposEtarios === 'grafico'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Gráfico
                  </button>
                  <button
                    @click="vistaGruposEtarios = 'tabla'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaGruposEtarios === 'tabla'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Tabla
                  </button>
                </div>
              </div>

              <div class="flex-1 overflow-x-auto">
                <Transition name="fade" mode="out-in">
                  <template v-if="vistaGruposEtarios === 'grafico'">
                    <GraficaBarras ref="refGruposEtarios" :key="vistaGruposEtariosKey" :data="graficaGruposEtariosData" :options="graficaGruposEtariosOptions" />
                  </template>

                  <template v-else>
                    <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                      <thead class="bg-gray-100 text-gray-700">
                        <tr>
                          <th class="py-2 px-4 text-left text-base sm:text-lg lg:text-xl">Grupo Etario</th>
                          <th class="py-2 px-4 text-center text-base sm:text-lg lg:text-xl">Hombres</th>
                          <th class="py-2 px-4 text-center text-base sm:text-lg lg:text-xl">Mujeres</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="[grupo, datos] in tablaGruposEtariosFiltrada"
                          :key="grupo"
                          class="border-t hover:bg-gray-200 transition"
                        >
                          <td class="py-1 px-4 font-medium text-gray-700 text-base sm:text-lg lg:text-xl">{{ grupo }}</td>
                          <td class="py-1 px-4 text-center text-blue-700 text-base sm:text-lg lg:text-xl">{{ datos.Masculino }}</td>
                          <td class="py-1 px-4 text-center text-pink-700 text-base sm:text-lg lg:text-xl">{{ datos.Femenino }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </template>
                </Transition>
              </div>
            </div>

            <!-- Cintura -->
            <div v-if="chartWaveVisible(3)" class="bg-gray-50 p-4 sm:p-6 rounded-lg shadow flex flex-col">
              <div class="flex items-start justify-between border-b border-gray-200 pb-2 mb-4 gap-2">
                <!-- Título + descripción -->
                <div class="flex flex-col gap-0.5">
                  <h3 class="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                    Riesgo por Cintura
                    <span class="relative cursor-help">
                      <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                      <span
                        class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-60 sm:w-64 text-xs sm:text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                      >
                        La circunferencia de cintura elevada se asocia con <span class="font-semibold text-rose-600">mayor riesgo de enfermedades</span> como diabetes, hipertensión y trastornos metabólicos.
                      </span>
                    </span>
                  </h3>
                </div>
                <div class="flex gap-2">
                  <button
                    @click="vistaCintura = 'grafico'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaCintura === 'grafico'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Gráfico
                  </button>
                  <button
                    @click="vistaCintura = 'tabla'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaCintura === 'tabla'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Tabla
                  </button>
                </div>
              </div>
              
              <div class="flex-1">
                <Transition name="fade" mode="out-in">
                  <template v-if="vistaCintura === 'grafico'">
                    <GraficaBarras
                      v-if="graficaCircunferenciaData.chart?.labels?.length"
                      ref="refCircunferencia"
                      :key="vistaCinturaKey"
                      :data="graficaCircunferenciaData.chart"
                      :options="{ ...graficaCircunferenciaOptions, onClick: handleClickGraficaCintura }"
                    />
                  </template>

                  <template v-else>
                    <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                      <thead class="bg-gray-100 text-gray-700">
                        <tr>
                          <th class="py-2 px-4 text-left text-base sm:text-lg lg:text-xl">Categoría</th>
                          <th class="py-2 px-4 text-center text-base sm:text-lg lg:text-xl">Trabajadores</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="[categoria, cantidad, porcentaje] in tablaCintura"
                          :key="categoria"
                          class="border-t hover:bg-gray-200 transition cursor-pointer"
                          @click="handleClickTablaCintura(categoria)"
                        >
                          <td class="py-1 px-4 font-medium text-gray-700 text-base sm:text-lg lg:text-xl">{{ categoria }}</td>
                          <td
                            :class="[
                              'py-1 px-4 text-center text-base sm:text-lg lg:text-xl',
                              categoria === 'Bajo Riesgo'
                                ? 'text-emerald-700'
                                : categoria === 'Alto Riesgo'
                                  ? 'text-rose-600'
                                  : 'text-amber-600'
                            ]"
                          >
                            {{ cantidad }} <span class="text-sm text-gray-500">({{ porcentaje }}%)</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </template>
                </Transition>
              </div>
            </div>

            <!-- Alteraciones en la presión arterial -->
            <div v-if="chartWaveVisible(3)" class="bg-gray-50 p-4 sm:p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-2 xl:col-span-2">
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4 gap-2">
                <h3 class="text-base sm:text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Alteraciones en la presión arterial
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span
                      class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 sm:w-72 text-xs sm:text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                    >
                      Distribución de trabajadores según las <span class="font-semibold text-rose-600">categorías de presión arterial</span>, con el propósito de identificar posibles alteraciones y niveles de riesgo cardiovascular en la población evaluada.
                    </span>
                  </span>
                </h3>
                <div class="flex gap-2">
                  <button
                    @click="vistaTensionArterial = 'grafico'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaTensionArterial === 'grafico'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Gráfico
                  </button>
                  <button
                    @click="vistaTensionArterial = 'tabla'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaTensionArterial === 'tabla'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Tabla
                  </button>
                </div>
              </div>
              <div class="flex-1 overflow-x-auto">
                <Transition name="fade" mode="out-in">
                  <template v-if="vistaTensionArterial === 'grafico'">
                    <GraficaBarras 
                      ref="refTensionArterial"
                      :key="vistaTensionArterialKey" 
                      :data="graficaTensionArterialData" 
                      :options="{ ...graficaTensionArterialOptions, onClick: handleClickGraficaTensionArterial }" />
                  </template>

                  <template v-else>
                    <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                      <thead class="bg-gray-100 text-gray-700">
                        <tr>
                          <th class="py-2 px-4 text-left text-base sm:text-lg lg:text-xl">Categoría</th>
                          <th class="py-2 px-4 text-center text-base sm:text-lg lg:text-xl">Trabajadores</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="[categoria, cantidad, porcentaje] in tablaTensionArterial"
                          :key="categoria"
                          class="border-t hover:bg-gray-200 transition cursor-pointer"
                          @click="handleClickTablaTensionArterial(categoria)"
                        >
                          <td class="py-1 px-4 font-medium text-gray-700 text-base sm:text-lg lg:text-xl">{{ categoria }}</td>
                          <td
                            :class="[
                              'py-1 px-4 text-center text-base sm:text-lg lg:text-xl',
                              categoria === 'Óptima'
                                ? 'text-emerald-700'
                                : categoria === 'Normal'
                                  ? 'text-green-600'
                                  : categoria === 'Alta'
                                    ? 'text-amber-600'
                                    : categoria === 'Hipertensión grado 1'
                                      ? 'text-orange-600'
                                      : 'text-rose-600'
                            ]"
                          >
                            {{ cantidad }} <span class="text-sm text-gray-500">({{ porcentaje }}%)</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </template>
                </Transition>
              </div>
            </div>

            <!-- IMC: 2 columnas -->
            <div v-if="chartWaveVisible(2)" class="bg-gray-50 p-4 sm:p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-2 xl:col-span-2">
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4 gap-2">
                <h3 class="text-base sm:text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Distribución por categoría de IMC
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span
                      class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 sm:w-72 text-xs sm:text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                    >
                      El IMC ayuda a evaluar si el peso de una persona es apropiado para su estatura y puede indicar <span class="font-semibold text-rose-600">riesgos de salud</span> asociados al sobrepeso o bajo peso.
                    </span>
                  </span>
                </h3>
                <div class="flex gap-2">
                  <button
                    @click="vistaIMC = 'grafico'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaIMC === 'grafico'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Gráfico
                  </button>
                  <button
                    @click="vistaIMC = 'tabla'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaIMC === 'tabla'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Tabla
                  </button>
                </div>
              </div>
              <div class="flex-1 overflow-x-auto">
                <Transition name="fade" mode="out-in">
                  <template v-if="vistaIMC === 'grafico'">
                    <GraficaBarras 
                      ref="refIMC"
                      :key="vistaIMCKey" 
                      :data="graficaIMCData" 
                      :options="{ ...graficaIMCOptions, onClick: handleClickGraficaIMC }" />
                  </template>

                  <template v-else>
                    <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                      <thead class="bg-gray-100 text-gray-700">
                        <tr>
                          <th class="py-2 px-4 text-left text-base sm:text-lg lg:text-xl">Categoría IMC</th>
                          <th class="py-2 px-4 text-center text-base sm:text-lg lg:text-xl">Trabajadores</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="[categoria, cantidad, porcentaje] in tablaIMC"
                          :key="categoria"
                          class="border-t hover:bg-gray-200 transition cursor-pointer"
                          @click="handleClickTablaIMC(categoria)"
                        >
                          <td class="py-1 px-4 font-medium text-gray-700 text-base sm:text-lg lg:text-xl">{{ categoria }}</td>
                          <td
                            :class="[
                              'py-1 px-4 text-center text-base sm:text-lg lg:text-xl',
                              categoria === 'Normal'
                                ? 'text-emerald-700'
                                : ['Bajo peso', 'Sobrepeso'].includes(categoria)
                                  ? 'text-amber-600'
                                  : 'text-rose-600'
                            ]"
                          >
                            {{ cantidad }} <span class="text-sm text-gray-500">({{ porcentaje }}%)</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </template>
                </Transition>
              </div>
            </div>

              </div>
            </section>

            <section
              v-show="seccionConDatos.exposicion"
              id="tablero-exposicion"
              class="dashboard-seccion mb-8 scroll-mt-4"
              data-test="seccion-exposicion"
            >
              <h2 class="dashboard-seccion__titulo mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
                <i :class="[SECCIONES_DE_TABLERO[1].icono, 'text-emerald-600']" aria-hidden="true"></i>
                {{ SECCIONES_DE_TABLERO[1].titulo }}
              </h2>
              <div :class="gridTarjetas">
            <!-- Riesgos: 2 columnas --> 
            <div v-if="chartWaveVisible(3)" class="bg-gray-50 p-4 sm:p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-2 xl:col-span-2">
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4 gap-2">
                <h3 class="text-base sm:text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Exposición a factores de riesgo
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span
                      class="absolute top-1/2 right-full mr-2 -translate-y-1/2 md:left-full md:right-auto md:ml-2 md:mr-0 md:translate-y-0 w-60 sm:w-64 text-xs sm:text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                    >
                      Muestra cuántos trabajadores <span class="font-semibold text-amber-600">están expuestos</span> a elementos del entorno laboral que podrían afectar su salud, ayudando a detectar áreas con mayor riesgo ocupacional.
                    </span>
                  </span>
                </h3>

                <div class="flex gap-2">
                  <button
                    @click="vistaAgentes = 'grafico'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaAgentes === 'grafico'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Gráfico
                  </button>
                  <button
                    @click="vistaAgentes = 'tabla'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaAgentes === 'tabla'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Tabla
                  </button>
                </div>
              </div>

              <div class="flex-1 overflow-x-auto">
                <Transition name="fade" mode="out-in">
                  <template v-if="vistaAgentes === 'grafico'">
                    <GraficaBarras
                      ref="refAgentes"
                      :key="vistaAgentesKey"
                      :data="graficaAgentesRiesgoData"
                      :options="{ ...graficaAgentesRiesgoOptions, onClick: handleClickGraficaAgentesRiesgo }"
                    />
                  </template>

                  <template v-else>
                    <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                      <thead class="bg-gray-100 text-gray-700">
                        <tr>
                          <th class="py-2 px-4 text-left text-base sm:text-lg lg:text-xl">Agente de Riesgo</th>
                          <th class="py-2 px-4 text-center text-base sm:text-lg lg:text-xl">Expuestos</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="[agente, cantidad, porcentaje] in tablaAgentesRiesgo"
                          :key="agente"
                          class="border-t hover:bg-gray-200 transition"
                        >
                          <td class="py-1 px-4 font-medium text-gray-700 text-base sm:text-lg lg:text-xl">
                            {{ etiquetasAgentesRiesgo[agente] || agente }}
                          </td>
                          <td class="py-1 px-4 text-center text-base sm:text-lg lg:text-xl"
                              :class="cantidad === 0 ? 'text-emerald-700' : 'text-rose-600'"
                          >
                            {{ cantidad }} <span class="text-sm text-gray-500">({{ porcentaje }}%)</span>
                           </td>
                        </tr>
                      </tbody>
                    </table>
                  </template>
                </Transition>
              </div>
            </div>

            <!-- Crónicas --> 
            <div v-if="chartWaveVisible(2)" class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Antecedentes relacionados con enfermedades crónicas
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span
                      class="absolute top-1/2 right-full mr-2 -translate-y-1/2 md:left-full md:right-auto md:ml-2 md:mr-0 md:translate-y-0 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                    >
                      Indica si el trabajador <span class="font-semibold text-amber-600">refirió tener antecedentes</span> de enfermedades crónicas como diabetes, hipertensión, cardiopatías o epilepsia durante su historia clínica.
                    </span>
                  </span>
                </h3>
              </div>
              <div class="flex-1 overflow-x-auto">
                <Transition name="fade" mode="out-in">
                  <template v-if="vistaEnfermedades === 'grafico'">
                    <GraficaBarras 
                      :key="vistaEnfermedadesKey" 
                      :data="graficaEnfermedadesData" 
                      :options="{ ...graficaEnfermedadesOptions, onClick: handleClickGraficaEnfermedades }"
                    />
                  </template>

                  <template v-else>
                    <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                      <thead class="bg-gray-100 text-gray-700">
                        <tr>
                          <th class="py-2 px-4 text-left text-lg lg:text-xl">Antecedentes</th>
                          <th class="py-2 px-4 text-center text-lg lg:text-xl">Casos</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="[condicion, cantidad, porcentaje] in tablaEnfermedades"
                          :key="condicion"
                          class="border-t hover:bg-gray-200 cursor-pointer transition"
                          @click="handleClickTablaEnfermedades(condicion)"
                        >
                          <td class="py-1 px-4 font-medium text-gray-700 text-lg lg:text-xl">
                            {{ etiquetasEnfermedades[condicion] || condicion }}
                          </td>
                          <td
                            :class="[
                              'py-1 px-4 text-center text-lg lg:text-xl',
                              cantidad === 0 ? 'text-emerald-700' : 'text-rose-600'
                            ]"
                          >
                            {{ cantidad }} <span class="text-sm text-gray-500">({{ porcentaje }}%)</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </template>
                </Transition>
              </div>
            </div>

            <!-- Localizados --> 
            <div v-if="chartWaveVisible(2)" class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Antecedentes de problemas localizados
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span
                      class="absolute top-1/2 right-full mr-2 -translate-y-1/2 md:left-full md:right-auto md:ml-2 md:mr-0 md:translate-y-0 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                    >
                      Señala si el trabajador <span class="font-semibold text-amber-600">refirió antecedentes</span> como lumbalgias, cirugías, traumatismos o accidentes que puedan afectar zonas específicas del cuerpo.
                    </span>
                  </span>
                </h3>
              </div>

              <div class="flex-1 overflow-x-auto">
                <Transition name="fade" mode="out-in">
                  <template v-if="vistaAntecedentes === 'grafico'">
                    <GraficaBarras
                      :key="vistaAntecedentesKey"
                      :data="graficaAntecedentesData"
                      :options="graficaAntecedentesOptions"
                    />
                  </template>

                  <template v-else>
                    <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                      <thead class="bg-gray-100 text-gray-700">
                        <tr>
                          <th class="py-2 px-4 text-left text-lg lg:text-xl">Antecedentes</th>
                          <th class="py-2 px-4 text-center text-lg lg:text-xl">Casos</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="[condicion, cantidad, porcentaje] in tablaAntecedentes"
                          :key="condicion"
                          class="border-t hover:bg-gray-200 cursor-pointer transition"
                          @click="handleClickTablaAntecedentes(condicion)"
                        >
                          <td class="py-1 px-4 font-medium text-gray-700 text-lg lg:text-xl">
                            {{ etiquetasAntecedentesReferidos[condicion] || condicion }}
                          </td>
                          <td
                            :class="[
                              'py-1 px-4 text-center text-lg lg:text-xl',
                              cantidad === 0 ? 'text-emerald-700' : 'text-rose-600'
                            ]"
                          >
                            {{ cantidad }} <span class="text-sm text-gray-500">({{ porcentaje }}%)</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </template>
                </Transition>
              </div>
            </div>

              </div>
            </section>

            <section
              v-show="seccionConDatos.saludMental"
              id="tablero-saludMental"
              class="dashboard-seccion mb-8 scroll-mt-4"
              data-test="seccion-saludMental"
            >
              <h2 class="dashboard-seccion__titulo mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
                <i :class="[SECCIONES_DE_TABLERO[2].icono, 'text-emerald-600']" aria-hidden="true"></i>
                {{ SECCIONES_DE_TABLERO[2].titulo }}
              </h2>
              <div :class="gridTarjetas">
            <!-- Tamizajes psicológicos (TEA, prodromal, TLP) -->
            <div
              v-if="chartWaveVisible(3) && mostrarTamizajeBipolar"
              class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-1 xl:col-span-1"
            >
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Riesgo tamizaje bipolar (trastorno estado de ánimo)
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span
                      class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                    >
                      Proporción de trabajadores con último cuestionario en el periodo: <span class="font-semibold">Positivo</span> según criterio MDQ (≥7 «Sí» en P1, «Sí» en P2 y «Problemas moderados» o «Problemas serios» en P3). Tamizaje, no diagnóstico.
                    </span>
                  </span>
                </h3>
              </div>
              <GraficaAnillo
                v-if="graficaTamizajeBipolarTEAData.chart?.labels?.length"
                :data="graficaTamizajeBipolarTEAData.chart"
                :options="opcionesGenericasAnillo"
                :cantidad="graficaTamizajeBipolarTEAData.positivos"
                :porcentaje="graficaTamizajeBipolarTEAData.porcentaje"
              />
              <p v-else class="text-sm text-gray-500 text-center py-8">Sin evaluaciones en el periodo seleccionado.</p>
              <h4 class="mt-4 text-xs text-gray-600 font-normal italic text-center">
                Positivo / Negativo según cuestionario de trastornos del estado de ánimo.
              </h4>
            </div>

            <div
              v-if="chartWaveVisible(3) && mostrarTamizajeProdromal"
              class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-1 xl:col-span-1"
            >
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Riesgo tamizaje psicótico (prodromal breve)
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span
                      class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                    >
                      <span class="font-semibold">Positivo</span> si Frecuencia &gt; 6 y Malestar &gt; 13 (PQ-B). Tamizaje operativo, no diagnóstico.
                    </span>
                  </span>
                </h3>
              </div>
              <GraficaAnillo
                v-if="graficaTamizajeProdromalData.chart?.labels?.length"
                :data="graficaTamizajeProdromalData.chart"
                :options="opcionesGenericasAnillo"
                :cantidad="graficaTamizajeProdromalData.positivos"
                :porcentaje="graficaTamizajeProdromalData.porcentaje"
              />
              <p v-else class="text-sm text-gray-500 text-center py-8">Sin evaluaciones en el periodo seleccionado.</p>
              <h4 class="mt-4 text-xs text-gray-600 font-normal italic text-center">
                Positivo / Negativo según cuestionario prodromal breve.
              </h4>
            </div>

            <div
              v-if="chartWaveVisible(3) && mostrarTamizajeTLP"
              class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-2 xl:col-span-2"
            >
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4 gap-2">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Tamizaje rasgos límite (TLP)
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span
                      class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                    >
                      Distribución por puntaje MSI-BPD: improbable (0–4 «Sí»), posible (5–6 «Sí»), probable (7–10 «Sí»). Tamizaje, no diagnóstico.
                    </span>
                  </span>
                </h3>
                <div class="flex gap-2 shrink-0">
                  <button
                    type="button"
                    @click="vistaTamizajeTLP = 'grafico'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaTamizajeTLP === 'grafico'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Gráfico
                  </button>
                  <button
                    type="button"
                    @click="vistaTamizajeTLP = 'tabla'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaTamizajeTLP === 'tabla'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Tabla
                  </button>
                </div>
              </div>
              <div class="flex-1 min-h-[200px] overflow-x-auto">
                <Transition name="fade" mode="out-in">
                  <template v-if="vistaTamizajeTLP === 'grafico'">
                    <GraficaBarras
                      v-if="graficaFranjasTLPData.labels?.length"
                      :key="vistaTamizajeTLPKey"
                      :data="graficaFranjasTLPData"
                      :options="graficaFranjasTLPOptions"
                    />
                    <p v-else class="text-sm text-gray-500 text-center py-8">Sin evaluaciones en el periodo seleccionado.</p>
                  </template>
                  <template v-else>
                    <table
                      v-if="tablaTamizajeTLP.length"
                      class="min-w-full text-sm border border-gray-300 rounded h-full"
                    >
                      <thead class="bg-gray-100 text-gray-700">
                        <tr>
                          <th class="py-2 px-4 text-left text-base sm:text-lg lg:text-xl">Categoría</th>
                          <th class="py-2 px-4 text-center text-base sm:text-lg lg:text-xl">Trabajadores</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="[categoria, cantidad, porcentaje] in tablaTamizajeTLP"
                          :key="categoria"
                          class="border-t hover:bg-gray-50 transition"
                        >
                          <td class="py-1 px-4 font-medium text-gray-700 text-base sm:text-lg lg:text-xl">
                            {{ categoria }}
                          </td>
                          <td
                            :class="[
                              'py-1 px-4 text-center text-base sm:text-lg lg:text-xl',
                              categoria === 'Síntomas improbables'
                                ? 'text-emerald-700'
                                : cantidad === 0
                                  ? 'text-emerald-700'
                                  : 'text-amber-800'
                            ]"
                          >
                            {{ cantidad }} <span class="text-sm text-gray-500">({{ porcentaje }}%)</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <p v-else class="text-sm text-gray-500 text-center py-8">Sin evaluaciones en el periodo seleccionado.</p>
                  </template>
                </Transition>
              </div>
            </div>

              </div>
            </section>

            <section
              v-show="seccionConDatos.saludVisual"
              id="tablero-saludVisual"
              class="dashboard-seccion mb-8 scroll-mt-4"
              data-test="seccion-saludVisual"
            >
              <h2 class="dashboard-seccion__titulo mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
                <i :class="[SECCIONES_DE_TABLERO[3].icono, 'text-emerald-600']" aria-hidden="true"></i>
                {{ SECCIONES_DE_TABLERO[3].titulo }}
              </h2>
              <div :class="gridTarjetas">
            <!-- Agudeza Visual -->
            <div v-if="chartWaveVisible(4)" class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Agudeza Visual
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span
                      class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                    >
                      Categoriza el nivel de visión <span class="font-semibold text-emerald-600">sin el uso de lentes</span>, lo que permite detectar posibles dificultades visuales que puedan requerir corrección óptica.
                    </span>
                  </span>
                </h3>
              </div>

              <div class="flex-1 overflow-x-auto">
                <table class="min-w-full text-sm border border-gray-300 rounded h-full overflow-x-auto">
                  <thead class="bg-gray-100 text-gray-700">
                    <tr>
                      <th class="py-2 px-4 text-left text-lg whitespace-nowrap">Categoría</th>
                      <th class="py-2 px-4 text-center text-lg whitespace-nowrap">Trab.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="[categoria, cantidad, porcentaje] in tablaVisionSinCorreccion"
                      :key="categoria"
                      class="border-t hover:bg-gray-200 transition cursor-pointer"
                      @click="handleClickTablaAgudeza(categoria)"
                    >
                      <td class="py-1 px-4 font-medium text-gray-700 text-base whitespace-nowrap">
                        {{ etiquetasVisionSinCorreccion[categoria] || categoria }}
                      </td>
                      <td
                        :class="[ 
                        'py-1 px-4 text-center text-lg whitespace-nowrap',
                        cantidad === 0 ? 'text-emerald-700' :
                        categoria === 'Visión ligeramente reducida'
                          ? 'text-amber-600'
                          : ['Visión excepcional', 'Visión normal'].includes(categoria)
                          ? 'text-emerald-700'
                          : 'text-rose-600'
                        ]"
                      >
                        {{ cantidad }} <span class="text-sm text-gray-500">({{ porcentaje }}%)</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Requieren Lentes -->
            <div v-if="chartWaveVisible(4)" class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
              <!-- Header con tooltip -->
              <div class="flex items-start justify-between border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Requieren Lentes
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span
                      class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                    >
                      Proporción de trabajadores cuya visión indica la <span class="font-semibold text-rose-600">necesidad de usar lentes</span> para desempeñar sus actividades de manera segura y efectiva.
                    </span>
                  </span>
                </h3>
              </div>

              <!-- Gráfica -->
              <GraficaAnillo
                v-if="graficaRequierenLentesData.chart?.labels?.length"
                ref="refLentes"
                :data="graficaRequierenLentesData.chart"
                :options="{ ...opcionesGenericasAnillo, onClick: handleClickGraficaRequierenLentes }"
                :cantidad="graficaRequierenLentesData.requiere"
                :porcentaje="graficaRequierenLentesData.porcentaje"
              />

              <!-- Descripción -->
              <h4 class="mt-4 text-xs text-gray-600 font-normal italic text-center">
                Trabajadores que necesitan lentes.
              </h4>
            </div>

            <!-- Vista corregida -->
            <div v-if="chartWaveVisible(4)" class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Vista Corregida
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span
                      class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                    >
                      Proporción de trabajadores que 
                      <span class="font-semibold text-emerald-600">requieren lentes</span> 
                      y ya cuentan con 
                      <span class="font-semibold text-emerald-600">corrección visual</span>.
                    </span>
                  </span>
                </h3>
              </div>

              <GraficaAnillo
                v-if="graficaVistaCorregidaData.chart?.labels?.length"
                ref="refCorregida"
                :data="graficaVistaCorregidaData.chart"
                :options="{ ...opcionesGenericasAnillo, onClick: handleClickGraficaVistaCorregida }"
                :cantidad="graficaVistaCorregidaData.usan"
                :porcentaje="graficaVistaCorregidaData.porcentaje"
              />

              <h4 class="mt-4 text-xs text-gray-600 font-normal italic text-center">
                Trabajadores que ya corrigen su visión con lentes.
              </h4>
            </div>

            <!-- Daltonismo -->
            <div v-if="chartWaveVisible(4)" class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Daltonismo
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span
                      class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                    >
                    Informa cuántos trabajadores presentan alteraciones en la <span class="font-semibold text-amber-600">percepción de colores</span>.
                    </span>
                  </span>
                </h3>
              </div>

              <GraficaAnillo
                v-if="graficaDaltonismoData.chart?.labels?.length"
                ref="refDaltonismo"
                :data="graficaDaltonismoData.chart"
                :options="{ ...opcionesGenericasAnillo, onClick: handleClickGraficaDaltonismo }"
                :cantidad="graficaDaltonismoData.conDaltonismo"
                :porcentaje="graficaDaltonismoData.porcentaje"
              />

              <h4 class="mt-4 text-xs text-gray-600 font-normal italic text-center">
                Alteración en la percepción del color.
              </h4>
            </div>

              </div>
            </section>

            <section
              v-show="seccionConDatos.gabinete"
              id="tablero-gabinete"
              class="dashboard-seccion mb-8 scroll-mt-4"
              data-test="seccion-gabinete"
            >
              <h2 class="dashboard-seccion__titulo mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
                <i :class="[SECCIONES_DE_TABLERO[4].icono, 'text-emerald-600']" aria-hidden="true"></i>
                {{ SECCIONES_DE_TABLERO[4].titulo }}
              </h2>
              <div :class="gridTarjetas">
            <!-- Proporción Audiometría Normal/Anormal: 1 columna -->
            <div
              v-if="chartWaveVisible(4) && mostrarAudiometriaProporcion"
              class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1"
            >
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Proporción Audiometría
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      Muestra la proporción de trabajadores con <span class="font-semibold text-emerald-600">audición normal</span> vs <span class="font-semibold text-red-600">audición anormal</span> según los resultados de audiometría.
                    </span>
                  </span>
                </h3>
              </div>

              <GraficaAnillo
                v-if="graficaAudiometriaProporcionData.chart?.labels?.length"
                ref="refAudiometriaProporcion"
                :data="graficaAudiometriaProporcionData.chart"
                :options="{ ...opcionesGenericasAnillo, onClick: handleClickGraficaAudiometriaProporcion }"
                :cantidad="graficaAudiometriaProporcionData.conAnormal"
                :porcentaje="graficaAudiometriaProporcionData.porcentaje"
              />

              <h4 class="mt-4 text-xs text-gray-600 font-normal italic text-center">
                Distribución de audición normal vs anormal.
              </h4>
            </div>

            <!-- Distribución de Resultados de Audiometría: 2 columnas -->
            <div
              v-if="chartWaveVisible(4) && mostrarAudiometriaDistribucion"
              class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-2 xl:col-span-2"
            >
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Distribución Audiometría
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      Muestra la distribución de trabajadores según el grado de <span class="font-semibold text-emerald-600">Pérdida Auditiva Bilateral </span>según método AMA o <span class="font-semibold text-emerald-600">Caída Máxima </span>según método LFT en rangos específicos.
                    </span>
                  </span>
                </h3>
                <div class="flex gap-2">
                  <button
                    @click="vistaAudiometriaDistribucion = 'grafico'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaAudiometriaDistribucion === 'grafico'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Gráfico
                  </button>
                  <button
                    @click="vistaAudiometriaDistribucion = 'tabla'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaAudiometriaDistribucion === 'tabla'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Tabla
                  </button>
                </div>
              </div>

              <div class="flex-1 overflow-x-auto">
                <Transition name="fade" mode="out-in">
                  <template v-if="vistaAudiometriaDistribucion === 'grafico'">
                    <GraficaBarras
                      v-if="graficaAudiometriaDistribucionData.labels?.length"
                      ref="refAudiometriaDistribucion"
                      :key="vistaAudiometriaDistribucionKey"
                      :data="graficaAudiometriaDistribucionData"
                      :options="{ ...graficaAudiometriaDistribucionOptions, onClick: handleClickGraficaAudiometriaDistribucion, elements: { bar: { borderWidth: 1, borderColor: '#000000' } } }"
                    />
                  </template>

                  <template v-else>
                    <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                     <thead class="bg-gray-100 text-gray-700">
                       <tr>
                         <th class="py-2 px-4 text-left text-lg lg:text-xl">Categoría HBC</th>
                         <th class="py-2 px-4 text-center text-lg lg:text-xl">Trabajadores</th>
                       </tr>
                     </thead>
                 <tbody>
                   <tr
                     v-for="[categoria, cantidad, porcentaje] in tablaAudiometriaDistribucion"
                     :key="categoria"
                     class="border-t hover:bg-gray-200 transition cursor-pointer"
                     @click="handleClickTablaAudiometriaDistribucion(categoria)"
                   >
                     <td class="py-1 px-4 font-medium text-gray-700 text-lg lg:text-xl">{{ categoria }}</td>
                     <td
                       :class="[
                         'py-1 px-4 text-center text-lg lg:text-xl',
                         categoria === 'Normal'
                           ? 'text-emerald-700'
                           : categoria === 'Hipoacusia leve'
                             ? 'text-green-600'
                             : categoria === 'Hipoacusia moderada'
                               ? 'text-amber-600'
                               : categoria === 'H. moderada-severa'
                                 ? 'text-orange-600'
                                 : categoria === 'Hipoacusia severa'
                                   ? 'text-red-600'
                                   : 'text-rose-600'
                       ]"
                     >
                       {{ cantidad }} <span class="text-sm text-gray-500">({{ porcentaje }}%)</span>
                     </td>
                   </tr>
                 </tbody>
                    </table>
                  </template>
                </Transition>
              </div>

              <h4 class="mt-4 text-xs text-gray-600 font-normal italic text-center">
                Distribución por rangos de PAB (%) o Caída Máxima (dB).
              </h4>
            </div>

            <!-- Espacio vacío intencional entre Audiometría y Espirometría -->
            <div
              v-if="espaciosVaciosGridDashboard.entreAudiometriaYEspirometria"
              class="hidden xl:block bg-transparent p-6 rounded-lg shadow-none col-span-1"
            ></div>

            <!-- Proporción Espirometría -->
            <div
              v-if="chartWaveVisible(4) && mostrarEspirometriaProporcion"
              class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1"
            >
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Proporción Espirometría
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      Proporción de resultados <span class="font-semibold text-emerald-600">normales</span>, <span class="font-semibold text-amber-600">anormales</span> y <span class="font-semibold text-slate-600">no concluyentes</span> en espirometría.
                    </span>
                  </span>
                </h3>
              </div>

              <GraficaAnillo
                v-if="graficaEspirometriaProporcionData.chart?.labels?.length"
                ref="refEspirometriaProporcion"
                :data="graficaEspirometriaProporcionData.chart"
                :options="{ ...opcionesGenericasAnillo }"
                :cantidad="graficaEspirometriaProporcionData.conAnormal"
                :porcentaje="graficaEspirometriaProporcionData.porcentaje"
              />

              <h4 class="mt-4 text-xs text-gray-600 font-normal italic text-center">
                Distribución de espirometría normal vs anormal.
              </h4>
            </div>

            <!-- Distribución Espirometría -->
            <div
              v-if="chartWaveVisible(4) && mostrarEspirometriaDistribucion"
              class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-2 xl:col-span-2"
            >
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Distribución Espirometría
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      Distribución por tipo de alteración en espirometría.
                    </span>
                  </span>
                </h3>
                <div class="flex gap-2">
                  <button
                    @click="vistaEspirometriaDistribucion = 'grafico'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaEspirometriaDistribucion === 'grafico'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Gráfico
                  </button>
                  <button
                    @click="vistaEspirometriaDistribucion = 'tabla'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaEspirometriaDistribucion === 'tabla'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Tabla
                  </button>
                </div>
              </div>

              <div class="flex-1 overflow-x-auto">
                <Transition name="fade" mode="out-in">
                  <template v-if="vistaEspirometriaDistribucion === 'grafico'">
                    <GraficaBarras
                      v-if="graficaEspirometriaDistribucionData.labels?.length"
                      ref="refEspirometriaDistribucion"
                      :key="vistaEspirometriaDistribucionKey"
                      :data="graficaEspirometriaDistribucionData"
                      :options="{ ...graficaEspirometriaDistribucionOptions, elements: { bar: { borderWidth: 1, borderColor: '#000000' } } }"
                    />
                  </template>

                  <template v-else>
                    <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                      <thead class="bg-gray-100 text-gray-700">
                        <tr>
                          <th class="py-2 px-4 text-left text-lg lg:text-xl">Resultado</th>
                          <th class="py-2 px-4 text-center text-lg lg:text-xl">Trabajadores</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="[resultado, cantidad, porcentaje] in tablaEspirometriaDistribucion"
                          :key="resultado"
                          class="border-t hover:bg-gray-200 transition"
                        >
                          <td class="py-1 px-4 font-medium text-gray-700 text-lg lg:text-xl">{{ resultado }}</td>
                          <td
                            :class="[
                              'py-1 px-4 text-center text-lg lg:text-xl',
                              resultado === 'Normal' ? 'text-emerald-700' : 'text-amber-600'
                            ]"
                          >
                            {{ cantidad }}
                            <span class="text-sm text-gray-500">({{ porcentaje }}%)</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </template>
                </Transition>
              </div>

              <h4 class="mt-4 text-xs text-gray-600 font-normal italic text-center">
                Normal + tipos de alteración por espirometría.
              </h4>
            </div>

            <!-- Espacio vacío intencional entre Espirometría y EKG -->
            <div
              v-if="espaciosVaciosGridDashboard.entreEspirometriaYEkg"
              class="hidden xl:block bg-transparent p-6 rounded-lg shadow-none col-span-1"
            ></div>

            <!-- Proporción EKG -->
            <div
              v-if="chartWaveVisible(4) && mostrarEkgProporcion"
              class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1"
            >
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Proporción EKG
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      Proporción de resultados <span class="font-semibold text-emerald-600">normales</span>, <span class="font-semibold text-amber-600">anormales</span> y <span class="font-semibold text-slate-600">no concluyentes</span> en EKG.
                    </span>
                  </span>
                </h3>
              </div>

              <GraficaAnillo
                v-if="graficaEkgProporcionData.chart?.labels?.length"
                ref="refEkgProporcion"
                :data="graficaEkgProporcionData.chart"
                :options="{ ...opcionesGenericasAnillo }"
                :cantidad="graficaEkgProporcionData.conAnormal"
                :porcentaje="graficaEkgProporcionData.porcentaje"
              />

              <h4 class="mt-4 text-xs text-gray-600 font-normal italic text-center">
                Distribución de EKG normal vs anormal.
              </h4>
            </div>

            <!-- Distribución EKG -->
            <div
              v-if="chartWaveVisible(4) && mostrarEkgDistribucion"
              class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-2 xl:col-span-2"
            >
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Distribución EKG
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      Distribución por tipo de alteración en EKG.
                    </span>
                  </span>
                </h3>
                <div class="flex gap-2">
                  <button
                    @click="vistaEkgDistribucion = 'grafico'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaEkgDistribucion === 'grafico'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Gráfico
                  </button>
                  <button
                    @click="vistaEkgDistribucion = 'tabla'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaEkgDistribucion === 'tabla'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Tabla
                  </button>
                </div>
              </div>

              <div class="flex-1 overflow-x-auto">
                <Transition name="fade" mode="out-in">
                  <template v-if="vistaEkgDistribucion === 'grafico'">
                    <GraficaBarras
                      v-if="graficaEkgDistribucionData.labels?.length"
                      ref="refEkgDistribucion"
                      :key="vistaEkgDistribucionKey"
                      :data="graficaEkgDistribucionData"
                      :options="{ ...graficaEkgDistribucionOptions, elements: { bar: { borderWidth: 1, borderColor: '#000000' } } }"
                    />
                  </template>

                  <template v-else>
                    <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                      <thead class="bg-gray-100 text-gray-700">
                        <tr>
                          <th class="py-2 px-4 text-left text-lg lg:text-xl">Resultado</th>
                          <th class="py-2 px-4 text-center text-lg lg:text-xl">Trabajadores</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="[resultado, cantidad, porcentaje] in tablaEkgDistribucion"
                          :key="resultado"
                          class="border-t hover:bg-gray-200 transition"
                        >
                          <td class="py-1 px-4 font-medium text-gray-700 text-lg lg:text-xl">{{ resultado }}</td>
                          <td
                            :class="[
                              'py-1 px-4 text-center text-lg lg:text-xl',
                              resultado === 'Normal' ? 'text-emerald-700' : 'text-amber-600'
                            ]"
                          >
                            {{ cantidad }}
                            <span class="text-sm text-gray-500">({{ porcentaje }}%)</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </template>
                </Transition>
              </div>

              <h4 class="mt-4 text-xs text-gray-600 font-normal italic text-center">
                Normal + tipos de alteración por EKG.
              </h4>
            </div>

            <!-- Espacio vacío intencional entre EKG y Rayos X -->
            <div
              v-if="espaciosVaciosGridDashboard.entreEkgYRayosX"
              class="hidden xl:block bg-transparent p-6 rounded-lg shadow-none col-span-1"
            ></div>

            <!-- Proporción Rayos X -->
            <div
              v-if="chartWaveVisible(4) && mostrarRayosXProporcion"
              class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1"
            >
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Proporción Rayos X
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      Proporción de resultados <span class="font-semibold text-emerald-600">normales</span>, <span class="font-semibold text-amber-600">anormales</span> y <span class="font-semibold text-slate-600">no concluyentes</span> en rayos X.
                    </span>
                  </span>
                </h3>
              </div>

              <GraficaAnillo
                v-if="graficaRayosXProporcionData.chart?.labels?.length"
                ref="refRayosXProporcion"
                :data="graficaRayosXProporcionData.chart"
                :options="{ ...opcionesGenericasAnillo }"
                :cantidad="graficaRayosXProporcionData.conAnormal"
                :porcentaje="graficaRayosXProporcionData.porcentaje"
              />

              <h4 class="mt-4 text-xs text-gray-600 font-normal italic text-center">
                Distribución de rayos X normal vs anormal.
              </h4>
            </div>

            <!-- Distribución Rayos X -->
            <div
              v-if="chartWaveVisible(4) && mostrarRayosXDistribucion"
              class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-2 xl:col-span-2"
            >
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Distribución Rayos X
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      Distribución por categorías de alteración en rayos X (un trabajador puede contar en más de una categoría).
                    </span>
                  </span>
                </h3>
                <div class="flex gap-2">
                  <button
                    @click="vistaRayosXDistribucion = 'grafico'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaRayosXDistribucion === 'grafico'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Gráfico
                  </button>
                  <button
                    @click="vistaRayosXDistribucion = 'tabla'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaRayosXDistribucion === 'tabla'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Tabla
                  </button>
                </div>
              </div>

              <div class="flex-1 overflow-x-auto">
                <Transition name="fade" mode="out-in">
                  <template v-if="vistaRayosXDistribucion === 'grafico'">
                    <GraficaBarras
                      v-if="graficaRayosXDistribucionData.labels?.length"
                      ref="refRayosXDistribucion"
                      :key="vistaRayosXDistribucionKey"
                      :data="graficaRayosXDistribucionData"
                      :options="{ ...graficaRayosXDistribucionOptions, elements: { bar: { borderWidth: 1, borderColor: '#000000' } } }"
                    />
                  </template>

                  <template v-else>
                    <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                      <thead class="bg-gray-100 text-gray-700">
                        <tr>
                          <th class="py-2 px-4 text-left text-lg lg:text-xl">Resultado</th>
                          <th class="py-2 px-4 text-center text-lg lg:text-xl">Trabajadores</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="[resultado, cantidad, porcentaje] in tablaRayosXDistribucion"
                          :key="resultado"
                          class="border-t hover:bg-gray-200 transition"
                        >
                          <td class="py-1 px-4 font-medium text-gray-700 text-lg lg:text-xl">{{ resultado }}</td>
                          <td
                            :class="[
                              'py-1 px-4 text-center text-lg lg:text-xl',
                              resultado === 'Normal' ? 'text-emerald-700' : 'text-amber-600'
                            ]"
                          >
                            {{ cantidad }}
                            <span class="text-sm text-gray-500">({{ porcentaje }}%)</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </template>
                </Transition>
              </div>

              <h4 class="mt-4 text-xs text-gray-600 font-normal italic text-center">
                Normal + categorías de alteración en rayos X.
              </h4>
            </div>

            <!-- Espacio vacío intencional entre Rayos X y Análisis de laboratorio -->
            <div
              v-if="espaciosVaciosGridDashboard.entreRayosXYAnalisisLaboratorio"
              class="hidden xl:block bg-transparent p-6 rounded-lg shadow-none col-span-1"
            ></div>

            <!-- Proporción Análisis de laboratorio -->
            <div
              v-if="chartWaveVisible(4) && mostrarAnalisisLaboratorioProporcion"
              class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1"
            >
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Proporción Análisis de laboratorio
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      Proporción de resultados <span class="font-semibold text-emerald-600">normales</span>, <span class="font-semibold text-amber-600">anormales</span> y <span class="font-semibold text-slate-600">no concluyentes</span> en análisis de laboratorio.
                    </span>
                  </span>
                </h3>
              </div>

              <GraficaAnillo
                v-if="graficaAnalisisLaboratorioProporcionData.chart?.labels?.length"
                ref="refAnalisisLaboratorioProporcion"
                :data="graficaAnalisisLaboratorioProporcionData.chart"
                :options="{ ...opcionesGenericasAnillo }"
                :cantidad="graficaAnalisisLaboratorioProporcionData.conAnormal"
                :porcentaje="graficaAnalisisLaboratorioProporcionData.porcentaje"
              />

              <h4 class="mt-4 text-xs text-gray-600 font-normal italic text-center">
                Distribución de laboratorio normal vs anormal.
              </h4>
            </div>

            <!-- Distribución Análisis de laboratorio -->
            <div
              v-if="chartWaveVisible(4) && mostrarAnalisisLaboratorioDistribucion"
              class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-2 xl:col-span-2"
            >
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Distribución Análisis de laboratorio
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      Distribución por categorías de alteración en análisis de laboratorio (un trabajador puede contar en más de una categoría).
                    </span>
                  </span>
                </h3>
                <div class="flex gap-2">
                  <button
                    @click="vistaAnalisisLaboratorioDistribucion = 'grafico'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaAnalisisLaboratorioDistribucion === 'grafico'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Gráfico
                  </button>
                  <button
                    @click="vistaAnalisisLaboratorioDistribucion = 'tabla'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaAnalisisLaboratorioDistribucion === 'tabla'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Tabla
                  </button>
                </div>
              </div>

              <div class="flex-1 overflow-x-auto">
                <Transition name="fade" mode="out-in">
                  <template v-if="vistaAnalisisLaboratorioDistribucion === 'grafico'">
                    <GraficaBarras
                      v-if="graficaAnalisisLaboratorioDistribucionData.labels?.length"
                      ref="refAnalisisLaboratorioDistribucion"
                      :key="vistaAnalisisLaboratorioDistribucionKey"
                      :data="graficaAnalisisLaboratorioDistribucionData"
                      :options="{ ...graficaAnalisisLaboratorioDistribucionOptions, elements: { bar: { borderWidth: 1, borderColor: '#000000' } } }"
                    />
                  </template>

                  <template v-else>
                    <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                      <thead class="bg-gray-100 text-gray-700">
                        <tr>
                          <th class="py-2 px-4 text-left text-lg lg:text-xl">Resultado</th>
                          <th class="py-2 px-4 text-center text-lg lg:text-xl">Trabajadores</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="[resultado, cantidad, porcentaje] in tablaAnalisisLaboratorioDistribucion"
                          :key="resultado"
                          class="border-t hover:bg-gray-200 transition"
                        >
                          <td class="py-1 px-4 font-medium text-gray-700 text-lg lg:text-xl">{{ resultado }}</td>
                          <td
                            :class="[
                              'py-1 px-4 text-center text-lg lg:text-xl',
                              resultado === 'Normal' ? 'text-emerald-700' : 'text-amber-600'
                            ]"
                          >
                            {{ cantidad }}
                            <span class="text-sm text-gray-500">({{ porcentaje }}%)</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </template>
                </Transition>
              </div>

              <h4 class="mt-4 text-xs text-gray-600 font-normal italic text-center">
                Normal + categorías de alteración en análisis de laboratorio.
              </h4>
            </div>

              </div>
            </section>

            <section
              v-show="seccionConDatos.aptitud"
              id="tablero-aptitud"
              class="dashboard-seccion mb-8 scroll-mt-4"
              data-test="seccion-aptitud"
            >
              <h2 class="dashboard-seccion__titulo mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
                <i :class="[SECCIONES_DE_TABLERO[5].icono, 'text-emerald-600']" aria-hidden="true"></i>
                {{ SECCIONES_DE_TABLERO[5].titulo }}
              </h2>
              <div :class="gridTarjetas">
            <!-- Aptitud al Puesto: 2 columnas -->
            <div v-if="chartWaveVisible(2)" class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-2 xl:col-span-2">
              <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  Aptitud al Puesto
                  <span class="relative cursor-help">
                    <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                    <span class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      Resume si el trabajador está <span class="font-semibold text-emerald-600">apto</span> para desempeñar su función, considerando su estado de salud y los riesgos del puesto evaluado. <span class="text-amber-600">Incluye tanto trabajadores activos como inactivos.</span>
                    </span>
                  </span>
                </h3>
                <div class="flex gap-2">
                  <button
                    @click="vistaAptitud = 'grafico'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaAptitud === 'grafico'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Gráfico
                  </button>
                  <button
                    @click="vistaAptitud = 'tabla'"
                    :class="[
                      'px-3 py-1 rounded text-sm font-medium',
                      vistaAptitud === 'tabla'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    Tabla
                  </button>
                </div>
              </div>

              <div class="flex-1 overflow-x-auto">
                <Transition name="fade" mode="out-in">
                  <template v-if="vistaAptitud === 'grafico'">
                    <GraficaBarras 
                      ref="refAptitud"
                      :key="vistaAptitudKey" 
                      :data="graficaAptitudData" 
                      :options="{ ...graficaAptitudOptions, onClick: handleClickGraficaAptitud }" />
                  </template>

                  <template v-else>
                    <!-- Aquí va la tabla que ya preparamos -->
                    <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                      <thead class="bg-gray-100 text-gray-700">
                        <tr>
                          <th class="py-2 px-4 text-left text-lg lg:text-xl">Resultado</th>
                          <th class="py-2 px-4 text-center text-lg lg:text-xl">Trabajadores</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="[categoria, cantidad, porcentaje] in tablaAptitud"
                          :key="categoria"
                          class="border-t hover:bg-gray-200 transition cursor-pointer"
                          @click="handleClickTablaAptitud(categoria)"
                        >
                        <td class="py-1 px-4 font-medium text-gray-700 text-lg lg:text-xl">
                          {{ etiquetasAptitudPuestoTabla[categoria] || categoria }}
                        </td>
                          <td
                            :class="[
                              'py-1 px-4 text-center text-lg lg:text-xl',
                              categoria === 'Apto Sin Restricciones' ? 'text-emerald-700' :
                              categoria === 'Apto Con Precaución' ? 'text-amber-600' :
                              categoria === 'Apto Con Restricciones' ? 'text-orange-600' :
                              categoria === 'No Apto' ? 'text-rose-600' :
                              'text-gray-500'
                            ]"
                          >
                            {{ cantidad }}
                            <span class="text-sm text-gray-500">({{ porcentaje }}%)</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </template>
                </Transition>
              </div>
            </div>

            <!-- Consultas -->
            <div v-if="chartWaveVisible(1)" class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
              <div class="flex items-start justify-between border-b border-gray-200 pb-2 mb-4">
                <div class="flex flex-col gap-0.5">
                  <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    Consultas Médicas
                    <span class="relative cursor-help">
                      <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                      <span
                        class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                      >
                        Cantidad total de <span class="font-semibold text-emerald-600">consultas médicas</span> otorgadas a los trabajadores en el período seleccionado.
                      </span>
                    </span>
                  </h3>

                </div>
              </div>

              <!-- Número principal -->
              <div 
                :class="[
                  'flex-1 flex items-center justify-center text-center rounded-lg transition',
                  totalConsultas > 0 ? 'cursor-pointer hover:bg-emerald-50' : 'cursor-default'
                ]"
                @click="handleClickConsultas"
              >
                <div class="text-center">
                  <div class="text-8xl font-medium text-emerald-600">
                    {{ totalConsultas }}
                  </div>
                  <div class="text-sm text-gray-500 mt-1 whitespace-pre-line">{{ rangoPeriodo }}</div>
                </div>
              </div>

              <h4 class="text-xs text-gray-600 font-normal italic text-center">
                Actividad médica
              </h4>
            </div>

              </div>
            </section>

            <!-- Diagnósticos de las consultas -->
            <section
              v-show="seccionConDatos.diagnosticos"
              id="tablero-diagnosticos"
              class="dashboard-seccion mb-8 scroll-mt-4"
              data-test="seccion-diagnosticos"
            >
              <h2 class="dashboard-seccion__titulo mb-1 flex items-center gap-2 text-lg font-semibold text-gray-800">
                <i :class="[SECCIONES_DE_TABLERO[6].icono, 'text-emerald-600']" aria-hidden="true"></i>
                {{ SECCIONES_DE_TABLERO[6].titulo }}
              </h2>
              <p class="mb-3 text-sm text-gray-500" data-test="resumen-diagnosticos">
                {{ diagnosticosDeConsultas.total }}
                {{ diagnosticosDeConsultas.total === 1 ? 'diagnóstico registrado' : 'diagnósticos registrados' }}
                con código CIE-10, entre principales y secundarios, en {{ totalConsultas }}
                {{ totalConsultas === 1 ? 'consulta' : 'consultas' }} del periodo.
                <template v-if="diagnosticosDeConsultas.primeraVez || diagnosticosDeConsultas.subsecuentes">
                  De los principales, {{ diagnosticosDeConsultas.primeraVez }} de primera vez y
                  {{ diagnosticosDeConsultas.subsecuentes }} subsecuentes.
                </template>
              </p>
              <div class="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2">
                <div class="bg-gray-50 p-4 sm:p-6 rounded-lg shadow flex flex-col" data-test="diagnosticos-frecuentes">
                  <h3 class="mb-4 border-b border-gray-200 pb-2 text-base sm:text-xl font-semibold text-gray-800">
                    Diagnósticos más frecuentes
                  </h3>
                  <ListaDeConteos
                    :filas="diagnosticosDeConsultas.porCodigo"
                    :total="diagnosticosDeConsultas.total"
                  />
                </div>

                <div class="bg-gray-50 p-4 sm:p-6 rounded-lg shadow flex flex-col" data-test="diagnosticos-capitulos">
                  <h3 class="mb-4 border-b border-gray-200 pb-2 text-base sm:text-xl font-semibold text-gray-800">
                    Por grupo de enfermedades
                  </h3>
                  <ListaDeConteos
                    :filas="diagnosticosDeConsultas.porCapitulo"
                    :total="diagnosticosDeConsultas.total"
                    :limite="12"
                  />
                  <p class="mt-3 text-xs italic text-gray-500">Capítulos de la CIE-10.</p>
                </div>

                <div class="bg-gray-50 p-4 sm:p-6 rounded-lg shadow flex flex-col xl:col-span-2" data-test="consultas-por-mes">
                  <h3 class="mb-4 border-b border-gray-200 pb-2 text-base sm:text-xl font-semibold text-gray-800">
                    Consultas por mes
                  </h3>
                  <div class="overflow-x-auto">
                    <ol class="flex h-40 items-end gap-2" :style="{ minWidth: consultasMensuales.length * 2.75 + 'rem' }">
                      <li
                        v-for="mes in consultasMensuales"
                        :key="mes.clave"
                        class="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                        :title="`${mes.etiqueta}: ${mes.cantidad} ${mes.cantidad === 1 ? 'consulta' : 'consultas'}`"
                        data-test="consultas-mes"
                      >
                        <span class="mb-1 text-xs tabular-nums text-gray-700">{{ mes.cantidad || '' }}</span>
                        <span class="lista-conteos__barra w-full max-w-[3rem] rounded-t bg-emerald-500" :style="{ height: mes.alto }"></span>
                      </li>
                    </ol>
                    <ol
                      class="mt-1 flex gap-2 border-t border-gray-200 pt-1"
                      :style="{ minWidth: consultasMensuales.length * 2.75 + 'rem' }"
                      aria-hidden="true"
                    >
                      <li
                        v-for="mes in consultasMensuales"
                        :key="mes.clave"
                        class="min-w-0 flex-1 truncate text-center text-[11px] text-gray-500"
                      >
                        {{ mes.etiqueta }}
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </section>

            <!-- Inventario clínico -->
            <section
              v-show="seccionConDatos.inventario"
              id="tablero-inventario"
              class="dashboard-seccion mb-8 scroll-mt-4"
              data-test="seccion-inventario"
            >
              <h2 class="dashboard-seccion__titulo mb-1 flex items-center gap-2 text-lg font-semibold text-gray-800">
                <i :class="[SECCIONES_DE_TABLERO[7].icono, 'text-emerald-600']" aria-hidden="true"></i>
                {{ SECCIONES_DE_TABLERO[7].titulo }}
              </h2>
              <p class="mb-3 text-sm text-gray-500" data-test="periodo-inventario">
                Consumo del {{ new Date(periodoInventario.desde).toLocaleDateString('es-MX', { timeZone: 'UTC' }) }}
                al {{ new Date(periodoInventario.hasta).toLocaleDateString('es-MX', { timeZone: 'UTC' }) }}<template v-if="periodoInventario.porDefecto"> (año en curso, porque no hay un periodo elegido)</template>.
                Las existencias son las de hoy.
                <template v-if="hayFiltrosPoblacion">Esta sección no responde a los filtros de trabajadores.</template>
              </p>
              <div class="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-4">
                <div class="bg-gray-50 p-4 sm:p-6 rounded-lg shadow flex flex-col xl:col-span-2" data-test="inventario-consumo">
                  <h3 class="mb-4 border-b border-gray-200 pb-2 text-base sm:text-xl font-semibold text-gray-800">
                    Insumos más consumidos
                  </h3>
                  <p v-if="!insumosMasConsumidos.length" class="py-6 text-center text-sm text-gray-500">
                    Sin consumo registrado en el periodo.
                  </p>
                  <div v-else class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                      <thead>
                        <tr class="text-xs text-gray-500">
                          <th scope="col" class="py-1 pr-3 font-medium">Insumo</th>
                          <th scope="col" class="px-2 py-1 text-right font-medium">Consumo</th>
                          <th scope="col" class="px-2 py-1 text-right font-medium" title="Aplicado o usado durante la consulta">Administrado</th>
                          <th scope="col" class="py-1 pl-2 text-right font-medium" title="Entregado al trabajador para llevar">Entregado</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-200">
                        <tr v-for="fila in insumosMasConsumidos" :key="fila.insumo._id" data-test="insumo-consumido">
                          <td class="lista-conteos__etiqueta py-1.5 pr-3 text-gray-800">{{ fila.insumo.nombre }}</td>
                          <td class="lista-conteos__cantidad whitespace-nowrap px-2 py-1.5 text-right font-semibold tabular-nums text-gray-900">
                            {{ cantidadConUnidad(fila.consumo, fila.insumo.unidad) }}
                          </td>
                          <td class="px-2 py-1.5 text-right tabular-nums text-gray-600">{{ fila.administrado }}</td>
                          <td class="py-1.5 pl-2 text-right tabular-nums text-gray-600">{{ fila.entregado }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div class="bg-gray-50 p-4 sm:p-6 rounded-lg shadow flex flex-col" data-test="inventario-bajas">
                  <h3 class="mb-4 border-b border-gray-200 pb-2 text-base sm:text-xl font-semibold text-gray-800">
                    Bajas en el periodo
                  </h3>
                  <p v-if="!insumosConBajas.length" class="py-6 text-center text-sm text-gray-500">
                    Sin bajas por caducidad, daño o merma.
                  </p>
                  <ul v-else class="space-y-1.5 text-sm">
                    <li
                      v-for="fila in insumosConBajas.slice(0, 10)"
                      :key="fila.insumo._id"
                      class="flex items-baseline justify-between gap-3"
                    >
                      <span class="lista-conteos__etiqueta min-w-0 truncate text-gray-800">{{ fila.insumo.nombre }}</span>
                      <span class="lista-conteos__cantidad shrink-0 whitespace-nowrap font-semibold tabular-nums text-gray-900">
                        {{ cantidadConUnidad(fila.bajas, fila.insumo.unidad) }}
                      </span>
                    </li>
                  </ul>
                </div>

                <div class="bg-gray-50 p-4 sm:p-6 rounded-lg shadow flex flex-col" data-test="inventario-existencias">
                  <h3 class="mb-4 border-b border-gray-200 pb-2 text-base sm:text-xl font-semibold text-gray-800">
                    Existencias hoy
                  </h3>
                  <dl class="space-y-2 text-sm">
                    <div class="flex items-baseline justify-between gap-3">
                      <dt class="text-gray-600">Insumos con existencia</dt>
                      <dd class="lista-conteos__cantidad font-semibold tabular-nums text-gray-900">{{ alertasInventario.conExistencia }}</dd>
                    </div>
                    <div class="flex items-baseline justify-between gap-3">
                      <dt class="text-gray-600" title="Con existencia mínima definida y en cero">Agotados</dt>
                      <dd class="font-semibold tabular-nums" :class="alertasInventario.agotados ? 'text-red-600' : 'lista-conteos__cantidad text-gray-900'">
                        {{ alertasInventario.agotados }}
                      </dd>
                    </div>
                    <div class="flex items-baseline justify-between gap-3">
                      <dt class="text-gray-600">Por debajo del mínimo</dt>
                      <dd class="font-semibold tabular-nums" :class="alertasInventario.bajoMinimo ? 'text-amber-600' : 'lista-conteos__cantidad text-gray-900'">
                        {{ alertasInventario.bajoMinimo }}
                      </dd>
                    </div>
                    <div class="flex items-baseline justify-between gap-3">
                      <dt class="text-gray-600">Lotes por caducar</dt>
                      <dd class="font-semibold tabular-nums" :class="alertasInventario.lotesPorCaducar ? 'text-amber-600' : 'lista-conteos__cantidad text-gray-900'">
                        {{ alertasInventario.lotesPorCaducar }}
                      </dd>
                    </div>
                    <div class="flex items-baseline justify-between gap-3">
                      <dt class="text-gray-600">Lotes caducados</dt>
                      <dd class="font-semibold tabular-nums" :class="alertasInventario.lotesCaducados ? 'text-red-600' : 'lista-conteos__cantidad text-gray-900'">
                        {{ alertasInventario.lotesCaducados }}
                      </dd>
                    </div>
                  </dl>
                  <p v-if="indiceCentroSeleccionado === null && centrosTrabajo.length > 1" class="mt-3 text-xs italic text-gray-500">
                    Suma de todos los centros: un insumo agotado en dos centros cuenta dos veces.
                  </p>
                  <RouterLink
                    v-else-if="centrosTrabajo[indiceCentroSeleccionado ?? 0]"
                    :to="{ name: 'inventario', params: { idEmpresa: route.params.idEmpresa, idCentroTrabajo: centrosTrabajo[indiceCentroSeleccionado ?? 0]._id } }"
                    class="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    Ver inventario del centro
                  </RouterLink>
                </div>
              </div>
            </section>

            <p
              v-if="seccionesSinDatos.length"
              class="dashboard-sin-datos mb-8 text-sm text-gray-500"
              data-test="secciones-sin-datos"
            >
              <i class="fas fa-circle-info mr-1" aria-hidden="true"></i>
              Sin registros en este periodo: {{ seccionesSinDatos.map((seccion) => seccion.titulo).join(', ') }}.
            </p>
          </div>

          <!-- =======================
              Botón de Regreso
          ======================= -->
          <div class="text-center">
            <button 
              @click="$router.back()" 
              class="inline-flex items-center gap-2 text-gray-600 hover:text-emerald-600 font-medium transition-colors duration-200"
            >
              <i class="fas fa-arrow-left"></i>
              Regresar
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Modal de personalización del informe -->
  <ModalPersonalizarInforme
    :is-open="mostrarModalPersonalizacion"
    :id-empresa="empresasStore.currentEmpresa?._id"
    :id-centro-trabajo="centroSeleccionado !== 'Todos' ? centrosTrabajo.find(c => c.nombreCentro === centroSeleccionado)?._id : undefined"
    @close="cerrarModalPersonalizacion"
  />
</template>
