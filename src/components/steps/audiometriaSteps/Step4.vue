<script setup>
/**
 * Observaciones de la audiometría (punto 44). En lugar de las 13 plantillas (que reemplazaban
 * todo el texto con combinaciones fijas), unas cuantas preguntas que redactan el texto en el
 * cuadro mientras no se edite a mano. Solo se guarda el texto; las respuestas se conservan
 * mientras dura la captura (al cambiar de sección o de modo) y no viajan al servidor.
 */
import { computed, inject, reactive, watch } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { enCapturaRapida, ESTADO_SECCIONES_KEY } from '@/composables/capturaRapidaKey';
import OpcionesSegmentadas from '../captura/OpcionesSegmentadas.vue';
import OpcionesMultiples from '../captura/OpcionesMultiples.vue';
import { CLASE_AYUDA, CLASE_ETIQUETA, CLASE_INPUT, CLASE_TEXTAREA } from '../captura/estiloCaptura';
import {
  OPCIONES_ANTECEDENTES,
  OPCIONES_OTOSCOPIA,
  OPCIONES_PROTECCION,
  OPCIONES_SINTOMAS,
  alternar,
  aniosDesde,
  hayRespuestas,
  redactarObservacionesAudiometria,
  respuestasVacias,
} from '@/helpers/audiometriaObservaciones';

defineProps({ variant: { type: String, default: '' } });

const formDataStore = useFormDataStore();
const trabajadores = useTrabajadoresStore();
// Por el store (al editar, el documento puede llegar después del primer dibujo)
const df = () => formDataStore.formDataAudiometria;
const capturaRapida = enCapturaRapida();

const observaciones = computed({
  get: () => df().observacionesAudiometria ?? '',
  set: (valor) => {
    df().observacionesAudiometria = valor ?? '';
  },
});

// Las respuestas sobreviven a que el paso se vuelva a montar (otra sección, otro modo)
const estadoSecciones = inject(ESTADO_SECCIONES_KEY, null);
const guardadas = estadoSecciones?.observacionesAudiometria;
const respuestas = guardadas?.respuestas ?? reactive(respuestasVacias());
const memoria = guardadas ?? reactive({ respuestas, redactado: '' });
if (estadoSecciones) estadoSecciones.observacionesAudiometria = memoria;

const redactado = computed(() => redactarObservacionesAudiometria(respuestas));
// El texto es de las respuestas mientras esté vacío o siga igual a lo último redactado
const textoPropio = computed(() => {
  const actual = observaciones.value.trim();
  return actual !== '' && actual !== (memoria.redactado || '').trim();
});

watch(redactado, (texto) => {
  if (textoPropio.value) return;
  observaciones.value = texto;
  memoria.redactado = texto;
});

function volverARedactar() {
  observaciones.value = redactado.value;
  memoria.redactado = redactado.value;
}

const OPCIONES_NO_SI = [
  { valor: 'No', etiqueta: 'No' },
  { valor: 'Si', etiqueta: 'Sí' },
];
const exposicion = computed({
  get: () => respuestas.exposicion,
  set: (valor) => {
    respuestas.exposicion = valor;
    // Años: de partida, la antigüedad del trabajador en la empresa
    if (valor === 'Si' && respuestas.anios == null) {
      respuestas.anios = aniosDesde(trabajadores.currentTrabajador?.fechaIngreso);
    }
  },
});
const alEscribirAnios = (texto) => {
  respuestas.anios = texto.trim() === '' ? null : Number(texto);
};
</script>

<template>
  <h1 v-if="variant !== 'compact'" class="font-bold mb-4 text-gray-800 leading-5">Audiometría</h1>

  <div data-campo="observacionesAudiometria" class="space-y-3">
    <p v-if="variant !== 'compact'" class="text-lg font-semibold text-gray-800">Observaciones</p>
    <p :class="CLASE_AYUDA">Contesta lo que aplique y el texto se redacta solo; puedes editarlo.</p>

    <div :class="['grid gap-x-6 gap-y-3', capturaRapida ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1']">
      <!-- Exposición a ruido, años y protección -->
      <div class="space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p :class="CLASE_ETIQUETA">Exposición a ruido industrial</p>
          <OpcionesSegmentadas
            v-model="exposicion"
            name="exposicionRuido"
            etiqueta="Exposición a ruido industrial"
            compacto
            :opciones="OPCIONES_NO_SI"
          />
        </div>
        <div v-if="respuestas.exposicion === 'Si'" class="flex flex-wrap items-end gap-3 pl-3 border-l-2 border-gray-200">
          <div class="w-20">
            <label for="aniosExposicionRuido" :class="[CLASE_ETIQUETA, 'mb-1 !text-xs']">Años</label>
            <input
              id="aniosExposicionRuido"
              type="number"
              min="0"
              max="60"
              :class="[CLASE_INPUT, '!h-8']"
              :value="respuestas.anios ?? ''"
              @input="alEscribirAnios($event.target.value)"
            />
          </div>
          <div class="min-w-0">
            <p :class="[CLASE_ETIQUETA, 'mb-1 !text-xs']">Protección auditiva</p>
            <OpcionesSegmentadas
              v-model="respuestas.proteccion"
              name="proteccionAuditiva"
              etiqueta="Protección auditiva"
              separadas
              :opciones="OPCIONES_PROTECCION"
            />
          </div>
        </div>
      </div>

      <div>
        <p :class="[CLASE_ETIQUETA, 'mb-1']">Síntomas</p>
        <OpcionesMultiples
          name="sintomasAudiologicos"
          etiqueta="Síntomas"
          :opciones="OPCIONES_SINTOMAS"
          :seleccion="respuestas.sintomas"
          @alternar="(v) => (respuestas.sintomas = alternar(respuestas.sintomas, v, 'asintomatico'))"
        />
      </div>

      <div>
        <p :class="[CLASE_ETIQUETA, 'mb-1']">Otoscopia</p>
        <OpcionesMultiples
          name="otoscopia"
          etiqueta="Otoscopia"
          :opciones="OPCIONES_OTOSCOPIA"
          :seleccion="respuestas.otoscopia"
          @alternar="(v) => (respuestas.otoscopia = alternar(respuestas.otoscopia, v, 'normal'))"
        />
      </div>

      <div>
        <p :class="[CLASE_ETIQUETA, 'mb-1']">
          Antecedentes otológicos <span class="font-normal text-gray-400">(opcional)</span>
        </p>
        <OpcionesMultiples
          name="antecedentesOtologicos"
          etiqueta="Antecedentes otológicos"
          :opciones="OPCIONES_ANTECEDENTES"
          :seleccion="respuestas.antecedentes"
          @alternar="(v) => (respuestas.antecedentes = alternar(respuestas.antecedentes, v, null))"
        />
      </div>
    </div>

    <div>
      <div class="flex flex-wrap items-baseline justify-between gap-x-3 mb-1">
        <label for="observacionesAudiometria" :class="CLASE_ETIQUETA">Observaciones</label>
        <button
          v-if="textoPropio && hayRespuestas(respuestas) && redactado"
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
        id="observacionesAudiometria"
        v-model="observaciones"
        rows="3"
        :class="CLASE_TEXTAREA"
        placeholder="Se redacta con las respuestas o escríbelas aquí"
        data-skip-validation
      ></textarea>
    </div>
  </div>
</template>
