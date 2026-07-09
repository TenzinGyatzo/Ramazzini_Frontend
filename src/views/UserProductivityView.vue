<script setup>
import { ref, onMounted, onUnmounted, inject, computed, watch } from "vue";
import { useUserStore } from "@/stores/user";
import UserProductivityItem from "@/components/UserProductivityItem.vue";
import UserProductivityAPI from "@/api/UserProductivityAPI";

const toast = inject("toast");
const userStore = useUserStore();
const usuarios = ref([]);
const loading = ref(true);
const fechaInicio = ref(null);
const fechaFin = ref(null);
const periodoPredefinido = ref('');

// Computed para obtener la última actividad global
const ultimaActividadGlobal = computed(() => {
  if (usuariosConProductividad.value.length === 0) return 'Sin datos';
  
  // Encontrar la fecha más reciente entre todos los usuarios
  const fechas = usuariosConProductividad.value
    .map(usuario => usuario.productividad?.ultimoInforme)
    .filter(fecha => fecha !== null && fecha !== undefined)
    .map(fecha => new Date(fecha));
  
  if (fechas.length === 0) return 'Sin actividad';
  
  const fechaMasReciente = new Date(Math.max(...fechas));
  const ahora = new Date();
  const diferenciaMs = ahora - fechaMasReciente;
  const diferenciaHoras = Math.floor(diferenciaMs / (1000 * 60 * 60));
  const diferenciaDias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
  
  if (diferenciaHoras < 24) {
    return diferenciaHoras === 0 ? 'Hace menos de 1 hora' : `Hace ${diferenciaHoras}h`;
  } else if (diferenciaDias < 7) {
    return diferenciaDias === 1 ? 'Hace 1 día' : `Hace ${diferenciaDias} días`;
  } else {
    return fechaMasReciente.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
});

const user = computed(() => userStore.user);

// Verificar si el usuario actual es el administrador
const esAdministrador = computed(() => {
  return user.value?.email === 'edgarcoronel66@gmail.com';
});

// Opciones de periodos predefinidos
const opcionesPeriodo = [
  'Hoy',
  'Esta semana', 
  'Este mes',
  'Mes anterior',
  'Últimos 3 meses',
  'Últimos 6 meses',
  'Este año',
  'Año anterior'
];

// Función para calcular fechas según el periodo seleccionado
const calcularFechasPeriodo = (periodo) => {
  const hoy = new Date();
  
  switch (periodo) {
    case 'Hoy':
      return {
        inicio: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()),
        fin: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
      };
    case 'Esta semana':
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1); // Lunes
      inicioSemana.setHours(0, 0, 0, 0);
      const finSemana = new Date(inicioSemana);
      finSemana.setDate(inicioSemana.getDate() + 6); // Domingo
      finSemana.setHours(23, 59, 59, 999);
      return { inicio: inicioSemana, fin: finSemana };
    case 'Este mes':
      return {
        inicio: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
        fin: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
      };
    case 'Mes anterior':
      return {
        inicio: new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1),
        fin: new Date(hoy.getFullYear(), hoy.getMonth(), 0)
      };
    case 'Últimos 3 meses':
      const inicio3Meses = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
      const fin3Meses = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      return { inicio: inicio3Meses, fin: fin3Meses };
    case 'Últimos 6 meses':
      const inicio6Meses = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1);
      const fin6Meses = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      return { inicio: inicio6Meses, fin: fin6Meses };
    case 'Este año':
      return {
        inicio: new Date(hoy.getFullYear(), 0, 1),
        fin: new Date(hoy.getFullYear(), 11, 31)
      };
    case 'Año anterior':
      return {
        inicio: new Date(hoy.getFullYear() - 1, 0, 1),
        fin: new Date(hoy.getFullYear() - 1, 11, 31)
      };
    default:
      return { inicio: null, fin: null };
  }
};

// Función para manejar el cambio de periodo predefinido
const manejarCambioPeriodo = (periodo) => {
  if (periodo === '') {
    // Si se selecciona "Seleccionar periodo", limpiar las fechas
    fechaInicio.value = null;
    fechaFin.value = null;
    return;
  }
  
  const fechas = calcularFechasPeriodo(periodo);
  fechaInicio.value = fechas.inicio.toISOString().split('T')[0];
  fechaFin.value = fechas.fin.toISOString().split('T')[0];
};

// Función para limpiar fechas
const limpiarFechas = () => {
  fechaInicio.value = null;
  fechaFin.value = null;
  periodoPredefinido.value = '';
};

// Computed para validar rango de fechas
const rangoInvalido = computed(() => {
  return fechaInicio.value && fechaFin.value && new Date(fechaInicio.value) > new Date(fechaFin.value);
});

// Computed para determinar si hay filtros aplicados
const hayFiltrosAplicados = computed(() => {
  return fechaInicio.value || fechaFin.value;
});

// Sistema de puntuación para ranking (usando configuración reactiva)
const calcularPuntuacion = (productividad) => {
  if (!productividad) return 0;
  
  const puntos = {
    aptitudes: productividad.totalAptitudes * configuracionPuntos.value.aptitudes,
    historias: productividad.totalHistoriasClinicas * configuracionPuntos.value.historias,
    exploraciones: productividad.totalExploracionesFisicas * configuracionPuntos.value.exploraciones,
    examenesVista: productividad.totalExamenesVista * configuracionPuntos.value.examenesVista,
    audiometrias: productividad.totalAudiometrias * configuracionPuntos.value.audiometrias,
    antidopings: productividad.totalAntidopings * configuracionPuntos.value.antidopings,
    notas: productividad.totalNotasMedicas * configuracionPuntos.value.notas,
    externos: productividad.totalDocumentosExternos * configuracionPuntos.value.externos
  };
  
  return puntos.aptitudes + puntos.historias + puntos.exploraciones + 
         puntos.examenesVista + puntos.audiometrias + puntos.antidopings + 
         puntos.notas + puntos.externos;
};

// Computed para ranking de usuarios
const rankingUsuarios = computed(() => {
  return usuariosConProductividad.value
    .map(usuario => ({
      ...usuario,
      puntuacion: calcularPuntuacion(usuario.productividad)
    }))
    .sort((a, b) => b.puntuacion - a.puntuacion);
});

// Computed para top 3 performers
const topPerformers = computed(() => {
  return rankingUsuarios.value.slice(0, 3);
});

// Estado para mostrar todo el ranking
const mostrarRankingCompleto = ref(false);

// Estado para el modal de reglas de puntaje
const mostrarModalReglas = ref(false);

// Configuración de puntos (reactiva para permitir modificaciones)
const configuracionPuntos = ref({
  aptitudes: 3,
  historias: 1,
  exploraciones: 1,
  examenesVista: 1,
  audiometrias: 1,
  antidopings: 1,
  notas: 2,
  externos: 0
});

// Configuración original (para resetear)
const configuracionOriginal = {
  aptitudes: 3,
  historias: 1,
  exploraciones: 1,
  examenesVista: 1,
  audiometrias: 1,
  antidopings: 1,
  notas: 2,
  externos: 0
};

const usuariosConProductividad = ref([]);
const skipWatchRecarga = ref(true);
let abortController = null;
let debounceTimer = null;

const aplicarReglasPuntaje = (reglas) => {
  if (reglas) {
    configuracionPuntos.value = { ...configuracionOriginal, ...reglas };
  }
};

// Función para cargar datos con filtros
const cargarDatos = async (inicio, fin) => {
  if (abortController) {
    abortController.abort();
  }
  abortController = new AbortController();
  const { signal } = abortController;

  try {
    loading.value = true;

    let response;

    if (esAdministrador.value) {
      response = await UserProductivityAPI.getAllProductivityStats(inicio, fin, signal);
    } else {
      response = await UserProductivityAPI.getProductivityStatsByProveedor(
        user.value.idProveedorSalud,
        inicio,
        fin,
        signal
      );
    }

    if (signal.aborted) return;

    const payload = response.data;
    if (payload?.usuarios) {
      usuariosConProductividad.value = payload.usuarios;
      aplicarReglasPuntaje(payload.reglasPuntaje);
    } else if (Array.isArray(payload)) {
      usuariosConProductividad.value = payload;
    } else {
      throw new Error("No se obtuvieron datos de productividad");
    }
  } catch (error) {
    if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
      return;
    }
    console.error("Error al cargar datos:", error);
    usuariosConProductividad.value = [];
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

onMounted(async () => {
  periodoPredefinido.value = 'Este mes';
  manejarCambioPeriodo('Este mes');
  skipWatchRecarga.value = false;
  await cargarDatos(fechaInicio.value, fechaFin.value);
});

onUnmounted(() => {
  if (abortController) abortController.abort();
  if (debounceTimer) clearTimeout(debounceTimer);
});

// Watcher para recargar datos cuando cambien las fechas
watch([fechaInicio, fechaFin], ([inicio, fin]) => {
  if (skipWatchRecarga.value) return;

  if (inicio && fin && new Date(inicio) > new Date(fin)) {
    toast.open({
      message: 'La fecha de inicio no puede ser mayor que la fecha final.',
      type: 'error'
    });
    return;
  }

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    cargarDatos(inicio, fin);
  }, 300);
});

// Función para obtener estadísticas de un usuario específico
const obtenerEstadisticasUsuario = async (userId) => {
  try {
    console.log("Obteniendo estadísticas para usuario:", userId);
    
    const response = await UserProductivityAPI.getUserDetailedStats(
      userId, 
      fechaInicio.value, 
      fechaFin.value
    );
    
    if (response.data) {
      return response.data;
    } else {
      throw new Error("No se obtuvieron estadísticas del usuario");
    }
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    toast.open({
      type: "error",
      message: "Error al obtener estadísticas del usuario",
      position: "top-right",
    });
    return null;
  }
};

// Funciones para el modal de reglas de puntaje
const abrirModalReglas = async () => {
  mostrarModalReglas.value = true;
  await cargarConfiguracionGuardada();
};

const cerrarModalReglas = () => {
  mostrarModalReglas.value = false;
};

const guardarConfiguracion = async () => {
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
  }
};

const resetearConfiguracion = () => {
  configuracionPuntos.value = { ...configuracionOriginal };
};

const cargarConfiguracionGuardada = async () => {
  try {
    const response = await UserProductivityAPI.getReglasPuntaje(user.value.idProveedorSalud);
    if (response.data) {
      configuracionPuntos.value = response.data;
    }
  } catch (error) {
    console.error('Error al cargar configuración:', error);
    // En caso de error, usar configuración por defecto
    configuracionPuntos.value = { ...configuracionOriginal };
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
      <!-- Header -->
      <div class="mb-3">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-800 mb-1">
              Monitoreo de Productividad
            </h1>
            <p class="text-gray-600">
              {{ esAdministrador ? 'Supervisa el rendimiento de todos los usuarios del sistema' : 'Supervisa el rendimiento y actividad de los usuarios del sistema' }}
            </p>
          </div>
          <div v-if="esAdministrador" class="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full">
            <i class="fas fa-crown text-sm"></i>
            <span class="text-sm font-medium">Modo Administrador</span>
          </div>
        </div>
        <hr class="mt-4 border-gray-200" />
      </div>

      <!-- Filtros y controles -->
      <div class="mb-1 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div class="flex gap-2">
          <!-- <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <i class="fas fa-download mr-2"></i>
            Exportar
          </button> -->
          
          <button 
            @click="abrirModalReglas"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="Configurar reglas de puntaje"
          >
            <i class="fas fa-cog mr-2"></i>
            Reglas de Puntaje
          </button>
        </div>

        <!-- Filtro de periodo -->
        <div class="flex flex-col justify-end text-xs ml-auto w-full sm:w-auto">
          <div class="flex items-center gap-2">
            <label class="block text-xs font-medium text-gray-700 mb-1">Periodo</label>
            <transition name="fade">
              <button 
                v-if="fechaInicio || fechaFin"
                @click="limpiarFechas"
                class="block text-xs font-medium mb-1 text-red-600 hover:text-red-500"
              >
                &nbsp;
                <i class="fa-solid fa-calendar-xmark"></i>
                &nbsp;Limpiar
              </button>
            </transition>
          </div>

          <div class="grid grid-cols-1 sm:flex sm:items-end gap-2">
            <!-- Select de periodos predefinidos -->
            <div class="flex flex-col">
              <label class="text-[11px] text-gray-500 mb-0.5">Periodo rápido</label>
              <select
                v-model="periodoPredefinido"
                @change="manejarCambioPeriodo(periodoPredefinido)"
                class="border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-1 rounded-md shadow-sm text-xs text-gray-700 bg-white transition duration-150 ease-in-out min-w-full sm:min-w-[120px]"
              >
                <option value="">Seleccionar periodo</option>
                <option v-for="opcion in opcionesPeriodo" :key="opcion" :value="opcion">{{ opcion }}</option>
              </select>
            </div>

            <div class="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-row gap-2">
              <!-- Fecha inicio -->
              <div class="flex flex-col">
                <label for="fechaInicio" class="text-[11px] text-gray-500 mb-0.5">Inicio</label>
                <input
                  id="fechaInicio"
                  type="date"
                  v-model="fechaInicio"
                  class="border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-1 rounded-md shadow-sm text-xs text-gray-700 bg-white transition"
                />
              </div>
              <!-- Fecha fin -->
              <div class="flex flex-col">
                <label for="fechaFin" class="text-[11px] text-gray-500 mb-0.5">Final</label>
                <input
                  id="fechaFin"
                  type="date"
                  v-model="fechaFin"
                  class="border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none px-2 py-1 rounded-md shadow-sm text-xs text-gray-700 bg-white transition"
                />
              </div>
            </div>
          </div>

          <!-- Testigo de filtro -->
          <!-- Este div externo SIEMPRE existe y tiene una altura mínima -->
          <div class="min-h-[1.5rem]">
            <!-- Aquí va el elemento que aparece/desaparece -->
            <transition name="fade">
              <div
                v-if="fechaInicio && fechaFin"
                class="flex items-center gap-1 mt-2"
              >
                <!-- Contenido del testigo -->
                <i
                  :class="[
                    'fas',
                    'text-xs',
                    rangoInvalido ? 'fa-circle-exclamation text-rose-500' : 'fa-filter text-emerald-500'
                  ]"
                ></i>
                <span
                  :class="[
                    'text-xs',
                    rangoInvalido ? 'text-rose-600' : 'text-emerald-600'
                  ]"
                >
                  {{ rangoInvalido
                    ? 'Filtro no aplicado: corrige el orden de las fechas'
                    : `Filtro aplicado: ${new Date(fechaInicio).toLocaleDateString('es-MX', { timeZone: 'UTC' })} - ${new Date(fechaFin).toLocaleDateString('es-MX', { timeZone: 'UTC' })}` }}
                </span>
              </div>
            </transition>
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">Cargando datos de productividad...</span>
      </div>

      <!-- Tabla de Ranking -->
      <div v-else-if="rankingUsuarios.length > 0" class="mb-8">
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <h2 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <i class="fas fa-trophy text-yellow-500"></i>
                  Ranking de Productividad
                </h2>
                <span class="ml-2 text-sm text-gray-500">
                  ({{ esAdministrador ? 'Todos los usuarios del sistema' : hayFiltrosAplicados ? 'Período filtrado' : 'Todos los datos' }})
                </span>
              </div>
              <button
                @click="mostrarRankingCompleto = !mostrarRankingCompleto"
                class="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                <i class="fas mr-2" :class="mostrarRankingCompleto ? 'fa-eye-slash' : 'fa-eye'"></i>
                {{ mostrarRankingCompleto ? 'Ver solo Top 3' : 'Ver ranking completo' }}
              </button>
            </div>
          </div>
          
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-xs">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Posición
                  </th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Puntuación
                  </th>
                  <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aptitudes
                  </th>
                  <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Historias Clínicas">
                    Historias
                  </th>
                  <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Exploraciones Físicas">
                    Exploraciones
                  </th>
                  <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Exámenes de la Vista">
                    Ex. Vista
                  </th>
                  <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Audiometrías">
                    Audiometrías
                  </th>
                  <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Antidopings">
                    Antidopings
                  </th>
                  <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Notas Médicas">
                    Notas
                  </th>
                  <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Notas Médicas">
                    Externos
                  </th>
                  <th v-if="esAdministrador" class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  v-for="(usuario, index) in (mostrarRankingCompleto ? rankingUsuarios : topPerformers)"
                  :key="usuario._id"
                  class="hover:bg-gray-50 transition-colors"
                  :class="{
                    'bg-yellow-50': index === 0,
                    'bg-gray-50': index === 1,
                    'bg-orange-50': index === 2
                  }"
                >
                  <!-- Posición -->
                  <td class="px-3 py-3 whitespace-nowrap">
                    <div class="flex items-center">
                      <span
                        class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                        :class="{
                          'bg-yellow-500 text-white': index === 0,
                          'bg-gray-400 text-white': index === 1,
                          'bg-orange-500 text-white': index === 2,
                          'bg-gray-200 text-gray-700': index > 2
                        }"
                      >
                        {{ index + 1 }}
                      </span>
                      <div class="ml-2">
                        <div class="text-xs font-medium text-gray-900">
                          {{ index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '' }}
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Usuario -->
                  <td class="px-3 py-3 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="flex-shrink-0 h-8 w-8">
                        <div class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <i class="fas fa-user text-blue-600 text-xs"></i>
                        </div>
                      </div>
                      <div class="ml-3">
                        <div class="text-sm font-medium text-gray-900 truncate max-w-[170px]">
                          {{ usuario.username }}
                        </div>
                        <div class="text-xs text-gray-500 truncate max-w-[170px]">
                          {{ usuario.email }}
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Puntuación -->
                  <td class="px-2 py-3 whitespace-nowrap text-center">
                    <div class="text-sm font-bold text-gray-900">
                      {{ usuario.puntuacion }} <span class="text-xs font-normal text-gray-500">pts</span>
                    </div>
                  </td>

                  <!-- Aptitudes -->
                  <td class="px-2 py-3 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center">
                      <div class="text-sm font-medium text-gray-900">
                        {{ usuario.productividad?.totalAptitudes || 0 }}
                      </div>
                      <div class="ml-2">
                        <i class="fas fa-user-check text-green-500 text-xs"></i>
                      </div>
                    </div>
                  </td>

                  <!-- Historias -->
                  <td class="px-2 py-3 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center">
                      <div class="text-sm font-medium text-gray-900">
                        {{ usuario.productividad?.totalHistoriasClinicas || 0 }}
                      </div>
                      <div class="ml-2">
                        <i class="fas fa-notes-medical text-teal-500 text-xs"></i>
                      </div>
                    </div>
                  </td>

                  <!-- Exploraciones -->
                  <td class="px-2 py-3 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center">
                      <div class="text-sm font-medium text-gray-900">
                        {{ usuario.productividad?.totalExploracionesFisicas || 0 }}
                      </div>
                      <div class="ml-2">
                        <i class="fas fa-heartbeat text-indigo-500 text-xs"></i>
                      </div>
                    </div>
                  </td>

                  <!-- Ex. Vista -->
                  <td class="px-2 py-3 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center">
                      <div class="text-sm font-medium text-gray-900">
                        {{ usuario.productividad?.totalExamenesVista || 0 }}
                      </div>
                      <div class="ml-2">
                        <i class="fas fa-eye text-yellow-500 text-xs"></i>
                      </div>
                    </div>
                  </td>

                  <!-- Audiometrías -->
                  <td class="px-2 py-3 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center">
                      <div class="text-sm font-medium text-gray-900">
                        {{ usuario.productividad?.totalAudiometrias || 0 }}
                      </div>
                      <div class="ml-2">
                        <i class="fas fa-volume-up text-purple-500 text-xs"></i>
                      </div>
                    </div>
                  </td>

                  <!-- Antidopings -->
                  <td class="px-2 py-3 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center">
                      <div class="text-sm font-medium text-gray-900">
                        {{ usuario.productividad?.totalAntidopings || 0 }}
                      </div>
                      <div class="ml-2">
                        <i class="fas fa-flask text-red-500 text-xs"></i>
                      </div>
                    </div>
                  </td>

                  <!-- Notas -->
                  <td class="px-2 py-3 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center">
                      <div class="text-sm font-medium text-gray-900">
                        {{ usuario.productividad?.totalNotasMedicas || 0 }}
                      </div>
                      <div class="ml-2">
                        <i class="fas fa-stethoscope text-orange-500 text-xs"></i>
                      </div>
                    </div>
                  </td>

                  <!-- Externos -->
                  <td class="px-2 py-3 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center">
                      <div class="text-sm font-medium text-gray-900">
                        {{ usuario.productividad?.totalDocumentosExternos || 0 }}
                      </div>
                      <div class="ml-2">
                        <i class="fas fa-file-upload text-gray-600 text-xs"></i>
                      </div>
                    </div>
                  </td>

                  <!-- Proveedor (solo para administradores) -->
                  <td v-if="esAdministrador" class="px-2 py-3 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center">
                      <div class="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                        {{ usuario.proveedorNombre || 'Sin proveedor' }}
                      </div>
                    </div>
                  </td>

                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Tabla de productividad -->
      <div v-if="!loading && usuariosConProductividad.length > 0" class="bg-white rounded-lg shadow-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <h2 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <i class="fas fa-table text-blue-500"></i>
                Detalle de Productividad
              </h2>
              <span class="ml-2 text-sm text-gray-500">
                ({{ esAdministrador ? 'Todos los usuarios del sistema' : hayFiltrosAplicados ? 'Período filtrado' : 'Todos los datos' }})
              </span>
            </div>
          </div>
        </div>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 text-xs">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aptitudes
                </th>
                <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Historias Clínicas">
                  Historias
                </th>
                <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Exploraciones Físicas">
                  Exploraciones
                </th>
                <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Exámenes de la Vista">
                  Ex. Vista
                </th>
                <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Audiometrías">
                  Audiometrías
                </th>
                <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Antidopings">
                  Antidopings
                </th>
                <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Notas Médicas">
                  Notas
                </th>
                <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Documentos Externos">
                  Externos
                </th>
                <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Total de Documentos">
                  Total
                </th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último Informe
                </th>
                <th v-if="esAdministrador" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proveedor
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <UserProductivityItem
                v-for="usuario in usuariosConProductividad"
                :key="usuario._id"
                :usuario="usuario"
                :mostrar-estado-actividad="!hayFiltrosAplicados"
                :mostrar-proveedor="esAdministrador"
                @ver-detalles="obtenerEstadisticasUsuario"
              />
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mensaje cuando no hay datos -->
      <div v-if="!loading && usuariosConProductividad.length === 0" class="text-center py-12">
        <div class="text-gray-500">
          <i class="fas fa-users text-4xl mb-4"></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No hay usuarios disponibles</h3>
          <p class="text-gray-500">No se encontraron usuarios con datos de productividad.</p>
        </div>
      </div>

      <!-- Resumen estadístico -->
      <div v-if="!loading" class="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-blue-100 text-blue-600">
              <i class="fas fa-users text-xl"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Total Usuarios</p>
              <p class="text-2xl font-bold text-gray-900">{{ usuariosConProductividad.length }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-lg">
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-green-100 text-green-600">
              <i class="fas fa-file-medical text-xl"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Total Documentos</p>
              <p class="text-2xl font-bold text-gray-900">
                {{ usuariosConProductividad.reduce((sum, u) => sum + u.productividad.totalDocumentos, 0) }}
              </p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-lg">
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <i class="fas fa-chart-line text-xl"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Promedio por Usuario</p>
              <p class="text-2xl font-bold text-gray-900">
                {{ usuariosConProductividad.length
                  ? Math.round(usuariosConProductividad.reduce((sum, u) => sum + u.productividad.totalDocumentos, 0) / usuariosConProductividad.length)
                  : 0 }}
              </p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-lg">
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-purple-100 text-purple-600">
              <i class="fas fa-calendar text-xl"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Última Actividad</p>
              <p class="text-lg font-bold text-gray-900">{{ ultimaActividadGlobal }}</p>
            </div>
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
                  class="productivity-reglas-modal__btn-save px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                >
                  <i class="fas fa-save mr-2"></i>
                  Guardar Configuración
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
