<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import DataTablesCore from 'datatables.net-dt';
import 'datatables.net-select-dt';
import 'datatables.net-buttons-dt';
import 'datatables.net-fixedcolumns-dt';
import $ from 'jquery';
import { calcularEdad, calcularAntiguedad } from '@/helpers/dates';
import { useRouter } from 'vue-router';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import type { RiesgoTrabajo } from '@/interfaces/riesgo-trabajo.interface';

const props = defineProps<{ 
  rows: RiesgoTrabajo[];
  mostrarColumnasOcultas?: boolean;
}>();

const tablaRef = ref<HTMLElement | null>(null);
let dataTableInstance: any = null;

const router = useRouter();
const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();

const emit = defineEmits<{
  (e: 'editar', riesgo: RiesgoTrabajo): void;
  (e: 'eliminar', payload: { id: string; descripcion: string }): void;
}>();

// Función para truncar texto
function truncarTexto(texto: string, maxLength: number = 50): string {
  if (!texto || texto.length <= maxLength) return texto;
  return texto.substring(0, maxLength) + '...';
}

onMounted(() => {
  if (!dataTableInstance) {
    // Definir las columnas que se ocultan por defecto (vacío por ahora)
    const columnasOcultas = [20]; // Mantener notas ocultas (posición 20)

    dataTableInstance = new DataTablesCore('#riesgosTrabajoTable', {
      data: props.rows,
      columns: [
        { data: null, title: '#', render: (data, type, row, meta) => meta.row + 1 }, // 0
        // 1. INDICADORES CRÍTICOS Y TEMPORALES
        { 
          data: 'fechaRiesgo', 
          title: 'Fecha del Riesgo', 
          render: function(d) {
            if (!d) return '-';
            const fecha = new Date(d);
            const dia = fecha.getDate().toString().padStart(2, '0');
            const mes = fecha.toLocaleDateString('es-MX', { month: 'short' }).toLowerCase();
            const año = fecha.getFullYear();
            return `${dia}-${mes}-${año}`;
          },
          defaultContent: '-'
        }, // 1
        { 
          data: 'porcentajeIPP', 
          title: '% IPP', 
          defaultContent: 'Sin secuelas',
          render: function(data, type, row) {
            if (!data || data === 'Sin secuelas' || data === 0) return 'Sin secuelas';
            const ipp = parseInt(data);
            let colorClass = '';
            if (ipp >= 50) colorClass = 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-100';
            else if (ipp >= 25) colorClass = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200';
            else if (ipp >= 10) colorClass = 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200';
            else colorClass = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200';
            
            return `<span class="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${colorClass}">${data}%</span>`;
          }
        }, // 2
        { data: 'diasIncapacidad', title: 'Días Incapacidad', defaultContent: '-' }, // 3
        
        // NSS del trabajador (movido aquí)
        { 
          data: null, 
          title: 'NSS', 
          defaultContent: '-',
          render: function(data, type, row) {
            // Mostrar el NSS del trabajador, no del riesgo de trabajo
            return row.nss || '-';
          }
        }, // 4
        
        // 2. IDENTIFICACIÓN DEL TRABAJADOR
        { 
          data: null, 
          title: 'Nombre del Trabajador',
          render: function(data, type, row) {
            const primerApellido = row.primerApellidoTrabajador || '';
            const segundoApellido = row.segundoApellidoTrabajador || '';
            const nombre = row.nombreTrabajador || '';
            
            let nombreCompleto = '';
            if (primerApellido) nombreCompleto += primerApellido;
            if (segundoApellido) nombreCompleto += segundoApellido ? ' ' + segundoApellido : '';
            if (nombre) nombreCompleto += nombreCompleto ? ' ' + nombre : nombre;
            
            return nombreCompleto || 'Sin nombre';
          }
        }, // 5
        { data: 'puestoTrabajador', title: 'Puesto' }, // 6
        {
          data: null,
          title: 'Centro de Trabajo',
          render: function (data, type, row) {
            const centro = centrosTrabajo.centrosTrabajo.find(c => c._id === row.idCentroTrabajo);
            return centro ? centro.nombreCentro : '-';
          }
        }, // 7
        
        // 3. DATOS DEL EVENTO
        { data: 'naturalezaLesion', title: 'Tipo de Lesión', defaultContent: '-' }, // 8
        { data: 'parteCuerpoAfectada', title: 'Parte Afectada', defaultContent: '-' }, // 9
        { data: 'tipoRiesgo', title: 'Tipo de Riesgo', defaultContent: '-' }, // 10
        
        // 4. ESTADO Y SEGUIMIENTO
        { data: 'recaida', title: 'Recaída', render: d => d === 'Si' ? 'Sí' : 'No', defaultContent: '-' }, // 11
        { 
          data: 'fechaAlta', 
          title: 'Fecha Alta', 
          render: d => d ? new Date(d).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : '-',
          defaultContent: '-'
        }, // 12
        { data: 'manejo', title: 'Manejo', defaultContent: '-' }, // 13
        { data: 'alta', title: 'Alta', defaultContent: '-' }, // 14
        { data: 'secuelas', title: 'Secuelas', render: d => d === 'Si' ? 'Sí' : 'No', defaultContent: '-' }, // 15
        
        // 5. DATOS ADICIONALES (menos críticos para vista rápida)
        { data: 'numeroEmpleado', title: 'No. Empleado', defaultContent: '-' }, // 16
        { data: 'sexoTrabajador', title: 'Sexo' }, // 17
        { 
          data: 'fechaNacimiento', 
          title: 'Edad', 
          render: d => d ? calcularEdad(d) + ' años' : '-',
          defaultContent: '-'
        }, // 18
        { 
          data: 'fechaIngreso', 
          title: 'Antigüedad', 
          render: d => d ? calcularAntiguedad(d) : '-',
          defaultContent: '-'
        }, // 19
        { 
          data: 'notas', 
          title: 'Notas', 
          defaultContent: '-',
          render: function(data, type, row) {
            if (!data || data === '-') return '-';
            const textoTruncado = truncarTexto(data, 30);
            return `<div class="notas-cell" title="${data.replace(/"/g, '&quot;')}">${textoTruncado}</div>`;
          }
        }, // 20
        {
          data: null,
          title: 'Acciones',
          render: function (data, type, row) {
            return `
              <div class="flex gap-2">
                <button
                  type="button"
                  class="btn-editar px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 dark:text-blue-200 dark:border dark:border-blue-700 rounded transition-colors duration-200"
                  data-id="${row._id}"
                >
                  <i class="fas fa-edit mr-1"></i>
                  Editar
                </button>
                <button
                  type="button"
                  class="btn-eliminar px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/40 dark:hover:bg-red-900/60 dark:text-red-200 dark:border dark:border-red-700 rounded transition-colors duration-200"
                  data-id="${row._id}"
                  data-descripcion="${row.naturalezaLesion || 'Sin descripción'}"
                >
                  <i class="fas fa-trash mr-1"></i>
                  Eliminar
                </button>
              </div>
            `;
          }
        }, // 21
      ],
      deferRender: true,
      scrollX: true,
      autoWidth: false,
      select: true,
      scrollCollapse: true,
      scrollY: '800px',
      language: {
        url: 'https://cdn.datatables.net/plug-ins/2.1.8/i18n/es-ES.json',
        // @ts-expect-error: DataTables select extension no está tipado en language
        select: {
          rows: {
            _: "", // Texto cuando se seleccionan varias filas
            0: "", // Texto cuando no se selecciona ninguna fila
            1: ""  // Texto cuando se selecciona una fila
          },
          cells: "", // Texto para celdas seleccionadas (puedes dejarlo vacio)
          columns: "" // Texto para columnas seleccionadas (puedes dejarlo vacío)
        }
      },
      columnDefs: [
        // Configuración de columnas ocultas
        { targets: props.mostrarColumnasOcultas ? [] : columnasOcultas, visible: props.mostrarColumnasOcultas ? true : false },
        // Solo los anchos más importantes, similar a DataTableDT.vue
        { targets: 0, width: '60px', className: 'text-center' }, // #
        { targets: 21, width: '160px' } // Acciones (posición 21, no 22)
      ]
    });

    // Event listeners para los botones
    $(document).on('click', '.btn-editar', function () {
      const id = $(this).data('id');
      const riesgo = props.rows.find(r => r._id === id);
      if (riesgo) {
        emit('editar', riesgo);
      }
    });

    $(document).on('click', '.btn-eliminar', function () {
      const id = $(this).data('id');
      const descripcion = $(this).data('descripcion');
      emit('eliminar', { id, descripcion });
    });
  }
});

onBeforeUnmount(() => {
  $(document).off('click', '.btn-editar');
  $(document).off('click', '.btn-eliminar');
  
  if (dataTableInstance) {
    dataTableInstance.destroy();
    dataTableInstance = null;
  }
});

// Watch para actualizar la tabla cuando cambien los datos
watch(() => props.rows, (newRows) => {
  if (dataTableInstance) {
    // Guardar el estado actual del ordenamiento
    const currentOrder = dataTableInstance.order();
    
    dataTableInstance.clear();
    dataTableInstance.rows.add(newRows).draw();
    
    // Restaurar el ordenamiento después de actualizar los datos solo si existe
    if (currentOrder.length > 0) {
      dataTableInstance.order(currentOrder).draw();
    }
  }
}, { deep: true });
</script>

<template>
  <div class="table-container overflow-x-auto">
    <table id="riesgosTrabajoTable" ref="tablaRef" class="display w-full"></table>
  </div>
</template>

<style scoped>
.table-container {
  overflow-x: auto;
}

#riesgosTrabajoTable {
  width: 100%;
}

/* Estilos para la celda de notas con truncate */
.notas-cell {
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: help;
  display: block;
}

/* Mejorar la legibilidad de las celdas */
:deep(table.dataTable td),
:deep(table.dataTable th) {
  padding: 0.75rem 0.5rem;
  vertical-align: middle;
}

/* Asegurar que las columnas centradas mantengan su alineación */
:deep(table.dataTable .text-center) {
  text-align: center;
}

/* Centrar columnas específicas que necesitan centrado */
:deep(table.dataTable td:nth-child(1)),
:deep(table.dataTable th:nth-child(1)) {
  text-align: center;
}

:deep(table.dataTable td:nth-child(3)),
:deep(table.dataTable th:nth-child(3)) {
  text-align: center;
}

:deep(table.dataTable td:nth-child(4)),
:deep(table.dataTable th:nth-child(4)) {
  text-align: center;
}

:deep(table.dataTable td:nth-child(5)),
:deep(table.dataTable th:nth-child(5)) {
  text-align: center;
}

:deep(table.dataTable td:nth-child(12)),
:deep(table.dataTable th:nth-child(12)) {
  text-align: center;
}

:deep(table.dataTable td:nth-child(15)),
:deep(table.dataTable th:nth-child(15)) {
  text-align: center;
}

:deep(table.dataTable td:nth-child(16)),
:deep(table.dataTable th:nth-child(16)) {
  text-align: center;
}

:deep(table.dataTable td:nth-child(18)),
:deep(table.dataTable th:nth-child(18)) {
  text-align: center;
}

:deep(table.dataTable td:nth-child(19)),
:deep(table.dataTable th:nth-child(19)) {
  text-align: center;
}

:deep(table.dataTable td:nth-child(20)),
:deep(table.dataTable th:nth-child(20)) {
  text-align: center;
}

/* Forzar anchos específicos para columnas problemáticas usando !important */
:deep(table.dataTable th:nth-child(2)),
:deep(table.dataTable td:nth-child(2)) {
  width: 130px !important;
  min-width: 130px !important;
  max-width: 130px !important;
}

:deep(table.dataTable th:nth-child(3)),
:deep(table.dataTable td:nth-child(3)) {
  width: 120px !important;
  min-width: 120px !important;
  max-width: 120px !important;
}

:deep(table.dataTable th:nth-child(4)),
:deep(table.dataTable td:nth-child(4)) {
  width: 120px !important;
  min-width: 120px !important;
  max-width: 120px !important;
}

:deep(table.dataTable th:nth-child(5)),
:deep(table.dataTable td:nth-child(5)) {
  width: 110px !important;
  min-width: 110px !important;
  max-width: 110px !important;
}

:deep(table.dataTable th:nth-child(6)),
:deep(table.dataTable td:nth-child(6)) {
  width: 180px !important;
  min-width: 180px !important;
}

:deep(table.dataTable th:nth-child(7)),
:deep(table.dataTable td:nth-child(7)) {
  width: 200px !important;
  min-width: 200px !important;
}

:deep(table.dataTable th:nth-child(8)),
:deep(table.dataTable td:nth-child(8)) {
  width: 150px !important;
  min-width: 150px !important;
}

:deep(table.dataTable th:nth-child(9)),
:deep(table.dataTable td:nth-child(9)) {
  width: 150px !important;
  min-width: 150px !important;
}

:deep(table.dataTable th:nth-child(10)),
:deep(table.dataTable td:nth-child(10)) {
  width: 200px !important;
  min-width: 200px !important;
}

/* Columnas de notas (20) y acciones (21) */
:deep(table.dataTable th:nth-child(21)),
:deep(table.dataTable td:nth-child(21)) {
  width: 170px !important;
  min-width: 170px !important;
  max-width: 170px !important;
}

</style>

<style>
@import 'datatables.net-dt';

:root {
  --dt-row-selected: 16, 185, 129 !important; /* RGB del #10b981 */
}

table.dataTable th.dt-type-numeric,
table.dataTable th.dt-type-date,
table.dataTable td.dt-type-numeric,
table.dataTable td.dt-type-date {
  text-align: left;
}

table.dataTable>tbody>tr>th,
table.dataTable>tbody>tr>td {
  padding: 4px 6px;
}

div.dt-container .dt-paging .dt-paging-button.current,
div.dt-container .dt-paging .dt-paging-button.current:hover {
  color: white !important;
  border: 1px solid #15803d;
  background-color: #059669;
  background: -webkit-gradient(linear, left top, left bottom, color-stop(0%, #10b981), color-stop(100%, #059669));
  /* Chrome,Safari4+ */
  background: -webkit-linear-gradient(top, #10b981 0%, #059669 100%);
  /* Chrome10+,Safari5.1+ */
  background: -moz-linear-gradient(top, #10b981 0%, #059669 100%);
  /* FF3.6+ */
  background: -ms-linear-gradient(top, #10b981 0%, #059669 100%);
  /* IE10+ */
  background: -o-linear-gradient(top, #10b981 0%, #059669 100%);
  /* Opera 11.10+ */
  background: linear-gradient(to bottom, #10b981 0%, #059669 100%);
  /* W3C */
}

div.dt-container .dt-paging .dt-paging-button:hover {
  color: inherit !important;
  border: 1px solid #047857;
  background-color: rgba(0, 255, 21, 0.05) !important;
  background: -webkit-gradient(linear, left top, left bottom, color-stop(0%, rgba(230, 230, 230, 0.05)), color-stop(100%, rgba(0, 0, 0, 0.05)));
  /* Chrome,Safari4+ */
  background: -webkit-linear-gradient(top, rgba(230, 230, 230, 0.05) 0%, rgba(0, 0, 0, 0.05) 100%);
  /* Chrome10+,Safari5.1+ */
  background: -moz-linear-gradient(top, rgba(230, 230, 230, 0.05) 0%, rgba(0, 0, 0, 0.05) 100%);
  /* FF3.6+ */
  background: -ms-linear-gradient(top, rgba(230, 230, 230, 0.05) 0%, rgba(0, 0, 0, 0.05) 100%);
  /* IE10+ */
  background: -o-linear-gradient(top, rgba(230, 230, 230, 0.05) 0%, rgba(0, 0, 0, 0.05) 100%);
  /* Opera 11.10+ */
  background: linear-gradient(to bottom, rgba(230, 230, 230, 0.05) 0%, rgba(0, 0, 0, 0.05) 100%);
  /* W3C */
}

div.dt-container .dt-paging .dt-paging-button:active {
  outline: none;
  background-color: #059669;
  background: -webkit-gradient(linear, left top, left bottom, color-stop(0%, #059669), color-stop(100%, #166534));
  /* Chrome,Safari4+ */
  background: -webkit-linear-gradient(top, #059669 0%, #166534 100%);
  /* Chrome10+,Safari5.1+ */
  background: -moz-linear-gradient(top, #059669 0%, #166534 100%);
  /* FF3.6+ */
  background: -ms-linear-gradient(top, #059669 0%, #166534 100%);
  /* IE10+ */
  background: -o-linear-gradient(top, #059669 0%, #166534 100%);
  /* Opera 11.10+ */
  background: linear-gradient(to bottom, #059669 0%, #166534 100%);
  /* W3C */
  box-shadow: inset 0 0 3px #064e3b !important;
}

.dtfc-top-blocker {
  display: none !important;
}

table.dataTable tbody tr:hover > * {
  background-color: #e5e7eb !important; /* gray-300 de Tailwind */
}

table.dataTable tbody tr > td,
table.dataTable tbody tr > th {
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

table.dataTable tbody td {
  line-height: 1.3 !important; /* o prueba con 1.1 o incluso 1.0 */
}

/* Estilos específicos para la tabla de riesgos de trabajo */
:deep(.dataTables_wrapper) {
  padding: 1rem;
}

:deep(.dataTables_length) {
  margin-bottom: 1rem;
}

:deep(.dataTables_filter) {
  margin-bottom: 1rem;
}

:deep(.dataTables_info) {
  margin-top: 1rem;
}

:deep(.dataTables_paginate) {
  margin-top: 1rem;
}

:deep(.dataTables_scroll) {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

:deep(.dataTables_scrollHead) {
  background-color: #f9fafb;
}

:deep(.dataTables_scrollBody) {
  background-color: white;
}

:deep(table.dataTable tbody tr) {
  border-bottom: 1px solid #f3f4f6;
}

:deep(table.dataTable tbody tr:hover) {
  background-color: #f9fafb;
}

:deep(table.dataTable thead th) {
  background-color: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
  font-weight: 600;
  color: #374151;
}

:deep(table.dataTable tbody td) {
  padding: 0.75rem 1rem;
  vertical-align: middle;
}

/* Estilos para los badges de estado */
:deep(.badge-recaida) {
  @apply inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200 dark:border dark:border-purple-700;
}

:deep(.badge-secuelas) {
  @apply inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-200 dark:border dark:border-pink-700;
}

:deep(.badge-accidente-trabajo) {
  @apply inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 dark:border dark:border-red-700;
}

:deep(.badge-accidente-trayecto) {
  @apply inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200 dark:border dark:border-orange-700;
}

:deep(.badge-enfermedad-trabajo) {
  @apply inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-200 dark:border dark:border-pink-700;
}

:deep(.badge-imss) {
  @apply inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 dark:border dark:border-blue-700;
}

:deep(.badge-interno) {
  @apply inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200 dark:border dark:border-purple-700;
}

:deep(.badge-incapacidad-activa) {
  @apply inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 dark:border dark:border-red-700;
}

:deep(.badge-alta) {
  @apply inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200 dark:border dark:border-cyan-700;
}
</style>
