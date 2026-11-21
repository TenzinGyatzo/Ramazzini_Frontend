<script setup lang="ts">
/**
 * Captura rápida (punto 38): lista de renglones (tratamiento, recomendaciones). Agregar y
 * quitar los hace el paso, como en el asistente; al agregar, el cursor va al renglón nuevo.
 */
import { nextTick, ref } from 'vue';
import { CLASE_ETIQUETA, CLASE_INPUT } from './estiloCaptura';

const props = defineProps<{
  id: string;
  etiqueta: string;
  /** «Tratamiento» → «Tratamiento 1», «Tratamiento 2»… */
  nombreRenglon: string;
  textoAgregar: string;
}>();
const renglones = defineModel<string[]>({ required: true });
const emit = defineEmits<{ (e: 'agregar'): void; (e: 'quitar', indice: number): void }>();

const lista = ref<HTMLElement | null>(null);
const agregar = async () => {
  emit('agregar');
  await nextTick();
  const campos = lista.value?.querySelectorAll<HTMLInputElement>('input');
  campos?.[campos.length - 1]?.focus();
};
</script>

<template>
  <div ref="lista">
    <p :class="[CLASE_ETIQUETA, 'mb-1']">{{ etiqueta }}</p>
    <div class="space-y-2">
      <div v-for="(_, i) in renglones" :key="i" class="flex items-center gap-2">
        <span class="w-5 shrink-0 text-right text-xs text-gray-400">{{ i + 1 }}.</span>
        <input
          :id="i === 0 ? props.id : undefined"
          v-model="renglones[i]"
          :class="CLASE_INPUT"
          :placeholder="`${nombreRenglon} ${i + 1}`"
        />
        <button
          type="button"
          tabindex="-1"
          class="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-150"
          :title="`Quitar ${nombreRenglon.toLowerCase()} ${i + 1}`"
          :aria-label="`Quitar ${nombreRenglon.toLowerCase()} ${i + 1}`"
          @click="emit('quitar', i)"
        >
          <i class="fas fa-trash-alt text-sm" aria-hidden="true"></i>
        </button>
      </div>
    </div>
    <button
      type="button"
      class="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 transition-colors duration-150"
      @click="agregar"
    >
      <i class="fas fa-plus text-xs" aria-hidden="true"></i>
      {{ textoAgregar }}
    </button>
  </div>
</template>
