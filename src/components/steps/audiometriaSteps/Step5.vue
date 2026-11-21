<script setup>
import { ref, computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { MENSAJE_DATOS_INSUFICIENTES, generarInterpretacionAudiometrica } from '@/helpers/audiometriaInterpretacion';

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

// Quick inserts ahora basados en la interpretación automática
/* const quickInserts = computed(() => [
  {
    id: 'interpretacion-automatica',
    titulo: 'Interpretación automática',
    texto: interpretacionAutomatica.value
  },
  {
    id: 'grafica-normal-bilateral',
    titulo: 'Gráfica normal bilateral',
    texto: 'Gráfica audiométrica de trazo horizontal bilateral dentro del rango de normalidad en todas sus frecuencias.'
  },
  {
    id: 'caida-oido-derecho',
    titulo: 'Caída oído derecho',
    texto: 'Gráfica audimétrica de trazo horizontal bilateral con caída del umbral de la audición del oído derecho en todas las frecuencias y en oído izquierdo dentro de rango de normalidad.'
  },
  {
    id: 'caida-oido-izquierdo',
    titulo: 'Caída oído izquierdo',
    texto: 'Gráfica audimétrica de trazo horizontal bilateral con caída del umbral de la audición del oído izquierdo en todas las frecuencias y en oído derecho dentro de rango de normalidad.'
  },
  {
    id: 'caida-izquierdo-3000-6000hz',
    titulo: 'Caída izquierdo 3000-6000 Hz',
    texto: 'Gráfica audiométrica de trazo horizontal bilateral, oído izquierdo con caída del umbral de audición de los 3000 a los 6000 Hz, oído derecho dentro del rango de normalidad en todas sus frecuencias.'
  },
  {
    id: 'caida-derecho-3000-6000hz',
    titulo: 'Caída derecho 3000-6000 Hz',
    texto: 'Gráfica audiométrica de trazo horizontal bilateral, oído derecho con caída del umbral de audición de los 3000 a los 6000 Hz, oído izquierdo dentro del rango de normalidad en todas sus frecuencias.'
  }
]); */

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

  <div class="mb-4">
    <h2 class="text-lg font-semibold mb-2 text-gray-800">Interpretación Audiométrica</h2>

    <!-- Textarea (source of truth local) -->
    <div class="font-light mb-4">
      <textarea
        class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-48"
        v-model="interpretacionAudiometrica"
        :placeholder="hayInterpretacionAutomatica ? '' : 'Captura los umbrales de ambos oídos para generar la interpretación.'"
        required
        data-skip-validation
      ></textarea>
    </div>

    <!-- De dónde salió el texto y cómo recuperarlo -->
    <div class="mb-4 text-sm">
      <p v-if="!hayInterpretacionAutomatica" class="text-gray-600">
        Datos insuficientes para generar la interpretación automática: se necesitan al menos tres frecuencias por oído.
      </p>
      <template v-else>
        <p class="text-gray-700 leading-5">
          La interpretación se genera a partir de los umbrales capturados; puedes editarla.
        </p>
        <button
          v-if="interpretacionEditada"
          type="button"
          class="mt-2 inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-white px-3 py-1.5 text-sm font-medium text-emerald-600 transition-colors duration-200 hover:bg-emerald-50"
          title="Reemplaza el texto del campo por la interpretación automática"
          @click="escribirInterpretacion"
        >
          <i class="fas fa-rotate-right text-xs"></i>
          Regenerar interpretación
        </button>
      </template>
    </div>

    <!-- === Quick Inserts === -->
    <!-- <div class="mb-2 flex items-center gap-2">
      <p class="font-medium text-gray-800 leading-5">Interpretaciones ejemplo:</p>
      <span v-if="mensajeCopiado" class="font-medium leading-5 text-emerald-600 text-sm">¡Copiado!</span>
    </div>

    <div class="grid grid-cols-1 gap-2">
      <div
        v-for="qi in quickInserts.slice(1)"
        :key="qi.id"
        class="flex items-center justify-between border rounded-lg p-2 bg-white"
      >
        <div>
          <p class="text-sm font-medium text-gray-800">{{ qi.titulo }}</p>
          <p class="text-xs text-gray-600 line-clamp-2">{{ qi.texto }}</p>
        </div>
        <div class="flex gap-2">
          <button
            class="px-3 py-1 rounded-md text-sm text-emerald-700 border border-emerald-600 hover:bg-emerald-50"
            @click="insertarQuick(qi.texto)"
            title="Insertar en textarea"
          >
            Insertar
          </button>
        </div>
      </div>
    </div> -->

  </div>
</template>
