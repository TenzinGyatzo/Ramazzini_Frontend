<script setup lang="ts">
import { useEscapeToClose } from '@/composables/useEscapeToClose';

const props = defineProps<{
  nombreTrabajador: string;
  /** true mientras se guarda la baja: evita doble clic y cierre accidental. */
  confirmando?: boolean;
}>();

const emit = defineEmits<{
  (e: 'confirmar'): void;
  (e: 'cancelar'): void;
}>();

const cancelar = () => {
  if (!props.confirmando) emit('cancelar');
};

useEscapeToClose(cancelar);

// Qué implica la baja, en el orden en que el usuario suele preguntárselo
const implicaciones = [
  {
    icono: 'fa-solid fa-box-archive',
    color: 'text-orange-600',
    titulo: 'Se archiva, no se elimina',
    texto: 'Su expediente se conserva completo, con todos sus documentos y estudios.',
  },
  {
    icono: 'fa-solid fa-users-slash',
    color: 'text-orange-600',
    titulo: 'Sale de la plantilla activa',
    texto: 'Deja de aparecer en la tabla de trabajadores de este centro.',
  },
  {
    icono: 'fa-solid fa-chart-line',
    color: 'text-orange-600',
    titulo: 'Deja de contar en las estadísticas',
    texto: 'Ya no influye en las gráficas ni en los indicadores del dashboard.',
  },
  {
    icono: 'fa-solid fa-filter',
    color: 'text-sky-600',
    titulo: 'Lo puedes consultar cuando quieras',
    texto: 'En la tabla de trabajadores, abre «Filtros» y elige Estado Laboral: Inactivo.',
  },
  {
    icono: 'fa-solid fa-rotate-left',
    color: 'text-emerald-600',
    titulo: 'Se puede revertir',
    texto: 'Si el trabajador es recontratado, dale de alta de nuevo con el botón «Alta» y recupera su expediente.',
  },
];
</script>

<template>
  <div class="modal modal-baja-trabajador fixed top-0 left-0 z-50 flex h-screen w-full items-center justify-center p-4 sm:p-8">
    <!-- Fondo -->
    <div
      class="modal-work-overlay absolute top-0 left-0 h-full w-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm"
      @click="cancelar"
    ></div>

    <div
      class="modal-work-panel modal-inner relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white text-gray-800 shadow-md shadow-slate-900"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-baja-trabajador-titulo"
    >
      <!-- Encabezado -->
      <div class="flex items-start gap-3 border-b border-gray-200 px-5 py-4">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
          <i class="fa-solid fa-person-arrow-down-to-line text-orange-600"></i>
        </div>
        <div class="min-w-0 flex-1">
          <h1 id="modal-baja-trabajador-titulo" class="modal-baja-trabajador__titulo text-lg font-semibold text-gray-900">
            Dar de baja al trabajador
          </h1>
          <p class="truncate text-sm font-medium text-gray-700" :title="nombreTrabajador">
            {{ nombreTrabajador }}
          </p>
        </div>
        <button
          type="button"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-600"
          title="Cerrar"
          aria-label="Cerrar"
          :disabled="confirmando"
          @click="cancelar"
        >
          <i class="fa-solid fa-xmark text-base"></i>
        </button>
      </div>

      <!-- Qué implica -->
      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <p class="mb-3 text-sm text-gray-600">
          Usa la baja cuando el trabajador deja de laborar en la empresa. Esto es lo que pasa:
        </p>

        <ul class="space-y-3">
          <li v-for="item in implicaciones" :key="item.titulo" class="flex items-start gap-3">
            <i :class="[item.icono, item.color]" class="mt-0.5 w-5 shrink-0 text-center text-sm" aria-hidden="true"></i>
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900">{{ item.titulo }}</p>
              <p class="text-sm text-gray-600">{{ item.texto }}</p>
            </div>
          </li>
        </ul>
      </div>

      <!-- Acciones -->
      <div class="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
        <button
          type="button"
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="confirmando"
          @click="cancelar"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="confirmando"
          @click="emit('confirmar')"
        >
          <i v-if="confirmando" class="fa-solid fa-spinner fa-spin text-xs"></i>
          {{ confirmando ? 'Registrando baja...' : 'Dar de baja' }}
        </button>
      </div>
    </div>
  </div>
</template>
