import { defineStore } from "pinia";
import { ref } from "vue";
import RiesgosTrabajoAPI from "@/api/RiesgosTrabajoAPI";
import type { RiesgoTrabajo } from "@/interfaces/riesgo-trabajo.interface";

export const useRiesgoTrabajoStore = defineStore("riesgos-trabajo", () => {
  const loading = ref(true);
  const riesgosTrabajo = ref<RiesgoTrabajo[]>([]);
  const currentRiesgoTrabajoId = ref<string>();
  const currentRiesgoTrabajo = ref<RiesgoTrabajo>();

  function resetCurrentRiesgoTrabajo() {
    currentRiesgoTrabajo.value = {
      _id: "",
      fechaRiesgo: "",
      recaida: "",
      nss: "",
      tipoRiesgo: "",
      naturalezaLesion: "",
      parteCuerpoAfectada: "",
      manejo: "",
      alta: "",
      fechaAlta: "",
      diasIncapacidad: 0,
      secuelas: "",
      porcentajeIPP: 0,
      notas: "",
      idTrabajador: "",
      createdBy: "",
      updatedBy: "",
      createdAt: "",
      updatedAt: "",
      nombreTrabajador: "",
      sexoTrabajador: "",
      puestoTrabajador: "",
      fechaNacimiento: "",
      fechaIngreso: "",
      idCentroTrabajo: "",
    };
    currentRiesgoTrabajoId.value = "";
  }

  function clear() {
    riesgosTrabajo.value = [];
    currentRiesgoTrabajo.value = undefined;
    currentRiesgoTrabajoId.value = undefined;
    loading.value = false;
  }

  async function fetchRiesgosTrabajo(trabajadorId: string) {
    try {
      loading.value = true;
      const { data } = await RiesgosTrabajoAPI.getRiesgosTrabajo(trabajadorId);
      riesgosTrabajo.value = data.map(riesgo => ({
        ...riesgo,
        nombreTrabajador: riesgo.trabajador?.nombre,
        puestoTrabajador: riesgo.trabajador?.puesto,
      }));
      return data;
    } catch (error) {
      // console.log(error);
      throw error;
    } finally {
      loading.value = false;
    }
  } 

  async function fetchRiesgoTrabajoById(
    trabajadorId: string,
    riesgoTrabajoId: string
  ) {
    try {
      loading.value = true;
      const { data } = await RiesgosTrabajoAPI.getRiesgoTrabajoPorId(
        trabajadorId,
        riesgoTrabajoId
      );
      currentRiesgoTrabajo.value = data;
      currentRiesgoTrabajoId.value = riesgoTrabajoId;
    } catch (error) {
      console.log(error);
    } finally {
      loading.value = false;
    }
  }

  async function createRiesgoTrabajo(
    trabajadorId: string,
    riesgoTrabajoData: RiesgoTrabajo
  ) {
    try {
      loading.value = true;
      const response = await RiesgosTrabajoAPI.createRiesgoTrabajo(
        trabajadorId,
        riesgoTrabajoData
      );
      return response.data; // ✅ esto devuelve la nueva RT creada
    } catch (error) {
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function updateRiesgoTrabajo(
    trabajadorId: string,
    riesgoTrabajoId: string,
    riesgoTrabajoData: Partial<RiesgoTrabajo>
  ) {
    try {
      loading.value = true;
      await RiesgosTrabajoAPI.updateRiesgoTrabajo(
        trabajadorId,
        riesgoTrabajoId,
        riesgoTrabajoData
      );
    } catch (error) {
      // console.log(error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function deleteRiesgoTrabajo(
    trabajadorId: string,
    riesgoTrabajoId: string
  ) {
    try {
      loading.value = true;
      await RiesgosTrabajoAPI.deleteRiesgoTrabajo(
        trabajadorId,
        riesgoTrabajoId
      );
    } catch (error) {
      // console.log(error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    riesgosTrabajo,
    currentRiesgoTrabajoId,
    currentRiesgoTrabajo,
    resetCurrentRiesgoTrabajo,
    clear,
    fetchRiesgosTrabajo,
    fetchRiesgoTrabajoById,
    createRiesgoTrabajo,
    updateRiesgoTrabajo,
    deleteRiesgoTrabajo,
  };
});
