<script setup>
import { onMounted, ref, computed } from 'vue';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import ProveedorItem from '@/components/ProveedorItem.vue';
import ProveedorSaludAPI from '@/api/ProveedorSaludAPI';
import { differenceInDays, parseISO } from 'date-fns';
import {
  getCachedPanelDetails,
  setCachedPanelDetails,
  invalidatePanelAdminCache,
} from '@/composables/usePanelAdminCache';

const userStore = useUserStore();
const router = useRouter();
const proveedorSaludStore = useProveedorSaludStore();
const proveedores = ref([]);
const isLoading = ref(true);
const isRefreshing = ref(false);
const error = ref(null);
const seccionesLoading = ref({
  activos: false,
  cancelados: false,
  sinSuscripcion: false,
  periodoGratuitoActivo: false,
  periodoGratuitoFinalizado: false,
});

const seccionesExpanded = ref({
  activos: false,
  cancelados: false,
  sinSuscripcion: false,
  periodoGratuitoActivo: false,
  periodoGratuitoFinalizado: false,
});

const redirigirSiNoEsAdmin = () => {
  const adminEmail = 'edgarcoronel66@gmail.com';
  if (userStore.user?.email !== adminEmail) {
    router.push({ name: 'inicio' });
  }
};

const esPeriodoGratuitoActivo = (proveedor) => {
  if (!proveedor.fechaInicioTrial) return false;

  const fechaInicio = parseISO(proveedor.fechaInicioTrial);
  const fechaFin = new Date(fechaInicio);
  fechaFin.setDate(fechaFin.getDate() + 15);
  fechaFin.setHours(23, 59, 59);

  const hoy = new Date();
  return differenceInDays(fechaFin, hoy) > 0;
};

const proveedoresAgrupados = computed(() => {
  const activos = proveedores.value.filter((p) => p.estadoSuscripcion === 'authorized');
  const cancelados = proveedores.value.filter((p) => p.estadoSuscripcion === 'cancelled');
  const sinSuscripcion = proveedores.value.filter((p) => !p.estadoSuscripcion);

  const periodoGratuitoActivo = sinSuscripcion.filter((p) => esPeriodoGratuitoActivo(p));
  const periodoGratuitoFinalizado = sinSuscripcion.filter((p) => !esPeriodoGratuitoActivo(p));

  return {
    activos,
    cancelados,
    sinSuscripcion: {
      periodoGratuitoActivo,
      periodoGratuitoFinalizado,
    },
  };
});

const estadisticas = computed(() => {
  const grupos = proveedoresAgrupados.value;
  return {
    total: proveedores.value.length,
    activos: grupos.activos.length,
    cancelados: grupos.cancelados.length,
    sinSuscripcion:
      grupos.sinSuscripcion.periodoGratuitoActivo.length +
      grupos.sinSuscripcion.periodoGratuitoFinalizado.length,
    periodoGratuitoActivo: grupos.sinSuscripcion.periodoGratuitoActivo.length,
    periodoGratuitoFinalizado: grupos.sinSuscripcion.periodoGratuitoFinalizado.length,
  };
});

function proveedoresDeSeccion(seccion) {
  const g = proveedoresAgrupados.value;
  switch (seccion) {
    case 'activos':
      return g.activos;
    case 'cancelados':
      return g.cancelados;
    case 'periodoGratuitoActivo':
      return g.sinSuscripcion.periodoGratuitoActivo;
    case 'periodoGratuitoFinalizado':
      return g.sinSuscripcion.periodoGratuitoFinalizado;
    case 'sinSuscripcion':
      return [
        ...g.sinSuscripcion.periodoGratuitoActivo,
        ...g.sinSuscripcion.periodoGratuitoFinalizado,
      ];
    default:
      return [];
  }
}

function idsPendientesDeSeccion(seccion) {
  return proveedoresDeSeccion(seccion)
    .filter((p) => !p._detalleCargado)
    .map((p) => String(p._id));
}

function seccionesRelacionadas(seccion) {
  if (seccion === 'periodoGratuitoActivo' || seccion === 'periodoGratuitoFinalizado') {
    return [seccion, 'sinSuscripcion'];
  }
  return [seccion];
}

function mapDetalleEnProveedor(base, detalle) {
  const principalUser = detalle.principalUser ?? null;
  return {
    ...base,
    _detalleCargado: true,
    empresasCount: detalle.empresasCount ?? 0,
    principalUser,
    users: principalUser ? { data: [principalUser] } : { data: [] },
    historiasClinicasMes: detalle.historiasClinicasMes ?? 0,
    notasMedicasMes: detalle.notasMedicasMes ?? 0,
    todasLasHistoriasClinicas: detalle.totalHistoriasClinicas ?? 0,
    todasLasNotasMedicas: detalle.totalNotasMedicas ?? 0,
    suscripcion: detalle.suscripcion ?? null,
    suscripcionActivaId: base.suscripcionActiva ?? null,
  };
}

function mergeDetalleEnProveedores(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  setCachedPanelDetails(rows);
  const byId = new Map(rows.map((row) => [String(row._id), row]));

  proveedores.value = proveedores.value.map((p) => {
    const detalle = byId.get(String(p._id));
    if (!detalle) return p;
    return mapDetalleEnProveedor(p, detalle);
  });
}

async function cargarDetalleProveedores(ids, secciones = []) {
  if (!ids.length) return;

  const cached = getCachedPanelDetails(ids);
  if (cached) {
    mergeDetalleEnProveedores(ids.map((id) => ({ _id: id, ...cached[id] })));
    return;
  }

  for (const seccion of secciones) {
    seccionesLoading.value[seccion] = true;
  }

  try {
    const { data } = await ProveedorSaludAPI.getPanelAdmin(ids);
    mergeDetalleEnProveedores(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error('Error al cargar detalle del panel admin:', err);
    throw err;
  } finally {
    for (const seccion of secciones) {
      seccionesLoading.value[seccion] = false;
    }
  }
}

async function cargarProveedores(force = false) {
  try {
    if (force) {
      invalidatePanelAdminCache();
    }

    isLoading.value = true;
    error.value = null;

    const listaProveedores = await proveedorSaludStore.getAllProveedores();
    const lista = Array.isArray(listaProveedores) ? listaProveedores : [];

    proveedores.value = lista.map((p) => ({
      ...p,
      _detalleCargado: false,
      empresasCount: 0,
      principalUser: null,
      users: { data: [] },
      historiasClinicasMes: 0,
      notasMedicasMes: 0,
      todasLasHistoriasClinicas: 0,
      todasLasNotasMedicas: 0,
      suscripcion: null,
      suscripcionActivaId: p.suscripcionActiva ?? null,
    }));
  } catch (err) {
    console.error('Error al cargar proveedores:', err);
    error.value = 'Error al cargar los datos de los proveedores. Por favor, intenta de nuevo.';
  } finally {
    isLoading.value = false;
  }
}

async function actualizarPanel() {
  isRefreshing.value = true;
  try {
    invalidatePanelAdminCache();
    await cargarProveedores(true);
  } finally {
    isRefreshing.value = false;
  }
}

const reintentarCarga = () => {
  cargarProveedores(true);
};

async function toggleSeccion(seccion) {
  const willExpand = !seccionesExpanded.value[seccion];
  seccionesExpanded.value[seccion] = willExpand;

  if (!willExpand) return;

  const ids = idsPendientesDeSeccion(seccion);
  if (!ids.length) return;

  try {
    await cargarDetalleProveedores(ids, seccionesRelacionadas(seccion));
  } catch {
    error.value = 'Error al cargar el detalle de los proveedores.';
  }
}

async function expandirTodas() {
  Object.keys(seccionesExpanded.value).forEach((key) => {
    seccionesExpanded.value[key] = true;
  });

  const ids = proveedores.value
    .filter((p) => !p._detalleCargado)
    .map((p) => String(p._id));

  if (!ids.length) return;

  const secciones = Object.keys(seccionesExpanded.value);
  try {
    await cargarDetalleProveedores(ids, secciones);
  } catch {
    error.value = 'Error al cargar el detalle de los proveedores.';
  }
}

const colapsarTodas = () => {
  Object.keys(seccionesExpanded.value).forEach((key) => {
    seccionesExpanded.value[key] = false;
  });
};

redirigirSiNoEsAdmin();

onMounted(() => {
  cargarProveedores();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <div class="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-800 mb-2">Panel de Administrador</h1>
        <p class="text-gray-600">Gestión y monitoreo de proveedores de salud</p>
      </div>
      <button
        type="button"
        class="self-start flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
        :disabled="isLoading || isRefreshing"
        @click="actualizarPanel"
      >
        <svg class="w-4 h-4" :class="{ 'animate-spin': isRefreshing }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {{ isRefreshing ? 'Actualizando…' : 'Actualizar' }}
      </button>
    </div>

    <Transition name="fade" mode="out-in">
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-16">
        <div class="relative">
          <div class="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div class="absolute top-2 left-2 w-12 h-12 border-4 border-transparent border-t-green-500 rounded-full animate-spin" style="animation-duration: 1.5s;"></div>
        </div>
        <p class="mt-4 text-lg text-gray-600 font-medium">Cargando proveedores...</p>
      </div>

      <div v-else-if="error" class="flex flex-col items-center justify-center py-16">
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <h3 class="text-lg font-semibold text-red-800 mb-2">Error al cargar datos</h3>
          <p class="text-red-600 mb-4">{{ error }}</p>
          <button
            @click="reintentarCarga"
            class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
          >
            Reintentar
          </button>
        </div>
      </div>

      <div v-else class="space-y-8">
        <div class="flex justify-end gap-2 mb-4">
          <button
            @click="expandirTodas"
            class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
          >
            Expandir Todo
          </button>
          <button
            @click="colapsarTodas"
            class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            Colapsar Todo
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div class="bg-white rounded-lg p-4 shadow-sm border">
            <p class="text-sm font-medium text-gray-600">Total</p>
            <p class="text-2xl font-bold text-gray-900">{{ estadisticas.total }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border">
            <p class="text-sm font-medium text-gray-600">Activos</p>
            <p class="text-2xl font-bold text-gray-900">{{ estadisticas.activos }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border">
            <p class="text-sm font-medium text-gray-600">Cancelados</p>
            <p class="text-2xl font-bold text-gray-900">{{ estadisticas.cancelados }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border">
            <p class="text-sm font-medium text-gray-600">Gratuito Activo</p>
            <p class="text-2xl font-bold text-gray-900">{{ estadisticas.periodoGratuitoActivo }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 shadow-sm border">
            <p class="text-sm font-medium text-gray-600">Gratuito Finalizado</p>
            <p class="text-2xl font-bold text-gray-900">{{ estadisticas.periodoGratuitoFinalizado }}</p>
          </div>
        </div>

        <div class="space-y-8">
          <div v-if="proveedoresAgrupados.activos.length > 0" class="space-y-4">
            <div class="flex items-center gap-3 cursor-pointer" @click="toggleSeccion('activos')">
              <div class="w-4 h-4 bg-green-500 rounded-full"></div>
              <h2 class="text-2xl font-bold text-gray-800">Proveedores Activos</h2>
              <span class="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                {{ proveedoresAgrupados.activos.length }}
              </span>
            </div>
            <div v-if="seccionesLoading.activos" class="text-sm text-gray-500 py-4 text-center">
              Cargando detalle de proveedores…
            </div>
            <Transition name="collapse" appear>
              <div v-if="seccionesExpanded.activos && !seccionesLoading.activos" class="grid grid-cols-1 gap-6">
                <ProveedorItem
                  v-for="proveedor in proveedoresAgrupados.activos"
                  :key="proveedor._id"
                  v-bind="proveedor"
                />
              </div>
            </Transition>
          </div>

          <div v-if="proveedoresAgrupados.cancelados.length > 0" class="space-y-4">
            <div class="flex items-center gap-3 cursor-pointer" @click="toggleSeccion('cancelados')">
              <div class="w-4 h-4 bg-red-500 rounded-full"></div>
              <h2 class="text-2xl font-bold text-gray-800">Proveedores Cancelados</h2>
              <span class="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full">
                {{ proveedoresAgrupados.cancelados.length }}
              </span>
            </div>
            <div v-if="seccionesLoading.cancelados" class="text-sm text-gray-500 py-4 text-center">
              Cargando detalle de proveedores…
            </div>
            <Transition name="collapse" appear>
              <div v-if="seccionesExpanded.cancelados && !seccionesLoading.cancelados" class="grid grid-cols-1 gap-6">
                <ProveedorItem
                  v-for="proveedor in proveedoresAgrupados.cancelados"
                  :key="proveedor._id"
                  v-bind="proveedor"
                />
              </div>
            </Transition>
          </div>

          <div
            v-if="proveedoresAgrupados.sinSuscripcion.periodoGratuitoActivo.length > 0 || proveedoresAgrupados.sinSuscripcion.periodoGratuitoFinalizado.length > 0"
            class="space-y-6"
          >
            <div class="flex items-center gap-3 cursor-pointer" @click="toggleSeccion('sinSuscripcion')">
              <div class="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <h2 class="text-2xl font-bold text-gray-800">Proveedores Sin Suscripción</h2>
              <span class="bg-yellow-100 text-yellow-800 text-sm font-medium px-3 py-1 rounded-full">
                {{ estadisticas.sinSuscripcion }}
              </span>
            </div>
            <div v-if="seccionesLoading.sinSuscripcion" class="text-sm text-gray-500 py-4 text-center ml-6">
              Cargando detalle de proveedores…
            </div>
            <Transition name="collapse" appear>
              <div v-if="seccionesExpanded.sinSuscripcion" class="space-y-6">
                <div v-if="proveedoresAgrupados.sinSuscripcion.periodoGratuitoActivo.length > 0" class="space-y-4 ml-6">
                  <div class="flex items-center gap-3 cursor-pointer" @click="toggleSeccion('periodoGratuitoActivo')">
                    <div class="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <h3 class="text-xl font-semibold text-gray-700">Periodo Gratuito Activo</h3>
                    <span class="bg-emerald-100 text-emerald-800 text-sm font-medium px-2 py-1 rounded-full">
                      {{ proveedoresAgrupados.sinSuscripcion.periodoGratuitoActivo.length }}
                    </span>
                  </div>
                  <div v-if="seccionesLoading.periodoGratuitoActivo" class="text-sm text-gray-500 py-2 text-center">
                    Cargando detalle…
                  </div>
                  <Transition name="collapse" appear>
                    <div v-if="seccionesExpanded.periodoGratuitoActivo && !seccionesLoading.periodoGratuitoActivo" class="grid grid-cols-1 gap-6">
                      <ProveedorItem
                        v-for="proveedor in proveedoresAgrupados.sinSuscripcion.periodoGratuitoActivo"
                        :key="proveedor._id"
                        v-bind="proveedor"
                      />
                    </div>
                  </Transition>
                </div>

                <div v-if="proveedoresAgrupados.sinSuscripcion.periodoGratuitoFinalizado.length > 0" class="space-y-4 ml-6">
                  <div class="flex items-center gap-3 cursor-pointer" @click="toggleSeccion('periodoGratuitoFinalizado')">
                    <div class="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <h3 class="text-xl font-semibold text-gray-700">Periodo Gratuito Finalizado</h3>
                    <span class="bg-gray-100 text-gray-800 text-sm font-medium px-2 py-1 rounded-full">
                      {{ proveedoresAgrupados.sinSuscripcion.periodoGratuitoFinalizado.length }}
                    </span>
                  </div>
                  <div v-if="seccionesLoading.periodoGratuitoFinalizado" class="text-sm text-gray-500 py-2 text-center">
                    Cargando detalle…
                  </div>
                  <Transition name="collapse" appear>
                    <div v-if="seccionesExpanded.periodoGratuitoFinalizado && !seccionesLoading.periodoGratuitoFinalizado" class="grid grid-cols-1 gap-6">
                      <ProveedorItem
                        v-for="proveedor in proveedoresAgrupados.sinSuscripcion.periodoGratuitoFinalizado"
                        :key="proveedor._id"
                        v-bind="proveedor"
                      />
                    </div>
                  </Transition>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div v-if="proveedores.length === 0 && !isLoading && !error" class="text-center py-16">
          <h3 class="text-lg font-semibold text-gray-800 mb-2">No hay proveedores registrados</h3>
          <p class="text-gray-600">Aún no se han registrado proveedores en el sistema.</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 1000px;
  transform: translateY(0);
}
</style>
