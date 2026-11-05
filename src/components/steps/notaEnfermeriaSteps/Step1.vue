<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useSiresDocumentDateMax } from '@/composables/useSiresDocumentDateMax';
import { RELACIONES_TEMPORALES_NOTA_ENFERMERIA } from '@/helpers/notaEnfermeria';
import { claseEtiqueta, claseInput, claseOpcion } from './estilos';

const trabajadores = useTrabajadoresStore();
const { formDataNotaEnfermeria } = useFormDataStore();
const documentos = useDocumentosStore();
const { fechaDocumentoMax, fechaDocumentoMin } = useSiresDocumentDateMax();

const today = format(new Date(), 'yyyy-MM-dd');
const fechaNotaEnfermeria = ref(today);

onMounted(() => {
  if (documentos.currentDocument) {
    fechaNotaEnfermeria.value = formatDateYYYYMMDD(documentos.currentDocument.fechaNotaEnfermeria || today);
  } else if (formDataNotaEnfermeria.fechaNotaEnfermeria) {
    // Documento nuevo y se regresó al paso 1: conservar la fecha ya elegida
    fechaNotaEnfermeria.value = formatDateYYYYMMDD(formDataNotaEnfermeria.fechaNotaEnfermeria);
  }
  formDataNotaEnfermeria.idTrabajador = trabajadores.currentTrabajadorId;
  // La norma pide la hora de la atención: por defecto, la de ahora
  if (!formDataNotaEnfermeria.horaAtencion) {
    formDataNotaEnfermeria.horaAtencion = format(new Date(), 'HH:mm');
  }
});

onUnmounted(() => {
  if (!formDataNotaEnfermeria.fechaNotaEnfermeria) {
    formDataNotaEnfermeria.fechaNotaEnfermeria = today;
  }
});

watch(fechaNotaEnfermeria, (valor) => {
  formDataNotaEnfermeria.fechaNotaEnfermeria = valor;
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Nota de enfermería</h1>
    <p class="text-xs italic text-gray-500">Atención de enfermería. Sin diagnóstico CIE-10.</p>

    <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <h2 class="text-lg font-medium mb-3 text-gray-800">Fecha de la atención</h2>
        <FormKit
          type="date"
          name="fechaNotaEnfermeria"
          placeholder="Seleccione una fecha"
          :min="fechaDocumentoMin"
          :max="fechaDocumentoMax"
          v-model="fechaNotaEnfermeria"
        />
      </div>
      <div>
        <h2 class="text-lg font-medium mb-3 text-gray-800">Hora</h2>
        <input
          v-model="formDataNotaEnfermeria.horaAtencion"
          type="time"
          data-campo="horaAtencion"
          :class="claseInput"
        />
      </div>
    </div>

    <div class="mt-5" data-pregunta="relacionTemporal">
      <p :class="claseEtiqueta">¿Es la primera vez que se le atiende por este motivo?</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opcion in RELACIONES_TEMPORALES_NOTA_ENFERMERIA"
          :key="opcion.clave"
          type="button"
          :class="claseOpcion(formDataNotaEnfermeria.relacionTemporal === opcion.clave)"
          :aria-pressed="formDataNotaEnfermeria.relacionTemporal === opcion.clave"
          @click="formDataNotaEnfermeria.relacionTemporal = opcion.clave"
        >
          {{ opcion.etiqueta }}
        </button>
      </div>
    </div>

    <div class="mt-5">
      <p :class="claseEtiqueta">Motivo de atención</p>
      <textarea
        v-model="formDataNotaEnfermeria.motivoAtencion"
        rows="3"
        maxlength="2000"
        data-campo="motivoAtencion"
        placeholder="Por qué acude el trabajador"
        :class="claseInput"
      ></textarea>
    </div>
  </div>
</template>
