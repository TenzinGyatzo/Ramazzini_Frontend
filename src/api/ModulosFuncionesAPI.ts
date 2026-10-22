import api from '@/lib/axios';

/** Lo que muestra la página «Módulos y funciones», en una sola llamada. */
export interface EstadoModulosFunciones {
  firmaEnPantallaHabilitada: boolean;
  semaforizacionActivada: boolean;
  inventarioHabilitado: boolean;
  inventarioControlaAntidoping: boolean;
  /** Solo proveedores de México. */
  incapacidadesDisponible: boolean;
  incapacidadesHabilitado: boolean;
}

/** Si el módulo de incapacidades está encendido y en qué empresas (cualquier usuario). */
export interface ConfiguracionIncapacidades {
  incapacidadesDisponible: boolean;
  incapacidadesHabilitado: boolean;
  empresasConIncapacidades: string[];
}

export interface EmpresaIncapacidades {
  idEmpresa: string;
  nombreEmpresa: string;
  incapacidadesHabilitado: boolean;
  numeroTrabajadores: number;
}

export default {
  getEstado(): Promise<{ data: EstadoModulosFunciones }> {
    return api.get('/modulos-funciones');
  },

  actualizarSemaforizacion(semaforizacionActivada: boolean): Promise<{ data: EstadoModulosFunciones }> {
    return api.patch('/modulos-funciones/semaforizacion', { semaforizacionActivada });
  },

  getIncapacidades(): Promise<{ data: ConfiguracionIncapacidades }> {
    return api.get('/modulos-funciones/incapacidades');
  },

  actualizarIncapacidades(incapacidadesHabilitado: boolean): Promise<{ data: ConfiguracionIncapacidades }> {
    return api.patch('/modulos-funciones/incapacidades', { incapacidadesHabilitado });
  },

  /** Empresas con su número de trabajadores (solo el Principal). */
  getEmpresasIncapacidades(): Promise<{ data: EmpresaIncapacidades[] }> {
    return api.get('/modulos-funciones/incapacidades/empresas');
  },

  updateEmpresasIncapacidades(
    cambios: { idEmpresa: string; incapacidadesHabilitado: boolean }[],
  ): Promise<{ data: EmpresaIncapacidades[] }> {
    return api.patch('/modulos-funciones/incapacidades/empresas', { cambios });
  },
};
