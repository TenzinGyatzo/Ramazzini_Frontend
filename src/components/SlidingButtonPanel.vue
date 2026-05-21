<script setup>
import { ref, watch } from "vue";
import axios from "axios";
import { useTrabajadoresStore } from "@/stores/trabajadores";
import ModalFaltanPdfs from "./ModalFaltanPdfs.vue";

const trabajadores = useTrabajadoresStore();

const mostrarModalFaltanPdfs = ref(false);
const loading = ref(false);

const today = new Date();

const documentOrder = {
  "Nota Aclaratoria": 1,
  "Constancia de Aptitud": 2,
  Aptitud: 3,
  "Historia Clinica": 4,
  "Exploracion Fisica": 5,
  "Examen Vista": 6,
  "Historia Otologica": 7,
  Audiometria: 8,
  Antidoping: 9,
  Certificado: 10,
  "Previo Espirometria": 11,
  "Documento Externo": 12,
  "Nota Medica": 13,
  "Lesion": 14,
  "Control Prenatal": 15,
  "Certificado Expedito": 16,
  "Receta": 17,
  "Entrevista Psicologica": 18,
  "Trastornos Estado Animo": 19,
  "Cuestionario Prodromal Breve": 20,
  "Trastorno Limite Personalidad": 21,
  "Evento Seguimiento Cardiometabolico": 22,
  "Informe Longitudinal Cardiometabolico": 23,
};

// Importante: verificar tipos más específicos ANTES que los genéricos (ej. Certificado Expedito antes de Certificado)
const getDocumentType = (route) => {
  if (route.includes("Nota Aclaratoria")) return "Nota Aclaratoria";
  if (route.includes("Constancia de Aptitud")) return "Constancia de Aptitud";
  if (route.includes("Aptitud")) return "Aptitud";
  if (route.includes("Historia Clinica")) return "Historia Clinica";
  if (route.includes("Exploracion Fisica")) return "Exploracion Fisica";
  if (route.includes("Examen Vista")) return "Examen Vista";
  if (route.includes("Historia Otologica")) return "Historia Otologica";
  if (route.includes("Audiometria")) return "Audiometria";
  if (route.includes("Antidoping")) return "Antidoping";
  if (route.includes("Certificado Expedito")) return "Certificado Expedito";
  if (route.includes("Certificado")) return "Certificado";
  if (route.includes("Previo Espirometria")) return "Previo Espirometria";
  if (route.includes("Nota Medica")) return "Nota Medica";
  if (route.includes("Lesion")) return "Lesion";
  if (route.includes("Control Prenatal")) return "Control Prenatal";
  if (route.includes("Receta")) return "Receta";
  if (route.includes("Entrevista Psicologica")) return "Entrevista Psicologica";
  if (route.includes("Trastornos Estado Animo")) return "Trastornos Estado Animo";
  if (route.includes("Cuestionario Prodromal Breve")) return "Cuestionario Prodromal Breve";
  if (route.includes("Trastorno Limite Personalidad")) return "Trastorno Limite Personalidad";
  if (route.includes("Evento Seguimiento Cardiometabolico")) return "Evento Seguimiento Cardiometabolico";
  if (route.includes("Informe Longitudinal Cardiometabolico")) return "Informe Longitudinal Cardiometabolico";
  return "Documento Externo"; // Para cualquier otro caso
};

// Props
const props = defineProps({
  selectedRoutes: {
    type: Array,
    required: true,
  },
});

const isVisible = ref(true);

// Watch para ocultar el panel cuando se limpian las rutas seleccionadas
watch(
  () => props.selectedRoutes.length,
  (newLength) => {
    if (newLength === 0) {
      isVisible.value = false;
    } else {
      isVisible.value = true;
    }
  },
  { immediate: true }
);

const handleClick = async () => {
  if (loading.value) return;
  loading.value = true;
  // Ordenar las rutas seleccionadas
  const orderedRoutes = props.selectedRoutes.sort((a, b) => {
    const aType = getDocumentType(a);
    const bType = getDocumentType(b);
    return (
      (documentOrder[aType] || Infinity) - (documentOrder[bType] || Infinity)
    );
  });
  try {
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/document-merger/merge`,
      { filePaths: orderedRoutes },
      { responseType: 'blob' }
    );
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${
      [trabajadores.currentTrabajador.primerApellido, trabajadores.currentTrabajador.segundoApellido, trabajadores.currentTrabajador.nombre]
        .filter(Boolean)
        .join(' ')
    } ${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error al enviar las rutas al backend:', error);
    mostrarModalFaltanPdfs.value = true;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <transition name="fade">
    <ModalFaltanPdfs
      v-if="mostrarModalFaltanPdfs"
      @close="mostrarModalFaltanPdfs = false"
    />
  </transition>

  <Transition name="slide-down" appear mode="out-in">
    <div
      v-if="isVisible"
      class="sliding-download-panel fixed -top-3 transform h-[13.5vh] md:h-[12vh] w-[64vw] sm:w-[60vw] md:w-[40vw] lg:w-[30vw] xl:w-[30vw] 2xl:w-[20vw] bg-gradient-to-r from-green-500 via-emerald-600 to-emerald-500 flex justify-center items-center rounded-xl shadow-xl z-10"
    >
      <button
        @click="handleClick"
        :disabled="loading"
        class="sliding-download-button relative px-6 py-3 bg-gradient-to-r from-white to-gray-100 font-semibold text-gray-700 rounded-full shadow-md hover:from-gray-200 hover:to-gray-300 hover:text-gray-900 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span class="flex items-center space-x-2">
          <svg
            v-if="!loading"
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 17l-4 4m0 0l-4-4m4 4V3"
            />
          </svg>
          <svg v-else class="animate-spin h-5 w-5 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <span class="text-sm sm:text-base md:text-lg lg:text-lg">
            {{ loading ? 'Procesando...' : 'Combinar y descargar' }}
          </span>
        </span>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.slide-down-enter-active {
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
}
.slide-down-enter-from {
  transform: translateY(-100px);
  opacity: 0;
}
.slide-down-enter-to {
  transform: translateY(0);
  opacity: 1;
}
.slide-down-leave-active {
  transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
}
.slide-down-leave-to {
  transform: translateY(-100px);
  opacity: 0;
}
</style>

<style>
html.dark-mode .sliding-download-panel {
  background-image: linear-gradient(to right, #065f46, #047857, #059669) !important;
  box-shadow: 0 16px 36px rgba(2, 6, 23, 0.65) !important;
}

html.dark-mode .sliding-download-button {
  background-image: linear-gradient(to right, #1e293b, #334155) !important;
  color: #e2e8f0 !important;
}

html.dark-mode .sliding-download-button:hover {
  background-image: linear-gradient(to right, #334155, #475569) !important;
  color: #f8fafc !important;
}

html.dark-mode .sliding-download-button:focus-visible {
  box-shadow: 0 0 0 2px #34d399 !important;
}
</style>

