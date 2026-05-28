import * as xlsx from 'xlsx';

export function exportarTrabajadoresDesdeFrontend(trabajadoresFiltrados: any[], nombreArchivo = 'trabajadores.xlsx') {
  // Verificar si hay números de empleado válidos (solo números, máximo 7 dígitos)
  const tieneNumerosEmpleadoValidos = trabajadoresFiltrados.some(trabajador => {
    const numeroEmpleado = trabajador.numeroEmpleado;
    return numeroEmpleado && 
           numeroEmpleado !== '-' && 
           numeroEmpleado !== '' && 
           /^\d{1,7}$/.test(numeroEmpleado);
  });

  const trabajadoresData = trabajadoresFiltrados.map(trabajador => {
    const baseData: any = {};

    // Si hay números de empleado válidos, ponerlo como primera columna
    if (tieneNumerosEmpleadoValidos) {
      baseData['Num. Trab.'] = trabajador.numeroEmpleado;
    }
    baseData['Primer Apellido'] = trabajador.primerApellido;
    baseData['Segundo Apellido'] = trabajador.segundoApellido;
    baseData.Nombre = trabajador.nombre;
    baseData['NSS'] = trabajador.nss;
    baseData.Edad = trabajador.edad;
    baseData.Sexo = trabajador.sexo;
    baseData.Escolaridad = trabajador.escolaridad;
    
    // Campos de identificación NOM-024
    baseData['Entidad Nacimiento'] = trabajador.entidadNacimiento || '';
    baseData['País de Nacimiento'] = trabajador.paisNacimiento ?? '';
    baseData['Entidad Residencia'] = trabajador.entidadResidencia || '';
    baseData['Municipio Residencia'] = trabajador.municipioResidencia || '';
    baseData['Localidad Residencia'] = trabajador.localidadResidencia || '';
    
    baseData.Puesto = trabajador.puesto;
    baseData.Antigüedad = trabajador.antiguedad;
    baseData.Teléfono = trabajador.telefono;
    baseData['Estado Civil'] = trabajador.estadoCivil;
    baseData.IMC = trabajador.imc;
    baseData['Circunferencia Cintura'] = trabajador.cintura;
    baseData['Tensión Arterial'] = trabajador.categoriaTensionArterial;
    baseData['Requiere Lentes'] = trabajador.requiereLentes;
    baseData['Vista Corregida'] = trabajador.correccionVisual ? 'Corregida' : 'Sin corregir';
    baseData.Daltonismo = trabajador.daltonismo;
    baseData['Agudeza Visual'] = trabajador.agudeza;
    baseData['Lumbalgia'] = trabajador.lumbalgia;
    baseData.Diabético = trabajador.diabetico;
    baseData['Cardiopático'] = trabajador.cardiopatico;
    baseData['Alergias'] = trabajador.alergia;
    baseData.Hipertensivo = trabajador.hipertensivo;
    baseData['Respiratorio'] = trabajador.respiratorios;
    baseData['Epilepsia'] = trabajador.epilepsia;
    baseData['Quirúrgico'] = trabajador.quirurgico;
    baseData['Otros'] = trabajador.otro;
    baseData['Alcoholismo'] = trabajador.alcoholismo;
    baseData['Tabaquismo'] = trabajador.tabaquismo;
    baseData['Accidente Laboral'] = trabajador.accidente;
    baseData.Aptitud = trabajador.aptitud;
    baseData['Audiometría'] = trabajador.audiometria;
    baseData['Categoría Audiometría'] = trabajador.categoriaAudiometria;
    baseData['Espirometría (RC)'] = trabajador.espirometriaRc;
    baseData['EKG (RC)'] = trabajador.ekgRc;
    baseData['Rayos X (RC)'] = trabajador.rayosXRc;
    baseData['Laboratorio (RC)'] = trabajador.laboratorioRc;
    baseData['Agentes de Riesgo'] = trabajador.agentesRiesgo;
    baseData.Consultas = trabajador.consultas;
    baseData['Estado Laboral'] = trabajador.estadoLaboral;

    return baseData;
  });

  const worksheet = xlsx.utils.json_to_sheet([]);

  // Agregar encabezados y datos como tabla desde A1
  xlsx.utils.sheet_add_json(worksheet, trabajadoresData, {
    origin: 'A1',
    skipHeader: false
  });

  // Agregar propiedad para que Excel lo trate como tabla
  worksheet['!autofilter'] = {
    ref: worksheet['!ref'] || ''
  };

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Trabajadores');

  const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nombreArchivo;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportarRiesgosTrabajoDesdeFrontend(riesgosFiltrados: any[], nombreArchivo = 'riesgos-trabajo.xlsx') {
  const worksheet = xlsx.utils.json_to_sheet(riesgosFiltrados);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'RiesgosTrabajo');

  const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nombreArchivo;
  link.click();
  URL.revokeObjectURL(link.href);
}
