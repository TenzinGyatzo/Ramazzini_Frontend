import api from "@/lib/axios";

export interface PlatformActiveTenant {
    id: string;
    nombre: string;
    regimenRegulatorio: string | null;
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
};
