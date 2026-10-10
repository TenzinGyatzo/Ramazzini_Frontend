<script setup lang="ts">
declare const pdfMake: typeof import('pdfmake/build/pdfmake');
import { inject, ref } from 'vue';
import * as xlsx from 'xlsx';
import InformesAPI from '@/api/InformesAPI';
import {
  definicionResumenEjecutivo,
  hojasDeExcel,
  nombreDeArchivo,
  type InformeDeTablero,
} from '@/helpers/dashboardInformes';

/**
 * Informes del tablero de salud además del informe completo: un resumen
 * ejecutivo en PDF y las tablas en Excel. Se arman con los datos, no con las
 * gráficas de la pantalla.
 */
const props = defineProps<{
  empresaId: string;
  totalTrabajadores: number;
  /** Se arma al pedir el informe, con lo que el tablero muestra en ese momento. */
  armar: () => InformeDeTablero;
}>();

const toast = inject<any>('toast', null);
const generando = ref<'' | 'resumen' | 'excel'>('');
const hoy = () => new Date().toISOString().slice(0, 10);

/** Queda en la bitácora igual que el informe completo. */
const registrar = (informe: InformeDeTablero) =>
  InformesAPI.registrarExportacionDashboard({
    empresaId: props.empresaId,
    periodo: informe.periodo,
    centroTrabajo: informe.centro || 'Todos',
    totalTrabajadores: props.totalTrabajadores,
    modo: 'download',
  }).catch(() => {});

const resumenEjecutivo = async () => {
  if (generando.value) return;
  generando.value = 'resumen';
  try {
    const informe = props.armar();
    await registrar(informe);
    pdfMake
      .createPdf(definicionResumenEjecutivo(informe) as any)
      .download(nombreDeArchivo('ResumenEjecutivo', informe, hoy(), 'pdf'));
  } catch (error) {
    console.error('Error al generar el resumen ejecutivo:', error);
    toast?.open?.({ message: 'No se pudo generar el resumen ejecutivo.', type: 'error' });
  } finally {
    generando.value = '';
  }
};

const datosEnExcel = async () => {
  if (generando.value) return;
  generando.value = 'excel';
  try {
    const informe = props.armar();
    await registrar(informe);
    const libro = xlsx.utils.book_new();
    for (const hoja of hojasDeExcel(informe)) {
      const datos = xlsx.utils.aoa_to_sheet(hoja.filas);
      const columnas = Math.max(1, ...hoja.filas.map((fila) => fila.length));
      datos['!cols'] = Array.from({ length: columnas }, (_, i) => ({
        wch: Math.min(60, Math.max(10, ...hoja.filas.map((fila) => String(fila[i] ?? '').length + 2))),
      }));
      // Excel no acepta nombres de hoja de más de 31 caracteres
      xlsx.utils.book_append_sheet(libro, datos, hoja.nombre.slice(0, 31));
    }
    xlsx.writeFile(libro, nombreDeArchivo('EstadisticasDeSalud', informe, hoy(), 'xlsx'));
  } catch (error) {
    console.error('Error al generar el Excel:', error);
    toast?.open?.({ message: 'No se pudo generar el archivo de Excel.', type: 'error' });
  } finally {
    generando.value = '';
  }
};

const boton =
  'gap-2 px-4 py-2 rounded-lg shadow transition duration-300 flex items-center justify-center w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-60';
</script>

<template>
  <div class="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4">
    <button
      type="button"
      :class="[boton, 'bg-emerald-700 hover:bg-emerald-800 text-white']"
      :disabled="!!generando"
      title="Una o dos páginas: cifras clave, hallazgos, tablas principales, conclusiones y recomendaciones"
      data-test="resumen-ejecutivo"
      @click="resumenEjecutivo"
    >
      <i :class="generando === 'resumen' ? 'fas fa-spinner fa-spin' : 'fas fa-file-lines'" class="mr-1"></i>
      Resumen ejecutivo
    </button>
    <button
      type="button"
      :class="[boton, 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-600']"
      :disabled="!!generando"
      title="Todas las tablas del tablero, una hoja por sección"
      data-test="datos-excel"
      @click="datosEnExcel"
    >
      <i :class="generando === 'excel' ? 'fas fa-spinner fa-spin' : 'fas fa-file-excel'" class="mr-1"></i>
      Datos en Excel
    </button>
  </div>
</template>
