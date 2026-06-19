import { defineStore } from "pinia";
import { ref } from "vue";
import CentrosTrabajoAPI from "../api/CentrosTrabajoAPI";
import AssignmentsAPI from "../api/AssignmentsAPI";
import { useUserStore } from "./user";

interface CentroTrabajo {
  _id: string;
  nombreCentro: string;
  direccionCentro: string;
  codigoPostal: string;
  estado: string;
  municipio: string;
  idEmpresa: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export const useCentrosTrabajoStore = defineStore("centros-trabajo", () => {
  const centrosTrabajo = ref<CentroTrabajo[]>([]);
  const loading = ref(true);
  const loadingModal = ref(false);
  const currentCentroTrabajoId = ref<string>();
  const currentCentroTrabajo = ref<CentroTrabajo>();

  // Secuencia para descartar respuestas obsoletas al navegar entre empresas.
  let listadoSeq = 0;

  function resetCentrosTrabajo() {
    centrosTrabajo.value = [];
  }

  function resetCurrentCentroTrabajo() {
    currentCentroTrabajo.value = {
      _id: "",
      nombreCentro: "",
      direccionCentro: "",
      codigoPostal: "",
      estado: "",
      municipio: "",
      idEmpresa: "",
      createdBy: "",
      updatedBy: "",
      createdAt: "",
      updatedAt: "",
    };
    currentCentroTrabajoId.value = "";
  }

  async function fetchCentrosTrabajo(empresaId: string) {
    const seq = ++listadoSeq;
    const aplicar = (valor: CentroTrabajo[]) => {
      // Solo aplicar si esta sigue siendo la petición más reciente.
      if (seq === listadoSeq) centrosTrabajo.value = valor;
    };
    try {
      loading.value = true;
      const userStore = useUserStore();
      
      // Si el usuario es Principal o tiene acceso completo, cargar todos los centros
      if (userStore.isPrincipal() || userStore.user?.permisos?.accesoCompletoEmpresasCentros) {
        const { data } = await CentrosTrabajoAPI.getCentrosTrabajo(empresaId);
        aplicar(data);
        return data;
      }
      
      // Para otros usuarios, cargar solo los centros asignados
      if (userStore.user?._id) {
        // Usar método alternativo que funciona correctamente
        // Cargar todos los centros de la empresa y filtrar por asignaciones del usuario
        const { data: todosLosCentros } = await CentrosTrabajoAPI.getCentrosTrabajo(empresaId);
        
        // Obtener asignaciones del usuario desde el store
        await userStore.loadUserAssignments();
        const centrosAsignados = userStore.centrosTrabajoAsignados;
        
        // Filtrar centros por asignaciones
        const centrosFiltrados = todosLosCentros.filter((centro: CentroTrabajo) => 
          centrosAsignados.includes(centro._id)
        );
        
        aplicar(centrosFiltrados);
        return centrosFiltrados;
      }
      
      // Si no hay usuario, retornar array vacío
      aplicar([]);
      return [];
    } catch (error) {
      console.log(error);
      aplicar([]);
      return [];
    } finally {
      if (seq === listadoSeq) loading.value = false;
    }
  }

  async function fetchCentroTrabajoById(
    empresaId: string,
    centroTrabajoId: string
  ) {
    try {
      loading.value = true;
      loadingModal.value = true;
      const { data } = await CentrosTrabajoAPI.getCentroTrabajoById(
        empresaId,
        centroTrabajoId
      );
      currentCentroTrabajo.value = data;
      currentCentroTrabajoId.value = centroTrabajoId;
    } catch (error) {
      console.log(error);
    } finally {
      loading.value = false;
      loadingModal.value = false;
    }
  }

  async function createCentroTrabajo(
    empresaId: string,
    centroTrabajo: CentroTrabajo
  ) {
    try {
      loading.value = true;
      await CentrosTrabajoAPI.createCentroTrabajo(empresaId, centroTrabajo);
    } catch (error) {
      // console.log(error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function updateCentroTrabajoById(
    empresaId: string,
    centroTrabajoId: string,
    centroTrabajo: CentroTrabajo
  ) {
    try {
      loading.value = true;
      await CentrosTrabajoAPI.updateCentroTrabajoById(
        empresaId,
        centroTrabajoId,
        centroTrabajo
      );
    } catch (error) {
      // console.log(error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function deleteCentroTrabajoById(
    empresaId: string,
    centroTrabajoId: string,
    deletionPassword?: string,
  ) {
    try {
      loading.value = true;
      await CentrosTrabajoAPI.deleteCentroTrabajoById(
        empresaId,
        centroTrabajoId,
        deletionPassword,
      );
    } catch (error) {
      // console.log(error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    loadingModal,
    centrosTrabajo,
    currentCentroTrabajoId,
    currentCentroTrabajo,
    resetCurrentCentroTrabajo,
    resetCentrosTrabajo,
    fetchCentrosTrabajo,
    fetchCentroTrabajoById,
    createCentroTrabajo,
    updateCentroTrabajoById,
    deleteCentroTrabajoById,
  };
});
