<script setup lang="ts">
/**
 * Aviso discreto de que la tabla se recorre con el teclado (composables/useNavegacionFilas). Solo en
 * pantallas con mouse, con los estilos `.aviso-teclado` de main.css, compartidos con las tarjetas.
 */
import { esMac } from '@/helpers/navegacionJerarquica';

defineProps<{
  /** Vista a la que sube Alt + ⌫. */
  regresarA: string;
}>();

const teclaAlt = esMac() ? '⌥' : 'Alt';
</script>

<template>
  <p class="aviso-teclado" data-test="aviso-teclado-tabla">
    <span class="aviso-teclado__teclas" aria-hidden="true">
      <kbd>↑</kbd><kbd>↓</kbd>
    </span>
    <span>para moverte</span>
    <span aria-hidden="true">·</span>
    <span class="aviso-teclado__teclas" aria-hidden="true">
      <kbd>Av Pág</kbd><kbd>Re Pág</kbd>
    </span>
    <span>para cambiar de página</span>
    <span aria-hidden="true">·</span>
    <kbd aria-hidden="true">A–Z</kbd>
    <span>para buscar</span>
    <span aria-hidden="true">·</span>
    <kbd aria-hidden="true">Enter</kbd>
    <span>para abrir el expediente</span>
    <span aria-hidden="true">·</span>
    <kbd aria-hidden="true">→</kbd>
    <span>para las acciones</span>
    <span aria-hidden="true">·</span>
    <span class="aviso-teclado__teclas" aria-hidden="true">
      <kbd>{{ teclaAlt }}</kbd><kbd>⌫</kbd>
    </span>
    <span>para regresar a {{ regresarA }}</span>
  </p>
</template>
