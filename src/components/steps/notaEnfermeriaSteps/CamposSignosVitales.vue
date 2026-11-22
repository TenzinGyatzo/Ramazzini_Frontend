<script setup>
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import { computed, reactive } from 'vue';
import { RANGOS_SIGNOS_NOTA_ENFERMERIA, erroresSignosNotaEnfermeria } from '@/helpers/notaEnfermeria';
import { claseError, claseEtiquetaCampo, claseNumero } from './estilos';
import { vValorDePartida } from '@/directives/valorDePartida';
import { valorDePartida } from '@/helpers/valorDePartida';

/** Valor de partida de las flechas con el campo vacío (helpers/valorDePartida.ts). */
const CAMPO_DE_PARTIDA = {
  tensionArterialSistolica: 'tensionArterialSistolica',
  tensionArterialDiastolica: 'tensionArterialDiastolica',
  frecuenciaCardiaca: 'frecuenciaCardiaca',
  frecuenciaRespiratoria: 'frecuenciaRespiratoria',
  temperatura: 'temperatura',
  saturacionOxigeno: 'saturacionOxigeno',
  glucosaCapilar: 'glucosa',
};

/**
 * Una toma de signos vitales. Todo es opcional; un campo vacío no se guarda.
 * Dos columnas fijas: la tensión arterial queda en el mismo renglón.
 */
const props = defineProps({
  toma: { type: Object, required: true },
  /** Marca data-campo de cada signo («signosVitales.frecuenciaCardiaca»): para llevar al dato al guardar. */
  prefijoCampo: { type: String, default: '' },
});

const CAMPOS = [
  { clave: 'tensionArterialSistolica', etiqueta: 'TA sistólica', unidad: 'mmHg' },
  { clave: 'tensionArterialDiastolica', etiqueta: 'TA diastólica', unidad: 'mmHg' },
  { clave: 'frecuenciaCardiaca', etiqueta: 'Frec. cardiaca', unidad: 'lpm' },
  { clave: 'frecuenciaRespiratoria', etiqueta: 'Frec. resp.', unidad: 'rpm' },
  { clave: 'temperatura', etiqueta: 'Temperatura', unidad: '°C' },
  { clave: 'saturacionOxigeno', etiqueta: 'Saturación O2', unidad: '%' },
  { clave: 'glucosaCapilar', etiqueta: 'Glucosa capilar', unidad: 'mg/dl' },
  { clave: 'dolor', etiqueta: 'Dolor', unidad: '0 a 10' },
].map((campo) => ({
  ...campo,
  ...RANGOS_SIGNOS_NOTA_ENFERMERIA[campo.clave],
  // El dolor no tiene valor de partida (de 0 a 10, arranca en 0)
  partida: CAMPO_DE_PARTIDA[campo.clave] ? valorDePartida(CAMPO_DE_PARTIDA[campo.clave]) : null,
}));

const PAREJA = { tensionArterialSistolica: 'tensionArterialDiastolica', tensionArterialDiastolica: 'tensionArterialSistolica' };

/** Campos que ya se dejaron: «Falta la diastólica» espera a que se termine de escribir la sistólica. */
const tocados = reactive(new Set());

const errores = computed(() => erroresSignosNotaEnfermeria(props.toma));

const errorDe = (clave) => {
  const mensaje = errores.value[clave];
  if (!mensaje) return '';
  if (mensaje.startsWith('Falta')) return tocados.has(PAREJA[clave]) || tocados.has(clave) ? mensaje : '';
  return mensaje;
};

const valor = (clave) => props.toma[clave] ?? '';

const guardar = (clave, texto) => {
  if (texto === '' || texto == null || !Number.isFinite(Number(texto))) {
    delete props.toma[clave];
    return;
  }
  props.toma[clave] = Number(texto);
};

// Punto 46: en captura rápida las opciones y los campos aprovechan el ancho
const capturaRapida = enCapturaRapida();
</script>

<template>
  <div :class="['grid grid-cols-2 gap-x-3 gap-y-3', capturaRapida ? 'sm:grid-cols-3 md:grid-cols-4' : '']">
    <div
      v-for="campo in CAMPOS"
      :key="campo.clave"
      :data-campo="prefijoCampo ? `${prefijoCampo}.${campo.clave}` : undefined"
    >
      <label :class="claseEtiquetaCampo">
        <!-- Etiqueta y unidad en un solo renglón: todos los campos quedan alineados -->
        <span class="block truncate">
          {{ campo.etiqueta }} <span class="font-normal text-gray-400">({{ campo.unidad }})</span>
        </span>
        <input
          :value="valor(campo.clave)"
          type="number"
          inputmode="decimal"
          :min="campo.min"
          :max="campo.max"
          :step="campo.decimales ? 0.1 : 1"
          :placeholder="`${campo.min}-${campo.max}`"
          :data-signo="campo.clave"
          v-valor-de-partida="campo.partida"
          :aria-invalid="!!errorDe(campo.clave)"
          :class="[claseNumero(!!errorDe(campo.clave)), 'mt-1 font-normal']"
          @input="guardar(campo.clave, $event.target.value)"
          @blur="tocados.add(campo.clave)"
        />
      </label>
      <p v-if="errorDe(campo.clave)" :class="claseError" role="alert" :data-error-signo="campo.clave" data-error-en-linea>
        {{ errorDe(campo.clave) }}
      </p>
    </div>
  </div>
</template>
