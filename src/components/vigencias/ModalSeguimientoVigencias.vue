<script setup lang="ts">
/**
 * Pausar (con motivo) o reanudar el seguimiento de una empresa en la vista «Vigencias».
 * Pausar solo la saca de esa vista y de sus totales; no cambia nada más.
 */
import { computed, inject, ref } from 'vue';
import VigenciasAptitudAPI, { type EmpresaVigencias, type MotivoPausa } from '@/api/VigenciasAptitudAPI';
import { extractApiErrorMessage } from '@/helpers/apiErrors';
import { LIMITE_TEXTO_PAUSA, MOTIVOS_PAUSA } from '@/helpers/vigenciasGlobales';
import { useEscapeToClose } from '@/composables/useEscapeToClose';

const props = defineProps<{
  empresa: EmpresaVigencias;
  modo: 'pausar' | 'reanudar';
}>();

const emit = defineEmits<{
  (e: 'cerrar'): void;
  (e: 'hecho'): void;
}>();

const toast: any = inject('toast', null);

const motivo = ref<MotivoPausa | ''>('');
const motivoOtro = ref('');
const nota = ref('');
const guardando = ref(false);
const error = ref('');

const valido = computed(
  () => props.modo === 'reanudar' || (!!motivo.value && (motivo.value !== 'OTRO' || !!motivoOtro.value.trim())),
);

const cerrar = () => {
  if (!guardando.value) emit('cerrar');
};
useEscapeToClose(cerrar);

const confirmar = async () => {
  if (!valido.value || guardando.value) return;
  guardando.value = true;
  error.value = '';
  try {
    if (props.modo === 'pausar') {
      await VigenciasAptitudAPI.pausar(props.empresa.idEmpresa, {
        motivo: motivo.value as MotivoPausa,
        ...(motivo.value === 'OTRO' ? { motivoOtro: motivoOtro.value.trim() } : {}),
        ...(nota.value.trim() ? { nota: nota.value.trim() } : {}),
      });
    } else {
      await VigenciasAptitudAPI.reanudar(props.empresa.idEmpresa);
    }
    toast?.open?.({
      message:
        props.modo === 'pausar'
          ? `Seguimiento de ${props.empresa.nombreEmpresa} pausado`
          : `Seguimiento de ${props.empresa.nombreEmpresa} reanudado`,
    });
    emit('hecho');
  } catch (e) {
    error.value = extractApiErrorMessage(e, 'No se pudo guardar el cambio.');
  } finally {
    guardando.value = false;
  }
};

const campo =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
</script>

<template>
  <div class="modal-work-overlay fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" @click.self="cerrar">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="seguimiento-vigencias-titulo"
      class="modal-work-panel vigencias__tarjeta relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-800"
      data-test="modal-seguimiento"
    >
      <h2 id="seguimiento-vigencias-titulo" class="vigencias__titulo text-base font-semibold text-gray-900 dark:text-slate-100">
        {{ modo === 'pausar' ? 'Pausar seguimiento' : 'Reanudar seguimiento' }}
      </h2>
      <p class="mt-0.5 text-sm font-medium text-gray-700 dark:text-slate-300">{{ empresa.nombreEmpresa }}</p>

      <template v-if="modo === 'pausar'">
        <p class="mt-3 text-sm text-gray-600 dark:text-slate-400">
          La empresa sale de la lista y de los totales de esta vista. No cambia nada más: sus centros,
          trabajadores y expedientes siguen igual. Si registras una aptitud nueva, vuelve sola al seguimiento.
        </p>

        <fieldset class="mt-4">
          <legend class="text-sm font-medium text-gray-800 dark:text-slate-200">Motivo</legend>
          <div class="mt-2 space-y-1.5">
            <label
              v-for="opcion in MOTIVOS_PAUSA"
              :key="opcion.valor"
              class="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-slate-300"
            >
              <input
                v-model="motivo"
                type="radio"
                name="motivo-pausa"
                :value="opcion.valor"
                class="h-4 w-4 accent-emerald-600"
                :data-test="`motivo-${opcion.valor}`"
              />
              {{ opcion.texto }}
            </label>
          </div>
        </fieldset>

        <label v-if="motivo === 'OTRO'" class="mt-3 block text-sm text-gray-700 dark:text-slate-300">
          <span class="sr-only">Describe el motivo</span>
          <input
            v-model="motivoOtro"
            type="text"
            :maxlength="LIMITE_TEXTO_PAUSA"
            placeholder="Describe el motivo"
            :class="campo"
            data-test="motivo-otro"
          />
        </label>

        <label class="mt-3 block text-sm text-gray-700 dark:text-slate-300">
          Nota <span class="text-gray-400">(opcional)</span>
          <textarea
            v-model="nota"
            rows="2"
            :maxlength="LIMITE_TEXTO_PAUSA"
            :class="[campo, 'mt-1 resize-none']"
            data-test="nota"
          ></textarea>
        </label>
      </template>

      <p v-else class="mt-3 text-sm text-gray-600 dark:text-slate-400">
        La empresa vuelve a la lista y a los totales de esta vista.
      </p>

      <p v-if="error" class="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">{{ error }}</p>

      <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          :disabled="guardando"
          @click="cerrar"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50"
          :class="modo === 'pausar' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'"
          :disabled="!valido || guardando"
          data-test="confirmar"
          @click="confirmar"
        >
          <i v-if="guardando" class="fas fa-spinner fa-spin mr-1" aria-hidden="true"></i>
          {{ modo === 'pausar' ? 'Pausar' : 'Reanudar' }}
        </button>
      </div>
    </div>
  </div>
</template>
