import { defineStore } from "pinia";
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useEmpresasStore } from "./empresas";
import { useCentrosTrabajoStore } from "./centrosTrabajo";
import { useTrabajadoresStore } from "./trabajadores";
import { useDocumentosStore } from "./documentos";

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

  const collapsed = ref(
    localStorage.getItem("sidebarCollapsed") === "true" || !localStorage.getItem("sidebarCollapsed")
  );

  const isSmallScreen = ref(window.innerWidth < 640);

  function handleResize() {
    isSmallScreen.value = window.innerWidth < 640;
  }

  // Función para actualizar las variables CSS del sidebar
  function updateCSSVariables() {
    const root = document.documentElement;
    const sidebarWidth = collapsed.value ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;
    const sidebarDifference = collapsed.value ? 0 : SIDEBAR_WIDTH - SIDEBAR_WIDTH_COLLAPSED; // 175px cuando expandido

    root.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
    root.style.setProperty('--content-margin', `${sidebarWidth}px`);
    root.style.setProperty('--sidebar-difference', `${sidebarDifference}px`);
  }

  function toggleSidebar() {
    collapsed.value = !collapsed.value;
    localStorage.setItem("sidebarCollapsed", collapsed.value.toString());
    updateCSSVariables(); // Actualizar variables CSS cuando cambie el estado
  }

  const SIDEBAR_WIDTH = 230;
  const SIDEBAR_WIDTH_COLLAPSED = 80;
  const sidebarWidth = computed(
    () => `${collapsed.value ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH}px`
  );
  const sidebarWidthCollapsed = computed(() => `${SIDEBAR_WIDTH_COLLAPSED}px`);

  watch(collapsed, (newValue) => {
    localStorage.setItem("sidebarCollapsed", newValue.toString());
    updateCSSVariables(); // Actualizar variables CSS cuando cambie el estado
  });

  onMounted(() => {
    window.addEventListener("resize", handleResize); // Escucha cambios en el tamaño de la pantalla
    updateCSSVariables(); // Inicializar variables CSS al montar
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", handleResize); // Limpieza al desmontar
  });

  return {
    isSmallScreen,
    collapsed,
    initializeState,
    toggleSidebar,
    sidebarWidth,
    sidebarWidthCollapsed,
    updateCSSVariables,
  };
});
