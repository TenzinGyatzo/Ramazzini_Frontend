<template>
  <div class="resultados-clinicos-subsection space-y-4">
    <div class="flex flex-col gap-1">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-semibold text-gray-800">Resultados clínicos ({{ results.length }})</p>
          <p class="text-xs text-gray-500">
            Resultados registrados que complementan el expediente. Pueden vincularse a documentos externos.
          </p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
      <div
        v-for="resultado in sortedResults"
        :key="resultado._id"
        class="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
      >
        <div class="flex flex-col gap-2 sm:gap-3">
          <div
            class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 cursor-pointer"
            @click="emitEdit(resultado)"
          >
            <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div
                class="hidden sm:flex w-10 h-10 rounded-full items-center justify-center shadow-sm"
                :style="{ backgroundColor: getIconBackground(resultado.tipoEstudio) }"
              >
                <i
                  :class="getTipoIcon(resultado.tipoEstudio)"
                  class="text-lg"
                  :style="{ color: getIconColor(resultado.tipoEstudio) }"
                ></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs sm:text-sm font-semibold text-gray-800 truncate flex items-center gap-1.5">
                  {{ store.getTipoLabel(resultado.tipoEstudio) }}
                  <i
                    v-if="resultado.idDocumentoExterno"
                    class="fas fa-paperclip text-emerald-600 text-[10px] sm:text-xs"
                    :title="resultado.documentoExterno ? `Documento: ${resultado.documentoExterno.nombreDocumento}` : 'Documento vinculado'"
                  ></i>
                </p>
                <div class="flex flex-wrap items-center gap-2 mt-0.5">
                  <span class="text-[10px] sm:text-xs text-gray-500">{{ formatDate(resultado.fechaEstudio) }}</span>
                  <div class="flex items-center">
                    <span
                      v-if="resultado.tipoEstudio !== 'TIPO_SANGRE' && resultado.resultadoGlobal === 'NORMAL'"
                      :class="['px-1.5 py-0.5 rounded-full font-semibold text-[10px] sm:text-xs', getResultadoBadgeClasses(resultado.resultadoGlobal)]"
                    >
                      {{ store.getResultadoLabel(resultado.resultadoGlobal) }}
                    </span>
                    <span
                      v-else-if="resultado.tipoEstudio === 'TIPO_SANGRE' && resultado.tipoSangre"
                      class="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold text-[10px] sm:text-xs"
                    >
                      {{ getTipoSangreLabel(resultado.tipoSangre) }}
                    </span>
                    <span
                      v-if="resultado.resultadoGlobal === 'ANORMAL' && getAlteracionLabel(resultado)"
                      class="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold text-[10px] sm:text-xs"
                    >
                      {{ store.getResultadoLabel(resultado.resultadoGlobal) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-around gap-5 w-full sm:w-auto pt-2 border-t sm:border-t-0 border-gray-200">
              <button
                v-if="hasDetails(resultado)"
                type="button"
                @click.stop="toggleDetails(resultado._id)"
                class="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1 hover:text-emerald-600 transition-colors"
              >
                <i
                  class="fas fa-chevron-down transition-transform text-sm"
                  :class="isExpanded(resultado._id) ? 'rotate-180' : ''"
                ></i>
                <span>Detalles</span>
              </button>
              <button
                type="button"
                @click.stop="openDeleteModal(resultado)"
                class="text-red-500 hover:text-red-600 transition-colors sm:pr-1"
                aria-label="Eliminar resultado"
              >
                <i class="fas fa-trash-alt text-xs sm:text-base"></i>
              </button>
            </div>
          </div>

          <transition name="fade">
            <div
              v-if="isExpanded(resultado._id) && hasDetails(resultado)"
              class="mt-1 sm:mt-3 rounded-xl border border-gray-100 bg-gray-50 p-2 sm:p-3 text-[11px] sm:text-sm text-gray-600 space-y-1"
            >
              <p v-if="getAlteracionLabel(resultado)">
                <span class="font-semibold text-gray-800">Tipo de Alteración:</span> {{ getAlteracionLabel(resultado) }}
              </p>
              <p v-if="resultado.hallazgoEspecifico?.trim()">
                <span class="font-semibold text-gray-800">{{ etiquetaHallazgoLibre(resultado) }}:</span>
                {{ resultado.hallazgoEspecifico }}
              </p>
              <p v-if="resultado.relevanciaClinica">
                <span class="font-semibold text-gray-800">Relevancia Clínica:</span> {{ getRelevanciaLabel(resultado.relevanciaClinica) }}
              </p>
              <p v-if="resultado.recomendacion">
                <span class="font-semibold text-gray-800">Recomendación:</span> {{ resultado.recomendacion }}
              </p>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
  <ConfirmacionEliminar
    :is-open="isDeleteModalOpen"
    title="Eliminar resultado clínico"
    :message="deleteMessage"
    :fecha="modalFecha"
    :resultado="modalResultado"
    :tipo-sangre="modalTipoSangre"
    :tipo-estudio-label="modalTipoEstudio"
    @close="closeDeleteModal"
    @confirm="confirmDelete"
  />
</template>

<script setup lang="ts">
import { computed, ref, inject } from 'vue';
import { convertirFechaISOaDDMMYYYY } from '@/helpers/dates';
import {
  useResultadosClinicosStore,
  type ResultadoClinico,
} from '@/stores/resultadosClinicos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import ConfirmacionEliminar from '@/components/ConfirmacionEliminar.vue';
import { useHtmlDarkMode } from '@/composables/useHtmlDarkMode';

const toast: any = inject('toast');
const isHtmlDark = useHtmlDarkMode();

const props = defineProps<{
  results: ResultadoClinico[];
}>();

const emit = defineEmits<{
  (e: 'edit', resultado: ResultadoClinico): void;
}>();

const store = useResultadosClinicosStore();
const trabajadores = useTrabajadoresStore();
const expandedId = ref<string | null>(null);
const isDeleteModalOpen = ref(false);
const resultadoParaEliminar = ref<ResultadoClinico | null>(null);

const sortedResults = computed(() =>
  [...props.results].sort((a, b) => {
    const timeA = new Date(a.fechaEstudio).getTime();
    const timeB = new Date(b.fechaEstudio).getTime();
    return timeB - timeA;
  })
);

const formatDate = (date: string | Date) => {
  if (!date) return '';
  const raw = date instanceof Date ? date.toISOString() : date;
  return convertirFechaISOaDDMMYYYY(raw);
};

const toggleDetails = (id: string | undefined) => {
  if (!id) return;
  expandedId.value = expandedId.value === id ? null : id;
};

const isExpanded = (id: string | undefined) => {
  if (!id) return false;
  return expandedId.value === id;
};

const emitEdit = (resultado: ResultadoClinico) => {
  emit('edit', resultado);
};

const openDeleteModal = (resultado: ResultadoClinico) => {
  resultadoParaEliminar.value = resultado;
  isDeleteModalOpen.value = true;
};

const closeDeleteModal = () => {
  isDeleteModalOpen.value = false;
  resultadoParaEliminar.value = null;
};

const confirmDelete = async () => {
  if (!resultadoParaEliminar.value?._id) return;
  try {
    await store.deleteResultado(resultadoParaEliminar.value._id);
    if (trabajadores.currentTrabajadorId) {
      await store.fetchResultadosAgrupados(trabajadores.currentTrabajadorId);
    }
    toast.open({
      message: 'Resultado eliminado correctamente',
      type: 'success',
    });
  } catch (error) {
    toast.open({
      message: 'Error al eliminar el resultado',
      type: 'error',
    });
  } finally {
    closeDeleteModal();
  }
};

const getTipoIcon = (tipo?: string) => {
  if (tipo === 'ESPIROMETRIA') return 'fas fa-lungs';
  if (tipo === 'EKG') return 'fas fa-heartbeat';
  if (tipo === 'TIPO_SANGRE') return 'fas fa-tint';
  if (tipo === 'RAYOS_X') return 'fas fa-x-ray';
  if (tipo === 'ANALISIS_LABORATORIO') return 'fas fa-vial';
  return 'fas fa-notes-medical';
};

const getIconColor = (tipo?: string) => {
  const dark = isHtmlDark.value;
  if (tipo === 'ESPIROMETRIA') return dark ? '#93c5fd' : '#1d4ed8';
  if (tipo === 'EKG') return dark ? '#fca5a5' : '#dc2626';
  if (tipo === 'TIPO_SANGRE') return dark ? '#fecaca' : '#991b1b';
  if (tipo === 'RAYOS_X') return dark ? '#5eead4' : '#0f766e';
  if (tipo === 'ANALISIS_LABORATORIO') return dark ? '#ddd6fe' : '#7c3aed';
  return dark ? '#cbd5e1' : '#475569';
};

const getIconBackground = (tipo?: string) => {
  const dark = isHtmlDark.value;
  if (tipo === 'ESPIROMETRIA') return dark ? 'rgba(37,99,235,0.48)' : 'rgba(30,64,175,0.12)';
  if (tipo === 'EKG') return dark ? 'rgba(220,38,38,0.45)' : 'rgba(220,38,38,0.12)';
  if (tipo === 'TIPO_SANGRE') return dark ? 'rgba(185,28,28,0.5)' : 'rgba(153,27,27,0.12)';
  if (tipo === 'RAYOS_X') return dark ? 'rgba(13,148,136,0.5)' : 'rgba(15,118,110,0.12)';
  if (tipo === 'ANALISIS_LABORATORIO') return dark ? 'rgba(139,92,246,0.48)' : 'rgba(124,58,237,0.12)';
  return dark ? 'rgba(148,163,184,0.35)' : 'rgba(71,85,105,0.08)';
};

const getAlteracionLabel = (resultado: ResultadoClinico) => {
  if (resultado.tipoEstudio === 'ESPIROMETRIA' && resultado.tipoAlteracionEspirometria) {
    const option = store.tipoAlteracionEspirometriaOptions.find(
      (opt) => opt.value === resultado.tipoAlteracionEspirometria
    );
    return option?.label || resultado.tipoAlteracionEspirometria;
  }

  if (resultado.tipoEstudio === 'EKG' && resultado.tipoAlteracionEKG) {
    const option = store.tipoAlteracionEKGOptions.find(
      (opt) => opt.value === resultado.tipoAlteracionEKG
    );
    return option?.label || resultado.tipoAlteracionEKG;
  }

  if (
    resultado.tipoEstudio === 'RAYOS_X' &&
    resultado.tipoAlteracionRayosX &&
    resultado.tipoAlteracionRayosX.length > 0
  ) {
    return resultado.tipoAlteracionRayosX
      .map(
        (v) =>
          store.tipoAlteracionRayosXOptions.find((o) => o.value === v)?.label || v
      )
      .join(', ');
  }

  if (
    resultado.tipoEstudio === 'ANALISIS_LABORATORIO' &&
    resultado.tipoAlteracionAnalisisLaboratorio &&
    resultado.tipoAlteracionAnalisisLaboratorio.length > 0
  ) {
    return resultado.tipoAlteracionAnalisisLaboratorio
      .map(
        (v) =>
          store.tipoAlteracionAnalisisLaboratorioOptions.find((o) => o.value === v)
            ?.label || v
      )
      .join(', ');
  }

  return '';
};

const TIPOS_ESPECIFICAR_NORMAL = [
  'ESPIROMETRIA',
  'EKG',
  'RAYOS_X',
  'ANALISIS_LABORATORIO',
] as const;

const etiquetaHallazgoLibre = (resultado: ResultadoClinico) => {
  if (
    resultado.resultadoGlobal === 'NORMAL' &&
    TIPOS_ESPECIFICAR_NORMAL.includes(
      resultado.tipoEstudio as (typeof TIPOS_ESPECIFICAR_NORMAL)[number],
    )
  ) {
    return 'Especificar';
  }
  return 'Hallazgo Específico';
};

const hasDetails = (resultado: ResultadoClinico) => {
  return !!(
    getAlteracionLabel(resultado) ||
    (resultado.hallazgoEspecifico && resultado.hallazgoEspecifico.trim()) ||
    resultado.relevanciaClinica ||
    resultado.recomendacion
  );
};

const getTipoSangreLabel = (tipo?: string) => {
  const option = store.tipoSangreOptions.find((opt) => opt.value === tipo);
  return option?.label || tipo || '';
};

const getRelevanciaLabel = (relevancia?: string) => {
  const option = store.relevanciaClinicaOptions.find(
    (opt) => opt.value === relevancia
  );
  return option?.label || relevancia || '';
};

const getResultadoBadgeClasses = (resultado?: string) => {
  if (resultado === 'NORMAL') return 'bg-emerald-100 text-emerald-700';
  if (resultado === 'ANORMAL') return 'bg-red-100 text-red-700';
  if (resultado === 'NO_CONCLUYENTE') return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-600';
};

const getResultadoLabel = (resultado?: string) => {
  const option = store.resultadoGlobalOptions.find(opt => opt.value === resultado);
  return option?.label || resultado || '';
};

const getTipoLabel = (tipo?: string) => {
  const option = store.tipoEstudioOptions.find(opt => opt.value === tipo);
  return option?.label || tipo || '';
};

const deleteMessage = computed(() => {
  return '¿Deseas eliminar el resultado de ';
});

const modalFecha = computed(() => {
  if (!resultadoParaEliminar.value?.fechaEstudio) return '';
  return formatDate(resultadoParaEliminar.value.fechaEstudio);
});

const modalResultado = computed(() => {
  if (!resultadoParaEliminar.value?.resultadoGlobal) return '';
  return getResultadoLabel(resultadoParaEliminar.value.resultadoGlobal);
});

const modalTipoSangre = computed(() => {
  if (resultadoParaEliminar.value?.tipoSangre) {
    return getTipoSangreLabel(resultadoParaEliminar.value.tipoSangre);
  }
  return '';
});

const modalTipoEstudio = computed(() => {
  if (!resultadoParaEliminar.value?.tipoEstudio) return '';
  return getTipoLabel(resultadoParaEliminar.value.tipoEstudio);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
