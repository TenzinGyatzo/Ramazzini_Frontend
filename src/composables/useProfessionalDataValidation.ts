import { computed, ref } from 'vue';
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

/** Documento para el que la enfermera sí necesita su cédula profesional. */
export const DOCUMENTO_QUE_EXIGE_CEDULA_ENFERMERIA = 'notaMedica';

/**
 * Campos que el firmante debe tener para crear el documento.
 * Médicos: cédula siempre. Enfermería: cédula solo para la Nota médica; los demás
 * documentos se crean sin ella (el pie de página la omite).
 */
export function getRequiredFieldsByRole(
  role: string | undefined,
  perfilProfesional?: string | null,
  tipoDocumento?: string | null,
): string[] {
  const tipo = resolveFirmanteTipo(role, perfilProfesional);
  const required = ['nombre', 'primerApellido', 'tituloProfesional'];
  if (
    tipo === 'medico' ||
    (tipo === 'enfermera' && tipoDocumento === DOCUMENTO_QUE_EXIGE_CEDULA_ENFERMERIA)
  ) {
    required.push('numeroCedulaProfesional');
  }
  return required;
}

export function getMissingFields(
  firmante: FirmanteRecord | null,
  role: string | undefined,
  perfilProfesional?: string | null,
  tipoDocumento?: string | null,
): string[] {
  const requiredFields = getRequiredFieldsByRole(role, perfilProfesional, tipoDocumento);

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
  tipoDocumento?: string | null,
) {
  if (!resolveFirmanteTipo(role, perfilProfesional)) {
    return {
      isValid: true,
      missingFields: [] as string[],
      routeName: '',
      firmanteTypeLabel: '',
      tipoDocumento: tipoDocumento ?? null,
    };
  }

  const missingFields = getMissingFields(firmante, role, perfilProfesional, tipoDocumento);

  return {
    isValid: missingFields.length === 0,
    missingFields,
    routeName: getFirmanteRouteNameByRole(role, perfilProfesional),
    firmanteTypeLabel: getFirmanteTypeLabelByRole(role, perfilProfesional),
    tipoDocumento: tipoDocumento ?? null,
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

  // Documento que se intenta crear (la cédula de enfermería depende de él)
  const tipoDocumentoEvaluado = ref<string | null>(null);

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

    return buildProfessionalDataValidation(
      role,
      firmante,
      perfilProfesional,
      tipoDocumentoEvaluado.value,
    );
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

  // Con los datos de este usuario ya cargados y completos no se espera al servidor; si faltan
  // se vuelve a consultar, por si los completó en otra pestaña
  const firmanteCargadoCompleto = () => {
    const userId = currentUser.value?._id;
    if (!userId || !validationResult.value.isValid) return false;
    const role = currentUser.value?.role;
    const perfilProfesional = currentUser.value?.perfilProfesional;
    if (!resolveFirmanteTipo(role, perfilProfesional)) return true;
    const firmante = getFirmanteForRole(
      role,
      perfilProfesional,
      medicoFirmante.value as FirmanteRecord | null,
      enfermeraFirmante.value as FirmanteRecord | null,
      tecnicoFirmante.value as FirmanteRecord | null,
    );
    return String(firmante?.idUser ?? '') === String(userId);
  };

  const ensureProfessionalDataReady = async (tipoDocumento?: string | null) => {
    tipoDocumentoEvaluado.value = tipoDocumento ?? null;
    if (firmanteCargadoCompleto()) return validationResult.value;
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
