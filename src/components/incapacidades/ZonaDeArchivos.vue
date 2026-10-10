<script setup lang="ts">
import { ref } from 'vue';
import { AYUDA_DE_RESPALDO } from '@/helpers/incapacidadesRespaldos';

/**
 * Zona para elegir archivos con clic o arrastrándolos, como la de documentos
 * externos pero compacta. Solo entrega los archivos; quien la usa los valida.
 */
const props = withDefaults(
  defineProps<{
    multiple?: boolean;
    deshabilitada?: boolean;
    /** Texto bajo la instrucción: formatos y tamaño. */
    ayuda?: string;
  }>(),
  { multiple: false, deshabilitada: false, ayuda: AYUDA_DE_RESPALDO },
);

const emit = defineEmits<{ (e: 'archivos', archivos: File[]): void }>();

const entrada = ref<HTMLInputElement | null>(null);
const sobre = ref(false);

const entregar = (lista: FileList | null | undefined) => {
  const archivos = Array.from(lista ?? []);
  if (!archivos.length || props.deshabilitada) return;
  emit('archivos', props.multiple ? archivos : archivos.slice(0, 1));
};

const alElegir = (evento: Event) => {
  const campo = evento.target as HTMLInputElement;
  entregar(campo.files);
  // Permite volver a elegir el mismo archivo
  campo.value = '';
};

const alSalir = (evento: DragEvent) => {
  // Solo al salir de la zona, no al pasar sobre sus elementos
  if (!(evento.currentTarget as HTMLElement).contains(evento.relatedTarget as Node | null)) {
    sobre.value = false;
  }
};

const alSoltar = (evento: DragEvent) => {
  sobre.value = false;
  entregar(evento.dataTransfer?.files);
};

const abrir = () => {
  if (!props.deshabilitada) entrada.value?.click();
};
</script>

<template>
  <div
    class="zona-archivos cursor-pointer rounded-lg border-2 border-dashed px-4 py-4 text-center transition-all duration-200"
    :class="[
      sobre ? 'zona-archivos--sobre scale-[1.02] border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50',
      deshabilitada ? 'pointer-events-none opacity-60' : '',
    ]"
    role="button"
    tabindex="0"
    :aria-label="multiple ? 'Elegir archivos' : 'Elegir archivo'"
    data-test="zona-archivos"
    @click="abrir"
    @keydown.enter.prevent="abrir"
    @keydown.space.prevent="abrir"
    @dragenter.prevent.stop="sobre = true"
    @dragover.prevent.stop
    @dragleave.prevent.stop="alSalir"
    @drop.prevent.stop="alSoltar"
  >
    <input
      ref="entrada"
      type="file"
      class="hidden"
      accept=".pdf,.jpg,.jpeg,.png"
      :multiple="multiple"
      :disabled="deshabilitada"
      data-test="archivo"
      @change="alElegir"
      @click.stop
    />
    <i
      class="fas fa-cloud-arrow-up mb-1.5 text-2xl transition-transform duration-200"
      :class="sobre ? 'scale-110 text-emerald-500' : 'text-gray-400'"
      aria-hidden="true"
    ></i>
    <p class="text-sm font-medium" :class="sobre ? 'text-emerald-700' : 'text-gray-700'">
      <template v-if="sobre">{{ multiple ? '¡Suelta los archivos aquí!' : '¡Suelta el archivo aquí!' }}</template>
      <template v-else>
        {{ multiple ? 'Arrastra archivos aquí o haz clic para seleccionar' : 'Arrastra el archivo aquí o haz clic para seleccionar' }}
      </template>
    </p>
    <p class="mt-0.5 text-xs text-gray-500">{{ ayuda }}</p>
  </div>
</template>
