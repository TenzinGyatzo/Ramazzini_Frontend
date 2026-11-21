<script setup>
import { watch, ref, onMounted, nextTick, toRefs, computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { limpiarTextoDeNo } from '@/helpers/historiaClinicaGuardado';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import OpcionesSegmentadas from '@/components/steps/captura/OpcionesSegmentadas.vue';
import { CLASE_AYUDA, CLASE_ETIQUETA, CLASE_INPUT } from '@/components/steps/captura/estiloCaptura';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);
const isCompact = computed(() => variant.value === 'compact');


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

// Sincronizar valores con formData
watch(accidenteLaboral, (newValue) => {
    formDataHistoriaClinica.accidenteLaboral = newValue;
});

// Watch para establecer 'Defaults' cuando accidenteLaboral sea 'No' y enfocar input cuando sea 'Si'
watch(accidenteLaboral, async (newValue, oldValue) => {
    if (oldValue === undefined || oldValue === newValue) return;
    if (newValue === 'No') {
        formDataHistoriaClinica.accidenteLaboral = 'No';
        formDataHistoriaClinica.accidenteLaboralEspecificar = 'Niega haber sufrido riesgos de trabajo';
        formDataHistoriaClinica.descripcionDelDano = 'Ninguno';
        formDataHistoriaClinica.secuelas = 'Sin secuelas';
    }
    if (newValue === 'Si') {
        // Punto 39: los textos de «No» no se quedan en los campos a especificar
        limpiarTextoDeNo(formDataHistoriaClinica, 'accidenteLaboralEspecificar', 'Niega haber sufrido riesgos de trabajo');
        limpiarTextoDeNo(formDataHistoriaClinica, 'descripcionDelDano', 'Ninguno');
        limpiarTextoDeNo(formDataHistoriaClinica, 'secuelas', 'Sin secuelas');
        // Esperar a que el DOM se actualice y luego enfocar el primer input
        await nextTick();
        if (inputEspecificar.value) {
            inputEspecificar.value.focus();
        }
    }
});

// Punto 39: diseño común, igual en los dos modos (en la captura rápida, los tres datos en una fila)
const capturaRapida = enCapturaRapida();
const OPCIONES_NO_SI = [
  { valor: 'No', etiqueta: 'No' },
  { valor: 'Si', etiqueta: 'Sí' },
];
</script>

<template>
  <div>
    <h1 v-if="!isCompact" class="text-2xl font-bold mb-4 text-gray-900">Antecedentes Laborales</h1>
    <div data-campo="accidenteLaboral" class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p :class="[CLASE_ETIQUETA, 'leading-tight']">Riesgo de trabajo</p>
        <p :class="[CLASE_AYUDA, 'mt-0.5']">¿Ha sufrido riesgos de trabajo? (accidente o enfermedad de trabajo)</p>
      </div>
      <OpcionesSegmentadas
        v-model="accidenteLaboral"
        compacto
        class="shrink-0"
        name="accidenteLaboral"
        etiqueta="Riesgo de trabajo"
        :opciones="OPCIONES_NO_SI"
      />
    </div>
    <div
      v-if="accidenteLaboral === 'Si'"
      :class="['mt-3 grid gap-3', capturaRapida ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1']"
    >
      <div>
        <label for="accidenteLaboralEspecificar" :class="[CLASE_ETIQUETA, 'mb-1']">Accidente o enfermedad <span class="text-red-500">*</span></label>
        <input
          id="accidenteLaboralEspecificar"
          ref="inputEspecificar"
          data-campo="accidenteLaboralEspecificar"
          v-model="formDataHistoriaClinica.accidenteLaboralEspecificar"
          type="text"
          :class="CLASE_INPUT"
          placeholder="Descripción de accidente o enfermedad"
        />
      </div>
      <div>
        <label for="descripcionDelDano" :class="[CLASE_ETIQUETA, 'mb-1']">Daño <span class="text-red-500">*</span></label>
        <input
          id="descripcionDelDano"
          data-campo="descripcionDelDano"
          v-model="formDataHistoriaClinica.descripcionDelDano"
          type="text"
          :class="CLASE_INPUT"
          placeholder="Descripción del daño"
        />
      </div>
      <div>
        <label for="secuelas" :class="[CLASE_ETIQUETA, 'mb-1']">Secuelas <span class="text-red-500">*</span></label>
        <input
          id="secuelas"
          data-campo="secuelas"
          v-model="formDataHistoriaClinica.secuelas"
          type="text"
          :class="CLASE_INPUT"
          placeholder="Descripción de secuelas"
        />
      </div>
    </div>
  </div>
</template>
