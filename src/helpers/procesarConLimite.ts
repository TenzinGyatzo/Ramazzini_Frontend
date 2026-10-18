/**
 * Procesa los elementos con a lo más `limite` tareas a la vez: cada «carril» toma el siguiente
 * pendiente al terminar el suyo. Los errores los atiende `tarea`.
 */
export async function procesarConLimite<T>(elementos: readonly T[], limite: number, tarea: (elemento: T) => Promise<void>) {
  let siguiente = 0;
  const carril = async () => {
    while (siguiente < elementos.length) {
      await tarea(elementos[siguiente++]);
    }
  };
  await Promise.all(Array.from({ length: Math.max(0, Math.min(limite, elementos.length)) }, carril));
}
