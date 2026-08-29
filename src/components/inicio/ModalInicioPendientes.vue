<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { InicioPendienteItem } from '@/interfaces/inicio-resumen.interface';

const props = defineProps<{
  open: boolean;
  items: InicioPendienteItem[];
  title?: string;
}>();

const emit = defineEmits<{ close: [] }>();
const router = useRouter();

async function irAlExpediente(item: InicioPendienteItem) {
  emit('close');
  await router.push({
    name: 'expediente-medico',
    params: {
      idEmpresa: item.idEmpresa,
      idCentroTrabajo: item.idCentroTrabajo,
      idTrabajador: item.idTrabajador,
    },
  });
}
</script>

<template>
  <div
    v-if="open"
    class="modal fixed top-0 left-0 z-[100] p-4 sm:p-8 h-screen w-full grid place-items-center"
  >
    <div
      class="absolute top-0 left-0 w-full h-full bg-slate-900 bg-opacity-60 backdrop-blur-sm"
      @click="emit('close')"
    />
    <div class="modal-inner relative bg-white text-gray-900 w-full max-w-2xl p-6 sm:p-8 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col dark:bg-slate-800 dark:text-slate-100">
      <button
        class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        type="button"
        @click="emit('close')"
      >
        <i class="fas fa-times text-2xl"></i>
      </button>
      <div class="mb-6 pr-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">
          {{ title ?? 'Pendientes de finalizar' }}
        </h2>
        <p class="text-sm text-gray-600">
          Documentos en borrador que puede abrir desde el expediente para revisarlos o finalizarlos.
        </p>
      </div>
      <div class="inicio-modal-scroll min-h-0 flex-1 overflow-y-auto space-y-3 p-1.5">
        <p v-if="items.length === 0" class="text-sm text-gray-500">
          No hay pendientes en este momento.
        </p>
        <button
          v-for="item in items"
          :key="item.idDocumento"
          type="button"
          class="w-full text-left border border-gray-200 rounded-xl p-4 hover:border-emerald-400 transition-colors"
          @click="irAlExpediente(item)"
        >
          <p class="font-medium text-gray-900">{{ item.nombreTrabajador }}</p>
          <p class="text-sm text-gray-600 mt-1">
            {{ item.etiquetaTipo }}
            <span v-if="item.elaboradorUsername"> · {{ item.elaboradorUsername }}</span>
          </p>
          <span class="mt-2 inline-block text-sm font-medium text-blue-600">
            Ir al expediente
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inicio-modal-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgb(148 163 184 / 0.7) transparent;
}
.inicio-modal-scroll::-webkit-scrollbar {
  width: 3px;
}
.inicio-modal-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.inicio-modal-scroll::-webkit-scrollbar-thumb {
  background-color: rgb(148 163 184 / 0.7);
  border-radius: 9999px;
}
.dark .inicio-modal-scroll {
  scrollbar-color: rgb(71 85 105 / 0.8) transparent;
}
.dark .inicio-modal-scroll::-webkit-scrollbar-thumb {
  background-color: rgb(71 85 105 / 0.8);
}
</style>
