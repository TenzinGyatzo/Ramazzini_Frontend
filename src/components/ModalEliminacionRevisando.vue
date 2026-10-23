<script setup lang="ts">
/**
 * Aviso mientras el servidor revisa qué se eliminaría (empresa, centro o trabajador). Aparece
 * en el instante del clic, sin animación, y cubre la pantalla para que un segundo clic no haga
 * nada. Al terminar, la ventana siguiente aparece sobre este mismo fondo y el aviso se quita sin
 * animación (ver `pasoDirecto` en useEliminacion), así que el fondo no parpadea.
 */
defineProps<{ visible: boolean }>();
</script>

<template>
  <div v-if="visible" class="relative z-[70]" role="status" aria-live="polite">
    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm" />
    <div class="fixed inset-0 z-10 flex items-center justify-center p-8">
      <div
        class="modal-eliminacion modal-inner flex items-center gap-3 rounded-lg bg-white px-5 py-4 text-left shadow-xl max-h-[calc(100dvh-2rem)] overflow-y-auto"
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
</template>
