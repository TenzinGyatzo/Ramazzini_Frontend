/**
 * Regreso a la pantalla de origen después de iniciar sesión.
 * El login recibe `?redirect=<ruta>`; solo se acepta una ruta interna de Ramazzini
 * (evita que un enlace de login mande a otro sitio al entrar).
 */

const RUTAS_SIN_SESION = ['/login', '/auth'];
const LONGITUD_MAXIMA = 2000;

/** Motivo que el login muestra cuando la sesión venció a media tarea. */
export const MOTIVO_SESION_VENCIDA = 'sesion';

export function rutaDeRegresoSegura(valor: unknown): string | null {
  const ruta = Array.isArray(valor) ? valor[0] : valor;
  if (typeof ruta !== 'string' || !ruta || ruta.length > LONGITUD_MAXIMA) return null;
  // Interna: empieza con una sola «/», sin «//» ni «/\» (el navegador los trata como otro dominio)
  if (!ruta.startsWith('/') || ruta.startsWith('//') || ruta.startsWith('/\\')) return null;
  if (/[\u0000-\u001f]/.test(ruta)) return null;
  const camino = ruta.split(/[?#]/)[0];
  if (camino === '/') return null;
  if (RUTAS_SIN_SESION.some((p) => camino === p || camino.startsWith(`${p}/`))) return null;
  return ruta;
}

/** Dirección del login que, al entrar, regresa a `rutaActual`. */
export function urlLoginConRegreso(rutaActual: string, opciones: { sesionVencida?: boolean } = {}): string {
  const parametros = new URLSearchParams();
  const regreso = rutaDeRegresoSegura(rutaActual);
  if (regreso) parametros.set('redirect', regreso);
  if (opciones.sesionVencida) parametros.set('motivo', MOTIVO_SESION_VENCIDA);
  const consulta = parametros.toString();
  return consulta ? `/login?${consulta}` : '/login';
}
