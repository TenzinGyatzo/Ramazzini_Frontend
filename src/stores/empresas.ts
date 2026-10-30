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
  /** Empresa recién creada: la lista la lleva a la vista y la resalta, y luego la limpia. */
  const ultimaCreadaId = ref<string | null>(null);

  let detailSeq = 0;

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

  function clear() {
    empresas.value = [];
    currentEmpresa.value = null;
    currentEmpresaId.value = null;
    loading.value = false;
    loadingModal.value = false;
    detailSeq += 1;
  }

  async function fetchEmpresas(idProveedorSalud: string) {
    try {
      loading.value = true;
      const userStore = useUserStore();
      
      // Si el usuario es Principal (o Administrador de plataforma) o tiene acceso completo, no pasar userId
      const userId = (userStore.isPrincipal() || userStore.user?.role === 'Administrador' || userStore.user?.permisos?.accesoCompletoEmpresasCentros) 
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

  /** Para editar sin esperar al servidor: la lista trae la empresa completa. Devuelve si la encontró. */
  function usarEmpresaDeLaLista(id: string) {
    const empresa = empresas.value.find((e) => String(e._id) === String(id));
    if (!empresa) return false;
    detailSeq += 1; // Una lectura en curso no debe pisar a la empresa elegida
    loadingModal.value = false;
    currentEmpresa.value = empresa;
    currentEmpresaId.value = String(empresa._id);
    return true;
  }

  async function fetchEmpresaById(id: string) {
    const seq = ++detailSeq;
    try {
      loadingModal.value = true;
      const { data } = await EmpresasAPI.getEmpresaById(id);
      if (seq !== detailSeq) return data;
      currentEmpresa.value = data;
      currentEmpresaId.value = data?._id?.toString() ?? id;
      return data;
    } catch (error) {
      console.error("Error al cargar la empresa:", error);
    } finally {
      if (seq === detailSeq) loadingModal.value = false;
    }
  }

  async function createEmpresa(empresa: FormData) {
    try {
      loading.value = true;
      const { data } = await EmpresasAPI.createEmpresa(empresa);
      ultimaCreadaId.value = data?.data?._id ? String(data.data._id) : null;
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
    ultimaCreadaId,
    resetCurrentEmpresa,
    clear,
    fetchEmpresas,
    fetchEmpresaById,
    usarEmpresaDeLaLista,
    createEmpresa,
    updateEmpresaById,
    deleteEmpresaById,
  };
});
