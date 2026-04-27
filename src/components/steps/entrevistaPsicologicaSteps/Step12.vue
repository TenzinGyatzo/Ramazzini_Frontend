<script setup>
import { watch, ref, nextTick, onBeforeUnmount } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

/** Debe coincidir con `siNoOpciones` en entrevista-psicologica.schema.ts */
const SI = 'Sí';
const NO = 'No';

/** Texto guardado al salir del paso si permanece en «No» */
const DESCRIPCION_SIN_ALTERACIONES_PERCEPTUALES =
  'Niega alteraciones perceptuales durante la entrevista.';

const { formDataEntrevistaPsicologica } = useFormDataStore();
const documentos = useDocumentosStore();

const frasesAlteracionesPerceptuales = [
  {
    id: 'experiencias-auditivas-inespecificas',
    titulo: 'Experiencias auditivas inespecíficas',
    texto:
      'Refiere haber percibido sonidos sin fuente clara en algunas ocasiones.',
  },
  {
    id: 'experiencias-visuales-inespecificas',
    titulo: 'Experiencias visuales inespecíficas',
    texto:
      'Refiere haber visto sombras o figuras breves sin estímulo identificable.',
  },
  {
    id: 'sensacion-de-presencia',
    titulo: 'Sensación de presencia',
    texto:
      'Describe sensación ocasional de presencia sin evidencia externa.',
  },
  {
    id: 'percepcion-distorsionada',
    titulo: 'Percepción distorsionada',
    texto:
      'Refiere percepción alterada del entorno, describiéndolo como extraño o irreal.',
  },
  {
    id: 'despersonalizacion',
    titulo: 'Despersonalización',
    texto:
      'Refiere sensación de desconexión de sí mismo, como si se observara desde fuera.',
  },
  {
    id: 'desrealizacion',
    titulo: 'Desrealización',
    texto:
      'Percibe el entorno como irreal o diferente a lo habitual, sin cambios objetivos.',
  },
  {
    id: 'experiencias-perceptuales-sin-claridad',
    titulo: 'Experiencias perceptuales sin claridad',
    texto:
      'Describe experiencias perceptuales inusuales sin poder precisar características.',
  },
  {
    id: 'experiencias-intermitentes',
    titulo: 'Experiencias intermitentes',
    texto:
      'Refiere episodios ocasionales de percepciones inusuales, sin persistencia.',
  },
  {
    id: 'percepcion-aumentada-hipersensibilidad',
    titulo: 'Percepción aumentada (hipersensibilidad)',
    texto:
      'Refiere sensibilidad aumentada a estímulos ambientales (ruido, luz).',
  },
];

const seccionAbierta = ref(null);
const mensajeInsertado = ref(false);

const toggle = (id) => {
  seccionAbierta.value = seccionAbierta.value === id ? null : id;
};

const isOpen = (id) => seccionAbierta.value === id;

function obtenerAlteracionesPerceptualesInicial() {
  const desdeForm = formDataEntrevistaPsicologica.alteracionesPerceptuales;
  if (desdeForm === SI || desdeForm === NO) {
    return desdeForm;
  }
  const desdeDoc = documentos.currentDocument?.alteracionesPerceptuales;
  if (desdeDoc === SI || desdeDoc === NO) {
    return desdeDoc;
  }
  return NO;
}

function obtenerDescripcionInicial() {
  if (obtenerAlteracionesPerceptualesInicial() !== SI) {
    return '';
  }
  const desdeForm = formDataEntrevistaPsicologica.descripcionAlteracionesPerceptuales;
  if (typeof desdeForm === 'string') {
    return desdeForm;
  }
  const desdeDoc = documentos.currentDocument?.descripcionAlteracionesPerceptuales;
  return typeof desdeDoc === 'string' ? desdeDoc : '';
}

const alteracionesPerceptuales = ref(obtenerAlteracionesPerceptualesInicial());
const descripcionAlteracionesPerceptuales = ref(obtenerDescripcionInicial());

const textareaDescripcion = ref(null);

const insertarFrase = async (texto) => {
  descripcionAlteracionesPerceptuales.value = texto;
  mensajeInsertado.value = true;
  setTimeout(() => {
    mensajeInsertado.value = false;
  }, 2000);
  await nextTick();
  textareaDescripcion.value?.focus();
};

watch(alteracionesPerceptuales, async (nuevo, anterior) => {
  formDataEntrevistaPsicologica.alteracionesPerceptuales = nuevo;
  if (nuevo === NO) {
    seccionAbierta.value = null;
    descripcionAlteracionesPerceptuales.value = '';
    if (anterior === SI) {
      formDataEntrevistaPsicologica.descripcionAlteracionesPerceptuales = undefined;
    }
  } else {
    formDataEntrevistaPsicologica.descripcionAlteracionesPerceptuales = descripcionAlteracionesPerceptuales.value;
    await nextTick();
    textareaDescripcion.value?.focus();
  }
}, { immediate: true });

watch(descripcionAlteracionesPerceptuales, (nuevo) => {
  if (alteracionesPerceptuales.value === SI) {
    formDataEntrevistaPsicologica.descripcionAlteracionesPerceptuales = nuevo;
  }
}, { immediate: true });

onBeforeUnmount(() => {
  if (alteracionesPerceptuales.value === NO) {
    formDataEntrevistaPsicologica.descripcionAlteracionesPerceptuales = DESCRIPCION_SIN_ALTERACIONES_PERCEPTUALES;
  }
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Percepción</h1>
    <h2 class="text-lg font-semibold mb-4 text-gray-700">ALTERACIONES PERCEPTUALES</h2>

    <div class="mb-8">
      <p class="text-lg font-medium mb-4 text-gray-800">
        ¿Nota o percibe alteraciones perceptuales en el trabajador?
      </p>

      <div class="grid grid-cols-2 gap-3">
        <label
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            alteracionesPerceptuales === NO
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input
            type="radio"
            :value="NO"
            v-model="alteracionesPerceptuales"
            class="sr-only"
          />
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              alteracionesPerceptuales === NO ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600',
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span
            :class="[
              'text-base font-semibold transition-colors duration-200',
              alteracionesPerceptuales === NO ? 'text-emerald-700' : 'text-gray-700',
            ]"
          >
            No
          </span>
          <div
            v-if="alteracionesPerceptuales === NO"
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
            alteracionesPerceptuales === SI
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
          ]"
        >
          <input
            type="radio"
            :value="SI"
            v-model="alteracionesPerceptuales"
            class="sr-only"
          />
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              alteracionesPerceptuales === SI ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600',
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span
            :class="[
              'text-base font-semibold transition-colors duration-200',
              alteracionesPerceptuales === SI ? 'text-emerald-700' : 'text-gray-700',
            ]"
          >
            Sí
          </span>
          <div
            v-if="alteracionesPerceptuales === SI"
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
      <div v-if="alteracionesPerceptuales === SI" class="mt-6 space-y-4">
        <div class="flex justify-between items-start gap-2">
          <p class="text-lg font-medium text-gray-800">Descripción de alteraciones</p>
          <span v-if="mensajeInsertado" class="text-emerald-600 text-sm shrink-0">¡Aplicado!</span>
        </div>

        <textarea
          ref="textareaDescripcion"
          v-model="descripcionAlteracionesPerceptuales"
          data-skip-validation
          class="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200 min-h-[100px] resize-y"
          placeholder="Describa las alteraciones perceptuales observadas"
        />

        <div class="mb-1">
          <p class="text-sm font-medium text-gray-800 leading-5">Ejemplos:</p>
        </div>

        <div class="space-y-2 max-h-[20vh] overflow-y-auto pr-1">
          <template v-for="item in frasesAlteracionesPerceptuales" :key="item.id">
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
