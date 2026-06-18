import api from "@/lib/axios";
import { deletionPasswordHeaders } from "@/utils/deletionAuth";

export default {
  getEmpresas(idProveedorSalud: string, userId?: string) { 
    const url = userId 
      ? `/empresas/${idProveedorSalud}?userId=${userId}`
      : `/empresas/${idProveedorSalud}`;
    return api.get(url);
  },

  getEmpresaById(empresaId: string) {
    return api.get(`/${empresaId}`);
  },

  createEmpresa(empresaData) {
    return api.post("/crear-empresa", empresaData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  updateEmpresaById(empresaId: string, empresaData) {
    return api.patch(`/actualizar-empresa/${empresaId}`, empresaData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  getRiesgosTrabajoPorEmpresa(empresaId: string) {
    return api.get(`/${empresaId}/riesgos-trabajo`);
  },

  deleteEmpresaById(empresaId: string, deletionPassword?: string) {
    return api.delete(`/eliminar-empresa/${empresaId}`, {
      headers: deletionPasswordHeaders(deletionPassword),
    });
  },

};
