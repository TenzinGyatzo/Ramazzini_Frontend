import { ref } from "vue";
import { defineStore } from "pinia";
import TecnicoFirmanteAPI from "@/api/TecnicoFirmanteAPI";
import axios from "axios";

interface TecnicoFirmante {
  _id: string;
  nombre: string;
  curp?: string; // NOM-024: CURP del profesional de salud
  primerApellido?: string;
  segundoApellido?: string;
  sexo?: string;
  tituloProfesional?: string;
  numeroCedulaProfesional?: string;
  nombreCredencialAdicional?: string;
  numeroCredencialAdicional?: string;
  firma?: {
    data: string;
    contentType: string;
  };
  idUser: string;
}

export const useTecnicoFirmanteStore = defineStore("tecnicoFirmante", () => {
  const loading = ref(true);
  const tecnicoFirmante = ref<TecnicoFirmante | null>(null);

  async function loadTecnicoFirmanteById(id: string) {
    try {
      loading.value = true;
      const { data } = await TecnicoFirmanteAPI.getTecnicoFirmanteById(id);
      tecnicoFirmante.value = data;
    } catch (error) {
      console.error("Error al cargar técnico firmante:", error);
    } finally {
      loading.value = false;
    }
  }

  async function loadTecnicoFirmante(idUser: string) {
    try {
      loading.value = true;
      const { data } = await TecnicoFirmanteAPI.getTecnicoFirmanteByUserId(idUser);
      tecnicoFirmante.value = data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response && error.response.status === 404) {
          tecnicoFirmante.value = null;
        } else {
          console.error("Error al cargar técnico firmante:", error.message);
        }
      } else {
        console.error("Error inesperado:", error);
      }
    } finally {
      loading.value = false;
    }
  }

  async function createTecnicoFirmante(data: any) {
    try {
      loading.value = true;
      const { data: response } = await TecnicoFirmanteAPI.createTecnicoFirmante(data);
      tecnicoFirmante.value = response;
      return response;
    } catch (error) {
      console.error("Error al crear técnico firmante:", error);
    } finally {
      loading.value = false;
    }
  }

  async function updateTecnicoFirmanteById(id: string, data: any) {
    try {
      loading.value = true;
      const { data: response } = await TecnicoFirmanteAPI.updateTecnicoFirmanteById(id, data);
      tecnicoFirmante.value = response;
      return response;
    } catch (error) {
      console.error("Error al actualizar técnico firmante:", error);
    } finally {
      loading.value = false;
    }
  }

  return {
    tecnicoFirmante,
    loading,
    loadTecnicoFirmanteById,
    loadTecnicoFirmante,
    createTecnicoFirmante,
    updateTecnicoFirmanteById,
  };
});


