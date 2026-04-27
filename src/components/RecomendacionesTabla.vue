<template>
  <div class="recomendaciones-tabla">
    <div class="header">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4">
        Recomendaciones de Medidas Preventivas
      </h3>
      <p class="text-sm text-gray-600 dark:text-slate-300 mb-4">
        Agrega hallazgos específicos y sus medidas preventivas correspondientes.
      </p>
    </div>

    <div class="table-container">
      <table class="w-full border-collapse border border-gray-300 dark:border-slate-600">
        <thead>
          <tr class="bg-gray-50 dark:bg-slate-800">
            <th class="border border-gray-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-200">
              HALLAZGO
            </th>
            <th class="border border-gray-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-gray-700 dark:text-slate-200">
              MEDIDA PREVENTIVA RECOMENDADA
            </th>
            <th class="border border-gray-300 dark:border-slate-600 px-4 py-3 text-center font-semibold text-gray-700 dark:text-slate-200 w-20">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(item, index) in localItems" 
            :key="index"
            class="hover:bg-gray-50 dark:hover:bg-slate-800/70"
          >
            <td class="border border-gray-300 dark:border-slate-600 px-4 py-3">
              <textarea
                v-model="item.hallazgo"
                @input="updateItem(index, 'hallazgo', ($event.target as HTMLTextAreaElement).value)"
                class="w-full p-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-300 rounded resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                rows="2"
                placeholder="Describe el hallazgo..."
              ></textarea>
            </td>
            <td class="border border-gray-300 dark:border-slate-600 px-4 py-3">
              <textarea
                v-model="item.medidaPreventiva"
                @input="updateItem(index, 'medidaPreventiva', ($event.target as HTMLTextAreaElement).value)"
                class="w-full p-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-300 rounded resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                rows="2"
                placeholder="Describe la medida preventiva..."
              ></textarea>
            </td>
            <td class="border border-gray-300 dark:border-slate-600 px-4 py-3 text-center">
              <button
                @click="removeItem(index)"
                class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                title="Eliminar fila"
              >
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="actions mt-4">
      <button
        @click="addItem"
        class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
      >
        <i class="fas fa-plus"></i>
        Agregar Recomendación
      </button>
      
      <div v-if="localItems.length === 0" class="text-center py-8 text-gray-500 dark:text-slate-400">
        <i class="fas fa-table text-4xl mb-2"></i>
        <p>No hay recomendaciones agregadas</p>
        <p class="text-sm">Haz clic en "Agregar Recomendación" para comenzar</p>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import type { RecomendacionItem } from '@/interfaces/informe-personalizacion.interface';

interface Props {
  modelValue?: RecomendacionItem[];
}

interface Emits {
  (e: 'update:modelValue', value: RecomendacionItem[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => []
});

const emit = defineEmits<Emits>();

const localItems = ref<RecomendacionItem[]>([]);
const isUpdatingFromParent = ref(false);

// Inicializar con datos del prop
onMounted(() => {
  if (props.modelValue && props.modelValue.length > 0) {
    localItems.value = [...props.modelValue];
  } else {
    // Agregar una fila vacía por defecto
    addItem();
  }
});

// Observar cambios en el prop (solo cuando cambia desde el padre)
watch(() => props.modelValue, (newValue) => {
  if (isUpdatingFromParent.value) return; // Evitar bucles
  
  if (newValue && newValue.length > 0) {
    // Solo actualizar si es diferente para evitar bucles
    const isDifferent = JSON.stringify(newValue) !== JSON.stringify(localItems.value);
    if (isDifferent) {
      localItems.value = [...newValue];
    }
  }
}, { deep: true });

// Observar cambios locales y emitir al padre (con debounce para evitar bucles)
let emitTimeout: NodeJS.Timeout | null = null;
watch(localItems, (newValue) => {
  if (emitTimeout) {
    clearTimeout(emitTimeout);
  }
  emitTimeout = setTimeout(() => {
    isUpdatingFromParent.value = true;
    emit('update:modelValue', [...newValue]);
    // Reset flag después de un pequeño delay
    setTimeout(() => {
      isUpdatingFromParent.value = false;
    }, 50);
  }, 10); // Pequeño delay para evitar bucles
}, { deep: true });

const addItem = () => {
  localItems.value.push({
    hallazgo: '',
    medidaPreventiva: ''
  });
};

const removeItem = (index: number) => {
  if (localItems.value.length > 1) {
    localItems.value.splice(index, 1);
  }
};

const updateItem = (index: number, field: keyof RecomendacionItem, value: string) => {
  if (localItems.value[index]) {
    localItems.value[index][field] = value;
  }
};

// Métodos públicos
const getItems = () => {
  return localItems.value;
};

const setItems = (items: RecomendacionItem[]) => {
  localItems.value = [...items];
};

const clearItems = () => {
  localItems.value = [];
  addItem(); // Agregar una fila vacía
};

const validateItems = () => {
  return localItems.value.every(item => 
    item.hallazgo.trim() !== '' && item.medidaPreventiva.trim() !== ''
  );
};

// Limpiar timeout al desmontar el componente
onUnmounted(() => {
  if (emitTimeout) {
    clearTimeout(emitTimeout);
  }
});

defineExpose({
  getItems,
  setItems,
  clearItems,
  validateItems
});
</script>

<style scoped>
.recomendaciones-tabla {
  width: 100%;
}

.table-container {
  overflow-x: auto;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
}

:global(html.dark-mode) .table-container {
  border-color: #475569;
}

table {
  min-width: 100%;
}

textarea {
  font-size: 0.875rem;
}

textarea:focus {
  outline: none;
}

/* Estilos para el hover de las filas */
tbody tr:hover {
  background-color: #f9fafb;
}

:global(html.dark-mode) tbody tr:hover {
  background-color: rgba(30, 41, 59, 0.7);
}

/* Estilos para los botones de acción */
button {
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

/* Responsive */
@media (max-width: 768px) {
  .table-container {
    font-size: 0.75rem;
  }
  
  textarea {
    font-size: 0.75rem;
  }
}
</style>
