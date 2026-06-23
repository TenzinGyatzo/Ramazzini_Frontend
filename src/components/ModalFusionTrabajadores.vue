<script setup lang="ts">

import { computed, inject, onMounted, ref } from 'vue';

import TrabajadoresAPI from '@/api/TrabajadoresAPI';

import { useEmpresasStore } from '@/stores/empresas';

import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';

import { useTrabajadoresStore } from '@/stores/trabajadores';

import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';

import { extractApiErrorMessage } from '@/helpers/apiErrors';

import { getIdentificadorPersonalLabel } from '@/helpers/proveedorPais';

import { useProveedorSaludStore } from '@/stores/proveedorSalud';

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

  PosibleDuplicado,

} from '@/interfaces/trabajador.interface';



const props = defineProps<{

  trabajadorAId: string;

  trabajadorBId?: string;

  posibleDuplicado?: PosibleDuplicado | null;

}>();



const emit = defineEmits<{

  close: [];

  fused: [];

}>();



const toast: any = inject('toast');

const empresas = useEmpresasStore();

const centrosTrabajo = useCentrosTrabajoStore();

const trabajadores = useTrabajadoresStore();

const proveedorSaludStore = useProveedorSaludStore();

const identificadorPersonalLabel = computed(() =>
  getIdentificadorPersonalLabel(proveedorSaludStore.proveedorSalud?.pais),
);

const criterioCoincidenciaLabel = computed(() => {
  const criterio = preview.value?.criterioMatch;
  if (!criterio) return 'confirmación manual';
  if (criterio === 'FOLIO') return 'mismo folio UM';
  return `misma ${identificadorPersonalLabel.value}`;
});

const loading = ref(true);

const submitting = ref(false);

const preview = ref<FusionPreview | null>(null);

const destinoId = ref('');

const fuenteId = ref('');

const numeroEmpleadoResuelto = ref('');

const confirmacion = ref(false);

const closeModal = () => {
  emit('close');
};

const isFusionDirty = computed(() => confirmacion.value);

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
  enabled: () => !submitting.value,
});

let previewSeq = 0;



function conteosDeRegistro(id: string): Record<string, number> {

  if (!preview.value) return {};

  return id === preview.value.destino._id

    ? preview.value.conteosDestino

    : preview.value.conteosFuente;

}



function resultadosDeRegistro(id: string): FusionResultadoClinicoSummary[] {

  if (!preview.value) return [];

  return id === preview.value.destino._id

    ? (preview.value.resultadosClinicosDestino ?? [])

    : (preview.value.resultadosClinicosFuente ?? []);

}



function riesgosDeRegistro(id: string): FusionRiesgoTrabajoSummary[] {

  if (!preview.value) return [];

  return id === preview.value.destino._id

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



const idRegistroFuente = computed(() => {

  if (!preview.value) return '';

  return destinoId.value === preview.value.destino._id

    ? preview.value.fuente._id

    : preview.value.destino._id;

});



const nombreRegistroFuente = computed(() => {

  if (!preview.value) return '';

  const reg =

    destinoId.value === preview.value.destino._id

      ? preview.value.fuente

      : preview.value.destino;

  return formatNombreCompleto(reg);

});



const totalRegistrosFuente = computed(() => {

  if (!preview.value || !idRegistroFuente.value) return 0;

  return Object.values(conteosDeRegistro(idRegistroFuente.value)).reduce(

    (a, b) => a + b,

    0,

  );

});



const conflictoNumero = computed(() => preview.value?.conflictos.numeroEmpleado ?? false);



const centrosDistintos = computed(() => {
  if (!preview.value) return false;
  return preview.value.destino.idCentroTrabajo !== preview.value.fuente.idCentroTrabajo;
});

function registroOpuesto(registro: DuplicateWorkerSummary): DuplicateWorkerSummary {
  if (!preview.value) return registro;
  return registro._id === preview.value.destino._id
    ? preview.value.fuente
    : preview.value.destino;
}



const centroDestinoFinal = computed(() => {

  if (!preview.value) return 'Centro de trabajo del registro conservado';

  const conservado =

    preview.value.destino._id === destinoId.value

      ? preview.value.destino

      : preview.value.fuente;

  return conservado.nombreCentroTrabajo?.trim() || 'Centro de trabajo del registro conservado';
});

function esConservado(id: string): boolean {
  return id === destinoId.value;
}



async function loadPreview() {
  const empresaId = empresas.currentEmpresaId;
  const centroId = centrosTrabajo.currentCentroTrabajoId;
  if (!empresaId || !centroId || !destinoId.value || !fuenteId.value) return;

  const seq = ++previewSeq;
  loading.value = true;

  const cached = getCachedFusionPreview(destinoId.value, fuenteId.value);
  if (cached) {
    if (seq !== previewSeq) return;
    preview.value = cached;
    if (
      cached.destinoRecomendadoId &&
      cached.destinoRecomendadoId !== destinoId.value
    ) {
      const oldDestino = destinoId.value;
      destinoId.value = cached.destinoRecomendadoId;
      fuenteId.value = oldDestino;
    }
    loading.value = false;
    return;
  }

  try {
    const { data } = await TrabajadoresAPI.getFusionPreview(
      empresaId,
      centroId,
      destinoId.value,
      fuenteId.value,
    );

    if (seq !== previewSeq) return;

    preview.value = data;
    setCachedFusionPreview(destinoId.value, fuenteId.value, data);

    if (data.destinoRecomendadoId && data.destinoRecomendadoId !== destinoId.value) {
      const oldDestino = destinoId.value;
      destinoId.value = data.destinoRecomendadoId;
      fuenteId.value = oldDestino;
    }
  } catch (error) {
    if (seq !== previewSeq) return;

    toast?.open({
      message: extractApiErrorMessage(error, 'No se pudo cargar la vista previa de fusión'),
      type: 'error',
    });

    forceClose();
  } finally {
    if (seq === previewSeq) loading.value = false;
  }
}



function conservarRegistro(id: string) {

  if (id === destinoId.value) return;

  fuenteId.value = destinoId.value;

  destinoId.value = id;

}



async function confirmarFusion() {

  if (!confirmacion.value) {

    toast?.open({ message: 'Debe confirmar la fusión', type: 'warning' });

    return;

  }

  if (conflictoNumero.value && !numeroEmpleadoResuelto.value) {

    toast?.open({ message: 'Seleccione qué número de empleado conservar', type: 'warning' });

    return;

  }



  const empresaId = empresas.currentEmpresaId;
  const centroId = centrosTrabajo.currentCentroTrabajoId;
  if (!empresaId || !centroId) {
    toast?.open({ message: 'Empresa o centro de trabajo no disponible', type: 'error' });
    return;
  }

  submitting.value = true;

  try {

    await TrabajadoresAPI.fusionarTrabajadores(

      empresaId,

      centroId,

      {

        trabajadorDestinoId: destinoId.value,

        trabajadorFuenteId: fuenteId.value,

        confirmacion: true,

        numeroEmpleadoResuelto: numeroEmpleadoResuelto.value || undefined,

      },

    );

    toast?.open({ message: 'Trabajadores fusionados correctamente', type: 'success' });

    invalidateFusionPreviewCache(destinoId.value, fuenteId.value);

    await trabajadores.fetchTrabajadoresConHistoria(

      empresaId,

      centroId,

    );

    emit('fused');

    forceClose();

  } catch (error) {

    toast?.open({

      message: extractApiErrorMessage(error, 'Error al fusionar trabajadores'),

      type: 'error',

    });

  } finally {

    submitting.value = false;

  }

}



onMounted(async () => {
  loading.value = true;

  let trabajadorBId = props.trabajadorBId;

  if (!trabajadorBId) {
    const empresaId = empresas.currentEmpresaId;
    const centroId = centrosTrabajo.currentCentroTrabajoId;
    if (!empresaId || !centroId) {
      forceClose();
      return;
    }

    try {
      const { data } = await TrabajadoresAPI.getDuplicadosDeTrabajador(
        empresaId,
        centroId,
        props.trabajadorAId,
      );
      const candidatos = Array.isArray(data) ? data : [];
      if (!candidatos.length) {
        toast?.open({
          message: 'No hay candidatos de duplicado para este trabajador',
          type: 'warning',
        });
        forceClose();
        return;
      }
      trabajadorBId = String(candidatos[0].trabajadorId ?? '');
      if (!trabajadorBId) {
        forceClose();
        return;
      }
    } catch (error) {
      toast?.open({
        message: extractApiErrorMessage(error, 'No se pudieron cargar los duplicados'),
        type: 'error',
      });
      forceClose();
      return;
    }
  }

  if (props.posibleDuplicado) {
    destinoId.value = props.posibleDuplicado.trabajadorId;
    fuenteId.value = props.trabajadorAId === destinoId.value ? trabajadorBId : props.trabajadorAId;
  } else {
    destinoId.value = props.trabajadorAId;
    fuenteId.value = trabajadorBId;
  }

  await loadPreview();
});

</script>



<template>
  <div class="modal modal-fusion-trabajadores fixed inset-0 z-[60] p-4 grid place-items-center">
    <div
      class="modal-work-overlay absolute inset-0 bg-emerald-900/50 backdrop-blur-sm"
      :class="{ 'modal-backdrop-pulse': dismissPulse }"
      aria-hidden="true"
      @click="requestDismiss"
    />
    <div
      class="modal-work-panel relative bg-white dark:bg-slate-800 dark:text-slate-100 rounded-xl shadow-xl dark:shadow-black/40 max-w-5xl w-full max-h-[90vh] overflow-y-auto"
      :class="{ 'modal-dismiss-pulse': dismissPulse }"
    >

      <div class="p-6 border-b border-gray-200 dark:border-slate-600">

        <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-100">Fusionar trabajadores</h2>

        <p class="text-sm text-gray-600 dark:text-slate-300 mt-1">

          Se consolidará el expediente clínico bajo un solo registro. El registro fuente será eliminado.

        </p>

      </div>



      <div v-if="loading" class="p-8 text-center text-gray-500 dark:text-slate-400">Cargando vista previa…</div>



      <div v-else-if="preview" class="p-6 space-y-6">

        <p class="text-xs text-gray-500 dark:text-slate-400">
          Elige el registro que se <strong class="text-gray-700 dark:text-slate-200">conserva</strong> (destino). El otro se elimina y todo su contenido se migra al destino.
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

                {{ esConservado(registro._id) ? 'Se conserva (destino)' : 'Se elimina (fuente)' }}

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

            Tras la fusión, el trabajador quedará asociado al centro de trabajo del registro que conserves como destino:

            <strong class="text-sky-950 dark:text-sky-50">{{ centroDestinoFinal }}</strong>

          </p>

          <p v-if="centrosDistintos" class="text-sky-900 dark:text-sky-200 leading-relaxed">

            Los registros seleccionados pertenecen a centros de trabajo diferentes. 
            
            La fusión unifica el expediente clínico y elimina los registros duplicados, 
            
            pero <strong>no cambia automáticamente la asignación del trabajador a otro centro</strong>.

            Si posteriormente necesitas asignarlo a un centro distinto, 
            podrás hacerlo desde el listado de trabajadores mediante la opción <strong>Transferir</strong> en el trabajador fusionado.

          </p>

          <p v-else class="text-sky-800 dark:text-sky-200">

            Ambos registros ya pertenecen al mismo centro de trabajo, por lo que la ubicación del trabajador no se verá afectada.

          </p>

        </div>



        <!-- Resumen de migración (registro que se elimina) -->

        <div class="bg-amber-50 border border-amber-200 dark:bg-amber-950/35 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-950 dark:text-amber-100 space-y-3">

          <p class="font-medium flex items-center gap-2">

            <i class="fas fa-exchange-alt text-amber-700 dark:text-amber-400"></i>

            Contenido que se migrará al registro destino

          </p>

          <p>

            Del registro de <strong>{{ nombreRegistroFuente }}</strong> se transferirán

            <strong>{{ totalRegistrosFuente }}</strong> registro(s) en total al trabajador que conserves.

            Criterio de coincidencia: {{ criterioCoincidenciaLabel }}.

          </p>

          <FusionRegistroResumen
            v-if="idRegistroFuente"
            two-columns
            :conteos="conteosDeRegistro(idRegistroFuente)"
            :resultados-clinicos="resultadosDeRegistro(idRegistroFuente)"
            :riesgos-trabajo="riesgosDeRegistro(idRegistroFuente)"
            :mostrar-riesgos-trabajo="algunoTieneRiesgosTrabajo"
          />

        </div>



        <div v-if="conflictoNumero" class="space-y-2">

          <p class="text-sm font-medium text-gray-800 dark:text-slate-200">Conflicto de número de empleado — seleccione cuál conservar:</p>

          <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">

            <input v-model="numeroEmpleadoResuelto" type="radio" class="accent-emerald-600 dark:accent-emerald-400" :value="preview.destino.numeroEmpleado" />

            {{ preview.destino.numeroEmpleado }} (destino actual)

          </label>

          <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">

            <input v-model="numeroEmpleadoResuelto" type="radio" class="accent-emerald-600 dark:accent-emerald-400" :value="preview.fuente.numeroEmpleado" />

            {{ preview.fuente.numeroEmpleado }} (fuente)

          </label>

        </div>



        <label class="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">

          <input v-model="confirmacion" type="checkbox" class="mt-1 accent-emerald-600 dark:accent-emerald-400" />

          Confirmo que ambos registros corresponden a la misma persona y deseo fusionar el expediente.

        </label>

      </div>



      <div class="p-6 border-t border-gray-200 dark:border-slate-600 flex justify-end gap-3">

        <button

          type="button"

          class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"

          :disabled="submitting"

          @click="requestDismiss"

        >

          Cancelar

        </button>

        <button

          type="button"

          class="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"

          :disabled="submitting || loading"

          @click="confirmarFusion"

        >

          {{ submitting ? 'Fusionando…' : 'Fusionar' }}

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


