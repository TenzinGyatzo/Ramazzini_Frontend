/**
 * Título de la pestaña del navegador: lo que distingue la vista primero (el navegador corta el
 * final cuando hay muchas pestañas) y «Ramazzini» al final.
 *
 * Privacidad: el título queda en el historial del navegador (y en la cuenta de Google si se
 * sincroniza), así que nunca lleva el nombre de un trabajador, solo sus iniciales. Tampoco se
 * envía a la analítica (`sanitizePosthogEvent`).
 */
export const MARCA = 'Ramazzini';

export function formarTitulo(partes: Array<string | null | undefined | false>): string {
  const visibles = partes.map((parte) => (typeof parte === 'string' ? parte.trim() : '')).filter(Boolean);
  return visibles.length ? `${visibles.join(' · ')} — ${MARCA}` : MARCA;
}

/** Palabras que no aportan inicial: «DEL RÍO», «DE LOS ÁNGELES». */
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'das', 'do', 'dos', 'van', 'von']);

/**
 * «PÉREZ» «GARCÍA» «JUAN CARLOS» → «P.G.J.C.»: apellidos y luego nombre(s), como se muestra el
 * nombre en Ramazzini; sin partículas ni acentos.
 */
export function inicialesTrabajador(
  trabajador: { nombre?: unknown; primerApellido?: unknown; segundoApellido?: unknown } | null | undefined,
): string {
  if (!trabajador) return '';
  const palabras = [trabajador.primerApellido, trabajador.segundoApellido, trabajador.nombre]
    .map((parte) => String(parte ?? ''))
    .join(' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[\s\-]+/)
    .filter((palabra) => palabra && !PARTICULAS.has(palabra.toLowerCase()));
  const letras = palabras.map((palabra) => palabra.charAt(0).toUpperCase()).filter((letra) => /[A-ZÑ]/.test(letra));
  return letras.length ? `${letras.join('.')}.` : '';
}

/** Título por sección para las vistas que no ponen uno propio (por nombre de ruta). */
export const TITULOS_POR_RUTA: Record<string, string> = {
  login: 'Iniciar sesión',
  onboarding: 'Registro',
  'confirm-account': 'Confirmar cuenta',
  'forgot-password': 'Recuperar contraseña',
  'new-password': 'Nueva contraseña',
  inicio: 'Inicio',
  'add-user': 'Registrar usuario',
  'remove-users': 'Usuarios',
  'manage-permissions': 'Permisos',
  'manage-assignments': 'Asignaciones',
  'admin-catalogos': 'Catálogos',
  'user-productivity': 'Productividad',
  'perfil-proveedor': 'Perfil del proveedor',
  'medico-firmante': 'Médico firmante',
  'enfermera-firmante': 'Enfermera firmante',
  'tecnico-evaluador-firmante': 'Técnico evaluador',
  'dashboard-empresa': 'Tablero de salud',
  'incapacidades-empresa': 'Incapacidades',
  'incapacidades-informe': 'Informe de incapacidades',
  'incapacidades-prima': 'Prima de riesgo',
  'informes-salud-ocupacional': 'Informes de salud ocupacional',
  empresas: 'Empresas',
  'centros-trabajo': 'Centros de trabajo',
  inventario: 'Inventario',
  'inventario-catalogo': 'Catálogo de inventario',
  trabajadores: 'Trabajadores',
  'expediente-medico': 'Expediente',
  'crear-documento': 'Documento',
  documento: 'Documento',
  subscription: 'Suscripción',
  'suscripcion-activa': 'Suscripción',
  'subscription-success': 'Suscripción',
  'panel-administrador': 'Panel de administrador',
  'registros-administrador': 'Registros',
  'exportacion-giis': 'Exportación GIIS',
  auditoria: 'Auditoría',
};

export function tituloDeRuta(nombre: unknown): string {
  return formarTitulo([TITULOS_POR_RUTA[String(nombre ?? '')]]);
}
