<script setup>
import { ref, onMounted, computed, inject, watch, nextTick } from 'vue';
import { useInventarioStore } from '@/stores/inventario';
import { useUserStore } from '@/stores/user';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import PermissionsAPI from '@/api/PermissionsAPI';
import AssignmentsAPI from '@/api/AssignmentsAPI';
import { useSalidaConCambios } from '@/composables/useSalidaConCambios';
import ModalDiscardConfirmDialog from '@/components/ModalDiscardConfirmDialog.vue';
import FilaPermiso from '@/components/permisos/FilaPermiso.vue';
import AsignacionesUsuario from '@/components/permisos/AsignacionesUsuario.vue';
import { useEscapeToClose } from '@/composables/useEscapeToClose';
import {
  DOCUMENT_DISPLAY_NAMES,
  sanitizePermissionsForRole,
} from '@/constants/rolePermissionPolicy';
import {
  aplicarAGrupo,
  asignacionesCambiaron,
  asignacionesDe,
  cargaParaGuardar,
  contarAjustesRespectoAlRol,
  documentosCambiaron,
  estadoGrupo,
  generalesCambiaron,
  gruposVisibles,
  motivoBloqueoDocumento,
  motivoBloqueoGeneral,
  permisosEditablesDe,
  predeterminadosDelRol,
  resumenDocumentos,
} from '@/helpers/permisosUsuario';

const toast = inject('toast');
const inventarioStore = useInventarioStore();
inventarioStore.cargarConfiguracion();
const userStore = useUserStore();
const proveedorSaludStore = useProveedorSaludStore();
const user = computed(() => userStore.user);

const usuarios = ref([]);
const empresasDisponibles = ref([]);
const loading = ref(true);
const saving = ref(false);
const seleccionadoId = ref(null);
const detalleRef = ref(null);
const gruposAbiertos = ref(new Set());
const usuarioPorSuspender = ref(null);
const cambiandoEstado = ref(false);

const ROLES_OPERATIVOS = [
  'Médico',
  'Enfermero/a',
  'Administrativo',
  'Técnico Evaluador',
];

const opciones = computed(() => ({
  esMexico: proveedorSaludStore.isMX,
  controlPrenatalHabilitado: proveedorSaludStore.controlPrenatalEnabled,
  inventarioHabilitado: inventarioStore.habilitado,
}));
const grupos = computed(() => gruposVisibles(opciones.value));

// Estado guardado de cada usuario (permisos y asignaciones) para saber qué cambió
const originales = ref(new Map());
const asignacionesOriginales = ref(new Map());

const clonar = (editables) => ({
  generales: { ...editables.generales },
  documentos: { ...editables.documentos },
});

const clonarAsignaciones = (asignaciones) => ({
  empresas: [...asignaciones.empresas],
  centros: [...asignaciones.centros],
});

const permisosCambiaron = (usuario) => {
  const original = originales.value.get(usuario._id);
  if (!original) return false;
  return (
    generalesCambiaron(original.generales, usuario.editables.generales) ||
    documentosCambiaron(original.documentos, usuario.editables.documentos)
  );
};

const asignacionesDeUsuarioCambiaron = (usuario) => {
  const original = asignacionesOriginales.value.get(usuario._id);
  return !!original && asignacionesCambiaron(original, usuario.asignaciones);
};

const hasChangesForUser = (usuario) =>
  permisosCambiaron(usuario) || asignacionesDeUsuarioCambiaron(usuario);

const usuariosConCambios = computed(() => usuarios.value.filter(hasChangesForUser));
const hasChanges = computed(() => usuariosConCambios.value.length > 0);
const hasUnsavedChanges = ref(false);
watch(hasChanges, (valor) => {
  hasUnsavedChanges.value = valor;
});

const seleccionado = computed(
  () => usuarios.value.find((usuario) => usuario._id === seleccionadoId.value) ?? null,
);

const prepararUsuario = (usuario) => {
  const permisos = sanitizePermissionsForRole(usuario.role, usuario.permisos ?? {});
  return {
    ...usuario,
    tienePorDocumento: !!permisos.documentos,
    editables: permisosEditablesDe(usuario.role, permisos),
    asignaciones: asignacionesDe(usuario),
  };
};

const sincronizarOriginales = () => {
  originales.value = new Map(
    usuarios.value.map((usuario) => [usuario._id, clonar(usuario.editables)]),
  );
  asignacionesOriginales.value = new Map(
    usuarios.value.map((usuario) => [usuario._id, clonarAsignaciones(usuario.asignaciones)]),
  );
};

const cargarEmpresasDisponibles = async (idProveedorSalud) => {
  try {
    const { data } = await AssignmentsAPI.getAvailableEmpresas(idProveedorSalud);
    empresasDisponibles.value = (data ?? []).map((empresa) => ({
      _id: String(empresa._id),
      nombreComercial: empresa.nombreComercial,
      razonSocial: empresa.razonSocial,
    }));
  } catch (error) {
    console.error('Error al cargar empresas:', error);
    empresasDisponibles.value = [];
  }
};

const cargarUsuarios = async () => {
  const idProveedorSalud = user.value?.idProveedorSalud;
  if (!idProveedorSalud) {
    toast.open({ message: 'No se pudo identificar el proveedor de salud', type: 'error' });
    return;
  }

  loading.value = true;
  try {
    const [resultado] = await Promise.all([
      userStore.fetchUsersByProveedorId(idProveedorSalud, {
        scope: 'permissions',
        roles: ROLES_OPERATIVOS.join(','),
      }),
      cargarEmpresasDisponibles(idProveedorSalud),
    ]);
    if (!resultado.success) {
      usuarios.value = [];
      toast.open({ message: 'Error al cargar usuarios', type: 'error' });
      return;
    }
    usuarios.value = (resultado.data ?? [])
      .filter((usuario) => ROLES_OPERATIVOS.includes(usuario.role))
      .map(prepararUsuario);
    sincronizarOriginales();
    if (!usuarios.value.some((usuario) => usuario._id === seleccionadoId.value)) {
      seleccionadoId.value = usuarios.value[0]?._id ?? null;
    }
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
    usuarios.value = [];
    toast.open({ message: 'Error al cargar usuarios', type: 'error' });
  } finally {
    loading.value = false;
  }
};

onMounted(cargarUsuarios);

const seleccionar = async (usuario) => {
  seleccionadoId.value = usuario._id;
  // En pantallas angostas el detalle queda debajo de la lista
  if (window.matchMedia?.('(max-width: 1023px)').matches) {
    await nextTick();
    detalleRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const guardarTodosLosCambios = async () => {
  if (!hasChanges.value) return;
  saving.value = true;
  const pendientes = usuariosConCambios.value;
  const fallidos = [];

  // Permisos y asignaciones se guardan por separado: si uno falla, solo ese queda marcado
  const guardarPermisos = async (usuario) => {
    const original = originales.value.get(usuario._id);
    const carga = cargaParaGuardar(original, usuario.editables, usuario.tienePorDocumento);
    await PermissionsAPI.updateUserPermissions(usuario._id, carga);
    const guardados = sanitizePermissionsForRole(usuario.role, carga);
    usuario.tienePorDocumento = !!guardados.documentos;
    usuario.editables = permisosEditablesDe(usuario.role, guardados);
    originales.value.set(usuario._id, clonar(usuario.editables));
  };

  const guardarAsignaciones = async (usuario) => {
    await AssignmentsAPI.updateUserAssignments(usuario._id, {
      empresasAsignadas: usuario.asignaciones.empresas,
      centrosTrabajoAsignados: usuario.asignaciones.centros,
    });
    usuario.empresasAsignadas = [...usuario.asignaciones.empresas];
    usuario.centrosTrabajoAsignados = [...usuario.asignaciones.centros];
    asignacionesOriginales.value.set(usuario._id, clonarAsignaciones(usuario.asignaciones));
  };

  await Promise.all(
    pendientes.map(async (usuario) => {
      const tareas = [];
      if (permisosCambiaron(usuario)) tareas.push(guardarPermisos(usuario));
      if (asignacionesDeUsuarioCambiaron(usuario)) tareas.push(guardarAsignaciones(usuario));
      const resultados = await Promise.allSettled(tareas);
      const errores = resultados.filter((r) => r.status === 'rejected');
      if (errores.length > 0) {
        errores.forEach((r) => console.error('Error al guardar cambios del usuario:', r.reason));
        fallidos.push(usuario.username);
      }
    }),
  );

  // Que la comparación vuelva a correr con los originales actualizados
  originales.value = new Map(originales.value);
  asignacionesOriginales.value = new Map(asignacionesOriginales.value);
  userStore.invalidateTenantUsersCache(user.value?.idProveedorSalud);
  saving.value = false;

  const guardados = pendientes.length - fallidos.length;
  if (guardados > 0) {
    toast.open({
      message:
        guardados === 1
          ? 'Cambios guardados para 1 usuario'
          : `Cambios guardados para ${guardados} usuarios`,
      type: 'success',
    });
  }
  if (fallidos.length > 0) {
    toast.open({
      message: `No se pudieron guardar los cambios de ${fallidos.join(', ')}. Lo que falta sigue marcado.`,
      type: 'error',
    });
  }
};

const descartarCambios = () => {
  for (const usuario of usuarios.value) {
    const original = originales.value.get(usuario._id);
    if (original) usuario.editables = clonar(original);
    const asignaciones = asignacionesOriginales.value.get(usuario._id);
    if (asignaciones) usuario.asignaciones = clonarAsignaciones(asignaciones);
  }
  toast.open({ message: 'Cambios descartados', type: 'info' });
};

const restablecerAlRol = (usuario) => {
  usuario.editables = clonar(predeterminadosDelRol(usuario.role));
};

const ajustesRespectoAlRol = (usuario) =>
  contarAjustesRespectoAlRol(usuario.role, usuario.editables, opciones.value);

// ---- Alcance: todas las empresas o solo las asignadas ----
const describirAlcance = (usuario) => {
  if (usuario.editables.generales.accesoCompletoEmpresasCentros) return 'Todas las empresas';
  const empresas = usuario.asignaciones.empresas.length;
  if (empresas === 0) return 'Sin empresas asignadas';
  return empresas === 1 ? '1 empresa asignada' : `${empresas} empresas asignadas`;
};

const describirDocumentos = (usuario) => {
  const { conAlguno, total } = resumenDocumentos(usuario.role, usuario.editables.documentos, opciones.value);
  return `Elabora ${conAlguno} de ${total} grupos de documentos`;
};

// ---- Documentos ----
const estadoDe = (usuario, grupo) => estadoGrupo(usuario.role, usuario.editables.documentos, grupo.tipos);

const bloqueoDeGrupo = (usuario, grupo) =>
  estadoDe(usuario, grupo) === 'bloqueado' ? `No disponible para el rol ${usuario.role}` : null;

const marcarGrupo = (usuario, grupo, valor) => {
  usuario.editables.documentos = aplicarAGrupo(usuario.role, usuario.editables.documentos, grupo.tipos, valor);
};

const marcarDocumento = (usuario, tipo, valor) => {
  usuario.editables.documentos = { ...usuario.editables.documentos, [tipo]: valor };
};

const alternarGrupo = (id) => {
  const abiertos = new Set(gruposAbiertos.value);
  if (abiertos.has(id)) abiertos.delete(id);
  else abiertos.add(id);
  gruposAbiertos.value = abiertos;
};

const nombreDocumento = (tipo) => DOCUMENT_DISPLAY_NAMES[tipo] ?? tipo;

const iniciales = (nombre = '') =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('') || '?';

// ---- Estado de la cuenta ----
const cambiarEstadoCuenta = async (usuario, cuentaActiva) => {
  cambiandoEstado.value = true;
  try {
    await PermissionsAPI.toggleAccountStatus(usuario._id, cuentaActiva);
    usuario.cuentaActiva = cuentaActiva;
    userStore.invalidateTenantUsersCache(user.value?.idProveedorSalud);
    toast.open({
      message: `Cuenta de ${usuario.username} ${cuentaActiva ? 'reactivada' : 'suspendida'}`,
      type: 'success',
    });
  } catch (error) {
    console.error('Error al cambiar estado de cuenta:', error);
    toast.open({ message: 'No se pudo cambiar el estado de la cuenta', type: 'error' });
  } finally {
    cambiandoEstado.value = false;
    usuarioPorSuspender.value = null;
  }
};

const cerrarConfirmacionSuspender = () => {
  if (!cambiandoEstado.value) usuarioPorSuspender.value = null;
};
useEscapeToClose(cerrarConfirmacionSuspender, () => !!usuarioPorSuspender.value);

// Al salir con cambios sin guardar: diálogo «¿Descartar cambios?» y aviso al cerrar la pestaña
const { mostrarConfirmacion: mostrarConfirmacionSalida, responderDescarte } =
  useSalidaConCambios(hasUnsavedChanges);
</script>

<template>
  <div class="p-4 sm:p-6 max-w-7xl mx-auto">
    <ModalDiscardConfirmDialog
      :open="mostrarConfirmacionSalida"
      @continue-editing="responderDescarte(false)"
      @discard="responderDescarte(true)"
    />

    <!-- Confirmación para suspender: la sesión del usuario se cierra de inmediato -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="usuarioPorSuspender"
          class="fixed inset-0 z-[80] flex items-center justify-center p-4"
          @click.self="cerrarConfirmacionSuspender"
        >
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="cerrarConfirmacionSuspender"></div>
          <div
            role="alertdialog"
            aria-labelledby="suspender-titulo"
            aria-describedby="suspender-descripcion"
            class="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[calc(100dvh-2rem)] overflow-y-auto"
          >
            <h2 id="suspender-titulo" class="text-xl font-semibold text-gray-900">
              ¿Suspender la cuenta de {{ usuarioPorSuspender.username }}?
            </h2>
            <p id="suspender-descripcion" class="mt-2 text-sm text-gray-600">
              Su sesión se cerrará de inmediato y no podrá entrar mientras la cuenta esté suspendida.
              Sus documentos, permisos y asignaciones se conservan, y puedes reactivarla cuando quieras.
            </p>
            <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                :disabled="cambiandoEstado"
                @click="cerrarConfirmacionSuspender"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                :disabled="cambiandoEstado"
                @click="cambiarEstadoCuenta(usuarioPorSuspender, false)"
              >
                <i v-if="cambiandoEstado" class="fas fa-spinner fa-spin mr-2"></i>
                Suspender cuenta
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Encabezado y acciones -->
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Permisos de usuarios</h1>
        <p class="text-sm sm:text-base text-gray-600">Define qué puede ver y hacer cada persona de tu equipo.</p>
      </div>
      <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-end w-full lg:w-auto">
        <div
          v-if="hasUnsavedChanges"
          class="permissions-unsaved-indicator flex items-center justify-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 text-xs sm:text-sm"
        >
          <i class="fas fa-exclamation-triangle"></i>
          <span class="font-medium">
            Cambios sin guardar
            <template v-if="usuariosConCambios.length > 1">({{ usuariosConCambios.length }} usuarios)</template>
          </span>
        </div>
        <button
          v-if="hasUnsavedChanges"
          type="button"
          :disabled="saving"
          class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          @click="descartarCambios"
        >
          <i class="fas fa-times mr-2"></i>
          Descartar
        </button>
        <button
          type="button"
          :disabled="saving || !hasChanges"
          class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
          @click="guardarTodosLosCambios"
        >
          <i :class="saving ? 'fas fa-spinner fa-spin mr-2' : 'fas fa-save mr-2'"></i>
          {{ saving ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </div>
    </div>

    <Transition appear mode="out-in" name="slide-up">
      <div v-if="loading" key="loading" class="text-center py-20">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4 animate-pulse">
          <i class="empresa-item-placeholder-icon fas fa-spinner fa-spin text-2xl text-emerald-600"></i>
        </div>
        <h2 class="text-xl font-semibold text-gray-700 mb-2">Cargando usuarios...</h2>
      </div>

      <div v-else-if="usuarios.length === 0" key="empty" class="text-center py-20">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <i class="fas fa-users text-2xl text-gray-400"></i>
        </div>
        <h2 class="text-xl font-semibold text-gray-700 mb-2">Aún no hay usuarios en tu equipo</h2>
        <p class="text-gray-500">Aquí aparecerán los médicos, enfermeros/as, técnicos evaluadores y administrativos que invites.</p>
      </div>

      <div v-else key="content">
        <!-- Cómo funcionan los permisos -->
        <div class="permisos-ayuda mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <p class="font-medium mb-1">
            <i class="fas fa-info-circle mr-1.5"></i>
            Cómo funcionan los permisos
          </p>
          <ul class="list-disc pl-5 space-y-0.5 text-xs sm:text-sm text-blue-700">
            <li><strong>Consultar siempre está permitido</strong> dentro de las empresas que el usuario puede ver. Los permisos deciden qué puede <strong>crear, modificar o eliminar</strong>.</li>
            <li>Primero decides <strong>qué empresas ve</strong> (todas, o solo las que le asignes); el resto de los permisos aplica dentro de ellas.</li>
          </ul>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)] gap-5 items-start">
          <!-- Lista de usuarios -->
          <nav aria-label="Usuarios" class="permisos-lista bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden lg:sticky lg:top-4">
            <button
              v-for="usuario in usuarios"
              :key="usuario._id"
              type="button"
              :aria-current="usuario._id === seleccionadoId ? 'true' : undefined"
              :class="[
                'permisos-lista-item w-full text-left px-4 py-3 flex items-start gap-3 border-b border-gray-100 last:border-b-0 transition-colors duration-150',
                usuario._id === seleccionadoId ? 'permisos-lista-item--activo bg-blue-50 shadow-[inset_3px_0_0_#3b82f6]' : 'hover:bg-gray-50',
              ]"
              @click="seleccionar(usuario)"
            >
              <span class="w-9 h-9 shrink-0 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold flex items-center justify-center">
                {{ iniciales(usuario.username) }}
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-1.5">
                  <span class="truncate text-sm font-semibold text-gray-900">{{ usuario.username }}</span>
                  <span
                    :class="['w-2 h-2 shrink-0 rounded-full', usuario.cuentaActiva ? 'bg-green-400' : 'bg-red-400']"
                    :title="usuario.cuentaActiva ? 'Cuenta activa' : 'Cuenta suspendida'"
                  ></span>
                </span>
                <span class="block text-xs text-gray-500">{{ usuario.role }}</span>
                <span class="block text-xs text-gray-500 mt-0.5 truncate">{{ describirAlcance(usuario) }}</span>
                <span
                  v-if="hasChangesForUser(usuario)"
                  class="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800"
                >
                  <i class="fas fa-pencil-alt mr-1"></i>
                  Modificado
                </span>
              </span>
            </button>
          </nav>

          <!-- Detalle del usuario elegido -->
          <section v-if="seleccionado" ref="detalleRef" class="space-y-4 scroll-mt-4" :aria-label="`Permisos de ${seleccionado.username}`">
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-lg font-semibold text-gray-900 truncate">{{ seleccionado.username }}</h2>
                  <span
                    :class="[
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      seleccionado.cuentaActiva ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
                    ]"
                  >
                    {{ seleccionado.cuentaActiva ? 'Activa' : 'Suspendida' }}
                  </span>
                </div>
                <p class="text-sm text-gray-500 truncate">{{ seleccionado.role }} · {{ seleccionado.email }}</p>
                <p class="text-xs text-gray-500 mt-1">{{ describirDocumentos(seleccionado) }}</p>
              </div>
              <div class="flex flex-col items-start sm:items-end gap-1 shrink-0">
                <span class="text-xs text-gray-500">
                  <template v-if="ajustesRespectoAlRol(seleccionado) === 0">Con los permisos predeterminados de su rol</template>
                  <template v-else-if="ajustesRespectoAlRol(seleccionado) === 1">1 ajuste respecto a lo predeterminado de su rol</template>
                  <template v-else>{{ ajustesRespectoAlRol(seleccionado) }} ajustes respecto a lo predeterminado de su rol</template>
                </span>
                <button
                  v-if="ajustesRespectoAlRol(seleccionado) > 0"
                  type="button"
                  class="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  @click="restablecerAlRol(seleccionado)"
                >
                  <i class="fas fa-rotate-left mr-1"></i>
                  Restablecer a lo predeterminado
                </button>
              </div>
            </div>

            <!-- 1. Qué empresas ve -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
              <h3 class="font-semibold text-gray-900 flex items-center gap-2">
                <i class="fas fa-building text-blue-600"></i>
                ¿Qué empresas puede ver?
              </h3>
              <p class="text-xs sm:text-sm text-gray-500 mt-1 mb-3">Todo lo demás aplica solo dentro de estas empresas.</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Empresas que puede ver">
                <label
                  :class="[
                    'permisos-opcion flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer',
                    seleccionado.editables.generales.accesoCompletoEmpresasCentros ? 'permisos-opcion--activa border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50',
                  ]"
                >
                  <input
                    type="radio"
                    class="mt-0.5 text-blue-600 focus:ring-blue-500"
                    :name="`alcance-${seleccionado._id}`"
                    :checked="seleccionado.editables.generales.accesoCompletoEmpresasCentros"
                    @change="seleccionado.editables.generales.accesoCompletoEmpresasCentros = true"
                  >
                  <span>
                    <span class="block text-sm font-medium text-gray-800">Todas las empresas y centros de trabajo</span>
                    <span class="block text-xs text-gray-500">Incluye las que se den de alta después.</span>
                  </span>
                </label>
                <label
                  :class="[
                    'permisos-opcion flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer',
                    !seleccionado.editables.generales.accesoCompletoEmpresasCentros ? 'permisos-opcion--activa border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50',
                  ]"
                >
                  <input
                    type="radio"
                    class="mt-0.5 text-blue-600 focus:ring-blue-500"
                    :name="`alcance-${seleccionado._id}`"
                    :checked="!seleccionado.editables.generales.accesoCompletoEmpresasCentros"
                    @change="seleccionado.editables.generales.accesoCompletoEmpresasCentros = false"
                  >
                  <span>
                    <span class="block text-sm font-medium text-gray-800">Solo las que le asignes</span>
                    <span class="block text-xs text-gray-500">Elige abajo sus empresas y centros de trabajo.</span>
                  </span>
                </label>
              </div>
              <AsignacionesUsuario
                v-if="!seleccionado.editables.generales.accesoCompletoEmpresasCentros"
                :key="seleccionado._id"
                v-model="seleccionado.asignaciones"
                :empresas-disponibles="empresasDisponibles"
              />
            </div>

            <!-- 2. Qué datos modifica -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
              <h3 class="font-semibold text-gray-900 flex items-center gap-2">
                <i class="fas fa-pen-to-square text-blue-600"></i>
                ¿Qué datos puede modificar?
              </h3>
              <p class="text-xs sm:text-sm text-gray-500 mt-1 mb-2">Sin estos permisos puede consultar empresas, centros y trabajadores, pero no modificarlos.</p>
              <div class="divide-y divide-gray-100">
                <FilaPermiso
                  v-model="seleccionado.editables.generales.gestionarEmpresas"
                  icono="fas fa-building"
                  titulo="Dar de alta, editar y eliminar empresas"
                />
                <FilaPermiso
                  v-model="seleccionado.editables.generales.gestionarCentrosTrabajo"
                  icono="fas fa-industry"
                  titulo="Dar de alta, editar y eliminar centros de trabajo"
                />
                <FilaPermiso
                  v-model="seleccionado.editables.generales.gestionarTrabajadores"
                  icono="fas fa-users"
                  titulo="Registrar y editar trabajadores"
                  descripcion="Incluye importarlos desde Excel, exportar la lista y darlos de baja o reincorporarlos."
                />
                <div class="pl-7">
                  <!-- Depende de registrar y editar: sin él se ve apagado, pero se conserva lo guardado -->
                  <FilaPermiso
                    :model-value="seleccionado.editables.generales.gestionarTrabajadores && seleccionado.editables.generales.eliminarFusionarTrabajadores"
                    @update:model-value="seleccionado.editables.generales.eliminarFusionarTrabajadores = $event"
                    icono="fas fa-user-xmark"
                    titulo="Eliminar trabajadores y fusionar duplicados"
                    :descripcion="seleccionado.editables.generales.gestionarTrabajadores
                      ? 'Eliminar borra al trabajador junto con su expediente.'
                      : 'Requiere poder registrar y editar trabajadores.'"
                    :deshabilitada="!seleccionado.editables.generales.gestionarTrabajadores"
                  />
                </div>
              </div>
            </div>

            <!-- 3. Qué documentos elabora -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
              <h3 class="font-semibold text-gray-900 flex items-center gap-2">
                <i class="fas fa-file-medical text-green-600"></i>
                ¿Qué documentos puede elaborar?
              </h3>
              <p class="text-xs sm:text-sm text-gray-500 mt-1 mb-2">
                Elaborar incluye editar los borradores y finalizarlos. Consultar los documentos del expediente siempre está permitido.
              </p>
              <div class="divide-y divide-gray-100">
                <div v-for="grupo in grupos" :key="grupo.id" class="py-0.5">
                  <div class="flex items-start gap-2">
                    <FilaPermiso
                      class="flex-1"
                      :model-value="estadoDe(seleccionado, grupo) === 'todos'"
                      :indeterminada="estadoDe(seleccionado, grupo) === 'algunos'"
                      :titulo="grupo.titulo"
                      :descripcion="grupo.descripcion"
                      :bloqueo="bloqueoDeGrupo(seleccionado, grupo)"
                      @update:model-value="marcarGrupo(seleccionado, grupo, $event)"
                    />
                    <button
                      v-if="grupo.tipos.length > 1"
                      type="button"
                      class="permisos-ver-documentos mt-2 shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded"
                      :aria-expanded="gruposAbiertos.has(grupo.id)"
                      @click="alternarGrupo(grupo.id)"
                    >
                      <template v-if="estadoDe(seleccionado, grupo) === 'algunos'">Algunos ·</template>
                      Ver {{ grupo.tipos.length }} documentos
                      <i :class="['fas ml-1 text-[10px]', gruposAbiertos.has(grupo.id) ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
                    </button>
                  </div>
                  <div
                    v-if="grupo.tipos.length > 1 && gruposAbiertos.has(grupo.id)"
                    class="permisos-documentos-grupo ml-7 mb-2 grid grid-cols-1 sm:grid-cols-2 gap-x-2 rounded-lg bg-gray-50 py-1"
                  >
                    <FilaPermiso
                      v-for="tipo in grupo.tipos"
                      :key="tipo"
                      :model-value="seleccionado.editables.documentos[tipo]"
                      :titulo="nombreDocumento(tipo)"
                      :bloqueo="motivoBloqueoDocumento(seleccionado.role, tipo)"
                      @update:model-value="marcarDocumento(seleccionado, tipo, $event)"
                    />
                  </div>
                </div>
              </div>
              <p v-if="proveedorSaludStore.notaAclaratoriaEnabled" class="text-xs text-gray-500 mt-2 px-3">
                <i class="fas fa-circle-info mr-1"></i>
                Las notas aclaratorias siguen el permiso del documento que aclaran.
              </p>
              <div class="mt-3 pt-3 border-t border-gray-200">
                <FilaPermiso
                  v-model="seleccionado.editables.generales.anularEliminarDocumentos"
                  icono="fas fa-file-circle-xmark"
                  titulo="Anular y eliminar documentos"
                  descripcion="Solo de los tipos que puede elaborar."
                />
              </div>
            </div>

            <!-- 4. Módulos -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
              <h3 class="font-semibold text-gray-900 flex items-center gap-2">
                <i class="fas fa-shapes text-purple-600"></i>
                ¿Qué módulos puede usar?
              </h3>
              <div class="divide-y divide-gray-100 mt-2">
                <FilaPermiso
                  v-model="seleccionado.editables.generales.accesoDashboardSalud"
                  icono="fas fa-chart-line"
                  titulo="Tablero de salud"
                  descripcion="Estadísticas e informes de salud de los trabajadores."
                />
                <FilaPermiso
                  v-if="opciones.esMexico"
                  v-model="seleccionado.editables.generales.accesoRiesgosTrabajo"
                  icono="fas fa-user-injured"
                  titulo="Incapacidades"
                  descripcion="Registrar y consultar las incapacidades de los trabajadores, con sus diagnósticos."
                  :bloqueo="motivoBloqueoGeneral(seleccionado.role, 'accesoRiesgosTrabajo')"
                />
                <div>
                  <FilaPermiso
                    v-model="seleccionado.editables.generales.gestionarInventario"
                    icono="fas fa-boxes-stacked"
                    titulo="Inventario clínico"
                    descripcion="Registrar entradas, ajustes y bajas, y editar el catálogo."
                  />
                  <!-- El permiso se guarda aunque el módulo esté apagado; aplica en cuanto se active -->
                  <p v-if="!opciones.inventarioHabilitado" class="permisos-inventario-apagado ml-10 mb-2 text-xs text-gray-500">
                    El inventario está desactivado en tu cuenta; este permiso aplicará cuando lo actives.
                    <router-link :to="{ name: 'inventario-catalogo' }" class="font-medium text-blue-600 hover:text-blue-800 hover:underline">
                      Activar inventario
                    </router-link>
                  </p>
                </div>
              </div>
            </div>

            <!-- 5. Configuración del proveedor -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
              <h3 class="font-semibold text-gray-900 flex items-center gap-2">
                <i class="fas fa-sliders text-gray-600"></i>
                Configuración del proveedor
              </h3>
              <div class="mt-2">
                <FilaPermiso
                  v-model="seleccionado.editables.generales.configurarOrdenDocumentos"
                  icono="fas fa-arrow-down-short-wide"
                  titulo="Orden por defecto de los documentos"
                  descripcion="Cambia cómo se ordenan los documentos en todos los expedientes."
                />
              </div>
            </div>

            <!-- Estado de la cuenta: se aplica al momento, aparte de «Guardar cambios» -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 class="font-semibold text-gray-900">Cuenta</h3>
                <p class="text-xs sm:text-sm text-gray-500">
                  {{ seleccionado.cuentaActiva
                    ? 'Suspender impide entrar al sistema sin borrar nada. Se aplica de inmediato.'
                    : 'La cuenta está suspendida: no puede entrar al sistema.' }}
                </p>
              </div>
              <button
                v-if="seleccionado.cuentaActiva"
                type="button"
                class="shrink-0 px-4 py-2 rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50 text-sm font-medium transition-colors duration-200"
                @click="usuarioPorSuspender = seleccionado"
              >
                <i class="fas fa-pause mr-2"></i>
                Suspender cuenta
              </button>
              <button
                v-else
                type="button"
                :disabled="cambiandoEstado"
                class="shrink-0 px-4 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-sm font-medium transition-colors duration-200 disabled:opacity-60"
                @click="cambiarEstadoCuenta(seleccionado, true)"
              >
                <i :class="cambiandoEstado ? 'fas fa-spinner fa-spin mr-2' : 'fas fa-play mr-2'"></i>
                Reactivar cuenta
              </button>
            </div>
          </section>
        </div>
      </div>
    </Transition>
  </div>
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .slide-up-enter-active,
  .slide-up-leave-active,
  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }
}
</style>

<style>
html.dark-mode .permissions-unsaved-indicator {
  color: #fcd34d !important;
  background-color: rgba(146, 64, 14, 0.28) !important;
  border-color: #b45309 !important;
}
</style>
