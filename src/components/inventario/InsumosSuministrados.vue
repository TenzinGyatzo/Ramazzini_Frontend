<script setup lang="ts">
/**
 * Insumos que el servicio médico suministró en esta atención. Lo prescrito va en
 * «Tratamiento»; solo lo que se capture aquí descuenta del inventario del centro.
 * No se muestra si el proveedor no usa inventario.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import InventarioAPI from '@/api/InventarioAPI';
import { useInventarioStore } from '@/stores/inventario';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { cantidadConUnidad } from '@/helpers/inventario';
import {
  filasDesdeDocumento,
  filasValidas,
  type FilaInsumoSuministrado,
} from '@/helpers/insumosSuministrados';
import type { FilaExistencia } from '@/interfaces/inventario.interface';

const route = useRoute();
const inventario = useInventarioStore();
// El store no tipa los campos del documento
const formDataNotaMedica = useFormDataStore().formDataNotaMedica as Record<
  string,
  any
>;
const documentos = useDocumentosStore();
const trabajadores = useTrabajadoresStore();

const existencias = ref<FilaExistencia[]>([]);
const cargado = ref(false);
const filas = ref<FilaInsumoSuministrado[]>([]);
/** Lo que esta nota ya había descontado: no cuenta como faltante al editar. */
const yaDescontado = ref<Record<string, number>>({});

const centroId = computed(
  () =>
    trabajadores.currentTrabajador?.idCentroTrabajo ||
    String(route.params.idCentroTrabajo ?? ''),
);

const porId = computed(
  () => new Map(existencias.value.map((fila) => [fila.insumo._id, fila])),
);

/** Insumos elegibles en un renglón: activos y no usados en otro renglón. */
function opcionesPara(fila: FilaInsumoSuministrado) {
  const usados = new Set(
    filas.value.filter((f) => f !== fila).map((f) => f.idInsumo),
  );
  return existencias.value.filter(
    (e) =>
      !usados.has(e.insumo._id) &&
      (e.insumo.activo || e.insumo._id === fila.idInsumo),
  );
}

function disponible(idInsumo: string): number {
  return (
    (porId.value.get(idInsumo)?.existencia ?? 0) +
    (yaDescontado.value[idInsumo] ?? 0)
  );
}

function unidadDe(idInsumo: string): string {
  return porId.value.get(idInsumo)?.insumo.unidad ?? '';
}

function faltaExistencia(fila: FilaInsumoSuministrado): boolean {
  return (
    !!fila.idInsumo &&
    typeof fila.cantidad === 'number' &&
    fila.cantidad > disponible(fila.idInsumo)
  );
}

function agregar() {
  filas.value.push({ idInsumo: '', cantidad: 1, uso: 'ADMINISTRADO' });
}

function quitar(indice: number) {
  filas.value.splice(indice, 1);
}

onMounted(async () => {
  await inventario.cargarConfiguracion();
  if (!inventario.habilitado || !centroId.value) return;

  const guardados =
    formDataNotaMedica.insumosSuministrados ??
    documentos.currentDocument?.insumosSuministrados;
  filas.value = filasDesdeDocumento(guardados);
  // Solo lo guardado en el documento ya está descontado en el inventario
  for (const fila of filasDesdeDocumento(
    documentos.currentDocument?.insumosSuministrados,
  )) {
    yaDescontado.value[fila.idInsumo] = Number(fila.cantidad) || 0;
  }

  try {
    const { data } = await InventarioAPI.getExistencias(centroId.value);
    existencias.value = data;
    cargado.value = true;
  } catch {
    // Sin acceso al inventario del centro: la nota se captura como siempre
    cargado.value = false;
  }
});

watch(
  filas,
  (valor) => {
    if (!cargado.value) return;
    formDataNotaMedica.insumosSuministrados = filasValidas(valor);
  },
  { deep: true },
);

const campo =
  'rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';
</script>

<template>
  <div
    v-if="inventario.habilitado && cargado"
    class="mt-5 border-t border-gray-200 pt-4 dark:border-slate-700"
    data-testid="insumos-suministrados"
  >
    <p class="text-sm font-semibold text-gray-800">Insumos suministrados</p>
    <p class="mb-2 text-xs text-gray-500">
      Lo que el servicio médico administró o entregó en esta atención. Se descuenta del
      inventario del centro al guardar.
    </p>

    <p
      v-if="existencias.length === 0"
      class="text-sm text-gray-500"
    >
      El catálogo de insumos está vacío.
    </p>

    <div v-else class="space-y-2">
      <div
        v-for="(fila, indice) in filas"
        :key="indice"
        class="rounded-lg border border-gray-200 p-2 dark:border-slate-700"
      >
        <div class="flex flex-wrap items-center gap-2">
          <select
            v-model="fila.idInsumo"
            :class="[campo, 'min-w-0 flex-1 basis-56']"
            :aria-label="`Insumo ${indice + 1}`"
          >
            <option value="" disabled>Selecciona un insumo</option>
            <option
              v-for="opcion in opcionesPara(fila)"
              :key="opcion.insumo._id"
              :value="opcion.insumo._id"
            >
              {{ opcion.insumo.nombre }} ·
              {{ disponible(opcion.insumo._id) }} disponibles
            </option>
          </select>
          <input
            v-model.number="fila.cantidad"
            type="number"
            min="1"
            step="1"
            :class="[campo, 'w-20']"
            :aria-label="`Cantidad del insumo ${indice + 1}`"
          />
          <select
            v-model="fila.uso"
            :class="[campo, 'w-36']"
            :aria-label="`Uso del insumo ${indice + 1}`"
          >
            <option value="ADMINISTRADO">Administrado</option>
            <option value="ENTREGADO">Entregado</option>
          </select>
          <button
            type="button"
            class="px-2 font-bold text-red-500"
            title="Quitar insumo"
            @click="quitar(indice)"
          >
            ✕
          </button>
        </div>
        <p
          v-if="faltaExistencia(fila)"
          class="mt-1 text-xs font-medium text-amber-600"
          role="status"
        >
          Solo hay
          {{ cantidadConUnidad(disponible(fila.idInsumo), unidadDe(fila.idInsumo)) }}
          registradas en este centro. Puedes guardar; el inventario quedará en negativo
          hasta que se ajuste.
        </p>
      </div>

      <button
        type="button"
        class="rounded-lg border border-emerald-500 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
        @click="agregar"
      >
        Agregar insumo suministrado
      </button>
    </div>
  </div>
</template>
