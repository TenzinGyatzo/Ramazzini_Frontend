<script setup>
import { computed, reactive } from 'vue';
import { RANGOS_SIGNOS_NOTA_ENFERMERIA, erroresSignosNotaEnfermeria } from '@/helpers/notaEnfermeria';
import { claseError, claseEtiquetaCampo, claseNumero } from './estilos';

/**
 * Una toma de signos vitales. Todo es opcional; un campo vacío no se guarda.
 * Dos columnas fijas: la tensión arterial queda en el mismo renglón.
 */
const props = defineProps({
  toma: { type: Object, required: true },
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
].map((campo) => ({ ...campo, ...RANGOS_SIGNOS_NOTA_ENFERMERIA[campo.clave] }));

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
</script>

<template>
  <div class="grid grid-cols-2 gap-x-3 gap-y-3">
    <div v-for="campo in CAMPOS" :key="campo.clave">
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
          :aria-invalid="!!errorDe(campo.clave)"
          :class="[claseNumero(!!errorDe(campo.clave)), 'mt-1 font-normal']"
          @input="guardar(campo.clave, $event.target.value)"
          @blur="tocados.add(campo.clave)"
        />
      </label>
      <p v-if="errorDe(campo.clave)" :class="claseError" role="alert" :data-error-signo="campo.clave">
        {{ errorDe(campo.clave) }}
      </p>
    </div>
  </div>
</template>
