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

onMounted(async () => {
  const idProveedorSalud = userStore.user?.idProveedorSalud;
  if (!idProveedorSalud) return;
  const resultado = await userStore.fetchUsersByProveedorId(idProveedorSalud);
  usuarios.value = resultado.data;
});

const solicitarEliminacionUsuario = (email, username) => {
  requestEliminacion?.({
    entidad: "usuario",
    identificacion: username,
    onConfirm: async (password) => {
      try {
        await AuthAPI.removeUserByEmail(email, password);
        usuarios.value = usuarios.value.filter((usuario) => usuario.email !== email);
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
    <div class="grid grid-cols-1 gap-3 mt-2">
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
