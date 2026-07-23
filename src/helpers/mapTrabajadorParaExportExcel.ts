import { calcularEdad, calcularAntiguedad, determinarVistaCorregida } from '@/helpers/dates';

function mapAudiometria(row: any): string {
  const resumen = row.audiometriaResumen || null;
  if (!resumen) return '-';

  const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

  const binarioAMA = (ppab: unknown) => {
    if (!isNum(ppab)) return 'Indeterminado';
    return (ppab as number) <= 25 ? 'Normal' : 'Anormal';
  };

  const binarioLFT = (hbc: unknown) => {
    if (!isNum(hbc)) return 'Indeterminado';
    return (hbc as number) >= 10 ? 'Anormal' : 'Normal';
  };

  let resultado = 'Indeterminado';
  if (resumen.metodoAudiometria === 'AMA') {
    resultado = binarioAMA(resumen.perdidaAuditivaBilateralAMA);
  } else if (resumen.metodoAudiometria === 'LFT') {
    resultado = binarioLFT(resumen.hipoacusiaBilateralCombinada);
  }

  return resultado === 'Indeterminado' ? '-' : resultado;
}

function mapCategoriaAudiometria(row: any): string {
  const resumen = row.audiometriaResumen || null;
  if (!resumen) return '-';

  const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

  const categoriaAMA = (ppab: unknown) => {
    if (!isNum(ppab)) return 'Indeterminado';
    const n = ppab as number;
    if (n <= 25) return 'Normal';
    if (n <= 40) return 'Hipoacusia leve';
    if (n <= 60) return 'Hipoacusia moderada';
    if (n <= 80) return 'Hipoacusia severa';
    return 'Hipoacusia profunda';
  };

  const categoriaLFT_porHBC = (hbc: unknown) => {
    if (!isNum(hbc)) return 'Indeterminado';
    const n = hbc as number;
    if (n <= 10) return 'Normal';
    if (n <= 25) return 'Hipoacusia leve';
    if (n <= 40) return 'Hipoacusia moderada';
    if (n <= 60) return 'H. moderada-severa';
    if (n <= 80) return 'Hipoacusia severa';
    return 'Hipoacusia profunda';
  };

  let resultado = 'Indeterminado';
  if (resumen.metodoAudiometria === 'AMA') {
    resultado = categoriaAMA(resumen.perdidaAuditivaBilateralAMA);
  } else if (resumen.metodoAudiometria === 'LFT') {
    resultado = categoriaLFT_porHBC(resumen.hipoacusiaBilateralCombinada);
  }

  return resultado === 'Indeterminado' ? '-' : resultado;
}

/** Mapea una fila DataTables al shape usado por la exportación Excel. */
export function mapTrabajadorParaExportExcel(
  row: any,
  options: { includeSiresFields?: boolean } = {},
): Record<string, any> {
  const includeSiresFields = options.includeSiresFields ?? true;

  const mapped: Record<string, any> = {
    numeroEmpleado: row.numeroEmpleado,
    primerApellido: row.primerApellido || '',
    segundoApellido: row.segundoApellido || '',
    nombre: row.nombre,
    nss: row.nss || '',
    curp: row.curp || '',
    edad: calcularEdad(row.fechaNacimiento),
    sexo: row.sexo,
    escolaridad: row.escolaridad,
    puesto: row.puesto,
    antiguedad: calcularAntiguedad(row.fechaIngreso),
    telefono: row.telefono,
    estadoCivil: row.estadoCivil,
    imc: row.exploracionFisicaResumen?.categoriaIMC || '-',
    cintura: row.exploracionFisicaResumen?.categoriaCircunferenciaCintura || '-',
    categoriaTensionArterial: row.exploracionFisicaResumen?.categoriaTensionArterial || '-',
    aptitud: row.aptitudResumen?.aptitudPuesto || '-',
    requiereLentes: row.examenVistaResumen?.requiereLentesUsoGeneral || '-',
    correccionVisual: determinarVistaCorregida(
      row.examenVistaResumen?.requiereLentesUsoGeneral,
      Number(row.examenVistaResumen?.ojoIzquierdoLejanaConCorreccion),
      Number(row.examenVistaResumen?.ojoDerechoLejanaConCorreccion),
    ),
    agudeza: row.examenVistaResumen?.sinCorreccionLejanaInterpretacion || '-',
    daltonismo: row.examenVistaResumen?.interpretacionIshihara || '-',
    diabetico: row.historiaClinicaResumen?.diabeticosPP || '-',
    hipertensivo: row.historiaClinicaResumen?.hipertensivosPP || '-',
    cardiopatico: row.historiaClinicaResumen?.cardiopaticosPP || '-',
    epilepsia: row.historiaClinicaResumen?.epilepticosPP || '-',
    alergia: row.historiaClinicaResumen?.alergicos || '-',
    lumbalgia: row.historiaClinicaResumen?.lumbalgias || '-',
    accidente: row.historiaClinicaResumen?.accidentes || '-',
    quirurgico: row.historiaClinicaResumen?.quirurgicos || '-',
    otro: row.historiaClinicaResumen?.otros || '-',
    respiratorios: row.historiaClinicaResumen?.respiratorios || '-',
    alcoholismo: row.historiaClinicaResumen?.alcoholismo || '',
    tabaquismo: row.historiaClinicaResumen?.tabaquismo || '',
    agentesRiesgo:
      Array.isArray(row.agentesRiesgoActuales) && row.agentesRiesgoActuales.length
        ? row.agentesRiesgoActuales.join(', ')
        : '-',
    consultas: row.consultaResumen?.fechaNotaMedica ? 'Si' : 'No',
    audiometria: mapAudiometria(row),
    categoriaAudiometria: mapCategoriaAudiometria(row),
    espirometriaRc: row.resultadosClinicosResumen?.espirometria?.etiqueta ?? '-',
    ekgRc: row.resultadosClinicosResumen?.ekg?.etiqueta ?? '-',
    rayosXRc: row.resultadosClinicosResumen?.rayosX?.etiqueta ?? '-',
    laboratorioRc: row.resultadosClinicosResumen?.analisisLaboratorio?.etiqueta ?? '-',
    estadoLaboral: row.estadoLaboral || '-',
  };

  if (includeSiresFields) {
    mapped.folio = row.folio || '';
    mapped.entidadNacimiento = row.entidadNacimiento || '';
    mapped.paisNacimiento = row.paisNacimiento ?? '';
    mapped.paisResidencia = row.paisResidencia ?? '';
    mapped.entidadResidencia = row.entidadResidencia || '';
    mapped.municipioResidencia = row.municipioResidencia || '';
    mapped.localidadResidencia = row.localidadResidencia || '';
  }

  return mapped;
}
