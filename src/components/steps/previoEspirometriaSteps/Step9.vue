<script setup>
import { watch, ref, onMounted, onUnmounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const formDataStore = useFormDataStore();
const documentos = useDocumentosStore();

const disnea = ref('NINGUNA');

function syncToStore(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    disnea: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    disnea.value = documentos.currentDocument.disnea || 'NINGUNA';
  } else {
    disnea.value = formDataStore.formDataPrevioEspirometria.disnea || 'NINGUNA';
  }
  syncToStore(disnea.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.disnea) {
    syncToStore(disnea.value);
  }
});

watch(disnea, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="pe-step9">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">DISNEA</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Síntomas Respiratorios</h2>
    </template>

    <div :class="variant === 'compact' ? 'mb-2' : 'mb-8'">
      <p
        :class="
          variant === 'compact'
            ? 'text-sm font-semibold mb-2 text-gray-800'
            : 'text-lg font-medium mb-4 text-gray-800'
        "
      >
        ¿El trabajador sufre de disnea?
      </p>
      <div class="grid grid-cols-2 gap-2 sm:gap-3">
        <label
          v-for="opt in ['NINGUNA', 'AL ESFUERZO', 'EN REPOSO']"
          :key="opt"
          :class="[
            'relative flex flex-col items-center justify-center rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            variant === 'compact' ? 'py-2 px-3' : 'py-3 px-4',
            disnea === opt
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input type="radio" :value="opt" v-model="disnea" class="sr-only" />
          <span
            :class="[
              'font-semibold transition-colors duration-200',
              variant === 'compact' ? 'text-sm' : 'text-base',
              disnea === opt ? 'text-emerald-700' : 'text-gray-700',
            ]"
          >
            {{ opt }}
          </span>
          <div
            v-if="disnea === opt"
            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>
      </div>
    </div>
  </div>
</template>
