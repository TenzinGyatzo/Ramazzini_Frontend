import { ref } from "vue";
import { defineStore } from "pinia";
import MedicoFirmanteAPI from "@/api/MedicoFirmanteAPI";
import axios from "axios";

interface MedicoFirmante {
    _id: string;
    nombre: string;
    primerApellido?: string;
    segundoApellido?: string;
    tituloProfesional?: string;
    numeroCedulaProfesional?: string;
    especialistaSaludTrabajo?: boolean;
    numeroCedulaEspecialista?: string;
    nombreCredencialAdicional?: string;
    numeroCredencialAdicional?: string;
    nombreCredencialAdicional2?: string;
    numeroCredencialAdicional2?: string;
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
    const medicoFirmante = ref<MedicoFirmante | null>(null);

    async function loadMedicoFirmanteById(idMedicoFirmante: string) {
        try {
            loading.value = true;
            const { data } = await MedicoFirmanteAPI.getMedicoFirmanteById(idMedicoFirmante);
            medicoFirmante.value = data;
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
            medicoFirmante.value = data;
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
            loading.value = true;
            const { data } = await MedicoFirmanteAPI.createMedicoFirmante(medicoFirmanteData);
            medicoFirmante.value = data;
            return data;
        } catch (error) {
            console.error("Error al cargar médico firmante:", error);
        } finally {
            loading.value = false;
        }
    }

    async function updateMedicoFirmanteById(idMedicoFirmante: string, medicoFirmanteData: MedicoFirmante) {
        try {
            loading.value = true;
            const { data } = await MedicoFirmanteAPI.updateMedicoFirmanteById(idMedicoFirmante, medicoFirmanteData);
            medicoFirmante.value = data;
            return data;
        } catch (error) {
            console.error("Error al cargar médico firmante:", error);
        } finally {
            loading.value = false;
        }
    }

    return {
        medicoFirmante,
        loading,
        loadMedicoFirmanteById,
        loadMedicoFirmante,
        createMedicoFirmante,
        updateMedicoFirmanteById,
    };
});