<script setup>
import { computed, ref, onMounted, nextTick, watch } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { calcularEdad, calcularAntiguedad, convertirFechaISOaDDMMYYYY, formatDateDDMMYYYY } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import EstadoDocumentoBadgeAlt from '../badges/EstadoDocumentoBadgeAlt.vue';
import { exportarGraficaAltaResolucion } from '@/helpers/exportChartImage';
import GraficaAudiometria from '@/components/graficas/GraficaAudiometria.vue';
import { useHtmlDarkMode } from '@/composables/useHtmlDarkMode';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const steps = useStepsStore();
const proveedorSaludStore = useProveedorSaludStore();
const isMX = computed(() => proveedorSaludStore.isMX);

// Referencia para la gráfica
const refGraficaAudiometria = ref(null);
const isHtmlDark = useHtmlDarkMode();

// Ir a un paso específico
const goToStep = (stepNumber) => {
  steps.goToStep(stepNumber);
};

// Computed para asegurar reactividad completa
const formDataAudiometria = computed(() => formData.formDataAudiometria);

// Computed para el texto del diagnóstico según el método de audiometría
const textoDiagnosticoBilateral = computed(() => {
  const metodo = formDataAudiometria.value.metodoAudiometria || 'AMA';
  if (metodo === 'AMA') {
    return 'PÉRDIDA AUDITIVA BILATERAL';
  } else if (metodo === 'LFT') {
    return 'HIPOACUSIA BILATERAL COMBINADA';
  }
  return 'HIPOACUSIA BILATERAL COMBINADA'; // Valor por defecto
});

// Función para calcular PTA AMA (500, 1000, 2000, 3000 Hz)
const calcularPTA_AMA = (oido) => {
  const frecuencias = [500, 1000, 2000, 3000];
  const valores = frecuencias.map(freq => {
    const campo = `oido${oido}${freq}`;
    return formDataAudiometria.value[campo] || 0;
  });
  
  const suma = valores.reduce((acc, val) => acc + val, 0);
  return suma / frecuencias.length;
};

// Función para calcular PTA LFT Rango A (250, 500, 1000, 2000 Hz)
const calcularPTA_LFT_RangoA = (oido) => {
  const frecuencias = [250, 500, 1000, 2000];
  const valores = frecuencias.map(freq => {
    const campo = `oido${oido}${freq}`;
    return formDataAudiometria.value[campo] || 0;
  });
  
  const suma = valores.reduce((acc, val) => acc + val, 0);
  return suma / frecuencias.length;
};

// Función para calcular PTA LFT Rango B (2000, 3000, 4000, 6000 Hz)
const calcularPTA_LFT_RangoB = (oido) => {
  const frecuencias = [2000, 3000, 4000, 6000];
  const valores = frecuencias.map(freq => {
    const campo = `oido${oido}${freq}`;
    return formDataAudiometria.value[campo] || 0;
  });
  
  const suma = valores.reduce((acc, val) => acc + val, 0);
  return suma / frecuencias.length;
};

// Función para calcular porcentaje por oído según método
const calcularPorcentajePorOido = (oido) => {
  const metodo = formDataAudiometria.value.metodoAudiometria || 'AMA';
  
  if (metodo === 'AMA') {
    // AMA: max(0, (PTA - 25)) * 1.5
    const pta = calcularPTA_AMA(oido);
    const perdida = Math.max(0, (pta - 25)) * 1.5;
    return {
      porcentaje: Math.round(perdida * 1000) / 1000,
      frecuencias: [500, 1000, 2000, 3000],
      metodo: 'AMA'
    };
  } else if (metodo === 'LFT') {
    // LFT: Elegir entre Rango A y Rango B, el que produzca mayor porcentaje
    const ptaA = calcularPTA_LFT_RangoA(oido);
    const ptaB = calcularPTA_LFT_RangoB(oido);
    
    const porcentajeA = ptaA * 0.8;
    const porcentajeB = ptaB * 0.8;
    
    if (porcentajeA >= porcentajeB) {
      return {
        porcentaje: Math.round(porcentajeA * 1000) / 1000,
        frecuencias: [250, 500, 1000, 2000],
        metodo: 'LFT',
        rango: 'A'
      };
    } else {
      return {
        porcentaje: Math.round(porcentajeB * 1000) / 1000,
        frecuencias: [2000, 3000, 4000, 6000],
        metodo: 'LFT',
        rango: 'B'
      };
    }
  }
  
  // Fallback al método anterior si no se reconoce el método
  const frecuencias = [500, 1000, 2000, 4000];
  const valores = frecuencias.map(freq => {
    const campo = `oido${oido}${freq}`;
    return formDataAudiometria.value[campo] || 0;
  });
  
  const promedio = valores.reduce((acc, val) => acc + val, 0) / frecuencias.length;
  const porcentaje = promedio * 0.8;
  
  return {
    porcentaje: Math.round(porcentaje * 1000) / 1000,
    frecuencias: frecuencias,
    metodo: 'LEGACY'
  };
};

// Función para calcular resultado binaural según método
const calcularResultadoBinaural = () => {
  const metodo = formDataAudiometria.value.metodoAudiometria || 'AMA';
  const resultadoOD = calcularPorcentajePorOido('Derecho');
  const resultadoOI = calcularPorcentajePorOido('Izquierdo');
  
  // Ordenar para combinación: menor = oído menos sordo
  const menor = Math.min(resultadoOD.porcentaje, resultadoOI.porcentaje);
  const mayor = Math.max(resultadoOD.porcentaje, resultadoOI.porcentaje);
  
  if (metodo === 'AMA') {
    // AMA (bilateral %): (5*menor + 1*mayor) / 6
    const bilateral = ((5 * menor) + mayor) / 6;
    return {
      porcentaje: Math.round(bilateral * 1000) / 1000,
      metodo: 'AMA',
      etiqueta: 'Pérdida auditiva bilateral'
    };
  } else if (metodo === 'LFT') {
    // LFT (HBC %): (7*menor + 1*mayor) / 8 y luego aplicar redondeo LFT
    let hbc = ((7 * menor) + mayor) / 8;
    
    // Aplicar redondeo LFT: décimas 0.0–0.5 hacia abajo, 0.6–0.9 hacia arriba
    const decimal = hbc % 1;
    if (decimal >= 0.6) {
      hbc = Math.ceil(hbc);
    } else {
      hbc = Math.floor(hbc);
    }
    
    return {
      porcentaje: Math.round(hbc * 1000) / 1000,
      metodo: 'LFT',
      etiqueta: 'Hipoacusia bilateral combinada (HBC)'
    };
  }
  
  // Fallback
  return {
    porcentaje: formDataAudiometria.value.hipoacusiaBilateralCombinada || 0,
    metodo: 'LEGACY',
    etiqueta: 'Hipoacusia bilateral combinada'
  };
};

// Computed para el resultado binaural dinámico
const resultadoBinaural = computed(() => {
  const result = calcularResultadoBinaural();
  const od = calcularPorcentajePorOido('Derecho');
  const oi = calcularPorcentajePorOido('Izquierdo');
  // #region agent log
  fetch('http://127.0.0.1:7456/ingest/63f6e900-4f19-4275-bb41-ed79b55538ec',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8375a6'},body:JSON.stringify({sessionId:'8375a6',location:'VisualizadorAudiometria.vue:resultadoBinaural',message:'Visualizador cálculo dinámico AMA',data:{metodo:formDataAudiometria.value.metodoAudiometria,odDinamico:od.porcentaje,oiDinamico:oi.porcentaje,bilateralDinamico:result.porcentaje,guardadoOD_AMA:formDataAudiometria.value.perdidaMonauralOD_AMA,guardadoOI_AMA:formDataAudiometria.value.perdidaMonauralOI_AMA,guardadoBilateralAMA:formDataAudiometria.value.perdidaAuditivaBilateralAMA,guardadoPorcentajeOD:formDataAudiometria.value.porcentajePerdidaOD,guardadoPorcentajeOI:formDataAudiometria.value.porcentajePerdidaOI,frecuenciasOD:{500:formDataAudiometria.value.oidoDerecho500,1000:formDataAudiometria.value.oidoDerecho1000,2000:formDataAudiometria.value.oidoDerecho2000,3000:formDataAudiometria.value.oidoDerecho3000},runId:'post-fix'},timestamp:Date.now(),hypothesisId:'H1-H3'})}).catch(()=>{});
  // #endregion
  return result;
});

// Computed para datos de la gráfica audiométrica
const graficaAudiometriaData = computed(() => {
  const frecuencias = [125, 250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
  
  // Datos del oído derecho
  const oidoDerecho = [
    formDataAudiometria.value.oidoDerecho125,
    formDataAudiometria.value.oidoDerecho250,
    formDataAudiometria.value.oidoDerecho500,
    formDataAudiometria.value.oidoDerecho1000,
    formDataAudiometria.value.oidoDerecho2000,
    formDataAudiometria.value.oidoDerecho3000,
    formDataAudiometria.value.oidoDerecho4000,
    formDataAudiometria.value.oidoDerecho6000,
    formDataAudiometria.value.oidoDerecho8000
  ].map(valor => valor !== null && valor !== undefined ? Number(valor) : null);

  // Datos del oído izquierdo
  const oidoIzquierdo = [
    formDataAudiometria.value.oidoIzquierdo125,
    formDataAudiometria.value.oidoIzquierdo250,
    formDataAudiometria.value.oidoIzquierdo500,
    formDataAudiometria.value.oidoIzquierdo1000,
    formDataAudiometria.value.oidoIzquierdo2000,
    formDataAudiometria.value.oidoIzquierdo3000,
    formDataAudiometria.value.oidoIzquierdo4000,
    formDataAudiometria.value.oidoIzquierdo6000,
    formDataAudiometria.value.oidoIzquierdo8000
  ].map(valor => valor !== null && valor !== undefined ? Number(valor) : null);

  return {
    labels: frecuencias.map(f => `${f} Hz`),
    datasets: [
      {
        label: 'Oído Derecho',
        data: oidoDerecho,
        borderColor: 'rgba(239, 68, 68, 0.8)', // Rojo con transparencia
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0,
        pointBackgroundColor: 'transparent',
        pointBorderColor: 'rgba(239, 68, 68, 0.8)',
        pointBorderWidth: 1.5,
        pointRadius: 6,
        pointHoverRadius: 8,
        spanGaps: false
      },
      {
        label: 'Oído Izquierdo',
        data: oidoIzquierdo,
        borderColor: '#3B82F6', // Azul sólido
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#3B82F6',
        pointBorderWidth: 1.5,
        pointStyle: 'crossRot',
        pointRadius: 8,
        pointHoverRadius: 10,
        spanGaps: false
      }
    ]
  };
});

// Opciones de configuración para la gráfica audiométrica
const graficaAudiometriaOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index'
  },
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        color: isHtmlDark.value ? '#e2e8f0' : '#374151',
        usePointStyle: true,
        padding: 10,
        pointStyleWidth: 17,
        font: {
          size: 12,
          weight: '500'
        }
      }
    },
    tooltip: {
      enabled: true,
      backgroundColor: isHtmlDark.value ? 'rgba(15, 23, 42, 0.95)' : 'rgba(0, 0, 0, 0.7)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: isHtmlDark.value ? '#64748b' : '#374151',
      borderWidth: 1,
      callbacks: {
        title: (context) => {
          return `Frecuencia: ${context[0].label}`;
        },
        label: (context) => {
          const valor = context.raw;
          return `${context.dataset.label}: ${valor !== null ? valor + ' dB' : 'Sin medición'}`;
        }
      }
    },
    datalabels: {
      display: false
    }
  },
  scales: {
    x: {
      title: {
        display: true,
        text: 'Frecuencia (Hz)',
        font: {
          size: 12,
          weight: '600'
        },
        color: isHtmlDark.value ? '#e2e8f0' : '#374151'
      },
      grid: {
        display: true,
        color: isHtmlDark.value ? 'rgba(148, 163, 184, 0.35)' : 'rgba(0, 0, 0, 0.2)',
        drawTicks: false,
        lineWidth: 1
      },
      border: {
        display: true,
        color: isHtmlDark.value ? '#94a3b8' : '#374151',
        width: 1.2
      },
      ticks: {
        color: isHtmlDark.value ? '#e2e8f0' : '#374151',
        font: {
          size: 11,
        }
      }
    },
    y: {
      title: {
        display: true,
        text: 'Umbral Auditivo (dB)',
        font: {
          size: 12,
          weight: '600'
        },
        color: isHtmlDark.value ? '#e2e8f0' : '#374151'
      },
      min: -10,
      max: 110,
      stepSize: 10,
      // Usar offset para crear espacio visual adicional
      offset: true,
      grid: {
        display: true,
        color: isHtmlDark.value ? 'rgba(148, 163, 184, 0.35)' : 'rgba(0, 0, 0, 0.2)',
        lineWidth: 1
      },
      border: {
        display: true,
        color: isHtmlDark.value ? '#94a3b8' : '#374151',
        width: 1.2
      },
      ticks: {
        color: isHtmlDark.value ? '#e2e8f0' : '#374151',
        font: {
          size: 11
        },
        stepSize: 10,
        maxTicksLimit: 13,
        count: 13,
        includeBounds: true,
        autoSkip: false,
        suggestedMin: -10,
        suggestedMax: 110,
        callback: function(value) {
          return value + ' dB';
        }
      },
      // Invertir el eje Y para que los valores más altos estén arriba (estándar audiométrico)
      reverse: true
    }
  },
  elements: {
    line: {
      borderWidth: 2
    },
    point: {
      borderWidth: 2
    }
  }
}));

// Función para generar y guardar la gráfica en el store
const generarYGuardarGrafica = async () => {
  await nextTick(); // Esperar a que el DOM se actualice
  
  if (refGraficaAudiometria.value) {
    try {
      // Usar el helper de exportación de alta resolución
      const chartConfig = {
        type: 'line',
        data: graficaAudiometriaData.value,
        options: graficaAudiometriaOptions.value
      };
      
      const graficaBase64 = exportarGraficaAltaResolucion(chartConfig, 1140, 380);
      
      // Guardar la gráfica en el store
      formData.formDataAudiometria.graficaAudiometria = graficaBase64;

    } catch (error) {
      console.error('🎨 Debug - Error al generar la gráfica:', error);
    }
  } 
};

// Generar la gráfica cuando el componente se monta
onMounted(() => {
  // Esperar un poco para que la gráfica se renderice completamente
  setTimeout(generarYGuardarGrafica, 1000);
});

// Regenerar la gráfica cuando cambien los datos de audiometría
watch(() => formDataAudiometria.value, () => {
  setTimeout(generarYGuardarGrafica, 500);
}, { deep: true });

// Exponer la referencia para acceso desde el componente padre
defineExpose({
  refGraficaAudiometria,
  graficaAudiometriaData,
  graficaAudiometriaOptions
});

</script>

<template>
  <div
    class="visualizador-audiometria flex flex-wrap justify-start gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto">

    <!-- Empresa y Fecha -->
    <div class="flex flex-wrap md:flex-nowrap w-full gap-4 items-center">
      <EstadoDocumentoBadgeAlt 
        v-if="isMX"
        :estado="formDataAudiometria.estado" 
        :fechaFinalizacion="formDataAudiometria.fechaFinalizacion" 
        :finalizadoPor="formDataAudiometria.finalizadoPor"
        :fechaAnulacion="formDataAudiometria.fechaAnulacion"
        :anuladoPor="formDataAudiometria.anuladoPor"
        :razonAnulacion="formDataAudiometria.razonAnulacion"
        class="mt-1 flex-shrink-0"
      />
      <!-- Empresa -->
      <div class="w-full md:w-auto md:flex-1 text-center">
        <p class="text-center text-base sm:text-lg">
          {{ empresas.currentEmpresa.nombreComercial }}
        </p>
      </div>

      <!-- Fecha -->
      <div class="w-full md:w-auto md:flex-1 flex flex-wrap gap-2 justify-start md:justify-end text-sm sm:text-base cursor-pointer"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 1 }"
        @click="goToStep(1)">
        <p class="w-full md:w-auto text-right">Fecha: <span class="font-medium">{{
          formatDateDDMMYYYY(formDataAudiometria.fechaAudiometria) }}</span></p>
      </div>
    </div>

    <!-- Trabajador -->
    <div class="w-full">
      <table class="table-auto w-full border-collapse border border-gray-200">
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="w-1/5 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              NOMBRE
            </td>
            <td class="w-1/3 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ formatNombreCompleto(trabajadores.currentTrabajador) }}
            </td>
            <td class="w-1/5 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              NACIMIENTO
            </td>
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ convertirFechaISOaDDMMYYYY(trabajadores.currentTrabajador.fechaNacimiento) }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ESCOLARIDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.escolaridad }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              EDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ calcularEdad(trabajadores.currentTrabajador.fechaNacimiento) }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              PUESTO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.puesto }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              SEXO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.sexo }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ANTIGUEDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ calcularAntiguedad(trabajadores.currentTrabajador.fechaIngreso) }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              TELÉFONO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.telefono }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ESTADO CIVIL
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.estadoCivil }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              NUM. EMPLEADO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.numeroEmpleado || '-' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Tabla de Mediciones Audiométricas -->
    <div class="w-full">
      <table class="w-full border-collapse border border-gray-200 table-fixed">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-32 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center font-medium">-</th>
            <th class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center font-medium">125</th>
            <th class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center font-medium">250</th>
            <th class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center font-medium">500</th>
            <th class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center font-medium">1000</th>
            <th class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center font-medium">2000</th>
            <th class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center font-medium">3000</th>
            <th class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center font-medium">4000</th>
            <th class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center font-medium">6000</th>
            <th class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center font-medium">8000</th>
            <th class="w-16 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center font-medium">P%</th>
          </tr>
        </thead>
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 2 }"
          @click="goToStep(2)">
            <td class="w-32 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">OIDO DERECHO</td>
            <td class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ formDataAudiometria.oidoDerecho125 ?? '' }}
            </td>
            <td class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ formDataAudiometria.oidoDerecho250 ?? '' }}
            </td>
            <td class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ formDataAudiometria.oidoDerecho500 ?? '' }}
            </td>
            <td class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ formDataAudiometria.oidoDerecho1000 ?? '' }}
            </td>
            <td class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ formDataAudiometria.oidoDerecho2000 ?? '' }}
            </td>
            <td class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ formDataAudiometria.oidoDerecho3000 ?? '' }}
            </td>
            <td class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ formDataAudiometria.oidoDerecho4000 ?? '' }}
            </td>
            <td class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ formDataAudiometria.oidoDerecho6000 ?? '' }}
            </td>
            <td class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ formDataAudiometria.oidoDerecho8000 ?? '' }}
            </td>
            <td class="w-16 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ calcularPorcentajePorOido('Derecho').porcentaje ?? '' }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 3 }"
          @click="goToStep(3)">
            <td class="w-32 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">OIDO IZQUIERDO</td>
            <td class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ formDataAudiometria.oidoIzquierdo125 ?? '' }}
            </td>
            <td class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ formDataAudiometria.oidoIzquierdo250 ?? '' }}
            </td>
            <td class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ formDataAudiometria.oidoIzquierdo500 ?? '' }}
            </td>
            <td class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ formDataAudiometria.oidoIzquierdo1000 ?? '' }}
            </td>
            <td class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ formDataAudiometria.oidoIzquierdo2000 ?? '' }}
            </td>
            <td class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ formDataAudiometria.oidoIzquierdo3000 ?? '' }}
            </td>
            <td class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ formDataAudiometria.oidoIzquierdo4000 ?? '' }}
            </td>
            <td class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ formDataAudiometria.oidoIzquierdo6000 ?? '' }}
            </td>
            <td class="w-12 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ formDataAudiometria.oidoIzquierdo8000 ?? '' }}
            </td>
            <td class="w-16 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ calcularPorcentajePorOido('Izquierdo').porcentaje ?? '' }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td colspan="10" class="w-32 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">{{ textoDiagnosticoBilateral }}</td>
            <td class="w-16 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">
              {{ resultadoBinaural.porcentaje ?? '' }}
            </td>
          </tr>
        </tbody>
      </table>
      
      <!-- Leyenda discreta con método y frecuencias -->
      <div class="mt-2 text-center">
        <p class="text-xs text-gray-500 italic">
          Método: {{ (formDataAudiometria.metodoAudiometria || 'AMA') }}
          {{ (formDataAudiometria.metodoAudiometria || 'AMA') === 'AMA' 
            ? '- Frecuencias: 500, 1000, 2000, 3000 Hz' 
            : `- OD: [${calcularPorcentajePorOido('Derecho').frecuencias.join(', ')}] Hz${calcularPorcentajePorOido('Derecho').rango ? ` (Rango ${calcularPorcentajePorOido('Derecho').rango})` : ''} | OI: [${calcularPorcentajePorOido('Izquierdo').frecuencias.join(', ')}] Hz${calcularPorcentajePorOido('Izquierdo').rango ? ` (Rango ${calcularPorcentajePorOido('Izquierdo').rango})` : ''}` }}
        </p>
      </div>
    </div>

    <!-- Gráfica Audiométrica -->
    <div class="w-full mt-4">
      <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div class="h-64">
          <GraficaAudiometria 
            ref="refGraficaAudiometria"
            :data="graficaAudiometriaData" 
            :options="graficaAudiometriaOptions" 
          />
        </div>

      </div>
    </div>

    <!-- Observaciones -->
    <div v-if="formDataAudiometria.observacionesAudiometria" 
      class="w-full cursor-pointer"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 4 }"
      @click="goToStep(4)"
    >
      <p class="text-justify font-medium">OBSERVACIONES: <span class="font-light">{{ formDataAudiometria.observacionesAudiometria }}</span></p>
    </div>
    <div v-else 
      class="w-full text-center cursor-pointer text-gray-500 italic" 
      :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 4 }" 
      @click="goToStep(4)">
      + Agregar observaciones
    </div>

    <!-- Interpretación Audiométrica -->
    <div v-if="formDataAudiometria.interpretacionAudiometrica" 
      class="w-full cursor-pointer"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 5 }"
      @click="goToStep(5)"
    >
      <p class="text-justify font-medium">INTERPRETACIÓN AUDIOMÉTRICA: <span class="font-light">{{ formDataAudiometria.interpretacionAudiometrica }}</span></p>
    </div>
    <div v-else 
      class="w-full text-center cursor-pointer text-gray-500 italic" 
      :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 5 }" 
      @click="goToStep(5)">
      + Agregar interpretación
    </div>

    <!-- Diagnóstico -->
    <div v-if="formDataAudiometria.diagnosticoAudiometria" 
      class="w-full cursor-pointer"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 6 }"
      @click="goToStep(6)"
    >
      <p class="text-justify font-medium">DIAGNÓSTICO: <span class="font-semibold text-lg text-gray-900">{{ formDataAudiometria.diagnosticoAudiometria.toUpperCase() }} {{ (formDataAudiometria.metodoAudiometria || 'AMA') === 'AMA' ? 'PA' : 'HBC' }} DE {{ resultadoBinaural.porcentaje }}%</span></p>
    </div>
    <div v-else 
      class="w-full text-center cursor-pointer text-gray-500 italic" 
      :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 6 }" 
      @click="goToStep(6)">
      + Agregar diagnóstico
    </div>

    <!-- Recomendaciones -->
    <div 
      v-if="formData.formDataAudiometria.recomendacionesAudiometria && formData.formDataAudiometria.recomendacionesAudiometria.length > 0"
      class="w-full mb-1 cursor-pointer"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 7 }"
      @click="goToStep(7)"
    >
      <p class="text-justify font-medium">
      Recomendaciones:
      <span class="font-light block mt-1">
        <div 
        v-for="(item, index) in formData.formDataAudiometria.recomendacionesAudiometria" 
        :key="index" 
        class="ml-4 relative"
        >
        <span class="absolute left-0">{{ String.fromCharCode(97 + index) }}.</span>
        <span class="block pl-4">{{ item }}</span>
        </div>
      </span>
      </p>
    </div>
    <div v-else class="w-full text-center cursor-pointer text-gray-500 italic" :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 7 }" @click="goToStep(7)">+ Agregar Recomendaciones</div>

  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.visualizador-audiometria div.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-audiometria div.cursor-pointer:hover {
  background-color: #f0f0f0;
}

.visualizador-audiometria p.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-audiometria p.cursor-pointer:hover {
  background-color: #f0f0f0;
}

.visualizador-audiometria tbody tr.cursor-pointer,
.visualizador-audiometria thead tr.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-audiometria tbody tr.cursor-pointer > td,
.visualizador-audiometria tbody tr.cursor-pointer > th,
.visualizador-audiometria thead tr.cursor-pointer > td,
.visualizador-audiometria thead tr.cursor-pointer > th {
  transition: background-color 0.15s ease;
}

.visualizador-audiometria tbody tr.cursor-pointer:hover,
.visualizador-audiometria tbody tr.cursor-pointer:hover > td,
.visualizador-audiometria tbody tr.cursor-pointer:hover > th,
.visualizador-audiometria thead tr.cursor-pointer:hover,
.visualizador-audiometria thead tr.cursor-pointer:hover > td,
.visualizador-audiometria thead tr.cursor-pointer:hover > th {
  background-color: #f0f0f0;
}
</style>

<style>
html.dark-mode .visualizador-audiometria div.cursor-pointer:hover,
html.dark-mode .visualizador-audiometria p.cursor-pointer:hover {
  background-color: #475569 !important;
}

html.dark-mode .visualizador-audiometria tbody tr.cursor-pointer:hover,
html.dark-mode .visualizador-audiometria tbody tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-audiometria tbody tr.cursor-pointer:hover > th,
html.dark-mode .visualizador-audiometria thead tr.cursor-pointer:hover,
html.dark-mode .visualizador-audiometria thead tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-audiometria thead tr.cursor-pointer:hover > th {
  background-color: #475569 !important;
}

html.dark-mode .visualizador-audiometria .bg-gray-50 {
  background-color: #0f172a !important;
}

html.dark-mode .visualizador-audiometria .border-gray-200 {
  border-color: #334155 !important;
}
</style>
