<script setup>
defineProps({
  items: {
    type: Array,
    required: true,
  },
  mensajeVacio: {
    type: String,
    default: '',
  },
});

function claseNodo(tipo) {
  const base =
    'shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold border shadow-sm';
  switch (tipo) {
    case 'control_realizado':
      return `${base} bg-teal-50 text-teal-800 border-teal-200/80`;
    case 'no_asistio':
      return `${base} bg-red-50 text-red-700 border-red-200/70`;
    case 'cancelada':
      return `${base} bg-slate-100 text-slate-600 border-slate-200/90`;
    case 'reprogramada':
      return `${base} bg-amber-50 text-amber-900 border-amber-200/80`;
    default:
      return `${base} bg-slate-50 text-slate-600 border-slate-200`;
  }
}

function simbolo(tipo) {
  switch (tipo) {
    case 'control_realizado':
      return '●';
    case 'no_asistio':
      return '✕';
    case 'cancelada':
      return '○';
    case 'reprogramada':
      return '↻';
    default:
      return '•';
  }
}
</script>

<template>
  <div
    v-if="items.length"
    class="w-full flex flex-wrap items-center content-start gap-y-4 pb-1 min-w-0"
    role="list"
    aria-label="Línea de tiempo de seguimiento"
  >
    <template v-for="(it, idx) in items" :key="`${it.tipo}-${it.fechaOrden}-${idx}`">
      <div class="flex items-center shrink-0 max-w-full" role="listitem">
        <span
          v-if="idx > 0"
          class="inline-flex items-center justify-center text-slate-500 select-none px-0.5 sm:px-1 antialiased"
          aria-hidden="true"
        >
          <span class="text-[17px] sm:text-lg font-medium leading-none tracking-tight">→</span>
        </span>
        <div
          class="flex flex-col items-center gap-1 w-[72px] sm:w-[80px] min-w-[68px] text-center px-0.5"
        >
          <span :class="claseNodo(it.tipo)" :aria-label="`${it.etiqueta} ${it.fechaTexto}`">
            {{ simbolo(it.tipo) }}
          </span>
          <span class="text-[9px] font-medium text-slate-700 leading-tight line-clamp-2">
            {{ it.etiqueta }}
          </span>
          <span class="text-[9px] text-slate-500 tabular-nums leading-none">{{ it.fechaTexto }}</span>
          <span
            v-if="it.detalle"
            class="text-[8px] text-slate-400 leading-tight line-clamp-2 px-0.5"
          >
            {{ it.detalle }}
          </span>
        </div>
      </div>
    </template>
  </div>
  <p v-else-if="mensajeVacio" class="text-xs text-slate-500 italic py-1">
    {{ mensajeVacio }}
  </p>
</template>
