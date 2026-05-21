<script setup lang="ts">
import { ref, onMounted, computed, nextTick, watch, inject, provide, reactive } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useRiesgoTrabajoStore } from '@/stores/riesgosTrabajo';
import type { RiesgoTrabajo } from '@/interfaces/riesgo-trabajo.interface';
import { calcularEdad, calcularAntiguedad } from '@/helpers/dates';
import { formatNombreCompletoRiesgo } from '@/helpers/formatNombreCompleto';
import type { ComponentPublicInstance } from 'vue';
import { startOfMonth, endOfMonth, subMonths, subDays, startOfYear, endOfYear, subYears } from 'date-fns';
import GreenButton from '@/components/GreenButton.vue';
import { exportarRiesgosTrabajoDesdeFrontend } from '@/helpers/exportarExcel';
import ModalRTs from '@/components/ModalRTs.vue';
import ModalEliminar from '@/components/ModalEliminar.vue';
import RiesgosTrabajoDataTable from '@/components/RiesgosTrabajoDataTable.vue';

/* =====================
   Variables y Stores
===================== */
const route = useRoute();
const router = useRouter();
const empresasStore = useEmpresasStore();
const centrosStore = useCentrosTrabajoStore();
const trabajadoresStore = useTrabajadoresStore();
const riesgosTrabajoStore = useRiesgoTrabajoStore();

const empresaId = String(route.params.idEmpresa);
const datosCargados = ref(false);
const riesgosEmpresa = ref<RiesgoTrabajo[]>([]);
const centrosAbiertos = ref<Record<string, boolean>>({});

const showRTsModal = ref(false);
const showDeleteModal = ref(false);

// Toggle para cambiar entre vista de tarjetas y tabla
const vistaActual = ref<'tarjetas' | 'tabla'>('tarjetas');
const mostrarTipScroll = ref(false)
const esRestauracionLocalStorage = ref(false)

const toast = inject('toast') as any; // Inyectamos el servicio de toast para notificaciones

/* =====================
   Filtros Reactivos Mejorados
===================== */
const mostrarFiltros = ref(false);
const filtrosAplicados = reactive(new Set<string>());
const centroSeleccionado = ref<string>('todos');
const sexoSeleccionado = ref<string>('todos');
const puestoSeleccionado = ref<string>('todos');
const periodoSeleccionado = ref<string>('todos');
const edadSeleccionada = ref<string>('todos');
const antiguedadSeleccionada = ref<string>('todos');
const naturalezaSeleccionada = ref<string>('todos');
const parteCuerpoSeleccionada = ref<string>('todos');
const recaidaSeleccionada = ref<string>('todos');
const tipoRiesgoSeleccionado = ref<string>('todos');
const manejoSeleccionado = ref<string>('todos');
const altaSeleccionada = ref<string>('todos');
const diasIncapacidadSeleccionados = ref<string>('todos');
const secuelasSeleccionadas = ref<string>('todos');
const busquedaTexto = ref<string>("");
const riesgosOriginales = ref<RiesgoTrabajo[]>([]);
const inputBusqueda = ref<HTMLInputElement | null>(null);

// Función para actualizar el estado de los filtros
function actualizarEstadoFiltro(id: string, valor: string) {
  if (valor === 'todos' || valor === '') {
    filtrosAplicados.delete(id);
  } else {
    filtrosAplicados.add(id);
  }
}

// Función para actualizar filtro y guardar en localStorage
function actualizarFiltroYGuardar(id: string) {
  let valor = '';
  switch (id) {
    case 'sexo':
      valor = sexoSeleccionado.value;
      break;
    case 'puesto':
      valor = puestoSeleccionado.value;
      break;
    case 'periodo':
      valor = periodoSeleccionado.value;
      break;
    case 'edad':
      valor = edadSeleccionada.value;
      break;
    case 'antiguedad':
      valor = antiguedadSeleccionada.value;
      break;
    case 'naturaleza':
      valor = naturalezaSeleccionada.value;
      break;
    case 'parteCuerpo':
      valor = parteCuerpoSeleccionada.value;
      break;
    case 'recaida':
      valor = recaidaSeleccionada.value;
      break;
    case 'tipoRiesgo':
      valor = tipoRiesgoSeleccionado.value;
      break;
    case 'manejo':
      valor = manejoSeleccionado.value;
      break;
    case 'alta':
      valor = altaSeleccionada.value;
      break;
    case 'diasIncapacidad':
      valor = diasIncapacidadSeleccionados.value;
      break;
    case 'secuelas':
      valor = secuelasSeleccionadas.value;
      break;
  }
  
  actualizarEstadoFiltro(id, valor);
  localStorage.setItem(`filtro-rt-${id}`, valor);
}

/* =====================
   Computed: Filtros Dinámicos
===================== */
const hayFiltrosActivos = computed(() => {
  return (
    sexoSeleccionado.value !== 'todos' ||
    puestoSeleccionado.value !== 'todos' ||
    periodoSeleccionado.value !== 'todos' ||
    edadSeleccionada.value !== 'todos' ||
    antiguedadSeleccionada.value !== 'todos' ||
    naturalezaSeleccionada.value !== 'todos' ||
    parteCuerpoSeleccionada.value !== 'todos' ||
    recaidaSeleccionada.value !== 'todos' ||
    tipoRiesgoSeleccionado.value !== 'todos' ||
    manejoSeleccionado.value !== 'todos' ||
    altaSeleccionada.value !== 'todos' ||
    diasIncapacidadSeleccionados.value !== 'todos' ||
    secuelasSeleccionadas.value !== 'todos' ||
    busquedaTexto.value.trim() !== ''
  );
});

// Computed para determinar si el buscador está en uso
const buscadorEnUso = computed(() => {
  return busquedaTexto.value.trim() !== '';
});

// Computed para determinar si un grupo tenía riesgos originalmente
const gruposConRiesgosOriginales = computed(() => {
  if (!datosCargados.value || !Array.isArray(riesgosOriginales.value)) return new Set();
  
  const gruposConRiesgos = new Set<string>();
  
  centrosStore.centrosTrabajo.forEach(centro => {
    const riesgosDelCentro = riesgosOriginales.value.filter(r => r.idCentroTrabajo === centro._id);
    if (riesgosDelCentro.length > 0) {
      gruposConRiesgos.add(centro._id);
    }
  });
  
  return gruposConRiesgos;
});

// Función para determinar si un grupo específico tenía riesgos originalmente
const grupoTeníaRiesgosOriginalmente = (centroId: string) => {
  return gruposConRiesgosOriginales.value.has(centroId);
};

const puestosDisponibles = computed(() => {
  const puestosSet = new Set<string>();
  riesgosEmpresa.value.forEach(riesgo => {
    if (riesgo.puestoTrabajador) puestosSet.add(riesgo.puestoTrabajador);
  });
  return Array.from(puestosSet).sort();
});

const opcionesPeriodo = [ "Este mes", "Mes anterior", "Últimos 90 días", "Últimos 6 meses", "Este año", "Año anterior" ];

const rangoFechas = computed(() => {
  const ahora = new Date();

  switch (periodoSeleccionado.value) {
    case "Este mes":
      return {
        inicio: startOfMonth(ahora),
        fin: endOfMonth(ahora),
      };
    case "Mes anterior":
      const mesAnterior = subMonths(ahora, 1);
      return {
        inicio: startOfMonth(mesAnterior),
        fin: endOfMonth(mesAnterior),
      };
    case "Últimos 90 días":
      return {
        inicio: subDays(ahora, 90),
        fin: ahora,
      };
    case "Últimos 6 meses":
      return {
        inicio: subMonths(ahora, 6),
        fin: ahora,
      };
    case "Este año":
      return {
        inicio: startOfYear(ahora),
        fin: endOfYear(ahora),
      };
    case "Año anterior":
      const anoAnterior = subYears(ahora, 1);
      return {
        inicio: startOfYear(anoAnterior),
        fin: endOfYear(anoAnterior),
      };
    default:
      return { inicio: null, fin: null };
  }
});

const opcionesEdad = ["16–20", "21–25", "26–30", "31–35", "36–40", "41–45", "46–50", "51–55", "56–60", "61–65" ];

function obtenerEdadMinima(rango: string): number {
  if (rango === "todos") return 0;
  return Number(rango.split("–")[0]);
}

function obtenerEdadMaxima(rango: string): number {
  if (rango === "todos") return 120;
  return Number(rango.split("–")[1]);
}

const opcionesAntiguedad = [ "0–1", "1–5", "5–10", "10–15", "15–20", "20–30", "> 30" ];

function calcularAntiguedadAnios(fechaIngreso: string): number {
  const fechaInicio = new Date(fechaIngreso);
  const fechaActual = new Date();
  const diferenciaAnios = fechaActual.getFullYear() - fechaInicio.getFullYear();
  return diferenciaAnios;
}

// Computed para calcular el rango de antigüedad
function obtenerAntiguedadMinima(rango: string): number {
  if (rango === "todos") return 0;
  if (rango === "> 30") return 31;
  return Number(rango.split("–")[0]);
}

function obtenerAntiguedadMaxima(rango: string): number {
  if (rango === "todos") return 100;
  if (rango === "> 30") return 100;
  return Number(rango.split("–")[1]);
}

const naturalezasDisponibles = computed(() => {
  const naturalezasSet = new Set<string>();
  riesgosEmpresa.value.forEach(riesgo => {
    if (riesgo.naturalezaLesion) naturalezasSet.add(riesgo.naturalezaLesion);
  });
  return Array.from(naturalezasSet).sort();
});

const parteCuerpoDisponibles = computed(() => {
  const partesSet = new Set<string>();
  
  // Recorremos los riesgos para extraer las partes únicas
  riesgosEmpresa.value.forEach(riesgo => {
    if (riesgo.parteCuerpoAfectada) {
      partesSet.add(riesgo.parteCuerpoAfectada);
    }
  });

  // Convertimos el Set a un array y lo ordenamos alfabéticamente
  return Array.from(partesSet).sort();
});

const opcionesDiasIncapacidad = [ "0–10", "11–30", "31–60", "61–90", "91–120", "121–150", "> 150" ];

function cumpleRangoDiasIncapacidad(dias: number, rango: string): boolean {
  if (rango === "> 150") return dias > 150;

  const [inicio, fin] = rango.split("–").map(Number);
  return dias >= inicio && dias <= fin;
}

function filtrarPorBusqueda() {
  const texto = busquedaTexto.value.trim().toLowerCase();

  if (texto) {
    riesgosEmpresa.value = riesgosOriginales.value.filter((riesgo) => {
      // Caso 1: Buscar "Recaída"
      if (/^r(ec(a(i(d(a)?)?)?)?)?$/.test(texto)) {
        return riesgo.recaida === "Si";
      }

      // Caso 2: Buscar "Secuelas"
      if (/^s(ec(u(e(l(a(s)?)?)?)?)?)?$/.test(texto)) {
        return riesgo.secuelas === "Si";
      }

      // Caso 3: Buscar "IPP"
      if (/^i(pp?)?$/.test(texto)) {
        return riesgo.porcentajeIPP && parseInt(String(riesgo.porcentajeIPP)) > 0;
      }

      // Función auxiliar para obtener el nombre del mes en español
      const obtenerNombreMes = (fecha: Date) => {
        const meses = [
          'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
          'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        return meses[fecha.getMonth()];
      };

      // Función auxiliar para verificar si una fecha contiene el texto de búsqueda
      const fechaContieneTexto = (fechaString: string | undefined) => {
        if (!fechaString) return false;
        const fecha = new Date(fechaString);
        const fechaFormateada = fecha.toLocaleDateString('es-MX', { timeZone: 'UTC' });
        
        const nombreMes = obtenerNombreMes(fecha);
        return fechaFormateada.includes(texto) || nombreMes.includes(texto);
      };

      // Caso General: Filtrado por texto libre en cualquier campo
      return (
        (riesgo.nombreTrabajador && riesgo.nombreTrabajador.toLowerCase().includes(texto)) ||
        (riesgo.sexoTrabajador && riesgo.sexoTrabajador.toLowerCase().includes(texto)) ||
        (riesgo.puestoTrabajador && riesgo.puestoTrabajador.toLowerCase().includes(texto)) ||
        (riesgo.naturalezaLesion && riesgo.naturalezaLesion.toLowerCase().includes(texto)) ||
        (riesgo.parteCuerpoAfectada && riesgo.parteCuerpoAfectada.toLowerCase().includes(texto)) ||
        (riesgo.tipoRiesgo && riesgo.tipoRiesgo.toLowerCase().includes(texto)) ||
        (riesgo.manejo && riesgo.manejo.toLowerCase().includes(texto)) ||
        (riesgo.alta && riesgo.alta.toLowerCase().includes(texto)) ||
        (riesgo.secuelas && riesgo.secuelas.toLowerCase().includes(texto)) ||
        (riesgo.recaida && riesgo.recaida.toLowerCase().includes(texto)) ||
        (riesgo.notas && riesgo.notas.toLowerCase().includes(texto)) ||
        (riesgo.nss && riesgo.nss.toLowerCase().includes(texto)) ||
        fechaContieneTexto(riesgo.fechaRiesgo) ||
        fechaContieneTexto(riesgo.fechaAlta) ||
        (riesgo.diasIncapacidad && String(riesgo.diasIncapacidad).includes(texto)) ||
        (riesgo.porcentajeIPP && String(riesgo.porcentajeIPP).includes(texto))
      );
    });
  } else {
    // Si el texto está vacío, restauramos los datos originales sin recargar desde el backend
    riesgosEmpresa.value = [...riesgosOriginales.value];
  }
}

watch(busquedaTexto, (newVal, oldVal) => {
  // Ejecutar la función de filtrado cuando cambie el texto de búsqueda
  filtrarPorBusqueda();
  
  if (inputBusqueda.value) {
    inputBusqueda.value.focus();
  }
});

/* =====================
   Computed: Agrupación de Riesgos
===================== */
const riesgosAgrupados = computed(() => {
  if (!datosCargados.value || !Array.isArray(riesgosEmpresa.value)) return [];

  return centrosStore.centrosTrabajo
    .filter(c => centroSeleccionado.value === 'todos' || c._id === centroSeleccionado.value)
    .map(centro => {
      const riesgos = riesgosEmpresa.value.filter(r => {
        // Filtros básicos (Centro, Sexo, Puesto, Naturaleza, Antigüedad)
        const cumpleFiltroBasico = 
          r.idCentroTrabajo === centro._id &&
          (sexoSeleccionado.value === 'todos' || r.sexoTrabajador === sexoSeleccionado.value) &&
          (puestoSeleccionado.value === 'todos' || r.puestoTrabajador === puestoSeleccionado.value) &&
          (naturalezaSeleccionada.value === 'todos' || r.naturalezaLesion === naturalezaSeleccionada.value) &&
          (parteCuerpoSeleccionada.value === 'todos' || r.parteCuerpoAfectada === parteCuerpoSeleccionada.value) &&
          (tipoRiesgoSeleccionado.value === 'todos' || r.tipoRiesgo === tipoRiesgoSeleccionado.value) &&
          (manejoSeleccionado.value === 'todos' || r.manejo === manejoSeleccionado.value) &&
          (altaSeleccionada.value === 'todos' || r.alta === altaSeleccionada.value) &&
          (secuelasSeleccionadas.value === 'todos' || r.secuelas === secuelasSeleccionadas.value);

        // Filtro por Recaída (Sí, No, o vacío)
        const cumpleFiltroRecaida = 
        recaidaSeleccionada.value === 'todos' ||
        (recaidaSeleccionada.value === 'Si' && r.recaida === 'Si') ||
        (recaidaSeleccionada.value === 'No' && (r.recaida === 'No' || r.recaida == null));

        // Filtro por Periodo
        const { inicio, fin } = rangoFechas.value;
        const cumpleFiltroPeriodo = periodoSeleccionado.value === 'todos' || 
          (!inicio || !fin) || 
          (r.fechaRiesgo && new Date(r.fechaRiesgo) >= inicio && new Date(r.fechaRiesgo) <= fin);

        // Filtro por Edad
        const cumpleFiltroEdad = edadSeleccionada.value === 'todos' || 
          (r.fechaNacimiento && calcularEdad(r.fechaNacimiento) >= obtenerEdadMinima(edadSeleccionada.value) && 
          calcularEdad(r.fechaNacimiento) <= obtenerEdadMaxima(edadSeleccionada.value));
        
        // Filtro por Antigüedad
        const cumpleFiltroAntiguedad = antiguedadSeleccionada.value === 'todos' || 
          (r.fechaIngreso && calcularAntiguedadAnios(r.fechaIngreso) >= obtenerAntiguedadMinima(antiguedadSeleccionada.value) && 
          calcularAntiguedadAnios(r.fechaIngreso) <= obtenerAntiguedadMaxima(antiguedadSeleccionada.value));

        // Filtro por Días de Incapacidad
        const cumpleFiltroDiasIncapacidad = 
          diasIncapacidadSeleccionados.value === 'todos' ||
          (r.diasIncapacidad && cumpleRangoDiasIncapacidad(r.diasIncapacidad, diasIncapacidadSeleccionados.value));

        return cumpleFiltroBasico && cumpleFiltroRecaida && cumpleFiltroPeriodo && cumpleFiltroEdad && cumpleFiltroAntiguedad && cumpleFiltroDiasIncapacidad;
      });

      return {
        centroId: centro._id,
        centroNombre: centro.nombreCentro,
        centroDireccion: centro.direccionCentro,
        riesgos,
      };
    });
});

/* =====================
   Notas: Expandir y Verificar Overflow
===================== */
const notasExpandibles = ref<Record<string, boolean>>({});
const refsNotas = ref<Record<string, HTMLElement | null>>({});
const notasConOverflow = ref<Record<string, boolean>>({});

// Verificar overflow cada vez que cambie la referencia
watch(
  () => refsNotas.value,
  () => {
    verificarOverflowTodas();
  },
  { deep: true, immediate: true }
);

function toggleNota(id: string) {
  notasExpandibles.value[id] = !notasExpandibles.value[id];
  verificarOverflow(id);
}

function asignarRefNota(id: string, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLElement) {
    refsNotas.value[id] = el;
  } else {
    refsNotas.value[id] = null;
  }
}

function verificarOverflow(id: string) {
  nextTick(() => {
    const el = refsNotas.value[id];
    if (el) {
      // Verificamos si el contenido se desborda
      const tieneOverflow = el.scrollHeight > el.clientHeight;
      notasConOverflow.value[id] = tieneOverflow;
      
      // Si está expandido, mostramos todo
      if (notasExpandibles.value[id]) {
        el.style.maxHeight = "none";
      } else {
        el.style.maxHeight = tieneOverflow ? "4rem" : "none"; // Limitar altura si tiene overflow
      }
    }
  });
}

// Verificar overflow para todas las notas al cargar o cambiar
function verificarOverflowTodas() {
  nextTick(() => {
    for (const id in refsNotas.value) {
      verificarOverflow(id);
    }
  });
}

// Llamar a la inicialización después del montaje
onMounted(async () => {
  const vistaGuardada = localStorage.getItem('riesgosTrabajoVista')
  if (vistaGuardada === 'tarjetas' || vistaGuardada === 'tabla') {
    esRestauracionLocalStorage.value = true
    vistaActual.value = vistaGuardada
    await nextTick()
    esRestauracionLocalStorage.value = false
  }
})

// Guardar la vista en localStorage cuando cambie
watch(vistaActual, (nuevaVista, vistaAnterior) => {
  localStorage.setItem('riesgosTrabajoVista', nuevaVista)
  
  // Solo mostrar el tip si cambiamos específicamente de tarjetas a tabla
  // y NO es una restauración desde localStorage
  if (vistaAnterior === 'tarjetas' && nuevaVista === 'tabla' && !esRestauracionLocalStorage.value) {
    mostrarTipScrollLateral()
  }
})

/* =====================
   Funciones de Utilidad
===================== */
function toggleCentro(centroId: string) {
  centrosAbiertos.value[centroId] = !centrosAbiertos.value[centroId];
}

function limpiarFiltros() {
  // Resetear todos los valores de filtros
  sexoSeleccionado.value = 'todos';
  puestoSeleccionado.value = 'todos';
  periodoSeleccionado.value = 'todos';
  edadSeleccionada.value = 'todos';
  antiguedadSeleccionada.value = 'todos';
  naturalezaSeleccionada.value = 'todos';
  parteCuerpoSeleccionada.value = 'todos';
  recaidaSeleccionada.value = 'todos';
  tipoRiesgoSeleccionado.value = 'todos';
  manejoSeleccionado.value = 'todos';
  altaSeleccionada.value = 'todos';
  diasIncapacidadSeleccionados.value = 'todos';
  secuelasSeleccionadas.value = 'todos';
  
  // Limpiar el texto de búsqueda
  busquedaTexto.value = '';
  
  // Limpiar el conjunto de filtros aplicados
  filtrosAplicados.clear();
  
  // Limpiar localStorage
  localStorage.removeItem('filtro-rt-sexo');
  localStorage.removeItem('filtro-rt-puesto');
  localStorage.removeItem('filtro-rt-periodo');
  localStorage.removeItem('filtro-rt-edad');
  localStorage.removeItem('filtro-rt-antiguedad');
  localStorage.removeItem('filtro-rt-naturaleza');
  localStorage.removeItem('filtro-rt-parteCuerpo');
  localStorage.removeItem('filtro-rt-recaida');
  localStorage.removeItem('filtro-rt-tipoRiesgo');
  localStorage.removeItem('filtro-rt-manejo');
  localStorage.removeItem('filtro-rt-alta');
  localStorage.removeItem('filtro-rt-diasIncapacidad');
  localStorage.removeItem('filtro-rt-secuelas');
}

function exportarFiltrados() {
  if (!riesgosAgrupados.value || riesgosAgrupados.value.length === 0) {
    console.warn("No hay riesgos para exportar.");
    return;
  }

  // Extraer todos los riesgos filtrados de los grupos
  const riesgosFiltrados: any[] = riesgosAgrupados.value.flatMap(grupo => grupo.riesgos).map((riesgo) => ({
    // 1. INDICADORES CRÍTICOS Y TEMPORALES
    FechaRiesgo: riesgo.fechaRiesgo ? new Date(riesgo.fechaRiesgo).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : '-',
    PorcentajeIPP: riesgo.porcentajeIPP || '-',
    DíasIncapacidad: riesgo.diasIncapacidad || '-',
    
    // 2. IDENTIFICACIÓN DEL TRABAJADOR
    NSS: riesgo.nss || '-',
    PrimerApellido: riesgo.primerApellidoTrabajador || '-',
    SegundoApellido: riesgo.segundoApellidoTrabajador || '-',
    Nombre: riesgo.nombreTrabajador || '-',
    Puesto: riesgo.puestoTrabajador || '-',
    CentroTrabajo: centrosStore.centrosTrabajo.find(c => c._id === riesgo.idCentroTrabajo)?.nombreCentro || '-',
    
    // 3. DATOS DEL EVENTO
    Naturaleza: riesgo.naturalezaLesion || '-',
    ParteCuerpo: riesgo.parteCuerpoAfectada || '-',
    TipoRiesgo: riesgo.tipoRiesgo || '-',
    
    // 4. ESTADO Y SEGUIMIENTO
    Recaída: riesgo.recaida || '-',
    FechaAlta: riesgo.fechaAlta ? new Date(riesgo.fechaAlta).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : '-',
    Manejo: riesgo.manejo || '-',
    Alta: riesgo.alta || '-',
    Secuelas: riesgo.secuelas || '-',
    
    // 5. DATOS ADICIONALES
    NumeroEmpleado: riesgo.numeroEmpleado || '-',
    Sexo: riesgo.sexoTrabajador || '-',
    Edad: riesgo.fechaNacimiento ? calcularEdad(riesgo.fechaNacimiento) + ' años' : '-',
    Antigüedad: riesgo.fechaIngreso ? calcularAntiguedad(riesgo.fechaIngreso) : '-',
    Notas: riesgo.notas || '-',
  }));

  if (riesgosFiltrados.length === 0) {
    console.warn("No hay riesgos filtrados para exportar.");
    return;
  }

  const nombreArchivo = generarNombreArchivoExcel();
  exportarRiesgosTrabajoDesdeFrontend(riesgosFiltrados, nombreArchivo);
}

function generarNombreArchivoExcel(): string {
  const partes: string[] = ['riesgos-trabajo'];

  if (centroSeleccionado.value !== 'todos') partes.push(`centro-${centroSeleccionado.value}`);
  if (sexoSeleccionado.value !== 'todos') partes.push(`sexo-${sexoSeleccionado.value}`);
  if (puestoSeleccionado.value !== 'todos') partes.push(`puesto-${puestoSeleccionado.value}`);
  if (naturalezaSeleccionada.value !== 'todos') partes.push(`naturaleza-${naturalezaSeleccionada.value}`);
  if (parteCuerpoSeleccionada.value !== 'todos') partes.push(`parte-${parteCuerpoSeleccionada.value}`);
  if (tipoRiesgoSeleccionado.value !== 'todos') partes.push(`tipo-${tipoRiesgoSeleccionado.value}`);
  if (manejoSeleccionado.value !== 'todos') partes.push(`manejo-${manejoSeleccionado.value}`);
  if (recaidaSeleccionada.value !== 'todos') partes.push(`recaida-${recaidaSeleccionada.value}`);
  if (secuelasSeleccionadas.value !== 'todos') partes.push(`secuelas-${secuelasSeleccionadas.value}`);

  const fechaActual = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  partes.push(fechaActual);

  return partes.join('_') + '.xlsx';
}

function ordenarRiesgosPorFecha() {
  riesgosEmpresa.value.sort((a, b) => new Date(b.fechaRiesgo || 0).getTime() - new Date(a.fechaRiesgo || 0).getTime());
  riesgosOriginales.value.sort((a, b) => new Date(b.fechaRiesgo || 0).getTime() - new Date(a.fechaRiesgo || 0).getTime());
}

/* =====================
   Inicialización: Fetch de Datos
===================== */
onMounted(async () => {
  await empresasStore.fetchEmpresaById(empresaId);
  await centrosStore.fetchCentrosTrabajo(empresaId);

  const riesgos = await trabajadoresStore.fetchRiesgosTrabajoPorEmpresa(empresaId);
  riesgosOriginales.value = [...riesgos]; // Guardamos una copia de los riesgos completos
  riesgosEmpresa.value = riesgosOriginales.value; // Mostramos los riesgos
  // console.log('Riesgos de trabajo:', riesgosEmpresa.value);

  ordenarRiesgosPorFecha();
  datosCargados.value = true;

  await nextTick();
  setTimeout(() => {
    for (const grupo of riesgosAgrupados.value) {
      for (const riesgo of grupo.riesgos) {
        verificarOverflow(riesgo._id);
      }
    }
  }, 0);
});

/* =====================
   Funciones: Edición y Eliminación de RTs
===================== */
const openRTsModal = async (empresaId: string, centroId: string, trabajadorId: string) => {
  showRTsModal.value = false;
  try {
    await trabajadoresStore.fetchTrabajadorById(empresaId, centroId, trabajadorId);
    showRTsModal.value = true;
  } catch (error) {
    console.error('Error al cargar el trabajador:', error);
  }
};

function agregarRiesgoLocalmente(nuevaRT: RiesgoTrabajo) {
  const trabajador = trabajadoresStore.currentTrabajador;

  // Agregar campos del trabajador si están disponibles
  if (trabajador) {
    nuevaRT.nombreTrabajador = trabajador.nombre;
    nuevaRT.sexoTrabajador = trabajador.sexo;
    nuevaRT.fechaNacimiento = trabajador.fechaNacimiento;
    nuevaRT.fechaIngreso = trabajador.fechaIngreso;
    nuevaRT.puestoTrabajador = trabajador.puesto;
    nuevaRT.nss = trabajador.nss;
  }

  // Evitar duplicados y forzar reactividad
  if (!riesgosEmpresa.value.some(r => r._id === nuevaRT._id)) {
    riesgosEmpresa.value = [...riesgosEmpresa.value, nuevaRT];
  }

  if (!riesgosOriginales.value.some(r => r._id === nuevaRT._id)) {
    riesgosOriginales.value = [...riesgosOriginales.value, nuevaRT];
  }

  ordenarRiesgosPorFecha();

  nextTick(() => verificarOverflow(nuevaRT._id));
}

function actualizarRiesgoLocalmente(riesgoActualizado: RiesgoTrabajo) {
  const index = riesgosEmpresa.value.findIndex(r => r._id === riesgoActualizado._id);
  if (index !== -1) {
    riesgosEmpresa.value.splice(index, 1, riesgoActualizado);
  }

  const indexOriginal = riesgosOriginales.value.findIndex(r => r._id === riesgoActualizado._id);
  if (indexOriginal !== -1) {
    riesgosOriginales.value.splice(indexOriginal, 1, riesgoActualizado);
  }

  // ✅ Fuerza la reactividad de los computeds
  riesgosEmpresa.value = [...riesgosEmpresa.value];
  riesgosOriginales.value = [...riesgosOriginales.value];

  ordenarRiesgosPorFecha();

  nextTick(() => verificarOverflow(riesgoActualizado._id));
}

const deleteConfig = ref<{
  tipo: string;
  id: string | null;
  descripcion: string;
  onConfirm: ((id: string) => Promise<void>) | null;
}>({
  tipo: '',
  id: null,
  descripcion: '',
  onConfirm: null
});

const solicitarEliminacion = (tipo: string, id: string, descripcion: string, onConfirm: (id: string) => Promise<void>) => {
  deleteConfig.value = { tipo, id, descripcion, onConfirm };
  showDeleteModal.value = true;
};

function eliminarRiesgoLocalmente(id: string) {
  riesgosEmpresa.value = riesgosEmpresa.value.filter(r => r._id !== id);
  riesgosOriginales.value = riesgosOriginales.value.filter(r => r._id !== id);
}

const confirmarEliminacion = async () => {
  try {
    const idEliminado = deleteConfig.value.id;
    if (typeof deleteConfig.value.onConfirm === 'function' && idEliminado) {
      await deleteConfig.value.onConfirm(idEliminado);

      // ✅ Actualiza lista de RTs global
      eliminarRiesgoLocalmente(idEliminado);

      // ✅ Actualiza el trabajador actual manualmente
      if (trabajadoresStore.currentTrabajador?.riesgosTrabajo) {
        trabajadoresStore.currentTrabajador.riesgosTrabajo =
          trabajadoresStore.currentTrabajador.riesgosTrabajo.filter(rt => rt._id !== idEliminado);
      }
    }

  } catch (err) {
    toast.open({ message: `Error al eliminar ${deleteConfig.value.tipo}`, type: 'error' });
  } finally {
    showDeleteModal.value = false;
    deleteConfig.value = { tipo: '', id: null, descripcion: '', onConfirm: null };
  }
};

provide('solicitarEliminacion', solicitarEliminacion);

async function eliminarRTDesdeVista(trabajadorId: string, riesgoTrabajoId: string) {
  try {
    await riesgosTrabajoStore.deleteRiesgoTrabajo(trabajadorId, riesgoTrabajoId); 
    eliminarRiesgoLocalmente(riesgoTrabajoId); // Actualiza riesgosEmpresa y riesgosOriginales
    toast.open({ message: 'Riesgo de Trabajo eliminado', type: 'success' });
  } catch (error) {
    console.error(error);
    toast.open({ message: 'Error al eliminar el Riesgo de Trabajo.', type: 'error' });
  }
}

/* =====================
   Funciones para el componente de tabla
===================== */
function handleEditarDesdeTabla(riesgo: RiesgoTrabajo) {
  openRTsModal(empresaId, riesgo.idCentroTrabajo, riesgo.idTrabajador);
}

function handleEliminarDesdeTabla(payload: { id: string; descripcion: string }) {
  const riesgo = riesgosEmpresa.value.find(r => r._id === payload.id);
  if (riesgo) {
    solicitarEliminacion(
      'Riesgo de Trabajo',
      riesgo._id,
      payload.descripcion,
      () => eliminarRTDesdeVista(riesgo.idTrabajador, riesgo._id)
    );
  }
}

// Función para mostrar el tip de scroll lateral
const mostrarTipScrollLateral = () => {
  mostrarTipScroll.value = true
  setTimeout(() => {
    mostrarTipScroll.value = false
  }, 10000)
}
</script>

<template>
  <Transition appear mode="out-in" name="slide-up">
    <div>
      <Transition appear name="fade">
        <ModalRTs
          v-if="showRTsModal"
          @closeModal="showRTsModal = false"
          @riesgoActualizado="actualizarRiesgoLocalmente"
          @riesgoCreado="agregarRiesgoLocalmente"
        />
      </Transition>

      <Transition appear name="fade">
        <ModalEliminar
          v-if="showDeleteModal"
          :id-registro="deleteConfig.id || ''"
          :identificacion="deleteConfig.descripcion"
          :tipo-registro="deleteConfig.tipo"
          @closeModal="showDeleteModal = false"
          @confirmDelete="confirmarEliminacion"
        />
      </Transition>
      
      <!-- =======================
           Indicador de Carga
      ======================= -->
      <div v-if="trabajadoresStore.loading" class="flex items-center justify-center">
        <h1 class="text-3xl sm:text-4xl md:text-6xl py-20 text-center font-semibold text-gray-700">Cargando...</h1>
      </div>

      <div v-else>
        <!-- =======================
             Encabezado y Logo Empresa
        ======================= -->
        <div class="flex items-center gap-6 mb-6">
          <img
            v-if="empresasStore.currentEmpresa?.logotipoEmpresa?.data"
            :src="'/uploads/logos/' + empresasStore.currentEmpresa?.logotipoEmpresa.data + '?t=' + empresasStore.currentEmpresa?.updatedAt"
            :alt="'Logo de ' + empresasStore.currentEmpresa?.nombreComercial"
            class="w-24 h-24 object-contain rounded"
          />
          <div v-else class="w-1/4 h-32 flex flex-col items-center justify-center bg-gradient-to-r from-gray-200 to-gray-300 text-gray-500 rounded mb-4 text-center px-4 border-2 border-dashed border-gray-400">
            <i class="fas fa-camera text-4xl mb-2"></i>
            <span class="text-xs text-center">Identifica más rápido a tu cliente agregando un logotipo</span>
          </div>

          <div class="hidden sm:block">
            <h1 class="text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-800">
              {{ empresasStore.currentEmpresa?.nombreComercial }}
            </h1>
            <h2 class="text-sm md:text-base lg:text-lg xl:text-xl text-gray-600 mt-1">
              {{ empresasStore.currentEmpresa?.razonSocial }}
            </h2>
          </div>

          <div class="ml-auto flex items-center gap-3">
            <RouterLink
              :to="{ name: 'dashboard-rt', params: { idEmpresa: empresasStore.currentEmpresaId } }"
              class="nav-action-link flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-xs md:text-sm lg:text-base font-normal rounded-xl shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-200 min-w-40"
            >
              <i class="fas fa-chart-line text-xs md:text-sm lg:text-base"></i>
              <span class="hidden xl:inline">Estadísticas RTs</span>
              <span class="xl:hidden">Estadísticas</span>
            </RouterLink>
            <GreenButton text="Exportar RTs" @click="exportarFiltrados">
              <template #icon>
                <i class="fas fa-file-excel text-sm xl:text-base group-hover:scale-110 transition-transform duration-200"></i>
              </template>
            </GreenButton>
          </div>

          <!-- Filtro por Centro de Trabajo -->
          <div class="ml-auto items-center gap-2">
            <label class="block text-xs md:text-sm font-medium text-gray-700">Centro de trabajo</label>
            <select
              v-model="centroSeleccionado"
              class="border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 px-2 py-1 rounded-md shadow-sm text-xs md:text-sm font-medium text-gray-700 bg-white transition duration-150 ease-in-out mt-1"
            >
              <option value="todos">Todos</option>
              <option v-for="centro in centrosStore.centrosTrabajo" :key="centro._id" :value="centro._id">
                {{ centro.nombreCentro }}
              </option>
            </select>
          </div>
        </div>

        <!-- =======================
             Panel de controles y filtros
        ======================= -->
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

              <!-- Indicador de filtros activos -->
              <div v-if="hayFiltrosActivos && filtrosAplicados.size > 0" 
                   class="inline-flex items-center gap-1.5 px-2 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg"
                   title="Filtros aplicados actualmente">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-xs font-medium text-emerald-700">{{ filtrosAplicados.size }} filtro{{ filtrosAplicados.size > 1 ? 's' : '' }} activo{{ filtrosAplicados.size > 1 ? 's' : '' }}</span>
              </div>

              <!-- Indicador "Búsqueda activa" -->
              <Transition name="fade" mode="out-in">
                <div v-if="buscadorEnUso" 
                     class="inline-flex items-center gap-1.5 px-2 py-1.5 bg-blue-50 border border-blue-200 rounded-lg"
                     title="Buscador activo">
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  <span class="text-xs font-medium text-blue-700">Búsqueda activa</span>
                </div>
              </Transition>
            </div>

            <!-- Botón reset filtros -->
            <button
              v-if="hayFiltrosActivos"
              @click="limpiarFiltros"
              class="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg border border-red-200 transition-all duration-200 hover:border-red-300 hover:shadow-sm"
              title="Eliminar todos los filtros aplicados"
            >
              <i class="fa-solid fa-rotate-left text-xs"></i>
              Limpiar filtros
            </button>
          </div>

          <!-- Sección de filtros -->
          <Transition name="desplegar-filtros" mode="out-in">
            <div v-if="mostrarFiltros" class="border-t border-gray-100 pt-4">
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                <!-- Filtro por Sexo -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Sexo</label>
                  <div class="relative">
                    <select
                      v-model="sexoSeleccionado"
                      @change="actualizarFiltroYGuardar('sexo')"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        filtrosAplicados.has('sexo') 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="filtrosAplicados.has('sexo')" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>

                <!-- Filtro por Puesto -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Puesto</label>
                  <div class="relative">
                    <select
                      v-model="puestoSeleccionado"
                      @change="actualizarFiltroYGuardar('puesto')"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        filtrosAplicados.has('puesto') 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option v-for="puesto in puestosDisponibles" :key="puesto" :value="puesto">
                        {{ puesto }}
                      </option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="filtrosAplicados.has('puesto')" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>

                <!-- Filtro por Periodo -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Periodo</label>
                  <div class="relative">
                    <select
                      v-model="periodoSeleccionado"
                      @change="actualizarFiltroYGuardar('periodo')"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        filtrosAplicados.has('periodo') 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option v-for="opcion in opcionesPeriodo" :key="opcion" :value="opcion">
                        {{ opcion }}
                      </option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="filtrosAplicados.has('periodo')" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>

                <!-- Filtro por Edad -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Edad</label>
                  <div class="relative">
                    <select
                      v-model="edadSeleccionada"
                      @change="actualizarFiltroYGuardar('edad')"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        filtrosAplicados.has('edad') 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option v-for="rango in opcionesEdad" :key="rango" :value="rango">
                        {{ rango }}
                      </option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="filtrosAplicados.has('edad')" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>

                <!-- Filtro por Antigüedad -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Antigüedad</label>
                  <div class="relative">
                    <select
                      v-model="antiguedadSeleccionada"
                      @change="actualizarFiltroYGuardar('antiguedad')"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        filtrosAplicados.has('antiguedad') 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option v-for="rango in opcionesAntiguedad" :key="rango" :value="rango">
                        {{ rango }}
                      </option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="filtrosAplicados.has('antiguedad')" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>

                <!-- Filtro por Naturaleza de la Lesión -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Naturaleza de la Lesión</label>
                  <div class="relative">
                    <select
                      v-model="naturalezaSeleccionada"
                      @change="actualizarFiltroYGuardar('naturaleza')"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        filtrosAplicados.has('naturaleza') 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option v-for="naturaleza in naturalezasDisponibles" :key="naturaleza" :value="naturaleza">
                        {{ naturaleza }}
                      </option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="filtrosAplicados.has('naturaleza')" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>

                <!-- Filtro por Parte del Cuerpo Afectada -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Parte del Cuerpo Afectada</label>
                  <div class="relative">
                    <select
                      v-model="parteCuerpoSeleccionada"
                      @change="actualizarFiltroYGuardar('parteCuerpo')"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        filtrosAplicados.has('parteCuerpo') 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option v-for="parte in parteCuerpoDisponibles" :key="parte" :value="parte">
                        {{ parte }}
                      </option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="filtrosAplicados.has('parteCuerpo')" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>

                <!-- Filtro por Recaída -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Recaída</label>
                  <div class="relative">
                    <select
                      v-model="recaidaSeleccionada"
                      @change="actualizarFiltroYGuardar('recaida')"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        filtrosAplicados.has('recaida') 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option value="Si">Sí</option>
                      <option value="No">No</option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="filtrosAplicados.has('recaida')" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>
                
                <!-- Filtro por Tipo de Riesgo -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Tipo de Riesgo</label>
                  <div class="relative">
                    <select
                      v-model="tipoRiesgoSeleccionado"
                      @change="actualizarFiltroYGuardar('tipoRiesgo')"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        filtrosAplicados.has('tipoRiesgo') 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option value="Accidente de Trabajo">Accidente de Trabajo</option>
                      <option value="Accidente de Trayecto">Accidente de Trayecto</option>
                      <option value="Enfermedad de Trabajo">Enfermedad de Trabajo</option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="filtrosAplicados.has('tipoRiesgo')" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>
                
                <!-- Filtro por Manejo -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Manejo</label>
                  <div class="relative">
                    <select
                      v-model="manejoSeleccionado"
                      @change="actualizarFiltroYGuardar('manejo')"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        filtrosAplicados.has('manejo') 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option value="IMSS">IMSS</option>
                      <option value="Interno">Interno</option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="filtrosAplicados.has('manejo')" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>

                <!-- Filtro por Alta -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Alta</label>
                  <div class="relative">
                    <select
                      v-model="altaSeleccionada"
                      @change="actualizarFiltroYGuardar('alta')"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        filtrosAplicados.has('alta') 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option value="Incapacidad Activa">Incapacidad Activa</option>
                      <option value="Alta ST2">Alta ST2</option>
                      <option value="Alta Interna">Alta Interna</option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="filtrosAplicados.has('alta')" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>

                <!-- Filtro por Días de Incapacidad -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Días de Incapacidad</label>
                  <div class="relative">
                    <select
                      v-model="diasIncapacidadSeleccionados"
                      @change="actualizarFiltroYGuardar('diasIncapacidad')"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        filtrosAplicados.has('diasIncapacidad') 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option v-for="rango in opcionesDiasIncapacidad" :key="rango" :value="rango">
                        {{ rango }}
                      </option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="filtrosAplicados.has('diasIncapacidad')" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>

                <!-- Filtro por Secuelas -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Secuelas</label>
                  <div class="relative">
                    <select
                      v-model="secuelasSeleccionadas"
                      @change="actualizarFiltroYGuardar('secuelas')"
                      :class="[
                        'w-full px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/20',
                        filtrosAplicados.has('secuelas') 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium' 
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:border-emerald-400'
                      ]"
                    >
                      <option value="todos">Todos</option>
                      <option value="Si">Si</option>
                      <option value="No">No</option>
                    </select>
                    <!-- Indicador de filtro activo -->
                    <div v-if="filtrosAplicados.has('secuelas')" 
                         class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- =======================
             Campo de búsqueda y Toggle de Vista
        ======================= -->
        <div class="flex flex-col sm:flex-row justify-between items-center gap-4 my-6">
          <!-- Toggle de Vista -->
          <div class="bg-gray-100 rounded-xl p-1 inline-flex">
            <button
              @click="vistaActual = 'tarjetas'"
              :class="[
                'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2',
                vistaActual === 'tarjetas'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              ]"
            >
              <i class="fas fa-th-large"></i>
              Vista de Tarjetas
            </button>
            <button
              @click="vistaActual = 'tabla'"
              :class="[
                'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2',
                vistaActual === 'tabla'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              ]"
            >
              <i class="fas fa-table"></i>
              Vista de Tabla
            </button>
          </div>

          <!-- Tip de scroll lateral (solo visible en vista de tabla) -->
          <Transition name="fade" mode="out-in">
            <div v-if="mostrarTipScroll && vistaActual === 'tabla'" class="flex-shrink-0">
              <div class="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 flex items-center gap-3 shadow-sm">
                <div class="flex-shrink-0">
                  <i class="fas fa-info-circle text-blue-500 text-lg"></i>
                </div>
                <div class="flex-1">
                  <p class="text-blue-700 text-sm font-normal">
                    Mantén presionado <kbd class="px-2 py-1 bg-blue-100 border border-blue-200 rounded text-xs font-mono dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-100">Shift</kbd> para hacer scroll lateralmente
                  </p>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Campo de búsqueda (solo visible en vista de tarjetas) -->
          <div v-if="vistaActual === 'tarjetas'" class="relative w-full sm:w-96">
            <span class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <i class="fa-solid fa-magnifying-glass text-gray-400 text-sm"></i>
            </span>
            <input
              ref="inputBusqueda"
              v-model="busquedaTexto"
              type="text"
              @input="filtrarPorBusqueda"
              placeholder="Buscar por nombre, puesto, No. Empleado, NSS, fecha, notas..."
              class="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 text-sm bg-white hover:border-gray-300"
            />
            <div v-if="busquedaTexto" class="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                @click="busquedaTexto = ''; filtrarPorBusqueda()"
                class="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i class="fas fa-times text-sm"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- =======================
             Vista de Tabla
        ======================= -->
        <Transition name="fade" mode="out-in">
          <div v-if="vistaActual === 'tabla'" class="space-y-6">
            <RiesgosTrabajoDataTable
              :rows="riesgosEmpresa"
              @editar="handleEditarDesdeTabla"
              @eliminar="handleEliminarDesdeTabla"
            />
          </div>
        </Transition>

        <!-- =======================
             Vista de Tarjetas (Lista de Riesgos Agrupados por Centro)
        ======================= -->
        <Transition name="fade" mode="out-in">
          <div v-if="vistaActual === 'tarjetas'" class="space-y-6">
            <div v-for="grupo in riesgosAgrupados" :key="grupo.centroId" class="rt-group-card bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
              <!-- Encabezado del Centro -->
              <button
                class="rt-group-header w-full text-left p-6 hover:bg-gray-50 dark:hover:bg-slate-900/70 transition-all duration-200 border-b border-gray-100 dark:border-slate-700"
                @click="toggleCentro(grupo.centroId)"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div class="flex-shrink-0">
                      <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                        <i class="fas fa-building text-white text-lg"></i>
                      </div>
                    </div>
                    <div class="flex-1 min-w-0">
                      <h2 class="text-xl font-bold text-gray-900 dark:text-slate-100 truncate">
                        {{ grupo.centroNombre }}
                      </h2>
                      <p class="text-sm text-gray-500 dark:text-slate-400 mt-1 truncate">
                        <i class="fas fa-map-marker-alt mr-1"></i>
                        {{ grupo.centroDireccion }}
                      </p>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-4">
                    <!-- Contador de RTs -->
                    <div class="flex items-center gap-2">
                      <span
                        :class="[
                          'inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold',
                          grupo.riesgos.length === 0
                            ? 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-200'
                            : grupo.riesgos.length <= 5
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
                            : grupo.riesgos.length <= 10
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
                        ]"
                      >
                        <i class="fas fa-exclamation-triangle mr-1"></i>
                        {{ grupo.riesgos.length }} RT{{ grupo.riesgos.length === 1 ? '' : 's' }}
                      </span>
                    </div>
                    
                    <!-- Icono de expansión -->
                    <div class="flex-shrink-0">
                      <i 
                        :class="[
                          'fas transition-transform duration-200 text-gray-400 dark:text-slate-400',
                          centrosAbiertos[grupo.centroId] ? 'fa-chevron-up' : 'fa-chevron-down'
                        ]"
                      ></i>
                    </div>
                  </div>
                </div>
              </button>
              
              <!-- Contenido del Centro -->
              <Transition name="desplegar" mode="out-in">
                <div v-if="centrosAbiertos[grupo.centroId]" class="p-6">
                  <!-- Mensaje cuando no hay riesgos -->
                  <div v-if="grupo.riesgos.length === 0" class="text-center py-12">
                    <!-- Mostrar "No se encontraron riesgos" solo si el grupo tenía riesgos originalmente Y hay filtros activos -->
                    <div v-if="hayFiltrosActivos && grupoTeníaRiesgosOriginalmente(grupo.centroId)" class="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i class="fas fa-search text-gray-400 text-2xl"></i>
                    </div>
                    <!-- Mostrar "Sin riesgos registrados" si el grupo no tenía riesgos originalmente O no hay filtros activos -->
                    <div v-else class="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i class="fas fa-check-circle text-gray-400 text-2xl"></i>
                    </div>
                    <h3 v-if="hayFiltrosActivos && grupoTeníaRiesgosOriginalmente(grupo.centroId)" class="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">No se encontraron riesgos</h3>
                    <h3 v-else class="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">Sin riesgos registrados</h3>
                    <p v-if="hayFiltrosActivos && grupoTeníaRiesgosOriginalmente(grupo.centroId)" class="text-gray-500 dark:text-slate-400 mb-4">No hay riesgos de trabajo que coincidan con los filtros aplicados.</p>
                    <p v-else class="text-gray-500 dark:text-slate-400">Este centro de trabajo no tiene riesgos de trabajo registrados.</p>
                    <button
                      v-if="hayFiltrosActivos && grupoTeníaRiesgosOriginalmente(grupo.centroId)"
                      @click="limpiarFiltros"
                      class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors duration-200"
                    >
                      <i class="fas fa-times"></i>
                      Limpiar filtros
                    </button>
                  </div>
                  
                  <!-- Grid de Riesgos -->
                  <div v-else class="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                    <div
                      v-for="riesgo in grupo.riesgos"
                      :key="riesgo._id"
                      class="rt-risk-card bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 hover:shadow-lg hover:border-emerald-300 transition-all duration-300"
                    >
                      <!-- Encabezado del Riesgo -->
                      <div class="flex items-start justify-between mb-0">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 mb-2">
                            <h3 class="text-xl font-semibold text-gray-900 dark:text-slate-100 truncate">
                              {{ formatNombreCompletoRiesgo(riesgo) || 'Sin nombre' }}
                            </h3>
                          </div>
                          <div class="flex items-center gap-3 mb-2">
                            <div class="text-base text-gray-600 dark:text-slate-300 font-medium group relative inline-block">
                              <i class="fas fa-briefcase mr-1"></i>
                              {{ riesgo.puestoTrabajador }}
                              <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                Puesto
                                <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                              </div>
                            </div>
                            <div v-if="riesgo.sexoTrabajador" class="flex items-center gap-1 group relative">
                              <i v-if="riesgo.sexoTrabajador === 'Masculino'" class="fas fa-mars text-sky-600 text-sm"></i>
                              <i v-else class="fas fa-venus text-rose-600 text-sm"></i>
                                <span class="text-sm sm:text-base text-gray-600 dark:text-slate-300">
                                  <span class="hidden sm:block">{{ riesgo.sexoTrabajador }}</span>
                                </span>
                              <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                {{ riesgo.sexoTrabajador === 'Masculino' ? 'Masculino' : 'Femenino' }}
                                <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <!-- Fecha del Riesgo -->
                        <div class="flex-shrink-0 text-right">
                          <div class="text-xs text-gray-500 dark:text-slate-400 mb-1">Fecha del Riesgo</div>
                          <div class="text-sm font-semibold text-gray-700 dark:text-slate-200">
                            {{ riesgo.fechaRiesgo ? new Date(riesgo.fechaRiesgo).toLocaleDateString('es-MX', {
                              timeZone: 'UTC',
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            }) : 'Fecha no registrada' }}
                          </div>
                        </div>
                      </div>

                      <!-- Información del Trabajador -->
                      <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                        <!-- Número de Empleado -->
                        <div v-if="riesgo.numeroEmpleado && riesgo.numeroEmpleado !== '-'" class="flex items-center gap-2 group relative">
                          <i class="fas fa-id-badge text-purple-500 text-sm"></i>
                          <span class="text-sm text-gray-600 dark:text-slate-300">
                            No. {{ riesgo.numeroEmpleado }}
                          </span>
                          <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            Número de empleado
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                          </div>
                        </div>
                        
                        <!-- Edad -->
                        <div class="flex items-center gap-2 group relative">
                          <i class="fas fa-birthday-cake text-emerald-500 text-sm"></i>
                          <span class="text-sm text-gray-600 dark:text-slate-300">
                            {{ riesgo.fechaNacimiento ? calcularEdad(riesgo.fechaNacimiento) + ' años' : 'Edad desconocida' }}
                          </span>
                          <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            Edad
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                          </div>
                        </div>
                        
                        <!-- Antigüedad -->
                        <div class="flex items-center gap-2 group relative">
                          <i class="fas fa-clock text-cyan-500 text-sm"></i>
                          <span class="text-sm text-gray-600 dark:text-slate-300">
                            {{ riesgo.fechaIngreso ? calcularAntiguedad(riesgo.fechaIngreso) : 'Antigüedad desconocida' }}
                          </span>
                          <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            Antigüedad
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                          </div>
                        </div>
                        
                        <!-- NSS -->
                        <div v-if="riesgo.nss" class="flex items-center gap-2 group relative">
                          <i class="fas fa-id-card text-blue-500 text-sm"></i>
                          <span class="text-sm text-gray-600">
                            {{ riesgo.nss }}
                          </span>
                          <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            NSS
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Naturaleza y Parte Afectada -->
                      <div class="mb-4">
                        <div class="text-xl font-medium text-emerald-700 mb-1 mr-3 group relative inline-block">
                          {{ riesgo.naturalezaLesion || 'Sin descripción de lesión' }}
                          <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            Naturaleza de la lesión
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                          </div>
                        </div>
                        <div v-if="riesgo.parteCuerpoAfectada" class="text-base text-gray-600 dark:text-slate-300 group relative inline-block">
                          <i class="fas fa-user-injured mr-1"></i>
                          {{ riesgo.parteCuerpoAfectada }}
                          <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            Parte afectada
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                          </div>
                        </div>
                      </div>

                      <!-- Badges de Estado -->
                      <div class="flex flex-wrap gap-2 mb-4">
                        <!-- Recaída -->
                        <span
                          v-if="riesgo.recaida === 'Si'"
                          class="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700 text-xs font-normal"
                        >
                          <i class="fas fa-redo mr-1"></i>
                          Recaída
                        </span>

                        <!-- Tipo de Riesgo -->
                        <span
                          v-if="riesgo.tipoRiesgo"
                          :class="{
                            'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700': riesgo.tipoRiesgo === 'Accidente de Trabajo',
                            'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-700': riesgo.tipoRiesgo === 'Accidente de Trayecto',
                            'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/40 dark:text-pink-200 dark:border-pink-700': riesgo.tipoRiesgo === 'Enfermedad de Trabajo'
                          }"
                          class="inline-flex items-center px-3 py-1 rounded-full border text-xs font-normal group relative"
                        >
                          <i class="mr-1">
                            <template v-if="riesgo.tipoRiesgo === 'Accidente de Trayecto'">
                              <i class="fas fa-motorcycle"></i>
                            </template>
                            <template v-if="riesgo.tipoRiesgo === 'Accidente de Trabajo'">
                              <i class="fas fa-tools"></i>
                            </template>
                            <template v-if="riesgo.tipoRiesgo === 'Enfermedad de Trabajo'">
                              <i class="fas fa-virus"></i>
                            </template>
                          </i>
                          {{ riesgo.tipoRiesgo }}
                          <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            Tipo de riesgo
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                          </div>
                        </span>

                        <!-- Manejo -->
                        <span
                          v-if="riesgo.manejo"
                          :class="riesgo.manejo === 'IMSS'
                            ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700'
                            : 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700'"
                          class="inline-flex items-center px-3 py-1 rounded-full border text-xs font-normal group relative"
                        >
                          <i class="fas fa-hospital mr-1"></i>
                          {{ riesgo.manejo === 'IMSS' ? 'IMSS' : 'Interno' }}
                          <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            Manejo del caso
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                          </div>
                        </span>

                        <!-- Alta / Incapacidad -->
                        <span 
                          v-if="riesgo.alta === 'Incapacidad Activa'" 
                          class="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700 text-xs font-normal group relative"
                        >
                          <i class="fas fa-clock mr-1"></i>
                          Incapacidad Activa
                          <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            Estatus de alta
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                          </div>
                        </span>
                        <span
                          v-else-if="riesgo.alta"
                          class="inline-flex items-center px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-200 dark:border-cyan-700 text-xs font-normal group relative"
                        >
                          <i class="fas fa-check-circle mr-1"></i>
                          Alta: {{ riesgo.fechaAlta ? new Date(riesgo.fechaAlta).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : 'Fecha no registrada' }}
                          <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            Estatus de alta
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                          </div>
                        </span>
                        
                        <!-- Días de Incapacidad -->
                        <span 
                          v-if="riesgo.diasIncapacidad" 
                          class="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-700 text-xs font-normal group relative"
                        >
                          <i class="fas fa-calendar-day mr-1"></i>
                          {{ riesgo.diasIncapacidad }} días
                          <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            Días de incapacidad
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                          </div>
                        </span>
                        
                        <!-- Estatus ST2 -->
                        <span 
                          v-if="riesgo.manejo === 'IMSS' && riesgo.alta === 'Alta ST2'" 
                          class="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-200 dark:border-green-700 text-xs font-normal group relative"
                        >
                          <i class="fas fa-file-medical mr-1"></i>
                          ST2 Recibida
                          <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            Estatus ST2
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                          </div>
                        </span>
                        <span 
                          v-else-if="riesgo.manejo === 'IMSS' && riesgo.alta !== 'Alta ST2'" 
                          class="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700 text-xs font-normal group relative"
                        >
                          <i class="fas fa-exclamation-triangle mr-1"></i>
                          ST2 Pendiente
                          <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            Estatus ST2
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                          </div>
                        </span>
                        
                        <!-- Secuelas e IPP -->
                        <span
                          v-if="riesgo.secuelas === 'Si'"
                          class="inline-flex items-center px-3 py-1 rounded-full bg-pink-100 text-pink-700 border border-pink-200 dark:bg-pink-900/40 dark:text-pink-200 dark:border-pink-700 text-xs font-normal group relative"
                        >
                          <i class="fas fa-exclamation-triangle mr-1"></i>
                          {{ riesgo.porcentajeIPP || 0 }}% IPP
                          <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            Secuelas
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                          </div>
                        </span>
                      </div>

                      <!-- Notas -->
                      <div
                        v-if="riesgo.notas"
                        class="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 mb-4 relative"
                      >
                        <div class="flex items-center gap-2 mb-2">
                          <i class="fas fa-sticky-note text-gray-500 dark:text-slate-400"></i>
                          <span class="text-sm font-medium text-gray-700 dark:text-slate-200">Notas</span>
                        </div>
                        <div
                          :ref="el => asignarRefNota(riesgo._id, el)"
                          :class="{
                            'line-clamp-2': !notasExpandibles[riesgo._id],
                            'whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-200 leading-relaxed': true
                          }"
                        >
                          {{ riesgo.notas }}
                        </div>
                        <button
                          v-if="notasConOverflow[riesgo._id]"
                          @click="toggleNota(riesgo._id)"
                          class="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                        >
                          {{ notasExpandibles[riesgo._id] ? 'Ver menos' : 'Leer más' }}
                          <i :class="notasExpandibles[riesgo._id] ? 'fas fa-chevron-up' : 'fas fa-chevron-down'" class="ml-1"></i>
                        </button>
                      </div>

                      <!-- Acciones -->
                      <div class="flex justify-end gap-3 mt-1">
                        <button 
                          @click="openRTsModal(empresaId, riesgo.idCentroTrabajo, riesgo.idTrabajador)" 
                          class="text-blue-600 hover:underline text-xs"
                        >
                          Editar
                        </button>
                        <button
                          @click="solicitarEliminacion(
                            'Riesgo de Trabajo',
                            riesgo._id,
                            riesgo.naturalezaLesion || 'Sin descripción',
                            () => eliminarRTDesdeVista(riesgo.idTrabajador, riesgo._id)
                          )"
                          class="text-red-600 hover:underline text-xs"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </Transition>

        <!-- =======================
             Botón de Regreso
        ======================= -->
        <div class="text-center mt-6">
          <button 
            @click="$router.back()" 
            class="inline-flex items-center gap-2 text-gray-600 hover:text-emerald-600 font-medium transition-colors duration-200"
          >
            <i class="fas fa-arrow-left"></i>
            Regresar
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.desplegar-enter-active,
.desplegar-leave-active {
  transition: all 0.4s ease;
  overflow: hidden;
}

.desplegar-enter-from,
.desplegar-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.desplegar-enter-to,
.desplegar-leave-from {
  opacity: 1;
  max-height: 1000px; /* lo suficientemente grande */
  transform: translateY(0);
}

.desplegar-filtros-enter-active,
.desplegar-filtros-leave-active {
  transition: all 0.3s ease;
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
  max-height: 1000px;
  transform: translateY(0);
}

/* =======================
   Estilos para transición fade
====================== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Tarjetas de Riesgos de Trabajo - Dark mode */
:global(html.dark-mode) .rt-group-card {
  background-color: #1e293b;
  border-color: #334155;
}

:global(html.dark-mode) .rt-group-header {
  border-bottom-color: #334155;
}

:global(html.dark-mode) .rt-group-header:hover {
  background-color: #0f172a;
}

:global(html.dark-mode) .rt-risk-card {
  background: #0f172a;
  border-color: #334155;
}

:global(html.dark-mode) .rt-risk-card:hover {
  border-color: #10b981;
}

:global(html.dark-mode) .rt-group-card .text-gray-900,
:global(html.dark-mode) .rt-risk-card .text-gray-900 {
  color: #f1f5f9;
}

:global(html.dark-mode) .rt-group-card .text-gray-700,
:global(html.dark-mode) .rt-risk-card .text-gray-700 {
  color: #cbd5e1;
}

:global(html.dark-mode) .rt-group-card .text-gray-600,
:global(html.dark-mode) .rt-risk-card .text-gray-600 {
  color: #94a3b8;
}

:global(html.dark-mode) .rt-group-card .text-gray-500,
:global(html.dark-mode) .rt-risk-card .text-gray-500,
:global(html.dark-mode) .rt-group-card .text-gray-400 {
  color: #94a3b8;
}

:global(html.dark-mode) .rt-group-card .bg-gray-100,
:global(html.dark-mode) .rt-risk-card .bg-gray-100 {
  background-color: #1e293b;
}

:global(html.dark-mode) .rt-group-card .border-gray-100,
:global(html.dark-mode) .rt-group-card .border-gray-200,
:global(html.dark-mode) .rt-group-card .border-white,
:global(html.dark-mode) .rt-risk-card .border-gray-200 {
  border-color: #334155;
}

:global(html.dark-mode) .rt-risk-card .bg-gray-50 {
  background-color: #1e293b;
}
</style>