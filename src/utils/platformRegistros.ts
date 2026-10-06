/**
 * Registros de Administrador (bitácora de plataforma): nombres en español, categorías y
 * resumen legible de cada evento. Lógica pura, probada en platformRegistros.spec.ts.
 */
import { NOMBRES_PLAN } from "@/utils/accesoComercial";

export interface RegistroPlataforma {
    _id: string;
    timestamp: string;
    actionType: string;
    categoria: string;
    tenantId: string | null;
    tenantNombre: string | null;
    resourceType: string | null;
    resourceId: string | null;
    actor: string | null;
    payload: Record<string, any> | null;
    hashEvento: string;
    encadenado: boolean;
}

export const CATEGORIAS_REGISTRO: Array<{ clave: string; etiqueta: string }> = [
    { clave: "ajustes", etiqueta: "Ajustes de tenant" },
    { clave: "contratacion", etiqueta: "Contratación y pagos" },
    { clave: "catalogos", etiqueta: "Catálogos" },
    { clave: "tenant", etiqueta: "Cambios dentro de tenants" },
    { clave: "consola", etiqueta: "Consola (entrar / salir)" },
    { clave: "sesion", etiqueta: "Sesión" },
    { clave: "descargas", etiqueta: "Descargas y exportaciones" },
    { clave: "seguridad", etiqueta: "Seguridad" },
    { clave: "otros", etiqueta: "Otros" },
];

const ETIQUETAS_EVENTO: Record<string, string> = {
    PLATFORM_TENANT_ENTER: "Entró al espacio",
    PLATFORM_TENANT_EXIT: "Salió del espacio",
    PLATFORM_TENANT_SETTINGS_UPDATED: "Ajustes de plataforma",
    PLATFORM_TENANT_CONTRACT_UPDATED: "Contrato",
    PLATFORM_TENANT_PAYMENT_RECORDED: "Pago registrado",
    PLATFORM_TENANT_PAYMENT_UPDATED: "Pago actualizado",
    ADMIN_CATALOG_CREATE: "Catálogo: registro creado",
    ADMIN_CATALOG_UPDATE: "Catálogo: registro modificado",
    ADMIN_CATALOG_DELETE: "Catálogo: registro eliminado",
    ADMIN_CATALOG_IMPORT: "Catálogo importado",
    ADMIN_CATALOG_RELOAD: "Catálogo recargado",
    LOGIN_SUCCESS: "Inicio de sesión",
    LOGIN_FAIL: "Inicio de sesión fallido",
    LOGIN_BLOCKED: "Inicio de sesión bloqueado",
    SESSION_UNLOCK_SUCCESS: "Sesión desbloqueada",
    SESSION_UNLOCK_FAIL: "Desbloqueo de sesión fallido",
    USER_PASSWORD_CHANGED: "Contraseña cambiada",
    AUDIT_EXPORT_DOWNLOAD: "Exportación de bitácora",
    GIIS_EXPORT_FILE_GENERATED: "Exportación GIIS generada",
    GIIS_EXPORT_DOWNLOADED: "Exportación GIIS descargada",
    WORKERS_EXPORT_EXCEL: "Exportación de trabajadores (Excel)",
    DASHBOARD_REPORT_EXPORTED: "Informe del dashboard exportado",
    CLINICAL_FILE_DOWNLOAD: "Descarga de documento clínico",
    CLINICAL_FILES_MERGED_DOWNLOAD: "Descarga de documentos combinados",
    DELETION_AUTH_FAIL: "Eliminación no autorizada",
    EMPRESA_DELETE_DENIED: "Eliminación de empresa rechazada",
    CENTRO_DELETE_DENIED: "Eliminación de centro rechazada",
    DOC_CREATE_DRAFT: "Documento creado (borrador)",
    DOC_UPDATE_DRAFT: "Documento modificado (borrador)",
    EMPRESA_UPDATED: "Empresa modificada",
    EMPRESA_DELETED: "Empresa eliminada",
    CENTRO_UPDATED: "Centro de trabajo modificado",
    CENTRO_DELETED: "Centro de trabajo eliminado",
    WORKER_FUSION_MANUAL: "Fusión de trabajadores",
    WORKER_TRANSFER: "Transferencia de trabajador",
    WORKER_DELETED: "Trabajador eliminado",
    WORKER_DELETE_DENIED: "Eliminación de trabajador rechazada",
    INVENTORY_ADJUSTED: "Ajuste de inventario",
    INVENTORY_WRITE_OFF: "Baja de inventario",
    INVENTORY_CATALOG_UPDATED: "Catálogo de insumos modificado",
    INVENTORY_CONFIG_UPDATED: "Configuración del inventario modificada",
    CONSENT_CREATED: "Consentimiento registrado",
    USER_INVITATION_SENT: "Invitación de usuario enviada",
    USER_ACTIVATED: "Usuario activado",
    USER_SUSPENDED: "Usuario suspendido",
    USER_REACTIVATED: "Usuario reactivado",
    USER_DELETED: "Usuario eliminado",
    SIGNER_PROFILE_CREATED: "Perfil de firmante creado",
    SIGNER_PROFILE_UPDATED: "Perfil de firmante modificado",
    ADMIN_ROLES_PERMISSIONS: "Permisos de usuario modificados",
    ADMIN_USER_ASSIGNMENTS: "Asignaciones de usuario modificadas",
    ADMIN_CONFIG_SIRES: "Configuración SIRES modificada",
};

export function etiquetaEvento(registro: Pick<RegistroPlataforma, "actionType" | "payload">): string {
    const { actionType, payload } = registro;
    if (actionType === "PLATFORM_TENANT_CONTRACT_UPDATED") {
        if (payload?.accion === "crear") return "Contrato registrado";
        if (payload?.accion === "terminar") return "Contrato terminado";
        return "Contrato modificado";
    }
    if (actionType === "PLATFORM_TENANT_PAYMENT_UPDATED") {
        return payload?.accion === "anular" ? "Pago anulado" : "Factura emitida";
    }
    return ETIQUETAS_EVENTO[actionType] ?? actionType;
}

export function etiquetaCategoria(clave: string): string {
    return CATEGORIAS_REGISTRO.find((c) => c.clave === clave)?.etiqueta ?? clave;
}

const fechaCorta = (valor: unknown): string => {
    if (!valor) return "—";
    const fecha = new Date(valor as string);
    if (Number.isNaN(fecha.getTime())) return String(valor);
    return fecha.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
};
const dinero = (monto: unknown): string =>
    typeof monto === "number" ? monto.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) : "—";
const siNo = (valor: unknown): string => (valor ? "Sí" : "No");

/** Campos de los ajustes de plataforma, en el orden en que se muestran. */
const CAMPOS_AJUSTES: Array<{ clave: string; nombre: string; formato: (v: unknown) => string }> = [
    { clave: "historiasCortesia", nombre: "HC de cortesía", formato: (v) => String(v ?? 0) },
    { clave: "fechaFinTrial", nombre: "Fin del periodo gratuito", formato: (v) => (v ? fechaCorta(v) : "automático") },
    { clave: "restriccionManual", nombre: "Acceso restringido", formato: siNo },
    { clave: "pagoEnLineaHabilitado", nombre: "Pago en línea", formato: siNo },
];

function cambiosDeAjustes(payload: Record<string, any>): string[] {
    const antes = payload.antes ?? {};
    const despues = payload.despues ?? {};
    return CAMPOS_AJUSTES.filter(({ clave }) => String(antes[clave] ?? "") !== String(despues[clave] ?? "")).map(
        ({ clave, nombre, formato }) => `${nombre}: ${formato(antes[clave])} → ${formato(despues[clave])}`,
    );
}

function resumenContrato(payload: Record<string, any>): string {
    const contrato = payload.despues?.contrato ?? null;
    const privado = payload.despues?.privado ?? null;
    if (!contrato) return "";
    if (payload.accion === "terminar") return `Acceso hasta el ${fechaCorta(contrato.pagadoHasta)}`;
    const partes = [
        contrato.nombrePlan || NOMBRES_PLAN[contrato.plan as keyof typeof NOMBRES_PLAN] || "Plan",
        `${contrato.historiasMes} HC al mes`,
        contrato.periodicidad === "anual" ? "anual" : "mensual",
    ];
    if (privado?.formaPago) {
        partes.push(privado.formaPago === "mercadopago_enlace" ? "enlace de Mercado Pago" : "transferencia");
    }
    if (privado?.requiereFactura) partes.push("con factura");
    if (typeof privado?.montoPeriodo === "number") partes.push(dinero(privado.montoPeriodo));
    if (contrato.renovacionAutomatica) partes.push("renovación automática");
    else if (contrato.pagadoHasta) partes.push(`pagado hasta el ${fechaCorta(contrato.pagadoHasta)}`);
    if (payload.manualHeredadoSustituido) partes.push("sustituye el acceso manual heredado");
    return partes.join(" · ");
}

/** Catálogos globales (clave del servidor → nombre). */
const NOMBRES_CATALOGO: Record<string, string> = {
    diagnosticos: "CIE-10 (diagnósticos)",
    establecimientos_salud: "CLUES (establecimientos)",
    enitades_federativas: "Entidades federativas",
    municipios: "Municipios",
    localidades: "Localidades",
    codigos_postales: "Códigos postales",
    cat_tipo_personal: "Tipo de personal",
    cat_afiliacion: "Afiliación",
    cat_pais: "Países",
    servicios_atencion_por_tipo_personal_sis_ce: "Servicios de atención",
};

export function nombreCatalogo(clave: unknown): string {
    return NOMBRES_CATALOGO[String(clave)] ?? String(clave ?? "Catálogo");
}

const NOMBRES_CAMPO_CATALOGO: Record<string, string> = { description: "descripción", code: "código", vigente: "vigente" };
const entreComillas = (valor: unknown): string => (valor == null || valor === "" ? "vacío" : `«${valor}»`);

function resumenCatalogo(actionType: string, payload: Record<string, any>): string {
    const partes = [nombreCatalogo(payload.catalogType)];
    if (payload.code) partes.push(String(payload.code));
    switch (actionType) {
        case "ADMIN_CATALOG_CREATE":
            if (payload.despues?.description) partes.push(String(payload.despues.description));
            break;
        case "ADMIN_CATALOG_DELETE":
            if (payload.antes?.description) partes.push(`eliminado: ${payload.antes.description}`);
            break;
        case "ADMIN_CATALOG_UPDATE": {
            const cambios = Object.entries((payload.cambios ?? {}) as Record<string, { antes: unknown; despues: unknown }>);
            if (cambios.length) {
                partes.push(
                    cambios
                        .slice(0, 3)
                        .map(([campo, c]) => `${NOMBRES_CAMPO_CATALOGO[campo] ?? campo}: ${entreComillas(c.antes)} → ${entreComillas(c.despues)}`)
                        .join("; ") + (cambios.length > 3 ? ` (+${cambios.length - 3} más)` : ""),
                );
            } else if (Array.isArray(payload.patch) && payload.patch.length) {
                // Eventos anteriores: solo guardaban qué campos cambiaron
                partes.push(`campos: ${payload.patch.join(", ")}`);
            }
            break;
        }
        case "ADMIN_CATALOG_IMPORT": {
            const filas = typeof payload.rowCount === "number" ? `${payload.rowCount.toLocaleString("es-MX")} filas` : "";
            const antes =
                typeof payload.rowCountAntes === "number" ? ` (antes ${payload.rowCountAntes.toLocaleString("es-MX")})` : "";
            if (filas) partes.push(filas + antes);
            if (payload.archivo) partes.push(String(payload.archivo));
            break;
        }
    }
    return partes.join(" · ");
}

const CLAVES_INTERNAS = new Set(["tenantId", "tenantNombre", "operadorPlataforma", "tenantSinBitacora"]);

/** Para eventos sin resumen propio: hasta cuatro datos simples del detalle. */
function resumenGenerico(payload: Record<string, any>): string {
    return Object.entries(payload)
        .filter(([clave, valor]) => !CLAVES_INTERNAS.has(clave) && valor != null && typeof valor !== "object")
        .slice(0, 4)
        .map(([clave, valor]) => `${clave}: ${valor}`)
        .join(" · ");
}

/** Resumen legible del evento (una línea). El detalle completo se ve al abrir la fila. */
export function resumenEvento(registro: Pick<RegistroPlataforma, "actionType" | "payload">): string {
    const payload = registro.payload ?? {};
    switch (registro.actionType) {
        case "PLATFORM_TENANT_SETTINGS_UPDATED":
            return cambiosDeAjustes(payload).join(" · ") || "Sin cambios visibles";
        case "PLATFORM_TENANT_CONTRACT_UPDATED":
            return resumenContrato(payload);
        case "PLATFORM_TENANT_PAYMENT_RECORDED": {
            const partes = [
                dinero(payload.monto),
                `cubre ${fechaCorta(payload.periodoDesde)} – ${fechaCorta(payload.periodoHasta)}`,
            ];
            if (payload.factura === "pendiente") partes.push("factura pendiente");
            return partes.join(" · ");
        }
        case "PLATFORM_TENANT_PAYMENT_UPDATED":
            return payload.accion === "anular"
                ? `Motivo: ${payload.despues?.anulado?.motivo ?? "—"}`
                : `Folio ${payload.despues?.factura?.folio ?? "—"}`;
        case "PLATFORM_TENANT_ENTER":
        case "PLATFORM_TENANT_EXIT":
            return "";
        case "ADMIN_CATALOG_CREATE":
        case "ADMIN_CATALOG_UPDATE":
        case "ADMIN_CATALOG_DELETE":
        case "ADMIN_CATALOG_IMPORT":
        case "ADMIN_CATALOG_RELOAD":
            return resumenCatalogo(registro.actionType, payload);
        case "AUDIT_EXPORT_DOWNLOAD":
            return `${fechaCorta(payload.from)} – ${fechaCorta(payload.to)} · ${String(payload.format ?? "").toUpperCase()}${
                payload.ambito === "plataforma" ? " · registros de Administrador" : ""
            }`;
        default: {
            const generico = resumenGenerico(payload);
            return payload.tenantSinBitacora
                ? [generico, "tenant sin bitácora propia"].filter(Boolean).join(" · ")
                : generico;
        }
    }
}

export type PeriodoRapido = "hoy" | "7d" | "30d" | "rango";

/** Desde / hasta (ISO) de un periodo rápido, en hora local. */
export function rangoDePeriodo(periodo: Exclude<PeriodoRapido, "rango">, ahora = new Date()): { from: string; to: string } {
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    if (periodo === "7d") inicio.setDate(inicio.getDate() - 6);
    if (periodo === "30d") inicio.setDate(inicio.getDate() - 29);
    const fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);
    return { from: inicio.toISOString(), to: fin.toISOString() };
}

/** Rango elegido a mano (`yyyy-mm-dd`): del inicio del primer día al final del último. */
export function rangoDeFechas(desdeYmd: string, hastaYmd: string): { from: string; to: string } | null {
    if (!desdeYmd || !hastaYmd || hastaYmd < desdeYmd) return null;
    const [y1, m1, d1] = desdeYmd.split("-").map(Number);
    const [y2, m2, d2] = hastaYmd.split("-").map(Number);
    return {
        from: new Date(y1, m1 - 1, d1).toISOString(),
        to: new Date(y2, m2 - 1, d2, 23, 59, 59, 999).toISOString(),
    };
}
