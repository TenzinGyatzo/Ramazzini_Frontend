<script setup lang="ts">
const props = defineProps<{
  label: string;
  question?: string;
  modelValue: string;
  options: Array<{ value: string; label: string; hint?: string }>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

function select(value: string) {
  emit('update:modelValue', value);
}

function chipClass(optionValue: string) {
  const active = props.modelValue === optionValue;
  return [
    'w-full text-center px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-semibold border transition-colors duration-150 cursor-pointer select-none',
    active
      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
      : 'border-gray-300 bg-white text-gray-600 hover:border-emerald-400',
  ];
}
</script>

<template>
  <div class="border-b border-gray-200/80 py-2.5 last:border-b-0">
    <p class="text-sm font-semibold text-gray-800 leading-tight">{{ label }}</p>
    <p v-if="question" class="text-xs text-gray-500 mt-0.5 leading-snug">{{ question }}</p>
    <div class="mt-2 grid grid-cols-2 gap-1.5 w-full" role="group" :aria-label="label">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        :class="chipClass(opt.value)"
        :aria-pressed="modelValue === opt.value"
        :title="opt.hint"
        @click="select(opt.value)"
      >
        {{ opt.label }}
        <span v-if="opt.hint" class="font-normal text-[10px] opacity-80">{{ opt.hint }}</span>
      </button>
    </div>
  </div>
</template>
