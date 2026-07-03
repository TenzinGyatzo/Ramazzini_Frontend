import { computed } from 'vue';
import { useMedicoFirmanteStore } from '@/stores/medicoFirmante';
import { useEnfermeraFirmanteStore } from '@/stores/enfermeraFirmante';
import { useTecnicoFirmanteStore } from '@/stores/tecnicoFirmante';
import { useCurrentUser } from '@/composables/useCurrentUser';

export function useProfessionalDataValidation() {
  const medicoStore = useMedicoFirmanteStore();
  const enfermeraStore = useEnfermeraFirmanteStore();
  const tecnicoStore = useTecnicoFirmanteStore();
  const { currentUser, ensureUserLoaded } = useCurrentUser();

  const validationResult = computed(() => {
    const role = currentUser.value?.role;
    let firmante: any = null;
    let routeName = '';
    let firmanteTypeLabel = '';

    if (role === 'Médico' || role === 'Principal') {
      firmante = medicoStore.medicoFirmante;
      routeName = 'medico-firmante';
      firmanteTypeLabel = 'Médico';
    } else if (role === 'Enfermero/a') {
      firmante = enfermeraStore.enfermeraFirmante;
      routeName = 'enfermera-firmante';
      firmanteTypeLabel = 'Enfermero/a';
    } else if (role === 'Técnico Evaluador') {
      firmante = tecnicoStore.tecnicoFirmante;
      routeName = 'tecnico-firmante';
      firmanteTypeLabel = 'Técnico Evaluador';
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

    if (!firmante) {
      return {
        isValid: false,
        missingFields: ['nombre', 'primerApellido', 'tituloProfesional', 'numeroCedulaProfesional'],
        routeName,
        firmanteTypeLabel
      };
    }

    const missingFields: string[] = [];
    if (!firmante.nombre || firmante.nombre.trim() === '') missingFields.push('nombre');
    if (!firmante.primerApellido || firmante.primerApellido.trim() === '') missingFields.push('primerApellido');
    if (!firmante.tituloProfesional || firmante.tituloProfesional.trim() === '') missingFields.push('tituloProfesional');
    if (!firmante.numeroCedulaProfesional || firmante.numeroCedulaProfesional.trim() === '') missingFields.push('numeroCedulaProfesional');

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
      if (role === 'Médico' || role === 'Principal') {
        await medicoStore.loadMedicoFirmante(userId);
      } else if (role === 'Enfermero/a') {
        await enfermeraStore.loadEnfermeraFirmante(userId);
      } else if (role === 'Técnico Evaluador') {
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

