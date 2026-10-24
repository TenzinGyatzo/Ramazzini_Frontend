/**
 * Normalización de campos de formularios administrativos (usuarios, empresas, centros, proveedor).
 * Misma lógica que `backend/src/utils/normalizar-campo.util.ts`. Se aplica al salir del campo y al
 * enviar (plugin de FormKit `normalizacionPlugin`), nunca mientras se escribe: así se pueden teclear
 * espacios entre palabras.
 */
export type TipoNormalizacion =
  | 'texto'
  | 'nombreDeCarpeta'
  | 'textoLargo'
  | 'correo'
  | 'rfc'
  | 'codigoPostal'
  | 'telefono'
  | 'sitioWeb';

/** Texto de una línea: sin espacios al inicio ni al final y uno solo entre palabras. */
export function normalizarTexto(valor: string): string {
  return valor.replace(/\s+/g, ' ').trim();
}

/**
 * Nombre de empresa o de centro: solo los extremos. Con él se nombran las carpetas de expedientes
 * (que ya recortan los extremos); juntar espacios internos movería los documentos nuevos de carpeta.
 */
export function normalizarNombreDeCarpeta(valor: string): string {
  return valor.trim();
}

/** Texto largo: solo se recortan los extremos; se conservan saltos de línea y espacios internos. */
export function normalizarTextoLargo(valor: string): string {
  return valor.trim();
}

/** Correo: sin ningún espacio y en minúsculas. */
export function normalizarCorreo(valor: string): string {
  return valor.replace(/\s+/g, '').toLowerCase();
}

/** RFC o registro patronal: recortado, en mayúsculas y con un solo espacio entre partes. */
export function normalizarRfc(valor: string): string {
  return normalizarTexto(valor).toUpperCase();
}

/** Código postal: sin espacios. */
export function normalizarCodigoPostal(valor: string): string {
  return valor.replace(/\s+/g, '');
}

/** Teléfono: solo dígitos, conservando un «+» inicial. */
export function normalizarTelefono(valor: string): string {
  const limpio = valor.trim();
  const digitos = limpio.replace(/\D/g, '');
  return limpio.startsWith('+') && digitos ? `+${digitos}` : digitos;
}

/** Sitio web: sin espacios, sin «http(s)://» y sin la barra final. */
export function normalizarSitioWeb(valor: string): string {
  return valor
    .replace(/\s+/g, '')
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
}

const NORMALIZADORES: Record<TipoNormalizacion, (valor: string) => string> = {
  texto: normalizarTexto,
  nombreDeCarpeta: normalizarNombreDeCarpeta,
  textoLargo: normalizarTextoLargo,
  correo: normalizarCorreo,
  rfc: normalizarRfc,
  codigoPostal: normalizarCodigoPostal,
  telefono: normalizarTelefono,
  sitioWeb: normalizarSitioWeb,
};

export function esTipoNormalizacion(tipo: unknown): tipo is TipoNormalizacion {
  return typeof tipo === 'string' && tipo in NORMALIZADORES;
}

export function normalizarCampo<T>(tipo: TipoNormalizacion, valor: T): T | string {
  return typeof valor === 'string' ? NORMALIZADORES[tipo](valor) : valor;
}

/**
 * Lo que se puede limpiar mientras se escribe sin estorbar: nunca quita el espacio final de un texto
 * (sería imposible separar palabras) ni el «https://» a medio teclear. Lo demás se hace al salir.
 */
export function normalizarAlEscribir<T>(tipo: TipoNormalizacion, valor: T): T | string {
  if (typeof valor !== 'string') return valor;
  switch (tipo) {
    case 'texto':
      return valor.replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
    case 'nombreDeCarpeta':
      return valor.replace(/^\s+/, '');
    case 'rfc':
      return valor.replace(/^\s+/, '').replace(/\s{2,}/g, ' ').toUpperCase();
    case 'correo':
      return normalizarCorreo(valor);
    case 'codigoPostal':
    case 'sitioWeb':
      return valor.replace(/\s+/g, '');
    case 'telefono':
      return valor.replace(/(?!^\+)[^\d]/g, '');
    default:
      return valor;
  }
}

type NodoFormKit = {
  props: Record<string, any>;
  value: unknown;
  addProps: (props: string[]) => void;
  on: (evento: string, fn: (...args: any[]) => void) => unknown;
  input: (valor: unknown, async?: boolean) => unknown;
};

/**
 * Plugin de FormKit. Un campo con `normalizar="correo"` (o cualquier `TipoNormalizacion`) se limpia
 * mientras se escribe en lo que no estorba y por completo al salir de él. Al enviar con Enter sin
 * salir, lo que pudiera quedar (un espacio final, el «https://») lo aceptan las reglas, que validan
 * el valor normalizado, y lo limpia el servidor. Los campos sin `normalizar` no cambian.
 */
export function normalizacionPlugin(node: NodoFormKit) {
  node.addProps(['normalizar']);
  const tipo = () =>
    esTipoNormalizacion(node.props.normalizar) ? node.props.normalizar : null;

  node.on('dom-input-event', (evento: { payload?: Event }) => {
    const t = tipo();
    const escrito = (evento?.payload?.target as HTMLInputElement | null)?.value;
    if (!t || typeof escrito !== 'string') return;
    const limpio = normalizarAlEscribir(t, escrito);
    if (limpio !== escrito) node.input(limpio, false);
  });

  node.on('created', () => {
    if (!tipo()) return;
    // FormKit llama a `attrs.onBlur` desde su propio manejador de blur
    const attrs = node.props.attrs ?? {};
    const onBlurOriginal = attrs.onBlur;
    node.props.attrs = {
      ...attrs,
      onBlur: (e: Event) => {
        const t = tipo();
        // Lo que muestra el campo: FormKit aplica lo escrito con un pequeño retraso, y quien pega y
        // sale enseguida dejaría el valor anterior en el nodo
        const campo = (e?.target as HTMLInputElement | null)?.value;
        const actual = typeof campo === 'string' ? campo : node.value;
        if (t && typeof actual === 'string') {
          const limpio = normalizarCampo(t, actual);
          if (limpio !== node.value) node.input(limpio, false);
        }
        if (typeof onBlurOriginal === 'function') onBlurOriginal(e);
      },
    };
  });
}
