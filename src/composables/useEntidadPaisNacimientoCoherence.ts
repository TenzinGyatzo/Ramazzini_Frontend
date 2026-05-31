import { watch, type Ref } from 'vue';

export const PAIS_NACIMIENTO_MEXICO = 142;
export const PAIS_NACIMIENTO_NO_ESPECIFICADO = 248;

const ENTIDADES_SIN_AUTO_PAIS = ['NE', '00'];

export interface FirmanteNacimientoFields {
  entidadNacimiento: string;
  paisNacimiento: string | number;
}

function normalizePaisNacimiento(
  value: string | number | null | undefined,
): number | null {
  if (value === '' || value == null) return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(num) ? null : num;
}

function applyPaisToEntidad(
  formulario: FirmanteNacimientoFields,
  paisNum: number,
): void {
  if (paisNum === PAIS_NACIMIENTO_NO_ESPECIFICADO) {
    if (formulario.entidadNacimiento !== '00') {
      formulario.entidadNacimiento = '00';
    }
    return;
  }

  if (paisNum !== PAIS_NACIMIENTO_MEXICO) {
    if (formulario.entidadNacimiento !== 'NE') {
      formulario.entidadNacimiento = 'NE';
    }
    return;
  }

  if (ENTIDADES_SIN_AUTO_PAIS.includes(formulario.entidadNacimiento)) {
    formulario.entidadNacimiento = '';
  }
}

/**
 * Coherencia NOM-024: sincronización bidireccional entidad de nacimiento ↔ país de nacimiento.
 *
 * - País 248 (NO ESPECIFICADO) → entidad 00 (No disponible)
 * - País distinto de 142 (México) → entidad NE (Extranjero)
 * - País 142 + entidad NE/00 → limpiar entidad para permitir selección estatal
 * - Entidad estatal MX (01-32) → país 142
 */
export function useEntidadPaisNacimientoCoherence(
  formulario: Ref<FirmanteNacimientoFields>,
) {
  watch(
    () => formulario.value.entidadNacimiento,
    (entidad) => {
      if (!entidad) return;
      if (ENTIDADES_SIN_AUTO_PAIS.includes(entidad)) return;
      if (normalizePaisNacimiento(formulario.value.paisNacimiento) !== PAIS_NACIMIENTO_MEXICO) {
        formulario.value.paisNacimiento = PAIS_NACIMIENTO_MEXICO;
      }
    },
  );

  watch(
    () => formulario.value.paisNacimiento,
    (pais) => {
      const paisNum = normalizePaisNacimiento(pais);
      if (paisNum == null) return;
      applyPaisToEntidad(formulario.value, paisNum);
    },
    { immediate: true },
  );
}
