import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useMedicoFirmanteStore } from '@/stores/medicoFirmante';
import { useEnfermeraFirmanteStore } from '@/stores/enfermeraFirmante';
import { useTecnicoFirmanteStore } from '@/stores/tecnicoFirmante';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { resolveFirmanteTipo } from '@/constants/rolePermissionPolicy';

type FirmanteRecord = Record<string, unknown>;

// En el Principal el tipo de firmante depende de su perfil profesional, no del rol
export function getFirmanteRouteNameByRole(
  role: string | undefined,
  perfilProfesional?: string | null,
): string {
  const tipo = resolveFirmanteTipo(role, perfilProfesional);
  if (tipo === 'medico') return 'medico-firmante';
  if (tipo === 'enfermera') return 'enfermera-firmante';
  if (tipo === 'tecnico') return 'tecnico-evaluador-firmante';
  return '';
}

export function getFirmanteTypeLabelByRole(
  role: string | undefined,
  perfilProfesional?: string | null,
): string {
  const tipo = resolveFirmanteTipo(role, perfilProfesional);
  if (tipo === 'medico') return 'Médico';
  if (tipo === 'enfermera') return 'Enfermero/a';
  if (tipo === 'tecnico') return 'Técnico Evaluador';
  return '';
}

export function getRequiredFieldsByRole(
  role: string | undefined,
  perfilProfesional?: string | null,
): string[] {
  const tipo = resolveFirmanteTipo(role, perfilProfesional);
  const required = ['nombre', 'primerApellido', 'tituloProfesional'];
  if (tipo === 'medico' || tipo === 'enfermera') {
    required.push('numeroCedulaProfesional');
  }
  return required;
}

export function getMissingFields(
  firmante: FirmanteRecord | null,
  role: string | undefined,
  perfilProfesional?: string | null,
): string[] {
  const requiredFields = getRequiredFieldsByRole(role, perfilProfesional);

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
  perfilProfesional: string | null | undefined,
  medicoFirmante: FirmanteRecord | null,
  enfermeraFirmante: FirmanteRecord | null,
  tecnicoFirmante: FirmanteRecord | null,
) {
  const tipo = resolveFirmanteTipo(role, perfilProfesional);
  if (tipo === 'medico') return medicoFirmante;
  if (tipo === 'enfermera') return enfermeraFirmante;
  if (tipo === 'tecnico') return tecnicoFirmante;
  return null;
}

export function buildProfessionalDataValidation(
  role: string | undefined,
  firmante: FirmanteRecord | null,
  perfilProfesional?: string | null,
) {
  if (!resolveFirmanteTipo(role, perfilProfesional)) {
    return {
      isValid: true,
      missingFields: [] as string[],
      routeName: '',
      firmanteTypeLabel: '',
    };
  }

  const missingFields = getMissingFields(firmante, role, perfilProfesional);

  return {
    isValid: missingFields.length === 0,
    missingFields,
    routeName: getFirmanteRouteNameByRole(role, perfilProfesional),
    firmanteTypeLabel: getFirmanteTypeLabelByRole(role, perfilProfesional),
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
    const perfilProfesional = currentUser.value?.perfilProfesional;
    const firmante = getFirmanteForRole(
      role,
      perfilProfesional,
      medicoFirmante.value as FirmanteRecord | null,
      enfermeraFirmante.value as FirmanteRecord | null,
      tecnicoFirmante.value as FirmanteRecord | null,
    );

    return buildProfessionalDataValidation(role, firmante, perfilProfesional);
  });

  const loadFirmanteData = async () => {
    const userId = await ensureUserLoaded();
    if (!userId) return;

    const tipo = resolveFirmanteTipo(
      currentUser.value?.role,
      currentUser.value?.perfilProfesional,
    );
    try {
      if (tipo === 'medico') {
        await medicoStore.loadMedicoFirmante(userId);
      } else if (tipo === 'enfermera') {
        await enfermeraStore.loadEnfermeraFirmante(userId);
      } else if (tipo === 'tecnico') {
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
