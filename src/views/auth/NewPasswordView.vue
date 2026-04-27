<script setup>
import { onMounted, inject, ref } from "vue";
import { reset } from "@formkit/core";
import { useRoute, useRouter } from "vue-router";
import AuthAPI from "@/api/AuthAPI";

const toast = inject("toast");
const route = useRoute();
const router = useRouter();
const token = route.params.token;

const validToken = ref(false);

onMounted(async () => {
  try {
    const { data } = await AuthAPI.verifyToken(token);
    validToken.value = true;
  } catch (error) {
    toast.open({
      type: "error",
      message: error.response.data.msg,
      position: "top-left",
    });
  }
});

const handleSubmit = async ({ password }) => {
  try {
    const { data } = await AuthAPI.updatePassword(token, { password });
    toast.open({
      type: "success",
      message: data.msg,
      position: "top-left",
    });
    reset("newPasswordForm");
    setTimeout(() => {
      router.push({ name: "login" });
    }, 3000);
  } catch (error) {
    toast.open({
      type: "error",
      message: error.response.data.msg,
      position: "top-left",
    });
    setTimeout(() => {
      router.push({ name: "login" });
    }, 3000);
  }
};
</script>

<template>
  <div
    v-if="validToken == true"
    class="auth-green-submit-match-login flex flex-col items-center justify-center p-8 w-full mx-auto"
  >
    <!-- Mensaje de éxito -->
    <div class="text-center mb-3">
      <h2 class="text-3xl font-semibold text-emerald-600 mb-2">
        Nueva contraseña
      </h2>
      <p class="text-gray-600 mb-3">Aquí puedes reestablecer la contraseña</p>
    </div>

    <div class="w-full sm:w-62">
      <FormKit
        id="newPasswordForm"
        type="form"
        :actions="false"
        incomplete-message="Por favor, valide que los datos sean correctos*"
        @submit="handleSubmit"
      >
        <FormKit
          type="password"
          label="Coloca tu nueva contraseña"
          name="password"
          placeholder="Contraseña de usuario"
          validation="required|passwordValidation"
          :validation-messages="{
            required: 'Este campo es obligatorio',
            passwordValidation: 'Mín. 8 dígitos, 1 mayúscula y 1 número.',
          }"
        />

        <div class="w-full mt-6">
          <FormKit type="submit">
            <span class="mr-2">Guardar</span>
          </FormKit>
        </div>
      </FormKit>
    </div>
  </div>

  <div
    v-else
    class="flex flex-col items-center justify-center p-8 w-full mx-auto"
  >
    <h2 class="text-3xl font-semibold text-gray-700 mb-2">Token no válido</h2>
  </div>
</template>
