<script setup>
import { ref, inject, watch } from 'vue';
import CatalogsAPI from '@/api/CatalogsAPI';
import { useCatalogSearchInput } from '@/helpers/catalogSearchInput';
import { getMunicipioDisplayCode } from '@/helpers/geoCatalogSort';
import { sortPaisesForSelector } from '@/helpers/paisNacimiento';

const toast = inject('toast');

const { catalogSearchInputAttrs: paisInputAttrs } = useCatalogSearchInput();
const { catalogSearchInputAttrs: entidadInputAttrs } = useCatalogSearchInput();
const { catalogSearchInputAttrs: municipioInputAttrs } = useCatalogSearchInput();
const { catalogSearchInputAttrs: localidadInputAttrs } = useCatalogSearchInput();

const showConsultor = ref(true);
const showDownloads = ref(false);

const paisQuery = ref('');
const paisResults = ref([]);
const paisLoading = ref(false);

const entidadQuery = ref('');
const entidadResults = ref([]);
const entidadLoading = ref(false);
const selectedEntidad = ref(null);

const municipioQuery = ref('');
const municipioResults = ref([]);
const municipioLoading = ref(false);
const selectedMunicipio = ref(null);

const localidadQuery = ref('');
const localidadResults = ref([]);
const localidadLoading = ref(false);

const downloadLoading = ref(null);

let paisDebounce = null;
let entidadDebounce = null;
let municipioDebounce = null;
let localidadDebounce = null;

const entidadSentinels = [
  { code: 'NE', description: 'Extranjero' },
];

function getLocalidadDisplayCode(entry) {
  if (entry?.localidadCode) return String(entry.localidadCode).padStart(4, '0');
  const code = String(entry?.code ?? '');
  return code.includes('-') ? code.split('-').pop() : code;
}

async function copyCode(code, label) {
  try {
    await navigator.clipboard.writeText(String(code));
    toast?.open?.({
      message: `Código copiado (${label}): ${code}`,
      type: 'success',
    });
  } catch {
    toast?.open?.({
      message: 'No se pudo copiar al portapapeles',
      type: 'error',
    });
  }
}

function saveBlobResponse(response, fallbackName) {
  const disposition = response.headers?.['content-disposition'] || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || fallbackName;
  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadCatalog(type, params) {
  downloadLoading.value = type;
  try {
    const response = await CatalogsAPI.exportImportReferenceCatalog(type, params);
    const fallback =
      type === 'localidades' && params?.entidadCode && params?.municipioCode
        ? `catalogo-localidades-${params.entidadCode}-${params.municipioCode}.csv`
        : `catalogo-${type}-importacion.csv`;
    saveBlobResponse(response, fallback);
    toast?.open?.({ message: 'Catálogo descargado', type: 'success' });
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      'No se pudo descargar el catálogo de referencia';
    toast?.open?.({ message, type: 'error' });
  } finally {
    downloadLoading.value = null;
  }
}

async function searchPaises() {
  paisLoading.value = true;
  try {
    const query = paisQuery.value.trim();
    if (!query || query.length < 2) {
      const { data } = await CatalogsAPI.listCatalog('cat_pais', 500);
      paisResults.value = sortPaisesForSelector(data || []);
      return;
    }
    const { data } = await CatalogsAPI.searchPaises(query, 50);
    paisResults.value = sortPaisesForSelector(data || []);
  } catch {
    paisResults.value = [];
  } finally {
    paisLoading.value = false;
  }
}

async function searchEntidades() {
  entidadLoading.value = true;
  try {
    const query = entidadQuery.value.trim();
    if (!query || query.length < 1) {
      const { data } = await CatalogsAPI.getEstados();
      entidadResults.value = [...entidadSentinels, ...(data || [])];
      return;
    }
    if (query.length < 2) {
      const { data } = await CatalogsAPI.getEstados();
      const lower = query.toLowerCase();
      entidadResults.value = [
        ...entidadSentinels,
        ...(data || []).filter(
          (e) =>
            e.code.toLowerCase().includes(lower) ||
            (e.description || '').toLowerCase().includes(lower),
        ),
      ];
      return;
    }
    const { data } = await CatalogsAPI.searchEstados(query, 50);
    entidadResults.value = [...entidadSentinels, ...(data || [])];
  } catch {
    entidadResults.value = [];
  } finally {
    entidadLoading.value = false;
  }
}

async function searchMunicipios() {
  if (!selectedEntidad.value?.code) {
    municipioResults.value = [];
    return;
  }
  municipioLoading.value = true;
  try {
    const query = municipioQuery.value.trim();
    if (!query || query.length < 2) {
      const { data } = await CatalogsAPI.getMunicipios(selectedEntidad.value.code);
      municipioResults.value = data || [];
      return;
    }
    const { data } = await CatalogsAPI.searchMunicipios(
      selectedEntidad.value.code,
      query,
      50,
    );
    municipioResults.value = data || [];
  } catch {
    municipioResults.value = [];
  } finally {
    municipioLoading.value = false;
  }
}

async function searchLocalidades() {
  if (!selectedEntidad.value?.code || !selectedMunicipio.value) {
    localidadResults.value = [];
    return;
  }
  localidadLoading.value = true;
  try {
    const municipioCode = getMunicipioDisplayCode(selectedMunicipio.value);
    const query = localidadQuery.value.trim();
    const { data } = await CatalogsAPI.getLocalidades(
      selectedEntidad.value.code,
      municipioCode,
      query.length >= 2 ? query : undefined,
    );
    localidadResults.value = data || [];
  } catch {
    localidadResults.value = [];
  } finally {
    localidadLoading.value = false;
  }
}

function selectEntidad(entry) {
  selectedEntidad.value = entry;
  entidadQuery.value = `${entry.description} (${entry.code})`;
  entidadResults.value = [];
  selectedMunicipio.value = null;
  municipioQuery.value = '';
  municipioResults.value = [];
  localidadQuery.value = '';
  localidadResults.value = [];
}

function selectMunicipio(entry) {
  selectedMunicipio.value = entry;
  const code = getMunicipioDisplayCode(entry);
  municipioQuery.value = `${entry.description} (${code})`;
  municipioResults.value = [];
  localidadQuery.value = '';
  localidadResults.value = [];
  searchLocalidades();
}

watch(paisQuery, () => {
  clearTimeout(paisDebounce);
  paisDebounce = setTimeout(searchPaises, 300);
});

watch(entidadQuery, () => {
  clearTimeout(entidadDebounce);
  entidadDebounce = setTimeout(searchEntidades, 300);
});

watch(municipioQuery, () => {
  clearTimeout(municipioDebounce);
  municipioDebounce = setTimeout(searchMunicipios, 300);
});

watch(localidadQuery, () => {
  clearTimeout(localidadDebounce);
  localidadDebounce = setTimeout(searchLocalidades, 300);
});

function onPaisFocus() {
  if (!paisResults.value.length) searchPaises();
}

function onEntidadFocus() {
  if (!entidadResults.value.length) searchEntidades();
}

function onMunicipioFocus() {
  if (!selectedEntidad.value) return;
  if (!municipioResults.value.length) searchMunicipios();
}

function onLocalidadFocus() {
  if (!selectedEntidad.value || !selectedMunicipio.value) return;
  if (!localidadResults.value.length) searchLocalidades();
}

async function downloadLocalidadesMunicipio() {
  if (!selectedEntidad.value?.code || !selectedMunicipio.value) {
    toast?.open?.({
      message: 'Seleccione entidad y municipio en el consultor para descargar localidades',
      type: 'error',
    });
    return;
  }
  await downloadCatalog('localidades', {
    entidadCode: selectedEntidad.value.code,
    municipioCode: getMunicipioDisplayCode(selectedMunicipio.value),
  });
}
</script>

<template>
  <div class="mb-6 rounded-lg border border-indigo-200 bg-indigo-50/60 dark:border-indigo-500/40 dark:bg-indigo-950/35 carga-masiva-codigos-sires">
    <button
      type="button"
      class="w-full flex items-center justify-between px-4 py-3 text-left text-indigo-900 dark:text-indigo-100 font-medium hover:bg-indigo-100/50 dark:hover:bg-indigo-900/25 transition-colors rounded-t-lg"
      @click="showConsultor = !showConsultor"
    >
      <span>Consultar códigos para la plantilla</span>
      <span class="text-sm text-indigo-600 dark:text-indigo-300">{{ showConsultor ? 'Ocultar' : 'Mostrar' }}</span>
    </button>

    <div v-show="showConsultor" class="px-4 pb-4 space-y-5 border-t border-indigo-100 dark:border-indigo-500/30">
      <p class="text-xs text-indigo-800 dark:text-indigo-200 pt-3">
        Busque el nombre y copie el código a las columnas de la plantilla SIRES.
      </p>

      <!-- País -->
      <div>
        <label class="block text-sm font-medium text-gray-800 dark:text-slate-200 mb-1">País</label>
        <p class="text-xs text-gray-600 dark:text-slate-400 mb-2">Columnas: <code class="text-indigo-700 dark:text-indigo-300">paisNacimiento</code>, <code class="text-indigo-700 dark:text-indigo-300">paisResidencia</code> (CATALOG_KEY)</p>
        <input
          v-model="paisQuery"
          type="text"
          placeholder="Buscar país..."
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:focus:ring-indigo-400/40"
          v-bind="paisInputAttrs"
          @focus="onPaisFocus"
        />
        <div v-if="paisLoading" class="text-xs text-gray-500 dark:text-slate-400 mt-1">Buscando...</div>
        <ul v-else-if="paisResults.length" class="mt-2 max-h-36 overflow-y-auto border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm shadow-sm">
          <li
            v-for="entry in paisResults"
            :key="`pais-${entry.code}`"
            class="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 dark:border-slate-700 last:border-0"
          >
            <div class="min-w-0">
              <span class="font-mono text-indigo-700 dark:text-indigo-300">{{ entry.code }}</span>
              <span class="text-gray-700 dark:text-slate-300 ml-2 truncate">{{ entry.description }}</span>
            </div>
            <button
              type="button"
              class="shrink-0 text-xs text-emerald-700 dark:text-emerald-400 hover:underline"
              @click="copyCode(entry.code, 'país')"
            >
              Copiar
            </button>
          </li>
        </ul>
      </div>

      <!-- Entidad -->
      <div>
        <label class="block text-sm font-medium text-gray-800 dark:text-slate-200 mb-1">Entidad federativa</label>
        <p class="text-xs text-gray-600 dark:text-slate-400 mb-2">Columnas: <code class="text-indigo-700 dark:text-indigo-300">entidadNacimiento</code>, <code class="text-indigo-700 dark:text-indigo-300">entidadResidencia</code></p>
        <input
          v-model="entidadQuery"
          type="text"
          placeholder="Buscar entidad..."
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:focus:ring-indigo-400/40"
          v-bind="entidadInputAttrs"
          @focus="onEntidadFocus"
        />
        <div v-if="entidadLoading" class="text-xs text-gray-500 dark:text-slate-400 mt-1">Buscando...</div>
        <ul v-else-if="entidadResults.length" class="mt-2 max-h-36 overflow-y-auto border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm shadow-sm">
          <li
            v-for="entry in entidadResults"
            :key="`ent-${entry.code}`"
            class="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 dark:border-slate-700 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-700/70 cursor-pointer"
            @click="selectEntidad(entry)"
          >
            <div class="min-w-0">
              <span class="font-mono text-indigo-700 dark:text-indigo-300">{{ entry.code }}</span>
              <span class="text-gray-700 dark:text-slate-300 ml-2 truncate">{{ entry.description }}</span>
            </div>
            <button
              type="button"
              class="shrink-0 text-xs text-emerald-700 dark:text-emerald-400 hover:underline"
              @click.stop="copyCode(entry.code, 'entidad')"
            >
              Copiar
            </button>
          </li>
        </ul>
      </div>

      <!-- Municipio -->
      <div>
        <label class="block text-sm font-medium text-gray-800 dark:text-slate-200 mb-1">Municipio</label>
        <p class="text-xs text-gray-600 dark:text-slate-400 mb-2">Columna: <code class="text-indigo-700 dark:text-indigo-300">municipioResidencia</code> (requiere entidad seleccionada)</p>
        <input
          v-model="municipioQuery"
          type="text"
          :placeholder="selectedEntidad ? 'Buscar municipio...' : 'Seleccione una entidad primero'"
          :disabled="!selectedEntidad"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 disabled:bg-gray-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:focus:ring-indigo-400/40"
          v-bind="municipioInputAttrs"
          @focus="onMunicipioFocus"
        />
        <div v-if="municipioLoading" class="text-xs text-gray-500 dark:text-slate-400 mt-1">Buscando...</div>
        <ul v-else-if="municipioResults.length" class="mt-2 max-h-36 overflow-y-auto border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm shadow-sm">
          <li
            v-for="entry in municipioResults"
            :key="`mun-${entry.code}`"
            class="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 dark:border-slate-700 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-700/70 cursor-pointer"
            @click="selectMunicipio(entry)"
          >
            <div class="min-w-0">
              <span class="font-mono text-indigo-700 dark:text-indigo-300">{{ getMunicipioDisplayCode(entry) }}</span>
              <span class="text-gray-700 dark:text-slate-300 ml-2 truncate">{{ entry.description }}</span>
            </div>
            <button
              type="button"
              class="shrink-0 text-xs text-emerald-700 dark:text-emerald-400 hover:underline"
              @click.stop="copyCode(getMunicipioDisplayCode(entry), 'municipio')"
            >
              Copiar
            </button>
          </li>
        </ul>
      </div>

      <!-- Localidad -->
      <div>
        <label class="block text-sm font-medium text-gray-800 dark:text-slate-200 mb-1">Localidad</label>
        <p class="text-xs text-gray-600 dark:text-slate-400 mb-2">Columna: <code class="text-indigo-700 dark:text-indigo-300">localidadResidencia</code> (requiere entidad y municipio)</p>
        <input
          v-model="localidadQuery"
          type="text"
          :placeholder="selectedMunicipio ? 'Buscar localidad...' : 'Seleccione entidad y municipio'"
          :disabled="!selectedMunicipio"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 disabled:bg-gray-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:focus:ring-indigo-400/40"
          v-bind="localidadInputAttrs"
          @focus="onLocalidadFocus"
        />
        <div v-if="localidadLoading" class="text-xs text-gray-500 dark:text-slate-400 mt-1">Buscando...</div>
        <ul v-else-if="localidadResults.length" class="mt-2 max-h-36 overflow-y-auto border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm shadow-sm">
          <li
            v-for="entry in localidadResults"
            :key="`loc-${entry.code}`"
            class="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 dark:border-slate-700 last:border-0"
          >
            <div class="min-w-0">
              <span class="font-mono text-indigo-700 dark:text-indigo-300">{{ getLocalidadDisplayCode(entry) }}</span>
              <span class="text-gray-700 dark:text-slate-300 ml-2 truncate">{{ entry.description }}</span>
            </div>
            <button
              type="button"
              class="shrink-0 text-xs text-emerald-700 dark:text-emerald-400 hover:underline"
              @click="copyCode(getLocalidadDisplayCode(entry), 'localidad')"
            >
              Copiar
            </button>
          </li>
        </ul>
      </div>
    </div>

    <div class="border-t border-indigo-100 dark:border-indigo-500/30">
      <button
        type="button"
        class="w-full flex items-center justify-between px-4 py-3 text-left text-sm text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/25 transition-colors"
        @click="showDownloads = !showDownloads"
      >
        <span>Descargar catálogos de referencia (CSV)</span>
        <span class="text-indigo-600 dark:text-indigo-300">{{ showDownloads ? 'Ocultar' : 'Mostrar' }}</span>
      </button>
      <div v-show="showDownloads" class="px-4 pb-4 space-y-2">
        <p class="text-xs text-gray-600 dark:text-slate-400">
          Use estos archivos como referencia al llenar la plantilla. Los códigos coinciden con los que valida el sistema.
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="text-xs px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
            :disabled="downloadLoading === 'paises'"
            @click="downloadCatalog('paises')"
          >
            Países
          </button>
          <button
            type="button"
            class="text-xs px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
            :disabled="downloadLoading === 'entidades'"
            @click="downloadCatalog('entidades')"
          >
            Entidades
          </button>
          <button
            type="button"
            class="text-xs px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
            :disabled="downloadLoading === 'municipios'"
            @click="downloadCatalog('municipios')"
          >
            Municipios
          </button>
          <button
            type="button"
            class="text-xs px-3 py-1.5 border border-indigo-300 dark:border-indigo-500/50 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 disabled:opacity-50 transition-colors"
            :disabled="downloadLoading === 'localidades' || !selectedMunicipio"
            @click="downloadLocalidadesMunicipio"
          >
            Localidades (municipio seleccionado)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
