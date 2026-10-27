<script setup lang="ts">
/**
 * Aviso discreto de que las tarjetas se recorren con el teclado (composables/useNavegacionTarjetas).
 * Solo en pantallas con mouse: en celulares y tabletas no hay flechas que usar.
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
  <p class="aviso-teclado-tarjetas" data-test="aviso-teclado">
    <span class="aviso-teclado-tarjetas__teclas" aria-hidden="true">
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
      <span class="aviso-teclado-tarjetas__teclas" aria-hidden="true">
        <kbd>{{ teclaAlt }}</kbd><kbd>⌫</kbd>
      </span>
      <span>para regresar a {{ regresarA }}</span>
    </template>
  </p>
</template>

<style scoped>
.aviso-teclado-tarjetas {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.375rem;
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.aviso-teclado-tarjetas__teclas {
  display: inline-flex;
  gap: 0.125rem;
}

kbd {
  display: inline-flex;
  min-width: 1.25rem;
  justify-content: center;
  padding: 0 0.3rem;
  border: 1px solid #d1d5db;
  border-bottom-width: 2px;
  border-radius: 0.3rem;
  background: #fff;
  font-family: inherit;
  font-size: 0.7rem;
  line-height: 1.1rem;
  color: #4b5563;
}

:global(html.dark-mode) .aviso-teclado-tarjetas {
  color: #94a3b8;
}

:global(html.dark-mode) kbd {
  border-color: #475569;
  background: #1e293b;
  color: #cbd5e1;
}

/* Sin mouse (celulares, tabletas) no hay flechas: el aviso sobra */
@media (hover: none), (pointer: coarse) {
  .aviso-teclado-tarjetas {
    display: none;
  }
}
</style>
