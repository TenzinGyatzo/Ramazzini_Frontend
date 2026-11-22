<script setup lang="ts">
/**
 * La tabla «INFORMACIÓN Y ESTUDIOS · FECHAS · RESUMEN Y/O ALTERACIONES ENCONTRADAS» de la
 * aptitud (punto 45). La usan el documento (con las evaluaciones adicionales al final, por el
 * espacio `filas-extra`) y la captura rápida, solo de lectura, antes de elegir la aptitud.
 */
import { textoFechaFila, type FilaEstudioAptitud } from '@/helpers/aptitudEstudios';

defineProps<{
  filas: FilaEstudioAptitud[];
  cargando?: boolean;
  /** Texto en lugar de las filas (p. ej., no se pudo consultar el expediente). */
  aviso?: string | null;
  /** Captura rápida: el nombre del estudio con letra más chica, para que quepa sin quitarle ancho al resumen. */
  estudioCompacto?: boolean;
}>();

const CELDA = 'text-xs sm:text-sm text-center px-2 py-0 border border-gray-300';
const CELDA_ESTUDIO_COMPACTA = 'text-xs leading-tight tracking-tight text-center px-1.5 py-0.5 border border-gray-300';
</script>

<template>
  <table class="tabla-resumen-estudios-aptitud table-auto w-full border-collapse border border-gray-200">
    <thead>
      <tr class="bg-gray-200">
        <th class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">INFORMACIÓN Y ESTUDIOS</th>
        <th class="w-1/7 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">FECHAS</th>
        <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">RESUMEN Y/O ALTERACIONES ENCONTRADAS</th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="cargando" data-cargando-documentos>
        <td colspan="3" class="text-xs sm:text-sm text-center px-2 py-1 border border-gray-300 text-gray-500 italic">
          Cargando los estudios del trabajador…
        </td>
      </tr>
      <tr v-else-if="aviso" data-aviso-estudios>
        <td colspan="3" class="text-xs sm:text-sm text-center px-2 py-1 border border-gray-300 text-gray-500 italic">
          {{ aviso }}
        </td>
      </tr>
      <tr
        v-for="fila in filas"
        :key="fila.clave"
        class="odd:bg-white even:bg-gray-50"
        :data-estudio="fila.clave"
        :data-audiometria-externa="fila.clave === 'audiometriaExterna' || undefined"
      >
        <td :class="[estudioCompacto ? CELDA_ESTUDIO_COMPACTA : CELDA, 'font-medium']">{{ fila.estudio }}</td>
        <td :class="CELDA">{{ textoFechaFila(fila) }}</td>
        <td :class="CELDA">{{ fila.resumen }}</td>
      </tr>
      <slot name="filas-extra" />
    </tbody>
  </table>
</template>

<style scoped>
.tabla-resumen-estudios-aptitud thead th:nth-child(2),
.tabla-resumen-estudios-aptitud tbody td:nth-child(2) {
  white-space: nowrap;
  word-break: normal;
  overflow-wrap: normal;
}
</style>
