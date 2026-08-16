<script setup>
import { useEscapeToClose } from '@/composables/useEscapeToClose';

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  word: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['confirm', 'close']);

const handleClose = () => {
  emit('close');
};

const handleConfirm = (event) => {
  event.stopPropagation();
  emit('confirm');
};

useEscapeToClose(handleClose, () => props.open);
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[80] flex items-center justify-center p-4"
        @click.self="handleClose"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

        <div
          role="alertdialog"
          aria-labelledby="curp-inconvenient-title"
          aria-describedby="curp-inconvenient-description"
          class="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        >
          <h2 id="curp-inconvenient-title" class="text-xl font-semibold text-gray-900">
            Palabra inconveniente en la CURP
          </h2>
          <p id="curp-inconvenient-description" class="mt-2 text-sm text-gray-600">
            Las posiciones 1 a 4 de la CURP forman la secuencia
            <strong class="font-mono text-gray-800">{{ word }}</strong>, considerada inconveniente
            según las reglas RENAPO. Puede usar la variante con sustituto (usando 
            <strong class="font-mono">X</strong> en la posición 2) o confirmar que desea registrar
            la CURP tal como está.
          </p>
          <p class="mt-2 text-sm text-gray-600">
            Al confirmar, declara bajo su responsabilidad que la CURP capturada es correcta.
          </p>

          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="handleClose"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
              @click="handleConfirm"
            >
              Confirmar y guardar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
