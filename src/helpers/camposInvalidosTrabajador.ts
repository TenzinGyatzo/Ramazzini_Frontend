/**
 * Resumen de campos con error en el formulario de trabajador (ModalTrabajadores):
 * nombres legibles en el orden en que se ven y el elemento al que hay que llevar
 * al usuario (los campos geográficos NOM-024 se validan en entradas ocultas).
 */

export interface CampoInvalido {
  name: string;
  etiqueta: string;
}

/** Lo mínimo que se usa de un nodo de FormKit. */
interface NodoFormulario {
  type?: string;
  name?: string;
  context?: { state?: { valid?: boolean } } | null;
  walk: (cb: (nodo: NodoFormulario) => void) => void;
}

export const ETIQUETAS_CAMPOS_TRABAJADOR: Record<string, string> = {
  curp: 'CURP',
  primerApellido: 'Primer apellido',
  segundoApellido: 'Segundo apellido',
  nombre: 'Nombre(s)',
  sexo: 'Sexo',
  sexoCURP: 'Sexo CURP',
  fechaNacimiento: 'Fecha de nacimiento',
  escolaridad: 'Escolaridad',
  estadoCivil: 'Estado civil',
  puesto: 'Puesto',
  fechaIngreso: 'Fecha de ingreso',
  numeroEmpleado: 'Número de empleado',
  nss: 'NSS',
  telefono: 'Teléfono',
  contactoEmergenciaNombre: 'Nombre del contacto de emergencia',
  contactoEmergenciaTelefono: 'Teléfono del contacto de emergencia',
  entidadNacimiento: 'Entidad de nacimiento',
  paisNacimiento: 'País de nacimiento',
  entidadResidencia: 'Entidad de residencia',
  municipioResidencia: 'Municipio de residencia',
  localidadResidencia: 'Localidad de residencia',
  paisResidencia: 'País de residencia',
};

/** Orden en pantalla (las entradas ocultas NOM-024 se declaran en otro orden). */
const ORDEN_CAMPOS = Object.keys(ETIQUETAS_CAMPOS_TRABAJADOR);

/** Campos ocultos → bloque visible (atributo data-campo) donde se capturan. */
export const ANCLA_CAMPO_TRABAJADOR: Record<string, string> = {
  entidadNacimiento: 'entidadNacimiento',
  paisNacimiento: 'paisNacimiento',
  paisResidencia: 'residencia',
  entidadResidencia: 'residencia',
  municipioResidencia: 'residencia',
  localidadResidencia: 'residencia',
};

export function recolectarCamposInvalidos(
  form: NodoFormulario | null | undefined,
  etiquetas: Record<string, string> = ETIQUETAS_CAMPOS_TRABAJADOR,
): CampoInvalido[] {
  if (!form) return [];
  const campos: CampoInvalido[] = [];
  const vistos = new Set<string>();
  form.walk((nodo) => {
    if (nodo.type !== 'input' || !nodo.name || vistos.has(nodo.name)) return;
    if (nodo.context?.state?.valid !== false) return;
    vistos.add(nodo.name);
    campos.push({ name: nodo.name, etiqueta: etiquetas[nodo.name] ?? nodo.name });
  });
  const posicion = (name: string) => {
    const i = ORDEN_CAMPOS.indexOf(name);
    return i === -1 ? ORDEN_CAMPOS.length : i;
  };
  // sort estable: los campos sin posición conocida conservan su orden al final
  return campos.sort((a, b) => posicion(a.name) - posicion(b.name));
}
