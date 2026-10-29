import { describe, expect, it } from 'vitest';
import { seccionesAdicionalesDelInforme } from './dashboardInformeCompleto';

const diagnosticos = (cuantos = 2) => ({
  total: 10,
  porCodigo: Array.from({ length: cuantos }, (_, i) => ({
    clave: `J0${i}X`,
    etiqueta: `J0${i}X - DIAGNÓSTICO ${i}`,
    cantidad: cuantos - i,
  })),
  porCapitulo: [{ clave: 'X', etiqueta: 'Sistema respiratorio', cantidad: 10 }],
  primeraVez: 6,
  subsecuentes: 4,
});

const insumos = [
  { nombre: 'Gasas', unidad: 'pieza', consumo: 5, administrado: 5, entregado: 0, bajas: 2 },
  { nombre: 'Paracetamol 500 mg', unidad: 'tableta', consumo: 42, administrado: 10, entregado: 32, bajas: 0 },
  { nombre: 'Sin movimiento', unidad: 'pieza', consumo: 0, administrado: 0, entregado: 0, bajas: 0 },
];

const titulos = (contenido: Record<string, any>[]) =>
  contenido.filter((c) => c.style === 'tituloSeccion').map((c) => c.text);
const texto = (contenido: unknown) => JSON.stringify(contenido);

describe('secciones adicionales del informe completo', () => {
  it('agrega diagnósticos e inventario, numerados a continuación de las secciones previas', () => {
    const { contenido, siguienteNumero } = seccionesAdicionalesDelInforme(
      { diagnosticos: diagnosticos(), totalConsultas: 8, insumos, periodoInventario: 'del 1/1/2026 al 10/10/2026' },
      7,
    );
    expect(titulos(contenido)).toEqual([
      '7. DIAGNÓSTICOS DE LAS CONSULTAS MÉDICAS',
      '8. CONSUMO DE INSUMOS DEL SERVICIO MÉDICO',
    ]);
    expect(siguienteNumero).toBe(9);
    // Cada sección empieza en página nueva, como las demás del informe
    expect(contenido.filter((c) => c.pageBreak === 'before')).toHaveLength(2);

    const todo = texto(contenido);
    expect(todo).toContain('10 diagnósticos');
    expect(todo).toContain('8 consultas');
    expect(todo).toContain('J00X - DIAGNÓSTICO 0');
    expect(todo).toContain('Sistema respiratorio');
    expect(todo).toContain('6 fueron de primera vez y 4 subsecuentes');
    expect(todo).toContain('del 1/1/2026 al 10/10/2026');
  });

  it('ordena los insumos por consumo y omite los que no tuvieron movimiento', () => {
    const { contenido } = seccionesAdicionalesDelInforme({ insumos }, 5);
    const tabla = contenido.find((c) => c.table)!;
    const filas = tabla.table.body.slice(1).map((fila: { text: string }[]) => fila.map((celda) => celda.text));
    expect(filas).toEqual([
      ['Paracetamol 500 mg', 'tableta', '42', '10', '32', '0'],
      ['Gasas', 'pieza', '5', '5', '0', '2'],
    ]);
    expect(titulos(contenido)).toEqual(['5. CONSUMO DE INSUMOS DEL SERVICIO MÉDICO']);
  });

  it('limita la lista de diagnósticos a los quince más frecuentes y lo dice', () => {
    const { contenido } = seccionesAdicionalesDelInforme({ diagnosticos: diagnosticos(20), totalConsultas: 30 }, 4);
    const tablaDeCodigos = contenido.filter((c) => c.table)[0];
    expect(tablaDeCodigos.table.body).toHaveLength(16);
    expect(texto(contenido)).toContain('Los 15 diagnósticos más frecuentes');
  });

  it('sin registros no agrega nada ni consume número de sección', () => {
    expect(seccionesAdicionalesDelInforme({}, 6)).toEqual({ contenido: [], siguienteNumero: 6 });
    expect(
      seccionesAdicionalesDelInforme(
        { diagnosticos: { ...diagnosticos(0), total: 0 }, insumos: [insumos[2]] },
        6,
      ),
    ).toEqual({ contenido: [], siguienteNumero: 6 });
  });

  it('con solo diagnósticos, la numeración sigue de corrido', () => {
    const { contenido, siguienteNumero } = seccionesAdicionalesDelInforme(
      { diagnosticos: diagnosticos(), totalConsultas: 1, insumos: [] },
      3,
    );
    expect(titulos(contenido)).toEqual(['3. DIAGNÓSTICOS DE LAS CONSULTAS MÉDICAS']);
    expect(siguienteNumero).toBe(4);
    expect(texto(contenido)).toContain('1 consulta');
  });

  it('con quien dibuje, cada sección nueva lleva sus gráficas antes de las tablas', () => {
    const dibujadas: string[] = [];
    const dibujar = (config: Record<string, any>, ancho: number, alto: number) => {
      dibujadas.push(`${config.type} ${ancho}x${alto}`);
      return 'data:image/png;base64,AAAA';
    };
    const antidoping = [
      { mes: '2026-01', trabajador: 'a', evaluadas: ['marihuana'], positivos: ['marihuana'] },
      { mes: '2026-01', trabajador: 'b', evaluadas: ['marihuana'], positivos: [] },
    ];
    const { contenido } = seccionesAdicionalesDelInforme({ antidoping, diagnosticos: diagnosticos() }, 3, { dibujar });
    // Dona de positivos, barras por sustancia y barras de grupos de diagnósticos
    expect(dibujadas).toEqual(['doughnut 120x120', 'bar 460x28', 'bar 460x28']);
    const todo = texto(contenido);
    expect(todo).toContain('Pruebas con algún positivo');
    expect(todo).toContain('Con algún positivo: ');
    expect(todo.indexOf('Positivos por sustancia')).toBeLessThan(todo.indexOf('Antidoping: positivos por sustancia'));
  });

  it('sin quien dibuje, o si una gráfica falla, la sección sale igual con sus tablas', () => {
    const datos = { diagnosticos: diagnosticos() };
    expect(texto(seccionesAdicionalesDelInforme(datos, 1).contenido)).not.toContain('image');
    const conError = seccionesAdicionalesDelInforme(datos, 1, {
      dibujar: () => {
        throw new Error('sin lienzo');
      },
    });
    expect(texto(conError.contenido)).not.toContain('image');
    expect(texto(conError.contenido)).toContain('Diagnósticos por grupo de enfermedades');
  });
});
