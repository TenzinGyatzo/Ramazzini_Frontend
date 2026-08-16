<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { BorradorPendienteItem } from '@/composables/useBorradoresNotaMedica';
import { useBorradoresNotaMedica } from '@/composables/useBorradoresNotaMedica';

defineProps<{
  propios: BorradorPendienteItem[];
  equipo: BorradorPendienteItem[];
  showEquipo: boolean;
}>();

const emit = defineEmits(['closeModal']);

const router = useRouter();
const { navigateToExpediente } = useBorradoresNotaMedica();

const closeModal = () => {
  emit('closeModal');
};

async function irAlExpediente(item: BorradorPendienteItem) {
  closeModal();
  await navigateToExpediente(router, item);
}
</script>

<template>
  <div class="modal fixed top-0 left-0 z-[100] p-4 sm:p-8 h-screen w-full grid place-items-center">
    <div
      class="absolute top-0 left-0 w-full h-full bg-slate-900 bg-opacity-60 backdrop-blur-sm"
      @click="closeModal"
    />

    <Transition appear name="fade-scale">
      <div class="modal-inner relative bg-white text-gray-900 w-full max-w-2xl p-6 sm:p-8 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <button
          class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          @click="closeModal"
        >
          <i class="fas fa-times text-2xl"></i>
        </button>

        <div class="mb-6 pr-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Borradores pendientes</h2>
          <p class="text-sm text-gray-600">
            Notas médicas en borrador que requieren atención. Puedes ir al expediente para revisarlas o finalizarlas.
          </p>
        </div>

        <div class="overflow-y-auto space-y-6 pr-1">
          <section v-if="propios.length > 0">
            <h3 class="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
              Mis borradores
            </h3>
            <ul class="space-y-3">
              <li
                v-for="item in propios"
                :key="item.id"
                class="border border-gray-200 rounded-xl p-4"
              >
                <p class="font-medium text-gray-900">{{ item.trabajadorNombre }}</p>
                <p class="text-sm text-gray-600 mt-1">{{ item.mensajeContextual }}</p>
                <button
                  type="button"
                  class="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                  @click="irAlExpediente(item)"
                >
                  Ir al expediente
                </button>
              </li>
            </ul>
          </section>

          <section v-if="showEquipo && equipo.length > 0">
            <h3 class="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
              Borradores del equipo
            </h3>
            <ul class="space-y-3">
              <li
                v-for="item in equipo"
                :key="item.id"
                class="border border-gray-200 rounded-xl p-4"
              >
                <p class="font-medium text-gray-900">{{ item.trabajadorNombre }}</p>
                <p class="text-sm text-gray-600 mt-1">{{ item.mensajeContextual }}</p>
                <button
                  type="button"
                  class="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                  @click="irAlExpediente(item)"
                >
                  Ir al expediente
                </button>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.2s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
