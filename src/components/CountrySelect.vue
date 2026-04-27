<template>
  <div class="country-select">
    <label class="country-select-label block font-medium text-lg text-gray-700">
      {{ label }}
      <span v-if="validation === 'required'" class="text-red-500">*</span>
    </label>
    
    <select
      :value="modelValue"
      @change="onChange"
      class="w-full h-12 p-2.5 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
      :class="{ 'border-red-500': hasError }"
    >
      <option value="">{{ placeholder }}</option>
      <option
        v-for="country in countries"
        :key="country.code"
        :value="country.code"
      >
        {{ country.flag }} {{ country.name }}
      </option>
    </select>
    
    <!-- Mensaje de error -->
    <div v-if="hasError && errorMessage" class="text-red-700 text-sm">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  label: {
    type: String,
    default: 'País'
  },
  placeholder: {
    type: String,
    default: 'Selecciona un país'
  },
  modelValue: {
    type: String,
    default: ''
  },
  validation: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'validation']);

// Lista de países de LATAM
const countries = ref([
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
  { code: 'DO', name: 'República Dominicana', flag: '🇩🇴' },
  { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷' }
]);

const hasError = ref(false);
const errorMessage = ref('');

const onChange = (event) => {
  const value = event.target.value;
  emit('update:modelValue', value);
  validateInput(value);
};

const validateInput = (value) => {
  hasError.value = false;
  errorMessage.value = '';
  
  if (props.validation === 'required' && !value) {
    hasError.value = true;
    errorMessage.value = 'Este campo es obligatorio';
    emit('validation', false);
    return;
  }
  
  emit('validation', true);
};
</script>

<style>
html.dark-mode .country-select .country-select-label {
  color: #cbd5e1 !important;
}

html.dark-mode .country-select select {
  background-color: #1e293b !important;
  color: #e2e8f0 !important;
  border-color: #475569 !important;
}

html.dark-mode .country-select select option {
  background-color: #0f172a !important;
  color: #e2e8f0 !important;
}
</style>
