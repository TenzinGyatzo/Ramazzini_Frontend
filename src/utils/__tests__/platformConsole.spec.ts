import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    calcularMetricas,
    clasificarEstado,
    coincideBusqueda,
    etiquetaContratacion,
    etiquetaMes,
    fechaRegistroDesdeId,
    filtrarYOrdenar,
    guardarPreferencias,
    leerPreferencias,
    motivosAtencion,
    PREFERENCIAS_POR_DEFECTO,
    resumenRoles,
    sinAcceso,
    tieneAjustes,
    usoHistorias,
    type ConsolaProveedor,
} from "@/utils/platformConsole";


function memoriaStorage() {
    const datos = new Map<string, string>();
    return {
        getItem: (k: string) => datos.get(k) ?? null,
        setItem: (k: string, v: string) => void datos.set(k, String(v)),
        removeItem: (k: string) => void datos.delete(k),
        clear: () => datos.clear(),
    };
}
const AHORA = new Date("2026-09-30T12:00:00");
const enDias = (d: number) => new Date(AHORA.getTime() + d * 24 * 60 * 60 * 1000).toISOString();

const prov = (extra: Partial<ConsolaProveedor> = {}): ConsolaProveedor => ({
    _id: "650000000000000000000001",
    nombre: "Clínica",
    maxHistoriasPermitidasAlMes: 50,
    historiasClinicasMes: 0,
    ...extra,
});

describe("clasificarEstado", () => {
    it("Mercado Pago activo; authorized sin Mercado Pago = manual heredado", () => {
        expect(clasificarEstado(prov({ estadoSuscripcion: "authorized", suscripcionActiva: "mp-1" }), AHORA).clave).toBe("activo");
        expect(clasificarEstado(prov({ estadoSuscripcion: "authorized" }), AHORA).clave).toBe("manual_heredado");
    });

    it("cancelada con acceso restante y sin acceso", () => {
        const conAcceso = clasificarEstado(prov({ estadoSuscripcion: "cancelled", finDeSuscripcion: enDias(5) }), AHORA);
        expect(conAcceso.clave).toBe("cancelado_con_acceso");
        expect(conAcceso.diasRestantes).toBe(5);
        expect(
            clasificarEstado(prov({ estadoSuscripcion: "cancelled", finDeSuscripcion: enDias(-1) }), AHORA).clave,
        ).toBe("cancelado_sin_acceso");
    });

    it("pago pendiente", () => {
        expect(clasificarEstado(prov({ estadoSuscripcion: "pending" }), AHORA).clave).toBe("pago_pendiente");
    });

    it("periodo gratuito vigente, extendido por el Administrador y vencido", () => {
        expect(clasificarEstado(prov({ fechaFinTrial: enDias(10) }), AHORA)).toMatchObject({
            clave: "gratuito",
            diasRestantes: 10,
        });
        expect(clasificarEstado(prov({ fechaFinTrial: enDias(-2) }), AHORA).clave).toBe("gratuito_vencido");
        expect(clasificarEstado(prov({ fechaFinTrial: enDias(10), periodoDePruebaFinalizado: true }), AHORA).clave).toBe(
            "gratuito_vencido",
        );
    });
});

describe("sinAcceso", () => {
    it("restricción manual siempre deja sin acceso, aunque esté activa", () => {
        expect(sinAcceso(prov({ estadoSuscripcion: "authorized", restriccionManual: true }), AHORA)).toBe(true);
        expect(sinAcceso(prov({ estadoSuscripcion: "authorized" }), AHORA)).toBe(false);
        expect(sinAcceso(prov({ fechaFinTrial: enDias(-1) }), AHORA)).toBe(true);
    });
});

describe("usoHistorias", () => {
    it("límite efectivo con desglose contratado / asignado", () => {
        expect(usoHistorias(prov({ historiasClinicasMes: 45, historiasCortesia: 150, limiteHistoriasEfectivo: 200 }))).toEqual({
            usadas: 45,
            limite: 200,
            contratado: 50,
            cortesia: 150,
            porcentaje: 23,
        });
    });

    it("sin límite efectivo del backend aplica la regla del mayor", () => {
        expect(usoHistorias(prov({ limiteHistoriasManual: 10 })).limite).toBe(50);
        expect(usoHistorias(prov({ limiteHistoriasManual: 80 })).limite).toBe(80);
    });
});

describe("motivosAtencion", () => {
    it("periodo por vencer, pérdida de acceso próxima, uso alto y restricción", () => {
        expect(motivosAtencion(prov({ fechaFinTrial: enDias(2) }), AHORA)).toEqual(["Periodo gratuito vence en 2 d"]);
        expect(motivosAtencion(prov({ fechaFinTrial: enDias(10) }), AHORA)).toEqual([]);
        expect(
            motivosAtencion(prov({ estadoSuscripcion: "cancelled", finDeSuscripcion: enDias(6) }), AHORA),
        ).toEqual(["Pierde acceso en 6 d"]);
        expect(motivosAtencion(prov({ estadoSuscripcion: "authorized", suscripcionActiva: "mp-1", historiasClinicasMes: 40 }), AHORA)).toEqual([
            "Uso de HC al 80%",
        ]);
        expect(motivosAtencion(prov({ estadoSuscripcion: "authorized", suscripcionActiva: "mp-1", restriccionManual: true }), AHORA)).toEqual([
            "Acceso restringido",
        ]);
    });

    it("sin detalle cargado no evalúa el uso", () => {
        expect(
            motivosAtencion(
                prov({ estadoSuscripcion: "authorized", suscripcionActiva: "mp-1", historiasClinicasMes: 50, _detalleCargado: false }),
                AHORA,
            ),
        ).toEqual([]);
    });
});

describe("resumenRoles", () => {
    it("el Principal cuenta como médico y el Administrador no cuenta", () => {
        expect(
            resumenRoles({
                Principal: 1,
                Médico: 2,
                "Enfermero/a": 3,
                "Técnico Evaluador": 1,
                Administrativo: 2,
                Administrador: 1,
                Otro: 1,
            }),
        ).toEqual({ medicos: 3, enfermeros: 3, tecnicos: 1, administrativos: 2, otros: 1, total: 10 });
        expect(resumenRoles(undefined).total).toBe(0);
    });
});

describe("utilidades de fecha", () => {
    it("fecha de registro desde el ObjectId", () => {
        expect(fechaRegistroDesdeId("650000000000000000000001")?.getTime()).toBe(0x65000000 * 1000);
        expect(fechaRegistroDesdeId("no-es-id")).toBeNull();
    });

    it("etiqueta de mes", () => {
        expect(etiquetaMes("2026-09")).toBe("sep 2026");
    });
});

describe("búsqueda, filtros y orden", () => {
    const lista: ConsolaProveedor[] = [
        prov({ _id: "650000000000000000000001", nombre: "Óptima Salud", pais: "MX", estadoSuscripcion: "authorized", historiasClinicasMes: 45 }),
        prov({
            _id: "660000000000000000000002",
            nombre: "Bienestar Laboral",
            pais: "GT",
            fechaFinTrial: enDias(2),
            regimenRegulatorio: "SIRES_NOM024",
            principalUser: { username: "Dra. Pérez", email: "perez@correo.com" },
        }),
        prov({ _id: "670000000000000000000003", nombre: "Centro Norte", fechaFinTrial: enDias(-3) }),
        prov({ _id: "680000000000000000000004", nombre: "Alfa", estadoSuscripcion: "authorized", restriccionManual: true }),
    ];
    const nombres = (ps: ConsolaProveedor[]) => ps.map((p) => p.nombre);

    it("búsqueda sin acentos ni mayúsculas, incluyendo al usuario principal", () => {
        expect(coincideBusqueda(lista[0], "optima")).toBe(true);
        expect(coincideBusqueda(lista[1], "PEREZ")).toBe(true);
        expect(coincideBusqueda(lista[1], "gt")).toBe(true);
        expect(coincideBusqueda(lista[2], "perez")).toBe(false);
    });

    it("filtros por estado y régimen", () => {
        const f = (filtro: any, regimen: any = "todos") =>
            nombres(filtrarYOrdenar(lista, { ...PREFERENCIAS_POR_DEFECTO, filtro, regimen }, AHORA));
        expect(f("activos")).toEqual(["Alfa", "Óptima Salud"]);
        expect(f("gratuito")).toEqual(["Bienestar Laboral"]);
        expect(f("sin_acceso")).toEqual(["Alfa", "Centro Norte"]);
        expect(f("restringidos")).toEqual(["Alfa"]);
        expect(f("atencion")).toEqual(["Alfa", "Bienestar Laboral", "Óptima Salud"]);
        expect(f("todos", "SIRES_NOM024")).toEqual(["Bienestar Laboral"]);
        expect(f("todos", "SIN_REGIMEN")).toHaveLength(3);
    });

    it("orden por uso, vencimiento y registro", () => {
        const o = (orden: any) => nombres(filtrarYOrdenar(lista, { ...PREFERENCIAS_POR_DEFECTO, orden }, AHORA));
        expect(o("nombre")).toEqual(["Alfa", "Bienestar Laboral", "Centro Norte", "Óptima Salud"]);
        expect(o("uso")[0]).toBe("Óptima Salud");
        expect(o("vencimiento")[0]).toBe("Bienestar Laboral");
        expect(o("registro")).toEqual(["Alfa", "Centro Norte", "Bienestar Laboral", "Óptima Salud"]);
    });

    it("métricas", () => {
        const m = calcularMetricas(lista, AHORA);
        expect(m).toMatchObject({ total: 4, activos: 2, gratuito: 1, gratuitoPorVencer: 1, sinAcceso: 2, atencion: 3, historiasMes: 45 });
        expect(m.conteoPorFiltro.todos).toBe(4);
    });

    it("pago en línea: filtro propio y cuenta como ajuste", () => {
        const conPago = [...lista, prov({ _id: "690000000000000000000005", nombre: "Delta", pagoEnLineaHabilitado: true })];
        const f = (filtro: any) =>
            nombres(filtrarYOrdenar(conPago, { ...PREFERENCIAS_POR_DEFECTO, filtro }, AHORA));
        expect(f("pago_en_linea")).toEqual(["Delta"]);
        expect(f("con_ajustes")).toContain("Delta");
    });
});

describe("preferencias", () => {
    beforeEach(() => {
        vi.stubGlobal("localStorage", memoriaStorage());
    });

    it("guarda y recupera; descarta valores desconocidos", () => {
        expect(leerPreferencias()).toEqual(PREFERENCIAS_POR_DEFECTO);
        const prefs = { busqueda: "norte", filtro: "por_renovar", regimen: "SIRES_NOM024", contratacion: "transferencia", orden: "uso" } as const;
        guardarPreferencias(prefs);
        expect(leerPreferencias()).toEqual(prefs);
        // Preferencias de antes de la Etapa 5.7 (sin «contratacion»)
        localStorage.setItem("ramazzini.consola.preferencias", JSON.stringify({ busqueda: "x", filtro: "gratuito", regimen: "todos", orden: "nombre" }));
        expect(leerPreferencias().contratacion).toBe("todas");
        localStorage.setItem("ramazzini.consola.preferencias", JSON.stringify({ filtro: "inexistente", orden: 3 }));
        expect(leerPreferencias()).toEqual(PREFERENCIAS_POR_DEFECTO);
        localStorage.setItem("ramazzini.consola.preferencias", "{no json");
        expect(leerPreferencias()).toEqual(PREFERENCIAS_POR_DEFECTO);
    });
});

describe("contratación en la consola", () => {
    const nombres = (ps: ConsolaProveedor[]) => ps.map((p) => p.nombre);
    const contrato = (extra: Record<string, unknown> = {}) =>
        ({
            plan: "profesional",
            historiasMes: 150,
            periodicidad: "mensual",
            fechaInicio: enDias(-60),
            estado: "activo",
            ...extra,
        }) as any;
    const transferencia = { formaPago: "transferencia", requiereFactura: true, montoPeriodo: 2400 };

    it("estados: contrato vigente, por vencer, terminado con acceso y vencido", () => {
        const vencida = { periodoDePruebaFinalizado: true, fechaFinTrial: enDias(-30) };
        expect(clasificarEstado(prov({ ...vencida, contrato: contrato({ pagadoHasta: enDias(20) }) }), AHORA)).toMatchObject({
            clave: "contrato",
            tono: "success",
            diasRestantes: 20,
        });
        expect(clasificarEstado(prov({ ...vencida, contrato: contrato({ pagadoHasta: enDias(5) }) }), AHORA).tono).toBe("warning");
        expect(clasificarEstado(prov({ ...vencida, contrato: contrato({ renovacionAutomatica: true }) }), AHORA).etiqueta).toBe(
            "Contrato · renovación automática",
        );
        expect(
            clasificarEstado(prov({ ...vencida, contrato: contrato({ estado: "terminado", pagadoHasta: enDias(3) }) }), AHORA).etiqueta,
        ).toBe("Contrato terminado · acceso 3 d");
        const vencido = prov({ ...vencida, contrato: contrato({ pagadoHasta: enDias(-1) }) });
        expect(clasificarEstado(vencido, AHORA).clave).toBe("contrato_vencido");
        expect(sinAcceso(vencido, AHORA)).toBe(true);
    });

    it("motivos de atención: por vencer, vencido, heredado y facturas pendientes", () => {
        expect(motivosAtencion(prov({ contrato: contrato({ pagadoHasta: enDias(4) }) }), AHORA)).toContain("Contrato vence en 4 d");
        expect(
            motivosAtencion(prov({ contrato: contrato({ periodicidad: "anual", pagadoHasta: enDias(25) }) }), AHORA),
        ).toContain("Contrato vence en 25 d");
        expect(motivosAtencion(prov({ fechaFinTrial: enDias(-5), contrato: contrato({ pagadoHasta: enDias(-1) }) }), AHORA)).toContain(
            "Contrato vencido",
        );
        expect(motivosAtencion(prov({ estadoSuscripcion: "authorized" }), AHORA)).toContain(
            "Registrar su contrato (acceso manual sin vigencia)",
        );
        expect(motivosAtencion(prov({ estadoSuscripcion: "authorized", suscripcionActiva: "mp", facturasPendientes: 2 }), AHORA)).toContain(
            "2 facturas pendientes",
        );
    });

    it("forma de contratación: etiqueta y filtro", () => {
        const lista = [
            prov({ nombre: "A", contrato: contrato({ pagadoHasta: enDias(9) }), contratoPrivado: transferencia }),
            prov({
                nombre: "B",
                contrato: contrato({ periodicidad: "anual", renovacionAutomatica: true }),
                contratoPrivado: { formaPago: "mercadopago_enlace", requiereFactura: false, montoPeriodo: null },
            }),
            prov({ nombre: "C", estadoSuscripcion: "authorized", suscripcionActiva: "mp-1" }),
            prov({ nombre: "D", estadoSuscripcion: "authorized" }),
            prov({ nombre: "E", fechaFinTrial: enDias(5) }),
        ];
        expect(lista.map(etiquetaContratacion)).toEqual([
            "Transferencia · Mensual · Factura",
            "MP enlace · Anual",
            "Mercado Pago en la app",
            "Manual (heredado)",
            "Prueba",
        ]);
        const por = (contratacion: any) =>
            nombres(filtrarYOrdenar(lista, { ...PREFERENCIAS_POR_DEFECTO, contratacion }, AHORA));
        expect(por("transferencia")).toEqual(["A"]);
        expect(por("mercadopago_enlace")).toEqual(["B"]);
        expect(por("mp_app")).toEqual(["C"]);
        expect(por("manual_heredado")).toEqual(["D"]);
        expect(por("prueba")).toEqual(["E"]);
    });

    it("filtros y métricas: plan vigente, por renovar, facturas pendientes", () => {
        const lista = [
            prov({ nombre: "A", contrato: contrato({ pagadoHasta: enDias(3) }), facturasPendientes: 2 }),
            prov({ nombre: "B", estadoSuscripcion: "authorized", suscripcionActiva: "mp-1", facturasPendientes: 0 }),
            prov({ nombre: "C", estadoSuscripcion: "authorized", facturasPendientes: 1 }),
            prov({ nombre: "D", fechaFinTrial: enDias(-3) }),
        ];
        const f = (filtro: any) => nombres(filtrarYOrdenar(lista, { ...PREFERENCIAS_POR_DEFECTO, filtro }, AHORA));
        expect(f("activos")).toEqual(["A", "B", "C"]);
        expect(f("contratos")).toEqual(["A"]);
        expect(f("por_renovar")).toEqual(["A"]);
        expect(f("facturas_pendientes")).toEqual(["A", "C"]);
        expect(f("manual_heredado")).toEqual(["C"]);
        expect(calcularMetricas(lista, AHORA)).toMatchObject({ activos: 3, porRenovar: 1, facturasPendientes: 3 });
    });

    it("cortesía y ajustes", () => {
        expect(tieneAjustes(prov({ historiasCortesia: 10 }))).toBe(true);
        expect(tieneAjustes(prov({ maxHistoriasPermitidasAlMes: 50, limiteHistoriasManual: 80 }))).toBe(true);
        expect(tieneAjustes(prov({}))).toBe(false);
    });
});

