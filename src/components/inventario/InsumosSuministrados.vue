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
  type UsoInsumo,
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

const USOS: UsoInsumo[] = ['ADMINISTRADO', 'ENTREGADO'];

/** Otro renglón ya tiene este insumo con este uso. */
function repetido(fila: FilaInsumoSuministrado, idInsumo: string, uso: UsoInsumo) {
  return filas.value.some((f) => f !== fila && f.idInsumo === idInsumo && f.uso === uso);
}

/**
 * Insumos elegibles en un renglón: activos y no ocupados con los dos usos en otros
 * renglones. Un insumo puede ir una vez administrado y otra entregado (una dosis
 * ahora y piezas para llevar).
 */
function opcionesPara(fila: FilaInsumoSuministrado) {
  return existencias.value.filter(
    (e) =>
      !USOS.every((uso) => repetido(fila, e.insumo._id, uso)) &&
      (e.insumo.activo || e.insumo._id === fila.idInsumo),
  );
}

/** El otro uso ya está en otro renglón con este insumo: elegirlo lo duplicaría. */
function usoOcupado(fila: FilaInsumoSuministrado, uso: UsoInsumo) {
  return !!fila.idInsumo && fila.uso !== uso && repetido(fila, fila.idInsumo, uso);
}

/** Al elegir un insumo que ya está con este uso en otro renglón, este renglón toma el otro. */
function alElegirInsumo(fila: FilaInsumoSuministrado) {
  if (fila.idInsumo && repetido(fila, fila.idInsumo, fila.uso)) {
    fila.uso = fila.uso === 'ENTREGADO' ? 'ADMINISTRADO' : 'ENTREGADO';
  }
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

/** Lo pedido de ese insumo en todos los renglones (administrado y entregado). */
function pedidoDe(idInsumo: string): number {
  return filas.value
    .filter((f) => f.idInsumo === idInsumo && typeof f.cantidad === 'number')
    .reduce((total, f) => total + (f.cantidad as number), 0);
}

function faltaExistencia(fila: FilaInsumoSuministrado): boolean {
  return !!fila.idInsumo && pedidoDe(fila.idInsumo) > disponible(fila.idInsumo);
}

function agregar() {
  filas.value.push({ idInsumo: '', cantidad: 1, uso: 'ADMINISTRADO' });
}

function quitar(indice: number) {
  filas.value.splice(indice, 1);
}

onMounted(async () => {
  await inventario.cargarConfiguracion();
  // Solo en los centros que llevan inventario
  if (!inventario.llevaInventario(centroId.value)) return;

  const guardados =
    formDataNotaMedica.insumosSuministrados ??
    documentos.currentDocument?.insumosSuministrados;
  filas.value = filasDesdeDocumento(guardados);
  // Solo lo guardado en el documento ya está descontado en el inventario
  for (const fila of filasDesdeDocumento(
    documentos.currentDocument?.insumosSuministrados,
  )) {
    // Suma: el mismo insumo puede estar administrado y entregado
    yaDescontado.value[fila.idInsumo] =
      (yaDescontado.value[fila.idInsumo] ?? 0) + (Number(fila.cantidad) || 0);
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
    v-if="inventario.llevaInventario(centroId) && cargado"
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
            @change="alElegirInsumo(fila)"
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
            <option value="ADMINISTRADO" :disabled="usoOcupado(fila, 'ADMINISTRADO')">Administrado</option>
            <option value="ENTREGADO" :disabled="usoOcupado(fila, 'ENTREGADO')">Entregado</option>
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
