<script setup lang="ts">
/**
 * Un trabajo anterior de la historia clínica (pasos 42–44: antes eran tres copias del mismo
 * paso). Punto 39: diseño común, igual en los dos modos; en la captura rápida, empresa, puesto
 * y antigüedad en una fila y los agentes en tres columnas.
 */
import { computed, ref, watch } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import { CLASE_ETIQUETA, CLASE_INPUT } from '@/components/steps/captura/estiloCaptura';

const props = withDefaults(
  defineProps<{
    numero: 1 | 2 | 3;
    variant?: 'fullscreen' | 'compact';
  }>(),
  { variant: 'fullscreen' },
);

const { formDataHistoriaClinica } = useFormDataStore() as { formDataHistoriaClinica: Record<string, any> };
const capturaRapida = enCapturaRapida();

const campo = (nombre: string) => `${nombre}Anterior${props.numero}`;

const AGENTES = [
  'Ergonómicos',
  'Ruido',
  'Polvos',
  'Químicos',
  'Psicosociales',
  'Temperaturas elevadas',
  'Temperaturas abatidas',
  'Vibraciones',
  'Biológicos Infecciosos',
];

// Los agentes se guardan como texto separado por comas
const agentesSeleccionados = ref<string[]>(
  formDataHistoriaClinica[campo('agentes')] ? String(formDataHistoriaClinica[campo('agentes')]).split(', ') : [],
);
watch(agentesSeleccionados, (lista) => {
  formDataHistoriaClinica[campo('agentes')] = lista.join(', ');
});

const camposTexto = computed(() => [
  { nombre: 'empresa', etiqueta: 'Empresa', placeholder: 'Nombre de la empresa' },
  { nombre: 'puesto', etiqueta: 'Puesto', placeholder: 'Puesto que ocupó' },
  { nombre: 'antiguedad', etiqueta: 'Antigüedad', placeholder: 'Años y meses' },
]);
</script>

<template>
  <div class="space-y-3">
    <h1 v-if="variant !== 'compact' && numero === 1" class="text-2xl font-bold mb-4 text-gray-900">
      Antecedentes Laborales
    </h1>
    <p class="text-sm font-semibold text-gray-800 dark:text-slate-100">Trabajo anterior {{ numero }}</p>
    <div :class="['grid gap-3', capturaRapida ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1']">
      <div v-for="c in camposTexto" :key="c.nombre">
        <label :for="campo(c.nombre)" :class="[CLASE_ETIQUETA, 'mb-1']">{{ c.etiqueta }}</label>
        <input
          :id="campo(c.nombre)"
          v-model="formDataHistoriaClinica[campo(c.nombre)]"
          type="text"
          :class="CLASE_INPUT"
          :placeholder="c.placeholder"
        />
      </div>
    </div>
    <div>
      <p :class="[CLASE_ETIQUETA, 'mb-1']">Agentes</p>
      <div :class="['grid gap-x-3 gap-y-1', capturaRapida ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2']">
        <label
          v-for="agente in AGENTES"
          :key="agente"
          :class="[
            'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors duration-150',
            agentesSeleccionados.includes(agente)
              ? 'bg-emerald-50 text-emerald-800'
              : 'text-gray-700 hover:bg-gray-50',
          ]"
        >
          <input
            v-model="agentesSeleccionados"
            type="checkbox"
            :value="agente"
            class="rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
          />
          {{ agente }}
        </label>
      </div>
    </div>
  </div>
</template>
