import api from "@/lib/axios";
import type { ContratoTenant } from "@/utils/accesoComercial";
import type { RegistroPlataforma } from "@/utils/platformRegistros";

export interface PlatformActiveTenant {
    id: string;
    nombre: string;
    regimenRegulatorio: string | null;
}

export interface TenantSettingsChanges {
    /** HC de cortesía (se suman a lo contratado); null o 0 = quitar. */
    historiasCortesia?: number | null;
    fechaFinTrial?: string | null;
    restriccionManual?: boolean;
    pagoEnLineaHabilitado?: boolean;
}

export interface TenantSettingsResponse {
    id: string;
    historiasCortesia: number;
    fechaFinTrial: string | null;
    restriccionManual: boolean;
    pagoEnLineaHabilitado: boolean;
    periodoDePruebaFinalizado: boolean;
    limiteHistoriasEfectivo: number | null;
    fechaFinTrialEfectiva: string | null;
}

export type FormaPagoContrato = "transferencia" | "mercadopago_enlace";
export type EstadoFactura = "no_requiere" | "pendiente" | "emitida";

export interface ContratoPrivado {
    formaPago: FormaPagoContrato;
    requiereFactura: boolean;
    montoPeriodo: number | null;
    moneda?: string;
    notas?: string | null;
}

export interface PagoRegistrado {
    _id: string;
    fechaPago: string;
    monto: number;
    moneda?: string;
    periodoDesde: string;
    periodoHasta: string;
    formaPago: FormaPagoContrato;
    factura: { estado: EstadoFactura; folio?: string | null; fechaEmision?: string | null };
    notas?: string | null;
    anulado?: { motivo: string; fecha: string } | null;
}

export interface PagoMercadoPago {
    _id: string;
    payment_id?: string;
    date_created?: string;
    transaction_amount?: number;
    currency_id?: string;
    reason?: string;
    status?: string;
    payment?: { status?: string } | null;
}

export interface Contratacion {
    id: string;
    contrato: ContratoTenant | null;
    contratoVigente: boolean;
    privado: ContratoPrivado | null;
    historias: { base: number | null; cortesia: number; efectivo: number | null };
    manualHeredado: boolean;
    mercadoPago: {
        estadoSuscripcion: string | null;
        suscripcionActiva: string | null;
        finDeSuscripcion: string | null;
        suscripcion: { reason?: string; status?: string; auto_recurring?: { transaction_amount?: number } } | null;
        pagos: PagoMercadoPago[];
    };
    pagos: PagoRegistrado[];
}

export interface ContratoPayload {
    plan: ContratoTenant["plan"];
    nombrePlan?: string | null;
    historiasMes: number;
    periodicidad: ContratoTenant["periodicidad"];
    formaPago: FormaPagoContrato;
    requiereFactura: boolean;
    renovacionAutomatica?: boolean;
    fechaInicio: string;
    pagadoHasta?: string | null;
    montoPeriodo?: number | null;
    notas?: string | null;
    reactivar?: boolean;
}

export interface RegistrosQuery {
    from?: string;
    to?: string;
    tenantId?: string;
    categoria?: string;
    soloCambios?: boolean;
    q?: string;
    page?: number;
    limit?: number;
}

export interface RegistrosRespuesta {
    items: RegistroPlataforma[];
    total: number;
    page: number;
    limit: number;
}

export interface VerificacionRegistros {
    valid: boolean;
    errors?: { index: number; expectedHash: string; actualHash: string }[];
    total?: number;
    encadenadoDesde?: string | null;
}

export interface RegistrarPagoPayload {
    fechaPago: string;
    monto: number;
    periodoDesde?: string;
    periodoHasta?: string;
    notas?: string | null;
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

    /** Contrato manual, pagos registrados y pagos de Mercado Pago de un tenant. */
    getContratacion(proveedorSaludId: string) {
        return api.get<Contratacion>(`/plataforma/tenants/${proveedorSaludId}/contratacion`);
    },

    guardarContrato(proveedorSaludId: string, datos: ContratoPayload) {
        return api.put<Contratacion>(`/plataforma/tenants/${proveedorSaludId}/contrato`, datos);
    },

    terminarContrato(proveedorSaludId: string, accesoHasta?: string | null) {
        return api.post<Contratacion>(`/plataforma/tenants/${proveedorSaludId}/contrato/terminar`, {
            ...(accesoHasta ? { accesoHasta } : {}),
        });
    },

    registrarPago(proveedorSaludId: string, datos: RegistrarPagoPayload) {
        return api.post<Contratacion>(`/plataforma/tenants/${proveedorSaludId}/pagos`, datos);
    },

    emitirFactura(proveedorSaludId: string, pagoId: string, folio: string, fechaEmision?: string) {
        return api.patch<Contratacion>(`/plataforma/tenants/${proveedorSaludId}/pagos/${pagoId}`, {
            factura: { folio, ...(fechaEmision ? { fechaEmision } : {}) },
        });
    },

    anularPago(proveedorSaludId: string, pagoId: string, motivo: string) {
        return api.patch<Contratacion>(`/plataforma/tenants/${proveedorSaludId}/pagos/${pagoId}`, {
            anular: { motivo },
        });
    },

    /** Registros de Administrador: bitácora de plataforma. */
    getRegistros(params: RegistrosQuery) {
        return api.get<RegistrosRespuesta>("/plataforma/registros", { params });
    },

    async exportarRegistros(params: { from: string; to: string; format: "csv" | "json" }): Promise<Blob> {
        const { data } = await api.get<Blob>("/plataforma/registros/export", { params, responseType: "blob" });
        return data;
    },

    verificarRegistros(params: { from: string; to: string }) {
        return api.get<VerificacionRegistros>("/plataforma/registros/verify", { params });
    },
};
