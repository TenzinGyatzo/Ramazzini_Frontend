<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import InventarioAPI from '@/api/InventarioAPI';
import InventarioModal from '@/components/inventario/InventarioModal.vue';
import { useInventarioStore } from '@/stores/inventario';
import { useUserStore } from '@/stores/user';
import { useRolePermissions } from '@/composables/useRolePermissions';
import { extractApiErrorMessage } from '@/helpers/apiErrors';
import {
  CATEGORIAS_INSUMO,
  PARAMETROS_ANTIDOPING,
  etiquetaCategoria,
  insumoVacio,
} from '@/helpers/inventario';
import type { Insumo, InsumoSugerido } from '@/interfaces/inventario.interface';

const toast: any = inject('toast');
const router = useRouter();
const inventario = useInventarioStore();
const userStore = useUserStore();
const { canManageInventario } = useRolePermissions();

// Encender, apagar y ajustar el inventario es de quien gobierna el tenant
const puedeConfigurar = computed(
  () => userStore.user?.role === 'Principal' || userStore.user?.role === 'Administrador',
);

const cargando = ref(true);
const insumos = ref<Insumo[]>([]);
const busqueda = ref('');
const guardando = ref(false);
const diasAviso = ref(90);

const insumosVisibles = computed(() => {
  const texto = busqueda.value.trim().toLowerCase();
  return texto
    ? insumos.value.filter((i) => i.nombre.toLowerCase().includes(texto))
    : insumos.value;
});

const avisar = (message: string, type: 'success' | 'error' = 'success') =>
  toast?.open({ message, type, position: 'bottom-left' });

async function cargarInsumos() {
  try {
    const { data } = await InventarioAPI.getInsumos();
    insumos.value = data;
  } catch (error) {
    avisar(extractApiErrorMessage(error, 'No se pudo cargar el catálogo'), 'error');
  }
}

onMounted(async () => {
  await inventario.cargarConfiguracion(true);
  diasAviso.value = inventario.diasAvisoCaducidad;
  if (inventario.habilitado) await cargarInsumos();
  cargando.value = false;
});

// ------------------------------------------------------------ configuración

async function cambiarHabilitado(habilitado: boolean) {
  guardando.value = true;
  try {
    await inventario.guardarConfiguracion({ inventarioHabilitado: habilitado });
    avisar(habilitado ? 'Inventario habilitado' : 'Inventario deshabilitado');
    if (habilitado) await cargarInsumos();
  } catch (error) {
    avisar(extractApiErrorMessage(error, 'No se pudo guardar la configuración'), 'error');
  } finally {
    guardando.value = false;
  }
}

async function guardarDiasAviso() {
  if (!Number.isInteger(diasAviso.value) || diasAviso.value < 1 || diasAviso.value > 365) {
    return avisar('Los días de aviso deben ser un número entero entre 1 y 365', 'error');
  }
  guardando.value = true;
  try {
    await inventario.guardarConfiguracion({ inventarioDiasAvisoCaducidad: diasAviso.value });
    avisar('Días de aviso actualizados');
  } catch (error) {
    avisar(extractApiErrorMessage(error, 'No se pudo guardar la configuración'), 'error');
  } finally {
    guardando.value = false;
  }
}

// ----------------------------------------------------------------- catálogo

const formAbierto = ref(false);
const editandoId = ref<string | null>(null);
const form = reactive(insumoVacio());

function abrirNuevo() {
  editandoId.value = null;
  Object.assign(form, insumoVacio());
  formAbierto.value = true;
}

function abrirEdicion(insumo: Insumo) {
  editandoId.value = insumo._id;
  Object.assign(form, insumoVacio(), {
    nombre: insumo.nombre,
    categoria: insumo.categoria,
    unidad: insumo.unidad,
    presentacion: insumo.presentacion ?? '',
    unidadesPorPresentacion: insumo.unidadesPorPresentacion,
    stockMinimo: insumo.stockMinimo,
    controlaLote: insumo.controlaLote,
    controlaCaducidad: insumo.controlaCaducidad,
    parametrosAntidoping: insumo.parametrosAntidoping,
    activo: insumo.activo,
  });
  formAbierto.value = true;
}

async function guardarInsumo() {
  if (!form.nombre.trim() || !form.unidad.trim()) {
    return avisar('El nombre y la unidad son obligatorios', 'error');
  }
  const esAntidoping = form.categoria === 'PRUEBA_ANTIDOPING';
  if (esAntidoping && !form.parametrosAntidoping) {
    return avisar('Indica el número de parámetros de la prueba', 'error');
  }
  if (!Number.isInteger(form.unidadesPorPresentacion) || form.unidadesPorPresentacion < 1) {
    return avisar('Las unidades por presentación deben ser un entero mayor a cero', 'error');
  }
  if (!Number.isInteger(form.stockMinimo) || form.stockMinimo < 0) {
    return avisar('El stock mínimo debe ser un entero igual o mayor a cero', 'error');
  }

  const datos = {
    nombre: form.nombre.trim(),
    categoria: form.categoria,
    unidad: form.unidad.trim(),
    presentacion: form.presentacion?.trim() || undefined,
    unidadesPorPresentacion: form.unidadesPorPresentacion,
    stockMinimo: form.stockMinimo,
    controlaLote: form.controlaLote,
    controlaCaducidad: form.controlaCaducidad,
    parametrosAntidoping: esAntidoping ? form.parametrosAntidoping : undefined,
  };

  guardando.value = true;
  try {
    if (editandoId.value) {
      await InventarioAPI.updateInsumo(editandoId.value, { ...datos, activo: form.activo });
      avisar('Insumo actualizado');
    } else {
      await InventarioAPI.createInsumo(datos);
      avisar('Insumo agregado');
    }
    formAbierto.value = false;
    await cargarInsumos();
  } catch (error) {
    avisar(extractApiErrorMessage(error, 'No se pudo guardar el insumo'), 'error');
  } finally {
    guardando.value = false;
  }
}

// ----------------------------------------------------------- lista sugerida

const listaAbierta = ref(false);
const cargandoLista = ref(false);
const listaSugerida = ref<InsumoSugerido[]>([]);
const elegidos = ref<string[]>([]);

const gruposSugeridos = computed(() =>
  CATEGORIAS_INSUMO.map((categoria) => ({
    ...categoria,
    insumos: listaSugerida.value.filter((i) => i.categoria === categoria.value),
  })).filter((grupo) => grupo.insumos.length > 0),
);
const disponibles = computed(() =>
  listaSugerida.value.filter((i) => !i.yaExiste).map((i) => i.nombre),
);

async function abrirListaSugerida() {
  listaAbierta.value = true;
  cargandoLista.value = true;
  try {
    const { data } = await InventarioAPI.getListaSugerida();
    listaSugerida.value = data;
    elegidos.value = data.filter((i) => !i.yaExiste).map((i) => i.nombre);
  } catch (error) {
    avisar(extractApiErrorMessage(error, 'No se pudo cargar la lista sugerida'), 'error');
    listaAbierta.value = false;
  } finally {
    cargandoLista.value = false;
  }
}

function alternarTodos() {
  elegidos.value =
    elegidos.value.length === disponibles.value.length ? [] : [...disponibles.value];
}

async function agregarSugeridos() {
  if (elegidos.value.length === 0) {
    return avisar('Selecciona al menos un insumo', 'error');
  }
  guardando.value = true;
  try {
    const { data } = await InventarioAPI.cargarListaSugerida(elegidos.value);
    avisar(
      data.agregados === 1
        ? 'Se agregó 1 insumo al catálogo'
        : `Se agregaron ${data.agregados} insumos al catálogo`,
    );
    listaAbierta.value = false;
    await cargarInsumos();
  } catch (error) {
    avisar(extractApiErrorMessage(error, 'No se pudo agregar la lista sugerida'), 'error');
  } finally {
    guardando.value = false;
  }
}

const campo =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100';
const etiqueta = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300';
const botonPrimario =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60';
const botonSecundario =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700';
const tarjeta =
  'rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800';
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-4 py-6">
    <header class="mb-5">
      <button
        type="button"
        class="mb-1 inline-flex items-center gap-2 text-sm text-emerald-700 hover:underline dark:text-emerald-400"
        @click="router.back()"
      >
        <i class="fas fa-arrow-left text-xs"></i> Regresar
      </button>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventario</h1>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Lleva las existencias de medicamentos y materiales de cada centro de trabajo. El catálogo de
        insumos es el mismo para todos tus centros.
      </p>
    </header>

    <p v-if="cargando" class="py-16 text-center text-gray-500">
      <i class="fas fa-spinner fa-spin mr-2"></i> Cargando...
    </p>

    <template v-else>
      <!-- Configuración -->
      <section :class="[tarjeta, 'mb-5']">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-semibold text-gray-900 dark:text-gray-100">
              Inventario {{ inventario.habilitado ? 'habilitado' : 'deshabilitado' }}
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{
                inventario.habilitado
                  ? 'Entra al inventario de cada centro desde la lista de centros de trabajo.'
                  : 'Mientras esté deshabilitado no aparece en ninguna otra pantalla.'
              }}
            </p>
          </div>
          <button
            v-if="puedeConfigurar"
            type="button"
            :class="inventario.habilitado ? botonSecundario : botonPrimario"
            :disabled="guardando"
            @click="cambiarHabilitado(!inventario.habilitado)"
          >
            {{ inventario.habilitado ? 'Deshabilitar' : 'Habilitar inventario' }}
          </button>
        </div>
        <p v-if="!puedeConfigurar && !inventario.habilitado" class="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Solo el usuario principal puede habilitarlo.
        </p>

        <form
          v-if="inventario.habilitado && puedeConfigurar"
          class="mt-4 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700"
          @submit.prevent="guardarDiasAviso"
        >
          <div>
            <label :class="etiqueta" for="dias-aviso">Avisar caducidad con (días)</label>
            <input id="dias-aviso" v-model.number="diasAviso" type="number" min="1" max="365" step="1" :class="[campo, 'w-32']" />
          </div>
          <button type="submit" :class="botonSecundario" :disabled="guardando">Guardar</button>
        </form>
      </section>

      <!-- Catálogo -->
      <section v-if="inventario.habilitado" :class="tarjeta">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 class="font-semibold text-gray-900 dark:text-gray-100">Catálogo de insumos</h2>
          <div class="flex flex-wrap gap-2">
            <input
              v-model="busqueda"
              type="search"
              placeholder="Buscar insumo..."
              aria-label="Buscar insumo"
              :class="[campo, 'w-56']"
            />
            <button v-if="canManageInventario" type="button" :class="botonSecundario" @click="abrirListaSugerida">
              <i class="fas fa-wand-magic-sparkles"></i> Lista sugerida
            </button>
            <button v-if="canManageInventario" type="button" :class="botonPrimario" @click="abrirNuevo">
              <i class="fas fa-plus"></i> Agregar insumo
            </button>
          </div>
        </div>

        <div v-if="insumos.length === 0" class="py-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Aún no hay insumos. Agrega los medicamentos y materiales que manejas.</p>
          <p v-if="canManageInventario" class="mt-1">
            Para empezar más rápido puedes partir de una
            <button type="button" class="font-medium text-emerald-700 hover:underline dark:text-emerald-400" @click="abrirListaSugerida">lista sugerida</button>
            y elegir lo que te sirva.
          </p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[640px] text-sm">
            <thead class="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <tr>
                <th class="px-3 py-2">Insumo</th>
                <th class="px-3 py-2">Unidad</th>
                <th class="px-3 py-2 text-right">Stock mínimo</th>
                <th class="px-3 py-2">Control</th>
                <th class="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="insumo in insumosVisibles"
                :key="insumo._id"
                class="border-t border-gray-100 dark:border-gray-700"
                :class="{ 'opacity-60': !insumo.activo }"
              >
                <td class="px-3 py-2">
                  <p class="font-medium text-gray-900 dark:text-gray-100">
                    {{ insumo.nombre }}
                    <span v-if="!insumo.activo" class="ml-1 text-xs font-normal text-gray-500">(desactivado)</span>
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ etiquetaCategoria(insumo.categoria) }}
                    <span v-if="insumo.parametrosAntidoping"> · {{ insumo.parametrosAntidoping }} parámetros</span>
                  </p>
                </td>
                <td class="px-3 py-2 text-gray-700 dark:text-gray-300">
                  {{ insumo.unidad }}
                  <p v-if="insumo.presentacion" class="text-xs text-gray-500">
                    {{ insumo.presentacion }} ({{ insumo.unidadesPorPresentacion }})
                  </p>
                </td>
                <td class="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                  {{ insumo.stockMinimo || '—' }}
                </td>
                <td class="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                  {{
                    [insumo.controlaLote ? 'Lote' : '', insumo.controlaCaducidad ? 'Caducidad' : '']
                      .filter(Boolean)
                      .join(' y ') || '—'
                  }}
                </td>
                <td class="px-3 py-2 text-right">
                  <button
                    v-if="canManageInventario"
                    type="button"
                    class="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                    @click="abrirEdicion(insumo)"
                  >
                    Editar
                  </button>
                </td>
              </tr>
              <tr v-if="insumosVisibles.length === 0">
                <td colspan="5" class="px-3 py-6 text-center text-gray-500">Ningún insumo coincide con la búsqueda.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <InventarioModal
      v-if="listaAbierta"
      titulo="Lista sugerida de insumos"
      ancho="lg"
      @cerrar="listaAbierta = false"
    >
      <p v-if="cargandoLista" class="py-8 text-center text-gray-500">
        <i class="fas fa-spinner fa-spin mr-2"></i> Cargando...
      </p>
      <template v-else>
        <p class="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Insumos comunes en un servicio médico de empresa. Elige los que manejas; se copian a tu
          catálogo y después puedes renombrarlos, completar su presentación y su stock mínimo, o
          desactivarlos.
        </p>
        <p v-if="disponibles.length === 0" class="py-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Ya tienes en tu catálogo todos los insumos de la lista.
        </p>
        <template v-else>
          <button
            type="button"
            class="mb-3 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            @click="alternarTodos"
          >
            {{ elegidos.length === disponibles.length ? 'Quitar selección' : 'Seleccionar todos' }}
          </button>
          <fieldset v-for="grupo in gruposSugeridos" :key="grupo.value" class="mb-4">
            <legend class="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">{{ grupo.label }}</legend>
            <div class="grid gap-1 sm:grid-cols-2">
              <label
                v-for="insumo in grupo.insumos"
                :key="insumo.nombre"
                class="flex items-start gap-2 text-sm"
                :class="insumo.yaExiste ? 'text-gray-400' : 'cursor-pointer text-gray-800 dark:text-gray-200'"
              >
                <input
                  v-model="elegidos"
                  type="checkbox"
                  :value="insumo.nombre"
                  :disabled="insumo.yaExiste"
                  class="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600"
                />
                <span>
                  {{ insumo.nombre }}
                  <span v-if="insumo.yaExiste" class="text-xs">(ya en tu catálogo)</span>
                </span>
              </label>
            </div>
          </fieldset>
        </template>
      </template>
      <template #acciones>
        <button type="button" :class="botonSecundario" @click="listaAbierta = false">Cancelar</button>
        <button
          v-if="disponibles.length > 0"
          type="button"
          :class="botonPrimario"
          :disabled="guardando || cargandoLista || elegidos.length === 0"
          @click="agregarSugeridos"
        >
          {{ guardando ? 'Agregando...' : `Agregar ${elegidos.length} al catálogo` }}
        </button>
      </template>
    </InventarioModal>

    <InventarioModal
      v-if="formAbierto"
      :titulo="editandoId ? 'Editar insumo' : 'Agregar insumo'"
      ancho="lg"
      @cerrar="formAbierto = false"
    >
      <form id="form-insumo" class="grid gap-3 sm:grid-cols-2" @submit.prevent="guardarInsumo">
        <div class="sm:col-span-2">
          <label :class="etiqueta" for="insumo-nombre">Nombre</label>
          <input id="insumo-nombre" v-model="form.nombre" type="text" maxlength="120" placeholder="Ej. Paracetamol 500 mg tabletas" :class="campo" required />
        </div>
        <div>
          <label :class="etiqueta" for="insumo-categoria">Categoría</label>
          <select id="insumo-categoria" v-model="form.categoria" :class="campo">
            <option v-for="categoria in CATEGORIAS_INSUMO" :key="categoria.value" :value="categoria.value">
              {{ categoria.label }}
            </option>
          </select>
        </div>
        <div v-if="form.categoria === 'PRUEBA_ANTIDOPING'">
          <label :class="etiqueta" for="insumo-parametros">Parámetros</label>
          <select id="insumo-parametros" v-model.number="form.parametrosAntidoping" :class="campo">
            <option :value="undefined" disabled>Selecciona</option>
            <option v-for="n in PARAMETROS_ANTIDOPING" :key="n" :value="n">{{ n }} parámetros</option>
          </select>
        </div>
        <div>
          <label :class="etiqueta" for="insumo-unidad">Unidad de consumo</label>
          <input id="insumo-unidad" v-model="form.unidad" type="text" maxlength="30" placeholder="Ej. tableta, pieza, ampolleta" :class="campo" required />
          <p class="mt-1 text-xs text-gray-500">Las existencias se llevan en esta unidad.</p>
        </div>
        <div>
          <label :class="etiqueta" for="insumo-stock">Stock mínimo por centro</label>
          <input id="insumo-stock" v-model.number="form.stockMinimo" type="number" min="0" step="1" :class="campo" />
          <p class="mt-1 text-xs text-gray-500">0 = sin aviso de stock bajo.</p>
        </div>
        <div>
          <label :class="etiqueta" for="insumo-presentacion">Presentación (opcional)</label>
          <input id="insumo-presentacion" v-model="form.presentacion" type="text" maxlength="80" placeholder="Ej. Caja con 20" :class="campo" />
        </div>
        <div>
          <label :class="etiqueta" for="insumo-factor">Unidades por presentación</label>
          <input id="insumo-factor" v-model.number="form.unidadesPorPresentacion" type="number" min="1" step="1" :class="campo" />
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input v-model="form.controlaLote" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-emerald-600" />
          Controlar por lote
        </label>
        <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input v-model="form.controlaCaducidad" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-emerald-600" />
          Controlar caducidad
        </label>
        <label v-if="editandoId" class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 sm:col-span-2">
          <input v-model="form.activo" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-emerald-600" />
          Activo (un insumo desactivado ya no acepta entradas)
        </label>
      </form>
      <template #acciones>
        <button type="button" :class="botonSecundario" @click="formAbierto = false">Cancelar</button>
        <button type="submit" form="form-insumo" :class="botonPrimario" :disabled="guardando">
          {{ guardando ? 'Guardando...' : 'Guardar' }}
        </button>
      </template>
    </InventarioModal>
  </div>
</template>
