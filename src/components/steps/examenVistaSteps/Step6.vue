<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import NumeroCaptura from '../captura/NumeroCaptura.vue';
import { CLASE_ETIQUETA } from '../captura/estiloCaptura';
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
    <!-- Campo y resultado en un renglón, cada uno con su etiqueta y a la misma altura; en el
         asistente angosto el campo va a su medida (dos dígitos) y el resultado ocupa el resto -->
    <div
      data-campo="interpretacionIshihara"
      :class="['grid gap-3 items-start', capturaRapida ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-[8rem_minmax(0,1fr)]']"
    >
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
      <div class="min-w-0">
        <p :class="[CLASE_ETIQUETA, 'mb-1']">Resultado</p>
        <div
          data-calculado
          class="flex items-center justify-between gap-2 h-10 rounded-lg border border-gray-200 bg-gray-50 px-3"
        >
          <span class="text-sm font-bold text-gray-900 whitespace-nowrap" title="Porcentaje de placas correctas">
            {{ porcentajeIshihara != null ? `${porcentajeIshihara} %` : '—' }}
          </span>
          <span
            v-if="interpretacionIshihara"
            :class="['shrink-0 px-2 py-0.5 rounded-md text-sm font-medium text-white', colorAgudeza(interpretacionIshihara)]"
          >{{ interpretacionIshihara }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
