<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import OpcionesSegmentadas from '@/components/steps/captura/OpcionesSegmentadas.vue';
import { CLASE_AYUDA, CLASE_ETIQUETA, CLASE_TEXTAREA } from '@/components/steps/captura/estiloCaptura';

const props = withDefaults(
  defineProps<{
    label: string;
    question?: string;
    modelValue: string;
    /** Vacío mientras la pregunta no se ha revisado (se llena al revisarla o al guardar). */
    especificar?: string;
    placeholder?: string;
    especificarRequired?: boolean;
    /** Valor escrito en especificar al elegir No (default Sin hallazgos). */
    especificarCuandoNo?: string;
    /** Si true, al elegir Sí limpia el campo especificar. */
    limpiarEspecificarAlSi?: boolean;
    /** Campo de la descripción (p. ej. «craneoCara»): marcas data-campo y nombre de los radios. */
    campo?: string;
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

// El cursor va a la descripción solo cuando el usuario elige «Sí»; no cuando el paso lo fija al
// abrirse (punto 54: con hallazgos traídos, la página saltaba al último)
let eligioUsuario = false;
const value = computed({
  get: () => props.modelValue,
  set: (v: string) => {
    eligioUsuario = true;
    emit('update:modelValue', v);
  },
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
      const enfocar = eligioUsuario;
      eligioUsuario = false;
      await nextTick();
      if (enfocar) inputEspecificar.value?.focus();
    }
  },
);

// Punto 41: mismo diseño que la historia clínica en los dos modos. La etiqueta llega en
// mayúsculas («CRÁNEO-CARA»); se muestra con mayúscula inicial.
const etiquetaLegible = computed(() =>
  props.label ? props.label.charAt(0) + props.label.slice(1).toLocaleLowerCase('es-MX') : '',
);
const OPCIONES_NO_SI = [
  { valor: 'No', etiqueta: 'No' },
  { valor: 'Si', etiqueta: 'Sí' },
];
// Radios con nombre propio por pregunta (las 27 conviven en la captura rápida)
const nombreGrupo = computed(() => `hallazgo-${props.campo || props.label}`);
</script>

<template>
  <div
    :data-campo="campo ? `${campo}Pregunta` : undefined"
    class="border-b border-gray-200/80 dark:border-slate-700/80 py-2.5 last:border-b-0"
  >
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
      <textarea
        ref="inputEspecificar"
        rows="2"
        :data-campo="campo"
        :class="CLASE_TEXTAREA"
        v-model="especificarLocal"
        :placeholder="placeholder || 'Describa los hallazgos encontrados...'"
        :required="especificarRequired !== false"
      />
    </div>
  </div>
</template>
