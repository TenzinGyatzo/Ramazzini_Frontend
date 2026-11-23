<script setup lang="ts">
/**
 * Punto (60): palomita discreta junto a la etiqueta cuando el campo ya es válido (no solo
 * lleno). Aparece y desaparece con un desvanecido breve.
 */
defineProps<{ visible: boolean }>();
</script>

<template>
  <Transition name="palomita">
    <span v-if="visible" class="inline-flex shrink-0 items-center text-emerald-600" data-palomita>
      <i class="fa-solid fa-check text-sm" aria-hidden="true"></i>
      <span class="sr-only">Completo</span>
    </span>
  </Transition>
</template>

<style scoped>
.palomita-enter-active,
.palomita-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}
.palomita-enter-from,
.palomita-leave-to {
  opacity: 0;
  transform: scale(0.6);
}
@media (prefers-reduced-motion: reduce) {
  .palomita-enter-active,
  .palomita-leave-active {
    transition: none;
  }
}
</style>
