<script setup>
import { ref, computed } from 'vue';
import HcSectionStep from './HcSectionStep.vue';
import Step42 from './Step42.vue';
import Step43 from './Step43.vue';
import Step44 from './Step44.vue';
import Step45 from './Step45.vue';
import { useFormDataStore } from '@/stores/formDataStore';

const { formDataHistoriaClinica } = useFormDataStore();

function trabajoTieneDatos(n) {
  const fd = formDataHistoriaClinica;
  const empresa = (fd[`empresaAnterior${n}`] || '').trim();
  const puesto = (fd[`puestoAnterior${n}`] || '').trim();
  const antiguedad = (fd[`antiguedadAnterior${n}`] || '').trim();
  const agentes = (fd[`agentesAnterior${n}`] || '').trim();
  return Boolean(empresa || puesto || antiguedad || agentes);
}

function contarTrabajosIniciales() {
  if (trabajoTieneDatos(3)) return 3;
  if (trabajoTieneDatos(2)) return 2;
  if (trabajoTieneDatos(1)) return 1;
  return 0;
}

const trabajosVisibles = ref(contarTrabajosIniciales());

const puedeAgregar = computed(() => trabajosVisibles.value < 3);
const puedeQuitar = computed(() => trabajosVisibles.value > 0);
const textoAgregar = computed(() =>
  trabajosVisibles.value === 0
    ? 'Registrar trabajo anterior'
    : 'Registrar otro trabajo anterior',
);

function agregarTrabajo() {
  if (trabajosVisibles.value < 3) {
    trabajosVisibles.value += 1;
  }
}

function quitarUltimoTrabajo() {
  if (trabajosVisibles.value <= 0) return;
  const n = trabajosVisibles.value;
  formDataHistoriaClinica[`empresaAnterior${n}`] = '';
  formDataHistoriaClinica[`puestoAnterior${n}`] = '';
  formDataHistoriaClinica[`antiguedadAnterior${n}`] = '';
  formDataHistoriaClinica[`agentesAnterior${n}`] = '';
  trabajosVisibles.value -= 1;
}
</script>

<template>
  <HcSectionStep title="Antecedentes laborales">
    <div class="space-y-3">
      <Step45 variant="compact" />

      <div class="border-t border-gray-200 my-3" role="separator" aria-hidden="true" />

      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 transform -translate-y-2"
        enter-to-class="opacity-100 transform translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 transform translate-y-0"
        leave-to-class="opacity-0 transform -translate-y-2"
      >
        <Step42 v-if="trabajosVisibles >= 1" key="trabajo-anterior-1" variant="compact" />
      </Transition>
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 transform -translate-y-2"
        enter-to-class="opacity-100 transform translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 transform translate-y-0"
        leave-to-class="opacity-0 transform -translate-y-2"
      >
        <Step43 v-if="trabajosVisibles >= 2" key="trabajo-anterior-2" variant="compact" />
      </Transition>
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 transform -translate-y-2"
        enter-to-class="opacity-100 transform translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 transform translate-y-0"
        leave-to-class="opacity-0 transform -translate-y-2"
      >
        <Step44 v-if="trabajosVisibles >= 3" key="trabajo-anterior-3" variant="compact" />
      </Transition>

      <div class="flex flex-wrap gap-2 pt-1 pb-2">
        <button
          v-if="puedeAgregar"
          type="button"
          class="flex-1 min-w-[12rem] px-3 py-2 text-sm font-semibold rounded-md border border-emerald-600 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          @click="agregarTrabajo"
        >
          {{ textoAgregar }}
        </button>
        <button
          v-if="puedeQuitar"
          type="button"
          class="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 transition-colors"
          @click="quitarUltimoTrabajo"
        >
          Quitar último
        </button>
      </div>
    </div>
  </HcSectionStep>
</template>
