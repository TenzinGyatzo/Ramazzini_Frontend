<script setup>
import { ref, inject, computed, watch } from 'vue';
import { useUserStore } from "@/stores/user";
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useRiesgoTrabajoStore } from '@/stores/riesgosTrabajo';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { calcularAntiguedad, calcularEdad } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import { validarFechaDocumentoNoFutura } from '@/helpers/validacionCampos';
import { useDirtySnapshot } from '@/composables/useDirtySnapshot';
import { useModalDirtyGuard } from '@/composables/useModalDirtyGuard';
import ModalDiscardConfirmDialog from '@/components/ModalDiscardConfirmDialog.vue';

const toast = inject('toast');
const emit = defineEmits(['closeModal', 'riesgoCreado','riesgoActualizado']);

const userStore = useUserStore();
const empresasStore = useEmpresasStore();
const centrosTrabajoStore = useCentrosTrabajoStore();
const trabajadoresStore = useTrabajadoresStore();
const riesgosTrabajoStore = useRiesgoTrabajoStore();
const proveedorSaludStore = useProveedorSaludStore();

const riesgosTrabajo = computed(() => trabajadoresStore.currentTrabajador?.riesgosTrabajo || []);

const modo = ref('listado');
const rtEnEdicion = ref(null); // será un objeto con los datos del RT si se edita
const userId = userStore.user._id;

const formModeActive = computed(() => modo.value !== 'listado');

const { isDirty: isFormDirty } = useDirtySnapshot(
  () => rtEnEdicion.value ?? {},
  {
    resetTrigger: () => formModeActive.value && rtEnEdicion.value !== null,
  },
);

const isDirty = computed(() => formModeActive.value && isFormDirty.value);

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
});

const cancelFormEdit = () => {
  requestDismiss(() => {
    modo.value = 'listado';
    rtEnEdicion.value = null;
  });
};

const solicitarEliminacionGlobal = inject('solicitarEliminacion');
const toggleDeleteModal = (id, rt) => {
  solicitarEliminacionGlobal(
    'Riesgo de Trabajo',
    id,
    rt.naturalezaLesion || 'Sin descripción de lesión',
    eliminarRT
  );
};

// console.log('trabajadores.currentTrabajador', trabajadoresStore.currentTrabajador);

const handleSubmit = async () => {
  try {

    const trabajadorId = trabajadoresStore.currentTrabajador?._id;
    if (!trabajadorId) return;

    const validacionFecha = validarFechaDocumentoNoFutura(
      rtEnEdicion.value?.fechaRiesgo,
      proveedorSaludStore.showSiresUI,
    );
    if (!validacionFecha.valido) {
      toast.open({ message: validacionFecha.mensaje, type: 'error' });
      return;
    }

    const payload = limpiarCamposOpcionales(rtEnEdicion.value);

    let riesgoFinal = null;

    if (modo.value === 'editar') {
      await riesgosTrabajoStore.updateRiesgoTrabajo(
        trabajadorId,
        rtEnEdicion.value._id,
        payload
      );
      toast.open({ message: 'Riesgo de Trabajo actualizado', type: 'success' });

      const riesgosActualizados = await trabajadoresStore.fetchRiesgosTrabajoPorEmpresa(empresasStore.currentEmpresaId);
      const riesgoFinal = riesgosActualizados.find(r => r._id === rtEnEdicion.value._id);

      if (riesgoFinal) {
        emit('riesgoActualizado', riesgoFinal);
      }

      if (riesgoFinal && trabajadoresStore.currentTrabajador?.riesgosTrabajo) {
        const index = trabajadoresStore.currentTrabajador.riesgosTrabajo.findIndex(
          (r) => r._id === riesgoFinal._id
        );
        if (index !== -1) {
          trabajadoresStore.currentTrabajador.riesgosTrabajo.splice(index, 1, riesgoFinal);
        }
      }

      // ✅ Actualizar los riesgos que ve ModalRTs.vue
      await trabajadoresStore.fetchTrabajadorById(
        empresasStore.currentEmpresaId,
        centrosTrabajoStore.currentCentroTrabajoId,
        trabajadorId
      );
    } else if (modo.value === 'nuevo') {
      const nuevaRT = await riesgosTrabajoStore.createRiesgoTrabajo(
        trabajadorId,
        { ...payload, idTrabajador: trabajadorId }
      );
      toast.open({ message: 'Riesgo de Trabajo registrado', type: 'success' });

      // ✅ Agrega manualmente al array reactivo del trabajador
      if (nuevaRT && trabajadoresStore.currentTrabajador) {
        // 🛠️ Inyectar campos que la vista necesita para agrupar y mostrar
        nuevaRT.idCentroTrabajo = trabajadoresStore.currentTrabajador.idCentroTrabajo;
        nuevaRT.sexoTrabajador = trabajadoresStore.currentTrabajador.sexo;
        nuevaRT.puestoTrabajador = trabajadoresStore.currentTrabajador.puesto;

        // ✅ Agregar al array local del trabajador
        trabajadoresStore.currentTrabajador.riesgosTrabajo?.push(nuevaRT);

        // ✅ Emitir con los datos completos para que RiesgosTrabajoView lo vea
        emit('riesgoCreado', nuevaRT);
      }
    }

    modo.value = 'listado';
    rtEnEdicion.value = null;
  } catch (error) {
    console.error(error);
    toast.open({ message: 'Error al guardar el Riesgo de Trabajo.', type: 'error' });
  }
};

function limpiarCamposOpcionales(data) {
  const cleaned = { ...data };
  Object.keys(cleaned).forEach((key) => {
    if (cleaned[key] === '') {
      delete cleaned[key];
    }
  });
  return cleaned;
}

const nuevoRT = () => {
  const trabajadorId = trabajadoresStore.currentTrabajador?._id;
  rtEnEdicion.value = {
    _id: '',
    fechaRiesgo: new Date().toISOString().slice(0, 10),
    diasIncapacidad: 0,
    porcentajeIPP: 0,
    idTrabajador: trabajadorId,
    createdBy: userId,
    updatedBy: userId
  };
  modo.value = 'nuevo';
};

const editarRT = (rt) => {
  rtEnEdicion.value = {
    ...rt,
    fechaRiesgo: rt.fechaRiesgo ? new Date(rt.fechaRiesgo).toISOString().slice(0, 10) : '',
    fechaAlta: rt.fechaAlta ? new Date(rt.fechaAlta).toISOString().slice(0, 10) : ''
  };
  modo.value = 'editar';
};

const eliminarRT = async (id) => {
  try {
    const trabajadorId = trabajadoresStore.currentTrabajador?._id;
    if (!trabajadorId) return;

    await riesgosTrabajoStore.deleteRiesgoTrabajo(trabajadorId, id);
    toast.open({ message: 'Riesgo de Trabajo eliminado', type: 'success' });

    await trabajadoresStore.fetchTrabajadorById(empresasStore.currentEmpresaId, centrosTrabajoStore.currentCentroTrabajoId, trabajadorId);
  } catch (error) {
    console.error(error);
    toast.open({ message: 'Error al eliminar el Riesgo de Trabajo.', type: 'error' });
  }
};

watch(() => rtEnEdicion.value?.secuelas, (nuevoValor) => {
  if (nuevoValor === 'No') {
    rtEnEdicion.value.porcentajeIPP = 0; // Vaciar el campo
  }
});

// Lista de sugerencias
const sugerenciasParteCuerpo = [ "Dedos", "Mano", "Muñeca", "Antebrazo", "Codo", "Brazo", "Hombro", "Cabeza", "Ojos", "Cervical", "Cuello", "Tórax", "Abdomen", "Espalda", "Lumbar", "Cadera", "Muslo", "Rodilla", "Pierna", "Tobillo", "Pie", "Dedos pie"];

const sugerenciasNatLesion = [ "Contusión", "Traumatismo", "Fractura", "Luxación", "Esguince", "Corte", "Quemadura", "Herida", "Policontundido"];


</script>

<template>
  <div class="modal fixed top-0 left-0 z-50 p-4 sm:p-8 h-screen w-full flex items-center justify-center">
    <!-- Fondo -->
    <div
      class="absolute top-0 left-0 w-full h-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm"
      :class="{ 'modal-backdrop-pulse': dismissPulse }"
      @click="requestDismiss"
    ></div>

    <Transition name="fade">
      <div
        class="modal-inner relative bg-white w-full sm:w-4/5 md:w-3/5 xl:w-2/5 2xl:w-1/3 p-10 rounded-lg shadow-md shadow-slate-900 max-h-[90vh] overflow-y-auto text-gray-800"
        :class="{ 'modal-dismiss-pulse': dismissPulse }"
      >
        <!-- Botón cerrar -->
        <div class="absolute h-16 w-16 flex justify-center items-center top-0 right-0 text-5xl text-gray-400 hover:text-gray-500 cursor-pointer" @click="requestDismiss">
          &times;
        </div>

        <h1 class="text-2xl font-semibold mb-2">Riesgos de Trabajo</h1>
        <hr class="mb-4">
        <!-- Información del trabajador -->
        <div class="mb-3 p-4 bg-gray-50 rounded-lg">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-medium text-gray-600">Nombre del trabajador</p>
              <p class="text-lg font-semibold text-gray-800">{{ formatNombreCompleto(trabajadoresStore.currentTrabajador) }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-600">Puesto</p>
              <p class="text-lg font-semibold text-gray-800">{{ trabajadoresStore.currentTrabajador?.puesto }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-600">Número de Empleado</p>
              <p class="text-lg font-semibold text-gray-800">
                {{ trabajadoresStore.currentTrabajador?.numeroEmpleado || '-' }}
              </p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-600">NSS</p>
              <p class="text-lg font-semibold text-gray-800">{{ trabajadoresStore.currentTrabajador?.nss }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-600">Edad</p>
              <p class="text-lg font-semibold text-gray-800">{{ calcularEdad(trabajadoresStore.currentTrabajador?.fechaNacimiento) }} años</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-600">Antigüedad</p>
              <p class="text-lg font-semibold text-gray-800">{{ calcularAntiguedad(trabajadoresStore.currentTrabajador?.fechaIngreso) }}</p>
            </div>
          </div>
        </div>

        <!-- Lista de RTs existentes -->
        <div v-if="modo === 'listado'" class="space-y-4">
          <h2 class="text-lg font-semibold text-gray-800 mb-2">Historial de Riesgos de Trabajo</h2>

            <div v-if="!trabajadoresStore.currentTrabajador?.riesgosTrabajo?.length" 
               class="p-4 border rounded-lg shadow-sm text-center bg-gray-50">
            <p class="text-gray-600">No hay riesgos de trabajo registrados</p>
            </div>

            <div
              v-else
              v-for="rt in riesgosTrabajo"
              :key="rt._id"
              class="p-3 border border-gray-300 rounded-lg shadow-sm bg-gray-50 flex flex-col gap-0 text-gray-700"
            >
              <!-- Naturaleza de la lesión y fecha -->
              <div class="flex justify-between items-center">
                <p class="font-semibold text-gray-800">{{ rt.naturalezaLesion || 'Sin descripción de lesión' }} 
                  <span v-if="rt.recaida == 'Si'" class="font-normal text-xs text-red-500">&nbsp;(Recaída)</span>
                  <span class="font-normal text-xs">&nbsp;—  &nbsp;{{ rt.parteCuerpoAfectada }}</span>
                </p>
                <span class="text-sm text-gray-500">
                  {{ new Date(rt.fechaRiesgo).toLocaleDateString('es-MX', { timeZone: 'UTC' }) }}
                </span>
              </div>

              <!-- Tipo de Riesgo y Manejo -->
              <div class="flex flex-wrap gap-x-3 text-sm text-gray-600">
                <span v-if="rt.tipoRiesgo">
                  <strong>Tipo:</strong> {{ rt.tipoRiesgo }}
                </span>
                <span v-if="rt.manejo">
                  <strong>Manejo:</strong> {{ rt.manejo }}
                </span>
              </div>

              <!-- Estado de Alta e Incapacidad -->
              <div v-if="rt.alta || rt.diasIncapacidad" class="flex flex-wrap gap-x-3 text-sm text-gray-600">
                <span v-if="rt.alta === 'Incapacidad Activa'" class="text-red-600 font-normal">
                  Incapacidad Activa
                </span>
                <span v-else-if="rt.alta">
                  <strong>Alta:</strong> {{ rt.fechaAlta ? new Date(rt.fechaAlta).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : 'Fecha no disponible' }}
                </span>
                <div v-if="rt.diasIncapacidad" class="flex items-center gap-x-1">
                  <strong>Incapacidad:</strong>
                  <span class="text-yellow-600 font-normal">{{ rt.diasIncapacidad }} días</span>
                </div>
                <!-- Recepción de ST2 -->
                <div v-if="rt.manejo === 'IMSS'" class="flex flex-wrap gap-x-1 text-sm text-gray-600">
                  <strong>ST2:</strong>
                  <span v-if="rt.alta === 'Alta ST2'" class="text-green-600">Recibida</span>
                  <span v-else class="text-red-600">Pendiente</span>
                </div>
              </div>

              <!-- Secuelas e IPP -->
                <div v-if="rt.secuelas" class="flex flex-wrap gap-x-3 text-sm text-gray-600">
                <span v-if="rt.secuelas === 'Si' && rt.porcentajeIPP">
                  <strong>Secuelas:</strong> {{ rt.secuelas }} 
                  <strong class="ml-2">IPP:</strong> {{ rt.porcentajeIPP }}%
                </span> 
                </div>

              <!-- Botones de acción -->
              <div class="flex justify-end gap-2 mt-1">
                <button @click="editarRT(rt)" class="text-blue-600 hover:underline text-xs">Editar</button>
                <button @click="toggleDeleteModal(rt._id, rt)" class="text-red-600 hover:underline text-xs">Eliminar</button>
              </div>
            </div>


          <button @click="nuevoRT"
            class="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg">
            Registrar Nueva RT o Recaída
          </button>

          <button @click="requestDismiss"
            class="mt-3 w-full py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100">
            Cerrar
          </button>
        </div>

        <!-- Formulario para crear o editar RT -->
        <div v-if="modo === 'nuevo' || modo === 'editar'" class="space-y-4">
          <h2 class="text-lg font-semibold text-gray-800 mb-2">
            {{ modo === 'editar' ? 'Editar Riesgo de Trabajo' : 'Registrar Nueva RT o Recaída' }}
          </h2>
          
          <!-- Primera fila -->
          <div class="grid md:grid-cols-2 gap-4">
            <!-- Columna 1: Fecha del Riesgo -->
            <div>
              <label class="block text-sm font-medium text-gray-600">Fecha del Riesgo</label>
              <input type="date" v-model="rtEnEdicion.fechaRiesgo" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
            </div>

            <!-- Columna 2: Recaída (Etiqueta e Input separados) -->
            <div>
              <label class="block text-sm font-medium text-gray-600">Recaída</label>
              <select v-model="rtEnEdicion.recaida" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                <option disabled value="">Selecciona</option>
                <option>Si</option>
                <option>No</option>
              </select>
            </div>
          </div>

          <!-- Segunda fila -->
          <div class="grid md:grid-cols-2 gap-4">

            <div>
              <label class="block text-sm font-medium text-gray-600">Tipo de Riesgo</label>
              <select v-model="rtEnEdicion.tipoRiesgo" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                <option disabled value="">Selecciona un tipo</option>
                <option>Accidente de Trabajo</option>
                <option>Accidente de Trayecto</option>
                <option>Enfermedad de Trabajo</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600">Naturaleza de la lesión</label>
              <input type="text" v-model="rtEnEdicion.naturalezaLesion" placeholder="Descripción de la lesión" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" list="nat-lesion-sugerencias" />
              <datalist id="nat-lesion-sugerencias">
                <option v-for="sugerencia in sugerenciasNatLesion" :key="sugerencia" :value="sugerencia">{{ sugerencia }}</option>
              </datalist>
            </div>
          </div>

          <!-- Tercera fila -->
          <div class="grid grid-cols-2 gap-4">

            <div>
              <label class="block text-sm font-medium text-gray-600">Parte afectada</label>
              <input type="text" v-model="rtEnEdicion.parteCuerpoAfectada" placeholder="Zona afectada" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" list="parte-cuerpo-sugerencias" />
              <datalist id="parte-cuerpo-sugerencias">
                <option v-for="sugerencia in sugerenciasParteCuerpo" :key="sugerencia" :value="sugerencia">{{ sugerencia }}</option>
              </datalist>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600">Manejo</label>
              <select v-model="rtEnEdicion.manejo" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                <option disabled value="">Selecciona un manejo</option>
                <option>IMSS</option>
                <option>Interno</option>
              </select>
            </div>

          </div>

          <!-- Cuarta fila -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-600">Estatus de Alta</label>
              <select v-model="rtEnEdicion.alta" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                <option disabled value="">Selecciona un estatus</option>
                <option>Incapacidad Activa</option>
                <option>Alta ST2</option>
                <option>Alta Interna</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600">Fecha de Alta</label>
              <input type="date" v-model="rtEnEdicion.fechaAlta" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
            </div>
          </div>

          <!-- Quinta fila -->
          <div class="grid grid-cols-3 gap-4 items-start">
            <!-- Días de Incapacidad -->
            <div class="col-span-1">
              <label class="block text-sm font-medium text-gray-600">
                <span class="hidden md:inline">Días de Incapacidad</span>
                <span class="md:hidden">Incapacidad</span>
              </label>
              <input type="number" min="0" v-model="rtEnEdicion.diasIncapacidad" placeholder="0" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
            </div>

            <!-- Secuelas y Porcentaje de IPP -->
            <div class="col-span-1 flex flex-col items-start">
              <label class="block text-sm font-medium text-gray-600">Secuelas</label>
              <select v-model="rtEnEdicion.secuelas" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                <option disabled value="">Selecciona</option>
                <option>Si</option>
                <option>No</option>
              </select>
            </div>

            <div class="col-span-1">
              <label class="block text-sm font-medium text-gray-600">
                <span class="hidden md:inline">Porcentaje IPP</span>
                <span class="md:hidden">IPP</span>
              </label>
              <input 
              type="number" 
              min="0" 
              max="100" 
              v-model="rtEnEdicion.porcentajeIPP" 
              placeholder="0" 
              :disabled="!rtEnEdicion.secuelas || rtEnEdicion.secuelas === 'No'" 
              class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>

          </div>

          <!-- Notas -->
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-700">Notas u observaciones</label>
            <textarea v-model="rtEnEdicion.notas" rows="3" class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"></textarea>
          </div>

          <!-- Campos ocultos -->
          <div class="hidden">
            <input type="hidden" v-model="rtEnEdicion.idTrabajador" />
            <input type="hidden" v-model="rtEnEdicion.createdBy" />
            <input type="hidden" v-model="rtEnEdicion.updatedBy" />
          </div>

          <!-- Botones de acción -->
          <div class="flex justify-between mt-4 gap-4">
            <button @click="cancelFormEdit" class="w-1/2 py-2 bg-white border text-gray-700 font-medium rounded-lg hover:bg-gray-100">
              Cancelar
            </button>
            <button @click="handleSubmit" class="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
              Guardar
            </button>
          </div>
        </div>

      </div>
    </Transition>

    <ModalDiscardConfirmDialog
      :open="showDiscardConfirm"
      @continue-editing="continueEditing"
      @discard="confirmDiscard"
    />
  </div>
</template>

<style>
.toggle-checkbox:checked + div {
  background-color: #10b981;
}
.toggle-checkbox:checked + div + .dot {
  transform: translateX(1rem);
}
</style>