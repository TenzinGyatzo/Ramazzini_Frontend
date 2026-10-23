/**
 * Textos para consultar una fusión en el expediente del registro conservado
 * (docs/fusion-trabajadores-especificacion.md, 5.4).
 */
import type { FusionConsultada } from '@/interfaces/trabajador.interface';
import { FUSION_DOCUMENTO_DISPLAY } from '@/helpers/fusionPreviewDisplay';
import { MOTIVOS_FUSION, textoValorCampo } from '@/helpers/fusionCampos';

/** Colecciones que la vista previa no nombra porque tienen su propia sección. */
const OTRAS_COLECCIONES: Record<string, string> = {
  ResultadoClinico: 'Resultados clínicos',
  RiesgoTrabajo: 'Riesgos de trabajo',
  CasoIncapacidad: 'Casos de incapacidad',
  Incapacidad: 'Incapacidades',
  FormatoFirmado: 'Formatos firmados en pantalla',
  InformeLongitudinalAudiometrico: 'Informes longitudinales audiométricos',
  OrganizacionExpediente: 'Orden del expediente',
};

export function fechaComoDia(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** «Cambio de nombre, Otro: corrección del RENAPO». */
export function textoMotivos(fusion: FusionConsultada): string {
  return fusion.motivos
    .map((motivo) => {
      const etiqueta = MOTIVOS_FUSION.find((m) => m.valor === motivo)?.etiqueta ?? motivo;
      return motivo === 'OTRO' && fusion.motivoOtro ? `${etiqueta}: ${fusion.motivoOtro}` : etiqueta;
    })
    .join(', ');
}

/** Cómo se nombra el registro eliminado: por nombre si se guardó, si no por su folio. */
export function nombreRegistroEliminado(fusion: FusionConsultada): string {
  const folio = fusion.folioFuente ? `folio ${fusion.folioFuente}` : 'sin folio';
  return fusion.nombreFuente ? `${fusion.nombreFuente} (${folio})` : `el registro ${folio}`;
}

export interface CambioConsultado {
  clave: string;
  etiqueta: string;
  anterior: string | null;
  nuevo: string | null;
}

export function cambiosConsultados(fusion: FusionConsultada): CambioConsultado[] {
  return fusion.camposCambiados.map((c) => ({
    clave: c.clave,
    etiqueta: c.etiqueta,
    anterior: textoValorCampo(c.clave, c.anterior ?? {}, fusion.centrosNombre),
    nuevo: textoValorCampo(c.clave, c.nuevo ?? {}, fusion.centrosNombre),
  }));
}

export interface ColeccionTrasladada {
  modelName: string;
  etiqueta: string;
  cantidad: number;
  /** Fechas (y nombre, en documentos externos) de cada registro, cuando se guardaron. */
  detalle: string[];
}

/** Lo trasladado por colección, con su etiqueta; las fusiones antiguas solo traen cantidades. */
export function coleccionesTrasladadas(fusion: FusionConsultada): ColeccionTrasladada[] {
  const nombres = new Set([
    ...Object.keys(fusion.documentosMigradosPorColeccion ?? {}),
    ...Object.keys(fusion.trasladados ?? {}),
  ]);
  const orden = FUSION_DOCUMENTO_DISPLAY.map((d) => d.modelName);
  return [...nombres]
    .map((modelName) => {
      const registros = fusion.trasladados?.[modelName] ?? [];
      const cantidad = Math.max(
        fusion.documentosMigradosPorColeccion?.[modelName] ?? 0,
        registros.length,
      );
      const display = FUSION_DOCUMENTO_DISPLAY.find((d) => d.modelName === modelName);
      return {
        modelName,
        etiqueta: display?.labelPlural ?? OTRAS_COLECCIONES[modelName] ?? modelName,
        cantidad,
        detalle: registros
          .map((r) => [r.nombre, fechaComoDia(r.fecha ?? null)].filter(Boolean).join(' '))
          .filter(Boolean),
      };
    })
    .filter((c) => c.cantidad > 0)
    .sort((a, b) => {
      const ia = orden.indexOf(a.modelName);
      const ib = orden.indexOf(b.modelName);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.etiqueta.localeCompare(b.etiqueta);
    });
}
