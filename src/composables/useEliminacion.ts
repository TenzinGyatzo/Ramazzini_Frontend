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
/**
 * Antes de esto la respuesta suele llegar: sobre el fondo (puesto desde el clic) aparece
 * directo la ventana, sin tarjeta «Revisando…» intermedia.
 */
export const ESPERA_AVISO_CONSULTA_MS = 400;
/** Si el aviso llegó a mostrarse, se queda al menos esto (nunca un destello). */
export const MINIMO_AVISO_CONSULTA_MS = 500;
/**
 * La ventana siguiente (confirmación o «no se puede eliminar») llega sobre el fondo de la
 * revisión, que se puso desde el clic: aparece sin animar su fondo y el de la revisión se
 * quita en el mismo instante. El fondo gris queda quieto y solo cambia la tarjeta.
 */
const pasoDirecto = ref(false);

const esperar = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function resetState() {
  isOpen.value = false;
  // Al cerrarse, la ventana vuelve a desvanecerse como siempre
  pasoDirecto.value = false;
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
  pasoDirecto.value = false;
  let avisoDesde = 0;
  const aviso = setTimeout(() => {
    consultaVisible.value = true;
    avisoDesde = Date.now();
  }, ESPERA_AVISO_CONSULTA_MS);
  try {
    let consultado: ResumenEliminacion | null = null;
    try {
      consultado = (await consultar()).data ?? null;
    } catch (error) {
      console.error('No se pudo consultar el resumen de la eliminación:', error);
    }
    clearTimeout(aviso);
    if (consultaVisible.value) {
      const faltante = MINIMO_AVISO_CONSULTA_MS - (Date.now() - avisoDesde);
      if (faltante > 0) await esperar(faltante);
    }
    pasoDirecto.value = true;
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
  pasoDirecto.value = false;
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
    pasoDirecto,
    requestEliminacion,
    solicitarEliminacionConResumen,
    cerrarBloqueo,
    confirmarEliminacion,
    cancelarEliminacion,
  };
}
