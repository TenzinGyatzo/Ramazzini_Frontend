<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const { formDataAudiometria } = useFormDataStore();
const documentos = useDocumentosStore();

// Referencias locales para los valores del oído derecho
const oidoDerecho125 = ref(0);
const oidoDerecho250 = ref(0);
const oidoDerecho500 = ref(0);
const oidoDerecho1000 = ref(0);
const oidoDerecho2000 = ref(0);
const oidoDerecho3000 = ref(0);
const oidoDerecho4000 = ref(0);
const oidoDerecho6000 = ref(0);
const oidoDerecho8000 = ref(0);

// Referencias para rastrear correcciones visuales
const correccionesVisuales = ref({
  125: false,
  250: false,
  500: false,
  1000: false,
  2000: false,
  3000: false,
  4000: false,
  6000: false,
  8000: false
});

// Frecuencias para la tabla
const frecuencias = [
  { value: 125, label: '125' },
  { value: 250, label: '250' },
  { value: 500, label: '500' },
  { value: 1000, label: '1000' },
  { value: 2000, label: '2000' },
  { value: 3000, label: '3000' },
  { value: 4000, label: '4000' },
  { value: 6000, label: '6000' },
  { value: 8000, label: '8000' }
];

onMounted(() => {
  // Cargar valores existentes si se está editando
  if (documentos.currentDocument) {
    oidoDerecho125.value = documentos.currentDocument.oidoDerecho125 || 0;
    oidoDerecho250.value = documentos.currentDocument.oidoDerecho250 || 0;
    oidoDerecho500.value = documentos.currentDocument.oidoDerecho500 || 0;
    oidoDerecho1000.value = documentos.currentDocument.oidoDerecho1000 || 0;
    oidoDerecho2000.value = documentos.currentDocument.oidoDerecho2000 || 0;
    oidoDerecho3000.value = documentos.currentDocument.oidoDerecho3000 || 0;
    oidoDerecho4000.value = documentos.currentDocument.oidoDerecho4000 || 0;
    oidoDerecho6000.value = documentos.currentDocument.oidoDerecho6000 || 0;
    oidoDerecho8000.value = documentos.currentDocument.oidoDerecho8000 || 0;
  }

  // Inicializar valores en formData si no existen
  formDataAudiometria.oidoDerecho125 = formDataAudiometria.oidoDerecho125 || 0;
  formDataAudiometria.oidoDerecho250 = formDataAudiometria.oidoDerecho250 || 0;
  formDataAudiometria.oidoDerecho500 = formDataAudiometria.oidoDerecho500 || 0;
  formDataAudiometria.oidoDerecho1000 = formDataAudiometria.oidoDerecho1000 || 0;
  formDataAudiometria.oidoDerecho2000 = formDataAudiometria.oidoDerecho2000 || 0;
  formDataAudiometria.oidoDerecho3000 = formDataAudiometria.oidoDerecho3000 || 0;
  formDataAudiometria.oidoDerecho4000 = formDataAudiometria.oidoDerecho4000 || 0;
  formDataAudiometria.oidoDerecho6000 = formDataAudiometria.oidoDerecho6000 || 0;
  formDataAudiometria.oidoDerecho8000 = formDataAudiometria.oidoDerecho8000 || 0;
  
  // Inicializar porcentaje de pérdida
  formDataAudiometria.porcentajePerdidaOD = formDataAudiometria.porcentajePerdidaOD || 0;
  
  // Inicializar hipoacusia bilateral combinada
  formDataAudiometria.hipoacusiaBilateralCombinada = formDataAudiometria.hipoacusiaBilateralCombinada || 0;
  
  // Sincronizar valores locales con formData
  sincronizarValoresLocales();
  
  // Recalcular campos AMA al cargar documento existente (corrige valores legacy en BD)
  if ((formDataAudiometria.metodoAudiometria || 'AMA') === 'AMA') {
    formDataAudiometria.perdidaMonauralOD_AMA = calcularPorcentajePorOido().porcentaje;
  }
  
  // Calcular hipoacusia bilateral combinada si ya existen ambos porcentajes
  calcularHipoacusiaBilateralCombinada();
});

// Sincronizar valores locales con formData
watch(oidoDerecho125, (newValue) => {
  formDataAudiometria.oidoDerecho125 = newValue;
});

watch(oidoDerecho250, (newValue) => {
  formDataAudiometria.oidoDerecho250 = newValue;
});

watch(oidoDerecho500, (newValue) => {
  formDataAudiometria.oidoDerecho500 = newValue;
});

watch(oidoDerecho1000, (newValue) => {
  formDataAudiometria.oidoDerecho1000 = newValue;
});

watch(oidoDerecho2000, (newValue) => {
  formDataAudiometria.oidoDerecho2000 = newValue;
});

watch(oidoDerecho3000, (newValue) => {
  formDataAudiometria.oidoDerecho3000 = newValue;
});

watch(oidoDerecho4000, (newValue) => {
  formDataAudiometria.oidoDerecho4000 = newValue;
});

watch(oidoDerecho6000, (newValue) => {
  formDataAudiometria.oidoDerecho6000 = newValue;
});

watch(oidoDerecho8000, (newValue) => {
  formDataAudiometria.oidoDerecho8000 = newValue;
});

// Función para redondear a múltiplos de 5
const redondearAMultiploDe5 = (valor) => {
  return Math.round(valor / 5) * 5;
};

// Función para validar y corregir valores audiométricos
const validarYCorregirValor = (valor) => {
  const num = Number(valor);
  if (isNaN(num)) return 0;
  
  // Redondear a múltiplo de 5
  const valorRedondeado = redondearAMultiploDe5(num);
  
  // Aplicar límites
  if (valorRedondeado < -10) return -10;
  if (valorRedondeado > 110) return 110;
  
  return valorRedondeado;
};

// Función para manejar cambios en los inputs (sin validación)
const handleInputChange = (frecuencia, valor) => {
  const num = Number(valor);
  const valorFinal = isNaN(num) ? 0 : num;
  
  switch (frecuencia) {
    case 125:
      oidoDerecho125.value = valorFinal;
      break;
    case 250:
      oidoDerecho250.value = valorFinal;
      break;
    case 500:
      oidoDerecho500.value = valorFinal;
      break;
    case 1000:
      oidoDerecho1000.value = valorFinal;
      break;
    case 2000:
      oidoDerecho2000.value = valorFinal;
      break;
    case 3000:
      oidoDerecho3000.value = valorFinal;
      break;
    case 4000:
      oidoDerecho4000.value = valorFinal;
      break;
    case 6000:
      oidoDerecho6000.value = valorFinal;
      break;
    case 8000:
      oidoDerecho8000.value = valorFinal;
      break;
  }
};

// Función para manejar cuando se gana el focus (seleccionar todo el texto)
const handleInputFocus = (event) => {
  // Seleccionar todo el texto del input
  const input = event.target;
  input.select();
};

// Función para manejar cuando se pierde el focus (validación y corrección)
const handleInputBlur = (frecuencia) => {
  const valorActual = getValorActual(frecuencia);
  const valorValidado = validarYCorregirValor(valorActual);
  
  // Verificar si se hizo una corrección
  const seCorrigio = valorActual !== valorValidado;
  
  // Mostrar feedback visual si se corrigió
  if (seCorrigio) {
    correccionesVisuales.value[frecuencia] = true;
    // Quitar el feedback visual después de 1.5 segundos
    setTimeout(() => {
      correccionesVisuales.value[frecuencia] = false;
    }, 1500);
  }
  
  // Aplicar el valor corregido
  switch (frecuencia) {
    case 125:
      oidoDerecho125.value = valorValidado;
      break;
    case 250:
      oidoDerecho250.value = valorValidado;
      break;
    case 500:
      oidoDerecho500.value = valorValidado;
      break;
    case 1000:
      oidoDerecho1000.value = valorValidado;
      break;
    case 2000:
      oidoDerecho2000.value = valorValidado;
      break;
    case 3000:
      oidoDerecho3000.value = valorValidado;
      break;
    case 4000:
      oidoDerecho4000.value = valorValidado;
      break;
    case 6000:
      oidoDerecho6000.value = valorValidado;
      break;
    case 8000:
      oidoDerecho8000.value = valorValidado;
      break;
  }
};

// Función para obtener el valor actual de una frecuencia
const getValorActual = (frecuencia) => {
  switch (frecuencia) {
    case 125: return oidoDerecho125.value;
    case 250: return oidoDerecho250.value;
    case 500: return oidoDerecho500.value;
    case 1000: return oidoDerecho1000.value;
    case 2000: return oidoDerecho2000.value;
    case 3000: return oidoDerecho3000.value;
    case 4000: return oidoDerecho4000.value;
    case 6000: return oidoDerecho6000.value;
    case 8000: return oidoDerecho8000.value;
    default: return 0;
  }
};

// Función para calcular PTA (Pure Tone Average) para AMA
const calcularPTA_AMA = () => {
  const frecuencias = [500, 1000, 2000, 3000];
  const valores = frecuencias.map(freq => {
    switch(freq) {
      case 500: return oidoDerecho500.value || 0;
      case 1000: return oidoDerecho1000.value || 0;
      case 2000: return oidoDerecho2000.value || 0;
      case 3000: return oidoDerecho3000.value || 0;
      default: return 0;
    }
  });
  
  const suma = valores.reduce((acc, val) => acc + val, 0);
  return suma / frecuencias.length;
};

// Función para calcular PTA para LFT (Rango A: 250, 500, 1000, 2000 Hz)
const calcularPTA_LFT_RangoA = () => {
  const frecuencias = [250, 500, 1000, 2000];
  const valores = frecuencias.map(freq => {
    switch(freq) {
      case 250: return oidoDerecho250.value || 0;
      case 500: return oidoDerecho500.value || 0;
      case 1000: return oidoDerecho1000.value || 0;
      case 2000: return oidoDerecho2000.value || 0;
      default: return 0;
    }
  });
  
  const suma = valores.reduce((acc, val) => acc + val, 0);
  return suma / frecuencias.length;
};

// Función para calcular PTA para LFT (Rango B: 2000, 3000, 4000, 6000 Hz)
const calcularPTA_LFT_RangoB = () => {
  const frecuencias = [2000, 3000, 4000, 6000];
  const valores = frecuencias.map(freq => {
    switch(freq) {
      case 2000: return oidoDerecho2000.value || 0;
      case 3000: return oidoDerecho3000.value || 0;
      case 4000: return oidoDerecho4000.value || 0;
      case 6000: return oidoDerecho6000.value || 0;
      default: return 0;
    }
  });
  
  const suma = valores.reduce((acc, val) => acc + val, 0);
  return suma / frecuencias.length;
};

// Función para aplicar reglas LFT (120 dB si no hay respuesta, 5 dB si contralateral ≤ 0 dB)
const aplicarReglasLFT = (valor, valorContralateral) => {
  // Si no hay respuesta (valor null/undefined), usar 120 dB
  if (valor === null || valor === undefined) {
    return 120;
  }
  
  // Si el contralateral en esa frecuencia tiene ≤ 0 dB, considerar 5 dB
  if (valorContralateral !== null && valorContralateral !== undefined && valorContralateral <= 0) {
    return 5;
  }
  
  return valor;
};

// Función para calcular porcentaje por oído según método
const calcularPorcentajePorOido = () => {
  const metodo = formDataAudiometria.metodoAudiometria;
  
  if (metodo === 'AMA') {
    // AMA: max(0, (PTA - 25)) * 1.5
    const pta = calcularPTA_AMA();
    const perdida = Math.max(0, (pta - 25)) * 1.5;
    return {
      porcentaje: Math.round(perdida * 100) / 100,
      frecuencias: [500, 1000, 2000, 3000],
      metodo: 'AMA'
    };
  } else if (metodo === 'LFT') {
    // LFT: Elegir entre Rango A y Rango B, el que produzca mayor porcentaje
    const ptaA = calcularPTA_LFT_RangoA();
    const ptaB = calcularPTA_LFT_RangoB();
    
    const porcentajeA = ptaA * 0.8;
    const porcentajeB = ptaB * 0.8;
    
    if (porcentajeA >= porcentajeB) {
      return {
        porcentaje: Math.round(porcentajeA * 100) / 100,
        frecuencias: [250, 500, 1000, 2000],
        metodo: 'LFT',
        rango: 'A'
      };
    } else {
      return {
        porcentaje: Math.round(porcentajeB * 100) / 100,
        frecuencias: [2000, 3000, 4000, 6000],
        metodo: 'LFT',
        rango: 'B'
      };
    }
  }
  
  // Fallback al método anterior si no se reconoce el método
  const A = oidoDerecho500.value || 0;
  const B = oidoDerecho1000.value || 0;
  const C = oidoDerecho2000.value || 0;
  const D = oidoDerecho4000.value || 0;
  
  const promedio = (A + B + C + D) / 4;
  const porcentaje = promedio * 0.8;
  
  return {
    porcentaje: Math.round(porcentaje * 100) / 100,
    frecuencias: [500, 1000, 2000, 4000],
    metodo: 'LEGACY'
  };
};

// Función legacy para compatibilidad
const calcularPorcentajePerdida = () => {
  return calcularPorcentajePorOido().porcentaje;
};

// Computed para el porcentaje de pérdida
const porcentajePerdidaOD = computed(() => {
  return calcularPorcentajePerdida();
});

// Watch para actualizar el formData cuando cambie el porcentaje
watch(porcentajePerdidaOD, (newValue) => {
  const metodo = formDataAudiometria.metodoAudiometria || 'AMA';
  
  if (metodo === 'AMA') {
    formDataAudiometria.perdidaMonauralOD_AMA = newValue;
  } else if (metodo === 'LFT') {
    formDataAudiometria.porcentajePerdidaOD = newValue;
  }
  
  calcularHipoacusiaBilateralCombinada();
});

// Función para calcular la hipoacusia bilateral combinada
const calcularHipoacusiaBilateralCombinada = () => {
  const metodo = formDataAudiometria.metodoAudiometria || 'AMA';
  
  if (metodo === 'AMA') {
    // Para AMA: usar valores específicos de AMA
    const perdidaOD = formDataAudiometria.perdidaMonauralOD_AMA || 0;
    const perdidaOI = formDataAudiometria.perdidaMonauralOI_AMA || 0;
    
    // Fórmula AMA: (5*menor + 1*mayor) / 6
    const menor = Math.min(perdidaOD, perdidaOI);
    const mayor = Math.max(perdidaOD, perdidaOI);
    const perdidaBilateralAMA = ((5 * menor) + mayor) / 6;
    
    formDataAudiometria.perdidaAuditivaBilateralAMA = Math.round(perdidaBilateralAMA * 100) / 100;
  } else if (metodo === 'LFT') {
    // Para LFT: usar valores legacy
    const porcentajeOD = formDataAudiometria.porcentajePerdidaOD || 0;
    const porcentajeOI = formDataAudiometria.porcentajePerdidaOI || 0;
    
    const minPorcentaje = Math.min(porcentajeOD, porcentajeOI);
    const maxPorcentaje = Math.max(porcentajeOD, porcentajeOI);
    
    // Fórmula LFT: (7*menor + 1*mayor) / 8
    let hipoacusiaBilateral = ((minPorcentaje * 7) + maxPorcentaje) / 8;
    
    // Aplicar redondeo LFT
    const decimal = hipoacusiaBilateral % 1;
    if (decimal >= 0.6) {
      hipoacusiaBilateral = Math.ceil(hipoacusiaBilateral);
    } else {
      hipoacusiaBilateral = Math.floor(hipoacusiaBilateral);
    }
    
    formDataAudiometria.hipoacusiaBilateralCombinada = hipoacusiaBilateral;
  }
};

// Watch para recalcular cuando cambie el porcentaje del oído izquierdo
watch(() => formDataAudiometria.porcentajePerdidaOI, () => {
  calcularHipoacusiaBilateralCombinada();
});

// Watch para recalcular cuando cambien los valores de AMA
watch(() => formDataAudiometria.perdidaMonauralOI_AMA, () => {
  calcularHipoacusiaBilateralCombinada();
});

// Watch para recalcular cuando cambie el método
watch(() => formDataAudiometria.metodoAudiometria, () => {
  calcularHipoacusiaBilateralCombinada();
});

// Función para sincronizar valores locales con formData
const sincronizarValoresLocales = () => {
  oidoDerecho125.value = formDataAudiometria.oidoDerecho125 || 0;
  oidoDerecho250.value = formDataAudiometria.oidoDerecho250 || 0;
  oidoDerecho500.value = formDataAudiometria.oidoDerecho500 || 0;
  oidoDerecho1000.value = formDataAudiometria.oidoDerecho1000 || 0;
  oidoDerecho2000.value = formDataAudiometria.oidoDerecho2000 || 0;
  oidoDerecho3000.value = formDataAudiometria.oidoDerecho3000 || 0;
  oidoDerecho4000.value = formDataAudiometria.oidoDerecho4000 || 0;
  oidoDerecho6000.value = formDataAudiometria.oidoDerecho6000 || 0;
  oidoDerecho8000.value = formDataAudiometria.oidoDerecho8000 || 0;
};

// Watchers para sincronizar desde formData hacia valores locales
watch(() => formDataAudiometria.oidoDerecho125, (newValue) => {
  if (newValue !== oidoDerecho125.value) {
    oidoDerecho125.value = newValue || 0;
  }
});

watch(() => formDataAudiometria.oidoDerecho250, (newValue) => {
  if (newValue !== oidoDerecho250.value) {
    oidoDerecho250.value = newValue || 0;
  }
});

watch(() => formDataAudiometria.oidoDerecho500, (newValue) => {
  if (newValue !== oidoDerecho500.value) {
    oidoDerecho500.value = newValue || 0;
  }
});

watch(() => formDataAudiometria.oidoDerecho1000, (newValue) => {
  if (newValue !== oidoDerecho1000.value) {
    oidoDerecho1000.value = newValue || 0;
  }
});

watch(() => formDataAudiometria.oidoDerecho2000, (newValue) => {
  if (newValue !== oidoDerecho2000.value) {
    oidoDerecho2000.value = newValue || 0;
  }
});

watch(() => formDataAudiometria.oidoDerecho3000, (newValue) => {
  if (newValue !== oidoDerecho3000.value) {
    oidoDerecho3000.value = newValue || 0;
  }
});

watch(() => formDataAudiometria.oidoDerecho4000, (newValue) => {
  if (newValue !== oidoDerecho4000.value) {
    oidoDerecho4000.value = newValue || 0;
  }
});

watch(() => formDataAudiometria.oidoDerecho6000, (newValue) => {
  if (newValue !== oidoDerecho6000.value) {
    oidoDerecho6000.value = newValue || 0;
  }
});

watch(() => formDataAudiometria.oidoDerecho8000, (newValue) => {
  if (newValue !== oidoDerecho8000.value) {
    oidoDerecho8000.value = newValue || 0;
  }
});
</script>

<template>
  <div>
    <h1 class="mb-4 text-sm text-gray-800 leading-5"><span class="text-xl font-bold">OÍDO DERECHO</span> - Valores Audiométricos</h1>
    
    <div class="mb-4">
      <p class="font-medium mb-3 text-gray-700 leading-5">
        Ingrese los umbrales auditivos en decibeles (dB) para cada frecuencia:
      </p>
      
      <!-- Grid de valores audiométricos -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div 
          v-for="frecuencia in frecuencias" 
          :key="frecuencia.value"
          class="bg-gray-50 border border-gray-300 rounded p-2"
        >
          <div class="text-center">
            <label class="block text-sm font-semibold text-gray-800 mb-1">
              {{ frecuencia.label }} Hz
            </label>
            <div class="flex items-center justify-center gap-1.5">
                <input
                  type="number"
                  :name="`oidoDerecho${frecuencia.value}`"
                  :value="getValorActual(frecuencia.value)"
                  @input="handleInputChange(frecuencia.value, $event.target.value)"
                  @focus="handleInputFocus"
                  @blur="handleInputBlur(frecuencia.value)"
                  :class="[
                    'w-full p-1 text-center border rounded text-base text-emerald-700 focus:outline-none focus:ring-1 transition-all duration-300',
                    correccionesVisuales[frecuencia.value] 
                      ? 'border-yellow-400 bg-yellow-50 focus:border-yellow-500 focus:ring-yellow-500' 
                      : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-500'
                  ]"
                  min="-10"
                  max="110"
                  step="5"
                  placeholder="0"
                />
                <span class="text-sm text-gray-500">dB</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Resultado del cálculo de porcentaje de pérdida -->
      <div class="w-1/2 mx-auto mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <div class="flex items-center justify-evenly">
          <div>
            <p class="text-sm font-medium text-emerald-800">
              {{ formDataAudiometria.metodoAudiometria === 'AMA' ? 'Pérdida Monoaural' : 'Índice de Fletcher' }} <br>({{ formDataAudiometria.metodoAudiometria || 'AMA' }})
            </p>
          </div>
          <div class="text-center">
            <span 
              class="text-xl font-bold text-emerald-800"
              :title="formDataAudiometria.metodoAudiometria === 'AMA' 
                ? 'Pérdida monaural (%) = max(0,(PTA-25))*1.5. Frecuencias 500–3000 Hz.' 
                : 'Índice de Fletcher (%) = PTA*0.8. Se elige Rango A (250–2000) o B (2000–6000) que produzca mayor pérdida. Reglas 120/5.'"
            >
              {{ porcentajePerdidaOD }}%
            </span>
          </div>
        </div>
      </div>

      <!-- Información de frecuencias usadas -->
      <div class="w-full mt-2 text-center">
        <p class="text-xs text-gray-600">
          Frecuencias usadas OD: [{{ calcularPorcentajePorOido().frecuencias.join(', ') }}] Hz
          {{ calcularPorcentajePorOido().rango ? ` (Rango ${calcularPorcentajePorOido().rango})` : '' }}
        </p>
      </div>
 
    </div>
  </div>
</template>
