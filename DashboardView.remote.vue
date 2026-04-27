<script setup>
import { ref, watch, computed, inject, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { clasificarPorEdadYSexo, ordenarPorGrupoEtario, contarPorCategoriaIMC, etiquetasEnfermedades, contarEnfermedadesCronicas, etiquetasAntecedentesReferidos, contarAntecedentesReferidos, etiquetasVisionSinCorreccion, calcularRequierenLentes, contarVisionSinCorreccion, calcularVistaCorregida, calcularDaltonismo, etiquetasAptitudPuesto, etiquetasAptitudPuestoTabla, contarPorAptitudPuesto, calcularCircunferenciaCintura, contarConsultasUltimos30Dias, etiquetasAgentesRiesgo, contarAgentesRiesgo } from '@/helpers/dashboardDataProcessor';
import GraficaBarras from '@/components/graficas/GraficaBarras.vue';
import GraficaAnillo from '@/components/graficas/GraficaAnillo.vue';
import { subDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import DescargarInformeDashboard from '@/components/DescargarInformeDashboard.vue';

const toast = inject('toast');
const router = useRouter()
const route = useRoute();
const empresasStore = useEmpresasStore();
const centrosTrabajoStore = useCentrosTrabajoStore();
const trabajadoresStore = useTrabajadoresStore();

const centrosTrabajo = ref([]);
const centroSeleccionado = ref('Todos')
const tablaGruposEtarios = ref([]);
const dashboardData = ref({});
const fechaInicio = ref(null)
const fechaFin = ref(null)
const periodoPredefinido = ref('')

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
const vistaAptitud = ref('grafico');
const vistaAptitudKey = computed(() => `vista-${vistaAptitud.value}`);
const vistaAgentes = ref('grafico');
const vistaAgentesKey = computed(() => `vista-${vistaAgentes.value}`);

// Refs para cada gráfica
const refIMC = ref();
const refAptitud = ref();
const refLentes = ref();
const refCorregida = ref();
const refDaltonismo = ref();
const refAgentes = ref();
const refGruposEtarios = ref();
const refCircunferencia = ref();

const cargarDatos = async (empresaId, inicio, fin) => {
  if (!empresaId) return;

  // 1. Empresa y Centros de Trabajo en paralelo
  const [empresa, centros] = await Promise.all([
    empresasStore.fetchEmpresaById(empresaId),
    centrosTrabajoStore.fetchCentrosTrabajo(empresaId)
  ]);

  empresasStore.currentEmpresa = empresa;
  centrosTrabajo.value = centros;
  centroSeleccionado.value = centros.length > 0 ? centros[0].nombreCentro : 'Todos';

  // 2. Info para el dashboard (en paralelo)
  if (centros.length > 0) {
    dashboardData.value = await Promise.all(
      centros.map((centro) =>
        trabajadoresStore.fetchDashboardData(empresaId, centro._id, inicio, fin)
      )
    );
  } else {
    dashboardData.value = [];
  }

  // Logs
  // console.log('Empresa data fetched:', empresasStore.currentEmpresa);
  // console.log('Centros de trabajo data fetched:', centrosTrabajo.value);
  // console.log('Dashboard data fetched:', dashboardData.value);
};

// Llama la función al montar y si cambia el ID
watch(
  [() => route.params.idEmpresa, fechaInicio, fechaFin],
  ([idEmpresa, inicio, fin]) => {
    if (inicio && fin && new Date(inicio) > new Date(fin)) return;
    cargarDatos(idEmpresa, inicio, fin);
  },
  { immediate: true }
);

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
    return dashboardData.value.reduce((total, centro) => total + (centro.trabajadoresEvaluados?.length || 0), 0);
  }

  const index = centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value);
  return dashboardData.value[index]?.trabajadoresEvaluados?.length || 0;
});

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

  const coloresPorCategoria = {
    'Bajo peso': '#D1D5DB',          // gray-300
    'Normal': '#10B981',            // emerald-500 (verde saludable)
    'Sobrepeso': '#9CA3AF',         // gray-400
    'Obesidad clase I': '#6B7280',  // gray-500
    'Obesidad clase II': '#4B5563', // gray-600
    'Obesidad clase III': '#374151' // gray-700 (más oscuro)
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
        // ✅ Este corrige el título del tooltip (primera línea en el hover)
        title: (context) => {
          const index = context[0].dataIndex;
          const raw = context[0].label;
          return etiquetasAptitudPuestoTabla[raw] || raw;
        },
        // ✅ Este es el contenido (segunda línea)
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

/* const graficaRequierenLentesOptions = {
  responsive: true,
  cutout: '70%',
  plugins: {
    tooltip: {
      enabled: true
    },
    datalabels: {
      display: false
    },
    legend: {
      display: false
    }
  }
} */

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

/* const graficaCircunferenciaOptions = {
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
  }
} */

// Computed para tabla y grafica de consultas en los últimos 30 días
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
        backgroundColor: '#4B5563', // Gris oscuro
        stack: 'Stack 0'
      },
      {
        label: 'Mujeres',
        data: mujeres,
        backgroundColor: '#9CA3AF', // Gris medio
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
      grid: { display: false }
    },
    y: {
      stacked: true,
      grid: { display: false }
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

  router.push({
    name: 'trabajadores',
    params: {
      idEmpresa: empresaId,
      idCentroTrabajo: centro._id
    },
    query: {
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

const logoBase64 = ref();

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

</script>

<template>
  <div class="mx-auto">
    <div v-if="!empresasStore.currentEmpresa" class="text-center py-8">
      <p class="text-gray-600 text-lg">Loading empresa data...</p>
    </div>

    <div v-else>
      <!-- Header con logo a la izquierda y datos a la derecha -->
      <div class="flex items-center gap-6 mb-2">
        <img
          v-if="empresasStore.currentEmpresa.logotipoEmpresa?.data"
          :src="'/uploads/logos/' + empresasStore.currentEmpresa.logotipoEmpresa.data + '?t=' + empresasStore.currentEmpresa.updatedAt"
          :alt="'Logo de ' + empresasStore.currentEmpresa.nombreComercial"
          class="w-24 h-24 object-contain rounded"
        />
        <div v-else class="w-1/4 h-32 flex flex-col items-center justify-center bg-gradient-to-r from-gray-200 to-gray-300 text-gray-500 rounded mb-4 text-center px-4 border-2 border-dashed border-gray-400">
            <i class="fas fa-camera text-4xl mb-2"></i> <!-- Icono de FontAwesome -->
            <span class="text-xs text-center">Identifica más rápido a tu cliente agregando un logotipo</span>
        </div>

        <div class="hidden sm:block">
            <h1 class="text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-800">{{ empresasStore.currentEmpresa.nombreComercial }}</h1>
            <h2 class="text-sm md:text-base lg:text-lg xl:text-xl text-gray-600 mt-1">{{ empresasStore.currentEmpresa.razonSocial }}</h2>
        </div>

        <div class="mb-4 ml-auto flex items-center gap-6">
          <!-- Indicador de total de trabajadores -->
          <div class="bg-white border border-gray-200 shadow-md rounded-xl px-6 py-2 text-center self-center">
            <div class="text-xs text-gray-500"><i class="fas fa-users mr-1 text-gray-400"></i><span class="hidden md:block">Trabajadores evaluados</span></div>
            <div class="text-2xl font-bold text-emerald-600 leading-tight">{{ totalTrabajadores }}</div>
          </div>
          
          <!-- Selector de centro de trabajo -->
          <div class="self-end">
            <label class="block text-xs md:text-sm font-medium text-gray-700">Centro de trabajo</label>
            <select
            v-model="centroSeleccionado"
            class="border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-1 rounded-md shadow-sm text-xs md:text-sm font-medium text-gray-700 bg-white transition duration-150 ease-in-out mt-1"
            >
              <option v-for="nombre in centrosTrabajoOptions" :key="nombre" :value="nombre">{{ nombre }}</option>
            </select>
          </div>
        </div>
    </div>
    
    <!-- Ajustado a nivel del encabezado -->
    <div class="mb-2 flex items-end gap-6">
      <button
        type="button"
        class="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow transition duration-300 self-center"
      >
        <i class="fas fa-chart-line"></i>
        Gestión de Informes
      </button>
      
      <!-- Filtro de periodo -->
      <div class="flex flex-col justify-end text-xs ml-auto">
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

        <div class="flex items-end gap-2">
          <!-- Select de periodos predefinidos -->
          <div class="flex flex-col">
            <label class="text-[11px] text-gray-500 mb-0.5">Periodo rápido</label>
            <select
              v-model="periodoPredefinido"
              @change="manejarCambioPeriodo(periodoPredefinido)"
              class="border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-1 rounded-md shadow-sm text-xs text-gray-700 bg-white transition duration-150 ease-in-out min-w-[120px]"
            >
              <option value="">Seleccionar periodo</option>
              <option v-for="opcion in opcionesPeriodo" :key="opcion" :value="opcion">{{ opcion }}</option>
            </select>
          </div>

          <!-- Fecha inicio -->
          <div class="flex flex-col">
            <label for="fechaInicio" class="text-[11px] text-gray-500 mb-0.5">Inicio</label>
            <input
              id="fechaInicio"
              type="date"
              v-model="fechaInicio"
              class="border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-1 rounded-md shadow-sm text-xs text-gray-700 bg-white transition"
            />
          </div>
          <!-- Fecha fin -->
          <div class="flex flex-col">
            <label for="fechaFin" class="text-[11px] text-gray-500 mb-0.5">Final</label>
            <input
              id="fechaFin"
              type="date"
              v-model="fechaFin"
              class="border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-1 rounded-md shadow-sm text-xs text-gray-700 bg-white transition"
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

      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-8 auto-rows-[370px] sm:auto-rows-[400px] md:auto-rows-[425px] lg:auto-rows-[450px]">

        <!-- IMC: 2 columnas -->
        <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-2 xl:col-span-2">
          <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
            <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
              Distribución por categoría de IMC
              <span class="relative cursor-help">
                <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                <span
                  class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-72 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
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
                      <th class="py-2 px-4 text-left text-lg lg:text-xl">Categoría IMC</th>
                      <th class="py-2 px-4 text-center text-lg lg:text-xl">Trabajadores</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="[categoria, cantidad, porcentaje] in tablaIMC"
                      :key="categoria"
                      class="border-t hover:bg-gray-200 transition cursor-pointer"
                      @click="handleClickTablaIMC(categoria)"
                    >
                      <td class="py-1 px-4 font-medium text-gray-700 text-lg lg:text-xl">{{ categoria }}</td>
                      <td
                        :class="[
                          'py-1 px-4 text-center text-lg lg:text-xl',
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

        <!-- Aptitud al Puesto: 2 columnas -->
        <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-2 xl:col-span-2">
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

        <!-- Requieren Lentes -->
        <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
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
        <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
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
        <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
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

        <!-- Agudeza Visual -->
        <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
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

        <!-- Crónicas --> 
        <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
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
        <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
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

        <!-- Riesgos: 2 columnas --> 
        <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-2 xl:col-span-2">
          <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
            <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
              Exposición a factores de riesgo
              <span class="relative cursor-help">
                <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                <span
                  class="absolute top-1/2 right-full mr-2 -translate-y-1/2 md:left-full md:right-auto md:ml-2 md:mr-0 md:translate-y-0 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
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
                      <th class="py-2 px-4 text-left text-lg lg:text-xl">Agente de Riesgo</th>
                      <th class="py-2 px-4 text-center text-lg lg:text-xl">Expuestos</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="[agente, cantidad, porcentaje] in tablaAgentesRiesgo"
                      :key="agente"
                      class="border-t hover:bg-gray-200 transition"
                    >
                      <td class="py-1 px-4 font-medium text-gray-700 text-lg lg:text-xl">
                        {{ etiquetasAgentesRiesgo[agente] || agente }}
                      </td>
                      <td class="py-1 px-4 text-center text-lg lg:text-xl"
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

        <!-- Grupos Etarios: 2 columnas -->
        <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-2 xl:col-span-2">
          <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
            <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
              Distribución por Grupos Etarios
              <span class="relative cursor-help">
                <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                <span
                  class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
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
                      <th class="py-2 px-4 text-left text-lg lg:text-xl">Grupo Etario</th>
                      <th class="py-2 px-4 text-center text-lg lg:text-xl">Hombres</th>
                      <th class="py-2 px-4 text-center text-lg lg:text-xl">Mujeres</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="[grupo, datos] in tablaGruposEtariosFiltrada"
                      :key="grupo"
                      class="border-t hover:bg-gray-200 transition"
                    >
                      <td class="py-1 px-4 font-medium text-gray-700 text-lg lg:text-xl">{{ grupo }}</td>
                      <td class="py-1 px-4 text-center text-blue-700 text-lg lg:text-xl">{{ datos.Masculino }}</td>
                      <td class="py-1 px-4 text-center text-pink-700 text-lg lg:text-xl">{{ datos.Femenino }}</td>
                    </tr>
                  </tbody>
                </table>
              </template>
            </Transition>
          </div>
        </div>

        <!-- Consultas -->
        <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
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

        <!-- Cintura -->
        <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
          <div class="flex items-start justify-between border-b border-gray-200 pb-2 mb-4">
            <!-- Título + descripción -->
            <div class="flex flex-col gap-0.5">
              <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                Riesgo por Cintura
                <span class="relative cursor-help">
                  <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                  <span
                    class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                  >
                    La circunferencia de cintura elevada se asocia con <span class="font-semibold text-rose-600">mayor riesgo de enfermedades</span> como diabetes, hipertensión y trastornos metabólicos.
                  </span>
                </span>
              </h3>
            </div>
          </div>
          
          <GraficaAnillo
            v-if="graficaCircunferenciaData.chart?.labels?.length"
            ref="refCircunferencia"
            :data="graficaCircunferenciaData.chart"
            :options="{ ...opcionesGenericasAnillo, onClick: handleClickGraficaCintura }"
            :cantidad="graficaCircunferenciaData.alto"
            :porcentaje="graficaCircunferenciaData.porcentaje"
          />

          <h4 class="text-xs text-gray-600 font-normal italic text-center">
            Indicador de grasa abdominal y riesgo metabólico
          </h4>
        </div>

      </div>

      <button
        @click="$router.back()"
        class="inline-block text-gray-700 hover:text-emerald-500 font-medium"
      >
        ← Regresar
      </button>
    </div>
  </div>
</template>
