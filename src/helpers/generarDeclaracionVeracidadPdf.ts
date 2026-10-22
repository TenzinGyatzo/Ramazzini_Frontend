/**
 * Declaración de veracidad de información médica: formato que el trabajador firma a puño y
 * letra (piezas comunes en formatoParaFirmaPdf.ts). El texto viene del backend.
 */
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import {
  buildCuerpoFormato,
  buildDocDefinitionFormato,
  buildFooterFormato,
  buildHeaderFormato,
  buildNombreArchivoFormato,
  descargarFormatoPdf,
  formatFechaYYYYMMDD,
  formatNombreTrabajadorFormato,
  obtenerTextoFormato,
  type ProveedorSaludFormatoFirma,
  type TrabajadorFormatoFirma,
} from '@/helpers/formatoParaFirmaPdf';
import type { TextoFormatoFirma } from '@/types/formatoFirma';

export type DeclaracionVeracidadTrabajador = TrabajadorFormatoFirma;
export type DeclaracionVeracidadProveedorSalud = ProveedorSaludFormatoFirma;

// Espacios al inicio para que la línea roja del título empiece a la misma altura que en el
// consentimiento. Si cambia el largo del título, hay que reajustarlos.
const SANGRIA_TITULO = ' '.repeat(23);

const formatNombreDeclaracion = formatNombreTrabajadorFormato;

function buildDocDefinition(
  texto: TextoFormatoFirma,
  trabajador: DeclaracionVeracidadTrabajador,
  fechaFormateada: string,
  logo: Content,
  proveedorSalud: DeclaracionVeracidadProveedorSalud | null,
): TDocumentDefinitions {
  return buildDocDefinitionFormato({
    header: buildHeaderFormato(logo, `${SANGRIA_TITULO}${texto.titulo}\n`),
    footer: buildFooterFormato(proveedorSalud),
    content: buildCuerpoFormato(
      texto.bloques,
      { nombreTrabajador: formatNombreDeclaracion(trabajador) },
      fechaFormateada,
    ),
  });
}

export async function descargarDeclaracionVeracidadPdf(params: {
  trabajador: DeclaracionVeracidadTrabajador;
  fecha: string;
  proveedorSalud: DeclaracionVeracidadProveedorSalud | null;
}): Promise<void> {
  const { trabajador, fecha, proveedorSalud } = params;
  const fechaFormateada = formatFechaYYYYMMDD(fecha);
  const texto = await obtenerTextoFormato('DECLARACION_VERACIDAD');

  await descargarFormatoPdf({
    nombreArchivo: buildNombreArchivoFormato('Declaracion_Veracidad', trabajador, fecha),
    proveedorSalud,
    construir: (logo) => buildDocDefinition(texto, trabajador, fechaFormateada, logo, proveedorSalud),
  });
}

export { formatNombreDeclaracion };
