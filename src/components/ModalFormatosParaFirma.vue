<script setup lang="ts">
/**
 * Formatos que firma el trabajador, en un solo lugar (docs/firma-en-pantalla-especificacion.md):
 * explica los dos caminos con el mismo peso (en papel o en pantalla), pide una fecha para todos y
 * lista los tres formatos con «Descargar» y «Firmar en pantalla». Un formato sin texto definitivo
 * aparece «en preparación» y no se puede usar. Con la firma en pantalla apagada queda solo el papel.
 */
import { computed, inject, onMounted, ref, watch } from 'vue';
import { format } from 'date-fns';
import FirmaEnPantalla from '@/components/FirmaEnPantalla.vue';
import FormatosFirmadosAPI, { type FormatoFirmadoCreado } from '@/api/FormatosFirmadosAPI';
import { useEscapeToClose } from '@/composables/useEscapeToClose';
import { extractApiErrorMessage } from '@/helpers/apiErrors';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import {
  descargarFormatoParaFirmaPdf,
  formatNombreTrabajadorFormato,
  type TrabajadorFormatoFirma,
} from '@/helpers/formatoParaFirmaPdf';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useUserStore } from '@/stores/user';
import type { FormatoFirmadoEnFecha, ResumenFormatoFirma, TipoFormatoFirma } from '@/types/formatoFirma';

const props = defineProps<{
  trabajador: (TrabajadorFormatoFirma & { _id?: string }) | null;
}>();

const emit = defineEmits<{
  closeModal: [];
  /** PDF firmado en pantalla, ya guardado como Documento Externo. */
  firmado: [documentoExterno: any];
}>();

/** Cómo se llama cada formato en pantalla; el título del PDF viene del backend. */
const PRESENTACION: Record<TipoFormatoFirma, { nombre: string; nota?: string }> = {
  CONSENTIMIENTO_EVALUACION_MEDICA: { nombre: 'Consentimiento para evaluación médica laboral' },
  DECLARACION_VERACIDAD: { nombre: 'Declaración de veracidad' },
  CONSENTIMIENTO_ANTIDOPING: {
    nombre: 'Consentimiento para prueba de detección de sustancias',
    nota: 'Antes de la toma de muestra',
  },
};

const toast: any = inject('toast');
const proveedorSaludStore = useProveedorSaludStore();
const userStore = useUserStore();

const hoy = format(new Date(), 'yyyy-MM-dd');
const fecha = ref(hoy);
const formatos = ref<ResumenFormatoFirma[]>([]);
const cargando = ref(true);
const errorCarga = ref('');
const firmaEnPantallaHabilitada = ref(false);
const firmados = ref<FormatoFirmadoEnFecha[]>([]);
const descargando = ref<TipoFormatoFirma | null>(null);
const firmando = ref<TipoFormatoFirma | null>(null);

const nombreTrabajador = computed(() => formatNombreCompleto(props.trabajador));
const puedeFirmarEnPantalla = computed(() => firmaEnPantallaHabilitada.value && !!props.trabajador?._id);
/** La firma de prueba es para las demostraciones del Principal. */
const permitirPrueba = computed(() => userStore.user?.role === 'Principal');

const filas = computed(() =>
  formatos.value.map((f) => {
    const firmado = firmados.value.find((x) => x.tipoFormato === f.tipoFormato);
    return { ...f, ...PRESENTACION[f.tipoFormato], firmado };
  }),
);

function etiquetaFirmado(firmado: FormatoFirmadoEnFecha): string {
  if (firmado.prueba) return 'Firma de prueba con esta fecha';
  return fecha.value === hoy ? 'Firmado en pantalla hoy' : 'Firmado en pantalla con esta fecha';
}

async function cargarFirmados() {
  if (!puedeFirmarEnPantalla.value || !fecha.value) {
    firmados.value = [];
    return;
  }
  try {
    const { data } = await FormatosFirmadosAPI.firmadosPorFecha(props.trabajador!._id!, fecha.value);
    firmados.value = data;
  } catch {
    // Solo es un aviso: sin él, los formatos se pueden usar igual
    firmados.value = [];
  }
}

async function cargar() {
  cargando.value = true;
  errorCarga.value = '';
  try {
    const [lista, configuracion] = await Promise.all([
      FormatosFirmadosAPI.listarFormatos(),
      FormatosFirmadosAPI.getConfiguracion().catch(() => ({ data: { firmaEnPantallaHabilitada: false } })),
    ]);
    formatos.value = lista.data;
    firmaEnPantallaHabilitada.value = configuracion.data.firmaEnPantallaHabilitada === true;
    await cargarFirmados();
  } catch (error) {
    errorCarga.value = extractApiErrorMessage(error, 'No se pudieron cargar los formatos.');
  } finally {
    cargando.value = false;
  }
}

watch(fecha, cargarFirmados);
onMounted(cargar);

const ocupado = computed(() => descargando.value !== null || firmando.value !== null);

const closeModal = () => {
  if (ocupado.value) return;
  emit('closeModal');
};

// Mientras se firma, Esc lo atiende la vista de firma
useEscapeToClose(closeModal, () => !ocupado.value);

/** Mismas revisiones para los dos caminos: fecha y nombre del trabajador. */
function datosCompletos(): boolean {
  if (!fecha.value) {
    toast?.open?.({ message: 'Selecciona la fecha de los formatos.', type: 'error' });
    return false;
  }
  if (!formatNombreTrabajadorFormato(props.trabajador ?? {}).trim()) {
    toast?.open?.({ message: 'No se encontró el nombre del trabajador.', type: 'error' });
    return false;
  }
  return true;
}

async function descargar(tipo: TipoFormatoFirma) {
  if (ocupado.value || !datosCompletos()) return;
  descargando.value = tipo;
  try {
    const proveedor = proveedorSaludStore.proveedorSalud;
    await descargarFormatoParaFirmaPdf(tipo, {
      trabajador: props.trabajador ?? {},
      fecha: fecha.value,
      proveedorSalud: proveedor
        ? {
            nombre: proveedor.nombre,
            direccion: proveedor.direccion,
            municipio: proveedor.municipio,
            estado: proveedor.estado,
            telefono: proveedor.telefono,
            sitioWeb: proveedor.sitioWeb,
            logotipoEmpresa: proveedor.logotipoEmpresa,
          }
        : null,
    });
    toast?.open?.({ message: 'Inicia descarga correctamente.', type: 'success' });
  } catch (error) {
    console.error(`Error al generar el formato ${tipo}:`, error);
    toast?.open?.({
      message: extractApiErrorMessage(error, 'No se pudo generar el formato. Inténtalo de nuevo.'),
      type: 'error',
    });
  } finally {
    descargando.value = null;
  }
}

function firmarEnPantalla(tipo: TipoFormatoFirma) {
  if (ocupado.value || !datosCompletos()) return;
  firmando.value = tipo;
}

/** Se queda abierto: así se puede seguir con el siguiente formato. */
async function alFirmar(resultado: FormatoFirmadoCreado) {
  firmando.value = null;
  emit('firmado', resultado.documentoExterno);
  await cargarFirmados();
}
</script>

<template>
  <div class="modal fixed top-0 left-0 z-10 p-4 sm:p-8 h-screen w-full grid place-items-center">
    <div
      class="modal-work-overlay absolute top-0 left-0 w-full h-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm"
      @click="closeModal"
    />
    <div
      class="modal-work-panel modal-formatos-firma relative bg-white text-gray-900 dark:bg-slate-800 dark:text-slate-100 w-full max-w-2xl p-5 sm:p-7 rounded-lg shadow-md shadow-slate-900 dark:shadow-black/40 max-h-[90vh] overflow-y-auto"
    >
      <button
        type="button"
        class="absolute h-12 w-12 flex justify-center items-center top-1 right-1 text-4xl text-gray-400 hover:text-gray-500 dark:text-slate-400 dark:hover:text-slate-300"
        aria-label="Cerrar"
        :disabled="ocupado"
        @click="closeModal"
      >
        &times;
      </button>

      <h1 class="text-2xl pr-10 dark:text-slate-100">Formatos para firma</h1>
      <p class="text-sm text-gray-600 dark:text-slate-300 mt-1">{{ nombreTrabajador || '—' }}</p>

      <!-- Los dos caminos, con el mismo peso -->
      <div class="modal-formatos-firma__metodos grid gap-3 mt-5" :class="puedeFirmarEnPantalla ? 'sm:grid-cols-2' : ''">
        <div class="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 dark:bg-slate-900/60 dark:border-slate-600">
          <p class="font-semibold text-gray-800 dark:text-slate-100">
            <i class="fa-solid fa-print mr-2 text-gray-500 dark:text-slate-400" aria-hidden="true"></i>En papel
          </p>
          <p class="text-sm text-gray-600 dark:text-slate-300 mt-1 leading-relaxed">
            Descarga, imprime y firma a mano. Después súbelo como documento externo.
          </p>
        </div>
        <div
          v-if="puedeFirmarEnPantalla"
          class="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 dark:bg-slate-900/60 dark:border-slate-600"
        >
          <p class="font-semibold text-gray-800 dark:text-slate-100">
            <i class="fa-solid fa-signature mr-2 text-gray-500 dark:text-slate-400" aria-hidden="true"></i>En pantalla
          </p>
          <p class="text-sm text-gray-600 dark:text-slate-300 mt-1 leading-relaxed">
            El trabajador lee y firma en tableta, celular o mouse. Queda guardado en el expediente.
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3 mt-5">
        <label for="fecha-formatos-firma" class="text-sm font-semibold text-gray-700 dark:text-slate-200">
          Fecha de los formatos
        </label>
        <input
          id="fecha-formatos-firma"
          v-model="fecha"
          type="date"
          :disabled="ocupado"
          class="border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-60 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:[color-scheme:dark]"
        />
      </div>

      <div v-if="cargando" class="py-10 text-center text-gray-500 dark:text-slate-400">Cargando formatos…</div>

      <div v-else-if="errorCarga" class="py-8 text-center">
        <p class="text-red-700 mb-3">{{ errorCarga }}</p>
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200"
          @click="cargar"
        >
          Reintentar
        </button>
      </div>

      <ul v-else class="mt-4">
        <li
          v-for="fila in filas"
          :key="fila.tipoFormato"
          class="modal-formatos-firma__fila flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-t border-gray-200 dark:border-slate-600"
          :data-formato="fila.tipoFormato"
        >
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-gray-900 dark:text-slate-100">{{ fila.nombre }}</p>
            <span
              v-if="!fila.disponible"
              class="modal-formatos-firma__estado inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800"
            >
              <i class="fa-regular fa-clock" aria-hidden="true"></i>Texto en preparación
            </span>
            <span
              v-else-if="fila.firmado"
              class="modal-formatos-firma__estado inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs font-medium rounded-full"
              :class="fila.firmado.prueba ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'"
            >
              <i class="fa-solid fa-check" aria-hidden="true"></i>{{ etiquetaFirmado(fila.firmado) }}
            </span>
            <p v-else-if="fila.nota" class="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{{ fila.nota }}</p>
          </div>

          <!-- En celular, los dos botones a todo lo ancho, del mismo tamaño -->
          <div class="gap-2 shrink-0" :class="puedeFirmarEnPantalla ? 'grid grid-cols-2 sm:flex' : 'flex'">
            <button
              type="button"
              class="modal-formatos-firma__boton inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-emerald-600 text-emerald-700 font-semibold text-sm hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:border-emerald-400 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
              :disabled="!fila.disponible || ocupado"
              :title="fila.disponible ? 'Descargar para firmar a mano' : 'Este formato todavía no tiene su texto definitivo'"
              @click="descargar(fila.tipoFormato)"
            >
              <i
                :class="descargando === fila.tipoFormato ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-download'"
                aria-hidden="true"
              ></i>
              Descargar
            </button>
            <button
              v-if="puedeFirmarEnPantalla"
              type="button"
              class="modal-formatos-firma__boton modal-formatos-firma__boton-pantalla inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-emerald-600 text-emerald-700 font-semibold text-sm hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:border-emerald-400 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
              :disabled="!fila.disponible || ocupado"
              :title="fila.disponible ? 'Que el trabajador lo firme en pantalla' : 'Este formato todavía no tiene su texto definitivo'"
              @click="firmarEnPantalla(fila.tipoFormato)"
            >
              <i class="fa-solid fa-signature" aria-hidden="true"></i>
              Firmar en pantalla
            </button>
          </div>
        </li>
      </ul>

      <div class="border-t border-gray-200 dark:border-slate-600 pt-4 mt-1 flex justify-end">
        <button
          type="button"
          class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200"
          :disabled="ocupado"
          @click="closeModal"
        >
          Cerrar
        </button>
      </div>
    </div>

    <FirmaEnPantalla
      v-if="firmando && trabajador?._id"
      :tipo-formato="firmando"
      :trabajador-id="trabajador._id"
      :trabajador="trabajador"
      :fecha="fecha"
      :permitir-prueba="permitirPrueba"
      @cancelar="firmando = null"
      @firmado="alFirmar"
    />
  </div>
</template>
