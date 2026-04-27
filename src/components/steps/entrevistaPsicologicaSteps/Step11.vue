<script setup>
import { watch, ref, nextTick, onBeforeUnmount } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

/** Debe coincidir con `siNoOpciones` en entrevista-psicologica.schema.ts */
const SI = 'Sí';
const NO = 'No';

/** Texto guardado al salir del paso si permanece en «No» */
const DESCRIPCION_SIN_ALTERACIONES_PENSAMIENTO =
  'Pensamiento lógico y coherente, sin alteraciones evidentes.';

const { formDataEntrevistaPsicologica } = useFormDataStore();
const documentos = useDocumentosStore();

/** Frases de apoyo (mismo criterio visual que aptitud Step10: título + texto clicable). */
const frasesAlteracionesPensamiento = [
  {
    id: 'desorganizacion-leve',
    titulo: 'Desorganización leve',
    texto:
      'Dificultad ocasional para mantener el hilo de la conversación, con leves desviaciones del tema.',
  },
  {
    id: 'tangencialidad',
    titulo: 'Tangencialidad',
    texto:
      'Responde de forma indirecta, desviándose del tema principal sin llegar al punto solicitado.',
  },
  {
    id: 'circunstancialidad',
    titulo: 'Circunstancialidad',
    texto:
      'Incluye detalles excesivos antes de llegar a la idea principal, aunque finalmente responde.',
  },
  {
    id: 'bloqueo-pensamiento',
    titulo: 'Bloqueo del pensamiento',
    texto:
      'Interrupciones súbitas del discurso, con dificultad para retomar la idea previa.',
  },
  {
    id: 'contenido-inusual',
    titulo: 'Contenido inusual',
    texto:
      'Expresa ideas poco comunes que no corresponden al contexto, sin mayor elaboración.',
  },
  {
    id: 'pensamiento-rigido',
    titulo: 'Pensamiento rígido',
    texto:
      'Dificultad para considerar perspectivas alternativas, con respuestas inflexibles.',
  },
  {
    id: 'preocupacion-persistente',
    titulo: 'Preocupación persistente',
    texto:
      'Pensamiento centrado repetitivamente en preocupaciones laborales, con dificultad para redirigir la atención.',
  },
  {
    id: 'pobreza-pensamiento',
    titulo: 'Pobreza de pensamiento',
    texto: 'Respuestas breves y limitadas, con escasa elaboración de ideas.',
  },
];

/** Acordeón: solo una frase desplegada; al abrir otra se cierra la anterior. */
const seccionAbierta = ref(null);
const mensajeInsertado = ref(false);

const toggle = (id) => {
  seccionAbierta.value = seccionAbierta.value === id ? null : id;
};

const isOpen = (id) => seccionAbierta.value === id;

function obtenerAlteracionesPensamientoInicial() {
  const desdeForm = formDataEntrevistaPsicologica.alteracionesPensamiento;
  if (desdeForm === SI || desdeForm === NO) {
    return desdeForm;
  }
  const desdeDoc = documentos.currentDocument?.alteracionesPensamiento;
  if (desdeDoc === SI || desdeDoc === NO) {
    return desdeDoc;
  }
  return NO;
}

function obtenerDescripcionInicial() {
  if (obtenerAlteracionesPensamientoInicial() !== SI) {
    return '';
  }
  const desdeForm = formDataEntrevistaPsicologica.descripcionAlteracionesPensamiento;
  if (typeof desdeForm === 'string') {
    return desdeForm;
  }
  const desdeDoc = documentos.currentDocument?.descripcionAlteracionesPensamiento;
  return typeof desdeDoc === 'string' ? desdeDoc : '';
}

const alteracionesPensamiento = ref(obtenerAlteracionesPensamientoInicial());
const descripcionAlteracionesPensamiento = ref(obtenerDescripcionInicial());

const textareaDescripcion = ref(null);

const insertarFrase = async (texto) => {
  descripcionAlteracionesPensamiento.value = texto;
  mensajeInsertado.value = true;
  setTimeout(() => {
    mensajeInsertado.value = false;
  }, 2000);
  await nextTick();
  textareaDescripcion.value?.focus();
};

watch(alteracionesPensamiento, async (nuevo, anterior) => {
  formDataEntrevistaPsicologica.alteracionesPensamiento = nuevo;
  if (nuevo === NO) {
    seccionAbierta.value = null;
    descripcionAlteracionesPensamiento.value = '';
    if (anterior === SI) {
      formDataEntrevistaPsicologica.descripcionAlteracionesPensamiento = undefined;
    }
  } else {
    formDataEntrevistaPsicologica.descripcionAlteracionesPensamiento = descripcionAlteracionesPensamiento.value;
    await nextTick();
    textareaDescripcion.value?.focus();
  }
}, { immediate: true });

watch(descripcionAlteracionesPensamiento, (nuevo) => {
  if (alteracionesPensamiento.value === SI) {
    formDataEntrevistaPsicologica.descripcionAlteracionesPensamiento = nuevo;
  }
}, { immediate: true });

onBeforeUnmount(() => {
  if (alteracionesPensamiento.value === NO) {
    formDataEntrevistaPsicologica.descripcionAlteracionesPensamiento = DESCRIPCION_SIN_ALTERACIONES_PENSAMIENTO;
  }
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Pensamiento</h1>
    <h2 class="text-lg font-semibold mb-4 text-gray-700">ALTERACIONES DEL PENSAMIENTO</h2>

    <div class="mb-8">
      <p class="text-lg font-medium mb-4 text-gray-800">
        ¿Nota o percibe alteraciones del pensamiento en el trabajador?
      </p>

      <div class="grid grid-cols-2 gap-3">
        <label
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            alteracionesPensamiento === NO
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input
            type="radio"
            :value="NO"
            v-model="alteracionesPensamiento"
            class="sr-only"
          />
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              alteracionesPensamiento === NO ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600',
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span
            :class="[
              'text-base font-semibold transition-colors duration-200',
              alteracionesPensamiento === NO ? 'text-emerald-700' : 'text-gray-700',
            ]"
          >
            No
          </span>
          <div
            v-if="alteracionesPensamiento === NO"
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
            alteracionesPensamiento === SI
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input
            type="radio"
            :value="SI"
            v-model="alteracionesPensamiento"
            class="sr-only"
          />
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              alteracionesPensamiento === SI ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600',
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span
            :class="[
              'text-base font-semibold transition-colors duration-200',
              alteracionesPensamiento === SI ? 'text-emerald-700' : 'text-gray-700',
            ]"
          >
            Sí
          </span>
          <div
            v-if="alteracionesPensamiento === SI"
            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
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
      <div v-if="alteracionesPensamiento === SI" class="mt-6 space-y-4">
        <div class="flex justify-between items-start gap-2">
          <p class="text-lg font-medium text-gray-800">Descripción de alteraciones</p>
          <span v-if="mensajeInsertado" class="text-emerald-600 text-sm shrink-0">¡Aplicado!</span>
        </div>

        <textarea
          ref="textareaDescripcion"
          v-model="descripcionAlteracionesPensamiento"
          data-skip-validation
          class="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200 min-h-[100px] resize-y"
          placeholder="Describa las alteraciones del pensamiento observadas"
        />

        <div class="mb-1">
          <p class="text-sm font-medium text-gray-800 leading-5">Ejemplos:</p>
        </div>

        <div class="space-y-2 max-h-[20vh] overflow-y-auto pr-1">
          <template v-for="item in frasesAlteracionesPensamiento" :key="item.id">
            <button
              type="button"
              class="bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white font-medium py-2 px-4 rounded-lg block w-full text-left"
              @click="toggle(item.id)"
            >
              {{ item.titulo }}
            </button>
            <div
              v-if="isOpen(item.id)"
              class="p-4 border-l-4 border-emerald-500 bg-gray-100 rounded-r"
            >
              <p
                class="italic text-sm font-light text-gray-700 hover:text-emerald-700 cursor-pointer text-justify"
                @click="insertarFrase(item.texto)"
              >
                {{ item.texto }}
              </p>
            </div>
          </template>
        </div>

      </div>
    </transition>
  </div>
</template>
