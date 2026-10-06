<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';

withDefaults(
  defineProps<{
    titulo: string;
    /** Ancho máximo del panel. */
    ancho?: 'md' | 'lg' | 'xl';
  }>(),
  { ancho: 'md' },
);

const emit = defineEmits<{ (e: 'cerrar'): void }>();

const alPresionarTecla = (evento: KeyboardEvent) => {
  if (evento.key === 'Escape') emit('cerrar');
};

onMounted(() => window.addEventListener('keydown', alPresionarTecla));
onBeforeUnmount(() => window.removeEventListener('keydown', alPresionarTecla));
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
    role="dialog"
    aria-modal="true"
    :aria-label="titulo"
    @click.self="emit('cerrar')"
  >
    <div
      class="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-gray-800 sm:rounded-2xl"
      :class="{
        'sm:max-w-md': ancho === 'md',
        'sm:max-w-2xl': ancho === 'lg',
        'sm:max-w-4xl': ancho === 'xl',
      }"
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
          @click="emit('cerrar')"
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
        <slot name="acciones" />
      </footer>
    </div>
  </div>
</template>
