<script setup>
/**
 * El tipo «date» de FormKit con CampoFecha (DD/MM/AAAA siempre). Se registra en formkit.config
 * y reemplaza a todos los <FormKit type="date"> sin tocarlos: etiqueta, ayuda, mensajes,
 * validación, mínimo y máximo siguen igual, y el valor sigue siendo AAAA-MM-DD.
 */
import { computed } from 'vue';
import CampoFecha from './CampoFecha.vue';

const props = defineProps({
  context: { type: Object, required: true },
});

/** Atributos que van al cuadro de texto (data-*, aria-*, autofocus…), sin los que maneja el campo. */
const otrosAtributos = computed(() => {
  const { min, max, placeholder, class: _clase, type: _tipo, ...resto } = props.context.attrs ?? {};
  return resto;
});

const actualizar = (valor) => {
  props.context.node.input(valor);
};
</script>

<template>
  <CampoFecha
    :id="context.id"
    :name="context.node.name"
    :model-value="context._value ?? ''"
    :min="context.attrs?.min ?? ''"
    :max="context.attrs?.max ?? ''"
    :placeholder="context.attrs?.placeholder || 'DD/MM/AAAA'"
    :disabled="!!context.disabled"
    :input-class="context.classes.input"
    v-bind="otrosAtributos"
    @update:model-value="actualizar"
    @blur="context.handlers.blur"
  />
</template>
