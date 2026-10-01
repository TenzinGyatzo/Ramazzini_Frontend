<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { useProveedorSaludStore } from "@/stores/proveedorSalud";
import PlataformaAPI, { type VerificacionRegistros } from "@/api/PlataformaAPI";
import {
  CATEGORIAS_REGISTRO,
  etiquetaCategoria,
  etiquetaEvento,
  rangoDeFechas,
  rangoDePeriodo,
  resumenEvento,
  type PeriodoRapido,
  type RegistroPlataforma,
} from "@/utils/platformRegistros";

/**
 * Registros de Administrador: bitácora de plataforma (lo que el Administrador hace y
 * que ningún tenant ve). Solo consulta, exportación y verificación de la cadena.
 */
const userStore = useUserStore();
const proveedorSaludStore = useProveedorSaludStore();
const router = useRouter();
const route = useRoute();

if (userStore.user?.role !== "Administrador") {
  router.push({ name: "inicio" });
}

const LIMITE = 50;
const registros = ref<RegistroPlataforma[]>([]);
const total = ref(0);
const pagina = ref(1);
const cargando = ref(false);
const error = ref<string | null>(null);
const abierto = ref<string | null>(null);

// Filtros
const periodo = ref<PeriodoRapido>("30d");
const desde = ref("");
const hasta = ref("");
const tenantId = ref(typeof route.query.tenantId === "string" ? route.query.tenantId : "");
const categoria = ref("");
const soloCambios = ref(true);
const texto = ref("");

const proveedores = ref<Array<{ _id: string; nombre: string }>>([]);

const PERIODOS: Array<{ clave: PeriodoRapido; etiqueta: string }> = [
  { clave: "hoy", etiqueta: "Hoy" },
  { clave: "7d", etiqueta: "7 días" },
  { clave: "30d", etiqueta: "30 días" },
  { clave: "rango", etiqueta: "Rango" },
];

/** Periodo elegido; null si el rango manual está incompleto o invertido. */
const rango = computed(() =>
  periodo.value === "rango" ? rangoDeFechas(desde.value, hasta.value) : rangoDePeriodo(periodo.value),
);
const paginas = computed(() => Math.max(1, Math.ceil(total.value / LIMITE)));

let solicitud = 0;
async function cargar() {
  if (!rango.value) {
    registros.value = [];
    total.value = 0;
    return;
  }
  const actual = ++solicitud;
  cargando.value = true;
  error.value = null;
  try {
    const { data } = await PlataformaAPI.getRegistros({
      ...rango.value,
      ...(tenantId.value ? { tenantId: tenantId.value } : {}),
      ...(categoria.value ? { categoria: categoria.value } : {}),
      soloCambios: soloCambios.value,
      ...(texto.value.trim() ? { q: texto.value.trim() } : {}),
      page: pagina.value,
      limit: LIMITE,
    });
    if (actual !== solicitud) return; // llegó una respuesta de filtros anteriores
    registros.value = data.items;
    total.value = data.total;
  } catch (err: any) {
    if (actual !== solicitud) return;
    error.value = err?.response?.data?.message ?? "No se pudieron cargar los registros.";
  } finally {
    if (actual === solicitud) cargando.value = false;
  }
}

// Cambiar un filtro vuelve a la primera página; el texto espera a que se deje de escribir
let esperaTexto: ReturnType<typeof setTimeout> | undefined;
watch([periodo, desde, hasta, tenantId, categoria, soloCambios], () => {
  pagina.value = 1;
  verificacion.value = null;
  cargar();
});
watch(texto, () => {
  clearTimeout(esperaTexto);
  esperaTexto = setTimeout(() => {
    pagina.value = 1;
    cargar();
  }, 350);
});

function irAPagina(nueva: number) {
  if (nueva < 1 || nueva > paginas.value || nueva === pagina.value) return;
  pagina.value = nueva;
  cargar();
}

// Exportación y verificación (sobre el periodo elegido, sin los demás filtros)
const formato = ref<"csv" | "json">("csv");
const exportando = ref(false);
const verificando = ref(false);
const verificacion = ref<VerificacionRegistros | null>(null);
const errorAccion = ref<string | null>(null);

async function exportar() {
  if (!rango.value || exportando.value) return;
  exportando.value = true;
  errorAccion.value = null;
  try {
    const blob = await PlataformaAPI.exportarRegistros({ ...rango.value, format: formato.value });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `registros-administrador.${formato.value}`;
    enlace.click();
    URL.revokeObjectURL(url);
  } catch (err: any) {
    errorAccion.value = err?.response?.data?.message ?? "No se pudo exportar.";
  } finally {
    exportando.value = false;
  }
}

async function verificar() {
  if (!rango.value || verificando.value) return;
  verificando.value = true;
  errorAccion.value = null;
  verificacion.value = null;
  try {
    const { data } = await PlataformaAPI.verificarRegistros(rango.value);
    verificacion.value = data;
  } catch (err: any) {
    errorAccion.value = err?.response?.data?.message ?? "No se pudo verificar la cadena.";
  } finally {
    verificando.value = false;
  }
}

const fechaHora = (valor: string) =>
  new Date(valor).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const TONO_CATEGORIA: Record<string, string> = {
  ajustes: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  contratacion: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  catalogos: "bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300",
  tenant: "bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  seguridad: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};
const tono = (clave: string) => TONO_CATEGORIA[clave] ?? "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300";

onMounted(async () => {
  cargar();
  const lista = await proveedorSaludStore.getAllProveedores();
  proveedores.value = (Array.isArray(lista) ? lista : [])
    .map((p: any) => ({ _id: String(p._id), nombre: p.nombre ?? "Sin nombre" }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
});

const campo =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900";
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-4 text-gray-900 sm:p-6 dark:bg-slate-950 dark:text-slate-100">
    <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold sm:text-3xl">Registros de Administrador</h1>
        <p class="text-sm text-gray-500 dark:text-slate-400">
          Lo que haces en la plataforma y que ningún proveedor ve en su bitácora. Solo consulta.
        </p>
      </div>
      <RouterLink
        :to="{ name: 'panel-administrador' }"
        class="inline-flex items-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:self-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Consola
      </RouterLink>
    </div>

    <!-- Filtros -->
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <div class="inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700" role="group" aria-label="Periodo">
        <button
          v-for="p in PERIODOS"
          :key="p.clave"
          type="button"
          :data-testid="`registros-periodo-${p.clave}`"
          class="px-3 py-2 text-sm"
          :class="periodo === p.clave ? 'bg-sky-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'"
          :aria-pressed="periodo === p.clave"
          @click="periodo = p.clave"
        >
          {{ p.etiqueta }}
        </button>
      </div>
      <template v-if="periodo === 'rango'">
        <input v-model="desde" type="date" aria-label="Desde" data-testid="registros-desde" :class="campo" />
        <input v-model="hasta" type="date" aria-label="Hasta" data-testid="registros-hasta" :class="campo" />
      </template>
      <select v-model="tenantId" aria-label="Proveedor" data-testid="registros-tenant" :class="campo">
        <option value="">Todos los proveedores</option>
        <option v-for="p in proveedores" :key="p._id" :value="p._id">{{ p.nombre }}</option>
      </select>
      <select v-model="categoria" aria-label="Categoría" data-testid="registros-categoria" :class="campo">
        <option value="">{{ soloCambios ? "Todos los cambios" : "Todas las categorías" }}</option>
        <option v-for="c in CATEGORIAS_REGISTRO" :key="c.clave" :value="c.clave">{{ c.etiqueta }}</option>
      </select>
      <input
        v-model="texto"
        type="search"
        data-testid="registros-texto"
        placeholder="Buscar por proveedor, catálogo, código o evento"
        class="min-w-[12rem] flex-1"
        :class="campo"
      />
    </div>

    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
        <input v-model="soloCambios" type="checkbox" data-testid="registros-solo-cambios" class="h-4 w-4" :disabled="!!categoria" />
        Solo cambios
        <span class="text-xs text-gray-400 dark:text-slate-500">(sin sesión, entradas y salidas, ni descargas)</span>
      </label>
      <div class="flex flex-wrap items-center gap-2">
        <select v-model="formato" aria-label="Formato de exportación" :class="campo">
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
        <button type="button" data-testid="registros-exportar" :class="campo" class="disabled:opacity-50" :disabled="!rango || exportando" @click="exportar">
          <i class="fa-solid fa-download" aria-hidden="true"></i> {{ exportando ? "Exportando…" : "Exportar periodo" }}
        </button>
        <button type="button" data-testid="registros-verificar" :class="campo" class="disabled:opacity-50" :disabled="!rango || verificando" @click="verificar">
          <i class="fa-solid fa-link" aria-hidden="true"></i> {{ verificando ? "Verificando…" : "Verificar cadena" }}
        </button>
      </div>
    </div>

    <p v-if="!rango" class="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
      Indica las dos fechas del rango (la segunda no puede ser anterior a la primera).
    </p>
    <p v-if="errorAccion" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{{ errorAccion }}</p>
    <div
      v-if="verificacion"
      data-testid="registros-verificacion"
      class="mb-3 rounded-lg px-3 py-2 text-sm"
      :class="verificacion.valid ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'"
    >
      <template v-if="verificacion.valid">
        <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
        Cadena íntegra: {{ verificacion.total ?? 0 }} eventos del periodo, sin alteraciones.
      </template>
      <template v-else>
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        Se encontraron {{ verificacion.errors?.length ?? 0 }} inconsistencias en el periodo. Exporta el periodo y revísalo.
      </template>
      <span v-if="verificacion.encadenadoDesde" class="block text-xs opacity-80">
        Los eventos están ligados entre sí desde el {{ fechaHora(verificacion.encadenadoDesde) }}; los anteriores conservan su sello individual.
      </span>
    </div>

    <!-- Lista -->
    <div class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div class="hidden gap-4 border-b border-gray-100 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-400 md:grid md:grid-cols-[11rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,2fr)] dark:border-slate-800 dark:text-slate-500">
        <span>Fecha y hora</span>
        <span>Evento</span>
        <span>Proveedor</span>
        <span>Detalle</span>
      </div>

      <p v-if="cargando && !registros.length" class="px-4 py-10 text-center text-gray-500 dark:text-slate-400">Cargando registros…</p>
      <div v-else-if="error" class="px-4 py-10 text-center">
        <p class="text-red-600 dark:text-red-400">{{ error }}</p>
        <button type="button" class="mt-2 text-sm underline" @click="cargar">Reintentar</button>
      </div>
      <p v-else-if="!registros.length" data-testid="registros-vacio" class="px-4 py-10 text-center text-gray-500 dark:text-slate-400">
        No hay registros con estos filtros.
        <template v-if="soloCambios && !categoria"> Desmarca «Solo cambios» para ver también sesión, entradas y descargas.</template>
      </p>

      <ul v-else class="divide-y divide-gray-100 dark:divide-slate-800" :class="{ 'opacity-60': cargando }">
        <li v-for="r in registros" :key="r._id" data-testid="registro-fila">
          <button
            type="button"
            class="grid w-full grid-cols-1 gap-1 px-4 py-3 text-left text-sm hover:bg-gray-50 md:grid-cols-[11rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,2fr)] md:gap-4 dark:hover:bg-slate-800/60"
            :aria-expanded="abierto === r._id"
            @click="abierto = abierto === r._id ? null : r._id"
          >
            <span class="tabular-nums text-gray-500 dark:text-slate-400">{{ fechaHora(r.timestamp) }}</span>
            <span class="flex flex-wrap items-center gap-1.5">
              <span class="font-medium text-gray-900 dark:text-slate-100">{{ etiquetaEvento(r) }}</span>
              <span class="rounded-md px-1.5 py-0.5 text-[11px]" :class="tono(r.categoria)">{{ etiquetaCategoria(r.categoria) }}</span>
            </span>
            <span class="truncate text-gray-700 dark:text-slate-300">{{ r.tenantNombre || (r.tenantId ? "Proveedor eliminado" : "—") }}</span>
            <span class="text-gray-600 dark:text-slate-400">{{ resumenEvento(r) || "—" }}</span>
          </button>
          <div v-if="abierto === r._id" data-testid="registro-detalle" class="space-y-2 bg-gray-50 px-4 py-3 text-xs dark:bg-slate-950/60">
            <p class="text-gray-500 dark:text-slate-400">
              {{ r.actionType }} · por {{ r.actor || "—" }} ·
              {{ r.encadenado ? "ligado al evento anterior" : "sello individual" }}
            </p>
            <pre class="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-gray-800 dark:bg-slate-900 dark:text-slate-200">{{ JSON.stringify(r.payload ?? {}, null, 2) }}</pre>
            <p class="break-all text-gray-400 dark:text-slate-500">Sello: {{ r.hashEvento }}</p>
          </div>
        </li>
      </ul>
    </div>

    <!-- Paginación -->
    <div v-if="total > 0" class="mt-3 flex items-center justify-between text-sm text-gray-500 dark:text-slate-400">
      <span data-testid="registros-total">{{ total }} {{ total === 1 ? "registro" : "registros" }}</span>
      <div v-if="paginas > 1" class="flex items-center gap-2">
        <button type="button" class="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-slate-700" :disabled="pagina <= 1" @click="irAPagina(pagina - 1)">Anterior</button>
        <span class="tabular-nums">{{ pagina }} / {{ paginas }}</span>
        <button type="button" data-testid="registros-siguiente" class="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-slate-700" :disabled="pagina >= paginas" @click="irAPagina(pagina + 1)">Siguiente</button>
      </div>
    </div>
  </div>
</template>
