<script setup>
// Una casilla de permiso con su explicación. Bloqueada: candado y motivo, sin poder cambiarla.
defineProps({
  modelValue: { type: Boolean, default: false },
  titulo: { type: String, required: true },
  descripcion: { type: String, default: '' },
  icono: { type: String, default: '' },
  /** Motivo por el que no se puede otorgar; la casilla queda bloqueada. */
  bloqueo: { type: String, default: null },
  /** Deshabilitada por depender de otro permiso (sin candado). */
  deshabilitada: { type: Boolean, default: false },
  indeterminada: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);
</script>

<template>
  <label
    :class="[
      'fila-permiso flex items-start gap-3 rounded-lg px-3 py-2.5',
      bloqueo || deshabilitada ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50',
    ]"
  >
    <input
      type="checkbox"
      class="mt-0.5 w-4 h-4 shrink-0 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
      :checked="!bloqueo && modelValue"
      :indeterminate="!bloqueo && indeterminada"
      :disabled="!!bloqueo || deshabilitada"
      @change="emit('update:modelValue', $event.target.checked)"
    >
    <i v-if="icono" :class="[icono, 'mt-0.5 w-4 text-center text-sm', bloqueo || deshabilitada ? 'text-gray-400' : 'text-gray-600']"></i>
    <span class="min-w-0 flex-1">
      <span :class="['block text-sm leading-snug', bloqueo || deshabilitada ? 'text-gray-500' : 'text-gray-800 font-medium']">
        {{ titulo }}
      </span>
      <span v-if="descripcion" class="block text-xs text-gray-500 leading-snug mt-0.5">{{ descripcion }}</span>
      <span v-if="bloqueo" class="fila-permiso-bloqueo mt-1 inline-flex items-center gap-1 text-xs text-gray-500">
        <i class="fas fa-lock text-[10px]"></i>
        {{ bloqueo }}
      </span>
    </span>
  </label>
</template>
