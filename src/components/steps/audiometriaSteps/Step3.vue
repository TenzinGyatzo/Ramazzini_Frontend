<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const { formDataAudiometria } = useFormDataStore();
const documentos = useDocumentosStore();

// Referencias locales para los valores del oído izquierdo
const oidoIzquierdo125 = ref(0);
const oidoIzquierdo250 = ref(0);
const oidoIzquierdo500 = ref(0);
const oidoIzquierdo1000 = ref(0);
const oidoIzquierdo2000 = ref(0);
const oidoIzquierdo3000 = ref(0);
const oidoIzquierdo4000 = ref(0);
const oidoIzquierdo6000 = ref(0);
const oidoIzquierdo8000 = ref(0);

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
    oidoIzquierdo125.value = documentos.currentDocument.oidoIzquierdo125 || 0;
    oidoIzquierdo250.value = documentos.currentDocument.oidoIzquierdo250 || 0;
    oidoIzquierdo500.value = documentos.currentDocument.oidoIzquierdo500 || 0;
    oidoIzquierdo1000.value = documentos.currentDocument.oidoIzquierdo1000 || 0;
    oidoIzquierdo2000.value = documentos.currentDocument.oidoIzquierdo2000 || 0;
    oidoIzquierdo3000.value = documentos.currentDocument.oidoIzquierdo3000 || 0;
    oidoIzquierdo4000.value = documentos.currentDocument.oidoIzquierdo4000 || 0;
    oidoIzquierdo6000.value = documentos.currentDocument.oidoIzquierdo6000 || 0;
    oidoIzquierdo8000.value = documentos.currentDocument.oidoIzquierdo8000 || 0;
  }

  // Inicializar valores en formData si no existen
  formDataAudiometria.oidoIzquierdo125 = formDataAudiometria.oidoIzquierdo125 || 0;
  formDataAudiometria.oidoIzquierdo250 = formDataAudiometria.oidoIzquierdo250 || 0;
  formDataAudiometria.oidoIzquierdo500 = formDataAudiometria.oidoIzquierdo500 || 0;
  formDataAudiometria.oidoIzquierdo1000 = formDataAudiometria.oidoIzquierdo1000 || 0;
  formDataAudiometria.oidoIzquierdo2000 = formDataAudiometria.oidoIzquierdo2000 || 0;
  formDataAudiometria.oidoIzquierdo3000 = formDataAudiometria.oidoIzquierdo3000 || 0;
  formDataAudiometria.oidoIzquierdo4000 = formDataAudiometria.oidoIzquierdo4000 || 0;
  formDataAudiometria.oidoIzquierdo6000 = formDataAudiometria.oidoIzquierdo6000 || 0;
  formDataAudiometria.oidoIzquierdo8000 = formDataAudiometria.oidoIzquierdo8000 || 0;
  
  // Inicializar porcentaje de pérdida
  formDataAudiometria.porcentajePerdidaOI = formDataAudiometria.porcentajePerdidaOI || 0;
  
  // Inicializar hipoacusia bilateral combinada
  formDataAudiometria.hipoacusiaBilateralCombinada = formDataAudiometria.hipoacusiaBilateralCombinada || 0;
  
  // Sincronizar valores locales con formData
  sincronizarValoresLocales();
  
  // Recalcular campos AMA al cargar documento existente (corrige valores legacy en BD)
  if ((formDataAudiometria.metodoAudiometria || 'AMA') === 'AMA') {
    formDataAudiometria.perdidaMonauralOI_AMA = calcularPorcentajePorOido().porcentaje;
  }
  
  // Calcular hipoacusia bilateral combinada si ya existen ambos porcentajes
  calcularHipoacusiaBilateralCombinada();
});

// Sincronizar valores locales con formData
watch(oidoIzquierdo125, (newValue) => {
  formDataAudiometria.oidoIzquierdo125 = newValue;
});

watch(oidoIzquierdo250, (newValue) => {
  formDataAudiometria.oidoIzquierdo250 = newValue;
});

watch(oidoIzquierdo500, (newValue) => {
  formDataAudiometria.oidoIzquierdo500 = newValue;
});

watch(oidoIzquierdo1000, (newValue) => {
  formDataAudiometria.oidoIzquierdo1000 = newValue;
});

watch(oidoIzquierdo2000, (newValue) => {
  formDataAudiometria.oidoIzquierdo2000 = newValue;
});

watch(oidoIzquierdo3000, (newValue) => {
  formDataAudiometria.oidoIzquierdo3000 = newValue;
});

watch(oidoIzquierdo4000, (newValue) => {
  formDataAudiometria.oidoIzquierdo4000 = newValue;
});

watch(oidoIzquierdo6000, (newValue) => {
  formDataAudiometria.oidoIzquierdo6000 = newValue;
});

watch(oidoIzquierdo8000, (newValue) => {
  formDataAudiometria.oidoIzquierdo8000 = newValue;
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
      oidoIzquierdo125.value = valorFinal;
      break;
    case 250:
      oidoIzquierdo250.value = valorFinal;
      break;
    case 500:
      oidoIzquierdo500.value = valorFinal;
      break;
    case 1000:
      oidoIzquierdo1000.value = valorFinal;
      break;
    case 2000:
      oidoIzquierdo2000.value = valorFinal;
      break;
    case 3000:
      oidoIzquierdo3000.value = valorFinal;
      break;
    case 4000:
      oidoIzquierdo4000.value = valorFinal;
      break;
    case 6000:
      oidoIzquierdo6000.value = valorFinal;
      break;
    case 8000:
      oidoIzquierdo8000.value = valorFinal;
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
      oidoIzquierdo125.value = valorValidado;
      break;
    case 250:
      oidoIzquierdo250.value = valorValidado;
      break;
    case 500:
      oidoIzquierdo500.value = valorValidado;
      break;
    case 1000:
      oidoIzquierdo1000.value = valorValidado;
      break;
    case 2000:
      oidoIzquierdo2000.value = valorValidado;
      break;
    case 3000:
      oidoIzquierdo3000.value = valorValidado;
      break;
    case 4000:
      oidoIzquierdo4000.value = valorValidado;
      break;
    case 6000:
      oidoIzquierdo6000.value = valorValidado;
      break;
    case 8000:
      oidoIzquierdo8000.value = valorValidado;
      break;
  }
};

// Función para obtener el valor actual de una frecuencia
const getValorActual = (frecuencia) => {
  switch (frecuencia) {
    case 125: return oidoIzquierdo125.value;
    case 250: return oidoIzquierdo250.value;
    case 500: return oidoIzquierdo500.value;
    case 1000: return oidoIzquierdo1000.value;
    case 2000: return oidoIzquierdo2000.value;
    case 3000: return oidoIzquierdo3000.value;
    case 4000: return oidoIzquierdo4000.value;
    case 6000: return oidoIzquierdo6000.value;
    case 8000: return oidoIzquierdo8000.value;
    default: return 0;
  }
};

// Función para calcular PTA (Pure Tone Average) para AMA
const calcularPTA_AMA = () => {
  const frecuencias = [500, 1000, 2000, 3000];
  const valores = frecuencias.map(freq => {
    switch(freq) {
      case 500: return oidoIzquierdo500.value || 0;
      case 1000: return oidoIzquierdo1000.value || 0;
      case 2000: return oidoIzquierdo2000.value || 0;
      case 3000: return oidoIzquierdo3000.value || 0;
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
      case 250: return oidoIzquierdo250.value || 0;
      case 500: return oidoIzquierdo500.value || 0;
      case 1000: return oidoIzquierdo1000.value || 0;
      case 2000: return oidoIzquierdo2000.value || 0;
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
      case 2000: return oidoIzquierdo2000.value || 0;
      case 3000: return oidoIzquierdo3000.value || 0;
      case 4000: return oidoIzquierdo4000.value || 0;
      case 6000: return oidoIzquierdo6000.value || 0;
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
  const A = oidoIzquierdo500.value || 0;
  const B = oidoIzquierdo1000.value || 0;
  const C = oidoIzquierdo2000.value || 0;
  const D = oidoIzquierdo4000.value || 0;
  
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
const porcentajePerdidaOI = computed(() => {
  return calcularPorcentajePerdida();
});

// Watch para actualizar el formData cuando cambie el porcentaje
watch(porcentajePerdidaOI, (newValue) => {
  const metodo = formDataAudiometria.metodoAudiometria || 'AMA';
  
  if (metodo === 'AMA') {
    formDataAudiometria.perdidaMonauralOI_AMA = newValue;
  } else if (metodo === 'LFT') {
    formDataAudiometria.porcentajePerdidaOI = newValue;
  }
  
  calcularHipoacusiaBilateralCombinada();
});

// Watch para recalcular cuando cambie el porcentaje del oído derecho
watch(() => formDataAudiometria.porcentajePerdidaOD, () => {
  calcularHipoacusiaBilateralCombinada();
});

// Watch para recalcular cuando cambien los valores de AMA
watch(() => formDataAudiometria.perdidaMonauralOD_AMA, () => {
  calcularHipoacusiaBilateralCombinada();
});

// Watch para recalcular cuando cambie el método
watch(() => formDataAudiometria.metodoAudiometria, () => {
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

// Función para sincronizar valores locales con formData
const sincronizarValoresLocales = () => {
  oidoIzquierdo125.value = formDataAudiometria.oidoIzquierdo125 || 0;
  oidoIzquierdo250.value = formDataAudiometria.oidoIzquierdo250 || 0;
  oidoIzquierdo500.value = formDataAudiometria.oidoIzquierdo500 || 0;
  oidoIzquierdo1000.value = formDataAudiometria.oidoIzquierdo1000 || 0;
  oidoIzquierdo2000.value = formDataAudiometria.oidoIzquierdo2000 || 0;
  oidoIzquierdo3000.value = formDataAudiometria.oidoIzquierdo3000 || 0;
  oidoIzquierdo4000.value = formDataAudiometria.oidoIzquierdo4000 || 0;
  oidoIzquierdo6000.value = formDataAudiometria.oidoIzquierdo6000 || 0;
  oidoIzquierdo8000.value = formDataAudiometria.oidoIzquierdo8000 || 0;
};

// Watchers para sincronizar desde formData hacia valores locales
watch(() => formDataAudiometria.oidoIzquierdo125, (newValue) => {
  if (newValue !== oidoIzquierdo125.value) {
    oidoIzquierdo125.value = newValue || 0;
  }
});

watch(() => formDataAudiometria.oidoIzquierdo250, (newValue) => {
  if (newValue !== oidoIzquierdo250.value) {
    oidoIzquierdo250.value = newValue || 0;
  }
});

watch(() => formDataAudiometria.oidoIzquierdo500, (newValue) => {
  if (newValue !== oidoIzquierdo500.value) {
    oidoIzquierdo500.value = newValue || 0;
  }
});

watch(() => formDataAudiometria.oidoIzquierdo1000, (newValue) => {
  if (newValue !== oidoIzquierdo1000.value) {
    oidoIzquierdo1000.value = newValue || 0;
  }
});

watch(() => formDataAudiometria.oidoIzquierdo2000, (newValue) => {
  if (newValue !== oidoIzquierdo2000.value) {
    oidoIzquierdo2000.value = newValue || 0;
  }
});

watch(() => formDataAudiometria.oidoIzquierdo3000, (newValue) => {
  if (newValue !== oidoIzquierdo3000.value) {
    oidoIzquierdo3000.value = newValue || 0;
  }
});

watch(() => formDataAudiometria.oidoIzquierdo4000, (newValue) => {
  if (newValue !== oidoIzquierdo4000.value) {
    oidoIzquierdo4000.value = newValue || 0;
  }
});

watch(() => formDataAudiometria.oidoIzquierdo6000, (newValue) => {
  if (newValue !== oidoIzquierdo6000.value) {
    oidoIzquierdo6000.value = newValue || 0;
  }
});

watch(() => formDataAudiometria.oidoIzquierdo8000, (newValue) => {
  if (newValue !== oidoIzquierdo8000.value) {
    oidoIzquierdo8000.value = newValue || 0;
  }
});
</script>

<template>
  <div>
    <h1 class="mb-4 text-sm text-gray-800 leading-5"><span class="text-xl font-bold">OÍDO IZQUIERDO</span> - Valores Audiométricos</h1>
    
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
                  :name="`oidoIzquierdo${frecuencia.value}`"
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
              {{ porcentajePerdidaOI }}%
            </span>
          </div>
        </div>
      </div>

      <!-- Información de frecuencias usadas -->
      <div class="w-full mt-2 text-center">
        <p class="text-xs text-gray-600">
          Frecuencias usadas OI: [{{ calcularPorcentajePorOido().frecuencias.join(', ') }}] Hz
          {{ calcularPorcentajePorOido().rango ? ` (Rango ${calcularPorcentajePorOido().rango})` : '' }}
        </p>
      </div>
 
    </div>
  </div>
</template>
