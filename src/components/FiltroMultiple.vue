<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

/**
 * Filtro de selección múltiple: un botón del tamaño de un desplegable que abre la
 * lista de opciones. «Solo esta» deja una sola opción, como un desplegable normal.
 */
export interface OpcionDeFiltro {
  valor: string;
  texto: string;
}

const props = withDefaults(
  defineProps<{
    etiqueta: string;
    opciones: OpcionDeFiltro[];
    modelValue: string[];
    /** Texto cuando no hay nada elegido («Todos», «Cualquier agente»). */
    textoTodas?: string;
    /** Alinea el panel a la derecha del botón, para los filtros del final de la fila. */
    panelALaDerecha?: boolean;
  }>(),
  { textoTodas: 'Todos', panelALaDerecha: false },
);
const emit = defineEmits<{ 'update:modelValue': [valor: string[]] }>();

// Marcar varias seguidas no debe recargar el tablero por cada una
const ESPERA_AL_MARCAR_MS = 500;

const abierto = ref(false);
const seleccion = ref<string[]>([...props.modelValue]);
const raiz = ref<HTMLElement | null>(null);
const boton = ref<HTMLButtonElement | null>(null);
let temporizador: number | undefined;

watch(
  () => props.modelValue,
  (valor) => {
    window.clearTimeout(temporizador);
    temporizador = undefined;
    seleccion.value = [...valor];
  },
);

const resumen = computed(() => {
  if (seleccion.value.length === 0) return props.textoTodas;
  if (seleccion.value.length > 1) return `${seleccion.value.length} opciones`;
  const [valor] = seleccion.value;
  return props.opciones.find((o) => o.valor === valor)?.texto ?? valor;
});

function aplicar() {
  window.clearTimeout(temporizador);
  temporizador = undefined;
  emit('update:modelValue', [...seleccion.value]);
}

function alternar(valor: string) {
  seleccion.value = seleccion.value.includes(valor)
    ? seleccion.value.filter((v) => v !== valor)
    : [...seleccion.value, valor];
  window.clearTimeout(temporizador);
  temporizador = window.setTimeout(aplicar, ESPERA_AL_MARCAR_MS);
}

function soloEsta(valor: string) {
  seleccion.value = [valor];
  aplicar();
}

function quitarTodas() {
  seleccion.value = [];
  aplicar();
}

function cerrar() {
  if (temporizador !== undefined) aplicar();
  abierto.value = false;
}

function alPresionarFuera(evento: PointerEvent) {
  if (abierto.value && !raiz.value?.contains(evento.target as Node)) cerrar();
}

function alPresionarEsc() {
  cerrar();
  boton.value?.focus();
}

onMounted(() => document.addEventListener('pointerdown', alPresionarFuera));
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', alPresionarFuera);
  if (temporizador !== undefined) aplicar();
});
</script>

<template>
  <div ref="raiz" class="filtro-multiple relative flex flex-col" @keydown.esc.stop="alPresionarEsc">
    <span class="mb-0.5 text-[11px] text-gray-500">{{ etiqueta }}</span>
    <button
      ref="boton"
      type="button"
      class="dashboard-filtros__campo flex max-w-[14rem] items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-2 py-2 text-left text-xs text-gray-700 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:py-1"
      :aria-expanded="abierto"
      aria-haspopup="true"
      :aria-label="`${etiqueta}: ${resumen}`"
      data-test="filtro-multiple-boton"
      @click="abierto ? cerrar() : (abierto = true)"
    >
      <span class="truncate">{{ resumen }}</span>
      <i class="fas fa-chevron-down text-[9px] text-gray-400" aria-hidden="true"></i>
    </button>

    <div
      v-if="abierto"
      class="filtro-multiple__panel absolute top-full z-30 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-md border border-gray-200 bg-white py-1 shadow-lg"
      :class="panelALaDerecha ? 'right-0' : 'left-0'"
      role="group"
      :aria-label="etiqueta"
    >
      <button
        type="button"
        class="filtro-multiple__todas block w-full px-3 py-1.5 text-left text-xs font-medium text-emerald-700 hover:bg-gray-50"
        data-test="filtro-multiple-todas"
        @click="quitarTodas"
      >
        {{ textoTodas }}
      </button>
      <ul class="max-h-64 overflow-y-auto">
        <li
          v-for="opcion in opciones"
          :key="opcion.valor"
          class="filtro-multiple__opcion group flex items-center gap-2 px-3 py-1 hover:bg-gray-50"
        >
          <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              class="h-3.5 w-3.5 shrink-0 accent-emerald-600"
              :checked="seleccion.includes(opcion.valor)"
              data-test="filtro-multiple-opcion"
              @change="alternar(opcion.valor)"
            />
            <span class="truncate" :title="opcion.texto">{{ opcion.texto }}</span>
          </label>
          <button
            type="button"
            class="filtro-multiple__solo shrink-0 text-[11px] text-emerald-700 opacity-0 hover:underline focus:opacity-100 group-hover:opacity-100"
            :aria-label="`Solo ${opcion.texto}`"
            data-test="filtro-multiple-solo"
            @click="soloEsta(opcion.valor)"
          >
            Solo esta
          </button>
        </li>
        <li v-if="opciones.length === 0" class="px-3 py-1.5 text-xs text-gray-500">Sin opciones</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
@media (hover: none) {
  .filtro-multiple__solo {
    opacity: 1;
  }
}
</style>
