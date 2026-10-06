<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import InventarioAPI from '@/api/InventarioAPI';
import InventarioModal from '@/components/inventario/InventarioModal.vue';
import { useInventarioStore } from '@/stores/inventario';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useRolePermissions } from '@/composables/useRolePermissions';
import { extractApiErrorMessage } from '@/helpers/apiErrors';
import {
  CATEGORIAS_INSUMO,
  MOTIVOS_BAJA,
  cantidadConSigno,
  cantidadConUnidad,
  consumoACsv,
  estadoInsumoVisual,
  estadoLoteVisual,
  etiquetaCategoria,
  etiquetaMovimiento,
  filtrarExistencias,
  formatearCaducidad,
  formatearFechaHora,
  loteVisible,
  normalizarLote,
  periodoMesEnCurso,
  type FiltroExistencias,
} from '@/helpers/inventario';
import type {
  DetalleInsumo,
  FilaExistencia,
  LoteInventario,
  MovimientoInventario,
  PaginaMovimientos,
  ReporteConsumo,
} from '@/interfaces/inventario.interface';

const toast: any = inject('toast');
const route = useRoute();
const inventario = useInventarioStore();
const centros = useCentrosTrabajoStore();
const { canManageInventario } = useRolePermissions();

const idEmpresa = computed(() => String(route.params.idEmpresa));
const idCentro = computed(() => String(route.params.idCentroTrabajo));
const nombreCentro = computed(() => centros.currentCentroTrabajo?.nombreCentro ?? '');

const cargando = ref(true);
const filas = ref<FilaExistencia[]>([]);
const busqueda = ref('');
const filtro = ref<FiltroExistencias>('TODOS');
const pestana = ref<'existencias' | 'movimientos' | 'consumo'>('existencias');

const filtros: { value: FiltroExistencias; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  ...CATEGORIAS_INSUMO.filter((c) => c.value !== 'OTRO').map((c) => ({
    value: c.value as FiltroExistencias,
    label: c.label,
  })),
  { value: 'BAJO_STOCK', label: 'Bajo stock' },
  { value: 'POR_CADUCAR', label: 'Por caducar' },
];

const filasVisibles = computed(() =>
  filtrarExistencias(filas.value, filtro.value, busqueda.value),
);
const insumosActivos = computed(() =>
  filas.value.filter((f) => f.insumo.activo).map((f) => f.insumo),
);

const avisar = (message: string, type: 'success' | 'error' = 'success') =>
  toast?.open({ message, type, position: 'bottom-left' });

async function cargarExistencias() {
  try {
    const { data } = await InventarioAPI.getExistencias(idCentro.value);
    filas.value = data;
  } catch (error) {
    avisar(extractApiErrorMessage(error, 'No se pudo cargar el inventario'), 'error');
  }
}

async function cargar() {
  cargando.value = true;
  await inventario.cargarConfiguracion();
  centros.fetchCentroTrabajoById(idEmpresa.value, idCentro.value);
  if (inventario.habilitado) {
    await cargarExistencias();
  }
  cargando.value = false;
}

onMounted(cargar);
watch(idCentro, cargar);

// ------------------------------------------------------------------ detalle

const detalle = ref<DetalleInsumo | null>(null);
const cargandoDetalle = ref(false);

let solicitudDetalle = 0;

/**
 * La ventana abre de inmediato con lo que ya está en la tabla; los lotes y los
 * movimientos llegan después. Si el usuario abre otro insumo o cierra antes de la
 * respuesta, esa respuesta se descarta.
 */
async function abrirDetalle(insumoId: string) {
  const solicitud = ++solicitudDetalle;
  const fila = filas.value.find((f) => f.insumo._id === insumoId);
  if (fila && detalle.value?.insumo._id !== insumoId) {
    detalle.value = { ...fila, lotes: [], movimientos: [] };
  }
  cargandoDetalle.value = true;
  try {
    const { data } = await InventarioAPI.getDetalleInsumo(idCentro.value, insumoId);
    if (solicitud !== solicitudDetalle) return;
    // Si se cerró mientras cargaba, no se vuelve a abrir
    if (detalle.value?.insumo._id === insumoId || !fila) detalle.value = data;
  } catch (error) {
    if (solicitud !== solicitudDetalle) return;
    avisar(extractApiErrorMessage(error, 'No se pudo cargar el insumo'), 'error');
    if (detalle.value?.insumo._id === insumoId && detalle.value.lotes.length === 0) {
      detalle.value = null;
    }
  } finally {
    if (solicitud === solicitudDetalle) cargandoDetalle.value = false;
  }
}

/** Tras una operación: refresca la tabla y, si está abierto, el detalle. */
async function refrescar() {
  await cargarExistencias();
  if (detalle.value) await abrirDetalle(detalle.value.insumo._id);
  if (pestana.value === 'movimientos') await cargarMovimientos();
}

// -------------------------------------------------------------- operaciones

type Operacion = 'entrada' | 'ajuste' | 'baja';
const operacion = ref<Operacion | null>(null);
const guardando = ref(false);
const loteSeleccionado = ref<LoteInventario | null>(null);

const formEntrada = reactive({
  idInsumo: '',
  cantidad: null as number | null,
  porPresentacion: false,
  lote: '',
  caducidad: '',
});
const formAjuste = reactive({ existenciaContada: null as number | null, motivo: '' });
const formBaja = reactive({
  cantidad: null as number | null,
  motivo: MOTIVOS_BAJA[0],
  observaciones: '',
});

const insumoEntrada = computed(() =>
  insumosActivos.value.find((i) => i._id === formEntrada.idInsumo),
);
const unidadesEntrada = computed(() => {
  const insumo = insumoEntrada.value;
  if (!insumo || !formEntrada.cantidad) return 0;
  return formEntrada.porPresentacion
    ? formEntrada.cantidad * insumo.unidadesPorPresentacion
    : formEntrada.cantidad;
});

function abrirEntrada(insumoId = '') {
  Object.assign(formEntrada, {
    idInsumo: insumoId,
    cantidad: null,
    porPresentacion: false,
    lote: '',
    caducidad: '',
  });
  operacion.value = 'entrada';
}

function abrirAjuste(lote: LoteInventario) {
  loteSeleccionado.value = lote;
  Object.assign(formAjuste, { existenciaContada: lote.existencia < 0 ? 0 : lote.existencia, motivo: '' });
  operacion.value = 'ajuste';
}

function abrirBaja(lote: LoteInventario) {
  loteSeleccionado.value = lote;
  Object.assign(formBaja, {
    cantidad: lote.estado === 'CADUCADO' ? lote.existencia : null,
    motivo: lote.estado === 'CADUCADO' ? 'Caducidad' : MOTIVOS_BAJA[0],
    observaciones: '',
  });
  operacion.value = 'baja';
}

const esEntero = (valor: number | null, minimo: number): valor is number =>
  typeof valor === 'number' && Number.isInteger(valor) && valor >= minimo;

async function ejecutar(accion: () => Promise<unknown>, mensaje: string) {
  guardando.value = true;
  try {
    await accion();
    avisar(mensaje);
    operacion.value = null;
    await refrescar();
  } catch (error) {
    avisar(extractApiErrorMessage(error, 'No se pudo guardar el movimiento'), 'error');
  } finally {
    guardando.value = false;
  }
}

function guardarEntrada() {
  const insumo = insumoEntrada.value;
  if (!insumo) return avisar('Selecciona un insumo', 'error');
  if (!esEntero(formEntrada.cantidad, 1)) {
    return avisar('La cantidad debe ser un número entero mayor a cero', 'error');
  }
  if (insumo.controlaLote && !normalizarLote(formEntrada.lote)) {
    return avisar('Este insumo requiere número de lote', 'error');
  }
  if (insumo.controlaCaducidad && !formEntrada.caducidad) {
    return avisar('Este insumo requiere fecha de caducidad', 'error');
  }
  const cantidad = formEntrada.cantidad;
  return ejecutar(
    () =>
      InventarioAPI.registrarEntrada(idCentro.value, {
        idInsumo: insumo._id,
        cantidad,
        porPresentacion: formEntrada.porPresentacion,
        lote: insumo.controlaLote ? normalizarLote(formEntrada.lote) : undefined,
        caducidad: insumo.controlaCaducidad ? formEntrada.caducidad : undefined,
      }),
    'Entrada registrada',
  );
}

function guardarAjuste() {
  const lote = loteSeleccionado.value;
  if (!lote) return;
  if (!esEntero(formAjuste.existenciaContada, 0)) {
    return avisar('La existencia contada debe ser un número entero', 'error');
  }
  if (formAjuste.existenciaContada === lote.existencia) {
    return avisar('La existencia contada es igual a la registrada', 'error');
  }
  if (!formAjuste.motivo.trim()) return avisar('Indica el motivo del ajuste', 'error');
  const existenciaContada = formAjuste.existenciaContada;
  return ejecutar(
    () =>
      InventarioAPI.ajustarExistencia(idCentro.value, {
        idLote: lote._id,
        existenciaContada,
        motivo: formAjuste.motivo.trim(),
      }),
    'Existencia ajustada',
  );
}

function guardarBaja() {
  const lote = loteSeleccionado.value;
  if (!lote) return;
  if (!esEntero(formBaja.cantidad, 1)) {
    return avisar('La cantidad debe ser un número entero mayor a cero', 'error');
  }
  if (formBaja.cantidad > lote.existencia) {
    return avisar('No se puede dar de baja más de lo que hay en el lote', 'error');
  }
  const cantidad = formBaja.cantidad;
  return ejecutar(
    () =>
      InventarioAPI.darDeBaja(idCentro.value, {
        idLote: lote._id,
        cantidad,
        motivo: formBaja.motivo,
        observaciones: formBaja.observaciones.trim() || undefined,
      }),
    'Baja registrada',
  );
}

// -------------------------------------------------------------- movimientos

const paginaMovimientos = ref<PaginaMovimientos | null>(null);
const cargandoMovimientos = ref(false);
const filtrosMovimientos = reactive({ idInsumo: '', tipo: '', desde: '', hasta: '', pagina: 1 });
const TIPOS = [
  'ENTRADA',
  'CONSUMO_CLINICO',
  'REVERSA_CONSUMO',
  'AJUSTE_POSITIVO',
  'AJUSTE_NEGATIVO',
  'BAJA',
];

const totalPaginas = computed(() => {
  const pagina = paginaMovimientos.value;
  return pagina ? Math.max(1, Math.ceil(pagina.total / pagina.porPagina)) : 1;
});

async function cargarMovimientos() {
  cargandoMovimientos.value = true;
  try {
    const { data } = await InventarioAPI.getMovimientos(idCentro.value, {
      idInsumo: filtrosMovimientos.idInsumo || undefined,
      tipo: filtrosMovimientos.tipo || undefined,
      desde: filtrosMovimientos.desde || undefined,
      hasta: filtrosMovimientos.hasta || undefined,
      pagina: filtrosMovimientos.pagina,
    });
    paginaMovimientos.value = data;
  } catch (error) {
    avisar(extractApiErrorMessage(error, 'No se pudieron cargar los movimientos'), 'error');
  } finally {
    cargandoMovimientos.value = false;
  }
}

function aplicarFiltrosMovimientos() {
  filtrosMovimientos.pagina = 1;
  cargarMovimientos();
}

function irAPagina(pagina: number) {
  filtrosMovimientos.pagina = pagina;
  cargarMovimientos();
}

function verMovimientosDe(insumoId: string) {
  detalle.value = null;
  filtrosMovimientos.idInsumo = insumoId;
  pestana.value = 'movimientos';
}

watch(pestana, (valor) => {
  if (valor === 'movimientos') aplicarFiltrosMovimientos();
  if (valor === 'consumo') cargarConsumo();
});

// ------------------------------------------------------------------ consumo

const reporte = ref<ReporteConsumo | null>(null);
const cargandoConsumo = ref(false);
const periodo = reactive(periodoMesEnCurso());

async function cargarConsumo() {
  if (!periodo.desde || !periodo.hasta) {
    return avisar('Indica las dos fechas del periodo', 'error');
  }
  if (periodo.desde > periodo.hasta) {
    return avisar('La fecha inicial no puede ser posterior a la final', 'error');
  }
  cargandoConsumo.value = true;
  try {
    const { data } = await InventarioAPI.getConsumo(idCentro.value, {
      desde: periodo.desde,
      hasta: periodo.hasta,
    });
    reporte.value = data;
  } catch (error) {
    avisar(extractApiErrorMessage(error, 'No se pudo cargar el consumo'), 'error');
  } finally {
    cargandoConsumo.value = false;
  }
}

function exportarConsumo() {
  if (!reporte.value?.filas.length) return;
  const archivo = new Blob([consumoACsv(reporte.value.filas)], {
    type: 'text/csv;charset=utf-8',
  });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = `Consumo ${nombreCentro.value || 'inventario'} ${reporte.value.desde} a ${reporte.value.hasta}.csv`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

const nombreDe = (valor: MovimientoInventario['idInsumo']) =>
  typeof valor === 'object' && valor ? valor.nombre : '—';
const loteDe = (valor: MovimientoInventario['idLote']) =>
  typeof valor === 'object' && valor ? loteVisible(valor.lote) : '—';
const usuarioDe = (valor: MovimientoInventario['idUsuario']) =>
  typeof valor === 'object' && valor ? valor.username : '—';

const campo =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100';
const etiqueta = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300';
const botonPrimario =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60';
const botonSecundario =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700';
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-6">
    <header class="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <RouterLink
          :to="{ name: 'centros-trabajo', params: { idEmpresa } }"
          class="mb-1 inline-flex items-center gap-2 text-sm text-emerald-700 hover:underline dark:text-emerald-400"
        >
          <i class="fas fa-arrow-left text-xs"></i> Centros de trabajo
        </RouterLink>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Inventario<span v-if="nombreCentro"> — {{ nombreCentro }}</span>
        </h1>
      </div>
      <div v-if="inventario.habilitado" class="flex flex-wrap gap-2">
        <RouterLink :to="{ name: 'inventario-catalogo' }" :class="botonSecundario">
          <i class="fas fa-list"></i> Catálogo de insumos
        </RouterLink>
        <button
          v-if="canManageInventario"
          type="button"
          :class="botonPrimario"
          @click="abrirEntrada()"
        >
          <i class="fas fa-plus"></i> Registrar entrada
        </button>
      </div>
    </header>

    <p v-if="cargando" class="py-16 text-center text-gray-500">
      <i class="fas fa-spinner fa-spin mr-2"></i> Cargando inventario...
    </p>

    <div
      v-else-if="!inventario.habilitado"
      class="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800"
    >
      <i class="fas fa-boxes-stacked mb-3 text-4xl text-gray-400"></i>
      <p class="font-medium text-gray-800 dark:text-gray-100">
        El inventario no está habilitado.
      </p>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        El usuario principal puede encenderlo desde la configuración del inventario.
      </p>
      <RouterLink :to="{ name: 'inventario-catalogo' }" :class="[botonSecundario, 'mt-4']">
        Ir a la configuración
      </RouterLink>
    </div>

    <template v-else>
      <nav class="mb-4 flex gap-1 border-b border-gray-200 dark:border-gray-700" role="tablist">
        <button
          v-for="opcion in (['existencias', 'movimientos', 'consumo'] as const)"
          :key="opcion"
          type="button"
          role="tab"
          :aria-selected="pestana === opcion"
          class="-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize"
          :class="
            pestana === opcion
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          "
          @click="pestana = opcion"
        >
          {{ opcion }}
        </button>
      </nav>

      <!-- Existencias -->
      <section v-if="pestana === 'existencias'">
        <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            v-model="busqueda"
            type="search"
            placeholder="Buscar medicamento o material..."
            aria-label="Buscar insumo"
            :class="[campo, 'sm:max-w-xs']"
          />
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opcion in filtros"
              :key="opcion.value"
              type="button"
              class="rounded-full border px-3 py-1 text-xs font-medium"
              :class="
                filtro === opcion.value
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
              "
              @click="filtro = opcion.value"
            >
              {{ opcion.label }}
            </button>
          </div>
        </div>

        <div
          v-if="filas.length === 0"
          class="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-600 dark:border-gray-600 dark:text-gray-400"
        >
          <p class="font-medium">Todavía no hay insumos en el catálogo.</p>
          <p class="mt-1 text-sm">Agrega los insumos que manejas y después registra sus entradas.</p>
          <RouterLink :to="{ name: 'inventario-catalogo' }" :class="[botonPrimario, 'mt-4']">
            Ir al catálogo
          </RouterLink>
        </div>

        <div
          v-else
          class="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        >
          <table class="w-full min-w-[560px] text-sm">
            <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
              <tr>
                <th class="px-4 py-3">Insumo</th>
                <th class="px-4 py-3 text-right">Existencia</th>
                <th class="px-4 py-3">Estado</th>
                <th class="px-4 py-3">Caducidad próxima</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="fila in filasVisibles"
                :key="fila.insumo._id"
                class="cursor-pointer border-t border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/40"
                tabindex="0"
                @click="abrirDetalle(fila.insumo._id)"
                @keydown.enter="abrirDetalle(fila.insumo._id)"
              >
                <td class="px-4 py-3">
                  <p class="font-medium text-gray-900 dark:text-gray-100">
                    {{ fila.insumo.nombre }}
                    <span v-if="!fila.insumo.activo" class="ml-1 text-xs font-normal text-gray-500">(desactivado)</span>
                  </p>
                  <p class="text-xs text-gray-500">{{ etiquetaCategoria(fila.insumo.categoria) }}</p>
                </td>
                <td class="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-gray-100">
                  {{ cantidadConUnidad(fila.existencia, fila.insumo.unidad) }}
                </td>
                <td class="px-4 py-3">
                  <span
                    class="inline-block rounded-full border px-2 py-0.5 text-xs font-medium"
                    :class="estadoInsumoVisual(fila.estado).clase"
                  >
                    {{ estadoInsumoVisual(fila.estado).label }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {{ formatearCaducidad(fila.caducidadProxima) }}
                  <span v-if="fila.lotesCaducados > 0" class="ml-1 text-xs font-medium text-red-600">
                    · {{ fila.lotesCaducados }} caducado{{ fila.lotesCaducados === 1 ? '' : 's' }}
                  </span>
                  <span v-else-if="fila.lotesPorCaducar > 0" class="ml-1 text-xs font-medium text-amber-600">
                    · por caducar
                  </span>
                </td>
              </tr>
              <tr v-if="filasVisibles.length === 0">
                <td colspan="4" class="px-4 py-8 text-center text-gray-500">
                  Ningún insumo coincide con la búsqueda o el filtro.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Movimientos -->
      <section v-else-if="pestana === 'movimientos'">
        <form
          class="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
          @submit.prevent="aplicarFiltrosMovimientos"
        >
          <select v-model="filtrosMovimientos.idInsumo" :class="campo" aria-label="Insumo">
            <option value="">Todos los insumos</option>
            <option v-for="fila in filas" :key="fila.insumo._id" :value="fila.insumo._id">
              {{ fila.insumo.nombre }}
            </option>
          </select>
          <select v-model="filtrosMovimientos.tipo" :class="campo" aria-label="Tipo de movimiento">
            <option value="">Todos los tipos</option>
            <option v-for="tipo in TIPOS" :key="tipo" :value="tipo">{{ etiquetaMovimiento(tipo) }}</option>
          </select>
          <input v-model="filtrosMovimientos.desde" type="date" :class="campo" aria-label="Desde" />
          <input v-model="filtrosMovimientos.hasta" type="date" :class="campo" aria-label="Hasta" />
          <button type="submit" :class="botonSecundario">
            <i class="fas fa-filter"></i> Filtrar
          </button>
        </form>

        <p v-if="cargandoMovimientos" class="py-10 text-center text-gray-500">
          <i class="fas fa-spinner fa-spin mr-2"></i> Cargando movimientos...
        </p>
        <div
          v-else
          class="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        >
          <table class="w-full min-w-[720px] text-sm">
            <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
              <tr>
                <th class="px-4 py-3">Fecha</th>
                <th class="px-4 py-3">Insumo</th>
                <th class="px-4 py-3">Lote</th>
                <th class="px-4 py-3">Movimiento</th>
                <th class="px-4 py-3 text-right">Cantidad</th>
                <th class="px-4 py-3">Usuario</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="movimiento in paginaMovimientos?.movimientos ?? []"
                :key="movimiento._id"
                class="border-t border-gray-100 dark:border-gray-700"
              >
                <td class="whitespace-nowrap px-4 py-3 text-gray-700 dark:text-gray-300">
                  {{ formatearFechaHora(movimiento.fecha) }}
                </td>
                <td class="px-4 py-3 text-gray-900 dark:text-gray-100">{{ nombreDe(movimiento.idInsumo) }}</td>
                <td class="px-4 py-3 text-gray-700 dark:text-gray-300">{{ loteDe(movimiento.idLote) }}</td>
                <td class="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {{ etiquetaMovimiento(movimiento.tipo) }}
                  <p v-if="movimiento.motivo" class="text-xs text-gray-500">{{ movimiento.motivo }}</p>
                </td>
                <td
                  class="px-4 py-3 text-right font-medium tabular-nums"
                  :class="movimiento.cantidad > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
                >
                  {{ cantidadConSigno(movimiento.cantidad) }}
                </td>
                <td class="px-4 py-3 text-gray-700 dark:text-gray-300">{{ usuarioDe(movimiento.idUsuario) }}</td>
              </tr>
              <tr v-if="(paginaMovimientos?.movimientos.length ?? 0) === 0">
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">No hay movimientos con esos filtros.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="totalPaginas > 1" class="mt-3 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            :class="botonSecundario"
            :disabled="filtrosMovimientos.pagina <= 1"
            @click="irAPagina(filtrosMovimientos.pagina - 1)"
          >
            Anterior
          </button>
          <span class="text-gray-600 dark:text-gray-400">
            Página {{ filtrosMovimientos.pagina }} de {{ totalPaginas }}
          </span>
          <button
            type="button"
            :class="botonSecundario"
            :disabled="filtrosMovimientos.pagina >= totalPaginas"
            @click="irAPagina(filtrosMovimientos.pagina + 1)"
          >
            Siguiente
          </button>
        </div>
      </section>

      <!-- Consumo -->
      <section v-else>
        <form class="mb-3 flex flex-wrap items-end gap-3" @submit.prevent="cargarConsumo">
          <div>
            <label :class="etiqueta" for="consumo-desde">Desde</label>
            <input id="consumo-desde" v-model="periodo.desde" type="date" :class="campo" required />
          </div>
          <div>
            <label :class="etiqueta" for="consumo-hasta">Hasta</label>
            <input id="consumo-hasta" v-model="periodo.hasta" type="date" :class="campo" required />
          </div>
          <button type="submit" :class="botonSecundario" :disabled="cargandoConsumo">
            <i class="fas fa-rotate"></i> Consultar
          </button>
          <button
            type="button"
            :class="botonSecundario"
            :disabled="!reporte?.filas.length"
            @click="exportarConsumo"
          >
            <i class="fas fa-file-csv"></i> Exportar
          </button>
        </form>

        <p v-if="cargandoConsumo" class="py-10 text-center text-gray-500">
          <i class="fas fa-spinner fa-spin mr-2"></i> Cargando consumo...
        </p>
        <div
          v-else
          class="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        >
          <table class="w-full min-w-[640px] text-sm">
            <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
              <tr>
                <th class="px-4 py-3">Insumo</th>
                <th class="px-4 py-3 text-right">Consumo</th>
                <th class="px-4 py-3 text-right">Entradas</th>
                <th class="px-4 py-3 text-right">Bajas</th>
                <th class="px-4 py-3 text-right">Ajustes</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="fila in reporte?.filas ?? []"
                :key="fila.insumo._id"
                class="border-t border-gray-100 dark:border-gray-700"
              >
                <td class="px-4 py-3">
                  <p class="font-medium text-gray-900 dark:text-gray-100">{{ fila.insumo.nombre }}</p>
                  <p class="text-xs text-gray-500">{{ etiquetaCategoria(fila.insumo.categoria) }}</p>
                </td>
                <td class="px-4 py-3 text-right tabular-nums">
                  <p class="font-medium text-gray-900 dark:text-gray-100">
                    {{ cantidadConUnidad(fila.consumo, fila.insumo.unidad) }}
                  </p>
                  <p v-if="fila.administrado || fila.entregado" class="text-xs text-gray-500">
                    {{ fila.administrado }} administrado · {{ fila.entregado }} entregado
                  </p>
                </td>
                <td class="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{{ fila.entradas }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{{ fila.bajas }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                  {{ fila.ajustes === 0 ? '0' : cantidadConSigno(fila.ajustes) }}
                </td>
              </tr>
              <tr v-if="(reporte?.filas.length ?? 0) === 0">
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                  No hubo movimientos de inventario en ese periodo.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-2 text-xs text-gray-500">
          Consumo es lo descontado desde notas médicas y antidoping, menos lo devuelto; en las notas
          médicas se desglosa en administrado en consulta y entregado al trabajador. Los ajustes son las
          diferencias registradas por conteo.
        </p>
      </section>
    </template>

    <!-- Detalle del insumo -->
    <InventarioModal
      v-if="detalle && !operacion"
      :titulo="detalle.insumo.nombre"
      ancho="lg"
      @cerrar="detalle = null"
    >
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {{ cantidadConUnidad(detalle.existencia, detalle.insumo.unidad) }}
        </p>
        <span
          class="rounded-full border px-2 py-0.5 text-xs font-medium"
          :class="estadoInsumoVisual(detalle.estado).clase"
        >
          {{ estadoInsumoVisual(detalle.estado).label }}
        </span>
        <span v-if="detalle.insumo.stockMinimo > 0" class="text-xs text-gray-500">
          Stock mínimo: {{ detalle.insumo.stockMinimo }}
        </span>
      </div>

      <h3 class="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Lotes</h3>
      <p v-if="cargandoDetalle && detalle.lotes.length === 0" class="mb-4 text-sm text-gray-500">
        <i class="fas fa-spinner fa-spin mr-1"></i> Cargando lotes...
      </p>
      <p v-else-if="detalle.lotes.length === 0" class="mb-4 text-sm text-gray-500">
        Sin existencia en este centro.
      </p>
      <ul v-else class="mb-4 divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
        <li
          v-for="lote in detalle.lotes"
          :key="lote._id"
          class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
        >
          <div class="min-w-0">
            <p class="font-medium text-gray-900 dark:text-gray-100">
              {{ loteVisible(lote.lote) }} · {{ cantidadConUnidad(lote.existencia, detalle.insumo.unidad) }}
            </p>
            <p v-if="lote.caducidad" class="text-xs" :class="estadoLoteVisual(lote.estado).clase">
              Caduca {{ formatearCaducidad(lote.caducidad) }}
              <span v-if="lote.estado !== 'VIGENTE'"> · {{ estadoLoteVisual(lote.estado).label }}</span>
            </p>
            <p v-else-if="lote.existencia < 0" class="text-xs font-medium text-red-600">
              Se suministró más de lo registrado; ajusta la existencia.
            </p>
          </div>
          <div v-if="canManageInventario" class="flex gap-2">
            <button type="button" class="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400" @click="abrirAjuste(lote)">
              Ajustar
            </button>
            <button
              v-if="lote.existencia > 0"
              type="button"
              class="text-xs font-medium text-red-600 hover:underline"
              @click="abrirBaja(lote)"
            >
              Dar de baja
            </button>
          </div>
        </li>
      </ul>

      <h3 class="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Últimos movimientos</h3>
      <p v-if="cargandoDetalle && detalle.movimientos.length === 0" class="text-sm text-gray-500">
        <i class="fas fa-spinner fa-spin mr-1"></i> Cargando movimientos...
      </p>
      <p v-else-if="detalle.movimientos.length === 0" class="text-sm text-gray-500">Sin movimientos.</p>
      <ul v-else class="space-y-1 text-sm">
        <li
          v-for="movimiento in detalle.movimientos"
          :key="movimiento._id"
          class="flex items-baseline justify-between gap-3"
        >
          <span class="min-w-0 text-gray-700 dark:text-gray-300">
            <span
              class="mr-2 font-medium tabular-nums"
              :class="movimiento.cantidad > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
            >{{ cantidadConSigno(movimiento.cantidad) }}</span>
            {{ etiquetaMovimiento(movimiento.tipo) }}
            <span v-if="movimiento.motivo" class="text-xs text-gray-500"> · {{ movimiento.motivo }}</span>
          </span>
          <span class="shrink-0 text-xs text-gray-500">{{ formatearFechaHora(movimiento.fecha) }}</span>
        </li>
      </ul>

      <template #acciones>
        <button type="button" :class="botonSecundario" @click="verMovimientosDe(detalle.insumo._id)">
          Ver movimientos
        </button>
        <button
          v-if="canManageInventario && detalle.insumo.activo"
          type="button"
          :class="botonPrimario"
          @click="abrirEntrada(detalle.insumo._id)"
        >
          <i class="fas fa-plus"></i> Registrar entrada
        </button>
      </template>
    </InventarioModal>

    <!-- Registrar entrada -->
    <InventarioModal v-if="operacion === 'entrada'" titulo="Registrar entrada" @cerrar="operacion = null">
      <form id="form-entrada" class="space-y-3" @submit.prevent="guardarEntrada">
        <div>
          <label :class="etiqueta" for="entrada-insumo">Insumo</label>
          <select id="entrada-insumo" v-model="formEntrada.idInsumo" :class="campo" required>
            <option value="" disabled>Selecciona un insumo</option>
            <option v-for="insumo in insumosActivos" :key="insumo._id" :value="insumo._id">
              {{ insumo.nombre }}
            </option>
          </select>
        </div>
        <template v-if="insumoEntrada">
          <div>
            <label :class="etiqueta" for="entrada-cantidad">Cantidad</label>
            <input id="entrada-cantidad" v-model.number="formEntrada.cantidad" type="number" min="1" step="1" :class="campo" required />
            <label
              v-if="insumoEntrada.unidadesPorPresentacion > 1"
              class="mt-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <input v-model="formEntrada.porPresentacion" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-emerald-600" />
              La cantidad es por presentación
              <span v-if="insumoEntrada.presentacion" class="text-gray-500">({{ insumoEntrada.presentacion }})</span>
            </label>
            <p v-if="unidadesEntrada > 0" class="mt-1 text-xs text-gray-500">
              Entran {{ cantidadConUnidad(unidadesEntrada, insumoEntrada.unidad) }}.
            </p>
          </div>
          <div v-if="insumoEntrada.controlaLote">
            <label :class="etiqueta" for="entrada-lote">Lote</label>
            <input
              id="entrada-lote"
              v-model="formEntrada.lote"
              type="text"
              maxlength="40"
              placeholder="Ej. 24B0731"
              :class="[campo, 'uppercase placeholder:normal-case']"
              required
              @blur="formEntrada.lote = normalizarLote(formEntrada.lote)"
            />
            <p class="mt-1 text-xs text-gray-500">
              Cópialo tal como viene impreso en el empaque, junto a «Lote», «Lot» o «L».
            </p>
          </div>
          <div v-if="insumoEntrada.controlaCaducidad">
            <label :class="etiqueta" for="entrada-caducidad">Caducidad</label>
            <input id="entrada-caducidad" v-model="formEntrada.caducidad" type="date" :class="campo" required />
          </div>
        </template>
      </form>
      <template #acciones>
        <button type="button" :class="botonSecundario" @click="operacion = null">Cancelar</button>
        <button type="submit" form="form-entrada" :class="botonPrimario" :disabled="guardando">
          {{ guardando ? 'Guardando...' : 'Registrar entrada' }}
        </button>
      </template>
    </InventarioModal>

    <!-- Ajustar existencia -->
    <InventarioModal
      v-if="operacion === 'ajuste' && loteSeleccionado && detalle"
      titulo="Ajustar existencia"
      @cerrar="operacion = null"
    >
      <form id="form-ajuste" class="space-y-3" @submit.prevent="guardarAjuste">
        <p class="text-sm text-gray-700 dark:text-gray-300">
          {{ detalle.insumo.nombre }} · {{ loteVisible(loteSeleccionado.lote) }}. El sistema registra
          <strong>{{ cantidadConUnidad(loteSeleccionado.existencia, detalle.insumo.unidad) }}</strong>.
        </p>
        <div>
          <label :class="etiqueta" for="ajuste-contada">Existencia contada</label>
          <input id="ajuste-contada" v-model.number="formAjuste.existenciaContada" type="number" min="0" step="1" :class="campo" required />
        </div>
        <div>
          <label :class="etiqueta" for="ajuste-motivo">Motivo</label>
          <input id="ajuste-motivo" v-model="formAjuste.motivo" type="text" maxlength="200" placeholder="Ej. Conteo físico, error de captura" :class="campo" required />
        </div>
      </form>
      <template #acciones>
        <button type="button" :class="botonSecundario" @click="operacion = null">Cancelar</button>
        <button type="submit" form="form-ajuste" :class="botonPrimario" :disabled="guardando">
          {{ guardando ? 'Guardando...' : 'Ajustar' }}
        </button>
      </template>
    </InventarioModal>

    <!-- Dar de baja -->
    <InventarioModal
      v-if="operacion === 'baja' && loteSeleccionado && detalle"
      titulo="Dar de baja"
      @cerrar="operacion = null"
    >
      <form id="form-baja" class="space-y-3" @submit.prevent="guardarBaja">
        <p class="text-sm text-gray-700 dark:text-gray-300">
          {{ detalle.insumo.nombre }} · {{ loteVisible(loteSeleccionado.lote) }}. Hay
          <strong>{{ cantidadConUnidad(loteSeleccionado.existencia, detalle.insumo.unidad) }}</strong>.
        </p>
        <div>
          <label :class="etiqueta" for="baja-cantidad">Cantidad</label>
          <input id="baja-cantidad" v-model.number="formBaja.cantidad" type="number" min="1" :max="loteSeleccionado.existencia" step="1" :class="campo" required />
        </div>
        <div>
          <label :class="etiqueta" for="baja-motivo">Motivo</label>
          <select id="baja-motivo" v-model="formBaja.motivo" :class="campo">
            <option v-for="motivo in MOTIVOS_BAJA" :key="motivo" :value="motivo">{{ motivo }}</option>
          </select>
        </div>
        <div>
          <label :class="etiqueta" for="baja-observaciones">Observaciones (opcional)</label>
          <input id="baja-observaciones" v-model="formBaja.observaciones" type="text" maxlength="200" :class="campo" />
        </div>
      </form>
      <template #acciones>
        <button type="button" :class="botonSecundario" @click="operacion = null">Cancelar</button>
        <button type="submit" form="form-baja" :class="botonPrimario" :disabled="guardando">
          {{ guardando ? 'Guardando...' : 'Dar de baja' }}
        </button>
      </template>
    </InventarioModal>
  </div>
</template>
