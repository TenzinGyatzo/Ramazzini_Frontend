<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue';

const emit = defineEmits(['close']);

// Función para manejar la tecla ESC
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    emit('close');
  }
};

// Agregar y remover event listener
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" @click="emit('close')">
    <div class="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100" @click.stop>
      <!-- Header con icono animado -->
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4 animate-pulse">
          <i class="fa-solid fa-file-pdf text-2xl text-amber-600"></i>
        </div>
        <h2 class="text-2xl font-bold text-gray-800 mb-2">
          Documentos Pendientes
        </h2>
        <div class="w-16 h-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full mx-auto"></div>
      </div>

      <!-- Contenido -->
      <div class="text-center mb-8">
        <p class="text-gray-600 text-lg leading-relaxed mb-4">
          Faltan uno o más documentos seleccionados. Por favor 
          <span class="font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md dark:text-amber-200 dark:bg-amber-900/40">regenera los PDFs</span> 
          antes de continuar.
        </p>
        <div class="flex items-center justify-center gap-2 text-sm text-gray-500">
          <i class="fa-solid fa-info-circle text-blue-500"></i>
          <span>Los documentos deben estar disponibles para continuar</span>
        </div>
      </div>

      <!-- Botón mejorado -->
      <button
        class="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-amber-200 active:scale-95"
        @click="emit('close')"
      >
        <span class="flex items-center justify-center gap-2">
          <i class="fa-solid fa-check"></i>
          Entendido
        </span>
      </button>

      <!-- Texto de ayuda adicional -->
      <p class="text-xs text-gray-400 text-center mt-6">
        Presiona ESC o haz clic fuera del modal para cerrar
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Animación personalizada para el icono */
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

/* Mejora la transición del botón */
button:active {
  transform: scale(0.98);
}

/* Efecto de focus mejorado */
button:focus {
  outline: none;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.3);
}

/* Animación de entrada para el modal */
.modal-enter-active {
  transition: all 0.3s ease-out;
}

.modal-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(-20px);
}

.modal-enter-to {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.modal-leave-active {
  transition: all 0.2s ease-in;
}

.modal-leave-from {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.modal-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-20px);
}
</style>

