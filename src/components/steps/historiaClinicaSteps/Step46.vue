<script setup>
    import { watch, ref, onMounted, onUnmounted, nextTick, computed, toRefs } from 'vue';
    import { useTrabajadoresStore } from '@/stores/trabajadores';
    import { useFormDataStore } from '@/stores/formDataStore';
    import { useDocumentosStore } from '@/stores/documentos';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);
    
    const trabajadores = useTrabajadoresStore();
    const { formDataHistoriaClinica } = useFormDataStore();
    const documentos = useDocumentosStore();
    
    // Valor local para la pregunta principal
    const resumenHistoriaClinicaPregunta = ref('No');
    const resumenHistoriaClinica = ref('');
    
    // Referencia al textarea
    const textareaEspecificar = ref(null);
    
    // Lista de campos con sufijo "Especificar" de los pasos 12 al 21
    const camposHallazgos = [
        'lumbalgiasEspecificar',           // Step 12
        'diabeticosPPEspecificar',         // Step 13
        'cardiopaticosPPEspecificar',      // Step 14
        'alergicosEspecificar',            // Step 15
        'hipertensivosPPEspecificar',      // Step 16
        'respiratoriosEspecificar',        // Step 17
        'epilepticosPPEspecificar',        // Step 18
        'accidentesEspecificar',           // Step 19
        'quirurgicosEspecificar',          // Step 20
        'otrosEspecificar',                // Step 21
        'secuelas'                         // Step 45
    ];
    
    // Computed para generar el resumen automáticamente
    const resumenAutomatico = computed(() => {
        const hallazgosSignificativos = camposHallazgos
            .filter(campo => {
                const valor = formDataHistoriaClinica[campo];
                // Filtrar solo valores que no sean "Negado", "Sin secuelas" o vacíos
                return valor && 
                       valor !== 'Negado' && 
                       valor !== 'Sin secuelas' && 
                       valor.trim() !== '';
            })
            .map(campo => formDataHistoriaClinica[campo]);
        
        if (hallazgosSignificativos.length > 0) {
            return hallazgosSignificativos.join('. ') + '.';
        }
        
        return '';
    });
    
    onMounted(() => {
        const textoDefecto = trabajadores.currentTrabajador.sexo === 'Femenino'
            ? 'Se refiere actualmente asintomática'
            : 'Se refiere actualmente asintomático';
        
        if (documentos.currentDocument) {
            // Si se está editando un documento
            const resumenDoc = documentos.currentDocument.resumenHistoriaClinica || '';
            resumenHistoriaClinica.value = resumenDoc;
            
            // Detectar automáticamente si debe estar en "Si" o "No"
            // Si hay hallazgos automáticos o el resumen no es el texto por defecto, debe estar en "Si"
            if (resumenAutomatico.value || (resumenDoc && resumenDoc !== textoDefecto)) {
                resumenHistoriaClinicaPregunta.value = 'Si';
            } else {
                resumenHistoriaClinicaPregunta.value = documentos.currentDocument.resumenHistoriaClinicaPregunta || 'No';
            }
        } else {
            // Si es un documento nuevo, detectar automáticamente si hay hallazgos
            if (resumenAutomatico.value) {
                // Hay hallazgos significativos - cargar el resumen automático
                resumenHistoriaClinicaPregunta.value = 'Si';
                resumenHistoriaClinica.value = resumenAutomatico.value;
                formDataHistoriaClinica.resumenHistoriaClinicaPregunta = 'Si';
                formDataHistoriaClinica.resumenHistoriaClinica = resumenAutomatico.value;
            } else {
                // No hay hallazgos - verificar si tiene un valor previo
                const valorPrevio = formDataHistoriaClinica.resumenHistoriaClinica;
                
                // Si el valor previo es el texto por defecto o está vacío, mantener en "No"
                if (!valorPrevio || valorPrevio === textoDefecto) {
                    resumenHistoriaClinicaPregunta.value = 'No';
                } else {
                    // Si tiene un valor personalizado, mantenerlo
                    resumenHistoriaClinicaPregunta.value = formDataHistoriaClinica.resumenHistoriaClinicaPregunta || 'Si';
                    resumenHistoriaClinica.value = valorPrevio;
                }
            }
        }
    });
    
    onUnmounted(() => {
        // Guardar el estado actual de la pregunta
        formDataHistoriaClinica.resumenHistoriaClinicaPregunta = resumenHistoriaClinicaPregunta.value;
    
        // Guardar el resumen según el estado de la pregunta
        if (resumenHistoriaClinicaPregunta.value === 'No') {
            formDataHistoriaClinica.resumenHistoriaClinica = trabajadores.currentTrabajador.sexo === 'Femenino'
                ? 'Se refiere actualmente asintomática'
                : 'Se refiere actualmente asintomático';
        } else {
            // Si es "Si", guardar el resumen actual (ya sea automático o editado por el usuario)
            formDataHistoriaClinica.resumenHistoriaClinica = resumenHistoriaClinica.value || resumenAutomatico.value || '';
        }
    });
    
    // Sincronizar resumenHistoriaClinicaPregunta con formData
    watch(resumenHistoriaClinicaPregunta, (newValue) => {
        formDataHistoriaClinica.resumenHistoriaClinicaPregunta = newValue;
    });
    
    // Sincronizar valores con formData
    watch(resumenHistoriaClinica, (newValue) => {
        formDataHistoriaClinica.resumenHistoriaClinica = newValue;
    });
    
    // Watch para establecer 'Default' cuando resumenHistoriaClinica sea 'No' y enfocar textarea cuando sea 'Si'
    watch(resumenHistoriaClinicaPregunta, async (newValue) => {
        if (newValue === 'No') {
            formDataHistoriaClinica.resumenHistoriaClinica =
                trabajadores.currentTrabajador.sexo === 'Femenino'
                    ? 'Se refiere actualmente asintomática'
                    : 'Se refiere actualmente asintomático';
            resumenHistoriaClinica.value = formDataHistoriaClinica.resumenHistoriaClinica;
        }
        if (newValue === 'Si') {
            // Cargar el resumen automático si hay hallazgos y no hay un resumen personalizado previo
            const textoDefecto = trabajadores.currentTrabajador.sexo === 'Femenino'
                ? 'Se refiere actualmente asintomática'
                : 'Se refiere actualmente asintomático';
            
            // Si el resumen actual es el texto por defecto o está vacío, cargar hallazgos automáticos
            if (resumenAutomatico.value && (!resumenHistoriaClinica.value || resumenHistoriaClinica.value === textoDefecto)) {
                resumenHistoriaClinica.value = resumenAutomatico.value;
                formDataHistoriaClinica.resumenHistoriaClinica = resumenAutomatico.value;
            } else if (!resumenHistoriaClinica.value || resumenHistoriaClinica.value === textoDefecto) {
                // Si no hay hallazgos automáticos, limpiar el campo
                resumenHistoriaClinica.value = '';
                formDataHistoriaClinica.resumenHistoriaClinica = '';
            }
            
            // Esperar a que el DOM se actualice y luego enfocar el textarea
            await nextTick();
            if (textareaEspecificar.value) {
                textareaEspecificar.value.focus();
            }
        }
    });
    </script>
    
    <template>
        <div>
            <!-- Jerarquía Visual Mejorada -->
            <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Resumen Historia Clínica</h1>
            
            <!-- Pregunta principal con mejor jerarquía -->
            <div :class="variant === 'compact' ? 'mb-3' : 'mb-8'">
                <p :class="variant === 'compact' ? 'text-sm font-medium mb-2 text-gray-800' : 'text-lg font-medium mb-4 text-gray-800'">¿Hay hallazgos significativos por resumir?</p>
                
                <!-- Diseño de Radio Buttons más Visual tipo Card -->
                <div class="grid grid-cols-2 gap-3">
                    <!-- Opción No -->
                    <label 
                        :class="[
                            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                            resumenHistoriaClinicaPregunta === 'No' 
                                ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                                : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                        ]"
                    >
                        <input 
                            type="radio" 
                            value="No" 
                            v-model="resumenHistoriaClinicaPregunta" 
                            class="sr-only" 
                        />
                        <!-- Icono -->
                        <div 
                            :class="[
                                'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
                                resumenHistoriaClinicaPregunta === 'No' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                            ]"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <span 
                            :class="[
                                'text-base font-semibold transition-colors duration-200',
                                resumenHistoriaClinicaPregunta === 'No' ? 'text-emerald-700' : 'text-gray-700'
                            ]"
                        >
                            No
                        </span>
                        <!-- Indicador de selección -->
                        <div 
                            v-if="resumenHistoriaClinicaPregunta === 'No'"
                            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                        </div>
                    </label>
    
                    <!-- Opción Si -->
                    <label 
                        :class="[
                            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                            resumenHistoriaClinicaPregunta === 'Si' 
                                ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                                : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                        ]"
                    >
                        <input 
                            type="radio" 
                            value="Si" 
                            v-model="resumenHistoriaClinicaPregunta" 
                            class="sr-only" 
                        />
                        <!-- Icono -->
                        <div 
                            :class="[
                                'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
                                resumenHistoriaClinicaPregunta === 'Si' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                            ]"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <span 
                            :class="[
                                'text-base font-semibold transition-colors duration-200',
                                resumenHistoriaClinicaPregunta === 'Si' ? 'text-emerald-700' : 'text-gray-700'
                            ]"
                        >
                            Sí
                        </span>
                        <!-- Indicador de selección -->
                        <div 
                            v-if="resumenHistoriaClinicaPregunta === 'Si'"
                            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                        </div>
                    </label>
                </div>
            </div>
    
            <!-- Opciones adicionales con transición suave -->
            <transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 transform -translate-y-2"
                enter-to-class="opacity-100 transform translate-y-0"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 transform translate-y-0"
                leave-to-class="opacity-0 transform -translate-y-2"
            >
                <div v-if="resumenHistoriaClinicaPregunta === 'Si'" :class="variant === 'compact' ? 'mt-3' : 'mt-6'">
                    <p :class="variant === 'compact' ? 'text-sm font-medium mb-2 text-gray-800' : 'text-lg font-medium mb-3 text-gray-800'">
                        Resumen de hallazgos:
                    </p>
                    <!-- Mensaje informativo si hay hallazgos detectados -->
                    <div v-if="resumenAutomatico" class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p class="text-sm text-blue-800">
                            💡 Se han detectado hallazgos en los antecedentes personales patológicos. El resumen se ha cargado automáticamente, puede editarlo si lo desea.
                        </p>
                    </div>
                    
                    <div>
                        <textarea
                            ref="textareaEspecificar"
                            class="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200 min-h-[120px] resize-y"
                            v-model="resumenHistoriaClinica"
                            placeholder="Describa los hallazgos relevantes..."
                            required
                        ></textarea>
                    </div>
                </div>
            </transition>
        </div>
    </template>