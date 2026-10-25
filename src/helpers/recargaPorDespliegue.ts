/**
 * Después de un despliegue, los archivos viejos de /assets/ se borran del servidor. Quien tenía la
 * aplicación abierta y entra a una pantalla que aún no había cargado pide un archivo que ya no
 * existe y la pantalla no abre («Failed to fetch dynamically imported module»).
 * Vite avisa con el evento `vite:preloadError`: se recarga la página una vez para tomar el
 * index.html nuevo, que apunta a los archivos vigentes.
 */
const CLAVE = 'ramazzini:recarga-por-despliegue';
/** Si el archivo sigue faltando tras recargar, no se vuelve a intentar en este tiempo (sin ciclos). */
export const ESPERA_ENTRE_RECARGAS_MS = 60_000;

export function debeRecargar(ahora: number, ultimaRecarga: number | null): boolean {
  return ultimaRecarga == null || ahora - ultimaRecarga >= ESPERA_ENTRE_RECARGAS_MS;
}

function leerUltimaRecarga(almacen: Storage): number | null {
  try {
    const valor = Number(almacen.getItem(CLAVE));
    return Number.isFinite(valor) && valor > 0 ? valor : null;
  } catch {
    return null;
  }
}

function anotarRecarga(almacen: Storage, ahora: number) {
  try {
    almacen.setItem(CLAVE, String(ahora));
  } catch {
    // Sin almacenamiento de sesión: se recarga igual
  }
}

export function instalarRecargaPorDespliegue(
  ventana: Window = window,
  almacen: Storage = ventana.sessionStorage,
  ahora: () => number = Date.now,
): void {
  ventana.addEventListener('vite:preloadError', (evento) => {
    const momento = ahora();
    // Ya se recargó hace poco: el archivo de verdad falta, se deja ver el error
    if (!debeRecargar(momento, leerUltimaRecarga(almacen))) return;
    evento.preventDefault();
    anotarRecarga(almacen, momento);
    ventana.location.reload();
  });
}
