<script setup lang="ts">
defineProps({
  text: {
    type: String,
    required: false,
    default: 'Button',
  },
});
</script>

<template>
    <button class="button rounded-lg font-medium" type="button">
        <span class="button__text">
          <slot>{{ text }}</slot>
        </span>
        <span class="button__icon text-lg text-white"><i class="fa-solid fa-arrow-up-from-bracket"></i></span>
    </button>
</template>

<style scoped>
/* From Uiverse.io by andrew-demchenk0 */ 
.button {
  position: relative;
  width: 232px;
  height: 50px;
  cursor: pointer;
  display: flex;
  align-items: center;
  border: 2px solid #059669;
  background-color: #ffffff;
  overflow: hidden;
}

.button, .button__icon, .button__text {
  transition: all 0.3s;
}

.button .button__text {
  width: 186px;
  text-align: center;
  color: #059669;
}

.button .button__icon {
  position: absolute;
  transform: translateX(186px);
  height: 100%;
  width: 45px;
  background-color: #047857;
  display: flex;
  align-items: center;
  justify-content: center;
}

.button .svg {
  width: 20px;
  fill: #fff;
}

.button:hover {
  background: #17795E;
}

.button:hover .button__text {
  color: transparent;
}

.button:hover .button__icon {
  width: 148px;
  transform: translateX(40px);
}

.button:active .button__icon {
  background-color: #146c54;
}

.button:active {
  border: 1px solid #146c54;
}
</style>