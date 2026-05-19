<script setup>
import { ref, reactive, inject, onMounted, watch } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { useUserStore } from "@/stores/user";
import ModalSuscripcion from "@/components/suscripciones/ModalSuscripcion.vue";
import CountryPhoneInput from "@/components/CountryPhoneInput.vue";
import CountrySelect from "@/components/CountrySelect.vue";

const router = useRouter();
const userStore = useUserStore();
const toast = inject("toast");
const registroExitoso = ref(false);
const showSubscriptionModal = ref(false);
const showPassword = ref(false);

const user = ref(
  JSON.parse(localStorage.getItem("user")) || null // Recuperar usuario guardado o establecer null si no existe
);

const proveedorSalud = ref(
  JSON.parse(localStorage.getItem("proveedorSalud")) || null // Recuperar usuario guardado o establecer null si no existe
);

const maxUsuariosPermitidos = proveedorSalud.value?.maxUsuariosPermitidos;
let usuariosCreados = 0;

// Opciones de roles disponibles
const roles = [
  { value: "Médico", label: "Médico" },
  { value: "Enfermero/a", label: "Enfermero/a" },
  { value: "Administrativo", label: "Administrativo" },
  { value: "Técnico Evaluador", label: "Técnico Evaluador" },
];

onMounted(async () => {
  const resultado = await userStore.fetchUsersByProveedorId(
    user.value.idProveedorSalud
  );
  usuariosCreados = resultado.data.length;
});

const formDataUser = reactive({
  username: "",
  email: "",
  phone: "",
  country: "MX", // Default to Mexico
  password: "",
  role: "",
  idProveedorSalud: user.value.idProveedorSalud,
});

const handleSubmit = async () => {
  try {
    // Crear el payload con todos los campos necesarios
    const userPayload = {
      username: formDataUser.username,
      email: formDataUser.email,
      phone: formDataUser.phone,
      country: formDataUser.country,
      password: formDataUser.password,
      role: formDataUser.role,
      idProveedorSalud: formDataUser.idProveedorSalud,
    };

    const resultado = await userStore.registerUser(userPayload);

    // Verificar si el registro fue exitoso
    if (!resultado.success) {
      throw resultado.error; // Lanzar el error para manejarlo en el catch
    }

    registroExitoso.value = true;

    // Mostrar mensaje de éxito
    toast.open({
      type: "success",
      message: "Registro completado con éxito",
      position: "top-right",
    });
  } catch (error) {
    toast.open({
      type: "error",
      message: `Error: ${error.response.data.message}`,
      position: "bottom-right",
    });
  }
};

const volver = () => {
  router.push({ name: "inicio" });
};
</script>

<template>
  <Transition appear name="fade">
    <ModalSuscripcion
      v-if="showSubscriptionModal"
      @closeModal="showSubscriptionModal = false"
    />
  </Transition>

  <!-- Formulario Paso 1 -->
  <Transition appear mode="out-in" name="slide-up">
    <div
      v-if="registroExitoso == false"
      class="add-user-view relative bg-white text-gray-800 w-full max-w-lg p-8 sm:p-10 mt-2 rounded-lg max-h-[82vh] shadow-lg overflow-y-auto mx-auto"
    >
      <h1 class="text-2xl sm:text-3xl text-gray-800">Agregar usuario adicional</h1>
      <hr class="mt-2 mb-3" />

      <FormKit
        type="form"
        :actions="false"
        incomplete-message="Por favor, valide que los datos sean correctos*"
        @submit="handleSubmit"
      >
        <FormKit
          type="text"
          label="Nombre"
          name="username"
          placeholder="Ej. Jorge González"
          validation="required"
          :validation-messages="{
            required: 'Este campo es obligatorio',
          }"
          v-model="formDataUser.username"
        />

        <FormKit
          type="email"
          label="Correo de usuario"
          name="email"
          placeholder="usuario@empresa.com"
          validation="required|emailValidation"
          :validation-messages="{
            required: 'Este campo es obligatorio',
            emailValidation: 'Por favor ingresa un correo válido',
          }"
          v-model="formDataUser.email"
        />

        <CountrySelect
          label="¿En qué país se encuentra el usuario?"
          placeholder="Selecciona el país"
          v-model="formDataUser.country"
          validation="required"
        />

        <CountryPhoneInput
          class="my-3"
          label="¿Cuál es el teléfono del usuario?"
          placeholder="Número local"
          v-model="formDataUser.phone"
          :initial-country="formDataUser.country"
          @update:country="formDataUser.country = $event"
          validation="required"
        />

        <FormKit
          type="select"
          label="¿Cuál es el rol del usuario?"
          name="role"
          placeholder="Selecciona el rol"
          :options="roles"
          validation="required"
          :validation-messages="{
            required: 'Este campo es obligatorio',
          }"
          v-model="formDataUser.role"
        />

        <div class="relative">
          <FormKit
            :type="showPassword ? 'text' : 'password'"
            label="Establece una contraseña"
            name="password"
            placeholder="Contraseña de usuario"
            validation="required|passwordValidation"
            :validation-messages="{
              required: 'Este campo es obligatorio',
              passwordValidation: 'Mín. 8 dígitos, 1 mayúscula y 1 número.',
            }"
            v-model="formDataUser.password"
          />
          <button
            type="button"
            class="absolute right-3 top-[2.35rem] text-sm text-emerald-700 hover:text-emerald-800"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? "Ocultar" : "Ver" }}
          </button>
        </div>

        <hr class="my-3" />
        <div
          class="flex flex-col sm:flex-row justify-between items-center gap-2"
        >
          <!-- Botón de Volver -->
          <button
            type="button"
            class="text-base sm:text-lg w-full sm:w-1/2 rounded-lg bg-white font-medium text-gray-800 shadow-sm ring-2 ring-inset ring-gray-300 hover:bg-gray-100 p-3 transition-transform duration-300 transform hover:scale-105 hover:shadow-lg mb-1"
            @click="volver"
          >
            Volver
          </button>
          <!-- Botón de Actualizar -->
          <div class="w-full sm:w-1/2 pr-2">
            <FormKit type="submit">Registrar </FormKit>
          </div>
        </div>
      </FormKit>
    </div>
    <div
      v-else
      class="flex flex-col items-center justify-center p-6 w-full max-w-lg mx-auto"
    >
      <!-- Mensaje de éxito -->
      <div class="text-center mb-2">
        <h2 class="text-xl sm:text-2xl font-bold text-emerald-600 mb-4">
          Registro de usuario exitoso
        </h2>
        <p class="text-sm sm:text-base text-gray-600 mb-3">
          Has registrado el usuario correctamente.
          <strong
            >Es necesario activar la cuenta para poder iniciar sesión.</strong
          >
          Se ha enviado un correo de confirmación al usuario.
        </p>
      </div>

      <!-- Botón de redirección al inicio -->
      <div class="mt-2">
        <RouterLink
          :to="{ name: 'inicio' }"
          class="nav-action-link inline-block text-sm sm:text-base bg-emerald-600 text-white py-2 px-6 rounded-lg hover:bg-emerald-700 transition duration-300"
        >
          Regresar al inicio
        </RouterLink>
      </div>
    </div>
  </Transition>
</template>

<style>
html.dark-mode .add-user-view .formkit-outer[data-type='submit'] .formkit-input,
html.dark-mode .add-user-view .formkit-wrapper button[type='submit'],
html.dark-mode .add-user-view .formkit-input[type='submit'] {
  background-color: #047857 !important;
  border-color: #065f46 !important;
  color: #ecfdf5 !important;
}

html.dark-mode .add-user-view .formkit-outer[data-type='submit'] .formkit-input:hover,
html.dark-mode .add-user-view .formkit-wrapper button[type='submit']:hover,
html.dark-mode .add-user-view .formkit-input[type='submit']:hover {
  background-color: #065f46 !important;
  border-color: #064e3b !important;
}
</style>
