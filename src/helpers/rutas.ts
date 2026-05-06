import { convertirFechaISOaDDMMYYYY } from './dates';

interface Trabajador {
    primerApellido?: string;
    segundoApellido?: string;
    nombre?: string;
}

export const obtenerRutaDocumento = (documento, tipoDocumento) => {
    if (tipoDocumento === 'Documento Externo') {
        return documento.rutaDocumento || null;
    }
    return documento.rutaPDF || null;
};

export const obtenerNombreArchivo = (documento, tipoDocumento, fecha) => {
    if (tipoDocumento === 'Documento Externo') {
        return `${documento.nombreDocumento || 'Documento'} ${fecha}${documento.extension}`;
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
        'fechaInicioControlPrenatal',
        'fechaHistoriaOtologica',
        'fechaPrevioEspirometria',
        'fechaReceta',
        'fechaConstanciaAptitud',
        'fechaEntrevistaPsicologica',
        'fechaTrastornosEstadoAnimo',
        'fechaCuestionarioProdromalBreve',
        'fechaTrastornoLimitePersonalidad',
        'fechaEventoSeguimientoCardiometabolico',
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