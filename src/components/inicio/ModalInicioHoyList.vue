<script setup lang="ts">
import InicioSkeletonCard from '@/components/inicio/InicioSkeletonCard.vue';

defineProps<{
  open: boolean;
  title: string;
  hint: string;
  loading: boolean;
  error: string | null;
  truncated: boolean;
  rangeLabel: string;
  page: number;
  pageCount: number;
}>();

const emit = defineEmits<{
  close: [];
  retry: [];
  prev: [];
  next: [];
}>();
</script>

<template>
  <div
    v-if="open"
    class="modal fixed top-0 left-0 z-[100] grid h-screen w-full place-items-center p-4 sm:p-8"
    data-testid="inicio-hoy-modal"
  >
    <div
      class="absolute top-0 left-0 h-full w-full bg-slate-900 bg-opacity-60 backdrop-blur-sm"
      @click="emit('close')"
    />
    <div
      class="modal-inner relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white p-6 text-gray-900 shadow-2xl sm:p-8 dark:bg-slate-800 dark:text-slate-100"
    >
      <button
        class="absolute right-4 top-4 text-gray-400 transition-colors hover:text-gray-600"
        type="button"
        aria-label="Cerrar"
        @click="emit('close')"
      >
        <i class="fas fa-times text-2xl"></i>
      </button>
      <div class="mb-4 pr-8">
        <h2 class="mb-2 text-2xl font-bold text-gray-900 dark:text-slate-100">
          {{ title }}
        </h2>
        <p class="text-sm text-gray-600 dark:text-slate-400">{{ hint }}</p>
        <p
          v-if="truncated"
          class="mt-2 text-sm text-amber-700 dark:text-amber-400"
          data-testid="inicio-hoy-truncated"
        >
          Se muestran los 300 registros más recientes.
        </p>
      </div>

      <div class="inicio-modal-scroll min-h-0 flex-1 overflow-y-auto p-1.5">
        <div v-if="loading" class="space-y-3" data-testid="inicio-hoy-loading">
          <InicioSkeletonCard variant="list" label="Cargando listado" />
        </div>
        <div v-else-if="error" class="py-6 text-center" data-testid="inicio-hoy-error">
          <p class="text-sm text-gray-600 dark:text-slate-400">{{ error }}</p>
          <button
            type="button"
            class="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700"
            @click="emit('retry')"
          >
            Reintentar
          </button>
        </div>
        <div v-else class="space-y-2">
          <slot />
        </div>
      </div>

      <div
        v-if="!loading && !error"
        class="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-sm text-gray-500 dark:border-slate-700"
      >
        <span data-testid="inicio-hoy-range">{{ rangeLabel }}</span>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-1 disabled:opacity-40"
            :disabled="page <= 1"
            data-testid="inicio-hoy-prev"
            @click="emit('prev')"
          >
            Anterior
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-1 disabled:opacity-40"
            :disabled="page >= pageCount"
            data-testid="inicio-hoy-next"
            @click="emit('next')"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inicio-modal-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgb(148 163 184 / 0.7) transparent;
}
.inicio-modal-scroll::-webkit-scrollbar {
  width: 3px;
}
.inicio-modal-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.inicio-modal-scroll::-webkit-scrollbar-thumb {
  background-color: rgb(148 163 184 / 0.7);
  border-radius: 9999px;
}
.dark .inicio-modal-scroll {
  scrollbar-color: rgb(71 85 105 / 0.8) transparent;
}
.dark .inicio-modal-scroll::-webkit-scrollbar-thumb {
  background-color: rgb(71 85 105 / 0.8);
}
</style>
