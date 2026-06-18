import type { Content } from 'pdfmake/interfaces';
import { sanitizeRichHtml } from './sanitizeRichHtml';

/**
 * Verifica si el contenido HTML está realmente vacío
 * Ignora elementos vacíos como <p><br></p>, <p></p>, espacios en blanco, etc.
 */
export function isHtmlContentEmpty(html: string): boolean {
  if (!html || html.trim() === '') {
    return true;
  }

  // Crear un elemento temporal para parsear el HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Obtener solo el texto, sin HTML
  const textContent = tempDiv.textContent || tempDiv.innerText || '';
  
  // Verificar si el texto está vacío o solo contiene espacios/enters
  return textContent.trim() === '';
}

/**
 * Limpia el contenido HTML vacío, convirtiendo elementos vacíos a string vacío
 */
export function cleanEmptyHtml(html: string): string {
  if (!html || html.trim() === '') {
    return '';
  }

  // Patrones comunes de contenido vacío en editores HTML
  const emptyPatterns = [
    /^<p><br><\/p>$/i,
    /^<p><\/p>$/i,
    /^<p>\s*<\/p>$/i,
    /^<p><br\s*\/?><\/p>$/i,
    /^<div><br><\/div>$/i,
    /^<div><\/div>$/i,
    /^<div>\s*<\/div>$/i,
    /^<div><br\s*\/?><\/div>$/i
  ];

  // Verificar si coincide con algún patrón de contenido vacío
  for (const pattern of emptyPatterns) {
    if (pattern.test(html.trim())) {
      return '';
    }
  }

  // Si no coincide con patrones vacíos, verificar si el contenido de texto está vacío
  if (isHtmlContentEmpty(html)) {
    return '';
  }

  return html;
}

/**
 * Convierte HTML enriquecido a formato pdfMake Content
 * Soporta elementos básicos como párrafos, negritas, cursivas, listas y enlaces
 */
export function htmlToPdfMakeContent(html: string): Content[] {
  if (!html || html.trim() === '') {
    return [];
  }

  html = sanitizeRichHtml(html);

  // Crear un elemento temporal para parsear el HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const content: Content[] = [];

  // Procesar cada nodo hijo
  Array.from(tempDiv.childNodes).forEach(node => {
    const processedContent = processNode(node);
    if (processedContent) {
      content.push(processedContent);
    }
  });

  return content;
}

function processNode(node: Node): Content | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim();
    if (text) {
      return { text: text, style: 'textoNormal' };
    }
    return null;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    switch (tagName) {
      case 'p':
        return processParagraph(element);
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return processHeading(element);
      case 'ul':
      case 'ol':
        return processList(element);
      case 'li':
        return processListItem(element);
      case 'strong':
      case 'b':
        return processBold(element);
      case 'em':
      case 'i':
        return processItalic(element);
      case 'u':
        return processUnderline(element);
      case 'br':
        return { text: '\n' };
      case 'div':
        return processDiv(element);
      default:
        // Para otros elementos, procesar su contenido de texto
        const textContent = element.textContent?.trim();
        if (textContent) {
          return { text: textContent, style: 'textoNormal' };
        }
        return null;
    }
  }

  return null;
}

function processParagraph(element: Element): Content {
  const textContent = extractTextContent(element);
  return {
    text: textContent,
    style: 'textoNormal',
    margin: [0, 0, 0, 10]
  };
}

function processHeading(element: Element): Content {
  const textContent = extractTextContent(element);
  const level = parseInt(element.tagName.charAt(1));
  
  let fontSize: number;
  switch (level) {
    case 1: fontSize = 18; break;
    case 2: fontSize = 16; break;
    case 3: fontSize = 14; break;
    case 4: fontSize = 12; break;
    case 5: fontSize = 11; break;
    case 6: fontSize = 10; break;
    default: fontSize = 12;
  }

  return {
    text: textContent,
    fontSize: fontSize,
    bold: true,
    color: '#059669',
    margin: [0, 10, 0, 5]
  };
}

function processList(element: Element): Content {
  const items: Content[] = [];
  
  Array.from(element.children).forEach(child => {
    if (child.tagName.toLowerCase() === 'li') {
      const itemContent = processListItem(child);
      if (itemContent) {
        items.push(itemContent);
      }
    }
  });

  return {
    ul: items,
    margin: [20, 0, 0, 10]
  };
}

function processListItem(element: Element): Content {
  const textContent = extractTextContent(element);
  return {
    text: textContent,
    style: 'textoNormal'
  };
}

function processBold(element: Element): Content {
  const textContent = extractTextContent(element);
  return {
    text: textContent,
    bold: true,
    style: 'textoNormal'
  };
}

function processItalic(element: Element): Content {
  const textContent = extractTextContent(element);
  return {
    text: textContent,
    italics: true,
    style: 'textoNormal'
  };
}

function processUnderline(element: Element): Content {
  const textContent = extractTextContent(element);
  return {
    text: textContent,
    decoration: 'underline',
    style: 'textoNormal'
  };
}

function processDiv(element: Element): Content | null {
  const textContent = extractTextContent(element);
  if (textContent) {
    return {
      text: textContent,
      style: 'textoNormal',
      margin: [0, 0, 0, 5]
    };
  }
  return null;
}

function extractTextContent(element: Element): string {
  let text = '';
  
  Array.from(element.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const childElement = node as Element;
      const tagName = childElement.tagName.toLowerCase();
      
      if (['strong', 'b', 'em', 'i', 'u'].includes(tagName)) {
        // Para elementos de formato, extraer solo el texto
        text += childElement.textContent || '';
      } else if (tagName === 'br') {
        text += '\n';
      } else {
        // Para otros elementos, procesar recursivamente
        text += extractTextContent(childElement);
      }
    }
  });
  
  return text.trim();
}

/**
 * Convierte una tabla de recomendaciones a formato pdfMake
 */
export function recomendacionesTablaToPdfMake(recomendaciones: Array<{hallazgo: string, medidaPreventiva: string}>, numeroSeccion: number): Content[] {
  if (!recomendaciones || recomendaciones.length === 0) {
    return [];
  }

  // Verificar si todas las recomendaciones están vacías
  const hasValidContent = recomendaciones.some(item => 
    item.hallazgo.trim() !== '' || item.medidaPreventiva.trim() !== ''
  );
  
  if (!hasValidContent) {
    return [];
  }

  const content: Content[] = [];

  // Título de la sección
  content.push({
    text: `${numeroSeccion}. RECOMENDACIÓN DE MEDIDAS PREVENTIVAS`,
    style: 'tituloSeccion',
    pageBreak: 'before'
  });

  // Texto introductorio
  content.push({
    text: 'A continuación se presentan las medidas preventivas necesarias para prevenir el desarrollo o progresión de enfermedades en la población.',
    style: 'textoNormal',
    margin: [0, 0, 0, 20]
  });

  // Tabla de recomendaciones
  const tableBody = [
    [
      { text: 'HALLAZGO', style: 'tableHeaderMedium' },
      { text: 'MEDIDA PREVENTIVA RECOMENDADA', style: 'tableHeaderMedium' }
    ],
    ...recomendaciones.map(item => [
      { text: item.hallazgo, style: 'tableCellMedium' },
      { text: item.medidaPreventiva, style: 'tableCellMedium' }
    ])
  ];

  content.push({
    table: {
      headerRows: 1,
      widths: ['40%', '60%'],
      body: tableBody
    },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 20]
  });

  return content;
}

/**
 * Convierte recomendaciones en formato texto a pdfMake
 */
export function recomendacionesTextoToPdfMake(recomendacionesTexto: string, numeroSeccion: number): Content[] {
  if (isHtmlContentEmpty(recomendacionesTexto)) {
    return [];
  }

  const content: Content[] = [];

  // Título de la sección
  content.push({
    text: `${numeroSeccion}. RECOMENDACIÓN DE MEDIDAS PREVENTIVAS`,
    style: 'tituloSeccion',
    pageBreak: 'before'
  });

  // Texto introductorio
  content.push({
    text: 'A continuación se presentan las medidas preventivas necesarias para prevenir el desarrollo o progresión de enfermedades en la población.',
    style: 'textoNormal',
    margin: [0, 0, 0, 20]
  });

  // Convertir el HTML a contenido pdfMake
  const htmlContent = htmlToPdfMakeContent(recomendacionesTexto);
  content.push(...htmlContent);

  return content;
}

/**
 * Convierte conclusiones a pdfMake
 */
export function conclusionesToPdfMake(conclusiones: string, numeroSeccion: number): Content[] {
  if (isHtmlContentEmpty(conclusiones)) {
    return [];
  }

  const content: Content[] = [];

  // Título de la sección
  content.push({
    text: `${numeroSeccion}. CONCLUSIONES`,
    style: 'tituloSeccion',
    pageBreak: 'before'
  });

  // Convertir el HTML a contenido pdfMake
  const htmlContent = htmlToPdfMakeContent(conclusiones);
  content.push(...htmlContent);

  return content;
}
