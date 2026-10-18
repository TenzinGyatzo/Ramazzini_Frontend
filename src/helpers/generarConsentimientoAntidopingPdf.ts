/**
 * Consentimiento informado para prueba de detección de sustancias (antidoping): formato que el
 * trabajador firma a puño y letra antes de la toma de muestra (piezas comunes en
 * formatoParaFirmaPdf.ts).
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

// Como en la declaración: un solo renglón, con espacios al inicio para que la línea roja empiece
// a la misma altura (≈450 pt subrayados). Con Kanit, el título completo a 15 pt no cabe junto al
// logo (≈512 pt de ≈477 disponibles); a 13 pt mide ≈444 pt.
const TITULO = '  CONSENTIMIENTO INFORMADO PARA PRUEBA DE DETECCIÓN DE SUSTANCIAS\n';
const TAMANO_TITULO = 13;

const negrita = (text: string): Content => ({ text, bold: true });

const parrafo = (text: Content[], ultimo = false): Content => ({
  text,
  style: 'paragraph',
  margin: [0, 0, 0, ultimo ? 30 : 6],
});

/** Texto del consentimiento con el nombre del trabajador y la fecha. */
export function contenidoConsentimientoAntidoping(nombreTrabajador: string, fechaFormateada: string): Content[] {
  return [
    {
      text: [
        'Yo, ',
        negrita(nombreTrabajador),
        ', manifiesto que he sido informado(a) sobre la realización de una ',
        negrita('prueba para la detección de sustancias '),
        // Sin noWrap, al justificar se separa en «y/ o»
        { text: 'y/o', bold: true, noWrap: true },
        negrita(' sus metabolitos (antidoping)'),
        ', mediante la obtención y análisis de una muestra biológica.',
      ],
      style: 'paragraph',
      margin: [0, 24, 0, 6],
    },
    parrafo([
      'Comprendo que la finalidad de esta prueba es identificar la posible presencia de las sustancias incluidas en el panel de análisis correspondiente y que ',
      negrita('el resultado puede formar parte de mi evaluación médica laboral.'),
    ]),
    parrafo([
      'Asimismo, comprendo que ',
      negrita('este tipo de pruebas tiene alcances y limitaciones'),
      ', y que el resultado puede verse influido por factores como el tipo de muestra, las sustancias evaluadas, el tiempo transcurrido desde una posible exposición o consumo, medicamentos o tratamientos utilizados y las características del método empleado.',
    ]),
    parrafo([
      'Reconozco que una prueba inicial o de tamizaje puede requerir estudios adicionales o una prueba confirmatoria cuando el resultado así lo amerite, por lo que ',
      negrita(
        'un resultado positivo en una prueba de tamizaje no necesariamente constituye, por sí solo, una confirmación definitiva del consumo de una sustancia.',
      ),
    ]),
    parrafo([
      'Declaro que he tenido la oportunidad de ',
      negrita(
        'informar sobre medicamentos, tratamientos o productos que pudieran ser relevantes para la interpretación de los resultados',
      ),
      ' y de plantear las dudas que considere necesarias antes de la realización de la prueba.',
    ]),
    parrafo(
      [
        'Manifiesto que comprendo la naturaleza y finalidad del procedimiento y ',
        negrita('otorgo mi consentimiento libre y voluntario'),
        ' para la obtención de la muestra y la realización de la prueba de detección de sustancias.',
      ],
      true,
    ),
    {
      text: ['Fecha: ', negrita(fechaFormateada)],
      margin: [0, 0, 0, 30],
    },
    buildFirmaFormato(),
  ];
}

function buildDocDefinition(
  trabajador: TrabajadorFormatoFirma,
  fechaFormateada: string,
  logo: Content,
  proveedorSalud: ProveedorSaludFormatoFirma | null,
): TDocumentDefinitions {
  const definicion = buildDocDefinitionFormato({
    header: buildHeaderFormato(logo, TITULO),
    footer: buildFooterFormato(proveedorSalud),
    content: contenidoConsentimientoAntidoping(formatNombreTrabajadorFormato(trabajador), fechaFormateada),
  });
  return {
    ...definicion,
    styles: { ...definicion.styles, header: { ...definicion.styles?.header, fontSize: TAMANO_TITULO } },
  };
}

export async function descargarConsentimientoAntidopingPdf(params: {
  trabajador: TrabajadorFormatoFirma;
  fecha: string;
  proveedorSalud: ProveedorSaludFormatoFirma | null;
}): Promise<void> {
  const { trabajador, fecha, proveedorSalud } = params;
  const fechaFormateada = formatFechaYYYYMMDD(fecha);

  await descargarFormatoPdf({
    nombreArchivo: buildNombreArchivoFormato('Consentimiento_Antidoping', trabajador, fecha),
    proveedorSalud,
    construir: (logo) => buildDocDefinition(trabajador, fechaFormateada, logo, proveedorSalud),
  });
}
