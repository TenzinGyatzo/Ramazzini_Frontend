<script setup>
import { ref, onMounted, inject } from "vue";
import { useUserStore } from "@/stores/user";
import UserItem from "@/components/UserItem.vue";
import ModalEliminar from "@/components/ModalEliminar.vue";
import AuthAPI from "@/api/AuthAPI";
import PermissionsAPI from "@/api/PermissionsAPI";

const toast = inject("toast");

const userStore = useUserStore();
const usuarios = ref([]);
const showDeleteModal = ref(false);
const selectedUserId = ref(null);
const selectedUserUsername = ref(null);

onMounted(async () => {
  const idProveedorSalud = userStore.user?.idProveedorSalud;
  if (!idProveedorSalud) return;
  const resultado = await userStore.fetchUsersByProveedorId(idProveedorSalud);
  usuarios.value = resultado.data;
});

const toggleDeleteModal = (idUser, username) => {
  showDeleteModal.value = !showDeleteModal.value;
  selectedUserId.value = idUser;
  selectedUserUsername.value = username;
};

const deleteUsuarioByEmail = async (email) => {
  try {
    await AuthAPI.removeUserByEmail(email);

    // Actualizar la lista de usuarios local eliminando el usuario por su email
    usuarios.value = usuarios.value.filter(usuario => usuario.email !== email);

    toast.open({
      message: 'Usuario eliminado correctamente',
    })
  } catch (error) {
    console.error('Error al eliminar la empresa:', error);
  }
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
  <Transition appear name="fade">
    <ModalEliminar
      v-if="showDeleteModal && selectedUserId && selectedUserUsername"
      :idRegistro="selectedUserId"
      :identificacion="selectedUserUsername"
      tipoRegistro="Usuario"
      @closeModal="toggleDeleteModal"
      @confirmDelete="deleteUsuarioByEmail"
    />
  </Transition>
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
        @eliminarUsuario="toggleDeleteModal"
        @toggleAccountStatus="toggleAccountStatus"
      />
    </div>
  </Transition>
</template>
