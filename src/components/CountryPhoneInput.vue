<template>
  <div class="country-phone-input">
    <label class="country-phone-input-label block font-medium text-lg text-gray-700">
      {{ label }}
      <span v-if="validation === 'required'" class="text-red-500">*</span>
    </label>
    
    <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
      <!-- Selector de país -->
      <div class="relative w-full sm:w-auto">
        <select
          v-model="selectedCountry"
          @change="onCountryChange"
          class="w-full sm:w-36 h-12 p-2.5 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">País</option>
          <option
            v-for="country in countries"
            :key="country.code"
            :value="country.code"
          >
            {{ country.flag }} {{ country.name }}
          </option>
        </select>
      </div>
      
      <!-- Input de teléfono -->
      <div class="flex-1 relative w-full">
        <input
          :type="inputType"
          :value="phoneNumber"
          @input="onPhoneInput"
          :placeholder="placeholder"
          class="w-full h-12 p-2.5 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          :class="{ 'border-red-500': hasError }"
        />
        <div v-if="showToggle" class="absolute right-2 top-1/2 transform -translate-y-1/2">
          <button
            type="button"
            @click="togglePasswordVisibility"
            class="text-gray-500 hover:text-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1"
            :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          >
            <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Mostrar número completo -->
    <div v-if="fullPhoneNumber" class="text-sm text-gray-600 mt-2">
      Número completo: {{ fullPhoneNumber }}
    </div>
    
    <!-- Mensaje de error -->
    <div v-if="hasError && errorMessage" class="text-red-700 text-sm">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  label: {
    type: String,
    default: 'Teléfono'
  },
  placeholder: {
    type: String,
    default: 'Número local'
  },
  modelValue: {
    type: String,
    default: ''
  },
  showToggle: {
    type: Boolean,
    default: false
  },
  validation: {
    type: String,
    default: ''
  },
  initialCountry: {
    type: String,
    default: 'MX'
  }
});

const emit = defineEmits(['update:modelValue', 'validation', 'update:country']);

// Lista de países de LATAM con códigos de teléfono
const countries = ref([
  { code: 'MX', name: 'México', flag: '🇲🇽', dialCode: '+52' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', dialCode: '+54' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', dialCode: '+55' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', dialCode: '+56' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', dialCode: '+57' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪', dialCode: '+51' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', dialCode: '+58' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', dialCode: '+598' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', dialCode: '+595' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', dialCode: '+591' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', dialCode: '+593' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', dialCode: '+502' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', dialCode: '+506' },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦', dialCode: '+507' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', dialCode: '+504' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', dialCode: '+505' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', dialCode: '+503' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', dialCode: '+53' },
  { code: 'DO', name: 'República Dominicana', flag: '🇩🇴', dialCode: '+1' },
  { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷', dialCode: '+1' }
]);

const selectedCountry = ref(props.initialCountry);
const phoneNumber = ref('');
const showPassword = ref(false);
const hasError = ref(false);
const errorMessage = ref('');

const inputType = computed(() => {
  return props.showToggle ? (showPassword.value ? 'text' : 'password') : 'tel';
});

const fullPhoneNumber = computed(() => {
  if (selectedCountry.value && phoneNumber.value) {
    const country = countries.value.find(c => c.code === selectedCountry.value);
    return country ? `${country.dialCode}${phoneNumber.value}` : '';
  }
  return '';
});

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

const onCountryChange = () => {
  updateModelValue();
  validateInput();
  emit('update:country', selectedCountry.value);
};

const onPhoneInput = (event) => {
  // Solo permitir números
  const value = event.target.value.replace(/\D/g, '');
  phoneNumber.value = value;
  updateModelValue();
  validateInput();
};

const updateModelValue = () => {
  emit('update:modelValue', fullPhoneNumber.value);
};

const validateInput = () => {
  hasError.value = false;
  errorMessage.value = '';
  
  if (props.validation === 'required' && !fullPhoneNumber.value) {
    hasError.value = true;
    errorMessage.value = 'Este campo es obligatorio';
    emit('validation', false);
    return;
  }
  
  if (fullPhoneNumber.value && !isValidPhone(fullPhoneNumber.value)) {
    hasError.value = true;
    errorMessage.value = 'El número de teléfono no es válido';
    emit('validation', false);
    return;
  }
  
  emit('validation', true);
};

const isValidPhone = (phone) => {
  // Validación flexible para números internacionales (4-15 dígitos)
  const phoneRegex = /^\+?[1-9]\d{3,14}$/;
  return phoneRegex.test(phone);
};

// Inicializar con el valor del modelo si existe
watch(() => props.modelValue, (newValue) => {
  if (newValue && newValue.startsWith('+')) {
    const country = countries.value.find(c => newValue.startsWith(c.dialCode));
    if (country) {
      selectedCountry.value = country.code;
      phoneNumber.value = newValue.replace(country.dialCode, '');
    }
  }
}, { immediate: true });

// Emitir el país por defecto al inicializar
watch(() => selectedCountry.value, (newCountry) => {
  if (newCountry) {
    emit('update:country', newCountry);
  }
}, { immediate: true });

// Actualizar el país seleccionado cuando cambie la prop initialCountry
watch(() => props.initialCountry, (newCountry) => {
  if (newCountry && newCountry !== selectedCountry.value) {
    selectedCountry.value = newCountry;
    // Emitir el número completo actualizado cuando cambia el país
    updateModelValue();
  }
}, { immediate: true });
</script>

<style>
html.dark-mode .country-phone-input .country-phone-input-label {
  color: #cbd5e1 !important;
}

html.dark-mode .country-phone-input select,
html.dark-mode .country-phone-input input {
  background-color: #1e293b !important;
  color: #e2e8f0 !important;
  border-color: #475569 !important;
}

html.dark-mode .country-phone-input input::placeholder {
  color: #94a3b8 !important;
}

html.dark-mode .country-phone-input select option {
  background-color: #0f172a !important;
  color: #e2e8f0 !important;
}

html.dark-mode .country-phone-input button {
  color: #94a3b8 !important;
}

html.dark-mode .country-phone-input button:hover {
  color: #e2e8f0 !important;
}
</style>
