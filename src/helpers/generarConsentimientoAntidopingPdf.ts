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

// En dos renglones: en uno solo no cabe junto al logo
const TITULO = 'CONSENTIMIENTO INFORMADO PARA\nPRUEBA DE DETECCIÓN DE SUSTANCIAS';

const parrafo = (text: string, ultimo = false): Content => ({
  text,
  style: 'paragraph',
  margin: [0, 0, 0, ultimo ? 30 : 8],
});

/** Texto del consentimiento con el nombre del trabajador y la fecha. */
export function contenidoConsentimientoAntidoping(nombreTrabajador: string, fechaFormateada: string): Content[] {
  return [
    {
      text: [
        'Yo, ',
        { text: nombreTrabajador, bold: true },
        ', manifiesto que he sido informado(a) sobre la realización de una prueba para la detección de sustancias ',
        // Sin noWrap, al justificar se separa en «y/ o»
        { text: 'y/o', noWrap: true },
        ' sus metabolitos (antidoping), mediante la obtención y análisis de una muestra biológica.',
      ],
      style: 'paragraph',
      margin: [0, 24, 0, 8],
    },
    parrafo(
      'Comprendo que la finalidad de esta prueba es identificar la posible presencia de las sustancias incluidas en el panel de análisis correspondiente y que el resultado puede formar parte de mi evaluación médica laboral.',
    ),
    parrafo(
      'Asimismo, comprendo que este tipo de pruebas tiene alcances y limitaciones, y que el resultado puede verse influido por factores como el tipo de muestra, las sustancias evaluadas, el tiempo transcurrido desde una posible exposición o consumo, medicamentos o tratamientos utilizados y las características del método empleado.',
    ),
    parrafo(
      'Reconozco que una prueba inicial o de tamizaje puede requerir estudios adicionales o una prueba confirmatoria cuando el resultado así lo amerite, por lo que un resultado positivo en una prueba de tamizaje no necesariamente constituye, por sí solo, una confirmación definitiva del consumo de una sustancia.',
    ),
    parrafo(
      'Declaro que he tenido la oportunidad de informar sobre medicamentos, tratamientos o productos que pudieran ser relevantes para la interpretación de los resultados y de plantear las dudas que considere necesarias antes de la realización de la prueba.',
    ),
    parrafo(
      'Manifiesto que comprendo la naturaleza y finalidad del procedimiento y otorgo mi consentimiento libre y voluntario para la obtención de la muestra y la realización de la prueba de detección de sustancias.',
      true,
    ),
    {
      text: ['Fecha: ', { text: fechaFormateada, bold: true }],
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
  // El título es más largo que el de la declaración: un poco más chico para que no se parta más
  return { ...definicion, styles: { ...definicion.styles, header: { ...definicion.styles?.header, fontSize: 13 } } };
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
