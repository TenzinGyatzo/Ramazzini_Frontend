import { ref, watch, nextTick, type Ref } from 'vue';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusNextTabStop(from: HTMLElement) {
  const elements = getFocusableElements();
  const index = elements.indexOf(from);
  if (index >= 0 && index < elements.length - 1) {
    elements[index + 1].focus();
  }
}

function focusPreviousTabStop(from: HTMLElement) {
  const elements = getFocusableElements();
  const index = elements.indexOf(from);
  if (index > 0) {
    elements[index - 1].focus();
  }
}

function getFocusableElements() {
  return Array.from(
    document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (el) =>
      !el.hasAttribute('disabled') &&
      el.tabIndex !== -1 &&
      el.getClientRects().length > 0,
  );
}

export function useCatalogListKeyboard<T>(
  showResults: Ref<boolean>,
  results: Ref<T[]>,
  onSelect: (item: T) => void,
) {
  const highlightedIndex = ref(-1);
  const listRef = ref<HTMLElement | null>(null);
  const listboxId = `catalog-listbox-${Math.random().toString(36).slice(2, 9)}`;

  const resetHighlight = () => {
    highlightedIndex.value = -1;
  };

  watch(results, () => {
    resetHighlight();
  });

  watch(showResults, (open) => {
    if (!open) resetHighlight();
  });

  const scrollHighlightedIntoView = () => {
    if (!listRef.value || highlightedIndex.value < 0) return;
    const items = listRef.value.querySelectorAll('[data-list-option]');
    const el = items[highlightedIndex.value] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  };

  const optionId = (index: number) => `${listboxId}-option-${index}`;

  const isHighlighted = (index: number) => highlightedIndex.value === index;

  const setHighlightOnHover = (index: number) => {
    highlightedIndex.value = index;
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showResults.value) {
      e.preventDefault();
      showResults.value = false;
      resetHighlight();
      return;
    }

    if (!showResults.value || results.value.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        highlightedIndex.value =
          highlightedIndex.value < 0
            ? 0
            : Math.min(highlightedIndex.value + 1, results.value.length - 1);
        scrollHighlightedIntoView();
        break;
      case 'ArrowUp':
        e.preventDefault();
        highlightedIndex.value =
          highlightedIndex.value < 0
            ? results.value.length - 1
            : Math.max(highlightedIndex.value - 1, 0);
        scrollHighlightedIntoView();
        break;
      case 'Enter':
      case 'ArrowRight':
        if (highlightedIndex.value >= 0) {
          e.preventDefault();
          onSelect(results.value[highlightedIndex.value]);
        }
        break;
      case 'Tab':
        if (highlightedIndex.value >= 0) {
          e.preventDefault();
          const target = e.target as HTMLElement;
          onSelect(results.value[highlightedIndex.value]);
          nextTick(() => {
            if (e.shiftKey) {
              focusPreviousTabStop(target);
            } else {
              focusNextTabStop(target);
            }
          });
        }
        break;
      default:
        break;
    }
  };

  return {
    highlightedIndex,
    listRef,
    listboxId,
    onKeydown,
    resetHighlight,
    isHighlighted,
    setHighlightOnHover,
    optionId,
  };
}
