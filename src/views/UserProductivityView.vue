<script setup>
import { ref, onMounted, onUnmounted, inject, computed, watch } from "vue";
import { useUserStore } from "@/stores/user";
import UserProductivityItem from "@/components/UserProductivityItem.vue";
import UserProductivityAPI from "@/api/UserProductivityAPI";
import EmpresasAPI from "@/api/EmpresasAPI";
import CentrosTrabajoAPI from "@/api/CentrosTrabajoAPI";
import { OPCIONES_PERIODO_PRODUCTIVIDAD as opcionesPeriodo, TODO_EL_HISTORIAL, fechaLocal, fechasDePeriodo } from "@/helpers/periodosProductividad";
import { periodoDeReferencia } from "@/helpers/dashboardComparativo";
import {
  AYUDA_OTROS_DOCUMENTOS,
  COLUMNAS_DOCUMENTOS,
  REGLAS_POR_DEFECTO,
  armarFilas,
  diaCorto,
  fechaCorta,
  filasParaExcel,
  ordenarFilas,
  textoDeDiferencia,
  tiempoTranscurrido,
} from "@/helpers/productividadTabla";

const PERIODO_INICIAL = 'Este mes';

const toast = inject("toast");
const userStore = useUserStore();
const loading = ref(true);
const savingConfig = ref(false);
const periodoPredefinido = ref(PERIODO_INICIAL);
const fechaInicio = ref(fechasDePeriodo(PERIODO_INICIAL).inicio);
const fechaFin = ref(fechasDePeriodo(PERIODO_INICIAL).fin);
const rolElegido = ref('');
const idEmpresa = ref('');
const idCentroTrabajo = ref('');
const empresas = ref([]);
const centros = ref([]);

const user = computed(() => userStore.user);

// Verificar si el usuario actual es el administrador
const esAdministrador = computed(() => {
  return user.value?.role === 'Administrador';
});

// Función para manejar el cambio de periodo predefinido
const manejarCambioPeriodo = (periodo) => {
  if (periodo === TODO_EL_HISTORIAL) {
    fechaInicio.value = null;
    fechaFin.value = null;
    return;
  }

  const fechas = fechasDePeriodo(periodo);
  if (!fechas) return;
  fechaInicio.value = fechas.inicio;
  fechaFin.value = fechas.fin;
};

const restablecerPeriodo = () => {
  periodoPredefinido.value = PERIODO_INICIAL;
  manejarCambioPeriodo(PERIODO_INICIAL);
};

// Computed para validar rango de fechas
const rangoInvalido = computed(() => {
  return fechaInicio.value && fechaFin.value && new Date(fechaInicio.value) > new Date(fechaFin.value);
});

// Se compara lo que ya pasó: un mes en curso contra un mes completo siempre saldría a la baja
const periodoAnterior = computed(() => {
  if (!fechaInicio.value || !fechaFin.value || rangoInvalido.value) return null;
  const hoy = fechaLocal(new Date());
  const fin = fechaFin.value > hoy ? hoy : fechaFin.value;
  return periodoDeReferencia(fechaInicio.value, fin, 'anterior');
});

// Configuración de puntos (reactiva para permitir modificaciones)
const configuracionPuntos = ref({ ...REGLAS_POR_DEFECTO });

const usuariosConProductividad = ref([]);
const documentosAnteriores = ref(null);
let abortController = null;
let debounceTimer = null;

const opcionesDeRol = computed(() =>
  [...new Set(usuariosConProductividad.value.map((usuario) => usuario.role).filter(Boolean))].sort()
);

// Orden de la tabla: cada proveedor tiene sus reglas de puntaje, así que entre proveedores
// no hay puntos comparables y el administrador ve documentos
const ordenElegido = ref(null);
const orden = computed(() => ordenElegido.value ?? {
  clave: esAdministrador.value ? 'totalDocumentos' : 'puntos',
  descendente: true,
});

const alternarOrden = (clave) => {
  const { clave: actual, descendente } = orden.value;
  ordenElegido.value = clave === actual
    ? { clave, descendente: !descendente }
    : { clave, descendente: clave !== 'usuario' };
};

const filasVisibles = computed(() => {
  const usuarios = rolElegido.value
    ? usuariosConProductividad.value.filter((usuario) => usuario.role === rolElegido.value)
    : usuariosConProductividad.value;
  const filas = armarFilas(usuarios, configuracionPuntos.value, documentosAnteriores.value);
  return ordenarFilas(filas, orden.value.clave, orden.value.descendente);
});

const hayComparacion = computed(() => documentosAnteriores.value !== null);

const encabezados = computed(() => [
  { clave: 'usuario', titulo: 'Usuario', izquierda: true },
  ...(esAdministrador.value ? [] : [{ clave: 'puntos', titulo: 'Puntos', ayuda: 'Según las reglas de puntaje' }]),
  ...COLUMNAS_DOCUMENTOS,
  { clave: 'totalDocumentos', titulo: 'Total', ayuda: 'Total de Documentos' },
  ...(hayComparacion.value ? [{ clave: 'cambio', titulo: 'Cambio', ayuda: textoPeriodoAnterior.value }] : []),
  { clave: 'ultimoInforme', titulo: 'Último Informe', izquierda: true },
]);

const textoPeriodoAnterior = computed(() =>
  periodoAnterior.value
    ? `Contra ${diaCorto(periodoAnterior.value.desde)} - ${diaCorto(periodoAnterior.value.hasta)}`
    : ''
);

// Resumen de lo que se ve en la tabla
const totalDocumentos = computed(() =>
  filasVisibles.value.reduce((suma, fila) => suma + (fila.productividad?.totalDocumentos || 0), 0)
);
const usuariosConActividad = computed(() =>
  filasVisibles.value.filter((fila) => fila.productividad?.totalDocumentos).length
);
const promedioPorUsuario = computed(() =>
  filasVisibles.value.length ? Math.round(totalDocumentos.value / filasVisibles.value.length) : 0
);
const diferenciaTotal = computed(() =>
  hayComparacion.value ? filasVisibles.value.reduce((suma, fila) => suma + fila.diferencia, 0) : null
);
const ultimaActividad = computed(() => {
  const fechas = filasVisibles.value
    .map((fila) => fila.productividad?.ultimoInforme)
    .filter(Boolean)
    .map((fecha) => new Date(fecha).getTime());
  return fechas.length ? new Date(Math.max(...fechas)) : null;
});

const consultarUsuarios = (inicio, fin, signal) =>
  esAdministrador.value
    ? UserProductivityAPI.getAllProductivityStats(inicio, fin, signal)
    : UserProductivityAPI.getProductivityStatsByProveedor(
        user.value.idProveedorSalud,
        inicio,
        fin,
        signal,
        { idEmpresa: idEmpresa.value, idCentroTrabajo: idCentroTrabajo.value }
      );

// Función para cargar datos con filtros
const cargarDatos = async () => {
  if (abortController) {
    abortController.abort();
  }
  abortController = new AbortController();
  const { signal } = abortController;

  try {
    loading.value = true;

    const anterior = periodoAnterior.value;
    const [response, responseAnterior] = await Promise.all([
      consultarUsuarios(fechaInicio.value, fechaFin.value, signal),
      anterior ? consultarUsuarios(anterior.desde, anterior.hasta, signal) : null,
    ]);

    if (signal.aborted) return;

    const payload = response.data;
    if (!payload?.usuarios) {
      throw new Error("No se obtuvieron datos de productividad");
    }
    usuariosConProductividad.value = payload.usuarios;
    documentosAnteriores.value = responseAnterior
      ? new Map(responseAnterior.data.usuarios.map((usuario) => [usuario._id, usuario.productividad?.totalDocumentos || 0]))
      : null;
    if (payload.reglasPuntaje) {
      configuracionPuntos.value = { ...REGLAS_POR_DEFECTO, ...payload.reglasPuntaje };
    }
  } catch (error) {
    if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
      return;
    }
    console.error("Error al cargar datos:", error);
    usuariosConProductividad.value = [];
    documentosAnteriores.value = null;
    toast.open({
      type: "error",
      message: "Error al cargar los datos de productividad",
      position: "top-right",
    });
  } finally {
    if (!signal.aborted) {
      loading.value = false;
    }
  }
};

const cargarEmpresas = async () => {
  try {
    const { data } = await EmpresasAPI.getEmpresas(user.value.idProveedorSalud);
    empresas.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error al cargar empresas:", error);
  }
};

const alCambiarEmpresa = async () => {
  idCentroTrabajo.value = '';
  centros.value = [];
  if (!idEmpresa.value) return;
  const empresa = idEmpresa.value;
  try {
    const { data } = await CentrosTrabajoAPI.getCentrosTrabajo(empresa);
    if (empresa === idEmpresa.value && Array.isArray(data)) centros.value = data;
  } catch (error) {
    console.error("Error al cargar centros de trabajo:", error);
  }
};

onMounted(() => {
  cargarDatos();
  if (!esAdministrador.value) cargarEmpresas();
});

onUnmounted(() => {
  if (abortController) abortController.abort();
  if (debounceTimer) clearTimeout(debounceTimer);
});

// Watcher para recargar datos cuando cambien las fechas, la empresa o el centro
watch([fechaInicio, fechaFin, idEmpresa, idCentroTrabajo], ([inicio, fin]) => {
  if (inicio && fin && new Date(inicio) > new Date(fin)) {
    toast.open({
      message: 'La fecha de inicio no puede ser mayor que la fecha final.',
      type: 'error'
    });
    return;
  }

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(cargarDatos, 300);
});

const exportarExcel = async () => {
  try {
    const { descargarFilasExcel } = await import("@/helpers/exportarExcel");
    const periodo = fechaInicio.value && fechaFin.value ? `${fechaInicio.value} a ${fechaFin.value}` : 'historial';
    descargarFilasExcel(
      filasParaExcel(filasVisibles.value, { conPuntos: !esAdministrador.value, conProveedor: esAdministrador.value }),
      `Productividad ${periodo}.xlsx`,
      'Productividad'
    );
  } catch (error) {
    console.error("Error al exportar:", error);
    toast.open({ type: "error", message: "No se pudo generar el archivo de Excel", position: "top-right" });
  }
};

// Detalle de un usuario: lo mismo que la tabla, más su actividad por día
const detalle = ref(null);

const abrirDetalle = async (usuario) => {
  detalle.value = { usuario, cargando: true, tipos: [], dias: [] };
  try {
    const { data } = await UserProductivityAPI.getUserDetailedStats(usuario._id, fechaInicio.value, fechaFin.value, {
      idEmpresa: idEmpresa.value,
      idCentroTrabajo: idCentroTrabajo.value,
    });
    if (detalle.value?.usuario._id !== usuario._id) return;
    detalle.value = {
      usuario,
      cargando: false,
      tipos: COLUMNAS_DOCUMENTOS
        .map(({ clave, ayuda, titulo }) => ({ clave, titulo: titulo === 'Otros' ? 'Otros documentos' : ayuda, total: data[clave] || 0 }))
        .filter(({ total }) => total > 0),
      dias: [...data.actividadPorDia].reverse(),
    };
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    detalle.value = null;
    toast.open({
      type: "error",
      message: "Error al obtener estadísticas del usuario",
      position: "top-right",
    });
  }
};

const cerrarDetalle = () => {
  detalle.value = null;
};

// Estado para el modal de reglas de puntaje
const mostrarModalReglas = ref(false);

// Funciones para el modal de reglas de puntaje
const abrirModalReglas = async () => {
  mostrarModalReglas.value = true;
  await cargarConfiguracionGuardada();
};

const cerrarModalReglas = () => {
  mostrarModalReglas.value = false;
};

const guardarConfiguracion = async () => {
  if (savingConfig.value) return;
  savingConfig.value = true;
  try {
    await UserProductivityAPI.updateReglasPuntaje(user.value.idProveedorSalud, configuracionPuntos.value);
    toast.open({
      type: "success",
      message: "Reglas de puntaje guardadas exitosamente",
      position: "top-right",
    });
    cerrarModalReglas();
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    toast.open({
      type: "error",
      message: "Error al guardar las reglas de puntaje",
      position: "top-right",
    });
  } finally {
    savingConfig.value = false;
  }
};

const resetearConfiguracion = () => {
  configuracionPuntos.value = { ...REGLAS_POR_DEFECTO };
};

const cargarConfiguracionGuardada = async () => {
  try {
    const response = await UserProductivityAPI.getReglasPuntaje(user.value.idProveedorSalud);
    if (response.data) {
      configuracionPuntos.value = { ...REGLAS_POR_DEFECTO, ...response.data };
    }
  } catch (error) {
    console.error('Error al cargar configuración:', error);
    // En caso de error, usar configuración por defecto
    configuracionPuntos.value = { ...REGLAS_POR_DEFECTO };
  }
};

// Función para obtener las clases CSS de los campos de entrada
const getInputClasses = (colorClass) => {
  const baseClasses = 'w-20 px-3 py-1 border rounded-md text-center focus:outline-none';
  return `${baseClasses} border-gray-300 focus:${colorClass} focus:ring-${colorClass}`;
};
</script>

<template>
  <Transition appear mode="out-in" name="slide-up">
    <div class="w-full max-w-7xl mx-auto p-6">
      <!-- Encabezado -->
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-3xl font-bold text-gray-800 mb-1">Productividad</h1>
          <p class="text-gray-600">
            {{ esAdministrador ? 'Actividad de todos los usuarios del sistema' : 'Actividad de los usuarios de tu organización' }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="text-sm font-medium text-gray-600 hover:text-gray-800"
            data-test="abrir-reglas"
            @click="abrirModalReglas"
          >
            <i class="fas fa-cog mr-1"></i>
            Reglas de puntaje
          </button>
          <button
            type="button"
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="loading || filasVisibles.length === 0"
            data-test="exportar-excel"
            @click="exportarExcel"
          >
            <i class="fas fa-file-excel mr-2"></i>
            Exportar a Excel
          </button>
        </div>
      </div>

      <!-- Filtros -->
      <div class="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div class="dashboard-filtros flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3" data-test="filtros-productividad">
          <label class="flex flex-col">
            <span class="mb-0.5 text-[11px] text-gray-500">Rol</span>
            <select v-model="rolElegido" class="dashboard-filtros__campo h-[34px] sm:h-[26px] border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-0 rounded-md shadow-sm text-xs text-gray-700 bg-white" data-test="filtro-rol">
              <option value="">Todos</option>
              <option v-for="rol in opcionesDeRol" :key="rol" :value="rol">{{ rol }}</option>
            </select>
          </label>
          <template v-if="!esAdministrador">
            <label class="flex flex-col">
              <span class="mb-0.5 text-[11px] text-gray-500">Empresa</span>
              <select v-model="idEmpresa" class="dashboard-filtros__campo h-[34px] max-w-[14rem] sm:h-[26px] border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-0 rounded-md shadow-sm text-xs text-gray-700 bg-white" data-test="filtro-empresa" @change="alCambiarEmpresa">
                <option value="">Todas</option>
                <option v-for="empresa in empresas" :key="empresa._id" :value="empresa._id">{{ empresa.nombreComercial }}</option>
              </select>
            </label>
            <label class="flex flex-col">
              <span class="mb-0.5 text-[11px] text-gray-500">Centro de trabajo</span>
              <select v-model="idCentroTrabajo" :disabled="!idEmpresa" class="dashboard-filtros__campo h-[34px] max-w-[14rem] sm:h-[26px] border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-0 rounded-md shadow-sm text-xs text-gray-700 bg-white disabled:opacity-60" data-test="filtro-centro">
                <option value="">Todos</option>
                <option v-for="centro in centros" :key="centro._id" :value="centro._id">{{ centro.nombreCentro }}</option>
              </select>
            </label>
          </template>
        </div>

        <!-- Filtro de periodo -->
        <div class="flex flex-col justify-end text-xs w-full sm:w-auto">
          <div class="flex flex-wrap items-center gap-x-2">
            <label class="block text-xs font-medium text-gray-700 mb-1">Periodo</label>
            <span
              v-if="fechaInicio && fechaFin"
              class="mb-1 flex items-center gap-1 text-xs"
              :class="rangoInvalido ? 'text-rose-600' : 'text-emerald-600'"
              data-test="aviso-periodo"
            >
              <i :class="['fas', rangoInvalido ? 'fa-circle-exclamation text-rose-500' : 'fa-filter text-emerald-500']"></i>
              {{ rangoInvalido ? 'Corrige el orden de las fechas' : `${diaCorto(fechaInicio)} - ${diaCorto(fechaFin)}` }}
            </span>
            <button
              v-if="periodoPredefinido !== PERIODO_INICIAL"
              type="button"
              class="ml-auto block text-xs font-medium mb-1 text-gray-600 hover:text-gray-800"
              data-test="restablecer-periodo"
              @click="restablecerPeriodo"
            >
              <i class="fa-solid fa-rotate-left"></i>
              &nbsp;Este mes
            </button>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-end sm:justify-end gap-3 sm:gap-2">
            <div class="flex flex-col w-full sm:w-auto">
              <label class="text-[11px] text-gray-500 mb-0.5">Periodo rápido</label>
              <select
                v-model="periodoPredefinido"
                class="border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-2 sm:py-1 rounded-md shadow-sm text-xs text-gray-700 bg-white transition duration-150 ease-in-out w-full sm:min-w-[140px]"
                data-test="periodo-rapido"
                @change="manejarCambioPeriodo(periodoPredefinido)"
              >
                <option value="" disabled>Personalizado</option>
                <option v-for="opcion in opcionesPeriodo" :key="opcion" :value="opcion">{{ opcion }}</option>
              </select>
            </div>
            <div class="flex flex-col w-full sm:w-auto">
              <label for="fechaInicio" class="text-[11px] text-gray-500 mb-0.5">Inicio</label>
              <input
                id="fechaInicio"
                type="date"
                v-model="fechaInicio"
                class="border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-2 sm:py-1 rounded-md shadow-sm text-xs text-gray-700 bg-white transition w-full"
                @input="periodoPredefinido = ''"
              />
            </div>
            <div class="flex flex-col w-full sm:w-auto">
              <label for="fechaFin" class="text-[11px] text-gray-500 mb-0.5">Final</label>
              <input
                id="fechaFin"
                type="date"
                v-model="fechaFin"
                class="border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-2 sm:py-1 rounded-md shadow-sm text-xs text-gray-700 bg-white transition w-full"
                @input="periodoPredefinido = ''"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Carga -->
      <div v-if="loading" aria-hidden="true" data-test="productividad-skeleton">
        <div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div v-for="n in 4" :key="n" class="dashboard-cifra rounded-lg border border-gray-200 bg-white px-4 py-3">
            <div class="productividad-skeleton h-3 w-24 rounded" />
            <div class="productividad-skeleton mt-2 h-7 w-14 rounded" />
            <div class="productividad-skeleton mt-1.5 h-3 w-20 rounded" />
          </div>
        </div>
        <div class="dashboard-cifra rounded-lg border border-gray-200 bg-white p-4">
          <div v-for="n in 6" :key="n" class="productividad-skeleton mb-3 h-6 rounded last:mb-0" />
        </div>
      </div>

      <template v-else>
        <!-- Resumen -->
        <dl class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4" data-test="productividad-resumen">
          <div class="dashboard-cifra rounded-lg border border-gray-200 bg-white px-4 py-3">
            <dt class="text-xs text-gray-500">Usuarios con actividad</dt>
            <dd class="text-2xl font-bold text-gray-900">{{ usuariosConActividad }}</dd>
            <dd class="text-xs text-gray-500">de {{ filasVisibles.length }}</dd>
          </div>
          <div class="dashboard-cifra rounded-lg border border-gray-200 bg-white px-4 py-3">
            <dt class="text-xs text-gray-500">Documentos</dt>
            <dd class="text-2xl font-bold text-gray-900">{{ totalDocumentos }}</dd>
            <dd class="text-xs text-gray-500" :title="textoPeriodoAnterior" data-test="cambio-total">
              {{ hayComparacion ? `${textoDeDiferencia(diferenciaTotal)} contra el periodo anterior` : 'Sin comparación' }}
            </dd>
          </div>
          <div class="dashboard-cifra rounded-lg border border-gray-200 bg-white px-4 py-3">
            <dt class="text-xs text-gray-500">Promedio por usuario</dt>
            <dd class="text-2xl font-bold text-gray-900">{{ promedioPorUsuario }}</dd>
            <dd class="text-xs text-gray-500">documentos</dd>
          </div>
          <div class="dashboard-cifra rounded-lg border border-gray-200 bg-white px-4 py-3">
            <dt class="text-xs text-gray-500">Última actividad</dt>
            <dd class="text-2xl font-bold text-gray-900">{{ ultimaActividad ? fechaCorta(ultimaActividad) : 'Sin datos' }}</dd>
            <dd class="text-xs text-gray-500">{{ tiempoTranscurrido(ultimaActividad) }}</dd>
          </div>
        </dl>

        <!-- Tabla -->
        <div v-if="filasVisibles.length > 0" class="dashboard-cifra overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table class="min-w-full divide-y divide-gray-200 text-xs" data-test="tabla-productividad">
            <thead class="bg-gray-50">
              <tr>
                <th
                  v-for="encabezado in encabezados"
                  :key="encabezado.clave"
                  class="px-2 py-2 text-xs font-medium uppercase tracking-wider text-gray-500"
                  :class="encabezado.izquierda ? 'text-left' : 'text-center'"
                  :title="encabezado.ayuda"
                  :aria-sort="orden.clave === encabezado.clave ? (orden.descendente ? 'descending' : 'ascending') : 'none'"
                >
                  <button type="button" class="font-medium uppercase tracking-wider hover:text-gray-800" @click="alternarOrden(encabezado.clave)">
                    {{ encabezado.titulo }}
                    <i
                      v-if="orden.clave === encabezado.clave"
                      class="fas ml-0.5 text-[9px]"
                      :class="orden.descendente ? 'fa-arrow-down' : 'fa-arrow-up'"
                      aria-hidden="true"
                    ></i>
                  </button>
                </th>
                <th v-if="esAdministrador" class="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Proveedor
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <UserProductivityItem
                v-for="fila in filasVisibles"
                :key="fila._id"
                :usuario="fila"
                :mostrar-puntos="!esAdministrador"
                :mostrar-cambio="hayComparacion"
                :mostrar-proveedor="esAdministrador"
                @ver-detalles="abrirDetalle"
              />
            </tbody>
          </table>
        </div>

        <!-- Mensaje cuando no hay datos -->
        <div v-else class="text-center py-12">
          <i class="fas fa-users text-4xl mb-4 text-gray-500"></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No hay usuarios disponibles</h3>
          <p class="text-gray-500">No se encontraron usuarios con datos de productividad.</p>
        </div>
      </template>

      <!-- Detalle de un usuario -->
      <div
        v-if="detalle"
        class="productivity-reglas-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        data-test="detalle-usuario"
        @click.self="cerrarDetalle"
      >
        <div class="productivity-reglas-modal bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="productivity-reglas-modal__header px-6 py-4 border-b border-gray-200">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="truncate text-lg font-semibold text-gray-800">{{ detalle.usuario.username }}</h3>
                <p class="truncate text-sm text-gray-500">{{ detalle.usuario.role }} · {{ detalle.usuario.email }}</p>
              </div>
              <button type="button" class="productivity-reglas-modal__close text-gray-400 hover:text-gray-600 transition-colors" aria-label="Cerrar" @click="cerrarDetalle">
                <i class="fas fa-times text-xl"></i>
              </button>
            </div>
          </div>

          <div class="productivity-reglas-modal__body px-6 py-4">
            <p v-if="detalle.cargando" class="py-6 text-center text-sm text-gray-500">Cargando...</p>
            <p v-else-if="detalle.dias.length === 0" class="py-6 text-center text-sm text-gray-500">Sin actividad en este periodo.</p>
            <template v-else>
              <h4 class="mb-2 text-sm font-medium text-gray-700">Documentos por tipo</h4>
              <ul class="mb-5 divide-y divide-gray-200 text-sm">
                <li v-for="tipo in detalle.tipos" :key="tipo.clave" class="flex justify-between py-1.5">
                  <span class="text-gray-700">{{ tipo.titulo }}</span>
                  <span class="font-medium text-gray-900">{{ tipo.total }}</span>
                </li>
              </ul>
              <h4 class="mb-2 text-sm font-medium text-gray-700">Actividad por día</h4>
              <ul class="max-h-64 divide-y divide-gray-200 overflow-y-auto text-sm" data-test="actividad-por-dia">
                <li v-for="dia in detalle.dias" :key="dia.fecha" class="flex justify-between py-1.5 pr-2">
                  <span class="text-gray-700">{{ diaCorto(dia.fecha) }}</span>
                  <span class="font-medium text-gray-900">{{ dia.total }}</span>
                </li>
              </ul>
            </template>
          </div>
        </div>
      </div>

      <!-- Modal de Reglas de Puntaje -->
      <div 
        v-if="mostrarModalReglas" 
        class="productivity-reglas-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        @click.self="cerrarModalReglas"
      >
        <div class="productivity-reglas-modal bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <!-- Header del Modal -->
          <div class="productivity-reglas-modal__header px-6 py-4 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <i class="fas fa-cog text-green-600"></i>
                Configuración de Reglas de Puntaje
              </h3>
              <button 
                @click="cerrarModalReglas"
                class="productivity-reglas-modal__close text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i class="fas fa-times text-xl"></i>
              </button>
            </div>
          </div>

          <!-- Contenido del Modal -->
          <div class="productivity-reglas-modal__body px-6 py-4">
            <div v-if="esAdministrador" class="productivity-reglas-modal__notice mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="flex items-center">
                <i class="fas fa-info-circle text-blue-500 mr-2"></i>
                <p class="text-sm text-blue-700">
                  Como administrador, puedes configurar las reglas de puntaje para tu propio proveedor de salud. Estas reglas se aplican solo a tu organización.
                </p>
              </div>
            </div>
            <p class="productivity-reglas-modal__intro text-sm text-gray-600 mb-6">
              Configura cuántos puntos otorga cada tipo de documento en el sistema de ranking para {{ esAdministrador ? 'tu proveedor de salud' : 'tu organización' }}.
            </p>

            <!-- Formulario de Configuración -->
            <div class="productivity-reglas-modal__rules space-y-4">
              <!-- Aptitudes -->
              <div class="productivity-reglas-modal__rule productivity-reglas-modal__rule--green flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div class="flex items-center gap-3">
                  <i class="fas fa-user-check text-green-500 text-lg"></i>
                  <div>
                    <div class="font-medium text-gray-900">Aptitudes</div>
                    <div class="text-sm text-gray-500">Documentos de aptitud laboral</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="configuracionPuntos.aptitudes"
                    type="number"
                    min="0"
                    max="100"
                    :class="getInputClasses('border-green-500 ring-green-500')"
                  />
                  <span class="text-sm text-gray-500">puntos</span>
                </div>
              </div>

              <!-- Historias Clínicas -->
              <div class="productivity-reglas-modal__rule productivity-reglas-modal__rule--teal flex items-center justify-between p-4 bg-teal-50 rounded-lg">
                <div class="flex items-center gap-3">
                  <i class="fas fa-notes-medical text-teal-500 text-lg"></i>
                  <div>
                    <div class="font-medium text-gray-900">Historias Clínicas</div>
                    <div class="text-sm text-gray-500">Antecedentes médicos y laborales</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="configuracionPuntos.historias"
                    type="number"
                    min="0"
                    max="100"
                    :class="getInputClasses('border-teal-500 ring-teal-500')"
                  />
                  <span class="text-sm text-gray-500">puntos</span>
                </div>
              </div>

              <!-- Exploraciones Físicas -->
              <div class="productivity-reglas-modal__rule productivity-reglas-modal__rule--indigo flex items-center justify-between p-4 bg-indigo-50 rounded-lg">
                <div class="flex items-center gap-3">
                  <i class="fas fa-heartbeat text-indigo-500 text-lg"></i>
                  <div>
                    <div class="font-medium text-gray-900">Exploraciones Físicas</div>
                    <div class="text-sm text-gray-500">Somatometría, signos vitales y exploración física</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="configuracionPuntos.exploraciones"
                    type="number"
                    min="0"
                    max="100"
                    :class="getInputClasses('border-indigo-500 ring-indigo-500')"
                  />
                  <span class="text-sm text-gray-500">puntos</span>
                </div>
              </div>

              <!-- Exámenes de la Vista -->
              <div class="productivity-reglas-modal__rule productivity-reglas-modal__rule--yellow flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                <div class="flex items-center gap-3">
                  <i class="fas fa-eye text-yellow-500 text-lg"></i>
                  <div>
                    <div class="font-medium text-gray-900">Exámenes de la Vista</div>
                    <div class="text-sm text-gray-500">Agudeza visual e ishihara</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="configuracionPuntos.examenesVista"
                    type="number"
                    min="0"
                    max="100"
                    :class="getInputClasses('border-yellow-500 ring-yellow-500')"
                  />
                  <span class="text-sm text-gray-500">puntos</span>
                </div>
              </div>

              <!-- Audiometrías -->
              <div class="productivity-reglas-modal__rule productivity-reglas-modal__rule--purple flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div class="flex items-center gap-3">
                  <i class="fas fa-volume-up text-purple-500 text-lg"></i>
                  <div>
                    <div class="font-medium text-gray-900">Audiometrías</div>
                    <div class="text-sm text-gray-500">Evaluaciones auditivas</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="configuracionPuntos.audiometrias"
                    type="number"
                    min="0"
                    max="100"
                    :class="getInputClasses('border-purple-500 ring-purple-500')"
                  />
                  <span class="text-sm text-gray-500">puntos</span>
                </div>
              </div>

              <!-- Antidopings -->
              <div class="productivity-reglas-modal__rule productivity-reglas-modal__rule--red flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div class="flex items-center gap-3">
                  <i class="fas fa-flask text-red-500 text-lg"></i>
                  <div>
                    <div class="font-medium text-gray-900">Antidopings</div>
                    <div class="text-sm text-gray-500">Pruebas de sustancias</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="configuracionPuntos.antidopings"
                    type="number"
                    min="0"
                    max="100"
                    :class="getInputClasses('border-red-500 ring-red-500')"
                  />
                  <span class="text-sm text-gray-500">puntos</span>
                </div>
              </div>

              <!-- Notas Médicas -->
              <div class="productivity-reglas-modal__rule productivity-reglas-modal__rule--orange flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                <div class="flex items-center gap-3">
                  <i class="fas fa-stethoscope text-orange-500 text-lg"></i>
                  <div>
                    <div class="font-medium text-gray-900">Notas Médicas</div>
                    <div class="text-sm text-gray-500">Consultas médicas</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="configuracionPuntos.notas"
                    type="number"
                    min="0"
                    max="100"
                    :class="getInputClasses('border-orange-500 ring-orange-500')"
                  />
                  <span class="text-sm text-gray-500">puntos</span>
                </div>
              </div>

              <!-- Documentos Externos -->
              <div class="productivity-reglas-modal__rule productivity-reglas-modal__rule--gray flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div class="flex items-center gap-3">
                  <i class="fas fa-file-upload text-gray-600 text-lg"></i>
                  <div>
                    <div class="font-medium text-gray-900">Documentos Externos</div>
                    <div class="text-sm text-gray-500">Archivos subidos</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="configuracionPuntos.externos"
                    type="number"
                    min="0"
                    max="100"
                    :class="getInputClasses('border-gray-500 ring-gray-500')"
                  />
                  <span class="text-sm text-gray-500">puntos</span>
                </div>
              </div>

              <!-- Otros documentos -->
              <div class="productivity-reglas-modal__rule productivity-reglas-modal__rule--gray flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div class="flex items-center gap-3">
                  <i class="fas fa-file-medical text-sky-500 text-lg"></i>
                  <div>
                    <div class="font-medium text-gray-900">Otros documentos</div>
                    <div class="text-sm text-gray-500">{{ AYUDA_OTROS_DOCUMENTOS }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="configuracionPuntos.otros"
                    type="number"
                    min="0"
                    max="100"
                    :class="getInputClasses('border-gray-500 ring-gray-500')"
                  />
                  <span class="text-sm text-gray-500">puntos</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer del Modal -->
          <div class="productivity-reglas-modal__footer px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div class="flex items-center justify-between">
              <button
                @click="resetearConfiguracion"
                class="productivity-reglas-modal__btn-muted px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                <i class="fas fa-undo mr-2"></i>
                Restablecer Valores
              </button>
              <div class="flex gap-3">
                <button
                  @click="cerrarModalReglas"
                  class="productivity-reglas-modal__btn-muted px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  @click="guardarConfiguracion"
                  :disabled="savingConfig"
                  class="productivity-reglas-modal__btn-save px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i class="fas fa-save mr-2"></i>
                  <span v-if="savingConfig">Guardando...</span>
                  <span v-else>Guardar Configuración</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.productividad-skeleton {
  background-color: rgb(229 231 235);
  animation: productividad-parpadeo 2.4s ease-in-out infinite;
}

@keyframes productividad-parpadeo {
  0%,
  100% {
    opacity: 0.38;
  }

  50% {
    opacity: 0.72;
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
