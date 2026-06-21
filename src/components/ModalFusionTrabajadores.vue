<script setup lang="ts">

import { computed, inject, onMounted, ref } from 'vue';

import TrabajadoresAPI from '@/api/TrabajadoresAPI';

import { useEmpresasStore } from '@/stores/empresas';

import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';

import { useTrabajadoresStore } from '@/stores/trabajadores';

import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';

import { extractApiErrorMessage } from '@/helpers/apiErrors';

import FusionRegistroResumen from '@/components/FusionRegistroResumen.vue';
import FusionWorkerIdentidad from '@/components/FusionWorkerIdentidad.vue';
import type {
  DuplicateWorkerSummary,
  FusionPreview,

  FusionResultadoClinicoSummary,

  FusionRiesgoTrabajoSummary,

  PosibleDuplicado,

} from '@/interfaces/trabajador.interface';



const props = defineProps<{

  trabajadorAId: string;

  trabajadorBId: string;

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



const loading = ref(true);

const submitting = ref(false);

const preview = ref<FusionPreview | null>(null);

const destinoId = ref('');

const fuenteId = ref('');

const numeroEmpleadoResuelto = ref('');

const confirmacion = ref(false);



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
  if (!empresaId || !centroId) return;

  const seq = ++previewSeq;

  loading.value = true;

  try {

    const { data } = await TrabajadoresAPI.getFusionPreview(

      empresaId,

      centroId,

      destinoId.value,

      fuenteId.value,

    );

    if (seq !== previewSeq) return;

    preview.value = data;

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

    emit('close');

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

    await trabajadores.fetchTrabajadoresConHistoria(

      empresaId,

      centroId,

    );

    emit('fused');

    emit('close');

  } catch (error) {

    toast?.open({

      message: extractApiErrorMessage(error, 'Error al fusionar trabajadores'),

      type: 'error',

    });

  } finally {

    submitting.value = false;

  }

}



onMounted(() => {

  if (props.posibleDuplicado) {

    destinoId.value = props.posibleDuplicado.trabajadorId;

    fuenteId.value = props.trabajadorAId === destinoId.value ? props.trabajadorBId : props.trabajadorAId;

  } else {

    destinoId.value = props.trabajadorAId;

    fuenteId.value = props.trabajadorBId;

  }

  loadPreview();

});

</script>



<template>

  <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">

    <div class="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">

      <div class="p-6 border-b">

        <h2 class="text-xl font-semibold text-gray-900">Fusionar trabajadores</h2>

        <p class="text-sm text-gray-600 mt-1">

          Se consolidará el expediente clínico bajo un solo registro. El registro fuente será eliminado.

        </p>

      </div>



      <div v-if="loading" class="p-8 text-center text-gray-500">Cargando vista previa…</div>



      <div v-else-if="preview" class="p-6 space-y-6">

        <p class="text-xs text-gray-500">
          Elige el registro que se <strong>conserva</strong> (destino). El otro se elimina y todo su contenido se migra al destino.
        </p>

        <div class="grid lg:grid-cols-2 gap-4">

          <div
            v-for="registro in [preview.destino, preview.fuente]"
            :key="registro._id"
            class="border rounded-xl p-4 flex flex-col bg-gradient-to-br from-white to-gray-50 transition-all duration-300"
            :class="esConservado(registro._id) ? 'border-emerald-400' : 'border-red-200'"
          >

            <div class="flex justify-between items-start mb-3 gap-2">

              <span

                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"

                :class="esConservado(registro._id) ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'"

              >

                {{ esConservado(registro._id) ? 'Se conserva (destino)' : 'Se elimina (fuente)' }}

              </span>

              <button

                v-if="!esConservado(registro._id)"

                type="button"

                class="text-xs text-emerald-700 underline whitespace-nowrap"

                @click="conservarRegistro(registro._id)"

              >

                Conservar este

              </button>

            </div>



            <FusionWorkerIdentidad
              :registro="registro"
              :opuesto="registroOpuesto(registro)"
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



        <div class="bg-sky-50 border border-sky-200 rounded-lg p-4 text-sm text-sky-950 space-y-2">

          <p class="font-medium flex items-center gap-2">

            <i class="fas fa-map-marker-alt text-sky-600"></i>

            Ubicación del expediente unificado

          </p>

          <p>

            Tras la fusión, el trabajador quedará asociado al centro de trabajo del registro que conserves como destino:

            <strong>{{ centroDestinoFinal }}</strong>

          </p>

          <p v-if="centrosDistintos" class="text-sky-900 leading-relaxed">

            Los registros seleccionados pertenecen a centros de trabajo diferentes. 
            
            La fusión unifica el expediente clínico y elimina los registros duplicados, 
            
            pero <strong>no cambia automáticamente la asignación del trabajador a otro centro</strong>.

            Si posteriormente necesitas asignarlo a un centro distinto, 
            podrás hacerlo desde el listado de trabajadores mediante la opción <strong>Transferir</strong> en el trabajador fusionado.

          </p>

          <p v-else class="text-sky-800">

            Ambos registros ya pertenecen al mismo centro de trabajo, por lo que la ubicación del trabajador no se verá afectada.

          </p>

        </div>



        <!-- Resumen de migración (registro que se elimina) -->

        <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-950 space-y-3">

          <p class="font-medium flex items-center gap-2">

            <i class="fas fa-exchange-alt text-amber-700"></i>

            Contenido que se migrará al registro destino

          </p>

          <p>

            Del registro de <strong>{{ nombreRegistroFuente }}</strong> se transferirán

            <strong>{{ totalRegistrosFuente }}</strong> registro(s) en total al trabajador que conserves.

            Criterio de coincidencia: {{ preview.criterioMatch || 'confirmación manual' }}.

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

          <p class="text-sm font-medium text-gray-800">Conflicto de número de empleado — seleccione cuál conservar:</p>

          <label class="flex items-center gap-2 text-sm">

            <input v-model="numeroEmpleadoResuelto" type="radio" :value="preview.destino.numeroEmpleado" />

            {{ preview.destino.numeroEmpleado }} (destino actual)

          </label>

          <label class="flex items-center gap-2 text-sm">

            <input v-model="numeroEmpleadoResuelto" type="radio" :value="preview.fuente.numeroEmpleado" />

            {{ preview.fuente.numeroEmpleado }} (fuente)

          </label>

        </div>



        <label class="flex items-start gap-2 text-sm text-gray-700">

          <input v-model="confirmacion" type="checkbox" class="mt-1" />

          Confirmo que ambos registros corresponden a la misma persona y deseo fusionar el expediente.

        </label>

      </div>



      <div class="p-6 border-t flex justify-end gap-3">

        <button

          type="button"

          class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"

          :disabled="submitting"

          @click="emit('close')"

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

  </div>

</template>


