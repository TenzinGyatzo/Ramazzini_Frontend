<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

/**
 * Filtro de selección múltiple: un botón del tamaño de un desplegable que abre
 * interruptores, con buscador si son muchas opciones. Lo marcado se aplica al cerrar,
 * para que el tablero recargue una sola vez; «Solo esta» elige y cierra, como un
 * desplegable normal.
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

const OPCIONES_PARA_BUSCADOR = 8;

const abierto = ref(false);
const busqueda = ref('');
const seleccion = ref<string[]>([...props.modelValue]);
const raiz = ref<HTMLElement | null>(null);
const boton = ref<HTMLButtonElement | null>(null);
const buscador = ref<HTMLInputElement | null>(null);
let hayCambios = false;

watch(
  () => props.modelValue,
  (valor) => {
    hayCambios = false;
    seleccion.value = [...valor];
  },
);

const resumen = computed(() => {
  if (seleccion.value.length === 0) return props.textoTodas;
  if (seleccion.value.length > 1) return `${seleccion.value.length} opciones`;
  const [valor] = seleccion.value;
  return props.opciones.find((o) => o.valor === valor)?.texto ?? valor;
});

const conBuscador = computed(() => props.opciones.length >= OPCIONES_PARA_BUSCADOR);

const sinAcentos = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es');

const opcionesVisibles = computed(() => {
  const buscado = sinAcentos(busqueda.value.trim());
  if (!buscado) return props.opciones;
  return props.opciones.filter((o) => sinAcentos(o.texto).includes(buscado));
});

function aplicar() {
  hayCambios = false;
  emit('update:modelValue', [...seleccion.value]);
}

function alternar(valor: string) {
  seleccion.value = seleccion.value.includes(valor)
    ? seleccion.value.filter((v) => v !== valor)
    : [...seleccion.value, valor];
  hayCambios = true;
}

function elegirYCerrar(valores: string[]) {
  seleccion.value = valores;
  aplicar();
  abierto.value = false;
  boton.value?.focus();
}

async function abrir() {
  busqueda.value = '';
  abierto.value = true;
  await nextTick();
  buscador.value?.focus();
}

function cerrar() {
  if (hayCambios) aplicar();
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
  if (hayCambios) aplicar();
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
      @click="abierto ? cerrar() : abrir()"
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
      <div v-if="conBuscador" class="px-2 pb-1 pt-1">
        <input
          ref="buscador"
          v-model="busqueda"
          type="search"
          class="filtro-multiple__buscador w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:border-emerald-500 focus:outline-none"
          :placeholder="`Buscar ${etiqueta.toLowerCase()}`"
          :aria-label="`Buscar ${etiqueta.toLowerCase()}`"
          data-test="filtro-multiple-buscador"
        />
      </div>
      <button
        type="button"
        class="filtro-multiple__todas block w-full px-3 py-1.5 text-left text-xs font-medium text-emerald-700 hover:bg-gray-50"
        data-test="filtro-multiple-todas"
        @click="elegirYCerrar([])"
      >
        {{ textoTodas }}
      </button>
      <ul class="max-h-64 overflow-y-auto">
        <li
          v-for="opcion in opcionesVisibles"
          :key="opcion.valor"
          class="filtro-multiple__opcion group flex items-center gap-2 px-3 py-1 hover:bg-gray-50"
        >
          <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              role="switch"
              class="filtro-interruptor__casilla"
              :checked="seleccion.includes(opcion.valor)"
              data-test="filtro-multiple-opcion"
              @change="alternar(opcion.valor)"
            />
            <span class="filtro-interruptor" aria-hidden="true"></span>
            <span class="truncate" :title="opcion.texto">{{ opcion.texto }}</span>
          </label>
          <button
            type="button"
            class="filtro-multiple__solo shrink-0 text-[11px] text-emerald-700 opacity-0 hover:underline focus:opacity-100 group-hover:opacity-100"
            :aria-label="`Solo ${opcion.texto}`"
            data-test="filtro-multiple-solo"
            @click="elegirYCerrar([opcion.valor])"
          >
            Solo esta
          </button>
        </li>
        <li v-if="opcionesVisibles.length === 0" class="px-3 py-1.5 text-xs text-gray-500">Sin opciones</li>
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

/* Interruptor pequeño: la casilla real queda encima, invisible, y lleva el foco */
.filtro-interruptor__casilla {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}
.filtro-interruptor {
  position: relative;
  flex-shrink: 0;
  width: 1.5rem;
  height: 0.875rem;
  border-radius: 999px;
  background-color: #cbd5e1;
  transition: background-color 120ms ease;
}
.filtro-interruptor::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 999px;
  background-color: #fff;
  transition: transform 120ms ease;
}
.filtro-interruptor__casilla:checked + .filtro-interruptor {
  background-color: #059669;
}
.filtro-interruptor__casilla:checked + .filtro-interruptor::after {
  transform: translateX(0.625rem);
}
.filtro-interruptor__casilla:focus-visible + .filtro-interruptor {
  outline: 2px solid #10b981;
  outline-offset: 1px;
}
</style>
