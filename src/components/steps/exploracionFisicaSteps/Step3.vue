<script setup>
import { useValorDePartida } from '@/composables/useValorDePartida';
import { ref, watch, onMounted, computed, toRefs } from 'vue';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import {
  SOMATOMETRIA_SIGNOS_RANGES,
  mensajeErrorSomatometriaSignosField,
} from '@/helpers/somatometriaSignosRanges';
import { esMedicion } from '@/helpers/medicionesClinicas';
import NumeroCaptura from '@/components/steps/captura/NumeroCaptura.vue';
import { colorCategoria } from '@/components/steps/captura/colorCategoria';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';

import { useAutofocoPrimerVacio } from '@/composables/useAutofocoPrimerVacio';

// Al abrir el paso, el cursor va al primer dato obligatorio vacío
useAutofocoPrimerVacio([
  'tensionArterialSistolica',
  'tensionArterialDiastolica',
  'frecuenciaCardiaca',
  'frecuenciaRespiratoria',
  'saturacionOxigeno',
]);

const partida = useValorDePartida();
const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);
// Punto 41: un solo diseño en los dos modos, como los signos vitales de la nota médica
const capturaRapida = enCapturaRapida();

const { formDataExploracionFisica } = useFormDataStore();
const documentos = useDocumentosStore();

// Sin valores por defecto: se escribe lo que se midió. Sin medición no hay categoría.
const tensionArterialSistolica = ref(null);
const tensionArterialDiastolica = ref(null);
const categoriaTensionArterial = ref('');
const frecuenciaCardiaca = ref(null);
const categoriaFrecuenciaCardiaca = ref('');
const frecuenciaRespiratoria = ref(null);
const categoriaFrecuenciaRespiratoria = ref('');
const saturacionOxigeno = ref(null);
const categoriaSaturacionOxigeno = ref('');

onMounted(() => {
  // Prioridad: formData > documentos.currentDocument > vacío
  if (formDataExploracionFisica.tensionArterialSistolica !== undefined) {
    tensionArterialSistolica.value = formDataExploracionFisica.tensionArterialSistolica;
    tensionArterialDiastolica.value = formDataExploracionFisica.tensionArterialDiastolica;
    categoriaTensionArterial.value = formDataExploracionFisica.categoriaTensionArterial;
    frecuenciaCardiaca.value = formDataExploracionFisica.frecuenciaCardiaca;
    categoriaFrecuenciaCardiaca.value = formDataExploracionFisica.categoriaFrecuenciaCardiaca;
    frecuenciaRespiratoria.value = formDataExploracionFisica.frecuenciaRespiratoria;
    categoriaFrecuenciaRespiratoria.value = formDataExploracionFisica.categoriaFrecuenciaRespiratoria;
    saturacionOxigeno.value = formDataExploracionFisica.saturacionOxigeno;
    categoriaSaturacionOxigeno.value = formDataExploracionFisica.categoriaSaturacionOxigeno;
  } else if (documentos.currentDocument) {
    tensionArterialSistolica.value = documentos.currentDocument.tensionArterialSistolica;
    tensionArterialDiastolica.value = documentos.currentDocument.tensionArterialDiastolica;
    categoriaTensionArterial.value = documentos.currentDocument.categoriaTensionArterial;
    frecuenciaCardiaca.value = documentos.currentDocument.frecuenciaCardiaca;
    categoriaFrecuenciaCardiaca.value = documentos.currentDocument.categoriaFrecuenciaCardiaca;
    frecuenciaRespiratoria.value = documentos.currentDocument.frecuenciaRespiratoria;
    categoriaFrecuenciaRespiratoria.value = documentos.currentDocument.categoriaFrecuenciaRespiratoria;
    saturacionOxigeno.value = documentos.currentDocument.saturacionOxigeno;
    categoriaSaturacionOxigeno.value = documentos.currentDocument.categoriaSaturacionOxigeno;
  }
  // Se copia al formulario lo que se ve (con documento nuevo, vacío): así el formulario y la
  // pantalla coinciden y las categorías corresponden a lo capturado.
  guardarEnFormulario();
});


watch([tensionArterialSistolica, tensionArterialDiastolica, frecuenciaCardiaca, frecuenciaRespiratoria, saturacionOxigeno], () => {
  guardarEnFormulario();
});

/** Copia los signos (y sus categorías) al formulario. */
function guardarEnFormulario() {
  formDataExploracionFisica.tensionArterialSistolica = tensionArterialSistolica.value;
  formDataExploracionFisica.tensionArterialDiastolica = tensionArterialDiastolica.value;
  setCategoriaTensionArterial();
  formDataExploracionFisica.frecuenciaCardiaca = frecuenciaCardiaca.value;
  setCategoriaFrecuenciaCardiaca();
  formDataExploracionFisica.frecuenciaRespiratoria = frecuenciaRespiratoria.value;
  setCategoriaFrecuenciaRespiratoria();
  formDataExploracionFisica.saturacionOxigeno = saturacionOxigeno.value;
  setCategoriaSaturacionOxigeno();
}

function setCategoriaTensionArterial() {
  let sistolica = formDataExploracionFisica.tensionArterialSistolica;
  let diastolica = formDataExploracionFisica.tensionArterialDiastolica;
  let categoriaSistolica = '';
  let categoriaDiastolica = '';
  let categoria = '';

  if (!esMedicion(sistolica)) {
    // Sin sistólica no hay categoría
    categoriaTensionArterial.value = '';
    formDataExploracionFisica.categoriaTensionArterial = '';
    return;
  }
  if (sistolica <= 120) {
    categoriaSistolica = 'Óptima';
  } else if (sistolica >= 121 && sistolica <= 130) {
    categoriaSistolica = 'Normal';
  } else if (sistolica >= 131 && sistolica <= 139) {
    categoriaSistolica = 'Alta';
  } else if (sistolica >= 140 && sistolica <= 159) {
    categoriaSistolica = 'Hipertensión grado 1';
  } else if (sistolica >= 160 && sistolica <= 179) {
    categoriaSistolica = 'Hipertensión grado 2';
  } else {
    categoriaSistolica = 'Hipertensión grado 3';
  }

  // Mientras falta la diastólica (es obligatoria; el aviso al guardar la pide), la categoría
  // sale de la sistólica
  if (!esMedicion(diastolica)) {
    categoriaDiastolica = '';
  } else if (diastolica <= 80) {
    categoriaDiastolica = 'Óptima';
  } else if (diastolica >= 81 && diastolica <= 85) {
    categoriaDiastolica = 'Normal';
  } else if (diastolica >= 86 && diastolica <= 89) {
    categoriaDiastolica = 'Alta';
  } else if (diastolica >= 90 && diastolica <= 99) {
    categoriaDiastolica = 'Hipertensión grado 1';
  } else if (diastolica >= 100 && diastolica <= 109) {
    categoriaDiastolica = 'Hipertensión grado 2';
  } else {
    categoriaDiastolica = 'Hipertensión grado 3';
  }

  if (categoriaSistolica === 'Hipertensión grado 3' || categoriaDiastolica === 'Hipertensión grado 3') {
    categoria = 'Hipertensión grado 3';
  } else if (categoriaSistolica === 'Hipertensión grado 2' || categoriaDiastolica === 'Hipertensión grado 2') {
    categoria = 'Hipertensión grado 2';
  } else if (categoriaSistolica === 'Hipertensión grado 1' || categoriaDiastolica === 'Hipertensión grado 1') {
    categoria = 'Hipertensión grado 1';
  } else if (categoriaSistolica === 'Alta' || categoriaDiastolica === 'Alta') {
    categoria = 'Alta';
  } else if (categoriaSistolica === 'Normal' || categoriaDiastolica === 'Normal') {
    categoria = 'Normal';
  } else {
    categoria = 'Óptima';
  }

  categoriaTensionArterial.value = categoria;
  formDataExploracionFisica.categoriaTensionArterial = categoria;
}

function setCategoriaFrecuenciaCardiaca() {
  let frecuencia = formDataExploracionFisica.frecuenciaCardiaca;
  let categoria = '';

  if (!esMedicion(frecuencia)) {
    categoria = '';
  } else if (frecuencia < 60) {
    categoria = 'Excelente';
  } else if (frecuencia >= 60 && frecuencia <= 80) {
    categoria = 'Buena';
  } else if (frecuencia >= 81 && frecuencia <= 100) {
    categoria = 'Normal';
  } else if (frecuencia >= 101 && frecuencia <= 120) {
    categoria = 'Elevada';
  } else if (frecuencia >= 121 && frecuencia <= 140) {
    categoria = 'Alta';
  } else {
    categoria = 'Muy Alta';
  }

  categoriaFrecuenciaCardiaca.value = categoria;
  formDataExploracionFisica.categoriaFrecuenciaCardiaca = categoria;
}

function setCategoriaFrecuenciaRespiratoria() {
  let frecuencia = formDataExploracionFisica.frecuenciaRespiratoria;
  let categoria = '';

  if (!esMedicion(frecuencia)) {
    categoria = '';
  } else if (frecuencia < 12) {
    categoria = 'Bradipnea';
  } else if (frecuencia >= 12 && frecuencia <= 20) {
    categoria = 'Normal';
  } else if (frecuencia >= 21 && frecuencia <= 24) {
    categoria = 'Taquipnea';
  } else {
    categoria = 'Hiperventilación';
  }

  categoriaFrecuenciaRespiratoria.value = categoria;
  formDataExploracionFisica.categoriaFrecuenciaRespiratoria = categoria;
}

function setCategoriaSaturacionOxigeno() {
  let saturacion = formDataExploracionFisica.saturacionOxigeno;
  let categoria = '';

  if (!esMedicion(saturacion)) {
    categoria = '';
  } else if (saturacion >= 95 && saturacion <= 100) {
    categoria = 'Normal';
  } else if (saturacion >= 91 && saturacion <= 94) {
    categoria = 'Aceptable';
  } else if (saturacion >= 85 && saturacion <= 90) {
    categoria = 'Moderadamente baja';
  } else if (saturacion >= 81 && saturacion <= 84) {
    categoria = 'Hipoxemia leve';
  } else if (saturacion <= 80) {
    categoria = 'Hipoxemia grave';
  }

  categoriaSaturacionOxigeno.value = categoria;
  formDataExploracionFisica.categoriaSaturacionOxigeno = categoria;
}

// Computed para mostrar mensajes de error
const mensajeErrorTensionSistolica = computed(() =>
  mensajeErrorSomatometriaSignosField('tensionArterialSistolica', tensionArterialSistolica.value),
);

const mensajeErrorTensionDiastolica = computed(() =>
  mensajeErrorSomatometriaSignosField('tensionArterialDiastolica', tensionArterialDiastolica.value),
);

const mensajeErrorFrecuenciaCardiaca = computed(() =>
  mensajeErrorSomatometriaSignosField('frecuenciaCardiaca', frecuenciaCardiaca.value),
);

const mensajeErrorFrecuenciaRespiratoria = computed(() =>
  mensajeErrorSomatometriaSignosField('frecuenciaRespiratoria', frecuenciaRespiratoria.value),
);

const mensajeErrorSaturacionOxigeno = computed(() =>
  mensajeErrorSomatometriaSignosField('saturacionOxigeno', saturacionOxigeno.value),
);


/** Los cinco signos, en el orden de captura (mismo componente que la nota médica). */
const signos = [
  { campo: 'tensionArterialSistolica', etiqueta: 'Tensión arterial sistólica', corta: 'T.A. sistólica', unidad: 'mmHg', valor: tensionArterialSistolica, error: mensajeErrorTensionSistolica },
  { campo: 'tensionArterialDiastolica', etiqueta: 'Tensión arterial diastólica', corta: 'T.A. diastólica', unidad: 'mmHg', valor: tensionArterialDiastolica, error: mensajeErrorTensionDiastolica },
  { campo: 'frecuenciaCardiaca', etiqueta: 'Frecuencia cardiaca', corta: 'Frec. cardiaca', unidad: 'lpm', valor: frecuenciaCardiaca, error: mensajeErrorFrecuenciaCardiaca },
  { campo: 'frecuenciaRespiratoria', etiqueta: 'Frecuencia respiratoria', corta: 'Frec. respiratoria', unidad: 'rpm', valor: frecuenciaRespiratoria, error: mensajeErrorFrecuenciaRespiratoria },
  { campo: 'saturacionOxigeno', etiqueta: 'Saturación de oxígeno', corta: 'Saturación O₂', unidad: '%', valor: saturacionOxigeno, error: mensajeErrorSaturacionOxigeno },
];

const conValor = (v, unidad) => (esMedicion(v) ? `${v} ${unidad}` : '');
/** Categorías que se calculan solas, con su valor. */
const categorias = computed(() => [
  {
    titulo: 'Tensión arterial',
    valor: esMedicion(tensionArterialSistolica.value)
      ? `${tensionArterialSistolica.value}/${esMedicion(tensionArterialDiastolica.value) ? tensionArterialDiastolica.value : '—'} mmHg`
      : '',
    categoria: categoriaTensionArterial.value,
  },
  { titulo: 'Frecuencia cardiaca', valor: conValor(frecuenciaCardiaca.value, 'lpm'), categoria: categoriaFrecuenciaCardiaca.value },
  { titulo: 'Frecuencia respiratoria', valor: conValor(frecuenciaRespiratoria.value, 'rpm'), categoria: categoriaFrecuenciaRespiratoria.value },
  { titulo: 'Saturación de oxígeno', valor: conValor(saturacionOxigeno.value, '%'), categoria: categoriaSaturacionOxigeno.value },
]);
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Signos vitales</h1>
    <div
      :class="[
        'grid',
        capturaRapida ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4' : 'grid-cols-2 gap-x-3 gap-y-3',
      ]"
    >
      <NumeroCaptura
        v-for="s in signos"
        :id="s.campo"
        :key="s.campo"
        v-model="s.valor.value"
        :data-campo="s.campo"
        :etiqueta="s.etiqueta"
        :etiqueta-corta="s.corta"
        :unidad="s.unidad"
        obligatorio
        :placeholder="`${SOMATOMETRIA_SIGNOS_RANGES[s.campo].min}-${SOMATOMETRIA_SIGNOS_RANGES[s.campo].max}`"
        :min="SOMATOMETRIA_SIGNOS_RANGES[s.campo].min"
        :max="SOMATOMETRIA_SIGNOS_RANGES[s.campo].max"
        :error="s.error.value"
        :partida="partida(s.campo)"
      />
    </div>

    <!-- Categorías que se calculan solas: valor y etiqueta de color sólido -->
    <div :class="['mt-4 grid gap-2', capturaRapida ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1']">
      <div
        v-for="c in categorias"
        :key="c.titulo"
        data-calculado
        class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5"
      >
        <div class="min-w-0">
          <p class="text-xs text-gray-500">{{ c.titulo }}</p>
          <p class="text-sm font-bold text-gray-900 leading-tight">{{ c.valor || '—' }}</p>
        </div>
        <span
          v-if="c.categoria"
          :class="['shrink-0 px-2.5 py-1 rounded-md text-sm font-semibold text-white', colorCategoria(c.categoria)]"
        >{{ c.categoria }}</span>
        <span v-else class="text-xs text-gray-400">Se calcula con el dato</span>
      </div>
    </div>
  </div>
</template>
