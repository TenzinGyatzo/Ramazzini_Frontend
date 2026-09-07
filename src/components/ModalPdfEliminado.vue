<script lang="ts" setup>
import { inject, onMounted, onUnmounted } from 'vue';

const toast: any = inject('toast');

const props = defineProps<{
  tipo: string
  pdfStatus?: string | null;
}>();

const emit = defineEmits(['iniciar', 'close']);

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    emit('close');
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});

const regenerar = () => {
  if (props.pdfStatus === 'generating') {
    toast.open({
      message: 'El PDF aún se está generando. Espere un momento.',
      type: 'warning',
    });
    return;
  }

  emit('iniciar');
  emit('close');
};

</script>

<style scoped>
@keyframes gentle-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

.animate-pulse {
  animation: gentle-pulse 2s ease-in-out infinite;
}

button:active {
  transform: scale(0.98);
}

button:focus {
  outline: none;
}
</style>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" @click="emit('close')">
    <div class="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100" @click.stop>
      
      <!-- Modal para documento normal -->
      <template v-if="props.tipo != 'documentoexterno'">
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4 animate-pulse">
            <i class="fa-solid fa-file-pdf text-2xl text-emerald-600"></i>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">
            Documento No Disponible
          </h2>
          <div class="w-16 h-1 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full mx-auto"></div>
        </div>

        <div class="text-center mb-8">
          <p class="text-gray-600 text-lg leading-relaxed mb-4">
            El documento fue <span class="font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">eliminado automáticamente</span> tras 
            <span class="font-medium text-emerald-600">1 mes</span> como parte de nuestro sistema de limpieza y optimización.
          </p>
          <div class="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
            <i class="fa-solid fa-info-circle text-blue-500"></i>
            <span>Puedes <span class="font-medium text-emerald-600">regenerarlo</span> haciendo clic en el botón de abajo.</span>
          </div>
        </div>

        <div class="flex flex-row gap-3">
          <button
            class="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-gray-200 active:scale-95"
            @click="emit('close')"
          >
            <span class="flex items-center justify-center gap-2">
              <i class="fa-solid fa-times"></i>
              Cerrar
            </span>
          </button>
          <button
            class="w-2/3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100"
            :disabled="pdfStatus === 'generating'"
            @click="regenerar"
          >
            <span class="flex items-center justify-center gap-2">
              <i class="fa-solid fa-sync-alt"></i>
              Regenerar
            </span>
          </button>
        </div>
      </template>

      <!-- Modal para documento externo -->
      <template v-else>
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-rose-100 rounded-full mb-4 animate-pulse">
            <i class="fa-solid fa-exclamation-triangle text-2xl text-rose-600"></i>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">
            Documento No Disponible
          </h2>
          <div class="w-16 h-1 bg-gradient-to-r from-rose-400 to-red-500 rounded-full mx-auto"></div>
        </div>

        <div class="text-center mb-8">
          <p class="text-gray-600 text-lg leading-relaxed mb-4">
            El documento externo no está disponible. Debes <span class="font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-md">eliminar este registro</span> y subirlo de nuevo.
          </p>
          <div class="flex items-center justify-center gap-2 text-sm text-gray-500">
            <i class="fa-solid fa-info-circle text-blue-500"></i>
            <span>Los documentos externos no se pueden regenerar</span>
          </div>
        </div>

        <button
          class="w-full bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-rose-200 active:scale-95"
          @click="emit('close')"
        >
          <span class="flex items-center justify-center gap-2">
            <i class="fa-solid fa-check"></i>
            Entendido
          </span>
        </button>
      </template>

      <p class="text-xs text-gray-400 text-center mt-6">
        Presiona ESC o haz clic fuera del modal para cerrar
      </p>
    </div>
  </div>
</template>
