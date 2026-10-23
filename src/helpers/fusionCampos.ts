/**
 * Datos que se eligen al fusionar dos trabajadores (docs/fusion-trabajadores-especificacion.md, 4.4).
 * La vista previa compara `destino` contra `fuente` en el orden en que se pidió; aquí se orientan
 * los campos al registro que el usuario decidió conservar y se arma lo que se envía.
 */
import type {
  CampoFusionDiferente,
  MotivoFusion,
  OrigenCampoFusion,
} from '@/interfaces/trabajador.interface';

export const MOTIVOS_FUSION: { valor: MotivoFusion; etiqueta: string }[] = [
  { valor: 'CAMBIO_NOMBRE', etiqueta: 'Cambio de nombre' },
  { valor: 'CAMBIO_SEXO', etiqueta: 'Cambio de sexo' },
  { valor: 'CAMBIO_CURP', etiqueta: 'Cambio de CURP' },
  { valor: 'REGISTRO_DUPLICADO', etiqueta: 'Registro duplicado por error' },
  { valor: 'OTRO', etiqueta: 'Otro' },
];

export const LIMITE_TEXTO_FUSION = 500;

type Valores = Record<string, string | number | null>;

const vacio = (valores: Valores) => Object.values(valores).every((v) => v === null);

/**
 * Campos con `valoresDestino` = registro que se conserva. Si el usuario conservó el otro registro
 * de la vista previa, se invierten los valores y se recalcula el valor por defecto con la misma
 * regla del servidor: el del conservado, salvo que esté vacío y el otro no.
 */
export function orientarCampos(
  campos: CampoFusionDiferente[],
  conservaDestinoDeLaVistaPrevia: boolean,
): CampoFusionDiferente[] {
  if (conservaDestinoDeLaVistaPrevia) return campos;
  return campos.map((campo) => ({
    ...campo,
    valoresDestino: campo.valoresFuente,
    valoresFuente: campo.valoresDestino,
    porDefecto:
      vacio(campo.valoresFuente) && !vacio(campo.valoresDestino) ? 'fuente' : 'destino',
  }));
}

/**
 * Origen de cada campo para el envío. `elecciones` guarda, por campo, el id del registro del que
 * sale el valor: así sobrevive a que el usuario cambie cuál se conserva. Se envían todos los campos
 * que difieren, también los que quedan por defecto, para que el servidor no tenga que adivinar.
 */
export function camposElegidosParaEnvio(
  campos: CampoFusionDiferente[],
  elecciones: Record<string, string>,
  conservadoId: string,
): Record<string, OrigenCampoFusion> {
  return Object.fromEntries(
    campos.map((campo) => {
      const elegido = elecciones[campo.clave];
      const origen: OrigenCampoFusion = elegido
        ? elegido === conservadoId
          ? 'destino'
          : 'fuente'
        : campo.porDefecto;
      return [campo.clave, origen];
    }),
  );
}

function fechaComoDia(valor: string | number | null): string | null {
  if (valor === null) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(valor);
}

/** Texto para mostrar los valores de un campo; null si el registro no tiene el dato. */
export function textoValorCampo(
  clave: string,
  valores: Valores,
  centrosNombre: Record<string, string> = {},
): string | null {
  if (vacio(valores)) return null;
  switch (clave) {
    case 'sexo':
      return valores.sexo === null ? null : String(valores.sexo);
    case 'fechaNacimiento':
    case 'fechaIngreso':
      return fechaComoDia(valores[clave]);
    case 'idCentroTrabajo': {
      const id = valores.idCentroTrabajo;
      return id === null ? null : centrosNombre[String(id)] || String(id);
    }
    case 'contactoEmergencia':
      return Object.values(valores)
        .filter((v) => v !== null)
        .join(' · ');
    default:
      return Object.values(valores)
        .filter((v) => v !== null)
        .join(', ');
  }
}

export interface CambioEnConservado {
  clave: string;
  etiqueta: string;
  anterior: string | null;
  nuevo: string | null;
}

/** Datos del registro que se conserva que toman el valor del otro registro. */
export function cambiosEnConservado(
  campos: CampoFusionDiferente[],
  elegidos: Record<string, OrigenCampoFusion>,
  centrosNombre: Record<string, string> = {},
): CambioEnConservado[] {
  return campos
    .filter((campo) => elegidos[campo.clave] === 'fuente')
    .map((campo) => ({
      clave: campo.clave,
      etiqueta: campo.etiqueta,
      anterior: textoValorCampo(campo.clave, campo.valoresDestino, centrosNombre),
      nuevo: textoValorCampo(campo.clave, campo.valoresFuente, centrosNombre),
    }));
}

/** Mensaje si el motivo no está completo; null si se puede fusionar. */
export function errorMotivoFusion(
  motivos: MotivoFusion[],
  motivoOtro: string,
  comentario: string,
): string | null {
  if (motivos.length === 0) return 'Elige al menos un motivo.';
  if (motivos.includes('OTRO') && !motivoOtro.trim()) {
    return 'Escribe el motivo en «Otro».';
  }
  if (motivoOtro.length > LIMITE_TEXTO_FUSION || comentario.length > LIMITE_TEXTO_FUSION) {
    return `El texto admite hasta ${LIMITE_TEXTO_FUSION} caracteres.`;
  }
  return null;
}
