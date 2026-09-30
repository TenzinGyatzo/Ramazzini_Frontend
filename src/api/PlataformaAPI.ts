import api from "@/lib/axios";

export interface PlatformActiveTenant {
    id: string;
    nombre: string;
    regimenRegulatorio: string | null;
}

export interface TenantSettingsChanges {
    limiteHistoriasManual?: number | null;
    fechaFinTrial?: string | null;
    restriccionManual?: boolean;
}

export interface TenantSettingsResponse {
    id: string;
    limiteHistoriasManual: number | null;
    fechaFinTrial: string | null;
    restriccionManual: boolean;
    periodoDePruebaFinalizado: boolean;
    limiteHistoriasEfectivo: number | null;
    fechaFinTrialEfectiva: string | null;
}

/** Consola de plataforma (solo Administrador): entrar / salir del espacio de un tenant. */
export default {
    getContexto() {
        return api.get<{ activeTenant: PlatformActiveTenant | null }>("/plataforma/contexto");
    },

    enterTenant(proveedorSaludId: string) {
        return api.post<{ activeTenant: PlatformActiveTenant }>("/plataforma/tenant-activo", {
            proveedorSaludId,
        });
    },

    exitTenant() {
        return api.delete<{ activeTenant: null }>("/plataforma/tenant-activo");
    },

    /** Ajustes comerciales de un tenant. Campo ausente = sin cambio; null = volver a lo automático. */
    updateTenantSettings(proveedorSaludId: string, cambios: TenantSettingsChanges) {
        return api.patch<TenantSettingsResponse>(`/plataforma/tenants/${proveedorSaludId}`, cambios);
    },
};
