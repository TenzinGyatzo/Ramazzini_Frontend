import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';
import {
  aplicaConfirmacionDiagnostico1,
  aplicaConfirmacionDiagnostico23,
  resolveDiagCatalogFlags,
  type DiagCatalogFlags,
} from '@/helpers/confirmacionDiagnostica';
import {
  resolveEffectiveTipoPersonalDgis,
  type MedicoFirmanteLike,
  type EnfermeraFirmanteLike,
} from '@/helpers/notaMedicaDiagnosticosSis';

type ConfirmacionSlot = 1 | 2 | 3;

interface UseConfirmacionDiagnosticaOptions {
  slot: ConfirmacionSlot;
  codigo: Ref<string>;
  edadTrabajador: ComputedRef<number | null>;
  medicoFirmante: Ref<MedicoFirmanteLike>;
  enfermeraFirmante: Ref<EnfermeraFirmanteLike>;
  relacionTemporal?: Ref<number | null>;
  primeraVezDiagnostico?: Ref<number | null>;
}

export function useConfirmacionDiagnostica(options: UseConfirmacionDiagnosticaOptions) {
  const catalogFlags = ref<DiagCatalogFlags | null>(null);
  const tipoPersonal = ref<number | null>(null);

  const refresh = async () => {
    const tipoRes = await resolveEffectiveTipoPersonalDgis(
      options.medicoFirmante.value,
      options.enfermeraFirmante.value,
    );
    tipoPersonal.value = tipoRes.value;

    const code = options.codigo.value?.trim() || '';
    catalogFlags.value = code ? await resolveDiagCatalogFlags(code) : null;
  };

  watch(
    [
      options.codigo,
      options.edadTrabajador,
      options.medicoFirmante,
      options.enfermeraFirmante,
      ...(options.relacionTemporal ? [options.relacionTemporal] : []),
      ...(options.primeraVezDiagnostico ? [options.primeraVezDiagnostico] : []),
    ],
    () => {
      void refresh();
    },
    { immediate: true },
  );

  const muestraConfirmacion = computed(() => {
    const edad = options.edadTrabajador.value;
    if (options.slot === 1) {
      return aplicaConfirmacionDiagnostico1({
        tipoPersonal: tipoPersonal.value,
        edad,
        flags: catalogFlags.value,
        relacionTemporal: options.relacionTemporal?.value ?? null,
      });
    }
    return aplicaConfirmacionDiagnostico23({
      tipoPersonal: tipoPersonal.value,
      edad,
      flags: catalogFlags.value,
      primeraVezDiagnostico: options.primeraVezDiagnostico?.value ?? null,
    });
  });

  return { muestraConfirmacion, refresh, catalogFlags, tipoPersonal };
}
