<script setup>
import { computed, onMounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import {
  AREAS_SUENO_VIGILIA,
  CLASE_NIVEL_SUENO_VIGILIA,
  ETIQUETA_NIVEL_SUENO_VIGILIA,
  FRECUENCIAS_SUENO_VIGILIA,
  TITULO_MODULO_SUENO_VIGILIA,
  asegurarGruposSuenoVigilia,
  calcularResultadoEvaluacionSuenoVigilia,
  preguntasSuenoVigiliaDelModulo,
  valorFrecuenciaSuenoVigilia,
} from '@/helpers/evaluacionSuenoVigilia';

/** Un módulo de la evaluación (sueño o vigilia): sus preguntas de frecuencia agrupadas por área. */
const props = defineProps({
  modulo: { type: String, required: true, validator: (v) => ['sueno', 'vigilia'].includes(v) },
});

const formData = useFormDataStore();

const areas = computed(() =>
  AREAS_SUENO_VIGILIA.filter((area) => area.modulo === props.modulo).map((area) => ({
    ...area,
    preguntas: preguntasSuenoVigiliaDelModulo(props.modulo).filter((pregunta) => pregunta.area === area.clave),
  })),
);

const resultado = computed(() => calcularResultadoEvaluacionSuenoVigilia(formData.formDataEvaluacionSuenoVigilia));

const respuesta = (clave) =>
  valorFrecuenciaSuenoVigilia(formData.formDataEvaluacionSuenoVigilia[props.modulo]?.[clave]);

const responder = (clave, valor) => {
  asegurarGruposSuenoVigilia(formData.formDataEvaluacionSuenoVigilia)[props.modulo][clave] = valor;
};

/**
 * Al montar el paso, las preguntas que aún no tienen respuesta quedan en «Nunca»
 * (mismo criterio que los demás cuestionarios). Una respuesta ya capturada no se toca.
 */
function asegurarNuncaPorDefecto() {
  const respuestas = asegurarGruposSuenoVigilia(formData.formDataEvaluacionSuenoVigilia)[props.modulo];
  for (const pregunta of preguntasSuenoVigiliaDelModulo(props.modulo)) {
    if (valorFrecuenciaSuenoVigilia(respuestas[pregunta.clave]) === null) respuestas[pregunta.clave] = 0;
  }
}

onMounted(asegurarNuncaPorDefecto);
asegurarNuncaPorDefecto();

const claseOpcion = (seleccionada, valor) => {
  if (!seleccionada) return 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50/50';
  if (valor === 3) return 'border-red-600 bg-red-50 text-red-800 shadow-sm';
  if (valor === 2) return 'border-orange-500 bg-orange-50 text-orange-800 shadow-sm';
  if (valor === 1) return 'border-yellow-500 bg-yellow-50 text-yellow-800 shadow-sm';
  return 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm';
};
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-1 text-gray-900">Evaluación de sueño y vigilia</h1>
    <h2 class="text-lg font-semibold text-gray-700">{{ TITULO_MODULO_SUENO_VIGILIA[modulo] }}</h2>
    <p class="mt-2 text-sm text-gray-600 leading-snug">
      «En el último mes, ¿con qué frecuencia…». Cada pregunta inicia en «Nunca».
    </p>

    <div v-for="area in areas" :key="area.clave" class="mt-4" :data-area="area.clave">
      <div class="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-200 pb-1">
        <h3 class="text-base font-semibold text-gray-900">{{ area.etiqueta }}</h3>
        <span class="text-sm font-medium" :class="CLASE_NIVEL_SUENO_VIGILIA[resultado.areas[area.clave].nivel].texto">
          {{ ETIQUETA_NIVEL_SUENO_VIGILIA[resultado.areas[area.clave].nivel] }}
        </span>
      </div>

      <div
        v-for="pregunta in area.preguntas"
        :key="pregunta.clave"
        class="mt-3"
        :data-pregunta="pregunta.clave"
      >
        <p class="mb-1.5 text-sm font-medium text-gray-800 leading-snug">{{ pregunta.texto }}</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="(opcion, valor) in FRECUENCIAS_SUENO_VIGILIA"
            :key="opcion"
            type="button"
            class="px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all duration-150 ease-in-out"
            :class="claseOpcion(respuesta(pregunta.clave) === valor, valor)"
            :aria-pressed="respuesta(pregunta.clave) === valor"
            @click="responder(pregunta.clave, valor)"
          >
            {{ opcion }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
