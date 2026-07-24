<script setup>
import { ref, watch, onMounted, onUnmounted, toRefs } from 'vue';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { buildClinicalDirectoryPath } from '@/helpers/clinicalPath';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
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

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const formDataStore = useFormDataStore();
const documentos = useDocumentosStore();

const today = format(new Date(), 'yyyy-MM-dd');
const fechaAntidoping = ref(today);

onMounted(() => {
  if (documentos.currentDocument) {
    fechaAntidoping.value = formatDateYYYYMMDD(
      documentos.currentDocument.fechaAntidoping || today,
    );
  }

  formDataStore.formDataAntidoping.idTrabajador =
    trabajadores.currentTrabajadorId;

  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataStore.formDataAntidoping.rutaPDF = buildClinicalDirectoryPath(
    empresa,
    centroTrabajo,
    trabajadorNombre,
    trabajadorId,
  );

  // Sincronizar fecha inicial al store para el visualizador.
  formDataStore.formDataAntidoping = {
    ...formDataStore.formDataAntidoping,
    fechaAntidoping: fechaAntidoping.value,
  };
});

onUnmounted(() => {
  if (!formDataStore.formDataAntidoping.fechaAntidoping) {
    formDataStore.formDataAntidoping = {
      ...formDataStore.formDataAntidoping,
      fechaAntidoping: today,
    };
  }
});

watch(fechaAntidoping, (newValue) => {
  formDataStore.formDataAntidoping = {
    ...formDataStore.formDataAntidoping,
    fechaAntidoping: newValue,
  };
});
</script>

<template>
  <div class="antidoping-step1">
    <h1
      v-if="variant !== 'compact'"
      class="text-2xl font-bold mb-4 text-gray-900"
    >
      Antidoping
    </h1>
    <div :class="variant === 'compact' ? 'mt-0' : 'mt-6'">
      <h2
        :class="
          variant === 'compact'
            ? 'text-sm font-medium mb-1.5 text-gray-800'
            : 'text-lg font-medium mb-3 text-gray-800'
        "
      >
        Fecha de realización de la prueba
      </h2>
      <input
        v-if="variant === 'compact'"
        type="date"
        v-model="fechaAntidoping"
        class="antidoping-date-compact w-full max-w-xs border border-gray-300 rounded-md px-2.5 py-1 text-sm text-gray-700 bg-white h-9 leading-none focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
      />
      <FormKit
        v-else
        type="date"
        name="fechaAntidoping"
        placeholder="Seleccione una fecha"
        v-model="fechaAntidoping"
      />
    </div>
  </div>
</template>
