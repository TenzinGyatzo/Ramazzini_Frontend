<script setup>
// Empresas y centros que ve un usuario sin acceso a todas: empresa → sus centros.
// El acceso se da por centro; una empresa sin centros aparece en su lista pero no lo deja entrar.
import { computed, ref, watch } from 'vue';
import { getCentrosForEmpresas } from '@/composables/useCentrosCache';
import {
  agregarEmpresa,
  alternarCentro,
  marcarCentrosDeEmpresa,
  quitarEmpresa,
} from '@/helpers/permisosUsuario';

const props = defineProps({
  /** { empresas: string[], centros: string[] } */
  modelValue: { type: Object, required: true },
  empresasDisponibles: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:modelValue']);

const busqueda = ref('');
const mostrarResultados = ref(false);
const centrosPorEmpresa = ref({});
const cargando = ref(new Set());

const nombreEmpresa = (id) =>
  props.empresasDisponibles.find((empresa) => empresa._id === id)?.nombreComercial ?? 'Empresa sin nombre';

const sinAcentos = (texto = '') => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const resultados = computed(() => {
  const termino = sinAcentos(busqueda.value.trim());
  return props.empresasDisponibles
    .filter((empresa) => !props.modelValue.empresas.includes(empresa._id))
    .filter(
      (empresa) =>
        !termino ||
        sinAcentos(empresa.nombreComercial).includes(termino) ||
        sinAcentos(empresa.razonSocial).includes(termino),
    )
    .slice(0, 8);
});

const empresasAsignadas = computed(() =>
  [...props.modelValue.empresas].sort((a, b) => nombreEmpresa(a).localeCompare(nombreEmpresa(b))),
);

const cargarCentros = async (empresaIds) => {
  const pendientes = empresaIds.filter((id) => !centrosPorEmpresa.value[id]);
  if (pendientes.length === 0) return;
  cargando.value = new Set([...cargando.value, ...pendientes]);
  try {
    const centros = await getCentrosForEmpresas(pendientes);
    const nuevos = { ...centrosPorEmpresa.value };
    for (const id of pendientes) {
      nuevos[id] = centros
        .filter((centro) => String(centro.idEmpresa) === id)
        .sort((a, b) => a.nombreCentro.localeCompare(b.nombreCentro));
    }
    centrosPorEmpresa.value = nuevos;
  } catch (error) {
    console.error('Error al cargar centros de trabajo:', error);
  } finally {
    const resto = new Set(cargando.value);
    pendientes.forEach((id) => resto.delete(id));
    cargando.value = resto;
  }
};

watch(() => props.modelValue.empresas, (ids) => cargarCentros(ids), { immediate: true });

const idsDeCentros = (empresaId) => (centrosPorEmpresa.value[empresaId] ?? []).map((centro) => centro._id);

const asignados = (empresaId) =>
  idsDeCentros(empresaId).filter((id) => props.modelValue.centros.includes(id)).length;

const agregar = async (empresa) => {
  busqueda.value = '';
  mostrarResultados.value = false;
  await cargarCentros([empresa._id]);
  emit('update:modelValue', agregarEmpresa(props.modelValue, empresa._id, idsDeCentros(empresa._id)));
};

const quitar = (empresaId) => {
  emit('update:modelValue', quitarEmpresa(props.modelValue, empresaId, idsDeCentros(empresaId)));
};

const alternar = (centroId) => {
  emit('update:modelValue', alternarCentro(props.modelValue, centroId));
};

const marcarTodos = (empresaId, valor) => {
  emit('update:modelValue', marcarCentrosDeEmpresa(props.modelValue, idsDeCentros(empresaId), valor));
};

const ocultarResultados = () => {
  // Deja terminar el clic en un resultado antes de cerrar la lista
  setTimeout(() => {
    mostrarResultados.value = false;
  }, 150);
};
</script>

<template>
  <div class="asignaciones-usuario mt-3 space-y-3">
    <div class="relative">
      <label class="sr-only" for="buscar-empresa-asignar">Agregar empresa</label>
      <div class="relative">
        <i class="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
        <input
          id="buscar-empresa-asignar"
          v-model="busqueda"
          type="text"
          autocomplete="off"
          placeholder="Agregar empresa…"
          class="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
          @focus="mostrarResultados = true"
          @input="mostrarResultados = true"
          @blur="ocultarResultados"
          @keydown.esc="mostrarResultados = false"
        >
      </div>
      <ul
        v-if="mostrarResultados"
        class="asignaciones-resultados absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1"
      >
        <li v-if="resultados.length === 0" class="px-3 py-2 text-sm text-gray-500">
          {{ busqueda ? 'Ninguna empresa coincide' : 'Ya tiene todas las empresas asignadas' }}
        </li>
        <li v-for="empresa in resultados" :key="empresa._id">
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
            @mousedown.prevent
            @click="agregar(empresa)"
          >
            <span class="block font-medium text-gray-800">{{ empresa.nombreComercial }}</span>
            <span v-if="empresa.razonSocial && empresa.razonSocial !== empresa.nombreComercial" class="block text-xs text-gray-500">
              {{ empresa.razonSocial }}
            </span>
          </button>
        </li>
      </ul>
    </div>

    <div
      v-if="modelValue.empresas.length === 0"
      class="manage-permissions-role-hint p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs sm:text-sm text-amber-700 flex items-start gap-2"
    >
      <i class="fas fa-info-circle mt-0.5 shrink-0"></i>
      <span>Aún no tiene empresas asignadas, así que no verá ninguna. Al agregar una se le asignan todos sus centros; después puedes quitar los que no necesite.</span>
    </div>

    <div
      v-for="empresaId in empresasAsignadas"
      :key="empresaId"
      class="asignaciones-empresa rounded-lg border border-gray-200"
    >
      <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
        <i class="fas fa-building text-blue-600 text-sm"></i>
        <span class="flex-1 min-w-0 truncate text-sm font-semibold text-gray-800">{{ nombreEmpresa(empresaId) }}</span>
        <span v-if="!cargando.has(empresaId)" class="shrink-0 text-xs text-gray-500">
          {{ asignados(empresaId) }} de {{ idsDeCentros(empresaId).length }} centros
        </span>
        <button
          type="button"
          class="shrink-0 w-7 h-7 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors duration-150"
          :title="`Quitar ${nombreEmpresa(empresaId)}`"
          :aria-label="`Quitar ${nombreEmpresa(empresaId)}`"
          @click="quitar(empresaId)"
        >
          <i class="fas fa-xmark"></i>
        </button>
      </div>

      <div class="px-3 py-2">
        <p v-if="cargando.has(empresaId)" class="text-xs text-gray-500 py-1">
          <i class="fas fa-spinner fa-spin mr-1"></i>
          Cargando centros…
        </p>
        <p v-else-if="idsDeCentros(empresaId).length === 0" class="text-xs text-gray-500 py-1">
          Esta empresa aún no tiene centros de trabajo.
        </p>
        <template v-else>
          <div v-if="idsDeCentros(empresaId).length > 1" class="flex gap-3 mb-1 text-xs">
            <button type="button" class="font-medium text-blue-600 hover:underline" @click="marcarTodos(empresaId, true)">Todos</button>
            <button type="button" class="font-medium text-blue-600 hover:underline" @click="marcarTodos(empresaId, false)">Ninguno</button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
            <label
              v-for="centro in centrosPorEmpresa[empresaId]"
              :key="centro._id"
              class="flex items-center gap-2 py-1 text-sm text-gray-700 cursor-pointer min-w-0"
            >
              <input
                type="checkbox"
                class="w-4 h-4 shrink-0 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                :checked="modelValue.centros.includes(centro._id)"
                @change="alternar(centro._id)"
              >
              <span class="truncate">{{ centro.nombreCentro }}</span>
            </label>
          </div>
          <p
            v-if="asignados(empresaId) === 0"
            class="manage-permissions-role-hint mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-start gap-2"
          >
            <i class="fas fa-info-circle mt-0.5 shrink-0"></i>
            <span>Sin centros elegidos verá la empresa en su lista, pero no podrá entrar a ella.</span>
          </p>
        </template>
      </div>
    </div>

    <p v-if="modelValue.empresas.length > 0" class="text-xs text-gray-500 px-1">
      Los centros que se den de alta después en estas empresas habrá que asignárselos aquí.
    </p>
  </div>
</template>
