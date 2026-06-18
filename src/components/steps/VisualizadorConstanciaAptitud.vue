<script setup>
import { ref, computed, watch } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { useMedicoFirmanteStore } from '@/stores/medicoFirmante';
import { useUserStore } from '@/stores/user';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { formatearTituloYNombreFirmante } from '@/helpers/nombres';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import EstadoDocumentoBadgeAlt from '../badges/EstadoDocumentoBadgeAlt.vue';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const steps = useStepsStore();
const medicoFirmanteStore = useMedicoFirmanteStore();
const userStore = useUserStore();
const proveedorSaludStore = useProveedorSaludStore();
const isMX = computed(() => proveedorSaludStore.isMX);

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

// Función para formatear fecha en formato institucional
function formatearFechaInstitucional(fecha) {
  if (!fecha) return '';
  
  const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
  if (isNaN(fechaObj.getTime())) return '';

  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const dia = fechaObj.getUTCDate();
  const mes = meses[fechaObj.getUTCMonth()];
  const año = fechaObj.getUTCFullYear();

  return `${dia} de ${mes} de ${año}`;
}

// Función para formatear teléfono
function formatearTelefono(telefono){
  if (!telefono) {
    return ''; 
  }
  
  // Si el teléfono ya tiene formato internacional (+52XXXXXXXXXX)
  if (telefono.startsWith('+')) {
    // Buscar el país correspondiente para obtener el código
    const countries = [
      { code: 'MX', dialCode: '+52' },
      { code: 'AR', dialCode: '+54' },
      { code: 'BR', dialCode: '+55' },
      { code: 'CL', dialCode: '+56' },
      { code: 'CO', dialCode: '+57' },
      { code: 'PE', dialCode: '+51' },
      { code: 'VE', dialCode: '+58' },
      { code: 'UY', dialCode: '+598' },
      { code: 'PY', dialCode: '+595' },
      { code: 'BO', dialCode: '+591' },
      { code: 'EC', dialCode: '+593' },
      { code: 'GT', dialCode: '+502' },
      { code: 'CR', dialCode: '+506' },
      { code: 'PA', dialCode: '+507' },
      { code: 'HN', dialCode: '+504' },
      { code: 'NI', dialCode: '+505' },
      { code: 'SV', dialCode: '+503' },
      { code: 'CU', dialCode: '+53' },
      { code: 'DO', dialCode: '+1' },
      { code: 'PR', dialCode: '+1' }
    ];
    
    // Encontrar el país por código de marcación
    const country = countries.find(c => telefono.startsWith(c.dialCode));
    if (country) {
      const numeroLocal = telefono.replace(country.dialCode, '');
      return `(${country.dialCode}) ${numeroLocal}`;
    }
  }
  
  // Si es un número local de 10 dígitos (México)
  if (telefono.length === 10 && /^\d{10}$/.test(telefono)) {
    return `(+52) ${telefono}`;
  }
  
  // Si es un número local de otros países (8-11 dígitos)
  if (telefono.length >= 8 && telefono.length <= 11 && /^\d+$/.test(telefono)) {
    return `(+XX) ${telefono}`;
  }
  
  // Si no coincide con ningún formato conocido, devolver tal como está
  return telefono;
}

const nombreCompletoTrabajador = computed(() => {
  return formatNombreCompleto(trabajadores.currentTrabajador);
});

const fechaFormateada = computed(() => {
  if (!formData.formDataConstanciaAptitud.fechaConstanciaAptitud) {
    return '';
  }
  return formatearFechaInstitucional(formData.formDataConstanciaAptitud.fechaConstanciaAptitud);
});

const nombreCompletoMedico = computed(() => {
  const medico = medicoFirmanteStore.medicoFirmante;
  if (!medico) return 'Nombre del Emisor';

  return formatearTituloYNombreFirmante(medico) || 'Nombre del Emisor';
});

const cargoEmisor = computed(() => {
  const medico = medicoFirmanteStore.medicoFirmante;
  if (!medico) return '';
  
  return medico.especialistaSaludTrabajo === 'Si' || medico.especialistaSaludTrabajo === true
    ? 'Médico del Trabajo'
    : 'Médico Responsable de Evaluación';
});

const cedulaProfesional = computed(() => {
  const medico = medicoFirmanteStore.medicoFirmante;
  if (!medico?.numeroCedulaProfesional) return null;
  
  const pais = proveedorSalud.value?.pais || 'MX';
  if (pais === 'MX') {
    return `Cédula profesional No. ${medico.numeroCedulaProfesional}.`;
  } else if (pais === 'GT') {
    return `Colegiado Activo No. ${medico.numeroCedulaProfesional}.`;
  } else {
    return `Registro Profesional No. ${medico.numeroCedulaProfesional}.`;
  }
});

const credencialAdicional = computed(() => {
  const medico = medicoFirmanteStore.medicoFirmante;
  if (!medico?.nombreCredencialAdicional || !medico?.numeroCredencialAdicional) return null;
  
  const pais = proveedorSalud.value?.pais || 'MX';
  if (pais === 'GT') {
    return `Registro ${medico.nombreCredencialAdicional} No. ${medico.numeroCredencialAdicional}.`;
  } else {
    return `${medico.nombreCredencialAdicional} No. ${medico.numeroCredencialAdicional}.`;
  }
});

const firmaSrc = computed(() => {
  const medico = medicoFirmanteStore.medicoFirmante;
  if (!medico?.firma?.data) return null;
  
  const baseURL = import.meta.env.VITE_API_URL || 'https://ramazzini.app';
  return `${baseURL}/assets/signatories/${medico.firma.data}?t=${Date.now()}`;
});

const baseURL = import.meta.env.VITE_API_URL || 'https://ramazzini.app';

const logoSrc = computed(() => {
  if (proveedorSalud.value?.logotipoEmpresa?.data) {
    return `${baseURL}/assets/providers-logos/${proveedorSalud.value.logotipoEmpresa.data}?t=${Date.now()}`;
  }
  return `${baseURL}/assets/RamazziniBrand600x600.png?t=${Date.now()}`;
});

const footerInfo = computed(() => {
  const info = [];
  if (proveedorSalud.value?.direccion) info.push(proveedorSalud.value.direccion);
  if (proveedorSalud.value?.municipio) info.push(proveedorSalud.value.municipio);
  if (proveedorSalud.value?.estado) info.push(proveedorSalud.value.estado);
  
  let texto = info.filter(item => item).join(', ') + '.';
  if (proveedorSalud.value?.telefono) {
    texto += ` Tel. ${formatearTelefono(proveedorSalud.value.telefono)}`;
  }
  
  return texto;
});
</script>

<template>
  <div
    class="flex flex-col w-full text-center border-shadow rounded-lg transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto"
    style="padding: 70px 40px 80px 40px;">
    
    <div class="absolute top-4 right-4">
      <EstadoDocumentoBadgeAlt 
        v-if="isMX"
        :estado="formData.formDataConstanciaAptitud.estado" 
        :fechaFinalizacion="formData.formDataConstanciaAptitud.fechaFinalizacion" 
        :finalizadoPor="formData.formDataConstanciaAptitud.finalizadoPor"
        :fechaAnulacion="formData.formDataConstanciaAptitud.fechaAnulacion"
        :anuladoPor="formData.formDataConstanciaAptitud.anuladoPor"
        :razonAnulacion="formData.formDataConstanciaAptitud.razonAnulacion"
      />
    </div>

    <!-- Contenido principal -->
    <div class="flex flex-col items-center justify-start">
      <!-- Título de la constancia -->
      <div class="text-center" style="margin-top: 10px; margin-bottom: 0;">
        <h1 class="text-[28px] font-bold" style="line-height: 1; margin: 0;">
          CONSTANCIA DE
        </h1>
        <h2 class="text-[40px] font-bold" style="line-height: 1; margin: 0 0 10px 0;">
          APTITUD LABORAL
        </h2>
      </div>

      <!-- Línea divisoria debajo del título -->
      <div class="w-full max-w-[400px] border-t border-black" style="border-width: 0.5px; margin: 0 0 15px 0;"></div>

      <!-- Nombre del empleado -->
      <div class="text-center" style="margin-bottom: 15px;">
        <p class="text-[22px] font-bold" style="line-height: 1; margin: 0;">
          {{ nombreCompletoTrabajador || 'Nombre del Empleado' }}
        </p>
      </div>

      <!-- Párrafo descriptivo -->
      <div class="text-center" style="margin: 0 40px 25px 40px;">
        <p class="text-base" style="font-size: 16px; line-height: 1.15; margin: 0;">
          Ha demostrado contar con las habilidades y competencias necesarias para desempeñar adecuadamente las funciones y responsabilidades inherentes al puesto de trabajo.
        </p>
      </div>

      <!-- Fecha de emisión -->
      <div class="cursor-pointer" style="margin: 15px 0 0 0;"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 1 }"
        @click="goToStep(1)">
        <p class="text-[13px]" style="font-size: 13px; margin: 0;">
          Fecha de emisión: <span class="font-medium">{{ fechaFormateada || '[FECHA DE EMISIÓN]' }}</span>
        </p>
      </div>

      <!-- Línea divisoria antes de la firma -->
      <div class="w-full max-w-[400px] border-t border-black" style="border-width: 0.5px; margin: 30px 0 20px 0;"></div>

      <!-- Firma a la izquierda y logo a la derecha -->
      <div class="flex justify-center items-start w-full" style="margin-top: 20px;">
        <!-- Espaciador izquierdo -->
        <div style="width: 80px; flex-shrink: 0;"></div>
        
        <!-- Sección izquierda: Firma y datos del médico -->
        <div class="flex flex-col items-center" style="flex: 1; max-width: 100%;">
          <!-- Firma -->
          <div v-if="firmaSrc" style="margin-bottom: 5px;">
            <img 
              :src="firmaSrc"
              alt="Firma"
              style="width: 95px; height: auto; object-fit: contain;"
            />
          </div>
          
          <!-- Nombre completo del médico -->
          <p class="font-bold" style="font-size: 12px; margin: 5px 0 0 0; line-height: 1;">
            {{ nombreCompletoMedico }}
          </p>
          
          <!-- Cargo del emisor -->
          <p style="font-size: 10px; margin: 0; line-height: 1;">
            {{ cargoEmisor }}
          </p>
          
          <!-- Cédula profesional -->
          <p v-if="cedulaProfesional" style="font-size: 9px; margin: 0; line-height: 1;">
            {{ cedulaProfesional }}
          </p>
          
          <!-- Credencial adicional -->
          <p v-if="credencialAdicional" style="font-size: 9px; margin: 0; line-height: 1;">
            {{ credencialAdicional }}
          </p>
        </div>

        <!-- Espaciador central -->
        <div style="width: 20px; flex-shrink: 0;"></div>

        <!-- Sección derecha: Logo -->
        <div class="flex items-center justify-center" style="flex-shrink: 0;">
          <img 
            :src="logoSrc"
            alt="Logo"
            style="width: 120px; height: auto; object-fit: contain;"
          />
        </div>

        <!-- Espaciador derecho -->
        <div style="width: 130px; flex-shrink: 0;"></div>
      </div>

      <!-- Footer -->
      <div style="margin-top: 40px; padding-top: 8px; border-top: 0.5px solid #777777; width: 100%;">
        <div class="text-center">
          <p class="text-gray-500" style="font-size: 7px; color: #777777; margin: 0 0 4px 0;">
            {{ footerInfo }}
          </p>
          <a 
            v-if="proveedorSalud?.sitioWeb" 
            :href="`https://${proveedorSalud.sitioWeb}`"
            target="_blank"
            class="text-gray-500 hover:underline"
            style="font-size: 7px; color: #777777; text-decoration: none; display: block;"
          >
            {{ proveedorSalud.sitioWeb }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  background-color: rgba(240, 240, 240, 0.3);
}
</style>

