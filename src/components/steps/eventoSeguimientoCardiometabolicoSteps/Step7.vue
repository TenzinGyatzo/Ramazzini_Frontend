<script setup>
import { onMounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { ESTADO_CONTROL_CONDICION_OPTS } from '@/helpers/eventoSeguimientoCardiometabolicoOptions';

/** Condiciones con valoración manual en este paso. La obesidad usa solo clasificación por IMC (paso de somatometría). */
const FILAS_CONDICION_CON_BOTONES = [
  { key: 'hipertensionArterial', label: 'Hipertensión arterial' },
  { key: 'diabetesMellitusTipo2', label: 'Diabetes mellitus tipo 2' },
  { key: 'dislipidemia', label: 'Dislipidemia' },
];

const { formDataEventoSeguimientoCardiometabolico } = useFormDataStore();
const documentos = useDocumentosStore();

/** Texto del botón; el valor enviado sigue siendo NO_VALORABLE. */
function etiquetaOpcionControl(opt) {
  return opt.value === 'NO_VALORABLE' ? 'No valorada' : opt.label;
}

function seleccionActual(key) {
  const ec = formDataEventoSeguimientoCardiometabolico.estadoCondiciones;
  return ec?.[key]?.control ?? null;
}

function aplicar(key, valor) {
  const fd = formDataEventoSeguimientoCardiometabolico;
  if (!fd.estadoCondiciones) fd.estadoCondiciones = {};

  if (!fd.estadoCondiciones[key]) fd.estadoCondiciones[key] = {};
  const o = fd.estadoCondiciones[key];
  if (o.control === valor) delete o.control;
  else o.control = valor;
  if (!o.control) delete fd.estadoCondiciones[key];

  if (Object.keys(fd.estadoCondiciones).length === 0) delete fd.estadoCondiciones;
}

function hidratar() {
  const src = documentos.currentDocument || {};
  const ec = src.estadoCondiciones;
  if (!ec || typeof ec !== 'object') return;

  const fd = formDataEventoSeguimientoCardiometabolico;
  if (!fd.estadoCondiciones) fd.estadoCondiciones = {};

  for (const k of ['hipertensionArterial', 'diabetesMellitusTipo2', 'dislipidemia']) {
    if (ec[k]?.control) fd.estadoCondiciones[k] = { control: ec[k].control };
  }
  if (ec.obesidad?.grado) {
    if (!fd.estadoCondiciones.obesidad) fd.estadoCondiciones.obesidad = {};
    fd.estadoCondiciones.obesidad.grado = ec.obesidad.grado;
  }
  const ob = fd.estadoCondiciones?.obesidad;
  if (ob) {
    delete ob.control;
    if (Object.keys(ob).length === 0) delete fd.estadoCondiciones.obesidad;
  }
}

onMounted(() => {
  hidratar();
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Estado por condición en esta visita</h1>

    <div class="space-y-8">
      <div v-for="fila in FILAS_CONDICION_CON_BOTONES" :key="fila.key">
        <h2 class="text-sm font-semibold text-gray-800 mb-2">{{ fila.label }}</h2>
        <div
          class="flex flex-nowrap items-stretch gap-1.5 sm:gap-2 overflow-x-auto"
          role="group"
          :aria-label="`Estado: ${fila.label}`">
          <button
            v-for="opt in ESTADO_CONTROL_CONDICION_OPTS"
            :key="`${fila.key}-${opt.value}`"
            type="button"
            class="shrink-0 min-h-9 rounded-md border px-2 py-1.5 text-xs font-medium leading-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            :class="
              seleccionActual(fila.key) === opt.value
                ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
            "
            :aria-pressed="seleccionActual(fila.key) === opt.value"
            @click="aplicar(fila.key, opt.value)">
            {{ etiquetaOpcionControl(opt) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
