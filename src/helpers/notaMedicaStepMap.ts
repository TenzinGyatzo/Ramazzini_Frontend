/**
 * Índices 1-based del stepper de nota médica según régimen SIRES y sexo del trabajador.
 */

export interface NotaMedicaStepMap {
  genero: number | null;
  antecedentes: number;
  exploracion: number;
  signos: number;
  somatometria: number | null;
  glucemia: number | null;
  embarazo: number | null;
  diagnostico: number;
  comorbilidad2: number;
  comorbilidad3: number;
  tratamiento: number;
  recomendaciones: number;
  observaciones: number;
}

export function getNotaMedicaStepMap(
  showSires: boolean,
  esMujer: boolean,
): NotaMedicaStepMap {
  if (!showSires) {
    return {
      genero: null,
      antecedentes: 3,
      exploracion: 4,
      signos: 5,
      somatometria: null,
      glucemia: null,
      embarazo: null,
      diagnostico: 6,
      comorbilidad2: 7,
      comorbilidad3: 8,
      tratamiento: 9,
      recomendaciones: 10,
      observaciones: 11,
    };
  }

  if (esMujer) {
    return {
      genero: 3,
      antecedentes: 4,
      exploracion: 5,
      signos: 6,
      somatometria: 7,
      glucemia: 8,
      embarazo: 9,
      diagnostico: 10,
      comorbilidad2: 11,
      comorbilidad3: 12,
      tratamiento: 13,
      recomendaciones: 14,
      observaciones: 15,
    };
  }

  return {
    genero: 3,
    antecedentes: 4,
    exploracion: 5,
    signos: 6,
    somatometria: 7,
    glucemia: 8,
    embarazo: null,
    diagnostico: 9,
    comorbilidad2: 10,
    comorbilidad3: 11,
    tratamiento: 12,
    recomendaciones: 13,
    observaciones: 14,
  };
}

export function pasoDiagPrincipal(showSires: boolean, esMujer = false): number {
  return getNotaMedicaStepMap(showSires, esMujer).diagnostico;
}

export function pasoDiag2(showSires: boolean, esMujer = false): number {
  return getNotaMedicaStepMap(showSires, esMujer).comorbilidad2;
}

export function pasoDiag3(showSires: boolean, esMujer = false): number {
  return getNotaMedicaStepMap(showSires, esMujer).comorbilidad3;
}

export function pasoEmbarazo(showSires: boolean, esMujer: boolean): number | null {
  return getNotaMedicaStepMap(showSires, esMujer).embarazo;
}
