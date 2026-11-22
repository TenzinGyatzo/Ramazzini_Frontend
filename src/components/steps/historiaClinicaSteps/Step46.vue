<script setup>
    import { watch, ref, onMounted, nextTick, computed, toRefs } from 'vue';
    import { resumenAutomaticoHistoriaClinica, textoResumenPorDefecto } from '@/helpers/historiaClinicaGuardado';
    import OpcionesSegmentadas from '@/components/steps/captura/OpcionesSegmentadas.vue';
    import { CLASE_AYUDA, CLASE_ETIQUETA, CLASE_TEXTAREA } from '@/components/steps/captura/estiloCaptura';
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
    
    // Con «No» se guarda siempre este texto (prepararHistoriaClinicaParaGuardar): es lo que se
    // muestra, aunque la sección todavía no se haya revisado y el formulario siga vacío
    const textoPorDefecto = computed(() =>
        textoResumenPorDefecto(trabajadores.currentTrabajador?.sexo === 'Femenino'),
    );

    // Hallazgos de los antecedentes personales y del accidente laboral (mismo cálculo que al guardar)
    const resumenAutomatico = computed(() => resumenAutomaticoHistoriaClinica(formDataHistoriaClinica));
    
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
                // Al abrir no se mueve el cursor (punto 54: con antecedentes traídos, la página
                // saltaba hasta aquí)
                cambiarPregunta('Si');
            } else {
                resumenHistoriaClinicaPregunta.value = documentos.currentDocument.resumenHistoriaClinicaPregunta || 'No';
            }
        } else {
            // Si es un documento nuevo, detectar automáticamente si hay hallazgos
            if (resumenAutomatico.value) {
                // Hay hallazgos significativos - cargar el resumen automático
                cambiarPregunta('Si');
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
    
    // Punto 39: en la captura rápida esta sección está abierta desde el principio, antes de
    // capturar los antecedentes; el resumen sigue a los hallazgos mientras no se escriba uno propio.
    let usuarioEligioNo = false;
    let cambioPorHallazgos = false;
    const cambiarPregunta = (valor) => {
        cambioPorHallazgos = true;
        resumenHistoriaClinicaPregunta.value = valor;
        nextTick(() => {
            cambioPorHallazgos = false;
        });
    };
    let ultimoAutomatico = '';
    onMounted(() => {
        ultimoAutomatico = resumenAutomatico.value;
    });
    // Pregunta y texto se fijan aquí juntos (no en dos reacciones encadenadas): la segunda
    // ocurría mientras el paso se redibujaba y la pantalla se quedaba atrasada.
    watch(resumenAutomatico, (nuevo) => {
        const resumenEsAutomatico =
            !resumenHistoriaClinica.value ||
            resumenHistoriaClinica.value === ultimoAutomatico ||
            resumenHistoriaClinica.value === textoResumenPorDefecto(trabajadores.currentTrabajador?.sexo === 'Femenino');
        if (resumenHistoriaClinicaPregunta.value === 'No') {
            if (nuevo && !usuarioEligioNo) {
                cambiarPregunta('Si');
                resumenHistoriaClinica.value = nuevo;
            }
        } else if (resumenEsAutomatico) {
            if (nuevo) {
                resumenHistoriaClinica.value = nuevo;
            } else {
                cambiarPregunta('No');
                resumenHistoriaClinica.value = textoResumenPorDefecto(trabajadores.currentTrabajador?.sexo === 'Femenino');
            }
        }
        ultimoAutomatico = nuevo;
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
        // Si el cambio lo hizo el sistema (siguiendo los hallazgos), no se mueve el cursor
        const porHallazgos = cambioPorHallazgos;
        if (newValue === 'No') {
            usuarioEligioNo = !porHallazgos;
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
            if (textareaEspecificar.value && !porHallazgos) {
                textareaEspecificar.value.focus();
            }
        }
    });
    
    // Punto 39: diseño común, igual en los dos modos
    const OPCIONES_NO_SI = [
        { valor: 'No', etiqueta: 'No' },
        { valor: 'Si', etiqueta: 'Sí' },
    ];
    </script>
    
<template>
    <div>
        <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Resumen Historia Clínica</h1>
        <div data-campo="resumenHistoriaClinica">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <p :class="[CLASE_ETIQUETA, 'leading-tight']">Hallazgos significativos</p>
                    <p :class="[CLASE_AYUDA, 'mt-0.5']">¿Hay hallazgos significativos por resumir?</p>
                </div>
                <OpcionesSegmentadas
                    v-model="resumenHistoriaClinicaPregunta"
                    compacto
                    class="shrink-0"
                    name="resumenHistoriaClinicaPregunta"
                    etiqueta="Hallazgos significativos"
                    :opciones="OPCIONES_NO_SI"
                />
            </div>
            <p v-if="resumenHistoriaClinicaPregunta === 'No'" :class="[CLASE_AYUDA, 'mt-2']">
                Se registrará: «{{ textoPorDefecto }}».
            </p>
            <div v-else class="mt-3">
                <label for="resumenHistoriaClinica" :class="[CLASE_ETIQUETA, 'mb-1']">
                    Resumen de hallazgos <span class="text-red-500">*</span>
                </label>
                <p v-if="resumenAutomatico" :class="[CLASE_AYUDA, 'mb-1 flex items-start gap-1.5']">
                    <i class="fas fa-info-circle text-emerald-600 mt-0.5" aria-hidden="true"></i>
                    Se llenó con los hallazgos de los antecedentes personales; puede editarlo.
                </p>
                <textarea
                    id="resumenHistoriaClinica"
                    ref="textareaEspecificar"
                    v-model="resumenHistoriaClinica"
                    rows="4"
                    :class="CLASE_TEXTAREA"
                    placeholder="Hallazgos relevantes de los antecedentes"
                ></textarea>
            </div>
        </div>
    </div>
</template>
