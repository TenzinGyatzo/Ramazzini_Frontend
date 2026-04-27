<script setup>
import { watch, ref, nextTick, onBeforeUnmount } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

/** Debe coincidir con `siNoOpciones` en entrevista-psicologica.schema.ts */
const SI = 'Sí';
const NO = 'No';

/** Texto guardado al salir del paso si permanece en «No» */
const NIEGA_IDEACION_SUICIDA = 'Niega ideación suicida actual o reciente.';

const { formDataEntrevistaPsicologica } = useFormDataStore();
const documentos = useDocumentosStore();

const frasesPorCategoria = [
  {
    id: 'pasiva',
    titulo: 'Ideación pasiva (bajo nivel de riesgo)',
    textos: [
      'Refiere pensamientos ocasionales de muerte sin intención de hacerse daño.',
      'Expresa deseos pasivos de no despertar, sin plan ni intención.',
      'Menciona ideas de escape ante estrés, sin intención autolesiva.',
    ],
  },
  {
    id: 'activa-sin-plan',
    titulo: 'Ideación activa sin plan (riesgo moderado)',
    textos: [
      'Refiere pensamientos de hacerse daño sin plan estructurado.',
      'Expresa ideación suicida intermitente, niega intención inmediata.',
      'Reconoce pensamientos autolesivos en contexto de estrés, sin planificación.',
    ],
  },
  {
    id: 'activa-con-plan',
    titulo: 'Ideación activa con plan (alto riesgo)',
    textos: [
      'Refiere ideación suicida con plan definido.',
      'Expresa intención de autolesión con planificación específica.',
      'Describe pensamientos suicidas estructurados con método identificado.',
    ],
  },
  {
    id: 'intencion-inmediata',
    titulo: 'Ideación con intención inmediata (muy alto riesgo)',
    textos: [
      'Refiere intención actual de hacerse daño.',
      'Expresa riesgo inminente de autolesión.',
      'Manifiesta intención activa con posibilidad de ejecución inmediata.',
    ],
  },
  {
    id: 'antecedentes',
    titulo: 'Antecedentes relevantes (complementario)',
    textos: [
      'Refiere antecedente de intento autolesivo previo, sin ideación actual.',
      'Niega ideación actual, con antecedente remoto de autolesión.',
    ],
  },
];

const seccionAbierta = ref(null);
const mensajeInsertado = ref(false);

const toggle = (id) => {
  seccionAbierta.value = seccionAbierta.value === id ? null : id;
};

const isOpen = (id) => seccionAbierta.value === id;

function obtenerIdeacionSuicidaInicial() {
  const desdeForm = formDataEntrevistaPsicologica.ideacionSuicida;
  if (desdeForm === SI || desdeForm === NO) {
    return desdeForm;
  }
  const desdeDoc = documentos.currentDocument?.ideacionSuicida;
  if (desdeDoc === SI || desdeDoc === NO) {
    return desdeDoc;
  }
  return NO;
}

function obtenerObservacionesInicial() {
  if (obtenerIdeacionSuicidaInicial() !== SI) {
    return '';
  }
  const desdeForm = formDataEntrevistaPsicologica.observacionesIdeacionSuicida;
  if (typeof desdeForm === 'string') {
    return desdeForm;
  }
  const desdeDoc = documentos.currentDocument?.observacionesIdeacionSuicida;
  return typeof desdeDoc === 'string' ? desdeDoc : '';
}

const ideacionSuicida = ref(obtenerIdeacionSuicidaInicial());
const observacionesIdeacionSuicida = ref(obtenerObservacionesInicial());

const textareaObservaciones = ref(null);

const insertarFrase = async (texto) => {
  observacionesIdeacionSuicida.value = texto;
  mensajeInsertado.value = true;
  setTimeout(() => {
    mensajeInsertado.value = false;
  }, 2000);
  await nextTick();
  textareaObservaciones.value?.focus();
};

watch(ideacionSuicida, async (nuevo, anterior) => {
  formDataEntrevistaPsicologica.ideacionSuicida = nuevo;
  if (nuevo === NO) {
    seccionAbierta.value = null;
    observacionesIdeacionSuicida.value = '';
    if (anterior === SI) {
      formDataEntrevistaPsicologica.observacionesIdeacionSuicida = undefined;
    }
  } else {
    formDataEntrevistaPsicologica.observacionesIdeacionSuicida = observacionesIdeacionSuicida.value;
    await nextTick();
    textareaObservaciones.value?.focus();
  }
}, { immediate: true });

watch(observacionesIdeacionSuicida, (nuevo) => {
  if (ideacionSuicida.value === SI) {
    formDataEntrevistaPsicologica.observacionesIdeacionSuicida = nuevo;
  }
}, { immediate: true });

onBeforeUnmount(() => {
  if (ideacionSuicida.value === NO) {
    formDataEntrevistaPsicologica.observacionesIdeacionSuicida = NIEGA_IDEACION_SUICIDA;
  }
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Riesgo inmediato (crítico)</h1>
    <h2 class="text-lg font-semibold mb-4 text-gray-700">IDEACIÓN SUICIDA</h2>

    <div class="mb-8">
      <p class="text-lg font-medium mb-4 text-gray-800">
        ¿El trabajador refiere o muestra ideación suicida durante la entrevista?
      </p>

      <div class="grid grid-cols-2 gap-3">
        <label
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            ideacionSuicida === NO
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input
            type="radio"
            :value="NO"
            v-model="ideacionSuicida"
            class="sr-only"
          />
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              ideacionSuicida === NO ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600',
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span
            :class="[
              'text-base font-semibold transition-colors duration-200',
              ideacionSuicida === NO ? 'text-emerald-700' : 'text-gray-700',
            ]"
          >
            No
          </span>
          <div
            v-if="ideacionSuicida === NO"
            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>

        <label
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            ideacionSuicida === SI
              ? 'border-red-600 bg-red-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-red-300 hover:bg-red-50/40 hover:shadow-sm',
          ]"
        >
          <input
            type="radio"
            :value="SI"
            v-model="ideacionSuicida"
            class="sr-only"
          />
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              ideacionSuicida === SI ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600',
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <span
            :class="[
              'text-base font-semibold transition-colors duration-200',
              ideacionSuicida === SI ? 'text-red-800' : 'text-gray-700',
            ]"
          >
            Sí
          </span>
          <div
            v-if="ideacionSuicida === SI"
            class="absolute top-2 right-2 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>
      </div>
    </div>

    <transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 transform -translate-y-2"
      enter-to-class="opacity-100 transform translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 transform translate-y-0"
      leave-to-class="opacity-0 transform -translate-y-2"
    >
      <div v-if="ideacionSuicida === SI" class="mt-6 space-y-4">
        <div class="flex justify-between items-start gap-2">
          <p class="text-lg font-medium text-gray-800">Observaciones</p>
          <span v-if="mensajeInsertado" class="text-red-600 text-sm shrink-0">¡Aplicado!</span>
        </div>

        <textarea
          ref="textareaObservaciones"
          v-model="observacionesIdeacionSuicida"
          data-skip-validation
          class="w-full p-3 border-2 border-red-200 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all duration-200 min-h-[100px] resize-y"
          placeholder="Describa hallazgos, nivel de riesgo inmediato y medidas tomadas o indicadas"
        />

        <div class="mb-1">
          <p class="text-sm font-medium text-gray-800 leading-5">Ejemplos:</p>
        </div>

        <div class="space-y-2 max-h-[28vh] overflow-y-auto pr-1">
          <template v-for="grupo in frasesPorCategoria" :key="grupo.id">
            <button
              type="button"
              class="bg-white text-red-700 border border-red-600 hover:bg-red-600 hover:text-white font-medium py-2 px-4 rounded-lg block w-full text-left"
              @click="toggle(grupo.id)"
            >
              {{ grupo.titulo }}
            </button>
            <div
              v-if="isOpen(grupo.id)"
              class="p-4 border-l-4 border-red-500 bg-gray-100 rounded-r space-y-3"
            >
              <p
                v-for="(txt, idx) in grupo.textos"
                :key="idx"
                class="italic text-sm font-light text-gray-700 hover:text-red-700 cursor-pointer text-justify"
                @click="insertarFrase(txt)"
              >
                {{ txt }}
              </p>
            </div>
          </template>
        </div>
      </div>
    </transition>
  </div>
</template>
