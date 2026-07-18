<script lang="ts" setup>
import axios from 'axios';
import { authRequestConfig } from '@/lib/attachAuthToken';
import { headClinicalFile } from '@/lib/clinicalFiles';
import { inject, ref, onMounted, onUnmounted } from 'vue';
import DocumentosAPI from '@/api/DocumentosAPI';
import { generarGraficaAudiometria } from '@/helpers/generarGraficaAudiometria';
import { generarGraficasIlc } from '@/helpers/generarGraficasIlc';

const toast: any = inject('toast');

const props = defineProps<{
  tipo: string
  empresaId: string
  trabajadorId: string
  documentoId: string
  userId: string
  getPdfMetadata: () => { ruta: string; nombre: string };
  pdfStatus?: string | null;
}>();

const emit = defineEmits(['regenerado', 'close']);

const isLoading = ref(false);

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

const esperarQuePDFEsteDisponible = async (relativePath: string, maxIntentos = 10, intervalo = 300) => {
  for (let intento = 0; intento < maxIntentos; intento++) {
    const disponible = await headClinicalFile(relativePath, {
      contentType: 'application/pdf',
      probe: 'regenerable',
    });
    if (disponible) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, intervalo));
  }
  return false;
};

const regenerar = async () => {
  if (props.pdfStatus === 'generating' || isLoading.value) {
    toast.open({
      message: 'El PDF aún se está generando. Espere un momento.',
      type: 'warning',
    });
    return;
  }

  try {
    isLoading.value = true;

    const apiEndpoint = `${import.meta.env.VITE_API_URL}/informes/${props.tipo}/${props.empresaId}/${props.trabajadorId}/${props.documentoId}/${props.userId}`;

    if (props.tipo === 'audiometria') {
      try {
        const response = await DocumentosAPI.getDocumentById(
          'audiometria',
          props.trabajadorId,
          props.documentoId,
        );
        const datosAudiometria = response.data;
        const graficaBase64 = generarGraficaAudiometria(datosAudiometria);
        await axios.post(apiEndpoint, { grafica: graficaBase64 }, authRequestConfig());
      } catch (error) {
        console.error('Error al obtener datos de audiometría:', error);
        await axios.get(apiEndpoint, authRequestConfig());
      }
    } else if (props.tipo === 'informeLongitudinalCardiometabolico') {
      try {
        const response = await DocumentosAPI.getDocumentById(
          'informeLongitudinalCardiometabolico',
          props.trabajadorId,
          props.documentoId,
        );
        const doc = response.data;
        const graficas = generarGraficasIlc(doc?.eventosConcentrados);
        try {
          await DocumentosAPI.updateDocument(
            'informeLongitudinalCardiometabolico',
            props.trabajadorId,
            props.documentoId,
            {
              ...graficas,
              idTrabajador: props.trabajadorId,
              fechaInformeLongitudinalCardiometabolico:
                doc.fechaInformeLongitudinalCardiometabolico,
              updatedBy: props.userId,
            },
          );
        } catch (persistError) {
          console.warn('No se pudieron persistir gráficas ILC al regenerar:', persistError);
        }
        await axios.post(apiEndpoint, graficas, authRequestConfig());
      } catch (error) {
        console.error('Error al regenerar gráficas ILC:', error);
        await axios.get(apiEndpoint, authRequestConfig());
      }
    } else {
      await axios.get(apiEndpoint, authRequestConfig());
    }

    const { ruta, nombre } = props.getPdfMetadata();
    const rutaCompleta = `${ruta}/${nombre}`.replace(/\/+/g, '/');
    const disponible = await esperarQuePDFEsteDisponible(rutaCompleta);
    if (!disponible) throw new Error('El PDF aún no está disponible.');

    toast.open({ message: 'El PDF ha sido regenerado correctamente.' });

    emit('regenerado');

    isLoading.value = false;
  } catch (error) {
    console.error('Error al regenerar el PDF:', error);
    toast.open({ message: 'No se pudo regenerar el PDF.', type: 'error' });
    isLoading.value = false;
  }
};

</script>

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

/* Mejora la transición de los botones */
button:active {
  transform: scale(0.98);
}

/* Efecto de focus mejorado */
button:focus {
  outline: none;
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

/* Animación personalizada para el spinner de carga */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" @click="emit('close')">
    <div class="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100" @click.stop>
      
      <!-- Modal para documento normal -->
      <template v-if="!isLoading && props.tipo != 'documentoexterno'">
        <!-- Header con icono animado -->
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4 animate-pulse">
            <i class="fa-solid fa-file-pdf text-2xl text-emerald-600"></i>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">
            Documento No Disponible
          </h2>
          <div class="w-16 h-1 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full mx-auto"></div>
        </div>

        <!-- Contenido -->
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

        <!-- Botones mejorados -->
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
      <template v-else-if="!isLoading && props.tipo == 'documentoexterno'">
        <!-- Header con icono animado -->
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-rose-100 rounded-full mb-4 animate-pulse">
            <i class="fa-solid fa-exclamation-triangle text-2xl text-rose-600"></i>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">
            Documento No Disponible
          </h2>
          <div class="w-16 h-1 bg-gradient-to-r from-rose-400 to-red-500 rounded-full mx-auto"></div>
        </div>

        <!-- Contenido -->
        <div class="text-center mb-8">
          <p class="text-gray-600 text-lg leading-relaxed mb-4">
            El documento externo no está disponible. Debes <span class="font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-md">eliminar este registro</span> y subirlo de nuevo.
          </p>
          <div class="flex items-center justify-center gap-2 text-sm text-gray-500">
            <i class="fa-solid fa-info-circle text-blue-500"></i>
            <span>Los documentos externos no se pueden regenerar</span>
          </div>
        </div>

        <!-- Botón mejorado -->
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

      <!-- Estado de carga -->
      <template v-else>
        <div class="text-center">
          <h2 class="text-2xl font-bold text-gray-800 mb-2">
            Regenerando Documento
          </h2>
          <div class="w-16 h-1 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full mx-auto mb-6"></div>
          
          <!-- Contenido de carga -->
          <div class="space-y-4">
            <div class="flex justify-center">
              <div class="relative">
                <div class="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
              </div>
            </div>
            <p class="text-gray-600 text-lg">Por favor espera mientras regeneramos tu documento...</p>
            <div class="flex items-center justify-center gap-2 text-sm text-gray-500">
              <i class="fa-solid fa-clock text-blue-500"></i>
              <span>Esto puede tomar unos segundos</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Texto de ayuda adicional -->
      <p class="text-xs text-gray-400 text-center mt-6">
        Presiona ESC o haz clic fuera del modal para cerrar
      </p>
    </div>
  </div>
</template>
