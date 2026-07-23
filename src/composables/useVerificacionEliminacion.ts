import { ref } from 'vue';
import AuthAPI from '@/api/AuthAPI';
import { textosConfirmacionCoinciden } from '@/config/eliminacion';

export interface VerificacionEliminacionContext {
  resourceType?: string;
  resourceId?: string;
}

export function useVerificacionEliminacion() {
  const password = ref('');
  const textoConfirmacion = ref('');
  const error = ref('');
  const verifying = ref(false);
  const auditContext = ref<VerificacionEliminacionContext>({});

  function setAuditContext(ctx: VerificacionEliminacionContext) {
    auditContext.value = ctx ?? {};
  }

  async function verificar(): Promise<boolean> {
    error.value = '';
    if (!password.value.trim()) {
      error.value = 'Ingresa tu contraseña';
      return false;
    }

    verifying.value = true;
    try {
      await AuthAPI.verifyCurrentPassword(password.value, {
        purpose: 'deletion',
        resourceType: auditContext.value.resourceType,
        resourceId: auditContext.value.resourceId,
      });
      return true;
    } catch {
      error.value = 'Contraseña incorrecta';
      return false;
    } finally {
      verifying.value = false;
    }
  }

  function validarTextoConfirmacion(ingresado: string, esperado: string): boolean {
    if (!textosConfirmacionCoinciden(ingresado, esperado)) {
      error.value = 'El texto no coincide con el nombre del registro';
      return false;
    }
    error.value = '';
    return true;
  }

  function reset() {
    password.value = '';
    textoConfirmacion.value = '';
    error.value = '';
    verifying.value = false;
    auditContext.value = {};
  }

  return {
    password,
    textoConfirmacion,
    error,
    verifying,
    setAuditContext,
    verificar,
    validarTextoConfirmacion,
    reset,
  };
}
