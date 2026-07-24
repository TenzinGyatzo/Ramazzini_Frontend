<script setup>
import { ref, watch, onMounted, toRefs } from 'vue';
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

const mensajeCopiado = ref(false);

const { formDataAptitud } = useFormDataStore();
const documentos = useDocumentosStore();

// Valor local para la medidasPreventivas principal, inicializado con el valor actual del store
const medidasPreventivas = ref(formDataAptitud.medidasPreventivas || '');

onMounted(() => {
    if (documentos.currentDocument) {
        medidasPreventivas.value = documentos.currentDocument.medidasPreventivas;
    }
});

// Sincronizar el valor seleccionado con formDataAptitud.medidasPreventivas
watch(medidasPreventivas, (newValue) => {
    formDataAptitud.medidasPreventivas = newValue;
});

const openSection = ref(null);

const toggle = (section) => {
    openSection.value = openSection.value === section ? null : section;
};

const isOpen = (section) => openSection.value === section;

// Función para copiar el texto al portapapeles
const copiarTexto = (texto) => {
    navigator.clipboard.writeText(texto).then(() => {
        // Mostrar mensaje temporal de "Copiado"
        mensajeCopiado.value = true;
        setTimeout(() => {
          mensajeCopiado.value = false;
        }, 2000); // Mensaje se oculta después de 2 segundos
    }).catch((err) => {
        console.error('Error al copiar el texto: ', err);
    });
};

</script>

<template>
    <div>
    <h1 v-if="variant !== 'compact'" class="font-bold mb-4 text-gray-800 leading-5">Aptitud al Puesto</h1>
    <div :class="variant === 'compact' ? 'mb-2' : 'mb-4'">
        <h2 v-if="variant !== 'compact'" class="text-lg font-semibold mb-4 text-gray-800">Medidas Preventivas Específicas</h2>
        <p class="text-sm font-medium mb-1 text-gray-800 leading-4">Descripción de medidas específicas recomendadas:</p>
        <div class="font-light mb-2">
            <textarea
                :class="variant === 'compact'
                  ? 'w-full p-2 text-sm border border-gray-300 rounded-md text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 min-h-[12rem]'
                  : 'w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-64'"
                v-model="formDataAptitud.medidasPreventivas" required>
            </textarea>
        </div>

        <div class="mb-4">
            <p class="font-sm mb-1 text-gray-800 leading-5">Se sugiere emitir recomendaciones para cada alteracion encontrada. </p>

            <!-- <p class="font-medium mb-1 text-gray-800 leading-5 mt-4">1. Separa cada recomendacion con punto y seguido.</p> -->
            
            <!-- Ejemplos -->
            <p class="font-sm mb-1 text-gray-800 leading-5 mt-4">Ejemplos de recomendaciones:<span v-if="mensajeCopiado" class="font-medium mb-1 leading-5 ml-2 text-emerald-600 text-sm">¡Copiado!</span></p>
            
            <!-- Grid de botones compactos -->
            <div class="grid grid-cols-2 gap-2 mt-3">
                <!-- Genérico -->
                <button
                    class="font-medium py-1.5 px-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-between gap-1 min-w-0 group"
                    :class="isOpen('generico') 
                        ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500 shadow-sm' 
                        : 'bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white'"
                    @click="toggle('generico')">
                    <span class="truncate">Genérico</span>
                    <svg class="w-4 h-4 shrink-0 transition-transform duration-200" :class="{ 'rotate-180': isOpen('generico') }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>

                <!-- Hernia Abdominal -->
                <button
                    class="font-medium py-1.5 px-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-between gap-1 min-w-0 group"
                    :class="isOpen('Hernia') 
                        ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500 shadow-sm' 
                        : 'bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white'"
                    @click="toggle('Hernia')">
                    <span class="truncate">Hernia Abd.</span>
                    <svg class="w-4 h-4 shrink-0 transition-transform duration-200" :class="{ 'rotate-180': isOpen('Hernia') }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>

                <!-- Obesidad -->
                <button
                    class="font-medium py-1.5 px-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-between gap-1 min-w-0 group"
                    :class="isOpen('obesidad') 
                        ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500 shadow-sm' 
                        : 'bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white'"
                    @click="toggle('obesidad')">
                    <span class="truncate">Obesidad</span>
                    <svg class="w-4 h-4 shrink-0 transition-transform duration-200" :class="{ 'rotate-180': isOpen('obesidad') }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>

                <!-- Diabetes II (etiqueta corta: evita word-break con scrollbar) -->
                <button
                    class="font-medium py-1.5 px-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-between gap-1 min-w-0 group"
                    :class="isOpen('diabetesMellitus2') 
                        ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500 shadow-sm' 
                        : 'bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white'"
                    @click="toggle('diabetesMellitus2')">
                    <span class="truncate whitespace-nowrap">Diabetes II</span>
                    <svg class="w-4 h-4 shrink-0 transition-transform duration-200" :class="{ 'rotate-180': isOpen('diabetesMellitus2') }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>

                <!-- Hipertensión -->
                <button
                    class="font-medium py-1.5 px-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-between gap-1 min-w-0 group"
                    :class="isOpen('hipertension') 
                        ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500 shadow-sm' 
                        : 'bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white'"
                    @click="toggle('hipertension')">
                    <span class="truncate">Hipertensión</span>
                    <svg class="w-4 h-4 shrink-0 transition-transform duration-200" :class="{ 'rotate-180': isOpen('hipertension') }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>

                <!-- Hipoacusia -->
                <button
                    class="font-medium py-1.5 px-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-between gap-1 min-w-0 group"
                    :class="isOpen('hipoacusia') 
                        ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500 shadow-sm' 
                        : 'bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white'"
                    @click="toggle('hipoacusia')">
                    <span class="truncate">Hipoacusia</span>
                    <svg class="w-4 h-4 shrink-0 transition-transform duration-200" :class="{ 'rotate-180': isOpen('hipoacusia') }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>

                <!-- Problemas Respiratorios -->
                <button
                    class="font-medium py-1.5 px-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-between gap-1 min-w-0 group"
                    :class="isOpen('problemasRespiratorios') 
                        ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500 shadow-sm' 
                        : 'bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white'"
                    @click="toggle('problemasRespiratorios')">
                    <span class="truncate">Respiratorios</span>
                    <svg class="w-4 h-4 shrink-0 transition-transform duration-200" :class="{ 'rotate-180': isOpen('problemasRespiratorios') }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>

                <!-- Lumbalgia -->
                <button
                    class="font-medium py-1.5 px-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-between gap-1 min-w-0 group"
                    :class="isOpen('lumbalgia') 
                        ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500 shadow-sm' 
                        : 'bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white'"
                    @click="toggle('lumbalgia')">
                    <span class="truncate">Lumbalgia</span>
                    <svg class="w-4 h-4 shrink-0 transition-transform duration-200" :class="{ 'rotate-180': isOpen('lumbalgia') }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
            </div>

            <!-- Contenedores desplegables con animaciones -->
            <!-- Genérico -->
            <transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 transform -translate-y-2 max-h-0"
                enter-to-class="opacity-100 transform translate-y-0 max-h-96"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 transform translate-y-0 max-h-96"
                leave-to-class="opacity-0 transform -translate-y-2 max-h-0">
                <div v-if="isOpen('generico')" class="font-medium space-y-2 p-4 border rounded-md shadow-sm bg-white mt-3 overflow-hidden">
                    <div class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                        <p class="italic text-sm font-light mb-4 leading-4 text-gray-700 hover:text-emerald-700 cursor-pointer text-justify"
                            @click="copiarTexto('Es importante usar adecuadamente el EPP, mantener hábitos saludables como una alimentación balanceada, ejercicio regular y descanso adecuado, así como efectuar vigilancia médica con periodicidad anual, incluyendo exámenes generales de laboratorio y gabinete para una vigilancia integral de la salud. ')">
                            Es importante usar adecuadamente el EPP, mantener hábitos saludables como una alimentación
                            balanceada, ejercicio regular y descanso adecuado, así como efectuar vigilancia médica con
                            periodicidad anual, incluyendo exámenes generales de laboratorio y gabinete para una
                            vigilancia integral de la salud.
                        </p>
                    </div>
                </div>
            </transition>

            <!-- Hernia Abdominal -->
            <transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 transform -translate-y-2 max-h-0"
                enter-to-class="opacity-100 transform translate-y-0 max-h-96"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 transform translate-y-0 max-h-96"
                leave-to-class="opacity-0 transform -translate-y-2 max-h-0">
                <div v-if="isOpen('Hernia')" class="font-medium space-y-2 p-4 border rounded-md shadow-sm bg-white mt-3 text-justify overflow-hidden">
                    <div class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                        <p class="italic text-sm font-light mb-4 leading-4 text-gray-700 hover:text-emerald-700 cursor-pointer"
                            @click="copiarTexto('Es crucial priorizar la prevención y el cuidado de la pared abdominal mediante el fortalecimiento de los músculos centrales, la mejora de la postura y el uso de técnicas adecuadas de levantamiento de objetos. ')">
                            Es crucial priorizar la prevención y el cuidado de la pared abdominal mediante el fortalecimiento de los músculos centrales, la mejora de la postura y el uso de técnicas adecuadas de levantamiento de objetos.
                        </p>
                    </div>
                </div>
            </transition>

            <!-- Obesidad -->
            <transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 transform -translate-y-2 max-h-0"
                enter-to-class="opacity-100 transform translate-y-0 max-h-96"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 transform translate-y-0 max-h-96"
                leave-to-class="opacity-0 transform -translate-y-2 max-h-0">
                <div v-if="isOpen('obesidad')" class="font-medium space-y-2 p-4 border rounded-md shadow-sm bg-white mt-3 text-justify overflow-hidden">
                    <div class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                        <p class="italic text-sm font-light mb-4 leading-4 text-gray-700 hover:text-emerald-700 cursor-pointer"
                            @click="copiarTexto('Se recomienda adoptar una dieta balanceada y realizar ejercicio físico regularmente para mejorar la salud en general. Estas prácticas ayudan a controlar el peso, disminuir los niveles de grasa corporal, fortalecer los músculos y mejorar la función cardiovascular. Además, reducen el riesgo de desarrollar enfermedades crónicas como la diabetes tipo 2, enfermedades cardíacas y ciertos tipos de cáncer. ')">
                            Se recomienda adoptar una dieta balanceada y realizar ejercicio físico regularmente para mejorar la salud en general. Estas prácticas ayudan a controlar el peso, disminuir los niveles de grasa corporal, fortalecer los músculos y mejorar la función cardiovascular. Además, reducen el riesgo de desarrollar enfermedades crónicas como la diabetes tipo 2, enfermedades cardíacas y ciertos tipos de cáncer. 
                        </p>
                    </div>
                </div>
            </transition>

            <!-- Diabetes Tipo II -->
            <transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 transform -translate-y-2 max-h-0"
                enter-to-class="opacity-100 transform translate-y-0 max-h-96"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 transform translate-y-0 max-h-96"
                leave-to-class="opacity-0 transform -translate-y-2 max-h-0">
                <div v-if="isOpen('diabetesMellitus2')" class="font-medium space-y-2 p-4 border rounded-md shadow-sm bg-white mt-3 text-justify overflow-hidden">
                    <div class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                        <p class="italic text-sm font-light mb-4 leading-4 text-gray-700 hover:text-emerald-700 cursor-pointer"
                            @click="copiarTexto('Es importante mantener una dieta equilibrada, controlar regularmente los niveles de azúcar en la sangre y visitar al médico familiar para un seguimiento y una correcta gestión de la diabetes tipo 2. ')">
                            Es importante mantener una dieta equilibrada, controlar regularmente los niveles de azúcar en la sangre y visitar al médico familiar para un seguimiento y una correcta gestión de la diabetes tipo 2. 
                        </p>
                    </div>
                </div>
            </transition>

            <!-- Hipertensión -->
            <transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 transform -translate-y-2 max-h-0"
                enter-to-class="opacity-100 transform translate-y-0 max-h-96"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 transform translate-y-0 max-h-96"
                leave-to-class="opacity-0 transform -translate-y-2 max-h-0">
                <div v-if="isOpen('hipertension')" class="font-medium space-y-2 p-4 border rounded-md shadow-sm bg-white mt-3 overflow-hidden">
                    <div class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                        <p class="italic text-sm font-light mb-4 leading-4 text-gray-700 hover:text-emerald-700 cursor-pointer text-justify"
                            @click="copiarTexto('Es recomendable mantener una dieta baja en sodio, realizar actividad física regularmente, controlar la presión arterial periódicamente y adherirse estrictamente al tratamiento recetado para gestionar la hipertensión de manera efectiva. ')">
                            Es recomendable mantener una dieta baja en sodio, realizar actividad física regularmente, controlar la presión arterial periódicamente y adherirse estrictamente al tratamiento recetado para gestionar la hipertensión de manera efectiva. 
                        </p>
                    </div>
                </div>
            </transition>

            <!-- Hipoacusia -->
            <transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 transform -translate-y-2 max-h-0"
                enter-to-class="opacity-100 transform translate-y-0 max-h-96"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 transform translate-y-0 max-h-96"
                leave-to-class="opacity-0 transform -translate-y-2 max-h-0">
                <div v-if="isOpen('hipoacusia')" class="font-medium space-y-2 p-4 border rounded-md shadow-sm bg-white mt-3 text-justify overflow-hidden">
                    <div class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                        <p class="italic text-sm font-light mb-4 leading-4 text-gray-700 hover:text-emerald-700 cursor-pointer"
                            @click="copiarTexto('Es fundamental proteger la audición mediante el uso adecuado de protección auditiva en ambientes ruidosos, evitar la exposición prolongada a sonidos de alta intensidad, realizar evaluaciones auditivas periódicas y consultar al especialista ante cualquier cambio en la capacidad auditiva. ')">
                            Es fundamental proteger la audición mediante el uso adecuado de protección auditiva en ambientes ruidosos, evitar la exposición prolongada a sonidos de alta intensidad, realizar evaluaciones auditivas periódicas y consultar al especialista ante cualquier cambio en la capacidad auditiva.
                        </p>
                    </div>
                </div>
            </transition>

            <!-- Problemas Respiratorios -->
            <transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 transform -translate-y-2 max-h-0"
                enter-to-class="opacity-100 transform translate-y-0 max-h-96"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 transform translate-y-0 max-h-96"
                leave-to-class="opacity-0 transform -translate-y-2 max-h-0">
                <div v-if="isOpen('problemasRespiratorios')" class="font-medium space-y-2 p-4 border rounded-md shadow-sm bg-white mt-3 text-justify overflow-hidden">
                    <div class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                        <p class="italic text-sm font-light mb-4 leading-4 text-gray-700 hover:text-emerald-700 cursor-pointer"
                            @click="copiarTexto('Se recomienda evitar la exposición a agentes irritantes respiratorios, mantener una buena ventilación en los espacios de trabajo, realizar ejercicios de respiración profunda regularmente, evitar el tabaquismo y consultar al médico ante síntomas persistentes como tos, dificultad para respirar o sibilancias. ')">
                            Se recomienda evitar la exposición a agentes irritantes respiratorios, mantener una buena ventilación en los espacios de trabajo, realizar ejercicios de respiración profunda regularmente, evitar el tabaquismo y consultar al médico ante síntomas persistentes como tos, dificultad para respirar o sibilancias.
                        </p>
                    </div>
                </div>
            </transition>

            <!-- Lumbalgia -->
            <transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 transform -translate-y-2 max-h-0"
                enter-to-class="opacity-100 transform translate-y-0 max-h-96"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 transform translate-y-0 max-h-96"
                leave-to-class="opacity-0 transform -translate-y-2 max-h-0">
                <div v-if="isOpen('lumbalgia')" class="font-medium space-y-2 p-4 border rounded-md shadow-sm bg-white mt-3 text-justify overflow-hidden">
                    <div class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                        <p class="italic text-sm font-light mb-4 leading-4 text-gray-700 hover:text-emerald-700 cursor-pointer"
                            @click="copiarTexto('Es esencial mantener una postura correcta durante las actividades laborales, realizar ejercicios de fortalecimiento de la musculatura lumbar y abdominal, evitar movimientos bruscos o levantamiento de peso excesivo, y considerar el uso de soportes ergonómicos cuando sea necesario. ')">
                            Es esencial mantener una postura correcta durante las actividades laborales, realizar ejercicios de fortalecimiento de la musculatura lumbar y abdominal, evitar movimientos bruscos o levantamiento de peso excesivo, y considerar el uso de soportes ergonómicos cuando sea necesario.
                        </p>
                    </div>
                </div>
            </transition>

        </div>
    </div>
    </div>
</template>
