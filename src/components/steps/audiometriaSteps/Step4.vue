<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const mensajeCopiado = ref(false);

const { formDataAudiometria } = useFormDataStore();
const documentos = useDocumentosStore();

/** === 1) TEXTAREA: usa ref local y sincroniza al store === */
const observacionesAudiometria = ref(formDataAudiometria.observacionesAudiometria || '');

onMounted(() => {
  if (documentos.currentDocument?.observacionesAudiometria) {
    observacionesAudiometria.value = documentos.currentDocument.observacionesAudiometria;
  }
});

watch(observacionesAudiometria, (newValue) => {
  formDataAudiometria.observacionesAudiometria = newValue ?? '';
});

/** === 2) DESPLEGABLES / TOGGLE === */
const openSections = ref({
  constructor: false  // Constructor colapsado por defecto
});
const toggle = (section) => { openSections.value[section] = !openSections.value[section]; };
const isOpen = (section) => !!openSections.value[section];

/** === 2.5) INPUT AÑOS === */
const añosExposicion = ref('5');

/** === 3) UTILIDAD COPIAR === */
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
 * 4) QUICK-INSERTS (plantillas clínicas frecuentes)
 * ======================================================================================= */


// Función para generar plantillas con años actualizados
const generarPlantillas = () => {
  return [
    // === SIN EXPOSICIÓN ===
    {
      id: 'sin-expo-normal',
    titulo: 'Sin exposición; otoscopia normal',
    texto: 'Niega antecedente de exposición a ruido de tipo industrial. Audiológicamente asintomático. Conductos auditivos permeables, membranas timpánicas íntegras.'
  },
  {
      id: 'sin-expo-con-antecedentes',
      titulo: 'Sin exposición; con antecedentes',
      texto: 'Niega antecedente de exposición a ruido de tipo industrial. Refiere antecedente de otitis media en la infancia. Audiológicamente asintomático. Conductos auditivos permeables, membranas timpánicas con cambios cicatriciales.'
    },

    // === EXPOSICIÓN CON EPP ===
    {
      id: 'expo-con-epp',
      titulo: 'Exposición con EPP adecuado',
      texto: `Refiere antecedente de exposición a ruido de tipo industrial durante ${añosExposicion.value} años, con uso de EPP. Audiológicamente asintomático. Conductos auditivos permeables, membranas timpánicas íntegras.`
    },
    {
      id: 'expo-epp-irregular',
      titulo: 'Exposición con EPP irregular',
      texto: `Refiere antecedente de exposición a ruido de tipo industrial durante ${añosExposicion.value} años, con uso intermitente de EPP. Audiológicamente asintomático. Conductos auditivos permeables, membranas timpánicas íntegras.`
    },

    // === EXPOSICIÓN SIN EPP ===
    {
      id: 'expo-sin-epp',
      titulo: 'Exposición sin EPP',
      texto: `Refiere antecedente de exposición a ruido de tipo industrial durante ${añosExposicion.value} años, sin uso de EPP. Audiológicamente asintomático. Conductos auditivos permeables, membranas timpánicas íntegras.`
    },

    // === EXPOSICIÓN CON SÍNTOMAS ===
    {
      id: 'expo-con-hipoacusia',
      titulo: 'Exposición con hipoacusia',
      texto: `Refiere antecedente de exposición a ruido de tipo industrial durante ${añosExposicion.value} años. Refiere hipoacusia progresiva. Conductos auditivos permeables, membranas timpánicas íntegras.`
    },
    {
      id: 'expo-con-tinnitus',
      titulo: 'Exposición con tinnitus',
      texto: `Refiere antecedente de exposición a ruido de tipo industrial durante ${añosExposicion.value} años. Refiere acúfenos/tinnitus bilateral. Conductos auditivos permeables, membranas timpánicas íntegras.`
    },

    // === CASOS CON PATOLOGÍAS OTOSCÓPICAS ===
    {
      id: 'expo-con-cerumen',
      titulo: 'Exposición con cerumen impactado',
      texto: `Refiere antecedente de exposición a ruido de tipo industrial durante ${añosExposicion.value} años. Audiológicamente asintomático. Conductos auditivos con cerumen impactado bilateral, membranas timpánicas no visibles.`
    },
    {
      id: 'expo-con-perforacion',
      titulo: 'Exposición con perforación timpánica',
      texto: `Refiere antecedente de exposición a ruido de tipo industrial durante ${añosExposicion.value} años. Refiere perforación timpánica previa. Audiológicamente asintomático. Conductos auditivos permeables, membranas timpánicas con cambios cicatriciales.`
    },
    {
      id: 'expo-con-otitis-externa',
      titulo: 'Exposición con otitis externa',
      texto: `Refiere antecedente de exposición a ruido de tipo industrial durante ${añosExposicion.value} años. Refiere otalgia leve. Conductos auditivos con signos de otitis externa, membranas timpánicas parcialmente visibles.`
    },

    // === CASOS DE REVISIÓN ===
    {
      id: 'revision-sin-cambios',
      titulo: 'Revisión sin cambios',
      texto: `Refiere antecedente de exposición a ruido de tipo industrial durante ${añosExposicion.value} años. Revisión periódica sin cambios respecto a evaluación previa. Audiológicamente asintomático. Conductos auditivos permeables, membranas timpánicas íntegras.`
    },
    {
      id: 'revision-con-empeoramiento',
      titulo: 'Revisión con empeoramiento',
      texto: `Refiere antecedente de exposición a ruido de tipo industrial durante ${añosExposicion.value} años. Refiere empeoramiento en síntomas auditivos. Conductos auditivos permeables, membranas timpánicas íntegras.`
    }
  ];
};

// Plantillas reactivas
const quickInserts = computed(() => generarPlantillas());

const insertarQuick = (texto) => {
  // Inserta reemplazando o anexando según prefieras:
  observacionesAudiometria.value = texto;
  // Si deseas anexar en lugar de reemplazar:
  // observacionesAudiometria.value = (observacionesAudiometria.value?.trim() ? observacionesAudiometria.value.trim() + ' ' : '') + texto;
};

/** =========================================================================================
 * 5) CONSTRUCTOR: opciones (datos estructurados) + generador
 * ======================================================================================= */

// Catálogos (puedes moverlos a un archivo config si lo prefieres)
const DURACIONES = ['1', '1.5', '3', '7', '8', '10', '13']; // años comunes; agrega campo libre abajo
const EXPOSICION = [
  { value: 'ninguna', label: 'Sin exposición industrial' },
  { value: 'continua', label: 'Exposición industrial continua' },
  { value: 'intermitente', label: 'Exposición industrial intermitente' },
  { value: 'maquinaria', label: 'Exposición a maquinaria industrial' }
];
const EPP = [
  { value: 'con', label: 'Con uso de EPP' },
  { value: 'intermitente', label: 'Uso intermitente de EPP' },
  { value: 'ocasional', label: 'Uso ocasional de EPP' },
  { value: 'sin', label: 'Sin uso de EPP' }
];
const SINTOMAS = [
  { value: 'asintomatico', label: 'Audiológicamente asintomático' },
  { value: 'hipoacusia', label: 'Refiere hipoacusia' },
  { value: 'tinnitus', label: 'Refiere acúfenos/tinnitus' },
  { value: 'otalgia', label: 'Refiere otalgia' }
];
const ANTECEDENTES = [
  { value: 'trauma_OD', label: 'Trauma acústico en oído derecho' },
  { value: 'trauma_OI', label: 'Trauma acústico en oído izquierdo' },
  { value: 'otitis_previa', label: 'Otitis media previa' },
  { value: 'revisiones_infancia', label: 'Revisiones óticas en la infancia (etiología no precisada)' }
];
const OTOSCOPIA = [
  { value: 'conductos_permeables', label: 'Conductos auditivos permeables' },
  { value: 'mt_integras', label: 'Membranas timpánicas íntegras' },
  { value: 'mt_cicatriciales', label: 'Membranas timpánicas con cambios cicatriciales' }
];

// Estado del constructor
const builder = ref({
  exposicion: 'ninguna',      // 'ninguna' | 'continua' | 'intermitente' | 'maquinaria'
  duracion: '',               // string numérica
  duracionLibre: '',          // input libre (si no está en DURACIONES)
  epp: 'con',                 // 'con' | 'intermitente' | 'ocasional' | 'sin'
  sintomas: ['asintomatico'], // array
  antecedentes: [],           // array
  otoscopia: ['conductos_permeables', 'mt_integras'] // array
});

const duracionFinal = computed(() => {
  return builder.value.duracionLibre?.trim()
    ? builder.value.duracionLibre.trim()
    : builder.value.duracion || '';
});

// Utilidades de texto
const primeraMayus = (s) => (s && s.length ? s[0].toUpperCase() + s.slice(1) : s);
const puntoFinal = (s) => (s?.trim().endsWith('.') ? s.trim() : `${s?.trim()}.`);

// Generador principal (reglas)
const construirObservacion = () => {
  const partes = [];

  // 1) Exposición
  if (builder.value.exposicion === 'ninguna') {
    partes.push('Niega antecedente de exposición a ruido de tipo industrial');
  } else {
    // Frase base según tipo
    let tipo = 'exposición a ruido de tipo industrial';
    if (builder.value.exposicion === 'intermitente') tipo = 'exposición intermitente a ruido de tipo industrial';
    if (builder.value.exposicion === 'continua') tipo = 'exposición a ruido de tipo industrial';
    if (builder.value.exposicion === 'maquinaria') tipo = 'exposición a ruido de maquinaria industrial';

    let frase = `Refiere antecedente de ${tipo}`;
    if (duracionFinal.value) {
      frase += ` durante ${duracionFinal.value} ${Number(duracionFinal.value) === 1 ? 'año' : 'años'}`;
    }
    // EPP
    const etiquetaEPP = {
      con: 'con uso de EPP',
      intermitente: 'con uso intermitente de EPP',
      ocasional: 'con uso ocasional de EPP',
      sin: 'sin uso de EPP'
    }[builder.value.epp];
    if (etiquetaEPP) frase += `, ${etiquetaEPP}`;

    partes.push(frase);
  }

  // 2) Síntomas
  const sintomas = builder.value.sintomas || [];
  if (sintomas.length === 0) {
    partes.push('Audiológicamente asintomático');
  } else {
    // Evitar redundancias: si incluye asintomático y otra cosa, conserva solo una
    if (sintomas.includes('asintomatico') && sintomas.length > 1) {
      // prioriza síntomas positivos clínicos sobre "asintomático"
      const sinAsint = sintomas.filter(s => s !== 'asintomatico');
      const mapeo = {
        hipoacusia: 'Refiere hipoacusia',
        tinnitus: 'Refiere acúfenos/tinnitus',
        otalgia: 'Refiere otalgia'
      };
      partes.push(sinAsint.map(s => mapeo[s]).filter(Boolean).join('. ') || 'Audiológicamente asintomático');
    } else {
      const mapeo = {
        asintomatico: 'Audiológicamente asintomático',
        hipoacusia: 'Refiere hipoacusia',
        tinnitus: 'Refiere acúfenos/tinnitus',
        otalgia: 'Refiere otalgia'
      };
      partes.push(sintomas.map(s => mapeo[s]).filter(Boolean).join('. '));
    }
  }

  // 3) Otoscopia
  const otos = builder.value.otoscopia || [];
  if (otos.length) {
    const mapeoO = {
      conductos_permeables: 'Conductos auditivos permeables',
      mt_integras: 'Membranas timpánicas íntegras',
      mt_cicatriciales: 'Membranas timpánicas con cambios cicatriciales'
    };
    const fraseO = otos.map(o => mapeoO[o]).filter(Boolean).join(', ');
    if (fraseO) partes.push(fraseO);
  }

  // 4) Antecedentes otológicos
  const ants = builder.value.antecedentes || [];
  if (ants.length) {
    const mapeoA = {
      trauma_OD: 'trauma acústico en su oído derecho',
      trauma_OI: 'trauma acústico en su oído izquierdo',
      otitis_previa: 'otitis media previa',
      revisiones_infancia: 'revisiones óticas en su infancia (etiología no precisada)'
    };
    const listado = ants.map(a => mapeoA[a]).filter(Boolean);
    if (listado.length) {
      const conector = 'Así como refiere ';
      const fraseA = conector + (listado.length === 1
        ? listado[0]
        : listado.slice(0, -1).join(', ') + ' y ' + listado.slice(-1));
      partes.push(fraseA);
    }
  }

  // Ensamble final con puntuación
  const oraciones = partes
    .map(s => primeraMayus(puntoFinal(s)))
    .filter(Boolean);

  return oraciones.join(' ');
};

const vistaPrevia = ref('');
const generarVistaPrevia = () => {
  vistaPrevia.value = construirObservacion();
};
const insertarDesdeConstructor = () => {
  observacionesAudiometria.value = (vistaPrevia.value || construirObservacion()).trim();
};

</script>

<template>
  <h1 class="font-bold mb-4 text-gray-800 leading-5">Audiometría</h1>

  <div class="mb-4">
    <h2 class="text-lg font-semibold mb-2 text-gray-800">Observaciones</h2>

    <!-- Textarea (source of truth local) -->
    <div class="font-light mb-4">
      <textarea
        class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-44"
        v-model="observacionesAudiometria"
        required
        data-skip-validation
      ></textarea>
    </div>

    <!-- === Quick Inserts === -->
    <div class="mb-4 flex items-center gap-2">
      <p class="font-medium text-gray-800 leading-5">Plantillas para redactar observaciones:</p>
      <span v-if="mensajeCopiado" class="font-medium leading-5 text-emerald-600 text-sm">¡Copiado!</span>
    </div>

    <!-- Categorías de plantillas con desplegables -->
    <div class="space-y-2">
      <!-- Sin exposición -->
      <div class="border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
        <button
          class="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
          :class="isOpen('sin-expo') ? 'bg-gray-50' : 'bg-white'"
          @click="toggle('sin-expo')"
        >
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-gray-400"></div>
            <span class="font-medium text-gray-800">Sin exposición a ruido</span>
            <span class="text-xs text-gray-500">(2 plantillas)</span>
          </div>
          <svg class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': isOpen('sin-expo') }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div v-if="isOpen('sin-expo')" class="border-t bg-gray-50 p-3 space-y-2">
            <div
              v-for="qi in quickInserts.filter(q => q.id.startsWith('sin-expo'))"
              :key="qi.id"
              class="flex items-center justify-between border rounded-lg p-2 bg-white hover:shadow-sm transition-shadow"
            >
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-800">{{ qi.titulo }}</p>
                <p class="text-xs text-gray-600 line-clamp-1 mt-1">{{ qi.texto }}</p>
              </div>
              <button
                class="ml-2 px-2 py-1 rounded text-xs text-emerald-700 border border-emerald-600 hover:bg-emerald-50 transition-colors"
                @click="insertarQuick(qi.texto)"
                title="Insertar en textarea"
              >
                Insertar
              </button>
            </div>
          </div>
        </transition>
      </div>

      <!-- Input para años de exposición -->
      <div class="mb-4 flex items-center gap-3">
        <label class="text-sm font-medium text-gray-700">Años de exposición:</label>
        <input
          type="number"
          v-model="añosExposicion"
          min="1"
          max="50"
          class="w-14 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
          placeholder="5"
        />
        <span class="text-xs text-gray-500">(se aplica a todas las plantillas)</span>
      </div>

      <!-- Exposición con EPP -->
      <div class="border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
        <button
          class="w-full flex items-center justify-between p-3 text-left hover:bg-green-50 transition-colors"
          :class="isOpen('con-epp') ? 'bg-green-50' : 'bg-white'"
          @click="toggle('con-epp')"
        >
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-green-400"></div>
            <span class="font-medium text-gray-800">Exposición con EPP</span>
            <span class="text-xs text-gray-500">(2 plantillas)</span>
          </div>
          <svg class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': isOpen('con-epp') }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div v-if="isOpen('con-epp')" class="border-t bg-green-50 p-3 space-y-2">
            <div
              v-for="qi in quickInserts.filter(q => q.id.includes('con-epp') || q.id.includes('epp-irregular'))"
              :key="qi.id"
              class="flex items-center justify-between border rounded-lg p-2 bg-white hover:shadow-sm transition-shadow"
            >
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-800">{{ qi.titulo }}</p>
                <p class="text-xs text-gray-600 line-clamp-1 mt-1">{{ qi.texto }}</p>
              </div>
              <button
                class="ml-2 px-2 py-1 rounded text-xs text-emerald-700 border border-emerald-600 hover:bg-emerald-50 transition-colors"
                @click="insertarQuick(qi.texto)"
                title="Insertar en textarea"
              >
                Insertar
              </button>
            </div>
          </div>
        </transition>
      </div>


      <!-- Exposición sin EPP -->
      <div class="border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
        <button
          class="w-full flex items-center justify-between p-3 text-left hover:bg-orange-50 transition-colors"
          :class="isOpen('sin-epp') ? 'bg-orange-50' : 'bg-white'"
          @click="toggle('sin-epp')"
        >
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-orange-400"></div>
            <span class="font-medium text-gray-800">Exposición sin EPP</span>
            <span class="text-xs text-gray-500">(1 plantilla)</span>
          </div>
          <svg class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': isOpen('sin-epp') }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div v-if="isOpen('sin-epp')" class="border-t bg-orange-50 p-3 space-y-2">
            <div
              v-for="qi in quickInserts.filter(q => q.id.includes('sin-epp'))"
              :key="qi.id"
              class="flex items-center justify-between border rounded-lg p-2 bg-white hover:shadow-sm transition-shadow"
            >
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-800">{{ qi.titulo }}</p>
                <p class="text-xs text-gray-600 line-clamp-1 mt-1">{{ qi.texto }}</p>
              </div>
              <button
                class="ml-2 px-2 py-1 rounded text-xs text-emerald-700 border border-emerald-600 hover:bg-emerald-50 transition-colors"
                @click="insertarQuick(qi.texto)"
                title="Insertar en textarea"
              >
                Insertar
              </button>
            </div>
          </div>
        </transition>
      </div>

      <!-- Exposición con síntomas -->
      <div class="border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
        <button
          class="w-full flex items-center justify-between p-3 text-left hover:bg-red-50 transition-colors"
          :class="isOpen('con-sintomas') ? 'bg-red-50' : 'bg-white'"
          @click="toggle('con-sintomas')"
        >
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-red-400"></div>
            <span class="font-medium text-gray-800">Exposición con síntomas</span>
            <span class="text-xs text-gray-500">(2 plantillas)</span>
          </div>
          <svg class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': isOpen('con-sintomas') }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div v-if="isOpen('con-sintomas')" class="border-t bg-red-50 p-3 space-y-2">
            <div
              v-for="qi in quickInserts.filter(q => q.id.includes('con-sintomas') || q.id.includes('con-hipoacusia') || q.id.includes('con-tinnitus'))"
              :key="qi.id"
              class="flex items-center justify-between border rounded-lg p-2 bg-white hover:shadow-sm transition-shadow"
            >
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-800">{{ qi.titulo }}</p>
                <p class="text-xs text-gray-600 line-clamp-1 mt-1">{{ qi.texto }}</p>
              </div>
              <button
                class="ml-2 px-2 py-1 rounded text-xs text-emerald-700 border border-emerald-600 hover:bg-emerald-50 transition-colors"
                @click="insertarQuick(qi.texto)"
                title="Insertar en textarea"
              >
                Insertar
              </button>
            </div>
          </div>
        </transition>
      </div>


      <!-- Patologías otoscópicas -->
      <div class="border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
        <button
          class="w-full flex items-center justify-between p-3 text-left hover:bg-purple-50 transition-colors"
          :class="isOpen('patologias') ? 'bg-purple-50' : 'bg-white'"
          @click="toggle('patologias')"
        >
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-purple-400"></div>
            <span class="font-medium text-gray-800">Patologías otoscópicas</span>
            <span class="text-xs text-gray-500">(3 plantillas)</span>
          </div>
          <svg class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': isOpen('patologias') }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div v-if="isOpen('patologias')" class="border-t bg-purple-50 p-3 space-y-2">
            <div
              v-for="qi in quickInserts.filter(q => q.id.includes('cerumen') || q.id.includes('perforacion') || q.id.includes('otitis-externa'))"
              :key="qi.id"
              class="flex items-center justify-between border rounded-lg p-2 bg-white hover:shadow-sm transition-shadow"
            >
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-800">{{ qi.titulo }}</p>
                <p class="text-xs text-gray-600 line-clamp-1 mt-1">{{ qi.texto }}</p>
              </div>
              <button
                class="ml-2 px-2 py-1 rounded text-xs text-emerald-700 border border-emerald-600 hover:bg-emerald-50 transition-colors"
                @click="insertarQuick(qi.texto)"
                title="Insertar en textarea"
              >
                Insertar
              </button>
            </div>
          </div>
        </transition>
      </div>

      <!-- Casos de revisión -->
      <div class="border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
        <button
          class="w-full flex items-center justify-between p-3 text-left hover:bg-indigo-50 transition-colors"
          :class="isOpen('revision') ? 'bg-indigo-50' : 'bg-white'"
          @click="toggle('revision')"
        >
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-indigo-400"></div>
            <span class="font-medium text-gray-800">Casos de revisión</span>
            <span class="text-xs text-gray-500">(2 plantillas)</span>
          </div>
          <svg class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': isOpen('revision') }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div v-if="isOpen('revision')" class="border-t bg-indigo-50 p-3 space-y-2">
            <div
              v-for="qi in quickInserts.filter(q => q.id.startsWith('revision'))"
              :key="qi.id"
              class="flex items-center justify-between border rounded-lg p-2 bg-white hover:shadow-sm transition-shadow"
            >
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-800">{{ qi.titulo }}</p>
                <p class="text-xs text-gray-600 line-clamp-1 mt-1">{{ qi.texto }}</p>
              </div>
              <button
                class="ml-2 px-2 py-1 rounded text-xs text-emerald-700 border border-emerald-600 hover:bg-emerald-50 transition-colors"
                @click="insertarQuick(qi.texto)"
                title="Insertar en textarea"
              >
                Insertar
              </button>
            </div>
          </div>
        </transition>
      </div>

    </div>

    <!-- === Constructor de observaciones === -->
    <div class="my-6">
      <!-- <button
        class="font-medium py-1.5 px-3 rounded-lg text-sm transition-all duration-200 flex items-center justify-between group"
        :class="isOpen('constructor') 
            ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500 shadow-sm' 
            : 'bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white'"
        @click="toggle('constructor')"
      >
        <span>Constructor de observaciones</span>
        <svg class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': isOpen('constructor') }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button> -->

      <!-- <transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 transform -translate-y-2 max-h-0"
        enter-to-class="opacity-100 transform translate-y-0 max-h-[1200px]"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 transform translate-y-0 max-h-[1200px]"
        leave-to-class="opacity-0 transform -translate-y-2 max-h-0"
      >
        <div v-if="isOpen('constructor')" class="p-4 border rounded-md shadow-sm bg-white mt-3 overflow-hidden"> -->
          <!-- Exposición + duración + EPP -->
          <!-- <div class="grid grid-cols-1 md:grid-cols-1 gap-4"> -->
            <!-- Exposición -->
            <!-- <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Exposición</label>
              <div class="space-y-2">
                <label v-for="op in EXPOSICION" :key="op.value" class="flex items-center gap-2 text-sm">
                  <input type="radio" class="text-emerald-600 focus:ring-emerald-500"
                         v-model="builder.exposicion" :value="op.value" />
                  <span>{{ op.label }}</span>
                </label>
              </div>
            </div> -->

            <!-- Duración -->
            <!-- <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Duración (años)</label>
              <div class="flex gap-2">
                <select
                  class="flex-1 p-2 border rounded-md text-sm focus:outline-none focus:border-emerald-500"
                  v-model="builder.duracion"
                >
                  <option value="">—</option>
                  <option v-for="d in DURACIONES" :key="d" :value="d">{{ d }}</option>
                </select>
                <input
                  type="text"
                  inputmode="decimal"
                  placeholder="otra (p. ej., 2.5)"
                  class="w-40 p-2 border rounded-md text-sm focus:outline-none focus:border-emerald-500"
                  v-model="builder.duracionLibre"
                />
              </div>
            </div> -->

            <!-- EPP -->
           <!--  <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">EPP</label>
              <div class="space-y-2">
                <label v-for="op in EPP" :key="op.value" class="flex items-center gap-2 text-sm">
                  <input type="radio" class="text-emerald-600 focus:ring-emerald-500"
                         v-model="builder.epp" :value="op.value" />
                  <span>{{ op.label }}</span>
                </label>
              </div>
            </div> -->
          <!-- </div> -->

          <!-- Síntomas + Otoscopia + Antecedentes -->
          <!-- <div class="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4"> -->
            <!-- Síntomas -->
            <!-- <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Síntomas</label>
              <div class="space-y-2">
                <label v-for="s in SINTOMAS" :key="s.value" class="flex items-center gap-2 text-sm">
                  <input type="checkbox" class="text-emerald-600 focus:ring-emerald-500"
                         v-model="builder.sintomas" :value="s.value" />
                  <span>{{ s.label }}</span>
                </label>
              </div>
            </div> -->

            <!-- Otoscopia -->
            <!-- <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Otoscopia</label>
              <div class="space-y-2">
                <label v-for="o in OTOSCOPIA" :key="o.value" class="flex items-center gap-2 text-sm">
                  <input type="checkbox" class="text-emerald-600 focus:ring-emerald-500"
                         v-model="builder.otoscopia" :value="o.value" />
                  <span>{{ o.label }}</span>
                </label>
              </div>
            </div> -->

            <!-- Antecedentes otológicos -->
           <!--  <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Antecedentes otológicos</label>
              <div class="space-y-2">
                <label v-for="a in ANTECEDENTES" :key="a.value" class="flex items-center gap-2 text-sm">
                  <input type="checkbox" class="text-emerald-600 focus:ring-emerald-500"
                         v-model="builder.antecedentes" :value="a.value" />
                  <span>{{ a.label }}</span>
                </label>
              </div>
            </div> -->
          <!-- </div> -->

          <!-- Vista previa + acciones -->
          <!-- <div class="mt-4 flex flex-col md:flex-row gap-3 items-start"> -->
            <!-- <button
              class="px-4 py-2 rounded-md text-white bg-emerald-600 hover:bg-emerald-700 text-sm font-medium"
              @click="generarVistaPrevia"
            >
              Construir observación
            </button>
            <button
              class="px-4 py-2 rounded-md text-emerald-700 bg-emerald-50 border border-emerald-600 hover:bg-emerald-100 text-sm font-medium"
              @click="insertarDesdeConstructor"
            >
              Insertar
            </button> -->
            <!-- <button
              class="px-4 py-2 rounded-md text-emerald-700 bg-white border border-emerald-600 hover:bg-emerald-50 text-sm font-medium"
              @click="copiarTexto(vistaPrevia || construirObservacion())"
            >
              Copiar vista previa
            </button>
            <span v-if="mensajeCopiado" class="text-emerald-600 text-sm font-medium">¡Copiado!</span> -->
          <!-- </div> -->

          <!-- <div class="mt-3 p-3 border rounded-md bg-gray-50 text-sm text-gray-800">
            <span class="block font-medium mb-1">Vista previa</span>
            <p class="whitespace-pre-line">{{ vistaPrevia || '—' }}</p>
          </div> -->
        <!-- </div> -->
      <!-- </transition> -->
    </div>

  </div>
</template>
