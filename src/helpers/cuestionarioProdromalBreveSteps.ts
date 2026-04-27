/**
 * PQ-B: textos y puntuación alineados con `cuestionario-prodromal-breve.informe.ts` y el schema.
 * Malestar: suma de puntuaciones 0–4 por ítem con respuesta «Sí» (escala Likert del seguimiento).
 */

export const TEXTO_CONSECUENCIA_PQ_B =
  'Si contestó Sí: Cuando esto sucede, me siento asustado, preocupado o me causa problemas:';

export const OPCIONES_GRADO_MALESTAR = [
  'Totalmente en desacuerdo',
  'En desacuerdo',
  'Neutral',
  'De acuerdo',
  'Totalmente de acuerdo',
] as const;

/** Puntuación numérica del malestar por ítem (0 = mínimo malestar declarado … 4 = máximo). */
const PUNTO_POR_GRADO: Record<string, number> = {
  'Totalmente en desacuerdo': 0,
  'En desacuerdo': 1,
  Neutral: 2,
  'De acuerdo': 3,
  'Totalmente de acuerdo': 4,
};

/** Índice 0..20 → paso del formulario (fecha = 1, primera pregunta = 2). */
export function pasoFormularioPreguntaPQB(indice0a20: number): number {
  return indice0a20 + 2;
}

export const PREGUNTAS_TEXTO_PQ_B: string[] = [
  '¿Los ambientes conocidos le parecen a veces extraños, confusos, amenazantes o irreales?',
  '¿Alguna vez ha percibido sonidos inusuales como estallidos, chasquidos, silbidos, aplausos o timbres en sus oídos?',
  '¿Las cosas que ve le parecen diferentes a como normalmente son (más brillantes o más apagadas, más grandes o más pequeñas, o con cambios en algún otro aspecto)?',
  '¿Ha tenido experiencias de telepatía, poderes de vidente o de adivino?',
  '¿Alguna vez ha sentido como si no tuviera control de sus propias ideas o pensamientos?',
  '¿Tiene dificultad para seguir su propio tema, debido a que divaga o pierde mucho la pista cuando habla?',
  '¿Tiene la fuerte sensación o la creencia de que posee alguna clase de dones o talentos inusuales?',
  '¿Tiene la sensación de que otras personas le observan o hablan de usted?',
  '¿Nota a veces extrañas sensaciones en la piel o debajo de ella, como bichos reptando?',
  '¿Se siente a veces repentinamente distraído por sonidos distantes de los que normalmente no se da cuenta?',
  '¿Alguna vez ha tenido la sensación de que había alguna persona o fuerza a su alrededor, aunque no podía ver a nadie?',
  '¿Le preocupa a veces que algo pueda ir mal en su mente?',
  '¿Ha sentido alguna vez que no existía, que el mundo no existía o que estaba muerto?',
  '¿Se ha sentido a veces confuso sobre si algo de lo que le pasaba era real o imaginario?',
  '¿Tiene creencias que a otras personas les parecerían extrañas o inusuales?',
  '¿Siente que partes de su cuerpo han cambiado de alguna manera o que partes de su cuerpo están funcionando de manera diferente?',
  '¿Sus pensamientos son a veces tan intensos que casi puede oírlos?',
  '¿Experimenta sentimientos de recelo y desconfianza hacia otras personas?',
  '¿Alguna vez ha visto cosas inusuales como flashes, llamas, luces deslumbrantes o figuras geométricas?',
  '¿Alguna vez ha visto cosas que otras personas no pueden ver o no parecen ver?',
  '¿A veces a la gente le cuesta entender lo que está diciendo?',
];

export function claveSi(indice0a20: number): `p${number}` {
  return `p${indice0a20 + 1}` as `p${number}`;
}

export function claveGrado(indice0a20: number): string {
  return `p${indice0a20 + 1}GradoAcuerdoStatement`;
}

export function puntosMalestarPorGrado(grado: string | undefined): number | null {
  if (!grado || typeof grado !== 'string') return null;
  if (grado in PUNTO_POR_GRADO) return PUNTO_POR_GRADO[grado];
  return null;
}

/** Cuenta respuestas «Sí» en p1…p21 (cada Sí = 1). */
export function contarFrecuenciaPQB(datos: Record<string, unknown> | undefined): number {
  if (!datos) return 0;
  let c = 0;
  for (let n = 1; n <= 21; n++) {
    const k = `p${n}` as keyof typeof datos;
    if (datos[k] === 'Sí') c++;
  }
  return c;
}

/** Suma puntuaciones de malestar (0–4 por ítem con «Sí» y grado válido). */
export function sumarMalestarPQB(datos: Record<string, unknown> | undefined): number {
  if (!datos) return 0;
  let s = 0;
  for (let n = 1; n <= 21; n++) {
    const pk = `p${n}` as keyof typeof datos;
    if (datos[pk] !== 'Sí') continue;
    const gk = `p${n}GradoAcuerdoStatement` as keyof typeof datos;
    const g = datos[gk];
    const pts = typeof g === 'string' ? puntosMalestarPorGrado(g) : null;
    if (pts !== null) s += pts;
  }
  return s;
}

/**
 * Positivo solo si se superan ambos cortes (Frecuencia > 6 y Malestar > 13);
 * cualquier otro caso se interpreta como negativo (incluidos los perfiles “discordantes”).
 */
export function esPositivoRiesgoPsicoticoPQB(frecuencia: number, malestar: number): boolean {
  return frecuencia > 6 && malestar > 13;
}

export function textoInterpretacionPQB(frecuencia: number, malestar: number): string {
  return esPositivoRiesgoPsicoticoPQB(frecuencia, malestar)
    ? 'Positivo para riesgo psicótico'
    : 'Negativo para riesgo psicótico';
}

export const REGLA_SISTEMA_PUNTUACION_PQ_B = `Sistema de puntuación:
• Frecuencia: sumar las respuestas «Sí» (Sí = 1, No = 0).
• Malestar: sumar la puntuación de las respuestas de malestar (escala 0 a 4 por ítem cuando contestó «Sí»: Totalmente en desacuerdo = 0 … Totalmente de acuerdo = 4).
• Punto de corte: Frecuencia > 6 y Malestar > 13 indican posible riesgo psicótico.`;
