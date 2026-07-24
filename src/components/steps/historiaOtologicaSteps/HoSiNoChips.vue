<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string;
    question?: string;
    modelValue: string;
    /** Si true, no muestra la línea divisoria inferior. */
    borderless?: boolean;
  }>(),
  { borderless: false },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

function select(option: 'SI' | 'NO') {
  emit('update:modelValue', option);
}

function chipClass(option: 'SI' | 'NO') {
  const active = props.modelValue === option;
  return [
    'px-3 py-1.5 rounded-md text-sm font-semibold border transition-colors duration-150 cursor-pointer select-none',
    active
      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
      : 'border-gray-300 bg-white text-gray-600 hover:border-emerald-400',
  ];
}
</script>

<template>
  <div :class="borderless ? 'py-2' : 'border-b border-gray-200/80 py-2.5 last:border-b-0'">
    <div class="flex flex-wrap items-center gap-2 justify-between">
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-gray-800 leading-tight">{{ label }}</p>
        <p v-if="question" class="text-xs text-gray-500 mt-0.5 leading-snug">{{ question }}</p>
      </div>
      <div class="flex items-center gap-1.5 shrink-0" role="group" :aria-label="label">
        <button
          type="button"
          :class="chipClass('NO')"
          :aria-pressed="modelValue === 'NO'"
          @click="select('NO')"
        >
          NO
        </button>
        <button
          type="button"
          :class="chipClass('SI')"
          :aria-pressed="modelValue === 'SI'"
          @click="select('SI')"
        >
          SI
        </button>
      </div>
    </div>
  </div>
</template>
