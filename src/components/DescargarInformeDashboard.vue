<script setup lang="ts">
declare const pdfMake: typeof import('pdfmake/build/pdfmake');
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { exportarGraficaAltaResolucion } from '@/helpers/exportChartImage';
import { 
  conclusionesToPdfMake, 
  recomendacionesTextoToPdfMake, 
  recomendacionesTablaToPdfMake,
  isHtmlContentEmpty
} from '@/helpers/pdfHtmlParser';
import { ref, nextTick, watch, computed, onMounted } from 'vue';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';

const props = defineProps<{
  refsGraficas: Record<string, any>;
  nombreEmpresa?: string;
  razonSocial?: string;
  logoBase64?: string;
  logoClienteBase64?: string;
  logoProveedorBase64?: string;
  nombreProveedorSalud?: string;
  periodo?: string;
  tablasDatos?: Record<string, any[] | any>;
  totalTrabajadores?: number;
  centroTrabajo?: string;
  tituloMedicoFirmante?: string;
  nombreMedicoFirmante?: string;
  // Secciones personalizadas
  conclusiones?: string;
  formatoRecomendaciones?: 'texto' | 'tabla';
  recomendacionesTexto?: string;
  recomendacionesTabla?: Array<{hallazgo: string, medidaPreventiva: string}>;
}>();

// Store del proveedor de salud
const proveedorSaludStore = useProveedorSaludStore();

// Variables reactivas para el proveedor
const proveedorSalud = computed(() => proveedorSaludStore.proveedorSalud);
const logoProveedorBase64 = ref<string | undefined>();

// Función para obtener el logo del proveedor en base64 usando el endpoint del backend
const obtenerBase64LogoEndpoint = async (filename: string): Promise<string> => {
  try {
    const baseURL = import.meta.env.VITE_API_URL || 'https://ramazzini.app';
    const logoUrl = `${baseURL}/proveedores-salud/logo/${filename}`;
        
    const response = await fetch(logoUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error al obtener logo desde endpoint:', error);
    throw error;
  }
};

// Función para cargar el logo del proveedor
const cargarLogoProveedor = async () => {
  if (proveedorSalud.value?.logotipoEmpresa?.data) {
    try {
      const filename = proveedorSalud.value.logotipoEmpresa.data;
      
      // Usar el endpoint del backend para obtener el logo
      const logoBase64 = await obtenerBase64LogoEndpoint(filename);
      
      // Validar que el logo sea un dataURL válido de imagen
      if (logoBase64 && logoBase64.startsWith('data:image/')) {
        logoProveedorBase64.value = logoBase64;
      } else {
        console.error('El logo no es un dataURL de imagen válido:', logoBase64?.substring(0, 50) + '...');
        logoProveedorBase64.value = undefined;
      }
      
    } catch (error) {
      console.error('Error al cargar el logo del proveedor:', error);
      logoProveedorBase64.value = undefined;
    }
  } 
};

// Cargar el logo cuando se monte el componente o cambie el proveedor
onMounted(async () => {
  await cargarLogoProveedor();
});

// Watcher para recargar el logo cuando cambie el proveedor
watch(proveedorSalud, async () => {
  await cargarLogoProveedor();
}, { deep: true });

const obtenerBase64 = (graficaObj: any, customWidth?: number, customHeight?: number): string | undefined => {
  // Si es un objeto con ref y config (para alta resolución)
  if (graficaObj && typeof graficaObj === 'object' && ('ref' in graficaObj || 'config' in graficaObj)) {
    if (graficaObj.config) {
      // Usa exportación en alta resolución con escalado proporcional
      return exportarGraficaAltaResolucion(
        graficaObj.config,
        customWidth || 1200,
        customHeight || 900
      );
    }
    const el = graficaObj.ref?.$el || graficaObj.ref;
    if (el instanceof HTMLCanvasElement) {
      return el.toDataURL();
    }
    const canvas = el?.querySelector?.('canvas');
    return canvas?.toDataURL?.();
  }
  
  // Si es solo un ref (método anterior), convertirlo a formato de alta resolución
  const el = graficaObj?.$el || graficaObj;
  if (el instanceof HTMLCanvasElement) {
    return el.toDataURL();
  }
  const canvas = el?.querySelector?.('canvas');
  return canvas?.toDataURL?.();
};

const crearPortada = (): Content[] => {
    // Variables locales con fallbacks - ahora usando datos del store
    const logoCliente = props.logoClienteBase64 || props.logoBase64;
    const logoProveedor = logoProveedorBase64.value || props.logoProveedorBase64;
    const nombreProveedor = proveedorSalud.value?.nombre || props.nombreProveedorSalud || 'Proveedor de Salud';
    const nombreComercialCliente = props.nombreEmpresa || 'Empresa';
    const razonSocialCliente = props.razonSocial;
    
    // Validar que los logos sean dataURLs válidos de imagen
    const logoClienteValido = logoCliente && logoCliente.startsWith('data:image/');
    const logoProveedorValido = logoProveedor && logoProveedor.startsWith('data:image/');
    
    const portada: Content[] = [];
    
    // 1. Título principal con línea divisora elegante
    portada.push({
        text: 'INFORME DE SALUD LABORAL',
        style: 'portadaTituloPrincipal',
        alignment: 'center',
        margin: [0, 40, 0, 15]
    });
    
    // Línea divisora elegante bajo el título
    portada.push({
        canvas: [
            { 
                type: 'rect', 
                x: 225, // Centrado: (515 - 64) / 2 = 225.5 ≈ 225
                y: 0, 
                w: 64, 
                h: 1.2, 
                color: '#059669'
            }
        ],
        margin: [0, 0, 0, 25]
    });
    
    // 2. Nombre comercial y razón social del cliente
    const clienteStack: Content[] = [
        {
            text: nombreComercialCliente.toUpperCase(),
            style: 'portadaSubtitulo',
            alignment: 'center',
            margin: [0, 0, 0, 8]
        }
    ];
    
    // Agregar razón social si existe
    if (razonSocialCliente) {
        clienteStack.push({
            text: razonSocialCliente,
            style: 'portadaRazonSocial',
            alignment: 'center',
            margin: [0, 0, 0, 10]
        });
    }
    
    portada.push({
        stack: clienteStack,
        margin: [0, 0, 0, 0]
    });
    
    // 3. Logo del cliente (protagonista) - después de razón social
    if (logoClienteValido) {
        portada.push({
            image: logoCliente,
            fit: [600, 200],
            alignment: 'center',
            margin: [0, 0, 0, 10]
        });
    }
    
    // 4. Grid de datos ejecutivos (2 columnas x 3 filas)
    const datosEjecutivos: Content = {
        columns: [
            // Columna izquierda - alineada a la derecha
            {
                width: '50%',
                stack: [
                    {
                        text: [
                            { text: 'Proveedor de Servicios', style: 'portadaLabelRight' },
                            { text: '\n' + (nombreProveedor || '—'), style: 'portadaValueRight' }
                        ],
                        margin: [0, 0, 0, 20],
                        alignment: 'right'
                    },
                    {
                        text: [
                            { text: 'Período de Evaluación', style: 'portadaLabelRight' },
                            { text: '\n' + (props.periodo || '—'), style: 'portadaValueRight' }
                        ],
                        margin: [0, 0, 0, 20],
                        alignment: 'right'
                    },
                    {
                        text: [
                            { text: 'Responsable Médico', style: 'portadaLabelRight' },
                            { text: '\n' + (`${props.tituloMedicoFirmante || ''} ${props.nombreMedicoFirmante || ''}`.trim() || '—'), style: 'portadaValueRight' }
                        ],
                        margin: [0, 0, 0, 20],
                        alignment: 'right'
                    }
                ]
            },
            // Columna derecha - alineada a la izquierda
            {
                width: '50%',
                stack: [
                    {
                        text: [
                            { text: 'Población Evaluada', style: 'portadaLabel' },
                            { text: '\n' + `${props.totalTrabajadores || 0} trabajadores`, style: 'portadaValue' }
                        ],
                        margin: [0, 0, 0, 20],
                        alignment: 'left'
                    },
                    {
                        text: [
                            { text: 'Centro de Trabajo', style: 'portadaLabel' },
                            { text: '\n' + (props.centroTrabajo || '—'), style: 'portadaValue' }
                        ],
                        margin: [0, 0, 0, 20],
                        alignment: 'left'
                    },
                    {
                        text: [
                            { text: 'Fecha de Generación', style: 'portadaLabel' },
                            { text: '\n' + new Date().toLocaleDateString('es-MX', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric'
                            }), style: 'portadaValue' }
                        ],
                        margin: [0, 0, 0, 20],
                        alignment: 'left'
                    }
                ]
            }
        ],
        columnGap: 40,
        margin: [0, 0, 0, 40]
    };
    
    portada.push(datosEjecutivos);
    
    // 5. Párrafo breve (texto actual) - centrado, estilo blurb
    /* portada.push({
        text: [
            'Este informe consolida la informacióon clave sobre la salud laboral de la población evaluada, ',
            'con el fin de proporcionbar una visión global del estado actual y servir como herramienta de apoyo ',
            'para la gestión preventiva en la empresa.'
        ],
        style: 'portadaBlurb',
        alignment: 'center',
        margin: [0, 0, 0, 50]
    }); */
    
    // 6. Pie de página con línea + logo proveedor discreto
    // Estructura centrada con ancho de 75%
    const margenHorizontal = 65; // 12.5% a cada lado (para hacer 75% del ancho)
    const anchoPie = 385; // 75% de 515
    
    // Contenedor del pie con posicionamiento absoluto
    const pieContainer: any = {
        absolutePosition: { x: 105, y: 750 }, // 65 = margen izquierdo (40pt de pageMargin + 25pt), y: 750pt posiciona a ~1.5cm del borde inferior
        columns: [
            {
                width: anchoPie,
                stack: [
                    // Línea horizontal
                    {
                        canvas: [
                            { 
                                type: 'rect', 
                                x: 0, 
                                y: 0, 
                                w: anchoPie, 
                                h: 1, 
                                color: '#059669'
                            }
                        ],
                        margin: [0, 0, 0, 5]
                    },
                    // Pie con texto y logo proveedor
                    logoProveedorValido ? {
                        columns: [
                            {
                                width: '*',
                                text: [
                                    {
                                        text: `Informe hecho por ${nombreProveedor}`,
                                        opacity: 0.75
                                    }
                                ],
                                style: 'portadaFooterBrand',
                                alignment: 'left'
                            },
                            {
                                width: 'auto',
                                image: logoProveedor,
                                fit: [80, 24],
                                alignment: 'right',
                                opacity: 0.75
                            }
                        ],
                        columnGap: 10
                    } : {
                        text: [
                            {
                                text: `Informe generado por ${nombreProveedor}`,
                                opacity: 0.75
                            }
                        ],
                        style: 'portadaFooterBrand',
                        alignment: 'left'
                    }
                ]
            }
        ]
    };
    
    portada.push(pieContainer);
    
    // Salto de página después de la portada
    portada.push({
        text: '',
        pageBreak: 'after'
    });
    
    return portada;
};

const generarDocDefinition = (altaCalidad: boolean = false): TDocumentDefinitions => {
    // Crear la portada
    const portada = crearPortada();

    // Generación de imágenes con calidad ajustable
    // Si altaCalidad es true, usa dimensiones altas para mejor calidad
    // Si es false, usa dimensiones normales para mayor velocidad
    const dimensiones = altaCalidad ? {
        imc: [3000, 2000], // Aspect ratio 3:2 para gráficas de barras horizontales
        aptitud: [3000, 2000], // Aspect ratio 3:2 para gráficas de barras horizontales
        lentes: [2000, 2000], // Aspect ratio 1:1 para gráficas circulares
        corregida: [2000, 2000], // Aspect ratio 1:1 para gráficas circulares
        daltonismo: [2000, 2000], // Aspect ratio 1:1 para gráficas circulares
        agentes: [3000, 2000], // Aspect ratio 3:2 para gráficas de barras
        grupos: [3600, 2000], // Aspect ratio 9:5 para gráficas de barras más anchas
        cintura: [2000, 2700], // Aspect ratio 3:2 para gráficas de barras
        sexo: [2000, 2000], // Aspect ratio 1:1 para gráficas circulares
        tensionArterial: [3000, 2000], // Aspect ratio 3:2 para gráficas de barras
        audiometriaDistribucion: [3000, 2000], // Barras distribución audiometría
        espirometriaDistribucion: [3000, 2000], // Barras distribución espirometría
        ekgDistribucion: [3000, 2000], // Barras distribución EKG
        rayosXDistribucion: [3000, 2000],
        analisisLaboratorioDistribucion: [3000, 2000],
        tamizajeBipolarTEA: [2000, 2000],
        tamizajeProdromal: [2000, 2000],
        tamizajeTLP: [3000, 2000]
    } : {
        imc: [800, 600], // Aspect ratio 4:3 para gráficas de barras horizontales
        aptitud: [800, 600], // Aspect ratio 4:3 para gráficas de barras horizontales
        lentes: [600, 600], // Aspect ratio 1:1 para gráficas circulares
        corregida: [600, 600], // Aspect ratio 1:1 para gráficas circulares
        daltonismo: [600, 600], // Aspect ratio 1:1 para gráficas circulares
        agentes: [800, 600], // Aspect ratio 4:3 para gráficas de barras
        grupos: [1000, 600], // Aspect ratio 5:3 para gráficas de barras más anchas
        cintura: [600, 800], // Aspect ratio 4:3 para gráficas de barras
        sexo: [600, 600], // Aspect ratio 1:1 para gráficas circulares
        tensionArterial: [800, 600], // Aspect ratio 4:3 para gráficas de barras
        audiometriaDistribucion: [800, 600], // Barras distribución audiometría
        espirometriaDistribucion: [800, 600], // Barras distribución espirometría
        ekgDistribucion: [800, 600], // Barras distribución EKG
        rayosXDistribucion: [800, 600],
        analisisLaboratorioDistribucion: [800, 600],
        tamizajeBipolarTEA: [600, 600],
        tamizajeProdromal: [600, 600],
        tamizajeTLP: [800, 600]
    };

    const imagenes = {
        imc: obtenerBase64(props.refsGraficas.imc, dimensiones.imc[0], dimensiones.imc[1]),
        aptitud: obtenerBase64(props.refsGraficas.aptitud, dimensiones.aptitud[0], dimensiones.aptitud[1]),
        lentes: obtenerBase64(props.refsGraficas.lentes, dimensiones.lentes[0], dimensiones.lentes[1]),
        corregida: obtenerBase64(props.refsGraficas.corregida, dimensiones.corregida[0], dimensiones.corregida[1]),
        daltonismo: obtenerBase64(props.refsGraficas.daltonismo, dimensiones.daltonismo[0], dimensiones.daltonismo[1]),
        agentes: obtenerBase64(props.refsGraficas.agentes, dimensiones.agentes[0], dimensiones.agentes[1]),
        grupos: obtenerBase64(props.refsGraficas.grupos, dimensiones.grupos[0], dimensiones.grupos[1]),
        cintura: obtenerBase64(props.refsGraficas.cintura, dimensiones.cintura[0], dimensiones.cintura[1]),
        sexo: obtenerBase64(props.refsGraficas.sexo, dimensiones.sexo[0], dimensiones.sexo[1]),
        tensionArterial: obtenerBase64(props.refsGraficas.tensionArterial, dimensiones.tensionArterial[0], dimensiones.tensionArterial[1]),
        audiometriaDistribucion: obtenerBase64(props.refsGraficas.audiometriaDistribucion, dimensiones.audiometriaDistribucion[0], dimensiones.audiometriaDistribucion[1]),
        espirometriaDistribucion: obtenerBase64(props.refsGraficas.espirometriaDistribucion, dimensiones.espirometriaDistribucion[0], dimensiones.espirometriaDistribucion[1]),
        ekgDistribucion: obtenerBase64(props.refsGraficas.ekgDistribucion, dimensiones.ekgDistribucion[0], dimensiones.ekgDistribucion[1]),
        rayosXDistribucion: obtenerBase64(props.refsGraficas.rayosXDistribucion, dimensiones.rayosXDistribucion[0], dimensiones.rayosXDistribucion[1]),
        analisisLaboratorioDistribucion: obtenerBase64(props.refsGraficas.analisisLaboratorioDistribucion, dimensiones.analisisLaboratorioDistribucion[0], dimensiones.analisisLaboratorioDistribucion[1]),
        tamizajeBipolarTEA: obtenerBase64(props.refsGraficas.tamizajeBipolarTEA, dimensiones.tamizajeBipolarTEA[0], dimensiones.tamizajeBipolarTEA[1]),
        tamizajeProdromal: obtenerBase64(props.refsGraficas.tamizajeProdromal, dimensiones.tamizajeProdromal[0], dimensiones.tamizajeProdromal[1]),
        tamizajeTLP: obtenerBase64(props.refsGraficas.tamizajeTLP, dimensiones.tamizajeTLP[0], dimensiones.tamizajeTLP[1])
    };

    const contenido: Content[] = [];

    // Variable para rastrear el número de sección actual
    let numeroSeccion = 1;

    // Resumen ejecutivo
    contenido.push(
        { text: 'INTRODUCCIÓN', style: 'tituloSeccion' },
        {
            text: [
                'Este informe presenta los resultados descriptivos sobre la ',
                { text: 'salud de los trabajadores,', bold: true },
                'con base en los datos recopilados en el ',
                { text: 'periodo de evaluación seleccionado.', bold: true },
                'El documento busca proporcionar a la dirección información objetiva para apoyar la toma de ',
                { text: 'decisiones estratégicas', bold: true },
                ' en materia de salud ocupacional.'
            ],
            style: 'textoNormal',
            margin: [0, 0, 0, 20]
        }
    );

    // Sección 1: Composición Demográfica
    contenido.push({ text: `${numeroSeccion}. COMPOSICIÓN DEMOGRÁFICA`, style: 'tituloSeccion' });
    numeroSeccion++;

    if (imagenes.sexo) {
        contenido.push(
            { text: '1.1 Distribución por Sexo', style: 'subtituloSeccion' },
            {
                text: 'A continuación se presenta la distribución proporcional por sexo de la población evaluada, lo que permite analizar las características demográficas de la plantilla laboral.',
                style: 'textoNormal',
                margin: [0, 0, 0, 10]
            }
        );
        
        // Obtener datos de la gráfica de sexo
        const datosSexo = props.tablasDatos?.sexo;
        const masculino = datosSexo?.masculino || 0;
        const femenino = datosSexo?.femenino || 0;
        const porcentajeMasculino = datosSexo?.porcentaje || 0;
        const totalSexo = masculino + femenino;
        
        // Crear tabla con gráfica y datos lado a lado
        // Altura de la imagen (en px)
        const alturaImagenSexo = 175;
        // Altura estimada de una fila de la tabla (en px)
        const alturaFilaTabla = 24; // Ajusta este valor si tu fuente es más grande o pequeña
        // Número de filas de la tabla de sexo (header + filas de datos)
        const filasTablaSexo = 1 + 2; // Header + Hombres + Mujeres
        // Altura total estimada de la tabla
        const alturaTablaSexo = filasTablaSexo * alturaFilaTabla;
        // Margen superior para centrar la tabla respecto a la imagen
        const margenSuperiorTablaSexo = Math.max(0, Math.round((alturaImagenSexo - alturaTablaSexo) / 2));
        
        const tablaSexoCombinada = {
            table: {
                widths: ['60%', '40%'],
                body: [
                    [
                        // Columna izquierda: Gráfica
                        {
                            image: imagenes.sexo,
                            width: 175,
                            alignment: 'center'
                        },
                        // Columna derecha: Tabla de datos
                        {
                            table: {
                                headerRows: 1,
                                widths: ['auto', 'auto'],
                                body: [
                                    [
                                        { text: 'Sexo', style: 'tableHeaderMedium' },
                                        { text: 'Cantidad', style: 'tableHeaderMedium' }
                                    ],
                                    [
                                        { text: 'Hombres', style: 'tableCellMedium' },
                                        { text: `${masculino} (${porcentajeMasculino}%)`, style: 'tableCellBlue' }
                                    ],
                                    [
                                        { text: 'Mujeres', style: 'tableCellMedium' },
                                        { text: `${femenino} (${totalSexo > 0 ? Math.round((femenino / totalSexo) * 100) : 0}%)`, style: 'tableCellPink' }
                                    ]
                                ]
                            },
                            layout: 'lightHorizontalLines',
                            margin: [0, margenSuperiorTablaSexo, 0, 0]
                        }
                    ]
                ]
            },
            layout: 'noBorders',
            margin: [0, 30, 0, 20]
        } as Content;
        
        contenido.push(tablaSexoCombinada);
    }

    if (imagenes.grupos) {
        contenido.push(
            { text: '1.2 Distribución por Grupos Etarios', style: 'subtituloSeccion', pageBreak: 'before' },
            {
                text: [
                    'Conocer la ',
                    { text: 'edad de la plantilla', bold: true },
                    ' permite anticipar ',
                    { text: 'necesidades específicas de salud, desempeño y riesgos laborales', bold: true },
                    '.',
                    '\n\n',
                    'Una ',
                    { text: 'población mayor', bold: true },
                    'puede requerir mayor ',
                    { text: 'vigilancia en enfermedades crónicas,', bold: true },
                    'mientras que una ',
                    { text: 'plantilla joven', bold: true },
                    ' puede beneficiarse de ',
                    { text: 'acciones preventivas enfocadas en hábitos saludables y educación en seguridad', bold: true },
                    '. Esta información orienta ',
                    { text: 'decisiones en salud laboral y gestión de recursos humanos', bold: true },
                    '.'
                ],
                style: 'textoNormal',
                margin: [0, 0, 0, 10]
            },
            { 
                image: imagenes.grupos, 
                width: 460, 
                alignment: 'center',
                margin: [0, 10, 0, 10] 
            }
        );
        
        // Tabla de grupos etarios
        if (props.tablasDatos?.gruposEtarios) {
            // Los grupos etarios tienen estructura diferente: [grupo, {Masculino: X, Femenino: Y}]
            const datosGrupos = props.tablasDatos.gruposEtarios
                .filter(item => item && Array.isArray(item) && item.length >= 2)
                .map(item => [
                    item[0] || '-',
                    item[1]?.Masculino || 0,
                    item[1]?.Femenino || 0
                ]);
            
            if (datosGrupos.length > 0) {
                const tablaGrupos = crearTablaPDF(
                    datosGrupos,
                    ['Grupo Etario', 'Hombres', 'Mujeres'],
                    'Distribución Demográfica Detallada',
                    'gruposEtarios'
                );
                tablaGrupos.forEach(item => contenido.push(item));
            }
        }
    }

    // Sección 2: Indicadores de Salud Física
    contenido.push({ text: `${numeroSeccion}. INDICADORES DE SALUD FÍSICA`, style: 'tituloSeccion', pageBreak: 'before' });
    numeroSeccion++;

    if (imagenes.imc) {
        contenido.push(
            { text: '2.1 Índice de Masa Corporal (IMC)', style: 'subtituloSeccion' },
            {
                text: [
                    'La ',
                    { text: 'obesidad aumenta el riesgo de accidentes laborales', bold: true },
                    '. La ',
                    { text: 'movilidad reducida y la fatiga', bold: true },
                    ' comprometen la ',
                    { text: 'seguridad y el desempeño físico', bold: true },
                    '.',
                    '\n',
                    'Un IMC elevado también anticipa ',
                    { text: 'complicaciones metabólicas o musculoesqueléticas', bold: true },
                    ', guiando ',
                    { text: 'acciones preventivas', bold: true },
                    ' para reducir ausentismo y preservar la ',
                    { text: 'capacidad funcional', bold: true },
                    '.'
                ],
                style: 'textoNormal',
                margin: [0, 0, 0, 10]
            },
            { 
                image: imagenes.imc, 
                width: 400, 
                alignment: 'center',
                margin: [0, 10, 0, 20] 
            }
        );
        
        // Tabla de IMC
        if (props.tablasDatos?.imc) {
            const datosIMC = props.tablasDatos.imc
                .filter(item => item && Array.isArray(item) && item.length >= 3)
                .map(item => [
                    item[0] || '-',
                    `${item[1] || 0} (${item[2] || 0}%)`
                ]);
            
            if (datosIMC.length > 0) {
                // Función para asignar color según la categoría de IMC
                const getIMCCellStyle = (categoria: string) => {
                    if (categoria.includes('Bajo peso')) return 'tableCellAmber';
                    if (categoria.includes('Normal')) return 'tableCellEmerald';
                    if (categoria.includes('Sobrepeso') || categoria.includes('Pre-obesidad')) return 'tableCellAmber';
                    if (categoria.includes('Obesidad clase III')) return 'tableCellDarkRed';
                    if (categoria.includes('Obesidad clase II')) return 'tableCellRed';
                    if (categoria.includes('Obesidad clase I')) return 'tableCellOrange';
                    return 'tableCellMedium';
                };
                const tablaResultadosIMC = [
                    { text: 'Resultados IMC', style: 'subtituloTabla' },
                    {
                        table: {
                            headerRows: 1,
                            widths: ['auto', 'auto'],
                            body: [
                                [
                                    { text: 'Categoría', style: 'tableHeaderMedium' },
                                    { text: 'Cantidad (Porcentaje)', style: 'tableHeaderMedium' }
                                ],
                                ...datosIMC.map(row => [
                                    { text: row[0], style: 'tableCellMedium' },
                                    { text: row[1], style: getIMCCellStyle(row[0]) }
                                ])
                            ]
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 0, 0, 0] as [number, number, number, number]
                    }
                ];
                const tablaReferenciaIMC = [
                    { text: 'Tabla de la Organización Mundial de la Salud:', style: 'subtituloTabla' },
                    {
                        table: {
                            headerRows: 1,
                            widths: ['auto', 'auto'],
                            body: [
                                [
                                    { text: 'IMC', style: 'tableHeaderMedium' },
                                    { text: 'ESTADO', style: 'tableHeaderMedium' }
                                ],
                                [ { text: 'Por debajo de 18.5', style: 'tableCellMedium' }, { text: 'Bajo peso', style: 'tableCellMedium' } ],
                                [ { text: '18.5 – 24.9', style: 'tableCellMedium' }, { text: 'Peso normal', style: 'tableCellMedium' } ],
                                [ { text: '25.0 – 29.9', style: 'tableCellMedium' }, { text: 'Pre-obesidad o Sobrepeso', style: 'tableCellMedium' } ],
                                [ { text: '30.0 – 34.9', style: 'tableCellMedium' }, { text: 'Obesidad clase I', style: 'tableCellMedium' } ],
                                [ { text: '35.0 – 39.9', style: 'tableCellMedium' }, { text: 'Obesidad clase II', style: 'tableCellMedium' } ],
                                [ { text: 'Por encima de 40', style: 'tableCellMedium' }, { text: 'Obesidad clase III', style: 'tableCellMedium' } ]
                            ]
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 0, 0, 0] as [number, number, number, number]
                    },
                    { text: 'Fuente: OMS (2022)', style: 'pieTabla', italics: true, margin: [0, 10, 0, 20] as [number, number, number, number] }
                ];
                contenido.push({
                    columns: [
                        { width: '50%', stack: [tablaResultadosIMC[0], { ...tablaResultadosIMC[1], margin: [0, 0, 0, 0] as [number, number, number, number] }] },
                        { width: '50%', stack: [tablaReferenciaIMC[0], { ...tablaReferenciaIMC[1], margin: [0, 0, 0, 0] as [number, number, number, number] }, tablaReferenciaIMC[2]] }
                    ],
                    columnGap: 5,
                    margin: [0, 0, 0, 0]
                });
            }
        }
    }

    if (imagenes.cintura) {
        contenido.push(
            { text: '2.2 Circunferencia de Cintura', style: 'subtituloSeccion', pageBreak: 'before' },
            {
                text: [
                    'La circunferencia de cintura es un indicador antropométrico útil para evaluar la ',
                    { text: 'distribución de grasa corporal.', bold: true },
                    'Un valor elevado se asocia con acumulación de grasa central, representando un ',
                    { text: 'riesgo incrementado de enfermedades metabólicas y cardiovasculares', bold: true },
                    ', incluso en personas con peso normal según el IMC. El exceso de grasa abdominal está directamente relacionado con un mayor riesgo de desarrollar ',
                    { text: 'síndrome metabólico, diabetes tipo 2, hipertensión arterial y enfermedad coronaria', bold: true },
                    '.'
                ],
                style: 'textoNormal',
                margin: [0, 0, 0, 10]
            }
        );
        
        // Obtener datos de la gráfica de circunferencia de cintura
        const datosCintura = props.tablasDatos?.cintura;
        const altoRiesgo = datosCintura?.alto || 0;
        const riesgoAumentado = datosCintura?.chart?.datasets?.[0]?.data?.[1] || 0;
        const bajoRiesgo = datosCintura?.chart?.datasets?.[0]?.data?.[2] || 0;
        const totalCintura = altoRiesgo + riesgoAumentado + bajoRiesgo;
        const porcentajeAltoRiesgo = totalCintura > 0 ? Math.round((altoRiesgo / totalCintura) * 100) : 0;
        const porcentajeRiesgoAumentado = totalCintura > 0 ? Math.round((riesgoAumentado / totalCintura) * 100) : 0;
        const porcentajeBajoRiesgo = totalCintura > 0 ? Math.round((bajoRiesgo / totalCintura) * 100) : 0;
        
        // --- INICIO CAMBIO CENTRADO VERTICAL ---
        // Altura de la imagen (en px)
        const alturaImagenCintura = 200;
        // Altura estimada de una fila de la tabla (en px)
        const alturaFilaTablaCintura = 24;
        // Número de filas de la tabla de cintura (header + 3 categorías)
        const filasTablaCintura = 1 + 3;
        // Altura total estimada de la tabla
        const alturaTablaCintura = filasTablaCintura * alturaFilaTablaCintura;
        // Margen superior para centrar la tabla respecto a la imagen
        const margenSuperiorTablaCintura = Math.max(0, Math.round((alturaImagenCintura - alturaTablaCintura) / 2));
        // --- FIN CAMBIO CENTRADO VERTICAL ---
        
        // Mostrar gráfica y tabla de resultados lado a lado
        contenido.push({
            table: {
                widths: ['60%', '40%'],
                body: [
                    [
                        // Gráfica a la izquierda
                        {
                            image: imagenes.cintura,
                            width: 200,
                            alignment: 'center',
                            margin: [0, 10, 0, 10]
                        },
                        // Tabla de resultados a la derecha
                        {
                            table: {
                                headerRows: 1,
                                widths: ['auto', 'auto'],
                                body: [
                                    [
                                        { text: 'Categoría', style: 'tableHeaderMedium' },
                                        { text: 'Cantidad', style: 'tableHeaderMedium' }
                                    ],
                                    [
                                        { text: 'Alto riesgo', style: 'tableCellMedium' },
                                        { text: `${altoRiesgo} (${porcentajeAltoRiesgo}%)`, style: 'tableCellRose' }
                                    ],
                                    [
                                        { text: 'Riesgo aumentado', style: 'tableCellMedium' },
                                        { text: `${riesgoAumentado} (${porcentajeRiesgoAumentado}%)`, style: 'tableCellAmber' }
                                    ],
                                    [
                                        { text: 'Bajo riesgo', style: 'tableCellMedium' },
                                        { text: `${bajoRiesgo} (${porcentajeBajoRiesgo}%)`, style: 'tableCellGray' }
                                    ]
                                ]
                            },
                            layout: 'lightHorizontalLines',
                            margin: [0, margenSuperiorTablaCintura, 0, 0]
                        }
                    ]
                ]
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 20]
        });

        // Tabla de referencia debajo (dividida en dos: mujeres y hombres)
        const tablaReferenciaMujeres = {
            table: {
                headerRows: 1,
                widths: ['auto', 'auto', '40%'],
                body: [
                    [
                        { text: 'SEXO', style: 'tableHeaderMedium' },
                        { text: 'CIRCUNFERENCIA', style: 'tableHeaderMedium' },
                        { text: 'NIVEL DE RIESGO', style: 'tableHeaderMedium' }
                    ],
                    [ { text: 'Mujeres', style: 'tableCellMedium' }, { text: '< 80 cm', style: 'tableCellMedium' }, { text: 'Bajo riesgo', style: 'tableCellMedium' } ],
                    [ { text: 'Mujeres', style: 'tableCellMedium' }, { text: '80 – 87 cm', style: 'tableCellMedium' }, { text: 'Riesgo Aumentado', style: 'tableCellMedium' } ],
                    [ { text: 'Mujeres', style: 'tableCellMedium' }, { text: '≥ 88 cm', style: 'tableCellMedium' }, { text: 'Alto riesgo', style: 'tableCellMedium' } ]
                ]
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 5, 0]
        };
        const tablaReferenciaHombres = {
            table: {
                headerRows: 1,
                widths: ['auto', 'auto', '40%'],
                body: [
                    [
                        { text: 'SEXO', style: 'tableHeaderMedium' },
                        { text: 'CIRCUNFERENCIA', style: 'tableHeaderMedium' },
                        { text: 'NIVEL DE RIESGO', style: 'tableHeaderMedium' }
                    ],
                    [ { text: 'Hombres', style: 'tableCellMedium' }, { text: '< 94 cm', style: 'tableCellMedium' }, { text: 'Bajo riesgo', style: 'tableCellMedium' } ],
                    [ { text: 'Hombres', style: 'tableCellMedium' }, { text: '94 – 101 cm', style: 'tableCellMedium' }, { text: 'Riesgo Aumentado', style: 'tableCellMedium' } ],
                    [ { text: 'Hombres', style: 'tableCellMedium' }, { text: '≥ 102 cm', style: 'tableCellMedium' }, { text: 'Alto riesgo', style: 'tableCellMedium' } ]
                ]
            },
            layout: 'lightHorizontalLines',
            margin: [5, 0, 0, 0]
        };
        // Título de las tablas de referencia
        contenido.push({
            text: 'Tabla del Adult Treatment Panel III (ATP III):',
            style: 'subtituloTabla',
            alignment: 'center',
            margin: [0, 10, 0, 5]
        });
        // Tablas de referencia lado a lado
        contenido.push({
            table: {
                widths: ['50%', '50%'],
                body: [
                    [tablaReferenciaMujeres, tablaReferenciaHombres]
                ]
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 0]
        });
        // Cita de la fuente debajo
        contenido.push({
            text: 'Fuente: ACC/AHA (2013)',
            style: 'pieTabla',
            alignment: 'center',
            italics: true,
            margin: [0, 10, 0, 20]
        });
    }

    if (imagenes.tensionArterial) {
        contenido.push(
            { text: '2.3 Alteraciones en Presión Arterial', style: 'subtituloSeccion', pageBreak: 'before' },
            {
                text: [
                    'La ',
                    { text: 'presión arterial elevada', bold: true },
                    'puede aumentar el riesgo de ',
                    { text: 'eventos cardiovasculares', bold: true },
                    'durante la jornada laboral, especialmente en tareas que implican ',
                    { text: 'esfuerzo físico, turnos prolongados o exposición a calor', bold: true },
                    '.',
                    '\n',
                    'Este indicador permite detectar trabajadores con ',
                    { text: 'posibles alteraciones que requieren seguimiento médico', bold: true },
                    '.'
                ],
                style: 'textoNormal',
                margin: [0, 0, 0, 10]
            },
            { 
                image: imagenes.tensionArterial, 
                width: 400, 
                alignment: 'center',
                margin: [0, 0, 0, 20] 
            }
        );
        // Tabla de resultados y tabla de referencia lado a lado
        if (props.tablasDatos?.tensionArterial) {
            const datosTension = props.tablasDatos.tensionArterial
                .filter(item => item && Array.isArray(item) && item.length >= 3)
                .map(item => [
                    item[0] || '-',
                    `${item[1] || 0} (${item[2] || 0}%)`
                ]);
            if (datosTension.length > 0) {
                // Función para asignar color según la categoría de tensión arterial
                const getTensionCellStyle = (categoria: string) => {
                    if (categoria.includes('Óptima') || categoria.includes('Normal')) return 'tableCellEmerald';
                    if (categoria.includes('Alta')) return 'tableCellAmber';
                    if (categoria.includes('ligera')) return 'tableCellOrange';
                    if (categoria.includes('moderada')) return 'tableCellRed';
                    if (categoria.includes('severa')) return 'tableCellDarkRed';
                    return 'tableCellMedium';
                };
                // Título resultados
                const tablaResultadosTA = [
                    { text: 'Resultados Tensión Arterial \n ', style: 'subtituloTabla' },
                    {
                        table: {
                            headerRows: 1,
                            widths: ['*', 90],
                            body: [
                                [
                                    { text: 'Categoría', style: 'tableHeaderMedium' },
                                    { text: 'Trabajadores (%)', style: 'tableHeaderMedium' }
                                ],
                                ...datosTension.map(row => [
                                    { text: row[0], style: 'tableCellMedium' },
                                    { text: row[1], style: getTensionCellStyle(row[0]) }
                                ])
                            ]
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 0, 0, 0] as [number, number, number, number]
                    }
                ];
                // Título y tabla de referencia
                const tablaReferenciaTA = [
                    { text: 'Tabla de la Organización Mundial de la Salud (OMS)\ny la Sociedad Internacional de Hipertensión (SIH):', style: 'subtituloTabla' },
                    {
                        table: {
                            headerRows: 1,
                            widths: ['*', 'auto', 'auto'],
                            body: [
                                [
                                    { text: 'CATEGORÍA', style: 'tableHeaderMedium' },
                                    { text: 'SISTÓLICA', style: 'tableHeaderMedium' },
                                    { text: 'DIASTÓLICA', style: 'tableHeaderMedium' }
                                ],
                                [ { text: 'Óptima', style: 'tableCellMedium' }, { text: 'Menos de 120', style: 'tableCellMedium' }, { text: 'Menos de 80', style: 'tableCellMedium' } ],
                                [ { text: 'Normal', style: 'tableCellMedium' }, { text: '121 – 130', style: 'tableCellMedium' }, { text: '81 – 85', style: 'tableCellMedium' } ],
                                [ { text: 'Alta', style: 'tableCellMedium' }, { text: '131 – 139', style: 'tableCellMedium' }, { text: '86 – 89', style: 'tableCellMedium' } ],
                                [ { text: 'Hipertensión grado 1', style: 'tableCellMedium' }, { text: '140 – 159', style: 'tableCellMedium' }, { text: '90 – 99', style: 'tableCellMedium' } ],
                                [ { text: 'Hipertensión grado 2', style: 'tableCellMedium' }, { text: '160 – 179', style: 'tableCellMedium' }, { text: '100 – 109', style: 'tableCellMedium' } ],
                                [ { text: 'Hipertensión grado 3', style: 'tableCellMedium' }, { text: '180 o más', style: 'tableCellMedium' }, { text: '110 o más', style: 'tableCellMedium' } ]
                            ]
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 0, 0, 0] as [number, number, number, number]
                    }
                ];
        contenido.push({
                    columns: [
                        { width: '45%', stack: [tablaResultadosTA[0], { ...tablaResultadosTA[1], margin: [0, 0, 0, 0] as [number, number, number, number] }] },
                        { width: '55%', stack: [
                            tablaReferenciaTA[0],
                            { ...tablaReferenciaTA[1], margin: [0, 0, 0, 0] as [number, number, number, number] },
                            {
                                text: 'Si ambas mediciones caen en categorías distintas, se emplea la más alta.',
                                style: 'pieTabla',
                                alignment: 'left',
                                italics: true,
                                margin: [0, 10, 0, 0] as [number, number, number, number]
                            },
                            {
                                text: 'Fuente: OMS y SIH (2014)',
                                style: 'pieTabla',
            alignment: 'center',
            italics: true,
                                margin: [0, 0, 0, 20] as [number, number, number, number]
                            }
                        ] }
                    ],
                    columnGap: 10,
                    margin: [0, 0, 0, 0]
                });
            }
        }
    }

    // Sección 3: Antecedentes Médicos
    contenido.push({ text: `${numeroSeccion}. ANTECEDENTES MÉDICOS`, style: 'tituloSeccion', pageBreak: 'before' });
    numeroSeccion++;
    // Texto introductorio
    contenido.push({
        text: [
            'Este apartado permite conocer la presencia de ',
            { text: 'enfermedades crónicas y problemas localizados', bold: true },
            ' entre los trabajadores. Estas condiciones, aunque no siempre incapacitantes, pueden influir en la ',
            { text: 'productividad, el ausentismo y la susceptibilidad a riesgos laborales', bold: true },
            '.'
        ],
        style: 'textoNormal',
        margin: [0, 0, 0, 10]
    });

    // Párrafo sobre la importancia
    contenido.push({
        text: [
            'Contar con esta información es clave para la empresa, ya que permite:'
        ],
        style: 'textoNormal',
        margin: [0, 0, 0, 10]
    });

    // Lista usando tabla para sangría
    contenido.push({
        table: {
            widths: ['*'],
            body: [
                [{ text: '• Anticipar posibles restricciones laborales o adaptaciones en el puesto de trabajo.', style: 'textoNormal' }],
                [{ text: '• Identificar necesidades de seguimiento médico o vigilancia específica.', style: 'textoNormal' }],
                [{ text: '• Implementar estrategias de prevención secundaria, reduciendo el impacto de estos padecimientos en el entorno laboral.', style: 'textoNormal' }]
            ]
        },
        layout: 'noBorders',
        margin: [20, 0, 0, 10]
    });

    // Párrafo final
    contenido.push({
        text: [
            'El ',
            { text: 'monitoreo continuo de estos antecedentes', bold: true },
            'fortalece la gestión integral de la salud en la empresa, y contribuye a un ',
            { text: 'ambiente laboral más seguro, eficiente y humano', bold: true },
            '.'
        ],
        style: 'textoNormal',
        margin: [0, 0, 0, 20]
    });

    // Tabla de enfermedades crónicas y antecedentes localizados lado a lado
    let tablaEnfermedadesContent: any[] | null = null;
    let tablaAntecedentesContent: any[] | null = null;
    if (props.tablasDatos?.enfermedades) {
        // Mapeo de nombres técnicos a nombres legibles
        const nombreEnfermedadLegible: Record<string, string> = {
            diabeticosPP: 'Diabéticos',
            hipertensivosPP: 'Hipertensivos',
            cardiopaticosPP: 'Cardiopáticos',
            epilepticosPP: 'Epilépticos',
            respiratorios: 'Respiratorios',
            alergicos: 'Alérgicos'
        };
        const datosEnfermedades = props.tablasDatos.enfermedades
            .filter(item => item && Array.isArray(item) && item.length >= 3)
            .map(item => [
                nombreEnfermedadLegible[item[0]] || item[0] || '-',
                `${item[1] || 0} (${item[2] || 0}%)`
            ]);
        // Función para color condicional
        const getEnfermedadCellStyle = (valor: string, columnaIndex: number) => {
            if (columnaIndex === 0) return 'tableCellMedium';
            // Si la cantidad es 0, verde; si es mayor, rojo
            const cantidad = parseInt(valor.split(' ')[0]);
            return cantidad === 0 ? 'tableCellEmerald' : 'tableCellRose';
        };
        if (datosEnfermedades.length > 0) {
            tablaEnfermedadesContent = [
                { text: 'Enfermedades Crónicas', style: 'subtituloTabla' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['60%', '40%'],
                        body: [
                            [
                                { text: 'Antecedente', style: 'tableHeaderMedium' },
                                { text: 'Casos (%)', style: 'tableHeaderMedium' }
                            ],
                            ...datosEnfermedades.map(row => [
                                { text: row[0], style: getEnfermedadCellStyle(row[0], 0) },
                                { text: row[1], style: getEnfermedadCellStyle(row[1], 1) }
                            ])
                        ]
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 0] as [number, number, number, number]
                }
            ];
        }
    }
    if (props.tablasDatos?.antecedentes) {
        // Mapeo de nombres técnicos a nombres legibles
        const nombreAntecedenteLegible: Record<string, string> = {
            lumbalgias: 'Lumbalgias',
            accidentes: 'Accidentes',
            quirurgicos: 'Quirúrgicos',
            otros: 'Otros'
        };
        const datosAntecedentes = props.tablasDatos.antecedentes
            .filter(item => item && Array.isArray(item) && item.length >= 3)
            .map(item => [
                nombreAntecedenteLegible[item[0]] || item[0] || '-',
                `${item[1] || 0} (${item[2] || 0}%)`
            ]);
        // Función para color condicional
        const getAntecedenteCellStyle = (valor: string, columnaIndex: number) => {
            if (columnaIndex === 0) return 'tableCellMedium';
            const cantidad = parseInt(valor.split(' ')[0]);
            return cantidad === 0 ? 'tableCellEmerald' : 'tableCellRose';
        };
        if (datosAntecedentes.length > 0) {
            tablaAntecedentesContent = [
                { text: 'Problemas Localizados', style: 'subtituloTabla' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['60%', '40%'],
                        body: [
                            [
                                { text: 'Antecedente', style: 'tableHeaderMedium' },
                                { text: 'Casos (%)', style: 'tableHeaderMedium' }
                            ],
                            ...datosAntecedentes.map(row => [
                                { text: row[0], style: getAntecedenteCellStyle(row[0], 0) },
                                { text: row[1], style: getAntecedenteCellStyle(row[1], 1) }
                            ])
                        ]
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 0] as [number, number, number, number]
                }
            ];
        }
    }

    if (tablaEnfermedadesContent && tablaAntecedentesContent) {
        contenido.push({
            columns: [
                { width: '50%', stack: tablaEnfermedadesContent },
                { width: '50%', stack: tablaAntecedentesContent }
            ],
            columnGap: 40,
            margin: [0, 0, 0, 20]
        });
    } else {
        if (tablaEnfermedadesContent) (tablaEnfermedadesContent as any[]).forEach(item => contenido.push(item));
        if (tablaAntecedentesContent) (tablaAntecedentesContent as any[]).forEach(item => contenido.push(item));
    }

    // Sección 4: Factores de Riesgo Ocupacional
    if (imagenes.agentes) {
        // Verificar si hay datos de agentes de riesgo con valores mayores a 0
        const datosAgentes = props.tablasDatos?.agentesRiesgo;
        const hayDatosAgentes = datosAgentes && Array.isArray(datosAgentes) && datosAgentes.some(item => {
            if (item && Array.isArray(item) && item.length >= 2) {
                const cantidad = parseInt(item[1] || '0');
                return cantidad > 0;
            }
            return false;
        });

        if (hayDatosAgentes) {
            contenido.push(
                { text: `${numeroSeccion}. FACTORES DE RIESGO OCUPACIONAL`, style: 'tituloSeccion', pageBreak: 'before' },
                {
                    text: [
                        'Esta sección permite identificar ',
                        { text: 'agentes de riesgo presentes en el entorno laboral ', bold: true },
                        'y detectar ',
                        { text: 'exposiciones que pueden afectar la salud', bold: true },
                        ' del trabajador.',
                        '\n',
                        'Conocer estos factores ayuda a ',
                        { text: 'enfocar acciones preventivas, ', bold: true },
                        'cumplir con la normativa y ',
                        { text: 'reducir el riesgo de enfermedades o accidentes laborales', bold: true },
                        '.'
                    ],
                    style: 'textoNormal',
                    margin: [0, 0, 0, 10]
                },
                { 
                    image: imagenes.agentes, 
                    width: 400, 
                    alignment: 'center',
                    margin: [0, 0, 0, 20] 
                }
            );
                
            // Tabla de agentes de riesgo
            if (datosAgentes) {
                const datosAgentesFiltrados = datosAgentes
                    .filter(item => item && Array.isArray(item) && item.length >= 3)
                    .map(item => [
                        item[0] || '-',
                        `${item[1] || 0} (${item[2] || 0}%)`
                    ]);
                
                if (datosAgentesFiltrados.length > 0) {
                    const tablaAgentes = crearTablaPDF(
                        datosAgentesFiltrados,
                        ['Agente de Riesgo', 'Expuestos (Porcentaje)'],
                        'Detalle de Exposición a Agentes de Riesgo',
                        'agentesRiesgo'
                    );
                    tablaAgentes.forEach(item => contenido.push(item));
                }
            }
            numeroSeccion++; // Solo incrementar si se mostró la sección
        }
    }

    // Sección 5: Salud Visual
    contenido.push({ text: `${numeroSeccion}. SALUD VISUAL`, style: 'tituloSeccion', pageBreak: 'before' });
    const numeroSeccionSaludVisual = numeroSeccion; // Guardar el número de la sección de Salud Visual
    numeroSeccion++;

    // Tabla de agudeza visual sin corrección
    if (props.tablasDatos?.vision) {
        contenido.push(
            { text: `${numeroSeccionSaludVisual}.1 Agudeza Visual`, style: 'subtituloSeccion' },
            {
                text: [
                    'La ',
                    { text: 'agudeza visual', bold: true },
                    ' es una capacidad funcional clave para tareas que requieren ',
                    { text: 'precisión, vigilancia y detección oportuna de riesgos', bold: true },
                    '. Esta evaluación permite conocer el ',
                    { text: 'nivel de visión sin ayudas ópticas', bold: true },
                    ', ayudando a identificar posibles ',
                    { text: 'limitaciones que pueden afectar el desempeño seguro', bold: true },
                    ' en diversas actividades laborales.'
                ],
                style: 'textoNormal',
                margin: [0, 0, 0, 10]
            }
        );
        
        const datosVision = props.tablasDatos.vision
            .filter(item => item && Array.isArray(item) && item.length >= 3)
            .map(item => [
                (item[0] || '-').replace('Visión ', '').replace(/^\w/, c => c.toUpperCase()), // Remover "Visión " y capitalizar primera letra
                `${item[1] || 0} (${item[2] || 0}%)`
            ]);
        
        if (datosVision.length > 0) {
            // Función para asignar color según la categoría de visión
            const getVisionCellStyle = (categoria: string) => {
                if (categoria.includes('Excepcional') || categoria.includes('Normal')) return 'tableCellEmerald';
                if (categoria.includes('Ligeramente')) return 'tableCellAmber';
                if (categoria.includes('Moderadamente')) return 'tableCellOrange';
                if (categoria.includes('Significativamente')) return 'tableCellRed';
                if (categoria.includes('Muy')) return 'tableCellDarkRed';
                return 'tableCellMedium';
            };
            
            const tablaResultadosAV = [
                { text: 'Resultados de A. V. sin corrección', style: 'subtituloTabla' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 'auto'],
                        body: [
                            [
                                { text: 'Categoría Visión', style: 'tableHeaderMedium' },
                                { text: 'Trabajadores (%)', style: 'tableHeaderMedium' }
                            ],
                            ...datosVision.map(row => [
                                { text: row[0], style: 'tableCellMedium' },
                                { text: row[1], style: getVisionCellStyle(row[0]) }
                            ])
                        ]
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 0] as [number, number, number, number]
                }
            ];
            
            const tablaReferenciaAV = [
                { text: 'Interpretación de la Agudeza Visual', style: 'subtituloTabla' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 'auto'],
                        body: [
                            [
                                { text: 'AGUDEZA VISUAL', style: 'tableHeaderMedium' },
                                { text: 'CATEGORÍA VISIÓN', style: 'tableHeaderMedium' }
                            ],
                            [
                                { text: '20/10 – 20/15', style: 'tableCellMedium' },
                                { text: 'Excepcional', style: 'tableCellMedium' }
                            ],
                            [
                                { text: '20/20 – 20/25', style: 'tableCellMedium' },
                                { text: 'Normal', style: 'tableCellMedium' }
                            ],
                            [
                                { text: '20/30 – 20/35', style: 'tableCellMedium' },
                                { text: 'Ligeramente reducida', style: 'tableCellMedium' }
                            ],
                            [
                                { text: '20/40 – 20/45', style: 'tableCellMedium' },
                                { text: 'Moderadamente reducida', style: 'tableCellMedium' }
                            ],
                            [
                                { text: '20/50 – 20/55', style: 'tableCellMedium' },
                                { text: 'Significativamente reducida', style: 'tableCellMedium' }
                            ],
                            [
                                { text: '> 20/60', style: 'tableCellMedium' },
                                { text: 'Muy reducida', style: 'tableCellMedium' }
                            ]
                        ]
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 0] as [number, number, number, number]
                }
            ];
        
        contenido.push({
                columns: [
                    { width: '50%', stack: tablaResultadosAV },
                    { width: '50%', stack: tablaReferenciaAV }
                ],
                columnGap: 20,
                margin: [0, 0, 0, 20]
            });
        }
    }

    if (imagenes.lentes) {
        contenido.push(
            { text: `${numeroSeccionSaludVisual}.2 Necesidad de Corrección Visual`, style: 'subtituloSeccion' },
            {
                text: [
                    'Identificar a los trabajadores que requieren ',
                    { text: 'lentes para alcanzar una visión adecuada', bold: true },
                    ' es esencial en el ',
                    { text: 'análisis de riesgos', bold: true },
                    '. Una ',
                    { text: 'proporción elevada', bold: true },
                    ' puede indicar la necesidad de ',
                    { text: 'protocolos específicos', bold: true },
                    ' para garantizar que el personal cuente con los ',
                    { text: 'medios ópticos necesarios', bold: true },
                    ' para realizar sus funciones sin comprometer la ',
                    { text: 'seguridad ni la productividad', bold: true },
                    '.'
                ],
                style: 'textoNormal',
                margin: [0, 0, 0, 10]
            }
        );
        
        // Obtener datos de la gráfica de lentes
        const datosLentes = props.tablasDatos?.lentes;
        const requierenLentes = datosLentes?.requiere || 0;
        const noRequierenLentes = datosLentes?.chart?.datasets?.[0]?.data?.[1] || 0;
        const porcentajeRequieren = datosLentes?.porcentaje || 0;
        const totalLentes = requierenLentes + noRequierenLentes;
        
        // Crear tabla con gráfica y datos lado a lado
        const tablaLentesCombinada = {
            table: {
                widths: ['50%', '50%'],
                body: [
                    [
                        // Columna izquierda: Gráfica
                        {
                            image: imagenes.lentes,
                            width: 150,
                            alignment: 'center'
                        },
                        // Columna derecha: Tabla de datos
                        {
                            table: {
                                headerRows: 1,
                                widths: ['*', 'auto'],
                                body: [
                                    [
                                        { text: 'Categoría', style: 'tableHeaderMedium' },
                                        { text: 'Cantidad', style: 'tableHeaderMedium' }
                                    ],
                                    [
                                        { text: 'Requieren lentes', style: 'tableCellMedium' },
                                        { text: `${requierenLentes} (${porcentajeRequieren}%)`, style: 'tableCellMedium' }
                                    ],
                                    [
                                        { text: 'No requieren', style: 'tableCellMedium' },
                                        { text: `${noRequierenLentes} (${totalLentes > 0 ? Math.round((noRequierenLentes / totalLentes) * 100) : 0}%)`, style: 'tableCellMedium' }
                                    ]
                                ]
                            },
                            layout: 'lightHorizontalLines',
                            margin: [0, 20, 0, 0]
                        }
                    ]
                ]
            },
            layout: 'noBorders',
            margin: [0, 10, 0, 20]
            
        } as Content;
        
        
        contenido.push(tablaLentesCombinada);
        
        // Texto adicional debajo de la tabla
        contenido.push({
            text: 'Trabajadores que necesitan lentes',
            style: 'pieTabla',
            italics: true,
            alignment: 'center',
            margin: [0, 0, 0, 20] as [number, number, number, number]
        });
    }

    if (imagenes.corregida) {
        contenido.push(
            { text: `${numeroSeccionSaludVisual}.3 Corrección Visual Implementada`, style: 'subtituloSeccion', pageBreak: 'before' },
            {
                text: [
                    'Este indicador permite valorar si los trabajadores con ',
                    { text: 'necesidad de corrección', bold: true },
                    ' ya cuentan con lentes y los ',
                    { text: 'utilizan adecuadamente.', bold: true },
                    'Una ',
                    { text: 'baja implementación ', bold: true },
                    'puede señalar una ',
                    { text: 'brecha en el seguimiento médico', bold: true },
                    ' o en las ',
                    { text: 'medidas preventivas,', bold: true },
                    ' lo cual representa un ',
                    { text: 'riesgo controlable', bold: true },
                    ' mediante ',
                    { text: 'educación, supervisión y políticas internas claras', bold: true },
                    '.'
                ],
                style: 'textoNormal',
                margin: [0, 0, 0, 10]
            }
        );
        
        // Obtener datos de la gráfica de vista corregida
        const datosVistaCorregida = props.tablasDatos?.vistaCorregida;
        const usanLentes = datosVistaCorregida?.usan || 0;
        const noUsanLentes = datosVistaCorregida?.chart?.datasets?.[0]?.data?.[1] || 0;
        const porcentajeUsan = datosVistaCorregida?.porcentaje || 0;
        const totalVistaCorregida = usanLentes + noUsanLentes;
        
        // Crear tabla con gráfica y datos lado a lado
        const tablaVistaCorregidaCombinada = {
            table: {
                widths: ['50%', '50%'],
                body: [
                    [
                        // Columna izquierda: Gráfica
                        {
                            image: imagenes.corregida,
                            width: 150,
                            alignment: 'center'
                        },
                        // Columna derecha: Tabla de datos
                        {
                            table: {
                                headerRows: 1,
                                widths: ['*', 'auto'],
                                body: [
                                    [
                                        { text: 'Categoría', style: 'tableHeaderMedium' },
                                        { text: 'Cantidad', style: 'tableHeaderMedium' }
                                    ],
                                    [
                                        { text: 'Usan lentes', style: 'tableCellMedium' },
                                        { text: `${usanLentes} (${porcentajeUsan}%)`, style: 'tableCellEmerald' }
                                    ],
                                    [
                                        { text: 'No usan lentes', style: 'tableCellMedium' },
                                        { text: `${noUsanLentes} (${totalVistaCorregida > 0 ? Math.round((noUsanLentes / totalVistaCorregida) * 100) : 0}%)`, style: 'tableCellMedium' }
                                    ]
                                ]
                            },
                            layout: 'lightHorizontalLines',
                            margin: [0, 20, 0, 0]
                        }
                    ]
                ]
            },
            layout: 'noBorders',
            margin: [0, 10, 0, 20]
        } as Content;
        
        contenido.push(tablaVistaCorregidaCombinada);

        // Texto adicional debajo de la tabla
        contenido.push({
            text: 'Trabajadores que ya corrigieron su vista con lentes',
            style: 'pieTabla',
            italics: true,
            alignment: 'center',
            margin: [0, 0, 0, 30] as [number, number, number, number]
        });
    }

    if (imagenes.daltonismo) {
        contenido.push(
            { text: `${numeroSeccionSaludVisual}.4 Alteraciones en la Percepción de Colores`, style: 'subtituloSeccion' },
            {
                text: [
                    'La ',
                    { text: 'percepción adecuada del color', bold: true },
                    ' es crucial en tareas donde se deben distinguir ',
                    { text: 'señales, etiquetas, indicadores visuales o cableado', bold: true },
                    '. Este indicador permite identificar trabajadores con ',
                    { text: 'daltonismo u otras alteraciones cromáticas', bold: true },
                    ', lo cual puede ser relevante para la ',
                    { text: 'asignación segura de funciones', bold: true },
                    '.',
                    '\n\n',
                    'Conocer esta condición permite a la empresa ',
                    { text: 'reducir riesgos asociados a errores visuales', bold: true },
                    ' y tomar ',
                    { text: 'decisiones informadas', bold: true },
                    ' sobre la ',
                    { text: 'adaptación de entornos de trabajo', bold: true },
                    ' o ',
                    { text: 'medidas compensatorias', bold: true },
                    ' cuando sea necesario.'
                ],
                style: 'textoNormal',
                margin: [0, 0, 0, 10]
            }
        );
        
        // Obtener datos de la gráfica de daltonismo
        const datosDaltonismo = props.tablasDatos?.daltonismo;
        const conDaltonismo = datosDaltonismo?.conDaltonismo || 0;
        const sinDaltonismo = datosDaltonismo?.chart?.datasets?.[0]?.data?.[1] || 0;
        const porcentajeDaltonismo = datosDaltonismo?.porcentaje || 0;
        const totalDaltonismo = conDaltonismo + sinDaltonismo;
        
        // Crear tabla con gráfica y datos lado a lado
        const tablaDaltonismoCombinada = {
            table: {
                widths: ['50%', '50%'],
                body: [
                    [
                        // Columna izquierda: Gráfica
                        {
                            image: imagenes.daltonismo,
                            width: 150,
                            alignment: 'center'
                        },
                        // Columna derecha: Tabla de datos
                        {
                            table: {
                                headerRows: 1,
                                widths: ['*', 'auto'],
                                body: [
                                    [
                                        { text: 'Categoría', style: 'tableHeaderMedium' },
                                        { text: 'Cantidad', style: 'tableHeaderMedium' }
                                    ],
                                    [
                                        { text: 'Con daltonismo', style: 'tableCellMedium' },
                                        { text: `${conDaltonismo} (${porcentajeDaltonismo}%)`, style: 'tableCellOrange' }
                                    ],
                                    [
                                        { text: 'Sin daltonismo', style: 'tableCellMedium' },
                                        { text: `${sinDaltonismo} (${totalDaltonismo > 0 ? Math.round((sinDaltonismo / totalDaltonismo) * 100) : 0}%)`, style: 'tableCellMedium' }
                                    ]
                                ]
                            },
                            layout: 'lightHorizontalLines',
                            margin: [0, 20, 0, 0]
                        }
                    ]
                ]
            },
            layout: 'noBorders',
            margin: [0, 10, 0, 20]
        } as Content;
        
        contenido.push(tablaDaltonismoCombinada);

        // Texto adicional debajo de la tabla
    contenido.push({
            text: 'Alteración en la percepción del color',
            style: 'pieTabla',
            italics: true,
            alignment: 'center',
            margin: [0, 0, 0, 20] as [number, number, number, number]
        });
    }

    // Sección 6: Estudios de Gabinete
    const construirFilasDistribucion = (grafica: any): [string, string][] => {
        const labels: string[] = Array.isArray(grafica?.labels) ? grafica.labels : [];
        const data: number[] = Array.isArray(grafica?.datasets?.[0]?.data) ? grafica.datasets[0].data : [];
        const total = data.reduce((acc, value) => acc + (Number(value) || 0), 0);
        return labels.map((label, index) => {
            const cantidad = Number(data[index]) || 0;
            const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;
            return [label, `${cantidad} (${porcentaje}%)`] as [string, string];
        });
    };
    const tieneResultados = (filas: [string, string][]): boolean => (
        filas.length > 0 && filas.some((fila) => {
            const cantidadMatch = fila[1].match(/^(\d+)/);
            const cantidad = cantidadMatch ? parseInt(cantidadMatch[1], 10) : 0;
            return cantidad > 0;
        })
    );

    const filasTamizajeBipolar = construirFilasDistribucion(props.tablasDatos?.tamizajeBipolarTEA?.chart);
    const filasTamizajeProdromal = construirFilasDistribucion(props.tablasDatos?.tamizajeProdromal?.chart);
    const filasTamizajeTlp = construirFilasDistribucion(props.tablasDatos?.tamizajeTLP);
    const filasAudiometria = construirFilasDistribucion(props.tablasDatos?.audiometriaDistribucion);
    const filasEspirometria = construirFilasDistribucion(props.tablasDatos?.espirometriaDistribucion);
    const filasEkg = construirFilasDistribucion(props.tablasDatos?.ekgDistribucion);
    const filasRayosX = construirFilasDistribucion(props.tablasDatos?.rayosXDistribucion);
    const filasAnalisisLaboratorio = construirFilasDistribucion(props.tablasDatos?.analisisLaboratorioDistribucion);

    const coloresTamizajeBipolar: string[] = props.tablasDatos?.tamizajeBipolarTEA?.chart?.datasets?.[0]?.backgroundColor ?? [];
    const coloresTamizajeProdromal: string[] = props.tablasDatos?.tamizajeProdromal?.chart?.datasets?.[0]?.backgroundColor ?? [];
    const coloresTamizajeTlp: string[] = props.tablasDatos?.tamizajeTLP?.datasets?.[0]?.backgroundColor ?? [];
    const coloresAudiometria: string[] = props.tablasDatos?.audiometriaDistribucion?.datasets?.[0]?.backgroundColor ?? [];
    const coloresEspirometria: string[] = props.tablasDatos?.espirometriaDistribucion?.datasets?.[0]?.backgroundColor ?? [];
    const coloresEkg: string[] = props.tablasDatos?.ekgDistribucion?.datasets?.[0]?.backgroundColor ?? [];
    const coloresRayosX: string[] = props.tablasDatos?.rayosXDistribucion?.datasets?.[0]?.backgroundColor ?? [];
    const coloresAnalisisLaboratorio: string[] = props.tablasDatos?.analisisLaboratorioDistribucion?.datasets?.[0]?.backgroundColor ?? [];

    const mostrarTamizajeBipolar = Boolean(imagenes.tamizajeBipolarTEA) && tieneResultados(filasTamizajeBipolar);
    const mostrarTamizajeProdromal = Boolean(imagenes.tamizajeProdromal) && tieneResultados(filasTamizajeProdromal);
    const mostrarTamizajeTlp = Boolean(imagenes.tamizajeTLP) && tieneResultados(filasTamizajeTlp);
    const hayTamizajesPsicologicos = mostrarTamizajeBipolar || mostrarTamizajeProdromal || mostrarTamizajeTlp;

    const mostrarAudiometria = Boolean(imagenes.audiometriaDistribucion) && tieneResultados(filasAudiometria);
    const mostrarEspirometria = Boolean(imagenes.espirometriaDistribucion) && tieneResultados(filasEspirometria);
    const mostrarEkg = Boolean(imagenes.ekgDistribucion) && tieneResultados(filasEkg);
    const mostrarRayosX = Boolean(imagenes.rayosXDistribucion) && tieneResultados(filasRayosX);
    const mostrarAnalisisLaboratorio = Boolean(imagenes.analisisLaboratorioDistribucion) && tieneResultados(filasAnalisisLaboratorio);
    const hayGabinete = mostrarAudiometria || mostrarEspirometria || mostrarEkg || mostrarRayosX || mostrarAnalisisLaboratorio;

    const COLOR_NEUTRO_CERO = '#6B7280';
    const crearBloqueDistribucion = (
        titulo: string,
        descripcion: string | (string | { text: string; bold?: boolean })[],
        descripcion2: string | (string | { text: string; bold?: boolean })[],
        imagen: string | undefined,
        filas: [string, string][],
        colores: string[],
        pageBreak: boolean,
        /** Solo Rayos X: muchas filas; reduce tipografía y márgenes para que quepa en una página */
        tablaCompacta = false,
        etiquetasColorOscuro: string[] = []
    ) => {
        if (!imagen || !tieneResultados(filas)) return;

        const estHeader = tablaCompacta ? 'tableHeaderDistribucionCompact' : 'tableHeader';
        const estCelda = tablaCompacta ? 'tableCellDistribucionCompact' : 'tableCellMedium';

        contenido.push({
            text: titulo,
            style: 'subtituloSeccion',
            ...(pageBreak ? { pageBreak: 'before' } : {})
        });

        contenido.push({
            text: descripcion,
            style: 'textoNormal',
            margin: [0, 0, 0, 10]
        });

        if (descripcion2) {
            contenido.push({
                text: descripcion2,
                style: 'textoNormal',
                margin: [0, 0, 0, 10]
            });
        }

        contenido.push({
            image: imagen,
            width: 400,
            alignment: 'center',
            margin: [0, 0, 0, tablaCompacta ? 10 : 15]
        });

        const tablaDistribucion = {
            table: {
                headerRows: 1,
                widths: ['*', '*'],
                body: [
                    [
                        { text: 'Resultado', style: estHeader },
                        { text: 'Casos (%)', style: estHeader }
                    ],
                    ...filas.map((fila, index) => {
                        const textoCasos = fila[1];
                        const cantidadMatch = textoCasos.match(/^(\d+)/);
                        const cantidad = cantidadMatch ? parseInt(cantidadMatch[1], 10) : 0;
                        const forzarOscuro = etiquetasColorOscuro.includes(fila[0]);
                        const colorTexto = cantidad === 0
                            ? COLOR_NEUTRO_CERO
                            : forzarOscuro
                                ? '#4B5563'
                            : (colores[index] || undefined);
                        const celdaPorcentaje = {
                            text: textoCasos,
                            style: estCelda,
                            ...(colorTexto ? { color: colorTexto } : {})
                        };
                        return [
                            { text: fila[0], style: estCelda },
                            celdaPorcentaje
                        ];
                    })
                ]
            },
            layout: 'lightHorizontalLines',
            margin: tablaCompacta ? [0, 3, 0, 10] : [0, 5, 0, 15]
        } as Content;

        contenido.push(tablaDistribucion);
    };
    const crearBloqueAnilloTabla = (
        titulo: string,
        descripcion: string | (string | { text: string; bold?: boolean })[],
        descripcion2: string | (string | { text: string; bold?: boolean })[],
        imagen: string | undefined,
        filas: [string, string][],
        colores: string[],
        pageBreak: boolean,
        pie: string,
        etiquetasColorOscuro: string[] = []
    ) => {
        if (!imagen || !tieneResultados(filas)) return;

        contenido.push({
            text: titulo,
            style: 'subtituloSeccion',
            ...(pageBreak ? { pageBreak: 'before' } : {})
        });

        contenido.push({
            text: descripcion,
            style: 'textoNormal',
            margin: [0, 0, 0, 10]
        });

        if (descripcion2) {
            contenido.push({
                text: descripcion2,
                style: 'textoNormal',
                margin: [0, 0, 0, 10]
            });
        }

        const filasTabla = filas.map((fila, index) => {
            const textoCasos = fila[1];
            const cantidadMatch = textoCasos.match(/^(\d+)/);
            const cantidad = cantidadMatch ? parseInt(cantidadMatch[1], 10) : 0;
            const forzarOscuro = etiquetasColorOscuro.includes(fila[0]);
            const colorTexto = cantidad === 0
                ? COLOR_NEUTRO_CERO
                : forzarOscuro
                    ? '#4B5563'
                : (colores[index] || undefined);
            return [
                { text: fila[0], style: 'tableCellMedium' },
                {
                    text: textoCasos,
                    style: 'tableCellMedium',
                    ...(colorTexto ? { color: colorTexto } : {})
                }
            ];
        });

        const tablaCombinada = {
            unbreakable: true,
            table: {
                widths: ['50%', '50%'],
                body: [[
                    {
                        image: imagen,
                        width: 150,
                        alignment: 'center'
                    },
                    {
                        table: {
                            headerRows: 1,
                            widths: ['*', 'auto'],
                            body: [
                                [
                                    { text: 'Categoría', style: 'tableHeaderMedium' },
                                    { text: 'Cantidad', style: 'tableHeaderMedium' }
                                ],
                                ...filasTabla
                            ]
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 20, 0, 0]
                    }
                ]]
            },
            layout: 'noBorders',
            margin: [0, 10, 0, 20]
        } as Content;

        contenido.push(tablaCombinada);
        contenido.push({
            text: pie,
            style: 'pieTabla',
            italics: true,
            alignment: 'center',
            margin: [0, 0, 0, 20] as [number, number, number, number]
        });
    };

    if (hayTamizajesPsicologicos) {
        contenido.push({ text: `${numeroSeccion}. TAMIZAJES DE CUESTIONARIOS PSICOLÓGICOS`, style: 'tituloSeccion', pageBreak: 'before' });
        const numeroSeccionTamizajes = numeroSeccion;
        const bloquesTamizajes = [
            mostrarTamizajeBipolar ? {
                nombre: 'Riesgo de Trastorno Bipolar (Trastornos del Estado de Ánimo)',
                tipo: 'anillo' as const,
                descripcion: [
                    'El cuestionario de trastornos del estado de ánimo permite identificar ',
                    { text: 'indicios tempranos compatibles con riesgo bipolar', bold: true },
                    ' para orientar seguimiento clínico oportuno.'
                ],
                descripcion2: [
                    'Este resultado se interpreta como ',
                    { text: 'tamizaje operativo', bold: true },
                    '; no sustituye una valoración diagnóstica especializada.'
                ],
                imagen: imagenes.tamizajeBipolarTEA,
                filas: filasTamizajeBipolar,
                colores: coloresTamizajeBipolar,
                pie: 'Distribución de tamizaje bipolar: Positivo vs Negativo.'
            } : null,
            mostrarTamizajeProdromal ? {
                nombre: 'Riesgo Psicótico (Cuestionario Prodromal Breve)',
                tipo: 'anillo' as const,
                descripcion: [
                    'El cuestionario prodromal breve ayuda a detectar ',
                    { text: 'señales de posible riesgo psicótico', bold: true },
                    ' en una etapa inicial.'
                ],
                descripcion2: [
                    'La clasificación Positivo/Negativo funciona como ',
                    { text: 'herramienta de tamizaje', bold: true },
                    ' y debe complementarse con evaluación clínica integral cuando corresponda.'
                ],
                imagen: imagenes.tamizajeProdromal,
                filas: filasTamizajeProdromal,
                colores: coloresTamizajeProdromal,
                pie: 'Distribución de tamizaje psicótico: Positivo vs Negativo.'
            } : null,
            mostrarTamizajeTlp ? {
                nombre: 'Tamizaje de Rasgos Límite de la Personalidad (TLP)',
                tipo: 'barras' as const,
                descripcion: [
                    'La distribución por categorías resume la ',
                    { text: 'presencia de síntomas compatibles con TLP', bold: true },
                    ' en la población evaluada.'
                ],
                descripcion2: [
                    'Estas categorías representan ',
                    { text: 'niveles de probabilidad en tamizaje', bold: true },
                    ' y deben confirmarse mediante valoración especializada.'
                ],
                imagen: imagenes.tamizajeTLP,
                filas: filasTamizajeTlp,
                colores: coloresTamizajeTlp
            } : null
        ].filter((bloque): bloque is NonNullable<typeof bloque> => bloque !== null);

        let subIndexTamizajes = 0;
        for (const bloque of bloquesTamizajes) {
            subIndexTamizajes++;
            if (bloque.tipo === 'anillo') {
                crearBloqueAnilloTabla(
                    `${numeroSeccionTamizajes}.${subIndexTamizajes} ${bloque.nombre}`,
                    bloque.descripcion,
                    bloque.descripcion2,
                    bloque.imagen,
                    bloque.filas,
                    bloque.colores,
                    false,
                    bloque.pie,
                    ['Negativo']
                );
            } else {
                crearBloqueDistribucion(
                    `${numeroSeccionTamizajes}.${subIndexTamizajes} ${bloque.nombre}`,
                    bloque.descripcion,
                    bloque.descripcion2,
                    bloque.imagen,
                    bloque.filas,
                    bloque.colores,
                    subIndexTamizajes > 1
                    ,
                    false,
                    ['Síntomas improbables']
                );
            }
        }

        numeroSeccion++;
    }

    if (hayGabinete) {
        contenido.push({ text: `${numeroSeccion}. ESTUDIOS DE GABINETE`, style: 'tituloSeccion', pageBreak: 'before' });
        const numeroSeccionGabinete = numeroSeccion;

        const bloquesGabinete = [
            mostrarAudiometria ? {
                nombre: 'Audiometría',
                descripcion: [
                    'La audición adecuada es fundamental para la ',
                    { text: 'comunicación, la atención y la respuesta ante señales de alerta', bold: true },
                    'en el entorno laboral.'
                ],
                descripcion2: [
                    'Este indicador permite ',
                    { text: 'detectar alteraciones auditivas', bold: true },
                    'que pueden comprometer la seguridad, especialmente en áreas con maquinaria, tránsito vehicular o trabajo en equipo. Su detección oportuna facilita la ',
                    { text: 'prevención de accidentes y el ajuste de condiciones de trabajo', bold: true },
                    'según cada caso.'
                ],
                imagen: imagenes.audiometriaDistribucion,
                filas: filasAudiometria,
                colores: coloresAudiometria
            } : null,
            mostrarEspirometria ? {
                nombre: 'Espirometría',
                descripcion: [
                    'Las alteraciones en la función respiratoria pueden ',
                    { text: 'afectar la resistencia física, la oxigenación y el rendimiento general', bold: true },
                    ' en el trabajo.'
                ],
                descripcion2: [
                    'Este estudio permite identificar ',
                    { text: 'limitaciones obstructivas, restrictivas o mixtas,', bold: true },
                    'útiles para detectar enfermedades respiratorias y ',
                    { text: 'evaluar riesgos en ambientes con exposición a polvos, gases o esfuerzo físico sostenido.', bold: true },
                    ' Su detección facilita el seguimiento clínico y la adaptación de tareas.'
                ],
                imagen: imagenes.espirometriaDistribucion,
                filas: filasEspirometria,
                colores: coloresEspirometria
            } : null,
            mostrarEkg ? {
                nombre: 'Electrocardiograma (EKG)',
                descripcion: [
                    'Las alteraciones eléctricas del corazón pueden ',
                    { text: 'aumentar el riesgo de eventos cardiovasculares agudos', bold: true },
                    ' durante la jornada laboral, especialmente en actividades de alta demanda física o bajo estrés.'
                ],
                descripcion2: [
                    'Este estudio permite ',
                    { text: 'identificar arritmias, trastornos de conducción y otros hallazgos relevantes', bold: true },
                    ', facilitando el seguimiento médico y la ',
                    { text: 'prevención de incidentes asociados a condiciones cardíacas no detectadas.', bold: true },
                ],
                imagen: imagenes.ekgDistribucion,
                filas: filasEkg,
                colores: coloresEkg
            } : null,
            mostrarRayosX ? {
                nombre: 'Rayos X',
                tablaCompacta: true,
                descripcion: [
                    'Los hallazgos en estudios de imagen pueden ',
                    { text: 'orientar sobre alteraciones estructurales', bold: true },
                    ' relevantes para la aptitud ocupacional o el seguimiento clínico.'
                ],
                descripcion2: [
                    'La distribución por ',
                    { text: 'categorías de alteración', bold: true },
                    ' resume los tipos de hallazgos registrados; un mismo trabajador puede aportar más de una categoría cuando corresponde.'
                ],
                imagen: imagenes.rayosXDistribucion,
                filas: filasRayosX,
                colores: coloresRayosX
            } : null,
            mostrarAnalisisLaboratorio ? {
                nombre: 'Análisis de laboratorio',
                descripcion: [
                    'Los parámetros de laboratorio permiten ',
                    { text: 'detectar alteraciones metabólicas, hematológicas u otras', bold: true },
                    ' que puedan requerir seguimiento o interconsulta.'
                ],
                descripcion2: [
                    'La distribución por ',
                    { text: 'categorías', bold: true },
                    ' agrupa los tipos de alteración registrados; un trabajador puede figurar en más de una categoría.'
                ],
                imagen: imagenes.analisisLaboratorioDistribucion,
                filas: filasAnalisisLaboratorio,
                colores: coloresAnalisisLaboratorio
            } : null
        ].filter((bloque): bloque is NonNullable<typeof bloque> => bloque !== null);

        let subIndex = 0;
        for (const bloque of bloquesGabinete) {
            subIndex++;
            crearBloqueDistribucion(
                `${numeroSeccionGabinete}.${subIndex} ${bloque.nombre}`,
                bloque.descripcion,
                bloque.descripcion2,
                bloque.imagen,
                bloque.filas,
                bloque.colores,
                subIndex > 1,
                'tablaCompacta' in bloque && bloque.tablaCompacta === true
            );
        }

        numeroSeccion++;
    }

    // Sección 7: Aptitud al Puesto
    if (imagenes.aptitud) {
        contenido.push(
            { text: `${numeroSeccion}. RESULTADOS DE EXÁMENES MÉDICOS PERIÓDICOS`, style: 'tituloSeccion', pageBreak: 'before' },
            {
                text: [
                    'El objetivo del examen médico laboral es ',
                    { text: 'valorar el estado de salud del trabajador', bold: true },
                    ', identificar posibles ',
                    { text: 'alteraciones relacionadas con el trabajo', bold: true },
                    ' y determinar su ',
                    { text: 'aptitud para las funciones asignadas.', bold: true },
                    ' Los resultados permiten ',
                    { text: 'detectar riesgos para la salud,', bold: true },
                    { text: 'implementar medidas preventivas', bold: true },
                    ' y ',
                    { text: 'verificar la capacidad del individuo para desempeñar su puesto', bold: true },
                    '.'
                ],
                style: 'textoNormal',
                margin: [0, 0, 0, 10]
            },
            { 
                image: imagenes.aptitud, 
                width: 365, 
                alignment: 'center',
                margin: [0, 10, 0, 20] 
            }
        );
        
        // Tabla de aptitud
        if (props.tablasDatos?.aptitud) {
            const datosAptitud = props.tablasDatos.aptitud
                .filter(item => item && Array.isArray(item) && item.length >= 3)
                .map(item => {
                    const resultado = item[0] || '-';
                    let explicacion = '';
                    
                    // Asignar explicación específica según el resultado
                    switch (resultado) {
                        case 'Apto Sin Restricciones':
                            explicacion = 'No tiene impedimentos para el puesto al que aspira o desempeña.';
                            break;
                        case 'Apto Con Precaución':
                            explicacion = 'Requiere vigilancia médica más frecuente. \n\n';
                            break;
                        case 'Apto Con Restricciones':
                            explicacion = 'Requiere adaptaciones razonables para asegurar su seguridad y salud.';
                            break;
                        case 'No Apto':
                            explicacion = 'No está permitido el desempeño del puesto al que aspira.';
                            break;
                        default:
                            explicacion = 'Para concluir, requiere evaluaciones adicionales o tratamiento médico.';
                    }
                    
                    return [
                        resultado,
                        `${item[1] || 0} (${item[2] || 0}%)`,
                        explicacion
                    ];
                });
            
            if (datosAptitud.length > 0) {
                const tablaAptitud = crearTablaPDF(
                    datosAptitud,
                    ['Resultado', 'Trabajadores (%)', 'Explicación'],
                    'RESULTADOS EXAMENES MÉDICOS',
                    'aptitud'
                );
                tablaAptitud.forEach(item => contenido.push(item));
            }
        }
        numeroSeccion++; // Incrementar para las siguientes secciones
    }

    // Secciones personalizadas
    // Agregar conclusiones si existen
    if (props.conclusiones && !isHtmlContentEmpty(props.conclusiones)) {
        const conclusionesContent = conclusionesToPdfMake(props.conclusiones, numeroSeccion);
        contenido.push(...conclusionesContent);
        numeroSeccion++;
    }

    // Agregar recomendaciones si existen
    if (props.formatoRecomendaciones === 'texto' && props.recomendacionesTexto && !isHtmlContentEmpty(props.recomendacionesTexto)) {
        const recomendacionesContent = recomendacionesTextoToPdfMake(props.recomendacionesTexto, numeroSeccion);
        contenido.push(...recomendacionesContent);
    } else if (props.formatoRecomendaciones === 'tabla' && props.recomendacionesTabla && props.recomendacionesTabla.length > 0) {
        const recomendacionesContent = recomendacionesTablaToPdfMake(props.recomendacionesTabla, numeroSeccion);
        contenido.push(...recomendacionesContent);
    }

    return {
        content: [...portada, ...contenido],
        styles: {
            // Estilos para la nueva portada corporativa
            portadaTituloPrincipal: {
                fontSize: 28,
                bold: true,
                color: '#059669',
                alignment: 'center',
                characterSpacing: 2,
                margin: [0, 0, 0, 15]
            },
            portadaSubtitulo: {
                fontSize: 22,
                bold: true,
                color: '#1F2937',
                alignment: 'center',
                margin: [0, 0, 0, 8]
            },
            portadaRazonSocial: {
                fontSize: 16,
                color: '#6B7280',
                alignment: 'center',
                italics: true,
                margin: [0, 0, 0, 0]
            },
            portadaLabel: {
                fontSize: 10,
                bold: true,
                color: '#059669',
                alignment: 'left'
            },
            portadaValue: {
                fontSize: 11,
                color: '#374151',
                alignment: 'left'
            },
            portadaLabelRight: {
                fontSize: 10,
                bold: true,
                color: '#059669',
                alignment: 'right'
            },
            portadaValueRight: {
                fontSize: 11,
                color: '#374151',
                alignment: 'right'
            },
            portadaBlurb: {
                fontSize: 10,
                color: '#4B5563',
                lineHeight: 1.4,
                alignment: 'center'
            },
            portadaFooterBrand: {
                fontSize: 9,
                color: '#6B7280',
                alignment: 'left'
            },
            tituloEmpresa: { 
                fontSize: 24, 
                bold: true, 
                color: '#374151', // Gris oscuro
                alignment: 'left',
                margin: [0, 0, 0, 2]
            },
            razonSocial: { 
                fontSize: 13, 
                color: '#6B7280',
                alignment: 'left',
                italics: true,
                margin: [0, 0, 0, 8]
            },
            tituloInforme: { 
                fontSize: 18, 
                bold: true, 
                color: '#059669',
                alignment: 'left',
                characterSpacing: 2,
                margin: [0, 0, 0, 8]
            },
            totalTrabajadores: { 
                fontSize: 14, 
                bold: true, 
                color: '#059669',
                alignment: 'left',
                margin: [0, 0, 0, 5]
            },
            totalTrabajadoresLabel: { 
                fontSize: 14, 
                bold: true, 
                color: '#059669',
                alignment: 'left'
            },
            totalTrabajadoresNumero: { 
                fontSize: 14, 
                bold: true, 
                color: '#059669',
                decorationColor: '#059669'
            },
            centroTrabajo: { 
                fontSize: 13, 
                bold: true, 
                color: '#2563EB',
                alignment: 'left',
                decoration: 'underline',
                decorationColor: '#2563EB',
                margin: [0, 0, 0, 5]
            },
            centroTrabajoLabel: { 
                fontSize: 13, 
                bold: true, 
                color: '#2563EB',
                alignment: 'left'
            },
            centroTrabajoNombre: { 
                fontSize: 13, 
                bold: true, 
                color: '#2563EB',
                alignment: 'left',
                decoration: 'underline',
                decorationColor: '#2563EB'
            },
            periodo: { 
                fontSize: 12, 
                color: '#6B7280',
                alignment: 'left',
                italics: true,
                margin: [0, 0, 0, 5]
            },
            fecha: { 
                fontSize: 10, 
                color: '#9CA3AF',
                alignment: 'left',
                margin: [0, 0, 0, 0]
            },
            medicoResponsable: { 
                fontSize: 12, 
                bold: true, 
                color: '#1F2937',
                alignment: 'left',
                margin: [0, 8, 0, 0]
            },
            subtitulo: { 
                fontSize: 16, 
                bold: true, 
                color: '#059669',
                alignment: 'left'
            },
            tituloSeccion: { 
                fontSize: 16, 
                bold: true, 
                color: '#1F2937',
                margin: [0, 20, 0, 10],
                background: '#F3F4F6'
            },
            subtituloSeccion: { 
                fontSize: 14, 
                bold: true, 
                color: '#059669',
                margin: [0, 15, 0, 5]
            },
            textoNormal: { 
                fontSize: 11, 
                color: '#374151',
                lineHeight: 1.4,
                alignment: 'justify'
            },
            pieTabla: { 
                fontSize: 9, 
                color: '#6B7280',
                lineHeight: 1.4,
                alignment: 'justify'
            },
            subtituloTabla: { 
                fontSize: 12, 
                bold: true, 
                color: '#059669',
                margin: [0, 15, 0, 5]
            },
            tableHeader: { 
                fontSize: 10, 
                bold: true, 
                color: '#374151',
                background: '#F3F4F6',
                alignment: 'center',
                margin: [2, 2, 2, 2]
            },
            tableHeaderDistribucionCompact: {
                fontSize: 8,
                bold: true,
                color: '#374151',
                background: '#F3F4F6',
                alignment: 'center',
                margin: [1, 1, 1, 1],
                lineHeight: 1.12
            },
            tableCell: { 
                fontSize: 9, 
                color: '#374151',
                alignment: 'center',
                margin: [2, 2, 2, 2]
            },
            tableCellLeft: {
                fontSize: 9,
                color: '#374151',
                alignment: 'left',
                margin: [2, 2, 2, 2]
            },
            tableCellEmerald: {
                fontSize: 10,
                color: '#047857',
                alignment: 'center',
                margin: [2, 2, 2, 2]
            },
            tableCellAmber: {
                fontSize: 10,
                color: '#D97706',
                alignment: 'center',
                margin: [2, 2, 2, 2]
            },
            tableCellOrange: {
                fontSize: 10,
                color: '#F97316',
                alignment: 'center',
                margin: [2, 2, 2, 2]
            },
            tableCellRed: {
                fontSize: 10,
                color: '#EF4444',
                alignment: 'center',
                margin: [2, 2, 2, 2]
            },
            tableCellDarkRed: {
                fontSize: 10,
                color: '#B91C1C',
                alignment: 'center',
                margin: [2, 2, 2, 2]
            },
            tableCellRose: {
                fontSize: 10,
                color: '#DC2626',
                alignment: 'center',
                margin: [2, 2, 2, 2]
            },
            tableCellBlue: {
                fontSize: 10,
                color: '#1D4ED8',
                alignment: 'center',
                margin: [2, 2, 2, 2]
            },
            tableCellPink: {
                fontSize: 10,
                color: '#BE185D',
                alignment: 'center',
                margin: [2, 2, 2, 2]
            },
            tableCellGray: {
                fontSize: 10,
                color: '#374151',
                alignment: 'center',
                margin: [2, 2, 2, 2]
            },
            tableHeaderSmall: { 
                fontSize: 8, 
                bold: true, 
                color: '#374151',
                background: '#F3F4F6',
                alignment: 'center',
                margin: [1, 1, 1, 1]
            },
            tableCellSmall: { 
                fontSize: 8, 
                color: '#374151',
                alignment: 'center',
                margin: [1, 1, 1, 1]
            },
            tableCellLeftSmall: {
                fontSize: 8,
                color: '#374151',
                alignment: 'left',
                margin: [1, 1, 1, 1]
            },
            tableCellEmeraldSmall: {
                fontSize: 8,
                color: '#047857',
                alignment: 'center',
                margin: [1, 1, 1, 1]
            },
            tableCellAmberSmall: {
                fontSize: 8,
                color: '#D97706',
                alignment: 'center',
                margin: [1, 1, 1, 1]
            },
            tableCellRoseSmall: {
                fontSize: 8,
                color: '#DC2626',
                alignment: 'center',
                margin: [1, 1, 1, 1]
            },
            tableHeaderMedium: { 
                fontSize: 10, 
                bold: true, 
                color: '#374151',
                background: '#F3F4F6',
                alignment: 'center',
                margin: [3, 3, 3, 3]
            },
            tableCellMedium: { 
                fontSize: 10, 
                color: '#374151',
                alignment: 'center',
                margin: [3, 3, 3, 3]
            },
            tableCellDistribucionCompact: {
                fontSize: 9,
                color: '#374151',
                alignment: 'center',
                margin: [1, 1, 1, 1],
                lineHeight: 1.12
            },
            tableCellLeftMedium: {
                fontSize: 10,
                color: '#374151',
                alignment: 'left',
                margin: [3, 3, 3, 3]
            },
            piePagina: { 
                fontSize: 9, 
                color: '#9CA3AF',
                italics: true
            }
        },
        pageMargins: [40, 60, 40, 60],
        defaultStyle: {
            font: 'Roboto'
        },
        header: function(currentPage, pageCount) {
            // No mostrar header en la portada (página 1)
            if (currentPage === 1) {
                return null;
            }
            const logoCliente = props.logoClienteBase64 || props.logoBase64;
            const nombreEmpresa = props.nombreEmpresa || 'Empresa';
            const logoClienteValido = logoCliente && logoCliente.startsWith('data:image/');
            
            const columns: any[] = [];
            
            // Siempre crear dos columnas: una para el logo (o vacía) y otra para el contenido
            // Columna 1: Logo o espacio vacío
            if (logoClienteValido) {
                columns.push({
                    width: '20%',
                    image: logoCliente,
                    fit: [80, 40],
                    margin: [0, 0, 15, 0]
                });
            } else {
                // Si no hay logo, crear una celda vacía que ocupe el mismo espacio
                columns.push({
                    width: '20%',
                    text: ''
                });
            }
            
            // Columna 2: Contenido del header (siempre igual)
            columns.push({
                width: '80%',
                stack: [
                    {
                        text: nombreEmpresa.toUpperCase(),
                        fontSize: 14,
                        bold: true,
                        color: '#1F2937',
                        margin: [0, 0, 0, 3],
                        alignment: 'right'
                    },
                    {
                        text: 'INFORME DE SALUD LABORAL',
                        fontSize: 9,
                        color: '#059669',
                        bold: true,
                        alignment: 'right',
                        margin: [0, 0, 0, 3]
                    },
                    {
                        canvas: [
                            {
                                type: 'rect',
                                x: -100,
                                y: 0,
                                w: 515,
                                h: 0.5,
                                color: '#9CA3AF'
                            }
                        ],
                        margin: [0, 5, 0, 0]
                    }
                ]
            });
            
            return {
                columns: columns,
                margin: [40, 20, 40, 10]
            };
        },
        footer: function(currentPage, pageCount) {
            // No mostrar footer en la portada (página 1)
            if (currentPage === 1) {
                return null;
            }
            // A partir de la página 2, mostrar línea, texto del pie de página y numeración
            return {
                stack: [
                    {
                        canvas: [{ type: 'line', x1: 100, y1: 0, x2: 495, y2: 0, lineWidth: 1, lineColor: '#E5E7EB' }],
                        margin: [0, 0, 0, 4]
                    },
                    {
                        text: 'Este informe fue generado automáticamente por el sistema de gestión de salud laboral Ramazzini.',
                        style: 'piePagina',
                        alignment: 'center',
                        margin: [0, 0, 0, 2]
                    },
                    {
                        text: `Página ${currentPage - 1} de ${pageCount - 1}`,
                        alignment: 'center',
                        fontSize: 9,
                        color: '#9CA3AF',
                        margin: [0, 2, 0, 0]
                    }
                ],
                margin: [0, 10, 0, 15]
            };
        }
    };
};

// Estado para controlar cuando se está generando el PDF
const generandoPDF = ref(false);
const mostrarModalGeneracion = ref(false);
const mensajeExito = ref('');

// Watcher para monitorear cambios en el estado
watch(generandoPDF, (newValue) => {
  if (!newValue) {
    // Ya no cerramos automáticamente el modal
    // El usuario debe hacer clic para cerrarlo
  }
});

const generarPDF = async () => {
  generandoPDF.value = true;
  mostrarModalGeneracion.value = true;
  
  // Esperar a que Vue actualice el DOM
  await nextTick();
  
  // Pequeño delay para asegurar que el modal se muestre
  setTimeout(async () => {
    try {
      const docDefinition = generarDocDefinition(false); // Calidad normal
      pdfMake.createPdf(docDefinition).open();
      mensajeExito.value = 'El informe se generó correctamente. Puedes revisarlo en la ventana que se abrió.';
    } catch (error) {
      console.error('Error al generar PDF:', error);
      mensajeExito.value = 'Error al generar el PDF.';
    } finally {
      // Pequeño delay para que el usuario vea el estado de carga
      setTimeout(() => {
        generandoPDF.value = false;
      }, 1000);
    }
  }, 100);
};

const cerrarModal = () => {
  if (!generandoPDF.value && mensajeExito.value) {
    // Solo cerrar si ya terminó el proceso y hay mensaje de éxito
    mostrarModalGeneracion.value = false;
    mensajeExito.value = '';
  }
};

const descargarPDF = async () => {
  generandoPDF.value = true;
  mostrarModalGeneracion.value = true;
  
  // Esperar a que Vue actualice el DOM
  await nextTick();
  
  // Pequeño delay para asegurar que el modal se muestre
  setTimeout(async () => {
    try {
      const docDefinition = generarDocDefinition(true); // Alta calidad
      pdfMake.createPdf(docDefinition).download(`InformeSaludLaboral_${props.nombreEmpresa?.replace(/\s+/g, '_') || 'Empresa'}_${new Date().toISOString().split('T')[0]}.pdf`);
      mensajeExito.value = 'Informe generado correctamente.';
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      mensajeExito.value = 'Error al descargar el informe.';
    } finally {
      // Pequeño delay para que el usuario vea el estado de carga
      setTimeout(() => {
        generandoPDF.value = false;
      }, 1000);
    }
  }, 100);
};

// Función para crear tablas en PDF con colores condicionales
const crearTablaPDF = (datos: any[], columnas: string[], titulo: string, tipoTabla: string = 'general'): Content[] => {
  if (!datos || datos.length === 0) return [];
  
  // Filtrar y limpiar los datos para evitar celdas undefined
  const datosLimpios = datos
    .filter(fila => fila && Array.isArray(fila))
    .map(fila => fila.map(celda => celda !== undefined && celda !== null ? String(celda) : '-'));
  
  if (datosLimpios.length === 0) return [];

  // Función para determinar el estilo de celda según el tipo de tabla y valores
  const getCellStyle = (valor: string, columnaIndex: number, filaIndex: number) => {
    // Extraer solo el número de la cantidad (antes del paréntesis)
    const cantidadMatch = valor.match(/^(\d+)/);
    const cantidad = cantidadMatch ? parseInt(cantidadMatch[1]) : 0;
    
    // Primera columna siempre sin colores (solo centrada)
    if (columnaIndex === 0) return 'tableCellMedium';
    
    // Lógica específica por tipo de tabla
    switch (tipoTabla) {
      case 'imc':
        const categoria = datosLimpios[filaIndex][0];
        if (categoria === 'Normal') return 'tableCellEmerald';
        if (['Bajo peso', 'Sobrepeso'].includes(categoria)) return 'tableCellAmber';
        return 'tableCellRose';
      
      case 'aptitud':
        const resultado = datosLimpios[filaIndex][0];
        // Solo aplicar colores a las columnas de resultados (0 y 1), no a las explicaciones (2)
        if (columnaIndex === 2) return 'tableCellMedium'; // Explicaciones sin color
        if (resultado === 'Apto Sin Restricciones') return 'tableCellEmerald';
        if (resultado === 'Apto Con Precaución') return 'tableCellAmber';
        if (resultado === 'Apto Con Restricciones') return 'tableCellOrange';
        if (resultado === 'No Apto') return 'tableCellRed';
        return 'tableCellMedium';
      
      case 'enfermedades':
      case 'antecedentes':
      case 'agentesRiesgo':
        return cantidad === 0 ? 'tableCellEmerald' : 'tableCellRose';
      
      case 'gruposEtarios':
        if (columnaIndex === 1) return 'tableCellBlue'; // Hombres
        if (columnaIndex === 2) return 'tableCellPink'; // Mujeres
        return 'tableCellMedium';
      
      case 'vision':
        const categoriaVision = datosLimpios[filaIndex][0];
        if (cantidad === 0) return 'tableCellEmerald';
        if (categoriaVision === 'Visión ligeramente reducida') return 'tableCellAmber';
        if (['Visión excepcional', 'Visión normal'].includes(categoriaVision)) return 'tableCellEmerald';
        return 'tableCellRose';
      
      case 'tensionArterial':
        const categoriaTension = datosLimpios[filaIndex][0];
        if (['Óptima', 'Normal'].includes(categoriaTension)) return 'tableCellEmerald';
        if (categoriaTension === 'Alta') return 'tableCellAmber';
        if (['Hipertensión ligera', 'Hipertensión moderada', 'Hipertensión severa'].includes(categoriaTension)) return 'tableCellRose';
        return 'tableCellMedium';
      
      default:
        return 'tableCellMedium';
    }
  };
  
  return [
    { text: titulo, style: 'subtituloTabla', margin: [0, 15, 0, 5] } as Content,
    {
      table: {
        headerRows: 1,
        widths: tipoTabla === 'aptitud' ? [140, 100, '*'] : columnas.map(() => '*'),
        body: [
          columnas.map(col => ({ text: col, style: 'tableHeader' })),
          ...datosLimpios.map((fila, filaIndex) => 
            fila.map((celda, columnaIndex) => ({ 
              text: celda, 
              style: getCellStyle(celda, columnaIndex, filaIndex) 
            }))
          )
        ]
      },
      layout: 'lightHorizontalLines',
      margin: [0, 5, 0, 15]
    } as Content
  ];
};

</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}
</style>

<template>
    <!-- Modal de generación de PDF -->
    <Transition name="fade">
      <div 
        v-if="mostrarModalGeneracion" 
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        @click="!generandoPDF && mensajeExito ? cerrarModal() : null"
      >
        <div class="bg-white rounded-xl p-6 shadow-xl max-w-md w-full mx-4" @click.stop>
          <div class="flex flex-col items-center justify-center space-y-4 py-10">
            <!-- Spinner durante la generación -->
            <svg v-if="generandoPDF" class="animate-spin h-8 w-8 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            
            <!-- Icono de éxito cuando termina -->
            <i v-else class="fas fa-check-circle text-4xl text-emerald-600"></i>
            
            <!-- Mensajes dinámicos -->
            <p v-if="generandoPDF" class="text-gray-700 text-center">Generando el informe, por favor espera...</p>
            <p v-else class="text-gray-700 text-center">{{ mensajeExito || 'Proceso completado' }}</p>
            
            <p v-if="generandoPDF" class="text-sm text-gray-500 text-center">Esto puede tomar unos segundos.</p>
            
            <!-- Botón de cerrar solo cuando está listo -->
<!--             <button 
              v-if="!generandoPDF && mensajeExito"
              @click="cerrarModal"
              class="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition duration-200"
            >
              Cerrar
            </button> -->
          </div>
        </div>
      </div>
    </Transition>

    <div class="flex items-center gap-4 self-center">
    <button
        @click="generarPDF"
        :disabled="generandoPDF"
        :class="[
            'gap-2 px-4 py-2 rounded-lg shadow transition duration-300 flex items-center',
            generandoPDF 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
        ]"
    >
        <i v-if="generandoPDF" class="fas fa-spinner fa-spin mr-1"></i>
        <i v-else class="fas fa-eye mr-1"></i>
        {{ generandoPDF ? 'Generando PDF...' : 'Ver informe' }}
    </button>

    <button
        @click="descargarPDF"
        :disabled="generandoPDF"
        :class="[
            'gap-2 px-4 py-2 rounded-lg shadow transition duration-300 flex items-center',
            generandoPDF 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-gray-600 hover:bg-gray-700 text-white'
        ]"
    >
        <i v-if="generandoPDF" class="fas fa-spinner fa-spin mr-1"></i>
        <i v-else class="fas fa-download mr-1"></i>
        {{ generandoPDF ? 'Generando PDF...' : 'Descargar en alta calidad' }}
    </button>
    </div>
</template>
