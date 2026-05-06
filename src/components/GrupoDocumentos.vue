<script setup lang="ts">
import { ref, watch, computed, useSlots } from 'vue';
import type { DocumentsByYear } from '@/stores/documentos';
import DocumentoItem from './DocumentoItem.vue';
import { convertirFechaISOaDDMMYYYY } from '@/helpers/dates';
import type { PropType } from 'vue';
import { obtenerRutaDocumento, obtenerNombreArchivo, obtenerFechaDocumento } from '@/helpers/rutas';
import { usePermissionRestrictions } from '@/composables/usePermissionRestrictions';

const props = defineProps({
    documents: {
        type: Object as PropType<DocumentsByYear[string]>,
        required: true,
    },
    year: {
        type: String as PropType<string>,
        required: true,
    },
    trabajador: {
        type: Object as PropType<{
            primerApellido?: string;
            segundoApellido?: string;
            nombre?: string;
        }>,
        required: true,
    },
    toggleRouteSelection: {
        type: Function as PropType<(route: string, isSelected: boolean) => void>,
        required: true,
    },
    selectedRoutes: {
        type: Array as PropType<string[]>,
        required: true,
    },
    // Nuevas props para el modo eliminación
    isDeletionMode: {
        type: Boolean,
        default: false,
    },
    toggleDeletionMode: {
        type: Function as PropType<() => void>,
        required: true,
    },
    onDeleteSelected: {
        type: Function as PropType<() => void>,
        required: true,
    },
});

const emit = defineEmits(['abrirModalUpdate', 'eliminarDocumento', 'openSubscriptionModal']);

// Composables de permisos
const { 
  canManageDocumentosDiagnostico,
  canManageDocumentosEvaluacion,
  canManageDocumentosExternos,
  canManageCuestionariosAdicionales
} = usePermissionRestrictions();

// Verificar si el usuario tiene todos los permisos necesarios para eliminar documentos
const canDeleteAnyDocument = computed(() => {
  return canManageDocumentosDiagnostico.value &&
         canManageDocumentosEvaluacion.value &&
         canManageDocumentosExternos.value &&
         canManageCuestionariosAdicionales.value;
});

// Calcular el total de documentos para mostrar en el header
const slots = useSlots();
const totalDocumentos = computed(() => {
    return (props.documents.constanciasAptitud?.length || 0) +
           (props.documents.aptitudes?.length || 0) +
           (props.documents.historiasClinicas?.length || 0) +
           (props.documents.exploracionesFisicas?.length || 0) +
           (props.documents.examenesVista?.length || 0) +
           (props.documents.audiometrias?.length || 0) +
           (props.documents.antidopings?.length || 0) +
           (props.documents.certificados?.length || 0) +
           (props.documents.certificadosExpedito?.length || 0) +
           (props.documents.documentosExternos?.length || 0) +
           (props.documents.notasMedicas?.length || 0) +
           (props.documents.controlPrenatal?.length || 0) +
           (props.documents.historiaOtologica?.length || 0) +
           (props.documents.previoEspirometria?.length || 0) +
           (props.documents.recetas?.length || 0) +
           (props.documents.entrevistasPsicologicas?.length || 0) +
           (props.documents.trastornosEstadoAnimo?.length || 0) +
           (props.documents.cuestionarioProdromalBreve?.length || 0) +
           (props.documents.trastornoLimitePersonalidad?.length || 0) + 
           (props.documents.eventoSeguimientoCardiometabolico?.length || 0);
});

// Obtener todas las rutas de documentos de este grupo específico
const rutasDelGrupo = computed(() => {
    const rutas: string[] = [];
    
    if (props.documents.constanciasAptitud) {
        props.documents.constanciasAptitud.forEach(constanciaAptitud => {
            const rutaBase = obtenerRutaDocumento(constanciaAptitud, 'Constancia de Aptitud');
            const fecha = obtenerFechaDocumento(constanciaAptitud) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(constanciaAptitud, 'Constancia de Aptitud', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }
    if (props.documents.aptitudes) {
        props.documents.aptitudes.forEach(aptitud => {
            const rutaBase = obtenerRutaDocumento(aptitud, 'Aptitud');
            const fecha = obtenerFechaDocumento(aptitud) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(aptitud, 'Aptitud', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }

    if (props.documents.historiasClinicas) {
        props.documents.historiasClinicas.forEach(historiaClinica => {
            const rutaBase = obtenerRutaDocumento(historiaClinica, 'Historia Clinica');
            const fecha = obtenerFechaDocumento(historiaClinica) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(historiaClinica, 'Historia Clinica', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }

    if (props.documents.exploracionesFisicas) {
        props.documents.exploracionesFisicas.forEach(exploracionFisica => {
            const rutaBase = obtenerRutaDocumento(exploracionFisica, 'Exploracion Fisica');
            const fecha = obtenerFechaDocumento(exploracionFisica) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(exploracionFisica, 'Exploracion Fisica', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }

    if (props.documents.examenesVista) {
        props.documents.examenesVista.forEach(examenVista => {
            const rutaBase = obtenerRutaDocumento(examenVista, 'Examen Vista');
            const fecha = obtenerFechaDocumento(examenVista) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(examenVista, 'Examen Vista', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }

    if (props.documents.audiometrias) {
        props.documents.audiometrias.forEach(audiometria => {
            const rutaBase = obtenerRutaDocumento(audiometria, 'Audiometria');
            const fecha = obtenerFechaDocumento(audiometria) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(audiometria, 'Audiometria', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }

    if (props.documents.antidopings) {
        props.documents.antidopings.forEach(antidoping => {
            const rutaBase = obtenerRutaDocumento(antidoping, 'Antidoping');
            const fecha = obtenerFechaDocumento(antidoping) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(antidoping, 'Antidoping', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }

    if (props.documents.certificados) {
        props.documents.certificados.forEach(certificado => {
            const rutaBase = obtenerRutaDocumento(certificado, 'Certificado');
            const fecha = obtenerFechaDocumento(certificado) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(certificado, 'Certificado', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }

    if (props.documents.certificadosExpedito) {

        props.documents.certificadosExpedito.forEach(certificadoExpedito => {
            const rutaBase = obtenerRutaDocumento(certificadoExpedito, 'Certificado Expedito');
            const fecha = obtenerFechaDocumento(certificadoExpedito) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(certificadoExpedito, 'Certificado Expedito', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }

    if (props.documents.documentosExternos) {
        props.documents.documentosExternos.forEach(documentoExterno => {
            const rutaBase = obtenerRutaDocumento(documentoExterno, 'Documento Externo');
            const fecha = obtenerFechaDocumento(documentoExterno) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(documentoExterno, 'Documento Externo', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }

    if (props.documents.notasMedicas) {
        props.documents.notasMedicas.forEach(notaMedica => {
            const rutaBase = obtenerRutaDocumento(notaMedica, 'Nota Medica');
            const fecha = obtenerFechaDocumento(notaMedica) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(notaMedica, 'Nota Medica', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }

    if (props.documents.controlPrenatal) {
        props.documents.controlPrenatal.forEach(controlPrenatal => {
            const rutaBase = obtenerRutaDocumento(controlPrenatal, 'Control Prenatal');
            const fecha = obtenerFechaDocumento(controlPrenatal) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(controlPrenatal, 'Control Prenatal', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }

    if (props.documents.historiaOtologica) {
        props.documents.historiaOtologica.forEach(historiaOtologica => {
            const rutaBase = obtenerRutaDocumento(historiaOtologica, 'Historia Otologica');
            const fecha = obtenerFechaDocumento(historiaOtologica) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(historiaOtologica, 'Historia Otologica', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }

    if (props.documents.previoEspirometria) {
        props.documents.previoEspirometria.forEach(previoEspirometria => {
            const rutaBase = obtenerRutaDocumento(previoEspirometria, 'Previo Espirometria');
            const fecha = obtenerFechaDocumento(previoEspirometria) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(previoEspirometria, 'Previo Espirometria', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }

    if (props.documents.recetas) {
        props.documents.recetas.forEach(receta => {
            const rutaBase = obtenerRutaDocumento(receta, 'Receta');
            const fecha = obtenerFechaDocumento(receta) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(receta, 'Receta', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }

    if (props.documents.entrevistasPsicologicas) {
        props.documents.entrevistasPsicologicas.forEach(entrevistaPsicologica => {
            const rutaBase = obtenerRutaDocumento(entrevistaPsicologica, 'Entrevista Psicologica');
            const fecha = obtenerFechaDocumento(entrevistaPsicologica) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(entrevistaPsicologica, 'Entrevista Psicologica', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }

    if (props.documents.trastornosEstadoAnimo) {
        props.documents.trastornosEstadoAnimo.forEach(trastornosEstadoAnimo => {
            const rutaBase = obtenerRutaDocumento(trastornosEstadoAnimo, 'Trastornos Estado Animo');
            const fecha = obtenerFechaDocumento(trastornosEstadoAnimo) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(trastornosEstadoAnimo, 'Trastornos Estado Animo', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }

    if (props.documents.cuestionarioProdromalBreve) {
        props.documents.cuestionarioProdromalBreve.forEach(cuestionarioProdromalBreve => {
            const rutaBase = obtenerRutaDocumento(cuestionarioProdromalBreve, 'Cuestionario Prodromal Breve');
            const fecha = obtenerFechaDocumento(cuestionarioProdromalBreve) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(cuestionarioProdromalBreve, 'Cuestionario Prodromal Breve', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }

    if (props.documents.trastornoLimitePersonalidad) {
        props.documents.trastornoLimitePersonalidad.forEach(trastornoLimitePersonalidad => {
            const rutaBase = obtenerRutaDocumento(trastornoLimitePersonalidad, 'Trastorno Limite Personalidad');
            const fecha = obtenerFechaDocumento(trastornoLimitePersonalidad) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(trastornoLimitePersonalidad, 'Trastorno Limite Personalidad', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }

    if (props.documents.eventoSeguimientoCardiometabolico) {
        props.documents.eventoSeguimientoCardiometabolico.forEach(eventoSeguimientoCardiometabolico => {
            const rutaBase = obtenerRutaDocumento(eventoSeguimientoCardiometabolico, 'Evento Seguimiento Cardiometabolico');
            const fecha = obtenerFechaDocumento(eventoSeguimientoCardiometabolico) || 'SinFecha';
            const nombreArchivo = obtenerNombreArchivo(eventoSeguimientoCardiometabolico, 'Evento Seguimiento Cardiometabolico', fecha);
            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
            rutas.push(ruta);
        });
    }

    return rutas;
});

// Calcular cuántos documentos de este grupo están seleccionados
const documentosSeleccionadosDelGrupo = computed(() => {
    return rutasDelGrupo.value.filter(ruta => props.selectedRoutes.includes(ruta)).length;
});

// Determinar si todos los documentos de este grupo están seleccionados
const selectAll = computed({
    get: () => {
        return totalDocumentos.value > 0 && documentosSeleccionadosDelGrupo.value === totalDocumentos.value;
    },
    set: (value: boolean) => {
        // Aplicar la selección solo a los documentos de este grupo
        rutasDelGrupo.value.forEach(ruta => {
            props.toggleRouteSelection(ruta, value);
        });
    }
});

const toggleSelectAll = () => {
    selectAll.value = !selectAll.value;
};

const hasExtraSection = computed(() => !!slots.extraSection);
</script>

<template>
    <div class="w-full rounded-xl shadow-lg overflow-hidden border border-gray-100 bg-white transition-all duration-300 hover:shadow-xl">
        <!-- Header mejorado con gradiente y contador -->
        <div class="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 relative overflow-hidden">
            <!-- Patrón de fondo sutil -->
            <div class="absolute inset-0 bg-black opacity-5">
                <div class="absolute inset-0" style="background-image: radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 20px 20px;"></div>
            </div>
            
            <div class="relative px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                    <!-- Icono de calendario -->
                    <div class="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                    
                    <div>
                        <h1 class="text-xl sm:text-2xl font-semibold text-white tracking-normal">
                            Expediente {{ year }}
                        </h1>
                        <p class="text-emerald-100 text-xs sm:text-sm font-medium tracking-wide">
                            {{ totalDocumentos }} documento{{ totalDocumentos !== 1 ? 's' : '' }} en total
                        </p>
                    </div>
                </div>
                
                <!-- Indicador de modo eliminación centrado -->
                <div v-if="isDeletionMode" class="pointer-events-none flex justify-center md:justify-end lg:justify-center w-full md:w-auto md:absolute md:inset-0 md:mr-4">
                    <div class="flex items-center space-x-3 bg-red-600 bg-opacity-90 rounded-xl px-6 py-3 shadow-lg animate-fade-pulse">
                        <i class="fas fa-exclamation-triangle text-red-100 text-lg"></i>
                        <span class="text-white text-lg font-semibold">Modo eliminación activado</span>
                        <i class="fas fa-exclamation-triangle text-red-100 text-lg"></i>
                    </div>
                </div>
                
                <!-- Indicador de selección -->
                <div v-if="documentosSeleccionadosDelGrupo > 0" class="hidden lg:flex items-center space-x-2 rounded-lg px-3 py-1"
                     :class="isDeletionMode ? 'bg-red-500 bg-opacity-20' : 'bg-white bg-opacity-20'">
                    <div class="w-2 h-2 rounded-full animate-pulse"
                         :class="isDeletionMode ? 'bg-red-300' : 'bg-yellow-300'"></div>
                    <span class="text-white text-sm font-medium">
                        {{ documentosSeleccionadosDelGrupo }} seleccionado{{ documentosSeleccionadosDelGrupo !== 1 ? 's' : '' }}<span v-if="isDeletionMode" class="ml-1">para eliminar</span>
                    </span>
                </div>
            </div>
        </div>

        <!-- Barra de selección mejorada -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 transition-all duration-200 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200">
            <div class="flex flex-wrap items-start sm:items-center gap-3 sm:gap-4">
                <!-- Checkbox personalizado -->
                <div class="relative">
                    <input
                        class="sr-only"
                        type="checkbox"
                        :checked="selectAll"
                        @change="toggleSelectAll"
                        :id="`select-all-checkbox-${year}`"
                    >
                    <label 
                        :for="`select-all-checkbox-${year}`"
                        class="flex items-center justify-center w-6 h-6 border-2 rounded-md cursor-pointer transition-all duration-200"
                        :class="{
                            'bg-emerald-500 border-emerald-600 shadow-sm': selectAll && !isDeletionMode,
                            'bg-red-500 border-red-600 shadow-sm': selectAll && isDeletionMode,
                            'border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 hover:scale-105': !selectAll && !isDeletionMode,
                            'border-gray-300 hover:border-red-500 hover:bg-red-50 hover:scale-105': !selectAll && isDeletionMode
                        }"
                    >
                        <svg v-if="selectAll" class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                        </svg>
                    </label>
                </div>
                
                <div class="flex flex-col">
                    <label :for="`select-all-checkbox-${year}`" class="font-semibold cursor-pointer transition-colors duration-200 ml-0.5"
                           :class="isDeletionMode ? 'text-red-700 hover:text-red-800' : 'text-gray-700 hover:text-emerald-600'">
                           Seleccionar Todos
                        <!-- {{ isDeletionMode ? 'Seleccionar Todos para Eliminar' : 'Seleccionar Todos' }} -->
                    </label>
                    <span class="text-xs ml-0.5"
                          :class="isDeletionMode ? 'text-red-500' : 'text-gray-500'">
                        {{ documentosSeleccionadosDelGrupo }} de {{ totalDocumentos }} documentos
                    </span>
                </div>
            </div>

            <!-- Botón de modo eliminación (solo visible si tiene todos los permisos) -->
            <div v-if="canDeleteAnyDocument" class="flex items-center w-full sm:w-auto justify-center sm:justify-end gap-2">
                <button
                    @click="toggleDeletionMode"
                    class="flex items-center justify-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-medium w-full sm:w-auto"
                    :class="isDeletionMode 
                        ? 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 hover:border-red-400 shadow-sm' 
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700'"
                >
                    <i class="fas fa-trash-alt text-xs" :class="isDeletionMode ? 'text-red-600' : 'text-gray-400'"></i>
                    <span class="md:hidden">{{ isDeletionMode ? 'Desactivar' : 'Modo Eliminación' }}</span>
                    <span class="hidden md:inline">{{ isDeletionMode ? 'Desactivar Modo Eliminación' : 'Activar Modo Eliminación' }}</span>
                </button>
            </div>
        </div>

        <!-- Contenido de documentos con espaciado mejorado -->
        <div class="divide-gray-100">

            <!-- Constancias de Aptitud -->
            <div v-if="documents.constanciasAptitud && documents.constanciasAptitud.length > 0">
                <div v-for="(constanciaAptitud, index) in documents.constanciasAptitud" :key="constanciaAptitud._id" 
                     class="transition-all duration-200 hover:bg-gray-50"
                     :style="{ animationDelay: `${index * 50}ms` }">
                    <DocumentoItem 
                        :constanciaAptitud="constanciaAptitud" 
                        :documentoId="constanciaAptitud._id" 
                        :documentoTipo="'constanciaAptitud'" 
                        :toggleRouteSelection="toggleRouteSelection" 
                        :isDeletionMode="isDeletionMode"
                        :isSelected="(() => {
                            const rutaBase = obtenerRutaDocumento(constanciaAptitud, 'Constancia de Aptitud');
                            const fecha = obtenerFechaDocumento(constanciaAptitud) || 'SinFecha';
                            const nombreArchivo = obtenerNombreArchivo(constanciaAptitud, 'Constancia de Aptitud', fecha);
                            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                            return props.selectedRoutes.includes(ruta);
                        })()"
                        @eliminarDocumento="$emit('eliminarDocumento', constanciaAptitud._id, convertirFechaISOaDDMMYYYY(constanciaAptitud.fechaConstanciaAptitud), 'constanciaAptitud')" 
                        @openSubscriptionModal="emit('openSubscriptionModal')"
                    />
                </div>
            </div>

            <!-- Aptitudes -->
            <div v-if="documents.aptitudes && documents.aptitudes.length > 0">
                <div v-for="(aptitud, index) in documents.aptitudes" :key="aptitud._id" 
                     class="transition-all duration-200 hover:bg-gray-50"
                     :style="{ animationDelay: `${index * 50}ms` }">
                    <DocumentoItem 
                        :aptitud="aptitud" 
                        :documentoId="aptitud._id" 
                        :documentoTipo="'aptitud'" 
                        :toggleRouteSelection="toggleRouteSelection" 
                        :isDeletionMode="isDeletionMode"
                        :isSelected="(() => {
                            const rutaBase = obtenerRutaDocumento(aptitud, 'Aptitud');
                            const fecha = obtenerFechaDocumento(aptitud) || 'SinFecha';
                            const nombreArchivo = obtenerNombreArchivo(aptitud, 'Aptitud', fecha);
                            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                            return props.selectedRoutes.includes(ruta);
                        })()"
                        @eliminarDocumento="$emit('eliminarDocumento', aptitud._id, convertirFechaISOaDDMMYYYY(aptitud.fechaAptitudPuesto), 'aptitud')" 
                        @openSubscriptionModal="emit('openSubscriptionModal')"
                    />
                </div>
            </div>

            <!-- Historias Clinicas -->
            <div v-if="documents.historiasClinicas && documents.historiasClinicas.length > 0">
                <div v-for="(historiaClinica, index) in documents.historiasClinicas" :key="historiaClinica._id"
                     class="transition-all duration-200 hover:bg-gray-50"
                     :style="{ animationDelay: `${index * 50}ms` }">
                    <DocumentoItem 
                        :historiaClinica="historiaClinica" 
                        :documentoId="historiaClinica._id"
                        :documentoTipo="'historiaClinica'" 
                        :toggleRouteSelection="toggleRouteSelection"
                        :isDeletionMode="isDeletionMode"
                        :isSelected="(() => {
                            const rutaBase = obtenerRutaDocumento(historiaClinica, 'Historia Clinica');
                            const fecha = obtenerFechaDocumento(historiaClinica) || 'SinFecha';
                            const nombreArchivo = obtenerNombreArchivo(historiaClinica, 'Historia Clinica', fecha);
                            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                            return props.selectedRoutes.includes(ruta);
                        })()"
                        @eliminarDocumento="$emit('eliminarDocumento', historiaClinica._id, convertirFechaISOaDDMMYYYY(historiaClinica.fechaHistoriaClinica), 'historiaClinica')" 
                        @openSubscriptionModal="emit('openSubscriptionModal')"
                    />
                </div>
            </div>

            <!-- Exploraciones Fisicas -->
            <div v-if="documents.exploracionesFisicas && documents.exploracionesFisicas.length > 0">
                <div v-for="(exploracionFisica, index) in documents.exploracionesFisicas" :key="exploracionFisica._id"
                     class="transition-all duration-200 hover:bg-gray-50"
                     :style="{ animationDelay: `${index * 50}ms` }">
                    <DocumentoItem 
                        :exploracionFisica="exploracionFisica" 
                        :documentoId="exploracionFisica._id"
                        :documentoTipo="'exploracionFisica'" 
                        :toggleRouteSelection="toggleRouteSelection"
                        :isDeletionMode="isDeletionMode"
                        :isSelected="(() => {
                            const rutaBase = obtenerRutaDocumento(exploracionFisica, 'Exploracion Fisica');
                            const fecha = obtenerFechaDocumento(exploracionFisica) || 'SinFecha';
                            const nombreArchivo = obtenerNombreArchivo(exploracionFisica, 'Exploracion Fisica', fecha);
                            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                            return props.selectedRoutes.includes(ruta);
                        })()"
                        @eliminarDocumento="$emit('eliminarDocumento', exploracionFisica._id, convertirFechaISOaDDMMYYYY(exploracionFisica.fechaExploracionFisica), 'exploracionFisica')" 
                        @openSubscriptionModal="emit('openSubscriptionModal')"
                    />
                </div>
            </div>

            <!-- Examenes de la Vista -->
            <div v-if="documents.examenesVista && documents.examenesVista.length > 0">
                <div v-for="(examenVista, index) in documents.examenesVista" :key="examenVista._id"
                     class="transition-all duration-200 hover:bg-gray-50"
                     :style="{ animationDelay: `${index * 50}ms` }">
                    <DocumentoItem 
                        :examenVista="examenVista" 
                        :documentoId="examenVista._id" 
                        :documentoTipo="'examenVista'" 
                        :toggleRouteSelection="toggleRouteSelection"
                        :isDeletionMode="isDeletionMode"
                        :isSelected="(() => {
                            const rutaBase = obtenerRutaDocumento(examenVista, 'Examen Vista');
                            const fecha = obtenerFechaDocumento(examenVista) || 'SinFecha';
                            const nombreArchivo = obtenerNombreArchivo(examenVista, 'Examen Vista', fecha);
                            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                            return props.selectedRoutes.includes(ruta);
                        })()"
                        @eliminarDocumento="$emit('eliminarDocumento', examenVista._id, convertirFechaISOaDDMMYYYY(examenVista.fechaExamenVista), 'examenVista')" 
                        @openSubscriptionModal="emit('openSubscriptionModal')"
                    />
                </div>
            </div>

            <!-- Historia Otologica -->
            <div v-if="documents.historiaOtologica && documents.historiaOtologica.length > 0">
                <div v-for="(historiaOtologica, index) in documents.historiaOtologica" :key="historiaOtologica._id"
                     class="transition-all duration-200 hover:bg-gray-50"
                     :style="{ animationDelay: `${index * 50}ms` }">
                    <DocumentoItem 
                        :historiaOtologica="historiaOtologica" 
                        :documentoId="historiaOtologica._id" 
                        :documentoTipo="'historiaOtologica'" 
                        :toggleRouteSelection="toggleRouteSelection"
                        :isDeletionMode="isDeletionMode"
                        :isSelected="(() => {
                            const rutaBase = obtenerRutaDocumento(historiaOtologica, 'Historia Otologica');
                            const fecha = obtenerFechaDocumento(historiaOtologica) || 'SinFecha';
                            const nombreArchivo = obtenerNombreArchivo(historiaOtologica, 'Historia Otologica', fecha);
                            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                            return props.selectedRoutes.includes(ruta);
                        })()"
                        @eliminarDocumento="$emit('eliminarDocumento', historiaOtologica._id, convertirFechaISOaDDMMYYYY(historiaOtologica.fechaHistoriaOtologica), 'historiaOtologica')" 
                        @openSubscriptionModal="emit('openSubscriptionModal')"
                    />
                </div>
            </div>

            <!-- Audiometrías -->
            <div v-if="documents.audiometrias && documents.audiometrias.length > 0">
                <div v-for="(audiometria, index) in documents.audiometrias" :key="audiometria._id"
                     class="transition-all duration-200 hover:bg-gray-50"
                     :style="{ animationDelay: `${index * 50}ms` }">
                    <DocumentoItem 
                        :audiometria="audiometria" 
                        :documentoId="audiometria._id" 
                        :documentoTipo="'audiometria'" 
                        :toggleRouteSelection="toggleRouteSelection"
                        :isDeletionMode="isDeletionMode"
                        :isSelected="(() => {
                            const rutaBase = obtenerRutaDocumento(audiometria, 'Audiometria');
                            const fecha = obtenerFechaDocumento(audiometria) || 'SinFecha';
                            const nombreArchivo = obtenerNombreArchivo(audiometria, 'Audiometria', fecha);
                            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                            return props.selectedRoutes.includes(ruta);
                        })()"
                        @eliminarDocumento="$emit('eliminarDocumento', audiometria._id, convertirFechaISOaDDMMYYYY(audiometria.fechaAudiometria), 'audiometria')" 
                        @openSubscriptionModal="emit('openSubscriptionModal')"
                    />
                </div>
            </div>

            <!-- Antidopings -->
            <div v-if="documents.antidopings && documents.antidopings.length > 0">
                <div v-for="(antidoping, index) in documents.antidopings" :key="antidoping._id"
                     class="transition-all duration-200 hover:bg-gray-50"
                     :style="{ animationDelay: `${index * 50}ms` }">
                    <DocumentoItem 
                        :antidoping="antidoping" 
                        :documentoId="antidoping._id" 
                        :documentoTipo="'antidoping'" 
                        :toggleRouteSelection="toggleRouteSelection"
                        :isDeletionMode="isDeletionMode"
                        :isSelected="(() => {
                            const rutaBase = obtenerRutaDocumento(antidoping, 'Antidoping');
                            const fecha = obtenerFechaDocumento(antidoping) || 'SinFecha';
                            const nombreArchivo = obtenerNombreArchivo(antidoping, 'Antidoping', fecha);
                            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                            return props.selectedRoutes.includes(ruta);
                        })()"
                        @eliminarDocumento="$emit('eliminarDocumento', antidoping._id, convertirFechaISOaDDMMYYYY(antidoping.fechaAntidoping), 'antidoping')" 
                        @openSubscriptionModal="emit('openSubscriptionModal')"
                    />
                </div>
            </div>

            <!-- Certificados -->
            <div v-if="documents.certificados && documents.certificados.length > 0">
                <div v-for="(certificado, index) in documents.certificados" :key="certificado._id"
                     class="transition-all duration-200 hover:bg-gray-50"
                     :style="{ animationDelay: `${index * 50}ms` }">
                    <DocumentoItem 
                        :certificado="certificado" 
                        :documentoId="certificado._id" 
                        :documentoTipo="'certificado'" 
                        :toggleRouteSelection="toggleRouteSelection"
                        :isDeletionMode="isDeletionMode"
                        :isSelected="(() => {
                            const rutaBase = obtenerRutaDocumento(certificado, 'Certificado');
                            const fecha = obtenerFechaDocumento(certificado) || 'SinFecha';
                            const nombreArchivo = obtenerNombreArchivo(certificado, 'Certificado', fecha);
                            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                            return props.selectedRoutes.includes(ruta);
                        })()"
                        @eliminarDocumento="$emit('eliminarDocumento', certificado._id, convertirFechaISOaDDMMYYYY(certificado.fechaCertificado), 'certificado')" 
                        @openSubscriptionModal="emit('openSubscriptionModal')"
                    />
                </div>
            </div>

            <!-- Previo Espirometria -->
            <div v-if="documents.previoEspirometria && documents.previoEspirometria.length > 0">
                <div v-for="(previoEspirometria, index) in documents.previoEspirometria" :key="previoEspirometria._id"
                     class="transition-all duration-200 hover:bg-gray-50"
                     :style="{ animationDelay: `${index * 50}ms` }">
                    <DocumentoItem 
                        :previoEspirometria="previoEspirometria" 
                        :documentoId="previoEspirometria._id" 
                        :documentoTipo="'previoEspirometria'" 
                        :toggleRouteSelection="toggleRouteSelection"
                        :isDeletionMode="isDeletionMode"
                        :isSelected="(() => {
                            const rutaBase = obtenerRutaDocumento(previoEspirometria, 'Previo Espirometria');
                            const fecha = obtenerFechaDocumento(previoEspirometria) || 'SinFecha';
                            const nombreArchivo = obtenerNombreArchivo(previoEspirometria, 'Previo Espirometria', fecha);
                            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                            return props.selectedRoutes.includes(ruta);
                        })()"
                        @eliminarDocumento="$emit('eliminarDocumento', previoEspirometria._id, convertirFechaISOaDDMMYYYY(previoEspirometria.fechaPrevioEspirometria), 'previoEspirometria')" 
                        @openSubscriptionModal="emit('openSubscriptionModal')"
                    />
                </div>
            </div>

            <!-- Documentos Externos -->
            <div v-if="documents.documentosExternos && documents.documentosExternos.length > 0">
                <div v-for="(documentoExterno, index) in documents.documentosExternos" :key="documentoExterno._id"
                     class="transition-all duration-200 hover:bg-gray-50"
                     :style="{ animationDelay: `${index * 50}ms` }">
                    <DocumentoItem 
                        :documentoExterno="documentoExterno" 
                        :documentoId="documentoExterno._id"
                        :documentoTipo="'documentoExterno'" 
                        :toggleRouteSelection="toggleRouteSelection"
                        :isDeletionMode="isDeletionMode"
                        :isSelected="(() => {
                            const rutaBase = obtenerRutaDocumento(documentoExterno, 'Documento Externo');
                            const fecha = obtenerFechaDocumento(documentoExterno) || 'SinFecha';
                            const nombreArchivo = obtenerNombreArchivo(documentoExterno, 'Documento Externo', fecha);
                            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                            return props.selectedRoutes.includes(ruta);
                        })()"
                        @eliminarDocumento="$emit('eliminarDocumento', documentoExterno._id, convertirFechaISOaDDMMYYYY(documentoExterno.fechaDocumento), 'documentoExterno')"
                        @abrirModalUpdate="$emit('abrirModalUpdate')" 
                        @openSubscriptionModal="emit('openSubscriptionModal')"
                    />
                </div>
            </div>

            <!-- Notas Medicas -->
            <div v-if="documents.notasMedicas && documents.notasMedicas.length > 0">
                <div v-for="(notaMedica, index) in documents.notasMedicas" :key="notaMedica._id"
                     class="transition-all duration-200 hover:bg-gray-50"
                     :style="{ animationDelay: `${index * 50}ms` }">
                    <DocumentoItem 
                        :notaMedica="notaMedica" 
                        :documentoId="notaMedica._id" 
                        :documentoTipo="'notaMedica'" 
                        :toggleRouteSelection="toggleRouteSelection"
                        :isDeletionMode="isDeletionMode"
                        :isSelected="(() => {
                            const rutaBase = obtenerRutaDocumento(notaMedica, 'Nota Medica');
                            const fecha = obtenerFechaDocumento(notaMedica) || 'SinFecha';
                            const nombreArchivo = obtenerNombreArchivo(notaMedica, 'Nota Medica', fecha);
                            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                            return props.selectedRoutes.includes(ruta);
                        })()"
                        @eliminarDocumento="$emit('eliminarDocumento', notaMedica._id, convertirFechaISOaDDMMYYYY(notaMedica.fechaNotaMedica), 'notaMedica')" 
                        @openSubscriptionModal="emit('openSubscriptionModal')"
                    />
                </div>
            </div>

            <!-- Control Prenatal -->
            <div v-if="documents.controlPrenatal && documents.controlPrenatal.length > 0">
                <div v-for="(controlPrenatal, index) in documents.controlPrenatal" :key="controlPrenatal._id"
                     class="transition-all duration-200 hover:bg-gray-50"
                     :style="{ animationDelay: `${index * 50}ms` }">
                    <DocumentoItem 
                        :controlPrenatal="controlPrenatal" 
                        :documentoId="controlPrenatal._id" 
                        :documentoTipo="'controlPrenatal'" 
                        :toggleRouteSelection="toggleRouteSelection"
                        :isDeletionMode="isDeletionMode"
                        :isSelected="(() => {
                            const rutaBase = obtenerRutaDocumento(controlPrenatal, 'Control Prenatal');
                            const fecha = obtenerFechaDocumento(controlPrenatal) || 'SinFecha';
                            const nombreArchivo = obtenerNombreArchivo(controlPrenatal, 'Control Prenatal', fecha);
                            const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                            return props.selectedRoutes.includes(ruta);
                        })()"
                        @eliminarDocumento="$emit('eliminarDocumento', controlPrenatal._id, convertirFechaISOaDDMMYYYY(controlPrenatal.fechaInicioControlPrenatal), 'controlPrenatal')" 
                        @openSubscriptionModal="emit('openSubscriptionModal')"
                    />
                </div>
            </div>
            
        </div>

        <!-- Certificados Expedito -->
        <div v-if="documents.certificadosExpedito && documents.certificadosExpedito.length > 0">
            <div v-for="(certificadoExpedito, index) in documents.certificadosExpedito" :key="certificadoExpedito._id"
                    class="transition-all duration-200 hover:bg-gray-50"
                    :style="{ animationDelay: `${index * 50}ms` }">
                <DocumentoItem 
                    :certificadoExpedito="certificadoExpedito" 
                    :documentoId="certificadoExpedito._id" 
                    :documentoTipo="'certificadoExpedito'" 
                    :toggleRouteSelection="toggleRouteSelection"
                    :isDeletionMode="isDeletionMode"
                    :isSelected="(() => {
                        const rutaBase = obtenerRutaDocumento(certificadoExpedito, 'Certificado Expedito');
                        const fecha = obtenerFechaDocumento(certificadoExpedito) || 'SinFecha';
                        const nombreArchivo = obtenerNombreArchivo(certificadoExpedito, 'Certificado Expedito', fecha);
                        const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                        return props.selectedRoutes.includes(ruta);
                    })()"
                    @eliminarDocumento="$emit('eliminarDocumento', certificadoExpedito._id, convertirFechaISOaDDMMYYYY(certificadoExpedito.fechaCertificadoExpedito), 'certificadoExpedito')" 
                    @openSubscriptionModal="emit('openSubscriptionModal')"
                />
            </div>
        </div>

        <!-- Recetas -->
        <div v-if="documents.recetas && documents.recetas.length > 0">
            <div v-for="(receta, index) in documents.recetas" :key="receta._id"
                 class="transition-all duration-200 hover:bg-gray-50"
                 :style="{ animationDelay: `${index * 50}ms` }">
                <DocumentoItem 
                    :receta="receta" 
                    :documentoId="receta._id" 
                    :documentoTipo="'receta'" 
                    :toggleRouteSelection="toggleRouteSelection"
                    :isDeletionMode="isDeletionMode"
                    :isSelected="(() => {
                        const rutaBase = obtenerRutaDocumento(receta, 'Receta');
                        const fecha = obtenerFechaDocumento(receta) || 'SinFecha';
                        const nombreArchivo = obtenerNombreArchivo(receta, 'Receta', fecha);
                        const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                        return props.selectedRoutes.includes(ruta);
                    })()"
                    @eliminarDocumento="$emit('eliminarDocumento', receta._id, convertirFechaISOaDDMMYYYY(receta.fechaReceta), 'receta')" 
                    @openSubscriptionModal="emit('openSubscriptionModal')"
                />
            </div>
        </div>

        <!-- Entrevista Psicologica -->
        <div v-if="documents.entrevistasPsicologicas && documents.entrevistasPsicologicas.length > 0">
            <div v-for="(entrevistaPsicologica, index) in documents.entrevistasPsicologicas" :key="entrevistaPsicologica._id"
                 class="transition-all duration-200 hover:bg-gray-50"
                 :style="{ animationDelay: `${index * 50}ms` }">
                <DocumentoItem 
                    :entrevistaPsicologica="entrevistaPsicologica" 
                    :documentoId="entrevistaPsicologica._id" 
                    :documentoTipo="'entrevistaPsicologica'" 
                    :toggleRouteSelection="toggleRouteSelection"
                    :isDeletionMode="isDeletionMode"
                    :isSelected="(() => {
                        const rutaBase = obtenerRutaDocumento(entrevistaPsicologica, 'Entrevista Psicologica');
                        const fecha = obtenerFechaDocumento(entrevistaPsicologica) || 'SinFecha';
                        const nombreArchivo = obtenerNombreArchivo(entrevistaPsicologica, 'Entrevista Psicologica', fecha);
                        const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                        return props.selectedRoutes.includes(ruta);
                    })()"
                    @eliminarDocumento="$emit('eliminarDocumento', entrevistaPsicologica._id, convertirFechaISOaDDMMYYYY(entrevistaPsicologica.fechaEntrevistaPsicologica), 'entrevistaPsicologica')" 
                    @openSubscriptionModal="emit('openSubscriptionModal')"
                />
            </div>
        </div>

        <!-- Trastornos Estado Animo -->
        <div v-if="documents.trastornosEstadoAnimo && documents.trastornosEstadoAnimo.length > 0">
            <div v-for="(trastornosEstadoAnimo, index) in documents.trastornosEstadoAnimo" :key="trastornosEstadoAnimo._id"
                 class="transition-all duration-200 hover:bg-gray-50"
                 :style="{ animationDelay: `${index * 50}ms` }">
                <DocumentoItem 
                    :trastornosEstadoAnimo="trastornosEstadoAnimo" 
                    :documentoId="trastornosEstadoAnimo._id" 
                    :documentoTipo="'trastornosEstadoAnimo'" 
                    :toggleRouteSelection="toggleRouteSelection"
                    :isDeletionMode="isDeletionMode"
                    :isSelected="(() => {
                        const rutaBase = obtenerRutaDocumento(trastornosEstadoAnimo, 'Trastornos Estado Animo');
                        const fecha = obtenerFechaDocumento(trastornosEstadoAnimo) || 'SinFecha';
                        const nombreArchivo = obtenerNombreArchivo(trastornosEstadoAnimo, 'Trastornos Estado Animo', fecha);
                        const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                        return props.selectedRoutes.includes(ruta);
                    })()"
                    @eliminarDocumento="$emit('eliminarDocumento', trastornosEstadoAnimo._id, convertirFechaISOaDDMMYYYY(trastornosEstadoAnimo.fechaTrastornosEstadoAnimo), 'trastornosEstadoAnimo')" 
                    @openSubscriptionModal="emit('openSubscriptionModal')"
                />
            </div>
        </div>

        <!-- Cuestionario Prodromal Breve -->
        <div v-if="documents.cuestionarioProdromalBreve && documents.cuestionarioProdromalBreve.length > 0">
            <div v-for="(cuestionarioProdromalBreve, index) in documents.cuestionarioProdromalBreve" :key="cuestionarioProdromalBreve._id"
                 class="transition-all duration-200 hover:bg-gray-50"
                 :style="{ animationDelay: `${index * 50}ms` }">
                <DocumentoItem 
                    :cuestionarioProdromalBreve="cuestionarioProdromalBreve" 
                    :documentoId="cuestionarioProdromalBreve._id" 
                    :documentoTipo="'cuestionarioProdromalBreve'" 
                    :toggleRouteSelection="toggleRouteSelection"
                    :isDeletionMode="isDeletionMode"
                    :isSelected="(() => {
                        const rutaBase = obtenerRutaDocumento(cuestionarioProdromalBreve, 'Cuestionario Prodromal Breve');
                        const fecha = obtenerFechaDocumento(cuestionarioProdromalBreve) || 'SinFecha';
                        const nombreArchivo = obtenerNombreArchivo(cuestionarioProdromalBreve, 'Cuestionario Prodromal Breve', fecha);
                        const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                        return props.selectedRoutes.includes(ruta);
                    })()"
                    @eliminarDocumento="$emit('eliminarDocumento', cuestionarioProdromalBreve._id, convertirFechaISOaDDMMYYYY(cuestionarioProdromalBreve.fechaCuestionarioProdromalBreve), 'cuestionarioProdromalBreve')" 
                    @openSubscriptionModal="emit('openSubscriptionModal')"
                />
            </div>
        </div>

        <!-- Trastorno Limite Personalidad -->
        <div v-if="documents.trastornoLimitePersonalidad && documents.trastornoLimitePersonalidad.length > 0">
            <div v-for="(trastornoLimitePersonalidad, index) in documents.trastornoLimitePersonalidad" :key="trastornoLimitePersonalidad._id"
                 class="transition-all duration-200 hover:bg-gray-50"
                 :style="{ animationDelay: `${index * 50}ms` }">
                <DocumentoItem 
                    :trastornoLimitePersonalidad="trastornoLimitePersonalidad" 
                    :documentoId="trastornoLimitePersonalidad._id" 
                    :documentoTipo="'trastornoLimitePersonalidad'" 
                    :toggleRouteSelection="toggleRouteSelection"
                    :isDeletionMode="isDeletionMode"
                    :isSelected="(() => {
                        const rutaBase = obtenerRutaDocumento(trastornoLimitePersonalidad, 'Trastorno Limite Personalidad');
                        const fecha = obtenerFechaDocumento(trastornoLimitePersonalidad) || 'SinFecha';
                        const nombreArchivo = obtenerNombreArchivo(trastornoLimitePersonalidad, 'Trastorno Limite Personalidad', fecha);
                        const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                        return props.selectedRoutes.includes(ruta);
                    })()"
                    @eliminarDocumento="$emit('eliminarDocumento', trastornoLimitePersonalidad._id, convertirFechaISOaDDMMYYYY(trastornoLimitePersonalidad.fechaTrastornoLimitePersonalidad), 'trastornoLimitePersonalidad')" 
                    @openSubscriptionModal="emit('openSubscriptionModal')"
                />
            </div>
        </div>

        <!-- Evento Seguimiento Cardiometabolico -->
        <div v-if="documents.eventoSeguimientoCardiometabolico && documents.eventoSeguimientoCardiometabolico.length > 0">
            <div v-for="(eventoSeguimientoCardiometabolico, index) in documents.eventoSeguimientoCardiometabolico" :key="eventoSeguimientoCardiometabolico._id"
                 class="transition-all duration-200 hover:bg-gray-50"
                 :style="{ animationDelay: `${index * 50}ms` }">
                <DocumentoItem 
                    :eventoSeguimientoCardiometabolico="eventoSeguimientoCardiometabolico" 
                    :documentoId="eventoSeguimientoCardiometabolico._id" 
                    :documentoTipo="'eventoSeguimientoCardiometabolico'" 
                    :toggleRouteSelection="toggleRouteSelection"
                    :isDeletionMode="isDeletionMode"
                    :isSelected="(() => {
                        const rutaBase = obtenerRutaDocumento(eventoSeguimientoCardiometabolico, 'Evento Seguimiento Cardiometabolico');
                        const fecha = obtenerFechaDocumento(eventoSeguimientoCardiometabolico) || 'SinFecha';
                        const nombreArchivo = obtenerNombreArchivo(eventoSeguimientoCardiometabolico, 'Evento Seguimiento Cardiometabolico', fecha);
                        const ruta = `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
                        return props.selectedRoutes.includes(ruta);
                    })()"
                    @eliminarDocumento="$emit('eliminarDocumento', eventoSeguimientoCardiometabolico._id, convertirFechaISOaDDMMYYYY(eventoSeguimientoCardiometabolico.fechaEventoSeguimientoCardiometabolico), 'eventoSeguimientoCardiometabolico')" 
                    @openSubscriptionModal="emit('openSubscriptionModal')"
                />
            </div>
        </div>
        
        <div
            v-if="hasExtraSection"
            class="resultados-clinicos-extra-wrap border-t border-gray-200 bg-gray-50/70 px-4 py-4"
        >
            <slot name="extraSection" :year="year"></slot>
        </div>

        <!-- Estado vacío mejorado -->
        <div v-if="totalDocumentos === 0 && !hasExtraSection" class="p-12 text-center">
            <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No hay documentos</h3>
            <p class="text-gray-500">No se encontraron documentos para el año {{ year }}</p>
        </div>
    </div>
</template>

<style scoped>
/* Animaciones personalizadas */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.space-y-1 > div {
    animation: fadeInUp 0.3s ease-out forwards;
}

/* Hover effects mejorados */
.hover\:bg-gray-50:hover {
    background-color: #f9fafb;
    transform: translateX(2px);
}

/* Transiciones suaves */
.transition-all {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Efecto de sombra en hover */
.hover\:shadow-xl:hover {
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* Animación del indicador de selección */
.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: .5;
    }
}

/* Animación de desvanecido para el indicador de modo eliminación */
@keyframes fade-pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.4;
    }
}

.animate-fade-pulse {
    animation: fade-pulse 2s ease-in-out infinite;
}

/* Efectos de hover mejorados para modo eliminación */
.hover\:bg-red-50:hover {
    background-color: #fef2f2;
    transform: translateX(2px);
}

.hover\:border-red-300:hover {
    border-color: #fca5a5;
}

.hover\:border-red-400:hover {
    border-color: #f87171;
}


</style>
