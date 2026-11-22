<script setup lang="ts">
/**
 * Captura rápida (punto 38): la vista previa del documento en un panel lateral, sobre el
 * formulario y sin salir de la página. Se cierra con Esc, con su botón o tocando fuera; al
 * cerrarse, el cursor vuelve a donde estaba.
 */
import { nextTick, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  abierta: boolean;
  titulo?: string;
  /** Para documentos anchos (la tabla de la historia clínica). */
  amplio?: boolean;
  /**
   * Ancho a la medida de un documento (clase de Tailwind escrita completa donde se usa, p. ej.
   * «sm:w-[min(69rem,96vw)]»); tiene prioridad sobre «amplio».
   */
  claseAncho?: string;
}>();
const emit = defineEmits<{ (e: 'cerrar'): void }>();

const botonCerrar = ref<HTMLButtonElement | null>(null);
let focoAnterior: HTMLElement | null = null;

const alTecla = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    emit('cerrar');
  }
};

watch(
  () => props.abierta,
  async (abierta) => {
    if (abierta) {
      focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      document.addEventListener('keydown', alTecla, true);
      await nextTick();
      botonCerrar.value?.focus({ preventScroll: true });
    } else {
      document.removeEventListener('keydown', alTecla, true);
      focoAnterior?.focus({ preventScroll: true });
      focoAnterior = null;
    }
  },
  { immediate: true },
);

onUnmounted(() => document.removeEventListener('keydown', alTecla, true));
</script>

<template>
  <Teleport to="body">
    <Transition name="panel-vista-previa">
      <div v-if="abierta" data-pantalla-completa class="fixed inset-0 z-50 flex justify-end" data-panel-vista-previa>
        <div class="absolute inset-0 bg-gray-900/30 dark:bg-black/50" aria-hidden="true" @click="emit('cerrar')"></div>
        <!-- Amplio: un poco más que una hoja tamaño carta (antes 76rem, demasiado ancho) -->
        <aside
          role="dialog"
          aria-modal="true"
          :aria-label="titulo || 'Vista previa'"
          :class="[
            'panel relative h-full w-full bg-gray-100 dark:bg-slate-900 shadow-2xl flex flex-col',
            claseAncho || (amplio ? 'sm:w-[min(58rem,96vw)]' : 'sm:w-[min(52rem,92vw)]'),
          ]"
        >
          <header
            class="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
            <h2 class="text-base font-semibold text-gray-800 dark:text-slate-100">{{ titulo || 'Vista previa' }}</h2>
            <button
              ref="botonCerrar"
              type="button"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-md text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              @click="emit('cerrar')"
            >
              <i class="fas fa-xmark" aria-hidden="true"></i>
              Cerrar
              <kbd class="hidden sm:inline text-[0.65rem] px-1 rounded border border-gray-300 dark:border-slate-600">Esc</kbd>
            </button>
          </header>
          <div class="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5">
            <slot />
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.panel-vista-previa-enter-active,
.panel-vista-previa-leave-active {
  transition: opacity 0.2s ease;
}
.panel-vista-previa-enter-active .panel,
.panel-vista-previa-leave-active .panel {
  transition: transform 0.2s ease;
}
.panel-vista-previa-enter-from,
.panel-vista-previa-leave-to {
  opacity: 0;
}
.panel-vista-previa-enter-from .panel,
.panel-vista-previa-leave-to .panel {
  transform: translateX(100%);
}
</style>
