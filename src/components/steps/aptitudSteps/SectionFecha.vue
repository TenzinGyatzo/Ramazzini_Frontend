<script setup>
import { computed } from 'vue';
import MicrostepAnchor from '../MicrostepAnchor.vue';
import AptitudSectionStep from './AptitudSectionStep.vue';
import Step1 from './Step1.vue';
import TablaEstudiosAptitud from './TablaEstudiosAptitud.vue';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import { contextoAptitud } from '@/helpers/aptitudContexto';
import { filasEstudiosAptitud, filasEvaluacionesAdicionales, textoFechaFila } from '@/helpers/aptitudEstudios';
import { fechaDeReferencia } from '@/helpers/aptitudGuardado';
import { useFormDataStore } from '@/stores/formDataStore';

const capturaRapida = enCapturaRapida();
const formDataStore = useFormDataStore();

// En captura rápida no hay documento a la vista: la tabla de estudios va aquí, entre la fecha y
// las evaluaciones, para que el médico la vea junto con las alteraciones antes de elegir la
// aptitud (punto 45). Solo de lectura; cambia con la fecha (la de hoy mientras no se elija, como
// los textos generados).
const filas = computed(() => {
  const ctx = contextoAptitud.datos;
  const df = formDataStore.formDataAptitud;
  // Las evaluaciones adicionales van al final, como en el documento, en cuanto se capturan
  const estudios = ctx ? filasEstudiosAptitud(ctx.vecinos, ctx.resultados, fechaDeReferencia(df)) : [];
  return [...estudios, ...filasEvaluacionesAdicionales(df)];
});
const aviso = computed(() =>
  contextoAptitud.fallo || contextoAptitud.datos?.sinVecinos
    ? 'No se pudieron consultar los estudios del trabajador.'
    : null,
);
</script>

<template>
  <AptitudSectionStep icono="fa-calendar-day" title="Fecha de evaluación">
    <MicrostepAnchor :legacy-step="1">
      <Step1 variant="compact" />
    </MicrostepAnchor>

    <section v-if="capturaRapida" class="pt-6" data-estudios-captura>
      <h2
        class="flex items-center gap-2 pb-2 mb-2 border-b-2 border-emerald-600 text-base font-semibold text-gray-900 dark:text-slate-100"
      >
        <i class="fas fa-notes-medical text-emerald-600 w-5 text-center" aria-hidden="true"></i>
        Información y estudios
      </h2>
      <p class="text-xs text-gray-500 mb-2">
        Los estudios más cercanos a la fecha de evaluación (del mismo año), como aparecen en el documento.
      </p>
      <div class="hidden sm:block overflow-x-auto">
        <TablaEstudiosAptitud :filas="filas" :cargando="contextoAptitud.cargando" :aviso="aviso" estudio-compacto />
      </div>
      <!-- En celular, la tabla no cabe: un estudio por renglón, con su fecha y su resumen debajo -->
      <div class="sm:hidden border border-gray-200 rounded-lg divide-y divide-gray-200 text-sm" data-estudios-celular>
        <p v-if="contextoAptitud.cargando || aviso" class="px-3 py-2 text-gray-500 italic">
          {{ contextoAptitud.cargando ? 'Cargando los estudios del trabajador…' : aviso }}
        </p>
        <div v-for="fila in filas" :key="fila.clave" class="px-3 py-2">
          <p class="flex justify-between gap-2 text-xs font-semibold text-gray-800">
            <span>{{ fila.estudio }}</span>
            <span class="font-normal text-gray-500 whitespace-nowrap">{{ textoFechaFila(fila) }}</span>
          </p>
          <p class="text-gray-700">{{ fila.resumen }}</p>
        </div>
      </div>
    </section>
  </AptitudSectionStep>
</template>
