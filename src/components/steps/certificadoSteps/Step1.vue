<script setup>
import CampoFecha from '@/components/fecha/CampoFecha.vue';
import { ref, watch, onMounted, onUnmounted, toRefs, computed } from 'vue';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { buildClinicalDirectoryPath } from '@/helpers/clinicalPath';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useSiresDocumentDateMax } from '@/composables/useSiresDocumentDateMax';
import {
  MODALIDADES_CERTIFICADO,
  normalizarModalidadCertificado,
} from '@/helpers/certificadoModalidad';

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
const { fechaDocumentoMax, fechaDocumentoMin } = useSiresDocumentDateMax();

const today = format(new Date(), 'yyyy-MM-dd');
const fechaCertificado = ref(today);
/** Con resultados clínicos (predeterminado) o por interrogatorio médico; se guarda con el documento. */
const modalidad = ref(
  normalizarModalidadCertificado(
    formDataStore.formDataCertificado.modalidadCertificado ??
      documentos.currentDocument?.modalidadCertificado,
  ),
);
const ayudaModalidad = computed(
  () => MODALIDADES_CERTIFICADO.find((m) => m.value === modalidad.value)?.ayuda ?? '',
);

onMounted(() => {
  if (documentos.currentDocument) {
    fechaCertificado.value = formatDateYYYYMMDD(
      documentos.currentDocument.fechaCertificado || today,
    );
  } else if (formDataStore.formDataCertificado.fechaCertificado) {
    // Documento nuevo y se regresó al paso 1: conservar la fecha ya elegida
    fechaCertificado.value = formatDateYYYYMMDD(formDataStore.formDataCertificado.fechaCertificado);
  }

  formDataStore.formDataCertificado.idTrabajador =
    trabajadores.currentTrabajadorId;

  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataStore.formDataCertificado.rutaPDF = buildClinicalDirectoryPath(
    empresa,
    centroTrabajo,
    trabajadorNombre,
    trabajadorId,
  );

  formDataStore.formDataCertificado = {
    ...formDataStore.formDataCertificado,
    fechaCertificado: fechaCertificado.value,
    modalidadCertificado: modalidad.value,
  };
});

watch(modalidad, (valor) => {
  formDataStore.formDataCertificado = {
    ...formDataStore.formDataCertificado,
    modalidadCertificado: valor,
  };
});

onUnmounted(() => {
  if (!formDataStore.formDataCertificado.fechaCertificado) {
    formDataStore.formDataCertificado = {
      ...formDataStore.formDataCertificado,
      fechaCertificado: today,
    };
  }
});

watch(fechaCertificado, (newValue) => {
  formDataStore.formDataCertificado = {
    ...formDataStore.formDataCertificado,
    fechaCertificado: newValue,
  };
});
</script>

<template>
  <div class="certificado-step1">
    <h1
      v-if="variant !== 'compact'"
      class="text-2xl font-bold mb-4 text-gray-900"
    >
      Certificado
    </h1>
    <div :class="variant === 'compact' ? 'mt-0' : 'mt-6'">
      <h2
        :class="
          variant === 'compact'
            ? 'text-sm font-medium mb-1.5 text-gray-800'
            : 'text-lg font-medium mb-3 text-gray-800'
        "
      >
        Fecha del certificado
      </h2>
      <CampoFecha
        v-if="variant === 'compact'"
        v-model="fechaCertificado"
        :min="fechaDocumentoMin"
        :max="fechaDocumentoMax"
        class="certificado-date-compact w-full max-w-xs border border-gray-300 rounded-md px-2.5 py-1 text-sm text-gray-700 bg-white h-9 leading-none focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
      />
      <FormKit
        v-else
        type="date"
        name="fechaCertificado"
        placeholder="Seleccione una fecha"
        :min="fechaDocumentoMin"
        :max="fechaDocumentoMax"
        v-model="fechaCertificado"
      />
    </div>

    <div :class="variant === 'compact' ? 'mt-3' : 'mt-6'" data-campo="modalidadCertificado">
      <h2
        :class="
          variant === 'compact'
            ? 'text-sm font-medium mb-1.5 text-gray-800'
            : 'text-lg font-medium mb-3 text-gray-800'
        "
      >
        Contenido del certificado
      </h2>
      <div class="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Contenido del certificado">
        <button
          v-for="opcion in MODALIDADES_CERTIFICADO"
          :key="opcion.value"
          type="button"
          role="radio"
          :aria-checked="modalidad === opcion.value"
          :data-modalidad="opcion.value"
          :class="[
            'rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors',
            modalidad === opcion.value
              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
              : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400',
          ]"
          @click="modalidad = opcion.value"
        >
          {{ opcion.etiqueta }}
        </button>
      </div>
      <p class="mt-1.5 text-xs text-gray-500" data-ayuda-modalidad>{{ ayudaModalidad }}</p>
    </div>
  </div>
</template>
