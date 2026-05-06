<script setup>
import { onMounted, onUnmounted } from 'vue';

const emit = defineEmits(['close', 'confirm']);

function handleKeyDown(event) {
  if (event.key === 'Escape') emit('close');
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});

function onConfirmar() {
  emit('confirm');
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-reemplazo-redaccion"
      @click.self="emit('close')"
    >
      <div
        class="bg-white rounded-2xl p-6 sm:p-8 shadow-2xl max-w-md w-full mx-auto transform transition-all duration-300 scale-100 border border-gray-100"
        @click.stop
      >
        <div class="text-center mb-6">
          <div
            class="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-emerald-50 rounded-full mb-4 ring-1 ring-emerald-100"
          >
            <i class="fa-solid fa-file-lines text-xl sm:text-2xl text-emerald-600" aria-hidden="true"></i>
          </div>
          <h2 id="titulo-modal-reemplazo-redaccion" class="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
            Reemplazar redacción final
          </h2>
          <div class="w-16 h-1 bg-gradient-to-r from-slate-300 via-emerald-400 to-emerald-500 rounded-full mx-auto"></div>
        </div>

        <div class="text-center mb-6 sm:mb-8">
          <p class="text-gray-600 text-base sm:text-lg leading-relaxed mb-4">
            ¿Deseas sustituir el texto actual del cuadro
            <span class="font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
              Redacción final
            </span>
            por el párrafo generado?
          </p>
          <div class="flex items-start justify-center gap-2 text-sm text-gray-500 text-left max-w-sm mx-auto">
            <i class="fa-solid fa-circle-info text-emerald-600 mt-0.5 shrink-0" aria-hidden="true"></i>
            <span>Puedes seguir editando el texto después de insertarlo.</span>
          </div>
        </div>

        <div class="flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            class="w-full sm:flex-1 rounded-xl border border-gray-300 bg-white py-3 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="w-full sm:flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-4 text-sm transition-all duration-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-200 active:scale-[0.98]"
            @click="onConfirmar"
          >
            <span class="flex items-center justify-center gap-2">
              <i class="fa-solid fa-check" aria-hidden="true"></i>
              Sí, reemplazar
            </span>
          </button>
        </div>

        <p class="text-xs text-gray-400 text-center mt-5">
          Presiona ESC o haz clic fuera para conservar el texto actual
        </p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
button:active {
  transform: scale(0.98);
}
</style>
