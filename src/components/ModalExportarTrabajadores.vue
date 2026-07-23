<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  EXPORT_PRESET_IDS,
  EXPORT_PRESET_LABELS,
  filterColumnKeysForRegime,
  getColumnasDisponibles,
  getPresetColumnKeys,
  groupColumns,
  loadPersistedColumnKeys,
  loadShowEmptyColumnsPreference,
  persistColumnKeys,
  persistShowEmptyColumnsPreference,
  type ExportPresetId,
} from '@/helpers/exportarTrabajadoresColumnas';

export interface ChipFiltroExport {
  id: string;
  label: string;
  valor: string;
}

export interface ExportConfirmPayload {
  columnKeys: string[];
  showEmptyColumns: boolean;
}

const props = defineProps<{
  open: boolean;
  rowCount: number;
  chipsFiltros: ChipFiltroExport[];
  nombreArchivo: string;
  isSires: boolean;
  /** Keys con al menos un valor no vacío en el lote a exportar */
  keysWithData: string[];
}>();

const emit = defineEmits<{
  close: [];
  confirm: [payload: ExportConfirmPayload];
  adjustFilters: [];
}>();

const selectedKeys = ref<string[]>([]);
/** false (default) = ocultar opciones 100% vacías */
const showEmptyColumns = ref(false);

const keysWithDataSet = computed(() => new Set(props.keysWithData));

const columnasCatalogo = computed(() => getColumnasDisponibles(props.isSires));

const columnasVisibles = computed(() => {
  if (showEmptyColumns.value) return columnasCatalogo.value;
  return columnasCatalogo.value.filter((c) => keysWithDataSet.value.has(c.key));
});

const grupos = computed(() => groupColumns(columnasVisibles.value));

const visibleKeySet = computed(() => new Set(columnasVisibles.value.map((c) => c.key)));

const selectedSet = computed(() => new Set(selectedKeys.value));

const selectedVisibleCount = computed(
  () => selectedKeys.value.filter((k) => visibleKeySet.value.has(k)).length,
);
const totalVisibleCount = computed(() => columnasVisibles.value.length);

const canDownload = computed(
  () => props.rowCount > 0 && selectedVisibleCount.value > 0,
);

function pruneSelectionToVisible() {
  selectedKeys.value = filterColumnKeysForRegime(
    selectedKeys.value.filter((k) => visibleKeySet.value.has(k)),
    props.isSires,
  );
}

function initSelection() {
  showEmptyColumns.value = loadShowEmptyColumnsPreference(false);
  const persisted = loadPersistedColumnKeys(props.isSires);
  selectedKeys.value = filterColumnKeysForRegime(persisted, props.isSires);
  if (!showEmptyColumns.value) {
    pruneSelectionToVisible();
    if (selectedKeys.value.length === 0) {
      selectedKeys.value = getPresetColumnKeys('basico', props.isSires).filter((k) =>
        visibleKeySet.value.has(k),
      );
    }
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) initSelection();
  },
);

watch(showEmptyColumns, (show) => {
  if (!show) pruneSelectionToVisible();
});

function toggleKey(key: string) {
  const set = new Set(selectedKeys.value);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  selectedKeys.value = filterColumnKeysForRegime([...set], props.isSires);
}

function seleccionarTodas() {
  selectedKeys.value = columnasVisibles.value.map((c) => c.key);
}

function seleccionarNinguna() {
  selectedKeys.value = [];
}

function aplicarPreset(presetId: ExportPresetId) {
  const preset = getPresetColumnKeys(presetId, props.isSires);
  if (showEmptyColumns.value) {
    selectedKeys.value = preset;
  } else {
    selectedKeys.value = preset.filter((k) => visibleKeySet.value.has(k));
  }
}

function restablecer() {
  aplicarPreset('basico');
}

function onConfirm() {
  if (!canDownload.value) return;
  const keys = filterColumnKeysForRegime(
    selectedKeys.value.filter((k) => visibleKeySet.value.has(k)),
    props.isSires,
  );
  persistColumnKeys(keys);
  persistShowEmptyColumnsPreference(showEmptyColumns.value);
  emit('confirm', {
    columnKeys: keys,
    showEmptyColumns: showEmptyColumns.value,
  });
}

function onClose() {
  emit('close');
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @click.self="onClose"
  >
    <div
      class="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-exportar-titulo"
      @click.stop
    >
      <div class="flex items-start justify-between gap-4 p-5 border-b border-gray-200 shrink-0">
        <div>
          <h2 id="modal-exportar-titulo" class="text-xl font-bold text-gray-800">
            Exportar a Excel
          </h2>
          <p class="text-sm text-gray-600 mt-1">
            Revisa el alcance y elige las columnas antes de descargar.
          </p>
        </div>
        <button
          type="button"
          class="text-gray-400 hover:text-gray-600 transition-colors p-1"
          title="Cerrar"
          @click="onClose"
        >
          <i class="fas fa-times text-lg"></i>
        </button>
      </div>

      <div class="flex flex-col flex-1 min-h-0">
        <div class="shrink-0 px-5 pt-5 pb-3 space-y-4 border-b border-gray-100">
          <div class="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3">
            <p class="text-sm text-emerald-900">
              Se exportarán
              <span class="font-semibold">{{ rowCount }}</span>
              trabajador{{ rowCount === 1 ? '' : 'es' }}.
            </p>
            <p v-if="rowCount === 0" class="text-xs text-amber-700 mt-1">
              No hay filas con los filtros/búsqueda actuales.
            </p>
          </div>

          <div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <h3 class="text-sm font-semibold text-gray-700">Filtros activos</h3>
              <button
                type="button"
                class="text-xs font-medium text-emerald-700 hover:text-emerald-800 underline-offset-2 hover:underline"
                @click="emit('adjustFilters')"
              >
                Cambiar filtros
              </button>
            </div>
            <div v-if="chipsFiltros.length" class="flex flex-wrap gap-1.5">
              <span
                v-for="chip in chipsFiltros"
                :key="chip.id"
                class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700 border border-gray-200"
              >
                <span class="font-medium">{{ chip.label }}:</span>
                {{ chip.valor }}
              </span>
            </div>
            <p v-else class="text-xs text-gray-500">
              Sin filtros adicionales (la búsqueda de la tabla, si aplica, sí se respeta).
            </p>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-gray-700 mb-1">Nombre del archivo</h3>
            <p class="text-xs font-mono bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-gray-800 break-all">
              {{ nombreArchivo }}
            </p>
          </div>

          <div>
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h3 class="text-sm font-semibold text-gray-700">
                Columnas
                <span class="font-normal text-gray-500">({{ selectedVisibleCount }} de {{ totalVisibleCount }})</span>
              </h3>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="presetId in EXPORT_PRESET_IDS"
                  :key="presetId"
                  type="button"
                  class="px-2 py-1 text-xs rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  @click="aplicarPreset(presetId)"
                >
                  {{ EXPORT_PRESET_LABELS[presetId] }}
                </button>
                <button
                  type="button"
                  class="px-2 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                  @click="seleccionarTodas"
                >
                  Todas
                </button>
                <button
                  type="button"
                  class="px-2 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                  @click="seleccionarNinguna"
                >
                  Ninguna
                </button>
                <button
                  type="button"
                  class="px-2 py-1 text-xs rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  @click="restablecer"
                >
                  Restablecer
                </button>
              </div>
            </div>
            <label class="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                v-model="showEmptyColumns"
                type="checkbox"
                class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              Mostrar columnas vacías
            </label>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-4">
          <p
            v-if="grupos.length === 0"
            class="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2"
          >
            No hay columnas con datos en este lote. Activa “Mostrar columnas vacías” para ver todas las opciones.
          </p>
          <div
            v-for="grupo in grupos"
            :key="grupo.group"
            class="border border-gray-100 rounded-lg p-3"
          >
            <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              {{ grupo.group }}
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <label
                v-for="col in grupo.columns"
                :key="col.key"
                class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-1.5 py-1"
              >
                <input
                  type="checkbox"
                  class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  :checked="selectedSet.has(col.key)"
                  @change="toggleKey(col.key)"
                />
                {{ col.header }}
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 p-5 border-t border-gray-200 shrink-0 bg-gray-50">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-white"
          @click="onClose"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canDownload"
          @click="onConfirm"
        >
          Descargar Excel
        </button>
      </div>
    </div>
  </div>
</template>
