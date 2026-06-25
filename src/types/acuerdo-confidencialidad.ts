export interface AcuerdoConfidencialidadStatus {
  required: boolean;
  accepted: boolean;
  currentVersion?: string;
  agreementText?: string;
  footerConsent?: string;
}

export interface AcuerdoConfidencialidadAcceptResponse {
  accepted: boolean;
  versionAco: string;
  fechaHoraAceptacion: string;
}
