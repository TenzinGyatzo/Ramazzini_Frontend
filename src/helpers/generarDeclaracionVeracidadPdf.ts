/**
 * Declaración de veracidad de información médica: formato que el trabajador firma a puño y
 * letra (piezas comunes en formatoParaFirmaPdf.ts).
 */
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import {
  buildDocDefinitionFormato,
  buildFirmaFormato,
  buildFooterFormato,
  buildHeaderFormato,
  buildNombreArchivoFormato,
  descargarFormatoPdf,
  formatFechaYYYYMMDD,
  formatNombreTrabajadorFormato,
  type ProveedorSaludFormatoFirma,
  type TrabajadorFormatoFirma,
} from '@/helpers/formatoParaFirmaPdf';

export type DeclaracionVeracidadTrabajador = TrabajadorFormatoFirma;
export type DeclaracionVeracidadProveedorSalud = ProveedorSaludFormatoFirma;

const TITULO = '                       DECLARACIÓN DE VERACIDAD DE INFORMACIÓN MÉDICA\n';

const formatNombreDeclaracion = formatNombreTrabajadorFormato;

function buildDocDefinition(
  trabajador: DeclaracionVeracidadTrabajador,
  fechaFormateada: string,
  logo: Content,
  proveedorSalud: DeclaracionVeracidadProveedorSalud | null,
): TDocumentDefinitions {
  const nombreDeclaracion = formatNombreDeclaracion(trabajador);

  return buildDocDefinitionFormato({
    header: buildHeaderFormato(logo, TITULO),
    footer: buildFooterFormato(proveedorSalud),
    content: [
      {
        text: [
          'Yo, ',
          { text: nombreDeclaracion, bold: true },
          ', declaro bajo protesta de decir verdad que la información proporcionada por mí durante el presente examen médico laboral, incluyendo antecedentes personales, antecedentes patológicos, antecedentes familiares, hábitos, síntomas actuales, tratamientos médicos y cualquier otro dato relacionado con mi estado de salud, ',
          { text: 'es completa, verídica y proporcionada de buena fe.', bold: true },
        ],
        style: 'paragraph',
        margin: [0, 24, 0, 6],
      },
      {
        text: [
          'Asimismo, manifiesto que comprendo que la finalidad de este examen es evaluar mi estado de salud en relación con las condiciones del puesto de trabajo, con el objetivo de ',
          {
            text: 'proteger mi seguridad, la de mis compañeros de trabajo y la adecuada ejecución de mis actividades laborales.',
            bold: true,
          },
        ],
        style: 'paragraph',
        margin: [0, 0, 0, 6],
      },
      {
        text: [
          'Declaro que he respondido las preguntas del personal de salud ',
          { text: 'de manera honesta y sin omitir información relevante', bold: true },
          ', incluyendo enfermedades previas o actuales, cirugías, hospitalizaciones, padecimientos crónicos, consumo de medicamentos, antecedentes neurológicos, cardiovasculares, metabólicos o cualquier otra condición que pudiera tener implicaciones para el desempeño seguro de mis labores.',
        ],
        style: 'paragraph',
        margin: [0, 0, 0, 6],
      },
      {
        text: 'Reconozco que:',
        margin: [0, 0, 0, 4],
      },
      {
        text: [
          '1. ',
          {
            text: 'La omisión intencional o la declaración falsa de información médica relevante',
            bold: true,
          },
          ' puede afectar la correcta valoración de mi estado de salud.',
        ],
        style: 'paragraph',
        margin: [24, 0, 0, 4],
      },
      {
        text: [
          '2. Proporcionar información incorrecta ',
          {
            text: 'puede generar riesgos para mi propia integridad física, la de otras personas o la operación segura del centro de trabajo.',
            bold: true,
          },
        ],
        style: 'paragraph',
        margin: [24, 0, 0, 4],
      },
      {
        text: [
          '3. En caso de detectarse posteriormente que ',
          {
            text: 'he ocultado deliberadamente información relevante o he proporcionado datos falsos',
            bold: true,
          },
          ' durante este proceso, dicha conducta ',
          {
            text: 'podría constituir una falta grave de probidad o de buena fe',
            bold: true,
          },
          ', conforme a la legislación laboral aplicable y a las políticas internas de la empresa.',
        ],
        style: 'paragraph',
        margin: [24, 0, 0, 6],
      },
      {
        text: [
          'En tal caso, el empleador ',
          {
            text: 'podrá tomar las medidas administrativas o laborales que correspondan conforme al marco legal vigente',
            bold: true,
          },
          ', incluyendo la revisión de mi situación laboral.',
        ],
        style: 'paragraph',
        margin: [0, 0, 0, 6],
      },
      {
        text: [
          'Manifiesto que ',
          {
            text: 'he leído la presente declaración, que entiendo su contenido y que firmo la misma de manera libre y voluntaria.',
            bold: true,
          },
        ],
        style: 'paragraph',
        margin: [0, 0, 0, 30],
      },
      {
        text: [
          'Fecha: ',
          { text: fechaFormateada, bold: true },
        ],
        margin: [0, 0, 0, 30],
      },
      buildFirmaFormato(),
    ],
  });
}

export async function descargarDeclaracionVeracidadPdf(params: {
  trabajador: DeclaracionVeracidadTrabajador;
  fecha: string;
  proveedorSalud: DeclaracionVeracidadProveedorSalud | null;
}): Promise<void> {
  const { trabajador, fecha, proveedorSalud } = params;
  const fechaFormateada = formatFechaYYYYMMDD(fecha);

  await descargarFormatoPdf({
    nombreArchivo: buildNombreArchivoFormato('Declaracion_Veracidad', trabajador, fecha),
    proveedorSalud,
    construir: (logo) => buildDocDefinition(trabajador, fechaFormateada, logo, proveedorSalud),
  });
}

export { formatNombreDeclaracion };
