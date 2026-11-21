<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import OpcionesSegmentadas from '@/components/steps/captura/OpcionesSegmentadas.vue';
import { CLASE_AYUDA, CLASE_ETIQUETA, CLASE_INPUT } from '@/components/steps/captura/estiloCaptura';

const props = withDefaults(
  defineProps<{
    label: string;
    question?: string;
    modelValue: string;
    especificar: string;
    placeholder?: string;
    especificarRequired?: boolean;
    /** Valor escrito en especificar al elegir No (default Negado). */
    especificarCuandoNo?: string;
    /** Si true, al elegir Sí limpia el campo especificar. */
    limpiarEspecificarAlSi?: boolean;
    /** Marca data-campo de la respuesta (el aviso al guardar y el índice la buscan). */
    campo?: string;
    /** Marca data-campo de «Especifique» (el aviso «Falta especificar…» lleva aquí). */
    campoEspecificar?: string;
  }>(),
  {
    especificarCuandoNo: 'Negado',
    especificarRequired: true,
    limpiarEspecificarAlSi: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:especificar': [value: string];
}>();

const inputEspecificar = ref<HTMLInputElement | null>(null);

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
      }
      await nextTick();
      inputEspecificar.value?.focus();
    }
  },
);

// Punto 39: mismo diseño que la nota médica en los dos modos. La etiqueta llega en mayúsculas
// («NEFROPATÍAS»); se muestra con mayúscula inicial.
const etiquetaLegible = computed(() =>
  props.label ? props.label.charAt(0) + props.label.slice(1).toLocaleLowerCase('es-MX') : '',
);
const OPCIONES_NO_SI = [
  { valor: 'No', etiqueta: 'No' },
  { valor: 'Si', etiqueta: 'Sí' },
];
// Radios con nombre propio por pregunta (varias secciones conviven en la captura rápida)
const nombreGrupo = computed(() => `sino-${props.campo || props.campoEspecificar || props.label}`);
</script>

<template>
  <div :data-campo="campo" class="border-b border-gray-200/80 dark:border-slate-700/80 py-2.5 last:border-b-0">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p :class="[CLASE_ETIQUETA, 'leading-tight']">{{ etiquetaLegible }}</p>
        <p v-if="question" :class="[CLASE_AYUDA, 'mt-0.5']">{{ question }}</p>
      </div>
      <OpcionesSegmentadas
        v-model="value"
        compacto
        class="shrink-0"
        :name="nombreGrupo"
        :etiqueta="etiquetaLegible"
        :opciones="OPCIONES_NO_SI"
      />
    </div>
    <div v-if="value === 'Si'" class="mt-2">
      <input
        ref="inputEspecificar"
        type="text"
        :data-campo="campoEspecificar"
        :class="CLASE_INPUT"
        v-model="especificarLocal"
        :placeholder="placeholder || 'Especifique'"
        :required="especificarRequired !== false"
      />
    </div>
  </div>
</template>
