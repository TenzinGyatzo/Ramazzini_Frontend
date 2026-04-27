<script setup>
import { reactive, watch, ref, onMounted, onUnmounted, computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const { formDataAntidoping } = useFormDataStore();
const documentos = useDocumentosStore();

// Valor local para la pregunta principal
const antidopingResult = ref('No'); // Por defecto "No"

// Inicializar con el valor del store si existe, o con el valor por defecto
const tipoPrueba = ref(formDataAntidoping.tipoPrueba || '5');

const todosLosParametros = {
  marihuana: "Negativo",
  cocaina: "Negativo",
  anfetaminas: "Negativo",
  metanfetaminas: "Negativo",
  opiaceos: "Negativo",
  benzodiacepinas: "Negativo",
  fenciclidina: "Negativo",
  metadona: "Negativo",
  barbituricos: "Negativo",
  antidepresivosTriciclicos: "Negativo",
  metilendioximetanfetamina: "Negativo",
  ketamina: "Negativo",
};

// Objeto reactivo para los resultados de las sustancias
const drugResults = reactive({ ...todosLosParametros });

const camposVisibles = computed(() => {
  if (tipoPrueba.value === '2') {
    return ['marihuana', 'cocaina'];
  } else if (tipoPrueba.value === '3') {
    return ['marihuana', 'cocaina', 'anfetaminas'];
  } else if (tipoPrueba.value === '5') {
    return ['marihuana', 'cocaina', 'anfetaminas', 'metanfetaminas', 'opiaceos'];
  } else if (tipoPrueba.value === '6') {
    return ['marihuana', 'cocaina', 'anfetaminas', 'metanfetaminas', 'opiaceos', 'benzodiacepinas'];
  } else if (tipoPrueba.value === '12') {
    return Object.keys(todosLosParametros);
  } else {
    return ['marihuana', 'cocaina', 'anfetaminas', 'metanfetaminas', 'opiaceos', 'benzodiacepinas', 'fenciclidina', 'metadona', 'barbituricos', 'antidepresivosTriciclicos'];
  }
});

onMounted(() => {
  const doc = documentos.currentDocument;

  if (doc) {
    // Rellenar datos existentes
    for (const key in todosLosParametros) {
      if (key in doc) {
        drugResults[key] = doc[key];
      }
    }

    // Solo detectar automáticamente si no hay un valor guardado en el store
    if (!formDataAntidoping.tipoPrueba) {
      // Detectar el tipo de prueba de manera más precisa
      const camposPresentes = Object.keys(todosLosParametros).filter(
        (campo) => campo in doc && doc[campo] !== undefined && doc[campo] !== null
      );

      // Lógica mejorada para detectar el tipo de prueba
      if (camposPresentes.length >= 12) {
        tipoPrueba.value = '12';
      } else if (camposPresentes.length >= 10) {
        tipoPrueba.value = '10';
      } else if (camposPresentes.includes('benzodiacepinas')) {
        tipoPrueba.value = '6';
      } else if (camposPresentes.length === 5 && camposPresentes.includes('metanfetaminas') && camposPresentes.includes('opiaceos')) {
        tipoPrueba.value = '5';
      } else if (camposPresentes.length === 3 && camposPresentes.includes('anfetaminas') && !camposPresentes.includes('metanfetaminas')) {
        tipoPrueba.value = '3';
      } else if (camposPresentes.length === 2 && !camposPresentes.includes('anfetaminas')) {
        tipoPrueba.value = '2';
      } else {
        // Si no se puede detectar claramente, mantener el valor actual o usar el por defecto
        tipoPrueba.value = tipoPrueba.value || '5';
      }
    } else {
      // Usar el valor guardado en el store
      tipoPrueba.value = formDataAntidoping.tipoPrueba;
    }

    antidopingResult.value = 'Si';
  } else {
    // Si no hay documento, mantener el valor actual del selector
    tipoPrueba.value = tipoPrueba.value || '5';
  }
});

// Inicializar `formData` con valores por defecto al montar el componente
onUnmounted(() => {
  const datosFiltrados = Object.fromEntries(
    camposVisibles.value.map((campo) => [campo, drugResults[campo]])
  );
  Object.assign(formDataAntidoping, datosFiltrados);

  Object.keys(todosLosParametros).forEach((campo) => {
    if (!camposVisibles.value.includes(campo)) {
      delete formDataAntidoping[campo];
    }
  });
});

watch([drugResults, tipoPrueba], () => {
  const datosFiltrados = Object.fromEntries(
    camposVisibles.value.map((campo) => [campo, drugResults[campo]])
  );
  Object.assign(formDataAntidoping, datosFiltrados);

  // Elimina del formDataAntidoping los campos que ya no se deben enviar
  Object.keys(todosLosParametros).forEach((campo) => {
    if (!camposVisibles.value.includes(campo)) {
      delete formDataAntidoping[campo];
    }
  });
}, { deep: true });

watch(antidopingResult, (val) => {
  if (val === 'No') {
    camposVisibles.value.forEach((campo) => {
      drugResults[campo] = 'Negativo';
    });
  }
});

// Guardar el tipo de prueba en el store cuando cambie
watch(tipoPrueba, (newValue) => {
  formDataAntidoping.tipoPrueba = newValue;
});

function formatoNombre(campo) {
  return campo
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace('Triciclicos', 'T.');
}

</script>

<template>
  <div class="antidoping-step2">
    <h1 class="font-bold mb-4 text-gray-800 leading-5">Prueba Antidoping</h1>

    <div class="mb-4">
      <label class="font-medium text-gray-800">Tipo de prueba antidoping:</label>
      <select v-model="tipoPrueba" class="mt-1 border rounded p-1">
        <option value="2">2 parámetros</option>
        <option value="3">3 parámetros</option>
        <option value="5">5 parámetros</option>
        <option value="6">6 parámetros</option>
        <option value="10">10 parámetros</option>
        <option value="12">12 parámetros</option>
      </select>
    </div>

    <!-- Pregunta principal -->
    <div class="mb-4">
      <p class="font-medium mb-1 text-gray-800 leading-5">¿La prueba del trabajador dio resultados positivos?</p>
      <div class="flex items-center space-x-6 font-light">
        <label class="flex items-center space-x-2">
          <input
            type="radio"
            value="No"
            v-model="antidopingResult"
            class="form-radio accent-emerald-600"
          />
          <span>No</span>
        </label>
        <label class="flex items-center space-x-2">
          <input
            type="radio"
            value="Si"
            v-model="antidopingResult"
            class="form-radio accent-emerald-600"
          />
          <span>Sí</span>
        </label>
      </div>
    </div>

    <!-- Opciones adicionales, solo visibles si el resultado es "Sí" -->
    <div v-if="antidopingResult === 'Si'" class="mt-4">
      <p class="font-medium mb-2 text-gray-800">Especifique:</p>
      <div class="grid grid-cols-2 gap-1 font-light">
        <label
          v-for="parametro in camposVisibles"
          :key="parametro"
          class="antidoping-param-option flex items-center space-x-2 cursor-pointer hover:bg-emerald-100 rounded-md p-1"
        >
          <input
            type="checkbox"
            v-model="drugResults[parametro]"
            :true-value="'Positivo'"
            :false-value="'Negativo'"
            class="form-checkbox accent-emerald-600 cursor-pointer"
          />
          <span :class="parametro === 'metilendioximetanfetamina' ? 'text-xs lg:text-[0.625rem]' : ''">{{ formatoNombre(parametro) }}</span>
        </label>
      </div>

    </div>
  </div>
</template>

<style>
/* En dark mode, suavizar hover de opciones con checkbox (sin tocar light mode). */
html.dark-mode .antidoping-step2 .antidoping-param-option:hover {
  background-color: #334155 !important;
}
</style>
