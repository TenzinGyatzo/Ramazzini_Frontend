<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { calcularEdad, calcularAntiguedad, convertirFechaISOaDDMMYYYY, formatDateDDMMYYYY } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import DocumentosAPI from '@/api/DocumentosAPI';
import ResultadosClinicosAPI from '@/api/ResultadosClinicosAPI';
import { findNearestDocument } from '@/helpers/findNearestDocuments';
import { resumenSucintoEntrevistaPsicologica } from '@/helpers/conclusionEntrevistaPsicologica';
import {
  textoResumenTrastornosEstadoAnimo,
  textoResumenCuestionarioProdromalBreve,
  textoResumenTrastornoLimitePersonalidad,
} from '@/helpers/resumenesCuestionariosPsicologicosAptitud';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const steps = useStepsStore();

// Lógica para traerse la data de los documentos con fecha más cercana a la aptitud
const historiasClinicas = ref([]);
const nearestHistoriaClinica = ref(null);

const exploracionesFisicas = ref([]);
const nearestExploracionFisica = ref(null);

const examenesVista = ref([]);
const nearestExamenVista = ref(null);

const antidopings = ref([]);
const nearestAntidoping = ref(null);

const audiometrias = ref([]);
const nearestAudiometria = ref(null);

const resultadosClinicos = ref([]);
const nearestEKG = ref(null);
const nearestEspirometria = ref(null);
const nearestTipoSangre = ref(null);
const nearestRayosX = ref(null);
const nearestAnalisisLaboratorio = ref(null);

const entrevistasPsicologicas = ref([]);
const nearestEntrevistaPsicologica = ref(null);
const trastornosEstadoAnimoList = ref([]);
const nearestTrastornosEstadoAnimo = ref(null);
const cuestionariosProdromalBreve = ref([]);
const nearestCuestionarioProdromalBreve = ref(null);
const trastornosLimitePersonalidad = ref([]);
const nearestTrastornoLimitePersonalidad = ref(null);

onMounted(async () => {
  try {
    const response = await DocumentosAPI.getHistoriasClinicas(trabajadores.currentTrabajadorId);
    historiasClinicas.value = response.data;
  } catch (error) {
    console.error('Error al obtener los exámenes:', error);
  }
  try {
    const response = await DocumentosAPI.getExploracionesFisicas(trabajadores.currentTrabajadorId);
    exploracionesFisicas.value = response.data;
  } catch (error) {
    console.error('Error al obtener los exámenes:', error);
  }
  try {
    const response = await DocumentosAPI.getExamenesVista(trabajadores.currentTrabajadorId);
    examenesVista.value = response.data;
  } catch (error) {
    console.error('Error al obtener los exámenes:', error);
  }
  try {
    const response = await DocumentosAPI.getAntidopings(trabajadores.currentTrabajadorId);
    antidopings.value = response.data;
  } catch (error) {
    console.error('Error al obtener los exámenes:', error);
  }
  try {
    const response = await DocumentosAPI.getAudiometrias(trabajadores.currentTrabajadorId);
    audiometrias.value = response.data;
  } catch (error) {
    console.error('Error al obtener los exámenes:', error);
  }

  try {
    const response = await ResultadosClinicosAPI.getByTrabajador(trabajadores.currentTrabajadorId);
    resultadosClinicos.value = response.data || [];
  } catch (error) {
    console.error('Error al obtener los resultados clínicos:', error);
    resultadosClinicos.value = [];
  }

  try {
    const r = await DocumentosAPI.getEntrevistaPsicologica(trabajadores.currentTrabajadorId);
    entrevistasPsicologicas.value = r.data || [];
  } catch (error) {
    console.error('Error al obtener entrevistas psicológicas:', error);
    entrevistasPsicologicas.value = [];
  }
  try {
    const r = await DocumentosAPI.getTrastornosEstadoAnimo(trabajadores.currentTrabajadorId);
    trastornosEstadoAnimoList.value = r.data || [];
  } catch (error) {
    console.error('Error al obtener cuestionario estado de ánimo:', error);
    trastornosEstadoAnimoList.value = [];
  }
  try {
    const r = await DocumentosAPI.getCuestionarioProdromalBreve(trabajadores.currentTrabajadorId);
    cuestionariosProdromalBreve.value = r.data || [];
  } catch (error) {
    console.error('Error al obtener cuestionario prodromal breve:', error);
    cuestionariosProdromalBreve.value = [];
  }
  try {
    const r = await DocumentosAPI.getTrastornoLimitePersonalidad(trabajadores.currentTrabajadorId);
    trastornosLimitePersonalidad.value = r.data || [];
  } catch (error) {
    console.error('Error al obtener cuestionario TLP:', error);
    trastornosLimitePersonalidad.value = [];
  }

    // Llamar la función de cálculo inicial si ya existe fechaAptitudPuesto
    if (formData.formDataAptitud.fechaAptitudPuesto) {
    calculateNearestDocuments(formData.formDataAptitud.fechaAptitudPuesto);
  }
});

const findMostRecentByTipo = (items, tipo, referenceYear) => {
  if (!items?.length) {
    return null;
  }

  let candidates = items.filter((item) => item?.tipoEstudio === tipo && item?.fechaEstudio);
  if (referenceYear != null && !Number.isNaN(referenceYear)) {
    candidates = candidates.filter((item) => {
      const d = new Date(item.fechaEstudio);
      return !isNaN(d.getTime()) && d.getFullYear() === referenceYear;
    });
  }

  return candidates.reduce((latest, current) => {
      const currentDate = new Date(current.fechaEstudio);
      if (isNaN(currentDate.getTime())) {
        return latest;
      }

      if (!latest) {
        return current;
      }

      const latestDate = new Date(latest.fechaEstudio);
      return currentDate > latestDate ? current : latest;
    }, null);
};

// Función reutilizable para calcular los documentos más cercanos (mismo año calendario que fecha de aptitud)
const nearestOpts = { sameYearAsReference: true };

const calculateNearestDocuments = (fechaAptitudPuesto) => {
  const ref = fechaAptitudPuesto ? new Date(fechaAptitudPuesto) : null;
  const referenceYear =
    ref && !isNaN(ref.getTime()) ? ref.getFullYear() : null;

  nearestExamenVista.value = findNearestDocument(
    examenesVista.value,
    fechaAptitudPuesto,
    'fechaExamenVista',
    nearestOpts,
  );
  nearestHistoriaClinica.value = findNearestDocument(
    historiasClinicas.value,
    fechaAptitudPuesto,
    'fechaHistoriaClinica',
    nearestOpts,
  );
  nearestExploracionFisica.value = findNearestDocument(
    exploracionesFisicas.value,
    fechaAptitudPuesto,
    'fechaExploracionFisica',
    nearestOpts,
  );
  nearestAudiometria.value = findNearestDocument(
    audiometrias.value,
    fechaAptitudPuesto,
    'fechaAudiometria',
    nearestOpts,
  );
  nearestAntidoping.value = findNearestDocument(
    antidopings.value,
    fechaAptitudPuesto,
    'fechaAntidoping',
    nearestOpts,
  );
  nearestEKG.value = findMostRecentByTipo(
    resultadosClinicos.value, 
    'EKG', referenceYear
  );
  nearestEspirometria.value = findMostRecentByTipo(
    resultadosClinicos.value,
    'ESPIROMETRIA',
    referenceYear,
  );
  nearestTipoSangre.value = findMostRecentByTipo(
    resultadosClinicos.value,
    'TIPO_SANGRE'
  );
  nearestRayosX.value = findMostRecentByTipo(
    resultadosClinicos.value, 
    'RAYOS_X', 
    referenceYear,
  );
  nearestAnalisisLaboratorio.value = findMostRecentByTipo(
    resultadosClinicos.value,
    'ANALISIS_LABORATORIO',
    referenceYear,
  );
  nearestEntrevistaPsicologica.value = findNearestDocument(
    entrevistasPsicologicas.value,
    fechaAptitudPuesto,
    'fechaEntrevistaPsicologica',
    nearestOpts,
  );
  nearestTrastornosEstadoAnimo.value = findNearestDocument(
    trastornosEstadoAnimoList.value,
    fechaAptitudPuesto,
    'fechaTrastornosEstadoAnimo',
    nearestOpts,
  );
  nearestCuestionarioProdromalBreve.value = findNearestDocument(
    cuestionariosProdromalBreve.value,
    fechaAptitudPuesto,
    'fechaCuestionarioProdromalBreve',
    nearestOpts,
  );
  nearestTrastornoLimitePersonalidad.value = findNearestDocument(
    trastornosLimitePersonalidad.value,
    fechaAptitudPuesto,
    'fechaTrastornoLimitePersonalidad',
    nearestOpts,
  );
};

// Watch para reactuar a cambios en la fecha
watch(
  () => formData.formDataAptitud.fechaAptitudPuesto,
  (newFechaAptitudPuesto) => {
    calculateNearestDocuments(newFechaAptitudPuesto);
  }
);

// Ir a un paso específico
const goToStep = (stepNumber) => {
  steps.goToStep(stepNumber);
};

// Resumenes Computados
const historiaClinicaResumen = computed(() => {
  if (!nearestHistoriaClinica.value) {
    return 'No hay históricas clínicas disponibles';
  }
  return nearestHistoriaClinica.value.resumenHistoriaClinica;
});

const exploracionFisicaResumen = computed(() => {
  if (!nearestExploracionFisica.value) {
    return 'No hay exploraciones físicas disponibles';
  }
  return `TA: ${nearestExploracionFisica.value.tensionArterialSistolica}/${nearestExploracionFisica.value.tensionArterialDiastolica} mmHg - ${nearestExploracionFisica.value.categoriaTensionArterial}. ${nearestExploracionFisica.value.resumenExploracionFisica}.`;
});

const adiposidadCorporalResumen = computed(() => {
  if (!nearestExploracionFisica.value) {
    return 'No hay exploraciones físicas disponibles';
  }
  return `IMC: ${nearestExploracionFisica.value.indiceMasaCorporal} - ${nearestExploracionFisica.value.categoriaIMC}. Cintura: ${nearestExploracionFisica.value.circunferenciaCintura} cm - ${nearestExploracionFisica.value.categoriaCircunferenciaCintura}.`;
});

const examenVistaResumen = computed(() => {
  if (!nearestExamenVista.value) {
    return 'No hay exámenes de vista disponibles';
  }
  return (nearestExamenVista.value.ojoIzquierdoLejanaConCorreccion === 0 || nearestExamenVista.value.ojoIzquierdoLejanaConCorreccion == null) &&
    (nearestExamenVista.value.ojoDerechoLejanaConCorreccion === 0 || nearestExamenVista.value.ojoDerechoLejanaConCorreccion == null)
    ? `OI: 20/${nearestExamenVista.value.ojoIzquierdoLejanaSinCorreccion || '-'}, OD: 20/${nearestExamenVista.value.ojoDerechoLejanaSinCorreccion || '-'} - ${nearestExamenVista.value.sinCorreccionLejanaInterpretacion || '-'}, Ishihara: ${nearestExamenVista.value.porcentajeIshihara || '-'}% - ${nearestExamenVista.value.interpretacionIshihara || '-'}`
    : `OI: 20/${nearestExamenVista.value.ojoIzquierdoLejanaConCorreccion || '-'}, OD: 20/${nearestExamenVista.value.ojoDerechoLejanaConCorreccion || '-'} - ${nearestExamenVista.value.conCorreccionLejanaInterpretacion || '-'} Corregida, Ishihara: ${nearestExamenVista.value.porcentajeIshihara || '-'}% - ${nearestExamenVista.value.interpretacionIshihara || '-'}`;
});

const audiometriaResumen = computed(() => {
  if (!nearestAudiometria.value) {
    return 'No hay audiometrías disponibles';
  }
  
  const diagnostico = nearestAudiometria.value.diagnosticoAudiometria || 'Sin diagnóstico';
  const hipoacusia = nearestAudiometria.value.hipoacusiaBilateralCombinada !== undefined 
    ? nearestAudiometria.value.hipoacusiaBilateralCombinada + '%' 
    : 'No especificado';
  
  return `${diagnostico} HBC ${hipoacusia}`;
});

const antidopingResumen = computed(() => {
  if (!nearestAntidoping.value) {
    return 'No hay antidopings disponibles';
  }

  // Contar cuántos parámetros están presentes
  const evaluados = [
    'marihuana',
    'cocaina',
    'anfetaminas',
    'metanfetaminas',
    'opiaceos',
    'benzodiacepinas',
    'fenciclidina',
    'metadona',
    'barbituricos',
    'antidepresivosTriciclicos',
    'metilendioximetanfetamina',
    'ketamina'
  ].filter(param => nearestAntidoping.value[param] !== undefined);

  // Evaluar si todos los evaluados son 'Negativo'
  const todosNegativos = evaluados.every(param => nearestAntidoping.value[param] === 'Negativo');

  if (todosNegativos) {
    const cantidadEnLetras = {
      5: 'cinco',
      6: 'seis',
      10: 'diez',
      12: 'doce'
    }[evaluados.length] || evaluados.length;

    return `Negativo a ${cantidadEnLetras} parámetros`;
  }

  // Si hay algún positivo, construir el mensaje con las sustancias correspondientes
  const sustanciasPositivas = [
    nearestAntidoping.value.marihuana !== 'Negativo' ? 'Marihuana' : null,
    nearestAntidoping.value.cocaina !== 'Negativo' ? 'Cocaína' : null,
    nearestAntidoping.value.anfetaminas !== 'Negativo' ? 'Anfetaminas' : null,
    nearestAntidoping.value.metanfetaminas !== 'Negativo' ? 'Metanfetaminas' : null,
    nearestAntidoping.value.opiaceos !== 'Negativo' ? 'Opiáceos' : null,
    nearestAntidoping.value.benzodiacepinas && nearestAntidoping.value.benzodiacepinas !== 'Negativo' ? 'Benzodiazepinas' : null,
    nearestAntidoping.value.fenciclidina && nearestAntidoping.value.fenciclidina !== 'Negativo' ? 'Fenciclidina' : null,
    nearestAntidoping.value.metadona && nearestAntidoping.value.metadona !== 'Negativo' ? 'Metadona' : null,
    nearestAntidoping.value.barbituricos && nearestAntidoping.value.barbituricos !== 'Negativo' ? 'Barbitúricos' : null,
    nearestAntidoping.value.antidepresivosTriciclicos && nearestAntidoping.value.antidepresivosTriciclicos !== 'Negativo' ? 'Antidepresivos Tricíclicos' : null,
    nearestAntidoping.value.metilendioximetanfetamina && nearestAntidoping.value.metilendioximetanfetamina !== 'Negativo' ? 'Metilendioximetanfetamina' : null,
    nearestAntidoping.value.ketamina && nearestAntidoping.value.ketamina !== 'Negativo' ? 'Ketamina' : null
  ].filter(Boolean).join(', '); // Filtrar valores nulos o `undefined` y unirlos en una cadena separada por comas

  return `Positivo a: ${sustanciasPositivas}`;
});

const tipoSangreLabels = {
  A_POS: 'A RH Positivo',
  A_NEG: 'A RH Negativo',
  B_POS: 'B RH Positivo',
  B_NEG: 'B RH Negativo',
  AB_POS: 'AB RH Positivo',
  AB_NEG: 'AB RH Negativo',
  O_POS: 'O RH Positivo',
  O_NEG: 'O RH Negativo',
};

const tipoAlteracionEspirometriaLabels = {
  ANORMAL_OBSTRUCTIVO: 'Anormal obstructivo',
  ANORMAL_RESTRICTIVO_SOSPECHADO: 'Anormal restrictivo sospechado',
  ANORMAL_MIXTO: 'Anormal mixto',
};

const tipoAlteracionEKGLabels = {
  ANORMAL_ARRITMIA: 'Anormal arritmia',
  ANORMAL_TRASTORNO_CONDUCCION: 'Anormal trastorno de conducción',
  ANORMAL_ISQUEMIA_INFARTO: 'Anormal isquemia/infarto',
  ANORMAL_REPOLARIZACION: 'Anormal repolarización',
  ANORMAL_HIPERTROFIA_CRECIMIENTO_CAVIDADES: 'Anormal hipertrofia/crecimiento de cavidades',
  ANORMAL_QT_ALTERADO: 'Anormal QT alterado',
};

const tipoAlteracionRayosXLabels = {
  ALTERACION_PARENQUIMATOSA: 'Alteración parenquimatosa',
  ALTERACION_PLEURAL: 'Alteración pleural',
  ALTERACION_CARDIOMEDIASTINICA: 'Alteración cardiomediastínica',
  NODULO_O_MASA: 'Nódulo o masa',
  SECUELA_CRONICA: 'Secuela crónica',
  ALTERACION_OSEA: 'Alteración ósea',
  ALTERACION_ARTICULAR: 'Alteración articular',
  ALTERACION_ALINEACION: 'Alteración de alineación',
  CAMBIO_DEGENERATIVO: 'Cambio degenerativo',
  FRACTURA_O_TRAUMA: 'Fractura o trauma',
  OTRA_ALTERACION: 'Otra alteración',
};

const tipoAlteracionAnalisisLaboratorioLabels = {
  ALTERACION_HEMATOLOGICA: 'Alteración hematológica',
  ALTERACION_METABOLICA: 'Alteración metabólica',
  ALTERACION_RENAL: 'Alteración renal',
  ALTERACION_HEPATICA: 'Alteración hepática',
  ALTERACION_INFECCIOSA_O_INFLAMATORIA: 'Alteración infecciosa o inflamatoria',
  ALTERACION_URINARIA: 'Alteración urinaria',
  OTRA_ALTERACION: 'Otra alteración',
};

const tipoSangreResumen = computed(() => {
  if (!nearestTipoSangre.value) {
    return null;
  }

  const tipoSangre = nearestTipoSangre.value.tipoSangre;
  return tipoSangreLabels[tipoSangre] || tipoSangre || '-';
});

const textoHallazgoTrim = (h) => {
  if (h == null) return null;
  const t = String(h).trim();
  return t.length > 0 ? t : null;
};

const ekgResumen = computed(() => {
  if (!nearestEKG.value || nearestEKG.value.resultadoGlobal === 'NO_CONCLUYENTE') {
    return null;
  }

  const libre = textoHallazgoTrim(nearestEKG.value.hallazgoEspecifico);
  if (libre) return libre;

  if (nearestEKG.value.resultadoGlobal === 'NORMAL') {
    return 'Normal, valores dentro del rango de referencia';
  }

  if (nearestEKG.value.resultadoGlobal === 'ANORMAL') {
    const tipoAlteracion = nearestEKG.value.tipoAlteracionEKG;
    return tipoAlteracionEKGLabels[tipoAlteracion] || tipoAlteracion || 'Anormal';
  }

  return null;
});

const espirometriaResumen = computed(() => {
  if (!nearestEspirometria.value || nearestEspirometria.value.resultadoGlobal === 'NO_CONCLUYENTE') {
    return null;
  }

  const libre = textoHallazgoTrim(nearestEspirometria.value.hallazgoEspecifico);
  if (libre) return libre;

  if (nearestEspirometria.value.resultadoGlobal === 'NORMAL') {
    return 'Normal, valores dentro del rango de referencia';
  }

  if (nearestEspirometria.value.resultadoGlobal === 'ANORMAL') {
    const tipoAlteracion = nearestEspirometria.value.tipoAlteracionEspirometria;
    return tipoAlteracionEspirometriaLabels[tipoAlteracion] || tipoAlteracion || 'Anormal';
  }

  return null;
});

const showEKG = computed(() => !!nearestEKG.value && nearestEKG.value.resultadoGlobal !== 'NO_CONCLUYENTE');
const showEspirometria = computed(() => !!nearestEspirometria.value && nearestEspirometria.value.resultadoGlobal !== 'NO_CONCLUYENTE');

const rayosXResumen = computed(() => {
  const r = nearestRayosX.value;
  if (!r || r.resultadoGlobal === 'NO_CONCLUYENTE') return null;
  const libre = textoHallazgoTrim(r.hallazgoEspecifico);
  if (libre) return libre;
  if (r.resultadoGlobal === 'NORMAL') {
    return 'Dentro de límites normales';
  }
  if (r.resultadoGlobal === 'ANORMAL') {
    const arr = r.tipoAlteracionRayosX;
    if (Array.isArray(arr) && arr.length > 0) {
      return arr.map((k) => tipoAlteracionRayosXLabels[k] || k).join(', ');
    }
    return 'Anormal';
  }
  return null;
});

const analisisLaboratorioResumen = computed(() => {
  const r = nearestAnalisisLaboratorio.value;
  if (!r || r.resultadoGlobal === 'NO_CONCLUYENTE') return null;
  const libre = textoHallazgoTrim(r.hallazgoEspecifico);
  if (libre) return libre;
  if (r.resultadoGlobal === 'NORMAL') {
    return 'Resultados dentro de parámetros normales';
  }
  if (r.resultadoGlobal === 'ANORMAL') {
    const arr = r.tipoAlteracionAnalisisLaboratorio;
    if (Array.isArray(arr) && arr.length > 0) {
      return arr.map((k) => tipoAlteracionAnalisisLaboratorioLabels[k] || k).join(', ');
    }
    return 'Anormal';
  }
  return null;
});

const showRayosX = computed(
  () => !!nearestRayosX.value && nearestRayosX.value.resultadoGlobal !== 'NO_CONCLUYENTE',
);
const showAnalisisLaboratorio = computed(
  () =>
    !!nearestAnalisisLaboratorio.value &&
    nearestAnalisisLaboratorio.value.resultadoGlobal !== 'NO_CONCLUYENTE',
);

const entrevistaPsicologicaResumen = computed(() =>
  nearestEntrevistaPsicologica.value
    ? resumenSucintoEntrevistaPsicologica(nearestEntrevistaPsicologica.value)
    : '',
);

const trastornosEstadoAnimoResumen = computed(() =>
  textoResumenTrastornosEstadoAnimo(nearestTrastornosEstadoAnimo.value),
);

const cuestionarioProdromalBreveResumen = computed(() =>
  textoResumenCuestionarioProdromalBreve(nearestCuestionarioProdromalBreve.value),
);

const trastornoLimitePersonalidadResumen = computed(() =>
  textoResumenTrastornoLimitePersonalidad(nearestTrastornoLimitePersonalidad.value),
);

</script>

<template>
  <div
    class="visualizador-aptitud flex flex-wrap justify-start gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto">

    <!-- Empresa y Fecha -->
    <div class="flex flex-wrap w-full gap-1 md:gap-4">
      <!-- Empresa -->
      <div class="w-full md:w-[calc(75%-0.5rem)]">
        <p class="text-center text-base sm:text-lg">
          {{ empresas.currentEmpresa.nombreComercial }}
        </p>
      </div>

      <!-- Fecha -->
      <div class="w-full md:w-[calc(25%-0.5rem)] flex flex-wrap gap-2 justify-end text-sm sm:text-base cursor-pointer"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 1 }"
        @click="goToStep(1)">
        <p class="w-full md:w-auto">Fecha: <span class="font-medium">{{
           formatDateDDMMYYYY(formData.formDataAptitud.fechaAptitudPuesto) }}</span></p>
      </div>
    </div>

    <!-- Trabajador -->
    <div class="w-full">
      <table class="table-auto w-full border-collapse border border-gray-200">
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              NOMBRE
            </td>
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ formatNombreCompleto(trabajadores.currentTrabajador) }}
            </td>
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              NACIMIENTO
            </td>
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ convertirFechaISOaDDMMYYYY(trabajadores.currentTrabajador.fechaNacimiento) }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ESCOLARIDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.escolaridad }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              EDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ calcularEdad(trabajadores.currentTrabajador.fechaNacimiento) }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              PUESTO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.puesto }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              SEXO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.sexo }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ANTIGUEDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ calcularAntiguedad(trabajadores.currentTrabajador.fechaIngreso) }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              TELÉFONO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.telefono }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ESTADO CIVIL
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.estadoCivil }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              NUM. EMPLEADO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.numeroEmpleado || '-' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Resumen y/o Alteraciones -->
    <div class="w-full">
      <h2 class="mb-1 text-left">La evaluación médica para la aptitud ante el puesto está basada
        en la siguiente información:</h2>
      <table class="tabla-resumen-estudios-aptitud table-auto w-full border-collapse border border-gray-200" :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 1 }">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">INFORMACIÓN Y ESTUDIOS
            </th>
            <th class="w-1/7 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">FECHAS</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">RESUMEN Y/O ALTERACIONES
              ENCONTRADAS</th>
          </tr>
        </thead>
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">HISTORIA CLÍNICA
            </td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ nearestHistoriaClinica ?
              convertirFechaISOaDDMMYYYY(nearestHistoriaClinica.fechaHistoriaClinica) : '-' }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ nearestHistoriaClinica ?
              historiaClinicaResumen : '-' }}</td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">EXPLORACIÓN FÍSICA
            </td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ nearestExploracionFisica ?
              convertirFechaISOaDDMMYYYY(nearestExploracionFisica.fechaExploracionFisica) : '-' }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ nearestExploracionFisica ?
              exploracionFisicaResumen : '-' }}</td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">ADIPOSIDAD CORPORAL
            </td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ nearestExploracionFisica ?
              convertirFechaISOaDDMMYYYY(nearestExploracionFisica.fechaExploracionFisica) : '-' }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ nearestExploracionFisica ?
              adiposidadCorporalResumen : '-' }}</td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">EXAMEN VISUAL</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ nearestExamenVista ?
              convertirFechaISOaDDMMYYYY(nearestExamenVista.fechaExamenVista) : '-' }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ nearestExamenVista ?
              examenVistaResumen : '-' }}</td>
          </tr>
          <tr v-if="nearestAudiometria" class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">AUDIOMETRÍA</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ nearestAudiometria ?
              convertirFechaISOaDDMMYYYY(nearestAudiometria.fechaAudiometria) : '-' }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ nearestAudiometria ?
              audiometriaResumen : '-' }}</td>
          </tr>
          <tr v-if="nearestAntidoping" class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">ANTIDOPING</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ nearestAntidoping ?
              convertirFechaISOaDDMMYYYY(nearestAntidoping.fechaAntidoping) : '-' }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ nearestAntidoping ?
              antidopingResumen : '-' }}</td>
          </tr>
          <tr v-if="nearestTipoSangre" class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">TIPO DE SANGRE</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ nearestTipoSangre ?
              convertirFechaISOaDDMMYYYY(nearestTipoSangre.fechaEstudio) : '-' }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ tipoSangreResumen || '-' }}</td>
          </tr>
          <tr v-if="showEKG" class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">ELECTROCARDIOGRAMA</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ nearestEKG ?
              convertirFechaISOaDDMMYYYY(nearestEKG.fechaEstudio) : '-' }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ ekgResumen || '-' }}</td>
          </tr>
          <tr v-if="showEspirometria" class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">ESPIROMETRIA</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ nearestEspirometria ?
              convertirFechaISOaDDMMYYYY(nearestEspirometria.fechaEstudio) : '-' }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ espirometriaResumen || '-' }}</td>
          </tr>
          <tr v-if="showRayosX" class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">RAYOS X</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ nearestRayosX ?
              convertirFechaISOaDDMMYYYY(nearestRayosX.fechaEstudio) : '-' }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ rayosXResumen || '-' }}</td>
          </tr>
          <tr v-if="showAnalisisLaboratorio" class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">ANÁLISIS DE LABORATORIO</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ nearestAnalisisLaboratorio ?
              convertirFechaISOaDDMMYYYY(nearestAnalisisLaboratorio.fechaEstudio) : '-' }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ analisisLaboratorioResumen || '-' }}</td>
          </tr>
          <tr v-if="nearestEntrevistaPsicologica" class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">ENTREVISTA PSICOLÓGICA</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{
              convertirFechaISOaDDMMYYYY(nearestEntrevistaPsicologica.fechaEntrevistaPsicologica) }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ entrevistaPsicologicaResumen }}</td>
          </tr>
          <tr v-if="nearestTrastornosEstadoAnimo" class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">TRASTORNOS DEL ESTADO DE ÁNIMO</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{
              convertirFechaISOaDDMMYYYY(nearestTrastornosEstadoAnimo.fechaTrastornosEstadoAnimo) }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ trastornosEstadoAnimoResumen }}</td>
          </tr>
          <tr v-if="nearestCuestionarioProdromalBreve" class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">CUESTIONARIO PRODROMAL BREVE</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{
              convertirFechaISOaDDMMYYYY(nearestCuestionarioProdromalBreve.fechaCuestionarioProdromalBreve) }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ cuestionarioProdromalBreveResumen }}</td>
          </tr>
          <tr v-if="nearestTrastornoLimitePersonalidad" class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">TRASTORNO LÍMITE PERSONALIDAD</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{
              convertirFechaISOaDDMMYYYY(nearestTrastornoLimitePersonalidad.fechaTrastornoLimitePersonalidad) }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ trastornoLimitePersonalidadResumen }}</td>
          </tr>
          <tr v-if="formData.formDataAptitud.evaluacionAdicional1" class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(2)"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 2 }">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">{{ formData.formDataAptitud.evaluacionAdicional1.toUpperCase() }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formatDateDDMMYYYY(formData.formDataAptitud.fechaEvaluacionAdicional1) }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formData.formDataAptitud.resultadosEvaluacionAdicional1 }}</td>
          </tr>
          <tr v-else :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 2 }"></tr>
          <tr v-if="formData.formDataAptitud.evaluacionAdicional2" class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(3)"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 3 }">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">{{ formData.formDataAptitud.evaluacionAdicional2.toUpperCase() }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formatDateDDMMYYYY(formData.formDataAptitud.fechaEvaluacionAdicional2) }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formData.formDataAptitud.resultadosEvaluacionAdicional2 }}</td>
          </tr>
          <tr v-else :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 3 }"></tr>
          <tr v-if="formData.formDataAptitud.evaluacionAdicional3" class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(4)"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 4 }">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">{{ formData.formDataAptitud.evaluacionAdicional3.toUpperCase() }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formatDateDDMMYYYY(formData.formDataAptitud.fechaEvaluacionAdicional3) }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formData.formDataAptitud.resultadosEvaluacionAdicional3 }}</td>
          </tr>
          <tr v-else :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 4 }"></tr>
          <tr v-if="formData.formDataAptitud.evaluacionAdicional4" class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(5)"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 5 }">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">{{ formData.formDataAptitud.evaluacionAdicional4.toUpperCase() }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formatDateDDMMYYYY(formData.formDataAptitud.fechaEvaluacionAdicional4) }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formData.formDataAptitud.resultadosEvaluacionAdicional4 }}</td>
          </tr>
          <tr v-else :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 5 }"></tr>
          <tr v-if="formData.formDataAptitud.evaluacionAdicional5" class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(6)"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 6 }">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">{{ formData.formDataAptitud.evaluacionAdicional5.toUpperCase() }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formatDateDDMMYYYY(formData.formDataAptitud.fechaEvaluacionAdicional5) }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formData.formDataAptitud.resultadosEvaluacionAdicional5 }}</td>
          </tr>
          <tr v-else :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 6 }"></tr>
          <tr v-if="formData.formDataAptitud.evaluacionAdicional6" class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(7)"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 7 }">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">{{ formData.formDataAptitud.evaluacionAdicional6.toUpperCase() }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formatDateDDMMYYYY(formData.formDataAptitud.fechaEvaluacionAdicional6) }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formData.formDataAptitud.resultadosEvaluacionAdicional6 }}</td>
          </tr>
          <tr v-else :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 7 }"></tr>
        </tbody>
      </table>
    </div>

    <!-- Aptitud al Puesto -->
    <div class="w-full cursor-pointer" @click="goToStep(8)" 
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 8 }">
      <table class="table-auto w-full border-collapse border border-gray-200 ">
        <thead>
          <tr class="bg-gray-200">
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center" colspan="2">
              BASADO EN LA INFORMACIÓN ANTERIOR SE HA DETERMINADO:
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!formData.formDataAptitud.aptitudPuesto" class="odd:bg-white even:bg-gray-50 cursor-pointer">
            <td class="text-lg sm:text-2xl lg:text-3xl text-center px-2 py-0 sm:py-1 lg:py-2 border border-gray-300 text-gray-700 font-medium P">
              -
            </td>
          </tr>

          <tr v-if="formData.formDataAptitud.aptitudPuesto === 'Apto Sin Restricciones'" class="odd:bg-white even:bg-gray-50 cursor-pointer">
            <td class="text-lg sm:text-2xl lg:text-3xl text-center px-2 py-0 sm:py-1 lg:py-2 border border-gray-300 text-green-600 font-medium">
              {{ trabajadores.currentTrabajador.sexo === 'Femenino' ? 'APTA SIN RESTRICCIONES' : 'APTO SIN RESTRICCIONES' }}
            </td>
          </tr>

          <tr v-if="formData.formDataAptitud.aptitudPuesto === 'Apto Con Precaución'" class="odd:bg-white even:bg-gray-50 cursor-pointer">
            <td class="text-lg sm:text-2xl lg:text-3xl text-center px-2 py-0 sm:py-1 lg:py-2 border border-gray-300 text-amber-600 font-medium">
              {{ trabajadores.currentTrabajador.sexo === 'Femenino' ? 'APTA CON PRECAUCIÓN' : 'APTO CON PRECAUCIÓN' }}
            </td>
          </tr>

          <tr v-if="formData.formDataAptitud.aptitudPuesto === 'Apto Con Restricciones'" class="odd:bg-white even:bg-gray-50 cursor-pointer">
            <td class="text-lg sm:text-2xl lg:text-3xl text-center px-2 py-0 sm:py-1 lg:py-2 border border-gray-300 text-orange-600 font-medium">
              {{ trabajadores.currentTrabajador.sexo === 'Femenino' ? 'APTA CON RESTRICCIONES' : 'APTO CON RESTRICCIONES' }}
            </td>
          </tr>

          <tr v-if="formData.formDataAptitud.aptitudPuesto === 'No Apto'" class="odd:bg-white even:bg-gray-50 cursor-pointer">
            <td class="text-lg sm:text-2xl lg:text-3xl text-center px-2 py-0 sm:py-1 lg:py-2 border border-gray-300 text-red-600 font-medium">
              {{ trabajadores.currentTrabajador.sexo === 'Femenino' ? 'NO APTA' : 'NO APTO' }}
            </td>
          </tr>

          <tr v-if="formData.formDataAptitud.aptitudPuesto === 'Evaluación No Completada'" class="odd:bg-white even:bg-gray-50 cursor-pointer">
            <td class="text-lg sm:text-2xl lg:text-3xl text-center px-2 py-0 sm:py-1 lg:py-2 border border-gray-300 text-gray-700 font-medium">
              EVALUACIÓN NO COMPLETADA
            </td>
          </tr>
        </tbody>

      </table>
    </div>

    <!-- Conclusión y recomendaciones -->
    <div class="w-full">
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center" colspan="2">
              CONCLUSIÓN Y RECOMENDACIONES
            </th>
          </tr>
        </thead>
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 3.9rem;" @click='goToStep(9)'
          :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 9 }">
            <td class="w-1/6 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              Alteraciones a la salud
            </td>
            <td class="text-xs sm:text-sm text-justify px-2 py-0 border border-gray-300">
              {{ formData.formDataAptitud.alteracionesSalud }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 3.9rem;" @click='goToStep(10)'
          :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 10 }">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              Resultados
            </td>
            <td class="text-xs sm:text-sm text-justify px-2 py-0 border border-gray-300">
              {{ formData.formDataAptitud.resultados }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 3.9rem;" @click='goToStep(11)'
          :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 11 }">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              Medidas Preventivas Específicas
            </td>
            <td class="text-xs sm:text-sm text-justify px-2 py-0 border border-gray-300">
              {{ formData.formDataAptitud.medidasPreventivas }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<style scoped>
.tabla-resumen-estudios-aptitud thead th:nth-child(2),
.tabla-resumen-estudios-aptitud tbody td:nth-child(2) {
  white-space: nowrap;
  word-break: normal;
  overflow-wrap: normal;
}

.cursor-pointer {
  cursor: pointer;
}

.visualizador-aptitud div.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-aptitud div.cursor-pointer:hover {
  background-color: #f0f0f0;
}

.visualizador-aptitud tbody tr.cursor-pointer,
.visualizador-aptitud thead tr.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-aptitud tbody tr.cursor-pointer > td,
.visualizador-aptitud tbody tr.cursor-pointer > th,
.visualizador-aptitud thead tr.cursor-pointer > td,
.visualizador-aptitud thead tr.cursor-pointer > th {
  transition: background-color 0.15s ease;
}

.visualizador-aptitud tbody tr.cursor-pointer:hover,
.visualizador-aptitud tbody tr.cursor-pointer:hover > td,
.visualizador-aptitud tbody tr.cursor-pointer:hover > th,
.visualizador-aptitud thead tr.cursor-pointer:hover,
.visualizador-aptitud thead tr.cursor-pointer:hover > td,
.visualizador-aptitud thead tr.cursor-pointer:hover > th {
  background-color: #f0f0f0;
}
</style>

<style>
html.dark-mode .visualizador-aptitud div.cursor-pointer:hover {
  background-color: #475569 !important;
}

html.dark-mode .visualizador-aptitud tbody tr.cursor-pointer:hover,
html.dark-mode .visualizador-aptitud tbody tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-aptitud tbody tr.cursor-pointer:hover > th,
html.dark-mode .visualizador-aptitud thead tr.cursor-pointer:hover,
html.dark-mode .visualizador-aptitud thead tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-aptitud thead tr.cursor-pointer:hover > th {
  background-color: #475569 !important;
}
</style>
