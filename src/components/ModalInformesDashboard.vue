<script setup lang="ts">
declare const pdfMake: typeof import('pdfmake/build/pdfmake');
import { computed, inject, reactive, ref, watch } from 'vue';
import * as xlsx from 'xlsx';
import InformesAPI from '@/api/InformesAPI';
import { informePersonalizacionService } from '@/api/informe-personalizacion.service';
import ModalDiscardConfirmDialog from '@/components/ModalDiscardConfirmDialog.vue';
import RecomendacionesTabla from '@/components/RecomendacionesTabla.vue';
import RichTextEditor from '@/components/RichTextEditor.vue';
import { useDirtySnapshot } from '@/composables/useDirtySnapshot';
import { useModalDirtyGuard } from '@/composables/useModalDirtyGuard';
import {
  definicionResumenEjecutivo,
  hojasDeExcel,
  nombreDeArchivo,
  type InformeDeTablero,
} from '@/helpers/dashboardInformes';
import { tituloDeTema, type TemaDeInforme } from '@/helpers/dashboardInformesTematicos';
import {
  GRUPOS_DE_INFORMES,
  INFORMES_DEL_TABLERO,
  definicionDe,
  estadoDeInforme,
  hallazgosComoBorrador,
  type DatosParaEstado,
  type IdDeInforme,
  type TipoConConclusiones,
} from '@/helpers/informesDelTablero';
import { cleanEmptyHtml, isHtmlContentEmpty } from '@/helpers/pdfHtmlParser';
import { sanitizeRichHtml } from '@/helpers/sanitizeRichHtml';
import type {
  InformePersonalizacion,
  RecomendacionItem,
  UpdateInformePersonalizacionDto,
} from '@/interfaces/informe-personalizacion.interface';
import { useUserStore } from '@/stores/user';

/**
 * Ventana «Informes» del tablero de salud: reúne todos los informes, dice cuáles
 * se pueden generar con lo que el tablero muestra y qué llevarán, y guarda las
 * conclusiones y recomendaciones de cada uno por separado.
 */
const props = defineProps<{
  abierto: boolean;
  empresaId: string;
  /** Centro que se está viendo; sin él, toda la empresa. */
  centroId?: string;
  centro: string;
  periodo: string;
  /** Filtros de población aplicados, en texto; vacío si es toda la plantilla. */
  segmento: string;
  totalTrabajadores: number;
  /** Secciones del tablero que tienen registros. */
  secciones: Record<string, boolean>;
  /** Se arman al pedirlos, con lo que el tablero muestra en ese momento. */
  armar: () => InformeDeTablero;
  armarTema: (tema: TemaDeInforme) => InformeDeTablero;
  /** El informe completo lo genera el tablero, que es quien tiene las gráficas. */
  generarCompleto: (modo: 'ver' | 'descargar') => void;
}>();

const emit = defineEmits<{
  (e: 'cerrar'): void;
  (e: 'guardada', tipo: TipoConConclusiones, personalizacion: InformePersonalizacion): void;
}>();

const toast = inject<any>('toast', null);
const userStore = useUserStore();

const TIPOS: TipoConConclusiones[] = ['completo', 'resumen', 'cardiometabolico', 'auditivo', 'musculoesqueletico'];
const TEMAS: TemaDeInforme[] = ['cardiometabolico', 'auditivo', 'musculoesqueletico'];

// ---- Qué se puede generar

const datos = computed<DatosParaEstado>(() => ({
  totalTrabajadores: props.totalTrabajadores,
  secciones: props.secciones,
  general: props.armar(),
  tematicos: {
    cardiometabolico: props.armarTema('cardiometabolico'),
    auditivo: props.armarTema('auditivo'),
    musculoesqueletico: props.armarTema('musculoesqueletico'),
  },
}));

const estados = computed(
  () =>
    Object.fromEntries(INFORMES_DEL_TABLERO.map((informe) => [informe.id, estadoDeInforme(informe.id, datos.value)])) as Record<
      IdDeInforme,
      ReturnType<typeof estadoDeInforme>
    >,
);

const elegido = ref<IdDeInforme>('completo');
const definicion = computed(() => definicionDe(elegido.value));
const estado = computed(() => estados.value[elegido.value]);
const informesDe = (grupo: string) => INFORMES_DEL_TABLERO.filter((informe) => informe.grupo === grupo);
const esTema = (id: IdDeInforme): id is TemaDeInforme => (TEMAS as string[]).includes(id);

// ---- Conclusiones y recomendaciones de cada informe

const personalizaciones = reactive<Record<TipoConConclusiones, InformePersonalizacion | null>>({
  completo: null,
  resumen: null,
  cardiometabolico: null,
  auditivo: null,
  musculoesqueletico: null,
});
const cargando = ref(false);
const errorDeCarga = ref(false);

const cargar = async () => {
  cargando.value = true;
  errorDeCarga.value = false;
  try {
    const respuestas = await Promise.all(
      TIPOS.map((tipo) =>
        props.centroId
          ? informePersonalizacionService.findByEmpresaAndCentro(props.empresaId, props.centroId, tipo)
          : informePersonalizacionService.findByEmpresaOnly(props.empresaId, tipo),
      ),
    );
    TIPOS.forEach((tipo, i) => (personalizaciones[tipo] = respuestas[i] || null));
  } catch (error) {
    console.error('Error al cargar las conclusiones de los informes:', error);
    errorDeCarga.value = true;
  } finally {
    cargando.value = false;
  }
};

const filasLimpias = (filas: RecomendacionItem[] | undefined | null) =>
  (filas ?? [])
    .map((fila) => ({ hallazgo: (fila.hallazgo ?? '').trim(), medidaPreventiva: (fila.medidaPreventiva ?? '').trim() }))
    .filter((fila) => fila.hallazgo || fila.medidaPreventiva);

/** Recomendaciones en tabla: el único formato que la ventana captura. */
const filasDe = (p: InformePersonalizacion | null) =>
  p?.formatoRecomendaciones === 'tabla' ? filasLimpias(p.recomendacionesTabla) : [];

/** Recomendaciones en texto libre de antes; solo las imprime el informe completo. */
const textoAnteriorDe = (p: InformePersonalizacion | null) =>
  p && p.formatoRecomendaciones !== 'tabla' && !isHtmlContentEmpty(p.recomendacionesTexto ?? '')
    ? (p.recomendacionesTexto ?? '')
    : '';

const tieneConclusiones = (p: InformePersonalizacion | null) => !isHtmlContentEmpty(p?.conclusiones ?? '');
const tieneAlgo = (p: InformePersonalizacion | null) =>
  tieneConclusiones(p) || filasDe(p).length > 0 || !!textoAnteriorDe(p);

const tipoElegido = computed(() => (definicion.value.llevaConclusiones ? (elegido.value as TipoConConclusiones) : null));
const actual = computed(() => (tipoElegido.value ? personalizaciones[tipoElegido.value] : null));

const fechaCorta = (fecha?: string) =>
  fecha ? new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const resumenDeCaptura = computed(() => {
  const p = actual.value;
  if (!tieneAlgo(p)) return '';
  const filas = filasDe(p).length;
  const partes = [
    tieneConclusiones(p) ? 'Conclusiones capturadas' : 'Sin conclusiones',
    filas ? `${filas} ${filas === 1 ? 'recomendación' : 'recomendaciones'}` : 'sin recomendaciones en tabla',
  ];
  const fecha = fechaCorta(p?.updatedAt);
  return partes.join(' · ') + (fecha ? ` · actualizadas el ${fecha}` : '');
});

const alcance = computed(() => (props.centroId ? `el centro ${props.centro}` : 'toda la empresa'));

const hallazgosDelElegido = computed(() =>
  esTema(elegido.value) ? datos.value.tematicos[elegido.value].hallazgos : datos.value.general.hallazgos,
);
const puedeCopiarDelCompleto = computed(
  () =>
    !!tipoElegido.value &&
    tipoElegido.value !== 'completo' &&
    (tieneConclusiones(personalizaciones.completo) || filasDe(personalizaciones.completo).length > 0),
);

// ---- Editor

const editando = ref(false);
const guardando = ref(false);
/** Vuelve a montar el editor y la tabla con el contenido de cada apertura. */
const montaje = ref(0);
const form = reactive({ conclusiones: '', tabla: [] as RecomendacionItem[] });

const { isDirty, markClean } = useDirtySnapshot(() => ({
  conclusiones: cleanEmptyHtml(form.conclusiones),
  tabla: filasLimpias(form.tabla),
}));

const abrirEditor = (borrador?: { conclusiones?: string; tabla?: RecomendacionItem[] }) => {
  form.conclusiones = sanitizeRichHtml(actual.value?.conclusiones ?? '');
  form.tabla = filasDe(actual.value);
  markClean();
  // El borrador cuenta como cambio sin guardar
  if (borrador?.conclusiones !== undefined) form.conclusiones = borrador.conclusiones;
  if (borrador?.tabla !== undefined) form.tabla = borrador.tabla.map((fila) => ({ ...fila }));
  montaje.value++;
  editando.value = true;
};

const partirDeLosHallazgos = () => abrirEditor({ conclusiones: hallazgosComoBorrador(hallazgosDelElegido.value) });
const copiarDelCompleto = () =>
  abrirEditor({
    conclusiones: sanitizeRichHtml(personalizaciones.completo?.conclusiones ?? ''),
    tabla: filasDe(personalizaciones.completo),
  });

const salirDelEditor = () => {
  editando.value = false;
};
const cerrarTodo = () => {
  editando.value = false;
  emit('cerrar');
};

const { showDiscardConfirm, dismissPulse, requestDismiss, continueEditing, confirmDiscard } = useModalDirtyGuard({
  isDirty: computed(() => editando.value && isDirty.value),
  // Esc: del editor se vuelve a la lista; de la lista se cierra
  onClose: () => (editando.value ? salirDelEditor() : cerrarTodo()),
  escapeActive: () => props.abierto,
});

const guardar = async () => {
  const tipo = tipoElegido.value;
  const userId = userStore.user?._id;
  if (!tipo || !userId || guardando.value) return;
  guardando.value = true;
  try {
    const filas = filasLimpias(form.tabla);
    const dto: UpdateInformePersonalizacionDto = {
      conclusiones: cleanEmptyHtml(sanitizeRichHtml(form.conclusiones)),
      updatedBy: userId,
      // Sin filas y con texto anterior, ese texto se conserva tal como está
      ...(filas.length || !textoAnteriorDe(actual.value)
        ? { formatoRecomendaciones: 'tabla' as const, recomendacionesTabla: filas }
        : {}),
    };
    const guardada = props.centroId
      ? await informePersonalizacionService.upsertByEmpresaAndCentro(props.empresaId, props.centroId, dto, tipo)
      : await informePersonalizacionService.upsertByEmpresa(props.empresaId, dto, tipo);
    personalizaciones[tipo] = guardada;
    emit('guardada', tipo, guardada);
    toast?.open?.({ message: 'Conclusiones y recomendaciones guardadas.', type: 'success' });
    salirDelEditor();
  } catch (error) {
    console.error('Error al guardar las conclusiones:', error);
    toast?.open?.({ message: 'No se pudieron guardar las conclusiones y recomendaciones.', type: 'error' });
  } finally {
    guardando.value = false;
  }
};

// ---- Generar

const generando = ref<'' | 'ver' | 'descargar'>('');
const hoy = () => new Date().toISOString().slice(0, 10);

/** Queda en la bitácora igual que el informe completo. */
const registrar = (informe: InformeDeTablero, modo: 'view' | 'download') =>
  InformesAPI.registrarExportacionDashboard({
    empresaId: props.empresaId,
    periodo: informe.periodo,
    centroTrabajo: informe.centro || 'Todos',
    totalTrabajadores: props.totalTrabajadores,
    modo,
  }).catch(() => {});

/** El informe con las conclusiones y recomendaciones guardadas para ese tipo. */
const conLoGuardado = (informe: InformeDeTablero, tipo: TipoConConclusiones): InformeDeTablero => ({
  ...informe,
  conclusiones: personalizaciones[tipo]?.conclusiones ?? '',
  recomendaciones: '',
  recomendacionesTabla: filasDe(personalizaciones[tipo]),
});

const descargarExcel = (informe: InformeDeTablero) => {
  const libro = xlsx.utils.book_new();
  for (const hoja of hojasDeExcel(informe)) {
    const datosDeHoja = xlsx.utils.aoa_to_sheet(hoja.filas);
    const columnas = Math.max(1, ...hoja.filas.map((fila) => fila.length));
    datosDeHoja['!cols'] = Array.from({ length: columnas }, (_, i) => ({
      wch: Math.min(60, Math.max(10, ...hoja.filas.map((fila) => String(fila[i] ?? '').length + 2))),
    }));
    // Excel no acepta nombres de hoja de más de 31 caracteres
    xlsx.utils.book_append_sheet(libro, datosDeHoja, hoja.nombre.slice(0, 31));
  }
  xlsx.writeFile(libro, nombreDeArchivo('EstadisticasDeSalud', informe, hoy(), 'xlsx'));
};

const generar = async (modo: 'ver' | 'descargar') => {
  const id = elegido.value;
  if (generando.value || !estado.value.disponible) return;
  if (id === 'completo') {
    props.generarCompleto(modo);
    return;
  }
  generando.value = modo;
  try {
    if (id === 'excel') {
      const informe = props.armar();
      await registrar(informe, 'download');
      descargarExcel(informe);
      return;
    }
    const tema = esTema(id) ? id : null;
    const informe = conLoGuardado(tema ? props.armarTema(tema) : props.armar(), id);
    const pdf = pdfMake.createPdf(
      definicionResumenEjecutivo(informe, tema ? { titulo: tituloDeTema(tema), todasLasTablas: true } : {}) as any,
    );
    if (modo === 'ver') {
      // Se abre antes de esperar al servidor para que el navegador no bloquee la pestaña
      pdf.open();
      await registrar(informe, 'view');
    } else {
      await registrar(informe, 'download');
      pdf.download(
        nombreDeArchivo(tema ? tituloDeTema(tema).replace(/\s+/g, '') : 'ResumenParaDireccion', informe, hoy(), 'pdf'),
      );
    }
  } catch (error) {
    console.error('Error al generar el informe:', error);
    toast?.open?.({ message: `No se pudo generar «${definicion.value.nombre}».`, type: 'error' });
  } finally {
    generando.value = '';
  }
};

// ---- Abrir y cerrar

watch(
  () => props.abierto,
  (abierto) => {
    if (!abierto) return;
    editando.value = false;
    elegido.value = INFORMES_DEL_TABLERO.find((informe) => estados.value[informe.id].disponible)?.id ?? 'completo';
    cargar();
  },
  { immediate: true },
);

/**
 * El fondo solo cierra si el clic empezó y terminó en él: arrastrar desde
 * dentro del panel (al seleccionar texto, por ejemplo) y soltar fuera no cierra.
 */
let presionadoEnElFondo = false;
const alPresionar = (evento: MouseEvent) => {
  presionadoEnElFondo = evento.target === evento.currentTarget;
};
const alHacerClic = (evento: MouseEvent) => {
  const cerrar = presionadoEnElFondo && evento.target === evento.currentTarget;
  presionadoEnElFondo = false;
  if (cerrar) requestDismiss(cerrarTodo);
};
</script>

<template>
  <div
    v-if="abierto"
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
    :class="{ 'modal-backdrop-pulse': dismissPulse }"
    role="dialog"
    aria-modal="true"
    aria-label="Informes"
    data-test="informes-fondo"
    @mousedown="alPresionar"
    @click="alHacerClic"
  >
    <div
      class="flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-5xl sm:rounded-2xl"
      :class="{ 'modal-dismiss-pulse': dismissPulse }"
      data-test="informes-panel"
    >
      <header class="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
        <div class="min-w-0">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ editando ? 'Conclusiones y recomendaciones' : 'Informes' }}
          </h2>
          <p class="mt-0.5 text-sm text-gray-600">
            <template v-if="editando">
              De «{{ definicion.nombre }}», para {{ alcance }}. Los demás informes tienen las suyas.
            </template>
            <template v-else>Elige un informe para ver qué incluye y generarlo.</template>
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Cerrar"
          @click="requestDismiss(cerrarTodo)"
        >
          <i class="fas fa-times"></i>
        </button>
      </header>

      <!-- Con qué datos se arman -->
      <div
        v-if="!editando"
        class="informes-contexto border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs text-gray-600"
        data-test="informes-contexto"
      >
        <div class="flex flex-wrap gap-x-5 gap-y-1">
          <span><span class="font-semibold text-gray-700">Centro:</span> {{ centro }}</span>
          <span><span class="font-semibold text-gray-700">Periodo:</span> {{ periodo }}</span>
          <span>
            <span class="font-semibold text-gray-700">Trabajadores:</span>
            {{ totalTrabajadores }} · {{ segmento || 'toda la plantilla' }}
          </span>
        </div>
        <p class="mt-1 text-gray-500">
          Los informes salen con lo que el tablero muestra ahora. Para cambiarlo, cierra esta ventana y ajusta el
          centro, el periodo o los filtros.
        </p>
      </div>

      <!-- Lista y detalle -->
      <div v-if="!editando" class="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        <nav class="shrink-0 border-b border-gray-200 p-3 md:w-80 md:overflow-y-auto md:border-b-0 md:border-r">
          <div v-for="grupo in GRUPOS_DE_INFORMES" :key="grupo" class="mb-3 last:mb-0">
            <div class="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{{ grupo }}</div>
            <button
              v-for="informe in informesDe(grupo)"
              :key="informe.id"
              type="button"
              class="informes-opcion mb-1 flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition"
              :class="
                elegido === informe.id
                  ? 'informes-opcion--elegida border-emerald-500 bg-emerald-50'
                  : 'border-transparent hover:bg-gray-100'
              "
              :aria-pressed="elegido === informe.id"
              :data-test="`informe-${informe.id}`"
              @click="elegido = informe.id"
            >
              <i
                class="mt-0.5 w-4 text-center"
                :class="[
                  informe.formato === 'Excel' ? 'fas fa-file-excel' : 'fas fa-file-pdf',
                  estados[informe.id].disponible ? 'text-emerald-600' : 'text-gray-400',
                ]"
              ></i>
              <span class="min-w-0 flex-1">
                <span
                  class="block text-sm font-medium"
                  :class="estados[informe.id].disponible ? 'text-gray-900' : 'text-gray-500'"
                >
                  {{ informe.nombre }}
                </span>
                <span class="block text-xs text-gray-500">
                  {{ estados[informe.id].disponible ? informe.paraQue : 'Sin datos para generarlo' }}
                </span>
              </span>
            </button>
          </div>
        </nav>

        <section class="min-w-0 flex-1 p-5 md:overflow-y-auto" data-test="informe-detalle">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-base font-semibold text-gray-900">{{ definicion.nombre }}</h3>
            <span class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
              {{ definicion.formato }}
            </span>
          </div>
          <p class="mt-1 text-sm text-gray-600">{{ definicion.descripcion }}</p>

          <div
            v-if="!estado.disponible"
            class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            data-test="informe-motivo"
          >
            <i class="fas fa-circle-info mr-1"></i>
            No se puede generar: {{ estado.motivo.charAt(0).toLowerCase() + estado.motivo.slice(1) }}.
          </div>

          <h4 class="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Qué incluye con estos datos</h4>
          <ul class="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <li
              v-for="parte in estado.incluye"
              :key="parte.texto"
              class="flex items-start gap-2 text-sm"
              :class="parte.incluido ? 'text-gray-800' : 'text-gray-400'"
            >
              <i class="mt-1 w-3 text-xs" :class="parte.incluido ? 'fas fa-check text-emerald-600' : 'fas fa-minus'"></i>
              <span>
                {{ parte.texto }}
                <span v-if="!parte.incluido" class="text-xs">(sin registros, no sale)</span>
              </span>
            </li>
          </ul>

          <!-- Conclusiones y recomendaciones propias de este informe -->
          <div
            v-if="definicion.llevaConclusiones"
            class="mt-5 rounded-lg border border-gray-200 p-4"
            data-test="informe-conclusiones"
          >
            <h4 class="text-sm font-semibold text-gray-900">Conclusiones y recomendaciones</h4>
            <p class="mt-0.5 text-xs text-gray-500">
              Son de este informe y de {{ alcance }}: lo que escribas aquí no aparece en los otros informes.
            </p>

            <p v-if="cargando" class="mt-3 text-sm text-gray-500">
              <i class="fas fa-spinner fa-spin mr-1"></i> Cargando…
            </p>
            <p v-else-if="errorDeCarga" class="mt-3 text-sm text-red-600">
              No se pudieron cargar.
              <button type="button" class="underline" @click="cargar">Reintentar</button>
            </p>
            <template v-else>
              <p class="mt-3 text-sm" :class="resumenDeCaptura ? 'text-gray-800' : 'text-gray-500'">
                <i
                  class="mr-1"
                  :class="resumenDeCaptura ? 'fas fa-circle-check text-emerald-600' : 'far fa-circle text-gray-400'"
                ></i>
                {{ resumenDeCaptura || 'Sin capturar: el informe saldrá sin esta sección.' }}
              </p>
              <p v-if="textoAnteriorDe(actual)" class="mt-1 text-xs text-gray-500">
                Tiene recomendaciones en texto libre de una versión anterior; se siguen imprimiendo hasta que guardes
                recomendaciones en tabla.
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white shadow-sm transition hover:bg-blue-700"
                  data-test="informe-editar"
                  @click="abrirEditor()"
                >
                  <i class="fas fa-edit mr-1"></i>
                  {{ resumenDeCaptura ? 'Editar' : 'Escribir' }}
                </button>
                <button
                  v-if="!tieneConclusiones(actual) && hallazgosDelElegido.length"
                  type="button"
                  class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-100"
                  title="Abre el editor con los hallazgos de este informe como borrador de las conclusiones"
                  data-test="informe-borrador"
                  @click="partirDeLosHallazgos"
                >
                  Partir de los hallazgos
                </button>
                <button
                  v-if="puedeCopiarDelCompleto"
                  type="button"
                  class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-100"
                  title="Abre el editor con las conclusiones y recomendaciones del informe completo, para ajustarlas"
                  data-test="informe-copiar"
                  @click="copiarDelCompleto"
                >
                  Copiar del informe completo
                </button>
              </div>
            </template>
          </div>
        </section>
      </div>

      <!-- Editor de conclusiones y recomendaciones -->
      <div v-else class="min-h-0 flex-1 space-y-6 overflow-y-auto p-5" data-test="informe-editor">
        <div>
          <label class="block text-sm font-medium text-gray-700">Conclusiones</label>
          <p class="mb-2 text-xs text-gray-500">Lo que quieres que el lector se lleve de este informe.</p>
          <RichTextEditor
            :key="`conclusiones-${montaje}`"
            v-model="form.conclusiones"
            placeholder="Escribe las conclusiones de este informe..."
            height="220px"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Recomendaciones</label>
          <p class="mb-2 text-xs text-gray-500">Una fila por hallazgo, con la medida preventiva que propones.</p>
          <div
            v-if="textoAnteriorDe(actual)"
            class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
          >
            Este informe tiene recomendaciones en texto libre de una versión anterior. Al guardar al menos una fila en la
            tabla, la tabla las sustituye.
            <div class="informes-texto-anterior mt-2 rounded bg-white/70 p-2 text-gray-700" v-html="sanitizeRichHtml(textoAnteriorDe(actual))"></div>
          </div>
          <RecomendacionesTabla :key="`tabla-${montaje}`" v-model="form.tabla" />
        </div>
      </div>

      <footer class="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3">
        <template v-if="editando">
          <button
            type="button"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
            @click="requestDismiss(salirDelEditor)"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white shadow transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="guardando"
            data-test="informe-guardar"
            @click="guardar"
          >
            <i :class="guardando ? 'fas fa-spinner fa-spin' : 'fas fa-save'"></i>
            {{ guardando ? 'Guardando…' : 'Guardar' }}
          </button>
        </template>
        <template v-else>
          <button
            v-if="definicion.formato === 'PDF'"
            type="button"
            class="flex items-center gap-2 rounded-lg border border-emerald-600 bg-white px-4 py-2 text-sm text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!estado.disponible || !!generando"
            title="Abre el PDF en otra pestaña"
            data-test="informe-ver"
            @click="generar('ver')"
          >
            <i :class="generando === 'ver' ? 'fas fa-spinner fa-spin' : 'fas fa-eye'"></i>
            Vista previa
          </button>
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white shadow transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!estado.disponible || !!generando"
            data-test="informe-descargar"
            @click="generar('descargar')"
          >
            <i :class="generando === 'descargar' ? 'fas fa-spinner fa-spin' : 'fas fa-download'"></i>
            {{
              elegido === 'completo'
                ? 'Descargar en alta calidad'
                : definicion.formato === 'Excel'
                  ? 'Descargar Excel'
                  : 'Descargar PDF'
            }}
          </button>
        </template>
      </footer>
    </div>

    <ModalDiscardConfirmDialog :open="showDiscardConfirm" @continue-editing="continueEditing" @discard="confirmDiscard" />
  </div>
</template>
