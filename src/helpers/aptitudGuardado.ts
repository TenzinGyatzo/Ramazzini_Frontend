/**
 * Aptitud al puesto, punto (45): una sola lógica de textos generados y guardado para los dos
 * modos de captura (como audiometriaGuardado).
 *
 * Antes cada paso generaba su texto al abrirse: alteraciones (paso 9, pisando lo editado),
 * resultados (paso 10, también al cambiar la aptitud) y medidas preventivas (paso 11). Con vista
 * previa, una sección sin abrir se iba vacía; en la captura rápida todo se abre a la vez.
 * Ahora los tres textos se escriben aquí, en los dos modos y en cuanto hay contexto (decisión del
 * usuario 2026-11-21), solo si el campo está vacío o conserva intacto lo último generado. Las
 * frases son las mismas de los pasos.
 *
 * La aptitud ya no se pone sola («Apto sin restricciones» al salir del paso): es obligatoria en
 * los dos modos (decisión del usuario 2026-11-21).
 */
import { fechaLocalHoy } from '@/helpers/dates';
import { esMedicion } from '@/helpers/medicionesClinicas';
import { resumenSucintoEntrevistaPsicologica } from '@/helpers/conclusionEntrevistaPsicologica';
import {
  textoResumenTrastornosEstadoAnimo,
  textoResumenCuestionarioProdromalBreve,
  textoResumenTrastornoLimitePersonalidad,
} from '@/helpers/resumenesCuestionariosPsicologicosAptitud';
import { textoResumenCuestionarioNordico } from '@/helpers/cuestionarioNordico';
import { textoResumenEvaluacionSuenoVigilia } from '@/helpers/evaluacionSuenoVigilia';
import { construirTextoPaso4TamizajePsi } from '@/helpers/tamizajePsicologicoPaso4Resultados';
import { medidasPreventivasParaAptitud } from '@/helpers/medidasPreventivasAptitud';
import { cuatroTamizajesCercanos, documentosCercanosAptitud, type ContextoAptitud } from '@/helpers/aptitudContexto';

type Datos = Record<string, any>;

const vacio = (v: unknown) => v === undefined || v === null || String(v).trim() === '';

/** Fecha con la que se buscan los documentos cercanos (la de hoy mientras no se elija). */
export const fechaDeReferencia = (df: Datos, hoy = fechaLocalHoy()) =>
  vacio(df.fechaAptitudPuesto) ? hoy : df.fechaAptitudPuesto;

// ── Alteraciones de salud (antes el paso 9) ─────────────────────────────────────────────

/**
 * El texto de alteraciones con los documentos más cercanos; null si falta la historia clínica o
 * la exploración física (antes el aviso se escribía en el campo como si fuera el texto).
 */
export function redactarAlteraciones(ctx: ContextoAptitud, df: Datos, sexo: string | undefined): string | null {
  const c: Record<string, any> = documentosCercanosAptitud(ctx, fechaDeReferencia(df));
  if (!c.exploracionFisica || !c.historiaClinica) {
    return null;
  }

  const {
    categoriaIMC,
    indiceMasaCorporal,
    circunferenciaCintura,
    categoriaCircunferenciaCintura,
    categoriaTensionArterial,
    tensionArterialSistolica,
    tensionArterialDiastolica,
  } = c.exploracionFisica;

  const { sinCorreccionLejanaInterpretacion, porcentajeIshihara } = c.examenVista || {};

  let riesgoCintura = '';
  if (categoriaCircunferenciaCintura === 'Bajo Riesgo') {
    riesgoCintura = 'riesgo bajo de desarrollar enfermedades cardiometabólicas.';
  } else if (categoriaCircunferenciaCintura === 'Riesgo Aumentado') {
    riesgoCintura = 'riesgo aumentado de desarrollar enfermedades cardiometabólicas.';
  } else if (categoriaCircunferenciaCintura === 'Alto Riesgo') {
    riesgoCintura = 'riesgo alto de desarrollar enfermedades cardiometabólicas.';
  } else {
    riesgoCintura = 'riesgo no clasificado de desarrollar enfermedades cardiometabólicas.';
  }

  // La cintura es opcional: sin medición (aunque se marcara «Se desconoce») la frase se omite
  const fraseCintura = esMedicion(circunferenciaCintura)
    ? `Tiene una circunferencia de cintura de ${circunferenciaCintura} cm por lo que tiene ${riesgoCintura} `
    : '';

  let tensionArterialTexto = '';
  const categoriasTensionArterialValidas = ['óptima', 'normal', 'alta'];
  if (categoriasTensionArterialValidas.includes(categoriaTensionArterial.toLowerCase())) {
    tensionArterialTexto = `presión arterial ${categoriaTensionArterial.toLowerCase()}`;
  } else {
    tensionArterialTexto = categoriaTensionArterial.toLowerCase();
  }
  tensionArterialTexto += ` con una medición de ${tensionArterialSistolica}/${tensionArterialDiastolica} mmHg.`;

  const categoriaIMCMap = {
    'Bajo peso': 'peso bajo',
    Normal: 'peso normal',
    Sobrepeso: 'sobrepeso',
    'Obesidad clase I': 'obesidad clase I',
    'Obesidad clase II': 'obesidad clase II',
    'Obesidad clase III': 'obesidad clase III',
  };

  let texto = `${sexo === 'Femenino' ? 'La trabajadora' : 'El trabajador'} presenta ${categoriaIMCMap[categoriaIMC] || categoriaIMC} con un índice de masa corporal (IMC) de ${indiceMasaCorporal}. ${fraseCintura}Presenta ${tensionArterialTexto}`;

  if (c.examenVista && sinCorreccionLejanaInterpretacion) {
    const ish = porcentajeIshihara != null ? porcentajeIshihara : 100;
    texto += ` Tiene una ${sinCorreccionLejanaInterpretacion.toLowerCase()}${ish < 80 ? ' y padece daltonismo' : ' y tiene una visión cromática normal'}.`;
  }

  texto += ` ${c.historiaClinica?.resumenHistoriaClinica || ''}. ${c.exploracionFisica?.resumenExploracionFisica || ''}.`;

  const psico: string[] = [];
  if (c.entrevistaPsicologica) {
    psico.push(
      `Entrevista psicológica: ${resumenSucintoEntrevistaPsicologica(c.entrevistaPsicologica)}`,
    );
  }
  if (c.trastornosEstadoAnimo) {
    psico.push(`MDQ: ${textoResumenTrastornosEstadoAnimo(c.trastornosEstadoAnimo)}.`);
  }
  if (c.cuestionarioProdromalBreve) {
    psico.push(`Cuestionario prodromal breve: ${textoResumenCuestionarioProdromalBreve(c.cuestionarioProdromalBreve)}.`);
  }
  if (c.trastornoLimitePersonalidad) {
    psico.push(`MSI-BPD: ${textoResumenTrastornoLimitePersonalidad(c.trastornoLimitePersonalidad)}`);
  }
  if (psico.length > 0) {
    texto += ` ${psico.join(' ')}`;
  }

  const resumenNordico = textoResumenCuestionarioNordico(c.cuestionarioNordico);
  if (resumenNordico) {
    texto += ` Cuestionario Nórdico: ${resumenNordico}.`;
  }

  const resumenSuenoVigilia = textoResumenEvaluacionSuenoVigilia(c.evaluacionSuenoVigilia);
  if (resumenSuenoVigilia) {
    texto += ` Evaluación de sueño y vigilia: ${resumenSuenoVigilia}.`;
  }

  return texto;
}

// ── Resultados (antes el paso 10) ───────────────────────────────────────────────────────

export const INICIO_RESULTADOS =
  'Posterior a efectuar el examen integral de salud ocupacional, se determina que actualmente ';

// Función para determinar tipo de evaluación (MÉDICAMENTE vs CLÍNICAMENTE)
const determinarTipoEvaluacion = (df: Datos) => {
    const evaluacionesMedicas = [
        'Audiometría',
        'Espirometría',
        'Estudios de laboratorio',
        'Rx simple de tórax',
        'Rx columna lumbar',
        'Rx rodillas',
        'Electrocardiograma',
        'EKG',
        'Rayos X',
        'RX'
    ];

    const evaluacionesAdicionales = [
        df.evaluacionAdicional1,
        df.evaluacionAdicional2,
        df.evaluacionAdicional3,
        df.evaluacionAdicional4,
        df.evaluacionAdicional5,
        df.evaluacionAdicional6
    ].filter(evaluacion => evaluacion && String(evaluacion).trim() !== '');

    // Verificar si alguna evaluación adicional coincide con las evaluaciones médicas
    const tieneEvaluacionMedica = evaluacionesAdicionales.some(evaluacion => {
        const evalNormalizada = String(evaluacion).trim();
        return evaluacionesMedicas.some(medica => 
            evalNormalizada.toLowerCase().includes(medica.toLowerCase())
        );
    });

    return tieneEvaluacionMedica ? 'MÉDICAMENTE' : 'CLÍNICAMENTE';
};


function generarTextoPaso2(motivoExamen: string | null) {
  if (motivoExamen === 'Ingreso') return 'en las actividades del puesto al que aspira. ';
  if (motivoExamen === 'Inicial' || motivoExamen === 'Periódico') return 'en las actividades del puesto que desempeña. ';
  return '';
}

// Función para generar texto automático del paso 1
const generarTextoPaso1 = (df: Datos, sexo: string) => {
    const aptitudPuesto = df.aptitudPuesto;
    const tipoEvaluacion = determinarTipoEvaluacion(df);
    const esFemenino = sexo === 'Femenino';

    if (!aptitudPuesto) {
        return '';
    }

    let texto = '';

    switch (aptitudPuesto) {
        case 'Apto Sin Restricciones':
            if (esFemenino) {
                texto = tipoEvaluacion === 'MÉDICAMENTE' 
                    ? 'se encuentra médicamente SANA Y APTA PARA LABORAR SIN RESTRICCIONES '
                    : 'se encuentra clínicamente SANA Y APTA PARA LABORAR SIN RESTRICCIONES ';
            } else {
                texto = tipoEvaluacion === 'MÉDICAMENTE'
                    ? 'se encuentra médicamente SANO Y APTO PARA LABORAR SIN RESTRICCIONES '
                    : 'se encuentra clínicamente SANO Y APTO PARA LABORAR SIN RESTRICCIONES ';
            }
            break;

        case 'Apto Con Precaución':
            if (esFemenino) {
                texto = tipoEvaluacion === 'MÉDICAMENTE'
                    ? 'se encuentra médicamente APTA PARA LABORAR CON PRECAUCIÓN '
                    : 'se encuentra clínicamente APTA PARA LABORAR CON PRECAUCIÓN ';
            } else {
                texto = tipoEvaluacion === 'MÉDICAMENTE'
                    ? 'se encuentra médicamente APTO PARA LABORAR CON PRECAUCIÓN '
                    : 'se encuentra clínicamente APTO PARA LABORAR CON PRECAUCIÓN ';
            }
            break;

        case 'Apto Con Restricciones':
            if (esFemenino) {
                texto = tipoEvaluacion === 'MÉDICAMENTE'
                    ? 'se encuentra médicamente APTA PARA LABORAR CON RESTRICCIONES '
                    : 'se encuentra clínicamente APTA PARA LABORAR CON RESTRICCIONES ';
            } else {
                texto = tipoEvaluacion === 'MÉDICAMENTE'
                    ? 'se encuentra médicamente APTO PARA LABORAR CON RESTRICCIONES '
                    : 'se encuentra clínicamente APTO PARA LABORAR CON RESTRICCIONES ';
            }
            break;

        case 'No Apto':
            if (esFemenino) {
                texto = 'se encuentra NO APTA PARA LABORAR ';
            } else {
                texto = 'se encuentra NO APTO PARA LABORAR ';
            }
            break;

        case 'Evaluación No Completada':
            texto = 'NO ES POSIBLE CONCLUIR LA APTITUD AL PUESTO ';
            break;

        default:
            texto = '';
    }

    return texto;
};

// Función para generar texto automático del paso 3
const generarTextoPaso3 = (df: Datos, sexo: string) => {
    const aptitudPuesto = df.aptitudPuesto;
    const esFemenino = sexo === 'Femenino';

    if (!aptitudPuesto) {
        return '';
    }

    let texto = '';

    switch (aptitudPuesto) {

        case 'Apto Con Precaución':
            if (esFemenino) {
                texto = 'Aunque apta para el trabajo, es esencial destacar que la presencia de ciertas condiciones médicas subyacentes demanda la adopción de precauciones adicionales para salvaguardar su salud y seguridad en el lugar de trabajo. ';
            } else {
                texto = 'Aunque apto para el trabajo, es esencial destacar que la presencia de ciertas condiciones médicas subyacentes demanda la adopción de precauciones adicionales para salvaguardar su salud y seguridad en el lugar de trabajo. ';
            }
            break;

        case 'Apto Con Restricciones':
            if (esFemenino) {
                texto = 'Aunque apta para el trabajo, requiere medidas adicionales para garantizar su seguridad y bienestar en el entorno laboral. ';
            } else {
                texto = 'Aunque apto para el trabajo, requiere medidas adicionales para garantizar su seguridad y bienestar en el entorno laboral. ';
            }
            break;

        case 'Apto Sin Restricciones':
        case 'No Apto':
        case 'Evaluación No Completada':
        default:
            texto = '';
            break;
    }

    return texto;
};


/** El texto de resultados según la aptitud elegida; null sin aptitud. */
export function redactarResultados(ctx: ContextoAptitud, df: Datos, sexo: string | undefined): string | null {
  if (vacio(df.aptitudPuesto)) return null;
  const tamizajes = cuatroTamizajesCercanos(ctx, fechaDeReferencia(df));
  return (
    INICIO_RESULTADOS +
    generarTextoPaso1(df, sexo ?? '') +
    generarTextoPaso2(ctx.motivoExamen) +
    generarTextoPaso3(df, sexo ?? '') +
    (tamizajes ? construirTextoPaso4TamizajePsi(tamizajes) : '')
  );
}

// ── Medidas preventivas (antes el paso 11) ──────────────────────────────────────────────

/** Medidas sugeridas por hallazgo; [] si falta la historia clínica o la exploración física. */
export function medidasSugeridas(ctx: ContextoAptitud, df: Datos) {
  const c = documentosCercanosAptitud(ctx, fechaDeReferencia(df));
  if (!c.historiaClinica || !c.exploracionFisica) return [];
  return medidasPreventivasParaAptitud(c as any);
}

export function redactarMedidas(ctx: ContextoAptitud, df: Datos): string | null {
  const texto = medidasSugeridas(ctx, df)
    .map((m) => m.texto)
    .join(' ');
  return texto || null;
}

// ── Escritura ───────────────────────────────────────────────────────────────────────────

type Redactor = (ctx: ContextoAptitud, df: Datos, sexo?: string) => string | null;

/** Cada texto generado y dónde se recuerda lo último que se generó. */
export const TEXTOS_GENERADOS: Array<{ campo: string; generado: string; redactar: Redactor }> = [
  { campo: 'alteracionesSalud', generado: 'alteracionesSaludGeneradas', redactar: redactarAlteraciones },
  { campo: 'resultados', generado: 'resultadosGenerados', redactar: redactarResultados },
  { campo: 'medidasPreventivas', generado: 'medidasPreventivasGeneradas', redactar: (ctx, df) => redactarMedidas(ctx, df) },
];

/** ¿El campo está vacío o conserva lo último generado? Entonces se puede rehacer. */
export function textoSinEditar(df: Datos, campo: string): boolean {
  const t = TEXTOS_GENERADOS.find((x) => x.campo === campo);
  const actual = String(df[campo] ?? '').trim();
  const antes = String((t && df[t.generado]) ?? '').trim();
  return actual === '' || (antes !== '' && actual === antes);
}

/** El texto que se generaría ahora para un campo (null si no hay con qué). */
export function textoGenerado(df: Datos, campo: string, ctx: ContextoAptitud | null | undefined, sexo: string | undefined) {
  const t = TEXTOS_GENERADOS.find((x) => x.campo === campo);
  return t && ctx ? t.redactar(ctx, df, sexo) : null;
}

/** Escribe los textos generados que no se hayan editado. */
export function escribirTextosGenerados(df: Datos, ctx: ContextoAptitud | null | undefined, sexo: string | undefined): Datos {
  if (!ctx) return df;
  for (const t of TEXTOS_GENERADOS) {
    if (!textoSinEditar(df, t.campo)) continue;
    const texto = t.redactar(ctx, df, sexo);
    if (texto == null || texto === df[t.campo]) continue;
    df[t.campo] = texto;
    df[t.generado] = texto;
  }
  return df;
}

/** Reemplaza un texto por el generado (botón «Volver a generar»). */
export function volverAGenerar(df: Datos, campo: string, ctx: ContextoAptitud | null | undefined, sexo: string | undefined): void {
  const t = TEXTOS_GENERADOS.find((x) => x.campo === campo);
  const texto = textoGenerado(df, campo, ctx, sexo);
  if (!t || texto == null) return;
  df[t.campo] = texto;
  df[t.generado] = texto;
}

/**
 * La fecha al revisar su sección; los textos generados siempre que haya contexto. Sin `visitado`,
 * todo (al guardar o al editar). Un documento guardado conserva sus textos: no trae lo generado,
 * así que cuentan como editados.
 */
export function completarRespuestasPorDefecto(
  df: Datos,
  {
    contexto,
    sexo,
    hoy = fechaLocalHoy(),
    visitado,
  }: { contexto?: ContextoAptitud | null; sexo?: string; hoy?: string; visitado?: (paso: number) => boolean } = {},
): Datos {
  const revisado = (paso: number) => !visitado || visitado(paso);
  if (revisado(1) && vacio(df.fechaAptitudPuesto)) df.fechaAptitudPuesto = hoy;
  escribirTextosGenerados(df, contexto, sexo);
  return df;
}

/** La aptitud que se elige sola al salir de su paso con vista previa sin haber elegido. */
export const APTITUD_POR_DEFECTO = 'Apto Sin Restricciones';

/**
 * Con vista previa, al salir del paso de aptitud sin elegir (decisión del usuario, 2026-11-21):
 * queda «Apto Sin Restricciones». En captura rápida no aplica (no hay pasos que se cierren) y
 * ahí la aptitud se sigue pidiendo al guardar. Devuelve si la escribió.
 */
export function elegirAptitudPorDefectoAlSalir(df: Datos | null | undefined): boolean {
  if (!df || !vacio(df.aptitudPuesto)) return false;
  df.aptitudPuesto = APTITUD_POR_DEFECTO;
  return true;
}

export function prepararAptitudParaGuardar(
  df: Datos,
  opciones: { contexto?: ContextoAptitud | null; sexo?: string } = {},
): Datos {
  return completarRespuestasPorDefecto(df, opciones);
}
