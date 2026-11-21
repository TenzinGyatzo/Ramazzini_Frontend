<script setup>
import { ref, computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { MENSAJE_DATOS_INSUFICIENTES, generarInterpretacionAudiometrica } from '@/helpers/audiometriaInterpretacion';
import { CLASE_AYUDA, CLASE_ETIQUETA, CLASE_TEXTAREA } from '../captura/estiloCaptura';

defineProps({ variant: { type: String, default: '' } });

const mensajeCopiado = ref(false);

const formDataStore = useFormDataStore();
// Por el store (al editar, el documento puede llegar después del primer dibujo)
const df = () => formDataStore.formDataAudiometria;

/** === 1) TEXTAREA: usa ref local y sincroniza al store === */
// Punto 44: el campo es el del formulario. La interpretación generada la escribe
// audiometriaGuardado (mientras no se edite), en los dos modos, se abra o no este paso.
const interpretacionAudiometrica = computed({
  get: () => df().interpretacionAudiometrica ?? '',
  set: (valor) => {
    df().interpretacionAudiometrica = valor ?? '';
  },
});

/** === 2) UTILIDAD COPIAR === */
const copiarTexto = async (texto) => {
  try {
    await navigator.clipboard.writeText(texto);
    mensajeCopiado.value = true;
    setTimeout(() => (mensajeCopiado.value = false), 2000);
  } catch (err) {
    console.error('Error al copiar el texto: ', err);
  }
};

/** =========================================================================================
 * 3) GENERACIÓN AUTOMÁTICA DE INTERPRETACIÓN AUDIOMÉTRICA
 * ======================================================================================= */

// Generar interpretación automática basada en los valores audiométricos
// Punto 44: el generador vive en helpers/audiometriaInterpretacion (lo usa también el guardado)
const interpretacionAutomatica = computed(() => generarInterpretacionAudiometrica(df()));


/** === 4) LA INTERPRETACIÓN SE ESCRIBE DIRECTO EN EL CAMPO === */

const hayInterpretacionAutomatica = computed(
  () => !!interpretacionAutomatica.value && interpretacionAutomatica.value !== MENSAJE_DATOS_INSUFICIENTES,
);

const escribirInterpretacion = () => {
  if (!hayInterpretacionAutomatica.value) return;
  interpretacionAudiometrica.value = interpretacionAutomatica.value;
  // Recordar lo generado: mientras el campo siga igual, se puede actualizar sin pisar al médico
  df().interpretacionAudiometricaGenerada = interpretacionAutomatica.value;
};


const interpretacionEditada = computed(
  () =>
    hayInterpretacionAutomatica.value &&
    (interpretacionAudiometrica.value || '').trim() !== interpretacionAutomatica.value.trim(),
);


</script>

<template>
  <h1 v-if="variant !== 'compact'" class="font-bold mb-4 text-gray-800 leading-5">Audiometría</h1>

  <div data-campo="interpretacionAudiometrica">
    <div class="flex flex-wrap items-baseline justify-between gap-x-3 mb-1">
      <label for="interpretacionAudiometrica" :class="CLASE_ETIQUETA">Interpretación audiométrica</label>
      <button
        v-if="interpretacionEditada"
        type="button"
        class="text-xs text-emerald-700 hover:underline inline-flex items-center gap-1"
        title="Reemplaza el texto del campo por la interpretación automática"
        @click="escribirInterpretacion"
      >
        <i class="fas fa-rotate-right text-[10px]" aria-hidden="true"></i>
        Regenerar interpretación
      </button>
    </div>
    <textarea
      id="interpretacionAudiometrica"
      v-model="interpretacionAudiometrica"
      rows="4"
      :class="CLASE_TEXTAREA"
      :placeholder="hayInterpretacionAutomatica ? '' : 'Se genera al capturar los umbrales de los dos oídos.'"
      data-skip-validation
    ></textarea>
    <p :class="[CLASE_AYUDA, 'mt-1']">
      {{
        hayInterpretacionAutomatica
          ? 'Se genera a partir de los umbrales capturados; puedes editarla.'
          : 'Para generarla se necesitan al menos tres frecuencias por oído.'
      }}
    </p>
  </div>
</template>
