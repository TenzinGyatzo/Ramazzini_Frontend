import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useEmpresasStore } from "./empresas";
import { useCentrosTrabajoStore } from "./centrosTrabajo";
import { useTrabajadoresStore } from "./trabajadores";
import { useDocumentosStore } from "./documentos";

export const SMALL_SCREEN_BREAKPOINT = 768;
const SIDEBAR_WIDTH = 230;
const SIDEBAR_WIDTH_COLLAPSED = 80;
const SIDEBAR_WIDTH_MOBILE = 220;
const SIDEBAR_WIDTH_COLLAPSED_MOBILE = 56;

function readViewportWidth(): number {
  return typeof window !== "undefined" ? window.innerWidth : 1024;
}

function readIsSmallScreen(width = readViewportWidth()): boolean {
  return width < SMALL_SCREEN_BREAKPOINT;
}

function readDesktopCollapsedPreference(): boolean {
  try {
    const stored = localStorage.getItem("sidebarCollapsed");
    return stored === "true" || !stored;
  } catch {
    return true;
  }
}

function persistDesktopCollapsed(value: boolean) {
  try {
    localStorage.setItem("sidebarCollapsed", value.toString());
  } catch {
    // ignore
  }
}

export type InitializeStateResult = {
  redirectedTrabajadorId?: string;
};

function normId(value?: string | string[] | null): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw == null || raw === "") return "";
  return String(raw);
}

function entityRouteId(entity: { _id?: unknown } | null | undefined): string {
  const id = entity?._id;
  if (id == null || id === "") return "";
  return String(id);
}

function isEntityLoaded(
  routeId: string,
  storeId: string | null | undefined,
  entity: { _id?: unknown } | null | undefined,
): boolean {
  if (!routeId) return false;
  return normId(storeId) === routeId && entityRouteId(entity) === routeId;
}

export const useSidebarStore = defineStore("sidebar", () => {
  const empresas = useEmpresasStore();
  const centrosTrabajo = useCentrosTrabajoStore();
  const trabajadores = useTrabajadoresStore();
  const documentos = useDocumentosStore();

  let initSeq = 0;

  async function initializeState(params: {
    idEmpresa?: string | string[];
    idCentroTrabajo?: string | string[];
    idTrabajador?: string | string[];
    tipoDocumento?: string | string[];
  }): Promise<InitializeStateResult> {
    const seq = ++initSeq;

    const idEmpresa = normId(params.idEmpresa);
    const idCentroTrabajo = normId(params.idCentroTrabajo);
    const idTrabajador = normId(params.idTrabajador);
    const tipoDocumento = Array.isArray(params.tipoDocumento)
      ? params.tipoDocumento[0]
      : params.tipoDocumento;

    if (idEmpresa) {
      const prevEmpresaId = normId(empresas.currentEmpresaId);
      if (prevEmpresaId && prevEmpresaId !== idEmpresa) {
        centrosTrabajo.resetCurrentCentroTrabajo();
        trabajadores.resetCurrentTrabajador();
        documentos.resetCurrentTypeOfDocument();
      }

      if (
        !isEntityLoaded(idEmpresa, empresas.currentEmpresaId, empresas.currentEmpresa)
      ) {
        if (seq !== initSeq) return {};
        await empresas.fetchEmpresaById(idEmpresa);
      } else {
        empresas.currentEmpresaId = idEmpresa;
      }
    }

    if (seq !== initSeq) return {};

    if (idCentroTrabajo && idEmpresa) {
      const prevCentroId = normId(centrosTrabajo.currentCentroTrabajoId);
      if (prevCentroId && prevCentroId !== idCentroTrabajo) {
        trabajadores.resetCurrentTrabajador();
        documentos.resetCurrentTypeOfDocument();
      }

      if (
        !isEntityLoaded(
          idCentroTrabajo,
          centrosTrabajo.currentCentroTrabajoId,
          centrosTrabajo.currentCentroTrabajo,
        )
      ) {
        if (seq !== initSeq) return {};
        await centrosTrabajo.fetchCentroTrabajoById(idEmpresa, idCentroTrabajo);
      } else {
        centrosTrabajo.currentCentroTrabajoId = idCentroTrabajo;
      }
    }

    if (seq !== initSeq) return {};

    if (idTrabajador && idEmpresa && idCentroTrabajo) {
      const prevTrabajadorId = normId(trabajadores.currentTrabajadorId);
      if (prevTrabajadorId && prevTrabajadorId !== idTrabajador) {
        documentos.resetCurrentTypeOfDocument();
      }

      if (
        !isEntityLoaded(
          idTrabajador,
          trabajadores.currentTrabajadorId,
          trabajadores.currentTrabajador,
        )
      ) {
        if (seq !== initSeq) return {};
        const result = await trabajadores.fetchTrabajadorById(
          idEmpresa,
          idCentroTrabajo,
          idTrabajador,
        );
        if (result.redirectedFrom) {
          return {
            redirectedTrabajadorId:
              result.data?._id?.toString() ?? normId(result.data?._id as string),
          };
        }
      } else {
        trabajadores.currentTrabajadorId = idTrabajador;
      }
    }

    if (seq !== initSeq) return {};

    if (tipoDocumento) {
      await documentos.setCurrentTypeOfDocument(tipoDocumento);
    }

    return {};
  }

  const viewportWidth = ref(readViewportWidth());
  const isSmallScreen = ref(readIsSmallScreen(viewportWidth.value));
  const collapsed = ref(
    isSmallScreen.value ? true : readDesktopCollapsedPreference(),
  );

  function collapsedWidthPx(): number {
    return isSmallScreen.value
      ? SIDEBAR_WIDTH_COLLAPSED_MOBILE
      : SIDEBAR_WIDTH_COLLAPSED;
  }

  function expandedWidthPx(): number {
    if (isSmallScreen.value) {
      return Math.min(
        SIDEBAR_WIDTH_MOBILE,
        Math.round(viewportWidth.value * 0.72),
      );
    }
    return SIDEBAR_WIDTH;
  }

  function visualWidthPx(): number {
    return collapsed.value ? collapsedWidthPx() : expandedWidthPx();
  }

  function updateCSSVariables() {
    if (typeof document === "undefined") return;

    const visualWidth = visualWidthPx();
    const contentMargin = isSmallScreen.value
      ? collapsedWidthPx()
      : visualWidth;
    const sidebarDifference =
      isSmallScreen.value || collapsed.value
        ? 0
        : SIDEBAR_WIDTH - SIDEBAR_WIDTH_COLLAPSED;

    const root = document.documentElement;
    root.style.setProperty("--sidebar-width", `${visualWidth}px`);
    root.style.setProperty("--content-margin", `${contentMargin}px`);
    root.style.setProperty("--sidebar-difference", `${sidebarDifference}px`);
  }

  function applySmallScreenState(nextSmall: boolean) {
    const wasSmall = isSmallScreen.value;
    isSmallScreen.value = nextSmall;

    if (nextSmall && !wasSmall) {
      collapsed.value = true;
    } else if (!nextSmall && wasSmall) {
      collapsed.value = readDesktopCollapsedPreference();
    }
  }

  function handleResize() {
    viewportWidth.value = readViewportWidth();
    applySmallScreenState(readIsSmallScreen(viewportWidth.value));
    updateCSSVariables();
  }

  function toggleSidebar() {
    collapsed.value = !collapsed.value;
  }

  function collapseSidebar() {
    if (!collapsed.value) {
      collapsed.value = true;
    }
  }

  const sidebarWidth = computed(() => `${visualWidthPx()}px`);
  const sidebarWidthCollapsed = computed(() => `${collapsedWidthPx()}px`);
  const isMobileOverlayOpen = computed(
    () => isSmallScreen.value && !collapsed.value,
  );

  watch(collapsed, (newValue) => {
    if (!isSmallScreen.value) {
      persistDesktopCollapsed(newValue);
    }
    updateCSSVariables();
  });

  if (typeof window !== "undefined") {
    window.addEventListener("resize", handleResize);
    updateCSSVariables();
  }

  function invalidatePendingInitialization() {
    initSeq += 1;
  }

  return {
    isSmallScreen,
    isMobileOverlayOpen,
    collapsed,
    initializeState,
    invalidatePendingInitialization,
    toggleSidebar,
    collapseSidebar,
    sidebarWidth,
    sidebarWidthCollapsed,
    updateCSSVariables,
  };
});
