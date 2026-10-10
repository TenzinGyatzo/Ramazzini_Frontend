<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import ZonaDeArchivos from './ZonaDeArchivos.vue';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { fechaCorta, hoyISO, mensajeDeError, type Caso, type Incapacidad } from '@/helpers/incapacidades';
import {
  abrirRespaldo,
  errorDeArchivo,
  fechaSugerida,
  nombreDeRespaldo,
  subirRespaldo,
  textoDeTamano,
  tipoDeRespaldo,
  tiposParaCaso,
  type Respaldo,
  type TipoRespaldo,
} from '@/helpers/incapacidadesRespaldos';

/**
 * Documentos que respaldan un caso o una de sus incapacidades: los muestra,
 * los abre y permite adjuntar otro. Con `incapacidad` adjunta su certificado;
 * sin ella, los formatos del caso (ST-7, ST-9, ST-2, ST-3 u otro).
 */
const props = defineProps<{
  trabajadorId: string;
  caso: Caso;
  incapacidad?: Incapacidad | null;
  respaldos: Respaldo[];
  puedeAdjuntar: boolean;
}>();

const emit = defineEmits<{ (e: 'subido'): void }>();

const toast = inject<any>('toast', null);
const { ensureUserLoaded } = useCurrentUser();

const tipos = computed(() => tiposParaCaso(props.caso.ramo));
const tipoInicial = (): TipoRespaldo =>
  props.incapacidad ? 'certificadoIncapacidad' : (tipos.value[0]?.valor ?? 'otro');

const adjuntando = ref(false);
const tipo = ref<TipoRespaldo>(tipoInicial());
const fecha = ref('');
const archivo = ref<File | null>(null);
const error = ref('');
const subiendo = ref(false);
const abriendo = ref('');

const sugerirFecha = () => {
  fecha.value = fechaSugerida(tipo.value, props.caso, props.incapacidad, hoyISO());
};
watch(tipo, sugerirFecha);

const empezar = () => {
  tipo.value = tipoInicial();
  sugerirFecha();
  archivo.value = null;
  error.value = '';
  adjuntando.value = true;
};

const alElegir = (archivos: File[]) => {
  const elegido = archivos[0] ?? null;
  error.value = elegido ? errorDeArchivo(elegido) : '';
  // Un archivo que no se puede subir no se queda elegido
  archivo.value = error.value ? null : elegido;
};

const subir = async () => {
  error.value = errorDeArchivo(archivo.value) || (fecha.value ? '' : 'Indica la fecha del documento.');
  if (error.value || !archivo.value || subiendo.value) return;
  subiendo.value = true;
  try {
    const usuarioId = await ensureUserLoaded();
    if (!usuarioId) throw new Error('sin usuario');
    await subirRespaldo({
      trabajadorId: props.trabajadorId,
      usuarioId: String(usuarioId),
      archivo: archivo.value,
      tipo: tipo.value,
      fecha: fecha.value,
      nombre: nombreDeRespaldo(tipo.value, props.incapacidad),
      idCaso: props.caso._id,
      idIncapacidad: props.incapacidad?._id,
    });
    toast?.open?.({ message: 'Documento adjuntado', type: 'success' });
    adjuntando.value = false;
    emit('subido');
  } catch (e) {
    error.value = mensajeDeError(e, 'No se pudo subir el documento.');
  } finally {
    subiendo.value = false;
  }
};

const abrir = async (respaldo: Respaldo) => {
  if (abriendo.value) return;
  abriendo.value = respaldo._id;
  try {
    await abrirRespaldo(respaldo);
  } catch {
    toast?.open?.({ message: 'No se pudo abrir el documento.', type: 'error' });
  } finally {
    abriendo.value = '';
  }
};

const icono = (respaldo: Respaldo) =>
  respaldo.extension === '.pdf' ? 'fas fa-file-pdf text-red-500' : 'fas fa-file-image text-sky-500';

const etiqueta = (respaldo: Respaldo) =>
  props.incapacidad && respaldo.tipo === 'certificadoIncapacidad'
    ? 'Certificado'
    : respaldo.tipo === 'otro'
      ? respaldo.nombreDocumento
      : tipoDeRespaldo(respaldo.tipo).texto;

const campo =
  'rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
</script>

<template>
  <div class="respaldos-incapacidad">
    <div class="flex flex-wrap items-center gap-1.5">
      <button
        v-for="respaldo in respaldos"
        :key="respaldo._id"
        type="button"
        class="respaldos-incapacidad__documento inline-flex max-w-[16rem] items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 transition-colors duration-150 hover:border-emerald-400 hover:text-emerald-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        :title="`${respaldo.nombreDocumento} · ${fechaCorta(respaldo.fechaDocumento)}. Abrir`"
        data-test="respaldo"
        @click="abrir(respaldo)"
      >
        <i :class="abriendo === respaldo._id ? 'fas fa-spinner fa-spin text-gray-400' : icono(respaldo)" aria-hidden="true"></i>
        <span class="truncate">{{ etiqueta(respaldo) }}</span>
      </button>

      <button
        v-if="puedeAdjuntar && !adjuntando"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 transition-colors duration-150 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
        data-test="adjuntar"
        @click="empezar"
      >
        <i class="fas fa-paperclip text-[10px]" aria-hidden="true"></i>
        {{ incapacidad ? (respaldos.length ? 'Adjuntar otro' : 'Adjuntar certificado') : 'Adjuntar documento' }}
      </button>
    </div>

    <form
      v-if="adjuntando"
      class="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-slate-600 dark:bg-slate-900/60"
      data-test="formulario"
      @submit.prevent="subir"
    >
      <div class="flex flex-wrap items-end gap-2">
        <label v-if="!incapacidad && tipos.length > 1" class="block">
          <span class="mb-0.5 block text-[11px] font-medium text-gray-500 dark:text-slate-400">Documento</span>
          <select v-model="tipo" :class="campo" data-test="tipo">
            <option v-for="opcion in tipos" :key="opcion.valor" :value="opcion.valor">{{ opcion.texto }}</option>
          </select>
        </label>
        <label class="block">
          <span class="mb-0.5 block text-[11px] font-medium text-gray-500 dark:text-slate-400">Fecha del documento</span>
          <input v-model="fecha" type="date" :max="hoyISO()" :class="campo" data-test="fecha" />
        </label>
      </div>
      <ZonaDeArchivos
        v-if="!archivo"
        class="mt-2"
        :deshabilitada="subiendo"
        @archivos="alElegir"
      />
      <div
        v-else
        class="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-800"
        data-test="elegido"
      >
        <i :class="archivo.name.toLowerCase().endsWith('.pdf') ? 'fas fa-file-pdf text-red-500' : 'fas fa-file-image text-sky-500'" aria-hidden="true"></i>
        <span class="min-w-0 flex-1 truncate font-medium text-gray-800 dark:text-slate-200">{{ archivo.name }}</span>
        <span class="shrink-0 text-gray-500 dark:text-slate-400">{{ textoDeTamano(archivo.size) }}</span>
        <button
          type="button"
          class="shrink-0 font-medium text-gray-600 hover:underline dark:text-slate-300"
          :disabled="subiendo"
          @click="archivo = null"
        >
          Quitar
        </button>
      </div>
      <p v-if="!incapacidad && tipo !== 'otro'" class="mt-1.5 text-[11px] text-gray-500 dark:text-slate-400">
        {{ tipoDeRespaldo(tipo).descripcion }}
      </p>
      <p v-if="error" class="mt-1.5 text-xs text-red-600 dark:text-red-400" data-test="error">{{ error }}</p>
      <div class="mt-2 flex items-center gap-2">
        <button
          type="submit"
          class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors duration-150 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="subiendo"
          data-test="subir"
        >
          <i :class="subiendo ? 'fas fa-spinner fa-spin' : 'fas fa-upload'" class="text-[10px]" aria-hidden="true"></i>
          {{ subiendo ? 'Subiendo...' : 'Subir' }}
        </button>
        <button
          type="button"
          class="rounded-lg px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"
          :disabled="subiendo"
          @click="adjuntando = false"
        >
          Cancelar
        </button>
        <span class="text-[11px] text-gray-500 dark:text-slate-400">Se guarda en el expediente, en documentos externos.</span>
      </div>
    </form>
  </div>
</template>
