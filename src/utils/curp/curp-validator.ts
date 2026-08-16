/**
 * CURP validator (espejo de backend/src/utils/curp-validator.util.ts).
 */

import {
  deriveCurpNameSegments,
  getExpectedHomoclavePattern,
} from './curp-name-segments';
import { curpInicialesMatchExpected } from './curp-inconvenient-words';
import { mapSexoToGiisBiologico } from './sexo-mapper';
import {
  isTrabajadorSexoCurp,
  normalizeSexoCurpToCurpCode,
  type TrabajadorSexoCurp,
} from '@/helpers/trabajadorSexoCurp';
import { isGenericCurp } from '@/helpers/isGenericCurp';

export interface Discrepancy {
  field:
    | 'fechaNacimiento'
    | 'sexo'
    | 'entidadNacimiento'
    | 'iniciales'
    | 'consonantesInternas'
    | 'homoclave';
  expected: string;
  gotFromCurp: string;
}

export function validateCURPFormat(curp: string): boolean {
  if (!curp || typeof curp !== 'string') {
    return false;
  }

  const normalizedCurp = curp.trim().toUpperCase();

  if (normalizedCurp.length !== 18) {
    return false;
  }

  if (isGenericCurp(normalizedCurp)) {
    return true;
  }

  const renapoPattern = /^[A-Z]{4}\d{6}[HMX][A-Z]{5}[0-9A-Z]\d$/;
  return renapoPattern.test(normalizedCurp);
}

const RENAPO_CURP_CHARS = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';

export function validateCURPChecksum(curp: string): boolean {
  if (!curp || typeof curp !== 'string' || curp.length !== 18) {
    return false;
  }

  const normalizedCurp = curp.trim().toUpperCase();
  const baseString = normalizedCurp.substring(0, 17);
  const providedCheckDigit = normalizedCurp.charAt(17);

  const getCharValue = (char: string): number => {
    const idx = RENAPO_CURP_CHARS.indexOf(char);
    return idx >= 0 ? idx : 0;
  };

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += getCharValue(baseString[i]) * (18 - i);
  }

  const modulo = sum % 10;
  const calculatedCheckDigit = modulo === 0 ? '0' : String(10 - modulo);
  return calculatedCheckDigit === providedCheckDigit;
}

export function getExpectedCheckDigit(curp17: string): string {
  const normalized = curp17.trim().toUpperCase().substring(0, 17);
  if (normalized.length < 17) {
    return '';
  }
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const idx = RENAPO_CURP_CHARS.indexOf(normalized[i]);
    const charValue = idx >= 0 ? idx : 0;
    sum += charValue * (18 - i);
  }
  const modulo = sum % 10;
  return modulo === 0 ? '0' : String(10 - modulo);
}

const ENTIDAD_MAP: Record<string, string> = {
  '00': 'NE',
  '88': 'NE', // NO APLICA (nacimiento extranjero GIIS) → RENAPO NE
  '01': 'AS',
  '02': 'BC',
  '03': 'BS',
  '04': 'CC',
  '05': 'CL',
  '06': 'CM',
  '07': 'CS',
  '08': 'CH',
  '09': 'DF',
  '10': 'DG',
  '11': 'GT',
  '12': 'GR',
  '13': 'HG',
  '14': 'JC',
  '15': 'MC',
  '16': 'MN',
  '17': 'MS',
  '18': 'NT',
  '19': 'NL',
  '20': 'OC',
  '21': 'PL',
  '22': 'QT',
  '23': 'QR',
  '24': 'SP',
  '25': 'SL',
  '26': 'SR',
  '27': 'TC',
  '28': 'TS',
  '29': 'TL',
  '30': 'VZ',
  '31': 'YN',
  '32': 'ZS',
};

const ENTIDAD_NAME_MAP: Record<string, string> = {
  'NO ESPECIFICADO': 'NE',
  'NO APLICA': 'NE',
  AGUASCALIENTES: 'AS',
  'BAJA CALIFORNIA': 'BC',
  'BAJA CALIFORNIA SUR': 'BS',
  CAMPECHE: 'CC',
  'COAHUILA DE ZARAGOZA': 'CL',
  COAHUILA: 'CL',
  COLIMA: 'CM',
  CHIAPAS: 'CS',
  CHIHUAHUA: 'CH',
  'CIUDAD DE MÉXICO': 'DF',
  'DISTRITO FEDERAL': 'DF',
  DURANGO: 'DG',
  GUANAJUATO: 'GT',
  GUERRERO: 'GR',
  HIDALGO: 'HG',
  JALISCO: 'JC',
  MÉXICO: 'MC',
  'ESTADO DE MÉXICO': 'MC',
  'MICHOACÁN DE OCAMPO': 'MN',
  MICHOACAN: 'MN',
  MORELOS: 'MS',
  NAYARIT: 'NT',
  'NUEVO LEÓN': 'NL',
  'NUEVO LEON': 'NL',
  OAXACA: 'OC',
  PUEBLA: 'PL',
  QUERÉTARO: 'QT',
  QUERETARO: 'QT',
  'QUINTANA ROO': 'QR',
  'SAN LUIS POTOSÍ': 'SP',
  'SAN LUIS POTOSI': 'SP',
  SINALOA: 'SL',
  SONORA: 'SR',
  TABASCO: 'TC',
  TAMAULIPAS: 'TS',
  TLAXCALA: 'TL',
  'VERACRUZ DE IGNACIO DE LA LLAVE': 'VZ',
  VERACRUZ: 'VZ',
  YUCATÁN: 'YN',
  YUCATAN: 'YN',
  ZACATECAS: 'ZS',
};

export function normalizeEntidadToCURPCode(entidad: string): string | null {
  if (!entidad || typeof entidad !== 'string') {
    return null;
  }
  const normalized = entidad.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(normalized)) {
    return normalized;
  }
  if (/^\d{2}$/.test(normalized)) {
    return ENTIDAD_MAP[normalized] || null;
  }
  return ENTIDAD_NAME_MAP[normalized] || null;
}

export function normalizeSexoToCURPCode(sexo: string): string | null {
  if (!sexo || typeof sexo !== 'string') {
    return null;
  }
  const normalized = sexo.trim().toUpperCase();
  if (normalized === 'H' || normalized === 'M') {
    return normalized;
  }
  if (
    normalized === 'MASCULINO' ||
    normalized === 'HOMBRE' ||
    normalized === '1'
  ) {
    return 'H';
  }
  if (
    normalized === 'FEMENINO' ||
    normalized === 'MUJER' ||
    normalized === '2'
  ) {
    return 'M';
  }
  return null;
}

export function parseDateSafe(dateInput: Date | string): {
  year: number;
  month: number;
  day: number;
} {
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return {
        year: parseInt(match[1], 10),
        month: parseInt(match[2], 10),
        day: parseInt(match[3], 10),
      };
    }
  }

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const isLikelyDateOnly =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;

  if (isLikelyDateOnly) {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
  }

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

/**
 * Fecha usable para cruce CURP / feedback live: evita años incompletos del
 * input type="date" al tipear (0001 → 0019 → 0199 → 1994).
 */
export function isFechaNacimientoReadyForCurpCrossCheck(
  fecha?: Date | string | null,
): boolean {
  if (fecha == null) {
    return false;
  }
  if (typeof fecha === 'string' && fecha.trim() === '') {
    return false;
  }

  const { year, month, day } = parseDateSafe(fecha);
  return (
    year >= 1900 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31
  );
}

export function validateCURPCrossCheck(
  curp: string,
  data: {
    fechaNacimiento: Date | string;
    sexo?: string;
    sexoCURP?: TrabajadorSexoCurp;
    entidadNacimiento?: string;
    nombre?: string;
    primerApellido?: string;
    segundoApellido?: string;
  },
): {
  isValid: boolean;
  discrepancies: Discrepancy[];
} {
  const discrepancies: Discrepancy[] = [];
  const normalizedCurp = curp.trim().toUpperCase();

  if (isGenericCurp(normalizedCurp)) {
    return { isValid: true, discrepancies: [] };
  }

  if (!validateCURPFormat(normalizedCurp)) {
    return {
      isValid: false,
      discrepancies: [
        {
          field: 'fechaNacimiento',
          expected: 'CURP con formato válido',
          gotFromCurp: 'CURP con formato inválido',
        },
      ],
    };
  }

  const curpIniciales = normalizedCurp.substring(0, 4);
  const curpAAMMDD = normalizedCurp.substring(4, 10);
  const curpSexo = normalizedCurp.charAt(10);
  const curpEntidad = normalizedCurp.substring(11, 13);
  const curpConsonantes = normalizedCurp.substring(13, 16);
  const curpHomoclave = normalizedCurp.charAt(16);

  const fechaParsed = parseDateSafe(data.fechaNacimiento);
  const añoCURP = String(fechaParsed.year).slice(-2);
  const mes = String(fechaParsed.month).padStart(2, '0');
  const dia = String(fechaParsed.day).padStart(2, '0');
  const fechaEsperada = `${añoCURP}${mes}${dia}`;

  if (curpAAMMDD !== fechaEsperada) {
    discrepancies.push({
      field: 'fechaNacimiento',
      expected: fechaEsperada,
      gotFromCurp: curpAAMMDD,
    });
  }

  if (isTrabajadorSexoCurp(data.sexoCURP)) {
    const sexoEsperado = normalizeSexoCurpToCurpCode(data.sexoCURP);
    if (curpSexo !== sexoEsperado) {
      discrepancies.push({
        field: 'sexo',
        expected: sexoEsperado,
        gotFromCurp: curpSexo,
      });
    }
  } else if (data.sexo) {
    const omitirCruceSexo = mapSexoToGiisBiologico(data.sexo) === 3;
    if (!omitirCruceSexo) {
      const sexoEsperado = normalizeSexoToCURPCode(data.sexo);
      if (sexoEsperado && curpSexo !== sexoEsperado) {
        discrepancies.push({
          field: 'sexo',
          expected: sexoEsperado,
          gotFromCurp: curpSexo,
        });
      }
    }
  }

  if (data.entidadNacimiento && data.entidadNacimiento.trim() !== '') {
    const entidadNormalizada = normalizeEntidadToCURPCode(
      data.entidadNacimiento,
    );
    if (entidadNormalizada && curpEntidad !== entidadNormalizada) {
      discrepancies.push({
        field: 'entidadNacimiento',
        expected: entidadNormalizada,
        gotFromCurp: curpEntidad,
      });
    }
  }

  // Cruce con nombre si hay primer apellido, o sin ambos (sinApellidos). Segundo sin primero = inválido, no cruzar.
  const hasNombre = !!data.nombre?.trim();
  const hasPrimerApellido = !!data.primerApellido?.trim();
  const hasSegundoApellido = !!data.segundoApellido?.trim();
  if (hasNombre && (hasPrimerApellido || !hasSegundoApellido)) {
    const expectedSegments = deriveCurpNameSegments({
      nombre: data.nombre,
      primerApellido: data.primerApellido,
      segundoApellido: data.segundoApellido,
    });

    if (!curpInicialesMatchExpected(curpIniciales, expectedSegments.inicialesRaw)) {
      discrepancies.push({
        field: 'iniciales',
        expected: expectedSegments.iniciales,
        gotFromCurp: curpIniciales,
      });
    }

    if (curpConsonantes !== expectedSegments.consonantes) {
      discrepancies.push({
        field: 'consonantesInternas',
        expected: expectedSegments.consonantes,
        gotFromCurp: curpConsonantes,
      });
    }
  }

  const homoclaveRule = getExpectedHomoclavePattern(fechaParsed.year);
  if (!homoclaveRule.pattern.test(curpHomoclave)) {
    discrepancies.push({
      field: 'homoclave',
      expected: homoclaveRule.label,
      gotFromCurp: curpHomoclave,
    });
  }

  return {
    isValid: discrepancies.length === 0,
    discrepancies,
  };
}
