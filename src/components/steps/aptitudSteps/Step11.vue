<script setup>
/**
 * Medidas preventivas (punto 45). La sugerencia por hallazgo la escribe el guardado en los dos
 * modos, sin pisar lo editado (helpers/aptitudGuardado); aquí se ve qué se detectó y se ponen o
 * quitan medidas del catálogo. El paso ya no consulta al servidor ni escribe al abrirse.
 */
import { computed, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { contextoAptitud } from '@/helpers/aptitudContexto';
import { medidasSugeridas } from '@/helpers/aptitudGuardado';
import { MEDIDAS_PREVENTIVAS } from '@/helpers/medidasPreventivasAptitud';
import TextoGeneradoAptitud from './TextoGeneradoAptitud.vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const formDataStore = useFormDataStore();
const df = () => formDataStore.formDataAptitud;

const hallazgosDetectados = computed(() =>
  contextoAptitud.datos ? medidasSugeridas(contextoAptitud.datos, df()).filter((m) => m.clave !== 'generico') : [],
);

const medidaYaIncluida = (medida) => (df().medidasPreventivas || '').includes(medida.texto);

// Pone o quita del campo el texto de una medida del catálogo
const alternarMedida = (medida) => {
  const actual = df().medidasPreventivas || '';
  if (medidaYaIncluida(medida)) {
    df().medidasPreventivas = actual.split(medida.texto).join(' ').replace(/ {2,}/g, ' ').trim();
    return;
  }
  const base = actual.trim();
  df().medidasPreventivas = base ? `${base} ${medida.texto}` : medida.texto;
};
</script>

<template>
    <div>
    <h1 v-if="variant !== 'compact'" class="font-bold mb-4 text-gray-800 leading-5">Aptitud al Puesto</h1>
    <div data-campo="medidasPreventivas" data-desplazar="no" :class="variant === 'compact' ? 'mb-2' : 'mb-4'">
        <h2 v-if="variant !== 'compact'" class="text-lg font-semibold mb-4 text-gray-800">Medidas Preventivas Específicas</h2>
        <TextoGeneradoAptitud
            campo="medidasPreventivas"
            etiqueta="Descripción de medidas específicas recomendadas:"
            sin-texto="Hace falta registrar la historia clínica y/o la exploración física para sugerir las medidas; escríbelas a mano."
            :variant="variant"
        />
        <p v-if="contextoAptitud.datos && hallazgosDetectados.length" class="mt-2 mb-4 text-sm text-gray-700 leading-5">
            <span class="font-medium">Hallazgos considerados:</span>
            {{ hallazgosDetectados.map((medida) => medida.hallazgo).join(', ') }}.
        </p>
        <div v-else class="mb-4"></div>

        <!-- Catálogo: agregar una medida a mano -->
        <div class="mb-4">
            <p class="text-sm mb-2 text-gray-800 leading-5">Recomendaciones en el texto (clic para poner o quitar):</p>
            <div class="flex flex-wrap gap-2">
                <button
                    v-for="medida in MEDIDAS_PREVENTIVAS"
                    :key="medida.clave"
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors duration-200"
                    :class="medidaYaIncluida(medida)
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50'"
                    :aria-pressed="medidaYaIncluida(medida)"
                    :title="medida.texto"
                    @click="alternarMedida(medida)">
                    <i :class="medidaYaIncluida(medida) ? 'fas fa-check' : 'fas fa-plus'" class="text-xs"></i>
                    {{ medida.hallazgo }}
                </button>
            </div>
        </div>
    </div>
    </div>
</template>
