import api from '@/lib/axios'
import type { CentroTrabajo } from '@/interfaces/centro-trabajo.interface'
import { deletionPasswordHeaders } from '@/utils/deletionAuth'

export default {
    getCentrosTrabajo(empresaId: string) {
        return api.get(`${empresaId}/centros-trabajo`)
    },

    getCentroTrabajoById(empresaId: string, centroTrabajoId: string) {
        return api.get(`${empresaId}/${centroTrabajoId}`)
    },

    createCentroTrabajo(empresaId: string, centroTrabajoData: CentroTrabajo) {
        return api.post(`${empresaId}/crear-centro-trabajo`, centroTrabajoData)
    },

    updateCentroTrabajoById(empresaId: string, centroTrabajoId: string, centroTrabajoData: CentroTrabajo) {
        return api.patch(`${empresaId}/actualizar-centro-trabajo/${centroTrabajoId}`, centroTrabajoData)
    },

    deleteCentroTrabajoById(empresaId: string, centroTrabajoId: string, deletionPassword?: string) {
        return api.delete(`${empresaId}/eliminar-centro-trabajo/${centroTrabajoId}`, {
            headers: deletionPasswordHeaders(deletionPassword),
        })
    },
}