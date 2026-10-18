/**
 * Piezas comunes de los formatos imprimibles que firma el trabajador a puño y letra
 * (declaración de veracidad, consentimiento informado): logo y datos del proveedor de salud,
 * encabezado con el título, pie de página, renglón de firma y descarga con pdfmake.
 * No se registran en el sistema: ya firmados, se suben como Documento Externo.
 */
import { cargarPdfMake } from '@/lib/cargarPdfMake';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { setupPdfMakeKanitFonts } from '@/helpers/setupPdfMakeKanitFonts';
import { toTitleCase } from '@/helpers/toTitleCase';

export interface TrabajadorFormatoFirma {
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
}

export interface ProveedorSaludFormatoFirma {
  direccion?: string;
  municipio?: string;
  estado?: string;
  telefono?: string;
  sitioWeb?: string;
  logotipoEmpresa?: {
    data?: string;
  };
}

const PAGE_LINE_X1 = 40;
const PAGE_LINE_X2 = 575;

/** `yyyy-mm-dd` → `dd-mm-yyyy`. */
export function formatFechaYYYYMMDD(fecha: string): string {
  const [year, month, day] = fecha.split('-');
  if (!year || !month || !day) return fecha;
  return `${day}-${month}-${year}`;
}

export function formatNombreTrabajadorFormato(trabajador: TrabajadorFormatoFirma): string {
  return [trabajador.nombre, trabajador.primerApellido, trabajador.segundoApellido]
    .filter(Boolean)
    .join(' ');
}

function formatearTelefono(telefono: string): string {
  if (!telefono) return '';

  if (telefono.startsWith('+')) {
    const countries = [
      { dialCode: '+52' },
      { dialCode: '+54' },
      { dialCode: '+55' },
      { dialCode: '+56' },
      { dialCode: '+57' },
      { dialCode: '+51' },
      { dialCode: '+58' },
      { dialCode: '+598' },
      { dialCode: '+595' },
      { dialCode: '+591' },
      { dialCode: '+593' },
      { dialCode: '+502' },
      { dialCode: '+506' },
      { dialCode: '+507' },
      { dialCode: '+504' },
      { dialCode: '+505' },
      { dialCode: '+503' },
      { dialCode: '+53' },
      { dialCode: '+1' },
    ];

    const country = countries.find((c) => telefono.startsWith(c.dialCode));
    if (country) {
      return `(${country.dialCode}) ${telefono.replace(country.dialCode, '')}`;
    }
  }

  if (telefono.length === 10 && /^\d{10}$/.test(telefono)) {
    return `(+52) ${telefono}`;
  }

  return telefono;
}

function buildRedHorizontalLine(margin: [number, number, number, number] = [0, 0, 0, 0]): Content {
  return {
    canvas: [
      {
        type: 'line',
        x1: PAGE_LINE_X1,
        y1: 0,
        x2: PAGE_LINE_X2,
        y2: 0,
        lineWidth: 0.5,
        lineColor: '#FF0000',
      },
      {
        type: 'line',
        x1: PAGE_LINE_X1,
        y1: 0.5,
        x2: PAGE_LINE_X2,
        y2: 0.5,
        lineWidth: 0.5,
        lineColor: '#FF0000',
      },
    ],
    margin,
  };
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function obtenerBase64DesdeUrl(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    return dataUrl.startsWith('data:image/') ? dataUrl : undefined;
  } catch {
    return undefined;
  }
}

export async function cargarLogoProveedor(
  proveedorSalud: ProveedorSaludFormatoFirma | null,
): Promise<Content> {
  const filename = proveedorSalud?.logotipoEmpresa?.data;
  if (filename) {
    const baseURL = import.meta.env.VITE_API_URL || 'https://ramazzini.app';
    const logoBase64 = await obtenerBase64DesdeUrl(`${baseURL}/proveedores-salud/logo/${filename}`);
    if (logoBase64) {
      return {
        image: logoBase64,
        width: 55,
        margin: [40, 20, 0, 0],
      };
    }
  }

  const fallbackLogo = await obtenerBase64DesdeUrl('/img/logosRamazzini/RamazziniBrand600x600.png');
  if (fallbackLogo) {
    return {
      image: fallbackLogo,
      width: 55,
      margin: [40, 20, 0, 0],
    };
  }

  return { text: '', margin: [40, 20, 0, 0] };
}

/** Nombre del archivo: `<prefijo>_<PrimerApellido>_<yyyy-mm-dd>.pdf`. */
export function buildNombreArchivoFormato(
  prefijo: string,
  trabajador: TrabajadorFormatoFirma,
  fecha: string,
): string {
  const apellido = trabajador.primerApellido?.trim() || 'Trabajador';
  const apellidoSanitizado = apellido.replace(/[^\w\-]/g, '_');
  return `${prefijo}_${apellidoSanitizado}_${fecha}.pdf`;
}

export function buildFooterFormato(
  proveedorSalud: ProveedorSaludFormatoFirma | null,
): TDocumentDefinitions['footer'] {
  const direccionCompleta = [
    proveedorSalud?.direccion,
    toTitleCase(proveedorSalud?.municipio),
    toTitleCase(proveedorSalud?.estado),
  ]
    .filter(Boolean)
    .join(', ');

  const footerText: Content[] = [
    {
      text:
        (direccionCompleta ? `${direccionCompleta}.` : '') +
        (proveedorSalud?.telefono
          ? ` Tel. ${formatearTelefono(proveedorSalud.telefono)}`
          : ''),
      bold: false,
      italics: true,
    },
  ];

  if (proveedorSalud?.sitioWeb) {
    footerText.push({
      text: `\n${proveedorSalud.sitioWeb}`,
      bold: false,
      link: proveedorSalud.sitioWeb.startsWith('http')
        ? proveedorSalud.sitioWeb
        : `https://${proveedorSalud.sitioWeb}`,
      italics: true,
      color: 'blue',
    });
  }

  return {
    stack: [
      buildRedHorizontalLine([0, 0, 0, 5]),
      {
        text: footerText,
        alignment: 'center',
        fontSize: 8,
        margin: [0, 0, 0, 0],
      },
    ],
  };
}

/** Encabezado: logo a la izquierda y título (estilo `header`) a la derecha. */
export function buildHeaderFormato(logo: Content, titulo: string): TDocumentDefinitions['header'] {
  const headerText: Content = {
    text: titulo,
    style: 'header',
    alignment: 'right',
    margin: [0, 35, 40, 0],
  };

  return {
    columns: [logo, headerText],
  };
}

/** Renglón de firma («Firma: ________»). */
export function buildFirmaFormato(): Content {
  return {
    columns: [
      {
        text: 'Firma:',
        width: 'auto',
        margin: [0, 48, 8, 0],
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 61,
            x2: 200,
            y2: 61,
            lineWidth: 0.5,
            lineColor: '#000000',
          },
        ],
        width: '*',
      },
    ],
    margin: [0, 0, 0, 0],
  };
}

/** Página carta, márgenes, fuente y estilos comunes; el contenido lo pone cada formato. */
export function buildDocDefinitionFormato(params: {
  header: TDocumentDefinitions['header'];
  footer: TDocumentDefinitions['footer'];
  content: Content[];
}): TDocumentDefinitions {
  return {
    pageSize: 'LETTER',
    pageMargins: [40, 70, 40, 60],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 11,
      color: '#000000',
    },
    header: params.header,
    content: params.content,
    footer: params.footer,
    styles: {
      header: {
        fontSize: 15,
        bold: false,
        color: 'blue',
        decoration: 'underline',
        decorationColor: 'red',
      },
      paragraph: {
        fontSize: 11,
        alignment: 'justify',
      },
    },
  };
}

/** Genera el PDF y lo descarga. */
export async function descargarFormatoPdf(params: {
  nombreArchivo: string;
  proveedorSalud: ProveedorSaludFormatoFirma | null;
  construir: (logo: Content) => TDocumentDefinitions;
}): Promise<void> {
  const pdfMake = await cargarPdfMake();
  await setupPdfMakeKanitFonts();

  const logo = await cargarLogoProveedor(params.proveedorSalud);
  pdfMake.createPdf(params.construir(logo)).download(params.nombreArchivo);
}
