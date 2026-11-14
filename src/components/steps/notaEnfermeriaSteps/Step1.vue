<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useSiresDocumentDateMax } from '@/composables/useSiresDocumentDateMax';
import { RELACIONES_TEMPORALES_NOTA_ENFERMERIA } from '@/helpers/notaEnfermeria';
import Requerido from './Requerido.vue';
import { claseEtiqueta, claseInput, claseOpcionLista } from './estilos';

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
  // La fecha que se ve ya cuenta como capturada (si no, al guardar se pediría aunque se vea)
  formDataNotaEnfermeria.fechaNotaEnfermeria = fechaNotaEnfermeria.value;
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

    <div class="mt-5 grid grid-cols-2 gap-3">
      <div data-campo="fechaNotaEnfermeria">
        <p :class="claseEtiqueta">Fecha de la atención <Requerido /></p>
        <FormKit
          type="date"
          name="fechaNotaEnfermeria"
          placeholder="Seleccione una fecha"
          :min="fechaDocumentoMin"
          :max="fechaDocumentoMax"
          v-model="fechaNotaEnfermeria"
        />
      </div>
      <div data-campo="horaAtencion">
        <p :class="claseEtiqueta">Hora <Requerido /></p>
        <!-- Mismo control que la fecha, para que se vean iguales -->
        <FormKit
          type="time"
          name="horaAtencion"
          v-model="formDataNotaEnfermeria.horaAtencion"
        />
      </div>
    </div>

    <div class="mt-5" data-pregunta="relacionTemporal" data-campo="relacionTemporal">
      <p :class="claseEtiqueta">¿Es la primera vez que se le atiende por este motivo? <Requerido /></p>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="opcion in RELACIONES_TEMPORALES_NOTA_ENFERMERIA"
          :key="opcion.clave"
          type="button"
          :class="claseOpcionLista(formDataNotaEnfermeria.relacionTemporal === opcion.clave)"
          :aria-pressed="formDataNotaEnfermeria.relacionTemporal === opcion.clave"
          @click="formDataNotaEnfermeria.relacionTemporal = opcion.clave"
        >
          {{ opcion.etiqueta }}
        </button>
      </div>
    </div>

    <div class="mt-5" data-campo="motivoAtencion">
      <p :class="claseEtiqueta">Motivo de atención <Requerido /></p>
      <textarea
        v-model="formDataNotaEnfermeria.motivoAtencion"
        rows="3"
        maxlength="2000"
        placeholder="Por qué acude el trabajador"
        :class="claseInput"
      ></textarea>
    </div>
  </div>
</template>
