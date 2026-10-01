import { describe, expect, it } from "vitest";
import {
    etiquetaCategoria,
    etiquetaEvento,
    rangoDeFechas,
    rangoDePeriodo,
    resumenEvento,
} from "@/utils/platformRegistros";

describe("etiquetas", () => {
    it("nombre en español; contrato y pago según la acción; lo desconocido se muestra tal cual", () => {
        expect(etiquetaEvento({ actionType: "PLATFORM_TENANT_ENTER", payload: null })).toBe("Entró al espacio");
        expect(etiquetaEvento({ actionType: "PLATFORM_TENANT_CONTRACT_UPDATED", payload: { accion: "crear" } })).toBe(
            "Contrato registrado",
        );
        expect(etiquetaEvento({ actionType: "PLATFORM_TENANT_CONTRACT_UPDATED", payload: { accion: "terminar" } })).toBe(
            "Contrato terminado",
        );
        expect(etiquetaEvento({ actionType: "PLATFORM_TENANT_PAYMENT_UPDATED", payload: { accion: "anular" } })).toBe(
            "Pago anulado",
        );
        expect(
            etiquetaEvento({ actionType: "PLATFORM_TENANT_PAYMENT_UPDATED", payload: { accion: "factura_emitida" } }),
        ).toBe("Factura emitida");
        expect(etiquetaEvento({ actionType: "TIPO_NUEVO", payload: null })).toBe("TIPO_NUEVO");
        expect(etiquetaCategoria("contratacion")).toBe("Contratación y pagos");
        expect(etiquetaCategoria("desconocida")).toBe("desconocida");
    });
});

describe("resumenEvento", () => {
    it("ajustes: solo lo que cambió, con valor anterior y nuevo", () => {
        expect(
            resumenEvento({
                actionType: "PLATFORM_TENANT_SETTINGS_UPDATED",
                payload: {
                    antes: { historiasCortesia: 0, restriccionManual: false, pagoEnLineaHabilitado: false, fechaFinTrial: null },
                    despues: { historiasCortesia: 20, restriccionManual: false, pagoEnLineaHabilitado: true, fechaFinTrial: null },
                },
            }),
        ).toBe("HC de cortesía: 0 → 20 · Pago en línea: No → Sí");
    });

    it("ajustes: fin del periodo gratuito de automático a una fecha", () => {
        const resumen = resumenEvento({
            actionType: "PLATFORM_TENANT_SETTINGS_UPDATED",
            payload: { antes: { fechaFinTrial: null }, despues: { fechaFinTrial: "2026-12-31T12:00:00.000Z" } },
        });
        expect(resumen).toMatch(/^Fin del periodo gratuito: automático → .*2026/);
    });

    it("contrato: plan, HC, periodo, forma de pago, factura, monto y vigencia", () => {
        const resumen = resumenEvento({
            actionType: "PLATFORM_TENANT_CONTRACT_UPDATED",
            payload: {
                accion: "crear",
                manualHeredadoSustituido: true,
                despues: {
                    contrato: { plan: "profesional", historiasMes: 150, periodicidad: "anual", pagadoHasta: "2027-09-30T12:00:00.000Z" },
                    privado: { formaPago: "transferencia", requiereFactura: true, montoPeriodo: 24000 },
                },
            },
        });
        expect(resumen).toContain("Plan Profesional · 150 HC al mes · anual · transferencia · con factura");
        expect(resumen).toMatch(/\$24,000/);
        expect(resumen).toContain("pagado hasta el");
        expect(resumen).toContain("sustituye el acceso manual heredado");
    });

    it("contrato terminado y enlace de Mercado Pago", () => {
        expect(
            resumenEvento({
                actionType: "PLATFORM_TENANT_CONTRACT_UPDATED",
                payload: { accion: "terminar", despues: { contrato: { pagadoHasta: "2026-10-31T12:00:00.000Z" } } },
            }),
        ).toMatch(/^Acceso hasta el .*2026/);
        expect(
            resumenEvento({
                actionType: "PLATFORM_TENANT_CONTRACT_UPDATED",
                payload: {
                    accion: "actualizar",
                    despues: {
                        contrato: { plan: "basico", historiasMes: 50, periodicidad: "mensual", renovacionAutomatica: true },
                        privado: { formaPago: "mercadopago_enlace", requiereFactura: false, montoPeriodo: null },
                    },
                },
            }),
        ).toBe("Plan Básico · 50 HC al mes · mensual · enlace de Mercado Pago · renovación automática");
    });

    it("pagos: registrado, factura emitida y anulado", () => {
        const pago = resumenEvento({
            actionType: "PLATFORM_TENANT_PAYMENT_RECORDED",
            payload: { monto: 2400, periodoDesde: "2026-10-01T12:00:00.000Z", periodoHasta: "2026-11-01T12:00:00.000Z", factura: "pendiente" },
        });
        expect(pago).toMatch(/\$2,400/);
        expect(pago).toContain("cubre");
        expect(pago).toContain("factura pendiente");
        expect(
            resumenEvento({
                actionType: "PLATFORM_TENANT_PAYMENT_UPDATED",
                payload: { accion: "factura_emitida", despues: { factura: { folio: "A-1024" } } },
            }),
        ).toBe("Folio A-1024");
        expect(
            resumenEvento({
                actionType: "PLATFORM_TENANT_PAYMENT_UPDATED",
                payload: { accion: "anular", despues: { anulado: { motivo: "Duplicado" } } },
            }),
        ).toBe("Motivo: Duplicado");
    });

    it("genérico: datos simples, sin claves internas; marca los tenants sin bitácora propia", () => {
        expect(
            resumenEvento({
                actionType: "EMPRESA_UPDATED",
                payload: { tenantId: "t1", operadorPlataforma: true, tenantSinBitacora: true, empresa: "ACME", cambios: { a: 1 } },
            }),
        ).toBe("empresa: ACME · tenant sin bitácora propia");
        expect(resumenEvento({ actionType: "PLATFORM_TENANT_ENTER", payload: { tenantId: "t1" } })).toBe("");
        expect(resumenEvento({ actionType: "LOGIN_SUCCESS", payload: null })).toBe("");
    });
});

describe("periodos", () => {
    const ahora = new Date(2026, 9, 15, 10, 30);

    it("hoy, 7 y 30 días (incluye hoy), en hora local", () => {
        expect(rangoDePeriodo("hoy", ahora)).toEqual({
            from: new Date(2026, 9, 15).toISOString(),
            to: new Date(2026, 9, 15, 23, 59, 59, 999).toISOString(),
        });
        expect(rangoDePeriodo("7d", ahora).from).toBe(new Date(2026, 9, 9).toISOString());
        expect(rangoDePeriodo("30d", ahora).from).toBe(new Date(2026, 8, 16).toISOString());
    });

    it("rango manual: completo y no invertido", () => {
        expect(rangoDeFechas("2026-10-01", "2026-10-31")).toEqual({
            from: new Date(2026, 9, 1).toISOString(),
            to: new Date(2026, 9, 31, 23, 59, 59, 999).toISOString(),
        });
        expect(rangoDeFechas("2026-10-31", "2026-10-01")).toBeNull();
        expect(rangoDeFechas("", "2026-10-01")).toBeNull();
    });
});
