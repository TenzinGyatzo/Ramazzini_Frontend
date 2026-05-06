/** Objeto población mínimo devuelta por Mongoose después de populate. */
export interface UserPopulateRef {
  _id?: string;
  username?: string;
}

/** Registro operaivo seguimiento programado cardiometabólico (API lista/detalle). */
export interface SeguimientoProgramadoCardiometabolico {
  _id: string;
  idTrabajador: string;
  fechaProgramada: string;
  estado: string;
  idEventoClinico?: string | { _id?: string; fechaEventoSeguimientoCardiometabolico?: string; motivoSeguimiento?: string };
  fechaReprogramada?: string;
  idSeguimientoReprogramado?: string | { _id?: string; fechaProgramada?: string; estado?: string };
  observaciones?: string;
  motivo?: string;
  createdBy?: string | UserPopulateRef;
  updatedBy?: string | UserPopulateRef;
  createdAt?: string;
  updatedAt?: string;
}
