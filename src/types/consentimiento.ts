export enum ConsentimientoMetodo {
  VERBAL = 'VERBAL',
  AUTOGRAFO = 'AUTOGRAFO',
}

export interface ConsentimientoStatus {
  required: boolean;
  accepted: boolean;
  currentVersion?: string;
  consentText?: string;
  declaracionProfesional?: string;
  consent?: {
    acceptedAt: Date | string;
    acceptedByUserId: string;
    metodo: string;
    version: string;
  };
}

export interface ConsentimientoCreated {
  _id: string;
  proveedorSaludId: string;
  trabajadorId: string;
  tipoConsentimiento: string;
  version: string;
  acceptedAt: Date | string;
  acceptedByUserId: string;
  metodo: string;
  createdAt: Date | string;
}

export interface CreateConsentimientoDto {
  trabajadorId: string;
  metodo: ConsentimientoMetodo;
}

export type ConsentState = 'idle' | 'checking' | 'submitting' | 'error';

export interface ConsentError {
  code?: string;
  message: string;
}
