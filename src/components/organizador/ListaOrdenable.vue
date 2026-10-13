<script setup lang="ts">
/**
 * Lista que se reordena arrastrando (SortableJS), también con el dedo. No cambia nada por
 * sí misma: al soltar deshace el movimiento en el DOM y avisa a quién se movió y adónde,
 * para que el dueño de los datos los actualice y Vue vuelva a pintar.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Sortable from 'sortablejs';

export interface MovimientoEnLista {
  /** Elemento que se arrastró. */
  elemento: HTMLElement;
  /** Identificador de la lista donde se soltó. */
  hacia: string;
  /** Posición entre los elementos arrastrables de esa lista. */
  indice: number;
}

const props = withDefaults(
  defineProps<{
    /** Identificador de esta lista; llega en `hacia` cuando se suelta algo en ella. */
    contenedor?: string;
    /** Clase que distingue a los elementos que esta lista acepta; sin ella acepta todos. */
    acepta?: string;
    bloqueada?: boolean;
  }>(),
  { contenedor: '', acepta: '', bloqueada: false },
);

const emit = defineEmits<{ mover: [movimiento: MovimientoEnLista] }>();

const raiz = ref<HTMLElement | null>(null);
let sortable: Sortable | null = null;
let siguienteAlEmpezar: Node | null = null;

onMounted(() => {
  if (!raiz.value) return;
  sortable = new Sortable(raiz.value, {
    group: {
      name: 'organizador-expediente',
      put: (_destino, _origen, elemento) => !props.acepta || elemento.classList.contains(props.acepta),
    },
    draggable: '.organizador__item',
    // Los controles de cada fila se usan, no arrastran
    filter: 'button, select, input',
    preventOnFilter: false,
    animation: 160,
    // Mismo arrastre en ratón y en pantalla táctil; en táctil hay que mantener presionado
    forceFallback: true,
    fallbackOnBody: true,
    fallbackTolerance: 4,
    delay: 180,
    delayOnTouchOnly: true,
    touchStartThreshold: 6,
    scroll: true,
    bubbleScroll: true,
    scrollSensitivity: 80,
    ghostClass: 'organizador__hueco',
    chosenClass: 'organizador__elegido',
    dragClass: 'organizador__en-el-aire',
    disabled: props.bloqueada,
    onStart: (evento) => {
      siguienteAlEmpezar = evento.item.nextSibling;
    },
    onEnd: (evento) => {
      const { item, from, to } = evento;
      // Vue es quien pinta: el elemento vuelve a su sitio y el cambio se hace en los datos
      from.insertBefore(item, siguienteAlEmpezar);
      siguienteAlEmpezar = null;
      const indice = evento.newDraggableIndex;
      if (indice === undefined || (from === to && evento.oldDraggableIndex === indice)) return;
      emit('mover', { elemento: item, hacia: to.dataset.contenedor ?? '', indice });
    },
  });
});

watch(
  () => props.bloqueada,
  (bloqueada) => sortable?.option('disabled', bloqueada),
);

onBeforeUnmount(() => {
  sortable?.destroy();
  sortable = null;
});
</script>

<template>
  <div ref="raiz" :data-contenedor="contenedor">
    <slot />
  </div>
</template>
