<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const mensajeCopiado = ref(false);

const { formDataAudiometria } = useFormDataStore();
const documentos = useDocumentosStore();

/** === 1) TEXTAREA: usa ref local y sincroniza al store === */
const interpretacionAudiometrica = ref(formDataAudiometria.interpretacionAudiometrica || '');

onMounted(() => {
  if (documentos.currentDocument?.interpretacionAudiometrica) {
    interpretacionAudiometrica.value = documentos.currentDocument.interpretacionAudiometrica;
  }
});

watch(interpretacionAudiometrica, (newValue) => {
  formDataAudiometria.interpretacionAudiometrica = newValue ?? '';
});

/** === 2) UTILIDAD COPIAR === */
const copiarTexto = async (texto) => {
  try {
    await navigator.clipboard.writeText(texto);
    mensajeCopiado.value = true;
    setTimeout(() => (mensajeCopiado.value = false), 2000);
  } catch (err) {
    console.error('Error al copiar el texto: ', err);
  }
};

/** =========================================================================================
 * 3) GENERACIÓN AUTOMÁTICA DE INTERPRETACIÓN AUDIOMÉTRICA
 * ======================================================================================= */

// Generar interpretación automática basada en los valores audiométricos
const interpretacionAutomatica = computed(() => {
  const {
    oidoDerecho125, oidoDerecho250, oidoDerecho500, oidoDerecho1000, oidoDerecho2000, oidoDerecho3000, oidoDerecho4000, oidoDerecho6000, oidoDerecho8000,
    oidoIzquierdo125, oidoIzquierdo250, oidoIzquierdo500, oidoIzquierdo1000, oidoIzquierdo2000, oidoIzquierdo3000, oidoIzquierdo4000, oidoIzquierdo6000, oidoIzquierdo8000
  } = formDataAudiometria;

  // Helper: convertir a número o NaN si viene vacío
  const n = (v) => (v === "" || v === null || v === undefined) ? NaN : Number(v);

  // Definición de oídos con frecuencias ordenadas
  const frecuencias = [125, 250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
  const oidoDerecho = {
    125: n(oidoDerecho125), 250: n(oidoDerecho250), 500: n(oidoDerecho500), 1000: n(oidoDerecho1000),
    2000: n(oidoDerecho2000), 3000: n(oidoDerecho3000), 4000: n(oidoDerecho4000), 6000: n(oidoDerecho6000), 8000: n(oidoDerecho8000)
  };
  const oidoIzquierdo = {
    125: n(oidoIzquierdo125), 250: n(oidoIzquierdo250), 500: n(oidoIzquierdo500), 1000: n(oidoIzquierdo1000),
    2000: n(oidoIzquierdo2000), 3000: n(oidoIzquierdo3000), 4000: n(oidoIzquierdo4000), 6000: n(oidoIzquierdo6000), 8000: n(oidoIzquierdo8000)
  };

  // Verificar si hay suficientes datos
  const valoresDerecho = Object.values(oidoDerecho).filter(Number.isFinite);
  const valoresIzquierdo = Object.values(oidoIzquierdo).filter(Number.isFinite);
  
  if (valoresDerecho.length < 3 || valoresIzquierdo.length < 3) {
    return 'Datos insuficientes para generar interpretación automática.';
  }

  // Rangos dB HL: Normal -10 a 20 | Leve 21-40 | Moderada 41-60 | Grave 61-80 | Profunda 81-110
  const DB_HL_NORMAL_MIN = -10;
  const DB_HL_NORMAL_MAX = 20;
  const enRangoNormal = (db) => db >= DB_HL_NORMAL_MIN && db <= DB_HL_NORMAL_MAX;

  // Severidad según promedio de umbrales en frecuencias con caída (>20 dB HL)
  const clasificarSeveridad = (valores) => {
    const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
    if (promedio <= 20) return 'normal';
    if (promedio <= 40) return 'leve';
    if (promedio <= 60) return 'moderada';
    if (promedio <= 80) return 'grave o severa';
    return 'profunda';
  };

  // Función para detectar patrones específicos de pérdida auditiva
  const detectarPatrones = (oido) => {
    const valoresValidos = frecuencias.map(f => ({ freq: f, valor: oido[f] })).filter(item => Number.isFinite(item.valor));
    if (valoresValidos.length < 4) return [];

    const patrones = [];
    const valores = valoresValidos.map(item => item.valor);
    const frecs = valoresValidos.map(item => item.freq);

    // Detectar notch en 4000 Hz (típico de ruido industrial)
    const indice4000 = frecs.indexOf(4000);
    const indice2000 = frecs.indexOf(2000);
    const indice6000 = frecs.indexOf(6000);
    
    if (indice4000 !== -1 && indice2000 !== -1 && indice6000 !== -1) {
      const valor4000 = valores[indice4000];
      const valor2000 = valores[indice2000];
      const valor6000 = valores[indice6000];
      
      if (valor4000 > valor2000 + 15 && valor4000 > valor6000 + 15) {
        patrones.push('notch-4000');
      }
    }

    // Detectar patrón de presbiacusia (caída gradual en altas frecuencias)
    const graves = valoresValidos.filter(item => [125, 250, 500].includes(item.freq));
    const medias = valoresValidos.filter(item => [1000, 2000].includes(item.freq));
    const agudas = valoresValidos.filter(item => [3000, 4000, 6000, 8000].includes(item.freq));
    
    if (graves.length >= 2 && medias.length >= 1 && agudas.length >= 2) {
      const promGraves = graves.reduce((sum, item) => sum + item.valor, 0) / graves.length;
      const promMedias = medias.reduce((sum, item) => sum + item.valor, 0) / medias.length;
      const promAgudas = agudas.reduce((sum, item) => sum + item.valor, 0) / agudas.length;
      
      if (promAgudas > promMedias + 10 && promAgudas > promGraves + 15) {
        patrones.push('presbiacusia');
      }
    }

    // Detectar patrón simétrico en "U" (como el caso 90,70,55,25,10,25,55,70,90)
    if (valoresValidos.length >= 5) {
      const mitad = Math.floor(valoresValidos.length / 2);
      const primeraMitad = valores.slice(0, mitad);
      const segundaMitad = valores.slice(mitad).reverse();
      
      // Verificar si la segunda mitad es aproximadamente la reversa de la primera
      let esSimetrico = true;
      for (let i = 0; i < Math.min(primeraMitad.length, segundaMitad.length); i++) {
        if (Math.abs(primeraMitad[i] - segundaMitad[i]) > 10) {
          esSimetrico = false;
          break;
        }
      }
      
      if (esSimetrico) {
        patrones.push('simetrico-u');
      }
    }

    return patrones;
  };

  // Función para analizar configuración de la pérdida (mejorada)
  const analizarConfiguracion = (oido) => {
    const valoresValidos = frecuencias.map(f => ({ freq: f, valor: oido[f] })).filter(item => Number.isFinite(item.valor));
    if (valoresValidos.length < 3) return 'indeterminada';

    const valores = valoresValidos.map(item => item.valor);
    const maximo = Math.max(...valores);
    const minimo = Math.min(...valores);
    const rango = maximo - minimo;

    // Configuración plana: rango ≤ 15 dB
    if (rango <= 15) return 'plana';

    // Análisis de la forma real de la curva
    const frecs = valoresValidos.map(item => item.freq);
    const vals = valoresValidos.map(item => item.valor);
    
    // Detectar patrón en "V" (notch): un punto muy bajo rodeado de valores más altos
    const indiceMinimo = vals.indexOf(minimo);
    if (indiceMinimo > 0 && indiceMinimo < vals.length - 1) {
      const valorAnterior = vals[indiceMinimo - 1];
      const valorPosterior = vals[indiceMinimo + 1];
      const diferenciaAnterior = valorAnterior - minimo;
      const diferenciaPosterior = valorPosterior - minimo;
      
      if (diferenciaAnterior >= 20 && diferenciaPosterior >= 20) {
        return 'en-v';
      }
    }

    // Detectar patrón en "U" real: graves y agudos peor que medias
    const graves = valoresValidos.filter(item => [125, 250, 500].includes(item.freq));
    const medias = valoresValidos.filter(item => [1000, 2000].includes(item.freq));
    const agudas = valoresValidos.filter(item => [3000, 4000, 6000, 8000].includes(item.freq));
    
    if (graves.length >= 1 && medias.length >= 1 && agudas.length >= 1) {
      const promMedias = medias.reduce((sum, item) => sum + item.valor, 0) / medias.length;
      const promGraves = graves.reduce((sum, item) => sum + item.valor, 0) / graves.length;
      const promAgudas = agudas.reduce((sum, item) => sum + item.valor, 0) / agudas.length;
      
      if (promMedias < promGraves - 15 && promMedias < promAgudas - 15) {
        return 'en-u';
      }
    }

    // Análisis de tendencia general usando regresión simple
    if (valoresValidos.length >= 4) {
      const n = valoresValidos.length;
      const sumX = frecs.reduce((a, b) => a + b, 0);
      const sumY = vals.reduce((a, b) => a + b, 0);
      const sumXY = frecs.reduce((sum, item, i) => sum + (item * vals[i]), 0);
      const sumXX = frecs.reduce((sum, item) => sum + (item * item), 0);
      
      const pendiente = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      
      // Clasificar según la pendiente
      if (pendiente > 0.01) return 'ascendente'; // dB por Hz
      if (pendiente < -0.01) return 'descendente';
    }

    // Fallback: análisis por bandas (método anterior)
    if (graves.length >= 2 && agudas.length >= 2) {
      const promGraves = graves.reduce((sum, item) => sum + item.valor, 0) / graves.length;
      const promAgudas = agudas.reduce((sum, item) => sum + item.valor, 0) / agudas.length;
      
      if (promGraves < promAgudas - 10) return 'descendente';
      if (promAgudas < promGraves - 10) return 'ascendente';
    }

    return 'irregular';
  };

  // Función para detectar asimetría entre oídos
  const detectarAsimetria = (oido1, oido2) => {
    const valores1 = frecuencias.map(f => oido1[f]).filter(Number.isFinite);
    const valores2 = frecuencias.map(f => oido2[f]).filter(Number.isFinite);
    
    if (valores1.length < 3 || valores2.length < 3) return null;

    const promedio1 = valores1.reduce((a, b) => a + b, 0) / valores1.length;
    const promedio2 = valores2.reduce((a, b) => a + b, 0) / valores2.length;
    const diferencia = Math.abs(promedio1 - promedio2);

    if (diferencia <= 15) return null;
    if (diferencia <= 30) return 'leve';
    if (diferencia <= 50) return 'moderada';
    return 'severa';
  };

  // Función para detectar simetría bilateral
  const detectarSimetriaBilateral = (oido1, oido2) => {
    const valores1 = frecuencias.map(f => oido1[f]).filter(Number.isFinite);
    const valores2 = frecuencias.map(f => oido2[f]).filter(Number.isFinite);
    
    if (valores1.length < 3 || valores2.length < 3) return false;
    if (valores1.length !== valores2.length) return false;

    // Verificar si los valores son muy similares (diferencia ≤ 5 dB en cada frecuencia)
    for (let i = 0; i < valores1.length; i++) {
      if (Math.abs(valores1[i] - valores2[i]) > 5) return false;
    }

    return true;
  };

  // Función mejorada para encontrar rangos de frecuencias con caída
  const encontrarRangosFrecuencias = (frecuenciasCaida) => {
    if (frecuenciasCaida.length === 0) return [];
    
    const rangos = [];
    let inicio = frecuenciasCaida[0];
    let fin = frecuenciasCaida[0];
    
    for (let i = 1; i < frecuenciasCaida.length; i++) {
      const frecActual = frecuenciasCaida[i];
      const frecAnterior = frecuenciasCaida[i - 1];
      
      // Considerar continuo si es la siguiente frecuencia o salta máximo 2 frecuencias
      const esContinuo = frecActual === frecAnterior + 1 || 
                        frecActual === frecAnterior + 2 ||
                        (frecAnterior === 2000 && frecActual === 3000) || // Salto de octava
                        (frecAnterior === 4000 && frecActual === 6000);   // Salto de octava
      
      if (esContinuo) {
        fin = frecActual;
      } else {
        rangos.push({ inicio, fin });
        inicio = frecActual;
        fin = frecActual;
      }
    }
    rangos.push({ inicio, fin });
    
    return rangos;
  };

  // Función para generar descripción de rangos mejorada
  const generarDescripcionRangos = (rangos) => {
    if (rangos.length === 0) return '';
    
    // Si hay un solo rango que cubre la mayoría de frecuencias, usar "desde...hasta"
    if (rangos.length === 1) {
      const rango = rangos[0];
      if (rango.inicio === rango.fin) {
        return `${rango.inicio} Hz`;
      } else {
        return `desde ${rango.inicio} hasta los ${rango.fin} Hz`;
      }
    }
    
    // Si hay múltiples rangos, verificar si se pueden unificar
    const frecuenciasTotales = rangos.reduce((acc, rango) => {
      const frecs = [];
      for (let f = rango.inicio; f <= rango.fin; f++) {
        if (frecuencias.includes(f)) frecs.push(f);
      }
      return [...acc, ...frecs];
    }, []);
    
    const frecuenciasOrdenadas = [...new Set(frecuenciasTotales)].sort((a, b) => a - b);
    const rangoTotal = frecuenciasOrdenadas[frecuenciasOrdenadas.length - 1] - frecuenciasOrdenadas[0];
    const frecuenciasConCaida = frecuenciasOrdenadas.length;
    
    // Si el rango total es grande y cubre la mayoría de frecuencias, usar "desde...hasta"
    if (rangoTotal >= 4 && frecuenciasConCaida >= 6) {
      return `desde ${frecuenciasOrdenadas[0]} hasta los ${frecuenciasOrdenadas[frecuenciasOrdenadas.length - 1]} Hz`;
    }
    
    // Si no, usar descripción detallada de rangos
    const descripcionesRangos = rangos.map(rango => {
      if (rango.inicio === rango.fin) {
        return `${rango.inicio} Hz`;
      } else {
        return `los ${rango.inicio} a los ${rango.fin} Hz`;
      }
    });

    return descripcionesRangos.length === 1 
      ? descripcionesRangos[0]
      : descripcionesRangos.slice(0, -1).join(', ') + ' y ' + descripcionesRangos[descripcionesRangos.length - 1];
  };

  // Función para analizar un oído individual
  const analizarOido = (oido, nombreOido) => {
    const valoresValidos = frecuencias.map(f => ({ freq: f, valor: oido[f] })).filter(item => Number.isFinite(item.valor));
    
    if (valoresValidos.length < 3) {
      return { estado: 'insuficiente', descripcion: '' };
    }

    // Detectar patrones específicos
    const patrones = detectarPatrones(oido);
    const configuracion = analizarConfiguracion(oido);

    // Normal: -10 a 20 dB HL en todas las frecuencias con dato
    const esNormal = valoresValidos.every((item) => enRangoNormal(item.valor));
    
    if (esNormal) {
      let descripcion = `${nombreOido} dentro del rango de normalidad en todas sus frecuencias`;
      
      // Añadir información de patrones si existen
      if (patrones.length > 0) {
        if (patrones.includes('presbiacusia')) {
          descripcion += ' (patrón compatible con presbiacusia)';
        }
      }
      
      return { 
        estado: 'normal', 
        descripcion,
        patrones,
        configuracion
      };
    }

    // Pérdida (caída): umbral > 20 dB HL; la severidad sigue la tabla de arriba
    const frecuenciasConCaida = valoresValidos.filter(
      (item) => item.valor > DB_HL_NORMAL_MAX,
    );

    if (frecuenciasConCaida.length === 0) {
      return {
        estado: 'normal',
        descripcion: `${nombreOido} sin pérdida (> ${DB_HL_NORMAL_MAX} dB HL); alguna frecuencia registra umbral por debajo de ${DB_HL_NORMAL_MIN} dB HL (verificar registro).`,
        patrones,
        configuracion,
      };
    }

    // Calcular severidad de la caída
    const valoresCaida = frecuenciasConCaida.map(item => item.valor);
    const severidad = clasificarSeveridad(valoresCaida);
    const adjetivoSeveridad = severidad === 'normal' ? '' : ` ${severidad}`;

    // Si todas las frecuencias tienen caída
    if (frecuenciasConCaida.length === valoresValidos.length) {
      let descripcion = `${nombreOido} con caída${adjetivoSeveridad} del umbral de audición en todas las frecuencias`;
      
      // Añadir información de configuración o patrones (priorizar patrones específicos)
      if (patrones.length > 0) {
        if (patrones.includes('simetrico-u')) {
          descripcion += ' (patrón simétrico en U)';
        } else if (patrones.includes('notch-4000')) {
          descripcion += ' con notch característico en 4000 Hz';
        } else if (patrones.includes('presbiacusia')) {
          descripcion += ' (patrón de presbiacusia)';
        }
      } else if (configuracion !== 'irregular') {
        // Solo mostrar configuración si no hay patrones específicos
        descripcion += ` (configuración ${configuracion})`;
      }
      
      return { 
        estado: 'caida', 
        descripcion,
        severidad,
        patrones,
        configuracion
      };
    }

    // Analizar rangos de frecuencias con caída usando la función mejorada
    const frecuenciasCaida = frecuenciasConCaida.map(item => item.freq).sort((a, b) => a - b);
    const rangos = encontrarRangosFrecuencias(frecuenciasCaida);

    // Generar descripción de rangos usando la función mejorada
    const descripcionRangos = generarDescripcionRangos(rangos);

    let descripcion = `${nombreOido} con caída${adjetivoSeveridad} del umbral de audición de ${descripcionRangos}`;
    
    // Añadir información de configuración o patrones (priorizar patrones específicos)
    if (patrones.length > 0) {
      if (patrones.includes('simetrico-u')) {
        descripcion += ' (patrón simétrico en U)';
      } else if (patrones.includes('notch-4000')) {
        descripcion += ' con notch característico en 4000 Hz';
      } else if (patrones.includes('presbiacusia')) {
        descripcion += ' (patrón de presbiacusia)';
      }
    } else if (configuracion !== 'irregular') {
      // Solo mostrar configuración si no hay patrones específicos
      descripcion += ` (configuración ${configuracion})`;
    }

    return { 
      estado: 'caida', 
      descripcion,
      frecuenciasCaida: frecuenciasCaida,
      severidad,
      patrones,
      configuracion
    };
  };

  // Analizar ambos oídos
  const analisisDerecho = analizarOido(oidoDerecho, 'oído derecho');
  const analisisIzquierdo = analizarOido(oidoIzquierdo, 'oído izquierdo');

  // Detectar asimetría entre oídos
  const asimetria = detectarAsimetria(oidoDerecho, oidoIzquierdo);
  
  // Detectar simetría bilateral
  const esSimetrico = detectarSimetriaBilateral(oidoDerecho, oidoIzquierdo);

  // Construir la interpretación parte por parte
  let interpretacion = 'Gráfica audiométrica de trazo horizontal bilateral';

  // Función para comparar si dos análisis son similares (mejora en unificación)
  const sonSimilares = (analisis1, analisis2) => {
    if (analisis1.estado !== analisis2.estado) return false;
    if (analisis1.estado === 'insuficiente') return false;
    
    if (analisis1.estado === 'normal') return true;
    
    // Para caídas, comparar frecuencias y severidad
    if (analisis1.estado === 'caida') {
      const frecuenciasIguales = JSON.stringify(analisis1.frecuenciasCaida) === JSON.stringify(analisis2.frecuenciasCaida);
      const severidadSimilar =
        analisis1.severidad === analisis2.severidad ||
        (['leve', 'moderada'].includes(analisis1.severidad) &&
          ['leve', 'moderada'].includes(analisis2.severidad)) ||
        (['moderada', 'grave o severa'].includes(analisis1.severidad) &&
          ['moderada', 'grave o severa'].includes(analisis2.severidad));
      
      return frecuenciasIguales && severidadSimilar;
    }
    
    return false;
  };

  // Verificar si ambos oídos tienen comportamiento similar
  const comportamientoSimilar = sonSimilares(analisisDerecho, analisisIzquierdo);

  if (comportamientoSimilar) {
    if (analisisDerecho.estado === 'normal') {
      interpretacion += ', ambos oídos dentro del rango de normalidad en todas sus frecuencias';
      
      // Añadir información de patrones si ambos oídos los tienen
      if (analisisDerecho.patrones && analisisDerecho.patrones.length > 0) {
        if (analisisDerecho.patrones.includes('presbiacusia')) {
          interpretacion += ' (patrón compatible con presbiacusia)';
        }
      }
      
      interpretacion += '.';
    } else {
      // Ambos tienen caída similar
      let descripcionUnificada = analisisDerecho.descripcion
        .replace('oído derecho', 'ambos oídos')
        .replace('oído izquierdo', 'ambos oídos');
      
      // Si es simétrico, añadir información específica
      if (esSimetrico) {
        descripcionUnificada = descripcionUnificada.replace('ambos oídos', 'ambos oídos con patrón simétrico');
      }
      
      interpretacion += `, ${descripcionUnificada}.`;
    }
  } else {
    // Comportamientos diferentes, describir cada oído
    const descripciones = [];
    
    if (analisisDerecho.estado !== 'insuficiente') {
      descripciones.push(analisisDerecho.descripcion);
    }
    
    if (analisisIzquierdo.estado !== 'insuficiente') {
      descripciones.push(analisisIzquierdo.descripcion);
    }

    if (descripciones.length > 0) {
      interpretacion += ', ' + descripciones.join(' y ') + '.';
    } else {
      interpretacion += ' con alteraciones auditivas que requieren evaluación detallada.';
    }
  }

  // Añadir información de asimetría si es significativa (solo si no es simétrico)
  if (asimetria && !esSimetrico) {
    interpretacion += ` Asimetría ${asimetria} entre oídos.`;
  }

  return interpretacion;
});

// Quick inserts ahora basados en la interpretación automática
/* const quickInserts = computed(() => [
  {
    id: 'interpretacion-automatica',
    titulo: 'Interpretación automática',
    texto: interpretacionAutomatica.value
  },
  {
    id: 'grafica-normal-bilateral',
    titulo: 'Gráfica normal bilateral',
    texto: 'Gráfica audiométrica de trazo horizontal bilateral dentro del rango de normalidad en todas sus frecuencias.'
  },
  {
    id: 'caida-oido-derecho',
    titulo: 'Caída oído derecho',
    texto: 'Gráfica audimétrica de trazo horizontal bilateral con caída del umbral de la audición del oído derecho en todas las frecuencias y en oído izquierdo dentro de rango de normalidad.'
  },
  {
    id: 'caida-oido-izquierdo',
    titulo: 'Caída oído izquierdo',
    texto: 'Gráfica audimétrica de trazo horizontal bilateral con caída del umbral de la audición del oído izquierdo en todas las frecuencias y en oído derecho dentro de rango de normalidad.'
  },
  {
    id: 'caida-izquierdo-3000-6000hz',
    titulo: 'Caída izquierdo 3000-6000 Hz',
    texto: 'Gráfica audiométrica de trazo horizontal bilateral, oído izquierdo con caída del umbral de audición de los 3000 a los 6000 Hz, oído derecho dentro del rango de normalidad en todas sus frecuencias.'
  },
  {
    id: 'caida-derecho-3000-6000hz',
    titulo: 'Caída derecho 3000-6000 Hz',
    texto: 'Gráfica audiométrica de trazo horizontal bilateral, oído derecho con caída del umbral de audición de los 3000 a los 6000 Hz, oído izquierdo dentro del rango de normalidad en todas sus frecuencias.'
  }
]); */

const insertarQuick = (texto) => {
  // Inserta reemplazando o anexando según prefieras:
  interpretacionAudiometrica.value = texto;
  // Si deseas anexar en lugar de reemplazar:
  // interpretacionAudiometrica.value = (interpretacionAudiometrica.value?.trim() ? interpretacionAudiometrica.value.trim() + ' ' : '') + texto;
};

</script>

<template>
  <h1 class="font-bold mb-4 text-gray-800 leading-5">Audiometría</h1>

  <div class="mb-4">
    <h2 class="text-lg font-semibold mb-2 text-gray-800">Interpretación Audiométrica</h2>

    <!-- Textarea (source of truth local) -->
    <div class="font-light mb-4">
      <textarea
        class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-48"
        v-model="interpretacionAudiometrica"
        required
        data-skip-validation
      ></textarea>
    </div>

    <!-- === Interpretación Automática === -->
    <div class="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-semibold text-emerald-800">Interpretación Automática</h3>
        <button
          class="px-3 py-1 rounded-md text-sm text-emerald-700 border border-emerald-600 hover:bg-emerald-100"
          @click="insertarQuick(interpretacionAutomatica)"
          title="Usar interpretación automática"
        >
          Usar esta interpretación
        </button>
      </div>
      <p class="text-sm text-emerald-700 italic">{{ interpretacionAutomatica }}</p>
    </div>

    <!-- === Quick Inserts === -->
    <!-- <div class="mb-2 flex items-center gap-2">
      <p class="font-medium text-gray-800 leading-5">Interpretaciones ejemplo:</p>
      <span v-if="mensajeCopiado" class="font-medium leading-5 text-emerald-600 text-sm">¡Copiado!</span>
    </div>

    <div class="grid grid-cols-1 gap-2">
      <div
        v-for="qi in quickInserts.slice(1)"
        :key="qi.id"
        class="flex items-center justify-between border rounded-lg p-2 bg-white"
      >
        <div>
          <p class="text-sm font-medium text-gray-800">{{ qi.titulo }}</p>
          <p class="text-xs text-gray-600 line-clamp-2">{{ qi.texto }}</p>
        </div>
        <div class="flex gap-2">
          <button
            class="px-3 py-1 rounded-md text-sm text-emerald-700 border border-emerald-600 hover:bg-emerald-50"
            @click="insertarQuick(qi.texto)"
            title="Insertar en textarea"
          >
            Insertar
          </button>
        </div>
      </div>
    </div> -->

  </div>
</template>
