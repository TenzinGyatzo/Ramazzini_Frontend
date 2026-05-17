<script setup>
import { ref, watch, onMounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import {
  CHIPS_FRECUENCIA_TRATAMIENTO,
  CHIPS_MOTIVO_USO,
  SUGERENCIAS_MEDICAMENTOS_FRECUENTES,
  filaTratamientoTieneContenido,
  normalizarFilaTratamiento,
} from '@/helpers/cardiometabolico/tratamientoActualFacilidades';

const { formDataEventoSeguimientoCardiometabolico } = useFormDataStore();
const documentos = useDocumentosStore();

const inputClass =
  'w-full py-2 px-2.5 text-sm border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200';
const fieldLabelClass = 'block text-xs font-medium text-gray-700 mb-0.5';

/** @type {import('vue').Ref<import('@/helpers/cardiometabolico/tratamientoActualFacilidades').TratamientoActualFilaEsc[]>} */
const tratamientoActualFilas = ref([]);

function nuevaFilaTratamiento() {
  tratamientoActualFilas.value.push({});
}

function eliminarFilaTratamiento(index) {
  tratamientoActualFilas.value.splice(index, 1);
}

function pushAll() {
  const fd = formDataEventoSeguimientoCardiometabolico;
  const filas = tratamientoActualFilas.value
    .map(normalizarFilaTratamiento)
    .filter(filaTratamientoTieneContenido);
  fd.tratamientoActual = filas.length ? filas : undefined;
}

function hydrateTratamientoDesde(source) {
  if (!source?.tratamientoActual || !Array.isArray(source.tratamientoActual)) {
    tratamientoActualFilas.value = [];
    return;
  }
  tratamientoActualFilas.value = source.tratamientoActual.map((r) => ({
    medicamento: r.medicamento ?? '',
    dosis: r.dosis ?? '',
    frecuencia: r.frecuencia ?? '',
    motivoUso: r.motivoUso ?? '',
  }));
}

function hydrateFrom(source) {
  if (!source) return;
  hydrateTratamientoDesde(source);
}

onMounted(() => {
  hydrateFrom(documentos.currentDocument);
  hydrateFrom(formDataEventoSeguimientoCardiometabolico);
  pushAll();
});

watch(tratamientoActualFilas, () => pushAll(), { deep: true });
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-3 text-gray-900">
      Tratamiento actual
    </h1>

    <section aria-label="Medicamentos actuales" class="space-y-3 min-w-0">
      <p v-if="!tratamientoActualFilas.length" class="text-sm text-gray-600 italic">
        Sin medicamentos registrados en esta visita
      </p>

      <div v-else class="space-y-4">
        <article
          v-for="(fila, idx) in tratamientoActualFilas"
          :key="idx"
          class="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0 space-y-2 min-w-0"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Medicamento {{ idx + 1 }}
            </span>
            <button
              type="button"
              class="shrink-0 text-red-600 hover:text-red-800 text-sm font-medium"
              title="Quitar medicamento"
              @click="eliminarFilaTratamiento(idx)"
            >
              Quitar
            </button>
          </div>

          <div class="grid grid-cols-2 gap-2 min-w-0">
            <div class="min-w-0">
              <label :class="fieldLabelClass" :for="`med-${idx}`">Nombre</label>
              <input
                :id="`med-${idx}`"
                v-model="fila.medicamento"
                type="text"
                autocomplete="off"
                list="dl-esc-medicamentos"
                :class="inputClass"
                placeholder="Ej. Metformina"
              />
            </div>
            <div class="min-w-0">
              <label :class="fieldLabelClass" :for="`dosis-${idx}`">Dosis</label>
              <input
                :id="`dosis-${idx}`"
                v-model="fila.dosis"
                type="text"
                :class="inputClass"
                placeholder="850 mg"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 min-w-0">
            <div class="min-w-0">
              <label :class="fieldLabelClass" :for="`freq-${idx}`">Frecuencia</label>
              <input
                :id="`freq-${idx}`"
                v-model="fila.frecuencia"
                type="text"
                autocomplete="off"
                list="dl-esc-frecuencia-trat"
                :class="inputClass"
                placeholder="Cada 24 h"
              />
            </div>
            <div class="min-w-0">
              <label :class="fieldLabelClass" :for="`motivo-${idx}`">Motivo de uso</label>
              <input
                :id="`motivo-${idx}`"
                v-model="fila.motivoUso"
                type="text"
                autocomplete="off"
                list="dl-esc-motivo-uso"
                :class="inputClass"
                placeholder="Ej. DM2"
              />
            </div>
          </div>
        </article>
      </div>

      <datalist id="dl-esc-medicamentos">
        <option
          v-for="m in SUGERENCIAS_MEDICAMENTOS_FRECUENTES"
          :key="m"
          :value="m"
        />
      </datalist>
      <datalist id="dl-esc-frecuencia-trat">
        <option
          v-for="f in CHIPS_FRECUENCIA_TRATAMIENTO"
          :key="f"
          :value="f"
        />
      </datalist>
      <datalist id="dl-esc-motivo-uso">
        <option v-for="m in CHIPS_MOTIVO_USO" :key="m" :value="m" />
      </datalist>

      <button
        type="button"
        class="text-sm font-medium text-emerald-800 hover:text-emerald-950 underline-offset-2 hover:underline"
        @click="nuevaFilaTratamiento"
      >
        + Agregar medicamento
      </button>
    </section>
  </div>
</template>
