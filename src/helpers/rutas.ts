import { convertirFechaISOaDDMMYYYY } from './dates';

interface Trabajador {
    primerApellido?: string;
    segundoApellido?: string;
    nombre?: string;
}

interface DocumentosStore {
    documentsByYear?: Record<string, any>;
}

// Mapeo de tipos de documentos a sus campos de fecha
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
    'notasAclaratorias': 'fechaNotaAclaratoria',
    'controlPrenatal': 'fechaInicioControlPrenatal',
    'historiaOtologica': 'fechaHistoriaOtologica',
    'previoEspirometria': 'fechaPrevioEspirometria',
    'recetas': 'fechaReceta',
    'constanciasAptitud': 'fechaConstanciaAptitud',
    'lesiones': 'fechaReporteLesion'
};

// Mapeo de nombres de documentos (DEBEN coincidir con los del backend para Nota Aclaratoria)
const documentoNombres = {
    'antidoping': 'Antidoping',
    'antidopings': 'Antidoping',
    'aptitud': 'Aptitud para el Puesto',
    'aptitudes': 'Aptitud para el Puesto',
    'audiometria': 'Audiometría',
    'audiometrias': 'Audiometría',
    'certificado': 'Certificado',
    'certificados': 'Certificado',
    'certificadoExpedito': 'Certificado Expedito',
    'certificadosExpedito': 'Certificado Expedito',
    'documentoExterno': 'Documento Externo',
    'documentosExternos': 'Documento Externo',
    'examenVista': 'Examen de Vista',
    'examenesVista': 'Examen de Vista',
    'exploracionFisica': 'Exploración Física',
    'exploracionesFisicas': 'Exploración Física',
    'historiaClinica': 'Historia Clínica',
    'historiasClinicas': 'Historia Clínica',
    'notaMedica': 'Nota Médica',
    'notasMedicas': 'Nota Médica',
    'notasAclaratorias': 'Nota Aclaratoria',
    'controlPrenatal': 'Control Prenatal',
    'historiaOtologica': 'Historia Otológica',
    'previoEspirometria': 'Previo Espirometría',
    'receta': 'Receta',
    'recetas': 'Receta',
    'constanciaAptitud': 'Constancia de Aptitud',
    'constanciasAptitud': 'Constancia de Aptitud',
    'lesion': 'Lesión'
};

// Mapeo de tipos singulares a plurales para buscar en el store
const tipoSingularAPlural: Record<string, string> = {
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
    'notaAclaratoria': 'notasAclaratorias',
    'controlPrenatal': 'controlPrenatal',
    'historiaOtologica': 'historiaOtologica',
    'previoEspirometria': 'previoEspirometria',
    'receta': 'recetas',
    'constanciaAptitud': 'constanciasAptitud',
    'lesion': 'lesiones'
};

// Función para normalizar tipo de documento a plural
const normalizarTipoAPlural = (tipo: string): string => {
    // Si ya está en plural, retornarlo tal cual
    if (tipoSingularAPlural[tipo]) {
        return tipoSingularAPlural[tipo];
    }
    // Caso especial para variantes con espacios o mayúsculas
    const normalized = tipo.charAt(0).toLowerCase() + tipo.slice(1).replace(/\s+/g, '');
    if (tipoSingularAPlural[normalized]) {
        return tipoSingularAPlural[normalized];
    }
    return tipo;
};

export const obtenerRutaDocumento = (documento, tipoDocumento) => {
    if (tipoDocumento === 'Documento Externo') {
        return documento.rutaDocumento || null;
    }
    return documento.rutaPDF || null;
};

export const obtenerNombreArchivo = (documento, tipoDocumento, fecha, documentosStore: DocumentosStore | null = null) => {
    if (tipoDocumento === 'Documento Externo') {
        return `${documento.nombreDocumento || 'Documento'} ${fecha}${documento.extension}`;
    }
    
    // Para Nota Aclaratoria, construir el nombre personalizado
    if (tipoDocumento === 'Nota Aclaratoria') {
        const documentoOrigenTipo = documento.documentoOrigenTipo;
        const documentoOrigenId = documento.documentoOrigenId;
        let documentoOrigenNombre = documento.documentoOrigenNombre;
        let documentoOrigenFecha = documento.documentoOrigenFecha;
        
        // Verificar si es un documento externo
        const esDocumentoExterno = documentoOrigenTipo === 'documentoExterno' || 
                                   documentoOrigenTipo === 'Documento Externo' ||
                                   documentoOrigenTipo === 'documentosExternos';
        
        // Si faltan datos y tenemos el store, buscar el documento origen
        if ((!documentoOrigenNombre && esDocumentoExterno) || !documentoOrigenFecha) {
            if (documentosStore?.documentsByYear && documentoOrigenId) {
                // Normalizar el tipo a plural para buscar en el store
                const tipoNormalizado = normalizarTipoAPlural(documentoOrigenTipo);
                
                Object.values(documentosStore.documentsByYear).forEach((docsDelAno) => {
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
        
        // Construir nombre del documento que aclara
        let documentoQueAclara = '';
        
        if (esDocumentoExterno && documentoOrigenNombre) {
            documentoQueAclara = documentoOrigenNombre;
        } else if (esDocumentoExterno) {
            documentoQueAclara = 'Documento Externo';
        } else {
            documentoQueAclara = documentoNombres[documentoOrigenTipo] || documentoOrigenTipo;
        }
        
        // Agregar fecha del documento origen si está disponible
        if (documentoOrigenFecha) {
            const fechaOrigen = convertirFechaISOaDDMMYYYY(documentoOrigenFecha).replace(/\//g, '-');
            documentoQueAclara = `${documentoQueAclara} ${fechaOrigen}`;
        }
        
        return `Nota Aclaratoria ${fecha} (${documentoQueAclara}).pdf`;
    }

    // Lesión (GIIS-B013): formato "Reporte Lesion dd-mm-aaaa folio.pdf" (fechaAtencion + folio)
    if (tipoDocumento === 'Lesion') {
        const fechaAtencion = documento?.fechaAtencion
            ? convertirFechaISOaDDMMYYYY(documento.fechaAtencion).replace(/\//g, '-')
            : fecha?.replace(/\//g, '-') || 'SinFecha';
        const folio = documento?.folio || '';
        return `Reporte Lesion ${fechaAtencion} ${folio}.pdf`;
    }
    
    return `${tipoDocumento} ${fecha}.pdf`;
};

export const obtenerFechaDocumento = (documento) => {
    const camposFecha = [
        'fechaAntidoping',
        'fechaAptitudPuesto',
        'fechaAudiometria',
        'fechaCertificado',
        'fechaCertificadoExpedito',
        'fechaExamenVista',
        'fechaExploracionFisica',
        'fechaHistoriaClinica',
        'fechaDocumento',
        'fechaNotaMedica',
        'fechaNotaAclaratoria',
        'fechaInicioControlPrenatal',
        'fechaHistoriaOtologica',
        'fechaPrevioEspirometria',
        'fechaReceta',
        'fechaConstanciaAptitud',
        'fechaReporteLesion',
        'fechaEntrevistaPsicologica',
        'fechaTrastornosEstadoAnimo',
        'fechaCuestionarioProdromalBreve',
        'fechaTrastornoLimitePersonalidad',
    ];

    for (const campo of camposFecha) {
        if (documento[campo]) {
            return convertirFechaISOaDDMMYYYY(documento[campo]);
        }
    }
    return null;
};

// Función específica para el nombre de descarga del Certificado Expedito
export const obtenerNombreDescargaCertificadoExpedito = (fecha: string, trabajador: Trabajador | null = null) => {
    if (!trabajador) {
        return `Certificado Expedito ${fecha}.pdf`;
    }
    
    const apellidos = [trabajador.primerApellido, trabajador.segundoApellido]
        .filter(Boolean)
        .join(' ');
    const nombre = trabajador.nombre || '';
    const nombreCompleto = [apellidos, nombre].filter(Boolean).join(' ');
    return `Certificado ${nombreCompleto} ${fecha}.pdf`;
};