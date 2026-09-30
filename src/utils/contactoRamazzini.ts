/** Contacto comercial de Ramazzini para clientes cuyo plan se gestiona directamente (sin pago en línea). */
export const WHATSAPP_RAMAZZINI = "526681702850";
export const WHATSAPP_RAMAZZINI_VISIBLE = "668 170 2850";
export const CORREO_RAMAZZINI = "soporte@ramazzini.app";

const MENSAJE_BASE = "Hola, quiero gestionar el plan de Ramazzini";

function mensaje(nombreProveedor?: string | null): string {
    return nombreProveedor ? `${MENSAJE_BASE} de ${nombreProveedor}.` : `${MENSAJE_BASE}.`;
}

export function enlaceWhatsApp(nombreProveedor?: string | null): string {
    return `https://wa.me/${WHATSAPP_RAMAZZINI}?text=${encodeURIComponent(mensaje(nombreProveedor))}`;
}

export function enlaceCorreo(nombreProveedor?: string | null): string {
    const asunto = nombreProveedor ? `Plan de Ramazzini — ${nombreProveedor}` : "Plan de Ramazzini";
    return `mailto:${CORREO_RAMAZZINI}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje(nombreProveedor))}`;
}

export function abrirWhatsApp(nombreProveedor?: string | null): void {
    window.open(enlaceWhatsApp(nombreProveedor), "_blank", "noopener");
}
