import api from '@/lib/axios';

/** Lo que muestra la página «Módulos y funciones», en una sola llamada. */
export interface EstadoModulosFunciones {
  firmaEnPantallaHabilitada: boolean;
  semaforizacionActivada: boolean;
  inventarioHabilitado: boolean;
  inventarioControlaAntidoping: boolean;
}

export default {
  getEstado(): Promise<{ data: EstadoModulosFunciones }> {
    return api.get('/modulos-funciones');
  },

  actualizarSemaforizacion(semaforizacionActivada: boolean): Promise<{ data: EstadoModulosFunciones }> {
    return api.patch('/modulos-funciones/semaforizacion', { semaforizacionActivada });
  },
};
