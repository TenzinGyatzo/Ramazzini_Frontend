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

export interface EliminacionRequest {
  entidad: EntidadEliminable;
  /** ID del recurso a eliminar (para auditoría de auth fail). */
  resourceId?: string;
  identificacion: string;
  textoConfirmacion?: string;
  detalleContexto?: DetalleContextoEliminacion;
  mensajePersonalizado?: string;
  contextoNivel?: ContextoNivelEliminacion;
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
const onConfirmHandler = shallowRef<((password?: string) => Promise<void>) | null>(null);

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
  onConfirmHandler.value = request.onConfirm;
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
    requestEliminacion,
    confirmarEliminacion,
    cancelarEliminacion,
  };
}
