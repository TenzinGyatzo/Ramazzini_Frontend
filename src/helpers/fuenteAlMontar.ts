/**
 * Punto (58): lo que un paso lee al montarse (también al cambiar entre captura con vista previa
 * y captura rápida, que vuelve a montar los pasos). Es el formulario de la sesión: en un
 * documento nuevo lleva lo capturado y, al editar, el documento con lo que ya se cambió. El
 * documento guardado solo si el formulario todavía no lo tiene (aún se está cargando).
 *
 * Antes, varios pasos del examen de la vista leían solo el documento guardado: en uno nuevo,
 * al cambiar de modo aparecían vacíos; al editar, regresaban a lo guardado.
 */
type Datos = Record<string, any>;

export function fuenteAlMontar(formulario: Datos | null | undefined, documento: Datos | null | undefined): Datos {
  if (documento && formulario?._id !== documento._id) return documento;
  return formulario ?? {};
}
