<script setup>
/**
 * «Usar las mediciones de la última exploración física»: copia peso, altura y cintura solo si
 * el usuario lo pide. Sale de los documentos del expediente ya cargados (sin consultas al
 * servidor); si no hay exploración física con mediciones, o se está editando, no aparece.
 */
import { computed, ref } from 'vue';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { obtenerSomatometriaUltimaExploracionFisica } from '@/helpers/cardiometabolico/alturaDesdeExploracionFisica';
import { fechaLegible } from '@/helpers/medicionesClinicas';

const props = defineProps({
  /** Qué mediciones usa el documento (el certificado expedito no lleva cintura). */
  conCintura: { type: Boolean, default: true },
  compacto: { type: Boolean, default: false },
});
const emit = defineEmits(['usar']);

const documentos = useDocumentosStore();
const trabajadores = useTrabajadoresStore();
const usada = ref(false);

const ultima = computed(() => {
  if (documentos.currentDocument) return null;
  const som = obtenerSomatometriaUltimaExploracionFisica(
    documentos.documentsByYear,
    trabajadores.currentTrabajador?._id,
  );
  if (!som) return null;
  const hay = som.peso != null || som.altura != null || (props.conCintura && som.circunferenciaCintura != null);
  return hay ? som : null;
});

const fecha = computed(() => fechaLegible(ultima.value?.fechaExploracionFisica));

const usar = () => {
  if (!ultima.value) return;
  const { peso, altura, circunferenciaCintura } = ultima.value;
  emit('usar', props.conCintura ? { peso, altura, circunferenciaCintura } : { peso, altura });
  usada.value = true;
};
</script>

<template>
  <div v-if="ultima" :class="compacto ? 'mb-2' : 'mb-4'" data-ultima-exploracion>
    <button
      v-if="!usada"
      type="button"
      class="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
      @click="usar"
    >
      <i class="fas fa-copy" aria-hidden="true"></i>
      Usar las mediciones de la última exploración física<template v-if="fecha"> ({{ fecha }})</template>
    </button>
    <p v-else class="text-xs text-gray-500" role="status">
      Mediciones de la exploración física<template v-if="fecha"> del {{ fecha }}</template>. Cámbialas si las mediste hoy.
    </p>
  </div>
</template>
