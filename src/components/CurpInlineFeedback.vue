<script setup lang="ts">
import { computed } from 'vue';
import type { CurpIssue } from '@/utils/curp';
import type { CurpPrefixSuggestion } from '@/utils/curp';
import { isGenericCurp } from '@/helpers/isGenericCurp';

const props = withDefaults(
  defineProps<{
    curp: string;
    invalidPositions: number[];
    warningPositions?: number[];
    validPositions?: number[];
    issues: CurpIssue[];
    /** Mostrar franja de 18 posiciones */
    showPositions?: boolean;
    /** Sugerencia de posiciones 1–16 (null = no hay datos suficientes) */
    suggestion?: CurpPrefixSuggestion | null;
    /** Campo editable: muestra acción "Usar" */
    canApplySuggestion?: boolean;
  }>(),
  {
    showPositions: true,
    suggestion: null,
    canApplySuggestion: true,
    validPositions: () => [],
    warningPositions: () => [],
  },
);

const emit = defineEmits<{
  applySuggestion: [];
}>();

const normalized = computed(() => (props.curp || '').trim().toUpperCase());

const showPositionCells = computed(
  () =>
    props.showPositions &&
    normalized.value.length > 0 &&
    !isGenericCurp(normalized.value),
);

const cells = computed(() => {
  return Array.from({ length: 18 }, (_, i) => {
    const pos = i + 1;
    const char = normalized.value[i] ?? '';
    const invalid = props.invalidPositions.includes(pos);
    const warning = !invalid && props.warningPositions.includes(pos);
    const valid = !invalid && !warning && props.validPositions.includes(pos);
    return { pos, char, invalid, warning, valid };
  });
});

const visibleIssues = computed(() =>
  [...props.issues]
    .filter((issue) => issue.code !== 'CURP_EMPTY')
    .sort((a, b) => {
      const aPos = a.positions.length ? Math.min(...a.positions) : 999;
      const bPos = b.positions.length ? Math.min(...b.positions) : 999;
      return aPos - bPos || a.code.localeCompare(b.code);
    }),
);

const showSuggestion = computed(
  () => !!props.suggestion?.prefix16 && !props.suggestion.matchesCurrent,
);

const showSuggestionMatched = computed(
  () => !!props.suggestion?.prefix16 && props.suggestion.matchesCurrent,
);
</script>

<template>
  <div
    v-if="showPositionCells || visibleIssues.length || suggestion?.prefix16"
    class="mt-1 mb-3 space-y-2"
  >
    <p
      v-if="showSuggestion"
      class="text-xs text-gray-500 leading-snug"
    >
      Sugerencia (pos. 1–16):
      <span class="font-mono text-gray-700 tracking-wide">{{ suggestion?.prefix16 }}</span>
      <button
        v-if="canApplySuggestion"
        type="button"
        class="ml-1.5 text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
        @click.prevent="emit('applySuggestion')"
      >
        Usar
      </button>
      <span class="block text-[11px] text-gray-400 mt-0.5">
        Completa homoclave (17) y dígito verificador (18) con tu CURP oficial.
      </span>
    </p>
    <p
      v-else-if="showSuggestionMatched"
      class="text-xs text-emerald-700/80 leading-snug"
    >
      Prefijo 1–16 alineado con nombre y datos demográficos.
    </p>

    <div
      v-if="showPositionCells"
      class="flex flex-wrap gap-x-0.5 gap-y-1 font-mono text-xs select-none"
      aria-label="Posiciones de la CURP"
    >
      <span
        v-for="cell in cells"
        :key="cell.pos"
        class="inline-flex flex-col items-center gap-0.5"
      >
        <span
          v-if="cell.invalid"
          class="text-[9px] leading-none text-red-500 font-sans tabular-nums"
          aria-hidden="true"
        >
          {{ cell.pos }}°
        </span>
        <span
          v-else-if="cell.warning"
          class="text-[9px] leading-none text-amber-600 font-sans tabular-nums"
          aria-hidden="true"
        >
          {{ cell.pos }}°
        </span>
        <span
          v-else
          class="text-[9px] leading-none invisible select-none"
          aria-hidden="true"
        >
          0°
        </span>
        <span
          class="inline-flex h-7 w-5 items-center justify-center rounded border"
          :class="
            cell.invalid
              ? 'border-red-400 bg-red-50 text-red-700'
              : cell.warning
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : cell.valid
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : cell.char
                    ? 'border-gray-200 bg-gray-50 text-gray-700'
                    : 'border-dashed border-gray-200 text-gray-300'
          "
          :title="`Posición ${cell.pos}`"
        >
          {{ cell.char || '·' }}
        </span>
      </span>
    </div>

    <ul v-if="visibleIssues.length" class="space-y-1 text-sm">
      <li
        v-for="(issue, idx) in visibleIssues"
        :key="`${issue.code}-${idx}`"
        class="leading-snug"
        :class="issue.severity === 'warning' ? 'text-amber-700' : 'text-red-700'"
      >
        {{ issue.message }}
      </li>
    </ul>
  </div>
</template>
