<script setup lang="ts">
import { computed } from 'vue';
import { useEscapeToClose } from '@/composables/useEscapeToClose';
import type { ResumenEliminacion } from '@/utils/resumenEliminacion';
import {
  lineasDeUbicaciones,
  sugerenciaBloqueo,
  tituloBloqueo,
  ubicacionesRestantes,
} from '@/utils/resumenEliminacion';

/**
 * Eliminación que no se puede hacer: se informa de inmediato, sin pedir contraseña ni
 * que se escriba el nombre, con el motivo y dónde está lo que la impide.
 */
const props = defineProps<{
  resumen: ResumenEliminacion | null;
}>();

const emit = defineEmits<{ close: [] }>();

const titulo = computed(() => (props.resumen ? tituloBloqueo(props.resumen) : ''));
const lineas = computed(() => (props.resumen ? lineasDeUbicaciones(props.resumen) : []));
const restantes = computed(() => (props.resumen ? ubicacionesRestantes(props.resumen) : null));
const sugerencia = computed(() => (props.resumen ? sugerenciaBloqueo(props.resumen) : null));

const cerrar = () => emit('close');
useEscapeToClose(cerrar, () => props.resumen != null);
</script>

<template>
  <Transition name="fade">
    <div v-if="resumen" class="relative z-[70]">
      <div
        class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur-sm"
        @click="cerrar"
      />
      <div class="fixed inset-0 z-10 w-screen overflow-y-auto" @click.self="cerrar">
        <div class="flex min-h-full justify-center p-8 text-center items-center">
          <div
            class="modal-eliminacion modal-inner relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
            role="alertdialog"
            aria-modal="true"
            @click.stop
          >
            <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div
                  class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 sm:mx-0 sm:h-10 sm:w-10"
                >
                  <i class="fas fa-lock text-amber-600" />
                </div>
                <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <h3 class="text-lg font-semibold leading-6 text-gray-900">
                    {{ titulo }}
                  </h3>
                  <div class="mt-2 space-y-3">
                    <p v-if="resumen.nombre" class="text-md text-gray-500">
                      <strong>"{{ resumen.nombre }}"</strong>
                    </p>
                    <p class="text-md text-gray-500">{{ resumen.mensaje }}</p>

                    <div
                      v-if="lineas.length"
                      class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                    >
                      <p class="font-semibold mb-1">Dónde están:</p>
                      <ul class="list-disc pl-5 space-y-0.5">
                        <li v-for="linea in lineas" :key="linea">{{ linea }}</li>
                      </ul>
                      <p v-if="restantes" class="mt-1">{{ restantes }}</p>
                    </div>

                    <p v-if="sugerencia" class="text-sm text-gray-500">{{ sugerencia }}</p>
                    <p class="text-sm text-gray-500">No se eliminó nada.</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                class="inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-100 sm:w-auto transition-transform duration-300 transform hover:scale-105"
                @click="cerrar"
              >
                Entendido
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
