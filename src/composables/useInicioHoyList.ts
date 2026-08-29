import { computed, ref } from 'vue';
import InicioAPI from '@/api/InicioAPI';
import { useUserStore } from '@/stores/user';
import type {
  InicioHoyCentroItem,
  InicioHoyDocumentoItem,
  InicioHoyListResponse,
  InicioHoyTrabajadorItem,
} from '@/interfaces/inicio-resumen.interface';
import {
  buildInicioHoyListCacheKey,
  inicioResumenState,
  readInicioHoyListCache,
  writeInicioHoyListCache,
} from '@/composables/inicioResumenCache';

export const INICIO_HOY_PAGE_SIZE = 15;

export type InicioHoyRecurso = 'trabajadores' | 'documentos' | 'centros';

export function useInicioHoyList() {
  const userStore = useUserStore();
  const loading = ref(false);
  const error = ref<string | null>(null);
  const recurso = ref<InicioHoyRecurso | null>(null);
  const trabajadores = ref<InicioHoyTrabajadorItem[]>([]);
  const documentos = ref<InicioHoyDocumentoItem[]>([]);
  const centros = ref<InicioHoyCentroItem[]>([]);
  const total = ref(0);
  const truncated = ref(false);
  const page = ref(1);

  const pageCount = computed(() =>
    Math.max(1, Math.ceil(shownCount() / INICIO_HOY_PAGE_SIZE) || 1),
  );

  const pageTrabajadores = computed(() =>
    slicePage(trabajadores.value, page.value),
  );
  const pageDocumentos = computed(() => slicePage(documentos.value, page.value));
  const pageCentros = computed(() => slicePage(centros.value, page.value));

  const rangeLabel = computed(() => {
    const shown = shownCount();
    if (shown === 0) return 'Sin registros';
    const start = (page.value - 1) * INICIO_HOY_PAGE_SIZE + 1;
    const end = Math.min(page.value * INICIO_HOY_PAGE_SIZE, shown);
    return `Mostrando ${start}–${end} de ${total.value}`;
  });

  function shownCount() {
    if (recurso.value === 'trabajadores') return trabajadores.value.length;
    if (recurso.value === 'documentos') return documentos.value.length;
    return centros.value.length;
  }

  function cacheKey(kind: InicioHoyRecurso): string | null {
    const resumen = inicioResumenState.resumen.value;
    const userId = userStore.user?._id;
    const providerId = String(userStore.user?.idProveedorSalud ?? '');
    if (!resumen?.dateKey || !userId) return null;
    return buildInicioHoyListCacheKey({
      userId,
      providerId,
      regimen: resumen.regimen,
      activityScope: resumen.activityScope,
      dateKey: resumen.dateKey,
      recurso: kind,
    });
  }

  async function open(kind: InicioHoyRecurso) {
    recurso.value = kind;
    page.value = 1;
    error.value = null;
    const key = cacheKey(kind);
    if (key) {
      const cached = readInicioHoyListCache<InicioHoyListResponse<unknown>>(key);
      if (cached) {
        applyPayload(kind, cached);
        loading.value = false;
        return;
      }
    }

    loading.value = true;
    trabajadores.value = [];
    documentos.value = [];
    centros.value = [];
    total.value = 0;
    truncated.value = false;
    try {
      const fetcher =
        kind === 'trabajadores'
          ? InicioAPI.getHoyTrabajadores
          : kind === 'documentos'
            ? InicioAPI.getHoyDocumentos
            : InicioAPI.getHoyCentros;
      const { data } = await fetcher();
      applyPayload(kind, data);
      if (key) writeInicioHoyListCache(key, data);
    } catch (err: any) {
      error.value =
        err?.response?.data?.message ??
        err?.message ??
        'No se pudo cargar el listado';
    } finally {
      loading.value = false;
    }
  }

  function applyPayload(kind: InicioHoyRecurso, data: InicioHoyListResponse<unknown>) {
    total.value = data.total;
    truncated.value = data.truncated;
    if (kind === 'trabajadores') {
      trabajadores.value = data.items as InicioHoyTrabajadorItem[];
    } else if (kind === 'documentos') {
      documentos.value = data.items as InicioHoyDocumentoItem[];
    } else {
      centros.value = data.items as InicioHoyCentroItem[];
    }
  }

  function nextPage() {
    if (page.value < pageCount.value) page.value += 1;
  }

  function prevPage() {
    if (page.value > 1) page.value -= 1;
  }

  function reset() {
    recurso.value = null;
    error.value = null;
    loading.value = false;
    page.value = 1;
  }

  return {
    loading,
    error,
    recurso,
    total,
    truncated,
    page,
    pageCount,
    pageTrabajadores,
    pageDocumentos,
    pageCentros,
    rangeLabel,
    open,
    nextPage,
    prevPage,
    reset,
  };
}

function slicePage<T>(items: T[], page: number): T[] {
  const start = (page - 1) * INICIO_HOY_PAGE_SIZE;
  return items.slice(start, start + INICIO_HOY_PAGE_SIZE);
}
