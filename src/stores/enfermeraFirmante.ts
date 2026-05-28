import { ref } from "vue";
import { defineStore } from "pinia";
import EnfermeraFirmanteAPI from "@/api/EnfermeraFirmanteAPI";

import axios from "axios";

interface EnfermeraFirmante {
    _id: string;
    nombre: string;
    primerApellido?: string;
    segundoApellido?: string;
    sexo?: string;
    tituloProfesional?: string;
    numeroCedulaProfesional?: string;
    nombreCredencialAdicional?: string;
    numeroCredencialAdicional?: string;
    firma?: {                                                                     
        data: string;
        contentType: string
    };
    idUser: string;
}

// Define el store
export const useEnfermeraFirmanteStore = defineStore("enfermeraFirmante", () => {
    const loading = ref(true);
    const enfermeraFirmante = ref<EnfermeraFirmante | null>(null);

    async function loadEnfermeraFirmanteById(idEnfermeraFirmante: string) {
        try {
            loading.value = true;
            const { data } = await EnfermeraFirmanteAPI.getEnfermeraFirmanteById(idEnfermeraFirmante);
            enfermeraFirmante.value = data;
        } catch (error) {
            console.error("Error al cargar enfermera firmante:", error);
        } finally {
            loading.value = false;
        }
    }

    async function loadEnfermeraFirmante(idUser: string) {
        try {
            loading.value = true;
    
            const { data } = await EnfermeraFirmanteAPI.getEnfermeraFirmanteByUserId(idUser);
            enfermeraFirmante.value = data;
        } catch (error) {
            // Verificar si el error es de tipo AxiosError
            if (axios.isAxiosError(error)) {
                // Manejar el caso en que no se encuentra el enfermera (404)
                if (error.response && error.response.status === 404) {
                    console.log("No se encontró un enfermera firmante para el usuario proporcionado.");
                    enfermeraFirmante.value = null; // O inicializa un estado vacío
                } else {
                    // Manejar otros errores de Axios
                    console.error("Error al cargar enfermera firmante:", error.message);
                }
            } else {
                // Manejar errores que no son de Axios
                console.error("Error inesperado:", error);
            }
        } finally {
            loading.value = false;
        }
    }

    async function createEnfermeraFirmante(enfermeraFirmanteData: EnfermeraFirmante) {
        try {
            loading.value = true;
            const { data } = await EnfermeraFirmanteAPI.createEnfermeraFirmante(enfermeraFirmanteData);
            enfermeraFirmante.value = data;
            return data;
        } catch (error) {
            console.error("Error al crear enfermera firmante:", error);
        } finally {
            loading.value = false;
        }
    }

    async function updateEnfermeraFirmanteById(idEnfermeraFirmante: string, enfermeraFirmanteData: EnfermeraFirmante) {
        try {
            loading.value = true;
            const { data } = await EnfermeraFirmanteAPI.updateEnfermeraFirmanteById(idEnfermeraFirmante, enfermeraFirmanteData);
            enfermeraFirmante.value = data;
            return data;
        } catch (error) {
            console.error("Error al actualizar enfermera firmante:", error);
        } finally {
            loading.value = false;
        }
    }

    return {
        enfermeraFirmante,
        loading,
        loadEnfermeraFirmanteById,
        loadEnfermeraFirmante,
        createEnfermeraFirmante,
        updateEnfermeraFirmanteById,
    };
});