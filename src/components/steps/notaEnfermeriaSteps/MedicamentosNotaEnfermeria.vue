<script setup>
/**
 * Medicamentos administrados o entregados. En los centros que llevan inventario se eligen
 * del catálogo (descuentan existencias, como los insumos de la nota médica); si no hay
 * inventario o el medicamento no está en el catálogo, se escribe el nombre. La nota funciona
 * igual sin inventario. Una tarjeta por medicamento, con campos de una o dos columnas fijas.
 */
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { format } from 'date-fns';
import InventarioAPI from '@/api/InventarioAPI';
import { useInventarioStore } from '@/stores/inventario';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { cantidadConUnidad } from '@/helpers/inventario';
import { VIAS_ADMINISTRACION_NOTA_ENFERMERIA } from '@/helpers/notaEnfermeria';
import Requerido from './Requerido.vue';
import {
  claseAyuda,
  claseBotonAgregar,
  claseBotonQuitar,
  claseCampo,
  claseError,
  claseEtiquetaCampo,
  claseInput,
  claseNumero,
  claseSegmento,
} from './estilos';

const OTRO = '__otro__';
const USOS = [
  { clave: 'ADMINISTRADO', etiqueta: 'Administrado' },
  { clave: 'ENTREGADO', etiqueta: 'Entregado' },
];

const route = useRoute();
const inventario = useInventarioStore();
const { formDataNotaEnfermeria } = useFormDataStore();
const documentos = useDocumentosStore();
const trabajadores = useTrabajadoresStore();

const existencias = ref([]);
const contenedor = ref(null);
/** Renglones en que se eligió «Otro» del catálogo: se escribe el nombre. */
const conNombreLibre = reactive(new WeakSet());
/** Lo que esta nota ya había descontado: al editar, no cuenta como faltante. */
const yaDescontado = ref({});

const centroId = computed(
  () => trabajadores.currentTrabajador?.idCentroTrabajo || String(route.params.idCentroTrabajo ?? ''),
);
const conCatalogo = computed(() => existencias.value.length > 0);
const porId = computed(() => new Map(existencias.value.map((e) => [e.insumo._id, e])));

const filas = computed(() => formDataNotaEnfermeria.medicamentos ?? []);

onMounted(async () => {
  for (const fila of documentos.currentDocument?.medicamentos ?? []) {
    if (fila?.idInsumo) {
      const id = String(fila.idInsumo);
      yaDescontado.value[id] = (yaDescontado.value[id] ?? 0) + (Number(fila.cantidad) || 0);
    }
  }
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

const disponible = (idInsumo) =>
  (porId.value.get(idInsumo)?.existencia ?? 0) + (yaDescontado.value[idInsumo] ?? 0);

/**
 * Un medicamento del catálogo puede ir dos veces: una administrado y otra entregado
 * (una dosis ahora y piezas para llevar). Solo se oculta cuando otros renglones ya lo tienen con los dos usos.
 */
const repetido = (fila, idInsumo, uso) =>
  filas.value.some((f) => f !== fila && f.idInsumo === idInsumo && f.uso === uso);

const opcionesPara = (fila) =>
  existencias.value.filter((e) => !USOS.every((uso) => repetido(fila, e.insumo._id, uso.clave)));

/** El otro uso ya está en otro renglón con este medicamento: elegirlo lo duplicaría. */
const usoOcupado = (fila, uso) => !!fila.idInsumo && fila.uso !== uso && repetido(fila, fila.idInsumo, uso);

/** Con catálogo, un renglón sin insumo escribe el nombre si eligió «Otro» o ya trae uno guardado. */
const escribeNombre = (fila) =>
  !conCatalogo.value || (!fila.idInsumo && (conNombreLibre.has(fila) || !!String(fila.nombre ?? '').trim()));

const seleccion = (fila) => (fila.idInsumo ? fila.idInsumo : escribeNombre(fila) ? OTRO : '');

const elegirInsumo = (fila, valor) => {
  if (valor === OTRO) {
    delete fila.idInsumo;
    fila.nombre = '';
    conNombreLibre.add(fila);
    return;
  }
  conNombreLibre.delete(fila);
  const elegido = porId.value.get(valor);
  fila.idInsumo = valor;
  // Ya está en otro renglón con este uso: este renglón toma el otro
  if (repetido(fila, valor, fila.uso)) fila.uso = fila.uso === 'ENTREGADO' ? 'ADMINISTRADO' : 'ENTREGADO';
  // El nombre viaja con el renglón: así se ve igual en la vista previa y en el PDF
  fila.nombre = [elegido?.insumo.nombre, elegido?.insumo.presentacion].filter(Boolean).join(' ');
};

/** Lo pedido de ese medicamento en todos los renglones (administrado y entregado). */
const pedidoDe = (idInsumo) =>
  filas.value
    .filter((f) => f.idInsumo === idInsumo && Number.isFinite(f.cantidad))
    .reduce((total, f) => total + f.cantidad, 0);

const faltaExistencia = (fila) => !!fila.idInsumo && pedidoDe(fila.idInsumo) > disponible(fila.idInsumo);

const cantidadInvalida = (fila) => !Number.isInteger(fila.cantidad) || fila.cantidad < 1;

const agregar = async () => {
  if (!formDataNotaEnfermeria.medicamentos) formDataNotaEnfermeria.medicamentos = [];
  formDataNotaEnfermeria.medicamentos.push({
    nombre: '',
    cantidad: 1,
    uso: 'ADMINISTRADO',
    hora: formDataNotaEnfermeria.horaAtencion || format(new Date(), 'HH:mm'),
  });
  // Lleva el foco al medicamento recién agregado
  await nextTick();
  contenedor.value?.querySelector(`[data-medicamento="${filas.value.length}"] [data-campo-medicamento]`)?.focus();
};

const quitar = (indice) => {
  formDataNotaEnfermeria.medicamentos.splice(indice, 1);
};
</script>

<template>
  <div ref="contenedor" data-testid="medicamentos-nota-enfermeria">
    <p class="mb-1.5 text-sm font-medium text-gray-800">
      Medicamentos administrados o entregados <span class="font-normal text-gray-500">(opcional)</span>
    </p>
    <p :class="claseAyuda">
      <template v-if="conCatalogo">Los del catálogo se descuentan del inventario del centro al guardar.</template>
      <template v-else>Escribe el nombre de cada medicamento.</template>
    </p>

    <div class="space-y-3">
      <div
        v-for="(fila, indice) in filas"
        :key="indice"
        class="rounded-lg border border-gray-200 bg-gray-50 p-3"
        :data-medicamento="indice + 1"
      >
        <div class="mb-2 flex items-center justify-between gap-2">
          <p class="text-sm font-semibold text-gray-800">Medicamento {{ indice + 1 }}</p>
          <button
            type="button"
            :class="claseBotonQuitar"
            :aria-label="`Quitar el medicamento ${indice + 1}`"
            title="Quitar medicamento"
            @click="quitar(indice)"
          >
            <i class="fas fa-trash-alt" aria-hidden="true"></i>
          </button>
        </div>

        <div class="space-y-3">
          <label v-if="conCatalogo" class="block">
            <span :class="claseEtiquetaCampo">Medicamento <Requerido /></span>
            <select
              :value="seleccion(fila)"
              :class="claseInput"
              :aria-label="`Medicamento ${indice + 1}`"
              data-campo-medicamento
              @change="elegirInsumo(fila, $event.target.value)"
            >
              <option value="" disabled>Selecciona del catálogo</option>
              <option v-for="opcion in opcionesPara(fila)" :key="opcion.insumo._id" :value="opcion.insumo._id">
                {{ [opcion.insumo.nombre, opcion.insumo.presentacion].filter(Boolean).join(' ') }} ·
                {{ disponible(opcion.insumo._id) }} disponibles
              </option>
              <option :value="OTRO">Otro (escribir el nombre)</option>
            </select>
          </label>
          <label v-if="escribeNombre(fila)" class="block">
            <span :class="claseEtiquetaCampo">Nombre del medicamento <Requerido /></span>
            <input
              v-model="fila.nombre"
              type="text"
              maxlength="200"
              placeholder="Paracetamol"
              :class="claseInput"
              :aria-label="`Nombre del medicamento ${indice + 1}`"
              data-campo-medicamento
            />
          </label>

          <div>
            <span :class="claseEtiquetaCampo">Uso</span>
            <div class="grid grid-cols-2 gap-2" role="group" :aria-label="`Uso del medicamento ${indice + 1}`">
              <button
                v-for="uso in USOS"
                :key="uso.clave"
                type="button"
                :class="[claseSegmento(fila.uso === uso.clave), usoOcupado(fila, uso.clave) ? 'cursor-not-allowed opacity-40' : '']"
                :aria-pressed="fila.uso === uso.clave"
                :disabled="usoOcupado(fila, uso.clave)"
                :title="usoOcupado(fila, uso.clave) ? `Ya está en otro renglón como ${uso.etiqueta.toLowerCase()}` : undefined"
                @click="fila.uso = uso.clave"
              >
                {{ uso.etiqueta }}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span :class="claseEtiquetaCampo">Cantidad <Requerido /></span>
              <input
                v-model.number="fila.cantidad"
                type="number"
                min="1"
                step="1"
                inputmode="numeric"
                :class="claseNumero(cantidadInvalida(fila))"
                :aria-label="`Cantidad del medicamento ${indice + 1}`"
              />
              <span v-if="cantidadInvalida(fila)" :class="[claseError, 'block']">Un número entero desde 1</span>
            </label>
            <label class="block">
              <span :class="claseEtiquetaCampo">Hora</span>
              <input v-model="fila.hora" type="time" :class="claseInput" />
            </label>
          </div>

          <p v-if="faltaExistencia(fila)" class="text-xs font-medium text-amber-600" role="status">
            Solo hay {{ cantidadConUnidad(disponible(fila.idInsumo), porId.get(fila.idInsumo)?.insumo.unidad ?? '') }}
            en este centro. Puedes guardar; el inventario quedará en negativo hasta que se ajuste.
          </p>

          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span :class="claseEtiquetaCampo">Vía</span>
              <select v-model="fila.via" :class="claseCampo()">
                <option :value="undefined">Sin indicar</option>
                <option v-for="via in VIAS_ADMINISTRACION_NOTA_ENFERMERIA" :key="via.clave" :value="via.clave">
                  {{ via.etiqueta }}
                </option>
              </select>
            </label>
            <label class="block">
              <span :class="claseEtiquetaCampo">Dosis</span>
              <input v-model="fila.dosis" type="text" maxlength="200" placeholder="500 mg" :class="claseInput" />
            </label>
          </div>
        </div>
      </div>
    </div>

    <button type="button" :class="[claseBotonAgregar, 'mt-3']" data-agregar-medicamento @click="agregar">
      <i class="fas fa-plus" aria-hidden="true"></i>
      Agregar medicamento
    </button>
  </div>
</template>
