<script setup>
import { watch, ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';

const { formDataHistoriaClinica } = useFormDataStore();

// Valor local para la pregunta principal
const accidenteLaboral = ref('No');

// Referencia al primer input
const inputEspecificar = ref(null);

onMounted(() => {
    // Verificar si formDataHistoriaClinica.accidenteLaboral tiene un valor y establecerlo en accidenteLaboral
    if (formDataHistoriaClinica.accidenteLaboral) {
        accidenteLaboral.value = formDataHistoriaClinica.accidenteLaboral;
    }
    if (formDataHistoriaClinica.accidenteLaboralEspecificar) {
        formDataHistoriaClinica.accidenteLaboralEspecificar = formDataHistoriaClinica.accidenteLaboralEspecificar;
    }
    if (formDataHistoriaClinica.descripcionDelDano) {
        formDataHistoriaClinica.descripcionDelDano = formDataHistoriaClinica.descripcionDelDano;
    }
    if (formDataHistoriaClinica.secuelas) {
        formDataHistoriaClinica.secuelas = formDataHistoriaClinica.secuelas;
    }
});

onUnmounted(() => {
    // Asegurar que formData tenga un valor inicial para accidenteLaboral
    if (!formDataHistoriaClinica.accidenteLaboral) {
        formDataHistoriaClinica.accidenteLaboral = accidenteLaboral.value;
    }

    if (!formDataHistoriaClinica.accidenteLaboralEspecificar) {
        formDataHistoriaClinica.accidenteLaboralEspecificar = 'Niega haber sufrido riesgos de trabajo';
    }

    if (!formDataHistoriaClinica.descripcionDelDano) {
        formDataHistoriaClinica.descripcionDelDano = 'Ninguno';
    }

    if (!formDataHistoriaClinica.secuelas) {
        formDataHistoriaClinica.secuelas = 'Sin secuelas';
    }
});

// Sincronizar valores con formData
watch(accidenteLaboral, (newValue) => {
    formDataHistoriaClinica.accidenteLaboral = newValue;
});

// Watch para establecer 'Defaults' cuando accidenteLaboral sea 'No' y enfocar input cuando sea 'Si'
watch(accidenteLaboral, async (newValue) => {
    if (newValue === 'No') {
        formDataHistoriaClinica.accidenteLaboral = 'No';
        formDataHistoriaClinica.descripcionDelDano = 'Ninguno';
        formDataHistoriaClinica.secuelas = 'Sin secuelas';
    }
    if (newValue === 'Si') {
        // Esperar a que el DOM se actualice y luego enfocar el primer input
        await nextTick();
        if (inputEspecificar.value) {
            inputEspecificar.value.focus();
        }
    }
});
</script>

<template>
    <div>
        <!-- Jerarquía Visual Mejorada -->
        <h1 class="text-2xl font-bold mb-4 text-gray-900">Antecedentes Laborales</h1>
        <h2 class="text-lg font-semibold mb-4 text-gray-700">RIESGO DE TRABAJO</h2>
        
        <!-- Pregunta principal con mejor jerarquía -->
        <div class="mb-8">
            <p class="text-lg font-medium mb-4 text-gray-800">¿El trabajador ha sufrido un riesgo de trabajo (accidente o enfermedad de trabajo)?</p>
            
            <!-- Diseño de Radio Buttons más Visual tipo Card -->
            <div class="grid grid-cols-2 gap-3">
                <!-- Opción No -->
                <label 
                    :class="[
                        'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        accidenteLaboral === 'No' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="No" 
                        v-model="accidenteLaboral" 
                        class="sr-only" 
                    />
                    <!-- Icono -->
                    <div 
                        :class="[
                            'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
                            accidenteLaboral === 'No' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                        ]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <span 
                        :class="[
                            'text-base font-semibold transition-colors duration-200',
                            accidenteLaboral === 'No' ? 'text-emerald-700' : 'text-gray-700'
                        ]"
                    >
                        No
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="accidenteLaboral === 'No'"
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
                        accidenteLaboral === 'Si' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="Si" 
                        v-model="accidenteLaboral" 
                        class="sr-only" 
                    />
                    <!-- Icono -->
                    <div 
                        :class="[
                            'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
                            accidenteLaboral === 'Si' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                        ]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <span 
                        :class="[
                            'text-base font-semibold transition-colors duration-200',
                            accidenteLaboral === 'Si' ? 'text-emerald-700' : 'text-gray-700'
                        ]"
                    >
                        Sí
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="accidenteLaboral === 'Si'"
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
            <div v-if="accidenteLaboral === 'Si'" class="space-y-4">
                <div>
                    <p class="text-lg font-medium mb-3 text-gray-800">Describa el riesgo de trabajo (accidente o enfermedad de trabajo):</p>
                    <input 
                        ref="inputEspecificar"
                        type="text"
                        class="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                        v-model="formDataHistoriaClinica.accidenteLaboralEspecificar"
                        placeholder="Ej: Caída en planta, lumbalgia por esfuerzo repetitivo"
                        required
                    >
                </div>

                <div>
                    <p class="text-lg font-medium mb-3 text-gray-800">Describa el daño:</p>
                    <input 
                        type="text"
                        class="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                        v-model="formDataHistoriaClinica.descripcionDelDano"
                        placeholder="Ej: Descripción del daño"
                        required
                    >
                </div>

                <div>
                    <p class="text-lg font-medium mb-3 text-gray-800">Describa las secuelas:</p>
                    <input 
                        type="text"
                        class="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                        v-model="formDataHistoriaClinica.secuelas"
                        placeholder="Ej: Descripción de secuelas"
                        required
                    >
                </div>
            </div>
        </transition>
    </div>
</template>