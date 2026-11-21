/**
 * Diagnóstico de la audiometría (punto 44, ajuste del usuario 2026-11-21): se redacta al
 * contestar, como las observaciones, sin el paso extra de «Usar como diagnóstico».
 * Primero el resultado (Normal | Hipoacusia); con hipoacusia, tipo, lateralidad (derecha,
 * izquierda o bilateral), severidad y, si se quiere, las causas «Compatible con».
 * Solo se guarda el texto; las respuestas son ayuda de pantalla.
 */

export type ResultadoAudiometria = 'Normal' | 'Hipoacusia' | null;
export type TipoHipoacusia = 'neurosensorial' | 'conductiva' | 'mixta' | null;
export type LateralidadHipoacusia = 'derecha' | 'izquierda' | 'bilateral' | null;
export type SeveridadHipoacusia = 'leve' | 'moderada' | 'severa' | 'profunda' | null;

export interface RespuestasDiagnostico {
  resultado: ResultadoAudiometria;
  tipo: TipoHipoacusia;
  lateralidad: LateralidadHipoacusia;
  severidad: SeveridadHipoacusia;
  compatibles: string[];
}

export const respuestasDiagnosticoVacias = (): RespuestasDiagnostico => ({
  resultado: null,
  tipo: null,
  lateralidad: null,
  severidad: null,
  compatibles: [],
});

export const OPCIONES_RESULTADO = [
  { valor: 'Normal', etiqueta: 'Normal' },
  { valor: 'Hipoacusia', etiqueta: 'Hipoacusia' },
];
export const OPCIONES_TIPO = [
  { valor: 'neurosensorial', etiqueta: 'Neurosensorial' },
  { valor: 'conductiva', etiqueta: 'Conductiva' },
  { valor: 'mixta', etiqueta: 'Mixta' },
];
export const OPCIONES_LATERALIDAD = [
  { valor: 'derecha', etiqueta: 'Derecha' },
  { valor: 'izquierda', etiqueta: 'Izquierda' },
  { valor: 'bilateral', etiqueta: 'Bilateral' },
];
export const OPCIONES_SEVERIDAD = [
  { valor: 'leve', etiqueta: 'Leve' },
  { valor: 'moderada', etiqueta: 'Moderada' },
  { valor: 'severa', etiqueta: 'Severa' },
  { valor: 'profunda', etiqueta: 'Profunda' },
];

/** Las causas de siempre, por tipo (las del paso anterior). */
export const CAUSAS_COMPATIBLES = [
  {
    titulo: 'Neurosensorial',
    opciones: [
      'Cortipatía bilateral crónica por exposición a ruido.',
      'Proceso inflamatorio crónico de oído medio predominante en oído derecho.',
      'Proceso inflamatorio crónico de oído medio predominante en oído izquierdo.',
      'Proceso inflamatorio agudo de oído derecho + oído izquierdo con audición normal.',
      'Proceso inflamatorio agudo de oído izquierdo + oído derecho con audición normal.',
      'Uso de medicamentos ototóxicos.',
      'Presbiacusia (envejecimiento).',
    ],
  },
  {
    titulo: 'Conductiva',
    opciones: [
      'Acumulación de cerumen (tapón de cera).',
      'Infecciones del oído medio aguda o crónica (otitis media).',
      'Perforación del tímpano derecho.',
      'Perforación del tímpano izquierdo.',
      'Otitis media con derrame (líquido en el oído).',
      'Otosclerosis (osificación anormal de los huesecillos).',
    ],
  },
  {
    titulo: 'Mixta',
    opciones: [
      'Proceso inflamatorio agudo en oído izquierdo.',
      'Proceso inflamatorio agudo en oído derecho.',
      'Proceso inflamatorio crónico en oído izquierdo.',
      'Proceso inflamatorio crónico en oído derecho.',
      'Presbiacusia (envejecimiento).',
      'Enfermedad de Meniere.',
      'Traumatismo craneoencefálico.',
      'Otosclerosis (osificación anormal de los huesecillos).',
      'Trauma acústico (Explosión).',
    ],
  },
];

const sinPunto = (s: string) => s.trim().replace(/\.$/, '');
const minusculaInicial = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);
const unir = (partes: string[]) =>
  partes.length <= 1 ? partes.join('') : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;

export function hayRespuestasDiagnostico(r: RespuestasDiagnostico): boolean {
  return r.resultado !== null;
}

/** El diagnóstico según las respuestas («» sin resultado). Se arma conforme se contesta. */
export function redactarDiagnosticoAudiometria(r: RespuestasDiagnostico): string {
  if (r.resultado === 'Normal') return 'Audición normal bilateral.';
  if (r.resultado !== 'Hipoacusia') return '';
  const lateralidad =
    r.lateralidad === 'bilateral' ? 'bilateral' : r.lateralidad ? `unilateral ${r.lateralidad}` : null;
  const partes = ['Hipoacusia', r.tipo, lateralidad, 'crónica', r.severidad].filter(Boolean);
  let texto = `${partes.join(' ')}.`;
  if (r.compatibles.length) {
    texto += ` Compatible con ${unir(r.compatibles.map((c) => minusculaInicial(sinPunto(c))))}.`;
  }
  return texto;
}
