<script setup lang="ts">
import { ref, shallowRef, watch, computed, inject, nextTick, useSlots, getCurrentInstance, onBeforeUnmount } from 'vue';
import type { Router } from 'vue-router';
import type { DocumentsByYear } from '@/stores/documentos';
import DocumentoItem from './DocumentoItem.vue';
import { convertirFechaISOaDDMMYYYY } from '@/helpers/dates';
import type { PropType } from 'vue';
import { obtenerRutaDocumento, obtenerNombreArchivo, obtenerFechaDocumento } from '@/helpers/rutas';
import { usePermissionRestrictions } from '@/composables/usePermissionRestrictions';
import { useDocumentosStore } from '@/stores/documentos';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import {
    anioTieneOrdenManual,
    documentosDe,
    estructuraDelAnio,
    type DocumentoDelExpediente,
    type ElementoDelAnio,
    type SubgrupoDelAnio,
} from '@/helpers/documentosExpediente';
import {
    MAX_LONGITUD_NOMBRE_SUBGRUPO,
    NOMBRE_SUBGRUPO_POR_DEFECTO,
    copiarEstructura,
    copiarParaOrganizar,
    crearSubgrupo,
    huellaDe,
    organizacionDe,
} from '@/helpers/organizarExpediente';
import OrganizadorDocumentos from './organizador/OrganizadorDocumentos.vue';
import ModalDiscardConfirmDialog from './ModalDiscardConfirmDialog.vue';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { extractApiErrorMessage } from '@/helpers/apiErrors';
import { documentoResaltado } from '@/helpers/retornoExpediente';

const documentosStore = useDocumentosStore();
const proveedorSaludStore = useProveedorSaludStore();
const trabajadoresStore = useTrabajadoresStore();
const toast = inject<{ open: (o: { message: string; type?: string }) => void } | undefined>('toast', undefined);

const documentImmutabilityEnabled = computed(() => proveedorSaludStore.documentImmutabilityEnabled);
const controlPrenatalEnabled = computed(() => proveedorSaludStore.controlPrenatalEnabled);

const isDocumentoInmutable = (doc: { estado?: string }) => {
    if (!documentImmutabilityEnabled.value) return false;
    const estado = doc?.estado?.toLowerCase();
    return estado === 'finalizado' || estado === 'anulado';
};

const props = defineProps({
    documents: {
        type: Object as PropType<DocumentsByYear[string]>,
        required: true,
    },
    year: {
        type: String as PropType<string>,
        required: true,
    },
    trabajador: {
        type: Object as PropType<{
            primerApellido?: string;
            segundoApellido?: string;
            nombre?: string;
        }>,
        required: true,
    },
    toggleRouteSelection: {
        type: Function as PropType<(
            doc: { documentId: string; documentType: string; filePath: string; formatoFirmado?: boolean },
            isSelected: boolean,
        ) => void>,
        required: true,
    },
    selectedRoutes: {
        type: Array as PropType<string[]>,
        required: true,
    },
    selectedDocuments: {
        type: Array as PropType<
            Array<{ documentId: string; documentType: string; filePath: string; formatoFirmado?: boolean }>
        >,
        required: true,
    },
    // Nuevas props para el modo eliminación
    isDeletionMode: {
        type: Boolean,
        default: false,
    },
    toggleDeletionMode: {
        type: Function as PropType<() => void>,
        required: true,
    },
    onDeleteSelected: {
        type: Function as PropType<() => void>,
        required: true,
    },
    /** Filtro por tipo del expediente; vacío = todos. No aplica mientras se organiza el año. */
    tiposVisibles: {
        type: Array as PropType<string[]>,
        default: () => [],
    },
    /** Por id: 'eliminando' mientras se borra en el modo eliminación, 'error' si no se pudo. */
    estadoEliminacion: {
        type: Object as PropType<Record<string, 'eliminando' | 'error'>>,
        default: () => ({}),
    },
});

const emit = defineEmits(['abrirModalUpdate', 'eliminarDocumento', 'abrirModalAnular', 'openSubscriptionModal', 'abrirModalFinalizar']);

// Composables de permisos
const {
  canManageAnyDocumentType,
  canManageAllDocumentTypes,
  canAnularEliminarDocumentos,
} = usePermissionRestrictions();

// Modo eliminación masiva: exige poder gestionar todos los tipos de documento y poder eliminar
const canDeleteAnyDocument = computed(
  () => canManageAllDocumentTypes.value && canAnularEliminarDocumentos.value,
);

// Orden por defecto del proveedor y, encima, lo que alguien acomodó a mano en el año (orden y subgrupos)
const opcionesDeOrden = computed(() => ({ controlPrenatalEnabled: controlPrenatalEnabled.value }));
const opcionesConOrganizacion = computed(() => ({
    ...opcionesDeOrden.value,
    ordenManual: documentosStore.organizacionPorAnio[props.year]?.orden,
    subgrupos: documentosStore.organizacionPorAnio[props.year]?.subgrupos,
}));
const elementosPorDefecto = computed(() =>
    estructuraDelAnio(props.documents, proveedorSaludStore.ordenTiposDocumento, opcionesDeOrden.value),
);
const elementosGuardados = computed(() =>
    estructuraDelAnio(props.documents, proveedorSaludStore.ordenTiposDocumento, opcionesConOrganizacion.value),
);
const ordenPersonalizado = computed(() =>
    anioTieneOrdenManual(props.documents, proveedorSaludStore.ordenTiposDocumento, opcionesConOrganizacion.value),
);

// Modo organizar: se acomoda una copia y solo al guardar se vuelve la organización del año
const borradorDeOrden = shallowRef<ElementoDelAnio[] | null>(null);
const organizando = computed(() => borradorDeOrden.value !== null);
const guardandoOrden = ref(false);

const elementosEnPantalla = computed(() => borradorDeOrden.value ?? elementosGuardados.value);
const documentosEnOrden = computed(() => documentosDe(elementosEnPantalla.value));

// Filtro por tipo (desde el expediente). Organizar siempre trabaja con el año completo.
const filtrado = computed(() => props.tiposVisibles.length > 0 && !organizando.value);
const esVisible = (item: DocumentoDelExpediente) =>
    !filtrado.value || props.tiposVisibles.includes(item.definicion.tipo);
// Lo que se ve: con el filtro, seleccionar, combinar y eliminar toman solo estos documentos
const documentosVisibles = computed(() => documentosEnOrden.value.filter(esVisible));
const subgruposEnPantalla = computed(() =>
    elementosEnPantalla.value.filter((elemento): elemento is SubgrupoDelAnio => elemento.clase === 'subgrupo'),
);

// Subgrupos plegados: preferencia de quien mira, no se guarda; siempre abren desplegados
const plegados = ref<Set<string>>(new Set());
function alternarPlegado(id: string) {
    const siguiente = new Set(plegados.value);
    if (siguiente.has(id)) siguiente.delete(id);
    else siguiente.add(id);
    plegados.value = siguiente;
}

interface FilaEncabezado {
    clase: 'encabezado';
    clave: string;
    subgrupo: SubgrupoDelAnio;
    plegado: boolean;
}
interface FilaDocumento {
    clase: 'documento';
    clave: string;
    item: DocumentoDelExpediente;
    subgrupo: SubgrupoDelAnio | null;
}

// El año fuera del modo organizar, fila por fila: cada subgrupo es un encabezado seguido de sus documentos
const filas = computed(() => {
    const resultado: Array<FilaEncabezado | FilaDocumento> = [];
    const filaDe = (item: DocumentoDelExpediente, subgrupo: SubgrupoDelAnio | null): FilaDocumento => ({
        clase: 'documento',
        clave: `${item.definicion.tipo}-${item.documento._id ?? resultado.length}`,
        item,
        subgrupo,
    });
    elementosGuardados.value.forEach((elemento) => {
        if (elemento.clase === 'documento') {
            if (esVisible(elemento.item)) resultado.push(filaDe(elemento.item, null));
            return;
        }
        // Con el filtro, el subgrupo aparece solo con sus documentos visibles (y si tiene alguno)
        const subgrupo = filtrado.value
            ? { ...elemento, documentos: elemento.documentos.filter(esVisible) }
            : elemento;
        if (filtrado.value && subgrupo.documentos.length === 0) return;
        const plegado = plegados.value.has(elemento.id);
        resultado.push({ clase: 'encabezado', clave: `subgrupo-${elemento.id}`, subgrupo, plegado });
        if (!plegado) subgrupo.documentos.forEach((item) => resultado.push(filaDe(item, subgrupo)));
    });
    return resultado;
});

// Reordenar es presentación: basta con poder gestionar algún tipo de documento
const puedeOrganizar = computed(() => canManageAnyDocumentType.value);

const hayCambiosDeOrden = computed(() =>
    !!borradorDeOrden.value && huellaDe(borradorDeOrden.value) !== huellaDe(elementosGuardados.value),
);
const borradorEsElPorDefecto = computed(() =>
    !!borradorDeOrden.value && huellaDe(borradorDeOrden.value) === huellaDe(elementosPorDefecto.value),
);

function iniciarOrganizacion() {
    borradorDeOrden.value = copiarParaOrganizar(elementosGuardados.value);
}

// Antes de perder lo acomodado sin guardar (cancelar, salir del expediente) se pregunta
const preguntaDeDescarte = shallowRef<{ responder: (descartar: boolean) => void } | null>(null);

function confirmarDescarte(): Promise<boolean> {
    if (!hayCambiosDeOrden.value) return Promise.resolve(true);
    preguntaDeDescarte.value?.responder(false);
    return new Promise((resolve) => {
        preguntaDeDescarte.value = { responder: resolve };
    });
}

function responderDescarte(descartar: boolean) {
    const pregunta = preguntaDeDescarte.value;
    preguntaDeDescarte.value = null;
    pregunta?.responder(descartar);
}

async function cancelarOrganizacion() {
    if (guardandoOrden.value) return;
    if (!(await confirmarDescarte())) return;
    borradorDeOrden.value = null;
}

// Mientras haya cambios sin guardar: aviso al cambiar de pantalla y al cerrar o recargar la pestaña.
// El enrutador se toma de la aplicación para que el componente también funcione sin él.
const router = getCurrentInstance()?.appContext.config.globalProperties.$router as Router | undefined;
let quitarGuardiaDeRuta: (() => void) | null = null;
const alCerrarLaPestana = (evento: BeforeUnloadEvent) => {
    evento.preventDefault();
    evento.returnValue = '';
};

function dejarDeVigilarLaSalida() {
    quitarGuardiaDeRuta?.();
    quitarGuardiaDeRuta = null;
    window.removeEventListener('beforeunload', alCerrarLaPestana);
}

watch(hayCambiosDeOrden, (hayCambios) => {
    dejarDeVigilarLaSalida();
    if (!hayCambios) return;
    window.addEventListener('beforeunload', alCerrarLaPestana);
    quitarGuardiaDeRuta = router?.beforeEach(() => confirmarDescarte()) ?? null;
});

onBeforeUnmount(() => {
    dejarDeVigilarLaSalida();
    responderDescarte(false);
});

const raizDelGrupo = ref<HTMLElement | null>(null);
let consecutivoDeSubgrupo = 0;
async function nuevoSubgrupo() {
    const id = `sg-${Date.now().toString(36)}-${(consecutivoDeSubgrupo++).toString(36)}`;
    if (!borradorDeOrden.value) return;
    borradorDeOrden.value = crearSubgrupo(borradorDeOrden.value, id);
    await nextTick();
    const campo = raizDelGrupo.value?.querySelector<HTMLInputElement>(`[data-subgrupo-nombre="${id}"]`);
    campo?.focus();
    campo?.select();
}

function restablecerOrden() {
    borradorDeOrden.value = copiarEstructura(elementosPorDefecto.value);
}

async function guardarOrden() {
    const borrador = borradorDeOrden.value;
    const trabajadorId = trabajadoresStore.currentTrabajadorId;
    if (!borrador || guardandoOrden.value || !hayCambiosDeOrden.value || !trabajadorId) return;
    guardandoOrden.value = true;
    try {
        // Lo que se ve sin organizar no se guarda: el año vuelve a seguir al orden del proveedor
        const organizacion = borradorEsElPorDefecto.value ? { orden: [], subgrupos: [] } : organizacionDe(borrador);
        const vuelveAlPorDefecto = organizacion.orden.length === 0 && organizacion.subgrupos.length === 0;
        await documentosStore.guardarOrdenDelAnio(trabajadorId, props.year, organizacion);
        borradorDeOrden.value = null;
        toast?.open({
            message: vuelveAlPorDefecto
                ? `El expediente ${props.year} volvió al orden por defecto`
                : `Organización del expediente ${props.year} guardada`,
            type: 'success',
        });
    } catch (error) {
        toast?.open({
            message: extractApiErrorMessage(error, 'No se pudo guardar la organización de los documentos'),
            type: 'error',
        });
    } finally {
        guardandoOrden.value = false;
    }
}

// Si el año cambia por fuera (se crea o elimina un documento) o se entra a eliminar, se sale del modo
watch(elementosGuardados, () => {
    borradorDeOrden.value = null;
});
watch(() => props.isDeletionMode, (activo) => {
    if (activo) borradorDeOrden.value = null;
});

const slots = useSlots();
const totalDocumentos = computed(() => documentosVisibles.value.length);
const totalDelAnio = computed(() => documentosEnOrden.value.length);

function construirRutaDocumento(
    doc: { _id: string },
    tipoLabel: string,
    store?: ReturnType<typeof useDocumentosStore>,
) {
    const rutaBase = obtenerRutaDocumento(doc, tipoLabel);
    const fecha = obtenerFechaDocumento(doc) || 'SinFecha';
    const nombreArchivo = store
        ? obtenerNombreArchivo(doc, tipoLabel, fecha, store)
        : obtenerNombreArchivo(doc, tipoLabel, fecha);
    return `${rutaBase}/${nombreArchivo}`.replace(/\/+/g, '/');
}

const documentoRutasInfo = computed(() => {
    const items: Array<{ documentId: string; documentType: string; filePath: string; formatoFirmado?: boolean }> = [];
    const itemsDeletables: Array<{ documentId: string; documentType: string; filePath: string; formatoFirmado?: boolean }> = [];

    documentosVisibles.value.forEach(({ definicion, documento }) => {
        if (!documento._id) return;
        const filePath = construirRutaDocumento(
            documento as { _id: string },
            definicion.etiquetaRuta,
            definicion.rutaConStore ? documentosStore : undefined,
        );
        const item = {
            documentId: documento._id,
            documentType: definicion.tipo,
            filePath,
            // Igual que la casilla de cada documento: el modal de eliminación lo cuenta aparte
            ...(definicion.tipo === 'documentoExterno' && (documento as { idFormatoFirmado?: string }).idFormatoFirmado
                ? { formatoFirmado: true }
                : {}),
        };
        items.push(item);
        if (!isDocumentoInmutable(documento)) {
            itemsDeletables.push(item);
        }
    });

    return { items, itemsDeletables };
});

const itemsDelGrupo = computed(() => documentoRutasInfo.value.items);

const itemsDeletablesDelGrupo = computed(() => {
    if (!props.isDeletionMode || !documentImmutabilityEnabled.value) {
        return itemsDelGrupo.value;
    }
    return documentoRutasInfo.value.itemsDeletables;
});

const isDocumentoSelected = (documentoId: string | undefined) => {
    if (!documentoId) return false;
    return props.selectedDocuments.some((d) => d.documentId === documentoId);
};

// Selección por subgrupo: los mismos documentos que «Seleccionar todos» tomaría, pero solo los suyos
function itemsDeSubgrupo(subgrupo: SubgrupoDelAnio) {
    const ids = new Set(subgrupo.documentos.map((item) => item.documento._id));
    const candidatos = props.isDeletionMode ? itemsDeletablesDelGrupo.value : itemsDelGrupo.value;
    return candidatos.filter((item) => ids.has(item.documentId));
}
const subgrupoSeleccionado = (subgrupo: SubgrupoDelAnio) => {
    const items = itemsDeSubgrupo(subgrupo);
    return items.length > 0 && items.every((item) => isDocumentoSelected(item.documentId));
};
function alternarSeleccionDeSubgrupo(subgrupo: SubgrupoDelAnio) {
    const marcar = !subgrupoSeleccionado(subgrupo);
    itemsDeSubgrupo(subgrupo).forEach((item) => props.toggleRouteSelection(item, marcar));
}

// Calcular cuántos documentos de este grupo están seleccionados
const documentosSeleccionadosDelGrupo = computed(() => {
    const ids = new Set(itemsDelGrupo.value.map((i) => i.documentId));
    return props.selectedDocuments.filter((d) => ids.has(d.documentId)).length;
});

// Determinar si todos los documentos eliminables están seleccionados (en modo eliminación usa itemsDeletablesDelGrupo)
const selectAll = computed({
    get: () => {
        const itemsRelevantes = props.isDeletionMode ? itemsDeletablesDelGrupo.value : itemsDelGrupo.value;
        return (
            itemsRelevantes.length > 0 &&
            itemsRelevantes.every((item) =>
                props.selectedDocuments.some((d) => d.documentId === item.documentId),
            )
        );
    },
    set: (value: boolean) => {
        const itemsAplicar = props.isDeletionMode ? itemsDeletablesDelGrupo.value : itemsDelGrupo.value;
        itemsAplicar.forEach((item) => {
            props.toggleRouteSelection(item, value);
        });
    }
});

const toggleSelectAll = () => {
    selectAll.value = !selectAll.value;
};

// Total de documentos eliminables (para mostrar en modo eliminación cuando hay inmutables)
const totalDeletables = computed(() => itemsDeletablesDelGrupo.value.length);
const hayDocumentosNoEliminables = computed(() =>
    props.isDeletionMode && documentImmutabilityEnabled.value && totalDeletables.value < totalDocumentos.value
);
const hasExtraSection = computed(() => !!slots.extraSection);
</script>

<template>
    <div ref="raizDelGrupo" class="w-full rounded-xl overflow-hidden border border-gray-200 bg-white">
        <!-- Encabezado del año -->
        <div class="grupo-documentos__header relative overflow-hidden bg-emerald-600">

            <div class="relative px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                    <!-- Icono de calendario -->
                    <div class="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </div>

                    <div>
                        <h2 class="text-lg font-semibold text-white tracking-normal">
                            Expediente {{ year }}
                        </h2>
                        <p class="text-emerald-100 text-xs sm:text-sm">
                            <template v-if="filtrado">{{ totalDocumentos }} de {{ totalDelAnio }} documentos</template>
                            <template v-else>{{ totalDocumentos }} documento{{ totalDocumentos !== 1 ? 's' : '' }} en total</template><span v-if="ordenPersonalizado" title="Alguien acomodó a mano los documentos de este año"> · orden personalizado</span>
                        </p>
                    </div>
                </div>

                <!-- Indicador de modo eliminación centrado -->
                <div v-if="isDeletionMode" class="pointer-events-none flex justify-center md:justify-end lg:justify-center w-full md:w-auto md:absolute md:inset-0 md:mr-4">
                    <div class="flex items-center space-x-3 bg-red-600 rounded-lg px-4 py-2 animate-fade-pulse">
                        <i class="fas fa-exclamation-triangle text-red-100 text-lg"></i>
                        <span class="text-white text-base font-semibold">Modo eliminación activado</span>
                        <i class="fas fa-exclamation-triangle text-red-100 text-lg"></i>
                    </div>
                </div>

                <!-- Indicador de selección -->
                <div v-if="documentosSeleccionadosDelGrupo > 0" class="hidden lg:flex items-center space-x-2 rounded-lg px-3 py-1"
                     :class="isDeletionMode ? 'bg-red-500 bg-opacity-20' : 'bg-white bg-opacity-20'">
                    <div class="w-2 h-2 rounded-full animate-pulse"
                         :class="isDeletionMode ? 'bg-red-300' : 'bg-yellow-300'"></div>
                    <span class="text-white text-sm font-medium">
                        {{ documentosSeleccionadosDelGrupo }} seleccionado{{ documentosSeleccionadosDelGrupo !== 1 ? 's' : '' }}<span v-if="isDeletionMode" class="ml-1">para eliminar</span>
                    </span>
                </div>
            </div>
        </div>

        <!-- Modo organizar: acomodar los documentos del año -->
        <div v-if="organizando" class="grupo-documentos__organizar flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-200">
            <p class="text-sm text-gray-700 min-w-0">
                <i class="fas fa-arrows-up-down text-emerald-600 mr-1" aria-hidden="true"></i>
                <span class="font-semibold">Organizando el expediente {{ year }}.</span>
                Arrastra o usa las flechas. El PDF combinado saldrá en este orden.
            </p>
            <div class="flex flex-wrap items-center gap-2 lg:justify-end lg:shrink-0">
                <button
                    type="button"
                    class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-100 whitespace-nowrap"
                    :disabled="guardandoOrden"
                    title="Crear un subgrupo para reunir documentos, por ejemplo «Antidoping»"
                    @click="nuevoSubgrupo"
                >
                    <i class="fas fa-folder-plus text-amber-500 mr-1" aria-hidden="true"></i>Nuevo subgrupo
                </button>
                <button
                    type="button"
                    class="text-sm font-medium text-gray-600 hover:text-emerald-700 hover:underline disabled:opacity-40 disabled:no-underline mr-1 whitespace-nowrap"
                    :disabled="borradorEsElPorDefecto || guardandoOrden"
                    title="Volver al orden por tipo de documento, solo con los subgrupos automáticos"
                    @click="restablecerOrden"
                >
                    <i class="fas fa-rotate-left mr-1" aria-hidden="true"></i>Restablecer orden por defecto
                </button>
                <button
                    type="button"
                    class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-100"
                    :disabled="guardandoOrden"
                    @click="cancelarOrganizacion"
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    class="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 whitespace-nowrap"
                    :disabled="!hayCambiosDeOrden || guardandoOrden"
                    @click="guardarOrden"
                >
                    {{ guardandoOrden ? 'Guardando…' : 'Guardar orden' }}
                </button>
            </div>
        </div>

        <!-- Barra de selección mejorada -->
        <div v-if="!organizando" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-3 bg-white border-b border-gray-200">
            <div class="flex flex-wrap items-start sm:items-center gap-3 sm:gap-4">
                <!-- Checkbox personalizado -->
                <div class="relative">
                    <input
                        class="sr-only"
                        type="checkbox"
                        :checked="selectAll"
                        @change="toggleSelectAll"
                        :id="`select-all-checkbox-${year}`"
                    >
                    <label
                        :for="`select-all-checkbox-${year}`"
                        class="flex items-center justify-center w-6 h-6 border-2 rounded-md cursor-pointer transition-all duration-200"
                        :class="{
                            'bg-emerald-500 border-emerald-600 shadow-sm': selectAll && !isDeletionMode,
                            'bg-red-500 border-red-600 shadow-sm': selectAll && isDeletionMode,
                            'border-gray-300 hover:border-emerald-500 hover:bg-emerald-50': !selectAll && !isDeletionMode,
                            'border-gray-300 hover:border-red-500 hover:bg-red-50': !selectAll && isDeletionMode
                        }"
                    >
                        <svg v-if="selectAll" class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                        </svg>
                    </label>
                </div>

                <div class="flex flex-col">
                    <label :for="`select-all-checkbox-${year}`" class="font-semibold cursor-pointer transition-colors duration-200 ml-0.5"
                           :class="isDeletionMode ? 'text-red-700 hover:text-red-800' : 'text-gray-700 hover:text-emerald-600'">
                           Seleccionar Todos
                        <!-- {{ isDeletionMode ? 'Seleccionar Todos para Eliminar' : 'Seleccionar Todos' }} -->
                    </label>
                    <span class="text-xs ml-0.5"
                          :class="isDeletionMode ? 'text-red-500' : 'text-gray-500'">
                        {{ documentosSeleccionadosDelGrupo }} de {{ hayDocumentosNoEliminables ? totalDeletables : totalDocumentos }}{{ hayDocumentosNoEliminables ? ' eliminables' : ' documentos' }}
                    </span>
                </div>
            </div>

            <!-- Organizar (con algún permiso de documentos) y modo eliminación (con todos) -->
            <div v-if="canDeleteAnyDocument || puedeOrganizar" class="flex items-center w-full sm:w-auto justify-center sm:justify-end gap-2">
                <button
                    v-if="puedeOrganizar && !isDeletionMode && totalDocumentos > 0 && !filtrado"
                    type="button"
                    class="flex items-center justify-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-medium w-full sm:w-auto bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700"
                    title="Acomodar a mano los documentos de este año"
                    @click="iniciarOrganizacion"
                >
                    <i class="fas fa-arrows-up-down text-xs text-gray-400" aria-hidden="true"></i>
                    <span>Organizar</span>
                </button>
                <button
                    v-if="canDeleteAnyDocument"
                    @click="toggleDeletionMode"
                    class="flex items-center justify-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-medium w-full sm:w-auto"
                    :class="isDeletionMode
                        ? 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 hover:border-red-400 shadow-sm'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700'"
                >
                    <i class="fas fa-trash-alt text-xs" :class="isDeletionMode ? 'text-red-600' : 'text-gray-400'"></i>
                    <span class="md:hidden">{{ isDeletionMode ? 'Desactivar' : 'Modo Eliminación' }}</span>
                    <span class="hidden md:inline">{{ isDeletionMode ? 'Desactivar Modo Eliminación' : 'Activar Modo Eliminación' }}</span>
                </button>
            </div>
        </div>

        <ModalDiscardConfirmDialog
            :open="!!preguntaDeDescarte"
            @continue-editing="responderDescarte(false)"
            @discard="responderDescarte(true)"
        />

        <!-- Modo organizar: el año en filas compactas que se acomodan arrastrando -->
        <OrganizadorDocumentos
            v-if="borradorDeOrden"
            :elementos="borradorDeOrden"
            :bloqueado="guardandoOrden"
            @update:elementos="borradorDeOrden = $event"
        />

        <!-- Documentos del año, en el orden del expediente; los subgrupos son un encabezado y sus documentos -->
        <!-- Al filtrar o plegar: las filas que salen se desvanecen y las demás se deslizan -->
        <TransitionGroup v-else tag="div" name="fila-filtro" class="relative">
            <template v-for="fila in filas" :key="fila.clave">
                <!-- Encabezado de subgrupo -->
                <div
                    v-if="fila.clase === 'encabezado'"
                    class="grupo-documentos__subgrupo flex items-center gap-3 w-full px-4 sm:px-6 py-2 bg-gray-50 border-y border-gray-200"
                    :data-subgrupo="fila.subgrupo.id"
                >
                    <input
                        type="checkbox"
                        class="grupo-documentos__casilla-subgrupo w-4 h-4 shrink-0 rounded border-gray-300 cursor-pointer disabled:opacity-40 disabled:cursor-default"
                        :checked="subgrupoSeleccionado(fila.subgrupo)"
                        :disabled="fila.subgrupo.documentos.length === 0"
                        :aria-label="`Seleccionar los documentos de ${fila.subgrupo.nombre}`"
                        :title="`Seleccionar los documentos de ${fila.subgrupo.nombre}`"
                        @change="alternarSeleccionDeSubgrupo(fila.subgrupo)"
                    >
                    <button
                        type="button"
                        class="flex flex-1 min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-left"
                        :aria-expanded="!fila.plegado"
                        :title="fila.plegado ? 'Mostrar los documentos del subgrupo' : 'Ocultar los documentos del subgrupo'"
                        @click="alternarPlegado(fila.subgrupo.id)"
                    >
                        <i class="fas text-xs text-gray-400 w-3" :class="fila.plegado ? 'fa-chevron-right' : 'fa-chevron-down'" aria-hidden="true"></i>
                        <i class="fas text-amber-500" :class="fila.plegado ? 'fa-folder' : 'fa-folder-open'" aria-hidden="true"></i>
                        <span class="font-semibold text-sm text-gray-800 truncate">{{ fila.subgrupo.nombre }}</span>
                        <span class="text-xs text-gray-500 whitespace-nowrap">
                            <template v-if="fila.subgrupo.documentos.length === 0">Sin documentos todavía</template>
                            <template v-else>{{ fila.subgrupo.documentos.length }} documento{{ fila.subgrupo.documentos.length !== 1 ? 's' : '' }}</template>
                        </span>
                        <span
                            v-if="fila.subgrupo.automatico"
                            class="grupo-documentos__subgrupo-automatico inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 whitespace-nowrap"
                            title="Ramazzini reunió estos documentos por su tipo. Con «Organizar» puedes cambiarlo o quitarlo."
                        >
                            <i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i>Automático
                        </span>
                    </button>
                </div>

                <!-- Documento -->
                <div
                    v-else
                    class="grupo-documentos__fila transition-all duration-200 hover:bg-gray-50"
                    :class="{
                        'grupo-documentos__fila--en-subgrupo': !!fila.subgrupo,
                        'grupo-documentos__fila--eliminando': estadoEliminacion[fila.item.documento._id] === 'eliminando',
                        'grupo-documentos__fila--error-eliminar': estadoEliminacion[fila.item.documento._id] === 'error',
                        'grupo-documentos__fila--reciente': documentoResaltado === fila.item.documento._id,
                    }"
                    :data-documento="fila.item.documento._id"
                    :aria-busy="estadoEliminacion[fila.item.documento._id] === 'eliminando' ? 'true' : undefined"
                >
                    <span
                        v-if="estadoEliminacion[fila.item.documento._id]"
                        class="grupo-documentos__estado-eliminar"
                        role="status"
                    >
                        <template v-if="estadoEliminacion[fila.item.documento._id] === 'eliminando'">
                            <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Eliminando…
                        </template>
                        <template v-else>
                            <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> No se pudo eliminar
                        </template>
                    </span>
                    <DocumentoItem
                        v-bind="{ [fila.item.definicion.tipo]: fila.item.documento }"
                        :documentoId="fila.item.documento._id"
                        :documentoTipo="fila.item.definicion.tipo"
                        :toggleRouteSelection="toggleRouteSelection"
                        :isDeletionMode="isDeletionMode"
                        :isSelected="isDocumentoSelected(fila.item.documento._id)"
                        @eliminarDocumento="$emit('eliminarDocumento', fila.item.documento._id, convertirFechaISOaDDMMYYYY(fila.item.documento[fila.item.definicion.campoFecha]), fila.item.definicion.tipo)"
                        @abrirModalAnular="(id, nombre, tipo) => $emit('abrirModalAnular', id, nombre, tipo)"
                        @abrirModalUpdate="$emit('abrirModalUpdate')"
                        @openSubscriptionModal="emit('openSubscriptionModal')"
                        @abrirModalFinalizar="(id, name, type) => $emit('abrirModalFinalizar', id, name, type)"
                    />
                </div>
            </template>
        </TransitionGroup>

        <div
            v-if="hasExtraSection"
            class="resultados-clinicos-extra-wrap border-t border-gray-200 bg-gray-50/70 px-4 py-4"
        >
            <slot name="extraSection" :year="year"></slot>
        </div>

        <!-- Estado vacío mejorado -->
        <div v-if="totalDocumentos === 0 && !hasExtraSection" class="p-12 text-center">
            <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No hay documentos</h3>
            <p class="text-gray-500">No se encontraron documentos para el año {{ year }}</p>
        </div>
    </div>
</template>

<style scoped>
/* Filas del año al filtrar o plegar: rápido y discreto */
.fila-filtro-enter-active,
.fila-filtro-leave-active {
    transition: opacity 120ms ease-out;
}
.fila-filtro-enter-from,
.fila-filtro-leave-to {
    opacity: 0;
}
.fila-filtro-leave-active {
    position: absolute;
    left: 0;
    right: 0;
}
.fila-filtro-move {
    transition: transform 160ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
    .fila-filtro-enter-active,
    .fila-filtro-leave-active,
    .fila-filtro-move {
        transition: none;
    }
}
/* Documento recién guardado (o el que se abrió) al volver al expediente: la tarjeta se tiñe de
   verde claro y se desvanece, como el último trabajador en la tabla. El verde va en el fondo de la
   tarjeta (sombra interior), por debajo del texto, los íconos y su marco, así que no los oscurece;
   es más intenso que el hover y se va solo. */
@keyframes documento-reciente {
    0%, 35% { box-shadow: inset 0 0 0 9999px rgba(16, 185, 129, 0.16); }
    100% { box-shadow: inset 0 0 0 9999px rgba(16, 185, 129, 0); }
}
.grupo-documentos__fila--reciente :deep(.documento-item) {
    animation: documento-reciente 2.5s ease-out;
}
@media (prefers-reduced-motion: reduce) {
    .grupo-documentos__fila--reciente :deep(.documento-item) {
        animation: none;
        box-shadow: inset 0 0 0 9999px rgba(16, 185, 129, 0.12);
    }
}

/* Modo eliminación: el documento que se está borrando se atenúa y no se puede tocar */
.grupo-documentos__fila {
    position: relative;
}
.grupo-documentos__fila--eliminando {
    opacity: 0.45;
    pointer-events: none;
    transition: opacity 120ms ease-out;
}
.grupo-documentos__fila--error-eliminar {
    box-shadow: inset 3px 0 0 #ef4444;
    background-color: #fef2f2;
}
.grupo-documentos__estado-eliminar {
    position: absolute;
    top: 0.35rem;
    right: 0.75rem;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.1rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.7rem;
    font-weight: 600;
    background-color: #fee2e2;
    color: #b91c1c;
    pointer-events: none;
}
html.dark-mode .grupo-documentos__fila--error-eliminar {
    background-color: rgba(127, 29, 29, 0.25);
}
html.dark-mode .grupo-documentos__estado-eliminar {
    background-color: rgba(127, 29, 29, 0.6);
    color: #fecaca;
}

/* Documentos que pertenecen a un subgrupo: van con sangría */
.grupo-documentos__fila--en-subgrupo {
    margin-left: 0.5rem;
}

@media (min-width: 640px) {
    .grupo-documentos__fila--en-subgrupo {
        margin-left: 1rem;
    }
}

/* Hover effects mejorados */
.hover\:bg-gray-50:hover {
    background-color: #f9fafb;
}

/* Transiciones suaves */
.transition-all {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Animación del indicador de selección */
.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: .5;
    }
}

/* Animación de desvanecido para el indicador de modo eliminación */
@keyframes fade-pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.4;
    }
}

.animate-fade-pulse {
    animation: fade-pulse 2s ease-in-out infinite;
}

/* Efectos de hover mejorados para modo eliminación */
.hover\:bg-red-50:hover {
    background-color: #fef2f2;
}

.hover\:border-red-300:hover {
    border-color: #fca5a5;
}

.hover\:border-red-400:hover {
    border-color: #f87171;
}


</style>
