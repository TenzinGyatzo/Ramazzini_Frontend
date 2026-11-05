<script setup>
/**
 * Medicamentos administrados o entregados. En los centros que llevan inventario se eligen
 * del catálogo (descuentan existencias); si no hay inventario o el medicamento no está en
 * el catálogo, se escribe el nombre. La nota funciona igual sin inventario.
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { format } from 'date-fns';
import InventarioAPI from '@/api/InventarioAPI';
import { useInventarioStore } from '@/stores/inventario';
import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { VIAS_ADMINISTRACION_NOTA_ENFERMERIA } from '@/helpers/notaEnfermeria';
import { claseInput } from './estilos';

const OTRO = '__otro__';

const route = useRoute();
const inventario = useInventarioStore();
const { formDataNotaEnfermeria } = useFormDataStore();
const trabajadores = useTrabajadoresStore();

const existencias = ref([]);

const centroId = computed(
  () => trabajadores.currentTrabajador?.idCentroTrabajo || String(route.params.idCentroTrabajo ?? ''),
);
const conCatalogo = computed(() => existencias.value.length > 0);

const filas = computed(() => formDataNotaEnfermeria.medicamentos ?? []);

onMounted(async () => {
  try {
    await inventario.cargarConfiguracion();
    if (!inventario.llevaInventario(centroId.value)) return;
    const { data } = await InventarioAPI.getExistencias(centroId.value);
    existencias.value = (data ?? []).filter((e) => e.insumo?.activo !== false);
  } catch {
    // Sin acceso al inventario del centro: los medicamentos se escriben a mano
    existencias.value = [];
  }
});

/** Insumos elegibles en un renglón: los no usados en otro renglón. */
const opcionesPara = (fila) => {
  const usados = new Set(filas.value.filter((f) => f !== fila && f.idInsumo).map((f) => f.idInsumo));
  return existencias.value.filter((e) => !usados.has(e.insumo._id));
};

const seleccion = (fila) => (fila.idInsumo ? fila.idInsumo : OTRO);

const elegirInsumo = (fila, valor) => {
  if (valor === OTRO) {
    delete fila.idInsumo;
    fila.nombre = '';
    return;
  }
  const elegido = existencias.value.find((e) => e.insumo._id === valor);
  fila.idInsumo = valor;
  // El nombre viaja con la fila: así se ve igual en la vista previa y en el PDF
  fila.nombre = [elegido?.insumo.nombre, elegido?.insumo.presentacion].filter(Boolean).join(' ');
};

const agregar = () => {
  if (!formDataNotaEnfermeria.medicamentos) formDataNotaEnfermeria.medicamentos = [];
  formDataNotaEnfermeria.medicamentos.push({
    nombre: '',
    cantidad: 1,
    uso: 'ADMINISTRADO',
    hora: formDataNotaEnfermeria.horaAtencion || format(new Date(), 'HH:mm'),
  });
};

const quitar = (indice) => {
  formDataNotaEnfermeria.medicamentos.splice(indice, 1);
};
</script>

<template>
  <div data-testid="medicamentos-nota-enfermeria">
    <p class="text-sm font-semibold text-gray-800">Medicamentos administrados o entregados</p>
    <p class="mb-2 text-xs text-gray-500">
      <template v-if="conCatalogo">Los del inventario se descuentan del centro al guardar.</template>
      <template v-else>Escribe el nombre de cada medicamento.</template>
    </p>

    <div class="space-y-2">
      <div
        v-for="(fila, indice) in filas"
        :key="indice"
        class="rounded-lg border border-gray-200 p-2"
        :data-medicamento="indice + 1"
      >
        <div class="flex flex-wrap items-center gap-2">
          <select
            v-if="conCatalogo"
            :value="seleccion(fila)"
            :class="[claseInput, 'min-w-0 flex-1 basis-56']"
            :aria-label="`Medicamento ${indice + 1}`"
            @change="elegirInsumo(fila, $event.target.value)"
          >
            <option v-for="opcion in opcionesPara(fila)" :key="opcion.insumo._id" :value="opcion.insumo._id">
              {{ opcion.insumo.nombre }} · {{ opcion.existencia }} disponibles
            </option>
            <option :value="OTRO">Otro (escribir el nombre)</option>
          </select>
          <input
            v-if="!fila.idInsumo"
            v-model="fila.nombre"
            type="text"
            maxlength="200"
            placeholder="Nombre del medicamento"
            :class="[claseInput, 'min-w-0 flex-1 basis-56']"
            :aria-label="`Nombre del medicamento ${indice + 1}`"
          />
          <button type="button" class="px-2 font-bold text-red-500" title="Quitar medicamento" @click="quitar(indice)">
            ✕
          </button>
        </div>
        <div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <label class="text-xs text-gray-600">
            Cantidad
            <input v-model.number="fila.cantidad" type="number" min="1" step="1" :class="claseInput" />
          </label>
          <label class="text-xs text-gray-600">
            Uso
            <select v-model="fila.uso" :class="claseInput">
              <option value="ADMINISTRADO">Administrado</option>
              <option value="ENTREGADO">Entregado</option>
            </select>
          </label>
          <label class="text-xs text-gray-600">
            Vía
            <select v-model="fila.via" :class="claseInput">
              <option :value="undefined">Sin indicar</option>
              <option v-for="via in VIAS_ADMINISTRACION_NOTA_ENFERMERIA" :key="via.clave" :value="via.clave">
                {{ via.etiqueta }}
              </option>
            </select>
          </label>
          <label class="text-xs text-gray-600">
            Dosis y presentación
            <input v-model="fila.dosis" type="text" maxlength="200" placeholder="500 mg, 1 tableta" :class="claseInput" />
          </label>
          <label class="text-xs text-gray-600">
            Hora
            <input v-model="fila.hora" type="time" :class="claseInput" />
          </label>
        </div>
      </div>
    </div>

    <button
      type="button"
      class="mt-2 rounded-lg border border-emerald-500 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
      data-agregar-medicamento
      @click="agregar"
    >
      Agregar medicamento
    </button>
  </div>
</template>
