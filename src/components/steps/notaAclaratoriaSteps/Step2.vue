<script setup>
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { formatDateDDMMYYYY } from '@/helpers/dates';

const { formDataNotaAclaratoria } = useFormDataStore();
const documentos = useDocumentosStore();
const trabajadores = useTrabajadoresStore();

// Valor local para el documento seleccionado
const documentoSeleccionado = ref('');
const selectedEntry = ref(null);
const query = ref('');
const showResults = ref(false);
const hasBlurred = ref(false);

// Mapeo de tipos de documento a nombres legibles
const tipoNombres = {
  'antidopings': 'Antidoping',
  'aptitudes': 'Aptitud Médica',
  'audiometrias': 'Audiometría',
  'certificados': 'Certificado Médico',
  'certificadosExpedito': 'Certificado Médico Expédito',
  'documentosExternos': 'Documento Externo',
  'examenesVista': 'Examen de Vista',
  'exploracionesFisicas': 'Exploración Física',
  'historiasClinicas': 'Historia Clínica',
  'notasMedicas': 'Nota Médica',
  'controlPrenatal': 'Control Prenatal',
  'historiaOtologica': 'Historia Otológica',
  'previoEspirometria': 'Previo Espirometría',
  'recetas': 'Receta',
  'constanciasAptitud': 'Constancia de Aptitud',
  'eventoSeguimientoCardiometabolico': 'Evento de Seguimiento Cardiometabólico',
  'informeLongitudinalCardiometabolico': 'Informe Longitudinal Cardiometabólico',
};

// Mapeo de campos de fecha para cada tipo de documento
const fechaCampos = {
  antidopings: "fechaAntidoping",
  aptitudes: "fechaAptitudPuesto",
  audiometrias: "fechaAudiometria",
  certificados: "fechaCertificado",
  certificadosExpedito: "fechaCertificadoExpedito",
  documentosExternos: "fechaDocumento",
  examenesVista: "fechaExamenVista",
  exploracionesFisicas: "fechaExploracionFisica",
  historiasClinicas: "fechaHistoriaClinica",
  notasMedicas: "fechaNotaMedica",
  controlPrenatal: "fechaInicioControlPrenatal",
  historiaOtologica: "fechaHistoriaOtologica",
  previoEspirometria: "fechaPrevioEspirometria",
  recetas: "fechaReceta",
  constanciasAptitud: "fechaConstanciaAptitud",
  eventoSeguimientoCardiometabolico: "fechaEventoSeguimientoCardiometabolico",
  informeLongitudinalCardiometabolico: "fechaInformeLongitudinalCardiometabolico",
};

// Computed para obtener lista de documentos disponibles (solo FINALIZADOS o ANULADOS)
const documentosDisponibles = computed(() => {
  const opciones = [];
  
  if (!documentos.documentsByYear || Object.keys(documentos.documentsByYear).length === 0) {
    return opciones;
  }

  // Recorrer todos los años y documentos
  Object.values(documentos.documentsByYear).forEach((docsDelAno) => {
    Object.entries(docsDelAno).forEach(([tipoDocumento, documentosArray]) => {
      // Excluir notasAclaratorias
      if (tipoDocumento === 'notasAclaratorias' || !Array.isArray(documentosArray)) {
        return;
      }

      documentosArray.forEach((doc) => {
        // Filtrar solo documentos FINALIZADOS o ANULADOS (excluir BORRADOR)
        const estado = doc.estado?.toLowerCase();
        if (estado !== 'finalizado' && estado !== 'anulado') {
          return;
        }

        const campoFecha = fechaCampos[tipoDocumento];
        const fecha = doc[campoFecha];
        const fechaFormateada = fecha ? formatDateDDMMYYYY(fecha) : 'Sin fecha';
        
        // Para documentos externos, usar nombreDocumento en lugar del tipo genérico
        let nombreMostrar = tipoNombres[tipoDocumento] || tipoDocumento;
        if (tipoDocumento === 'documentosExternos' && doc.nombreDocumento) {
          nombreMostrar = doc.nombreDocumento;
        }
        
        // Obtener información adicional
        const fechaCreacion = doc.createdAt ? formatDateDDMMYYYY(doc.createdAt) : '';
        const fechaFinalizacion = doc.fechaFinalizacion ? formatDateDDMMYYYY(doc.fechaFinalizacion) : '';
        const fechaAnulacion = doc.fechaAnulacion ? formatDateDDMMYYYY(doc.fechaAnulacion) : '';
        // finalizadoPor y anuladoPor pueden ser objetos con username/nombre o strings (IDs)
        const finalizadoPor = typeof doc.finalizadoPor === 'object' 
          ? (doc.finalizadoPor?.username || doc.finalizadoPor?.nombre || '')
          : (doc.finalizadoPor || '');
        const anuladoPor = typeof doc.anuladoPor === 'object'
          ? (doc.anuladoPor?.username || doc.anuladoPor?.nombre || '')
          : (doc.anuladoPor || '');
        
        opciones.push({
          value: `${tipoDocumento}|${doc._id}`,
          tipoDocumento,
          documentoId: doc._id,
          documento: doc, // Guardar el documento completo para referencia
          // Propiedades para mostrar en el dropdown
          nombreMostrar: nombreMostrar,
          fechaCreacion: fechaCreacion,
          fechaFinalizacion: fechaFinalizacion,
          fechaAnulacion: fechaAnulacion,
          finalizadoPor: finalizadoPor,
          anuladoPor: anuladoPor,
          estado: estado
        });
      });
    });
  });

  // Ordenar por nombreMostrar
  return opciones.sort((a, b) => a.nombreMostrar.localeCompare(b.nombreMostrar));
});

onMounted(async () => {
  // Cargar todos los documentos del trabajador
  if (trabajadores.currentTrabajadorId) {
    await documentos.fetchAllDocuments(trabajadores.currentTrabajadorId);
  }

  // Esperar a que los computed se actualicen después de cargar los documentos
  await nextTick();

  // Si se está editando, cargar el valor existente
  if (documentos.currentDocument) {
    const docOrigenTipo = documentos.currentDocument.documentoOrigenTipo;
    const docOrigenId = documentos.currentDocument.documentoOrigenId;
    if (docOrigenTipo && docOrigenId) {
      documentoSeleccionado.value = `${docOrigenTipo}|${docOrigenId}`;
      // Buscar la entrada en los documentos disponibles para mostrar en el input
      const opcion = documentosDisponibles.value.find(
        op => op.tipoDocumento === docOrigenTipo && op.documentoId === docOrigenId
      );
      if (opcion) {
        selectDocumento(opcion);
      }
    }
  } else if (formDataNotaAclaratoria.documentoOrigenTipo && formDataNotaAclaratoria.documentoOrigenId) {
    // Buscar la entrada en los documentos disponibles para mostrar en el input
    const opcion = documentosDisponibles.value.find(
      op => op.tipoDocumento === formDataNotaAclaratoria.documentoOrigenTipo && op.documentoId === formDataNotaAclaratoria.documentoOrigenId
    );
    
    if (opcion) {
      selectDocumento(opcion);
    }
  }
});

onUnmounted(() => {
  // Asegurar que se guarden los valores antes de desmontar
  if (!formDataNotaAclaratoria.documentoOrigenTipo && documentoSeleccionado.value) {
    const [tipo, id] = documentoSeleccionado.value.split('|');
    formDataNotaAclaratoria.documentoOrigenTipo = tipo;
    formDataNotaAclaratoria.documentoOrigenId = id;
  }
});

// Watch para sincronizar cambios
watch(documentoSeleccionado, (newValue) => {
  if (newValue) {
    const [tipo, id] = newValue.split('|');
    formDataNotaAclaratoria.documentoOrigenTipo = tipo;
    formDataNotaAclaratoria.documentoOrigenId = id;
  } else {
    formDataNotaAclaratoria.documentoOrigenTipo = '';
    formDataNotaAclaratoria.documentoOrigenId = '';
  }
});

// Watch para actualizar query cuando cambian los documentos disponibles
watch(documentosDisponibles, () => {
  if (documentoSeleccionado.value && !selectedEntry.value) {
    const [tipo, id] = documentoSeleccionado.value.split('|');
    const opcion = documentosDisponibles.value.find(
      op => op.tipoDocumento === tipo && op.documentoId === id
    );
    if (opcion) {
      selectedEntry.value = opcion;
      query.value = opcion.nombreMostrar;
    }
  }
}, { deep: true });

// Filtrar documentos según query
const filteredDocumentos = computed(() => {
  if (!query.value || query.value.length < 1) {
    return documentosDisponibles.value;
  }
  
  const lowerQuery = query.value.toLowerCase();
  return documentosDisponibles.value.filter(opcion => {
    return opcion.nombreMostrar.toLowerCase().includes(lowerQuery) ||
           (opcion.fechaCreacion && opcion.fechaCreacion.toLowerCase().includes(lowerQuery)) ||
           (opcion.fechaFinalizacion && opcion.fechaFinalizacion.toLowerCase().includes(lowerQuery)) ||
           (opcion.fechaAnulacion && opcion.fechaAnulacion.toLowerCase().includes(lowerQuery)) ||
           (opcion.finalizadoPor && opcion.finalizadoPor.toLowerCase().includes(lowerQuery)) ||
           (opcion.anuladoPor && opcion.anuladoPor.toLowerCase().includes(lowerQuery));
  });
});

// Manejar input
const onInput = (e) => {
  query.value = e.target.value;
  showResults.value = true;
  
  if (!query.value) {
    selectedEntry.value = null;
    documentoSeleccionado.value = '';
    formDataNotaAclaratoria.documentoOrigenTipo = '';
    formDataNotaAclaratoria.documentoOrigenId = '';
  }
};

// Seleccionar documento
const selectDocumento = (opcion) => {
  selectedEntry.value = opcion;
  query.value = opcion.nombreMostrar;
  documentoSeleccionado.value = opcion.value;
  showResults.value = false;
  hasBlurred.value = true;
  formDataNotaAclaratoria.documentoOrigenTipo = opcion.tipoDocumento;
  formDataNotaAclaratoria.documentoOrigenId = opcion.documentoId;
  
  // Si es documento externo, guardar el nombre del documento
  if (opcion.tipoDocumento === 'documentosExternos' && opcion.documento?.nombreDocumento) {
    formDataNotaAclaratoria.documentoOrigenNombre = opcion.documento.nombreDocumento;
  } else {
    // Para otros tipos, limpiar el campo (ya que no se usa)
    formDataNotaAclaratoria.documentoOrigenNombre = undefined;
  }
  
  // Guardar la fecha del documento origen
  const campoFecha = fechaCampos[opcion.tipoDocumento];
  if (campoFecha && opcion.documento?.[campoFecha]) {
    // Usar la fecha específica del tipo de documento
    formDataNotaAclaratoria.documentoOrigenFecha = opcion.documento[campoFecha];
  } else if (opcion.documento?.createdAt) {
    // Si no hay fecha específica, usar createdAt como fallback
    formDataNotaAclaratoria.documentoOrigenFecha = opcion.documento.createdAt;
  } else {
    formDataNotaAclaratoria.documentoOrigenFecha = undefined;
  }
};

// Manejar focus
const onFocus = () => {
  showResults.value = true;
};

// Manejar blur
const hideResults = () => {
  setTimeout(() => {
    showResults.value = false;
    hasBlurred.value = true;
    // Si hay una entrada seleccionada, restaurar el nombre
    if (selectedEntry.value && query.value !== selectedEntry.value.nombreMostrar) {
      query.value = selectedEntry.value.nombreMostrar;
    }
  }, 200);
};
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900">DOCUMENTO QUE SE ACLARA</h1>
    
    <div class="mb-4">
      <label class="block text-lg font-medium mb-3 text-gray-800">
        Seleccione el documento que desea aclarar:
      </label>
      <div class="relative">
        <input
          type="text"
          :value="query"
          @input="onInput"
          @focus="onFocus"
          @blur="hideResults"
          class="w-full h-12 p-2.5 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          placeholder="Buscar documento por nombre, fecha o usuario..."
          autocomplete="off"
        />
        
        <!-- Dropdown con resultados -->
        <ul v-if="showResults && filteredDocumentos.length > 0" 
            class="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-96 overflow-y-auto">
          <li 
            v-for="opcion in filteredDocumentos" 
            :key="opcion.value"
            @click="selectDocumento(opcion)"
            class="p-3 hover:bg-emerald-50 cursor-pointer border-b last:border-b-0 transition-colors"
          >
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <span class="font-bold text-emerald-700 text-base block mb-1">{{ opcion.nombreMostrar }}</span>
                
                <!-- Información del documento en múltiples líneas -->
                <div class="text-sm text-gray-700 space-y-0.5">
                  <p v-if="opcion.fechaCreacion" class="text-gray-600">
                    <span class="font-medium">Creado:</span> {{ opcion.fechaCreacion }}
                  </p>
                  <p v-if="opcion.fechaFinalizacion" class="text-gray-600">
                    <span class="font-medium">Finalizado:</span> {{ opcion.fechaFinalizacion }}
                    <span v-if="opcion.finalizadoPor" class="text-gray-500"> (por {{ opcion.finalizadoPor }})</span>
                  </p>
                  <p v-if="opcion.fechaAnulacion" class="text-red-600">
                    <span class="font-medium">Anulado:</span> {{ opcion.fechaAnulacion }}
                    <span v-if="opcion.anuladoPor" class="text-gray-500"> (por {{ opcion.anuladoPor }})</span>
                  </p>
                </div>
              </div>
            </div>
          </li>
        </ul>

        <div v-else-if="showResults && query.length >= 1 && filteredDocumentos.length === 0" 
             class="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl p-3 text-gray-500 text-center text-sm italic">
          No se encontraron documentos para "{{ query }}"
        </div>
      </div>
    </div>

    <!-- Información adicional -->
    <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 class="text-xs font-medium text-blue-900 mb-2">Información importante:</h4>
          <ul class="text-xs text-blue-800 space-y-1">
            <li>• Seleccione el documento clínico que necesita ser aclarado</li>
            <li>• Solo puede seleccionar documentos finalizados o anulados</li>
            <li>• La nota aclaratoria quedará vinculada al documento seleccionado</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

