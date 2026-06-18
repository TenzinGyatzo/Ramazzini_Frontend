import { defineStore } from "pinia";
import { ref } from "vue";
import EmpresasAPI from "../api/EmpresasAPI";
import proveedor from "@/lib/axiosProveedor";
import { useUserStore } from "./user";

interface Empresa {
  _id: string;
  nombreComercial: string;
  razonSocial: string;
  RFC: string;
  giroDeEmpresa: string;
  logotipoEmpresa?: {
    data: string;
    contentType: string;
  };
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  idProveedorSalud: string;
}

export const useEmpresasStore = defineStore("empresas", () => {
  const loading = ref(true);
  const loadingModal = ref(false);
  const empresas = ref<Empresa[]>([]);
  const currentEmpresaId = ref<string | null>(null);
  const currentEmpresa = ref<Empresa | null>(null);

  function resetCurrentEmpresa() {
    currentEmpresa.value = {
      _id: "",
      nombreComercial: "",
      razonSocial: "",
      RFC: "",
      giroDeEmpresa: "",
      logotipoEmpresa: { data: "", contentType: "" },
      createdBy: "",
      updatedBy: "",
      createdAt: "",
      updatedAt: "",
      idProveedorSalud: "",
    };
    currentEmpresaId.value = "";
  }

  async function fetchEmpresas(idProveedorSalud: string) {
    try {
      loading.value = true;
      const userStore = useUserStore();
      
      // Si el usuario es Principal o tiene acceso completo, no pasar userId
      const userId = (userStore.isPrincipal() || userStore.user?.permisos?.accesoCompletoEmpresasCentros) 
        ? undefined 
        : userStore.user?._id;
      const { data } = await EmpresasAPI.getEmpresas(idProveedorSalud, userId);
      
      if (data.message) {
        empresas.value = []; // Si no hay empresas, mantenemos el array vacío
      } else {
        empresas.value = data; // Si hay empresas, las asignamos
      }
      return data; // Retornamos los datos para su uso
    } catch (error) {
      console.log(error);
      empresas.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchEmpresaById(id: string) {
    try {
      loadingModal.value = true; // Indicamos que se está cargando
      const { data } = await EmpresasAPI.getEmpresaById(id);
      currentEmpresa.value = data; // Guardamos los datos de la empresa en el store
      currentEmpresaId.value = id;
      return data; 
    } catch (error) {
      console.error("Error al cargar la empresa:", error);
    } finally {
      loadingModal.value = false; // Nos aseguramos de que loading sea false cuando termina la petición
    }
  }

  async function createEmpresa(empresa: FormData) {
    try {
      loading.value = true;
      await EmpresasAPI.createEmpresa(empresa);
    } catch (error) {
      // console.log(error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function updateEmpresaById(id: string, empresa: FormData) {
    try {
      loading.value = true;
      await EmpresasAPI.updateEmpresaById(id, empresa);
    } catch (error) {
      // console.log(error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function deleteEmpresaById(id: string, deletionPassword?: string) {
    try {
      loading.value = true;
      await EmpresasAPI.deleteEmpresaById(id, deletionPassword);
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
    empresas,
    currentEmpresaId,
    currentEmpresa,
    resetCurrentEmpresa,
    fetchEmpresas,
    fetchEmpresaById,
    createEmpresa,
    updateEmpresaById,
    deleteEmpresaById,
  };
});
