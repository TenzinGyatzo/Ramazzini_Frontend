<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import NumeroCaptura from '../captura/NumeroCaptura.vue';
import { colorAgudeza } from './colorAgudeza';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const capturaRapida = enCapturaRapida();

// En la sección (variant compact) el título lo pone la sección; solo en el asistente anterior
const { variant } = defineProps({ variant: { type: String, default: '' } });

const { formDataExamenVista } = useFormDataStore();
const documentos = useDocumentosStore();

// Punto 43: el paso no escribe al abrirse ni al cerrarse (en la captura rápida está abierto
// desde el principio); lo preseleccionado lo escribe examenVistaGuardado al revisar la sección.
// Lo ya capturado en esta sesión; los valores por defecto solo aplican la primera vez
const placasCorrectas = ref(formDataExamenVista.placasCorrectas ?? 14);
const porcentajeIshihara = ref(formDataExamenVista.porcentajeIshihara ?? 100);
const interpretacionIshihara = ref(formDataExamenVista.interpretacionIshihara ?? 'Normal');

// Computed properties para validaciones y mensajes de error
const mensajeErrorPlacas = computed(() => {
  return placasCorrectas.value < 0 
    ? 'Debe ser mínimo 0' 
    : placasCorrectas.value > 14 
      ? 'Debe ser máximo 14' 
      : '';
});


onMounted(() => {
  if(documentos.currentDocument) {
    placasCorrectas.value = documentos.currentDocument.placasCorrectas;
    porcentajeIshihara.value = documentos.currentDocument.porcentajeIshihara;
    interpretacionIshihara.value = documentos.currentDocument.interpretacionIshihara;
  }
});

// Observa los cambios y actualiza el store y los campos relacionados
watch([placasCorrectas], () => {
  formDataExamenVista.placasCorrectas = placasCorrectas.value;
  interpretarIshihara();
});

// Función para interpretar la agudeza visual
function interpretarIshihara() {
  porcentajeIshihara.value = Math.round(formDataExamenVista.placasCorrectas * 100 / 14)
  formDataExamenVista.porcentajeIshihara = porcentajeIshihara.value
  if (formDataExamenVista.porcentajeIshihara >= 80) {
    interpretacionIshihara.value = "Normal";
    formDataExamenVista.interpretacionIshihara = interpretacionIshihara.value;
  } else {
    interpretacionIshihara.value = "Daltonismo";
    formDataExamenVista.interpretacionIshihara = interpretacionIshihara.value;
  }
}
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Visión cromática</h1>
    <div data-campo="interpretacionIshihara" :class="['grid gap-3', capturaRapida ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1']">
      <NumeroCaptura
        id="placasCorrectas"
        v-model="placasCorrectas"
        etiqueta="Placas correctas (prueba de Ishihara)"
        etiqueta-corta="Placas correctas"
        unidad="de 14"
        :min="0"
        :max="14"
        placeholder="14"
        :error="mensajeErrorPlacas"
      />
      <div
        data-calculado
        :class="['flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2', capturaRapida ? 'sm:mt-6' : '']"
      >
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Porcentaje</p>
          <p class="text-base font-bold text-gray-900 leading-tight">{{ porcentajeIshihara != null ? `${porcentajeIshihara} %` : '—' }}</p>
        </div>
        <span
          v-if="interpretacionIshihara"
          :class="['shrink-0 px-2.5 py-1 rounded-md text-sm font-semibold text-white', colorAgudeza(interpretacionIshihara)]"
        >{{ interpretacionIshihara }}</span>
      </div>
    </div>
  </div>
</template>
