<script setup lang="ts">
/**
 * El año en «modo organizar»: documentos sueltos y subgrupos que se acomodan arrastrando,
 * con las flechas o con el selector de subgrupo. Trabaja sobre una copia de la estructura
 * del año; cada cambio se entrega completo y el dueño decide cuándo guardarlo.
 */
import { computed } from 'vue';
import {
  documentosDe,
  type DocumentoDelExpediente,
  type ElementoDelAnio,
  type SubgrupoDelAnio,
} from '@/helpers/documentosExpediente';
import {
  MAX_LONGITUD_NOMBRE_SUBGRUPO,
  colocarDocumentoEn,
  colocarSubgrupoEn,
  moverASubgrupo,
  moverDocumento,
  moverSubgrupo,
  puedeMoverDocumento,
  quitarSubgrupo,
  renombrarSubgrupo,
} from '@/helpers/organizarExpediente';
import ListaOrdenable, { type MovimientoEnLista } from './ListaOrdenable.vue';
import FilaOrganizable from './FilaOrganizable.vue';

const props = defineProps<{
  elementos: ElementoDelAnio[];
  bloqueado: boolean;
}>();

const emit = defineEmits<{ 'update:elementos': [elementos: ElementoDelAnio[]] }>();

const subgrupos = computed(() =>
  props.elementos.filter((elemento): elemento is SubgrupoDelAnio => elemento.clase === 'subgrupo'),
);

const claveDe = (item: DocumentoDelExpediente, indice: number) =>
  `${item.definicion.tipo}-${item.documento._id ?? indice}`;

const cambiar = (elementos: ElementoDelAnio[]) => emit('update:elementos', elementos);

const puedeMover = (item: DocumentoDelExpediente, paso: -1 | 1) => puedeMoverDocumento(props.elementos, item, paso);
const moverUnPaso = (item: DocumentoDelExpediente, paso: -1 | 1) => cambiar(moverDocumento(props.elementos, item, paso));
const cambiarSubgrupoDe = (item: DocumentoDelExpediente, subgrupoId: string | null) =>
  cambiar(moverASubgrupo(props.elementos, item, subgrupoId));
const moverSubgrupoUnPaso = (id: string, paso: -1 | 1) => cambiar(moverSubgrupo(props.elementos, id, paso));
const renombrar = (id: string, evento: Event) =>
  cambiar(renombrarSubgrupo(props.elementos, id, (evento.target as HTMLInputElement).value));
const quitar = (id: string) => cambiar(quitarSubgrupo(props.elementos, id));

/** Algo se soltó en una lista: un subgrupo entre los elementos del año, o un documento en el año o en un subgrupo. */
function alSoltar({ elemento, hacia, indice }: MovimientoEnLista) {
  const subgrupoId = elemento.dataset.subgrupo;
  if (subgrupoId) {
    if (!hacia) cambiar(colocarSubgrupoEn(props.elementos, subgrupoId, indice));
    return;
  }
  const documentoId = elemento.dataset.documento;
  const item = documentosDe(props.elementos).find((d) => String(d.documento._id) === documentoId);
  if (item) cambiar(colocarDocumentoEn(props.elementos, item, hacia || null, indice));
}
</script>

<template>
  <ListaOrdenable class="organizador" :bloqueada="bloqueado" @mover="alSoltar">
    <template v-for="(elemento, indice) in elementos" :key="elemento.clase === 'subgrupo' ? `subgrupo-${elemento.id}` : claveDe(elemento.item, indice)">
      <FilaOrganizable
        v-if="elemento.clase === 'documento'"
        :item="elemento.item"
        :subgrupo-id="null"
        :subgrupos="subgrupos"
        :puede-subir="puedeMover(elemento.item, -1)"
        :puede-bajar="puedeMover(elemento.item, 1)"
        :bloqueada="bloqueado"
        @mover="(paso) => moverUnPaso(elemento.item, paso)"
        @cambiar-subgrupo="(id) => cambiarSubgrupoDe(elemento.item, id)"
      />

      <!-- Subgrupo: su encabezado y la lista de sus documentos se arrastran juntos -->
      <div v-else class="organizador__item organizador__bloque-subgrupo bg-white" :data-subgrupo="elemento.id">
        <div
          class="grupo-documentos__subgrupo flex flex-wrap items-center gap-x-2 gap-y-1 px-2 sm:px-3 py-1.5 bg-gray-50 border-y border-gray-200 cursor-grab"
        >
          <span class="flex items-center justify-center h-7 w-5 text-gray-400" aria-hidden="true">
            <i class="fas fa-grip-vertical"></i>
          </span>
          <button
            type="button"
            class="grupo-documentos__flecha h-7 w-7 rounded-md text-gray-500 hover:bg-gray-200 hover:text-emerald-700 disabled:opacity-30 disabled:hover:bg-transparent"
            :disabled="indice === 0 || bloqueado"
            title="Subir subgrupo"
            aria-label="Subir subgrupo"
            @click="moverSubgrupoUnPaso(elemento.id, -1)"
          >
            <i class="fas fa-arrow-up text-xs" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="grupo-documentos__flecha h-7 w-7 rounded-md text-gray-500 hover:bg-gray-200 hover:text-emerald-700 disabled:opacity-30 disabled:hover:bg-transparent"
            :disabled="indice === elementos.length - 1 || bloqueado"
            title="Bajar subgrupo"
            aria-label="Bajar subgrupo"
            @click="moverSubgrupoUnPaso(elemento.id, 1)"
          >
            <i class="fas fa-arrow-down text-xs" aria-hidden="true"></i>
          </button>
          <i class="fas fa-folder-open text-amber-500 ml-1" aria-hidden="true"></i>
          <input
            type="text"
            class="grupo-documentos__nombre-subgrupo flex-1 min-w-[9rem] sm:max-w-sm rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            :value="elemento.nombre"
            :maxlength="MAX_LONGITUD_NOMBRE_SUBGRUPO"
            :data-subgrupo-nombre="elemento.id"
            aria-label="Nombre del subgrupo"
            placeholder="Nombre del subgrupo"
            @input="renombrar(elemento.id, $event)"
          >
          <span class="text-xs text-gray-500 whitespace-nowrap">
            {{ elemento.documentos.length }} documento{{ elemento.documentos.length !== 1 ? 's' : '' }}
          </span>
          <button
            type="button"
            class="sm:ml-auto text-sm font-medium text-gray-600 hover:text-red-600 hover:underline whitespace-nowrap"
            title="Quitar el subgrupo; sus documentos quedan sueltos en el mismo lugar"
            :disabled="bloqueado"
            @click="quitar(elemento.id)"
          >
            <i class="fas fa-folder-minus mr-1" aria-hidden="true"></i>Quitar subgrupo
          </button>
        </div>

        <!-- Solo documentos: un subgrupo no puede ir dentro de otro -->
        <ListaOrdenable
          class="organizador__miembros"
          :class="{ 'organizador__miembros--vacio': elemento.documentos.length === 0 }"
          :contenedor="elemento.id"
          acepta="organizador__documento"
          :bloqueada="bloqueado"
          @mover="alSoltar"
        >
          <FilaOrganizable
            v-for="(item, posicion) in elemento.documentos"
            :key="claveDe(item, posicion)"
            :item="item"
            :subgrupo-id="elemento.id"
            :subgrupos="subgrupos"
            :puede-subir="true"
            :puede-bajar="true"
            :bloqueada="bloqueado"
            @mover="(paso) => moverUnPaso(item, paso)"
            @cambiar-subgrupo="(id) => cambiarSubgrupoDe(item, id)"
          />
          <p v-if="elemento.documentos.length === 0" class="organizador__vacio px-3 py-3 text-xs text-gray-500">
            Vacío. Arrastra documentos aquí, o usa sus flechas o su selector de subgrupo.
          </p>
        </ListaOrdenable>
      </div>
    </template>
  </ListaOrdenable>
</template>

<style scoped>
/* Zona donde soltar documentos en un subgrupo que aún no tiene ninguno */
.organizador__miembros--vacio {
  margin-left: 0.75rem;
  border-left: 3px solid #fcd34d;
  min-height: 2.5rem;
}

@media (min-width: 640px) {
  .organizador__miembros--vacio {
    margin-left: 1.5rem;
  }
}

/* El hueco donde caerá lo que se arrastra */
:deep(.organizador__hueco) {
  opacity: 0.55;
  background-color: #ecfdf5;
  outline: 2px dashed #34d399;
  outline-offset: -2px;
}

/* Lo que va en el aire, siguiendo al cursor o al dedo */
:global(.organizador__en-el-aire) {
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.18);
  border-radius: 0.5rem;
  opacity: 0.95;
  cursor: grabbing;
}
</style>
