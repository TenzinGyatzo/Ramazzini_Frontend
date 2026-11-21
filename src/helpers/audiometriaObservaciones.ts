/**
 * Observaciones de la audiometría (punto 44, decisión del usuario 2026-11-21): en lugar de las
 * 13 plantillas, unas cuantas respuestas que redactan el texto. Solo se guarda el texto; las
 * respuestas son ayuda de pantalla. Las frases son las de las plantillas que reemplazan.
 * Síntomas y otoscopia empiezan con No | Sí (ajuste del usuario): «No» en síntomas es
 * «Audiológicamente asintomático.»; «No» en otoscopia no agrega nada.
 */

export type Exposicion = 'No' | 'Si' | null;
export type NoSi = 'No' | 'Si' | null;
export type Proteccion = 'siempre' | 'intermitente' | 'no' | null;
export type Sintoma = 'hipoacusia' | 'acufenos' | 'otalgia' | 'empeoramiento';
export type Otoscopia = 'normal' | 'cerumen' | 'cicatrices' | 'otitisExterna';
export type Antecedente = 'otitisMedia' | 'traumaOD' | 'traumaOI';

export interface RespuestasObservaciones {
  exposicion: Exposicion;
  anios: number | null;
  proteccion: Proteccion;
  /** ¿Tiene síntomas auditivos? */
  conSintomas: NoSi;
  sintomas: Sintoma[];
  /** ¿Se realizó otoscopia? */
  otoscopiaRealizada: NoSi;
  otoscopia: Otoscopia[];
  antecedentes: Antecedente[];
}

export const respuestasVacias = (): RespuestasObservaciones => ({
  exposicion: null,
  anios: null,
  proteccion: null,
  conSintomas: null,
  sintomas: [],
  otoscopiaRealizada: null,
  otoscopia: [],
  antecedentes: [],
});

export const OPCIONES_PROTECCION: Array<{ valor: Exclude<Proteccion, null>; etiqueta: string }> = [
  { valor: 'siempre', etiqueta: 'Siempre' },
  { valor: 'intermitente', etiqueta: 'Intermitente' },
  { valor: 'no', etiqueta: 'No usa' },
];
export const OPCIONES_SINTOMAS: Array<{ valor: Sintoma; etiqueta: string }> = [
  { valor: 'hipoacusia', etiqueta: 'Hipoacusia' },
  { valor: 'acufenos', etiqueta: 'Acúfenos' },
  { valor: 'otalgia', etiqueta: 'Otalgia' },
  { valor: 'empeoramiento', etiqueta: 'Empeoramiento' },
];
export const OPCIONES_OTOSCOPIA: Array<{ valor: Otoscopia; etiqueta: string }> = [
  { valor: 'normal', etiqueta: 'Normal' },
  { valor: 'cerumen', etiqueta: 'Cerumen impactado' },
  { valor: 'cicatrices', etiqueta: 'Cicatrices / perforación' },
  { valor: 'otitisExterna', etiqueta: 'Otitis externa' },
];
export const OPCIONES_ANTECEDENTES: Array<{ valor: Antecedente; etiqueta: string }> = [
  { valor: 'otitisMedia', etiqueta: 'Otitis media previa' },
  { valor: 'traumaOD', etiqueta: 'Trauma acústico OD' },
  { valor: 'traumaOI', etiqueta: 'Trauma acústico OI' },
];

/** Opción que excluye a las demás del mismo grupo («Normal» en la otoscopia). */
export function alternar<T extends string>(lista: T[], valor: T, exclusiva: T | null = null): T[] {
  if (lista.includes(valor)) return lista.filter((v) => v !== valor);
  if (valor === exclusiva) return [valor];
  return [...lista.filter((v) => v !== exclusiva), valor];
}

const unir = (partes: string[]) =>
  partes.length <= 1 ? partes.join('') : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;

export function hayRespuestas(r: RespuestasObservaciones): boolean {
  return (
    r.exposicion !== null ||
    r.conSintomas !== null ||
    r.otoscopiaRealizada !== null ||
    r.antecedentes.length > 0
  );
}

/** El texto de las observaciones según las respuestas («» si no hay ninguna). */
export function redactarObservacionesAudiometria(r: RespuestasObservaciones): string {
  const oraciones: string[] = [];

  if (r.exposicion === 'No') {
    oraciones.push('Niega antecedente de exposición a ruido de tipo industrial.');
  } else if (r.exposicion === 'Si') {
    let frase = 'Refiere antecedente de exposición a ruido de tipo industrial';
    if (r.anios != null && Number(r.anios) > 0) {
      frase += ` durante ${r.anios} ${Number(r.anios) === 1 ? 'año' : 'años'}`;
    }
    if (r.proteccion === 'siempre') frase += ', con uso de EPP';
    else if (r.proteccion === 'intermitente') frase += ', con uso intermitente de EPP';
    else if (r.proteccion === 'no') frase += ', sin uso de EPP';
    oraciones.push(`${frase}.`);
  }

  const antecedentes = [
    r.antecedentes.includes('otitisMedia') ? 'otitis media previa' : null,
    r.antecedentes.includes('traumaOD') ? 'trauma acústico en oído derecho' : null,
    r.antecedentes.includes('traumaOI') ? 'trauma acústico en oído izquierdo' : null,
  ].filter((x): x is string => !!x);
  if (antecedentes.length) oraciones.push(`Refiere antecedente de ${unir(antecedentes)}.`);

  const s = r.conSintomas === 'Si' ? r.sintomas : [];
  if (r.conSintomas === 'No') oraciones.push('Audiológicamente asintomático.');
  if (s.includes('hipoacusia')) oraciones.push('Refiere hipoacusia.');
  if (s.includes('acufenos')) oraciones.push('Refiere acúfenos/tinnitus.');
  if (s.includes('otalgia')) oraciones.push('Refiere otalgia.');
  if (s.includes('empeoramiento')) {
    oraciones.push('Refiere empeoramiento de síntomas auditivos respecto a la evaluación previa.');
  }

  const o = r.otoscopiaRealizada === 'Si' ? r.otoscopia : [];
  if (o.length) {
    const cerumen = o.includes('cerumen');
    const otitis = o.includes('otitisExterna');
    const conductos = cerumen && otitis
      ? 'con cerumen impactado y signos de otitis externa'
      : cerumen
        ? 'con cerumen impactado'
        : otitis
          ? 'con signos de otitis externa'
          : 'permeables';
    const membranas = cerumen
      ? 'no visibles'
      : o.includes('cicatrices')
        ? 'con cambios cicatriciales'
        : otitis
          ? 'parcialmente visibles'
          : 'íntegras';
    oraciones.push(`Conductos auditivos ${conductos}, membranas timpánicas ${membranas}.`);
  }

  return oraciones.join(' ');
}

/** Años completos desde el ingreso (valor de partida de los años de exposición). */
export function aniosDesde(fechaIngreso: unknown, hoy = new Date()): number | null {
  if (!fechaIngreso) return null;
  const d = new Date(String(fechaIngreso));
  if (Number.isNaN(d.getTime())) return null;
  let anios = hoy.getFullYear() - d.getFullYear();
  if (hoy.getMonth() < d.getMonth() || (hoy.getMonth() === d.getMonth() && hoy.getDate() < d.getDate())) anios--;
  return anios >= 1 ? anios : null;
}
