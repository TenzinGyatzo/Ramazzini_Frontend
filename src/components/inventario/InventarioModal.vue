<script setup lang="ts">
import { computed } from 'vue';
import ModalDiscardConfirmDialog from '@/components/ModalDiscardConfirmDialog.vue';
import { useModalDirtyGuard } from '@/composables/useModalDirtyGuard';

const props = withDefaults(
  defineProps<{
    titulo: string;
    /** Ancho máximo del panel. */
    ancho?: 'md' | 'lg' | 'xl';
    /** Hay cambios sin guardar: antes de cerrar se pide confirmar el descarte. */
    sucio?: boolean;
  }>(),
  { ancho: 'md', sucio: false },
);

const emit = defineEmits<{ (e: 'cerrar'): void }>();

const { showDiscardConfirm, dismissPulse, requestDismiss, continueEditing, confirmDiscard } =
  useModalDirtyGuard({
    isDirty: computed(() => props.sucio),
    onClose: () => emit('cerrar'),
  });

/**
 * El fondo solo cierra si el clic empezó y terminó en él: arrastrar desde
 * dentro del panel (al seleccionar texto, por ejemplo) y soltar fuera no cierra.
 */
let presionadoEnElFondo = false;
const alPresionar = (evento: MouseEvent) => {
  presionadoEnElFondo = evento.target === evento.currentTarget;
};
const alHacerClic = (evento: MouseEvent) => {
  const cerrar = presionadoEnElFondo && evento.target === evento.currentTarget;
  presionadoEnElFondo = false;
  if (cerrar) requestDismiss();
};
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
    :class="{ 'modal-backdrop-pulse': dismissPulse }"
    role="dialog"
    aria-modal="true"
    :aria-label="titulo"
    data-test="inventario-modal-fondo"
    @mousedown="alPresionar"
    @click="alHacerClic"
  >
    <div
      class="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-gray-800 sm:rounded-2xl"
      :class="{
        'sm:max-w-md': ancho === 'md',
        'sm:max-w-2xl': ancho === 'lg',
        'sm:max-w-4xl': ancho === 'xl',
        'modal-dismiss-pulse': dismissPulse,
      }"
      data-test="inventario-modal-panel"
    >
      <header
        class="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700"
      >
        <h2 class="min-w-0 truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
          {{ titulo }}
        </h2>
        <button
          type="button"
          class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700"
          aria-label="Cerrar"
          @click="requestDismiss()"
        >
          <i class="fas fa-times"></i>
        </button>
      </header>
      <div class="overflow-y-auto px-5 py-4">
        <slot />
      </div>
      <footer
        v-if="$slots.acciones"
        class="flex flex-wrap justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3 dark:border-gray-700 dark:bg-gray-900/40"
      >
        <!-- `cerrar` pasa por la confirmación de descarte; úsalo en el botón Cancelar -->
        <slot name="acciones" :cerrar="() => requestDismiss()" />
      </footer>
    </div>

    <ModalDiscardConfirmDialog
      :open="showDiscardConfirm"
      @continue-editing="continueEditing"
      @discard="confirmDiscard"
    />
  </div>
</template>
