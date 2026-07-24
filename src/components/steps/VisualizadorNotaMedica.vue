<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { calcularEdad, calcularAntiguedad, formatDateDDMMYYYY } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import { useNom024Fields } from '@/composables/useNom024Fields';
import { getNotaMedicaStepMap } from '@/helpers/notaMedicaStepMap';
import { useNotaMedicaSectionsV2 } from '@/composables/useNotaMedicaSectionsV2';
import { legacyStepToSectionIndex } from '@/helpers/notaMedicaSections';
import {
  isPrimeraVezComorbilidadActiva,
  tieneComorbilidadDiagRegistrada,
  fetchMedicoEnfermeraFirmantes,
} from '@/helpers/notaMedicaDiagnosticosSis';
import { computeMuestraConfirmacionFlags } from '@/helpers/confirmacionDiagnostica';
import { useUserStore } from '@/stores/user';
import EstadoDocumentoBadgeAlt from '../badges/EstadoDocumentoBadgeAlt.vue';
import CatalogsAPI from '@/api/CatalogsAPI';
import { formatDerechohabienciaLabels } from '@/helpers/afiliacionCex';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const steps = useStepsStore();
const proveedorSaludStore = useProveedorSaludStore();
const userStore = useUserStore();
const isMX = computed(() => proveedorSaludStore.isMX);
const { isSIRES } = useNom024Fields();
const esMujer = computed(() => trabajadores.currentTrabajador?.sexo === 'Femenino');
const { nmSectionsV2Enabled } = useNotaMedicaSectionsV2();

const stepMap = computed(() =>
  getNotaMedicaStepMap(isSIRES.value, esMujer.value),
);

const resolveNavStep = (legacyStep) => {
  if (legacyStep == null) return 1;
  if (nmSectionsV2Enabled.value) {
    return legacyStepToSectionIndex(legacyStep, isSIRES.value, esMujer.value);
  }
  return legacyStep;
};

const isNavActive = (legacyStep) => {
  if (legacyStep == null) return false;
  return steps.currentStep === resolveNavStep(legacyStep);
};

const navOutlineClass = (legacyStep, soft = false) => {
  if (!isNavActive(legacyStep)) return '';
  return soft
    ? 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md'
    : 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md';
};

const etiquetasRelacionEmbarazo = {
  0: 'Primera Vez',
  1: 'Subsecuente',
};

const etiquetasTrimestreGestacional = {
  1: 'Primero',
  2: 'Segundo',
  3: 'Tercero',
};

const etiquetasGenero = {
  0:'No especificado', 1: 'Masculino', 2: 'Femenino', 3: 'Transgénero',
  4: 'Transexual', 5: 'Travesti', 6: 'Intersexual', 88: 'Otro',
};

const afiliacionLabelByCode = ref({});

function formatDerechohabiencia(valor) {
  return formatDerechohabienciaLabels(valor, afiliacionLabelByCode.value);
}

async function loadAfiliacionLabels() {
  try {
    const { data } = await CatalogsAPI.listCatalog('cat_afiliacion', 500, false);
    const map = {};
    for (const entry of Array.isArray(data) ? data : []) {
      map[String(entry.code)] = entry.description || entry.code;
    }
    afiliacionLabelByCode.value = map;
  } catch {
    afiliacionLabelByCode.value = {};
  }
}

const goToStep = (stepNumber) => {
  steps.goToStep(resolveNavStep(stepNumber));
};

// Helper functions para extraer código y descripción del formato "CODE - DESCRIPTION"
const extractCode = (value) => {
  if (!value) return '';
  // Si ya es solo código (no tiene " - "), retornar tal cual
  if (!value.includes(' - ')) return value;
  // Extraer código antes de " - "
  return value.split(' - ')[0].trim();
};

const extractDescription = (value) => {
  if (!value) return '';
  // Si no tiene " - ", retornar vacío (solo código)
  if (!value.includes(' - ')) return '';
  // Extraer descripción después de " - "
  return value.split(' - ').slice(1).join(' - ').trim();
};

const nm = computed(() => formData.formDataNotaMedica);

// Confirmación diagnóstica: flags normativos (tipoPersonal + catálogo + edad/temporal)
const muestraConfirmacionDiagnostica1 = ref(false);
const muestraConfirmacionDiagnostica2 = ref(false);
const muestraConfirmacionDiagnostica3 = ref(false);

const refreshConfirmacionFlags = async () => {
  const trabajador = trabajadores.currentTrabajador;
  if (!trabajador) return;
  const fechaNota = nm.value.fechaNotaMedica
    ? new Date(nm.value.fechaNotaMedica)
    : new Date();
  const { medicoFirmante, enfermeraFirmante } = await fetchMedicoEnfermeraFirmantes(
    userStore.user?._id,
  );
  const flags = await computeMuestraConfirmacionFlags({
    formData: nm.value,
    trabajadorFechaNacimiento: trabajador.fechaNacimiento
      ? new Date(trabajador.fechaNacimiento)
      : fechaNota,
    fechaNotaMedica: fechaNota,
    medicoFirmante,
    enfermeraFirmante,
  });
  muestraConfirmacionDiagnostica1.value = flags.confirmacion1;
  muestraConfirmacionDiagnostica2.value = flags.confirmacion2;
  muestraConfirmacionDiagnostica3.value = flags.confirmacion3;
};

onMounted(() => {
  void refreshConfirmacionFlags();
  void loadAfiliacionLabels();
});

watch(nm, () => {
  void refreshConfirmacionFlags();
}, { deep: true });

const muestraDiagnostico2 = computed(() =>
  tieneComorbilidadDiagRegistrada(
    nm.value.primeraVezDiagnostico2,
    nm.value.codigoCIEDiagnostico2,
  ),
);

const muestraDiagnostico3 = computed(() =>
  tieneComorbilidadDiagRegistrada(
    nm.value.primeraVezDiagnostico3,
    nm.value.codigoCIEDiagnostico3,
  ),
);

</script>

<template>
  <div
    class="visualizador-nota-medica flex flex-wrap justify-start gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto">

    <!-- Badge, Fecha y Motivo del Examen -->
    <div class="flex flex-wrap md:flex-nowrap w-full gap-4 items-center">
      <EstadoDocumentoBadgeAlt 
        v-if="isMX"
        :estado="formData.formDataNotaMedica.estado" 
        :fechaFinalizacion="formData.formDataNotaMedica.fechaFinalizacion" 
        :finalizadoPor="formData.formDataNotaMedica.finalizadoPor"
        :fechaAnulacion="formData.formDataNotaMedica.fechaAnulacion"
        :anuladoPor="formData.formDataNotaMedica.anuladoPor"
        :razonAnulacion="formData.formDataNotaMedica.razonAnulacion"
        class="mt-1 flex-shrink-0"
      />
      <!-- Fecha y Motivo del Examen -->
      <div
        class="w-full md:w-auto md:flex-1 flex flex-wrap gap-2 justify-start md:justify-end text-sm sm:text-base cursor-pointer"
        :class="navOutlineClass(1)"
        @click="goToStep(1)">
        <p class="flex-1 md:flex-none font-light">Inicial ( <span class="font-medium">{{ formData.formDataNotaMedica.tipoNota === 'Inicial' ? 'X' :
          '&nbsp;' }}</span> )</p>
        <p class="flex-1 md:flex-none font-light">Seguimiento ( <span class="font-medium">{{ formData.formDataNotaMedica.tipoNota === 'Seguimiento' ? 'X' :
          '&nbsp;' }}</span> )</p>
        <p class="flex-1 md:flex-none font-light">Alta ( <span class="font-medium">{{ formData.formDataNotaMedica.tipoNota === 'Alta' ?
          'X' : '&nbsp;' }}</span> )</p>
        <p class="w-full md:w-auto ml-4 font-light">Fecha: <span class="font-medium">{{
          formatDateDDMMYYYY(formData.formDataNotaMedica.fechaNotaMedica) }}</span></p>
      </div>
    </div>

    <!-- Nombre y teléfono de trabajador -->
    <div class="w-full flex justify-between items-center">
      <div class="flex flex-col">
        <p class="text-justify text-2xl font-medium">
                        {{ formatNombreCompleto(trabajadores.currentTrabajador) }}
        </p>
      </div>
      <p class="text-justify font-light">
      Teléfono: <span class="font-medium">{{ trabajadores.currentTrabajador.telefono || 'No Disponible' }}</span>
      </p>
    </div>

    <!-- Datos del Trabajador  -->
    <div class="w-full mb-1">
      <p class="text-justify font-light">
        Se trata de <span class="font-medium">{{ trabajadores.currentTrabajador.sexo === 'Masculino' ? 'un trabajador' : 'una trabajadora' }}</span> de 
        <span class="font-medium">{{ calcularEdad(trabajadores.currentTrabajador.fechaNacimiento) }} años</span> de edad, que labora en la empresa 
        <span class="font-medium">{{ empresas.currentEmpresa.nombreComercial }}</span>, ocupando el puesto de 
        <span class="font-medium">{{ trabajadores.currentTrabajador.puesto }}</span>, con escolaridad 
        <span class="font-medium">{{ trabajadores.currentTrabajador.escolaridad }}</span><template v-if="calcularAntiguedad(trabajadores.currentTrabajador.fechaIngreso) !== '-'"> y una antigüedad de 
        <span class="font-medium">{{ calcularAntiguedad(trabajadores.currentTrabajador.fechaIngreso) }}</span></template>. Estado civil: 
        <span class="font-medium">{{ trabajadores.currentTrabajador.estadoCivil }}</span>.
        <span v-if="trabajadores.currentTrabajador.numeroEmpleado"> Número de empleado: <span class="font-medium">{{ trabajadores.currentTrabajador.numeroEmpleado }}</span></span>.
      </p>

    </div>

    <!-- Motivo de consulta -->
    <div v-if="formData.formDataNotaMedica.motivoConsulta" 
      class="w-full mb-1 cursor-pointer" 
      :class="navOutlineClass(2)" @click="goToStep(2)">
      <p class="text-justify font-medium">
        Motivo de consulta: <span class="font-light">{{ formData.formDataNotaMedica.motivoConsulta }}</span> 
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="navOutlineClass(2, true)" @click="goToStep(2)">
      + Agregar Motivo de Consulta
    </div>

    <!-- Género y Derechohabiencia (SIRES only) -->
    <div v-if="isSIRES" class="w-full mb-1 cursor-pointer"
      :class="navOutlineClass(stepMap.genero)"
      @click="goToStep(stepMap.genero)">
      <p class="text-justify font-medium">
        <template v-if="formData.formDataNotaMedica.genero !== undefined">
          Género: <span class="font-light">{{ etiquetasGenero[formData.formDataNotaMedica.genero] || formData.formDataNotaMedica.genero }}</span>
        </template>
        <template v-else>
          <span class="text-gray-500 italic font-normal">+ Género</span>
        </template>
        <template v-if="formData.formDataNotaMedica.derechohabiencia && formData.formDataNotaMedica.derechohabiencia !== '0'">
          &nbsp;&nbsp;| &nbsp;&nbsp;Derechohabiencia: <span class="font-light">{{ formatDerechohabiencia(formData.formDataNotaMedica.derechohabiencia) }}</span>
        </template>
      </p>
    </div>

    <!-- Antecedentes -->
    <div v-if="formData.formDataNotaMedica.antecedentes" 
      class="w-full mb-1 cursor-pointer" 
      :class="navOutlineClass(stepMap.antecedentes)" @click="goToStep(stepMap.antecedentes)">
      <p class="text-justify font-medium">
        Antecedentes: <span class="font-light">{{ formData.formDataNotaMedica.antecedentes }}</span> 
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="navOutlineClass(stepMap.antecedentes, true)" @click="goToStep(stepMap.antecedentes)">+ Agregar Antecedentes</div>

    <!-- Exploración Física -->
    <div v-if="formData.formDataNotaMedica.exploracionFisica" class="w-full mb-1 cursor-pointer" :class="navOutlineClass(stepMap.exploracion)" @click="goToStep(stepMap.exploracion)">
      <p class="text-justify font-medium">
        Exploración Física: <span class="font-light">{{ formData.formDataNotaMedica.exploracionFisica }}</span> 
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="navOutlineClass(stepMap.exploracion, true)" @click="goToStep(stepMap.exploracion)">+ Agregar Exploración Física</div>

    <!-- Signos Vitales -->
    <div v-if="formData.formDataNotaMedica.tensionArterialSistolica || formData.formDataNotaMedica.tensionArterialDiastolica || formData.formDataNotaMedica.frecuenciaCardiaca || formData.formDataNotaMedica.frecuenciaRespiratoria || formData.formDataNotaMedica.temperatura || formData.formDataNotaMedica.saturacionOxigeno" class="w-full mb-1 cursor-pointer" :class="navOutlineClass(stepMap.signos)"
    @click="goToStep(stepMap.signos)">
      <p class="text-justify font-medium">
      Signos Vitales: 
      <template v-if="formData.formDataNotaMedica.tensionArterialSistolica || formData.formDataNotaMedica.tensionArterialDiastolica">
        &nbsp;&nbsp;&nbsp;&nbsp;TA: <span class="font-light">{{ formData.formDataNotaMedica.tensionArterialSistolica }}/{{ formData.formDataNotaMedica.tensionArterialDiastolica }} mm/Hg &nbsp;&nbsp;|</span>
      </template>
      <template v-if="formData.formDataNotaMedica.frecuenciaCardiaca">
        &nbsp;&nbsp;&nbsp;FC: <span class="font-light">{{ formData.formDataNotaMedica.frecuenciaCardiaca }} lpm &nbsp;&nbsp;|</span>
      </template>
      <template v-if="formData.formDataNotaMedica.frecuenciaRespiratoria">
        &nbsp;&nbsp;&nbsp;FR: <span class="font-light">{{ formData.formDataNotaMedica.frecuenciaRespiratoria }} rpm &nbsp;&nbsp;|</span>
      </template>
      <template v-if="formData.formDataNotaMedica.temperatura">
        &nbsp;&nbsp;&nbsp;Temp: <span class="font-light">{{ formData.formDataNotaMedica.temperatura }} °C &nbsp;&nbsp;|</span>
      </template>
      <template v-if="formData.formDataNotaMedica.saturacionOxigeno">
        &nbsp;&nbsp;&nbsp;SatO2: <span class="font-light">{{ formData.formDataNotaMedica.saturacionOxigeno }} %</span>
      </template>
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="navOutlineClass(stepMap.signos, true)" @click="goToStep(stepMap.signos)">+ Signos Vitales</div>

    <!-- Somatometría (SIRES only) -->
    <div v-if="isSIRES" class="w-full mb-1 cursor-pointer"
      :class="navOutlineClass(stepMap.somatometria)"
      @click="goToStep(stepMap.somatometria)">
      <p class="text-justify font-medium">
        <template v-if="formData.formDataNotaMedica.peso && formData.formDataNotaMedica.peso !== 999">
          Peso: <span class="font-light">{{ formData.formDataNotaMedica.peso }} kg</span> &nbsp;|
        </template>
        <template v-if="formData.formDataNotaMedica.talla && formData.formDataNotaMedica.talla !== 999">
          &nbsp;Talla: <span class="font-light">{{ formData.formDataNotaMedica.talla }} cm</span> &nbsp;|
        </template>
        <template v-if="formData.formDataNotaMedica.indiceMasaCorporal">
          &nbsp;IMC: <span class="font-light">{{ formData.formDataNotaMedica.indiceMasaCorporal }} ({{ formData.formDataNotaMedica.categoriaIMC }})</span> &nbsp;|
        </template>
        <template v-if="formData.formDataNotaMedica.circunferenciaCintura && formData.formDataNotaMedica.circunferenciaCintura !== 0">
          &nbsp;Cintura: <span class="font-light">{{ formData.formDataNotaMedica.circunferenciaCintura }} cm</span>
        </template>
        <template v-if="(!formData.formDataNotaMedica.peso || formData.formDataNotaMedica.peso === 999) && (!formData.formDataNotaMedica.talla || formData.formDataNotaMedica.talla === 999) && (!formData.formDataNotaMedica.circunferenciaCintura || formData.formDataNotaMedica.circunferenciaCintura === 0)">
          <span class="text-gray-500 italic font-normal">+ Somatometría</span>
        </template>
      </p>
    </div>

    <!-- Glucemia (SIRES only) -->
    <div v-if="isSIRES" class="w-full mb-1 cursor-pointer"
      :class="navOutlineClass(stepMap.glucemia)"
      @click="goToStep(stepMap.glucemia)">
      <p class="text-justify font-medium">
        <template v-if="formData.formDataNotaMedica.glucemia && formData.formDataNotaMedica.glucemia !== 0">
          Glucemia: <span class="font-light">{{ formData.formDataNotaMedica.glucemia }} mg/dl</span>
          <template v-if="formData.formDataNotaMedica.tipoMedicion !== -1">
            &nbsp;| <span class="font-light">{{ formData.formDataNotaMedica.tipoMedicion === 1 ? 'En ayunas' : 'Sin ayuno' }}</span>
          </template>
        </template>
        <template v-else>
          <span class="text-gray-500 italic font-normal">+ Glucemia</span>
        </template>
      </p>
    </div>

    <!-- Embarazo (SIRES + mujer) -->
    <div
      v-if="isSIRES && stepMap.embarazo"
      class="w-full mb-1 cursor-pointer"
      :class="navOutlineClass(stepMap.embarazo)"
      @click="goToStep(stepMap.embarazo)"
    >
      <template v-if="formData.formDataNotaMedica.relacionTemporalEmbarazo != null && formData.formDataNotaMedica.relacionTemporalEmbarazo !== -1">
        <p class="text-justify font-medium mb-1">
          Relación Temporal Embarazo:
          <span class="font-light">{{ etiquetasRelacionEmbarazo[formData.formDataNotaMedica.relacionTemporalEmbarazo] || formData.formDataNotaMedica.relacionTemporalEmbarazo }}</span>
        </p>
        <p
          v-if="formData.formDataNotaMedica.trimestreGestacional != null && formData.formDataNotaMedica.trimestreGestacional !== -1"
          class="text-justify font-medium mb-1"
        >
          Trimestre Gestacional:
          <span class="font-light">{{ etiquetasTrimestreGestacional[formData.formDataNotaMedica.trimestreGestacional] || formData.formDataNotaMedica.trimestreGestacional }}</span>
        </p>
      </template>
      <template v-else>
        <p class="text-justify font-medium">
          <span class="text-gray-500 italic font-normal">+ Embarazo</span>
        </p>
      </template>
    </div>

    <!-- Diagnóstico Principal -->
    <div 
      v-if="formData.formDataNotaMedica.codigoCIE10Principal || formData.formDataNotaMedica.relacionTemporal !== undefined && formData.formDataNotaMedica.relacionTemporal !== null || (formData.formDataNotaMedica.codigosCIE10Complementarios && formData.formDataNotaMedica.codigosCIE10Complementarios.length > 0) || formData.formDataNotaMedica.confirmacionDiagnostica" 
      class="w-full mb-1 cursor-pointer" 
      :class="navOutlineClass(stepMap.diagnostico)" 
      @click="goToStep(stepMap.diagnostico)"
    >
    
      <!-- Relación Temporal (SIRES) -->
      <p v-if="isSIRES && formData.formDataNotaMedica.relacionTemporal !== undefined && formData.formDataNotaMedica.relacionTemporal !== null" class="text-justify font-medium mb-1">
        Relación Temporal: <span class="font-light">{{ formData.formDataNotaMedica.relacionTemporal === 0 ? 'Primera Vez' : 'Subsecuente' }}</span>
      </p>

      <!-- CIE-10 Principal -->
      <p v-if="formData.formDataNotaMedica.codigoCIE10Principal" class="text-justify font-medium mb-1">
        Diagnóstico Principal: <span class="font-light">{{ extractDescription(formData.formDataNotaMedica.codigoCIE10Principal) || extractCode(formData.formDataNotaMedica.codigoCIE10Principal) }}</span>
      </p>
      
      <!-- CIE-10 Secundarios -->
      <p v-if="formData.formDataNotaMedica.codigosCIE10Complementarios && formData.formDataNotaMedica.codigosCIE10Complementarios.length > 0" class="font-medium mb-1">
        Diagnosticos relacionados al diagnostico principal: 
        <span class="font-light text-justify">
          <template v-for="(codigo, index) in formData.formDataNotaMedica.codigosCIE10Complementarios" :key="index">
            {{ extractDescription(codigo) || extractCode(codigo) }}<span v-if="index < formData.formDataNotaMedica.codigosCIE10Complementarios.length - 1">, </span>
          </template>
        </span>
      </p>

      <!-- Confirmación Diagnóstica -->
      <p v-if="muestraConfirmacionDiagnostica1 && formData.formDataNotaMedica.confirmacionDiagnostica !== undefined" class="text-justify font-medium mb-1">
        Confirmación Diagnóstica: <span class="font-light">{{ formData.formDataNotaMedica.confirmacionDiagnostica ? 'Sí' : 'No' }}</span>
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="navOutlineClass(stepMap.diagnostico, true)" @click="goToStep(stepMap.diagnostico)">+ Agregar Diagnóstico Principal</div>

    <!-- Diagnóstico Secundario (Step 7) -->
    <div 
      v-if="muestraDiagnostico2"
      class="w-full mb-1 cursor-pointer" 
      :class="navOutlineClass(stepMap.comorbilidad2)" 
      @click="goToStep(stepMap.comorbilidad2)"
    >
      <!-- Primera vez diagnóstico 2 (SIRES) -->
      <p v-if="isSIRES && isPrimeraVezComorbilidadActiva(formData.formDataNotaMedica.primeraVezDiagnostico2)" class="text-justify font-medium mb-1">
        Primera vez diagnóstico 2: <span class="font-light">{{ formData.formDataNotaMedica.primeraVezDiagnostico2 === 1 ? 'Sí' : 'No' }}</span>
      </p>

      <!-- Diagnóstico 2 (Comorbilidad clínica) -->
      <p v-if="formData.formDataNotaMedica.codigoCIEDiagnostico2" class="text-justify font-medium mb-1">
        Diagnóstico 2 (Comorbilidad clínica): <span class="font-light">{{ extractDescription(formData.formDataNotaMedica.codigoCIEDiagnostico2) || extractCode(formData.formDataNotaMedica.codigoCIEDiagnostico2) }}</span>
      </p>

      <!-- Confirmación Diagnóstica 2 -->
      <p v-if="muestraConfirmacionDiagnostica2 && formData.formDataNotaMedica.confirmacionDiagnostica2 !== undefined" class="text-justify font-medium mb-1">
        Confirmación Diagnóstica 2: <span class="font-light">{{ formData.formDataNotaMedica.confirmacionDiagnostica2 ? 'Sí' : 'No' }}</span>
      </p>

      <!-- Texto Libre Complementario -->
      <p v-if="formData.formDataNotaMedica.diagnosticoTexto || formData.formDataNotaMedica.diagnostico" class="text-justify font-medium">
        <template v-if="formData.formDataNotaMedica.diagnosticoTexto">
          Descripción complementaria: <span class="font-light">{{ formData.formDataNotaMedica.diagnosticoTexto }}</span>
        </template>
        <template v-else-if="formData.formDataNotaMedica.diagnostico">
          IDX: <span class="font-light">{{ formData.formDataNotaMedica.diagnostico.toUpperCase() }}</span>
        </template>
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="navOutlineClass(stepMap.comorbilidad2, true)" @click="goToStep(stepMap.comorbilidad2)">+ Agregar Diagnóstico Secundario</div>

    <!-- Diagnóstico 3 (Step 8) -->
    <div 
      v-if="muestraDiagnostico3"
      class="w-full mb-1 cursor-pointer"
      :class="navOutlineClass(stepMap.comorbilidad3)"
      @click="goToStep(stepMap.comorbilidad3)"
    >
      <p v-if="isSIRES && isPrimeraVezComorbilidadActiva(formData.formDataNotaMedica.primeraVezDiagnostico3)" class="text-justify font-medium mb-1">
        Primera vez diagnóstico 3: <span class="font-light">{{ formData.formDataNotaMedica.primeraVezDiagnostico3 === 1 ? 'Sí' : 'No' }}</span>
      </p>
      <p v-if="formData.formDataNotaMedica.codigoCIEDiagnostico3" class="text-justify font-medium mb-1">
        Diagnóstico 3 (Comorbilidad clínica): <span class="font-light">{{ extractDescription(formData.formDataNotaMedica.codigoCIEDiagnostico3) || extractCode(formData.formDataNotaMedica.codigoCIEDiagnostico3) }}</span>
      </p>
      <p v-if="muestraConfirmacionDiagnostica3 && formData.formDataNotaMedica.confirmacionDiagnostica3 !== undefined" class="text-justify font-medium mb-1">
        Confirmación Diagnóstica 3: <span class="font-light">{{ formData.formDataNotaMedica.confirmacionDiagnostica3 ? 'Sí' : 'No' }}</span>
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="navOutlineClass(stepMap.comorbilidad3, true)" @click="goToStep(stepMap.comorbilidad3)">+ Agregar Diagnóstico 3</div>

    <!-- Tratamiento -->
    <div 
      v-if="formData.formDataNotaMedica.tratamiento && formData.formDataNotaMedica.tratamiento.length > 0"
      class="w-full mb-1 cursor-pointer"
      :class="navOutlineClass(stepMap.tratamiento)"
      @click="goToStep(stepMap.tratamiento)"
    >
      <p class="text-justify font-medium">
        TX:
        <span class="font-light block mt-1">
          <div 
            v-for="(item, index) in formData.formDataNotaMedica.tratamiento" 
            :key="index" 
            class="ml-4 relative"
          >
            <span class="absolute left-0">{{ index + 1 }}.</span>
            <span class="block pl-4 font-medium">{{ item }}</span>
          </div>
        </span>
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="navOutlineClass(stepMap.tratamiento, true)" @click="goToStep(stepMap.tratamiento)">+ Agregar Tratamiento</div>

    <!-- Recomendaciones -->
    <div 
      v-if="formData.formDataNotaMedica.recomendaciones && formData.formDataNotaMedica.recomendaciones.length > 0"
      class="w-full mb-1 cursor-pointer"
      :class="navOutlineClass(stepMap.recomendaciones)"
      @click="goToStep(stepMap.recomendaciones)"
    >
      <p class="text-justify font-medium">
      Recomendaciones:
      <span class="font-light block mt-1">
        <div 
        v-for="(item, index) in formData.formDataNotaMedica.recomendaciones" 
        :key="index" 
        class="ml-4 relative"
        >
        <span class="absolute left-0">{{ String.fromCharCode(97 + index) }}.</span>
        <span class="block pl-4">{{ item }}</span>
        </div>
      </span>
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="navOutlineClass(stepMap.recomendaciones, true)" @click="goToStep(stepMap.recomendaciones)">+ Agregar Recomendaciones</div>

    <!-- Observaciones -->
    <div v-if="formData.formDataNotaMedica.observaciones" 
      class="w-full mb-1 cursor-pointer" 
      :class="navOutlineClass(stepMap.observaciones)" @click="goToStep(stepMap.observaciones)">
      <p class="text-justify font-medium">
        Observaciones: <span class="font-light">{{ formData.formDataNotaMedica.observaciones }}</span> 
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="navOutlineClass(stepMap.observaciones, true)" @click="goToStep(stepMap.observaciones)">+ Agregar Observaciones</div>

  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  background-color: #f0f0f0;
  /* Cambia el color según tu diseño */
}

html.dark-mode .visualizador-nota-medica .cursor-pointer:hover {
  background-color: #475569 !important;
  color: #f8fafc !important;
}
</style>
