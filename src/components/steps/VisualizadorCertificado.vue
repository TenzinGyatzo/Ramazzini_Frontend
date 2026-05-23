<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { formatDateDDMMYYYY } from '@/helpers/dates';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { calcularEdad } from '@/helpers/dates';
import DocumentosAPI from '@/api/DocumentosAPI';
import { useMedicoFirmanteStore } from '@/stores/medicoFirmante';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const steps = useStepsStore();
const medicoFirmanteStore = useMedicoFirmanteStore();

const exploracionesFisicas = ref([]);
const nearestExploracionFisica = ref(null);

const examenesVista = ref([]);
const nearestExamenVista = ref(null);

const user = ref(
    JSON.parse(localStorage.getItem('user')) || null // Recuperar usuario guardado o establecer null si no existe
);

const proveedorSalud = ref (
    JSON.parse(localStorage.getItem('proveedorSalud')) || null
);

onMounted(() => {
    // Escucha los cambios en el usuario para cargar proveedor de salud
    watch(
        () => user.user,
        (user) => {
            if (user?._id){
              medicoFirmanteStore.loadMedicoFirmante(user._id);
            }
        },
        { immediate: true } // Ejecutar inmediatamente si ya hay datos cargados
    );
});

onMounted(async () => {
  try {
    const examenVistaResponse = await DocumentosAPI.getExamenesVista(trabajadores.currentTrabajadorId);
    examenesVista.value = examenVistaResponse.data;
    const exploracionFisicaResponse = await DocumentosAPI.getExploracionesFisicas(trabajadores.currentTrabajadorId);
    exploracionesFisicas.value = exploracionFisicaResponse.data;
  } catch (error) {
    console.error('Error al obtener los exámenes:', error);
  }

  if (formData.formDataCertificado.fechaCertificado) {
    const referenceDate = new Date(formData.formDataCertificado.fechaCertificado);

    if (isNaN(referenceDate.getTime())) {
      console.error('Fecha del certificado no válida:', formData.formDataCertificado.fechaCertificado);
      nearestExamenVista.value = null;
      nearestExploracionFisica.value = null;
      return;
    }

    // Procesar solo si las fechas son válidas
    nearestExploracionFisica.value = exploracionesFisicas.value.reduce((closest, current) => {
      const currentDate = current.fechaExploracionFisica ? new Date(current.fechaExploracionFisica) : null;

      if (!currentDate || isNaN(currentDate.getTime())) {
        console.error('Fecha de exploración física no válida:', current.fechaExploracionFisica);
        return closest; // Ignorar exploraciones con fechas inválidas
      }

      const currentDiff = Math.abs(currentDate - referenceDate);
      const closestDiff = closest
        ? Math.abs(new Date(closest.fechaExploracionFisica) - referenceDate)
        : Infinity;

      return currentDiff < closestDiff ? current : closest;
    }, null);

    nearestExamenVista.value = examenesVista.value.reduce((closest, current) => {
      const currentDate = current.fechaExamenVista ? new Date(current.fechaExamenVista) : null;

      if (!currentDate || isNaN(currentDate.getTime())) {
        console.error('Fecha de examen no válida:', current.fechaExamenVista);
        return closest; // Ignorar exámenes con fechas inválidas
      }

      const currentDiff = Math.abs(currentDate - referenceDate);
      const closestDiff = closest
        ? Math.abs(new Date(closest.fechaExamenVista) - referenceDate)
        : Infinity;

      return currentDiff < closestDiff ? current : closest;
    }, null);

    //console.log('Exploración física más cercana:', nearestExploracionFisica.value);
    //console.log('Examen de vista más cercano:', nearestExamenVista.value);
    
  }
});

watch(
  () => formData.formDataCertificado.fechaCertificado,
  (newFechaCertificado) => {
    if (!newFechaCertificado || !examenesVista.value.length) {
      nearestExploracionFisica.value = null;
      nearestExamenVista.value = null;
      return;
    }

    const referenceDate = new Date(newFechaCertificado);

    if (isNaN(referenceDate.getTime())) {
      console.error('Fecha del certificado no válida:', newFechaCertificado);
      nearestExploracionFisica.value = null;
      nearestExamenVista.value = null;
      return;
    }

    // Procesar solo si las fechas son válidas
    nearestExploracionFisica.value = exploracionesFisicas.value.reduce((closest, current) => {
      const currentDate = current.fechaExploracionFisica ? new Date(current.fechaExploracionFisica) : null;

      if (!currentDate || isNaN(currentDate.getTime())) {
        console.error('Fecha de exploración física no válida:', current.fechaExploracionFisica);
        return closest; // Ignorar exploraciones con fechas inválidas
      }

      const currentDiff = Math.abs(currentDate - referenceDate);
      const closestDiff = closest
        ? Math.abs(new Date(closest.fechaExploracionFisica) - referenceDate)
        : Infinity;

      return currentDiff < closestDiff ? current : closest;
    }, null);

    nearestExamenVista.value = examenesVista.value.reduce((closest, current) => {
      const currentDate = current.fechaExamenVista ? new Date(current.fechaExamenVista) : null;

      if (!currentDate || isNaN(currentDate.getTime())) {
        console.error('Fecha de examen no válida:', current.fechaExamenVista);
        return closest; // Ignorar exámenes con fechas inválidas
      }

      const currentDiff = Math.abs(currentDate - referenceDate);
      const closestDiff = closest
        ? Math.abs(new Date(closest.fechaExamenVista) - referenceDate)
        : Infinity;

      return currentDiff < closestDiff ? current : closest;
    }, null);
    
    console.log('Exploración física más cercana:', nearestExploracionFisica.value);
    console.log('Examen de vista más cercano:', nearestExamenVista.value);
  },
  { immediate: true }


);

const goToStep = (stepNumber) => {
  steps.goToStep(stepNumber);
};

const camposExploracion = [
  'abdomen', 'boca', 'cadera', 'cicatrices', 'codos', 'coordinacion',
  'craneoCara', 'cuello', 'equilibrio', 'hombros', 'inspeccionColumna',
  'lesionesPiel', 'manos', 'marcha', 'movimientosColumna', 'nariz',
  'reflejosOsteoTendinososInferiores', 'reflejosOsteoTendinososSuperiores', 'nevos', 'oidos',
  'ojos', 'rodillas', 'sensibilidad', 'tobillosPies', 'torax'
];

const hallazgos = computed(() => {
  if (!nearestExploracionFisica.value) return [];

  return camposExploracion
    .map(campo => ({
      campo,
      valor: nearestExploracionFisica.value[campo]
    }))
    .filter(entry => entry.valor && entry.valor !== 'Sin hallazgos');
});

const textoExploracion = computed(() => {
  if (hallazgos.value.length === 0) {
    return 'Exploración física sin alteraciones significativas. Se observó integridad funcional del aparato locomotor y del sistema nervioso, con marcha, coordinación, fuerza y reflejos dentro de parámetros normales.';
  } else {
    return 'Hallazgos relevantes en la exploración física: ' +
      hallazgos.value
        .map(h => `${formatearCampo(h.campo)}: ${h.valor}`)
        .join('; ') + '.';
  }
});

// Utilidad opcional para mejorar formato
function formatearCampo(campo) {
  const palabras = campo.replace(/([A-Z])/g, ' $1').split(' ');
  return palabras.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

</script>

<template>
  <div
    class="visualizador-certificado flex flex-wrap justify-start gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto">

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
          formatDateDDMMYYYY(formData.formDataCertificado.fechaCertificado) }}</span></p>
      </div>
    </div>

    <!-- Certificado -->
     <div class="w-full mb-4">
      <p class="text-justify">
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
        <strong>{{ medicoFirmanteStore.medicoFirmante.numeroCedulaProfesional }}</strong>. 

        <template v-if="medicoFirmanteStore.medicoFirmante.especialistaSaludTrabajo === 'Si'">
          Especialista en Medicina del Trabajo,
        </template>
        <template v-else>
          Con formación en Medicina y dedicado a la práctica en el ámbito de la salud laboral,
        </template>

        <strong>
          {{ medicoFirmanteStore.medicoFirmante.tituloProfesional }} {{ medicoFirmanteStore.medicoFirmante.nombre }}
        </strong><span v-if="medicoFirmanteStore.medicoFirmante.especialistaSaludTrabajo === 'Si'">,</span><span v-else>. </span>

        <template v-if="medicoFirmanteStore.medicoFirmante.especialistaSaludTrabajo === 'Si'">
          legalmente <span v-if="medicoFirmanteStore.medicoFirmante.tituloProfesional === 'Dr.'">autorizado</span> <span v-else>autorizada</span> {{ proveedorSalud.pais === 'MX' ? 'por la Dirección General de Profesiones ' : '' }}para ejercer la Especialidad en Medicina del Trabajo con {{ proveedorSalud.pais === 'MX' ? 'cédula profesional' : 'registro de especialidad' }} número 
          <strong>{{ medicoFirmanteStore.medicoFirmante.numeroCedulaEspecialista }}</strong>.
        </template>

        <template v-if="medicoFirmanteStore.medicoFirmante.nombreCredencialAdicional && medicoFirmanteStore.medicoFirmante.numeroCredencialAdicional">
          <template v-if="proveedorSalud.pais === 'GT'">
            Registro {{ medicoFirmanteStore.medicoFirmante.nombreCredencialAdicional }} No. 
            <strong>{{ medicoFirmanteStore.medicoFirmante.numeroCredencialAdicional }}</strong>.
          </template>
          <template v-else>
            {{ medicoFirmanteStore.medicoFirmante.nombreCredencialAdicional }} con número 
            <strong>{{ medicoFirmanteStore.medicoFirmante.numeroCredencialAdicional }}</strong>.
          </template>
        </template>

        <template v-if="medicoFirmanteStore.medicoFirmante.nombreCredencialAdicional2 && medicoFirmanteStore.medicoFirmante.numeroCredencialAdicional2">
          <template v-if="proveedorSalud.pais === 'GT'">
            {{ medicoFirmanteStore.medicoFirmante.nombreCredencialAdicional2 }} No. 
            <strong>{{ medicoFirmanteStore.medicoFirmante.numeroCredencialAdicional2 }}</strong>.
          </template>
          <template v-else>
            {{ medicoFirmanteStore.medicoFirmante.nombreCredencialAdicional2 }} con número 
            <strong>{{ medicoFirmanteStore.medicoFirmante.numeroCredencialAdicional2 }}</strong>.
          </template>
        </template>

      </p>
     </div>

     <div class="w-full mb-4">
        <h1 class="text-center text-4xl tracking-[.25em]">CERTIFICA</h1>
     </div>

    <div v-if="formData.formDataCertificado.fechaCertificado" class="w-full mb-4">
       <p class="text-justify">
         <template v-if="proveedorSalud.pais === 'PA'">
           Que, habiendo practicado reconocimiento médico en esta fecha, {{ trabajadores.currentTrabajador.sexo === 'Femenino' ? 'a la' : 'al' }} C. 
           <strong>{{ trabajadores.currentTrabajador.nombre + ' ' + trabajadores.currentTrabajador.primerApellido + ' ' + trabajadores.currentTrabajador.segundoApellido }}</strong>, 
           de <strong>{{ calcularEdad(trabajadores.currentTrabajador.fechaNacimiento) }}</strong> años de edad, se hace constar la práctica del examen médico conforme a los procedimientos establecidos.
         </template>
         <template v-else>
           Que, habiendo practicado reconocimiento médico en esta fecha, {{ proveedorSalud.pais === 'GT' 
             ? ' '
             : (trabajadores.currentTrabajador.sexo === 'Femenino' ? 'a la' : 'al') + ' C. ' }}
           <strong>{{ trabajadores.currentTrabajador.nombre + ' ' + trabajadores.currentTrabajador.primerApellido + ' ' + trabajadores.currentTrabajador.segundoApellido }}</strong> 
           de <strong>{{ calcularEdad(trabajadores.currentTrabajador.fechaNacimiento) }}</strong> años de edad.

           <template v-if="nearestExploracionFisica">
             Presenta IMC: {{ nearestExploracionFisica.indiceMasaCorporal }} ({{ nearestExploracionFisica.categoriaIMC }}). 
             Frecuencia cardiaca de {{ nearestExploracionFisica.frecuenciaCardiaca }} lpm ({{ nearestExploracionFisica.categoriaFrecuenciaCardiaca }}). 
             Saturación de oxígeno del {{ nearestExploracionFisica.saturacionOxigeno }}% ({{ nearestExploracionFisica.categoriaSaturacionOxigeno }}).
             Tensión arterial {{ nearestExploracionFisica.tensionArterialSistolica }}/{{ nearestExploracionFisica.tensionArterialDiastolica }} mmHg ({{ nearestExploracionFisica.categoriaTensionArterial || 'no especificada' }}).
           </template>

           <template v-if="nearestExamenVista">
             Examen visual con agudeza lejana sin corrección: 
             OI 20/{{ nearestExamenVista.ojoIzquierdoLejanaSinCorreccion || 'N/D' }} y 
             OD 20/{{ nearestExamenVista.ojoDerechoLejanaSinCorreccion || 'N/D' }} 
             ({{ nearestExamenVista.sinCorreccionLejanaInterpretacion || 'categoría no disponible' }}). 
             <template v-if="nearestExamenVista.interpretacionIshihara === 'Daltonismo'">
               Se detecta alteración en la percepción cromática (Daltonismo).
             </template>
             <template v-else-if="nearestExamenVista.interpretacionIshihara === 'Normal'">
               No se detectan alteraciones en la percepción cromática.
             </template>
             <template v-else>
               No se cuenta con resultado de prueba de percepción cromática.
             </template>
           </template>

           {{ textoExploracion }}

           <template v-if="nearestExploracionFisica?.resumenExploracionFisica === 'Se encuentra clínicamente sano' || nearestExploracionFisica?.resumenExploracionFisica === 'Se encuentra clínicamente sana'">
             {{ nearestExploracionFisica.resumenExploracionFisica }}.
           </template>
         </template>
       </p>

    </div>

    <div v-else class="w-full mb-4">
       <p class="text-justify">
         <template v-if="proveedorSalud.pais === 'PA'">
           Que, habiendo practicado reconocimiento médico en esta fecha, {{ trabajadores.currentTrabajador.sexo === 'Femenino' ? 'a la' : 'al' }} C. 
           <strong>{{ trabajadores.currentTrabajador.nombre + ' ' + trabajadores.currentTrabajador.primerApellido + ' ' + trabajadores.currentTrabajador.segundoApellido }}</strong>, 
           de <strong>{{ calcularEdad(trabajadores.currentTrabajador.fechaNacimiento) }}</strong> años de edad, se hace constar la práctica del examen médico conforme a los procedimientos establecidos.
         </template>
         <template v-else>
           Que, habiendo practicado reconocimiento médico en esta fecha, {{ proveedorSalud.pais === 'GT' 
             ? 'a '
             : (trabajadores.currentTrabajador.sexo === 'Femenino' ? 'a la' : 'al') + ' C. ' }}
           <strong>{{ trabajadores.currentTrabajador.nombre + ' ' + trabajadores.currentTrabajador.primerApellido + ' ' + trabajadores.currentTrabajador.segundoApellido }}</strong> 
           de <strong>{{ calcularEdad(trabajadores.currentTrabajador.fechaNacimiento) }}</strong> años de edad.

           &nbsp; <span :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 1 }">[DESCRIPCIÓN DE LA EXPLORACIÓN DE LA FECHA MÁS CERCANA]</span>
         </template>
       </p>

    </div>

     <div class="w-full mb-4">
        <p class="text-justify">
            Por lo anterior, se establece que <span v-if="proveedorSalud.pais !== 'GT'">{{ trabajadores.currentTrabajador.sexo === 'Masculino' ? 'el' : 'la' }} C. </span><strong>{{ trabajadores.currentTrabajador.nombre + ' ' + trabajadores.currentTrabajador.primerApellido + ' ' + trabajadores.currentTrabajador.segundoApellido  + ' ' }}</strong><span v-if="proveedorSalud.pais === 'GT' && trabajadores.currentTrabajador.sexo === 'Femenino'"> </span><span class="cursor-pointer" :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 2 }" @click="goToStep(2)">{{ formData.formDataCertificado.impedimentosFisicos ? formData.formDataCertificado.impedimentosFisicos : '[DESCRIPCIÓN DE IMPEDIMENTOS FÍSICOS]' }}.</span> Este certificado de salud no implica ningún tipo de garantía de que <span>{{ trabajadores.currentTrabajador.sexo === 'Masculino' ? 'el trabajador' : 'la trabajadora' }}</span> no se lesionará o enfermará en el futuro.
        </p>
     </div>
     
     <div class="w-full mb-4">
        <p class="text-justify">
            Expido el presente certificado médico a petición de <span v-if="proveedorSalud.pais !== 'GT'">{{ trabajadores.currentTrabajador.sexo === 'Masculino' ? 'el' : 'la' }} C. </span><strong>{{ trabajadores.currentTrabajador.nombre + ' ' + trabajadores.currentTrabajador.primerApellido + ' ' + trabajadores.currentTrabajador.segundoApellido }}</strong> para los usos legales a que haya lugar, en el municipio de {{ proveedorSalud.municipio }}, {{ proveedorSalud.estado }}, <span v-if="proveedorSalud.pais === 'GT'">el {{ formatDateDDMMYYYY(formData.formDataCertificado.fechaCertificado) }}.</span><span v-else>en la fecha mencionada al inicio de este certificado.</span>
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

html.dark-mode .visualizador-certificado .cursor-pointer:hover {
  background-color: #475569 !important;
  color: #f8fafc !important;
}
</style>
