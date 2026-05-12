<script setup>
import { computed, ref, shallowRef, watch, onMounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import {
  CHIPS_SINTOMAS_FRECUENTES_OTROS,
  ETIQUETAS_ASINTOMATICO_VARIANTES,
  SUGERENCIAS_ADHERENCIA_TERAPEUTICA,
} from '@/helpers/cardiometabolico/evolucionYSugerencias';

const VARIANTES_ASINTOMATICO_SET = new Set(ETIQUETAS_ASINTOMATICO_VARIANTES);

const { formDataEventoSeguimientoCardiometabolico } = useFormDataStore();
const documentos = useDocumentosStore();
const trabajadores = useTrabajadoresStore();

const textareaObservacionesClass =
  'w-full min-h-[5rem] p-2.5 text-sm border-2 border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200';
const inputFullClass =
  'w-full py-2 px-3 text-sm border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500';
const labelClass = 'block text-sm font-semibold text-gray-800 mb-1.5';

const etiquetaAsintomaticoSexo = computed(() =>
  trabajadores.currentTrabajador?.sexo === 'Femenino'
    ? 'Asintomática'
    : 'Asintomático',
);

const chipsEnPantalla = computed(() => [
  etiquetaAsintomaticoSexo.value,
  ...CHIPS_SINTOMAS_FRECUENTES_OTROS,
]);

function quitarVariantsAsintomaticoDelSet(set) {
  set.delete('Asintomático');
  set.delete('Asintomática');
}

const adherenciaTerapeutica = ref('');
const sintomasTextoLibre = ref('');
const mostrarTextoLibreSintomas = ref(false);
/** @type {import('vue').ShallowRef<Set<string>>} */
const sintomasChipsOn = shallowRef(new Set());

function sintomasSeleccionadosEnOrden() {
  const on = sintomasChipsOn.value;
  const etiquetaAs = etiquetaAsintomaticoSexo.value;
  const otros = CHIPS_SINTOMAS_FRECUENTES_OTROS.filter((c) => on.has(c));
  if (on.has(etiquetaAs)) return [etiquetaAs, ...otros];
  return otros;
}

function construirTextoSintomas() {
  const line = sintomasSeleccionadosEnOrden().join('; ');
  const lib = sintomasTextoLibre.value.trim();
  if (line && lib) return `${line}\n\n${lib}`;
  if (line) return line;
  return lib;
}

function hydrateSintomasDesdeCadena(raw) {
  sintomasTextoLibre.value = '';
  sintomasChipsOn.value = new Set();
  mostrarTextoLibreSintomas.value = false;

  if (raw == null || raw === '') return;

  const str = String(raw);
  const parts = str.split(/\n\n+/);
  const head = parts[0] ?? '';
  const tail = parts.slice(1).join('\n\n').trim();

  const nextSet = new Set();
  const unknownTokens = [];
  const etiquetaAsCanon = etiquetaAsintomaticoSexo.value;
  const otrosLabels = new Set(CHIPS_SINTOMAS_FRECUENTES_OTROS);

  for (const tok of head.split(';').map((t) => t.trim()).filter(Boolean)) {
    if (VARIANTES_ASINTOMATICO_SET.has(tok))
      nextSet.add(etiquetaAsCanon);
    else if (otrosLabels.has(tok)) nextSet.add(tok);
    else unknownTokens.push(tok);
  }

  let libre = tail;
  if (unknownTokens.length) {
    const orphan = unknownTokens.join('; ');
    libre = libre ? `${orphan}\n\n${libre}` : orphan;
  }

  sintomasChipsOn.value = nextSet;
  sintomasTextoLibre.value = libre;
  mostrarTextoLibreSintomas.value = libre.trim().length > 0;
}

function toggleTextoLibreSintomas() {
  mostrarTextoLibreSintomas.value = !mostrarTextoLibreSintomas.value;
}

function toggleChipEtiqueta(etiqueta) {
  const prev = sintomasChipsOn.value;
  const next = new Set(prev);
  const etiquetaAs = etiquetaAsintomaticoSexo.value;
  const estabaSeleccionado = next.has(etiqueta);

  if (estabaSeleccionado) {
    next.delete(etiqueta);
    sintomasChipsOn.value = next;
    return;
  }

  if (etiqueta === etiquetaAs) {
    sintomasChipsOn.value = new Set([etiquetaAs]);
    return;
  }

  quitarVariantsAsintomaticoDelSet(next);
  next.add(etiqueta);
  sintomasChipsOn.value = next;
}

/** @param {string} etiqueta */
function chipActivoClase(etiqueta) {
  return sintomasChipsOn.value.has(etiqueta)
    ? 'border-emerald-600 bg-emerald-600 text-white'
    : 'border-gray-300 bg-white text-gray-800 hover:border-emerald-400';
}

function pushAll() {
  const fd = formDataEventoSeguimientoCardiometabolico;
  fd.adherenciaTerapeutica = adherenciaTerapeutica.value;
  fd.sintomasRelevantes = construirTextoSintomas();
}

function hydrateFrom(source) {
  if (!source) return;
  if (source.adherenciaTerapeutica != null)
    adherenciaTerapeutica.value = source.adherenciaTerapeutica;
  if (source.sintomasRelevantes != null)
    hydrateSintomasDesdeCadena(source.sintomasRelevantes);
}

function debePrefijarAsintomatico() {
  return (
    sintomasChipsOn.value.size === 0 &&
    sintomasTextoLibre.value.trim() === ''
  );
}

onMounted(() => {
  hydrateFrom(documentos.currentDocument);
  hydrateFrom(formDataEventoSeguimientoCardiometabolico);
  if (debePrefijarAsintomatico()) {
    sintomasChipsOn.value = new Set([etiquetaAsintomaticoSexo.value]);
  }
  pushAll();
});

watch([adherenciaTerapeutica, sintomasTextoLibre, sintomasChipsOn], () => pushAll());
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-3 text-gray-900">
      Adherencia terapéutica y síntomas relevantes
    </h1>

    <div class="space-y-4">
      <section
        aria-labelledby="titulo-sintomas-esc"
        class="rounded-lg border border-gray-200 bg-gray-50/70 p-2 sm:p-3 space-y-3"
      >
        <div class="border-b border-gray-200 pb-3">
          <h2 id="titulo-sintomas-esc" class="text-sm font-semibold text-gray-900">
            Síntomas relevantes
          </h2>
          <p class="text-xs text-gray-600 mt-1 leading-relaxed">
            Seleccione hallazgos frecuentes; puede ampliar con texto libre.
          </p>
          <div class="flex flex-wrap gap-2 mt-3">
            <button
              v-for="lbl in chipsEnPantalla"
              :key="lbl"
              type="button"
              class="rounded-full px-3 py-1 text-xs border-2 transition-colors duration-150"
              :class="chipActivoClase(lbl)"
              @click="toggleChipEtiqueta(lbl)"
            >
              {{ lbl }}
            </button>
          </div>
          <div
            class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 pt-3 border-t border-gray-200/90"
          >
            <button
              type="button"
              class="inline-flex items-center rounded-full border border-dashed border-emerald-400/70 bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 shadow-sm hover:bg-emerald-50/90 hover:border-emerald-500 transition-colors"
              @click="toggleTextoLibreSintomas"
            >
              {{ mostrarTextoLibreSintomas ? 'Ocultar descripción libre' : 'Describir más' }}
            </button>
            <span
              v-if="sintomasTextoLibre.trim() && !mostrarTextoLibreSintomas"
              class="text-xs text-gray-500"
              title="Hay texto opcional registrado para esta misma sección"
            >
              Hay descripción opcional oculta
            </span>
          </div>
        </div>
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div v-if="mostrarTextoLibreSintomas" class="space-y-1.5">
            <label :class="labelClass" for="sintomas-texto-libre">
              Texto opcional sobre síntomas
            </label>

            <textarea
              id="sintomas-texto-libre"
              v-model="sintomasTextoLibre"
              rows="3"
              :class="textareaObservacionesClass"
            />
          </div>
        </Transition>
      </section>

      <div class="flex flex-col min-w-0">
        <label :class="labelClass" for="adherencia-inp">Adherencia terapéutica</label>
        <div class="relative">
          <input
            id="adherencia-inp"
            v-model="adherenciaTerapeutica"
            type="text"
            autocomplete="off"
            list="dl-esc-adherencia"
            :class="inputFullClass"
            placeholder="Selecciona o escribe"
          />
          <datalist id="dl-esc-adherencia">
            <option v-for="s in SUGERENCIAS_ADHERENCIA_TERAPEUTICA" :key="s" :value="s">
              {{ s }}
            </option>
          </datalist>
        </div>
      </div>
      
    </div>
  </div>
</template>
