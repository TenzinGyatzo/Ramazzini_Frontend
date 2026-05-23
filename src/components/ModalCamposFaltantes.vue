<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue';
import type { CampoFaltante } from '@/helpers/validacionCampos';

const props = defineProps<{
  camposFaltantes: CampoFaltante[];
  tipoDocumento: string;
}>();

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

// Función para obtener el nombre del tipo de documento
const getTipoDocumentoNombre = (tipo: string) => {
  const nombres: Record<string, string> = {
    'antidoping': 'Antidoping',
    'aptitud': 'Aptitud Médica',
    'audiometria': 'Audiometría',
    'certificado': 'Certificado Médico',
    'certificadoExpedito': 'Certificado Médico Expédito',
    'examenVista': 'Examen de Vista',
    'exploracionFisica': 'Exploración Física',
    'historiaClinica': 'Historia Clínica',
    'notaMedica': 'Nota Médica',
    'controlPrenatal': 'Control Prenatal',
    'historiaOtologica': 'Historia Otológica',
    'previoEspirometria': 'Previo Espirometría'
  };
  return nombres[tipo] || tipo;
};

// Función para obtener el icono según el tipo de campo
const getIconoTipo = (tipo: string) => {
  const iconos: Record<string, string> = {
    'fecha': 'fa-calendar',
    'texto': 'fa-font',
    'numero': 'fa-hashtag',
    'seleccion': 'fa-list',
    'medida': 'fa-ruler',
    'lista': 'fa-list-ol',
    'booleano': 'fa-toggle-on',
    'general': 'fa-circle-exclamation',
    'hora': 'fa-clock'
  };
  return iconos[tipo] || 'fa-circle-exclamation';
};

// Función para obtener el color según el tipo de campo
const getColorTipo = (tipo: string) => {
  const colores: Record<string, string> = {
    'fecha': 'text-blue-600 bg-blue-50 border border-blue-200',
    'texto': 'text-green-600 bg-green-50 border border-green-200',
    'numero': 'text-purple-600 bg-purple-50 border border-purple-200',
    'seleccion': 'text-indigo-600 bg-indigo-50 border border-indigo-200',
    'medida': 'text-orange-600 bg-orange-50 border border-orange-200',
    'lista': 'text-teal-600 bg-teal-50 border border-teal-200',
    'booleano': 'text-amber-600 bg-amber-50 border border-amber-200',   
    'general': 'text-gray-600 bg-gray-50 border border-gray-200',
    'hora': 'text-yellow-600 bg-yellow-50 border border-yellow-200',
  };  
  return colores[tipo] || 'text-gray-600 bg-gray-50 border border-gray-200';
};
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" @click="emit('close')">
    <div class="bg-white rounded-2xl p-8 shadow-2xl max-w-lg w-full mx-4 transform transition-all duration-300 scale-100" @click.stop>
      <!-- Header con icono animado -->
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4 animate-pulse">
          <i class="fa-solid fa-exclamation-triangle text-2xl text-red-600"></i>
        </div>
        <h2 class="text-2xl font-bold text-gray-800 mb-2">
          Campos Requeridos Faltantes
        </h2>
        <p class="text-sm text-gray-600 mb-2">
          {{ getTipoDocumentoNombre(tipoDocumento) }}
        </p>
        <div class="w-16 h-1 bg-gradient-to-r from-red-400 to-pink-500 rounded-full mx-auto"></div>
      </div>

      <!-- Contenido -->
      <div class="mb-8">
        <p class="text-gray-600 text-lg leading-relaxed mb-6 text-center">
          Para continuar, necesitas completar los siguientes campos 
          <span class="font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-md">obligatorios</span>:
        </p>
        
        <!-- Lista de campos faltantes -->
        <div class="space-y-3 max-h-64 overflow-y-auto">
          <div 
            v-for="(campo, index) in camposFaltantes" 
            :key="index"
            class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200"
          >
            <!-- Icono del tipo de campo -->
            <div :class="`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getColorTipo(campo.tipo)}`">
              <i :class="`fa-solid ${getIconoTipo(campo.tipo)} text-sm`"></i>
            </div>
            
            <!-- Información del campo -->
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-800 truncate">
                {{ campo.nombre }}
              </p>
              <p v-if="campo.paso" class="text-xs text-gray-500">
                Paso {{ campo.paso }}
              </p>
            </div>
            
            <!-- Indicador de requerido -->
            <div class="flex-shrink-0">
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Requerido
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Botón mejorado -->
      <button
        class="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-red-200 active:scale-95"
        @click="emit('close')"
      >
        <span class="flex items-center justify-center gap-2">
          <i class="fa-solid fa-arrow-left"></i>
          Volver al Formulario
        </span>
      </button>

      <!-- Texto de ayuda adicional -->
      <p class="text-xs text-gray-400 text-center mt-4">
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
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3);
}

/* Scrollbar personalizado */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
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

