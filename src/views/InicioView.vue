<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useDocumentosStore } from '@/stores/documentos';
import { formatInicioSaludo } from '@/composables/useInicioSaludo';
import { useInicioResumen } from '@/composables/useInicioResumen';
import { useInicioHoyList } from '@/composables/useInicioHoyList';
import { usePermissionRestrictions } from '@/composables/usePermissionRestrictions';
import { formatInicioRelativeTime } from '@/helpers/formatInicioRelativeTime';
import InicioMetricCard from '@/components/inicio/InicioMetricCard.vue';
import InicioActionRow from '@/components/inicio/InicioActionRow.vue';
import InicioSkeletonCard from '@/components/inicio/InicioSkeletonCard.vue';
import ModalInicioPendientes from '@/components/inicio/ModalInicioPendientes.vue';
import ModalInicioHoyList from '@/components/inicio/ModalInicioHoyList.vue';
import type {
  InicioAtencionGrupo,
  InicioClienteReciente,
  InicioHoyCentroItem,
  InicioHoyDocumentoItem,
  InicioHoyTrabajadorItem,
  InicioPendienteItem,
} from '@/interfaces/inicio-resumen.interface';

const user = useUserStore();
const documentos = useDocumentosStore();
const router = useRouter();
const { executeIfCanCreateDocument } = usePermissionRestrictions();
const {
  resumen,
  error,
  showHub,
  isLoading,
  showWelcome,
  showError,
  fetchResumen,
} = useInicioResumen();
const {
  loading: hoyLoading,
  error: hoyError,
  recurso: hoyRecurso,
  truncated: hoyTruncated,
  page: hoyPage,
  pageCount: hoyPageCount,
  pageTrabajadores,
  pageDocumentos,
  pageCentros,
  rangeLabel: hoyRangeLabel,
  open: openHoyList,
  nextPage: hoyNextPage,
  prevPage: hoyPrevPage,
  reset: resetHoyList,
} = useInicioHoyList();
const showHoyModal = ref(false);

const hoyModalTitle = computed(() => {
  if (hoyRecurso.value === 'documentos') return 'Documentos creados hoy';
  if (hoyRecurso.value === 'centros') return 'Centros con actividad hoy';
  return 'Trabajadores atendidos hoy';
});
const hoyModalHint = computed(() => {
  if (hoyRecurso.value === 'documentos') {
    return 'Documentos elaborados en el día. Puede abrirlos si tiene permiso para ese tipo.';
  }
  if (hoyRecurso.value === 'centros') {
    return 'Centros de trabajo con actividad documental hoy.';
  }
  return 'Personas únicas con actividad documental hoy. Abre el expediente correspondiente.';
});

const showPendientesModal = ref(false);
const modalItems = ref<InicioPendienteItem[]>([]);
const modalTitle = ref('Pendientes de finalizar');

const saludo = computed(() => formatInicioSaludo(user.getUsername));
const fechaHoy = computed(() => {
  const hoy = new Date();
  const cap = (value: string) =>
    value.charAt(0).toLocaleUpperCase('es-MX') + value.slice(1).toLocaleLowerCase('es-MX');
  const weekday = cap(hoy.toLocaleDateString('es-MX', { weekday: 'long' }));
  const day = hoy.toLocaleDateString('es-MX', { day: 'numeric' });
  const month = cap(hoy.toLocaleDateString('es-MX', { month: 'long' }));
  return `${weekday}, ${day} de ${month}`;
});
const subtituloHub = computed(() =>
  resumen.value?.activityScope === 'tenant'
    ? 'Resumen de la actividad reciente de su equipo.'
    : 'Retome su actividad reciente.',
);

const tercerIndicador = computed(() => {
  const hoy = resumen.value?.hoy;
  if (!hoy) return null;
  if (resumen.value?.regimen === 'SIRES_NOM024') {
    return {
      label: 'Pendientes de finalizar',
      value: hoy.borradoresPendientes ?? 0,
      hint: 'Todos los borradores. Lo vencido aparece en Requieren atención.',
      accent: 'warning' as const,
      icon: 'fas fa-clock',
      clickable: true,
    };
  }
  return {
    label: 'Centros con actividad hoy',
    value: hoy.centrosConActividad ?? 0,
    hint: 'centros de trabajo',
    accent: 'default' as const,
    icon: 'fas fa-warehouse',
    clickable: (hoy.centrosConActividad ?? 0) >= 1,
    kind: 'centros' as const,
  };
});

onMounted(() => {
  fetchResumen();
});

function esClienteNavegable(cliente: InicioClienteReciente) {
  return Boolean(cliente.idEmpresa && cliente.idCentroTrabajo);
}

function openPendientes(items: InicioPendienteItem[], title?: string) {
  modalItems.value = items;
  modalTitle.value = title ?? 'Pendientes de finalizar';
  showPendientesModal.value = true;
}

function onMetricPendientesClick() {
  if (resumen.value?.regimen !== 'SIRES_NOM024') return;
  openPendientes(resumen.value.pendientes ?? []);
}

function onHoyMetricClick(kind: 'trabajadores' | 'documentos' | 'centros') {
  showHoyModal.value = true;
  openHoyList(kind);
}

function closeHoyModal() {
  showHoyModal.value = false;
  resetHoyList();
}

function onTercerIndicadorClick() {
  if (resumen.value?.regimen === 'SIRES_NOM024') {
    onMetricPendientesClick();
    return;
  }
  if ((resumen.value?.hoy.centrosConActividad ?? 0) < 1) return;
  onHoyMetricClick('centros');
}

async function irAHoyTrabajador(item: InicioHoyTrabajadorItem) {
  closeHoyModal();
  irAExpediente(item.idEmpresa, item.idCentroTrabajo, item.idTrabajador);
}

async function irAHoyCentro(item: InicioHoyCentroItem) {
  closeHoyModal();
  router.push({
    name: 'trabajadores',
    params: {
      idEmpresa: item.idEmpresa,
      idCentroTrabajo: item.idCentroTrabajo,
    },
  });
}

function irAHoyDocumento(item: InicioHoyDocumentoItem) {
  executeIfCanCreateDocument(item.tipoDocumento, () => {
    closeHoyModal();
    if (item.tipoDocumento === 'documentoExterno') {
      irAExpediente(item.idEmpresa, item.idCentroTrabajo, item.idTrabajador);
      return;
    }
    documentos.setCurrentTypeOfDocument(item.tipoDocumento);
    router.push({
      name: 'crear-documento',
      params: {
        idEmpresa: item.idEmpresa,
        idCentroTrabajo: item.idCentroTrabajo,
        idTrabajador: item.idTrabajador,
        tipoDocumento: item.tipoDocumento,
        idDocumento: item.idDocumento,
      },
    });
  });
}

function tituloHoyDocumento(item: InicioHoyDocumentoItem) {
  const nombre = item.nombreDocumento?.trim();
  return nombre || item.etiquetaTipo;
}

function metaDocumento(item: InicioHoyDocumentoItem) {
  const parts = [item.nombreComercial, item.nombreCentro];
  if (item.estado === 'finalizado') parts.push('Finalizado');
  if (item.estado === 'borrador') parts.push('Borrador');
  if (item.creadorUsername) parts.push(`Creado por ${item.creadorUsername}`);
  if (item.finalizadoPorUsername) {
    parts.push(`Finalizado por ${item.finalizadoPorUsername}`);
  }
  parts.push(formatInicioRelativeTime(item.createdAt));
  return parts.filter(Boolean).join(' · ');
}

function onAtencionClick(grupo: InicioAtencionGrupo) {
  if (grupo.items.length === 1) {
    irAExpediente(
      grupo.items[0].idEmpresa,
      grupo.items[0].idCentroTrabajo,
      grupo.items[0].idTrabajador,
    );
    return;
  }
  openPendientes(grupo.items, grupo.titulo);
}

function irAClientes(cliente: InicioClienteReciente) {
  if (!cliente.idEmpresa || !cliente.idCentroTrabajo) return;
  router.push({
    name: 'trabajadores',
    params: {
      idEmpresa: cliente.idEmpresa,
      idCentroTrabajo: cliente.idCentroTrabajo,
    },
  });
}

function irAExpediente(
  idEmpresa: string,
  idCentroTrabajo: string,
  idTrabajador: string,
) {
  if (!idEmpresa || !idCentroTrabajo || !idTrabajador) return;
  router.push({
    name: 'expediente-medico',
    params: { idEmpresa, idCentroTrabajo, idTrabajador },
  });
}

function metaActualizado(username: string | undefined, iso: string) {
  const tiempo = formatInicioRelativeTime(iso);
  if (resumen.value?.activityScope === 'tenant' && username) {
    return `Actualizado por ${username} · ${tiempo}`;
  }
  return tiempo;
}

function metaEmpresaCentro(nombreComercial?: string, nombreCentro?: string) {
  return [nombreComercial, nombreCentro].filter(Boolean).join(' · ');
}

function irAConsejo() {
  const enlace = resumen.value?.consejo?.enlace;
  if (!enlace?.name) return;
  router.push({ name: enlace.name, params: enlace.params ?? {} });
}
</script>

<template>
  <Transition appear mode="out-in" name="slide-up">
  <div
    class="inicio-view mx-auto flex w-full flex-col items-center"
    :class="isLoading || showHub ? 'grow justify-center' : ''"
  >
    <section
      v-if="isLoading || (showHub && resumen)"
      class="w-full max-w-[70rem] px-4 sm:px-6"
      :data-testid="isLoading ? 'inicio-loading' : 'inicio-hub'"
      :aria-busy="isLoading ? 'true' : undefined"
    >
      <header class="mb-6 flex items-center justify-between gap-6 pr-16 lg:pr-0">
        <div class="min-w-0 text-left">
          <h1 class="text-3xl font-semibold text-gray-900 sm:text-4xl dark:text-slate-100">
            {{ saludo }}
          </h1>
          <p class="mt-1 text-gray-500 dark:text-slate-400">
            {{ isLoading ? 'Cargando su resumen de trabajo…' : subtituloHub }}
          </p>
          <p class="mt-0.5 text-sm text-gray-400 dark:text-slate-500">
            {{ fechaHoy }}
          </p>
        </div>
        <div class="hidden shrink-0 lg:block">
          <img
            src="/img/logosRamazzini/RamazziniLogoNoBg.png"
            alt="Ramazzini"
            width="5210"
            height="1403"
            decoding="async"
            class="h-14 w-auto sm:h-16 dark:hidden"
          />
          <img
            src="/img/logosRamazzini/RamazziniLogoClaroNoBg.png"
            alt="Ramazzini"
            width="5210"
            height="1403"
            decoding="async"
            class="hidden h-14 w-auto sm:h-16 dark:block"
          />
        </div>
      </header>

      <template v-if="isLoading">
        <div class="grid gap-4 lg:grid-cols-3">
          <InicioSkeletonCard label="Cargando indicadores" />
          <InicioSkeletonCard />
          <InicioSkeletonCard />
        </div>
        <div class="mt-6 grid gap-4 lg:grid-cols-2">
          <InicioSkeletonCard variant="list" label="Cargando clientes" />
          <InicioSkeletonCard variant="list" label="Cargando expedientes" />
        </div>
      </template>

      <template v-else-if="resumen">
        <div class="grid gap-4 lg:grid-cols-3">
          <button
            v-if="resumen.hoy.trabajadoresUnicos >= 1"
            type="button"
            class="group h-full w-full text-left"
            data-testid="inicio-metric-trabajadores"
            @click="onHoyMetricClick('trabajadores')"
          >
            <InicioMetricCard
              label="Trabajadores atendidos hoy"
              :value="resumen.hoy.trabajadoresUnicos"
              hint="personas únicas con actividad documental"
              icon="fas fa-user-group"
              interactive
            />
          </button>
          <InicioMetricCard
            v-else
            data-testid="inicio-metric-trabajadores"
            label="Trabajadores atendidos hoy"
            :value="resumen.hoy.trabajadoresUnicos"
            hint="personas únicas con actividad documental"
            icon="fas fa-user-group"
          />
          <button
            v-if="resumen.hoy.documentosCreados >= 1"
            type="button"
            class="group h-full w-full text-left"
            data-testid="inicio-metric-documentos"
            @click="onHoyMetricClick('documentos')"
          >
            <InicioMetricCard
              label="Documentos creados hoy"
              :value="resumen.hoy.documentosCreados"
              hint="documentos elaborados en el día"
              icon="fas fa-file-lines"
              interactive
            />
          </button>
          <InicioMetricCard
            v-else
            data-testid="inicio-metric-documentos"
            label="Documentos creados hoy"
            :value="resumen.hoy.documentosCreados"
            hint="documentos elaborados en el día"
            icon="fas fa-file-lines"
          />
          <button
            v-if="tercerIndicador?.clickable"
            type="button"
            class="group h-full w-full text-left"
            :data-testid="resumen.regimen === 'SIRES_NOM024' ? 'inicio-metric-pendientes' : 'inicio-metric-centros'"
            @click="onTercerIndicadorClick"
          >
            <InicioMetricCard
              :label="tercerIndicador.label"
              :value="tercerIndicador.value"
              :hint="tercerIndicador.hint"
              :accent="tercerIndicador.accent"
              :icon="tercerIndicador.icon"
              interactive
            />
          </button>
          <InicioMetricCard
            v-else-if="tercerIndicador"
            data-testid="inicio-metric-centros"
            :label="tercerIndicador.label"
            :value="tercerIndicador.value"
            :hint="tercerIndicador.hint"
            :accent="tercerIndicador.accent"
            :icon="tercerIndicador.icon"
          />
        </div>

        <div class="mt-6 grid gap-4 lg:grid-cols-2">
          <section
            data-testid="inicio-expedientes"
            class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">
              Expedientes recientes
            </h2>
            <ul v-if="resumen.expedientesRecientes.length" class="space-y-2">
              <li
                v-for="exp in resumen.expedientesRecientes"
                :key="exp.idTrabajador"
              >
                <InicioActionRow
                  icon="fas fa-user"
                  icon-tone="slate"
                  test-id="inicio-expediente-reciente"
                  @click="irAExpediente(exp.idEmpresa, exp.idCentroTrabajo, exp.idTrabajador)"
                >
                  <span
                    class="block truncate font-medium text-gray-900 dark:text-slate-100"
                    :title="exp.nombreTrabajador"
                  >{{ exp.nombreTrabajador }}</span>
                  <span
                    v-if="exp.nombreComercial || exp.nombreCentro"
                    class="block truncate text-sm text-gray-500 dark:text-slate-400"
                    :title="metaEmpresaCentro(exp.nombreComercial, exp.nombreCentro)"
                  >{{ metaEmpresaCentro(exp.nombreComercial, exp.nombreCentro) }}</span>
                  <span class="block truncate text-sm text-gray-500 dark:text-slate-400">
                    {{ exp.etiquetaTipo }}
                  </span>
                  <span
                    v-if="metaActualizado(exp.actorUsername, exp.ultimaActividad)"
                    class="mt-0.5 block truncate text-xs text-gray-400"
                  >
                    {{ metaActualizado(exp.actorUsername, exp.ultimaActividad) }}
                  </span>
                </InicioActionRow>
              </li>
            </ul>
            <p v-else class="text-sm text-gray-500 dark:text-slate-400">
              No hay expedientes recientes.
            </p>
          </section>

          <section
            data-testid="inicio-clientes"
            class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Clientes recientes
              </h2>
              <RouterLink
                v-if="resumen.clientesRecientes.length"
                :to="{ name: 'empresas' }"
                class="text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                Ver todos
              </RouterLink>
            </div>
            <ul v-if="resumen.clientesRecientes.length" class="space-y-2">
              <li
                v-for="cliente in resumen.clientesRecientes"
                :key="cliente.idCentroTrabajo || cliente.idEmpresa || cliente.nombreComercial"
              >
                <InicioActionRow
                  icon="fas fa-industry"
                  :interactive="esClienteNavegable(cliente)"
                  test-id="inicio-cliente-reciente"
                  @click="irAClientes(cliente)"
                >
                  <span
                    class="block truncate font-medium text-gray-900 dark:text-slate-100"
                    :title="cliente.nombreComercial"
                  >{{ cliente.nombreComercial }}</span>
                  <span
                    v-if="cliente.nombreCentro"
                    class="block truncate text-sm text-gray-500 dark:text-slate-400"
                    :title="cliente.nombreCentro"
                  >{{ cliente.nombreCentro }}</span>
                  <span
                    v-if="metaActualizado(cliente.actorUsername, cliente.ultimaActividad)"
                    class="mt-0.5 block truncate text-xs text-gray-400"
                  >
                    {{ metaActualizado(cliente.actorUsername, cliente.ultimaActividad) }}
                  </span>
                </InicioActionRow>
              </li>
            </ul>
            <p v-else class="text-sm text-gray-500 dark:text-slate-400">
              No hay actividad reciente.
              <RouterLink
                :to="{ name: 'empresas' }"
                class="font-medium text-emerald-600 hover:text-emerald-700"
              >
                Ir a clientes
              </RouterLink>
            </p>
          </section>
        </div>

        <section
          v-if="resumen.atencion.length"
          class="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">
            Requieren atención
          </h2>
          <ul class="space-y-2">
            <li v-for="grupo in resumen.atencion" :key="grupo.tipo">
              <InicioActionRow
                icon="fas fa-clock"
                icon-tone="amber"
                @click="onAtencionClick(grupo)"
              >
                <span class="block font-medium text-gray-900 dark:text-slate-100">
                  {{ grupo.titulo }}
                </span>
                <span class="block text-sm text-gray-500 dark:text-slate-400">
                  {{ grupo.subtitulo }}
                </span>
              </InicioActionRow>
            </li>
          </ul>
        </section>

        <aside
          v-if="resumen.consejo"
          class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80"
        >
          <i class="fas fa-lightbulb shrink-0 text-emerald-600" aria-hidden="true"></i>
          <span class="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Consejo
          </span>
          <p class="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-200">
            {{ resumen.consejo.texto }}
          </p>
          <button
            v-if="resumen.consejo.enlace"
            type="button"
            class="shrink-0 text-sm font-medium text-emerald-600 hover:text-emerald-700"
            @click="irAConsejo"
          >
            Abrir
          </button>
        </aside>
      </template>
    </section>

    <div
      v-else-if="showWelcome || showError"
      data-testid="inicio-welcome"
      class="home-content mx-auto flex w-full flex-col items-center"
    >
      <h1 class="home-title bg-gradient-to-r from-slate-700 to-gray-600 bg-clip-text py-5 text-center text-5xl font-medium text-transparent text-slate-700 sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl">
        Ramazzini
      </h1>
      <p class="home-subtitle py-2 text-center text-xl text-gray-600 sm:text-3xl md:text-4xl lg:text-4xl xl:w-2/3 xl:text-5xl">
        La aplicación para la creación y gestión de informes de exámenes médicos laborales.
      </p>
      <p class="home-greeting my-4 text-center text-sm text-gray-600 sm:text-lg">
        {{ saludo }}
      </p>
      <p v-if="showError" class="mb-2 text-sm text-gray-400">
        No se pudo cargar el resumen. Puede continuar con sus clientes.
      </p>
      <div class="home-actions mt-2 grid w-full max-w-md gap-4">
        <RouterLink
          :to="{ name: 'empresas' }"
          class="home-cta-btn layout-nav-link button-transition block w-full transform rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-3 text-center text-lg font-medium uppercase tracking-wide text-white shadow-lg transition-all duration-300 ease hover:scale-105 hover:from-emerald-700 hover:to-emerald-800 hover:shadow-xl sm:text-xl md:text-2xl"
        >
          VER MIS CLIENTES
        </RouterLink>
      </div>
    </div>

    <ModalInicioPendientes
      :open="showPendientesModal"
      :items="modalItems"
      :title="modalTitle"
      @close="showPendientesModal = false"
    />
    <ModalInicioHoyList
      :open="showHoyModal"
      :title="hoyModalTitle"
      :hint="hoyModalHint"
      :loading="hoyLoading"
      :error="hoyError"
      :truncated="hoyTruncated"
      :range-label="hoyRangeLabel"
      :page="hoyPage"
      :page-count="hoyPageCount"
      @close="closeHoyModal"
      @retry="hoyRecurso && openHoyList(hoyRecurso)"
      @prev="hoyPrevPage()"
      @next="hoyNextPage()"
    >
      <template v-if="hoyRecurso === 'trabajadores'">
        <InicioActionRow
          v-for="item in pageTrabajadores"
          :key="item.idTrabajador"
          icon="fas fa-user"
          icon-tone="slate"
          test-id="inicio-hoy-trabajador"
          @click="irAHoyTrabajador(item)"
        >
          <span class="block truncate font-medium" :title="item.nombreTrabajador">{{ item.nombreTrabajador }}</span>
          <span class="block truncate text-sm text-gray-500">{{ metaEmpresaCentro(item.nombreComercial, item.nombreCentro) }}</span>
          <span class="block truncate text-sm text-gray-500">{{ item.etiquetaTipo }}</span>
          <span class="mt-0.5 block truncate text-xs text-gray-400">
            {{ metaActualizado(item.actorUsername, item.ultimaActividad) }}
          </span>
        </InicioActionRow>
      </template>
      <template v-else-if="hoyRecurso === 'documentos'">
        <InicioActionRow
          v-for="item in pageDocumentos"
          :key="item.idDocumento"
          icon="fas fa-file-lines"
          test-id="inicio-hoy-documento"
          @click="irAHoyDocumento(item)"
        >
          <span class="flex min-w-0 items-center gap-2">
            <span
              class="block min-w-0 truncate font-medium"
              :title="tituloHoyDocumento(item)"
            >{{ tituloHoyDocumento(item) }}</span>
            <span
              v-if="item.tipoDocumento === 'documentoExterno' && item.nombreDocumento"
              class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-300"
            >Documento externo</span>
          </span>
          <span class="block truncate text-sm text-gray-500" :title="item.nombreTrabajador">{{ item.nombreTrabajador }}</span>
          <span class="block truncate text-xs text-gray-400">{{ metaDocumento(item) }}</span>
        </InicioActionRow>
      </template>
      <template v-else-if="hoyRecurso === 'centros'">
        <InicioActionRow
          v-for="item in pageCentros"
          :key="item.idCentroTrabajo"
          icon="fas fa-warehouse"
          test-id="inicio-hoy-centro"
          @click="irAHoyCentro(item)"
        >
          <span class="block truncate font-medium" :title="item.nombreCentro">{{ item.nombreCentro }}</span>
          <span class="block truncate text-sm text-gray-500">{{ item.nombreComercial }}</span>
          <span class="mt-0.5 block truncate text-xs text-gray-400">
            {{ metaActualizado(item.actorUsername, item.ultimaActividad) }}
          </span>
        </InicioActionRow>
      </template>
    </ModalInicioHoyList>
  </div>
  </Transition>
</template>

<style scoped>
.slide-up-enter-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-leave-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}

.button-transition {
  transition: all 0.3s ease !important;
}

.button-transition:hover {
  transform: scale(1.05) !important;
}

@media (max-height: 850px) {
  .home-title {
    font-size: clamp(2.75rem, 6vh + 0.875rem, 7rem);
    line-height: 1.05;
    padding-block: 1rem;
  }

  .home-subtitle {
    font-size: clamp(1.125rem, 2.25vh + 0.625rem, 2.75rem);
    line-height: 1.1;
    padding-block: 0.375rem;
  }

  .home-greeting {
    margin-block: 0.875rem;
    font-size: clamp(0.875rem, 1vh + 0.625rem, 1.0625rem);
  }

  .home-actions .home-cta-btn {
    font-size: clamp(1rem, 1.25vh + 0.75rem, 1.375rem);
    padding-block: 0.5em;
    padding-inline: 1.25em;
    border-radius: 0.75em;
    letter-spacing: 0.05em;
  }
}

@media (max-height: 700px) {
  .home-title {
    font-size: clamp(2.5rem, 5.5vh + 0.75rem, 6.5rem);
    padding-block: 0.875rem;
  }

  .home-subtitle {
    font-size: clamp(1.125rem, 2vh + 0.625rem, 2.5rem);
    padding-block: 0.3125rem;
  }
}

@media (max-height: 580px) {
  .home-title {
    font-size: clamp(2rem, 4.5vh + 0.5rem, 4rem);
    padding-block: 0.5rem;
  }

  .home-subtitle {
    font-size: clamp(1rem, 1.5vh + 0.5rem, 1.375rem);
    padding-block: 0.1875rem;
  }

  .home-greeting {
    margin-block: 0.5rem;
    font-size: 0.9375rem;
  }
}
</style>
