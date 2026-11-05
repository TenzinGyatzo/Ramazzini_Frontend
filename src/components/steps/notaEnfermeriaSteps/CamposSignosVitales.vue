<script setup>
import { claseInput } from './estilos';

/** Una toma de signos vitales. Todo es opcional; un campo vacío no se guarda. */
const props = defineProps({
  toma: { type: Object, required: true },
});

const CAMPOS = [
  { clave: 'tensionArterialSistolica', etiqueta: 'TA sistólica', unidad: 'mmHg', min: 50, max: 300, paso: 1 },
  { clave: 'tensionArterialDiastolica', etiqueta: 'TA diastólica', unidad: 'mmHg', min: 20, max: 200, paso: 1 },
  { clave: 'frecuenciaCardiaca', etiqueta: 'Frec. cardiaca', unidad: 'lpm', min: 40, max: 220, paso: 1 },
  { clave: 'frecuenciaRespiratoria', etiqueta: 'Frec. respiratoria', unidad: 'rpm', min: 10, max: 99, paso: 1 },
  { clave: 'temperatura', etiqueta: 'Temperatura', unidad: '°C', min: 30, max: 44, paso: 0.1 },
  { clave: 'saturacionOxigeno', etiqueta: 'Saturación O2', unidad: '%', min: 50, max: 100, paso: 1 },
  { clave: 'glucosaCapilar', etiqueta: 'Glucosa capilar', unidad: 'mg/dl', min: 20, max: 999, paso: 1 },
  { clave: 'dolor', etiqueta: 'Dolor', unidad: '0 a 10', min: 0, max: 10, paso: 1 },
];

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
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
    <label v-for="campo in CAMPOS" :key="campo.clave" class="text-xs text-gray-600">
      {{ campo.etiqueta }} <span class="text-gray-400">({{ campo.unidad }})</span>
      <input
        :value="valor(campo.clave)"
        type="number"
        inputmode="decimal"
        :min="campo.min"
        :max="campo.max"
        :step="campo.paso"
        :data-signo="campo.clave"
        :class="claseInput"
        @input="guardar(campo.clave, $event.target.value)"
      />
    </label>
  </div>
</template>
