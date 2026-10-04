<script setup>
import { computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import {
  AREAS_SUENO_VIGILIA,
  DURACIONES_SUENO_VIGILIA,
  ETIQUETA_NIVEL_SUENO_VIGILIA,
  FACTORES_SUENO_VIGILIA,
  PRODUCTOS_PARA_DORMIR,
  SI_NO_NO_SABE_SUENO_VIGILIA,
  asegurarGruposSuenoVigilia,
  calcularResultadoEvaluacionSuenoVigilia,
  haySintomasSuenoVigilia,
} from '@/helpers/evaluacionSuenoVigilia';

/**
 * Seguimiento (solo si alguna de las 12 preguntas reporta síntomas) y observaciones.
 * El seguimiento no tiene respuesta por defecto. Lo que deja de aplicar se quita al guardar.
 */
const formData = useFormDataStore();
const datos = computed(() => formData.formDataEvaluacionSuenoVigilia);

const haySintomas = computed(() => haySintomasSuenoVigilia(datos.value));
const haySintomasVigilia = computed(() => haySintomasSuenoVigilia(datos.value, 'vigilia'));

/** Áreas con síntomas, para que quede claro a qué se refieren las preguntas del seguimiento. */
const areasConSintomas = computed(() => {
  const { areas } = calcularResultadoEvaluacionSuenoVigilia(datos.value);
  return AREAS_SUENO_VIGILIA.filter((area) => areas[area.clave].nivel !== 'verde').map(
    (area) => `${area.etiqueta} (${ETIQUETA_NIVEL_SUENO_VIGILIA[areas[area.clave].nivel].toLowerCase()})`,
  );
});

const seguimiento = computed(() => datos.value.seguimiento ?? {});
const seguimientoEditable = () => asegurarGruposSuenoVigilia(formData.formDataEvaluacionSuenoVigilia).seguimiento;

const elegir = (campo, valor) => {
  seguimientoEditable()[campo] = valor;
};

const marcada = (campo, opcion) => (seguimiento.value[campo] ?? []).includes(opcion);

/** Selección múltiple en el orden del catálogo; las opciones exclusivas desmarcan a las demás. */
const alternar = (campo, catalogo, opcion, exclusivas = []) => {
  const grupo = seguimientoEditable();
  let nuevas = marcada(campo, opcion)
    ? (grupo[campo] ?? []).filter((o) => o !== opcion)
    : [...(grupo[campo] ?? []), opcion];
  if (exclusivas.includes(opcion)) nuevas = nuevas.filter((o) => o === opcion);
  else nuevas = nuevas.filter((o) => !exclusivas.includes(o));
  if (nuevas.length) grupo[campo] = catalogo.filter((o) => nuevas.includes(o));
  else delete grupo[campo];
};

const alternarFactor = (opcion) => {
  alternar('factores', FACTORES_SUENO_VIGILIA, opcion, ['No sabe']);
  if (!marcada('factores', 'Otro')) delete seguimientoEditable().factorOtro;
};

const alternarProducto = (opcion) => {
  alternar('productosParaDormir', PRODUCTOS_PARA_DORMIR, opcion, ['Nada']);
  if (!usaProductos.value) delete seguimientoEditable().detalleProductos;
};

const usaProductos = computed(() =>
  (seguimiento.value.productosParaDormir ?? []).some((producto) => producto !== 'Nada'),
);

const campoTexto = (campo, enSeguimiento = true) =>
  computed({
    get: () => (enSeguimiento ? seguimiento.value[campo] : datos.value[campo]) ?? '',
    set: (valor) => {
      const destino = enSeguimiento ? seguimientoEditable() : formData.formDataEvaluacionSuenoVigilia;
      if (valor) destino[campo] = valor;
      else delete destino[campo];
    },
  });

const factorOtro = campoTexto('factorOtro');
const detalleProductos = campoTexto('detalleProductos');
const observaciones = campoTexto('observaciones', false);

const claseOpcion = (seleccionada) => [
  'px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all duration-150 ease-in-out',
  seleccionada
    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
    : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50/50',
];

const claseInput =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-1 text-gray-900">Evaluación de sueño y vigilia</h1>
    <h2 class="text-lg font-semibold text-gray-700">Seguimiento y observaciones</h2>

    <p v-if="!haySintomas" class="mt-2 text-sm text-gray-600">
      No se reportaron síntomas en las 12 preguntas, así que no hay seguimiento que registrar.
    </p>

    <div v-else class="mt-3 space-y-4">
      <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2" data-sintomas>
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-600">Síntomas reportados</p>
        <p class="mt-0.5 text-sm text-gray-800">{{ areasConSintomas.join(' · ') }}</p>
        <p class="mt-1 text-xs text-gray-600">Las siguientes preguntas se refieren a estos síntomas.</p>
      </div>

      <div data-pregunta="duracion">
        <p class="mb-1.5 text-sm font-medium text-gray-800">¿Desde cuándo presenta estos síntomas?</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="opcion in DURACIONES_SUENO_VIGILIA"
            :key="opcion"
            type="button"
            :class="claseOpcion(seguimiento.duracion === opcion)"
            :aria-pressed="seguimiento.duracion === opcion"
            @click="elegir('duracion', opcion)"
          >
            {{ opcion }}
          </button>
        </div>
      </div>

      <div v-if="haySintomasVigilia" data-pregunta="empeoraAlDormirMal">
        <p class="mb-1.5 text-sm font-medium text-gray-800">
          ¿Nota que los síntomas del día empeoran cuando duerme poco o mal?
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="opcion in SI_NO_NO_SABE_SUENO_VIGILIA"
            :key="opcion"
            type="button"
            :class="claseOpcion(seguimiento.empeoraAlDormirMal === opcion)"
            :aria-pressed="seguimiento.empeoraAlDormirMal === opcion"
            @click="elegir('empeoraAlDormirMal', opcion)"
          >
            {{ opcion }}
          </button>
        </div>
      </div>

      <div data-pregunta="factores">
        <p class="mb-1.5 text-sm font-medium text-gray-800">
          ¿Qué considera que influye en estos síntomas? <span class="font-normal text-gray-500">(opcional, puede marcar varias)</span>
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="opcion in FACTORES_SUENO_VIGILIA"
            :key="opcion"
            type="button"
            :class="claseOpcion(marcada('factores', opcion))"
            :aria-pressed="marcada('factores', opcion)"
            @click="alternarFactor(opcion)"
          >
            {{ opcion }}
          </button>
        </div>
        <input
          v-if="marcada('factores', 'Otro')"
          v-model.trim="factorOtro"
          type="text"
          maxlength="200"
          placeholder="¿Cuál otro factor?"
          data-skip-validation
          :class="[claseInput, 'mt-2']"
        />
      </div>

      <div data-pregunta="productosParaDormir">
        <p class="mb-1.5 text-sm font-medium text-gray-800">
          ¿Usa algo para dormir? <span class="font-normal text-gray-500">(opcional, puede marcar varias)</span>
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="opcion in PRODUCTOS_PARA_DORMIR"
            :key="opcion"
            type="button"
            :class="claseOpcion(marcada('productosParaDormir', opcion))"
            :aria-pressed="marcada('productosParaDormir', opcion)"
            @click="alternarProducto(opcion)"
          >
            {{ opcion }}
          </button>
        </div>
        <input
          v-if="usaProductos"
          v-model.trim="detalleProductos"
          type="text"
          maxlength="300"
          placeholder="Producto y con qué frecuencia lo usa"
          data-skip-validation
          :class="[claseInput, 'mt-2']"
        />
      </div>
    </div>

    <div class="mt-5" data-pregunta="observaciones">
      <p class="mb-1.5 text-sm font-medium text-gray-800">
        Observaciones del profesional <span class="font-normal text-gray-500">(opcional)</span>
      </p>
      <textarea
        v-model="observaciones"
        rows="4"
        maxlength="2000"
        data-skip-validation
        placeholder="Escriba aquí cualquier comentario relevante."
        :class="claseInput"
      ></textarea>
      <p class="mt-1 text-right text-xs text-gray-500">{{ observaciones.length }} / 2000</p>
    </div>
  </div>
</template>
