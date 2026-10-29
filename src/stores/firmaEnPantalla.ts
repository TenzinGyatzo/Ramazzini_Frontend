import { defineStore } from 'pinia';
import { ref } from 'vue';
import FormatosFirmadosAPI, { type ConfiguracionFirmaEnPantalla } from '@/api/FormatosFirmadosAPI';

/**
 * Si el proveedor tiene encendida la firma en pantalla. Se consulta al iniciar sesión, sin
 * esperar la respuesta, para que la ventana «Formatos para firma» se abra ya con su forma final.
 */
export const useFirmaEnPantallaStore = defineStore('firmaEnPantalla', () => {
  const habilitada = ref(false);
  const cargado = ref(false);
  let cargaEnCurso: Promise<void> | null = null;

  function aplicar(config: ConfiguracionFirmaEnPantalla) {
    habilitada.value = config.firmaEnPantallaHabilitada === true;
    cargado.value = true;
  }

  /** Una sola petición por sesión; `forzar` vuelve a consultar. */
  async function cargarConfiguracion(forzar = false) {
    if (cargado.value && !forzar) return;
    if (!cargaEnCurso) {
      cargaEnCurso = FormatosFirmadosAPI.getConfiguracion()
        .then(({ data }) => aplicar(data))
        .catch(() => {
          // Sin configuración queda solo el papel
          aplicar({ firmaEnPantallaHabilitada: false });
        })
        .finally(() => {
          cargaEnCurso = null;
        });
    }
    await cargaEnCurso;
  }

  return { habilitada, cargado, aplicar, cargarConfiguracion };
});
