/**
 * «Subir un nivel» con Alt + ⌫ (composables/useSubirNivel): la vista padre en la jerarquía
 * documento → expediente → trabajadores → centros → empresas → Inicio, no la anterior del
 * historial (para esa ya existen Atrás y Alt + ←).
 */
export interface DestinoPadre {
  destino: { name: string; params?: Record<string, string> };
  /** Tarjeta que recibe el foco al llegar (empresa o centro de trabajo). */
  enfocar?: string;
  /** Trabajador que la tabla debe marcar al llegar: `[centro, trabajador]`. */
  recordarTrabajador?: [string, string];
}

interface RutaActual {
  name?: unknown;
  params: Record<string, unknown>;
}

const texto = (valor: unknown): string => (Array.isArray(valor) ? String(valor[0] ?? '') : String(valor ?? ''));

/** null si la vista no tiene padre (Inicio, configuración, consola…): el atajo no hace nada. */
export function vistaPadre(ruta: RutaActual): DestinoPadre | null {
  const idEmpresa = texto(ruta.params.idEmpresa);
  const idCentro = texto(ruta.params.idCentroTrabajo);
  const idTrabajador = texto(ruta.params.idTrabajador);
  const centros = { name: 'centros-trabajo', params: { idEmpresa } };

  switch (ruta.name) {
    case 'crear-documento':
      return {
        destino: { name: 'expediente-medico', params: { idEmpresa, idCentroTrabajo: idCentro, idTrabajador } },
      };
    case 'expediente-medico':
      return {
        destino: { name: 'trabajadores', params: { idEmpresa, idCentroTrabajo: idCentro } },
        recordarTrabajador: [idCentro, idTrabajador],
      };
    case 'trabajadores':
    case 'inventario':
      return { destino: centros, enfocar: idCentro };
    case 'incapacidades-informe':
    case 'incapacidades-prima':
      return { destino: { name: 'incapacidades-empresa', params: { idEmpresa } } };
    case 'incapacidades-empresa':
    case 'dashboard-empresa':
    case 'informes-salud-ocupacional':
      return { destino: centros };
    case 'centros-trabajo':
      return { destino: { name: 'empresas' }, enfocar: idEmpresa };
    case 'empresas':
      return { destino: { name: 'inicio' } };
    default:
      return null;
  }
}

/** Alt + ⌫ (en Mac, ⌥ + ⌫), sin Ctrl, Cmd ni Shift. */
export function esAtajoSubirNivel(evento: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>): boolean {
  return evento.key === 'Backspace' && evento.altKey && !evento.ctrlKey && !evento.metaKey && !evento.shiftKey;
}

/** Mac usa ⌥ (Opción) en lugar de Alt. */
export function esMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');
}
