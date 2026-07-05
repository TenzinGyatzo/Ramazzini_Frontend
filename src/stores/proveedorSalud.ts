import { ref, onMounted, computed } from "vue";
import { defineStore } from "pinia";
import ProveedorSaludAPI from "@/api/ProveedorSaludAPI";
import { isMexicoProvider } from "@/helpers/proveedorPais";

interface AddOn {
    tipo: string; // 'usuario_adicional', 'empresas_extra', u otros
    cantidad: number;
}

/**
 * Regulatory Policy Interface
 * Define las features habilitadas según el régimen regulatorio
 */
export interface RegulatoryPolicy {
    regime: 'SIRES_NOM024' | 'SIN_REGIMEN';
    features: {
        sessionTimeoutEnabled: boolean;
        enforceDocumentImmutabilityUI: boolean;
        documentImmutabilityEnabled: boolean;
        showSiresUI: boolean;
        giisExportEnabled: boolean;
        notaAclaratoriaEnabled: boolean;
        cluesFieldVisible: boolean; // CLUES visible solo en SIRES
        dailyConsentEnabled: boolean; // Consentimiento diario habilitado solo en SIRES
        confidentialityAgreementEnabled: boolean; // Acuerdo de confidencialidad SIRES
        auditTrailEnabled: boolean; // Trail de auditoría NOM-024
        workerIdentificationImmutable: boolean; // Identificación trabajador inmutable post-alta
    };
    validation: {
        curpFirmantes: 'required' | 'optional';
        workerCurp: 'required_strict' | 'optional'; // CURP trabajadores
        cie10Principal: 'required' | 'optional'; // CIE-10 principal
        geoFields: 'required' | 'optional'; // Campos geográficos
    };
}

interface ProveedorSalud {
    _id: string;
    nombre: string;
    razonSocial: string;
    pais: string;
    clues?: string; // NOM-024: Clave Única de Establecimientos de Salud
    logotipoEmpresa: {
        data: string;
        contentType: string;
    };
    direccion: string;
    ciudad: string;
    municipio: string;
    estado: string;
    codigoPostal: string;
    telefono: string;
    correoElectronico: string;
    sitioWeb: string;
    referenciaPlan: string;
    maxHistoriasPermitidasAlMes: number;
    estadoSuscripcion: string;
    fechaInicioTrial: Date;
    periodoDePruebaFinalizado: boolean;
    addOns: AddOn[];
    mercadoPagoSubscriptionId: string;
    payerEmail: string;
    finDeSuscripcion: Date;
    colorInforme?: string;
    semaforizacionActivada?: boolean;
    regimenRegulatorio?: 'SIRES_NOM024' | 'SIN_REGIMEN';
    regulatoryPolicy?: RegulatoryPolicy;
}

// Define el store
export const useProveedorSaludStore = defineStore("proveedorSalud", () => {
    const loading = ref(true);
    const saving = ref(false);
    const proveedorSalud = ref<ProveedorSalud | null>(null);

    async function loadProveedorSalud(idProveedorSalud: string) {
        try {
            loading.value = true;
            const { data } = await ProveedorSaludAPI.getProveedorById(idProveedorSalud);
            proveedorSalud.value = data;
            // console.log("Proveedor Salud desde Store", proveedorSalud.value);
        } catch (error) {
            console.error("Error al cargar proveedor de salud:", error);
        } finally {
            loading.value = false;
        }
    }

    async function getProveedorById(idProveedorSalud: string) {
        try {
            loading.value = true;
            const { data } = await ProveedorSaludAPI.getProveedorById(idProveedorSalud);
            proveedorSalud.value = data;
            return data;
        } catch (error) {
            console.error("Error al cargar proveedor de salud:", error);
        } finally {
            loading.value = false;
        }
    }

    async function createProveedor(proveedorSaludData: ProveedorSalud) {
        try {
            saving.value = true;
            const { data } = await ProveedorSaludAPI.createProveedor(proveedorSaludData);
            const created = data.data;
            proveedorSalud.value = {
                ...created,
                regulatoryPolicy:
                    proveedorSalud.value?.regulatoryPolicy ?? created.regulatoryPolicy,
            };
            return data;
        } catch (error) {
            console.error("Error al crear proveedor de salud:", error);
            throw error;
        } finally {
            saving.value = false;
        }
    }

    async function updateProveedorById(idProveedorSalud: string, proveedorSaludData: ProveedorSalud) {
        try {
            saving.value = true;
            const { data } = await ProveedorSaludAPI.updateProveedorById(idProveedorSalud, proveedorSaludData);
            const updated = data.data;
            proveedorSalud.value = {
                ...updated,
                regulatoryPolicy:
                    proveedorSalud.value?.regulatoryPolicy ?? updated.regulatoryPolicy,
            };
            return data;
        } catch (error) {
            console.error("Error al actualizar proveedor de salud:", error);
            throw error;
        } finally {
            saving.value = false;
        }
    }

    async function removeProveedorById(idProveedorSalud: string) {
        try {
            loading.value = true;
            const resultado = await ProveedorSaludAPI.removeProveedorById(idProveedorSalud)
            return resultado.data
        } catch (error) {
            console.error("Error al eliminar el proveedor de salud")
        } finally {
            loading.value = false;
        }
    }

    async function verificarPeriodoDePrueba (idProveedorSalud: string) {
        try {
            // console.log("Store");
            loading.value = true;
            const resultado = await ProveedorSaludAPI.verificarPeriodoDePrueba(idProveedorSalud)
            return resultado.data
        } catch (error) {
            console.error("Error al verificar el periodo de prueba")
        } finally {
            loading.value = false;
        }
    }

    async function verificarFinSuscripcion (idProveedorSalud: string) {
        try {
            // console.log("Store");
            loading.value = true;
            const resultado = await ProveedorSaludAPI.verificarFinSuscripcion(idProveedorSalud)
            return resultado.data
        } catch (error) {
            console.error("Error al verificar el fin de la suscripción")
        } finally {
            loading.value = false;
        }
    }

    async function getTopEmpresasByWorkers() {
        try {
          loading.value = true;
          const { data } = await ProveedorSaludAPI.getTopEmpresasByWorkers(proveedorSalud.value?._id || '');
          return (data || []).sort((a, b) => b.totalTrabajadores - a.totalTrabajadores);
        } catch (error) {
          console.log(error);
          return [];
        } finally {
          loading.value = false;
        }
      }  

    async function getHistoriasClinicasDelMes() {
        try {
            loading.value = true;
            const { data } = await ProveedorSaludAPI.getHistoriasClinicasDelMes(proveedorSalud.value?._id || '');
            return data;
        } catch (error) {
            console.log(error);
            return [];
        } finally {
            loading.value = false;
        }
    }

    async function getHistoriasClinicasDelMesById(proveedorSaludId: string) {
        try {
            loading.value = true;
            const { data } = await ProveedorSaludAPI.getHistoriasClinicasDelMes(proveedorSaludId);
            return data;
        } catch (error) {
            console.log(error);
            return [];
        } finally {
            loading.value = false;
        }
    }

    async function getNotasMedicasDelMesById(proveedorSaludId: string) {
        try {
            loading.value = true;
            const { data } = await ProveedorSaludAPI.getNotasMedicasDelMes(proveedorSaludId);
            return data;
        } catch (error) {
            console.log(error);
            return [];
        } finally {
            loading.value = false;
        }
    }

    async function getCantidadHistoriasClinicasById(proveedorSaludId: string) {
        try {
            loading.value = true;
            const { data } = await ProveedorSaludAPI.getTodasHistoriasClinicas(proveedorSaludId);
            return data;
        } catch (error) {
            console.log(error);
            return [];
        } finally {
            loading.value = false;
        }
    }

    async function getCantidadNotasMedicasById(proveedorSaludId: string) {
        try {
            loading.value = true;
            const { data } = await ProveedorSaludAPI.getTodasNotasMedicas(proveedorSaludId);
            return data;
        } catch (error) {
            console.log(error);
            return [];
        } finally {
            loading.value = false;
        }
    }

    async function getAllProveedores() {
        try {
            loading.value = true;
            const { data } = await ProveedorSaludAPI.getAllProveedores();
            return data;
        } catch (error) {
            console.log(error);
            return [];
        } finally {
            loading.value = false;
        }
    }

    async function changeRegimenRegulatorio(regimen: string, reason: string) {
        if (!proveedorSalud.value?._id) {
            throw new Error('Proveedor no cargado');
        }
        try {
            saving.value = true;
            const { data } = await ProveedorSaludAPI.changeRegimenRegulatorio(
                proveedorSalud.value._id,
                regimen,
                reason
            );
            // Actualizar proveedorSalud con los datos devueltos (incluye regulatoryPolicy)
            proveedorSalud.value = data.data;
            localStorage.setItem('proveedorSalud', JSON.stringify(proveedorSalud.value));
            return data;
        } catch (error) {
            console.error('Error al cambiar régimen regulatorio:', error);
            throw error;
        } finally {
            saving.value = false;
        }
    }

    function clear() {
        proveedorSalud.value = null;
        try {
            localStorage.removeItem('proveedorSalud');
        } catch {
            // ignore
        }
    }

    const isMX = computed(() => isMexicoProvider(proveedorSalud.value?.pais));

    const isProveedorLoaded = computed(
        () => !loading.value && proveedorSalud.value !== null,
    );

    const logotipoPendiente = computed(() => {
        if (!isProveedorLoaded.value) return false;
        return !proveedorSalud.value!.logotipoEmpresa?.data;
    });

    const camposPendientesProveedor = computed(() => {
        if (!isProveedorLoaded.value) return [] as string[];

        const proveedor = proveedorSalud.value!;
        const pendientes: string[] = [];

        if (!proveedor.estado) pendientes.push('Estado');
        if (!proveedor.municipio) pendientes.push('Municipio');
        if (!proveedor.direccion) pendientes.push('Dirección');
        if (!proveedor.telefono) pendientes.push('Teléfono');

        return pendientes;
    });

    // Regulatory Policy Computed Properties
    const regimenRegulatorio = computed(() => proveedorSalud.value?.regimenRegulatorio);
    const regulatoryPolicy = computed(() => proveedorSalud.value?.regulatoryPolicy);
    
    // Helpers basados en policy - Features
    const isSIRES = computed(() => regulatoryPolicy.value?.regime === 'SIRES_NOM024');
    const isSinRegimen = computed(() => regulatoryPolicy.value?.regime === 'SIN_REGIMEN');
    const sessionTimeoutEnabled = computed(() => regulatoryPolicy.value?.features.sessionTimeoutEnabled ?? false);
    const showSiresUI = computed(() => regulatoryPolicy.value?.features.showSiresUI ?? false);
    const notaAclaratoriaEnabled = computed(() => regulatoryPolicy.value?.features.notaAclaratoriaEnabled ?? false);
    const documentImmutabilityEnabled = computed(() => regulatoryPolicy.value?.features.documentImmutabilityEnabled ?? false);
    const giisExportEnabled = computed(() => regulatoryPolicy.value?.features.giisExportEnabled ?? false);
    const cluesFieldVisible = computed(() => regulatoryPolicy.value?.features.cluesFieldVisible ?? false);
    const dailyConsentEnabled = computed(() => regulatoryPolicy.value?.features.dailyConsentEnabled ?? false);
    const confidentialityAgreementEnabled = computed(() => regulatoryPolicy.value?.features.confidentialityAgreementEnabled ?? false);
    const auditTrailEnabled = computed(() => regulatoryPolicy.value?.features.auditTrailEnabled ?? false);
    
    // Helpers basados en policy - Validations
    const curpFirmantesRequired = computed(() => regulatoryPolicy.value?.validation.curpFirmantes === 'required');
    const workerCurpRequired = computed(() => regulatoryPolicy.value?.validation.workerCurp === 'required_strict');
    const cie10PrincipalRequired = computed(() => regulatoryPolicy.value?.validation.cie10Principal === 'required');
    const geoFieldsRequired = computed(() => regulatoryPolicy.value?.validation.geoFields === 'required');

    return {
        proveedorSalud,
        loading,
        saving,
        isProveedorLoaded,
        logotipoPendiente,
        camposPendientesProveedor,
        isMX,
        // Regulatory Policy
        regimenRegulatorio,
        regulatoryPolicy,
        isSIRES,
        isSinRegimen,
        // Features
        sessionTimeoutEnabled,
        showSiresUI,
        notaAclaratoriaEnabled,
        documentImmutabilityEnabled,
        giisExportEnabled,
        cluesFieldVisible,
        dailyConsentEnabled,
        confidentialityAgreementEnabled,
        auditTrailEnabled,
        // Validations
        curpFirmantesRequired,
        workerCurpRequired,
        cie10PrincipalRequired,
        geoFieldsRequired,
        // Methods
        loadProveedorSalud,
        getProveedorById,
        createProveedor,
        updateProveedorById,
        removeProveedorById,
        verificarPeriodoDePrueba,
        verificarFinSuscripcion,
        getTopEmpresasByWorkers,
        getHistoriasClinicasDelMes,
        getHistoriasClinicasDelMesById,
        getNotasMedicasDelMesById,
        getCantidadHistoriasClinicasById,
        getCantidadNotasMedicasById,
        getAllProveedores,
        changeRegimenRegulatorio,
        clear,
    };
});
