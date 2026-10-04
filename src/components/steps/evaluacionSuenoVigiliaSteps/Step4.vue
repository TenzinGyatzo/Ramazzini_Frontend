<script setup>
import { computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { PREGUNTAS_SEGURIDAD_SUENO_VIGILIA, SI, asegurarGruposSuenoVigilia } from '@/helpers/evaluacionSuenoVigilia';

/**
 * Preguntas de seguridad: siempre visibles, sin puntaje y SIN respuesta por defecto.
 * Una pregunta que nadie leyó no debe quedar registrada como «No».
 */
const formData = useFormDataStore();

const seguridad = computed(() => formData.formDataEvaluacionSuenoVigilia.seguridad ?? {});

const seguridadEditable = () => asegurarGruposSuenoVigilia(formData.formDataEvaluacionSuenoVigilia).seguridad;

const responder = (pregunta, valor) => {
  const grupo = seguridadEditable();
  grupo[pregunta.clave] = valor;
  if (pregunta.campoDescripcion && valor !== SI) delete grupo[pregunta.campoDescripcion];
};

const escribirDescripcion = (pregunta, valor) => {
  const grupo = seguridadEditable();
  if (valor) grupo[pregunta.campoDescripcion] = valor;
  else delete grupo[pregunta.campoDescripcion];
};

const pendientes = computed(
  () => PREGUNTAS_SEGURIDAD_SUENO_VIGILIA.filter((pregunta) => !seguridad.value[pregunta.clave]).length,
);

const claseOpcion = (seleccionada, opcion) => {
  if (!seleccionada) return 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50/50';
  return opcion === SI
    ? 'border-red-600 bg-red-50 text-red-800 shadow-sm'
    : 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm';
};
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-1 text-gray-900">Evaluación de sueño y vigilia</h1>
    <h2 class="text-lg font-semibold text-gray-700">Seguridad</h2>
    <p class="mt-2 text-sm text-gray-600 leading-snug">
      Estas preguntas se hacen siempre y no tienen respuesta por defecto: hay que contestar cada una.
    </p>
    <p v-if="pendientes" class="mt-1 text-sm font-medium text-amber-700">
      {{ pendientes === 1 ? 'Falta 1 pregunta por contestar.' : `Faltan ${pendientes} preguntas por contestar.` }}
    </p>

    <div
      v-for="pregunta in PREGUNTAS_SEGURIDAD_SUENO_VIGILIA"
      :key="pregunta.clave"
      class="mt-4"
      :data-pregunta="pregunta.clave"
    >
      <p class="mb-1.5 text-sm font-medium text-gray-800 leading-snug">{{ pregunta.texto }}</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opcion in pregunta.opciones"
          :key="opcion"
          type="button"
          class="px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all duration-150 ease-in-out"
          :class="claseOpcion(seguridad[pregunta.clave] === opcion, opcion)"
          :aria-pressed="seguridad[pregunta.clave] === opcion"
          @click="responder(pregunta, opcion)"
        >
          {{ opcion }}
        </button>
      </div>

      <div v-if="pregunta.campoDescripcion && seguridad[pregunta.clave] === SI" class="mt-2">
        <label class="text-xs font-medium text-gray-700">
          Describa lo ocurrido: actividad, fecha aproximada y qué pasó
          <textarea
            :value="seguridad[pregunta.campoDescripcion] ?? ''"
            rows="2"
            maxlength="1000"
            data-skip-validation
            class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            @input="escribirDescripcion(pregunta, $event.target.value)"
          ></textarea>
        </label>
      </div>
    </div>
  </div>
</template>
