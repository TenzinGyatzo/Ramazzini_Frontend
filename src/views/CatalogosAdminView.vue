<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject, watch } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import catalogsAdminAPI, {
  type CatalogTypeInfo,
  type CatalogRow,
  type CatalogAdminColumn,
} from "@/api/catalogsAdminAPI";

const toast = inject<{ open: (o: { message: string; type: string }) => void }>("toast");
const userStore = useUserStore();
const router = useRouter();

const LARGE_CATALOG_THRESHOLD = 50000;

const types = ref<CatalogTypeInfo[]>([]);
const selectedType = ref("");
const items = ref<CatalogRow[]>([]);
const columnas = ref<CatalogAdminColumn[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(50);
const searchQ = ref("");
const loading = ref(false);
const typesLoading = ref(false);
const formSaving = ref(false);
const initialLoadDone = ref(false);

const showPageSpinner = computed(
  () => !initialLoadDone.value && (typesLoading.value || loading.value),
);

const showForm = ref(false);
const formMode = ref<"create" | "edit">("create");

function closeForm() {
  showForm.value = false;
}

function onFormEscapeKey(e: KeyboardEvent) {
  if (e.key === "Escape" && showForm.value) {
    closeForm();
  }
}

watch(showForm, (open) => {
  if (open) {
    window.addEventListener("keydown", onFormEscapeKey);
  } else {
    window.removeEventListener("keydown", onFormEscapeKey);
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", onFormEscapeKey);
});
const editingCode = ref("");
/** Valores del formulario por columna del CSV (parche 1.0.10: todas las columnas). */
const form = ref<Record<string, string>>({});
/** Valores con los que se abrió la edición, para saber si cambió alguna clave. */
const formOriginal = ref<Record<string, string>>({});
const showConfirmClave = ref(false);

const columnasClave = computed(() => columnas.value.filter((c) => c.clave));
/** Columna que identifica al registro por su nombre (para el aviso de eliminar). */
const columnaDescripcion = computed(
  () =>
    (columnas.value.find((c) => c.descripcion) ?? columnas.value.find((c) => !c.clave))
      ?.columna ?? "",
);
const clavesCambiadas = computed(() =>
  columnasClave.value.filter(
    (c) =>
      (form.value[c.columna] ?? "").trim() !==
      (formOriginal.value[c.columna] ?? "").trim(),
  ),
);

const importFile = ref<File | null>(null);
const importLoading = ref(false);

const showDeleteModal = ref(false);
const deleteTarget = ref<CatalogRow | null>(null);

const deleteIdentificacion = computed(() => {
  const row = deleteTarget.value;
  if (!row) return "";
  const desc = (row.valores[columnaDescripcion.value] ?? "").trim();
  return desc ? `${row.code} — ${desc}` : row.code;
});

const deleteTipoRegistro = computed(() => {
  const name = selectedType.value || "catálogo";
  return `entrada del catálogo «${name}»`;
});

const selectedMeta = computed(() =>
  types.value.find((t) => t.catalogType === selectedType.value),
);

const isLargeCatalog = computed(
  () => (selectedMeta.value?.rowCountInCache ?? 0) >= LARGE_CATALOG_THRESHOLD,
);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / limit.value)),
);

function notify(message: string, type = "success") {
  toast?.open({ message, type, position: "top-right", duration: 4000 } as never);
}

async function loadTypes() {
  typesLoading.value = true;
  try {
    const { data } = await catalogsAdminAPI.listTypes();
    types.value = data;
    if (!selectedType.value && data.length) {
      selectedType.value = data[0].catalogType;
    }
  } catch {
    notify("No se pudieron cargar los tipos de catálogo", "error");
  } finally {
    typesLoading.value = false;
  }
}

async function loadEntries() {
  if (!selectedType.value) return;
  loading.value = true;
  try {
    const { data } = await catalogsAdminAPI.listRows(selectedType.value, {
      page: page.value,
      limit: limit.value,
      q: searchQ.value.trim() || undefined,
    });
    items.value = data.items;
    columnas.value = data.columnas;
    total.value = data.total;
  } catch {
    notify("Error al cargar entradas", "error");
  } finally {
    loading.value = false;
  }
}

function valoresVacios(): Record<string, string> {
  return Object.fromEntries(columnas.value.map((c) => [c.columna, ""]));
}

function openCreate() {
  formMode.value = "create";
  editingCode.value = "";
  form.value = valoresVacios();
  formOriginal.value = {};
  showForm.value = true;
}

function openEdit(row: CatalogRow) {
  formMode.value = "edit";
  editingCode.value = row.code;
  form.value = { ...valoresVacios(), ...row.valores };
  formOriginal.value = { ...form.value };
  showForm.value = true;
}

/** En la edición solo se envían las columnas que cambiaron. */
function valoresAEnviar(): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const c of columnas.value) {
    const v = (form.value[c.columna] ?? "").trim();
    if (
      formMode.value === "create" ||
      v !== (formOriginal.value[c.columna] ?? "").trim()
    ) {
      valores[c.columna] = v;
    }
  }
  return valores;
}

function mensajeDeError(e: unknown, porDefecto: string): string {
  const msg = (e as { response?: { data?: { message?: unknown } } })?.response
    ?.data?.message;
  if (Array.isArray(msg)) return msg.join(". ");
  return typeof msg === "string" && msg.trim() ? msg : porDefecto;
}

function saveForm() {
  if (!selectedType.value || formSaving.value) return;
  // Cambiar una clave pide confirmación antes de guardar
  if (formMode.value === "edit" && clavesCambiadas.value.length > 0) {
    showConfirmClave.value = true;
    return;
  }
  void guardar();
}

async function guardar() {
  showConfirmClave.value = false;
  if (!selectedType.value || formSaving.value) return;
  const valores = valoresAEnviar();
  if (formMode.value === "edit" && Object.keys(valores).length === 0) {
    notify("No hay cambios que guardar", "info");
    return;
  }
  formSaving.value = true;
  try {
    if (formMode.value === "create") {
      await catalogsAdminAPI.createRow(selectedType.value, valores);
      notify("Registro creado");
    } else {
      await catalogsAdminAPI.updateRow(
        selectedType.value,
        editingCode.value,
        valores,
      );
      notify("Registro actualizado");
    }
    closeForm();
    await loadTypes();
    await loadEntries();
  } catch (e) {
    notify(mensajeDeError(e, "No se pudo guardar el registro"), "error");
  } finally {
    formSaving.value = false;
  }
}

function openDeleteModal(row: CatalogRow) {
  deleteTarget.value = row;
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  deleteTarget.value = null;
}

async function onConfirmDelete() {
  const idRegistro = deleteTarget.value?.code;
  if (!idRegistro || !selectedType.value) return;
  try {
    await catalogsAdminAPI.deleteEntry(selectedType.value, idRegistro);
    notify(
      selectedType.value === "establecimientos_salud"
        ? "Establecimiento desactivado"
        : "Registro eliminado",
    );
    closeDeleteModal();
    await loadTypes();
    await loadEntries();
  } catch {
    notify("No se pudo eliminar", "error");
  }
}

function onImportFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  importFile.value = input.files?.[0] ?? null;
}

async function runImport() {
  if (!importFile.value || !selectedType.value) return;
  if (
    !confirm(
      "Se reemplazará el archivo CSV completo. Se creará un respaldo automático. ¿Continuar?",
    )
  ) {
    return;
  }
  importLoading.value = true;
  try {
    const { data } = await catalogsAdminAPI.importCsv(
      selectedType.value,
      importFile.value,
    );
    notify(`Importación exitosa: ${data.rowCount} filas`);
    importFile.value = null;
    await loadTypes();
    await loadEntries();
  } catch {
    notify("Error en la importación", "error");
  } finally {
    importLoading.value = false;
  }
}

async function downloadExport() {
  if (!selectedType.value) return;
  try {
    const { data } = await catalogsAdminAPI.exportCsv(selectedType.value);
    const meta = selectedMeta.value;
    const filename = meta?.filename || `${selectedType.value}.csv`;
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    notify("No se pudo exportar el CSV", "error");
  }
}

async function reloadCache() {
  if (!selectedType.value) return;
  try {
    const { data } = await catalogsAdminAPI.reloadCache(selectedType.value);
    notify(`Caché recargada (${data.rowCountInCache} filas)`);
    await loadTypes();
    await loadEntries();
  } catch {
    notify("Error al recargar caché", "error");
  }
}

watch(selectedType, () => {
  page.value = 1;
  loadEntries();
});

watch(page, () => loadEntries());

onMounted(async () => {
  // Catálogos globales: solo el Administrador de plataforma (sin flag ni régimen)
  if (userStore.user?.role !== "Administrador") {
    router.push({ name: "inicio" });
    return;
  }
  try {
    await loadTypes();
    await loadEntries();
  } finally {
    initialLoadDone.value = true;
  }
});
</script>

<template>
  <div class="catalogos-admin-view max-w-6xl mx-auto p-4 md:p-8">
    <h1 class="text-2xl font-bold text-gray-800 mb-2">Administración de catálogos</h1>
    <p class="catalogos-admin-intro text-sm text-gray-600 mb-6">
      Los catálogos se almacenan en CSV en el servidor. Para actualizaciones masivas use
      <strong>Importar CSV</strong>; el CRUD por fila reescribe el archivo completo.
    </p>

    <div
      v-if="showPageSpinner"
      class="flex flex-col items-center justify-center py-24"
    >
      <div class="relative">
        <div
          class="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"
        />
        <div
          class="absolute top-2 left-2 w-12 h-12 border-4 border-transparent border-t-green-500 rounded-full animate-spin"
          style="animation-duration: 1.5s"
        />
      </div>
      <p class="mt-4 text-lg text-gray-600 font-medium">Cargando catálogos…</p>
      <p class="mt-2 text-sm text-gray-500">Esto puede tomar unos momentos</p>
    </div>

    <template v-else>
    <div class="catalogos-admin-filters dark-mode-input-surface grid md:grid-cols-3 gap-4 mb-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Catálogo</label>
        <select
          v-model="selectedType"
          class="w-full border border-gray-300 rounded-lg px-3 py-2"
          :disabled="typesLoading"
        >
          <option v-for="t in types" :key="t.catalogType" :value="t.catalogType">
            {{ t.catalogType }} ({{ t.rowCountInCache }} en caché)
          </option>
        </select>
        <p v-if="selectedMeta" class="text-xs text-gray-500 mt-2">
          Archivo: {{ selectedMeta.filename }}<br />
          Disco: {{ selectedMeta.rowCountOnDisk }} filas ·
          {{ selectedMeta.loaded ? "cargado" : "no cargado" }}
        </p>
      </div>

      <div class="md:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
        <div class="flex gap-2">
          <input
            v-model="searchQ"
            type="text"
            placeholder="Buscar en cualquier columna"
            class="flex-1 border border-gray-300 rounded-lg px-3 py-2"
            @keyup.enter="page = 1; loadEntries()"
          />
          <button
            type="button"
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            @click="page = 1; loadEntries()"
          >
            Buscar
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="isLargeCatalog"
      class="catalogos-admin-warning mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900"
    >
      Este catálogo tiene más de {{ LARGE_CATALOG_THRESHOLD.toLocaleString() }} registros.
      Se sugiere importar el CSV completo; editar una sola fila puede tardar varios segundos.
    </div>

    <div class="catalogos-admin-toolbar flex flex-wrap gap-2 mb-6">
      <button
        type="button"
        class="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
        @click="openCreate"
      >
        Nueva entrada
      </button>
      <button
        type="button"
        class="catalogos-admin-btn-secondary px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm hover:bg-gray-200"
        @click="downloadExport"
      >
        Exportar CSV
      </button>
      <button
        type="button"
        class="catalogos-admin-btn-secondary px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm hover:bg-gray-200"
        @click="reloadCache"
      >
        Recargar caché
      </button>
    </div>

    <div class="catalogos-admin-import mb-8 p-4 border border-dashed border-indigo-300 rounded-xl bg-indigo-50/50">
      <h2 class="font-semibold text-gray-800 mb-2">Actualizar catálogo completo</h2>
      <input type="file" accept=".csv,text/csv" class="text-sm mb-2" @change="onImportFileChange" />
      <button
        type="button"
        class="px-4 py-2 ml-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
        :disabled="!importFile || importLoading"
        @click="runImport"
      >
        {{ importLoading ? "Importando…" : "Importar y reemplazar CSV" }}
      </button>
    </div>

    <div
      v-if="loading"
      class="catalogos-admin-loading flex flex-col items-center justify-center py-12 border border-gray-200 rounded-xl bg-gray-50/80"
    >
      <div
        class="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"
      />
      <p class="mt-3 text-sm text-gray-600">Cargando entradas…</p>
    </div>
    <div v-else class="catalogos-admin-table overflow-x-auto border border-gray-200 rounded-xl">
      <table class="min-w-full text-sm">
        <thead class="catalogos-admin-table-head bg-gray-50">
          <tr>
            <th
              v-for="(c, i) in columnas"
              :key="c.columna"
              class="text-left px-3 py-3 font-medium text-gray-700 whitespace-nowrap"
              :class="i === 0 ? 'catalogos-admin-sticky sticky left-0 z-[1] bg-gray-50' : ''"
              :title="c.adicional ? 'Columna adicional a los campos mínimos' : undefined"
            >
              {{ c.etiqueta }}
              <span v-if="c.clave" class="ml-1 text-[10px] font-normal uppercase text-gray-400">clave</span>
            </th>
            <th
              class="catalogos-admin-sticky sticky right-0 z-[1] bg-gray-50 text-right px-3 py-3 font-medium text-gray-700 whitespace-nowrap"
            >
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in items"
            :key="row.code"
            class="catalogos-admin-table-row group border-t border-gray-100 hover:bg-gray-50"
          >
            <td
              v-for="(c, i) in columnas"
              :key="c.columna"
              class="px-3 py-2 whitespace-nowrap"
              :class="[
                c.clave ? 'font-mono text-xs catalogos-admin-code' : '',
                i === 0 ? 'catalogos-admin-sticky sticky left-0 z-[1] bg-white group-hover:bg-gray-50' : '',
              ]"
            >
              {{ row.valores[c.columna] }}
            </td>
            <td
              class="catalogos-admin-sticky sticky right-0 z-[1] bg-white group-hover:bg-gray-50 px-3 py-2 text-right space-x-2 whitespace-nowrap"
            >
              <button
                type="button"
                class="catalogos-admin-action-edit text-indigo-600 hover:underline"
                @click="openEdit(row)"
              >
                Editar
              </button>
              <button
                type="button"
                class="catalogos-admin-action-delete text-red-600 hover:underline"
                @click="openDeleteModal(row)"
              >
                Eliminar
              </button>
            </td>
          </tr>
          <tr v-if="!items.length">
            <td :colspan="columnas.length + 1" class="px-4 py-8 text-center text-gray-500">
              Sin resultados
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="catalogos-admin-pagination flex items-center justify-between mt-4 text-sm text-gray-600">
      <span>{{ total }} registros · página {{ page }} / {{ totalPages }}</span>
      <div class="flex gap-2">
        <button
          type="button"
          class="catalogos-admin-page-btn px-3 py-1 border rounded disabled:opacity-40"
          :disabled="page <= 1"
          @click="page--"
        >
          Anterior
        </button>
        <button
          type="button"
          class="catalogos-admin-page-btn px-3 py-1 border rounded disabled:opacity-40"
          :disabled="page >= totalPages"
          @click="page++"
        >
          Siguiente
        </button>
      </div>
    </div>
    </template>

    <div
      v-if="showDeleteModal && deleteTarget"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @mousedown.self="closeDeleteModal"
    >
      <div class="catalogos-admin-modal bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[calc(100dvh-2rem)] overflow-y-auto" @mousedown.stop>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Confirmar eliminación</h3>
        <p class="text-sm text-gray-600 mb-6">
          ¿Eliminar {{ deleteTipoRegistro }} identificado como
          <strong class="catalogos-admin-modal-strong">"{{ deleteIdentificacion }}"</strong>? Esta acción no se puede deshacer.
        </p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="catalogos-admin-btn-secondary px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
            @click="closeDeleteModal"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500"
            @click="onConfirmDelete"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showForm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @mousedown.self="closeForm"
    >
      <div
        class="catalogos-admin-modal catalogos-admin-form dark-mode-input-surface bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
        @mousedown.stop
      >
        <h3 class="text-lg font-semibold text-gray-800 mb-4">
          {{ formMode === "create" ? "Nueva entrada" : "Editar entrada" }}
        </h3>
        <div class="grid sm:grid-cols-2 gap-3">
          <div v-for="c in columnas" :key="c.columna">
            <label class="text-sm text-gray-700" :for="`catalogo-col-${c.columna}`">
              {{ c.etiqueta }}
              <span v-if="c.clave" class="ml-1 text-[10px] uppercase text-gray-400">clave</span>
            </label>
            <input
              :id="`catalogo-col-${c.columna}`"
              v-model="form[c.columna]"
              class="w-full border rounded-lg px-3 py-2 mt-1"
              :class="c.clave ? 'font-mono text-sm' : ''"
            />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <button
            type="button"
            class="catalogos-admin-btn-secondary px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            @click="closeForm"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="formSaving"
            @click="saveForm"
          >
            <span v-if="formSaving">Guardando...</span>
            <span v-else>Guardar</span>
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showConfirmClave"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      @mousedown.self="showConfirmClave = false"
    >
      <div class="catalogos-admin-modal bg-white rounded-xl shadow-xl max-w-lg w-full p-6" @mousedown.stop>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Cambiar la clave del registro</h3>
        <p class="text-sm text-gray-600 mb-3">Vas a cambiar:</p>
        <ul class="text-sm text-gray-700 mb-3 space-y-1">
          <li v-for="c in clavesCambiadas" :key="c.columna">
            <strong>{{ c.etiqueta }}</strong>:
            <span class="font-mono">{{ formOriginal[c.columna] || "(vacío)" }}</span>
            →
            <span class="font-mono">{{ form[c.columna] || "(vacío)" }}</span>
          </li>
        </ul>
        <p class="text-sm text-gray-600 mb-6">
          Los registros que ya usan la clave anterior (por ejemplo, documentos o proveedores)
          la conservan; no se actualizan solos. Si la clave nueva ya existe en el catálogo, no
          se guardará.
        </p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="catalogos-admin-btn-secondary px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
            @click="showConfirmClave = false"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            @click="guardar"
          >
            Cambiar clave y guardar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
