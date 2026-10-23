<script setup lang="ts">
/**
 * Fusión de dos trabajadores de la misma empresa en cuatro pasos
 * (docs/fusion-trabajadores-especificacion.md, 4): elegir los dos registros, cuál se conserva,
 * qué datos quedan y el motivo con la confirmación. «Atrás» no pierde lo elegido.
 */
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import TrabajadoresAPI from '@/api/TrabajadoresAPI';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import { extractApiErrorMessage } from '@/helpers/apiErrors';
import { getIdentificadorPersonalLabel } from '@/helpers/proveedorPais';
import { isGenericCurp } from '@/helpers/isGenericCurp';
import {
  LIMITE_TEXTO_FUSION,
  MOTIVOS_FUSION,
  camposElegidosParaEnvio,
  cambiosEnConservado,
  errorMotivoFusion,
  orientarCampos,
  textoValorCampo,
} from '@/helpers/fusionCampos';

import FusionRegistroResumen from '@/components/FusionRegistroResumen.vue';
import FusionWorkerIdentidad from '@/components/FusionWorkerIdentidad.vue';
import ModalDiscardConfirmDialog from '@/components/ModalDiscardConfirmDialog.vue';
import { useModalDirtyGuard } from '@/composables/useModalDirtyGuard';
import {
  getCachedFusionPreview,
  setCachedFusionPreview,
  invalidateFusionPreviewCache,
} from '@/composables/useFusionPreviewCache';
import type {
  DuplicateWorkerSummary,
  FusionPreview,
  FusionResultadoClinicoSummary,
  FusionRiesgoTrabajoSummary,
  MotivoFusion,
  PosibleDuplicado,
  ResultadoFusion,
  TrabajadorParaFusion,
} from '@/interfaces/trabajador.interface';

const props = defineProps<{
  /** Registro de partida (expediente, alta o fila). Sin él, el paso 1 empieza vacío. */
  trabajadorAId?: string;
  /** Con A y B puestos se salta al paso 2. */
  trabajadorBId?: string;
  posibleDuplicado?: PosibleDuplicado | null;
}>();

const emit = defineEmits<{
  close: [];
  fused: [resultado: ResultadoFusion];
  /** Los dos registros se declararon personas distintas (sin fusionar). */
  descartado: [];
}>();

type Paso = 1 | 2 | 3 | 4;
type RegistroElegido = DuplicateWorkerSummary & Partial<TrabajadorParaFusion>;

const PASOS: { numero: Paso; titulo: string }[] = [
  { numero: 1, titulo: 'Registros' },
  { numero: 2, titulo: 'Cuál se conserva' },
  { numero: 3, titulo: 'Datos' },
  { numero: 4, titulo: 'Motivo y confirmación' },
];

const toast: any = inject('toast');
const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const proveedorSaludStore = useProveedorSaludStore();

const identificadorPersonalLabel = computed(() =>
  getIdentificadorPersonalLabel(proveedorSaludStore.proveedorSalud?.pais),
);

const contexto = () => ({
  empresaId: String(empresas.currentEmpresaId ?? ''),
  centroId: String(centrosTrabajo.currentCentroTrabajoId ?? ''),
});

const paso = ref<Paso>(1);
const pasoInicial = ref<Paso>(1);

// ── Paso 1: elegir los dos registros ─────────────────────────────────────────

const registroA = ref<RegistroElegido | null>(null);
const registroB = ref<RegistroElegido | null>(null);
const busqueda = ref('');
const resultados = ref<TrabajadorParaFusion[]>([]);
const buscando = ref(false);
const errorBusqueda = ref('');
let busquedaSeq = 0;
let temporizadorBusqueda: ReturnType<typeof setTimeout> | null = null;

/** Lo que ya se tiene del trabajador en pantalla, para no mostrar el lugar vacío. */
function resumenConocido(id: string): RegistroElegido {
  const actual = trabajadores.currentTrabajador as any;
  if (actual && String(actual._id) === id) return { ...actual, _id: id };
  const enLista = (Array.isArray(trabajadores.trabajadores) ? trabajadores.trabajadores : [])
    .find((t: any) => String(t._id) === id) as any;
  if (enLista) return { ...enLista, _id: id };
  return { _id: id, nombre: '', primerApellido: '', idCentroTrabajo: '' };
}

function nombreDe(registro: RegistroElegido | DuplicateWorkerSummary | null): string {
  if (!registro) return '';
  return formatNombreCompleto(registro) || 'Registro seleccionado';
}

async function buscar() {
  const { empresaId, centroId } = contexto();
  const q = busqueda.value.trim();
  const excluir = registroA.value?._id;
  const seq = ++busquedaSeq;
  errorBusqueda.value = '';
  // Sin texto: los posibles duplicados del registro A y después los registros más recientes
  if (!empresaId || !centroId) {
    resultados.value = [];
    buscando.value = false;
    return;
  }
  buscando.value = true;
  try {
    const { data } = await TrabajadoresAPI.buscarParaFusion(empresaId, centroId, q, excluir);
    if (seq !== busquedaSeq) return;
    resultados.value = Array.isArray(data) ? data : [];
  } catch (error) {
    if (seq !== busquedaSeq) return;
    resultados.value = [];
    errorBusqueda.value = extractApiErrorMessage(error, 'No se pudo buscar');
  } finally {
    if (seq === busquedaSeq) buscando.value = false;
  }
}

watch(busqueda, () => {
  if (temporizadorBusqueda) clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(() => void buscar(), 300);
});

// Al cambiar A, sus posibles duplicados pasan arriba
watch(
  () => registroA.value?._id,
  () => {
    if (paso.value === 1) void buscar();
  },
);

onBeforeUnmount(() => {
  if (temporizadorBusqueda) clearTimeout(temporizadorBusqueda);
});

const idsElegidos = computed(() =>
  [registroA.value?._id, registroB.value?._id].filter(Boolean) as string[],
);

function elegir(resultado: TrabajadorParaFusion) {
  if (idsElegidos.value.includes(resultado._id)) return;
  if (!registroA.value) registroA.value = resultado;
  else registroB.value = resultado;
}

function quitar(lugar: 'A' | 'B') {
  if (lugar === 'A') {
    registroA.value = registroB.value;
    registroB.value = null;
  } else {
    registroB.value = null;
  }
}

const parCompleto = computed(
  () => !!registroA.value && !!registroB.value && registroA.value._id !== registroB.value._id,
);

const placeholderBusqueda = computed(() => {
  const empresa = (empresas.currentEmpresa as any)?.nombreComercial;
  return empresa
    ? `Buscar en ${empresa} por nombre, ${identificadorPersonalLabel.value}, número de empleado o folio`
    : `Buscar por nombre, ${identificadorPersonalLabel.value}, número de empleado o folio`;
});

// ── Paso 2: cuál se conserva (la vista previa de siempre) ────────────────────

const cargandoVistaPrevia = ref(false);
const preview = ref<FusionPreview | null>(null);
const parCargado = ref('');
const destinoId = ref('');
const fuenteId = ref('');
let previewSeq = 0;

function aplicarRecomendacion(data: FusionPreview) {
  if (data.destinoRecomendadoId && data.destinoRecomendadoId !== destinoId.value) {
    const anterior = destinoId.value;
    destinoId.value = data.destinoRecomendadoId;
    fuenteId.value = anterior;
  }
}

/** Carga la vista previa del par; si es el mismo par que ya se cargó, conserva lo elegido. */
async function cargarVistaPrevia(): Promise<boolean> {
  if (!registroA.value || !registroB.value) return false;
  const a = registroA.value._id;
  const b = registroB.value._id;
  const clave = [a, b].sort().join(':');
  if (preview.value && parCargado.value === clave) return true;

  const { empresaId, centroId } = contexto();
  if (!empresaId || !centroId) return false;

  // Par nuevo: lo elegido para el anterior ya no aplica
  preview.value = null;
  elecciones.value = {};
  if (props.posibleDuplicado && [a, b].includes(props.posibleDuplicado.trabajadorId)) {
    destinoId.value = props.posibleDuplicado.trabajadorId;
    fuenteId.value = destinoId.value === a ? b : a;
  } else {
    destinoId.value = a;
    fuenteId.value = b;
  }

  const seq = ++previewSeq;
  const cached = getCachedFusionPreview(destinoId.value, fuenteId.value);
  if (cached) {
    preview.value = cached;
    parCargado.value = clave;
    aplicarRecomendacion(cached);
    return true;
  }

  cargandoVistaPrevia.value = true;
  try {
    const { data } = await TrabajadoresAPI.getFusionPreview(
      empresaId,
      centroId,
      destinoId.value,
      fuenteId.value,
    );
    if (seq !== previewSeq) return false;
    preview.value = data;
    parCargado.value = clave;
    setCachedFusionPreview(destinoId.value, fuenteId.value, data);
    aplicarRecomendacion(data);
    return true;
  } catch (error) {
    if (seq !== previewSeq) return false;
    toast?.open({
      message: extractApiErrorMessage(error, 'No se pudo cargar la vista previa de fusión'),
      type: 'error',
    });
    return false;
  } finally {
    if (seq === previewSeq) cargandoVistaPrevia.value = false;
  }
}

function esDestinoDeLaVistaPrevia(id: string): boolean {
  return id === preview.value?.destino._id;
}

function conteosDeRegistro(id: string): Record<string, number> {
  if (!preview.value) return {};
  return esDestinoDeLaVistaPrevia(id) ? preview.value.conteosDestino : preview.value.conteosFuente;
}

function resultadosDeRegistro(id: string): FusionResultadoClinicoSummary[] {
  if (!preview.value) return [];
  return esDestinoDeLaVistaPrevia(id)
    ? (preview.value.resultadosClinicosDestino ?? [])
    : (preview.value.resultadosClinicosFuente ?? []);
}

function riesgosDeRegistro(id: string): FusionRiesgoTrabajoSummary[] {
  if (!preview.value) return [];
  return esDestinoDeLaVistaPrevia(id)
    ? (preview.value.riesgosTrabajoDestino ?? [])
    : (preview.value.riesgosTrabajoFuente ?? []);
}

const algunoTieneRiesgosTrabajo = computed(() => {
  if (!preview.value) return false;
  return (
    (preview.value.riesgosTrabajoDestino?.length ?? 0) > 0
    || (preview.value.riesgosTrabajoFuente?.length ?? 0) > 0
  );
});

function registroOpuesto(registro: DuplicateWorkerSummary): DuplicateWorkerSummary {
  if (!preview.value) return registro;
  return esDestinoDeLaVistaPrevia(registro._id) ? preview.value.fuente : preview.value.destino;
}

const registroConservado = computed(() => {
  if (!preview.value) return null;
  return esDestinoDeLaVistaPrevia(destinoId.value) ? preview.value.destino : preview.value.fuente;
});

const registroEliminado = computed(() =>
  registroConservado.value ? registroOpuesto(registroConservado.value) : null,
);

const totalRegistrosFuente = computed(() =>
  Object.values(conteosDeRegistro(fuenteId.value)).reduce((a, b) => a + b, 0),
);

const centrosDistintos = computed(() => {
  if (!preview.value) return false;
  return preview.value.destino.idCentroTrabajo !== preview.value.fuente.idCentroTrabajo;
});

const criterioCoincidenciaLabel = computed(() => {
  const criterio = preview.value?.criterioMatch;
  if (!criterio) return 'confirmación manual';
  if (criterio === 'FOLIO') return 'mismos datos de identidad';
  return `misma ${identificadorPersonalLabel.value}`;
});

const identidadCoincide = computed(() => preview.value?.identidadCoincide !== false);

function esConservado(id: string): boolean {
  return id === destinoId.value;
}

// ── «No son la misma persona» (solo con una alerta de posible duplicado entre los dos) ─

/** Con la misma CURP real no se permite: dos personas no la comparten. */
const compartenCurp = computed(() => {
  const a = preview.value?.destino.curp?.trim().toUpperCase() ?? '';
  const b = preview.value?.fuente.curp?.trim().toUpperCase() ?? '';
  return !!a && a === b && !isGenericCurp(a);
});

const confirmandoDistintos = ref(false);
const notaDistintos = ref('');
const enviandoDistintos = ref(false);
const errorDistintos = ref('');

function abrirPersonasDistintas() {
  notaDistintos.value = '';
  errorDistintos.value = '';
  confirmandoDistintos.value = true;
}

async function confirmarPersonasDistintas() {
  if (!preview.value) return;
  const { empresaId, centroId } = contexto();
  if (!empresaId || !centroId) return;
  errorDistintos.value = '';
  enviandoDistintos.value = true;
  try {
    await TrabajadoresAPI.declararPersonasDistintas(empresaId, centroId, {
      trabajadorAId: preview.value.destino._id,
      trabajadorBId: preview.value.fuente._id,
      nota: notaDistintos.value.trim() || undefined,
    });
    toast?.open({
      message: 'Los registros quedaron como personas distintas',
      type: 'success',
    });
    invalidateFusionPreviewCache(preview.value.destino._id, preview.value.fuente._id);
    invalidateFusionPreviewCache(preview.value.fuente._id, preview.value.destino._id);
    await trabajadores.fetchTrabajadoresConHistoria(empresaId, centroId);
    confirmandoDistintos.value = false;
    emit('descartado');
    forceClose();
  } catch (error) {
    errorDistintos.value = extractApiErrorMessage(
      error,
      'No se pudo registrar que son personas distintas',
    );
  } finally {
    enviandoDistintos.value = false;
  }
}

function conservarRegistro(id: string) {
  if (id === destinoId.value) return;
  fuenteId.value = destinoId.value;
  destinoId.value = id;
}

// ── Paso 3: datos del registro que se conserva ───────────────────────────────

/** Por campo, el id del registro del que sale el valor (sobrevive a cambiar cuál se conserva). */
const elecciones = ref<Record<string, string>>({});

const centrosNombre = computed(() => preview.value?.centrosNombre ?? {});

const camposOrientados = computed(() =>
  orientarCampos(preview.value?.camposDiferentes ?? [], esDestinoDeLaVistaPrevia(destinoId.value)),
);

const camposElegidos = computed(() =>
  camposElegidosParaEnvio(camposOrientados.value, elecciones.value, destinoId.value),
);

function registroElegidoPara(clave: string): string {
  return camposElegidos.value[clave] === 'fuente' ? fuenteId.value : destinoId.value;
}

function elegirValor(clave: string, registroId: string) {
  elecciones.value = { ...elecciones.value, [clave]: registroId };
}

function textoValor(clave: string, valores: Record<string, string | number | null>) {
  return textoValorCampo(clave, valores, centrosNombre.value);
}

const cambios = computed(() =>
  cambiosEnConservado(camposOrientados.value, camposElegidos.value, centrosNombre.value),
);

const centroFinalId = computed(() => {
  if (!registroConservado.value || !registroEliminado.value) return '';
  return camposElegidos.value.idCentroTrabajo === 'fuente'
    ? registroEliminado.value.idCentroTrabajo
    : registroConservado.value.idCentroTrabajo;
});

// ── Paso 4: motivo y confirmación ────────────────────────────────────────────

const motivos = ref<MotivoFusion[]>([]);
const motivoOtro = ref('');
const comentario = ref('');
const confirmacion = ref(false);
const submitting = ref(false);
const errorEnvio = ref('');

const conOtro = computed(() => motivos.value.includes('OTRO'));

// ── Navegación y cierre ──────────────────────────────────────────────────────

const closeModal = () => emit('close');

const isFusionDirty = computed(
  () =>
    paso.value > pasoInicial.value
    || (pasoInicial.value === 1 && !!registroB.value)
    || motivos.value.length > 0
    || !!comentario.value.trim()
    || confirmacion.value,
);

const {
  showDiscardConfirm,
  dismissPulse,
  requestDismiss,
  forceClose,
  continueEditing,
  confirmDiscard,
} = useModalDirtyGuard({
  isDirty: isFusionDirty,
  onClose: closeModal,
  enabled: () =>
    !submitting.value && !enviandoDistintos.value && !confirmandoDistintos.value,
  // Con la confirmación de «No son la misma persona» abierta, Escape solo la cierra
  escapeActive: () => !submitting.value && !enviandoDistintos.value,
  onEscapeWhenDisabled: () => {
    confirmandoDistintos.value = false;
  },
});

const puedeSeguir = computed(() => {
  if (paso.value === 1) return parCompleto.value;
  if (paso.value === 2) return !!preview.value && !cargandoVistaPrevia.value;
  return true;
});

async function siguiente() {
  if (!puedeSeguir.value) return;
  if (paso.value === 1) {
    paso.value = 2;
    if (!(await cargarVistaPrevia())) paso.value = 1;
    return;
  }
  if (paso.value < 4) paso.value = (paso.value + 1) as Paso;
}

function atras() {
  if (paso.value > 1) paso.value = (paso.value - 1) as Paso;
  if (paso.value === 1) void buscar();
}

async function confirmarFusion() {
  errorEnvio.value = '';
  const errorMotivo = errorMotivoFusion(motivos.value, motivoOtro.value, comentario.value);
  if (errorMotivo) {
    errorEnvio.value = errorMotivo;
    return;
  }
  if (!confirmacion.value) {
    errorEnvio.value = 'Marca la casilla de confirmación.';
    return;
  }
  const { empresaId, centroId } = contexto();
  if (!empresaId || !centroId) {
    errorEnvio.value = 'Empresa o centro de trabajo no disponible.';
    return;
  }

  const conservadoId = destinoId.value;
  const eliminadoId = fuenteId.value;
  const idCentroTrabajo = centroFinalId.value;
  submitting.value = true;
  try {
    await TrabajadoresAPI.fusionarTrabajadores(empresaId, centroId, {
      trabajadorDestinoId: conservadoId,
      trabajadorFuenteId: eliminadoId,
      confirmacion: true,
      motivos: motivos.value,
      motivoOtro: conOtro.value ? motivoOtro.value.trim() : undefined,
      comentario: comentario.value.trim() || undefined,
      camposElegidos: camposElegidos.value,
    });
    toast?.open({ message: 'Trabajadores fusionados correctamente', type: 'success' });
    invalidateFusionPreviewCache(conservadoId, eliminadoId);
    invalidateFusionPreviewCache(eliminadoId, conservadoId);
    await trabajadores.fetchTrabajadoresConHistoria(empresaId, centroId);
    emit('fused', { conservadoId, eliminadoId, idCentroTrabajo });
    forceClose();
  } catch (error) {
    errorEnvio.value = extractApiErrorMessage(error, 'Error al fusionar trabajadores');
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  if (props.trabajadorAId) registroA.value = resumenConocido(props.trabajadorAId);
  if (props.trabajadorAId && props.trabajadorBId) {
    registroB.value = props.posibleDuplicado?.trabajador?._id === props.trabajadorBId
      ? props.posibleDuplicado.trabajador
      : resumenConocido(props.trabajadorBId);
    pasoInicial.value = 2;
    paso.value = 2;
    if (!(await cargarVistaPrevia())) {
      pasoInicial.value = 1;
      paso.value = 1;
      void buscar();
    }
    return;
  }
  void buscar();
});
</script>

<template>
  <div class="modal modal-fusion-trabajadores fixed inset-0 z-[60] p-4 grid grid-cols-1 place-items-center">
    <div
      class="modal-work-overlay absolute inset-0 bg-emerald-900/50 backdrop-blur-sm"
      :class="{ 'modal-backdrop-pulse': dismissPulse }"
      aria-hidden="true"
      @click="requestDismiss"
    />
    <div
      class="modal-work-panel relative bg-white dark:bg-slate-800 dark:text-slate-100 rounded-xl shadow-xl dark:shadow-black/40 max-w-5xl w-full max-h-[90vh] flex flex-col"
      :class="{ 'modal-dismiss-pulse': dismissPulse }"
    >
      <div class="px-6 pt-5 pb-4 border-b border-gray-200 dark:border-slate-600">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-100">Fusionar trabajadores</h2>
        <p class="text-sm text-gray-600 dark:text-slate-300 mt-1">
          Se consolida el expediente bajo un solo registro. El otro registro se elimina.
        </p>
        <ol class="fusion-pasos mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs" aria-label="Pasos de la fusión">
          <li
            v-for="p in PASOS"
            :key="p.numero"
            class="flex items-center gap-1.5"
            :class="p.numero === paso
              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
              : p.numero < paso ? 'text-gray-600 dark:text-slate-300' : 'text-gray-400 dark:text-slate-500'"
            :aria-current="p.numero === paso ? 'step' : undefined"
          >
            <span
              class="inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px]"
              :class="p.numero === paso
                ? 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-600'
                : p.numero < paso ? 'border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400' : 'border-gray-300 dark:border-slate-500'"
            >
              <i v-if="p.numero < paso" class="fas fa-check text-[9px]" aria-hidden="true"></i>
              <template v-else>{{ p.numero }}</template>
            </span>
            {{ p.titulo }}
          </li>
        </ol>
      </div>

      <div class="flex-1 overflow-y-auto">
        <!-- Paso 1: elegir los dos registros -->
        <div v-if="paso === 1" class="p-6 space-y-5">
          <div class="grid sm:grid-cols-2 gap-3">
            <div
              v-for="lugar in (['A', 'B'] as const)"
              :key="lugar"
              class="rounded-lg border p-3 text-sm"
              :class="(lugar === 'A' ? registroA : registroB)
                ? 'border-emerald-300 dark:border-emerald-700'
                : 'border-dashed border-gray-300 dark:border-slate-600'"
            >
              <p class="text-xs font-medium text-gray-500 dark:text-slate-400">Registro {{ lugar }}</p>
              <template v-if="lugar === 'A' ? registroA : registroB">
                <div class="mt-1 flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="font-semibold text-gray-900 dark:text-slate-100 truncate">
                      {{ nombreDe(lugar === 'A' ? registroA : registroB) }}
                    </p>
                    <p class="text-xs text-gray-600 dark:text-slate-300">
                      Folio {{ (lugar === 'A' ? registroA : registroB)?.folio || 'N/D' }}
                      <template v-if="(lugar === 'A' ? registroA : registroB)?.curp">
                        · {{ (lugar === 'A' ? registroA : registroB)?.curp }}
                      </template>
                    </p>
                  </div>
                  <button
                    type="button"
                    class="shrink-0 text-xs text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                    :aria-label="`Quitar el registro ${lugar}`"
                    @click="quitar(lugar)"
                  >
                    <i class="fas fa-times" aria-hidden="true"></i> Quitar
                  </button>
                </div>
              </template>
              <p v-else class="mt-1 text-gray-400 dark:text-slate-500">
                {{ lugar === 'A' || registroA ? 'Elige un registro de la lista' : 'Sin elegir' }}
              </p>
            </div>
          </div>

          <div>
            <label for="fusion-busqueda" class="sr-only">Buscar trabajador</label>
            <div class="relative">
              <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" aria-hidden="true"></i>
              <input
                id="fusion-busqueda"
                v-model="busqueda"
                type="search"
                autocomplete="off"
                class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                :placeholder="placeholderBusqueda"
              />
            </div>
            <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
              Solo aparecen trabajadores de esta empresa, de todos sus centros de trabajo.
            </p>
          </div>

          <div class="min-h-[8rem]">
            <p
              v-if="!busqueda.trim() && resultados.length && !buscando && !errorBusqueda"
              class="mb-1.5 text-xs font-medium text-gray-500 dark:text-slate-400"
            >
              {{ resultados.some((r) => r.posibleDuplicado)
                ? 'Posibles duplicados y registros más recientes'
                : 'Registros más recientes de la empresa' }}
            </p>
            <p v-if="buscando" class="py-6 text-center text-sm text-gray-500 dark:text-slate-400">Buscando…</p>
            <p v-else-if="errorBusqueda" class="py-6 text-center text-sm text-red-600 dark:text-red-400">{{ errorBusqueda }}</p>
            <p
              v-else-if="!resultados.length"
              class="py-6 text-center text-sm text-gray-500 dark:text-slate-400"
            >
              {{ busqueda.trim()
                ? 'No se encontraron trabajadores con esa búsqueda.'
                : 'No hay otros trabajadores en esta empresa.' }}
            </p>
            <ul v-else class="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-slate-700 dark:border-slate-600">
              <li v-for="resultado in resultados" :key="resultado._id">
                <button
                  type="button"
                  class="w-full px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  :class="idsElegidos.includes(resultado._id) ? '' : 'hover:bg-emerald-50 dark:hover:bg-slate-700'"
                  :disabled="idsElegidos.includes(resultado._id)"
                  @click="elegir(resultado)"
                >
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-medium text-gray-900 dark:text-slate-100">{{ nombreDe(resultado) }}</span>
                    <span
                      v-if="resultado.posibleDuplicado"
                      class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                    >
                      Posible duplicado
                    </span>
                    <span v-if="idsElegidos.includes(resultado._id)" class="text-xs text-emerald-700 dark:text-emerald-400">Elegido</span>
                  </div>
                  <p class="mt-0.5 text-xs text-gray-600 dark:text-slate-300">
                    {{ identificadorPersonalLabel }} {{ resultado.curp || 'N/D' }}
                    · No. empleado {{ resultado.numeroEmpleado || 'N/D' }}
                    · Folio {{ resultado.folio || 'N/D' }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-slate-400">
                    {{ resultado.nombreCentroTrabajo || 'Centro sin nombre' }}
                    <template v-if="resultado.estadoLaboral"> · {{ resultado.estadoLaboral }}</template>
                    · {{ resultado.numeroDocumentos }} {{ resultado.numeroDocumentos === 1 ? 'documento' : 'documentos' }}
                  </p>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <!-- Paso 2: cuál se conserva -->
        <template v-else-if="paso === 2">
          <div v-if="cargandoVistaPrevia || !preview" class="p-8 text-center text-gray-500 dark:text-slate-400">Cargando vista previa…</div>
          <div v-else class="p-6 space-y-6">
            <div
              v-if="!identidadCoincide"
              class="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
              role="alert"
            >
              <i class="fas fa-exclamation-triangle mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true"></i>
              Los datos de identidad no coinciden. Continúa solo si se trata de la misma persona.
            </div>

            <div
              v-if="preview.posibleDuplicado"
              class="fusion-posible-duplicado flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-gray-200 p-3 text-sm text-gray-700 dark:border-slate-600 dark:text-slate-300"
            >
              <template v-if="compartenCurp">
                <p>
                  Estos registros están marcados como posible duplicado y tienen la misma {{ identificadorPersonalLabel }}.
                  Dos personas distintas no pueden compartirla: se resuelve fusionándolos o eliminando el que sobra.
                </p>
              </template>
              <template v-else>
                <p>Estos registros están marcados como posible duplicado. Si no son la misma persona, puedes indicarlo sin fusionar.</p>
                <button
                  type="button"
                  class="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-500 dark:text-slate-200 dark:hover:bg-slate-700"
                  @click="abrirPersonasDistintas"
                >
                  No son la misma persona
                </button>
              </template>
            </div>

            <p class="text-xs text-gray-500 dark:text-slate-400">
              Elige el registro que se <strong class="text-gray-700 dark:text-slate-200">conserva</strong>. El otro se elimina y todo su contenido pasa al que se conserva.
            </p>

            <div class="grid lg:grid-cols-2 gap-4">
              <div
                v-for="registro in [preview.destino, preview.fuente]"
                :key="registro._id"
                class="border rounded-xl p-4 flex flex-col bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 transition-all duration-300"
                :class="esConservado(registro._id) ? 'border-emerald-400 dark:border-emerald-500' : 'border-red-200 dark:border-red-800'"
              >
                <div class="flex justify-between items-start mb-3 gap-2">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                    :class="esConservado(registro._id) ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'"
                  >
                    {{ esConservado(registro._id) ? 'Se conserva' : 'Se elimina' }}
                  </span>
                  <button
                    v-if="!esConservado(registro._id)"
                    type="button"
                    class="text-xs text-emerald-700 dark:text-emerald-400 underline whitespace-nowrap"
                    @click="conservarRegistro(registro._id)"
                  >
                    Conservar este
                  </button>
                </div>

                <FusionWorkerIdentidad
                  :registro="registro"
                  :opuesto="registroOpuesto(registro)"
                  :identificador-personal-label="identificadorPersonalLabel"
                />

                <div class="mt-4 flex-1">
                  <FusionRegistroResumen
                    :conteos="conteosDeRegistro(registro._id)"
                    :resultados-clinicos="resultadosDeRegistro(registro._id)"
                    :riesgos-trabajo="riesgosDeRegistro(registro._id)"
                    :mostrar-riesgos-trabajo="algunoTieneRiesgosTrabajo"
                    compact
                  />
                </div>
              </div>
            </div>

            <div class="bg-sky-50 border border-sky-200 dark:bg-sky-950/35 dark:border-sky-800 rounded-lg p-4 text-sm text-sky-950 dark:text-sky-100 space-y-2">
              <p class="font-medium flex items-center gap-2">
                <i class="fas fa-map-marker-alt text-sky-600 dark:text-sky-400"></i>
                Ubicación del expediente unificado
              </p>
              <p>
                Por defecto, el trabajador queda en el centro de trabajo del registro que se conserva:
                <strong class="text-sky-950 dark:text-sky-50">{{ registroConservado?.nombreCentroTrabajo?.trim() || 'Centro de trabajo del registro conservado' }}</strong>.
              </p>
              <p v-if="centrosDistintos" class="text-sky-900 dark:text-sky-200">
                Los registros están en centros de trabajo distintos: en el siguiente paso puedes elegir en cuál queda.
              </p>
            </div>

            <div class="bg-amber-50 border border-amber-200 dark:bg-amber-950/35 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-950 dark:text-amber-100 space-y-3">
              <p class="font-medium flex items-center gap-2">
                <i class="fas fa-exchange-alt text-amber-700 dark:text-amber-400"></i>
                Contenido que pasa al registro que se conserva
              </p>
              <p>
                Del registro de <strong>{{ nombreDe(registroEliminado) }}</strong> se trasladan
                <strong>{{ totalRegistrosFuente }}</strong> registro(s) en total.
                Criterio de coincidencia: {{ criterioCoincidenciaLabel }}.
              </p>
              <FusionRegistroResumen
                v-if="fuenteId"
                two-columns
                :conteos="conteosDeRegistro(fuenteId)"
                :resultados-clinicos="resultadosDeRegistro(fuenteId)"
                :riesgos-trabajo="riesgosDeRegistro(fuenteId)"
                :mostrar-riesgos-trabajo="algunoTieneRiesgosTrabajo"
              />
            </div>
          </div>
        </template>

        <!-- Paso 3: datos del registro que se conserva -->
        <div v-else-if="paso === 3 && preview" class="p-6 space-y-4">
          <div
            v-if="!identidadCoincide"
            class="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
            role="alert"
          >
            <i class="fas fa-exclamation-triangle mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true"></i>
            Los datos de identidad no coinciden. Continúa solo si se trata de la misma persona.
          </div>

          <p v-if="!camposOrientados.length" class="py-6 text-center text-sm text-gray-600 dark:text-slate-300">
            Los dos registros tienen los mismos datos.
          </p>
          <template v-else>
            <p class="text-sm text-gray-600 dark:text-slate-300">
              Estos datos difieren entre los dos registros. Elige el valor que queda en el registro que se conserva.
            </p>
            <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-600">
              <table class="fusion-campos w-full text-sm">
                <thead class="bg-gray-50 text-left text-xs text-gray-600 dark:bg-slate-900/60 dark:text-slate-300">
                  <tr>
                    <th scope="col" class="px-3 py-2 font-medium">Dato</th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      Se conserva · Folio {{ registroConservado?.folio || 'N/D' }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      Se elimina · Folio {{ registroEliminado?.folio || 'N/D' }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-slate-700">
                  <tr v-for="campo in camposOrientados" :key="campo.clave">
                    <th scope="row" class="px-3 py-2 text-left font-medium text-gray-800 dark:text-slate-200 whitespace-nowrap">
                      {{ campo.etiqueta }}
                    </th>
                    <td
                      v-for="opcion in [
                        { id: destinoId, valores: campo.valoresDestino },
                        { id: fuenteId, valores: campo.valoresFuente },
                      ]"
                      :key="opcion.id"
                      class="px-3 py-2"
                    >
                      <label class="flex cursor-pointer items-start gap-2">
                        <input
                          type="radio"
                          class="mt-0.5 accent-emerald-600 dark:accent-emerald-400"
                          :name="`fusion-campo-${campo.clave}`"
                          :checked="registroElegidoPara(campo.clave) === opcion.id"
                          @change="elegirValor(campo.clave, opcion.id)"
                        />
                        <span
                          v-if="textoValor(campo.clave, opcion.valores) !== null"
                          class="text-gray-900 dark:text-slate-100 break-words"
                        >
                          {{ textoValor(campo.clave, opcion.valores) }}
                        </span>
                        <span v-else class="italic text-gray-400 dark:text-slate-500">Sin dato</span>
                      </label>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-xs text-gray-500 dark:text-slate-400">
              El folio y los agentes de riesgo son los del registro que se conserva. Al fusionar se revisa que los datos elegidos sean válidos juntos.
            </p>
          </template>
        </div>

        <!-- Paso 4: motivo y confirmación -->
        <div v-else-if="paso === 4 && preview" class="p-6 space-y-5">
          <fieldset>
            <legend class="text-sm font-medium text-gray-800 dark:text-slate-200">
              Motivo de la fusión <span class="font-normal text-gray-500 dark:text-slate-400">(uno o varios)</span>
            </legend>
            <div class="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
              <label
                v-for="motivo in MOTIVOS_FUSION"
                :key="motivo.valor"
                class="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300"
              >
                <input
                  v-model="motivos"
                  type="checkbox"
                  class="accent-emerald-600 dark:accent-emerald-400"
                  :value="motivo.valor"
                />
                {{ motivo.etiqueta }}
              </label>
            </div>
            <div v-if="conOtro" class="mt-2">
              <label for="fusion-motivo-otro" class="sr-only">Describe el motivo</label>
              <input
                id="fusion-motivo-otro"
                v-model="motivoOtro"
                type="text"
                :maxlength="LIMITE_TEXTO_FUSION"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Describe el motivo"
              />
            </div>
          </fieldset>

          <div>
            <label for="fusion-comentario" class="text-sm font-medium text-gray-800 dark:text-slate-200">
              Comentario <span class="font-normal text-gray-500 dark:text-slate-400">(opcional)</span>
            </label>
            <textarea
              id="fusion-comentario"
              v-model="comentario"
              rows="2"
              :maxlength="LIMITE_TEXTO_FUSION"
              class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div class="rounded-lg border border-gray-200 p-4 text-sm space-y-3 dark:border-slate-600">
            <p class="font-medium text-gray-800 dark:text-slate-200">Resumen</p>
            <ul class="space-y-1 text-gray-700 dark:text-slate-300">
              <li>
                <i class="fas fa-check-circle mr-1 text-emerald-600 dark:text-emerald-400" aria-hidden="true"></i>
                Se conserva el registro con folio <strong>{{ registroConservado?.folio || 'N/D' }}</strong> ({{ nombreDe(registroConservado) }}).
              </li>
              <li>
                <i class="fas fa-times-circle mr-1 text-red-600 dark:text-red-400" aria-hidden="true"></i>
                Se elimina el registro con folio <strong>{{ registroEliminado?.folio || 'N/D' }}</strong> ({{ nombreDe(registroEliminado) }}); su folio se retira.
              </li>
              <li>
                <i class="fas fa-exchange-alt mr-1 text-gray-500 dark:text-slate-400" aria-hidden="true"></i>
                Se trasladan {{ totalRegistrosFuente }} registro(s):
              </li>
            </ul>
            <FusionRegistroResumen
              two-columns
              :conteos="conteosDeRegistro(fuenteId)"
              :resultados-clinicos="resultadosDeRegistro(fuenteId)"
              :riesgos-trabajo="riesgosDeRegistro(fuenteId)"
              :mostrar-riesgos-trabajo="algunoTieneRiesgosTrabajo"
            />
            <div>
              <p class="text-gray-700 dark:text-slate-300">Datos que cambian en el registro que se conserva:</p>
              <ul v-if="cambios.length" class="mt-1 space-y-0.5">
                <li v-for="cambio in cambios" :key="cambio.clave" class="text-gray-700 dark:text-slate-300">
                  {{ cambio.etiqueta }}:
                  <span class="text-gray-500 line-through dark:text-slate-400">{{ cambio.anterior ?? 'Sin dato' }}</span>
                  → <strong>{{ cambio.nuevo ?? 'Sin dato' }}</strong>
                </li>
              </ul>
              <p v-else class="mt-1 text-gray-500 dark:text-slate-400">Ninguno.</p>
            </div>
          </div>

          <label class="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
            <input v-model="confirmacion" type="checkbox" class="mt-1 accent-red-600 dark:accent-red-500" />
            Confirmo que los dos registros son de la misma persona y que la fusión no se puede deshacer.
          </label>

          <div
            v-if="errorEnvio"
            class="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            <span>{{ errorEnvio }}</span>
            <button
              v-if="camposOrientados.length"
              type="button"
              class="shrink-0 text-xs underline"
              @click="paso = 3"
            >
              Revisar los datos
            </button>
          </div>
        </div>
      </div>

      <div class="px-6 py-4 border-t border-gray-200 dark:border-slate-600 flex items-center justify-between gap-3">
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          :disabled="submitting"
          @click="requestDismiss"
        >
          Cancelar
        </button>
        <div class="flex gap-3">
          <button
            v-if="paso > 1"
            type="button"
            class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            :disabled="submitting"
            @click="atras"
          >
            Atrás
          </button>
          <button
            v-if="paso < 4"
            type="button"
            class="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            :disabled="!puedeSeguir"
            @click="siguiente"
          >
            Siguiente
          </button>
          <button
            v-else
            type="button"
            class="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            :disabled="submitting"
            @click="confirmarFusion"
          >
            {{ submitting ? 'Fusionando…' : 'Fusionar' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="confirmandoDistintos && preview"
      class="fixed inset-0 z-[70] grid grid-cols-1 place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fusion-distintos-titulo"
    >
      <div class="absolute inset-0 bg-slate-900/40" aria-hidden="true" @click="!enviandoDistintos && (confirmandoDistintos = false)" />
      <div class="relative w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800 dark:text-slate-100">
        <h3 id="fusion-distintos-titulo" class="text-lg font-semibold text-gray-900 dark:text-slate-100">No son la misma persona</h3>
        <p class="text-sm text-gray-700 dark:text-slate-300">
          Los registros de <strong>{{ nombreDe(preview.destino) }}</strong> (folio {{ preview.destino.folio || 'N/D' }})
          y de <strong>{{ nombreDe(preview.fuente) }}</strong> (folio {{ preview.fuente.folio || 'N/D' }})
          quedarán como personas distintas y dejarán de marcarse como posible duplicado.
        </p>
        <div>
          <label for="fusion-distintos-nota" class="text-sm font-medium text-gray-800 dark:text-slate-200">
            Nota <span class="font-normal text-gray-500 dark:text-slate-400">(opcional)</span>
          </label>
          <textarea
            id="fusion-distintos-nota"
            v-model="notaDistintos"
            rows="2"
            :maxlength="LIMITE_TEXTO_FUSION"
            class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            placeholder="Por ejemplo: son hermanos con el mismo nombre"
          />
        </div>
        <p
          v-if="errorDistintos"
          class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {{ errorDistintos }}
        </p>
        <div class="flex justify-end gap-3">
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            :disabled="enviandoDistintos"
            @click="confirmandoDistintos = false"
          >
            Volver
          </button>
          <button
            type="button"
            class="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
            :disabled="enviandoDistintos"
            @click="confirmarPersonasDistintas"
          >
            {{ enviandoDistintos ? 'Guardando…' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>

    <ModalDiscardConfirmDialog
      :open="showDiscardConfirm"
      @continue-editing="continueEditing"
      @discard="confirmDiscard"
    />
  </div>
</template>
