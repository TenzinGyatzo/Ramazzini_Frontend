import { describe, expect, it } from "vitest";
import {
    contratoVigente,
    desgloseHistorias,
    diasParaVencerContrato,
    historiasCortesia,
    nombrePlanContrato,
    resolverBloqueoComercial,
} from "@/utils/accesoComercial";

const AHORA = new Date("2026-09-30T12:00:00");
const enDias = (d: number) => new Date(AHORA.getTime() + d * 86_400_000).toISOString();

/** Copia literal de la lógica que tenían los bloqueos antes de la Etapa 5.7 (true = bloquea). */
function bloqueoAnterior(p: {
    restriccionManual?: boolean;
    periodoDePruebaFinalizado?: boolean;
    estadoSuscripcion?: string | null;
    finDeSuscripcion?: string | null;
}): boolean {
    if (p.restriccionManual) return true;
    const finDeSuscripcion = p.finDeSuscripcion ? new Date(p.finDeSuscripcion) : null;
    if (p.periodoDePruebaFinalizado) {
        if (!p.estadoSuscripcion || p.estadoSuscripcion === "inactive") return true;
        if (p.estadoSuscripcion === "cancelled" && (!finDeSuscripcion || AHORA >= finDeSuscripcion)) return true;
    }
    return false;
}

describe("resolverBloqueoComercial: sin contrato, idéntico a la lógica anterior", () => {
    const estados = [null, undefined, "", "authorized", "pending", "inactive", "cancelled", "paused"];
    const fines = [null, enDias(-3), enDias(0), enDias(5)];
    const casos: Array<Record<string, any>> = [];
    for (const restriccionManual of [false, true, undefined])
        for (const periodoDePruebaFinalizado of [false, true, undefined])
            for (const estadoSuscripcion of estados)
                for (const finDeSuscripcion of fines)
                    casos.push({ restriccionManual, periodoDePruebaFinalizado, estadoSuscripcion, finDeSuscripcion });

    it(`${casos.length} combinaciones`, () => {
        for (const caso of casos) {
            expect({ caso, bloquea: resolverBloqueoComercial(caso, AHORA) !== null }).toEqual({
                caso,
                bloquea: bloqueoAnterior(caso),
            });
        }
    });

    it("motivos", () => {
        const base = { periodoDePruebaFinalizado: true };
        expect(resolverBloqueoComercial({ restriccionManual: true, estadoSuscripcion: "authorized" }, AHORA)).toBe(
            "restringido",
        );
        expect(resolverBloqueoComercial({ ...base }, AHORA)).toBe("prueba_vencida");
        expect(resolverBloqueoComercial({ ...base, estadoSuscripcion: "inactive" }, AHORA)).toBe("pago_inactivo");
        expect(
            resolverBloqueoComercial({ ...base, estadoSuscripcion: "cancelled", finDeSuscripcion: enDias(-1) }, AHORA),
        ).toBe("suscripcion_vencida");
        expect(resolverBloqueoComercial(null, AHORA)).toBeNull();
    });
});

describe("resolverBloqueoComercial: contrato con Ramazzini", () => {
    const contrato = {
        plan: "profesional" as const,
        historiasMes: 150,
        periodicidad: "mensual" as const,
        fechaInicio: enDias(-40),
        estado: "activo" as const,
    };
    const vencidaLaPrueba = { periodoDePruebaFinalizado: true, estadoSuscripcion: null };

    it("vigente da acceso aunque la prueba haya vencido", () => {
        expect(resolverBloqueoComercial({ ...vencidaLaPrueba, contrato: { ...contrato, pagadoHasta: enDias(3) } }, AHORA)).toBeNull();
        expect(
            resolverBloqueoComercial({ ...vencidaLaPrueba, contrato: { ...contrato, renovacionAutomatica: true } }, AHORA),
        ).toBeNull();
    });

    it("vencido o sin vigencia → contrato_vencido", () => {
        expect(
            resolverBloqueoComercial({ ...vencidaLaPrueba, contrato: { ...contrato, pagadoHasta: enDias(-1) } }, AHORA),
        ).toBe("contrato_vencido");
        expect(resolverBloqueoComercial({ ...vencidaLaPrueba, contrato }, AHORA)).toBe("contrato_vencido");
    });

    it("terminado: acceso hasta lo pagado", () => {
        const terminado = { ...contrato, estado: "terminado" as const };
        expect(resolverBloqueoComercial({ ...vencidaLaPrueba, contrato: { ...terminado, pagadoHasta: enDias(2) } }, AHORA)).toBeNull();
        expect(
            resolverBloqueoComercial({ ...vencidaLaPrueba, contrato: { ...terminado, pagadoHasta: enDias(-2) } }, AHORA),
        ).toBe("contrato_vencido");
    });

    it("Mercado Pago vigente o restricción mandan sobre el contrato", () => {
        const vencido = { ...contrato, pagadoHasta: enDias(-1) };
        expect(
            resolverBloqueoComercial(
                { periodoDePruebaFinalizado: true, estadoSuscripcion: "authorized", contrato: vencido },
                AHORA,
            ),
        ).toBeNull();
        expect(
            resolverBloqueoComercial(
                { restriccionManual: true, periodoDePruebaFinalizado: true, contrato: { ...contrato, pagadoHasta: enDias(9) } },
                AHORA,
            ),
        ).toBe("restringido");
    });

    it("con la prueba aún vigente no bloquea", () => {
        expect(resolverBloqueoComercial({ periodoDePruebaFinalizado: false, contrato }, AHORA)).toBeNull();
    });
});

describe("vigencia, aviso y nombre del plan", () => {
    it("contratoVigente", () => {
        expect(contratoVigente(null, AHORA)).toBe(false);
        expect(contratoVigente({ estado: "terminado", renovacionAutomatica: true }, AHORA)).toBe(false);
        expect(contratoVigente({ estado: "activo", pagadoHasta: enDias(0.5) }, AHORA)).toBe(true);
    });

    it("aviso: 7 días en mensual, 30 en anual; nunca en renovación automática", () => {
        expect(diasParaVencerContrato({ estado: "activo", periodicidad: "mensual", pagadoHasta: enDias(5) }, AHORA)).toBe(5);
        expect(diasParaVencerContrato({ estado: "activo", periodicidad: "mensual", pagadoHasta: enDias(10) }, AHORA)).toBeNull();
        expect(diasParaVencerContrato({ estado: "activo", periodicidad: "anual", pagadoHasta: enDias(25) }, AHORA)).toBe(25);
        expect(diasParaVencerContrato({ estado: "activo", periodicidad: "anual", pagadoHasta: enDias(-1) }, AHORA)).toBeNull();
        expect(
            diasParaVencerContrato({ estado: "activo", renovacionAutomatica: true, periodicidad: "mensual", pagadoHasta: enDias(2) }, AHORA),
        ).toBeNull();
    });

    it("nombre del plan", () => {
        expect(nombrePlanContrato({ plan: "profesional" })).toBe("Plan Profesional");
        expect(nombrePlanContrato({ plan: "personalizado", nombrePlan: "Plan Clínica Norte" })).toBe("Plan Clínica Norte");
    });
});

describe("HC: contratadas + cortesía", () => {
    it("cortesía explícita o convertida del límite heredado", () => {
        expect(historiasCortesia({ historiasCortesia: 20 })).toBe(20);
        expect(historiasCortesia({ maxHistoriasPermitidasAlMes: 50, limiteHistoriasManual: 80 })).toBe(30);
        expect(historiasCortesia({ maxHistoriasPermitidasAlMes: 50, limiteHistoriasManual: 10 })).toBe(0);
    });

    it("desglose: el efectivo del backend manda; contratadas = efectivo − cortesía", () => {
        expect(desgloseHistorias({ maxHistoriasPermitidasAlMes: 50, historiasCortesia: 30, limiteHistoriasEfectivo: 80 }, AHORA)).toEqual({
            contratadas: 50,
            cortesia: 30,
            efectivo: 80,
        });
        const contrato = {
            plan: "empresarial" as const,
            historiasMes: 300,
            periodicidad: "anual" as const,
            fechaInicio: enDias(-1),
            estado: "activo" as const,
            pagadoHasta: enDias(300),
        };
        expect(desgloseHistorias({ maxHistoriasPermitidasAlMes: 25, historiasCortesia: 10, contrato }, AHORA)).toEqual({
            contratadas: 300,
            cortesia: 10,
            efectivo: 310,
        });
        // Límite heredado 80 sobre 50 contratadas: mismo resultado que antes
        expect(desgloseHistorias({ maxHistoriasPermitidasAlMes: 50, limiteHistoriasManual: 80 }, AHORA).efectivo).toBe(80);
    });
});
