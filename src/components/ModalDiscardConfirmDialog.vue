<script setup>
import { useEscapeToClose } from '@/composables/useEscapeToClose';

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(['continue-editing', 'discard']);

const handleContinueEditing = () => {
  emit('continue-editing');
};

const handleDiscard = (event) => {
  event.stopPropagation();
  emit('discard');
};

useEscapeToClose(handleContinueEditing, () => props.open);
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[80] flex items-center justify-center p-4"
        @click.self="handleContinueEditing"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

        <div
          role="alertdialog"
          aria-labelledby="discard-dialog-title"
          aria-describedby="discard-dialog-description"
          class="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        >
          <h2 id="discard-dialog-title" class="text-xl font-semibold text-gray-900">
            ¿Descartar cambios?
          </h2>
          <p id="discard-dialog-description" class="mt-2 text-sm text-gray-600">
            Hay cambios sin guardar. Si sales ahora, se perderán.
          </p>

          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="handleContinueEditing"
            >
              Seguir editando
            </button>
            <button
              type="button"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              @click="handleDiscard"
            >
              Descartar cambios
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
