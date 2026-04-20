<script setup>
import { inject } from 'vue';
import { FormKit } from '@formkit/vue';
import { reset } from '@formkit/core';
import AuthAPI from '@/api/AuthAPI';

const toast = inject('toast');

const handleSubmit = async (email) => {
    try {
        const { data } = await AuthAPI.forgotPassword(email);
        toast.open({
            type: 'success',
            message: data.msg,
            position: 'top-left',
        });
        reset('forgotPasswordForm');
    } catch (error) {
        toast.open ({
            type: 'error',
            message: error.response.data.msg,
            position: 'top-left',
        });
    }
};

</script>

<template>
  <div class="auth-green-submit-match-login flex flex-col items-center justify-center p-8 w-full mx-auto">
    <!-- Mensaje de éxito -->
    <div class="text-center mb-3">
      <h2 class="text-3xl font-semibold text-emerald-600 mb-2">Olvidé mi contraseña</h2>
      <p class="text-gray-600 mb-3">Recupera el acceso a tu cuenta </p>
    </div>

    <div class="w-full sm:w-62">
        <FormKit 
            id="forgotPasswordForm"
            type="form" 
            :actions="false"
            incomplete-message="Por favor, valide que los datos sean correctos*" 
            @submit="handleSubmit"
        >

            <FormKit 
                type="email" 
                label="Email" 
                name="email" 
                placeholder="Email de usuario"
                validation="required|email"
                :validation-messages="{
                required: 'El email es requerido',
                email: 'Email no es válido'
                }"
            />

            <div class="w-full mt-6">
            <FormKit type="submit">
                <span class="mr-2">Enviar Instrucciones</span>
            </FormKit>
            </div>
        </FormKit>
    </div>


  </div>
</template>