<script setup lang="ts">
/**
 * Pregunta con pocas opciones al lado de su etiqueta (dolor menstrual). Punto 39: mismo
 * diseño que las preguntas No/Sí (botones juntos compactos), igual en los dos modos.
 */
import { computed } from 'vue';
import OpcionesSegmentadas from '@/components/steps/captura/OpcionesSegmentadas.vue';
import { CLASE_AYUDA, CLASE_ETIQUETA } from '@/components/steps/captura/estiloCaptura';

const props = defineProps<{
  label: string;
  question?: string;
  modelValue: string;
  options: Array<{ value: string; label: string; hint?: string }>;
  /** Marca data-campo (el aviso al guardar y el índice la buscan). */
  campo?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const valor = computed({
  get: () => props.modelValue,
  set: (v: string | null) => emit('update:modelValue', v ?? ''),
});
const etiquetaLegible = computed(() =>
  props.label ? props.label.charAt(0) + props.label.slice(1).toLocaleLowerCase('es-MX') : '',
);
const opciones = computed(() => props.options.map((o) => ({ valor: o.value, etiqueta: o.label })));
</script>

<template>
  <div :data-campo="campo" class="border-b border-gray-200/80 dark:border-slate-700/80 py-2.5 last:border-b-0">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p :class="[CLASE_ETIQUETA, 'leading-tight']">{{ etiquetaLegible }}</p>
        <p v-if="question" :class="[CLASE_AYUDA, 'mt-0.5']">{{ question }}</p>
      </div>
      <OpcionesSegmentadas
        v-model="valor"
        compacto
        class="shrink-0"
        :name="`opcion-${campo || label}`"
        :etiqueta="etiquetaLegible"
        :opciones="opciones"
      />
    </div>
  </div>
</template>
