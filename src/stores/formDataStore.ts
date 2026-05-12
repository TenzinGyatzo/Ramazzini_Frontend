import { defineStore } from 'pinia';
import { ref } from 'vue';
import DocumentosAPI from '@/api/DocumentosAPI';

export const useFormDataStore = defineStore('formData', () => {
  const formDataAntidoping = ref({}); // Estado compartido
  const formDataAptitud = ref({}); // Estado compartido
  const formDataAudiometria = ref({}); // Estado compartido
  const formDataCertificado = ref({}); // Estado compartido
  const formDataCertificadoExpedito = ref({}); // Estado compartido
  const formDataDocumentoExterno = ref({}); // Estado compartido
  const formDataExamenVista = ref({}); // Estado compartido
  const formDataExploracionFisica = ref({}); // Estado compartido
  const formDataHistoriaClinica = ref({}); // Estado compartido
  const formDataNotaMedica = ref({}); // Estado compartido
  const formDataControlPrenatal = ref({}); // Estado compartido
  const formDataHistoriaOtologica = ref({}); // Estado compartido
  const formDataPrevioEspirometria = ref({}); // Estado compartido
  const formDataReceta = ref({}); // Estado compartido
  const formDataConstanciaAptitud = ref({}); // Estado compartido
  const formDataEntrevistaPsicologica = ref({}); // Estado compartido
  const formDataTrastornosEstadoAnimo = ref({}); // Estado compartido
  const formDataCuestionarioProdromalBreve = ref({}); // Estado compartido
  const formDataTrastornoLimitePersonalidad = ref({}); // Estado compartido
  const formDataEventoSeguimientoCardiometabolico = ref({}); // Estado compartido
  const formDataInformeLongitudinalCardiometabolico = ref({}); // Estado compartido

  const setFormDataFromDocument = (documento, tipoDocumento) => {
    if (!documento) {
      console.error('Documento es nulo o indefinido:', documento);
      return;
    }

    switch (tipoDocumento) {
      case 'antidoping':
        formDataAntidoping.value = { ...documento };
        break;
      case 'aptitud':
        formDataAptitud.value = { ...documento };
        break;
      case 'audiometria':
        formDataAudiometria.value = { ...documento };
        break;
      case 'certificado':
        formDataCertificado.value = { ...documento };
        break;
      case 'certificadoExpedito':
        formDataCertificadoExpedito.value = { ...documento };
        break;
      case 'documentoExterno':
        formDataDocumentoExterno.value = { ...documento };
        break;
      case 'examenVista':
        formDataExamenVista.value = { ...documento };
        break;
      case 'exploracionFisica':
        formDataExploracionFisica.value = { ...documento };
        break;
      case 'historiaClinica':
        formDataHistoriaClinica.value = { ...documento };
        break;
      case 'notaMedica':
        formDataNotaMedica.value = { ...documento };
        break;
      case 'controlPrenatal':
        formDataControlPrenatal.value = { ...documento };
        break;
      case 'historiaOtologica':
        formDataHistoriaOtologica.value = { ...documento };
        break;
      case 'previoEspirometria':
        formDataPrevioEspirometria.value = { ...documento };
        break;
      case 'receta':
        formDataReceta.value = { ...documento };
        break;
      case 'constanciaAptitud':
        formDataConstanciaAptitud.value = { ...documento };
        break;
      case 'entrevistaPsicologica':
        formDataEntrevistaPsicologica.value = { ...documento };
        break;
      case 'trastornosEstadoAnimo':
        formDataTrastornosEstadoAnimo.value = { ...documento };
        break;
      case 'cuestionarioProdromalBreve':
        formDataCuestionarioProdromalBreve.value = { ...documento };
        break;
      case 'trastornoLimitePersonalidad':
        formDataTrastornoLimitePersonalidad.value = { ...documento };
        break;
      case 'eventoSeguimientoCardiometabolico':
        formDataEventoSeguimientoCardiometabolico.value = { ...documento };
        break;
      case 'informeLongitudinalCardiometabolico':
        formDataInformeLongitudinalCardiometabolico.value = { ...documento };
        break;
      default:
        console.error('Tipo de documento no reconocido:', tipoDocumento);
        break;
    }
  };  

  const setExamenVistaCeguera = (ojoIzquierdo: boolean, ojoDerecho: boolean) => {
    const data = formDataExamenVista.value;
    if (typeof data === 'object' && data !== null) {
      (data as Record<string, unknown>).ojoIzquierdoCegueraTotal = ojoIzquierdo;
      (data as Record<string, unknown>).ojoDerechoCegueraTotal = ojoDerecho;
    }
  };

  const resetFormData = () => {
    // Reiniciar el estado directamente asignando un objeto vacío.
    formDataAntidoping.value = {};
    formDataAptitud.value = {};
    formDataAudiometria.value = {};
    formDataCertificado.value = {};
    formDataCertificadoExpedito.value = {};
    formDataDocumentoExterno.value = {};
    formDataExamenVista.value = {};
    formDataExploracionFisica.value = {};
    formDataHistoriaClinica.value = {};
    formDataNotaMedica.value = {};
    formDataControlPrenatal.value = {};
    formDataHistoriaOtologica.value = {};
    formDataPrevioEspirometria.value = {};
    formDataReceta.value = {};
    formDataConstanciaAptitud.value = {};
    formDataEntrevistaPsicologica.value = {};
    formDataTrastornosEstadoAnimo.value = {};
    formDataCuestionarioProdromalBreve.value = {};
    formDataTrastornoLimitePersonalidad.value = {};
    formDataEventoSeguimientoCardiometabolico.value = {};
    formDataInformeLongitudinalCardiometabolico.value = {};
  };

  const consultarAlturaDisponible = async (trabajadorId: string) => {
    try {
      const response = await DocumentosAPI.getAlturaDisponible(trabajadorId);
      const { altura, fuente } = response.data.data;
      
      if (altura) {
        if (fuente === 'exploracionFisica') {
          (formDataExploracionFisica.value as any).altura = altura;
        } else if (fuente === 'controlPrenatal') {
          (formDataControlPrenatal.value as any).altura = altura;
        }
      }
      
      return { altura, fuente };
    } catch (error) {
      console.log('No se pudo obtener altura de BD:', error);
      return { altura: null, fuente: null };
    }
  };

  return { 
    formDataAntidoping,
    formDataAptitud,
    formDataAudiometria,
    formDataCertificado,
    formDataCertificadoExpedito,
    formDataDocumentoExterno,
    formDataExamenVista,
    formDataExploracionFisica,
    formDataHistoriaClinica, 
    formDataNotaMedica,
    formDataControlPrenatal,
    formDataHistoriaOtologica,
    formDataPrevioEspirometria,
    formDataReceta,
    formDataConstanciaAptitud,
    formDataEntrevistaPsicologica,
    formDataTrastornosEstadoAnimo,
    formDataCuestionarioProdromalBreve,
    formDataTrastornoLimitePersonalidad,
    formDataEventoSeguimientoCardiometabolico,
    formDataInformeLongitudinalCardiometabolico,
    consultarAlturaDisponible,
    resetFormData,
    setExamenVistaCeguera,
    setFormDataFromDocument,
  };
});
