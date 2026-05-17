import { defineStore } from 'pinia';
import { ref } from 'vue';
import DocumentosAPI from '@/api/DocumentosAPI';
import { normalizarCamposAuditoriaPayload } from '@/helpers/mongoId';

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

    const doc = normalizarCamposAuditoriaPayload({ ...documento });

    switch (tipoDocumento) {
      case 'antidoping':
        formDataAntidoping.value = doc;
        break;
      case 'aptitud':
        formDataAptitud.value = doc;
        break;
      case 'audiometria':
        formDataAudiometria.value = doc;
        break;
      case 'certificado':
        formDataCertificado.value = doc;
        break;
      case 'certificadoExpedito':
        formDataCertificadoExpedito.value = doc;
        break;
      case 'documentoExterno':
        formDataDocumentoExterno.value = doc;
        break;
      case 'examenVista':
        formDataExamenVista.value = doc;
        break;
      case 'exploracionFisica':
        formDataExploracionFisica.value = doc;
        break;
      case 'historiaClinica':
        formDataHistoriaClinica.value = doc;
        break;
      case 'notaMedica':
        formDataNotaMedica.value = doc;
        break;
      case 'controlPrenatal':
        formDataControlPrenatal.value = doc;
        break;
      case 'historiaOtologica':
        formDataHistoriaOtologica.value = doc;
        break;
      case 'previoEspirometria':
        formDataPrevioEspirometria.value = doc;
        break;
      case 'receta':
        formDataReceta.value = doc;
        break;
      case 'constanciaAptitud':
        formDataConstanciaAptitud.value = doc;
        break;
      case 'entrevistaPsicologica':
        formDataEntrevistaPsicologica.value = doc;
        break;
      case 'trastornosEstadoAnimo':
        formDataTrastornosEstadoAnimo.value = doc;
        break;
      case 'cuestionarioProdromalBreve':
        formDataCuestionarioProdromalBreve.value = doc;
        break;
      case 'trastornoLimitePersonalidad':
        formDataTrastornoLimitePersonalidad.value = doc;
        break;
      case 'eventoSeguimientoCardiometabolico':
        formDataEventoSeguimientoCardiometabolico.value = doc;
        break;
      case 'informeLongitudinalCardiometabolico':
        formDataInformeLongitudinalCardiometabolico.value = doc;
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
