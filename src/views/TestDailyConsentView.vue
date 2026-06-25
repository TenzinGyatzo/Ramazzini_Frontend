<script lang="ts" setup>
import { ref, computed } from 'vue';
import TreatmentConsentModal from '@/components/TreatmentConsentModal.vue';
import { useRegulatoryPolicy } from '@/composables/useRegulatoryPolicy';
import type { ConsentimientoCreated } from '@/types/consentimiento';

// Composables
const { dailyConsentEnabled } = useRegulatoryPolicy();

// Estado
const showModal = ref(false);
const trabajadorId = ref('');
const trabajadorNombre = ref('');

// Funciones
const openModal = () => {
  if (trabajadorId.value && trabajadorNombre.value) {
    showModal.value = true;
  }
};

const handleRegistered = (consent: ConsentimientoCreated) => {
  console.log('Consentimiento registrado:', consent);
  showModal.value = false;
  // Aquí se podría mostrar un toast de éxito
  alert(`Consentimiento registrado exitosamente para ${trabajadorNombre.value}`);
};

const handleCancel = () => {
  showModal.value = false;
};

// Validación
const canOpenModal = computed(() => {
  return trabajadorId.value.trim() !== '' && trabajadorNombre.value.trim() !== '';
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-2xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          Test: Consentimiento Diario
        </h1>
        <p class="text-gray-600">
          Vista de prueba para el modal de consentimiento diario (Slice C4)
        </p>
        
        <!-- Policy Status -->
        <div class="mt-4 p-4 rounded-lg" :class="dailyConsentEnabled ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'">
          <div class="flex items-center">
            <i :class="dailyConsentEnabled ? 'fa-solid fa-check-circle text-green-600' : 'fa-solid fa-times-circle text-red-600'" class="mr-2"></i>
            <span :class="dailyConsentEnabled ? 'text-green-800' : 'text-red-800'" class="font-medium">
              Consentimiento Diario: {{ dailyConsentEnabled ? 'HABILITADO (SIRES)' : 'DESHABILITADO (SIN_REGIMEN)' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Form -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          Datos de Prueba
        </h2>
        
        <div class="space-y-4">
          <div>
            <label for="trabajadorId" class="block text-sm font-medium text-gray-700 mb-1">
              ID del Trabajador *
            </label>
            <input
              id="trabajadorId"
              v-model="trabajadorId"
              type="text"
              placeholder="Ej: 507f1f77bcf86cd799439011"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label for="trabajadorNombre" class="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Trabajador *
            </label>
            <input
              id="trabajadorNombre"
              v-model="trabajadorNombre"
              type="text"
              placeholder="Ej: Juan Pérez García"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <!-- Botón para abrir modal -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <button
          type="button"
          class="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          :disabled="!canOpenModal || !dailyConsentEnabled"
          @click="openModal"
        >
          <span class="flex items-center justify-center gap-2">
            <i class="fa-solid fa-file-signature"></i>
            Abrir Modal de Consentimiento Diario
          </span>
        </button>

        <!-- Mensaje si policy no está habilitada -->
        <div v-if="!dailyConsentEnabled" class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p class="text-sm text-yellow-800">
            <i class="fa-solid fa-exclamation-triangle mr-2"></i>
            El consentimiento diario solo está disponible para proveedores con régimen SIRES (NOM-024).
          </p>
        </div>
      </div>

      <!-- Instrucciones -->
      <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-blue-900 mb-2">
          <i class="fa-solid fa-info-circle mr-2"></i>
          Instrucciones de Prueba
        </h3>
        <ul class="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Completa los campos de ID y Nombre del trabajador</li>
          <li>Haz clic en "Abrir Modal de Consentimiento Diario"</li>
          <li>Verifica que el modal sea bloqueante (no se cierra con ESC ni click fuera)</li>
          <li>Marca el checkbox para habilitar el botón de registro</li>
          <li>Selecciona un método de consentimiento (VERBAL es el default)</li>
          <li>Registra el consentimiento o cancela</li>
        </ul>
      </div>
    </div>

    <!-- Modal -->
    <TreatmentConsentModal
      v-if="dailyConsentEnabled"
      :trabajador-id="trabajadorId"
      :trabajador-nombre="trabajadorNombre"
      :open="showModal"
      @registered="handleRegistered"
      @cancel="handleCancel"
    />
  </div>
</template>

<style scoped>
/* Estilos adicionales si es necesario */
</style>
