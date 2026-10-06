import { defineStore } from 'pinia';
import { ref } from 'vue';
import InventarioAPI from '@/api/InventarioAPI';
import type { ConfiguracionInventario } from '@/interfaces/inventario.interface';

/** Configuración del inventario del proveedor: decide qué se muestra en el resto de la app. */
export const useInventarioStore = defineStore('inventario', () => {
  const habilitado = ref(false);
  const diasAvisoCaducidad = ref(90);
  const controlaAntidoping = ref(false);
  const cargado = ref(false);
  let cargaEnCurso: Promise<void> | null = null;

  function aplicar(config: ConfiguracionInventario) {
    habilitado.value = config.inventarioHabilitado === true;
    diasAvisoCaducidad.value = config.inventarioDiasAvisoCaducidad ?? 90;
    controlaAntidoping.value = config.inventarioControlaAntidoping === true;
    cargado.value = true;
  }

  /** Una sola petición por sesión; `forzar` vuelve a consultar. */
  async function cargarConfiguracion(forzar = false) {
    if (cargado.value && !forzar) return;
    if (!cargaEnCurso) {
      cargaEnCurso = InventarioAPI.getConfiguracion()
        .then(({ data }) => aplicar(data))
        .catch(() => {
          // Sin configuración el inventario se trata como apagado
          habilitado.value = false;
        })
        .finally(() => {
          cargaEnCurso = null;
        });
    }
    await cargaEnCurso;
  }

  async function guardarConfiguracion(cambios: Partial<ConfiguracionInventario>) {
    const { data } = await InventarioAPI.updateConfiguracion(cambios);
    aplicar(data);
  }

  function reset() {
    habilitado.value = false;
    diasAvisoCaducidad.value = 90;
    controlaAntidoping.value = false;
    cargado.value = false;
  }

  return {
    habilitado,
    diasAvisoCaducidad,
    controlaAntidoping,
    cargado,
    cargarConfiguracion,
    guardarConfiguracion,
    reset,
  };
});
