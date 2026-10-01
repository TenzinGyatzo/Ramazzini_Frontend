<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import ProveedorSaludAPI from '@/api/ProveedorSaludAPI';
import PlatformTenantRow from '@/components/platform/PlatformTenantRow.vue';
import PlatformTenantDrawer from '@/components/platform/PlatformTenantDrawer.vue';
import { usePlatformContext } from '@/composables/usePlatformContext';
import {
  getCachedPanelDetails,
  setCachedPanelDetails,
  invalidatePanelAdminCache,
} from '@/composables/usePanelAdminCache';
import {
  DIAS_AVISO_PERIODO,
  FILTROS_CONTRATACION,
  calcularMetricas,
  etiquetaFiltroContratacion,
  filtrarYOrdenar,
  guardarPreferencias,
  leerPreferencias,
} from '@/utils/platformConsole';

const userStore = useUserStore();
const router = useRouter();
const proveedorSaludStore = useProveedorSaludStore();
const { activeTenant, enterTenant } = usePlatformContext();

const proveedores = ref([]);
const isLoading = ref(true);
const isRefreshing = ref(false);
const error = ref(null);
const errorDetalle = ref(null);
const ultimaActualizacion = ref(null);

const redirigirSiNoEsAdmin = () => {
  if (userStore.user?.role !== 'Administrador') {
    router.push({ name: 'inicio' });
  }
};

// Preferencias de búsqueda/filtro/orden recordadas en este navegador
const prefs = ref(leerPreferencias());
watch(prefs, (valor) => guardarPreferencias(valor), { deep: true });

const FILTROS = [
  { clave: 'todos', etiqueta: 'Todos' },
  { clave: 'activos', etiqueta: 'Plan vigente' },
  { clave: 'gratuito', etiqueta: 'Periodo gratuito' },
  { clave: 'cancelados', etiqueta: 'Canceladas' },
  { clave: 'gratuito_vencido', etiqueta: 'Gratuito vencido' },
  { clave: 'sin_acceso', etiqueta: 'Sin acceso' },
  { clave: 'restringidos', etiqueta: 'Restringidos' },
  { clave: 'contratos', etiqueta: 'Con contrato' },
  { clave: 'por_renovar', etiqueta: 'Por renovar' },
  { clave: 'facturas_pendientes', etiqueta: 'Facturas pendientes' },
  { clave: 'manual_heredado', etiqueta: 'Manual (heredado)' },
  { clave: 'pago_en_linea', etiqueta: 'Pago en línea' },
  { clave: 'con_ajustes', etiqueta: 'Con ajustes' },
  { clave: 'atencion', etiqueta: 'Requieren atención' },
];
const ORDENES = [
  { clave: 'nombre', etiqueta: 'Nombre' },
  { clave: 'uso', etiqueta: 'Uso de HC (%)' },
  { clave: 'historias_mes', etiqueta: 'HC este mes' },
  { clave: 'vencimiento', etiqueta: 'Próximo vencimiento' },
  { clave: 'registro', etiqueta: 'Registro más reciente' },
];

const metricas = computed(() => calcularMetricas(proveedores.value));
const visibles = computed(() => filtrarYOrdenar(proveedores.value, prefs.value));
const hayFiltros = computed(
  () =>
    !!prefs.value.busqueda.trim() ||
    prefs.value.filtro !== 'todos' ||
    prefs.value.regimen !== 'todos' ||
    prefs.value.contratacion !== 'todas',
);
const detallesCargados = computed(() => proveedores.value.every((p) => p._detalleCargado));

function seleccionarFiltro(filtro) {
  prefs.value.filtro = prefs.value.filtro === filtro ? 'todos' : filtro;
}
function limpiarFiltros() {
  prefs.value = { ...prefs.value, busqueda: '', filtro: 'todos', regimen: 'todos', contratacion: 'todas' };
}

const horaActualizacion = computed(() =>
  ultimaActualizacion.value
    ? ultimaActualizacion.value.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    : null,
);

function mapDetalleEnProveedor(base, detalle) {
  const principalUser = detalle.principalUser ?? null;
  return {
    ...base,
    _detalleCargado: true,
    empresasCount: detalle.empresasCount ?? 0,
    principalUser,
    historiasClinicasMes: detalle.historiasClinicasMes ?? 0,
    notasMedicasMes: detalle.notasMedicasMes ?? 0,
    todasLasHistoriasClinicas: detalle.totalHistoriasClinicas ?? 0,
    todasLasNotasMedicas: detalle.totalNotasMedicas ?? 0,
    historiasPorMes: detalle.historiasPorMes ?? [],
    notasPorMes: detalle.notasPorMes ?? [],
    usuariosPorRol: detalle.usuariosPorRol ?? {},
    usuariosTotal: detalle.usuariosTotal ?? 0,
    historiasContratadas: detalle.historiasContratadas ?? null,
    historiasCortesia: detalle.historiasCortesia ?? 0,
    contratoPrivado: detalle.contratoPrivado ?? null,
    facturasPendientes: detalle.facturasPendientes ?? 0,
    suscripcion: detalle.suscripcion ?? null,
    suscripcionActivaId: base.suscripcionActiva ?? null,
    limiteHistoriasEfectivo: detalle.limiteHistoriasEfectivo ?? null,
    fechaFinTrialEfectiva: detalle.fechaFinTrialEfectiva ?? null,
  };
}

function mergeDetalleEnProveedores(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const byId = new Map(rows.map((row) => [String(row._id), row]));
  proveedores.value = proveedores.value.map((p) => {
    const detalle = byId.get(String(p._id));
    return detalle ? mapDetalleEnProveedor(p, detalle) : p;
  });
}

/** Detalle de todos los proveedores en una sola llamada (agregaciones por lote en el backend). */
async function cargarDetalles() {
  const ids = proveedores.value.map((p) => String(p._id));
  if (!ids.length) return;
  errorDetalle.value = null;

  const cached = getCachedPanelDetails(ids);
  if (cached) {
    mergeDetalleEnProveedores(ids.map((id) => ({ _id: id, ...cached[id] })));
    return;
  }
  try {
    const { data } = await ProveedorSaludAPI.getPanelAdmin();
    const rows = Array.isArray(data) ? data : [];
    setCachedPanelDetails(rows);
    mergeDetalleEnProveedores(rows);
  } catch (err) {
    console.error('Error al cargar detalle del panel admin:', err);
    errorDetalle.value = 'No se pudo cargar el uso y los usuarios de los proveedores.';
  }
}

async function cargarProveedores(force = false) {
  try {
    if (force) invalidatePanelAdminCache();
    isLoading.value = true;
    error.value = null;

    const lista = await proveedorSaludStore.getAllProveedores();
    proveedores.value = (Array.isArray(lista) ? lista : []).map((p) => ({
      ...p,
      _detalleCargado: false,
      suscripcion: null,
      suscripcionActivaId: p.suscripcionActiva ?? null,
    }));
  } catch (err) {
    console.error('Error al cargar proveedores:', err);
    error.value = 'Error al cargar los datos de los proveedores. Por favor, intenta de nuevo.';
    return;
  } finally {
    isLoading.value = false;
  }
  // La lista ya es visible; el detalle se completa sin bloquearla
  await cargarDetalles();
  ultimaActualizacion.value = new Date();
}

async function actualizarPanel() {
  isRefreshing.value = true;
  try {
    await cargarProveedores(true);
  } finally {
    isRefreshing.value = false;
  }
}

// Detalle lateral
const seleccionadoId = ref(null);
const seleccionado = computed(
  () => proveedores.value.find((p) => String(p._id) === seleccionadoId.value) ?? null,
);

async function abrirDetalle(proveedor, { irAAjustes = false } = {}) {
  seleccionadoId.value = String(proveedor._id);
  if (!irAAjustes) return;
  await nextTick();
  document.getElementById('drawer-ajustes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function cerrarDetalle() {
  seleccionadoId.value = null;
}

/** Tras guardar ajustes de plataforma: refleja los valores nuevos sin recargar la consola. */
function aplicarAjustes(ajustes) {
  if (!ajustes?.id) return;
  invalidatePanelAdminCache();
  proveedores.value = proveedores.value.map((p) =>
    String(p._id) === String(ajustes.id)
      ? {
          ...p,
          // El servidor convierte el límite heredado a cortesía al guardar
          limiteHistoriasManual: null,
          historiasCortesia: ajustes.historiasCortesia,
          historiasContratadas: null,
          fechaFinTrial: ajustes.fechaFinTrial,
          restriccionManual: ajustes.restriccionManual,
          pagoEnLineaHabilitado: ajustes.pagoEnLineaHabilitado,
          periodoDePruebaFinalizado: ajustes.periodoDePruebaFinalizado,
          limiteHistoriasEfectivo: ajustes.limiteHistoriasEfectivo,
          fechaFinTrialEfectiva: ajustes.fechaFinTrialEfectiva,
        }
      : p,
  );
}

/** Tras guardar contrato, pagos o facturas: refleja contratación, límite y facturas en la fila. */
function aplicarContratacion(datos) {
  if (!datos?.id) return;
  invalidatePanelAdminCache();
  const facturasPendientes = (datos.pagos ?? []).filter(
    (p) => !p.anulado && p.factura?.estado === 'pendiente',
  ).length;
  proveedores.value = proveedores.value.map((p) =>
    String(p._id) === String(datos.id)
      ? {
          ...p,
          contrato: datos.contrato,
          contratoPrivado: datos.privado
            ? {
                formaPago: datos.privado.formaPago,
                requiereFactura: datos.privado.requiereFactura,
                montoPeriodo: datos.privado.montoPeriodo,
              }
            : null,
          facturasPendientes,
          estadoSuscripcion: datos.mercadoPago?.estadoSuscripcion ?? null,
          limiteHistoriasEfectivo: datos.historias?.efectivo ?? null,
          historiasContratadas: datos.historias?.base ?? null,
          historiasCortesia: datos.historias?.cortesia ?? 0,
        }
      : p,
  );
}

const entrandoId = ref(null);
async function entrar(proveedor) {
  if (entrandoId.value) return;
  entrandoId.value = String(proveedor._id);
  try {
    await enterTenant(String(proveedor._id));
  } catch (err) {
    console.error('No se pudo entrar al espacio del proveedor:', err);
    entrandoId.value = null;
  }
}

const esActivo = (proveedor) => activeTenant.value?.id === String(proveedor._id);

redirigirSiNoEsAdmin();

onMounted(() => {
  cargarProveedores();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-4 text-gray-900 sm:p-6 dark:bg-slate-950 dark:text-slate-100">
    <!-- Encabezado -->
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold sm:text-3xl">Consola de plataforma</h1>
        <p class="text-sm text-gray-500 dark:text-slate-400">
          {{ metricas.total }} proveedores de salud
          <template v-if="horaActualizacion"> · actualizado a las {{ horaActualizacion }}</template>
        </p>
      </div>
      <div class="flex flex-wrap gap-2 self-start sm:self-auto">
      <RouterLink
        :to="{ name: 'registros-administrador' }"
        data-testid="consola-registros"
        class="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>
        Registros
      </RouterLink>
      <button
        type="button"
        data-testid="consola-actualizar"
        class="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        :disabled="isLoading || isRefreshing"
        @click="actualizarPanel"
      >
        <i class="fa-solid fa-rotate" :class="{ 'animate-spin': isRefreshing }" aria-hidden="true"></i>
        {{ isRefreshing ? 'Actualizando…' : 'Actualizar' }}
      </button>
      </div>
    </div>

    <div v-if="isLoading && !proveedores.length" class="flex flex-col items-center justify-center py-16">
      <div class="h-12 w-12 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600"></div>
      <p class="mt-4 text-gray-500 dark:text-slate-400">Cargando proveedores…</p>
    </div>

    <div v-else-if="error" class="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/40">
      <h3 class="mb-2 text-lg font-semibold text-red-800 dark:text-red-300">Error al cargar datos</h3>
      <p class="mb-4 text-red-600 dark:text-red-400">{{ error }}</p>
      <button type="button" class="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700" @click="cargarProveedores(true)">
        Reintentar
      </button>
    </div>

    <template v-else>
      <!-- Indicadores (cada uno filtra la lista) -->
      <div class="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7" data-testid="consola-metricas">
        <button type="button" class="kpi" :class="{ 'kpi-activo': prefs.filtro === 'activos' }" @click="seleccionarFiltro('activos')">
          <span class="kpi-titulo">Plan vigente</span>
          <span class="kpi-valor">{{ metricas.activos }}</span>
        </button>
        <button type="button" class="kpi" :class="{ 'kpi-activo': prefs.filtro === 'gratuito' }" @click="seleccionarFiltro('gratuito')">
          <span class="kpi-titulo">Periodo gratuito</span>
          <span class="kpi-valor">{{ metricas.gratuito }}</span>
          <span v-if="metricas.gratuitoPorVencer" class="text-xs text-amber-700 dark:text-amber-400">
            {{ metricas.gratuitoPorVencer }} vencen en ≤ {{ DIAS_AVISO_PERIODO }} días
          </span>
        </button>
        <button type="button" class="kpi" :class="{ 'kpi-activo': prefs.filtro === 'sin_acceso' }" @click="seleccionarFiltro('sin_acceso')">
          <span class="kpi-titulo">Sin acceso</span>
          <span class="kpi-valor">{{ metricas.sinAcceso }}</span>
          <span class="text-xs text-gray-400 dark:text-slate-500">vencidos, cancelados o restringidos</span>
        </button>
        <button type="button" class="kpi" :class="{ 'kpi-activo': prefs.filtro === 'atencion' }" @click="seleccionarFiltro('atencion')">
          <span class="kpi-titulo">Requieren atención</span>
          <span class="kpi-valor" :class="metricas.atencion ? 'text-amber-600 dark:text-amber-400' : ''">{{ metricas.atencion }}</span>
        </button>
        <button type="button" class="kpi" :class="{ 'kpi-activo': prefs.filtro === 'por_renovar' }" @click="seleccionarFiltro('por_renovar')">
          <span class="kpi-titulo">Por renovar</span>
          <span class="kpi-valor" :class="metricas.porRenovar ? 'text-amber-600 dark:text-amber-400' : ''">{{ metricas.porRenovar }}</span>
          <span class="text-xs text-gray-400 dark:text-slate-500">contratos que vencen pronto</span>
        </button>
        <button type="button" class="kpi" :class="{ 'kpi-activo': prefs.filtro === 'facturas_pendientes' }" @click="seleccionarFiltro('facturas_pendientes')">
          <span class="kpi-titulo">Facturas pendientes</span>
          <span class="kpi-valor" :class="metricas.facturasPendientes ? 'text-amber-600 dark:text-amber-400' : ''" data-testid="kpi-facturas">
            <template v-if="detallesCargados">{{ metricas.facturasPendientes }}</template>
            <span v-else class="inline-block h-7 w-12 animate-pulse rounded bg-gray-100 dark:bg-slate-800"></span>
          </span>
        </button>
        <div class="kpi cursor-default">
          <span class="kpi-titulo">HC este mes</span>
          <span class="kpi-valor">
            <template v-if="detallesCargados">{{ metricas.historiasMes }}</template>
            <span v-else class="inline-block h-7 w-12 animate-pulse rounded bg-gray-100 dark:bg-slate-800"></span>
          </span>
        </div>
      </div>

      <!-- Búsqueda, régimen y orden -->
      <div class="mb-3 flex flex-col gap-2 md:flex-row md:items-center">
        <label class="relative flex-1">
          <span class="sr-only">Buscar proveedor</span>
          <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" aria-hidden="true"></i>
          <input
            v-model="prefs.busqueda"
            type="search"
            data-testid="consola-busqueda"
            placeholder="Buscar por nombre, correo, teléfono, país o usuario principal"
            class="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-sky-900"
          />
        </label>
        <div class="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <select v-model="prefs.regimen" aria-label="Régimen" class="consola-select">
            <option value="todos">Todos los regímenes</option>
            <option value="SIRES_NOM024">SIRES (NOM-024)</option>
            <option value="SIN_REGIMEN">Sin régimen</option>
          </select>
          <select v-model="prefs.contratacion" aria-label="Forma de contratación" data-testid="consola-contratacion" class="consola-select">
            <option v-for="c in FILTROS_CONTRATACION" :key="c" :value="c">{{ etiquetaFiltroContratacion(c) }}</option>
          </select>
          <select v-model="prefs.orden" aria-label="Ordenar por" class="consola-select">
            <option v-for="o in ORDENES" :key="o.clave" :value="o.clave">Orden: {{ o.etiqueta }}</option>
          </select>
        </div>
      </div>

      <!-- Filtros por estado -->
      <div class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado" data-testid="consola-filtros">
        <button
          v-for="f in FILTROS"
          :key="f.clave"
          type="button"
          class="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
          :class="
            prefs.filtro === f.clave
              ? 'border-sky-600 bg-sky-600 text-white dark:border-sky-500 dark:bg-sky-600'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
          "
          :aria-pressed="prefs.filtro === f.clave"
          @click="prefs.filtro = f.clave"
        >
          {{ f.etiqueta }}
          <span class="ml-1 tabular-nums opacity-75">{{ metricas.conteoPorFiltro[f.clave] }}</span>
        </button>
      </div>

      <p v-if="errorDetalle" class="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        {{ errorDetalle }}
        <button type="button" class="underline" @click="cargarDetalles">Reintentar</button>
      </p>

      <!-- Lista: tabla en escritorio, tarjetas en móvil -->
      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900" role="table" aria-label="Proveedores de salud">
        <div
          role="row"
          class="hidden gap-4 border-b border-gray-100 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-400 md:grid md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)_minmax(0,1.6fr)_minmax(0,0.8fr)_auto] dark:border-slate-800 dark:text-slate-500"
        >
          <span role="columnheader">Proveedor</span>
          <span role="columnheader">Estado</span>
          <span role="columnheader">HC del mes</span>
          <span role="columnheader">Equipo</span>
          <span role="columnheader" class="w-[7.5rem] text-right">Acciones</span>
        </div>
        <div class="divide-y divide-gray-100 dark:divide-slate-800" role="rowgroup">
          <PlatformTenantRow
            v-for="p in visibles"
            :key="p._id"
            :proveedor="p"
            :seleccionado="seleccionadoId === String(p._id)"
            :activo="esActivo(p)"
            :entrando="entrandoId === String(p._id)"
            @abrir="abrirDetalle(p)"
            @ajustes="abrirDetalle(p, { irAAjustes: true })"
            @entrar="entrar(p)"
          />
        </div>
        <div v-if="!visibles.length" class="px-4 py-12 text-center" data-testid="consola-vacio">
          <template v-if="proveedores.length">
            <p class="font-medium">Ningún proveedor coincide con los filtros.</p>
            <button v-if="hayFiltros" type="button" class="mt-2 text-sm text-sky-700 underline dark:text-sky-400" @click="limpiarFiltros">
              Limpiar filtros
            </button>
          </template>
          <template v-else>
            <p class="font-medium">No hay proveedores registrados</p>
            <p class="text-sm text-gray-500 dark:text-slate-400">Aún no se han registrado proveedores en el sistema.</p>
          </template>
        </div>
      </div>
      <p v-if="visibles.length && hayFiltros" class="mt-2 text-xs text-gray-500 dark:text-slate-400">
        Mostrando {{ visibles.length }} de {{ metricas.total }}.
        <button type="button" class="underline" @click="limpiarFiltros">Limpiar filtros</button>
      </p>
    </template>

    <PlatformTenantDrawer
      v-if="seleccionado"
      :proveedor="seleccionado"
      @close="cerrarDetalle"
      @ajustes-actualizados="aplicarAjustes"
      @contratacion-actualizada="aplicarContratacion"
    />
  </div>
</template>

<style scoped>
.kpi {
  @apply flex flex-col items-start gap-0.5 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-sky-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-700;
}
.kpi-activo {
  @apply border-sky-500 ring-2 ring-sky-100 dark:border-sky-500 dark:ring-sky-900;
}
.kpi-titulo {
  @apply text-xs font-medium text-gray-500 dark:text-slate-400;
}
.kpi-valor {
  @apply text-2xl font-semibold tabular-nums text-gray-900 dark:text-slate-100;
}
.consola-select {
  @apply rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900;
}
</style>
