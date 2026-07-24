<script setup>
import { ref, watch, onMounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useDocumentosStore } from '@/stores/documentos';
import DocumentosAPI from '@/api/DocumentosAPI';
import {
    obtenerCuatroTamizajesPsicologicosCercanos,
    construirTextoPaso4TamizajePsi,
} from '@/helpers/tamizajePsicologicoPaso4Resultados';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const mensajeCopiado = ref(false);

const trabajadores = useTrabajadoresStore();
const { formDataAptitud } = useFormDataStore();
const documentos = useDocumentosStore();

// Función para determinar qué guía mostrar basada en el valor de aptitudPuesto
const getGuiaRecomendada = () => {
    const aptitudPuesto = formDataAptitud.aptitudPuesto;
    
    if (!aptitudPuesto) {
        return null; // No hay valor seleccionado, mostrar todas las opciones
    }
    
    // Mapear los valores de aptitudPuesto a las secciones correspondientes
    // Para mujeres: guiaAptaSinRestricciones, para hombres: guiaAptoSinRestricciones
    const mapeoGuias = {
        'Apto Sin Restricciones': trabajadores.currentTrabajador.sexo === 'Femenino' ? 'guiaAptaSinRestricciones' : 'guiaAptoSinRestricciones',
        'Apto Con Precaución': trabajadores.currentTrabajador.sexo === 'Femenino' ? 'guiaAptaConPrecaucion' : 'guiaAptoConPrecaucion', 
        'Apto Con Restricciones': trabajadores.currentTrabajador.sexo === 'Femenino' ? 'guiaAptaConRestricciones' : 'guiaAptoConRestricciones',
        'No Apto': trabajadores.currentTrabajador.sexo === 'Femenino' ? 'guiaNoApta' : 'guiaNoApto',
        'Evaluación No Completada': 'guiaEvaluacionNoCompletada'
    };
    
    return mapeoGuias[aptitudPuesto] || null;
};

// Función para verificar si debe mostrar una sección específica
const shouldShowSection = (sectionName) => {
    const guiaRecomendada = getGuiaRecomendada();
    
    // Si no hay guía recomendada, mostrar todas las secciones
    if (!guiaRecomendada) {
        return true;
    }
    
    // Mostrar solo la sección recomendada
    return sectionName === guiaRecomendada;
};

// Función para obtener el mensaje de guía recomendada
const getMensajeGuiaRecomendada = () => {
    const aptitudPuesto = formDataAptitud.aptitudPuesto;
    
    if (!aptitudPuesto) {
        return null;
    }
    
    return `Guía recomendada para: ${aptitudPuesto}`;
};

// Valor local para la resultados principal, inicializado con el valor actual del store
const resultados = ref(formDataAptitud.resultados || '');

// Texto inicial sugerido
const inicioSugerido = "Posterior a efectuar el examen integral de salud ocupacional, se determina que actualmente "

// Variable para rastrear si el componente ya está montado
const isMounted = ref(false);

// Función auxiliar para obtener/establecer el aptitudPuesto que generó el texto
// Lo guardamos en formDataAptitud para que persista entre montajes del componente
const getAptitudPuestoQueGeneroTexto = () => {
    return formDataAptitud.aptitudPuestoQueGeneroTexto || null;
};

const setAptitudPuestoQueGeneroTexto = (valor) => {
    formDataAptitud.aptitudPuestoQueGeneroTexto = valor;
};

// Función para regenerar el texto automáticamente
const regenerarTextoAutomatico = async () => {
    // Solo regenerar si aptitudPuesto existe
    if (!formDataAptitud.aptitudPuesto) {
        return;
    }
    
    try {
        const textoPrecargado = await generarTextoPrecargado();
        formDataAptitud.resultados = textoPrecargado;
        resultados.value = textoPrecargado;
        // Guardar el aptitudPuesto que generó este texto en el store para persistencia
        setAptitudPuestoQueGeneroTexto(formDataAptitud.aptitudPuesto);
    } catch (error) {
        console.error('Error al regenerar texto automáticamente:', error);
    }
};

// Sincronizar el valor seleccionado con formDataAptitud.resultados
watch(resultados, (newValue) => {
    formDataAptitud.resultados = newValue;
});

// Watch para regenerar automáticamente cuando cambie aptitudPuesto
watch(() => formDataAptitud.aptitudPuesto, async (newAptitudPuesto) => {
    // Solo ejecutar después de que el componente esté montado
    if (!isMounted.value) {
        return;
    }
    
    // No regenerar si estamos editando un documento existente y la aptitud no ha cambiado
    if (documentos.currentDocument && newAptitudPuesto === documentos.currentDocument.aptitudPuesto) {
        return;
    }
    
    // Si aptitudPuesto existe y es diferente al que generó el texto actual, regenerar
    const aptitudPuestoAnterior = getAptitudPuestoQueGeneroTexto();
    if (newAptitudPuesto && newAptitudPuesto !== aptitudPuestoAnterior) {
        await regenerarTextoAutomatico();
    }
});

onMounted(async () => {
    if (documentos.currentDocument) {
        // Si la aptitud local ha cambiado respecto a la del documento guardado, regenerar automáticamente
        if (formDataAptitud.aptitudPuesto && formDataAptitud.aptitudPuesto !== documentos.currentDocument.aptitudPuesto) {
            await regenerarTextoAutomatico();
        } else {
            resultados.value = documentos.currentDocument.resultados;
            // Registrar qué aptitud generó este texto para evitar regeneraciones innecesarias
            setAptitudPuestoQueGeneroTexto(formDataAptitud.aptitudPuesto);
        }
    } else {
        const textoActual = formDataAptitud.resultados || '';
        const textoEstaVacio = !textoActual || textoActual.trim() === '' || textoActual === inicioSugerido;
        const aptitudPuestoAnterior = getAptitudPuestoQueGeneroTexto();
        
        // Si no hay aptitudPuesto, solo cargar el texto existente
        if (!formDataAptitud.aptitudPuesto) {
            resultados.value = textoActual;
        } else {
            // Si tenemos guardado qué aptitudPuesto generó el texto
            if (aptitudPuestoAnterior !== null) {
                // Si aptitudPuesto es igual al que generó el texto → conservar el texto tal cual
                if (formDataAptitud.aptitudPuesto === aptitudPuestoAnterior) {
                    resultados.value = textoActual;
                } else {
                    // Si aptitudPuesto cambió → regenerar
                    await regenerarTextoAutomatico();
                }
            } else {
                // Primera vez o no sabemos qué aptitudPuesto generó el texto
                if (textoEstaVacio) {
                    // Texto vacío → generar
                    await regenerarTextoAutomatico();
                } else {
                    // Hay texto guardado → intentar detectar si fue generado con el aptitudPuesto actual
                    try {
                        const textoQueSeGeneraria = await generarTextoPrecargado();
                        if (textoActual === textoQueSeGeneraria) {
                            // El texto coincide con el que se generaría → fue generado automáticamente
                            setAptitudPuestoQueGeneroTexto(formDataAptitud.aptitudPuesto);
                            resultados.value = textoActual;
                        } else {
                            // El texto no coincide → fue modificado manualmente o con otro aptitudPuesto
                            // Como no sabemos el aptitudPuesto original, regenerar con el actual
                            await regenerarTextoAutomatico();
                        }
                    } catch (error) {
                        // Si hay error al generar, conservar el texto actual
                        resultados.value = textoActual;
                    }
                }
            }
        }
    }
    
    // Marcar como montado
    isMounted.value = true;
});

const openSections = ref({});

const toggle = (section) => {
    openSections.value[section] = !openSections.value[section];
};

const isOpen = (section) => {
    return !!openSections.value[section];
};

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

// Función para determinar tipo de evaluación (MÉDICAMENTE vs CLÍNICAMENTE)
const determinarTipoEvaluacion = () => {
    const evaluacionesMedicas = [
        'Audiometría',
        'Espirometría',
        'Estudios de laboratorio',
        'Rx simple de tórax',
        'Rx columna lumbar',
        'Rx rodillas',
        'Electrocardiograma',
        'EKG',
        'Rayos X',
        'RX'
    ];

    const evaluacionesAdicionales = [
        formDataAptitud.evaluacionAdicional1,
        formDataAptitud.evaluacionAdicional2,
        formDataAptitud.evaluacionAdicional3,
        formDataAptitud.evaluacionAdicional4,
        formDataAptitud.evaluacionAdicional5,
        formDataAptitud.evaluacionAdicional6
    ].filter(evaluacion => evaluacion && evaluacion.trim() !== '');

    // Verificar si alguna evaluación adicional coincide con las evaluaciones médicas
    const tieneEvaluacionMedica = evaluacionesAdicionales.some(evaluacion => {
        const evalNormalizada = evaluacion.trim();
        return evaluacionesMedicas.some(medica => 
            evalNormalizada.toLowerCase().includes(medica.toLowerCase())
        );
    });

    return tieneEvaluacionMedica ? 'MÉDICAMENTE' : 'CLÍNICAMENTE';
};

// Función para obtener texto del paso 2 según motivoExamen
const obtenerTextoPaso2 = async () => {
    try {
        const response = await DocumentosAPI.getMotivoExamenReciente(trabajadores.currentTrabajadorId);
        const motivoExamen = response.data?.data?.motivoExamen;

        if (motivoExamen === 'Ingreso') {
            return 'en las actividades del puesto al que aspira. ';
        } else if (motivoExamen === 'Inicial' || motivoExamen === 'Periódico') {
            return 'en las actividades del puesto que desempeña. ';
        }

        return ''; // Si no hay motivoExamen o no coincide, retornar vacío
    } catch (error) {
        console.error('Error al obtener motivoExamen:', error);
        return ''; // En caso de error, retornar vacío
    }
};

// Función para generar texto automático del paso 1
const generarTextoPaso1 = () => {
    const aptitudPuesto = formDataAptitud.aptitudPuesto;
    const tipoEvaluacion = determinarTipoEvaluacion();
    const sexo = trabajadores.currentTrabajador.sexo;
    const esFemenino = sexo === 'Femenino';

    if (!aptitudPuesto) {
        return '';
    }

    let texto = '';

    switch (aptitudPuesto) {
        case 'Apto Sin Restricciones':
            if (esFemenino) {
                texto = tipoEvaluacion === 'MÉDICAMENTE' 
                    ? 'se encuentra médicamente SANA Y APTA PARA LABORAR SIN RESTRICCIONES '
                    : 'se encuentra clínicamente SANA Y APTA PARA LABORAR SIN RESTRICCIONES ';
            } else {
                texto = tipoEvaluacion === 'MÉDICAMENTE'
                    ? 'se encuentra médicamente SANO Y APTO PARA LABORAR SIN RESTRICCIONES '
                    : 'se encuentra clínicamente SANO Y APTO PARA LABORAR SIN RESTRICCIONES ';
            }
            break;

        case 'Apto Con Precaución':
            if (esFemenino) {
                texto = tipoEvaluacion === 'MÉDICAMENTE'
                    ? 'se encuentra médicamente APTA PARA LABORAR CON PRECAUCIÓN '
                    : 'se encuentra clínicamente APTA PARA LABORAR CON PRECAUCIÓN ';
            } else {
                texto = tipoEvaluacion === 'MÉDICAMENTE'
                    ? 'se encuentra médicamente APTO PARA LABORAR CON PRECAUCIÓN '
                    : 'se encuentra clínicamente APTO PARA LABORAR CON PRECAUCIÓN ';
            }
            break;

        case 'Apto Con Restricciones':
            if (esFemenino) {
                texto = tipoEvaluacion === 'MÉDICAMENTE'
                    ? 'se encuentra médicamente APTA PARA LABORAR CON RESTRICCIONES '
                    : 'se encuentra clínicamente APTA PARA LABORAR CON RESTRICCIONES ';
            } else {
                texto = tipoEvaluacion === 'MÉDICAMENTE'
                    ? 'se encuentra médicamente APTO PARA LABORAR CON RESTRICCIONES '
                    : 'se encuentra clínicamente APTO PARA LABORAR CON RESTRICCIONES ';
            }
            break;

        case 'No Apto':
            if (esFemenino) {
                texto = 'se encuentra NO APTA PARA LABORAR ';
            } else {
                texto = 'se encuentra NO APTO PARA LABORAR ';
            }
            break;

        case 'Evaluación No Completada':
            texto = 'NO ES POSIBLE CONCLUIR LA APTITUD AL PUESTO ';
            break;

        default:
            texto = '';
    }

    return texto;
};

// Función para generar texto automático del paso 3
const generarTextoPaso3 = () => {
    const aptitudPuesto = formDataAptitud.aptitudPuesto;
    const sexo = trabajadores.currentTrabajador.sexo;
    const esFemenino = sexo === 'Femenino';

    if (!aptitudPuesto) {
        return '';
    }

    let texto = '';

    switch (aptitudPuesto) {

        case 'Apto Con Precaución':
            if (esFemenino) {
                texto = 'Aunque apta para el trabajo, es esencial destacar que la presencia de ciertas condiciones médicas subyacentes demanda la adopción de precauciones adicionales para salvaguardar su salud y seguridad en el lugar de trabajo. ';
            } else {
                texto = 'Aunque apto para el trabajo, es esencial destacar que la presencia de ciertas condiciones médicas subyacentes demanda la adopción de precauciones adicionales para salvaguardar su salud y seguridad en el lugar de trabajo. ';
            }
            break;

        case 'Apto Con Restricciones':
            if (esFemenino) {
                texto = 'Aunque apta para el trabajo, requiere medidas adicionales para garantizar su seguridad y bienestar en el entorno laboral. ';
            } else {
                texto = 'Aunque apto para el trabajo, requiere medidas adicionales para garantizar su seguridad y bienestar en el entorno laboral. ';
            }
            break;

        case 'Apto Sin Restricciones':
        case 'No Apto':
        case 'Evaluación No Completada':
        default:
            texto = '';
            break;
    }

    return texto;
};

const generarTextoPaso4 = async () => {
    try {
        const docs = await obtenerCuatroTamizajesPsicologicosCercanos(
            trabajadores.currentTrabajadorId,
            formDataAptitud.fechaAptitudPuesto,
        );
        if (!docs) {
            return '';
        }
        return construirTextoPaso4TamizajePsi(docs);
    } catch (error) {
        console.error('Error al armar texto de tamizaje psicológico (paso 4):', error);
        return '';
    }
};

// Función para generar texto completo precargado
const generarTextoPrecargado = async () => {
    const textoPaso1 = generarTextoPaso1();
    const textoPaso2 = await obtenerTextoPaso2();
    const textoPaso3 = generarTextoPaso3();
    const textoPaso4 = await generarTextoPaso4();

    return inicioSugerido + textoPaso1 + textoPaso2 + textoPaso3 + textoPaso4;
};

</script>

<template>
    <div>
    <h1 v-if="variant !== 'compact'" class="font-bold mb-4 text-gray-800 leading-5">Aptitud al Puesto</h1>
    <div :class="variant === 'compact' ? 'mb-2' : 'mb-4'">
        <h2 v-if="variant !== 'compact'" class="text-lg font-semibold mb-4 text-gray-800">Resultados</h2>
        <p class="text-sm font-medium mb-1 text-gray-800 leading-4">Descripción de resultados:</p>
        <div class="font-light mb-4">
            <textarea
                class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-64"
                v-model="formDataAptitud.resultados" :placeholder="inicioSugerido || 'Cargando datos...'" required>
            </textarea>
        </div>

        <div v-if="trabajadores.currentTrabajador.sexo === 'Femenino'" class="mb-4">
            <div class="flex justify-between">
                <p class="font-medium mb-1 text-gray-800 leading-5">Opciones para detallar explicación: </p>
                <span v-if="mensajeCopiado" class="ml-2 text-emerald-600 text-sm">¡Copiado!</span>
            </div>
            <div class="flex justify-between mb-2">
                <p class="text-sm font-normal italic mb-1 text-gray-600 leading-5">Haga click sobre el texto deseado para copiarlo.</p>
            </div>

            <!-- Apta Sin Restricciones -->
            <div v-if="shouldShowSection('guiaAptaSinRestricciones')" class="space-y-2">
                <!-- Opción 1: Capacidad físico-funcional -->
                <button
                    class="bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block"
                    @click="toggle('agilidadFuerzaCardio')">
                    1. Capacidad físico-funcional
                </button>
                <div v-if="isOpen('agilidadFuerzaCardio')" class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-emerald-700 cursor-pointer text-justify"
                        @click="copiarTexto('La trabajadora parece demostrar niveles adecuados de agilidad física, fuerza y capacidad cardiorrespiratoria requeridos para ejecutar de forma segura las tareas esenciales de su puesto. ')">
                        La trabajadora parece demostrar niveles adecuados de agilidad física, fuerza y capacidad cardiorrespiratoria requeridos para ejecutar de forma segura las tareas esenciales de su puesto.
                    </p>
                </div>

                <!-- Opción 2: Sin limitaciones osteomusculares -->
                <button
                    class="bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('osteomuscularErgonomia')">
                    2. Sin limitaciones osteomusculares
                </button>
                <div v-if="isOpen('osteomuscularErgonomia')" class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-emerald-700 cursor-pointer text-justify"
                        @click="copiarTexto('Durante la evaluación no se identificaron limitaciones osteomusculares relevantes, por lo que se considera apta para realizar esfuerzos moderados, movimientos repetitivos y posturas prolongadas, siempre que se sigan las prácticas ergonómicas establecidas. ')">
                        Durante la evaluación no se identificaron limitaciones osteomusculares relevantes, por lo que se considera apta para realizar esfuerzos moderados, movimientos repetitivos y posturas prolongadas, siempre que se sigan las prácticas ergonómicas establecidas.
                    </p>
                </div>

                <!-- Opción 3: Sin condiciones que aumenten riesgo -->
                <button
                    class="bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('exposicionRiesgos')">
                    3. Sin condiciones que aumenten riesgo
                </button>
                <div v-if="isOpen('exposicionRiesgos')" class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-emerald-700 cursor-pointer text-justify"
                        @click="copiarTexto('Con base en la información disponible, no se identifican condiciones de salud que aumenten el riesgo ante las exposiciones propias del puesto, siempre que se mantengan las medidas de seguridad y se utilice el equipo de protección correspondiente. ')">
                        Con base en la información disponible, no se identifican condiciones de salud que aumenten el riesgo ante las exposiciones propias del puesto, siempre que se mantengan las medidas de seguridad y se utilice el equipo de protección correspondiente.
                    </p>
                </div>

                <!-- Opción 4: Capacidad funcional general -->
                <button
                    class="bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('capacidadFuncional')">
                    4. Capacidad funcional general
                </button>
                <div v-if="isOpen('capacidadFuncional')" class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-emerald-700 cursor-pointer text-justify"
                        @click="copiarTexto('La trabajadora mostró un nivel de capacidad funcional suficiente para satisfacer las demandas físicas y cognitivas inherentes al puesto, sin evidencia de fatiga excesiva ni de limitaciones clínicamente relevantes. ')">
                        La trabajadora mostró un nivel de capacidad funcional suficiente para satisfacer las demandas físicas y cognitivas inherentes al puesto, sin evidencia de fatiga excesiva ni de limitaciones clínicamente relevantes.
                    </p>
                </div>

                <!-- Opción 5: Coordinación y tareas específicas -->
                <button
                    class="bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('coordinacionTareas')">
                    5. Coordinación y tareas específicas
                </button>
                <div v-if="isOpen('coordinacionTareas')" class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-emerald-700 cursor-pointer text-justify"
                        @click="copiarTexto('De acuerdo con las evaluaciones realizadas, cuenta con la capacidad para ejecutar tareas que implican coordinación motora, levantamiento moderado de cargas y desplazamientos continuos de manera segura. ')">
                        De acuerdo con las evaluaciones realizadas, cuenta con la capacidad para ejecutar tareas que implican coordinación motora, levantamiento moderado de cargas y desplazamientos continuos de manera segura.
                    </p>
                </div>

                <!-- Opción 6: Adaptación al puesto -->
                <button
                    class="bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('adaptacionDemandas')">
                    6. Adaptación al puesto
                </button>
                <div v-if="isOpen('adaptacionDemandas')" class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-emerald-700 cursor-pointer text-justify"
                        @click="copiarTexto('El estado de salud observado es consistente con una adecuada adaptación funcional a las exigencias habituales del puesto, sin indicadores actuales de deterioro o incapacidad. ')">
                        El estado de salud observado es consistente con una adecuada adaptación funcional a las exigencias habituales del puesto, sin indicadores actuales de deterioro o incapacidad.
                    </p>
                </div>
            </div>
            <!-- Apta Con Precauciones -->
            <div v-if="shouldShowSection('guiaAptaConPrecaucion')" class="space-y-2">
                <!-- Ejemplos -->
                <button
                    class="bg-white text-yellow-600 border border-yellow-600 hover:bg-yellow-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('hipertension1')">
                    Hipertensión
                </button>
                <div v-if="isOpen('hipertension1')" class="p-4 border-l-4 border-yellow-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-yellow-700 cursor-pointer text-justify"
                        @click="copiarTexto('La individuo presenta un historial de hipertensión arterial, lo cual requiere un seguimiento cuidadoso de su presión sanguínea y la adherencia estricta a su tratamiento médico.')">
                        La individuo presenta un historial de hipertensión arterial, lo cual requiere un
                        seguimiento cuidadoso de su presión sanguínea y la adherencia estricta a su tratamiento
                        médico.
                    </p>
                </div>

                <button
                    class="bg-white text-yellow-600 border border-yellow-600 hover:bg-yellow-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('diabetes1')">
                    Diabetes Tipo II
                </button>
                <div v-if="isOpen('diabetes1')" class="p-4 border-l-4 border-yellow-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-yellow-700 cursor-pointer text-justify"
                        @click="copiarTexto('Se observa la presencia de diabetes tipo 2, lo que implica la necesidad de un monitoreo constante de los niveles de glucosa en sangre y una dieta adecuada para mantenerlos bajo control.')">
                        Se observa la presencia de diabetes tipo 2, lo que implica la necesidad de un monitoreo
                        constante de los niveles de glucosa en sangre y una dieta adecuada para mantenerlos bajo
                        control.
                    </p>
                </div>

                <button
                    class="bg-white text-yellow-600 border border-yellow-600 hover:bg-yellow-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('obesidad1')">
                    Obesidad Clase II
                </button>
                <div v-if="isOpen('obesidad1')" class="p-4 border-l-4 border-yellow-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-yellow-700 cursor-pointer text-justify"
                        @click="copiarTexto('La trabajadora ha sido diagnosticado con obesidad clase II, lo que aumenta el riesgo de complicaciones metabólicas y cardiovasculares, por lo que se recomienda la implementación de medidas para promover la pérdida de peso y mejorar su estado de salud general.')">
                        La trabajadora ha sido diagnosticado con obesidad clase II, lo que aumenta el riesgo de
                        complicaciones metabólicas y cardiovasculares, por lo que se recomienda la
                        implementación de medidas para promover la pérdida de peso y mejorar su estado de salud
                        general.
                    </p>
                </div>

                <button
                    class="bg-white text-yellow-600 border border-yellow-600 hover:bg-yellow-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('lumbalgia1')">
                    Lumbalgia Crónica
                </button>
                <div v-if="isOpen('lumbalgia1')" class="p-4 border-l-4 border-yellow-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-yellow-700 cursor-pointer text-justify"
                        @click="copiarTexto('Se ha identificado una historia de lumbalgia persistente, lo que indica la necesidad de evitar actividades que puedan exacerbar el dolor de espalda y la implementación de medidas ergonómicas en el entorno laboral para reducir el riesgo de lesiones.')">
                        Se ha identificado una historia de lumbalgia persistente, lo que indica la necesidad de
                        evitar actividades que puedan exacerbar el dolor de espalda y la implementación de
                        medidas ergonómicas en el entorno laboral para reducir el riesgo de lesiones.
                    </p>
                </div>
            </div>
            <!-- Apta Con Restricciones -->
            <div v-if="shouldShowSection('guiaAptaConRestricciones')" class="space-y-2">
                <!-- Ejemplos -->
                <button
                    class="bg-white text-orange-600 border border-orange-600 hover:bg-orange-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('herniaAbdominal')">
                    Hernia abdominal
                </button>
                <div v-if="isOpen('herniaAbdominal')" class="p-4 border-l-4 border-orange-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-orange-700 cursor-pointer text-justify"
                        @click="copiarTexto('La trabajadora presenta una hernia abdominal, por lo que debe ser valorado por un cirujano. Se recomienda uso en todo momento de faja lumbosacra y asignarle tareas que no impliquen esfuerzo físico excesivo. Asimismo, debe proporcionarse asistencia o equipo adecuado para el manejo de carga.')">
                        La trabajadora presenta una hernia abdominal, por lo que debe ser valorado por un
                        cirujano. Se recomienda uso en todo momento de faja lumbosacra y asignarle tareas que no
                        impliquen esfuerzo físico excesivo. Asimismo, debe proporcionarse asistencia o equipo
                        adecuado para el manejo de carga.
                    </p>
                </div>

                <button
                    class="bg-white text-orange-600 border border-orange-600 hover:bg-orange-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('problemaEspalda')">
                    Problema espalda
                </button>
                <div v-if="isOpen('problemaEspalda')" class="p-4 border-l-4 border-orange-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-orange-700 cursor-pointer text-justify"
                        @click="copiarTexto('La trabajadora debe evitar levantar objetos pesados debido a la condición de su espalda baja, por lo que se recomienda asignar tareas que no impliquen esfuerzo físico excesivo y proporcionar asistencia o equipo adecuado para el manejo de carga.')">
                        La trabajadora debe evitar levantar objetos pesados debido a la condición de su espalda
                        baja, por lo que se recomienda asignar tareas que no impliquen esfuerzo físico excesivo
                        y proporcionar asistencia o equipo adecuado para el manejo de carga.
                    </p>
                </div>

                <button
                    class="bg-white text-orange-600 border border-orange-600 hover:bg-orange-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('varices')">
                    Várices en piernas
                </button>
                <div v-if="isOpen('varices')" class="p-4 border-l-4 border-orange-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-orange-700 cursor-pointer text-justify"
                        @click="copiarTexto('Se sugiere la implementación de un horario de trabajo flexible para permitir pausas frecuentes y evitar períodos prolongados de estar de pie, lo cual ayudará a mitigar el dolor crónico en las piernas debido a una condición de várices.')">
                        Se sugiere la implementación de un horario de trabajo flexible para permitir pausas
                        frecuentes y evitar períodos prolongados de estar de pie, lo cual ayudará a mitigar el
                        dolor crónico en las piernas debido a una condición de várices.
                    </p>
                </div>

                <button
                    class="bg-white text-orange-600 border border-orange-600 hover:bg-orange-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('malformacionMano')">
                    Malformación mano
                </button>
                <div v-if="isOpen('malformacionMano')" class="p-4 border-l-4 border-orange-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-orange-700 cursor-pointer text-justify"
                        @click="copiarTexto('Dada a la malformación congénita de la mano izquierda, se recomienda la implementación de tecnologías de asistencia, como dispositivos de ayuda para la manipulación de objetos, así como la adaptación de las tareas laborales para optimizar la funcionalidad y la independencia de la trabajadora en el entorno de trabajo.')">
                        Dada a la malformación congénita de la mano izquierda, se recomienda la implementación
                        de tecnologías de asistencia, como dispositivos de ayuda para la manipulación de
                        objetos, así como la adaptación de las tareas laborales para optimizar la funcionalidad
                        y la independencia de la trabajadora en el entorno de trabajo.
                    </p>
                </div>

                <button
                    class="bg-white text-orange-600 border border-orange-600 hover:bg-orange-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('lesionRodilla')">
                    Lesión rodilla
                </button>
                <div v-if="isOpen('lesionRodilla')" class="p-4 border-l-4 border-orange-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-orange-700 cursor-pointer text-justify"
                        @click="copiarTexto('Para adaptarse a una limitación de movilidad causada por una lesión en la rodilla, se sugiere la asignación de un espacio de trabajo accesible y la provisión de una silla ergonómica con soporte lumbar para garantizar comodidad y evitar el deterioro de la condición física.')">
                        Para adaptarse a una limitación de movilidad causada por una lesión en la rodilla, se
                        sugiere la asignación de un espacio de trabajo accesible y la provisión de una silla
                        ergonómica con soporte lumbar para garantizar comodidad y evitar el deterioro de la
                        condición física.
                    </p>
                </div>
            </div>
            <!-- No Apta -->
            <div v-if="shouldShowSection('guiaNoApta')" class="space-y-2">
                <!-- Botón principal -->
                <button
                    class="bg-white text-red-600 border border-red-600 hover:bg-red-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('guiaNoApta')">
                    No Apta
                </button>

                <!-- Contenedor del desplegable -->
                <div v-if="isOpen('guiaNoApta')" class="font-medium space-y-2 p-4 border rounded-md shadow-sm bg-white">
                    <div class="p-4 border-l-4 border-red-500 bg-gray-100">
                        <p class="font-semibold text-sm text-gray-700">PASO 1. Usar:</p>
                        <p class="italic text-sm font-light mb-4 leading-4 text-gray-700 hover:text-red-700 cursor-pointer"
                            @click="copiarTexto('se encuentra NO APTA PARA LABORAR en las actividades del puesto al que aspira. ')">
                            se encuentra <span class="font-semibold">NO APTA PARA LABORAR</span> en las actividades del
                            puesto al que aspira.
                        </p>

                        <p class="font-semibold text-sm text-gray-700 mt-4">PASO 2. Explicar detalladamente
                            el/los motivo(s):</p>
                        <ul class="list-disc list-inside">
                            <li class="text-gray-700 hover:text-red-700 cursor-pointer leading-4">
                                <p class="italic text-sm font-light inline" @click="copiarTexto('Toda vez que ')">
                                    Toda vez que...
                                </p>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <!-- Evaluación No Completada -->
            <div v-if="shouldShowSection('guiaEvaluacionNoCompletada')" class="space-y-2">
                <!-- Botón principal -->
                <button
                    class="bg-white text-gray-600 border border-gray-600 hover:bg-gray-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('guiaEvaluacionNoCompletada')">
                    Evaluación No Completada
                </button>

                <!-- Contenedor del desplegable -->
                <div v-if="isOpen('guiaEvaluacionNoCompletada')"
                    class="font-medium space-y-2 p-4 border rounded-md shadow-sm bg-white">
                    <div class="p-4 border-l-4 border-gray-500 bg-gray-100">

                        <p class="font-semibold text-sm text-gray-700">PASO 1. Explicar:</p>
                        <p class="font-semibold text-sm text-gray-700">Ejemplos de inicio de explicación</p>
                        <ul class="list-disc list-inside">
                            <li class="text-gray-700 hover:text-blue-700 cursor-pointer leading-4">
                                <p class="italic text-sm font-light inline"
                                    @click="copiarTexto('No es posible saber si ')">
                                    No es posible saber si...
                                </p>
                            </li>
                            <li class="text-gray-700 hover:text-blue-700 cursor-pointer leading-4">
                                <p class="italic text-sm font-light inline"
                                    @click="copiarTexto('No se dispone de información suficiente sobre ')">
                                    No se dispone de información suficiente sobre...
                                </p>
                            </li>
                            <li class="text-gray-700 hover:text-blue-700 cursor-pointer leading-4">
                                <p class="italic text-sm font-light inline"
                                    @click="copiarTexto('El trabajador tiene una condición que podría implicar ')">
                                    El trabajador tiene una condición que podría implicar...
                                </p>
                            </li>
                        </ul>

                        <p class="font-semibold text-sm text-gray-700 mt-4">PASO 2. Indicar:</p>
                        <p class="font-semibold text-sm text-gray-700">Ejemplos de inicio de indicaciones:
                        </p>
                        <ul class="list-disc list-inside">
                            <li class="text-gray-700 hover:text-blue-700 cursor-pointer leading-4">
                                <p class="italic text-sm font-light inline"
                                    @click="copiarTexto('Es necesario realizar una evaluación detallada de ')">
                                    Es necesario realizar una evaluación detallada de...
                                </p>
                            </li>
                            <li class="text-gray-700 hover:text-blue-700 cursor-pointer leading-4">
                                <p class="italic text-sm font-light inline"
                                    @click="copiarTexto('Es imperativo que el candidato se someta a una evaluación de ')">
                                    Es imperativo que el candidato se someta a una evaluación de...
                                </p>
                            </li>
                            <li class="text-gray-700 hover:text-blue-700 cursor-pointer leading-4">
                                <p class="italic text-sm font-light inline"
                                    @click="copiarTexto('Es esencial que el candidato complete un programa de rehabilitación física de ')">
                                    Es esencial que el candidato complete un programa de rehabilitación física de...
                                </p>
                            </li>
                        </ul>

                        <p class="font-semibold text-sm text-gray-700 mt-4">PASO 3. Terminar:</p>
                        <p class="italic text-sm font-light mb-4 leading-4 text-gray-700 hover:text-blue-700 cursor-pointer"
                            @click="copiarTexto('antes de volver a evaluar su aptitud para el puesto.')">
                            ...antes de volver a evaluar su aptitud para el puesto.
                        </p>

                    </div>
                </div>
            </div>
        </div>

        <div v-else class="mb-4">
            <div class="flex justify-between">
                <p class="font-medium mb-1 text-gray-800 leading-5">Opciones para detallar explicación: </p>
                <span v-if="mensajeCopiado" class="ml-2 text-emerald-600 text-sm">¡Copiado!</span>
            </div>

            <div class="flex justify-between mb-2">
                <p class="text-sm font-normal italic mb-1 text-gray-600 leading-5">Haga click sobre el texto deseado para copiarlo.</p>
            </div>
            <!-- Apto Sin Restricciones -->
            <div v-if="shouldShowSection('guiaAptoSinRestricciones')" class="space-y-2">
                <!-- Opción 1: Capacidad físico-funcional -->
                <button
                    class="bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block"
                    @click="toggle('agilidadFuerzaCardio')">
                    1. Capacidad físico-funcional
                </button>
                <div v-if="isOpen('agilidadFuerzaCardio')" class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-emerald-700 cursor-pointer text-justify"
                        @click="copiarTexto('El trabajador parece demostrar niveles adecuados de agilidad física, fuerza y capacidad cardiorrespiratoria requeridos para ejecutar de forma segura las tareas esenciales de su puesto. ')">
                        El trabajador parece demostrar niveles adecuados de agilidad física, fuerza y capacidad cardiorrespiratoria requeridos para ejecutar de forma segura las tareas esenciales de su puesto.
                    </p>
                </div>

                <!-- Opción 2: Sin limitaciones osteomusculares -->
                <button
                    class="bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('osteomuscularErgonomia')">
                    2. Sin limitaciones osteomusculares
                </button>
                <div v-if="isOpen('osteomuscularErgonomia')" class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-emerald-700 cursor-pointer text-justify"
                        @click="copiarTexto('Durante la evaluación no se identificaron limitaciones osteomusculares relevantes, por lo que se considera apto para realizar esfuerzos moderados, movimientos repetitivos y posturas prolongadas, siempre que se sigan las prácticas ergonómicas establecidas. ')">
                        Durante la evaluación no se identificaron limitaciones osteomusculares relevantes, por lo que se considera apto para realizar esfuerzos moderados, movimientos repetitivos y posturas prolongadas, siempre que se sigan las prácticas ergonómicas establecidas.
                    </p>
                </div>

                <!-- Opción 3: Sin condiciones que aumenten riesgo -->
                <button
                    class="bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('exposicionRiesgos')">
                    3. Sin condiciones que aumenten riesgo
                </button>
                <div v-if="isOpen('exposicionRiesgos')" class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-emerald-700 cursor-pointer text-justify"
                        @click="copiarTexto('Con base en la información disponible, no se identifican condiciones de salud que aumenten el riesgo ante las exposiciones propias del puesto, siempre que se mantengan las medidas de seguridad y se utilice el equipo de protección correspondiente. ')">
                        Con base en la información disponible, no se identifican condiciones de salud que aumenten el riesgo ante las exposiciones propias del puesto, siempre que se mantengan las medidas de seguridad y se utilice el equipo de protección correspondiente.
                    </p>
                </div>

                <!-- Opción 4: Capacidad funcional general -->
                <button
                    class="bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('capacidadFuncional')">
                    4. Capacidad funcional general
                </button>
                <div v-if="isOpen('capacidadFuncional')" class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-emerald-700 cursor-pointer text-justify"
                        @click="copiarTexto('El trabajador mostró un nivel de capacidad funcional suficiente para satisfacer las demandas físicas y cognitivas inherentes al puesto, sin evidencia de fatiga excesiva ni de limitaciones clínicamente relevantes. ')">
                        El trabajador mostró un nivel de capacidad funcional suficiente para satisfacer las demandas físicas y cognitivas inherentes al puesto, sin evidencia de fatiga excesiva ni de limitaciones clínicamente relevantes.
                    </p>
                </div>

                <!-- Opción 5: Coordinación y tareas específicas -->
                <button
                    class="bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('coordinacionTareas')">
                    5. Coordinación y tareas específicas
                </button>
                <div v-if="isOpen('coordinacionTareas')" class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-emerald-700 cursor-pointer text-justify"
                        @click="copiarTexto('De acuerdo con las evaluaciones realizadas, cuenta con la capacidad para ejecutar tareas que implican coordinación motora, levantamiento moderado de cargas y desplazamientos continuos de manera segura. ')">
                        De acuerdo con las evaluaciones realizadas, cuenta con la capacidad para ejecutar tareas que implican coordinación motora, levantamiento moderado de cargas y desplazamientos continuos de manera segura.
                    </p>
                </div>

                <!-- Opción 6: Adaptación al puesto -->
                <button
                    class="bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('adaptacionDemandas')">
                    6. Adaptación al puesto
                </button>
                <div v-if="isOpen('adaptacionDemandas')" class="p-4 border-l-4 border-emerald-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-emerald-700 cursor-pointer text-justify"
                        @click="copiarTexto('El estado de salud observado es consistente con una adecuada adaptación funcional a las exigencias habituales del puesto, sin indicadores actuales de deterioro o incapacidad. ')">
                        El estado de salud observado es consistente con una adecuada adaptación funcional a las exigencias habituales del puesto, sin indicadores actuales de deterioro o incapacidad.
                    </p>
                </div>
            </div>
            <!-- Apto Con Precauciones -->
            <div v-if="shouldShowSection('guiaAptoConPrecaucion')" class="space-y-2">
                <!-- Ejemplos -->
                <button
                    class="bg-white text-yellow-600 border border-yellow-600 hover:bg-yellow-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('hipertension1')">
                    Hipertensión
                </button>
                <div v-if="isOpen('hipertension1')" class="p-4 border-l-4 border-yellow-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-yellow-700 cursor-pointer text-justify"
                        @click="copiarTexto('El individuo presenta un historial de hipertensión arterial, lo cual requiere un seguimiento cuidadoso de su presión sanguínea y la adherencia estricta a su tratamiento médico.')">
                        El individuo presenta un historial de hipertensión arterial, lo cual requiere un
                        seguimiento cuidadoso de su presión sanguínea y la adherencia estricta a su tratamiento
                        médico.
                    </p>
                </div>

                <button
                    class="bg-white text-yellow-600 border border-yellow-600 hover:bg-yellow-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('diabetes1')">
                    Diabetes Tipo II
                </button>
                <div v-if="isOpen('diabetes1')" class="p-4 border-l-4 border-yellow-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-yellow-700 cursor-pointer text-justify"
                        @click="copiarTexto('Se observa la presencia de diabetes tipo 2, lo que implica la necesidad de un monitoreo constante de los niveles de glucosa en sangre y una dieta adecuada para mantenerlos bajo control.')">
                        Se observa la presencia de diabetes tipo 2, lo que implica la necesidad de un monitoreo
                        constante de los niveles de glucosa en sangre y una dieta adecuada para mantenerlos bajo
                        control.
                    </p>
                </div>

                <button
                    class="bg-white text-yellow-600 border border-yellow-600 hover:bg-yellow-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('obesidad1')">
                    Obesidad Clase II
                </button>
                <div v-if="isOpen('obesidad1')" class="p-4 border-l-4 border-yellow-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-yellow-700 cursor-pointer text-justify"
                        @click="copiarTexto('El trabajador ha sido diagnosticado con obesidad clase II, lo que aumenta el riesgo de complicaciones metabólicas y cardiovasculares, por lo que se recomienda la implementación de medidas para promover la pérdida de peso y mejorar su estado de salud general.')">
                        El trabajador ha sido diagnosticado con obesidad clase II, lo que aumenta el riesgo de
                        complicaciones metabólicas y cardiovasculares, por lo que se recomienda la
                        implementación de medidas para promover la pérdida de peso y mejorar su estado de salud
                        general.
                    </p>
                </div>

                <button
                    class="bg-white text-yellow-600 border border-yellow-600 hover:bg-yellow-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('lumbalgia1')">
                    Lumbalgia Crónica
                </button>
                <div v-if="isOpen('lumbalgia1')" class="p-4 border-l-4 border-yellow-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-yellow-700 cursor-pointer text-justify"
                        @click="copiarTexto('Se ha identificado una historia de lumbalgia persistente, lo que indica la necesidad de evitar actividades que puedan exacerbar el dolor de espalda y la implementación de medidas ergonómicas en el entorno laboral para reducir el riesgo de lesiones.')">
                        Se ha identificado una historia de lumbalgia persistente, lo que indica la necesidad de
                        evitar actividades que puedan exacerbar el dolor de espalda y la implementación de
                        medidas ergonómicas en el entorno laboral para reducir el riesgo de lesiones.
                    </p>
                </div>
            </div>
            <!-- Apto Con Restricciones -->
            <div v-if="shouldShowSection('guiaAptoConRestricciones')" class="space-y-2">
                <!-- Ejemplos -->
                <button
                    class="bg-white text-orange-600 border border-orange-600 hover:bg-orange-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('herniaAbdominal')">
                    Hernia abdominal
                </button>
                <div v-if="isOpen('herniaAbdominal')" class="p-4 border-l-4 border-orange-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-orange-700 cursor-pointer text-justify"
                        @click="copiarTexto('El individuo presenta una hernia abdominal, por lo que debe ser valorado por un cirujano. Se recomienda uso en todo momento de faja lumbosacra y asignarle tareas que no impliquen esfuerzo físico excesivo. Asimismo, debe proporcionarse asistencia o equipo adecuado para el manejo de carga.')">
                        El individuo presenta una hernia abdominal, por lo que debe ser valorado por un
                        cirujano. Se recomienda uso en todo momento de faja lumbosacra y asignarle tareas que no
                        impliquen esfuerzo físico excesivo. Asimismo, debe proporcionarse asistencia o equipo
                        adecuado para el manejo de carga.
                    </p>
                </div>

                <button
                    class="bg-white text-orange-600 border border-orange-600 hover:bg-orange-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('problemaEspalda')">
                    Problema espalda
                </button>
                <div v-if="isOpen('problemaEspalda')" class="p-4 border-l-4 border-orange-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-orange-700 cursor-pointer text-justify"
                        @click="copiarTexto('El individuo debe evitar levantar objetos pesados debido a la condición de su espalda baja, por lo que se recomienda asignar tareas que no impliquen esfuerzo físico excesivo y proporcionar asistencia o equipo adecuado para el manejo de carga.')">
                        El individuo debe evitar levantar objetos pesados debido a la condición de su espalda
                        baja, por lo que se recomienda asignar tareas que no impliquen esfuerzo físico excesivo
                        y proporcionar asistencia o equipo adecuado para el manejo de carga.
                    </p>
                </div>

                <button
                    class="bg-white text-orange-600 border border-orange-600 hover:bg-orange-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('varices')">
                    Várices en piernas
                </button>
                <div v-if="isOpen('varices')" class="p-4 border-l-4 border-orange-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-orange-700 cursor-pointer text-justify"
                        @click="copiarTexto('Se sugiere la implementación de un horario de trabajo flexible para permitir pausas frecuentes y evitar períodos prolongados de estar de pie, lo cual ayudará a mitigar el dolor crónico en las piernas debido a una condición de várices.')">
                        Se sugiere la implementación de un horario de trabajo flexible para permitir pausas
                        frecuentes y evitar períodos prolongados de estar de pie, lo cual ayudará a mitigar el
                        dolor crónico en las piernas debido a una condición de várices.
                    </p>
                </div>

                <button
                    class="bg-white text-orange-600 border border-orange-600 hover:bg-orange-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('malformacionMano')">
                    Malformación mano
                </button>
                <div v-if="isOpen('malformacionMano')" class="p-4 border-l-4 border-orange-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-orange-700 cursor-pointer text-justify"
                        @click="copiarTexto('Dada a la malformación congénita de la mano izquierda, se recomienda la implementación de tecnologías de asistencia, como dispositivos de ayuda para la manipulación de objetos, así como la adaptación de las tareas laborales para optimizar la funcionalidad y la independencia del individuo en el entorno de trabajo.')">
                        Dada a la malformación congénita de la mano izquierda, se recomienda la implementación
                        de tecnologías de asistencia, como dispositivos de ayuda para la manipulación de
                        objetos, así como la adaptación de las tareas laborales para optimizar la funcionalidad
                        y la independencia del individuo en el entorno de trabajo.
                    </p>
                </div>

                <button
                    class="bg-white text-orange-600 border border-orange-600 hover:bg-orange-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('lesionRodilla')">
                    Lesión rodilla
                </button>
                <div v-if="isOpen('lesionRodilla')" class="p-4 border-l-4 border-orange-500 bg-gray-100">
                    <p class="italic text-sm font-light mb-4 text-gray-700 hover:text-orange-700 cursor-pointer text-justify"
                        @click="copiarTexto('Para adaptarse a una limitación de movilidad causada por una lesión en la rodilla, se sugiere la asignación de un espacio de trabajo accesible y la provisión de una silla ergonómica con soporte lumbar para garantizar comodidad y evitar el deterioro de la condición física.')">
                        Para adaptarse a una limitación de movilidad causada por una lesión en la rodilla, se
                        sugiere la asignación de un espacio de trabajo accesible y la provisión de una silla
                        ergonómica con soporte lumbar para garantizar comodidad y evitar el deterioro de la
                        condición física.
                    </p>
                </div>
            </div>
            <!-- No Apto -->
            <div v-if="shouldShowSection('guiaNoApto')" class="space-y-2">
                <!-- Botón principal -->
                <button
                    class="bg-white text-red-600 border border-red-600 hover:bg-red-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('guiaNoApto')">
                    No Apto
                </button>

                <!-- Contenedor del desplegable -->
                <div v-if="isOpen('guiaNoApto')" class="font-medium space-y-2 p-4 border rounded-md shadow-sm bg-white">
                    <div class="p-4 border-l-4 border-red-500 bg-gray-100">
                        <p class="font-semibold text-sm text-gray-700">PASO 1. Usar:</p>
                        <p class="italic text-sm font-light mb-4 leading-4 text-gray-700 hover:text-red-700 cursor-pointer"
                            @click="copiarTexto('se encuentra NO APTO PARA LABORAR en las actividades del puesto al que aspira. ')">
                            se encuentra <span class="font-semibold">NO APTO PARA LABORAR</span> en las actividades del
                            puesto al que aspira.
                        </p>

                        <p class="font-semibold text-sm text-gray-700 mt-4">PASO 2. Explicar detalladamente
                            el/los motivo(s):</p>
                        <ul class="list-disc list-inside">
                            <li class="text-gray-700 hover:text-red-700 cursor-pointer leading-4">
                                <p class="italic text-sm font-light inline" @click="copiarTexto('Toda vez que ')">
                                    Toda vez que...
                                </p>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <!-- Evaluación No Completada -->
            <div v-if="shouldShowSection('guiaEvaluacionNoCompletada')" class="space-y-2">
                <!-- Botón principal -->
                <button
                    class="bg-white text-gray-600 border border-gray-600 hover:bg-gray-600 hover:text-white text-sm font-medium py-1.5 px-3 rounded-lg w-fit max-w-full text-left block mt-2"
                    @click="toggle('guiaEvaluacionNoCompletada')">
                    Evaluación No Completada
                </button>

                <!-- Contenedor del desplegable -->
                <div v-if="isOpen('guiaEvaluacionNoCompletada')"
                    class="font-medium space-y-2 p-4 border rounded-md shadow-sm bg-white">
                    <div class="p-4 border-l-4 border-gray-500 bg-gray-100">

                        <p class="font-semibold text-sm text-gray-700">PASO 1. Explicar:</p>
                        <p class="font-semibold text-sm text-gray-700">Ejemplos de inicio de explicación</p>
                        <ul class="list-disc list-inside">
                            <li class="text-gray-700 hover:text-blue-700 cursor-pointer leading-4">
                                <p class="italic text-sm font-light inline"
                                    @click="copiarTexto('No es posible saber si ')">
                                    No es posible saber si...
                                </p>
                            </li>
                            <li class="text-gray-700 hover:text-blue-700 cursor-pointer leading-4">
                                <p class="italic text-sm font-light inline"
                                    @click="copiarTexto('No se dispone de información suficiente sobre ')">
                                    No se dispone de información suficiente sobre...
                                </p>
                            </li>
                            <li class="text-gray-700 hover:text-blue-700 cursor-pointer leading-4">
                                <p class="italic text-sm font-light inline"
                                    @click="copiarTexto('El trabajador tiene una condición que podría implicar ')">
                                    El trabajador tiene una condición que podría implicar...
                                </p>
                            </li>
                        </ul>

                        <p class="font-semibold text-sm text-gray-700 mt-4">PASO 2. Indicar:</p>
                        <p class="font-semibold text-sm text-gray-700">Ejemplos de inicio de indicaciones:
                        </p>
                        <ul class="list-disc list-inside">
                            <li class="text-gray-700 hover:text-blue-700 cursor-pointer leading-4">
                                <p class="italic text-sm font-light inline"
                                    @click="copiarTexto('Es necesario realizar una evaluación detallada de ')">
                                    Es necesario realizar una evaluación detallada de...
                                </p>
                            </li>
                            <li class="text-gray-700 hover:text-blue-700 cursor-pointer leading-4">
                                <p class="italic text-sm font-light inline"
                                    @click="copiarTexto('Es imperativo que el candidato se someta a una evaluación de ')">
                                    Es imperativo que el candidato se someta a una evaluación de...
                                </p>
                            </li>
                            <li class="text-gray-700 hover:text-blue-700 cursor-pointer leading-4">
                                <p class="italic text-sm font-light inline"
                                    @click="copiarTexto('Es esencial que el candidato complete un programa de rehabilitación física de ')">
                                    Es esencial que el candidato complete un programa de rehabilitación física de...
                                </p>
                            </li>
                        </ul>

                        <p class="font-semibold text-sm text-gray-700 mt-4">PASO 3. Terminar:</p>
                        <p class="italic text-sm font-light mb-4 leading-4 text-gray-700 hover:text-blue-700 cursor-pointer"
                            @click="copiarTexto('antes de volver a evaluar su aptitud para el puesto.')">
                            ...antes de volver a evaluar su aptitud para el puesto.
                        </p>

                    </div>
                </div>
            </div>
        </div>
    </div>
    </div>
</template>
