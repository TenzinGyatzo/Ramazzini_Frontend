/**
 * Icono y color de cada tipo de documento clínico, iguales a los de la fila del
 * expediente (`DocumentoItem.vue`). Si cambia uno allá, cambiarlo también aquí.
 * Las clases van completas para que Tailwind las genere.
 */
export interface IconoTipoDocumento {
  icono: string;
  /** Fondo y color del recuadro del icono, en claro y en oscuro. */
  clases: string;
}

const verde = 'bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-300';
const azul = 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300';
const amarillo = 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-300';
const morado = 'bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300';
const cielo = 'bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300';
const indigo = 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300';
const rosa = 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300';

const ICONOS: Record<string, IconoTipoDocumento> = {
  notaAclaratoria: { icono: 'fas fa-exclamation-triangle', clases: amarillo },
  antidoping: { icono: 'fas fa-flask', clases: 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300' },
  constanciaAptitud: { icono: 'fas fa-user-check', clases: verde },
  aptitud: { icono: 'fas fa-user-check', clases: verde },
  audiometria: { icono: 'fas fa-volume-up', clases: morado },
  certificado: { icono: 'fas fa-certificate', clases: azul },
  certificadoExpedito: { icono: 'fas fa-certificate', clases: azul },
  examenVista: { icono: 'fas fa-eye', clases: amarillo },
  exploracionFisica: { icono: 'fa-solid fa-person', clases: indigo },
  historiaClinica: {
    icono: 'fas fa-notes-medical',
    clases: 'bg-teal-100 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300',
  },
  notaMedica: {
    icono: 'fas fa-stethoscope',
    clases: 'bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300',
  },
  receta: {
    icono: 'fas fa-prescription-bottle-medical',
    clases: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  controlPrenatal: {
    icono: 'fas fa-baby',
    clases: 'bg-pink-100 text-pink-600 dark:bg-pink-950/40 dark:text-pink-300',
  },
  historiaOtologica: { icono: 'fas fa-ear-listen', clases: morado },
  previoEspirometria: { icono: 'fas fa-wind', clases: cielo },
  entrevistaPsicologica: {
    icono: 'fa-regular fa-comments',
    clases: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  },
  trastornosEstadoAnimo: {
    icono: 'fa-solid fa-wave-square',
    clases: 'bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300',
  },
  cuestionarioProdromalBreve: { icono: 'fa-solid fa-brain', clases: morado },
  trastornoLimitePersonalidad: { icono: 'fa-solid fa-heart-crack', clases: rosa },
  cuestionarioNordico: { icono: 'fa-solid fa-person', clases: cielo },
  evaluacionSuenoVigilia: { icono: 'fa-solid fa-moon', clases: indigo },
  eventoSeguimientoCardiometabolico: { icono: 'fa-solid fa-heart-crack', clases: rosa },
  informeLongitudinalCardiometabolico: { icono: 'fa-solid fa-heart-crack', clases: rosa },
  informeLongitudinalAudiometrico: { icono: 'fa-solid fa-ear-listen', clases: cielo },
  // En el expediente depende de si es PDF o imagen; aquí no se conoce la extensión
  documentoExterno: {
    icono: 'fa-solid fa-arrow-up-from-bracket',
    clases: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  },
};

/** Para un tipo sin icono propio: el documento genérico en verde que se usaba para todos. */
export const ICONO_DOCUMENTO_GENERICO: IconoTipoDocumento = {
  icono: 'fas fa-file-lines',
  clases: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40',
};

export function iconoTipoDocumento(tipoDocumento: string | null | undefined): IconoTipoDocumento {
  return (tipoDocumento && ICONOS[tipoDocumento]) || ICONO_DOCUMENTO_GENERICO;
}
