<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import type { RiesgoTrabajo } from '@/interfaces/riesgo-trabajo.interface';
import { contarPorNaturalezaLesion, contarPorParteCuerpo, contarPorPuestosTrabajo, contarPorRangoDiasIncapacidad, rangosDiasIncapacidad, contarPorTipoRiesgo, tiposRiesgo, etiquetasTiposRiesgo, contarPorEstadoAlta, estadosAlta, contarCasosSecuelas, contarPorManejo, contarRecaidas, calcularTotalDiasIncapacidad } from '@/helpers/dashboardRiesgosProcessor';
import GraficaBarras from '@/components/graficas/GraficaBarras.vue';
import GraficaAnillo from '@/components/graficas/GraficaAnillo.vue';
import { calcularEdad } from '@/helpers/dates';
import { startOfMonth, endOfMonth, subMonths, subDays, startOfYear, endOfYear, subYears } from 'date-fns';

interface DashboardCentro {
  nombreCentro: string;
  riesgos: RiesgoTrabajo[];
  riesgosFiltrados: RiesgoTrabajo[];
}

const route = useRoute();
const router = useRouter();
const empresasStore = useEmpresasStore();
const centrosStore = useCentrosTrabajoStore();
const trabajadoresStore = useTrabajadoresStore();

const empresaId = String(route.params.idEmpresa);
const dashboardData = ref<DashboardCentro[]>([]);
const centrosTrabajo = ref<{ nombreCentro: string; _id: string }[]>([]);
const centroSeleccionado = ref('Todos');
const datosCargados = ref(false);

const vistaNaturalezaLesion = ref('grafico');
const vistaParteCuerpo = ref('grafico');
const vistaTiposRiesgo = ref('grafico');
const vistaPuestosTrabajo = ref('grafico');
const vistaDiasIncapacidad = ref('grafico');
const vistaEstadoAlta = ref('grafico');
const vistaCasosSecuelas = ref('grafico');
const vistaManejo = ref('grafico');

const vistaRecaidas = ref('grafico');

const puestosDisponiblesFijos = ref<string[]>([]);
const naturalezasDisponiblesFijos = ref<string[]>([]);
const partesCuerpoDisponiblesFijos = ref<string[]>([]);

async function cargarDatos() {
  const empresaId = String(route.params.idEmpresa);
  if (!empresaId) return;

  // 1. Cargar Empresa, Centros y Riesgos en paralelo
  const [empresa, centros, riesgos] = await Promise.all([
    empresasStore.fetchEmpresaById(empresaId),
    centrosStore.fetchCentrosTrabajo(empresaId),
    trabajadoresStore.fetchRiesgosTrabajoPorEmpresa(empresaId)
  ]);

  // Capturamos las opciones únicas de estos tres filtros con tipado seguro
  puestosDisponiblesFijos.value = Array.from(new Set<string>(
    riesgos.map((r) => r.puestoTrabajador).filter((v): v is string => !!v)
  )).sort();

  naturalezasDisponiblesFijos.value = Array.from(new Set<string>(
    riesgos.map((r) => r.naturalezaLesion).filter((v): v is string => !!v)
  )).sort();

  partesCuerpoDisponiblesFijos.value = Array.from(new Set<string>(
    riesgos.map((r) => r.parteCuerpoAfectada).filter((v): v is string => !!v)
  )).sort();

  // 2. Asignar datos cargados
  empresasStore.currentEmpresa = empresa;
  centrosTrabajo.value = centros;
  centroSeleccionado.value = centros.length > 0 ? centros[0].nombreCentro : 'Todos';

  // 3. Estructurar dashboardData similar a DashboardView
  dashboardData.value = centros.map((centro) => ({
    nombreCentro: centro.nombreCentro,
    riesgos: riesgos.filter((riesgo) => riesgo.idCentroTrabajo === centro._id),
    riesgosFiltrados: [] // ✅ Definimos riesgosFiltrados directamente
  }));

  // 4. Inicializamos riesgosFiltrados como copia de riesgos
  dashboardData.value.forEach((centro) => {
    centro.riesgosFiltrados = [...centro.riesgos];
  });

  datosCargados.value = true;
}

// Llama la función al montar y si cambia el ID
watch(() => route.params.idEmpresa, cargarDatos, { immediate: true });

const centrosTrabajoOptions = computed(() => [
  'Todos',
  ...centrosTrabajo.value.map((centro) => centro.nombreCentro),
]);

// Computed para contar el total de riesgos de trabajo
const totalRiesgos = computed(() => {
  if (!dashboardData.value.length) return 0;

  if (centroSeleccionado.value === 'Todos') {
    return dashboardData.value.reduce((total, centro) => total + (centro.riesgos.length || 0), 0);
  }

  const index = centrosTrabajo.value.findIndex(c => c.nombreCentro === centroSeleccionado.value);
  return dashboardData.value[index]?.riesgos.length || 0;
});

const riesgosFiltrados = computed(() => {
  return dashboardData.value.flatMap((centro) => {
    if (centroSeleccionado.value !== 'Todos' && centro.nombreCentro !== centroSeleccionado.value) {
      return [];
    }

    return centro.riesgos.filter((riesgo) => {
      const edad = riesgo.fechaNacimiento 
        ? calcularEdad(riesgo.fechaNacimiento) 
        : null;
      const antiguedad = riesgo.fechaIngreso 
        ? calcularAntiguedadAnios(riesgo.fechaIngreso) 
        : null;

      return (
        (sexoSeleccionado.value === 'todos' || riesgo.sexoTrabajador === sexoSeleccionado.value) &&
        (puestoSeleccionado.value === 'todos' || riesgo.puestoTrabajador === puestoSeleccionado.value) &&
        (naturalezaSeleccionada.value === 'todos' || riesgo.naturalezaLesion === naturalezaSeleccionada.value) &&
        (parteCuerpoSeleccionada.value === 'todos' || riesgo.parteCuerpoAfectada === parteCuerpoSeleccionada.value) &&
        (recaidaSeleccionada.value === 'todos' || (recaidaSeleccionada.value === 'Si' && riesgo.recaida === 'Si') ||
          (recaidaSeleccionada.value === 'No' && (riesgo.recaida === 'No' || riesgo.recaida == null))) &&
        (tipoRiesgoSeleccionado.value === 'todos' || riesgo.tipoRiesgo === tipoRiesgoSeleccionado.value) &&
        (manejoSeleccionado.value === 'todos' || riesgo.manejo === manejoSeleccionado.value) &&
        (altaSeleccionada.value === 'todos' || riesgo.alta === altaSeleccionada.value) &&
        (diasIncapacidadSeleccionados.value === 'todos' || cumpleRangoDiasIncapacidad(riesgo.diasIncapacidad ?? 0, diasIncapacidadSeleccionados.value)) &&
        (secuelasSeleccionadas.value === 'todos' || riesgo.secuelas === secuelasSeleccionadas.value) &&
        (periodoSeleccionado.value === 'todos' || 
          (rangoFechas.value.inicio && rangoFechas.value.fin &&
          typeof riesgo.fechaRiesgo === 'string' &&
          new Date(riesgo.fechaRiesgo).getTime() >= rangoFechas.value.inicio.getTime() &&
          new Date(riesgo.fechaRiesgo).getTime() <= rangoFechas.value.fin.getTime())) &&
        (edadSeleccionada.value === 'todos' || 
          (edad !== null && edad >= obtenerEdadMinima(edadSeleccionada.value) && edad <= obtenerEdadMaxima(edadSeleccionada.value))) &&
        (antiguedadSeleccionada.value === 'todos' || 
          (antiguedad !== null && antiguedad >= obtenerAntiguedadMinima(antiguedadSeleccionada.value) && antiguedad <= obtenerAntiguedadMaxima(antiguedadSeleccionada.value)))
      );
    });
  });
});

// Computed para tabla y grafica de Naturaleza Lesión
const graficaNaturalezaLesionData = computed(() => {
  if (!riesgosFiltrados.value.length) return { labels: [], datasets: [] };

  const resultados = contarPorNaturalezaLesion(riesgosFiltrados.value);
  const etiquetas = resultados.map(([label]) => label);
  const hombres = resultados.map(([, masculino]) => masculino);
  const mujeres = resultados.map(([, , femenino]) => femenino);

  return {
    labels: etiquetas,
    datasets: [
      {
        label: 'Hombres',
        data: hombres,
        backgroundColor: '#4B5563', // Gris oscuro
        stack: 'Stack 0',
      },
      {
        label: 'Mujeres',
        data: mujeres,
        backgroundColor: '#9CA3AF', // Gris medio
        stack: 'Stack 0',
      }
    ]
  };
});

const tablaNaturalezaLesion = computed(() => {
  if (!riesgosFiltrados.value.length) return [];
  
  const resultados = contarPorNaturalezaLesion(riesgosFiltrados.value);
  const totalHombres = resultados.reduce((acc, [, h]) => acc + h, 0);
  const totalMujeres = resultados.reduce((acc, [, , m]) => acc + m, 0);
  

  return resultados.map(([naturaleza, hombres, mujeres]) => {
    const porcentajeHombres = totalHombres > 0 ? Math.round((hombres / totalHombres) * 100) : 0;
    const porcentajeMujeres = totalMujeres > 0 ? Math.round((mujeres / totalMujeres) * 100) : 0;

    return {
      naturaleza,
      hombres,
      mujeres,
      porcentajeHombres,
      porcentajeMujeres
    };
  });
});

const graficaBarrasHorizontalesOptions = {
  indexAxis: 'y',
  responsive: true,
  layout: {
    padding: {
      right: 60
    }
  },
  plugins: {
    legend: {
      display: false // ✅ Leyenda desactivada
    },
    tooltip: {
      enabled: true,
      callbacks: {
        label: (context) => {
          const value = context.raw;
          const totalHombres = context.chart.data.datasets[0]?.data.reduce((a, b) => a + b, 0) || 0;
          const totalMujeres = context.chart.data.datasets[1]?.data.reduce((a, b) => a + b, 0) || 0;
          const total = totalHombres + totalMujeres;
          const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
          return `${context.dataset.label}: ${value} (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      color: '#FFFFFF', // blanco
      anchor: 'center',
      align: 'center',
      formatter: (value, context) => {
        if (value === 0) return null; // ✅ No mostrar si el valor es 0
        const totalHombres = context.chart.data.datasets[0]?.data.reduce((a, b) => a + b, 0) || 0;
        const totalMujeres = context.chart.data.datasets[1]?.data.reduce((a, b) => a + b, 0) || 0;
        const total = totalHombres + totalMujeres;
        return `${value}`;
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
      stacked: true,
      grid: { display: false },
      ticks: {
        stepSize: 1,
        color: '#374151',
        font: { size: 12 }
      }
    },
    y: {
      stacked: true,
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

// Computed para tabla y gráfica de parte del cuerpo afectada
const graficaParteCuerpoData = computed(() => {
  if (!riesgosFiltrados.value.length) return { labels: [], datasets: [] };

  const resultados = contarPorParteCuerpo(riesgosFiltrados.value);
  const etiquetas = resultados.map(([label]) => label);
  const hombres = resultados.map(([, masculino]) => masculino);
  const mujeres = resultados.map(([, , femenino]) => femenino);

  return {
    labels: etiquetas,
    datasets: [
      {
        label: 'Hombres',
        data: hombres,
        backgroundColor: '#4B5563', // Gris oscuro
        stack: 'Stack 0',
      },
      {
        label: 'Mujeres',
        data: mujeres,
        backgroundColor: '#9CA3AF', // Gris medio
        stack: 'Stack 0',
      }
    ]
  };
});

const tablaParteCuerpo = computed(() => {
  if (!riesgosFiltrados.value.length) return [];

  const resultados = contarPorParteCuerpo(riesgosFiltrados.value);
  const totalHombres = resultados.reduce((acc, [, h]) => acc + h, 0);
  const totalMujeres = resultados.reduce((acc, [, , m]) => acc + m, 0);

  return resultados.map(([parte, hombres, mujeres]) => {
    const porcentajeHombres = totalHombres > 0 ? Math.round((hombres / totalHombres) * 100) : 0;
    const porcentajeMujeres = totalMujeres > 0 ? Math.round((mujeres / totalMujeres) * 100) : 0;

    return {
      parte,
      hombres,
      mujeres,
      porcentajeHombres,
      porcentajeMujeres
    };
  });
});

// Computed para tabla y gráfica de tipo de riesgo
const graficaTiposRiesgoData = computed(() => {
  if (!riesgosFiltrados.value.length) return { labels: [], datasets: [] };

  const resultados = contarPorTipoRiesgo(riesgosFiltrados.value);
  const etiquetas = tiposRiesgo.map((tipo) => etiquetasTiposRiesgo[tipo] || tipo);
  const hombres = tiposRiesgo.map((tipo) => resultados[tipo]?.hombres || 0);
  const mujeres = tiposRiesgo.map((tipo) => resultados[tipo]?.mujeres || 0);

  return {
    labels: etiquetas,
    datasets: [
      {
        label: 'Hombres',
        data: hombres,
        backgroundColor: '#4B5563', // Gris oscuro
        stack: 'Stack 0',
      },
      {
        label: 'Mujeres',
        data: mujeres,
        backgroundColor: '#9CA3AF', // Gris claro
        stack: 'Stack 0',
      }
    ]
  };
});

const tablaTiposRiesgo = computed(() => {
  if (!riesgosFiltrados.value.length) return [];

  const resultados = contarPorTipoRiesgo(riesgosFiltrados.value);
  const totalHombres = Object.values(resultados).reduce((acc, val) => acc + (val.hombres || 0), 0);
  const totalMujeres = Object.values(resultados).reduce((acc, val) => acc + (val.mujeres || 0), 0);

  return tiposRiesgo.map((tipo) => {
    const hombres = resultados[tipo]?.hombres || 0;
    const mujeres = resultados[tipo]?.mujeres || 0;
    const total = hombres + mujeres;
    const porcentajeHombres = totalHombres > 0 ? Math.round((hombres / totalHombres) * 100) : 0;
    const porcentajeMujeres = totalMujeres > 0 ? Math.round((mujeres / totalMujeres) * 100) : 0;

    return {
      tipo: etiquetasTiposRiesgo[tipo] || tipo,
      hombres,
      mujeres,
      total,
      porcentajeHombres,
      porcentajeMujeres
    };
  });
});

const graficaTiposRiesgoOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'x', // Barras verticales
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      ticks: {
        color: '#374151',
        font: { size: 12 }
      }
    },
    y: {
      beginAtZero: true,
      stacked: true,
      grid: { display: false },
      ticks: {
        color: '#374151',
        font: { size: 12 }
      }
    }
  },
  plugins: {
    tooltip: {
      enabled: true,
      callbacks: {
        title: (context) => {
          // ✅ Mostramos el nombre completo en el tooltip
          const label = context[0].label;
          const etiquetasCompletas = {
            Trabajo: "Accidente de Trabajo",
            Trayecto: "Accidente de Trayecto",
            Enfermedad: "Enfermedad de Trabajo",
          };
          return etiquetasCompletas[label] || label;
        },
        label: (context) => {
          const value = context.raw;
          return `${context.dataset.label}: ${value}`;
        }
      }
    },
    legend: {
      display: false
    },
    datalabels: {
      display: true, // ✅ Aseguramos que estén habilitados
      color: '#FFFFFF', // ✅ Blanco
      font: {
        weight: 'bold',
        size: 14
      },
      formatter: (value, context) => {
        if (value === 0) return ''; // No mostrar si el valor es 0
        return `${value}`;
      }
    }
  }
}));

// Computed para tabla y gráfica de estado alta
const graficaEstadoAltaData = computed(() => {
  if (!riesgosFiltrados.value.length) return { labels: [], datasets: [], incapacidadActiva: 0, porcentaje: 0 };

  const resultados = contarPorEstadoAlta(riesgosFiltrados.value);
  const etiquetas = estadosAlta;
  const valores = etiquetas.map((estado) => resultados[estado] || 0);

  const total = valores.reduce((acc, val) => acc + val, 0);
  const incapacidadActiva = resultados['Incapacidad Activa'] || 0;
  const porcentaje = total > 0 ? Math.round((incapacidadActiva / total) * 100) : 0;

  return {
    labels: etiquetas,
    datasets: [
      {
        data: valores,
        backgroundColor: ['#4B5563', '#9CA3AF', '#D1D5DB'], // Colores personalizados para cada estado
        hoverOffset: 8,
      }
    ],
    incapacidadActiva,
    porcentaje
  };
});

const tablaEstadoAlta = computed(() => {
  if (!riesgosFiltrados.value.length) return [];

  const resultados = contarPorEstadoAlta(riesgosFiltrados.value);
  const total = Object.values(resultados).reduce((acc, val) => acc + val, 0);

  return estadosAlta.map((estado) => {
    const cantidad = resultados[estado] || 0;
    const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;

    return {
      estado,
      cantidad,
      porcentaje
    };
  });
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

// Computed para tabla y gráfica de puestos de trabajo
const graficaPuestosTrabajoData = computed(() => {
  if (!riesgosFiltrados.value.length) return { labels: [], datasets: [] };

  const resultados = contarPorPuestosTrabajo(riesgosFiltrados.value);
  const etiquetas = resultados.map(([label]) => label);
  const hombres = resultados.map(([, masculino]) => masculino);
  const mujeres = resultados.map(([, , femenino]) => femenino);

  return {
    labels: etiquetas,
    datasets: [
      {
        label: 'Hombres',
        data: hombres,
        backgroundColor: '#4B5563', // Gris oscuro
        stack: 'Stack 0',
      },
      {
        label: 'Mujeres',
        data: mujeres,
        backgroundColor: '#9CA3AF', // Gris medio
        stack: 'Stack 0',
      }
    ]
  };
});

const tablaPuestosTrabajo = computed(() => {
  if (!riesgosFiltrados.value.length) return [];

  const resultados = contarPorPuestosTrabajo(riesgosFiltrados.value);
  const totalHombres = resultados.reduce((acc, [, h]) => acc + h, 0);
  const totalMujeres = resultados.reduce((acc, [, , m]) => acc + m, 0);

  return resultados.map(([puesto, hombres, mujeres]) => {
    const porcentajeHombres = totalHombres > 0 ? Math.round((hombres / totalHombres) * 100) : 0;
    const porcentajeMujeres = totalMujeres > 0 ? Math.round((mujeres / totalMujeres) * 100) : 0;

    return {
      puesto,
      hombres,
      mujeres,
      porcentajeHombres,
      porcentajeMujeres
    };
  });
});

// Computed para tabla y gráfica de días de incapacidad
const graficaDiasIncapacidadData = computed(() => {
  if (!riesgosFiltrados.value.length) return { labels: [], datasets: [] };

  const resultados = contarPorRangoDiasIncapacidad(riesgosFiltrados.value);
  const etiquetas = rangosDiasIncapacidad.map(rango => `${rango} días`);
  const hombres = rangosDiasIncapacidad.map((rango) => resultados[rango]?.hombres || 0);
  const mujeres = rangosDiasIncapacidad.map((rango) => resultados[rango]?.mujeres || 0);

  return {
    labels: etiquetas, // ✅ Las etiquetas muestran "días"
    datasets: [
      {
        label: 'Hombres',
        data: hombres,
        backgroundColor: '#4B5563', // Gris oscuro
        stack: 'Stack 0',
      },
      {
        label: 'Mujeres',
        data: mujeres,
        backgroundColor: '#9CA3AF', // Gris medio
        stack: 'Stack 0',
      }
    ]
  };
});

const tablaDiasIncapacidad = computed(() => {
  if (!riesgosFiltrados.value.length) return [];

  const resultados = contarPorRangoDiasIncapacidad(riesgosFiltrados.value);
  const totalHombres = Object.values(resultados).reduce((acc, val) => acc + (val.hombres || 0), 0);
  const totalMujeres = Object.values(resultados).reduce((acc, val) => acc + (val.mujeres || 0), 0);

  return rangosDiasIncapacidad.map((rango) => {
    const hombres = resultados[rango]?.hombres || 0;
    const mujeres = resultados[rango]?.mujeres || 0;
    const porcentajeHombres = totalHombres > 0 ? Math.round((hombres / totalHombres) * 100) : 0;
    const porcentajeMujeres = totalMujeres > 0 ? Math.round((mujeres / totalMujeres) * 100) : 0;

    return {
      rango: `${rango} días`, // ✅ Aquí las etiquetas también dicen "días"
      hombres,
      mujeres,
      porcentajeHombres,
      porcentajeMujeres
    };
  });
});

const graficaDiasIncapacidadOptions = computed(() => ({
  indexAxis: 'x', // ✅ Barras verticales
  maintainAspectRatio: false,
  responsive: true,
  layout: {
    padding: {
      right: 60
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
          const totalHombres = context.chart.data.datasets[0]?.data.reduce((a, b) => a + b, 0) || 0;
          const totalMujeres = context.chart.data.datasets[1]?.data.reduce((a, b) => a + b, 0) || 0;
          const total = totalHombres + totalMujeres;
          const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0;
          return `${context.dataset.label}: ${value} casos (${porcentaje}%)`;
        }
      }
    },
    datalabels: {
      color: '#FFFFFF', // blanco
      anchor: 'center',
      align: 'center',
      formatter: (value, context) => {
        if (value === 0) return null;
        return `${value}`;
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
      stacked: true,
      grid: { display: false },
      ticks: {
        color: '#374151',
        font: { size: 12 },
        callback: (value, index) => `${graficaDiasIncapacidadData.value.labels[index]}`
      }
    },
    y: {
      beginAtZero: true,
      stacked: true,
      grid: { display: false },
      ticks: {
        color: '#374151',
        font: { size: 12 },
        callback: (value) => Number.isInteger(value) ? value : ''
      }
    }
  }
}));

// Computed para gráfica y tabla de Casos con secuelas
const graficaCasosSecuelasData = computed(() => {
  if (!riesgosFiltrados.value.length) return { labels: [], datasets: [], casosSecuelas: 0, porcentaje: 0 };

  const totalCasos = riesgosFiltrados.value.length;
  const casosSecuelas = contarCasosSecuelas(riesgosFiltrados.value);
  const porcentaje = totalCasos > 0 ? Math.round((casosSecuelas / totalCasos) * 100) : 0;

  return {
    labels: ['Con secuelas', 'Sin secuelas'],
    datasets: [
      {
        data: [casosSecuelas, totalCasos - casosSecuelas],
        backgroundColor: ['#4B5563', '#9CA3AF'], // Gris oscuro y medio
        hoverOffset: 8,
      }
    ],
    casosSecuelas,
    porcentaje
  };
});

const tablaCasosSecuelas = computed(() => {
  if (!riesgosFiltrados.value.length) return [];

  const totalCasos = riesgosFiltrados.value.length;
  const casosSecuelas = contarCasosSecuelas(riesgosFiltrados.value);
  const casosSinSecuelas = totalCasos - casosSecuelas;
  const porcentajeSecuelas = totalCasos > 0 ? Math.round((casosSecuelas / totalCasos) * 100) : 0;
  const porcentajeSinSecuelas = totalCasos > 0 ? Math.round((casosSinSecuelas / totalCasos) * 100) : 0;

  return [
    { estado: 'Con secuelas', cantidad: casosSecuelas, porcentaje: porcentajeSecuelas },
    { estado: 'Sin secuelas', cantidad: casosSinSecuelas, porcentaje: porcentajeSinSecuelas }
  ];
});

// Computed para gráfica y tabla de manejo
const graficaManejoData = computed(() => {
  if (!riesgosFiltrados.value.length) return { labels: [], datasets: [], total: 0, porcentaje: 0 };

  // Usamos la función contarPorManejo para obtener los datos
  const resultados = contarPorManejo(riesgosFiltrados.value);
  const etiquetas = Object.keys(resultados);
  const valores = Object.values(resultados);
  const total = valores.reduce((acc, val) => acc + val, 0);
  const porcentaje = total > 0 ? Math.round((valores[0] / total) * 100) : 0; // Porcentaje del primer valor (IMSS)

  return {
    labels: etiquetas,
    datasets: [
      {
        data: valores,
        backgroundColor: ['#4B5563', '#9CA3AF'], // Colores para IMSS e Interno
        hoverOffset: 8,
      }
    ],
    total,
    porcentaje
  };
});

const tablaManejo = computed(() => {
  if (!riesgosFiltrados.value.length) return [];

  // Usamos la función contarPorManejo para obtener los datos
  const resultados = contarPorManejo(riesgosFiltrados.value);
  const total = Object.values(resultados).reduce((acc, val) => acc + val, 0);

  return Object.entries(resultados).map(([manejo, cantidad]) => {
    const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;
    return {
      manejo,
      cantidad,
      porcentaje
    };
  });
});

// Computed para contador de días de incapacidad
const totalDiasIncapacidadAcumulada = computed(() => {
  if (!riesgosFiltrados.value.length) return 0;
  return calcularTotalDiasIncapacidad(riesgosFiltrados.value);
});

// computed para gráfica y tabla para recaidas
const graficaRecaidasData = computed(() => {
  if (!riesgosFiltrados.value.length) return { labels: [], datasets: [], total: 0, porcentaje: 0 };

  // Usamos la función contarRecaidas para obtener los datos
  const resultados = contarRecaidas(riesgosFiltrados.value);
  
  // Mapeamos las etiquetas Si/No a Recaídas/No recaída
  const etiquetasMapeadas = {
    "Si": "Recaídas",
    "No": "No son recaídas"
  };
  
  const etiquetas = Object.keys(resultados).map(key => etiquetasMapeadas[key] || key);
  const valores = Object.values(resultados);
  const total = valores.reduce((acc, val) => acc + val, 0);

  // Calculamos el porcentaje solo para "Si" (Recaídas)
  const porcentaje = total > 0 ? Math.round((resultados["Si"] || 0) / total * 100) : 0;

  return {
    labels: etiquetas,
    datasets: [
      {
        data: valores,
        backgroundColor: ['#4B5563', '#9CA3AF'], // Colores para Recaídas y No recaída
        hoverOffset: 8,
      }
    ],
    total: resultados["Si"] || 0,
    porcentaje
  };
});

const tablaRecaidas = computed(() => {
  if (!riesgosFiltrados.value.length) return [];

  // Usamos la función contarRecaidas para obtener los datos
  const resultados = contarRecaidas(riesgosFiltrados.value);
  const total = Object.values(resultados).reduce((acc, val) => acc + val, 0);

  // Creamos la tabla con el porcentaje calculado
  return Object.entries(resultados).map(([recaida, cantidad]) => {
    const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;
    return {
      recaida,
      cantidad,
      porcentaje
    };
  });
});

/* =====================
   Filtros Reactivos
===================== */
const mostrarFiltros = ref(false);
interface CentroTrabajo { nombreCentro: string; [key: string]: any; }
const sexoSeleccionado = ref<string>('todos');
const puestoSeleccionado = ref<string>('todos');
const periodoSeleccionado = ref<string>('todos');
const edadSeleccionada = ref<string>('todos');
const antiguedadSeleccionada = ref<string>('todos');
const naturalezaSeleccionada = ref<string>('todos');
const parteCuerpoSeleccionada = ref<string>('todos');
const recaidaSeleccionada = ref<string>('todos');
const tipoRiesgoSeleccionado = ref<string>('todos');
const manejoSeleccionado = ref<string>('todos');
const altaSeleccionada = ref<string>('todos');
const diasIncapacidadSeleccionados = ref<string>('todos');
const secuelasSeleccionadas = ref<string>('todos');
const busquedaTexto = ref<string>("");
const inputBusqueda = ref<HTMLInputElement | null>(null);

/* =====================
   Computed: Filtros Dinámicos
===================== */
const hayFiltrosActivos = computed(() => {
  return (
    sexoSeleccionado.value !== 'todos' ||
    puestoSeleccionado.value !== 'todos' ||
    periodoSeleccionado.value !== 'todos' ||
    edadSeleccionada.value !== 'todos' ||
    antiguedadSeleccionada.value !== 'todos' ||
    naturalezaSeleccionada.value !== 'todos' ||
    parteCuerpoSeleccionada.value !== 'todos' ||
    recaidaSeleccionada.value !== 'todos' ||
    tipoRiesgoSeleccionado.value !== 'todos' ||
    manejoSeleccionado.value !== 'todos' ||
    altaSeleccionada.value !== 'todos' ||
    diasIncapacidadSeleccionados.value !== 'todos' ||
    secuelasSeleccionadas.value !== 'todos'
  );
});

const puestosDisponibles = computed(() => puestosDisponiblesFijos.value);
const naturalezasDisponibles = computed(() => naturalezasDisponiblesFijos.value);
const parteCuerpoDisponibles = computed(() => partesCuerpoDisponiblesFijos.value);

const opcionesPeriodo = [ "Este mes", "Mes anterior", "Últimos 90 días", "Últimos 6 meses", "Este año", "Año anterior" ];

const rangoFechas = computed(() => {
  const ahora = new Date();

  switch (periodoSeleccionado.value) {
    case "Este mes":
      return {
        inicio: startOfMonth(ahora),
        fin: endOfMonth(ahora),
      };
    case "Mes anterior":
      const mesAnterior = subMonths(ahora, 1);
      return {
        inicio: startOfMonth(mesAnterior),
        fin: endOfMonth(mesAnterior),
      };
    case "Últimos 90 días":
      return {
        inicio: subDays(ahora, 90),
        fin: ahora,
      };
    case "Últimos 6 meses":
      return {
        inicio: subMonths(ahora, 6),
        fin: ahora,
      };
    case "Este año":
      return {
        inicio: startOfYear(ahora),
        fin: endOfYear(ahora),
      };
    case "Año anterior":
      const anoAnterior = subYears(ahora, 1);
      return {
        inicio: startOfYear(anoAnterior),
        fin: endOfYear(anoAnterior),
      };
    default:
      return { inicio: null, fin: null };
  }
});

const opcionesEdad = ["16–20", "21–25", "26–30", "31–35", "36–40", "41–45", "46–50", "51–55", "56–60", "61–65" ];

function obtenerEdadMinima(rango: string): number {
  if (rango === "todos") return 0;
  return Number(rango.split("–")[0]);
}

function obtenerEdadMaxima(rango: string): number {
  if (rango === "todos") return 120;
  return Number(rango.split("–")[1]);
}

const opcionesAntiguedad = [ "0–1", "1–5", "5–10", "10–15", "15–20", "20–30", "> 30" ];

function calcularAntiguedadAnios(fechaIngreso: string): number {
  const fechaInicio = new Date(fechaIngreso);
  const fechaActual = new Date();
  const diferenciaAnios = fechaActual.getFullYear() - fechaInicio.getFullYear();
  return diferenciaAnios;
}

// Computed para calcular el rango de antigüedad
function obtenerAntiguedadMinima(rango: string): number {
  if (rango === "todos") return 0;
  if (rango === "> 30") return 31;
  return Number(rango.split("–")[0]);
}

function obtenerAntiguedadMaxima(rango: string): number {
  if (rango === "todos") return 100;
  if (rango === "> 30") return 100;
  return Number(rango.split("–")[1]);
}

const opcionesDiasIncapacidad = [ "0–10", "11–30", "31–60", "61–90", "91–120", "121–150", "> 150" ];

function cumpleRangoDiasIncapacidad(dias: number, rango: string): boolean {
  if (rango === "> 150") return dias > 150;

  const [inicio, fin] = rango.split("–").map(Number);
  return dias >= inicio && dias <= fin;
}

/* =====================
   Funciones útiles
===================== */
function limpiarFiltros() {
  sexoSeleccionado.value = 'todos';
  puestoSeleccionado.value = 'todos';
  periodoSeleccionado.value = 'todos';
  edadSeleccionada.value = 'todos';
  antiguedadSeleccionada.value = 'todos';
  naturalezaSeleccionada.value = 'todos';
  parteCuerpoSeleccionada.value = 'todos';
  recaidaSeleccionada.value = 'todos';
  tipoRiesgoSeleccionado.value = 'todos';
  manejoSeleccionado.value = 'todos';
  altaSeleccionada.value = 'todos';
  diasIncapacidadSeleccionados.value = 'todos';
  secuelasSeleccionadas.value = 'todos';
}

/* =====================
   Manejo de Eventos
===================== */
function handleClickGraficaNaturalezaLesion(event) {
  const index = event[0]?.index;
  if (index !== undefined) {
    const naturaleza = graficaNaturalezaLesionData.value.labels[index];
    console.log('Clic en naturaleza:', naturaleza);
  }
}

function handleClickTablaNaturalezaLesion(naturaleza) {
  console.log('Clic en naturaleza (Tabla):', naturaleza);
}

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
          <div class="flex items-center gap-6 mb-6">
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

            <!-- Ajustado a nivel del encabezado -->
            <div class="mb-4 ml-auto flex items-end gap-6">
              <!-- Indicador de total de trabajadores -->
                <div class="bg-white border border-gray-200 shadow-md rounded-xl px-6 py-2 text-center self-center">
                <div class="text-xs text-gray-500">
                  <i class="fas fa-users mr-1 text-gray-400"></i>
                  <span class="lg:hidden">RTs</span>
                  <span class="hidden lg:block">Riesgos de Trabajo</span>
                </div>
                <div class="text-2xl font-bold text-emerald-600 leading-tight">{{ totalRiesgos }}</div>
                </div>

              <!-- Selector de centro de trabajo -->
              <div class="self-end">
                <label class="block text-xs md:text-sm font-medium text-gray-700">Centro de trabajo</label>
                <select
                  v-model="centroSeleccionado"
                  class="border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 px-2 py-1 rounded-md shadow-sm text-xs md:text-sm font-medium text-gray-700 bg-white transition duration-150 ease-in-out mt-1"
                >
                  <option v-for="centro in centrosTrabajoOptions" :key="centro" :value="centro">{{ centro }}</option>
                </select>
              </div>
            </div>

          </div>

          <!-- =======================
               Panel de controles y filtros
          ======================= -->
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
            <!-- Controles principales -->
            <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-3">
              <div class="flex flex-wrap items-center gap-2">
                <!-- Toggle filtros -->
                <button
                  @click="mostrarFiltros = !mostrarFiltros"
                  :class="[
                    'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border',
                    mostrarFiltros 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
                  ]"
                  :title="mostrarFiltros ? 'Ocultar panel de filtros' : 'Mostrar opciones de filtrado avanzado'"
                >
                  <i :class="mostrarFiltros ? 'fa-solid fa-filter-circle-xmark' : 'fa-solid fa-filter'"></i>
                  {{ mostrarFiltros ? 'Ocultar filtros' : 'Mostrar filtros' }}
                </button>

                <!-- Indicador de filtros activos -->
                <div v-if="hayFiltrosActivos" 
                     class="inline-flex items-center gap-1.5 px-2 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg"
                     title="Filtros aplicados actualmente">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span class="text-xs font-medium text-emerald-700">Filtros activos</span>
                </div>
              </div>

              <!-- Botón reset filtros -->
              <button
                v-if="hayFiltrosActivos"
                @click="limpiarFiltros"
                class="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg border border-red-200 transition-all duration-200 hover:border-red-300 hover:shadow-sm"
                title="Eliminar todos los filtros aplicados"
              >
                <i class="fa-solid fa-rotate-left text-xs"></i>
                Limpiar filtros
              </button>
            </div>

            <!-- Sección de filtros -->
            <Transition name="desplegar-filtros" mode="out-in">
              <div v-if="mostrarFiltros" class="border-t border-gray-100 pt-4">
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                <!-- Filtro por Sexo -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Sexo</label>
                  <div class="relative">
                    <select
                      v-model="sexoSeleccionado"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        sexoSeleccionado !== 'todos' 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="sexoSeleccionado !== 'todos'" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>
      
                <!-- Filtro por Puesto -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Puesto</label>
                  <div class="relative">
                    <select
                      v-model="puestoSeleccionado"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        puestoSeleccionado !== 'todos' 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option v-for="puesto in puestosDisponibles" :key="puesto" :value="puesto">
                        {{ puesto }}
                      </option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="puestoSeleccionado !== 'todos'" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>

                <!-- Filtro por Periodo -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Periodo</label>
                  <div class="relative">
                    <select
                      v-model="periodoSeleccionado"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        periodoSeleccionado !== 'todos' 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option v-for="opcion in opcionesPeriodo" :key="opcion" :value="opcion">
                        {{ opcion }}
                      </option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="periodoSeleccionado !== 'todos'" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>

                <!-- Filtro por Edad -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Edad</label>
                  <div class="relative">
                    <select
                      v-model="edadSeleccionada"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        edadSeleccionada !== 'todos' 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option v-for="rango in opcionesEdad" :key="rango" :value="rango">
                        {{ rango }}
                      </option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="edadSeleccionada !== 'todos'" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>

                <!-- Filtro por Antigüedad -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Antigüedad</label>
                  <div class="relative">
                    <select
                      v-model="antiguedadSeleccionada"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        antiguedadSeleccionada !== 'todos' 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option v-for="rango in opcionesAntiguedad" :key="rango" :value="rango">
                        {{ rango }}
                      </option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="antiguedadSeleccionada !== 'todos'" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>

                <!-- Filtro por Naturaleza de la Lesión -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Naturaleza de la Lesión</label>
                  <div class="relative">
                    <select
                      v-model="naturalezaSeleccionada"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        naturalezaSeleccionada !== 'todos' 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option v-for="naturaleza in naturalezasDisponibles" :key="naturaleza" :value="naturaleza">
                        {{ naturaleza }}
                      </option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="naturalezaSeleccionada !== 'todos'" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>

                <!-- Filtro por Parte del Cuerpo Afectada -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Parte del Cuerpo Afectada</label>
                  <div class="relative">
                    <select
                      v-model="parteCuerpoSeleccionada"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        parteCuerpoSeleccionada !== 'todos' 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option v-for="parte in parteCuerpoDisponibles" :key="parte" :value="parte">
                        {{ parte }}
                      </option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="parteCuerpoSeleccionada !== 'todos'" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>

                <!-- Filtro por Recaída -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Recaída</label>
                  <div class="relative">
                    <select
                      v-model="recaidaSeleccionada"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        recaidaSeleccionada !== 'todos' 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option value="Si">Sí</option>
                      <option value="No">No</option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="recaidaSeleccionada !== 'todos'" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>
              
                <!-- Filtro por Tipo de Riesgo -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Tipo de Riesgo</label>
                  <div class="relative">
                    <select
                      v-model="tipoRiesgoSeleccionado"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        tipoRiesgoSeleccionado !== 'todos' 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option value="Accidente de Trabajo">Accidente de Trabajo</option>
                      <option value="Accidente de Trayecto">Accidente de Trayecto</option>
                      <option value="Enfermedad de Trabajo">Enfermedad de Trabajo</option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="tipoRiesgoSeleccionado !== 'todos'" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>
              
                <!-- Filtro por Manejo -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Manejo</label>
                  <div class="relative">
                    <select
                      v-model="manejoSeleccionado"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        manejoSeleccionado !== 'todos'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option value="IMSS">IMSS</option>
                      <option value="Interno">Interno</option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="manejoSeleccionado !== 'todos'" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>

                <!-- Filtro por Alta -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Alta</label>
                  <div class="relative">
                    <select
                      v-model="altaSeleccionada"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        altaSeleccionada !== 'todos'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option value="Incapacidad Activa">Incapacidad Activa</option>
                      <option value="Alta ST2">Alta ST2</option>
                      <option value="Alta Interna">Alta Interna</option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="altaSeleccionada !== 'todos'" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>

                <!-- Filtro por Días de Incapacidad -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Días de Incapacidad</label>
                  <div class="relative">
                    <select
                      v-model="diasIncapacidadSeleccionados"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        diasIncapacidadSeleccionados !== 'todos' 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option v-for="rango in opcionesDiasIncapacidad" :key="rango" :value="rango">
                        {{ rango }}
                      </option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="diasIncapacidadSeleccionados !== 'todos'" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>

                <!-- Filtro por Secuelas -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Secuelas</label>
                  <div class="relative">
                    <select
                      v-model="secuelasSeleccionadas"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        secuelasSeleccionadas !== 'todos'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option value="Si">Si</option>
                      <option value="No">No</option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="secuelasSeleccionadas !== 'todos'" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>
              </div>
            </div>
            </Transition>
          </div>

          <!-- =======================
              Gráficas y Tablas
          ======================= -->
          <div class="mx-auto">
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-8 auto-rows-[370px] sm:auto-rows-[400px] md:auto-rows-[425px] lg:auto-rows-[450px]">

              <!-- Naturaleza Lesión: 2 columnas -->
              <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-2 xl:col-span-2">
                <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                  <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    Naturaleza Lesión
                    <span class="relative cursor-help">
                      <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                      <span
                        class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-72 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                      >
                        Muestra la distribución de riesgos de trabajo según la naturaleza de la lesión.
                      </span>
                    </span>
                  </h3>
                  <div class="flex gap-2">
                    <button
                      @click="vistaNaturalezaLesion = 'grafico'"
                      :class="[
                        'px-3 py-1 rounded text-sm font-medium',
                        vistaNaturalezaLesion === 'grafico'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      ]"
                    >
                      Gráfico
                    </button>
                    <button
                      @click="vistaNaturalezaLesion = 'tabla'"
                      :class="[
                        'px-3 py-1 rounded text-sm font-medium',
                        vistaNaturalezaLesion === 'tabla'
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
                    <template v-if="vistaNaturalezaLesion === 'grafico'">
                      <GraficaBarras
                        :data="graficaNaturalezaLesionData"
                        :options="graficaBarrasHorizontalesOptions"
                      />
                    </template>

                    <template v-else>
                      <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                        <thead class="bg-gray-100 text-gray-700">
                          <tr>
                            <th class="py-2 px-4 text-left text-lg">Naturaleza Lesión</th>
                            <th class="py-2 px-4 text-center text-lg">Hombres</th>
                            <th class="py-2 px-4 text-center text-lg">Mujeres</th>
                          </tr>
                        </thead>
                        <TransitionGroup name="fade-table" tag="tbody">
                          <tr
                            v-for="item in tablaNaturalezaLesion"
                            :key="item.naturaleza"
                            class="border-t hover:bg-gray-200 transition cursor-pointer"
                            @click="handleClickTablaNaturalezaLesion(item.naturaleza)"
                          >
                            <td class="py-1 px-4 font-medium text-gray-700 text-lg">{{ item.naturaleza }}</td>
                            <td class="py-1 px-4 text-center text-blue-700 text-lg">
                              {{ item.hombres }} 
                              <span class="text-sm text-gray-500">({{ item.porcentajeHombres }}%)</span>
                            </td>
                            <td class="py-1 px-4 text-center text-pink-700 text-lg">
                              {{ item.mujeres }} 
                              <span class="text-sm text-gray-500">({{ item.porcentajeMujeres }}%)</span>
                            </td>
                          </tr>
                        </TransitionGroup>
                      </table>

                    </template>
                  </Transition>
                </div>
              </div>

              <!-- Parte de Cuerpo Afectada: 2 columnas -->
              <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-2 xl:col-span-2">
                <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                  <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    Parte del Cuerpo Afectada
                  </h3>
                  <div class="flex gap-2">
                    <button
                      @click="vistaParteCuerpo = 'grafico'"
                      :class="[
                        'px-3 py-1 rounded text-sm font-medium',
                        vistaParteCuerpo === 'grafico'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      ]"
                    >
                      Gráfico
                    </button>
                    <button
                      @click="vistaParteCuerpo = 'tabla'"
                      :class="[
                        'px-3 py-1 rounded text-sm font-medium',
                        vistaParteCuerpo === 'tabla'
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
                    <template v-if="vistaParteCuerpo === 'grafico'">
                      <GraficaBarras
                        :data="graficaParteCuerpoData"
                        :options="graficaBarrasHorizontalesOptions" 
                      />
                    </template>

                    <template v-else>
                      <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                        <thead class="bg-gray-100 text-gray-700">
                          <tr>
                            <th class="py-2 px-4 text-left text-lg">Parte del Cuerpo</th>
                            <th class="py-2 px-4 text-center text-lg">Hombres</th>
                            <th class="py-2 px-4 text-center text-lg">Mujeres</th>
                          </tr>
                        </thead>
                        <TransitionGroup name="fade-table" tag="tbody">
                          <tr
                            v-for="item in tablaParteCuerpo"
                            :key="item.parte"
                            class="border-t hover:bg-gray-200 transition cursor-pointer"
                          >
                            <td class="py-1 px-4 font-medium text-gray-700 text-lg">{{ item.parte }}</td>
                            <td class="py-1 px-4 text-center text-blue-700 text-lg">
                              {{ item.hombres }} 
                              <span class="text-sm text-gray-500">({{ item.porcentajeHombres }}%)</span>
                            </td>
                            <td class="py-1 px-4 text-center text-pink-700 text-lg">
                              {{ item.mujeres }} 
                              <span class="text-sm text-gray-500">({{ item.porcentajeMujeres }}%)</span>
                            </td>
                          </tr>
                        </TransitionGroup>
                      </table>
                    </template>
                  </Transition>
                </div>
              </div>

              <!-- Tipo de Riesgo, Estado Alta, Puestos de Trabajo -->
                <!-- Tipos de Riesgo: 1 columna -->
              <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
                <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                  <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    Tipos de Riesgo
                    <span class="relative cursor-help">
                      <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                      <span
                        class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                      >
                        Distribución de los diferentes tipos de riesgo por género.
                      </span>
                    </span>
                  </h3>
                  <div class="flex gap-2">
                    <button
                      @click="vistaTiposRiesgo = 'grafico'"
                      :class="[
                        'px-3 py-1 rounded text-sm font-medium',
                        vistaTiposRiesgo === 'grafico'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      ]"
                    >
                      Gráfico
                    </button>
                    <button
                      @click="vistaTiposRiesgo = 'tabla'"
                      :class="[
                        'px-3 py-1 rounded text-sm font-medium',
                        vistaTiposRiesgo === 'tabla'
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
                    <template v-if="vistaTiposRiesgo === 'grafico'">
                      <GraficaBarras
                        :data="graficaTiposRiesgoData"
                        :options="graficaTiposRiesgoOptions"
                      />
                    </template>

                    <template v-else>
                      <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                        <thead class="bg-gray-100 text-gray-700">
                          <tr>
                            <th class="py-2 px-4 text-left text-lg">Tipo de Riesgo</th>
                            <th class="py-2 px-4 text-center text-lg">Hombres</th>
                            <th class="py-2 px-4 text-center text-lg">Mujeres</th>
                          </tr>
                        </thead>
                        <TransitionGroup name="fade-table" tag="tbody">
                          <tr
                            v-for="item in tablaTiposRiesgo"
                            :key="item.tipo"
                            class="border-t hover:bg-gray-200 transition cursor-pointer"
                          >
                            <td class="py-1 px-4 font-medium text-gray-700 text-lg">{{ item.tipo }}</td>
                            <td class="py-1 px-4 text-center text-blue-700 text-lg">
                              {{ item.hombres }} 
                              <span class="text-sm text-gray-500">({{ item.porcentajeHombres }}%)</span>
                            </td>
                            <td class="py-1 px-4 text-center text-pink-700 text-lg">
                              {{ item.mujeres }} 
                              <span class="text-sm text-gray-500">({{ item.porcentajeMujeres }}%)</span>
                            </td>
                          </tr>
                        </TransitionGroup>
                      </table>
                    </template>
                  </Transition>
                </div>
              </div>

              <!-- Estado Alta: 1 columna -->
              <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
                <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                  <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    Incapacidades
                    <span class="relative cursor-help">
                      <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                      <span
                        class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                      >
                        Distribución del estado de alta de los riesgos de trabajo.
                      </span>
                    </span>
                  </h3>

                  <div class="flex gap-2 mt-2">
                    <button
                      @click="vistaEstadoAlta = 'grafico'"
                      :class="[
                        'px-3 py-1 rounded text-sm font-medium',
                        vistaEstadoAlta === 'grafico' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      ]"
                    >
                      Gráfico
                    </button>
                    <button
                      @click="vistaEstadoAlta = 'tabla'"
                      :class="[
                        'px-3 py-1 rounded text-sm font-medium',
                        vistaEstadoAlta === 'tabla' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      ]"
                    >
                      Tabla
                    </button>
                  </div>
                </div>
                
                <div class="flex-1 overflow-x-auto mt-4">
                  <Transition name="fade" mode="out-in">
                    <template v-if="vistaEstadoAlta === 'grafico'">
                      <GraficaAnillo
                        :data="graficaEstadoAltaData"
                        :options="opcionesGenericasAnillo"
                        :cantidad="graficaEstadoAltaData.incapacidadActiva"
                        :porcentaje="graficaEstadoAltaData.porcentaje"
                      />
                    </template>

                    <template v-else>
                      <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                        <thead class="bg-gray-100 text-gray-700">
                          <tr>
                            <th class="py-2 px-4 text-left text-lg">Estado Alta</th>
                            <th class="py-2 px-4 text-center text-lg">Casos</th>
                          </tr>
                        </thead>
                        <TransitionGroup name="fade-table" tag="tbody">
                          <tr
                            v-for="item in tablaEstadoAlta"
                            :key="item.estado"
                            class="border-t hover:bg-gray-200 transition cursor-pointer"
                          >
                            <td class="py-1 px-4 font-medium text-gray-700 text-lg">{{ item.estado }}</td>
                            <td class="py-1 px-4 text-center text-gray-700 text-lg">{{ item.cantidad }}
                              <span class="text-sm text-gray-500">({{ item.porcentaje }}%)</span>
                            </td>

                          </tr>
                        </TransitionGroup>
                      </table>
                    </template>
                  </Transition>
                </div>
              </div>

              <!-- Puestos de Trabajo: 2 columnas -->
              <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-2 xl:col-span-2">
                <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                  <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    Puestos de Trabajo
                  </h3>
                  <div class="flex gap-2">
                    <button
                      @click="vistaPuestosTrabajo = 'grafico'"
                      :class="[
                        'px-3 py-1 rounded text-sm font-medium',
                        vistaPuestosTrabajo === 'grafico'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      ]"
                    >
                      Gráfico
                    </button>
                    <button
                      @click="vistaPuestosTrabajo = 'tabla'"
                      :class="[
                        'px-3 py-1 rounded text-sm font-medium',
                        vistaPuestosTrabajo === 'tabla'
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
                    <template v-if="vistaPuestosTrabajo === 'grafico'">
                      <GraficaBarras
                        :data="graficaPuestosTrabajoData"
                        :options="graficaBarrasHorizontalesOptions"
                      />
                    </template>

                    <template v-else>
                      <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                        <thead class="bg-gray-100 text-gray-700">
                          <tr>
                            <th class="py-2 px-4 text-left text-lg">Puesto</th>
                            <th class="py-2 px-4 text-center text-lg">Hombres</th>
                            <th class="py-2 px-4 text-center text-lg">Mujeres</th>
                          </tr>
                        </thead>
                        <TransitionGroup name="fade-table" tag="tbody">
                          <tr
                            v-for="item in tablaPuestosTrabajo"
                            :key="item.puesto"
                            class="border-t hover:bg-gray-200 transition cursor-pointer"
                          >
                            <td class="py-1 px-4 font-medium text-gray-700 text-lg">{{ item.puesto }}</td>
                            <td class="py-1 px-4 text-center text-blue-700 text-lg">
                              {{ item.hombres }} 
                              <span class="text-sm text-gray-500">({{ item.porcentajeHombres }}%)</span>
                            </td>
                            <td class="py-1 px-4 text-center text-pink-700 text-lg">
                              {{ item.mujeres }} 
                              <span class="text-sm text-gray-500">({{ item.porcentajeMujeres }}%)</span>
                            </td>
                          </tr>
                        </TransitionGroup>
                      </table>
                    </template>
                  </Transition>
                </div>
              </div>

              <!-- Distribución Días, Casos IPP, Total Días -->
                <!-- Distribución de Días de Incapacidad: 2 columnas -->
              <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col col-span-1 sm:col-span-2 xl:col-span-2">
                <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                  <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    Distribución de Casos con Días de Incapacidad
                    <span class="relative cursor-help">
                      <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                      <span
                        class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-72 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                      >
                        Muestra el número de casos (RTs) que resultaron en días de incapacidad, distribuidos por rango.
                      </span>
                    </span>
                  </h3>
                  <div class="flex gap-2">
                    <button
                      @click="vistaDiasIncapacidad = 'grafico'"
                      :class="[
                        'px-3 py-1 rounded text-sm font-medium',
                        vistaDiasIncapacidad === 'grafico'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      ]"
                    >
                      Gráfico
                    </button>
                    <button
                      @click="vistaDiasIncapacidad = 'tabla'"
                      :class="[
                        'px-3 py-1 rounded text-sm font-medium',
                        vistaDiasIncapacidad === 'tabla'
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
                    <template v-if="vistaDiasIncapacidad === 'grafico'">
                      <GraficaBarras
                        :data="graficaDiasIncapacidadData"
                        :options="graficaDiasIncapacidadOptions"
                      />
                    </template>

                    <template v-else>
                      <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                        <thead class="bg-gray-100 text-gray-700">
                          <tr>
                            <th class="py-2 px-4 text-left text-lg">Rango</th>
                            <th class="py-2 px-4 text-center text-lg">Hombres</th>
                            <th class="py-2 px-4 text-center text-lg">Mujeres</th>
                          </tr>
                        </thead>
                        <TransitionGroup name="fade-table" tag="tbody">
                          <tr
                            v-for="item in tablaDiasIncapacidad"
                            :key="item.rango"
                            class="border-t hover:bg-gray-200 transition cursor-pointer"
                          >
                            <td class="py-1 px-4 font-medium text-gray-700 text-lg">{{ item.rango }}</td>
                            <td class="py-1 px-4 text-center text-blue-700 text-lg">
                              {{ item.hombres }} 
                              <span class="text-sm text-gray-500">({{ item.porcentajeHombres }}%)</span>
                            </td>
                            <td class="py-1 px-4 text-center text-pink-700 text-lg">
                              {{ item.mujeres }} 
                              <span class="text-sm text-gray-500">({{ item.porcentajeMujeres }}%)</span>
                            </td>
                          </tr>
                        </TransitionGroup>
                      </table>
                    </template>
                  </Transition>
                </div>
              </div>

                <!-- Casos Secuelas: 1 columna -->
              <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
                <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                  <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    Secuelas
                    <span class="relative cursor-help">
                      <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                      <span
                        class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                      >
                        Muestra el total de casos con IPP (Incapacidad Permanente Parcial).
                      </span>
                    </span>
                  </h3>

                  <div class="flex gap-2 mt-2">
                    <button
                      @click="vistaCasosSecuelas = 'grafico'"
                      :class="[
                        'px-3 py-1 rounded text-sm font-medium',
                        vistaCasosSecuelas === 'grafico' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      ]"
                    >
                      Gráfico
                    </button>
                    <button
                      @click="vistaCasosSecuelas = 'tabla'"
                      :class="[
                        'px-3 py-1 rounded text-sm font-medium',
                        vistaCasosSecuelas === 'tabla' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      ]"
                    >
                      Tabla
                    </button>
                  </div>
                </div>
                
                <div class="flex-1 overflow-x-auto mt-4">
                  <Transition name="fade" mode="out-in">
                    <template v-if="vistaCasosSecuelas === 'grafico'">
                      <GraficaAnillo
                        :data="graficaCasosSecuelasData"
                        :options="opcionesGenericasAnillo"
                        :cantidad="graficaCasosSecuelasData.casosSecuelas"
                        :porcentaje="graficaCasosSecuelasData.porcentaje"
                      />
                    </template>

                    <template v-else>
                      <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                        <thead class="bg-gray-100 text-gray-700">
                          <tr>
                            <th class="py-2 px-4 text-left text-lg">Secuelas</th>
                            <th class="py-2 px-4 text-center text-lg">Casos</th>
                          </tr>
                        </thead>
                        <TransitionGroup name="fade-table" tag="tbody">
                          <tr
                            v-for="item in tablaCasosSecuelas"
                            :key="item.estado"
                            class="border-t hover:bg-gray-200 transition cursor-pointer"
                          >
                            <td class="py-1 px-4 font-medium text-gray-700 text-lg">{{ item.estado }}</td>
                            <td class="py-1 px-4 text-center text-gray-700 text-lg">{{ item.cantidad }}
                              <span class="text-sm text-gray-500">({{ item.porcentaje }}%)</span>
                            </td>
                          </tr>
                        </TransitionGroup>
                      </table>
                    </template>
                  </Transition>
                </div>
              </div>

              <!-- Total de Días de Incapacidad -->
              <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
                <div class="flex items-start justify-between border-b border-gray-200 pb-2 mb-4">
                  <div class="flex flex-col gap-0.5">
                    <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                      Total de Días de Incapacidad
                      <span class="relative cursor-help">
                        <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                        <span
                          class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600"
                        >
                          Suma total de <span class="font-semibold text-emerald-600 dark:text-emerald-300">días de incapacidad</span> acumulados en todos los <span class="font-semibold text-emerald-600 dark:text-emerald-300">riesgos de trabajo</span>.
                        </span>
                      </span>
                    </h3>
                  </div>
                </div>

                <!-- Número principal -->
                <div 
                  :class="[
                    'flex-1 flex items-center justify-center text-center rounded-lg transition',
                    totalDiasIncapacidadAcumulada > 0 ? 'cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/30' : 'cursor-default'
                  ]"
                >
                  <div class="text-center">
                    <div class="text-8xl font-medium text-emerald-600 dark:text-emerald-300">
                      {{ totalDiasIncapacidadAcumulada }}
                    </div>
                    <div class="text-sm text-gray-500 dark:text-slate-300 mt-1">Total de días acumulados</div>
                  </div>
                </div>

                <h4 class="text-xs text-gray-600 font-normal italic text-center">
                  Días acumulados en todos los riesgos de trabajo
                </h4>
              </div>

              <!-- Manejo y Recaídas -->
                <!-- Manejo: 1 columna -->
              <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
                <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                  <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    Casos IMSS
                    <span class="relative cursor-help">
                      <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                      <span
                        class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                      >
                        Muestra la distribución de casos por tipo de manejo (IMSS, Interno).
                      </span>
                    </span>
                  </h3>

                  <div class="flex gap-2 mt-2">
                    <button
                      @click="vistaManejo = 'grafico'"
                      :class="[
                        'px-3 py-1 rounded text-sm font-medium',
                        vistaManejo === 'grafico' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      ]"
                    >
                      Gráfico
                    </button>
                    <button
                      @click="vistaManejo = 'tabla'"
                      :class="[
                        'px-3 py-1 rounded text-sm font-medium',
                        vistaManejo === 'tabla' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      ]"
                    >
                      Tabla
                    </button>
                  </div>
                </div>
                
                <div class="flex-1 overflow-x-auto mt-4">
                  <Transition name="fade" mode="out-in">
                    <template v-if="vistaManejo === 'grafico'">
                      <GraficaAnillo
                        :data="graficaManejoData"
                        :options="opcionesGenericasAnillo"
                        :cantidad="graficaManejoData.total"
                        :porcentaje="graficaManejoData.porcentaje"
                      />
                    </template>

                    <template v-else>
                      <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                        <thead class="bg-gray-100 text-gray-700">
                          <tr>
                            <th class="py-2 px-4 text-left text-lg">Manejo</th>
                            <th class="py-2 px-4 text-center text-lg">Casos</th>
                          </tr>
                        </thead>
                        <TransitionGroup name="fade-table" tag="tbody">
                          <tr
                            v-for="item in tablaManejo"
                            :key="item.manejo"
                            class="border-t hover:bg-gray-200 transition cursor-pointer"
                          >
                            <td class="py-1 px-4 font-medium text-gray-700 text-lg">{{ item.manejo }}</td>
                            <td class="py-1 px-4 text-center text-gray-700 text-lg">
                              {{ item.cantidad }}
                              <span class="text-sm text-gray-500">({{ item.porcentaje }}%)</span>
                            </td>
                          </tr>
                        </TransitionGroup>
                      </table>
                    </template>
                  </Transition>
                </div>
              </div>

                <!-- Recaídas: 1 columna -->
              <div class="bg-gray-50 p-6 rounded-lg shadow flex flex-col">
                <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                  <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    Recaídas
                    <span class="relative cursor-help">
                      <i class="fas fa-info-circle text-gray-400 hover:text-emerald-600 peer"></i>
                      <span
                        class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:left-full md:ml-2 md:-translate-x-0 md:-translate-y-1/2 w-64 text-sm font-normal bg-white text-gray-700 border border-gray-300 rounded shadow-lg px-3 py-2 opacity-0 peer-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                      >
                        Muestra el total de casos con y sin recaídas.
                      </span>
                    </span>
                  </h3>

                  <div class="flex gap-2 mt-2">
                    <button
                      @click="vistaRecaidas = 'grafico'"
                      :class="[
                        'px-3 py-1 rounded text-sm font-medium',
                        vistaRecaidas === 'grafico' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      ]"
                    >
                      Gráfico
                    </button>
                    <button
                      @click="vistaRecaidas = 'tabla'"
                      :class="[
                        'px-3 py-1 rounded text-sm font-medium',
                        vistaRecaidas === 'tabla' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      ]"
                    >
                      Tabla
                    </button>
                  </div>
                </div>
                
                <div class="flex-1 overflow-x-auto mt-4">
                  <Transition name="fade" mode="out-in">
                    <template v-if="vistaRecaidas === 'grafico'">
                      <GraficaAnillo
                        :data="graficaRecaidasData"
                        :options="opcionesGenericasAnillo"
                        :cantidad="graficaRecaidasData.total"
                        :porcentaje="graficaRecaidasData.porcentaje"
                      />
                    </template>

                    <template v-else>
                      <table class="min-w-full text-sm border border-gray-300 rounded h-full">
                        <thead class="bg-gray-100 text-gray-700">
                          <tr>
                            <th class="py-2 px-4 text-left text-lg">Recaída</th>
                            <th class="py-2 px-4 text-center text-lg">Casos</th>
                          </tr>
                        </thead>
                        <TransitionGroup name="fade-table" tag="tbody">
                          <tr
                            v-for="item in tablaRecaidas"
                            :key="item.recaida"
                            class="border-t hover:bg-gray-200 transition cursor-pointer"
                          >
                            <td class="py-1 px-4 font-medium text-gray-700 text-lg">{{ item.recaida }}</td>
                            <td class="py-1 px-4 text-center text-gray-700 text-lg">
                              {{ item.cantidad }} 
                              <span class="text-sm text-gray-500">({{ item.porcentaje }}%)</span>
                            </td>
                          </tr>
                        </TransitionGroup>
                      </table>
                    </template>
                  </Transition>
                </div>
              </div>
            </div>
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
</template>

<style scoped>
.fade-table-enter-active, .fade-table-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-table-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-table-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Transiciones para el despliegue de filtros */
.desplegar-filtros-enter-active,
.desplegar-filtros-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.desplegar-filtros-enter-from,
.desplegar-filtros-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.desplegar-filtros-enter-to,
.desplegar-filtros-leave-from {
  opacity: 1;
  max-height: 800px;
  transform: translateY(0);
}

/* Estilos de cursor para elementos interactivos */
button:not(:disabled) {
  cursor: pointer;
}

select {
  cursor: pointer;
}

/* Efectos hover para los botones de control */
button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Animación para el indicador de filtros activos */
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  }
  50% {
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0);
  }
}

.animate-pulse {
  animation: pulse-glow 2s infinite;
}

/* Efectos para los selects de filtros */
select:focus {
  transform: scale(1.01);
}

/* Cursor específico para elementos deshabilitados */
button:disabled {
  cursor: not-allowed;
}

/* Cursor para enlaces y elementos clickeables */
a, .cursor-pointer {
  cursor: pointer;
}

/* Transiciones suaves para todos los elementos interactivos */
* {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

/* Transiciones específicas para el encabezado de acciones */
.bg-white {
  transition: all 500ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Transiciones suaves para cambios de tamaño */
img, div, span, h1, h2, p {
  transition: all 500ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Transiciones específicas para elementos responsivos */
@media (max-width: 1024px) {
  .transition-all {
    transition-duration: 400ms;
  }
}

@media (max-width: 768px) {
  .transition-all {
    transition-duration: 350ms;
  }
}
</style>
