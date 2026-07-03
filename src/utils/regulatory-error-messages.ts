/**
 * Regulatory Error Messages
 * 
 * Mapeo de códigos de error regulatorios a mensajes UX según el régimen.
 * Estos mensajes se adaptan según si el proveedor es SIN_REGIMEN o SIRES_NOM024.
 */

import type { RegulatoryErrorDetails } from '@/types/regulatory-error';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';

/**
 * Tipo de régimen regulatorio
 */
export type RegulatoryRegime = 'SIRES_NOM024' | 'SIN_REGIMEN';

/**
 * Mensaje de error mapeado para UX
 */
export interface RegulatoryErrorMessage {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  suggestedAction?: string;
}

/**
 * Mapeo de códigos de error a mensajes base
 */
const ERROR_CODE_MESSAGES: Record<
  string,
  Record<RegulatoryRegime, Omit<RegulatoryErrorMessage, 'suggestedAction'>>
> = {
  REGIMEN_FEATURE_DISABLED: {
    SIN_REGIMEN: {
      title: 'Función no disponible',
      message: 'Esta función no está habilitada en tu configuración actual.',
      type: 'warning',
    },
    SIRES_NOM024: {
      title: 'Función no disponible',
      message: 'Esta función no está habilitada para tu régimen regulatorio.',
      type: 'warning',
    },
  },

  REGIMEN_DOCUMENT_IMMUTABLE: {
    SIN_REGIMEN: {
      title: 'Documento no modificable',
      message: 'No se puede modificar este documento en su estado actual.',
      type: 'warning',
    },
    SIRES_NOM024: {
      title: 'Documento inmutable',
      message: 'Por inalterabilidad según la política regulatoria SIRES (NOM-024), este documento no puede modificarse en su estado actual.',
      type: 'warning',
    },
  },

  REGIMEN_FIELD_REQUIRED: {
    SIN_REGIMEN: {
      title: 'Campo requerido',
      message: 'Este campo es obligatorio.',
      type: 'error',
    },
    SIRES_NOM024: {
      title: 'Campo requerido',
      message: 'Este campo es obligatorio según la normativa SIRES (NOM-024).',
      type: 'error',
    },
  },

  CONSENT_NOT_ENABLED: {
    SIN_REGIMEN: {
      title: 'Consentimiento no disponible',
      message:
        'El consentimiento para tratamiento de información no está disponible para tu régimen regulatorio.',
      type: 'error',
    },
    SIRES_NOM024: {
      title: 'Consentimiento no habilitado',
      message:
        'El consentimiento para tratamiento de información no está habilitado para este proveedor.',
      type: 'error',
    },
  },

  CONSENT_ALREADY_EXISTS: {
    SIN_REGIMEN: {
      title: 'Consentimiento ya registrado',
      message:
        'Ya existe un consentimiento registrado para este trabajador en la versión vigente.',
      type: 'warning',
    },
    SIRES_NOM024: {
      title: 'Consentimiento ya registrado',
      message:
        'Ya existe un consentimiento registrado para este trabajador en la versión vigente.',
      type: 'warning',
    },
  },

  CONSENT_REQUIRED: {
    SIN_REGIMEN: {
      title: 'Consentimiento requerido',
      message:
        'Se requiere consentimiento para tratamiento de información para realizar esta acción.',
      type: 'error',
    },
    SIRES_NOM024: {
      title: 'Consentimiento requerido',
      message:
        'Se requiere consentimiento para tratamiento de información en SIRES (versión vigente) para crear este documento.',
      type: 'error',
    },
  },

  CONFIDENTIALITY_AGREEMENT_REQUIRED: {
    SIN_REGIMEN: {
      title: 'Acuerdo requerido',
      message: 'Debe aceptar el Acuerdo de Confidencialidad y Uso de la Información para continuar.',
      type: 'error',
    },
    SIRES_NOM024: {
      title: 'Acuerdo requerido',
      message: 'Debe aceptar el Acuerdo de Confidencialidad y Uso de la Información para continuar.',
      type: 'error',
    },
  },
};

/**
 * Nombres de display para features
 */
const FEATURE_NAMES: Record<string, string> = {
  giisExport: 'Exportación GIIS',
  notaAclaratoria: 'Notas aclaratorias',
  sessionTimeout: 'Timeout de sesión',
  documentImmutability: 'Inmutabilidad de documentos',
};

/**
 * Nombres de display para campos
 */
const FIELD_NAMES: Record<string, string> = {
  curp: 'CURP',
  cie10Principal: 'CIE-10 principal',
  entidadNacimiento: 'Entidad de nacimiento',
  entidadResidencia: 'Entidad de residencia',
  municipioResidencia: 'Municipio de residencia',
  localidadResidencia: 'Localidad de residencia',
  paisNacimiento: 'País de nacimiento',
};

/**
 * Nombres de display para tipos de documento
 */
const DOCUMENT_TYPE_NAMES: Record<string, string> = {
  notaMedica: 'nota médica',
  historiaClinica: 'historia clínica',
  deteccion: 'detección',
  aptitud: 'aptitud para el puesto',
  certificado: 'certificado médico',
};

/**
 * Estados de documento
 */
const DOCUMENT_STATE_NAMES: Record<string, string> = {
  FINALIZADO: 'finalizado',
  ANULADO: 'anulado',
};

/**
 * Mapea un código de error regulatorio a un mensaje UX según el régimen
 * 
 * @param errorCode - Código de error regulatorio
 * @param regime - Régimen regulatorio del proveedor
 * @param details - Detalles opcionales del error (feature, fieldName, documentState, documentType)
 * @returns Mensaje de error mapeado para UX
 */
export function mapRegulatoryErrorMessage(
  errorCode: string,
  regime: RegulatoryRegime,
  details?: RegulatoryErrorDetails,
): RegulatoryErrorMessage {
  // Obtener mensaje base según código y régimen
  const baseMessage = ERROR_CODE_MESSAGES[errorCode]?.[regime];
  
  if (!baseMessage) {
    // Fallback para códigos desconocidos
    return {
      title: 'Error regulatorio',
      message: 'Ha ocurrido un error relacionado con la política regulatoria.',
      type: 'error',
    };
  }

  // Personalizar mensaje según detalles
  let message = baseMessage.message;
  let suggestedAction: string | undefined;

  if (errorCode === 'REGIMEN_FEATURE_DISABLED' && details?.feature) {
    const featureName = FEATURE_NAMES[details.feature] || details.feature;
    message = message.replace(
      'Esta función',
      `La función "${featureName}"`,
    );
    
    if (regime === 'SIN_REGIMEN') {
      suggestedAction = 'Si necesitas esta función, contacta al administrador para habilitarla.';
    } else {
      suggestedAction = 'Esta función solo está disponible para proveedores con régimen SIRES (NOM-024).';
    }
  }

  if (errorCode === 'REGIMEN_DOCUMENT_IMMUTABLE') {
    if (details?.documentType && details?.documentState) {
      const docType = DOCUMENT_TYPE_NAMES[details.documentType] || details.documentType;
      const docState = DOCUMENT_STATE_NAMES[details.documentState] || details.documentState;
      message = message.replace(
        'este documento',
        `este ${docType}`,
      );
      
      if (regime === 'SIRES_NOM024') {
        message = message.replace(
          'en su estado actual',
          `cuando está ${docState}`,
        );
        suggestedAction = 'Los documentos finalizados o anulados son inmutables según la política regulatoria SIRES (NOM-024).';
      } else {
        message = message.replace(
          'en su estado actual',
          `cuando está ${docState}`,
        );
      }
    }
  }

  if (errorCode === 'REGIMEN_FIELD_REQUIRED' && details?.fieldName) {
    const fieldName = FIELD_NAMES[details.fieldName] || details.fieldName;
    message = message.replace(
      'Este campo',
      `El campo "${fieldName}"`,
    );
    
    suggestedAction = 'Por favor, completa este campo para continuar.';
  }

  return {
    ...baseMessage,
    message,
    ...(suggestedAction && { suggestedAction }),
  };
}

/**
 * Obtiene el régimen regulatorio actual desde el store en memoria.
 * Útil para usar en interceptores donde los composables no están disponibles.
 * 
 * @returns Régimen regulatorio actual ('SIRES_NOM024' | 'SIN_REGIMEN')
 */
export function getCurrentRegime(): RegulatoryRegime {
  try {
    const proveedorSaludStore = useProveedorSaludStore();
    const proveedorSalud = proveedorSaludStore.proveedorSalud;
    const regime =
      proveedorSalud?.regulatoryPolicy?.regime ||
      proveedorSalud?.regimenRegulatorio;

    if (regime === 'SIRES_NOM024') {
      return 'SIRES_NOM024';
    }

    // Fallback a SIN_REGIMEN si no se puede determinar
    return 'SIN_REGIMEN';
  } catch (error) {
    // Fallback seguro si Pinia no está inicializado o el proveedor aún no está cargado.
    return 'SIN_REGIMEN';
  }
}

/**
 * Función standalone para mapear errores regulatorios
 * Útil para usar en interceptores donde los composables no están disponibles
 * 
 * @param errorCode - Código de error regulatorio
 * @param details - Detalles opcionales del error
 * @returns Mensaje de error mapeado para UX
 */
export function mapRegulatoryErrorStandalone(
  errorCode: string,
  details?: RegulatoryErrorDetails,
): RegulatoryErrorMessage {
  const regime = getCurrentRegime();
  return mapRegulatoryErrorMessage(errorCode, regime, details);
}
