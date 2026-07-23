<script setup lang="ts">
import { computed, watch } from 'vue';
import type { NivelEliminacion } from '@/config/eliminacion';
import type { DetalleContextoEliminacion } from '@/config/eliminacion';
import { useVerificacionEliminacion } from '@/composables/useVerificacionEliminacion';
import { useEscapeToClose } from '@/composables/useEscapeToClose';

const props = defineProps<{
  isVisible: boolean;
  nivel: NivelEliminacion;
  tipoRegistro: string;
  identificacion: string;
  textoConfirmacionEsperado: string;
  detalleContexto?: DetalleContextoEliminacion | null;
  mensajePersonalizado?: string;
  isConfirming?: boolean;
  /** Cuando el padre ya aplica Transition (p. ej. modal-work), omitir fade interno. */
  disableTransition?: boolean;
  auditResourceType?: string;
  auditResourceId?: string;
}>();

const emit = defineEmits<{
  confirm: [password?: string];
  cancel: [];
}>();

const {
  password,
  textoConfirmacion,
  error,
  verifying,
  setAuditContext,
  verificar,
  validarTextoConfirmacion,
  reset,
} = useVerificacionEliminacion();

watch(
  () => props.isVisible,
  (visible) => {
    if (!visible) {
      reset();
      return;
    }
    setAuditContext({
      resourceType: props.auditResourceType,
      resourceId: props.auditResourceId,
    });
  },
);

watch(
  () => [props.auditResourceType, props.auditResourceId] as const,
  ([resourceType, resourceId]) => {
    if (props.isVisible) {
      setAuditContext({ resourceType, resourceId });
    }
  },
);

const mensajePrincipal = computed(() => {
  if (props.mensajePersonalizado) return props.mensajePersonalizado;
  return `Parece que quieres eliminar el/la ${props.tipoRegistro} identificado(a) como`;
});

const requierePassword = computed(
  () => props.nivel === 'moderado' || props.nivel === 'robusto',
);
const requiereTexto = computed(() => props.nivel === 'robusto');
const isBusy = computed(() => props.isConfirming || verifying.value);

const handleCancel = () => {
  if (isBusy.value) return;
  reset();
  emit('cancel');
};

useEscapeToClose(handleCancel, () => props.isVisible && !isBusy.value);

const handleConfirm = async () => {
  if (isBusy.value) return;

  if (requierePassword.value) {
    const passwordOk = await verificar();
    if (!passwordOk) return;
  }

  if (requiereTexto.value) {
    const textoOk = validarTextoConfirmacion(
      textoConfirmacion.value,
      props.textoConfirmacionEsperado,
    );
    if (!textoOk) return;
  }

  emit('confirm', requierePassword.value ? password.value : undefined);
};
</script>

<template>
  <Transition name="fade" :css="!disableTransition">
    <div v-if="isVisible" class="relative z-[70]">
      <div
        class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur-sm"
        @click="handleCancel"
      />
      <div
        class="fixed inset-0 z-10 w-screen overflow-y-auto"
        @click.self="handleCancel"
      >
        <div class="flex min-h-full justify-center p-8 text-center items-center">
          <div
            class="modal-eliminacion modal-inner relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
            @click.stop
          >
            <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div
                  class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"
                >
                  <svg
                    class="h-6 w-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                    />
                  </svg>
                </div>
                <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <h3 class="text-lg font-semibold leading-6 text-gray-900">
                    CONFIRMAR ELIMINACIÓN
                  </h3>
                  <div class="mt-2 space-y-3">
                    <p class="text-md text-gray-500">
                      <span>{{ mensajePrincipal }}</span>
                      <template v-if="!mensajePersonalizado">
                        <strong>"{{ identificacion }}"</strong>.
                      </template>
                      Esta acción no se puede deshacer. ¿Desea continuar?
                    </p>

                    <div
                      v-if="detalleContexto && (detalleContexto.fecha || detalleContexto.resultado || detalleContexto.tipoSangre || detalleContexto.tipoEstudioLabel)"
                      class="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 space-y-1"
                    >
                      <div v-if="detalleContexto.tipoEstudioLabel" class="flex gap-2">
                        <span class="font-semibold">Estudio:</span>
                        <span>{{ detalleContexto.tipoEstudioLabel }}</span>
                      </div>
                      <div v-if="detalleContexto.fecha" class="flex gap-2">
                        <span class="font-semibold">Fecha:</span>
                        <span>{{ detalleContexto.fecha }}</span>
                      </div>
                      <div v-if="detalleContexto.resultado" class="flex gap-2">
                        <span class="font-semibold">Resultado:</span>
                        <span>{{ detalleContexto.resultado }}</span>
                      </div>
                      <div v-if="detalleContexto.tipoSangre" class="flex gap-2">
                        <span class="font-semibold">Tipo de sangre:</span>
                        <span>{{ detalleContexto.tipoSangre }}</span>
                      </div>
                    </div>

                    <div v-if="nivel === 'robusto'" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      Esta eliminación es irreversible y afectará todos los registros dependientes. (Trabajadores y expedientes asociados).
                      Escribe <strong>{{ textoConfirmacionEsperado }}</strong> para confirmar.
                    </div>

                    <div v-if="requierePassword" class="space-y-1">
                      <label class="block text-sm font-medium text-gray-700">
                        Confirma tu contraseña
                      </label>
                      <input
                        v-model="password"
                        type="password"
                        autocomplete="current-password"
                        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                        placeholder="Tu contraseña"
                        @keyup.enter="handleConfirm"
                      />
                    </div>

                    <div v-if="requiereTexto" class="space-y-1">
                      <label class="block text-sm font-medium text-gray-700">
                        Escribe el nombre exacto para confirmar
                      </label>
                      <input
                        v-model="textoConfirmacion"
                        type="text"
                        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                        :placeholder="textoConfirmacionEsperado"
                        @keyup.enter="handleConfirm"
                      />
                    </div>

                    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                :disabled="isBusy"
                class="inline-flex w-full justify-center rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-3 sm:w-auto transition-transform duration-300 transform hover:scale-105"
                @click="handleConfirm"
              >
                <i v-if="isBusy" class="fas fa-spinner fa-spin mr-2" />
                {{ isBusy ? 'Eliminando...' : 'Eliminar' }}
              </button>
              <button
                type="button"
                :disabled="isBusy"
                class="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-100 disabled:opacity-50 sm:mt-0 sm:w-auto transition-transform duration-300 transform hover:scale-105"
                @click="handleCancel"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
