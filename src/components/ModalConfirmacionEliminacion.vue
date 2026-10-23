<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useVerificacionEliminacion } from '@/composables/useVerificacionEliminacion';
import { useEscapeToClose } from '@/composables/useEscapeToClose';
import { TIPOS_DOCUMENTO_EXPEDIENTE, nombreTipoDocumento } from '@/helpers/documentosExpediente';
import { iconoTipoDocumento } from '@/helpers/iconoTipoDocumento';

const props = defineProps({
  isVisible: {
    type: Boolean,
    required: true,
  },
  selectedCount: {
    type: Number,
    required: true,
  },
  selectedRoutes: {
    type: Array as () => string[],
    required: true,
  },
  /** Tipo de cada documento seleccionado; el resumen se arma con esto, no con el nombre del archivo. */
  selectedDocuments: {
    type: Array as () => { documentType: string; formatoFirmado?: boolean }[],
    default: () => [],
  },
  nivel: {
    type: String as () => 'simple' | 'moderado',
    default: 'simple',
  },
});

const emit = defineEmits(['confirm', 'cancel']);

const isConfirming = ref(false);
const {
  password,
  error,
  verifying,
  verificar,
  reset,
} = useVerificacionEliminacion();

watch(
  () => props.isVisible,
  (visible) => {
    if (!visible) reset();
  },
);

const requierePassword = computed(() => props.nivel === 'moderado');
const isBusy = computed(() => isConfirming.value || verifying.value);

const handleConfirm = async () => {
  if (isBusy.value) return;

  if (requierePassword.value) {
    const passwordOk = await verificar();
    if (!passwordOk) return;
  }

  isConfirming.value = true;
  try {
    emit('confirm');
  } finally {
    isConfirming.value = false;
  }
};

const handleCancel = () => {
  if (isBusy.value) return;
  reset();
  emit('cancel');
};

useEscapeToClose(handleCancel, () => props.isVisible && !isBusy.value);

/** Clave del resumen para los PDF firmados en pantalla (son documentos externos). */
const FORMATO_FIRMADO = 'formatoFirmado';
const ICONO_FORMATO_FIRMADO = {
  icono: 'fa-solid fa-signature',
  clases: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
};

/**
 * Cuántos documentos de cada tipo se van a eliminar, en el orden del expediente. Se cuenta por el
 * tipo real de cada documento: antes se adivinaba por el nombre del archivo y un documento externo
 * llamado «Consentimiento Antidoping» se contaba como antidoping.
 */
const resumenPorTipo = computed(() => {
  const conteos = new Map<string, number>();
  for (const doc of props.selectedDocuments) {
    const clave = doc.formatoFirmado ? FORMATO_FIRMADO : doc.documentType;
    conteos.set(clave, (conteos.get(clave) ?? 0) + 1);
  }
  const orden = TIPOS_DOCUMENTO_EXPEDIENTE.map((t) => t.tipo);
  const posicion = (clave: string) => {
    // El formato firmado va justo antes de los documentos externos
    if (clave === FORMATO_FIRMADO) return orden.indexOf('documentoExterno') - 0.5;
    const i = orden.indexOf(clave);
    return i === -1 ? orden.length : i;
  };
  return [...conteos.entries()]
    .sort(([a], [b]) => posicion(a) - posicion(b))
    .map(([clave, cantidad]) => ({
      clave,
      cantidad,
      nombre: clave === FORMATO_FIRMADO ? 'Formato firmado en pantalla' : nombreTipoDocumento(clave),
      icono: clave === FORMATO_FIRMADO ? ICONO_FORMATO_FIRMADO : iconoTipoDocumento(clave),
    }));
});
</script>

<template>
  <Transition name="modal-fade" appear>
    <div v-if="isVisible" class="fixed inset-0 z-50 overflow-y-auto">
      <!-- Overlay -->
      <div class="flex items-center justify-center min-h-screen px-4 py-6" @click.self="handleCancel">
        <div class="fixed inset-0 transition-opacity pointer-events-none" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <!-- Modal -->
        <div class="modal-confirmacion-eliminacion modal-eliminacion relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-lg mx-auto">
          <!-- Header -->
          <div class="bg-gradient-to-r from-red-500 to-rose-600 px-4 py-3 sm:px-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                  <i class="fas fa-exclamation-triangle text-white text-xl"></i>
                </div>
                <div>
                  <h3 class="text-lg font-medium text-white">
                    Confirmar Eliminación Masiva
                  </h3>
                  <p class="text-red-100 text-sm">
                    Esta acción no se puede deshacer
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Content -->
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <i class="fas fa-trash-alt text-red-600 text-lg"></i>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 class="text-lg leading-6 font-medium text-gray-900">
                  ¿Estás seguro?
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    Estás a punto de eliminar <span class="font-semibold text-red-600">{{ selectedCount }} documento{{ selectedCount !== 1 ? 's' : '' }}</span> de forma permanente.
                  </p>

                  <!-- Detalles de documentos: por tipo real, con su cantidad -->
                  <div v-if="resumenPorTipo.length > 0" class="mt-4 bg-gray-50 rounded-lg p-3" data-resumen-eliminacion>
                    <p class="text-xs font-medium text-gray-700 mb-2">Documentos a eliminar:</p>
                    <ul class="grid grid-cols-1 gap-y-1.5 text-xs">
                      <li
                        v-for="fila in resumenPorTipo"
                        :key="fila.clave"
                        class="flex items-center gap-2 min-w-0"
                        :data-tipo="fila.clave"
                      >
                        <span
                          class="inline-flex items-center justify-center w-5 h-5 rounded shrink-0"
                          :class="fila.icono.clases"
                          aria-hidden="true"
                        >
                          <i :class="[fila.icono.icono, 'text-[10px]']"></i>
                        </span>
                        <span class="min-w-0 truncate" :title="fila.nombre">{{ fila.nombre }}</span>
                        <span class="ml-auto shrink-0 font-semibold text-gray-700 tabular-nums">{{ fila.cantidad }}</span>
                      </li>
                    </ul>
                  </div>

                  <div v-if="requierePassword" class="mt-4 space-y-1">
                    <label class="block text-xs font-medium text-gray-700">
                      Confirma tu contraseña
                    </label>
                    <input
                      v-model="password"
                      type="password"
                      autocomplete="current-password"
                      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                      placeholder="Tu contraseña"
                      @keyup.enter="handleConfirm"
                    />
                    <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              @click="handleConfirm"
              :disabled="isBusy"
              class="w-full inline-flex items-center justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i v-if="isBusy" class="fas fa-spinner fa-spin mr-2"></i>
              <i v-else class="fas fa-trash-alt mr-2"></i>
              {{ isBusy ? 'Eliminando...' : 'Sí, eliminar' }}
            </button>
            <button
              type="button"
              @click="handleCancel"
              :disabled="isBusy"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>