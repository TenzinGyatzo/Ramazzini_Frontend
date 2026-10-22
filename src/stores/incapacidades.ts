import { defineStore } from 'pinia';
import { ref } from 'vue';
import ModulosFuncionesAPI, { type ConfiguracionIncapacidades } from '@/api/ModulosFuncionesAPI';

/**
 * Dónde se gestionan incapacidades (docs/modulos-y-funciones-especificacion.md, 4): módulo encendido
 * en un proveedor de México y empresa elegida. El permiso accesoRiesgosTrabajo lo revisa cada pantalla.
 */
export const useIncapacidadesStore = defineStore('incapacidades', () => {
  const disponible = ref(false);
  const habilitado = ref(false);
  const empresasConIncapacidades = ref<string[]>([]);
  const cargado = ref(false);
  let cargaEnCurso: Promise<void> | null = null;

  function aplicar(config: ConfiguracionIncapacidades) {
    disponible.value = config.incapacidadesDisponible === true;
    habilitado.value = config.incapacidadesHabilitado === true;
    empresasConIncapacidades.value = (config.empresasConIncapacidades ?? []).map(String);
    cargado.value = true;
  }

  /** La empresa gestiona incapacidades: módulo encendido y empresa elegida. */
  function gestionaEnEmpresa(idEmpresa: unknown): boolean {
    return (
      disponible.value &&
      habilitado.value &&
      !!idEmpresa &&
      empresasConIncapacidades.value.includes(String(idEmpresa))
    );
  }

  /** Una sola petición por sesión; `forzar` vuelve a consultar. */
  async function cargarConfiguracion(forzar = false) {
    if (cargado.value && !forzar) return;
    if (!cargaEnCurso) {
      cargaEnCurso = ModulosFuncionesAPI.getIncapacidades()
        .then(({ data }) => aplicar(data))
        .catch(() => {
          // Sin configuración el módulo se trata como apagado
          habilitado.value = false;
        })
        .finally(() => {
          cargaEnCurso = null;
        });
    }
    await cargaEnCurso;
  }

  function reset() {
    disponible.value = false;
    habilitado.value = false;
    empresasConIncapacidades.value = [];
    cargado.value = false;
  }

  return {
    disponible,
    habilitado,
    empresasConIncapacidades,
    gestionaEnEmpresa,
    cargado,
    aplicar,
    cargarConfiguracion,
    reset,
  };
});
