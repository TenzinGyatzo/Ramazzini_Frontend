import { computed, ref, type Ref, type ComputedRef } from 'vue';
import {
  validateCurpLive,
  issuesFromA1Details,
  suggestCurpPrefix16,
  applyCurpPrefix16,
  buildRelatedFieldMessages,
  type CurpDemographicInput,
  type CurpIssue,
  type CurpRelatedField,
  type ValidateCurpLiveOptions,
} from '@/utils/curp';

export interface UseCurpLiveValidationInput {
  curp: Ref<string> | ComputedRef<string>;
  demographics: Ref<CurpDemographicInput> | ComputedRef<CurpDemographicInput>;
  options: Ref<ValidateCurpLiveOptions> | ComputedRef<ValidateCurpLiveOptions>;
}

/**
 * Validación CURP reactiva para formularios (trabajadores / firmantes).
 */
export function useCurpLiveValidation(input: UseCurpLiveValidationInput) {
  const serverIssues = ref<CurpIssue[]>([]);

  const liveResult = computed(() =>
    validateCurpLive(input.curp.value, input.demographics.value, input.options.value),
  );

  const issues = computed<CurpIssue[]>(() => {
    const codes = new Set(liveResult.value.issues.map((i) => i.code));
    const merged = [...liveResult.value.issues];
    for (const issue of serverIssues.value) {
      if (!codes.has(issue.code)) {
        merged.push(issue);
        codes.add(issue.code);
      }
    }
    return merged;
  });

  const invalidPositions = computed(() => {
    const set = new Set<number>();
    for (const issue of issues.value) {
      if (issue.severity === 'error') {
        for (const p of issue.positions) set.add(p);
      }
    }
    return [...set].sort((a, b) => a - b);
  });

  const warningPositions = computed(() => {
    const set = new Set<number>();
    for (const issue of issues.value) {
      if (issue.severity === 'warning') {
        for (const p of issue.positions) set.add(p);
      }
    }
    return [...set].sort((a, b) => a - b);
  });

  const validPositions = computed(() => {
    const blocked = new Set([
      ...invalidPositions.value,
      ...warningPositions.value,
    ]);
    return liveResult.value.validPositions.filter((pos) => !blocked.has(pos));
  });

  const relatedFieldMessages = computed(() =>
    buildRelatedFieldMessages(
      issues.value.filter((issue) => issue.severity === 'error'),
      {
        useSexoCurpForValidation:
          input.demographics.value.useSexoCurpForValidation === true,
      },
    ),
  );

  const relatedFieldErrors = computed(() => {
    const map: Partial<Record<CurpRelatedField, string>> = {};
    for (const [field, messages] of Object.entries(relatedFieldMessages.value) as Array<
      [CurpRelatedField, string[]]
    >) {
      if (messages[0]) {
        map[field] = messages[0];
      }
    }
    return map;
  });

  const hasBlockingErrors = computed(() =>
    issues.value.some((i) => i.severity === 'error'),
  );

  const errorIssues = computed(() =>
    issues.value.filter((i) => i.severity === 'error'),
  );

  const warningIssues = computed(() =>
    issues.value.filter((i) => i.severity === 'warning'),
  );

  const curpPrefixSuggestion = computed(() => {
    if (input.options.value.requireGenericCurp) {
      return null;
    }
    return suggestCurpPrefix16(input.demographics.value, input.curp.value);
  });

  function applySuggestedPrefix(): string | null {
    if (input.options.value.requireGenericCurp) {
      return null;
    }
    const suggestion = curpPrefixSuggestion.value;
    if (!suggestion || suggestion.matchesCurrent) {
      return null;
    }
    return applyCurpPrefix16(input.curp.value, suggestion.prefix16);
  }

  function setServerIssuesFromDetails(
    details: Array<{
      field?: string;
      expected?: string;
      gotFromCurp?: string;
      code?: string;
      positions?: number[];
    }>,
  ) {
    serverIssues.value = issuesFromA1Details(details);
  }

  function setServerIssues(next: CurpIssue[]) {
    serverIssues.value = next;
  }

  function clearServerIssues() {
    serverIssues.value = [];
  }

  return {
    issues,
    errorIssues,
    warningIssues,
    invalidPositions,
    warningPositions,
    validPositions,
    relatedFieldErrors,
    relatedFieldMessages,
    hasBlockingErrors,
    curpPrefixSuggestion,
    applySuggestedPrefix,
    serverIssues,
    setServerIssuesFromDetails,
    setServerIssues,
    clearServerIssues,
  };
}
