<script setup lang="ts">
/**
 * Aviso discreto de que las tarjetas se recorren con el teclado (composables/useNavegacionTarjetas).
 * Solo en pantallas con mouse: en celulares y tabletas no hay flechas que usar (estilos
 * `.aviso-teclado` en main.css, compartidos con Inicio).
 */
import { esMac } from '@/helpers/navegacionJerarquica';

defineProps<{
  /** «la empresa», «el centro de trabajo». */
  elemento: string;
  /** Vista a la que sube Alt + ⌫ («Inicio», «Empresas»). */
  regresarA?: string;
}>();

const teclaAlt = esMac() ? '⌥' : 'Alt';
</script>

<template>
  <p class="aviso-teclado" data-test="aviso-teclado">
    <span class="aviso-teclado__teclas" aria-hidden="true">
      <kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd>
    </span>
    <span>para moverte</span>
    <span aria-hidden="true">·</span>
    <kbd aria-hidden="true">A–Z</kbd>
    <span>para saltar por nombre</span>
    <span aria-hidden="true">·</span>
    <kbd aria-hidden="true">Enter</kbd>
    <span>para abrir {{ elemento }}</span>
    <template v-if="regresarA">
      <span aria-hidden="true">·</span>
      <span class="aviso-teclado__teclas" aria-hidden="true">
        <kbd>{{ teclaAlt }}</kbd><kbd>⌫</kbd>
      </span>
      <span>para regresar a {{ regresarA }}</span>
    </template>
  </p>
</template>
