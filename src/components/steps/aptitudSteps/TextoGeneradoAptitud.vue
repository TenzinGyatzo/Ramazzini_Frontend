<script setup lang="ts">
/**
 * Aptitud (punto 45): un texto que se genera del expediente (alteraciones, resultados, medidas).
 * Lo escribe aptitudGuardado en los dos modos; aquí se muestra, se edita y, si se editó, se puede
 * volver a generar. Avisa mientras se consultan los documentos o si falta con qué generarlo.
 */
import { computed, nextTick } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { contextoAptitud } from '@/helpers/aptitudContexto';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import { CLASE_AYUDA, CLASE_ETIQUETA, CLASE_TEXTAREA } from '../captura/estiloCaptura';
import { textoGenerado, textoSinEditar, volverAGenerar } from '@/helpers/aptitudGuardado';
import { useStepsStore } from '@/stores/steps';
import { useAptitudSectionsV2 } from '@/composables/useAptitudSectionsV2';
import { legacyStepToSectionIndex } from '@/helpers/aptitudSections';

const props = defineProps<{
  campo: 'alteracionesSalud' | 'resultados' | 'medidasPreventivas';
  etiqueta: string;
  /** Qué falta para generarlo (sin historia clínica, sin aptitud…). */
  sinTexto: string;
  variant?: string;
  /** Altura del cuadro en el asistente clásico (clase de Tailwind). */
  alto?: string;
}>();

const formDataStore = useFormDataStore();
const capturaRapida = enCapturaRapida();
const trabajadores = useTrabajadoresStore();
// Por el store (al editar, el documento puede llegar después del primer dibujo)
const df = () => formDataStore.formDataAptitud as Record<string, any>;
const sexo = () => trabajadores.currentTrabajador?.sexo;

const valor = computed({
  get: () => df()[props.campo] ?? '',
  set: (v: string) => {
    df()[props.campo] = v;
  },
});

const generado = computed(() => textoGenerado(df(), props.campo, contextoAptitud.datos, sexo()));
const editado = computed(() => !!generado.value && !textoSinEditar(df(), props.campo) && valor.value.trim() !== generado.value.trim());

const regenerar = () => volverAGenerar(df(), props.campo, contextoAptitud.datos, sexo());

// Resultados se redacta con la aptitud: mientras no se elija, en lugar de la nota se invita a
// elegirla primero, con un botón que lleva a ella (el cuadro sigue editable; punto 45)
const faltaAptitud = computed(() => props.campo === 'resultados' && !df().aptitudPuesto);
const steps = useStepsStore();
const { aptitudSectionsV2Enabled } = useAptitudSectionsV2();
const PASO_APTITUD = 8;

function enfocarAptitud(desplazar: boolean): boolean {
  const opciones = [...document.querySelectorAll<HTMLInputElement>('input[name="aptitudPuesto"]')];
  if (!opciones.length) return false;
  if (desplazar) {
    const seccion = opciones[0].closest<HTMLElement>('[data-seccion-captura]') ?? opciones[0].closest<HTMLElement>('[role="radiogroup"]');
    seccion?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  (opciones.find((o) => o.checked) ?? opciones[0]).focus({ preventScroll: true });
  return true;
}

async function irAAptitud() {
  if (capturaRapida) {
    enfocarAptitud(true);
    return;
  }
  steps.goToSection(aptitudSectionsV2Enabled.value ? legacyStepToSectionIndex(PASO_APTITUD) : PASO_APTITUD, null);
  await nextTick();
  // El paso se monta en el siguiente cuadro (con la animación entre pasos, un poco después)
  if (!enfocarAptitud(false)) setTimeout(() => enfocarAptitud(false), 350);
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-baseline justify-between gap-x-3 mb-1">
      <label :for="campo" :class="CLASE_ETIQUETA">{{ etiqueta }} <span class="text-red-500">*</span></label>
      <button
        v-if="editado"
        type="button"
        class="text-xs text-emerald-700 hover:underline inline-flex items-center gap-1"
        title="Reemplaza el texto por el que se genera con los documentos del trabajador"
        @click="regenerar"
      >
        <i class="fas fa-rotate-right text-[10px]" aria-hidden="true"></i>
        Volver a generar
      </button>
    </div>
    <textarea
      :id="campo"
      v-model="valor"
      :rows="capturaRapida ? 5 : variant === 'compact' ? 10 : undefined"
      :class="[CLASE_TEXTAREA, variant === 'compact' ? '' : (alto ?? 'h-64')]"
      :placeholder="contextoAptitud.cargando ? 'Generando texto…' : ''"
      data-skip-validation
    ></textarea>
    <p :class="[CLASE_AYUDA, 'mt-1']">
      <template v-if="contextoAptitud.cargando">
        <i class="fas fa-spinner fa-spin mr-1" aria-hidden="true"></i>Revisando los documentos del trabajador…
      </template>
      <template v-else-if="contextoAptitud.datos?.sinVecinos && campo !== 'resultados'">
        No se pudieron consultar los documentos del trabajador; escríbelo a mano.
      </template>
      <template v-else-if="faltaAptitud">
        <span class="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 px-2.5 py-1.5" data-falta-aptitud>
          <span>
            <i class="fas fa-circle-info text-emerald-600 mr-1" aria-hidden="true"></i>
            <strong class="font-semibold text-gray-700 dark:text-slate-200">Primero elige la aptitud al puesto.</strong>
            Con ella se redacta este texto.
          </span>
          <button
            type="button"
            class="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 rounded"
            @click="irAAptitud"
          >
            Elegir la aptitud <i class="fas fa-arrow-right text-[10px]" aria-hidden="true"></i>
          </button>
        </span>
      </template>
      <template v-else-if="!generado">{{ sinTexto }}</template>
      <template v-else>Se genera con los documentos del trabajador; puedes editarlo.</template>
    </p>
  </div>
</template>
