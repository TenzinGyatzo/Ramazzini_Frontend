<script setup>
/**
 * Subida de documentos externos en un solo paso: cada archivo con su nombre y su fecha antes de
 * subir. Las fotos que pasan del límite se reducen solas; cada archivo muestra su estado y, si
 * falla, el motivo, y «Reintentar» sube solo los que faltan. Reglas en
 * helpers/subidaDocumentosExternos.ts.
 */
import { ref, computed, inject, nextTick } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useDocumentosStore } from '@/stores/documentos';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { useSiresDocumentDateMax } from '@/composables/useSiresDocumentDateMax';
import { format } from 'date-fns';
import { convertirYYYYMMDDaISO } from '@/helpers/dates';
import { buildClinicalDirectoryPath } from '@/helpers/clinicalPath';
import {
  LIMITE_BYTES_DOCUMENTO_EXTERNO,
  MAXIMO_ARCHIVOS_POR_CARGA,
  NOMBRES_RAPIDOS,
  esImagen,
  extensionDe,
  motivoDeError,
  motivoDeRechazo,
  nombreSugerido,
  reducirImagen,
  tamanoLegible,
  textoDeRechazo,
} from '@/helpers/subidaDocumentosExternos';
import { useDirtySnapshot } from '@/composables/useDirtySnapshot';
import { useModalDirtyGuard } from '@/composables/useModalDirtyGuard';
import ModalDiscardConfirmDialog from '@/components/ModalDiscardConfirmDialog.vue';

const toast = inject('toast');

const { currentEmpresa } = useEmpresasStore();
const { currentCentroTrabajo } = useCentrosTrabajoStore();
const { currentTrabajador } = useTrabajadoresStore();
const documentos = useDocumentosStore();
const { ensureUserLoaded } = useCurrentUser();
const { fechaDocumentoMax, fechaDocumentoMin } = useSiresDocumentDateMax();

const emit = defineEmits(['closeDocumentoExternoModal', 'updateData']);

/**
 * Archivos de la carga. estado: 'reduciendo' | 'pendiente' | 'subiendo' | 'subido' | 'error'.
 * `reducidoDe` guarda el tamaño original de una foto que se redujo.
 */
const archivos = ref([]);
const isDragOver = ref(false);
const isUploading = ref(false);
const intentoDeSubida = ref(false);
let siguienteId = 1;

const hoy = () => format(new Date(), 'yyyy-MM-dd');

/** En celular y tableta se ofrece abrir la cámara directamente. */
const puedeTomarFoto =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

const porSubir = computed(() => archivos.value.filter((a) => a.estado === 'pendiente' || a.estado === 'error'));
const subidos = computed(() => archivos.value.filter((a) => a.estado === 'subido').length);
const reduciendo = computed(() => archivos.value.some((a) => a.estado === 'reduciendo'));
const hayErrores = computed(() => archivos.value.some((a) => a.estado === 'error'));
const textoBoton = computed(() => {
  const n = porSubir.value.length;
  if (hayErrores.value && n === archivos.value.filter((a) => a.estado === 'error').length) {
    return n === 1 ? 'Reintentar 1 documento' : `Reintentar ${n} documentos`;
  }
  return n === 1 ? 'Subir 1 documento' : `Subir ${n} documentos`;
});

const faltaNombre = (archivo) => !archivo.nombre.trim();
const faltaFecha = (archivo) => !archivo.fecha;
const editable = (archivo) => archivo.estado === 'pendiente' || archivo.estado === 'error';

const buildFormState = () => ({
  archivos: archivos.value.filter(editable).map((a) => [a.archivo.name, a.nombre, a.fecha]),
});

const { isDirty } = useDirtySnapshot(buildFormState, {
  markCleanOnMount: true,
});

const closeModal = () => {
  archivos.value = [];
  isDragOver.value = false;
  emit('closeDocumentoExternoModal');
};

const {
  showDiscardConfirm,
  dismissPulse,
  requestDismiss,
  forceClose,
  continueEditing,
  confirmDiscard,
} = useModalDirtyGuard({
  isDirty,
  onClose: closeModal,
  enabled: () => !isUploading.value,
});

async function reducir(entrada) {
  try {
    const reducido = await reducirImagen(entrada.archivo);
    if (!archivos.value.includes(entrada)) return;
    if (!reducido) {
      archivos.value = archivos.value.filter((a) => a !== entrada);
      toast.open({ message: `${entrada.archivo.name}: no se pudo reducir a menos de 1 MB`, type: 'error' });
      return;
    }
    entrada.reducidoDe = entrada.archivo.size;
    entrada.archivo = reducido;
    entrada.estado = 'pendiente';
  } catch (error) {
    console.error('No se pudo reducir la imagen:', error);
    archivos.value = archivos.value.filter((a) => a !== entrada);
    toast.open({ message: `${entrada.archivo.name}: no se pudo leer la imagen`, type: 'error' });
  }
}

/** Agrega los archivos válidos (los demás se descartan con su motivo) y reduce las fotos grandes. */
const processFiles = (lista) => {
  const nuevos = Array.from(lista ?? []);
  if (nuevos.length === 0) return;

  const rechazos = [];
  let sinLugar = 0;

  nuevos.forEach((archivo) => {
    const motivo = motivoDeRechazo(archivo);
    if (motivo) {
      rechazos.push(textoDeRechazo(archivo.name, motivo));
      return;
    }
    if (archivos.value.length >= MAXIMO_ARCHIVOS_POR_CARGA) {
      sinLugar += 1;
      return;
    }
    const grande = archivo.size > LIMITE_BYTES_DOCUMENTO_EXTERNO && esImagen(archivo.name);
    const entrada = {
      id: siguienteId++,
      archivo,
      nombre: nombreSugerido(archivo.name),
      fecha: hoy(),
      estado: grande ? 'reduciendo' : 'pendiente',
      motivo: '',
      reducidoDe: null,
    };
    archivos.value.push(entrada);
    if (grande) reducir(archivos.value[archivos.value.length - 1]);
  });

  if (rechazos.length) toast.open({ message: rechazos.join('. '), type: 'error' });
  if (sinLugar) {
    toast.open({
      message: `Se pueden subir hasta ${MAXIMO_ARCHIVOS_POR_CARGA} archivos a la vez; ${sinLugar === 1 ? 'quedó fuera 1' : `quedaron fuera ${sinLugar}`}.`,
      type: 'warning',
    });
  }
};

const handleFileSelect = (event) => {
  processFiles(event.target.files);
  event.target.value = '';
};

const handleDragEnter = (event) => {
  event.preventDefault();
  isDragOver.value = true;
};

const handleDragLeave = (event) => {
  event.preventDefault();
  if (!event.currentTarget.contains(event.relatedTarget)) isDragOver.value = false;
};

const handleDrop = (event) => {
  event.preventDefault();
  isDragOver.value = false;
  if (isUploading.value) return;
  processFiles(event.dataTransfer.files);
};

const removeFile = (entrada) => {
  archivos.value = archivos.value.filter((a) => a !== entrada);
};

const clearFiles = () => {
  archivos.value = archivos.value.filter((a) => !editable(a) && a.estado !== 'reduciendo');
};

const usarNombreRapido = (entrada, nombre) => {
  entrada.nombre = nombre;
};

async function enfocarPrimerFaltante() {
  await nextTick();
  document.querySelector('.carga-externo__archivo--incompleto input')?.focus();
}

const handleSubmit = async () => {
  if (isUploading.value || reduciendo.value || porSubir.value.length === 0) return;

  intentoDeSubida.value = true;
  if (porSubir.value.some((a) => faltaNombre(a) || faltaFecha(a))) {
    toast.open({ message: 'Escribe el nombre y la fecha de cada documento.', type: 'error' });
    enfocarPrimerFaltante();
    return;
  }

  const currentUserId = await ensureUserLoaded();
  if (!currentUserId) {
    toast.open({ message: 'No se pudo identificar al usuario. Por favor, inicie sesión nuevamente.', type: 'error' });
    return;
  }

  isUploading.value = true;
  let correctos = 0;
  let fallidos = 0;
  const pendientes = [...porSubir.value];

  for (const entrada of pendientes) {
    entrada.estado = 'subiendo';
    entrada.motivo = '';

    const formData = new FormData();
    const datos = {
      nombreDocumento: entrada.nombre.trim(),
      fechaDocumento: convertirYYYYMMDDaISO(entrada.fecha),
      notasDocumento: '',
      extension: extensionDe(entrada.archivo.name),
      rutaDocumento: buildClinicalDirectoryPath(
        currentEmpresa.nombreComercial,
        currentCentroTrabajo.nombreCentro,
        currentTrabajador.nombre,
        currentTrabajador._id,
      ),
      idTrabajador: currentTrabajador._id,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    };
    Object.entries(datos).forEach(([clave, valor]) => formData.append(clave, valor));
    formData.append('file', entrada.archivo);

    try {
      await documentos.uploadExternalDocument(currentTrabajador._id, formData);
      entrada.estado = 'subido';
      correctos += 1;
    } catch (error) {
      console.error(`Error al subir ${entrada.archivo.name}:`, error);
      entrada.estado = 'error';
      entrada.motivo = motivoDeError(error);
      fallidos += 1;
    }
  }

  isUploading.value = false;
  if (correctos > 0) emit('updateData');

  if (fallidos === 0) {
    toast.open({
      message: correctos === 1 ? 'Documento subido con éxito' : `${correctos} documentos subidos con éxito`,
      type: 'success',
    });
    forceClose();
    return;
  }

  toast.open({
    message:
      (correctos > 0 ? `${correctos} subido(s). ` : '') +
      (fallidos === 1 ? 'Uno no se pudo subir: revisa el motivo.' : `${fallidos} no se pudieron subir: revisa el motivo.`),
    type: correctos > 0 ? 'warning' : 'error',
  });
};
</script>

<template>
  <div class="modal modal-documento-externo modal-carga-documento-externo fixed top-0 left-0 z-10 p-4 sm:p-8 h-screen w-full grid place-items-center">
    <!-- Fondo oscuro transparente -->
    <div
      class="modal-work-overlay absolute top-0 left-0 w-full h-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm"
      :class="{ 'modal-backdrop-pulse': dismissPulse }"
      @click="requestDismiss"
    >
    </div>
    <!-- Modal centrado con desplazamiento interno -->
    <div
      class="modal-work-panel modal-inner relative bg-white text-gray-900 w-full max-w-2xl p-5 sm:p-6 rounded-xl shadow-md shadow-slate-900 max-h-[90vh] overflow-y-auto"
      :class="{ 'modal-dismiss-pulse': dismissPulse }"
    >
        <!-- Botón para cerrar el modal -->
        <button
          type="button"
          class="modal-close absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-600"
          title="Cerrar"
          aria-label="Cerrar"
          :disabled="isUploading"
          @click="requestDismiss">
          <i class="fa-solid fa-xmark text-base"></i>
        </button>

        <h1 class="modal-documento-externo__titulo pr-10 text-lg font-semibold text-gray-900">Subir documentos externos</h1>
        <hr class="mt-3 mb-4">

        <!-- Área de arrastrar y soltar -->
        <div
          class="modal-documento-externo-dropzone border-2 border-dashed rounded-lg text-center transition-all duration-200 cursor-pointer"
          :class="[
            isDragOver ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50',
            archivos.length ? 'px-4 py-4' : 'px-6 py-8',
          ]"
          role="button"
          tabindex="0"
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          @dragover.prevent
          @drop="handleDrop"
          @click="!isUploading && $refs.fileInput.click()"
          @keydown.enter.prevent="!isUploading && $refs.fileInput.click()"
          @keydown.space.prevent="!isUploading && $refs.fileInput.click()"
        >
          <input
            ref="fileInput"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            class="hidden"
            :disabled="isUploading"
            @change="handleFileSelect"
          />
          <i
            class="fa-solid fa-cloud-arrow-up text-3xl transition-colors duration-150"
            :class="isDragOver ? 'text-emerald-500' : 'text-gray-400'"
            aria-hidden="true"
          ></i>
          <p class="mt-2 font-medium text-gray-700" :class="{ 'text-emerald-700': isDragOver }">
            {{
              isDragOver
                ? 'Suelta los archivos aquí'
                : archivos.length
                  ? 'Agregar más archivos'
                  : puedeTomarFoto
                    ? 'Toca para elegir archivos'
                    : 'Arrastra archivos aquí o haz clic para elegirlos'
            }}
          </p>
          <p class="mt-1 text-xs text-gray-500">
            PDF, JPG o PNG · hasta 1 MB por archivo (las fotos más grandes se reducen solas) · hasta {{ MAXIMO_ARCHIVOS_POR_CARGA }} a la vez
          </p>
        </div>

        <!-- Cámara (celular y tableta) -->
        <div v-if="puedeTomarFoto" class="mt-3">
          <input
            ref="cameraInput"
            type="file"
            accept="image/*"
            capture="environment"
            class="hidden"
            :disabled="isUploading"
            @change="handleFileSelect"
          />
          <button
            type="button"
            class="carga-externo__camara w-full rounded-lg border border-emerald-600 py-2.5 font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50"
            :disabled="isUploading || archivos.length >= MAXIMO_ARCHIVOS_POR_CARGA"
            @click="$refs.cameraInput.click()"
          >
            <i class="fa-solid fa-camera mr-2" aria-hidden="true"></i>
            Tomar foto
          </button>
        </div>

        <!-- Archivos: nombre y fecha de cada uno -->
        <div v-if="archivos.length" class="mt-5">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-700">
              {{ archivos.length === 1 ? '1 archivo' : `${archivos.length} archivos` }}
              <span v-if="subidos" class="font-normal text-gray-500">· {{ subidos }} subido(s)</span>
            </h3>
            <button
              v-if="porSubir.length > 1"
              type="button"
              class="text-sm text-red-600 transition-colors hover:text-red-800 disabled:opacity-50"
              :disabled="isUploading"
              @click="clearFiles"
            >
              Quitar todos
            </button>
          </div>

          <TransitionGroup tag="ul" name="carga-externo-fila" class="space-y-2">
            <li
              v-for="entrada in archivos"
              :key="entrada.id"
              class="carga-externo__archivo modal-documento-externo-file-item rounded-lg border border-gray-200 bg-gray-50 p-3"
              :class="{
                'carga-externo__archivo--incompleto': intentoDeSubida && editable(entrada) && (faltaNombre(entrada) || faltaFecha(entrada)),
                'carga-externo__archivo--error': entrada.estado === 'error',
                'carga-externo__archivo--subido': entrada.estado === 'subido',
              }"
            >
              <!-- Archivo y estado -->
              <div class="flex items-center gap-2 text-xs text-gray-500">
                <i
                  :class="extensionDe(entrada.archivo.name) === '.pdf' ? 'fa-solid fa-file-pdf text-red-500' : 'fa-solid fa-image text-sky-500'"
                  aria-hidden="true"
                ></i>
                <span class="min-w-0 flex-1 truncate" :title="entrada.archivo.name">
                  {{ entrada.archivo.name }} · {{ tamanoLegible(entrada.archivo.size) }}
                  <span v-if="entrada.reducidoDe" class="text-emerald-700">(reducida de {{ tamanoLegible(entrada.reducidoDe) }})</span>
                </span>
                <span v-if="entrada.estado === 'reduciendo'" class="carga-externo__estado text-gray-500">
                  <i class="fa-solid fa-spinner fa-spin mr-1" aria-hidden="true"></i>Reduciendo foto…
                </span>
                <span v-else-if="entrada.estado === 'subiendo'" class="carga-externo__estado text-emerald-700">
                  <i class="fa-solid fa-spinner fa-spin mr-1" aria-hidden="true"></i>Subiendo…
                </span>
                <span v-else-if="entrada.estado === 'subido'" class="carga-externo__estado font-medium text-emerald-700">
                  <i class="fa-solid fa-circle-check mr-1" aria-hidden="true"></i>Subido
                </span>
                <button
                  v-if="editable(entrada) || entrada.estado === 'reduciendo'"
                  type="button"
                  class="carga-externo__quitar -my-1 rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-600 disabled:opacity-50"
                  :title="`Quitar ${entrada.archivo.name}`"
                  :aria-label="`Quitar ${entrada.archivo.name}`"
                  :disabled="isUploading"
                  @click="removeFile(entrada)"
                >
                  <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
              </div>

              <!-- Nombre y fecha del documento -->
              <div class="mt-2 grid gap-2 sm:grid-cols-[1fr_10.5rem]">
                <div>
                  <label :for="`nombre-${entrada.id}`" class="sr-only">Nombre del documento</label>
                  <input
                    :id="`nombre-${entrada.id}`"
                    v-model="entrada.nombre"
                    type="text"
                    maxlength="120"
                    placeholder="Nombre del documento"
                    class="carga-externo__campo w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    :class="intentoDeSubida && editable(entrada) && faltaNombre(entrada) ? 'border-red-400' : 'border-gray-300'"
                    :disabled="!editable(entrada) || isUploading"
                  />
                </div>
                <div>
                  <label :for="`fecha-${entrada.id}`" class="sr-only">Fecha del documento</label>
                  <input
                    :id="`fecha-${entrada.id}`"
                    v-model="entrada.fecha"
                    type="date"
                    :min="fechaDocumentoMin"
                    :max="fechaDocumentoMax"
                    class="carga-externo__campo w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    :class="intentoDeSubida && editable(entrada) && faltaFecha(entrada) ? 'border-red-400' : 'border-gray-300'"
                    :disabled="!editable(entrada) || isUploading"
                  />
                </div>
              </div>

              <!-- Nombres frecuentes -->
              <div v-if="editable(entrada)" class="mt-2 flex flex-wrap gap-1.5">
                <button
                  v-for="nombre in NOMBRES_RAPIDOS"
                  :key="nombre"
                  type="button"
                  class="carga-externo__rapido rounded-full border px-2.5 py-0.5 text-xs transition-colors disabled:opacity-50"
                  :class="entrada.nombre === nombre ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-300 text-gray-600 hover:border-emerald-400 hover:text-emerald-700'"
                  :disabled="isUploading"
                  @click="usarNombreRapido(entrada, nombre)"
                >
                  {{ nombre }}
                </button>
              </div>

              <p v-if="entrada.estado === 'error'" class="carga-externo__motivo mt-2 text-xs text-red-600">
                <i class="fa-solid fa-circle-exclamation mr-1" aria-hidden="true"></i>{{ entrada.motivo }}
              </p>
            </li>
          </TransitionGroup>
        </div>

        <!-- Botones de acción -->
        <div class="mt-6 flex gap-3">
          <button
            type="button"
            :disabled="porSubir.length === 0 || isUploading || reduciendo"
            class="flex flex-1 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            @click="handleSubmit"
          >
            <i v-if="isUploading || reduciendo" class="fa-solid fa-spinner fa-spin mr-2" aria-hidden="true"></i>
            <span v-if="isUploading">Subiendo…</span>
            <span v-else-if="reduciendo">Reduciendo fotos…</span>
            <span v-else-if="porSubir.length">{{ textoBoton }}</span>
            <span v-else>Subir documentos</span>
          </button>
          <button
            type="button"
            :disabled="isUploading"
            class="modal-documento-externo-btn-secondary flex-1 rounded-lg bg-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
            @click="requestDismiss"
          >
            {{ subidos ? 'Cerrar' : 'Cancelar' }}
          </button>
        </div>
      </div>

    <ModalDiscardConfirmDialog
      :open="showDiscardConfirm"
      @continue-editing="continueEditing"
      @discard="confirmDiscard"
    />
  </div>
</template>

<style scoped>
.carga-externo__archivo {
  transition: border-color 150ms ease-out, background-color 150ms ease-out;
}
.carga-externo__archivo--incompleto,
.carga-externo__archivo--error {
  border-color: #fca5a5;
  background-color: #fef2f2;
}
.carga-externo__archivo--subido {
  border-color: #a7f3d0;
  background-color: #ecfdf5;
}

.carga-externo-fila-enter-active,
.carga-externo-fila-leave-active {
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}
.carga-externo-fila-enter-from,
.carga-externo-fila-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
@media (prefers-reduced-motion: reduce) {
  .carga-externo-fila-enter-active,
  .carga-externo-fila-leave-active {
    transition: none;
  }
}
</style>
