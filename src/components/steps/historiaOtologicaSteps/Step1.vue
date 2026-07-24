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
const fechaHistoriaOtologica = ref(today);

onMounted(() => {
  if (documentos.currentDocument) {
    fechaHistoriaOtologica.value = formatDateYYYYMMDD(
      documentos.currentDocument.fechaHistoriaOtologica || today,
    );
  }

  formDataStore.formDataHistoriaOtologica.idTrabajador =
    trabajadores.currentTrabajadorId;

  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataStore.formDataHistoriaOtologica.rutaPDF = buildClinicalDirectoryPath(
    empresa,
    centroTrabajo,
    trabajadorNombre,
    trabajadorId,
  );

  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    fechaHistoriaOtologica: fechaHistoriaOtologica.value,
  };
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.fechaHistoriaOtologica) {
    formDataStore.formDataHistoriaOtologica = {
      ...formDataStore.formDataHistoriaOtologica,
      fechaHistoriaOtologica: today,
    };
  }
});

watch(fechaHistoriaOtologica, (newValue) => {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    fechaHistoriaOtologica: newValue,
  };
});
</script>

<template>
  <div class="ho-step1">
    <h1
      v-if="variant !== 'compact'"
      class="text-2xl font-bold mb-4 text-gray-900"
    >
      Historia Otologica
    </h1>
    <div :class="variant === 'compact' ? 'mt-0' : 'mt-6'">
      <h2
        :class="
          variant === 'compact'
            ? 'text-sm font-medium mb-1.5 text-gray-800'
            : 'text-lg font-medium mb-3 text-gray-800'
        "
      >
        Fecha de valoración
      </h2>
      <input
        v-if="variant === 'compact'"
        type="date"
        v-model="fechaHistoriaOtologica"
        class="ho-date-compact w-full max-w-xs border border-gray-300 rounded-md px-2.5 py-1 text-sm text-gray-700 bg-white h-9 leading-none focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
      />
      <FormKit
        v-else
        type="date"
        name="fechaHistoriaOtologica"
        placeholder="Seleccione una fecha"
        v-model="fechaHistoriaOtologica"
      />
    </div>
  </div>
</template>
