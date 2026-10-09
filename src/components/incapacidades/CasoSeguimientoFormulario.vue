<script setup lang="ts">
import { computed, inject, reactive, ref } from 'vue';
import IncapacidadesAPI from '@/api/IncapacidadesAPI';
import {
  CALIFICACIONES,
  GRUPOS_CON_REGION,
  GRUPOS_DIAGNOSTICO,
  NATURALEZAS_LESION,
  REGIONES_ANATOMICAS,
  TIPOS_ALTA,
  TIPOS_RIESGO,
  mensajeDeError,
  soloFecha,
  type CambiosCaso,
  type CasoConIncapacidades,
} from '@/helpers/incapacidades';

const props = defineProps<{
  trabajadorId: string;
  item: CasoConIncapacidades;
}>();

const emit = defineEmits<{
  (e: 'guardado'): void;
  (e: 'cancelar'): void;
}>();

const toast = inject<any>('toast');
const caso = props.item.caso;
const esRiesgo = caso.ramo === 'riesgoTrabajo';
const tieneRecaida = props.item.incapacidades.some((i) => i.caracter === 'recaida');

const form = reactive({
  grupoDiagnostico: caso.grupoDiagnostico ?? '',
  regionAnatomica: caso.regionAnatomica ?? '',
  diagnostico: caso.diagnostico ?? '',
  notas: caso.notas ?? '',
  tipoRiesgo: caso.tipoRiesgo ?? '',
  fechaRiesgo: soloFecha(caso.fechaRiesgo),
  naturalezaLesion: caso.naturalezaLesion ?? '',
  calificacion: caso.calificacion ?? '',
  tipoAlta: caso.tipoAlta ?? '',
  fechaAlta: soloFecha(caso.fechaAlta),
  tieneSecuelas: !!caso.tieneSecuelas,
  secuelasDescripcion: caso.secuelasDescripcion ?? '',
  porcentajeIPP: (caso.porcentajeIPP ?? null) as number | null,
  defuncion: !!caso.defuncion,
  fechaDefuncion: soloFecha(caso.fechaDefuncion),
});

const guardando = ref(false);
const intentoGuardar = ref(false);

const requiereRegion = computed(() => GRUPOS_CON_REGION.includes(form.grupoDiagnostico));
const pasaAEnfermedadGeneral = computed(() => esRiesgo && form.calificacion === 'noDeTrabajo');

const errores = computed(() => {
  const e: Record<string, string> = {};
  if (requiereRegion.value && !form.regionAnatomica) e.regionAnatomica = 'Elige la región';
  if (esRiesgo) {
    if (!form.tipoRiesgo) e.tipoRiesgo = 'Elige el tipo de riesgo';
    if (form.tipoAlta && !form.fechaAlta) e.fechaAlta = 'Indica la fecha del alta';
    if (form.fechaAlta && !form.tipoAlta) e.tipoAlta = 'Elige el tipo de alta';
    if (
      form.porcentajeIPP != null &&
      (form.porcentajeIPP < 0 || form.porcentajeIPP > 100)
    ) {
      e.porcentajeIPP = 'Debe estar entre 0 y 100';
    }
    if (form.defuncion && !form.fechaDefuncion) e.fechaDefuncion = 'Indica la fecha';
    if (pasaAEnfermedadGeneral.value && tieneRecaida) {
      e.calificacion = 'Un caso de recaída no puede calificarse como no de trabajo';
    }
  }
  return e;
});

const error = (campo: string) => (intentoGuardar.value ? errores.value[campo] : '');

const guardar = async () => {
  intentoGuardar.value = true;
  if (Object.keys(errores.value).length || guardando.value) return;

  const cambios: CambiosCaso = {
    grupoDiagnostico: form.grupoDiagnostico || null,
    regionAnatomica: form.regionAnatomica || null,
    diagnostico: form.diagnostico.trim() || null,
    notas: form.notas.trim() || null,
  };
  if (esRiesgo) {
    Object.assign(cambios, {
      tipoRiesgo: form.tipoRiesgo,
      fechaRiesgo: form.fechaRiesgo || null,
      naturalezaLesion: form.naturalezaLesion || null,
      calificacion: form.calificacion || null,
      tipoAlta: form.tipoAlta || null,
      fechaAlta: form.fechaAlta || null,
      tieneSecuelas: form.tieneSecuelas ? true : null,
      secuelasDescripcion: form.tieneSecuelas ? form.secuelasDescripcion.trim() || null : null,
      porcentajeIPP: form.porcentajeIPP === null || form.porcentajeIPP === ('' as unknown) ? null : Number(form.porcentajeIPP),
      defuncion: form.defuncion ? true : null,
      fechaDefuncion: form.defuncion ? form.fechaDefuncion || null : null,
    } satisfies CambiosCaso);
  }

  guardando.value = true;
  try {
    await IncapacidadesAPI.actualizarCaso(props.trabajadorId, caso._id, cambios);
    toast?.open?.({ message: 'Caso actualizado', type: 'success' });
    emit('guardado');
  } catch (e) {
    toast?.open?.({ message: mensajeDeError(e, 'No se pudo actualizar el caso.'), type: 'error' });
  } finally {
    guardando.value = false;
  }
};

const campo =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
const etiqueta = 'mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400';
</script>

<template>
  <form class="space-y-5" novalidate @submit.prevent="guardar">
    <!-- Riesgo de trabajo: calificación, alta y consecuencias -->
    <template v-if="esRiesgo">
      <fieldset class="space-y-3">
        <legend class="mb-2 text-sm font-semibold text-gray-900 dark:text-slate-100">Riesgo de trabajo</legend>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label :class="etiqueta" for="seg-tipo-riesgo">Tipo de riesgo</label>
            <select id="seg-tipo-riesgo" v-model="form.tipoRiesgo" :class="campo">
              <option value="">Elige una opción</option>
              <option v-for="o in TIPOS_RIESGO" :key="o.valor" :value="o.valor">{{ o.texto }}</option>
            </select>
            <p v-if="error('tipoRiesgo')" class="mt-1 text-xs text-red-600">{{ error('tipoRiesgo') }}</p>
          </div>
          <div>
            <label :class="etiqueta" for="seg-fecha-riesgo">Fecha del riesgo</label>
            <input id="seg-fecha-riesgo" v-model="form.fechaRiesgo" type="date" :class="campo" />
          </div>
          <div>
            <label :class="etiqueta" for="seg-naturaleza">Naturaleza de la lesión</label>
            <select id="seg-naturaleza" v-model="form.naturalezaLesion" :class="campo">
              <option value="">Sin especificar</option>
              <option v-for="o in NATURALEZAS_LESION" :key="o.valor" :value="o.valor">{{ o.texto }}</option>
            </select>
            <p v-if="caso.datosHeredados?.naturalezaLesion" class="mt-1 text-xs text-gray-500 dark:text-slate-400">
              Registro anterior: «{{ caso.datosHeredados.naturalezaLesion }}»
            </p>
          </div>
          <div>
            <label :class="etiqueta" for="seg-calificacion">Calificación del IMSS</label>
            <select id="seg-calificacion" v-model="form.calificacion" :class="campo">
              <option value="">No aplica (manejo interno)</option>
              <option v-for="o in CALIFICACIONES" :key="o.valor" :value="o.valor">{{ o.texto }}</option>
            </select>
            <p v-if="error('calificacion')" class="mt-1 text-xs text-red-600">{{ error('calificacion') }}</p>
          </div>
        </div>
        <p
          v-if="pasaAEnfermedadGeneral && !tieneRecaida"
          class="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <i class="fas fa-triangle-exclamation mt-0.5" aria-hidden="true"></i>
          Al guardar, el caso pasará a enfermedad general: sus tres primeros días con certificado del IMSS dejarán de contar como subsidiados y saldrá de los riesgos de trabajo.
        </p>
      </fieldset>

      <fieldset class="space-y-3">
        <legend class="mb-2 text-sm font-semibold text-gray-900 dark:text-slate-100">Alta y consecuencias</legend>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label :class="etiqueta" for="seg-tipo-alta">Alta</label>
            <select id="seg-tipo-alta" v-model="form.tipoAlta" :class="campo">
              <option value="">Sin alta todavía</option>
              <option v-for="o in TIPOS_ALTA" :key="o.valor" :value="o.valor">{{ o.texto }}</option>
            </select>
            <p v-if="error('tipoAlta')" class="mt-1 text-xs text-red-600">{{ error('tipoAlta') }}</p>
          </div>
          <div>
            <label :class="etiqueta" for="seg-fecha-alta">Fecha del alta</label>
            <input id="seg-fecha-alta" v-model="form.fechaAlta" type="date" :class="campo" />
            <p v-if="error('fechaAlta')" class="mt-1 text-xs text-red-600">{{ error('fechaAlta') }}</p>
          </div>
          <div>
            <label :class="etiqueta" for="seg-ipp">Incapacidad permanente (%)</label>
            <input
              id="seg-ipp"
              v-model.number="form.porcentajeIPP"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="0 a 100; 100 es total"
              :class="campo"
            />
            <p v-if="error('porcentajeIPP')" class="mt-1 text-xs text-red-600">{{ error('porcentajeIPP') }}</p>
          </div>
        </div>

        <label class="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
          <input v-model="form.tieneSecuelas" type="checkbox" class="h-4 w-4 accent-emerald-600" />
          Quedó con secuelas
        </label>
        <div v-if="form.tieneSecuelas">
          <label :class="etiqueta" for="seg-secuelas">Descripción de las secuelas</label>
          <textarea id="seg-secuelas" v-model="form.secuelasDescripcion" rows="2" maxlength="2000" :class="campo"></textarea>
        </div>

        <div class="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
          <label class="flex cursor-pointer items-center gap-2 pb-2 text-sm text-gray-700 dark:text-slate-300">
            <input v-model="form.defuncion" type="checkbox" class="h-4 w-4 accent-emerald-600" />
            Defunción por este riesgo
          </label>
          <div v-if="form.defuncion">
            <label :class="etiqueta" for="seg-fecha-defuncion">Fecha de la defunción</label>
            <input id="seg-fecha-defuncion" v-model="form.fechaDefuncion" type="date" :class="campo" />
            <p v-if="error('fechaDefuncion')" class="mt-1 text-xs text-red-600">{{ error('fechaDefuncion') }}</p>
          </div>
        </div>
      </fieldset>
    </template>

    <fieldset class="space-y-3">
      <legend class="mb-2 text-sm font-semibold text-gray-900 dark:text-slate-100">Padecimiento</legend>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label :class="etiqueta" for="seg-grupo">Grupo de diagnóstico</label>
          <select id="seg-grupo" v-model="form.grupoDiagnostico" :class="campo">
            <option value="">Sin especificar</option>
            <option v-for="o in GRUPOS_DIAGNOSTICO" :key="o.valor" :value="o.valor">{{ o.texto }}</option>
          </select>
        </div>
        <div>
          <label :class="etiqueta" for="seg-region">Región anatómica</label>
          <select id="seg-region" v-model="form.regionAnatomica" :class="campo">
            <option value="">{{ requiereRegion ? 'Elige una opción' : 'No aplica' }}</option>
            <option v-for="o in REGIONES_ANATOMICAS" :key="o.valor" :value="o.valor">{{ o.texto }}</option>
          </select>
          <p v-if="error('regionAnatomica')" class="mt-1 text-xs text-red-600">{{ error('regionAnatomica') }}</p>
          <p v-else-if="caso.datosHeredados?.parteCuerpoAfectada" class="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Registro anterior: «{{ caso.datosHeredados.parteCuerpoAfectada }}»
          </p>
        </div>
      </div>
      <div>
        <label :class="etiqueta" for="seg-diagnostico">Diagnóstico</label>
        <input id="seg-diagnostico" v-model="form.diagnostico" type="text" maxlength="2000" :class="campo" />
      </div>
      <div>
        <label :class="etiqueta" for="seg-notas">Notas</label>
        <textarea id="seg-notas" v-model="form.notas" rows="2" maxlength="2000" :class="campo"></textarea>
      </div>
    </fieldset>

    <div class="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-4 dark:border-slate-700">
      <button
        type="button"
        class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        :disabled="guardando"
        @click="emit('cancelar')"
      >
        Cancelar
      </button>
      <button
        type="submit"
        class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="guardando"
      >
        <i v-if="guardando" class="fa-solid fa-spinner fa-spin text-xs"></i>
        {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
      </button>
    </div>
  </form>
</template>
