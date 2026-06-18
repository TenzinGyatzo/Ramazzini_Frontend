<script setup>
import { ref, watch, computed } from 'vue';
import { formatDateDDMMYYYY } from '@/helpers/dates';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { calcularEdad } from '@/helpers/dates';
import DocumentosAPI from '@/api/DocumentosAPI';
import { useMedicoFirmanteStore } from '@/stores/medicoFirmante';
import { useUserStore } from '@/stores/user';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { formatearTituloYNombreFirmante } from '@/helpers/nombres';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const steps = useStepsStore();
const medicoFirmanteStore = useMedicoFirmanteStore();
const userStore = useUserStore();
const proveedorSaludStore = useProveedorSaludStore();

const nombreCompletoMedico = computed(() => {
  const medico = medicoFirmanteStore.medicoFirmante;
  if (!medico) return '';
  return formatearTituloYNombreFirmante(medico);
});

const user = computed(() => userStore.user);
const proveedorSalud = computed(() => proveedorSaludStore.proveedorSalud);

watch(
  () => userStore.user,
  (currentUser) => {
    if (currentUser?._id) {
      medicoFirmanteStore.loadMedicoFirmante(currentUser._id);
    }
  },
  { immediate: true }
);

const goToStep = (stepNumber) => {
  steps.goToStep(stepNumber);
};

// Utilidad opcional para mejorar formato
function formatearCampo(campo) {
  const palabras = campo.replace(/([A-Z])/g, ' $1').split(' ');
  return palabras.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

// Función para formatear el grado de salud en mayúsculas
function getGradoSaludFormateado(gradoSalud) {
  const mapeoGradoSalud = {
    'Bueno': 'BUEN',
    'Óptimo': 'ÓPTIMO',
    'Regular': 'REGULAR',
    'Malo': 'MAL'
  };
  
  return mapeoGradoSalud[gradoSalud] || gradoSalud;
}

</script>

<template>
  <div
    class="visualizador-certificado-expedito flex flex-wrap justify-start gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto">

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
          formatDateDDMMYYYY(formData.formDataCertificadoExpedito.fechaCertificadoExpedito) }}</span></p>
      </div>
    </div>

    <!-- Certificado -->
     <div class="w-full mb-4">
      <p class="text-justify font-light">
        {{ proveedorSalud.pais === 'MX'
          ? medicoFirmanteStore.medicoFirmante.tituloProfesional === 'Dra.'
            ? 'La suscrita Médica Cirujano, con cédula profesional número '
            : 'El suscrito Médico Cirujano, con cédula profesional número '
          : proveedorSalud.pais === 'GT'
          ? medicoFirmanteStore.medicoFirmante.tituloProfesional === 'Dra.'
            ? 'La suscrita Médica Cirujano, con colegiado activo número '
            : 'El suscrito Médico Cirujano, con colegiado activo número '
          : medicoFirmanteStore.medicoFirmante.tituloProfesional === 'Dra.'
            ? 'La suscrita Médica Cirujano, con registro profesional número '
            : 'El suscrito Médico Cirujano, con registro profesional número ' }}
        <span class="font-medium">{{ medicoFirmanteStore.medicoFirmante.numeroCedulaProfesional }}</span>. 

        <template v-if="medicoFirmanteStore.medicoFirmante.especialistaSaludTrabajo === 'Si'">
          Especialista en Medicina del Trabajo,
        </template>
        <template v-else>
          Con formación en Medicina y dedicado a la práctica en el ámbito de la salud laboral,
        </template>

        <span class="font-medium">
          {{ nombreCompletoMedico }}
        </span><span v-if="medicoFirmanteStore.medicoFirmante.especialistaSaludTrabajo === 'Si'">,</span><span v-else>. </span>

        <template v-if="medicoFirmanteStore.medicoFirmante.especialistaSaludTrabajo === 'Si'">
          legalmente <span v-if="medicoFirmanteStore.medicoFirmante.tituloProfesional === 'Dr.'">autorizado</span> <span v-else>autorizada</span> {{ proveedorSalud.pais === 'MX' ? 'por la Dirección General de Profesiones ' : '' }}para ejercer la Especialidad en Medicina del Trabajo con {{ proveedorSalud.pais === 'MX' ? 'cédula profesional' : 'registro de especialidad' }} número 
          <span class="font-medium">{{ medicoFirmanteStore.medicoFirmante.numeroCedulaEspecialista }}</span>.
        </template>

        <template v-if="medicoFirmanteStore.medicoFirmante.nombreCredencialAdicional && medicoFirmanteStore.medicoFirmante.numeroCredencialAdicional">
          {{ medicoFirmanteStore.medicoFirmante.nombreCredencialAdicional }} con número 
          <span class="font-medium">{{ medicoFirmanteStore.medicoFirmante.numeroCredencialAdicional }}</span>.
        </template>

      </p>
     </div>

     <div class="w-full mb-4">
        <h1 class="text-center text-4xl tracking-[.25em]">CERTIFICA</h1>
     </div>

     <div v-if="formData.formDataCertificadoExpedito.fechaCertificadoExpedito" class="w-full">
        <p class="text-justify font-light">
          Que, habiendo practicado reconocimiento médico en esta fecha, {{ proveedorSalud.pais === 'GT' 
            ? ' '
            : (trabajadores.currentTrabajador.sexo === 'Femenino' ? 'a la' : 'al') + ' C. ' }}
          <span class="font-medium">{{ trabajadores.currentTrabajador.nombre + ' ' + trabajadores.currentTrabajador.primerApellido + ' ' + trabajadores.currentTrabajador.segundoApellido }}</span> 
          de <span class="font-medium">{{ calcularEdad(trabajadores.currentTrabajador.fechaNacimiento) }}</span> años de edad. Concluyo que:
        </p>
     </div>

     <div v-else class="w-full">
        <p class="text-justify font-light">
          Que, habiendo practicado reconocimiento médico en esta fecha, {{ proveedorSalud.pais === 'GT' 
            ? ' '
            : (trabajadores.currentTrabajador.sexo === 'Femenino' ? 'a la' : 'al') + ' C. ' }}
          <span class="font-medium">{{ trabajadores.currentTrabajador.nombre + ' ' + trabajadores.currentTrabajador.primerApellido + ' ' + trabajadores.currentTrabajador.segundoApellido }}</span> 
          de <span class="font-medium">{{ calcularEdad(trabajadores.currentTrabajador.fechaNacimiento) }}</span> años de edad. Concluyo que:
        </p>
     </div>

     <!-- Cuerpo del certificado -->
     <div v-if="formData.formDataCertificadoExpedito.cuerpoCertificado" class="w-full cursor-pointer"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 2 }"
      @click="goToStep(2)"
      >
        <p class="text-justify font-medium">
            {{ formData.formDataCertificadoExpedito.cuerpoCertificado }}
        </p>
     </div>
     <div v-else class="w-full text-center cursor-pointer text-gray-500 italic" :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 2 }" @click="goToStep(2)">+ Agregar cuerpo del certificado</div>

      <!-- Signos Vitales -->
      <div v-if="formData.formDataCertificadoExpedito.tensionArterialSistolica || formData.formDataCertificadoExpedito.tensionArterialDiastolica || formData.formDataCertificadoExpedito.frecuenciaCardiaca || formData.formDataCertificadoExpedito.frecuenciaRespiratoria || formData.formDataCertificadoExpedito.temperaturaCorporal" class="w-full mb-1 cursor-pointer" :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 3 }"
      @click="goToStep(3)">
        <p class="text-center font-medium">
        <template v-if="formData.formDataCertificadoExpedito.tensionArterialSistolica || formData.formDataCertificadoExpedito.tensionArterialDiastolica">
          &nbsp;&nbsp;&nbsp;&nbsp;TA: <span class="font-light">{{ formData.formDataCertificadoExpedito.tensionArterialSistolica }}/{{ formData.formDataCertificadoExpedito.tensionArterialDiastolica }} mm/Hg &nbsp;&nbsp;|</span>
        </template>
        <template v-if="formData.formDataCertificadoExpedito.frecuenciaCardiaca">
          &nbsp;&nbsp;&nbsp;FC: <span class="font-light">{{ formData.formDataCertificadoExpedito.frecuenciaCardiaca }} lpm &nbsp;&nbsp;|</span>
        </template>
        <template v-if="formData.formDataCertificadoExpedito.frecuenciaRespiratoria">
          &nbsp;&nbsp;&nbsp;FR: <span class="font-light">{{ formData.formDataCertificadoExpedito.frecuenciaRespiratoria }} rpm &nbsp;&nbsp;|</span>
        </template>
        <template v-if="formData.formDataCertificadoExpedito.temperaturaCorporal">
          &nbsp;&nbsp;&nbsp;Temp: <span class="font-light">{{ formData.formDataCertificadoExpedito.temperaturaCorporal }} °C &nbsp;&nbsp;</span>
        </template>
        </p>
      </div>
      <div v-else class="w-full text-center cursor-pointer text-gray-500 italic" :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 3 }" @click="goToStep(3)">+ Agregar Signos Vitales</div>

      <!-- Somatometría -->
      <div v-if="formData.formDataCertificadoExpedito.peso || formData.formDataCertificadoExpedito.altura || formData.formDataCertificadoExpedito.indiceMasaCorporal" class="w-full mb-1 cursor-pointer" :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 4 }"
      @click="goToStep(4)">
        <p class="text-center font-medium">
        <template v-if="formData.formDataCertificadoExpedito.peso">
          &nbsp;&nbsp;&nbsp;&nbsp;Peso: <span class="font-light">{{ formData.formDataCertificadoExpedito.peso }} kg &nbsp;&nbsp;|</span>
        </template>
        <template v-if="formData.formDataCertificadoExpedito.altura" >
          &nbsp;&nbsp;&nbsp;Altura: <span class="font-light">{{ formData.formDataCertificadoExpedito.altura }} cm &nbsp;&nbsp;|</span>
        </template>
        <template v-if="formData.formDataCertificadoExpedito.indiceMasaCorporal">
          &nbsp;&nbsp;&nbsp;IMC: <span class="font-light">{{ formData.formDataCertificadoExpedito.indiceMasaCorporal }} &nbsp;&nbsp;</span>
        </template>
        </p>
      </div>
      <div v-else class="w-full text-center cursor-pointer text-gray-500 italic" :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 4 }" @click="goToStep(4)">+ Agregar Somatometría</div>

     <div class="w-full">
        <p class="text-justify">
            Por lo anterior, se establece que <span v-if="proveedorSalud.pais !== 'GT'">{{ trabajadores.currentTrabajador.sexo === 'Masculino' ? 'el' : 'la' }} C. </span><strong>{{ trabajadores.currentTrabajador.nombre + ' ' + trabajadores.currentTrabajador.primerApellido + ' ' + trabajadores.currentTrabajador.segundoApellido + ' ' }}</strong><span v-if="proveedorSalud.pais === 'GT' && trabajadores.currentTrabajador.sexo === 'Femenino'"> </span><span class="cursor-pointer" :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 5 }" @click="goToStep(5)">{{ formData.formDataCertificadoExpedito.impedimentosFisicos ? formData.formDataCertificadoExpedito.impedimentosFisicos : '[DESCRIPCIÓN DE IMPEDIMENTOS FÍSICOS]' }}</span> <span class="cursor-pointer" :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 6 }" @click="goToStep(6)">{{ formData.formDataCertificadoExpedito.gradoSalud ? `y se encuentra actualmente en ${getGradoSaludFormateado(formData.formDataCertificadoExpedito.gradoSalud)} estado de salud.` : '[GRADO DE SALUD]' }}</span> Este certificado de salud no implica ningún tipo de garantía de que <span>{{ trabajadores.currentTrabajador.sexo === 'Masculino' ? 'el trabajador' : 'la trabajadora' }}</span> no se lesionará o enfermará en el futuro.
        </p>
     </div>

     <!-- Aptitud -->
     <div v-if="formData.formDataCertificadoExpedito.aptitudPuesto" class="w-full cursor-pointer"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 7 }"
      @click="goToStep(7)"
      >
        <p class="text-justify font-medium">
            {{ formData.formDataCertificadoExpedito.aptitudPuesto.toUpperCase() }} para laborar. {{ formData.formDataCertificadoExpedito.descripcionSobreAptitud }}
        </p>
     </div>
     <div v-else class="w-full text-center cursor-pointer text-gray-500 italic" :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 7 }" @click="goToStep(7)">+ Agregar Aptitud</div>
     
     <!-- Observaciones -->
     <div v-if="formData.formDataCertificadoExpedito.observaciones" class="w-full cursor-pointer"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 8 }"
      @click="goToStep(8)"
      >
        <p class="text-justify font-medium">
            {{ formData.formDataCertificadoExpedito.observaciones.toUpperCase() }}
        </p>
     </div>
     <div v-else class="w-full text-center cursor-pointer text-gray-500 italic" :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 8 }" @click="goToStep(8)">+ Agregar Observaciones</div>

     <!-- Salida -->
     <div class="w-full mb-4">
        <p class="text-justify">
            Expido el presente certificado médico a petición de <span v-if="proveedorSalud.pais !== 'GT'">{{ trabajadores.currentTrabajador.sexo === 'Masculino' ? 'el' : 'la' }} C. </span><strong>{{ trabajadores.currentTrabajador.nombre + ' ' + trabajadores.currentTrabajador.primerApellido + ' ' + trabajadores.currentTrabajador.segundoApellido }}</strong> para los usos legales a que haya lugar, en el municipio de {{ proveedorSalud.municipio }}, {{ proveedorSalud.estado }}, <span v-if="proveedorSalud.pais === 'GT'">el {{ formatDateDDMMYYYY(formData.formDataCertificadoExpedito.fechaCertificadoExpedito) }}.</span><span v-else>en la fecha mencionada al inicio de este certificado.</span>
        </p>
     </div>

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

html.dark-mode .visualizador-certificado-expedito .cursor-pointer:hover {
  background-color: #475569 !important;
  color: #f8fafc !important;
}
</style>
