import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useMedicoFirmanteStore } from '@/stores/medicoFirmante';
import { useEnfermeraFirmanteStore } from '@/stores/enfermeraFirmante';
import { useTecnicoFirmanteStore } from '@/stores/tecnicoFirmante';
import { useCurrentUser } from '@/composables/useCurrentUser';

type FirmanteRecord = Record<string, unknown>;

export function getFirmanteRouteNameByRole(role: string | undefined): string {
  if (role === 'Médico' || role === 'Principal' || role === 'Administrador') {
    return 'medico-firmante';
  }
  if (role === 'Enfermero/a') {
    return 'enfermera-firmante';
  }
  if (role === 'Técnico Evaluador') {
    return 'tecnico-evaluador-firmante';
  }
  return '';
}

export function getFirmanteTypeLabelByRole(role: string | undefined): string {
  if (role === 'Médico' || role === 'Principal' || role === 'Administrador') {
    return 'Médico';
  }
  if (role === 'Enfermero/a') {
    return 'Enfermero/a';
  }
  if (role === 'Técnico Evaluador') {
    return 'Técnico Evaluador';
  }
  return '';
}

function isMedicoRole(role: string | undefined): boolean {
  return role === 'Médico' || role === 'Principal' || role === 'Administrador';
}

function isEnfermeraRole(role: string | undefined): boolean {
  return role === 'Enfermero/a';
}

function isTecnicoRole(role: string | undefined): boolean {
  return role === 'Técnico Evaluador';
}

export function getRequiredFieldsByRole(role: string | undefined): string[] {
  const required = ['nombre', 'primerApellido', 'tituloProfesional'];
  if (isMedicoRole(role) || isEnfermeraRole(role)) {
    required.push('numeroCedulaProfesional');
  }
  return required;
}

export function getMissingFields(
  firmante: FirmanteRecord | null,
  role: string | undefined,
): string[] {
  const requiredFields = getRequiredFieldsByRole(role);

  if (!firmante) {
    return requiredFields;
  }

  const missingFields: string[] = [];
  for (const field of requiredFields) {
    const value = firmante[field];
    if (typeof value !== 'string' || value.trim() === '') {
      missingFields.push(field);
    }
  }

  return missingFields;
}

function getFirmanteForRole(
  role: string | undefined,
  medicoFirmante: FirmanteRecord | null,
  enfermeraFirmante: FirmanteRecord | null,
  tecnicoFirmante: FirmanteRecord | null,
) {
  if (isMedicoRole(role)) return medicoFirmante;
  if (isEnfermeraRole(role)) return enfermeraFirmante;
  if (isTecnicoRole(role)) return tecnicoFirmante;
  return null;
}

export function buildProfessionalDataValidation(
  role: string | undefined,
  firmante: FirmanteRecord | null,
) {
  if (!isMedicoRole(role) && !isEnfermeraRole(role) && !isTecnicoRole(role)) {
    return {
      isValid: true,
      missingFields: [] as string[],
      routeName: '',
      firmanteTypeLabel: '',
    };
  }

  const missingFields = getMissingFields(firmante, role);

  return {
    isValid: missingFields.length === 0,
    missingFields,
    routeName: getFirmanteRouteNameByRole(role),
    firmanteTypeLabel: getFirmanteTypeLabelByRole(role),
  };
}

export function useProfessionalDataValidation() {
  const medicoStore = useMedicoFirmanteStore();
  const enfermeraStore = useEnfermeraFirmanteStore();
  const tecnicoStore = useTecnicoFirmanteStore();
  const { currentUser, ensureUserLoaded } = useCurrentUser();

  const { medicoFirmante } = storeToRefs(medicoStore);
  const { enfermeraFirmante } = storeToRefs(enfermeraStore);
  const { tecnicoFirmante } = storeToRefs(tecnicoStore);

  const validationResult = computed(() => {
    const role = currentUser.value?.role;
    const firmante = getFirmanteForRole(
      role,
      medicoFirmante.value as FirmanteRecord | null,
      enfermeraFirmante.value as FirmanteRecord | null,
      tecnicoFirmante.value as FirmanteRecord | null,
    );

    return buildProfessionalDataValidation(role, firmante);
  });

  const loadFirmanteData = async () => {
    const userId = await ensureUserLoaded();
    if (!userId) return;

    const role = currentUser.value?.role;
    try {
      if (isMedicoRole(role)) {
        await medicoStore.loadMedicoFirmante(userId);
      } else if (isEnfermeraRole(role)) {
        await enfermeraStore.loadEnfermeraFirmante(userId);
      } else if (isTecnicoRole(role)) {
        await tecnicoStore.loadTecnicoFirmante(userId);
      }
    } catch (error) {
      console.error('Error loading firmante data for validation:', error);
    }
  };

  const ensureProfessionalDataReady = async () => {
    await loadFirmanteData();
    return validationResult.value;
  };

  return {
    validationResult,
    loadFirmanteData,
    ensureProfessionalDataReady,
    loading: computed(() => medicoStore.loading || enfermeraStore.loading || tecnicoStore.loading),
  };
}
