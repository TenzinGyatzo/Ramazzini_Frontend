<script setup lang="ts">
/**
 * Vista grande en la que el trabajador lee el formato y lo firma en pantalla
 * (docs/firma-en-pantalla-especificacion.md, 4). El backend arma el texto y el PDF: aquí solo se
 * muestra la versión vigente y se envía la firma con esa versión.
 */
import { computed, inject, nextTick, onMounted, ref } from 'vue';
import FormatosFirmadosAPI, { type FormatoFirmadoCreado } from '@/api/FormatosFirmadosAPI';
import RecuadroFirma, { type EstadoRecuadroFirma } from '@/components/RecuadroFirma.vue';
import { useEscapeToClose } from '@/composables/useEscapeToClose';
import { extractApiErrorMessage } from '@/helpers/apiErrors';
import {
  formatFechaYYYYMMDD,
  formatNombreTrabajadorFormato,
  obtenerTextoFormato,
  type TrabajadorFormatoFirma,
} from '@/helpers/formatoParaFirmaPdf';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import type { CampoFormatoFirma, TextoFormatoFirma, TipoFormatoFirma } from '@/types/formatoFirma';

const props = defineProps<{
  tipoFormato: TipoFormatoFirma;
  trabajadorId: string;
  trabajador: TrabajadorFormatoFirma;
  /** `yyyy-mm-dd` */
  fecha: string;
  /** Muestra la casilla «Firma de prueba» (solo el Principal, para demostraciones). */
  permitirPrueba?: boolean;
}>();

const emit = defineEmits<{
  cancelar: [];
  firmado: [resultado: FormatoFirmadoCreado];
}>();

const toast: any = inject('toast');

const texto = ref<TextoFormatoFirma | null>(null);
const cargando = ref(true);
const errorCarga = ref('');
const enviando = ref(false);
const aviso = ref('');
const esPrueba = ref(false);
const estadoFirma = ref<EstadoRecuadroFirma>({ vacia: true, valida: false, pointerType: null });
const recuadro = ref<InstanceType<typeof RecuadroFirma> | null>(null);
const contenido = ref<HTMLElement | null>(null);

const proveedorSaludStore = useProveedorSaludStore();
const nombreTrabajador = computed(() => formatNombreTrabajadorFormato(props.trabajador));
/** La institución responsable es el proveedor de salud (el PDF la toma del servidor). */
const institucionResponsable = computed(() => String(proveedorSaludStore.proveedorSalud?.nombre ?? '').trim());
const fechaFormateada = computed(() => formatFechaYYYYMMDD(props.fecha));
const datos = computed<Record<CampoFormatoFirma, string>>(() => ({
  nombreTrabajador: nombreTrabajador.value,
  institucionResponsable: institucionResponsable.value,
}));

/** Párrafos con sus tramos en negrita, igual que en el PDF. */
const bloques = computed(() =>
  (texto.value?.bloques ?? []).map((bloque) => ({
    tipo: bloque.tipo,
    fragmentos: bloque.fragmentos.map((f) => ({
      texto: 'campo' in f ? datos.value[f.campo] : f.texto,
      negrita: !!f.negrita,
      sinCorte: 'sinCorte' in f && !!f.sinCorte,
    })),
  })),
);

async function cargarTexto() {
  cargando.value = true;
  errorCarga.value = '';
  try {
    texto.value = await obtenerTextoFormato(props.tipoFormato);
  } catch (error) {
    errorCarga.value = extractApiErrorMessage(error, 'No se pudo cargar el texto del formato.');
  } finally {
    cargando.value = false;
  }
}

function limpiarFirma() {
  recuadro.value?.limpiar();
  aviso.value = '';
}

function cancelar() {
  if (enviando.value) return;
  emit('cancelar');
}

useEscapeToClose(cancelar, () => !enviando.value);

async function firmar() {
  if (!texto.value || enviando.value) return;
  let firma;
  try {
    firma = recuadro.value?.exportar();
  } catch (error) {
    aviso.value = `${error instanceof Error ? error.message : 'No se pudo preparar la firma'}. Limpia la firma y vuelve a intentarlo.`;
    return;
  }
  if (!firma) {
    aviso.value = 'La firma es demasiado corta. Pide al trabajador que firme de nuevo.';
    return;
  }
  enviando.value = true;
  aviso.value = '';
  try {
    const { data } = await FormatosFirmadosAPI.crear(props.trabajadorId, {
      tipoFormato: props.tipoFormato,
      versionTexto: texto.value.version,
      fechaFormato: props.fecha,
      ...(esPrueba.value ? { prueba: true } : {}),
      firma,
    });
    toast?.open?.({
      message: esPrueba.value
        ? 'Firma de prueba guardada (sin validez); puedes eliminarla del expediente'
        : 'Formato firmado y guardado en el expediente',
      type: 'success',
    });
    emit('firmado', data);
  } catch (error: any) {
    if (error?.response?.status === 409) {
      // El texto cambió mientras el trabajador lo leía: se muestra el nuevo y se firma otra vez
      await cargarTexto();
      recuadro.value?.limpiar();
      aviso.value = 'El texto del formato se actualizó. Pide al trabajador que lo lea de nuevo y firme otra vez.';
      await nextTick();
      contenido.value?.scrollTo?.({ top: 0, behavior: 'smooth' });
    } else {
      aviso.value = `${extractApiErrorMessage(error, 'No se pudo guardar la firma.')} Puedes intentarlo de nuevo o descargar el formato para firmarlo a mano.`;
    }
  } finally {
    enviando.value = false;
  }
}

onMounted(cargarTexto);
</script>

<template>
  <Teleport to="body">
    <div class="firma-pantalla fixed inset-0 z-50 flex flex-col bg-gray-100" role="dialog" aria-modal="true" :aria-label="texto?.titulo ?? 'Firma en pantalla'">
      <header class="firma-pantalla__barra flex items-center justify-between gap-3 px-4 sm:px-8 py-3 bg-white border-b border-gray-200">
        <p class="text-sm text-gray-600 truncate">
          Firma en pantalla · <span class="font-semibold text-gray-800">{{ nombreTrabajador }}</span>
        </p>
        <button
          type="button"
          class="shrink-0 text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          :disabled="enviando"
          @click="cancelar"
        >
          Cancelar
        </button>
      </header>

      <main ref="contenido" class="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
        <div class="mx-auto w-full max-w-3xl">
          <div v-if="cargando" class="py-24 text-center text-gray-500">Cargando el formato…</div>

          <div v-else-if="errorCarga" class="py-16 text-center">
            <p class="text-red-700 mb-4">{{ errorCarga }}</p>
            <button type="button" class="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50" @click="cargarTexto">
              Reintentar
            </button>
          </div>

          <article v-else-if="texto" class="firma-pantalla__hoja bg-white rounded-xl shadow-sm border border-gray-200 px-5 sm:px-10 py-8">
            <h1 class="firma-pantalla__titulo text-lg sm:text-xl font-semibold text-center mb-6">{{ texto.titulo }}</h1>

            <p
              v-for="(bloque, i) in bloques"
              :key="i"
              class="firma-pantalla__bloque text-gray-800 leading-relaxed"
              :class="{
                'pl-6': bloque.tipo === 'elementoLista',
                'text-justify': bloque.tipo !== 'encabezadoLista',
                'mb-2': bloque.tipo === 'encabezadoLista' || bloque.tipo === 'elementoLista',
                'mb-4': bloque.tipo === 'parrafo',
              }"
            >
              <template v-for="(f, j) in bloque.fragmentos" :key="j">
                <strong v-if="f.negrita" :class="{ 'whitespace-nowrap': f.sinCorte }">{{ f.texto }}</strong>
                <template v-else>{{ f.texto }}</template>
              </template>
            </p>

            <p class="mt-6 text-gray-800" data-institucion>
              Institución responsable: <strong>{{ institucionResponsable }}</strong>
            </p>
            <p class="mt-1 mb-4 text-gray-800">Fecha: <strong>{{ fechaFormateada }}</strong></p>

            <RecuadroFirma ref="recuadro" :deshabilitado="enviando" @cambio="(e) => (estadoFirma = e)" />

            <p v-if="estadoFirma.pointerType === 'mouse'" class="firma-pantalla__aviso-mouse mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Se está firmando con el mouse. La firma queda registrada así; si hay una pluma o pantalla táctil, es mejor usarla.
            </p>
            <p v-if="aviso" class="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
              {{ aviso }}
            </p>

            <!-- Discreta: solo el Principal la ve, para demostraciones -->
            <label
              v-if="permitirPrueba"
              class="firma-pantalla__prueba mt-4 flex items-start gap-2 text-sm text-gray-600 cursor-pointer select-none"
            >
              <input v-model="esPrueba" type="checkbox" class="mt-0.5 h-4 w-4 accent-amber-600" :disabled="enviando" />
              <span>
                <span class="font-semibold text-gray-700">Firma de prueba (para demostración).</span>
                El PDF llevará la marca «PRUEBA – SIN VALIDEZ» y podrás eliminarlo del expediente.
              </span>
            </label>

            <!-- Junto al recuadro, donde está la mano que firma -->
            <div class="firma-pantalla__acciones mt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <button
                type="button"
                class="px-5 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold disabled:opacity-50"
                :disabled="enviando || estadoFirma.vacia"
                @click="limpiarFirma"
              >
                Limpiar firma
              </button>
              <button
                type="button"
                class="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="enviando || !estadoFirma.valida"
                @click="firmar"
              >
                {{ enviando ? 'Guardando…' : 'Aceptar y firmar' }}
              </button>
            </div>
          </article>
        </div>
      </main>
    </div>
  </Teleport>
</template>
