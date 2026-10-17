<script setup lang="ts">
/**
 * Mientras el servidor revisa qué se eliminaría (empresa, centro o trabajador):
 * - El fondo cubre la pantalla desde el clic (respuesta inmediata y un segundo clic no hace nada).
 * - La tarjeta «Revisando…» solo aparece si la revisión tarda (ver useEliminacion).
 * Al terminar, la ventana siguiente aparece sobre este mismo fondo y este se quita sin animación,
 * así que el fondo no parpadea.
 */
defineProps<{
  /** Hay una revisión en curso: fondo puesto. */
  cubriendo: boolean;
  /** La revisión ya tardó: se muestra la tarjeta. */
  visible: boolean;
}>();
</script>

<template>
  <div v-if="cubriendo" class="relative z-[70]" role="status" aria-live="polite">
    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm" />
    <Transition name="fade">
      <div v-if="visible" class="fixed inset-0 z-10 flex items-center justify-center p-8">
        <div
          class="modal-eliminacion modal-inner flex items-center gap-3 rounded-lg bg-white px-5 py-4 text-left shadow-xl"
        >
          <i class="fas fa-spinner fa-spin text-xl text-gray-500" />
          <div>
            <p class="text-sm font-semibold text-gray-900">Revisando qué se va a eliminar…</p>
            <p class="text-sm text-gray-500">
              Puede tardar unos segundos si hay muchos documentos.
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active {
  transition: opacity 0.15s ease;
}
.fade-leave-active {
  transition: opacity 0.1s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
