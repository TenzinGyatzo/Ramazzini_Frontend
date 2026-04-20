<script setup>
import { inject } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useCurrentUser } from '@/composables/useCurrentUser';

const toast = inject('toast');

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const { getCurrentUserId, ensureUserLoaded } = useCurrentUser();
const emit = defineEmits(['closeModal']);


// Función para manejar el envío del formulario
const handleSubmit = async (data) => {
  // Obtener el ID del usuario actual
  const currentUserId = await ensureUserLoaded();
  
  if (!currentUserId) {
    toast.open({ message: 'No se pudo identificar al usuario. Por favor, inicie sesión nuevamente.', type: 'error' });
    return;
  }

  const centroTrabajoData = {
    nombreCentro: data.nombreCentro,
    direccionCentro: data.direccionCentro,
    codigoPostal: data.codigoPostal,
    estado: data.estado,
    municipio: data.municipio,
    idEmpresa: data.idEmpresa,
    createdBy: currentUserId,
    updatedBy: currentUserId
  };

  // console.log('Centro de trabajo:', centroTrabajoData);

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
    emit('closeModal');
    centrosTrabajo.fetchCentrosTrabajo(empresas.currentEmpresaId);
  } catch (error) {
    console.error('Error al crear o actualizar el centro:', error);
    toast.open({ message: 'Hubo un error, por favor intente nuevamente.', type: 'error' });
  }
};

// Limpiar la vista previa cuando se cierre el modal
const closeModal = () => {
  emit('closeModal');
};
</script>


<template>
  <div class="modal modal-centros fixed top-0 left-0 z-10 p-8 h-screen w-full grid place-items-center">
    <!-- Fondo oscuro transparente -->
    <div class="absolute top-0 left-0 w-full h-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm" @click="closeModal">
    </div>
    <Transition appear name="fade">
      <!-- Modal centrado con desplazamiento interno -->
      <div
        class="modal-inner relative bg-white text-gray-900 w-full sm:w-4/5 md:w-3/5 xl:w-2/5 2xl:w-1/3 p-10 rounded-lg shadow-md shadow-slate-900 max-h-[90vh] overflow-y-auto">
        <!-- Botón para cerrar el modal -->
        <div
          class="modal-close absolute h-16 w-16 flex justify-center items-center top-0 right-0 text-5xl text-gray-400 hover:text-gray-500 cursor-pointer"
          @click="closeModal">
          &times;
        </div>

        <div v-if="centrosTrabajo.loadingModal">
          <h1 class="text-3xl text-center">Cargando centro de trabajo...</h1>
        </div>
        <!-- Contenido del modal -->
        <div v-else>
          <h1 class="text-3xl">{{ centrosTrabajo.currentCentroTrabajo._id ? 'Editar Entidad' : 'Registrar Entidad' }}</h1>
          <p class="text-xs text-gray-500 mt-1 mb-3">Los campos con <span class="text-red-500 font-medium">*</span> son obligatorios</p>
          <hr class="mt-2 mb-3">

          <FormKit type="form" :actions="false" incomplete-message="Por favor complete todos los campos"
            @submit="handleSubmit">
            <FormKit type="text" name="nombreCentro"
              placeholder="Nombre del centro, área, departamento o proyecto" validation="required"
              :validation-messages="{ required: 'Este campo es obligatorio' }"
              :value="centrosTrabajo.currentCentroTrabajo?.nombreCentro || ''">
              <template #label>
                <span class="font-medium text-lg text-gray-700">Nombre Entidad<span class="text-red-500">*</span></span>
              </template>
            </FormKit>
            <FormKit type="text" label="Dirección" name="direccionCentro" placeholder="Calle, número y colonia"
              :value="centrosTrabajo.currentCentroTrabajo?.direccionCentro || ''" />
            <FormKit type="text" label="Código Postal" name="codigoPostal" placeholder="Ej. 81200, 44100, 01500"
            validation="postalCodeValidation" :validation-messages="{
                  postalCodeValidation: 'El código postal debe tener entre 4 y 10 dígitos.',
                }"
              :value="centrosTrabajo.currentCentroTrabajo?.codigoPostal || ''" />
            <FormKit type="text" label="Región/Provincia/Estado" name="estado" placeholder="Ej. Estado de México, Morelos, Chihuahua"
              :value="centrosTrabajo.currentCentroTrabajo?.estado || ''" />

            <FormKit type="text" label="Ciudad/Municipio/Corregimiento" name="municipio" placeholder="Ej. Juárez, Léon, Cuernavaca"
              :value="centrosTrabajo.currentCentroTrabajo?.municipio || ''" />

            <FormKit type="hidden" name="idEmpresa" :value="empresas.currentEmpresaId" />

            <hr class="my-3">
            <FormKit type="submit" :disabled="centrosTrabajo.loadingModal">
              <span v-if="centrosTrabajo.loadingModal">Guardando...</span>
              <span v-else>{{ centrosTrabajo.currentCentroTrabajo._id ? 'Actualizar Centro' : 'Guardar Centro' }}</span>
            </FormKit>
          </FormKit>
        </div>

        <button
          class="text-xl mt-2 w-full rounded-lg bg-white font-semibold text-gray-800 shadow-sm ring-2 ring-inset ring-gray-300 hover:bg-gray-100 p-3 transition-transform duration-300 transform hover:scale-105 hover:shadow-lg flex-1"
          @click="closeModal">
          Cerrar
        </button>
      </div>
    </Transition>
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