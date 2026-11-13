<script setup lang="ts">
/**
 * Aviso mientras se corrige lo que impide guardar: qué hacer en el dato actual, cuántos
 * quedan y cómo llegar al siguiente o ver todos. Va abajo para no tapar el campo.
 */
import { computed } from 'vue';

const props = defineProps<{
  mensaje: string;
  nombre: string;
  /** Pendientes en total (incluye el actual mientras no se corrija). */
  total: number;
  /** El dato actual ya quedó bien. */
  resuelto?: boolean;
}>();

const emit = defineEmits<{
  (e: 'siguiente'): void;
  (e: 'ver-todos'): void;
  (e: 'cerrar'): void;
}>();

/** Los que quedan además del actual. */
const restantes = computed(() => (props.resuelto ? props.total : Math.max(props.total - 1, 0)));
</script>

<template>
  <div
    class="aviso-atencion fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pointer-events-none"
    role="status"
    aria-live="polite"
  >
    <div
      :class="[
        'pointer-events-auto w-full max-w-xl rounded-xl border bg-white shadow-lg px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2',
        resuelto ? 'border-emerald-300' : 'border-amber-300',
      ]"
    >
      <div class="flex items-start gap-3 flex-1 min-w-[14rem]">
        <i
          :class="[
            'fa-solid mt-0.5',
            resuelto ? 'fa-circle-check text-emerald-500' : 'fa-circle-exclamation text-amber-500',
          ]"
        ></i>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-gray-800">{{ nombre }}</p>
          <p class="text-sm text-gray-700">{{ resuelto ? 'Listo.' : mensaje }}</p>
          <p v-if="restantes > 0" class="text-xs text-gray-500 mt-0.5">
            {{ restantes === 1 ? 'Queda 1 dato más por revisar.' : `Quedan ${restantes} datos más por revisar.` }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 ml-auto">
        <button
          v-if="restantes > 0"
          type="button"
          class="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-50"
          @click="emit('ver-todos')"
        >
          Ver todos
        </button>
        <button
          v-if="restantes > 0"
          type="button"
          class="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
          @click="emit('siguiente')"
        >
          Siguiente
        </button>
        <button
          type="button"
          class="w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="Cerrar aviso"
          @click="emit('cerrar')"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>
  </div>
</template>
