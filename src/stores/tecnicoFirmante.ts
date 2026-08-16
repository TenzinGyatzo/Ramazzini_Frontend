import { ref } from "vue";
import { defineStore } from "pinia";
import TecnicoFirmanteAPI from "@/api/TecnicoFirmanteAPI";
import axios from "axios";
import { unwrapFirmanteRecord } from "@/helpers/unwrapFirmanteRecord";

interface TecnicoFirmante {
  _id: string;
  nombre: string;
  curp?: string;
  folio?: string; // NOM-024: Identificador en la UM (generado al crear)
  primerApellido?: string;
  segundoApellido?: string;
  sexo?: string;
  sexoCURP?: number;
  tituloProfesional?: string;
  numeroCedulaProfesional?: string;
  nombreCredencialAdicional?: string;
  numeroCredencialAdicional?: string;
  paisNacimiento?: number;
  entidadNacimiento?: string;
  entidadResidencia?: string;
  municipioResidencia?: string;
  localidadResidencia?: string;
  paisResidencia?: number;
  fechaNacimiento?: string;
  firma?: {
    data: string;
    contentType: string;
  };
  idUser: string;
}

export const useTecnicoFirmanteStore = defineStore("tecnicoFirmante", () => {
  const loading = ref(true);
  const saving = ref(false);
  const tecnicoFirmante = ref<TecnicoFirmante | null>(null);

  async function loadTecnicoFirmanteById(id: string) {
    try {
      loading.value = true;
      const { data } = await TecnicoFirmanteAPI.getTecnicoFirmanteById(id);
      tecnicoFirmante.value = unwrapFirmanteRecord<TecnicoFirmante>(data);
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
      tecnicoFirmante.value = unwrapFirmanteRecord<TecnicoFirmante>(data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response && error.response.status === 404) {
          const hadCachedForUser = tecnicoFirmante.value?.idUser === idUser;
          if (!hadCachedForUser) {
            tecnicoFirmante.value = null;
          }
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

  async function createTecnicoFirmante(data: FormData) {
    try {
      saving.value = true;
      const { data: response } = await TecnicoFirmanteAPI.createTecnicoFirmante(data);
      const firmante = unwrapFirmanteRecord<TecnicoFirmante>(response);
      if (!firmante) {
        throw new Error("Respuesta inválida al crear técnico firmante");
      }
      tecnicoFirmante.value = firmante;
      return firmante;
    } catch (error) {
      console.error("Error al crear técnico firmante:", error);
      throw error;
    } finally {
      saving.value = false;
    }
  }

  async function updateTecnicoFirmanteById(id: string, data: FormData) {
    try {
      saving.value = true;
      const { data: response } = await TecnicoFirmanteAPI.updateTecnicoFirmanteById(id, data);
      const firmante = unwrapFirmanteRecord<TecnicoFirmante>(response);
      if (!firmante) {
        throw new Error("Respuesta inválida al actualizar técnico firmante");
      }
      tecnicoFirmante.value = firmante;
      return firmante;
    } catch (error) {
      console.error("Error al actualizar técnico firmante:", error);
      throw error;
    } finally {
      saving.value = false;
    }
  }

  return {
    tecnicoFirmante,
    loading,
    saving,
    loadTecnicoFirmanteById,
    loadTecnicoFirmante,
    createTecnicoFirmante,
    updateTecnicoFirmanteById,
  };
});
