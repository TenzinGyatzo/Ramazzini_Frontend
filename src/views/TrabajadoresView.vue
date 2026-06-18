<script setup lang="ts">
// 1. Imports
import { ref, reactive, nextTick, onMounted, inject, watch, computed, provide } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useModalResumenImportacionStore } from '@/stores/modalResumenImportacion';
import { useRoute, useRouter, type RouteLocationNormalizedLoaded } from 'vue-router';
import { convertirFechaISOaDDMMYYYY, calcularEdad, calcularAntiguedad, determinarVistaCorregida } from '@/helpers/dates';
import { exportarTrabajadoresDesdeFrontend } from '@/helpers/exportarExcel';
import $ from 'jquery';

import GreenButton from '@/components/GreenButton.vue';
import DataTableDT from '@/components/DataTableDT.vue';
import ModalTrabajadores from '@/components/ModalTrabajadores.vue';
import ModalCargaMasiva from '@/components/ModalCargaMasiva.vue';
import ModalSuscripcion from '@/components/suscripciones/ModalSuscripcion.vue';
import ModalRiesgos from '@/components/ModalRiesgos.vue';
import ModalRTs from '@/components/ModalRTs.vue';
import ModalResumenImportacion from '@/components/ModalResumenImportacion.vue';

import type { Empresa } from '@/interfaces/empresa.interface';
import type { CentroTrabajo } from '@/interfaces/centro-trabajo.interface';
import type { Trabajador } from '../interfaces/trabajador.interface';
import { useUserPermissions } from '@/composables/useUserPermissions';
import { usePermissionRestrictions } from '@/composables/usePermissionRestrictions';
import type { EliminacionRequest } from '@/composables/useEliminacion';
import type { EntidadEliminable } from '@/config/eliminacion';

// 2. Stores, rutas y helpers
const toast: any = inject('toast');
const requestEliminacionGlobal = inject<(request: EliminacionRequest) => void>('requestEliminacion');
const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const modalResumenImportacion = useModalResumenImportacionStore();
const route = useRoute();
const router = useRouter();
const { canManageTrabajadores } = useUserPermissions();
const { executeIfCanManageTrabajadores } = usePermissionRestrictions();

// 3. Refs y estado reactivo
const showModal = ref(false);
const showImportModal = ref(false);
const showSubscriptionModal = ref(false);
const showRTsModal = ref(false);
const showRisksModal = ref(false);

const dataTableRef = ref();
const mostrarFiltros = ref(false);
const filtrosAplicados = reactive(new Set<string>());
const mostrarTabla = ref(false);
const tablaLista = ref(false); // Control adicional para timing de renderizado
const mostrarColumnasOcultas = ref(false);
const mostrarLeyenda = ref(false);
const mostrarVigencias = ref(false); // Estado inicial: oculto
const actualizandoTabla = ref(false);

// 4. Filtros — agrupación UI (ids de filtro no cambian: DataTable / localStorage)
type FiltroConfigItem = {
  id: string;
  label: string;
  groupId: string;
  opciones: string[] | (() => string[]);
};

const filtrosGrupos = [
  { id: 'general', label: 'Situación laboral', icon: 'fa-solid fa-briefcase' },
  { id: 'signos', label: 'Signos y medidas', icon: 'fa-solid fa-ruler-combined' },
  { id: 'vision', label: 'Visión', icon: 'fa-solid fa-eye' },
  { id: 'antecedentes', label: 'Antecedentes', icon: 'fa-solid fa-notes-medical' },
  { id: 'estudios', label: 'Estudios', icon: 'fa-solid fa-microscope' },
] as const;

/** Filtros mostrados en la fila superior (no se repiten en acordeones). */
const filtrosRapidosIds = ['periodo', 'sexo', 'vigencia', 'consultas'] as const;

/** Solo para badges/chips: filtros rápidos usan groupId rapidos (no acordeón propio). */
const filtrosConfig: FiltroConfigItem[] = [
  { id: 'estadoLaboral', groupId: 'general', label: 'Estado Laboral', opciones: ['Activo', 'Inactivo'] },
  { id: 'periodo', groupId: 'rapidos', label: 'Periodo', opciones: [
    'Hoy', 'Esta semana', 'Este mes', 'Mes anterior',
    'Últimos 3 meses', 'Últimos 6 meses', 'Este año', 'Año anterior'
  ]},
  { id: 'puesto', groupId: 'general', label: 'Puesto', opciones: () => puestosUnicos.value },
  { id: 'sexo', groupId: 'rapidos', label: 'Sexo', opciones: ['Masculino', 'Femenino', 'Intersexual'] },
  { id: 'aptitud', groupId: 'general', label: 'Aptitud', opciones: [
    'Apto Sin Restricciones', 'Apto Con Precaución', 'Apto Con Restricciones',
    'No Apto', 'Evaluación No Completada', '-'
  ]},
  { id: 'vigencia', groupId: 'rapidos', label: 'Estado de Vigencia', opciones: ['Vigente', 'Por vencer', 'Vencido'] },
  { id: 'imc', groupId: 'signos', label: 'Categoria IMC', opciones: [
    'Bajo peso', 'Normal', 'Sobrepeso',
    'Obesidad clase I', 'Obesidad clase II', 'Obesidad clase III', '-'
  ]},
  { id: 'cintura', groupId: 'signos', label: 'Cintura', opciones: [
    'Bajo Riesgo', 'Riesgo Aumentado', 'Alto Riesgo', '-'
  ]},
  { id: 'tensionArterial', groupId: 'signos', label: 'Tensión Arterial', opciones: [
    'Óptima', 'Normal', 'Alta', 'Hipertensión grado 1', 'Hipertensión grado 2', 'Hipertensión grado 3', '-'
  ]},
  { id: 'diabetico', groupId: 'antecedentes', label: 'Diabético', opciones: ['Si', 'No', '-'] },
  { id: 'hipertensivo', groupId: 'antecedentes', label: 'Hipertensivo', opciones: ['Si', 'No', '-'] },
  { id: 'cardiopatico', groupId: 'antecedentes', label: 'Cardiopatías', opciones: ['Si', 'No', '-'] },
  { id: 'agudeza', groupId: 'vision', label: 'Agudeza Visual', opciones: [
    'Visión excepcional',
    'Visión normal',
    'Visión ligeramente reducida',
    'Visión moderadamente reducida',
    'Visión significativamente reducida',
    'Visión muy reducida'
  ]},
  { id: 'daltonismo', groupId: 'vision', label: 'Visión de color', opciones: ['Normal', 'Daltonismo']},
  { id: 'correccionVisual', groupId: 'vision', label: 'Vista corregida', opciones: ['Corregida', 'Sin corregir', 'No requiere', '-'] },
  { id: 'lentes', groupId: 'vision', label: 'Requiere Lentes', opciones: ['Requiere lentes', 'No requiere', '-'] },
  { id: 'lumbalgia', groupId: 'antecedentes', label: 'Lumbalgia', opciones: ['Si', 'No', '-'] },
  { id: 'epilepsia', groupId: 'antecedentes', label: 'Epilepsias', opciones: ['Si', 'No', '-'] },
  { id: 'alergia', groupId: 'antecedentes', label: 'Alergias', opciones: ['Si', 'No', '-'] },
  { id: 'accidente', groupId: 'antecedentes', label: 'Accidentes', opciones: ['Si', 'No', '-'] },
  { id: 'otro', groupId: 'antecedentes', label: 'Otros', opciones: ['Si', 'No', '-'] },
  { id: 'quirurgico', groupId: 'antecedentes', label: 'Cirugias', opciones: ['Si', 'No', '-'] },
  { id: 'exposicion', groupId: 'general', label: 'Exposición a riesgos', opciones: [
    'Ergonómicos', 'Ruido', 'Polvos', 'Químicos', 'Psicosociales',
    'Temperaturas elevadas', 'Temperaturas abatidas', 'Vibraciones', 'Biológicos Infecciosos', '-'
  ]},
  { id: 'consultas', groupId: 'rapidos', label: 'Consultas', opciones: ['Si', 'No']},
  { id: 'audiometria', groupId: 'estudios', label: 'Audiometría', opciones: ['Normal', 'Anormal', '-']},
  { id: 'categoriaAudiometria', groupId: 'estudios', label: 'Categoría Audiometría', opciones: [
    'Normal',
    'Hipoacusia leve',
    'Hipoacusia moderada',
    'H. moderada-severa',
    'Hipoacusia severa',
    'Hipoacusia profunda',
    '-'
  ]},
  { id: 'espirometriaRc', groupId: 'estudios', label: 'Espirometría', opciones: ['Normal', 'Anormal', 'No concluyente', '-'] },
  { id: 'ekgRc', groupId: 'estudios', label: 'EKG', opciones: ['Normal', 'Anormal', 'No concluyente', '-'] },
  { id: 'rayosXRc', groupId: 'estudios', label: 'Rayos X', opciones: ['Normal', 'Anormal', 'No concluyente', '-'] },
  { id: 'laboratorioRc', groupId: 'estudios', label: 'Laboratorios', opciones: ['Normal', 'Anormal', 'No concluyente', '-'] },
];

const idsEnFiltrosRapidos = new Set<string>(filtrosRapidosIds);

const filtrosConfigPorId = computed(() => {
  const m: Record<string, FiltroConfigItem> = {};
  filtrosConfig.forEach((f) => {
    m[f.id] = f;
  });
  return m;
});

const filtrosRapidosConfig = computed(() =>
  filtrosRapidosIds.map((id) => filtrosConfigPorId.value[id]).filter(Boolean) as FiltroConfigItem[]
);

function filtrosDelGrupoParaAcordeon(grupoId: string) {
  return filtrosConfig.filter(
    (f) => f.groupId === grupoId && !idsEnFiltrosRapidos.has(f.id)
  );
}

function contarFiltrosActivosEnGrupo(grupoId: string): number {
  let n = 0;
  for (const id of filtrosAplicados) {
    const cfg = filtrosConfigPorId.value[id];
    if (cfg?.groupId === grupoId) n++;
  }
  return n;
}

/** Apertura de acordeones: al abrir el panel, solo grupos con filtros activos. */
const acordeonAbierto = reactive<Record<string, boolean>>({});
function sincronizarAcordeonesConFiltrosActivos() {
  filtrosGrupos.forEach((g) => {
    acordeonAbierto[g.id] = contarFiltrosActivosEnGrupo(g.id) > 0;
  });
}

function onToggleAcordeon(grupoId: string, e: Event) {
  const el = e.target as HTMLDetailsElement;
  if (el?.open !== undefined) acordeonAbierto[grupoId] = el.open;
}

const chipsFiltrosActivos = computed(() => {
  const out: { id: string; label: string; valor: string }[] = [];
  filtrosAplicados.forEach((id) => {
    const cfg = filtrosConfigPorId.value[id];
    if (!cfg) return;
    out.push({ id, label: cfg.label, valor: filtros[id] ?? '' });
  });
  return out;
});

function quitarFiltroChip(id: string) {
  filtros[id] = id === 'estadoLaboral' ? 'Activo' : '';
  if (id === 'estadoLaboral') {
    localStorage.setItem(`filtro-${id}`, 'Activo');
  } else {
    localStorage.removeItem(`filtro-${id}`);
  }
  actualizarEstadoFiltro(id, filtros[id]);
  dataTableRef.value?.aplicarTodosLosFiltrosDesdeLocalStorage();
  sincronizarAcordeonesConFiltrosActivos();
}

const filtros = reactive<Record<string, string>>({
  sexo: '',
  puesto: '',
  imc: '',
  cintura: '',
  tensionArterial: '',
  aptitud: '',
  lentes: '',
  vigencia: '',
  correccionVisual: '',
  agudeza: '',
  daltonismo: '',
  diabetico: '',
  hipertensivo: '',
  cardiopatico: '',
  epilepsia: '',
  alergia: '',
  lumbalgia: '',
  accidente: '',
  quirurgico: '',
  otro: '',
  exposicion: '',
  consultas: '',
  audiometria: '',
  categoriaAudiometria: '',
  espirometriaRc: '',
  ekgRc: '',
  rayosXRc: '',
  laboratorioRc: '',
  periodo: '',
  estadoLaboral: 'Activo',
});

function actualizarEstadoFiltro(id: string, valor: string) {
  if ((id === 'estadoLaboral' && valor === 'Activo') || (id !== 'estadoLaboral' && valor === '')) {
    filtrosAplicados.delete(id);
  } else {
    filtrosAplicados.add(id);
  }
}

function actualizarFiltroYGuardar(id: string) {
  actualizarEstadoFiltro(id, filtros[id]);
  localStorage.setItem(`filtro-${id}`, filtros[id]);
  dataTableRef.value?.aplicarTodosLosFiltrosDesdeLocalStorage();
}

function resetearFiltros() {
  Object.keys(filtros).forEach(id => {
    filtros[id] = id === 'estadoLaboral' ? 'Activo' : '';
    if (id === 'estadoLaboral') {
      localStorage.setItem(`filtro-${id}`, 'Activo');
    } else {
      localStorage.removeItem(`filtro-${id}`);
    }
    actualizarEstadoFiltro(id, filtros[id]);
  });
  dataTableRef.value?.aplicarTodosLosFiltrosDesdeLocalStorage();
  sincronizarAcordeonesConFiltrosActivos();
}

const hayFiltrosActivos = computed(() => filtrosAplicados.size > 0);

/*
 * Logs de rendimiento (desactivados): filtrar consola por `[TrabajadoresView:carga]`
 * const LOG_CARGA = '[TrabajadoresView:carga]';
 * const tMount = performance.now();
 * const roundMs = (n: number) => Math.round(n * 100) / 100;
 * const logCarga = (etapa: string, extra?: Record<string, unknown>) => {
 *   console.info(`${LOG_CARGA} ${etapa}`, {
 *     desdeMontajeMs: roundMs(performance.now() - tMount),
 *     ...extra,
 *   });
 * };
 */

// 5. Ciclo de vida
onMounted(async () => {
  const empresaId = String(route.params.idEmpresa);
  const centroTrabajoId = String(route.params.idCentroTrabajo);
  const guardado = localStorage.getItem('mostrarFiltros');

  // Iniciar la carga con un delay mínimo para garantizar que el spinner se muestre
  empresas.currentEmpresaId = empresaId;
  centrosTrabajo.currentCentroTrabajoId = centroTrabajoId;

  const inicioCarga = Date.now();
  await Promise.all([
    trabajadores.fetchTrabajadoresConHistoria(empresaId, centroTrabajoId),
    empresas.fetchEmpresaById(empresaId),
    centrosTrabajo.fetchCentroTrabajoById(empresaId, centroTrabajoId),
  ]);
  // logCarga('fetchParalelo trabajadores+empresa+centro', {
  //   duracionMs: roundMs(performance.now() - tFetch),
  //   registros: trabajadores.trabajadores.length,
  //   empresaId,
  //   centroTrabajoId,
  // });

  // Garantizar que el spinner se muestre por al menos tiempoMinimoSpinner ms para mejor UX
  const tiempoTranscurrido = Date.now() - inicioCarga;
  const tiempoMinimoSpinner = 100;
  if (tiempoTranscurrido < tiempoMinimoSpinner) {
    const pad = tiempoMinimoSpinner - tiempoTranscurrido;
    await new Promise(resolve => setTimeout(resolve, pad));
    // logCarga('esperaMinimaSpinner', { duracionMs: pad });
  }

  // Aplicar filtros desde query antes de mostrar la tabla
  aplicarFiltrosDesdeQuery(route.query);
  router.replace({ query: {} });
  // logCarga('filtrosDesdeQueryYRuta');

  // Esperar a que el DOM se actualice completamente
  await nextTick();
  // logCarga('postNextTick');

  // Usar requestAnimationFrame para asegurar que el DOM esté completamente renderizado
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      mostrarTabla.value = true;
      // logCarga('mostrarTabla (tras 2 rAF)');

      // Esperar un tick más para que el componente DataTableDT se monte
      nextTick(() => {
        // Aplicar filtros después de que la tabla esté lista
        setTimeout(() => {
          dataTableRef.value?.aplicarTodosLosFiltrosDesdeLocalStorage();
          tablaLista.value = true; // Marcar que la tabla está completamente lista
          // logCarga('tablaLista + filtros localStorage', {
          //   aplicarFiltrosLsMs: roundMs(performance.now() - tDt),
          // });
          // logCarga('FIN montaje lista para uso', {
          //   totalDesdeMontajeMs: roundMs(performance.now() - tMount),
          // });
        }, 50); // Pequeño delay para asegurar que DataTables esté inicializado
      });
    });
  });

  mostrarFiltros.value = guardado === 'true';

  filtrosConfig.forEach(({ id }) => {
    const select = document.getElementById(`filtro-${id}`) as HTMLSelectElement;
    // Para estadoLaboral, el valor por defecto es 'Activo', para otros filtros es ''
    const valorPorDefecto = id === 'estadoLaboral' ? 'Activo' : '';
    const valorGuardado = localStorage.getItem(`filtro-${id}`) ?? valorPorDefecto;
    filtros[id] = valorGuardado;
    
    // Si es la primera vez que se carga y es estadoLaboral, guardar el valor por defecto
    if (id === 'estadoLaboral' && !localStorage.getItem(`filtro-${id}`)) {
      localStorage.setItem(`filtro-${id}`, 'Activo');
    }
    
    actualizarEstadoFiltro(id, filtros[id]);

    if (select) {
      select.addEventListener('change', () => {
        actualizarEstadoFiltro(id, filtros[id]);
      });
    }
  });

  nextTick(() => sincronizarAcordeonesConFiltrosActivos());
});

watch(mostrarFiltros, (nuevoValor) => {
  localStorage.setItem('mostrarFiltros', String(nuevoValor));
  if (nuevoValor) {
    nextTick(() => sincronizarAcordeonesConFiltrosActivos());
  }
});

// 6. Funciones de modales
const toggleImportModal = () => {
  executeIfCanManageTrabajadores(() => {
    showImportModal.value = !showImportModal.value;
  }, 'realizar carga masiva de trabajadores');
};

const openModal = async (empresa: Empresa | null = null, centroTrabajo: CentroTrabajo | null = null, trabajador: Trabajador | null = null) => {
  // Si es un nuevo trabajador (trabajador === null), validar permisos
  if (!trabajador) {
    executeIfCanManageTrabajadores(() => {
      // Solo ejecutar si tiene permisos
      openModalInternal(empresa, centroTrabajo, trabajador);
    }, 'crear nuevos trabajadores');
    return;
  }
  
  // Si es editar trabajador existente, también validar permisos
  executeIfCanManageTrabajadores(() => {
    openModalInternal(empresa, centroTrabajo, trabajador);
  }, 'editar trabajadores');
};

const openModalInternal = async (empresa: Empresa | null = null, centroTrabajo: CentroTrabajo | null = null, trabajador: Trabajador | null = null) => {
  showModal.value = false;
  trabajadores.loadingModal;

  if (empresa && centroTrabajo && trabajador) {
    try {
      await trabajadores.fetchTrabajadorById(empresa._id, centroTrabajo._id, trabajador._id);
    } catch (error) {
      console.error('Error al cargar el trabajador:', error);
    }
  } else {
    trabajadores.resetCurrentTrabajador();
  }

  trabajadores.loadingModal = false;
  showModal.value = true;
};

const closeModal = () => showModal.value = false;

const TIPO_A_ENTIDAD: Record<string, EntidadEliminable> = {
  Trabajador: 'trabajador',
  'Riesgo de Trabajo': 'riesgoTrabajo',
};

const solicitarEliminacion = (
  tipo: string,
  id: string,
  descripcion: string,
  onConfirm: (id: string, password?: string) => Promise<void>,
) => {
  const entidad = TIPO_A_ENTIDAD[tipo] ?? 'trabajador';
  requestEliminacionGlobal?.({
    entidad,
    identificacion: descripcion,
    onConfirm: async (password) => {
      try {
        await onConfirm(id, password);
      } catch (err) {
        toast.open({ message: `Error al eliminar ${tipo}`, type: 'error' });
        throw err;
      }
    },
  });
};
provide('solicitarEliminacion', solicitarEliminacion);

const openRTsModal = async (empresa: Empresa | null, centro: CentroTrabajo | null, trabajador: Trabajador | null) => {
  showRTsModal.value = false;
  trabajadores.loadingModal;
  if (empresa && centro && trabajador) {
    try {
      await trabajadores.fetchTrabajadorById(empresa._id, centro._id, trabajador._id);
    } catch (error) {
      console.error('Error al cargar el trabajador:', error);
    }
  }
  trabajadores.loadingModal = false;
  showRTsModal.value = true;
};

const closeRTsModal = () => showRTsModal.value = false;

const openRisksModal = async (empresa: Empresa | null, centro: CentroTrabajo | null, trabajador: Trabajador | null) => {
  showRisksModal.value = false;
  trabajadores.loadingModal;
  if (empresa && centro && trabajador) {
    try {
      await trabajadores.fetchTrabajadorById(empresa._id, centro._id, trabajador._id);
    } catch (error) {
      console.error('Error al cargar el trabajador:', error);
    }
  }
  trabajadores.loadingModal = false;
  showRisksModal.value = true;
};

const closeRisksModal = () => showRisksModal.value = false;


// 7. Funciones de negocio
const exportTrabajadores = async () => {
  try {
    const empresaId = String(route.params.idEmpresa);
    const centroTrabajoId = String(route.params.idCentroTrabajo);
    await trabajadores.exportTrabajadores(empresaId, centroTrabajoId);
  } catch (error) {
    console.error('Error al exportar los trabajadores', error);
  }
};

const deleteTrabajadorById = async (
  empresaId: string,
  centroTrabajoId: string,
  trabajadorId: string,
  deletionPassword?: string,
) => {
  try {
    await trabajadores.deleteTrabajadorById(
      empresaId,
      centroTrabajoId,
      trabajadorId,
      deletionPassword,
    );
    toast.open({ message: 'Trabajador eliminado con éxito' });
    await trabajadores.fetchTrabajadoresConHistoria(empresaId, centroTrabajoId);
    trabajadores.resetCurrentTrabajador();
  } catch (error) {
    console.log('Error al eliminar al trabajador', error);
    toast.open({ message:  'No se pudo eliminar el trabajador. Por favor, elimine primero sus documentos y vuelva a intentarlo', type: 'error' });
  }
};

const eliminarTrabajador = async (trabajadorId: string, deletionPassword?: string) => {
  try {
    const empresaId = empresas.currentEmpresaId;
    const centroTrabajoId = centrosTrabajo.currentCentroTrabajoId;

    if (!empresaId || !centroTrabajoId) throw new Error('Faltan datos');

    await deleteTrabajadorById(empresaId, centroTrabajoId, trabajadorId, deletionPassword);
  } catch (err) {
    toast.open({ message: 'Error al eliminar trabajador', type: 'error' });
  }
};

const toggleEstadoLaboral = async (trabajador: { _id: string; estadoLaboral: string; }) => {
  try {
    const { currentEmpresaId } = empresas;
    const { currentCentroTrabajoId } = centrosTrabajo;
    if (!currentEmpresaId || !currentCentroTrabajoId || !trabajador?._id || !trabajador.estadoLaboral) {
      throw new Error('Faltan datos');
    }

    const nuevoEstado = trabajador.estadoLaboral === 'Activo' ? 'Inactivo' : 'Activo';
    await trabajadores.updateTrabajador(
      currentEmpresaId, currentCentroTrabajoId, trabajador._id, { estadoLaboral: nuevoEstado }
    );

    await trabajadores.fetchTrabajadoresConHistoria(currentEmpresaId, currentCentroTrabajoId);
    toast.open({ message: nuevoEstado === 'Activo' ? 'Trabajador reincorporado exitosamente' : 'Baja de trabajador registrada' });
  } catch (error) {
    console.error('Error al actualizar el estado laboral', error);
    toast.open({ message: 'Error al actualizar el estado laboral', type: 'error' });
  }
};

function generarNombreArchivoExcel(): string {
  const partes: string[] = ['trabajadores'];

  filtrosAplicados.forEach((filtroId) => {
    const valor = filtros[filtroId];
    if (valor) {
      // Normaliza: sin espacios y en minúsculas
      const valorNormalizado = valor.toLowerCase().replace(/\s+/g, '-');
      partes.push(`${filtroId}-${valorNormalizado}`);
    }
  });

  const fechaActual = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  partes.push(fechaActual);

  return partes.join('_') + '.xlsx';
}

const exportarFiltrados = () => {
  if (!dataTableRef.value) return;

  const table = $('#customTable').DataTable();
  const rowData = table.rows({ search: 'applied' }).data().toArray(); // ✅ todas las filas filtradas

  const trabajadoresFiltrados: any[] = rowData.map((row: any) => ({
    numeroEmpleado: row.numeroEmpleado,
    primerApellido: row.primerApellido || '',
    segundoApellido: row.segundoApellido || '',
    nombre: row.nombre,
    nss: row.nss || '',
    edad: calcularEdad(row.fechaNacimiento),
    sexo: row.sexo,
    escolaridad: row.escolaridad,
    puesto: row.puesto,
    antiguedad: calcularAntiguedad(row.fechaIngreso),
    telefono: row.telefono,
    estadoCivil: row.estadoCivil,
    imc: row.exploracionFisicaResumen?.categoriaIMC || '-',
    cintura: row.exploracionFisicaResumen?.categoriaCircunferenciaCintura || '-',
    categoriaTensionArterial: row.exploracionFisicaResumen?.categoriaTensionArterial || '-',
    aptitud: row.aptitudResumen?.aptitudPuesto || '-',
    requiereLentes: row.examenVistaResumen?.requiereLentesUsoGeneral || '-',
    correccionVisual: determinarVistaCorregida(
      row.examenVistaResumen?.requiereLentesUsoGeneral,
      Number(row.examenVistaResumen?.ojoIzquierdoLejanaConCorreccion),
      Number(row.examenVistaResumen?.ojoDerechoLejanaConCorreccion)
    ),
    agudeza: row.examenVistaResumen?.sinCorreccionLejanaInterpretacion || '-',
    daltonismo: row.examenVistaResumen?.interpretacionIshihara || '-',
    diabetico: row.historiaClinicaResumen?.diabeticosPP || '-',
    hipertensivo: row.historiaClinicaResumen?.hipertensivosPP || '-',
    cardiopatico: row.historiaClinicaResumen?.cardiopaticosPP || '-',
    epilepsia: row.historiaClinicaResumen?.epilepticosPP || '-',
    alergia: row.historiaClinicaResumen?.alergicos || '-',
    lumbalgia: row.historiaClinicaResumen?.lumbalgias || '-',
    accidente: row.historiaClinicaResumen?.accidentes || '-',
    quirurgico: row.historiaClinicaResumen?.quirurgicos || '-',
    otro: row.historiaClinicaResumen?.otros || '-',
    respiratorios: row.historiaClinicaResumen?.respiratorios || '-',
    alcoholismo: row.historiaClinicaResumen?.alcoholismo || '',
    tabaquismo: row.historiaClinicaResumen?.tabaquismo || '',
    agentesRiesgo: Array.isArray(row.agentesRiesgoActuales) && row.agentesRiesgoActuales.length
      ? row.agentesRiesgoActuales.join(', ')
      : '-',
    consultas: row.consultaResumen?.fechaNotaMedica ? 'Si' : 'No',
    audiometria: (() => {
      const resumen = row.audiometriaResumen || null;
      if (!resumen) return '-';
      
      const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
      
      const binarioAMA = (ppab) => {
        if (!isNum(ppab)) return 'Indeterminado';
        return ppab <= 25 ? 'Normal' : 'Anormal';
      };
      
      const binarioLFT = (hbc) => {
        if (!isNum(hbc)) return 'Indeterminado';
        return hbc >= 10 ? 'Anormal' : 'Normal';
      };
      
      let resultado = 'Indeterminado';
      if (resumen.metodoAudiometria === 'AMA') {
        resultado = binarioAMA(resumen.perdidaAuditivaBilateralAMA);
      } else if (resumen.metodoAudiometria === 'LFT') {
        resultado = binarioLFT(resumen.hipoacusiaBilateralCombinada);
      }
      
      return resultado === 'Indeterminado' ? '-' : resultado;
    })(),
    categoriaAudiometria: (() => {
      const resumen = row.audiometriaResumen || null;
      if (!resumen) return '-';
      
      const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
      
      const categoriaAMA = (ppab) => {
        if (!isNum(ppab)) return 'Indeterminado';
        if (ppab <= 25) return 'Normal';
        if (ppab <= 40) return 'Hipoacusia leve';
        if (ppab <= 60) return 'Hipoacusia moderada';
        if (ppab <= 80) return 'Hipoacusia severa';
        return 'Hipoacusia profunda';
      };
      
      // Para LFT, usamos HBC ya que caidaMaxDb no existe en la base de datos
      const categoriaLFT_porHBC = (hbc) => {
        if (!isNum(hbc)) return 'Indeterminado';
        // Usando rangos de HBC para categorizar (aproximación)
        if (hbc <= 10) return 'Normal';
        if (hbc <= 25) return 'Hipoacusia leve';
        if (hbc <= 40) return 'Hipoacusia moderada';
        if (hbc <= 60) return 'H. moderada-severa';
        if (hbc <= 80) return 'Hipoacusia severa';
        return 'Hipoacusia profunda';
      };
      
      let resultado = 'Indeterminado';
      if (resumen.metodoAudiometria === 'AMA') {
        resultado = categoriaAMA(resumen.perdidaAuditivaBilateralAMA);
      } else if (resumen.metodoAudiometria === 'LFT') {
        resultado = categoriaLFT_porHBC(resumen.hipoacusiaBilateralCombinada);
      }
      
      return resultado === 'Indeterminado' ? '-' : resultado;
    })(),
    espirometriaRc: row.resultadosClinicosResumen?.espirometria?.etiqueta ?? '-',
    ekgRc: row.resultadosClinicosResumen?.ekg?.etiqueta ?? '-',
    rayosXRc: row.resultadosClinicosResumen?.rayosX?.etiqueta ?? '-',
    laboratorioRc: row.resultadosClinicosResumen?.analisisLaboratorio?.etiqueta ?? '-',
    estadoLaboral: row.estadoLaboral || '-'
  }));

  const nombreArchivo = generarNombreArchivoExcel();
  exportarTrabajadoresDesdeFrontend(trabajadoresFiltrados, nombreArchivo);
};

const filtrosValidos = {
  sexo: ['Masculino', 'Femenino'],
  imc: ['Bajo peso', 'Normal', 'Sobrepeso', 'Obesidad clase I', 'Obesidad clase II', 'Obesidad clase III'],
  cintura: ['Bajo Riesgo', 'Riesgo Aumentado', 'Alto Riesgo', '-'],
  tensionArterial: ['Óptima', 'Normal', 'Alta', 'Hipertensión grado 1', 'Hipertensión grado 2', 'Hipertensión grado 3'],
  aptitud: ['Apto Sin Restricciones', 'Apto Con Precaución', 'Apto Con Restricciones', 'No Apto', 'Evaluación No Completada'],
  vigencia: ['Vigente', 'Por vencer', 'Vencido'],
  lentes: ['Requiere lentes', 'No requiere'],
  correccionVisual: ['Corregida', 'Sin corregir', 'No requiere'],
  agudeza: [
    'Visión excepcional', 'Visión normal', 'Visión ligeramente reducida', 'Visión moderadamente reducida', 
    'Visión significativamente reducida', 'Visión muy reducida'
  ],
  daltonismo: ['Daltonismo', 'Normal'],
  diabetico: ['Si', 'No', '-'],
  hipertensivo: ['Si', 'No', '-'],
  cardiopatico: ['Si', 'No', '-'],
  epilepsia: ['Si', 'No', '-'],
  alergia: ['Si', 'No', '-'],
  lumbalgia: ['Si', 'No', '-'],
  accidente: ['Si', 'No', '-'],
  quirurgico: ['Si', 'No', '-'],
  otro: ['Si', 'No', '-'],
  exposicion: [
    'Ergonómicos', 'Ruido', 'Polvos', 'Químicos', 'Psicosociales', 'Temperaturas elevadas', 'Temperaturas abatidas', 
    'Vibraciones', 'Biológicos Infecciosos', '-'
  ],
  consultas: ['Si', 'No'],
  audiometria: ['Normal', 'Anormal', '-'],
  categoriaAudiometria: [
    'Normal', 'Hipoacusia leve', 'Hipoacusia moderada', 'H. moderada-severa', 'Hipoacusia severa', 'Hipoacusia profunda', '-'
  ],
  espirometriaRc: ['Normal', 'Anormal', 'No concluyente', '-'],
  ekgRc: ['Normal', 'Anormal', 'No concluyente', '-'],
  rayosXRc: ['Normal', 'Anormal', 'No concluyente', '-'],
  laboratorioRc: ['Normal', 'Anormal', 'No concluyente', '-'],
};

function aplicarFiltrosDesdeQuery(query: RouteLocationNormalizedLoaded['query']) {
  const filtrosEnQuery = Object.entries(filtrosValidos).filter(([filtroId, valores]) => {
    const valor = query[filtroId];
    return typeof valor === 'string' && valores.includes(valor);
  });

  if (filtrosEnQuery.length > 0) {
    resetearFiltros(); // 🔁 Limpia localStorage y estado reactivo
  }

  filtrosEnQuery.forEach(([filtroId, _valores]) => {
    const valor = query[filtroId] as string;
    filtros[filtroId] = valor;
    localStorage.setItem(`filtro-${filtroId}`, valor);
    actualizarEstadoFiltro(filtroId, valor);
  });
}

// 8. Computadas
const puestosUnicos = computed(() => {
  const puestos = trabajadores.trabajadores.map(t => t.puesto).filter(Boolean);
  return [...new Set(puestos)].sort();
});

const toggleColumnasOcultas = () => {
  // Activar estado de actualización inmediatamente
  actualizandoTabla.value = true;
  
  // Cambiar el valor después de un pequeño delay para que la UI se actualice
  setTimeout(() => {
    mostrarColumnasOcultas.value = !mostrarColumnasOcultas.value;
  }, 10);
};

const toggleLeyenda = () => {
  mostrarLeyenda.value = !mostrarLeyenda.value;
};

const toggleVigencias = () => {
  mostrarVigencias.value = !mostrarVigencias.value;
};

</script>

<template>
  <Transition appear mode="out-in" name="slide-up">
    <div>
      <!-- Modales -->
       <Teleport to="body">
        <Transition appear name="fade">
          <ModalTrabajadores v-if="showModal" @closeModal="closeModal" @openSubscriptionModal="showSubscriptionModal = true" />
        </Transition>
      </Teleport>

      <Transition appear name="fade">
        <ModalSuscripcion v-if="showSubscriptionModal" @closeModal="showSubscriptionModal = false" />
      </Transition>

      <Transition appear name="fade">
        <ModalCargaMasiva v-if="showImportModal" @openSubscriptionModal="showSubscriptionModal = true" @closeModal="toggleImportModal" />
      </Transition>

      <Transition appear name="fade">
        <ModalResumenImportacion 
          v-if="modalResumenImportacion.isVisible" 
          :isVisible="modalResumenImportacion.isVisible"
          :resumen="modalResumenImportacion.resumen || { message: '', data: [], totalProcessed: 0, successful: 0, failed: 0 }"
          @close="modalResumenImportacion.hideModal" 
        />
      </Transition>

      <Transition appear name="fade">
        <ModalRTs v-if="showRTsModal" @closeModal="closeRTsModal" @solicitarEliminacion="solicitarEliminacion" />
      </Transition>

      <Transition appear name="fade">
        <ModalRiesgos v-if="showRisksModal" @closeModal="closeRisksModal" />
      </Transition>

      <!-- Encabezado de acciones -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 xl:p-6 mb-4 transition-all duration-500 ease-in-out">
        <div class="flex flex-col lg:flex-row justify-between items-center lg:items-center gap-4 xl:gap-6 transition-all duration-500 ease-in-out">
          <!-- Información con logotipo -->
          <div class="flex items-center gap-4 flex-1 transition-all duration-500 ease-in-out">
            <!-- Logo o placeholder -->
            <div class="flex-shrink-0 transition-all duration-500 ease-in-out">
              <img
                v-if="empresas.currentEmpresa?.logotipoEmpresa?.data"
                :src="'/uploads/logos/' + empresas.currentEmpresa.logotipoEmpresa.data + '?t=' + empresas.currentEmpresa.updatedAt"
                :alt="'Logo de ' + empresas.currentEmpresa?.nombreComercial"
                class="w-12 h-12 sm:w-16 sm:h-16 xl:w-20 xl:h-20 object-contain rounded-lg shadow-lg transition-all duration-500 ease-in-out"
              />
              <div v-else class="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                <i class="fas fa-building text-white text-xl sm:text-2xl"></i>
              </div>
            </div>
            
            <!-- Título y descripción -->
            <div class="flex-1 text-center lg:text-left min-w-0 transition-all duration-500 ease-in-out">
              <h2 class="text-xl xl:text-2xl font-bold text-gray-900 mb-1 xl:mb-2 truncate flex items-center gap-2 transition-all duration-500 ease-in-out">
                <i class="fas fa-map-marker-alt text-emerald-600 text-lg xl:text-xl transition-all duration-500 ease-in-out"></i>
                {{ centrosTrabajo.currentCentroTrabajo?.nombreCentro }}
              </h2>
              <p v-if="empresas.currentEmpresa?.nombreComercial" class="text-sm text-gray-600 mt-1 truncate flex items-center transition-all duration-500 ease-in-out">
                <i class="fas fa-building text-gray-500 text-sm transition-all duration-500 ease-in-out"></i>
                &nbsp;&nbsp;&nbsp;{{ empresas.currentEmpresa?.nombreComercial }}&nbsp;
                <span class="hidden xl:inline transition-all duration-500 ease-in-out"> - {{ empresas.currentEmpresa?.razonSocial }}</span>
              </p>
            </div>
          </div>
          
          <!-- Botones de acción principales -->
          <div class="flex flex-col sm:flex-row gap-2 xl:gap-3 w-full lg:w-auto justify-center lg:justify-end transition-all duration-500 ease-in-out">
            <GreenButton 
              text="Nuevo Trabajador" 
              size="small"
              :class="['group', 'xl:!px-6 xl:!py-3 xl:!text-base']"
              :disabled="!canManageTrabajadores"
              @click="openModal(null)" 
              title="Agregar un nuevo trabajador al centro de trabajo"
            >
              <template #icon>
                <i class="fas fa-user-plus text-sm xl:text-base group-hover:scale-110 transition-transform duration-200"></i>
              </template>
            </GreenButton>
            
            <GreenButton 
              text="Carga Masiva" 
              variant="outline"
              size="small"
              :class="['group', 'xl:!px-6 xl:!py-3 xl:!text-base']"
              :disabled="!canManageTrabajadores"
              @click="toggleImportModal" 
              title="Importar múltiples trabajadores desde un archivo Excel"
            >
              <template #icon>
                <i class="fas fa-upload text-sm xl:text-base group-hover:scale-110 transition-transform duration-200"></i>
              </template>
            </GreenButton>
            
            <GreenButton 
              text="Exportar" 
              variant="secondary"
              size="small"
              :class="['group', 'xl:!px-6 xl:!py-3 xl:!text-base']"
              @click="exportarFiltrados" 
              title="Exportar trabajadores filtrados a Excel"
            >
              <template #icon>
                <i class="fas fa-file-excel text-sm xl:text-base group-hover:scale-110 transition-transform duration-200"></i>
              </template>
            </GreenButton>
          </div>
        </div>
      </div>

      <!-- Panel de controles y filtros -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
        <!-- Controles principales -->
        <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-3">
          <div class="flex flex-wrap items-center gap-2">
            <!-- Toggle filtros -->
            <button
              @click="mostrarFiltros = !mostrarFiltros"
              :class="[
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border',
                mostrarFiltros 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
              ]"
              :title="mostrarFiltros ? 'Ocultar panel de filtros' : 'Mostrar opciones de filtrado avanzado'"
            >
              <i :class="mostrarFiltros ? 'fa-solid fa-filter-circle-xmark' : 'fa-solid fa-filter'"></i>
              {{ mostrarFiltros ? 'Ocultar filtros' : 'Mostrar filtros' }}
            </button>

            <!-- Toggle vigencias -->
            <button
              @click="toggleVigencias"
              :class="[
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border',
                mostrarVigencias
                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
              ]"
              :title="mostrarVigencias ? 'Ocultar columnas de vigencias' : 'Mostrar columnas de vigencias'"
            >
              <i class="fa-solid fa-calendar-check"></i>
              {{ mostrarVigencias ? 'Ocultar vigencias' : 'Mostrar vigencias' }}
            </button>

            <!-- Toggle columnas -->
            <button
              @click="toggleColumnasOcultas"
              :disabled="actualizandoTabla"
              :class="[
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border',
                actualizandoTabla 
                  ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' 
                  : mostrarColumnasOcultas
                    ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
              ]"
              :title="actualizandoTabla ? 'Actualizando configuración de tabla...' : (mostrarColumnasOcultas ? 'Mostrar solo columnas básicas' : 'Mostrar todas las columnas disponibles')"
            >
              <i v-if="actualizandoTabla" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else :class="mostrarColumnasOcultas ? 'fa-solid fa-table-columns' : 'fa-solid fa-table'"></i>
              {{ actualizandoTabla ? 'Actualizando...' : (mostrarColumnasOcultas ? 'Mostrar sólo columnas básicas' : 'Mostrar todas las columnas') }}
            </button>

             <!-- Toggle leyenda -->
             <button
               @click="toggleLeyenda"
               :class="[
                 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border',
                 mostrarLeyenda
                   ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                   : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
               ]"
               :title="mostrarLeyenda ? 'Ocultar explicación de colores' : 'Mostrar explicación de colores'"
             >
               <i :class="mostrarLeyenda ? 'fa-solid fa-info-circle' : 'fa-solid fa-info-circle'"></i>
               {{ mostrarLeyenda ? 'Ocultar explicación' : 'Explicar colores' }}
             </button>

            <!-- Indicador de filtros activos -->
            <div v-if="hayFiltrosActivos" 
                 class="inline-flex items-center gap-1.5 px-2 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg"
                 title="Filtros aplicados actualmente">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span class="text-xs font-medium text-emerald-700">{{ filtrosAplicados.size }} filtro{{ filtrosAplicados.size > 1 ? 's' : '' }} activo{{ filtrosAplicados.size > 1 ? 's' : '' }}</span>
            </div>
          </div>

          <!-- Botón reset filtros -->
          <button
            v-if="hayFiltrosActivos"
            @click="resetearFiltros"
            class="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg border border-red-200 transition-all duration-200 hover:border-red-300 hover:shadow-sm"
            title="Eliminar todos los filtros aplicados"
          >
            <i class="fa-solid fa-rotate-left text-xs"></i>
            Limpiar filtros
          </button>
        </div>

        <!-- Chips: filtros aplicados (visible aunque el panel esté colapsado) -->
        <div
          v-if="hayFiltrosActivos"
          class="flex flex-wrap items-center gap-2 mb-3"
        >
          <span class="text-xs font-medium text-gray-500 shrink-0">Filtros aplicados</span>
          <button
            v-for="chip in chipsFiltrosActivos"
            :key="chip.id"
            type="button"
            class="inline-flex items-center gap-1.5 max-w-full pl-2.5 pr-2 py-1 rounded-full text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-900 hover:bg-emerald-100 transition-colors"
            :title="'Quitar: ' + chip.label"
            @click="quitarFiltroChip(chip.id)"
          >
            <span class="truncate"><span class="text-emerald-700/90">{{ chip.label }}:</span> {{ chip.valor }}</span>
            <i class="fa-solid fa-xmark text-[10px] text-emerald-700/70 shrink-0" aria-hidden="true"></i>
          </button>
        </div>

        <!-- Sección de filtros -->
        <Transition name="desplegar-filtros" mode="out-in">
          <div v-if="mostrarFiltros" class="border-t border-gray-100 pt-4 space-y-3">
            <!-- Filtros rápidos (mismos ids; no se duplican en acordeones) -->
            <div>
              <p class="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-2">
                <i class="fa-solid fa-bolt text-amber-500"></i>
                Filtros rápidos
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div v-for="filtro in filtrosRapidosConfig" :key="'rapido-' + filtro.id" class="space-y-1">
                  <label :for="`filtro-${filtro.id}`" class="block text-xs font-medium text-gray-700">
                    {{ filtro.label }}
                  </label>
                  <div class="relative">
                    <select
                      :id="`filtro-${filtro.id}`"
                      v-model="filtros[filtro.id]"
                      class="w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                      :class="filtrosAplicados.has(filtro.id)
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'"
                      @change="actualizarFiltroYGuardar(filtro.id)"
                    >
                      <option value="">Todos</option>
                      <option
                        v-for="opcion in typeof filtro.opciones === 'function' ? filtro.opciones() : filtro.opciones"
                        :key="opcion"
                        :value="opcion"
                      >
                        {{ opcion }}
                      </option>
                    </select>
                    <div
                      v-if="filtrosAplicados.has(filtro.id)"
                      class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Acordeones por grupo -->
            <div class="space-y-2">
              <p class="text-xs font-semibold text-gray-600 mb-1">Más filtros por categoría</p>
              <details
                v-for="grupo in filtrosGrupos"
                :key="grupo.id"
                class="group border border-gray-100 rounded-xl overflow-hidden bg-white"
                :open="acordeonAbierto[grupo.id] === true"
                @toggle="onToggleAcordeon(grupo.id, $event)"
              >
                <summary
                  class="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100/80 transition-colors [&::-webkit-details-marker]:hidden"
                >
                  <i :class="[grupo.icon, 'text-gray-500 text-sm w-5 text-center shrink-0']" aria-hidden="true"></i>
                  <span class="text-xs font-semibold text-gray-800 flex-1 text-left">{{ grupo.label }}</span>
                  <span
                    v-if="contarFiltrosActivosEnGrupo(grupo.id) > 0"
                    class="inline-flex min-w-[1.25rem] justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white"
                  >
                    {{ contarFiltrosActivosEnGrupo(grupo.id) }}
                  </span>
                  <i
                    class="fa-solid fa-chevron-down text-gray-400 text-[10px] transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  ></i>
                </summary>
                <div class="border-t border-gray-100 p-3">
                  <div
                    v-if="filtrosDelGrupoParaAcordeon(grupo.id).length"
                    class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3"
                  >
                    <div
                      v-for="filtro in filtrosDelGrupoParaAcordeon(grupo.id)"
                      :key="filtro.id"
                      class="space-y-1"
                    >
                      <label :for="`filtro-${filtro.id}`" class="block text-xs font-medium text-gray-700">
                        {{ filtro.label }}
                      </label>
                      <div class="relative">
                        <select
                          :id="`filtro-${filtro.id}`"
                          v-model="filtros[filtro.id]"
                          class="w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                          :class="filtrosAplicados.has(filtro.id)
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'"
                          @change="actualizarFiltroYGuardar(filtro.id)"
                        >
                          <option value="">Todos</option>
                          <option
                            v-for="opcion in typeof filtro.opciones === 'function' ? filtro.opciones() : filtro.opciones"
                            :key="opcion"
                            :value="opcion"
                          >
                            {{ opcion }}
                          </option>
                        </select>
                        <div
                          v-if="filtrosAplicados.has(filtro.id)"
                          class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <p
                    v-else-if="grupo.id === 'estudios'"
                    class="text-xs text-gray-500 leading-relaxed"
                  >
                    Puedes filtrar por resultado global de espirometría, EKG, rayos X y laboratorio (último estudio por tipo).
                  </p>
                </div>
              </details>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Tabla o mensaje de carga -->
      <Transition appear mode="out-in" name="slide-up">
        <div v-if="trabajadores.loading" class="text-center py-20">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4 animate-pulse">
            <i class="empresa-item-placeholder-icon fas fa-spinner fa-spin text-2xl text-emerald-600"></i>
          </div>
          <h2 class="text-xl font-semibold text-gray-700 mb-2">Cargando Trabajadores...</h2>
          <p class="text-gray-500">Obteniendo los trabajadores del centro de trabajo</p>
        </div>
        <div v-else>
          <!-- DataTable (siempre visible, pero vacía si no hay trabajadores) -->
          <DataTableDT
            ref="dataTableRef"
            :rows="trabajadores.trabajadores || []"
            :mostrarColumnasOcultas="mostrarColumnasOcultas"
            :mostrarLeyenda="mostrarLeyenda"
            :mostrar-vigencias="mostrarVigencias"
            v-if="mostrarTabla"
            :tabla-lista="tablaLista"
            class="table-auto z-1"
            @riesgo-trabajo="openRTsModal(empresas.currentEmpresa, centrosTrabajo.currentCentroTrabajo || null, $event)"
            @riesgos="openRisksModal(empresas.currentEmpresa, centrosTrabajo.currentCentroTrabajo || null, $event)"
            @editar="openModal(empresas.currentEmpresa, centrosTrabajo.currentCentroTrabajo, $event)"
            @toggle-estado-laboral="toggleEstadoLaboral($event)"
            @eliminar="solicitarEliminacion('Trabajador', $event.id, $event.nombre, eliminarTrabajador)"
            @actualizando-tabla="actualizandoTabla = $event"
            @toggle-leyenda="mostrarLeyenda = $event"
            @toggle-vigencias="mostrarVigencias = $event"
          />

          <!-- Mensaje de estado vacío (siempre visible cuando no hay trabajadores) -->
          <div v-if="!trabajadores.loading && (!Array.isArray(trabajadores.trabajadores) || trabajadores.trabajadores.length === 0 || (typeof trabajadores.trabajadores === 'object' && trabajadores.trabajadores && 'message' in trabajadores.trabajadores))" class="text-center">
            <div class="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <i class="fas fa-users text-4xl text-gray-400"></i>
            </div>
            <h2 class="text-xl font-bold text-gray-900 mb-3">
              No hay trabajadores registrados
            </h2>
            <p class="text-gray-600 mb-6 max-w-2xl mx-auto text-sm">
              Este centro de trabajo aún no tiene trabajadores registrados. 
              Comienza agregando el primer trabajador para gestionar su expediente médico.
            </p>
            
            <!-- Sugerencias de acciones -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6 max-w-4xl mx-auto">
              <h3 class="text-base font-semibold text-gray-800 mb-4 text-center">
                ¿Por dónde empezar?
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div class="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
                  <div class="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <i class="fas fa-user-plus text-white text-lg"></i>
                  </div>
                  <h4 class="font-semibold text-gray-900 mb-2 text-sm">Agregar Trabajador</h4>
                  <p class="text-xs text-gray-600 mb-3">
                    Registra a un trabajador individualmente
                  </p>
                  <button 
                    @click="openModal(null)" 
                    :disabled="!canManageTrabajadores"
                    :class="[
                      'w-full text-xs font-medium py-2 px-3 rounded-lg transition-colors',
                      canManageTrabajadores 
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    ]"
                    :title="canManageTrabajadores ? 'Registrar nuevo trabajador' : 'No tienes permisos para crear trabajadores'"
                  >
                    Registrar Trabajador
                  </button>
                </div>
                
                <div class="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                  <div class="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <i class="fas fa-upload text-white text-lg"></i>
                  </div>
                  <h4 class="font-semibold text-gray-900 mb-2 text-sm">Carga Masiva</h4>
                  <p class="text-xs text-gray-600 mb-3">
                    Importa múltiples trabajadores desde Excel
                  </p>
                  <button 
                    @click="toggleImportModal" 
                    :disabled="!canManageTrabajadores"
                    :class="[
                      'w-full text-xs font-medium py-2 px-3 rounded-lg transition-colors',
                      canManageTrabajadores 
                        ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    ]"
                    :title="canManageTrabajadores ? 'Importar trabajadores desde Excel' : 'No tienes permisos para realizar carga masiva de trabajadores'"
                  >
                    Importar Trabajadores
                  </button>
                </div>
                
                <div class="text-center p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
                  <div class="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <i class="fas fa-file-excel text-white text-lg"></i>
                  </div>
                  <h4 class="font-semibold text-gray-900 mb-2 text-sm">Plantilla Excel</h4>
                  <p class="text-xs text-gray-600 mb-3">
                    Descarga la plantilla para carga masiva
                  </p>
                  <a href="/template/Plantilla para Importar Trabajadores.xlsx" download class="w-full bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors inline-block">
                    Descargar Plantilla
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.desplegar-filtros-enter-active,
.desplegar-filtros-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.desplegar-filtros-enter-from,
.desplegar-filtros-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.desplegar-filtros-enter-to,
.desplegar-filtros-leave-from {
  opacity: 1;
  max-height: 800px;
  transform: translateY(0);
}

:deep(table.dataTable .text-center) {
  text-align: center;
}

/* Estilos de cursor para elementos interactivos */
button:not(:disabled) {
  cursor: pointer;
}

select {
  cursor: pointer;
}

/* Efectos hover para los botones de control */
button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Animación para el indicador de filtros activos */
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  }
  50% {
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0);
  }
}

.animate-pulse {
  animation: pulse-glow 2s infinite;
}

/* Efectos para los selects de filtros */
select:focus {
  transform: scale(1.01);
}

/* Cursor específico para elementos deshabilitados */
button:disabled {
  cursor: not-allowed;
}

/* Cursor para enlaces y elementos clickeables */
a, .cursor-pointer {
  cursor: pointer;
}

/* Transiciones suaves para todos los elementos interactivos */
* {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

/* Transiciones específicas para el encabezado de acciones */
.bg-white {
  transition: all 500ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Transiciones suaves para cambios de tamaño */
img, div, span, h1, h2, p {
  transition: all 500ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Transiciones específicas para elementos responsivos */
@media (max-width: 1024px) {
  .transition-all {
    transition-duration: 400ms;
  }
}

@media (max-width: 768px) {
  .transition-all {
    transition-duration: 350ms;
  }
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Mejoras de accesibilidad */
@media (prefers-reduced-motion: reduce) {
  *,
  .desplegar-filtros-enter-active,
  .desplegar-filtros-leave-active,
  .animate-pulse {
    animation: none !important;
    transition: none !important;
  }
}

/* Efectos de profundidad para las tarjetas */
.bg-white {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
}

/* Gradiente sutil para el fondo de los botones activos */
.bg-emerald-50 {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.1) 100%);
}

.bg-blue-50 {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.1) 100%);
}

.bg-red-50 {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.1) 100%);
}
</style>