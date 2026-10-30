import { defineAsyncComponent, defineComponent, h, shallowRef } from 'vue';
import { getToast } from '@/utils/toast';

/**
 * El visor de PDF pesa más que el resto del expediente (motor de pdf.js incluido),
 * así que se descarga aparte. Importar del paquete solo aquí, con import() dinámico:
 * una importación normal en cualquier componente lo devuelve al archivo de la vista.
 */
type ModuloVisor = typeof import('@vue-pdf-viewer/viewer');

const TEXTOS_VISOR = {
  documentPropertiesLabel: 'Propiedades del documento',
  documentPropertiesTooltip: 'Mostrar propiedades del documento',
  downloadFileLabel: 'Descargar',
  downloadFileTooltip: 'Descargar archivo',
  dragDropFileMessage: 'Arrastra y suelta un archivo aquí para abrirlo',
  dualPageLabel: 'Página doble',
  firstPageTooltip: 'Ir a la primera página',
  fullScreenLabel: 'Pantalla completa',
  fullScreenTooltip: 'Ver en pantalla completa',
  handToolLabel: 'Herramienta de mano',
  handToolTooltip: 'Mover página con herramienta de mano',
  horizontalScrollingLabel: 'Desplazamiento horizontal',
  lastPageLabel: 'Última página',
  lastPageTooltip: 'Ir a la última página',
  moreOptionTooltip: 'Más opciones',
  nextPageTooltip: 'Página siguiente',
  openLocalFileLabel: 'Abrir archivo local',
  openLocalFileTooltip: 'Seleccionar un archivo local para abrir',
  pageScrollingLabel: 'Desplazamiento por página',
  passwordConfirmLabel: 'Confirmar',
  passwordError: 'Contraseña incorrecta',
  passwordModalMessage: 'Este documento está protegido con contraseña. Introduce la contraseña para continuar.',
  passwordModalTitle: 'Contraseña requerida',
  passwordPlaceholder: 'Introducir contraseña',
  previousPageTooltip: 'Página anterior',
  printCancelLabel: 'Cancelar impresión',
  printLabel: 'Imprimir',
  printLoadingMessage: 'Preparando para imprimir...',
  printTooltip: 'Imprimir archivo',
  propertiesAuthorLabel: 'Autor',
  propertiesCreateOnLabel: 'Creado el',
  propertiesCreatorLabel: 'Creador',
  propertiesFilenameLabel: 'Nombre del archivo',
  propertiesFileSizeLabel: 'Tamaño del archivo',
  propertiesKeywordLabel: 'Palabras clave',
  propertiesModifiedOnLabel: 'Modificado el',
  propertiesPageCountLabel: 'Cantidad de páginas',
  propertiesPDFProducerLabel: 'Productor PDF',
  propertiesPDFVersionLabel: 'Versión de PDF',
  propertiesSubjectLabel: 'Asunto',
  propertiesTitleLabel: 'Título',
  rotateClockwiseLabel: 'Girar a la derecha',
  rotateClockwiseTooltip: 'Girar en sentido horario',
  rotateCounterclockwiseLabel: 'Girar a la izquierda',
  rotateCounterclockwiseTooltip: 'Girar en sentido antihorario',
  searchButtonTooltip: 'Buscar',
  searchCloseButtonTooltip: 'Cerrar búsqueda',
  searchInputPlaceholder: 'Buscar...',
  searchNextTooltip: 'Siguiente resultado',
  searchPrevTooltip: 'Resultado anterior',
  singlePageLabel: 'Página única',
  textSelectionLabel: 'Seleccionar texto',
  textSelectionTooltip: 'Activar herramienta de selección de texto',
  themeEnableDarkTooltip: 'Activar modo oscuro',
  themeEnableLightTooltip: 'Activar modo claro',
  thumbnailTooltip: 'Miniaturas',
  verticalScrollingLabel: 'Desplazamiento vertical',
  wrappedScrollingLabel: 'Desplazamiento envuelto',
  zoomActualSize: 'Tamaño real',
  zoomInTooltip: 'Acercar',
  zoomOutTooltip: 'Alejar',
  zoomPageFit: 'Ajustar a la página',
  zoomPageWidth: 'Ajustar al ancho de la página',
  zoomSelectTooltip: 'Seleccionar nivel de zoom'
};

let carga: Promise<ModuloVisor> | null = null;
const moduloVisor = shallowRef<ModuloVisor | null>(null);

/** Textos del visor; se llenan al cargar el paquete, antes de mostrar el visor. */
export const localizacionVisorPdf = shallowRef<Record<string, Record<string, string>> | undefined>();

export function cargarVisorPdf(): Promise<ModuloVisor> {
  carga ??= import('@vue-pdf-viewer/viewer')
    .then((modulo) => {
      moduloVisor.value = modulo;
      localizacionVisorPdf.value = {
        customLang: { ...modulo.Locales.en_US, ...TEXTOS_VISOR },
      };
      return modulo;
    })
    .catch((error) => {
      // Sin esto, un fallo de red dejaría el visor sin poder reintentar
      carga = null;
      throw error;
    });
  return carga;
}

const Cargando = defineComponent({
  name: 'VisorPdfCargando',
  render: () =>
    h(
      'div',
      {
        class: 'visor-cargando flex h-full w-full items-center justify-center',
        role: 'status',
        'aria-label': 'Cargando PDF',
      },
      [h('i', { class: 'fas fa-spinner fa-spin text-3xl text-gray-400' })],
    ),
});

function avisarFallo(_error: Error, _reintentar: () => void, fallar: () => void) {
  getToast().error('No se pudo cargar el visor de PDF. Revisa tu conexión e inténtalo de nuevo.');
  fallar();
}

/**
 * Debe envolver a VPdfViewer: useLicense usa provide(), así que tiene que correr en
 * el setup de un componente ancestro del visor. Fuera de uno, sale la marca de agua.
 * También valida la licencia con un servicio externo en cada montaje: por eso va
 * aquí y no en cada documento de la lista.
 */
export const VisorPdfLicencia = defineAsyncComponent({
  loader: async () => {
    const { useLicense } = await cargarVisorPdf();
    return defineComponent({
      name: 'VisorPdfLicencia',
      setup(_, { slots }) {
        // Si el valor falta o es incorrecto, se conserva la marca de agua
        useLicense({ licenseKey: import.meta.env.VITE_VPV_LICENSE });
        return () => slots.default?.();
      },
    });
  },
  loadingComponent: Cargando,
  delay: 0,
  onError: avisarFallo,
});

export const VPdfViewer = defineAsyncComponent(() =>
  cargarVisorPdf().then((modulo) => modulo.VPdfViewer),
);

/** Nivel de zoom «ancho de página». Solo se usa con el visor ya abierto. */
export function zoomAnchoDePagina() {
  return moduloVisor.value?.ZoomLevel.PageWidth;
}

/**
 * Descarga el visor cuando el navegador está libre, para que el primer PDF abra sin
 * esperar. Un fallo aquí se ignora: al abrir un PDF se reintenta y, si falla, se avisa.
 */
export function precargarVisorPdf() {
  if ((navigator as { connection?: { saveData?: boolean } }).connection?.saveData) return;
  const precargar = () => void cargarVisorPdf().catch(() => {});
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(precargar, { timeout: 4000 });
  } else {
    setTimeout(precargar, 1500);
  }
}
