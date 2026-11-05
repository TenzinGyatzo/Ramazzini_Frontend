<script setup>
import { computed, ref } from 'vue';
import { claseInput } from './estilos';

/** Lista cerrada con buscador: escribir filtra; un clic elige. */
const props = defineProps({
  opciones: { type: Array, required: true },
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Buscar…' },
});
const emit = defineEmits(['update:modelValue']);

const busqueda = ref('');

/** Sin acentos ni mayúsculas, para que «oido» encuentre «Oído». */
const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const filtradas = computed(() => {
  const termino = normalizar(busqueda.value.trim());
  return termino ? props.opciones.filter((o) => normalizar(o.etiqueta).includes(termino)) : props.opciones;
});

const elegir = (clave) => {
  emit('update:modelValue', clave);
  busqueda.value = '';
};
</script>

<template>
  <div>
    <input
      v-model="busqueda"
      type="search"
      :placeholder="placeholder"
      :class="claseInput"
      data-buscador
      @keydown.enter.prevent="filtradas.length === 1 && elegir(filtradas[0].clave)"
    />
    <ul class="mt-2 max-h-56 overflow-y-auto rounded-lg border border-gray-200" role="listbox">
      <li
        v-for="opcion in filtradas"
        :key="opcion.clave"
        role="option"
        :aria-selected="modelValue === opcion.clave"
        :data-opcion="opcion.clave"
        class="cursor-pointer px-3 py-1.5 text-sm"
        :class="
          modelValue === opcion.clave
            ? 'bg-emerald-50 font-medium text-emerald-800'
            : 'text-gray-700 hover:bg-gray-50'
        "
        @click="elegir(opcion.clave)"
      >
        <i v-if="modelValue === opcion.clave" class="fas fa-check mr-1 text-emerald-600" aria-hidden="true"></i>
        {{ opcion.etiqueta }}
      </li>
      <li v-if="!filtradas.length" class="px-3 py-2 text-sm italic text-gray-500">Sin coincidencias</li>
    </ul>
  </div>
</template>
