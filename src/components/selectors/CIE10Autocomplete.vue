<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import CatalogsAPI from '@/api/CatalogsAPI';
import { useCatalogSearchInput } from '@/helpers/catalogSearchInput';

const { catalogSearchInputAttrs } = useCatalogSearchInput();

interface Props {
  modelValue: string;
  required?: boolean;
  label?: string;
  placeholder?: string;
  trabajadorId?: string; // Para obtener datos del paciente
  fechaConsulta?: Date | string; // Para calcular edad
  /** Etiqueta más densa (p. ej. stepper compacto) */
  dense?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  label: 'Diagnóstico CIE-10',
  placeholder: 'Buscar por código o descripción...',
  dense: false,
});

const emit = defineEmits(['update:modelValue']);

// Local state
const searchTerm = ref('');
const results = ref<any[]>([]);
const isLoading = ref(false);
const showDropdown = ref(false);
const selectedIndex = ref(-1);
const errorMessage = ref('');
const containerRef = ref<HTMLElement | null>(null);

// Debounce timer
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Handle search
const performSearch = async (query: string) => {
  if (query.length < 2) {
    results.value = [];
    showDropdown.value = false;
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';
  
  try {
    const limit = 50;
    const { data } = await CatalogsAPI.searchCIE10(query, limit);
    results.value = data || [];
    showDropdown.value = true;
    selectedIndex.value = -1;
  } catch (error) {
    console.error('Error searching CIE-10:', error);
    errorMessage.value = 'Error en la búsqueda, intente de nuevo';
    results.value = [];
  } finally {
    isLoading.value = false;
  }
};

const onInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const val = target.value;
  searchTerm.value = val;

  // Clear previous timer
  if (debounceTimer) clearTimeout(debounceTimer);

  // Set new timer
  debounceTimer = setTimeout(() => {
    performSearch(val);
  }, 300);
};

const selectResult = (item: any) => {
  const fullText = `${item.code} - ${item.description}`;
  searchTerm.value = fullText;
  // Emitir formato completo: "CODE - DESCRIPTION" para guardar en BD
  emit('update:modelValue', fullText);
  showDropdown.value = false;
  results.value = [];
};

const clearSelection = () => {
  searchTerm.value = '';
  emit('update:modelValue', '');
  results.value = [];
  showDropdown.value = false;
};

// Keyboard navigation
const handleKeyDown = (e: KeyboardEvent) => {
  if (!showDropdown.value) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex.value = (selectedIndex.value + 1) % results.value.length;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex.value = (selectedIndex.value - 1 + results.value.length) % results.value.length;
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (selectedIndex.value >= 0 && selectedIndex.value < results.value.length) {
      selectResult(results.value[selectedIndex.value]);
    }
  } else if (e.key === 'Escape') {
    showDropdown.value = false;
  }
};

// Close dropdown on click outside
const handleClickOutside = (e: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    showDropdown.value = false;
  }
};

onMounted(async () => {
  window.addEventListener('click', handleClickOutside);
  
  // If modelValue is provided initially
  if (props.modelValue) {
    if (props.modelValue.includes(' - ')) {
      searchTerm.value = props.modelValue;
    } else {
      try {
        isLoading.value = true;
        const { data } = await CatalogsAPI.getCIE10ByCode(props.modelValue);
        if (data) {
          searchTerm.value = `${data.code} - ${data.description}`;
        }
      } catch (error) {
        console.error('Error fetching initial CIE-10:', error);
        searchTerm.value = props.modelValue;
      } finally {
        isLoading.value = false;
      }
    }
  }
});

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside);
});

// Watch modelValue for external changes
watch(() => props.modelValue, async (newVal) => {
  if (!newVal) {
    searchTerm.value = '';
  } else {
    // If modelValue is in format "CODE - DESCRIPTION", use it directly
    if (newVal.includes(' - ')) {
      searchTerm.value = newVal;
    } else if (!searchTerm.value.startsWith(newVal)) {
      try {
        const { data } = await CatalogsAPI.getCIE10ByCode(newVal);
        if (data) {
          searchTerm.value = `${data.code} - ${data.description}`;
        }
      } catch {}
    }
  }
});
</script>

<template>
  <div class="relative w-full" ref="containerRef">
    <label
      v-if="label"
      :class="dense
        ? 'block text-xs font-medium text-gray-600 mb-1'
        : 'block text-sm font-semibold text-gray-700 mb-1'"
    >
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>
    
    <div class="relative group">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <i v-if="!isLoading" class="fas fa-search text-gray-400 group-focus-within:text-emerald-500 transition-colors"></i>
        <i v-else class="fas fa-spinner fa-spin text-emerald-500"></i>
      </div>
      
      <input
        type="text"
        :value="searchTerm"
        @input="onInput"
        @keydown="handleKeyDown"
        :placeholder="placeholder"
        class="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all shadow-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
        v-bind="catalogSearchInputAttrs"
        role="combobox"
        :aria-expanded="showDropdown"
        aria-haspopup="listbox"
        :aria-label="label"
      />

      <button 
        v-if="searchTerm" 
        @click="clearSelection"
        type="button"
        class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-rose-500 transition-colors"
      >
        <i class="fas fa-times-circle"></i>
      </button>
    </div>

    <!-- Dropdown results -->
    <div 
      v-if="showDropdown || errorMessage" 
      class="absolute z-50 mt-1 w-full min-w-full max-w-2xl bg-white shadow-2xl max-h-80 rounded-xl py-1 text-sm ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none border border-emerald-50 dark:bg-slate-800 dark:border-slate-600 dark:ring-slate-700"
      role="listbox"
    >
      <div v-if="errorMessage" class="px-4 py-2 text-rose-600 font-medium flex items-center gap-2">
        <i class="fas fa-exclamation-circle"></i>
        {{ errorMessage }}
      </div>
      
      <template v-else-if="results.length > 0">
        <div
          v-for="(item, index) in results"
          :key="item.code"
          @click="selectResult(item)"
          @mouseenter="selectedIndex = index"
          :class="[
            'cursor-pointer select-none relative py-1.5 px-2.5 transition-colors',
            selectedIndex === index
              ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100'
              : 'text-gray-900 dark:text-slate-100 dark:hover:bg-slate-700'
          ]"
          role="option"
          :aria-selected="selectedIndex === index"
        >
          <div class="flex items-start">
            <span class="font-bold text-emerald-600 w-12 flex-shrink-0 mt-0.5">{{ item.code }}</span>
            <span class="leading-snug break-words">{{ item.description }}</span>
          </div>
          
          <span 
            v-if="modelValue && (modelValue === item.code || modelValue.startsWith(item.code + ' - '))"
            class="absolute top-1.5 right-0 flex items-center pr-4 text-emerald-600"
          >
            <i class="fas fa-check"></i>
          </span>
        </div>
      </template>

      <div v-else-if="searchTerm.length >= 2" class="px-4 py-3 text-gray-500 italic text-center">
        <i class="fas fa-search mb-1 block text-lg opacity-20"></i>
        No se encontraron códigos para "{{ searchTerm }}"
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Transición para el dropdown si se desea */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
