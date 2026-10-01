<script setup lang="ts">
/**
 * Aviso mientras el servidor revisa qué se eliminaría (empresa, centro o trabajador).
 * Cubre la pantalla para que un segundo clic no haga nada; al terminar, lo reemplaza la
 * confirmación o la ventana de «no se puede eliminar».
 */
defineProps<{ visible: boolean }>();
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="relative z-[70]" role="status" aria-live="polite">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm" />
      <div class="fixed inset-0 z-10 flex items-center justify-center p-8">
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
    </div>
  </Transition>
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
