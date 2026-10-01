import { ref, shallowRef } from 'vue';
import type {
  ContextoNivelEliminacion,
  DetalleContextoEliminacion,
  EntidadEliminable,
  NivelEliminacion,
} from '@/config/eliminacion';
import {
  ETIQUETAS_ENTIDAD,
  resolverNivel,
} from '@/config/eliminacion';
import type { ResumenEliminacion } from '@/utils/resumenEliminacion';

export interface EliminacionRequest {
  entidad: EntidadEliminable;
  /** ID del recurso a eliminar (para auditoría de auth fail). */
  resourceId?: string;
  identificacion: string;
  textoConfirmacion?: string;
  detalleContexto?: DetalleContextoEliminacion;
  mensajePersonalizado?: string;
  contextoNivel?: ContextoNivelEliminacion;
  /** Lo que se eliminará en cascada, para mostrarlo en la confirmación. */
  resumen?: ResumenEliminacion | null;
  onConfirm: (password?: string) => Promise<void>;
}

const isOpen = ref(false);
const isConfirming = ref(false);
const nivel = ref<NivelEliminacion>('simple');
const tipoRegistro = ref('');
const identificacion = ref('');
const textoConfirmacionEsperado = ref('');
const detalleContexto = ref<DetalleContextoEliminacion | null>(null);
const mensajePersonalizado = ref('');
const auditResourceType = ref('');
const auditResourceId = ref('');
const resumen = ref<ResumenEliminacion | null>(null);
const onConfirmHandler = shallowRef<((password?: string) => Promise<void>) | null>(null);

/** Eliminación que el servidor no permite: se informa sin pedir contraseña ni confirmación. */
const bloqueo = ref<ResumenEliminacion | null>(null);
const consultandoResumen = ref(false);
/**
 * La consulta ya tardó lo suficiente para avisar («Revisando…»). Una respuesta rápida no
 * muestra nada: así la ventana de aviso no parpadea.
 */
const consultaVisible = ref(false);
export const ESPERA_AVISO_CONSULTA_MS = 150;

function resetState() {
  isOpen.value = false;
  isConfirming.value = false;
  nivel.value = 'simple';
  tipoRegistro.value = '';
  identificacion.value = '';
  textoConfirmacionEsperado.value = '';
  detalleContexto.value = null;
  mensajePersonalizado.value = '';
  auditResourceType.value = '';
  auditResourceId.value = '';
  resumen.value = null;
  onConfirmHandler.value = null;
}

function requestEliminacion(request: EliminacionRequest) {
  isOpen.value = true;
  nivel.value = resolverNivel(request.entidad, request.contextoNivel);
  tipoRegistro.value = ETIQUETAS_ENTIDAD[request.entidad];
  identificacion.value = request.identificacion;
  textoConfirmacionEsperado.value =
    request.textoConfirmacion ?? request.identificacion;
  detalleContexto.value = request.detalleContexto ?? null;
  mensajePersonalizado.value = request.mensajePersonalizado ?? '';
  auditResourceType.value = request.entidad;
  auditResourceId.value = request.resourceId ?? '';
  resumen.value = request.resumen ?? null;
  onConfirmHandler.value = request.onConfirm;
}

/**
 * Eliminación de una empresa, un centro o un trabajador: primero se consulta al servidor
 * qué se eliminaría. Si no se puede (documentos finalizados en SIRES, o demasiado grande),
 * se abre la ventana informativa y no se pide nada más. Si se puede, se abre la
 * confirmación con el desglose de lo que se va a eliminar.
 *
 * Si la consulta falla, se sigue con la confirmación de siempre (`construir(null)`): el
 * servidor vuelve a validar al eliminar.
 */
async function solicitarEliminacionConResumen(
  consultar: () => Promise<{ data: ResumenEliminacion }>,
  construir: (
    resumen: ResumenEliminacion | null,
  ) => EliminacionRequest | Promise<EliminacionRequest>,
): Promise<void> {
  if (consultandoResumen.value) return;
  consultandoResumen.value = true;
  const aviso = setTimeout(() => {
    consultaVisible.value = true;
  }, ESPERA_AVISO_CONSULTA_MS);
  try {
    let consultado: ResumenEliminacion | null = null;
    try {
      consultado = (await consultar()).data ?? null;
    } catch (error) {
      console.error('No se pudo consultar el resumen de la eliminación:', error);
    }
    if (consultado?.bloqueada) {
      bloqueo.value = consultado;
      return;
    }
    const request = await construir(consultado);
    requestEliminacion({ ...request, resumen: consultado });
  } finally {
    clearTimeout(aviso);
    consultaVisible.value = false;
    consultandoResumen.value = false;
  }
}

function cerrarBloqueo() {
  bloqueo.value = null;
}

async function confirmarEliminacion(password?: string) {
  if (!onConfirmHandler.value) return;
  isConfirming.value = true;
  try {
    await onConfirmHandler.value(password);
    resetState();
  } finally {
    isConfirming.value = false;
  }
}

function cancelarEliminacion() {
  resetState();
}

export function useEliminacion() {
  return {
    isOpen,
    isConfirming,
    nivel,
    tipoRegistro,
    identificacion,
    textoConfirmacionEsperado,
    detalleContexto,
    mensajePersonalizado,
    auditResourceType,
    auditResourceId,
    resumen,
    bloqueo,
    consultandoResumen,
    consultaVisible,
    requestEliminacion,
    solicitarEliminacionConResumen,
    cerrarBloqueo,
    confirmarEliminacion,
    cancelarEliminacion,
  };
}
