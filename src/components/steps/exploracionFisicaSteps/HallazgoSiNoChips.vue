<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';

const props = withDefaults(
  defineProps<{
    label: string;
    question?: string;
    modelValue: string;
    especificar: string;
    placeholder?: string;
    especificarRequired?: boolean;
    /** Valor escrito en especificar al elegir No (default Sin hallazgos). */
    especificarCuandoNo?: string;
    /** Si true, al elegir Sí limpia el campo especificar. */
    limpiarEspecificarAlSi?: boolean;
  }>(),
  {
    especificarCuandoNo: 'Sin hallazgos',
    especificarRequired: true,
    limpiarEspecificarAlSi: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:especificar': [value: string];
}>();

const inputEspecificar = ref<HTMLTextAreaElement | null>(null);

const value = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
});

const especificarLocal = computed({
  get: () => props.especificar,
  set: (v: string) => emit('update:especificar', v),
});

watch(
  () => props.modelValue,
  async (newValue, oldValue) => {
    // Solo reaccionar a cambios del usuario, no al montaje inicial.
    if (oldValue === undefined || oldValue === newValue) return;

    if (newValue === 'No') {
      emit('update:especificar', props.especificarCuandoNo);
    }
    if (newValue === 'Si') {
      // No borrar un detalle ya capturado (p. ej. al remontar la sección).
      if (props.limpiarEspecificarAlSi) {
        const cur = (props.especificar || '').trim();
        if (!cur || cur === props.especificarCuandoNo) {
          emit('update:especificar', '');
        }
      } else {
        const cur = (props.especificar || '').trim();
        if (cur === props.especificarCuandoNo) {
          emit('update:especificar', '');
        }
      }
      await nextTick();
      inputEspecificar.value?.focus();
    }
  },
);

function chipClass(option: 'Si' | 'No') {
  const active = value.value === option;
  return [
    'px-3 py-1.5 rounded-md text-sm font-semibold border transition-colors duration-150 cursor-pointer select-none',
    active
      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
      : 'border-gray-300 bg-white text-gray-600 hover:border-emerald-400',
  ];
}
</script>

<template>
  <div class="border-b border-gray-200/80 py-2.5 last:border-b-0">
    <div class="flex flex-wrap items-center gap-2 justify-between">
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-gray-800 leading-tight">{{ label }}</p>
        <p v-if="question" class="text-xs text-gray-500 mt-0.5 leading-snug">{{ question }}</p>
      </div>
      <div class="flex items-center gap-1.5 shrink-0" role="group" :aria-label="label">
        <button
          type="button"
          :class="chipClass('No')"
          :aria-pressed="value === 'No'"
          @click="value = 'No'"
        >
          No
        </button>
        <button
          type="button"
          :class="chipClass('Si')"
          :aria-pressed="value === 'Si'"
          @click="value = 'Si'"
        >
          Sí
        </button>
      </div>
    </div>
    <div v-if="value === 'Si'" class="mt-2">
      <textarea
        ref="inputEspecificar"
        class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 min-h-[72px] resize-y"
        v-model="especificarLocal"
        :placeholder="placeholder || 'Describa los hallazgos encontrados...'"
        :required="especificarRequired !== false"
      />
    </div>
  </div>
</template>
