import api from '@/lib/axios'

export default {
    getAntidopings(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/antidoping`);
    },

    getAptitudes(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/aptitud`);
    },

    getAudiometrias(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/audiometria`);
    },

    getCertificados(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/certificado`);
    },

    getCertificadosExpedito(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/certificadoExpedito`);
    },

    getDocumentosExternos(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/documentoExterno`);
    },

    getExamenesVista(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/examenVista`);
    },

    getExploracionesFisicas(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/exploracionFisica`);
    },
    
    getHistoriasClinicas(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/historiaClinica`);
    },

    getNotasMedicas(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/notaMedica`);
    },

    getControlPrenatal(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/controlPrenatal`);
    },

    getHistoriaOtologica(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/historiaOtologica`);
    },

    getPrevioEspirometria(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/previoEspirometria`);
    },

    getRecetas(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/receta`);
    },

    getConstanciasAptitud(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/constanciaAptitud`);
    },

    getEntrevistaPsicologica(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/entrevistaPsicologica`);
    },

    getTrastornosEstadoAnimo(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/trastornosEstadoAnimo`);
    },

    getCuestionarioProdromalBreve(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/cuestionarioProdromalBreve`);
    },

    getTrastornoLimitePersonalidad(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/trastornoLimitePersonalidad`);
    },

    getEventoSeguimientoCardiometabolico(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/eventoSeguimientoCardiometabolico`);
    },

    getInformeLongitudinalCardiometabolico(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/informeLongitudinalCardiometabolico`);
    },

    getAlturaDisponible(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/altura-disponible`);
    },

    getMotivoExamenReciente(trabajadorId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/historiaClinica/motivo-examen-reciente`);
    },

    createDocument(documentType: string, trabajadorId: string, data: any) {
        return api.post(`/expedientes/${trabajadorId}/documentos/${documentType}/crear`, data);
    },

    updateDocument(documentType: string, trabajadorId: string, documentId: string, data: any) {
        return api.patch(`/expedientes/${trabajadorId}/documentos/${documentType}/actualizar/${documentId}`, data);
    },

    uploadExternalDocument(trabajadorId: string, formData: FormData) {
        return api.post(`/expedientes/${trabajadorId}/documentos/documentoExterno/subir`, formData);
    },

    getDocumentById(documentType: string, trabajadorId: string, documentoId: string) {
        return api.get(`/expedientes/${trabajadorId}/documentos/${documentType}/${documentoId}`);
    },

    deleteDocumentById(documentType: string, trabajadorId: string, documentoId: string) {
        return api.delete(`/expedientes/${trabajadorId}/documentos/${documentType}/eliminar/${documentoId}`);
    },
}