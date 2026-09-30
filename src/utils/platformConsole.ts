/**
 * Consola de plataforma: lógica pura (sin Vue) para estado, atención, uso, roles,
 * búsqueda, filtros, orden y métricas de los proveedores. Probada en platformConsole.spec.ts.
 */
import { resolverFechaFinTrial } from "@/utils/periodoPrueba";

export const DIAS_AVISO_PERIODO = 3;
export const DIAS_AVISO_CANCELACION = 7;
export const UMBRAL_USO_ATENCION = 80;

export interface ConteoMes {
    mes: string; // YYYY-MM
    count: number;
}

export interface ConsolaProveedor {
    _id: string;
    nombre?: string;
    pais?: string;
    regimenRegulatorio?: string | null;
    correoElectronico?: string;
    telefono?: string;
    estadoSuscripcion?: string | null;
    finDeSuscripcion?: string | null;
    periodoDePruebaFinalizado?: boolean;
    fechaInicioTrial?: string | null;
    fechaFinTrial?: string | null;
    fechaFinTrialEfectiva?: string | null;
    maxHistoriasPermitidasAlMes?: number | null;
    limiteHistoriasManual?: number | null;
    limiteHistoriasEfectivo?: number | null;
    restriccionManual?: boolean;
    pagoEnLineaHabilitado?: boolean;
    principalUser?: { username?: string; email?: string; phone?: string } | null;
    empresasCount?: number;
    historiasClinicasMes?: number;
    notasMedicasMes?: number;
    historiasPorMes?: ConteoMes[];
    notasPorMes?: ConteoMes[];
    usuariosPorRol?: Record<string, number>;
    usuariosTotal?: number;
    _detalleCargado?: boolean;
}

export type EstadoClave =
    | "activo"
    | "cancelado_con_acceso"
    | "cancelado_sin_acceso"
    | "pago_pendiente"
    | "gratuito"
    | "gratuito_vencido";

export type Tono = "success" | "warning" | "danger" | "neutral" | "accent";

export interface EstadoProveedor {
    clave: EstadoClave;
    etiqueta: string;
    tono: Tono;
    /** Fecha relevante: fin del periodo gratuito o fin del acceso tras cancelar. */
    fecha: Date | null;
    diasRestantes: number | null;
}

const MS_DIA = 24 * 60 * 60 * 1000;

function diasHasta(fecha: Date, ahora: Date): number {
    return Math.ceil((fecha.getTime() - ahora.getTime()) / MS_DIA);
}

/** Mismo criterio que los bloqueos comerciales de la app (suscripción y periodo gratuito). */
export function clasificarEstado(p: ConsolaProveedor, ahora = new Date()): EstadoProveedor {
    const estado = p.estadoSuscripcion ?? null;

    if (estado === "authorized") {
        return { clave: "activo", etiqueta: "Suscripción activa", tono: "success", fecha: null, diasRestantes: null };
    }
    if (estado === "cancelled") {
        const fin = p.finDeSuscripcion ? new Date(p.finDeSuscripcion) : null;
        if (fin && fin.getTime() > ahora.getTime()) {
            const dias = diasHasta(fin, ahora);
            return { clave: "cancelado_con_acceso", etiqueta: `Cancelada · acceso ${dias} d`, tono: "warning", fecha: fin, diasRestantes: dias };
        }
        return { clave: "cancelado_sin_acceso", etiqueta: "Cancelada", tono: "danger", fecha: fin, diasRestantes: null };
    }
    if (estado === "pending" || estado === "inactive") {
        return { clave: "pago_pendiente", etiqueta: "Pago pendiente", tono: "danger", fecha: null, diasRestantes: null };
    }

    const fin = resolverFechaFinTrial(p);
    if (fin && fin.getTime() > ahora.getTime() && !p.periodoDePruebaFinalizado) {
        const dias = diasHasta(fin, ahora);
        return { clave: "gratuito", etiqueta: `Gratuito · ${dias} d`, tono: "accent", fecha: fin, diasRestantes: dias };
    }
    return { clave: "gratuito_vencido", etiqueta: "Gratuito vencido", tono: "neutral", fecha: fin, diasRestantes: null };
}

/** true si el proveedor no puede registrar trabajadores ni crear documentos. */
export function sinAcceso(p: ConsolaProveedor, ahora = new Date()): boolean {
    if (p.restriccionManual) return true;
    const { clave } = clasificarEstado(p, ahora);
    return clave === "cancelado_sin_acceso" || clave === "gratuito_vencido" || clave === "pago_pendiente";
}

export interface UsoHistorias {
    usadas: number;
    limite: number;
    contratado: number;
    extraAsignado: number;
    porcentaje: number; // 0..100+
}

export function usoHistorias(p: ConsolaProveedor): UsoHistorias {
    const contratado = typeof p.maxHistoriasPermitidasAlMes === "number" ? p.maxHistoriasPermitidasAlMes : 0;
    let limite = contratado;
    if (typeof p.limiteHistoriasEfectivo === "number") {
        limite = p.limiteHistoriasEfectivo;
    } else if (typeof p.limiteHistoriasManual === "number") {
        limite = Math.max(contratado, p.limiteHistoriasManual);
    }
    const usadas = p.historiasClinicasMes ?? 0;
    const porcentaje = limite > 0 ? Math.round((usadas / limite) * 100) : usadas > 0 ? 100 : 0;
    return { usadas, limite, contratado, extraAsignado: Math.max(0, limite - contratado), porcentaje };
}

export function tieneAjustes(p: ConsolaProveedor): boolean {
    return (
        typeof p.limiteHistoriasManual === "number" ||
        !!p.fechaFinTrial ||
        !!p.restriccionManual ||
        p.pagoEnLineaHabilitado === true
    );
}

/** Motivos para "Requieren atención" (vacío = no requiere). */
export function motivosAtencion(p: ConsolaProveedor, ahora = new Date()): string[] {
    const motivos: string[] = [];
    const estado = clasificarEstado(p, ahora);
    if (p.restriccionManual) motivos.push("Acceso restringido");
    if (estado.clave === "gratuito" && estado.diasRestantes !== null && estado.diasRestantes <= DIAS_AVISO_PERIODO) {
        motivos.push(`Periodo gratuito vence en ${estado.diasRestantes} d`);
    }
    if (
        estado.clave === "cancelado_con_acceso" &&
        estado.diasRestantes !== null &&
        estado.diasRestantes <= DIAS_AVISO_CANCELACION
    ) {
        motivos.push(`Pierde acceso en ${estado.diasRestantes} d`);
    }
    if (p._detalleCargado !== false) {
        const uso = usoHistorias(p);
        if (uso.limite > 0 && uso.porcentaje >= UMBRAL_USO_ATENCION) {
            motivos.push(`Uso de HC al ${uso.porcentaje}%`);
        }
    }
    return motivos;
}

export interface ResumenRoles {
    medicos: number; // Principal cuenta como médico
    enfermeros: number;
    tecnicos: number;
    administrativos: number;
    otros: number;
    total: number;
}

/** El Administrador de plataforma no cuenta como usuario del tenant. */
export function resumenRoles(porRol: Record<string, number> | undefined | null): ResumenRoles {
    const r = porRol ?? {};
    const n = (rol: string) => r[rol] ?? 0;
    const conocidos = ["Principal", "Médico", "Enfermero/a", "Técnico Evaluador", "Administrativo", "Administrador"];
    const otros = Object.entries(r)
        .filter(([rol]) => !conocidos.includes(rol))
        .reduce((total, [, cantidad]) => total + cantidad, 0);
    const resumen = {
        medicos: n("Principal") + n("Médico"),
        enfermeros: n("Enfermero/a"),
        tecnicos: n("Técnico Evaluador"),
        administrativos: n("Administrativo"),
        otros,
    };
    return { ...resumen, total: Object.values(resumen).reduce((a, b) => a + b, 0) };
}

/** Fecha de alta derivada del ObjectId (primeros 4 bytes = segundos Unix). */
export function fechaRegistroDesdeId(id: string | undefined | null): Date | null {
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) return null;
    return new Date(parseInt(id.slice(0, 8), 16) * 1000);
}

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** `2026-09` → `sep 2026` */
export function etiquetaMes(mes: string): string {
    const [y, m] = mes.split("-").map(Number);
    if (!y || !m) return mes;
    return `${MESES_CORTOS[m - 1]} ${y}`;
}

export type FiltroEstado =
    | "todos"
    | "activos"
    | "gratuito"
    | "cancelados"
    | "gratuito_vencido"
    | "sin_acceso"
    | "restringidos"
    | "pago_en_linea"
    | "con_ajustes"
    | "atencion";

export type FiltroRegimen = "todos" | "SIRES_NOM024" | "SIN_REGIMEN";

export type Orden = "nombre" | "uso" | "historias_mes" | "vencimiento" | "registro";

export interface PreferenciasConsola {
    busqueda: string;
    filtro: FiltroEstado;
    regimen: FiltroRegimen;
    orden: Orden;
}

export const PREFERENCIAS_POR_DEFECTO: PreferenciasConsola = {
    busqueda: "",
    filtro: "todos",
    regimen: "todos",
    orden: "nombre",
};

function normalizar(texto: string | undefined | null): string {
    return (texto ?? "")
        .toString()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase();
}

export function coincideBusqueda(p: ConsolaProveedor, busqueda: string): boolean {
    const q = normalizar(busqueda).trim();
    if (!q) return true;
    const campos = [
        p.nombre,
        p.correoElectronico,
        p.telefono,
        p.pais,
        p.principalUser?.username,
        p.principalUser?.email,
        p.principalUser?.phone,
    ];
    return campos.some((c) => normalizar(c).includes(q));
}

export function coincideFiltro(p: ConsolaProveedor, filtro: FiltroEstado, ahora = new Date()): boolean {
    const { clave } = clasificarEstado(p, ahora);
    switch (filtro) {
        case "activos":
            return clave === "activo";
        case "gratuito":
            return clave === "gratuito";
        case "cancelados":
            return clave === "cancelado_con_acceso" || clave === "cancelado_sin_acceso";
        case "gratuito_vencido":
            return clave === "gratuito_vencido";
        case "sin_acceso":
            return sinAcceso(p, ahora);
        case "restringidos":
            return !!p.restriccionManual;
        case "pago_en_linea":
            return p.pagoEnLineaHabilitado === true;
        case "con_ajustes":
            return tieneAjustes(p);
        case "atencion":
            return motivosAtencion(p, ahora).length > 0;
        default:
            return true;
    }
}

export function coincideRegimen(p: ConsolaProveedor, regimen: FiltroRegimen): boolean {
    if (regimen === "todos") return true;
    if (regimen === "SIRES_NOM024") return p.regimenRegulatorio === "SIRES_NOM024";
    return p.regimenRegulatorio !== "SIRES_NOM024";
}

function comparar(a: ConsolaProveedor, b: ConsolaProveedor, orden: Orden, ahora: Date): number {
    const porNombre = normalizar(a.nombre).localeCompare(normalizar(b.nombre));
    switch (orden) {
        case "uso":
            return usoHistorias(b).porcentaje - usoHistorias(a).porcentaje || porNombre;
        case "historias_mes":
            return (b.historiasClinicasMes ?? 0) - (a.historiasClinicasMes ?? 0) || porNombre;
        case "vencimiento": {
            // Primero lo que vence antes; sin fecha de vencimiento al final
            const fa = clasificarEstado(a, ahora).diasRestantes;
            const fb = clasificarEstado(b, ahora).diasRestantes;
            return (fa ?? Number.MAX_SAFE_INTEGER) - (fb ?? Number.MAX_SAFE_INTEGER) || porNombre;
        }
        case "registro":
            return (
                (fechaRegistroDesdeId(b._id)?.getTime() ?? 0) - (fechaRegistroDesdeId(a._id)?.getTime() ?? 0) ||
                porNombre
            );
        default:
            return porNombre;
    }
}

export function filtrarYOrdenar(
    proveedores: ConsolaProveedor[],
    prefs: PreferenciasConsola,
    ahora = new Date(),
): ConsolaProveedor[] {
    return proveedores
        .filter(
            (p) =>
                coincideBusqueda(p, prefs.busqueda) &&
                coincideFiltro(p, prefs.filtro, ahora) &&
                coincideRegimen(p, prefs.regimen),
        )
        .sort((a, b) => comparar(a, b, prefs.orden, ahora));
}

export interface MetricasConsola {
    total: number;
    activos: number;
    gratuito: number;
    gratuitoPorVencer: number;
    sinAcceso: number;
    atencion: number;
    historiasMes: number;
    conteoPorFiltro: Record<FiltroEstado, number>;
}

export function calcularMetricas(proveedores: ConsolaProveedor[], ahora = new Date()): MetricasConsola {
    const filtros: FiltroEstado[] = [
        "todos",
        "activos",
        "gratuito",
        "cancelados",
        "gratuito_vencido",
        "sin_acceso",
        "restringidos",
        "pago_en_linea",
        "con_ajustes",
        "atencion",
    ];
    const conteoPorFiltro = Object.fromEntries(
        filtros.map((f) => [f, proveedores.filter((p) => coincideFiltro(p, f, ahora)).length]),
    ) as Record<FiltroEstado, number>;
    return {
        total: proveedores.length,
        activos: conteoPorFiltro.activos,
        gratuito: conteoPorFiltro.gratuito,
        gratuitoPorVencer: proveedores.filter((p) => {
            const e = clasificarEstado(p, ahora);
            return e.clave === "gratuito" && (e.diasRestantes ?? Infinity) <= DIAS_AVISO_PERIODO;
        }).length,
        sinAcceso: conteoPorFiltro.sin_acceso,
        atencion: conteoPorFiltro.atencion,
        historiasMes: proveedores.reduce((total, p) => total + (p.historiasClinicasMes ?? 0), 0),
        conteoPorFiltro,
    };
}

const CLAVE_PREFERENCIAS = "ramazzini.consola.preferencias";

const FILTROS_VALIDOS: FiltroEstado[] = [
    "todos",
    "activos",
    "gratuito",
    "cancelados",
    "gratuito_vencido",
    "sin_acceso",
    "restringidos",
    "pago_en_linea",
    "con_ajustes",
    "atencion",
];
const REGIMENES_VALIDOS: FiltroRegimen[] = ["todos", "SIRES_NOM024", "SIN_REGIMEN"];
const ORDENES_VALIDOS: Orden[] = ["nombre", "uso", "historias_mes", "vencimiento", "registro"];

/** Descarta valores guardados que ya no existan (p. ej. de una versión anterior). */
function sanear(valor: Partial<PreferenciasConsola> | null | undefined): PreferenciasConsola {
    const v = valor && typeof valor === "object" ? valor : {};
    return {
        busqueda: typeof v.busqueda === "string" ? v.busqueda : PREFERENCIAS_POR_DEFECTO.busqueda,
        filtro: FILTROS_VALIDOS.includes(v.filtro as FiltroEstado) ? (v.filtro as FiltroEstado) : "todos",
        regimen: REGIMENES_VALIDOS.includes(v.regimen as FiltroRegimen) ? (v.regimen as FiltroRegimen) : "todos",
        orden: ORDENES_VALIDOS.includes(v.orden as Orden) ? (v.orden as Orden) : "nombre",
    };
}

/** Preferencias guardadas en este navegador (no afecta tiempos de carga: lectura local síncrona). */
export function leerPreferencias(): PreferenciasConsola {
    try {
        const guardado = localStorage.getItem(CLAVE_PREFERENCIAS);
        if (!guardado) return { ...PREFERENCIAS_POR_DEFECTO };
        return sanear(JSON.parse(guardado));
    } catch {
        return { ...PREFERENCIAS_POR_DEFECTO };
    }
}

export function guardarPreferencias(prefs: PreferenciasConsola): void {
    try {
        localStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify(prefs));
    } catch {
        // almacenamiento no disponible: se ignora
    }
}
