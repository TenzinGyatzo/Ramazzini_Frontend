<script setup>
import { ref, computed } from 'vue';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import OpcionesSegmentadas from '../captura/OpcionesSegmentadas.vue';
import { CLASE_AYUDA, CLASE_ETIQUETA, CLASE_INPUT, CLASE_TEXTAREA } from '../captura/estiloCaptura';

defineProps({ variant: { type: String, default: '' } });
import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import DocumentosAPI from '@/api/DocumentosAPI';
import { findNearestDocument } from '@/helpers/findNearestDocuments';
import { useDocumentosStore } from '@/stores/documentos';

import { useAutofocoPrimerVacio } from '@/composables/useAutofocoPrimerVacio';

// Al abrir el paso, si el diagnóstico está vacío, el cursor va a él
useAutofocoPrimerVacio(['diagnosticoAudiometria']);

const trabajadores = useTrabajadoresStore();
const formDataStore = useFormDataStore();
const documentos = useDocumentosStore();
const capturaRapida = enCapturaRapida();

// Punto 44: el campo es el del formulario (por el store: al editar, el documento puede llegar
// después del primer dibujo)
const diagnosticoAudiometria = computed({
  get: () => formDataStore.formDataAudiometria.diagnosticoAudiometria ?? '',
  set: (valor) => {
    formDataStore.formDataAudiometria.diagnosticoAudiometria = valor ?? '';
  },
});
const compatibleElegido = ref('');

// === SISTEMA AUTOMÁTICO (COMENTADO TEMPORALMENTE) ===
/*
// Generar el texto dinámico basado en la información
const diagnosticoAutomatico = computed(() => {
  const {
    oidoDerecho125, oidoDerecho250, oidoDerecho500, oidoDerecho1000, oidoDerecho2000, oidoDerecho3000, oidoDerecho4000, oidoDerecho6000, oidoDerecho8000,
    oidoIzquierdo125, oidoIzquierdo250, oidoIzquierdo500, oidoIzquierdo1000, oidoIzquierdo2000, oidoIzquierdo3000, oidoIzquierdo4000, oidoIzquierdo6000, oidoIzquierdo8000,
    hipoacusiaBilateralCombinada
  } = formDataAudiometria;

  // --- helper: a número, o NaN si viene vacío ---
  const n = (v) => (v === "" || v === null || v === undefined) ? NaN : Number(v);

  // --- Definición de oídos (vía aérea) ---
  const airR = {
    125: n(oidoDerecho125), 250: n(oidoDerecho250), 500: n(oidoDerecho500), 1000: n(oidoDerecho1000),
    2000: n(oidoDerecho2000), 3000: n(oidoDerecho3000), 4000: n(oidoDerecho4000), 6000: n(oidoDerecho6000), 8000: n(oidoDerecho8000)
  };
  const airL = {
    125: n(oidoIzquierdo125), 250: n(oidoIzquierdo250), 500: n(oidoIzquierdo500), 1000: n(oidoIzquierdo1000),
    2000: n(oidoIzquierdo2000), 3000: n(oidoIzquierdo3000), 4000: n(oidoIzquierdo4000), 6000: n(oidoIzquierdo6000), 8000: n(oidoIzquierdo8000)
  };

  // --- Utilidades locales ---
  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
  const available = (ear, list) => list.filter(f => Number.isFinite(ear[f]));
  const bandProm = (ear, freqs) => {
    const vals = freqs.map(f => ear[f]).filter(Number.isFinite);
    return vals.length ? mean(vals) : null;
  };

  // PTA estándar: 500-1000-2000 (+3000 si existe)
  const computePTAStd = (ear) => {
    const base = [500, 1000, 2000].filter(f => Number.isFinite(ear[f]));
    if (base.length < 3) return null;
    const vals = [ear[500], ear[1000], ear[2000]];
    if (Number.isFinite(ear[3000])) vals.push(ear[3000]);
    return Math.round(mean(vals));
  };

  // PTA Low-Frequency (LF): 125-250-500
  const computePTALF = (ear) => {
    const base = [125, 250, 500].filter(f => Number.isFinite(ear[f]));
    if (base.length < 3) return null;
    return Math.round(mean([ear[125], ear[250], ear[500]]));
  };

  // Detecta graves elevados: al menos 2 de 125/250/500 ≥ 25 dB
  const hasHighLF = (ear) => [125, 250, 500].filter(f => Number.isFinite(ear[f]) && ear[f] >= 25).length >= 2;

  // Clasificación OMS del grado por PTA
  const gradoOMS = (pta) => {
    if (pta === null) return "no valorable";
    if (pta <= 20) return "dentro de límites normales";
    if (pta <= 34) return "leve";
    if (pta <= 49) return "moderada";
    if (pta <= 64) return "moderada-severa";
    if (pta <= 79) return "severa";
    return "profunda";
  };

  // --- Extracción de rasgos SOLO con vía aérea ---
  const featuresFromAir = (ear) => {
    const lf = bandProm(ear, [125, 250, 500]);
    const mf = bandProm(ear, [1000, 2000, 3000]);
    const hf = bandProm(ear, [3000, 4000, 6000, 8000]);

    const all = Object.values(ear).filter(Number.isFinite);
    const maxHL = all.length ? Math.max(...all) : null;
    const minHL = all.length ? Math.min(...all) : null;
    const rangeHL = (maxHL != null && minHL != null) ? (maxHL - minHL) : null;
    const nFreq = all.length;

    const difLF_HF = (lf != null && hf != null) ? (lf - hf) : null; // + = graves peor
    const difHF_LF = (hf != null && lf != null) ? (hf - lf) : null; // + = agudos peor

    const hfVals = [ear[3000], ear[4000], ear[6000], ear[8000]].filter(Number.isFinite);
    const maxHF = hfVals.length ? Math.max(...hfVals) : null;

    return { lf, mf, hf, maxHL, minHL, rangeHL, nFreq, difLF_HF, difHF_LF, maxHF };
  };


  // --- Inferencia de TIPO sugerente con SOLO vía aérea ---
  const determinarTipoSoloAerea = (ear) => {
    const { lf, hf, maxHL, minHL, rangeHL, nFreq, difLF_HF, difHF_LF, maxHF } = featuresFromAir(ear);
    if (nFreq < 3 || maxHL == null) return { tipo: "", razones: ["frecuencias insuficientes"] };

    const razones = [];
    let tipo = "";

    // Reglas base (bandas)
    const patronConductivo = (difLF_HF != null && difLF_HF >= 15) && (maxHL <= 60);
    const patronNeuro = (difHF_LF != null && difHF_LF >= 15) || (hf != null && hf >= 55) || (maxHF != null && maxHF >= 60);

    // Regla PLANA: rango total pequeño
    const esPlana = (rangeHL != null && rangeHL <= 10); // 10–15 dB es aceptable; puede subir a 15 si lo prefiere

    if (esPlana) {
      if (maxHL > 20) {
        tipo = "mixta";
        razones.push("audiograma plano con niveles >60 dB HL");
      } 
    }

    // Mixta: requiere patrón conductivo + evidencia en agudos
    const patronMixto = patronConductivo && ((difHF_LF != null && difHF_LF >= 15) || (hf != null && hf >= 55) || (maxHF != null && maxHF >= 60));

    // Si no se decidió por "plana", evalúe las otras reglas
    if (!tipo) {
      if (patronMixto) {
        tipo = "mixta";
        razones.push("graves peor ≥15 dB + evidencia coclear en agudos");
      } else if (patronConductivo && !patronNeuro) {
        tipo = "conductiva";
        razones.push("graves peor que agudos ≥15 dB, máximos ≤60 dB HL");
      } else if (patronNeuro && !patronConductivo) {
        tipo = "neurosensorial";
        if (difHF_LF != null && difHF_LF >= 15) razones.push("agudos peor que graves ≥15 dB");
        if (hf != null && hf >= 55) razones.push("promedio de agudos ≥55 dB HL");
        if (maxHF != null && maxHF >= 60) razones.push("pico en agudos ≥60 dB HL");
      } else if (patronConductivo && patronNeuro) {
        tipo = "mixta";
        razones.push("señales combinadas de componente conductivo y coclear");
      } else {
        return { tipo: "", razones: ["patrón no concluyente con vía aérea"] };
      }
    }

    return { tipo, razones };
  };


  // Redacción por oído (nueva)
  const redactarOido = (label, air) => {
    const PTAstd = computePTAStd(air);
    const PTAlf  = computePTALF(air);
    const lado = label === "OD" ? "derecha" : "izquierda";

    if (PTAstd === null) {
      return `SIN CLASIFICACIÓN ${lado.toUpperCase()} VALORABLE (FRECUENCIAS INCOMPLETAS).`;
    }

    // Override: si PTA "normal" pero graves altos, no declarar normal
    if (PTAstd <= 20 && hasHighLF(air) && PTAlf !== null) {
      const { tipo } = determinarTipoSoloAerea(air);
      return `HIPOACUSIA ${tipo.toUpperCase()} ${lado.toUpperCase()} ${gradoOMS(PTAlf).toUpperCase()}.`;
    }

    if (PTAstd <= 20) {
      return `AUDICIÓN ${lado.toUpperCase()} DENTRO DE LÍMITES NORMALES.`;
    }

    const { tipo } = determinarTipoSoloAerea(air);
    if (!tipo) {
      return `HIPOACUSIA ${lado.toUpperCase()} ${gradoOMS(PTAstd).toUpperCase()}, PATRÓN NO CONCLUYENTE PARA TIPO (SOLO VÍA AÉREA).`;
    }
    return `HIPOACUSIA ${tipo.toUpperCase()} ${lado.toUpperCase()} ${gradoOMS(PTAstd).toUpperCase()}.`;
  };

  // Textos por oído
  const odTexto = redactarOido("OD", airR);
  const oiTexto = redactarOido("OI", airL);

  // Intento de unificación bilateral cuando ambos lados comparten el mismo núcleo
  const normalizarParaComparar = (t) =>
    t.replace("DERECHA", "LADO")
     .replace("IZQUIERDA", "LADO")
     .replace(/AUDICIÓN LADO DENTRO DE LÍMITES NORMALES\./, "AUDICIÓN LADO DENTRO DE LÍMITES NORMALES.")
     .replace(/HIPOACUSIA LADO /, "HIPOACUSIA LADO ");

  const textosCoinciden = normalizarParaComparar(odTexto) === normalizarParaComparar(oiTexto);

  let textoOidos;
  if (textosCoinciden) {
    // Convertir a bilateral
    textoOidos = odTexto
      .replace("DERECHA", "BILATERAL")
      .replace("AUDICIÓN BILATERAL", "AUDICIÓN BILATERAL") // mantiene si era normal
      .replace("HIPOACUSIA BILATERAL", "HIPOACUSIA BILATERAL");
  } else {
    textoOidos = [odTexto, oiTexto].filter(Boolean).join(" ");
  }

  // Línea de HBC/Hipoacusia Bilateral Combinada (si se proporciona)
  const lineaPBC = Number.isFinite(hipoacusiaBilateralCombinada)
    ? `HBC DE ${hipoacusiaBilateralCombinada}%.`
    : "";

  // Ensamblado final
  const texto = [textoOidos, lineaPBC].filter(Boolean).join(" ");

  return texto;
});
*/

// === NUEVO SISTEMA DE CONSTRUCCIÓN DE DIAGNÓSTICO ===
const openSections = ref({
  constructor: false,
  neurosensorial: false,
  conductiva: false,
  mixta: false
});

const toggle = (section) => { 
  openSections.value[section] = !openSections.value[section]; 
};
const isOpen = (section) => !!openSections.value[section];

// Estado del constructor
const constructorDiagnostico = ref({
  tipo: '', // 'neurosensorial', 'conductiva', 'mixta'
  lateralidad: '', // 'unilateral', 'bilateral'
  severidad: '' // 'leve', 'moderada', 'severa', 'profunda'
});

// Opciones del constructor
const TIPOS_HIPOACUSIA = [
  { value: 'neurosensorial', label: 'Neurosensorial' },
  { value: 'conductiva', label: 'Conductiva' },
  { value: 'mixta', label: 'Mixta' }
];

const LATERALIDAD = [
  { value: 'unilateral', label: 'Unilateral' },
  { value: 'bilateral', label: 'Bilateral' }
];

const SEVERIDAD = [
  { value: 'leve.', label: 'Leve' },
  { value: 'moderada.', label: 'Moderada' },
  { value: 'severa.', label: 'Severa' },
  { value: 'profunda.', label: 'Profunda' }
];

// Generar diagnóstico principal
const generarDiagnosticoPrincipal = () => {
  const { tipo, lateralidad, severidad } = constructorDiagnostico.value;
  
  if (!tipo || !lateralidad || !severidad) {
    return '';
  }
  
  const tipoTexto = tipo.toLowerCase();
  const lateralidadTexto = lateralidad === 'unilateral' ? 'unilateral' : 'bilateral';
  const severidadTexto = severidad.charAt(0).toUpperCase() + severidad.slice(1);
  
  return `Hipoacusia ${tipoTexto} ${lateralidadTexto} crónica ${severidadTexto.toLowerCase()}`;
};

const insertarDiagnosticoPrincipal = () => {
  const diagnostico = generarDiagnosticoPrincipal();
  if (diagnostico) {
    diagnosticoAudiometria.value = diagnostico;
  }
};

// === QUICK INSERTS PARA "COMPATIBLE CON" ===
const opcionesCompatibleCon = computed(() => [
  // Neurosensorial
  {
    categoria: 'neurosensorial',
    titulo: 'Neurosensorial',
    opciones: [
      'Cortipatía bilateral crónica por exposición a ruido.',
      'Proceso inflamatorio crónico de oído medio predominante en oído derecho.',
      'Proceso inflamatorio crónico de oído medio predominante en oído izquierdo.',
      'Proceso inflamatorio agudo de oído derecho + oído izquierdo con audición normal.',
      'Proceso inflamatorio agudo de oído izquierdo + oído derecho con audición normal.',
      'Uso de medicamentos ototóxicos.',
      'Presbiacusia (envejecimiento).'
    ]
  },
  // Conductiva
  {
    categoria: 'conductiva',
    titulo: 'Conductiva',
    opciones: [
      'Acumulación de cerumen (tapón de cera).',
      'Infecciones del oído medio aguda o crónica (otitis media).',
      'Perforación del tímpano derecho.',
      'Perforación del tímpano izquierdo.',
      'Otitis media con derrame (líquido en el oído).',
      'Otosclerosis (osificación anormal de los huesecillos).'
    ]
  },
  // Mixta
  {
    categoria: 'mixta',
    titulo: 'Mixta',
    opciones: [
      'Proceso inflamatorio agudo en oído izquierdo.',
      'Proceso inflamatorio agudo en oído derecho.',
      'Proceso inflamatorio crónico en oído izquierdo.',
      'Proceso inflamatorio crónico en oído derecho.',
      'Presbiacusia (envejecimiento).',
      'Enfermedad de Meniere.',
      'Traumatismo craneoencefálico.',
      'Otosclerosis (osificación anormal de los huesecillos).',
      'Trauma acústico (Explosión).'
    ]
  }
]);

const insertarCompatibleCon = (texto) => {
  const textoActual = diagnosticoAudiometria.value.trim();
  const nuevoTexto = textoActual 
    ? `${textoActual} Compatible con ${texto}`
    : `compatible con ${texto}`;
  diagnosticoAudiometria.value = nuevoTexto;
};

const insertarDiagnostico = (texto) => {
  // Inserta reemplazando el contenido actual
  diagnosticoAudiometria.value = texto;
};

</script>



<template>
  <h1 v-if="variant !== 'compact'" class="font-bold mb-4 text-gray-800 leading-5">Diagnóstico Audiométrico</h1>

  <div data-campo="diagnosticoAudiometria" class="space-y-2">
    <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <label for="diagnosticoAudiometria" :class="CLASE_ETIQUETA">
        Diagnóstico <span class="text-red-500">*</span>
      </label>
      <button
        type="button"
        class="text-xs text-emerald-700 hover:underline"
        title="Escribe «Audición normal bilateral.» en el diagnóstico"
        @click="diagnosticoAudiometria = 'Audición normal bilateral.'"
      >
        Audición normal bilateral
      </button>
    </div>
    <textarea
      id="diagnosticoAudiometria"
      v-model="diagnosticoAudiometria"
      rows="3"
      :class="CLASE_TEXTAREA"
      placeholder="Escribe el diagnóstico o redáctalo con ayuda"
      data-skip-validation
    ></textarea>

    <!-- Ayudas para redactar: plegadas para no ocupar la pantalla -->
    <details class="group rounded-lg border border-gray-200 bg-gray-50/60">
      <summary class="flex items-center gap-2 cursor-pointer select-none px-3 py-2 text-sm text-gray-700">
        <i class="fas fa-chevron-right text-[10px] text-gray-400 transition-transform group-open:rotate-90" aria-hidden="true"></i>
        Redactar con ayuda
      </summary>
      <div class="px-3 pb-3 space-y-3">
        <div :class="['grid gap-3', capturaRapida ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1']">
          <div>
            <p :class="[CLASE_ETIQUETA, 'mb-1 !text-xs']">Tipo de hipoacusia</p>
            <OpcionesSegmentadas v-model="constructorDiagnostico.tipo" name="tipoHipoacusia" etiqueta="Tipo de hipoacusia" separadas :opciones="TIPOS_HIPOACUSIA.map((o) => ({ valor: o.value, etiqueta: o.label }))" />
          </div>
          <div>
            <p :class="[CLASE_ETIQUETA, 'mb-1 !text-xs']">Lateralidad</p>
            <OpcionesSegmentadas v-model="constructorDiagnostico.lateralidad" name="lateralidadHipoacusia" etiqueta="Lateralidad" separadas :opciones="LATERALIDAD.map((o) => ({ valor: o.value, etiqueta: o.label }))" />
          </div>
          <div>
            <p :class="[CLASE_ETIQUETA, 'mb-1 !text-xs']">Severidad</p>
            <OpcionesSegmentadas v-model="constructorDiagnostico.severidad" name="severidadHipoacusia" etiqueta="Severidad" separadas :opciones="SEVERIDAD.map((o) => ({ valor: o.value, etiqueta: o.label }))" />
          </div>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <p :class="[CLASE_AYUDA, 'min-w-0']">{{ generarDiagnosticoPrincipal() || 'Elige tipo, lateralidad y severidad.' }}</p>
          <button
            type="button"
            class="shrink-0 px-3 py-1 text-xs rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!generarDiagnosticoPrincipal()"
            @click="insertarDiagnosticoPrincipal"
          >
            Usar como diagnóstico
          </button>
        </div>

        <div>
          <label for="compatibleCon" :class="[CLASE_ETIQUETA, 'mb-1 !text-xs']">Compatible con (se agrega al final)</label>
          <div class="flex gap-2">
            <select id="compatibleCon" v-model="compatibleElegido" :class="[CLASE_INPUT, 'min-w-0']">
              <option value="">Elige una causa…</option>
              <optgroup v-for="categoria in opcionesCompatibleCon" :key="categoria.categoria" :label="categoria.titulo">
                <option v-for="opcion in categoria.opciones" :key="opcion" :value="opcion">{{ opcion }}</option>
              </optgroup>
            </select>
            <button
              type="button"
              class="shrink-0 px-3 text-sm rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="!compatibleElegido"
              @click="insertarCompatibleCon(compatibleElegido); compatibleElegido = ''"
            >
              Agregar
            </button>
          </div>
        </div>
      </div>
    </details>
  </div>
</template>
