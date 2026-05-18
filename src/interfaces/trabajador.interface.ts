export interface Trabajador {
  _id: string;
  primerApellido: string;
  segundoApellido: string;
  nombre: string;
  fechaNacimiento: string;
  sexo: string;
  escolaridad: string;
  puesto: string;
  fechaIngreso?: string;
  telefono: string;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
  estadoCivil: string;
  numeroEmpleado: string;
  nss: string;
  curp?: string;
  estadoLaboral: string;
  idCentroTrabajo: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  fechaTransferencia?: string;
}
