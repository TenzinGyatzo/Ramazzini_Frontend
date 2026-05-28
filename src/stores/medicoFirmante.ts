import { ref } from "vue";
import { defineStore } from "pinia";
import MedicoFirmanteAPI from "@/api/MedicoFirmanteAPI";
import axios from "axios";
import { unwrapFirmanteRecord } from "@/helpers/unwrapFirmanteRecord";

interface MedicoFirmante {
    _id: string;
    nombre: string;
    curp?: string; // NOM-024: CURP del profesional de salud
    tituloProfesional?: string;
    numeroCedulaProfesional?: string;
    /** API puede devolver "Si" | "No" o boolean */
    especialistaSaludTrabajo?: boolean | string;
    numeroCedulaEspecialista?: string;
    /** Código numérico oficial DGIS (GIIS / nota médica) */
    tipoPersonalId?: number;
    nombreCredencialAdicional?: string;
    numeroCredencialAdicional?: string;
    nombreCredencialAdicional2?: string;
    numeroCredencialAdicional2?: string;
    paisNacimiento?: number;
    fechaNacimiento?: string;
    firma?: {
        data: string;
        contentType: string
    };
    firmaConAntefirma?: {
        data: string;
        contentType: string
    };
    idUser: string;
}

// Define el store
export const useMedicoFirmanteStore = defineStore("medicoFirmante", () => {
    const loading = ref(true);
    const saving = ref(false);
    const medicoFirmante = ref<MedicoFirmante | null>(null);

    async function loadMedicoFirmanteById(idMedicoFirmante: string) {
        try {
            loading.value = true;
            const { data } = await MedicoFirmanteAPI.getMedicoFirmanteById(idMedicoFirmante);
            medicoFirmante.value = unwrapFirmanteRecord<MedicoFirmante>(data);
        } catch (error) {
            console.error("Error al cargar médico firmante:", error);
        } finally {
            loading.value = false;
        }
    }

    async function loadMedicoFirmante(idUser: string) {
        try {
            loading.value = true;
    
            const { data } = await MedicoFirmanteAPI.getMedicoFirmanteByUserId(idUser);
            medicoFirmante.value = unwrapFirmanteRecord<MedicoFirmante>(data);
        } catch (error) {
            // Verificar si el error es de tipo AxiosError
            if (axios.isAxiosError(error)) {
                // Manejar el caso en que no se encuentra el médico (404)
                if (error.response && error.response.status === 404) {
                    console.log("No se encontró un médico firmante para el usuario proporcionado.");
                    medicoFirmante.value = null; // O inicializa un estado vacío
                } else {
                    // Manejar otros errores de Axios
                    console.error("Error al cargar médico firmante:", error.message);
                }
            } else {
                // Manejar errores que no son de Axios
                console.error("Error inesperado:", error);
            }
        } finally {
            loading.value = false;
        }
    }

    async function createMedicoFirmante(medicoFirmanteData: MedicoFirmante) {
        try {
            saving.value = true;
            const { data } = await MedicoFirmanteAPI.createMedicoFirmante(medicoFirmanteData);
            const firmante = unwrapFirmanteRecord<MedicoFirmante>(data);
            if (!firmante) {
                throw new Error("Respuesta inválida al crear médico firmante");
            }
            medicoFirmante.value = firmante;
            return firmante;
        } catch (error) {
            console.error("Error al crear médico firmante:", error);
            throw error;
        } finally {
            saving.value = false;
        }
    }

    async function updateMedicoFirmanteById(idMedicoFirmante: string, medicoFirmanteData: MedicoFirmante) {
        try {
            saving.value = true;
            const { data } = await MedicoFirmanteAPI.updateMedicoFirmanteById(idMedicoFirmante, medicoFirmanteData);
            const firmante = unwrapFirmanteRecord<MedicoFirmante>(data);
            if (!firmante) {
                throw new Error("Respuesta inválida al actualizar médico firmante");
            }
            medicoFirmante.value = firmante;
            return firmante;
        } catch (error) {
            console.error("Error al actualizar médico firmante:", error);
            throw error;
        } finally {
            saving.value = false;
        }
    }

    return {
        medicoFirmante,
        loading,
        saving,
        loadMedicoFirmanteById,
        loadMedicoFirmante,
        createMedicoFirmante,
        updateMedicoFirmanteById,
    };
});