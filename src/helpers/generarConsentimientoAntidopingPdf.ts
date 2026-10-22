/**
 * Consentimiento informado para prueba de detección de sustancias (antidoping): formato que el
 * trabajador firma a puño y letra antes de la toma de muestra (piezas comunes en
 * formatoParaFirmaPdf.ts). El texto viene del backend.
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

// Como en la declaración: un solo renglón, con espacios al inicio para que la línea roja empiece
// a la misma altura (≈450 pt subrayados). Con Kanit, el título completo a 15 pt no cabe junto al
// logo (≈512 pt de ≈477 disponibles); a 13 pt mide ≈444 pt. Si cambia el título, hay que
// reajustar la sangría y el tamaño.
const SANGRIA_TITULO = '  ';
const TAMANO_TITULO = 13;

function buildDocDefinition(
  texto: TextoFormatoFirma,
  trabajador: TrabajadorFormatoFirma,
  fechaFormateada: string,
  logo: Content,
  proveedorSalud: ProveedorSaludFormatoFirma | null,
): TDocumentDefinitions {
  const definicion = buildDocDefinitionFormato({
    header: buildHeaderFormato(logo, `${SANGRIA_TITULO}${texto.titulo}\n`),
    footer: buildFooterFormato(proveedorSalud),
    content: buildCuerpoFormato(
      texto.bloques,
      { nombreTrabajador: formatNombreTrabajadorFormato(trabajador) },
      fechaFormateada,
    ),
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
  const texto = await obtenerTextoFormato('CONSENTIMIENTO_ANTIDOPING');

  await descargarFormatoPdf({
    nombreArchivo: buildNombreArchivoFormato('Consentimiento_Antidoping', trabajador, fecha),
    proveedorSalud,
    construir: (logo) => buildDocDefinition(texto, trabajador, fechaFormateada, logo, proveedorSalud),
  });
}
