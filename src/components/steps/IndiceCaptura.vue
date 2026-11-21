<script setup lang="ts">
/**
 * Índice de la captura rápida (punto 38): una línea por sección con su estado. Fijo a la
 * izquierda en pantallas anchas («lateral»); en celular, una barra arriba que se despliega.
 */
import { ref } from 'vue';
import type { EstadoSeccion, IndiceCaptura } from '@/helpers/indiceCaptura';

const props = defineProps<{
  indice: IndiceCaptura;
  /** Sección donde está el usuario. */
  actual: number | null;
  variante: 'lateral' | 'barra';
}>();
const emit = defineEmits<{ (e: 'ir', numero: number): void }>();

const abierta = ref(false);

const ICONO: Record<EstadoSeccion, string> = {
  completa: 'fas fa-circle-check text-emerald-600 dark:text-emerald-400',
  pendiente: 'fas fa-circle text-amber-500 text-[0.55rem]',
  error: 'fas fa-triangle-exclamation text-rose-600 dark:text-rose-400',
  // Tiene obligatorios y nadie la ha tocado: anillo ámbar; ya trabajada y aún incompleta: relleno
  sinEmpezar: 'far fa-circle text-amber-500 dark:text-amber-400 text-[0.7rem]',
  sinRevisar: 'far fa-eye text-sky-600 dark:text-sky-400',
};
const LEYENDA: Record<EstadoSeccion, string> = {
  completa: 'Completa',
  pendiente: 'Con algo pendiente',
  error: 'Con algo que corregir',
  sinEmpezar: 'Por capturar',
  sinRevisar: 'Sin revisar',
};

const ir = (numero: number) => {
  abierta.value = false;
  emit('ir', numero);
};

const resumen = () =>
  `${props.indice.completas} de ${props.indice.total} completas` +
  (props.indice.sinRevisar ? ` · ${props.indice.sinRevisar} sin revisar` : '');
</script>

<template>
  <nav
    aria-label="Secciones del documento"
    :class="
      variante === 'lateral'
        ? 'text-sm'
        : 'text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'
    "
  >
    <button
      v-if="variante === 'barra'"
      type="button"
      tabindex="-1"
      class="w-full flex items-center justify-between gap-2 px-3 py-2 font-medium text-gray-700 dark:text-slate-200"
      :aria-expanded="abierta"
      @click="abierta = !abierta"
    >
      <span>{{ resumen() }}</span>
      <i :class="['fas text-xs', abierta ? 'fa-chevron-up' : 'fa-chevron-down']" aria-hidden="true"></i>
    </button>
    <p v-else class="px-2 mb-2 text-xs font-semibold text-gray-500 dark:text-slate-400">{{ resumen() }}</p>

    <ol v-show="variante === 'lateral' || abierta" :class="variante === 'barra' ? 'px-1 pb-2' : ''">
      <li v-for="s in indice.secciones" :key="s.numero">
        <button
          type="button"
          tabindex="-1"
          :data-indice-seccion="s.numero"
          :aria-current="actual === s.numero ? 'location' : undefined"
          :title="s.estado === 'sinRevisar' ? 'Tiene las respuestas por defecto y nadie la ha revisado' : s.detalle || LEYENDA[s.estado]"
          :class="[
            'w-full text-left flex items-start gap-2 px-2 py-1.5 rounded-md transition-colors',
            actual === s.numero
              ? 'bg-emerald-50 dark:bg-slate-700'
              : 'hover:bg-gray-100 dark:hover:bg-slate-700/60',
          ]"
          @click="ir(s.numero)"
        >
          <span class="w-4 shrink-0 flex justify-center pt-0.5">
            <i :class="ICONO[s.estado]" aria-hidden="true"></i>
            <span class="sr-only">{{ LEYENDA[s.estado] }}:</span>
          </span>
          <span class="min-w-0">
            <span class="block text-gray-800 dark:text-slate-100 leading-tight">{{ s.nombre }}</span>
            <span
              v-if="s.detalle"
              :class="[
                'block text-xs leading-tight mt-0.5 line-clamp-2',
                s.estado === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500 dark:text-slate-400',
              ]"
            >{{ s.detalle }}</span>
          </span>
        </button>
      </li>
    </ol>
  </nav>
</template>
