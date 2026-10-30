import auth from '@/lib/axiosAuth'
import proveedor from '@/lib/axiosProveedor'

interface AlcanceProductividad {
    idEmpresa?: string;
    idCentroTrabajo?: string;
}

export default {
    // Obtener estadísticas de productividad para todos los usuarios de un proveedor
    async getProductivityStatsByProveedor(
        idProveedorSalud: string,
        fechaInicio?: string,
        fechaFin?: string,
        signal?: AbortSignal,
        alcance: AlcanceProductividad = {},
    ) {
        const params = new URLSearchParams();
        if (fechaInicio) params.append('fechaInicio', fechaInicio);
        if (fechaFin) params.append('fechaFin', fechaFin);
        if (alcance.idEmpresa) params.append('idEmpresa', alcance.idEmpresa);
        if (alcance.idCentroTrabajo) params.append('idCentroTrabajo', alcance.idCentroTrabajo);

        const queryString = params.toString();
        const url = `/users/productividad/${idProveedorSalud}${queryString ? `?${queryString}` : ''}`;

        return auth.get(url, { signal });
    },

    // Obtener estadísticas de productividad para todos los usuarios del sistema (solo para administradores)
    async getAllProductivityStats(
        fechaInicio?: string,
        fechaFin?: string,
        signal?: AbortSignal,
    ) {
        const params = new URLSearchParams();
        if (fechaInicio) params.append('fechaInicio', fechaInicio);
        if (fechaFin) params.append('fechaFin', fechaFin);

        const queryString = params.toString();
        const url = `/users/productividad/todos${queryString ? `?${queryString}` : ''}`;

        return auth.get(url, { signal });
    },

    // Obtener estadísticas detalladas de un usuario específico
    async getUserDetailedStats(
        userId: string,
        fechaInicio?: string,
        fechaFin?: string,
        alcance: AlcanceProductividad = {},
    ) {
        const params = new URLSearchParams();
        if (fechaInicio) params.append('fechaInicio', fechaInicio);
        if (fechaFin) params.append('fechaFin', fechaFin);
        if (alcance.idEmpresa) params.append('idEmpresa', alcance.idEmpresa);
        if (alcance.idCentroTrabajo) params.append('idCentroTrabajo', alcance.idCentroTrabajo);
        
        const queryString = params.toString();
        const url = `/users/estadisticas/${userId}${queryString ? `?${queryString}` : ''}`;
        
        return auth.get(url);
    },

    // Obtener resumen de documentos por tipo para un usuario
    async getUserDocumentsSummary(userId: string) {
        return auth.get(`/users/${userId}/documentos/resumen`);
    },

    // Obtener actividad reciente de un usuario
    async getUserRecentActivity(userId: string, limit: number = 10) {
        return auth.get(`/users/${userId}/actividad-reciente?limit=${limit}`);
    },

    // Obtener comparativa de productividad entre usuarios
    async getProductivityComparison(idProveedorSalud: string, periodo: string = 'mes') {
        return auth.get(`/users/${idProveedorSalud}/comparativa?periodo=${periodo}`);
    },

    // Obtener métricas de rendimiento por período
    async getPerformanceMetrics(userId: string, periodo: string = 'mes') {
        return auth.get(`/users/${userId}/metricas-rendimiento?periodo=${periodo}`);
    },

    // Obtener tendencias de productividad
    async getProductivityTrends(idProveedorSalud: string, meses: number = 6) {
        return auth.get(`/users/${idProveedorSalud}/tendencias?meses=${meses}`);
    },

    // **API para reglas de puntaje**
    // Obtener reglas de puntaje del proveedor de salud
    async getReglasPuntaje(idProveedorSalud: string) {
        return proveedor.get(`/reglas-puntaje/${idProveedorSalud}`);
    },

    // Actualizar reglas de puntaje del proveedor de salud
    async updateReglasPuntaje(idProveedorSalud: string, reglasPuntaje: {
        aptitudes: number;
        historias: number;
        exploraciones: number;
        examenesVista: number;
        audiometrias: number;
        antidopings: number;
        notas: number;
        externos: number;
        otros: number;
    }) {
        return proveedor.patch(`/reglas-puntaje/${idProveedorSalud}`, reglasPuntaje);
    }
};
