declare const pdfMake: typeof import('pdfmake/build/pdfmake') & {
  vfs?: Record<string, string>;
  fonts?: Record<
    string,
    {
      normal: string;
      bold: string;
      italics: string;
      bolditalics: string;
    }
  >;
};

const KANIT_FONT_FILES = {
  'Kanit-Light.ttf': '/fonts/Kanit-Light.ttf',
  'Kanit-Medium.ttf': '/fonts/Kanit-Medium.ttf',
  'Kanit-LightItalic.ttf': '/fonts/Kanit-LightItalic.ttf',
  'Kanit-MediumItalic.ttf': '/fonts/Kanit-MediumItalic.ttf',
} as const;

let kanitFontsReady: Promise<void> | null = null;

async function fetchFontAsBase64(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`No se pudo cargar la fuente: ${path}`);
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

/**
 * Registra Kanit en pdfMake bajo el nombre "Roboto", igual que el backend.
 * Debe llamarse antes de createPdf en el navegador.
 */
export function setupPdfMakeKanitFonts(): Promise<void> {
  if (!kanitFontsReady) {
    kanitFontsReady = (async () => {
      if (!pdfMake.vfs) {
        pdfMake.vfs = {};
      }

      await Promise.all(
        Object.entries(KANIT_FONT_FILES).map(async ([filename, path]) => {
          if (!pdfMake.vfs![filename]) {
            pdfMake.vfs![filename] = await fetchFontAsBase64(path);
          }
        }),
      );

      pdfMake.fonts = {
        ...pdfMake.fonts,
        Roboto: {
          normal: 'Kanit-Light.ttf',
          bold: 'Kanit-Medium.ttf',
          italics: 'Kanit-LightItalic.ttf',
          bolditalics: 'Kanit-MediumItalic.ttf',
        },
      };
    })();
  }

  return kanitFontsReady;
}
