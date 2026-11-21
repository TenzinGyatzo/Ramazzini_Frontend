<script setup>
/**
 * Diagnóstico de la audiometría (punto 44). Se redacta al contestar, como las observaciones:
 * resultado (Normal | Hipoacusia) y, con hipoacusia, tipo, lateralidad, severidad y causas
 * «Compatible con». El texto se rehace mientras no se edite a mano. Solo se guarda el texto;
 * las respuestas se conservan mientras dura la captura (al cambiar de sección o de modo).
 */
import { computed, inject, reactive, watch } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useAutofocoPrimerVacio } from '@/composables/useAutofocoPrimerVacio';
import { enCapturaRapida, ESTADO_SECCIONES_KEY } from '@/composables/capturaRapidaKey';
import OpcionesSegmentadas from '../captura/OpcionesSegmentadas.vue';
import { CLASE_AYUDA, CLASE_ETIQUETA, CLASE_INPUT, CLASE_TEXTAREA } from '../captura/estiloCaptura';
import {
  CAUSAS_COMPATIBLES,
  OPCIONES_LATERALIDAD,
  OPCIONES_RESULTADO,
  OPCIONES_SEVERIDAD,
  OPCIONES_TIPO,
  hayRespuestasDiagnostico,
  redactarDiagnosticoAudiometria,
  respuestasDiagnosticoVacias,
} from '@/helpers/audiometriaDiagnostico';

defineProps({ variant: { type: String, default: '' } });

// Al abrir el paso (asistente), si el diagnóstico está vacío, el cursor va a él
useAutofocoPrimerVacio(['diagnosticoAudiometria']);

const formDataStore = useFormDataStore();
const capturaRapida = enCapturaRapida();

// El campo es el del formulario (por el store: al editar, el documento puede llegar después
// del primer dibujo)
const diagnosticoAudiometria = computed({
  get: () => formDataStore.formDataAudiometria.diagnosticoAudiometria ?? '',
  set: (valor) => {
    formDataStore.formDataAudiometria.diagnosticoAudiometria = valor ?? '';
  },
});

// Las respuestas sobreviven a que el paso se vuelva a montar (otra sección, otro modo)
const estadoSecciones = inject(ESTADO_SECCIONES_KEY, null);
const guardadas = estadoSecciones?.diagnosticoAudiometria;
const respuestas = guardadas?.respuestas ?? reactive(respuestasDiagnosticoVacias());
const memoria = guardadas ?? reactive({ respuestas, redactado: '' });
if (estadoSecciones) estadoSecciones.diagnosticoAudiometria = memoria;

const redactado = computed(() => redactarDiagnosticoAudiometria(respuestas));
// El texto es de las respuestas mientras esté vacío o siga igual a lo último redactado
const textoPropio = computed(() => {
  const actual = diagnosticoAudiometria.value.trim();
  return actual !== '' && actual !== (memoria.redactado || '').trim();
});

watch(redactado, (texto) => {
  if (textoPropio.value) return;
  diagnosticoAudiometria.value = texto;
  memoria.redactado = texto;
});

function volverARedactar() {
  diagnosticoAudiometria.value = redactado.value;
  memoria.redactado = redactado.value;
}

// «Compatible con»: al elegir una causa se agrega (sin botón) y la lista vuelve a «Agregar una
// causa…» (se limpia en la lista misma: con v-model el valor no cambiaba y no se redibujaba)
function agregarCausa(evento) {
  const causa = evento.target.value;
  if (causa && !respuestas.compatibles.includes(causa)) respuestas.compatibles = [...respuestas.compatibles, causa];
  evento.target.value = '';
}
const quitarCausa = (causa) => {
  respuestas.compatibles = respuestas.compatibles.filter((c) => c !== causa);
};
</script>

<template>
  <h1 v-if="variant !== 'compact'" class="font-bold mb-4 text-gray-800 leading-5">Diagnóstico Audiométrico</h1>

  <div data-campo="diagnosticoAudiometria" class="space-y-3">
    <p :class="CLASE_AYUDA">Contesta y el diagnóstico se redacta solo; puedes editarlo.</p>

    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <p :class="CLASE_ETIQUETA">Resultado</p>
      <OpcionesSegmentadas
        v-model="respuestas.resultado"
        name="resultadoAudiometria"
        etiqueta="Resultado"
        compacto
        :opciones="OPCIONES_RESULTADO"
      />
    </div>

    <div v-if="respuestas.resultado === 'Hipoacusia'" class="pl-3 border-l-2 border-gray-200 space-y-3">
      <div :class="['grid gap-3', capturaRapida ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1']">
        <div>
          <p :class="[CLASE_ETIQUETA, 'mb-1 !text-xs']">Tipo</p>
          <OpcionesSegmentadas v-model="respuestas.tipo" name="tipoHipoacusia" etiqueta="Tipo de hipoacusia" separadas :opciones="OPCIONES_TIPO" />
        </div>
        <div>
          <p :class="[CLASE_ETIQUETA, 'mb-1 !text-xs']">Lateralidad</p>
          <OpcionesSegmentadas v-model="respuestas.lateralidad" name="lateralidadHipoacusia" etiqueta="Lateralidad" separadas :opciones="OPCIONES_LATERALIDAD" />
        </div>
        <div>
          <p :class="[CLASE_ETIQUETA, 'mb-1 !text-xs']">Severidad</p>
          <OpcionesSegmentadas v-model="respuestas.severidad" name="severidadHipoacusia" etiqueta="Severidad" separadas :opciones="OPCIONES_SEVERIDAD" />
        </div>
      </div>

      <div>
        <label for="compatibleCon" :class="[CLASE_ETIQUETA, 'mb-1 !text-xs']">
          Compatible con <span class="font-normal text-gray-400">(opcional)</span>
        </label>
        <select id="compatibleCon" :class="[CLASE_INPUT, 'min-w-0']" @change="agregarCausa">
          <option value="">Agregar una causa…</option>
          <optgroup v-for="grupo in CAUSAS_COMPATIBLES" :key="grupo.titulo" :label="grupo.titulo">
            <option v-for="opcion in grupo.opciones" :key="opcion" :value="opcion" :disabled="respuestas.compatibles.includes(opcion)">
              {{ opcion }}
            </option>
          </optgroup>
        </select>
        <div v-if="respuestas.compatibles.length" class="mt-2 flex flex-wrap gap-1.5">
          <span
            v-for="causa in respuestas.compatibles"
            :key="causa"
            class="inline-flex items-center gap-1 max-w-full rounded-lg border border-emerald-500 bg-emerald-50 px-2 py-1 text-xs text-emerald-800"
          >
            <span class="min-w-0">{{ causa }}</span>
            <button
              type="button"
              class="shrink-0 text-emerald-700 hover:text-red-600"
              :aria-label="`Quitar ${causa}`"
              @click="quitarCausa(causa)"
            >
              <i class="fas fa-xmark text-xs" aria-hidden="true"></i>
            </button>
          </span>
        </div>
      </div>
    </div>

    <div>
      <div class="flex flex-wrap items-baseline justify-between gap-x-3 mb-1">
        <label for="diagnosticoAudiometria" :class="CLASE_ETIQUETA">
          Diagnóstico <span class="text-red-500">*</span>
        </label>
        <button
          v-if="textoPropio && hayRespuestasDiagnostico(respuestas) && redactado"
          type="button"
          class="text-xs text-emerald-700 hover:underline inline-flex items-center gap-1"
          title="Reemplaza el texto por el que se redacta con las respuestas"
          @click="volverARedactar"
        >
          <i class="fas fa-rotate-right text-[10px]" aria-hidden="true"></i>
          Volver a redactar desde las respuestas
        </button>
      </div>
      <textarea
        id="diagnosticoAudiometria"
        v-model="diagnosticoAudiometria"
        rows="3"
        :class="CLASE_TEXTAREA"
        placeholder="Se redacta con las respuestas o escríbelo aquí"
        data-skip-validation
      ></textarea>
    </div>
  </div>
</template>
