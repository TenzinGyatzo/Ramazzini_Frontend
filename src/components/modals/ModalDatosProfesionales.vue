<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { getFirmanteRouteNameByRole } from '@/composables/useProfessionalDataValidation';

const props = defineProps({
  missingFields: {
    type: Array,
    default: () => []
  },
  routeName: {
    type: String,
    default: ''
  },
  firmanteTypeLabel: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['closeModal', 'navigateToConfig']);
const router = useRouter();
const { currentUser } = useCurrentUser();

const closeModal = () => {
  emit('closeModal');
};

const targetRouteName = computed(() => {
  return getFirmanteRouteNameByRole(currentUser.value?.role) || props.routeName;
});

const goToConfiguration = async () => {
  const routeName = targetRouteName.value;
  if (!routeName) return;

  emit('navigateToConfig');
  closeModal();
  await router.push({ name: routeName });
};

const fieldLabels = {
  nombre: 'Nombre(s)',
  primerApellido: 'Primer Apellido',
  segundoApellido: 'Segundo Apellido',
  tituloProfesional: 'Título Profesional',
  numeroCedulaProfesional: 'Cédula/Registro Profesional'
};

const missingFieldsLabels = computed(() => {
  return props.missingFields.map(field => fieldLabels[field] || field);
});
</script>

<template>
  <div class="modal fixed top-0 left-0 z-[100] p-4 sm:p-8 h-screen w-full grid place-items-center">
    <!-- Fondo oscuro transparente -->
    <div class="absolute top-0 left-0 w-full h-full bg-slate-900 bg-opacity-60 backdrop-blur-sm" @click="closeModal">
    </div>
    
    <Transition appear name="fade-scale">
      <!-- Modal centrado -->
      <div class="modal-inner relative bg-white text-gray-900 w-full max-w-lg p-6 sm:p-10 rounded-2xl shadow-2xl overflow-hidden">
        <!-- Botón para cerrar el modal -->
        <button
          class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          @click="closeModal">
          <i class="fas fa-times text-2xl"></i>
        </button>

        <div class="text-center">
          <!-- Icono de advertencia -->
          <div class="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
            <i class="fas fa-user-md text-amber-600 text-4xl"></i>
          </div>

          <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Datos Profesionales Incompletos</h2>
          
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
            <p class="text-gray-700 text-sm sm:text-base leading-relaxed">
              Para poder generar documentos médicos, es obligatorio que cuentes con tu información profesional registrada como <strong>{{ firmanteTypeLabel }}</strong>.
            </p>
            
            <div v-if="missingFieldsLabels.length > 0" class="mt-4">
              <p class="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2">Campos requeridos faltantes:</p>
              <ul class="space-y-1">
                <li v-for="label in missingFieldsLabels" :key="label" class="flex items-center text-sm text-amber-700">
                  <i class="fas fa-exclamation-circle mr-2 text-xs"></i>
                  {{ label }}
                </li>
              </ul>
            </div>
          </div>

          <p class="text-gray-600 text-sm mb-8">
            Por favor, completa tus datos profesionales en la sección de configuración para habilitar la creación de documentos.
          </p>

          <div class="flex flex-col sm:flex-row gap-3">
            <button
              @click="closeModal"
              class="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all active:scale-95">
              Cerrar
            </button>
            <button
              @click="goToConfiguration"
              class="flex-1 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2">
              <i class="fas fa-cog"></i>
              Configurar Datos
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.modal {
  z-index: 100;
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.3s ease-out;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.fade-scale-enter-to,
.fade-scale-leave-from {
  opacity: 1;
  transform: scale(1);
}
</style>

