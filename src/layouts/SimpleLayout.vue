<script setup lang="ts">
import { RouterView } from 'vue-router';
import { ref, onMounted } from 'vue';
import { useEditionLabel } from '@/composables/useEditionLabel';

const { editionLabel } = useEditionLabel();

const randomNumber = ref(0);

const changeRandomNumber = () => {
  randomNumber.value = Math.floor(Math.random() * 3);
};

onMounted(() => {
  changeRandomNumber();

  setInterval(() => {
    changeRandomNumber();
  }, 8000);
});

const contents = [
  {
    image: '../../../img/assets/captura.svg',
    title: 'Automatiza y asegura datos precisos',
    text: 'Transforma tus evaluaciones médicas con formularios inteligentes que se adaptan a tus necesidades, guiándote paso a paso y procesando información en tiempo real para garantizar precisión y eficiencia en cada registro.',
  },
  {
    image: '../../../img/assets/organizacion.svg',
    title: 'Encuentra todo cuando lo necesites',
    text: 'Simplifica la administración de documentos con un sistema diseñado para mantener todo en orden. Organiza y estructura los expedientes médicos por empresa, centro de trabajo, trabajador y año, todo en un solo lugar.',
  },
  {
    image: '../../../img/assets/informes.svg',
    title: 'Crea informes médicos en segundos',
    text: 'Genera informes en PDF personalizables con datos médicos precisos y tu información profesional. Combina, edita y previsualiza documentos con facilidad, todo al instante.',
  },
];
</script>

<template>
  <div class="min-h-screen grid grid-cols-1 lg:grid-cols-2">
    <!-- Mitad izquierda (blanca) -->
    <div class="bg-white p-8 flex items-center justify-center relative">
      <RouterView />
      <p
        class="absolute bottom-4 left-4 text-xs text-gray-400"
        data-testid="edition-label"
        :title="editionLabel"
      >
        {{ editionLabel }}
      </p>
    </div>

    <!-- Mitad derecha (gradiente) -->
    <div class="hidden lg:flex static-background p-8 items-center justify-center text-white relative overflow-hidden">
      <div
        v-for="(content, index) in contents"
        :key="index"
        :class="[
          'absolute transition-all duration-1000 ease-in-out transform',
          randomNumber === index ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 translate-y-2 z-0 pointer-events-none'
        ]"
        class="text-left max-w-[600px] p-10 grid grid-cols-1 gap-6"

      >
        <img :src="content.image" alt="Doctora" class="w-128 h-128 object-contain hover:scale-105">
        <div>
          <h1 class="text-4xl font-semibold my-4 drop-shadow-lg">{{ content.title }}</h1>
          <hr class="mb-4">
          <p class="text-xl italic text-justify">{{ content.text }}</p>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* .static-background {
  background-image: linear-gradient(120deg, #059669 40%, #6EE7B7 110%);
} */
.static-background {
  background-image: linear-gradient(120deg, #059669 40%, #6EE7B7 140%);
  background-attachment: fixed;
  background-position: center;
}

img {
  filter: drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.3));
  transition: transform 0.5s ease;
}

</style>
