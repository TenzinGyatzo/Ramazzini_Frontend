import api from '@/lib/axios';
import type { ResumenEliminacion } from '@/utils/resumenEliminacion';

/** Qué se eliminaría y si algo lo impide. Se consulta antes de pedir la confirmación. */
export default {
  resumenEmpresa(empresaId: string) {
    return api.get<ResumenEliminacion>(`/eliminar-empresa/${empresaId}/resumen`);
  },

  resumenCentro(empresaId: string, centroTrabajoId: string) {
    return api.get<ResumenEliminacion>(
      `/${empresaId}/eliminar-centro-trabajo/${centroTrabajoId}/resumen`,
    );
  },

  resumenTrabajador(empresaId: string, centroTrabajoId: string, trabajadorId: string) {
    return api.get<ResumenEliminacion>(
      `/${empresaId}/${centroTrabajoId}/eliminar-trabajador/${trabajadorId}/resumen`,
    );
  },
};
