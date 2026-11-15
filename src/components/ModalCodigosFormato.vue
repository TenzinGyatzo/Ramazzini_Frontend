<script setup lang="ts">
/**
 * Códigos de formato (punto 34, docs/codigos-de-formato-especificacion.md): una fila por tipo de
 * documento y por formato para firma, con código y línea adicional. Arriba, la vista previa del
 * encabezado con la fila en la que se escribe. Se guarda con un botón, porque se escriben textos.
 */
import { computed, inject, onUnmounted, reactive, ref, watch } from 'vue';
import ModulosFuncionesAPI, { type EstadoModulosFunciones } from '@/api/ModulosFuncionesAPI';
import { extractApiErrorMessage } from '@/helpers/apiErrors';
import {
  CODIGO_FORMATO_MAX,
  DOCUMENTOS_CON_CODIGO_FORMATO,
  FORMATOS_FIRMA_CON_CODIGO,
  LINEA_ADICIONAL_MAX,
  codigosParaGuardar,
  limpiarTextoCodigo,
  nombreTipoConCodigo,
  type CodigosFormato,
} from '@/helpers/codigosFormato';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';

const props = defineProps<{ visible: boolean; codigos: CodigosFormato }>();
const emit = defineEmits<{ close: []; guardado: [estado: EstadoModulosFunciones] }>();

const toast = inject('toast') as { open: (o: { message: string; type?: string }) => void } | undefined;
const proveedorSaludStore = useProveedorSaludStore();

/** Control prenatal solo existe para algunos proveedores; si ya tiene código, se sigue mostrando. */
const documentos = computed(() =>
  DOCUMENTOS_CON_CODIGO_FORMATO.filter(
    (tipo) => tipo !== 'controlPrenatal' || proveedorSaludStore.controlPrenatalEnabled || !!props.codigos?.controlPrenatal,
  ),
);
const grupos = computed<{ titulo: string; tipos: string[] }[]>(() => [
  { titulo: 'Documentos', tipos: [...documentos.value] },
  { titulo: 'Formatos para firma impresos', tipos: FORMATOS_FIRMA_CON_CODIGO.map((f) => f.tipo) },
]);
const todosLosTipos = computed<string[]>(() => grupos.value.flatMap((g) => g.tipos));

const filas = reactive<Record<string, { codigo: string; lineaAdicional: string }>>({});
const filaActiva = ref<string>(DOCUMENTOS_CON_CODIGO_FORMATO[0]);
const guardando = ref(false);
const errores = ref<Record<string, string>>({});

function cargarFilas() {
  for (const tipo of Object.keys(filas)) delete filas[tipo];
  for (const tipo of todosLosTipos.value) {
    filas[tipo] = {
      codigo: props.codigos?.[tipo]?.codigo ?? '',
      lineaAdicional: props.codigos?.[tipo]?.lineaAdicional ?? '',
    };
  }
  // La vista previa empieza en el primer tipo que ya tiene código
  filaActiva.value = todosLosTipos.value.find((tipo) => filas[tipo].codigo) ?? todosLosTipos.value[0];
  errores.value = {};
}

const hayCambios = computed(
  () => JSON.stringify(codigosParaGuardar(filas)) !== JSON.stringify(codigosParaGuardar(props.codigos ?? {})),
);

const conCodigo = computed(() => Object.keys(codigosParaGuardar(filas)).length);

const vistaPrevia = computed(() => {
  const fila = filas[filaActiva.value];
  return {
    titulo: nombreTipoConCodigo(filaActiva.value).toUpperCase(),
    codigo: limpiarTextoCodigo(fila?.codigo),
    lineaAdicional: limpiarTextoCodigo(fila?.lineaAdicional),
  };
});

/** Una línea adicional sin código no se imprime: se avisa en la fila. */
const soloLinea = (tipo: string) => !limpiarTextoCodigo(filas[tipo]?.codigo) && !!limpiarTextoCodigo(filas[tipo]?.lineaAdicional);

function cerrar() {
  if (guardando.value) return;
  emit('close');
}

async function guardar() {
  if (guardando.value || !hayCambios.value) return;
  guardando.value = true;
  errores.value = {};
  try {
    const { data } = await ModulosFuncionesAPI.actualizarCodigosFormato({ codigosFormato: codigosParaGuardar(filas) });
    toast?.open({ message: 'Códigos de formato guardados', type: 'success' });
    emit('guardado', data);
    emit('close');
  } catch (error: any) {
    const detalles = error?.response?.data?.details;
    if (Array.isArray(detalles)) {
      errores.value = Object.fromEntries(detalles.map((d: { tipo: string; mensaje: string }) => [d.tipo, d.mensaje]));
    }
    toast?.open({ message: extractApiErrorMessage(error, 'No se pudieron guardar los códigos'), type: 'error' });
  } finally {
    guardando.value = false;
  }
}

function alPresionarTecla(evento: KeyboardEvent) {
  if (evento.key === 'Escape') cerrar();
}

watch(
  () => props.visible,
  (visible) => {
    window.removeEventListener('keydown', alPresionarTecla);
    if (visible) {
      cargarFilas();
      window.addEventListener('keydown', alPresionarTecla);
    }
  },
  { immediate: true },
);

onUnmounted(() => window.removeEventListener('keydown', alPresionarTecla));
</script>

<template>
  <Teleport to="body">
    <Transition appear name="modal-work" :duration="{ enter: 230, leave: 150 }">
      <div
        v-if="visible"
        class="modal modal-codigos-formato fixed inset-0 z-[50] grid place-items-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-codigos-formato-titulo"
      >
        <div
          class="modal-work-overlay absolute inset-0 bg-emerald-900/50 backdrop-blur-sm z-[40]"
          aria-hidden="true"
          @click="cerrar"
        />
        <div
          class="modal-work-panel relative bg-white rounded-lg shadow-xl shadow-slate-900/20 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col z-[50] text-gray-900"
        >
          <div class="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200">
            <div class="min-w-0">
              <h2 id="modal-codigos-formato-titulo" class="text-xl font-medium text-gray-900">Códigos de formato</h2>
              <p class="mt-1 text-xs text-gray-500">
                Salen arriba a la derecha del PDF. Cada documento conserva el código con el que se creó; un cambio
                aplica a los documentos nuevos.
              </p>
            </div>
            <button
              type="button"
              class="shrink-0 p-2 -mr-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Cerrar"
              @click="cerrar"
            >
              <i class="fas fa-times text-xl" />
            </button>
          </div>

          <!-- Vista previa del encabezado del PDF con la fila en la que se escribe -->
          <div class="px-6 pt-4 pb-3 border-b border-gray-100 bg-gray-50">
            <div class="modal-codigos-formato__hoja" aria-hidden="true" data-vista-previa>
              <span class="modal-codigos-formato__logo">Logo</span>
              <span class="modal-codigos-formato__titulo">{{ vistaPrevia.titulo }}</span>
              <span v-if="vistaPrevia.codigo" class="modal-codigos-formato__codigo">
                <span data-vista-codigo>{{ vistaPrevia.codigo }}</span>
                <span v-if="vistaPrevia.lineaAdicional" data-vista-linea>{{ vistaPrevia.lineaAdicional }}</span>
              </span>
            </div>
            <p class="mt-2 text-xs text-gray-500">
              <template v-if="vistaPrevia.codigo">Así se verá el encabezado.</template>
              <template v-else>Sin código, el PDF sale como hasta ahora.</template>
            </p>
          </div>

          <div class="flex-1 overflow-y-auto px-4 sm:px-6 py-3">
            <template v-for="grupo in grupos" :key="grupo.titulo">
              <h3 class="modal-codigos-formato__grupo">{{ grupo.titulo }}</h3>
              <div class="modal-codigos-formato__encabezados" aria-hidden="true">
                <span></span>
                <span>Código</span>
                <span>Línea adicional</span>
              </div>
              <div
                v-for="tipo in grupo.tipos"
                :key="tipo"
                class="modal-codigos-formato__fila"
                :class="{ 'modal-codigos-formato__fila--activa': filaActiva === tipo }"
                :data-tipo="tipo"
              >
                <span class="modal-codigos-formato__nombre">{{ nombreTipoConCodigo(tipo) }}</span>
                <input
                  v-model="filas[tipo].codigo"
                  type="text"
                  class="modal-codigos-formato__campo"
                  :maxlength="CODIGO_FORMATO_MAX"
                  placeholder="Código"
                  :aria-label="`Código de ${nombreTipoConCodigo(tipo)}`"
                  data-campo="codigo"
                  @focus="filaActiva = tipo"
                />
                <input
                  v-model="filas[tipo].lineaAdicional"
                  type="text"
                  class="modal-codigos-formato__campo"
                  :maxlength="LINEA_ADICIONAL_MAX"
                  placeholder="Línea adicional"
                  :aria-label="`Línea adicional de ${nombreTipoConCodigo(tipo)}`"
                  data-campo="lineaAdicional"
                  @focus="filaActiva = tipo"
                />
                <p v-if="errores[tipo]" class="modal-codigos-formato__aviso text-red-700">{{ errores[tipo] }}</p>
                <p v-else-if="soloLinea(tipo)" class="modal-codigos-formato__aviso text-amber-700">
                  Sin código no se imprime la línea adicional.
                </p>
              </div>
            </template>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 px-6 py-3 border-t border-gray-200">
            <span class="text-xs text-gray-500" data-con-codigo>
              {{ conCodigo === 0 ? 'Ningún tipo con código' : conCodigo === 1 ? '1 tipo con código' : `${conCodigo} tipos con código` }}
            </span>
            <div class="flex gap-2 ml-auto">
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
                :disabled="guardando"
                @click="cerrar"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                :disabled="!hayCambios || guardando"
                data-guardar
                @click="guardar"
              >
                {{ guardando ? 'Guardando…' : 'Guardar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-codigos-formato__hoja {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  height: 4.25rem;
  padding: 0 1.25rem 0.625rem;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
}

.modal-codigos-formato__logo {
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  background-color: #f3f4f6;
  color: #9ca3af;
  font-size: 0.625rem;
}

.modal-codigos-formato__titulo {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1d4ed8;
  font-size: 0.875rem;
  text-decoration: underline;
  text-decoration-color: #dc2626;
}

/* Como en el PDF: pequeño, gris y más adentro que el final del título */
.modal-codigos-formato__codigo {
  position: absolute;
  top: 0.375rem;
  right: 2rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  color: #6c757d;
  font-size: 0.625rem;
  line-height: 1.05;
}

.modal-codigos-formato__grupo {
  margin: 0.75rem 0 0.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #4b5563;
}

.modal-codigos-formato__grupo:first-child {
  margin-top: 0;
}

.modal-codigos-formato__encabezados,
.modal-codigos-formato__fila {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 8.5rem 11rem;
  gap: 0.25rem 0.5rem;
  align-items: center;
}

.modal-codigos-formato__encabezados {
  padding: 0 0.5rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.modal-codigos-formato__fila {
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
}

.modal-codigos-formato__fila--activa {
  background-color: #ecfdf5;
}

.modal-codigos-formato__nombre {
  font-size: 0.875rem;
  line-height: 1.3;
  color: #1f2937;
}

.modal-codigos-formato__campo {
  width: 100%;
  height: 2rem;
  padding: 0 0.5rem;
  font-size: 0.8125rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: #ffffff;
}

.modal-codigos-formato__campo:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.modal-codigos-formato__aviso {
  grid-column: 1 / -1;
  font-size: 0.75rem;
}

@media (max-width: 639px) {
  .modal-codigos-formato__encabezados {
    display: none;
  }

  .modal-codigos-formato__fila {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    padding: 0.5rem;
  }

  .modal-codigos-formato__nombre {
    grid-column: 1 / -1;
  }
}
</style>
