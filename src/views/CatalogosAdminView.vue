<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject, watch } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import catalogsAdminAPI, {
  type CatalogTypeInfo,
  type CatalogEntryRow,
} from "@/api/catalogsAdminAPI";
import { catalogAdminEnabled } from "@/composables/useCatalogAdminFeature";

const toast = inject<{ open: (o: { message: string; type: string }) => void }>("toast");
const userStore = useUserStore();
const router = useRouter();

const LARGE_CATALOG_THRESHOLD = 50000;

const types = ref<CatalogTypeInfo[]>([]);
const selectedType = ref("");
const items = ref<CatalogEntryRow[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(50);
const searchQ = ref("");
const loading = ref(false);
const typesLoading = ref(false);
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
const form = ref({
  code: "",
  description: "",
  lsex: "",
  linfRaw: "",
  lsupRaw: "",
  letra: "",
  estatus: "",
  estadoCode: "",
  municipioCode: "",
  localidadCode: "",
});

const importFile = ref<File | null>(null);
const importLoading = ref(false);

const showDeleteModal = ref(false);
const deleteTarget = ref<CatalogEntryRow | null>(null);

const deleteIdentificacion = computed(() => {
  const row = deleteTarget.value;
  if (!row) return "";
  const desc = row.description?.trim();
  return desc ? `${row.code} — ${desc}` : row.code;
});

const deleteTipoRegistro = computed(() => {
  const name = selectedType.value || "catálogo";
  if (selectedType.value === "establecimientos_salud") {
    return `establecimiento del catálogo «${name}» (se marcará como no en operación)`;
  }
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
    const { data } = await catalogsAdminAPI.listEntries(selectedType.value, {
      page: page.value,
      limit: limit.value,
      q: searchQ.value.trim() || undefined,
    });
    items.value = data.items;
    total.value = data.total;
  } catch {
    notify("Error al cargar entradas", "error");
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  formMode.value = "create";
  editingCode.value = "";
  form.value = {
    code: "",
    description: "",
    lsex: "",
    linfRaw: "",
    lsupRaw: "",
    letra: "",
    estatus: "",
    estadoCode: "",
    municipioCode: "",
    localidadCode: "",
  };
  showForm.value = true;
}

function openEdit(row: CatalogEntryRow) {
  formMode.value = "edit";
  editingCode.value = row.code;
  form.value = {
    code: row.code,
    description: row.description || "",
    lsex: String(row.lsex ?? ""),
    linfRaw: String(row.linfRaw ?? ""),
    lsupRaw: String(row.lsupRaw ?? ""),
    letra: String(row.letra ?? ""),
    estatus: String(row.estatus ?? ""),
    estadoCode: String(row.estadoCode ?? ""),
    municipioCode: String(row.municipioCode ?? ""),
    localidadCode: String(row.localidadCode ?? ""),
  };
  showForm.value = true;
}

function buildPayload(): Record<string, unknown> {
  const label = form.value.description.trim();
  const p: Record<string, unknown> = {
    code: form.value.code.trim(),
    description: label,
    nombre: label,
  };
  if (selectedType.value === "diagnosticos") {
    if (form.value.lsex) p.lsex = form.value.lsex;
    if (form.value.linfRaw) p.linfRaw = form.value.linfRaw;
    if (form.value.lsupRaw) p.lsupRaw = form.value.lsupRaw;
    if (form.value.letra) p.letra = form.value.letra;
  }
  if (selectedType.value === "establecimientos_salud" && form.value.estatus) {
    p.estatus = form.value.estatus;
  }
  if (form.value.estadoCode) p.estadoCode = form.value.estadoCode;
  if (form.value.municipioCode) p.municipioCode = form.value.municipioCode;
  if (form.value.localidadCode) p.localidadCode = form.value.localidadCode;
  if (
    selectedType.value === "municipios" &&
    form.value.estadoCode &&
    form.value.municipioCode
  ) {
    p.code = `${form.value.estadoCode}-${form.value.municipioCode}`;
  }
  if (
    selectedType.value === "localidades" &&
    form.value.estadoCode &&
    form.value.municipioCode &&
    form.value.localidadCode
  ) {
    p.code = `${form.value.estadoCode}-${form.value.municipioCode}-${form.value.localidadCode}`;
  }
  return p;
}

async function saveForm() {
  if (!selectedType.value) return;
  try {
    const payload = buildPayload();
    if (formMode.value === "create") {
      await catalogsAdminAPI.createEntry(selectedType.value, payload);
      notify("Registro creado");
    } else {
      await catalogsAdminAPI.updateEntry(
        selectedType.value,
        editingCode.value,
        payload,
      );
      notify("Registro actualizado");
    }
    closeForm();
    await loadTypes();
    await loadEntries();
  } catch {
    notify("No se pudo guardar el registro", "error");
  }
}

function openDeleteModal(row: CatalogEntryRow) {
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
  if (!catalogAdminEnabled) {
    router.push({ name: "inicio" });
    return;
  }
  const role = userStore.user?.role;
  if (role !== "Principal" && role !== "Administrador") {
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
  <div class="max-w-6xl mx-auto p-4 md:p-8">
    <h1 class="text-2xl font-bold text-gray-800 mb-2">Administración de catálogos</h1>
    <p class="text-sm text-gray-600 mb-6">
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
    <div class="grid md:grid-cols-3 gap-4 mb-6">
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
            placeholder="Código o descripción"
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
      class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900"
    >
      Este catálogo tiene más de {{ LARGE_CATALOG_THRESHOLD.toLocaleString() }} registros.
      Se sugiere importar el CSV completo; editar una sola fila puede tardar varios segundos.
    </div>

    <div class="flex flex-wrap gap-2 mb-6">
      <button
        type="button"
        class="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
        @click="openCreate"
      >
        Nueva entrada
      </button>
      <button
        type="button"
        class="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm hover:bg-gray-200"
        @click="downloadExport"
      >
        Exportar CSV
      </button>
      <button
        type="button"
        class="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm hover:bg-gray-200"
        @click="reloadCache"
      >
        Recargar caché
      </button>
    </div>

    <div class="mb-8 p-4 border border-dashed border-indigo-300 rounded-xl bg-indigo-50/50">
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
      class="flex flex-col items-center justify-center py-12 border border-gray-200 rounded-xl bg-gray-50/80"
    >
      <div
        class="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"
      />
      <p class="mt-3 text-sm text-gray-600">Cargando entradas…</p>
    </div>
    <div v-else class="overflow-x-auto border border-gray-200 rounded-xl">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="text-left px-4 py-3 font-medium text-gray-700">Código</th>
            <th class="text-left px-4 py-3 font-medium text-gray-700">Descripción</th>
            <th class="text-right px-4 py-3 font-medium text-gray-700">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in items"
            :key="row.code"
            class="border-t border-gray-100 hover:bg-gray-50"
          >
            <td class="px-4 py-2 font-mono text-xs">{{ row.code }}</td>
            <td class="px-4 py-2">{{ row.description }}</td>
            <td class="px-4 py-2 text-right space-x-2">
              <button
                type="button"
                class="text-indigo-600 hover:underline"
                @click="openEdit(row)"
              >
                Editar
              </button>
              <button
                type="button"
                class="text-red-600 hover:underline"
                @click="openDeleteModal(row)"
              >
                Eliminar
              </button>
            </td>
          </tr>
          <tr v-if="!items.length">
            <td colspan="3" class="px-4 py-8 text-center text-gray-500">
              Sin resultados
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between mt-4 text-sm text-gray-600">
      <span>{{ total }} registros · página {{ page }} / {{ totalPages }}</span>
      <div class="flex gap-2">
        <button
          type="button"
          class="px-3 py-1 border rounded disabled:opacity-40"
          :disabled="page <= 1"
          @click="page--"
        >
          Anterior
        </button>
        <button
          type="button"
          class="px-3 py-1 border rounded disabled:opacity-40"
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
      <div class="bg-white rounded-xl shadow-xl max-w-lg w-full p-6" @mousedown.stop>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Confirmar eliminación</h3>
        <p class="text-sm text-gray-600 mb-6">
          ¿Eliminar {{ deleteTipoRegistro }} identificado como
          <strong>"{{ deleteIdentificacion }}"</strong>? Esta acción no se puede deshacer.
        </p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
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
        class="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
        @mousedown.stop
      >
        <h3 class="text-lg font-semibold mb-4">
          {{ formMode === "create" ? "Nueva entrada" : "Editar entrada" }}
        </h3>
        <div class="space-y-3">
          <div>
            <label class="text-sm text-gray-700">Código</label>
            <input
              v-model="form.code"
              class="w-full border rounded-lg px-3 py-2 mt-1"
              :disabled="formMode === 'edit'"
            />
          </div>
          <div>
            <label class="text-sm text-gray-700">
              {{ selectedType === 'diagnosticos' ? 'Nombre (columna NOMBRE)' : 'Descripción' }}
            </label>
            <input v-model="form.description" class="w-full border rounded-lg px-3 py-2 mt-1" />
          </div>
          <template v-if="selectedType === 'diagnosticos'">
            <div>
              <label class="text-sm text-gray-700">LSEX</label>
              <input v-model="form.lsex" class="w-full border rounded-lg px-3 py-2 mt-1" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-sm text-gray-700">LINF</label>
                <input v-model="form.linfRaw" class="w-full border rounded-lg px-3 py-2 mt-1" />
              </div>
              <div>
                <label class="text-sm text-gray-700">LSUP</label>
                <input v-model="form.lsupRaw" class="w-full border rounded-lg px-3 py-2 mt-1" />
              </div>
            </div>
            <div>
              <label class="text-sm text-gray-700">LETRA</label>
              <input v-model="form.letra" class="w-full border rounded-lg px-3 py-2 mt-1" />
            </div>
          </template>
          <template v-if="selectedType === 'establecimientos_salud'">
            <div>
              <label class="text-sm text-gray-700">Estatus</label>
              <select v-model="form.estatus" class="w-full border rounded-lg px-3 py-2 mt-1">
                <option value="">—</option>
                <option value="EN OPERACION">EN OPERACION</option>
                <option value="NO EN OPERACION">NO EN OPERACION</option>
              </select>
            </div>
          </template>
          <template
            v-if="
              selectedType === 'municipios' ||
              selectedType === 'localidades' ||
              selectedType === 'enitades_federativas'
            "
          >
            <div>
              <label class="text-sm text-gray-700">Código estado</label>
              <input v-model="form.estadoCode" class="w-full border rounded-lg px-3 py-2 mt-1" />
            </div>
            <div v-if="selectedType !== 'enitades_federativas'">
              <label class="text-sm text-gray-700">Código municipio</label>
              <input
                v-model="form.municipioCode"
                class="w-full border rounded-lg px-3 py-2 mt-1"
              />
            </div>
            <div v-if="selectedType === 'localidades'">
              <label class="text-sm text-gray-700">Código localidad</label>
              <input
                v-model="form.localidadCode"
                class="w-full border rounded-lg px-3 py-2 mt-1"
              />
            </div>
          </template>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <button
            type="button"
            class="px-4 py-2 border rounded-lg"
            @click="closeForm"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg"
            @click="saveForm"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
