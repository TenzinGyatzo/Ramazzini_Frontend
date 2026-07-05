<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useUserStore } from "@/stores/user";
import { useProveedorSaludStore } from "@/stores/proveedorSalud";
import giisExportAPI from "@/api/giisExportAPI";
import type { BatchListItem } from "@/api/giisExportAPI";

const userStore = useUserStore();
const proveedorSaludStore = useProveedorSaludStore();
const isPrincipalOrAdmin = computed(
  () =>
    userStore.user?.role === "Principal" || userStore.user?.role === "Administrador"
);
const listBatches = ref<BatchListItem[]>([]);
const loading = ref(false);
const generating = ref(false);
const selectedYearMonth = ref("");
const errorMessage = ref<string | null>(null);

const canUseGiis = computed(
  () => isPrincipalOrAdmin.value && proveedorSaludStore.giisExportEnabled
);
const hasGeneratingBatch = computed(() =>
  listBatches.value.some((b) => b.status === "generating")
);
const canGenerate = computed(
  () => !generating.value && !hasGeneratingBatch.value && !!selectedYearMonth.value
);
const giisTxtDownloadEnabled =
  import.meta.env.VITE_GIIS_TXT_DOWNLOAD_ENABLED === "true";

function formatDate(d: string | undefined): string {
  if (!d) return "—";
  try {
    const date = new Date(d);
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(d);
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "En proceso",
    generating: "En proceso",
    completed: "Listo",
    failed: "Error",
  };
  return map[status] ?? status;
}

async function loadList() {
  if (!isPrincipalOrAdmin.value) return;
  loading.value = true;
  errorMessage.value = null;
  try {
    listBatches.value = await giisExportAPI.listBatches();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    errorMessage.value =
      err.response?.data?.message ?? err.message ?? "Error al cargar el listado.";
  } finally {
    loading.value = false;
  }
}

async function handleGenerate() {
  if (!canGenerate.value || !selectedYearMonth.value) return;
  generating.value = true;
  errorMessage.value = null;
  try {
    await giisExportAPI.createBatch(selectedYearMonth.value);
    await loadList();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    errorMessage.value =
      err.response?.data?.message ?? err.message ?? "Error al generar los informes.";
  } finally {
    generating.value = false;
  }
}

async function handleDownloadTxt(batchId: string, guide: string) {
  try {
    await giisExportAPI.downloadFile(batchId, guide);
  } catch {
    errorMessage.value = `No se pudo descargar ${guide}.txt.`;
  }
}

async function handleDownloadCifrado(batchId: string, guide: string) {
  try {
    await giisExportAPI.downloadDeliverable(batchId, guide);
  } catch {
    errorMessage.value = `No se pudo descargar ${guide} Cifrado.`;
  }
}

async function handleDownloadExcludedReport(batchId: string) {
  try {
    await giisExportAPI.downloadExcludedReportCsv(batchId);
  } catch {
    errorMessage.value = "No se pudo descargar el reporte de excluidos.";
  }
}

onMounted(() => {
  if (isPrincipalOrAdmin.value) loadList();
});

watch(
  () => proveedorSaludStore.proveedorSalud ?? proveedorSaludStore.giisExportEnabled,
  () => {
    if (isPrincipalOrAdmin.value && proveedorSaludStore.giisExportEnabled) loadList();
  },
  { immediate: false }
);
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <h1 class="text-2xl font-semibold text-gray-800 mb-6">Exportación GIIS</h1>

    <div v-if="!isPrincipalOrAdmin" class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
      <p class="font-medium">Sin permiso</p>
      <p class="text-sm mt-1">Solo usuarios con rol Principal o Administrador pueden usar Exportación GIIS.</p>
    </div>
    <div v-else-if="!proveedorSaludStore.giisExportEnabled" class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800">
      <p class="font-medium">Exportación GIIS solo disponible para proveedores SIRES</p>
      <p class="text-sm mt-1">Su proveedor no está en régimen SIRES (NOM-024).</p>
    </div>

    <template v-else>
      <!-- Formulario -->
      <section class="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <h2 class="text-lg font-medium text-gray-700 mb-3">Generar nuevo reporte</h2>
        <div class="flex flex-wrap items-end gap-4">
          <div class="dark-mode-input-surface">
            <label class="block text-sm font-medium text-gray-600 mb-1">Mes y año</label>
            <input
              v-model="selectedYearMonth"
              type="month"
              class="rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            :disabled="!canGenerate"
            @click="handleGenerate"
            class="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 disabled:hover:bg-blue-600"
          >
            Generar
          </button>
        </div>
        <p
          v-if="generating || hasGeneratingBatch"
          class="mt-3 text-sm text-gray-600 flex items-center gap-2"
        >
          <span
            class="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
          ></span>
          {{ generating ? "Generando informes GIIS…" : "Hay una generación en curso. Espere a que termine." }}
        </p>
        <p v-if="errorMessage" class="mt-3 text-sm text-red-600">{{ errorMessage }}</p>
      </section>

      <!-- Listado -->
      <section>
        <h2 class="text-lg font-medium text-gray-700 mb-3">Historial de reportes</h2>
        <div v-if="loading" class="text-gray-500 py-4">Cargando…</div>
        <div
          v-else-if="listBatches.length === 0"
          class="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-600"
        >
          <p class="font-medium">Aún no hay reportes GIIS.</p>
          <p class="text-sm mt-1">Use el botón de arriba para generar el primero.</p>
        </div>
        <div v-else class="overflow-x-auto rounded-lg border border-gray-200">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mes reportado</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha de generación</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descargas / Detalle</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="b in listBatches" :key="b.batchId" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-700">{{ b.yearMonth }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">{{ formatDate(b.completedAt) }}</td>
                <td class="px-4 py-3 text-sm">
                  <span
                    :class="{
                      'text-green-600': b.status === 'completed',
                      'text-red-600': b.status === 'failed',
                      'text-amber-600': b.status === 'generating' || b.status === 'pending',
                    }"
                  >
                    {{ statusLabel(b.status) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm">
                  <template v-if="b.status === 'completed'">
                    <div class="flex flex-wrap gap-2">
                      <template v-for="art in (b.artifacts || []).filter((a) => a.guide === 'CEX')" :key="art.guide">
                        <button
                          v-if="art.zipPath"
                          type="button"
                          @click="handleDownloadCifrado(b.batchId, art.guide)"
                          class="text-blue-600 hover:underline text-sm"
                        >
                          {{ art.guide }} Cifrado
                        </button>
                        <button
                          v-if="giisTxtDownloadEnabled && art.path"
                          type="button"
                          @click="handleDownloadTxt(b.batchId, art.guide)"
                          class="text-blue-600 hover:underline text-sm"
                        >
                          {{ art.guide }}.txt
                        </button>
                      </template>
                    </div>
                    <p
                      v-if="b.excludedReport?.totalExcluded"
                      class="text-xs text-amber-700 mt-1"
                    >
                      {{ b.excludedReport.totalExcluded }} registro(s) excluido(s).
                      <button
                        type="button"
                        class="underline hover:no-underline"
                        @click="handleDownloadExcludedReport(b.batchId)"
                      >
                        Descargar reporte de excluidos
                      </button>
                    </p>
                  </template>
                  <template v-else-if="b.status === 'failed'">
                    <p v-if="b.errorMessage" class="text-red-600 text-xs">{{ b.errorMessage }}</p>
                    <button
                      v-if="b.excludedReport?.totalExcluded"
                      type="button"
                      class="text-blue-600 hover:underline text-sm mt-1"
                      @click="handleDownloadExcludedReport(b.batchId)"
                    >
                      Descargar reporte de excluidos
                    </button>
                  </template>
                  <template v-else>
                    —
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
