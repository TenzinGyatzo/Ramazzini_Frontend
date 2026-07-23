import api from '@/lib/axios'

export default {
    /**
     * Search CIE-10 codes by query string
     * @param query Search term (code or description)
     * @param limit Optional result limit (default 50, max 100)
     * @param sexo Optional sex filter (1=Hombre, 2=Mujer) for pre-filtering results
     * @param edad Optional age filter for pre-filtering results
     */
    searchCIE10(query: string, limit?: number, sexo?: number, edad?: number) {
        const params: any = { q: query };
        if (limit !== undefined) params.limit = limit;
        if (sexo !== undefined) params.sexo = sexo;
        if (edad !== undefined) params.edad = edad;
        return api.get(`/catalogs/cie10/search`, { params });
    },

    /**
     * Get a single CIE-10 entry by its code
     * @param code The CIE-10 code (e.g., 'J00')
     */
    getCIE10ByCode(code: string) {
        return api.get(`/catalogs/cie10/${code}`);
    },

    /**
     * Search CLUES establishments by query string
     * @param query Search term (code or name)
     */
    searchCLUES(query: string) {
        return api.get(`/catalogs/clues/search`, {
            params: { q: query }
        });
    },

    /**
     * Get a single CLUES entry by its code
     * @param code The CLUES code (e.g., 'ASCIJ000012')
     */
    getCLUESByCode(code: string) {
        return api.get(`/catalogs/clues/${code}`);
    },

    /**
     * Validate if CLUES is in operation
     * @param code The CLUES code
     */
    validateCLUES(code: string) {
        return api.get(`/catalogs/clues/validate/${code}`);
    },

    /**
     * Search Postal Codes by query string
     * @param query Search term (CP or settlement name)
     */
    searchCP(query: string) {
        return api.get(`/catalogs/cp/search`, {
            params: { q: query }
        });
    },

    /**
     * Get a single Postal Code entry by its internal code (CP-ID)
     * @param code The internal code
     */
    getCPByCode(code: string) {
        return api.get(`/catalogs/cp/${code}`);
    },

    /**
     * Get all Mexican states (Entidades Federativas)
     */
    getEstados() {
        return api.get(`/catalogs/geo/estados`);
    },

    /**
     * Get municipalities for a specific state
     * @param estadoCode 2-digit state code
     */
    getMunicipios(estadoCode: string) {
        return api.get(`/catalogs/geo/municipios/${estadoCode}`);
    },

    /**
     * Get localities for a specific municipality
     * @param estadoCode 2-digit state code
     * @param municipioCode 3-digit municipality code
     * @param query Optional search term
     */
    getLocalidades(estadoCode: string, municipioCode: string, query?: string) {
        return api.get(`/catalogs/geo/localidades/${estadoCode}/${municipioCode}`, {
            params: { q: query }
        });
    },

    /**
     * Search estados by query string (code or description)
     * @param query Search term
     * @param limit Optional result limit (default 50, max 100)
     */
    searchEstados(query: string, limit?: number) {
        return api.get(`/catalogs/geo/estados/search`, {
            params: { q: query, limit }
        });
    },

    /**
     * Get a single estado entry by its code
     * @param code The estado code (e.g., '09')
     */
    getEstadoByCode(code: string) {
        return api.get(`/catalogs/geo/estados/${code}`);
    },

    /**
     * Search municipios by query string within a specific estado
     * @param estadoCode 2-digit state code
     * @param query Search term
     * @param limit Optional result limit (default 50, max 100)
     */
    searchMunicipios(estadoCode: string, query: string, limit?: number) {
        return api.get(`/catalogs/geo/municipios/${estadoCode}/search`, {
            params: { q: query, limit }
        });
    },

    /**
     * Search paises (cat_pais) by query string (CATALOG_KEY or description)
     * @param query Search term
     * @param limit Optional result limit (default 50, max 100)
     */
    searchPaises(query: string, limit?: number) {
        return api.get(`/catalogs/paises/search`, {
            params: { q: query, limit }
        });
    },

    /**
     * Get a single pais entry by its CATALOG_KEY
     * @param catalogKey The cat_pais CATALOG_KEY (e.g., 142 for México)
     */
    getPaisByCatalogKey(catalogKey: string | number) {
        return api.get(`/catalogs/paises/${catalogKey}`);
    },

    /** Códigos CEX resueltos desde catálogos (tipoPersonal + servicioAtencion) */
    getCexCatalogCodes() {
        return api.get('/catalogs/cex/codes');
    },

    /**
     * List all entries from a GIIS catalog (for populating selectors)
     * @param catalogType Catalog type key (e.g. 'cat_afiliacion', 'cat_pais')
     * @param limit Optional limit (default 500)
     * @param vigenteOnly When true, only entries with VIGENTE=1
     */
    listCatalog(catalogType: string, limit?: number, vigenteOnly?: boolean) {
        const params: Record<string, string | number | boolean> = {};
        if (limit !== undefined) params.limit = limit;
        if (vigenteOnly === true) params.vigenteOnly = true;
        return api.get(`/catalogs/giis/${catalogType}/list`, { params });
    },

    exportImportReferenceCatalog(
        type: 'paises' | 'entidades' | 'municipios' | 'localidades',
        params?: { entidadCode?: string; municipioCode?: string },
    ) {
        return api.get(`/catalogs/import-reference/${type}/export`, {
            params,
            responseType: 'blob',
        });
    },
}

