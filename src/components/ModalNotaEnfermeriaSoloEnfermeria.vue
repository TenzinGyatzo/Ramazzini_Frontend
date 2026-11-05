<script setup>
import { useEscapeToClose } from '@/composables/useEscapeToClose';
import { MENSAJE_NOTA_ENFERMERIA_PARA_MEDICOS } from '@/helpers/notaEnfermeria';

/** Aviso a los médicos que intentan crear una Nota de enfermería: les ofrece la Nota médica. */
const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(['cerrar', 'abrir-nota-medica']);

useEscapeToClose(() => emit('cerrar'), () => props.open);
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[80] flex items-center justify-center p-4"
        data-test="aviso-nota-enfermeria"
        @click.self="emit('cerrar')"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

        <div
          role="alertdialog"
          aria-labelledby="aviso-nota-enfermeria-titulo"
          aria-describedby="aviso-nota-enfermeria-texto"
          class="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[calc(100dvh-2rem)] overflow-y-auto"
        >
          <h2 id="aviso-nota-enfermeria-titulo" class="text-xl font-semibold text-gray-900">
            Nota de enfermería
          </h2>
          <p id="aviso-nota-enfermeria-texto" class="mt-2 text-sm text-gray-600">
            {{ MENSAJE_NOTA_ENFERMERIA_PARA_MEDICOS }}
          </p>

          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="emit('cerrar')"
            >
              Cerrar
            </button>
            <button
              type="button"
              class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              data-test="abrir-nota-medica"
              @click="emit('abrir-nota-medica')"
            >
              Abrir Nota médica
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
