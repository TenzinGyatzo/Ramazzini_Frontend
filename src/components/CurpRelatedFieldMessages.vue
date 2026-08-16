<script setup lang="ts">
import {
  FIELD_AUXILIARY_MESSAGES_CLASS,
  FIELD_AUXILIARY_MESSAGES_ITEM_CLASS,
} from '@/helpers/fieldAuxiliaryMessages';

defineProps<{
  messages?: string[];
  class?: string;
}>();
</script>

<template>
  <ul
    v-if="messages?.length"
    class="text-red-700 space-y-0.5"
    :class="[FIELD_AUXILIARY_MESSAGES_CLASS, $props.class]"
  >
    <li
      v-for="(message, idx) in messages"
      :key="idx"
      :class="FIELD_AUXILIARY_MESSAGES_ITEM_CLASS"
    >
      {{ message }}
    </li>
  </ul>
</template>
