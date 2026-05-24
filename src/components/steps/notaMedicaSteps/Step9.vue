<script setup>
import { watch, ref, onMounted, onUnmounted, computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import CIE10Autocomplete from '@/components/selectors/CIE10Autocomplete.vue';
import CIE10ComplementaryDiagnoses from '@/components/selectors/CIE10ComplementaryDiagnoses.vue';
import { validateCIE10Duplicates, validateCIE10SexAge, extractCIE10Code } from '@/helpers/cie10';
import {
  validateDiagnosticoPrincipalSis,
  fetchMedicoEnfermeraFirmantes,
} from '@/helpers/notaMedicaDiagnosticosSis';
import { useConfirmacionDiagnostica } from '@/composables/useConfirmacionDiagnostica';
import { useNom024Fields } from '@/composables/useNom024Fields';
import { useUserStore } from '@/stores/user';

const { formDataNotaMedica } = useFormDataStore();
const documentos = useDocumentosStore();
const proveedorSaludStore = useProveedorSaludStore();
const trabajadores = useTrabajadoresStore();
const userStore = useUserStore();

const { cie10Required } = useNom024Fields();
const showSiresUI = computed(() => proveedorSaludStore.showSiresUI);
const esMujer = computed(() => trabajadores.currentTrabajador?.sexo === 'Femenino');

const codigoCIE10Principal = ref('');
const codigosCIE10Complementarios = ref([]);

// NOM-024 GIIS-B015: Nuevos campos
const relacionTemporal = ref(null); // 0=Primera Vez, 1=Subsecuente
const confirmacionDiagnostica = ref(false);
const codigoCIECausaExterna = ref('');
const causaExterna = ref('');

// Estado para tooltip de relación temporal
const showRelacionTemporalTooltip = ref(false);
const relacionTemporalTooltipRef = ref(null);
const relacionTemporalIconRef = ref(null);

// Computed: fechaNotaMedica para calcular edad
const fechaNotaMedica = computed(() => {
  // Intentar obtener desde formData o desde documento actual
  const fecha = formDataNotaMedica.fechaNotaMedica || documentos.currentDocument?.fechaNotaMedica;
  if (fecha) {
    try {
      return new Date(fecha);
    } catch {
      return new Date();
    }
  }
  return new Date();
});

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

// Computed: Determinar si el diagnóstico principal requiere causa externa
const requiereCausaExterna = computed(() => {
  if (!codigoCIE10Principal.value) return false;
  const codigo = extractCode(codigoCIE10Principal.value);
  const primeraLetra = codigo.charAt(0).toUpperCase();
  // Cap. XIX (S, T) o Cap. XX (V-Y)
  return primeraLetra === 'S' || primeraLetra === 'T' || (primeraLetra >= 'V' && primeraLetra <= 'Y');
});

// Computed: Edad del trabajador en años (fechaNacimiento vs fechaNotaMedica)
const edadTrabajador = computed(() => {
  const trabajador = trabajadores.currentTrabajador;
  if (!trabajador?.fechaNacimiento) return null;
  try {
    const fn = new Date(trabajador.fechaNacimiento);
    const fc = fechaNotaMedica.value;
    if (isNaN(fn.getTime()) || isNaN(fc.getTime())) return null;
    let edad = fc.getFullYear() - fn.getFullYear();
    const m = fc.getMonth() - fn.getMonth();
    if (m < 0 || (m === 0 && fc.getDate() < fn.getDate())) edad--;
    return edad;
  } catch {
    return null;
  }
});

const medicoFirmanteRef = ref(null);
const enfermeraFirmanteRef = ref(null);

const { muestraConfirmacion: muestraConfirmacionDiagnostica1 } = useConfirmacionDiagnostica({
  slot: 1,
  codigo: codigoCIE10Principal,
  edadTrabajador,
  medicoFirmante: medicoFirmanteRef,
  enfermeraFirmante: enfermeraFirmanteRef,
  relacionTemporal,
});

onMounted(async () => {
    await loadFirmantes();
    // Cargar desde documento existente
    if (documentos.currentDocument) {
        codigoCIE10Principal.value = documentos.currentDocument.codigoCIE10Principal || '';
        codigosCIE10Complementarios.value = documentos.currentDocument.codigosCIE10Complementarios || [];
        relacionTemporal.value = documentos.currentDocument.relacionTemporal ?? null;
        confirmacionDiagnostica.value = documentos.currentDocument.confirmacionDiagnostica ?? false;
        codigoCIECausaExterna.value = documentos.currentDocument.codigoCIECausaExterna || '';
        causaExterna.value = documentos.currentDocument.causaExterna || '';
    }

    // Cargar desde formData (estado temporal)
    if (formDataNotaMedica.codigoCIE10Principal) {
        codigoCIE10Principal.value = formDataNotaMedica.codigoCIE10Principal;
    }
    if (formDataNotaMedica.codigosCIE10Complementarios) {
        codigosCIE10Complementarios.value = formDataNotaMedica.codigosCIE10Complementarios;
    }
    if (formDataNotaMedica.relacionTemporal !== undefined) {
        relacionTemporal.value = formDataNotaMedica.relacionTemporal;
    }
    if (formDataNotaMedica.confirmacionDiagnostica !== undefined) {
        confirmacionDiagnostica.value = formDataNotaMedica.confirmacionDiagnostica;
    }
    if (formDataNotaMedica.codigoCIECausaExterna) {
        codigoCIECausaExterna.value = formDataNotaMedica.codigoCIECausaExterna;
    }
    if (formDataNotaMedica.causaExterna) {
        causaExterna.value = formDataNotaMedica.causaExterna;
    }

    // Event handlers para tooltip de relación temporal
    relacionTemporalClickOutsideHandler = (event) => {
        if (
            relacionTemporalTooltipRef.value &&
            relacionTemporalIconRef.value &&
            !relacionTemporalTooltipRef.value.contains(event.target) &&
            !relacionTemporalIconRef.value.contains(event.target)
        ) {
            showRelacionTemporalTooltip.value = false;
        }
    };
    
    relacionTemporalEscapeKeyHandler = (event) => {
        if (event.key === 'Escape' && showRelacionTemporalTooltip.value) {
            showRelacionTemporalTooltip.value = false;
            // Devolver focus al botón
            if (relacionTemporalIconRef.value) {
                relacionTemporalIconRef.value.focus();
            }
        }
    };
    
    document.addEventListener('click', relacionTemporalClickOutsideHandler);
    document.addEventListener('keydown', relacionTemporalEscapeKeyHandler);

    scheduleValidatePrincipalSis();
    validateComplementariesSexAge();
});

onUnmounted(() => {
    if (principalSisDebounceTimer) clearTimeout(principalSisDebounceTimer);
    // Guardar en formData
    formDataNotaMedica.codigoCIE10Principal = codigoCIE10Principal.value || '';
    formDataNotaMedica.codigosCIE10Complementarios = codigosCIE10Complementarios.value || [];
    formDataNotaMedica.relacionTemporal = relacionTemporal.value ?? undefined;
    // Guardar confirmacionDiagnostica solo si aplica (Fe de Erratas)
    if (muestraConfirmacionDiagnostica1.value) {
        formDataNotaMedica.confirmacionDiagnostica = confirmacionDiagnostica.value;
    } else {
        formDataNotaMedica.confirmacionDiagnostica = undefined;
    }
    formDataNotaMedica.codigoCIECausaExterna = codigoCIECausaExterna.value || '';
    formDataNotaMedica.causaExterna = causaExterna.value || '';

    // Limpiar event handlers del tooltip de relación temporal
    if (relacionTemporalClickOutsideHandler) {
        document.removeEventListener('click', relacionTemporalClickOutsideHandler);
    }
    if (relacionTemporalEscapeKeyHandler) {
        document.removeEventListener('keydown', relacionTemporalEscapeKeyHandler);
    }
});

// Sincronizar valores con formData
watch(codigoCIE10Principal, () => {
    formDataNotaMedica.codigoCIE10Principal = codigoCIE10Principal.value;
    scheduleValidatePrincipalSis();
});

watch(codigosCIE10Complementarios, (newValue) => {
    formDataNotaMedica.codigosCIE10Complementarios = newValue;
}, { deep: true });

watch(relacionTemporal, (newValue) => {
    formDataNotaMedica.relacionTemporal = newValue ?? undefined;
    scheduleValidatePrincipalSis();
});

watch(confirmacionDiagnostica, (newValue) => {
    if (muestraConfirmacionDiagnostica1.value) {
        formDataNotaMedica.confirmacionDiagnostica = newValue;
    } else {
        formDataNotaMedica.confirmacionDiagnostica = undefined;
    }
});

// Watch para limpiar confirmacionDiagnostica cuando ya no aplica
watch(muestraConfirmacionDiagnostica1, (newValue) => {
    if (!newValue) {
        confirmacionDiagnostica.value = false;
        formDataNotaMedica.confirmacionDiagnostica = undefined;
    } else {
        if (confirmacionDiagnostica.value === undefined || confirmacionDiagnostica.value === null) {
            confirmacionDiagnostica.value = false;
        }
        formDataNotaMedica.confirmacionDiagnostica = confirmacionDiagnostica.value;
    }
});


watch(codigoCIECausaExterna, (newValue) => {
    formDataNotaMedica.codigoCIECausaExterna = newValue;
});

watch(causaExterna, (newValue) => {
    formDataNotaMedica.causaExterna = newValue;
});

// Funciones para manejar tooltip de relación temporal
const openRelacionTemporalTooltip = () => {
    showRelacionTemporalTooltip.value = true;
};

const closeRelacionTemporalTooltip = () => {
    showRelacionTemporalTooltip.value = false;
};

const toggleRelacionTemporalTooltip = () => {
    showRelacionTemporalTooltip.value = !showRelacionTemporalTooltip.value;
};

// Función para calcular posición del tooltip de relación temporal
const getRelacionTemporalTooltipPosition = () => {
    if (!relacionTemporalIconRef.value) {
        return { top: '0px', left: '0px' };
    }
    
    const rect = relacionTemporalIconRef.value.getBoundingClientRect();
    const tooltipWidth = 320; // Ancho estimado para el tooltip
    const tooltipHeight = 100; // Altura estimada
    const spacing = 12;
    const viewportPadding = 16;
    
    // Calcular posición horizontal (centrado respecto al icono)
    let left = rect.left - (tooltipWidth / 2) + (rect.width / 2);
    
    // Ajustar si se sale por la izquierda
    if (left < viewportPadding) {
        left = viewportPadding;
    }
    // Ajustar si se sale por la derecha
    else if (left + tooltipWidth > window.innerWidth - viewportPadding) {
        left = window.innerWidth - tooltipWidth - viewportPadding;
    }
    
    // Intentar posicionar arriba del icono
    let top = rect.top - tooltipHeight - spacing;
    
    // Si no cabe arriba, posicionar abajo
    if (top < viewportPadding) {
        top = rect.bottom + spacing;
        // Si tampoco cabe abajo, posicionar arriba forzado (scrollable)
        if (top + tooltipHeight > window.innerHeight - viewportPadding) {
            top = viewportPadding;
        }
    }
    
    return {
        top: `${top}px`,
        left: `${left}px`
    };
};

// Cerrar tooltip de relación temporal al hacer click fuera o presionar Escape
let relacionTemporalClickOutsideHandler = null;
let relacionTemporalEscapeKeyHandler = null;

// Validación de duplicidades CIE-10
const cie10Validation = computed(() => {
  return validateCIE10Duplicates({
    codigoCIE10Principal: codigoCIE10Principal.value,
    codigosCIE10Complementarios: codigosCIE10Complementarios.value,
    codigoCIEDiagnostico2: null, // En Step6 no validamos diagnóstico 2
    codigoCIEDiagnostico3: null // En Step6 no validamos diagnóstico 3
  });
});

// Mensajes de error específicos para mostrar en Step6
const principalInComplementariesError = computed(() => {
  return cie10Validation.value.issues.find(
    issue => issue.type === 'principal_in_complementaries'
  )?.message || null;
});

const complementariesDuplicateError = computed(() => {
  return cie10Validation.value.issues.find(
    issue => issue.type === 'complementaries_duplicate'
  )?.message || null;
});

// Validación DIAGNOSTICO_SIS del diagnóstico principal (inline)
const principalSisError = ref('');
const complementariesSexAgeErrors = ref([]);
let principalSisDebounceTimer = null;

const loadFirmantes = async () => {
  const userId = userStore.user?._id;
  if (!userId) return;
  const { medicoFirmante, enfermeraFirmante } = await fetchMedicoEnfermeraFirmantes(userId);
  medicoFirmanteRef.value = medicoFirmante;
  enfermeraFirmanteRef.value = enfermeraFirmante;
};

const validatePrincipalSis = async () => {
  principalSisError.value = '';
  if (!codigoCIE10Principal.value?.trim()) return;

  const trabajador = trabajadores.currentTrabajador;
  if (!trabajador) return;

  try {
    const fechaRef = fechaNotaMedica.value;
    const result = await validateDiagnosticoPrincipalSis({
      formData: {
        codigoCIE10Principal: codigoCIE10Principal.value,
        relacionTemporal: relacionTemporal.value,
      },
      trabajadorSexo: trabajador.sexo || '',
      trabajadorFechaNacimiento: trabajador.fechaNacimiento
        ? new Date(trabajador.fechaNacimiento)
        : fechaRef,
      fechaNotaMedica: fechaRef,
      medicoFirmante: medicoFirmanteRef.value,
      enfermeraFirmante: enfermeraFirmanteRef.value,
      showSiresUI: showSiresUI.value,
      esMujer: esMujer.value,
    });
    if (!result.ok && result.messageInline) {
      principalSisError.value = result.messageInline;
    }
  } catch (error) {
    console.error('Error validando diagnóstico principal DIAGNOSTICO_SIS:', error);
  }
};

const scheduleValidatePrincipalSis = () => {
  if (principalSisDebounceTimer) clearTimeout(principalSisDebounceTimer);
  principalSisDebounceTimer = setTimeout(() => {
    validatePrincipalSis();
  }, 350);
};

// Validación de sexo/edad para complementarios
const validateComplementariesSexAge = async () => {
  complementariesSexAgeErrors.value = [];

  const trabajador = trabajadores.currentTrabajador;
  if (!trabajador || !trabajador.sexo || !trabajador.fechaNacimiento) {
    return;
  }

  try {
    const issues = await validateCIE10SexAge({
      codigoCIE10Principal: null,
      codigosCIE10Complementarios: codigosCIE10Complementarios.value,
      codigoCIEDiagnostico2: null,
      codigoCIEDiagnostico3: null,
      trabajadorSexo: trabajador.sexo,
      trabajadorFechaNacimiento: new Date(trabajador.fechaNacimiento),
      fechaNotaMedica: fechaNotaMedica.value
    });

    const complementariesIssues = issues.filter(
      issue => issue.field === 'codigosCIE10Complementarios'
    );
    if (complementariesIssues.length > 0) {
      complementariesSexAgeErrors.value = complementariesIssues.map(issue => issue.messageInline);
    }
  } catch (error) {
    console.error('Error validando sexo/edad CIE-10 complementarios:', error);
  }
};

// Watchers para recalcular validación cuando cambien los valores
watch(fechaNotaMedica, () => {
  scheduleValidatePrincipalSis();
  validateComplementariesSexAge();
});
watch(codigosCIE10Complementarios, validateComplementariesSexAge, { deep: true });
watch(
  () => trabajadores.currentTrabajador?.sexo,
  () => {
    scheduleValidatePrincipalSis();
    validateComplementariesSexAge();
  }
);
watch(
  () => trabajadores.currentTrabajador?.fechaNacimiento,
  () => {
    scheduleValidatePrincipalSis();
    validateComplementariesSexAge();
  }
);
watch(
  () => userStore.user?._id,
  () => {
    loadFirmantes().then(() => scheduleValidatePrincipalSis());
  }
);
</script>

<template>
    <div class="space-y-6">

        <!-- 3. Relación Temporal (NOM-024 GIIS-B015) - Tamaño más mesurado -->
        <div>
            <h2 class="text-2xl font-bold text-gray-900 mb-4 uppercase">Diagnóstico Principal</h2>
            <div class="flex items-center gap-2 mb-2">
                <h3 class="text-base font-medium text-gray-700">
                    Relación Temporal <span v-if="cie10Required" class="text-red-500">*</span>
                </h3>
                <button
                    ref="relacionTemporalIconRef"
                    type="button"
                    @mouseenter="openRelacionTemporalTooltip"
                    @mouseleave="closeRelacionTemporalTooltip"
                    @focus="openRelacionTemporalTooltip"
                    @blur="closeRelacionTemporalTooltip"
                    @click.stop="toggleRelacionTemporalTooltip"
                    class="flex-shrink-0 text-emerald-600 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 rounded-full transition-colors"
                    aria-label="Más información sobre relación temporal"
                    :aria-expanded="showRelacionTemporalTooltip"
                >
                    <i class="fas fa-info-circle text-sm"></i>
                </button>
            </div>
            
            <!-- Tooltip de relación temporal -->
            <Teleport to="body">
                <Transition
                    enter-active-class="transition-opacity duration-200 ease-out"
                    enter-from-class="opacity-0"
                    enter-to-class="opacity-100"
                    leave-active-class="transition-opacity duration-150 ease-in"
                    leave-from-class="opacity-100"
                    leave-to-class="opacity-0"
                >
                    <div
                        v-if="showRelacionTemporalTooltip"
                        ref="relacionTemporalTooltipRef"
                        role="tooltip"
                        class="fixed z-50 bg-gray-900 text-white rounded-lg shadow-2xl p-4 max-w-sm text-sm border border-gray-700"
                        :style="getRelacionTemporalTooltipPosition()"
                        @click.stop
                    >
                        <p class="text-gray-200 leading-relaxed">
                            La relación temporal indica si el diagnóstico es nuevo o ya conocido, y contextualiza clínicamente el acto médico.
                        </p>
                        
                        <!-- Flecha del tooltip -->
                        <div 
                            class="absolute -bottom-2 left-8 w-4 h-4 bg-gray-900 transform rotate-45 border-r border-b border-gray-700"
                        ></div>
                    </div>
                </Transition>
            </Teleport>
            
            <!-- Diseño de Radio Buttons más Visual tipo Card -->
            <div class="grid grid-cols-2 gap-3 mb-1">
                <!-- Opción Primera Vez -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        relacionTemporal === 0 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        :value="0" 
                        v-model="relacionTemporal" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            relacionTemporal === 0 ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        Primera Vez
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="relacionTemporal === 0"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción Subsecuente -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        relacionTemporal === 1 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        :value="1" 
                        v-model="relacionTemporal" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            relacionTemporal === 1 ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        Subsecuente
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="relacionTemporal === 1"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>
            </div>
            
            <!-- <p v-if="isMX" class="mt-1 text-xs text-amber-600 flex items-center gap-1">
                <i class="fas fa-info-circle"></i>
                Campo obligatorio para proveedores en México (NOM-024)
            </p> -->
        </div>

        <!-- 1. Diagnóstico Principal (Protagonista) -->
        <div class="space-y-4">         
            <div>
                <CIE10Autocomplete
                    v-model="codigoCIE10Principal"
                    :label="'Código CIE-10 Principal'"
                    :required="cie10Required"
                    :trabajadorId="trabajadores.currentTrabajadorId"
                    :fechaConsulta="fechaNotaMedica"
                    placeholder="Buscar código diagnóstico principal..."
                />
                <!-- Mensaje de error DIAGNOSTICO_SIS / sexo-edad para diagnóstico principal -->
                <Transition name="fade">
                    <div v-if="principalSisError" class="mt-2">
                        <div class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 shadow-sm">
                            <i class="fas fa-exclamation-triangle mt-0.5"></i>
                            <span class="flex-1 font-medium">{{ principalSisError }}</span>
                        </div>
                    </div>
                </Transition>
                <!-- <p v-if="isMX" class="mt-1 text-xs text-amber-600 flex items-center gap-1">
                    <i class="fas fa-info-circle"></i>
                    Campo obligatorio para proveedores en México (NOM-024)
                </p> -->
            </div>
        </div>

        <!-- Confirmación Diagnóstica (NOM-024 GIIS-B015) - Fe de Erratas: solo cuando aplica -->
        <div v-if="muestraConfirmacionDiagnostica1" class="space-y-2 border border-amber-200 rounded-xl p-4 bg-amber-50/30">
            <div class="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="confirmacionDiagnostica"
                    v-model="confirmacionDiagnostica"
                    class="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                />
                <label for="confirmacionDiagnostica" class="text-sm font-medium text-gray-700">
                    Confirmación Diagnóstica
                </label>
            </div>
            <p class="text-xs text-amber-700">
                <i class="fas fa-exclamation-triangle"></i>
                Requerida para diagnósticos crónicos (Diabetes, HTA) o Cáncer en menores de 18 años
            </p>
        </div>

        <!-- 2. Diagnósticos Relacionados/Complementarios -->
        <div class="space-y-4">
            <h3 class="text-lg font-semibold text-gray-800">Complementar Diagnóstico</h3>
            
            <div>
                <CIE10ComplementaryDiagnoses
                    v-model="codigosCIE10Complementarios"
                    :trabajadorId="trabajadores.currentTrabajadorId"
                    :fechaConsulta="fechaNotaMedica"
                />
                
                <!-- Nota informativa -->
                <div class="mt-1">
                    <p class="text-xs text-gray-500">
                        Condiciones asociadas al diagnóstico principal que ayudan a describir mejor el cuadro clínico.
                    </p>
                </div>

                <!-- Avisos de duplicidad -->
                <div v-if="principalInComplementariesError || complementariesDuplicateError" class="mt-3 space-y-2">
                    <Transition name="fade">
                        <div v-if="principalInComplementariesError" class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 shadow-sm">
                            <i class="fas fa-exclamation-triangle mt-0.5"></i>
                            <span class="flex-1 font-medium">{{ principalInComplementariesError }}</span>
                        </div>
                    </Transition>
                    <Transition name="fade">
                        <div v-if="complementariesDuplicateError" class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 shadow-sm">
                            <i class="fas fa-exclamation-triangle mt-0.5"></i>
                            <span class="flex-1 font-medium">{{ complementariesDuplicateError }}</span>
                        </div>
                    </Transition>
                </div>

                <!-- Mensajes de error por sexo/edad para complementarios -->
                <div v-if="complementariesSexAgeErrors.length > 0" class="mt-2 space-y-2">
                    <TransitionGroup name="fade">
                        <div v-for="(error, index) in complementariesSexAgeErrors" 
                             :key="index"
                             class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 shadow-sm">
                            <i class="fas fa-exclamation-triangle mt-0.5"></i>
                            <span class="flex-1 font-medium">{{ error }}</span>
                        </div>
                    </TransitionGroup>
                </div>

            </div>
        </div>

        <!-- Causa Externa (NOM-024 GIIS-B015) -->
        <div v-if="requiereCausaExterna" class="space-y-4 border border-blue-200 rounded-xl p-4 bg-blue-50/30">
            <h3 class="text-sm font-bold text-blue-900 flex items-center gap-2">
                <i class="fas fa-info-circle"></i>
                Causa Externa (Obligatoria para Cap. XIX/XX)
            </h3>
            
            <div>
                <CIE10Autocomplete
                    v-model="codigoCIECausaExterna"
                    label="Código CIE-10 Causa Externa (V01-Y98)"
                    :required="true"
                    :trabajadorId="trabajadores.currentTrabajadorId"
                    :fechaConsulta="fechaNotaMedica"
                    placeholder="Buscar causa externa..."
                />
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    Descripción de Causa Externa (Texto Libre)
                </label>
                <textarea
                    v-model="causaExterna"
                    class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Describa la causa externa..."
                    rows="3"
                ></textarea>
            </div>
        </div>
    </div>
</template>
