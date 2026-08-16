import { defineStore } from "pinia";
import { ref } from "vue";
import TrabajadoresAPI from "../api/TrabajadoresAPI";
import type { RiesgoTrabajo } from "@/interfaces/riesgo-trabajo.interface";
import EmpresasAPI from "@/api/EmpresasAPI";

interface Trabajador {
  _id: string;
  primerApellido?: string;
  segundoApellido?: string;
  nombre: string;
  fechaNacimiento: string;
  sexo: string;
  escolaridad: string;
  puesto: string;
  fechaIngreso: string;
  telefono: string;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
  estadoCivil: string;
  numeroEmpleado: string;
  nss: string;
  curp?: string;
  // NOM-024 Person Identification Fields
  entidadNacimiento?: string;
  paisNacimiento?: number | string;
  entidadResidencia?: string;
  municipioResidencia?: string;
  localidadResidencia?: string;
  agentesRiesgoActuales: string[];
  estadoLaboral: string;
  idCentroTrabajo: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  fechaTransferencia?: string;
  historiaClinicaResumen?: {
    diabeticosPP?: string | null;
    hipertensivosPP?: string | null;
    cardiopaticosPP?: string | null;
    epilepticosPP?: string | null;
    alergicos?: string | null;
    lumbalgias?: string | null;
    accidentes?: string | null;
    quirurgicos?: string | null;
    otros?: string | null;
  };  
  aptitudResumen?: {
    aptitudPuesto?: string | null;
  };  
  exploracionFisicaResumen?: {
    categoriaIMC?: string | null;
    categoriaCircunferenciaCintura?: string | null;
    categoriaTensionArterial?: string | null;
    resumenExploracionFisica?: string | null;
  };
  examenVistaResumen?: {
    sinCorreccionLejanaInterpretacion?: string | null;
    requiereLentesUsoGeneral?: string | null;
    ojoIzquierdoLejanaConCorreccion?: string | null;
    ojoDerechoLejanaConCorreccion?: string | null;
    interpretacionIshihara?: string | null;
  };
  consultaResumen?: {
    fechaNotaMedica?: string | null;
  };
  riesgosTrabajo?: RiesgoTrabajo[];
}

export const useTrabajadoresStore = defineStore("trabajadores", () => {
  const loading = ref(true);
  const loadingOnSidebar = ref(false);
  const loadingModal = ref(false);
  const trabajadores = ref<Trabajador[]>([]);
  const currentTrabajadorId = ref<string>();
  const currentTrabajador = ref<Trabajador>();

  // Secuencias para descartar respuestas obsoletas (anti-race al navegar entre centros).
  let listadoSeq = 0;
  let detailSeq = 0;

  const LISTADO_HISTORIA_TTL_MS = 3 * 60 * 1000;
  const listadoHistoriaCache = new Map<
    string,
    { data: Trabajador[]; fetchedAt: number }
  >();

  function listadoHistoriaCacheKey(empresaId: string, centroTrabajoId: string) {
    return `${empresaId}:${centroTrabajoId}`;
  }

  function invalidateListadoHistoriaCache(
    empresaId?: string,
    centroTrabajoId?: string,
  ) {
    if (empresaId && centroTrabajoId) {
      listadoHistoriaCache.delete(
        listadoHistoriaCacheKey(empresaId, centroTrabajoId),
      );
      return;
    }
    listadoHistoriaCache.clear();
  }

  function resetTrabajadores() {
    trabajadores.value = [];
  }

  function resetCurrentTrabajador() {
    currentTrabajador.value = {
      _id: "",
      primerApellido: "",
      segundoApellido: "",
      nombre: "",
      fechaNacimiento: "",
      sexo: "",
      escolaridad: "",
      puesto: "",
      fechaIngreso: "",
      telefono: "",
      estadoCivil: "",
      numeroEmpleado: "",
      nss: "",
      curp: "",
      // NOM-024 Fields
      entidadNacimiento: "",
      paisNacimiento: "",
      entidadResidencia: "",
      municipioResidencia: "",
      localidadResidencia: "",
      agentesRiesgoActuales: [],
      estadoLaboral: "",
      idCentroTrabajo: "",
      createdBy: "",
      updatedBy: "",
      createdAt: "",
      updatedAt: "",
      fechaTransferencia: "",
    };
    currentTrabajadorId.value = "";
  }

  function hydrateCurrentTrabajadorFromListado(trabajador: Partial<Trabajador> & { _id: string }) {
    currentTrabajador.value = { ...trabajador } as Trabajador;
    currentTrabajadorId.value = trabajador._id?.toString() ?? "";
  }

  async function fetchTrabajadores(empresaId: string, centroTrabajoId: string) {
    const seq = ++listadoSeq;
    try {
      loading.value = true;
      const { data } = await TrabajadoresAPI.getTrabajadores(
        empresaId,
        centroTrabajoId
      );
      // Descartar si una petición más reciente ya tomó el control.
      if (seq !== listadoSeq) return data;
      trabajadores.value = Array.isArray(data) ? data : [];
      return data;
    } catch (error) {
      // console.log(error);
      throw error;
    } finally {
      if (seq === listadoSeq) loading.value = false;
    }
  }

  /** Cuenta trabajadores de un centro sin mutar el listado del store. */
  async function countTrabajadoresPorCentro(empresaId: string, centroTrabajoId: string): Promise<number> {
    try {
      const { data } = await TrabajadoresAPI.getTrabajadoresCount(empresaId, centroTrabajoId);
      return data?.count ?? 0;
    } catch {
      return 0;
    }
  }

  async function fetchTrabajadoresConHistoria(
    empresaId: string,
    centroTrabajoId: string,
    options?: { skipCache?: boolean },
  ) {
    const seq = ++listadoSeq;
    const cacheKey = listadoHistoriaCacheKey(empresaId, centroTrabajoId);
    const cached = listadoHistoriaCache.get(cacheKey);
    const isFresh =
      cached != null &&
      Date.now() - cached.fetchedAt < LISTADO_HISTORIA_TTL_MS;

    if (cached && !options?.skipCache) {
      trabajadores.value = cached.data;
      if (isFresh) {
        loading.value = false;
        return cached.data;
      }
    } else if (!cached) {
      trabajadores.value = [];
    }

    try {
      loading.value = !cached;
      const { data } = await TrabajadoresAPI.getTrabajadoresConHistoria(
        empresaId,
        centroTrabajoId,
      );
      if (seq !== listadoSeq) return data;
      const list = Array.isArray(data) ? data : [];
      trabajadores.value = list;
      listadoHistoriaCache.set(cacheKey, {
        data: list,
        fetchedAt: Date.now(),
      });
      return data;
    } catch (error) {
      console.error('Error al obtener trabajadores con historia clínica', error);
      throw error;
    } finally {
      if (seq === listadoSeq) loading.value = false;
    }
  }

  async function fetchRiesgosTrabajoPorEmpresa(empresaId: string) {
    try {
      loading.value = true;
      const { data } = await EmpresasAPI.getRiesgosTrabajoPorEmpresa(empresaId);
      return data;
    } catch (error) {
      console.error('Error al obtener riesgos por empresa', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function fetchSexosYFechasNacimientoActivos(empresaId: string, centroTrabajoId: string) {
    try {
      loading.value = true;
      const { data } = await TrabajadoresAPI.getSexosYFechasNacimientoActivos(empresaId, centroTrabajoId);
      trabajadores.value = data;
      return data;
    } catch (error) {
      console.error('Error al obtener trabajadores con historia clínica', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }  

  async function fetchDashboardData(empresaId: string, centroTrabajoId: string, inicio?: string, fin?: string) {
    try {
      loading.value = true;
      const { data } = await TrabajadoresAPI.getDashboardData(
        empresaId,
        centroTrabajoId,
        inicio,
        fin
      );
      return data;
    }
    catch (error) {
      console.error('Error al obtener datos del dashboard', error);
      throw error;
    }
    finally {
      loading.value = false;
    }
  }

  async function fetchTrabajadorByIdInternal(
    empresaId: string,
    centroTrabajoId: string,
    trabajadorId: string,
    seq: number,
    redirectedFrom?: string,
  ): Promise<{ data: Trabajador; redirectedFrom?: string }> {
    try {
      const { data } = await TrabajadoresAPI.getTrabajadorById(
        empresaId,
        centroTrabajoId,
        trabajadorId,
      );
      if (seq === detailSeq) {
        currentTrabajador.value = data;
        currentTrabajadorId.value = data?._id?.toString() ?? trabajadorId;
      }
      return { data, redirectedFrom };
    } catch (error: any) {
      const redirectTo = error?.response?.data?.redirectTo;
      if (error?.response?.status === 410 && redirectTo) {
        return fetchTrabajadorByIdInternal(
          empresaId,
          centroTrabajoId,
          redirectTo,
          seq,
          trabajadorId,
        );
      }
      throw error;
    }
  }

  async function fetchTrabajadorById(
    empresaId: string,
    centroTrabajoId: string,
    trabajadorId: string
  ): Promise<{ data: Trabajador; redirectedFrom?: string }> {
    const seq = ++detailSeq;
    try {
      loadingOnSidebar.value = true;
      loadingModal.value = true;
      return await fetchTrabajadorByIdInternal(
        empresaId,
        centroTrabajoId,
        trabajadorId,
        seq,
      );
    } catch (error) {
      console.log(error);
      throw error;
    } finally {
      if (seq === detailSeq) {
        loadingOnSidebar.value = false;
        loadingModal.value = false;
      }
    }
  }

  async function createTrabajador(
    empresaId: string,
    centroTrabajoId: string,
    trabajadorData: Trabajador
  ) {
    try {
      loading.value = true;
      const { data } = await TrabajadoresAPI.createTrabajador(
        empresaId,
        centroTrabajoId,
        trabajadorData
      );
      invalidateListadoHistoriaCache(empresaId, centroTrabajoId);
      return data;
    } catch (error) {
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function updateTrabajador(
    empresaId: string,
    centroTrabajoId: string,
    trabajadorId: string,
    trabajadorData: Partial<Trabajador>
  ) {
    try {
      loading.value = true;
      await TrabajadoresAPI.updateTrabajador(
        empresaId,
        centroTrabajoId,
        trabajadorId,
        trabajadorData
      );
      invalidateListadoHistoriaCache(empresaId, centroTrabajoId);
    } catch (error) {
      // console.log(error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function importTrabajadores(
      empresaId: string,
      centroTrabajoId: string,
      formData: FormData
  ) {
      try {
          loading.value = true;
          const response = await TrabajadoresAPI.importTrabajadores(
              empresaId,
              centroTrabajoId,
              formData
          );
          invalidateListadoHistoriaCache(empresaId, centroTrabajoId);
          return response;
        } catch (error: unknown) {
          if (error instanceof Error) {
              console.error('Error en importTrabajadores:', error.message);
          } else if (typeof error === 'object' && error !== null && 'response' in error) {
              const axiosError = error as { response?: { data?: any } };
              console.error('Error en importTrabajadores:', axiosError.response?.data || 'Error desconocido');
          } else {
              console.error('Error inesperado:', error);
          }
          throw error;
      } finally {
          loading.value = false;
      }
  }


  async function deleteTrabajadorById(
    empresaId: string,
    centroTrabajoId: string,
    trabajadorId: string,
    deletionPassword?: string,
  ) {
    try {
      loading.value = true;
      await TrabajadoresAPI.deleteTrabajadorById(
        empresaId,
        centroTrabajoId,
        trabajadorId,
        deletionPassword,
      );
      invalidateListadoHistoriaCache(empresaId, centroTrabajoId);
    } catch (error) {
      // console.log(error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function exportTrabajadores(
    empresaId: string,
    centroTrabajoId: string
  ) {
    try {
      const response = await TrabajadoresAPI.exportTrabajadores(
        empresaId,
        centroTrabajoId
      );

      // Crear una URL para el archivo Blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "trabajadores.xlsx"); // nombre del archivo
      document.body.appendChild(link);
      link.click();

      // Limpiar el objeto URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al exportar los trabajadores", error);
      throw error;
    }
  }

  async function transferirTrabajador(
    empresaId: string,
    centroTrabajoId: string,
    trabajadorId: string,
    nuevoCentroId: string,
    empresaDestinoId?: string,
  ) {
    try {
      loading.value = true;
      const { data } = await TrabajadoresAPI.transferirTrabajador(
        empresaId,
        centroTrabajoId,
        trabajadorId,
        nuevoCentroId
      );
      const destEmpresaId = empresaDestinoId ?? empresaId;
      invalidateListadoHistoriaCache(empresaId, centroTrabajoId);
      invalidateListadoHistoriaCache(destEmpresaId, nuevoCentroId);
      return data;
    } catch (error) {
      console.error("Error al transferir el trabajador", error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    loadingOnSidebar,
    loadingModal,
    trabajadores,
    currentTrabajadorId,
    currentTrabajador,
    resetCurrentTrabajador,
    hydrateCurrentTrabajadorFromListado,
    resetTrabajadores,
    invalidateListadoHistoriaCache,
    fetchTrabajadores,
    countTrabajadoresPorCentro,
    fetchTrabajadoresConHistoria,
    fetchRiesgosTrabajoPorEmpresa,
    fetchSexosYFechasNacimientoActivos,
    fetchDashboardData,
    fetchTrabajadorById,
    createTrabajador,
    updateTrabajador,
    importTrabajadores,
    deleteTrabajadorById,
    exportTrabajadores,
    transferirTrabajador,
  };
});
