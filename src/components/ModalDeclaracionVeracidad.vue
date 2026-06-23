<script setup lang="ts">
import { ref, inject, computed } from 'vue';
import { format } from 'date-fns';
import GreenButton from '@/components/GreenButton.vue';
import { useEscapeToClose } from '@/composables/useEscapeToClose';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import {
  descargarDeclaracionVeracidadPdf,
  formatNombreDeclaracion,
  type DeclaracionVeracidadTrabajador,
} from '@/helpers/generarDeclaracionVeracidadPdf';

const props = defineProps<{
  trabajador: DeclaracionVeracidadTrabajador | null;
}>();

const emit = defineEmits<{
  closeModal: [];
}>();

const toast: any = inject('toast');
const proveedorSaludStore = useProveedorSaludStore();

const fecha = ref(format(new Date(), 'yyyy-MM-dd'));
const descargando = ref(false);

const nombreTrabajador = computed(() => formatNombreCompleto(props.trabajador));
const nombreDeclaracion = computed(() => formatNombreDeclaracion(props.trabajador ?? {}));

const closeModal = () => {
  if (descargando.value) return;
  emit('closeModal');
};

useEscapeToClose(closeModal, () => !descargando.value);

const handleDescargar = async () => {
  if (!fecha.value) {
    toast?.open?.({
      message: 'Selecciona una fecha para generar la declaración.',
      type: 'error',
    });
    return;
  }

  if (!nombreDeclaracion.value.trim()) {
    toast?.open?.({
      message: 'No se encontró el nombre del trabajador.',
      type: 'error',
    });
    return;
  }

  descargando.value = true;

  try {
    const proveedor = proveedorSaludStore.proveedorSalud;

    await descargarDeclaracionVeracidadPdf({
      trabajador: props.trabajador ?? {},
      fecha: fecha.value,
      proveedorSalud: proveedor
        ? {
            direccion: proveedor.direccion,
            municipio: proveedor.municipio,
            estado: proveedor.estado,
            telefono: proveedor.telefono,
            sitioWeb: proveedor.sitioWeb,
            logotipoEmpresa: proveedor.logotipoEmpresa,
          }
        : null,
    });

    toast?.open?.({
      message: 'Inicia descarga correctamente.',
      type: 'success',
    });
    descargando.value = false;
    emit('closeModal');
  } catch (error) {
    console.error('Error al generar la declaración:', error);
    toast?.open?.({
      message: 'Error al generar la declaración. Inténtalo de nuevo.',
      type: 'error',
    });
  } finally {
    descargando.value = false;
  }
};
</script>

<template>
  <div class="modal fixed top-0 left-0 z-10 p-8 h-screen w-full grid place-items-center">
    <div
      class="absolute top-0 left-0 w-full h-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm"
      @click="closeModal"
    />
    <Transition appear name="fade">
      <div
        class="modal-inner relative bg-white text-gray-900 dark:bg-slate-800 dark:text-slate-100 w-full max-w-md p-8 rounded-lg shadow-md shadow-slate-900 dark:shadow-black/40 max-h-[90vh] overflow-y-auto"
      >
        <div
          class="modal-close absolute h-16 w-16 flex justify-center items-center top-0 right-0 text-5xl text-gray-400 hover:text-gray-500 dark:text-slate-400 dark:hover:text-slate-300 cursor-pointer"
          @click="closeModal"
        >
          &times;
        </div>

        <h1 class="text-2xl mb-2 pr-8 dark:text-slate-100">Declaración de Veracidad</h1>
        <p class="text-gray-600 dark:text-slate-300 mb-4">
          Genera un formato imprimible para que el trabajador lo firme a puño y letra.
          Si necesitas conservarlo en el expediente, súbelo después como Documento Externo.
        </p>
        <hr class="mt-2 mb-6 border-gray-200 dark:border-slate-600">

        <div class="space-y-4">
          <div>
            <label for="fecha-declaracion" class="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
              Fecha de la declaración
            </label>
            <input
              id="fecha-declaracion"
              v-model="fecha"
              type="date"
              :disabled="descargando"
              class="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-60 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:focus:ring-emerald-400 dark:focus:border-emerald-400 dark:[color-scheme:dark]"
            />
          </div>

          <div class="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600 dark:bg-slate-900/60 dark:border-slate-600 dark:text-slate-300">
            <span class="font-semibold text-gray-700 dark:text-slate-200">Trabajador:</span>
            {{ nombreTrabajador || '—' }}
          </div>
        </div>

        <div class="mt-8 space-y-3">
          <div class="flex justify-center">
            <GreenButton
              text="Descargar declaración"
              size="medium"
              :loading="descargando"
              :disabled="descargando"
              @click="handleDescargar"
            />
          </div>
          <button
            type="button"
            class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200"
            :disabled="descargando"
            @click="closeModal"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
