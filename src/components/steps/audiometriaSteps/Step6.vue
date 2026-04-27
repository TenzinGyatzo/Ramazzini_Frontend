<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import DocumentosAPI from '@/api/DocumentosAPI';
import { findNearestDocument } from '@/helpers/findNearestDocuments';
import { useDocumentosStore } from '@/stores/documentos';

const trabajadores = useTrabajadoresStore();
const { formDataAudiometria } = useFormDataStore();
const documentos = useDocumentosStore();

// Valor local para diagnosticoAudiometria
const diagnosticoAudiometria = ref(formDataAudiometria.diagnosticoAudiometria || '');

onMounted(() => {
  if (documentos.currentDocument?.diagnosticoAudiometria) {
    diagnosticoAudiometria.value = documentos.currentDocument.diagnosticoAudiometria;
  }
});

watch(diagnosticoAudiometria, (newValue) => {
  formDataAudiometria.diagnosticoAudiometria = newValue ?? '';
});

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
    <h1 class="font-bold mb-4 text-gray-800 leading-5">Diagnóstico Audiométrico</h1>
    
    <div class="mb-4">
        <h2 class="text-lg font-semibold mb-2 text-gray-800">Diagnóstico:</h2>

        <!-- Textarea (source of truth local) -->
        <div class="font-light mb-4">
            <textarea
                class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-32"
                v-model="diagnosticoAudiometria"
                placeholder="Escriba el diagnóstico aquí o use las herramientas de abajo..."
                required
                data-skip-validation
            ></textarea>
        </div>

        <!-- Quick Insert para audición normal -->
        <div class="mb-6">
            <div class="flex items-center gap-2 mb-4">
                <p class="font-medium text-gray-800 leading-5">Diagnóstico normal:</p>
            </div>
            <div class="flex items-center justify-between border rounded-lg p-2 bg-white hover:shadow-sm transition-shadow">
                <div class="flex-1">
                    <p class="text-sm text-gray-800">Audición normal bilateral.</p>
                </div>
                <button
                    class="ml-2 px-2 py-1 rounded text-xs text-emerald-700 border border-emerald-600 hover:bg-emerald-50 transition-colors"
                    @click="diagnosticoAudiometria = 'Audición normal bilateral.'"
                    title="Insertar diagnóstico"
                >
                    Insertar
                </button>
            </div>
        </div>

        <!-- Constructor de diagnóstico de hipoacusia -->
        <div class="mb-6">
            <div class="border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                <button
                    class="w-full flex items-center justify-between p-3 text-left hover:bg-emerald-50 transition-colors"
                    :class="isOpen('constructor') ? 'bg-emerald-50' : 'bg-white'"
                    @click="toggle('constructor')"
                >
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-emerald-400"></div>
                        <span class="font-medium text-gray-800">Constructor de hipoacusia <br><span class="text-xs font-normal text-gray-500">(Seleccione tipo, lateralidad y severidad)</span></span>
                        
                    </div>
                    <svg class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': isOpen('constructor') }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
                <transition
                    enter-active-class="transition-all duration-200 ease-out"
                    enter-from-class="opacity-0 max-h-0"
                    enter-to-class="opacity-100 max-h-96"
                    leave-active-class="transition-all duration-200 ease-in"
                    leave-from-class="opacity-100 max-h-96"
                    leave-to-class="opacity-0 max-h-0"
                >
                    <div v-if="isOpen('constructor')" class="border-t bg-emerald-50 p-4 space-y-4">
                        <!-- Tipo de hipoacusia -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de hipoacusia:</label>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <label v-for="op in TIPOS_HIPOACUSIA" :key="op.value" class="flex items-center gap-2 text-sm p-2 border rounded-lg hover:bg-emerald-100 cursor-pointer">
                                    <input type="radio" class="text-emerald-600 focus:ring-emerald-500"
                                           v-model="constructorDiagnostico.tipo" :value="op.value" />
                                    <span>{{ op.label }}</span>
                                </label>
                            </div>
                        </div>

                        <!-- Lateralidad -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Lateralidad:</label>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <label v-for="op in LATERALIDAD" :key="op.value" class="flex items-center gap-2 text-sm p-2 border rounded-lg hover:bg-emerald-100 cursor-pointer">
                                    <input type="radio" class="text-emerald-600 focus:ring-emerald-500"
                                           v-model="constructorDiagnostico.lateralidad" :value="op.value" />
                                    <span>{{ op.label }}</span>
                                </label>
                            </div>
                        </div>

                        <!-- Severidad -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Severidad:</label>
                            <div class="grid grid-cols-2 md:grid-cols-2 gap-2">
                                <label v-for="op in SEVERIDAD" :key="op.value" class="flex items-center gap-2 text-sm p-2 border rounded-lg hover:bg-emerald-100 cursor-pointer">
                                    <input type="radio" class="text-emerald-600 focus:ring-emerald-500"
                                           v-model="constructorDiagnostico.severidad" :value="op.value" />
                                    <span>{{ op.label }}</span>
                                </label>
                            </div>
                        </div>

                        <!-- Vista previa y botón insertar -->
                        <div class="mt-4 p-3 border rounded-lg bg-white">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-sm font-medium text-gray-700">Vista previa:</span>
                                <button
                                    type="button"
                                    class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
                                    @click="insertarDiagnosticoPrincipal"
                                    :disabled="!constructorDiagnostico.tipo.toLowerCase() || !constructorDiagnostico.lateralidad || !constructorDiagnostico.severidad"
                                >
                                    Insertar diagnóstico
                                </button>
                            </div>
                            <p class="text-sm text-gray-600 italic">
                                {{ generarDiagnosticoPrincipal() || 'Seleccione todas las opciones para ver la vista previa' }}
                            </p>
                        </div>
                    </div>
                </transition>
            </div>
        </div>

        <!-- Quick Inserts para "Compatible con" -->
        <div class="mb-6">
            <div class="flex items-center gap-2 mb-4">
                <p class="font-medium text-gray-800 leading-5">Opciones "Compatible con": <br><span class="text-xs font-normal text-gray-500">(Se agregan al diagnóstico existente)</span></p>
            </div>

            <div class="space-y-2">
                <div v-for="categoria in opcionesCompatibleCon" :key="categoria.categoria" class="border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                    <button
                        class="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
                        :class="isOpen(categoria.categoria) ? 'bg-gray-50' : 'bg-white'"
                        @click="toggle(categoria.categoria)"
                    >
                        <div class="flex items-center gap-2">
                            <div class="w-3 h-3 rounded-full" :class="{
                                'bg-blue-400': categoria.categoria === 'Neurosensorial',
                                'bg-orange-400': categoria.categoria === 'Conductiva',
                                'bg-purple-400': categoria.categoria === 'Mixta'
                            }"></div>
                            <span class="font-medium text-gray-800">{{ categoria.titulo }}</span>
                            <span class="text-xs text-gray-500">({{ categoria.opciones.length }} opciones)</span>
                        </div>
                        <svg class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': isOpen(categoria.categoria) }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>
                    <transition
                        enter-active-class="transition-all duration-200 ease-out"
                        enter-from-class="opacity-0 max-h-0"
                        enter-to-class="opacity-100 max-h-96"
                        leave-active-class="transition-all duration-200 ease-in"
                        leave-from-class="opacity-100 max-h-96"
                        leave-to-class="opacity-0 max-h-0"
                    >
                        <div v-if="isOpen(categoria.categoria)" class="border-t bg-gray-50 p-3 space-y-2">
                            <div
                                v-for="opcion in categoria.opciones"
                                :key="opcion"
                                class="flex items-center justify-between border rounded-lg p-2 bg-white hover:shadow-sm transition-shadow"
                            >
                                <div class="flex-1">
                                    <p class="text-sm text-gray-800">{{ opcion }}</p>
                                </div>
                                <button
                                    class="ml-2 px-2 py-1 rounded text-xs text-emerald-700 border border-emerald-600 hover:bg-emerald-50 transition-colors"
                                    @click="insertarCompatibleCon(opcion)"
                                    title="Agregar al diagnóstico"
                                >
                                    Agregar
                                </button>
                            </div>
                        </div>
                    </transition>
                </div>
            </div>
        </div>

        <!-- === SISTEMA AUTOMÁTICO (COMENTADO TEMPORALMENTE) === -->
        <!--
        <div class="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div class="flex items-center justify-between mb-2">
                <h3 class="font-semibold text-emerald-800">Diagnóstico Automático</h3>
                <button
                    class="px-3 py-1 rounded-md text-sm text-emerald-700 border border-emerald-600 hover:bg-emerald-100"
                    @click="insertarDiagnostico(diagnosticoAutomatico)"
                    title="Usar diagnóstico automático"
                >
                    Usar este diagnóstico
                </button>
            </div>
            <p class="text-sm text-emerald-700 italic">{{ diagnosticoAutomatico }}</p>
        </div>
        -->
    </div>
</template>
