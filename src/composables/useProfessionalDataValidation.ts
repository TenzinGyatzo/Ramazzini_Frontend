import { computed } from 'vue';
import { useMedicoFirmanteStore } from '@/stores/medicoFirmante';
import { useEnfermeraFirmanteStore } from '@/stores/enfermeraFirmante';
import { useTecnicoFirmanteStore } from '@/stores/tecnicoFirmante';
import { useCurrentUser } from '@/composables/useCurrentUser';

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

function getRequiredFieldsByRole(role: string | undefined): string[] {
  const required = ['nombre', 'primerApellido', 'tituloProfesional'];
  if (isMedicoRole(role) || isEnfermeraRole(role)) {
    required.push('numeroCedulaProfesional');
  }
  return required;
}

function getMissingFields(
  firmante: Record<string, string | undefined> | null,
  role: string | undefined,
): string[] {
  const requiredFields = getRequiredFieldsByRole(role);

  if (!firmante) {
    return requiredFields;
  }

  const missingFields: string[] = [];
  for (const field of requiredFields) {
    const value = firmante[field];
    if (!value || value.trim() === '') {
      missingFields.push(field);
    }
  }

  return missingFields;
}

export function useProfessionalDataValidation() {
  const medicoStore = useMedicoFirmanteStore();
  const enfermeraStore = useEnfermeraFirmanteStore();
  const tecnicoStore = useTecnicoFirmanteStore();
  const { currentUser, ensureUserLoaded } = useCurrentUser();

  const validationResult = computed(() => {
    const role = currentUser.value?.role;
    let firmante: any = null;
    const routeName = getFirmanteRouteNameByRole(role);
    const firmanteTypeLabel = getFirmanteTypeLabelByRole(role);

    if (isMedicoRole(role)) {
      firmante = medicoStore.medicoFirmante;
    } else if (isEnfermeraRole(role)) {
      firmante = enfermeraStore.enfermeraFirmante;
    } else if (isTecnicoRole(role)) {
      firmante = tecnicoStore.tecnicoFirmante;
    } else {
      // Para otros roles (como Administrativo que ya tiene restricciones), 
      // o si no hay rol, no validamos firmante
      return {
        isValid: true,
        missingFields: [],
        routeName: '',
        firmanteTypeLabel: ''
      };
    }

    const missingFields = getMissingFields(firmante, role);

    return {
      isValid: missingFields.length === 0,
      missingFields,
      routeName,
      firmanteTypeLabel
    };
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

  return {
    validationResult,
    loadFirmanteData,
    loading: computed(() => medicoStore.loading || enfermeraStore.loading || tecnicoStore.loading)
  };
}

