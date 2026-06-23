import auth from "@/lib/axiosAuth";
import api from "@/lib/axios";

export default {
  getUserAssignments(userId: string) {
    return auth.get(`/users/asignaciones/${userId}`);
  },
  
  updateUserAssignments(userId: string, assignments: any) {
    return auth.patch(`/users/asignaciones/${userId}`, assignments);
  },

  getAvailableEmpresas(idProveedorSalud: string) {
    return api.get(`/empresas/${idProveedorSalud}`);
  },

  getAvailableCentros(empresaId: string) {
    return api.get(`/${empresaId}/centros-trabajo`);
  },

  getCentrosByEmpresas(empresaIds: string[]) {
    if (empresaIds.length === 0) {
      return Promise.resolve({ data: [] });
    }
    return api.get(`/centros-trabajo/por-empresas?ids=${empresaIds.join(",")}`);
  },

  getCentrosByUser(userId: string) {
    return api.get(`/auth/users/asignaciones/${userId}/centros-trabajo`);
  }
};
