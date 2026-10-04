<script setup>
import { computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import {
  ACTIVIDADES_NORDICO,
  ATENCION_PROFESIONAL_NORDICO,
  DIAS_IMPEDIMENTO_NORDICO,
  INTENSIDADES_NORDICO,
  NO,
  RELACION_TRABAJO_NORDICO,
  SI,
  TIEMPO_MOLESTIA_NORDICO,
  asegurarRegionesNordico,
  bandaIntensidadNordico,
  limpiarActividadesNordico,
  limpiarDetalleRegionNordico,
} from '@/helpers/cuestionarioNordico';

/**
 * Captura de una región del Cuestionario Nórdico. Con «Sí» en 12 meses se despliega
 * el detalle; con «No» se borra, para que no viaje detalle de una región sin molestia.
 */
const props = defineProps({
  /** Definición de la región (`REGIONES_NORDICO`). */
  region: { type: Object, required: true },
});

const formData = useFormDataStore();

/** Lectura: respuestas actuales de la región (vacío si aún no se captura nada). */
const respuestas = computed(
  () => formData.formDataCuestionarioNordico.regiones?.[props.region.clave] ?? {},
);

/** Escritura: la región dentro del formulario, creándola si hace falta. */
const regionEditable = () =>
  asegurarRegionesNordico(formData.formDataCuestionarioNordico)[props.region.clave];

const conMolestia = computed(() => respuestas.value.molestia12Meses === SI);

const conRelacionLaboral = computed(
  () =>
    respuestas.value.relacionTrabajo === 'Parcialmente' ||
    respuestas.value.relacionTrabajo === 'Principalmente',
);

const responderMolestia12Meses = (valor) => {
  const region = regionEditable();
  region.molestia12Meses = valor;
  if (valor !== SI) limpiarDetalleRegionNordico(region);
};

const responder = (campo, valor) => {
  regionEditable()[campo] = valor;
};

const responderRelacionTrabajo = (valor) => {
  const region = regionEditable();
  region.relacionTrabajo = valor;
  if (valor === 'No relacionada') limpiarActividadesNordico(region);
};

const tieneActividad = (actividad) => (respuestas.value.actividades ?? []).includes(actividad);

const alternarActividad = (actividad) => {
  const region = regionEditable();
  const actuales = region.actividades ?? [];
  const nuevas = actuales.includes(actividad)
    ? actuales.filter((a) => a !== actividad)
    : [...actuales, actividad];
  if (nuevas.length) {
    // Conservar el orden del catálogo, sin importar el orden en que se marcaron
    region.actividades = ACTIVIDADES_NORDICO.filter((a) => nuevas.includes(a));
  } else {
    delete region.actividades;
  }
  if (!nuevas.includes('Otro')) delete region.actividadOtra;
};

const actividadOtra = computed({
  get: () => respuestas.value.actividadOtra ?? '',
  set: (valor) => {
    const region = regionEditable();
    if (valor) region.actividadOtra = valor;
    else delete region.actividadOtra;
  },
});

const claseOpcion = (seleccionada) => [
  'px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all duration-150 ease-in-out',
  seleccionada
    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
    : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50/50',
];

const claseIntensidad = (valor) => {
  if (respuestas.value.intensidad !== valor) {
    return 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400';
  }
  if (valor >= 7) return 'border-red-600 bg-red-600 text-white';
  if (valor >= 4) return 'border-amber-500 bg-amber-500 text-white';
  return 'border-emerald-600 bg-emerald-600 text-white';
};
</script>

<template>
  <div
    class="rounded-lg border bg-white p-3 sm:p-4 transition-colors duration-200"
    :class="conMolestia ? 'border-emerald-300' : 'border-gray-200'"
    :data-region="region.clave"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white"
        >
          {{ region.numero }}
        </span>
        <h3 class="text-base font-semibold text-gray-900">{{ region.etiqueta }}</h3>
      </div>

      <div class="flex items-center gap-2" data-pregunta="molestia12Meses">
        <span class="text-sm text-gray-600">¿Molestia en los últimos 12 meses?</span>
        <button
          v-for="opcion in [NO, SI]"
          :key="opcion"
          type="button"
          :class="claseOpcion(respuestas.molestia12Meses === opcion)"
          :aria-pressed="respuestas.molestia12Meses === opcion"
          @click="responderMolestia12Meses(opcion)"
        >
          {{ opcion }}
        </button>
      </div>
    </div>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="conMolestia" class="mt-4 space-y-4 border-t border-gray-200 pt-4">
        <div data-pregunta="tiempoMolestia12Meses">
          <p class="mb-1.5 text-sm font-medium text-gray-800">Tiempo total con molestia en los últimos 12 meses</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opcion in TIEMPO_MOLESTIA_NORDICO"
              :key="opcion"
              type="button"
              :class="claseOpcion(respuestas.tiempoMolestia12Meses === opcion)"
              @click="responder('tiempoMolestia12Meses', opcion)"
            >
              {{ opcion }}
            </button>
          </div>
        </div>

        <div data-pregunta="molestia7Dias">
          <p class="mb-1.5 text-sm font-medium text-gray-800">¿Molestia en los últimos 7 días?</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opcion in [NO, SI]"
              :key="opcion"
              type="button"
              :class="claseOpcion(respuestas.molestia7Dias === opcion)"
              @click="responder('molestia7Dias', opcion)"
            >
              {{ opcion }}
            </button>
          </div>
        </div>

        <div data-pregunta="intensidad">
          <p class="mb-1.5 text-sm font-medium text-gray-800">
            Intensidad habitual de la molestia (0 a 10)
            <span v-if="respuestas.intensidad != null" class="font-normal text-gray-500">
              · {{ bandaIntensidadNordico(respuestas.intensidad) }}
            </span>
          </p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="valor in INTENSIDADES_NORDICO"
              :key="valor"
              type="button"
              class="h-9 w-9 rounded-lg border-2 text-sm font-semibold transition-all duration-150 ease-in-out"
              :class="claseIntensidad(valor)"
              :aria-pressed="respuestas.intensidad === valor"
              @click="responder('intensidad', valor)"
            >
              {{ valor }}
            </button>
          </div>
          <p class="mt-1 text-xs text-gray-500">1 a 3 leve · 4 a 6 moderada · 7 a 10 intensa</p>
        </div>

        <div data-pregunta="diasImpedimento">
          <p class="mb-1.5 text-sm font-medium text-gray-800">
            Días con impedimento para trabajar en los últimos 12 meses
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opcion in DIAS_IMPEDIMENTO_NORDICO"
              :key="opcion"
              type="button"
              :class="claseOpcion(respuestas.diasImpedimento === opcion)"
              @click="responder('diasImpedimento', opcion)"
            >
              {{ opcion }}
            </button>
          </div>
        </div>

        <div data-pregunta="atencionProfesional">
          <p class="mb-1.5 text-sm font-medium text-gray-800">Atención por profesional de la salud</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opcion in ATENCION_PROFESIONAL_NORDICO"
              :key="opcion"
              type="button"
              :class="claseOpcion(respuestas.atencionProfesional === opcion)"
              @click="responder('atencionProfesional', opcion)"
            >
              {{ opcion }}
            </button>
          </div>
        </div>

        <div data-pregunta="relacionTrabajo">
          <p class="mb-1.5 text-sm font-medium text-gray-800">Relación con el trabajo, según el trabajador</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opcion in RELACION_TRABAJO_NORDICO"
              :key="opcion"
              type="button"
              :class="claseOpcion(respuestas.relacionTrabajo === opcion)"
              @click="responderRelacionTrabajo(opcion)"
            >
              {{ opcion }}
            </button>
          </div>
        </div>

        <div v-if="conRelacionLaboral" data-pregunta="actividades">
          <p class="mb-1.5 text-sm font-medium text-gray-800">
            Actividades que pudieron provocar o agravar la molestia
            <span class="font-normal text-gray-500">(opcional)</span>
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="actividad in ACTIVIDADES_NORDICO"
              :key="actividad"
              type="button"
              :class="claseOpcion(tieneActividad(actividad))"
              :aria-pressed="tieneActividad(actividad)"
              @click="alternarActividad(actividad)"
            >
              {{ actividad }}
            </button>
          </div>
          <input
            v-if="tieneActividad('Otro')"
            v-model.trim="actividadOtra"
            type="text"
            maxlength="200"
            placeholder="¿Cuál otra actividad?"
            data-skip-validation
            class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>
