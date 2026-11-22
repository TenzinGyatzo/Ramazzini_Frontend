<script setup lang="ts">
/**
 * Aptitud (punto 45): un texto que se genera del expediente (alteraciones, resultados, medidas).
 * Lo escribe aptitudGuardado en los dos modos; aquí se muestra, se edita y, si se editó, se puede
 * volver a generar. Avisa mientras se consultan los documentos o si falta con qué generarlo.
 */
import { computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { contextoAptitud } from '@/helpers/aptitudContexto';
import { textoGenerado, textoSinEditar, volverAGenerar } from '@/helpers/aptitudGuardado';

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
</script>

<template>
  <div>
    <div class="flex flex-wrap items-baseline justify-between gap-x-3 mb-1">
      <label :for="campo" class="text-sm font-medium text-gray-800 leading-4">{{ etiqueta }}</label>
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
      :class="
        variant === 'compact'
          ? 'w-full p-2 text-sm border border-gray-300 rounded-md text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 min-h-[12rem]'
          : ['w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500', alto ?? 'h-64']
      "
      :placeholder="contextoAptitud.cargando ? 'Generando texto…' : ''"
      data-skip-validation
    ></textarea>
    <p class="mt-1 text-xs text-gray-500">
      <template v-if="contextoAptitud.cargando">
        <i class="fas fa-spinner fa-spin mr-1" aria-hidden="true"></i>Revisando los documentos del trabajador…
      </template>
      <template v-else-if="contextoAptitud.datos?.sinVecinos && campo !== 'resultados'">
        No se pudieron consultar los documentos del trabajador; escríbelo a mano.
      </template>
      <template v-else-if="!generado">{{ sinTexto }}</template>
      <template v-else>Se genera con los documentos del trabajador; puedes editarlo.</template>
    </p>
  </div>
</template>
