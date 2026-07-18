<script setup>
import axios from 'axios';
import { authRequestConfig } from '@/lib/attachAuthToken';
import {
    buildClinicalFileUrl,
    fetchClinicalFileBlob,
    headClinicalFile,
} from '@/lib/clinicalFiles';
import { obtenerResultadoBinauralAudiometria } from '@/helpers/audiometriaCalculos';
import { convertirFechaISOaDDMMYYYY } from '@/helpers/dates';
import { ref, computed, onMounted, onUnmounted, nextTick, watch, unref, defineAsyncComponent } from 'vue';
import { Locales, useLicense, ZoomLevel } from '@vue-pdf-viewer/viewer';
import { enqueuePdfAvailabilityCheck } from '@/composables/usePdfAvailabilityQueue';
import { usePdfGenerationTracker } from '@/composables/usePdfGenerationTracker';
import { usePdfGenerationStore } from '@/stores/pdfGeneration';
import { getToast } from '@/utils/toast';

const VPdfViewer = defineAsyncComponent(() =>
  import('@vue-pdf-viewer/viewer').then((mod) => mod.VPdfViewer),
);
import { useRouter } from 'vue-router';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useDocumentosStore } from '@/stores/documentos';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { obtenerRutaDocumento, obtenerNombreArchivo, obtenerFechaDocumento, obtenerNombreDescargaCertificadoExpedito } from '@/helpers/rutas.ts';
import { esConclusionSinHallazgos } from '@/helpers/conclusionEntrevistaPsicologica';
import { cumpleCriterioTriajePositivoMdq } from '@/helpers/trastornosEstadoAnimoSteps';
import {
  contarFrecuenciaPQB,
  sumarMalestarPQB,
  textoInterpretacionPQB,
  esPositivoRiesgoPsicoticoPQB,
} from '@/helpers/cuestionarioProdromalBreveSteps';
import { ESTADO_CONTROL_CONDICION_OPTS, GRADO_OBESIDAD_OPTS } from '@/helpers/eventoSeguimientoCardiometabolicoOptions';
import ModalPdfEliminado from './ModalPdfEliminado.vue';
import EstadoDocumentoBadge from './badges/EstadoDocumentoBadge.vue';
import BadgeNotaAclaratoria from './badges/BadgeNotaAclaratoria.vue';
import DocumentHoverPreview from './DocumentHoverPreview.vue';
import { useUserPermissions } from '@/composables/useUserPermissions';
import { usePermissionRestrictions } from '@/composables/usePermissionRestrictions';
import { useUserStore } from '@/stores/user';

const router = useRouter();

// Función para obtener el color según el resultado del cuestionario
const getResultadoCuestionarioColor = (resultado, resultadoPersonalizado) => {
  if (!resultado) {
    // Si no hay resultado pero hay texto personalizado, usar color gris
    if (resultadoPersonalizado) {
      return 'gray';
    }
    return 'gray';
  }

  const resultadoLower = resultado.toLowerCase();

  if (resultadoLower === 'procedente') {
    return 'green';
  } else if (resultadoLower === 'procedente con precaución') {
    return 'yellow';
  } else if (resultadoLower === 'no procedente') {
    return 'red';
  } else if (resultadoLower === 'otro') {
    return 'gray'; // Color gris para resultado personalizado
  }

  return 'gray';
};

const getResultadoCuestionarioTextoCorto = (resultado, resultadoPersonalizado) => {
  if (!resultado) return '';

  const resultadoLower = resultado.toLowerCase();

  // Si es "OTRO" y hay texto personalizado, mostrar el texto personalizado
  if (resultadoLower === 'otro' && resultadoPersonalizado) {
    return 'PERSONALIZADO';
  }

  // Si el resultado está vacío pero hay texto personalizado, mostrar el texto personalizado
  if (!resultado && resultadoPersonalizado) {
    return 'PERSONALIZADO';
  }

  // Para otros casos, mostrar el resultado normal
  return resultado.toUpperCase();
};

// Función para obtener el texto a mostrar del resultado
const getResultadoCuestionarioTexto = (resultado, resultadoPersonalizado) => {
  if (!resultado) return '';

  const resultadoLower = resultado.toLowerCase();

  // Si es "OTRO" y hay texto personalizado, mostrar el texto personalizado
  if (resultadoLower === 'otro' && resultadoPersonalizado) {
    return resultadoPersonalizado.toUpperCase();
  }

  // Si el resultado está vacío pero hay texto personalizado, mostrar el texto personalizado
  if (!resultado && resultadoPersonalizado) {
    return resultadoPersonalizado.toUpperCase();
  }

  // Para otros casos, mostrar el resultado normal
  return resultado.toUpperCase();
};

const obtenerPABAudiometria = (audiometriaDoc) => {
  if (!audiometriaDoc || typeof audiometriaDoc !== 'object') return null;
  return obtenerResultadoBinauralAudiometria(audiometriaDoc);
};

// Función para obtener el nombre legible del tipo de documento
const obtenerNombreTipoDocumento = (tipo) => {
  if (!tipo) return '';

  const nombres = {
    // Singular
    'antidoping': 'Antidoping',
    'aptitud': 'Aptitud',
    'audiometria': 'Audiometría',
    'certificado': 'Certificado',
    'certificadoExpedito': 'Certificado Expedito',
    'examenVista': 'Examen Vista',
    'exploracionFisica': 'Exploración Física',
    'historiaClinica': 'Historia Clínica',
    'notaMedica': 'Nota Médica',
    'controlPrenatal': 'Control Prenatal',
    'historiaOtologica': 'Historia Otológica',
    'previoEspirometria': 'Previo Espirometría',
    'receta': 'Receta',
    'constanciaAptitud': 'Constancia de Aptitud',
    'documentoExterno': 'Documento Externo',
    'notaAclaratoria': 'Nota Aclaratoria',
    'eventoSeguimientoCardiometabolico': 'Evento de Seguimiento Cardiometabólico',
    'informeLongitudinalCardiometabolico': 'Informe Longitudinal Cardiometabólico',
    // Plural
    'antidopings': 'Antidoping',
    'aptitudes': 'Aptitud',
    'audiometrias': 'Audiometría',
    'certificados': 'Certificado',
    'certificadosExpedito': 'Certificado Expedito',
    'examenesVista': 'Examen Vista',
    'exploracionesFisicas': 'Exploración Física',
    'historiasClinicas': 'Historia Clínica',
    'notasMedicas': 'Nota Médica',
    'controlPrenatal': 'Control Prenatal',
    'historiasOtologicas': 'Historia Otológica',
    'previoEspirometria': 'Previo Espirometría',
    'recetas': 'Receta',
    'constanciasAptitud': 'Constancia de Aptitud',
    'documentosExternos': 'Documento Externo',
    'notasAclaratorias': 'Nota Aclaratoria',
    // Variantes con espacios
    'Documento Externo': 'Documento Externo',
    'Nota Aclaratoria': 'Nota Aclaratoria',
    'Historia Clinica': 'Historia Clínica',
    'Exploracion Fisica': 'Exploración Física',
    'Examen Vista': 'Examen Vista',
    'Historia Otologica': 'Historia Otológica',
    'Previo Espirometria': 'Previo Espirometría',
    'Nota Medica': 'Nota Médica',
    'Control Prenatal': 'Control Prenatal',
    'Certificado Expedito': 'Certificado Expedito',
    'Constancia de Aptitud': 'Constancia de Aptitud'
  };

  return nombres[tipo] || tipo;
};

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const documentos = useDocumentosStore();
const proveedorSaludStore = useProveedorSaludStore();
const periodoDePruebaFinalizado = proveedorSaludStore.proveedorSalud?.periodoDePruebaFinalizado;
const estadoSuscripcion = proveedorSaludStore.proveedorSalud?.estadoSuscripcion;
const finDeSuscripcion = proveedorSaludStore.proveedorSalud?.finDeSuscripcion
  ? new Date(proveedorSaludStore.proveedorSalud.finDeSuscripcion)
  : null;

const userStore = useUserStore();
const user = computed(() => userStore.user ?? {});

// Composables de permisos
const { canCreateDocument } = useUserPermissions();
const {
  canManageDocumentosDiagnostico,
  canManageDocumentosEvaluacion,
  canManageDocumentosExternos,
  canManageOtrosDocumentos,
  executeIfCanManageDocumentosDiagnostico,
  executeIfCanManageDocumentosEvaluacion,
  executeIfCanManageDocumentosExternos,
  executeIfCanManageOtrosDocumentos
} = usePermissionRestrictions();

const mostrarModalPdfEliminado = ref(false);

// Estado para verificar disponibilidad del PDF
const pdfDisponible = ref(true);
const verificandoPDF = ref(false);

// Estados para tooltips
const showTooltip = ref(false);
const tooltipPosition = ref({ top: 0, left: 0 });
const tooltipText = ref('');

const updateTooltipPosition = (event, text) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    tooltipPosition.value = {
        top: rect.top - 8,
        left: rect.left + rect.width / 2
    };
    tooltipText.value = text;
    showTooltip.value = true;
};

const hideTooltip = () => {
    showTooltip.value = false;
};

const emit = defineEmits(['eliminarDocumento', 'abrirModalAnular', 'abrirModalUpdate', 'closeModalUpdate', 'openSubscriptionModal', 'abrirModalFinalizar']);

// Función para determinar si se puede editar un documento según su tipo
const canEditDocument = (documentType) => {
  const tipoSinEspacios = documentType.toLowerCase().replace(/\s+/g, '');

  // Documentos de diagnóstico y certificación (solo aptitud y certificado)
  if (['aptitud', 'certificado'].includes(tipoSinEspacios)) {
    return canManageDocumentosDiagnostico.value;
  }
  // Otros documentos / cuestionarios adicionales (incluye certificado expedito, psicológicos y cardiometabólicos)
  if (['controlprenatal', 'historiaotologica', 'previoespirometria', 'certificadoexpedito', 'entrevistapsicologica', 'trastornosestadoanimo', 'cuestionarioprodromalbreve', 'trastornolimitepersonalidad', 'eventoseguimientocardiometabolico', 'informelongitudinalcardiometabolico'].includes(tipoSinEspacios)) {
    return canManageOtrosDocumentos.value;
  }

  // Documentos externos
  if (tipoSinEspacios === 'documentoexterno') {
    return canManageDocumentosExternos.value;
  }

  // Documentos de evaluación (resto de documentos)
  return canManageDocumentosEvaluacion.value;
};

// Función para determinar si se puede eliminar un documento según su tipo
const canDeleteDocument = (documentType) => {
  return canEditDocument(documentType); // Mismo permiso para editar y eliminar
};

// Función para manejar la edición con validación de permisos
const handleEditDocument = (documentoId, documentoTipo) => {
  const tipoSinEspacios = documentoTipo.toLowerCase().replace(/\s+/g, '');

  if (['aptitud', 'certificado'].includes(tipoSinEspacios)) {
    executeIfCanManageDocumentosDiagnostico(() => {
      editarDocumento(documentoId, documentoTipo);
    }, 'editar documentos de diagnóstico y certificación');
  } else if (['controlprenatal', 'historiaotologica', 'previoespirometria', 'certificadoexpedito', 'entrevistapsicologica', 'trastornosestadoanimo', 'cuestionarioprodromalbreve', 'trastornolimitepersonalidad', 'eventoseguimientocardiometabolico', 'informelongitudinalcardiometabolico'].includes(tipoSinEspacios)) {
    executeIfCanManageOtrosDocumentos(() => {
      editarDocumento(documentoId, documentoTipo);
    }, 'editar otros documentos');
  } else if (tipoSinEspacios === 'documentoexterno') {
    executeIfCanManageDocumentosExternos(() => {
      editarDocumento(documentoId, documentoTipo);
    }, 'editar documentos externos');
  } else {
    executeIfCanManageDocumentosEvaluacion(() => {
      editarDocumento(documentoId, documentoTipo);
    }, 'editar documentos de evaluación');
  }
};

// Función para manejar la edición de documentos externos con validación de permisos
const handleEditDocumentoExterno = async () => {
  executeIfCanManageDocumentosExternos(async () => {
    await documentos.fetchDocumentById(props.documentoTipo, trabajadores.currentTrabajador._id, props.documentoExterno._id);
    emit('abrirModalUpdate');
  }, 'editar documentos externos');
};

// Función para obtener el label del tipo de estudio del resultado vinculado
const getResultadoTipoLabel = (tipoEstudio) => {
  const labels = {
    'ESPIROMETRIA': 'Espirometría',
    'EKG': 'EKG',
    'TIPO_SANGRE': 'Tipo de Sangre',
  };
  return labels[tipoEstudio] || tipoEstudio;
};

// Función para manejar la eliminación con validación de permisos
const handleDeleteDocument = (documentoId, documentoNombre, documentoTipo) => {
  const tipoSinEspacios = documentoTipo.toLowerCase().replace(/\s+/g, '');

  if (['aptitud', 'certificado'].includes(tipoSinEspacios)) {
    executeIfCanManageDocumentosDiagnostico(() => {
      emit('eliminarDocumento', documentoId, documentoNombre, documentoTipo);
    }, 'eliminar documentos de diagnóstico y certificación');
  } else if (['controlprenatal', 'historiaotologica', 'previoespirometria', 'certificadoexpedito', 'entrevistapsicologica', 'trastornosestadoanimo', 'cuestionarioprodromalbreve', 'trastornolimitepersonalidad', 'eventoseguimientocardiometabolico', 'informelongitudinalcardiometabolico'].includes(tipoSinEspacios)) {
    executeIfCanManageOtrosDocumentos(() => {
      emit('eliminarDocumento', documentoId, documentoNombre, documentoTipo);
    }, 'eliminar otros documentos');
  } else if (tipoSinEspacios === 'documentoexterno') {
    executeIfCanManageDocumentosExternos(() => {
      emit('eliminarDocumento', documentoId, documentoNombre, documentoTipo);
    }, 'eliminar documentos externos');
  } else {
    executeIfCanManageDocumentosEvaluacion(() => {
      emit('eliminarDocumento', documentoId, documentoNombre, documentoTipo);
    }, 'eliminar documentos de evaluación');
  }
};

const handleAnularDocument = (documentoId, documentoNombre, documentoTipo) => {
  const tipoSinEspacios = documentoTipo.toLowerCase().replace(/\s+/g, '');

  const logic = () => {
    // Emitir evento para abrir el modal de anulación
    emit('abrirModalAnular', documentoId, documentoNombre, documentoTipo);
  };

  if (['aptitud', 'certificado'].includes(tipoSinEspacios)) {
    executeIfCanManageDocumentosDiagnostico(logic, 'anular documentos de diagnóstico y certificación');
  } else if (['controlprenatal', 'historiaotologica', 'previoespirometria', 'certificadoexpedito', 'entrevistapsicologica', 'trastornosestadoanimo', 'cuestionarioprodromalbreve', 'trastornolimitepersonalidad', 'eventoseguimientocardiometabolico', 'informelongitudinalcardiometabolico'].includes(tipoSinEspacios)) {
    executeIfCanManageOtrosDocumentos(logic, 'anular otros documentos');
  } else if (tipoSinEspacios === 'documentoexterno') {
    executeIfCanManageDocumentosExternos(logic, 'anular documentos externos');
  } else {
    executeIfCanManageDocumentosEvaluacion(logic, 'anular documentos de evaluación');
  }
};

const editarDocumento = (documentoId, documentoTipo) => {
    if (!proveedorSaludStore.proveedorSalud) return;

    if (periodoDePruebaFinalizado) {
        if (!estadoSuscripcion || estadoSuscripcion === 'inactive') {
            emit('openSubscriptionModal');
            return;
        }

        if (estadoSuscripcion === 'cancelled' && (!finDeSuscripcion || new Date() >= finDeSuscripcion)) {
            emit('openSubscriptionModal');
            return;
        }
    }

    documentos.setCurrentTypeOfDocument(documentoTipo);
    router.push({
        name: 'crear-documento',
        params: {
            idEmpresa: empresas.currentEmpresaId,
            idCentroTrabajo: centrosTrabajo.currentCentroTrabajoId,
            idTrabajador: trabajadores.currentTrabajadorId,
            tipoDocumento: documentoTipo,
            idDocumento: documentoId,
        },
    });
};

// URL base donde se almacenan los documentos
const BASE_URL = import.meta.env.VITE_API_URL;

const joinClinicalPath = (ruta, nombreArchivo) =>
    `${ruta}/${nombreArchivo}`.replace(/\/+/g, '/');

const extractRelativeClinicalPath = (urlOrPath) => {
    if (!urlOrPath || urlOrPath.startsWith('blob:')) return '';
    const pathStr = urlOrPath.startsWith('http')
        ? new URL(urlOrPath).pathname
        : urlOrPath;
    return pathStr.replace(/^\//, '').replace(/\/+/g, '/');
};

// Función dinámica para descargar un archivo basado en el documento// Función dinámica para descargar un archivo basado en el documento
const descargarArchivo = async (documento, tipoDocumento) => {
    try {
        if (isPdfGenerating.value) {
            getToast()?.open?.({
                message: 'El PDF se está generando. Espere un momento.',
                type: 'warning',
            });
            return;
        }

        console.log('Descargando archivo:', { documento, tipoDocumento });

        const ruta = obtenerRutaDocumento(documento, tipoDocumento);

        console.log('Ruta del documento:', ruta);
        if (!ruta) {
            console.warn('El documento no está disponible o no es válido:', { documento, tipoDocumento });
            alert('El documento no está disponible o no es válido.');
            return;
        }

        const fecha = obtenerFechaDocumento(documento) || 'SinFecha';

        // Para Certificado Expedito, usar el nombre personalizado para la descarga
        let nombreArchivo;
        let nombreArchivoReal;

        if (tipoDocumento === 'Certificado Expedito') {
            nombreArchivo = obtenerNombreDescargaCertificadoExpedito(fecha, trabajadores.currentTrabajador);
            nombreArchivoReal = obtenerNombreArchivo(documento, tipoDocumento, fecha, documentos);
        } else if (tipoDocumento === 'Nota Aclaratoria') {
            // Para Nota Aclaratoria, pasar el store de documentos para construir el nombre completo
            nombreArchivo = obtenerNombreArchivo(documento, tipoDocumento, fecha, documentos);
            nombreArchivoReal = nombreArchivo;
        } else {
            nombreArchivo = obtenerNombreArchivo(documento, tipoDocumento, fecha, documentos);
            nombreArchivoReal = nombreArchivo;
        }

        await descargarYGuardarArchivo(ruta, nombreArchivo, nombreArchivoReal);

    } catch (error) {
        console.error('Error al descargar el archivo:', error);
        alert('Ocurrió un error al intentar descargar el archivo.');
    }
};

const descargarYGuardarArchivo = async (ruta, nombreArchivo, nombreArchivoReal) => {
    try {
        const relativePath = joinClinicalPath(ruta, nombreArchivoReal);
        const response = await axios.get(buildClinicalFileUrl(relativePath), {
            responseType: 'blob',
            ...authRequestConfig(),
        });

        const blob = response.data;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        // Usar el nombre personalizado para el atributo download
        link.download = nombreArchivo;

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error('Error al descargar o guardar el archivo:', error);
        throw error;
    }
};


// If the value is empty or incorrect, the watermark will remain.
const licenseKey = import.meta.env.VITE_VPV_LICENSE;

// useLicense must be used here to ensure proper license
// initialization before the component renders.
useLicense({ licenseKey });

// Estados para mostrar el visor y la URL del PDF
const showPdfViewer = ref(false);
const pdfUrl = ref('');
/** Blob URL del PDF en memoria (src del visor); evita 2ª descarga HTTP. */
let pdfBlobUrl = null;
let hoverBlobUrl = null;
let imageBlobUrl = null;

function revokePdfBlobUrl() {
    if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        pdfBlobUrl = null;
    }
}

function revokeHoverBlobUrl() {
    if (hoverBlobUrl) {
        URL.revokeObjectURL(hoverBlobUrl);
        hoverBlobUrl = null;
    }
}

function revokeImageBlobUrl() {
    if (imageBlobUrl) {
        URL.revokeObjectURL(imageBlobUrl);
        imageBlobUrl = null;
    }
}

const pdfTotalPages = ref(null);
/** Ancho de la 1.ª página en px (viewport pdf.js a escala 1). */
const pdfFirstPageWidth = ref(null);

async function fetchPdfMetadata(blob) {
    try {
        const [pdfjs, workerModule] = await Promise.all([
            import('pdfjs-dist'),
            import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
        ]);
        pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
        const doc = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise;
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const metadata = {
            numPages: doc.numPages,
            pageWidth: viewport.width,
        };
        await doc.destroy();
        return metadata;
    } catch (error) {
        console.warn('[DocumentoItem] No se pudo leer metadatos del PDF:', error);
        return { numPages: 1, pageWidth: null };
    }
}

const localization = {
    customLang: {
        // Import the English localization as a fallback
        ...Locales.en_US,
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
    }
};

const buildPdfUrl = (ruta, nombrePDF, updatedAt = null, options = {}) => {
    const { useCacheBuster = true, fallbackToNow = false } = options;
    const relativePath = joinClinicalPath(ruta, nombrePDF);
    const fullPath = new URL(buildClinicalFileUrl(relativePath));

    if (useCacheBuster) {
        const cacheBuster = updatedAt || (fallbackToNow ? Date.now() : null);
        if (cacheBuster) {
            fullPath.searchParams.set('t', cacheBuster.toString());
        }
    }

    return fullPath.href;
};

const abrirPdf = async (ruta, nombrePDF, updatedAt = null) => {
    if (isPdfGenerating.value) {
        getToast()?.open?.({
            message: 'El PDF se está generando. Espere un momento.',
            type: 'warning',
        });
        return;
    }

    const fullPath = buildPdfUrl(ruta, nombrePDF, updatedAt, { useCacheBuster: true, fallbackToNow: true });
    const relativePath = joinClinicalPath(ruta, nombrePDF);

    try {
        const response = await axios.get(buildClinicalFileUrl(relativePath), {
            responseType: 'blob',
            ...authRequestConfig(),
        });

        const contentType = response.headers['content-type'];

        if (response.status === 200 && contentType === 'application/pdf') {
            const metadata = await fetchPdfMetadata(response.data);
            pdfTotalPages.value = metadata.numPages;
            pdfFirstPageWidth.value = metadata.pageWidth;
            revokePdfBlobUrl();
            pdfBlobUrl = URL.createObjectURL(response.data);
            pdfUrl.value = pdfBlobUrl;
            currentPdfUrl.value = fullPath;
            pdfScaleCorrectionAttempted = false;
            pdfScaleCorrectionPending = false;
            pdfViewerMountKey.value = 0;
            pdfViewerReady.value = false;
            showPdfViewer.value = true;
            await preparePdfViewerMount();
        } else {
            console.warn('El archivo no es un PDF o no existe.', { status: response.status, contentType });
            alert('El archivo PDF no existe o no es válido.');
        }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            if (!isPdfGenerating.value) {
                mostrarModalPdfEliminado.value = true;
            }
        } else {
            console.error('Error al intentar cargar el archivo PDF:', error.message);
            alert('Ocurrió un error al intentar cargar el archivo PDF.');
        }
    }
};

const pdfViewerRef = ref(null);
const pdfViewerContainerRef = ref(null);
/** Montar VPdfViewer solo cuando ya tenemos escala inicial (tope dinámico por altura). */
const pdfViewerReady = ref(false);
const pdfInitialScale = ref(1);
const pdfViewerMountKey = ref(0);
let pdfScaleCorrectionAttempted = false;
let pdfScaleCorrectionPending = false;
let pdfViewerResizeObserver = null;
let pdfViewerResizeDebounceTimer = null;
let pdfViewerClampTimer = null;
let pdfViewerLastObservedWidth = 0;
let pdfViewerClampGeneration = 0;

const PDF_VIEWER_RESIZE_DEBOUNCE_MS = 175;
const PDF_VIEWER_RESIZE_MIN_DELTA_PX = 8;
const PDF_VIEWER_MIN_SCALE_MOBILE = 0.85;

function getPdfMaxScaleByViewportHeight(height) {
    if (height >= 1300) return 2;
    if (height >= 1200) return 1.75;
    if (height >= 1000) return 1.5;
    if (height >= 850) return 1.25;
    return 1;
}
const PDF_VIEWER_MIN_SCALE_THRESHOLD = 0.75;
const PDF_VIEWER_THUMBNAIL_PANEL_PX = 200;
/** Margen interno del visor: scrollbar + padding de página (estimado pre-montaje). */
const PDF_VIEWER_HORIZONTAL_PADDING_PX = 48;
const PDF_VIEWER_SCALE_CORRECTION_THRESHOLD = 0.02;
const PDF_VIEWER_CLAMP_POLL_MS = 50;
const PDF_VIEWER_CLAMP_MAX_ATTEMPTS = 40;

function getPdfZoomControl() {
    const instance = pdfViewerRef.value;
    if (!instance) return null;
    const control =
        instance.zoomControl ??
        instance.$?.exposed?.zoomControl ??
        instance.$?.setupState?.zoomControl;
    return control?.value ?? control ?? null;
}

function waitForPdfZoomControl(callback, attempt = 0) {
    const zoomCtrl = getPdfZoomControl();
    if (zoomCtrl) {
        callback(zoomCtrl);
        return;
    }
    if (attempt >= 40 || !showPdfViewer.value) return;
    setTimeout(() => waitForPdfZoomControl(callback, attempt + 1), 50);
}

function readPdfZoomScale(zoomCtrl) {
    if (!zoomCtrl) return null;
    const raw = zoomCtrl.scale;
    const scale = typeof raw === 'number' ? raw : unref(raw);
    return typeof scale === 'number' && scale > 0 ? scale : null;
}

function clearPdfViewerClampTimer() {
    if (pdfViewerClampTimer) {
        clearTimeout(pdfViewerClampTimer);
        pdfViewerClampTimer = null;
    }
}

function disconnectPdfViewerResizeObserver() {
    pdfViewerClampGeneration += 1;
    clearPdfViewerClampTimer();
    if (pdfViewerResizeDebounceTimer) {
        clearTimeout(pdfViewerResizeDebounceTimer);
        pdfViewerResizeDebounceTimer = null;
    }
    if (pdfViewerResizeObserver) {
        pdfViewerResizeObserver.disconnect();
        pdfViewerResizeObserver = null;
    }
    pdfViewerLastObservedWidth = 0;
}

function enforcePdfZoomLimits(zoomCtrl) {
    const scale = readPdfZoomScale(zoomCtrl);
    if (scale == null) return false;

    if (scale > pdfViewerMaxScale.value) {
        zoomCtrl.zoom(pdfViewerMaxScale.value);
        return true;
    }

    if (windowWidth.value < 480 && scale < PDF_VIEWER_MIN_SCALE_THRESHOLD) {
        zoomCtrl.zoom(PDF_VIEWER_MIN_SCALE_MOBILE);
        return true;
    }

    return false;
}

function schedulePdfZoomClamp(zoomCtrl, generation, attempt = 0) {
    clearPdfViewerClampTimer();

    if (generation !== pdfViewerClampGeneration || !showPdfViewer.value) return;

    const changed = enforcePdfZoomLimits(zoomCtrl);
    const scale = readPdfZoomScale(zoomCtrl);

    const shouldContinue =
        attempt < PDF_VIEWER_CLAMP_MAX_ATTEMPTS &&
        (scale == null || changed || scale > pdfViewerMaxScale.value || attempt < 10);

    if (!shouldContinue) return;

    pdfViewerClampTimer = setTimeout(() => {
        pdfViewerClampTimer = null;
        schedulePdfZoomClamp(zoomCtrl, generation, attempt + 1);
    }, PDF_VIEWER_CLAMP_POLL_MS);
}

function getPdfContentAreaWidth() {
    const liveWidth = measurePdfContentWidthFromDom();
    if (liveWidth > 0) return liveWidth;

    const container = pdfViewerContainerRef.value;
    if (!container) return 0;

    let width = container.clientWidth;
    if (initialThumbnailsVisible.value) {
        width -= PDF_VIEWER_THUMBNAIL_PANEL_PX;
    }
    return Math.max(width - PDF_VIEWER_HORIZONTAL_PADDING_PX, 0);
}

function measurePdfContentWidthFromDom() {
    const host = pdfViewerContainerRef.value;
    if (!host) return 0;

    const pagesContainer = host.querySelector('.vpv-pages-container');
    if (pagesContainer?.clientWidth > 0) {
        return pagesContainer.clientWidth;
    }

    const innerContainer = host.querySelector('.vpv-inner-container');
    if (innerContainer?.clientWidth > 0) {
        const sidebar = host.querySelector('.vpv-sidebar-wrapper');
        const sidebarWidth = sidebar?.getBoundingClientRect().width ?? 0;
        return Math.max(innerContainer.clientWidth - sidebarWidth - 8, 0);
    }

    return 0;
}

function computeTargetPdfScale(areaWidthOverride = null) {
    const pageWidth = pdfFirstPageWidth.value;
    const areaWidth = areaWidthOverride ?? getPdfContentAreaWidth();
    if (!pageWidth || pageWidth <= 0 || areaWidth <= 0) return null;

    const fitScale = areaWidth / pageWidth;
    let scale = Math.min(fitScale, pdfViewerMaxScale.value);

    if (windowWidth.value < 480 && scale < PDF_VIEWER_MIN_SCALE_THRESHOLD) {
        scale = PDF_VIEWER_MIN_SCALE_MOBILE;
    }

    return Math.max(scale, 0.25);
}

function applyInitialScaleCorrection() {
    if (pdfScaleCorrectionAttempted || pdfScaleCorrectionPending || !showPdfViewer.value) return;

    pdfScaleCorrectionPending = true;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            pdfScaleCorrectionPending = false;
            if (pdfScaleCorrectionAttempted || !showPdfViewer.value) return;

            const target = computeTargetPdfScale();
            if (target == null) {
                pdfScaleCorrectionAttempted = true;
                return;
            }

            if (Math.abs(target - pdfInitialScale.value) <= PDF_VIEWER_SCALE_CORRECTION_THRESHOLD) {
                pdfScaleCorrectionAttempted = true;
                return;
            }

            pdfScaleCorrectionAttempted = true;
            pdfInitialScale.value = target;
            pdfViewerMountKey.value += 1;
        });
    });
}

function applyNumericFitZoom(zoomCtrl) {
    const target = computeTargetPdfScale();
    if (target == null) return false;

    zoomCtrl.zoom(target);

    const scale = readPdfZoomScale(zoomCtrl);
    if (scale != null && scale > pdfViewerMaxScale.value) {
        zoomCtrl.zoom(pdfViewerMaxScale.value);
    }
    return true;
}

function applyFitToWidth(retryCount = 0) {
    const zoomCtrl = getPdfZoomControl();
    if (!zoomCtrl) {
        if (retryCount < 40 && showPdfViewer.value) {
            setTimeout(() => applyFitToWidth(retryCount + 1), 50);
        }
        return;
    }

    const generation = pdfViewerClampGeneration;
    const hasPageWidth = (pdfFirstPageWidth.value ?? 0) > 0;
    const areaWidth = getPdfContentAreaWidth();

    if (hasPageWidth && areaWidth <= 0 && retryCount < 12) {
        nextTick(() => {
            if (generation !== pdfViewerClampGeneration) return;
            applyFitToWidth(retryCount + 1);
        });
        return;
    }

    if (applyNumericFitZoom(zoomCtrl)) {
        nextTick(() => {
            if (generation !== pdfViewerClampGeneration) return;
            applyNumericFitZoom(zoomCtrl);
        });
        schedulePdfZoomClamp(zoomCtrl, generation, 0);
        return;
    }

    // Sin metadatos: PageWidth y luego forzar tope por altura
    zoomCtrl.zoom(ZoomLevel.PageWidth);
    nextTick(() => {
        if (generation !== pdfViewerClampGeneration) return;
        schedulePdfZoomClamp(zoomCtrl, generation, 0);
    });
}

async function preparePdfViewerMount(attempt = 0) {
    if (!showPdfViewer.value) return;

    await nextTick();

    const scale = computeTargetPdfScale();
    if (scale == null) {
        if (attempt < 24) {
            requestAnimationFrame(() => preparePdfViewerMount(attempt + 1));
            return;
        }
        pdfInitialScale.value = 1;
    } else {
        pdfInitialScale.value = scale;
    }

    pdfViewerReady.value = true;
}

function handlePdfCanvasLoaded() {
    applyInitialScaleCorrection();
    waitForPdfZoomControl((zoomCtrl) => {
        const generation = pdfViewerClampGeneration;
        if (!applyNumericFitZoom(zoomCtrl)) {
            enforcePdfZoomLimits(zoomCtrl);
        }
        schedulePdfZoomClamp(zoomCtrl, generation, 0);
    });
}

const pdfAfterCanvasLoaded = { 1: handlePdfCanvasLoaded };

function scheduleApplyFitToWidth() {
    if (pdfViewerResizeDebounceTimer) {
        clearTimeout(pdfViewerResizeDebounceTimer);
    }
    pdfViewerResizeDebounceTimer = setTimeout(() => {
        pdfViewerResizeDebounceTimer = null;
        applyFitToWidth();
    }, PDF_VIEWER_RESIZE_DEBOUNCE_MS);
}

function connectPdfViewerResizeObserver() {
    disconnectPdfViewerResizeObserver();
    const el = pdfViewerContainerRef.value;
    if (!el) return;

    pdfViewerLastObservedWidth = el.clientWidth;
    pdfViewerResizeObserver = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect?.width ?? 0;
        if (Math.abs(width - pdfViewerLastObservedWidth) < PDF_VIEWER_RESIZE_MIN_DELTA_PX) return;
        pdfViewerLastObservedWidth = width;
        scheduleApplyFitToWidth();
    });
    pdfViewerResizeObserver.observe(el);
}

function handlePdfViewerLoaded() {
    applyInitialScaleCorrection();
    nextTick(() => {
        waitForPdfZoomControl((zoomCtrl) => {
            const generation = pdfViewerClampGeneration;
            applyNumericFitZoom(zoomCtrl);
            schedulePdfZoomClamp(zoomCtrl, generation, 0);
            connectPdfViewerResizeObserver();
        });
    });
}

// Función para cerrar el visor
const cerrarPdf = () => {
    disconnectPdfViewerResizeObserver();
    pdfViewerReady.value = false;
    pdfScaleCorrectionAttempted = false;
    pdfScaleCorrectionPending = false;
    pdfViewerMountKey.value = 0;
    showPdfViewer.value = false;
    revokePdfBlobUrl();
    pdfUrl.value = '';
    pdfTotalPages.value = null;
    pdfFirstPageWidth.value = null;
};

// Función para abrir un documento externo
const abrirDocumentoExterno = async (documento) => {
    const extension = obtenerExtensionArchivo(documento); // Determina la extensión del archivo
    const isImage = ['png', 'jpg', 'jpeg'].includes(extension);

    const rutaCompleta = construirRutaCompleta(documento); // Construye la ruta completa

    if (isImage) {
        abrirImagen(rutaCompleta);
    } else {
        const updatedAt = documento.updatedAt ? new Date(documento.updatedAt).getTime() : null;
        abrirPdf(documento.rutaDocumento, `${documento.nombreDocumento} ${convertirFechaISOaDDMMYYYY(documento.fechaDocumento)}.pdf`, updatedAt);
    }
};

// Función para obtener la extensión del archivo
const obtenerExtensionArchivo = (documento) => {
    const nombreArchivo = `${documento.nombreDocumento} ${convertirFechaISOaDDMMYYYY(documento.fechaDocumento)}${documento.extension}`;
    const archivo = documento.rutaDocumento.includes('.') ? documento.rutaDocumento.split('/').pop() : nombreArchivo;
    return archivo.split('.').pop().toLowerCase();
};

// Función para construir la ruta completa
const construirRutaCompleta = (documento) => {
    const nombreArchivo = `${documento.nombreDocumento} ${convertirFechaISOaDDMMYYYY(documento.fechaDocumento)}${documento.extension}`;
    if (documento.rutaDocumento.endsWith(nombreArchivo)) {
        return `${BASE_URL}/${documento.rutaDocumento}`; // Ruta ya incluye el nombre del archivo
    }
    return `${BASE_URL}/${documento.rutaDocumento}/${nombreArchivo}`; // Agrega el nombre del archivo
};

// Estado para el visor de imágenes
const showImageViewer = ref(false);
const imageUrl = ref('');
const imageZoom = ref(0.8); // Reducido de 1 a 0.8 para que las imágenes se vean más pequeñas por defecto
const rotationAngle = ref(0);
const currentPdfUrl = ref('');
const currentImageUrl = ref('');

// Estado para vista previa en hover
const hoverPreview = ref({
    visible: false,
    type: 'pdf',
    src: '',
    title: '',
    position: { x: 0, y: 0 },
    size: { width: 320, height: 240 },
    pdfAvailable: true,
    isRegenerable: false,
    openAction: null
});
const hoverPreviewKey = ref('');
const previewCache = new Map();
const canHover = ref(true);
const isHoveringPreview = ref(false);
let hoverTimer = null;
let hideTimer = null;
let hoverMediaQuery = null;

const HOVER_DELAY = 600;
const HIDE_DELAY = 160;
const PREVIEW_MARGIN = 120;

const updateHoverSupport = () => {
    canHover.value = true;
};

const computePreviewPosition = (rect, size) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // --- AJUSTE MANUAL HORIZONTAL POR MEDIA QUERIES ---
    // Aquí puedes ajustar el desplazamiento horizontal absoluto en píxeles.
    let horizontalOffset = 0;

    if (viewportWidth >= 3200) { // 4xl - superior
        horizontalOffset = 0;
    } else if (viewportWidth >= 2560) { // 4xl - inferior
        horizontalOffset = -215;
    } else if (viewportWidth >= 2240) { // 3xl - superior
        horizontalOffset = -215;
    } else if (viewportWidth >= 1920) { // 3xl - inferior
        horizontalOffset = -205;
    } else if (viewportWidth >= 1728) { // 2xl - superior
        horizontalOffset = -165;
    } else if (viewportWidth >= 1536) { // 2xl - inferior
        horizontalOffset = -60;
    } else if (viewportWidth >= 1408) { // xl - superior (1408px a 1535px)
        horizontalOffset = -20;
    } else if (viewportWidth >= 1280) { // xl - inferior (1280px a 1407px)
        horizontalOffset = 70;
    } else if (viewportWidth >= 1152) { // lg - superior (1152px a 1279px)
        horizontalOffset = 110;
    } else if (viewportWidth >= 1024) { // lg - inferior (1024px a 1151px)
        horizontalOffset = 180;
    } else if (viewportWidth >= 768) {  // md / base
        horizontalOffset = 260;
    } else if (viewportWidth >= 640) {  // sm
        horizontalOffset = 220;
    } else { // xs / mobile
        horizontalOffset = 0;
    }

    // Centrar horizontalmente respecto al elemento + offset manual
    let x = rect.left + (rect.width / 2) - (size.width / 2) + horizontalOffset;

    // Posicionar +150px parra posiciionar verticalmente
    let y = rect.top - size.height + 150;

    // Ajuste horizontal para no salir de la pantalla
    const SAFE_MARGIN = 12; // Usamos un margen pequeño para seguridad en los bordes
    if (x < SAFE_MARGIN) {
        x = SAFE_MARGIN;
    } else if (x + size.width > viewportWidth - SAFE_MARGIN) {
        x = viewportWidth - size.width - SAFE_MARGIN;
    }

    // Ajuste vertical: si no cabe arriba, mostrar abajo
    if (y < SAFE_MARGIN) {
        y = rect.bottom + 10;
        // Si tampoco cabe abajo, forzar dentro del viewport
        if (y + size.height > viewportHeight - SAFE_MARGIN) {
            y = Math.max(SAFE_MARGIN, viewportHeight - size.height - SAFE_MARGIN);
        }
    }

    return { x: Math.round(x), y: Math.round(y) };
};

const closeHoverPreview = () => {
    hoverPreview.value.visible = false;
    hoverPreview.value.src = '';
    hoverPreview.value.pdfAvailable = true;
    hoverPreview.value.isRegenerable = false;
    revokeHoverBlobUrl();
    // Limpiamos el cache para asegurar que la próxima vez verifique el estado real
    if (hoverPreviewKey.value) {
        previewCache.delete(hoverPreviewKey.value);
    }
    hoverPreviewKey.value = '';
};

const scheduleHidePreview = () => {
    clearTimeout(hoverTimer);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        if (!isHoveringPreview.value) {
            closeHoverPreview();
        }
    }, HIDE_DELAY);
};

const openHoverPreview = (targetOrEvent, payload) => {
    if (!canHover.value || showPdfViewer.value || showImageViewer.value) return;

    const target = targetOrEvent?.currentTarget || targetOrEvent?.target || targetOrEvent;
    let rect = null;

    if (target && typeof target.getBoundingClientRect === 'function') {
        rect = target.getBoundingClientRect();
    } else if (targetOrEvent?.clientX !== undefined) {
        // Fallback a coordenadas del mouse si no hay target con rect
        rect = {
            left: targetOrEvent.clientX,
            right: targetOrEvent.clientX,
            top: targetOrEvent.clientY,
            bottom: targetOrEvent.clientY,
            width: 0,
            height: 0
        };
    }

    if (!rect) return;

    const maxWidth = Math.min(180, window.innerWidth - PREVIEW_MARGIN * 2);
    // Ratio ajustado para llenar el contenedor verticalmente sin franjas negras
    const LETTER_RATIO = 1.522;

    let finalWidth = Math.round(maxWidth);
    let finalHeight = Math.round(maxWidth * LETTER_RATIO);
    const maxPossibleHeight = window.innerHeight - PREVIEW_MARGIN * 2;

    if (finalHeight > maxPossibleHeight) {
        finalHeight = Math.round(maxPossibleHeight);
        finalWidth = Math.round(finalHeight / LETTER_RATIO);
    }

    const size = { width: finalWidth, height: finalHeight };
    const position = computePreviewPosition(rect, size);

    const cached = previewCache.get(payload.key);
    const effectivePayload = cached || payload;
    if (!cached) {
        previewCache.set(payload.key, payload);
    }

    if (hoverPreviewKey.value === effectivePayload.key && hoverPreview.value.visible) {
        hoverPreview.value.position = position;
        hoverPreview.value.size = size;
        hoverPreview.value.pdfAvailable = effectivePayload.pdfAvailable !== undefined ? effectivePayload.pdfAvailable : true;
        hoverPreview.value.isRegenerable = effectivePayload.isRegenerable !== undefined ? effectivePayload.isRegenerable : false;
        // Actualizamos la acción incluso si la key es la misma
        hoverPreview.value.openAction = effectivePayload.openAction || null;
        return;
    }

    hoverPreviewKey.value = effectivePayload.key;
    hoverPreview.value = {
        visible: true,
        type: effectivePayload.type,
        src: effectivePayload.src,
        title: effectivePayload.title,
        position,
        size,
        pdfAvailable: effectivePayload.pdfAvailable !== undefined ? effectivePayload.pdfAvailable : true,
        isRegenerable: effectivePayload.isRegenerable !== undefined ? effectivePayload.isRegenerable : false,
        openAction: effectivePayload.openAction || null
    };
};

const schedulePdfHover = (event, ruta, nombrePDF, updatedAt, title) => {
    if (!canHover.value || isPdfGenerating.value) return;
    if (!ruta || !nombrePDF) return;
    clearTimeout(hideTimer);
    clearTimeout(hoverTimer);

    hoverTimer = setTimeout(async () => {
        if (isPdfGenerating.value) return;
        const tipoSinEspacios = props.documentoTipo.toLowerCase().replace(/\s+/g, '');
        const isRegenerable = tipoSinEspacios !== 'documentoexterno';
        const relativePath = joinClinicalPath(ruta, nombrePDF);
        const key = `pdf:${ruta}:${nombrePDF}:${updatedAt || 'no-ts'}:${pdfDisponible.value}`;
        const target = event?.currentTarget || event?.target || event;

        if (!pdfDisponible.value && isRegenerable) {
            openHoverPreview(target || event, {
                key,
                type: 'pdf',
                src: '',
                title: title || 'Documento PDF',
                pdfAvailable: false,
                isRegenerable: !isPdfFailed.value,
                openAction: () => {
                    if (!isPdfGenerating.value) {
                        mostrarModalPdfEliminado.value = true;
                    }
                },
            });
            return;
        }

        try {
            const blob = await fetchClinicalFileBlob(relativePath);
            revokeHoverBlobUrl();
            hoverBlobUrl = URL.createObjectURL(blob);
            openHoverPreview(target || event, {
                key,
                type: 'pdf',
                src: hoverBlobUrl,
                title: title || 'Documento PDF',
                pdfAvailable: true,
                isRegenerable,
                openAction: () => {
                    abrirPdf(ruta, nombrePDF, updatedAt);
                },
            });
        } catch {
            openHoverPreview(target || event, {
                key,
                type: 'pdf',
                src: '',
                title: title || 'Documento PDF',
                pdfAvailable: false,
                isRegenerable,
                openAction: () => {
                    if (isRegenerable) {
                        mostrarModalPdfEliminado.value = true;
                    }
                },
            });
        }
    }, HOVER_DELAY);
};

const scheduleDocumentoExternoHover = (event, documento) => {
    if (!documento || !canHover.value) return;
    clearTimeout(hideTimer);
    clearTimeout(hoverTimer);

    hoverTimer = setTimeout(async () => {
        const extension = obtenerExtensionArchivo(documento);
        const isImage = ['png', 'jpg', 'jpeg'].includes(extension);
        const keyBase = documento._id || documento.id || documento.rutaDocumento || documento.nombreDocumento;
        const target = event?.currentTarget || event?.target || event;
        if (isImage) {
            const rutaCompleta = construirRutaCompleta(documento);
            if (!rutaCompleta) return;
            try {
                const relativePath = extractRelativeClinicalPath(rutaCompleta);
                const blob = await fetchClinicalFileBlob(relativePath);
                revokeHoverBlobUrl();
                hoverBlobUrl = URL.createObjectURL(blob);
                openHoverPreview(target || event, {
                    key: `img:${keyBase}`,
                    type: 'image',
                    src: hoverBlobUrl,
                    title: documento.nombreDocumento || 'Imagen',
                });
            } catch {
                // omitir preview si no se puede cargar
            }
        } else {
            if (!documento.rutaDocumento || !documento.nombreDocumento || !documento.fechaDocumento) return;
            const updatedAt = documento.updatedAt ? new Date(documento.updatedAt).getTime() : null;
            const nombrePDF = `${documento.nombreDocumento} ${convertirFechaISOaDDMMYYYY(documento.fechaDocumento)}.pdf`;
            const relativePath = joinClinicalPath(documento.rutaDocumento, nombrePDF);
            try {
                const blob = await fetchClinicalFileBlob(relativePath);
                revokeHoverBlobUrl();
                hoverBlobUrl = URL.createObjectURL(blob);
                openHoverPreview(target || event, {
                    key: `pdf:${keyBase}:${updatedAt || 'no-ts'}:${pdfDisponible.value}`,
                    type: 'pdf',
                    src: hoverBlobUrl,
                    title: documento.nombreDocumento || 'Documento PDF',
                    pdfAvailable: true,
                    isRegenerable: false,
                    openAction: () => {
                        abrirPdf(documento.rutaDocumento, nombrePDF, updatedAt);
                    },
                });
            } catch {
                openHoverPreview(target || event, {
                    key: `pdf:${keyBase}:${updatedAt || 'no-ts'}:false`,
                    type: 'pdf',
                    src: '',
                    title: documento.nombreDocumento || 'Documento PDF',
                    pdfAvailable: false,
                    isRegenerable: false,
                });
            }
        }
    }, HOVER_DELAY);
};

const handlePreviewOpen = () => {
    if (hoverPreview.value.openAction) {
        hoverPreview.value.openAction();
    }
};

const handleHoverLeave = () => {
    scheduleHidePreview();
};

const handlePreviewEnter = () => {
    isHoveringPreview.value = true;
    clearTimeout(hideTimer);
};

const handlePreviewLeave = () => {
    isHoveringPreview.value = false;
    scheduleHidePreview();
};

watch([showPdfViewer, showImageViewer], () => {
    if (showPdfViewer.value || showImageViewer.value) {
        closeHoverPreview();
    }
});

onMounted(() => {
    updateHoverSupport();
});

onUnmounted(() => {
    clearTimeout(hoverTimer);
    clearTimeout(hideTimer);
    revokeHoverBlobUrl();
    revokeImageBlobUrl();
});

// Estado para el pan (desplazamiento) de la imagen
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const imagePosition = ref({ x: 0, y: 0 });
const lastImagePosition = ref({ x: 0, y: 0 });

// Función para abrir el visor de imágenes
const abrirImagen = async (rutaCompleta) => {
    try {
        const relativePath = extractRelativeClinicalPath(rutaCompleta);
        const blob = await fetchClinicalFileBlob(relativePath);

        if (blob.type.startsWith('image/')) {
            revokeImageBlobUrl();
            imageBlobUrl = URL.createObjectURL(blob);
            imageUrl.value = imageBlobUrl;
            currentImageUrl.value = relativePath;
            showImageViewer.value = true;

            // Agregar event listeners globales para el arrastre
            nextTick(() => {
                document.addEventListener('mousemove', handleGlobalMouseMove);
                document.addEventListener('mouseup', handleGlobalMouseUp);
                // Agregar event listener para ESC
                document.addEventListener('keydown', handleKeyDown);
            });
        } else {
            console.warn('El archivo no es una imagen válida.');
            mostrarModalPdfEliminado.value = true;
        }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            mostrarModalPdfEliminado.value = true;
        } else {
            console.error('Error al cargar la imagen:', error);
            alert('Ocurrió un error al intentar cargar la imagen.');
        }
    }
};

// Función para cerrar el visor de imágenes
const cerrarImagen = () => {
    showImageViewer.value = false;
    imageUrl.value = '';
    revokeImageBlobUrl();
    imageZoom.value = 0.8; // Mantiene el zoom reducido al cerrar
    rotationAngle.value = 0; // Resetea la rotación al cerrar
    // Resetear posición de la imagen
    imagePosition.value = { x: 0, y: 0 };
    lastImagePosition.value = { x: 0, y: 0 };

    // Resetear estado de arrastre y cursor
    isDragging.value = false;
    document.body.style.cursor = 'default';

    // Remover event listeners globales
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleGlobalMouseUp);
    document.removeEventListener('keydown', handleKeyDown);
};

// Funciones para controles de imagen
const rotarImagen = () => {
    rotationAngle.value += 90;
    // No usamos módulo para mantener la rotación continua en la misma dirección
};

const zoomIn = () => {
    imageZoom.value = Math.min(imageZoom.value * 1.2, 5);
};

const zoomOut = () => {
    const newZoom = Math.max(imageZoom.value / 1.2, 0.4);
    imageZoom.value = newZoom;

    // Solo resetear posición si el zoom es menor o igual a 1 Y la imagen está desplazada
    if (newZoom <= 1 && (imagePosition.value.x !== 0 || imagePosition.value.y !== 0)) {
        // Solo resetear posición, no el zoom
        imagePosition.value = { x: 0, y: 0 };
        lastImagePosition.value = { x: 0, y: 0 };
    }
};

const handleImageWheel = (event) => {
    event.preventDefault();
    if (event.deltaY < 0) {
        zoomIn();
    } else {
        zoomOut();
    }
};

// Event listener global para el mouse
const handleGlobalMouseMove = (event) => {
    if (isDragging.value) {
        onDrag(event);
    }
};

const handleGlobalMouseUp = (event) => {
    if (isDragging.value) {
        stopDrag(event);
    }

    // Asegurar que el cursor se restaure correctamente
    document.body.style.cursor = 'default';
};

// Funciones para el pan (desplazamiento) de la imagen
const startDrag = (event) => {
    // Prevenir el comportamiento de arrastre por defecto del navegador
    event.preventDefault();

    // Removida la limitación del zoom - ahora se puede arrastrar en cualquier zoom
    isDragging.value = true;
    dragStart.value = {
        x: event.clientX - imagePosition.value.x,
        y: event.clientY - imagePosition.value.y
    };

    // Cambiar cursor
    event.target.style.cursor = 'grabbing';
};

const onDrag = (event) => {
    if (!isDragging.value) return; // Removida la limitación del zoom

    // Prevenir el comportamiento de arrastre por defecto del navegador
    event.preventDefault();

    imagePosition.value = {
        x: event.clientX - dragStart.value.x,
        y: event.clientY - dragStart.value.y
    };
};

const stopDrag = (event) => {
    if (!isDragging.value) return;

    // Prevenir el comportamiento de arrastre por defecto del navegador
    if (event) {
        event.preventDefault();
    }

    isDragging.value = false;
    lastImagePosition.value = { ...imagePosition.value };

    // Restaurar cursor en todos los elementos de imagen
    const imageElements = document.querySelectorAll('.image-viewer img');
    imageElements.forEach(element => {
        element.style.cursor = 'grab';
    });

    // También restaurar el cursor en el documento
    document.body.style.cursor = 'default';
};

// Función para resetear la posición de la imagen
const resetImagePosition = () => {
    imagePosition.value = { x: 0, y: 0 };
    lastImagePosition.value = { x: 0, y: 0 };
    // Resetear también el zoom al valor inicial
    imageZoom.value = 0.8;
};

// Función para manejar cuando el mouse sale de la imagen
const handleMouseLeave = (event) => {
    // Solo cambiar el cursor si no estamos arrastrando
    if (!isDragging.value) {
        event.target.style.cursor = 'default';
    }
};

// Funciones para controles de PDF
const descargarPdfActual = async () => {
    if (isPdfGenerating.value) {
        getToast()?.open?.({
            message: 'El PDF se está generando. Espere un momento.',
            type: 'warning',
        });
        return;
    }
    if (currentPdfUrl.value) {
        try {
            // Determinar qué documento está siendo visualizado
            const tipoSinEspacios = props.documentoTipo.toLowerCase().replace(/\s+/g, '');
            let documento = null;
            let tipoDocumento = '';

            // Identificar el documento actual basado en el tipo
            switch (tipoSinEspacios) {
                case 'notaaclaratoria':
                    documento = props.notaAclaratoria;
                    tipoDocumento = 'Nota Aclaratoria';
                    break;
                case 'antidoping':
                    documento = props.antidoping;
                    tipoDocumento = 'Antidoping';
                    break;
                case 'aptitud':
                    documento = props.aptitud;
                    tipoDocumento = 'Aptitud';
                    break;
                case 'constanciaaptitud':
                    documento = props.constanciaAptitud;
                    tipoDocumento = 'Constancia de Aptitud';
                    break;
                case 'audiometria':
                    documento = props.audiometria;
                    tipoDocumento = 'Audiometria';
                    break;
                case 'certificado':
                    documento = props.certificado;
                    tipoDocumento = 'Certificado';
                    break;
                case 'certificadoexpedito':
                    documento = props.certificadoExpedito;
                    tipoDocumento = 'Certificado Expedito';
                    break;
                case 'examenvista':
                    documento = props.examenVista;
                    tipoDocumento = 'Examen Vista';
                    break;
                case 'exploracionfisica':
                    documento = props.exploracionFisica;
                    tipoDocumento = 'Exploracion Fisica';
                    break;
                case 'historiaclinica':
                    documento = props.historiaClinica;
                    tipoDocumento = 'Historia Clinica';
                    break;
                case 'notamedica':
                    documento = props.notaMedica;
                    tipoDocumento = 'Nota Medica';
                    break;
                case 'controlprenatal':
                    documento = props.controlPrenatal;
                    tipoDocumento = 'Control Prenatal';
                    break;
                case 'historiaotologica':
                    documento = props.historiaOtologica;
                    tipoDocumento = 'Historia Otologica';
                    break;
                case 'previoespirometria':
                    documento = props.previoEspirometria;
                    tipoDocumento = 'Previo Espirometria';
                    break;
                case 'entrevistaPsicologica':
                    documento = props.entrevistaPsicologica;
                    tipoDocumento = 'Entrevista Psicologica';
                    break;
                case 'trastornosEstadoAnimo':
                    documento = props.trastornosEstadoAnimo;
                    tipoDocumento = 'Trastornos Estado Animo';
                    break;
                case 'cuestionarioProdromalBreve':
                    documento = props.cuestionarioProdromalBreve;
                    tipoDocumento = 'Cuestionario Prodromal Breve';
                    break;
                case 'trastornoLimitePersonalidad':
                    documento = props.trastornoLimitePersonalidad;
                    tipoDocumento = 'Trastorno Limite Personalidad';
                    break;
                case 'eventoseguimientocardiometabolico':
                    documento = props.eventoSeguimientoCardiometabolico;
                    tipoDocumento = 'Evento Seguimiento Cardiometabolico';
                    break;
                case 'informelongitudinalcardiometabolico':
                    documento = props.informeLongitudinalCardiometabolico;
                    tipoDocumento = 'Informe Longitudinal Cardiometabolico';
                    break;
                case 'documentoexterno':
                    documento = props.documentoExterno;
                    tipoDocumento = 'Documento Externo';
                    break;
            }

            if (documento) {
                // Usar la misma lógica que descargarArchivo
                await descargarArchivo(documento, tipoDocumento);
            } else {
                // Fallback al método original si no se puede identificar el documento
                const relativePath = extractRelativeClinicalPath(currentPdfUrl.value);
                const response = await axios.get(buildClinicalFileUrl(relativePath), {
                    responseType: 'blob',
                    ...authRequestConfig(),
                });
                const blob = response.data;
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'documento.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }
        } catch (error) {
            console.error('Error al descargar el PDF:', error);
            alert('Error al descargar el PDF');
        }
    }
};

const imprimirPdfActual = () => {
    const urlToPrint = pdfUrl.value || pdfBlobUrl;
    if (urlToPrint) {
        const printWindow = window.open(urlToPrint, '_blank');
        if (printWindow) {
            printWindow.onload = () => {
                printWindow.print();
            };
        }
    }
};

const descargarImagenActual = async () => {
    if (currentImageUrl.value) {
        try {
            const relativePath = extractRelativeClinicalPath(currentImageUrl.value);
            const blob = relativePath
                ? await fetchClinicalFileBlob(relativePath)
                : await (await fetch(currentImageUrl.value)).blob();

            if (props.documentoExterno && props.documentoTipo.toLowerCase().replace(/\s+/g, '') === 'documentoexterno') {
                const extension = obtenerExtensionArchivo(props.documentoExterno);
                const nombreArchivo = `${props.documentoExterno.nombreDocumento} ${convertirFechaISOaDDMMYYYY(props.documentoExterno.fechaDocumento)}.${extension}`;
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = nombreArchivo;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'imagen.jpg';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }
        } catch (error) {
            console.error('Error al descargar la imagen:', error);
            alert('Error al descargar la imagen');
        }
    }
};

const handleCheckboxChange = (event, documento, tipoDocumento) => {
    const isChecked = event.target.checked;
    const rutaBase = obtenerRutaDocumento(documento, tipoDocumento); // Define cómo obtener la ruta del documento

    const fecha = obtenerFechaDocumento(documento) || 'SinFecha';
    const nombreArchivo = obtenerNombreArchivo(documento, tipoDocumento, fecha, documentos);

    const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');

    if (ruta) {
        // Documentos FINALIZADO/ANULADO no se pueden seleccionar para eliminación
        if (!isDeletableInBulkMode.value && isChecked) {
            props.toggleRouteSelection(ruta, false);
            return;
        }
        props.toggleRouteSelection(ruta, isChecked);
    }
};

const props = defineProps({
    documentoId: {
        type: String,
        required: true,
    },
    documentoTipo: {
        type: String,
        required: true,
    },
    isSelected: {
        type: Boolean,
        required: true,
    },
    toggleRouteSelection: {
        type: Function,
        required: true,
    },
    // Nueva prop para el modo eliminación
    isDeletionMode: {
        type: Boolean,
        default: false,
    },
    antidoping: [Object, String],
    aptitud: [Object, String],
    audiometria: [Object, String],
    constanciaAptitud: [Object, String],
    certificado: [Object, String],
    certificadoExpedito: [Object, String],
    receta: [Object, String],
    documentoExterno: [Object, String],
    examenVista: [Object, String],
    exploracionFisica: [Object, String],
    historiaClinica: [Object, String],
    notaMedica: [Object, String],
    notaAclaratoria: [Object, String],
    controlPrenatal: [Object, String],
    historiaOtologica: [Object, String],
    previoEspirometria: [Object, String],
    entrevistaPsicologica: [Object, String],
    trastornosEstadoAnimo: [Object, String],
    cuestionarioProdromalBreve: [Object, String],
    trastornoLimitePersonalidad: [Object, String],
    eventoSeguimientoCardiometabolico: [Object, String],
    informeLongitudinalCardiometabolico: [Object, String],
});

const currentDocumentData = computed(() => {
    return props.antidoping || props.aptitud || props.audiometria || props.constanciaAptitud ||
           props.certificado || props.certificadoExpedito || props.receta || props.documentoExterno ||
           props.examenVista || props.exploracionFisica || props.historiaClinica || props.notaMedica ||
           props.notaAclaratoria || props.controlPrenatal || props.historiaOtologica || props.previoEspirometria ||
           props.entrevistaPsicologica || props.trastornosEstadoAnimo || props.cuestionarioProdromalBreve || props.trastornoLimitePersonalidad ||
           props.eventoSeguimientoCardiometabolico || props.informeLongitudinalCardiometabolico;
});

const trackedPdfStatus = ref(null);
const { start: startPdfTracker, stop: stopPdfTracker } = usePdfGenerationTracker();
const pdfGenerationStore = usePdfGenerationStore();

const pdfStatusEffective = computed(() => {
    if (pdfGenerationStore.isLocalGenerating(props.documentoId)) {
      return 'generating';
    }
    return trackedPdfStatus.value ?? currentDocumentData.value?.pdfStatus ?? null;
});
const isPdfGenerating = computed(() => pdfStatusEffective.value === 'generating');
const isPdfFailed = computed(() => pdfStatusEffective.value === 'failed');

const ensurePdfGenerationTracker = () => {
    if (!isPdfGenerating.value) return;
    const tipo = props.documentoTipo?.toLowerCase?.().replace(/\s+/g, '') || props.documentoTipo;
    if (tipo === 'documentoexterno' || tipo === 'documentoExterno') return;

    startPdfTracker({
        documentType: props.documentoTipo,
        trabajadorId: trabajadores.currentTrabajadorId,
        documentId: props.documentoId,
        relativePdfPath: () => {
            try {
                const { ruta, nombre } = construirRutaYNombrePDF();
                if (!ruta || !nombre) return null;
                return joinClinicalPath(ruta, nombre);
            } catch {
                return null;
            }
        },
        onStatus: (status) => {
            trackedPdfStatus.value = status;
            const doc = currentDocumentData.value;
            if (doc && typeof doc === 'object') {
                doc.pdfStatus = status;
            }
            if (status === 'ready' || status === 'failed') {
                pdfGenerationStore.clearLocalGenerating(props.documentoId);
            }
            if (status === 'ready') {
                pdfDisponible.value = true;
                pdfCheckScheduled = false;
                schedulePdfCheck();
            } else if (status === 'failed') {
                pdfDisponible.value = false;
            }
        },
    });
};

watch(
    () => [
      currentDocumentData.value?.pdfStatus,
      pdfGenerationStore.isLocalGenerating(props.documentoId),
    ],
    ([status, localGenerating]) => {
        if (status === 'generating' || localGenerating) {
            trackedPdfStatus.value = 'generating';
            ensurePdfGenerationTracker();
            return;
        }
        if (status === 'ready' || status === 'failed') {
            trackedPdfStatus.value = status;
            stopPdfTracker();
            pdfGenerationStore.clearLocalGenerating(props.documentoId);
            if (status === 'ready') {
                pdfDisponible.value = true;
            }
        }
    },
    { immediate: true },
);

// Mapeo de campos de fecha para buscar documentos origen
const fechaCamposOrigen = {
    'antidopings': 'fechaAntidoping',
    'aptitudes': 'fechaAptitudPuesto',
    'audiometrias': 'fechaAudiometria',
    'certificados': 'fechaCertificado',
    'certificadosExpedito': 'fechaCertificadoExpedito',
    'documentosExternos': 'fechaDocumento',
    'examenesVista': 'fechaExamenVista',
    'exploracionesFisicas': 'fechaExploracionFisica',
    'historiasClinicas': 'fechaHistoriaClinica',
    'notasMedicas': 'fechaNotaMedica',
    'controlPrenatal': 'fechaInicioControlPrenatal',
    'historiaOtologica': 'fechaHistoriaOtologica',
    'previoEspirometria': 'fechaPrevioEspirometria',
    'recetas': 'fechaReceta',
    'constanciasAptitud': 'fechaConstanciaAptitud',
    'entrevistasPsicologicas': 'fechaEntrevistaPsicologica',
    'trastornosEstadoAnimo': 'fechaTrastornosEstadoAnimo',
    'cuestionarioProdromalBreve': 'fechaCuestionarioProdromalBreve',
    'trastornoLimitePersonalidad': 'fechaTrastornoLimitePersonalidad',
    'eventoSeguimientoCardiometabolico': 'fechaEventoSeguimientoCardiometabolico',
    'informeLongitudinalCardiometabolico': 'fechaInformeLongitudinalCardiometabolico',
};

// Mapeo de tipos singulares a plurales para buscar en el store
const tipoSingularAPlural = {
    'antidoping': 'antidopings',
    'aptitud': 'aptitudes',
    'audiometria': 'audiometrias',
    'certificado': 'certificados',
    'certificadoExpedito': 'certificadosExpedito',
    'documentoExterno': 'documentosExternos',
    'examenVista': 'examenesVista',
    'exploracionFisica': 'exploracionesFisicas',
    'historiaClinica': 'historiasClinicas',
    'notaMedica': 'notasMedicas',
    'controlPrenatal': 'controlPrenatal',
    'historiaOtologica': 'historiaOtologica',
    'previoEspirometria': 'previoEspirometria',
    'receta': 'recetas',
    'constanciaAptitud': 'constanciasAptitud',
    'entrevistaPsicologica': 'entrevistasPsicologicas',
    'trastornosEstadoAnimo': 'trastornosEstadoAnimo',
    'cuestionarioProdromalBreve': 'cuestionarioProdromalBreve',
    'trastornoLimitePersonalidad': 'trastornoLimitePersonalidad',
    'eventoSeguimientoCardiometabolico': 'eventoSeguimientoCardiometabolico',
    'informeLongitudinalCardiometabolico': 'informeLongitudinalCardiometabolico',
};

// Función para normalizar tipo de documento a plural
const normalizarTipoAPlural = (tipo) => {
    if (!tipo) return tipo;

    // Normalizar: quitar espacios y convertir a formato consistente
    const normalizado = tipo.replace(/\s+/g, '');

    // Primero intentar directamente
    if (tipoSingularAPlural[tipo]) {
        return tipoSingularAPlural[tipo];
    }

    // Convertir primera letra a minúscula y quitar espacios: "Historia Clinica" -> "historiaClinica"
    const camelCase = normalizado.charAt(0).toLowerCase() + normalizado.slice(1);
    if (tipoSingularAPlural[camelCase]) {
        return tipoSingularAPlural[camelCase];
    }

    // Si ya está en camelCase pero con mayúscula inicial, convertirla
    if (tipoSingularAPlural[normalizado]) {
        return tipoSingularAPlural[normalizado];
    }

    // Buscar en el mapeo si hay alguna key que al normalizar coincida
    const tipoNormalizadoParaComparar = normalizado.toLowerCase();
    for (const [key, value] of Object.entries(tipoSingularAPlural)) {
        const keyNormalizada = key.replace(/\s+/g, '').toLowerCase();
        if (keyNormalizada === tipoNormalizadoParaComparar) {
            return value;
        }
    }

    return tipo;
};

// Computed para verificar si el documento actual tiene notas aclaratorias asociadas
const tieneNotasAclaratorias = computed(() => {
  if (!documentos.documentsByYear || !props.documentoId) return false;

  // Normalizar el tipo del documento actual (puede venir como 'historiaClinica', 'Historia Clinica', etc.)
  const tipoNormalizado = normalizarTipoAPlural(props.documentoTipo);

  for (const yearData of Object.values(documentos.documentsByYear)) {
    if (yearData.notasAclaratorias && Array.isArray(yearData.notasAclaratorias)) {
      const notaEncontrada = yearData.notasAclaratorias.find(nota => {
        if (nota.documentoOrigenId !== props.documentoId) return false;

        // Normalizar el tipo de la nota aclaratoria
        const notaTipoNormalizado = normalizarTipoAPlural(nota.documentoOrigenTipo);

        // Comparar ambos tipos normalizados
        return notaTipoNormalizado === tipoNormalizado;
      });
      if (notaEncontrada) return true;
    }
  }
  return false;
});

// Computed para determinar qué mostrar en "Documento que aclara"
const documentoQueAclaraTexto = computed(() => {
    if (!props.notaAclaratoria) return '';

    const documentoOrigenTipo = props.notaAclaratoria.documentoOrigenTipo;
    const documentoOrigenId = props.notaAclaratoria.documentoOrigenId;
    let documentoOrigenNombre = props.notaAclaratoria.documentoOrigenNombre;
    let documentoOrigenFecha = props.notaAclaratoria.documentoOrigenFecha;

    // Verificar si es un documento externo
    const esDocumentoExterno = documentoOrigenTipo === 'documentoExterno' ||
                               documentoOrigenTipo === 'Documento Externo' ||
                               documentoOrigenTipo === 'documentosExternos';

    // Normalizar el tipo a plural para buscar en el store
    const tipoNormalizado = normalizarTipoAPlural(documentoOrigenTipo);

    // Si faltan datos, buscar el documento origen en documentsByYear
    if ((!documentoOrigenNombre && esDocumentoExterno) || !documentoOrigenFecha) {
        if (documentos.documentsByYear && documentoOrigenId) {
            Object.values(documentos.documentsByYear).forEach((docsDelAno) => {
                if (docsDelAno[tipoNormalizado] && Array.isArray(docsDelAno[tipoNormalizado])) {
                    const docEncontrado = docsDelAno[tipoNormalizado].find(d => d._id === documentoOrigenId);
                    if (docEncontrado) {
                        // Obtener nombre para documentos externos
                        if (esDocumentoExterno && !documentoOrigenNombre && docEncontrado.nombreDocumento) {
                            documentoOrigenNombre = docEncontrado.nombreDocumento;
                        }
                        // Obtener fecha
                        if (!documentoOrigenFecha) {
                            const campoFecha = fechaCamposOrigen[tipoNormalizado];
                            if (campoFecha && docEncontrado[campoFecha]) {
                                documentoOrigenFecha = docEncontrado[campoFecha];
                            } else if (docEncontrado.createdAt) {
                                documentoOrigenFecha = docEncontrado.createdAt;
                            }
                        }
                    }
                }
            });
        }
    }

    let textoBase = '';

    if (esDocumentoExterno && documentoOrigenNombre) {
        // Para documentos externos, mostrar el nombre específico
        textoBase = documentoOrigenNombre;
    } else if (esDocumentoExterno) {
        // Si no hay nombre, mostrar el tipo genérico
        textoBase = 'Documento Externo';
    } else {
        // Mostrar el tipo de documento formateado
        textoBase = obtenerNombreTipoDocumento(documentoOrigenTipo);
    }

    // Agregar la fecha si está disponible
    if (documentoOrigenFecha) {
        const fecha = convertirFechaISOaDDMMYYYY(documentoOrigenFecha);
        return `${textoBase} (${fecha})`;
    }

    return textoBase;
});

const puedeFinalizar = computed(() => {
    // Solo permitir finalizar si el estado es BORRADOR o no tiene estado (legacy)

    if (!currentDocumentData.value || typeof currentDocumentData.value !== 'object') return false;
    const estado = currentDocumentData.value.estado;
    return !estado || estado.toLowerCase() === 'borrador';
});

const isFinalized = computed(() => {
    if (!currentDocumentData.value || typeof currentDocumentData.value !== 'object') return false;
    return currentDocumentData.value.estado?.toLowerCase() === 'finalizado';
});

const isAnulado = computed(() => {
    if (!currentDocumentData.value || typeof currentDocumentData.value !== 'object') return false;
    return currentDocumentData.value.estado?.toLowerCase() === 'anulado';
});

// Un documento es de solo lectura si está finalizado O anulado Y la inmutabilidad está habilitada
const documentImmutabilityEnabled = computed(() =>
    proveedorSaludStore.documentImmutabilityEnabled
);
const controlPrenatalEnabled = computed(() => proveedorSaludStore.controlPrenatalEnabled);
const isReadOnly = computed(() => {
    const isFinalizedOrAnulado = isFinalized.value || isAnulado.value;
    return documentImmutabilityEnabled.value && isFinalizedOrAnulado;
});

const isMX = computed(() => {
    return useProveedorSaludStore().isMX;
});

const showSiresUI = computed(() => {
    return proveedorSaludStore.showSiresUI;
});

// Solo mostrar botón de anular si está FINALIZADO (no si ya está anulado)
// y la inmutabilidad está habilitada (SIRES_NOM024)
const isAnulacion = computed(() => {
    return documentImmutabilityEnabled.value && isFinalized.value && !isAnulado.value;
});

// En modo eliminación masiva: documentos FINALIZADO/ANULADO no son seleccionables
const isDeletableInBulkMode = computed(() => {
    if (!props.isDeletionMode) return true;
    if (!documentImmutabilityEnabled.value) return true;
    return !isFinalized.value && !isAnulado.value;
});

const canEditFinalized = computed(() => {
    return canEditDocument(props.documentoTipo);
});

const documentoNombre = computed(() => {
    if (props.antidoping) return 'Antidoping';
    if (props.aptitud) return 'Aptitud al Puesto';
    if (props.audiometria) return 'Audiometría';
    if (props.constanciaAptitud) return 'Constancia de Aptitud';
    if (props.certificado) return 'Certificado';
    if (props.certificadoExpedito) return 'Certificado Expedito';
    if (props.receta) return 'Receta';
    if (props.documentoExterno) return props.documentoExterno.nombreDocumento;
    if (props.examenVista) return 'Examen de la Vista';
    if (props.exploracionFisica) return 'Exploración Física';
    if (props.historiaClinica) return 'Historia Clínica';
    if (props.notaMedica) return 'Nota Médica';
    if (props.entrevistaPsicologica) return 'Entrevista Psicológica';
    if (props.trastornosEstadoAnimo) return 'Trastornos Estado Ánimo';
    if (props.cuestionarioProdromalBreve) return 'Cuestionario Prodromal Breve';
    if (props.trastornoLimitePersonalidad) return 'Trastorno Límite Personalidad';
    if (props.eventoSeguimientoCardiometabolico) return 'Evento de Seguimiento Cardiometabólico';
    if (props.informeLongitudinalCardiometabolico) return 'Informe Longitudinal Cardiometabólico';
    if (props.notaAclaratoria) return 'Nota Aclaratoria';
    if (props.controlPrenatal) return 'Control Prenatal';
    if (props.historiaOtologica) return 'Historia Otológica';
    if (props.previoEspirometria) return 'Previo Espirometria';
    return 'Documento';
});

const { antidoping } = props; // Desestructuración para acceder a antidoping

// Computed para el indicador lateral
const indicadorLateral = computed(() => {
  if (isPdfGenerating.value) {
    return {
      class: 'absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-yellow-500 animate-pulse',
      title: 'Generando PDF...'
    };
  }

  if (isPdfFailed.value) {
    return {
      class: 'absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-rose-500 to-red-400',
      title: 'Error al generar PDF - Se puede regenerar'
    };
  }

  // Verificando disponibilidad
  if (verificandoPDF.value) {
    return {
      class: 'absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-yellow-400 to-orange-500 animate-pulse',
      title: 'Verificando disponibilidad del PDF...'
    };
  }

  // Modo Eliminación
  if (props.isDeletionMode) {
    // Si está seleccionado en modo eliminación, siempre rojo
    if (props.isSelected) {
      return {
        class: 'absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-rose-600',
        title: 'Seleccionado para eliminar'
      };
    }

    // Si no está seleccionado, verde si está disponible, gris si no
    if (pdfDisponible.value) {
      return {
        class: 'absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-green-600',
        title: 'PDF disponible'
      };
    } else {
      return {
        class: 'absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-gray-300 to-gray-300',
        title: 'No disponible'
      };
    }
  }

  // Modo Normal
  if (pdfDisponible.value) {
    return {
      class: 'absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-green-600',
      title: 'PDF disponible'
    };
  }

  // Documento externo no disponible (solo en modo normal)
  if (props.documentoTipo.toLowerCase().replace(/\s+/g, '') === 'documentoexterno' && !pdfDisponible.value) {
    return {
      class: 'absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-rose-500 to-red-400',
      title: 'Documento externo no disponible'
    };
  }

  // PDF no disponible (modo normal)
  return {
    class: 'absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-gray-300 to-gray-300',
    title: 'PDF no disponible - Se puede regenerar'
  };
});

const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
        if (showImageViewer.value) {
            cerrarImagen();
        } else if (showPdfViewer.value) {
            cerrarPdf();
        }
    }
};

////////////////////////////////////////////
// Estado para las dimensiones del viewport
const windowWidth = ref(window.innerWidth);
const windowHeight = ref(window.innerHeight);

const pdfViewerMaxScale = computed(() =>
    getPdfMaxScaleByViewportHeight(windowHeight.value),
);

const updateWindowDimensions = () => {
    windowWidth.value = window.innerWidth;
    windowHeight.value = window.innerHeight;
    if (showPdfViewer.value) {
        scheduleApplyFitToWidth();
    }
};

// Agregar y eliminar el listener de eventos
onMounted(() => window.addEventListener('resize', updateWindowDimensions));
onUnmounted(() => {
    window.removeEventListener('resize', updateWindowDimensions);
    disconnectPdfViewerResizeObserver();
});

/// Computed para las condiciones responsivas (thumbnails)
const isExtraLargeScreen = computed(() => windowWidth.value >= 1280);
const isLargeScreen = computed(() => windowWidth.value >= 1024 && windowWidth.value < 1280);

const initialThumbnailsVisible = computed(() => {
    const screenOk = isLargeScreen.value || isExtraLargeScreen.value;
    if (!screenOk) return false;
    return (pdfTotalPages.value ?? 1) > 1;
});

watch(initialThumbnailsVisible, (visible, prev) => {
    if (visible && !prev && showPdfViewer.value) {
        scheduleApplyFitToWidth();
    }
});

watch(showPdfViewer, (open) => {
    if (!open) {
        disconnectPdfViewerResizeObserver();
        pdfViewerReady.value = false;
    }
});

// Lógica para mensajes dinámicos de antidopings
const parametros = [
  'marihuana',
  'cocaina',
  'anfetaminas',
  'metanfetaminas',
  'opiaceos',
  'benzodiacepinas',
  'fenciclidina',
  'metadona',
  'barbituricos',
  'antidepresivosTriciclicos',
  'metilendioximetanfetamina',
  'ketamina'
]

// Obtenemos solo los parámetros que existen en el objeto actual
const parametrosPresentes = computed(() =>
  parametros.filter(p => antidoping[p] !== undefined)
)

// ¿Hay algún parámetro positivo?
const positivos = computed(() =>
  parametrosPresentes.value.some(p => antidoping[p] === 'Positivo')
)

// ¿Todos los parámetros presentes son negativos?
const todosNegativos = computed(() =>
  parametrosPresentes.value.every(p => antidoping[p] === 'Negativo')
)

// Mensaje según cantidad de parámetros y estado
const mensajeNegativo = computed(() => {
  if (!positivos.value && todosNegativos.value) {
    const cantidad = parametrosPresentes.value.length
    if (cantidad === 5) return 'Negativo a cinco parámetros'
    if (cantidad === 6) return 'Negativo a seis parámetros'
    if (cantidad === 10) return 'Negativo a diez parámetros'
    if (cantidad === 12) return 'Negativo a doce parámetros'
  }
  return null
})

// Mensaje detallado de sustancias positivas (similar a VisualizadorAptitud.vue)
const mensajeDetalladoAntidoping = computed(() => {
  if (!antidoping || typeof antidoping !== 'object') return null;

  // Contar cuántos parámetros están presentes
  const evaluados = parametros.filter(param => antidoping[param] !== undefined);

  // Evaluar si todos los evaluados son 'Negativo'
  const todosNegativos = evaluados.every(param => antidoping[param] === 'Negativo');

  if (todosNegativos) {
    const cantidadEnLetras = {
      5: 'cinco',
      6: 'seis',
      10: 'diez',
      12: 'doce'
    }[evaluados.length] || evaluados.length;

    return `Negativo a ${cantidadEnLetras} parámetros`;
  }

  // Si hay algún positivo, construir el mensaje con las sustancias correspondientes
  const sustanciasPositivas = [
    antidoping.marihuana !== 'Negativo' ? 'Marihuana' : null,
    antidoping.cocaina !== 'Negativo' ? 'Cocaína' : null,
    antidoping.anfetaminas !== 'Negativo' ? 'Anfetaminas' : null,
    antidoping.metanfetaminas !== 'Negativo' ? 'Metanfetaminas' : null,
    antidoping.opiaceos !== 'Negativo' ? 'Opiáceos' : null,
    antidoping.benzodiacepinas && antidoping.benzodiacepinas !== 'Negativo' ? 'Benzodiazepinas' : null,
    antidoping.fenciclidina && antidoping.fenciclidina !== 'Negativo' ? 'Fenciclidina' : null,
    antidoping.metadona && antidoping.metadona !== 'Negativo' ? 'Metadona' : null,
    antidoping.barbituricos && antidoping.barbituricos !== 'Negativo' ? 'Barbitúricos' : null,
    antidoping.antidepresivosTriciclicos && antidoping.antidepresivosTriciclicos !== 'Negativo' ? 'Antidepresivos Tricíclicos' : null,
    antidoping.metilendioximetanfetamina && antidoping.metilendioximetanfetamina !== 'Negativo' ? 'Metilendioximetanfetamina' : null,
    antidoping.ketamina && antidoping.ketamina !== 'Negativo' ? 'Ketamina' : null
  ].filter(Boolean).join(', '); // Filtrar valores nulos o `undefined` y unirlos en una cadena separada por comas

  return `Positivo a: ${sustanciasPositivas}`;
})

/** Alineado con `conclusionEntrevistaPsicologica.ts` (incluye variantes legacy del texto por defecto). */
const entrevistaPsicologicaSinHallazgoConclusion = computed(() => {
  const ep = props.entrevistaPsicologica;
  if (!ep || typeof ep !== 'object') return true;
  return esConclusionSinHallazgos(ep.conclusionClinica);
});

/** Misma regla que `VisualizadorTrastornosEstadoAnimo.vue` (MDQ). */
const interpretacionTrastornosEstadoAnimo = computed(() => {
  const d = props.trastornosEstadoAnimo;
  if (!d || typeof d !== 'object') return '';
  return cumpleCriterioTriajePositivoMdq(d)
    ? 'Positivo para riesgo de trastorno bipolar'
    : 'Negativo para riesgo de trastorno bipolar';
});

const claseColorInterpretacionMdqLista = computed(() => {
  const d = props.trastornosEstadoAnimo;
  if (!d || typeof d !== 'object') return 'text-gray-600';
  return cumpleCriterioTriajePositivoMdq(d) ? 'text-orange-600' : 'text-emerald-600';
});

/** Misma regla que `VisualizadorCuestionarioProdromalBreve.vue` (PQ-B). */
const frecuenciaPQBDocumento = computed(() => contarFrecuenciaPQB(props.cuestionarioProdromalBreve));
const malestarPQBDocumento = computed(() => sumarMalestarPQB(props.cuestionarioProdromalBreve));

const interpretacionCuestionarioProdromalBreve = computed(() =>
  textoInterpretacionPQB(frecuenciaPQBDocumento.value, malestarPQBDocumento.value),
);

const claseColorInterpretacionPQBLista = computed(() =>
  esPositivoRiesgoPsicoticoPQB(frecuenciaPQBDocumento.value, malestarPQBDocumento.value)
    ? 'text-orange-600'
    : 'text-emerald-600',
);

/** Misma regla que `VisualizadorTrastornoLimitePersonalidad.vue` (MSI-BPD). */
const CAMPOS_MSI_BPD_TLP = [
  'relacionesCercanasDiscusionesRupturas',
  'autolesionIntentoSuicidio',
  'impulsividadOtrosDosProblemas',
  'extremadamenteMalHumor',
  'enojadoFrecuenteActuaEnojadoSarcastico',
  'desconfianzaOtrasPersonas',
  'sensacionIrrealidadEntornoIrreal',
  'vacioCronico',
  'faltaIdentidadQuienEs',
  'esfuerzosEvitarAbandono',
];

const puntajeTrastornoLimitePersonalidadDoc = computed(() => {
  const d = props.trastornoLimitePersonalidad;
  if (!d || typeof d !== 'object') return 0;
  return CAMPOS_MSI_BPD_TLP.reduce((acc, k) => acc + (d[k] === 'Sí' ? 1 : 0), 0);
});

const interpretacionTrastornoLimitePersonalidad = computed(() => {
  const p = puntajeTrastornoLimitePersonalidadDoc.value;
  if (p <= 4) return 'Síntomas improbables de TLP presentes.';
  if (p <= 6) return 'Posibles síntomas de TLP presentes.';
  return 'Probable presencia de síntomas de TLP.';
});

const claseColorInterpretacionTlpLista = computed(() => {
  const p = puntajeTrastornoLimitePersonalidadDoc.value;
  if (p <= 4) return 'text-green-600';
  if (p <= 6) return 'text-yellow-600';
  return 'text-orange-600';
});

/** Chips en lista para Evento Seguimiento Cardiometabólico (misma semántica que `VisualizadorEventoSeguimientoCardiometabolico`). */
const labelControlCardiometabolicoDoc = (code) => {
  if (!code) return '—';
  const o = ESTADO_CONTROL_CONDICION_OPTS.find((x) => x.value === code);
  return o?.label ?? String(code);
};

const labelGradoObesidadCardiometabolicoDoc = (code) => {
  if (!code) return '—';
  const o = GRADO_OBESIDAD_OPTS.find((x) => x.value === code);
  return o?.label ?? String(code);
};

const claseTextoEstadoCardiometabolicoLista = computed(() => {
  const d = props.eventoSeguimientoCardiometabolico;
  if (!d || typeof d !== 'object') {
    return { hipertensionArterial: 'text-gray-600', diabetesMellitusTipo2: 'text-gray-600', dislipidemia: 'text-gray-600', obesidad: 'text-gray-600' };
  }
  const ec = d.estadoCondiciones;
  const ctrl = (key) => {
    const c = ec?.[key]?.control;
    if (c === 'CONTROLADA') return 'text-emerald-700';
    if (c === 'NO_CONTROLADA') return 'text-red-700';
    if (c === 'NO_VALORABLE') return 'text-gray-800';
    return 'text-gray-600';
  };
  const g = ec?.obesidad?.grado;
  let obesidadClase = 'text-gray-600';
  if (!g) obesidadClase = ec ? 'text-gray-900' : 'text-gray-600';
  else if (g === 'SOBREPESO') obesidadClase = 'text-gray-900';
  else if (g === 'OBESIDAD_I') obesidadClase = 'text-red-600';
  else if (g === 'OBESIDAD_II') obesidadClase = 'text-red-700';
  else if (g === 'OBESIDAD_III') obesidadClase = 'text-red-900';
  return {
    hipertensionArterial: ctrl('hipertensionArterial'),
    diabetesMellitusTipo2: ctrl('diabetesMellitusTipo2'),
    dislipidemia: ctrl('dislipidemia'),
    obesidad: obesidadClase,
  };
});

/** Chips en lista para Informe Longitudinal Cardiometabólico (misma semántica que `VisualizadorInformeLongitudinalCardiometabolico`). */
function tonoRiesgoLongitudinalInformeLista(nivel) {
  const s = nivel == null ? '' : String(nivel).trim();
  if (!s) return 'neutral';
  if (s === 'Muy Bajo' || s === 'Bajo') return 'ok';
  if (s === 'Moderado') return 'warn';
  if (s === 'Alto' || s === 'Crítico') return 'bad';
  return 'neutral';
}

function tonoTrayectoriaLongitudinalInformeLista(t) {
  const s = t == null ? '' : String(t).trim();
  if (!s) return 'neutral';
  if (s === 'Favorable' || s === 'Estable') return 'ok';
  if (s === 'Mixta') return 'warn';
  if (s === 'Desfavorable') return 'bad';
  return 'neutral';
}

function tonoPorcentajeAsistenciaInformeLista(p) {
  if (p == null || p === '') return 'neutral';
  const n = Number(p);
  if (!Number.isFinite(n)) return 'neutral';
  if (n >= 70) return 'ok';
  if (n >= 50) return 'warn';
  return 'bad';
}

function tonoConsistenciaSeguimientoInformeLista(c) {
  const s = c == null ? '' : String(c).trim();
  if (!s) return 'neutral';
  if (s === 'Adecuado') return 'ok';
  if (s === 'Irregular') return 'warn';
  if (s === 'Insuficiente') return 'bad';
  return 'neutral';
}

function claseTextoTonoInformeLongitudinalLista(tono) {
  if (tono === 'ok') return 'text-emerald-700';
  if (tono === 'warn') return 'text-amber-700';
  if (tono === 'bad') return 'text-red-700';
  return 'text-gray-600';
}

const chipsInformeLongitudinalLista = computed(() => {
  const d = props.informeLongitudinalCardiometabolico;
  const dash = '—';
  const vacio = {
    riesgo: { label: dash, clase: 'text-gray-600' },
    trayectoria: { label: dash, clase: 'text-gray-600' },
    asistencia: { label: dash, clase: 'text-gray-600' },
    consistencia: { label: dash, clase: 'text-gray-600' },
  };
  if (!d || typeof d !== 'object') return vacio;

  const nivel = d.nivelRiesgoLongitudinal;
  const tray = d.tendenciaLongitudinal;
  const pct = d.porcentajeAsistencia;
  const cons = d.consistenciaSeguimiento;

  let asistenciaLabel = dash;
  if (pct != null && pct !== '') {
    const n = Number(pct);
    if (Number.isFinite(n)) asistenciaLabel = `${Math.round(n)} %`;
  }

  return {
    riesgo: {
      label: nivel != null && String(nivel).trim() !== '' ? String(nivel) : dash,
      clase: claseTextoTonoInformeLongitudinalLista(tonoRiesgoLongitudinalInformeLista(nivel)),
    },
    trayectoria: {
      label: tray != null && String(tray).trim() !== '' ? String(tray) : dash,
      clase: claseTextoTonoInformeLongitudinalLista(tonoTrayectoriaLongitudinalInformeLista(tray)),
    },
    asistencia: {
      label: asistenciaLabel,
      clase: claseTextoTonoInformeLongitudinalLista(tonoPorcentajeAsistenciaInformeLista(pct)),
    },
    consistencia: {
      label: cons != null && String(cons).trim() !== '' ? String(cons) : dash,
      clase: claseTextoTonoInformeLongitudinalLista(tonoConsistenciaSeguimientoInformeLista(cons)),
    },
  };
});
///////////////////////////////////////////

const construirRutaYNombrePDF = () => {
  const tipoSinEspacios = props.documentoTipo.toLowerCase().replace(/\s+/g, '');
  const doc = {
    'constanciaaptitud': props.constanciaAptitud,
    'antidoping': props.antidoping,
    'aptitud': props.aptitud,
    'audiometria': props.audiometria,
    'certificado': props.certificado,
    'certificadoexpedito': props.certificadoExpedito,
    'receta': props.receta,
    'examenvista': props.examenVista,
    'exploracionfisica': props.exploracionFisica,
    'historiaclinica': props.historiaClinica,
    'notamedica': props.notaMedica,
    'notaaclaratoria': props.notaAclaratoria,
    'controlprenatal': props.controlPrenatal,
    'historiaotologica': props.historiaOtologica,
    'previoespirometria': props.previoEspirometria,
    'entrevistapsicologica': props.entrevistaPsicologica,
    'trastornosestadoanimo': props.trastornosEstadoAnimo,
    'cuestionarioprodromalbreve': props.cuestionarioProdromalBreve,
    'trastornolimitepersonalidad': props.trastornoLimitePersonalidad,
    'eventoseguimientocardiometabolico': props.eventoSeguimientoCardiometabolico,
    'informelongitudinalcardiometabolico': props.informeLongitudinalCardiometabolico,
  }[tipoSinEspacios];

  // Verificar que el documento exista
  if (!doc) {
    console.warn('[construirRutaYNombrePDF] Documento no encontrado para tipo:', tipoSinEspacios);
    return { ruta: null, nombre: null, updatedAt: null };
  }

  const fecha = doc?.fechaAntidoping || doc?.fechaAptitudPuesto || doc?.fechaConstanciaAptitud || doc?.fechaAudiometria || doc?.fechaCertificado || doc?.fechaCertificadoExpedito || doc?.fechaReceta || doc?.fechaExamenVista || doc?.fechaExploracionFisica || doc?.fechaHistoriaClinica || doc?.fechaNotaMedica || doc?.fechaNotaAclaratoria || doc?.fechaInicioControlPrenatal || doc?.fechaHistoriaOtologica || doc?.fechaPrevioEspirometria || doc?.fechaEntrevistaPsicologica || doc?.fechaTrastornosEstadoAnimo || doc?.fechaCuestionarioProdromalBreve || doc?.fechaTrastornoLimitePersonalidad || doc?.fechaEventoSeguimientoCardiometabolico || doc?.fechaInformeLongitudinalCardiometabolico;

  // Nombres de documentos (DEBEN coincidir con los del backend para construir rutas correctas)
  const tiposDocumentos = {
    'constanciaaptitud': 'Constancia de Aptitud',
    'antidoping': 'Antidoping',
    'aptitud': 'Aptitud',
    'audiometria': 'Audiometria',
    'certificado': 'Certificado',
    'certificadoexpedito': 'Certificado Expedito',
    'receta': 'Receta',
    'examenvista': 'Examen Vista',
    'exploracionfisica': 'Exploracion Fisica',
    'historiaclinica': 'Historia Clinica',
    'notamedica': 'Nota Medica',
    'notaaclaratoria': 'Nota Aclaratoria',
    'controlprenatal': 'Control Prenatal',
    'historiaotologica': 'Historia Otologica',
    'previoespirometria': 'Previo Espirometria',
    'entrevistapsicologica': 'Entrevista Psicologica',
    'trastornosestadoanimo': 'Trastornos Estado Animo',
    'cuestionarioprodromalbreve': 'Cuestionario Prodromal Breve',
    'trastornolimitepersonalidad': 'Trastorno Limite Personalidad',
    'eventoseguimientocardiometabolico': 'Evento Seguimiento Cardiometabolico',
    'informelongitudinalcardiometabolico': 'Informe Longitudinal Cardiometabolico',
  };

  const tipoDocumentoFormateado = tiposDocumentos[tipoSinEspacios];
  const fechaFormateada = fecha ? convertirFechaISOaDDMMYYYY(fecha).replace(/\//g, '-') : '';

  // Para Nota Aclaratoria, usar la función obtenerNombreArchivo que ya tiene la lógica completa
  let nombreArchivo;
  if (tipoSinEspacios === 'notaaclaratoria' && doc) {
    nombreArchivo = obtenerNombreArchivo(doc, 'Nota Aclaratoria', fechaFormateada, documentos);
  } else {
    nombreArchivo = fecha ? `${tipoDocumentoFormateado} ${fechaFormateada}.pdf` : `${tipoDocumentoFormateado}.pdf`;
  }

  // Obtener updatedAt para cache-busting (evitar que se muestre versión cacheada del PDF)
  const updatedAt = doc?.updatedAt ? new Date(doc.updatedAt).getTime() : Date.now();

  return {
      ruta: doc.rutaPDF,        // solo la carpeta
      nombre: nombreArchivo,    // solo el nombre del archivo
      updatedAt: updatedAt      // timestamp para cache-busting
  };
};

const abrirDocumentoCorrespondiente = () => {
  const { ruta, nombre, updatedAt } = construirRutaYNombrePDF();
  if (!ruta || !nombre) {
    console.error('[abrirDocumentoCorrespondiente] No se pudo obtener la ruta o nombre del PDF');
    mostrarModalPdfEliminado.value = true;
    return;
  }
  abrirPdf(ruta, nombre, updatedAt);
};

const abrirNotaAclaratoria = (notaAclaratoria) => {
  const fecha = convertirFechaISOaDDMMYYYY(notaAclaratoria.fechaNotaAclaratoria).replace(/\//g, '-');
  const nombreArchivo = obtenerNombreArchivo(notaAclaratoria, 'Nota Aclaratoria', fecha, documentos);
  const updatedAt = notaAclaratoria.updatedAt ? new Date(notaAclaratoria.updatedAt).getTime() : null;
  abrirPdf(notaAclaratoria.rutaPDF, nombreArchivo, updatedAt);
};

const manejarRegeneracionDesdePadre = async () => {
  trackedPdfStatus.value = 'ready';
  if (currentDocumentData.value && typeof currentDocumentData.value === 'object') {
    currentDocumentData.value.pdfStatus = 'ready';
  }
  pdfDisponible.value = true;
  await abrirDocumentoCorrespondiente();      // Abre visor
  await nextTick();                           // Espera a que DOM actualice
  mostrarModalPdfEliminado.value = false;     // Cierra el modal
  // Verificar disponibilidad después de regenerar
  setTimeout(() => {
    pdfCheckScheduled = false;
    schedulePdfCheck();
  }, 1000); // Pequeño delay para asegurar que el PDF se haya generado
};

/*
 * SISTEMA DE INDICADORES DE ESTADO DEL PDF:
 *
 * 1. INDICADOR LATERAL (línea izquierda):
 *    - Verde: PDF disponible y listo para mostrar
 *    - Naranja/Rojo: Documento externo no disponible (solo para documentos externos)
 *    - Amarillo/Naranja: Verificando disponibilidad del PDF
 *    - Sin indicador: PDF no disponible (comportamiento normal del sistema)
 *
 * 2. BORDE DEL ITEM:
 *    - Gris: Estado normal (PDF disponible o no disponible)
 *    - Amarillo: Verificando disponibilidad
 *
 * 3. ICONO EN EL TÍTULO:
 *    - ✓ Verde: PDF disponible
 *    - ⚠️ Naranja: Documento externo no disponible (solo para documentos externos)
 *    - 🔄 Amarillo: Verificando disponibilidad
 *    - Sin icono: PDF no disponible (comportamiento normal del sistema)
 *
 * 4. TOOLTIPS:
 *    - Al hacer hover sobre el indicador lateral se muestra el estado
 *    - Al hacer hover sobre el icono se muestra información adicional
 *
 * 5. DIFERENCIACIÓN POR TIPO:
 *    - Informes (Antidoping, Aptitud, etc.): Solo indican cuando están disponibles
 *    - Documentos Externos: Indican tanto disponibilidad como no disponibilidad
 */

// Función para verificar si el PDF está disponible
const verificarDisponibilidadPDF = async () => {
  const tipoSinEspacios = props.documentoTipo.toLowerCase().replace(/\s+/g, '');

  // Para documentos externos, verificar si el archivo existe
  if (tipoSinEspacios === 'documentoexterno') {
    if (!props.documentoExterno || !props.documentoExterno.rutaDocumento) {
      pdfDisponible.value = false;
      return;
    }

    try {
      verificandoPDF.value = true;
      const nombreArchivo = `${props.documentoExterno.nombreDocumento} ${convertirFechaISOaDDMMYYYY(props.documentoExterno.fechaDocumento)}${props.documentoExterno.extension}`;
      const relativePath = props.documentoExterno.rutaDocumento.endsWith(nombreArchivo)
        ? props.documentoExterno.rutaDocumento
        : joinClinicalPath(props.documentoExterno.rutaDocumento, nombreArchivo);
      pdfDisponible.value = await headClinicalFile(relativePath, {
        probe: 'external',
      });
    } catch (error) {
      pdfDisponible.value = false;
    } finally {
      verificandoPDF.value = false;
    }
    return;
  }

  // Para informes, verificar si el PDF existe
  const { ruta, nombre } = construirRutaYNombrePDF();
  if (!ruta || !nombre) {
    pdfDisponible.value = false;
    return;
  }

  try {
    verificandoPDF.value = true;
    const rutaCompleta = joinClinicalPath(ruta, nombre);
    pdfDisponible.value = await headClinicalFile(rutaCompleta, {
      contentType: 'application/pdf',
      probe: 'regenerable',
    });
  } catch (error) {
    pdfDisponible.value = false;
  } finally {
    verificandoPDF.value = false;
  }
};

const documentoItemRef = ref(null);
let pdfVisibilityObserver = null;
let pdfCheckScheduled = false;
let pdfVisibleInViewport = false;

const runPdfAvailabilityCheck = () => {
  enqueuePdfAvailabilityCheck(() => verificarDisponibilidadPDF());
};

const schedulePdfCheck = () => {
  if (pdfCheckScheduled || !pdfVisibleInViewport) return;
  pdfCheckScheduled = true;
  runPdfAvailabilityCheck();
};

// Verificar disponibilidad al montar el componente (diferido hasta viewport visible)
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);

  if (typeof IntersectionObserver !== 'undefined' && documentoItemRef.value) {
    pdfVisibilityObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          pdfVisibleInViewport = true;
          schedulePdfCheck();
          pdfVisibilityObserver?.disconnect();
          pdfVisibilityObserver = null;
        }
      },
      { rootMargin: '100px' },
    );
    pdfVisibilityObserver.observe(documentoItemRef.value);
  } else {
    pdfVisibleInViewport = true;
    schedulePdfCheck();
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  pdfVisibilityObserver?.disconnect();
  pdfVisibilityObserver = null;
});

// Watcher para verificar disponibilidad cuando cambien las props
watch(() => [props.antidoping, props.aptitud, props.audiometria, props.constanciaAptitud, props.certificado, props.certificadoExpedito, props.receta, props.documentoExterno, props.examenVista, props.exploracionFisica, props.historiaClinica, props.notaMedica, props.notaAclaratoria, props.controlPrenatal, props.historiaOtologica, props.previoEspirometria, props.entrevistaPsicologica, props.trastornosEstadoAnimo, props.cuestionarioProdromalBreve, props.trastornoLimitePersonalidad, props.eventoSeguimientoCardiometabolico, props.informeLongitudinalCardiometabolico], () => {
  pdfCheckScheduled = false;
  schedulePdfCheck();
}, { deep: true });

</script>

<template>
    <Teleport to="body">
        <transition name="fade">
            <ModalPdfEliminado
                v-if="mostrarModalPdfEliminado && !isPdfGenerating"
                :tipo="documentoTipo.toLowerCase().replace(/\s+/g, '')"
                :empresaId="empresas.currentEmpresaId"
                :trabajadorId="trabajadores.currentTrabajadorId"
                :documentoId="documentoId"
                :userId="user._id"
                :getPdfMetadata="construirRutaYNombrePDF"
                :pdfStatus="pdfStatusEffective"
                @regenerado="manejarRegeneracionDesdePadre"
                @close="mostrarModalPdfEliminado = false"
            />
        </transition>
    </Teleport>

    <!-- Items de documentos -->
    <div
        ref="documentoItemRef"
        class="documento-item group relative bg-white border rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 ease-in-out cursor-pointer overflow-hidden"
        :class="{
            'hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50': !isDeletionMode,
            'hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50': isDeletionMode,
            'border-amber-300 hover:border-amber-400': isPdfGenerating,
            'border-yellow-300 hover:border-yellow-400': verificandoPDF && !isPdfGenerating,
            'border-gray-200 hover:border-emerald-300': pdfDisponible && !isDeletionMode && !isPdfGenerating,
            'border-gray-200 hover:border-red-300': pdfDisponible && isDeletionMode && !isPdfGenerating,
            'border-gray-200 hover:border-gray-300': !pdfDisponible && !isDeletionMode && !isPdfGenerating,
            'border-gray-200 hover:border-red-400': !pdfDisponible && isDeletionMode && !isPdfGenerating
        }">

        <!-- Indicador de disponibilidad del PDF -->
        <div :class="indicadorLateral.class" :title="indicadorLateral.title"></div>

        <div
            v-if="isPdfGenerating"
            class="absolute top-2 right-2 z-10 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 border border-amber-200"
        >
            <i class="fas fa-spinner fa-spin text-amber-500"></i>
            Generando PDF…
        </div>
        <div
            v-else-if="isPdfFailed"
            class="absolute top-2 right-2 z-10 inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 border border-rose-200"
            title="Error al generar el PDF"
        >
            <i class="fas fa-exclamation-triangle text-rose-500"></i>
            PDF fallido
        </div>

        <div class="flex items-center justify-between p-4 pl-6 min-h-[80px] max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3 max-[390px]:p-3 max-[390px]:pl-3">
            <div class="flex items-center flex-1 max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3 w-full">

                <!-- Nota Aclaratoria -->
                <div v-if="typeof notaAclaratoria === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <!-- Checkbox mejorado -->
                    <div class="mr-4 flex-shrink-0 flex items-center gap-1">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110"
                            :class="[
                                isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500',
                                isDeletableInBulkMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                            ]"
                            type="checkbox" :checked="isSelected"
                            :disabled="!isDeletableInBulkMode"
                            @change="(event) => handleCheckboxChange(event, notaAclaratoria, 'Nota Aclaratoria')">
                        <i v-if="isDeletionMode && !isDeletableInBulkMode" class="fas fa-lock text-gray-400 text-xs" title="Documento finalizado o anulado - no eliminable"></i>
                    </div>

                    <!-- Contenido principal -->
                    <div class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3" @click="abrirNotaAclaratoria(notaAclaratoria)">

                        <!-- Icono del documento -->
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mr-4 group-hover:bg-yellow-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fas fa-exclamation-triangle text-yellow-600 text-lg"></i>
                        </div>

                        <!-- Información del documento -->
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duración-200 flex items-center max-[390px]:text-base">
                                    Nota Aclaratoria
                                </h3>
                            </div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(notaAclaratoria.fechaNotaAclaratoria) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="notaAclaratoria.estado"
                                    :fechaFinalizacion="notaAclaratoria.fechaFinalizacion"
                                    :finalizadoPor="notaAclaratoria.finalizadoPor"
                                    :fechaAnulacion="notaAclaratoria.fechaAnulacion"
                                    :anuladoPor="notaAclaratoria.anuladoPor"
                                    :razonAnulacion="notaAclaratoria.razonAnulacion"
                                />
                            </div>
                        </div>

                        <!-- Información adicional (pantallas grandes) -->
                        <div class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Documento que aclara</p>
                                    <p class="font-medium text-sm truncate max-w-full text-blue-600">
                                        {{ documentoQueAclaraTexto }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Alcance</p>
                                    <p v-if="notaAclaratoria.alcanceAclaracion === 'ACLARA'" class="font-medium text-sm truncate max-w-full text-blue-600">
                                        Aclaración
                                    </p>
                                    <p v-else-if="notaAclaratoria.alcanceAclaracion === 'CORRIGE'" class="font-medium text-sm truncate max-w-full text-blue-600">
                                        Corrección
                                    </p>
                                    <p v-else-if="notaAclaratoria.alcanceAclaracion === 'COMPLEMENTA'" class="font-medium text-sm truncate max-w-full text-purple-600">
                                        Complemento
                                    </p>
                                    <p v-else-if="notaAclaratoria.alcanceAclaracion === 'INVALIDA'" class="font-medium text-sm truncate max-w-full text-red-600">
                                        Invalidación
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Impacto</p>
                                    <p v-if="notaAclaratoria.impactoClinico === 'LEVE'" class="font-medium text-sm truncate max-w-full text-green-600">
                                        Leve
                                    </p>
                                    <p v-else-if="notaAclaratoria.impactoClinico === 'MODERADO'" class="font-medium text-sm truncate max-w-full text-yellow-600">
                                        Moderado
                                    </p>
                                    <p v-else-if="notaAclaratoria.impactoClinico === 'SEVERO'" class="font-medium text-sm truncate max-w-full text-red-600">
                                        Severo
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Antidoping -->
                <div v-if="typeof antidoping === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <!-- Checkbox mejorado -->
                    <div class="mr-4 flex-shrink-0 flex items-center gap-1">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110"
                            :class="[
                                isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500',
                                isDeletableInBulkMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                            ]"
                            type="checkbox" :checked="isSelected"
                            :disabled="!isDeletableInBulkMode"
                            @change="(event) => handleCheckboxChange(event, antidoping, 'Antidoping')">
                        <i v-if="isDeletionMode && !isDeletableInBulkMode" class="fas fa-lock text-gray-400 text-xs" title="Documento finalizado o anulado - no eliminable"></i>
                    </div>

                    <!-- Contenido principal -->
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${antidoping.rutaPDF}`,
                            `Antidoping ${convertirFechaISOaDDMMYYYY(antidoping.fechaAntidoping)}.pdf`,
                            antidoping.updatedAt ? new Date(antidoping.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${antidoping.rutaPDF}`,
                            `Antidoping ${convertirFechaISOaDDMMYYYY(antidoping.fechaAntidoping)}.pdf`,
                            antidoping.updatedAt ? new Date(antidoping.updatedAt).getTime() : null,
                            'Antidoping')"
                        @mouseleave="handleHoverLeave">

                        <!-- Icono del documento -->
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg mr-4 group-hover:bg-red-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fas fa-flask text-red-600 text-lg"></i>
                        </div>

                        <!-- Información del documento -->
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duration-200 flex items-center max-[390px]:text-base">
                                    Antidoping
                                </h3>
                                <BadgeNotaAclaratoria
                                    v-if="tieneNotasAclaratorias"
                                    :documentoId="documentoId"
                                    :documentoTipo="documentoTipo"
                                    class="hidden sm:flex ml-2"
                                />
                                <span v-else class="hidden sm:flex ml-2 px-2 py-1 text-xs font-medium rounded-full"
                                    :class="positivos ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'">
                                    {{ positivos ? 'Positivo' : 'Negativo' }}
                                </span>
                            </div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(antidoping.fechaAntidoping) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="antidoping.estado"
                                    :fechaFinalizacion="antidoping.fechaFinalizacion"
                                    :finalizadoPor="antidoping.finalizadoPor"
                                    :fechaAnulacion="antidoping.fechaAnulacion"
                                    :anuladoPor="antidoping.anuladoPor"
                                    :razonAnulacion="antidoping.razonAnulacion"
                                />
                            </div>
                        </div>

                        <!-- Información adicional (pantallas grandes) -->
                        <div class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Resultados</p>
                                    <p v-if="mensajeDetalladoAntidoping" class="font-medium text-sm truncate max-w-full"
                                        :class="positivos ? 'text-red-600' : 'text-gray-800'">
                                        {{ mensajeDetalladoAntidoping }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Constancia de Aptitud -->
                <div v-if="typeof constanciaAptitud === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <!-- Checkbox mejorado -->
                    <div class="mr-4 flex-shrink-0 flex items-center gap-1">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110"
                            :class="[
                                isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500',
                                isDeletableInBulkMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                            ]"
                            type="checkbox" :checked="isSelected"
                            :disabled="!isDeletableInBulkMode"
                            @change="(event) => handleCheckboxChange(event, constanciaAptitud, 'Constancia de Aptitud')">
                        <i v-if="isDeletionMode && !isDeletableInBulkMode" class="fas fa-lock text-gray-400 text-xs" title="Documento finalizado o anulado - no eliminable"></i>
                    </div>

                    <!-- Contenido principal -->
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${constanciaAptitud.rutaPDF}`,
                            `Constancia de Aptitud ${convertirFechaISOaDDMMYYYY(constanciaAptitud.fechaConstanciaAptitud)}.pdf`,
                            constanciaAptitud.updatedAt ? new Date(constanciaAptitud.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${constanciaAptitud.rutaPDF}`,
                            `Constancia de Aptitud ${convertirFechaISOaDDMMYYYY(constanciaAptitud.fechaConstanciaAptitud)}.pdf`,
                            constanciaAptitud.updatedAt ? new Date(constanciaAptitud.updatedAt).getTime() : null,
                            'Constancia de Aptitud')"
                        @mouseleave="handleHoverLeave">

                        <!-- Icono del documento -->
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mr-4 group-hover:bg-green-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fas fa-user-check text-green-600 text-lg"></i>
                        </div>

                        <!-- Información del documento -->
                        <div class="sm:w-80 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duración-200 flex items-center max-[390px]:text-base">
                                    Constancia de Aptitud
                                </h3>
                            </div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(constanciaAptitud.fechaConstanciaAptitud) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="constanciaAptitud.estado"
                                    :fechaFinalizacion="constanciaAptitud.fechaFinalizacion"
                                    :finalizadoPor="constanciaAptitud.finalizadoPor"
                                    :fechaAnulacion="constanciaAptitud.fechaAnulacion"
                                    :anuladoPor="constanciaAptitud.anuladoPor"
                                    :razonAnulacion="constanciaAptitud.razonAnulacion"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Aptitud al Puesto -->
                <div v-if="typeof aptitud === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <!-- Checkbox mejorado -->
                    <div class="mr-4 flex-shrink-0 flex items-center gap-1">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110"
                            :class="[
                                isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500',
                                isDeletableInBulkMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                            ]"
                            type="checkbox" :checked="isSelected"
                            :disabled="!isDeletableInBulkMode"
                            @change="(event) => handleCheckboxChange(event, aptitud, 'Aptitud')">
                        <i v-if="isDeletionMode && !isDeletableInBulkMode" class="fas fa-lock text-gray-400 text-xs" title="Documento finalizado o anulado - no eliminable"></i>
                    </div>

                    <!-- Contenido principal -->
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${aptitud.rutaPDF}`,
                            `Aptitud ${convertirFechaISOaDDMMYYYY(aptitud.fechaAptitudPuesto)}.pdf`,
                            aptitud.updatedAt ? new Date(aptitud.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${aptitud.rutaPDF}`,
                            `Aptitud ${convertirFechaISOaDDMMYYYY(aptitud.fechaAptitudPuesto)}.pdf`,
                            aptitud.updatedAt ? new Date(aptitud.updatedAt).getTime() : null,
                            'Aptitud al Puesto')"
                        @mouseleave="handleHoverLeave">

                        <!-- Icono del documento -->
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mr-4 group-hover:bg-green-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fas fa-user-check text-green-600 text-lg"></i>
                        </div>

                        <!-- Información del documento -->
                        <div class="sm:w-80 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duración-200 flex items-center max-[390px]:text-base">
                                    Aptitud al Puesto
                                </h3>
                                <BadgeNotaAclaratoria
                                    v-if="tieneNotasAclaratorias"
                                    :documentoId="documentoId"
                                    :documentoTipo="documentoTipo"
                                    class="hidden sm:flex ml-2"
                                />
                                <span v-else class="hidden sm:flex ml-2 px-2 py-1 text-xs font-medium rounded-full"
                                    :class="aptitud.aptitudPuesto === 'Apto Sin Restricciones' ? 'bg-emerald-100 text-emerald-700' :
                                           aptitud.aptitudPuesto === 'Apto Con Precaución' ? 'bg-amber-100 text-amber-700' :
                                           aptitud.aptitudPuesto === 'Apto Con Restricciones' ? 'bg-orange-100 text-orange-700' :
                                           aptitud.aptitudPuesto === 'No Apto' ? 'bg-red-100 text-red-700' :
                                           aptitud.aptitudPuesto === 'Evaluación No Completada' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'">
                                    {{ aptitud.aptitudPuesto === 'Evaluación No Completada' ? 'No completada' :
                                       trabajadores.currentTrabajador?.sexo === 'Femenino' ?
                                         aptitud.aptitudPuesto.replace('Apto', 'Apta').charAt(0).toUpperCase() + aptitud.aptitudPuesto.replace('Apto', 'Apta').slice(1).toLowerCase() :
                                         aptitud.aptitudPuesto.charAt(0).toUpperCase() + aptitud.aptitudPuesto.slice(1).toLowerCase() }}
                                </span>
                            </div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(aptitud.fechaAptitudPuesto) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="aptitud.estado"
                                    :fechaFinalizacion="aptitud.fechaFinalizacion"
                                    :finalizadoPor="aptitud.finalizadoPor"
                                    :fechaAnulacion="aptitud.fechaAnulacion"
                                    :anuladoPor="aptitud.anuladoPor"
                                    :razonAnulacion="aptitud.razonAnulacion"
                                />
                            </div>
                        </div>

                        <!-- Información adicional (pantallas grandes) -->
                        <!-- <div class="hidden xl:block w-64 flex-shrink-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Resultado</p>
                                    <p class="font-medium text-sm truncate"
                                        :class="aptitud.aptitudPuesto === 'No Apto' ? 'text-red-600' : 'text-gray-800'">
                                        {{ aptitud.aptitudPuesto === 'Evaluación No Completada' ? 'No completada' : aptitud.aptitudPuesto.charAt(0).toUpperCase() + aptitud.aptitudPuesto.slice(1).toLowerCase() }}
                                    </p>
                                </div>
                            </div>
                        </div> -->
                    </div>
                </div>

                <!-- Audiometría -->
                <div v-if="typeof audiometria === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <!-- Checkbox mejorado -->
                    <div class="mr-4 flex-shrink-0 flex items-center gap-1">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110"
                            :class="[
                                isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500',
                                isDeletableInBulkMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                            ]"
                            type="checkbox" :checked="isSelected"
                            :disabled="!isDeletableInBulkMode"
                            @change="(event) => handleCheckboxChange(event, audiometria, 'Audiometria')">
                        <i v-if="isDeletionMode && !isDeletableInBulkMode" class="fas fa-lock text-gray-400 text-xs" title="Documento finalizado o anulado - no eliminable"></i>
                    </div>

                    <!-- Contenido principal -->
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${audiometria.rutaPDF}`,
                            `Audiometria ${convertirFechaISOaDDMMYYYY(audiometria.fechaAudiometria)}.pdf`,
                            audiometria.updatedAt ? new Date(audiometria.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${audiometria.rutaPDF}`,
                            `Audiometria ${convertirFechaISOaDDMMYYYY(audiometria.fechaAudiometria)}.pdf`,
                            audiometria.updatedAt ? new Date(audiometria.updatedAt).getTime() : null,
                            'Audiometria')"
                        @mouseleave="handleHoverLeave">

                        <!-- Icono del documento -->
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mr-4 group-hover:bg-purple-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fas fa-volume-up text-purple-600 text-lg"></i>
                        </div>

                        <!-- Información del documento -->
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duración-200 flex items-center max-[390px]:text-base">
                                    Audiometría
                                </h3>
                                <!-- Mostrar resultado según método de audiometría -->
                                <BadgeNotaAclaratoria
                                    v-if="tieneNotasAclaratorias"
                                    :documentoId="documentoId"
                                    :documentoTipo="documentoTipo"
                                    class="hidden sm:flex ml-2"
                                />
                                <template v-else>
                                    <span v-if="audiometria.metodoAudiometria === 'AMA' && obtenerPABAudiometria(audiometria) !== null" class="hidden sm:flex ml-2 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                                        PAB: {{ obtenerPABAudiometria(audiometria) }}%
                                    </span>
                                    <span v-else-if="audiometria.metodoAudiometria === 'LFT' && audiometria.hipoacusiaBilateralCombinada" class="hidden sm:flex ml-2 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                        HBC: {{ audiometria.hipoacusiaBilateralCombinada }}%
                                    </span>
                                    <span v-else-if="!audiometria.metodoAudiometria && audiometria.hipoacusiaBilateralCombinada" class="hidden sm:flex ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                                        HBC: {{ audiometria.hipoacusiaBilateralCombinada }}%
                                    </span>
                                    <span v-else class="hidden sm:flex ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                                        Incompleta
                                    </span>
                                </template>
                            </div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(audiometria.fechaAudiometria) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="audiometria.estado"
                                    :fechaFinalizacion="audiometria.fechaFinalizacion"
                                    :finalizadoPor="audiometria.finalizadoPor"
                                    :fechaAnulacion="audiometria.fechaAnulacion"
                                    :anuladoPor="audiometria.anuladoPor"
                                    :razonAnulacion="audiometria.razonAnulacion"
                                />
                            </div>
                        </div>

                        <!-- Información adicional (pantallas grandes) -->
                        <div v-if="audiometria.diagnosticoAudiometria" class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Diagnóstico</p>
                                    <p class="font-medium text-sm truncate max-w-full text-gray-800">
                                        {{ audiometria.diagnosticoAudiometria.toUpperCase() }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Certificado -->
                <div v-if="typeof certificado === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <!-- Checkbox mejorado -->
                    <div class="mr-4 flex-shrink-0 flex items-center gap-1">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110"
                            :class="[
                                isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500',
                                isDeletableInBulkMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                            ]"
                            type="checkbox" :checked="isSelected"
                            :disabled="!isDeletableInBulkMode"
                            @change="(event) => handleCheckboxChange(event, certificado, 'Certificado')">
                        <i v-if="isDeletionMode && !isDeletableInBulkMode" class="fas fa-lock text-gray-400 text-xs" title="Documento finalizado o anulado - no eliminable"></i>
                    </div>

                    <!-- Contenido principal -->
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${certificado.rutaPDF}`,
                            `Certificado ${convertirFechaISOaDDMMYYYY(certificado.fechaCertificado)}.pdf`,
                            certificado.updatedAt ? new Date(certificado.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${certificado.rutaPDF}`,
                            `Certificado ${convertirFechaISOaDDMMYYYY(certificado.fechaCertificado)}.pdf`,
                            certificado.updatedAt ? new Date(certificado.updatedAt).getTime() : null,
                            'Certificado')"
                        @mouseleave="handleHoverLeave">

                        <!-- Icono del documento -->
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mr-4 group-hover:bg-blue-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fas fa-certificate text-blue-600 text-lg"></i>
                        </div>

                        <!-- Información del documento -->
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duración-200 flex items-center max-[390px]:text-base">
                                    Certificado
                                </h3>
                                <BadgeNotaAclaratoria
                                    v-if="tieneNotasAclaratorias"
                                    :documentoId="documentoId"
                                    :documentoTipo="documentoTipo"
                                    class="hidden sm:flex ml-2"
                                />
                                <span v-else class="hidden sm:flex ml-2 px-2 py-1 text-xs font-medium rounded-full"
                                    :class="certificado.impedimentosFisicos === 'no presenta impedimento físico para desarrollar el puesto que actualmente solicita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                                    {{ certificado.impedimentosFisicos === 'no presenta impedimento físico para desarrollar el puesto que actualmente solicita' ? 'Sin impedimentos' : 'Con impedimentos' }}
                                </span>
                            </div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(certificado.fechaCertificado) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="certificado.estado"
                                    :fechaFinalizacion="certificado.fechaFinalizacion"
                                    :finalizadoPor="certificado.finalizadoPor"
                                    :fechaAnulacion="certificado.fechaAnulacion"
                                    :anuladoPor="certificado.anuladoPor"
                                    :razonAnulacion="certificado.razonAnulacion"
                                />
                            </div>
                        </div>

                        <!-- Información adicional (pantallas grandes) -->
                        <div class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Impedimentos Físicos</p>
                                    <p class="font-medium text-sm truncate max-w-full"
                                        :class="certificado.impedimentosFisicos === 'no presenta impedimento físico para desarrollar el puesto que actualmente solicita' ? 'text-gray-800' : 'text-red-600'">
                                        {{ certificado.impedimentosFisicos === 'no presenta impedimento físico para desarrollar el puesto que actualmente solicita' ? 'No presenta impedimentos físicos' : certificado.impedimentosFisicos }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Certificado Expedito -->
                <div v-if="typeof certificadoExpedito === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <!-- Checkbox mejorado -->
                    <div class="mr-4 flex-shrink-0 flex items-center gap-1">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110"
                            :class="[
                                isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500',
                                isDeletableInBulkMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                            ]"
                            type="checkbox" :checked="isSelected"
                            :disabled="!isDeletableInBulkMode"
                            @change="(event) => handleCheckboxChange(event, certificadoExpedito, 'Certificado Expedito')">
                        <i v-if="isDeletionMode && !isDeletableInBulkMode" class="fas fa-lock text-gray-400 text-xs" title="Documento finalizado o anulado - no eliminable"></i>
                    </div>

                    <!-- Contenido principal -->
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${certificadoExpedito.rutaPDF}`,
                            `Certificado Expedito ${convertirFechaISOaDDMMYYYY(certificadoExpedito.fechaCertificadoExpedito)}.pdf`,
                            certificadoExpedito.updatedAt ? new Date(certificadoExpedito.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${certificadoExpedito.rutaPDF}`,
                            `Certificado Expedito ${convertirFechaISOaDDMMYYYY(certificadoExpedito.fechaCertificadoExpedito)}.pdf`,
                            certificadoExpedito.updatedAt ? new Date(certificadoExpedito.updatedAt).getTime() : null,
                            'Certificado Expedito')"
                        @mouseleave="handleHoverLeave">

                        <!-- Icono del documento -->
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mr-4 group-hover:bg-blue-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fas fa-certificate text-blue-600 text-lg"></i>
                        </div>

                        <!-- Información del documento -->
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duración-200 flex items-center max-[390px]:text-base">
                                    Certificado Ex.
                                </h3>
                                <BadgeNotaAclaratoria
                                    v-if="tieneNotasAclaratorias"
                                    :documentoId="documentoId"
                                    :documentoTipo="documentoTipo"
                                    class="hidden sm:flex ml-2"
                                />
                                <span v-else class="hidden sm:flex ml-2 px-2 py-1 text-xs font-medium rounded-full"
                                    :class="certificadoExpedito.impedimentosFisicos === 'no presenta impedimento físico para desarrollar el puesto que actualmente solicita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                                    {{ certificadoExpedito.impedimentosFisicos === 'no presenta impedimento físico para desarrollar el puesto que actualmente solicita' ? 'Sin impedimentos' : 'Con impedimentos' }}
                                </span>
                            </div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(certificadoExpedito.fechaCertificadoExpedito) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="certificadoExpedito.estado"
                                    :fechaFinalizacion="certificadoExpedito.fechaFinalizacion"
                                    :finalizadoPor="certificadoExpedito.finalizadoPor"
                                    :fechaAnulacion="certificadoExpedito.fechaAnulacion"
                                    :anuladoPor="certificadoExpedito.anuladoPor"
                                    :razonAnulacion="certificadoExpedito.razonAnulacion"
                                />
                            </div>
                        </div>

                        <!-- Información adicional (pantallas grandes) -->
                        <div class="hidden xl:block w-64 flex-shrink-0">
                            <div class="text-sm flex xl:space-x-2">
                                <div class="hidden xl:block bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 flex-1">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Impedimentos Físicos</p>
                                    <p class="font-medium text-sm truncate max-w-full"
                                        :class="certificadoExpedito.impedimentosFisicos === 'no presenta impedimento físico para desarrollar el puesto que actualmente solicita' ? 'text-gray-800' : 'text-red-600'">
                                        {{ certificadoExpedito.impedimentosFisicos === 'no presenta impedimento físico para desarrollar el puesto que actualmente solicita' ? 'No presenta impedimentos físicos' : certificadoExpedito.impedimentosFisicos }}
                                    </p>
                                </div>
                                <div class="hidden 2xl:block bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 flex-1">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Aptitud</p>
                                    <p class="font-medium text-sm truncate max-w-full"
                                        :class="certificadoExpedito.aptitudPuesto === 'No Apto' ? 'text-red-600' : 'text-gray-800'">
                                        {{ certificadoExpedito.aptitudPuesto }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Documento Externo -->
                <div v-if="typeof documentoExterno === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <!-- Checkbox mejorado -->
                    <div class="mr-4 flex-shrink-0 flex items-center gap-1">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110"
                            :class="[
                                isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500',
                                isDeletableInBulkMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                            ]"
                            type="checkbox" :checked="isSelected"
                            :disabled="!isDeletableInBulkMode"
                            @change="(event) => handleCheckboxChange(event, documentoExterno, 'Documento Externo')">
                        <i v-if="isDeletionMode && !isDeletableInBulkMode" class="fas fa-lock text-gray-400 text-xs" title="Documento finalizado o anulado - no eliminable"></i>
                    </div>

                    <!-- Contenido principal -->
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirDocumentoExterno(documentoExterno)"
                        @mouseenter="scheduleDocumentoExternoHover($event, documentoExterno)"
                        @mouseleave="handleHoverLeave">

                        <!-- Icono del documento dinámico -->
                        <div class="hidden md:flex items-center justify-center w-12 h-12 rounded-lg mr-4 transition-colors duration-200 flex-shrink-0"
                             :class="obtenerExtensionArchivo(documentoExterno) === 'pdf' ? 'bg-red-100 group-hover:bg-red-200' : 'bg-blue-100 group-hover:bg-blue-200'">
                            <!-- Icono PDF -->
                            <svg v-if="obtenerExtensionArchivo(documentoExterno) === 'pdf'" class="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                            </svg>
                            <!-- Icono imagen -->
                            <svg v-else class="h-6 w-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                            </svg>
                        </div>

                        <!-- Información del documento -->
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duración-200 flex items-center max-[390px]:text-base">
                                    <span class="max-w-56">
                                        <i v-if="verificandoPDF" class="fas fa-spinner fa-spin mr-0.5 text-yellow-500 text-sm"></i>
                                        <i v-else-if="!pdfDisponible" class="fas fa-exclamation-triangle mr-0.5 text-rose-500 text-sm" title="Documento externo no disponible"></i>
                                        <!-- <i v-else class="fas fa-check-circle mr-0.5 text-emerald-500 text-sm" title="Documento disponible"></i> -->
                                        {{ documentoExterno.nombreDocumento }}
                                    </span>
                                    <span
                                      v-if="documentoExterno.idResultadoClinico && documentoExterno.resultadoClinico"
                                      class="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1"
                                      :title="`Resultado: ${getResultadoTipoLabel(documentoExterno.resultadoClinico.tipoEstudio)}`"
                                    >
                                      <i class="fas fa-link text-emerald-600"></i>
                                      <span class="hidden md:inline">{{ getResultadoTipoLabel(documentoExterno.resultadoClinico.tipoEstudio) }}</span>
                                    </span>
                                    <span class="hidden sm:flex ml-2 px-2 py-1 text-xs font-medium rounded-full"
                                          :class="obtenerExtensionArchivo(documentoExterno) === 'pdf' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'">
                                        {{ obtenerExtensionArchivo(documentoExterno).toUpperCase() }}
                                    </span>
                                </h3>
                                <BadgeNotaAclaratoria
                                    v-if="tieneNotasAclaratorias"
                                    :documentoId="documentoId"
                                    :documentoTipo="documentoTipo"
                                    class="hidden sm:flex ml-2"
                                />
                                <span v-else class="hidden sm:flex ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                                    Documento Externo
                                </span>
                            </div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(documentoExterno.fechaDocumento) }}
                                </p>
                                <span class="hidden sm:flex ml-2 px-2 py-1 text-xs font-medium rounded-full"
                                    :class="obtenerExtensionArchivo(documentoExterno) === 'pdf' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'">
                                    {{ obtenerExtensionArchivo(documentoExterno).toUpperCase() }}
                                </span>

                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="documentoExterno.estado"
                                    :fechaFinalizacion="documentoExterno.fechaFinalizacion"
                                    :finalizadoPor="documentoExterno.finalizadoPor"
                                    :fechaAnulacion="documentoExterno.fechaAnulacion"
                                    :anuladoPor="documentoExterno.anuladoPor"
                                    :razonAnulacion="documentoExterno.razonAnulacion"
                                    tipoDocumento="Documento Externo"
                                />
                            </div>
                        </div>

                        <!-- Información adicional (pantallas grandes) -->
                        <div class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Notas</p>
                                    <p class="font-medium text-gray-800 text-sm truncate max-w-full">
                                        {{ documentoExterno.notasDocumento.trim() !== '' && documentoExterno.notasDocumento.trim() !== 'undefined' ? documentoExterno.notasDocumento : 'Sin notas' }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Examen de la Vista -->
                <div v-if="typeof examenVista === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <!-- Checkbox mejorado -->
                    <div class="mr-4 flex-shrink-0 flex items-center gap-1">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110"
                            :class="[
                                isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500',
                                isDeletableInBulkMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                            ]"
                            type="checkbox" :checked="isSelected"
                            :disabled="!isDeletableInBulkMode"
                            @change="(event) => handleCheckboxChange(event, examenVista, 'Examen Vista')">
                        <i v-if="isDeletionMode && !isDeletableInBulkMode" class="fas fa-lock text-gray-400 text-xs" title="Documento finalizado o anulado - no eliminable"></i>
                    </div>

                    <!-- Contenido principal -->
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${examenVista.rutaPDF}`,
                            `Examen Vista ${convertirFechaISOaDDMMYYYY(examenVista.fechaExamenVista)}.pdf`,
                            examenVista.updatedAt ? new Date(examenVista.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${examenVista.rutaPDF}`,
                            `Examen Vista ${convertirFechaISOaDDMMYYYY(examenVista.fechaExamenVista)}.pdf`,
                            examenVista.updatedAt ? new Date(examenVista.updatedAt).getTime() : null,
                            'Examen de la Vista')"
                        @mouseleave="handleHoverLeave">

                        <!-- Icono del documento -->
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mr-4 group-hover:bg-yellow-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fas fa-eye text-yellow-600 text-lg"></i>
                        </div>

                        <!-- Información del documento -->
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duración-200 flex items-center max-[390px]:text-base">
                                    Examen de la Vista
                                </h3>
                                <BadgeNotaAclaratoria
                                    v-if="tieneNotasAclaratorias"
                                    :documentoId="documentoId"
                                    :documentoTipo="documentoTipo"
                                    class="hidden sm:flex ml-2"
                                />
                                <span v-else class="hidden sm:flex ml-2 px-2 py-1 text-xs font-medium rounded-full"
                                    :class="examenVista.requiereLentesUsoGeneral === 'Si' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'">
                                    {{ examenVista.requiereLentesUsoGeneral === 'Si' ? 'Requiere lentes' : 'Agudeza normal' }}
                                </span>
                            </div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(examenVista.fechaExamenVista) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="examenVista.estado"
                                    :fechaFinalizacion="examenVista.fechaFinalizacion"
                                    :finalizadoPor="examenVista.finalizadoPor"
                                    :fechaAnulacion="examenVista.fechaAnulacion"
                                    :anuladoPor="examenVista.anuladoPor"
                                    :razonAnulacion="examenVista.razonAnulacion"
                                />
                                <span v-if="examenVista.porcentajeIshihara && examenVista.porcentajeIshihara < 80"
                                    class="hidden sm:flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                                    Daltonismo
                                </span>
                            </div>
                        </div>

                        <!-- Información adicional (pantallas grandes) -->
                        <div class="hidden xl:block flex-shrink-0">
                            <div class="text-sm flex space-x-2">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 flex-1">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Resultados</p>
                                    <p v-if="!examenVista.ojoIzquierdoLejanaConCorreccion && !examenVista.ojoDerechoLejanaConCorreccion" class="font-medium text-sm truncate"
                                        :class="examenVista.sinCorreccionLejanaInterpretacion === 'Visión excepcional' ? 'text-emerald-600' :
                                               examenVista.sinCorreccionLejanaInterpretacion === 'Visión normal' ? 'text-emerald-600' :
                                               examenVista.sinCorreccionLejanaInterpretacion === 'Visión ligeramente reducida' ? 'text-amber-600' :
                                               examenVista.sinCorreccionLejanaInterpretacion === 'Visión moderadamente reducida' ? 'text-red-600' :
                                               examenVista.sinCorreccionLejanaInterpretacion === 'Visión significativamente reducida' ? 'text-red-600' :
                                               examenVista.sinCorreccionLejanaInterpretacion === 'Visión muy reducida' ? 'text-red-700' : 'text-gray-800'">
                                        {{ examenVista.sinCorreccionLejanaInterpretacion }}
                                    </p>
                                    <p v-else class="font-medium text-sm text-gray-800 truncate">
                                        {{ examenVista.conCorreccionLejanaInterpretacion }} corregida
                                    </p>
                                </div>
                                <div class="hidden 2xl:block bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 flex-1">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Lentes</p>
                                    <p class="font-medium text-sm truncate"
                                        :class="examenVista.requiereLentesUsoGeneral === 'Si' ? 'text-red-600' : 'text-gray-800'">
                                        {{ examenVista.requiereLentesUsoGeneral === 'Si' ? 'Requiere' : examenVista.requiereLentesUsoGeneral === 'No' ? 'No requiere' : examenVista.requiereLentesUsoGeneral }}
                                    </p>
                                </div>
                                <div class="hidden xl:block bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 flex-1">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Ishihara</p>
                                    <p class="font-medium text-sm truncate"
                                        :class="!examenVista.porcentajeIshihara ? 'text-gray-600' : examenVista.porcentajeIshihara < 80 ? 'text-red-600' : 'text-gray-800'">
                                        {{ !examenVista.porcentajeIshihara ? 'Pendiente' : examenVista.porcentajeIshihara < 80 ? `${examenVista.porcentajeIshihara}% - Daltonismo` : `${examenVista.porcentajeIshihara}% - Normal` }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Exploracion Fisica -->
                <div v-if="typeof exploracionFisica === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <!-- Checkbox mejorado -->
                    <div class="mr-4 flex-shrink-0 flex items-center gap-1">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110"
                            :class="[
                                isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500',
                                isDeletableInBulkMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                            ]"
                            type="checkbox" :checked="isSelected"
                            :disabled="!isDeletableInBulkMode"
                            @change="(event) => handleCheckboxChange(event, exploracionFisica, 'Exploracion Fisica')">
                        <i v-if="isDeletionMode && !isDeletableInBulkMode" class="fas fa-lock text-gray-400 text-xs" title="Documento finalizado o anulado - no eliminable"></i>
                    </div>

                    <!-- Contenido principal -->
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${exploracionFisica.rutaPDF}`,
                            `Exploracion Fisica ${convertirFechaISOaDDMMYYYY(exploracionFisica.fechaExploracionFisica)}.pdf`,
                            exploracionFisica.updatedAt ? new Date(exploracionFisica.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${exploracionFisica.rutaPDF}`,
                            `Exploracion Fisica ${convertirFechaISOaDDMMYYYY(exploracionFisica.fechaExploracionFisica)}.pdf`,
                            exploracionFisica.updatedAt ? new Date(exploracionFisica.updatedAt).getTime() : null,
                            'Exploracion Fisica')"
                        @mouseleave="handleHoverLeave">

                        <!-- Icono del documento -->
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-lg mr-4 group-hover:bg-indigo-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fa-solid fa-person text-indigo-600 text-xl"></i>
                        </div>

                        <!-- Información del documento -->
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duración-200 flex items-center max-[390px]:text-base">
                                    Exploración Física
                                </h3>
                                <BadgeNotaAclaratoria
                                    v-if="tieneNotasAclaratorias"
                                    :documentoId="documentoId"
                                    :documentoTipo="documentoTipo"
                                    class="hidden sm:flex ml-2"
                                />
                                <span v-else class="hidden sm:flex ml-2 px-2 py-1 text-xs font-medium rounded-full"
                                    :class="exploracionFisica.resumenExploracionFisica === 'Se encuentra clínicamente sano' || exploracionFisica.resumenExploracionFisica === 'Se encuentra clínicamente sana' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                                    {{ exploracionFisica.resumenExploracionFisica === 'Se encuentra clínicamente sano' || exploracionFisica.resumenExploracionFisica === 'Se encuentra clínicamente sana' ? 'Sin hallazgos' : 'Hallazgos' }}
                                </span>
                            </div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(exploracionFisica.fechaExploracionFisica) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="exploracionFisica.estado"
                                    :fechaFinalizacion="exploracionFisica.fechaFinalizacion"
                                    :finalizadoPor="exploracionFisica.finalizadoPor"
                                    :fechaAnulacion="exploracionFisica.fechaAnulacion"
                                    :anuladoPor="exploracionFisica.anuladoPor"
                                    :razonAnulacion="exploracionFisica.razonAnulacion"
                                />
                                <span v-if="exploracionFisica.indiceMasaCorporal && exploracionFisica.indiceMasaCorporal >= 30"
                                    class="hidden sm:flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                                    Obesidad
                                </span>
                            </div>
                        </div>

                        <!-- Información adicional (pantallas grandes) -->
                        <div class="hidden xl:block w-64 flex-shrink-0">
                            <div class="text-sm flex xl:space-x-2">
                                <div class="hidden xl:block bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 flex-1">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">IMC</p>
                                    <p class="font-medium text-sm truncate"
                                        :class="exploracionFisica.categoriaIMC === 'Bajo peso' ? 'text-amber-600' :
                                               exploracionFisica.categoriaIMC === 'Normal' ? 'text-emerald-600' :
                                               exploracionFisica.categoriaIMC === 'Sobrepeso' ? 'text-amber-600' :
                                               exploracionFisica.categoriaIMC === 'Obesidad clase I' ? 'text-red-600' :
                                               exploracionFisica.categoriaIMC === 'Obesidad clase II' ? 'text-red-600' :
                                               exploracionFisica.categoriaIMC === 'Obesidad clase III' ? 'text-red-700' : 'text-gray-800'">
                                        {{ exploracionFisica.indiceMasaCorporal }} - {{ exploracionFisica.categoriaIMC }}
                                    </p>
                                </div>
                                <div class="hidden 2xl:block bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 flex-1">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Tensión Arterial</p>
                                    <p class="font-medium text-sm truncate"
                                        :class="exploracionFisica.categoriaTensionArterial === 'Óptima' ? 'text-emerald-600' :
                                               exploracionFisica.categoriaTensionArterial === 'Normal' ? 'text-emerald-600' :
                                               exploracionFisica.categoriaTensionArterial === 'Alta' ? 'text-amber-600' :
                                               exploracionFisica.categoriaTensionArterial === 'Hipertensión grado 1' ? 'text-amber-600' :
                                               exploracionFisica.categoriaTensionArterial === 'Hipertensión grado 2' ? 'text-red-600' :
                                               exploracionFisica.categoriaTensionArterial === 'Hipertensión grado 3' ? 'text-red-700' : 'text-gray-800'">
                                        <span>
                                            {{ exploracionFisica.categoriaTensionArterial }}
                                            <span v-if="exploracionFisica.categoriaTensionArterial === 'Normal' || exploracionFisica.categoriaTensionArterial === 'Óptima' || exploracionFisica.categoriaTensionArterial === 'Alta'">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                                        </span>
                                    </p>
                                </div>
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-exploracion xl-max-w-dynamic-exploracion-xl xxl-max-w-dynamic-exploracion-2xl">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Resumen</p>
                                    <p class="font-medium text-sm truncate max-w-full "
                                        :class="exploracionFisica.resumenExploracionFisica === 'Se encuentra clínicamente sano' || exploracionFisica.resumenExploracionFisica === 'Se encuentra clínicamente sana' ? 'text-gray-800' : 'text-red-600'">
                                        {{ exploracionFisica.resumenExploracionFisica === 'Se encuentra clínicamente sano' ? 'Clínicamente sano' : exploracionFisica.resumenExploracionFisica === 'Se encuentra clínicamente sana' ? 'Clínicamente sana' : exploracionFisica.resumenExploracionFisica }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Historia Clínica -->
                <div v-if="typeof historiaClinica === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <!-- Checkbox mejorado -->
                    <div class="mr-4 flex-shrink-0 flex items-center gap-1">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110"
                            :class="[
                                isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500',
                                isDeletableInBulkMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                            ]"
                            type="checkbox" :checked="isSelected"
                            :disabled="!isDeletableInBulkMode"
                            @change="(event) => handleCheckboxChange(event, historiaClinica, 'Historia Clinica')">
                        <i v-if="isDeletionMode && !isDeletableInBulkMode" class="fas fa-lock text-gray-400 text-xs" title="Documento finalizado o anulado - no eliminable"></i>
                    </div>

                    <!-- Contenido principal -->
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${historiaClinica.rutaPDF}`,
                            `Historia Clinica ${convertirFechaISOaDDMMYYYY(historiaClinica.fechaHistoriaClinica)}.pdf`,
                            historiaClinica.updatedAt ? new Date(historiaClinica.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${historiaClinica.rutaPDF}`,
                            `Historia Clinica ${convertirFechaISOaDDMMYYYY(historiaClinica.fechaHistoriaClinica)}.pdf`,
                            historiaClinica.updatedAt ? new Date(historiaClinica.updatedAt).getTime() : null,
                            'Historia Clinica')"
                        @mouseleave="handleHoverLeave">

                        <!-- Icono del documento -->
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-teal-100 rounded-lg mr-4 group-hover:bg-teal-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fas fa-notes-medical text-teal-600 text-lg"></i>
                        </div>

                        <!-- Información del documento -->
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duración-200 flex items-center max-[390px]:text-base">
                                    Historia Clínica
                                </h3>
                                <BadgeNotaAclaratoria
                                    v-if="tieneNotasAclaratorias"
                                    :documentoId="documentoId"
                                    :documentoTipo="documentoTipo"
                                    class="hidden sm:flex ml-2"
                                />
                                <span v-else class="hidden sm:flex ml-2 px-2 py-1 text-xs font-medium rounded-full"
                                    :class="historiaClinica.resumenHistoriaClinica === 'Se refiere actualmente asintomático' || historiaClinica.resumenHistoriaClinica === 'Se refiere actualmente asintomática' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                                    {{ historiaClinica.resumenHistoriaClinica === 'Se refiere actualmente asintomático' ? 'Asintomático' : historiaClinica.resumenHistoriaClinica === 'Se refiere actualmente asintomática' ? 'Asintomática' : 'Hallazgo' }}
                                </span>
                            </div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(historiaClinica.fechaHistoriaClinica) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="historiaClinica.estado"
                                    :fechaFinalizacion="historiaClinica.fechaFinalizacion"
                                    :finalizadoPor="historiaClinica.finalizadoPor"
                                    :fechaAnulacion="historiaClinica.fechaAnulacion"
                                    :anuladoPor="historiaClinica.anuladoPor"
                                    :razonAnulacion="historiaClinica.razonAnulacion"
                                />
                            </div>
                        </div>

                        <!-- Información adicional (pantallas grandes) -->
                        <div class="hidden xl:block w-64 flex-shrink-0">
                            <div class="text-sm flex xl:space-x-2">
                                <div class="hidden xl:block bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 flex-1">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Evaluación</p>
                                    <p class="font-medium text-gray-800 text-sm truncate">{{ historiaClinica.motivoExamen }}</p>
                                </div>
                                <div class="hidden 2xl:block bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 flex-1">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Accidente</p>
                                    <p class="font-medium text-sm truncate"
                                        :class="historiaClinica.accidenteLaboral === 'Si' && historiaClinica.secuelas !== 'Sin secuelas' ? 'text-red-600' : 'text-gray-800'">
                                        {{
                                            historiaClinica.accidenteLaboral === 'Si' && historiaClinica.secuelas === 'Sin secuelas' ? 'Si - Sin secuelas' :
                                            historiaClinica.accidenteLaboral === 'Si' && historiaClinica.secuelas !== 'Sin secuelas' ? `Si - Con secuelas` :
                                            historiaClinica.accidenteLaboral === 'No' ? 'Negado' : 'Negado'
                                        }}
                                    </p>
                                </div>
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-historia xl-max-w-dynamic-historia-xl xxl-max-w-dynamic-historia-2xl">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Resumen</p>
                                    <p class="font-medium text-sm truncate max-w-full xl:max-w-none 2xl:max-w-none"
                                        :class="historiaClinica.resumenHistoriaClinica === 'Se refiere actualmente asintomático' || historiaClinica.resumenHistoriaClinica === 'Se refiere actualmente asintomática' ? 'text-gray-800' : 'text-red-600'">
                                        {{ historiaClinica.resumenHistoriaClinica === 'Se refiere actualmente asintomático' ? 'Se refiere asintomático' : historiaClinica.resumenHistoriaClinica === 'Se refiere actualmente asintomática' ? 'Se refiere asintomática' : historiaClinica.resumenHistoriaClinica }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Nota Medica -->
                <div v-if="typeof notaMedica === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <!-- Checkbox mejorado -->
                    <div class="mr-4 flex-shrink-0 flex items-center gap-1">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110"
                            :class="[
                                isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500',
                                isDeletableInBulkMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                            ]"
                            type="checkbox" :checked="isSelected"
                            :disabled="!isDeletableInBulkMode"
                            @change="(event) => handleCheckboxChange(event, notaMedica, 'Nota Medica')">
                        <i v-if="isDeletionMode && !isDeletableInBulkMode" class="fas fa-lock text-gray-400 text-xs" title="Documento finalizado o anulado - no eliminable"></i>
                    </div>

                    <!-- Contenido principal -->
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${notaMedica.rutaPDF}`,
                            `Nota Medica ${convertirFechaISOaDDMMYYYY(notaMedica.fechaNotaMedica)}.pdf`,
                            notaMedica.updatedAt ? new Date(notaMedica.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${notaMedica.rutaPDF}`,
                            `Nota Medica ${convertirFechaISOaDDMMYYYY(notaMedica.fechaNotaMedica)}.pdf`,
                            notaMedica.updatedAt ? new Date(notaMedica.updatedAt).getTime() : null,
                            'Nota Medica')"
                        @mouseleave="handleHoverLeave">

                        <!-- Icono del documento -->
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mr-4 group-hover:bg-orange-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fas fa-stethoscope text-orange-600 text-lg"></i>
                        </div>

                        <!-- Información del documento -->
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duración-200 flex items-center max-[390px]:text-base">
                                    Nota Médica
                                </h3>
                                <BadgeNotaAclaratoria
                                    v-if="tieneNotasAclaratorias"
                                    :documentoId="documentoId"
                                    :documentoTipo="documentoTipo"
                                    class="hidden sm:flex ml-2"
                                />
                                <span v-else-if="notaMedica.diagnostico" class="hidden sm:flex ml-2 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                                    {{ notaMedica.tipoNota }}
                                </span>
                            </div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(notaMedica.fechaNotaMedica) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="notaMedica.estado"
                                    :fechaFinalizacion="notaMedica.fechaFinalizacion"
                                    :finalizadoPor="notaMedica.finalizadoPor"
                                    :fechaAnulacion="notaMedica.fechaAnulacion"
                                    :anuladoPor="notaMedica.anuladoPor"
                                    :razonAnulacion="notaMedica.razonAnulacion"
                                />
                            </div>
                        </div>

                        <!-- Información adicional (pantallas grandes) -->
                        <div v-if="notaMedica.diagnostico" class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Diagnóstico</p>
                                    <p class="font-medium text-gray-800 text-sm truncate max-w-full">{{ notaMedica.diagnostico }}</p>
                                </div>
                            </div>
                        </div>
                        <div v-if="notaMedica.codigoCIE10Principal" class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Diagnóstico Principal</p>
                                    <p class="font-medium text-gray-800 text-sm truncate max-w-full">{{ notaMedica.codigoCIE10Principal }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Receta Médica -->
                <div v-if="typeof receta === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <!-- Checkbox mejorado -->
                    <div class="mr-4 flex-shrink-0 flex items-center gap-1">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110"
                            :class="[
                                isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500',
                                isDeletableInBulkMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                            ]"
                            type="checkbox" :checked="isSelected"
                            :disabled="!isDeletableInBulkMode"
                            @change="(event) => handleCheckboxChange(event, receta, 'Receta')">
                        <i v-if="isDeletionMode && !isDeletableInBulkMode" class="fas fa-lock text-gray-400 text-xs" title="Documento finalizado o anulado - no eliminable"></i>
                    </div>

                    <!-- Contenido principal -->
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${receta.rutaPDF}`,
                            `Receta ${convertirFechaISOaDDMMYYYY(receta.fechaReceta)}.pdf`,
                            receta.updatedAt ? new Date(receta.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${receta.rutaPDF}`,
                            `Receta ${convertirFechaISOaDDMMYYYY(receta.fechaReceta)}.pdf`,
                            receta.updatedAt ? new Date(receta.updatedAt).getTime() : null,
                            'Receta')"
                        @mouseleave="handleHoverLeave">

                        <!-- Icono del documento -->
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-lg mr-4 group-hover:bg-emerald-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fas fa-prescription-bottle-medical text-emerald-600 text-lg"></i>
                        </div>

                        <!-- Información del documento -->
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duración-200 flex items-center max-[390px]:text-base">
                                    Receta Médica
                                </h3>
                                <BadgeNotaAclaratoria
                                    v-if="tieneNotasAclaratorias"
                                    :documentoId="documentoId"
                                    :documentoTipo="documentoTipo"
                                    class="hidden sm:flex ml-2"
                                />
                                <span v-else-if="Array.isArray(receta.tratamiento) && receta.tratamiento.length" class="hidden sm:flex ml-2 px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                                    {{ receta.tratamiento.length }} indicac{{ receta.tratamiento.length === 1 ? 'ión' : 'iones' }}
                                </span>
                            </div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(receta.fechaReceta) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="receta.estado"
                                    :fechaFinalizacion="receta.fechaFinalizacion"
                                    :finalizadoPor="receta.finalizadoPor"
                                    :fechaAnulacion="receta.fechaAnulacion"
                                    :anuladoPor="receta.anuladoPor"
                                    :razonAnulacion="receta.razonAnulacion"
                                />
                            </div>
                        </div>

                        <!-- Información adicional (pantallas grandes) -->
                        <div v-if="receta.indicaciones" class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Indicaciones</p>
                                    <p class="font-medium text-sm truncate max-w-full text-gray-800">
                                        {{ receta.indicaciones }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Control Prenatal -->
                <div v-if="controlPrenatalEnabled && typeof controlPrenatal === 'object'" class="flex itemsats-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <!-- Checkbox mejorado -->
                    <div class="mr-4 flex-shrink-0 flex items-center gap-1">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110"
                            :class="[
                                isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500',
                                isDeletableInBulkMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                            ]"
                            type="checkbox" :checked="isSelected"
                            :disabled="!isDeletableInBulkMode"
                            @change="(event) => handleCheckboxChange(event, controlPrenatal, 'Control Prenatal')">
                        <i v-if="isDeletionMode && !isDeletableInBulkMode" class="fas fa-lock text-gray-400 text-xs" title="Documento finalizado o anulado - no eliminable"></i>
                    </div>

                    <!-- Contenido principal -->
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${controlPrenatal.rutaPDF}`,
                            `Control Prenatal ${convertirFechaISOaDDMMYYYY(controlPrenatal.fechaInicioControlPrenatal)}.pdf`,
                            controlPrenatal.updatedAt ? new Date(controlPrenatal.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${controlPrenatal.rutaPDF}`,
                            `Control Prenatal ${convertirFechaISOaDDMMYYYY(controlPrenatal.fechaInicioControlPrenatal)}.pdf`,
                            controlPrenatal.updatedAt ? new Date(controlPrenatal.updatedAt).getTime() : null,
                            'Control Prenatal')"
                        @mouseleave="handleHoverLeave">

                        <!-- Icono del documento -->
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-pink-100 rounded-lg mr-4 group-hover:bg-pink-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fas fa-baby text-pink-600 text-lg"></i>
                        </div>

                        <!-- Información del documento -->
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duración-200 flex items-center max-[390px]:text-base">
                                    Control Prenatal
                                </h3>
                                <BadgeNotaAclaratoria
                                    v-if="tieneNotasAclaratorias"
                                    :documentoId="documentoId"
                                    :documentoTipo="documentoTipo"
                                    class="hidden sm:flex ml-2"
                                />
                                <span v-else-if="controlPrenatal.fpp" class="hidden sm:flex ml-2 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                                    FPP {{ convertirFechaISOaDDMMYYYY(controlPrenatal.fpp) }}
                                </span>
                            </div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(controlPrenatal.fechaInicioControlPrenatal) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="controlPrenatal.estado"
                                    :fechaFinalizacion="controlPrenatal.fechaFinalizacion"
                                    :finalizadoPor="controlPrenatal.finalizadoPor"
                                    :fechaAnulacion="controlPrenatal.fechaAnulacion"
                                    :anuladoPor="controlPrenatal.anuladoPor"
                                    :razonAnulacion="controlPrenatal.razonAnulacion"
                                />
                            </div>
                        </div>

                        <!-- Información adicional (pantallas grandes) -->
                        <div class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">ENE</p>
                                    <p class="font-medium text-gray-800 text-sm truncate max-w-full">{{ controlPrenatal.eneroFecha ? '✅' : '➖' }}</p>
                                </div>
                            </div>
                        </div>
                        <div class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">FEB</p>
                                    <p class="font-medium text-gray-800 text-sm truncate max-w-full">{{ controlPrenatal.febreroFecha ? '✅' : '➖' }}</p>
                                </div>
                            </div>
                        </div>
                        <div class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">MAR</p>
                                    <p class="font-medium text-gray-800 text-sm truncate max-w-full">{{ controlPrenatal.marzoFecha ? '✅' : '➖' }}</p>
                                </div>
                            </div>
                        </div>
                        <div class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">ABR</p>
                                    <p class="font-medium text-gray-800 text-sm truncate max-w-full">{{ controlPrenatal.abrilFecha ? '✅' : '➖' }}</p>
                                </div>
                            </div>
                        </div>
                        <div class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">MAY</p>
                                    <p class="font-medium text-gray-800 text-sm truncate max-w-full">{{ controlPrenatal.mayoFecha ? '✅' : '➖' }}</p>
                                </div>
                            </div>
                        </div>
                        <div class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">JUN</p>
                                    <p class="font-medium text-gray-800 text-sm truncate max-w-full">{{ controlPrenatal.junioFecha ? '✅' : '➖' }}</p>
                                </div>
                            </div>
                        </div>
                        <div class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">JUL</p>
                                    <p class="font-medium text-gray-800 text-sm truncate max-w-full">{{ controlPrenatal.julioFecha ? '✅' : '➖' }}</p>
                                </div>
                            </div>
                        </div>
                        <div class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">AGO</p>
                                    <p class="font-medium text-gray-800 text-sm truncate max-w-full">{{ controlPrenatal.agostoFecha ? '✅' : '➖' }}</p>
                                </div>
                            </div>
                        </div>
                        <div class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">SEP</p>
                                    <p class="font-medium text-gray-800 text-sm truncate max-w-full">{{ controlPrenatal.septiembreFecha ? '✅' : '➖' }}</p>
                                </div>
                            </div>
                        </div>
                        <div class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">OCT</p>
                                    <p class="font-medium text-gray-800 text-sm truncate max-w-full">{{ controlPrenatal.octubreFecha ? '✅' : '➖' }}</p>
                                </div>
                            </div>
                        </div>
                        <div class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">NOV</p>
                                    <p class="font-medium text-gray-800 text-sm truncate max-w-full">{{ controlPrenatal.noviembreFecha ? '✅' : '➖' }}</p>
                                </div>
                            </div>
                        </div>
                        <div class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">DIC</p>
                                    <p class="font-medium text-gray-800 text-sm truncate max-w-full">{{ controlPrenatal.diciembreFecha ? '✅' : '➖' }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Historia Otologica -->
                <div v-if="typeof historiaOtologica === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <!-- Checkbox mejorado -->
                    <div class="mr-4 flex-shrink-0 flex items-center gap-1">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110"
                            :class="[
                                isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500',
                                isDeletableInBulkMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                            ]"
                            type="checkbox" :checked="isSelected"
                            :disabled="!isDeletableInBulkMode"
                            @change="(event) => handleCheckboxChange(event, historiaOtologica, 'Historia Otologica')">
                        <i v-if="isDeletionMode && !isDeletableInBulkMode" class="fas fa-lock text-gray-400 text-xs" title="Documento finalizado o anulado - no eliminable"></i>
                    </div>

                    <!-- Contenido principal -->
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${historiaOtologica.rutaPDF}`,
                            `Historia Otologica ${convertirFechaISOaDDMMYYYY(historiaOtologica.fechaHistoriaOtologica)}.pdf`,
                            historiaOtologica.updatedAt ? new Date(historiaOtologica.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${historiaOtologica.rutaPDF}`,
                            `Historia Otologica ${convertirFechaISOaDDMMYYYY(historiaOtologica.fechaHistoriaOtologica)}.pdf`,
                            historiaOtologica.updatedAt ? new Date(historiaOtologica.updatedAt).getTime() : null,
                            'Historia Otologica')"
                        @mouseleave="handleHoverLeave">

                        <!-- Icono del documento -->
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mr-4 group-hover:bg-purple-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fas fa-ear-listen text-purple-600 text-lg"></i>
                        </div>

                        <!-- Información del documento -->
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duración-200 flex items-center max-[390px]:text-base">
                                    Historia Otologica
                                </h3>
                                <BadgeNotaAclaratoria
                                    v-if="tieneNotasAclaratorias"
                                    :documentoId="documentoId"
                                    :documentoTipo="documentoTipo"
                                    class="hidden sm:flex ml-2"
                                />
                                <span v-else-if="historiaOtologica.resultadoCuestionario || historiaOtologica.resultadoCuestionarioPersonalizado"
                                      class="hidden sm:flex ml-2 px-2 py-1 text-xs font-medium rounded-full"
                                      :class="{
                                        'bg-green-100 text-green-700': getResultadoCuestionarioColor(historiaOtologica.resultadoCuestionario, historiaOtologica.resultadoCuestionarioPersonalizado) === 'green',
                                        'bg-yellow-100 text-yellow-700': getResultadoCuestionarioColor(historiaOtologica.resultadoCuestionario, historiaOtologica.resultadoCuestionarioPersonalizado) === 'yellow',
                                        'bg-red-100 text-red-700': getResultadoCuestionarioColor(historiaOtologica.resultadoCuestionario, historiaOtologica.resultadoCuestionarioPersonalizado) === 'red',
                                        'bg-gray-100 text-gray-700': getResultadoCuestionarioColor(historiaOtologica.resultadoCuestionario, historiaOtologica.resultadoCuestionarioPersonalizado) === 'gray'
                                      }">
                                    {{ getResultadoCuestionarioTextoCorto(historiaOtologica.resultadoCuestionario, historiaOtologica.resultadoCuestionarioPersonalizado) }}
                                </span>
                            </div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(historiaOtologica.fechaHistoriaOtologica) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="historiaOtologica.estado"
                                    :fechaFinalizacion="historiaOtologica.fechaFinalizacion"
                                    :finalizadoPor="historiaOtologica.finalizadoPor"
                                    :fechaAnulacion="historiaOtologica.fechaAnulacion"
                                    :anuladoPor="historiaOtologica.anuladoPor"
                                    :razonAnulacion="historiaOtologica.razonAnulacion"
                                />
                            </div>
                        </div>

                        <!-- Información adicional (pantallas grandes) -->
                        <div v-if="historiaOtologica.resultadoCuestionario || historiaOtologica.resultadoCuestionarioPersonalizado" class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Resultado</p>
                                    <p class="font-medium text-sm truncate max-w-full"
                                       :class="{
                                         'text-green-700': getResultadoCuestionarioColor(historiaOtologica.resultadoCuestionario, historiaOtologica.resultadoCuestionarioPersonalizado) === 'green',
                                         'text-yellow-700': getResultadoCuestionarioColor(historiaOtologica.resultadoCuestionario, historiaOtologica.resultadoCuestionarioPersonalizado) === 'yellow',
                                         'text-red-700': getResultadoCuestionarioColor(historiaOtologica.resultadoCuestionario, historiaOtologica.resultadoCuestionarioPersonalizado) === 'red',
                                         'text-gray-800': getResultadoCuestionarioColor(historiaOtologica.resultadoCuestionario, historiaOtologica.resultadoCuestionarioPersonalizado) === 'gray'
                                       }">
                                        {{ getResultadoCuestionarioTexto(historiaOtologica.resultadoCuestionario, historiaOtologica.resultadoCuestionarioPersonalizado) }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Previo Espirometria -->
                <div v-if="typeof previoEspirometria === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <!-- Checkbox mejorado -->
                    <div class="mr-4 flex-shrink-0 flex items-center gap-1">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110"
                            :class="[
                                isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500',
                                isDeletableInBulkMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                            ]"
                            type="checkbox" :checked="isSelected"
                            :disabled="!isDeletableInBulkMode"
                            @change="(event) => handleCheckboxChange(event, previoEspirometria, 'Previo Espirometria')">
                        <i v-if="isDeletionMode && !isDeletableInBulkMode" class="fas fa-lock text-gray-400 text-xs" title="Documento finalizado o anulado - no eliminable"></i>
                    </div>

                    <!-- Contenido principal -->
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${previoEspirometria.rutaPDF}`,
                            `Previo Espirometria ${convertirFechaISOaDDMMYYYY(previoEspirometria.fechaPrevioEspirometria)}.pdf`,
                            previoEspirometria.updatedAt ? new Date(previoEspirometria.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${previoEspirometria.rutaPDF}`,
                            `Previo Espirometria ${convertirFechaISOaDDMMYYYY(previoEspirometria.fechaPrevioEspirometria)}.pdf`,
                            previoEspirometria.updatedAt ? new Date(previoEspirometria.updatedAt).getTime() : null,
                            'Previo Espirometria')"
                        @mouseleave="handleHoverLeave">

                        <!-- Icono del documento -->
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-sky-100 rounded-lg mr-4 group-hover:bg-sky-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fas fa-wind text-sky-600 text-lg"></i>
                        </div>

                        <!-- Información del documento -->
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duración-200 flex items-center max-[390px]:text-base">
                                    Previo Espirometria
                                </h3>
                                <BadgeNotaAclaratoria
                                    v-if="tieneNotasAclaratorias"
                                    :documentoId="documentoId"
                                    :documentoTipo="documentoTipo"
                                    class="hidden sm:flex ml-2"
                                />
                                <span v-else-if="previoEspirometria.resultadoCuestionario || previoEspirometria.resultadoCuestionarioPersonalizado"
                                      class="hidden sm:flex ml-2 px-2 py-1 text-xs font-medium rounded-full"
                                      :class="{
                                        'bg-green-100 text-green-700': getResultadoCuestionarioColor(previoEspirometria.resultadoCuestionario, previoEspirometria.resultadoCuestionarioPersonalizado) === 'green',
                                        'bg-yellow-100 text-yellow-700': getResultadoCuestionarioColor(previoEspirometria.resultadoCuestionario, previoEspirometria.resultadoCuestionarioPersonalizado) === 'yellow',
                                        'bg-red-100 text-red-700': getResultadoCuestionarioColor(previoEspirometria.resultadoCuestionario, previoEspirometria.resultadoCuestionarioPersonalizado) === 'red',
                                        'bg-gray-100 text-gray-700': getResultadoCuestionarioColor(previoEspirometria.resultadoCuestionario, previoEspirometria.resultadoCuestionarioPersonalizado) === 'gray'
                                      }">
                                    {{ getResultadoCuestionarioTextoCorto(previoEspirometria.resultadoCuestionario, previoEspirometria.resultadoCuestionarioPersonalizado) }}
                                </span>
                            </div>
                            <div class="flex items-center gap-2">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(previoEspirometria.fechaPrevioEspirometria) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="previoEspirometria.estado"
                                    :fechaFinalizacion="previoEspirometria.fechaFinalizacion"
                                    :finalizadoPor="previoEspirometria.finalizadoPor"
                                    :fechaAnulacion="previoEspirometria.fechaAnulacion"
                                    :anuladoPor="previoEspirometria.anuladoPor"
                                    :razonAnulacion="previoEspirometria.razonAnulacion"
                                />
                            </div>
                        </div>

                        <!-- Información adicional (pantallas grandes) -->
                        <div v-if="previoEspirometria.resultadoCuestionario || previoEspirometria.resultadoCuestionarioPersonalizado" class="hidden xl:block mr-4 flex-shrink-0 min-w-0">
                            <div class="text-sm">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit max-w-dynamic-base">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Resultado</p>
                                    <p class="font-medium text-sm truncate max-w-full"
                                       :class="{
                                         'text-green-700': getResultadoCuestionarioColor(previoEspirometria.resultadoCuestionario, previoEspirometria.resultadoCuestionarioPersonalizado) === 'green',
                                         'text-yellow-700': getResultadoCuestionarioColor(previoEspirometria.resultadoCuestionario, previoEspirometria.resultadoCuestionarioPersonalizado) === 'yellow',
                                         'text-red-700': getResultadoCuestionarioColor(previoEspirometria.resultadoCuestionario, previoEspirometria.resultadoCuestionarioPersonalizado) === 'red',
                                         'text-gray-800': getResultadoCuestionarioColor(previoEspirometria.resultadoCuestionario, previoEspirometria.resultadoCuestionarioPersonalizado) === 'gray'
                                       }">
                                        {{ getResultadoCuestionarioTexto(previoEspirometria.resultadoCuestionario, previoEspirometria.resultadoCuestionarioPersonalizado) }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Entrevista Psicologica -->
                <div v-if="typeof entrevistaPsicologica === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <!-- Checkbox mejorado -->
                    <div class="mr-4 flex-shrink-0">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110 cursor-pointer"
                            :class="isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500'"
                            type="checkbox" :checked="isSelected"
                            @change="(event) => handleCheckboxChange(event, entrevistaPsicologica, 'Entrevista Psicologica')">
                    </div>

                    <!-- Contenido principal -->
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${entrevistaPsicologica.rutaPDF}`,
                            `Entrevista Psicologica ${convertirFechaISOaDDMMYYYY(entrevistaPsicologica.fechaEntrevistaPsicologica)}.pdf`,
                            entrevistaPsicologica.updatedAt ? new Date(entrevistaPsicologica.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${entrevistaPsicologica.rutaPDF}`,
                            `Entrevista Psicologica ${convertirFechaISOaDDMMYYYY(entrevistaPsicologica.fechaEntrevistaPsicologica)}.pdf`,
                            entrevistaPsicologica.updatedAt ? new Date(entrevistaPsicologica.updatedAt).getTime() : null,
                            'Entrevista Psicologica')"
                        @mouseleave="handleHoverLeave">

                        <!-- Icono del documento -->
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-slate-100 rounded-lg mr-4 group-hover:bg-slate-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fa-regular fa-comments text-slate-600 text-lg"></i>
                        </div>

                        <!-- Información del documento -->
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1 flex-wrap gap-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duration-200 flex items-center max-[390px]:text-base">
                                    Entrevista Psicológica
                                </h3>
                                <span
                                    v-if="entrevistaPsicologica.ideacionSuicida === 'Sí'"
                                    class="hidden sm:flex ml-0 sm:ml-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                                    Alerta
                                </span>
                                <span
                                    v-if="entrevistaPsicologica.ideacionSuicida === 'No'"
                                    class="hidden sm:flex ml-0 sm:ml-1 px-2 py-1 text-xs font-medium rounded-full"
                                    :class="entrevistaPsicologicaSinHallazgoConclusion ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                                    {{ entrevistaPsicologicaSinHallazgoConclusion ? 'Sin hallazgos' : 'Hallazgo' }}
                                </span>
                            </div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(entrevistaPsicologica.fechaEntrevistaPsicologica) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="entrevistaPsicologica.estado"
                                    :fechaFinalizacion="entrevistaPsicologica.fechaFinalizacion"
                                    :finalizadoPor="entrevistaPsicologica.finalizadoPor"
                                    :fechaAnulacion="entrevistaPsicologica.fechaAnulacion"
                                    :anuladoPor="entrevistaPsicologica.anuladoPor"
                                    :razonAnulacion="entrevistaPsicologica.razonAnulacion"
                                />
                            </div>
                        </div>

                        <!-- Información adicional (pantallas grandes): flex-1 para no capar el ancho en w-64 -->
                        <div class="hidden xl:flex xl:flex-1 xl:min-w-0 min-w-0">
                            <div class="text-sm flex xl:space-x-2 min-w-0 flex-1">
                                <div
                                    v-if="entrevistaPsicologica.ideacionSuicida === 'Sí'"
                                    class="hidden xl:block bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 flex-shrink-0">
                                    <div class="min-w-0">
                                        <p class="text-red-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Riesgo</p>
                                        <p class="font-medium text-sm truncate max-w-full text-red-700">
                                            Ideación suicida
                                        </p>
                                    </div>
                                </div>
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit min-w-0 max-w-dynamic-entrevista-conclusion xl-max-w-dynamic-entrevista-conclusion-xl xxl-max-w-dynamic-entrevista-conclusion-2xl">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Conclusión</p>
                                    <p
                                        class="font-medium text-sm truncate max-w-full xl:max-w-none 2xl:max-w-none"
                                        :class="entrevistaPsicologicaSinHallazgoConclusion ? 'text-gray-800' : 'text-red-600'"
                                        :title="entrevistaPsicologica.conclusionClinica">
                                        {{ entrevistaPsicologica.conclusionClinica }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Trastornos del estado de ánimo -->
                <div v-if="typeof trastornosEstadoAnimo === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <div class="mr-4 flex-shrink-0">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110 cursor-pointer"
                            :class="isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500'"
                            type="checkbox" :checked="isSelected"
                            @change="(event) => handleCheckboxChange(event, trastornosEstadoAnimo, 'Trastornos Estado Animo')">
                    </div>
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${trastornosEstadoAnimo.rutaPDF}`,
                            `Trastornos Estado Animo ${convertirFechaISOaDDMMYYYY(trastornosEstadoAnimo.fechaTrastornosEstadoAnimo)}.pdf`,
                            trastornosEstadoAnimo.updatedAt ? new Date(trastornosEstadoAnimo.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${trastornosEstadoAnimo.rutaPDF}`,
                            `Trastornos Estado Animo ${convertirFechaISOaDDMMYYYY(trastornosEstadoAnimo.fechaTrastornosEstadoAnimo)}.pdf`,
                            trastornosEstadoAnimo.updatedAt ? new Date(trastornosEstadoAnimo.updatedAt).getTime() : null,
                            'Trastornos Estado Animo')"
                        @mouseleave="handleHoverLeave">
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-violet-100 rounded-lg mr-4 group-hover:bg-violet-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fa-solid fa-wave-square text-violet-600 text-lg"></i>
                        </div>
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1 flex-wrap gap-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duration-200 flex items-center max-[390px]:text-base">
                                    Trastornos del estado de ánimo
                                </h3>
                            </div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(trastornosEstadoAnimo.fechaTrastornosEstadoAnimo) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="trastornosEstadoAnimo.estado"
                                    :fechaFinalizacion="trastornosEstadoAnimo.fechaFinalizacion"
                                    :finalizadoPor="trastornosEstadoAnimo.finalizadoPor"
                                    :fechaAnulacion="trastornosEstadoAnimo.fechaAnulacion"
                                    :anuladoPor="trastornosEstadoAnimo.anuladoPor"
                                    :razonAnulacion="trastornosEstadoAnimo.razonAnulacion"
                                />
                            </div>
                        </div>
                        <div class="hidden xl:flex xl:flex-1 xl:min-w-0 min-w-0">
                            <div class="text-sm flex xl:space-x-2 min-w-0 flex-1">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit min-w-0 max-w-dynamic-entrevista-conclusion xl-max-w-dynamic-entrevista-conclusion-xl xxl-max-w-dynamic-entrevista-conclusion-2xl">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Interpretación</p>
                                    <p
                                        class="font-medium text-sm truncate max-w-full xl:max-w-none 2xl:max-w-none"
                                        :class="claseColorInterpretacionMdqLista"
                                        :title="interpretacionTrastornosEstadoAnimo">
                                        {{ interpretacionTrastornosEstadoAnimo }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Cuestionario prodromal breve -->
                <div v-if="typeof cuestionarioProdromalBreve === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <div class="mr-4 flex-shrink-0">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110 cursor-pointer"
                            :class="isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500'"
                            type="checkbox" :checked="isSelected"
                            @change="(event) => handleCheckboxChange(event, cuestionarioProdromalBreve, 'Cuestionario Prodromal Breve')">
                    </div>
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${cuestionarioProdromalBreve.rutaPDF}`,
                            `Cuestionario Prodromal Breve ${convertirFechaISOaDDMMYYYY(cuestionarioProdromalBreve.fechaCuestionarioProdromalBreve)}.pdf`,
                            cuestionarioProdromalBreve.updatedAt ? new Date(cuestionarioProdromalBreve.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${cuestionarioProdromalBreve.rutaPDF}`,
                            `Cuestionario Prodromal Breve ${convertirFechaISOaDDMMYYYY(cuestionarioProdromalBreve.fechaCuestionarioProdromalBreve)}.pdf`,
                            cuestionarioProdromalBreve.updatedAt ? new Date(cuestionarioProdromalBreve.updatedAt).getTime() : null,
                            'Cuestionario Prodromal Breve')"
                        @mouseleave="handleHoverLeave">
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mr-4 group-hover:bg-purple-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fa-solid fa-brain text-purple-600 text-lg"></i>
                        </div>
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1 flex-wrap gap-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duration-200 flex items-center max-[390px]:text-base">
                                    Cuestionario prodromal breve
                                </h3>
                            </div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(cuestionarioProdromalBreve.fechaCuestionarioProdromalBreve) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="cuestionarioProdromalBreve.estado"
                                    :fechaFinalizacion="cuestionarioProdromalBreve.fechaFinalizacion"
                                    :finalizadoPor="cuestionarioProdromalBreve.finalizadoPor"
                                    :fechaAnulacion="cuestionarioProdromalBreve.fechaAnulacion"
                                    :anuladoPor="cuestionarioProdromalBreve.anuladoPor"
                                    :razonAnulacion="cuestionarioProdromalBreve.razonAnulacion"
                                />
                            </div>
                        </div>
                        <div class="hidden xl:flex xl:flex-1 xl:min-w-0 min-w-0">
                            <div class="text-sm flex xl:space-x-2 min-w-0 flex-1">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit min-w-0 max-w-dynamic-entrevista-conclusion xl-max-w-dynamic-entrevista-conclusion-xl xxl-max-w-dynamic-entrevista-conclusion-2xl">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Interpretación</p>
                                    <p
                                        class="font-medium text-sm truncate max-w-full xl:max-w-none 2xl:max-w-none"
                                        :class="claseColorInterpretacionPQBLista"
                                        :title="interpretacionCuestionarioProdromalBreve">
                                        {{ interpretacionCuestionarioProdromalBreve }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Trastorno límite de la personalidad -->
                <div v-if="typeof trastornoLimitePersonalidad === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <div class="mr-4 flex-shrink-0">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110 cursor-pointer"
                            :class="isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500'"
                            type="checkbox" :checked="isSelected"
                            @change="(event) => handleCheckboxChange(event, trastornoLimitePersonalidad, 'Trastorno Limite Personalidad')">
                    </div>
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${trastornoLimitePersonalidad.rutaPDF}`,
                            `Trastorno Limite Personalidad ${convertirFechaISOaDDMMYYYY(trastornoLimitePersonalidad.fechaTrastornoLimitePersonalidad)}.pdf`,
                            trastornoLimitePersonalidad.updatedAt ? new Date(trastornoLimitePersonalidad.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${trastornoLimitePersonalidad.rutaPDF}`,
                            `Trastorno Limite Personalidad ${convertirFechaISOaDDMMYYYY(trastornoLimitePersonalidad.fechaTrastornoLimitePersonalidad)}.pdf`,
                            trastornoLimitePersonalidad.updatedAt ? new Date(trastornoLimitePersonalidad.updatedAt).getTime() : null,
                            'Trastorno Limite Personalidad')"
                        @mouseleave="handleHoverLeave">
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-rose-100 rounded-lg mr-4 group-hover:bg-rose-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fa-solid fa-heart-crack text-rose-600 text-lg"></i>
                        </div>
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1 flex-wrap gap-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duration-200 flex items-center max-[390px]:text-base">
                                    Trastorno límite de la personalidad
                                </h3>
                            </div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(trastornoLimitePersonalidad.fechaTrastornoLimitePersonalidad) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="trastornoLimitePersonalidad.estado"
                                    :fechaFinalizacion="trastornoLimitePersonalidad.fechaFinalizacion"
                                    :finalizadoPor="trastornoLimitePersonalidad.finalizadoPor"
                                    :fechaAnulacion="trastornoLimitePersonalidad.fechaAnulacion"
                                    :anuladoPor="trastornoLimitePersonalidad.anuladoPor"
                                    :razonAnulacion="trastornoLimitePersonalidad.razonAnulacion"
                                />
                            </div>
                        </div>
                        <div class="hidden xl:flex xl:flex-1 xl:min-w-0 min-w-0">
                            <div class="text-sm flex xl:space-x-2 min-w-0 flex-1">
                                <div class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 w-fit min-w-0 max-w-dynamic-entrevista-conclusion xl-max-w-dynamic-entrevista-conclusion-xl xxl-max-w-dynamic-entrevista-conclusion-2xl">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Interpretación</p>
                                    <p
                                        class="font-medium text-sm truncate max-w-full xl:max-w-none 2xl:max-w-none"
                                        :class="claseColorInterpretacionTlpLista"
                                        :title="interpretacionTrastornoLimitePersonalidad">
                                        {{ interpretacionTrastornoLimitePersonalidad }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                    
                <!-- Evento Seguimiento Cardiometabolico -->
                <div v-if="typeof eventoSeguimientoCardiometabolico === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <div class="mr-4 flex-shrink-0">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110 cursor-pointer"
                            :class="isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500'"
                            type="checkbox" :checked="isSelected"
                            @change="(event) => handleCheckboxChange(event, eventoSeguimientoCardiometabolico, 'Evento Seguimiento Cardiometabolico')">
                    </div>
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${eventoSeguimientoCardiometabolico.rutaPDF}`,
                            `Evento Seguimiento Cardiometabolico ${convertirFechaISOaDDMMYYYY(eventoSeguimientoCardiometabolico.fechaEventoSeguimientoCardiometabolico)}.pdf`,
                            eventoSeguimientoCardiometabolico.updatedAt ? new Date(eventoSeguimientoCardiometabolico.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${eventoSeguimientoCardiometabolico.rutaPDF}`,
                            `Evento Seguimiento Cardiometabolico ${convertirFechaISOaDDMMYYYY(eventoSeguimientoCardiometabolico.fechaEventoSeguimientoCardiometabolico)}.pdf`,
                            eventoSeguimientoCardiometabolico.updatedAt ? new Date(eventoSeguimientoCardiometabolico.updatedAt).getTime() : null,
                            'Evento Seguimiento Cardiometabolico')"
                        @mouseleave="handleHoverLeave">
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-rose-100 rounded-lg mr-4 group-hover:bg-rose-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fa-solid fa-heart-crack text-rose-600 text-lg"></i>
                        </div>
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1 flex-wrap gap-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duration-200 flex items-center max-[390px]:text-base">
                                    Evento Seguimiento Cardiometabolico
                                </h3>
                                <BadgeNotaAclaratoria
                                    v-if="tieneNotasAclaratorias"
                                    :documentoId="documentoId"
                                    :documentoTipo="documentoTipo"
                                    class="hidden sm:flex ml-2"
                                />
                            </div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(eventoSeguimientoCardiometabolico.fechaEventoSeguimientoCardiometabolico) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="eventoSeguimientoCardiometabolico.estado"
                                    :fechaFinalizacion="eventoSeguimientoCardiometabolico.fechaFinalizacion"
                                    :finalizadoPor="eventoSeguimientoCardiometabolico.finalizadoPor"
                                    :fechaAnulacion="eventoSeguimientoCardiometabolico.fechaAnulacion"
                                    :anuladoPor="eventoSeguimientoCardiometabolico.anuladoPor"
                                    :razonAnulacion="eventoSeguimientoCardiometabolico.razonAnulacion"
                                />
                            </div>
                        </div>

                        <div class="hidden xl:flex xl:flex-1 xl:min-w-0 min-w-0">
                            <div class="text-sm flex flex-wrap xl:flex-nowrap xl:space-x-2 gap-y-2 min-w-0 flex-1">
                                <div
                                    class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 min-w-[7.5rem] max-w-[9.5rem] flex-shrink-0">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">HTA</p>
                                    <p
                                        class="font-medium text-xs sm:text-sm leading-snug"
                                        :class="claseTextoEstadoCardiometabolicoLista.hipertensionArterial"
                                        :title="labelControlCardiometabolicoDoc(eventoSeguimientoCardiometabolico.estadoCondiciones?.hipertensionArterial?.control)">
                                        {{ labelControlCardiometabolicoDoc(eventoSeguimientoCardiometabolico.estadoCondiciones?.hipertensionArterial?.control) }}
                                    </p>
                                </div>
                                <div
                                    class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 min-w-[7.5rem] max-w-[9.5rem] flex-shrink-0">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">DM2</p>
                                    <p
                                        class="font-medium text-xs sm:text-sm leading-snug"
                                        :class="claseTextoEstadoCardiometabolicoLista.diabetesMellitusTipo2"
                                        :title="labelControlCardiometabolicoDoc(eventoSeguimientoCardiometabolico.estadoCondiciones?.diabetesMellitusTipo2?.control)">
                                        {{ labelControlCardiometabolicoDoc(eventoSeguimientoCardiometabolico.estadoCondiciones?.diabetesMellitusTipo2?.control) }}
                                    </p>
                                </div>
                                <div
                                    class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 min-w-[7.5rem] max-w-[10.5rem] flex-shrink-0">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Dislipidemia</p>
                                    <p
                                        class="font-medium text-xs sm:text-sm leading-snug"
                                        :class="claseTextoEstadoCardiometabolicoLista.dislipidemia"
                                        :title="labelControlCardiometabolicoDoc(eventoSeguimientoCardiometabolico.estadoCondiciones?.dislipidemia?.control)">
                                        {{ labelControlCardiometabolicoDoc(eventoSeguimientoCardiometabolico.estadoCondiciones?.dislipidemia?.control) }}
                                    </p>
                                </div>
                                <div
                                    class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 min-w-[7.5rem] max-w-[11rem] flex-shrink-0">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Nivel obesidad</p>
                                    <p
                                        class="font-medium text-xs sm:text-sm leading-snug"
                                        :class="claseTextoEstadoCardiometabolicoLista.obesidad"
                                        :title="labelGradoObesidadCardiometabolicoDoc(eventoSeguimientoCardiometabolico.estadoCondiciones?.obesidad?.grado)">
                                        {{ labelGradoObesidadCardiometabolicoDoc(eventoSeguimientoCardiometabolico.estadoCondiciones?.obesidad?.grado) }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Informe Longitudinal Cardiometabolico -->
                <div v-if="typeof informeLongitudinalCardiometabolico === 'object'" class="flex items-center w-full h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3">
                    <div class="mr-4 flex-shrink-0">
                        <input
                            class="w-5 h-5 bg-gray-100 border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 ease-in-out hover:scale-110 cursor-pointer"
                            :class="isDeletionMode ? 'accent-red-600 text-red-600 focus:ring-red-500' : 'accent-teal-600 text-emerald-600 focus:ring-emerald-500'"
                            type="checkbox" :checked="isSelected"
                            @change="(event) => handleCheckboxChange(event, informeLongitudinalCardiometabolico, 'Informe Longitudinal Cardiometabolico')">
                    </div>
                    <div
                        class="flex items-center flex-1 h-full max-[390px]:flex-col max-[390px]:items-start max-[390px]:gap-3"
                        @click="abrirPdf(
                            `${informeLongitudinalCardiometabolico.rutaPDF}`,
                            `Informe Longitudinal Cardiometabolico ${convertirFechaISOaDDMMYYYY(informeLongitudinalCardiometabolico.fechaInformeLongitudinalCardiometabolico)}.pdf`,
                            informeLongitudinalCardiometabolico.updatedAt ? new Date(informeLongitudinalCardiometabolico.updatedAt).getTime() : null)"
                        @mouseenter="schedulePdfHover(
                            $event,
                            `${informeLongitudinalCardiometabolico.rutaPDF}`,
                            `Informe Longitudinal Cardiometabolico ${convertirFechaISOaDDMMYYYY(informeLongitudinalCardiometabolico.fechaInformeLongitudinalCardiometabolico)}.pdf`,
                            informeLongitudinalCardiometabolico.updatedAt ? new Date(informeLongitudinalCardiometabolico.updatedAt).getTime() : null,
                            'Informe Longitudinal Cardiometabolico')"
                        @mouseleave="handleHoverLeave">
                        <div class="hidden md:flex items-center justify-center w-12 h-12 bg-rose-100 rounded-lg mr-4 group-hover:bg-rose-200 transition-colors duration-200 flex-shrink-0">
                            <i class="fa-solid fa-heart-crack text-rose-600 text-lg"></i>
                        </div>
                        <div class="sm:w-72 min-w-0 max-w-xs w-full max-[390px]:max-w-full">
                            <div class="flex items-center mb-1 flex-wrap gap-1">
                                <h3 class="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors duration-200 flex items-center max-[390px]:text-base">
                                    Informe Longitudinal Cardiometabolico
                                </h3>
                                <BadgeNotaAclaratoria
                                    v-if="tieneNotasAclaratorias"
                                    :documentoId="documentoId"
                                    :documentoTipo="documentoTipo"
                                    class="hidden sm:flex ml-2"
                                />
                            </div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <p class="text-sm text-gray-500 flex items-center">
                                    <i class="fas fa-calendar-alt mr-2 text-gray-400"></i>
                                    {{ convertirFechaISOaDDMMYYYY(informeLongitudinalCardiometabolico.fechaInformeLongitudinalCardiometabolico) }}
                                </p>
                                <EstadoDocumentoBadge
                                    v-if="isMX && documentImmutabilityEnabled"
                                    :estado="informeLongitudinalCardiometabolico.estado"
                                    :fechaFinalizacion="informeLongitudinalCardiometabolico.fechaFinalizacion"
                                    :finalizadoPor="informeLongitudinalCardiometabolico.finalizadoPor"
                                    :fechaAnulacion="informeLongitudinalCardiometabolico.fechaAnulacion"
                                    :anuladoPor="informeLongitudinalCardiometabolico.anuladoPor"
                                    :razonAnulacion="informeLongitudinalCardiometabolico.razonAnulacion"
                                />
                            </div>
                        </div>

                        <div class="hidden xl:flex xl:flex-1 xl:min-w-0 min-w-0">
                            <div class="text-sm flex flex-wrap xl:flex-nowrap xl:space-x-2 gap-y-2 min-w-0 flex-1">
                                <div
                                    class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 min-w-[7.5rem] max-w-[9.5rem] flex-shrink-0">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Riesgo</p>
                                    <p
                                        class="font-medium text-xs sm:text-sm leading-snug"
                                        :class="chipsInformeLongitudinalLista.riesgo.clase"
                                        :title="chipsInformeLongitudinalLista.riesgo.label">
                                        {{ chipsInformeLongitudinalLista.riesgo.label }}
                                    </p>
                                </div>
                                <div
                                    class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 min-w-[7.5rem] max-w-[10.5rem] flex-shrink-0">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Trayectoria</p>
                                    <p
                                        class="font-medium text-xs sm:text-sm leading-snug"
                                        :class="chipsInformeLongitudinalLista.trayectoria.clase"
                                        :title="chipsInformeLongitudinalLista.trayectoria.label">
                                        {{ chipsInformeLongitudinalLista.trayectoria.label }}
                                    </p>
                                </div>
                                <div
                                    class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 min-w-[7.5rem] max-w-[9.5rem] flex-shrink-0">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">% Asistencia</p>
                                    <p
                                        class="font-medium text-xs sm:text-sm leading-snug tabular-nums"
                                        :class="chipsInformeLongitudinalLista.asistencia.clase"
                                        :title="chipsInformeLongitudinalLista.asistencia.label">
                                        {{ chipsInformeLongitudinalLista.asistencia.label }}
                                    </p>
                                </div>
                                <div
                                    class="bg-gray-50 rounded-lg px-2 py-1 border border-gray-100 min-w-[7.5rem] max-w-[11rem] flex-shrink-0">
                                    <p class="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">Consistencia</p>
                                    <p
                                        class="font-medium text-xs sm:text-sm leading-snug"
                                        :class="chipsInformeLongitudinalLista.consistencia.clase"
                                        :title="chipsInformeLongitudinalLista.consistencia.label">
                                        {{ chipsInformeLongitudinalLista.consistencia.label }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Botones de acción -->
            <div class="documento-item-actions flex flex-wrap justify-end gap-1 sm:gap-1.5 md:gap-2 mx-1.5 w-auto">
                <!-- Botón de descarga dinámico -->
                <template v-for="(documento, key) in {
                    'Antidoping': antidoping,
                    'Aptitud': aptitud,
                    'Constancia de Aptitud': constanciaAptitud,
                    'Audiometria': audiometria,
                    'Certificado': certificado,
                    'Certificado Expedito': certificadoExpedito,
                    'Receta': receta,
                    'Documento Externo': documentoExterno,
                    'Examen Vista': examenVista,
                    'Exploracion Fisica': exploracionFisica,
                    'Historia Clinica': historiaClinica,
                    'Nota Medica': notaMedica,
                    'Nota Aclaratoria': notaAclaratoria,
                    'Control Prenatal': controlPrenatal,
                    'Historia Otologica': historiaOtologica,
                    'Previo Espirometria': previoEspirometria,
                    'Entrevista Psicologica': entrevistaPsicologica,
                    'Trastornos Estado Animo': trastornosEstadoAnimo,
                    'Cuestionario Prodromal Breve': cuestionarioProdromalBreve,
                    'Trastorno Limite Personalidad': trastornoLimitePersonalidad,
                    'Evento Seguimiento Cardiometabolico': eventoSeguimientoCardiometabolico,
                    'Informe Longitudinal Cardiometabolico': informeLongitudinalCardiometabolico,
                }" :key="key">
                    <button v-if="documento && documento.rutaDocumento"
                        @click="descargarArchivo(documento, key)"
                        @mouseenter="(e) => updateTooltipPosition(e, 'Descargar documento')"
                        @mouseleave="hideTooltip"
                        type="button"
                        class="documento-item-action documento-item-action--download py-1 px-1.5 sm:py-2 sm:px-2.5 rounded-full bg-green-100 hover:bg-green-200 text-green-600 transition-transform duration-300 ease-in-out transform hover:scale-110 shadow-sm z-5">
                        <i class="fa-solid fa-download fa-lg"></i>
                    </button>
                    <button v-if="documento && documento.rutaPDF"
                        @click="descargarArchivo(documento, key)"
                        @mouseenter="(e) => updateTooltipPosition(e, 'Descargar documento')"
                        @mouseleave="hideTooltip"
                        type="button"
                        class="documento-item-action documento-item-action--download py-1 px-1.5 sm:py-2 sm:px-2.5 rounded-full bg-green-100 hover:bg-green-200 text-green-600 transition-transform duration-300 ease-in-out transform hover:scale-110 shadow-sm z-5">
                        <i class="fa-solid fa-download fa-lg"></i>
                    </button>
                </template>

                <button v-if="documentoTipo === 'documentoExterno'" type="button"
                    :class="[
                        'documento-item-action py-1 px-1.5 sm:py-2 sm:px-2.5 rounded-full transition-transform duration-200 ease-in-out transform shadow-sm z-5',
                        canEditFinalized
                            ? 'documento-item-action--edit bg-sky-100 hover:bg-sky-200 text-sky-600 hover:scale-110'
                            : 'documento-item-action--disabled bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                    ]"
                    @click="handleEditDocumentoExterno"
                    @mouseenter="(e) => updateTooltipPosition(e, isReadOnly ? 'Ver documento' : 'Editar documento')"
                    @mouseleave="hideTooltip">
                    <i :class="isReadOnly ? 'fa-regular fa-eye fa-lg' : 'fa-regular fa-pen-to-square fa-lg'"></i>
                </button>
                <button v-else type="button"
                    :class="[
                        'documento-item-action py-1 px-1.5 sm:py-2 sm:px-2.5 rounded-full transition-transform duration-200 ease-in-out transform shadow-sm z-5',
                        canEditFinalized
                            ? 'documento-item-action--edit bg-sky-100 hover:bg-sky-200 text-sky-600 hover:scale-110'
                            : 'documento-item-action--disabled bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                    ]"
                    @click="handleEditDocument(documentoId, documentoTipo)"
                    @mouseenter="(e) => updateTooltipPosition(e, isReadOnly ? 'Ver documento' : 'Editar documento')"
                    @mouseleave="hideTooltip">
                    <i :class="isReadOnly ? 'fa-regular fa-eye fa-lg' : 'fa-regular fa-pen-to-square fa-lg'"></i>
                </button>

                <button v-if="puedeFinalizar && documentImmutabilityEnabled" type="button"
                    class="documento-item-action documento-item-action--finalize py-1 px-1.5 sm:py-2 sm:px-2.5 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-600 transition-transform duration-200 ease-in-out transform hover:scale-110 shadow-sm z-5"
                    @click="$emit('abrirModalFinalizar', documentoId, documentoNombre, documentoTipo)"
                    @mouseenter="(e) => updateTooltipPosition(e, 'Finalizar documento')"
                    @mouseleave="hideTooltip">
                    <i class="fa-solid fa-file-signature fa-lg"></i>
                </button>

                <button type="button"
                    :class="[
                        'documento-item-action py-1 px-1.5 sm:py-2 sm:px-2.5 rounded-full transition-transform duration-200 ease-in-out transform shadow-sm z-5',
                        canDeleteDocument(documentoTipo) && !isAnulado
                            ? 'documento-item-action--delete bg-red-100 hover:bg-red-200 text-red-600 hover:scale-110'
                            : 'documento-item-action--disabled bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                    ]"
                    :disabled="!canDeleteDocument(documentoTipo) || isAnulado"
                    @click="isAnulacion ? handleAnularDocument(documentoId, documentoNombre, documentoTipo) : handleDeleteDocument(documentoId, documentoNombre, documentoTipo)"
                    @mouseenter="(e) => updateTooltipPosition(e, isAnulado ? 'Documento anulado' : (isAnulacion ? 'Anular documento' : 'Eliminar documento'))"
                    @mouseleave="hideTooltip">
                    <i :class="isAnulacion ? 'fa-solid fa-file-circle-xmark fa-lg' : 'fa-solid fa-trash-can fa-lg'"></i>
                </button>
            </div>
        </div>
    </div>

    <DocumentHoverPreview
        :visible="hoverPreview.visible"
        :type="hoverPreview.type"
        :src="hoverPreview.src"
        :title="hoverPreview.title"
        :position="hoverPreview.position"
        :size="hoverPreview.size"
        :pdfAvailable="hoverPreview.pdfAvailable"
        :isRegenerable="hoverPreview.isRegenerable"
        @enter="handlePreviewEnter"
        @leave="handlePreviewLeave"
        @open="handlePreviewOpen"
        @regenerate="!isPdfGenerating && (mostrarModalPdfEliminado = true)"
    />

    <!-- Visor de PDF -->
    <Teleport to="body">
        <Transition name="modal-fade" appear>
            <div v-if="showPdfViewer"
                class="documento-item-viewer fixed inset-0 z-50 flex flex-col overflow-hidden bg-black bg-opacity-90 backdrop-blur-sm"
                @click.self="cerrarPdf">

            <!-- Header del visor -->
            <div class="absolute top-0 left-0 right-0 bg-white bg-opacity-95 backdrop-blur-sm border-b border-gray-200 z-10">
                <div class="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4">
                    <!-- Sección izquierda -->
                    <div class="flex items-center space-x-2 sm:space-x-4">
                        <button @click="cerrarPdf"
                            class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm">
                            <i class="fas fa-times text-xs sm:text-sm"></i>
                            <span class="font-medium hidden sm:inline">Cerrar</span>
                        </button>
                        <div class="flex items-center space-x-1 sm:space-x-2">
                            <i class="fas fa-file-pdf text-red-500 text-sm sm:text-lg"></i>
                            <span class="text-gray-700 font-medium text-xs sm:text-sm">Visor de PDF</span>
                        </div>
                    </div>

                    <!-- Controles adicionales -->
                    <div class="flex items-center space-x-1 sm:space-x-3">
                        <button @click="descargarPdfActual"
                            class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm">
                            <i class="fas fa-download text-xs sm:text-sm"></i>
                            <span class="font-medium hidden sm:inline">Descargar</span>
                        </button>
                        <button @click="imprimirPdfActual"
                            class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm">
                            <i class="fas fa-print text-xs sm:text-sm"></i>
                            <span class="font-medium hidden sm:inline">Imprimir</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Contenedor principal del visor -->
            <div class="relative flex min-h-0 min-w-0 flex-1 flex-col px-2 pb-4 sm:px-4">
                <!-- Contenedor del visor de PDF -->
                <div
                    ref="pdfViewerContainerRef"
                    class="pdf-viewer-host mt-16 min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl bg-white shadow-2xl sm:mt-20"
                >
                    <VPdfViewer
                        v-if="pdfViewerReady"
                        :key="pdfViewerMountKey"
                        ref="pdfViewerRef"
                        class="h-full w-full max-w-full"
                        :src="pdfUrl"
                        :initialThumbnails-visible="initialThumbnailsVisible"
                        :initialScale="pdfInitialScale"
                        :afterCanvasLoaded="pdfAfterCanvasLoaded"
                        locale="customLang"
                        :localization="localization"
                        @loaded="handlePdfViewerLoaded"
                    />
                </div>
            </div>

            <!-- Indicador de ayuda -->
            <div class="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm">
                <i class="fas fa-keyboard mr-1 sm:mr-2"></i>
                <span class="hidden sm:inline">Presiona</span> <kbd class="px-1 sm:px-2 py-0.5 sm:py-1 bg-gray-700 rounded text-xs">ESC</kbd> <span class="hidden sm:inline">para cerrar</span>
            </div>
        </div>
    </Transition>
    </Teleport>

    <!-- Visor de Imágenes -->
    <Teleport to="body">
        <Transition name="modal-fade" appear>
            <div v-if="showImageViewer"
                class="documento-item-viewer fixed top-0 left-0 w-full h-full bg-black bg-opacity-90 backdrop-blur-sm flex justify-center items-center z-50"
                @click.self="cerrarImagen">

            <!-- Header del visor -->
            <div class="absolute top-0 left-0 right-0 bg-white bg-opacity-95 backdrop-blur-sm border-b border-gray-200 z-10">
                <div class="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4">
                    <!-- Sección izquierda -->
                    <div class="flex items-center space-x-2 sm:space-x-4">
                        <button @click="cerrarImagen"
                            class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm">
                            <i class="fas fa-times text-xs sm:text-sm"></i>
                            <span class="font-medium hidden sm:inline">Cerrar</span>
                        </button>
                        <div class="flex items-center space-x-1 sm:space-x-2">
                            <i class="fas fa-image text-blue-500 text-sm sm:text-lg"></i>
                            <span class="text-gray-700 font-medium text-xs sm:text-sm">Visor de Imagen</span>
                        </div>
                    </div>

                    <!-- Controles de imagen -->
                    <div class="flex items-center space-x-1 sm:space-x-3">
                        <button @click="rotarImagen"
                            class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm">
                            <i class="fas fa-redo text-xs sm:text-sm"></i>
                            <span class="font-medium hidden sm:inline">Rotar</span>
                        </button>
                        <button @click="descargarImagenActual"
                            class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm">
                            <i class="fas fa-download text-xs sm:text-sm"></i>
                            <span class="font-medium hidden sm:inline">Descargar</span>
                        </button>
                        <button @click="resetImagePosition"
                            class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm">
                            <i class="fas fa-crosshairs text-xs sm:text-sm"></i>
                            <span class="font-medium hidden sm:inline">Centrar</span>
                        </button>
                        <button @click="zoomIn"
                            class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm">
                            <i class="fas fa-search-plus text-xs sm:text-sm"></i>
                            <span class="font-medium hidden sm:inline">Zoom +</span>
                        </button>
                        <button @click="zoomOut"
                            class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-all duration-200 hover:scale-105 text-xs sm:text-sm">
                            <i class="fas fa-search-minus text-xs sm:text-sm"></i>
                            <span class="font-medium hidden sm:inline">Zoom -</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Contenedor principal de la imagen -->
            <div class="relative w-full h-full flex flex-col image-viewer">
                <div class="flex-1 mt-16 sm:mt-20 mx-2 sm:mx-4 mb-4 bg-white rounded-xl shadow-2xl overflow-hidden flex items-center justify-center">
                    <img
                        :src="imageUrl"
                        :style="{
                            transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) rotate(${rotationAngle}deg) scale(${imageZoom})`,
                            cursor: isDragging ? 'grabbing' : 'grab'
                        }"
                        alt="Vista previa del documento"
                        class="max-w-full max-h-full object-contain select-none"
                        draggable="false"
                        @wheel="handleImageWheel"
                        @mousedown="startDrag"
                        @mouseenter="$event.target.style.cursor = isDragging ? 'grabbing' : 'grab'"
                        @mouseleave="handleMouseLeave"
                    />
                </div>
            </div>

            <!-- Indicador de zoom (se muestra cuando el zoom es diferente al valor inicial) -->
            <div v-if="imageZoom !== 0.8" class="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 bg-black bg-opacity-75 text-white px-2 sm:px-3 py-1 sm:py-2 rounded-full text-xs sm:text-sm">
                <i class="fas fa-search mr-1 sm:mr-2"></i>
                {{ Math.round(imageZoom * 100) }}%
            </div>

            <!-- Indicador de ayuda -->
            <div class="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm">
                <i class="fas fa-mouse mr-1 sm:mr-2"></i>
                <span class="hidden sm:inline">Rueda del mouse para zoom •</span>
                <span class="hidden sm:inline">Arrastra para mover •</span>
                <kbd class="px-1 sm:px-2 py-0.5 sm:py-1 bg-gray-700 rounded text-xs">ESC</kbd> <span class="hidden sm:inline">para cerrar</span>
            </div>
        </div>
    </Transition>
    </Teleport>

    <!-- Tooltip para botones de acción -->
    <Teleport to="body">
        <Transition name="tooltip-fade">
            <div
                v-if="showTooltip"
                class="fixed z-[9999] pointer-events-none"
                :style="{
                    top: `${tooltipPosition.top}px`,
                    left: `${tooltipPosition.left}px`,
                    transform: 'translate(-50%, -100%)',
                    marginBottom: '8px'
                }">
                <div class="px-3 py-1 bg-gray-800 text-white text-xs rounded-lg shadow-xl border border-gray-700 whitespace-nowrap">
                    {{ tooltipText }}
                    <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                </div>
            </div>
        </Transition>
    </Teleport>

</template>

<style>
/* Animaciones para los modales */
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.modal-fade-enter-from {
    opacity: 0;
    transform: scale(0.9);
}

.modal-fade-leave-to {
    opacity: 0;
    transform: scale(0.9);
}

/* Estilos para los botones de control */
.control-button {
    transition-property: all;
    transition-duration: 200ms;
    transition-timing-function: ease-in-out;
}

.control-button:hover {
    transform: scale(1.05);
}

/* Visor PDF: evitar desborde horizontal del componente interno */
.documento-item-viewer .pdf-viewer-host {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
}

.documento-item-viewer .pdf-viewer-host :deep(> *) {
    max-width: 100%;
}

/* Estilos para el indicador de zoom */
.zoom-indicator {
    background-color: rgba(0, 0, 0, 0.75);
    color: white;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    line-height: 1.25rem;
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
}

/* Estilos para el indicador de ayuda */
.help-indicator {
    background-color: rgba(0, 0, 0, 0.75);
    color: white;
    padding-left: 1rem;
    padding-right: 1rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    line-height: 1.25rem;
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
}

/* Estilos responsivos */
@media (max-width: 640px) {
    /* Pantallas muy pequeñas (xs) */
    .modal-fade-enter-active,
    .modal-fade-leave-active {
        transition: opacity 0.2s ease, transform 0.2s ease;
    }
}

/* Animaciones para tooltip */
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
    transition: opacity 0.2s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
    opacity: 0;
}

@media (max-width: 768px) {
    /* Pantallas pequeñas (sm) */
    .control-button {
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
    }

    .help-indicator {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
    }

    /* Ajustes específicos para móviles */
    .modal-fade-enter-from,
    .modal-fade-leave-to {
        transform: scale(0.95);
    }
}

@media (min-width: 768px) and (max-width: 1024px) {
    /* Pantallas medianas (md) */
    .control-button {
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
    }
}
</style>