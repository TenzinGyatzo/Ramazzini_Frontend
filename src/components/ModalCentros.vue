<script setup>
import { inject, ref, computed, watchEffect } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useCurrentUser } from '@/composables/useCurrentUser';
import MexicoGeoSelect from '@/components/selectors/MexicoGeoSelect.vue';
import CPAutocomplete from '@/components/selectors/CPAutocomplete.vue';
import { useDirtySnapshot } from '@/composables/useDirtySnapshot';
import { useModalDirtyGuard } from '@/composables/useModalDirtyGuard';
import ModalDiscardConfirmDialog from '@/components/ModalDiscardConfirmDialog.vue';

const toast = inject('toast');

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const proveedorSalud = useProveedorSaludStore();
const { getCurrentUserId, ensureUserLoaded } = useCurrentUser();
const emit = defineEmits(['closeModal']);

const isMX = computed(() => proveedorSalud.isMX);

// Helper para Title Case (Nombre Propio)
const toTitleCase = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/(?:^|\s|-)\S/g, (l) => l.toUpperCase());
};

// Objeto reactivo para campos geográficos (usado principalmente para México con catálogos)
const formulario = ref({
  codigoPostal: '',
  estado: '',
  municipio: ''
});

const formData = ref({
  nombreCentro: '',
  direccionCentro: '',
  codigoPostal: '',
  estado: '',
  municipio: '',
  idEmpresa: '',
});

// Sincronizar valores iniciales cuando se edita un centro
watchEffect(() => {
  if (centrosTrabajo.currentCentroTrabajo) {
    formulario.value.codigoPostal = centrosTrabajo.currentCentroTrabajo.codigoPostal || '';
    formulario.value.estado = toTitleCase(centrosTrabajo.currentCentroTrabajo.estado || '');
    formulario.value.municipio = toTitleCase(centrosTrabajo.currentCentroTrabajo.municipio || '');

    formData.value = {
      nombreCentro: centrosTrabajo.currentCentroTrabajo.nombreCentro || '',
      direccionCentro: centrosTrabajo.currentCentroTrabajo.direccionCentro || '',
      codigoPostal: centrosTrabajo.currentCentroTrabajo.codigoPostal || '',
      estado: centrosTrabajo.currentCentroTrabajo.estado || '',
      municipio: centrosTrabajo.currentCentroTrabajo.municipio || '',
      idEmpresa: empresas.currentEmpresaId || '',
    };
  } else {
    formData.value.idEmpresa = empresas.currentEmpresaId || '';
  }
});

const buildFormState = () => {
  if (isMX.value) {
    return {
      nombreCentro: formData.value.nombreCentro,
      direccionCentro: formData.value.direccionCentro,
      codigoPostal: formulario.value.codigoPostal,
      estado: formulario.value.estado,
      municipio: formulario.value.municipio,
      idEmpresa: formData.value.idEmpresa,
    };
  }

  return { ...formData.value };
};

const { isDirty } = useDirtySnapshot(buildFormState, {
  resetTrigger: () => !centrosTrabajo.loadingModal,
});

const closeModal = () => {
  emit('closeModal');
};

const {
  showDiscardConfirm,
  dismissPulse,
  requestDismiss,
  forceClose,
  continueEditing,
  confirmDiscard,
} = useModalDirtyGuard({
  isDirty,
  onClose: closeModal,
  enabled: () => !centrosTrabajo.loadingModal,
});

const handleCPSelect = (data) => {
  if (data) {
    // Para México guardamos el estado y municipio como nombre propio
    formulario.value.estado = toTitleCase(data.estado);
    formulario.value.municipio = toTitleCase(data.municipio);
    // Para centros de trabajo, guardamos el CP como "codigo - Colonia"
    formulario.value.codigoPostal = `${data.cp} - ${toTitleCase(data.asentamiento)}`;
  }
};

// Función auxiliar para normalizar valores geográficos a strings
const normalizeGeoValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object' && value !== null) {
    // Si es un objeto, intentar extraer el valor útil
    if (value.code) return String(value.code).trim();
    if (value.value) return String(value.value).trim();
    if (value.description) return String(value.description).trim();
    return '';
  }
  return String(value).trim();
};

// Función para manejar el envío del formulario
const isSubmitting = ref(false);

const handleSubmit = async (data) => {
  if (isSubmitting.value) return;
  isSubmitting.value = true;

  try {
    // Obtener el ID del usuario actual
    const currentUserId = await ensureUserLoaded();

    if (!currentUserId) {
      toast.open({ message: 'No se pudo identificar al usuario. Por favor, inicie sesión nuevamente.', type: 'error' });
      return;
    }

    // Normalizar valores geográficos dependiendo de si es México o no
    let cpValue = isMX.value ? normalizeGeoValue(formulario.value.codigoPostal) : normalizeGeoValue(data.codigoPostal);
    let estadoValue = isMX.value ? normalizeGeoValue(formulario.value.estado) : normalizeGeoValue(data.estado);
    let municipioValue = isMX.value ? normalizeGeoValue(formulario.value.municipio) : normalizeGeoValue(data.municipio);

    // Asegurar formato de nombre propio (Title Case) para estado y municipio
    estadoValue = toTitleCase(estadoValue);
    municipioValue = toTitleCase(municipioValue);

    const centroTrabajoData = {
      nombreCentro: data.nombreCentro,
      direccionCentro: data.direccionCentro,
      codigoPostal: cpValue,
      estado: estadoValue,
      municipio: municipioValue,
      idEmpresa: data.idEmpresa,
      createdBy: currentUserId,
      updatedBy: currentUserId
    };

    try {
      if (centrosTrabajo.currentCentroTrabajo?._id) {
        // Actualizar centro de trabajo
        await centrosTrabajo.updateCentroTrabajoById(empresas.currentEmpresaId, centrosTrabajo.currentCentroTrabajo._id, centroTrabajoData);
        toast.open({ message: 'Centro de trabajo actualizado con éxito' });
      } else {
        // Crear nuevo centro de trabajo
        await centrosTrabajo.createCentroTrabajo(empresas.currentEmpresaId, centroTrabajoData);
        toast.open({ message: 'Centro de trabajo creado con éxito' });
      }
      forceClose();
      centrosTrabajo.fetchCentrosTrabajo(empresas.currentEmpresaId);
    } catch (error) {
      console.error('Error al crear o actualizar el centro:', error);
      toast.open({ message: 'Hubo un error, por favor intente nuevamente.', type: 'error' });
    }
  } finally {
    isSubmitting.value = false;
  }
};

</script>


<template>
  <div class="modal modal-centros fixed top-0 left-0 z-10 p-8 h-screen w-full grid place-items-center">
    <!-- Fondo oscuro transparente -->
    <div
      class="modal-work-overlay absolute top-0 left-0 w-full h-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm"
      :class="{ 'modal-backdrop-pulse': dismissPulse }"
      @click="requestDismiss"
    >
    </div>
    <!-- Modal centrado con desplazamiento interno -->
    <div
      class="modal-work-panel modal-inner relative bg-white text-gray-900 w-full sm:w-4/5 md:w-3/5 xl:w-2/5 2xl:w-1/3 p-10 rounded-lg shadow-md shadow-slate-900 max-h-[90vh] overflow-y-auto"
      :class="{ 'modal-dismiss-pulse': dismissPulse }"
    >
        <!-- Botón para cerrar el modal -->
        <div
          class="modal-close absolute h-16 w-16 flex justify-center items-center top-0 right-0 text-5xl text-gray-400 hover:text-gray-500 cursor-pointer"
          @click="requestDismiss">
          &times;
        </div>

        <div v-if="centrosTrabajo.loadingModal">
          <h1 class="text-3xl text-center">Cargando centro de trabajo...</h1>
        </div>
        <!-- Contenido del modal -->
        <div v-else>
          <h1 class="text-3xl">{{ centrosTrabajo.currentCentroTrabajo._id ? 'Editar Centro' : 'Registrar Centro' }}</h1>
          <p class="text-xs text-gray-500 mt-1 mb-3">Los campos con <span class="text-red-500 font-medium">*</span> son obligatorios</p>
          <hr class="mt-2 mb-3">

          <FormKit type="form" :actions="false" incomplete-message="Por favor complete todos los campos"
            @submit="handleSubmit" @input="formData = $event">
            <FormKit type="text" name="nombreCentro"
              placeholder="Nombre del centro, área, departamento o proyecto" validation="required"
              :validation-messages="{ required: 'Este campo es obligatorio' }"
              :value="centrosTrabajo.currentCentroTrabajo?.nombreCentro || ''">
              <template #label>
                <span class="font-medium text-lg text-gray-700">Nombre Centro<span class="text-red-500">*</span></span>
              </template>
            </FormKit>
            <FormKit type="text" label="Dirección" name="direccionCentro" placeholder="Calle, número y colonia"
              :value="centrosTrabajo.currentCentroTrabajo?.direccionCentro || ''" />
            
            <template v-if="isMX">
              <CPAutocomplete
                v-model="formulario.codigoPostal"
                @select="handleCPSelect"
                label="Código Postal"
                placeholder="Ej. 81200, Colinas del Río..."
                class="mb-4"
              />

              <div class="mb-4">
                <MexicoGeoSelect
                  v-model:estado="formulario.estado"
                  v-model:municipio="formulario.municipio"
                />
              </div>
            </template>

            <template v-else>
              <FormKit type="text" label="Código Postal" name="codigoPostal" placeholder="Ej. 81200, 44100, 01500"
              validation="postalCodeValidation" :validation-messages="{
                    postalCodeValidation: 'El código postal debe tener entre 4 y 10 dígitos.',
                  }"
                :value="centrosTrabajo.currentCentroTrabajo?.codigoPostal || ''" />
              <FormKit type="text" label="Región/Provincia/Estado" name="estado" placeholder="Ej. Estado de México, Morelos, Chihuahua"
                :value="centrosTrabajo.currentCentroTrabajo?.estado || ''" />

              <FormKit type="text" label="Ciudad/Municipio/Corregimiento" name="municipio" placeholder="Ej. Juárez, Léon, Cuernavaca"
                :value="centrosTrabajo.currentCentroTrabajo?.municipio || ''" />
            </template>

            <FormKit type="hidden" name="idEmpresa" :value="empresas.currentEmpresaId" />

            <hr class="my-3">
            <FormKit type="submit" :disabled="isSubmitting">
              <span v-if="isSubmitting">Guardando...</span>
              <span v-else>{{ centrosTrabajo.currentCentroTrabajo._id ? 'Actualizar Centro' : 'Guardar Centro' }}</span>
            </FormKit>
          </FormKit>
        </div>

        <button
          class="text-xl mt-2 w-full rounded-lg bg-white font-semibold text-gray-800 shadow-sm ring-2 ring-inset ring-gray-300 hover:bg-gray-100 p-3 transition-transform duration-300 transform hover:scale-105 hover:shadow-lg flex-1"
          @click="requestDismiss">
          Cerrar
        </button>
      </div>

    <ModalDiscardConfirmDialog
      :open="showDiscardConfirm"
      @continue-editing="continueEditing"
      @discard="confirmDiscard"
    />
  </div>
</template>


<style scoped>
.fade-slow-enter-from,
.fade-slow-leave-to {
  opacity: 0;
}

.fade-slow-enter-active,
.fade-slow-leave-active {
  transition: all 500ms ease-out;
}

.fade-slow-leave-active {
  transition-delay: 250ms;
}
</style>