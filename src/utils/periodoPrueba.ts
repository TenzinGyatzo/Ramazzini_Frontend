/** Duración del periodo gratuito cuando el Administrador no fijó una fecha de fin (mismo valor que el backend). */
export const DIAS_PERIODO_PRUEBA = 15;

type ProveedorTrialLike = {
    fechaInicioTrial?: string | Date | null;
    fechaFinTrial?: string | Date | null;
    fechaFinTrialEfectiva?: string | Date | null;
};

/**
 * Fin efectivo del periodo gratuito: el que calcula el backend, o la fecha fijada por el
 * Administrador, o (histórico) el inicio + 15 días al final del día.
 */
export function resolverFechaFinTrial(proveedor: ProveedorTrialLike | null | undefined): Date | null {
    if (!proveedor) return null;
    const explicita = proveedor.fechaFinTrialEfectiva ?? proveedor.fechaFinTrial;
    if (explicita) return new Date(explicita);
    if (!proveedor.fechaInicioTrial) return null;
    const fin = new Date(proveedor.fechaInicioTrial);
    fin.setDate(fin.getDate() + DIAS_PERIODO_PRUEBA);
    fin.setHours(23, 59, 59);
    return fin;
}

/** Fecha `yyyy-mm-dd` (input date) → ISO al final de ese día en hora local. */
export function finDeDiaIso(fechaYmd: string): string {
    const [y, m, d] = fechaYmd.split("-").map(Number);
    return new Date(y, m - 1, d, 23, 59, 59).toISOString();
}

/** Date → `yyyy-mm-dd` en hora local (para input date). */
export function aFechaYmd(fecha: Date | null): string {
    if (!fecha || Number.isNaN(fecha.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
}
