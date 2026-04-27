import { calcularEdad } from "./dates";
import { parseISO, isAfter, subDays } from 'date-fns';

// GRUPOS ETARIOS
const gruposEtarios = [
    { rango: '16–20', min: 16, max: 20 },
    { rango: '21–25', min: 21, max: 25 },
    { rango: '26–30', min: 26, max: 30 },
    { rango: '31–35', min: 31, max: 35 },
    { rango: '36–40', min: 36, max: 40 },
    { rango: '41–45', min: 41, max: 45 },
    { rango: '46–50', min: 46, max: 50 },
    { rango: '51–55', min: 51, max: 55 },
    { rango: '56–60', min: 56, max: 60 },
    { rango: '61–65', min: 61, max: 65 },
    { rango: '66–70', min: 66, max: 70 },
  ];
  
  export function obtenerGrupoEtario(edad: number): string | null {
    const grupo = gruposEtarios.find(({ min, max }) => edad >= min && edad <= max);
    return grupo ? grupo.rango : null;
  }
  
  export function clasificarPorEdadYSexo(
    data: { sexo: string, fechaNacimiento: string }[][]
  ): Record<string, { Masculino: number, Femenino: number }> {
    const resultado: Record<string, { Masculino: number, Femenino: number }> = {};
  
    data.flat().forEach(({ sexo, fechaNacimiento }) => {
      const edad = calcularEdad(fechaNacimiento);
      const grupo = obtenerGrupoEtario(edad);
  
      if (!grupo) return;
  
      if (!resultado[grupo]) {
        resultado[grupo] = { Masculino: 0, Femenino: 0 };
      }
  
      if (sexo === 'Masculino') resultado[grupo].Masculino++;
      else if (sexo === 'Femenino') resultado[grupo].Femenino++;
    });
  
    return resultado;
  }
  
  export function ordenarPorGrupoEtario(
    resultado: Record<string, { Masculino: number, Femenino: number }>
  ): [string, { Masculino: number, Femenino: number }][] {
    return Object.entries(resultado).sort(
      ([grupoA], [grupoB]) => parseInt(grupoA.split('–')[0]) - parseInt(grupoB.split('–')[0])
    );
  }
  
// INDICE DE MASA CORPORAL
export const categoriasIMCOrdenadas = [
  'Bajo peso',
  'Normal',
  'Sobrepeso',
  'Obesidad clase I',
  'Obesidad clase II',
  'Obesidad clase III'
];

export function contarPorCategoriaIMC(data: { categoriaIMC: string | null }[]): [string, number][] {
  const conteo: Record<string, number> = {};

  for (const item of data) {
    if (item.categoriaIMC && categoriasIMCOrdenadas.includes(item.categoriaIMC)) {
      conteo[item.categoriaIMC] = (conteo[item.categoriaIMC] || 0) + 1;
    }
  }

  return categoriasIMCOrdenadas.map((categoria) => [categoria, conteo[categoria] || 0]);
}

export function contarPorCategoriaIMCConPorcentaje(
  data: { categoriaIMC: string | null }[]
): [string, number, number][] {
  const conteo: Record<string, number> = {};
  let total = 0;

  for (const item of data) {
    if (item.categoriaIMC && categoriasIMCOrdenadas.includes(item.categoriaIMC)) {
      conteo[item.categoriaIMC] = (conteo[item.categoriaIMC] || 0) + 1;
      total++;
    }
  }

  return categoriasIMCOrdenadas.map((categoria) => {
    const cantidad = conteo[categoria] || 0;
    const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;
    return [categoria, cantidad, porcentaje];
  });
}


// ANTECEDENTES RELACIONADOS CON ENFERMEDADES CRÓNICAS
export const etiquetasEnfermedades: Record<string, string> = {
  diabeticosPP: 'Diabéticos',
  hipertensivosPP: 'Hipertensivos',
  cardiopaticosPP: 'Cardiopáticos',
  epilepticosPP: 'Epilépticos',
  respiratorios: 'Respiratorios',
  alergicos: 'Alérgicos'
};

export const camposEnfermedadesOrdenadas = [
  'diabeticosPP',
  'hipertensivosPP',
  'cardiopaticosPP',
  'epilepticosPP',
  'respiratorios',
  'alergicos'
];

export function contarEnfermedadesCronicas(data: any[]): [string, number, number][] {
  const total = data.length;
  const conteo: Record<string, number> = {};

  for (const campo of [
    'diabeticosPP',
    'hipertensivosPP',
    'cardiopaticosPP',
    'epilepticosPP',
    'respiratorios',
    'alergicos'
  ]) {
    conteo[campo] = data.filter((d) => d[campo] === 'Si').length;
  }

  return Object.entries(conteo).map(([campo, cantidad]) => [
    campo,
    cantidad,
    total > 0 ? Math.round((cantidad / total) * 100) : 0
  ]);
}


// ANTECEDENTES DE PROBLEMAS LOCALIZADOS
export const etiquetasAntecedentesReferidos: Record<string, string> = {
  lumbalgias: 'Lumbalgias',
  accidentes: 'Accidentes',
  quirurgicos: 'Cirugías',
  otros: 'Otros'
};

export const camposAntecedentesReferidos = [
  'lumbalgias',
  'accidentes',
  'quirurgicos',
  'otros'
];

export function contarAntecedentesReferidos(data: any[]): [string, number, number][] {
  const total = data.length;
  const campos = ['lumbalgias', 'accidentes', 'quirurgicos', 'otros'];
  const conteo: Record<string, number> = {};

  for (const campo of campos) {
    conteo[campo] = data.filter((d) => d[campo] === 'Si').length;
  }

  return campos.map((campo) => [
    campo,
    conteo[campo] || 0,
    total > 0 ? Math.round((conteo[campo] / total) * 100) : 0
  ]);
}

// AGUDEZA VISUAL
export const etiquetasVisionSinCorreccion: Record<string, string> = {
  'Visión excepcional': 'Excepcional',
  'Visión normal': 'Normal',
  'Visión ligeramente reducida': 'Ligeramente reducida',
  'Visión moderadamente reducida': 'Moderadamente red.',
  'Visión significativamente reducida': 'Significativamente red.',
  'Visión muy reducida': 'Muy reducida'
};

export function calcularRequierenLentes(examenes: any[]): { requieren: number; noRequieren: number } {
  let requieren = 0;
  let noRequieren = 0;

  /* for (const examen of examenes) {
    const interpretacion = examen.sinCorreccionLejanaInterpretacion?.trim();

    if (interpretacion === 'Visión normal' || interpretacion === 'Visión excepcional') {
      noRequieren++;
    } else {
      requieren++;
    }
  } */

  for (const examen of examenes) {
    const requiere = examen.requiereLentesUsoGeneral?.trim();

    if (requiere === 'No') {
      noRequieren++;
    } else if (requiere === 'Si') {
      requieren++;
    }
  }

  return { requieren, noRequieren };
}

export const categoriasVisionOrdenadas = [
  'Visión excepcional',
  'Visión normal',
  'Visión ligeramente reducida',
  'Visión moderadamente reducida',
  'Visión significativamente reducida',
  'Visión muy reducida'
];

function extraerCategoriaInterpretacion(interpretacion: string | undefined): string | null {
  const v = interpretacion?.trim() || '';
  if (!v) return null;
  if (v.startsWith('OI: ')) return v.slice(4).trim();
  if (v.startsWith('OD: ')) return v.slice(4).trim();
  return v;
}

export function contarVisionSinCorreccion(examenes: any[]): [string, number, number][] {
  const total = examenes.length;
  const conteo: Record<string, number> = {};

  for (const examen of examenes) {
    const raw = examen.sinCorreccionLejanaInterpretacion?.trim();
    const categoria = extraerCategoriaInterpretacion(raw);
    if (categoria && categoriasVisionOrdenadas.includes(categoria)) {
      conteo[categoria] = (conteo[categoria] || 0) + 1;
    }
  }

  return categoriasVisionOrdenadas.map((categoria) => {
    const cantidad = conteo[categoria] || 0;
    const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;
    return [categoria, cantidad, porcentaje];
  });
}

export function calcularVistaCorregida(examenes: any[]) {
  const { requieren } = calcularRequierenLentes(examenes);

  let usan = 0;

  for (const examen of examenes) {
    const raw = examen.sinCorreccionLejanaInterpretacion?.trim();
    const interpretacion = extraerCategoriaInterpretacion(raw);
    const requiereLentes = interpretacion !== 'Visión normal' && interpretacion !== 'Visión excepcional';

    if (requiereLentes) {
      const usaIzquierdo = Number(examen.ojoIzquierdoLejanaConCorreccion) > 0;
      const usaDerecho = Number(examen.ojoDerechoLejanaConCorreccion) > 0;

      if (usaIzquierdo || usaDerecho) {
        usan++;
      }
    }
  }

  const porcentaje = requieren > 0 ? Math.round((usan / requieren) * 100) : 0;

  return {
    usan,
    requieren,
    porcentaje,
    chart: {
      labels: ['Corregida', 'Sin corregir'],
      datasets: [
        {
          data: [usan, requieren - usan],
          backgroundColor: ['#10b981', '#D1D5DB'], // Esmeralda #059669 + gris claro 
          hoverOffset: 8,
        }
      ]
    }
  };
}

export function calcularDaltonismo(examenes: any[]) {
  let conDaltonismo = 0;
  let sinDaltonismo = 0;

  for (const examen of examenes) {
    const interpretacion = examen.interpretacionIshihara?.trim();

    if (interpretacion && interpretacion !== 'Normal') {
      conDaltonismo++;
    } else {
      sinDaltonismo++;
    }
  }

  const total = conDaltonismo + sinDaltonismo;
  const porcentaje = total > 0 ? Math.round((conDaltonismo / total) * 100) : 0;

  return {
    conDaltonismo,
    porcentaje,
    chart: {
      labels: ['Daltónicos', 'Sin daltonismo'],
      datasets: [
        {
          data: [conDaltonismo, sinDaltonismo],
          backgroundColor: ['#F97316', '#D1D5DB'], // Naranja cálido + gris claro
          hoverOffset: 8,
        }
      ]
    }
  };
}

// APTITUD AL PUESTO
export const etiquetasAptitudPuesto: Record<string, string> = {
  'Apto Sin Restricciones': 'Sin restricciones',
  'Apto Con Precaución': 'Con precaución',
  'Apto Con Restricciones': 'Con restricciones',
  'No Apto': 'No apto',
  'Evaluación No Completada': 'No completada'
};

export const etiquetasAptitudPuestoTabla: Record<string, string> = {
  'Apto Sin Restricciones': 'Apto sin restricciones',
  'Apto Con Precaución': 'Apto con precaución',
  'Apto Con Restricciones': 'Apto con restricciones',
  'No Apto': 'No apto',
  'Evaluación No Completada': 'No completada'
};

export const categoriasAptitud = [
  "Apto Sin Restricciones",
  "Apto Con Precaución",
  "Apto Con Restricciones",
  "No Apto",
  "Evaluación No Completada"
];

export function contarPorAptitudPuesto(data: { aptitudPuesto: string | null }[]): [string, number, number][] {
  const total = data.length;
  const conteo: Record<string, number> = {};

  for (const item of data) {
    if (item.aptitudPuesto && categoriasAptitud.includes(item.aptitudPuesto)) {
      conteo[item.aptitudPuesto] = (conteo[item.aptitudPuesto] || 0) + 1;
    }
  }

  return categoriasAptitud.map((categoria) => {
    const cantidad = conteo[categoria] || 0;
    const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;
    return [categoria, cantidad, porcentaje];
  });
}

// CIRCUNFERENCIA CINTURA
export function calcularCircunferenciaCintura(data: any[]) {
  let alto = 0;
  let aumentado = 0;
  let bajo = 0;

  for (const item of data) {
    const categoria = item.categoriaCircunferenciaCintura?.trim();
    if (categoria === 'Alto Riesgo') alto++;
    else if (categoria === 'Riesgo Aumentado') aumentado++;
    else if (categoria === 'Bajo Riesgo') bajo++;
  }

  const total = alto + aumentado + bajo;
  const porcentaje = total > 0 ? Math.round((alto / total) * 100) : 0;

  return {
    alto,
    porcentaje,
    chart: {
      labels: ['Alto Riesgo', 'R. Aumentado', 'Bajo Riesgo'],
      datasets: [
        {
          data: [alto, aumentado, bajo],
          // backgroundColor: ['#F97316', '#FBBF24', '#D1D5DB'] // Naranja cálido, amarillo cálido y gris claro
          backgroundColor: ['#e11d48', '#F97316', '#9CA3AF'], // Rojo, naranja cálido y gris claro
          hoverOffset: 8,
        }
      ]
    }
  };
}

// CONSULTAS
export function contarConsultasUltimos30Dias(fechas: string[]): number {
  const hoy = new Date();
  const hace30Dias = subDays(hoy, 30);

  return fechas.filter((fecha) => {
    const parsed = parseISO(fecha);
    return isAfter(parsed, hace30Dias);
  }).length;
}

// EXPOSICIÓN A AGENTES DE RIESGO
export const etiquetasAgentesRiesgo: Record<string, string> = {
  'Ergonómicos': 'Ergonómicos',
  'Ruido': 'Ruido',
  'Polvos': 'Polvos',
  'Químicos': 'Químicos',
  'Psicosociales': 'Psicosociales',
  'Temperaturas elevadas': 'Temp. elevadas',
  'Temperaturas abatidas': 'Temp. abatidas',
  'Vibraciones': 'Vibraciones',
  'Biológicos Infecciosos': 'Biológicos'
};

export function contarAgentesRiesgo(data: { agentesRiesgoActuales?: string[] }[]): [string, number, number][] {
  const totalTrabajadores = data.length;
  const conteo: Record<string, number> = {};

  for (const trabajador of data) {
    const agentes = trabajador.agentesRiesgoActuales || [];
    for (const agente of agentes) {
      conteo[agente] = (conteo[agente] || 0) + 1;
    }
  }

  return Object.keys(etiquetasAgentesRiesgo).map((agente) => {
    const cantidad = conteo[agente] || 0;
    const porcentaje = totalTrabajadores > 0 ? Math.round((cantidad / totalTrabajadores) * 100) : 0;
    return [agente, cantidad, porcentaje];
  });
}

// DISTRIBUCIÓN POR SEXO
export function contarPorSexo(data: { sexo: string }[]): { Masculino: number, Femenino: number } {
  let masculino = 0;
  let femenino = 0;

  for (const item of data) {
    if (item.sexo === 'Masculino') {
      masculino++;
    } else if (item.sexo === 'Femenino') {
      femenino++;
    }
  }

  return { Masculino: masculino, Femenino: femenino };
}

// TENSIÓN ARTERIAL
export const categoriasTensionArterialOrdenadas = [
  'Óptima',
  'Normal',
  'Alta',
  'Hipertensión grado 1',
  'Hipertensión grado 2',
  'Hipertensión grado 3',
];

export function contarPorCategoriaTensionArterial(data: { categoriaTensionArterial: string | null }[]): [string, number, number][] {
  const conteo: Record<string, number> = {};
  let total = 0;

  for (const item of data) {
    if (item.categoriaTensionArterial && 
        item.categoriaTensionArterial.trim() !== '' && 
        categoriasTensionArterialOrdenadas.includes(item.categoriaTensionArterial)) {
      conteo[item.categoriaTensionArterial] = (conteo[item.categoriaTensionArterial] || 0) + 1;
      total++;
    }
  }

  return categoriasTensionArterialOrdenadas.map((categoria) => {
    const cantidad = conteo[categoria] || 0;
    const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;
    return [categoria, cantidad, porcentaje];
  });
}

// ===== NUEVA LÓGICA DE CLASIFICACIÓN AUDIOMETRÍA =====

type Metodo = 'AMA' | 'LFT';
type Binario = 'Normal' | 'Anormal' | 'Indeterminado';
type Categoria =
  | 'Normal'
  | 'Hipoacusia leve'
  | 'Hipoacusia moderada'
  | 'H. moderada-severa'
  | 'Hipoacusia severa'
  | 'Hipoacusia profunda'
  | 'Indeterminado';

export interface AudiometriaResumen {
  metodoAudiometria: Metodo | null | undefined;
  hipoacusiaBilateralCombinada: number | null | undefined; // HBC (%)
  perdidaAuditivaBilateralAMA: number | null | undefined;   // PPAB (%)
  caidaMaxDb: number | null | undefined;                    // dB (máximo)
}

const CATS_ORDEN: Categoria[] = [
  'Normal',
  'Hipoacusia leve',
  'Hipoacusia moderada',
  'H. moderada-severa',
  'Hipoacusia severa',
  'Hipoacusia profunda',
];

const isNum = (v: any): v is number => typeof v === 'number' && Number.isFinite(v);

// ---- Binario por método ----
function binarioAMA(ppab?: number | null): Binario {
  if (!isNum(ppab)) return 'Indeterminado';
  return ppab <= 25 ? 'Normal' : 'Anormal';
}
function binarioLFT(hbc?: number | null): Binario {
  if (!isNum(hbc)) return 'Indeterminado';
  // Corte definido por el cliente: HBC >= 10% es Anormal
  return hbc >= 10 ? 'Anormal' : 'Normal';
}

// ---- Categorías por método ----
function categoriaAMA(ppab?: number | null): Categoria {
  if (!isNum(ppab)) return 'Indeterminado';
  if (ppab <= 25) return 'Normal';
  if (ppab <= 40) return 'Hipoacusia leve';
  if (ppab <= 60) return 'Hipoacusia moderada';
  if (ppab <= 80) return 'Hipoacusia severa';
  return 'Hipoacusia profunda';
}

function categoriaLFT_porCaidaMax(db?: number | null): Categoria {
  if (!isNum(db)) return 'Indeterminado';
  if (db <= 25) return 'Normal';
  if (db <= 40) return 'Hipoacusia leve';
  if (db <= 55) return 'Hipoacusia moderada';
  if (db <= 70) return 'H. moderada-severa';
  if (db <= 90) return 'Hipoacusia severa';
  return 'Hipoacusia profunda';
}

// ---- Orquestadores ----
function clasificarBinario(item: AudiometriaResumen): Binario {
  const m = item.metodoAudiometria;
  if (m === 'AMA') return binarioAMA(item.perdidaAuditivaBilateralAMA);
  if (m === 'LFT') return binarioLFT(item.hipoacusiaBilateralCombinada);
  return 'Indeterminado';
}

function clasificarCategoria(item: AudiometriaResumen): Categoria {
  const m = item.metodoAudiometria;
  if (m === 'AMA') return categoriaAMA(item.perdidaAuditivaBilateralAMA);
  if (m === 'LFT') return categoriaLFT_porCaidaMax(item.caidaMaxDb);
  return 'Indeterminado';
}

// ======================================================
// 1) Proporción Normal/Anormal (para la gráfica de anillo)
//    Firma compatible con la antigua, pero ahora acepta AudiometriaResumen.
export function calcularProporcionAudiometria(
  data: AudiometriaResumen[],
  opts?: { incluirIndeterminado?: boolean }
): { Normal: number; Anormal: number; Indeterminado?: number } {
  let Normal = 0, Anormal = 0, Indeterminado = 0;

  for (const item of data) {
    const b = clasificarBinario(item);
    if (b === 'Normal') Normal++;
    else if (b === 'Anormal') Anormal++;
    else Indeterminado++;
  }

  return opts?.incluirIndeterminado
    ? { Normal, Anormal, Indeterminado }
    : { Normal, Anormal };
}

// ======================================================
// 2) Distribución por categoría (para la gráfica de barras)
//    Devuelve: [label, cantidad, porcentaje][];
//    Combina AMA y LFT usando la categoría correcta por método.
export function distribuirResultadosAudiometria(
  data: AudiometriaResumen[],
  opts?: { incluirIndeterminado?: boolean }
): [string, number, number][] {
  const counts: Record<Categoria, number> = {
    Normal: 0,
    'Hipoacusia leve': 0,
    'Hipoacusia moderada': 0,
    'H. moderada-severa': 0,
    'Hipoacusia severa': 0,
    'Hipoacusia profunda': 0,
    Indeterminado: 0,
  };

  // Contabilizar
  for (const item of data) {
    const cat = clasificarCategoria(item);
    counts[cat] = (counts[cat] ?? 0) + 1;
  }

  // Total para porcentaje (excluye Indeterminado si no se quiere mostrar)
  const totalParaPct = Object.entries(counts)
    .filter(([k]) => (opts?.incluirIndeterminado ? true : k !== 'Indeterminado'))
    .reduce((acc, [, v]) => acc + v, 0);

  const labels = opts?.incluirIndeterminado ? [...CATS_ORDEN, 'Indeterminado'] : [...CATS_ORDEN];

  return labels.map(label => {
    const cantidad = counts[label as Categoria] || 0;
    const porcentaje = totalParaPct > 0 ? Math.round((cantidad / totalParaPct) * 100) : 0;
    return [label, cantidad, porcentaje];
  });
}

// ===== Alias para compatibilidad retro (si hay llamadas antiguas) =====
export const distribuirResultadosHBC = distribuirResultadosAudiometria;

// (Opcional) Series separadas por método
export function distribuirPorMetodo(
  data: AudiometriaResumen[]
): { metodo: Metodo; series: [string, number, number][] }[] {
  const ama = data.filter(d => d.metodoAudiometria === 'AMA');
  const lft = data.filter(d => d.metodoAudiometria === 'LFT');

  return [
    { metodo: 'AMA', series: distribuirResultadosAudiometria(ama) },
    { metodo: 'LFT', series: distribuirResultadosAudiometria(lft) },
  ];
}

// ===== RESULTADOS CLINICOS (EKG / ESPIROMETRÍA / RAYOS X / LABORATORIO) =====
// Los bloques `rayosX` y `analisisLaboratorio` del dashboard incluyen arrays de categorías cuando ANORMAL.
export type ResultadoGlobalClinico = 'NORMAL' | 'ANORMAL' | 'NO_CONCLUYENTE';

export const ordenTipoAlteracionEkg = [
  'ANORMAL_ARRITMIA',
  'ANORMAL_TRASTORNO_CONDUCCION',
  'ANORMAL_ISQUEMIA_INFARTO',
  'ANORMAL_REPOLARIZACION',
  'ANORMAL_HIPERTROFIA_CRECIMIENTO_CAVIDADES',
  'ANORMAL_QT_ALTERADO'
];

export const ordenTipoAlteracionEspirometria = [
  'ANORMAL_OBSTRUCTIVO',
  'ANORMAL_RESTRICTIVO_SOSPECHADO',
  'ANORMAL_MIXTO'
];

export const etiquetasTipoAlteracionEkg: Record<string, string> = {
  ANORMAL_ARRITMIA: 'Arritmia',
  ANORMAL_TRASTORNO_CONDUCCION: 'Trastorno conducción',
  ANORMAL_ISQUEMIA_INFARTO: 'Isquemia/Infarto',
  ANORMAL_REPOLARIZACION: 'Repolarización',
  ANORMAL_HIPERTROFIA_CRECIMIENTO_CAVIDADES: 'Hipertrofia/cavidades',
  ANORMAL_QT_ALTERADO: 'QT alterado'
};

export const etiquetasTipoAlteracionEspirometria: Record<string, string> = {
  ANORMAL_OBSTRUCTIVO: 'Obstructivo',
  ANORMAL_RESTRICTIVO_SOSPECHADO: 'Restrictivo sospechado',
  ANORMAL_MIXTO: 'Mixto'
};

export const ordenTipoAlteracionRayosX = [
  'ALTERACION_PARENQUIMATOSA',
  'ALTERACION_PLEURAL',
  'ALTERACION_CARDIOMEDIASTINICA',
  'NODULO_O_MASA',
  'SECUELA_CRONICA',
  'ALTERACION_OSEA',
  'ALTERACION_ARTICULAR',
  'ALTERACION_ALINEACION',
  'CAMBIO_DEGENERATIVO',
  'FRACTURA_O_TRAUMA',
  'OTRA_ALTERACION',
];

export const ordenTipoAlteracionAnalisisLaboratorio = [
  'ALTERACION_HEMATOLOGICA',
  'ALTERACION_METABOLICA',
  'ALTERACION_RENAL',
  'ALTERACION_HEPATICA',
  'ALTERACION_INFECCIOSA_O_INFLAMATORIA',
  'ALTERACION_URINARIA',
  'OTRA_ALTERACION',
];

export const etiquetasTipoAlteracionRayosX: Record<string, string> = {
  ALTERACION_PARENQUIMATOSA: 'Parenquimatosa',
  ALTERACION_PLEURAL: 'Pleural',
  ALTERACION_CARDIOMEDIASTINICA: 'Cardiomediastínica',
  NODULO_O_MASA: 'Nódulo/masa',
  SECUELA_CRONICA: 'Secuela crónica',
  ALTERACION_OSEA: 'Ósea',
  ALTERACION_ARTICULAR: 'Articular',
  ALTERACION_ALINEACION: 'Alineación',
  CAMBIO_DEGENERATIVO: 'Degenerativo',
  FRACTURA_O_TRAUMA: 'Fractura/trauma',
  OTRA_ALTERACION: 'Otra',
};

export const etiquetasTipoAlteracionAnalisisLaboratorio: Record<string, string> = {
  ALTERACION_HEMATOLOGICA: 'Hematología',
  ALTERACION_METABOLICA: 'Metabolismo',
  ALTERACION_RENAL: 'Renal',
  ALTERACION_HEPATICA: 'Hepática',
  ALTERACION_INFECCIOSA_O_INFLAMATORIA: 'Infecciosa/inflamatoria',
  ALTERACION_URINARIA: 'Urinaria',
  OTRA_ALTERACION: 'Otra',
};

/** Normaliza campos `tipoAlteracionRayosX` o `tipoAlteracionAnalisisLaboratorio` (array en BD) para la distribución multi-categoría. */
export function mapToCategoriasMultiples<
  T extends { resultadoGlobal?: string | null }
>(
  data: (T & Record<string, unknown>)[],
  campo: 'tipoAlteracionRayosX' | 'tipoAlteracionAnalisisLaboratorio'
): { resultadoGlobal?: string | null; categorias?: string[] | null }[] {
  return data.map((item) => {
    const raw = item[campo];
    const categorias = Array.isArray(raw)
      ? raw.filter((c): c is string => typeof c === 'string' && c.length > 0)
      : raw != null && String(raw).trim() !== ''
        ? [String(raw)]
        : [];
    return { resultadoGlobal: item.resultadoGlobal, categorias };
  });
}

/** Cuenta categorías en resultados ANORMAL con arrays (un trabajador puede aportar varias categorías). */
export function distribuirResultadosClinicosPorCategoriasMultiples(
  data: {
    resultadoGlobal?: string | null;
    categorias?: string[] | null;
  }[],
  ordenCategorias: string[]
): [string, number, number][] {
  const conteo: Record<string, number> = {
    NORMAL: 0,
  };
  for (const c of ordenCategorias) {
    conteo[c] = 0;
  }

  for (const item of data) {
    const resultado = (item.resultadoGlobal || '').toUpperCase();
    if (resultado === 'NORMAL') {
      conteo.NORMAL += 1;
      continue;
    }
    if (resultado === 'ANORMAL' && Array.isArray(item.categorias)) {
      for (const cat of item.categorias) {
        if (cat && conteo[cat] !== undefined) {
          conteo[cat] += 1;
        }
      }
    }
  }

  const totalParaPct = Object.values(conteo).reduce((acc, v) => acc + v, 0);
  const labels = ['NORMAL', ...ordenCategorias];
  return labels.map((label) => {
    const cantidad = conteo[label] || 0;
    const porcentaje = totalParaPct > 0 ? Math.round((cantidad / totalParaPct) * 100) : 0;
    return [label, cantidad, porcentaje];
  });
}

export function calcularProporcionResultadosClinicos(
  data: { resultadoGlobal?: string | null }[]
): Record<ResultadoGlobalClinico, number> {
  const conteo: Record<ResultadoGlobalClinico, number> = {
    NORMAL: 0,
    ANORMAL: 0,
    NO_CONCLUYENTE: 0
  };

  for (const item of data) {
    const valor = (item.resultadoGlobal || '').toUpperCase() as ResultadoGlobalClinico;
    if (valor === 'NORMAL' || valor === 'ANORMAL' || valor === 'NO_CONCLUYENTE') {
      conteo[valor] += 1;
    }
  }

  return conteo;
}

export function distribuirResultadosClinicos(
  data: {
    resultadoGlobal?: string | null;
    tipoAlteracionEspirometria?: string | null;
    tipoAlteracionEKG?: string | null;
  }[],
  ordenCategorias: string[]
): [string, number, number][] {
  const conteo: Record<string, number> = {
    NORMAL: 0
  };

  for (const categoria of ordenCategorias) {
    conteo[categoria] = 0;
  }

  for (const item of data) {
    const resultado = (item.resultadoGlobal || '').toUpperCase();
    if (resultado === 'NORMAL') {
      conteo.NORMAL += 1;
      continue;
    }

    if (resultado === 'ANORMAL') {
      const alteracion =
        item.tipoAlteracionEspirometria ?? item.tipoAlteracionEKG ?? '';
      if (alteracion && conteo[alteracion] !== undefined) {
        conteo[alteracion] += 1;
      }
    }
  }

  const totalParaPct = Object.values(conteo).reduce((acc, v) => acc + v, 0);

  const labels = ['NORMAL', ...ordenCategorias];
  return labels.map((label) => {
    const cantidad = conteo[label] || 0;
    const porcentaje = totalParaPct > 0 ? Math.round((cantidad / totalParaPct) * 100) : 0;
    return [label, cantidad, porcentaje];
  });
}

// —— Tamizajes psicológicos (dashboard): reglas operativas, no diagnóstico clínico ——

const RESPUESTA_SI = 'Sí';

const CAMPOS_P1_TRASTORNOS_ESTADO_ANIMO = [
  'p1ExaltadoComportamientoNoHabitualOMetidoProblemas',
  'p1IrritableGritosPeleas',
  'p1MasSeguridadQueLoHabitual',
  'p1DormiaMenosSinNecesitarMasSueno',
  'p1HablabaMasOMasRapido',
  'p1PensamientosAgolpados',
  'p1DistraccionDificultadConcentracion',
  'p1MasEnergiaQueLoHabitual',
  'p1MasActivoOMasCosasQueLoHabitual',
  'p1MasSocialExtrovertido',
  'p1MasApetitoSexual',
  'p1CosasExageradasRiesgosas',
  'p1GastoDineroProblemas',
] as const;

/**
 * Tamizaje riesgo bipolar (TEA): ≥2 «Sí» en P1 y P2 (mismo período) = «Sí».
 * Revisar umbrales con criterio clínico interno.
 */
export function esTamizajeBipolarPositivoTEA(row: Record<string, unknown>): boolean {
  const totalSi = CAMPOS_P1_TRASTORNOS_ESTADO_ANIMO.filter((k) => row[k] === RESPUESTA_SI).length;
  return totalSi >= 2 && row.p2SituacionesMismoPeriodo === RESPUESTA_SI;
}

export function calcularAnilloTamizajeBipolarTEA(data: Record<string, unknown>[]) {
  if (!data.length) {
    return { positivos: 0, porcentaje: 0, chart: { labels: [] as string[], datasets: [] as any[] } };
  }

  let positivos = 0;
  let negativos = 0;
  for (const row of data) {
    if (esTamizajeBipolarPositivoTEA(row)) positivos++;
    else negativos++;
  }

  const total = positivos + negativos;
  const porcentaje = total > 0 ? Math.round((positivos / total) * 100) : 0;

  return {
    positivos,
    porcentaje,
    chart: {
      labels: ['Positivo', 'Negativo'],
      datasets: [
        {
          data: [positivos, negativos],
          backgroundColor: ['#b45309', '#D1D5DB'],
          hoverOffset: 8,
        },
      ],
    },
  };
}

/**
 * Mínimo de respuestas «Sí» en p1–p21 para marcar tamizaje prodromal como positivo.
 * Valor revisable con el equipo clínico.
 */
export const UMBRAL_SI_CPB_RIESGO_PSICOTICO = 5;

export function contarSiCuestionarioProdromalBreve(row: Record<string, unknown>): number {
  let n = 0;
  for (let i = 1; i <= 21; i++) {
    if (row[`p${i}`] === RESPUESTA_SI) n++;
  }
  return n;
}

export function calcularAnilloTamizajeProdromalCPB(data: Record<string, unknown>[]) {
  if (!data.length) {
    return { positivos: 0, porcentaje: 0, chart: { labels: [] as string[], datasets: [] as any[] } };
  }

  let positivos = 0;
  let negativos = 0;
  for (const row of data) {
    if (contarSiCuestionarioProdromalBreve(row) >= UMBRAL_SI_CPB_RIESGO_PSICOTICO) positivos++;
    else negativos++;
  }

  const total = positivos + negativos;
  const porcentaje = total > 0 ? Math.round((positivos / total) * 100) : 0;

  return {
    positivos,
    porcentaje,
    chart: {
      labels: ['Positivo', 'Negativo'],
      datasets: [
        {
          data: [positivos, negativos],
          backgroundColor: ['#b45309', '#D1D5DB'],
          hoverOffset: 8,
        },
      ],
    },
  };
}

const CAMPOS_SI_TRASTORNO_LIMITE = [
  'relacionesCercanasDiscusionesRupturas',
  'autolesionIntentoSuicidio',
  'impulsividadOtrosDosProblemas',
  'extremadamenteMalHumor',
  'enojadoFrecuenteActuaEnojadoSarcastico',
  'desconfianzaOtrasPersonas',
  'sensacionIrrealidadEntornoIrreal',
  'vacioCronico',
  'faltaIdentidadQuienEs',
  'esfuerzosEvitarAbandono',
] as const;

export function contarCriteriosSiTLP(row: Record<string, unknown>): number {
  return CAMPOS_SI_TRASTORNO_LIMITE.filter((k) => row[k] === RESPUESTA_SI).length;
}

/**
 * Franjas por conteo de «Sí» (0–10): 0–2 improbable, 3–5 posible, 6–10 probable.
 * Cortes revisables con criterio clínico interno.
 */
export function clasificarFranjaTamizajeTLP(totalSi: number): 0 | 1 | 2 {
  if (totalSi <= 2) return 0;
  if (totalSi <= 5) return 1;
  return 2;
}

export const ETIQUETAS_FRANJAS_TAMIZAJE_TLP = [
  'Síntomas improbables',
  'Posibles síntomas',
  'Síntomas probables',
] as const;

function contarTrabajadoresPorFranjasTamizajeTLP(
  data: Record<string, unknown>[]
): [number, number, number] {
  const counts: [number, number, number] = [0, 0, 0];
  for (const row of data) {
    const idx = clasificarFranjaTamizajeTLP(contarCriteriosSiTLP(row));
    counts[idx]++;
  }
  return counts;
}

/** Tabla [categoría, cantidad, porcentaje] alineada al gráfico de barras TLP. */
export function tablaFranjasTamizajeTLP(
  data: Record<string, unknown>[]
): [string, number, number][] {
  if (!data.length) return [];

  const counts = contarTrabajadoresPorFranjasTamizajeTLP(data);
  const total = data.length;

  return ETIQUETAS_FRANJAS_TAMIZAJE_TLP.map((label, i) => {
    const cantidad = counts[i];
    const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;
    return [label, cantidad, porcentaje];
  });
}

export function calcularBarrasFranjasTamizajeTLP(data: Record<string, unknown>[]) {
  if (!data.length) {
    return { labels: [] as string[], datasets: [] as any[] };
  }

  const counts = contarTrabajadoresPorFranjasTamizajeTLP(data);

  return {
    labels: [...ETIQUETAS_FRANJAS_TAMIZAJE_TLP],
    datasets: [
      {
        label: 'Trabajadores',
        data: [...counts],
        backgroundColor: ['#9CA3AF', '#F59E0B', '#b45309'],
      },
    ],
  };
}


