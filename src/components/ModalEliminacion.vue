<script setup lang="ts">
import { computed, watch } from 'vue';
import type {
  DetalleContextoEliminacion,
  EntidadEliminable,
  NivelEliminacion,
} from '@/config/eliminacion';
import { ETIQUETA_IDENTIFICACION, tituloEliminacion } from '@/config/eliminacion';
import { useVerificacionEliminacion } from '@/composables/useVerificacionEliminacion';
import { useEscapeToClose } from '@/composables/useEscapeToClose';
import type { ResumenEliminacion } from '@/utils/resumenEliminacion';
import {
  NO_SE_PUEDE_DESHACER,
  avisoDocumentosFinalizados,
  fraseDeLoQueSeElimina,
  fraseDependientesSinResumen,
} from '@/utils/resumenEliminacion';

const props = defineProps<{
  isVisible: boolean;
  nivel: NivelEliminacion;
  /** Lo que se elimina, en minúsculas: «centro», «historia clínica». */
  tipoRegistro: string;
  identificacion: string;
  /** Nombre del documento externo; va antes de su fecha. */
  nombreDocumento?: string;
  textoConfirmacionEsperado: string;
  detalleContexto?: DetalleContextoEliminacion | null;
  mensajePersonalizado?: string;
  isConfirming?: boolean;
  /** Cuando el padre ya aplica Transition (p. ej. modal-work), omitir fade interno. */
  disableTransition?: boolean;
  auditResourceType?: string;
  auditResourceId?: string;
  /** Lo que se eliminará en cascada (empresa, centro o trabajador). */
  resumen?: ResumenEliminacion | null;
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

const titulo = computed(() => tituloEliminacion(props.tipoRegistro));

/** El tipo de recurso de auditoría es la entidad que se elimina. */
const entidad = computed(() => props.auditResourceType as EntidadEliminable | undefined);

/** «Centro», «Fecha»…: va antes del nombre en negritas. */
const etiquetaIdentificacion = computed(() => {
  const etiqueta = entidad.value ? ETIQUETA_IDENTIFICACION[entidad.value] : undefined;
  return etiqueta ?? props.tipoRegistro.charAt(0).toUpperCase() + props.tipoRegistro.slice(1);
});

/** El estudio ya va en la identificación; en el detalle no se repite. */
const estudioEnDetalle = computed(() => {
  const estudio = props.detalleContexto?.tipoEstudioLabel;
  return estudio && estudio !== props.identificacion ? estudio : '';
});
const hayDetalle = computed(() => {
  const d = props.detalleContexto;
  return !!d && !!(estudioEnDetalle.value || d.fecha || d.resultado || d.tipoSangre);
});

/** Solo lo que complementa al título: qué más se elimina y que no se puede deshacer. */
const descripcion = computed(() => {
  const loQueSeElimina =
    props.mensajePersonalizado ||
    (props.resumen
      ? fraseDeLoQueSeElimina(props.resumen)
      : props.nivel === 'robusto' && entidad.value
        ? fraseDependientesSinResumen(entidad.value)
        : null);
  return [loQueSeElimina, NO_SE_PUEDE_DESHACER].filter(Boolean).join(' ');
});

const avisoFinalizados = computed(() =>
  props.resumen ? avisoDocumentosFinalizados(props.resumen) : null,
);

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
        <div class="flex min-h-full justify-center p-4 sm:p-8 text-center items-center">
          <div
            class="modal-eliminacion modal-inner relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full sm:my-8 sm:max-w-lg"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="modal-eliminacion-titulo"
            @click.stop
          >
            <button
              type="button"
              class="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
              aria-label="Cerrar"
              title="Cerrar"
              data-testid="eliminacion-cerrar"
              :disabled="isBusy"
              @click="handleCancel"
            >
              <i class="fas fa-times" aria-hidden="true" />
            </button>
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
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                    />
                  </svg>
                </div>
                <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full min-w-0">
                  <h3
                    id="modal-eliminacion-titulo"
                    class="text-lg font-semibold leading-6 text-gray-900 sm:pr-8"
                    data-testid="eliminacion-titulo"
                  >
                    {{ titulo }}
                  </h3>
                  <div class="mt-2 space-y-3">
                    <div v-if="nombreDocumento || identificacion" class="space-y-0.5">
                      <p
                        v-if="nombreDocumento"
                        class="text-sm text-gray-700 break-words"
                        data-testid="eliminacion-nombre-documento"
                      >
                        Documento: <strong class="font-semibold text-gray-900">{{ nombreDocumento }}</strong>
                      </p>
                      <p
                        v-if="identificacion"
                        class="text-sm text-gray-700 break-words"
                        data-testid="eliminacion-identificacion"
                      >
                        {{ etiquetaIdentificacion }}: <strong class="font-semibold text-gray-900">{{ identificacion }}</strong>
                      </p>
                    </div>

                    <div
                      v-if="hayDetalle && detalleContexto"
                      class="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 space-y-1"
                    >
                      <div v-if="estudioEnDetalle" class="flex gap-2">
                        <span class="font-semibold">Estudio:</span>
                        <span>{{ estudioEnDetalle }}</span>
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

                    <p class="text-sm text-gray-500" data-testid="eliminacion-resumen">
                      {{ descripcion }}
                    </p>

                    <div
                      v-if="avisoFinalizados"
                      class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                      data-testid="eliminacion-aviso-finalizados"
                    >
                      <i class="fas fa-exclamation-triangle mr-1" />
                      {{ avisoFinalizados }}
                    </div>

                    <div v-if="requiereTexto" class="space-y-1">
                      <label for="modal-eliminacion-texto" class="block text-sm font-medium text-gray-700">
                        Escribe <strong class="font-semibold text-gray-900 break-words">{{ textoConfirmacionEsperado }}</strong> para confirmar
                      </label>
                      <input
                        id="modal-eliminacion-texto"
                        v-model="textoConfirmacion"
                        type="text"
                        autocomplete="off"
                        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                        :placeholder="textoConfirmacionEsperado"
                        @keyup.enter="handleConfirm"
                      />
                    </div>

                    <div v-if="requierePassword" class="space-y-1">
                      <label for="modal-eliminacion-password" class="block text-sm font-medium text-gray-700">
                        Confirma tu contraseña
                      </label>
                      <input
                        id="modal-eliminacion-password"
                        v-model="password"
                        type="password"
                        autocomplete="current-password"
                        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                        placeholder="Tu contraseña"
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
                class="inline-flex w-full items-center justify-center rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-3 sm:w-auto transition-transform duration-300 transform hover:scale-105"
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
  transition: opacity 150ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
