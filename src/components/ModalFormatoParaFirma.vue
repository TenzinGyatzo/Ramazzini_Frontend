<script setup lang="ts">
/**
 * Formato que firma el trabajador (declaración de veracidad, consentimiento informado). Siempre
 * se puede descargar para firmarlo a puño y letra y subirlo después como Documento Externo; si el
 * proveedor activó la firma en pantalla, también se puede firmar aquí y queda guardado solo
 * (docs/firma-en-pantalla-especificacion.md, 4).
 */
import { ref, inject, computed, onMounted } from 'vue';
import { format } from 'date-fns';
import GreenButton from '@/components/GreenButton.vue';
import FirmaEnPantalla from '@/components/FirmaEnPantalla.vue';
import FormatosFirmadosAPI, { type FormatoFirmadoCreado } from '@/api/FormatosFirmadosAPI';
import type { TipoFormatoFirma } from '@/types/formatoFirma';
import { useEscapeToClose } from '@/composables/useEscapeToClose';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import {
  formatNombreTrabajadorFormato,
  type ProveedorSaludFormatoFirma,
  type TrabajadorFormatoFirma,
} from '@/helpers/formatoParaFirmaPdf';

const props = defineProps<{
  trabajador: (TrabajadorFormatoFirma & { _id?: string }) | null;
  /** Título del modal, p. ej. «Declaración de Veracidad». */
  titulo: string;
  /** Debajo del título; por defecto explica que se firma a mano y se sube como documento externo. */
  descripcion?: string;
  /** Con artículo, para los mensajes: «la declaración», «el consentimiento». */
  nombreFormato: string;
  etiquetaFecha: string;
  textoBoton: string;
  descargar: (params: {
    trabajador: TrabajadorFormatoFirma;
    fecha: string;
    proveedorSalud: ProveedorSaludFormatoFirma | null;
  }) => Promise<void>;
  /** Con él, y la firma en pantalla activada, aparece «Firmar en pantalla». */
  tipoFormato?: TipoFormatoFirma;
}>();

const emit = defineEmits<{
  closeModal: [];
  /** El PDF firmado en pantalla, ya guardado como Documento Externo. */
  firmado: [documentoExterno: any];
}>();

const toast: any = inject('toast');
const proveedorSaludStore = useProveedorSaludStore();

const fecha = ref(format(new Date(), 'yyyy-MM-dd'));
const descargando = ref(false);
const firmaEnPantallaHabilitada = ref(false);
const firmando = ref(false);

const puedeFirmarEnPantalla = computed(
  () => !!props.tipoFormato && firmaEnPantallaHabilitada.value && !!props.trabajador?._id,
);

const nombreTrabajador = computed(() => formatNombreCompleto(props.trabajador));
const nombreEnFormato = computed(() => formatNombreTrabajadorFormato(props.trabajador ?? {}));
const idFecha = `fecha-formato-${Math.random().toString(36).slice(2, 8)}`;

const closeModal = () => {
  if (descargando.value || firmando.value) return;
  emit('closeModal');
};

// Mientras se firma, Esc lo atiende la vista de firma
useEscapeToClose(closeModal, () => !descargando.value && !firmando.value);

onMounted(async () => {
  if (!props.tipoFormato) return;
  try {
    const { data } = await FormatosFirmadosAPI.getConfiguracion();
    firmaEnPantallaHabilitada.value = data.firmaEnPantallaHabilitada === true;
  } catch {
    // Sin la configuración queda solo la descarga, como siempre
    firmaEnPantallaHabilitada.value = false;
  }
});

/** Mismas revisiones que la descarga: fecha y nombre del trabajador. */
function datosCompletos(): boolean {
  if (!fecha.value) {
    toast?.open?.({ message: `Selecciona una fecha para generar ${props.nombreFormato}.`, type: 'error' });
    return false;
  }
  if (!nombreEnFormato.value.trim()) {
    toast?.open?.({ message: 'No se encontró el nombre del trabajador.', type: 'error' });
    return false;
  }
  return true;
}

const handleFirmarEnPantalla = () => {
  if (!datosCompletos()) return;
  firmando.value = true;
};

const alFirmar = (resultado: FormatoFirmadoCreado) => {
  firmando.value = false;
  emit('firmado', resultado.documentoExterno);
  emit('closeModal');
};

const handleDescargar = async () => {
  if (!datosCompletos()) return;

  descargando.value = true;

  try {
    const proveedor = proveedorSaludStore.proveedorSalud;

    await props.descargar({
      trabajador: props.trabajador ?? {},
      fecha: fecha.value,
      proveedorSalud: proveedor
        ? {
            direccion: proveedor.direccion,
            municipio: proveedor.municipio,
            estado: proveedor.estado,
            telefono: proveedor.telefono,
            sitioWeb: proveedor.sitioWeb,
            logotipoEmpresa: proveedor.logotipoEmpresa,
          }
        : null,
    });

    toast?.open?.({
      message: 'Inicia descarga correctamente.',
      type: 'success',
    });
    descargando.value = false;
    emit('closeModal');
  } catch (error) {
    console.error(`Error al generar ${props.nombreFormato}:`, error);
    toast?.open?.({
      message: `Error al generar ${props.nombreFormato}. Inténtalo de nuevo.`,
      type: 'error',
    });
  } finally {
    descargando.value = false;
  }
};
</script>

<template>
  <div class="modal fixed top-0 left-0 z-10 p-8 h-screen w-full grid place-items-center">
    <div
      class="modal-work-overlay absolute top-0 left-0 w-full h-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm"
      @click="closeModal"
    />
    <div
      class="modal-work-panel modal-inner relative bg-white text-gray-900 dark:bg-slate-800 dark:text-slate-100 w-full max-w-md p-8 rounded-lg shadow-md shadow-slate-900 dark:shadow-black/40 max-h-[90vh] overflow-y-auto"
    >
        <div
          class="modal-close absolute h-16 w-16 flex justify-center items-center top-0 right-0 text-5xl text-gray-400 hover:text-gray-500 dark:text-slate-400 dark:hover:text-slate-300 cursor-pointer"
          @click="closeModal"
        >
          &times;
        </div>

        <h1 class="text-2xl mb-2 pr-8 dark:text-slate-100">{{ titulo }}</h1>
        <p class="text-gray-600 dark:text-slate-300 mb-4">
          {{
            descripcion ??
            'Genera un formato imprimible para que el trabajador lo firme a puño y letra. Si necesitas conservarlo en el expediente, súbelo después como Documento Externo.'
          }}
        </p>
        <p v-if="puedeFirmarEnPantalla" class="modal-formato-firma__en-pantalla text-gray-600 dark:text-slate-300 mb-4">
          También puede firmarlo en pantalla (tableta, pantalla táctil, celular o mouse): queda guardado en el expediente sin imprimir ni escanear.
        </p>
        <hr class="mt-2 mb-6 border-gray-200 dark:border-slate-600">

        <div class="space-y-4">
          <div>
            <label :for="idFecha" class="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
              {{ etiquetaFecha }}
            </label>
            <input
              :id="idFecha"
              v-model="fecha"
              type="date"
              :disabled="descargando"
              class="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-60 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:focus:ring-emerald-400 dark:focus:border-emerald-400 dark:[color-scheme:dark]"
            />
          </div>

          <div class="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600 dark:bg-slate-900/60 dark:border-slate-600 dark:text-slate-300">
            <span class="font-semibold text-gray-700 dark:text-slate-200">Trabajador:</span>
            {{ nombreTrabajador || '—' }}
          </div>
        </div>

        <div class="mt-8 space-y-3">
          <div class="flex justify-center">
            <GreenButton
              :text="textoBoton"
              size="medium"
              :loading="descargando"
              :disabled="descargando"
              @click="handleDescargar"
            />
          </div>
          <button
            v-if="puedeFirmarEnPantalla"
            type="button"
            class="modal-formato-firma__boton-pantalla w-full inline-flex items-center justify-center gap-2 border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-60 dark:border-emerald-400 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
            :disabled="descargando"
            @click="handleFirmarEnPantalla"
          >
            <i class="fa-solid fa-signature" aria-hidden="true"></i>
            Firmar en pantalla
          </button>
          <button
            type="button"
            class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200"
            :disabled="descargando"
            @click="closeModal"
          >
            Cerrar
          </button>
        </div>
      </div>

    <FirmaEnPantalla
      v-if="firmando && tipoFormato && trabajador?._id"
      :tipo-formato="tipoFormato"
      :trabajador-id="trabajador._id"
      :trabajador="trabajador"
      :fecha="fecha"
      @cancelar="firmando = false"
      @firmado="alFirmar"
    />
  </div>
</template>
