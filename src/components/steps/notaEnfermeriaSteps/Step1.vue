<script setup>
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import SeccionNotaEnfermeria from './SeccionNotaEnfermeria.vue';
import { computed } from 'vue';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { useFormDataStore } from '@/stores/formDataStore';
import { useSiresDocumentDateMax } from '@/composables/useSiresDocumentDateMax';
import { RELACIONES_TEMPORALES_NOTA_ENFERMERIA } from '@/helpers/notaEnfermeria';
import { horaDeApertura } from '@/helpers/notaEnfermeriaGuardado';
import Requerido from './Requerido.vue';
import { claseEtiqueta, claseInput, claseOpcionLista } from './estilos';
import { useAutofocoPrimerVacio } from '@/composables/useAutofocoPrimerVacio';

// Al abrir el paso, si el motivo está vacío, el cursor va a él (la hora ya viene llena y
// «primera vez o subsecuente» son botones)
useAutofocoPrimerVacio(['motivoAtencion']);

const formDataStore = useFormDataStore();
// Por el store: al editar, el documento puede llegar después del primer dibujo
const df = () => formDataStore.formDataNotaEnfermeria;
const { fechaDocumentoMax, fechaDocumentoMin } = useSiresDocumentDateMax();
const today = format(new Date(), 'yyyy-MM-dd');

// Punto 46: el paso no escribe al abrirse ni al cerrarse. Muestra la fecha y la hora del
// formulario o, en una nota nueva, la de hoy y la de cuando se abrió (las escribe
// notaEnfermeriaGuardado al revisar la sección o al guardar); aquí solo lo que el usuario cambia.
const fechaNotaEnfermeria = computed({
  get: () => (df().fechaNotaEnfermeria ? formatDateYYYYMMDD(df().fechaNotaEnfermeria) : today),
  set: (valor) => {
    // El campo devuelve la fecha que se ve al montarse: eso no es un cambio del usuario
    if (!df().fechaNotaEnfermeria && valor === today) return;
    if (valor && valor !== formatDateYYYYMMDD(df().fechaNotaEnfermeria || '')) df().fechaNotaEnfermeria = valor;
  },
});
const horaAtencion = computed({
  get: () => df().horaAtencion || horaDeApertura(),
  set: (valor) => {
    if (!df().horaAtencion && valor === horaDeApertura()) return;
    if (valor !== df().horaAtencion) df().horaAtencion = valor;
  },
});

// Punto 46: en captura rápida las opciones y los campos aprovechan el ancho
const capturaRapida = enCapturaRapida();
</script>

<template>
  <SeccionNotaEnfermeria titulo="Datos de la atención" icono="fa-calendar-day">

    <!-- Captura rápida: fecha · hora · primera vez o subsecuente en un renglón -->
    <div :class="capturaRapida ? 'grid gap-3 items-end sm:grid-cols-2 lg:grid-cols-[10.5rem_9rem_minmax(0,1fr)]' : ''">
    <div :class="capturaRapida ? 'contents' : 'mt-5 grid grid-cols-2 gap-3'">
      <div data-campo="fechaNotaEnfermeria">
        <p :class="claseEtiqueta">Fecha de la atención <Requerido /></p>
        <FormKit
          type="date"
          name="fechaNotaEnfermeria"
          placeholder="Seleccione una fecha"
          :min="fechaDocumentoMin"
          :max="fechaDocumentoMax"
          v-model="fechaNotaEnfermeria"
        />
      </div>
      <div data-campo="horaAtencion">
        <p :class="claseEtiqueta">Hora <Requerido /></p>
        <!-- Mismo control que la fecha, para que se vean iguales -->
        <FormKit
          type="time"
          name="horaAtencion"
          v-model="horaAtencion"
        />
      </div>
    </div>

    <div :class="capturaRapida ? 'sm:col-span-2 lg:col-span-1' : 'mt-5'" data-pregunta="relacionTemporal" data-campo="relacionTemporal">
      <p :class="claseEtiqueta">¿Es la primera vez que se le atiende por este motivo? <Requerido /></p>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="opcion in RELACIONES_TEMPORALES_NOTA_ENFERMERIA"
          :key="opcion.clave"
          type="button"
          :class="claseOpcionLista(df().relacionTemporal === opcion.clave)"
          :aria-pressed="df().relacionTemporal === opcion.clave"
          @click="df().relacionTemporal = opcion.clave"
        >
          {{ opcion.etiqueta }}
        </button>
      </div>
    </div>
    </div>

    <div class="mt-5" data-campo="motivoAtencion">
      <p :class="claseEtiqueta">Motivo de atención <Requerido /></p>
      <textarea
        v-model="df().motivoAtencion"
        rows="3"
        maxlength="2000"
        placeholder="Por qué acude el trabajador"
        :class="claseInput"
      ></textarea>
    </div>
  </SeccionNotaEnfermeria>
</template>
