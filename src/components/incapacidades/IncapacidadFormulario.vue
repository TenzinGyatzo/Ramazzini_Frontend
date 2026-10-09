<script setup lang="ts">
import { computed, inject, reactive, ref, watch } from 'vue';
import IncapacidadesAPI from '@/api/IncapacidadesAPI';
import {
  CALIFICACIONES,
  GRUPOS_CON_REGION,
  GRUPOS_DIAGNOSTICO,
  NATURALEZAS_LESION,
  ORIGENES,
  RAMOS,
  REGIONES_ANATOMICAS,
  TIPOS_RIESGO,
  avisosDeCaptura,
  caracteresDisponibles,
  fechaCorta,
  fechaTermino,
  hoyISO,
  mensajeDeError,
  ramoDe,
  sumarDias,
  textoDe,
  type CaracterIncapacidad,
  type CasoConIncapacidades,
  type DatosCaso,
  type OrigenIncapacidad,
  type RamoIncapacidad,
} from '@/helpers/incapacidades';

const props = defineProps<{
  trabajadorId: string;
  /** Todos los casos del trabajador: de aquí salen los riesgos de los que puede derivar una recaída. */
  casos: CasoConIncapacidades[];
  /** Si se indica, la incapacidad se agrega a este caso; si no, abre uno nuevo. */
  casoBase?: CasoConIncapacidades | null;
}>();

const emit = defineEmits<{
  (e: 'guardado'): void;
  (e: 'cancelar'): void;
}>();

const toast = inject<any>('toast');

const esCasoNuevo = computed(() => !props.casoBase);
const terminoAnterior = computed(() => props.casoBase?.caso.fechaTerminoUltimaIncapacidad);

const form = reactive({
  ramo: (props.casoBase?.caso.ramo ?? '') as RamoIncapacidad | '',
  sinIncapacidad: false,
  origen: 'imss' as OrigenIncapacidad,
  caracter: '' as CaracterIncapacidad | '',
  folio: '',
  fechaInicio: terminoAnterior.value ? sumarDias(terminoAnterior.value, 1) : hoyISO(),
  dias: null as number | null,
  fechaExpedicion: '',
  conGoceDeSueldo: true,
  // Datos del caso (solo al abrir uno nuevo)
  grupoDiagnostico: '',
  regionAnatomica: '',
  diagnostico: '',
  notas: '',
  tipoRiesgo: '',
  fechaRiesgo: '',
  naturalezaLesion: '',
  calificacion: '',
  idCasoOrigen: '',
});

const guardando = ref(false);
const intentoGuardar = ref(false);

const esRiesgo = computed(() => form.ramo === 'riesgoTrabajo');
const caracteres = computed(() =>
  form.ramo ? caracteresDisponibles(form.ramo, esCasoNuevo.value) : [],
);

// El carácter se ajusta solo cuando el ramo deja una única opción o la elegida ya no aplica
watch(
  caracteres,
  (opciones) => {
    if (!opciones.some((opcion) => opcion.valor === form.caracter)) {
      form.caracter = opciones[0]?.valor ?? '';
    }
  },
  { immediate: true },
);

watch(
  () => form.ramo,
  (ramo) => {
    if (!esCasoNuevo.value) return;
    form.sinIncapacidad = false;
    form.grupoDiagnostico = ramo === 'maternidad' ? 'embarazoParto' : '';
    form.regionAnatomica = '';
    if (ramo === 'riesgoTrabajo' && !form.calificacion) form.calificacion = 'probable';
  },
);

/** Riesgos de trabajo ya terminados del trabajador: de ellos puede derivar una recaída. */
const riesgosParaRecaida = computed(() =>
  props.casos.filter((c) => c.caso.ramo === 'riesgoTrabajo' && c.estado === 'terminado'),
);

const requiereRegion = computed(() => GRUPOS_CON_REGION.includes(form.grupoDiagnostico));
const termino = computed(() => fechaTermino(form.fechaInicio, form.dias ?? 0));

const avisos = computed(() =>
  form.sinIncapacidad || !form.caracter
    ? []
    : avisosDeCaptura({
        origen: form.origen,
        caracter: form.caracter,
        fechaInicio: form.fechaInicio,
        dias: form.dias ?? 0,
        terminoAnterior: terminoAnterior.value,
      }),
);

const errores = computed(() => {
  const e: Record<string, string> = {};
  if (!form.ramo) e.ramo = 'Elige el ramo';
  if (!form.sinIncapacidad) {
    if (!form.fechaInicio) e.fechaInicio = 'Indica la fecha de inicio';
    if (!form.dias || !Number.isInteger(form.dias) || form.dias < 1) e.dias = 'Indica los días';
    if (form.origen === 'imss' && !form.folio.trim()) e.folio = 'El certificado del IMSS lleva folio';
    if (form.caracter === 'recaida' && !form.idCasoOrigen) e.idCasoOrigen = 'Elige el riesgo del que deriva';
  }
  if (esCasoNuevo.value && form.ramo) {
    if (form.ramo !== 'maternidad' && !form.grupoDiagnostico) e.grupoDiagnostico = 'Elige el grupo';
    if (requiereRegion.value && !form.regionAnatomica) e.regionAnatomica = 'Elige la región';
    if (esRiesgo.value && !form.tipoRiesgo) e.tipoRiesgo = 'Elige el tipo de riesgo';
    if (esRiesgo.value && form.sinIncapacidad && !form.fechaRiesgo) e.fechaRiesgo = 'Indica la fecha del riesgo';
  }
  return e;
});

const error = (campo: string) => (intentoGuardar.value ? errores.value[campo] : '');

const datosDelCaso = (): DatosCaso => ({
  ramo: form.ramo as RamoIncapacidad,
  grupoDiagnostico: form.grupoDiagnostico || undefined,
  regionAnatomica: form.regionAnatomica || undefined,
  diagnostico: form.diagnostico.trim() || undefined,
  notas: form.notas.trim() || undefined,
  ...(esRiesgo.value
    ? {
        tipoRiesgo: form.tipoRiesgo,
        fechaRiesgo: form.fechaRiesgo || form.fechaInicio || undefined,
        naturalezaLesion: form.naturalezaLesion || undefined,
        calificacion: form.calificacion || undefined,
        idCasoOrigen: form.caracter === 'recaida' ? form.idCasoOrigen : undefined,
      }
    : {}),
});

const guardar = async () => {
  intentoGuardar.value = true;
  if (Object.keys(errores.value).length || guardando.value) return;
  guardando.value = true;
  try {
    if (form.sinIncapacidad) {
      await IncapacidadesAPI.abrirCaso(props.trabajadorId, datosDelCaso());
    } else {
      await IncapacidadesAPI.registrarIncapacidad(props.trabajadorId, {
        ...(props.casoBase ? { idCaso: props.casoBase.caso._id } : { caso: datosDelCaso() }),
        incapacidad: {
          origen: form.origen,
          caracter: form.caracter as CaracterIncapacidad,
          folio: form.origen === 'imss' ? form.folio.trim() : undefined,
          fechaInicio: form.fechaInicio,
          dias: form.dias as number,
          fechaExpedicion: form.origen === 'imss' && form.fechaExpedicion ? form.fechaExpedicion : undefined,
          conGoceDeSueldo: form.origen === 'empresa' ? form.conGoceDeSueldo : undefined,
        },
      });
    }
    toast?.open?.({
      message: form.sinIncapacidad ? 'Riesgo de trabajo registrado' : 'Incapacidad registrada',
      type: 'success',
    });
    emit('guardado');
  } catch (e) {
    toast?.open?.({ message: mensajeDeError(e, 'No se pudo guardar la incapacidad.'), type: 'error' });
  } finally {
    guardando.value = false;
  }
};

const etiquetaRiesgo = (c: CasoConIncapacidades) =>
  `${textoDe(TIPOS_RIESGO, c.caso.tipoRiesgo) || 'Riesgo de trabajo'} del ${fechaCorta(c.caso.fechaRiesgo ?? c.caso.fechaInicio)}`;

const campo =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
const etiqueta = 'mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400';
const opcionBase =
  'flex-1 rounded-lg border-2 px-3 py-2 text-left text-sm font-medium transition-colors duration-150';
const opcionActiva =
  'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
const opcionInactiva =
  'border-gray-200 bg-white text-gray-700 hover:border-emerald-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
</script>

<template>
  <form class="space-y-5" novalidate @submit.prevent="guardar">
    <!-- Caso al que se agrega -->
    <div
      v-if="casoBase"
      class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-300"
    >
      Se agrega al caso de
      <span class="font-medium">{{ ramoDe(casoBase.caso.ramo).texto.toLowerCase() }}</span>
      iniciado el {{ fechaCorta(casoBase.caso.fechaInicio) }}
      <template v-if="terminoAnterior">; su última incapacidad terminó el {{ fechaCorta(terminoAnterior) }}</template>.
    </div>

    <!-- Ramo -->
    <div v-else>
      <p :class="etiqueta">¿De qué tipo es?</p>
      <div class="flex flex-col gap-2 sm:flex-row">
        <button
          v-for="ramo in RAMOS"
          :key="ramo.valor"
          type="button"
          :class="[opcionBase, form.ramo === ramo.valor ? opcionActiva : opcionInactiva]"
          :aria-pressed="form.ramo === ramo.valor"
          @click="form.ramo = ramo.valor"
        >
          <span class="flex items-center gap-2">
            <i :class="ramo.icono" class="w-4 text-center" aria-hidden="true"></i>
            {{ ramo.texto }}
          </span>
          <span class="mt-0.5 block text-xs font-normal opacity-80">{{ ramo.descripcion }}</span>
        </button>
      </div>
      <p v-if="error('ramo')" class="mt-1 text-xs text-red-600">{{ error('ramo') }}</p>
    </div>

    <template v-if="form.ramo">
      <label
        v-if="esCasoNuevo && esRiesgo"
        class="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-slate-300"
      >
        <input v-model="form.sinIncapacidad" type="checkbox" class="h-4 w-4 accent-emerald-600" />
        El riesgo no generó incapacidad (el trabajador siguió laborando)
      </label>

      <!-- La incapacidad -->
      <fieldset v-if="!form.sinIncapacidad" class="space-y-4">
        <legend class="mb-2 text-sm font-semibold text-gray-900 dark:text-slate-100">Incapacidad</legend>

        <div>
          <p :class="etiqueta">¿Quién la otorgó?</p>
          <div class="flex flex-col gap-2 sm:flex-row">
            <button
              v-for="origen in ORIGENES"
              :key="origen.valor"
              type="button"
              :class="[opcionBase, form.origen === origen.valor ? opcionActiva : opcionInactiva]"
              :aria-pressed="form.origen === origen.valor"
              @click="form.origen = origen.valor"
            >
              {{ origen.texto }}
              <span class="mt-0.5 block text-xs font-normal opacity-80">{{ origen.descripcion }}</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div v-if="caracteres.length > 1">
            <label :class="etiqueta" for="inc-caracter">Carácter</label>
            <select id="inc-caracter" v-model="form.caracter" :class="campo">
              <option v-for="c in caracteres" :key="c.valor" :value="c.valor">{{ c.texto }}</option>
            </select>
          </div>
          <div v-if="form.origen === 'imss'">
            <label :class="etiqueta" for="inc-folio">Folio del certificado</label>
            <input id="inc-folio" v-model="form.folio" type="text" maxlength="40" autocomplete="off" :class="campo" />
            <p v-if="error('folio')" class="mt-1 text-xs text-red-600">{{ error('folio') }}</p>
          </div>
        </div>

        <div v-if="form.caracter === 'recaida'">
          <label :class="etiqueta" for="inc-origen-recaida">Riesgo de trabajo del que deriva</label>
          <select id="inc-origen-recaida" v-model="form.idCasoOrigen" :class="campo">
            <option value="">Elige un riesgo terminado</option>
            <option v-for="c in riesgosParaRecaida" :key="c.caso._id" :value="c.caso._id">
              {{ etiquetaRiesgo(c) }}
            </option>
          </select>
          <p v-if="!riesgosParaRecaida.length" class="mt-1 text-xs text-amber-700 dark:text-amber-400">
            Este trabajador no tiene riesgos de trabajo terminados. Si el riesgo sigue activo, agrega la incapacidad a ese caso.
          </p>
          <p v-else-if="error('idCasoOrigen')" class="mt-1 text-xs text-red-600">{{ error('idCasoOrigen') }}</p>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label :class="etiqueta" for="inc-inicio">A partir del</label>
            <input id="inc-inicio" v-model="form.fechaInicio" type="date" :class="campo" />
            <p v-if="error('fechaInicio')" class="mt-1 text-xs text-red-600">{{ error('fechaInicio') }}</p>
          </div>
          <div>
            <label :class="etiqueta" for="inc-dias">Días que ampara</label>
            <input id="inc-dias" v-model.number="form.dias" type="number" min="1" max="366" step="1" :class="campo" />
            <p v-if="error('dias')" class="mt-1 text-xs text-red-600">{{ error('dias') }}</p>
          </div>
          <div>
            <p :class="etiqueta">Termina el</p>
            <p class="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:bg-slate-900/60 dark:text-slate-200">
              {{ termino ? fechaCorta(termino) : '—' }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div v-if="form.origen === 'imss'">
            <label :class="etiqueta" for="inc-expedicion">Fecha de expedición (opcional)</label>
            <input id="inc-expedicion" v-model="form.fechaExpedicion" type="date" :class="campo" />
          </div>
          <label
            v-if="form.origen === 'empresa'"
            class="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm text-gray-700 dark:text-slate-300"
          >
            <input v-model="form.conGoceDeSueldo" type="checkbox" class="h-4 w-4 accent-emerald-600" />
            Con goce de sueldo
          </label>
        </div>

        <ul v-if="avisos.length" class="space-y-1">
          <li
            v-for="aviso in avisos"
            :key="aviso"
            class="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          >
            <i class="fas fa-triangle-exclamation mt-0.5" aria-hidden="true"></i>
            {{ aviso }}
          </li>
        </ul>
      </fieldset>

      <!-- El caso (solo al abrir uno nuevo) -->
      <fieldset v-if="esCasoNuevo" class="space-y-4">
        <legend class="mb-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
          {{ esRiesgo ? 'Riesgo de trabajo' : 'Padecimiento' }}
        </legend>

        <div v-if="esRiesgo" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label :class="etiqueta" for="caso-tipo-riesgo">Tipo de riesgo</label>
            <select id="caso-tipo-riesgo" v-model="form.tipoRiesgo" :class="campo">
              <option value="">Elige una opción</option>
              <option v-for="o in TIPOS_RIESGO" :key="o.valor" :value="o.valor">{{ o.texto }}</option>
            </select>
            <p v-if="error('tipoRiesgo')" class="mt-1 text-xs text-red-600">{{ error('tipoRiesgo') }}</p>
          </div>
          <div>
            <label :class="etiqueta" for="caso-fecha-riesgo">
              Fecha del riesgo{{ form.sinIncapacidad ? '' : ' (si es distinta al inicio)' }}
            </label>
            <input id="caso-fecha-riesgo" v-model="form.fechaRiesgo" type="date" :class="campo" />
            <p v-if="error('fechaRiesgo')" class="mt-1 text-xs text-red-600">{{ error('fechaRiesgo') }}</p>
          </div>
          <div>
            <label :class="etiqueta" for="caso-naturaleza">Naturaleza de la lesión</label>
            <select id="caso-naturaleza" v-model="form.naturalezaLesion" :class="campo">
              <option value="">Sin especificar</option>
              <option v-for="o in NATURALEZAS_LESION" :key="o.valor" :value="o.valor">{{ o.texto }}</option>
            </select>
          </div>
          <div>
            <label :class="etiqueta" for="caso-calificacion">Calificación del IMSS</label>
            <select id="caso-calificacion" v-model="form.calificacion" :class="campo">
              <option value="">No aplica (manejo interno)</option>
              <option v-for="o in CALIFICACIONES" :key="o.valor" :value="o.valor">{{ o.texto }}</option>
            </select>
          </div>
        </div>

        <div v-if="form.ramo !== 'maternidad'" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label :class="etiqueta" for="caso-grupo">Grupo de diagnóstico</label>
            <select id="caso-grupo" v-model="form.grupoDiagnostico" :class="campo">
              <option value="">Elige una opción</option>
              <option v-for="o in GRUPOS_DIAGNOSTICO" :key="o.valor" :value="o.valor">{{ o.texto }}</option>
            </select>
            <p v-if="error('grupoDiagnostico')" class="mt-1 text-xs text-red-600">{{ error('grupoDiagnostico') }}</p>
          </div>
          <div>
            <label :class="etiqueta" for="caso-region">
              Región anatómica{{ requiereRegion ? '' : ' (opcional)' }}
            </label>
            <select id="caso-region" v-model="form.regionAnatomica" :class="campo">
              <option value="">{{ requiereRegion ? 'Elige una opción' : 'No aplica' }}</option>
              <option v-for="o in REGIONES_ANATOMICAS" :key="o.valor" :value="o.valor">{{ o.texto }}</option>
            </select>
            <p v-if="error('regionAnatomica')" class="mt-1 text-xs text-red-600">{{ error('regionAnatomica') }}</p>
          </div>
        </div>

        <div>
          <label :class="etiqueta" for="caso-diagnostico">Diagnóstico (opcional)</label>
          <input id="caso-diagnostico" v-model="form.diagnostico" type="text" maxlength="2000" :class="campo" />
        </div>
        <div>
          <label :class="etiqueta" for="caso-notas">Notas (opcional)</label>
          <textarea id="caso-notas" v-model="form.notas" rows="2" maxlength="2000" :class="campo"></textarea>
        </div>
      </fieldset>
    </template>

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
        :disabled="guardando || !form.ramo"
      >
        <i v-if="guardando" class="fa-solid fa-spinner fa-spin text-xs"></i>
        {{ guardando ? 'Guardando...' : form.sinIncapacidad ? 'Registrar riesgo' : 'Registrar incapacidad' }}
      </button>
    </div>
  </form>
</template>
