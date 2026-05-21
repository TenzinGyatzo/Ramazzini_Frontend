# Automatización: Step2 vs Visualizador (informe longitudinal cardiometabólico)

Ámbito: [`Step2.vue`](Step2.vue) (interpretación y cierre) y [`VisualizadorInformeLongitudinalCardiometabolico.vue`](../VisualizadorInformeLongitudinalCardiometabolico.vue) (vista previa desde Pinia). La lógica numérica y de borradores vive principalmente en [`informeLongitudinalOperativo.ts`](../../../helpers/informeLongitudinalOperativo.ts), invocada con `aplicarIteracionDosAlFormulario`.

## Escala de niveles (referencia)

| Nivel | Significado |
|-------|-------------|
| **0 – Manual** | Solo el usuario; no hay generación en el flujo actual. |
| **1 – Plantilla / borrador** | Texto sugerido a partir de reglas; suele ir a campos `*Sugeridas` y requerir acción explícita («Copiar al campo final»). |
| **2 – Prellenado si vacío** | Se rellena el campo **final** solo cuando aún está vacío (no sobrescribe decisiones previas). |
| **3 – Derivación obligatoria al montaje** | Cada vez que se renderiza Step2, `aplicarIteracionDosAlFormulario(..., { sobrescribirInterpretacionAutomatizada: true })` recalcula y **sobrescribe** esos campos en Pinia. |
| **4 – Derivación estructurada** | Agregados no narrativos (series, conteos) que alimentan el informe o la UI. |

---

## 1. Riesgo longitudinal (`nivelRiesgoLongitudinal`) y trayectoria del periodo (`tendenciaLongitudinal`)

**Definición de producto**

- El **riesgo longitudinal** refleja la **severidad y carga del periodo** (picos con `peorValor` y cierre con `valorFinal`, multimorbilidad no controlada, pisos clínicos, adherencia y datos faltantes como **residual acotado**). La **mejoría** en series **no** rebaja el riesgo por debajo de ese máximo.
- La **trayectoria agregada** (`tendenciaLongitudinal`: Favorable, Estable, Desfavorable, Mixta, Insuficiente información) resume la **tendencia mayoritaria** en ejes con serie suficiente y en `resumenCondiciones`; **no** sustituye al riesgo.
- **No** se deriva el riesgo del ordinal de **consistencia del seguimiento** ni del % de asistencia como regla principal del nivel.

**Escala nominal — riesgo**

- `Muy Bajo`, `Bajo`, `Moderado`, `Alto`, `Crítico`, `No valorable` (cuando no hay datos suficientes para clasificar).

**Escala nominal — trayectoria del informe**

- `Favorable`, `Estable`, `Desfavorable`, `Mixta`, `Insuficiente información`.

**Umbrales y reglas Alto vs Crítico (auditoría)**

- Constante única `CONFIG_UMBRALES_SEVERIDAD_ILC` y lógica de promoción a **Crítico** (p. ej. ≥2 ejes en banda alta por `peorValor`, multimorbilidad + pico metabólico, DM2 no controlada en ≥2 visitas con laboratorio de alto riesgo) en [`informeLongitudinalRiesgoTrayectoria.ts`](../../../helpers/informeLongitudinalRiesgoTrayectoria.ts). Pico glucémico/HbA1c **extremo** con **una sola medición** en el eje: advertencia y **no** promover a Crítico solo por esa regla si no hay segundo eje alto ni carga multimórbida reforzada.

**Step2**

- **Automático (3)**: en `onMounted`, `inferirNivelRiesgoLongitudinalDescontrol` asigna `nivelRiesgoLongitudinal`, `tendenciaLongitudinal` e `interpretacionRiesgoLongitudinal` (matriz riesgo × trayectoria + drivers).

**Visualizador**

- Muestra riesgo y trayectoria del periodo en el bloque destacado, seguido de la interpretación del riesgo.

**Techo de automatización**

- **Alto para orientación**, **bajo para sustituir juicio clínico**: es una **heurística auditable**; no sustituye criterio médico.

**Riesgo de producto**

- Cada visita a Step2 **sobrescribe** riesgo, interpretaciones, consistencia, factores y alertas. Si en el futuro se desean ajustes manuales, haría falta un override o un flag «bloquear auto».

---

## 2. Conclusión clínica (`conclusionClinica`) — fuera del producto en UI

- Los campos `conclusionClinica` y `resumenLongitudinal` **no** se editan en Step2 ni se muestran en el visualizador.
- En cada montaje de Step2 con automatización máxima se **eliminan** del modelo (`delete`) para no arrastrar texto obsoleto de versiones anteriores.
- `conclusionClinicaSugerida` ya no se persiste: el helper deja de asignarla y la borra en cada aplicación de iteración 2.
- El PDF/backend solo imprimen esas secciones si hubiera texto; no son obligatorias para guardar el informe en el frontend (validación paso 1).

---

## 3. Resumen longitudinal (`resumenLongitudinal`) — fuera del producto en UI

- Igual que la conclusión: no hay textarea ni vista previa; se borra del store al automatizar Step2.
- `resumenLongitudinalSugerido` deja de poblarse y se elimina en cada `aplicarIteracionDosAlFormulario`.

---

## 4. Interpretación del riesgo longitudinal (`interpretacionRiesgoLongitudinal`)

**Step2**

- **Automático (3)**: solo lectura; combina **matriz riesgo × trayectoria** (p. ej. Alto + Favorable: carga del periodo vs mejoría) con hasta **tres** drivers de severidad; **advertencias** (p. ej. picos con una sola medición, eventos sin `estadoCondiciones`) al final del texto cuando apliquen. El detalle por eje (inicial, final, delta, tendencia) se muestra aparte en la sección de evolución.

**Visualizador**

- Muestra el campo si tiene texto, **después** del bloque de riesgo / trayectoria y **antes** de la consistencia.

**Techo de automatización**

- **Medio-bajo**: texto breve clínico-neutro; ampliar narrativas implicaría más validación clínica.

---

## 5. Factores persistentes (`factoresPersistentes[]`)

**Step2**

- **Automático (3)**: lista de solo lectura generada por `derivarFactoresPersistentesDesdeCondiciones` a partir de `resumenCondiciones` (HTA, diabetes, dislipidemia, obesidad) con `presente`, `estadoActual`, `gradoActual`, `tendencia`, `interpretacionAutomatica`, `observaciones`.

**Visualizador**

- Lista el array si tiene elementos.

**Techo de automatización**

- **Medio**: depende de que `resumenCondiciones` esté poblado (p. ej. backend al consolidar el periodo).

---

## 6. Alertas relevantes (`alertasRelevantes[]`)

**Step2**

- **Automático (3)**: lista de solo lectura por `derivarAlertasRelevantesAutomaticas`: líneas derivadas de `datosFaltantesRelevantes`, caso `numeroEventosIncluidos > 0` con `numeroEventosValidos === 0`, y tendencias **Empeoramiento** en TA sist/diast, peso, IMC, glucosa y HbA1c en `resumenIndicadores`.

**Visualizador**

- Lista si hay elementos.

**Techo de automatización**

- **Medio**: reglas heurísticas; tono clínico neutro; deduplicación básica de líneas.

---

## 7. Consistencia del seguimiento (`consistenciaSeguimiento`)

**Step2**

- **Automático (3)**: solo lectura; `inferirConsistenciaSeguimiento` mantiene la regla ordinal histórica:
  - proporción **eventos incluidos en el informe / (eventos + inasistencias + cancelaciones)** en agenda (filas con estado `Realizada` en agenda **no** entran en el denominador de esta proporción);
  - si `numeroSeguimientosProgramados > 0` y proporción **&lt; 50 %** → `Insuficiente`; si **&lt; 70 %** y ≥ 50 % → `Irregular`; caso base → `Adecuado`; sin eventos incluidos → `No valorable`.

**Visualizador**

- Muestra el valor ordinal **después** de la interpretación del riesgo.

**Techo de automatización**

- **Similar al riesgo operativo**: buena preclasificación de continuidad frente a agenda; independiente del nivel de riesgo por descontrol.

---

## 8. Interpretación de la consistencia (`interpretacionConsistenciaSeguimiento`)

**Retirado del producto (UI, PDF y generación automática).** Los rangos y el % se muestran en Step2 en el recuadro de referencia y en el bloque de % / seguimiento. El campo puede seguir existiendo en documentos antiguos en BD; al montar Step2 se elimina del modelo en memoria.

---

## Resumen comparativo

| Campo | Generación automática actual | Acción típica del usuario | Nivel alcanzable hoy | Visualizador |
|-------|------------------------------|---------------------------|----------------------|--------------|
| Riesgo longitudinal | Siempre al montar Step2 (severidad periodo + reglas Crítico) | — | **3** | Valor final |
| Trayectoria del periodo | Siempre al montar Step2 | — | **3** | Valor final |
| Conclusión clínica | Eliminada del modelo en Step2 | — | **—** (no UI) | No muestra |
| Resumen longitudinal | Eliminada del modelo en Step2 | — | **—** (no UI) | No muestra |
| Interpretación riesgo | Siempre al montar Step2 | — | **3** | Solo final |
| Factores persistentes | Siempre al montar Step2 | — | **3** | Lista final |
| Alertas relevantes | Siempre al montar Step2 | — | **3** | Lista final |
| Consistencia seguimiento | Siempre al montar Step2 (umbrales % / programados) | — | **3** | Solo final |

---

## Qué ya alimenta el sistema (contexto)

- **Métricas** (`derivarMetricasSeguimientoYEventos`): conteos por estado de cita **excluyendo `Realizada`**, reprogramaciones en esas filas, eventos válidos, `numeroSeguimientosRealizados` = eventos incluidos en el informe, y proporción eventos / (eventos + inasistencias + cancelaciones).
- **Indicadores** (`derivarResumenIndicadoresMinimo`): series TA, peso, IMC, glucosa, HbA1c con `peorValor` / `valorFinal` y tendencia si hay ≥2 puntos.
- **Concentrados**: `eventosConcentrados[].estadoCondiciones` alimenta conteos de DM2 no controlada por visita (Step1 copia el bloque del evento).
- **Datos faltantes** (`derivarDatosFaltantesDesdeUltimoEvento`): lista de limitaciones de interpretación (regenerable al entrar Step2; el usuario puede seguir editándola línea a línea).
- **Borradores** que permanecen: `recomendacionesSugeridas`, `limitacionesSugeridas` (misma mecánica de copia; el visualizador muestra el `<details>` de borrador automático cuando existen).

---

## Disparador

- **Montaje de Step2** (`onMounted`): siempre `aplicarIteracionDosAlFormulario` con `sobrescribirInterpretacionAutomatizada: true` (sin condición por documento persistido ni por borrador previo).
- No hay botón «Recalcular métricas y sugerencias»; volver al paso 2 desde el stepper vuelve a ejecutar la misma lógica.

---

## Nota sobre coherencia producto / UI

- El **visualizador** refleja campos finales en Pinia; en interpretación clínica: **riesgo → trayectoria del periodo → interpretación riesgo → consistencia (y recuadro de rangos en Step2)**; los textos `recomendacionesSugeridas` / `limitacionesSugeridas` aparecen solo en el `<details>` de borrador automático.
- Recomendaciones y limitaciones **finales** siguen siendo decisión explícita del usuario (edición o copia desde borrador).

**Limitación explícita:** las reglas de riesgo longitudinal v1 son **heurísticas**; no sustituyen criterio médico ni políticas internas de documentación clínica.

Documento generado para análisis de producto/implementación; no sustituye criterio clínico ni políticas internas de documentación clínica.
