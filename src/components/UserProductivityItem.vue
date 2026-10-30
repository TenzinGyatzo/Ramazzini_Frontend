<script setup>
import { computed } from "vue";
import {
  COLUMNAS_DOCUMENTOS,
  fechaCorta,
  textoDeDiferencia,
  tiempoTranscurrido,
} from "@/helpers/productividadTabla";

const props = defineProps({
  usuario: {
    type: Object,
    required: true
  },
  mostrarPuntos: {
    type: Boolean,
    default: true
  },
  mostrarCambio: {
    type: Boolean,
    default: false
  },
  mostrarProveedor: {
    type: Boolean,
    default: false
  }
});

defineEmits(['ver-detalles']);

const ultimoInforme = computed(() => props.usuario.productividad?.ultimoInforme);
</script>

<template>
  <tr class="cursor-pointer hover:bg-gray-50 transition-colors" @click="$emit('ver-detalles', usuario)">
    <!-- Usuario -->
    <td class="px-3 py-2 whitespace-nowrap">
      <button
        type="button"
        class="block max-w-[190px] text-left"
        :aria-label="`Ver detalle de ${usuario.username}`"
        @click.stop="$emit('ver-detalles', usuario)"
      >
        <span class="block truncate text-sm font-medium text-gray-900">{{ usuario.username }}</span>
        <span class="block truncate text-xs text-gray-500" :title="usuario.email">{{ usuario.role }}</span>
      </button>
    </td>

    <!-- Puntos -->
    <td v-if="mostrarPuntos" class="px-2 py-2 whitespace-nowrap text-center text-sm font-bold text-gray-900">
      {{ usuario.puntuacion }}
    </td>

    <!-- Documentos por tipo -->
    <td
      v-for="columna in COLUMNAS_DOCUMENTOS"
      :key="columna.clave"
      class="px-2 py-2 whitespace-nowrap text-center text-sm"
      :class="usuario.productividad?.[columna.clave] ? 'font-medium text-gray-900' : 'text-gray-400'"
    >
      {{ usuario.productividad?.[columna.clave] || 0 }}
    </td>

    <!-- Total -->
    <td class="px-2 py-2 whitespace-nowrap text-center text-sm font-bold text-gray-900">
      {{ usuario.productividad?.totalDocumentos || 0 }}
    </td>

    <!-- Contra el periodo anterior -->
    <td
      v-if="mostrarCambio"
      class="px-2 py-2 whitespace-nowrap text-center text-xs font-medium"
      :class="{
        'text-emerald-600': usuario.diferencia > 0,
        'text-rose-600': usuario.diferencia < 0,
        'text-gray-500': !usuario.diferencia
      }"
    >
      {{ textoDeDiferencia(usuario.diferencia) }}
    </td>

    <!-- Último informe -->
    <td class="px-3 py-2 whitespace-nowrap">
      <div class="text-xs font-medium text-gray-900">{{ ultimoInforme ? fechaCorta(ultimoInforme) : 'N/A' }}</div>
      <div class="text-xs text-gray-500">{{ tiempoTranscurrido(ultimoInforme) }}</div>
    </td>

    <!-- Proveedor (solo para administradores) -->
    <td v-if="mostrarProveedor" class="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-600">
      {{ usuario.proveedorNombre || 'Sin proveedor' }}
    </td>
  </tr>
</template>
