<script setup>
import { ref, onMounted, inject } from "vue";
import { useUserStore } from "@/stores/user";
import UserItem from "@/components/UserItem.vue";
import AuthAPI from "@/api/AuthAPI";
import PermissionsAPI from "@/api/PermissionsAPI";

const toast = inject("toast");
const requestEliminacion = inject("requestEliminacion");

const userStore = useUserStore();
const usuarios = ref([]);
const loading = ref(true);

onMounted(async () => {
  const idProveedorSalud = userStore.user?.idProveedorSalud;
  if (!idProveedorSalud) {
    loading.value = false;
    return;
  }

  try {
    const resultado = await userStore.fetchUsersByProveedorId(
      idProveedorSalud,
      { scope: "full" },
    );

    if (!resultado.success) {
      usuarios.value = [];
      toast.open({
        message: "Error al cargar usuarios",
        type: "error",
      });
      return;
    }

    usuarios.value = resultado.data ?? [];
  } finally {
    loading.value = false;
  }
});

const solicitarEliminacionUsuario = (email, username) => {
  requestEliminacion?.({
    entidad: "usuario",
    identificacion: username,
    onConfirm: async (password) => {
      try {
        await AuthAPI.removeUserByEmail(email, password);
        usuarios.value = usuarios.value.filter((usuario) => usuario.email !== email);
        userStore.invalidateTenantUsersCache(userStore.user?.idProveedorSalud);
        toast.open({
          message: "Usuario eliminado correctamente",
        });
      } catch (error) {
        console.error("Error al eliminar el usuario:", error);
        toast.open({
          message: "Error al eliminar el usuario",
          type: "error",
        });
        throw error;
      }
    },
  });
};

const toggleAccountStatus = async (email) => {
  try {
    const usuario = usuarios.value.find(u => u.email === email);
    if (!usuario) return;

    const nuevoEstado = !usuario.cuentaActiva;
    await PermissionsAPI.toggleAccountStatus(usuario._id, nuevoEstado);

    usuario.cuentaActiva = nuevoEstado;
    userStore.invalidateTenantUsersCache(userStore.user?.idProveedorSalud);
    const estado = nuevoEstado ? 'reactivada' : 'suspendida';

    toast.open({
      message: `Cuenta ${estado} correctamente`,
      type: 'success'
    });
  } catch (error) {
    console.error('Error al cambiar estado de cuenta:', error);
    toast.open({
      message: 'Error al cambiar estado de cuenta',
      type: 'error'
    });
  }
};
</script>

<template>
  <Transition appear mode="out-in" name="slide-up">
    <div v-if="loading" key="loading" class="text-center py-20 mt-2">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4 animate-pulse">
        <i class="empresa-item-placeholder-icon fas fa-spinner fa-spin text-2xl text-emerald-600"></i>
      </div>
      <h2 class="text-xl font-semibold text-gray-700 mb-2">Cargando Usuarios...</h2>
      <p class="text-gray-500">Obteniendo usuarios adicionales del proveedor</p>
    </div>

    <div v-else key="list" class="grid grid-cols-1 gap-3 mt-2">
      <UserItem
        v-for="usuario in usuarios"
        :key="usuario._id"
        :id="usuario._id"
        :username="usuario.username"
        :email="usuario.email"
        :phone="usuario.phone"
        :role="usuario.role"
        :cuentaActiva="usuario.cuentaActiva"
        @eliminarUsuario="solicitarEliminacionUsuario"
        @toggleAccountStatus="toggleAccountStatus"
      />
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
</style>
