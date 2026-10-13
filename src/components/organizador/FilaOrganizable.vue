<script setup lang="ts">
/** Un documento en el modo organizar: una sola línea con lo necesario para reconocerlo y moverlo. */
import { computed } from 'vue';
import { convertirFechaISOaDDMMYYYY } from '@/helpers/dates';
import { iconoTipoDocumento } from '@/helpers/iconoTipoDocumento';
import {
  nombreTipoDocumento,
  type DocumentoDelExpediente,
  type SubgrupoDelAnio,
} from '@/helpers/documentosExpediente';
import { NOMBRE_SUBGRUPO_POR_DEFECTO } from '@/helpers/organizarExpediente';

const props = defineProps<{
  item: DocumentoDelExpediente;
  /** Subgrupo al que pertenece; `null` si va suelto. */
  subgrupoId: string | null;
  /** Subgrupos del año, para el selector. */
  subgrupos: SubgrupoDelAnio[];
  puedeSubir: boolean;
  puedeBajar: boolean;
  bloqueada: boolean;
}>();

const emit = defineEmits<{
  mover: [paso: -1 | 1];
  cambiarSubgrupo: [subgrupoId: string | null];
}>();

const icono = computed(() => iconoTipoDocumento(props.item.definicion.tipo));

// Un documento externo se reconoce por el nombre con que se subió
const nombre = computed(() => {
  const { definicion, documento } = props.item;
  return definicion.tipo === 'documentoExterno'
    ? documento.nombreDocumento || nombreTipoDocumento(definicion.tipo)
    : nombreTipoDocumento(definicion.tipo);
});

const fecha = computed(() => {
  const valor = props.item.documento[props.item.definicion.campoFecha];
  return valor ? convertirFechaISOaDDMMYYYY(valor) : '';
});
</script>

<template>
  <div
    class="organizador__item organizador__documento grupo-documentos__fila grupo-documentos__fila--compacta flex flex-wrap items-center gap-x-2 gap-y-1 px-2 sm:px-3 py-1.5 border-b border-gray-100 bg-white hover:bg-gray-50 cursor-grab"
    :class="{ 'grupo-documentos__fila--en-subgrupo': !!subgrupoId }"
    :data-documento="item.documento._id"
  >
    <span class="flex items-center justify-center h-7 w-5 text-gray-400" aria-hidden="true">
      <i class="fas fa-grip-vertical"></i>
    </span>
    <button
      type="button"
      class="grupo-documentos__flecha h-7 w-7 rounded-md text-gray-500 hover:bg-gray-200 hover:text-emerald-700 disabled:opacity-30 disabled:hover:bg-transparent"
      :disabled="!puedeSubir || bloqueada"
      title="Subir"
      aria-label="Subir documento"
      @click="emit('mover', -1)"
    >
      <i class="fas fa-arrow-up text-xs" aria-hidden="true"></i>
    </button>
    <button
      type="button"
      class="grupo-documentos__flecha h-7 w-7 rounded-md text-gray-500 hover:bg-gray-200 hover:text-emerald-700 disabled:opacity-30 disabled:hover:bg-transparent"
      :disabled="!puedeBajar || bloqueada"
      title="Bajar"
      aria-label="Bajar documento"
      @click="emit('mover', 1)"
    >
      <i class="fas fa-arrow-down text-xs" aria-hidden="true"></i>
    </button>
    <span
      class="shrink-0 w-7 h-7 ml-1 rounded-md flex items-center justify-center text-sm"
      :class="icono.clases"
      aria-hidden="true"
    >
      <i :class="icono.icono"></i>
    </span>
    <!-- En pantallas angostas el nombre conserva su ancho y el selector baja a otro renglón -->
    <span class="flex flex-1 min-w-[9rem] flex-col sm:flex-row sm:items-baseline sm:gap-2">
      <span class="text-sm font-medium text-gray-800 truncate">{{ nombre }}</span>
      <span class="text-xs text-gray-500 whitespace-nowrap">{{ fecha }}</span>
    </span>
    <label
      v-if="subgrupos.length > 0"
      class="flex items-center gap-1.5 ml-auto text-xs text-gray-500"
      title="Subgrupo de este documento"
    >
      <i class="fas fa-folder text-amber-500" aria-hidden="true"></i>
      <select
        class="grupo-documentos__selector-subgrupo max-w-[14rem] rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700"
        :value="subgrupoId ?? ''"
        :disabled="bloqueada"
        aria-label="Subgrupo de este documento"
        @change="emit('cambiarSubgrupo', ($event.target as HTMLSelectElement).value || null)"
      >
        <option value="">Sin subgrupo</option>
        <option v-for="subgrupo in subgrupos" :key="subgrupo.id" :value="subgrupo.id">
          {{ subgrupo.nombre.trim() || NOMBRE_SUBGRUPO_POR_DEFECTO }}
        </option>
      </select>
    </label>
  </div>
</template>

<style scoped>
/* Documentos que pertenecen a un subgrupo: van con sangría */
.grupo-documentos__fila--en-subgrupo {
  margin-left: 0.5rem;
}

@media (min-width: 640px) {
  .grupo-documentos__fila--en-subgrupo {
    margin-left: 1rem;
  }
}
</style>
