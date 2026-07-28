<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import CIE10Autocomplete from './CIE10Autocomplete.vue';

interface Props {
  modelValue: string[];
  trabajadorId?: string; // Para obtener datos del paciente
  fechaConsulta?: Date | string; // Para calcular edad
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => []
});

const emit = defineEmits(['update:modelValue']);

const warningMessage = ref('');
const MAX_DIAGNOSES = 5;

// Estado para tooltip de diagnósticos complementarios
const showComplementaryTooltip = ref(false);
const tooltipRef = ref<HTMLElement | null>(null);
const iconRef = ref<HTMLElement | null>(null);

const canAdd = computed(() => props.modelValue.length < MAX_DIAGNOSES);

const addDiagnosis = () => {
  if (!canAdd.value) {
    warningMessage.value = `Máximo ${MAX_DIAGNOSES} diagnósticos complementarios permitidos.`;
    return;
  }
  
  // Agregar un string vacío para renderizar un nuevo autocomplete
  const newValue = [...props.modelValue, ''];
  emit('update:modelValue', newValue);
  warningMessage.value = '';
};

const removeDiagnosis = (index: number) => {
  const newValue = props.modelValue.filter((_, i) => i !== index);
  emit('update:modelValue', newValue);
  warningMessage.value = '';
};

const updateDiagnosis = (index: number, code: string) => {
  if (!code) {
    // Si se limpia el código, actualizamos a vacío
    const newValue = [...props.modelValue];
    newValue[index] = '';
    emit('update:modelValue', newValue);
    return;
  }

  // Verificar duplicados (excluyendo el índice actual)
  const isDuplicate = props.modelValue.some((existingCode, i) => i !== index && existingCode === code);
  
  if (isDuplicate) {
        warningMessage.value = `El código ${code} ya ha sido agregado como diagnóstico complementario.`;
    // No actualizamos para evitar el duplicado en el estado
    return;
  }

  const newValue = [...props.modelValue];
  newValue[index] = code;
  emit('update:modelValue', newValue);
  warningMessage.value = '';
};

// Funciones para manejar tooltip de diagnósticos complementarios
const openComplementaryTooltip = () => {
    showComplementaryTooltip.value = true;
};

const closeComplementaryTooltip = () => {
    showComplementaryTooltip.value = false;
};

const toggleComplementaryTooltip = () => {
    showComplementaryTooltip.value = !showComplementaryTooltip.value;
};

// Función para calcular posición del tooltip
const getTooltipPosition = () => {
    if (!iconRef.value) {
        return { top: '0px', left: '0px' };
    }
    
    const rect = iconRef.value.getBoundingClientRect();
    const tooltipWidth = 384; // max-w-md = 28rem = 448px, usar ~384px
    const tooltipHeight = 300; // Estimado basado en contenido
    const spacing = 12;
    const viewportPadding = 16;
    
    // Calcular posición horizontal (centrado respecto al icono)
    let left = rect.left - (tooltipWidth / 2) + (rect.width / 2);
    
    // Ajustar si se sale por la izquierda
    if (left < viewportPadding) {
        left = viewportPadding;
    }
    // Ajustar si se sale por la derecha
    else if (left + tooltipWidth > window.innerWidth - viewportPadding) {
        left = window.innerWidth - tooltipWidth - viewportPadding;
    }
    
    // Intentar posicionar arriba del icono
    let top = rect.top - tooltipHeight - spacing;
    
    // Si no cabe arriba, posicionar abajo
    if (top < viewportPadding) {
        top = rect.bottom + spacing;
        // Si tampoco cabe abajo, posicionar arriba forzado (scrollable)
        if (top + tooltipHeight > window.innerHeight - viewportPadding) {
            top = viewportPadding;
        }
    }
    
    return {
        top: `${top}px`,
        left: `${left}px`
    };
};

// Cerrar tooltip al hacer click fuera o presionar Escape
let clickOutsideHandler: ((event: MouseEvent) => void) | null = null;
let escapeKeyHandler: ((event: KeyboardEvent) => void) | null = null;

onMounted(() => {
    clickOutsideHandler = (event: MouseEvent) => {
        if (
            tooltipRef.value &&
            iconRef.value &&
            !tooltipRef.value.contains(event.target as Node) &&
            !iconRef.value.contains(event.target as Node)
        ) {
            showComplementaryTooltip.value = false;
        }
    };
    
    escapeKeyHandler = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && showComplementaryTooltip.value) {
            showComplementaryTooltip.value = false;
            // Devolver focus al botón
            if (iconRef.value) {
                (iconRef.value as HTMLElement).focus();
            }
        }
    };
    
    document.addEventListener('click', clickOutsideHandler);
    document.addEventListener('keydown', escapeKeyHandler);
});

onUnmounted(() => {
    if (clickOutsideHandler) {
        document.removeEventListener('click', clickOutsideHandler);
    }
    if (escapeKeyHandler) {
        document.removeEventListener('keydown', escapeKeyHandler);
    }
});
</script>

<template>
  <div class="space-y-2.5 border border-emerald-100 rounded-xl p-2.5 bg-emerald-50/30 dark:border-emerald-800/60 dark:bg-emerald-950/25">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <i class="fas fa-list-ol text-emerald-900 dark:text-emerald-300 text-sm"></i>
        <h3 class="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider inline-flex items-center flex-shrink-0">
          <span class="mx-1">Diagnósticos <br>Complementarios</span>
          <button
            ref="iconRef"
            type="button"
            @mouseenter="openComplementaryTooltip"
            @mouseleave="closeComplementaryTooltip"
            @focus="openComplementaryTooltip"
            @blur="closeComplementaryTooltip"
            @click.stop="toggleComplementaryTooltip"
            class="inline-flex items-center justify-center flex-shrink-0 text-emerald-600 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 rounded-full transition-colors ml-1.5"
            aria-label="Más información sobre diagnósticos complementarios"
            :aria-expanded="showComplementaryTooltip"
          >
            <i class="fas fa-info-circle text-xs"></i>
          </button>
        </h3>
      </div>
      
      <button 
        v-if="canAdd"
        type="button"
        @click="addDiagnosis"
        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm active:scale-95"
      >
        <i class="fas fa-plus-circle text-xs"></i>
        Agregar
      </button>
    </div>
    
    <!-- Tooltip -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showComplementaryTooltip"
          ref="tooltipRef"
          role="tooltip"
          class="fixed z-50 bg-gray-900 text-white rounded-lg shadow-2xl p-4 max-w-md text-sm border border-gray-700"
          :style="getTooltipPosition()"
          @click.stop
        >
          <div class="space-y-3">
            <p class="font-semibold text-base mb-2 text-white">Los diagnósticos complementarios:</p>
            <ul class="list-disc list-inside space-y-1.5 text-gray-200 ml-2">
              <li>describen mejor el mismo cuadro clínico,</li>
              <li>no son otro diagnóstico principal,</li>
              <li>no cambian el motivo central de la consulta.</li>
            </ul>
            
            <div class="pt-2 border-t border-gray-700">
              <p class="font-semibold mb-2.5 text-white">Ejemplos clínicos reales:</p>
              
              <div class="space-y-2.5 text-gray-200">
                <div>
                  <p class="font-medium text-sm">Diagnóstico principal: Lumbalgia</p>
                  <p class="text-xs text-gray-300 ml-3 mt-0.5">Complementarios: Contractura muscular, Espasmo paravertebral</p>
                </div>
                <div>
                  <p class="font-medium text-sm">Diagnóstico principal: Diabetes mellitus</p>
                  <p class="text-xs text-gray-300 ml-3 mt-0.5">Complementarios: Neuropatía periférica, Retinopatía diabética</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Flecha del tooltip -->
          <div 
            class="absolute -bottom-2 left-8 w-4 h-4 bg-gray-900 transform rotate-45 border-r border-b border-gray-700"
          ></div>
        </div>
      </Transition>
    </Teleport>

    <!-- Warning Message -->
    <Transition name="fade">
      <div v-if="warningMessage" class="p-2.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg flex items-start gap-2 shadow-sm">
        <i class="fas fa-exclamation-triangle mt-0.5 text-xs"></i>
        <span class="flex-1 font-medium">{{ warningMessage }}</span>
        <button @click="warningMessage = ''" class="hover:text-amber-900">
          <i class="fas fa-times text-xs"></i>
        </button>
      </div>
    </Transition>

    <!-- List of Diagnoses -->
    <div v-if="modelValue.length > 0" class="space-y-2">
      <div 
        v-for="(code, index) in modelValue" 
        :key="index"
        class="flex items-center gap-3 py-2 px-3 bg-white border border-gray-100 rounded-lg shadow-sm group hover:border-emerald-200 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:hover:border-emerald-700"
      >
        <div class="flex-1 min-w-0">
          <CIE10Autocomplete
            :modelValue="code"
            @update:modelValue="(val) => updateDiagnosis(index, val)"
            :label="`Complementario ${index + 1}`"
            :trabajadorId="props.trabajadorId"
            :fechaConsulta="props.fechaConsulta"
            placeholder="Buscar diagnóstico..."
          />
        </div>
        
        <button 
          type="button"
          @click="removeDiagnosis(index)"
          class="flex-shrink-0 p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
          title="Quitar diagnóstico"
        >
          <i class="fas fa-trash-alt text-sm"></i>
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="py-4 text-center border-2 border-dashed border-emerald-100 rounded-lg dark:border-emerald-800/70">
      <div class="w-10 h-4 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2 dark:bg-emerald-950/50">
        <i class="fas fa-notes-medical text-emerald-300 text-lg"></i>
      </div>
      <p class="text-xs text-emerald-600 dark:text-emerald-300 font-medium">Sin diagnósticos complementarios</p>
      <p class="text-xs text-gray-400 dark:text-slate-500 mt-1">Puedes agregar hasta 5 códigos adicionales</p>
    </div>

    <p class="text-xs text-gray-500 leading-snug">
      Condiciones asociadas al diagnóstico principal que ayudan a describir mejor el cuadro clínico.
    </p>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>

