import { computed, ref } from 'vue';
import type { Router } from 'vue-router';
import NotasMedicasAPI from '@/api/NotasMedicasAPI';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';

export type BorradorPendienteNivelUrgencia = 'info' | 'warning' | 'critical';

export interface BorradorPendienteItem {
  id: string;
  idTrabajador: string;
  idCentroTrabajo: string;
  idEmpresa: string;
  trabajadorNombre: string;
  fechaNotaMedica: string;
  createdAt: string;
  updatedAt: string;
  diasEnBorrador: number;
  diasSinEdicion: number;
  nivelUrgencia: BorradorPendienteNivelUrgencia;
  mensajeContextual: string;
  elaborador?: {
    id: string;
    username: string;
  };
}

export interface BorradoresPendientesResponse {
  propios: BorradorPendienteItem[];
  equipo: BorradorPendienteItem[];
  resumen: {
    totalPropios: number;
    totalEquipo: number;
    nivelMaximo: BorradorPendienteNivelUrgencia;
  };
}

const CACHE_TTL_MS = 5 * 60 * 1000;

const propios = ref<BorradorPendienteItem[]>([]);
const equipo = ref<BorradorPendienteItem[]>([]);
const resumen = ref<BorradoresPendientesResponse['resumen']>({
  totalPropios: 0,
  totalEquipo: 0,
  nivelMaximo: 'info',
});
const loading = ref(false);
const error = ref<string | null>(null);
const lastFetchedAt = ref<number | null>(null);
const lastUserId = ref<string | null>(null);
let fetchPromise: Promise<void> | null = null;

function getDismissKey(userId: string) {
  return `borradoresNM_dismissUntil_${userId}`;
}

function getNextMidnightIso(): string {
  const next = new Date();
  next.setHours(24, 0, 0, 0);
  return next.toISOString();
}

function isDismissed(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const raw = localStorage.getItem(getDismissKey(userId));
  if (!raw) return false;
  const dismissUntil = Date.parse(raw);
  return Number.isFinite(dismissUntil) && Date.now() < dismissUntil;
}

function dismissUntilTomorrow(userId: string) {
  localStorage.setItem(getDismissKey(userId), getNextMidnightIso());
}

function resetState() {
  propios.value = [];
  equipo.value = [];
  resumen.value = {
    totalPropios: 0,
    totalEquipo: 0,
    nivelMaximo: 'info',
  };
  error.value = null;
  lastFetchedAt.value = null;
  fetchPromise = null;
}

function invalidateBorradoresNotaMedicaCache() {
  lastFetchedAt.value = null;
  fetchPromise = null;
}

async function fetchBorradoresPendientes(options?: {
  userId?: string | null;
  force?: boolean;
}) {
  const proveedorSaludStore = useProveedorSaludStore();
  if (!proveedorSaludStore.isSIRES) {
    resetState();
    return;
  }

  const userId = options?.userId ?? lastUserId.value;
  if (!userId) {
    resetState();
    return;
  }

  if (userId !== lastUserId.value) {
    resetState();
    lastUserId.value = userId;
  }

  const isFresh =
    !options?.force &&
    lastFetchedAt.value !== null &&
    Date.now() - lastFetchedAt.value < CACHE_TTL_MS;

  if (isFresh) {
    return;
  }

  if (fetchPromise) {
    await fetchPromise;
    return;
  }

  loading.value = true;
  error.value = null;

  fetchPromise = (async () => {
    try {
      const { data } = await NotasMedicasAPI.getBorradoresPendientes();
      propios.value = Array.isArray(data?.propios) ? data.propios : [];
      equipo.value = Array.isArray(data?.equipo) ? data.equipo : [];
      resumen.value = data?.resumen ?? {
        totalPropios: propios.value.length,
        totalEquipo: equipo.value.length,
        nivelMaximo: 'info',
      };
      lastFetchedAt.value = Date.now();
    } catch (err: any) {
      error.value =
        err?.response?.data?.message ??
        err?.message ??
        'No se pudieron cargar los borradores pendientes';
      resetState();
    } finally {
      loading.value = false;
      fetchPromise = null;
    }
  })();

  await fetchPromise;
}

function buildBorradoresMap() {
  const map = new Map<string, BorradorPendienteItem>();
  for (const item of [...propios.value, ...equipo.value]) {
    map.set(item.id, item);
  }
  return map;
}

export function useBorradoresNotaMedica() {
  const proveedorSaludStore = useProveedorSaludStore();
  const borradoresHabilitados = computed(() => proveedorSaludStore.isSIRES);

  const borradoresMap = computed(() => buildBorradoresMap());
  const totalPendientes = computed(
    () => resumen.value.totalPropios + resumen.value.totalEquipo,
  );
  const hasPendientes = computed(() => totalPendientes.value > 0);
  const nivelMaximo = computed(() => resumen.value.nivelMaximo);

  function mostrarBanner(userId: string | null | undefined) {
    if (!borradoresHabilitados.value || !userId || !hasPendientes.value) {
      return false;
    }
    return !isDismissed(userId);
  }

  function mensajeBanner(isPrincipal: boolean) {
    const propiosCount = resumen.value.totalPropios;
    const equipoCount = resumen.value.totalEquipo;

    if (propiosCount > 0 && equipoCount > 0) {
      return `Tienes ${propiosCount} nota(s) médica(s) en borrador sin finalizar desde hace más de 72 horas. Además, hay ${equipoCount} borrador(es) del equipo con más de 7 días.`;
    }
    if (propiosCount > 0) {
      return `Tienes ${propiosCount} nota(s) médica(s) en borrador sin finalizar desde hace más de 72 horas.`;
    }
    if (equipoCount > 0 && isPrincipal) {
      return `Hay ${equipoCount} nota(s) médica(s) en borrador de más de 7 días elaboradas por otros usuarios.`;
    }
    return '';
  }

  function getBannerBorderClass(nivel: BorradorPendienteNivelUrgencia) {
    switch (nivel) {
      case 'critical':
        return 'border-red-500';
      case 'warning':
        return 'border-yellow-500';
      default:
        return 'border-blue-500';
    }
  }

  function getBannerIconClass(nivel: BorradorPendienteNivelUrgencia) {
    switch (nivel) {
      case 'critical':
        return 'fa-solid fa-exclamation-triangle text-red-500';
      case 'warning':
        return 'fa-solid fa-exclamation-circle text-yellow-500';
      default:
        return 'fa-regular fa-clock text-blue-500';
    }
  }

  function getBadgeLabel(nivel: BorradorPendienteNivelUrgencia) {
    switch (nivel) {
      case 'critical':
        return 'Atención requerida';
      case 'warning':
        return 'Borrador antiguo';
      default:
        return 'Borrador pendiente';
    }
  }

  function getBadgeClass(nivel: BorradorPendienteNivelUrgencia) {
    switch (nivel) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  }

  function navigateToExpediente(router: Router, item: BorradorPendienteItem) {
    return router.push({
      name: 'expediente-medico',
      params: {
        idEmpresa: item.idEmpresa,
        idCentroTrabajo: item.idCentroTrabajo,
        idTrabajador: item.idTrabajador,
      },
    });
  }

  function dismissBanner(userId: string) {
    dismissUntilTomorrow(userId);
  }

  function getBorradorPendiente(documentId: string | undefined | null) {
    if (!documentId) return null;
    return borradoresMap.value.get(String(documentId)) ?? null;
  }

  return {
    propios,
    equipo,
    resumen,
    loading,
    error,
    borradoresHabilitados,
    borradoresMap,
    totalPendientes,
    hasPendientes,
    nivelMaximo,
    fetchBorradoresPendientes,
    invalidateBorradoresNotaMedicaCache,
    mostrarBanner,
    mensajeBanner,
    getBannerBorderClass,
    getBannerIconClass,
    getBadgeLabel,
    getBadgeClass,
    navigateToExpediente,
    dismissBanner,
    getBorradorPendiente,
  };
}

export { invalidateBorradoresNotaMedicaCache };
