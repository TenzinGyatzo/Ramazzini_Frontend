/**
 * Acceso comercial de un tenant: una sola regla para todos los bloqueos (expediente,
 * documentos, alta y carga masiva de trabajadores, aviso de suscripción).
 * Espejo de las reglas del backend (periodo-prueba.util.ts). Probada en accesoComercial.spec.ts.
 */

export interface ContratoTenant {
    plan: "basico" | "profesional" | "empresarial" | "personalizado";
    nombrePlan?: string | null;
    historiasMes: number;
    periodicidad: "mensual" | "anual";
    renovacionAutomatica?: boolean;
    fechaInicio: string | Date;
    pagadoHasta?: string | Date | null;
    estado: "activo" | "terminado";
    fechaTerminacion?: string | Date | null;
}

export const NOMBRES_PLAN: Record<ContratoTenant["plan"], string> = {
    basico: "Plan Básico",
    profesional: "Plan Profesional",
    empresarial: "Plan Empresarial",
    personalizado: "Plan personalizado",
};

/** Días antes del vencimiento en que se avisa (al tenant y en la consola). */
export const DIAS_AVISO_CONTRATO: Record<ContratoTenant["periodicidad"], number> = {
    mensual: 7,
    anual: 30,
};

export type BloqueoComercial =
    | "restringido"
    | "contrato_vencido"
    | "prueba_vencida"
    | "suscripcion_vencida"
    | "pago_inactivo";

type ProveedorComercial = {
    restriccionManual?: boolean | null;
    periodoDePruebaFinalizado?: boolean | null;
    estadoSuscripcion?: string | null;
    finDeSuscripcion?: string | Date | null;
    contrato?: Partial<ContratoTenant> | null;
    maxHistoriasPermitidasAlMes?: number | null;
    limiteHistoriasManual?: number | null;
    historiasCortesia?: number | null;
    limiteHistoriasEfectivo?: number | null;
};

export function nombrePlanContrato(contrato: Partial<ContratoTenant> | null | undefined): string {
    if (!contrato?.plan) return "Plan";
    return contrato.nombrePlan?.trim() || NOMBRES_PLAN[contrato.plan] || "Plan";
}

/** Vigente: activo con renovación automática, o `pagadoHasta` aún no alcanzado (terminado conserva lo pagado). */
export function contratoVigente(
    contrato: Partial<ContratoTenant> | null | undefined,
    ahora: Date = new Date(),
): boolean {
    if (!contrato) return false;
    if (contrato.estado === "activo" && contrato.renovacionAutomatica === true) return true;
    return !!contrato.pagadoHasta && new Date(contrato.pagadoHasta).getTime() >= ahora.getTime();
}

/**
 * null = puede registrar trabajadores y crear documentos. Mismo criterio que los bloqueos
 * históricos (prueba finalizada sin suscripción, pago inactivo, cancelada vencida), más el
 * contrato manual vigente como forma de acceso.
 */
export function resolverBloqueoComercial(
    p: ProveedorComercial | null | undefined,
    ahora: Date = new Date(),
): BloqueoComercial | null {
    if (!p) return null;
    if (p.restriccionManual === true) return "restringido";
    if (!p.periodoDePruebaFinalizado) return null;
    if (contratoVigente(p.contrato, ahora)) return null;

    const estado = p.estadoSuscripcion ?? null;
    const fin = p.finDeSuscripcion ? new Date(p.finDeSuscripcion) : null;
    const bloqueoHistorico: BloqueoComercial | null =
        !estado
            ? "prueba_vencida"
            : estado === "inactive"
              ? "pago_inactivo"
              : estado === "cancelled" && (!fin || ahora.getTime() >= fin.getTime())
                ? "suscripcion_vencida"
                : null;
    if (!bloqueoHistorico) return null;
    return p.contrato ? "contrato_vencido" : bloqueoHistorico;
}

/** Días que faltan para que venza el contrato, si está dentro de su ventana de aviso (7 o 30 días). */
export function diasParaVencerContrato(
    contrato: Partial<ContratoTenant> | null | undefined,
    ahora: Date = new Date(),
): number | null {
    if (!contrato?.pagadoHasta || !contratoVigente(contrato, ahora)) return null;
    if (contrato.estado === "activo" && contrato.renovacionAutomatica) return null;
    const dias = Math.ceil((new Date(contrato.pagadoHasta).getTime() - ahora.getTime()) / 86_400_000);
    const ventana = DIAS_AVISO_CONTRATO[contrato.periodicidad ?? "mensual"] ?? 7;
    return dias <= ventana ? Math.max(dias, 0) : null;
}

/** HC de cortesía (explícitas, o convertidas del límite heredado de la regla del mayor). */
export function historiasCortesia(p: ProveedorComercial | null | undefined): number {
    if (!p) return 0;
    if (typeof p.historiasCortesia === "number") return Math.max(0, p.historiasCortesia);
    if (typeof p.limiteHistoriasManual === "number") {
        const contratado = typeof p.maxHistoriasPermitidasAlMes === "number" ? p.maxHistoriasPermitidasAlMes : 0;
        return Math.max(0, p.limiteHistoriasManual - contratado);
    }
    return 0;
}

export interface DesgloseHistorias {
    contratadas: number | null;
    cortesia: number;
    efectivo: number | null;
}

/** Límite = contratado (el mayor entre Mercado Pago y el contrato vigente) + cortesía. */
export function desgloseHistorias(
    p: ProveedorComercial | null | undefined,
    ahora: Date = new Date(),
): DesgloseHistorias {
    if (!p) return { contratadas: null, cortesia: 0, efectivo: null };
    const cortesia = historiasCortesia(p);
    const mp = typeof p.maxHistoriasPermitidasAlMes === "number" ? p.maxHistoriasPermitidasAlMes : null;
    const contrato =
        contratoVigente(p.contrato, ahora) && typeof p.contrato?.historiasMes === "number"
            ? p.contrato.historiasMes
            : null;
    const base = mp === null && contrato === null ? null : Math.max(mp ?? 0, contrato ?? 0);
    const calculado = base === null && cortesia === 0 ? null : (base ?? 0) + cortesia;
    // El backend manda el efectivo ya calculado: se respeta si viene
    const efectivo = typeof p.limiteHistoriasEfectivo === "number" ? p.limiteHistoriasEfectivo : calculado;
    return {
        contratadas: efectivo === null ? base : Math.max(0, efectivo - cortesia),
        cortesia,
        efectivo,
    };
}
