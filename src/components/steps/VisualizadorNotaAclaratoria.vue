<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useDocumentosStore } from '@/stores/documentos';
import { calcularEdad, calcularAntiguedad, formatDateDDMMYYYY } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import EstadoDocumentoBadgeAlt from '../badges/EstadoDocumentoBadgeAlt.vue';
import DocumentosAPI from '@/api/DocumentosAPI';
import { resolveNombreFirmantePorReferencia } from '@/helpers/firmantePorUsuario';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const steps = useStepsStore();
const proveedorSaludStore = useProveedorSaludStore();
const documentos = useDocumentosStore();
const isMX = computed(() => proveedorSaludStore.isMX);

const documentoOrigenInfo = ref(null);

const goToStep = (stepNumber) => {
  steps.goToStep(stepNumber);
};

// Mapeo de tipos de documento a nombres legibles
const tipoNombres = {
  'antidopings': 'Antidoping',
  'aptitudes': 'Aptitud Médica',
  'audiometrias': 'Audiometría',
  'certificados': 'Certificado Médico',
  'certificadosExpedito': 'Certificado Médico Expédito',
  'documentosExternos': 'Documento Externo',
  'examenesVista': 'Examen de Vista',
  'exploracionesFisicas': 'Exploración Física',
  'historiasClinicas': 'Historia Clínica',
  'notasMedicas': 'Nota Médica',
  'controlPrenatal': 'Control Prenatal',
  'historiaOtologica': 'Historia Otológica',
  'previoEspirometria': 'Previo Espirometría',
  'recetas': 'Receta',
  'constanciasAptitud': 'Constancia de Aptitud',
  'eventoSeguimientoCardiometabolico': 'Evento de Seguimiento Cardiometabólico',
  'informeLongitudinalCardiometabolico': 'Informe Longitudinal Cardiometabólico',
};

// Función para cargar información del documento origen
const cargarDocumentoOrigen = async () => {
  const docTipo = formData.formDataNotaAclaratoria.documentoOrigenTipo;
  const docId = formData.formDataNotaAclaratoria.documentoOrigenId;
  
  if (!docTipo || !docId || !trabajadores.currentTrabajadorId) {
    documentoOrigenInfo.value = null;
    return;
  }

  try {
    // Primero intentar buscar en documentsByYear
    let documento = null;
    if (documentos.documentsByYear) {
      Object.values(documentos.documentsByYear).forEach((docsDelAno) => {
        if (docsDelAno[docTipo] && Array.isArray(docsDelAno[docTipo])) {
          const encontrado = docsDelAno[docTipo].find(d => d._id === docId);
          if (encontrado) {
            documento = encontrado;
          }
        }
      });
    }

    // Si no se encuentra, hacer fetch
    if (!documento) {
      const response = await DocumentosAPI.getDocumentById(docTipo, trabajadores.currentTrabajadorId, docId);
      documento = response.data;
    }

    if (documento) {
      // Para documentos externos, usar nombreDocumento en lugar del tipo genérico
      let tipoMostrar = tipoNombres[docTipo] || docTipo;
      if (docTipo === 'documentosExternos' && documento.nombreDocumento) {
        tipoMostrar = documento.nombreDocumento;
      }
      
      const [finalizadoPor, anuladoPor] = await Promise.all([
        resolveNombreFirmantePorReferencia(documento.finalizadoPor),
        resolveNombreFirmantePorReferencia(documento.anuladoPor),
      ]);

      documentoOrigenInfo.value = {
        tipo: tipoMostrar,
        fechaCreacion: documento.createdAt ? formatDateDDMMYYYY(documento.createdAt) : '',
        fechaFinalizacion: documento.fechaFinalizacion ? formatDateDDMMYYYY(documento.fechaFinalizacion) : '',
        fechaAnulacion: documento.fechaAnulacion ? formatDateDDMMYYYY(documento.fechaAnulacion) : '',
        finalizadoPor,
        anuladoPor,
        razonAnulacion: documento.razonAnulacion || '',
        estado: documento.estado || ''
      };
    }
  } catch (error) {
    console.error('Error al cargar documento origen:', error);
    documentoOrigenInfo.value = null;
  }
};

// Watch para recargar cuando cambien los datos del documento origen
watch(() => [formData.formDataNotaAclaratoria.documentoOrigenTipo, formData.formDataNotaAclaratoria.documentoOrigenId], () => {
  cargarDocumentoOrigen();
}, { immediate: true });

onMounted(() => {
  cargarDocumentoOrigen();
});

// Mapeo de impacto clínico a colores y estilos
const getImpactoClinicoColor = (impacto) => {
  switch (impacto) {
    case 'ALTO':
    case 'SEVERO':
      return 'text-red-600';
    case 'MODERADO':
      return 'text-yellow-600';
    case 'BAJO':
    case 'LEVE':
      return 'text-green-600';
    case 'SIN IMPACTO':
      return 'text-gray-600';
    default:
      return 'text-gray-800';
  }
};

// Estilos para badges de impacto clínico
const getImpactoClinicoBadgeClasses = (impacto) => {
  switch (impacto) {
    case 'SEVERO':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'MODERADO':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'LEVE':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

// Estilos para badges de alcance de aclaración
const getAlcanceBadgeClasses = (alcance) => {
  switch (alcance) {
    case 'ACLARA':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'CORRIGE':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'COMPLEMENTA':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'INVALIDA':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

</script>

<template>
  <div
    class="flex flex-wrap justify-start gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto">

    <!-- Badge y Fecha de la Nota Aclaratoria -->
    <div class="flex flex-wrap md:flex-nowrap w-full gap-4 items-center">
      <EstadoDocumentoBadgeAlt 
        v-if="isMX"
        :estado="formData.formDataNotaAclaratoria.estado" 
        :fechaFinalizacion="formData.formDataNotaAclaratoria.fechaFinalizacion" 
        :finalizadoPor="formData.formDataNotaAclaratoria.finalizadoPor"
        :fechaAnulacion="formData.formDataNotaAclaratoria.fechaAnulacion"
        :anuladoPor="formData.formDataNotaAclaratoria.anuladoPor"
        :razonAnulacion="formData.formDataNotaAclaratoria.razonAnulacion"
        class="mt-1 flex-shrink-0"
      />
      <!-- Fecha de la nota aclaratoria -->
      <div
        class="w-full md:w-auto md:flex-1 flex flex-wrap gap-2 justify-start md:justify-end text-sm sm:text-base cursor-pointer"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 1 }"
        @click="goToStep(1)">
        <p class="w-full md:w-auto font-light">Fecha de nota aclaratoria: <span class="font-medium">{{
          formatDateDDMMYYYY(formData.formDataNotaAclaratoria.fechaNotaAclaratoria) }}</span></p>
      </div>
    </div>

    <!-- DOCUMENTO QUE SE ACLARA -->
    <div class="w-full">
      <div class="bg-gray-100 rounded-lg p-4 border border-gray-300 shadow-sm"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 2 }"
        @click="goToStep(2)">
        <h3 class="text-center font-bold text-sm mb-3 text-gray-700">DOCUMENTO QUE SE ACLARA</h3>
        
        <div v-if="documentoOrigenInfo || formData.formDataNotaAclaratoria.documentoOrigenTipo" class="cursor-pointer">
          <!-- Nombre del documento (sin label, prominente) -->
          <div class="mb-3">
            <h4 class="text-xl font-bold text-gray-900 mb-2">
              {{ documentoOrigenInfo?.tipo || formData.formDataNotaAclaratoria.documentoOrigenTipo }}
              <span v-if="documentoOrigenInfo.fechaCreacion && formData.formDataNotaAclaratoria.documentoOrigenTipo !== 'documentosExternos'" class="font-normal text-gray-500 text-sm">(Creado el {{documentoOrigenInfo.fechaCreacion}})</span>
              <span v-else-if="formData.formDataNotaAclaratoria.documentoOrigenTipo === 'documentosExternos'" class="font-normal text-gray-500 text-sm">(Subido el {{documentoOrigenInfo.fechaCreacion}})</span>
            </h4>
          </div>
          
          <!-- Información detallada del documento -->
          <div v-if="documentoOrigenInfo" class="bg-white rounded-md p-3 border border-gray-300 space-y-2 text-sm">
            
            <div v-if="documentoOrigenInfo.fechaFinalizacion" class="flex items-start gap-2">
              <span class="text-gray-500 font-medium min-w-[120px]">Finalizado:</span>
              <span class="text-gray-700 flex-1">{{ documentoOrigenInfo.fechaFinalizacion }}</span>
            </div>
            <div v-if="documentoOrigenInfo.finalizadoPor" class="flex items-start gap-2">
              <span class="text-gray-500 font-medium min-w-[120px]">Finalizado por:</span>
              <span class="text-gray-700 flex-1">{{ documentoOrigenInfo.finalizadoPor }}</span>
            </div>
            
            <div v-if="documentoOrigenInfo.fechaAnulacion" class="flex items-start gap-2">
              <span class="text-red-600 font-medium min-w-[120px]">Anulado:</span>
              <span class="text-red-700 font-medium flex-1">{{ documentoOrigenInfo.fechaAnulacion }}</span>
            </div>
            <div v-if="documentoOrigenInfo.anuladoPor" class="flex items-start gap-2">
              <span class="text-red-600 font-medium min-w-[120px]">Anulado por:</span>
              <span class="text-red-700 flex-1">{{ documentoOrigenInfo.anuladoPor }}</span>
            </div>
            
            <div v-if="documentoOrigenInfo.razonAnulacion" class="flex items-start gap-2 pt-2 border-t border-gray-300">
              <span class="text-red-600 font-medium min-w-[120px]">Razón:</span>
              <span class="text-red-700 flex-1">{{ documentoOrigenInfo.razonAnulacion }}</span>
            </div>
          </div>
        </div>
        
        <div v-else class="cursor-pointer text-gray-500 italic text-center py-3 bg-white rounded-md border border-gray-300">
          + Seleccionar documento origen
        </div>
      </div>
    </div>

    <!-- TRABAJADOR -->
    <div class="w-full">
      <div class="bg-gray-100 rounded-lg p-4 border border-gray-300 shadow-sm">
        <h3 class="text-center font-bold text-sm mb-3 text-gray-700">TRABAJADOR</h3>
        
        <!-- Nombre y teléfono de trabajador -->
        <div class="w-full flex justify-between items-center mb-3">
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
            <span v-if="trabajadores.currentTrabajador.curp"> CURP: <span class="font-medium">{{ trabajadores.currentTrabajador.curp }}</span></span>.
            <span v-if="trabajadores.currentTrabajador.numeroEmpleado"> Número de empleado: <span class="font-medium">{{ trabajadores.currentTrabajador.numeroEmpleado }}</span></span>.
          </p>
        </div>
      </div>
    </div>

    <!-- INFORMACIÓN DE LA ACLARACIÓN -->
    <div class="w-full">
      <div class="bg-gray-100 rounded-md p-4 border border-gray-300">
        <h3 class="text-center font-bold text-sm mb-4 text-gray-700">INFORMACIÓN DE LA ACLARACIÓN</h3>
        
        <!-- Header con Alcance e Impacto como badges prominentes -->
        <div class="flex flex-row items-center justify-center gap-8 mb-4">
          <!-- Alcance de aclaración -->
          <div 
            class="cursor-pointer transition-all duration-200 hover:scale-105 flex-shrink-0"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-lg': steps.currentStep === 3 }"
            @click="goToStep(3)"
          >
            <div v-if="formData.formDataNotaAclaratoria.alcanceAclaracion" 
                 class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-bold text-sm whitespace-nowrap"
                 :class="getAlcanceBadgeClasses(formData.formDataNotaAclaratoria.alcanceAclaracion)">
              <span>Alcance:</span>
              <span class="uppercase">{{ formData.formDataNotaAclaratoria.alcanceAclaracion }}</span>
            </div>
            <div v-else 
                 class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-400 bg-white text-gray-500 italic text-sm hover:border-gray-500 whitespace-nowrap">
              <span>+ Seleccionar Alcance</span>
            </div>
          </div>

          <!-- Impacto clínico -->
          <div 
            class="cursor-pointer transition-all duration-200 hover:scale-105 flex-shrink-0"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-lg': steps.currentStep === 4 }"
            @click="goToStep(4)"
          >
            <div v-if="formData.formDataNotaAclaratoria.impactoClinico" 
                 class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-bold text-sm whitespace-nowrap"
                 :class="getImpactoClinicoBadgeClasses(formData.formDataNotaAclaratoria.impactoClinico)">
              <span>Impacto:</span>
              <span class="uppercase">{{ formData.formDataNotaAclaratoria.impactoClinico }}</span>
            </div>
            <div v-else 
                 class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-400 bg-white text-gray-500 italic text-sm hover:border-gray-500 whitespace-nowrap">
              <span>+ Seleccionar Impacto</span>
            </div>
          </div>
        </div>

        <!-- Contenido de texto (Motivo y Descripción) -->
        <div class="space-y-3 bg-white rounded-md p-3 border border-gray-200">
          <!-- Motivo de aclaración -->
          <div v-if="formData.formDataNotaAclaratoria.motivoAclaracion" 
            class="cursor-pointer" 
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md p-2 -m-2': steps.currentStep === 5 }" 
            @click="goToStep(5)">
            <p class="text-sm font-semibold text-gray-700 mb-1">Motivo de aclaración:</p>
            <p class="text-justify text-sm font-light text-gray-800">{{ formData.formDataNotaAclaratoria.motivoAclaracion }}</p>
          </div>
          <div v-else class="cursor-pointer text-gray-500 italic text-sm py-2" 
            :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 5 }" 
            @click="goToStep(5)">
            + Agregar Motivo de Aclaración
          </div>

          <!-- Descripción de aclaración -->
          <div v-if="formData.formDataNotaAclaratoria.descripcionAclaracion" 
            class="cursor-pointer" 
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md p-2 -m-2': steps.currentStep === 6 }" 
            @click="goToStep(6)">
            <p class="text-sm font-semibold text-gray-700 mb-1">Descripción de la aclaración:</p>
            <p class="text-justify text-sm font-light text-gray-800">{{ formData.formDataNotaAclaratoria.descripcionAclaracion }}</p>
          </div>
          <div v-else class="cursor-pointer text-gray-500 italic text-sm py-2" 
            :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 6 }" 
            @click="goToStep(6)">
            + Agregar Descripción de la Aclaración
          </div>
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
  background-color: #f0f0f0;
  /* Cambia el color según tu diseño */
}
</style>
