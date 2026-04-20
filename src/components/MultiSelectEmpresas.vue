<template>
  <div class="multiselect-empresas space-y-2">
    <label class="block text-sm font-medium text-gray-700">
      {{ label }}
    </label>
    
    <!-- Input de búsqueda -->
    <div class="relative">
      <input
        v-model="searchTerm"
        type="text"
        :placeholder="placeholder"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        @focus="showDropdown = true"
        @blur="handleBlur"
      />
      <i class="fas fa-search absolute right-3 top-3 text-gray-400"></i>
    </div>

    <!-- Dropdown -->
    <div v-if="showDropdown" class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
      <!-- Header con contador -->
      <div class="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
        {{ filteredItems.length }} empresa{{ filteredItems.length !== 1 ? 's' : '' }} disponible{{ filteredItems.length !== 1 ? 's' : '' }}
      </div>
      
      <!-- Opciones filtradas -->
      <div
        v-for="item in filteredItems"
        :key="item._id"
        class="px-3 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
        @click="toggleItem(item)"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="flex items-center">
              <input
                :id="`empresa-${item._id}`"
                type="checkbox"
                :checked="isSelected(item._id)"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                @click.stop
                @change="toggleItem(item)"
              />
              <label :for="`empresa-${item._id}`" class="cursor-pointer flex-1">
                <div class="font-medium text-gray-900">{{ item.nombreComercial || item.nombreCentro }}</div>
                <div v-if="item.razonSocial && item.razonSocial !== item.nombreComercial" class="text-sm text-gray-500 mt-1">
                  {{ item.razonSocial }}
                </div>
                <div v-if="item.rfc" class="text-xs text-gray-400 mt-1">
                  <i class="fas fa-id-card mr-1"></i>
                  RFC: {{ item.rfc }}
                </div>
              </label>
            </div>
          </div>
          
          <!-- Indicador de estado -->
          <div class="ml-3">
            <span 
              v-if="isSelected(item._id)"
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
            >
              <i class="fas fa-check mr-1"></i>
              Seleccionada
            </span>
            <span 
              v-else
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
            >
              Disponible
            </span>
          </div>
        </div>
      </div>
      
      <!-- Mensaje si no hay resultados -->
      <div v-if="filteredItems.length === 0" class="px-3 py-4 text-center text-sm text-gray-500 bg-gray-50">
        <i class="fas fa-search mr-2"></i>
        No se encontraron empresas con ese nombre
      </div>
    </div>

    <!-- Chips de selección -->
    <div v-if="selectedItems.length > 0" class="mt-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-gray-700">
          Empresas seleccionadas ({{ selectedItems.length }})
        </span>
        <button
          @click="clearAll"
          class="text-xs text-red-600 hover:text-red-800 font-medium"
        >
          <i class="fas fa-trash mr-1"></i>
          Limpiar todo
        </button>
      </div>
      
      <div class="flex flex-wrap gap-2">
        <div
          v-for="item in selectedItems"
          :key="item._id"
          class="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 shadow-sm"
        >
          <i class="fas fa-building mr-2"></i>
          <span class="max-w-xs truncate">{{ item.nombreComercial || item.nombreCentro }}</span>
          <button
            @click="removeItem(item._id)"
            class="ml-2 hover:text-red-600 transition-colors"
            title="Quitar empresa"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Botones de acción -->
    <div v-if="items.length > 0 && selectedItems.length < items.length" class="flex gap-2 mt-3">
      <button
        @click="selectAll"
        class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
      >
        <i class="fas fa-check-double mr-1"></i>
        Seleccionar todas ({{ items.length }})
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';

interface Item {
  _id: string;
  nombreComercial?: string;
  nombreCentro?: string;
  razonSocial?: string;
  rfc?: string;
}

interface Props {
  items: Item[];
  selectedIds: string[];
  label: string;
  placeholder: string;
  disabled?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:selectedIds': [value: string[]];
}>();

const searchTerm = ref('');
const showDropdown = ref(false);
const selectedItems = ref<Item[]>([]);

// Filtrar items basado en el término de búsqueda
const filteredItems = computed(() => {
  if (!searchTerm.value) return props.items;
  
  return props.items.filter(item => {
    const name = item.nombreComercial || item.nombreCentro || '';
    return name.toLowerCase().includes(searchTerm.value.toLowerCase());
  });
});

// Verificar si un item está seleccionado
const isSelected = (id: string) => {
  return props.selectedIds.includes(id);
};

// Toggle de selección de item
const toggleItem = (item: Item) => {
  const newSelectedIds = [...props.selectedIds];
  const index = newSelectedIds.indexOf(item._id);
  
  if (index > -1) {
    newSelectedIds.splice(index, 1);
  } else {
    newSelectedIds.push(item._id);
  }
  
  emit('update:selectedIds', newSelectedIds);
};

// Remover item de la selección
const removeItem = (id: string) => {
  const newSelectedIds = props.selectedIds.filter(selectedId => selectedId !== id);
  emit('update:selectedIds', newSelectedIds);
};

// Seleccionar todos los items filtrados
const selectAll = () => {
  const allIds = filteredItems.value.map(item => item._id);
  const newSelectedIds = [...new Set([...props.selectedIds, ...allIds])];
  emit('update:selectedIds', newSelectedIds);
};

// Limpiar toda la selección
const clearAll = () => {
  emit('update:selectedIds', []);
};

// Manejar blur del input
const handleBlur = () => {
  setTimeout(() => {
    showDropdown.value = false;
  }, 200);
};

// Actualizar selectedItems cuando cambien los selectedIds
watch(() => props.selectedIds, (newIds) => {
  selectedItems.value = props.items.filter(item => newIds.includes(item._id));
}, { immediate: true });

// Actualizar selectedItems cuando cambien los items
watch(() => props.items, (newItems) => {
  selectedItems.value = newItems.filter(item => props.selectedIds.includes(item._id));
}, { immediate: true });
</script>

<style>
html.dark-mode .multiselect-empresas label.text-gray-700,
html.dark-mode .multiselect-empresas .text-gray-700 {
  color: #cbd5e1 !important;
}

html.dark-mode .multiselect-empresas .text-gray-600,
html.dark-mode .multiselect-empresas .text-gray-500,
html.dark-mode .multiselect-empresas .text-gray-400 {
  color: #94a3b8 !important;
}

html.dark-mode .multiselect-empresas input[type='text'] {
  background-color: #1e293b !important;
  color: #e2e8f0 !important;
  border-color: #475569 !important;
}

html.dark-mode .multiselect-empresas input[type='text']::placeholder {
  color: #94a3b8 !important;
}

html.dark-mode .multiselect-empresas .bg-white {
  background-color: #0f172a !important;
}

html.dark-mode .multiselect-empresas .bg-gray-50 {
  background-color: #1e293b !important;
}

html.dark-mode .multiselect-empresas .border-gray-300,
html.dark-mode .multiselect-empresas .border-gray-200,
html.dark-mode .multiselect-empresas .border-gray-100 {
  border-color: #334155 !important;
}

html.dark-mode .multiselect-empresas .hover\:bg-gray-50:hover {
  background-color: #334155 !important;
}

html.dark-mode .multiselect-empresas .bg-green-100 {
  background-color: rgba(6, 78, 59, 0.45) !important;
}

html.dark-mode .multiselect-empresas .text-green-800 {
  color: #6ee7b7 !important;
}

html.dark-mode .multiselect-empresas .bg-gray-100 {
  background-color: #334155 !important;
}

html.dark-mode .multiselect-empresas .bg-gradient-to-r.from-blue-100.to-blue-200 {
  background-image: linear-gradient(to right, rgba(30, 58, 138, 0.4), rgba(29, 78, 216, 0.35)) !important;
}

html.dark-mode .multiselect-empresas .border-blue-300 {
  border-color: #1d4ed8 !important;
}

html.dark-mode .multiselect-empresas .text-blue-800 {
  color: #bfdbfe !important;
}

html.dark-mode .multiselect-empresas .bg-blue-50 {
  background-color: rgba(30, 58, 138, 0.26) !important;
}

html.dark-mode .multiselect-empresas .hover\:bg-blue-100:hover {
  background-color: rgba(29, 78, 216, 0.3) !important;
}

html.dark-mode .multiselect-empresas .border-blue-200 {
  border-color: #1d4ed8 !important;
}

html.dark-mode .multiselect-empresas .text-blue-600 {
  color: #93c5fd !important;
}

html.dark-mode .multiselect-empresas .hover\:text-red-800:hover {
  color: #fca5a5 !important;
}
</style>

