declare const pdfMake: typeof import('pdfmake/build/pdfmake');
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { setupPdfMakeKanitFonts } from '@/helpers/setupPdfMakeKanitFonts';

export interface DeclaracionVeracidadTrabajador {
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
}

export interface DeclaracionVeracidadProveedorSalud {
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

function formatFechaYYYYMMDD(fecha: string): string {
  const [year, month, day] = fecha.split('-');
  if (!year || !month || !day) return fecha;
  return `${day}-${month}-${year}`;
}

function formatNombreDeclaracion(trabajador: DeclaracionVeracidadTrabajador): string {
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

async function cargarLogoProveedor(
  proveedorSalud: DeclaracionVeracidadProveedorSalud | null,
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

function buildNombreArchivo(trabajador: DeclaracionVeracidadTrabajador, fecha: string): string {
  const apellido = trabajador.primerApellido?.trim() || 'Trabajador';
  const apellidoSanitizado = apellido.replace(/[^\w\-]/g, '_');
  return `Declaracion_Veracidad_${apellidoSanitizado}_${fecha}.pdf`;
}

function buildFooter(proveedorSalud: DeclaracionVeracidadProveedorSalud | null): TDocumentDefinitions['footer'] {
  const direccionCompleta = [
    proveedorSalud?.direccion,
    proveedorSalud?.municipio,
    proveedorSalud?.estado,
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

function buildHeader(logo: Content): TDocumentDefinitions['header'] {
  const tituloInforme = '                       DECLARACIÓN DE VERACIDAD DE INFORMACIÓN MÉDICA\n';

  const headerText: Content = {
    text: tituloInforme,
    style: 'header',
    alignment: 'right',
    margin: [0, 35, 40, 0],
  };

  return {
    columns: [logo, headerText],
  };
}

function buildDocDefinition(
  trabajador: DeclaracionVeracidadTrabajador,
  fechaFormateada: string,
  logo: Content,
  proveedorSalud: DeclaracionVeracidadProveedorSalud | null,
): TDocumentDefinitions {
  const nombreDeclaracion = formatNombreDeclaracion(trabajador);

  return {
    pageSize: 'LETTER',
    pageMargins: [40, 70, 40, 60],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 11,
      color: '#000000',
    },
    header: buildHeader(logo),
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
      {
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
      },
    ],
    footer: buildFooter(proveedorSalud),
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

export async function descargarDeclaracionVeracidadPdf(params: {
  trabajador: DeclaracionVeracidadTrabajador;
  fecha: string;
  proveedorSalud: DeclaracionVeracidadProveedorSalud | null;
}): Promise<void> {
  const { trabajador, fecha, proveedorSalud } = params;
  const fechaFormateada = formatFechaYYYYMMDD(fecha);

  await setupPdfMakeKanitFonts();

  const logo = await cargarLogoProveedor(proveedorSalud);
  const docDefinition = buildDocDefinition(
    trabajador,
    fechaFormateada,
    logo,
    proveedorSalud,
  );
  const nombreArchivo = buildNombreArchivo(trabajador, fecha);

  pdfMake.createPdf(docDefinition).download(nombreArchivo);
}

export { formatNombreDeclaracion };
