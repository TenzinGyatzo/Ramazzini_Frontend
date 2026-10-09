<script setup>
import { ref, watch, onMounted, computed, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import DocumentosAPI from '@/api/DocumentosAPI';
import { findNearestDocument } from '@/helpers/findNearestDocuments';
import {
  MEDIDAS_PREVENTIVAS,
  medidasPreventivasParaAptitud,
} from '@/helpers/medidasPreventivasAptitud';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const { formDataAptitud } = useFormDataStore();
const documentos = useDocumentosStore();
const trabajadores = useTrabajadoresStore();

// Valor local para la medidasPreventivas principal, inicializado con el valor actual del store
const medidasPreventivas = ref(formDataAptitud.medidasPreventivas || '');

// Sincronizar el valor seleccionado con formDataAptitud.medidasPreventivas
watch(medidasPreventivas, (newValue) => {
    formDataAptitud.medidasPreventivas = newValue;
});

// Documentos del trabajador y el más cercano de cada tipo a la fecha de la aptitud
const CAMPOS_FECHA = {
  historiaClinica: 'fechaHistoriaClinica',
  exploracionFisica: 'fechaExploracionFisica',
  examenVista: 'fechaExamenVista',
  audiometria: 'fechaAudiometria',
  trastornosEstadoAnimo: 'fechaTrastornosEstadoAnimo',
  cuestionarioProdromalBreve: 'fechaCuestionarioProdromalBreve',
  trastornoLimitePersonalidad: 'fechaTrastornoLimitePersonalidad',
  cuestionarioNordico: 'fechaCuestionarioNordico',
  evaluacionSuenoVigilia: 'fechaEvaluacionSuenoVigilia',
};

const vecinos = ref(null);
const cargandoVecinos = ref(true);

const documentosCercanos = computed(() => {
  if (!vecinos.value) return null;
  const cercanos = {};
  for (const [tipo, campoFecha] of Object.entries(CAMPOS_FECHA)) {
    cercanos[tipo] = findNearestDocument(
      vecinos.value[tipo] ?? [],
      formDataAptitud.fechaAptitudPuesto,
      campoFecha,
      { sameYearAsReference: true },
    );
  }
  return cercanos;
});

// Mismo requisito que el paso de alteraciones: sin estos dos documentos no hay base para sugerir
const faltanDocumentosBase = computed(
  () =>
    !!documentosCercanos.value &&
    (!documentosCercanos.value.historiaClinica || !documentosCercanos.value.exploracionFisica),
);

const medidasSugeridas = computed(() =>
  documentosCercanos.value && !faltanDocumentosBase.value
    ? medidasPreventivasParaAptitud(documentosCercanos.value)
    : [],
);

const textoSugerido = computed(() => medidasSugeridas.value.map((medida) => medida.texto).join(' '));

const hallazgosDetectados = computed(() =>
  medidasSugeridas.value.filter((medida) => medida.clave !== 'generico'),
);

const escribirSugerencia = () => {
  if (!textoSugerido.value) return;
  formDataAptitud.medidasPreventivas = textoSugerido.value;
  // Recordar lo generado: mientras el campo siga igual, se puede actualizar sin pisar al médico
  formDataAptitud.medidasPreventivasGeneradas = textoSugerido.value;
};

// Escribe la sugerencia solo si el campo está vacío o conserva intacto lo generado antes
const escribirSugerenciaSiNoSeEdito = () => {
  const actual = (formDataAptitud.medidasPreventivas || '').trim();
  const generadoAntes = (formDataAptitud.medidasPreventivasGeneradas || '').trim();
  if (actual === '' || (generadoAntes !== '' && actual === generadoAntes)) {
    escribirSugerencia();
  }
};

onMounted(async () => {
    if (documentos.currentDocument) {
        medidasPreventivas.value = documentos.currentDocument.medidasPreventivas;
    }

    try {
        const { data } = await DocumentosAPI.getAptitudInformeVecinos(trabajadores.currentTrabajadorId);
        vecinos.value = data ?? {};
    } catch (error) {
        console.error('Error al obtener los documentos para las medidas preventivas:', error);
    } finally {
        cargandoVecinos.value = false;
    }
});

// Al cargar los documentos y cada vez que cambian los más cercanos (p. ej. otra fecha de aptitud)
watch(textoSugerido, escribirSugerenciaSiNoSeEdito);

const textoEditado = computed(
  () =>
    !!textoSugerido.value &&
    (formDataAptitud.medidasPreventivas || '').trim() !== textoSugerido.value.trim(),
);

const medidaYaIncluida = (medida) =>
  (formDataAptitud.medidasPreventivas || '').includes(medida.texto);

// Pone o quita del campo el texto de una medida del catálogo
const alternarMedida = (medida) => {
  const actual = formDataAptitud.medidasPreventivas || '';
  if (medidaYaIncluida(medida)) {
    formDataAptitud.medidasPreventivas = actual
      .split(medida.texto)
      .join(' ')
      .replace(/ {2,}/g, ' ')
      .trim();
    return;
  }
  const base = actual.trim();
  formDataAptitud.medidasPreventivas = base ? `${base} ${medida.texto}` : medida.texto;
};
</script>

<template>
    <div>
    <h1 v-if="variant !== 'compact'" class="font-bold mb-4 text-gray-800 leading-5">Aptitud al Puesto</h1>
    <div :class="variant === 'compact' ? 'mb-2' : 'mb-4'">
        <h2 v-if="variant !== 'compact'" class="text-lg font-semibold mb-4 text-gray-800">Medidas Preventivas Específicas</h2>
        <p class="text-sm font-medium mb-1 text-gray-800 leading-4">Descripción de medidas específicas recomendadas:</p>
        <div class="font-light mb-2">
            <textarea
                :class="variant === 'compact'
                  ? 'w-full p-2 text-sm border border-gray-300 rounded-md text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 min-h-[12rem]'
                  : 'w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-64'"
                v-model="formDataAptitud.medidasPreventivas"
                :placeholder="cargandoVecinos ? 'Generando texto...' : ''"
                required>
            </textarea>
        </div>

        <!-- Qué se detectó y con qué se armó el texto -->
        <div class="mb-4 text-sm">
            <p v-if="cargandoVecinos" class="text-gray-500">
                <i class="fas fa-spinner fa-spin mr-1"></i>
                Revisando los documentos del trabajador...
            </p>
            <p v-else-if="!vecinos" class="text-gray-600">
                No se pudieron consultar los documentos del trabajador; escribe las medidas manualmente.
            </p>
            <p v-else-if="faltanDocumentosBase" class="text-gray-600">
                Hace falta registrar la historia clínica y/o la exploración física para sugerir las medidas.
            </p>
            <template v-else>
                <p class="text-gray-700 leading-5">
                    <span class="font-medium">Hallazgos considerados:</span>
                    {{ hallazgosDetectados.length
                        ? hallazgosDetectados.map((medida) => medida.hallazgo).join(', ') + '.'
                        : 'ninguno.' }}
                </p>
                <button
                    v-if="textoEditado"
                    type="button"
                    class="mt-2 inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-white px-3 py-1.5 text-sm font-medium text-emerald-600 transition-colors duration-200 hover:bg-emerald-50"
                    title="Reemplaza el texto del campo por las medidas sugeridas según los hallazgos"
                    @click="escribirSugerencia">
                    <i class="fas fa-rotate-right text-xs"></i>
                    Regenerar sugerencias
                </button>
            </template>
        </div>

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
