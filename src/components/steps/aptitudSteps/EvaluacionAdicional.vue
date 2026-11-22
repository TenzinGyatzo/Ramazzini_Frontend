<script setup>
/**
 * Una evaluación adicional de la aptitud (pasos 2 a 7, punto 45: antes un archivo por
 * evaluación). En captura rápida, nombre · fecha · resultados en un renglón; en el asistente,
 * uno debajo del otro.
 */
import { computed, onMounted } from 'vue';
import { format } from 'date-fns';
import CampoFecha from '@/components/fecha/CampoFecha.vue';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { useFormDataStore } from '@/stores/formDataStore';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import { CLASE_ETIQUETA, CLASE_INPUT } from '../captura/estiloCaptura';

const props = defineProps({
  n: { type: Number, required: true },
  variant: { type: String, default: 'fullscreen' },
});

const formDataStore = useFormDataStore();
// Por el store (al editar, el documento puede llegar después del primer dibujo)
const df = () => formDataStore.formDataAptitud;
const capturaRapida = enCapturaRapida();
const isCompact = computed(() => props.variant === 'compact');
const today = format(new Date(), 'yyyy-MM-dd');

const campo = (base) => `${base}${props.n}`;
const modelo = (base) =>
  computed({
    get: () => df()[campo(base)] ?? '',
    set: (v) => {
      df()[campo(base)] = v;
    },
  });
const nombre = modelo('evaluacionAdicional');
const fecha = modelo('fechaEvaluacionAdicional');
const resultados = modelo('resultadosEvaluacionAdicional');

const evaluacionSugerencias = [
  'Tipo de Sangre',
  'Audiometría',
  'Espirometría',
  'Estudios de laboratorio',
  'Rx simple de tórax',
  'Rx columna lumbar',
  'Rx rodillas',
  'Electrocardiograma',
];

onMounted(() => {
  const tieneNombre = String(df()[campo('evaluacionAdicional')] || '').trim();
  const tieneResultados = String(df()[campo('resultadosEvaluacionAdicional')] || '').trim();
  const fechaRaw = df()[campo('fechaEvaluacionAdicional')];
  if (fechaRaw) {
    df()[campo('fechaEvaluacionAdicional')] = formatDateYYYYMMDD(fechaRaw);
  } else if (!isCompact.value) {
    // Asistente clásico: al visitar el paso, fecha = hoy (comportamiento de siempre)
    df()[campo('fechaEvaluacionAdicional')] = today;
  } else if (tieneNombre || tieneResultados) {
    // Por secciones: solo si la evaluación ya tiene datos; las vacías no se contaminan
    df()[campo('fechaEvaluacionAdicional')] = today;
  }
});
</script>

<template>
  <div>
    <h1 v-if="!isCompact" class="text-2xl font-bold mb-4 text-gray-900">EVALUACIÓN ADICIONAL {{ n }}</h1>
    <p v-else class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Evaluación {{ n }}</p>

    <div :class="['grid gap-2', capturaRapida ? 'grid-cols-1 sm:grid-cols-[minmax(0,1fr)_11rem_minmax(0,1.6fr)]' : 'grid-cols-1']">
      <div class="min-w-0">
        <label :for="campo('nombreEvaluacion')" :class="[CLASE_ETIQUETA, 'mb-1']">Evaluación, prueba o estudio</label>
        <input
          :id="campo('nombreEvaluacion')"
          v-model="nombre"
          type="text"
          :name="campo('nombreEvaluacion')"
          data-skip-validation
          :class="CLASE_INPUT"
          :list="`evaluaciones-sugerencias-${n}`"
          placeholder="Selecciona o escribe"
        />
        <datalist :id="`evaluaciones-sugerencias-${n}`">
          <option v-for="sugerencia in evaluacionSugerencias" :key="sugerencia" :value="sugerencia" />
        </datalist>
      </div>

      <div class="min-w-0">
        <label :class="[CLASE_ETIQUETA, 'mb-1']">Fecha de resultados</label>
        <CampoFecha :name="campo('fechaEvaluacion')" :class="CLASE_INPUT" v-model="fecha" />
      </div>

      <div class="min-w-0">
        <label :for="campo('resultadosEvaluacion')" :class="[CLASE_ETIQUETA, 'mb-1']">Resultados o alteraciones</label>
        <input
          :id="campo('resultadosEvaluacion')"
          v-model="resultados"
          type="text"
          :name="campo('resultadosEvaluacion')"
          data-skip-validation
          :class="CLASE_INPUT"
          placeholder="Describe el resultado"
        />
      </div>
    </div>
  </div>
</template>
