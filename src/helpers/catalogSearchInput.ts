import { useId } from 'vue';

/**
 * Atributos para inputs de búsqueda de catálogo que suprimen autofill del navegador
 * sin bloquear el desplegable propio (no usa readonly).
 *
 * - one-time-code: valor que Chrome respeta mejor que autocomplete="off"
 * - name único por instancia: evita heurísticas por nombre de campo repetido
 */
export function buildCatalogSearchInputAttrs(inputName: string) {
  return {
    autocomplete: 'one-time-code',
    autocorrect: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    name: inputName,
    'data-lpignore': 'true',
    'data-form-type': 'other',
  };
}

export function useCatalogSearchInput() {
  const inputName = useId();

  return {
    inputName,
    catalogSearchInputAttrs: buildCatalogSearchInputAttrs(inputName),
  };
}
