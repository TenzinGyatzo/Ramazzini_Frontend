/** Valores igual que backend (mongoose / class-validator enums). Etiquetas para UI en español. */

export const DIAGNOSTICO_CARDIOMETABOLICO_OPTS = [
  { value: 'HIPERTENSION_ARTERIAL', label: 'Hipertensión arterial' },
  { value: 'DIABETES_MELLITUS_TIPO_2', label: 'Diabetes mellitus tipo 2' },
  { value: 'DISLIPIDEMIA', label: 'Dislipidemia' },
  { value: 'OBESIDAD', label: 'Obesidad' },
] as const;

export const ESTADO_CONTROL_CONDICION_OPTS = [
  { value: 'CONTROLADA', label: 'Controlada' },
  { value: 'NO_CONTROLADA', label: 'No controlada' },
  { value: 'NO_VALORABLE', label: 'No valorada en esta visita' },
] as const;

export const GRADO_OBESIDAD_OPTS = [
  { value: 'SOBREPESO', label: 'Sobrepeso' },
  { value: 'OBESIDAD_I', label: 'Obesidad clase I' },
  { value: 'OBESIDAD_II', label: 'Obesidad clase II' },
  { value: 'OBESIDAD_III', label: 'Obesidad clase III' },
] as const;

export function labelDiagnostico(value: string) {
  const o = DIAGNOSTICO_CARDIOMETABOLICO_OPTS.find((x) => x.value === value);
  return o?.label ?? value;
}

/** Valor en `diagnosticosActivos`; igual a `DIAGNOSTICO_CARDIOMETABOLICO_OPTS[3].value`. */
export const CODIGO_DIAGNOSTICO_OBESIDAD = 'OBESIDAD';

/**
 * Categorías de IMC generadas en Step3 (`setCategoriaIMC`) → enum de grado (backend).
 */
const CATEGORIA_IMC_A_GRADO: Record<string, string> = {
  Sobrepeso: 'SOBREPESO',
  'Obesidad clase I': 'OBESIDAD_I',
  'Obesidad clase II': 'OBESIDAD_II',
  'Obesidad clase III': 'OBESIDAD_III',
  /** Alias: registros antiguos en BD pueden seguir guardando «Obesidad grado …». */
  'Obesidad grado I': 'OBESIDAD_I',
  'Obesidad grado II': 'OBESIDAD_II',
  'Obesidad grado III': 'OBESIDAD_III',
};

export type FormDataConObesidadImc = {
  estadoCondiciones?: {
    hipertensionArterial?: { control?: string };
    diabetesMellitusTipo2?: { control?: string };
    dislipidemia?: { control?: string };
    obesidad?: { grado?: string };
  };
  diagnosticosActivos?: string[];
};

/** IMC con el mismo redondeo que el paso de somatometría. */
export function imcRedondeadoDesdePesoAltura(pesoKg: number, alturaM: number): number {
  if (!(pesoKg > 0) || !(alturaM > 0)) return NaN;
  return Math.round((pesoKg / alturaM ** 2) * 100) / 100;
}

/** Mismas franjas que `setCategoriaIMC` en Step3 (textos en español). */
export function categoriaImcEspaniolDesdeNumero(imc: number): string {
  if (!(imc > 0) || Number.isNaN(imc)) return '';
  if (imc < 18.5) return 'Bajo peso';
  if (imc >= 18.5 && imc <= 24.99) return 'Normal';
  if (imc >= 25 && imc <= 29.99) return 'Sobrepeso';
  if (imc >= 30 && imc <= 34.99) return 'Obesidad clase I';
  if (imc >= 35 && imc <= 39.99) return 'Obesidad clase II';
  if (imc >= 40) return 'Obesidad clase III';
  return '';
}

/**
 * Ajusta peso, IMC y categoría para alinear IMC umbral diagnóstico (≥30 obesidad, &lt;30 sin diagnóstico).
 * Umbral alto: objetivo ≥30; umbral bajo: objetivo &lt;30 (usa peso compatibilizado con categoría Sobrepeso).
 */
export function ajustarSomatometriaHaciaImcObjetivo(
  fd: FormDataConObesidadImc & { somatometria?: { peso?: number; altura?: number; indiceMasaCorporal?: number; categoriaIMC?: string } },
  modo: 'marcar_obesidad_diagnostico' | 'desmarcar_obesidad_diagnostico',
) {
  if (!fd.somatometria) fd.somatometria = {};
  const s = fd.somatometria;
  const altura = s.altura;
  if (!(typeof altura === 'number') || altura <= 0) return;

  let peso: number;
  if (modo === 'marcar_obesidad_diagnostico') {
    peso = Math.ceil(30 * altura ** 2 * 100) / 100;
  } else {
    peso = Math.floor(29 * altura ** 2 * 100) / 100;
  }
  peso = Math.min(300, Math.max(35, peso));

  let imc = imcRedondeadoDesdePesoAltura(peso, altura);
  let n = 0;
  if (modo === 'marcar_obesidad_diagnostico') {
    while (imc < 30 && peso + 0.01 <= 300 && n++ < 500) {
      peso = Math.round((peso + 0.01) * 100) / 100;
      imc = imcRedondeadoDesdePesoAltura(peso, altura);
    }
  } else {
    while (imc >= 30 && peso - 0.01 >= 35 && n++ < 500) {
      peso = Math.round((peso - 0.01) * 100) / 100;
      imc = imcRedondeadoDesdePesoAltura(peso, altura);
    }
  }

  s.peso = peso;
  s.indiceMasaCorporal = Number.isFinite(imc) ? imc : undefined;
  s.categoriaIMC = Number.isFinite(imc) ? categoriaImcEspaniolDesdeNumero(imc) : '';

  const cat = typeof s.categoriaIMC === 'string' ? s.categoriaIMC : '';
  aplicarObesidadDesdeCategoriaIMC(fd, cat);
  sincronizarDiagnosticoObesidadPorImc(fd, Number.isFinite(imc) ? imc : undefined);
}

/**
 * Diagnóstico activo `OBESIDAD` solo cuando IMC numérico ≥ 30 (independiente de sobrepeso 25–29,9).
 */
export function sincronizarDiagnosticoObesidadPorImc(fd: FormDataConObesidadImc, imc: number | undefined) {
  if (!fd.diagnosticosActivos) fd.diagnosticosActivos = [];
  if (typeof imc === 'number' && !Number.isNaN(imc) && imc >= 30) {
    if (!fd.diagnosticosActivos.includes(CODIGO_DIAGNOSTICO_OBESIDAD)) {
      fd.diagnosticosActivos.push(CODIGO_DIAGNOSTICO_OBESIDAD);
    }
  } else {
    fd.diagnosticosActivos = fd.diagnosticosActivos.filter((x) => x !== CODIGO_DIAGNOSTICO_OBESIDAD);
  }
}

/**
 * Alinea `estadoCondiciones.obesidad.grado` con la categoría de IMC (sobrepeso u obesidad por clase).
 * No modifica `diagnosticosActivos`; use `sincronizarDiagnosticoObesidadPorImc` con el IMC numérico.
 */
export function aplicarObesidadDesdeCategoriaIMC(fd: FormDataConObesidadImc, categoriaIMC: string) {
  if (!fd.estadoCondiciones) fd.estadoCondiciones = {};
  if (!fd.estadoCondiciones.obesidad) fd.estadoCondiciones.obesidad = {};
  const ob = fd.estadoCondiciones.obesidad;

  const cat = (categoriaIMC ?? '').trim();
  const sinSobrepesoNiObesidad = !cat || cat === 'Bajo peso' || cat === 'Normal';

  if (sinSobrepesoNiObesidad) {
    delete ob.grado;
    if (ob && typeof ob === 'object' && Object.keys(ob).length === 0) {
      delete fd.estadoCondiciones.obesidad;
      if (fd.estadoCondiciones && Object.keys(fd.estadoCondiciones).length === 0) {
        delete fd.estadoCondiciones;
      }
    }
    return;
  }

  const grado = CATEGORIA_IMC_A_GRADO[cat];
  if (!grado) return;

  ob.grado = grado;
}
