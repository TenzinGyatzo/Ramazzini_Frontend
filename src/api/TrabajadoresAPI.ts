import type { Trabajador } from '@/interfaces/trabajador.interface';
import api from '@/lib/axios'
import { deletionPasswordHeaders } from '@/utils/deletionAuth'

export default {
    getTrabajadores(empresaId: string, centroTrabajoId: string) {
        return api.get(`/${empresaId}/${centroTrabajoId}/trabajadores`)
    },

    getTrabajadoresConHistoria(empresaId: string, centroTrabajoId: string) {
        return api.get(`/${empresaId}/${centroTrabajoId}/trabajadores-con-historia`);
    },

    getTrabajadoresCount(empresaId: string, centroTrabajoId: string) {
        return api.get<{ count: number }>(`/${empresaId}/${centroTrabajoId}/trabajadores-count`);
    }, 
    
    getSexosYFechasNacimientoActivos(empresaId: string, centroTrabajoId: string) {
        return api.get(`/${empresaId}/${centroTrabajoId}/sexos-y-fechas-nacimiento-activos`);
    },

    getDashboardData(empresaId: string, centroTrabajoId: string, inicio?: string, fin?: string) {
    const params: any = {};
    if (inicio) params.inicio = inicio;
    if (fin) params.fin = fin;

    return api.get(`/${empresaId}/${centroTrabajoId}/dashboard`, { params });
    },

    getTrabajadorById(empresaId: string, centroTrabajoId: string, trabajadorId: string) {
        return api.get(`/${empresaId}/${centroTrabajoId}/${trabajadorId}`)
    },

    createTrabajador(empresaId: string, centroTrabajoId: string, trabajadorData: Trabajador) {
        return api.post(`/${empresaId}/${centroTrabajoId}/registrar-trabajador`, trabajadorData)
    },

    updateTrabajador(empresaId: string, centroTrabajoId: string, trabajadorId: string, trabajadorData: Partial<Trabajador>) {
        return api.patch(`/${empresaId}/${centroTrabajoId}/actualizar-trabajador/${trabajadorId}`, trabajadorData)
    },

    importTrabajadores(empresaId: string, centroTrabajoId: string, formData: FormData) {
        return api.post(`/${empresaId}/${centroTrabajoId}/importar-trabajadores`, formData)
    },

    deleteTrabajadorById(empresaId: string, centroTrabajoId: string, trabajadorId: string, deletionPassword?: string) {
        return api.delete(`/${empresaId}/${centroTrabajoId}/eliminar-trabajador/${trabajadorId}`, {
            headers: deletionPasswordHeaders(deletionPassword),
        })
    },

    exportTrabajadores(empresaId: string, centroTrabajoId: string) {
        return api.get(`/${empresaId}/${centroTrabajoId}/exportar-trabajadores`, {
            headers: {
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            },
            responseType: 'blob'
        });
    },

    transferirTrabajador(empresaId: string, centroTrabajoId: string, trabajadorId: string, nuevoCentroId: string) {
        return api.patch(`/${empresaId}/${centroTrabajoId}/transferir-trabajador/${trabajadorId}`, {
            nuevoCentroId
        });
    },

    getCentrosDisponiblesTransferencia(empresaId: string, centroTrabajoId: string, excluirCentroId?: string, idProveedorSalud?: string) {
        const params: any = {};
        if (excluirCentroId) params.excluirCentroId = excluirCentroId;
        if (idProveedorSalud) params.idProveedorSalud = idProveedorSalud;
        return api.get(`/${empresaId}/${centroTrabajoId}/centros-disponibles-transferencia`, { params });
    },

    getDuplicadosPendientes(empresaId: string, centroTrabajoId: string) {
        return api.get(`/${empresaId}/${centroTrabajoId}/duplicados-pendientes`);
    },

    getDuplicadosDeTrabajador(empresaId: string, centroTrabajoId: string, trabajadorId: string) {
        return api.get(`/${empresaId}/${centroTrabajoId}/trabajadores/${trabajadorId}/duplicados`);
    },

    getFusionPreview(empresaId: string, centroTrabajoId: string, destinoId: string, fuenteId: string) {
        return api.get(`/${empresaId}/${centroTrabajoId}/trabajadores/fusion-preview`, {
            params: { destinoId, fuenteId },
        });
    },

    descartarDuplicado(empresaId: string, centroTrabajoId: string, alertId: string) {
        return api.patch(`/${empresaId}/${centroTrabajoId}/duplicados/${alertId}/descartar`, {});
    },

    fusionarTrabajadores(
        empresaId: string,
        centroTrabajoId: string,
        payload: {
            trabajadorDestinoId: string;
            trabajadorFuenteId: string;
            confirmacion: boolean;
            numeroEmpleadoResuelto?: string;
            migrarArchivos?: boolean;
        },
    ) {
        return api.post(`/${empresaId}/${centroTrabajoId}/fusionar-trabajadores`, payload);
    },

}